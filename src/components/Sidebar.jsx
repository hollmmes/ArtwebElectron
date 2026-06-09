import { MapPin, PanelLeftClose, PanelLeftOpen, Settings, History, ChevronDown, Zap, LayoutGrid, Globe, Shield } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTheme } from '../contexts/ThemeContext'

const APP_VERSION = '0.3.4'

const modules = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: LayoutGrid,
  },
  {
    id: 'site-monitor',
    name: 'Site İzleme',
    icon: Globe,
  },
  {
    id: 'maps',
    name: 'Maps Ripper',
    icon: MapPin,
    children: [
      { id: 'maps-history', name: 'Gecmis Sonuclar', icon: History },
    ],
  },
  {
    id: 'lighthouse',
    name: 'Lighthouse',
    icon: Zap,
  },
  {
    id: 'tracking',
    name: 'Domain / SSL',
    icon: Shield,
  },
]

export default function Sidebar({ isOpen, onToggle, activeModule, onModuleChange }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [expanded, setExpanded] = useState({ maps: true })
  const [updateAvailable, setUpdateAvailable] = useState(null)

  useEffect(() => {
    window.electronAPI?.onUpdateAvailable((info) => {
      setUpdateAvailable(info.version)
    })
  }, [])

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <aside
      className={`${isOpen ? 'w-60' : 'w-16'} transition-all duration-300 ease-in-out flex flex-col ${
        isDark
          ? 'bg-slate-900/80 border-r border-slate-800/60'
          : 'bg-white border-r border-gray-200'
      }`}
    >
      <div className={`h-14 flex items-center justify-between px-3 border-b ${
        isDark ? 'border-slate-800/60' : 'border-gray-100'
      }`}>
        {isOpen ? (
          <div className="flex items-center gap-2.5">
            <img src="./icon.png" alt="Art Web" className="w-8 h-8 rounded-lg" />
            <span className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>
              Art Web Tasarim
            </span>
          </div>
        ) : (
          <img src="./icon.png" alt="Art Web" className="w-8 h-8 rounded-lg mx-auto" />
        )}
        {isOpen && (
          <button
            onClick={onToggle}
            className={`p-1.5 rounded-md transition-colors ${
              isDark ? 'hover:bg-slate-700/60 text-slate-400' : 'hover:bg-gray-100 text-gray-400'
            }`}
          >
            <PanelLeftClose size={16} />
          </button>
        )}
      </div>

      {!isOpen && (
        <div className="flex justify-center py-3">
          <button
            onClick={onToggle}
            className={`p-1.5 rounded-md transition-colors ${
              isDark ? 'hover:bg-slate-700/60 text-slate-400' : 'hover:bg-gray-100 text-gray-400'
            }`}
          >
            <PanelLeftOpen size={16} />
          </button>
        </div>
      )}

      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {modules.map((mod) => {
          const Icon = mod.icon
          const isActive = activeModule === mod.id
          const isExpanded = expanded[mod.id]
          const hasChildren = mod.children && mod.children.length > 0

          return (
            <div key={mod.id}>
              <button
                onClick={() => {
                  onModuleChange(mod.id)
                  if (hasChildren && isOpen) toggleExpand(mod.id)
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 ${
                  isActive
                    ? isDark
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'bg-blue-50 text-blue-600'
                    : isDark
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon size={18} />
                {isOpen && (
                  <>
                    <span className="text-sm font-medium flex-1 text-left">{mod.name}</span>
                    {hasChildren && (
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} ${
                          isDark ? 'text-slate-600' : 'text-gray-400'
                        }`}
                      />
                    )}
                  </>
                )}
              </button>

              {hasChildren && isOpen && isExpanded && (
                <div className="ml-4 mt-0.5 space-y-0.5">
                  {mod.children.map((child) => {
                    const ChildIcon = child.icon
                    const isChildActive = activeModule === child.id
                    return (
                      <button
                        key={child.id}
                        onClick={() => onModuleChange(child.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-150 ${
                          isChildActive
                            ? isDark
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-blue-50 text-blue-600'
                            : isDark
                              ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <ChildIcon size={15} />
                        <span className="text-xs font-medium">{child.name}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className={`p-2 border-t space-y-1 ${isDark ? 'border-slate-800/60' : 'border-gray-100'}`}>
        {/* Versiyon numarasi */}
        {isOpen && (
          <p className={`text-center text-[10px] pb-1 ${isDark ? 'text-slate-700' : 'text-gray-300'}`}>
            v{APP_VERSION}
          </p>
        )}

        {/* Guncelleme bildirimi */}
        {updateAvailable && isOpen && (
          <div
            onClick={() => onModuleChange('settings')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              isDark ? 'bg-emerald-500/10 hover:bg-emerald-500/15' : 'bg-emerald-50 hover:bg-emerald-100'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className={`text-[11px] font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              v{updateAvailable} mevcut
            </span>
          </div>
        )}
        {updateAvailable && !isOpen && (
          <div className="flex justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title={`v${updateAvailable} mevcut`} />
          </div>
        )}

        <button
          onClick={() => onModuleChange('settings')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 ${
            activeModule === 'settings'
              ? isDark
                ? 'bg-blue-500/10 text-blue-400'
                : 'bg-blue-50 text-blue-600'
              : isDark
                ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Settings size={18} />
          {isOpen && <span className="text-sm font-medium">Ayarlar</span>}
        </button>
      </div>
    </aside>
  )
}
