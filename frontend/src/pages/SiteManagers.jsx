import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaUserTie, FaPlus, FaEdit, FaTrash } from 'react-icons/fa'
import { siteAPI, managerAPI } from '../services/api'
import AddSupervisorModal from '../components/AddSupervisorModal'
import './Page.css'

const SiteManagers = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [managers, setManagers] = useState([])
  const [site, setSite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingManager, setEditingManager] = useState(null)

  useEffect(() => {
    fetchSiteData()
    fetchManagers()
  }, [id])

  const fetchSiteData = async () => {
    try {
      const response = await siteAPI.get(id)
      setSite(response.data)
    } catch (error) {
      console.error('Error fetching site:', error)
    }
  }

  const fetchManagers = async () => {
    try {
      setLoading(true)
      const response = await siteAPI.getManagers(id)
      setManagers(response.data || [])
    } catch (error) {
      console.error('Error fetching site managers:', error)
      alert('Failed to fetch managers. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddManager = () => {
    setEditingManager(null)
    setIsModalOpen(true)
  }

  const handleEditManager = (manager) => {
    setEditingManager(manager)
    setIsModalOpen(true)
  }

  const handleSaveManager = async (data) => {
    try {
      const adminId = localStorage.getItem('adminId') || 'admin-id-placeholder'
      
      const managerData = {
        email: data.email,
        name: data.fullName,
        mobile: data.mobile,
        address: data.location || '',
        isActive: data.accountStatus,
        adminId: adminId,
        siteId: id // Assign to current site
      }

      // Only include password if it's provided and not empty (for editing, empty means keep current)
      if (data.password && data.password.trim() !== '' && data.password !== '********') {
        managerData.password = data.password
      }

      let response
      if (editingManager) {
        // Update existing manager
        managerData.siteId = id // Ensure siteId is set on update
        response = await managerAPI.update(editingManager._id, managerData)
      } else {
        // Create new manager
        if (!data.password || data.password === '********') {
          alert('Password is required for new managers')
          return
        }
        managerData.password = data.password
        response = await managerAPI.create(managerData)
      }

      if (response) {
        await fetchManagers() // Refresh the list
        setIsModalOpen(false)
        setEditingManager(null)
      }
    } catch (err) {
      console.error('Error saving manager:', err)
      alert(err.message || `Failed to ${editingManager ? 'update' : 'add'} manager`)
    }
  }

  const handleDelete = async (managerId) => {
    if (!window.confirm('Are you sure you want to delete this manager?')) {
      return
    }
    try {
      await managerAPI.delete(managerId)
      await fetchManagers() // Refresh the list
    } catch (err) {
      console.error('Error deleting manager:', err)
      alert(err.message || 'Failed to delete manager')
    }
  }

  if (loading && !site) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Loading...</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <div>
            <button 
              className="btn-icon" 
              onClick={() => navigate(`/sites/${id}`)}
              style={{ marginBottom: '12px' }}
            >
              <FaArrowLeft style={{ marginRight: '8px' }} />
              Back to Site Details
            </button>
            <h1>{site?.name || 'Site'} - Managers</h1>
            <p className="page-subtitle">View and manage managers assigned to this site</p>
          </div>
          <button className="btn-primary" onClick={handleAddManager}>
            <FaPlus style={{ marginRight: '8px' }} />
            Add Manager
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Managers Grid */}
        <div className="content-section">
          <div className="section-header">
            <h2>Managers ({managers.length})</h2>
          </div>

          <AddSupervisorModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false)
              setEditingManager(null)
            }}
            onSave={handleSaveManager}
            supervisor={editingManager}
          />

          {managers.length === 0 ? (
            <div className="empty-state">
              <p>No managers found for this site.</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              {managers.map((manager) => (
                <div
                  key={manager._id}
                  style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '24px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      background: '#8b5cf6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '20px',
                      fontWeight: '600'
                    }}>
                      {manager.name?.charAt(0).toUpperCase() || 'M'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#1f2937',
                        margin: 0,
                        marginBottom: '4px'
                      }}>
                        {manager.name}
                      </h3>
                      <p style={{
                        fontSize: '14px',
                        color: '#6b7280',
                        margin: 0
                      }}>
                        {manager.email}
                      </p>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    paddingTop: '16px',
                    borderTop: '1px solid #e5e7eb'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px',
                      color: '#6b7280'
                    }}>
                      <FaUserTie />
                      <span>Mobile: {manager.mobile || 'N/A'}</span>
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#6b7280'
                    }}>
                      <strong>Address:</strong> {manager.address || 'N/A'}
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span className={`status-badge ${manager.isActive ? 'status-active' : 'status-inactive'}`}>
                        {manager.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <div className="action-buttons">
                        <button 
                          className="action-btn action-edit" 
                          title="Edit"
                          onClick={() => handleEditManager(manager)}
                        >
                          <FaEdit />
                        </button>
                        <button 
                          className="action-btn action-delete" 
                          title="Delete"
                          onClick={() => handleDelete(manager._id)}
                        >
                          <FaTrash />
                        </button>
                      </div>
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

export default SiteManagers

