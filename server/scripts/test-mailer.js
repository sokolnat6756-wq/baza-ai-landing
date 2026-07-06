require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });

const { sendAccessEmail } = require("../services/mailer");

const email = String(process.argv[2] || "").trim().toLowerCase();

if (!email) {
  console.error("Укажите email: node server/scripts/test-mailer.js test@mail.ru");
  process.exit(1);
}

sendAccessEmail({ name: "Тест", email })
  .then(function (result) {
    if (result.sent) {
      console.log("Test email sent");
      process.exit(0);
    }

    console.error("Test email not sent: SMTP или TELEGRAM_ACCESS_URL не настроены");
    process.exit(1);
  })
  .catch(function (error) {
    console.error(error && error.message ? error.message : "Test email failed");
    process.exit(1);
  });
