// middlewares/auth.middleware.js
"use strict";
const jwt = require("jsonwebtoken");
const { getEnv } = require("../../config/env");

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ success:false, message:"No token provided" });
  try {
    const payload = jwt.verify(header.slice(7), getEnv().JWT_SECRET);
    req.user = { id:payload.sub, employeeId:payload.employeeId, role:payload.role, email:payload.email, name:payload.name };
    next();
  } catch(err) {
    const code = err.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "INVALID_TOKEN";
    res.status(401).json({ success:false, message:err.name === "TokenExpiredError" ? "Token expired" : "Invalid token", code });
  }
}

function issueTokens(payload) {
  const env = getEnv();
  return {
    access:  jwt.sign({ sub:payload.id, ...payload }, env.JWT_SECRET,         { expiresIn:"15m", issuer:"payaxis" }),
    refresh: jwt.sign({ sub:payload.id },              env.JWT_REFRESH_SECRET, { expiresIn:"7d",  issuer:"payaxis" }),
  };
}

function verifyRefresh(token) {
  return jwt.verify(token, getEnv().JWT_REFRESH_SECRET);
}

module.exports = { authenticate, issueTokens, verifyRefresh };
