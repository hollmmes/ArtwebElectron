const { execSync, spawn } = require('child_process')
const { dialog, shell, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

function getPythonPaths() {
  const paths = ['python', 'python3']
  const localApp = process.env.LOCALAPPDATA || ''
  const programFiles = process.env.PROGRAMFILES || ''
  const programFilesX86 = process.env['PROGRAMFILES(X86)'] || ''
  const userProfile = process.env.USERPROFILE || ''

  for (const ver of ['314', '313', '312', '311', '310']) {
    paths.push(path.join(localApp, 'Programs', 'Python', `Python${ver}`, 'python.exe'))
    paths.push(path.join(programFiles, `Python${ver}`, 'python.exe'))
    paths.push(path.join(programFilesX86, `Python${ver}`, 'python.exe'))
    paths.push(path.join(userProfile, 'AppData', 'Local', 'Programs', 'Python', `Python${ver}`, 'python.exe'))
  }

  paths.push('py')
  return paths
}

const PYTHON_PATHS = getPythonPaths()

function findPython() {
  for (const pythonPath of PYTHON_PATHS) {
    try {
      const cmd = pythonPath.includes(' ') ? `"${pythonPath}" --version` : `${pythonPath} --version`
      const result = execSync(cmd, {
        encoding: 'utf-8',
        timeout: 5000,
        windowsHide: true,
        shell: true,
      })
      if (result.includes('Python 3')) return pythonPath
    } catch {}
  }
  return null
}

function getRequirementsPath() {
  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev')
  if (isDev) return path.join(__dirname, '..', 'backend', 'requirements.txt')
  return path.join(process.resourcesPath, 'backend', 'requirements.txt')
}

function getBackendPath() {
  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev')
  if (isDev) return path.join(__dirname, '..', 'backend')
  return path.join(process.resourcesPath, 'backend')
}

function checkDepsInstalled(python) {
  try {
    execSync(
      `"${python}" -c "import fastapi, uvicorn, playwright, pydantic, aiosqlite, aiohttp"`,
      { encoding: 'utf-8', timeout: 10000, windowsHide: true, shell: true }
    )
    return true
  } catch {
    return false
  }
}

function createLoadingWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 260,
    frame: false,
    resizable: false,
    center: true,
    alwaysOnTop: true,
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
      background: #020617;
      color: #e2e8f0;
      display: flex;
      flex-direction: column;
      height: 100vh;
      padding: 28px 32px;
      gap: 0;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }
    .app-name { font-size: 14px; font-weight: 600; color: #94a3b8; letter-spacing: 0.05em; }
    .badge {
      font-size: 10px;
      padding: 2px 8px;
      background: #1e293b;
      color: #3b82f6;
      border-radius: 999px;
      border: 1px solid #1d4ed8;
    }
    .step-title { font-size: 16px; font-weight: 600; color: #f1f5f9; margin-bottom: 6px; }
    .step-detail {
      font-size: 11px;
      color: #475569;
      margin-bottom: 20px;
      min-height: 16px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .progress-wrap {
      width: 100%;
      height: 6px;
      background: #0f172a;
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 10px;
    }
    .progress-bar {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #2563eb, #7c3aed);
      border-radius: 3px;
      transition: width 0.35s ease;
    }
    .progress-bar.indeterminate {
      width: 35% !important;
      animation: slide 1.6s ease-in-out infinite;
    }
    @keyframes slide {
      0%   { margin-left: -35%; }
      100% { margin-left: 100%; }
    }
    .progress-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .steps-indicator { display: flex; gap: 6px; }
    .dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #1e293b;
      transition: background 0.3s;
    }
    .dot.active { background: #3b82f6; }
    .dot.done { background: #22c55e; }
    .pct { font-size: 12px; font-weight: 600; color: #3b82f6; min-width: 36px; text-align: right; }
    .warning { font-size: 10px; color: #334155; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <span class="app-name">ART WEB TOOLKIT</span>
    <span class="badge" id="stepBadge">Adım 1/2</span>
  </div>
  <div class="step-title" id="stepTitle">Bağımlılıklar Kuruluyor</div>
  <div class="step-detail" id="stepDetail">Başlatılıyor...</div>
  <div class="progress-wrap">
    <div class="progress-bar indeterminate" id="bar"></div>
  </div>
  <div class="progress-footer">
    <div class="steps-indicator">
      <div class="dot active" id="dot0"></div>
      <div class="dot" id="dot1"></div>
    </div>
    <div class="pct" id="pct"></div>
  </div>
  <div class="warning">Bu işlem yalnızca ilk açılışta yapılır. Lütfen bekleyin.</div>

  <script>
    window.setStep = function(step, title, badge) {
      document.getElementById('stepTitle').textContent = title
      document.getElementById('stepBadge').textContent = badge
      for (let i = 0; i < 2; i++) {
        const d = document.getElementById('dot' + i)
        if (i < step) { d.className = 'dot done' }
        else if (i === step) { d.className = 'dot active' }
        else { d.className = 'dot' }
      }
    }
    window.setDetail = function(text) {
      document.getElementById('stepDetail').textContent = text || ''
    }
    window.setProgress = function(pct) {
      const bar = document.getElementById('bar')
      const label = document.getElementById('pct')
      if (pct === null) {
        bar.className = 'progress-bar indeterminate'
        label.textContent = ''
      } else {
        bar.className = 'progress-bar'
        bar.style.width = pct + '%'
        label.textContent = pct + '%'
      }
    }
    window.setDone = function() {
      document.getElementById('dot0').className = 'dot done'
      document.getElementById('dot1').className = 'dot done'
      window.setProgress(100)
      window.setDetail('Tamamlandı')
    }
  </script>
</body>
</html>`

  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
  return win
}

let lastUpdateTime = 0
function updateWindow(win, fn, ...args) {
  if (!win || win.isDestroyed()) return
  const now = Date.now()
  // Çok sık executeJavaScript çağrısını throttle et
  if (now - lastUpdateTime < 80) return
  lastUpdateTime = now
  const argsJson = args.map(a => JSON.stringify(a)).join(', ')
  win.webContents.executeJavaScript(`window.${fn}(${argsJson})`).catch(() => {})
}

function runPipInstall(python, requirementsPath, backendPath, win) {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      python,
      ['-m', 'pip', 'install', '-r', requirementsPath, '--progress-bar', 'off'],
      { cwd: backendPath, shell: true, windowsHide: true, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }
    )

    let stderr = ''

    const parseLine = (line) => {
      line = line.trim()
      if (!line) return

      if (line.startsWith('Collecting ')) {
        const pkg = line.replace('Collecting ', '').split(' ')[0]
        updateWindow(win, 'setDetail', `Alınıyor: ${pkg}`)
      } else if (line.startsWith('Downloading ')) {
        const pkg = line.replace('Downloading ', '').split('-')[0]
        updateWindow(win, 'setDetail', `İndiriliyor: ${pkg}`)
      } else if (line.startsWith('Installing collected')) {
        updateWindow(win, 'setDetail', 'Paketler yükleniyor...')
      } else if (line.startsWith('Successfully installed')) {
        updateWindow(win, 'setDetail', 'Paketler kuruldu')
      } else if (line.startsWith('Requirement already satisfied')) {
        const pkg = line.replace('Requirement already satisfied: ', '').split(' ')[0]
        updateWindow(win, 'setDetail', `Mevcut: ${pkg}`)
      }
    }

    proc.stdout.on('data', (d) => d.toString().split('\n').forEach(parseLine))
    proc.stderr.on('data', (d) => {
      stderr += d.toString()
      d.toString().split('\n').forEach(parseLine)
    })

    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(stderr || `pip çıkış kodu: ${code}`))
    })
    proc.on('error', reject)
  })
}

function runPlaywrightInstall(python, backendPath, win) {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      python,
      ['-m', 'playwright', 'install', 'chromium'],
      { cwd: backendPath, shell: true, windowsHide: true, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }
    )

    let stderr = ''

    const parseLine = (line) => {
      line = line.trim()
      if (!line) return

      // "Downloading Chromium 131.0... - 145.3 Mb"
      if (line.toLowerCase().includes('downloading')) {
        updateWindow(win, 'setDetail', line.length > 60 ? line.substring(0, 60) + '...' : line)
      }

      // Playwright progress: "  14% [====    ] 24.3 / 174.2 MiB"
      const pctMatch = line.match(/^\s*(\d{1,3})%/)
      if (pctMatch) {
        const pct = parseInt(pctMatch[1], 10)
        updateWindow(win, 'setProgress', pct)
        updateWindow(win, 'setDetail', `Chromium indiriliyor... ${line.trim()}`)
      }

      if (line.includes('Chromium') && line.includes('downloaded')) {
        updateWindow(win, 'setDetail', 'Chromium kurulumu tamamlandı')
        updateWindow(win, 'setProgress', 100)
      }
    }

    proc.stdout.on('data', (d) => d.toString().split('\n').forEach(parseLine))
    proc.stderr.on('data', (d) => {
      stderr += d.toString()
      d.toString().split('\n').forEach(parseLine)
    })

    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(stderr || `playwright çıkış kodu: ${code}`))
    })
    proc.on('error', reject)
  })
}

async function installDependencies(python, win) {
  const requirementsPath = getRequirementsPath()
  const backendPath = getBackendPath()

  if (!fs.existsSync(requirementsPath)) {
    throw new Error(`requirements.txt bulunamadı: ${requirementsPath}`)
  }

  // Adım 1: pip install
  await new Promise(r => setTimeout(r, 400))
  updateWindow(win, 'setStep', 0, 'Python Paketleri Kuruluyor', 'Adım 1/2')
  updateWindow(win, 'setProgress', null)
  await runPipInstall(python, requirementsPath, backendPath, win)

  // Adım 2: playwright chromium
  updateWindow(win, 'setStep', 1, 'Chromium İndiriliyor', 'Adım 2/2')
  updateWindow(win, 'setProgress', 0)
  await runPlaywrightInstall(python, backendPath, win)

  updateWindow(win, 'setDone')
  await new Promise(r => setTimeout(r, 600))
}

async function checkPythonEnvironment() {
  const python = findPython()

  if (!python) {
    const result = await dialog.showMessageBox({
      type: 'warning',
      title: 'Python Gerekli',
      message: 'Bu uygulama çalışmak için Python 3.10+ gerektirir.',
      detail: 'Python yüklü değil veya bulunamadı.\n\nKurulum sırasında "Add Python to PATH" seçeneğini işaretlemeyi unutmayın!',
      buttons: ['Python İndir', 'Yine de Devam Et', 'Çıkış'],
      defaultId: 0,
      cancelId: 2,
    })

    if (result.response === 0) {
      shell.openExternal('https://www.python.org/downloads/')
      return false
    }
    if (result.response === 2) return false
    return true
  }

  if (checkDepsInstalled(python)) return true

  const loadingWin = createLoadingWindow()

  try {
    await installDependencies(python, loadingWin)
    if (!loadingWin.isDestroyed()) loadingWin.close()
    return true
  } catch (err) {
    if (!loadingWin.isDestroyed()) loadingWin.close()

    const result = await dialog.showMessageBox({
      type: 'error',
      title: 'Kurulum Hatası',
      message: 'Python bağımlılıkları kurulamadı.',
      detail: err.message + '\n\nManuel kurulum için terminalde:\npip install -r requirements.txt',
      buttons: ['Yine de Devam Et', 'Çıkış'],
      defaultId: 1,
      cancelId: 1,
    })

    return result.response === 0
  }
}

module.exports = { checkPythonEnvironment, findPython }
