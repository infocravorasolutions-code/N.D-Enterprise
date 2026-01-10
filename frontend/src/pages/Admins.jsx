import React, { useState, useEffect } from 'react'
import { FaEdit, FaTrash, FaTimes, FaPlus } from 'react-icons/fa'
import Pagination from '../components/Pagination'
import { adminAPI, siteAPI } from '../services/api'
import './Page.css'

const Admins = () => {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    mobile: '',
    address: '',
    role: 'superadmin',
    siteId: ''
  })
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [sites, setSites] = useState([])

  useEffect(() => {
    fetchAdmins()
    fetchSites()
  }, [])

  const fetchSites = async () => {
    try {
      const response = await siteAPI.getAll()
      setSites(response.data || [])
    } catch (err) {
      console.error('Error fetching sites:', err)
    }
  }

  const fetchAdmins = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await adminAPI.getAll()
      // Backend returns array directly
      const adminsList = Array.isArray(response) ? response : (response.data || [])
      setAdmins(adminsList)
    } catch (err) {
      setError(err.message || 'Failed to fetch admins')
      console.error('Error fetching admins:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) {
      return
    }
    try {
      await adminAPI.delete(id)
      await fetchAdmins() // Refresh the list
    } catch (err) {
      console.error('Error deleting admin:', err)
      alert(err.message || 'Failed to delete admin')
    }
  }

  const handleAddAdmin = () => {
    setEditingAdmin(null)
    setFormData({
      name: '',
      email: '',
      password: '',
      mobile: '',
      address: '',
      role: 'superadmin',
      siteId: ''
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  const handleEditAdmin = (admin) => {
    setEditingAdmin(admin)
    setFormData({
      name: admin.name || '',
      email: admin.email || '',
      password: '', // Don't pre-fill password
      mobile: admin.mobile || '',
      address: admin.address || '',
      role: admin.role || 'superadmin',
      siteId: admin.siteId?._id || admin.siteId || ''
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingAdmin(null)
    setFormData({
      name: '',
      email: '',
      password: '',
      mobile: '',
      address: '',
      role: 'superadmin',
      siteId: ''
    })
    setFormErrors({})
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const errors = {}
    if (!formData.name.trim()) errors.name = 'Name is required'
    if (!formData.email.trim()) errors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email format'
    if (!editingAdmin && !formData.password) errors.password = 'Password is required'
    if (formData.password && formData.password.length < 6) errors.password = 'Password must be at least 6 characters'
    if (!formData.mobile.trim()) errors.mobile = 'Mobile is required'
    if (!formData.address.trim()) errors.address = 'Address is required'
    if (formData.role === 'readonly' && !formData.siteId) {
      errors.siteId = 'Site selection is required for readonly admins'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!validateForm()) {
      return
    }

    try {
      setSaving(true)
      const adminData = {
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        address: formData.address,
        role: formData.role,
        siteId: formData.role === 'readonly' && formData.siteId ? formData.siteId : null
      }

      if (editingAdmin) {
        // Update existing admin
        if (formData.password) {
          adminData.password = formData.password
        }
        await adminAPI.update(editingAdmin._id, adminData)
        alert('Admin updated successfully')
      } else {
        // Create new admin
        adminData.password = formData.password
        await adminAPI.create(adminData)
        alert('Admin created successfully')
      }

      await fetchAdmins()
      handleCloseModal()
    } catch (err) {
      console.error('Error saving admin:', err)
      alert(err.message || 'Failed to save admin')
    } finally {
      setSaving(false)
    }
  }

  // Pagination calculations
  const totalItems = admins.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedAdmins = admins.slice(startIndex, endIndex)

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <div>
            <h1>Admins</h1>
            <p className="page-subtitle">Manage admin users and permissions</p>
          </div>
          <button className="btn-primary" onClick={handleAddAdmin}>
            <FaPlus style={{ marginRight: '8px' }} />
            Add Admin
          </button>
        </div>
      </div>
      <div className="page-content">
        <div className="content-section">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Assigned Site</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="empty-state">Loading...</td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="7" className="empty-state" style={{ color: '#dc2626' }}>
                      {error}
                    </td>
                  </tr>
                ) : admins.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-state">No admins found</td>
                  </tr>
                ) : (
                  paginatedAdmins.map((admin) => (
                    <tr key={admin._id}>
                      <td className="text-mono">{admin._id?.substring(0, 12)}...</td>
                      <td>{admin.name}</td>
                      <td>{admin.email}</td>
                      <td>
                        <span className={`status-badge ${admin.role === 'superadmin' ? 'status-active' : 'status-on-leave'}`}>
                          {admin.role === 'superadmin' ? 'Super Admin' : 'Read Only'}
                        </span>
                      </td>
                      <td>
                        {admin.role === 'readonly' && admin.siteId ? (
                          admin.siteId?.name || 'Assigned Site'
                        ) : (
                          <span style={{ color: '#9ca3af' }}>N/A</span>
                        )}
                      </td>
                      <td>
                        <span className="status-badge status-active">
                          Active
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="action-btn action-edit" 
                            title="Edit"
                            onClick={() => handleEditAdmin(admin)}
                          >
                            <FaEdit />
                          </button>
                          <button 
                            className="action-btn action-delete" 
                            title="Delete"
                            onClick={() => handleDelete(admin._id)}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="mobile-cards-view">
            {loading ? (
              <div className="loading-state">Loading...</div>
            ) : error ? (
              <div className="empty-state" style={{ color: '#dc2626' }}>{error}</div>
            ) : admins.length === 0 ? (
              <div className="empty-state">No admins found</div>
            ) : (
              paginatedAdmins.map((admin) => (
                <div key={admin._id} className="mobile-card">
                  <div className="card-header">
                    <div>
                      <h3 className="card-title">{admin.name || 'N/A'}</h3>
                      <p className="card-subtitle">{admin.email || 'N/A'}</p>
                    </div>
                    <div className="card-actions">
                      <button
                        className="card-action-btn edit"
                        onClick={() => handleEditAdmin(admin)}
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="card-action-btn delete"
                        onClick={() => handleDelete(admin._id)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="card-row">
                      <span className="card-label">ID</span>
                      <span className="card-value" style={{ fontFamily: 'monospace', fontSize: '12px' }}>{admin._id?.substring(0, 12)}...</span>
                    </div>
                    <div className="card-row">
                      <span className="card-label">Role</span>
                      <span className={`card-status ${admin.role === 'superadmin' ? 'status-active' : 'status-on-leave'}`}>
                        {admin.role === 'superadmin' ? 'Super Admin' : 'Read Only'}
                      </span>
                    </div>
                    <div className="card-row">
                      <span className="card-label">Assigned Site</span>
                      <span className="card-value">
                        {admin.role === 'readonly' && admin.siteId ? (admin.siteId?.name || 'Assigned Site') : 'N/A'}
                      </span>
                    </div>
                    <div className="card-row">
                      <span className="card-label">Status</span>
                      <span className="card-status status-active">Active</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {admins.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={totalItems}
              onItemsPerPageChange={(value) => {
                setItemsPerPage(value)
                setCurrentPage(1)
              }}
            />
          )}
        </div>
      </div>

      {/* Add/Edit Admin Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-section">
                <h2 className="modal-title">{editingAdmin ? 'Edit Admin' : 'Add New Admin'}</h2>
                <p className="modal-subtitle">
                  {editingAdmin ? 'Update the admin details.' : 'Fill in the details for the new admin user.'}
                </p>
              </div>
              <button className="modal-close-btn" onClick={handleCloseModal} aria-label="Close">
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleSave} className="modal-body">
              <div className="form-group">
                <label className="form-label">Full Name <span className="required">*</span></label>
                <input
                  type="text"
                  name="name"
                  className={`form-input ${formErrors.name ? 'input-error' : ''}`}
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                {formErrors.name && <p className="error-text">{formErrors.name}</p>}
              </div>

              <div className="form-group">
                <label className="form-label">Email <span className="required">*</span></label>
                <input
                  type="email"
                  name="email"
                  className={`form-input ${formErrors.email ? 'input-error' : ''}`}
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={!!editingAdmin}
                />
                {formErrors.email && <p className="error-text">{formErrors.email}</p>}
                {editingAdmin && <p className="form-hint">Email cannot be changed</p>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Password {!editingAdmin && <span className="required">*</span>}
                  {editingAdmin && <span className="form-hint">(Leave blank to keep current password)</span>}
                </label>
                <input
                  type="password"
                  name="password"
                  className={`form-input ${formErrors.password ? 'input-error' : ''}`}
                  placeholder={editingAdmin ? "Enter new password (optional)" : "Enter password"}
                  value={formData.password}
                  onChange={handleChange}
                  required={!editingAdmin}
                />
                {formErrors.password && <p className="error-text">{formErrors.password}</p>}
              </div>

              <div className="form-group">
                <label className="form-label">Mobile <span className="required">*</span></label>
                <input
                  type="tel"
                  name="mobile"
                  className={`form-input ${formErrors.mobile ? 'input-error' : ''}`}
                  placeholder="Enter mobile number"
                  value={formData.mobile}
                  onChange={handleChange}
                  required
                />
                {formErrors.mobile && <p className="error-text">{formErrors.mobile}</p>}
              </div>

              <div className="form-group">
                <label className="form-label">Address <span className="required">*</span></label>
                <textarea
                  name="address"
                  className={`form-input ${formErrors.address ? 'input-error' : ''}`}
                  placeholder="Enter address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                  required
                />
                {formErrors.address && <p className="error-text">{formErrors.address}</p>}
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  name="role"
                  className="form-input"
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="superadmin">Super Admin</option>
                  <option value="readonly">Read Only</option>
                </select>
              </div>

              {formData.role === 'readonly' && (
                <div className="form-group">
                  <label className="form-label">Assign to Site <span className="required">*</span></label>
                  <select
                    name="siteId"
                    className={`form-input ${formErrors.siteId ? 'input-error' : ''}`}
                    value={formData.siteId}
                    onChange={handleChange}
                    required={formData.role === 'readonly'}
                  >
                    <option value="">Select a site</option>
                    {sites.map((site) => (
                      <option key={site._id} value={site._id}>
                        {site.name} - {site.location}
                      </option>
                    ))}
                  </select>
                  {formErrors.siteId && <p className="error-text">{formErrors.siteId}</p>}
                  <p className="form-hint">Readonly admins can only view data for their assigned site</p>
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={handleCloseModal} disabled={saving}>
                  <FaTimes style={{ marginRight: '8px' }} />
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingAdmin ? 'Update Admin' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Admins

