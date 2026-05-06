"use strict";
function roundTo(v, d = 2) {
  const f = Math.pow(10, d);
  return Math.round((v + Number.EPSILON) * f) / f;
}
function monthlyAmount(annual) { return roundTo(annual / 12, 2); }
function annualize(monthly)    { return roundTo(monthly * 12, 2); }

const ONES = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
const TENS = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
function toWords(n) {
  n = Math.floor(n);
  if (n === 0) return "Zero";
  let r = "";
  if (n >= 10000000) { r += toWords(Math.floor(n/10000000)) + " Crore "; n %= 10000000; }
  if (n >= 100000)   { r += toWords(Math.floor(n/100000))   + " Lakh ";  n %= 100000;   }
  if (n >= 1000)     { r += toWords(Math.floor(n/1000))     + " Thousand "; n %= 1000;   }
  if (n >= 100)      { r += ONES[Math.floor(n/100)]         + " Hundred "; n %= 100;     }
  if (n >= 20)       { r += TENS[Math.floor(n/10)] + " "; n %= 10; }
  if (n > 0)         { r += ONES[n] + " "; }
  return r.trim() + " Only";
}
module.exports = { roundTo, monthlyAmount, annualize, toWords };
