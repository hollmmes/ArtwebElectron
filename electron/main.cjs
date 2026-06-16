const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const { autoUpdater } = require('electron-updater')
const { checkPythonEnvironment, findPython } = require('./python-check.cjs')

process.on('uncaughtException', (err) => {
  if (err.code === 'EPIPE' || err.code === 'ERR_STREAM_DESTROYED') return
  console.error('[Uncaught]', err)
})

let mainWindow
let pythonProcess

const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev')

function getBackendDir() {
  if (isDev) {
    return path.join(__dirname, '..', 'backend')
  }
  return path.join(process.resourcesPath, 'backend')
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

  autoUpdater.on('update-not-available', (info) => {
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
    const message = err?.message || 'Güncelleme hatası oluştu'
    mainWindow?.webContents.send('update-error', message)
  })
}

function startPythonBackend() {
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
    pythonProcess.kill()
    pythonProcess = null
  }
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
  setTimeout(() => {
    autoUpdater.quitAndInstall(false, true)
  }, 500)
})
