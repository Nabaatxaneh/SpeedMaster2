'use strict';

const pdfParse = require('pdf-parse');

async function extractText(buffer) {
  const data = await pdfParse(buffer);
  return data.text;
}

function detectTable(text) {
  const lines  = text.split('\n').map(l => l.trim()).filter(Boolean);
  const rows   = [];
  const header = ['sku', 'name', 'wholesale_price', 'rrp', 'retail_price', 'stock'];

  // Heuristic: look for lines containing a price pattern (£ or digits with decimal)
  const priceRe  = /£?\d{2,5}(?:\.\d{2})?/g;
  const skuRe    = /^[A-Z0-9][A-Z0-9\-_]{3,}/;

  for (const line of lines) {
    const prices = line.match(priceRe);
    if (!prices || prices.length < 1) continue;

    const parts = line.split(/\s{2,}|\t/);
    const sku   = parts.find(p => skuRe.test(p));
    if (!sku) continue;

    const cleanPrice = (s) => s.replace('£', '');

    rows.push({
      sku:             sku.trim(),
      name:            parts.filter(p => !skuRe.test(p) && !priceRe.test(p)).join(' ').trim(),
      wholesale_price: cleanPrice(prices[0] || ''),
      rrp:             cleanPrice(prices[1] || prices[0] || ''),
      retail_price:    cleanPrice(prices[2] || prices[1] || prices[0] || ''),
      stock:           'Available',
    });
  }

  return { header, rows, rawText: text };
}

module.exports = { extractText, detectTable };
