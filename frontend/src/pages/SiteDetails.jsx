import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  FaUsers, 
  FaUserTie, 
  FaCheckCircle, 
  FaChartBar,
  FaArrowLeft,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaClock,
  FaSun,
  FaMoon,
  FaEdit
} from 'react-icons/fa'
import { siteAPI } from '../services/api'
import './Page.css'

const SiteDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [site, setSite] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview') // overview, employees, managers, attendance
  
  // Check if readonly admin with assigned site
  const userData = JSON.parse(localStorage.getItem('user') || '{}')
  const userType = localStorage.getItem('userType')
  const isReadonlyAdminWithSite = userType === 'admin' && userData.role === 'readonly' && userData.siteId

  useEffect(() => {
    // Check if readonly admin is trying to access a site they're not assigned to
    if (isReadonlyAdminWithSite && userData.siteId !== id) {
      navigate(`/sites/${userData.siteId}`, { replace: true })
      return
    }
    fetchSiteData()
    fetchSiteStats()
  }, [id, isReadonlyAdminWithSite, userData.siteId, navigate])

  const fetchSiteData = async () => {
    try {
      const response = await siteAPI.get(id)
      setSite(response.data)
    } catch (error) {
      console.error('Error fetching site:', error)
      alert('Failed to fetch site details. Please try again.')
    }
  }

  const fetchSiteStats = async () => {
    try {
      setLoading(true)
      const response = await siteAPI.getStats(id)
      setStats(response.statistics)
    } catch (error) {
      console.error('Error fetching site stats:', error)
      alert('Failed to fetch site statistics. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active':
        return 'status-active'
      case 'completed':
        return 'status-on-leave'
      case 'cancelled':
        return 'status-inactive'
      default:
        return 'status-inactive'
    }
  }

  if (loading && !site) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Loading Site Details...</h1>
        </div>
      </div>
    )
  }

  if (!site) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Site Not Found</h1>
          <button className="btn-primary" onClick={() => navigate('/sites')}>
            <FaArrowLeft style={{ marginRight: '8px' }} />
            Back to Sites
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <div>
            {!isReadonlyAdminWithSite && (
              <button 
                className="btn-icon" 
                onClick={() => navigate('/sites')}
                style={{ marginBottom: '12px' }}
              >
                <FaArrowLeft style={{ marginRight: '8px' }} />
                Back to Sites
              </button>
            )}
            <h1>{site.name}</h1>
            <p className="page-subtitle">
              <FaMapMarkerAlt style={{ marginRight: '6px', display: 'inline' }} />
              {site.location}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span className={`status-badge ${getStatusBadgeClass(site.status)}`}>
              {site.status?.charAt(0).toUpperCase() + site.status?.slice(1)}
            </span>
            {!isReadonlyAdminWithSite && (
              <button 
                className="btn-primary"
                onClick={() => navigate(`/sites/${id}/edit`)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <FaEdit style={{ fontSize: '14px' }} />
                Edit Site
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Site Info Card */}
        <div className="content-section">
          <div className="section-header">
            <h2>Site Information</h2>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px'
          }}>
            <div>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Start Date</p>
              <p style={{ fontSize: '16px', fontWeight: '500', color: '#1f2937', margin: 0 }}>
                <FaCalendarAlt style={{ marginRight: '8px', color: '#8b5cf6' }} />
                {formatDate(site.startDate)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>End Date</p>
              <p style={{ fontSize: '16px', fontWeight: '500', color: '#1f2937', margin: 0 }}>
                <FaCalendarAlt style={{ marginRight: '8px', color: '#8b5cf6' }} />
                {formatDate(site.endDate)}
              </p>
            </div>
            {site.description && (
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Description</p>
                <p style={{ fontSize: '16px', color: '#1f2937', margin: 0 }}>{site.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <FaUsers />
                </div>
                <div className="stat-info">
                  <h3>Total Employees</h3>
                  <div className="stat-value">{stats.totalEmployees || 0}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <FaUserTie />
                </div>
                <div className="stat-info">
                  <h3>Total Managers</h3>
                  <div className="stat-value">{stats.totalManagers || 0}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <FaCheckCircle />
                </div>
                <div className="stat-info">
                  <h3>Working Employees</h3>
                  <div className="stat-value">{stats.workingEmployees || 0}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <FaChartBar />
                </div>
                <div className="stat-info">
                  <h3>Attendance Records</h3>
                  <div className="stat-value">{stats.totalAttendanceRecords || 0}</div>
                </div>
              </div>
            </div>

            {/* Shift-wise Statistics */}
            <div className="content-section">
              <div className="section-header">
                <h2>Shift-wise Employee Distribution</h2>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px'
              }}>
                <div style={{
                  background: '#f9fafb',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <FaSun style={{ color: '#f59e0b', fontSize: '20px' }} />
                    <h4 style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Morning</h4>
                  </div>
                  <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
                    {stats.shiftWise?.morning || 0}
                  </p>
                </div>
                <div style={{
                  background: '#f9fafb',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <FaClock style={{ color: '#8b5cf6', fontSize: '20px' }} />
                    <h4 style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Evening</h4>
                  </div>
                  <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
                    {stats.shiftWise?.evening || 0}
                  </p>
                </div>
                <div style={{
                  background: '#f9fafb',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <FaMoon style={{ color: '#6366f1', fontSize: '20px' }} />
                    <h4 style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Night</h4>
                  </div>
                  <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
                    {stats.shiftWise?.night || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Today's Attendance */}
            <div className="content-section">
              <div className="section-header">
                <h2>Today's Attendance</h2>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                flexWrap: 'wrap'
              }}>
                <div>
                  <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Today</p>
                  <p style={{ fontSize: '28px', fontWeight: '700', color: '#1e40af', margin: 0 }}>
                    {stats.todayAttendance || 0}
                  </p>
                </div>
                {stats.todayShiftWise && Object.keys(stats.todayShiftWise).length > 0 && (
                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}>
                    {Object.entries(stats.todayShiftWise).map(([shift, count]) => (
                      <div key={shift}>
                        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                          {shift.charAt(0).toUpperCase() + shift.slice(1)}
                        </p>
                        <p style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                          {count}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Quick Actions */}
        <div className="content-section">
          <div className="section-header">
            <h2>Quick Actions</h2>
          </div>
          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <button 
              className="btn-primary"
              onClick={() => navigate(`/sites/${id}/employees`)}
            >
              View Employees
            </button>
            <button 
              className="btn-primary"
              onClick={() => navigate(`/sites/${id}/managers`)}
            >
              View Managers
            </button>
            <button 
              className="btn-primary"
              onClick={() => navigate(`/sites/${id}/attendance`)}
            >
              View Attendance
            </button>
            <button 
              className="btn-primary"
              onClick={() => navigate(`/sites/${id}/muster-roll`)}
            >
              Muster Roll Report
            </button>
            <button 
              className="btn-primary"
              onClick={() => navigate(`/sites/${id}/summary-report`)}
            >
              Summary Report
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SiteDetails

