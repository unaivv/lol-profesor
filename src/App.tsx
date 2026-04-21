import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { StatsPage } from './pages/StatsPage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/stats" element={<StatsPage />} />
      </Routes>
    </Router>
  )
}

export default App
