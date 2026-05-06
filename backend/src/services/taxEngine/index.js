"use strict";
const { calculatePF }  = require("./components/pf");
const { calculateESI } = require("./components/esi");
const { calculatePT }  = require("./components/pt");
const { calculateTDS } = require("./components/tds");
const { roundTo, monthlyAmount } = require("./utils");

const PF_WAGE_CAP = 15000;

async function calculate({ employee, salaryStructure, attendance, month, year, ytdTaxablePay = 0, ytdTDSDeducted = 0 }) {
  const regime = employee.tax_regime || "new";
  const { totalDays, presentDays, lopDays = 0 } = attendance;
  const lopFactor = lopDays > 0 ? (totalDays - lopDays) / totalDays : 1;

  // Build earnings
  const monthly = monthlyAmount(salaryStructure.annual_ctc);
  const basic   = roundTo(salaryStructure.basic_percent * monthly, 2);
  let assigned  = 0;


const earnings = [];

// ✅ Use full monthly salary directly
earnings.push({
  code: "BASE",
  label: "Base Salary",
  amount: roundTo(monthly * lopFactor, 2),
  taxable: true,
  pf: true
});

  const grossPay    = roundTo(earnings.reduce((s, e) => s + e.amount, 0), 2);
  const lopDeduct   = roundTo(monthly - grossPay, 2);
  const pfWages     = Math.min(earnings.filter(e => e.pf).reduce((s, e) => s + e.amount, 0), PF_WAGE_CAP);
  const taxableEarn = earnings.filter(e => e.taxable).reduce((s, e) => s + e.amount, 0);

  const pf  = calculatePF(pfWages);
  const esi = calculateESI(grossPay);
  const pt  = calculatePT(grossPay, employee.state || "KA", month);
  const tds = calculateTDS({ regime, employee, monthlyTaxable: taxableEarn, ytdTaxablePay, ytdTDSDeducted, month, year, pfEmployee: pf.employee, declarations: employee.investment_decl || {} });

  const employeeDeductions = [
    { code:"PF_EMP",  label:"Provident Fund (Employee)", amount: pf.employee  },
    { code:"ESI_EMP", label:"ESI (Employee)",            amount: esi.employee },
    { code:"PT",      label:"Professional Tax",          amount: pt.amount    },
    { code:"TDS",     label:"Tax Deducted at Source",    amount: tds.monthlyTDS },
  ].filter(d => d.amount > 0);

  const employerContribs = [
    { code:"PF_ER",  label:"Provident Fund (Employer)", amount: pf.employer  },
    { code:"ESI_ER", label:"ESI (Employer)",            amount: esi.employer },
  ].filter(d => d.amount > 0);

  const totalDeductions = employeeDeductions.reduce((s, d) => s + d.amount, 0);
  const netPay = roundTo(grossPay - totalDeductions, 2);

  return {
    period: { month, year }, regime, lopDays, lopDeduction: lopDeduct,
    earnings, grossPay,
    deductions: { employee: employeeDeductions, employer: employerContribs },
    totalDeductions, netPay, tds,
    metadata: { pfWages, esiApplicable: esi.applicable, calculatedAt: new Date().toISOString() },
  };
}

module.exports = { calculate };
