"use strict";
const { Pool } = require("pg");
const { getEnv } = require("./env");

let _pool;
function getPool() {
  if (_pool) return _pool;
  const env = getEnv();
  _pool = new Pool({
    host: env.DB_HOST, port: env.DB_PORT,
    database: env.DB_NAME, user: env.DB_USER, password: env.DB_PASSWORD,
    max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000,
    ssl: env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  });
  _pool.on("error", err => console.error("[DB] Pool error:", err.message));
  return _pool;
}

async function query(text, params) {
  const start = Date.now();
  try {
    const result = await getPool().query(text, params);
    const dur = Date.now() - start;
    if (dur > 500) console.warn(`[DB SLOW ${dur}ms]`, text.slice(0, 80));
    return result;
  } catch (err) {
    console.error("[DB Error]", err.message);
    throw err;
  }
}

async function withTransaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { query, withTransaction, get pool() { return getPool(); } };
