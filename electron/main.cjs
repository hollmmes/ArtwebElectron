const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const { autoUpdater } = require('electron-updater')
const { checkPythonEnvironment, findPython } = require('./python-check.cjs')

let mainWindow
let pythonProcess

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

  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
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

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update-available', info)
  })

  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('update-not-available')
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('download-progress', progress)
  })

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update-downloaded')
  })

  autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('update-error', err?.message || 'Güncelleme hatası')
  })
}

function startPythonBackend() {
  const pythonPath = findPython() || 'python'
  const backendPath = path.join(__dirname, '..', 'backend', 'main.py')

  pythonProcess = spawn(pythonPath, ['-u', backendPath], {
    cwd: path.join(__dirname, '..', 'backend'),
  })

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Backend] ${data}`)
  })

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Backend Error] ${data}`)
  })

  pythonProcess.on('close', (code) => {
    console.log(`[Backend] Process exited with code ${code}`)
  })
}

function stopPythonBackend() {
  if (pythonProcess) {
    pythonProcess.kill()
    pythonProcess = null
  }
}

app.whenReady().then(async () => {
  const backendDir = path.join(__dirname, '..', 'backend')
  const pythonReady = await checkPythonEnvironment(backendDir)

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
  autoUpdater.checkForUpdates()
})

ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall()
})
