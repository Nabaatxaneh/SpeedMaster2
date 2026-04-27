"""
Reads speedmaster.db and generates one product detail page per product
into the products/ directory.
"""
import sqlite3
import os
import re

DB_PATH      = os.path.join(os.path.dirname(__file__), "..", "database", "speedmaster.db")
PRODUCTS_DIR = os.path.join(os.path.dirname(__file__), "..", "products")

COLOR_HEX = {
    "Black":  "#0E0E0E",
    "White":  "#EFEFEF",
    "Gray":   "#888888",
    "Grey":   "#888888",
    "Red":    "#CC2200",
    "Yellow": "#F8E300",
    "Pink":   "#FF69B4",
    "Green":  "#2D6A1F",
    "Blue":   "#1A3D8F",
    "Silver": "#C0C0C0",
    "Orange": "#E55A00",
    "Purple": "#6B2FAF",
}

# JS block uses __PLACEHOLDER__ tokens to avoid f-string brace conflicts
JS_TEMPLATE = """<script>
document.addEventListener('DOMContentLoaded', function () {
  var swatches   = document.querySelectorAll('.color-swatch');
  var colorLabel = document.getElementById('selected-color-label');
  swatches.forEach(function (sw) {
    sw.addEventListener('click', function () {
      swatches.forEach(function (s) {
        s.classList.remove('is-selected');
        s.style.border = '2px solid transparent';
      });
      sw.classList.add('is-selected');
      sw.style.border = '2px solid var(--color-brand-black)';
      if (colorLabel) colorLabel.textContent = sw.dataset.color || sw.title || '';
    });
  });

  var qtyInput = document.querySelector('.qty-input');
  document.querySelectorAll('.qty-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var v = parseInt(qtyInput.value) || 1;
      if (btn.dataset.action === 'plus')  qtyInput.value = Math.min(10, v + 1);
      if (btn.dataset.action === 'minus') qtyInput.value = Math.max(1,  v - 1);
    });
  });

  var addBtn = document.getElementById('pdp-add-btn');
  if (addBtn) {
    addBtn.addEventListener('click', function () {
      var qty      = parseInt((qtyInput || {}).value) || 1;
      var selected = document.querySelector('.color-swatch.is-selected');
      var color    = selected ? (selected.dataset.color || selected.title || '') : '';
      SM.addToCart({
        id:       '__SLUG__',
        name:     '__FULL_NAME__',
        price:    __PRICE__,
        qty:      qty,
        color:    color,
        category: '__CAT_LABEL__',
        thumb:    'https://placehold.co/80x60/0E0E0E/F8E300?text=__LABEL__'
      });
      var overlay = document.getElementById('cart-overlay');
      var drawer  = document.getElementById('cart-drawer');
      if (overlay && drawer) {
        overlay.classList.add('is-open');
        drawer.classList.add('is-open');
        document.body.style.overflow = 'hidden';
      }
      var orig = addBtn.textContent;
      addBtn.textContent = '✓ Added!';
      addBtn.disabled = true;
      setTimeout(function () { addBtn.textContent = orig; addBtn.disabled = false; }, 1500);
    });
  }

  document.querySelectorAll('[data-add-to-cart]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      SM.addToCart({
        id:       btn.dataset.productId    || 'unknown',
        name:     btn.dataset.productName  || 'Product',
        price:    parseFloat(btn.dataset.productPrice) || 0,
        qty:      1,
        thumb:    btn.dataset.productThumb || '',
        category: btn.dataset.productCat   || '',
        color:    ''
      });
      var overlay = document.getElementById('cart-overlay');
      var drawer  = document.getElementById('cart-drawer');
      if (overlay && drawer) {
        overlay.classList.add('is-open');
        drawer.classList.add('is-open');
        document.body.style.overflow = 'hidden';
      }
      var orig = btn.textContent;
      btn.textContent = '✓ Added!';
      btn.disabled = true;
      setTimeout(function () { btn.textContent = orig; btn.disabled = false; }, 1500);
    });
  });
});
</script>"""


def sku_to_slug(sku):
    s = sku.lower()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-')


def get_category(model_name):
    ml = model_name.lower()
    if 'dirt' in ml:
        return 'dirt-bike'
    if 'scooter' in ml:
        return 'e-scooter'
    return 'e-bike'


def fmt_price(price):
    return "£{:,}".format(int(price))


def monthly(price):
    return "£{:.2f}".format(price / 36)


def color_swatch_html(color, is_first):
    hex_val = COLOR_HEX.get(color, "#888888")
    border  = 'border:2px solid var(--color-brand-black)' if is_first else 'border:2px solid transparent'
    cls     = 'color-swatch is-selected' if is_first else 'color-swatch'
    return (
        '<button class="{cls}" data-color="{color}" '
        'style="width:28px;height:28px;border-radius:50%;background:{hex};{border};cursor:pointer;" '
        'aria-label="{color}" title="{color}"></button>'
    ).format(cls=cls, color=color, hex=hex_val, border=border)


def related_cards_html(all_products, current_pid, category):
    same_cat = [p for p in all_products
                if p['category'] == category and p['product_id'] != current_pid][:4]
    cards = []
    for p in same_cat:
        slug  = sku_to_slug(p['sku'])
        label = p['model_name'].replace(' ', '+')
        card_html = (
            '          <article class="fp-card">\n'
            '            <a href="{slug}.html" class="fp-card__media" style="text-decoration:none;">\n'
            '              <img src="https://placehold.co/340x260/0E0E0E/F8E300?text={label}"\n'
            '                   alt="{name}" style="width:100%;height:100%;object-fit:cover;">\n'
            '            </a>\n'
            '            <div class="fp-card__body">\n'
            '              <p class="fp-card__category">{cat}</p>\n'
            '              <h3 class="fp-card__title"><a href="{slug}.html">{brand} {name}</a></h3>\n'
            '              <div class="fp-card__price-row"><span class="fp-card__price">{price}</span></div>\n'
            '              <div class="fp-card__actions">\n'
            '                <button class="btn btn--primary btn--sm" data-add-to-cart\n'
            '                  data-product-id="{sku_lower}"\n'
            '                  data-product-name="{brand} {name}"\n'
            '                  data-product-price="{int_price}"\n'
            '                  data-product-cat="{cat}"\n'
            '                  data-product-thumb="https://placehold.co/80x60/0E0E0E/F8E300?text={label}">ADD TO CART</button>\n'
            '                <a href="{slug}.html" class="btn btn--dark btn--sm">VIEW</a>\n'
            '              </div>\n'
            '            </div>\n'
            '          </article>'
        ).format(
            slug=slug, label=label,
            name=p['model_name'], brand=p['brand'],
            cat=p['cat_label'],
            price=fmt_price(p['retail_price']),
            sku_lower=p['sku'].lower(),
            int_price=int(p['retail_price']),
        )
        cards.append(card_html)
    return '\n'.join(cards)


def generate_page(p, all_products):
    cat       = p['category']
    cat_label = p['cat_label']
    slug      = sku_to_slug(p['sku'])
    full_name = p['brand'] + ' ' + p['model_name']
    label     = p['model_name'].replace(' ', '+')
    price     = fmt_price(p['retail_price'])
    rrp       = fmt_price(p['supplier_rrp'])

    coll_map = {
        'e-bike':    ('../collections/e-bikes.html',     'E-Bikes'),
        'e-scooter': ('../collections/e-scooters.html',  'E-Scooters'),
        'dirt-bike': ('../collections/all-products.html','All Products'),
    }
    coll_href, coll_text = coll_map[cat]

    colors   = p['colors']
    swatches = '\n              '.join(color_swatch_html(c, i == 0) for i, c in enumerate(colors))
    first_color = colors[0] if colors else 'Black'

    if p['stock_status'] == 'Pre-sale':
        badge_html = '<span class="badge badge--new" style="margin-bottom:0.75rem;">PRE-SALE</span>'
        stock_msg  = 'Pre-sale — order now, ships soon'
    else:
        badge_html = '<span class="badge badge--instock" style="margin-bottom:0.75rem;">IN STOCK ✓</span>'
        stock_msg  = 'In Stock — ships in ' + p['shipping_sla']

    specs = p['specs']

    def sv(val):
        return val if val and val != 'TBD' else 'TBD'

    spec_items = [
        ('Range',        sv(specs.get('range'))),
        ('Motor',        sv(specs.get('motor_power'))),
        ('Top Speed',    sv(specs.get('max_speed'))),
        ('Battery',      sv(specs.get('battery_capacity'))),
        ('Tyre Size',    sv(specs.get('tire_size'))),
        ('Max Load',     sv(specs.get('max_load'))),
        ('Net Weight',   sv(specs.get('net_weight'))),
        ('Gross Weight', sv(specs.get('gross_weight'))),
    ]

    spec_list_html = '\n'.join(
        '            <li class="pdp__spec-item">'
        '<span class="pdp__spec-label">{}</span>'
        '<span class="pdp__spec-value">{}</span></li>'.format(k, v)
        for k, v in spec_items
    )
    full_spec_html = '\n'.join(
        '            <li><strong>{}:</strong> {}</li>'.format(k, v)
        for k, v in spec_items
    )

    colors_spec = ', '.join(colors) if colors else 'TBD'

    description = (
        "The {name} delivers outstanding performance for everyday riders. "
        "Powered by a {motor} motor and backed by a {battery} battery, "
        "it offers a range of {rng} on a single charge. "
        "With a top speed of {speed} and {tire} tyres, "
        "it handles urban streets and paths with ease."
    ).format(
        name=full_name,
        motor=sv(specs.get('motor_power')),
        battery=sv(specs.get('battery_capacity')),
        rng=sv(specs.get('range')),
        speed=sv(specs.get('max_speed')),
        tire=sv(specs.get('tire_size')),
    )

    related = related_cards_html(all_products, p['product_id'], cat)

    js = (JS_TEMPLATE
          .replace('__SLUG__',      slug)
          .replace('__FULL_NAME__', full_name.replace("'", "\\'"))
          .replace('__PRICE__',     str(int(p['retail_price'])))
          .replace('__CAT_LABEL__', cat_label)
          .replace('__LABEL__',     label))

    html = (
        '<!DOCTYPE html>\n'
        '<html lang="en">\n'
        '<head>\n'
        '  <meta charset="UTF-8">\n'
        '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
        '  <title>{full_name} — {cat_label} | SpeedMaster</title>\n'
        '  <meta name="description" content="{full_name}. {rng} range, {motor} motor, up to {speed}. Free UK delivery.">\n'
        '  <link rel="preconnect" href="https://fonts.googleapis.com">\n'
        '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        '  <link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">\n'
        '  <link rel="stylesheet" href="../assets/css/global.css">\n'
        '</head>\n'
        '<body>\n'
        '\n'
        '<div id="sm-header"></div>\n'
        '\n'
        '<main>\n'
        '\n'
        '  <div class="container">\n'
        '    <nav class="breadcrumb" aria-label="Breadcrumb">\n'
        '      <a href="../index.html">Home</a>\n'
        '      <span class="breadcrumb__sep">›</span>\n'
        '      <a href="{coll_href}">{coll_text}</a>\n'
        '      <span class="breadcrumb__sep">›</span>\n'
        '      <span>{full_name}</span>\n'
        '    </nav>\n'
        '  </div>\n'
        '\n'
        '  <section class="pdp">\n'
        '    <div class="container">\n'
        '      <div class="pdp__grid">\n'
        '\n'
        '        <!-- LEFT: Gallery -->\n'
        '        <div>\n'
        '          <div class="pdp__main-img">\n'
        '            <img id="pdp-main-img"\n'
        '              src="https://placehold.co/600x450/0E0E0E/F8E300?text={label}"\n'
        '              alt="{full_name} — main view" width="600" height="450">\n'
        '          </div>\n'
        '          <div class="pdp__thumbs">\n'
        '            <div class="pdp__thumb is-active" data-src="https://placehold.co/600x450/0E0E0E/F8E300?text={label}">\n'
        '              <img src="https://placehold.co/72x56/0E0E0E/F8E300?text=1" alt="View 1">\n'
        '            </div>\n'
        '            <div class="pdp__thumb" data-src="https://placehold.co/600x450/1a1a1a/F8E300?text=Side+View">\n'
        '              <img src="https://placehold.co/72x56/1a1a1a/F8E300?text=2" alt="View 2">\n'
        '            </div>\n'
        '            <div class="pdp__thumb" data-src="https://placehold.co/600x450/111111/FFFFFF?text=Detail">\n'
        '              <img src="https://placehold.co/72x56/111111/FFFFFF?text=3" alt="View 3">\n'
        '            </div>\n'
        '            <div class="pdp__thumb" data-src="https://placehold.co/600x450/0E0E0E/F8E300?text=Rear+View">\n'
        '              <img src="https://placehold.co/72x56/0E0E0E/FFEC1F?text=4" alt="View 4">\n'
        '            </div>\n'
        '          </div>\n'
        '        </div>\n'
        '\n'
        '        <!-- RIGHT: Info -->\n'
        '        <div>\n'
        '          {badge_html}\n'
        '          <h1 class="pdp__title">{full_name}</h1>\n'
        '          <div class="pdp__rating">\n'
        '            <span class="stars">★★★★★</span>\n'
        '            <span>4.8</span>\n'
        '            <span>·</span>\n'
        '            <span>32 reviews</span>\n'
        '          </div>\n'
        '\n'
        '          <div class="pdp__price-block">\n'
        '            <span class="pdp__price">{price}</span>\n'
        '            <span style="font-size:0.875rem;color:var(--color-text-muted);text-decoration:line-through;margin-left:0.5rem;">RRP {rrp}</span>\n'
        '          </div>\n'
        '\n'
        '          <p class="pdp__desc">{description}</p>\n'
        '\n'
        '          <ul class="pdp__specs-list">\n'
        '{spec_list_html}\n'
        '          </ul>\n'
        '\n'
        '          <!-- Colour selection -->\n'
        '          <div style="margin-bottom:1.25rem;">\n'
        '            <p style="font-size:0.875rem;font-weight:700;margin-bottom:0.5rem;">Colour: <span id="selected-color-label" style="font-weight:400;color:var(--color-text-muted);">{first_color}</span></p>\n'
        '            <div style="display:flex;gap:0.5rem;">\n'
        '              {swatches}\n'
        '            </div>\n'
        '          </div>\n'
        '\n'
        '          <!-- Quantity + Add to Cart -->\n'
        '          <div class="pdp__qty-row">\n'
        '            <div class="qty-selector">\n'
        '              <button class="qty-btn" data-action="minus" aria-label="Decrease quantity">−</button>\n'
        '              <input class="qty-input" type="number" value="1" min="1" max="10" aria-label="Quantity">\n'
        '              <button class="qty-btn" data-action="plus" aria-label="Increase quantity">+</button>\n'
        '            </div>\n'
        '            <span style="font-size:0.75rem;color:var(--color-success);font-weight:700;">✓ {stock_msg}</span>\n'
        '          </div>\n'
        '\n'
        '          <div class="pdp__add-btn">\n'
        '            <button class="btn btn--primary" id="pdp-add-btn" style="flex:1;">ADD TO CART</button>\n'
        '            <button class="btn btn--ghost" style="padding:0.75rem 1rem;" aria-label="Save to wishlist">\n'
        '              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>\n'
        '            </button>\n'
        '          </div>\n'
        '\n'
        '          <div class="pdp__klarna-msg">\n'
        '            <strong>Pay from {monthly}/month</strong> with <strong>Klarna</strong> — 0% interest for 36 months. Subject to status. <a href="../pages/finance.html" style="color:var(--color-brand-black);text-decoration:underline;">Learn more</a>\n'
        '          </div>\n'
        '\n'
        '          <div class="pdp__trust-row">\n'
        '            <span class="pdp__trust-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg> Free delivery</span>\n'
        '            <span class="pdp__trust-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> 2-Year warranty</span>\n'
        '            <span class="pdp__trust-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> 30-Day returns</span>\n'
        '          </div>\n'
        '\n'
        '        </div>\n'
        '      </div>\n'
        '\n'
        '      <!-- Tabs -->\n'
        '      <div class="pdp__tabs">\n'
        '        <div class="pdp__tab-nav" role="tablist">\n'
        '          <button class="pdp__tab-btn pdp__tab-btn--active" role="tab" aria-selected="true" data-tab="description">Description</button>\n'
        '          <button class="pdp__tab-btn" role="tab" aria-selected="false" data-tab="specifications">Specifications</button>\n'
        '          <button class="pdp__tab-btn" role="tab" aria-selected="false" data-tab="shipping">Shipping &amp; Returns</button>\n'
        '          <button class="pdp__tab-btn" role="tab" aria-selected="false" data-tab="reviews">Reviews (32)</button>\n'
        '        </div>\n'
        '\n'
        '        <div class="pdp__tab-panel pdp__tab-panel--active" id="tab-description" role="tabpanel">\n'
        '          <h4>About the {full_name}</h4>\n'
        '          <p>{description}</p>\n'
        '          <p>Available in {colors_spec}. Supplied with charger, manual, and all necessary accessories. UK plug standard.</p>\n'
        '          <ul>\n'
        '            <li>Supplied by {supplier_name} — {shipping_sla} delivery from UK warehouse</li>\n'
        '            <li>2-year manufacturer warranty included</li>\n'
        '            <li>30-day returns policy</li>\n'
        '            <li>UK spec — meets all relevant safety standards</li>\n'
        '          </ul>\n'
        '        </div>\n'
        '\n'
        '        <div class="pdp__tab-panel" id="tab-specifications" role="tabpanel">\n'
        '          <h4>Full Technical Specifications</h4>\n'
        '          <p>All specifications are measured under standard test conditions. Real-world range may vary based on rider weight, terrain, and conditions.</p>\n'
        '          <ul>\n'
        '{full_spec_html}\n'
        '            <li><strong>Colours available:</strong> {colors_spec}</li>\n'
        '            <li><strong>SKU:</strong> {sku}</li>\n'
        '          </ul>\n'
        '        </div>\n'
        '\n'
        '        <div class="pdp__tab-panel" id="tab-shipping" role="tabpanel">\n'
        '          <h4>Delivery Information</h4>\n'
        '          <p>This product is dispatched from our UK warehouse within {shipping_sla}. We use tracked, insured courier delivery direct to your door.</p>\n'
        '          <ul>\n'
        '            <li><strong>Standard UK delivery:</strong> Free on all orders</li>\n'
        '            <li><strong>Estimated dispatch:</strong> {shipping_sla}</li>\n'
        '            <li><strong>Tracking:</strong> Full tracking provided by email once dispatched</li>\n'
        '          </ul>\n'
        '          <h4>Returns &amp; Exchanges</h4>\n'
        '          <p>We offer a 30-day no-quibble returns policy. Contact <a href="mailto:returns@speedmaster.bike">returns@speedmaster.bike</a> to initiate a return. Items must be returned unused in original packaging.</p>\n'
        '        </div>\n'
        '\n'
        '        <div class="pdp__tab-panel" id="tab-reviews" role="tabpanel">\n'
        '          <h4>Customer Reviews</h4>\n'
        '          <div style="display:flex;align-items:center;gap:1rem;margin-bottom:2rem;padding:1.5rem;background:var(--color-bg-subtle);border-radius:12px;">\n'
        '            <div style="text-align:center;">\n'
        '              <div style="font-size:3rem;font-weight:900;line-height:1;">4.8</div>\n'
        '              <div class="stars" style="font-size:1.25rem;">★★★★★</div>\n'
        '              <div style="font-size:0.75rem;color:var(--color-text-muted);margin-top:0.25rem;">32 reviews</div>\n'
        '            </div>\n'
        '            <div style="flex:1;padding-left:2rem;border-left:1px solid var(--color-border);">\n'
        '              <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;"><span style="font-size:0.75rem;width:40px;">5★</span><div style="flex:1;height:8px;background:var(--color-bg-muted);border-radius:4px;"><div style="width:84%;height:100%;background:var(--color-brand-yellow);border-radius:4px;"></div></div><span style="font-size:0.75rem;color:var(--color-text-muted);width:30px;">84%</span></div>\n'
        '              <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;"><span style="font-size:0.75rem;width:40px;">4★</span><div style="flex:1;height:8px;background:var(--color-bg-muted);border-radius:4px;"><div style="width:12%;height:100%;background:var(--color-brand-yellow);border-radius:4px;"></div></div><span style="font-size:0.75rem;color:var(--color-text-muted);width:30px;">12%</span></div>\n'
        '              <div style="display:flex;align-items:center;gap:0.75rem;"><span style="font-size:0.75rem;width:40px;">3★</span><div style="flex:1;height:8px;background:var(--color-bg-muted);border-radius:4px;"><div style="width:4%;height:100%;background:var(--color-brand-yellow);border-radius:4px;"></div></div><span style="font-size:0.75rem;color:var(--color-text-muted);width:30px;">4%</span></div>\n'
        '            </div>\n'
        '          </div>\n'
        '          <div class="review-card" style="margin-bottom:1rem;">\n'
        '            <div class="review-card__head">\n'
        '              <div class="review-card__avatar">AS</div>\n'
        '              <div><p class="review-card__name">Alex Smith</p><p class="review-card__when">3 weeks ago</p></div>\n'
        '              <div class="stars review-card__stars" aria-label="5 stars">★★★★★</div>\n'
        '            </div>\n'
        '            <p class="review-card__body">"Brilliant product — exactly as described. The range is impressive and build quality feels solid. Arrived well packaged and quickly. Very happy with my purchase."</p>\n'
        '          </div>\n'
        '          <div class="review-card">\n'
        '            <div class="review-card__head">\n'
        '              <div class="review-card__avatar">RL</div>\n'
        '              <div><p class="review-card__name">Rachel Lee</p><p class="review-card__when">1 month ago</p></div>\n'
        '              <div class="stars review-card__stars" aria-label="5 stars">★★★★★</div>\n'
        '            </div>\n'
        '            <p class="review-card__body">"Great value for money. Does everything I need for my daily commute. The motor is smooth and responsive. Would recommend to anyone looking at this price point."</p>\n'
        '          </div>\n'
        '        </div>\n'
        '\n'
        '      </div>\n'
        '    </div>\n'
        '  </section>\n'
        '\n'
        '  <!-- You May Also Like -->\n'
        '  <section class="you-may-like" aria-labelledby="related-heading">\n'
        '    <div class="container">\n'
        '      <p class="section-eyebrow">Related</p>\n'
        '      <h2 id="related-heading" class="section-heading" style="margin-bottom:2rem;">You May Also Like</h2>\n'
        '      <div class="carousel-wrap">\n'
        '        <div class="carousel-track">\n'
        '{related}\n'
        '        </div>\n'
        '      </div>\n'
        '    </div>\n'
        '  </section>\n'
        '\n'
        '</main>\n'
        '\n'
        '<div id="sm-footer"></div>\n'
        '<script src="../assets/js/store.js"></script>\n'
        '<script src="../assets/js/main.js"></script>\n'
        '{js}\n'
        '</body>\n'
        '</html>'
    ).format(
        full_name=full_name,
        cat_label=cat_label,
        rng=sv(specs.get('range')),
        motor=sv(specs.get('motor_power')),
        speed=sv(specs.get('max_speed')),
        coll_href=coll_href,
        coll_text=coll_text,
        label=label,
        badge_html=badge_html,
        price=price,
        rrp=rrp,
        description=description,
        spec_list_html=spec_list_html,
        first_color=first_color,
        swatches=swatches,
        stock_msg=stock_msg,
        monthly=monthly(p['retail_price']),
        colors_spec=colors_spec,
        full_spec_html=full_spec_html,
        sku=p['sku'],
        supplier_name=p['supplier_name'],
        shipping_sla=p['shipping_sla'],
        related=related,
        js=js,
    )

    return slug, html


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    rows = cur.execute("""
        SELECT
          p.product_id, p.sku, p.brand, p.model_name, p.is_active,
          pr.supplier_unit_cost, pr.supplier_rrp, pr.retail_price,
          sp.battery_capacity, sp.motor_power, sp.max_speed,
          sp.range, sp.tire_size, sp.max_load, sp.net_weight, sp.gross_weight,
          s.name AS supplier_name, s.shipping_sla
        FROM Product p
        JOIN Pricing pr        ON pr.product_id = p.product_id
        JOIN Specifications sp ON sp.product_id = p.product_id
        JOIN Supplier s        ON s.supplier_id = p.supplier_id
        ORDER BY p.product_id
    """).fetchall()

    variants = {}
    for v in cur.execute("SELECT product_id, color, stock_status FROM Variants"):
        variants.setdefault(v['product_id'], []).append((v['color'], v['stock_status']))
    conn.close()

    cat_labels = {
        'e-bike':    'Electric Bike',
        'e-scooter': 'Electric Scooter',
        'dirt-bike': 'Dirt Bike',
    }

    all_products = []
    for row in rows:
        pid = row['product_id']
        var = variants.get(pid, [("Black", "Available")])
        cat = get_category(row['model_name'])
        all_products.append({
            'product_id':    pid,
            'sku':           row['sku'],
            'brand':         row['brand'],
            'model_name':    row['model_name'],
            'retail_price':  row['retail_price'],
            'supplier_rrp':  row['supplier_rrp'],
            'supplier_name': row['supplier_name'],
            'shipping_sla':  row['shipping_sla'],
            'category':      cat,
            'cat_label':     cat_labels[cat],
            'colors':        [c for c, _ in var],
            'stock_status':  var[0][1],
            'specs': {
                'battery_capacity': row['battery_capacity'],
                'motor_power':      row['motor_power'],
                'max_speed':        row['max_speed'],
                'range':            row['range'],
                'tire_size':        row['tire_size'],
                'max_load':         row['max_load'],
                'net_weight':       row['net_weight'],
                'gross_weight':     row['gross_weight'],
            },
        })

    os.makedirs(PRODUCTS_DIR, exist_ok=True)

    generated = []
    for p in all_products:
        slug, html = generate_page(p, all_products)
        out_path = os.path.join(PRODUCTS_DIR, slug + '.html')
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(html)
        generated.append('{}.html  ({} {})'.format(slug, p['brand'], p['model_name']))

    print('Generated {} product pages in {}/\n'.format(len(generated), PRODUCTS_DIR))
    for g in generated:
        print('  ' + g)


if __name__ == '__main__':
    main()
