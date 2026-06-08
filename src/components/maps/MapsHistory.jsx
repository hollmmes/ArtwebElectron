import { useState, useEffect } from 'react'
import { Search, MapPin, Phone, Star, Globe, Trash2, Share2, Database, X, Download, Mail, Loader2 } from 'lucide-react'
import BusinessDetail from './BusinessDetail'
import { getCategories, getBusinesses, deleteBusiness, getExportUrl } from '../../utils/api'
import { useTheme } from '../../contexts/ThemeContext'

export default function MapsHistory() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [businesses, setBusinesses] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState(null)
  const [searchFilter, setSearchFilter] = useState('')

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    if (selectedCategory) {
      loadBusinesses(selectedCategory)
    }
  }, [selectedCategory])

  const loadCategories = async () => {
    try {
      const data = await getCategories()
      setCategories(data.categories || [])
    } catch {}
  }

  const loadBusinesses = async (cat) => {
    setLoading(true)
    try {
      const data = await getBusinesses({ query: cat.query, location: cat.location, limit: 500 })
      setBusinesses(data.businesses || [])
      setTotalCount(data.total || 0)
    } catch {
      setBusinesses([])
    }
    setLoading(false)
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    try {
      await deleteBusiness(id)
      setBusinesses((prev) => prev.filter((b) => b.id !== id))
      setTotalCount((prev) => prev - 1)
      loadCategories()
    } catch {}
  }


  const handleExport = (format) => {
    if (!selectedCategory) return
    const url = getExportUrl(format, selectedCategory.query, selectedCategory.location)
    window.open(url, '_blank')
  }

  const filteredBusinesses = searchFilter
    ? businesses.filter((b) =>
        b.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        b.address.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (b.phone || '').includes(searchFilter) ||
        (b.emails || []).some(e => e.includes(searchFilter.toLowerCase()))
      )
    : businesses

  const allBusinessesCount = categories.reduce((sum, c) => sum + c.count, 0)

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Gecmis Sonuclar</h1>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Kayitli isletmeleri goruntuleyin, email bulun, disari aktarin
          </p>
        </div>
        {selectedCategory && (
          <div className="flex items-center gap-2">
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
          </div>
        )}
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Sol Panel: Kategoriler */}
        <div className={`w-60 shrink-0 rounded-xl overflow-auto flex flex-col ${isDark ? 'bg-slate-900/40 border border-slate-800/60' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <div className={`p-3 border-b shrink-0 ${isDark ? 'border-slate-800/60' : 'border-gray-100'}`}>
            <p className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              <Database size={11} className="inline mr-1.5" />
              {allBusinessesCount} toplam kayit
            </p>
          </div>
          <div className="p-2 space-y-0.5 flex-1 overflow-auto">
            {categories.length === 0 && (
              <p className={`text-xs text-center py-8 ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                Henuz kayit yok
              </p>
            )}
            {categories.map((cat, i) => {
              const isActive = selectedCategory?.query === cat.query && selectedCategory?.location === cat.location
              return (
                <button
                  key={i}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150 ${
                    isActive
                      ? isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'
                      : isDark ? 'hover:bg-slate-800/60 border border-transparent' : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        isActive ? (isDark ? 'text-blue-400' : 'text-blue-600') : (isDark ? 'text-slate-300' : 'text-gray-700')
                      }`}>{cat.query}</p>
                      {cat.location && (
                        <p className={`text-[11px] truncate mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{cat.location}</p>
                      )}
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ml-2 ${
                      isActive ? (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600') : (isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500')
                    }`}>{cat.count}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Sag Panel */}
        <div className="flex-1 flex flex-col min-h-0">
          {!selectedCategory ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Database size={40} className={isDark ? 'text-slate-800 mx-auto' : 'text-gray-200 mx-auto'} />
                <p className={`text-sm mt-3 ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>Soldan bir kategori secin</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1">
                  <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {selectedCategory.query}
                    {selectedCategory.location && (
                      <span className={`ml-2 text-sm font-normal ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>- {selectedCategory.location}</span>
                    )}
                  </h2>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{totalCount} isletme</p>
                </div>
                <div className="relative w-52">
                  <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Filtrele..."
                    className={`w-full pl-8 pr-7 py-1.5 rounded-lg text-xs focus:outline-none transition-colors ${
                      isDark ? 'bg-slate-900/60 border border-slate-700/60 text-white placeholder-slate-500' : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400 shadow-sm'
                    }`}
                  />
                  {searchFilter && (
                    <button onClick={() => setSearchFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                      <X size={11} className={isDark ? 'text-slate-500' : 'text-gray-400'} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-auto space-y-1.5">
                {loading ? (
                  <div className={`flex items-center justify-center py-12 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    <Loader2 size={16} className="animate-spin mr-2" /> Yukleniyor...
                  </div>
                ) : filteredBusinesses.length === 0 ? (
                  <p className={`text-center py-12 text-sm ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                    {searchFilter ? 'Esleyen sonuc yok' : 'Kayit yok'}
                  </p>
                ) : (
                  filteredBusinesses.map((business) => (
                    <div
                      key={business.id}
                      onClick={() => setSelectedBusiness(business)}
                      className={`rounded-lg p-3.5 cursor-pointer transition-all duration-150 group ${
                        isDark
                          ? 'bg-slate-900/60 border border-slate-800/60 hover:border-slate-700/80 hover:bg-slate-800/40'
                          : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{business.name}</h3>
                            {business.category && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${isDark ? 'bg-slate-800 text-slate-500' : 'bg-gray-100 text-gray-400'}`}>{business.category}</span>
                            )}
                          </div>
                          {business.address && (
                            <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{business.address}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5">
                            {business.rating && (
                              <span className="flex items-center gap-1 text-amber-500 text-xs">
                                <Star size={11} fill="currentColor" />{business.rating}
                              </span>
                            )}
                            {business.phone && (
                              <span className={`flex items-center gap-1 text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                <Phone size={11} />{business.phone}
                              </span>
                            )}
                            {business.website && (
                              <span className="flex items-center gap-1 text-blue-500 text-xs">
                                <Globe size={11} />{business.website}
                              </span>
                            )}
                            {business.emails && business.emails.length > 0 && (
                              <span className="flex items-center gap-1 text-emerald-500 text-xs">
                                <Mail size={11} />{business.emails[0]}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDelete(e, business.id)}
                          className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-md transition-all shrink-0 ml-2 ${
                            isDark ? 'hover:bg-red-500/10 text-slate-600 hover:text-red-400' : 'hover:bg-red-50 text-gray-300 hover:text-red-500'
                          }`}
                          title="Sil"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
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
