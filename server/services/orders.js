const fs = require("fs");
const path = require("path");

const ordersPath = path.join(__dirname, "..", "data", "orders.json");

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

module.exports = { createOrder, readOrders };
