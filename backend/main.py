import sys
import os

# PyInstaller ile paketlendiğinde --install-chromium argümanı gelirse
# sadece Playwright Chromium'u kur ve çık
if '--install-chromium' in sys.argv:
    import subprocess
    try:
        from playwright._impl._driver import compute_driver_executable
        driver = compute_driver_executable()
        result = subprocess.run([str(driver), 'install', 'chromium'])
        sys.exit(result.returncode)
    except Exception as e:
        print(f'Chromium kurulum hatası: {e}', flush=True)
        sys.exit(1)

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routers import maps, lighthouse, seo, tracking
from database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Art Web Toolkit Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(maps.router, prefix="/api/maps")
app.include_router(lighthouse.router, prefix="/api/lighthouse")
app.include_router(seo.router, prefix="/api/seo")
app.include_router(tracking.router, prefix="/api/tracking")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/status")
def system_status():
    checks = {}

    # Python versiyonu
    checks["python"] = {
        "installed": True,
        "version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        "ok": sys.version_info >= (3, 10),
    }

    # Paket kontrolü — PyInstaller bundle'da hepsi her zaman mevcut
    libs = {
        "fastapi": "FastAPI",
        "uvicorn": "Uvicorn",
        "playwright": "Playwright",
        "pydantic": "Pydantic",
        "aiosqlite": "aiosqlite",
        "aiohttp": "aiohttp",
        "openpyxl": "openpyxl",
    }

    for pkg, label in libs.items():
        try:
            mod = __import__(pkg)
            version = getattr(mod, '__version__', None) or getattr(mod, 'version', None) or '?'
            checks[pkg] = {"label": label, "installed": True, "version": str(version), "ok": True}
        except ImportError:
            checks[pkg] = {"label": label, "installed": False, "version": None, "ok": False}

    # Playwright Chromium
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser_path = p.chromium.executable_path
            import os
            chromium_ok = os.path.exists(browser_path)
        checks["playwright_chromium"] = {
            "label": "Playwright Chromium",
            "installed": chromium_ok,
            "version": None,
            "ok": chromium_ok,
        }
    except Exception:
        checks["playwright_chromium"] = {
            "label": "Playwright Chromium",
            "installed": False,
            "version": None,
            "ok": False,
        }

    # Database
    try:
        from database import DB_PATH
        import os
        db_exists = os.path.exists(DB_PATH)
        checks["database"] = {
            "label": "Veritabanı (SQLite)",
            "installed": db_exists,
            "version": None,
            "ok": db_exists,
        }
    except Exception:
        checks["database"] = {
            "label": "Veritabanı (SQLite)",
            "installed": False,
            "version": None,
            "ok": False,
        }

    all_ok = all(v["ok"] for v in checks.values())
    return {"ok": all_ok, "checks": checks}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=42310)
