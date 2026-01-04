import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FaUsers, 
  FaUserTie, 
  FaCheckCircle, 
  FaChartBar,
  FaUserPlus,
  FaFileAlt,
  FaClock,
  FaMoon,
  FaSun
} from 'react-icons/fa'
import { dashboardAPI } from '../services/api'
import './Page.css'
import './Dashboard.css'

const Dashboard = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalManagers: 0,
    workingEmployees: 0,
    shiftWise: {}
  })
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [userData, setUserData] = useState(null)

  useEffect(() => {
    fetchDashboardData()
    // Get user data
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
    setUserData(storedUser)
    
    // Update time every minute
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    
    return () => clearInterval(timeInterval)
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await dashboardAPI.getData()
      console.log('Dashboard API Response:', response)
      
      // Handle different response structures
      const data = response?.data || response
      if (data) {
        setStats({
          totalEmployees: data.totalEmployees || 0,
          totalManagers: data.totalManagers || 0,
          workingEmployees: data.workingEmployees || 0,
          shiftWise: data.shiftWise || {}
        })
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setStats({
        totalEmployees: 0,
        totalManagers: 0,
        workingEmployees: 0,
        shiftWise: {}
      })
    } finally {
      setLoading(false)
    }
  }

  // Normalize shift keys to handle case variations
  const shiftWise = stats.shiftWise || {}
  const nightShiftCount = shiftWise.night || shiftWise.Night || shiftWise.NIGHT || 0
  const morningCount = shiftWise.morning || shiftWise.Morning || shiftWise.MORNING || 0
  const eveningCount = shiftWise.evening || shiftWise.Evening || shiftWise.EVENING || 0

  // Get greeting based on time
  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour >= 5 && hour < 12) return 'Good Morning'
    if (hour >= 12 && hour < 17) return 'Good Afternoon'
    if (hour >= 17 && hour < 21) return 'Good Evening'
    return 'Good Night'
  }

  // Get greeting icon
  const getGreetingIcon = () => {
    const hour = currentTime.getHours()
    if (hour >= 5 && hour < 19) return <FaSun />
    return <FaMoon />
  }

  // Format date
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  // Format time
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }

  // Get user initial
  const getUserInitial = () => {
    const name = userData?.name || 'User'
    return name.charAt(0).toUpperCase()
  }

  // Calculate max value for chart (ensure at least 1 to avoid division by zero)
  const maxChartValue = Math.max(morningCount, eveningCount, nightShiftCount, 1)
  const chartHeight = 100

  // Calculate bar heights as percentages (minimum 5% if value > 0 for visibility)
  const morningHeight = morningCount > 0 
    ? Math.max((morningCount / maxChartValue) * chartHeight, 5) 
    : 0
  const eveningHeight = eveningCount > 0 
    ? Math.max((eveningCount / maxChartValue) * chartHeight, 5) 
    : 0
  const nightHeight = nightShiftCount > 0 
    ? Math.max((nightShiftCount / maxChartValue) * chartHeight, 5) 
    : 0

  // Debug logging
  useEffect(() => {
    if (!loading) {
      console.log('Chart Data:', {
        morningCount,
        eveningCount,
        nightShiftCount,
        maxChartValue,
        morningHeight,
        eveningHeight,
        nightHeight,
        shiftWise: stats.shiftWise
      })
    }
  }, [loading, morningCount, eveningCount, nightShiftCount, stats.shiftWise])

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">
            {getGreeting()}, {userData?.name || 'User'}! Here's an overview of your platform.
          </p>
        </div>
      </div>
      <div className="page-content">
        {/* Greeting Card */}
        <div className="greeting-card">
          <div className="greeting-left">
            <div className="greeting-avatar">
              {getUserInitial()}
            </div>
            <div className="greeting-text">
              <div className="greeting-title">
                {getGreetingIcon()}
                <span>{getGreeting()}, {userData?.name || 'User'}!</span>
              </div>
              <div className="greeting-date">{formatDate(currentTime)}</div>
            </div>
          </div>
          <div className="greeting-time">
            <div className="current-time">{formatTime(currentTime)}</div>
            <div className="current-time-label">Current Time</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon"><FaUsers /></div>
            <div className="stat-info">
              <h3>Total Employees</h3>
              <p className="stat-value">{loading ? '...' : stats.totalEmployees}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><FaUserTie /></div>
            <div className="stat-info">
              <h3>Total Supervisors</h3>
              <p className="stat-value">{loading ? '...' : stats.totalManagers}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><FaCheckCircle /></div>
            <div className="stat-info">
              <h3>Working Employees</h3>
              <p className="stat-value">{loading ? '...' : stats.workingEmployees}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><FaChartBar /></div>
            <div className="stat-info">
              <h3>Night Shift</h3>
              <p className="stat-value">{loading ? '...' : nightShiftCount}</p>
            </div>
          </div>
        </div>

        {/* Chart and Quick Actions Grid */}
        <div className="dashboard-grid">
          {/* Shift-wise Attendance Chart */}
          <div className="content-section chart-section">
            <h2 className="section-title">Shift-wise Attendance</h2>
            <div className="chart-container">
              <div className="chart-bars">
                <div className="chart-bar-group">
                  <div className="chart-bar">
                    <div className="chart-bar-fill chart-bar-morning" style={{ height: `${morningHeight}%` }}></div>
                    <div className="chart-bar-value">{morningCount}</div>
                  </div>
                  <div className="chart-bar-label">Morning</div>
                </div>
                <div className="chart-bar-group">
                  <div className="chart-bar">
                    <div className="chart-bar-fill chart-bar-evening" style={{ height: `${eveningHeight}%` }}></div>
                    <div className="chart-bar-value">{eveningCount}</div>
                  </div>
                  <div className="chart-bar-label">Evening</div>
                </div>
                <div className="chart-bar-group">
                  <div className="chart-bar">
                    <div className="chart-bar-fill chart-bar-night" style={{ height: `${nightHeight}%` }}></div>
                    <div className="chart-bar-value">{nightShiftCount}</div>
                  </div>
                  <div className="chart-bar-label">Night</div>
                </div>
              </div>
              <div className="chart-y-axis">
                {[0, 25, 50, 75, 100].map((value) => (
                  <div key={value} className="chart-y-label">
                    {Math.round((value / 100) * maxChartValue)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="content-section quick-actions-section">
            <h2 className="section-title">Quick Actions</h2>
            <div className="quick-actions-grid">
              <div className="quick-action-card" onClick={() => navigate('/employees')}>
                <div className="quick-action-icon">
                  <FaUserPlus />
                </div>
                <div className="quick-action-content">
                  <h3>Add New Employee</h3>
                  <p>Create employee profile</p>
                </div>
              </div>
              <div className="quick-action-card" onClick={() => navigate('/summary-report')}>
                <div className="quick-action-icon">
                  <FaFileAlt />
                </div>
                <div className="quick-action-content">
                  <h3>Generate Report</h3>
                  <p>Export attendance data</p>
                </div>
              </div>
              <div className="quick-action-card" onClick={() => navigate('/master-roll-report')}>
                <div className="quick-action-icon">
                  <FaClock />
                </div>
                <div className="quick-action-content">
                  <h3>Bulk Step-In</h3>
                  <p>Clock in all employees for a shift</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

