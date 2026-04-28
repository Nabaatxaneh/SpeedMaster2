'use strict';

const nodemailer = require('nodemailer');
const path       = require('path');
const ejs        = require('ejs');
const pino       = require('pino');
const { getDb }  = require('../db');

const log = pino({ level: 'info' });

function createTransport() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'localhost',
    port:   parseInt(process.env.SMTP_PORT || '1025', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth:   process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

async function notifySupplier(orderId) {
  const db = getDb();

  const order = db.prepare('SELECT * FROM orders WHERE order_id = ?').get(orderId);
  if (!order) throw new Error(`Order ${orderId} not found`);

  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(order.supplier_id);
  const variant  = db.prepare('SELECT * FROM variants  WHERE id = ?').get(order.variant_id);
  const product  = db.prepare('SELECT * FROM products  WHERE id = ?').get(order.product_id);

  if (!supplier?.contact_email) {
    log.warn(`[notify-supplier] supplier ${order.supplier_id} has no contact_email — skipping email`);
    return;
  }

  const templatePath = path.join(__dirname, '../templates/email/supplier-order.ejs');
  const html = await ejs.renderFile(templatePath, {
    order, supplier, variant, product,
    brandName:   process.env.BRAND_NAME   || 'SpeedMaster',
    brandDomain: process.env.BRAND_DOMAIN || 'www.speedmaster.bike',
  });

  const transport = createTransport();

  try {
    await transport.sendMail({
      from:    process.env.SMTP_FROM || '"SpeedMaster" <ops@speedmaster.bike>',
      to:      supplier.contact_email,
      cc:      process.env.OPS_CC   || 'ops@speedmaster.bike',
      subject: `New Order ${order.order_reference} — Please Dispatch`,
      html,
    });

    db.prepare(`
      UPDATE orders
      SET fulfillment_status = 'Sent to Supplier',
          supplier_notified_at = datetime('now')
      WHERE order_id = ?
    `).run(orderId);

    log.info(`[notify-supplier] email sent for order ${order.order_reference}`);
  } catch (err) {
    const retries = (order.notify_retry_count || 0) + 1;
    db.prepare('UPDATE orders SET notify_retry_count = ? WHERE order_id = ?').run(retries, orderId);
    log.error({ err }, `[notify-supplier] SMTP failure for order ${order.order_reference} (attempt ${retries})`);
  }
}

module.exports = { notifySupplier };
