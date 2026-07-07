function safeErrorMessage(error) {
  if (!error) return "Неизвестная ошибка отправки в Google Таблицу";
  return String(error.message || error).slice(0, 500);
}

async function sendPaymentToGoogleSheets(payload) {
  const webhookUrl = String(process.env.GOOGLE_SHEETS_WEBHOOK_URL || "").trim();
  const secret = String(process.env.GOOGLE_SHEETS_WEBHOOK_SECRET || "").trim();

  if (!webhookUrl || !secret) {
    return { sent: false, reason: "not_configured" };
  }

  const body = {
    secret: secret,
    date: payload.date || "",
    product: payload.product || "",
    tariff: payload.tariff || "",
    name: payload.name || "",
    email: payload.email || "",
    phone: payload.phone || "",
    amount: payload.amount,
    promoCode: payload.promoCode || "",
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error("Google Sheets webhook вернул статус " + response.status);
    }

    return { sent: true };
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}

module.exports = { sendPaymentToGoogleSheets };
