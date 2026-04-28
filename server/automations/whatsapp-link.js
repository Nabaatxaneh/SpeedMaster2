'use strict';

const { formatGBP } = require('../util/money');

function buildWhatsAppLink(order, supplier, variant, product) {
  const e164 = (supplier.contact_whatsapp || '').replace(/^\+/, '');
  if (!e164) return null;

  const lines = [
    `*New Order — ${order.order_reference}*`,
    `Date: ${new Date(order.created_at).toLocaleDateString('en-GB')}`,
    '',
    '*Customer Details*',
    `Name: ${order.customer_name}`,
    `Address: ${order.shipping_address_line1}${order.shipping_address_line2 ? ', ' + order.shipping_address_line2 : ''}`,
    `         ${order.shipping_city}, ${order.shipping_postcode}`,
    '',
    '*Product*',
    `SKU: ${order.sku}`,
    `Product: ${order.product_name_snapshot}`,
    variant.color ? `Colour: ${variant.color}` : null,
    `Wholesale Cost: ${formatGBP(order.supplier_cost_basis_pence)}`,
    '',
    'Please reply with the carrier and tracking number once dispatched.',
    'Thank you!',
  ].filter(Boolean).join('\n');

  return `https://wa.me/${e164}?text=${encodeURIComponent(lines)}`;
}

module.exports = { buildWhatsAppLink };
