import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
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

// Readonly Admin Site Redirect Component
const ReadonlyAdminRedirect = () => {
  const userData = JSON.parse(localStorage.getItem('user') || '{}')
  const userType = localStorage.getItem('userType')
  const location = useLocation()
  
  // Only redirect if readonly admin is NOT already on a site route
  if (userType === 'admin' && userData.role === 'readonly' && userData.siteId) {
    const currentPath = location.pathname
    // Don't redirect if already on a site route (site details or sub-pages)
    // Allow access to: /sites/:id, /sites/:id/employees, /sites/:id/managers, etc.
    if (!currentPath.startsWith('/sites/')) {
      return <Navigate to={`/sites/${userData.siteId}`} replace />
    }
    // If on /sites route (list), redirect to their assigned site
    if (currentPath === '/sites') {
      return <Navigate to={`/sites/${userData.siteId}`} replace />
    }
  }
  return null
}

// Sites List Route - redirect readonly admins to their site
const SitesRoute = ({ children }) => {
  const userData = JSON.parse(localStorage.getItem('user') || '{}')
  const userType = localStorage.getItem('userType')
  
  if (userType === 'admin' && userData.role === 'readonly' && userData.siteId) {
    return <Navigate to={`/sites/${userData.siteId}`} replace />
  }
  return <AdminOnlyRoute>{children}</AdminOnlyRoute>
}

// Site Sub-Routes - Allow readonly admins to access their assigned site's sub-pages
const SiteSubRoute = ({ children }) => {
  const userData = JSON.parse(localStorage.getItem('user') || '{}')
  const userType = localStorage.getItem('userType')
  
  // Readonly admins are still admins, so they can access admin routes
  // The individual pages will check if they're accessing their assigned site
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

  // Check if readonly admin with assigned site (should hide sidebar)
  const userData = JSON.parse(localStorage.getItem('user') || '{}')
  const userType = localStorage.getItem('userType')
  const isReadonlyAdminWithSite = userType === 'admin' && userData.role === 'readonly' && userData.siteId

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
                {!isReadonlyAdminWithSite && isMobile && sidebarOpen && (
                  <div className="sidebar-overlay" onClick={closeSidebar}></div>
                )}
                <Header 
                  onMenuClick={toggleSidebar} 
                  isMobile={isMobile}
                  hideMenu={isReadonlyAdminWithSite}
                />
                {!isReadonlyAdminWithSite && (
                  <Sidebar 
                    isOpen={sidebarOpen} 
                    toggleSidebar={toggleSidebar}
                    isMobile={isMobile}
                    onNavClick={closeSidebar}
                  />
                )}
                <div className={`main-content ${isReadonlyAdminWithSite ? 'full-width' : (sidebarOpen ? 'sidebar-open' : 'sidebar-closed')}`}>
                  <ReadonlyAdminRedirect />
                  <Routes>
                    <Route path="/" element={
                      (() => {
                        const userData = JSON.parse(localStorage.getItem('user') || '{}')
                        const userType = localStorage.getItem('userType')
                        if (userType === 'admin' && userData.role === 'readonly' && userData.siteId) {
                          return <Navigate to={`/sites/${userData.siteId}`} replace />
                        }
                        return <Navigate to="/dashboard" replace />
                      })()
                    } />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/employees" element={<Employees />} />
                    <Route path="/supervisor" element={<AdminOnlyRoute><Supervisor /></AdminOnlyRoute>} />
                    <Route path="/admins" element={<AdminOnlyRoute><Admins /></AdminOnlyRoute>} />
                    <Route path="/master-roll-report" element={<AdminOnlyRoute><MasterRollReport /></AdminOnlyRoute>} />
                    <Route path="/attendance-reports" element={<AttendanceReports />} />
                    <Route path="/summary-report" element={<SummaryReport />} />
                    <Route path="/sites" element={<SitesRoute><Sites /></SitesRoute>} />
                    <Route path="/sites/new" element={<AdminOnlyRoute><CreateSite /></AdminOnlyRoute>} />
                    <Route path="/sites/:id" element={<SiteSubRoute><SiteDetails /></SiteSubRoute>} />
                    <Route path="/sites/:id/edit" element={<SiteSubRoute><EditSite /></SiteSubRoute>} />
                    <Route path="/sites/:id/employees" element={<SiteSubRoute><SiteEmployees /></SiteSubRoute>} />
                    <Route path="/sites/:id/managers" element={<SiteSubRoute><SiteManagers /></SiteSubRoute>} />
                    <Route path="/sites/:id/attendance" element={<SiteSubRoute><SiteAttendance /></SiteSubRoute>} />
                    <Route path="/sites/:id/muster-roll" element={<SiteSubRoute><SiteMasterRollReport /></SiteSubRoute>} />
                    <Route path="/sites/:id/summary-report" element={<SiteSubRoute><SiteSummaryReport /></SiteSubRoute>} />
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

