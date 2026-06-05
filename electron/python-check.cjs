const { execSync } = require('child_process')
const { dialog, shell } = require('electron')
const path = require('path')

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

  // py launcher (Windows Python Launcher)
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
  }

  return true
}

module.exports = { checkPythonEnvironment, findPython }
