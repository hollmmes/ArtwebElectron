import { useState } from 'react'
import { useTheme } from './contexts/ThemeContext'
import Sidebar from './components/Sidebar'
import TitleBar from './components/TitleBar'
import LoadingScreen from './components/LoadingScreen'
import HomeDashboard from './components/dashboard/HomeDashboard'
import Dashboard from './components/dashboard/Dashboard'
import MapsRipper from './components/maps/MapsRipper'
import MapsHistory from './components/maps/MapsHistory'
import Lighthouse from './components/lighthouse/Lighthouse'
import Tracking from './components/tracking/Tracking'
import Settings from './components/Settings'

export default function App() {
  const { theme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeModule, setActiveModule] = useState('dashboard')
  const [ready, setReady] = useState(false)

  if (!ready) {
    return <LoadingScreen onComplete={() => setReady(true)} />
  }

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <HomeDashboard />
      case 'site-monitor':
        return <Dashboard />
      case 'maps':
        return <MapsRipper />
      case 'maps-history':
        return <MapsHistory />
      case 'lighthouse':
        return <Lighthouse />
      case 'tracking':
        return <Tracking />
      case 'settings':
        return <Settings />
      default:
        return <HomeDashboard />
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
