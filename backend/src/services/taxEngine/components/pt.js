"use strict";
const PT_SLABS = {
  KA: [{ upTo:14999,rate:0 },{ upTo:29999,rate:150 },{ upTo:Infinity,rate:200 }],
  MH: [{ upTo:7499,rate:0 },{ upTo:9999,rate:175 },{ upTo:Infinity,rate:200 }],
  WB: [{ upTo:8500,rate:0 },{ upTo:10000,rate:90 },{ upTo:15000,rate:110 },{ upTo:25000,rate:130 },{ upTo:40000,rate:150 },{ upTo:Infinity,rate:200 }],
  AP: [{ upTo:14999,rate:0 },{ upTo:19999,rate:150 },{ upTo:Infinity,rate:200 }],
  TS: [{ upTo:14999,rate:0 },{ upTo:19999,rate:150 },{ upTo:Infinity,rate:200 }],
  GJ: [{ upTo:5999,rate:0 },{ upTo:8999,rate:80 },{ upTo:11999,rate:150 },{ upTo:Infinity,rate:200 }],
  TN: [{ upTo:Infinity,rate:0 }],
  DL: [{ upTo:Infinity,rate:0 }],
};

function calculatePT(grossPay, state = "KA", month = 1) {
  const slabs = PT_SLABS[state.toUpperCase()];
  if (!slabs) return { state, amount: 0 };
  if (state === "MH" && month === 2 && grossPay > 10000) return { state, amount: 300 };
  for (const s of slabs) { if (grossPay <= s.upTo) return { state, amount: s.rate }; }
  return { state, amount: 0 };
}
module.exports = { calculatePT };
