import React, { useState, useEffect } from 'react'
import { attendanceAPI, employeeAPI } from '../services/api'
import Pagination from '../components/Pagination'
import './Page.css'

const AttendanceReports = () => {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    fetchEmployees()
  }, [])

  useEffect(() => {
    if (fromDate && toDate) {
      fetchAttendanceRecords()
    }
  }, [fromDate, toDate, selectedEmployee, statusFilter])

  const fetchEmployees = async () => {
    try {
      const response = await employeeAPI.getAll()
      if (response && response.data) {
        setEmployees(response.data)
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = {
        fromDate,
        toDate
      }
      
      if (selectedEmployee) {
        // If specific employee selected, use employee-specific endpoint
        const response = await attendanceAPI.getByEmployee(selectedEmployee)
        let records = response.data || []
        
        // Filter by date range
        records = records.filter(record => {
          const recordDate = new Date(record.stepIn)
          return recordDate >= new Date(fromDate) && recordDate <= new Date(toDate)
        })
        
        // Filter by status
        if (statusFilter !== 'All') {
          records = records.filter(record => {
            if (statusFilter === 'Present') return record.stepIn && record.stepOut
            if (statusFilter === 'Absent') return !record.stepIn
            if (statusFilter === 'Late') {
              // Check if stepIn is after shift start time
              return record.stepIn && isLate(record.stepIn, record.shift)
            }
            return true
          })
        }
        
        setAttendanceRecords(records)
      } else {
        // Get all attendance records
        const response = await attendanceAPI.getAll(params)
        let records = response.data || response.attendance || []
        
        // Filter by status
        if (statusFilter !== 'All') {
          records = records.filter(record => {
            if (statusFilter === 'Present') return record.stepIn && record.stepOut
            if (statusFilter === 'Absent') return !record.stepIn
            if (statusFilter === 'Late') {
              return record.stepIn && isLate(record.stepIn, record.shift)
            }
            return true
          })
        }
        
        setAttendanceRecords(records)
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch attendance records')
      console.error('Error fetching attendance records:', err)
    } finally {
      setLoading(false)
    }
  }

  const isLate = (stepInTime, shift) => {
    const stepIn = new Date(stepInTime)
    const hour = stepIn.getHours()
    
    if (shift === 'morning' && hour > 7) return true
    if (shift === 'evening' && hour > 15) return true
    if (shift === 'night' && hour > 23) return true
    
    return false
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatus = (record) => {
    if (!record.stepIn) return 'Absent'
    if (!record.stepOut) return 'Working'
    if (isLate(record.stepIn, record.shift)) return 'Late'
    return 'Present'
  }

  // Pagination calculations
  const totalItems = attendanceRecords.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRecords = attendanceRecords.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [fromDate, toDate, selectedEmployee, statusFilter])

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <div>
            <h1>Attendance Reports</h1>
            <p className="page-subtitle">View detailed attendance reports</p>
          </div>
          <button className="btn-primary" onClick={fetchAttendanceRecords} disabled={loading}>
            Export Report
          </button>
        </div>
      </div>
      <div className="page-content">
        <div className="content-section">
          <div className="filters-container">
            <div className="filter-group">
              <label>Date Range</label>
              <input 
                type="date" 
                className="form-input" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <span>to</span>
              <input 
                type="date" 
                className="form-input"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>Employee</label>
              <select 
                className="form-input"
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
              >
                <option value="">All Employees</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Status</label>
              <select 
                className="form-input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>All</option>
                <option>Present</option>
                <option>Absent</option>
                <option>Late</option>
              </select>
            </div>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Status</th>
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
                ) : attendanceRecords.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-state">No attendance records found</td>
                  </tr>
                ) : (
                  paginatedRecords.map((record) => (
                    <tr key={record._id}>
                      <td>{formatDateTime(record.stepIn)}</td>
                      <td className="text-mono">{record.employeeId?._id?.substring(0, 12) || record.employeeId?.substring(0, 12) || '-'}</td>
                      <td>{record.employeeId?.name || 'Unknown'}</td>
                      <td>{formatDateTime(record.stepIn)}</td>
                      <td>{formatDateTime(record.stepOut)}</td>
                      <td>
                        <span className={`status-badge status-${getStatus(record).toLowerCase()}`}>
                          {getStatus(record)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {attendanceRecords.length > 0 && (
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

export default AttendanceReports

