import React, { useState, useEffect } from 'react'
import { FaCamera, FaUpload, FaUser, FaTimes } from 'react-icons/fa'
import Modal from './Modal'
import { managerAPI } from '../services/api'
import { getStaticUrl } from '../config'
import './AddEmployeeModal.css'

const AddEmployeeModal = ({ isOpen, onClose, onSave, employee, isManager = false, siteId = null }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    manager: '',
    shift: '',
    address: '',
    mobile: '',
    photo: null
  })
  const [managers, setManagers] = useState([])
  const [loadingManagers, setLoadingManagers] = useState(false)
  const [existingPhotoUrl, setExistingPhotoUrl] = useState(null)

  useEffect(() => {
    if (isOpen) {
      // Only fetch managers if not a manager (managers can't assign to other managers)
      if (!isManager) {
        fetchManagers()
      }
      // If editing, populate form with employee data
      if (employee) {
        setFormData({
          fullName: employee.name || '',
          email: employee.email || '',
          manager: employee.managerId?._id || employee.managerId || '',
          shift: employee.shift || '',
          address: employee.address || '',
          mobile: employee.mobile || '',
          photo: null
        })
        // Set existing photo URL if available
        if (employee.image) {
          const imageUrl = getStaticUrl(employee.image)
          setExistingPhotoUrl(imageUrl)
        } else {
          setExistingPhotoUrl(null)
        }
      } else {
        // Reset form for new employee
        setFormData({
          fullName: '',
          email: '',
          manager: '',
          shift: '',
          address: '',
          mobile: '',
          photo: null
        })
        setExistingPhotoUrl(null)
      }
    }
  }, [isOpen, employee])

  const fetchManagers = async () => {
    try {
      setLoadingManagers(true)
      let response
      if (siteId) {
        // If siteId is provided, fetch only managers for that site
        const { siteAPI } = await import('../services/api')
        response = await siteAPI.getManagers(siteId)
      } else {
        // Otherwise, fetch all managers
        response = await managerAPI.getAll()
      }
      if (response && response.data) {
        setManagers(response.data)
      }
    } catch (error) {
      console.error('Error fetching managers:', error)
    } finally {
      setLoadingManagers(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData({
        ...formData,
        photo: file
      })
      setExistingPhotoUrl(null) // Clear existing photo when new one is uploaded
    }
  }

  const handleRemovePhoto = () => {
    setFormData({
      ...formData,
      photo: null
    })
    setExistingPhotoUrl(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (onSave) {
      onSave(formData)
    }
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={employee ? "Edit Employee" : "Add New Employee"}
      subtitle={employee ? "Update the employee details." : "Fill in the details for the new employee."}
    >
      <form onSubmit={handleSubmit} className="employee-form">
        {/* Photo Upload Section */}
        <div className="form-section">
          <label className="form-label">Employee Photo</label>
          <div className="photo-upload-area">
            {formData.photo ? (
              <div className="photo-preview">
                <img 
                  src={URL.createObjectURL(formData.photo)} 
                  alt="Employee" 
                  className="preview-image"
                />
                <button
                  type="button"
                  className="remove-photo-btn"
                  onClick={handleRemovePhoto}
                >
                  <FaTimes />
                </button>
              </div>
            ) : existingPhotoUrl ? (
              <div className="photo-preview">
                <img 
                  src={existingPhotoUrl} 
                  alt="Employee" 
                  className="preview-image"
                />
                <button
                  type="button"
                  className="remove-photo-btn"
                  onClick={handleRemovePhoto}
                >
                  <FaTimes />
                </button>
              </div>
            ) : (
              <div className="photo-placeholder">
                <FaUser className="photo-icon" />
                <p className="photo-text">Add Employee Photo</p>
              </div>
            )}
          </div>
          <div className="photo-actions">
            <label className="btn-photo btn-photo-primary">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
              />
              <FaCamera />
              <span>Take Photo</span>
            </label>
            <label className="btn-photo btn-photo-secondary">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
              />
              <FaUpload />
              <span>Upload Photo</span>
            </label>
          </div>
        </div>

        {/* Form Fields */}
        <div className="form-section">
          <div className="form-row">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              name="fullName"
              className="form-input"
              placeholder="John Doe"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-row">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              className="form-input"
              placeholder="john.d@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          {!isManager && (
            <div className="form-row">
              <label className="form-label">Manager</label>
              <select
                name="manager"
                className="form-input"
                value={formData.manager}
                onChange={handleChange}
                required
                disabled={loadingManagers}
              >
                <option value="">Select a manager</option>
                {managers.map((manager) => (
                  <option key={manager._id} value={manager._id}>
                    {manager.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-row">
            <label className="form-label">Shift</label>
            <select
              name="shift"
              className="form-input"
              value={formData.shift}
              onChange={handleChange}
              required
            >
              <option value="">Select a shift</option>
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
              <option value="night">Night</option>
            </select>
          </div>

          <div className="form-row">
            <label className="form-label">Address</label>
            <input
              type="text"
              name="address"
              className="form-input"
              placeholder="Enter address"
              value={formData.address}
              onChange={handleChange}
            />
          </div>

          <div className="form-row">
            <label className="form-label">Mobile</label>
            <input
              type="tel"
              name="mobile"
              className="form-input"
              placeholder="10-digit mobile number"
              value={formData.mobile}
              onChange={handleChange}
              maxLength="10"
              required
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            {employee ? 'Update Employee' : 'Add Employee'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default AddEmployeeModal

