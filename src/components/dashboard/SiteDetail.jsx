import { useState, useEffect } from 'react'
import { ArrowLeft, Loader2, CheckCircle, AlertTriangle, XCircle, Info, Globe, FileText, Bot, Map, Zap, ExternalLink, X } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

const API_BASE = 'http://localhost:8000'

export default function SiteDetail({ site, onBack, onScoreUpdate, onScreenshotUpdate }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [lighthouseUrl, setLighthouseUrl] = useState(null)
  const [lighthouseLoading, setLighthouseLoading] = useState(false)
  const [lighthouseStatus, setLighthouseStatus] = useState('')
  const [fileModal, setFileModal] = useState(null)

  const getCachedScreenshot = () => {
    try {
      const cached = JSON.parse(localStorage.getItem('dashboard_screenshots') || '{}')
      return cached[site.url] || null
    } catch { return null }
  }

  useEffect(() => {
    // Cache'den rapor var mi kontrol et
    const cached = localStorage.getItem(`seo_report_${site.url}`)
    if (cached) {
      try {
        setReport(JSON.parse(cached))
        return
      } catch {}
    }
    runAudit()
  }, [site.url])

  const runAudit = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/seo/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: site.url }),
      })
      const data = await res.json()

      // Default sitelerde puan kayir (+10-15 bonus)
      if (site.isDefault && data.score !== undefined) {
        const bonus = Math.min(15, Math.max(8, Math.round((100 - data.score) * 0.3)))
        data.score = Math.min(100, data.score + bonus)
      }

      setReport(data)
      // Cache'e kaydet (screenshot haric - cok buyuk)
      const toCache = { ...data }
      delete toCache.screenshot
      localStorage.setItem(`seo_report_${site.url}`, JSON.stringify(toCache))

      if (data.score !== undefined) {
        onScoreUpdate?.(site.url, data.score)
      }
      if (data.screenshot) {
        onScreenshotUpdate?.(site.url, data.screenshot)
      }
    } catch (err) {
      setError('SEO analizi yapilamadi')
    }
    setLoading(false)
  }

  const runLighthouse = async () => {
    setLighthouseLoading(true)
    setLighthouseStatus('Lighthouse baslatiliyor...')
    setLighthouseUrl(null)

    try {
      const response = await fetch(`${API_BASE}/api/lighthouse/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: [site.url] }),
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
            if (event.type === 'status') setLighthouseStatus(event.message)
            else if (event.type === 'report_ready' && event.device === 'desktop') {
              setLighthouseUrl(`${API_BASE}${event.report_url}`)
            }
            else if (event.type === 'done') setLighthouseLoading(false)
          } catch {}
        }
      }
    } catch {
      setLighthouseStatus('Hata olustu')
    }
    setLighthouseLoading(false)
  }

  const getScoreColor = (score) => {
    if (score >= 80) return isDark ? 'text-emerald-400' : 'text-emerald-600'
    if (score >= 50) return isDark ? 'text-amber-400' : 'text-amber-600'
    return isDark ? 'text-red-400' : 'text-red-600'
  }

  const getScoreBg = (score) => {
    if (score >= 80) return isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
    if (score >= 50) return isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'
    return isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3 shrink-0">
        <button onClick={onBack} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{site.name}</h1>
          <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{site.url}</p>
        </div>
        <a href={site.url} target="_blank" rel="noopener noreferrer" className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}>
          <ExternalLink size={16} />
        </a>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 size={24} className="animate-spin text-blue-500 mx-auto mb-3" />
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>SEO analizi yapiliyor...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className={`text-center p-6 rounded-xl ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
            <AlertTriangle size={24} className="text-red-500 mx-auto mb-2" />
            <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
          </div>
        </div>
      ) : report && (
        <div className="flex-1 overflow-auto space-y-4">
          {/* Screenshot + Score */}
          <div className="grid grid-cols-5 gap-4">
            {/* Screenshot - kareye yakin */}
            <div className={`col-span-3 rounded-xl overflow-hidden border aspect-video ${isDark ? 'border-slate-800/60' : 'border-gray-200'}`}>
              {report.screenshot || getCachedScreenshot() ? (
                <img src={report.screenshot || getCachedScreenshot()} alt={site.name} className="w-full h-full object-cover object-top" />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-slate-800/50' : 'bg-gray-100'}`}>
                  <Globe size={32} className={isDark ? 'text-slate-700' : 'text-gray-300'} />
                </div>
              )}
            </div>

            {/* Score + Tekrar Analiz */}
            <div className={`col-span-2 rounded-xl p-5 border flex flex-col items-center justify-center gap-3 ${getScoreBg(report.score)}`}>
              <span className={`text-5xl font-bold ${getScoreColor(report.score)}`}>{report.score}</span>
              <div className="text-center">
                <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>SEO Puani</span>
                <span className={`text-[10px] block ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>/ 100</span>
              </div>
              <button
                onClick={runAudit}
                disabled={loading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                  isDark ? 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700' : 'bg-white/80 text-gray-500 hover:text-gray-900 hover:bg-white'
                }`}
              >
                {loading ? <Loader2 size={11} className="animate-spin" /> : <ArrowLeft size={11} className="rotate-[225deg]" />}
                Tekrar Analiz
              </button>
            </div>
          </div>

          {/* Meta Info */}
          <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-900/40 border border-slate-800/60' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Meta Bilgileri</h3>
            <div className="space-y-2.5">
              <MetaRow label="Title" value={report.meta?.title} length={report.meta?.title_length} ideal="30-60" isDark={isDark} />
              <MetaRow label="Description" value={report.meta?.description} length={report.meta?.description_length} ideal="120-160" isDark={isDark} />
              <MetaRow label="H1" value={report.headings?.h1?.[0] || ''} isDark={isDark} />
              <MetaRow label="Canonical" value={report.meta?.canonical} isDark={isDark} />
              <MetaRow label="Lang" value={report.meta?.lang} isDark={isDark} />
              <MetaRow label="OG Title" value={report.meta?.og_title} isDark={isDark} />
              <MetaRow label="OG Image" value={report.meta?.og_image} isDark={isDark} />
            </div>
          </div>

          {/* Files - tiklanabilir */}
          <div className="grid grid-cols-3 gap-3">
            <FileCard title="robots.txt" data={report.robots_txt} icon={<Bot size={16} />} isDark={isDark} onClick={() => report.robots_txt?.exists && setFileModal({ title: 'robots.txt', content: report.robots_txt.content })} />
            <FileCard title="sitemap.xml" data={report.sitemap_xml} icon={<Map size={16} />} isDark={isDark} onClick={() => report.sitemap_xml?.exists && setFileModal({ title: 'sitemap.xml', content: report.sitemap_xml.content })} />
            <FileCard title="llms.txt" data={report.llms_txt} icon={<FileText size={16} />} isDark={isDark} onClick={() => report.llms_txt?.exists && setFileModal({ title: 'llms.txt', content: report.llms_txt.content })} />
          </div>

          {/* Issues */}
          {report.issues && report.issues.length > 0 && (
            <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-900/40 border border-slate-800/60' : 'bg-white border border-gray-200 shadow-sm'}`}>
              <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Sorunlar ({report.issues.length})</h3>
              <div className="space-y-1.5">
                {report.issues.map((issue, i) => (
                  <div key={i} className={`flex items-start gap-2.5 px-3 py-2 rounded-lg ${isDark ? 'bg-slate-800/30' : 'bg-gray-50'}`}>
                    {issue.type === 'error' && <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />}
                    {issue.type === 'warning' && <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />}
                    {issue.type === 'info' && <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />}
                    {issue.type === 'critical' && <XCircle size={14} className="text-red-600 shrink-0 mt-0.5" />}
                    <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{issue.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Passed */}
          {report.passed && report.passed.length > 0 && (
            <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-900/40 border border-slate-800/60' : 'bg-white border border-gray-200 shadow-sm'}`}>
              <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Gecen Kontroller ({report.passed.length})</h3>
              <div className="space-y-1.5">
                {report.passed.map((item, i) => (
                  <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${isDark ? 'bg-slate-800/30' : 'bg-gray-50'}`}>
                    <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                    <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lighthouse */}
          <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-900/40 border border-slate-800/60' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Lighthouse Raporu</h3>
              {!lighthouseUrl && (
                <button
                  onClick={runLighthouse}
                  disabled={lighthouseLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  {lighthouseLoading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                  {lighthouseLoading ? lighthouseStatus : 'Calistir'}
                </button>
              )}
            </div>
            {lighthouseUrl ? (
              <div className="rounded-lg overflow-hidden border border-slate-700/30 h-[400px]">
                <iframe src={lighthouseUrl} className="w-full h-full border-0 bg-white" title="Lighthouse" />
              </div>
            ) : !lighthouseLoading && (
              <p className={`text-xs ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                Detayli performans raporu icin Lighthouse'u calistirin
              </p>
            )}
          </div>

          {/* AI Placeholder */}
          <div className={`rounded-xl p-5 border-2 border-dashed text-center ${isDark ? 'border-slate-800/60 bg-slate-900/20' : 'border-gray-200 bg-gray-50/50'}`}>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-2 ${isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
              <Zap size={12} /> Insa Ediliyor
            </div>
            <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>AI Rapor Analizi</p>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
              Yapay zeka bu raporu okuyup detayli oneriler sunacak
            </p>
          </div>
        </div>
      )}

      {/* File viewer modal */}
      {fileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setFileModal(null)}>
          <div
            className={`rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col m-4 ${isDark ? 'bg-slate-900 border border-slate-700/60' : 'bg-white border border-gray-200 shadow-xl'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between p-4 border-b shrink-0 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
              <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{fileModal.title}</h3>
              <button onClick={() => setFileModal(null)} className={`p-1.5 rounded-md ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}>
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className={`text-xs font-mono whitespace-pre-wrap break-all leading-relaxed ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                {fileModal.content}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


function MetaRow({ label, value, length, ideal, isDark }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`text-[11px] w-20 shrink-0 font-medium pt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{label}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-xs break-all ${value ? (isDark ? 'text-slate-300' : 'text-gray-700') : (isDark ? 'text-red-400' : 'text-red-500')}`}>
          {value || '(eksik)'}
        </p>
        {length !== undefined && (
          <span className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
            {length} karakter {ideal && `(ideal: ${ideal})`}
          </span>
        )}
      </div>
    </div>
  )
}


function FileCard({ title, data, icon, isDark, onClick }) {
  const exists = data?.exists
  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-3 border transition-colors ${exists ? 'cursor-pointer' : ''} ${
        exists
          ? isDark ? 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10' : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
          : isDark ? 'bg-slate-900/40 border-slate-800/60' : 'bg-white border-gray-200 shadow-sm'
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className={exists ? 'text-emerald-500' : (isDark ? 'text-slate-600' : 'text-gray-400')}>{icon}</span>
        <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{title}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {exists ? (
          <>
            <CheckCircle size={12} className="text-emerald-500" />
            <span className="text-[10px] text-emerald-500">Tikla & Gor</span>
            {data.size && <span className={`text-[10px] ml-auto ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>{(data.size / 1024).toFixed(1)}KB</span>}
          </>
        ) : (
          <>
            <XCircle size={12} className={isDark ? 'text-slate-600' : 'text-gray-400'} />
            <span className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>Bulunamadi</span>
          </>
        )}
      </div>
    </div>
  )
}
