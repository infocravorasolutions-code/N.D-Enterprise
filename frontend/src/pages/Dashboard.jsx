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
  FaSun,
  FaArrowRight,
  FaUser,
  FaSync,
  FaSignOutAlt,
  FaBuilding,
  FaMapMarkerAlt,
  FaCalendarAlt
} from 'react-icons/fa'
import { dashboardAPI, employeeAPI, attendanceAPI, siteAPI } from '../services/api'
import { getStaticUrl } from '../config'
import AddEmployeeModal from '../components/AddEmployeeModal'
import ClockInModal from '../components/ClockInModal'
import './Page.css'
import './Dashboard.css'

const Dashboard = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalManagers: 0,
    workingEmployees: 0,
    shiftWise: {},
    siteInsights: null
  })
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [userData, setUserData] = useState(null)
  const [employees, setEmployees] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [clockInEmployee, setClockInEmployee] = useState(null)
  
  // Get user type
  const userType = localStorage.getItem('userType') || 'admin'
  const isManager = userType === 'manager'

  useEffect(() => {
    fetchDashboardData()
    // Get user data
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
    setUserData(storedUser)
    
    // Fetch employees if manager
    if (isManager) {
      fetchEmployees()
    }
    
    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    
    return () => clearInterval(timeInterval)
  }, [isManager])

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
          shiftWise: data.shiftWise || {},
          siteInsights: data.siteInsights || null
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

  const fetchEmployees = async () => {
    try {
      const response = await employeeAPI.getAll()
      const employeesList = Array.isArray(response) 
        ? response 
        : (response?.data || [])
      setEmployees(employeesList)
    } catch (error) {
      console.error('Error fetching employees:', error)
      setEmployees([])
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([fetchDashboardData(), fetchEmployees()])
    setRefreshing(false)
  }

  const handleClockInClick = (employee) => {
    setClockInEmployee(employee)
  }

  const handleClockInConfirm = async (clockInData, photoFile) => {
    try {
      // Get manager ID from user data
      const userData = JSON.parse(localStorage.getItem('user') || '{}')
      const managerId = userData._id || userData.id
      
      // Get siteId if manager is a site manager
      const siteId = userData.siteId || null

      // Prepare clock in data
      const finalClockInData = {
        ...clockInData,
        managerId: managerId,
        siteId: siteId // Include siteId for site managers
      }

      console.log('[handleClockInConfirm] Clocking in with data:', finalClockInData)

      // Clock in with photo
      await attendanceAPI.stepIn(finalClockInData, photoFile)

      // Refresh data
      await handleRefresh()
      setClockInEmployee(null)
      alert(`${clockInEmployee?.name} clocked in successfully`)
    } catch (error) {
      console.error('Error clocking in:', error)
      alert(error.message || 'Failed to clock in employee')
    }
  }

  const handleCloseClockIn = () => {
    setClockInEmployee(null)
  }

  const handleClockOut = async (employeeId) => {
    if (!window.confirm('Are you sure you want to clock out this employee?')) {
      return
    }
    
    try {
      // Method 1: Try to get attendance directly by employeeId (more reliable)
      let openAttendance = null
      
      try {
        const employeeAttendanceResponse = await attendanceAPI.getByEmployee(employeeId)
        const employeeAttendances = employeeAttendanceResponse?.attendance || employeeAttendanceResponse?.data || []
        
        // Find the most recent open attendance (no stepOut)
        openAttendance = employeeAttendances
          .filter(att => !att.stepOut)
          .sort((a, b) => new Date(b.stepIn || b.createdAt) - new Date(a.stepIn || a.createdAt))[0]
        
        if (openAttendance) {
          console.log('[handleClockOut] Found open attendance via employeeId query:', openAttendance._id)
        }
      } catch (err) {
        console.log('[handleClockOut] Employee-specific query failed, trying getAll:', err.message)
      }
      
      // Method 2: Fallback to getAll if direct query didn't work
      if (!openAttendance) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
        const sevenDaysAgo = new Date(today)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const attendanceResponse = await attendanceAPI.getAll({
          startDate: sevenDaysAgo.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
          employeeId: employeeId // Pass employeeId directly to filter
      })
      
        const attendances = attendanceResponse?.data || attendanceResponse?.attendance || []
        console.log('[handleClockOut] Total attendances found via getAll:', attendances.length)
        
        const employeeIdStr = String(employeeId)
        
        openAttendance = attendances.find(att => {
          let attEmployeeId = null
          if (att.employeeId) {
            if (typeof att.employeeId === 'object' && att.employeeId._id) {
              attEmployeeId = String(att.employeeId._id)
            } else {
              attEmployeeId = String(att.employeeId)
            }
          }
          
          return attEmployeeId === employeeIdStr && !att.stepOut
        })
      }

      if (!openAttendance) {
        console.log('[handleClockOut] No open attendance found for employeeId:', employeeId)
        alert('No active attendance record found for this employee. Make sure the employee has clocked in today.')
        return
      }

      // Clock out
      const attendanceId = openAttendance._id || openAttendance.id
      console.log('[handleClockOut] Clocking out attendance:', attendanceId)
      
      await attendanceAPI.stepOut({
        attendanceId: attendanceId
      })

      // Refresh data
      await handleRefresh()
      alert('Employee clocked out successfully')
    } catch (error) {
      console.error('Error clocking out:', error)
      alert(error.message || 'Failed to clock out employee')
    }
  }

  const handleSaveEmployee = async (data) => {
    try {
      const employeeData = {
        name: data.fullName,
        email: data.email || '',
        mobile: data.mobile || '',
        address: data.address || '',
        shift: data.shift,
      }
      await employeeAPI.createByManager(employeeData, data.photo)
      await handleRefresh()
      setIsModalOpen(false)
    } catch (err) {
      console.error('Error saving employee:', err)
      alert(err.message || 'Failed to add employee')
    }
  }

  const getImageUrl = (image) => {
    return getStaticUrl(image)
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

  // Manager Dashboard View
  if (isManager) {
    const clockedInCount = employees.filter(emp => emp.isWorking).length
    const onLeaveCount = employees.filter(emp => !emp.isWorking).length

    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1>Supervisor Dashboard</h1>
            <p className="page-subtitle">
              {getGreeting()}, {userData?.name || 'User'}! Here's an overview of your team.
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
              <div className="stat-icon"><FaArrowRight /></div>
              <div className="stat-info">
                <h3>Clocked In</h3>
                <p className="stat-value">{loading ? '...' : clockedInCount}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><FaArrowRight /></div>
              <div className="stat-info">
                <h3>On Leave</h3>
                <p className="stat-value">{loading ? '...' : onLeaveCount}</p>
              </div>
            </div>
          </div>

          {/* Team Attendance Section */}
          <div className="content-section">
            <div className="section-header">
              <div>
                <h2 className="section-title">Team Attendance</h2>
                <p className="section-subtitle">Team Attendance ({employees.length})</p>
              </div>
              <div className="section-actions">
                <button 
                  className="btn-secondary" 
                  onClick={() => setIsModalOpen(true)}
                  style={{ marginRight: '10px' }}
                >
                  <FaUserPlus style={{ marginRight: '5px' }} />
                  Add Employee
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <FaSync className={refreshing ? 'spinning' : ''} style={{ marginRight: '5px' }} />
                  Refresh
                </button>
              </div>
            </div>
            
            {/* Desktop Table View */}
            <div className="table-container desktop-only">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Shift</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="empty-state">Loading...</td>
                    </tr>
                  ) : employees.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="empty-state">No employees found</td>
                    </tr>
                  ) : (
                    employees.map((employee) => (
                      <tr key={employee._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="employee-photo" style={{ width: '40px', height: '40px' }}>
                              {getImageUrl(employee.image) ? (
                                <img src={getImageUrl(employee.image)} alt={employee.name} />
                              ) : (
                                <FaUser />
                              )}
                            </div>
                            <span>{employee.name}</span>
                          </div>
                        </td>
                        <td>{employee.email || '-'}</td>
                        <td>
                          <span style={{ textTransform: 'capitalize' }}>{employee.shift || '-'}</span>
                        </td>
                        <td>
                          <span className={`status-badge ${employee.isWorking ? 'status-active' : 'status-inactive'}`}>
                            {employee.isWorking ? 'Clocked In' : 'On Leave'}
                          </span>
                        </td>
                        <td>
                          {employee.isWorking ? (
                            <button
                              className="btn-clock-out"
                              onClick={() => handleClockOut(employee._id)}
                            >
                              <FaSignOutAlt style={{ marginRight: '5px' }} />
                              Clock Out
                            </button>
                          ) : (
                            <button
                              className="btn-clock-in"
                              onClick={() => handleClockInClick(employee)}
                            >
                              <FaClock style={{ marginRight: '5px' }} />
                              Clock In
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="mobile-employee-cards mobile-only">
              {loading ? (
                <div className="empty-state">Loading...</div>
              ) : employees.length === 0 ? (
                <div className="empty-state">No employees found</div>
              ) : (
                employees.map((employee) => (
                  <div key={employee._id} className="employee-card-mobile">
                    <div className="employee-card-header">
                      <div className="employee-card-photo">
                        {getImageUrl(employee.image) ? (
                          <img src={getImageUrl(employee.image)} alt={employee.name} />
                        ) : (
                          <FaUser />
                        )}
                      </div>
                      <div className="employee-card-info">
                        <h3 className="employee-card-name">{employee.name}</h3>
                        <p className="employee-card-email">{employee.email || 'No email'}</p>
                      </div>
                    </div>
                    <div className="employee-card-details">
                      <div className="employee-detail-item">
                        <span className="detail-label">Shift:</span>
                        <span className="detail-value" style={{ textTransform: 'capitalize' }}>
                          {employee.shift || '-'}
                        </span>
                      </div>
                      <div className="employee-detail-item">
                        <span className="detail-label">Status:</span>
                        <span className={`status-badge ${employee.isWorking ? 'status-active' : 'status-inactive'}`}>
                          {employee.isWorking ? 'Clocked In' : 'On Leave'}
                        </span>
                      </div>
                    </div>
                    {employee.isWorking ? (
                      <button
                        className="btn-clock-out-mobile"
                        onClick={() => handleClockOut(employee._id)}
                      >
                        <FaSignOutAlt style={{ marginRight: '8px' }} />
                        Clock Out
                      </button>
                    ) : (
                      <button
                        className="btn-clock-in-mobile"
                        onClick={() => handleClockInClick(employee)}
                      >
                        <FaClock style={{ marginRight: '8px' }} />
                        Clock In
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <AddEmployeeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveEmployee}
          isManager={true}
        />
        <ClockInModal
          isOpen={!!clockInEmployee}
          onClose={handleCloseClockIn}
          employee={clockInEmployee}
          onConfirm={handleClockInConfirm}
        />
      </div>
    )
  }

  // Admin Dashboard View (existing)
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
          {stats.siteInsights && (
            <>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#8b5cf6' }}><FaBuilding /></div>
                <div className="stat-info">
                  <h3>Total Sites</h3>
                  <p className="stat-value">{stats.siteInsights.totalSites || 0}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#10b981' }}><FaCheckCircle /></div>
                <div className="stat-info">
                  <h3>Active Sites</h3>
                  <p className="stat-value">{stats.siteInsights.activeSites || 0}</p>
                </div>
              </div>
            </>
          )}
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

        {/* Site Insights Section (Admin Only) */}
        {stats.siteInsights && (
          <div className="content-section">
            <div className="section-header">
              <h2>Sites & Events Insights</h2>
              <button 
                className="btn-icon" 
                onClick={() => navigate('/sites')}
                style={{ fontSize: '14px' }}
              >
                View All <FaArrowRight style={{ marginLeft: '8px' }} />
              </button>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div style={{
                background: '#f9fafb',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Total Sites</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937', margin: 0 }}>
                  {stats.siteInsights.totalSites || 0}
                </p>
              </div>
              <div style={{
                background: '#f9fafb',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Active Sites</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#10b981', margin: 0 }}>
                  {stats.siteInsights.activeSites || 0}
                </p>
              </div>
              <div style={{
                background: '#f9fafb',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Completed Sites</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#6b7280', margin: 0 }}>
                  {stats.siteInsights.completedSites || 0}
                </p>
              </div>
              <div style={{
                background: '#f9fafb',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Upcoming Sites</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#8b5cf6', margin: 0 }}>
                  {stats.siteInsights.upcomingSites || 0}
                </p>
              </div>
            </div>

            {/* Recent Sites */}
            {stats.siteInsights.recentSites && stats.siteInsights.recentSites.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
                  Recent Sites
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                  gap: '12px'
                }}>
                  {stats.siteInsights.recentSites.map((site) => (
                    <div
                      key={site._id}
                      onClick={() => navigate(`/sites/${site._id}`)}
                      style={{
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#8b5cf6'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(139, 92, 246, 0.1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e5e7eb'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                          {site.name}
                        </h4>
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: site.status === 'active' ? '#d1fae5' : site.status === 'completed' ? '#e5e7eb' : '#fef3c7',
                          color: site.status === 'active' ? '#065f46' : site.status === 'completed' ? '#6b7280' : '#92400e'
                        }}>
                          {site.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FaMapMarkerAlt style={{ fontSize: '10px' }} />
                        <span>{site.location}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Sites by Employees */}
            {stats.siteInsights.topSites && stats.siteInsights.topSites.length > 0 && (
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
                  Top Sites by Employees
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                  gap: '12px'
                }}>
                  {stats.siteInsights.topSites.map((site, index) => (
                    <div
                      key={site.siteId}
                      onClick={() => navigate(`/sites/${site.siteId}`)}
                      style={{
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#8b5cf6'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(139, 92, 246, 0.1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e5e7eb'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                            #{index + 1}
                          </div>
                          <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                            {site.name}
                          </h4>
                        </div>
                        <div style={{
                          fontSize: '18px',
                          fontWeight: '700',
                          color: '#8b5cf6'
                        }}>
                          {site.employeeCount}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FaMapMarkerAlt style={{ fontSize: '10px' }} />
                        <span>{site.location}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard

