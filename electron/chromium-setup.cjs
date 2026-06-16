const { spawn, execSync } = require('child_process')
const { BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

function getBackendExe() {
  return path.join(process.resourcesPath, 'backend', 'backend.exe')
}

function getChromiumMarker() {
  const appData = process.env.APPDATA || process.env.LOCALAPPDATA || require('os').tmpdir()
  return path.join(appData, 'ArtWebToolkit', '.chromium-installed')
}

function isChromiumInstalled() {
  // Önce marker'ı kontrol et (hızlı yol)
  if (fs.existsSync(getChromiumMarker())) return true
  // Fallback: ms-playwright klasöründe chrome.exe ara
  try {
    const msPlaywright = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright')
    if (!fs.existsSync(msPlaywright)) return false
    for (const dir of fs.readdirSync(msPlaywright)) {
      if (!dir.toLowerCase().startsWith('chromium')) continue
      const base = path.join(msPlaywright, dir)
      for (const sub of ['chrome-win', 'chrome-win64']) {
        if (fs.existsSync(path.join(base, sub, 'chrome.exe'))) return true
      }
    }
  } catch {}
  return false
}

function markChromiumInstalled() {
  const markerPath = getChromiumMarker()
  fs.mkdirSync(path.dirname(markerPath), { recursive: true })
  fs.writeFileSync(markerPath, '1')
}

function createLoadingWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 260,
    frame: false,
    resizable: false,
    center: true,
    alwaysOnTop: false,
    backgroundColor: '#020617',
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  })

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #020617; color: #e2e8f0;
      display: flex; flex-direction: column;
      height: 100vh; padding: 28px 32px;
    }
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
    .app-name { font-size: 14px; font-weight: 600; color: #94a3b8; letter-spacing: 0.05em; }
    .badge { font-size: 10px; padding: 2px 8px; background: #1e293b; color: #3b82f6; border-radius: 999px; border: 1px solid #1d4ed8; }
    .step-title { font-size: 16px; font-weight: 600; color: #f1f5f9; margin-bottom: 6px; }
    .step-detail { font-size: 11px; color: #475569; margin-bottom: 20px; min-height: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .progress-wrap { width: 100%; height: 6px; background: #0f172a; border-radius: 3px; overflow: hidden; margin-bottom: 10px; }
    .progress-bar { height: 100%; width: 0%; background: linear-gradient(90deg, #2563eb, #7c3aed); border-radius: 3px; transition: width 0.35s ease; }
    .progress-bar.indeterminate { width: 35% !important; animation: slide 1.6s ease-in-out infinite; }
    @keyframes slide { 0% { margin-left: -35%; } 100% { margin-left: 100%; } }
    .progress-footer { display: flex; justify-content: space-between; align-items: center; }
    .pct { font-size: 12px; font-weight: 600; color: #3b82f6; min-width: 36px; text-align: right; }
    .warning { font-size: 10px; color: #334155; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <span class="app-name">ART WEB TOOLKIT</span>
    <span class="badge" id="badge">Hazırlanıyor</span>
  </div>
  <div class="step-title" id="title">Chromium İndiriliyor</div>
  <div class="step-detail" id="detail">Başlatılıyor...</div>
  <div class="progress-wrap"><div class="progress-bar indeterminate" id="bar"></div></div>
  <div class="progress-footer"><div></div><div class="pct" id="pct"></div></div>
  <div class="warning" id="warning">Lighthouse ve site analizi için gerekli. Yalnızca ilk açılışta indirilir.</div>
  <script>
    window.setDetail = s => { document.getElementById('detail').textContent = s || '' }
    window.setProgress = pct => {
      const bar = document.getElementById('bar'), label = document.getElementById('pct')
      if (pct === null) { bar.className = 'progress-bar indeterminate'; label.textContent = '' }
      else { bar.className = 'progress-bar'; bar.style.width = pct + '%'; label.textContent = pct + '%' }
    }
    window.setDone = () => {
      document.getElementById('title').textContent = 'Hazır'
      document.getElementById('badge').textContent = 'Tamamlandı'
      window.setProgress(100); window.setDetail('Uygulama başlatılıyor...')
    }
    window.setError = msg => {
      document.getElementById('title').textContent = 'Hata'
      document.getElementById('title').style.color = '#f87171'
      window.setDetail(msg || 'Bir hata oluştu')
      document.getElementById('warning').textContent = 'Lütfen bekleyin...'
      document.getElementById('warning').style.color = '#f87171'
      const bar = document.getElementById('bar')
      bar.className = 'progress-bar'; bar.style.background = '#ef4444'; bar.style.width = '100%'
    }
  </script>
</body>
</html>`

  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
  return win
}

let lastUpdate = 0
function updateWin(win, fn, ...args) {
  if (!win || win.isDestroyed()) return
  const now = Date.now()
  if (now - lastUpdate < 80) return
  lastUpdate = now
  const argsJson = args.map(a => JSON.stringify(a)).join(', ')
  win.webContents.executeJavaScript(`window.${fn}(${argsJson})`).catch(() => {})
}

function installChromium(backendExe, win) {
  return new Promise((resolve, reject) => {
    const proc = spawn(backendExe, ['--install-chromium'], {
      windowsHide: true,
      env: { ...process.env },
    })

    let stderr = ''

    const parseLine = (line) => {
      line = line.trim()
      if (!line) return
      if (line.toLowerCase().includes('downloading')) {
        updateWin(win, 'setDetail', line.length > 70 ? line.substring(0, 70) + '...' : line)
      }
      const pctMatch = line.match(/^\s*(\d{1,3})%/)
      if (pctMatch) {
        const pct = parseInt(pctMatch[1], 10)
        updateWin(win, 'setProgress', pct)
        updateWin(win, 'setDetail', `Chromium indiriliyor... ${line.trim()}`)
      }
      if (line.includes('downloaded') || line.includes('installed')) {
        updateWin(win, 'setDetail', 'Chromium kuruldu')
        updateWin(win, 'setProgress', 100)
      }
    }

    proc.stdout.on('data', d => d.toString().split('\n').forEach(parseLine))
    proc.stderr.on('data', d => {
      const text = d.toString()
      text.split('\n').forEach(line => {
        const l = line.trim()
        if (!l || l.startsWith('WARNING') || l.startsWith('NOTICE')) return
        stderr += line + '\n'
      })
      text.split('\n').forEach(parseLine)
    })

    proc.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(stderr.trim() || `Chromium kurulum başarısız (kod: ${code})`))
    })
    proc.on('error', reject)
  })
}

async function ensureChromium(dialog) {
  if (isChromiumInstalled()) return true

  const backendExe = getBackendExe()
  if (!fs.existsSync(backendExe)) return true // dev mod, atla

  const win = createLoadingWindow()
  try {
    await new Promise(r => setTimeout(r, 300))
    updateWin(win, 'setProgress', null)
    await installChromium(backendExe, win)
    markChromiumInstalled()
    updateWin(win, 'setDone')
    await new Promise(r => setTimeout(r, 800))
    if (!win.isDestroyed()) win.close()
    return true
  } catch (err) {
    const shortMsg = (err.message || '').split('\n')[0].substring(0, 80)
    updateWin(win, 'setError', shortMsg)
    await new Promise(r => setTimeout(r, 1500))
    if (!win.isDestroyed()) { win.hide(); await new Promise(r => setTimeout(r, 150)); win.close() }

    const result = await dialog.showMessageBox({
      type: 'warning',
      title: 'Chromium Kurulamadı',
      message: 'Playwright Chromium indirilemedi.',
      detail: 'Lighthouse ve site analizi özellikleri çalışmayabilir.\n\n' + err.message,
      buttons: ['Yine de Devam Et', 'Çıkış'],
      defaultId: 0,
      cancelId: 1,
    })
    return result.response === 0
  }
}

module.exports = { ensureChromium, isChromiumInstalled }
