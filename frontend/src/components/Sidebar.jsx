import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  FaChartBar, 
  FaUsers, 
  FaUserTie, 
  FaClipboardList, 
  FaCalendarAlt, 
  FaChartLine,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaShieldAlt,
  FaSignOutAlt,
  FaBuilding
} from 'react-icons/fa'
import { removeToken } from '../services/api'
import { getStoredUser } from '../services/auth'
import ndLogo from '../images/Logo.jpg'
import './Sidebar.css'

const Sidebar = ({ isOpen, toggleSidebar, isMobile, onNavClick }) => {
  const location = useLocation()
  const navigate = useNavigate()
  
  // Get user data from localStorage
  const userData = JSON.parse(localStorage.getItem('user') || '{}')
  const userType = localStorage.getItem('userType') || 'admin'
  const userEmail = userData.email || 'user@example.com'
  const userName = userData.name || 'User'
  const userInitial = userName.charAt(0).toUpperCase()

  // Check if readonly admin with assigned site
  const isReadonlyAdminWithSite = userType === 'admin' && userData.role === 'readonly' && userData.siteId

  // Admin menu items
  const adminMenuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: FaChartBar },
    { path: '/employees', label: 'Employees', icon: FaUsers },
    { path: '/supervisor', label: 'Supervisor', icon: FaUserTie },
    ...(isReadonlyAdminWithSite ? [] : [{ path: '/sites', label: 'Sites & Events', icon: FaBuilding }]), // Hide for readonly admins with site
    ...(isReadonlyAdminWithSite ? [] : [{ path: '/admins', label: 'Admins', icon: FaShieldAlt }]), // Hide for readonly admins with site
    { path: '/master-roll-report', label: 'Muster Roll', icon: FaClipboardList },
    { path: '/attendance-reports', label: 'Reports', icon: FaCalendarAlt },
    { path: '/summary-report', label: 'Summary Report', icon: FaChartLine },
  ]

  // Manager menu items (limited access)
  const managerMenuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: FaChartBar },
    { path: '/employees', label: 'My Employees', icon: FaUsers },
    { path: '/attendance-reports', label: 'Reports', icon: FaCalendarAlt },
    { path: '/summary-report', label: 'Summary Report', icon: FaChartLine },
  ]

  // Select menu items based on user type
  const menuItems = userType === 'manager' ? managerMenuItems : adminMenuItems

  const handleNavClick = () => {
    if (onNavClick) {
      onNavClick()
    }
  }

  const handleLogout = () => {
    // Clear all stored data
    removeToken()
    localStorage.removeItem('user')
    localStorage.removeItem('userType')
    localStorage.removeItem('adminId')
    
    // Redirect to login
    navigate('/login')
  }

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'} ${isMobile ? 'mobile' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo-section">
          <img src={ndLogo} alt="ND Enterprise Logo" className="sidebar-logo-image" />
          {isOpen && (
            <div className="sidebar-logo-text">
          <h2 className="sidebar-logo">ND Enterprise</h2>
              <p className="sidebar-subtitle">{userType === 'manager' ? 'Manager Panel' : 'Admin Panel'}</p>
            </div>
          )}
        </div>
        {isMobile && (
          <button className="close-btn" onClick={toggleSidebar} aria-label="Close menu">
            <FaTimes />
          </button>
        )}
        {!isMobile && (
          <button className="toggle-btn" onClick={toggleSidebar} aria-label="Toggle sidebar">
            {isOpen ? <FaChevronLeft /> : <FaChevronRight />}
          </button>
        )}
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const IconComponent = item.icon
          const isActive = location.pathname === item.path || 
            (item.path === '/dashboard' && location.pathname === '/') ||
            (item.path === '/sites' && location.pathname.startsWith('/sites'))
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              <span className="nav-icon"><IconComponent /></span>
              {isOpen && <span className="nav-label">{item.label}</span>}
            </Link>
          )
        })}
      </nav>
      {isOpen && (
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">{userInitial}</div>
            <div className="user-info">
              <div className="user-name">{userName}</div>
              <div className="user-email">{userEmail}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <FaSignOutAlt />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default Sidebar

