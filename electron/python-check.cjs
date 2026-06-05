const { execSync } = require('child_process')
const { dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')

const PYTHON_PATHS = [
  'python',
  'python3',
  path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python313', 'python.exe'),
  path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python312', 'python.exe'),
  path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python311', 'python.exe'),
]

function findPython() {
  for (const pythonPath of PYTHON_PATHS) {
    try {
      const result = execSync(`"${pythonPath}" --version`, { encoding: 'utf-8', timeout: 5000 })
      if (result.includes('Python 3')) return pythonPath
    } catch {}
  }
  return null
}

function isPythonInstalled() {
  return findPython() !== null
}

function areDependenciesInstalled(backendDir) {
  const python = findPython()
  if (!python) return false
  try {
    execSync(`"${python}" -c "import fastapi; import playwright"`, {
      encoding: 'utf-8',
      timeout: 10000,
      cwd: backendDir,
    })
    return true
  } catch {
    return false
  }
}

function installDependencies(backendDir) {
  const python = findPython()
  if (!python) return false
  try {
    const requirementsPath = path.join(backendDir, 'requirements.txt')
    if (fs.existsSync(requirementsPath)) {
      execSync(`"${python}" -m pip install -r "${requirementsPath}" --quiet`, {
        encoding: 'utf-8',
        timeout: 120000,
        cwd: backendDir,
      })
    }
    execSync(`"${python}" -m playwright install chromium`, {
      encoding: 'utf-8',
      timeout: 120000,
    })
    return true
  } catch {
    return false
  }
}

async function checkPythonEnvironment(backendDir) {
  if (!isPythonInstalled()) {
    const result = await dialog.showMessageBox({
      type: 'warning',
      title: 'Python Gerekli',
      message: 'Bu uygulama çalışmak için Python 3.10+ gerektirir.',
      detail: 'Python yüklü değil veya bulunamadı. Python indirme sayfasına yönlendirileceksiniz.\n\nKurulum sırasında "Add Python to PATH" seçeneğini işaretlemeyi unutmayın!',
      buttons: ['Python İndir', 'Çıkış'],
      defaultId: 0,
      cancelId: 1,
    })

    if (result.response === 0) {
      shell.openExternal('https://www.python.org/downloads/')
    }
    return false
  }

  if (!areDependenciesInstalled(backendDir)) {
    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'Bağımlılıklar Yükleniyor',
      message: 'İlk çalıştırma: Gerekli paketler yükleniyor...',
      detail: 'FastAPI, Playwright ve diğer bağımlılıklar kurulacak. Bu işlem birkaç dakika sürebilir.',
      buttons: ['Kur', 'Çıkış'],
      defaultId: 0,
      cancelId: 1,
    })

    if (result.response === 1) return false

    const success = installDependencies(backendDir)
    if (!success) {
      await dialog.showMessageBox({
        type: 'error',
        title: 'Kurulum Hatası',
        message: 'Bağımlılıklar yüklenemedi.',
        detail: 'Lütfen terminalde şu komutları çalıştırın:\n\npip install fastapi uvicorn playwright\npython -m playwright install chromium',
        buttons: ['Tamam'],
      })
      return false
    }
  }

  return true
}

module.exports = { checkPythonEnvironment, findPython }
