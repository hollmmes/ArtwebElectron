import { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle, Download, AlertCircle, Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

const APP_VERSION = '0.5.0'

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  const [updateStatus, setUpdateStatus] = useState('idle')
  const [updateInfo, setUpdateInfo] = useState(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return

    api.onUpdateAvailable?.((info) => {
      setUpdateStatus('available')
      setUpdateInfo(info)
    })

    api.onUpdateNotAvailable?.(() => {
      setUpdateStatus('up-to-date')
    })

    api.onUpdateDownloaded?.(() => {
      setUpdateStatus('downloaded')
    })

    api.onDownloadProgress?.((progress) => {
      setUpdateStatus('downloading')
      setDownloadProgress(Math.round(progress.percent || 0))
    })

    api.onUpdateError?.((err) => {
      setUpdateStatus('error')
      setErrorMessage(typeof err === 'string' ? err : err?.message || 'Bilinmeyen hata')
    })
  }, [])

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

  return (
    <div className="h-full flex flex-col gap-5 max-w-3xl">
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Ayarlar</h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Uygulama ayarlari ve guncelleme kontrolu
        </p>
      </div>

      {/* Tema */}
      <section className={`rounded-xl p-5 ${isDark ? 'bg-slate-900/60 border border-slate-800/60' : 'bg-white border border-gray-200 shadow-sm'}`}>
        <h2 className={`text-base font-semibold mb-4 ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>Gorunum</h2>
        <div className="flex gap-2">
          <ThemeButton
            active={theme === 'dark'}
            onClick={() => setTheme('dark')}
            icon={<Moon size={16} />}
            label="Karanlik"
            isDark={isDark}
          />
          <ThemeButton
            active={theme === 'light'}
            onClick={() => setTheme('light')}
            icon={<Sun size={16} />}
            label="Aydinlik"
            isDark={isDark}
          />
        </div>
      </section>

      {/* Guncelleme */}
      <section className={`rounded-xl p-5 ${isDark ? 'bg-slate-900/60 border border-slate-800/60' : 'bg-white border border-gray-200 shadow-sm'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-base font-semibold ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>Guncelleme</h2>
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
              Guncelleme Kontrol Et
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
                En guncel surumu kullaniyorsunuz
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
                  Yeni surum: <span className="font-semibold text-blue-500">v{updateInfo?.version}</span>
                </span>
              </div>
              <button
                onClick={downloadUpdate}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Indir ve Kur
              </button>
            </div>
          )}

          {updateStatus === 'downloading' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Indiriliyor...</span>
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
                  Guncelleme indirildi, yüklenmeye hazir
                </span>
              </div>
              <button
                onClick={installUpdate}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Yeniden Baslat
              </button>
            </div>
          )}

          {updateStatus === 'error' && (
            <div className={`p-3 rounded-lg ${isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-100'}`}>
              <div className="flex items-center gap-2.5">
                <AlertCircle size={15} className="text-red-500" />
                <span className={`text-sm ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                  Guncelleme hatasi
                </span>
              </div>
              {errorMessage && (
                <p className={`text-xs mt-1.5 ml-6 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                  {errorMessage}
                </p>
              )}
              <button onClick={resetStatus} className="mt-2 ml-6 text-xs text-blue-500 hover:text-blue-400 transition-colors">
                Tekrar dene
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Hakkinda */}
      <section className={`rounded-xl p-5 ${isDark ? 'bg-slate-900/60 border border-slate-800/60' : 'bg-white border border-gray-200 shadow-sm'}`}>
        <h2 className={`text-base font-semibold mb-2 ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>Hakkinda</h2>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          Art Web Toolkit, Art Web Tasarim sirketinin ic kullanim amacli gelistirdigi cok islevli masaustu uygulamasidir.
        </p>
        <p className={`text-xs mt-2 ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
          &copy; 2024 Art Web Tasarim. Tum haklari saklidir.
        </p>
      </section>
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
