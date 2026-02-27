import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Dashboard } from './components/Dashboard'
import LandingPage from './components/LandingPage.jsx'
import MotionMathGame from './modules/motion-math/MotionMathGame.jsx'
import React from 'react'

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-surface-50 font-sans text-surface-900">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/motion-math" element={<MotionMathGame />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  )
}
