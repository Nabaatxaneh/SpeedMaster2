'use strict';

const bcrypt = require('bcrypt');
const { getDb } = require('./db');

const SALT_ROUNDS = 12;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

async function authenticate(email, password) {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return { ok: false, reason: 'invalid' };

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return { ok: false, reason: 'locked', until: user.locked_until };
  }

  const match = await verifyPassword(password, user.password_hash);
  if (!match) {
    const attempts = user.failed_attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      const until = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString();
      db.prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?')
        .run(attempts, until, user.id);
      return { ok: false, reason: 'locked', until };
    }
    db.prepare('UPDATE users SET failed_attempts = ? WHERE id = ?').run(attempts, user.id);
    return { ok: false, reason: 'invalid' };
  }

  db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);
  return { ok: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
}

function requireLogin(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect('/admin/login');
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') return next();
  res.status(403).render('admin/error', { title: 'Forbidden', message: 'Admin role required.', user: req.session?.user });
}

module.exports = { hashPassword, verifyPassword, authenticate, requireLogin, requireAdmin };
