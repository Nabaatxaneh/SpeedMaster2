"""Helper: prints card HTML for collection pages."""
import sqlite3
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "database", "speedmaster.db")

def sku_to_slug(sku):
    s = sku.lower()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-')

def card_html(r, cat_label):
    slug  = sku_to_slug(r['sku'])
    name  = r['brand'] + ' ' + r['model_name']
    label = r['model_name'].replace(' ', '+')
    price = int(r['retail_price'])
    status = r['stock_status']
    if status == 'Pre-sale':
        badge = '<span class="badge badge--new fp-card__badge">PRE-SALE</span>'
    else:
        badge = '<span class="badge badge--instock fp-card__badge">IN STOCK ✓</span>'
    pdp = '../products/' + slug + '.html'
    return (
        '      <article class="fp-card">\n'
        '        <a href="{pdp}" class="fp-card__media" style="text-decoration:none;">\n'
        '          <img src="https://placehold.co/340x260/0E0E0E/F8E300?text={label}"\n'
        '               alt="{name}" style="width:100%;height:100%;object-fit:cover;">\n'
        '          {badge}\n'
        '        </a>\n'
        '        <div class="fp-card__body">\n'
        '          <p class="fp-card__category">{cat}</p>\n'
        '          <h3 class="fp-card__title"><a href="{pdp}">{name}</a></h3>\n'
        '          <div class="fp-card__specs">\n'
        '            <div class="fp-card__spec">\n'
        '              <img src="../brand_assets/Speed25V3.svg" alt="" class="fp-card__spec-icon">\n'
        '              <span class="fp-card__spec-label">Speed</span>\n'
        '              <span class="fp-card__spec-val">{speed}</span>\n'
        '            </div>\n'
        '            <div class="fp-card__spec">\n'
        '              <img src="../brand_assets/Engine25V3.svg" alt="" class="fp-card__spec-icon">\n'
        '              <span class="fp-card__spec-label">Motor</span>\n'
        '              <span class="fp-card__spec-val">{motor}</span>\n'
        '            </div>\n'
        '            <div class="fp-card__spec">\n'
        '              <img src="../brand_assets/Distance25V3.svg" alt="" class="fp-card__spec-icon">\n'
        '              <span class="fp-card__spec-label">Range</span>\n'
        '              <span class="fp-card__spec-val">{rng}</span>\n'
        '            </div>\n'
        '          </div>\n'
        '          <div class="fp-card__price-row"><span class="fp-card__price">\xa3{price}</span></div>\n'
        '          <div class="fp-card__actions">\n'
        '            <button class="btn btn--primary btn--sm" data-add-to-cart\n'
        '              data-product-id="{slug}"\n'
        '              data-product-name="{name}"\n'
        '              data-product-price="{price}"\n'
        '              data-product-cat="{cat}"\n'
        '              data-product-thumb="https://placehold.co/80x60/0E0E0E/F8E300?text={label}">ADD TO CART</button>\n'
        '            <a href="{pdp}" class="btn btn--dark btn--sm">VIEW</a>\n'
        '          </div>\n'
        '        </div>\n'
        '      </article>'
    ).format(slug=slug, name=name, label=label, price=price,
             cat=cat_label, badge=badge, pdp=pdp,
             speed=r['max_speed'], motor=r['motor_power'], rng=r['range'])

def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    rows = cur.execute("""
        SELECT p.sku, p.brand, p.model_name, pr.retail_price,
               sp.motor_power, sp.max_speed, sp.range, sp.net_weight,
               v.stock_status
        FROM Product p
        JOIN Pricing pr        ON pr.product_id = p.product_id
        JOIN Specifications sp ON sp.product_id = p.product_id
        LEFT JOIN Variants v   ON v.product_id = p.product_id
          AND v.variant_id = (SELECT MIN(variant_id) FROM Variants WHERE product_id = p.product_id)
        ORDER BY p.product_id
    """).fetchall()
    conn.close()

    by_sku = {r['sku']: r for r in rows}

    # E-bikes: 12 featured products
    ebike_skus = [
        'KOOLUX-X3', 'KOOLUX-BK6S', 'KOOLUX-X9', 'KOOLUX-X11',
        'KOOLUX-X7',  'KOOLUX-X8',  'KOOLUX-X9PRO', 'KOOLUX-X16',
        'HIDOES-F3PRO','HIDOES-B6BLK','HIDOES-B9', 'HIDOES-P1',
    ]

    # E-scooters: all 9
    escooter_skus = [
        'IENYRID-M4S+24', 'IENYRID-S1',    'KOOLUX-U1',
        'IENYRID-M4S25',  'VIPCOO-VS6',    'IENYRID-ES1',
        'VIPCOO-VS6PRO',  'KOOLUX-U1PRO',  'VIPCOO-VS9',
    ]

    print("=== E-BIKES GRID ===")
    for sku in ebike_skus:
        if sku in by_sku:
            print(card_html(by_sku[sku], 'Electric Bike'))
            print()

    print("\n=== E-SCOOTERS GRID ===")
    for sku in escooter_skus:
        if sku in by_sku:
            print(card_html(by_sku[sku], 'Electric Scooter'))
            print()

if __name__ == '__main__':
    main()
