import React, { useState, useEffect } from 'react'
import { FaTimes, FaSearch, FaCheckSquare, FaSquare, FaUserTie } from 'react-icons/fa'
import { employeeAPI, siteAPI, managerAPI } from '../services/api'
import './Modal.css'

const AssignEmployeesModal = ({ isOpen, onClose, siteId, siteName, onSuccess }) => {
  const [employees, setEmployees] = useState([])
  const [filteredEmployees, setFilteredEmployees] = useState([])
  const [selectedEmployees, setSelectedEmployees] = useState(new Set())
  const [siteManagers, setSiteManagers] = useState([])
  const [allManagers, setAllManagers] = useState([])
  const [selectedManagerId, setSelectedManagerId] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingManagers, setLoadingManagers] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [shiftFilter, setShiftFilter] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchGlobalEmployees()
      if (siteId) {
        fetchManagersData()
      }
    } else {
      // Reset state when modal closes
      setSelectedEmployees(new Set())
      setSearchQuery('')
      setShiftFilter('')
      setSelectedManagerId('')
      setSiteManagers([])
      setAllManagers([])
    }
  }, [isOpen, siteId])

  useEffect(() => {
    filterEmployees()
  }, [employees, searchQuery, shiftFilter])

  const fetchManagersData = async () => {
    try {
      setLoadingManagers(true)
      const siteMgrResponse = await siteAPI.getManagers(siteId)
      const siteMgrs = Array.isArray(siteMgrResponse) 
        ? siteMgrResponse 
        : (siteMgrResponse?.data || [])
      setSiteManagers(siteMgrs)

      if (siteMgrs.length > 0) {
        setSelectedManagerId(siteMgrs[0]._id)
      } else {
        const allMgrResponse = await managerAPI.getAll()
        const allMgrs = Array.isArray(allMgrResponse) 
          ? allMgrResponse 
          : (allMgrResponse?.data || [])
        setAllManagers(allMgrs)
      }
    } catch (err) {
      console.error('Error fetching managers:', err)
    } finally {
      setLoadingManagers(false)
    }
  }

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
      alert('Please select at least one employee to import.')
      return
    }

    try {
      setAssigning(true)
      const employeeIds = Array.from(selectedEmployees)
      await siteAPI.assignEmployees(siteId, employeeIds, selectedManagerId || undefined)
      
      alert(`Successfully imported ${employeeIds.length} employee(s) to ${siteName}`)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error importing employees:', error)
      alert(error.message || 'Failed to import employees. Please try again.')
    } finally {
      setAssigning(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import Employees to {siteName}</h2>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '60vh', overflow: 'auto' }}>
          {/* Site Supervisor Status / Selector */}
          <div style={{
            marginBottom: '16px',
            padding: '12px 16px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            {loadingManagers ? (
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>Checking site supervisor...</span>
            ) : siteManagers.length > 1 ? (
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  <FaUserTie style={{ color: '#8b5cf6' }} /> Assigned Supervisor for this Site:
                </label>
                <select
                  className="form-input"
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  style={{ width: '100%', fontSize: '14px' }}
                >
                  {siteManagers.map(m => (
                    <option key={m._id} value={m._id}>
                      {m.name} ({m.email || m.mobile || 'Supervisor'})
                    </option>
                  ))}
                </select>
              </div>
            ) : siteManagers.length === 1 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FaUserTie style={{ color: '#8b5cf6' }} /> Site Supervisor: <strong style={{ color: '#1e293b' }}>{siteManagers[0].name}</strong>
                </span>
                <span style={{ fontSize: '12px', color: '#10b981', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '12px', fontWeight: '500' }}>
                  Assigned to Site
                </span>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: allManagers.length > 0 ? '8px' : '0' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaUserTie style={{ color: '#f59e0b' }} /> Site Supervisor: <span style={{ color: '#d97706', fontWeight: '500' }}>None assigned to site yet</span>
                  </span>
                </div>
                {allManagers.length > 0 && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                      Assign Supervisor (Optional):
                    </label>
                    <select
                      className="form-input"
                      value={selectedManagerId}
                      onChange={(e) => setSelectedManagerId(e.target.value)}
                      style={{ width: '100%', fontSize: '13px' }}
                    >
                      <option value="">Keep default / existing employee supervisor</option>
                      {allManagers.map(m => (
                        <option key={m._id} value={m._id}>
                          {m.name} ({m.email || m.mobile || 'Supervisor'})
                        </option>
                      ))}
                    </select>
                    <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                      Employees can be imported directly without a site supervisor. Existing supervisor links will be preserved.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

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
                {selectedEmployees.size === filteredEmployees.length && filteredEmployees.length > 0 ? 'Deselect All' : 'Select All'}
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
                  ? 'No global employees available to import.' 
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
            {assigning ? 'Importing...' : `Import ${selectedEmployees.size} Employee(s)`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AssignEmployeesModal
