import React, { useState, useEffect } from 'react'
import { FaSearch, FaEdit, FaTrash, FaUser, FaUsers, FaCheckCircle, FaTimesCircle, FaFilter } from 'react-icons/fa'
import AddEmployeeModal from '../components/AddEmployeeModal'
import Pagination from '../components/Pagination'
import ToggleSwitch from '../components/ToggleSwitch'
import { employeeAPI } from '../services/api'
import { getStaticUrl } from '../config'
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
  const [selectedEmployees, setSelectedEmployees] = useState([])
  const [autoPunchFilter, setAutoPunchFilter] = useState('') // '', 'enabled', 'disabled'
  
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
        autoPunchEnabled: data.autoPunchEnabled !== false
      }

      let response
      if (editingEmployee) {
        if (!isManager) {
          employeeData.managerId = data.manager || ''
        }
        response = await employeeAPI.update(editingEmployee._id, employeeData, data.photo)
      } else {
        if (isManager) {
          response = await employeeAPI.createByManager(employeeData, data.photo)
        } else {
          const adminId = localStorage.getItem('adminId') || 'admin-id-placeholder'
          employeeData.managerId = data.manager || ''
          employeeData.createdBy = adminId
          employeeData.isCreatedByAdmin = true
          response = await employeeAPI.create(employeeData, data.photo)
        }
      }

      if (response) {
        await fetchEmployees()
        setIsModalOpen(false)
        setEditingEmployee(null)
      }
    } catch (err) {
      console.error('Error saving employee:', err)
      alert(err.message || `Failed to ${editingEmployee ? 'update' : 'add'} employee`)
    }
  }

  const handleToggleAutoPunch = async (employeeId, currentStatus) => {
    try {
      const nextStatus = !currentStatus
      await employeeAPI.toggleAutoPunch(employeeId, nextStatus)
      setEmployees(prev => prev.map(emp => emp._id === employeeId ? { ...emp, autoPunchEnabled: nextStatus } : emp))
    } catch (err) {
      console.error('Error toggling auto punch:', err)
      alert(err.message || 'Failed to toggle auto punch status')
    }
  }

  const handleBulkAutoPunch = async (enableState) => {
    if (selectedEmployees.length === 0) return
    try {
      await employeeAPI.bulkToggleAutoPunch(selectedEmployees, enableState)
      setEmployees(prev => prev.map(emp => selectedEmployees.includes(emp._id) ? { ...emp, autoPunchEnabled: enableState } : emp))
      alert(`Auto punch set to ${enableState ? 'ON' : 'OFF'} for ${selectedEmployees.length} employee(s)`)
      setSelectedEmployees([])
    } catch (err) {
      console.error('Error bulk updating auto punch:', err)
      alert(err.message || 'Failed to bulk update auto punch')
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
      setSelectedEmployees(prev => prev.filter(empId => empId !== id))
    } catch (err) {
      console.error('Error deleting employee:', err)
      alert(err.message || 'Failed to delete employee')
    }
  }

  const handleSelectEmployee = (id) => {
    setSelectedEmployees(prev => 
      prev.includes(id) 
        ? prev.filter(empId => empId !== id)
        : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedEmployees.length === paginatedEmployees.length) {
      setSelectedEmployees([])
    } else {
      setSelectedEmployees(paginatedEmployees.map(emp => emp._id))
    }
  }

  const handleDeleteMultiple = async () => {
    if (selectedEmployees.length === 0) {
      alert('Please select at least one employee to delete')
      return
    }

    const confirmMessage = `Are you sure you want to delete ${selectedEmployees.length} employee(s)? This action cannot be undone.`
    if (!window.confirm(confirmMessage)) {
      return
    }

    try {
      await employeeAPI.deleteMultiple(selectedEmployees)
      await fetchEmployees() // Refresh the list
      setSelectedEmployees([])
      alert(`Successfully deleted ${selectedEmployees.length} employee(s)`)
    } catch (err) {
      console.error('Error deleting employees:', err)
      alert(err.message || 'Failed to delete employees')
    }
  }

  const isAutoPunchActive = (emp) => {
    if (typeof emp.autoPunchEnabled === 'boolean') {
      return emp.autoPunchEnabled
    }
    return emp.siteId ? true : false
  }

  const autoPunchOnCount = employees.filter(e => isAutoPunchActive(e)).length
  const autoPunchOffCount = employees.filter(e => !isAutoPunchActive(e)).length

  const filteredEmployees = employees.filter(emp => {
    // Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch = (
        emp.name?.toLowerCase().includes(query) ||
        emp.email?.toLowerCase().includes(query) ||
        emp.shift?.toLowerCase().includes(query)
      )
      if (!matchesSearch) return false
    }

    // Auto punch filter
    if (autoPunchFilter === 'enabled' && !isAutoPunchActive(emp)) return false
    if (autoPunchFilter === 'disabled' && isAutoPunchActive(emp)) return false

    return true
  })

  // Pagination calculations
  const totalItems = filteredEmployees.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex)

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1)
    setSelectedEmployees([])
  }, [searchQuery, autoPunchFilter])

  // Clear selections when page changes
  useEffect(() => {
    setSelectedEmployees([])
  }, [currentPage])

  const getImageUrl = (image) => {
    return getStaticUrl(image)
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
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {selectedEmployees.length > 0 && (
              <>
                <button 
                  className="btn-primary" 
                  onClick={() => handleBulkAutoPunch(true)}
                  style={{ background: '#059669' }}
                >
                  Enable Auto Punch ({selectedEmployees.length})
                </button>
                <button 
                  className="btn-primary" 
                  onClick={() => handleBulkAutoPunch(false)}
                  style={{ background: '#4b5563' }}
                >
                  Disable Auto Punch ({selectedEmployees.length})
                </button>
                <button 
                  className="btn-primary" 
                  onClick={handleDeleteMultiple}
                  style={{ background: '#dc2626' }}
                >
                  Delete Selected ({selectedEmployees.length})
                </button>
              </>
            )}
            <button className="btn-primary" onClick={handleAddEmployee}>
              + Add Employee
            </button>
          </div>
        </div>
      </div>
      <div className="page-content">
        {/* Stats Cards Section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div 
            onClick={() => setAutoPunchFilter('')}
            style={{
              background: 'white',
              padding: '16px 20px',
              borderRadius: '12px',
              border: autoPunchFilter === '' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Total Employees</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
                {employees.length}
              </p>
            </div>
            <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '10px', color: '#3b82f6' }}>
              <FaUsers style={{ fontSize: '22px' }} />
            </div>
          </div>

          <div 
            onClick={() => setAutoPunchFilter(autoPunchFilter === 'enabled' ? '' : 'enabled')}
            style={{
              background: 'white',
              padding: '16px 20px',
              borderRadius: '12px',
              border: autoPunchFilter === 'enabled' ? '2px solid #10b981' : '1px solid #e2e8f0',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: '13px', color: '#047857', fontWeight: '600' }}>⚡ Auto Punch ON</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: '700', color: '#065f46' }}>
                {autoPunchOnCount}
              </p>
            </div>
            <div style={{ background: '#d1fae5', padding: '12px', borderRadius: '10px', color: '#10b981' }}>
              <FaCheckCircle style={{ fontSize: '22px' }} />
            </div>
          </div>

          <div 
            onClick={() => setAutoPunchFilter(autoPunchFilter === 'disabled' ? '' : 'disabled')}
            style={{
              background: 'white',
              padding: '16px 20px',
              borderRadius: '12px',
              border: autoPunchFilter === 'disabled' ? '2px solid #64748b' : '1px solid #e2e8f0',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '600' }}>⏸️ Auto Punch OFF</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: '700', color: '#475569' }}>
                {autoPunchOffCount}
              </p>
            </div>
            <div style={{ background: '#f1f5f9', padding: '12px', borderRadius: '10px', color: '#64748b' }}>
              <FaTimesCircle style={{ fontSize: '22px' }} />
            </div>
          </div>
        </div>

        <div className="content-section">
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
            <div className="search-bar" style={{ flex: 1, minWidth: '260px' }}>
              <FaSearch className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search employees by name, email, or shift..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaFilter style={{ color: '#64748b', fontSize: '14px' }} />
              <select
                className="form-input"
                style={{ width: '180px', margin: 0 }}
                value={autoPunchFilter}
                onChange={(e) => setAutoPunchFilter(e.target.value)}
              >
                <option value="">All Auto Punch</option>
                <option value="enabled">Auto Punch ON</option>
                <option value="disabled">Auto Punch OFF</option>
              </select>
            </div>
          </div>
          <div className="table-container desktop-only">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>
                    <input
                      type="checkbox"
                      checked={paginatedEmployees.length > 0 && selectedEmployees.length === paginatedEmployees.length}
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                  </th>
                  <th>Photo</th>
                  <th>Name</th>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Assigned Manager</th>
                  <th>Auto Punch</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="empty-state">Loading...</td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="9" className="empty-state" style={{ color: '#dc2626' }}>
                      {error}
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="empty-state">No employees found</td>
                  </tr>
                ) : (
                  paginatedEmployees.map((employee) => (
                    <tr key={employee._id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(employee._id)}
                          onChange={() => handleSelectEmployee(employee._id)}
                          style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                        />
                      </td>
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
                        <ToggleSwitch
                          checked={isAutoPunchActive(employee)}
                          onChange={() => handleToggleAutoPunch(employee._id, isAutoPunchActive(employee))}
                        />
                      </td>
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
          {/* Mobile Card View */}
          <div className="mobile-cards-view mobile-only">
            {loading ? (
              <div className="loading-state">Loading...</div>
            ) : error ? (
              <div className="empty-state" style={{ color: '#dc2626' }}>{error}</div>
            ) : filteredEmployees.length === 0 ? (
              <div className="empty-state">No employees found</div>
            ) : (
              paginatedEmployees.map((employee) => (
                <div key={employee._id} className="mobile-card">
                  <div className="card-header">
                    <div className="employee-card-header">
                      <div className="employee-card-photo" style={{ background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {getImageUrl(employee.image) ? (
                          <img src={getImageUrl(employee.image)} alt={employee.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                        ) : (
                          <FaUser style={{ color: '#9ca3af', fontSize: '24px' }} />
                        )}
                      </div>
                      <div className="employee-card-info">
                        <h3 className="card-title">{employee.name || 'N/A'}</h3>
                        <p className="card-subtitle">ID: {employee._id?.substring(0, 12)}...</p>
                      </div>
                    </div>
                    <div className="card-actions">
                      <button
                        className="card-action-btn edit"
                        onClick={() => handleEditEmployee(employee)}
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="card-action-btn delete"
                        onClick={() => handleDelete(employee._id)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="card-row">
                      <span className="card-label">Auto Punch</span>
                      <span className="card-value">
                        <ToggleSwitch
                          checked={isAutoPunchActive(employee)}
                          onChange={() => handleToggleAutoPunch(employee._id, isAutoPunchActive(employee))}
                        />
                      </span>
                    </div>
                    <div className="card-row">
                      <span className="card-label">Email</span>
                      <span className="card-value">{employee.email || 'N/A'}</span>
                    </div>
                    <div className="card-row">
                      <span className="card-label">Manager</span>
                      <span className="card-value">{employee.managerId?.name || 'Unassigned'}</span>
                    </div>
                    <div className="card-row">
                      <span className="card-label">Shift</span>
                      <span className="card-value" style={{ textTransform: 'capitalize' }}>{employee.shift || 'N/A'}</span>
                    </div>
                    <div className="card-row">
                      <span className="card-label">Status</span>
                      <span className={`card-status ${employee.isWorking ? 'status-active' : 'status-on-leave'}`}>
                        {employee.isWorking ? 'Active' : 'On Leave'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
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

