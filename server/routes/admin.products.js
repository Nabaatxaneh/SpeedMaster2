'use strict';

const express          = require('express');
const { requireLogin } = require('../auth');
const { getDb }        = require('../db');
const { toSlug }       = require('../util/slug');
const { formatGBP }    = require('../util/money');
const audit            = require('../util/audit');
const router           = express.Router();

router.get('/', requireLogin, (req, res) => {
  const db = getDb();
  const { q, category, active, page = 1 } = req.query;
  const perPage = 25;
  const offset  = (parseInt(page) - 1) * perPage;

  let where = '1=1';
  const params = [];
  if (q)        { where += ' AND (p.model_name LIKE ? OR p.sku LIKE ? OR p.brand LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (category) { where += ' AND p.category = ?'; params.push(category); }
  if (active !== undefined && active !== '') { where += ' AND p.is_active = ?'; params.push(active === '1' ? 1 : 0); }

  const total    = db.prepare(`SELECT COUNT(*) AS n FROM products p WHERE ${where}`).get(...params).n;
  const products = db.prepare(`
    SELECT p.*, s.name AS supplier_name,
      (SELECT COUNT(*) FROM variants v WHERE v.product_id = p.id) AS variant_count
    FROM products p LEFT JOIN suppliers s ON s.id = p.supplier_id
    WHERE ${where} ORDER BY p.brand, p.model_name LIMIT ? OFFSET ?
  `).all(...params, perPage, offset);

  const suppliers = db.prepare('SELECT id, name FROM suppliers ORDER BY name').all();

  res.render('admin/products', {
    title: 'Products',
    user: req.session.user,
    products, suppliers, total, perPage,
    currentPage: parseInt(page),
    query: req.query,
    formatGBP,
    flash: req.session.flash || null,
  });
  delete req.session.flash;
});

router.get('/new', requireLogin, (req, res) => {
  const db = getDb();
  const suppliers = db.prepare('SELECT id, name FROM suppliers ORDER BY name').all();
  res.render('admin/product-edit', {
    title: 'New Product', user: req.session.user,
    product: null, variants: [], suppliers, errors: [],
  });
});

router.get('/:id', requireLogin, (req, res) => {
  const db      = getDb();
  const product = db.prepare(`
    SELECT p.*, s.name AS supplier_name
    FROM products p LEFT JOIN suppliers s ON s.id = p.supplier_id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!product) return res.status(404).render('admin/error', { title: '404', message: 'Product not found', user: req.session.user });

  const variants  = db.prepare('SELECT * FROM variants WHERE product_id = ? ORDER BY color').all(product.id);
  const suppliers = db.prepare('SELECT id, name FROM suppliers ORDER BY name').all();
  const specs     = db.prepare('SELECT * FROM specifications WHERE product_id = ?').get(product.id);

  res.render('admin/product-edit', {
    title: `Edit ${product.model_name}`,
    user: req.session.user,
    product, variants, suppliers, specs,
    errors: [], formatGBP,
    flash: req.session.flash || null,
  });
  delete req.session.flash;
});

router.post('/', requireLogin, (req, res) => {
  const db = getDb();
  const { supplier_id, sku, brand, model_name, description, category, is_active,
          meta_title, meta_description, canonical_url, robots } = req.body;

  const slug = toSlug(`${brand || ''} ${model_name}`);

  try {
    const r = db.prepare(`
      INSERT INTO products (supplier_id, sku, brand, model_name, description, category, is_active,
        slug, meta_title, meta_description, canonical_url, robots, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?, datetime('now'))
    `).run(supplier_id || null, sku, brand || null, model_name, description || null,
           category || null, is_active === '1' ? 1 : 0,
           slug, meta_title || null, meta_description || null,
           canonical_url || null, robots || 'index,follow');

    audit.log({ userId: req.session.user.id, entityType: 'product', entityId: r.lastInsertRowid, action: 'create', details: req.body });
    req.session.flash = { type: 'success', message: 'Product created.' };
    res.redirect(`/admin/products/${r.lastInsertRowid}`);
  } catch (err) {
    const suppliers = db.prepare('SELECT id, name FROM suppliers ORDER BY name').all();
    res.render('admin/product-edit', {
      title: 'New Product', user: req.session.user,
      product: req.body, variants: [], suppliers, specs: null,
      errors: [err.message], formatGBP,
    });
  }
});

router.post('/:id', requireLogin, (req, res) => {
  const db  = getDb();
  const { id } = req.params;
  const { supplier_id, sku, brand, model_name, description, category, is_active,
          meta_title, meta_description, canonical_url, robots } = req.body;

  const existing = db.prepare('SELECT slug FROM products WHERE id = ?').get(id);
  const slug = existing?.slug || toSlug(`${brand || ''} ${model_name}`);

  try {
    db.prepare(`
      UPDATE products SET supplier_id=?, sku=?, brand=?, model_name=?, description=?,
        category=?, is_active=?, slug=?, meta_title=?, meta_description=?,
        canonical_url=?, robots=?, updated_at=datetime('now')
      WHERE id=?
    `).run(supplier_id || null, sku, brand || null, model_name, description || null,
           category || null, is_active === '1' ? 1 : 0,
           slug, meta_title || null, meta_description || null,
           canonical_url || null, robots || 'index,follow', id);

    audit.log({ userId: req.session.user.id, entityType: 'product', entityId: id, action: 'update', details: req.body });
    req.session.flash = { type: 'success', message: 'Product saved.' };
    res.redirect(`/admin/products/${id}`);
  } catch (err) {
    const product   = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    const variants  = db.prepare('SELECT * FROM variants WHERE product_id = ?').all(id);
    const suppliers = db.prepare('SELECT id, name FROM suppliers ORDER BY name').all();
    res.render('admin/product-edit', {
      title: `Edit ${model_name}`, user: req.session.user,
      product: { ...product, ...req.body }, variants, suppliers, specs: null,
      errors: [err.message], formatGBP,
    });
  }
});

router.post('/bulk/action', requireLogin, (req, res) => {
  const db  = getDb();
  const ids = [].concat(req.body.product_ids || []).map(Number).filter(Boolean);
  const { bulk_action } = req.body;
  if (!ids.length) return res.redirect('/admin/products');

  const doUpdate = db.transaction(() => {
    if (bulk_action === 'activate') {
      for (const id of ids) {
        db.prepare("UPDATE products SET is_active = 1, updated_at = datetime('now') WHERE id = ?").run(id);
        audit.log({ userId: req.session.user.id, entityType: 'product', entityId: id, action: 'bulk_update', details: { is_active: 1 } });
      }
    } else if (bulk_action === 'deactivate') {
      for (const id of ids) {
        db.prepare("UPDATE products SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(id);
        audit.log({ userId: req.session.user.id, entityType: 'product', entityId: id, action: 'bulk_update', details: { is_active: 0 } });
      }
    }
  });
  doUpdate();

  req.session.flash = { type: 'success', message: `${ids.length} product(s) updated.` };
  res.redirect('/admin/products');
});

module.exports = router;
