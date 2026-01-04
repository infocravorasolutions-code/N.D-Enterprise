import React, { useState, useEffect } from 'react'
import { FaEdit, FaTrash } from 'react-icons/fa'
import AddSupervisorModal from '../components/AddSupervisorModal'
import Pagination from '../components/Pagination'
import { managerAPI } from '../services/api'
import './Page.css'

const Supervisor = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSupervisor, setEditingSupervisor] = useState(null)
  const [supervisors, setSupervisors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    fetchSupervisors()
  }, [])

  const fetchSupervisors = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await managerAPI.getAll()
      console.log('Supervisors API Response:', response)
      
      // Handle different response structures
      const supervisorsList = Array.isArray(response) 
        ? response 
        : (response?.data || (Array.isArray(response?.managers) ? response.managers : []))
      
      setSupervisors(supervisorsList)
    } catch (err) {
      setError(err.message || 'Failed to fetch supervisors')
      console.error('Error fetching supervisors:', err)
      setSupervisors([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const handleEditSupervisor = (supervisor) => {
    setEditingSupervisor(supervisor)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingSupervisor(null)
  }

  const handleSaveSupervisor = async (data) => {
    try {
      const adminId = localStorage.getItem('adminId') || 'admin-id-placeholder'
      
      const managerData = {
        email: data.email,
        name: data.fullName,
        mobile: data.mobile,
        address: data.location || '',
        isActive: data.accountStatus,
        adminId: adminId
      }

      // Only include password if it's provided and not empty (for editing, empty means keep current)
      if (data.password && data.password.trim() !== '' && data.password !== '********') {
        managerData.password = data.password
      }

      let response
      if (editingSupervisor) {
        // Update existing supervisor
        response = await managerAPI.update(editingSupervisor._id, managerData)
      } else {
        // Create new supervisor
        if (!data.password || data.password === '********') {
          alert('Password is required for new supervisors')
          return
        }
        managerData.password = data.password
        response = await managerAPI.create(managerData)
      }

      if (response) {
        await fetchSupervisors() // Refresh the list
        handleCloseModal()
      }
    } catch (err) {
      console.error('Error saving supervisor:', err)
      alert(err.message || `Failed to ${editingSupervisor ? 'update' : 'add'} supervisor`)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this supervisor?')) {
      return
    }
    try {
      await managerAPI.delete(id)
      await fetchSupervisors() // Refresh the list
    } catch (err) {
      console.error('Error deleting supervisor:', err)
      alert(err.message || 'Failed to delete supervisor')
    }
  }

  // Pagination calculations
  const totalItems = supervisors.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedSupervisors = supervisors.slice(startIndex, endIndex)

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <div>
            <h1>Supervisors</h1>
            <p className="page-subtitle">Manage all supervisors in the system.</p>
          </div>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            + Add Supervisors
          </button>
        </div>
      </div>
      <div className="page-content">
        <div className="content-section">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Team Size</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="empty-state">Loading...</td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="6" className="empty-state" style={{ color: '#dc2626' }}>
                      {error}
                    </td>
                  </tr>
                ) : supervisors.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-state">No supervisors found</td>
                  </tr>
                ) : (
                  paginatedSupervisors.map((supervisor) => (
                    <tr key={supervisor._id}>
                      <td>{supervisor.name}</td>
                      <td>{supervisor.email}</td>
                      <td>0</td>
                      <td>{supervisor.address || '-'}</td>
                      <td>
                        <span className={`status-badge ${supervisor.isActive ? 'status-active' : 'status-inactive'}`}>
                          {supervisor.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="action-btn action-edit" 
                            title="Edit"
                            onClick={() => handleEditSupervisor(supervisor)}
                          >
                            <FaEdit />
                          </button>
                          <button 
                            className="action-btn action-delete" 
                            title="Delete"
                            onClick={() => handleDelete(supervisor._id)}
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
          {supervisors.length > 0 && (
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
      <AddSupervisorModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveSupervisor}
        supervisor={editingSupervisor}
      />
    </div>
  )
}

export default Supervisor

