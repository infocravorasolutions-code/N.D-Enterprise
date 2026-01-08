import React, { useState, useEffect } from 'react'
import { FaTimes, FaSearch, FaCheckSquare, FaSquare } from 'react-icons/fa'
import { employeeAPI, siteAPI } from '../services/api'
import './Modal.css'

const AssignEmployeesModal = ({ isOpen, onClose, siteId, siteName, onSuccess }) => {
  const [employees, setEmployees] = useState([])
  const [filteredEmployees, setFilteredEmployees] = useState([])
  const [selectedEmployees, setSelectedEmployees] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [shiftFilter, setShiftFilter] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchGlobalEmployees()
    } else {
      // Reset state when modal closes
      setSelectedEmployees(new Set())
      setSearchQuery('')
      setShiftFilter('')
    }
  }, [isOpen])

  useEffect(() => {
    filterEmployees()
  }, [employees, searchQuery, shiftFilter])

  const fetchGlobalEmployees = async () => {
    try {
      setLoading(true)
      // Fetch only global employees (siteId: null)
      const response = await employeeAPI.getAll()
      const employeesList = Array.isArray(response) 
        ? response 
        : (response?.data || [])
      
      // Filter to only show global employees (not assigned to any site)
      const globalEmployees = employeesList.filter(emp => !emp.siteId || emp.siteId === null)
      setEmployees(globalEmployees)
    } catch (error) {
      console.error('Error fetching employees:', error)
      alert('Failed to fetch employees. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filterEmployees = () => {
    let filtered = [...employees]

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(emp =>
        emp.name?.toLowerCase().includes(query) ||
        emp.email?.toLowerCase().includes(query) ||
        emp.mobile?.toLowerCase().includes(query)
      )
    }

    // Filter by shift
    if (shiftFilter) {
      filtered = filtered.filter(emp => emp.shift === shiftFilter)
    }

    setFilteredEmployees(filtered)
  }

  const toggleEmployee = (employeeId) => {
    const newSelected = new Set(selectedEmployees)
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId)
    } else {
      newSelected.add(employeeId)
    }
    setSelectedEmployees(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedEmployees.size === filteredEmployees.length) {
      setSelectedEmployees(new Set())
    } else {
      setSelectedEmployees(new Set(filteredEmployees.map(emp => emp._id)))
    }
  }

  const handleAssign = async () => {
    if (selectedEmployees.size === 0) {
      alert('Please select at least one employee to assign.')
      return
    }

    try {
      setAssigning(true)
      const employeeIds = Array.from(selectedEmployees)
      await siteAPI.assignEmployees(siteId, employeeIds)
      
      alert(`Successfully assigned ${employeeIds.length} employee(s) to ${siteName}`)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error assigning employees:', error)
      alert(error.message || 'Failed to assign employees. Please try again.')
    } finally {
      setAssigning(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Assign Employees to {siteName}</h2>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '60vh', overflow: 'auto' }}>
          {/* Search and Filters */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <FaSearch style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af'
                }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search employees by name, email, or mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                />
              </div>
              <select
                className="form-input"
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                style={{ width: '150px' }}
              >
                <option value="">All Shifts</option>
                <option value="morning">Morning</option>
                <option value="evening">Evening</option>
                <option value="night">Night</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>
                {filteredEmployees.length} employee(s) available
              </span>
              <button
                className="btn-secondary"
                onClick={toggleSelectAll}
                style={{ fontSize: '14px', padding: '6px 12px' }}
              >
                {selectedEmployees.size === filteredEmployees.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>

          {/* Employees List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>Loading employees...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: '#6b7280' }}>
                {employees.length === 0 
                  ? 'No global employees available to assign.' 
                  : 'No employees match your search criteria.'}
              </p>
            </div>
          ) : (
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
              {filteredEmployees.map((employee) => {
                const isSelected = selectedEmployees.has(employee._id)
                return (
                  <div
                    key={employee._id}
                    onClick={() => toggleEmployee(employee._id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderBottom: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#f3f4f6' : 'white',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#f9fafb'
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'white'
                    }}
                  >
                    <div style={{ marginRight: '12px' }}>
                      {isSelected ? (
                        <FaCheckSquare style={{ color: '#8b5cf6', fontSize: '20px' }} />
                      ) : (
                        <FaSquare style={{ color: '#d1d5db', fontSize: '20px' }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', color: '#1f2937', marginBottom: '4px' }}>
                        {employee.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {employee.email && `${employee.email} • `}
                        {employee.mobile && `${employee.mobile} • `}
                        <span style={{ textTransform: 'capitalize' }}>{employee.shift}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={assigning}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleAssign}
            disabled={assigning || selectedEmployees.size === 0}
          >
            {assigning ? 'Assigning...' : `Assign ${selectedEmployees.size} Employee(s)`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AssignEmployeesModal

