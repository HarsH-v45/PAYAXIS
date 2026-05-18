// services/pdfService.js
"use strict";
const puppeteer  = require("puppeteer");
const handlebars = require("handlebars");
const fs         = require("fs");
const path       = require("path");
const { getEnv } = require("../config/env");

const TEMPLATE_PATH = path.resolve(__dirname, "../templates/payslip.hbs");
const TEMPLATE = handlebars.compile(fs.readFileSync(TEMPLATE_PATH, "utf8"));

handlebars.registerHelper("currency", v =>
  new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR" }).format(v));
handlebars.registerHelper("monthYear", (m, y) =>
  new Date(y, m - 1).toLocaleString("en-IN", { month:"long", year:"numeric" }));
// BUG FIX #6: Arrow functions don't bind their own `this` — Handlebars needs a regular function
// so opts.fn(this) receives the correct template context
handlebars.registerHelper("ifGt", function(a, b, opts) { return a > b ? opts.fn(this) : opts.inverse(this); });

async function generatePayslipPDF(employee, snapshot, company = {}) {
  const env = getEnv();
  const html = TEMPLATE({
    company: {
      name:    company.name    || env.COMPANY_NAME,
      address: company.address || env.COMPANY_ADDRESS,
      logo:    company.logo    || env.COMPANY_LOGO_URL || "",
    },
    employee: {
      name:        employee.full_name,
      code:        employee.employee_code,
      designation: employee.designation,
      department:  employee.department_name,
      pan:         employee.pan?.replace(/.(?=.{4})/g, "X") || "—",
      uan:         employee.uan || "—",
      bankAccount: employee.account_last4 ? `XXXX${employee.account_last4}` : "—",
      joiningDate: employee.joining_date ? new Date(employee.joining_date).toLocaleDateString("en-IN") : "—",
      taxRegime:   snapshot.regime === "new" ? "New Tax Regime (FY26)" : "Old Tax Regime (FY26)",
      state:       employee.state,
    },
    period:          snapshot.period,
    earnings:        snapshot.earnings,
    deductions:      snapshot.deductions.employee,
    employerContribs:snapshot.deductions.employer,
    grossPay:        snapshot.grossPay,
    netPay:          snapshot.netPay,
    totalDeductions: snapshot.totalDeductions,
    lopDays:         snapshot.lopDays,
    lopDeduction:    snapshot.lopDeduction,
    tds:             snapshot.tds,
    attendance:      snapshot.metadata?.attendance || {},
    generatedAt:     new Date().toLocaleString("en-IN", { timeZone:"Asia/Kolkata" }),
  });

  let browser;
  try {
    const launchOpts = { headless:"new", args:["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--disable-gpu"] };
    if (env.PUPPETEER_EXECUTABLE_PATH) launchOpts.executablePath = env.PUPPETEER_EXECUTABLE_PATH;
    browser = await puppeteer.launch(launchOpts);
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil:"networkidle0" });
    const buffer = await page.pdf({ format:"A4", printBackground:true, margin:{ top:"12mm", bottom:"12mm", left:"12mm", right:"12mm" } });
    return buffer;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

module.exports = { generatePayslipPDF };
