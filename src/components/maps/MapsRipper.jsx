import { useState, useMemo } from 'react'
import { Search, MapPin, Phone, Star, Globe, Loader2, ChevronDown, Hash, Share2 } from 'lucide-react'
import BusinessDetail from './BusinessDetail'
import { searchBusinessesStream } from '../../utils/api'
import { cities } from '../../data/cities'

const RESULT_OPTIONS = [5, 10, 15, 20, 30, 50]

export default function MapsRipper() {
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
        setStatusMessage(`${event.current}/${event.total} tamamlandı`)
      },
      onDone: () => {
        setLoading(false)
        setProgress(null)
        setStatusMessage('')
      },
      onError: (err) => {
        setError(err.message || 'Arama sırasında bir hata oluştu')
        setLoading(false)
        setProgress(null)
        setStatusMessage('')
      },
    })
  }

  const progressPercent = progress ? Math.round((progress.current / progress.total) * 100) : 0

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Başlık */}
      <div>
        <h1 className="text-2xl font-bold text-white">Google Maps Ripper</h1>
        <p className="text-white/50 text-sm mt-1">
          Anahtar kelime ile işletmeleri arayın ve bilgilerini çekin
        </p>
      </div>

      {/* Arama Formu */}
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Anahtar kelime (örn: restoran, kuaför, eczane...)"
              className="w-full pl-10 pr-4 py-3 glass rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary-500/50"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-8 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-medium transition-colors"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Ara'}
          </button>
        </div>

        <div className="flex gap-3">
          {/* Şehir Seçimi */}
          <div className="flex-1 relative">
            <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            <select
              value={selectedCity}
              onChange={handleCityChange}
              className="w-full pl-10 pr-8 py-3 glass rounded-xl text-sm text-white appearance-none focus:outline-none focus:border-primary-500/50 bg-transparent cursor-pointer"
            >
              <option value="" className="bg-dark-800 text-white">Şehir seçin...</option>
              {cityNames.map((city) => (
                <option key={city} value={city} className="bg-dark-800 text-white">
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* İlçe Seçimi */}
          <div className="flex-1 relative">
            <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              disabled={!selectedCity}
              className="w-full pl-10 pr-8 py-3 glass rounded-xl text-sm text-white appearance-none focus:outline-none focus:border-primary-500/50 bg-transparent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="" className="bg-dark-800 text-white">
                {selectedCity ? 'İlçe seçin...' : 'Önce şehir seçin'}
              </option>
              {districts.map((district) => (
                <option key={district} value={district} className="bg-dark-800 text-white">
                  {district}
                </option>
              ))}
            </select>
          </div>

          {/* Sonuç Sayısı */}
          <div className="w-32 relative">
            <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            <select
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              className="w-full pl-9 pr-8 py-3 glass rounded-xl text-sm text-white appearance-none focus:outline-none focus:border-primary-500/50 bg-transparent cursor-pointer"
            >
              {RESULT_OPTIONS.map((n) => (
                <option key={n} value={n} className="bg-dark-800 text-white">
                  {n} sonuç
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>

      {/* Progress Bar */}
      {loading && progress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">{statusMessage}</span>
            <span className="text-primary-400 font-medium">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Loading durumu - progress öncesi */}
      {loading && !progress && (
        <div className="flex items-center gap-3 px-4 py-3 glass rounded-xl">
          <Loader2 size={18} className="animate-spin text-primary-500" />
          <span className="text-white/60 text-sm">{statusMessage || 'Bağlanılıyor...'}</span>
        </div>
      )}

      {/* Hata */}
      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Sonuçlar */}
      <div className="flex-1 overflow-auto">
        {results.length > 0 && (
          <div className="grid gap-3">
            <p className="text-white/40 text-xs">
              {results.length} sonuç {loading && progress ? `/ ${progress.total}` : 'bulundu'}
            </p>
            {results.map((business, index) => (
              <div
                key={index}
                onClick={() => setSelectedBusiness(business)}
                className="glass glass-hover rounded-xl p-4 cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{business.name}</h3>
                    <p className="text-white/50 text-sm mt-1">{business.address}</p>
                    <div className="flex items-center gap-4 mt-2">
                      {business.rating && (
                        <span className="flex items-center gap-1 text-yellow-400 text-sm">
                          <Star size={14} fill="currentColor" />
                          {business.rating}
                        </span>
                      )}
                      {business.phone && (
                        <span className="flex items-center gap-1 text-white/40 text-sm">
                          <Phone size={14} />
                          {business.phone}
                        </span>
                      )}
                      {business.website && (
                        <span className="flex items-center gap-1 text-primary-400 text-sm">
                          <Globe size={14} />
                          Website
                        </span>
                      )}
                      {business.social_media && Object.keys(business.social_media).length > 0 && (
                        <span className="flex items-center gap-1 text-pink-400 text-sm">
                          <Share2 size={14} />
                          {Object.keys(business.social_media).length} sosyal
                        </span>
                      )}
                    </div>
                  </div>
                  {business.category && (
                    <span className="text-xs px-2 py-1 rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30">
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
              <MapPin size={48} className="text-white/10 mx-auto" />
              <p className="text-white/30 text-sm mt-3">
                Aramak istediğiniz işletme türünü yazın
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Detay Paneli */}
      {selectedBusiness && (
        <BusinessDetail
          business={selectedBusiness}
          onClose={() => setSelectedBusiness(null)}
        />
      )}
    </div>
  )
}
