import { useState, useEffect, useMemo } from 'react'
import { Search, MapPin, Phone, Star, Globe, Loader2, ChevronDown, Hash, Share2, Download, Mail, Sparkles } from 'lucide-react'
import BusinessDetail from './BusinessDetail'
import { searchBusinessesStream, getBusinesses, getExportUrl } from '../../utils/api'
import { cities } from '../../data/cities'
import { useTheme } from '../../contexts/ThemeContext'

const RESULT_OPTIONS = [5, 10, 15, 20, 30, 50, 100]

export default function MapsRipper() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [query, setQuery] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [maxResults, setMaxResults] = useState(20)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState(null)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [savedCount, setSavedCount] = useState(0)

  const cityNames = useMemo(() => Object.keys(cities).sort(), [])
  const districts = useMemo(() => {
    if (!selectedCity) return []
    return cities[selectedCity] || []
  }, [selectedCity])

  useEffect(() => {
    loadSavedCount()
  }, [])

  const loadSavedCount = async () => {
    try {
      const data = await getBusinesses({ limit: 1 })
      setSavedCount(data.total || 0)
    } catch {}
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError('')
    setResults([])
    setProgress(null)
    setStatusMessage('')

    const location = [selectedDistrict, selectedCity].filter(Boolean).join(', ')

    await searchBusinessesStream(query, location, maxResults, {
      onStatus: (event) => setStatusMessage(event.message),
      onProgress: (event) => {
        setProgress({ current: event.current, total: event.total })
        setStatusMessage(event.message)
      },
      onResult: (event) => {
        setResults((prev) => [...prev, event.data])
        setProgress({ current: event.current, total: event.total })
        setStatusMessage(`${event.current}/${event.total} tamamlandi`)
      },
      onDone: () => {
        setLoading(false)
        setProgress(null)
        setStatusMessage('')
        loadSavedCount()
      },
      onError: (err) => {
        setError(err.message || 'Arama sirasinda bir hata olustu')
        setLoading(false)
        setProgress(null)
        setStatusMessage('')
      },
    })
  }

  const handleExport = (format) => {
    const location = [selectedDistrict, selectedCity].filter(Boolean).join(', ')
    const url = getExportUrl(format, query, location)
    window.open(url, '_blank')
  }

  const progressPercent = progress ? Math.round((progress.current / progress.total) * 100) : 0
  const newCount = results.filter(r => r.is_new).length

  const inputCls = isDark
    ? 'bg-slate-900/60 border border-slate-700/60 text-white placeholder-slate-500 focus:border-blue-500/50'
    : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500/50 shadow-sm'
  const selectOptionCls = isDark ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Maps Ripper</h1>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Isletme verilerini toplayin, analiz edin, disari aktarin
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedCount > 0 && (
            <>
              <button
                onClick={() => handleExport('csv')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isDark ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                }`}
              >
                <Download size={13} />
                CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isDark ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
              >
                <Download size={13} />
                JSON
              </button>
            </>
          )}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs ${isDark ? 'bg-slate-800/60 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
            {savedCount} kayit
          </div>
        </div>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className={`rounded-xl p-4 space-y-3 ${isDark ? 'bg-slate-900/40 border border-slate-800/60' : 'bg-white border border-gray-200 shadow-sm'}`}>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Anahtar kelime (orn: restoran, kuafor, eczane, avukat...)"
              className={`w-full pl-9 pr-4 py-2.5 rounded-lg text-sm focus:outline-none transition-colors ${inputCls}`}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {loading ? 'Araniyor...' : 'Ara'}
          </button>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <MapPin size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
            <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
            <select
              value={selectedCity}
              onChange={(e) => { setSelectedCity(e.target.value); setSelectedDistrict('') }}
              className={`w-full pl-9 pr-8 py-2.5 rounded-lg text-sm appearance-none focus:outline-none cursor-pointer transition-colors ${inputCls}`}
            >
              <option value="" className={selectOptionCls}>Sehir secin...</option>
              {cityNames.map((city) => (
                <option key={city} value={city} className={selectOptionCls}>{city}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 relative">
            <MapPin size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
            <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              disabled={!selectedCity}
              className={`w-full pl-9 pr-8 py-2.5 rounded-lg text-sm appearance-none focus:outline-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${inputCls}`}
            >
              <option value="" className={selectOptionCls}>
                {selectedCity ? 'Ilce secin...' : 'Once sehir secin'}
              </option>
              {districts.map((district) => (
                <option key={district} value={district} className={selectOptionCls}>{district}</option>
              ))}
            </select>
          </div>

          <div className="w-36 relative">
            <Hash size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
            <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
            <select
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              className={`w-full pl-8 pr-8 py-2.5 rounded-lg text-sm appearance-none focus:outline-none cursor-pointer transition-colors ${inputCls}`}
            >
              {RESULT_OPTIONS.map((n) => (
                <option key={n} value={n} className={selectOptionCls}>{n} sonuc</option>
              ))}
            </select>
          </div>
        </div>
      </form>

      {/* Progress */}
      {loading && progress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>{statusMessage}</span>
            <span className="text-blue-500 font-medium">{progressPercent}%</span>
          </div>
          <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`}>
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {loading && !progress && (
        <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg ${isDark ? 'bg-slate-900/60 border border-slate-800/60' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <Loader2 size={15} className="animate-spin text-blue-500" />
          <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{statusMessage || 'Baglaniliyor...'}</span>
        </div>
      )}

      {error && (
        <div className={`px-4 py-2.5 rounded-lg text-sm ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-100 text-red-600'}`}>
          {error}
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-auto">
        {results.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                {results.length} sonuc {loading && progress ? `/ ${progress.total}` : 'bulundu'}
              </p>
              {newCount > 0 && !loading && (
                <p className="text-xs text-emerald-500 flex items-center gap-1">
                  <Sparkles size={12} />
                  {newCount} yeni kayit
                </p>
              )}
            </div>
            {results.map((business, index) => (
              <div
                key={index}
                onClick={() => setSelectedBusiness(business)}
                className={`rounded-lg p-3.5 cursor-pointer transition-all duration-150 ${
                  isDark
                    ? 'bg-slate-900/60 border border-slate-800/60 hover:border-slate-700/80 hover:bg-slate-800/40'
                    : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{business.name}</h3>
                      {business.is_new && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium shrink-0">YENi</span>
                      )}
                      {business.is_new === false && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${isDark ? 'bg-slate-700/50 text-slate-500' : 'bg-gray-100 text-gray-400'}`}>KAYITLI</span>
                      )}
                    </div>
                    {business.address && (
                      <p className={`text-xs mt-1 truncate ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{business.address}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      {business.rating && (
                        <span className="flex items-center gap-1 text-amber-500 text-xs">
                          <Star size={11} fill="currentColor" />
                          {business.rating}
                        </span>
                      )}
                      {business.phone && (
                        <span className={`flex items-center gap-1 text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                          <Phone size={11} />
                          {business.phone}
                        </span>
                      )}
                      {business.website && (
                        <span className="flex items-center gap-1 text-blue-500 text-xs">
                          <Globe size={11} />
                          {business.website}
                        </span>
                      )}
                      {business.emails && business.emails.length > 0 && (
                        <span className="flex items-center gap-1 text-emerald-500 text-xs">
                          <Mail size={11} />
                          {business.emails[0]}
                        </span>
                      )}
                      {business.social_media && Object.keys(business.social_media).length > 0 && (
                        <span className="flex items-center gap-1 text-pink-500 text-xs">
                          <Share2 size={11} />
                          {Object.keys(business.social_media).length}
                        </span>
                      )}
                    </div>
                  </div>
                  {business.category && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-md shrink-0 ml-2 ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
                      {business.category}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && results.length === 0 && !error && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Search size={40} className={isDark ? 'text-slate-800 mx-auto' : 'text-gray-200 mx-auto'} />
              <p className={`text-sm mt-3 ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                Arama yapin, isletme verilerini toplayin
              </p>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-700' : 'text-gray-300'}`}>
                Sonuclar otomatik kaydedilir
              </p>
            </div>
          </div>
        )}
      </div>

      {selectedBusiness && (
        <BusinessDetail
          business={selectedBusiness}
          onClose={() => setSelectedBusiness(null)}
        />
      )}
    </div>
  )
}
