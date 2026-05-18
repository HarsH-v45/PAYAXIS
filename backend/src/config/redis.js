"use strict";
const IORedis = require("ioredis");
const { getEnv } = require("./env");

const env = getEnv();
const redis = new IORedis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  db: env.REDIS_DB,
  maxRetriesPerRequest: null,   // required by BullMQ
  enableReadyCheck: false,      // required by BullMQ
  retryStrategy: t => (t > 10 ? null : Math.min(t * 200, 5000)),
  tls: env.REDIS_TLS === "true" ? {} : undefined,
});

redis.on("connect", () => console.log("[Redis] Connected"));
redis.on("error",  e  => console.error("[Redis] Error:", e.message));

module.exports = redis;
