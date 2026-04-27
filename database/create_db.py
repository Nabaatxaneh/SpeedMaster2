import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "speedmaster.db")

def create_database():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.executescript("""
    CREATE TABLE IF NOT EXISTS Supplier (
        supplier_id   INTEGER PRIMARY KEY AUTOINCREMENT,
        name          TEXT NOT NULL,
        contact_email TEXT,
        contact_phone TEXT,
        shipping_sla  TEXT,
        flat_shipping_cost REAL
    );

    CREATE TABLE IF NOT EXISTS Product (
        product_id   INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id  INTEGER NOT NULL REFERENCES Supplier(supplier_id),
        sku          TEXT NOT NULL UNIQUE,
        brand        TEXT NOT NULL,
        model_name   TEXT NOT NULL,
        is_active    INTEGER NOT NULL DEFAULT 1,
        sales_channel_restrictions TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS Pricing (
        product_id          INTEGER PRIMARY KEY REFERENCES Product(product_id),
        supplier_unit_cost  REAL,
        supplier_rrp        REAL,
        retail_price        REAL,
        margin_percentage   REAL GENERATED ALWAYS AS (
            CASE WHEN retail_price > 0
                 THEN ROUND((retail_price - supplier_unit_cost) / retail_price * 100, 2)
                 ELSE NULL END
        ) STORED
    );

    CREATE TABLE IF NOT EXISTS Specifications (
        product_id       INTEGER PRIMARY KEY REFERENCES Product(product_id),
        battery_capacity TEXT,
        motor_power      TEXT,
        max_speed        TEXT,
        range            TEXT,
        tire_size        TEXT,
        max_load         TEXT,
        net_weight       TEXT,
        gross_weight     TEXT
    );

    CREATE TABLE IF NOT EXISTS Variants (
        variant_id   INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id   INTEGER NOT NULL REFERENCES Product(product_id),
        color        TEXT,
        stock_status TEXT DEFAULT 'Available'
    );
    """)

    # ── Suppliers ────────────────────────────────────────────────────────────
    cur.execute(
        "INSERT INTO Supplier (name, contact_email, contact_phone, shipping_sla, flat_shipping_cost) VALUES (?,?,?,?,?)",
        ("KOOLUX", "lilian@koolux.eu", "+86 150 7908 9940", "1-5 days", 0.0)
    )
    koolux_id = cur.lastrowid

    cur.execute(
        "INSERT INTO Supplier (name, contact_email, contact_phone, shipping_sla, flat_shipping_cost) VALUES (?,?,?,?,?)",
        ("VIPCOO", None, "+86 188 1859 6589", "2-4 days", 0.0)
    )
    vipcoo_id = cur.lastrowid

    # ── Products + Pricing + Specifications + Variants ───────────────────────
    products = [
        # (supplier_id, sku, brand, model_name, is_active, restrictions,
        #  unit_cost, rrp, retail,
        #  battery, motor, max_speed, range, tire, max_load, net_wt, gross_wt,
        #  colors, stock_status)

        # ── KOOLUX E-BIKES ───────────────────────────────────────────────────
        (koolux_id, "KOOLUX-X3",     "KOOLUX", "X3 E-Bike",       1, "[]",
         479, 869, 799,
         "48V 15Ah", "500W", "25 km/h", "45-85 km", "26 inch", "120 kg", "22 kg", "26 kg",
         ["Gray", "Red", "White"], "Available"),

        (koolux_id, "KOOLUX-X2",     "KOOLUX", "X2 E-Bike",       1, "[]",
         530, 849, 779,
         "48V 15Ah", "500W", "25 km/h", "50-90 km", "26 inch", "120 kg", "22 kg", "26 kg",
         ["Black", "White"], "Available"),

        (koolux_id, "KOOLUX-X10",    "KOOLUX", "X10 E-Bike",      1, "[]",
         299, 499, 449,
         "36V 10Ah", "250W", "25 km/h", "30-60 km", "26 inch", "100 kg", "18 kg", "22 kg",
         ["Black", "White"], "Available"),

        (koolux_id, "KOOLUX-BK6S",   "KOOLUX", "BK6S 4.0 E-Bike", 1, "[]",
         447, 739, 679,
         "48V 13Ah", "500W", "25 km/h", "40-80 km", "20 inch", "120 kg", "21 kg", "25 kg",
         ["Black", "Gray"], "Available"),

        (koolux_id, "KOOLUX-BK6SPRO","KOOLUX", "BK6S Pro E-Bike", 1, "[]",
         596, 959, 879,
         "48V 17.5Ah", "750W", "25 km/h", "50-100 km", "20 inch", "120 kg", "23 kg", "27 kg",
         ["Black", "Gray"], "Available"),

        (koolux_id, "KOOLUX-X11",    "KOOLUX", "X11 E-Bike",      1, "[]",
         610, 899, 829,
         "48V 17.5Ah", "750W", "25 km/h", "55-100 km", "26 inch", "120 kg", "26 kg", "30 kg",
         ["Black", "White"], "Available"),

        (koolux_id, "KOOLUX-X11S",   "KOOLUX", "X11S E-Bike",     1, "[]",
         611, 899, 829,
         "48V 17.5Ah", "750W", "25 km/h", "55-100 km", "26 inch", "120 kg", "26 kg", "30 kg",
         ["Black"], "Available"),

        (koolux_id, "KOOLUX-X16",    "KOOLUX", "X16 E-Bike",      1, "[]",
         430, 659, 609,
         "48V 13Ah", "500W", "25 km/h", "40-80 km", "20 inch", "120 kg", "22 kg", "26 kg",
         ["Red", "Gray", "White", "Pink"], "Pre-sale"),

        (koolux_id, "KOOLUX-X12",    "KOOLUX", "X12 E-Bike",      1, "[]",
         480, 749, 689,
         "48V 15Ah", "500W", "25 km/h", "45-85 km", "26 inch", "120 kg", "23 kg", "27 kg",
         ["Black", "White"], "Pre-sale"),

        (koolux_id, "KOOLUX-X12PRO", "KOOLUX", "X12 Pro E-Bike",  1, "[]",
         590, 899, 829,
         "48V 17.5Ah", "750W", "25 km/h", "50-100 km", "26 inch", "120 kg", "25 kg", "29 kg",
         ["Black"], "Pre-sale"),

        (koolux_id, "KOOLUX-X7",     "KOOLUX", "X7 E-Bike",       1, "[]",
         556, 979, 899,
         "48V 17.5Ah", "750W", "25 km/h", "55-105 km", "27.5 inch", "130 kg", "27 kg", "31 kg",
         ["Black", "Gray"], "Available"),

        (koolux_id, "KOOLUX-X8",     "KOOLUX", "X8 E-Bike",       1, "[]",
         769, 1129, 1049,
         "48V 21Ah", "1000W", "35 km/h", "60-120 km", "27.5 inch", "150 kg", "30 kg", "35 kg",
         ["Black"], "Available"),

        (koolux_id, "KOOLUX-X9",     "KOOLUX", "X9 E-Bike",       1, "[]",
         485, 799, 729,
         "48V 17.5Ah", "750W", "25 km/h", "55-100 km", "29 inch", "130 kg", "26 kg", "30 kg",
         ["Black", "Gray"], "Available"),

        (koolux_id, "KOOLUX-X9PRO",  "KOOLUX", "X9 Pro E-Bike",   1, "[]",
         580, 899, 829,
         "48V 21Ah", "1000W", "35 km/h", "60-120 km", "29 inch", "150 kg", "28 kg", "33 kg",
         ["Black", "Gray"], "Available"),

        (koolux_id, "KOOLUX-X9MINI", "KOOLUX", "X9 Mini E-Bike",  1, "[]",
         350, 549, 499,
         "36V 13Ah", "350W", "25 km/h", "35-70 km", "24 inch", "100 kg", "19 kg", "23 kg",
         ["White", "Pink"], "Pre-sale"),

        # ── KOOLUX E-SCOOTERS ────────────────────────────────────────────────
        (koolux_id, "KOOLUX-U1",     "KOOLUX", "U1 E-Scooter",    1, "[]",
         319, 509, 469,
         "48V 15Ah", "500W", "25 km/h", "40-80 km", "10 inch", "120 kg", "19 kg", "23 kg",
         ["Black", "White"], "Available"),

        (koolux_id, "KOOLUX-U1PRO",  "KOOLUX", "U1 Pro E-Scooter",1, "[]",
         412, 659, 609,
         "48V 20Ah", "1000W", "35 km/h", "55-100 km", "10 inch", "120 kg", "22 kg", "26 kg",
         ["Black"], "Available"),

        # ── VIPCOO E-SCOOTERS ────────────────────────────────────────────────
        (vipcoo_id, "IENYRID-M4S+24","iENYRID", "M4 Pro S+ 2024",  1, "[]",
         290, 449, 409,
         "48V 13Ah", "500W", "25 km/h", "40-80 km", "10 inch", "120 kg", "16 kg", "20 kg",
         ["Black"], "Available"),

        (vipcoo_id, "IENYRID-M4S25", "iENYRID", "M4 Pro S 2025",   1, "[]",
         322, 499, 459,
         "48V 15Ah", "500W", "25 km/h", "45-85 km", "10 inch", "120 kg", "17 kg", "21 kg",
         ["Black", "Gray"], "Available"),

        (vipcoo_id, "IENYRID-ES1",   "iENYRID", "ES1 E-Scooter",   1, "[]",
         470, 699, 649,
         "60V 20Ah", "1000W", "45 km/h", "55-90 km", "11 inch", "120 kg", "21 kg", "25 kg",
         ["Black"], "Available"),

        (vipcoo_id, "IENYRID-S1",    "iENYRID", "S1 E-Scooter",    1, "[]",
         330, 499, 459,
         "48V 15Ah", "500W", "25 km/h", "45-80 km", "10 inch", "120 kg", "17 kg", "21 kg",
         ["Black", "White"], "Available"),

        (vipcoo_id, "VIPCOO-VS6",    "VIPCOO",  "VS6 2025",        1, "[]",
         375, 599, 549,
         "48V 18Ah", "800W", "35 km/h", "50-90 km", "10 inch", "120 kg", "18 kg", "22 kg",
         ["Black", "Red"], "Available"),

        (vipcoo_id, "VIPCOO-VS6PRO", "VIPCOO",  "VS6 Pro 2025",    1, "[]",
         470, 749, 689,
         "60V 20Ah", "1000W", "45 km/h", "55-100 km", "11 inch", "120 kg", "22 kg", "26 kg",
         ["Black"], "Available"),

        (vipcoo_id, "VIPCOO-VS9",    "VIPCOO",  "VS9 2025",        1, "[]",
         730, 1149, 1049,
         "72V 25Ah", "2000W", "60 km/h", "70-120 km", "11 inch", "150 kg", "29 kg", "34 kg",
         ["Black"], "Available"),

        # ── VIPCOO E-BIKES (Hidoes) ──────────────────────────────────────────
        (vipcoo_id, "HIDOES-C5",     "Hidoes", "C5 E-Bike",        1, "[]",
         285, 449, 409,
         "36V 10Ah", "250W", "25 km/h", "30-60 km", "26 inch", "100 kg", "17 kg", "21 kg",
         ["Black", "White"], "Available"),

        (vipcoo_id, "HIDOES-F3",     "Hidoes", "F3 E-Bike",        1, "[]",
         441, 699, 639,
         "48V 15Ah", "500W", "25 km/h", "45-85 km", "27.5 inch", "120 kg", "22 kg", "26 kg",
         ["Black", "Gray"], "Available"),

        (vipcoo_id, "HIDOES-F3PRO",  "Hidoes", "F3 Pro E-Bike",    1, "[]",
         570, 899, 829,
         "48V 17.5Ah", "750W", "25 km/h", "55-100 km", "27.5 inch", "130 kg", "25 kg", "29 kg",
         ["Black"], "Available"),

        (vipcoo_id, "HIDOES-B6MINI", "Hidoes", "B6 Mini E-Bike",   1, "[]",
         441, 699, 639,
         "48V 15Ah", "500W", "25 km/h", "45-85 km", "20 inch", "120 kg", "21 kg", "25 kg",
         ["Black", "White"], "Available"),

        (vipcoo_id, "HIDOES-B6BLK",  "Hidoes", "B6 Black E-Bike",  1, "[]",
         635, 999, 919,
         "48V 21Ah", "1000W", "35 km/h", "60-120 km", "26 inch", "150 kg", "28 kg", "33 kg",
         ["Black"], "Available"),

        (vipcoo_id, "HIDOES-B6RED",  "Hidoes", "B6 Red E-Bike",    1, "[]",
         635, 999, 919,
         "48V 21Ah", "1000W", "35 km/h", "60-120 km", "26 inch", "150 kg", "28 kg", "33 kg",
         ["Red"], "Available"),

        (vipcoo_id, "HIDOES-B9",     "Hidoes", "B9 E-Bike",        1, "[]",
         620, 979, 899,
         "48V 21Ah", "1000W", "35 km/h", "60-115 km", "27.5 inch", "150 kg", "29 kg", "34 kg",
         ["Black", "Gray"], "Available"),

        (vipcoo_id, "HIDOES-P1",     "Hidoes", "HD-P1 E-Bike",     1, "[]",
         670, 899, 829,
         "48V 15Ah", "500W", "25 km/h", "45-85 km", "26 inch", "120 kg", "24 kg", "28 kg",
         ["Black"], "Available"),

        # ── VIPCOO DIRT BIKES (No_eBay) ──────────────────────────────────────
        (vipcoo_id, "VIPCOO-H3",     "VIPCOO", "H3 Dirt Bike",     1, '["No_eBay"]',
         975, 1499, 1379,
         "TBD", "TBD", "TBD", "TBD", "TBD", "TBD", "TBD", "TBD",
         ["Black", "Green"], "Available"),

        (vipcoo_id, "VIPCOO-H2",     "VIPCOO", "H2 Dirt Bike",     1, '["No_eBay"]',
         925, 1449, 1329,
         "TBD", "TBD", "TBD", "TBD", "TBD", "TBD", "TBD", "TBD",
         ["Black", "Red"], "Available"),
    ]

    for row in products:
        (sup_id, sku, brand, model, is_active, restrictions,
         unit_cost, rrp, retail,
         battery, motor, max_speed, rng, tire, max_load, net_wt, gross_wt,
         colors, stock_status) = row

        cur.execute(
            "INSERT INTO Product (supplier_id, sku, brand, model_name, is_active, sales_channel_restrictions)"
            " VALUES (?,?,?,?,?,?)",
            (sup_id, sku, brand, model, is_active, restrictions)
        )
        pid = cur.lastrowid

        cur.execute(
            "INSERT INTO Pricing (product_id, supplier_unit_cost, supplier_rrp, retail_price)"
            " VALUES (?,?,?,?)",
            (pid, unit_cost, rrp, retail)
        )

        cur.execute(
            "INSERT INTO Specifications (product_id, battery_capacity, motor_power, max_speed,"
            " range, tire_size, max_load, net_weight, gross_weight)"
            " VALUES (?,?,?,?,?,?,?,?,?)",
            (pid, battery, motor, max_speed, rng, tire, max_load, net_wt, gross_wt)
        )

        for color in colors:
            cur.execute(
                "INSERT INTO Variants (product_id, color, stock_status) VALUES (?,?,?)",
                (pid, color, stock_status)
            )

    conn.commit()
    conn.close()
    print(f"Database created at: {DB_PATH}")
    print(f"Total products inserted: {len(products)}")

if __name__ == "__main__":
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print("Removed existing database.")
    create_database()
