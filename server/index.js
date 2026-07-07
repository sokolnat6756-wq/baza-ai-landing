const path = require("path");
const express = require("express");
const config = require("./config");
const paymentRouter = require("./routes/payment");
const videoVipPaymentRouter = require("./routes/videoVipPayment");

const app = express();
const rootDir = path.join(__dirname, "..");

app.use(express.json({ limit: "32kb" }));
app.use("/api", paymentRouter);
app.use("/api/video-vip/payment", videoVipPaymentRouter);
app.use(express.static(rootDir));

app.listen(config.port, function () {
  console.log(`База ИИ — сервер запущен: ${config.siteUrl}`);
  console.log(`MOCK_PAYMENTS: ${config.mockPayments}`);
});
