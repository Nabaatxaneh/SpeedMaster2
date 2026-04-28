'use strict';

const express   = require('express');
const { getDb } = require('../db');
const router    = express.Router();

router.get('/:type/:slug', (req, res) => {
  const db   = getDb();
  const { type, slug } = req.params;

  let row;
  if (type === 'page') {
    row = db.prepare('SELECT slug, title, meta_title, meta_description, canonical_url, robots FROM pages WHERE slug = ?').get(slug);
  } else if (type === 'product') {
    row = db.prepare('SELECT slug, model_name AS title, meta_title, meta_description, canonical_url, robots FROM products WHERE slug = ?').get(slug);
  } else {
    return res.status(400).json({ error: 'type must be page or product' });
  }

  if (!row) return res.status(404).json({ error: 'Not found' });

  res.json({
    title:            row.meta_title || row.title,
    description:      row.meta_description,
    canonical:        row.canonical_url,
    robots:           row.robots || 'index,follow',
  });
});

module.exports = router;
