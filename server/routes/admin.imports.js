'use strict';

const express          = require('express');
const multer           = require('multer');
const path             = require('path');
const fs               = require('fs');
const { requireLogin } = require('../auth');
const { getDb }        = require('../db');
const csvImporter      = require('../importers/csv');
const pdfImporter      = require('../importers/pdf');
const audit            = require('../util/audit');
const router           = express.Router();

const IMPORT_DIR = path.resolve('./uploads/imports');
fs.mkdirSync(IMPORT_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const d = path.join(IMPORT_DIR, new Date().getFullYear().toString(), String(new Date().getMonth() + 1).padStart(2, '0'));
    fs.mkdirSync(d, { recursive: true });
    cb(null, d);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

router.get('/', requireLogin, (req, res) => {
  const db = getDb();
  const imports   = db.prepare('SELECT i.*, s.name AS supplier_name FROM import_files i LEFT JOIN suppliers s ON s.id = i.supplier_id ORDER BY i.imported_at DESC LIMIT 20').all();
  const suppliers = db.prepare('SELECT id, name FROM suppliers ORDER BY name').all();

  res.render('admin/imports', {
    title: 'Imports',
    user: req.session.user,
    imports, suppliers,
    flash: req.session.flash || null,
  });
  delete req.session.flash;
});

// Step 1: Upload + parse
router.post('/upload', requireLogin, upload.single('file'), async (req, res) => {
  const file        = req.file;
  const supplier_id = req.body.supplier_id || null;
  if (!file) { req.session.flash = { type: 'error', message: 'No file selected.' }; return res.redirect('/admin/imports'); }

  const ext = path.extname(file.originalname).toLowerCase();
  let previewRows = [], headers = [], rawText = '';

  if (ext === '.csv') {
    const text   = fs.readFileSync(file.path, 'utf8');
    const parsed = csvImporter.parseCSV(text);
    headers     = parsed.meta.fields || [];
    previewRows = parsed.data.slice(0, 20);

    req.session.importState = { filePath: file.path, filename: file.originalname, type: 'csv', headers, supplier_id };
  } else if (ext === '.pdf') {
    const buffer    = fs.readFileSync(file.path);
    const { rows, header, rawText: rt } = pdfImporter.detectTable(await pdfImporter.extractText(buffer));
    headers     = header;
    previewRows = rows.slice(0, 20);
    rawText     = rt;

    req.session.importState = { filePath: file.path, filename: file.originalname, type: 'pdf', candidateRows: rows, rawText, supplier_id };
  } else {
    req.session.flash = { type: 'error', message: 'Only .csv and .pdf files are supported.' };
    return res.redirect('/admin/imports');
  }

  const savedMapping = supplier_id
    ? JSON.parse(db.prepare('SELECT mappings FROM import_mappings WHERE supplier_id = ?').get(supplier_id)?.mappings || '{}')
    : {};

  res.render('admin/import-map', {
    title: 'Map Columns',
    user: req.session.user,
    headers, previewRows, rawText,
    fieldOptions: Object.keys(csvImporter.FIELD_MAP),
    savedMapping,
    type: ext.replace('.', ''),
  });
});

// Step 2: Dry-run
router.post('/dryrun', requireLogin, (req, res) => {
  const state = req.session.importState;
  if (!state) { req.session.flash = { type: 'error', message: 'Session expired. Please re-upload.' }; return res.redirect('/admin/imports'); }

  const mapping  = JSON.parse(req.body.mapping || '{}');
  const mode     = req.body.mode || 'update_only';
  const db       = getDb();

  // Save mapping for this supplier
  if (state.supplier_id) {
    const existing = db.prepare('SELECT id FROM import_mappings WHERE supplier_id = ?').get(state.supplier_id);
    if (existing) {
      db.prepare("UPDATE import_mappings SET mappings=?, updated_at=datetime('now') WHERE supplier_id=?").run(JSON.stringify(mapping), state.supplier_id);
    } else {
      db.prepare("INSERT INTO import_mappings (supplier_id, mappings) VALUES (?,?)").run(state.supplier_id, JSON.stringify(mapping));
    }
  }

  let rows;
  if (state.type === 'csv') {
    const text   = fs.readFileSync(state.filePath, 'utf8');
    const parsed = csvImporter.parseCSV(text);
    rows = parsed.data;
  } else {
    rows = state.candidateRows || [];
  }

  const results = csvImporter.dryRun(rows, mapping, mode, state.supplier_id);
  const counts  = { update: 0, create: 0, skip: 0, error: 0 };
  for (const r of results) {
    if (r.errors?.length)         counts.error++;
    else if (r.action === 'update')  counts.update++;
    else if (r.action === 'create')  counts.create++;
    else                             counts.skip++;
  }

  req.session.importState = { ...state, mapping, mode, rows };

  res.render('admin/import-dryrun', {
    title: 'Import Preview',
    user: req.session.user,
    results, counts,
    allowBelowRrp: req.body.allow_below_rrp === '1',
  });
});

// Step 3: Confirm
router.post('/confirm', requireLogin, (req, res) => {
  const state = req.session.importState;
  if (!state) { req.session.flash = { type: 'error', message: 'Session expired.' }; return res.redirect('/admin/imports'); }

  const db = getDb();
  const { mapping, mode, rows, filePath, filename, supplier_id, type } = state;

  const r = db.prepare(`
    INSERT INTO import_files (filename, path, type, supplier_id, row_count)
    VALUES (?,?,?,?,?)
  `).run(filename, filePath, type, supplier_id || null, rows.length);

  const results = csvImporter.runImport(rows, mapping, mode, supplier_id, req.session.user.id, r.lastInsertRowid);
  const counts  = { updated: 0, created: 0, skipped: 0, failed: 0 };
  for (const row of results) {
    if (row.errors?.length)          counts.failed++;
    else if (row.action === 'updated') counts.updated++;
    else if (row.action === 'created') counts.created++;
    else                               counts.skipped++;
  }

  db.prepare("UPDATE import_files SET result=? WHERE id=?").run(JSON.stringify(counts), r.lastInsertRowid);
  audit.log({ userId: req.session.user.id, entityType: 'import', entityId: r.lastInsertRowid, action: 'import', details: counts });

  delete req.session.importState;
  req.session.flash = {
    type: 'success',
    message: `Import complete: ${counts.updated} updated, ${counts.created} created, ${counts.skipped} skipped, ${counts.failed} failed.`,
  };
  res.redirect('/admin/imports');
});

module.exports = router;
