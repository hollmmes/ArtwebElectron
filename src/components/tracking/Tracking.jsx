import { useState, useEffect, useMemo } from 'react'
import { Globe, Shield, Server, Search, Plus, Trash2, Edit2, X, Check, ChevronUp, ChevronDown, AlertTriangle, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

const API_BASE = 'http://localhost:42310'

const STATUS_CFG = {
  'Aktif':         { color: 'emerald', label: 'Aktif' },
  'Süresi Doldu':  { color: 'red',     label: 'Süresi Doldu' },
  'İptal':         { color: 'slate',   label: 'İptal' },
  'Bekliyor':      { color: 'amber',   label: 'Bekliyor' },
  'Transfer Edildi':{ color: 'blue',  label: 'Transfer Edildi' },
}

const ALL_STATUSES = Object.keys(STATUS_CFG)

function daysLeft(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr.split('.').reverse().join('-'))
  if (isNaN(d)) return null
  return Math.ceil((d - new Date()) / 86400000)
}

function urgencyColor(days, status, isDark) {
  if (status !== 'Aktif') return isDark ? 'text-slate-600' : 'text-gray-300'
  if (days === null) return ''
  if (days <= 7)  return 'text-red-500'
  if (days <= 30) return 'text-amber-500'
  if (days <= 90) return 'text-yellow-500'
  return isDark ? 'text-emerald-400' : 'text-emerald-600'
}

function urgencyBg(days, status, isDark) {
  if (status !== 'Aktif') return isDark ? 'bg-slate-800/40 border-slate-800/40' : 'bg-gray-50 border-gray-100'
  if (days === null) return ''
  if (days <= 7)  return isDark ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-100'
  if (days <= 30) return isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-100'
  if (days <= 90) return isDark ? 'bg-yellow-500/5 border-yellow-500/15' : 'bg-yellow-50 border-yellow-100'
  return isDark ? 'bg-slate-900/60 border-slate-800/60' : 'bg-white border-gray-200'
}

function StatusBadge({ status, isDark }) {
  const cfg = STATUS_CFG[status] || { color: 'slate', label: status }
  const map = {
    emerald: isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700',
    red:     isDark ? 'bg-red-500/10 text-red-400'     : 'bg-red-50 text-red-700',
    slate:   isDark ? 'bg-slate-800 text-slate-500'    : 'bg-gray-100 text-gray-500',
    amber:   isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700',
    blue:    isDark ? 'bg-blue-500/10 text-blue-400'   : 'bg-blue-50 text-blue-700',
  }
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${map[cfg.color]}`}>
      {cfg.label}
    </span>
  )
}

function DaysChip({ days, status, isDark }) {
  if (status !== 'Aktif') return null
  if (days === null) return null
  const cls = urgencyColor(days, status, isDark)
  const text = days < 0 ? `${Math.abs(days)} gün geçmiş` : days === 0 ? 'Bugün' : `${days} gün kaldı`
  return <span className={`text-[11px] font-semibold ${cls}`}>{text}</span>
}

// ── Inline edit row ────────────────────────────────────────────────────────

function EditRow({ row, type, isDark, onSave, onCancel }) {
  const [form, setForm] = useState({ ...row })
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const inp = `text-xs px-2 py-1 rounded focus:outline-none w-full ${isDark ? 'bg-slate-800 border border-slate-700 text-white' : 'bg-gray-50 border border-gray-200 text-gray-900'}`

  return (
    <tr className={isDark ? 'bg-blue-500/5' : 'bg-blue-50/50'}>
      {type !== 'domain' && (
        <td className="px-3 py-2"><input className={inp} value={form.product_name || ''} onChange={f('product_name')} placeholder="Ürün adı" /></td>
      )}
      <td className="px-3 py-2"><input className={inp} value={form.domain || ''} onChange={f('domain')} placeholder="domain.com" /></td>
      <td className="px-3 py-2"><input className={inp} value={form.renewal_date || ''} onChange={f('renewal_date')} placeholder="DD.MM.YYYY" /></td>
      <td className="px-3 py-2"><input className={inp} value={form.amount || ''} onChange={f('amount')} placeholder="0.00$" /></td>
      <td className="px-3 py-2">
        <select value={form.status} onChange={f('status')} className={`${inp} cursor-pointer`}>
          {ALL_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </td>
      <td className="px-3 py-2"><input className={inp} value={form.notes || ''} onChange={f('notes')} placeholder="Not…" /></td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <button onClick={() => onSave(form)} className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"><Check size={12} /></button>
          <button onClick={onCancel} className={`p-1 rounded ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-500'}`}><X size={12} /></button>
        </div>
      </td>
    </tr>
  )
}

// ── Generic table ──────────────────────────────────────────────────────────

function TrackingTable({ type, rows, isDark, onAdd, onEdit, onDelete, loading }) {
  const [editId, setEditId] = useState(null)
  const [addRow, setAddRow] = useState(false)
  const [sort, setSort] = useState({ key: 'renewal_date', dir: 'asc' })

  const emptyNew = type === 'domain'
    ? { domain: '', renewal_date: '', amount: '', status: 'Aktif', notes: '' }
    : { product_name: '', domain: '', renewal_date: '', amount: '', status: 'Aktif', notes: '' }

  const sorted = useMemo(() => {
    const arr = [...rows]
    arr.sort((a, b) => {
      let av = a[sort.key] || '', bv = b[sort.key] || ''
      if (sort.key === 'renewal_date') {
        const toDate = s => new Date(s.split('.').reverse().join('-'))
        av = toDate(av); bv = toDate(bv)
      }
      if (av < bv) return sort.dir === 'asc' ? -1 : 1
      if (av > bv) return sort.dir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [rows, sort])

  const toggleSort = (key) => setSort(p => ({ key, dir: p.key === key && p.dir === 'asc' ? 'desc' : 'asc' }))

  const SortIcon = ({ k }) => sort.key === k
    ? (sort.dir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
    : <ChevronUp size={11} className="opacity-20" />

  const thCls = `px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide cursor-pointer select-none ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-700'}`

  const handleSave = async (form) => {
    await onEdit(form)
    setEditId(null)
  }

  const handleAdd = async (form) => {
    await onAdd(form)
    setAddRow(false)
  }

  return (
    <div className={`rounded-xl overflow-hidden border ${isDark ? 'border-slate-800/60' : 'border-gray-200 shadow-sm'}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={isDark ? 'bg-slate-900/80' : 'bg-gray-50'}>
            <tr>
              {type !== 'domain' && <th className={thCls}>Ürün</th>}
              <th className={thCls} onClick={() => toggleSort('domain')}><span className="flex items-center gap-1">Domain <SortIcon k="domain" /></span></th>
              <th className={thCls} onClick={() => toggleSort('renewal_date')}><span className="flex items-center gap-1">Yenileme <SortIcon k="renewal_date" /></span></th>
              <th className={thCls}>Tutar</th>
              <th className={thCls} onClick={() => toggleSort('status')}><span className="flex items-center gap-1">Durum <SortIcon k="status" /></span></th>
              <th className={thCls}>Kalan</th>
              <th className={thCls}>Not</th>
              <th className="px-3 py-2.5 w-16">
                <button
                  onClick={() => setAddRow(true)}
                  className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-md font-medium transition-colors ${isDark ? 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900'}`}
                >
                  <Plus size={11} /> Ekle
                </button>
              </th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-gray-100'}`}>
            {addRow && (
              <EditRow row={emptyNew} type={type} isDark={isDark} onSave={handleAdd} onCancel={() => setAddRow(false)} />
            )}
            {loading && (
              <tr><td colSpan={9} className={`px-3 py-8 text-center text-sm ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>Yükleniyor…</td></tr>
            )}
            {!loading && sorted.length === 0 && !addRow && (
              <tr><td colSpan={9} className={`px-3 py-8 text-center text-sm ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>Kayıt yok</td></tr>
            )}
            {sorted.map((row) => {
              const days = daysLeft(row.renewal_date)
              if (editId === row.id) {
                return <EditRow key={row.id} row={row} type={type} isDark={isDark} onSave={handleSave} onCancel={() => setEditId(null)} />
              }
              return (
                <tr
                  key={row.id}
                  className={`group transition-colors ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-gray-50'} ${row.status !== 'Aktif' ? (isDark ? 'opacity-50' : 'opacity-60') : ''}`}
                >
                  {type !== 'domain' && (
                    <td className={`px-3 py-2.5 text-xs max-w-[160px] truncate ${isDark ? 'text-slate-400' : 'text-gray-600'}`} title={row.product_name}>{row.product_name}</td>
                  )}
                  <td className={`px-3 py-2.5 text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>{row.domain}</td>
                  <td className={`px-3 py-2.5 text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{row.renewal_date}</td>
                  <td className={`px-3 py-2.5 text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{row.amount || '—'}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={row.status} isDark={isDark} /></td>
                  <td className="px-3 py-2.5"><DaysChip days={days} status={row.status} isDark={isDark} /></td>
                  <td className={`px-3 py-2.5 text-xs max-w-[120px] truncate ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>{row.notes || ''}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditId(row.id)} className={`p-1 rounded ${isDark ? 'text-slate-500 hover:text-blue-400' : 'text-gray-400 hover:text-blue-600'}`}><Edit2 size={12} /></button>
                      <button onClick={() => onDelete(row.id)} className={`p-1 rounded ${isDark ? 'text-slate-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Summary chips ──────────────────────────────────────────────────────────

function SummaryBar({ domains, hostings, ssls, isDark }) {
  const allActive = [...domains, ...hostings, ...ssls].filter(r => r.status === 'Aktif')
  const expiring7  = allActive.filter(r => { const d = daysLeft(r.renewal_date); return d !== null && d <= 7 }).length
  const expiring30 = allActive.filter(r => { const d = daysLeft(r.renewal_date); return d !== null && d > 7 && d <= 30 }).length
  const totalAmount = [...hostings, ...ssls]
    .filter(r => r.status === 'Aktif' && r.amount)
    .reduce((s, r) => s + parseFloat(r.amount.replace(/[^0-9.]/g, '') || '0'), 0)

  const CHIP_STYLES = {
    blue:   { dark: 'bg-blue-500/10 border-blue-500/20 text-blue-400',   light: 'bg-blue-50 border-blue-100 text-blue-600' },
    violet: { dark: 'bg-violet-500/10 border-violet-500/20 text-violet-400', light: 'bg-violet-50 border-violet-100 text-violet-600' },
    emerald:{ dark: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', light: 'bg-emerald-50 border-emerald-100 text-emerald-600' },
    red:    { dark: 'bg-red-500/10 border-red-500/20 text-red-400',       light: 'bg-red-50 border-red-100 text-red-600' },
    amber:  { dark: 'bg-amber-500/10 border-amber-500/20 text-amber-400', light: 'bg-amber-50 border-amber-100 text-amber-600' },
    slate:  { dark: 'bg-slate-800 border-slate-700 text-slate-300',       light: 'bg-gray-100 border-gray-200 text-gray-600' },
  }

  const chip = (label, val, color) => {
    const s = CHIP_STYLES[color]
    const [bgBorder, textCls] = isDark
      ? [s.dark.split(' ').slice(0,2).join(' '), s.dark.split(' ')[2]]
      : [s.light.split(' ').slice(0,2).join(' '), s.light.split(' ')[2]]
    return (
      <div className={`flex flex-col items-center px-5 py-3 rounded-xl border ${bgBorder}`}>
        <span className={`text-xl font-bold ${textCls}`}>{val}</span>
        <span className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{label}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-3">
      {chip('Aktif Domain', domains.filter(r => r.status === 'Aktif').length, 'blue')}
      {chip('Aktif Hosting', hostings.filter(r => r.status === 'Aktif').length, 'violet')}
      {chip('Aktif SSL', ssls.filter(r => r.status === 'Aktif').length, 'emerald')}
      {expiring7 > 0 && chip('7 gün içinde', expiring7, 'red')}
      {expiring30 > 0 && chip('30 gün içinde', expiring30, 'amber')}
      {totalAmount > 0 && chip('Aktif hizmet tutarı', `$${totalAmount.toFixed(2)}`, 'slate')}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'domains',  label: 'Domainler', icon: Globe },
  { id: 'hostings', label: 'Hosting',   icon: Server },
  { id: 'ssls',     label: 'SSL',       icon: Shield },
]

export default function Tracking() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [activeTab, setActiveTab] = useState('domains')
  const [domains,  setDomains]  = useState([])
  const [hostings, setHostings] = useState([])
  const [ssls,     setSsls]     = useState([])
  const [loading,  setLoading]  = useState(false)
  const [search,   setSearch]   = useState('')
  const [statusFilter, setStatusFilter] = useState('Tümü')
  const load = async (checkSeed = false) => {
    setLoading(true)
    try {
      const [dRes, hRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/api/tracking/domains`).then(r => r.json()),
        fetch(`${API_BASE}/api/tracking/hostings`).then(r => r.json()),
        fetch(`${API_BASE}/api/tracking/ssls`).then(r => r.json()),
      ])
      const d = dRes.domains || [], h = hRes.hostings || [], s = sRes.ssls || []
      setDomains(d)
      setHostings(h)
      setSsls(s)
      if (checkSeed && d.length === 0 && h.length === 0 && s.length === 0 && !localStorage.getItem('tracking_seeded')) {
        localStorage.setItem('tracking_seeded', '1')
        await seedInitialData()
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(true) }, [])

  const seedInitialData = async () => {
    const domainRows = [
      {domain:"mrcalvano.com",renewal_date:"23.09.1999",amount:"",status:"İptal",notes:""},
      {domain:"mrcalvano.com",renewal_date:"09.10.1999",amount:"",status:"İptal",notes:""},
      {domain:"poepoetika.com",renewal_date:"09.12.1999",amount:"",status:"İptal",notes:""},
      {domain:"ortizkaravan.com",renewal_date:"14.12.1999",amount:"",status:"İptal",notes:""},
      {domain:"duruenginarevi.com",renewal_date:"24.04.2017",amount:"",status:"İptal",notes:""},
      {domain:"tabucreative.net",renewal_date:"15.06.2017",amount:"",status:"İptal",notes:""},
      {domain:"ebrukuafor.com",renewal_date:"05.08.2017",amount:"",status:"İptal",notes:""},
      {domain:"ozkanholding.com",renewal_date:"27.09.2017",amount:"",status:"İptal",notes:""},
      {domain:"eliz-a.com",renewal_date:"20.03.2018",amount:"",status:"İptal",notes:""},
      {domain:"rustikvize.com",renewal_date:"08.05.2018",amount:"",status:"İptal",notes:""},
      {domain:"merkimboya.com.tr",renewal_date:"09.07.2018",amount:"",status:"İptal",notes:""},
      {domain:"toptanayakkabiizmir.net",renewal_date:"16.08.2018",amount:"",status:"İptal",notes:""},
      {domain:"cavusinsaatyapi.com",renewal_date:"25.08.2018",amount:"",status:"İptal",notes:""},
      {domain:"bedenindili.net",renewal_date:"30.08.2018",amount:"",status:"İptal",notes:""},
      {domain:"gulsennasil.com",renewal_date:"30.08.2018",amount:"",status:"İptal",notes:""},
      {domain:"merkimboya.com",renewal_date:"29.09.2018",amount:"",status:"İptal",notes:""},
      {domain:"merkimboya.net",renewal_date:"29.09.2018",amount:"",status:"İptal",notes:""},
      {domain:"toddlertown.com.tr",renewal_date:"13.10.2018",amount:"",status:"İptal",notes:""},
      {domain:"alteraluminyum.com",renewal_date:"20.10.2018",amount:"",status:"İptal",notes:""},
      {domain:"kaymazbeton.com",renewal_date:"18.11.2018",amount:"",status:"İptal",notes:""},
      {domain:"nilmakforklift.com",renewal_date:"29.11.2018",amount:"",status:"İptal",notes:""},
      {domain:"poepoetika.com",renewal_date:"09.12.2018",amount:"",status:"İptal",notes:""},
      {domain:"nilmakforklift.com.tr",renewal_date:"29.12.2018",amount:"",status:"İptal",notes:""},
      {domain:"windtechmuhendislik.com",renewal_date:"30.12.2018",amount:"",status:"İptal",notes:""},
      {domain:"egehab.com",renewal_date:"16.01.2019",amount:"",status:"İptal",notes:""},
      {domain:"harmannefes.com",renewal_date:"19.02.2019",amount:"",status:"İptal",notes:""},
      {domain:"falkem.de",renewal_date:"20.02.2019",amount:"",status:"İptal",notes:""},
      {domain:"optifeys.com",renewal_date:"13.03.2019",amount:"",status:"İptal",notes:""},
      {domain:"powerakademi.com",renewal_date:"12.04.2019",amount:"",status:"İptal",notes:""},
      {domain:"cafesunum.com.tr",renewal_date:"21.04.2019",amount:"",status:"İptal",notes:""},
      {domain:"cenkgorken.com.tr",renewal_date:"04.05.2019",amount:"",status:"İptal",notes:""},
      {domain:"dijitalsanatlaratolyesi.com",renewal_date:"15.06.2019",amount:"",status:"İptal",notes:""},
      {domain:"logoexperi.com",renewal_date:"18.07.2019",amount:"",status:"İptal",notes:""},
      {domain:"webexperi.com",renewal_date:"18.07.2019",amount:"",status:"İptal",notes:""},
      {domain:"webeksperi.com",renewal_date:"25.07.2019",amount:"",status:"İptal",notes:""},
      {domain:"dumanhukukdanismanlik.com",renewal_date:"12.08.2019",amount:"",status:"İptal",notes:""},
      {domain:"apakosgb.net",renewal_date:"28.08.2019",amount:"",status:"İptal",notes:""},
      {domain:"dijitalsanatlaratolyesi.net",renewal_date:"20.10.2019",amount:"",status:"Süresi Doldu",notes:""},
      {domain:"seatownantalya.com",renewal_date:"20.11.2019",amount:"",status:"İptal",notes:""},
      {domain:"dilekkucukoglu.com",renewal_date:"04.12.2019",amount:"",status:"İptal",notes:""},
      {domain:"izhab.com.tr",renewal_date:"10.02.2020",amount:"",status:"İptal",notes:""},
      {domain:"ozaysurucukursu.com.tr",renewal_date:"14.03.2020",amount:"",status:"İptal",notes:""},
      {domain:"anatoliagroup.co.uk",renewal_date:"28.03.2020",amount:"",status:"Süresi Doldu",notes:""},
      {domain:"airporttransfersaltinkum.com",renewal_date:"13.04.2020",amount:"",status:"İptal",notes:""},
      {domain:"altinkumdidimtransfer.com",renewal_date:"13.04.2020",amount:"",status:"İptal",notes:""},
      {domain:"gorkemayakkabi.net",renewal_date:"21.05.2020",amount:"",status:"İptal",notes:""},
      {domain:"dogantente.net",renewal_date:"03.09.2020",amount:"",status:"Süresi Doldu",notes:""},
      {domain:"hastabakimiizmir.com",renewal_date:"04.10.2020",amount:"",status:"İptal",notes:""},
      {domain:"nenedeniyi.com",renewal_date:"04.10.2020",amount:"",status:"İptal",notes:""},
      {domain:"tilsimakademi.com",renewal_date:"01.02.2021",amount:"",status:"Süresi Doldu",notes:""},
      {domain:"tilsimakademi.net",renewal_date:"01.02.2021",amount:"",status:"Süresi Doldu",notes:""},
      {domain:"anatolia-edu.co.uk",renewal_date:"04.02.2021",amount:"",status:"Süresi Doldu",notes:""},
      {domain:"anatolia-edu.com",renewal_date:"04.02.2021",amount:"",status:"İptal",notes:""},
      {domain:"anatolia-hr.co.uk",renewal_date:"04.02.2021",amount:"",status:"Süresi Doldu",notes:""},
      {domain:"anatolia-hr.com",renewal_date:"04.02.2021",amount:"",status:"İptal",notes:""},
      {domain:"anatoliaresidency.com",renewal_date:"06.02.2021",amount:"",status:"İptal",notes:""},
      {domain:"nuhsazevi.com",renewal_date:"12.02.2021",amount:"",status:"İptal",notes:""},
      {domain:"anatoliaresidency.co.uk",renewal_date:"20.02.2021",amount:"",status:"İptal",notes:""},
      {domain:"mntm.com.tr",renewal_date:"26.03.2021",amount:"",status:"İptal",notes:""},
      {domain:"yakamozbeautypark.net",renewal_date:"11.05.2021",amount:"",status:"Süresi Doldu",notes:""},
      {domain:"yilmazyapidekorasyon.com",renewal_date:"18.06.2021",amount:"",status:"İptal",notes:""},
      {domain:"zekicam.net",renewal_date:"20.06.2021",amount:"",status:"İptal",notes:""},
      {domain:"wordpresssitem.com",renewal_date:"09.07.2021",amount:"",status:"Süresi Doldu",notes:""},
      {domain:"wordpresssitem.net",renewal_date:"09.07.2021",amount:"",status:"Süresi Doldu",notes:""},
      {domain:"balikesirztyapi.com",renewal_date:"15.07.2021",amount:"",status:"İptal",notes:""},
      {domain:"canakkaleztyapi.com",renewal_date:"15.07.2021",amount:"",status:"İptal",notes:""},
      {domain:"manisaztyapi.com",renewal_date:"15.07.2021",amount:"",status:"İptal",notes:""},
      {domain:"muglaztyapi.com",renewal_date:"15.07.2021",amount:"",status:"İptal",notes:""},
      {domain:"drarzudegirmenciakar.com",renewal_date:"04.08.2021",amount:"",status:"İptal",notes:""},
      {domain:"esmteknikservis.com",renewal_date:"23.09.2021",amount:"",status:"İptal",notes:""},
      {domain:"emlakmatik.com.tr",renewal_date:"28.09.2021",amount:"",status:"İptal",notes:""},
      {domain:"turkdunyapazari.com",renewal_date:"08.11.2021",amount:"",status:"İptal",notes:""},
      {domain:"egehab.com.tr",renewal_date:"17.01.2022",amount:"",status:"İptal",notes:""},
      {domain:"kahvekutusu.com",renewal_date:"21.01.2022",amount:"",status:"Transfer Edildi",notes:""},
      {domain:"izmirlogotasarimi.com",renewal_date:"02.02.2022",amount:"",status:"Bekliyor",notes:""},
      {domain:"izmirlogotasarimi.com",renewal_date:"24.02.2022",amount:"",status:"İptal",notes:""},
      {domain:"hasdemir.com.tr",renewal_date:"28.03.2022",amount:"",status:"İptal",notes:""},
      {domain:"artwebhosting.com.tr",renewal_date:"09.04.2022",amount:"",status:"İptal",notes:""},
      {domain:"apakakademi.com",renewal_date:"25.04.2022",amount:"",status:"İptal",notes:""},
      {domain:"dogangunescephesistemleri.com",renewal_date:"24.05.2022",amount:"",status:"Süresi Doldu",notes:""},
      {domain:"arabaliyerocagi.com",renewal_date:"30.05.2022",amount:"",status:"İptal",notes:""},
      {domain:"trexocak.com",renewal_date:"30.05.2022",amount:"",status:"İptal",notes:""},
      {domain:"severconta.com",renewal_date:"20.06.2022",amount:"",status:"İptal",notes:""},
      {domain:"karacastor.com",renewal_date:"13.07.2022",amount:"",status:"İptal",notes:""},
      {domain:"mnmaschinen.com",renewal_date:"19.11.2022",amount:"",status:"Süresi Doldu",notes:""},
      {domain:"schmitz.com.tr",renewal_date:"22.11.2022",amount:"",status:"Süresi Doldu",notes:""},
      {domain:"kahvekutusu.com.tr",renewal_date:"30.04.2023",amount:"",status:"Transfer Edildi",notes:""},
      {domain:"mekanicmimarlik.com",renewal_date:"11.05.2023",amount:"",status:"İptal",notes:""},
      {domain:"ysnenerjimuhendislik.com",renewal_date:"04.07.2023",amount:"",status:"İptal",notes:""},
      {domain:"meduza.com.tr",renewal_date:"05.07.2023",amount:"",status:"İptal",notes:""},
      {domain:"nidasigorta.com",renewal_date:"02.08.2023",amount:"",status:"Transfer Edildi",notes:""},
      {domain:"jemileofficial.com",renewal_date:"04.08.2023",amount:"",status:"Süresi Doldu",notes:""},
      {domain:"yoishostore.com",renewal_date:"02.09.2023",amount:"",status:"Süresi Doldu",notes:""},
      {domain:"myukiyostore.com",renewal_date:"23.11.2023",amount:"",status:"İptal",notes:""},
      {domain:"yagmursolarmuhendislik.com",renewal_date:"10.01.2024",amount:"",status:"İptal",notes:""},
      {domain:"schrodermaschine.com",renewal_date:"16.03.2024",amount:"",status:"İptal",notes:""},
      {domain:"aydanpamukcu.com",renewal_date:"29.05.2024",amount:"",status:"İptal",notes:""},
      {domain:"kurtariciadem.com",renewal_date:"10.06.2024",amount:"",status:"Süresi Doldu",notes:""},
      {domain:"ozacar.com.tr",renewal_date:"19.07.2024",amount:"",status:"Transfer Edildi",notes:""},
      {domain:"kzykaucuk.com",renewal_date:"23.08.2024",amount:"",status:"İptal",notes:""},
      {domain:"nenedeniyi.com",renewal_date:"24.09.2024",amount:"",status:"İptal",notes:""},
      {domain:"dogalolani.com",renewal_date:"02.10.2024",amount:"",status:"İptal",notes:""},
      {domain:"nedeniyi.com",renewal_date:"04.10.2024",amount:"",status:"İptal",notes:""},
      {domain:"turkuazcephe.com",renewal_date:"13.10.2024",amount:"",status:"İptal",notes:""},
      {domain:"clinovita.com",renewal_date:"21.11.2024",amount:"",status:"İptal",notes:""},
      {domain:"clinovita.com.tr",renewal_date:"21.11.2024",amount:"",status:"İptal",notes:""},
      {domain:"starlineyachts.com",renewal_date:"07.12.2024",amount:"",status:"Süresi Doldu",notes:""},
      {domain:"elegancecharmeny.com",renewal_date:"23.01.2025",amount:"",status:"Süresi Doldu",notes:""},
      {domain:"elegancecharmeny.shop",renewal_date:"23.01.2025",amount:"",status:"Süresi Doldu",notes:""},
      {domain:"salicanewyork.com",renewal_date:"23.01.2025",amount:"",status:"Süresi Doldu",notes:""},
      {domain:"salicanewyork.shop",renewal_date:"23.01.2025",amount:"",status:"Süresi Doldu",notes:""},
      {domain:"fetrez.com",renewal_date:"27.02.2025",amount:"",status:"Süresi Doldu",notes:""},
      {domain:"bseboutique.com",renewal_date:"18.11.2025",amount:"",status:"Süresi Doldu",notes:""},
      {domain:"schrodermaschine.com",renewal_date:"29.11.2025",amount:"",status:"İptal",notes:""},
      {domain:"kelepcemarketi.com",renewal_date:"12.12.2025",amount:"",status:"Süresi Doldu",notes:""},
      {domain:"rizzactive.com",renewal_date:"29.01.2026",amount:"",status:"Transfer Edildi",notes:""},
      {domain:"rizzactive.com.tr",renewal_date:"29.01.2026",amount:"",status:"Transfer Edildi",notes:""},
      {domain:"klarosemlak.com",renewal_date:"25.02.2026",amount:"",status:"Süresi Doldu",notes:""},
      {domain:"klarosemlak.com.tr",renewal_date:"25.02.2026",amount:"",status:"İptal",notes:""},
      {domain:"fetrez.com.tr",renewal_date:"27.02.2026",amount:"",status:"Süresi Doldu",notes:""},
      {domain:"erendiraalacati.com",renewal_date:"05.05.2026",amount:"",status:"Süresi Doldu",notes:""},
      {domain:"erendiraalacati.com.tr",renewal_date:"05.05.2026",amount:"",status:"Süresi Doldu",notes:""},
      {domain:"demirkilic.com.tr",renewal_date:"09.06.2026",amount:"",status:"Aktif",notes:""},
      {domain:"vouqeplex.com.tr",renewal_date:"09.06.2026",amount:"",status:"Aktif",notes:""},
      {domain:"vouqeplex.com",renewal_date:"10.06.2026",amount:"",status:"Aktif",notes:""},
      {domain:"eksioglulife.com",renewal_date:"22.06.2026",amount:"",status:"Aktif",notes:""},
      {domain:"zuhaltanriverdi.com",renewal_date:"25.06.2026",amount:"",status:"Aktif",notes:""},
      {domain:"dorjeoil.com",renewal_date:"10.07.2026",amount:"",status:"Aktif",notes:""},
      {domain:"karyadaalacatihotels.com",renewal_date:"10.07.2026",amount:"",status:"Aktif",notes:""},
      {domain:"ekipsanmakina.com",renewal_date:"18.07.2026",amount:"",status:"Aktif",notes:""},
      {domain:"tattootour.com.tr",renewal_date:"24.07.2026",amount:"",status:"Aktif",notes:""},
      {domain:"tattootourworld.com",renewal_date:"24.07.2026",amount:"",status:"Aktif",notes:""},
      {domain:"tattootourworld.com.tr",renewal_date:"24.07.2026",amount:"",status:"Aktif",notes:""},
      {domain:"worldtattootour.com",renewal_date:"24.07.2026",amount:"",status:"Aktif",notes:""},
      {domain:"worldtattootour.com.tr",renewal_date:"24.07.2026",amount:"",status:"Aktif",notes:""},
      {domain:"mobamimarlik.com.tr",renewal_date:"25.07.2026",amount:"",status:"Aktif",notes:""},
      {domain:"mobatasarim.com",renewal_date:"25.07.2026",amount:"",status:"Aktif",notes:""},
      {domain:"mobatasarim.com.tr",renewal_date:"25.07.2026",amount:"",status:"Aktif",notes:""},
      {domain:"vouqe.com",renewal_date:"30.07.2026",amount:"",status:"Aktif",notes:""},
      {domain:"creasperdesistemleri.com",renewal_date:"12.08.2026",amount:"",status:"Aktif",notes:""},
      {domain:"endustriyelborukelepcesi.com",renewal_date:"24.09.2026",amount:"",status:"Aktif",notes:""},
      {domain:"viportadogugida.com",renewal_date:"26.09.2026",amount:"",status:"Aktif",notes:""},
      {domain:"mustafadelice.com",renewal_date:"18.10.2026",amount:"",status:"Aktif",notes:""},
      {domain:"kalbedokunanadamlar.com",renewal_date:"21.10.2026",amount:"",status:"Aktif",notes:""},
      {domain:"kalbedokunanadamlar.com.tr",renewal_date:"21.10.2026",amount:"",status:"Aktif",notes:""},
      {domain:"sanlievconcept.com",renewal_date:"31.10.2026",amount:"",status:"Aktif",notes:""},
      {domain:"auragiftt.com",renewal_date:"03.11.2026",amount:"",status:"Aktif",notes:""},
      {domain:"suivantankastre.com",renewal_date:"04.11.2026",amount:"",status:"Aktif",notes:""},
      {domain:"suivantkitchen.com",renewal_date:"04.11.2026",amount:"",status:"Aktif",notes:""},
      {domain:"emitmuhendislik.com",renewal_date:"12.11.2026",amount:"",status:"Aktif",notes:""},
      {domain:"emitmuhendislik.com.tr",renewal_date:"12.11.2026",amount:"",status:"Aktif",notes:""},
      {domain:"pro-tectorofficial.com",renewal_date:"13.11.2026",amount:"",status:"Aktif",notes:""},
      {domain:"protectorofficial.com",renewal_date:"14.11.2026",amount:"",status:"Aktif",notes:""},
      {domain:"eltekenerjimuhendislik.com",renewal_date:"16.11.2026",amount:"",status:"Aktif",notes:""},
      {domain:"hzindustrialteknik.com",renewal_date:"19.11.2026",amount:"",status:"Aktif",notes:""},
      {domain:"inkamutfak.com.tr",renewal_date:"19.11.2026",amount:"",status:"Aktif",notes:""},
      {domain:"clinovita.com",renewal_date:"21.11.2026",amount:"",status:"Aktif",notes:""},
      {domain:"clinovita.com.tr",renewal_date:"21.11.2026",amount:"",status:"Aktif",notes:""},
      {domain:"pro-tectoronline.com",renewal_date:"25.11.2026",amount:"",status:"Aktif",notes:""},
      {domain:"protectorofficialonline.com",renewal_date:"25.11.2026",amount:"",status:"Aktif",notes:""},
      {domain:"papatyaicgiyim.com.tr",renewal_date:"22.12.2026",amount:"",status:"Aktif",notes:""},
      {domain:"pozitifmekanik.com.tr",renewal_date:"23.12.2026",amount:"",status:"Aktif",notes:""},
      {domain:"webtemam.com",renewal_date:"03.01.2027",amount:"",status:"Aktif",notes:""},
      {domain:"anadolusofrasi.net",renewal_date:"05.01.2027",amount:"",status:"Aktif",notes:""},
      {domain:"anadolusofrasionline.com",renewal_date:"06.01.2027",amount:"",status:"Aktif",notes:""},
      {domain:"anadolusofrasionline.com.tr",renewal_date:"06.01.2027",amount:"",status:"Aktif",notes:""},
      {domain:"posttasarim.com",renewal_date:"08.01.2027",amount:"",status:"Aktif",notes:""},
      {domain:"posttasarim.com.tr",renewal_date:"08.01.2027",amount:"",status:"Aktif",notes:""},
      {domain:"internationalskin.net",renewal_date:"26.01.2027",amount:"",status:"Aktif",notes:""},
      {domain:"cinaricgiyim.com",renewal_date:"27.01.2027",amount:"",status:"Aktif",notes:""},
      {domain:"cinaricgiyim.com.tr",renewal_date:"27.01.2027",amount:"",status:"Aktif",notes:""},
      {domain:"goblenastrology.com",renewal_date:"03.02.2027",amount:"",status:"Aktif",notes:""},
      {domain:"goblenastrology.com.tr",renewal_date:"03.02.2027",amount:"",status:"Aktif",notes:""},
      {domain:"bmiinsaat.com",renewal_date:"04.02.2027",amount:"",status:"Aktif",notes:""},
      {domain:"bmiinsaat.com.tr",renewal_date:"04.02.2027",amount:"",status:"Aktif",notes:""},
      {domain:"ozgrupas.com",renewal_date:"10.02.2027",amount:"",status:"Aktif",notes:""},
      {domain:"izid.org.tr",renewal_date:"13.02.2027",amount:"",status:"Aktif",notes:""},
      {domain:"bastekmakina.com",renewal_date:"19.02.2027",amount:"",status:"Aktif",notes:""},
      {domain:"triosanat.net",renewal_date:"24.02.2027",amount:"",status:"Aktif",notes:""},
      {domain:"senteskelepce.com",renewal_date:"06.03.2027",amount:"",status:"Aktif",notes:""},
      {domain:"senteskelepce.com.tr",renewal_date:"06.03.2027",amount:"",status:"Aktif",notes:""},
      {domain:"triosanat.com.tr",renewal_date:"14.03.2027",amount:"",status:"Aktif",notes:""},
      {domain:"beyoubeofficial.com",renewal_date:"16.03.2027",amount:"",status:"Aktif",notes:""},
      {domain:"sistem.jewelry",renewal_date:"24.03.2027",amount:"",status:"Aktif",notes:""},
      {domain:"webexperi.com.tr",renewal_date:"15.04.2027",amount:"",status:"Aktif",notes:""},
      {domain:"egefleks.com",renewal_date:"14.05.2027",amount:"",status:"Aktif",notes:""},
      {domain:"eysas.com",renewal_date:"20.05.2027",amount:"",status:"Aktif",notes:""},
      {domain:"eysas.net",renewal_date:"20.05.2027",amount:"",status:"Aktif",notes:""},
      {domain:"bmtteknikyapi.com",renewal_date:"21.05.2027",amount:"",status:"Aktif",notes:""},
      {domain:"bmtteknikyapi.com.tr",renewal_date:"21.05.2027",amount:"",status:"Aktif",notes:""},
      {domain:"firmabulur.com",renewal_date:"21.05.2027",amount:"",status:"Aktif",notes:""},
      {domain:"aydanpamukcu.com",renewal_date:"29.05.2027",amount:"",status:"Aktif",notes:""},
      {domain:"sentesendustriyel.com",renewal_date:"29.05.2027",amount:"",status:"Aktif",notes:""},
      {domain:"trexocak.com",renewal_date:"30.05.2027",amount:"",status:"Aktif",notes:""},
      {domain:"egesoylukaucuk.com",renewal_date:"01.06.2027",amount:"",status:"Aktif",notes:""},
      {domain:"atacankucukoglu.com",renewal_date:"05.06.2027",amount:"",status:"Aktif",notes:""},
      {domain:"dijitalsanatlaratolyesi.com",renewal_date:"12.06.2027",amount:"",status:"Aktif",notes:""},
      {domain:"eysas.com.tr",renewal_date:"16.06.2027",amount:"",status:"Aktif",notes:""},
      {domain:"webexperi.com",renewal_date:"16.06.2027",amount:"",status:"Aktif",notes:""},
      {domain:"kanatlilojistik.com",renewal_date:"18.06.2027",amount:"",status:"Aktif",notes:""},
      {domain:"egefleks.com.tr",renewal_date:"30.06.2027",amount:"",status:"Aktif",notes:""},
      {domain:"kanatlilojistik.com.tr",renewal_date:"05.07.2027",amount:"",status:"Aktif",notes:""},
      {domain:"egekaucuk.com.tr",renewal_date:"17.07.2027",amount:"",status:"Aktif",notes:""},
      {domain:"kutsaldinler.com",renewal_date:"17.07.2027",amount:"",status:"Aktif",notes:""},
      {domain:"kutsalkitaplar.com",renewal_date:"17.07.2027",amount:"",status:"Aktif",notes:""},
      {domain:"egekaucuk.com",renewal_date:"03.08.2027",amount:"",status:"Aktif",notes:""},
      {domain:"sistemkalemkar.com",renewal_date:"25.09.2027",amount:"",status:"Aktif",notes:""},
      {domain:"inkamutfak.com",renewal_date:"24.11.2027",amount:"",status:"Aktif",notes:""},
      {domain:"izmirdsispor.org",renewal_date:"25.11.2027",amount:"",status:"Aktif",notes:""},
      {domain:"dilekkucukoglu.com.tr",renewal_date:"27.02.2028",amount:"",status:"Aktif",notes:""},
      {domain:"artwebtema.com.tr",renewal_date:"09.04.2028",amount:"",status:"Aktif",notes:""},
      {domain:"artwebtasarim.com.tr",renewal_date:"19.07.2028",amount:"",status:"Aktif",notes:""},
      {domain:"artwebtasarim.com",renewal_date:"23.09.2028",amount:"",status:"Aktif",notes:""},
      {domain:"butikambar.com",renewal_date:"07.11.2028",amount:"",status:"Aktif",notes:""},
      {domain:"butikambar.net",renewal_date:"07.11.2028",amount:"",status:"Aktif",notes:""},
      {domain:"ztyapi.com.tr",renewal_date:"20.01.2030",amount:"",status:"Aktif",notes:""},
      {domain:"izmirlilerdernegi.org.tr",renewal_date:"27.02.2031",amount:"",status:"İptal",notes:""},
    ]

    const hostingRows = [
      {product_name:"Tera - Linux Bireysel Hosting",domain:"webexperi.com",renewal_date:"16.06.2026",amount:"98.46$",status:"Aktif",notes:""},
      {product_name:"Eksa - Linux Bayi Hosting",domain:"webexperi.com",renewal_date:"17.03.2027",amount:"189.99$",status:"Aktif",notes:""},
      {product_name:"Yotta - Windows Bayi Hosting",domain:"ezgil.com",renewal_date:"21.04.2027",amount:"797.99$",status:"Aktif",notes:""},
    ]

    const sslRows = [
      {product_name:"Positive SSL",domain:"egefleks.com.tr",renewal_date:"14.06.2026",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"egesoylukaucuk.com",renewal_date:"14.06.2026",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"eksioglulife.com",renewal_date:"16.06.2026",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"zuhaltanriverdi.com",renewal_date:"20.06.2026",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"ekipsanmakina.com",renewal_date:"07.07.2026",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"karyadaalacatihotels.com",renewal_date:"10.07.2026",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"diremmuhendislik.com",renewal_date:"08.08.2026",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"gonenpres.com.tr",renewal_date:"18.08.2026",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"koyuturkticaret.com",renewal_date:"29.08.2026",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"walmartdoo.com",renewal_date:"29.08.2026",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"www.ozselinox.com",renewal_date:"29.08.2026",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"endustriyelborukelepcesi.com",renewal_date:"11.09.2026",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"mustafadelice.com",renewal_date:"25.09.2026",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"dlgsigorta.com",renewal_date:"11.10.2026",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"sanlievconcept.com",renewal_date:"11.10.2026",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"viportadogugida.com",renewal_date:"30.10.2026",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"setupdanismanlik.com",renewal_date:"18.11.2026",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"hzindustrialteknik.com",renewal_date:"04.12.2026",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"ztyapi.com.tr",renewal_date:"22.01.2027",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"izced.com",renewal_date:"26.01.2027",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"goblenastrology.com",renewal_date:"03.02.2027",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"bmiinsaat.com.tr",renewal_date:"04.02.2027",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"usahsap.com",renewal_date:"01.03.2027",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"ozgrupas.com",renewal_date:"12.03.2027",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"www.dosegida.com",renewal_date:"26.03.2027",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"apakosgb.com",renewal_date:"16.04.2027",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"dogusprina.com",renewal_date:"28.04.2027",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"egekaucuk.com.tr",renewal_date:"28.04.2027",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"merdayapi.com",renewal_date:"28.04.2027",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"orpir.com",renewal_date:"28.04.2027",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"eysas.com",renewal_date:"14.05.2027",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"kanatlilojistik.com.tr",renewal_date:"17.05.2027",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"trexocak.com",renewal_date:"05.06.2027",amount:"9.49$",status:"Aktif",notes:""},
      {product_name:"Positive SSL",domain:"www.artwebtasarim.com.tr",renewal_date:"22.01.2028",amount:"11.98$",status:"Aktif",notes:""},
    ]

    try {
      await Promise.all([
        fetch(`${API_BASE}/api/tracking/domains/bulk`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ rows: domainRows }) }),
        fetch(`${API_BASE}/api/tracking/hostings/bulk`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ rows: hostingRows }) }),
        fetch(`${API_BASE}/api/tracking/ssls/bulk`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ rows: sslRows }) }),
      ])
      await load(false)
    } catch {}
  }

  // ── CRUD handlers ──────────────────────────────────────────────────────

  const handleAdd = async (type, form) => {
    const url = `${API_BASE}/api/tracking/${type}`
    await fetch(url, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(form) })
    await load()
  }

  const handleEdit = async (type, form) => {
    await fetch(`${API_BASE}/api/tracking/${type}`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(form) })
    await load()
  }

  const handleDelete = async (type, id) => {
    await fetch(`${API_BASE}/api/tracking/${type}/${id}`, { method: 'DELETE' })
    await load()
  }

  // ── Filter ─────────────────────────────────────────────────────────────

  const filterRows = (rows) => {
    let r = rows
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(row =>
        (row.domain || '').toLowerCase().includes(q) ||
        (row.product_name || '').toLowerCase().includes(q) ||
        (row.notes || '').toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'Tümü') {
      r = r.filter(row => row.status === statusFilter)
    }
    return r
  }

  const currentRows = activeTab === 'domains' ? filterRows(domains)
    : activeTab === 'hostings' ? filterRows(hostings)
    : filterRows(ssls)

  const currentType = activeTab === 'domains' ? 'domains' : activeTab === 'hostings' ? 'hostings' : 'ssls'

  // ── Urgent alerts ──────────────────────────────────────────────────────

  const urgent = useMemo(() => {
    const all = [
      ...domains.map(r => ({ ...r, _type: 'Domain' })),
      ...hostings.map(r => ({ ...r, _type: 'Hosting' })),
      ...ssls.map(r => ({ ...r, _type: 'SSL' })),
    ].filter(r => r.status === 'Aktif').map(r => ({ ...r, _days: daysLeft(r.renewal_date) }))
      .filter(r => r._days !== null && r._days <= 14)
      .sort((a, b) => a._days - b._days)
    return all
  }, [domains, hostings, ssls])

  const base = `flex-1 overflow-auto`

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Domain / Hosting / SSL</h1>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Yenileme takibi ve durum yönetimi</p>
        </div>
        <button onClick={load} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-500 hover:text-white hover:bg-slate-800' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Summary */}
      <SummaryBar domains={domains} hostings={hostings} ssls={ssls} isDark={isDark} />

      {/* Urgent alerts */}
      {urgent.length > 0 && (
        <div className={`rounded-xl p-3 shrink-0 ${isDark ? 'bg-red-500/5 border border-red-500/20' : 'bg-red-50 border border-red-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-red-500" />
            <span className={`text-xs font-semibold ${isDark ? 'text-red-400' : 'text-red-700'}`}>Acil Yenileme Gerekiyor ({urgent.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {urgent.map((r, i) => (
              <span key={i} className={`text-xs px-2 py-1 rounded-lg font-medium ${r._days <= 0 ? (isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700') : (isDark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-700')}`}>
                {r.domain} · {r._type} · {r._days <= 0 ? `${Math.abs(r._days)}g geçmiş` : `${r._days}g kaldı`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs + Search + Filter */}
      <div className="flex items-center gap-3 shrink-0 flex-wrap">
        <div className={`flex gap-1 p-1 rounded-xl ${isDark ? 'bg-slate-900/60' : 'bg-gray-100'}`}>
          {TABS.map(t => {
            const Icon = t.icon
            const count = t.id === 'domains' ? domains.length : t.id === 'hostings' ? hostings.length : ssls.length
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === t.id
                    ? isDark ? 'bg-slate-700 text-white' : 'bg-white text-gray-900 shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Icon size={13} /> {t.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === t.id ? (isDark ? 'bg-slate-600 text-slate-300' : 'bg-gray-100 text-gray-600') : (isDark ? 'bg-slate-800 text-slate-500' : 'bg-gray-200 text-gray-400')}`}>{count}</span>
              </button>
            )
          })}
        </div>

        <div className={`flex items-center gap-2 flex-1 min-w-0 px-3 py-1.5 rounded-xl ${isDark ? 'bg-slate-900/60 border border-slate-800/60' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <Search size={14} className={isDark ? 'text-slate-500' : 'text-gray-400'} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Domain veya ürün ara…"
            className={`flex-1 text-sm bg-transparent focus:outline-none ${isDark ? 'text-white placeholder-slate-600' : 'text-gray-900 placeholder-gray-400'}`}
          />
          {search && <button onClick={() => setSearch('')} className={isDark ? 'text-slate-600 hover:text-slate-400' : 'text-gray-300 hover:text-gray-600'}><X size={13} /></button>}
        </div>

        <div className={`flex gap-1 p-1 rounded-xl ${isDark ? 'bg-slate-900/60' : 'bg-gray-100'}`}>
          {['Tümü', 'Aktif', 'Süresi Doldu', 'İptal', 'Bekliyor', 'Transfer Edildi'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                statusFilter === s
                  ? isDark ? 'bg-slate-700 text-white' : 'bg-white text-gray-900 shadow-sm'
                  : isDark ? 'text-slate-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className={base}>
        <TrackingTable
          type={currentType === 'domains' ? 'domain' : currentType === 'hostings' ? 'hosting' : 'ssl'}
          rows={currentRows}
          isDark={isDark}
          loading={loading}
          onAdd={(form) => handleAdd(currentType, form)}
          onEdit={(form) => handleEdit(currentType, form)}
          onDelete={(id) => handleDelete(currentType, id)}
        />
        <p className={`text-[11px] mt-2 ${isDark ? 'text-slate-700' : 'text-gray-300'}`}>{currentRows.length} kayıt gösteriliyor</p>
      </div>
    </div>
  )
}
