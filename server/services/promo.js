const fs = require("fs");
const path = require("path");

const promoPath = path.join(__dirname, "..", "data", "promo-codes.json");

function loadPromos() {
  try {
    const raw = fs.readFileSync(promoPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function validatePromo(code, baseAmount) {
  if (!code || !String(code).trim()) {
    return { valid: true, finalAmount: baseAmount, discount: 0, message: "" };
  }

  const normalized = String(code).trim().toUpperCase();
  const promos = loadPromos();
  const promo = promos[normalized];

  if (!promo || !promo.active) {
    return { valid: false, finalAmount: baseAmount, discount: 0, message: "Промокод не найден или недействителен" };
  }

  if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
    return { valid: false, finalAmount: baseAmount, discount: 0, message: "Срок действия промокода истёк" };
  }

  let finalAmount = baseAmount;

  if (promo.type === "percent") {
    finalAmount = Math.round(baseAmount * (1 - promo.value / 100));
  } else if (promo.type === "fixed") {
    finalAmount = baseAmount - promo.value;
  } else if (promo.type === "price") {
    finalAmount = promo.value;
  }

  finalAmount = Math.max(finalAmount, 100);

  return {
    valid: true,
    finalAmount,
    discount: baseAmount - finalAmount,
    message: "",
    code: normalized,
  };
}

module.exports = { validatePromo };
