import React from 'react'
import { FaBars } from 'react-icons/fa'
import './Header.css'

const Header = ({ onMenuClick, isMobile }) => {
  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-logo">
          <div className="logo-icon">ND</div>
          {!isMobile && <span className="logo-text">ND Enterprise</span>}
        </div>
        {isMobile && (
          <button 
            className="header-menu-btn" 
            onClick={onMenuClick} 
            aria-label="Open menu"
          >
            <FaBars />
          </button>
        )}
      </div>
    </header>
  )
}

export default Header

