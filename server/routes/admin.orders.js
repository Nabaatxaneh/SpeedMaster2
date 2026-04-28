'use strict';

const express          = require('express');
const { requireLogin } = require('../auth');
const { getDb }        = require('../db');
const { formatGBP }    = require('../util/money');
const audit            = require('../util/audit');
const { sendShippedEmail } = require('../automations/customer-shipped');
const { notifySupplier }   = require('../automations/notify-supplier');
const { buildWhatsAppLink } = require('../automations/whatsapp-link');
const router           = express.Router();

router.get('/', requireLogin, (req, res) => {
  const db = getDb();
  const { status, fulfillment, supplier_id, from, to, page = 1 } = req.query;
  const perPage = 25;
  const offset  = (parseInt(page) - 1) * perPage;

  let where = '1=1';
  const params = [];
  if (status)       { where += ' AND o.supplier_payment_status = ?'; params.push(status); }
  if (fulfillment)  { where += ' AND o.fulfillment_status = ?';       params.push(fulfillment); }
  if (supplier_id)  { where += ' AND o.supplier_id = ?';              params.push(supplier_id); }
  if (from)         { where += " AND date(o.created_at) >= ?";        params.push(from); }
  if (to)           { where += " AND date(o.created_at) <= ?";        params.push(to); }

  const total   = db.prepare(`SELECT COUNT(*) AS n FROM orders o WHERE ${where}`).get(...params).n;
  const orders  = db.prepare(`
    SELECT o.*, s.name AS supplier_name
    FROM orders o LEFT JOIN suppliers s ON s.id = o.supplier_id
    WHERE ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, perPage, offset);

  const suppliers = db.prepare('SELECT id, name FROM suppliers ORDER BY name').all();

  res.render('admin/orders', {
    title: 'Orders',
    user: req.session.user,
    orders, suppliers, total, perPage,
    currentPage: parseInt(page),
    query: req.query,
    formatGBP,
  });
});

router.get('/:id', requireLogin, (req, res) => {
  const db    = getDb();
  const order = db.prepare(`
    SELECT o.*, s.name AS supplier_name, s.contact_whatsapp, s.contact_email AS supplier_email
    FROM orders o LEFT JOIN suppliers s ON s.id = o.supplier_id
    WHERE o.order_id = ?
  `).get(req.params.id);

  if (!order) return res.status(404).render('admin/error', { title: '404', message: 'Order not found', user: req.session.user });

  const variant  = db.prepare('SELECT * FROM variants WHERE id = ?').get(order.variant_id);
  const product  = db.prepare('SELECT * FROM products WHERE id = ?').get(order.product_id);
  const supplier = order.supplier_id ? db.prepare('SELECT * FROM suppliers WHERE id = ?').get(order.supplier_id) : null;

  const waLink = supplier ? buildWhatsAppLink(order, supplier, variant || {}, product || {}) : null;

  res.render('admin/order-detail', {
    title: `Order ${order.order_reference}`,
    user: req.session.user,
    order, variant, product, supplier, waLink,
    formatGBP,
    flash: req.session.flash || null,
  });
  delete req.session.flash;
});

router.post('/:id/tracking', requireLogin, async (req, res) => {
  const db = getDb();
  const { tracking_carrier, tracking_number } = req.body;
  const { id } = req.params;

  const order = db.prepare('SELECT * FROM orders WHERE order_id = ?').get(id);
  if (!order) return res.status(404).send('Not found');

  db.prepare(`
    UPDATE orders SET tracking_carrier = ?, tracking_number = ?,
      fulfillment_status = 'Shipped', shipped_at = datetime('now'), updated_at = datetime('now')
    WHERE order_id = ?
  `).run(tracking_carrier, tracking_number, id);

  audit.log({ userId: req.session.user.id, entityType: 'order', entityId: id, action: 'update',
    details: { fulfillment_status: 'Shipped', tracking_carrier, tracking_number } });

  try {
    await sendShippedEmail(parseInt(id));
    req.session.flash = { type: 'success', message: 'Order marked as Shipped and customer email sent.' };
  } catch (err) {
    req.session.flash = { type: 'warning', message: `Order marked as Shipped but customer email failed: ${err.message}` };
  }

  res.redirect(`/admin/orders/${id}`);
});

router.post('/:id/resend-supplier', requireLogin, async (req, res) => {
  const { id } = req.params;
  try {
    await notifySupplier(parseInt(id));
    req.session.flash = { type: 'success', message: 'Supplier notification resent.' };
  } catch (err) {
    req.session.flash = { type: 'error', message: `Failed to resend: ${err.message}` };
  }
  res.redirect(`/admin/orders/${id}`);
});

module.exports = router;
