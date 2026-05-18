"use strict";
const db = require("../config/db");

async function findById(id) {
  const { rows } = await db.query(
    `SELECT e.*,d.name AS department_name,ss.annual_ctc,ss.basic_percent,ss.components,ss.monthly_basic,ss.monthly_hra,bd.bank_name,bd.ifsc_code,SUBSTRING(bd.account_number,LENGTH(bd.account_number)-3) AS account_last4,inv.declarations AS investment_decl
     FROM employees e LEFT JOIN departments d ON d.id=e.department_id LEFT JOIN salary_structures ss ON ss.employee_id=e.id AND ss.is_active=TRUE LEFT JOIN bank_details bd ON bd.employee_id=e.id LEFT JOIN investment_declarations inv ON inv.employee_id=e.id AND inv.fiscal_year=EXTRACT(YEAR FROM NOW()) WHERE e.id=$1`,
    [id]
  );
  return rows[0]||null;
}

async function findActiveIds() {
  const { rows } = await db.query(`SELECT e.id FROM employees e JOIN salary_structures ss ON ss.employee_id=e.id AND ss.is_active=TRUE WHERE e.is_active=TRUE ORDER BY e.employee_code`);
  return rows.map(r => r.id);
}

async function getNextCode() {
  const { rows } = await db.query(`SELECT employee_code FROM employees ORDER BY created_at DESC LIMIT 1`);
  if (!rows[0]) return "PAX-0001";
  const last = parseInt(rows[0].employee_code.split("-")[1], 10);
  return `PAX-${String(last+1).padStart(4,"0")}`;
}

module.exports = { findById, findActiveIds, getNextCode };
