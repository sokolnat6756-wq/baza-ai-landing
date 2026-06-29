const express = require("express");
const crypto = require("crypto");
const config = require("../config");
const { validatePromo } = require("../services/promo");
const { createOrder } = require("../services/orders");
const { isAllowedEmailDomain, DOMAIN_ERROR_MESSAGE } = require("../services/email-domains");

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

router.post("/payment/init", function (req, res) {
  const body = req.body || {};
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const promoCode = String(body.promoCode || "").trim();
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

  createOrder({
    orderId,
    name,
    email,
    promoCode: promo.code || null,
    amount: finalAmount,
    baseAmount: config.basePrice,
    status: config.mockPayments ? "paid_mock" : "pending",
    mock: config.mockPayments,
  });

  if (config.mockPayments) {
    const paymentUrl = `${config.siteUrl}/payment-success.html?orderId=${encodeURIComponent(orderId)}`;
    return res.json({
      paymentUrl,
      orderId,
      amount: finalAmount,
      mock: true,
    });
  }

  return res.status(501).json({
    error: "Реальная оплата пока не подключена. Включите MOCK_PAYMENTS=true для тестирования.",
  });
});

module.exports = router;
