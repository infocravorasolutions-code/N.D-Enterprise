import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaBuilding, FaMapMarkerAlt, FaCalendarAlt, FaUsers, FaUserTie, FaChartBar, FaEye, FaPlus, FaFilter } from 'react-icons/fa'
import { siteAPI } from '../services/api'
import './Page.css'

const Sites = () => {
  const navigate = useNavigate()
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const userType = localStorage.getItem('userType') || 'admin'
  const isAdmin = userType === 'admin'

  useEffect(() => {
    fetchSites()
  }, [statusFilter])

  const fetchSites = async () => {
    try {
      setLoading(true)
      const params = {}
      if (statusFilter) {
        params.status = statusFilter
      }
      const response = await siteAPI.getAll(params)
      setSites(response.data || [])
    } catch (error) {
      console.error('Error fetching sites:', error)
      alert('Failed to fetch sites. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleViewSite = (siteId) => {
    navigate(`/sites/${siteId}`)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
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

  const filteredSites = sites.filter(site => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      site.name?.toLowerCase().includes(query) ||
      site.location?.toLowerCase().includes(query) ||
      site.description?.toLowerCase().includes(query)
    )
  })

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Sites & Events</h1>
          <p className="page-subtitle">Loading sites...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <div>
            <h1>Sites & Events</h1>
            <p className="page-subtitle">Manage and view all sites and events</p>
          </div>
          {isAdmin && (
            <button className="btn-primary" onClick={() => navigate('/sites/new')}>
              <FaPlus style={{ marginRight: '8px' }} />
              Create Site
            </button>
          )}
        </div>
      </div>

      <div className="page-content">
        {/* Filters */}
        <div className="filters-container">
          <div className="filter-group">
            <label htmlFor="search">
              <FaFilter style={{ marginRight: '8px' }} />
              Search
            </label>
            <input
              id="search"
              type="text"
              className="form-input"
              placeholder="Search by name, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              className="form-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Sites Grid */}
        <div className="content-section">
          <div className="section-header">
            <h2>All Sites ({filteredSites.length})</h2>
          </div>

          {filteredSites.length === 0 ? (
            <div className="empty-state">
              <p>No sites found. {isAdmin && 'Create your first site to get started.'}</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '20px'
            }}>
              {filteredSites.map((site) => (
                <div
                  key={site._id}
                  style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '24px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                  onClick={() => handleViewSite(site._id)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '16px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: '20px',
                        fontWeight: '600',
                        color: '#1f2937',
                        marginBottom: '8px'
                      }}>
                        {site.name}
                      </h3>
                      <span className={`status-badge ${getStatusBadgeClass(site.status)}`}>
                        {site.status?.charAt(0).toUpperCase() + site.status?.slice(1)}
                      </span>
                    </div>
                    <FaEye style={{
                      color: '#8b5cf6',
                      fontSize: '20px',
                      cursor: 'pointer'
                    }} />
                  </div>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#6b7280',
                      fontSize: '14px'
                    }}>
                      <FaMapMarkerAlt />
                      <span>{site.location}</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#6b7280',
                      fontSize: '14px'
                    }}>
                      <FaCalendarAlt />
                      <span>
                        {formatDate(site.startDate)} - {formatDate(site.endDate)}
                      </span>
                    </div>
                    {site.description && (
                      <p style={{
                        color: '#6b7280',
                        fontSize: '14px',
                        margin: 0,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {site.description}
                      </p>
                    )}
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid #e5e7eb',
                    fontSize: '14px',
                    color: '#6b7280'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FaBuilding />
                      <span>View Details</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Sites

