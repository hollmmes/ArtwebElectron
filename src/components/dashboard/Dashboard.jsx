import { useState, useEffect } from 'react'
import { Plus, X, Loader2, ExternalLink, Search, AlertTriangle, CheckCircle, Info, Zap, Globe } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { defaultSites } from '../../data/sites'
import SiteDetail from './SiteDetail'

const API_BASE = 'http://localhost:42310'
const DEFAULT_URLS = new Set(defaultSites.map(s => s.url))

async function fetchCustomSites() {
  const res = await fetch(`${API_BASE}/api/seo/sites`)
  const data = await res.json()
  return data.sites || []
}

async function addCustomSiteAPI(url, name) {
  await fetch(`${API_BASE}/api/seo/sites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, name }),
  })
}

async function deleteCustomSiteAPI(id) {
  await fetch(`${API_BASE}/api/seo/sites/${id}`, { method: 'DELETE' })
}

export default function Dashboard() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [customSites, setCustomSites] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newName, setNewName] = useState('')
  const [selectedSite, setSelectedSite] = useState(null)
  const [scores, setScores] = useState({})

  useEffect(() => {
    const cachedScores = localStorage.getItem('dashboard_scores')
    if (cachedScores) {
      try { setScores(JSON.parse(cachedScores)) } catch {}
    }
    loadCustomSites()
  }, [])

  const loadCustomSites = async () => {
    try {
      const sites = await fetchCustomSites()
      setCustomSites(sites)
    } catch {}
  }

  const addCustomSite = async () => {
    if (!newUrl.trim()) return
    const url = newUrl.startsWith('http') ? newUrl : `https://${newUrl}`
    const name = newName.trim() || url.replace(/https?:\/\/(www\.)?/, '').split('/')[0]
    await addCustomSiteAPI(url, name)
    await loadCustomSites()
    setNewUrl('')
    setNewName('')
    setShowAddForm(false)
  }

  const removeCustomSite = async (e, siteId) => {
    e.stopPropagation()
    await deleteCustomSiteAPI(siteId)
    await loadCustomSites()
  }

  const handleSiteClick = (site) => {
    setSelectedSite({ ...site, isDefault: DEFAULT_URLS.has(site.url) })
  }

  const handleScoreUpdate = (url, score) => {
    const updated = { ...scores, [url]: score }
    setScores(updated)
    localStorage.setItem('dashboard_scores', JSON.stringify(updated))
  }

  const handleScreenshotUpdate = (url, dataUrl) => {
    const cached = JSON.parse(localStorage.getItem('dashboard_screenshots') || '{}')
    cached[url] = dataUrl
    localStorage.setItem('dashboard_screenshots', JSON.stringify(cached))
  }

  const getCachedScreenshot = (url) => {
    try {
      const cached = JSON.parse(localStorage.getItem('dashboard_screenshots') || '{}')
      return cached[url] || null
    } catch { return null }
  }

  if (selectedSite) {
    return <SiteDetail site={selectedSite} onBack={() => setSelectedSite(null)} onScoreUpdate={handleScoreUpdate} onScreenshotUpdate={handleScreenshotUpdate} />
  }

  return (
    <div className="h-full flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Site İzleme</h1>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Sitelerinizin SEO durumunu takip edin
          </p>
        </div>
        <div className={`text-xs px-3 py-1.5 rounded-lg ${isDark ? 'bg-slate-800/60 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
          {defaultSites.length + customSites.length} site
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5">
          {/* Default sites */}
          {defaultSites.map((site, i) => (
            <SiteCard key={`default-${i}`} site={site} isDark={isDark} score={scores[site.url]} screenshot={getCachedScreenshot(site.url)} onClick={() => handleSiteClick(site)} />
          ))}

          {/* Custom sites */}
          {customSites.map((site, i) => (
            <SiteCard key={`custom-${i}`} site={site} isDark={isDark} score={scores[site.url]} screenshot={getCachedScreenshot(site.url)} onClick={() => handleSiteClick(site)} onRemove={(e) => removeCustomSite(e, site.id)} />
          ))}

          {/* Add button */}
          {showAddForm ? (
            <div className={`rounded-xl p-4 flex flex-col gap-2 ${isDark ? 'bg-slate-900/60 border border-slate-800/60' : 'bg-white border border-gray-200 shadow-sm'}`}>
              <input
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://..."
                autoFocus
                className={`w-full px-3 py-2 rounded-lg text-xs focus:outline-none ${isDark ? 'bg-slate-800 border border-slate-700 text-white placeholder-slate-500' : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'}`}
                onKeyDown={(e) => e.key === 'Enter' && addCustomSite()}
              />
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Site adi (opsiyonel)"
                className={`w-full px-3 py-2 rounded-lg text-xs focus:outline-none ${isDark ? 'bg-slate-800 border border-slate-700 text-white placeholder-slate-500' : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'}`}
                onKeyDown={(e) => e.key === 'Enter' && addCustomSite()}
              />
              <div className="flex gap-2 mt-1">
                <button onClick={addCustomSite} className="flex-1 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium">Ekle</button>
                <button onClick={() => setShowAddForm(false)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>Iptal</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className={`rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 min-h-[140px] transition-colors ${
                isDark ? 'border-slate-800 text-slate-600 hover:border-slate-600 hover:text-slate-400' : 'border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600'
              }`}
            >
              <Plus size={24} />
              <span className="text-xs font-medium">Site Ekle</span>
            </button>
          )}
        </div>

        {/* AI entegrasyon alani - placeholder */}
        <div className={`mt-6 rounded-xl p-6 border-2 border-dashed text-center ${isDark ? 'border-slate-800/60 bg-slate-900/20' : 'border-gray-200 bg-gray-50/50'}`}>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-2 ${isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
            <Zap size={12} />
            Yakinda
          </div>
          <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>AI Rapor Analizi</p>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
            Yapay zeka raporlarinizi inceleyip ozetler ve iyilestirme onerileri sunacak
          </p>
        </div>
      </div>
    </div>
  )
}


function SiteCard({ site, isDark, score, screenshot, onClick, onRemove }) {
  const domain = site.url.replace(/https?:\/\/(www\.)?/, '').replace(/\/$/, '')
  const imgSrc = site.screenshot || screenshot

  return (
    <div
      onClick={onClick}
      className={`rounded-xl overflow-hidden cursor-pointer transition-all duration-150 group relative ${
        isDark
          ? 'bg-slate-900/60 border border-slate-800/60 hover:border-slate-700 hover:bg-slate-800/40'
          : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md shadow-sm'
      }`}
    >
      {/* Thumbnail */}
      <div className={`aspect-[4/3] flex items-center justify-center relative overflow-hidden ${isDark ? 'bg-slate-800/50' : 'bg-gray-100'}`}>
        {imgSrc ? (
          <img src={imgSrc} alt={site.name} className="w-full h-full object-cover object-top" />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Globe size={20} className={isDark ? 'text-slate-700' : 'text-gray-300'} />
            <span className={`text-[9px] ${isDark ? 'text-slate-700' : 'text-gray-300'}`}>Taramak icin tikla</span>
          </div>
        )}
        {score !== undefined && (
          <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${
            score >= 80 ? 'bg-emerald-500 text-white' : score >= 50 ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {score}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{site.name}</p>
        <p className={`text-[11px] truncate mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{domain}</p>
      </div>

      {/* Remove button for custom */}
      {onRemove && (
        <button
          onClick={onRemove}
          className={`absolute top-2 left-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'bg-slate-900/80 text-red-400 hover:text-red-300' : 'bg-white/80 text-red-500 hover:text-red-600'}`}
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}
