'use strict';

const { getDb } = require('../db');

function log({ userId, entityType, entityId, action, details }) {
  const db = getDb();
  db.prepare(`
    INSERT INTO audit_log (user_id, entity_type, entity_id, action, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    userId   || null,
    entityType,
    String(entityId),
    action,
    details != null ? JSON.stringify(details) : null
  );
}

module.exports = { log };
