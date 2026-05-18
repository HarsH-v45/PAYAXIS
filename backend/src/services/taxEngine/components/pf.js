"use strict";
const { roundTo } = require("../utils");
const PF_RATE   = 0.12;
const EPS_RATE  = 0.0833;
const EPS_CAP   = 15000;
const EDLI_RATE = 0.005;
const ADMIN_RATE= 0.002;

function calculatePF(pfWages) {
  const employee   = roundTo(pfWages * PF_RATE, 2);
  const eps        = roundTo(Math.min(pfWages, EPS_CAP) * EPS_RATE, 2);
  const epfEr      = roundTo(pfWages * PF_RATE - eps, 2);
  const edli       = roundTo(pfWages * EDLI_RATE, 2);
  const admin      = Math.max(roundTo(pfWages * ADMIN_RATE, 2), 75);
  const employer   = roundTo(eps + epfEr, 2);
  return { employee, employer, eps, epfEr, edli, admin, pfWages };
}
module.exports = { calculatePF };
