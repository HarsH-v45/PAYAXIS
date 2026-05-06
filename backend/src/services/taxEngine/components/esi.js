"use strict";
const { roundTo } = require("../utils");
const ESI_CEILING = 21000;
const EMP_RATE    = 0.0075;
const ER_RATE     = 0.0325;

function calculateESI(grossPay) {
  if (grossPay > ESI_CEILING) return { applicable: false, employee: 0, employer: 0 };
  return {
    applicable: true,
    employee:   roundTo(grossPay * EMP_RATE, 2),
    employer:   roundTo(grossPay * ER_RATE,  2),
  };
}
module.exports = { calculateESI };
