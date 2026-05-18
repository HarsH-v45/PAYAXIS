"use strict";

const IORedis = require("ioredis");

const redis = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on("connect", () => console.log("[Redis] Connected"));
redis.on("error", e => console.error("[Redis] Error:", e.message));

module.exports = redis;