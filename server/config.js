require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

function envBool(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  return raw === "true" || raw === "1";
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  siteUrl: (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  mockPayments: envBool("MOCK_PAYMENTS", true),
  basePrice: Number(process.env.BASE_PRICE) || 349000,
  videoVipPrice: Number(process.env.VIDEO_VIP_PRICE) || 9000000,
  partnerCommissionPercent: Number(process.env.PARTNER_COMMISSION_PERCENT) || 10,
  tbank: {
    terminalKey: process.env.TBANK_TERMINAL_KEY || "",
    secretKey: process.env.TBANK_SECRET_KEY || "",
    apiUrl: process.env.TBANK_API_URL || "https://securepay.tinkoff.ru/v2",
  },
};
