const { execSync } = require('child_process')
const { dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')

const PYTHON_PATHS = [
  'python',
  'python3',
  path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python314', 'python.exe'),
  path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python313', 'python.exe'),
  path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python312', 'python.exe'),
  path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python311', 'python.exe'),
]

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

function areDependenciesInstalled(python, backendDir) {
  try {
    const cmd = python.includes(' ') ? `"${python}"` : python
    execSync(`${cmd} -c "import fastapi; import uvicorn"`, {
      encoding: 'utf-8',
      timeout: 10000,
      cwd: backendDir,
      windowsHide: true,
      shell: true,
    })
    return true
  } catch {
    return false
  }
}

function installDependencies(python, backendDir) {
  const cmd = python.includes(' ') ? `"${python}"` : python
  try {
    const requirementsPath = path.join(backendDir, 'requirements.txt')
    if (fs.existsSync(requirementsPath)) {
      execSync(`${cmd} -m pip install -r "${requirementsPath}" --quiet`, {
        encoding: 'utf-8',
        timeout: 180000,
        cwd: backendDir,
        windowsHide: true,
        shell: true,
      })
    } else {
      execSync(`${cmd} -m pip install fastapi uvicorn playwright pydantic --quiet`, {
        encoding: 'utf-8',
        timeout: 180000,
        windowsHide: true,
        shell: true,
      })
    }
    execSync(`${cmd} -m playwright install chromium`, {
      encoding: 'utf-8',
      timeout: 180000,
      windowsHide: true,
      shell: true,
    })
    return true
  } catch {
    return false
  }
}

async function checkPythonEnvironment(backendDir) {
  const python = findPython()

  if (!python) {
    const result = await dialog.showMessageBox({
      type: 'warning',
      title: 'Python Gerekli',
      message: 'Bu uygulama çalışmak için Python 3.10+ gerektirir.',
      detail: 'Python yüklü değil veya bulunamadı. Python indirme sayfasına yönlendirileceksiniz.\n\nKurulum sırasında "Add Python to PATH" seçeneğini işaretlemeyi unutmayın!',
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

  if (!areDependenciesInstalled(python, backendDir)) {
    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'Paketler Kuruluyor',
      message: 'İlk çalıştırma: Gerekli Python paketleri yükleniyor...',
      detail: 'FastAPI, Playwright ve diğer bağımlılıklar kurulacak. Bu işlem birkaç dakika sürebilir.',
      buttons: ['Kur', 'Atla', 'Çıkış'],
      defaultId: 0,
      cancelId: 2,
    })

    if (result.response === 2) return false
    if (result.response === 1) return true

    const success = installDependencies(python, backendDir)
    if (!success) {
      const retry = await dialog.showMessageBox({
        type: 'error',
        title: 'Kurulum Hatası',
        message: 'Paketler yüklenirken bir sorun oluştu.',
        detail: 'Terminalde şu komutları çalıştırabilirsiniz:\n\npip install fastapi uvicorn playwright pydantic\npython -m playwright install chromium\n\nYine de devam etmek ister misiniz?',
        buttons: ['Devam Et', 'Çıkış'],
        defaultId: 0,
        cancelId: 1,
      })
      return retry.response === 0
    }
  }

  return true
}

module.exports = { checkPythonEnvironment, findPython }
