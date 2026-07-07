const fs = require("fs");
const path = require("path");

const ordersPath = path.join(__dirname, "..", "data", "video-vip-orders.json");

function readOrders() {
  try {
    if (!fs.existsSync(ordersPath)) return [];
    return JSON.parse(fs.readFileSync(ordersPath, "utf8"));
  } catch {
    return [];
  }
}

function writeOrders(orders) {
  fs.mkdirSync(path.dirname(ordersPath), { recursive: true });
  fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2), "utf8");
}

function createOrder(data) {
  const orders = readOrders();
  const order = {
    ...data,
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  writeOrders(orders);
  return order;
}

function getOrderByOrderId(orderId) {
  return (
    readOrders().find(function (order) {
      return order.orderId === orderId;
    }) || null
  );
}

function updateOrderByOrderId(orderId, patch) {
  const orders = readOrders();
  const index = orders.findIndex(function (order) {
    return order.orderId === orderId;
  });

  if (index === -1) return null;

  orders[index] = { ...orders[index], ...patch };
  writeOrders(orders);
  return orders[index];
}

function setAccessEmailSent(orderId) {
  return updateOrderByOrderId(orderId, {
    accessEmailSentAt: new Date().toISOString(),
    accessEmailError: undefined,
  });
}

function setAccessEmailError(orderId, errorMessage) {
  return updateOrderByOrderId(orderId, {
    accessEmailError: String(errorMessage || "Ошибка отправки письма").slice(0, 500),
  });
}

module.exports = {
  createOrder,
  readOrders,
  getOrderByOrderId,
  updateOrderByOrderId,
  setAccessEmailSent,
  setAccessEmailError,
};
