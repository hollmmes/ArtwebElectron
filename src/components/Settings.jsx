import { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle, Download, AlertCircle } from 'lucide-react'

const APP_VERSION = '0.1.7'

export default function Settings() {
  const [updateStatus, setUpdateStatus] = useState('idle')
  const [updateInfo, setUpdateInfo] = useState(null)
  const [downloadProgress, setDownloadProgress] = useState(0)

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
      setUpdateInfo(err)
    })
  }, [])

  const checkForUpdates = () => {
    setUpdateStatus('checking')
    window.electronAPI?.checkForUpdates()
  }

  const installUpdate = () => {
    window.electronAPI?.installUpdate()
  }

  return (
    <div className="h-full flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Ayarlar</h1>
        <p className="text-white/50 text-sm mt-1">Uygulama ayarları ve güncelleme kontrolü</p>
      </div>

      {/* Versiyon Bilgisi */}
      <div className="glass rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Uygulama Bilgileri</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-white/5">
            <p className="text-white/40 text-xs mb-1">Uygulama</p>
            <p className="text-white font-medium">Art Web Toolkit</p>
          </div>
          <div className="p-4 rounded-lg bg-white/5">
            <p className="text-white/40 text-xs mb-1">Versiyon</p>
            <p className="text-white font-medium">v{APP_VERSION}</p>
          </div>
        </div>
      </div>

      {/* Güncelleme */}
      <div className="glass rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Güncelleme</h2>

        <div className="flex items-center gap-4">
          {updateStatus === 'idle' && (
            <button
              onClick={checkForUpdates}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-medium transition-colors"
            >
              <RefreshCw size={16} />
              Güncelleme Kontrol Et
            </button>
          )}

          {updateStatus === 'checking' && (
            <div className="flex items-center gap-3 text-white/60">
              <RefreshCw size={16} className="animate-spin" />
              <span className="text-sm">Kontrol ediliyor...</span>
            </div>
          )}

          {updateStatus === 'up-to-date' && (
            <div className="flex items-center gap-3 text-green-400">
              <CheckCircle size={16} />
              <span className="text-sm">En güncel sürümü kullanıyorsunuz</span>
              <button
                onClick={() => setUpdateStatus('idle')}
                className="ml-4 text-xs text-white/40 hover:text-white/60 underline"
              >
                Tekrar kontrol et
              </button>
            </div>
          )}

          {updateStatus === 'available' && (
            <div className="flex items-center gap-3">
              <Download size={16} className="text-primary-400" />
              <span className="text-sm text-white/80">
                Yeni versiyon mevcut: <span className="text-primary-400 font-medium">v{updateInfo?.version}</span>
              </span>
              <button
                onClick={checkForUpdates}
                className="ml-4 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 rounded-lg text-xs font-medium transition-colors"
              >
                İndir
              </button>
            </div>
          )}

          {updateStatus === 'downloading' && (
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">İndiriliyor...</span>
                <span className="text-primary-400 font-medium">{downloadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}

          {updateStatus === 'downloaded' && (
            <div className="flex items-center gap-3">
              <CheckCircle size={16} className="text-green-400" />
              <span className="text-sm text-white/80">Güncelleme indirildi</span>
              <button
                onClick={installUpdate}
                className="ml-4 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
              >
                Yeniden Başlat ve Güncelle
              </button>
            </div>
          )}

          {updateStatus === 'error' && (
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle size={16} />
              <span className="text-sm">Güncelleme kontrol edilemedi</span>
              <button
                onClick={() => setUpdateStatus('idle')}
                className="ml-4 text-xs text-white/40 hover:text-white/60 underline"
              >
                Tekrar dene
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hakkında */}
      <div className="glass rounded-xl p-6 space-y-3">
        <h2 className="text-lg font-semibold text-white">Hakkında</h2>
        <p className="text-white/50 text-sm">
          Art Web Toolkit, Art Web Tasarım şirketinin iç kullanım amaçlı geliştirdiği çok işlevli masaüstü uygulamasıdır.
        </p>
        <p className="text-white/30 text-xs">
          © 2024 Art Web Tasarım. Tüm hakları saklıdır.
        </p>
      </div>
    </div>
  )
}
