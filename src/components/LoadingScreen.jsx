import { useState, useEffect } from 'react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { API_BASE } from '../config.js'

const CHECKS = [
  { id: 'backend', label: 'Backend servisi baslatiliyor' },
  { id: 'database', label: 'Veritabani baglantisi' },
  { id: 'update', label: 'Guncelleme kontrol ediliyor' },
]

export default function LoadingScreen({ onComplete }) {
  const [checks, setChecks] = useState(
    CHECKS.map(c => ({ ...c, status: 'waiting' }))
  )

  useEffect(() => {
    runChecks()
  }, [])

  const updateCheck = (id, status) => {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, status } : c))
  }

  const runChecks = async () => {
    // 1. Backend
    updateCheck('backend', 'running')
    let backendReady = false
    for (let i = 0; i < 20; i++) {
      try {
        const res = await fetch(`${API_BASE}/health`)
        if (res.ok) { backendReady = true; break }
      } catch {}
      await sleep(500)
    }
    updateCheck('backend', backendReady ? 'done' : 'error')

    if (!backendReady) {
      await sleep(2000)
      onComplete()
      return
    }

    // 3. Database
    updateCheck('database', 'running')
    await sleep(400)
    updateCheck('database', 'done')

    // 4. Update
    updateCheck('update', 'running')
    try {
      window.electronAPI?.checkForUpdates()
      window.electronAPI?.onUpdateAvailable(() => {
        updateCheck('update', 'done')
        setChecks(prev => prev.map(c => c.id === 'update' ? { ...c, label: 'Yeni surum mevcut!' } : c))
      })
      window.electronAPI?.onUpdateNotAvailable(() => {
        updateCheck('update', 'done')
      })
    } catch {}
    await sleep(1500)
    updateCheck('update', 'done')

    await sleep(400)
    onComplete()
  }


  return (
    <div className="h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center">
        {/* Lottie animation */}
        <div className="w-36 h-36 mb-6">
          <DotLottieReact
            src="./loading.lottie"
            loop
            autoplay
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        {/* App name */}
        <h1 className="text-white text-lg font-bold mb-0.5">Art Web Toolkit</h1>
        <p className="text-slate-500 text-xs mb-7">Hazirlaniyor...</p>

        {/* Checks */}
        <div className="w-64 space-y-2">
          {checks.map((check) => (
            <div key={check.id} className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 shrink-0 rounded-full" style={{
                backgroundColor:
                  check.status === 'done' ? '#10b981' :
                  check.status === 'running' ? '#eab308' :
                  check.status === 'error' ? '#ef4444' :
                  '#334155'
              }} />
              <span className={`text-[11px] ${
                check.status === 'running' ? 'text-white' :
                check.status === 'done' ? 'text-slate-500' :
                check.status === 'error' ? 'text-red-400' :
                'text-slate-700'
              }`}>
                {check.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
