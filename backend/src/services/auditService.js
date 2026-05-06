"use strict";
const db = require("../config/db");

async function log({ action, entityType, entityId, actorId = null, actorRole = "SYSTEM", actorIp = null, description = null, oldValues = null, newValues = null, changedFields = null, metadata = {} }) {
  await db.query(
    `INSERT INTO audit_logs (action,entity_type,entity_id,actor_id,actor_role,actor_ip,description,old_values,new_values,changed_fields,metadata,occurred_at)
     VALUES ($1,$2,$3,$4,$5,$6::inet,$7,$8,$9,$10,$11,NOW())`,
    [action,entityType,entityId,actorId,actorRole,actorIp,description,
     oldValues ? JSON.stringify(oldValues) : null,
     newValues ? JSON.stringify(newValues) : null,
     changedFields, JSON.stringify(metadata)]
  );
}

function logAsync(entry) {
  log(entry).catch(e => console.error("[Audit] Failed:", e.message));
}

module.exports = { log, logAsync };
