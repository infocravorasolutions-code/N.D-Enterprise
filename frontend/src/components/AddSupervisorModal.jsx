import React, { useState, useEffect } from 'react'
import Modal from './Modal'
import './AddSupervisorModal.css'

const AddSupervisorModal = ({ isOpen, onClose, onSave, supervisor }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    teamSize: '10',
    location: '',
    mobile: '',
    accountStatus: true
  })

  useEffect(() => {
    if (supervisor) {
      // Pre-populate form when editing
      setFormData({
        fullName: supervisor.name || '',
        email: supervisor.email || '',
        password: '********', // Placeholder for editing
        teamSize: '10', // This might not be in the supervisor object
        location: supervisor.address || '',
        mobile: supervisor.mobile || '',
        accountStatus: supervisor.isActive !== undefined ? supervisor.isActive : true
      })
    } else {
      // Reset form when adding new
      setFormData({
        fullName: '',
        email: '',
        password: '',
        teamSize: '10',
        location: '',
        mobile: '',
        accountStatus: true
      })
    }
  }, [supervisor, isOpen])

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setFormData({
      ...formData,
      [e.target.name]: value
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (onSave) {
      // If editing and password is the placeholder, set it to empty string
      const dataToSave = {
        ...formData,
        password: isEditing && formData.password === '********' ? '' : formData.password
      }
      onSave(dataToSave)
    }
  }

  const isEditing = !!supervisor

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Supervisor" : "Add New Supervisor"}
      subtitle={isEditing ? "Update the supervisor details." : "Fill in the details for the new manager."}
    >
      <form onSubmit={handleSubmit} className="supervisor-form">
        <div className="form-section">
          <div className="form-row">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              name="fullName"
              className="form-input"
              placeholder="Jane Roe"
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
              placeholder="jane.r@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-row">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              className="form-input"
              placeholder={isEditing ? "Leave blank to keep current password" : "Enter password"}
              value={formData.password}
              onChange={handleChange}
              required={!isEditing}
            />
            {isEditing && (
              <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                Leave blank to keep the current password
              </small>
            )}
          </div>

          <div className="form-row">
            <label className="form-label">Team Size</label>
            <input
              type="number"
              name="teamSize"
              className="form-input"
              placeholder="10"
              value={formData.teamSize}
              onChange={handleChange}
              min="0"
              required
            />
          </div>

          <div className="form-row">
            <label className="form-label">Location</label>
            <input
              type="text"
              name="location"
              className="form-input"
              placeholder="e.g., Main Office"
              value={formData.location}
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

          <div className="form-row">
            <label className="form-label">Account Status</label>
            <div className="toggle-container">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  name="accountStatus"
                  checked={formData.accountStatus}
                  onChange={handleChange}
                />
                <span className="toggle-slider"></span>
              </label>
              <span className="toggle-label">
                {formData.accountStatus ? 'Active (Can login)' : 'Inactive (Cannot login)'}
              </span>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            {isEditing ? 'Update Supervisor' : 'Add Manager'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default AddSupervisorModal

