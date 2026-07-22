const express = require("express");
const crypto = require("crypto");
const config = require("../config");
const tbank = require("../services/tbank");
const {
  createOrder,
  getOrderByOrderId,
  updateOrderByOrderId,
  setAccessEmailSent,
  setAccessEmailError,
} = require("../services/videoVipOrders");
const { sendVideoVipAccessEmail, sendVideoVipAdminNotification } = require("../services/videoVipMailer");
const { sendPaymentToGoogleSheets } = require("../services/googleSheets");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VIP_ALLOWED_DOMAINS = new Set([
  "mail.ru",
  "list.ru",
  "bk.ru",
  "inbox.ru",
  "yandex.ru",
]);
const VIP_DOMAIN_ERROR_MESSAGE =
  "Для регистрации используйте почту mail.ru, list.ru, bk.ru, inbox.ru или yandex.ru";

function getEmailDomain(email) {
  const at = email.lastIndexOf("@");
  if (at < 0) return "";
  return email.slice(at + 1).toLowerCase();
}

function isAllowedVipEmailDomain(email) {
  return VIP_ALLOWED_DOMAINS.has(getEmailDomain(email));
}

async function trySendAccessEmail(orderId) {
  const order = getOrderByOrderId(orderId);
  if (!order) return;
  if (order.accessEmailSentAt) return;

  try {
    const result = await sendVideoVipAccessEmail(order);
    if (result.sent) {
      setAccessEmailSent(orderId);
    }
  } catch (error) {
    const message = error && error.message ? error.message : "Ошибка отправки письма";
    setAccessEmailError(orderId, message);
    console.warn("Не удалось отправить VIP-письмо для заказа", orderId + ":", message);
  }
}

async function trySendAdminNotification(orderId) {
  const order = getOrderByOrderId(orderId);
  if (!order) return;
  if (order.adminNotificationSentAt) return;

  try {
    const result = await sendVideoVipAdminNotification(order);
    if (result.sent) {
      updateOrderByOrderId(orderId, {
        adminNotificationSentAt: new Date().toISOString(),
        adminNotificationError: undefined,
      });
    }
  } catch (error) {
    const message = error && error.message ? error.message : "Ошибка отправки уведомления";
    updateOrderByOrderId(orderId, {
      adminNotificationError: String(message).slice(0, 500),
    });
    console.warn(
      "Не удалось отправить VIP-уведомление администратору для заказа",
      orderId + ":",
      message
    );
  }
}

async function trySendToGoogleSheets(orderId) {
  const order = getOrderByOrderId(orderId);
  if (!order) return;
  if (order.googleSheetsSentAt) return;

  try {
    const result = await sendPaymentToGoogleSheets({
      date: order.paidAt,
      product: "Нейромультфильмы и AI-видео",
      tariff: "VIP-сопровождение",
      name: order.name,
      email: order.email,
      phone: order.phone || "",
      amount: order.amount / 100,
      promoCode: "",
      partner: "",
      partnerReward: "",
    });
    if (result.sent) {
      updateOrderByOrderId(orderId, {
        googleSheetsSentAt: new Date().toISOString(),
        googleSheetsError: undefined,
      });
    }
  } catch (error) {
    const message = error && error.message ? error.message : "Ошибка отправки в Google Таблицу";
    updateOrderByOrderId(orderId, {
      googleSheetsError: String(message).slice(0, 500),
    });
    console.warn(
      "Не удалось отправить VIP-оплату в Google Таблицу для заказа",
      orderId + ":",
      message
    );
  }
}

router.post("/init", async function (req, res) {
  const body = req.body || {};
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = String(body.phone || "").trim();
  const consentPrivacy = Boolean(body.consentPrivacy);
  const consentOffer = Boolean(body.consentOffer);

  if (!name) {
    return res.status(400).json({ success: false, message: "Укажите имя" });
  }

  if (!consentPrivacy || !consentOffer) {
    return res.status(400).json({
      error: "Необходимо принять условия оферты и политику конфиденциальности",
    });
  }

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ success: false, message: "Укажите корректный email" });
  }

  if (!isAllowedVipEmailDomain(email)) {
    return res.status(400).json({ success: false, message: VIP_DOMAIN_ERROR_MESSAGE });
  }

  if (!phone) {
    return res.status(400).json({ success: false, message: "Укажите телефон" });
  }

  const orderId = crypto.randomUUID();
  const amount = config.videoVipPrice;

  createOrder({
    orderId,
    name,
    email,
    phone,
    amount,
    product: "video-vip",
    status: config.mockPayments ? "paid_mock" : "pending",
    mock: config.mockPayments,
  });

  if (config.mockPayments) {
    const paymentUrl = `${config.siteUrl}/video-vip/success/?orderId=${encodeURIComponent(orderId)}`;
    return res.json({
      paymentUrl,
      orderId,
      amount,
      mock: true,
    });
  }

  const payment = await tbank.initVideoVipPayment({
    orderId,
    name,
    email,
    phone,
    amount,
  });

  if (!payment.success) {
    return res.status(502).json({ success: false, message: payment.message });
  }

  updateOrderByOrderId(orderId, { tbankPaymentId: payment.paymentId });

  return res.json({
    paymentUrl: payment.paymentUrl,
    orderId,
    amount,
  });
});

router.post("/webhook", async function (req, res) {
  const body = req.body || {};

  if (!tbank.verifyNotificationToken(body)) {
    return res.status(403).send("Forbidden");
  }

  const orderId = body.OrderId;
  const status = body.Status;
  const success = body.Success === true;

  if (orderId) {
    if (success && (status === "CONFIRMED" || status === "AUTHORIZED")) {
      const updated = updateOrderByOrderId(orderId, {
        status: "paid",
        paidAt: new Date().toISOString(),
        tbankPaymentId: body.PaymentId,
      });
      if (!updated) {
        console.warn("T-Bank VIP webhook: заказ не найден:", orderId);
      } else {
        await trySendAccessEmail(orderId);
        await trySendAdminNotification(orderId);
        await trySendToGoogleSheets(orderId);
      }
    } else if (status === "REJECTED" || status === "CANCELED") {
      const updated = updateOrderByOrderId(orderId, {
        status: "failed",
        tbankPaymentId: body.PaymentId,
      });
      if (!updated) {
        console.warn("T-Bank VIP webhook: заказ не найден:", orderId);
      }
    }
  }

  return res.status(200).send("OK");
});

module.exports = router;
