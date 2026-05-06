"use strict";
const cron = require("node-cron");
const { enqueueMonthlyPayroll } = require("../queues/payrollQueue");

function startPayrollCron() {
  // Fires at 02:00 AM IST on the 1st of every month
  cron.schedule("0 2 1 * *", async () => {
    const now   = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();
    console.log(`[Cron] Monthly payroll triggered for ${month}/${year}`);
    try {
      const { runId, jobCount } = await enqueueMonthlyPayroll({ month, year, initiatedBy:"SYSTEM", runType:"AUTO" });
      console.log(`[Cron] ✓ Enqueued ${jobCount} jobs — RunID: ${runId}`);
    } catch (err) {
      console.error(`[Cron] ✗ Failed: ${err.message}`);
    }
  }, { scheduled:true, timezone:"Asia/Kolkata" });

  console.log("[Cron] Payroll scheduler registered — fires 1st of month at 02:00 IST");
}

module.exports = { startPayrollCron };
