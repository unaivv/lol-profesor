import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { listen } from '@tauri-apps/api/event'
import { LandingPage } from './pages/LandingPage'
import { StatsPage } from './pages/StatsPage'
import { SettingsPage } from './pages/SettingsPage'
import { TitleBar } from './components/TitleBar'
import { SplashScreen } from './components/SplashScreen'

const isMac = navigator.userAgent.includes('Mac OS')

function AppInner() {
  const [splash, setSplash] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const unlisten = listen<string>('navigate', e => navigate(e.payload))
    return () => { unlisten.then(f => f()) }
  }, [navigate])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {splash && <SplashScreen onDone={() => setSplash(false)} />}
      {!isMac && <TitleBar />}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/stats/:region/:gameName/:tagLine" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}

export default App
