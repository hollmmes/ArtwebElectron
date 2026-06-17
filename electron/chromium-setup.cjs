const path = require('path')
const fs = require('fs')

function isChromiumBundled() {
  const msPlaywright = path.join(process.resourcesPath, 'backend', 'ms-playwright')
  if (!fs.existsSync(msPlaywright)) return false
  try {
    for (const dir of fs.readdirSync(msPlaywright)) {
      if (!dir.toLowerCase().startsWith('chromium-')) continue
      const base = path.join(msPlaywright, dir)
      for (const sub of ['chrome-win', 'chrome-win64']) {
        if (fs.existsSync(path.join(base, sub, 'chrome.exe'))) return true
      }
    }
  } catch {}
  return false
}

async function ensureChromium(dialog) {
  if (isChromiumBundled()) return true

  // Bundle içinde Chromium yoksa kullanıcıyı uyar ama devam et
  const result = await dialog.showMessageBox({
    type: 'warning',
    title: 'Chromium Bulunamadı',
    message: 'Bundle içinde Chromium bulunamadı.',
    detail: 'Lighthouse ve site analizi özellikleri çalışmayabilir.',
    buttons: ['Yine de Devam Et', 'Çıkış'],
    defaultId: 0,
    cancelId: 1,
  })
  return result.response === 0
}

module.exports = { ensureChromium, isChromiumBundled }
