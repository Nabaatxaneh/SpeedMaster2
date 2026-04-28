'use strict';

const express          = require('express');
const { requireLogin, requireAdmin, hashPassword } = require('../auth');
const { getDb }        = require('../db');
const audit            = require('../util/audit');
const router           = express.Router();

router.get('/', requireLogin, requireAdmin, (req, res) => {
  const db    = getDb();
  const users = db.prepare('SELECT id, email, name, role, failed_attempts, locked_until, created_at FROM users ORDER BY name').all();
  res.render('admin/users', {
    title: 'Admin Users',
    user: req.session.user,
    users,
    flash: req.session.flash || null,
  });
  delete req.session.flash;
});

router.get('/new', requireLogin, requireAdmin, (req, res) => {
  res.render('admin/user-edit', { title: 'New User', user: req.session.user, editUser: null, errors: [] });
});

router.get('/:id', requireLogin, requireAdmin, (req, res) => {
  const db       = getDb();
  const editUser = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(req.params.id);
  if (!editUser) return res.status(404).render('admin/error', { title: '404', message: 'User not found', user: req.session.user });

  res.render('admin/user-edit', {
    title: `Edit ${editUser.name}`, user: req.session.user,
    editUser, errors: [], flash: req.session.flash || null,
  });
  delete req.session.flash;
});

router.post('/', requireLogin, requireAdmin, async (req, res) => {
  const db = getDb();
  const { email, name, role, password } = req.body;

  if (!password || password.length < 8) {
    return res.render('admin/user-edit', { title: 'New User', user: req.session.user, editUser: req.body, errors: ['Password must be at least 8 characters.'] });
  }

  try {
    const hash = await hashPassword(password);
    const r    = db.prepare('INSERT INTO users (email, name, role, password_hash) VALUES (?,?,?,?)').run(email, name, role || 'editor', hash);
    audit.log({ userId: req.session.user.id, entityType: 'user', entityId: r.lastInsertRowid, action: 'create', details: { email, name, role } });
    req.session.flash = { type: 'success', message: 'User created.' };
    res.redirect('/admin/users');
  } catch (err) {
    res.render('admin/user-edit', { title: 'New User', user: req.session.user, editUser: req.body, errors: [err.message] });
  }
});

router.post('/:id', requireLogin, requireAdmin, async (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { email, name, role, password, unlock } = req.body;

  try {
    if (password && password.length > 0) {
      if (password.length < 8) {
        return res.render('admin/user-edit', {
          title: `Edit ${name}`, user: req.session.user,
          editUser: { id, ...req.body }, errors: ['Password must be at least 8 characters.'],
        });
      }
      const hash = await hashPassword(password);
      db.prepare("UPDATE users SET password_hash=?, updated_at=datetime('now') WHERE id=?").run(hash, id);
    }

    db.prepare(`
      UPDATE users SET email=?, name=?, role=?,
        ${unlock ? "failed_attempts=0, locked_until=NULL," : ''}
        updated_at=datetime('now')
      WHERE id=?
    `).run(email, name, role || 'editor', id);

    audit.log({ userId: req.session.user.id, entityType: 'user', entityId: id, action: 'update', details: { email, name, role, unlock: !!unlock } });
    req.session.flash = { type: 'success', message: 'User saved.' };
    res.redirect('/admin/users');
  } catch (err) {
    res.render('admin/user-edit', {
      title: `Edit ${name}`, user: req.session.user,
      editUser: { id, ...req.body }, errors: [err.message],
    });
  }
});

module.exports = router;
