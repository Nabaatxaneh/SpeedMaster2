'use strict';

const Papa        = require('papaparse');
const { getDb }   = require('../db');
const { toPence } = require('../util/money');
const audit       = require('../util/audit');

const FIELD_MAP = {
  sku:             'sku',
  wholesale_price: 'wholesale_cost_pence',
  rrp:             'rrp_pence',
  retail_price:    'retail_price_pence',
  stock:           'stock_status',
  name:            'model_name',
  description:     'description',
};

function parseCSV(csvText) {
  const result = Papa.parse(csvText, {
    header:        true,
    skipEmptyLines: true,
    transformHeader: h => h.trim(),
  });
  return result;
}

function applyMapping(row, mapping) {
  const out = {};
  for (const [csvCol, dbField] of Object.entries(mapping)) {
    if (row[csvCol] !== undefined) out[dbField] = row[csvCol];
  }
  return out;
}

function validateRow(mapped) {
  const errors = [];
  if (!mapped.sku) errors.push('SKU is required');

  const priceFields = ['wholesale_cost_pence', 'rrp_pence', 'retail_price_pence'];
  for (const f of priceFields) {
    if (mapped[f] !== undefined) {
      const val = parseFloat(mapped[f]);
      if (isNaN(val) || val < 0) errors.push(`${f} is not a valid price`);
      else mapped[f] = toPence(val);
    }
  }

  if (
    mapped.retail_price_pence != null &&
    mapped.rrp_pence          != null &&
    mapped.retail_price_pence < mapped.rrp_pence
  ) {
    errors.push(`retail_price (£${mapped.retail_price_pence / 100}) is below RRP (£${mapped.rrp_pence / 100})`);
  }

  return errors;
}

function dryRun(rows, mapping, mode, supplierId) {
  const db = getDb();
  const results = [];

  for (const row of rows) {
    const mapped = applyMapping(row, mapping);
    const errors = validateRow(mapped);

    if (errors.length) {
      results.push({ sku: mapped.sku || '?', action: 'skip', errors });
      continue;
    }

    const existing = db.prepare(
      'SELECT v.id, v.sku FROM variants v JOIN products p ON p.id = v.product_id WHERE v.sku = ?'
    ).get(mapped.sku);

    let action;
    if (existing) {
      action = 'update';
    } else if (mode === 'update_only') {
      action = 'skip_not_found';
    } else {
      action = 'create';
    }

    results.push({ sku: mapped.sku, action, errors: [] });
  }

  return results;
}

function runImport(rows, mapping, mode, supplierId, userId, importFileId) {
  const db      = getDb();
  const results = [];

  const doWork = db.transaction(() => {
    for (const row of rows) {
      const mapped = applyMapping(row, mapping);
      const errors = validateRow(mapped);

      if (errors.length) {
        results.push({ sku: mapped.sku || '?', action: 'skip', errors });
        continue;
      }

      const existing = db.prepare(
        'SELECT v.id FROM variants v WHERE v.sku = ?'
      ).get(mapped.sku);

      if (existing) {
        const sets   = [];
        const values = [];
        for (const [k, v] of Object.entries(mapped)) {
          if (k === 'sku') continue;
          if (['wholesale_cost_pence','rrp_pence','retail_price_pence','stock_status'].includes(k)) {
            sets.push(`${k} = ?`);
            values.push(v);
          }
        }
        sets.push("updated_at = datetime('now')");
        values.push(existing.id);

        if (sets.length > 1) {
          db.prepare(`UPDATE variants SET ${sets.join(', ')} WHERE id = ?`).run(...values);
        }

        audit.log({ userId, entityType: 'variant', entityId: existing.id, action: 'import', details: { mapped, importFileId } });
        results.push({ sku: mapped.sku, action: 'updated', errors: [] });

      } else if (mode !== 'update_only') {
        // For create we need a product — look up by sku prefix or create minimal product
        // In practice, SKU on variant maps 1:1 with a product SKU in this catalogue
        let product = db.prepare('SELECT id FROM products WHERE sku = ?').get(mapped.sku);

        if (!product && mode === 'create') {
          const name = mapped.model_name || mapped.sku;
          const res  = db.prepare(`
            INSERT INTO products (supplier_id, sku, model_name, created_at, updated_at)
            VALUES (?, ?, ?, datetime('now'), datetime('now'))
          `).run(supplierId || null, mapped.sku, name);
          product = { id: res.lastInsertRowid };
          audit.log({ userId, entityType: 'product', entityId: product.id, action: 'import_create', details: { sku: mapped.sku } });
        }

        if (product) {
          const res = db.prepare(`
            INSERT INTO variants (product_id, sku, wholesale_cost_pence, rrp_pence, retail_price_pence, stock_status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `).run(
            product.id,
            mapped.sku,
            mapped.wholesale_cost_pence || 0,
            mapped.rrp_pence            || 0,
            mapped.retail_price_pence   || 0,
            mapped.stock_status         || 'Available',
          );
          audit.log({ userId, entityType: 'variant', entityId: res.lastInsertRowid, action: 'import_create', details: { mapped, importFileId } });
          results.push({ sku: mapped.sku, action: 'created', errors: [] });
        } else {
          results.push({ sku: mapped.sku, action: 'skip_no_product', errors: ['Product not found'] });
        }
      } else {
        results.push({ sku: mapped.sku, action: 'skip_not_found', errors: [] });
      }
    }
  });

  doWork();
  return results;
}

module.exports = { parseCSV, dryRun, runImport, FIELD_MAP };
