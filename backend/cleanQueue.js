
"use strict";
require("dotenv").config();

const { payrollQueue } = require("./src/queues/payrollQueue");

async function clean() {
  try {
    await payrollQueue.clean(0, 100, "failed");
    console.log("✅ Failed jobs cleaned");
  } catch (err) {
    console.error("❌ Error cleaning queue:", err);
  } finally {
    process.exit(0);
  }
}

clean();