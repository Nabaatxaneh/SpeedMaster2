'use strict';

const express          = require('express');
const { requireLogin, requireAdmin } = require('../auth');
const { getDb }        = require('../db');
const audit            = require('../util/audit');
const router           = express.Router();

router.get('/', requireLogin, requireAdmin, (req, res) => {
  const db   = getDb();
  const rows = db.prepare('SELECT key, value FROM settings ORDER BY key').all();
  const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));

  res.render('admin/settings', {
    title: 'Settings',
    user: req.session.user,
    settings,
    flash: req.session.flash || null,
  });
  delete req.session.flash;
});

router.post('/', requireLogin, requireAdmin, (req, res) => {
  const db = getDb();
  const allowed = ['brand_name','brand_domain','ops_email','currency','default_robots'];

  const doUpdate = db.transaction(() => {
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        db.prepare("INSERT INTO settings (key,value,updated_at) VALUES (?,?,datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at")
          .run(key, req.body[key]);
      }
    }
  });
  doUpdate();

  audit.log({ userId: req.session.user.id, entityType: 'settings', entityId: 'global', action: 'update', details: req.body });
  req.session.flash = { type: 'success', message: 'Settings saved.' };
  res.redirect('/admin/settings');
});

module.exports = router;
