"use strict";
const db = require("../config/db");

async function getMonthSummary(employeeId, month, year) {
  const { rows } = await db.query(
    `SELECT present_days, lop_days, total_days FROM attendance_monthly_summary WHERE employee_id=$1 AND month=$2 AND year=$3`,
    [employeeId, month, year]
  );
  if (rows[0]) return { presentDays: +rows[0].present_days, lopDays: +rows[0].lop_days, totalDays: +rows[0].total_days };
  const daysInMonth = new Date(year, month, 0).getDate();
  return { presentDays: daysInMonth, lopDays: 0, totalDays: daysInMonth };
}

async function getCalendar(employeeId, month, year) {
  const { rows } = await db.query(
    `SELECT date, status, check_in, check_out, work_hours FROM attendance WHERE employee_id=$1 AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3 ORDER BY date`,
    [employeeId, month, year]
  );
  return rows;
}

module.exports = { getMonthSummary, getCalendar };
