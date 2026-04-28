'use strict';

const express          = require('express');
const multer           = require('multer');
const path             = require('path');
const fs               = require('fs');
const { requireLogin } = require('../auth');
const { getDb }        = require('../db');
const audit            = require('../util/audit');
const router           = express.Router();

const UPLOAD_DIR = path.resolve('./uploads/media');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', requireLogin, (req, res) => {
  const db = getDb();
  const { q, page = 1 } = req.query;
  const perPage = 30;
  const offset  = (parseInt(page) - 1) * perPage;

  let where = '1=1';
  const params = [];
  if (q) { where += ' AND (original_name LIKE ? OR alt_text LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }

  const total  = db.prepare(`SELECT COUNT(*) AS n FROM media WHERE ${where}`).get(...params).n;
  const images = db.prepare(`SELECT * FROM media WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, perPage, offset);

  res.render('admin/media', {
    title: 'Media Library',
    user: req.session.user,
    images, total, perPage,
    currentPage: parseInt(page),
    query: req.query,
    flash: req.session.flash || null,
  });
  delete req.session.flash;
});

router.post('/upload', requireLogin, upload.single('file'), (req, res) => {
  const db   = getDb();
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  const r = db.prepare(`
    INSERT INTO media (filename, original_name, alt_text, size, mime_type)
    VALUES (?, ?, ?, ?, ?)
  `).run(file.filename, file.originalname, req.body.alt_text || null, file.size, file.mimetype);

  audit.log({ userId: req.session.user.id, entityType: 'media', entityId: r.lastInsertRowid, action: 'create', details: { filename: file.filename } });

  if (req.headers.accept?.includes('json')) {
    return res.json({ id: r.lastInsertRowid, filename: file.filename, url: `/uploads/media/${file.filename}` });
  }
  req.session.flash = { type: 'success', message: 'Image uploaded.' };
  res.redirect('/admin/media');
});

router.post('/:id/alt', requireLogin, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE media SET alt_text = ? WHERE id = ?').run(req.body.alt_text || null, req.params.id);
  audit.log({ userId: req.session.user.id, entityType: 'media', entityId: req.params.id, action: 'update', details: { alt_text: req.body.alt_text } });
  res.json({ ok: true });
});

router.post('/:id/delete', requireLogin, (req, res) => {
  const db    = getDb();
  const media = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
  if (!media) return res.status(404).json({ error: 'Not found' });

  const filePath = path.join(UPLOAD_DIR, media.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db.prepare('DELETE FROM media WHERE id = ?').run(req.params.id);
  audit.log({ userId: req.session.user.id, entityType: 'media', entityId: req.params.id, action: 'delete', details: { filename: media.filename } });

  req.session.flash = { type: 'success', message: 'Image deleted.' };
  res.redirect('/admin/media');
});

module.exports = router;
