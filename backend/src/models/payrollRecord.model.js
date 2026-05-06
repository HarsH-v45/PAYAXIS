// models/payrollRecord.model.js
"use strict";
const db = require("../config/db");

async function upsert({ employeeId, month, year, runId, status="PROCESSING", grossPay=0, netPay=0, lopDays=0, snapshot={} }) {
  const { rows } = await db.query(
    `INSERT INTO payroll_records (id,run_id,employee_id,month,year,status,gross_pay,net_pay,lop_days,snapshot,created_at,updated_at)
     VALUES (uuid_generate_v4(),$1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
     ON CONFLICT (employee_id,month,year) DO UPDATE SET run_id=EXCLUDED.run_id,status=EXCLUDED.status,gross_pay=EXCLUDED.gross_pay,net_pay=EXCLUDED.net_pay,snapshot=EXCLUDED.snapshot,updated_at=NOW()
     RETURNING id`,
    [runId,employeeId,month,year,status,grossPay,netPay,lopDays,JSON.stringify(snapshot)]
  );
  return rows[0].id;
}

async function markSuccess(recordId, { payslipUrl, emailSentAt, processedAt, grossPay, netPay, lopDays, lopDeduction, pfEmployee, esiEmployee, ptAmount, tdsAmount, pfEmployer, esiEmployer, taxRegime, projectedAnnualTax, effectiveTaxRate }) {
  await db.query(
    `UPDATE payroll_records SET status='SUCCESS',payslip_url=$2,payslip_generated_at=NOW(),email_sent_at=$3,processed_at=$4,gross_pay=COALESCE($5,gross_pay),net_pay=COALESCE($6,net_pay),lop_days=COALESCE($7,lop_days),lop_deduction=$8,pf_employee=$9,esi_employee=$10,pt_amount=$11,tds_amount=$12,pf_employer=$13,esi_employer=$14,tax_regime=$15,projected_annual_tax=$16,effective_tax_rate=$17,updated_at=NOW() WHERE id=$1`,
    [recordId,payslipUrl,emailSentAt,processedAt,grossPay,netPay,lopDays,lopDeduction,pfEmployee,esiEmployee,ptAmount,tdsAmount,pfEmployer,esiEmployer,taxRegime,projectedAnnualTax,effectiveTaxRate]
  );
}

async function markFailed(employeeId, month, year, { error, attempts }) {
  await db.query(
    `UPDATE payroll_records SET status='FAILED',status_reason=$4,attempts=$5,updated_at=NOW() WHERE employee_id=$1 AND month=$2 AND year=$3`,
    [employeeId,month,year,error,attempts]
  );
}

async function markHold(recordId, { reason, heldBy }) {
  await db.query(`UPDATE payroll_records SET status='HOLD',status_reason=$2,adjusted_by=$3,adjusted_at=NOW(),updated_at=NOW() WHERE id=$1`, [recordId,reason,heldBy]);
}

async function getYTDTotals(employeeId, currentMonth, currentYear) {
  const fyStartMonth = 4;
  const fyStartYear  = currentMonth >= 4 ? currentYear : currentYear - 1;
  const { rows } = await db.query(
    `SELECT COALESCE(SUM((snapshot->>'taxableEarnings')::NUMERIC),0) AS ytd_taxable, COALESCE(SUM(tds_amount),0) AS ytd_tds
     FROM payroll_records WHERE employee_id=$1 AND status='SUCCESS'
     AND ((year=$2 AND month>=$3) OR (year=$4 AND month<$5)) AND NOT (year=$6 AND month=$7)`,
    [employeeId,fyStartYear,fyStartMonth,currentYear,currentMonth,currentYear,currentMonth]
  );
  return { ytdTaxablePay: +rows[0]?.ytd_taxable||0, ytdTDSDeducted: +rows[0]?.ytd_tds||0 };
}

async function listByRun(runId, { page=1, limit=50, status }={}) {
  const params = [runId]; const conds = ["pr.run_id=$1"];
  if (status) { params.push(status); conds.push(`pr.status=$${params.length}`); }
  const where = conds.join(" AND ");
  const offset = (page-1)*limit;
  const { rows } = await db.query(
    `SELECT pr.*,e.full_name,e.employee_code,e.email,d.name AS department_name FROM payroll_records pr JOIN employees e ON e.id=pr.employee_id LEFT JOIN departments d ON d.id=e.department_id WHERE ${where} ORDER BY e.employee_code LIMIT $${params.length+1} OFFSET $${params.length+2}`,
    [...params,limit,offset]
  );
  const { rows: cr } = await db.query(`SELECT COUNT(*) AS total FROM payroll_records pr WHERE ${where}`, params);
  return { records:rows, total:+cr[0].total, page, limit };
}

async function listByEmployee(employeeId, { page=1, limit=12 }={}) {
  const { rows } = await db.query(
    `SELECT pr.* FROM payroll_records pr WHERE pr.employee_id=$1 ORDER BY pr.year DESC,pr.month DESC LIMIT $2 OFFSET $3`,
    [employeeId, limit, (page-1)*limit]
  );
  return rows;
}

async function findOne(employeeId, month, year) {
  const { rows } = await db.query(`SELECT pr.*,e.full_name,e.employee_code FROM payroll_records pr JOIN employees e ON e.id=pr.employee_id WHERE pr.employee_id=$1 AND pr.month=$2 AND pr.year=$3 LIMIT 1`, [employeeId,month,year]);
  return rows[0]||null;
}

async function getRunSummary(runId) {
  const { rows } = await db.query(
    `SELECT COUNT(*) AS total,COUNT(*) FILTER(WHERE status='SUCCESS') AS success,COUNT(*) FILTER(WHERE status='FAILED') AS failed,COUNT(*) FILTER(WHERE status='PROCESSING') AS processing,COUNT(*) FILTER(WHERE status='PENDING') AS pending,COALESCE(SUM(gross_pay) FILTER(WHERE status='SUCCESS'),0) AS total_gross,COALESCE(SUM(net_pay) FILTER(WHERE status='SUCCESS'),0) AS total_net,COALESCE(SUM(tds_amount) FILTER(WHERE status='SUCCESS'),0) AS total_tds FROM payroll_records WHERE run_id=$1`,
    [runId]
  );
  return rows[0];
}

async function getDepartmentBreakdown(month, year) {
  const { rows } = await db.query(
    `SELECT d.name AS department,COUNT(pr.id) AS headcount,SUM(pr.gross_pay) AS gross_payout,SUM(pr.net_pay) AS net_payout,SUM(pr.tds_amount) AS total_tds FROM payroll_records pr JOIN employees e ON e.id=pr.employee_id JOIN departments d ON d.id=e.department_id WHERE pr.month=$1 AND pr.year=$2 AND pr.status='SUCCESS' GROUP BY d.name ORDER BY gross_payout DESC`,
    [month,year]
  );
  return rows;
}

module.exports = { upsert,markSuccess,markFailed,markHold,getYTDTotals,listByRun,listByEmployee,findOne,getRunSummary,getDepartmentBreakdown };
