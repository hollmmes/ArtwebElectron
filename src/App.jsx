import { useState } from 'react'
import { useTheme } from './contexts/ThemeContext'
import Sidebar from './components/Sidebar'
import TitleBar from './components/TitleBar'
import MapsRipper from './components/maps/MapsRipper'
import Settings from './components/Settings'

export default function App() {
  const { theme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeModule, setActiveModule] = useState('maps')

  const renderModule = () => {
    switch (activeModule) {
      case 'maps':
        return <MapsRipper />
      case 'settings':
        return <Settings />
      default:
        return <MapsRipper />
    }
  }

  return (
    <div className={`h-screen flex flex-col ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          activeModule={activeModule}
          onModuleChange={setActiveModule}
        />
        <main className={`flex-1 overflow-auto p-6 ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
          {renderModule()}
        </main>
      </div>
    </div>
  )
}
