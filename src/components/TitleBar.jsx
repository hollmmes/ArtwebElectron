import { Minus, Square, X } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

export default function TitleBar() {
  const { theme } = useTheme()

  return (
    <div className={`title-bar h-9 flex items-center justify-between px-4 ${
      theme === 'dark'
        ? 'bg-slate-950 border-b border-slate-800/60'
        : 'bg-white border-b border-gray-200'
    }`}>
      <div className="flex items-center gap-2">
        <img src="./icon.png" alt="Art Web" className="w-4 h-4 rounded-sm" />
        <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
          Art Web Toolkit
        </span>
      </div>
      <div className="flex items-center">
        <button
          onClick={() => window.electronAPI?.minimizeWindow()}
          className={`title-bar-btn w-10 h-9 flex items-center justify-center transition-colors ${
            theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-gray-100'
          }`}
        >
          <Minus size={14} className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} />
        </button>
        <button
          onClick={() => window.electronAPI?.maximizeWindow()}
          className={`title-bar-btn w-10 h-9 flex items-center justify-center transition-colors ${
            theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-gray-100'
          }`}
        >
          <Square size={11} className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} />
        </button>
        <button
          onClick={() => window.electronAPI?.closeWindow()}
          className="title-bar-btn w-10 h-9 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors group"
        >
          <X size={14} className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} group-hover:text-white`} />
        </button>
      </div>
    </div>
  )
}
