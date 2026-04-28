# SpeedMaster CMS

## Discovery Summary (§0)

**What existed before this CMS was added:**

The repo contained a fully-static HTML/CSS/JS e-commerce frontend (homepage, collection pages, product detail, checkout flow, account pages) with all state stored in `localStorage`. A Python script at `database/create_db.py` created a demo SQLite database at `database/speedmaster.db` with five tables — `Supplier`, `Product`, `Pricing`, `Specifications`, and `Variants` — seeded with 33 real products across two suppliers (KOOLUX and VIPCOO/iENYRID/Hidoes). Prices were stored as REAL (decimal £), table names were PascalCase, and there were no `orders`, `users`, `pages`, `audit_log`, or any server-side session tables.

**How this CMS extends it:**

The CMS creates a new database at `./data/speedmaster.db` (separate from the demo DB). Migrations translate the existing schema into a new lowercase, integer-pence schema (`suppliers`, `products`, `variants`, etc.) and add the full CMS surface on top: `orders`, `pages`, `users`, `media`, `settings`, `audit_log`, `import_files`, and `import_mappings`. The existing frontend is served unchanged by the Express server (which replaces `serve.mjs` as the dev server). SEO data is served via a runtime JSON API (`GET /api/seo/:type/:slug`) which the static frontend can optionally fetch; existing inline `<meta>` tags continue to work without changes.

**Conflicts noted:**
- Existing schema: PascalCase names, REAL prices, SKU on `Product` not `Variants`, no `contact_whatsapp`, no `pages`/`orders`/`users`.
- Resolution: New CMS schema is authoritative. Demo DB at `database/speedmaster.db` is untouched and can be used for reference or discarded.
- Existing `serve.mjs` is superseded by `npm run dev` (`server/index.js`) which serves both the frontend and the admin.

---

## Quick Start (Windows + Git Bash)

```bash
# 1. Install dependencies
npm install

# 2. Create .env from example and fill in values
cp .env.example .env
# Edit .env — at minimum set SESSION_SECRET and ORDERS_API_SECRET

# 3. Seed the database (creates ./data/speedmaster.db, applies migrations, inserts demo data)
npm run seed

# 4. Start the dev server
npm run dev
# → http://localhost:3000        (frontend)
# → http://localhost:3000/admin  (admin panel)
```

**First sign-in:**
| Field | Value |
|-------|-------|
| Email | `admin@speedmaster.bike` |
| Password | `change-me-on-first-login` |

Change the password immediately via `/admin/users`.

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the CMS + frontend server |
| `npm run seed` | Apply migrations and insert seed data |
| `npm run serve-frontend` | Start the original static server (port 3000, no admin) |

---

## Project Structure

```
/
├── server/
│   ├── index.js                      # Express bootstrap + static serving
│   ├── db.js                         # better-sqlite3 + migration runner
│   ├── auth.js                       # bcrypt, session, account lockout
│   ├── routes/
│   │   ├── api.orders.js             # POST /api/orders (HMAC-signed)
│   │   ├── api.seo.js                # GET /api/seo/:type/:slug
│   │   ├── admin.auth.js             # /admin/login, /admin/logout
│   │   ├── admin.dashboard.js        # /admin/dashboard
│   │   ├── admin.orders.js           # /admin/orders
│   │   ├── admin.reconciliation.js   # /admin/reconciliation
│   │   ├── admin.products.js         # /admin/products
│   │   ├── admin.variants.js         # /admin/variants
│   │   ├── admin.pages.js            # /admin/pages
│   │   ├── admin.media.js            # /admin/media
│   │   ├── admin.suppliers.js        # /admin/suppliers
│   │   ├── admin.imports.js          # /admin/imports
│   │   ├── admin.users.js            # /admin/users
│   │   ├── admin.settings.js         # /admin/settings
│   │   └── admin.audit.js            # /admin/audit
│   ├── automations/
│   │   ├── notify-supplier.js        # Email supplier on order creation
│   │   ├── customer-shipped.js       # Email customer when order ships
│   │   └── whatsapp-link.js          # Build WhatsApp click-to-chat URL
│   ├── importers/
│   │   ├── csv.js                    # Parse, dry-run, apply CSV imports
│   │   └── pdf.js                    # Extract text + heuristic table detection
│   ├── templates/email/
│   │   ├── supplier-order.ejs        # Supplier notification email
│   │   └── customer-shipped.ejs      # Customer dispatch email
│   ├── views/admin/                  # All EJS admin templates
│   ├── util/
│   │   ├── money.js                  # toPence / formatGBP
│   │   ├── slug.js                   # toSlug
│   │   └── audit.js                  # audit.log(...)
│   └── public/admin/                 # admin.css + admin.js
├── migrations/
│   ├── 001_initial_schema.sql        # All base tables
│   └── 002_add_orders.sql            # Orders table + indexes
├── scripts/
│   └── seed.js                       # npm run seed
├── data/
│   └── speedmaster.db                # SQLite DB (gitignored)
├── uploads/                          # Uploaded files (gitignored)
├── logs/                             # Pino log files (gitignored)
├── .env.example
└── package.json
```

---

## Backing Up the Database

The entire CMS state is in a single file: `./data/speedmaster.db`.

```bash
# Simple file copy (safe with WAL mode when no writes are in flight)
cp data/speedmaster.db data/speedmaster-backup-$(date +%Y%m%d).db

# Or use SQLite's online backup
sqlite3 data/speedmaster.db ".backup data/speedmaster-backup.db"
```

For production, schedule a daily backup using Windows Task Scheduler or a cron job and copy to an offsite location (S3, etc.).

---

## HMAC Signing Recipe (POST /api/orders)

The frontend must sign the raw JSON body with **HMAC-SHA256** using the shared secret in `ORDERS_API_SECRET`.

### JavaScript (frontend / Node.js)

```javascript
const crypto = require('crypto'); // Node.js built-in

async function placeOrder(payload) {
  const body = JSON.stringify(payload);
  const sig  = crypto
    .createHmac('sha256', process.env.ORDERS_API_SECRET)
    .update(body)
    .digest('hex');

  const res = await fetch('https://YOUR_DOMAIN/api/orders', {
    method:  'POST',
    headers: {
      'Content-Type':             'application/json',
      'X-SpeedMaster-Signature':  sig,
    },
    body,
  });
  return res.json(); // { order_id, order_reference }
}
```

### Payload shape

```json
{
  "payment_provider":     "stripe",
  "payment_provider_ref": "ch_3PqXyZ...",
  "customer": {
    "name":          "Alice Johnson",
    "email":         "alice@example.com",
    "phone":         "+447700900123",
    "address_line1": "12 High Street",
    "address_line2": "",
    "city":          "London",
    "postcode":      "EC1A 1BB",
    "country":       "GB"
  },
  "items": [
    {
      "variant_id":              42,
      "retail_price_paid_pence": 86900
    }
  ]
}
```

**Prices are in integer pence.** £869.00 → `86900`.

**Validation rules applied server-side:**
- HMAC mismatch → 401
- `retail_price_paid_pence < variant.rrp_pence` → 422 `{ code: "RRP_VIOLATION" }`
- Unknown `variant_id` → 422

---

## Decisions Made

| Decision | Choice | Reason |
|----------|--------|--------|
| CMS DB path | `./data/speedmaster.db` | Separate from the demo Python DB at `database/speedmaster.db` |
| SEO wiring | Runtime API (`GET /api/seo/:type/:slug`) | The frontend is static HTML; the endpoint is available for future SPA or SSG use. Existing inline `<meta>` tags are not removed. |
| PDF import | Assisted (show candidate CSV, admin edits) | PDF parsing is heuristic; forcing a manual review step prevents silent bad imports |
| Carrier tracking URLs | Royal Mail, DPD, DHL, Evri, ParcelForce | Covers the main UK carriers; admin can note other carriers as plain text |
| Pagination size | 25 (orders/products), 50 (variants/reconciliation) | Balances information density with page performance |
| Session duration | 8 hours | Covers a full working day without forcing re-login |
| Account lockout | 5 failed attempts → 15-minute lockout | Standard brute-force protection |

---

## TODOs / Known Gaps

- **SMTP in production:** Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` in `.env`. For local dev, use [Mailpit](https://mailpit.axllent.org/) (`smtp://localhost:1025`).
- **ORDERS_API_SECRET:** Must be shared with the frontend Stripe/payment completion webhook. Keep it out of version control.
- **Image CDN:** Uploaded images are served from `./uploads/` — consider object storage (S3/Cloudflare R2) in production.
- **Log rotation:** Pino writes to `./logs/app.log` indefinitely. Add a log rotation tool (e.g. `logrotate` or `pino-roll`) for production.
- **Variant SKU generation:** The seed manually appends `-GRAY`, `-RED` etc. A UI for adding new variants to a product should be built as a follow-up to the product edit page.
- **Supplier WhatsApp for real numbers:** The seed uses a Chinese mobile number from the demo data; replace with a real UK WhatsApp Business number once onboarded.
- **Production domain:** Replace `www.speedmaster.bike` in `.env` (`BRAND_DOMAIN`) and SMTP `From` header before going live.
