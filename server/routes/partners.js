const express = require("express");
const config = require("../config");
const { createPartner } = require("../services/partners");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/create", function (req, res) {
  const body = req.body || {};
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const telegram = String(body.telegram || "").trim();
  const consentPrivacy = Boolean(body.consentPrivacy);

  if (!name) {
    return res.status(400).json({ ok: false, message: "Укажите имя" });
  }

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, message: "Укажите корректный email" });
  }

  if (!consentPrivacy) {
    return res.status(400).json({
      ok: false,
      message: "Необходимо принять политику конфиденциальности",
    });
  }

  const partner = createPartner({ name, email, telegram });
  const partnerCode = partner.code;
  const referralUrl = config.siteUrl + "/?ref=" + encodeURIComponent(partnerCode);

  return res.json({
    ok: true,
    partnerCode: partnerCode,
    referralUrl: referralUrl,
  });
});

module.exports = router;
