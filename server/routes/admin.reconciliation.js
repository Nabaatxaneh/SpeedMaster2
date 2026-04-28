'use strict';

const express          = require('express');
const { requireLogin } = require('../auth');
const { getDb }        = require('../db');
const { formatGBP, formatGBPDecimal } = require('../util/money');
const audit            = require('../util/audit');
const { stringify }    = require('csv-stringify/sync');
const router           = express.Router();

router.get('/', requireLogin, (req, res) => {
  const db = getDb();
  const { supplier_id, from, to, page = 1 } = req.query;
  const perPage = 50;
  const offset  = (parseInt(page) - 1) * perPage;

  let where  = "o.supplier_payment_status = 'Pending' AND o.fulfillment_status = 'Shipped'";
  const params = [];
  if (supplier_id) { where += ' AND o.supplier_id = ?'; params.push(supplier_id); }
  if (from)        { where += " AND date(o.shipped_at) >= ?"; params.push(from); }
  if (to)          { where += " AND date(o.shipped_at) <= ?"; params.push(to); }

  const total     = db.prepare(`SELECT COUNT(*) AS n FROM orders o WHERE ${where}`).get(...params).n;
  const orders    = db.prepare(`
    SELECT o.*, s.name AS supplier_name
    FROM orders o LEFT JOIN suppliers s ON s.id = o.supplier_id
    WHERE ${where} ORDER BY o.shipped_at DESC LIMIT ? OFFSET ?
  `).all(...params, perPage, offset);

  const subtotal  = db.prepare(`
    SELECT COALESCE(SUM(supplier_cost_basis_pence),0) AS t FROM orders o WHERE ${where}
  `).get(...params).t;

  const suppliers = db.prepare('SELECT id, name FROM suppliers ORDER BY name').all();

  res.render('admin/reconciliation', {
    title: 'Reconciliation',
    user: req.session.user,
    orders, suppliers, total, perPage, subtotal,
    currentPage: parseInt(page),
    query: req.query,
    formatGBP,
  });
});

router.post('/settle', requireLogin, (req, res) => {
  const db  = getDb();
  const ids = [].concat(req.body.order_ids || []).map(Number).filter(Boolean);
  if (!ids.length) return res.redirect('/admin/reconciliation');

  const settle = db.transaction(() => {
    for (const id of ids) {
      db.prepare(`
        UPDATE orders SET supplier_payment_status = 'Settled', settled_at = datetime('now')
        WHERE order_id = ?
      `).run(id);
      audit.log({ userId: req.session.user.id, entityType: 'order', entityId: id, action: 'settle',
        details: { supplier_payment_status: 'Settled' } });
    }
  });
  settle();

  req.session.flash = { type: 'success', message: `${ids.length} order(s) marked as Settled.` };
  res.redirect('/admin/reconciliation');
});

router.get('/export', requireLogin, (req, res) => {
  const db = getDb();
  const { supplier_id, from, to } = req.query;

  let where  = "o.supplier_payment_status = 'Pending' AND o.fulfillment_status = 'Shipped'";
  const params = [];
  if (supplier_id) { where += ' AND o.supplier_id = ?'; params.push(supplier_id); }
  if (from)        { where += " AND date(o.shipped_at) >= ?"; params.push(from); }
  if (to)          { where += " AND date(o.shipped_at) <= ?"; params.push(to); }

  const rows = db.prepare(`
    SELECT o.order_reference, o.shipped_at, o.sku, o.product_name_snapshot,
           o.supplier_cost_basis_pence, o.tracking_number, s.name AS supplier_name
    FROM orders o LEFT JOIN suppliers s ON s.id = o.supplier_id
    WHERE ${where} ORDER BY o.shipped_at
  `).all(...params);

  const csvData = rows.map(r => ({
    order_reference: r.order_reference,
    shipped_at:      r.shipped_at,
    sku:             r.sku,
    product_name:    r.product_name_snapshot,
    supplier_cost:   formatGBPDecimal(r.supplier_cost_basis_pence),
    tracking_number: r.tracking_number || '',
    supplier:        r.supplier_name || '',
  }));

  const supplierSlug = supplier_id
    ? (db.prepare('SELECT name FROM suppliers WHERE id = ?').get(supplier_id)?.name || 'all').toLowerCase().replace(/\s+/, '-')
    : 'all';
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `speedmaster-settlement-${supplierSlug}-${dateStr}.csv`;

  const csv = stringify(csvData, { header: true });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

module.exports = router;
