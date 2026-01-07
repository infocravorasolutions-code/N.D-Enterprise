import React, { useState } from 'react'
import { FaBars, FaSync } from 'react-icons/fa'
import ndLogo from '../images/Logo.jpg'
import './Header.css'

const Header = ({ onMenuClick, isMobile }) => {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    // Reload the page for React Native WebView
    setTimeout(() => {
      window.location.reload()
    }, 300)
  }

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-logo">
          <img src={ndLogo} alt="ND Enterprise Logo" className="header-logo-image" />
          {!isMobile && <span className="logo-text">ND Enterprise</span>}
        </div>
        {isMobile && (
          <div className="header-actions">
            <button 
              className={`header-action-btn header-refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
              onClick={handleRefresh} 
              aria-label="Refresh page"
              title="Refresh"
              disabled={isRefreshing}
            >
              <FaSync />
            </button>
            <button 
              className="header-action-btn header-menu-btn" 
              onClick={onMenuClick} 
              aria-label="Open menu"
              title="Menu"
            >
              <FaBars />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header

