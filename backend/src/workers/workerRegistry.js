// workers/workerRegistry.js
"use strict";
const payrollWorker = require("./payrollWorker");

async function startAll() {
  console.log("⚡ PayAxis Workers started");
  console.log("   payrollWorker — concurrency: 4");

  async function shutdown(sig) {
    console.log(`${sig} — closing workers…`);
    await payrollWorker.close();
    process.exit(0);
  }
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
}

module.exports = { startAll };
