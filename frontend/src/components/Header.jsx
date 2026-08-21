import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaBars, FaSync, FaSignOutAlt } from 'react-icons/fa'
import { removeToken } from '../services/api'
import ndLogo from '../images/Logo.jpg'
import './Header.css'

const Header = ({ onMenuClick, isMobile, hideMenu = false }) => {
  const navigate = useNavigate()

  const handleLogout = () => {
    removeToken()
    localStorage.removeItem('user')
    localStorage.removeItem('userType')
    localStorage.removeItem('adminId')
    navigate('/login')
  }

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="app-header-actions">
          {hideMenu ? (
            <button 
              className="header-action-btn header-logout-btn" 
              onClick={handleLogout} 
              aria-label="Logout"
              title="Logout"
            >
              <FaSignOutAlt />
              {!isMobile && <span style={{ marginLeft: '8px' }}>Logout</span>}
            </button>
          ) : (
            <button 
              className="header-action-btn header-menu-btn" 
              onClick={onMenuClick} 
              aria-label="Open menu"
              title="Menu"
            >
              <FaBars />
            </button>
          )}
        </div>
        <div className="header-logo">
          <img src={ndLogo} alt="ND Enterprise Logo" className="header-logo-image" />
          <span className="logo-text">ND Enterprise</span>
        </div>
      </div>
    </header>
  )
}

export default Header

