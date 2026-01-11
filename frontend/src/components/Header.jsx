import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaBars, FaSync, FaSignOutAlt } from 'react-icons/fa'
import { removeToken } from '../services/api'
import ndLogo from '../images/Logo.jpg'
import './Header.css'

const Header = ({ onMenuClick, isMobile, hideMenu = false }) => {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const navigate = useNavigate()

  const handleRefresh = () => {
    setIsRefreshing(true)
    // Reload the page for React Native WebView
    setTimeout(() => {
      window.location.reload()
    }, 300)
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
    <header className="app-header">
      <div className="header-content">
        <div className="header-logo">
          <img src={ndLogo} alt="ND Enterprise Logo" className="header-logo-image" />
          {!isMobile && <span className="logo-text">ND Enterprise</span>}
        </div>
        <div className="header-actions">
          {hideMenu && (
            <button 
              className="header-action-btn header-logout-btn" 
              onClick={handleLogout} 
              aria-label="Logout"
              title="Logout"
            >
              <FaSignOutAlt />
              {!isMobile && <span style={{ marginLeft: '8px' }}>Logout</span>}
            </button>
          )}
          {isMobile && (
            <>
              {!hideMenu && (
                <button 
                  className={`header-action-btn header-refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
                  onClick={handleRefresh} 
                  aria-label="Refresh page"
                  title="Refresh"
                  disabled={isRefreshing}
                >
                  <FaSync />
                </button>
              )}
              {!hideMenu && (
                <button 
                  className="header-action-btn header-menu-btn" 
                  onClick={onMenuClick} 
                  aria-label="Open menu"
                  title="Menu"
                >
                  <FaBars />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header

