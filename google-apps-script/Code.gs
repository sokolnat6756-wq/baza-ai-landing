/**
 * Webhook для записи событий оплаты в Google Таблицу.
 * Дубликаты определяются ТОЛЬКО по eventKey (productSlug:orderId:eventType),
 * не по цвету строки и не по email.
 */

var SHEET_NAME = "Оплаты";
var EVENT_KEY_COLUMN = 11; // колонка K — eventKey (скрытый идентификатор события)
var PHONE_COLUMN = 6; // колонка F — Телефон

var ROW_COLORS = {
  warm_lead: "#FFF2CC",
  paid_baza_ai: "#CFE2F3",
  paid_baza_ai_studio: "#D9EAD3",
  installment: "#E8DAEF",
};

function doPost(e) {
  try {
    var payload = parsePayload_(e);
    var secret = PropertiesService.getScriptProperties().getProperty("WEBHOOK_SECRET");

    if (!secret || String(payload.secret || "") !== secret) {
      return jsonResponse_({ ok: false, error: "forbidden" }, 403);
    }

    var eventKey = buildEventKey_(payload);

    var sheet = getSheet_();
    if (hasEventKey_(sheet, eventKey)) {
      return jsonResponse_({ ok: true, duplicate: true, eventKey: eventKey });
    }

    var row = buildRow_(payload, eventKey);
    sheet.appendRow(row);
    var newRow = sheet.getLastRow();
    setPhoneAsText_(sheet, newRow, payload.phone);
    applyRowColor_(sheet, newRow, payload);

    return jsonResponse_({ ok: true, duplicate: false, eventKey: eventKey, row: newRow });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err && err.message ? err.message : err) }, 500);
  }
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("empty body");
  }
  return JSON.parse(e.postData.contents);
}

function buildEventKey_(payload) {
  if (payload.eventKey) {
    return String(payload.eventKey).trim();
  }

  var productSlug = String(payload.productSlug || "").trim();
  var orderId = String(payload.orderId || "").trim();
  var eventType = String(payload.eventType || "").trim();
  if (productSlug && orderId && eventType) {
    return productSlug + ":" + orderId + ":" + eventType;
  }

  var orderNumber = String(payload.orderNumber || "").trim();
  if (orderNumber) {
    return "legacy:" + orderNumber;
  }

  if (orderId) {
    return "legacy:" + orderId;
  }

  var product = String(payload.product || "").trim();
  var tariff = String(payload.tariff || "").trim();
  var email = String(payload.email || "").trim().toLowerCase();
  var amount = payload.amount != null ? String(payload.amount) : "";
  var date = String(payload.date || "").trim() || new Date().toISOString();

  return "legacy:" + product + ":" + tariff + ":" + email + ":" + amount + ":" + date;
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  return sheet;
}

function hasEventKey_(sheet, eventKey) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  var keys = sheet.getRange(2, EVENT_KEY_COLUMN, lastRow, EVENT_KEY_COLUMN).getValues();
  for (var i = 0; i < keys.length; i++) {
    if (String(keys[i][0] || "").trim() === eventKey) {
      return true;
    }
  }
  return false;
}

function formatPhoneForSheet_(phone) {
  return String(phone || "").trim();
}

function setPhoneAsText_(sheet, row, phone) {
  var value = formatPhoneForSheet_(phone);
  if (!value) return;
  var cell = sheet.getRange(row, PHONE_COLUMN);
  cell.setNumberFormat("@");
  cell.setValue(value);
}

function buildRow_(payload, eventKey) {
  return [
    payload.date || new Date().toISOString(),
    payload.product || "",
    payload.tariff || "",
    payload.name || "",
    payload.email || "",
    formatPhoneForSheet_(payload.phone),
    payload.amount != null ? payload.amount : "",
    payload.promoCode || "",
    payload.partner != null ? payload.partner : "",
    payload.partnerReward != null ? payload.partnerReward : "",
    eventKey,
  ];
}

/**
 * Цвет строки — по типу события и продукту, НЕ для dedup.
 * Фиолетовый = любая рассрочка (baza-ai и baza-ai-studio).
 */
function applyRowColor_(sheet, row, payload) {
  var eventType = String(payload.eventType || "").trim();
  var productSlug = String(payload.productSlug || "").trim();
  var color = null;

  if (eventType === "warm_lead") {
    color = ROW_COLORS.warm_lead;
  } else if (eventType === "installment_approved" || eventType === "installment_signed") {
    color = ROW_COLORS.installment;
  } else if (eventType === "paid") {
    if (productSlug === "baza-ai") {
      color = ROW_COLORS.paid_baza_ai;
    } else if (productSlug === "baza-ai-studio") {
      color = ROW_COLORS.paid_baza_ai_studio;
    }
  }

  if (!color) return;

  var width = sheet.getLastColumn();
  sheet.getRange(row, 1, 1, width).setBackground(color);
}

function jsonResponse_(obj, statusCode) {
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  if (statusCode) {
    // Apps Script Web App не поддерживает HTTP-код напрямую; статус в теле.
    obj.httpStatus = statusCode;
  }
  return output;
}
