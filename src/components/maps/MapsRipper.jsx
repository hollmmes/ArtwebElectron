import { useState } from 'react'
import { Search, MapPin, Phone, Star, Globe, Loader2 } from 'lucide-react'
import BusinessDetail from './BusinessDetail'
import { searchBusinesses } from '../../utils/api'

export default function MapsRipper() {
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState(null)
  const [error, setError] = useState('')

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError('')
    setResults([])

    try {
      const data = await searchBusinesses(query, location)
      setResults(data)
    } catch (err) {
      setError(err.message || 'Arama sirasinda bir hata olustu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Google Maps Ripper</h1>
        <p className="text-white/50 text-sm mt-1">
          Anahtar kelime ile isletmeleri arayin ve bilgilerini cekin
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Anahtar kelime (orn: restoran, kuafor, eczane...)"
            className="w-full pl-10 pr-4 py-3 glass rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary-500/50"
          />
        </div>
        <div className="w-64 relative">
          <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Sehir / Bolge"
            className="w-full pl-10 pr-4 py-3 glass rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary-500/50"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-medium transition-colors"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Ara'}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 size={32} className="animate-spin text-primary-500 mx-auto" />
              <p className="text-white/50 text-sm mt-3">Isletmeler araniyor...</p>
            </div>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="grid gap-3">
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
                Aramak istediginiz isletme turunu yazin
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedBusiness && (
        <BusinessDetail
          business={selectedBusiness}
          onClose={() => setSelectedBusiness(null)}
        />
      )}
    </div>
  )
}
