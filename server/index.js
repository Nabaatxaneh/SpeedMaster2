'use strict';

require('dotenv').config();

const path    = require('path');
const fs      = require('fs');
const express = require('express');
const session = require('express-session');
const pino    = require('pino');

const { migrate } = require('./db');

// ── Logging ──────────────────────────────────────────────────────────────────
fs.mkdirSync(path.resolve('./logs'), { recursive: true });
const log = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
}, pino.multistream([
  { stream: process.stdout },
  { stream: fs.createWriteStream(path.resolve('./logs/app.log'), { flags: 'a' }) },
]));

// ── Database ─────────────────────────────────────────────────────────────────
const db = migrate();
log.info(`[db] using ${process.env.DATABASE_PATH || './data/speedmaster.db'}`);

// ── Session store ─────────────────────────────────────────────────────────────
const SqliteStore = require('better-sqlite3-session-store')(session);

// ── App ───────────────────────────────────────────────────────────────────────
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Capture raw body for HMAC verification on /api/orders BEFORE json parser.
// Setting req._body = true tells body-parser to skip this request.
app.use('/api/orders', (req, res, next) => {
  let data = [];
  req.on('data', chunk => data.push(chunk));
  req.on('end', () => {
    req.rawBody = Buffer.concat(data);
    try { req.body = JSON.parse(req.rawBody.toString()); } catch { req.body = {}; }
    req._body = true; // prevent body-parser from re-reading the consumed stream
    next();
  });
});

app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true, limit: '4mb' }));

app.use(session({
  store: new SqliteStore({ client: db }),
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  },
}));

// ── Static: admin assets ──────────────────────────────────────────────────────
app.use('/admin/static', express.static(path.join(__dirname, 'public/admin')));

// ── Static: uploaded media ────────────────────────────────────────────────────
fs.mkdirSync(path.resolve('./uploads'), { recursive: true });
app.use('/uploads', express.static(path.resolve('./uploads')));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/orders', require('./routes/api.orders'));
app.use('/api/seo',    require('./routes/api.seo'));

// ── Admin routes ──────────────────────────────────────────────────────────────
app.use('/admin', require('./routes/admin.auth'));
app.use('/admin', require('./routes/admin.dashboard'));
app.use('/admin/orders',         require('./routes/admin.orders'));
app.use('/admin/reconciliation', require('./routes/admin.reconciliation'));
app.use('/admin/products',       require('./routes/admin.products'));
app.use('/admin/variants',       require('./routes/admin.variants'));
app.use('/admin/pages',          require('./routes/admin.pages'));
app.use('/admin/media',          require('./routes/admin.media'));
app.use('/admin/suppliers',      require('./routes/admin.suppliers'));
app.use('/admin/imports',        require('./routes/admin.imports'));
app.use('/admin/users',          require('./routes/admin.users'));
app.use('/admin/settings',       require('./routes/admin.settings'));
app.use('/admin/audit',          require('./routes/admin.audit'));

// Redirect /admin → /admin/dashboard
app.get('/admin', (req, res) => res.redirect('/admin/dashboard'));

// ── Static: frontend files (serve existing HTML frontend) ─────────────────────
app.use(express.static(path.resolve('.')));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  if (req.path.startsWith('/admin')) {
    return res.status(404).render('admin/error', {
      title: '404 Not Found',
      message: `The page ${req.path} does not exist.`,
      user: req.session?.user,
    });
  }
  res.status(404).send('404 Not Found');
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  log.error(err);
  if (req.path.startsWith('/admin')) {
    return res.status(500).render('admin/error', {
      title: 'Server Error',
      message: process.env.NODE_ENV !== 'production' ? err.message : 'An unexpected error occurred.',
      user: req.session?.user,
    });
  }
  res.status(500).send('Internal Server Error');
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, () => {
  log.info(`SpeedMaster CMS running at http://localhost:${PORT}`);
  log.info(`Admin panel: http://localhost:${PORT}/admin`);
});
