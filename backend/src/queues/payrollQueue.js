"use strict";
console.log("🔥 Enqueuing payroll jobs...");
const { Queue, QueueEvents } = require("bullmq");
const { v4: uuidv4 } = require("uuid");
const redis = require("../config/redis");
const db    = require("../config/db");

const QUEUE_NAME = "payroll-processing";

const payrollQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff:  { type:"exponential", delay:30000 },
    removeOnComplete: { age: 7*24*3600, count:500 },
    removeOnFail:     { age:30*24*3600 },
  },
});

const queueEvents = new QueueEvents(QUEUE_NAME, { connection: redis });
queueEvents.on("failed", ({ jobId, failedReason }) =>
  console.error(`[Queue] Job ${jobId} failed: ${failedReason}`)
);

async function enqueueMonthlyPayroll({ month, year, initiatedBy="SYSTEM", runType="AUTO" }) {


const {rows} =  await db.query(
    `INSERT INTO payroll_runs (id,month,year,run_type,status,initiated_by,initiated_at)
     VALUES ($1,$2,$3,$4,'INITIATED',$5,NOW())
     ON CONFLICT (month,year,run_type) 
     DO UPDATE SET status='INITIATED',initiated_at=NOW()
     RETURNING id`,
    [uuidv4(), month, year, runType, initiatedBy === "SYSTEM" ? null : initiatedBy]
  );

  const runId = rows[0].id;

  const { rows: emps } = await db.query(
    `SELECT e.id AS employee_id, e.employee_code FROM employees e
     JOIN salary_structures ss ON ss.employee_id=e.id AND ss.is_active=TRUE
     WHERE e.is_active=TRUE ORDER BY e.employee_code`
  );

  if (!emps.length) return { runId, jobCount:0 };

  // Seed PENDING records
  await db.query(
    `INSERT INTO payroll_records (id,run_id,employee_id,month,year,status)
     SELECT uuid_generate_v4(),$1,unnest($2::uuid[]),$3,$4,'PENDING'
     ON CONFLICT (employee_id,month,year)
     DO UPDATE SET run_id=EXCLUDED.run_id,status='PENDING',updated_at=NOW()`,
    [runId, emps.map(e => e.employee_id), month, year]
  );

  const jobs = emps.map(emp => ({
    name: `payslip:${emp.employee_code}:${month}-${year}`,
    data: { employeeId: emp.employee_id, month, year, runId, initiatedBy },
    opts: { jobId: `${emp.employee_id}:${month}:${year}`, priority:1 },
  }));
  await payrollQueue.addBulk(jobs);

  await db.query(
    `UPDATE payroll_runs SET total_employees=$1,status='RUNNING' WHERE id=$2`,
    [emps.length, runId]
  );

  console.log(`[Queue] Enqueued ${emps.length} jobs for ${month}/${year}`);
  return { runId, jobCount: emps.length };
}

async function enqueueSinglePayroll({ employeeId, month, year, initiatedBy }) {
  const runId = uuidv4();
  const jobId = `${employeeId}:${month}:${year}`;
  await payrollQueue.add(`payslip:manual:${month}-${year}`, { employeeId, month, year, runId, initiatedBy }, { jobId, priority:10, attempts:5 });
  return { jobId, runId };
}

async function getQueueMetrics() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    payrollQueue.getWaitingCount(), payrollQueue.getActiveCount(),
    payrollQueue.getCompletedCount(), payrollQueue.getFailedCount(),
    payrollQueue.getDelayedCount(),
  ]);
  return { waiting, active, completed, failed, delayed };
}
console.log("Backend Redis:", redis.options.host, redis.options.port, redis.options.db);
module.exports = { payrollQueue, enqueueMonthlyPayroll, enqueueSinglePayroll, getQueueMetrics };
