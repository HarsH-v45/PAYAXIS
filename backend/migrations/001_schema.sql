-- PayAxis Full Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE gender_type       AS ENUM ('MALE','FEMALE','OTHER','PREFER_NOT_TO_SAY');
CREATE TYPE employment_type   AS ENUM ('FULL_TIME','PART_TIME','CONTRACT','INTERN');
CREATE TYPE tax_regime_type   AS ENUM ('old','new');
CREATE TYPE payroll_status    AS ENUM ('PENDING','PROCESSING','SUCCESS','FAILED','HOLD');
CREATE TYPE attendance_status AS ENUM ('PRESENT','ABSENT','HALF_DAY','WFH','LOP','LEAVE_PAID','LEAVE_UNPAID','HOLIDAY','WEEKEND');
CREATE TYPE audit_action      AS ENUM ('EMPLOYEE_CREATED','EMPLOYEE_UPDATED','EMPLOYEE_DEACTIVATED','SALARY_REVISED','PAYROLL_RUN_INITIATED','PAYROLL_PROCESSED','PAYROLL_FAILED','PAYROLL_HOLD','PAYROLL_REVERSED','PAYSLIP_DOWNLOADED','DECLARATION_SUBMITTED','USER_LOGIN','USER_LOGOUT');
CREATE TYPE user_role         AS ENUM ('SUPER_ADMIN','ADMIN','HR_MANAGER','FINANCE','EMPLOYEE');

-- updated_at trigger function
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=NOW(); RETURN NEW; END; $$;

-- Departments
CREATE TABLE departments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL UNIQUE,
  cost_center VARCHAR(50),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(200) NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  role          user_role    NOT NULL DEFAULT 'EMPLOYEE',
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Employees
CREATE TABLE employees (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_code    VARCHAR(20)  NOT NULL UNIQUE,
  full_name        VARCHAR(150) NOT NULL,
  email            VARCHAR(200) NOT NULL UNIQUE,
  phone            VARCHAR(20),
  gender           gender_type,
  date_of_birth    DATE,
  pan              VARCHAR(10) UNIQUE,
  uan              VARCHAR(12) UNIQUE,
  designation      VARCHAR(100),
  department_id    UUID REFERENCES departments(id),
  manager_id       UUID REFERENCES employees(id),
  employment_type  employment_type NOT NULL DEFAULT 'FULL_TIME',
  joining_date     DATE NOT NULL,
  confirmation_date DATE,
  last_working_day DATE,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  city             VARCHAR(100),
  state            CHAR(2)  NOT NULL DEFAULT 'KA',
  is_metro_city    BOOLEAN  DEFAULT FALSE,
  tax_regime       tax_regime_type NOT NULL DEFAULT 'new',
  monthly_basic    NUMERIC(12,2),
  monthly_hra      NUMERIC(12,2),
  user_id          UUID UNIQUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_emp_dept   ON employees(department_id);
CREATE INDEX idx_emp_active ON employees(is_active) WHERE is_active=TRUE;
CREATE TRIGGER trg_emp_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Salary Structures
CREATE TABLE salary_structures (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id    UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  effective_from DATE NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  annual_ctc     NUMERIC(14,2) NOT NULL,
  basic_percent  NUMERIC(5,4)  NOT NULL DEFAULT 0.40,
  components     JSONB NOT NULL DEFAULT '[]',
  monthly_basic  NUMERIC(12,2),
  monthly_hra    NUMERIC(12,2),
  revised_by     UUID REFERENCES employees(id),
  revision_reason TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sal_emp    ON salary_structures(employee_id);
CREATE INDEX idx_sal_active ON salary_structures(employee_id,is_active) WHERE is_active=TRUE;
CREATE TRIGGER trg_sal_updated_at BEFORE UPDATE ON salary_structures FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Bank Details
CREATE TABLE bank_details (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id    UUID NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
  account_number TEXT NOT NULL,
  ifsc_code      VARCHAR(11) NOT NULL,
  bank_name      VARCHAR(100),
  account_type   VARCHAR(20) DEFAULT 'SAVINGS',
  is_verified    BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_bank_updated_at BEFORE UPDATE ON bank_details FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Attendance
CREATE TABLE attendance (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  status      attendance_status NOT NULL DEFAULT 'PRESENT',
  check_in    TIME,
  check_out   TIME,
  work_hours  NUMERIC(4,2),
  source      VARCHAR(30) DEFAULT 'MANUAL',
  note        TEXT,
  approved_by UUID REFERENCES employees(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_attendance UNIQUE(employee_id,date)
);
CREATE INDEX idx_att_emp_month 
ON attendance(employee_id, date);
CREATE INDEX idx_att_date       ON attendance(date);
CREATE TRIGGER trg_att_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Attendance monthly summary (materialized view)
CREATE MATERIALIZED VIEW attendance_monthly_summary AS
SELECT employee_id,
  DATE_TRUNC('month',date)::DATE AS period_start,
  EXTRACT(MONTH FROM date)::INT  AS month,
  EXTRACT(YEAR FROM date)::INT   AS year,
  COUNT(*)                        AS total_days,
  COUNT(*) FILTER(WHERE status IN('PRESENT','HALF_DAY','WFH','LEAVE_PAID')) AS present_days,
  COUNT(*) FILTER(WHERE status IN('LOP','LEAVE_UNPAID'))                    AS lop_days
FROM attendance GROUP BY employee_id,DATE_TRUNC('month',date),month,year;
CREATE UNIQUE INDEX idx_ams ON attendance_monthly_summary(employee_id,period_start);

-- Payroll Runs
CREATE TABLE payroll_runs (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month              SMALLINT NOT NULL CHECK(month BETWEEN 1 AND 12),
  year               SMALLINT NOT NULL CHECK(year BETWEEN 2000 AND 2100),
  run_type           VARCHAR(20) NOT NULL DEFAULT 'AUTO',
  status             VARCHAR(20) NOT NULL DEFAULT 'INITIATED',
  initiated_by       UUID REFERENCES employees(id),
  initiated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at       TIMESTAMPTZ,
  total_employees    INT DEFAULT 0,
  processed_count    INT DEFAULT 0,
  failed_count       INT DEFAULT 0,
  total_gross_payout NUMERIC(16,2),
  total_net_payout   NUMERIC(16,2),
  CONSTRAINT uq_payroll_run UNIQUE(month,year,run_type)
);

-- Payroll Records (core table)
CREATE TABLE payroll_records (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id               UUID NOT NULL REFERENCES payroll_runs(id),
  employee_id          UUID NOT NULL REFERENCES employees(id),
  month                SMALLINT NOT NULL CHECK(month BETWEEN 1 AND 12),
  year                 SMALLINT NOT NULL CHECK(year BETWEEN 2000 AND 2100),
  status               payroll_status NOT NULL DEFAULT 'PENDING',
  status_reason        TEXT,
  gross_pay            NUMERIC(12,2) NOT NULL DEFAULT 0,
  basic_pay            NUMERIC(12,2),
  hra_amount           NUMERIC(12,2),
  special_allow        NUMERIC(12,2),
  lop_days             SMALLINT NOT NULL DEFAULT 0,
  lop_deduction        NUMERIC(12,2) NOT NULL DEFAULT 0,
  pf_employee          NUMERIC(10,2) NOT NULL DEFAULT 0,
  esi_employee         NUMERIC(10,2) NOT NULL DEFAULT 0,
  pt_amount            NUMERIC(10,2) NOT NULL DEFAULT 0,
  tds_amount           NUMERIC(10,2) NOT NULL DEFAULT 0,
  other_deductions     NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_deductions     NUMERIC(12,2) GENERATED ALWAYS AS (pf_employee+esi_employee+pt_amount+tds_amount+other_deductions) STORED,
  net_pay              NUMERIC(12,2) NOT NULL DEFAULT 0,
  pf_employer          NUMERIC(10,2) NOT NULL DEFAULT 0,
  esi_employer         NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_regime           tax_regime_type,
  projected_annual_tax NUMERIC(12,2),
  effective_tax_rate   NUMERIC(5,2),
  snapshot             JSONB NOT NULL DEFAULT '{}',
  payslip_url          TEXT,
  payslip_generated_at TIMESTAMPTZ,
  email_sent_at        TIMESTAMPTZ,
  email_to             VARCHAR(200),
  processed_at         TIMESTAMPTZ,
  processing_job_id    VARCHAR(100),
  attempts             SMALLINT DEFAULT 0,
  is_adjusted          BOOLEAN DEFAULT FALSE,
  adjustment_reason    TEXT,
  adjusted_by          UUID REFERENCES employees(id),
  adjusted_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_payroll_record UNIQUE(employee_id,month,year)
);
CREATE INDEX idx_pr_run    ON payroll_records(run_id);
CREATE INDEX idx_pr_emp    ON payroll_records(employee_id);
CREATE INDEX idx_pr_period ON payroll_records(month,year);
CREATE INDEX idx_pr_status ON payroll_records(status);
CREATE INDEX idx_pr_snap   ON payroll_records USING GIN(snapshot);
CREATE TRIGGER trg_pr_updated_at BEFORE UPDATE ON payroll_records FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Audit Logs
CREATE TABLE audit_logs (
  id            BIGSERIAL PRIMARY KEY,
  action        audit_action NOT NULL,
  entity_type   VARCHAR(50)  NOT NULL,
  entity_id     TEXT         NOT NULL,
  actor_id      UUID,
  actor_role    VARCHAR(50),
  actor_ip      INET,
  description   TEXT,
  old_values    JSONB,
  new_values    JSONB,
  changed_fields TEXT[],
  metadata      JSONB DEFAULT '{}',
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_entity   ON audit_logs(entity_type,entity_id);
CREATE INDEX idx_audit_actor    ON audit_logs(actor_id);
CREATE INDEX idx_audit_occurred ON audit_logs(occurred_at DESC);

-- Investment Declarations
CREATE TABLE investment_declarations (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id          UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  fiscal_year          SMALLINT NOT NULL,
  status               VARCHAR(20) DEFAULT 'DRAFT',
  ppf                  NUMERIC(10,2) DEFAULT 0,
  elss                 NUMERIC(10,2) DEFAULT 0,
  life_insurance       NUMERIC(10,2) DEFAULT 0,
  nsc                  NUMERIC(10,2) DEFAULT 0,
  home_loan_principal  NUMERIC(10,2) DEFAULT 0,
  tuition_fees         NUMERIC(10,2) DEFAULT 0,
  health_insurance     NUMERIC(10,2) DEFAULT 0,
  nps                  NUMERIC(10,2) DEFAULT 0,
  rent_paid            NUMERIC(10,2) DEFAULT 0,
  donations            NUMERIC(10,2) DEFAULT 0,
  savings_interest     NUMERIC(10,2) DEFAULT 0,
  declarations         JSONB DEFAULT '{}',
  submitted_at         TIMESTAMPTZ,
  approved_by          UUID REFERENCES employees(id),
  approved_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_declaration UNIQUE(employee_id,fiscal_year)
);
CREATE TRIGGER trg_inv_updated_at BEFORE UPDATE ON investment_declarations FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Seed default super-admin (password: ChangeMe@123)
INSERT INTO users(id,email,password_hash,role) VALUES (uuid_generate_v4(),'admin@payaxis.com','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewoh9J1sXzb1rQSi','SUPER_ADMIN');
