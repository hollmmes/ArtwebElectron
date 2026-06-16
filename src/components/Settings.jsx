import { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle, Download, AlertCircle, Moon, Sun, Activity, Package, Database, Chrome } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { API_BASE } from '../config.js'
import { version as APP_VERSION } from '../../package.json'

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  const [updateStatus, setUpdateStatus] = useState('idle')
  const [updateInfo, setUpdateInfo] = useState(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  const [sysStatus, setSysStatus] = useState(null)
  const [sysLoading, setSysLoading] = useState(false)

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return

    api.onUpdateAvailable?.((info) => {
      setUpdateStatus('available')
      setUpdateInfo(info)
    })
    api.onUpdateNotAvailable?.(() => setUpdateStatus('up-to-date'))
    api.onUpdateDownloaded?.(() => setUpdateStatus('downloaded'))
    api.onDownloadProgress?.((progress) => {
      setUpdateStatus('downloading')
      setDownloadProgress(Math.round(progress.percent || 0))
    })
    api.onUpdateError?.((err) => {
      setUpdateStatus('error')
      setErrorMessage(typeof err === 'string' ? err : err?.message || 'Bilinmeyen hata')
    })

    // Sayfa açılınca sistem durumunu yükle
    loadSysStatus()
  }, [])

  const loadSysStatus = async () => {
    setSysLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/status`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSysStatus(data)
    } catch {
      setSysStatus(null)
    } finally {
      setSysLoading(false)
    }
  }

  const checkForUpdates = () => {
    setUpdateStatus('checking')
    setErrorMessage('')
    window.electronAPI?.checkForUpdates()
  }

  const downloadUpdate = () => {
    setUpdateStatus('downloading')
    setDownloadProgress(0)
    window.electronAPI?.downloadUpdate()
  }

  const installUpdate = () => {
    window.electronAPI?.installUpdate()
  }

  const resetStatus = () => {
    setUpdateStatus('idle')
    setErrorMessage('')
  }

  const PACKAGE_KEYS = ['fastapi', 'uvicorn', 'playwright', 'pydantic', 'aiosqlite', 'aiohttp', 'openpyxl']

  return (
    <div className="h-full flex flex-col gap-5 max-w-3xl overflow-auto">
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Ayarlar</h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Uygulama ayarları ve sistem durumu
        </p>
      </div>

      {/* Tema */}
      <section className={`rounded-xl p-5 ${isDark ? 'bg-slate-900/60 border border-slate-800/60' : 'bg-white border border-gray-200 shadow-sm'}`}>
        <h2 className={`text-base font-semibold mb-4 ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>Görünüm</h2>
        <div className="flex gap-2">
          <ThemeButton active={theme === 'dark'} onClick={() => setTheme('dark')} icon={<Moon size={16} />} label="Karanlık" isDark={isDark} />
          <ThemeButton active={theme === 'light'} onClick={() => setTheme('light')} icon={<Sun size={16} />} label="Aydınlık" isDark={isDark} />
        </div>
      </section>

      {/* Sistem Durumu */}
      <section className={`rounded-xl p-5 ${isDark ? 'bg-slate-900/60 border border-slate-800/60' : 'bg-white border border-gray-200 shadow-sm'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-base font-semibold flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>
            <Activity size={16} />
            Sistem Durumu
          </h2>
          <button
            onClick={loadSysStatus}
            disabled={sysLoading}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
              isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <RefreshCw size={12} className={sysLoading ? 'animate-spin' : ''} />
            Yenile
          </button>
        </div>

        {sysLoading && !sysStatus && (
          <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            <RefreshCw size={14} className="animate-spin" />
            Kontrol ediliyor...
          </div>
        )}

        {!sysLoading && !sysStatus && (
          <div className={`text-sm ${isDark ? 'text-red-400' : 'text-red-500'}`}>
            Backend'e bağlanılamadı. Uygulama başlarken hata oluşmuş olabilir.
          </div>
        )}

        {sysStatus && (
          <div className="space-y-1.5">
            {/* Python */}
            <StatusRow
              isDark={isDark}
              icon={<span className="text-xs font-bold">Py</span>}
              label="Python"
              ok={sysStatus.checks.python?.ok}
              detail={sysStatus.checks.python?.version ? `v${sysStatus.checks.python.version}` : 'Bulunamadı'}
            />

            {/* Veritabanı */}
            <StatusRow
              isDark={isDark}
              icon={<Database size={13} />}
              label="Veritabanı (SQLite)"
              ok={sysStatus.checks.database?.ok}
              detail={sysStatus.checks.database?.ok ? 'artweb.db mevcut' : 'Dosya bulunamadı'}
            />

            {/* Playwright Chromium */}
            <StatusRow
              isDark={isDark}
              icon={<Chrome size={13} />}
              label="Playwright Chromium"
              ok={sysStatus.checks.playwright_chromium?.ok}
              detail={sysStatus.checks.playwright_chromium?.ok ? 'Kurulu' : 'Kurulu değil'}
            />

            {/* Ayraç */}
            <div className={`my-2 border-t ${isDark ? 'border-slate-800' : 'border-gray-100'}`} />
            <p className={`text-xs mb-1.5 ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
              <Package size={11} className="inline mr-1" />
              Python Kütüphaneleri
            </p>

            {PACKAGE_KEYS.map(key => {
              const c = sysStatus.checks[key]
              if (!c) return null
              return (
                <StatusRow
                  key={key}
                  isDark={isDark}
                  label={c.label}
                  ok={c.ok}
                  detail={c.ok ? `v${c.version}` : 'Kurulu değil'}
                  small
                />
              )
            })}
          </div>
        )}
      </section>

      {/* Güncelleme */}
      <section className={`rounded-xl p-5 ${isDark ? 'bg-slate-900/60 border border-slate-800/60' : 'bg-white border border-gray-200 shadow-sm'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-base font-semibold ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>Güncelleme</h2>
          <span className={`text-xs px-2 py-0.5 rounded-md ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
            v{APP_VERSION}
          </span>
        </div>

        <div className="space-y-3">
          {updateStatus === 'idle' && (
            <button
              onClick={checkForUpdates}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw size={15} />
              Güncelleme Kontrol Et
            </button>
          )}

          {updateStatus === 'checking' && (
            <div className={`flex items-center gap-2.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              <RefreshCw size={15} className="animate-spin" />
              <span className="text-sm">Kontrol ediliyor...</span>
            </div>
          )}

          {updateStatus === 'up-to-date' && (
            <div className="flex items-center gap-2.5">
              <CheckCircle size={15} className="text-emerald-500" />
              <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                En güncel sürümü kullanıyorsunuz
              </span>
              <button onClick={resetStatus} className="ml-3 text-xs text-blue-500 hover:text-blue-400 transition-colors">
                Tekrar kontrol et
              </button>
            </div>
          )}

          {updateStatus === 'available' && (
            <div className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'}`}>
              <div className="flex items-center gap-2.5">
                <Download size={15} className="text-blue-500" />
                <span className={`text-sm ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                  Yeni sürüm: <span className="font-semibold text-blue-500">v{updateInfo?.version}</span>
                </span>
              </div>
              <button
                onClick={downloadUpdate}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                İndir ve Kur
              </button>
            </div>
          )}

          {updateStatus === 'downloading' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>İndiriliyor...</span>
                <span className="text-sm font-medium text-blue-500">{downloadProgress}%</span>
              </div>
              <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`}>
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}

          {updateStatus === 'downloaded' && (
            <div className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-100'}`}>
              <div className="flex items-center gap-2.5">
                <CheckCircle size={15} className="text-emerald-500" />
                <span className={`text-sm ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                  Güncelleme indirildi, yüklenmeye hazır
                </span>
              </div>
              <button
                onClick={installUpdate}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Yeniden Başlat
              </button>
            </div>
          )}

          {updateStatus === 'error' && (
            <div className={`p-3 rounded-lg ${isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-100'}`}>
              <div className="flex items-center gap-2.5">
                <AlertCircle size={15} className="text-red-500" />
                <span className={`text-sm ${isDark ? 'text-red-300' : 'text-red-700'}`}>Güncelleme hatası</span>
              </div>
              {errorMessage && (
                <p className={`text-xs mt-1.5 ml-6 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{errorMessage}</p>
              )}
              <button onClick={resetStatus} className="mt-2 ml-6 text-xs text-blue-500 hover:text-blue-400 transition-colors">
                Tekrar dene
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Hakkında */}
      <section className={`rounded-xl p-5 ${isDark ? 'bg-slate-900/60 border border-slate-800/60' : 'bg-white border border-gray-200 shadow-sm'}`}>
        <h2 className={`text-base font-semibold mb-2 ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>Hakkında</h2>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          Art Web Toolkit, Art Web Tasarım şirketinin iç kullanım amaçlı geliştirdiği çok işlevli masaüstü uygulamasıdır.
        </p>
        <p className={`text-xs mt-2 ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
          &copy; 2024 Art Web Tasarım. Tüm hakları saklıdır.
        </p>
      </section>
    </div>
  )
}

function StatusRow({ isDark, icon, label, ok, detail, small }) {
  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${
      isDark ? 'bg-slate-800/40' : 'bg-gray-50'
    } ${small ? 'py-1.5' : ''}`}>
      {icon && (
        <span className={`shrink-0 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{icon}</span>
      )}
      <span className={`flex-1 ${small ? 'text-xs' : 'text-sm'} ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
        {label}
      </span>
      <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{detail}</span>
      {ok
        ? <CheckCircle size={small ? 13 : 14} className="text-emerald-500 shrink-0" />
        : <AlertCircle size={small ? 13 : 14} className="text-red-400 shrink-0" />
      }
    </div>
  )
}

function ThemeButton({ active, onClick, icon, label, isDark }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-blue-600 text-white'
          : isDark
            ? 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
            : 'bg-gray-100 text-gray-600 hover:text-gray-800 hover:bg-gray-200'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
