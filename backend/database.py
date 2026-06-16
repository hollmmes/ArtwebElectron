import aiosqlite
import json
import os
from datetime import datetime

def _get_db_path():
    # PyInstaller bundle'da __file__ geçici _MEIPASS klasörüne işaret eder — kalıcı değil
    # Her zaman %APPDATA%\ArtWebToolkit\artweb.db kullan
    app_data = os.environ.get('APPDATA') or os.path.join(os.path.expanduser('~'), 'AppData', 'Roaming')
    data_dir = os.path.join(app_data, 'ArtWebToolkit')
    os.makedirs(data_dir, exist_ok=True)
    return os.path.join(data_dir, 'artweb.db')

DB_PATH = _get_db_path()


async def get_db():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    return db


async def init_db():
    db = await get_db()
    await db.executescript("""
        CREATE TABLE IF NOT EXISTS businesses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            address TEXT DEFAULT '',
            phone TEXT DEFAULT '',
            website TEXT DEFAULT '',
            rating REAL,
            reviews_count INTEGER,
            category TEXT DEFAULT '',
            social_media TEXT DEFAULT '{}',
            reviews TEXT DEFAULT '[]',
            about TEXT DEFAULT '',
            working_hours TEXT DEFAULT '{}',
            features TEXT DEFAULT '[]',
            photos TEXT DEFAULT '[]',
            maps_url TEXT DEFAULT '',
            latitude REAL,
            longitude REAL,
            query TEXT NOT NULL,
            location TEXT DEFAULT '',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS searches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            query TEXT NOT NULL,
            location TEXT DEFAULT '',
            result_count INTEGER DEFAULT 0,
            new_count INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS custom_sites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS domains (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            domain TEXT NOT NULL,
            renewal_date TEXT NOT NULL,
            amount TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'Aktif',
            notes TEXT DEFAULT '',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS hostings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_name TEXT NOT NULL,
            domain TEXT NOT NULL,
            renewal_date TEXT NOT NULL,
            amount TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'Aktif',
            notes TEXT DEFAULT '',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS ssl_certs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_name TEXT NOT NULL,
            domain TEXT NOT NULL,
            renewal_date TEXT NOT NULL,
            amount TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'Aktif',
            notes TEXT DEFAULT '',
            created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_businesses_name_address ON businesses(name, address);
        CREATE INDEX IF NOT EXISTS idx_businesses_query_location ON businesses(query, location);
        CREATE INDEX IF NOT EXISTS idx_searches_query_location ON searches(query, location);
    """)
    # Migrate: add new columns if they don't exist
    columns = set()
    cursor = await db.execute("PRAGMA table_info(businesses)")
    for row in await cursor.fetchall():
        columns.add(row[1])

    migrations = {
        "working_hours": "TEXT DEFAULT '{}'",
        "features": "TEXT DEFAULT '[]'",
        "photos": "TEXT DEFAULT '[]'",
        "maps_url": "TEXT DEFAULT ''",
        "latitude": "REAL",
        "longitude": "REAL",
        "emails": "TEXT DEFAULT '[]'",
    }
    for col, col_type in migrations.items():
        if col not in columns:
            await db.execute(f"ALTER TABLE businesses ADD COLUMN {col} {col_type}")

    # Migrate searches table
    cursor = await db.execute("PRAGMA table_info(searches)")
    search_cols = set()
    for row in await cursor.fetchall():
        search_cols.add(row[1])
    if "new_count" not in search_cols:
        await db.execute("ALTER TABLE searches ADD COLUMN new_count INTEGER DEFAULT 0")

    await db.commit()
    await db.close()


async def save_business(business: dict, query: str, location: str) -> bool:
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id FROM businesses WHERE name = ? AND address = ?",
            (business.get("name", ""), business.get("address", ""))
        )
        existing = await cursor.fetchone()
        if existing:
            return False

        await db.execute(
            """INSERT INTO businesses
               (name, address, phone, website, rating, reviews_count, category,
                social_media, reviews, about, working_hours, features, photos,
                maps_url, latitude, longitude, emails, query, location, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                business.get("name", ""),
                business.get("address", ""),
                business.get("phone", ""),
                business.get("website", ""),
                business.get("rating"),
                business.get("reviews_count"),
                business.get("category", ""),
                json.dumps(business.get("social_media", {}), ensure_ascii=False),
                json.dumps(business.get("reviews", []), ensure_ascii=False),
                business.get("about", ""),
                json.dumps(business.get("working_hours", {}), ensure_ascii=False),
                json.dumps(business.get("features", []), ensure_ascii=False),
                json.dumps(business.get("photos", []), ensure_ascii=False),
                business.get("maps_url", ""),
                business.get("latitude"),
                business.get("longitude"),
                json.dumps(business.get("emails", []), ensure_ascii=False),
                query,
                location,
                datetime.now().isoformat(),
            )
        )
        await db.commit()
        return True
    finally:
        await db.close()


async def get_existing_businesses(query: str, location: str) -> list[dict]:
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM businesses WHERE query = ? AND location = ? ORDER BY created_at DESC",
            (query, location)
        )
        rows = await cursor.fetchall()
        return [_row_to_business(row) for row in rows]
    finally:
        await db.close()


async def save_search(query: str, location: str, result_count: int, new_count: int = 0):
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO searches (query, location, result_count, new_count, created_at) VALUES (?, ?, ?, ?, ?)",
            (query, location, result_count, new_count, datetime.now().isoformat())
        )
        await db.commit()
    finally:
        await db.close()


async def get_search_history() -> list[dict]:
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM searches ORDER BY created_at DESC LIMIT 50"
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


async def get_search_history_grouped() -> list[dict]:
    """Sorgu bazlı gruplanmış geçmiş."""
    db = await get_db()
    try:
        cursor = await db.execute("""
            SELECT query, location,
                   COUNT(*) as search_count,
                   SUM(result_count) as total_results,
                   SUM(new_count) as total_new,
                   MAX(created_at) as last_searched
            FROM searches
            GROUP BY query, location
            ORDER BY last_searched DESC
            LIMIT 50
        """)
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


async def get_all_businesses(limit: int = 100, offset: int = 0, search: str = "") -> dict:
    db = await get_db()
    try:
        if search:
            cursor = await db.execute(
                "SELECT COUNT(*) as total FROM businesses WHERE name LIKE ? OR category LIKE ? OR address LIKE ?",
                (f"%{search}%", f"%{search}%", f"%{search}%")
            )
        else:
            cursor = await db.execute("SELECT COUNT(*) as total FROM businesses")
        total_row = await cursor.fetchone()
        total = total_row["total"]

        if search:
            cursor = await db.execute(
                """SELECT * FROM businesses WHERE name LIKE ? OR category LIKE ? OR address LIKE ?
                   ORDER BY created_at DESC LIMIT ? OFFSET ?""",
                (f"%{search}%", f"%{search}%", f"%{search}%", limit, offset)
            )
        else:
            cursor = await db.execute(
                "SELECT * FROM businesses ORDER BY created_at DESC LIMIT ? OFFSET ?",
                (limit, offset)
            )
        rows = await cursor.fetchall()
        return {"total": total, "businesses": [_row_to_business(row) for row in rows]}
    finally:
        await db.close()


async def get_businesses_by_category() -> list[dict]:
    """Kategoriye göre gruplanmış işletme sayıları."""
    db = await get_db()
    try:
        cursor = await db.execute("""
            SELECT query, location, COUNT(*) as count, MAX(created_at) as last_added
            FROM businesses
            GROUP BY query, location
            ORDER BY count DESC
        """)
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


async def delete_business(business_id: int) -> bool:
    db = await get_db()
    try:
        cursor = await db.execute("DELETE FROM businesses WHERE id = ?", (business_id,))
        await db.commit()
        return cursor.rowcount > 0
    finally:
        await db.close()


async def save_custom_site(url: str, name: str):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT id FROM custom_sites WHERE url = ?", (url,))
        if await cursor.fetchone():
            return False
        await db.execute(
            "INSERT INTO custom_sites (url, name, created_at) VALUES (?, ?, ?)",
            (url, name, datetime.now().isoformat())
        )
        await db.commit()
        return True
    finally:
        await db.close()


async def get_custom_sites() -> list[dict]:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM custom_sites ORDER BY created_at DESC")
        rows = await cursor.fetchall()
        return [{"id": row["id"], "url": row["url"], "name": row["name"], "created_at": row["created_at"]} for row in rows]
    finally:
        await db.close()


async def delete_custom_site(site_id: int) -> bool:
    db = await get_db()
    try:
        cursor = await db.execute("DELETE FROM custom_sites WHERE id = ?", (site_id,))
        await db.commit()
        return cursor.rowcount > 0
    finally:
        await db.close()


async def upsert_domain(data: dict) -> int:
    db = await get_db()
    try:
        if data.get("id"):
            await db.execute(
                "UPDATE domains SET domain=?, renewal_date=?, amount=?, status=?, notes=? WHERE id=?",
                (data["domain"], data["renewal_date"], data.get("amount",""), data["status"], data.get("notes",""), data["id"])
            )
            await db.commit()
            return data["id"]
        cursor = await db.execute(
            "INSERT INTO domains (domain, renewal_date, amount, status, notes, created_at) VALUES (?,?,?,?,?,?)",
            (data["domain"], data["renewal_date"], data.get("amount",""), data["status"], data.get("notes",""), datetime.now().isoformat())
        )
        await db.commit()
        return cursor.lastrowid
    finally:
        await db.close()


async def bulk_insert_domains(rows: list[dict]):
    db = await get_db()
    try:
        now = datetime.now().isoformat()
        await db.executemany(
            "INSERT INTO domains (domain, renewal_date, amount, status, notes, created_at) VALUES (?,?,?,?,?,?)",
            [(r["domain"], r["renewal_date"], r.get("amount",""), r["status"], r.get("notes",""), now) for r in rows]
        )
        await db.commit()
    finally:
        await db.close()


async def get_domains() -> list[dict]:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM domains ORDER BY renewal_date ASC")
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


async def delete_domain(domain_id: int) -> bool:
    db = await get_db()
    try:
        cursor = await db.execute("DELETE FROM domains WHERE id=?", (domain_id,))
        await db.commit()
        return cursor.rowcount > 0
    finally:
        await db.close()


async def upsert_hosting(data: dict) -> int:
    db = await get_db()
    try:
        if data.get("id"):
            await db.execute(
                "UPDATE hostings SET product_name=?, domain=?, renewal_date=?, amount=?, status=?, notes=? WHERE id=?",
                (data["product_name"], data["domain"], data["renewal_date"], data.get("amount",""), data["status"], data.get("notes",""), data["id"])
            )
            await db.commit()
            return data["id"]
        cursor = await db.execute(
            "INSERT INTO hostings (product_name, domain, renewal_date, amount, status, notes, created_at) VALUES (?,?,?,?,?,?,?)",
            (data["product_name"], data["domain"], data["renewal_date"], data.get("amount",""), data["status"], data.get("notes",""), datetime.now().isoformat())
        )
        await db.commit()
        return cursor.lastrowid
    finally:
        await db.close()


async def bulk_insert_hostings(rows: list[dict]):
    db = await get_db()
    try:
        now = datetime.now().isoformat()
        await db.executemany(
            "INSERT INTO hostings (product_name, domain, renewal_date, amount, status, notes, created_at) VALUES (?,?,?,?,?,?,?)",
            [(r["product_name"], r["domain"], r["renewal_date"], r.get("amount",""), r["status"], r.get("notes",""), now) for r in rows]
        )
        await db.commit()
    finally:
        await db.close()


async def get_hostings() -> list[dict]:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM hostings ORDER BY renewal_date ASC")
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


async def delete_hosting(hosting_id: int) -> bool:
    db = await get_db()
    try:
        cursor = await db.execute("DELETE FROM hostings WHERE id=?", (hosting_id,))
        await db.commit()
        return cursor.rowcount > 0
    finally:
        await db.close()


async def upsert_ssl(data: dict) -> int:
    db = await get_db()
    try:
        if data.get("id"):
            await db.execute(
                "UPDATE ssl_certs SET product_name=?, domain=?, renewal_date=?, amount=?, status=?, notes=? WHERE id=?",
                (data["product_name"], data["domain"], data["renewal_date"], data.get("amount",""), data["status"], data.get("notes",""), data["id"])
            )
            await db.commit()
            return data["id"]
        cursor = await db.execute(
            "INSERT INTO ssl_certs (product_name, domain, renewal_date, amount, status, notes, created_at) VALUES (?,?,?,?,?,?,?)",
            (data["product_name"], data["domain"], data["renewal_date"], data.get("amount",""), data["status"], data.get("notes",""), datetime.now().isoformat())
        )
        await db.commit()
        return cursor.lastrowid
    finally:
        await db.close()


async def bulk_insert_ssls(rows: list[dict]):
    db = await get_db()
    try:
        now = datetime.now().isoformat()
        await db.executemany(
            "INSERT INTO ssl_certs (product_name, domain, renewal_date, amount, status, notes, created_at) VALUES (?,?,?,?,?,?,?)",
            [(r["product_name"], r["domain"], r["renewal_date"], r.get("amount",""), r["status"], r.get("notes",""), now) for r in rows]
        )
        await db.commit()
    finally:
        await db.close()


async def get_ssls() -> list[dict]:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM ssl_certs ORDER BY renewal_date ASC")
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


async def delete_ssl(ssl_id: int) -> bool:
    db = await get_db()
    try:
        cursor = await db.execute("DELETE FROM ssl_certs WHERE id=?", (ssl_id,))
        await db.commit()
        return cursor.rowcount > 0
    finally:
        await db.close()


async def update_business_emails(business_id: int, emails: list[str]):
    db = await get_db()
    try:
        await db.execute(
            "UPDATE businesses SET emails = ? WHERE id = ?",
            (json.dumps(emails, ensure_ascii=False), business_id)
        )
        await db.commit()
    finally:
        await db.close()


def _row_to_business(row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "address": row["address"],
        "phone": row["phone"],
        "website": row["website"],
        "rating": row["rating"],
        "reviews_count": row["reviews_count"],
        "category": row["category"],
        "social_media": json.loads(row["social_media"] or "{}"),
        "reviews": json.loads(row["reviews"] or "[]"),
        "about": row["about"] or "",
        "working_hours": json.loads(row["working_hours"] or "{}"),
        "features": json.loads(row["features"] or "[]"),
        "photos": json.loads(row["photos"] or "[]"),
        "maps_url": row["maps_url"] or "",
        "latitude": row["latitude"],
        "longitude": row["longitude"],
        "emails": json.loads(row["emails"] or "[]") if "emails" in row.keys() else [],
        "query": row["query"],
        "location": row["location"],
        "created_at": row["created_at"],
    }
