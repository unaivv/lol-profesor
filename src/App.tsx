import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'
import { listen } from '@tauri-apps/api/event'
import { StatsPage } from './pages/StatsPage'
import { SettingsPage } from './pages/SettingsPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { MatchDetailPage } from './pages/MatchDetailPage'
import { AppLayout } from './components/layout/AppLayout'
import { TitleBar } from './components/TitleBar'
import { SplashScreen } from './components/SplashScreen'
import { initChampionMap } from './utils/ddragon'
import { useMyProfile } from './hooks/useMyProfile'
import { ThemeProvider } from './context/ThemeContext'
import { useState } from 'react'

const isMac = navigator.userAgent.includes('Mac OS')

function RootRedirect() {
  const { getMyProfile } = useMyProfile()
  const profile = getMyProfile()
  return <Navigate to={profile ? '/me' : '/onboarding'} replace />
}

function AppInner() {
  const [splash, setSplash] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    initChampionMap()
  }, [])

  useEffect(() => {
    const unlisten = listen<string>('navigate', e => navigate(e.payload))
    return () => { unlisten.then(f => f()) }
  }, [navigate])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {splash && <SplashScreen onDone={() => setSplash(false)} />}
      {!isMac && <TitleBar />}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          {/* Legacy routes */}
          <Route path="/stats" element={<Navigate to="/me" replace />} />
          <Route path="/stats/:region/:gameName/:tagLine" element={<StatsPageRedirect />} />
          {/* App layout with sidebar */}
          <Route element={<AppLayout />}>
            <Route path="/me" element={<StatsPage />} />
            <Route path="/player/:region/:gameName/:tagLine" element={<StatsPage />} />
            <Route path="/match/:gameId" element={<MatchDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}

function StatsPageRedirect() {
  const navigate = useNavigate()
  const { region, gameName, tagLine } = useParams<{ region: string; gameName: string; tagLine: string }>()
  useEffect(() => {
    if (region && gameName && tagLine) {
      navigate(`/player/${region}/${gameName}/${tagLine}`, { replace: true })
    } else {
      navigate('/me', { replace: true })
    }
  }, [region, gameName, tagLine, navigate])
  return null
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
