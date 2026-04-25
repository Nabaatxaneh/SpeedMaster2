# SpeedMaster — Design Guidelines

> **Brand:** SpeedMaster
> **Domain:** www.speedmaster.bike
> **Category:** E-commerce — electric bicycles & scooters
> **Last updated:** 2026-04-25

This document is the single source of truth for the SpeedMaster web frontend. It is written to be read by Claude Code: rules are explicit, values are copy-pasteable, and every token has a name. When in doubt, follow the tokens defined here exactly — do not invent new colors, font sizes, or spacing values.

---

## 1. Brand foundation

SpeedMaster sells electric bicycles and scooters. The brand voice is **bold, energetic, and confident** — sporty rather than luxurious, urban rather than rugged. The visual system reflects this: high-contrast black backgrounds with a single vivid yellow accent, heavy sans-serif type, and minimal ornamentation.

**Logo usage**

- The primary logo is the stacked "SPEED / MASTER" mark on a black background (file: `logo.png`).
- Always preserve clear space equal to the cap-height of the "S" on all sides.
- Minimum display width: 96px on screen.
- Never recolor, skew, add effects, or place the logo on a busy photographic background without a solid black backing plate.
- For light backgrounds, use the logo on its native black tile rather than inverting the colors.

---

## 2. Color tokens

Colors are defined as CSS custom properties on `:root`. Always reference tokens, never raw hex values, in component code.

```css
:root {
  /* Brand */
  --color-brand-yellow: #F8E300;       /* Primary accent, CTAs, highlights */
  --color-brand-yellow-hover: #FFEC1F; /* Hover state for yellow buttons */
  --color-brand-yellow-active: #D9C700;/* Pressed state */
  --color-brand-black: #0E0E0E;        /* Primary brand black (matches logo bg) */

  /* Neutrals */
  --color-bg: #FFFFFF;                 /* Default page background */
  --color-bg-inverse: #0E0E0E;         /* Dark sections, hero, footer */
  --color-bg-subtle: #F7F7F5;          /* Cards, alt sections */
  --color-bg-muted: #EFEEE9;           /* Off-white, matches logo light tone */

  --color-text: #0E0E0E;               /* Body text on light bg */
  --color-text-muted: #5A5A58;         /* Secondary text, captions */
  --color-text-inverse: #FFFFFF;       /* Text on dark bg */
  --color-text-on-yellow: #0E0E0E;     /* Always black on yellow — never white */

  --color-border: #E5E4DF;             /* Default borders, dividers */
  --color-border-strong: #0E0E0E;

  /* Semantic */
  --color-success: #1F9D55;
  --color-warning: #E0A800;
  --color-danger:  #D93025;
  --color-info:    #2563EB;

  /* Price / promo */
  --color-price: #0E0E0E;
  --color-price-sale: #D93025;
}
```

**Contrast rules**

- Yellow (`--color-brand-yellow`) must always pair with `--color-text-on-yellow` (black). Never place white text on yellow — it fails WCAG AA.
- Body text on white must be `--color-text` or darker.
- Body text on `--color-bg-inverse` must be `--color-text-inverse` or `--color-bg-muted`.

---

## 3. Typography

The single typeface across the site is **Exo 2**, served from Google Fonts.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
```

```css
:root {
  --font-sans: 'Exo 2', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;

  /* Weights */
  --fw-regular:  400;
  --fw-medium:   500;
  --fw-semibold: 600;
  --fw-bold:     700;
  --fw-extrabold:800;
  --fw-black:    900;

  /* Type scale (rem assumes 16px root) */
  --fs-xs:   0.75rem;   /* 12px — micro labels */
  --fs-sm:   0.875rem;  /* 14px — captions, meta */
  --fs-base: 1rem;      /* 16px — body */
  --fs-lg:   1.125rem;  /* 18px — large body, lead */
  --fs-xl:   1.25rem;   /* 20px — small headings */
  --fs-2xl:  1.5rem;    /* 24px — h4 */
  --fs-3xl:  1.875rem;  /* 30px — h3 */
  --fs-4xl:  2.5rem;    /* 40px — h2 */
  --fs-5xl:  3.5rem;    /* 56px — h1 */
  --fs-6xl:  4.5rem;    /* 72px — hero display */

  --lh-tight:   1.1;
  --lh-snug:    1.25;
  --lh-normal:  1.5;
  --lh-relaxed: 1.65;
}

body {
  font-family: var(--font-sans);
  font-size: var(--fs-base);
  line-height: var(--lh-normal);
  color: var(--color-text);
  background: var(--color-bg);
}
```

**Heading rules**

- Display and H1 use `--fw-black` (900) and uppercase to echo the logo.
- H2–H4 use `--fw-extrabold` (800), sentence case.
- Body copy uses `--fw-regular` (400) at `--fs-base`.
- Buttons use `--fw-bold` (700) uppercase with letter-spacing `0.04em`.
- Never use italics for emphasis — use `--fw-bold` instead.

```css
h1, .h1 { font-size: var(--fs-5xl); font-weight: var(--fw-black); line-height: var(--lh-tight); text-transform: uppercase; letter-spacing: -0.01em; }
h2, .h2 { font-size: var(--fs-4xl); font-weight: var(--fw-extrabold); line-height: var(--lh-snug); }
h3, .h3 { font-size: var(--fs-3xl); font-weight: var(--fw-extrabold); line-height: var(--lh-snug); }
h4, .h4 { font-size: var(--fs-2xl); font-weight: var(--fw-bold); line-height: var(--lh-snug); }
```

---

## 4. Spacing, radius, elevation

```css
:root {
  /* Spacing — 4px base scale */
  --space-1:  0.25rem;   /* 4 */
  --space-2:  0.5rem;    /* 8 */
  --space-3:  0.75rem;   /* 12 */
  --space-4:  1rem;      /* 16 */
  --space-5:  1.5rem;    /* 24 */
  --space-6:  2rem;      /* 32 */
  --space-7:  2.5rem;    /* 40 */
  --space-8:  3rem;      /* 48 */
  --space-9:  4rem;      /* 64 */
  --space-10: 6rem;      /* 96 */
  --space-11: 8rem;      /* 128 */

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 20px;
  --radius-pill: 9999px;

  /* Elevation */
  --shadow-sm: 0 1px 2px rgba(14, 14, 14, 0.06);
  --shadow-md: 0 4px 12px rgba(14, 14, 14, 0.08);
  --shadow-lg: 0 12px 32px rgba(14, 14, 14, 0.12);
  --shadow-yellow: 0 6px 20px rgba(248, 227, 0, 0.35);

  /* Motion */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --duration-fast: 120ms;
  --duration-base: 200ms;
  --duration-slow: 320ms;
}
```

---

## 5. Layout

```css
:root {
  --container-max: 1280px;
  --container-pad: var(--space-5);

  /* Breakpoints — used in JS; in CSS use the @media queries below */
  --bp-sm: 640px;
  --bp-md: 768px;
  --bp-lg: 1024px;
  --bp-xl: 1280px;
}

.container {
  max-width: var(--container-max);
  margin-inline: auto;
  padding-inline: var(--container-pad);
}

@media (min-width: 768px) { :root { --container-pad: var(--space-6); } }
@media (min-width: 1024px){ :root { --container-pad: var(--space-8); } }
```

Mobile-first. All components must work at 360px width minimum. Use CSS Grid for product listings, Flexbox for navigation and cards.

---

## 6. Core components

### 6.1 Buttons

Three variants only: **primary**, **secondary**, **ghost**. Do not introduce additional variants without updating this document.

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  font-family: var(--font-sans);
  font-weight: var(--fw-bold);
  font-size: var(--fs-base);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-radius: var(--radius-md);
  border: 2px solid transparent;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-base) var(--ease-out);
}
.btn:active { transform: translateY(1px); }
.btn:focus-visible { outline: 3px solid var(--color-brand-yellow); outline-offset: 2px; }

.btn--primary {
  background: var(--color-brand-yellow);
  color: var(--color-text-on-yellow);
}
.btn--primary:hover { background: var(--color-brand-yellow-hover); box-shadow: var(--shadow-yellow); }
.btn--primary:active { background: var(--color-brand-yellow-active); }

.btn--secondary {
  background: var(--color-brand-black);
  color: var(--color-text-inverse);
}
.btn--secondary:hover { background: #2a2a2a; }

.btn--ghost {
  background: transparent;
  color: var(--color-text);
  border-color: var(--color-border-strong);
}
.btn--ghost:hover { background: var(--color-bg-muted); }

.btn--sm { padding: var(--space-2) var(--space-4); font-size: var(--fs-sm); }
.btn--lg { padding: var(--space-4) var(--space-7); font-size: var(--fs-lg); }
```

**Rules**

- Primary CTA per page section: exactly one. "Add to cart", "Buy now", and "Checkout" are always primary.
- Secondary actions ("View details", "Compare") use `--btn--ghost` or `--btn--secondary`.
- Never stack two yellow buttons next to each other.

### 6.2 Product card

```html
<article class="product-card">
  <a class="product-card__media" href="...">
    <img src="..." alt="..." loading="lazy">
    <span class="badge badge--sale">-15%</span>
  </a>
  <div class="product-card__body">
    <p class="product-card__category">E-Bike</p>
    <h3 class="product-card__title">SpeedMaster X1 Pro</h3>
    <div class="product-card__price">
      <span class="price">£2,199</span>
      <span class="price price--was">£2,599</span>
    </div>
    <button class="btn btn--primary btn--sm">Add to cart</button>
  </div>
</article>
```

```css
.product-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: transform var(--duration-base) var(--ease-out),
              box-shadow var(--duration-base) var(--ease-out);
}
.product-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.product-card__media { aspect-ratio: 4 / 3; background: var(--color-bg-muted); display:block; }
.product-card__body { padding: var(--space-5); display: flex; flex-direction: column; gap: var(--space-2); }
.product-card__category { font-size: var(--fs-xs); text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-muted); }
.product-card__title { font-size: var(--fs-lg); font-weight: var(--fw-bold); }
.price { font-weight: var(--fw-extrabold); font-size: var(--fs-xl); }
.price--was { font-weight: var(--fw-medium); font-size: var(--fs-base); color: var(--color-text-muted); text-decoration: line-through; }
```

### 6.3 Badges

```css
.badge {
  display: inline-flex; align-items: center;
  padding: var(--space-1) var(--space-3);
  font-size: var(--fs-xs); font-weight: var(--fw-bold);
  text-transform: uppercase; letter-spacing: 0.06em;
  border-radius: var(--radius-pill);
}
.badge--new      { background: var(--color-brand-yellow); color: var(--color-text-on-yellow); }
.badge--sale     { background: var(--color-danger);       color: #fff; }
.badge--instock  { background: var(--color-success);      color: #fff; }
.badge--lowstock { background: var(--color-warning);      color: var(--color-brand-black); }
```

### 6.4 Forms

- Inputs are full-width by default with `--radius-md` corners and a 2px focus ring in yellow.
- Labels sit above inputs, never inside as placeholders alone.
- Required fields use a yellow asterisk, not red.

```css
.field { display: flex; flex-direction: column; gap: var(--space-2); }
.field__label { font-size: var(--fs-sm); font-weight: var(--fw-semibold); }
.field__input {
  font: inherit;
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
}
.field__input:focus {
  outline: none;
  border-color: var(--color-brand-black);
  box-shadow: 0 0 0 3px var(--color-brand-yellow);
}
.field__input[aria-invalid="true"] { border-color: var(--color-danger); }
.field__error { font-size: var(--fs-sm); color: var(--color-danger); }
```

### 6.5 Header & navigation

- Sticky on scroll, white background, 1px bottom border using `--color-border`.
- Logo on the left at 40px height. Primary nav center. Search, account, cart on the right.
- Cart icon shows item count in a yellow pill badge.
- Mobile (< 768px) collapses primary nav into a hamburger drawer.

### 6.6 Footer

- Background: `--color-bg-inverse`. Text: `--color-text-inverse`.
- 4 columns on desktop: Shop, Support, Company, Newsletter. Stacks to 1 column on mobile.
- Bottom row: copyright, legal links, payment method icons.

---

## 7. Imagery

- Product photography: white or `--color-bg-muted` background, 4:3 aspect ratio for cards, 1:1 for galleries.
- Lifestyle photography: outdoor/urban riding shots, slight desaturation acceptable, avoid heavy filters.
- Always set explicit `width`, `height`, and `alt` attributes. Use `loading="lazy"` for below-the-fold images.
- Prefer modern formats: serve WebP with PNG/JPG fallback; serve AVIF where the build pipeline supports it.

---

## 8. Accessibility

- Target WCAG 2.1 AA across the site.
- All interactive elements must have a visible `:focus-visible` state — the default is a 3px yellow outline at 2px offset.
- Tap targets must be at least 44 × 44 px on mobile.
- Form controls must have associated `<label>` elements.
- Color is never the only signal for state — pair color with icons or text (e.g., "In stock ✓").
- Respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 9. File & code conventions for Claude Code

When generating or editing code in this repository:

- **CSS variables only** for colors, spacing, type sizes, radii, shadows, and motion. Do not hardcode hex codes or pixel values that exist as a token.
- **Class naming:** BEM (`block__element--modifier`). Utility classes are allowed for layout (`.container`, `.grid`, `.stack`) but not for one-off styling.
- **Component files:** one component per file. Co-locate the component's CSS or styled rules with its markup/JSX.
- **No inline styles** except for dynamic values that cannot be expressed via classes (e.g., a progress bar width).
- **Semantic HTML first.** Use `<button>` for actions, `<a>` for navigation, `<nav>`, `<main>`, `<article>`, `<section>` appropriately.
- **Image alt text** must describe the product or scene, not say "image of".
- **Currency:** display in GBP with the symbol before the amount and a thousands separator (`£2,199`). Do not invent a different format.
- **Domain references:** use `www.speedmaster.bike` exactly. Email addresses follow `name@speedmaster.bike`.

When asked to add a new component, first check whether an existing component (button, card, badge, field) already covers the case. Extend before inventing.

When asked for a new color, font size, or spacing value not in this document, surface the request and propose adding a new token here rather than introducing a one-off value.

---

## 10. Quick reference cheat sheet

| Need                | Token                              |
|---------------------|------------------------------------|
| Primary CTA bg      | `--color-brand-yellow`             |
| Page bg (light)     | `--color-bg`                       |
| Page bg (dark)      | `--color-bg-inverse`               |
| Body text           | `--color-text`                     |
| Muted text          | `--color-text-muted`               |
| Card bg             | `--color-bg`                       |
| Section divider     | `--color-border`                   |
| Sale price          | `--color-price-sale`               |
| Hero headline size  | `--fs-6xl` + `--fw-black`          |
| Body size           | `--fs-base` + `--fw-regular`       |
| Card radius         | `--radius-lg`                      |
| Button radius       | `--radius-md`                      |
| Standard transition | `--duration-base` + `--ease-out`   |
