import { Minus, Square, X } from 'lucide-react'

export default function TitleBar() {
  return (
    <div className="title-bar h-8 flex items-center justify-between px-4 bg-dark-900 border-b border-white/5">
      <div className="flex items-center gap-2">
        <img src="./icon.png" alt="Art Web" className="w-4 h-4 rounded-sm" />
        <span className="text-xs text-white/50 font-medium">Art Web Toolkit</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => window.electronAPI?.minimizeWindow()}
          className="title-bar-btn w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded transition-colors"
        >
          <Minus size={14} className="text-white/70" />
        </button>
        <button
          onClick={() => window.electronAPI?.maximizeWindow()}
          className="title-bar-btn w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded transition-colors"
        >
          <Square size={11} className="text-white/70" />
        </button>
        <button
          onClick={() => window.electronAPI?.closeWindow()}
          className="title-bar-btn w-8 h-8 flex items-center justify-center hover:bg-red-500/80 rounded transition-colors"
        >
          <X size={14} className="text-white/70" />
        </button>
      </div>
    </div>
  )
}
