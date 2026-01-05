import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FaSearch, FaArrowLeft, FaUser, FaPlus, FaEdit, FaTrash } from 'react-icons/fa'
import { siteAPI, employeeAPI } from '../services/api'
import AddEmployeeModal from '../components/AddEmployeeModal'
import './Page.css'

const SiteEmployees = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [site, setSite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isWorkingFilter, setIsWorkingFilter] = useState('')
  const [shiftFilter, setShiftFilter] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)

  useEffect(() => {
    fetchSiteData()
    fetchEmployees()
  }, [id, isWorkingFilter, shiftFilter])

  const fetchSiteData = async () => {
    try {
      const response = await siteAPI.get(id)
      setSite(response.data)
    } catch (error) {
      console.error('Error fetching site:', error)
    }
  }

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const params = {}
      if (isWorkingFilter) {
        params.isWorking = isWorkingFilter
      }
      if (shiftFilter) {
        params.shift = shiftFilter
      }
      const response = await siteAPI.getEmployees(id, params)
      setEmployees(response.data || [])
    } catch (error) {
      console.error('Error fetching site employees:', error)
      alert('Failed to fetch employees. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filteredEmployees = employees.filter(emp => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      emp.name?.toLowerCase().includes(query) ||
      emp.email?.toLowerCase().includes(query) ||
      emp.mobile?.toLowerCase().includes(query) ||
      emp.address?.toLowerCase().includes(query)
    )
  })

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
      const adminId = localStorage.getItem('adminId') || 'admin-id-placeholder'
      const employeeData = {
        name: data.fullName,
        email: data.email || '',
        mobile: data.mobile || '',
        address: data.address || '',
        shift: data.shift,
        managerId: data.manager || '',
        createdBy: adminId,
        isCreatedByAdmin: true,
        siteId: id // Assign to current site
      }

      let response
      if (editingEmployee) {
        // Update existing employee
        employeeData.siteId = id // Ensure siteId is set on update
        response = await employeeAPI.update(editingEmployee._id, employeeData, data.photo)
      } else {
        // Create new employee
        response = await employeeAPI.create(employeeData, data.photo)
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

  const handleDelete = async (employeeId) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) {
      return
    }
    try {
      await employeeAPI.delete(employeeId)
      await fetchEmployees() // Refresh the list
    } catch (err) {
      console.error('Error deleting employee:', err)
      alert(err.message || 'Failed to delete employee')
    }
  }

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5678/api'
  const getImageUrl = (image) => {
    if (!image) return null
    if (image.startsWith('http')) return image
    return `${API_BASE_URL.replace('/api', '')}/static/${image}`
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
            <h1>{site?.name || 'Site'} - Employees</h1>
            <p className="page-subtitle">View and manage employees assigned to this site</p>
          </div>
          <button className="btn-primary" onClick={handleAddEmployee}>
            <FaPlus style={{ marginRight: '8px' }} />
            Add Employee
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Filters */}
        <div className="filters-container">
          <div className="filter-group">
            <label htmlFor="search">
              <FaSearch style={{ marginRight: '8px' }} />
              Search
            </label>
            <input
              id="search"
              type="text"
              className="form-input"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label htmlFor="isWorking">Status</label>
            <select
              id="isWorking"
              className="form-input"
              value={isWorkingFilter}
              onChange={(e) => setIsWorkingFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="true">Working</option>
              <option value="false">Not Working</option>
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="shift">Shift</label>
            <select
              id="shift"
              className="form-input"
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
            >
              <option value="">All Shifts</option>
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
              <option value="night">Night</option>
            </select>
          </div>
        </div>

        {/* Employees Table */}
        <div className="content-section">
          <div className="section-header">
            <h2>Employees ({filteredEmployees.length})</h2>
          </div>

          <AddEmployeeModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false)
              setEditingEmployee(null)
            }}
            onSave={handleSaveEmployee}
            employee={editingEmployee}
            isManager={false}
            siteId={id}
          />

          {filteredEmployees.length === 0 ? (
            <div className="empty-state">
              <p>No employees found for this site.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>Address</th>
                    <th>Shift</th>
                    <th>Manager</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => (
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
                      <td>{employee.name || 'N/A'}</td>
                      <td>{employee.email || 'N/A'}</td>
                      <td>{employee.mobile || 'N/A'}</td>
                      <td>{employee.address || 'N/A'}</td>
                      <td>
                        <span className={`status-badge ${employee.shift === 'morning' ? 'status-active' : employee.shift === 'evening' ? 'status-on-leave' : 'status-inactive'}`}>
                          {employee.shift?.charAt(0).toUpperCase() + employee.shift?.slice(1) || 'N/A'}
                        </span>
                      </td>
                      <td>{employee.managerId?.name || 'N/A'}</td>
                      <td>
                        <span className={`status-badge ${employee.isWorking ? 'status-active' : 'status-inactive'}`}>
                          {employee.isWorking ? 'Working' : 'Not Working'}
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SiteEmployees

