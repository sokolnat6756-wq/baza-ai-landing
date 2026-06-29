const ALLOWED_EMAIL_DOMAINS = new Set([
  "mail.ru",
  "yandex.ru",
  "ya.ru",
  "inbox.ru",
  "list.ru",
  "bk.ru",
]);

const DOMAIN_ERROR_MESSAGE =
  "Укажите email на mail.ru, yandex.ru, inbox.ru, list.ru или bk.ru.";

function getEmailDomain(email) {
  const at = email.lastIndexOf("@");
  if (at < 0) return "";
  return email.slice(at + 1).toLowerCase();
}

function isAllowedEmailDomain(email) {
  return ALLOWED_EMAIL_DOMAINS.has(getEmailDomain(email));
}

module.exports = {
  ALLOWED_EMAIL_DOMAINS,
  DOMAIN_ERROR_MESSAGE,
  getEmailDomain,
  isAllowedEmailDomain,
};
