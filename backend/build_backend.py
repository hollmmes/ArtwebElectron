"""
electron:build sırasında çalışır — backend.exe'yi PyInstaller ile oluşturur.
"""
import subprocess
import sys
import os

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
    print('PyInstaller build başarısız!', file=sys.stderr)
    sys.exit(result.returncode)

print('backend.exe build OK.')
