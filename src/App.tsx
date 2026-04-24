import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { StatsPage } from './pages/StatsPage'
import { TitleBar } from './components/TitleBar'

const isMac = navigator.userAgent.includes('Mac OS')

function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {!isMac && <TitleBar />}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/stats/:region/:gameName/:tagLine" element={<StatsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </div>
    </div>
  )
}

export default App
