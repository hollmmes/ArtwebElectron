import { useState, useEffect } from 'react'
import { AlertTriangle, Globe, Shield, Server, RefreshCw } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

import { API_BASE } from '../../config.js'

const CITIES = [
  { name: 'Giresun', lat: 40.9128, lon: 38.3895 },
  { name: 'İzmir',   lat: 38.4189, lon: 27.1287 },
]

const TR_DAYS  = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
const TR_MONTHS = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara']

const WMO_LABEL = {
  0:'Açık', 1:'Az bulutlu', 2:'Parçalı bulutlu', 3:'Kapalı',
  45:'Sisli', 48:'Sisli',
  51:'Çisenti', 53:'Çisenti', 55:'Yoğun çisenti',
  61:'Yağmurlu', 63:'Yağmurlu', 65:'Kuvvetli yağmur',
  71:'Karlı', 73:'Karlı', 75:'Yoğun kar',
  80:'Sağanak', 81:'Sağanak', 82:'Kuvvetli sağanak',
  95:'Fırtınalı', 96:'Fırtına', 99:'Fırtına',
}
const WMO_EMOJI = {
  0:'☀️', 1:'🌤', 2:'⛅', 3:'☁️',
  45:'🌫', 48:'🌫',
  51:'🌦', 53:'🌦', 55:'🌧',
  61:'🌧', 63:'🌧', 65:'🌧',
  71:'🌨', 73:'🌨', 75:'❄️',
  80:'🌦', 81:'🌧', 82:'⛈',
  95:'⛈', 96:'⛈', 99:'⛈',
}

function daysLeft(dateStr) {
  if (!dateStr) return null
  const parts = dateStr.split('.')
  if (parts.length !== 3) return null
  const d = new Date(parts[2], parts[1] - 1, parts[0])
  if (isNaN(d)) return null
  return Math.ceil((d - new Date()) / 86400000)
}

// ── Clock ──────────────────────────────────────────────────────────────────

function ClockWidget({ isDark }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const fmt = (opts) => new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', ...opts }).format(now)
  const timeStr = fmt({ hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  const dateStr = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className={`rounded-2xl p-6 flex flex-col justify-between ${isDark ? 'bg-slate-900/70 border border-slate-800/60' : 'bg-white border border-gray-200 shadow-sm'}`}>
      <div>
        <div className={`text-xs font-medium uppercase tracking-widest mb-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>İstanbul · GMT+3</div>
        <div className={`text-5xl font-bold tabular-nums tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{timeStr}</div>
        <div className={`text-sm mt-2 capitalize ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{dateStr}</div>
      </div>
      <div className={`mt-4 pt-4 border-t flex items-center gap-2 ${isDark ? 'border-slate-800/60' : 'border-gray-100'}`}>
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Türkiye Saati</span>
      </div>
    </div>
  )
}

// ── Weather ────────────────────────────────────────────────────────────────

function WeatherWidget({ city, isDark }) {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(false)
  const [lastFetch, setLastFetch] = useState(null)

  const load = () => {
    setLoading(true)
    setError(false)
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}` +
      `&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Europe%2FIstanbul&forecast_days=7`
    )
      .then(r => r.json())
      .then(d => { setData(d); setLastFetch(new Date()); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }

  useEffect(() => { load() }, [city.name])

  const today   = data?.daily
  const todayCode = today?.weathercode?.[0]
  const todayMax  = today?.temperature_2m_max?.[0]
  const todayMin  = today?.temperature_2m_min?.[0]

  return (
    <div className={`rounded-2xl p-5 flex flex-col ${isDark ? 'bg-slate-900/70 border border-slate-800/60' : 'bg-white border border-gray-200 shadow-sm'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className={`text-xs font-medium uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Hava Durumu</div>
          <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{city.name}</div>
        </div>
        <button onClick={load} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-600 hover:text-slate-300 hover:bg-slate-800' : 'text-gray-300 hover:text-gray-600 hover:bg-gray-100'}`}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && (
        <div className={`py-8 flex items-center justify-center text-sm ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>Yükleniyor…</div>
      )}
      {error && !loading && (
        <div className={`py-8 flex items-center justify-center text-sm ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>Veri alınamadı</div>
      )}

      {data && !loading && (
        <>
          {/* Today large */}
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl leading-none">{WMO_EMOJI[todayCode] ?? '🌡'}</span>
            <div>
              <div className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{Math.round(todayMax)}°</div>
              <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{WMO_LABEL[todayCode] ?? '—'}</div>
              <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>↓{Math.round(todayMin)}° · ↑{Math.round(todayMax)}°</div>
            </div>
          </div>

          {/* 7-day forecast */}
          <div className={`grid grid-cols-7 gap-1 pt-3 border-t ${isDark ? 'border-slate-800/60' : 'border-gray-100'}`}>
            {today.time.map((dateStr, i) => {
              const d    = new Date(dateStr)
              const day  = i === 0 ? 'Bug.' : TR_DAYS[d.getDay()]
              const code = today.weathercode[i]
              const max  = Math.round(today.temperature_2m_max[i])
              const min  = Math.round(today.temperature_2m_min[i])
              return (
                <div key={i} className={`flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-xl ${i === 0 ? (isDark ? 'bg-blue-500/10' : 'bg-blue-50') : ''}`}>
                  <span className={`text-[10px] font-semibold ${i === 0 ? (isDark ? 'text-blue-400' : 'text-blue-600') : (isDark ? 'text-slate-500' : 'text-gray-400')}`}>{day}</span>
                  <span className="text-base leading-tight">{WMO_EMOJI[code] ?? '🌡'}</span>
                  <span className={`text-[11px] font-bold ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{max}°</span>
                  <span className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>{min}°</span>
                </div>
              )
            })}
          </div>

          {lastFetch && (
            <div className={`mt-2 text-[10px] text-right ${isDark ? 'text-slate-700' : 'text-gray-300'}`}>
              {lastFetch.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Expiry Alerts ──────────────────────────────────────────────────────────

function ExpiryWidget({ isDark }) {
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch(`${API_BASE}/api/tracking/domains`).then(r => r.json()),
      fetch(`${API_BASE}/api/tracking/hostings`).then(r => r.json()),
      fetch(`${API_BASE}/api/tracking/ssls`).then(r => r.json()),
    ]).then(([dRes, hRes, sRes]) => {
      const all = [
        ...(dRes.domains  || []).map(r => ({ ...r, _type: 'Domain',  _icon: Globe })),
        ...(hRes.hostings || []).map(r => ({ ...r, _type: 'Hosting', _icon: Server })),
        ...(sRes.ssls     || []).map(r => ({ ...r, _type: 'SSL',     _icon: Shield })),
      ]
        .filter(r => r.status === 'Aktif')
        .map(r => ({ ...r, _days: daysLeft(r.renewal_date) }))
        .filter(r => r._days !== null && r._days <= 7)
        .sort((a, b) => a._days - b._days)
      setItems(all)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const urgColor = (days) => {
    if (days <= 0)  return isDark ? 'text-red-400'   : 'text-red-600'
    if (days <= 3)  return isDark ? 'text-red-400'   : 'text-red-500'
    return isDark ? 'text-amber-400' : 'text-amber-600'
  }
  const urgBg = (days) => {
    if (days <= 3) return isDark ? 'bg-red-500/8 border-red-500/20'     : 'bg-red-50 border-red-100'
    return isDark ? 'bg-amber-500/8 border-amber-500/20' : 'bg-amber-50 border-amber-100'
  }

  return (
    <div className={`rounded-2xl p-5 flex flex-col ${isDark ? 'bg-slate-900/70 border border-slate-800/60' : 'bg-white border border-gray-200 shadow-sm'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} className={items.length > 0 ? 'text-amber-500' : (isDark ? 'text-slate-600' : 'text-gray-300')} />
          <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Son 7 Gün İçinde Dolacaklar
          </span>
          {items.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>{items.length}</span>
          )}
        </div>
        <button onClick={load} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-600 hover:text-slate-300 hover:bg-slate-800' : 'text-gray-300 hover:text-gray-600 hover:bg-gray-100'}`}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && (
        <div className={`py-6 flex items-center justify-center text-sm ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>Yükleniyor…</div>
      )}

      {!loading && items.length === 0 && (
        <div className={`py-6 flex flex-col items-center justify-center gap-2 ${isDark ? 'text-slate-600' : 'text-gray-300'}`}>
          <div className="text-2xl">✅</div>
          <span className="text-sm">Acil yenileme gereken kayıt yok</span>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((r, i) => {
            const Icon = r._icon
            const daysText = r._days < 0
              ? `${Math.abs(r._days)} gün geçti`
              : r._days === 0 ? 'Bugün doluyor'
              : `${r._days} gün kaldı`
            return (
              <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${urgBg(r._days)}`}>
                <Icon size={14} className={urgColor(r._days)} />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                    {r.domain}
                  </div>
                  <div className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    {r._type}{r.product_name ? ` · ${r.product_name}` : ''} · {r.renewal_date}
                  </div>
                </div>
                <span className={`text-xs font-bold whitespace-nowrap ${urgColor(r._days)}`}>{daysText}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Stats Bar ──────────────────────────────────────────────────────────────

function StatsWidget({ isDark }) {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/tracking/domains`).then(r => r.json()),
      fetch(`${API_BASE}/api/tracking/hostings`).then(r => r.json()),
      fetch(`${API_BASE}/api/tracking/ssls`).then(r => r.json()),
    ]).then(([dRes, hRes, sRes]) => {
      const domains  = dRes.domains  || []
      const hostings = hRes.hostings || []
      const ssls     = sRes.ssls     || []
      setStats({
        domains:  domains.filter(r => r.status === 'Aktif').length,
        hostings: hostings.filter(r => r.status === 'Aktif').length,
        ssls:     ssls.filter(r => r.status === 'Aktif').length,
        expiring30: [...domains, ...hostings, ...ssls]
          .filter(r => r.status === 'Aktif')
          .map(r => daysLeft(r.renewal_date))
          .filter(d => d !== null && d <= 30).length,
      })
    }).catch(() => {})
  }, [])

  const CHIPS = stats ? [
    { label: 'Aktif Domain',  val: stats.domains,   color: 'blue'   },
    { label: 'Aktif Hosting', val: stats.hostings,  color: 'violet' },
    { label: 'Aktif SSL',     val: stats.ssls,       color: 'emerald'},
    { label: '30 gün içinde', val: stats.expiring30, color: stats.expiring30 > 0 ? 'amber' : 'slate' },
  ] : []

  const COLOR = {
    blue:    { dark: 'bg-blue-500/10 border-blue-500/20 text-blue-400',      light: 'bg-blue-50 border-blue-100 text-blue-600' },
    violet:  { dark: 'bg-violet-500/10 border-violet-500/20 text-violet-400', light: 'bg-violet-50 border-violet-100 text-violet-600' },
    emerald: { dark: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', light: 'bg-emerald-50 border-emerald-100 text-emerald-600' },
    amber:   { dark: 'bg-amber-500/10 border-amber-500/20 text-amber-400',   light: 'bg-amber-50 border-amber-100 text-amber-600' },
    slate:   { dark: 'bg-slate-800 border-slate-700 text-slate-400',          light: 'bg-gray-100 border-gray-200 text-gray-500' },
  }

  return (
    <div className={`rounded-2xl p-5 flex flex-col justify-between ${isDark ? 'bg-slate-900/70 border border-slate-800/60' : 'bg-white border border-gray-200 shadow-sm'}`}>
      <div className={`text-xs font-medium uppercase tracking-widest mb-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Genel Özet</div>
      {!stats && (
        <div className={`py-6 flex items-center justify-center text-sm ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>Yükleniyor…</div>
      )}
      {stats && (
        <div className="grid grid-cols-2 gap-2">
          {CHIPS.map(c => {
            const s = isDark ? COLOR[c.color].dark : COLOR[c.color].light
            const [bg, text] = [s.split(' ').slice(0, 2).join(' '), s.split(' ')[2]]
            return (
              <div key={c.label} className={`flex flex-col items-center justify-center rounded-xl border py-3 ${bg}`}>
                <span className={`text-2xl font-bold ${text}`}>{c.val}</span>
                <span className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{c.label}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function HomeDashboard() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Dashboard</h1>
        <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Genel durum ve özetler</p>
      </div>

      {/* Row 1: Clock + Stats */}
      <div className="grid grid-cols-2 gap-4">
        <ClockWidget isDark={isDark} />
        <StatsWidget isDark={isDark} />
      </div>

      {/* Row 2: Weather */}
      <div className="grid grid-cols-2 gap-4">
        {CITIES.map(c => <WeatherWidget key={c.name} city={c} isDark={isDark} />)}
      </div>

      {/* Row 3: Expiry alerts */}
      <div>
        <ExpiryWidget isDark={isDark} />
      </div>
    </div>
  )
}
