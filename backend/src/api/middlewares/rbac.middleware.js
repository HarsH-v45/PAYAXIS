// middlewares/rbac.middleware.js
"use strict";
const LEVELS = { SUPER_ADMIN:50, ADMIN:40, HR_MANAGER:30, FINANCE:20, EMPLOYEE:10 };
const PERMS  = {
  "payroll:run":30,"payroll:view_all":30,"payroll:hold":40,"payroll:retry":30,
  "employee:create":30,"employee:update":30,"employee:deactivate":40,"employee:view_all":30,
  "salary:revise":40,"report:payroll":20,"report:audit":40,"declaration:approve":30,
};

function requirePermission(perm) {
  return (req, res, next) => {
    const level    = LEVELS[req.user?.role] || 0;
    const required = PERMS[perm]            || 999;
    if (level < required) return res.status(403).json({ success:false, message:`Permission '${perm}' required`, code:"INSUFFICIENT_PERMISSIONS" });
    next();
  };
}

function requireSelfOrPermission(paramName, perm) {
  return (req, res, next) => {
    const isSelf  = req.user.employeeId === req.params[paramName];
    const level   = LEVELS[req.user?.role] || 0;
    const required= PERMS[perm]            || 999;
    if (isSelf || level >= required) return next();
    res.status(403).json({ success:false, message:"Access denied", code:"NOT_OWNER" });
  };
}

module.exports = { requirePermission, requireSelfOrPermission };
