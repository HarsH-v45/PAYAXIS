# PayAxis — HRMS & Automated Payroll Platform

A full-stack payroll and HR management platform designed to automate employee management, salary processing, statutory deductions, payslip generation, and payroll workflows.

## 🚀 Tech Stack

**Frontend:** React
**Backend:** Node.js, Express
**Database:** PostgreSQL
**Queue & Background Jobs:** Redis, BullMQ, Node-cron
**PDF Generation:** Puppeteer
**Authentication & Authorization:** JWT, RBAC
**Email:** Nodemailer
**Deployment & Process Management:** Docker, PM2

## ✨ Key Features

* Employee management
* Automated payroll processing
* PF, ESI, PT and TDS calculations
* Background payroll processing using BullMQ workers
* Automated payslip PDF generation
* Email notifications
* Role-based access control
* Audit logging
* Payroll retry and queue monitoring
* Employee self-service portal

## 🏗️ What I Built

PayAxis was built as a full-stack payroll automation system with a React-based frontend and Node.js backend.

The application uses Redis and BullMQ to move payroll processing into background workers instead of blocking API requests. Scheduled payroll runs are triggered using `node-cron`, while Puppeteer generates payslip PDFs and Nodemailer handles email delivery.

The system also implements role-based access control for administrators, HR managers, finance users, and employees.

---

## ⚡ Quick Start with Docker

```bash
git clone https://github.com/HarsH-v45/PAYAXIS.git
cd PAYAXIS
cp .env.example .env
docker compose up -d
```

---

## 💻 Local Development

### Backend

```bash
cd backend
npm install
cp ../.env.example .env
npm run dev
```

API runs on:

```text
http://localhost:4000
```

### Worker

Open a separate terminal:

```bash
cd backend
npm run worker
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

---

## 📁 Project Structure

```text
payaxis/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js
│   │   │   ├── redis.js
│   │   │   └── env.js
│   │   ├── queues/
│   │   │   └── payrollQueue.js
│   │   ├── workers/
│   │   │   ├── payrollWorker.js
│   │   │   └── workerRegistry.js
│   │   ├── services/
│   │   │   ├── taxEngine/
│   │   │   ├── pdfService.js
│   │   │   ├── emailService.js
│   │   │   ├── storageService.js
│   │   │   ├── auditService.js
│   │   │   └── attendanceService.js
│   │   ├── schedulers/
│   │   │   └── payrollCron.js
│   │   ├── templates/
│   │   ├── api/
│   │   │   └── middlewares/
│   │   ├── models/
│   │   └── app.js
│   ├── migrations/
│   ├── server.js
│   ├── worker.js
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── store/
│   │   ├── components/
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── admin/
│   │       └── ess/
│   ├── Dockerfile
│   └── nginx.conf
│
├── docker-compose.yml
├── ecosystem.config.js
└── .env.example
```

---

## 🔄 Architecture

```text
node-cron
    │
    │ Scheduled payroll run
    ▼
BullMQ Queue
    │
    ▼
Redis
    │
    ▼
Payroll Workers
    │
    ├── Tax & Deduction Engine
    ├── Payslip PDF Generation
    ├── File Storage
    ├── Email Notification
    └── PostgreSQL
```

This architecture allows payroll processing to happen asynchronously in background workers instead of keeping API requests waiting for long-running operations.

---

## 🧮 Payroll & Tax Engine

The payroll engine handles common statutory deductions and payroll calculations, including:

* **PF:** Employee and employer contributions
* **ESI:** Employee and employer contributions based on eligibility
* **Professional Tax:** State-based configuration
* **TDS:** Payroll tax projection and deduction calculations

---

## 🔐 Role-Based Access Control

| Role        | Admin    | Payroll Run | Salary Revision | Audit |
| ----------- | -------- | ----------- | --------------- | ----- |
| SUPER_ADMIN | ✓        | ✓           | ✓               | ✓     |
| ADMIN       | ✓        | ✓           | ✓               | ✓     |
| HR_MANAGER  | ✓        | ✓           | ✗               | ✗     |
| FINANCE     | Reports  | ✗           | ✗               | ✗     |
| EMPLOYEE    | ESS Only | ✗           | ✗               | ✗     |

---

## ⚙️ Background Processing

Payroll processing is handled asynchronously using **BullMQ + Redis**.

The system supports:

* Scheduled payroll runs
* Background job processing
* Queue monitoring
* Failed job retry
* Multiple concurrent workers

This prevents long-running payroll operations from blocking normal API requests.

---

## 📄 Payslip Generation

After payroll processing, PayAxis can generate employee payslips as PDF documents using **Puppeteer** and deliver them through email.

```text
Payroll Run
     ↓
Salary Calculation
     ↓
Tax & Deduction Calculation
     ↓
Payroll Record
     ↓
Puppeteer
     ↓
Payslip PDF
     ↓
Email
```

---

## 🔑 API Endpoints

| Method | Path                         | Role        | Description          |
| ------ | ---------------------------- | ----------- | -------------------- |
| POST   | `/api/auth/login`            | Public      | Login                |
| GET    | `/api/employees`             | HR_MANAGER+ | List employees       |
| POST   | `/api/employees`             | HR_MANAGER+ | Create employee      |
| POST   | `/api/payroll/runs`          | HR_MANAGER+ | Trigger payroll run  |
| GET    | `/api/payroll/runs`          | HR_MANAGER+ | List payroll runs    |
| GET    | `/api/payroll/queue/metrics` | HR_MANAGER+ | Queue metrics        |
| POST   | `/api/payroll/retry`         | HR_MANAGER+ | Retry failed payroll |
| GET    | `/api/ess/payslips`          | Employee    | View payslips        |
| POST   | `/api/ess/declarations`      | Employee    | Submit declaration   |
| GET    | `/api/audit`                 | ADMIN+      | View audit logs      |

---

## 🛠️ Production Process Management

PayAxis can be managed in production using PM2:

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
pm2 logs
```

---

## 📌 Project Status

The project is currently maintained as a portfolio/full-stack project.

The repository contains the complete frontend, backend, database configuration, background workers, payroll engine, and deployment configuration.
