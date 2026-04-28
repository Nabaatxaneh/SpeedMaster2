'use strict';

require('dotenv').config();
const path = require('path');
const fs   = require('fs');

// Ensure data dir exists
fs.mkdirSync(path.resolve('./data'), { recursive: true });

const { migrate, getDb } = require('../server/db');
const { hashPassword }   = require('../server/auth');
const { toPence }        = require('../server/util/money');

async function seed() {
  migrate();
  const db = getDb();

  // ── Wipe existing seed data (idempotent) ─────────────────────────────
  db.exec(`
    DELETE FROM orders   WHERE order_reference LIKE 'SM-SEED-%';
    DELETE FROM variants WHERE sku IN ('KOOLUX-X3-SEED-GRAY','KOOLUX-X3-SEED-RED');
    DELETE FROM products WHERE sku = 'KOOLUX-X3-SEED';
    DELETE FROM suppliers WHERE name = 'KOOLUX (Seed)';
    DELETE FROM users WHERE email = 'admin@speedmaster.bike';
    DELETE FROM pages WHERE slug = 'home';
  `);

  // ── Admin user ────────────────────────────────────────────────────────
  const hash = await hashPassword('change-me-on-first-login');
  const userRes = db.prepare(`
    INSERT INTO users (email, name, role, password_hash) VALUES (?,?,?,?)
  `).run('admin@speedmaster.bike', 'SpeedMaster Admin', 'admin', hash);
  const userId = userRes.lastInsertRowid;
  console.log(`[seed] admin user: admin@speedmaster.bike`);

  // ── Supplier ──────────────────────────────────────────────────────────
  const supplierRes = db.prepare(`
    INSERT INTO suppliers (name, contact_email, contact_whatsapp, contact_phone, shipping_sla, notes)
    VALUES (?,?,?,?,?,?)
  `).run(
    'KOOLUX (Seed)',
    'lilian@koolux.eu',
    '+8615079089940',
    '+86 150 7908 9940',
    '1-5 working days',
    'Seed supplier. Main KOOLUX contact for e-bikes.'
  );
  const supplierId = supplierRes.lastInsertRowid;
  console.log(`[seed] supplier: KOOLUX (Seed) id=${supplierId}`);

  // ── Product ───────────────────────────────────────────────────────────
  const productRes = db.prepare(`
    INSERT INTO products (supplier_id, sku, brand, model_name, description, category, is_active,
      slug, meta_title, meta_description)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(
    supplierId,
    'KOOLUX-X3-SEED',
    'KOOLUX',
    'X3 E-Bike',
    'The KOOLUX X3 is a versatile electric bike with a 500W motor and 48V 15Ah battery, offering up to 85km range per charge.',
    'e-bike',
    1,
    'koolux-x3-e-bike',
    'KOOLUX X3 E-Bike | SpeedMaster',
    'Buy the KOOLUX X3 electric bike. 500W motor, 85km range. Free UK delivery over £200.'
  );
  const productId = productRes.lastInsertRowid;

  db.prepare(`
    INSERT INTO specifications (product_id, battery_capacity, motor_power, max_speed, range, tire_size, max_load, net_weight, gross_weight)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run(productId, '48V 15Ah', '500W', '25 km/h', '45-85 km', '26 inch', '120 kg', '22 kg', '26 kg');

  console.log(`[seed] product: KOOLUX X3 id=${productId}`);

  // ── Variants: one at RRP, one above ───────────────────────────────────
  const varGray = db.prepare(`
    INSERT INTO variants (product_id, sku, color, stock_status, wholesale_cost_pence, rrp_pence, retail_price_pence)
    VALUES (?,?,?,?,?,?,?)
  `).run(productId, 'KOOLUX-X3-SEED-GRAY', 'Gray', 'Available',
    toPence(479), toPence(869), toPence(869));  // at RRP
  const varGrayId = varGray.lastInsertRowid;

  const varRed = db.prepare(`
    INSERT INTO variants (product_id, sku, color, stock_status, wholesale_cost_pence, rrp_pence, retail_price_pence)
    VALUES (?,?,?,?,?,?,?)
  `).run(productId, 'KOOLUX-X3-SEED-RED', 'Red', 'Available',
    toPence(479), toPence(869), toPence(899));  // 899 > 869 — above RRP

  console.log(`[seed] variants: Gray id=${varGrayId}, Red id=${varRed.lastInsertRowid}`);

  // ── Home CMS page ─────────────────────────────────────────────────────
  db.prepare(`
    INSERT INTO pages (slug, title, content, meta_title, meta_description, robots)
    VALUES (?,?,?,?,?,?)
  `).run(
    'home',
    'Homepage',
    JSON.stringify({ hero: { headline: 'RIDE THE FUTURE', subheadline: 'Of Urban Mobility' } }),
    'SpeedMaster — Electric Bikes & Scooters | UK',
    'Shop premium electric bikes and scooters at SpeedMaster. Official UK retailer. Free delivery over £200.',
    'index,follow'
  );

  // ── Example orders in different statuses ─────────────────────────────
  const orders = [
    {
      ref: 'SM-SEED-000001',
      customer: 'Alice Johnson',
      email: 'alice@example.com',
      addr1: '12 High Street', city: 'London', postcode: 'EC1A 1BB',
      variantId: varGrayId,
      retailPence: toPence(869),
      costPence:   toPence(479),
      fulfillment: 'Shipped',
      payment: 'Pending',
      carrier: 'Royal Mail', tracking: 'JD000000001GB',
      supplier_notified_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      shipped_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      ref: 'SM-SEED-000002',
      customer: 'Bob Smith',
      email: 'bob@example.com',
      addr1: '88 Park Lane', city: 'Manchester', postcode: 'M1 4BH',
      variantId: varGrayId,
      retailPence: toPence(869),
      costPence:   toPence(479),
      fulfillment: 'Sent to Supplier',
      payment: 'Pending',
      supplier_notified_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      ref: 'SM-SEED-000003',
      customer: 'Carol Davis',
      email: 'carol@example.com',
      addr1: '3 Castle Road', city: 'Birmingham', postcode: 'B1 1AA',
      variantId: varRed.lastInsertRowid,
      retailPence: toPence(899),
      costPence:   toPence(479),
      fulfillment: 'Shipped',
      payment: 'Settled',
      carrier: 'DPD', tracking: 'DPD123456789',
      supplier_notified_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      shipped_at: new Date(Date.now() - 86400000 * 6).toISOString(),
      settled_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
  ];

  for (const o of orders) {
    db.prepare(`
      INSERT INTO orders (
        order_reference, customer_name, customer_email, customer_phone,
        shipping_address_line1, shipping_city, shipping_postcode, shipping_country,
        product_id, variant_id, sku, product_name_snapshot,
        retail_price_paid_pence, supplier_cost_basis_pence,
        supplier_id, payment_provider, payment_provider_ref,
        fulfillment_status, supplier_payment_status,
        supplier_notified_at, shipped_at, settled_at,
        tracking_carrier, tracking_number
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      o.ref, o.customer, o.email, null,
      o.addr1, o.city, o.postcode, 'GB',
      productId, o.variantId, 'KOOLUX-X3-SEED-' + (o.variantId === varGrayId ? 'GRAY' : 'RED'), 'KOOLUX X3 E-Bike',
      o.retailPence, o.costPence,
      supplierId, 'stripe', `ch_seed_${o.ref}`,
      o.fulfillment, o.payment,
      o.supplier_notified_at || null,
      o.shipped_at || null,
      o.settled_at || null,
      o.carrier || null, o.tracking || null,
    );
    console.log(`[seed] order: ${o.ref} (${o.fulfillment} / ${o.payment})`);
  }

  console.log('\n[seed] Done! Sign in at http://localhost:3000/admin');
  console.log('       Email:    admin@speedmaster.bike');
  console.log('       Password: change-me-on-first-login');
}

seed().catch(err => { console.error(err); process.exit(1); });
