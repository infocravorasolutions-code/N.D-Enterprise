import React, { useState, useEffect } from 'react'
import { FaSync, FaFileExcel, FaFilePdf } from 'react-icons/fa'
import { attendanceAPI } from '../services/api'
import Pagination from '../components/Pagination'
import './Page.css'

const SummaryReport = () => {
  const [fromDate, setFromDate] = useState('2025-12-25')
  const [toDate, setToDate] = useState('2026-01-04')
  const [attendanceData, setAttendanceData] = useState([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    fetchAttendanceSummary()
  }, [fromDate, toDate])

  const fetchAttendanceSummary = async () => {
    try {
      setLoading(true)
      // Fetch data for each date in the range
      const dates = getDatesBetween(fromDate, toDate)
      const summaryData = []
      
      for (const date of dates) {
        try {
          const [morningRes, eveningRes, nightRes] = await Promise.all([
            attendanceAPI.getSummary({ date, shift: 'morning' }).catch(() => ({ presentEmployees: 0 })),
            attendanceAPI.getSummary({ date, shift: 'evening' }).catch(() => ({ presentEmployees: 0 })),
            attendanceAPI.getSummary({ date, shift: 'night' }).catch(() => ({ presentEmployees: 0 }))
          ])
          
          // Backend returns presentEmployees field
          const morning = morningRes.presentEmployees || 0
          const evening = eveningRes.presentEmployees || 0
          const night = nightRes.presentEmployees || 0
          
          summaryData.push({
            date: formatDateForDisplay(date),
            morning: morning,
            evening: evening,
            night: night,
            total: morning + evening + night
          })
        } catch (error) {
          console.error(`Error fetching data for ${date}:`, error)
          // Add empty row for this date
          summaryData.push({
            date: formatDateForDisplay(date),
            morning: 0,
            evening: 0,
            night: 0,
            total: 0
          })
        }
      }
      
      setAttendanceData(summaryData)
    } catch (error) {
      console.error('Error fetching attendance summary:', error)
      setAttendanceData([])
    } finally {
      setLoading(false)
    }
  }

  const getDatesBetween = (startDate, endDate) => {
    const dates = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d).toISOString().split('T')[0])
    }
    
    return dates
  }

  const formatDateForDisplay = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const day = date.getDate()
    const month = date.toLocaleString('default', { month: 'long' })
    const year = date.getFullYear()
    const suffix = ['th', 'st', 'nd', 'rd'][day % 10] || 'th'
    return `${month} ${day}${suffix}, ${year}`
  }

  const calculateDays = () => {
    const from = new Date(fromDate)
    const to = new Date(toDate)
    const diffTime = Math.abs(to - from)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  // Pagination calculations
  const totalItems = attendanceData.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = attendanceData.slice(startIndex, endIndex)

  // Reset to page 1 when date range changes
  useEffect(() => {
    setCurrentPage(1)
  }, [fromDate, toDate])

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Summary Report</h1>
          <p className="page-subtitle">View attendance count by date range for all shifts</p>
        </div>
      </div>
      <div className="page-content">
        <div className="content-section">
          <div className="date-range-section">
            <p className="date-range-text">
              Choose From and To dates to view the attendance summary for all shifts
            </p>
            <div className="date-inputs">
              <div className="date-input-group">
                <label>From Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
                <span className="date-display">{formatDate(fromDate)}</span>
              </div>
              <div className="date-input-group">
                <label>To Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
                <span className="date-display">{formatDate(toDate)}</span>
              </div>
            </div>
            <div className="date-actions">
              <button className="btn-icon" onClick={fetchAttendanceSummary} disabled={loading}>
                <FaSync />
                <span>Refresh</span>
              </button>
              <button className="btn-icon">
                <FaFileExcel />
                <span>Excel</span>
              </button>
              <button className="btn-icon">
                <FaFilePdf />
                <span>PDF</span>
              </button>
            </div>
            <p className="date-range-info">
              Showing {calculateDays()} days ({fromDate.split('-').reverse().join('-')} to {toDate.split('-').reverse().join('-')})
            </p>
          </div>
          <div className="table-section">
            <h3 className="table-title">Attendance Summary</h3>
            <p className="table-subtitle">
              Employee count from {fromDate.split('-').reverse().join('-')} to {toDate.split('-').reverse().join('-')} ({calculateDays()} days)
            </p>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Morning Shift</th>
                    <th>Evening Shift</th>
                    <th>Night Shift</th>
                    <th>Total</th>
                  </tr>
                </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="empty-state">Loading...</td>
                  </tr>
                ) : attendanceData.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-state">No attendance data available</td>
                  </tr>
                ) : (
                  paginatedData.map((row, index) => (
                    <tr key={index}>
                      <td>{row.date}</td>
                      <td>{row.morning}P</td>
                      <td>{row.evening}P</td>
                      <td>{row.night}P</td>
                      <td>{row.total} Total Present</td>
                    </tr>
                  ))
                )}
              </tbody>
              </table>
            </div>
            {attendanceData.length > 0 && (
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
    </div>
  )
}

export default SummaryReport

