import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FaSearch, FaArrowLeft, FaUser, FaPlus, FaEdit, FaTrash, FaUsers, FaExchangeAlt, FaUnlink } from 'react-icons/fa'
import { siteAPI, employeeAPI } from '../services/api'
import { getStaticUrl } from '../config'
import AddEmployeeModal from '../components/AddEmployeeModal'
import AssignEmployeesModal from '../components/AssignEmployeesModal'
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
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [selectedEmployees, setSelectedEmployees] = useState(new Set())
  const [sites, setSites] = useState([])

  // Check if readonly admin with assigned site
  const userData = JSON.parse(localStorage.getItem('user') || '{}')
  const userType = localStorage.getItem('userType')
  const isReadonlyAdminWithSite = userType === 'admin' && userData.role === 'readonly' && userData.siteId

  useEffect(() => {
    // Check if readonly admin is trying to access a site they're not assigned to
    if (isReadonlyAdminWithSite && userData.siteId !== id) {
      navigate(`/sites/${userData.siteId}/employees`, { replace: true })
      return
    }
    fetchSiteData()
    fetchEmployees()
  }, [id, isWorkingFilter, shiftFilter, isReadonlyAdminWithSite, userData.siteId, navigate])

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

  const handleSelectEmployee = (employeeId) => {
    setSelectedEmployees(prev => {
      const newSet = new Set(prev)
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId)
      } else {
        newSet.add(employeeId)
      }
      return newSet
    })
  }

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedEmployees(new Set(filteredEmployees.map(emp => emp._id)))
    } else {
      setSelectedEmployees(new Set())
    }
  }

  const handleUnassign = async () => {
    if (selectedEmployees.size === 0) {
      alert('Please select at least one employee to unassign')
      return
    }

    if (!window.confirm(`Are you sure you want to unassign ${selectedEmployees.size} employee(s) from this site? They will be moved back to global/unassigned.`)) {
      return
    }

    try {
      await siteAPI.unassignEmployees(id, Array.from(selectedEmployees))
      alert(`Successfully unassigned ${selectedEmployees.size} employee(s) from this site`)
      setSelectedEmployees(new Set())
      await fetchEmployees()
    } catch (err) {
      console.error('Error unassigning employees:', err)
      alert(err.message || 'Failed to unassign employees')
    }
  }

  const handleReassign = async (targetSiteId) => {
    if (selectedEmployees.size === 0) {
      alert('Please select at least one employee to reassign')
      return
    }

    if (!targetSiteId) {
      alert('Please select a target site')
      return
    }

    try {
      await siteAPI.reassignEmployees(Array.from(selectedEmployees), targetSiteId)
      const targetSite = sites.find(s => s._id === targetSiteId)
      alert(`Successfully reassigned ${selectedEmployees.size} employee(s) to ${targetSite?.name || 'target site'}`)
      setSelectedEmployees(new Set())
      setIsReassignModalOpen(false)
      await fetchEmployees()
    } catch (err) {
      console.error('Error reassigning employees:', err)
      alert(err.message || 'Failed to reassign employees')
    }
  }

  const fetchSites = async () => {
    try {
      const response = await siteAPI.getAll()
      setSites(response.data || [])
    } catch (error) {
      console.error('Error fetching sites:', error)
    }
  }

  useEffect(() => {
    if (!isReadonlyAdminWithSite) {
      fetchSites()
    }
  }, [isReadonlyAdminWithSite])

  const getImageUrl = (image) => {
    return getStaticUrl(image)
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
          {!isReadonlyAdminWithSite && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button className="btn-secondary" onClick={() => setIsAssignModalOpen(true)}>
                <FaUsers style={{ marginRight: '8px' }} />
                Import Employees
              </button>
              <button className="btn-primary" onClick={handleAddEmployee}>
                <FaPlus style={{ marginRight: '8px' }} />
                Add Employee
              </button>
              {selectedEmployees.size > 0 && (
                <>
                  <button 
                    className="btn-secondary" 
                    onClick={handleUnassign}
                    style={{ background: '#f59e0b', color: 'white', border: 'none' }}
                  >
                    <FaUnlink style={{ marginRight: '8px' }} />
                    Unassign ({selectedEmployees.size})
                  </button>
                  <button 
                    className="btn-secondary" 
                    onClick={() => setIsReassignModalOpen(true)}
                    style={{ background: '#8b5cf6', color: 'white', border: 'none' }}
                  >
                    <FaExchangeAlt style={{ marginRight: '8px' }} />
                    Move to Site ({selectedEmployees.size})
                  </button>
                </>
              )}
            </div>
          )}
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

          <AssignEmployeesModal
            isOpen={isAssignModalOpen}
            onClose={() => setIsAssignModalOpen(false)}
            siteId={id}
            siteName={site?.name || 'Site'}
            onSuccess={fetchEmployees}
          />

          {/* Reassign Employees Modal */}
          {isReassignModalOpen && (
            <div className="modal-overlay" onClick={() => setIsReassignModalOpen(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2 className="modal-title">Move Employees to Another Site</h2>
                  <button className="modal-close-btn" onClick={() => setIsReassignModalOpen(false)} aria-label="Close">
                    ×
                  </button>
                </div>
                <div className="modal-body">
                  <p style={{ marginBottom: '16px', color: '#6b7280' }}>
                    Select the target site to move {selectedEmployees.size} selected employee(s) to:
                  </p>
                  <div className="form-group">
                    <label htmlFor="targetSite">Target Site</label>
                    <select
                      id="targetSite"
                      className="form-input"
                      onChange={(e) => {
                        if (e.target.value) {
                          handleReassign(e.target.value)
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="">Select a site...</option>
                      {sites.filter(s => s._id !== id).map(site => (
                        <option key={site._id} value={site._id}>
                          {site.name} {site.location ? `- ${site.location}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn-secondary" onClick={() => setIsReassignModalOpen(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {filteredEmployees.length === 0 ? (
            <div className="empty-state">
              <p>No employees found for this site.</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="mobile-cards-view mobile-only">
                {filteredEmployees.map((employee) => (
                  <div key={employee._id} className="mobile-card">
                    <div className="card-header">
                      <div className="employee-card-header">
                        <div className="employee-card-photo" style={{ background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {getImageUrl(employee.image) ? (
                            <img src={getImageUrl(employee.image)} alt={employee.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <FaUser style={{ width: '28px', height: '28px', color: '#9ca3af' }} />
                          )}
                        </div>
                        <div className="employee-card-info">
                          <h3 className="card-title">{employee.name || 'N/A'}</h3>
                          <p className="card-subtitle">{employee.email || 'N/A'}</p>
                        </div>
                      </div>
                      {!isReadonlyAdminWithSite && (
                        <div className="card-actions">
                          <button
                            className="card-action-btn edit"
                            onClick={() => handleEditEmployee(employee)}
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="card-action-btn delete"
                            onClick={() => handleDelete(employee._id)}
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="card-body">
                      <div className="card-row">
                        <span className="card-label">Mobile</span>
                        <span className="card-value">{employee.mobile || 'N/A'}</span>
                      </div>
                      <div className="card-row">
                        <span className="card-label">Address</span>
                        <span className="card-value">{employee.address || 'N/A'}</span>
                      </div>
                      <div className="card-row">
                        <span className="card-label">Shift</span>
                        <span className="card-value" style={{ textTransform: 'capitalize' }}>{employee.shift || 'N/A'}</span>
                      </div>
                      <div className="card-row">
                        <span className="card-label">Manager</span>
                        <span className="card-value">{employee.managerId?.name || 'Unassigned'}</span>
                      </div>
                      <div className="card-row">
                        <span className="card-label">Status</span>
                        <span className={`card-status ${employee.isWorking ? 'status-active' : 'status-inactive'}`}>
                          {employee.isWorking ? 'Working' : 'Not Working'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="table-container desktop-only">
              {selectedEmployees.size > 0 && !isReadonlyAdminWithSite && (
                <div style={{ 
                  padding: '12px', 
                  background: '#eff6ff', 
                  borderRadius: '8px', 
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontWeight: '500', color: '#1e40af' }}>
                    {selectedEmployees.size} employee(s) selected
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn-secondary" 
                      onClick={() => setSelectedEmployees(new Set())}
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              )}
              <table className="data-table">
                <thead>
                  <tr>
                    {!isReadonlyAdminWithSite && (
                      <th style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={filteredEmployees.length > 0 && filteredEmployees.every(emp => selectedEmployees.has(emp._id))}
                          ref={(input) => {
                            if (input) {
                              const isSomeSelected = filteredEmployees.some(emp => selectedEmployees.has(emp._id))
                              const isAllSelected = filteredEmployees.length > 0 && filteredEmployees.every(emp => selectedEmployees.has(emp._id))
                              input.indeterminate = isSomeSelected && !isAllSelected
                            }
                          }}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                    )}
                    <th>Photo</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>Address</th>
                    <th>Shift</th>
                    <th>Manager</th>
                    <th>Status</th>
                    {!isReadonlyAdminWithSite && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => (
                    <tr 
                      key={employee._id}
                      style={{ background: selectedEmployees.has(employee._id) ? '#eff6ff' : 'transparent' }}
                    >
                      {!isReadonlyAdminWithSite && (
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedEmployees.has(employee._id)}
                            onChange={() => handleSelectEmployee(employee._id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                      )}
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
                        {!isReadonlyAdminWithSite && (
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
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default SiteEmployees

