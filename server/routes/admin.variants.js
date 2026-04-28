'use strict';

const express          = require('express');
const { requireLogin } = require('../auth');
const { getDb }        = require('../db');
const { toPence, formatGBP } = require('../util/money');
const audit            = require('../util/audit');
const router           = express.Router();

router.get('/', requireLogin, (req, res) => {
  const db = getDb();
  const { q, product_id, page = 1 } = req.query;
  const perPage = 50;
  const offset  = (parseInt(page) - 1) * perPage;

  let where = '1=1';
  const params = [];
  if (q)          { where += ' AND (v.sku LIKE ? OR v.color LIKE ? OR p.model_name LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (product_id) { where += ' AND v.product_id = ?'; params.push(product_id); }

  const total    = db.prepare(`SELECT COUNT(*) AS n FROM variants v JOIN products p ON p.id = v.product_id WHERE ${where}`).get(...params).n;
  const variants = db.prepare(`
    SELECT v.*, p.model_name, p.brand, p.sku AS product_sku
    FROM variants v JOIN products p ON p.id = v.product_id
    WHERE ${where} ORDER BY p.brand, p.model_name, v.color LIMIT ? OFFSET ?
  `).all(...params, perPage, offset);

  res.render('admin/variants', {
    title: 'Variants',
    user: req.session.user,
    variants, total, perPage,
    currentPage: parseInt(page),
    query: req.query,
    formatGBP,
    flash: req.session.flash || null,
  });
  delete req.session.flash;
});

router.post('/:id', requireLogin, (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { sku, color, stock_status, wholesale_cost, rrp, retail_price } = req.body;

  const wholesalePence = toPence(wholesale_cost);
  const rrpPence       = toPence(rrp);
  const retailPence    = toPence(retail_price);

  if (retailPence < rrpPence) {
    req.session.flash = { type: 'error', message: `Retail £${retail_price} is below the RRP of £${rrp} for SKU ${sku}.` };
    return res.redirect(req.headers.referer || '/admin/variants');
  }

  try {
    const before = db.prepare('SELECT * FROM variants WHERE id = ?').get(id);
    db.prepare(`
      UPDATE variants SET sku=?, color=?, stock_status=?,
        wholesale_cost_pence=?, rrp_pence=?, retail_price_pence=?,
        updated_at=datetime('now')
      WHERE id=?
    `).run(sku, color || null, stock_status, wholesalePence, rrpPence, retailPence, id);

    audit.log({ userId: req.session.user.id, entityType: 'variant', entityId: id, action: 'update',
      details: { before, after: { sku, color, stock_status, wholesalePence, rrpPence, retailPence } } });

    req.session.flash = { type: 'success', message: `Variant ${sku} saved.` };
  } catch (err) {
    req.session.flash = {
      type: 'error',
      message: err.message.includes('RRP_VIOLATION')
        ? `Retail £${retail_price} is below the RRP of £${rrp} for SKU ${sku}.`
        : err.message,
    };
  }

  res.redirect(req.headers.referer || '/admin/variants');
});

router.post('/bulk/action', requireLogin, (req, res) => {
  const db = getDb();
  const ids = [].concat(req.body.variant_ids || []).map(Number).filter(Boolean);
  const { bulk_action, bulk_stock } = req.body;
  if (!ids.length) return res.redirect('/admin/variants');

  const doUpdate = db.transaction(() => {
    for (const id of ids) {
      if (bulk_action === 'set_stock' && bulk_stock) {
        db.prepare("UPDATE variants SET stock_status=?, updated_at=datetime('now') WHERE id=?").run(bulk_stock, id);
        audit.log({ userId: req.session.user.id, entityType: 'variant', entityId: id, action: 'bulk_update', details: { stock_status: bulk_stock } });
      }
    }
  });
  doUpdate();

  req.session.flash = { type: 'success', message: `${ids.length} variant(s) updated.` };
  res.redirect('/admin/variants');
});

module.exports = router;
