# -*- coding: utf-8 -*-
import os
import shutil
import socket
import sqlite3
import sys
import threading
import webbrowser
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

from flask import Flask, g, jsonify, request, send_from_directory


if getattr(sys, "frozen", False):
    BASE_DIR = os.path.dirname(sys.executable)
    RESOURCE_DIR = getattr(sys, "_MEIPASS", BASE_DIR)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    RESOURCE_DIR = BASE_DIR

DATA_DIR = os.path.join(BASE_DIR, "data")
BACKUP_DIR = os.path.join(BASE_DIR, "backups")
DB_PATH = os.path.join(DATA_DIR, "jxc_v2.db")
PRINT_TEMPLATE_PATH = os.path.join(DATA_DIR, "打印单模板.html")

app = Flask(__name__, static_folder=os.path.join(RESOURCE_DIR, "static"), static_url_path="/static")


def money(value):
    return float(Decimal(str(value or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def now_text():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def find_available_port(preferred):
    for port in range(int(preferred), int(preferred) + 20):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            sock.bind(("127.0.0.1", port))
            return port
        except OSError:
            pass
        finally:
            sock.close()
    return int(preferred)


def today_no():
    return datetime.now().strftime("%Y%m%d")


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(_exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def rows(sql, args=()):
    return [dict(r) for r in get_db().execute(sql, args).fetchall()]


def one(sql, args=()):
    row = get_db().execute(sql, args).fetchone()
    return dict(row) if row else None


def execute(sql, args=()):
    return get_db().execute(sql, args)


def init_db():
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(BACKUP_DIR, exist_ok=True)
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    db.executescript(
        """
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            category TEXT DEFAULT '',
            spec TEXT DEFAULT '',
            unit TEXT DEFAULT '件',
            sub_unit TEXT DEFAULT '',
            conversion_ratio REAL DEFAULT 1,
            cost_price REAL DEFAULT 0,
            sale_price REAL DEFAULT 0,
            min_stock REAL DEFAULT 0,
            remark TEXT DEFAULT '',
            active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS partners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL CHECK(type IN ('customer','supplier')),
            code TEXT DEFAULT '',
            name TEXT NOT NULL,
            contact TEXT DEFAULT '',
            phone TEXT DEFAULT '',
            address TEXT DEFAULT '',
            remark TEXT DEFAULT '',
            active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS warehouses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT DEFAULT '',
            name TEXT NOT NULL,
            remark TEXT DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS inventory (
            product_id INTEGER NOT NULL,
            warehouse_id INTEGER NOT NULL,
            quantity REAL NOT NULL DEFAULT 0,
            cost_price REAL NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL,
            PRIMARY KEY(product_id, warehouse_id),
            FOREIGN KEY(product_id) REFERENCES products(id),
            FOREIGN KEY(warehouse_id) REFERENCES warehouses(id)
        );
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            doc_no TEXT NOT NULL UNIQUE,
            doc_type TEXT NOT NULL,
            partner_id INTEGER,
            warehouse_id INTEGER NOT NULL,
            operator TEXT DEFAULT '',
            department TEXT DEFAULT '',
            total_amount REAL NOT NULL DEFAULT 0,
            discount_rate REAL NOT NULL DEFAULT 0,
            paid_amount REAL NOT NULL DEFAULT 0,
            balance_amount REAL NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'posted',
            remark TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            voided_at TEXT DEFAULT '',
            FOREIGN KEY(partner_id) REFERENCES partners(id),
            FOREIGN KEY(warehouse_id) REFERENCES warehouses(id)
        );
        CREATE TABLE IF NOT EXISTS document_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity REAL NOT NULL,
            sub_quantity REAL NOT NULL DEFAULT 0,
            unit_price REAL NOT NULL,
            cost_price REAL NOT NULL DEFAULT 0,
            amount REAL NOT NULL,
            remark TEXT DEFAULT '',
            FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE,
            FOREIGN KEY(product_id) REFERENCES products(id)
        );
        CREATE TABLE IF NOT EXISTS stock_movements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            warehouse_id INTEGER NOT NULL,
            document_id INTEGER,
            doc_no TEXT NOT NULL,
            doc_type TEXT NOT NULL,
            direction INTEGER NOT NULL,
            quantity REAL NOT NULL,
            before_qty REAL NOT NULL,
            after_qty REAL NOT NULL,
            cost_price REAL NOT NULL DEFAULT 0,
            operator TEXT DEFAULT '',
            remark TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            FOREIGN KEY(product_id) REFERENCES products(id),
            FOREIGN KEY(warehouse_id) REFERENCES warehouses(id),
            FOREIGN KEY(document_id) REFERENCES documents(id)
        );
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS operation_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            target_type TEXT NOT NULL DEFAULT '',
            target_id INTEGER,
            doc_no TEXT DEFAULT '',
            summary TEXT DEFAULT '',
            operator TEXT DEFAULT '',
            created_at TEXT NOT NULL
        );
        """
    )
    existing_item_cols = [r[1] for r in db.execute("PRAGMA table_info(document_items)").fetchall()]
    if "sub_quantity" not in existing_item_cols:
        db.execute("ALTER TABLE document_items ADD COLUMN sub_quantity REAL NOT NULL DEFAULT 0")
    if db.execute("SELECT COUNT(*) FROM warehouses").fetchone()[0] == 0:
        db.execute("INSERT INTO warehouses(code,name,remark) VALUES(?,?,?)", ("001", "默认仓库", "系统默认"))
    if db.execute("SELECT COUNT(*) FROM products").fetchone()[0] == 0:
        t = now_text()
        db.executemany(
            """INSERT INTO products(code,name,category,spec,unit,cost_price,sale_price,min_stock,created_at)
               VALUES(?,?,?,?,?,?,?,?,?)""",
            [
                ("SP001", "测试商品A", "分类1", "500g", "件", 10, 15, 5, t),
                ("SP002", "测试商品B", "分类1", "1kg", "箱", 20, 30, 3, t),
                ("SP003", "测试商品C", "分类2", "10kg", "袋", 100, 150, 1, t),
            ],
        )
    if db.execute("SELECT COUNT(*) FROM partners").fetchone()[0] == 0:
        t = now_text()
        db.executemany(
            """INSERT INTO partners(type,code,name,contact,phone,address,created_at)
               VALUES(?,?,?,?,?,?,?)""",
            [
                ("customer", "KH001", "测试客户A", "张三", "13800138001", "", t),
                ("customer", "KH002", "测试客户B", "李四", "13800138002", "", t),
                ("supplier", "GYS001", "测试供应商A", "王五", "13900139001", "", t),
                ("supplier", "GYS002", "测试供应商B", "赵六", "13900139002", "", t),
            ],
        )
    db.commit()
    db.close()


DOC_RULES = {
    "purchase_in": {"prefix": "CG", "partner": "supplier", "stock": 1, "label": "采购入库"},
    "purchase_return": {"prefix": "CT", "partner": "supplier", "stock": -1, "label": "采购退货"},
    "sale_out": {"prefix": "XS", "partner": "customer", "stock": -1, "label": "销售出库"},
    "sale_return": {"prefix": "XT", "partner": "customer", "stock": 1, "label": "销售退货"},
}


def next_doc_no(doc_type):
    prefix = DOC_RULES[doc_type]["prefix"] + today_no()
    count = one("SELECT COUNT(*) AS c FROM documents WHERE doc_no LIKE ?", (prefix + "%",))["c"] + 1
    return "%s%04d" % (prefix, count)


def ensure_inventory(product_id, warehouse_id):
    inv = one(
        "SELECT * FROM inventory WHERE product_id=? AND warehouse_id=?",
        (product_id, warehouse_id),
    )
    if inv:
        return inv
    product = one("SELECT cost_price FROM products WHERE id=?", (product_id,))
    execute(
        "INSERT INTO inventory(product_id,warehouse_id,quantity,cost_price,updated_at) VALUES(?,?,?,?,?)",
        (product_id, warehouse_id, 0, product["cost_price"] if product else 0, now_text()),
    )
    return one("SELECT * FROM inventory WHERE product_id=? AND warehouse_id=?", (product_id, warehouse_id))


def apply_stock(product_id, warehouse_id, document_id, doc_no, doc_type, qty, unit_price, operator, remark, reverse=False):
    rule_direction = DOC_RULES[doc_type]["stock"]
    direction = -rule_direction if reverse else rule_direction
    inv = ensure_inventory(product_id, warehouse_id)
    before_qty = float(inv["quantity"])
    change_qty = float(qty) * direction
    after_qty = before_qty + change_qty

    cost_price = float(inv["cost_price"] or 0)
    if not reverse and doc_type == "purchase_in" and after_qty > 0:
        old_value = before_qty * cost_price
        new_value = float(qty) * float(unit_price)
        cost_price = money((old_value + new_value) / after_qty)
    elif not reverse and doc_type in ("sale_out", "sale_return", "purchase_return"):
        if cost_price <= 0:
            product = one("SELECT cost_price FROM products WHERE id=?", (product_id,))
            cost_price = float(product["cost_price"] or 0)

    execute(
        "UPDATE inventory SET quantity=?, cost_price=?, updated_at=? WHERE product_id=? AND warehouse_id=?",
        (after_qty, cost_price, now_text(), product_id, warehouse_id),
    )
    execute(
        """INSERT INTO stock_movements(product_id,warehouse_id,document_id,doc_no,doc_type,direction,
           quantity,before_qty,after_qty,cost_price,operator,remark,created_at)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            product_id,
            warehouse_id,
            document_id,
            doc_no,
            doc_type,
            direction,
            float(qty),
            before_qty,
            after_qty,
            cost_price,
            operator or "",
            remark or "",
            now_text(),
        ),
    )
    return cost_price


def log_operation(action, target_type="", target_id=None, doc_no="", summary="", operator=""):
    execute(
        """INSERT INTO operation_logs(action,target_type,target_id,doc_no,summary,operator,created_at)
           VALUES(?,?,?,?,?,?,?)""",
        (action, target_type or "", target_id, doc_no or "", summary or "", operator or "", now_text()),
    )


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/api/health")
def health():
    return jsonify({"ok": True, "time": now_text()})


@app.route("/api/products", methods=["GET", "POST"])
def products():
    db = get_db()
    if request.method == "GET":
        q = request.args.get("q", "").strip()
        if q:
            like = "%" + q + "%"
            return jsonify(rows("SELECT * FROM products WHERE active=1 AND (code LIKE ? OR name LIKE ?) ORDER BY code", (like, like)))
        return jsonify(rows("SELECT * FROM products WHERE active=1 ORDER BY code"))
    data = request.get_json() or {}
    cur = db.execute(
        """INSERT INTO products(code,name,category,spec,unit,sub_unit,conversion_ratio,cost_price,sale_price,min_stock,remark,created_at)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            data.get("code", "").strip(),
            data.get("name", "").strip(),
            data.get("category", ""),
            data.get("spec", ""),
            data.get("unit", "件"),
            data.get("sub_unit", ""),
            float(data.get("conversion_ratio") or 1),
            money(data.get("cost_price")),
            money(data.get("sale_price")),
            float(data.get("min_stock") or 0),
            data.get("remark", ""),
            now_text(),
        ),
    )
    db.commit()
    return jsonify(one("SELECT * FROM products WHERE id=?", (cur.lastrowid,)))


@app.route("/api/products/<int:item_id>", methods=["PUT", "DELETE"])
def product_detail(item_id):
    db = get_db()
    if request.method == "DELETE":
        used = one("SELECT COUNT(*) AS c FROM document_items WHERE product_id=?", (item_id,))["c"]
        inv_qty = one("SELECT COALESCE(SUM(quantity),0) AS q FROM inventory WHERE product_id=?", (item_id,))["q"]
        if used or abs(float(inv_qty or 0)) > 0.00001:
            db.execute("UPDATE products SET active=0 WHERE id=?", (item_id,))
        else:
            db.execute("DELETE FROM products WHERE id=?", (item_id,))
        db.commit()
        return jsonify({"ok": True})
    data = request.get_json() or {}
    fields = ["code", "name", "category", "spec", "unit", "sub_unit", "conversion_ratio", "cost_price", "sale_price", "min_stock", "remark"]
    values = [data.get(f, "") for f in fields]
    db.execute(
        """UPDATE products SET code=?,name=?,category=?,spec=?,unit=?,sub_unit=?,conversion_ratio=?,
           cost_price=?,sale_price=?,min_stock=?,remark=? WHERE id=?""",
        values + [item_id],
    )
    db.commit()
    return jsonify(one("SELECT * FROM products WHERE id=?", (item_id,)))


@app.route("/api/partners/<kind>", methods=["GET", "POST"])
def partners(kind):
    if kind not in ("customer", "supplier"):
        return jsonify({"error": "伙伴类型错误"}), 400
    db = get_db()
    if request.method == "GET":
        return jsonify(rows("SELECT * FROM partners WHERE active=1 AND type=? ORDER BY code,id", (kind,)))
    data = request.get_json() or {}
    cur = db.execute(
        """INSERT INTO partners(type,code,name,contact,phone,address,remark,created_at)
           VALUES(?,?,?,?,?,?,?,?)""",
        (kind, data.get("code", ""), data.get("name", ""), data.get("contact", ""), data.get("phone", ""), data.get("address", ""), data.get("remark", ""), now_text()),
    )
    db.commit()
    return jsonify(one("SELECT * FROM partners WHERE id=?", (cur.lastrowid,)))


@app.route("/api/partners/<kind>/<int:item_id>", methods=["PUT", "DELETE"])
def partner_detail(kind, item_id):
    if kind not in ("customer", "supplier"):
        return jsonify({"error": "伙伴类型错误"}), 400
    db = get_db()
    if request.method == "DELETE":
        used = one("SELECT COUNT(*) AS c FROM documents WHERE partner_id=?", (item_id,))["c"]
        if used:
            db.execute("UPDATE partners SET active=0 WHERE id=? AND type=?", (item_id, kind))
        else:
            db.execute("DELETE FROM partners WHERE id=? AND type=?", (item_id, kind))
        db.commit()
        return jsonify({"ok": True})
    data = request.get_json() or {}
    db.execute(
        "UPDATE partners SET code=?,name=?,contact=?,phone=?,address=?,remark=? WHERE id=? AND type=?",
        (data.get("code", ""), data.get("name", ""), data.get("contact", ""), data.get("phone", ""), data.get("address", ""), data.get("remark", ""), item_id, kind),
    )
    db.commit()
    return jsonify(one("SELECT * FROM partners WHERE id=?", (item_id,)))


@app.route("/api/warehouses")
def warehouses():
    return jsonify(rows("SELECT * FROM warehouses ORDER BY id"))


@app.route("/api/inventory")
def inventory():
    return jsonify(
        rows(
            """
            SELECT p.id AS product_id,p.code AS product_code,p.name AS product_name,p.category,p.spec,p.unit,
                   w.id AS warehouse_id,w.name AS warehouse_name,
                   COALESCE(i.quantity,0) AS quantity,
                   COALESCE(i.cost_price,p.cost_price,0) AS cost_price,
                   p.sale_price,p.min_stock,
                   COALESCE(i.quantity,0) * COALESCE(i.cost_price,p.cost_price,0) AS stock_amount
            FROM products p
            CROSS JOIN warehouses w
            LEFT JOIN inventory i ON i.product_id=p.id AND i.warehouse_id=w.id
            WHERE p.active=1
            ORDER BY p.code,w.id
            """
        )
    )


@app.route("/api/documents", methods=["GET", "POST"])
def documents():
    db = get_db()
    if request.method == "GET":
        doc_type = request.args.get("doc_type", "")
        where = ""
        args = []
        if doc_type:
            where = "WHERE d.doc_type=?"
            args.append(doc_type)
        return jsonify(rows(
            """
            SELECT d.*, p.name AS partner_name, w.name AS warehouse_name
            FROM documents d
            LEFT JOIN partners p ON p.id=d.partner_id
            LEFT JOIN warehouses w ON w.id=d.warehouse_id
            %s ORDER BY d.id DESC
            """ % where,
            args,
        ))

    data = request.get_json() or {}
    doc_type = data.get("doc_type")
    if doc_type not in DOC_RULES:
        return jsonify({"error": "单据类型错误"}), 400
    items = data.get("items") or []
    if not items:
        return jsonify({"error": "请至少添加一条商品明细"}), 400
    try:
        doc_no = next_doc_no(doc_type)
        total = 0
        normalized = []
        for item in items:
            product_id = int(item.get("product_id") or 0)
            qty = float(item.get("quantity") or 0)
            price = money(item.get("unit_price"))
            if product_id <= 0 or qty <= 0:
                raise ValueError("商品和数量不能为空")
            total += qty * price
            sub_qty = float(item.get("sub_quantity") or 0)
            normalized.append((product_id, qty, sub_qty, price, money(qty * price), item.get("remark", "")))
        discount_rate = float(data.get("discount_rate") or 0)
        paid_amount = money(data.get("paid_amount"))
        net_total = money(total * (1 - discount_rate / 100))
        balance = money(net_total - paid_amount)
        created_at = now_text()
        cur = db.execute(
            """INSERT INTO documents(doc_no,doc_type,partner_id,warehouse_id,operator,department,total_amount,
               discount_rate,paid_amount,balance_amount,status,remark,created_at)
               VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                doc_no,
                doc_type,
                data.get("partner_id") or None,
                int(data.get("warehouse_id") or 1),
                data.get("operator", ""),
                data.get("department", ""),
                net_total,
                discount_rate,
                paid_amount,
                balance,
                "posted",
                data.get("remark", ""),
                created_at,
            ),
        )
        document_id = cur.lastrowid
        for product_id, qty, sub_qty, price, amount, remark in normalized:
            cost = apply_stock(product_id, int(data.get("warehouse_id") or 1), document_id, doc_no, doc_type, qty, price, data.get("operator", ""), remark)
            db.execute(
                """INSERT INTO document_items(document_id,product_id,quantity,sub_quantity,unit_price,cost_price,amount,remark)
                   VALUES(?,?,?,?,?,?,?,?)""",
                (document_id, product_id, qty, sub_qty, price, cost, amount, remark),
            )
        log_operation(
            "保存单据",
            "document",
            document_id,
            doc_no,
            "%s 金额 %.2f 明细 %s 行" % (DOC_RULES[doc_type]["label"], net_total, len(normalized)),
            data.get("operator", ""),
        )
        db.commit()
        return jsonify(one("SELECT * FROM documents WHERE id=?", (document_id,)))
    except Exception as exc:
        db.rollback()
        return jsonify({"error": str(exc)}), 400


@app.route("/api/documents/<int:doc_id>", methods=["GET", "DELETE"])
def document_detail(doc_id):
    doc = one(
        """SELECT d.*, p.name AS partner_name, w.name AS warehouse_name
           FROM documents d
           LEFT JOIN partners p ON p.id=d.partner_id
           LEFT JOIN warehouses w ON w.id=d.warehouse_id
           WHERE d.id=?""",
        (doc_id,),
    )
    if not doc:
        return jsonify({"error": "单据不存在"}), 404
    if request.method == "DELETE":
        db = get_db()
        try:
            items = rows("SELECT * FROM document_items WHERE document_id=?", (doc_id,))
            if doc["status"] != "voided":
                for item in items:
                    apply_stock(
                        item["product_id"],
                        doc["warehouse_id"],
                        doc_id,
                        doc["doc_no"],
                        doc["doc_type"],
                        item["quantity"],
                        item["unit_price"],
                        doc["operator"],
                        "删除单据反向冲回",
                        reverse=True,
                    )
            db.execute("DELETE FROM stock_movements WHERE document_id=?", (doc_id,))
            db.execute("DELETE FROM documents WHERE id=?", (doc_id,))
            log_operation(
                "删除单据",
                "document",
                doc_id,
                doc["doc_no"],
                "%s 金额 %.2f" % (DOC_RULES.get(doc["doc_type"], {}).get("label", doc["doc_type"]), doc["total_amount"]),
                doc["operator"],
            )
            db.commit()
            return jsonify({"ok": True})
        except Exception as exc:
            db.rollback()
            return jsonify({"error": str(exc)}), 400
    doc["items"] = rows(
        """SELECT di.*, p.code AS product_code,p.name AS product_name,p.spec,p.unit
           FROM document_items di JOIN products p ON p.id=di.product_id
           WHERE di.document_id=? ORDER BY di.id""",
        (doc_id,),
    )
    return jsonify(doc)


@app.route("/api/documents/<int:doc_id>/void", methods=["POST"])
def void_document(doc_id):
    db = get_db()
    doc = one("SELECT * FROM documents WHERE id=?", (doc_id,))
    if not doc:
        return jsonify({"error": "单据不存在"}), 404
    if doc["status"] == "voided":
        return jsonify({"error": "单据已作废"}), 400
    try:
        items = rows("SELECT * FROM document_items WHERE document_id=?", (doc_id,))
        for item in items:
            apply_stock(
                item["product_id"],
                doc["warehouse_id"],
                doc_id,
                doc["doc_no"],
                doc["doc_type"],
                item["quantity"],
                item["unit_price"],
                doc["operator"],
                "作废反向冲回",
                reverse=True,
            )
        db.execute("UPDATE documents SET status='voided', voided_at=? WHERE id=?", (now_text(), doc_id))
        log_operation(
            "作废单据",
            "document",
            doc_id,
            doc["doc_no"],
            "作废并反向冲回库存",
            doc["operator"],
        )
        db.commit()
        return jsonify({"ok": True})
    except Exception as exc:
        db.rollback()
        return jsonify({"error": str(exc)}), 400


@app.route("/api/movements")
def movements():
    return jsonify(rows(
        """
        SELECT m.*, p.code AS product_code,p.name AS product_name,w.name AS warehouse_name
        FROM stock_movements m
        JOIN products p ON p.id=m.product_id
        JOIN warehouses w ON w.id=m.warehouse_id
        ORDER BY m.id DESC LIMIT 500
        """
    ))


@app.route("/api/operations")
def operations():
    return jsonify(rows(
        """
        SELECT d.id,d.doc_no,d.doc_type,d.total_amount,d.created_at,d.status,d.operator,
               p.name AS partner_name,w.name AS warehouse_name
        FROM documents d
        LEFT JOIN partners p ON p.id=d.partner_id
        LEFT JOIN warehouses w ON w.id=d.warehouse_id
        ORDER BY d.id DESC
        LIMIT 1000
        """
    ))


@app.route("/api/assistant/search")
def assistant_search():
    q = request.args.get("q", "").strip()
    like = "%" + q + "%"
    if not q:
        return jsonify({"query": q, "products": [], "customers": [], "suppliers": [], "documents": [], "inventory": []})
    return jsonify({
        "query": q,
        "products": rows(
            """SELECT id,code,name,category,spec,unit,cost_price,sale_price,min_stock
               FROM products
               WHERE active=1 AND (code LIKE ? OR name LIKE ? OR category LIKE ? OR spec LIKE ?)
               ORDER BY code LIMIT 50""",
            (like, like, like, like),
        ),
        "customers": rows(
            """SELECT id,code,name,contact,phone,address
               FROM partners
               WHERE active=1 AND type='customer' AND (code LIKE ? OR name LIKE ? OR contact LIKE ? OR phone LIKE ?)
               ORDER BY code,id LIMIT 50""",
            (like, like, like, like),
        ),
        "suppliers": rows(
            """SELECT id,code,name,contact,phone,address
               FROM partners
               WHERE active=1 AND type='supplier' AND (code LIKE ? OR name LIKE ? OR contact LIKE ? OR phone LIKE ?)
               ORDER BY code,id LIMIT 50""",
            (like, like, like, like),
        ),
        "documents": rows(
            """SELECT d.id,d.doc_no,d.doc_type,d.total_amount,d.balance_amount,d.status,d.created_at,
                      p.name AS partner_name,w.name AS warehouse_name
               FROM documents d
               LEFT JOIN partners p ON p.id=d.partner_id
               LEFT JOIN warehouses w ON w.id=d.warehouse_id
               WHERE d.doc_no LIKE ? OR p.name LIKE ? OR d.remark LIKE ?
               ORDER BY d.id DESC LIMIT 50""",
            (like, like, like),
        ),
        "inventory": rows(
            """SELECT p.code AS product_code,p.name AS product_name,p.category,p.spec,p.unit,
                      w.name AS warehouse_name,COALESCE(i.quantity,0) AS quantity,
                      COALESCE(i.cost_price,p.cost_price,0) AS cost_price,
                      COALESCE(i.quantity,0) * COALESCE(i.cost_price,p.cost_price,0) AS stock_amount
               FROM products p
               CROSS JOIN warehouses w
               LEFT JOIN inventory i ON i.product_id=p.id AND i.warehouse_id=w.id
               WHERE p.active=1 AND (p.code LIKE ? OR p.name LIKE ? OR p.category LIKE ?)
               ORDER BY p.code LIMIT 50""",
            (like, like, like),
        ),
    })


@app.route("/api/assistant/summary")
def assistant_summary():
    return jsonify({
        "stock_by_category": rows(
            """SELECT COALESCE(NULLIF(p.category,''),'未分类') AS category,
                      COUNT(*) AS product_count,
                      SUM(COALESCE(i.quantity,0)) AS quantity,
                      SUM(COALESCE(i.quantity,0) * COALESCE(i.cost_price,p.cost_price,0)) AS amount
               FROM products p
               LEFT JOIN inventory i ON i.product_id=p.id
               WHERE p.active=1
               GROUP BY COALESCE(NULLIF(p.category,''),'未分类')
               ORDER BY amount DESC"""
        ),
        "low_stock": rows(
            """SELECT p.id,p.code,p.name,p.category,p.spec,p.unit,p.min_stock,
                      COALESCE(i.quantity,0) AS quantity,w.name AS warehouse_name
               FROM products p
               CROSS JOIN warehouses w
               LEFT JOIN inventory i ON i.product_id=p.id AND i.warehouse_id=w.id
               WHERE p.active=1 AND COALESCE(i.quantity,0) < COALESCE(p.min_stock,0)
               ORDER BY p.category,p.code"""
        ),
        "document_amount_by_type": rows(
            """SELECT doc_type,status,COUNT(*) AS count,SUM(total_amount) AS amount,SUM(balance_amount) AS balance
               FROM documents
               GROUP BY doc_type,status
               ORDER BY doc_type,status"""
        ),
        "uncategorized_products": rows(
            """SELECT id,code,name,spec,unit,cost_price,sale_price
               FROM products
               WHERE active=1 AND (category IS NULL OR category='')
               ORDER BY code"""
        ),
    })


@app.route("/api/assistant/products/category", methods=["POST"])
def assistant_set_product_category():
    data = request.get_json() or {}
    ids = data.get("ids") or []
    category = (data.get("category") or "").strip()
    if not ids or not category:
        return jsonify({"error": "请选择商品并填写分类"}), 400
    placeholders = ",".join(["?"] * len(ids))
    args = [category] + [int(x) for x in ids]
    execute("UPDATE products SET category=? WHERE id IN (%s)" % placeholders, args)
    get_db().commit()
    return jsonify({"ok": True, "updated": len(ids), "category": category})


@app.route("/api/backup", methods=["POST"])
def backup():
    os.makedirs(BACKUP_DIR, exist_ok=True)
    name = "jxc_v2_%s.db" % datetime.now().strftime("%Y%m%d_%H%M%S")
    target = os.path.join(BACKUP_DIR, name)
    shutil.copy2(DB_PATH, target)
    return jsonify({"ok": True, "file": target})


@app.route("/api/print-template", methods=["GET", "POST"])
def print_template():
    if request.method == "POST":
        os.makedirs(DATA_DIR, exist_ok=True)
        data = request.get_json() or {}
        content = data.get("content", "")
        with open(PRINT_TEMPLATE_PATH, "w", encoding="utf-8", newline="") as f:
            f.write(content)
        return jsonify({"ok": True, "file": PRINT_TEMPLATE_PATH})
    if not os.path.exists(PRINT_TEMPLATE_PATH):
        return "", 404, {"Content-Type": "text/plain; charset=utf-8"}
    with open(PRINT_TEMPLATE_PATH, "r", encoding="utf-8") as f:
        return f.read(), 200, {"Content-Type": "text/html; charset=utf-8"}


if __name__ == "__main__":
    init_db()
    preferred_port = int(os.environ.get("JXC_PORT", "5001"))
    port = find_available_port(preferred_port)
    url = "http://127.0.0.1:%s" % port
    print("=" * 60)
    print("管家婆风格进销存 V2")
    print("数据库：%s" % DB_PATH)
    print("本机访问：%s" % url)
    print("局域网访问：http://本机IP:%s" % port)
    if port != preferred_port:
        print("提示：%s 端口被占用，已自动改用 %s 端口。" % (preferred_port, port))
    print("启动后请不要关闭此窗口。关闭窗口等于关闭服务器。")
    print("=" * 60)
    threading.Timer(1.2, lambda: webbrowser.open(url)).start()
    try:
        app.run(host="0.0.0.0", port=port, debug=False)
    except Exception as exc:
        print("启动失败：%s" % exc)
        input("按回车键退出...")
