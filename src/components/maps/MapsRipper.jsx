import { useState, useMemo } from 'react'
import { Search, MapPin, Phone, Star, Globe, Loader2, ChevronDown, Hash, Share2 } from 'lucide-react'
import BusinessDetail from './BusinessDetail'
import { searchBusinessesStream } from '../../utils/api'
import { cities } from '../../data/cities'
import { useTheme } from '../../contexts/ThemeContext'

const RESULT_OPTIONS = [5, 10, 15, 20, 30, 50]

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

  const cityNames = useMemo(() => Object.keys(cities).sort(), [])
  const districts = useMemo(() => {
    if (!selectedCity) return []
    return cities[selectedCity] || []
  }, [selectedCity])

  const handleCityChange = (e) => {
    setSelectedCity(e.target.value)
    setSelectedDistrict('')
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
      onStatus: (event) => {
        setStatusMessage(event.message)
      },
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
      },
      onError: (err) => {
        setError(err.message || 'Arama sirasinda bir hata olustu')
        setLoading(false)
        setProgress(null)
        setStatusMessage('')
      },
    })
  }

  const progressPercent = progress ? Math.round((progress.current / progress.total) * 100) : 0

  const inputCls = isDark
    ? 'bg-slate-900/60 border border-slate-700/60 text-white placeholder-slate-500 focus:border-blue-500/50'
    : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500/50 shadow-sm'

  const selectOptionCls = isDark ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'

  return (
    <div className="h-full flex flex-col gap-5">
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Google Maps Ripper</h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Anahtar kelime ile isletmeleri arayin ve bilgilerini cekin
        </p>
      </div>

      <form onSubmit={handleSearch} className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Anahtar kelime (orn: restoran, kuafor, eczane...)"
              className={`w-full pl-9 pr-4 py-2.5 rounded-lg text-sm focus:outline-none transition-colors ${inputCls}`}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Ara'}
          </button>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <MapPin size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
            <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
            <select
              value={selectedCity}
              onChange={handleCityChange}
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

          <div className="w-32 relative">
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

      {loading && progress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>{statusMessage}</span>
            <span className="text-blue-500 font-medium">{progressPercent}%</span>
          </div>
          <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`}>
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
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

      <div className="flex-1 overflow-auto">
        {results.length > 0 && (
          <div className="grid gap-2.5">
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              {results.length} sonuc {loading && progress ? `/ ${progress.total}` : 'bulundu'}
            </p>
            {results.map((business, index) => (
              <div
                key={index}
                onClick={() => setSelectedBusiness(business)}
                className={`rounded-lg p-4 cursor-pointer transition-all duration-150 ${
                  isDark
                    ? 'bg-slate-900/60 border border-slate-800/60 hover:border-slate-700/80 hover:bg-slate-800/40'
                    : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{business.name}</h3>
                    <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{business.address}</p>
                    <div className="flex items-center gap-3 mt-2">
                      {business.rating && (
                        <span className="flex items-center gap-1 text-amber-500 text-xs">
                          <Star size={12} fill="currentColor" />
                          {business.rating}
                        </span>
                      )}
                      {business.phone && (
                        <span className={`flex items-center gap-1 text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                          <Phone size={12} />
                          {business.phone}
                        </span>
                      )}
                      {business.website && (
                        <span className="flex items-center gap-1 text-blue-500 text-xs">
                          <Globe size={12} />
                          Website
                        </span>
                      )}
                      {business.social_media && Object.keys(business.social_media).length > 0 && (
                        <span className="flex items-center gap-1 text-pink-500 text-xs">
                          <Share2 size={12} />
                          {Object.keys(business.social_media).length} sosyal
                        </span>
                      )}
                    </div>
                  </div>
                  {business.category && (
                    <span className={`text-xs px-2 py-0.5 rounded-md ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
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
              <MapPin size={40} className={isDark ? 'text-slate-800 mx-auto' : 'text-gray-200 mx-auto'} />
              <p className={`text-sm mt-3 ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                Aramak istediginiz isletme turunu yazin
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
