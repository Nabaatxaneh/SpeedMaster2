'use strict';

const express          = require('express');
const { requireLogin } = require('../auth');
const { getDb }        = require('../db');
const router           = express.Router();

router.get('/', requireLogin, (req, res) => {
  const db = getDb();
  const { entity_type, action, page = 1 } = req.query;
  const perPage = 50;
  const offset  = (parseInt(page) - 1) * perPage;

  let where = '1=1';
  const params = [];
  if (entity_type) { where += ' AND a.entity_type = ?'; params.push(entity_type); }
  if (action)      { where += ' AND a.action = ?';      params.push(action); }

  const total = db.prepare(`SELECT COUNT(*) AS n FROM audit_log a WHERE ${where}`).get(...params).n;
  const logs  = db.prepare(`
    SELECT a.*, u.name AS user_name, u.email AS user_email
    FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
    WHERE ${where} ORDER BY a.ts DESC LIMIT ? OFFSET ?
  `).all(...params, perPage, offset);

  res.render('admin/audit', {
    title: 'Audit Log',
    user: req.session.user,
    logs, total, perPage,
    currentPage: parseInt(page),
    query: req.query,
  });
});

module.exports = router;
