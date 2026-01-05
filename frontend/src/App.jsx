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
import Sites from './pages/Sites'
import SiteDetails from './pages/SiteDetails'
import SiteEmployees from './pages/SiteEmployees'
import SiteManagers from './pages/SiteManagers'
import SiteAttendance from './pages/SiteAttendance'
import SiteMasterRollReport from './pages/SiteMasterRollReport'
import SiteSummaryReport from './pages/SiteSummaryReport'
import CreateSite from './pages/CreateSite'
import EditSite from './pages/EditSite'
import { isAuthenticated } from './services/auth'
import './App.css'

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" replace />
}

// Admin Only Route Component
const AdminOnlyRoute = ({ children }) => {
  const userType = localStorage.getItem('userType')
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  if (userType !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }
  return children
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
                    <Route path="/supervisor" element={<AdminOnlyRoute><Supervisor /></AdminOnlyRoute>} />
                    <Route path="/admins" element={<AdminOnlyRoute><Admins /></AdminOnlyRoute>} />
                    <Route path="/master-roll-report" element={<AdminOnlyRoute><MasterRollReport /></AdminOnlyRoute>} />
                    <Route path="/attendance-reports" element={<AttendanceReports />} />
                    <Route path="/summary-report" element={<SummaryReport />} />
                    <Route path="/sites" element={<AdminOnlyRoute><Sites /></AdminOnlyRoute>} />
                    <Route path="/sites/new" element={<AdminOnlyRoute><CreateSite /></AdminOnlyRoute>} />
                    <Route path="/sites/:id" element={<AdminOnlyRoute><SiteDetails /></AdminOnlyRoute>} />
                    <Route path="/sites/:id/edit" element={<AdminOnlyRoute><EditSite /></AdminOnlyRoute>} />
                    <Route path="/sites/:id/employees" element={<AdminOnlyRoute><SiteEmployees /></AdminOnlyRoute>} />
                    <Route path="/sites/:id/managers" element={<AdminOnlyRoute><SiteManagers /></AdminOnlyRoute>} />
                    <Route path="/sites/:id/attendance" element={<AdminOnlyRoute><SiteAttendance /></AdminOnlyRoute>} />
                    <Route path="/sites/:id/muster-roll" element={<AdminOnlyRoute><SiteMasterRollReport /></AdminOnlyRoute>} />
                    <Route path="/sites/:id/summary-report" element={<AdminOnlyRoute><SiteSummaryReport /></AdminOnlyRoute>} />
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

