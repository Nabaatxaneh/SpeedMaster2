'use strict';

const express  = require('express');
const crypto   = require('crypto');
const { z }    = require('zod');
const { getDb } = require('../db');
const { notifySupplier } = require('../automations/notify-supplier');

const router = express.Router();

function verifyHmac(rawBody, signature) {
  const secret = process.env.ORDERS_API_SECRET || '';
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature.padEnd(64, ' ')),
      Buffer.from(expected.padEnd(64, ' '))
    );
  } catch {
    return false;
  }
}

const ItemSchema = z.object({
  variant_id:             z.number().int().positive(),
  retail_price_paid_pence: z.number().int().positive(),
});

const OrderSchema = z.object({
  payment_provider:     z.string(),
  payment_provider_ref: z.string(),
  customer: z.object({
    name:         z.string().min(1),
    email:        z.string().email(),
    phone:        z.string().optional(),
    address_line1: z.string().min(1),
    address_line2: z.string().optional(),
    city:         z.string().min(1),
    postcode:     z.string().min(1),
    country:      z.string().default('GB'),
  }),
  items: z.array(ItemSchema).min(1),
});

function generateRef(db, year) {
  const last = db.prepare(
    "SELECT order_reference FROM orders WHERE order_reference LIKE ? ORDER BY order_id DESC LIMIT 1"
  ).get(`SM-${year}-%`);

  if (!last) return `SM-${year}-000001`;
  const seq = parseInt(last.order_reference.split('-')[2], 10) + 1;
  return `SM-${year}-${String(seq).padStart(6, '0')}`;
}

router.post('/', (req, res) => {
  const sig = req.headers['x-speedmaster-signature'];
  if (!sig || !verifyHmac(req.rawBody, sig)) {
    return res.status(401).json({ error: 'Invalid HMAC signature' });
  }

  const parsed = OrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
  }

  const { payment_provider, payment_provider_ref, customer, items } = parsed.data;
  const db   = getDb();
  const year = new Date().getFullYear();
  const created = [];

  const doInsert = db.transaction(() => {
    const baseRef = generateRef(db, year);

    items.forEach((item, idx) => {
      const variant = db.prepare(`
        SELECT v.*, p.model_name, p.id AS pid, p.supplier_id
        FROM variants v JOIN products p ON p.id = v.product_id
        WHERE v.id = ?
      `).get(item.variant_id);

      if (!variant) throw Object.assign(new Error(`Variant ${item.variant_id} not found`), { status: 422 });

      if (item.retail_price_paid_pence < variant.rrp_pence) {
        throw Object.assign(
          new Error(`RRP_VIOLATION: paid ${item.retail_price_paid_pence}p < RRP ${variant.rrp_pence}p for SKU ${variant.sku}`),
          { status: 422, code: 'RRP_VIOLATION' }
        );
      }

      const ref = items.length === 1 ? baseRef : `${baseRef}-${idx + 1}`;

      const result = db.prepare(`
        INSERT INTO orders (
          order_reference, customer_name, customer_email, customer_phone,
          shipping_address_line1, shipping_address_line2, shipping_city,
          shipping_postcode, shipping_country,
          product_id, variant_id, sku, product_name_snapshot,
          retail_price_paid_pence, supplier_cost_basis_pence,
          supplier_id, payment_provider, payment_provider_ref
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        ref,
        customer.name, customer.email, customer.phone || null,
        customer.address_line1, customer.address_line2 || null,
        customer.city, customer.postcode, customer.country,
        variant.pid, variant.id, variant.sku, variant.model_name,
        item.retail_price_paid_pence, variant.wholesale_cost_pence,
        variant.supplier_id || null,
        payment_provider, payment_provider_ref,
      );

      created.push({ order_id: result.lastInsertRowid, order_reference: ref });
    });
  });

  try {
    doInsert();
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message, code: err.code });
  }

  // Notify supplier asynchronously
  for (const { order_id } of created) {
    setImmediate(() => notifySupplier(order_id).catch(() => {}));
  }

  res.status(201).json(created.length === 1 ? created[0] : created);
});

module.exports = router;
