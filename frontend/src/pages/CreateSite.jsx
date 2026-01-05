import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaSave, FaTimes } from 'react-icons/fa'
import { siteAPI } from '../services/api'
import './Page.css'

const CreateSite = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'active'
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Site name is required'
    }
    
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required'
    }
    
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required'
    }
    
    if (!formData.endDate) {
      newErrors.endDate = 'End date is required'
    }
    
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate)
      const end = new Date(formData.endDate)
      if (start > end) {
        newErrors.endDate = 'End date must be after start date'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    try {
      setLoading(true)
      
      // Prepare data for API
      const siteData = {
        name: formData.name.trim(),
        location: formData.location.trim(),
        description: formData.description.trim() || '',
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: formData.status || 'active'
      }
      
      console.log('Creating site with data:', siteData)
      
      const response = await siteAPI.create(siteData)
      
      console.log('Site creation response:', response)
      
      if (response && (response.site || response.data)) {
        const siteId = response.site?._id || response.data?._id || response.site?._id
        alert('Site created successfully!')
        if (siteId) {
          navigate(`/sites/${siteId}`)
        } else {
          navigate('/sites')
        }
      } else if (response && response.message) {
        alert(response.message || 'Site created successfully!')
        navigate('/sites')
      } else {
        alert('Site created successfully!')
        navigate('/sites')
      }
    } catch (error) {
      console.error('Error creating site:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create site. Please try again.'
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
      navigate('/sites')
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <div>
            <button 
              className="btn-icon" 
              onClick={() => navigate('/sites')}
              style={{ marginBottom: '12px' }}
            >
              <FaArrowLeft style={{ marginRight: '8px' }} />
              Back to Sites
            </button>
            <h1>Create New Site/Event</h1>
            <p className="page-subtitle">Fill in the details to create a new site or event</p>
          </div>
        </div>
      </div>

      <div className="page-content">
        <div className="content-section">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Site/Event Name *</label>
              <input
                type="text"
                name="name"
                className="form-input"
                placeholder="e.g., Summer Festival 2024"
                value={formData.name}
                onChange={handleChange}
                required
              />
              {errors.name && <span style={{ color: '#dc2626', fontSize: '14px' }}>{errors.name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Location *</label>
              <input
                type="text"
                name="location"
                className="form-input"
                placeholder="e.g., Central Park, New York"
                value={formData.location}
                onChange={handleChange}
                required
              />
              {errors.location && <span style={{ color: '#dc2626', fontSize: '14px' }}>{errors.location}</span>}
            </div>

            <div className="form-row-group">
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input
                  type="date"
                  name="startDate"
                  className="form-input"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                />
                {errors.startDate && <span style={{ color: '#dc2626', fontSize: '14px' }}>{errors.startDate}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">End Date *</label>
                <input
                  type="date"
                  name="endDate"
                  className="form-input"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                />
                {errors.endDate && <span style={{ color: '#dc2626', fontSize: '14px' }}>{errors.endDate}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                name="status"
                className="form-input"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                name="description"
                className="form-input"
                placeholder="Optional description about the site or event..."
                value={formData.description}
                onChange={handleChange}
                rows="4"
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '24px',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                className="btn-icon"
                onClick={handleCancel}
                disabled={loading}
              >
                <FaTimes style={{ marginRight: '8px' }} />
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                <FaSave style={{ marginRight: '8px' }} />
                {loading ? 'Creating...' : 'Create Site'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CreateSite

