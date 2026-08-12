# PayAxis — HRMS & Automated Payroll Platform

## Quick Start (Docker)

```bash
git clone <repo>
cd payaxis
cp .env.example .env         
docker compose up -d
```

Access at:
- **App**: http://localhost (port 80)
- **API**: http://localhost:4000


---

## Local Development

```bash777
# Backend
cd backend && npm install
cp ../.env.example .env       # edit values
npm run dev                    # API on :4000

# Worker (separate terminal)
npm run worker

# Frontend
cd frontend && npm install
npm run dev                    # UI on :5173
```

---

## Project Structure

```
payaxis/
├── backend/
│   ├── src/
│   │   ├── config/            db.js  redis.js  env.js
│   │   ├── queues/            payrollQueue.js
│   │   ├── workers/           payrollWorker.js  workerRegistry.js
│   │   ├── services/
│   │   │   ├── taxEngine/     index.js  utils.js  components/(pf/esi/pt/tds)
│   │   │   ├── pdfService.js
│   │   │   ├── emailService.js
│   │   │   ├── storageService.js
│   │   │   ├── auditService.js
│   │   │   └── attendanceService.js
│   │   ├── schedulers/        payrollCron.js
│   │   ├── templates/         payslip.hbs  payslipEmail.hbs
│   │   ├── api/middlewares/   auth  rbac
│   │   ├── models/            payrollRecord  employee
│   │   └── app.js             (all routes)
│   ├── migrations/            001_schema.sql
│   ├── server.js              API entry
│   ├── worker.js              Worker entry
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/client.js
│   │   ├── store/stores.js    (auth, payroll, employee)
│   │   ├── components/        AdminLayout
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── admin/         Dashboard  PayrollRuns  Employees  Reports  AuditLogs
│   │       └── ess/           ESSPortal
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
├── ecosystem.config.js        (PM2)
└── .env.example
```

---

## Architecture

```
node-cron (1st of month, 2AM IST)
    │
    └─▶ payrollQueue (BullMQ/Redis)
              │
              └─▶ payrollWorker × 4 concurrent
                      1. Tax Engine (PF/ESI/PT/TDS)
                      2. Puppeteer PDF
                      3. S3/Local upload
                      4. Nodemailer email
                      5. DB → SUCCESS
```

## Tax Engine

- **PF**: 12% employee + 12% employer (EPS 8.33% + EPF diff), capped at ₹15,000 wages
- **ESI**: 0.75% employee + 3.25% employer (only if gross ≤ ₹21,000)
- **PT**: 8 states configured (KA, MH, WB, AP, TS, GJ, TN, DL)
- **TDS**: Spread-and-true-up projection; New Regime (FY26 Budget slabs) & Old Regime with all 80C/D/HRA deductions

## RBAC Roles

| Role | Admin | Payroll Run | Salary Revise | Audit |
|---|---|---|---|---|
| SUPER_ADMIN | ✓ | ✓ | ✓ | ✓ |
| ADMIN | ✓ | ✓ | ✓ | ✓ |
| HR_MANAGER | ✓ | ✓ | ✗ | ✗ |
| FINANCE | Reports | ✗ | ✗ | ✗ |
| EMPLOYEE | ESS only | ✗ | ✗ | ✗ |

## PM2 Production

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save && pm2 startup
pm2 logs / pm2 monit
```

## API Endpoints

| Method | Path | Role | Description |
|---|---|---|---|
| POST | /api/auth/login | Public | Login |
| GET | /api/employees | HR_MANAGER+ | List employees |
| POST | /api/employees | HR_MANAGER+ | Create employee |
| POST | /api/payroll/runs | HR_MANAGER+ | Trigger run |
| GET | /api/payroll/runs | HR_MANAGER+ | List runs |
| GET | /api/payroll/queue/metrics | HR_MANAGER+ | Queue stats |
| POST | /api/payroll/retry | HR_MANAGER+ | Retry failed |
| GET | /api/ess/payslips | Employee | My payslips |
| POST | /api/ess/declarations | Employee | Submit declaration |
| GET | /api/audit | ADMIN+ | Audit logs |



