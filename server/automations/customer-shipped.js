'use strict';

const nodemailer = require('nodemailer');
const path       = require('path');
const ejs        = require('ejs');
const pino       = require('pino');
const { getDb }  = require('../db');

const log = pino({ level: 'info' });

const CARRIER_URLS = {
  'Royal Mail':  (n) => `https://www.royalmail.com/track-your-item#${n}`,
  'DPD':         (n) => `https://www.dpd.co.uk/service/index.jsp?trackingNumber=${n}`,
  'DHL':         (n) => `https://www.dhl.com/gb-en/home/tracking.html?tracking-id=${n}`,
  'Evri':        (n) => `https://www.evri.com/track/parcel/${n}`,
  'ParcelForce': (n) => `https://www.parcelforce.com/track-trace?trackNumber=${n}`,
};

function getTrackingUrl(carrier, trackingNumber) {
  const fn = CARRIER_URLS[carrier];
  return fn ? fn(trackingNumber) : null;
}

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

async function sendShippedEmail(orderId) {
  const db    = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE order_id = ?').get(orderId);
  if (!order) throw new Error(`Order ${orderId} not found`);

  const trackingUrl = getTrackingUrl(order.tracking_carrier, order.tracking_number);

  const templatePath = path.join(__dirname, '../templates/email/customer-shipped.ejs');
  const html = await ejs.renderFile(templatePath, {
    order,
    trackingUrl,
    brandName:   process.env.BRAND_NAME   || 'SpeedMaster',
    brandDomain: process.env.BRAND_DOMAIN || 'www.speedmaster.bike',
  });

  const transport = createTransport();
  await transport.sendMail({
    from:    process.env.SMTP_FROM || '"SpeedMaster" <ops@speedmaster.bike>',
    to:      order.customer_email,
    subject: `Your ${order.product_name_snapshot} is on its way! — ${order.order_reference}`,
    html,
  });

  log.info(`[customer-shipped] dispatch email sent for order ${order.order_reference}`);
}

module.exports = { sendShippedEmail, getTrackingUrl };
