import { useState } from 'react'
import Sidebar from './components/Sidebar'
import TitleBar from './components/TitleBar'
import MapsRipper from './components/maps/MapsRipper'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeModule, setActiveModule] = useState('maps')

  const renderModule = () => {
    switch (activeModule) {
      case 'maps':
        return <MapsRipper />
      default:
        return <MapsRipper />
    }
  }

  return (
    <div className="h-screen flex flex-col bg-dark-900">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          activeModule={activeModule}
          onModuleChange={setActiveModule}
        />
        <main className="flex-1 overflow-auto p-6">
          {renderModule()}
        </main>
      </div>
    </div>
  )
}
