const dns = require("dns").promises;
const nodemailer = require("nodemailer");

const SUBJECT =
  "Добро пожаловать в VIP-сопровождение «Нейромультфильмы и AI-видео»";
const ADMIN_SUBJECT = "Новая VIP-оплата — Нейромультфильмы и AI-видео";

const SUPPORT_EMAIL = "Y-kopasova@inbox.ru";
const SUPPORT_TELEGRAM_HANDLE = "@digital_izba";
const SUPPORT_TELEGRAM_URL = "https://t.me/digital_izba";

function envBool(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  return raw === "true" || raw === "1";
}

function getMissingSmtpConfig() {
  const missing = [];
  if (!process.env.SMTP_HOST) missing.push("SMTP_HOST");
  if (!process.env.SMTP_USER) missing.push("SMTP_USER");
  if (!process.env.SMTP_PASS) missing.push("SMTP_PASS");
  if (!process.env.MAIL_FROM) missing.push("MAIL_FROM");
  return missing;
}

function getMissingMailConfig() {
  const missing = [];
  if (!process.env.SMTP_HOST) missing.push("SMTP_HOST");
  if (!process.env.SMTP_USER) missing.push("SMTP_USER");
  if (!process.env.SMTP_PASS) missing.push("SMTP_PASS");
  if (!process.env.MAIL_FROM) missing.push("MAIL_FROM");
  if (!process.env.VIDEO_VIP_COURSE_URL) missing.push("VIDEO_VIP_COURSE_URL");
  if (!process.env.VIDEO_VIP_CHAT_URL) missing.push("VIDEO_VIP_CHAT_URL");
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
      "VIP SMTP IPv6 lookup не удался для " + smtpHost + ", используется hostname: " + message
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

function getAdminEmail() {
  const configured = String(process.env.VIDEO_VIP_ADMIN_EMAIL || "").trim();
  return configured || SUPPORT_EMAIL;
}

function formatAmountRub(amountKopecks) {
  const rubles = Math.round(Number(amountKopecks || 0) / 100);
  return rubles.toLocaleString("ru-RU") + " \u20BD";
}

function formatPaidAt(paidAt) {
  if (!paidAt) return "—";
  const date = new Date(paidAt);
  if (Number.isNaN(date.getTime())) return String(paidAt);
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildAdminTextBody(order) {
  const name = String(order.name || "—");
  const email = String(order.email || "—");
  const phone = String(order.phone || "—");
  const orderId = String(order.orderId || "—");
  const paidAt = formatPaidAt(order.paidAt);
  const amount = formatAmountRub(order.amount);

  return [
    "Поступила новая оплата VIP-сопровождения.",
    "",
    "Имя: " + name,
    "Email: " + email,
    "Телефон: " + phone,
    "Сумма: " + amount,
    "Order ID: " + orderId,
    "Дата оплаты: " + paidAt,
    "",
    "Что сделать:",
    "1. Проверить оплату в Т-Бизнесе.",
    "2. Связаться с учеником.",
    "3. Подключить ученика к VIP-сопровождению.",
  ].join("\n");
}

function buildAdminHtmlBody(order) {
  const name = escapeHtml(order.name || "—");
  const email = escapeHtml(order.email || "—");
  const phone = escapeHtml(order.phone || "—");
  const orderId = escapeHtml(order.orderId || "—");
  const paidAt = escapeHtml(formatPaidAt(order.paidAt));
  const amount = escapeHtml(formatAmountRub(order.amount));

  return [
    "<!DOCTYPE html>",
    "<html lang=\"ru\">",
    "<head>",
    "<meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    "<title>Новая VIP-оплата</title>",
    "</head>",
    "<body style=\"margin:0;padding:0;background:#f5f0e8;font-family:Arial,Helvetica,sans-serif;color:#222;\">",
    "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"background:#f5f0e8;padding:24px 12px;\">",
    "<tr><td align=\"center\">",
    "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:560px;background:#ffffff;border-radius:14px;padding:28px 24px;border:1px solid #f0e0c8;\">",
    "<tr><td>",
    "<h1 style=\"margin:0 0 8px;font-size:22px;line-height:1.35;color:#111;\">Новая VIP-оплата</h1>",
    "<p style=\"margin:0 0 20px;font-size:15px;line-height:1.5;color:#b8860b;font-weight:600;\">Нейромультфильмы и AI-видео</p>",
    "<p style=\"margin:0 0 20px;font-size:16px;line-height:1.6;\">Поступила новая оплата VIP-сопровождения.</p>",
    "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"background:#fff7ed;border:1px solid #f0e0c8;border-radius:12px;padding:18px 20px;margin:0 0 24px;\">",
    "<tr><td style=\"padding:6px 0;font-size:15px;line-height:1.6;\"><strong>Имя:</strong> " + name + "</td></tr>",
    "<tr><td style=\"padding:6px 0;font-size:15px;line-height:1.6;\"><strong>Email:</strong> " + email + "</td></tr>",
    "<tr><td style=\"padding:6px 0;font-size:15px;line-height:1.6;\"><strong>Телефон:</strong> " + phone + "</td></tr>",
    "<tr><td style=\"padding:6px 0;font-size:15px;line-height:1.6;\"><strong>Сумма:</strong> " + amount + "</td></tr>",
    "<tr><td style=\"padding:6px 0;font-size:15px;line-height:1.6;\"><strong>Order ID:</strong> " + orderId + "</td></tr>",
    "<tr><td style=\"padding:6px 0;font-size:15px;line-height:1.6;\"><strong>Дата оплаты:</strong> " + paidAt + "</td></tr>",
    "</table>",
    "<p style=\"margin:0 0 12px;font-size:15px;line-height:1.6;font-weight:700;\">Что сделать:</p>",
    "<ol style=\"margin:0;padding-left:20px;font-size:15px;line-height:1.7;color:#444;\">",
    "<li>Проверить оплату в Т-Бизнесе.</li>",
    "<li>Связаться с учеником.</li>",
    "<li>Подключить ученика к VIP-сопровождению.</li>",
    "</ol>",
    "</td></tr>",
    "</table>",
    "</td></tr>",
    "</table>",
    "</body>",
    "</html>",
  ].join("");
}

function buildTextBody(name, courseUrl, chatUrl) {
  return [
    `Здравствуйте, ${name}!`,
    "",
    "Спасибо за оплату VIP-сопровождения по программе «Нейромультфильмы и AI-видео» ❤️",
    "",
    "Мы очень рады, что вы присоединились к обучению в расширенном формате с личным сопровождением.",
    "",
    "Переходите по ссылкам ниже и начинайте ваше погружение в мир AI-видео, нейросетей, мультфильмов, виртуальных персонажей и новых творческих возможностей.",
    "",
    "Доступ к материалам курса: 1 год.",
    "",
    "Ваш доступ к урокам и важным материалам:",
    courseUrl,
    "",
    "Чат общения участников курса:",
    chatUrl,
    "",
    "Ваш тариф: VIP-сопровождение.",
    "",
    "После оплаты с вами свяжется отдел заботы школы Digital Izba, чтобы помочь с подключением, организационными моментами и дальнейшими шагами по сопровождению.",
    "",
    "Пожалуйста, сохраните это письмо. Ссылки понадобятся вам для повторного входа к материалам курса и чату участников.",
    "",
    "Если возникнут вопросы по доступу, напишите Юлии:",
    SUPPORT_EMAIL,
    "",
    "Или в отдел заботы школы Digital Izba:",
    SUPPORT_TELEGRAM_HANDLE,
    "",
    "С уважением,",
    "Юлия Копасова",
  ].join("\n");
}

function buildHtmlBody(name, courseUrl, chatUrl) {
  const safeName = escapeHtml(name);

  return [
    "<!DOCTYPE html>",
    "<html lang=\"ru\">",
    "<head>",
    "<meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    "<title>VIP-сопровождение «Нейромультфильмы и AI-видео»</title>",
    "</head>",
    "<body style=\"margin:0;padding:0;background:#f5f0e8;font-family:Arial,Helvetica,sans-serif;color:#222;\">",
    "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"background:#f5f0e8;padding:24px 12px;\">",
    "<tr><td align=\"center\">",
    "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:580px;background:#ffffff;border-radius:14px;padding:32px 28px;border:1px solid #f0e0c8;\">",
    "<tr><td>",
    "<h1 style=\"margin:0 0 20px;font-size:22px;line-height:1.35;color:#111;\">Добро пожаловать в VIP-сопровождение</h1>",
    "<p style=\"margin:0 0 8px;font-size:15px;line-height:1.5;color:#b8860b;font-weight:600;\">«Нейромультфильмы и AI-видео»</p>",
    `<p style=\"margin:0 0 16px;font-size:16px;line-height:1.6;\">Здравствуйте, ${safeName}!</p>`,
    "<p style=\"margin:0 0 16px;font-size:16px;line-height:1.6;\">Спасибо за оплату VIP-сопровождения по программе «Нейромультфильмы и AI-видео» ❤️</p>",
    "<p style=\"margin:0 0 16px;font-size:16px;line-height:1.6;\">Мы очень рады, что вы присоединились к обучению в расширенном формате с личным сопровождением.</p>",
    "<p style=\"margin:0 0 16px;font-size:16px;line-height:1.6;\">Переходите по ссылкам ниже и начинайте ваше погружение в мир AI-видео, нейросетей, мультфильмов, виртуальных персонажей и новых творческих возможностей.</p>",
    "<p style=\"margin:0 0 24px;font-size:15px;line-height:1.6;color:#555;\"><strong>Доступ к материалам курса:</strong> 1 год.</p>",
    "<p style=\"margin:0 0 12px;font-size:15px;line-height:1.6;\">Ваш доступ к урокам и важным материалам:</p>",
    "<p style=\"margin:0 0 20px;text-align:center;\">",
    `<a href=\"${escapeHtml(courseUrl)}\" style=\"display:inline-block;background:linear-gradient(135deg,#ffb347 0%,#ff8c00 100%);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 28px;border-radius:8px;\">Перейти к урокам</a>`,
    "</p>",
    "<p style=\"margin:0 0 12px;font-size:15px;line-height:1.6;\">Чат общения участников курса:</p>",
    "<p style=\"margin:0 0 24px;text-align:center;\">",
    `<a href=\"${escapeHtml(chatUrl)}\" style=\"display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 28px;border-radius:8px;\">Войти в чат участников</a>`,
    "</p>",
    "<p style=\"margin:0 0 16px;font-size:15px;line-height:1.6;\"><strong>Ваш тариф:</strong> VIP-сопровождение.</p>",
    "<p style=\"margin:0 0 16px;font-size:15px;line-height:1.6;color:#555;\">После оплаты с вами свяжется отдел заботы школы Digital Izba, чтобы помочь с подключением, организационными моментами и дальнейшими шагами по сопровождению.</p>",
    "<p style=\"margin:0 0 24px;font-size:14px;line-height:1.6;color:#555;\">Пожалуйста, сохраните это письмо. Ссылки понадобятся вам для повторного входа к материалам курса и чату участников.</p>",
    "<p style=\"margin:0 0 24px;font-size:14px;line-height:1.6;color:#555;\">",
    "Если возникнут вопросы по доступу, напишите Юлии: ",
    `<a href=\"mailto:${SUPPORT_EMAIL}\" style=\"color:#d97706;\">${SUPPORT_EMAIL}</a>`,
    "<br>",
    "Или в отдел заботы школы Digital Izba: ",
    `<a href=\"${SUPPORT_TELEGRAM_URL}\" style=\"color:#d97706;\">${SUPPORT_TELEGRAM_HANDLE}</a>`,
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

async function sendVideoVipAccessEmail(order) {
  const missing = getMissingMailConfig();
  if (missing.length > 0) {
    console.warn(
      "VIP-письмо не отправлено: не заполнены настройки — " + missing.join(", ")
    );
    return { sent: false, reason: "not_configured" };
  }

  const name = String((order && order.name) || "клиент").trim() || "клиент";
  const email = String((order && order.email) || "").trim().toLowerCase();
  const courseUrl = process.env.VIDEO_VIP_COURSE_URL;
  const chatUrl = process.env.VIDEO_VIP_CHAT_URL;

  if (!email) {
    console.warn("VIP-письмо не отправлено: у заказа не указан email");
    return { sent: false, reason: "no_email" };
  }

  const transport = await createTransport();

  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: SUBJECT,
      text: buildTextBody(name, courseUrl, chatUrl),
      html: buildHtmlBody(name, courseUrl, chatUrl),
    });
    return { sent: true };
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}

async function sendVideoVipAdminNotification(order) {
  const missing = getMissingSmtpConfig();
  if (missing.length > 0) {
    console.warn(
      "VIP-уведомление администратору не отправлено: не заполнены настройки — " +
        missing.join(", ")
    );
    return { sent: false, reason: "not_configured" };
  }

  const transport = await createTransport();

  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM,
      to: getAdminEmail(),
      subject: ADMIN_SUBJECT,
      text: buildAdminTextBody(order),
      html: buildAdminHtmlBody(order),
    });
    return { sent: true };
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}

module.exports = { sendVideoVipAccessEmail, sendVideoVipAdminNotification };
