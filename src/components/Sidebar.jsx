import { MapPin, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react'

const modules = [
  { id: 'maps', name: 'Maps Ripper', icon: MapPin },
]

export default function Sidebar({ isOpen, onToggle, activeModule, onModuleChange }) {
  return (
    <aside
      className={`${
        isOpen ? 'w-64' : 'w-16'
      } transition-all duration-300 ease-in-out flex flex-col border-r border-white/5 bg-dark-800`}
    >
      {/* Logo & Toggle */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
        {isOpen && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <span className="text-xs font-bold">AW</span>
            </div>
            <span className="text-sm font-semibold text-white/90">Art Web</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          {isOpen ? (
            <PanelLeftClose size={18} className="text-white/60" />
          ) : (
            <PanelLeftOpen size={18} className="text-white/60" />
          )}
        </button>
      </div>

      {/* Modules */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {modules.map((mod) => {
          const Icon = mod.icon
          const isActive = activeModule === mod.id
          return (
            <button
              key={mod.id}
              onClick={() => onModuleChange(mod.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                  : 'text-white/60 hover:bg-white/5 hover:text-white/80 border border-transparent'
              }`}
            >
              <Icon size={20} />
              {isOpen && <span className="text-sm font-medium">{mod.name}</span>}
            </button>
          )
        })}
      </nav>

      {/* Settings */}
      <div className="p-2 border-t border-white/5">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/40 hover:bg-white/5 hover:text-white/60 transition-colors">
          <Settings size={20} />
          {isOpen && <span className="text-sm">Ayarlar</span>}
        </button>
      </div>
    </aside>
  )
}
