// Sadece dev modda kullanılır — production'da backend.exe çalışır, Python gerekmez
const { execSync } = require('child_process')
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

  paths.push('py')
  return paths
}

function findPython() {
  for (const pythonPath of getPythonPaths()) {
    try {
      const cmd = pythonPath.includes(' ') ? `"${pythonPath}" --version` : `${pythonPath} --version`
      const result = execSync(cmd, { encoding: 'utf-8', timeout: 5000, windowsHide: true, shell: true })
      if (result.includes('Python 3')) return pythonPath
    } catch {}
  }
  return null
}

module.exports = { findPython }
