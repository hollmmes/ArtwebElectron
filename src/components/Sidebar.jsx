import { MapPin, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

const modules = [
  { id: 'maps', name: 'Maps Ripper', icon: MapPin },
]

export default function Sidebar({ isOpen, onToggle, activeModule, onModuleChange }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

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
          return (
            <button
              key={mod.id}
              onClick={() => onModuleChange(mod.id)}
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
              {isOpen && <span className="text-sm font-medium">{mod.name}</span>}
            </button>
          )
        })}
      </nav>

      <div className={`p-2 border-t ${isDark ? 'border-slate-800/60' : 'border-gray-100'}`}>
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
