// server.js
"use strict";
require("dotenv").config();
require("./workers/payrollWorker");
const http = require("http");
const app  = require("./src/app");
const { startPayrollCron } = require("./src/schedulers/payrollCron");
const db    = require("./src/config/db");
const redis = require("./src/config/redis");
const { getEnv } = require("./src/config/env");

async function start() {
  const env = getEnv();
  try { await db.query("SELECT 1"); console.log("✅ PostgreSQL connected"); }
  catch (e) { console.error("❌ DB failed:", e.message); process.exit(1); }
  try { await redis.ping(); console.log("✅ Redis connected"); }
  catch (e) { console.error("❌ Redis failed:", e.message); process.exit(1); }

  const server = http.createServer(app);
  server.listen(env.PORT, () => {
    console.log(`\n🚀 PayAxis API on port ${env.PORT} [${env.NODE_ENV}] PID:${process.pid}`);
  });

  startPayrollCron();

  const shutdown = async (sig) => {
    console.log(`\n${sig} — shutting down…`);
    server.close(async () => {
      await db.pool.end();
      await redis.quit();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
  process.on("uncaughtException",  e => console.error("Uncaught:", e));
  process.on("unhandledRejection", e => console.error("Unhandled:", e));
}

start();
