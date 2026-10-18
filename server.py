"""Flask API and SQLite persistence for The Caffeine Craft Cafe."""
from __future__ import annotations

import hmac
import os
import re
import sqlite3
import uuid
from datetime import datetime
from functools import wraps
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request, session, send_from_directory

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")
INSTANCE = Path(os.environ.get("TCC_INSTANCE_DIR", ROOT / "instance"))
DB_PATH = Path(os.environ.get("TCC_DATABASE", INSTANCE / "cafe.sqlite3"))
INSTANCE.mkdir(parents=True, exist_ok=True)

app = Flask(__name__, static_folder=None)
app.secret_key = os.environ.get("TCC_SECRET_KEY", "")
app.config.update(SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE="Lax", MAX_CONTENT_LENGTH=2 * 1024 * 1024)

MENU = [
    ("Iced Americano",80,"Cold Beverages"),("Ice Mocha",110,"Cold Beverages"),("Cold Coffee Frappe",120,"Cold Beverages"),("Hazelnut Frappe",140,"Cold Beverages"),("Vanilla Frappe",140,"Cold Beverages"),("Butterscotch Frappe",140,"Cold Beverages"),("Caramel Frappe",140,"Cold Beverages"),("Choco Chip Frappe",150,"Cold Beverages"),("Double Choco Chip Frappe",160,"Cold Beverages"),("Green Apple Soda",110,"Cold Beverages"),("Classic Mojito",110,"Cold Beverages"),("Kiwi Mojito",110,"Cold Beverages"),("Strawberry Mint Mojito",110,"Cold Beverages"),("Passion Fruit Mojito",90,"Cold Beverages"),("Lemon Iced Tea",90,"Cold Beverages"),("Peach Iced Tea",90,"Cold Beverages"),("Passion Fruit Iced Tea",90,"Cold Beverages"),("Rocher Delight",180,"Cold Beverages"),
    ("Forest Berries Shake",140,"Milkshakes"),("Bubblegum Shake",140,"Milkshakes"),("Oreo Shake",140,"Milkshakes"),("Nutty Nutella Shake",150,"Milkshakes"),("Red Velvet Shake",140,"Milkshakes"),("Blueberry Cheesecake Shake",160,"Milkshakes"),("KitKat Shake",170,"Milkshakes"),("Lotus Biscoff Shake",170,"Milkshakes"),("Choco Brownie Crumble Shake",170,"Milkshakes"),("Cookie Crumble Shake",170,"Milkshakes"),
    ("Americano Black Coffee",80,"Hot Beverages"),("Cappuccino",90,"Hot Beverages"),("Latte",90,"Hot Beverages"),("Mocha",110,"Hot Beverages"),("Irish Coffee",120,"Hot Beverages"),("Vanilla Cappuccino",120,"Hot Beverages"),("Hazelnut Cappuccino",120,"Hot Beverages"),("Rose Cappuccino",120,"Hot Beverages"),("Hazelnut Latte",120,"Hot Beverages"),("Vanilla Latte",120,"Hot Beverages"),("Nutella Latte",120,"Hot Beverages"),("Biscoff Latte",120,"Hot Beverages"),("Plain Hot Chocolate",110,"Hot Beverages"),("Oreo Hot Chocolate",120,"Hot Beverages"),("Coconut Hot Chocolate",140,"Hot Beverages"),("Caramel Hot Chocolate",140,"Hot Beverages"),("Roasted Hazelnut Hot Chocolate",140,"Hot Beverages"),("Nutella Hot Chocolate",140,"Hot Beverages"),
]
DEFAULT_SETTINGS = {"business_name":"The Caffeine Craft Cafe","address":"Prosperity Society, Gulab Vihar, near Vitthal Mandir Road, Ganesh Nagar, Karvenagar, Pune, Maharashtra 411052","phone":"077749 63125","opening_hours":"11:00 AM – 11:30 PM","pickup_enabled":False,"delivery_enabled":False,"delivery_fee":0,"tax_rate":0,"promotion_code":None,"promotion_description":None,"promotion_percent":0,"rating_reference":4.9,"review_count_reference":203,"rating_verified":False}

def connect():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    return db

def init_db():
    with connect() as db:
        db.executescript((ROOT / "database" / "schema.sql").read_text())
        now=iso_now()
        for i,name in enumerate(("Cold Beverages","Milkshakes","Hot Beverages"),1):
            db.execute("INSERT OR IGNORE INTO categories(id,name,sort_order,is_active,created_at) VALUES(?,?,?,?,?)",(str(uuid.uuid4()),name,i,1,now))
        cat={r["name"]:r["id"] for r in db.execute("SELECT id,name FROM categories")}
        for name,price,category in MENU:
            db.execute("INSERT OR IGNORE INTO products(id,category_id,name,price,is_available,is_published,status,created_at,updated_at) VALUES(?,?,?,?,1,1,'published',?,?)",(str(uuid.uuid4()),cat[category],name,price,now,now))
        if not db.execute("SELECT 1 FROM business_settings WHERE id=1").fetchone():
            cols=", ".join(DEFAULT_SETTINGS)
            vals=", ".join("?" for _ in DEFAULT_SETTINGS)
            db.execute(f"INSERT INTO business_settings(id,{cols}) VALUES(1,{vals})",tuple(int(v) if isinstance(v,bool) else v for v in DEFAULT_SETTINGS.values()))

def iso_now(): return datetime.now().astimezone().isoformat(timespec="seconds")
def bools(row, keys):
    value=dict(row)
    for key in keys:
        if key in value: value[key]=bool(value[key])
    return value
def settings_row(db): return bools(db.execute("SELECT * FROM business_settings WHERE id=1").fetchone(),("pickup_enabled","delivery_enabled","rating_verified"))
def public_product(row):
    item=dict(row)
    import json
    item["dietary_labels"]=json.loads(item.get("dietary_labels") or "[]")
    item["is_available"]=bool(item["is_available"]); item["is_published"]=bool(item["is_published"])
    return item
def body(): return request.get_json(silent=True) or {}
def fail(message, status=400): return jsonify(error=message),status
def admin_required(fn):
    @wraps(fn)
    def wrapped(*args,**kwargs):
        if not session.get("admin"): return fail("Sign in with an authorized staff account.",401)
        return fn(*args,**kwargs)
    return wrapped

@app.get("/")
def index(): return send_from_directory(ROOT,"index.html")
@app.get("/<path:filename>")
def assets(filename):
    if filename.startswith("api/"): return fail("Not found.",404)
    if filename.startswith("images/"):
        return send_from_directory(ROOT / "public", filename)
    if filename in {"app.js", "styles.css"}:
        return send_from_directory(ROOT,filename)
    return fail("Not found.",404)

@app.get("/api/public")
def public_data():
    with connect() as db:
        products=[public_product(r) for r in db.execute("SELECT * FROM products WHERE is_published=1 AND is_available=1 AND price IS NOT NULL ORDER BY name")]
        categories=[dict(r) for r in db.execute("SELECT id,name,sort_order FROM categories WHERE is_active=1 ORDER BY sort_order")]
        return jsonify(products=products,categories=categories,settings=settings_row(db))

@app.post("/api/orders")
def create_order():
    data=body(); name=str(data.get("name","")).strip(); phone=re.sub(r"\D","",str(data.get("phone","")))[-10:]
    if len(name)<2 or len(name)>100: return fail("Please enter a valid name.")
    if not re.fullmatch(r"[6-9]\d{9}",phone): return fail("Enter a valid 10-digit Indian mobile number.")
    email=str(data.get("email","")).strip() or None
    if email and (len(email)>254 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+",email)): return fail("Enter a valid email address.")
    notes=str(data.get("notes","")).strip() or None
    if notes and len(notes)>500: return fail("Order notes must be 500 characters or fewer.")
    fulfillment=data.get("fulfillment","pickup"); address=str(data.get("delivery_address","")).strip() or None
    items=data.get("items")
    if fulfillment not in ("pickup","delivery"): return fail("Choose a valid fulfillment option.")
    if not isinstance(items,list) or not 1<=len(items)<=30: return fail("Your cart is empty or contains too many items.")
    normalized={}
    for item in items:
        try: pid=str(item["product_id"]); qty=int(item["quantity"])
        except (KeyError,TypeError,ValueError): return fail("Your cart has invalid items.")
        if qty<1 or qty>20 or pid in normalized: return fail("Your cart has invalid or duplicate items.")
        normalized[pid]=qty
    with connect() as db:
        settings=settings_row(db)
        if fulfillment=="pickup" and not settings["pickup_enabled"]: return fail("Online pickup is not enabled.")
        if fulfillment=="delivery" and not settings["delivery_enabled"]: return fail("Delivery is not enabled.")
        if fulfillment=="delivery" and (not address or len(address)<8 or len(address)>500): return fail("Enter a valid delivery address.")
        products=[]
        for pid,qty in normalized.items():
            product=db.execute("SELECT * FROM products WHERE id=? AND is_published=1 AND is_available=1 AND price IS NOT NULL",(pid,)).fetchone()
            if not product: return fail("One or more items are unavailable. Please refresh your menu.")
            products.append((product,qty))
        subtotal=round(sum(float(p["price"])*q for p,q in products),2)
        tax=round(subtotal*float(settings["tax_rate"])/100,2)
        fee=float(settings["delivery_fee"]) if fulfillment=="delivery" else 0
        promo=str(data.get("promotion_code","")).strip()
        discount=round(subtotal*float(settings["promotion_percent"])/100,2) if settings["promotion_code"] and promo.casefold()==settings["promotion_code"].casefold() else 0
        total=max(0,round(subtotal+tax+fee-discount,2)); now=iso_now(); oid=str(uuid.uuid4())
        db.execute("INSERT INTO order_counter(created_at) VALUES(?)",(now,)); seq=db.execute("SELECT last_insert_rowid()").fetchone()[0]
        order_number=f"TCC-{datetime.now().astimezone().strftime('%y%m%d')}-{seq:06d}"
        db.execute("INSERT INTO orders VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",(oid,order_number,name,phone,email,notes,fulfillment,address,"pending",subtotal,tax,fee,discount,total,now,now))
        for product,qty in products:
            db.execute("INSERT INTO order_items VALUES(?,?,?,?,?,?,?)",(str(uuid.uuid4()),oid,product["id"],product["name"],product["price"],qty,round(product["price"]*qty,2)))
        return jsonify(order_number=order_number,total=total,subtotal=subtotal,tax=tax,fee=fee,discount=discount),201

@app.post("/api/orders/track")
def track_order():
    data=body(); number=str(data.get("order_number","")).strip(); phone=re.sub(r"\D","",str(data.get("phone","")))[-10:]
    with connect() as db:
        row=db.execute("SELECT order_number,status,created_at FROM orders WHERE order_number=? AND customer_phone=?",(number,phone)).fetchone()
        return jsonify(dict(row) if row else None)

@app.get("/api/admin/me")
def admin_me():
    if not session.get("admin"): return fail("Not signed in.",401)
    return jsonify(admin=True)
@app.post("/api/admin/login")
def admin_login():
    email=os.environ.get("TCC_ADMIN_EMAIL",""); password=os.environ.get("TCC_ADMIN_PASSWORD",""); data=body()
    if not email or not password: return fail("Set TCC_ADMIN_EMAIL and TCC_ADMIN_PASSWORD on the server before signing in.",503)
    if not hmac.compare_digest(str(data.get("email","" )).lower(),email.lower()) or not hmac.compare_digest(str(data.get("password","")),password): return fail("Email or password is incorrect.",401)
    session.clear(); session["admin"]=True; return jsonify(admin=True)
@app.post("/api/admin/logout")
def admin_logout(): session.clear(); return jsonify(ok=True)
@app.get("/api/admin/orders")
@admin_required
def admin_orders():
    with connect() as db:
        rows=[]
        for row in db.execute("SELECT * FROM orders ORDER BY created_at DESC LIMIT 100"):
            item=dict(row); item["items"]=[dict(x) for x in db.execute("SELECT product_name,unit_price,quantity,line_total FROM order_items WHERE order_id=?",(item["id"],))]; rows.append(item)
        return jsonify(rows)
@app.patch("/api/admin/orders/<order_id>")
@admin_required
def update_order(order_id):
    status=body().get("status"); allowed={"pending","confirmed","preparing","ready","out_for_delivery","completed","cancelled"}
    if status not in allowed:return fail("Invalid order status.")
    with connect() as db:
        if not db.execute("UPDATE orders SET status=?,updated_at=? WHERE id=?",(status,iso_now(),order_id)).rowcount:return fail("Order not found.",404)
    return jsonify(ok=True)
@app.get("/api/admin/products")
@admin_required
def admin_products():
    with connect() as db:return jsonify([public_product(r) for r in db.execute("SELECT * FROM products ORDER BY created_at DESC,name")])
@app.post("/api/admin/products")
@admin_required
def add_product():
    d=body(); name=str(d.get("name","")).strip()
    try: price=float(d["price"])
    except (KeyError,TypeError,ValueError): return fail("Enter a valid price.")
    if not name or len(name)>120 or price<0:return fail("Enter a valid name and price.")
    pid=str(uuid.uuid4());now=iso_now()
    with connect() as db:
        if not db.execute("SELECT 1 FROM categories WHERE id=?",(d.get("category_id"),)).fetchone():return fail("Choose a valid category.")
        db.execute("INSERT INTO products(id,category_id,name,description,price,photo_url,is_available,is_published,status,created_at,updated_at) VALUES(?,?,?,?,?,?,0,0,'draft',?,?)",(pid,d["category_id"],name,d.get("description") or None,price,d.get("photo_url") or None,now,now))
    return jsonify(id=pid),201
@app.patch("/api/admin/products/<product_id>")
@admin_required
def update_product(product_id):
    d=body(); allowed={"price","description","photo_url","category_id","is_available","is_published"}; updates={k:v for k,v in d.items() if k in allowed}
    if not updates:return fail("No supported fields to update.")
    for key in ("is_available","is_published"):
        if key in updates:updates[key]=int(bool(updates[key]))
    if "price" in updates:
        try: updates["price"]=float(updates["price"]) if updates["price"] not in (None,"") else None
        except (TypeError,ValueError):return fail("Enter a valid price.")
        if updates["price"] is not None and updates["price"]<0:return fail("Price cannot be negative.")
    if "category_id" in updates and updates["category_id"]:
        with connect() as db:
            if not db.execute("SELECT 1 FROM categories WHERE id=?",(updates["category_id"],)).fetchone():return fail("Choose a valid category.")
    updates["updated_at"]=iso_now(); assignments=", ".join(f"{k}=?" for k in updates)
    with connect() as db:
        if not db.execute(f"UPDATE products SET {assignments} WHERE id=?",(*updates.values(),product_id)).rowcount:return fail("Product not found.",404)
        db.execute("UPDATE products SET status=CASE WHEN is_published=1 THEN 'published' ELSE 'draft' END WHERE id=?",(product_id,))
    return jsonify(ok=True)
@app.get("/api/admin/categories")
@admin_required
def admin_categories():
    with connect() as db:return jsonify([dict(r) for r in db.execute("SELECT * FROM categories ORDER BY sort_order,name")])
@app.post("/api/admin/categories")
@admin_required
def add_category():
    name=str(body().get("name","")).strip()
    if not name or len(name)>80:return fail("Enter a valid category name.")
    with connect() as db:
        try: db.execute("INSERT INTO categories VALUES(?,?,?,?,?)",(str(uuid.uuid4()),name,db.execute("SELECT COUNT(*) FROM categories").fetchone()[0]+1,1,iso_now()))
        except sqlite3.IntegrityError:return fail("That category already exists.")
    return jsonify(ok=True),201
@app.patch("/api/admin/categories/<category_id>")
@admin_required
def update_category(category_id):
    name=str(body().get("name","")).strip()
    if not name or len(name)>80:return fail("Enter a valid category name.")
    with connect() as db:
        try:
            if not db.execute("UPDATE categories SET name=? WHERE id=?",(name,category_id)).rowcount:return fail("Category not found.",404)
        except sqlite3.IntegrityError:return fail("That category already exists.")
    return jsonify(ok=True)
@app.get("/api/admin/settings")
@admin_required
def get_admin_settings():
    with connect() as db:return jsonify(settings_row(db))
@app.put("/api/admin/settings")
@admin_required
def update_settings():
    d=body(); fields={k:d[k] for k in DEFAULT_SETTINGS if k in d}
    for k in ("pickup_enabled","delivery_enabled","rating_verified"):
        if k in fields:fields[k]=int(bool(fields[k]))
    for k in ("tax_rate","delivery_fee","promotion_percent","rating_reference","review_count_reference"):
        if k in fields:
            try:fields[k]=float(fields[k])
            except (TypeError,ValueError):return fail(f"Enter a valid {k.replace('_',' ')}.")
    if fields.get("tax_rate",0)<0 or fields.get("tax_rate",0)>100 or fields.get("promotion_percent",0)<0 or fields.get("promotion_percent",0)>100 or fields.get("delivery_fee",0)<0:return fail("Tax, promotion and delivery values are out of range.")
    if "promotion_code" in fields:fields["promotion_code"]=str(fields["promotion_code"]).strip() or None
    if "promotion_description" in fields:fields["promotion_description"]=str(fields["promotion_description"]).strip() or None
    if not fields:return fail("No settings to save.")
    with connect() as db:db.execute("UPDATE business_settings SET "+", ".join(f"{k}=?" for k in fields)+" WHERE id=1",tuple(fields.values()))
    return jsonify(ok=True)

init_db()

if __name__ == "__main__":
    if not app.secret_key:
        raise SystemExit("Set TCC_SECRET_KEY to a long random value before starting the server.")
    app.run(host=os.environ.get("HOST","127.0.0.1"),port=int(os.environ.get("PORT","5000")),debug=False)
