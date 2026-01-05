import React, { useState, useEffect } from 'react'
import { FaSearch, FaEdit, FaTrash, FaUser } from 'react-icons/fa'
import AddEmployeeModal from '../components/AddEmployeeModal'
import Pagination from '../components/Pagination'
import { employeeAPI } from '../services/api'
import './Page.css'

const Employees = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  
  // Get user type
  const userType = localStorage.getItem('userType') || 'admin'
  const isManager = userType === 'manager'

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await employeeAPI.getAll()
      console.log('Employees API Response:', response)
      
      // Handle different response structures
      const employeesList = Array.isArray(response) 
        ? response 
        : (response?.data || (Array.isArray(response?.employees) ? response.employees : []))
      
      setEmployees(employeesList)
    } catch (err) {
      setError(err.message || 'Failed to fetch employees')
      console.error('Error fetching employees:', err)
      setEmployees([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const handleAddEmployee = () => {
    setEditingEmployee(null)
    setIsModalOpen(true)
  }

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee)
    setIsModalOpen(true)
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

      let response
      if (editingEmployee) {
        // Update existing employee
        // For managers, don't allow changing manager assignment
        if (!isManager) {
          employeeData.managerId = data.manager || ''
        }
        response = await employeeAPI.update(editingEmployee._id, employeeData, data.photo)
      } else {
        // Create new employee
        if (isManager) {
          // Use manager-specific API endpoint
          response = await employeeAPI.createByManager(employeeData, data.photo)
        } else {
          // Admin creates employee
          const adminId = localStorage.getItem('adminId') || 'admin-id-placeholder'
          employeeData.managerId = data.manager || ''
          employeeData.createdBy = adminId
          employeeData.isCreatedByAdmin = true
          response = await employeeAPI.create(employeeData, data.photo)
        }
      }

      if (response) {
        await fetchEmployees() // Refresh the list
        setIsModalOpen(false)
        setEditingEmployee(null)
      }
    } catch (err) {
      console.error('Error saving employee:', err)
      alert(err.message || `Failed to ${editingEmployee ? 'update' : 'add'} employee`)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingEmployee(null)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) {
      return
    }
    try {
      await employeeAPI.delete(id)
      await fetchEmployees() // Refresh the list
    } catch (err) {
      console.error('Error deleting employee:', err)
      alert(err.message || 'Failed to delete employee')
    }
  }

  const filteredEmployees = employees.filter(emp => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      emp.name?.toLowerCase().includes(query) ||
      emp.email?.toLowerCase().includes(query) ||
      emp.shift?.toLowerCase().includes(query)
    )
  })

  // Pagination calculations
  const totalItems = filteredEmployees.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex)

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const getImageUrl = (image) => {
    if (!image) return null
    if (image.startsWith('http')) return image
    return `http://localhost:5678/static/${image}`
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <div>
            <h1>{isManager ? 'My Employees' : 'Employees'}</h1>
            <p className="page-subtitle">
              {isManager ? 'Manage your assigned employees.' : 'Manage all employees in the system.'}
            </p>
          </div>
          <button className="btn-primary" onClick={handleAddEmployee}>
            + Add Employee
          </button>
        </div>
      </div>
      <div className="page-content">
        <div className="content-section">
          <div className="search-bar">
            <FaSearch className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search employees by name, email, or shift..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Name</th>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Assigned Manager</th>
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
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-state">No employees found</td>
                  </tr>
                ) : (
                  paginatedEmployees.map((employee) => (
                    <tr key={employee._id}>
                      <td>
                        <div className="employee-photo">
                          {getImageUrl(employee.image) ? (
                            <img src={getImageUrl(employee.image)} alt={employee.name} />
                          ) : (
                            <FaUser />
                          )}
                        </div>
                      </td>
                      <td>{employee.name}</td>
                      <td className="text-mono">{employee._id?.substring(0, 12)}...</td>
                      <td>{employee.email || '-'}</td>
                      <td>{employee.managerId?.name || '-'}</td>
                      <td>
                        <span className={`status-badge ${employee.isWorking ? 'status-active' : 'status-on-leave'}`}>
                          {employee.isWorking ? 'Active' : 'On Leave'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="action-btn action-edit" 
                            title="Edit"
                            onClick={() => handleEditEmployee(employee)}
                          >
                            <FaEdit />
                          </button>
                          <button 
                            className="action-btn action-delete" 
                            title="Delete"
                            onClick={() => handleDelete(employee._id)}
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
          {filteredEmployees.length > 0 && (
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
      <AddEmployeeModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveEmployee}
        employee={editingEmployee}
        isManager={isManager}
      />
    </div>
  )
}

export default Employees

