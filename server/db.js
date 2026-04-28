'use strict';

const path = require('path');
const fs   = require('fs');
require('dotenv').config();

const Database = require('better-sqlite3');

const DB_PATH = path.resolve(process.env.DATABASE_PATH || './data/speedmaster.db');
const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');

let _db;

function getDb() {
  if (!_db) throw new Error('Database not initialised — call migrate() first');
  return _db;
}

function migrate() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  _db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const applied = new Set(
    _db.prepare('SELECT filename FROM _migrations').all().map(r => r.filename)
  );

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    _db.exec(sql);
    _db.prepare('INSERT INTO _migrations (filename) VALUES (?)').run(file);
    console.log(`[db] applied migration: ${file}`);
  }

  return _db;
}

module.exports = { getDb, migrate };
