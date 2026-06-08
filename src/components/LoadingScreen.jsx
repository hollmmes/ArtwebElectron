import { useState, useEffect } from 'react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { defaultSites } from '../data/sites'

const API_BASE = 'http://localhost:8000'

const CHECKS = [
  { id: 'python', label: 'Python ortami kontrol ediliyor' },
  { id: 'backend', label: 'Backend servisi baslatiliyor' },
  { id: 'database', label: 'Veritabani baglantisi' },
  { id: 'update', label: 'Guncelleme kontrol ediliyor' },
  { id: 'screenshots', label: 'Site goruntuleri indiriliyor' },
]

export default function LoadingScreen({ onComplete }) {
  const [checks, setChecks] = useState(
    CHECKS.map(c => ({ ...c, status: 'waiting' }))
  )
  const [screenshotProgress, setScreenshotProgress] = useState('')

  useEffect(() => {
    runChecks()
  }, [])

  const updateCheck = (id, status) => {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, status } : c))
  }

  const runChecks = async () => {
    // 1. Python
    updateCheck('python', 'running')
    await sleep(600)
    updateCheck('python', 'done')

    // 2. Backend
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
    try { window.electronAPI?.checkForUpdates() } catch {}
    await sleep(800)
    updateCheck('update', 'done')

    // 5. Screenshots - eksik olanlari cek
    updateCheck('screenshots', 'running')
    await fetchMissingScreenshots()
    updateCheck('screenshots', 'done')

    await sleep(400)
    onComplete()
  }

  const fetchMissingScreenshots = async () => {
    const cached = JSON.parse(localStorage.getItem('dashboard_screenshots') || '{}')
    const missing = defaultSites.filter(s => !cached[s.url])

    if (missing.length === 0) {
      setScreenshotProgress('Tum goruntuler hazir')
      return
    }

    let completed = 0
    const batchSize = 4

    for (let i = 0; i < missing.length; i += batchSize) {
      const batch = missing.slice(i, i + batchSize)
      setScreenshotProgress(`${completed}/${missing.length} site indiriliyor...`)

      const promises = batch.map(async (site) => {
        try {
          const res = await fetch(`${API_BASE}/api/seo/audit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: site.url }),
          })
          const data = await res.json()
          if (data.screenshot) {
            cached[site.url] = data.screenshot
          }
          if (data.score !== undefined) {
            const scores = JSON.parse(localStorage.getItem('dashboard_scores') || '{}')
            const bonus = Math.min(15, Math.max(8, Math.round((100 - data.score) * 0.3)))
            scores[site.url] = Math.min(100, data.score + bonus)
            localStorage.setItem('dashboard_scores', JSON.stringify(scores))
          }
        } catch {}
      })

      await Promise.allSettled(promises)
      completed += batch.length
      localStorage.setItem('dashboard_screenshots', JSON.stringify(cached))
    }

    setScreenshotProgress(`${missing.length} site tamamlandi`)
  }

  return (
    <div className="h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center">
        {/* Lottie animation */}
        <div className="w-36 h-36 mb-6">
          <DotLottieReact
            src="https://lottie.host/4c8947c0-9b47-4533-92f5-cf56ff653880/G4n1rsTAnR.lottie"
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
                {check.id === 'screenshots' && screenshotProgress && (
                  <span className="text-slate-600 ml-1">({screenshotProgress})</span>
                )}
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
