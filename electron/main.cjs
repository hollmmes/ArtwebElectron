const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { spawn, execSync } = require('child_process')
const { autoUpdater } = require('electron-updater')
const { checkPythonEnvironment, findPython } = require('./python-check.cjs')

process.on('uncaughtException', (err) => {
  if (err.code === 'EPIPE' || err.code === 'ERR_STREAM_DESTROYED') return
  console.error('[Uncaught]', err)
})

let mainWindow
let pythonProcess

const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev')
const BACKEND_PORT = 42310

function getBackendDir() {
  if (isDev) return path.join(__dirname, '..', 'backend')
  return path.join(process.resourcesPath, 'backend')
}

// Portu dinleyen process'i öldür (önceki oturumdan kalan backend için)
function killPortProcess(port) {
  try {
    const output = execSync(`netstat -ano | findstr ":${port} "`, {
      encoding: 'utf-8',
      shell: true,
      windowsHide: true,
      timeout: 3000,
    })
    for (const line of output.split('\n')) {
      if (!line.includes('LISTENING')) continue
      const pid = line.trim().split(/\s+/).pop()
      if (pid && pid !== '0') {
        execSync(`taskkill /PID ${pid} /F`, { windowsHide: true, shell: true, timeout: 3000 })
        console.log(`[Backend] Killed stale process on port ${port} (PID ${pid})`)
      }
    }
  } catch {
    // Port boşsa veya taskkill başarısızsa sessizce devam et
  }
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

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  if (isDev) {
    autoUpdater.forceDevUpdateConfig = true
  }

  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for updates...')
  })

  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] Update available:', info.version)
    mainWindow?.webContents.send('update-available', info)
  })

  autoUpdater.on('update-not-available', () => {
    console.log('[Updater] No update available, current is latest')
    mainWindow?.webContents.send('update-not-available')
  })

  autoUpdater.on('download-progress', (progress) => {
    console.log(`[Updater] Download progress: ${Math.round(progress.percent)}%`)
    mainWindow?.webContents.send('download-progress', progress)
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] Update downloaded, ready to install')
    mainWindow?.webContents.send('update-downloaded', info)
  })

  autoUpdater.on('error', (err) => {
    console.error('[Updater] Error:', err)
    mainWindow?.webContents.send('update-error', err?.message || 'Güncelleme hatası oluştu')
  })
}

function startPythonBackend() {
  // Önceki oturumdan kalan backend varsa öldür
  killPortProcess(BACKEND_PORT)

  const pythonPath = findPython() || 'python'
  const backendDir = getBackendDir()
  const backendPath = path.join(backendDir, 'main.py')

  pythonProcess = spawn(pythonPath, ['-u', backendPath], {
    cwd: backendDir,
    shell: true,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  })

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Backend] ${data}`)
  })

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Backend Error] ${data}`)
  })

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

function stopPythonBackend() {
  if (pythonProcess) {
    try { pythonProcess.kill('SIGTERM') } catch {}
    pythonProcess = null
  }
  // Port üzerinden de garantiye al
  killPortProcess(BACKEND_PORT)
}

app.whenReady().then(async () => {
  const pythonReady = await checkPythonEnvironment()

  if (!pythonReady) {
    app.quit()
    return
  }

  startPythonBackend()
  createWindow()
  setupAutoUpdater()
})

app.on('window-all-closed', () => {
  stopPythonBackend()
  app.quit()
})

app.on('before-quit', () => {
  stopPythonBackend()
})

ipcMain.on('window-minimize', () => {
  mainWindow?.minimize()
})

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.on('window-close', () => {
  mainWindow?.close()
})

ipcMain.on('check-for-updates', () => {
  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[Updater] Check failed:', err)
    mainWindow?.webContents.send('update-error', err?.message || 'Güncelleme kontrolü başarısız')
  })
})

ipcMain.on('download-update', () => {
  autoUpdater.downloadUpdate().catch((err) => {
    console.error('[Updater] Download failed:', err)
    mainWindow?.webContents.send('update-error', err?.message || 'İndirme başarısız')
  })
})

ipcMain.on('install-update', () => {
  stopPythonBackend()

  if (mainWindow) {
    mainWindow.hide()
  }

  // window-all-closed tetiklenip app.quit() çağrılmasın
  app.removeAllListeners('window-all-closed')

  // isSilent=true: NSIS sessiz kurulum → "app açık" diyaloğu çıkmaz, direkt kurar
  // isForceRunAfter=true: kurulumdan sonra uygulamayı yeniden başlat
  setTimeout(() => {
    autoUpdater.quitAndInstall(true, true)
  }, 1000)
})
