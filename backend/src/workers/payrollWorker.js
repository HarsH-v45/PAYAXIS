"use strict";
console.log("👀 Worker listening...");
const { Worker, UnrecoverableError } = require("bullmq");
const redis           = require("../config/redis");
const db              = require("../config/db");
const taxEngine       = require("../services/taxEngine");
const { generatePayslipPDF } = require("../services/pdfService");
const storageService  = require("../services/storageService");
const { sendPayslip } = require("../services/emailService");
const { logAsync }    = require("../services/auditService");
const { getMonthSummary } = require("../services/attendanceService");
const PayrollRecord   = require("../models/payrollRecord.model");
const EmployeeModel   = require("../models/employee.model");

const worker = new Worker(
  "payroll-processing",
  async (job) => {
    console.log("🚀 JOB RECEIVED:", job.id);

    const { employeeId, month, year, runId, initiatedBy } = job.data;
    const ctx = `[Job ${job.id}|Emp ${employeeId}|${month}/${year}]`;

    await job.updateProgress(0);


    // 1. Fetch data
    await job.log(`${ctx} Fetching employee…`);
    const employee = await EmployeeModel.findById(employeeId);
    if (!employee) throw new UnrecoverableError(`Employee ${employeeId} not found`);
    if (!employee.annual_ctc) throw new UnrecoverableError(`No active salary structure for ${employeeId}`);

    const attendance = await getMonthSummary(employeeId, month, year);
    const ytd        = await PayrollRecord.getYTDTotals(employeeId, month, year);
    await job.updateProgress(10);

    // 2. Tax Engine
    await job.log(`${ctx} Running tax engine…`);
    const snapshot = await taxEngine.calculate({
      employee, salaryStructure: employee,
      attendance, month, year,
      ytdTaxablePay:  ytd.ytdTaxablePay,
      ytdTDSDeducted: ytd.ytdTDSDeducted,
    });
    await job.updateProgress(25);

    // 3. Upsert record as PROCESSING
    const recordId = await PayrollRecord.upsert({
      employeeId, month, year, runId,
      status:   "PROCESSING",
      grossPay: snapshot.grossPay,
      netPay:   snapshot.netPay,
      lopDays:  snapshot.lopDays,
      snapshot,
    });
    await job.updateProgress(30);

// 4+5. Generate PDF via Puppeteer
await job.log(`${ctx} Generating PDF…`);
// const pdfBuffer = await generatePayslipPDF(employee, snapshot);
await job.updateProgress(60);

// 6. Upload to storage
const payslipUrl = null;

await job.updateProgress(70);

    // 7. Send email
    await job.log(`${ctx} Sending email to ${employee.email}…`);
    await sendPayslip({
      to:          employee.email,
      employeeName:employee.full_name,
      month, year,
      netPay:      snapshot.netPay,
      pdfBuffer,
      payslipUrl,
      filename:    `PayAxis_Payslip_${month}_${year}_${employee.employee_code}.pdf`,
    });
    await job.updateProgress(85);

    // 8. Mark SUCCESS
    const def = v => v || 0;
    const empDeds = snapshot.deductions.employee;
    const erDeds  = snapshot.deductions.employer;
    const get = (code) => (empDeds.find(d=>d.code===code)?.amount || erDeds.find(d=>d.code===code)?.amount || 0);

    await PayrollRecord.markSuccess(recordId, {
      payslipUrl, emailSentAt: new Date().toISOString(), processedAt: new Date().toISOString(),
      grossPay:   snapshot.grossPay,  netPay:       snapshot.netPay,
      lopDays:    snapshot.lopDays,   lopDeduction: snapshot.lopDeduction,
      pfEmployee: get("PF_EMP"),  esiEmployee: get("ESI_EMP"),
      ptAmount:   get("PT"),      tdsAmount:   get("TDS"),
      pfEmployer: get("PF_ER"),   esiEmployer: get("ESI_ER"),
      taxRegime:  snapshot.regime,
      projectedAnnualTax: snapshot.tds.projectedAnnualTax,
      effectiveTaxRate:   snapshot.tds.effectiveRate,
    });
    await db.query(
      `UPDATE payroll_runs 
      SET processed_count = (
        SELECT COUNT(*) FROM payroll_records 
        WHERE run_id=$1 AND status='SUCCESS'
      )
      WHERE id=$1`,
      [runId]
    );

    // 9. Audit log
    logAsync({
      action:"PAYROLL_PROCESSED", entityType:"PayrollRecord", entityId:recordId,
      actorId: initiatedBy==="SYSTEM"?null:initiatedBy, actorRole:"SYSTEM",
      description:`Payroll processed for ${employee.employee_code} — Net: ₹${snapshot.netPay}`,
      metadata: { runId, month, year, jobId: job.id },
    });

    await job.updateProgress(100);
    console.log(`${ctx} ✓ Done — Net: ₹${snapshot.netPay}`);
    // BUG FIX #10: Removed redundant duplicate UPDATE here — markSuccess() above already sets status=SUCCESS

// ✅ Check if all employees are done
const { rows } = await db.query(
  `SELECT COUNT(*) FILTER (WHERE status!='SUCCESS') AS pending
   FROM payroll_records
   WHERE run_id=$1`,
  [runId]
);

if (rows[0].pending == 0) {
  await db.query(
    `UPDATE payroll_runs SET status='COMPLETED' WHERE id=$1`,
    [runId]
  );
  console.log("🎉 Payroll run completed:", runId);
}
    return { success:true, recordId, netPay:snapshot.netPay, payslipUrl };
  },
  {
    connection:  redis,
    concurrency: 4,
    limiter:     { max:10, duration:1000 },
  }
);

worker.on("failed", async (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed (${job?.attemptsMade} attempts): ${err.message}`);
  if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
    await PayrollRecord.markFailed(job.data.employeeId, job.data.month, job.data.year, {
      error: err.message, attempts: job.attemptsMade,
    }).catch(() => {});
  }
});

worker.on("stalled", jobId => console.warn(`[Worker] Job ${jobId} stalled`));
worker.on("error",   err   => console.error("[Worker] Error:", err.message));

process.on("SIGTERM", async () => { await worker.close(); process.exit(0); });

module.exports = worker;
