const fs = require("fs");
const path = require("path");
const config = require("../config");

const partnersPath = path.join(__dirname, "..", "data", "partners.json");
const ordersPath = path.join(__dirname, "..", "data", "orders.json");

function readJsonArray(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function formatRub(kopecks) {
  const rub = Number(kopecks || 0) / 100;
  return rub.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }) + " ₽";
}

function pad(value, width) {
  const text = String(value == null || value === "" ? "—" : value);
  if (text.length >= width) return text + " ";
  return text + " ".repeat(width - text.length);
}

function getOrderDate(order) {
  return order.paidAt || order.createdAt || order.created_at || "";
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPartnerRewardKopecks(order, commissionPercent) {
  if (order.partnerReward != null && order.partnerReward !== "") {
    const reward = Number(order.partnerReward);
    if (!Number.isNaN(reward)) return reward;
  }
  const amount = Number(order.amount || 0);
  return Math.round(amount * commissionPercent / 100);
}

function buildReport() {
  const partners = readJsonArray(partnersPath);
  const orders = readJsonArray(ordersPath);
  const commissionPercent = Number(config.partnerCommissionPercent) || 10;
  const siteUrl = config.siteUrl;

  const partnerOrders = orders.filter(function (order) {
    return Boolean(order && order.partnerCode);
  });

  console.log("");
  console.log("Партнёрская программа — отчёт");
  console.log("==============================");
  console.log("");

  if (partners.length === 0) {
    console.log("Партнёров пока нет.");
    console.log("");
  }

  const rows = partners.map(function (partner) {
    const code = String(partner.code || "").toUpperCase();
    const related = partnerOrders.filter(function (order) {
      return String(order.partnerCode || "").toUpperCase() === code;
    });

    let pending = 0;
    let paid = 0;
    let failed = 0;
    let paidAmountKopecks = 0;
    let rewardKopecks = 0;

    related.forEach(function (order) {
      const status = String(order.status || "");
      if (status === "pending") pending += 1;
      else if (status === "paid") {
        paid += 1;
        paidAmountKopecks += Number(order.amount || 0);
        rewardKopecks += getPartnerRewardKopecks(order, commissionPercent);
      } else if (status === "failed") failed += 1;
    });

    return {
      code: code || "—",
      name: partner.name || "—",
      email: partner.email || "—",
      telegram: partner.telegram || "—",
      referralUrl: partner.referralUrl || (code ? siteUrl + "/?ref=" + code : "—"),
      total: related.length,
      pending: pending,
      paid: paid,
      failed: failed,
      paidAmountKopecks: paidAmountKopecks,
      rewardKopecks: rewardKopecks,
    };
  });

  const totalPartnerOrders = partnerOrders.length;
  const totalPaidOrders = partnerOrders.filter(function (order) {
    return order.status === "paid";
  }).length;
  const totalPaidAmount = rows.reduce(function (sum, row) {
    return sum + row.paidAmountKopecks;
  }, 0);
  const totalReward = rows.reduce(function (sum, row) {
    return sum + row.rewardKopecks;
  }, 0);

  console.log("Всего партнёров: " + partners.length);
  console.log("Всего заказов по партнёрским ссылкам: " + totalPartnerOrders);
  console.log("Оплаченных заказов: " + totalPaidOrders);
  console.log("Сумма оплат: " + formatRub(totalPaidAmount));
  console.log("К выплате партнёрам: " + formatRub(totalReward));
  console.log("");

  if (partners.length > 0) {
    console.log(
      pad("Код", 14) +
        pad("Имя", 18) +
        pad("Email", 36) +
        pad("Telegram", 16) +
        pad("Заявки", 8) +
        pad("Pending", 9) +
        pad("Paid", 6) +
        pad("Failed", 8) +
        pad("Сумма оплат", 14) +
        "К выплате"
    );
    console.log("-".repeat(145));

    rows.forEach(function (row) {
      console.log(
        pad(row.code, 14) +
          pad(row.name, 18) +
          pad(row.email, 36) +
          pad(row.telegram, 16) +
          pad(row.total, 8) +
          pad(row.pending, 9) +
          pad(row.paid, 6) +
          pad(row.failed, 8) +
          pad(formatRub(row.paidAmountKopecks), 14) +
          formatRub(row.rewardKopecks)
      );
      if (row.referralUrl && row.referralUrl !== "—") {
        console.log("  ссылка: " + row.referralUrl);
      }
    });
    console.log("");
  }

  console.log("Последние 10 партнёрских заказов:");
  console.log("");

  if (partnerOrders.length === 0) {
    console.log("Заказов по партнёрским ссылкам пока нет.");
    console.log("");
    return;
  }

  const recent = partnerOrders
    .slice()
    .sort(function (a, b) {
      const dateA = new Date(getOrderDate(a) || 0).getTime();
      const dateB = new Date(getOrderDate(b) || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, 10);

  console.log(
    pad("Дата", 20) +
      pad("Статус", 12) +
      pad("Сумма", 12) +
      pad("Партнёр", 12) +
      pad("Email покупателя", 28) +
      "Заказ"
  );
  console.log("-".repeat(110));

  recent.forEach(function (order) {
    console.log(
      pad(formatDate(getOrderDate(order)), 20) +
        pad(order.status || "—", 12) +
        pad(formatRub(order.amount), 12) +
        pad(order.partnerCode || "—", 12) +
        pad(order.email || "—", 28) +
        (order.orderId || "—")
    );
  });

  console.log("");
}

buildReport();
