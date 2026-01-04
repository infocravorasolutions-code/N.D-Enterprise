import React, { useState, useEffect } from 'react'
import { FaEdit, FaTrash } from 'react-icons/fa'
import Pagination from '../components/Pagination'
import { adminAPI } from '../services/api'
import './Page.css'

const Admins = () => {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    fetchAdmins()
  }, [])

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
          <button className="btn-primary">
            + Add Admin
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
                ) : admins.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-state">No admins found</td>
                  </tr>
                ) : (
                  paginatedAdmins.map((admin) => (
                    <tr key={admin._id}>
                      <td className="text-mono">{admin._id?.substring(0, 12)}...</td>
                      <td>{admin.name}</td>
                      <td>{admin.email}</td>
                      <td>{admin.role || 'Admin'}</td>
                      <td>
                        <span className="status-badge status-active">
                          Active
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button className="action-btn action-edit" title="Edit">
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
    </div>
  )
}

export default Admins

