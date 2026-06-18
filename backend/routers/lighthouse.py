from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
import asyncio
import json
import os
import shutil
from datetime import datetime

router = APIRouter()

_app_data = os.environ.get('APPDATA') or os.path.join(os.path.expanduser('~'), 'AppData', 'Roaming')
REPORTS_DIR = os.path.join(_app_data, 'ArtWebToolkit', 'lighthouse_reports')
os.makedirs(REPORTS_DIR, exist_ok=True)


def _get_lighthouse_cmd(url: str, output_path: str, extra_flags: str) -> str:
    """
    Production'da npx çalışmaz — Node.js PATH'te olmayabilir.
    Önce sistem node'unu, sonra Electron'ın node'unu, en son npx'i dene.
    """
    system_node = os.environ.get('SYSTEM_NODE_EXE') or shutil.which('node')

    if system_node and os.path.exists(system_node):
        # node ile lighthouse CLI'yi çalıştır
        # Global lighthouse: node -e "require('lighthouse/cli/run.js')" veya npx
        lh_cli = shutil.which('lighthouse')
        if lh_cli:
            node_cmd = f'"{system_node}" "{lh_cli}"'
        else:
            node_cmd = f'"{system_node}" -e "require(\'lighthouse/cli/run.js\')"'
        return (
            f'{node_cmd} "{url}" '
            f'--output=html --output-path="{output_path}" '
            f'--chrome-flags="--headless --no-sandbox --disable-gpu --ignore-certificate-errors" '
            f'{extra_flags} --locale=tr --quiet'
        )

    # Fallback: npx
    return (
        f'npx lighthouse "{url}" '
        f'--output=html --output-path="{output_path}" '
        f'--chrome-flags="--headless --no-sandbox --disable-gpu --ignore-certificate-errors" '
        f'{extra_flags} --locale=tr --quiet'
    )


class AuditRequest(BaseModel):
    urls: list[str]


@router.post("/audit")
async def run_audit(request: AuditRequest):
    urls = [u.strip() for u in request.urls if u.strip()]
    if not urls:
        raise HTTPException(status_code=400, detail="En az bir URL gerekli")

    urls = [u if u.startswith("http") else f"https://{u}" for u in urls]

    async def event_stream():
        total = len(urls)
        for idx, url in enumerate(urls):
            safe_name = url.replace("https://", "").replace("http://", "").replace("/", "_").replace(":", "").replace("?", "").replace("&", "")[:50]
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

            yield f"data: {json.dumps({'type': 'queue', 'current': idx + 1, 'total': total, 'url': url})}\n\n"

            # --- Masaustu ---
            desktop_name = f"{timestamp}_desktop_{safe_name}.html"
            desktop_path = os.path.join(REPORTS_DIR, desktop_name)

            yield f"data: {json.dumps({'type': 'status', 'message': 'Masaustu analizi baslatiliyor...', 'step': 'desktop_start', 'url': url})}\n\n"

            desktop_cmd = _get_lighthouse_cmd(
                url, desktop_path,
                '--form-factor=desktop --screenEmulation.disabled --throttling-method=simulate --preset=desktop'
            )

            yield f"data: {json.dumps({'type': 'status', 'message': 'Masaustu sayfasi yukleniyor ve olculuyor...', 'step': 'desktop_running', 'url': url})}\n\n"

            try:
                process = await asyncio.create_subprocess_shell(
                    desktop_cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
                )
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=180)
            except asyncio.TimeoutError:
                yield f"data: {json.dumps({'type': 'error', 'message': f'Masaustu zaman asimi: {url}', 'url': url})}\n\n"
                continue
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'message': str(e), 'url': url})}\n\n"
                continue

            desktop_ok = os.path.exists(desktop_path) and os.path.getsize(desktop_path) > 0

            if desktop_ok:
                yield f"data: {json.dumps({'type': 'report_ready', 'device': 'desktop', 'url': url, 'report_url': f'/api/lighthouse/report/{desktop_name}'})}\n\n"
            else:
                error_msg = stderr.decode('utf-8', errors='replace')[:200] if stderr else 'Masaustu raporu olusturulamadi'
                yield f"data: {json.dumps({'type': 'error', 'message': error_msg, 'url': url})}\n\n"

            # --- Mobil ---
            mobile_name = f"{timestamp}_mobile_{safe_name}.html"
            mobile_path = os.path.join(REPORTS_DIR, mobile_name)

            yield f"data: {json.dumps({'type': 'status', 'message': 'Mobil analizi baslatiliyor...', 'step': 'mobile_start', 'url': url})}\n\n"

            mobile_cmd = _get_lighthouse_cmd(
                url, mobile_path,
                '--form-factor=mobile --screenEmulation.mobile --throttling-method=simulate'
            )

            yield f"data: {json.dumps({'type': 'status', 'message': 'Mobil emulasyon ve 4G simulasyonu aktif...', 'step': 'mobile_running', 'url': url})}\n\n"

            try:
                process = await asyncio.create_subprocess_shell(
                    mobile_cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
                )
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=180)
            except asyncio.TimeoutError:
                yield f"data: {json.dumps({'type': 'error', 'message': f'Mobil zaman asimi: {url}', 'url': url})}\n\n"
                continue
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'message': str(e), 'url': url})}\n\n"
                continue

            mobile_ok = os.path.exists(mobile_path) and os.path.getsize(mobile_path) > 0

            if mobile_ok:
                yield f"data: {json.dumps({'type': 'report_ready', 'device': 'mobile', 'url': url, 'report_url': f'/api/lighthouse/report/{mobile_name}'})}\n\n"
            else:
                error_msg = stderr.decode('utf-8', errors='replace')[:200] if stderr else 'Mobil raporu olusturulamadi'
                yield f"data: {json.dumps({'type': 'error', 'message': error_msg, 'url': url})}\n\n"

            yield f"data: {json.dumps({'type': 'site_done', 'url': url, 'current': idx + 1, 'total': total})}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/report/{report_name}")
async def get_report(report_name: str):
    report_path = os.path.join(REPORTS_DIR, report_name)
    if not os.path.exists(report_path):
        raise HTTPException(status_code=404, detail="Rapor bulunamadi")
    return FileResponse(report_path, media_type="text/html")


@router.get("/reports")
async def list_reports():
    reports = []
    if os.path.exists(REPORTS_DIR):
        for f in sorted(os.listdir(REPORTS_DIR), key=lambda x: os.path.getmtime(os.path.join(REPORTS_DIR, x)), reverse=True):
            if f.endswith('.html'):
                path = os.path.join(REPORTS_DIR, f)
                reports.append({
                    'name': f,
                    'url': f'/api/lighthouse/report/{f}',
                    'size': os.path.getsize(path),
                    'created': os.path.getmtime(path),
                })
    return {"reports": reports}


@router.delete("/reports/{report_name}")
async def delete_report(report_name: str):
    report_path = os.path.join(REPORTS_DIR, report_name)
    if os.path.exists(report_path):
        os.unlink(report_path)
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Rapor bulunamadi")
