import { useState, useEffect } from 'react'
import { Globe, Loader2, AlertTriangle, Zap, Smartphone, Monitor, Plus, X, Trash2, Info, Check, Circle } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

const API_BASE = 'http://localhost:8000'

export default function Lighthouse() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [urls, setUrls] = useState([''])
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [currentStep, setCurrentStep] = useState('')
  const [currentUrl, setCurrentUrl] = useState('')
  const [queue, setQueue] = useState([])
  const [activeReport, setActiveReport] = useState(null)
  const [activeTab, setActiveTab] = useState('desktop')
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/lighthouse/reports`)
      const data = await res.json()
      setHistory(data.reports || [])
    } catch {}
  }

  const addUrlField = () => setUrls([...urls, ''])

  const removeUrlField = (index) => {
    if (urls.length <= 1) return
    setUrls(urls.filter((_, i) => i !== index))
  }

  const updateUrl = (index, value) => {
    const newUrls = [...urls]
    newUrls[index] = value
    setUrls(newUrls)
  }

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (urls[index].trim()) {
        addUrlField()
        setTimeout(() => {
          const inputs = document.querySelectorAll('[data-url-input]')
          inputs[inputs.length - 1]?.focus()
        }, 50)
      }
    }
  }

  const handleAudit = async (e) => {
    e.preventDefault()
    const validUrls = urls.filter(u => u.trim())
    if (validUrls.length === 0) return

    setLoading(true)
    setError('')
    setActiveReport(null)
    setStatusMsg('Kuyruk hazirlaniyor...')
    setCurrentStep('')

    // Initialize queue
    const initialQueue = validUrls.map(u => ({
      url: u.startsWith('http') ? u : `https://${u}`,
      status: 'waiting',
      desktop_url: null,
      mobile_url: null,
      error: null,
    }))
    setQueue(initialQueue)

    try {
      const response = await fetch(`${API_BASE}/api/lighthouse/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: validUrls }),
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))

            if (event.type === 'queue') {
              setCurrentUrl(event.url)
              setQueue(prev => prev.map(q =>
                q.url === event.url ? { ...q, status: 'running' } : q
              ))
            } else if (event.type === 'status') {
              setStatusMsg(event.message)
              setCurrentStep(event.step || '')
              if (event.url) setCurrentUrl(event.url)
            } else if (event.type === 'report_ready') {
              const reportUrl = `${API_BASE}${event.report_url}`
              setQueue(prev => prev.map(q =>
                q.url === event.url
                  ? { ...q, [event.device === 'desktop' ? 'desktop_url' : 'mobile_url']: reportUrl }
                  : q
              ))
              // Masaustu bitince hemen goster
              if (event.device === 'desktop' && !activeReport) {
                setActiveReport({ url: event.url, report_url: reportUrl, device: 'desktop' })
                setActiveTab('desktop')
              }
            } else if (event.type === 'site_done') {
              setQueue(prev => prev.map(q =>
                q.url === event.url ? { ...q, status: 'done' } : q
              ))
            } else if (event.type === 'error') {
              if (event.url) {
                setQueue(prev => prev.map(q =>
                  q.url === event.url ? { ...q, status: 'error', error: event.message } : q
                ))
              } else {
                setError(event.message)
              }
            } else if (event.type === 'done') {
              setLoading(false)
              loadHistory()
            }
          } catch {}
        }
      }
    } catch (err) {
      setError(err.message || 'Baglanti hatasi')
    }
    setLoading(false)
  }

  const openQueueReport = (item, device) => {
    const reportUrl = device === 'desktop' ? item.desktop_url : item.mobile_url
    if (!reportUrl) return
    setActiveReport({ url: item.url, report_url: reportUrl, device })
    setActiveTab(device)
  }

  const openHistoryReport = (report) => {
    const isMobile = report.name.includes('mobile')
    setActiveReport({ url: '', report_url: `${API_BASE}${report.url}`, device: isMobile ? 'mobile' : 'desktop' })
    setActiveTab(isMobile ? 'mobile' : 'desktop')
    setShowHistory(false)
  }

  const deleteReport = async (e, report) => {
    e.stopPropagation()
    try {
      await fetch(`${API_BASE}/api/lighthouse/reports/${report.name}`, { method: 'DELETE' })
      loadHistory()
    } catch {}
  }

  // Aktif rapor icin ayni URL'nin diger device'i var mi
  const activeQueueItem = activeReport ? queue.find(q => q.url === activeReport.url) : null

  const inputCls = isDark
    ? 'bg-slate-900/60 border border-slate-700/60 text-white placeholder-slate-500 focus:border-blue-500/50'
    : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500/50 shadow-sm'

  const showForm = !activeReport && !showHistory
  const showQueue = queue.length > 0 && !showHistory

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Lighthouse</h1>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Performans, SEO ve erisilebilirlik analizi
          </p>
        </div>
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <button
              onClick={() => { setShowHistory(!showHistory); setActiveReport(null) }}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                showHistory ? 'bg-blue-600 text-white' : isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'
              }`}
            >
              Gecmis ({history.length})
            </button>
          )}
          {(activeReport || queue.length > 0) && (
            <button
              onClick={() => { setActiveReport(null); setQueue([]); setShowHistory(false); setError('') }}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'}`}
            >
              Yeni Analiz
            </button>
          )}
        </div>
      </div>

      {/* Gecmis */}
      {showHistory && (
        <div className={`flex-1 overflow-auto rounded-xl p-3 ${isDark ? 'bg-slate-900/60 border border-slate-800/60' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <div className="space-y-1">
            {history.map((report, i) => {
              const name = report.name.replace(/^\d+_/, '').replace('desktop_', '').replace('mobile_', '').replace('.html', '').replace(/_/g, '/')
              const isMobile = report.name.includes('mobile')
              return (
                <div
                  key={i}
                  onClick={() => openHistoryReport(report)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer group ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-2.5">
                    {isMobile ? <Smartphone size={13} className="text-purple-400" /> : <Monitor size={13} className="text-blue-400" />}
                    <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isMobile ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                      {isMobile ? 'Mobil' : 'Masaustu'}
                    </span>
                  </div>
                  <button onClick={(e) => deleteReport(e, report)} className={`opacity-0 group-hover:opacity-100 p-1 rounded ${isDark ? 'hover:bg-red-500/10 text-slate-600 hover:text-red-400' : 'hover:bg-red-50 text-gray-300 hover:text-red-500'}`}>
                    <Trash2 size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && !loading && queue.length === 0 && (
        <>
          <form onSubmit={handleAudit} className={`rounded-xl p-4 shrink-0 ${isDark ? 'bg-slate-900/40 border border-slate-800/60' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <div className="space-y-2">
              {urls.map((u, i) => (
                <div key={i} className="flex gap-2">
                  <div className="flex-1 relative">
                    <Globe size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                    <input
                      data-url-input
                      type="text"
                      value={u}
                      onChange={(e) => updateUrl(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, i)}
                      placeholder={i === 0 ? 'https://example.com (Enter ile ekle)' : 'https://...'}
                      className={`w-full pl-9 pr-4 py-2.5 rounded-lg text-sm focus:outline-none transition-colors ${inputCls}`}
                      autoFocus={i === urls.length - 1 && i > 0}
                    />
                  </div>
                  {urls.length > 1 && (
                    <button type="button" onClick={() => removeUrlField(i)} className={`p-2 rounded-lg ${isDark ? 'text-slate-600 hover:text-red-400' : 'text-gray-300 hover:text-red-500'}`}>
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3">
              <button type="button" onClick={addUrlField} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
                <Plus size={13} /> Site Ekle
              </button>
              <button type="submit" disabled={!urls.some(u => u.trim())} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                <Zap size={15} />
                Analiz Et ({urls.filter(u => u.trim()).length})
              </button>
            </div>
          </form>

          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Zap size={40} className={isDark ? 'text-slate-800 mx-auto' : 'text-gray-200 mx-auto'} />
              <p className={`text-sm mt-3 ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>URL girin, masaustu ve mobil rapor alin</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-700' : 'text-gray-300'}`}>Birden fazla site ekleyip sirayla analiz edebilirsiniz</p>
            </div>
          </div>
        </>
      )}

      {/* Queue Panel - rapor gorunurken veya loading'deyken */}
      {showQueue && !showHistory && (
        <div className={`rounded-xl p-3 shrink-0 ${isDark ? 'bg-slate-900/40 border border-slate-800/60' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-2">
            <p className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Analiz Sirasi {loading && <Loader2 size={10} className="inline animate-spin ml-1" />}
            </p>
            {loading && (
              <span className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>{statusMsg}</span>
            )}
          </div>
          <div className="space-y-1">
            {queue.map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
                  activeReport?.url === item.url
                    ? isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'
                    : isDark ? 'border border-transparent' : 'border border-transparent'
                }`}
              >
                {/* Status icon */}
                {item.status === 'waiting' && <Circle size={14} className={isDark ? 'text-slate-700' : 'text-gray-300'} />}
                {item.status === 'running' && <Loader2 size={14} className="text-blue-500 animate-spin" />}
                {item.status === 'done' && <Check size={14} className="text-emerald-500" />}
                {item.status === 'error' && <AlertTriangle size={14} className="text-red-500" />}

                {/* URL */}
                <span className={`text-sm flex-1 truncate ${
                  item.status === 'error' ? 'text-red-400' : isDark ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  {item.url.replace('https://', '').replace('http://', '')}
                </span>

                {/* Report buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  {item.desktop_url && (
                    <button
                      onClick={() => openQueueReport(item, 'desktop')}
                      className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${
                        activeReport?.url === item.url && activeTab === 'desktop'
                          ? 'bg-blue-500 text-white'
                          : isDark ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                    >
                      Masaustu
                    </button>
                  )}
                  {item.mobile_url && (
                    <button
                      onClick={() => openQueueReport(item, 'mobile')}
                      className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${
                        activeReport?.url === item.url && activeTab === 'mobile'
                          ? 'bg-purple-500 text-white'
                          : isDark ? 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                      }`}
                    >
                      Mobil
                    </button>
                  )}
                  {item.status === 'running' && !item.desktop_url && (
                    <span className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>analiz ediliyor...</span>
                  )}
                  {item.status === 'error' && (
                    <span className="text-[10px] text-red-400" title={item.error}>hata</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Uyari */}
          {loading && (
            <div className={`flex items-start gap-2 p-2.5 rounded-lg mt-2 ${isDark ? 'bg-amber-500/5 border border-amber-500/10' : 'bg-amber-50 border border-amber-100'}`}>
              <Info size={12} className="text-amber-500 shrink-0 mt-0.5" />
              <p className={`text-[10px] leading-relaxed ${isDark ? 'text-amber-400/80' : 'text-amber-700'}`}>
                Sonuclar emulator ortaminda olculdugu icin gercek deneyimden farkli olabilir. Puanlar her calismada %5-10 degisebilir.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && !loading && !activeReport && (
        <div className={`flex items-start gap-2.5 px-4 py-3 rounded-lg shrink-0 ${isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-100'}`}>
          <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
          <span className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>{error}</span>
        </div>
      )}

      {/* Rapor iframe */}
      {activeReport && !showHistory && (
        <div className="flex-1 rounded-xl overflow-hidden border border-slate-700/30">
          <iframe
            src={activeReport.report_url}
            className="w-full h-full border-0 bg-white"
            title={`Lighthouse ${activeTab} Raporu`}
          />
        </div>
      )}

      {/* Queue varken ama rapor secilmemisken - loading ekrani */}
      {showQueue && !activeReport && !showHistory && loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className={`text-center p-8 rounded-2xl ${isDark ? 'bg-slate-900/60 border border-slate-800/60' : 'bg-white border border-gray-200 shadow-lg'}`}>
            <div className={`relative inline-block p-5 rounded-2xl mb-4 ${
              currentStep.includes('desktop') ? (isDark ? 'bg-blue-500/10' : 'bg-blue-50') : (isDark ? 'bg-purple-500/10' : 'bg-purple-50')
            }`}>
              {currentStep.includes('desktop') ? (
                <Monitor size={36} className={`${isDark ? 'text-blue-400' : 'text-blue-500'} animate-pulse`} />
              ) : (
                <Smartphone size={36} className={`${isDark ? 'text-purple-400' : 'text-purple-500'} animate-pulse`} />
              )}
              <Loader2 size={14} className="absolute -bottom-1 -right-1 animate-spin text-blue-500" />
            </div>
            <p className={`text-xs mb-1 truncate max-w-[250px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{currentUrl.replace('https://', '')}</p>
            <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{statusMsg}</p>
          </div>
        </div>
      )}
    </div>
  )
}
