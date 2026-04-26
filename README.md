# SpeedMaster — Static E-Commerce Site

## How to Open

Open `index.html` in any modern browser. No build step required.

To serve locally (recommended for correct asset paths):
```
node serve.mjs
```
Then visit `http://localhost:3000`

## File Structure

```
SpeedMaster2/
├── index.html                          # Homepage
├── README.md                           # This file
├── serve.mjs                           # Local dev server
├── screenshot.mjs                      # Puppeteer screenshot tool
│
├── assets/
│   ├── css/
│   │   └── global.css                  # All site-wide CSS (tokens, reset, components)
│   └── js/
│       └── main.js                     # All site-wide JS (header/footer injection, cart, mobile nav)
│
├── brand_assets/
│   └── logo.png                        # SpeedMaster logo
│
├── collections/
│   ├── e-scooters.html                 # Electric Scooters collection (12 products)
│   ├── e-bikes.html                    # Electric Bikes collection (12 products)
│   ├── parts-accessories.html          # Parts & Accessories collection (12 products)
│   └── all-products.html               # All Products collection (12 products)
│
├── products/
│   └── product-template.html           # Product Detail Page (SpeedMaster X1 Pro example)
│
└── pages/
    ├── repairs.html                    # Repairs & Servicing (booking form, pricing, FAQ)
    ├── stores.html                     # All Stores overview
    ├── store-birmingham.html           # Birmingham store page
    ├── store-manchester.html           # Manchester store page
    ├── store-glasgow.html              # Glasgow store page
    ├── store-edinburgh.html            # Edinburgh store page
    ├── finance.html                    # Finance & Klarna options
    ├── about.html                      # About Us
    ├── contact.html                    # Contact page (form + details)
    ├── faqs.html                       # FAQs (accordion)
    ├── privacy.html                    # Privacy Policy
    ├── terms.html                      # Terms of Service
    ├── cookies.html                    # Cookie Policy
    └── accessibility.html             # Accessibility Statement
```

## Navigation Map

| Page | URL | Links from |
|------|-----|------------|
| Homepage | `index.html` | All pages → header logo |
| E-Scooters | `collections/e-scooters.html` | Nav, homepage category card, footer |
| E-Bikes | `collections/e-bikes.html` | Nav, homepage category card, footer |
| Parts & Accessories | `collections/parts-accessories.html` | Nav, footer |
| All Products | `collections/all-products.html` | Homepage "View All" button, cart drawer |
| Product Template | `products/product-template.html` | All product cards site-wide |
| Repairs | `pages/repairs.html` | Nav, footer, homepage CTA |
| All Stores | `pages/stores.html` | Nav, footer, homepage |
| Birmingham Store | `pages/store-birmingham.html` | Footer, stores page |
| Manchester Store | `pages/store-manchester.html` | Footer, stores page |
| Glasgow Store | `pages/store-glasgow.html` | Footer, stores page |
| Edinburgh Store | `pages/store-edinburgh.html` | Footer, stores page |
| Finance | `pages/finance.html` | Footer, announcement bar, PDP |
| About Us | `pages/about.html` | Footer |
| Contact | `pages/contact.html` | Footer |
| FAQs | `pages/faqs.html` | (linked from repairs and contact) |
| Privacy Policy | `pages/privacy.html` | Footer legal bar |
| Terms of Service | `pages/terms.html` | Footer legal bar |
| Cookie Policy | `pages/cookies.html` | Footer legal bar |
| Accessibility | `pages/accessibility.html` | Footer legal bar |

## Architecture Notes

- **Header & footer** are injected by `assets/js/main.js` via `<div id="sm-header">` and `<div id="sm-footer">` placeholders on every page.
- **Root path detection** in `main.js` automatically prefixes all links with `../` for pages in `/collections/`, `/products/`, or `/pages/`, and no prefix for the homepage.
- **Cart drawer** is injected by `main.js` and slides in from the right. Currently shows empty state only (no real cart logic).
- **Announcement bar** rotates 3 messages every 4 seconds.
- **Mobile nav** toggles via hamburger button at <768px viewport width.
- **Accordion, PDP tabs, filter tabs, qty selector** are all handled in `main.js`.

## TODOs / Placeholders

- **Replace placehold.co images** with real product photos
- **Replace placeholder copy** with real product descriptions and marketing text
- **Wire up all forms** to a real backend (booking, contact, newsletter — currently submit does nothing)
- **Download and self-host Exo 2 font** for true offline support (currently loads from Google Fonts CDN)
- **Implement real cart/checkout logic** — add to cart, update quantities, checkout flow
- **Replace map placeholder divs** with real Google Maps embeds (requires Google Maps API key)
- **Add real product data** — full catalogue, filtering logic, search
- **Add cookie consent banner** — currently referenced in cookie policy but not implemented
- **SEO metadata** — add Open Graph tags, structured data (Product schema), sitemap.xml, robots.txt
- **Analytics** — wire up Google Analytics or equivalent
- **Payment integration** — Klarna, Stripe, or similar payment processor
- **User accounts** — login, order history, saved addresses
- **Stock management** — real-time stock levels from backend
- **Product variants** — colour/size selection with separate SKUs
- **Review system** — real customer reviews integration (Trustpilot or similar)
