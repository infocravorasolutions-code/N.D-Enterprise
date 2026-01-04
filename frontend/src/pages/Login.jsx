import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa'
import { adminAPI, managerAPI, setToken } from '../services/api'
import { isAuthenticated } from '../services/auth'
import './Login.css'

const Login = () => {
  const navigate = useNavigate()
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    userType: 'admin' // 'admin' or 'manager'
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('') // Clear error on input change
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let response
      
      if (formData.userType === 'admin') {
        response = await adminAPI.login(formData.email, formData.password)
      } else {
        response = await managerAPI.login(formData.email, formData.password)
      }

      if (response && response.token) {
        // Store token
        setToken(response.token)
        
        // Store user data
        const userData = response.admin || response.manager
        if (userData) {
          localStorage.setItem('user', JSON.stringify(userData))
          localStorage.setItem('userType', formData.userType)
          if (formData.userType === 'admin') {
            localStorage.setItem('adminId', userData._id)
          }
        }

        // Redirect to dashboard
        navigate('/dashboard')
      } else {
        setError('Login failed. Please check your credentials.')
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <div className="logo-icon">ND</div>
            <h1>ND Enterprise</h1>
          </div>
          <p className="login-subtitle">Admin Panel</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="user-type-selector">
            <button
              type="button"
              className={`user-type-btn ${formData.userType === 'admin' ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, userType: 'admin' })}
            >
              Admin
            </button>
            <button
              type="button"
              className={`user-type-btn ${formData.userType === 'manager' ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, userType: 'manager' })}
            >
              Manager
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="input-wrapper">
              <FaEnvelope className="input-icon" />
              <input
                type="email"
                name="email"
                className="form-input"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrapper">
              <FaLock className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="form-input"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-btn"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <p>© 2026 ND Enterprise. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

export default Login

