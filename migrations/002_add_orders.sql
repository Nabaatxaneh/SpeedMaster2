-- ─────────────────────────────────────────────────────────────────────────────
-- 002 Add Orders
-- ─────────────────────────────────────────────────────────────────────────────

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS orders (
  order_id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_reference       TEXT    NOT NULL UNIQUE,
  created_at            TEXT    NOT NULL DEFAULT (datetime('now')),

  -- Customer snapshot
  customer_name         TEXT    NOT NULL,
  customer_email        TEXT    NOT NULL,
  customer_phone        TEXT,
  shipping_address_line1 TEXT   NOT NULL,
  shipping_address_line2 TEXT,
  shipping_city         TEXT    NOT NULL,
  shipping_postcode     TEXT    NOT NULL,
  shipping_country      TEXT    NOT NULL DEFAULT 'GB',

  -- Product reference + snapshot
  product_id            INTEGER NOT NULL REFERENCES products(id),
  variant_id            INTEGER NOT NULL REFERENCES variants(id),
  sku                   TEXT    NOT NULL,
  product_name_snapshot TEXT    NOT NULL,

  -- Money (integer pence)
  retail_price_paid_pence   INTEGER NOT NULL,
  supplier_cost_basis_pence INTEGER NOT NULL,
  currency                  TEXT    NOT NULL DEFAULT 'GBP',

  -- Status
  supplier_payment_status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (supplier_payment_status IN ('Pending','Settled')),
  fulfillment_status TEXT NOT NULL DEFAULT 'Unfulfilled'
    CHECK (fulfillment_status IN ('Unfulfilled','Sent to Supplier','Shipped')),

  -- Fulfilment detail
  supplier_id           INTEGER REFERENCES suppliers(id),
  tracking_carrier      TEXT,
  tracking_number       TEXT,
  supplier_notified_at  TEXT,
  shipped_at            TEXT,
  settled_at            TEXT,
  payment_provider      TEXT,
  payment_provider_ref  TEXT,
  notes                 TEXT,

  -- Retry counter for SMTP failures
  notify_retry_count    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status    ON orders(supplier_payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status ON orders(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_orders_supplier_id       ON orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at        ON orders(created_at);
