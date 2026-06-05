const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),

  // Auto-updater
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  downloadUpdate: () => ipcRenderer.send('download-update'),
  installUpdate: () => ipcRenderer.send('install-update'),

  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_e, info) => callback(info)),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', () => callback()),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (_e, progress) => callback(progress)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', () => callback()),
  onUpdateError: (callback) => ipcRenderer.on('update-error', (_e, err) => callback(err)),
})
