const dns = require("dns").promises;
const nodemailer = require("nodemailer");

const SUBJECT = "Доступ к «Базе ИИ»";

function envBool(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  return raw === "true" || raw === "1";
}

function getMissingMailConfig() {
  const missing = [];
  if (!process.env.SMTP_HOST) missing.push("SMTP_HOST");
  if (!process.env.SMTP_USER) missing.push("SMTP_USER");
  if (!process.env.SMTP_PASS) missing.push("SMTP_PASS");
  if (!process.env.MAIL_FROM) missing.push("MAIL_FROM");
  if (!process.env.TELEGRAM_ACCESS_URL) missing.push("TELEGRAM_ACCESS_URL");
  return missing;
}

async function createTransport() {
  const smtpHost = process.env.SMTP_HOST;
  let connectHost = smtpHost;

  try {
    const lookup = await dns.lookup(smtpHost, { family: 6 });
    connectHost = lookup.address;
  } catch (error) {
    const message = error && error.message ? error.message : "IPv6 lookup failed";
    console.warn(
      "SMTP IPv6 lookup не удался для " + smtpHost + ", используется hostname: " + message
    );
  }

  return nodemailer.createTransport({
    host: connectHost,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: envBool("SMTP_SECURE", true),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      servername: smtpHost,
    },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 20000,
  });
}

function buildTextBody(name, telegramUrl, mailSupport) {
  return [
    `Здравствуйте, ${name}!`,
    "",
    "Спасибо за оплату «Базы ИИ».",
    "",
    "Ваш доступ:",
    telegramUrl,
    "",
    "Сохраните это письмо. Если возникнут вопросы, напишите нам: " + mailSupport,
    "",
    "С уважением,",
    "Юлия Копасова",
  ].join("\n");
}

function buildHtmlBody(name, telegramUrl, mailSupport) {
  const safeName = escapeHtml(name);
  const safeSupport = escapeHtml(mailSupport);

  return [
    "<!DOCTYPE html>",
    "<html lang=\"ru\">",
    "<head>",
    "<meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    "<title>Доступ к Базе ИИ</title>",
    "</head>",
    "<body style=\"margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#222;\">",
    "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"background:#f5f5f5;padding:24px 12px;\">",
    "<tr><td align=\"center\">",
    "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:560px;background:#ffffff;border-radius:12px;padding:32px 28px;\">",
    "<tr><td>",
    "<h1 style=\"margin:0 0 20px;font-size:24px;line-height:1.3;color:#111;\">Доступ к Базе ИИ</h1>",
    `<p style=\"margin:0 0 16px;font-size:16px;line-height:1.6;\">Здравствуйте, ${safeName}!</p>`,
    "<p style=\"margin:0 0 24px;font-size:16px;line-height:1.6;\">Спасибо за оплату «Базы ИИ».</p>",
    "<p style=\"margin:0 0 20px;font-size:16px;line-height:1.6;\">Ваш доступ:</p>",
    "<p style=\"margin:0 0 28px;text-align:center;\">",
    `<a href=\"${escapeHtml(telegramUrl)}\" style=\"display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 28px;border-radius:8px;\">Перейти в Базу ИИ</a>`,
    "</p>",
    `<p style=\"margin:0 0 24px;font-size:14px;line-height:1.6;color:#555;\">Сохраните это письмо. Если возникнут вопросы, напишите нам: <a href=\"mailto:${safeSupport}\" style=\"color:#2563eb;\">${safeSupport}</a></p>`,
    "<p style=\"margin:0;font-size:16px;line-height:1.6;\">С уважением,<br>Юлия Копасова</p>",
    "</td></tr>",
    "</table>",
    "</td></tr>",
    "</table>",
    "</body>",
    "</html>",
  ].join("");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeErrorMessage(error) {
  if (!error) return "Неизвестная ошибка отправки письма";
  return String(error.message || error).slice(0, 500);
}

async function sendAccessEmail(order) {
  const missing = getMissingMailConfig();
  if (missing.length > 0) {
    console.warn(
      "Письмо с доступом не отправлено: не заполнены настройки — " + missing.join(", ")
    );
    return { sent: false, reason: "not_configured" };
  }

  const name = String((order && order.name) || "клиент").trim() || "клиент";
  const email = String((order && order.email) || "").trim().toLowerCase();
  const telegramUrl = process.env.TELEGRAM_ACCESS_URL;
  const mailSupport = process.env.MAIL_SUPPORT || process.env.MAIL_FROM;

  if (!email) {
    console.warn("Письмо с доступом не отправлено: у заказа не указан email");
    return { sent: false, reason: "no_email" };
  }

  const transport = await createTransport();

  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: SUBJECT,
      text: buildTextBody(name, telegramUrl, mailSupport),
      html: buildHtmlBody(name, telegramUrl, mailSupport),
    });
    return { sent: true };
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}

module.exports = { sendAccessEmail };
