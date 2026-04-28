'use strict';

const express          = require('express');
const { requireLogin } = require('../auth');
const { getDb }        = require('../db');
const audit            = require('../util/audit');
const router           = express.Router();

router.get('/', requireLogin, (req, res) => {
  const db        = getDb();
  const suppliers = db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM products p WHERE p.supplier_id = s.id) AS product_count,
      (SELECT COUNT(*) FROM orders  o WHERE o.supplier_id  = s.id) AS order_count
    FROM suppliers s ORDER BY s.name
  `).all();

  res.render('admin/suppliers', {
    title: 'Suppliers',
    user: req.session.user,
    suppliers,
    flash: req.session.flash || null,
  });
  delete req.session.flash;
});

router.get('/new', requireLogin, (req, res) => {
  res.render('admin/supplier-edit', {
    title: 'New Supplier', user: req.session.user, supplier: null, errors: [],
  });
});

router.get('/:id', requireLogin, (req, res) => {
  const db       = getDb();
  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
  if (!supplier) return res.status(404).render('admin/error', { title: '404', message: 'Supplier not found', user: req.session.user });

  res.render('admin/supplier-edit', {
    title: `Edit ${supplier.name}`, user: req.session.user,
    supplier, errors: [], flash: req.session.flash || null,
  });
  delete req.session.flash;
});

router.post('/', requireLogin, (req, res) => {
  const db = getDb();
  const { name, contact_email, contact_whatsapp, contact_phone, shipping_sla, notes } = req.body;

  try {
    const r = db.prepare(`
      INSERT INTO suppliers (name, contact_email, contact_whatsapp, contact_phone, shipping_sla, notes)
      VALUES (?,?,?,?,?,?)
    `).run(name, contact_email || null, contact_whatsapp || null, contact_phone || null,
           shipping_sla || null, notes || null);

    audit.log({ userId: req.session.user.id, entityType: 'supplier', entityId: r.lastInsertRowid, action: 'create', details: req.body });
    req.session.flash = { type: 'success', message: 'Supplier created.' };
    res.redirect(`/admin/suppliers/${r.lastInsertRowid}`);
  } catch (err) {
    res.render('admin/supplier-edit', { title: 'New Supplier', user: req.session.user, supplier: req.body, errors: [err.message] });
  }
});

router.post('/:id', requireLogin, (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { name, contact_email, contact_whatsapp, contact_phone, shipping_sla, notes } = req.body;

  try {
    db.prepare(`
      UPDATE suppliers SET name=?, contact_email=?, contact_whatsapp=?, contact_phone=?,
        shipping_sla=?, notes=?, updated_at=datetime('now')
      WHERE id=?
    `).run(name, contact_email || null, contact_whatsapp || null, contact_phone || null,
           shipping_sla || null, notes || null, id);

    audit.log({ userId: req.session.user.id, entityType: 'supplier', entityId: id, action: 'update', details: req.body });
    req.session.flash = { type: 'success', message: 'Supplier saved.' };
    res.redirect(`/admin/suppliers/${id}`);
  } catch (err) {
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
    res.render('admin/supplier-edit', {
      title: `Edit ${name}`, user: req.session.user,
      supplier: { ...supplier, ...req.body }, errors: [err.message],
    });
  }
});

module.exports = router;
