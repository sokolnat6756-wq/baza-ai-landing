const crypto = require("crypto");
const config = require("../config");

const NESTED_TOKEN_KEYS = new Set(["DATA", "Receipt", "Items"]);

function generateToken(payload, password) {
  const values = {};

  for (const [key, value] of Object.entries(payload || {})) {
    if (key === "Token") continue;
    if (NESTED_TOKEN_KEYS.has(key)) continue;
    if (value === null || typeof value === "object") continue;
    values[key] = String(value);
  }

  values.Password = password;

  const sortedKeys = Object.keys(values).sort();
  const concatenated = sortedKeys.map(function (key) {
    return values[key];
  }).join("");

  return crypto.createHash("sha256").update(concatenated, "utf8").digest("hex");
}

function verifyNotificationToken(body) {
  if (!body || !body.Token) return false;

  const password = config.tbank.secretKey;
  if (!password) return false;

  const expected = generateToken(body, password);
  return body.Token === expected;
}

async function initPayment(order) {
  const terminalKey = config.tbank.terminalKey;
  const password = config.tbank.secretKey;
  const apiUrl = config.tbank.apiUrl.replace(/\/$/, "");

  if (!terminalKey || !password) {
    return {
      success: false,
      message: "Платёжная система не настроена. Обратитесь к администратору.",
    };
  }

  const payload = {
    TerminalKey: terminalKey,
    Amount: order.amount,
    OrderId: order.orderId,
    Description: "Доступ к База ИИ",
    SuccessURL: `${config.siteUrl}/payment-success.html?orderId=${encodeURIComponent(order.orderId)}`,
    FailURL: `${config.siteUrl}/payment-fail.html?orderId=${encodeURIComponent(order.orderId)}`,
    NotificationURL: `${config.siteUrl}/api/payment/webhook`,
    DATA: {
      email: order.email || "",
      name: order.name || "",
      promoCode: order.promoCode || "",
      product: "baza-ai",
    },
  };

  payload.Token = generateToken(payload, password);

  try {
    const response = await fetch(`${apiUrl}/Init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(function () {
      return {};
    });

    if (data.Success === true && data.PaymentURL) {
      return {
        success: true,
        paymentUrl: data.PaymentURL,
        paymentId: data.PaymentId,
      };
    }

    const bankMessage = data.Message || data.Details;
    const message = bankMessage
      ? `Не удалось создать платёж: ${bankMessage}`
      : "Не удалось создать платёж. Попробуйте позже.";

    return { success: false, message: message };
  } catch (err) {
    console.error("T-Bank Init error:", err.message);
    return {
      success: false,
      message: "Не удалось связаться с платёжной системой. Попробуйте позже.",
    };
  }
}

async function initVideoVipPayment(order) {
  const terminalKey = config.tbank.terminalKey;
  const password = config.tbank.secretKey;
  const apiUrl = config.tbank.apiUrl.replace(/\/$/, "");

  if (!terminalKey || !password) {
    return {
      success: false,
      message: "Платёжная система не настроена. Обратитесь к администратору.",
    };
  }

  const payload = {
    TerminalKey: terminalKey,
    Amount: order.amount,
    OrderId: order.orderId,
    Description: "Нейромультфильмы и AI-видео — VIP-сопровождение",
    SuccessURL: `${config.siteUrl}/video-vip/success/?orderId=${encodeURIComponent(order.orderId)}`,
    FailURL: `${config.siteUrl}/video-vip/?payment=fail`,
    NotificationURL: `${config.siteUrl}/api/video-vip/payment/webhook`,
    DATA: {
      email: order.email || "",
      name: order.name || "",
      phone: order.phone || "",
      product: "video-vip",
    },
  };

  payload.Token = generateToken(payload, password);

  try {
    const response = await fetch(`${apiUrl}/Init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(function () {
      return {};
    });

    if (data.Success === true && data.PaymentURL) {
      return {
        success: true,
        paymentUrl: data.PaymentURL,
        paymentId: data.PaymentId,
      };
    }

    const bankMessage = data.Message || data.Details;
    const message = bankMessage
      ? `Не удалось создать платёж: ${bankMessage}`
      : "Не удалось создать платёж. Попробуйте позже.";

    return { success: false, message: message };
  } catch (err) {
    console.error("T-Bank VIP Init error:", err.message);
    return {
      success: false,
      message: "Не удалось связаться с платёжной системой. Попробуйте позже.",
    };
  }
}

module.exports = {
  generateToken,
  initPayment,
  initVideoVipPayment,
  verifyNotificationToken,
};
