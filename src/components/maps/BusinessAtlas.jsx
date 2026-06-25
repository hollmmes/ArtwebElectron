import { useState, useEffect, useMemo, Suspense, lazy, useCallback } from 'react'
import { Map as MapIcon, Loader2, Search, X, MapPin, Phone, Star, Tag, RefreshCw, Filter, Wrench } from 'lucide-react'
import { getBusinessesGeo, backfillCoordinates } from '../../utils/api'
import { useTheme } from '../../contexts/ThemeContext'
import BusinessDetail from './BusinessDetail'
import { categoryColor } from './categoryColor'

const AtlasMap = lazy(() => import('./AtlasMap'))

// Kategori = category alanı doluysa o, değilse arama kelimesi (query)
function getCategory(b) {
  const c = (b.category || '').trim()
  if (c) return c
  const q = (b.query || '').trim()
  return q || 'Diğer'
}

// İşletmenin şehrini location ("Kadıköy, İstanbul") ya da address sonundan tahmin et
function getCity(b) {
  const loc = (b.location || '').trim()
  if (loc) {
    const parts = loc.split(',').map(p => p.trim()).filter(Boolean)
    if (parts.length) return parts[parts.length - 1]
  }
  return ''
}

export default function BusinessAtlas() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedCategories, setSelectedCategories] = useState([])
  const [selectedCities, setSelectedCities] = useState([])
  const [selectedBusiness, setSelectedBusiness] = useState(null)
  const [detailBusiness, setDetailBusiness] = useState(null)
  const [focusTarget, setFocusTarget] = useState(null)
  const [showFilters, setShowFilters] = useState(true)
  const [fixing, setFixing] = useState(false)
  const [fixMessage, setFixMessage] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getBusinessesGeo()
      setBusinesses(data.businesses || [])
    } catch (err) {
      setError(err.message || 'Veriler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const runBackfill = async () => {
    setFixing(true)
    setFixMessage('')
    try {
      const res = await backfillCoordinates()
      setFixMessage(`${res.updated}/${res.checked} kayıt güncellendi`)
      await loadData()
    } catch (err) {
      setFixMessage(err.message || 'Onarım başarısız')
    } finally {
      setFixing(false)
      setTimeout(() => setFixMessage(''), 4000)
    }
  }

  // Koordinatı olan kayıtlar — string olarak gelmiş olabilir, sayıya zorla
  const geoBusinesses = useMemo(
    () => businesses
      .map(b => {
        const lat = b.latitude == null ? null : Number(b.latitude)
        const lng = b.longitude == null ? null : Number(b.longitude)
        if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
        if (lat === 0 && lng === 0) return null
        return { ...b, latitude: lat, longitude: lng }
      })
      .filter(Boolean),
    [businesses]
  )

  // Kategori listesi (sayılı, çoktan aza)
  const categories = useMemo(() => {
    const map = new Map()
    for (const b of geoBusinesses) {
      const c = getCategory(b)
      map.set(c, (map.get(c) || 0) + 1)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [geoBusinesses])

  // Şehir listesi
  const cityList = useMemo(() => {
    const map = new Map()
    for (const b of geoBusinesses) {
      const c = getCity(b)
      if (!c) continue
      map.set(c, (map.get(c) || 0) + 1)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [geoBusinesses])

  // Filtrelenmiş işletmeler
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return geoBusinesses.filter(b => {
      if (selectedCategories.length && !selectedCategories.includes(getCategory(b))) return false
      if (selectedCities.length && !selectedCities.includes(getCity(b))) return false
      if (q) {
        const hay = `${b.name || ''} ${b.phone || ''} ${b.address || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [geoBusinesses, selectedCategories, selectedCities, search])

  const toggleCategory = (c) => {
    setSelectedCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }
  const toggleCity = (c) => {
    setSelectedCities(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }
  const clearFilters = () => {
    setSelectedCategories([])
    setSelectedCities([])
    setSearch('')
  }

  const handleListClick = (biz) => {
    setSelectedBusiness(biz)
    setFocusTarget({ ...biz, _ts: Date.now() })
  }

  const noCoordCount = businesses.length - geoBusinesses.length

  const panelCls = isDark ? 'bg-slate-900/40 border-slate-800/60' : 'bg-white border-gray-200 shadow-sm'
  const inputCls = isDark
    ? 'bg-slate-900/60 border border-slate-700/60 text-white placeholder-slate-500 focus:border-blue-500/50'
    : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500/50'

  return (
    <div className="h-full flex flex-col gap-3 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <MapIcon size={22} className="text-blue-500" /> Veri Haritası
          </h1>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Kayıtlı tüm işletmeler Türkiye haritası üzerinde, kategoriye göre
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isDark ? 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <Filter size={13} /> {showFilters ? 'Paneli Gizle' : 'Filtreler'}
          </button>
          <button onClick={runBackfill} disabled={fixing || loading}
            title="maps_url'den lat/lng'leri yeniden parse et"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${isDark ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}>
            <Wrench size={13} className={fixing ? 'animate-spin' : ''} /> Koordinatları Onar
          </button>
          <button onClick={loadData} disabled={loading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${isDark ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Yenile
          </button>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs ${isDark ? 'bg-slate-800/60 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
            {filtered.length} / {geoBusinesses.length} kayıt
          </div>
        </div>
      </div>

      {error && (
        <div className={`px-4 py-2.5 rounded-lg text-sm shrink-0 ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-100 text-red-600'}`}>
          {error}
        </div>
      )}

      {fixMessage && (
        <div className={`px-4 py-2 rounded-lg text-xs shrink-0 ${isDark ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-amber-50 border border-amber-100 text-amber-700'}`}>
          {fixMessage}
        </div>
      )}

      {/* Gövde: sol panel + harita */}
      <div className="flex-1 flex gap-3 min-h-0">

        {/* Sol filtre/liste paneli */}
        {showFilters && (
          <div className={`w-80 shrink-0 flex flex-col gap-3 min-h-0 rounded-xl border p-3 ${panelCls}`}>
            {/* Arama */}
            <div className="relative shrink-0">
              <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="İşletme adı, telefon, adres ara..."
                className={`w-full pl-9 pr-8 py-2 rounded-lg text-sm focus:outline-none transition-colors ${inputCls}`} />
              {search && (
                <button onClick={() => setSearch('')} className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}>
                  <X size={14} />
                </button>
              )}
            </div>

            {(selectedCategories.length > 0 || selectedCities.length > 0 || search) && (
              <button onClick={clearFilters}
                className={`shrink-0 text-xs self-start ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
                Filtreleri temizle
              </button>
            )}

            {/* Kaydırılabilir filtre + liste alanı */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1">
              {/* Kategoriler (lejant) */}
              {categories.length > 0 && (
                <div>
                  <div className={`flex items-center gap-1.5 text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    <Tag size={12} /> Kategoriler
                  </div>
                  <div className="space-y-0.5">
                    {categories.map(([cat, count]) => {
                      const active = selectedCategories.includes(cat)
                      return (
                        <button key={cat} onClick={() => toggleCategory(cat)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${active ? (isDark ? 'bg-blue-500/15 text-white' : 'bg-blue-50 text-gray-900') : (isDark ? 'text-slate-400 hover:bg-slate-800/60' : 'text-gray-600 hover:bg-gray-50')}`}>
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: categoryColor(cat) }} />
                          <span className="flex-1 text-left truncate">{cat}</span>
                          <span className={isDark ? 'text-slate-500' : 'text-gray-400'}>{count}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Şehirler */}
              {cityList.length > 0 && (
                <div>
                  <div className={`flex items-center gap-1.5 text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    <MapPin size={12} /> Şehirler
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {cityList.map(([city, count]) => {
                      const active = selectedCities.includes(city)
                      return (
                        <button key={city} onClick={() => toggleCity(city)}
                          className={`px-2 py-1 rounded-md text-xs transition-colors ${active ? 'bg-blue-600 text-white' : (isDark ? 'bg-slate-800/60 text-slate-400 hover:bg-slate-700/60' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}`}>
                          {city} <span className="opacity-60">{count}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Liste */}
              <div>
                <div className={`text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  İşletmeler ({filtered.length})
                </div>
                <div className="space-y-1">
                  {filtered.slice(0, 300).map((biz) => {
                    const active = selectedBusiness === biz
                    return (
                      <div key={biz.id}
                        onClick={() => handleListClick(biz)}
                        className={`px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${active ? (isDark ? 'bg-blue-500/15' : 'bg-blue-50') : (isDark ? 'hover:bg-slate-800/60' : 'hover:bg-gray-50')}`}>
                        <div className="flex items-start gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ background: categoryColor(getCategory(biz)) }} />
                          <div className="min-w-0 flex-1">
                            <div className={`text-xs font-medium truncate ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{biz.name}</div>
                            <div className={`text-[11px] truncate ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{getCategory(biz)}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {biz.rating && (
                                <span className="flex items-center gap-0.5 text-[10px] text-amber-500"><Star size={9} fill="currentColor" />{biz.rating}</span>
                              )}
                              {biz.phone && (
                                <span className={`flex items-center gap-0.5 text-[10px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}><Phone size={9} />{biz.phone}</span>
                              )}
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); setDetailBusiness(biz) }}
                            className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${isDark ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-gray-100 text-gray-500 hover:text-gray-700'}`}>
                            Detay
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  {filtered.length > 300 && (
                    <div className={`text-[11px] text-center py-2 ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                      İlk 300 gösteriliyor — haritada tümü mevcut
                    </div>
                  )}
                  {filtered.length === 0 && (
                    <div className={`text-xs text-center py-4 ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                      Sonuç yok
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Harita */}
        <div className={`flex-1 rounded-xl overflow-hidden border min-h-0 ${isDark ? 'border-slate-700/60' : 'border-gray-200 shadow-sm'}`}>
          {loading ? (
            <div className={`w-full h-full flex flex-col items-center justify-center gap-2 ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
              <Loader2 size={24} className="animate-spin text-blue-500" />
              <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>İşletmeler yükleniyor...</span>
            </div>
          ) : geoBusinesses.length === 0 ? (
            <div className={`w-full h-full flex flex-col items-center justify-center gap-2 ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
              <MapIcon size={32} className={isDark ? 'text-slate-700' : 'text-gray-300'} />
              <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Koordinatlı kayıt bulunamadı. Maps Ripper ile arama yapın.
              </span>
            </div>
          ) : (
            <Suspense fallback={
              <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
                <Loader2 size={24} className="animate-spin text-blue-500" />
              </div>
            }>
              <AtlasMap
                businesses={filtered}
                getCategory={getCategory}
                selectedBusiness={selectedBusiness}
                onSelectBusiness={setSelectedBusiness}
                focusTarget={focusTarget}
                isDark={isDark}
              />
            </Suspense>
          )}
        </div>
      </div>

      {noCoordCount > 0 && !loading && (
        <div className={`shrink-0 text-[11px] ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
          {noCoordCount} kaydın konum bilgisi yok, haritada gösterilemiyor.
        </div>
      )}

      {detailBusiness && (
        <BusinessDetail business={detailBusiness} onClose={() => setDetailBusiness(null)} />
      )}
    </div>
  )
}
