import React, { useState, useEffect } from 'react'
import { FaSync, FaFilePdf, FaFileExcel } from 'react-icons/fa'
import { employeeAPI, attendanceAPI } from '../services/api'
import './Page.css'

const MasterRollReport = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [month, setMonth] = useState('01')
  const [year, setYear] = useState('2026')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [attendanceData, setAttendanceData] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState({
    totalPresentDays: 0,
    totalEmployees: 0,
    selectedPeriod: ''
  })

  useEffect(() => {
    fetchEmployees()
  }, [])

  useEffect(() => {
    if (month && year) {
      fetchMusterRollData()
    }
  }, [month, year, fromDate, toDate])

  const fetchEmployees = async () => {
    try {
      const response = await employeeAPI.getAll()
      if (response && response.data) {
        setEmployees(response.data)
        setSummary(prev => ({
          ...prev,
          totalEmployees: response.data.length
        }))
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const fetchMusterRollData = async () => {
    try {
      setLoading(true)
      const startDate = fromDate || `${year}-${month}-01`
      const endDate = toDate || `${year}-${month}-${new Date(parseInt(year), parseInt(month), 0).getDate()}`
      
      // Fetch all attendance records for the period
      const attendanceResponse = await attendanceAPI.getAll({
        fromDate: startDate,
        toDate: endDate
      })
      
      // Process attendance data to create muster roll format
      const attendanceRecords = attendanceResponse.data || attendanceResponse.attendance || []
      const processedData = processAttendanceData(attendanceRecords, employees)
      setAttendanceData(processedData)
      
      // Calculate summary
      const totalPresentDays = calculateTotalPresentDays(processedData)
      setSummary(prev => ({
        ...prev,
        totalPresentDays,
        selectedPeriod: new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long' }) + ' ' + year
      }))
    } catch (error) {
      console.error('Error fetching muster roll data:', error)
    } finally {
      setLoading(false)
    }
  }

  const processAttendanceData = (attendanceRecords, employeesList) => {
    // Group attendance by employee
    const employeeAttendanceMap = {}
    
    attendanceRecords.forEach(record => {
      const empId = record.employeeId?._id || record.employeeId
      if (!employeeAttendanceMap[empId]) {
        const employee = employeesList.find(emp => emp._id === empId)
        employeeAttendanceMap[empId] = {
          employeeId: empId,
          name: employee?.name || 'Unknown',
          designation: employee?.designation || 'N/A',
          shift: employee?.shift || record.shift || 'N/A',
          attendance: {}
        }
      }
      
      // Get date from stepIn
      if (record.stepIn) {
        const date = new Date(record.stepIn)
        const day = date.getDate()
        employeeAttendanceMap[empId].attendance[day] = {
          status: 'P',
          stepIn: record.stepIn ? formatTime(record.stepIn) : '',
          stepOut: record.stepOut ? formatTime(record.stepOut) : ''
        }
      }
    })
    
    // Convert to array format
    return Object.values(employeeAttendanceMap)
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  const calculateTotalPresentDays = (data) => {
    return data.reduce((total, emp) => {
      return total + Object.keys(emp.attendance || {}).length
    }, 0)
  }

  // Get all days in the selected period
  const getDaysInPeriod = () => {
    const startDate = fromDate || `${year}-${month}-01`
    const endDate = toDate || `${year}-${month}-${new Date(parseInt(year), parseInt(month), 0).getDate()}`
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = []
    
    const currentDate = new Date(start)
    while (currentDate <= end) {
      days.push({
        day: currentDate.getDate(),
        date: new Date(currentDate)
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return days
  }

  const filteredData = attendanceData.filter(item => {
    if (!searchQuery) return true
    return item.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const daysInPeriod = getDaysInPeriod()

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Muster Roll Report</h1>
          <p className="page-subtitle">Form XVI 1 - January 2026</p>
        </div>
            <div className="header-actions">
              <button className="btn-icon" onClick={fetchMusterRollData} disabled={loading}>
                <FaSync />
                <span>Refresh</span>
              </button>
              <button className="btn-icon">
                <FaFilePdf />
                <span>PDF</span>
              </button>
              <button className="btn-icon btn-icon-active">
                <FaFileExcel />
                <span>Excel</span>
              </button>
            </div>
      </div>
      <div className="page-content">
        <div className="content-section">
          <div className="muster-filters">
            <div className="search-bar">
              <input
                type="text"
                className="search-input"
                placeholder="Search employee name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="filter-row">
              <select className="form-input" value={month} onChange={(e) => setMonth(e.target.value)}>
                <option value="01">January</option>
                <option value="02">February</option>
                <option value="03">March</option>
                <option value="04">April</option>
                <option value="05">May</option>
                <option value="06">June</option>
                <option value="07">July</option>
                <option value="08">August</option>
                <option value="09">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
              <select className="form-input" value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
              <input
                type="date"
                className="form-input"
                placeholder="dd/mm/yyyy"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <input
                type="date"
                className="form-input"
                placeholder="dd/mm/yyyy"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
          <div className="muster-summary">
            <div className="summary-card">
              <h4>Total Present Days</h4>
              <p className="summary-value">{loading ? '...' : summary.totalPresentDays}</p>
            </div>
            <div className="summary-card">
              <h4>Total Employees</h4>
              <p className="summary-value">{loading ? '...' : summary.totalEmployees}</p>
            </div>
            <div className="summary-card">
              <h4>Selected Period</h4>
              <p className="summary-value">{summary.selectedPeriod || `${new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long' })} ${year}`}</p>
            </div>
          </div>
          <div className="legend">
            <span className="legend-item"><span className="legend-badge badge-p">P</span> Present</span>
            <span className="legend-item"><span className="legend-badge badge-a">A</span> Absent</span>
            <span className="legend-item"><span className="legend-badge badge-w">W</span> Week Off</span>
            <span className="legend-item"><span className="legend-badge badge-n">-</span> No Record</span>
          </div>
          <div className="table-container">
            <table className="data-table muster-table">
              <thead>
                <tr>
                  <th className="sticky-col">SR</th>
                  <th className="sticky-col">NAME</th>
                  <th className="sticky-col">DESIGNATION</th>
                  <th className="sticky-col">SHIFT</th>
                  {daysInPeriod.map(({ day, date }) => (
                    <th key={day} title={date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}>
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4 + daysInPeriod.length} className="empty-state">Loading...</td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={4 + daysInPeriod.length} className="empty-state">No data available</td>
                  </tr>
                ) : (
                  filteredData.map((row, index) => (
                    <tr key={row.employeeId || index}>
                      <td className="sticky-col">{index + 1}</td>
                      <td className="sticky-col">{row.name}</td>
                      <td className="sticky-col">{row.designation}</td>
                      <td className="sticky-col">{row.shift}</td>
                      {daysInPeriod.map(({ day }) => (
                        <td key={day} className="attendance-cell">
                          {row.attendance && row.attendance[day] ? (
                            <div className="attendance-content">
                              <div className="attendance-status">{row.attendance[day].status}</div>
                              {row.attendance[day].stepIn && (
                                <div className="attendance-step-in">{row.attendance[day].stepIn}</div>
                              )}
                              {row.attendance[day].stepOut && (
                                <div className="attendance-step-out">{row.attendance[day].stepOut}</div>
                              )}
                            </div>
                          ) : (
                            <span className="attendance-empty">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MasterRollReport

