// worker.js
"use strict";
require("dotenv").config();
const { startAll } = require("./src/workers/workerRegistry");
const db    = require("./src/config/db");
const redis = require("./src/config/redis");

async function start() {
  try { await db.query("SELECT 1"); await redis.ping(); console.log("✅ Worker: DB + Redis connected"); }
  catch (e) { console.error("Worker startup failed:", e.message); process.exit(1); }
  await startAll();
}
start();
console.log("Worker Redis:", redis.options.host, redis.options.port, redis.options.db);