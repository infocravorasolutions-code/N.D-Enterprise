import React from 'react'
import { FaBars, FaSync } from 'react-icons/fa'
import ndLogo from '../images/Logo.jpg'
import './Header.css'

const Header = ({ onMenuClick, isMobile }) => {
  const handleRefresh = () => {
    // Reload the page for React Native WebView
    window.location.reload()
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
              className="header-action-btn" 
              onClick={handleRefresh} 
              aria-label="Refresh page"
              title="Refresh"
            >
              <FaSync />
            </button>
            <button 
              className="header-action-btn" 
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

