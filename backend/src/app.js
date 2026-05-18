"use strict";
const express     = require("express");
const cors        = require("cors");
const helmet      = require("helmet");
const morgan      = require("morgan");
const compression = require("compression");
const rateLimit   = require("express-rate-limit");
const bcrypt      = require("bcrypt");
const path        = require("path");
const { getEnv }  = require("./config/env");
const db          = require("./config/db");
const { authenticate, issueTokens, verifyRefresh } = require("./api/middlewares/auth.middleware");
const { requirePermission, requireSelfOrPermission } = require("./api/middlewares/rbac.middleware");
const { enqueueMonthlyPayroll, enqueueSinglePayroll, getQueueMetrics } = require("./queues/payrollQueue");
const PayrollRecord   = require("./models/payrollRecord.model");
const { logAsync }    = require("./services/auditService");
const storageService  = require("./services/storageService");
const reportsRoutes = require("./api/routes/reports.routes");


const app = express();
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// BUG FIX #7: Patch Express Router to auto-catch async errors in Express 4
const Layer = require("express/lib/router/layer");
const origHandle = Layer.prototype.handle_request;
Layer.prototype.handle_request = function(req, res, next) {
  const fn = this.handle;
  if (fn && fn.length <= 3) {
    const result = origHandle.call(this, req, res, next);
    if (result && typeof result.catch === "function") result.catch(next);
    return result;
  }
  return origHandle.call(this, req, res, next);
};

const env = getEnv();
const axios = require("axios");

// ── Global middleware ────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy:false, crossOriginEmbedderPolicy:false }));
app.use(cors({ origin:  [
    "http://localhost:5173",
    "https://payaxis-azure.vercel.app",
    "https://payaxis-git-master-harsh-v45s-projects.vercel.app"
  ], credentials:true }));
app.use(compression());
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit:"2mb" }));
app.use(express.urlencoded({ extended:true }));
app.use("/static", express.static(path.resolve(process.cwd(), env.LOCAL_STORAGE_PATH)));
app.use("/api/auth", rateLimit({ windowMs:15*60*1000, max:20 }));
app.use("/api",      rateLimit({ windowMs:60*1000,    max:200 }));
app.use("/api/reports", reportsRoutes);

// ── Health ───────────────────────────────────────────────────────
app.get("/health", async (_req, res) => {
  try { await db.query("SELECT 1"); res.json({ status:"ok", db:"connected", ts:new Date().toISOString() }); }
  catch { res.status(503).json({ status:"degraded" }); }
});

// ════════════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════════════
const authRouter = express.Router();

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;

  console.log("EMAIL:", email);
  console.log("PASSWORD:", password);

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password required"
    });
  }

  const { rows } = await db.query(
    `SELECT 
      u.id,
      u.password_hash,
      u.role,
      u.is_active,
      e.id AS employee_id,
      e.full_name,
      e.email,
      e.employee_code
     FROM users u
     LEFT JOIN employees e ON e.user_id = u.id
     WHERE u.email = $1`,
    [email.toLowerCase().trim()]
  );

  console.log("ROWS:", rows);

  const user = rows[0];

  if (!user || !user.is_active) {
    console.log("❌ USER NOT FOUND");
    return res.status(401).json({
      success: false,
      message: "Invalid credentials"
    });
  }

  console.log("HASH FROM DB:", user.password_hash);

  const valid = await bcrypt.compare(
    password,
    user.password_hash
  );

  console.log("PASSWORD MATCH:", valid);

  if (!valid) {
    console.log("❌ PASSWORD INVALID");
    return res.status(401).json({
      success: false,
      message: "Invalid credentials"
    });
  }

  const tokens = issueTokens({
    id: user.id,
    employeeId: user.employee_id,
    role: user.role,
    email: user.email,
    name: user.full_name
  });

  console.log("✅ LOGIN SUCCESS");

  res.json({
    success: true,
    data: {
      ...tokens,
      user: {
        id: user.employee_id,
        name: user.full_name,
        email: user.email,
        role: user.role,
        code: user.employee_code
      }
    }
  });
});

authRouter.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ success:false, message:"Refresh token required" });
  try {
    const payload = verifyRefresh(refreshToken);
  const { rows } = await db.query(
      `SELECT u.id,u.role,u.is_active,
       e.id AS employee_id,e.full_name,e.email
       FROM users u
       LEFT JOIN employees e ON e.user_id=u.id
       WHERE u.id=$1`,
      [payload.sub]
    );
    if (!rows[0]?.is_active) throw new Error("Inactive");
    const tokens = issueTokens({ id:rows[0].id, employeeId:rows[0].employee_id, role:rows[0].role, email:rows[0].email, name:rows[0].full_name });
    res.json({ success:true, data:tokens });
  } catch { res.status(401).json({ success:false, message:"Invalid refresh token" }); }
});

authRouter.post("/logout", authenticate, (req, res) => {
  logAsync({ action:"USER_LOGOUT", entityType:"User", entityId:req.user.id, actorId:req.user.employeeId, actorRole:req.user.role, actorIp:req.ip });
  res.json({ success:true });
});

app.use("/api/auth", authRouter);

// ════════════════════════════════════════════════════════════════
// EMPLOYEES
// ════════════════════════════════════════════════════════════════
const empRouter = express.Router();
empRouter.use(authenticate);

empRouter.get("/", requirePermission("employee:view_all"), async (req, res) => {
  const { page=1, limit=50, search, active="true" } = req.query;
  const params = [active === "true"]; const extra = [];
  if (search) { params.push(`%${search}%`); extra.push(`(e.full_name ILIKE $${params.length} OR e.employee_code ILIKE $${params.length} OR e.email ILIKE $${params.length})`); }
  const where = extra.length ? ` AND ${extra.join(" AND ")}` : "";
  const { rows } = await db.query(
    `SELECT e.id,e.employee_code,e.full_name,e.email,e.designation,e.joining_date,e.employment_type,e.tax_regime,e.is_active,d.name AS department,ss.annual_ctc FROM employees e LEFT JOIN departments d ON d.id=e.department_id LEFT JOIN salary_structures ss ON ss.employee_id=e.id AND ss.is_active=TRUE WHERE e.is_active=$1${where} ORDER BY e.employee_code LIMIT $${params.length+1} OFFSET $${params.length+2}`,
    [...params, +limit, (+page-1)*(+limit)]
  );
  res.json({ success:true, data:rows, meta:{ page:+page, limit:+limit } });
});

empRouter.get("/:id", requireSelfOrPermission("id","employee:view_all"), async (req, res) => {
  const { rows } = await db.query(
    `SELECT e.*,d.name AS department,ss.annual_ctc,ss.basic_percent,ss.components FROM employees e LEFT JOIN departments d ON d.id=e.department_id LEFT JOIN salary_structures ss ON ss.employee_id=e.id AND ss.is_active=TRUE WHERE e.id=$1`, [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ success:false, message:"Not found" });
  res.json({ success:true, data:rows[0] });
});

empRouter.post("/", requirePermission("employee:create"), async (req, res) => {
  const { fullName, email, employeeCode, designation, departmentId, joiningDate, taxRegime="new", state="KA", employmentType="FULL_TIME" } = req.body;
  const employee_code = employeeCode || `EMP${Date.now()}`;
  const { rows } = await db.query(
    `INSERT INTO employees (full_name,email,employee_code,designation,department_id,joining_date,tax_regime,state,employment_type,is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE) RETURNING id`,
    [fullName,email,employee_code,designation,departmentId,joiningDate,taxRegime,state,employmentType]
  );
  logAsync({ action:"EMPLOYEE_CREATED", entityType:"Employee", entityId:rows[0].id, actorId:req.user.employeeId, actorRole:req.user.role, description:`Created ${fullName}` });
  res.status(201).json({ success:true, data:{ id:rows[0].id } });
});

empRouter.patch("/:id", requirePermission("employee:update"), async (req, res) => {
  const allowed = ["designation","department_id","tax_regime","state","is_metro_city","phone"];
  const fields = Object.entries(req.body).filter(([k]) => allowed.includes(k));
  if (!fields.length) return res.status(400).json({ success:false, message:"No valid fields" });
  const sets = fields.map(([k],i) => `${k}=$${i+2}`).join(",");
  await db.query(`UPDATE employees SET ${sets},updated_at=NOW() WHERE id=$1`, [req.params.id, ...fields.map(([,v])=>v)]);
  res.json({ success:true });
});

empRouter.post("/:id/salary-revision", requirePermission("salary:revise"), async (req, res) => {
  // BUG FIX J: Accept both basic_percent (frontend) and basicPercent (legacy); store monthly_basic/monthly_hra
  const {
    annual_ctc,
    basic_percent, basicPercent,          // BUG FIX J: was only basicPercent, frontend sends basic_percent
    components,
    monthly_hra = 0,
    effectiveFrom,
    reason,
  } = req.body;

  const resolvedBasicPct = basic_percent ?? basicPercent ?? 0.40;
  const monthly          = Math.round((annual_ctc / 12) * 100) / 100;
  const monthly_basic    = Math.round(resolvedBasicPct * monthly * 100) / 100;

  if (!annual_ctc || annual_ctc <= 0) {
    return res.status(400).json({ success:false, message:"annual_ctc must be a positive number" });
  }

  const { rows } = await db.withTransaction(async (client) => {
    await client.query(
      `UPDATE salary_structures SET is_active=FALSE WHERE employee_id=$1 AND is_active=TRUE`,
      [req.params.id]
    );
    const result = await client.query(
      `INSERT INTO salary_structures
         (employee_id, annual_ctc, basic_percent, components, monthly_basic, monthly_hra,
          effective_from, is_active, revised_by, revision_reason)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, TRUE, $7, $8)
       RETURNING id`,
      [
        req.params.id,
        annual_ctc,
        resolvedBasicPct,
        JSON.stringify(components),
        monthly_basic,              // BUG FIX J: now stored so HRA exemption in TDS works
        monthly_hra || 0,           // BUG FIX J: now stored
        req.user.employeeId,
        reason || null,
      ]
    );
    return result;
  });
  logAsync({ action:"SALARY_REVISED", entityType:"SalaryStructure", entityId:rows[0].id, actorId:req.user.employeeId, actorRole:req.user.role, description:`Salary revised for ${req.params.id} to ₹${annual_ctc}` });
  res.status(201).json({ success:true, data:{ id:rows[0].id } });
});

app.use("/api/employees", empRouter);

// ════════════════════════════════════════════════════════════════
// PAYROLL
// ════════════════════════════════════════════════════════════════
const payRouter = express.Router();
payRouter.use(authenticate);

payRouter.post("/runs", requirePermission("payroll:run"), async (req, res) => {
  const { month, year } = req.body;
  if (!month || !year) return res.status(400).json({ success:false, message:"month and year required" });
  const { runId, jobCount } = await enqueueMonthlyPayroll({ month:+month, year:+year, initiatedBy:req.user.employeeId, runType:"MANUAL" });
  logAsync({ action:"PAYROLL_RUN_INITIATED", entityType:"PayrollRun", entityId:runId, actorId:req.user.employeeId, actorRole:req.user.role, description:`Manual run for ${month}/${year} — ${jobCount} employees` });
  res.json({ success:true, data:{ runId, jobCount } });
});

payRouter.get("/runs", requirePermission("payroll:view_all"), async (_req, res) => {
const { rows } = await db.query(`
  SELECT 
    r.id,
    r.month,
    r.year,
    r.run_type,
    r.status,
    r.total_employees,
    r.initiated_at,

    e.full_name AS initiated_by_name,

    -- ✅ IMPORTANT: cast to integer
    COUNT(pr.id) FILTER (WHERE pr.status = 'SUCCESS')::int AS processed_count,
    COUNT(pr.id) FILTER (WHERE pr.status = 'FAILED')::int AS failed_count

  FROM payroll_runs r
  LEFT JOIN employees e ON e.id = r.initiated_by
  LEFT JOIN payroll_records pr ON pr.run_id = r.id

  GROUP BY r.id, e.full_name
  ORDER BY r.initiated_at DESC
`);
res.json({ success:true, data:rows });
});

payRouter.get("/runs/:runId", requirePermission("payroll:view_all"), async (req, res) => {
  const { page, status, limit } = req.query;
  const [summary, records] = await Promise.all([
    PayrollRecord.getRunSummary(req.params.runId),
    PayrollRecord.listByRun(req.params.runId, { page:+(page||1), status, limit:+(limit||50) }),
  ]);
  res.json({ success:true, data:{ summary, ...records } });
});

payRouter.get("/queue/metrics", requirePermission("payroll:view_all"), async (_req, res) => {
  res.json({ success:true, data: await getQueueMetrics() });
});

payRouter.post("/retry", requirePermission("payroll:retry"), async (req, res) => {
  const { employeeId, month, year } = req.body;
  const result = await enqueueSinglePayroll({ employeeId, month, year, initiatedBy:req.user.employeeId });
  res.json({ success:true, data:result });
});

payRouter.patch("/records/:id/hold", requirePermission("payroll:hold"), async (req, res) => {
  await PayrollRecord.markHold(req.params.id, { reason:req.body.reason, heldBy:req.user.employeeId });
  res.json({ success:true });
});

payRouter.get("/reports/department", requirePermission("report:payroll"), async (req, res) => {
  const data = await PayrollRecord.getDepartmentBreakdown(+req.query.month, +req.query.year);
  res.json({ success:true, data });
});

app.use("/api/payroll", payRouter);

// ════════════════════════════════════════════════════════════════
// ESS — Employee Self-Service
// ════════════════════════════════════════════════════════════════
const essRouter = express.Router();
essRouter.use(authenticate);

essRouter.get("/payslips", async (req, res) => {
  const records = await PayrollRecord.listByEmployee(req.user.employeeId);
  res.json({ success:true, data:records });
});

const { generatePayslipPDF } = require("./services/pdfService");
const EmployeeModel = require("./models/employee.model");

essRouter.get("/payslips/:month/:year/download", async (req, res) => {
  try {
    const r = await PayrollRecord.findOne(
      req.user.employeeId,
      +req.params.month,
      +req.params.year
    );

    // BUG FIX #8: Check record exists AND was successfully processed before generating PDF
    if (!r) {
      return res.status(404).json({ success: false, message: "Payslip not found" });
    }
    if (r.status !== "SUCCESS") {
      return res.status(422).json({ success: false, message: `Payslip not ready — current status: ${r.status}` });
    }
    if (!r.snapshot) {
      return res.status(422).json({ success: false, message: "Payslip data is incomplete" });
    }

    const employee = await EmployeeModel.findById(req.user.employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee record not found" });
    }

    const buffer = await generatePayslipPDF(
      employee,
      r.snapshot,
      {}
    );
    console.log("PDF generated, size:", buffer?.length);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Payslip-${req.params.month}-${req.params.year}.pdf"`
    );

    res.send(buffer);

  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ success: false, message: "Download failed" });
  }
});

essRouter.post("/declarations", async (req, res) => {
  const { fiscalYear, ...data } = req.body;
  const allowed = ["ppf","elss","life_insurance","nsc","home_loan_principal","tuition_fees","health_insurance","nps","rent_paid","donations","savings_interest"];
  const fields = Object.entries(data).filter(([k]) => allowed.includes(k));
  if (!fields.length) return res.status(400).json({ success:false, message:"No valid fields" });
  const cols = fields.map(([k])=>k).join(",");
  const vals = fields.map(([,v])=>v);
  const sets = fields.map(([k],i)=>`${k}=$${i+3}`).join(",");
  await db.query(
    `INSERT INTO investment_declarations (employee_id,fiscal_year,${cols}) VALUES ($1,$2,${vals.map((_,i)=>`$${i+3}`).join(",")}) ON CONFLICT (employee_id,fiscal_year) DO UPDATE SET ${sets},status='SUBMITTED',submitted_at=NOW(),updated_at=NOW()`,
    [req.user.employeeId, fiscalYear, ...vals]
  );
  logAsync({ action:"DECLARATION_SUBMITTED", entityType:"InvestmentDeclaration", entityId:`${req.user.employeeId}-${fiscalYear}`, actorId:req.user.employeeId, actorRole:req.user.role });
  res.json({ success:true });
});

essRouter.get("/declarations/:fiscalYear", async (req, res) => {
  const { rows } = await db.query(`SELECT * FROM investment_declarations WHERE employee_id=$1 AND fiscal_year=$2`, [req.user.employeeId, req.params.fiscalYear]);
  res.json({ success:true, data:rows[0]||null });
});

app.use("/api/ess", essRouter);

// ════════════════════════════════════════════════════════════════
// AUDIT LOGS
// ════════════════════════════════════════════════════════════════
const auditRouter = express.Router();
auditRouter.use(authenticate, requirePermission("report:audit"));

auditRouter.get("/", async (req, res) => {
  const { entityType, entityId, actorId, action, from, to, page=1, limit=100 } = req.query;
  const params=[]; const conds=[];
  const add=(v,c)=>{ params.push(v); conds.push(c.replace("?",`$${params.length}`)); };
  if (entityType) add(entityType,"entity_type=?");
  if (entityId)   add(entityId,  "entity_id=?");
  if (actorId)    add(actorId,   "actor_id=?");
  if (action)     add(action,    "action=?");
  if (from)       add(from,      "occurred_at>=?");
  if (to)         add(to,        "occurred_at<=?");
  const where  = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const offset = (+page-1)*(+limit);
  const { rows } = await db.query(
    `SELECT al.*,e.full_name AS actor_name FROM audit_logs al LEFT JOIN employees e ON e.id=al.actor_id::uuid ${where} ORDER BY al.occurred_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
    [...params, +limit, offset]
  );
  res.json({ success:true, data:rows });
});

app.use("/api/audit", auditRouter);

// ── Error handlers ───────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success:false, message:"Route not found" }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status||500).json({ success:false, message: env.NODE_ENV==="production" ? "Internal server error" : err.message });
});

module.exports = app;
