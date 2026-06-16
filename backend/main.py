import sys
import os

# PyInstaller ile paketlendiğinde --install-chromium argümanı gelirse
# sadece Playwright Chromium'u kur ve çık
if '--install-chromium' in sys.argv:
    import subprocess
    # stdout/stderr'i UTF-8 yap (Windows cp1252 hatası önlenir)
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    try:
        # PyInstaller bundle'ında _MEIPASS altında, normal kurulumda site-packages altında
        base = getattr(sys, '_MEIPASS', None)
        if base:
            node_exe = os.path.join(base, 'playwright', 'driver', 'node.exe')
            cli_js  = os.path.join(base, 'playwright', 'driver', 'package', 'cli.js')
        else:
            from playwright._impl._driver import compute_driver_executable
            node_exe, cli_js = compute_driver_executable()
            node_exe = str(node_exe)
            cli_js   = str(cli_js)
        result = subprocess.run([node_exe, cli_js, 'install', 'chromium'])
        sys.exit(result.returncode)
    except Exception as e:
        print(f'Chromium install error: {e}', flush=True)
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

    # Playwright Chromium — filesystem üzerinden kontrol (sync_playwright() bundle'da subprocess açar, hata verir)
    try:
        ms_playwright = os.path.join(os.environ.get('LOCALAPPDATA', ''), 'ms-playwright')
        chromium_ok = False
        if os.path.exists(ms_playwright):
            for d in os.listdir(ms_playwright):
                if d.lower().startswith('chromium'):
                    base = os.path.join(ms_playwright, d)
                    for sub in ('chrome-win', 'chrome-win64', 'chrome-linux', 'chrome-mac'):
                        exe = os.path.join(base, sub, 'chrome.exe')
                        if os.path.exists(exe):
                            chromium_ok = True
                            break
                if chromium_ok:
                    break
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
