"use strict";
const { calculatePF }  = require("./components/pf");
const { calculateESI } = require("./components/esi");
const { calculatePT }  = require("./components/pt");
const { calculateTDS } = require("./components/tds");
const { roundTo, monthlyAmount } = require("./utils");

const PF_WAGE_CAP = 15000;

async function calculate({ employee, salaryStructure, attendance, month, year, ytdTaxablePay = 0, ytdTDSDeducted = 0 }) {
  const regime = employee.tax_regime || "new";
  const { totalDays, lopDays = 0 } = attendance;
  const lopFactor = lopDays > 0 ? (totalDays - lopDays) / totalDays : 1;

  const monthly = monthlyAmount(salaryStructure.annual_ctc);
  const basic   = roundTo((salaryStructure.basic_percent || 0.40) * monthly, 2);

  // ─── Normalise components ────────────────────────────────────────────────────
  // BUG FIX A: Support both array form (new) and legacy plain-object form.
  let componentsArray = Array.isArray(salaryStructure.components)
    ? salaryStructure.components
    : Object.entries(salaryStructure.components || {}).map(([key, value]) => ({
        code: key, type: "fixed", monthly: value,
        label: key, taxable: true, pf: false,
      }));

  // BUG FIX B: If no BASIC component exists (e.g. legacy data or object form), inject it
  // so that gross pay, PF wages, and taxable earnings are correct.
  const hasBasic = componentsArray.some(c => c.code === "BASIC");
  if (!hasBasic) {
    componentsArray = [
      { code: "BASIC", label: "Basic Salary", type: "percent_of_ctc",
        rate: salaryStructure.basic_percent || 0.40, taxable: true, pf: true },
      ...componentsArray,
    ];
    // If monthly_hra is stored (from salary revision) and no HRA component, inject that too
    const hasHRA = componentsArray.some(c => c.code === "HRA");
    if (!hasHRA && salaryStructure.monthly_hra > 0) {
      componentsArray.splice(1, 0, {
        code: "HRA", label: "House Rent Allowance", type: "fixed",
        monthly: salaryStructure.monthly_hra, taxable: true, pf: false,
      });
    }
  }

  // ─── Build earnings ──────────────────────────────────────────────────────────
  // BUG FIX C: `assigned` must be tracked correctly so `remainder` type knows
  // how much of monthly CTC has already been allocated (including basic).
  // We run the loop with the full array; percent_of_ctc type is now supported.
  let assigned = 0;

  const earnings = componentsArray.map(c => {
    let amount = 0;

    if      (c.type === "fixed")            amount = c.monthly || 0;
    else if (c.type === "percent_of_basic") amount = roundTo(c.rate * basic, 2);
    else if (c.type === "percent_of_ctc")   amount = roundTo(c.rate * monthly, 2); // BUG FIX D: new type
    else if (c.type === "remainder")        amount = roundTo(monthly - assigned, 2);

    amount = roundTo(amount * lopFactor, 2);
    assigned += amount; // accumulate so remainder is computed correctly

    return {
      code:    c.code,
      label:   c.label,
      amount,
      taxable: c.taxable ?? true,
      pf:      c.pf      ?? false,
    };
  });

  const grossPay    = roundTo(earnings.reduce((s, e) => s + e.amount, 0), 2);
  const lopDeduct   = roundTo(monthly - grossPay, 2);
  // BUG FIX E: pfWages now correctly includes BASIC (pf:true) so PF is non-zero
  const pfWages     = Math.min(earnings.filter(e => e.pf).reduce((s, e) => s + e.amount, 0), PF_WAGE_CAP);
  const taxableEarn = earnings.filter(e => e.taxable).reduce((s, e) => s + e.amount, 0);

  const pf  = calculatePF(pfWages);
  const esi = calculateESI(grossPay);
  const pt  = calculatePT(grossPay, employee.state || "KA", month);
  const tds = calculateTDS({
    regime, employee,
    monthlyTaxable: taxableEarn,
    ytdTaxablePay, ytdTDSDeducted,
    month, year,
    pfEmployee:   pf.employee,
    declarations: employee.investment_decl || {},
  });

  const employeeDeductions = [
    { code: "PF_EMP",  label: "Provident Fund (Employee)", amount: pf.employee   },
    { code: "ESI_EMP", label: "ESI (Employee)",            amount: esi.employee  },
    { code: "PT",      label: "Professional Tax",          amount: pt.amount     },
    { code: "TDS",     label: "Tax Deducted at Source",    amount: tds.monthlyTDS },
  ].filter(d => d.amount > 0);

  const employerContribs = [
    { code: "PF_ER",  label: "Provident Fund (Employer)", amount: pf.employer  },
    { code: "ESI_ER", label: "ESI (Employer)",            amount: esi.employer },
  ].filter(d => d.amount > 0);

  const totalDeductions = employeeDeductions.reduce((s, d) => s + d.amount, 0);
  const netPay = roundTo(grossPay - totalDeductions, 2);

  return {
    period: { month, year }, regime, lopDays, lopDeduction: lopDeduct,
    earnings, grossPay,
    deductions:      { employee: employeeDeductions, employer: employerContribs },
    totalDeductions, netPay, tds,
    metadata: {
      pfWages, esiApplicable: esi.applicable,
      calculatedAt: new Date().toISOString(),
      attendance: { totalDays, lopDays, presentDays: totalDays - lopDays },
    },
  };
}

module.exports = { calculate };
