-- ─────────────────────────────────────────────────────────────────────────────
-- 001 Initial Schema
-- Creates all base CMS tables. Prices are stored as INTEGER pence (GBP).
-- The existing demo DB at database/speedmaster.db is separate and untouched.
-- ─────────────────────────────────────────────────────────────────────────────

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ── Suppliers ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT    NOT NULL,
  contact_email     TEXT,
  contact_whatsapp  TEXT,                 -- E.164, e.g. +447700900123
  contact_phone     TEXT,
  shipping_sla      TEXT,
  flat_shipping_cost_pence INTEGER DEFAULT 0,
  notes             TEXT,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── Media library ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS media (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  filename      TEXT    NOT NULL,
  original_name TEXT    NOT NULL,
  alt_text      TEXT,
  size          INTEGER,
  mime_type     TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── Products ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id   INTEGER REFERENCES suppliers(id),
  sku           TEXT    NOT NULL UNIQUE,
  brand         TEXT,
  model_name    TEXT    NOT NULL,
  description   TEXT,
  category      TEXT,                     -- 'e-bike' | 'e-scooter' | 'dirt-bike' | 'parts'
  is_active     INTEGER NOT NULL DEFAULT 1,
  sales_channel_restrictions TEXT DEFAULT '[]',
  slug          TEXT    UNIQUE,
  meta_title    TEXT,
  meta_description TEXT,
  og_image_id   INTEGER REFERENCES media(id),
  canonical_url TEXT,
  robots        TEXT    NOT NULL DEFAULT 'index,follow',
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── Specifications ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS specifications (
  product_id      INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  battery_capacity TEXT,
  motor_power      TEXT,
  max_speed        TEXT,
  range            TEXT,
  tire_size        TEXT,
  max_load         TEXT,
  net_weight       TEXT,
  gross_weight     TEXT
);

-- ── Variants ─────────────────────────────────────────────────────────────────
-- Each variant is a purchasable SKU (product × color combination).
-- All prices in INTEGER pence to avoid floating-point drift.
CREATE TABLE IF NOT EXISTS variants (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id            INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku                   TEXT    NOT NULL UNIQUE,
  color                 TEXT,
  stock_status          TEXT    NOT NULL DEFAULT 'Available'
    CHECK (stock_status IN ('Available','Out of Stock','Pre-sale')),
  wholesale_cost_pence  INTEGER NOT NULL DEFAULT 0,
  rrp_pence             INTEGER NOT NULL DEFAULT 0,
  retail_price_pence    INTEGER NOT NULL DEFAULT 0,
  created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Enforce RRP floor: retail cannot be set below RRP
CREATE TRIGGER IF NOT EXISTS trg_variant_rrp_insert
BEFORE INSERT ON variants
BEGIN
  SELECT CASE
    WHEN NEW.retail_price_pence < NEW.rrp_pence
    THEN RAISE(ABORT, 'RRP_VIOLATION: retail_price_pence cannot be below rrp_pence')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_variant_rrp_update
BEFORE UPDATE OF retail_price_pence, rrp_pence ON variants
BEGIN
  SELECT CASE
    WHEN NEW.retail_price_pence < NEW.rrp_pence
    THEN RAISE(ABORT, 'RRP_VIOLATION: retail_price_pence cannot be below rrp_pence')
  END;
END;

-- ── CMS Pages ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pages (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  slug             TEXT    NOT NULL UNIQUE,
  title            TEXT    NOT NULL,
  content          TEXT    NOT NULL DEFAULT '{}',   -- JSON blob of content blocks
  meta_title       TEXT,
  meta_description TEXT,
  og_image_id      INTEGER REFERENCES media(id),
  canonical_url    TEXT,
  robots           TEXT    NOT NULL DEFAULT 'index,follow',
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── Admin users ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  email           TEXT    NOT NULL UNIQUE,
  password_hash   TEXT    NOT NULL,
  name            TEXT    NOT NULL,
  role            TEXT    NOT NULL DEFAULT 'editor'
    CHECK (role IN ('admin','editor')),
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until    TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── Site settings ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('brand_name',         'SpeedMaster'),
  ('brand_domain',       'www.speedmaster.bike'),
  ('ops_email',          'ops@speedmaster.bike'),
  ('currency',           'GBP'),
  ('default_robots',     'index,follow');

-- ── Import files log ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS import_files (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  filename    TEXT    NOT NULL,
  path        TEXT    NOT NULL,
  type        TEXT    NOT NULL CHECK (type IN ('csv','pdf')),
  supplier_id INTEGER REFERENCES suppliers(id),
  imported_at TEXT    NOT NULL DEFAULT (datetime('now')),
  row_count   INTEGER,
  result      TEXT                           -- JSON summary
);

-- ── Import column mappings (saved per supplier) ──────────────────────────────
CREATE TABLE IF NOT EXISTS import_mappings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER REFERENCES suppliers(id),
  mappings    TEXT    NOT NULL DEFAULT '{}', -- JSON { csvCol: dbField }
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── Audit log ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ts          TEXT    NOT NULL DEFAULT (datetime('now')),
  user_id     INTEGER REFERENCES users(id),
  entity_type TEXT    NOT NULL,
  entity_id   TEXT    NOT NULL,
  action      TEXT    NOT NULL,
  details     TEXT                           -- JSON before/after
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_ts     ON audit_log(ts);
