import sys
import os

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

    # Playwright Chromium — önce bundle path, yoksa sistem Playwright cache'ini kontrol et
    chromium_ok = False
    try:
        browsers_path = os.environ.get('PLAYWRIGHT_BROWSERS_PATH', '')
        search_paths = []
        if browsers_path:
            search_paths.append(browsers_path)
        # Dev modda Playwright'ın varsayılan cache dizinleri
        home = os.path.expanduser('~')
        search_paths += [
            os.path.join(home, 'AppData', 'Local', 'ms-playwright'),
            os.path.join(home, '.cache', 'ms-playwright'),
        ]
        for sp in search_paths:
            if not sp or not os.path.exists(sp):
                continue
            for d in os.listdir(sp):
                if not d.lower().startswith('chromium-'):
                    continue
                base = os.path.join(sp, d)
                for sub in ('chrome-win', 'chrome-win64', 'chrome-linux', ''):
                    exe = 'chrome.exe' if 'win' in sub or sub == '' else 'chrome'
                    if os.path.exists(os.path.join(base, sub, exe) if sub else os.path.join(base, exe)):
                        chromium_ok = True
                        break
                if chromium_ok:
                    break
            if chromium_ok:
                break
    except Exception:
        pass
    checks["playwright_chromium"] = {
        "label": "Playwright Chromium",
        "installed": chromium_ok,
        "version": None,
        "ok": chromium_ok,
    }

    # Database
    try:
        from database import DB_PATH
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
