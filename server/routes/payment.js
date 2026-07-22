const express = require("express");
const crypto = require("crypto");
const config = require("../config");
const { validatePromo } = require("../services/promo");
const {
  createOrder,
  getOrderByOrderId,
  updateOrderByOrderId,
  setAccessEmailSent,
  setAccessEmailError,
} = require("../services/orders");
const { sendAccessEmail } = require("../services/mailer");
const { sendPaymentToGoogleSheets } = require("../services/googleSheets");
const { findPartnerByCode } = require("../services/partners");
const { isAllowedEmailDomain, DOMAIN_ERROR_MESSAGE } = require("../services/email-domains");
const tbank = require("../services/tbank");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/promo/validate", function (req, res) {
  const promoCode = String((req.body || {}).promoCode || "").trim();

  if (!promoCode) {
    return res.json({
      valid: true,
      finalAmount: config.basePrice,
      discount: 0,
      code: null,
    });
  }

  const promo = validatePromo(promoCode, config.basePrice);

  if (!promo.valid) {
    return res.json({
      valid: false,
      finalAmount: config.basePrice,
      discount: 0,
      message: "Промокод не найден или уже не действует",
    });
  }

  return res.json({
    valid: true,
    finalAmount: promo.finalAmount,
    discount: promo.discount,
    code: promo.code,
    message: "Промокод применён",
  });
});

router.post("/payment/init", async function (req, res) {
  const body = req.body || {};
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const promoCode = String(body.promoCode || "").trim();
  const partnerCodeInput = String(body.partnerCode || "").trim().toUpperCase();
  const consentPrivacy = Boolean(body.consentPrivacy);
  const consentOffer = Boolean(body.consentOffer);

  if (!consentPrivacy || !consentOffer) {
    return res.status(400).json({ error: "Необходимо принять условия оферты и политику конфиденциальности" });
  }

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ success: false, message: "Укажите корректный email" });
  }

  if (!isAllowedEmailDomain(email)) {
    return res.status(400).json({ success: false, message: DOMAIN_ERROR_MESSAGE });
  }

  const promo = validatePromo(promoCode, config.basePrice);
  if (promoCode && !promo.valid) {
    return res.status(400).json({ error: promo.message });
  }

  const orderId = crypto.randomUUID();
  const finalAmount = promo.finalAmount;

  const orderData = {
    orderId,
    name,
    email,
    promoCode: promo.code || null,
    amount: finalAmount,
    baseAmount: config.basePrice,
    status: config.mockPayments ? "paid_mock" : "pending",
    mock: config.mockPayments,
  };

  if (partnerCodeInput) {
    const partner = findPartnerByCode(partnerCodeInput);
    if (partner) {
      orderData.partnerCode = partner.code;
      orderData.partnerName = partner.name;
      orderData.partnerEmail = partner.email;
      orderData.partnerTelegram = partner.telegram || "";
    }
  }

  createOrder(orderData);

  if (config.mockPayments) {
    const paymentUrl = `${config.siteUrl}/payment-success.html?orderId=${encodeURIComponent(orderId)}`;
    return res.json({
      paymentUrl,
      orderId,
      amount: finalAmount,
      mock: true,
    });
  }

  const order = {
    orderId,
    name,
    email,
    promoCode: promo.code || null,
    amount: finalAmount,
  };

  const payment = await tbank.initPayment(order);

  if (!payment.success) {
    return res.status(502).json({ success: false, message: payment.message });
  }

  updateOrderByOrderId(orderId, { tbankPaymentId: payment.paymentId });

  return res.json({
    paymentUrl: payment.paymentUrl,
    orderId,
    amount: finalAmount,
  });
});

async function trySendAccessEmail(orderId) {
  const order = getOrderByOrderId(orderId);
  if (!order) return;
  if (order.accessEmailSentAt) return;

  try {
    const result = await sendAccessEmail(order);
    if (result.sent) {
      setAccessEmailSent(orderId);
    }
  } catch (error) {
    const message = error && error.message ? error.message : "Ошибка отправки письма";
    setAccessEmailError(orderId, message);
    console.warn("Не удалось отправить письмо с доступом для заказа", orderId + ":", message);
  }
}

async function trySendToGoogleSheets(orderId) {
  const order = getOrderByOrderId(orderId);
  if (!order) return;
  if (order.googleSheetsSentAt) return;

  try {
    const result = await sendPaymentToGoogleSheets({
      date: order.paidAt,
      product: "База ИИ",
      tariff: "База ИИ",
      name: order.name,
      email: order.email,
      phone: "",
      amount: order.amount / 100,
      promoCode: order.promoCode || "",
      partner: order.partnerCode || "",
      partnerReward:
        order.partnerReward != null && order.partnerCode
          ? order.partnerReward / 100
          : "",
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
      "Не удалось отправить оплату в Google Таблицу для заказа",
      orderId + ":",
      message
    );
  }
}

router.post("/payment/webhook", async function (req, res) {
  const body = req.body || {};

  if (!tbank.verifyNotificationToken(body)) {
    return res.status(403).send("Forbidden");
  }

  const orderId = body.OrderId;
  const status = body.Status;
  const success = body.Success === true;

  if (orderId) {
    if (success && (status === "CONFIRMED" || status === "AUTHORIZED")) {
      const existing = getOrderByOrderId(orderId);
      const paidPatch = {
        status: "paid",
        paidAt: new Date().toISOString(),
        tbankPaymentId: body.PaymentId,
      };

      if (existing && existing.partnerCode && existing.amount) {
        paidPatch.partnerReward = Math.round(
          existing.amount * config.partnerCommissionPercent / 100
        );
      }

      const updated = updateOrderByOrderId(orderId, paidPatch);
      if (!updated) {
        console.warn("T-Bank webhook: заказ не найден:", orderId);
      } else {
        await trySendAccessEmail(orderId);
        await trySendToGoogleSheets(orderId);
      }
    } else if (status === "REJECTED" || status === "CANCELED") {
      const updated = updateOrderByOrderId(orderId, {
        status: "failed",
        tbankPaymentId: body.PaymentId,
      });
      if (!updated) {
        console.warn("T-Bank webhook: заказ не найден:", orderId);
      }
    }
  }

  return res.status(200).send("OK");
});

module.exports = router;
