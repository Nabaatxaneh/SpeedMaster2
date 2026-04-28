'use strict';

const express          = require('express');
const { requireLogin } = require('../auth');
const { getDb }        = require('../db');
const audit            = require('../util/audit');
const router           = express.Router();

router.get('/', requireLogin, (req, res) => {
  const db    = getDb();
  const pages = db.prepare('SELECT * FROM pages ORDER BY slug').all();
  res.render('admin/pages', {
    title: 'CMS Pages',
    user: req.session.user,
    pages,
    flash: req.session.flash || null,
  });
  delete req.session.flash;
});

router.get('/new', requireLogin, (req, res) => {
  res.render('admin/page-edit', {
    title: 'New Page', user: req.session.user,
    page: null, errors: [],
  });
});

router.get('/:slug', requireLogin, (req, res) => {
  const db   = getDb();
  const page = db.prepare('SELECT * FROM pages WHERE slug = ?').get(req.params.slug);
  if (!page) return res.status(404).render('admin/error', { title: '404', message: 'Page not found', user: req.session.user });

  res.render('admin/page-edit', {
    title: `Edit: ${page.title}`, user: req.session.user,
    page, errors: [],
    flash: req.session.flash || null,
  });
  delete req.session.flash;
});

router.post('/', requireLogin, (req, res) => {
  const db = getDb();
  const { slug, title, content, meta_title, meta_description, canonical_url, robots } = req.body;

  try {
    const r = db.prepare(`
      INSERT INTO pages (slug, title, content, meta_title, meta_description, canonical_url, robots, updated_at)
      VALUES (?,?,?,?,?,?,?, datetime('now'))
    `).run(slug, title, content || '{}', meta_title || null, meta_description || null,
           canonical_url || null, robots || 'index,follow');

    audit.log({ userId: req.session.user.id, entityType: 'page', entityId: r.lastInsertRowid, action: 'create', details: req.body });
    req.session.flash = { type: 'success', message: 'Page created.' };
    res.redirect(`/admin/pages/${slug}`);
  } catch (err) {
    res.render('admin/page-edit', { title: 'New Page', user: req.session.user, page: req.body, errors: [err.message] });
  }
});

router.post('/:slug', requireLogin, (req, res) => {
  const db = getDb();
  const { slug } = req.params;
  const { title, content, meta_title, meta_description, canonical_url, robots } = req.body;

  try {
    db.prepare(`
      UPDATE pages SET title=?, content=?, meta_title=?, meta_description=?,
        canonical_url=?, robots=?, updated_at=datetime('now')
      WHERE slug=?
    `).run(title, content || '{}', meta_title || null, meta_description || null,
           canonical_url || null, robots || 'index,follow', slug);

    audit.log({ userId: req.session.user.id, entityType: 'page', entityId: slug, action: 'update', details: req.body });
    req.session.flash = { type: 'success', message: 'Page saved.' };
    res.redirect(`/admin/pages/${slug}`);
  } catch (err) {
    res.render('admin/page-edit', {
      title: `Edit: ${title}`, user: req.session.user,
      page: { slug, ...req.body }, errors: [err.message],
    });
  }
});

module.exports = router;
