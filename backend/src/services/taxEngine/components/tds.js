"use strict";
const { roundTo } = require("../utils");

const NEW_SLABS = [
  { upTo:300000,rate:0 },{ upTo:700000,rate:0.05 },{ upTo:1000000,rate:0.10 },
  { upTo:1200000,rate:0.15 },{ upTo:1500000,rate:0.20 },{ upTo:Infinity,rate:0.30 },
];
const OLD_SLABS = [
  { upTo:250000,rate:0 },{ upTo:500000,rate:0.05 },
  { upTo:1000000,rate:0.20 },{ upTo:Infinity,rate:0.30 },
];
const STD_NEW = 75000, STD_OLD = 50000, CESS = 0.04;

function applySlabs(income, slabs) {
  let tax = 0, prev = 0;
  for (const s of slabs) {
    if (income <= prev) break;
    tax += (Math.min(income, s.upTo) - prev) * s.rate;
    prev = s.upTo;
  }
  return roundTo(tax, 2);
}

function getFiscalMonth(m) { return m >= 4 ? m - 3 : m + 9; }

function calculateTDS({ regime = "new", employee, monthlyTaxable, ytdTaxablePay = 0, ytdTDSDeducted = 0, month, year, pfEmployee = 0, declarations = {} }) {
  const fMonth = getFiscalMonth(month);
  const remaining = 12 - fMonth + 1;
  const projectedAnnualGross = ytdTaxablePay + monthlyTaxable * remaining;

  let totalDeductions = regime === "new" ? STD_NEW : STD_OLD;
  if (regime === "old") {
    const s80C = Math.min((declarations.ppf||0)+(declarations.elss||0)+(declarations.lifeInsurance||0)+(declarations.nsc||0)+(declarations.homeLoanPrincipal||0)+(declarations.tuitionFees||0)+pfEmployee*12, 150000);
    const s80D = Math.min((declarations.healthInsurance||0), 25000);
    const nps  = Math.min((declarations.nps||0), 50000);
    const hraExempt = computeHRA(employee, declarations);
    totalDeductions += s80C + s80D + nps + hraExempt;
  }

  const taxableIncome = Math.max(0, projectedAnnualGross - totalDeductions);
  const slabs = regime === "new" ? NEW_SLABS : OLD_SLABS;
  let rawTax = applySlabs(taxableIncome, slabs);

  // Rebate 87A
  if (regime === "new" && taxableIncome <= 1200000) rawTax = Math.max(0, rawTax - Math.min(rawTax, 60000));
  else if (regime === "old" && taxableIncome <= 500000) rawTax = Math.max(0, rawTax - Math.min(rawTax, 12500));

  const cess = roundTo(rawTax * CESS, 2);
  const projectedAnnualTax = roundTo(rawTax + cess, 2);
  const monthlyTDS = roundTo(Math.max(0, projectedAnnualTax - ytdTDSDeducted) / remaining, 2);

  return {
    projectedAnnualGross: roundTo(projectedAnnualGross, 2),
    taxableIncome: roundTo(taxableIncome, 2),
    projectedAnnualTax, monthlyTDS,
    effectiveRate: projectedAnnualGross > 0 ? roundTo(projectedAnnualTax / projectedAnnualGross * 100, 2) : 0,
  };
}

function computeHRA(employee, declarations) {
  const annualHRA    = (employee.monthly_hra || 0) * 12;
  const annualBasic  = (employee.monthly_basic || 0) * 12;
  const annualRent   = (declarations.rentPaid || 0) * 12;
  if (!annualRent) return 0;
  return Math.max(0, Math.min(annualHRA, annualRent - annualBasic * 0.1, annualBasic * (employee.is_metro_city ? 0.5 : 0.4)));
}

module.exports = { calculateTDS };
