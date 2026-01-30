/**
 * Main launcher file
 * - Loads env
 * - Starts bot
 * - Auto restarts every 2 hours
 * - Safe for Railway / Render / VPS / Phone
 */

console.log("🚀 Starting WhatsApp Bot...");

require("dotenv").config();

// Start main bot logic
require("./main.js");

// ===============================
// ⏱ Auto Restart (Every 2 Hours)
// ===============================
const TWO_HOURS = 2 * 60 * 60 * 1000;

setTimeout(() => {
  console.log("♻️ Auto restart triggered (2 hours passed)");
  process.exit(0); // Platform will auto-restart
}, TWO_HOURS);

// ===============================
// 🛡 Safety Handlers
// ===============================
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

// ===============================
// 🔌 Graceful shutdown (optional)
// ===============================
process.on("SIGINT", () => {
  console.log("🛑 SIGINT received, shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received, shutting down...");
  process.exit(0);
});
