const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const { spawn, execSync } = require('child_process')
const { autoUpdater } = require('electron-updater')
const { findPython } = require('./python-check.cjs')
const { ensureChromium } = require('./chromium-setup.cjs')

process.on('uncaughtException', (err) => {
  if (err.code === 'EPIPE' || err.code === 'ERR_STREAM_DESTROYED') return
  console.error('[Uncaught]', err)
})

let mainWindow
let pythonProcess

const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev')
const BACKEND_PORT = 42310

function getBackendExe() {
  return path.join(process.resourcesPath, 'backend', 'backend.exe')
}

function getBackendDir() {
  if (isDev) return path.join(__dirname, '..', 'backend')
  return path.join(process.resourcesPath, 'backend')
}

// Portu dinleyen process'i öldür (önceki oturumdan kalan backend için)
function killPortProcess(port) {
  try {
    const output = execSync(`netstat -ano | findstr ":${port} "`, {
      encoding: 'utf-8', shell: true, windowsHide: true, timeout: 3000,
    })
    for (const line of output.split('\n')) {
      if (!line.includes('LISTENING')) continue
      const pid = line.trim().split(/\s+/).pop()
      if (pid && pid !== '0') {
        execSync(`taskkill /PID ${pid} /F`, { windowsHide: true, shell: true, timeout: 3000 })
        console.log(`[Backend] Killed stale process on port ${port} (PID ${pid})`)
      }
    }
  } catch {}
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    backgroundColor: '#020617',
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  if (isDev) autoUpdater.forceDevUpdateConfig = true

  autoUpdater.on('checking-for-update', () => console.log('[Updater] Checking for updates...'))
  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] Update available:', info.version)
    mainWindow?.webContents.send('update-available', info)
  })
  autoUpdater.on('update-not-available', () => {
    console.log('[Updater] No update available')
    mainWindow?.webContents.send('update-not-available')
  })
  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('download-progress', progress)
  })
  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] Update downloaded')
    mainWindow?.webContents.send('update-downloaded', info)
  })
  autoUpdater.on('error', (err) => {
    console.error('[Updater] Error:', err)
    mainWindow?.webContents.send('update-error', err?.message || 'Güncelleme hatası')
  })
}

function startBackend() {
  killPortProcess(BACKEND_PORT)

  let backendCmd, backendArgs, backendCwd

  if (isDev) {
    // Dev modda: Python ile çalıştır
    const pythonPath = findPython() || 'python'
    backendCmd = pythonPath
    backendArgs = ['-u', 'main.py']
    backendCwd = getBackendDir()
  } else {
    // Production: backend.exe
    backendCmd = getBackendExe()
    backendArgs = []
    backendCwd = getBackendDir()
  }

  const backendEnv = { ...process.env, PYTHONIOENCODING: 'utf-8' }
  if (!isDev) {
    // Chromium bundle'dan okunacak şekilde Playwright'a yolunu göster
    backendEnv.PLAYWRIGHT_BROWSERS_PATH = path.join(process.resourcesPath, 'backend', 'ms-playwright')
  }

  pythonProcess = spawn(backendCmd, backendArgs, {
    cwd: backendCwd,
    shell: isDev,
    env: backendEnv,
    windowsHide: true,
  })

  pythonProcess.stdout.on('data', (data) => console.log(`[Backend] ${data}`))
  pythonProcess.stderr.on('data', (data) => console.error(`[Backend Error] ${data}`))
  pythonProcess.on('close', (code) => {
    console.log(`[Backend] Process exited with code ${code}`)
    pythonProcess = null
  })
  pythonProcess.on('error', (err) => {
    console.error(`[Backend] Process error: ${err.message}`)
    pythonProcess = null
  })
  pythonProcess.stdout.on('error', () => {})
  pythonProcess.stderr.on('error', () => {})
}

function stopBackend() {
  if (pythonProcess) {
    try { pythonProcess.kill('SIGTERM') } catch {}
    pythonProcess = null
  }
  killPortProcess(BACKEND_PORT)
}

app.whenReady().then(async () => {
  // Production'da Chromium kurulumunu kontrol et
  if (!isDev) {
    const ready = await ensureChromium(dialog)
    if (!ready) { app.quit(); return }
  }

  startBackend()
  createWindow()
  setupAutoUpdater()
})

app.on('window-all-closed', () => { stopBackend(); app.quit() })
app.on('before-quit', () => { stopBackend() })

ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.on('window-close', () => mainWindow?.close())

ipcMain.on('check-for-updates', () => {
  autoUpdater.checkForUpdates().catch((err) => {
    mainWindow?.webContents.send('update-error', err?.message || 'Güncelleme kontrolü başarısız')
  })
})
ipcMain.on('download-update', () => {
  autoUpdater.downloadUpdate().catch((err) => {
    mainWindow?.webContents.send('update-error', err?.message || 'İndirme başarısız')
  })
})
ipcMain.on('install-update', async () => {
  stopBackend()
  if (mainWindow) mainWindow.hide()
  app.removeAllListeners('window-all-closed')

  // Backend process ve port tamamen kapanana kadar bekle (max 4s)
  await waitPortClosed(BACKEND_PORT, 4000)

  autoUpdater.quitAndInstall(true, true)
})

function waitPortClosed(port, timeoutMs) {
  return new Promise((resolve) => {
    const start = Date.now()
    const check = () => {
      try {
        const out = execSync(`netstat -ano | findstr ":${port} "`, {
          encoding: 'utf-8', shell: true, windowsHide: true, timeout: 1000,
        })
        // Hâlâ LISTENING varsa bekle
        if (out.includes('LISTENING') && Date.now() - start < timeoutMs) {
          setTimeout(check, 300)
          return
        }
      } catch {
        // netstat çıktı vermediyse port kapanmış demektir
      }
      resolve()
    }
    check()
  })
}
