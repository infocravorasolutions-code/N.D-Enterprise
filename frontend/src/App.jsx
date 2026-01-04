import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import Supervisor from './pages/Supervisor'
import Admins from './pages/Admins'
import MasterRollReport from './pages/MasterRollReport'
import AttendanceReports from './pages/AttendanceReports'
import SummaryReport from './pages/SummaryReport'
import { isAuthenticated } from './services/auth'
import './App.css'

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" replace />
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      // Auto-close sidebar on mobile by default
      if (mobile) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const closeSidebar = () => {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div className="app-container">
                {isMobile && sidebarOpen && (
                  <div className="sidebar-overlay" onClick={closeSidebar}></div>
                )}
                <Header onMenuClick={toggleSidebar} isMobile={isMobile} />
                <Sidebar 
                  isOpen={sidebarOpen} 
                  toggleSidebar={toggleSidebar}
                  isMobile={isMobile}
                  onNavClick={closeSidebar}
                />
                <div className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/employees" element={<Employees />} />
                    <Route path="/supervisor" element={<Supervisor />} />
                    <Route path="/admins" element={<Admins />} />
                    <Route path="/master-roll-report" element={<MasterRollReport />} />
                    <Route path="/attendance-reports" element={<AttendanceReports />} />
                    <Route path="/summary-report" element={<SummaryReport />} />
                  </Routes>
                </div>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  )
}

export default App

