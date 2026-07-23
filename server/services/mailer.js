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

const SUPPORT_EMAIL = "Y-kopasova@inbox.ru";
const SUPPORT_TELEGRAM_HANDLE = "@digital_izba";
const SUPPORT_TELEGRAM_URL = "https://t.me/digital_izba";
const VK_ACCESS_URL = "https://vk.ru/baza_ii";

function buildTextBody(name, telegramUrl) {
  return [
    `Здравствуйте, ${name}!`,
    "",
    "Спасибо за оплату и добро пожаловать в «Базу ИИ» ❤️",
    "",
    "Мы очень рады, что вы присоединились к обучению.",
    "",
    "Ваш доступ к урокам:",
    "",
    "Telegram-канал:",
    telegramUrl,
    "",
    "Группа во ВКонтакте:",
    VK_ACCESS_URL,
    "",
    "Теперь материалы «Базы ИИ» доступны в двух местах: в Telegram и во ВКонтакте.",
    "",
    "Чтобы присоединиться к группе во ВКонтакте:",
    "1. Перейдите по ссылке и отправьте запрос на вступление.",
    "2. Напишите в сообщения группы email, по которому была произведена оплата.",
    "3. Менеджер проверит оплату и добавит вас.",
    "",
    "После входа в группу посмотрите закреплённый пост «Как, что и где искать».",
    "",
    "Сохраните это письмо.",
    "",
    "Если возникнут вопросы по доступу, напишите Юлии:",
    SUPPORT_EMAIL,
    "",
    "или в Отдел заботы школы «Digital.izba»:",
    SUPPORT_TELEGRAM_HANDLE,
    "",
    "С уважением,",
    "Юлия Копасова",
  ].join("\n");
}

function buildHtmlBody(name, telegramUrl) {
  const safeName = escapeHtml(name);
  const safeTelegramUrl = escapeHtml(telegramUrl);
  const safeVkUrl = escapeHtml(VK_ACCESS_URL);

  return [
    "<!DOCTYPE html>",
    "<html lang=\"ru\">",
    "<head>",
    "<meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    "<title>Доступ к «Базе ИИ»</title>",
    "</head>",
    "<body style=\"margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#222;\">",
    "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"background:#f5f5f5;padding:24px 12px;\">",
    "<tr><td align=\"center\">",
    "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:560px;background:#ffffff;border-radius:12px;padding:32px 28px;\">",
    "<tr><td>",
    "<h1 style=\"margin:0 0 20px;font-size:24px;line-height:1.3;color:#111;\">Доступ к «Базе ИИ»</h1>",
    `<p style=\"margin:0 0 16px;font-size:16px;line-height:1.6;\">Здравствуйте, ${safeName}!</p>`,
    "<p style=\"margin:0 0 16px;font-size:16px;line-height:1.6;\">Спасибо за оплату и добро пожаловать в «Базу ИИ» ❤️</p>",
    "<p style=\"margin:0 0 24px;font-size:16px;line-height:1.6;\">Мы очень рады, что вы присоединились к обучению.</p>",
    "<p style=\"margin:0 0 16px;font-size:16px;line-height:1.6;font-weight:600;\">Ваш доступ к урокам:</p>",
    "<p style=\"margin:0 0 10px;font-size:15px;line-height:1.6;color:#555;\">Telegram-канал:</p>",
    "<p style=\"margin:0 0 20px;text-align:center;\">",
    `<a href=\"${safeTelegramUrl}\" style=\"display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 28px;border-radius:8px;\">Перейти в Telegram</a>`,
    "</p>",
    "<p style=\"margin:0 0 10px;font-size:15px;line-height:1.6;color:#555;\">Группа во ВКонтакте:</p>",
    "<p style=\"margin:0 0 24px;text-align:center;\">",
    `<a href=\"${safeVkUrl}\" style=\"display:inline-block;background:#4a76a8;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 28px;border-radius:8px;\">Перейти во ВКонтакте</a>`,
    "</p>",
    "<p style=\"margin:0 0 16px;font-size:15px;line-height:1.6;\">Теперь материалы «Базы ИИ» доступны в двух местах: в Telegram и во ВКонтакте.</p>",
    "<p style=\"margin:0 0 8px;font-size:15px;line-height:1.6;font-weight:600;\">Чтобы присоединиться к группе во ВКонтакте:</p>",
    "<ol style=\"margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.7;color:#444;\">",
    "<li>Перейдите по ссылке и отправьте запрос на вступление.</li>",
    "<li>Напишите в сообщения группы email, по которому была произведена оплата.</li>",
    "<li>Менеджер проверит оплату и добавит вас.</li>",
    "</ol>",
    "<p style=\"margin:0 0 20px;font-size:15px;line-height:1.6;color:#555;\">После входа в группу посмотрите закреплённый пост «Как, что и где искать».</p>",
    "<p style=\"margin:0 0 16px;font-size:14px;line-height:1.6;color:#555;\">Сохраните это письмо.</p>",
    "<p style=\"margin:0 0 24px;font-size:14px;line-height:1.6;color:#555;\">",
    "Если возникнут вопросы по доступу, напишите Юлии: ",
    `<a href=\"mailto:${SUPPORT_EMAIL}\" style=\"color:#2563eb;\">${SUPPORT_EMAIL}</a>`,
    "<br>",
    "или в Отдел заботы школы «Digital.izba»: ",
    `<a href=\"${SUPPORT_TELEGRAM_URL}\" style=\"color:#2563eb;\">${SUPPORT_TELEGRAM_HANDLE}</a>`,
    "</p>",
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
      text: buildTextBody(name, telegramUrl),
      html: buildHtmlBody(name, telegramUrl),
    });
    return { sent: true };
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}

module.exports = { sendAccessEmail };
