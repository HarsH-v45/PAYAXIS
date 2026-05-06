"use strict";
const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const fs   = require("fs");
const path = require("path");
const { getEnv } = require("../config/env");

const EMAIL_TPL = handlebars.compile(
  fs.readFileSync(path.resolve(__dirname, "../templates/payslipEmail.hbs"), "utf8")
);
const MONTHS = ["","January","February","March","April","May","June","July","August","September","October","November","December"];

let _transporter;
function getTransporter() {
  if (_transporter) return _transporter;
  const env = getEnv();
  if (env.NODE_ENV === "production") {
    _transporter = nodemailer.createTransport({ host:env.SMTP_HOST, port:env.SMTP_PORT, secure:env.SMTP_SECURE==="true", auth:{ user:env.SMTP_USER, pass:env.SMTP_PASS }, pool:true, maxConnections:5 });
  } else {
    _transporter = nodemailer.createTransport({ host:"smtp.ethereal.email", port:587, auth:{ user:env.ETHEREAL_USER, pass:env.ETHEREAL_PASS } });
  }
  return _transporter;
}

async function sendPayslip({ to, employeeName, month, year, netPay, pdfBuffer, filename, payslipUrl }) {
  console.log("📧 Email skipped (dev mode)");
  return "dev-no-email";
}
module.exports = { sendPayslip };
