"use strict";
const { z } = require("zod");

const schema = z.object({
  NODE_ENV:    z.enum(["development","test","production"]).default("development"),
  PORT:        z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  DB_HOST:     z.string().default("localhost"),
  DB_PORT:     z.coerce.number().default(5432),
  DB_NAME:     z.string().default("payaxis"),
  DB_USER:     z.string().default("payaxis"),
  DB_PASSWORD: z.string(),
  DB_SSL:      z.string().default("false"),
  REDIS_HOST:     z.string().default("localhost"),
  REDIS_PORT:     z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB:       z.coerce.number().default(0),
  JWT_SECRET:         z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  STORAGE_DRIVER:     z.enum(["s3","local"]).default("local"),
  LOCAL_STORAGE_PATH: z.string().default("./storage"),
  AWS_REGION:         z.string().default("ap-south-1"),
  S3_BUCKET:          z.string().optional(),
  SMTP_HOST:    z.string().optional(),
  SMTP_PORT:    z.coerce.number().default(587),
  SMTP_SECURE:  z.string().default("false"),
  SMTP_USER:    z.string().optional(),
  SMTP_PASS:    z.string().optional(),
  SMTP_FROM:    z.string().default("payroll@payaxis.com"),
  ETHEREAL_USER: z.string().optional(),
  ETHEREAL_PASS: z.string().optional(),
  COMPANY_NAME:    z.string().default("PayAxis Corp"),
  COMPANY_ADDRESS: z.string().default("Bengaluru, Karnataka"),
  COMPANY_LOGO_URL: z.string().optional(),
  PUPPETEER_EXECUTABLE_PATH: z.string().optional(),
});

let _env;
function getEnv() {
  if (_env) return _env;
  const r = schema.safeParse(process.env);
  if (!r.success) {
    console.error("❌ Invalid env vars:");
    r.error.issues.forEach(i => console.error(`  ${i.path}: ${i.message}`));
    process.exit(1);
  }
  _env = r.data;
  return _env;
}
module.exports = { getEnv };
