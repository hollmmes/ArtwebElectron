# -*- coding: utf-8 -*-
"""
electron:build sirasinda calisir - backend.exe'yi PyInstaller ile olusturur,
ardindan Chromium'u bundle'a kopyalar (kullanici indirme yapmasin).
"""
import subprocess
import sys
import os
import shutil

# Windows console encoding sorununu engellemek icin stdout'u UTF-8'e al
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

ROOT = os.path.dirname(__file__)

result = subprocess.run(
    [
        sys.executable, '-m', 'PyInstaller',
        'backend.spec',
        '--distpath', './dist_pyinstaller',
        '--workpath', './build_pyinstaller',
        '--noconfirm',
    ],
    cwd=ROOT,
)

if result.returncode != 0:
    print('PyInstaller build basarisiz!', file=sys.stderr)
    sys.exit(result.returncode)

print('backend.exe build OK.')

# Chromium'u bundle'a kopyala
local_appdata = os.environ.get('LOCALAPPDATA', '')
ms_playwright_src = os.path.join(local_appdata, 'ms-playwright')
ms_playwright_dst = os.path.join(ROOT, 'dist_pyinstaller', 'backend', 'ms-playwright')

if not os.path.exists(ms_playwright_src):
    print(f'HATA: ms-playwright bulunamadi: {ms_playwright_src}', file=sys.stderr)
    print('Once "playwright install chromium" calistir.', file=sys.stderr)
    sys.exit(1)

chromium_dirs = [
    d for d in os.listdir(ms_playwright_src)
    if d.lower().startswith('chromium')
]
if not chromium_dirs:
    print('HATA: ms-playwright altinda chromium klasoru bulunamadi.', file=sys.stderr)
    sys.exit(1)

os.makedirs(ms_playwright_dst, exist_ok=True)
for d in chromium_dirs:
    src = os.path.join(ms_playwright_src, d)
    dst = os.path.join(ms_playwright_dst, d)
    if os.path.exists(dst):
        print(f'Chromium zaten mevcut, atlaniyor: {d}')
        continue
    print(f'Chromium kopyalaniyor: {d}  (~400MB, bekleyin)...')
    shutil.copytree(src, dst)
    print(f'Chromium kopyalandi: {d}')

print('Build tamam. Chromium bundle icinde.')
