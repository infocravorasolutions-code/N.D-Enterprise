import React, { useState, useEffect } from 'react'
import { FaSync, FaFilePdf, FaFileExcel } from 'react-icons/fa'
import { employeeAPI, attendanceAPI } from '../services/api'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import logoImage from '../images/Logo.jpg'
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
      const employeesList = Array.isArray(response) 
        ? response 
        : (response?.data || [])
      
      setEmployees(employeesList)
        setSummary(prev => ({
          ...prev,
        totalEmployees: employeesList.length
        }))
      
      console.log('Fetched employees for muster roll:', employeesList.length)
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
      
      console.log('Attendance records fetched:', attendanceRecords.length)
      console.log('Sample attendance record:', attendanceRecords[0])
      console.log('Employees list:', employees.length)
      
      const processedData = processAttendanceData(attendanceRecords, employees)
      
      console.log('Processed muster roll data:', processedData.length)
      console.log('Sample processed row:', processedData[0])
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
    
    // Create a map of employees by ID for faster lookup
    const employeeMap = {}
    employeesList.forEach(emp => {
      const empIdStr = String(emp._id || emp.id)
      employeeMap[empIdStr] = emp
    })
    
    attendanceRecords.forEach(record => {
      // Handle both populated and unpopulated employeeId
      let empId = null
      let employee = null
      
      if (record.employeeId) {
        if (typeof record.employeeId === 'object' && record.employeeId._id) {
          // Populated employeeId
          empId = String(record.employeeId._id)
          employee = record.employeeId // Use populated data directly
        } else {
          // Unpopulated employeeId (just the ID)
          empId = String(record.employeeId)
          employee = employeeMap[empId]
        }
      }
      
      if (!empId) {
        console.warn('Attendance record missing employeeId:', record)
        return // Skip records without employeeId
      }
      
      if (!employeeAttendanceMap[empId]) {
        employeeAttendanceMap[empId] = {
          employeeId: empId,
          name: employee?.name || record.employeeId?.name || 'Unknown',
          designation: employee?.designation || record.employeeId?.designation || 'N/A',
          shift: employee?.shift || record.employeeId?.shift || record.shift || 'N/A',
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

  // Calculate totals for each day (column totals)
  const calculateDayTotals = () => {
    const dayTotals = {}
    daysInPeriod.forEach(({ day }) => {
      dayTotals[day] = filteredData.filter(row => 
        row.attendance && row.attendance[day] && row.attendance[day].status === 'P'
      ).length
    })
    return dayTotals
  }

  // Calculate totals for each employee (row totals)
  const calculateRowTotals = () => {
    const rowTotals = {}
    filteredData.forEach((row, index) => {
      const presentDays = Object.values(row.attendance || {}).filter(att => att.status === 'P').length
      rowTotals[index] = presentDays
    })
    return rowTotals
  }

  const dayTotals = calculateDayTotals()
  const rowTotals = calculateRowTotals()
  const grandTotal = Object.values(rowTotals).reduce((sum, total) => sum + total, 0)

  // Calculate attendance summary for each employee (for mobile cards)
  const calculateEmployeeSummary = (row) => {
    const attendance = row.attendance || {}
    let present = 0
    let absent = 0
    let weekOff = 0
    
    daysInPeriod.forEach(({ day }) => {
      if (attendance[day]) {
        if (attendance[day].status === 'P') present++
        else if (attendance[day].status === 'A') absent++
        else if (attendance[day].status === 'W') weekOff++
      }
    })
    
    return { present, absent, weekOff }
  }

  const exportToPDF = async () => {
    try {
      console.log('PDF export button clicked')
      
      if (!filteredData || filteredData.length === 0) {
        alert('No data available to export')
        return
      }

      console.log('Creating PDF document...')
      const doc = new jsPDF('landscape')
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      
      // Company Branding Header
      const headerY = 10
      const logoSize = 30
      
      // Add logo if available
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = logoImage
        
        await new Promise((resolve, reject) => {
          img.onload = () => {
            try {
              doc.addImage(img, 'JPEG', 15, headerY, logoSize, logoSize * (img.height / img.width))
              resolve()
            } catch (e) {
              console.warn('Could not add logo to PDF:', e)
              resolve() // Continue without logo
            }
          }
          img.onerror = () => {
            console.warn('Logo image failed to load')
            resolve() // Continue without logo
          }
          // Timeout after 2 seconds
          setTimeout(() => resolve(), 2000)
        })
      } catch (e) {
        console.warn('Logo loading error:', e)
      }
      
      // Company Name and Details
      const companyNameX = logoSize + 25
      doc.setFontSize(18)
      doc.setFont(undefined, 'bold')
      doc.text('ND ENTERPRISE', companyNameX, headerY + 8)
      
      doc.setFontSize(10)
      doc.setFont(undefined, 'normal')
      doc.text('Workforce Management System', companyNameX, headerY + 15)
      
      // Report Title (centered)
      doc.setFontSize(16)
      doc.setFont(undefined, 'bold')
      doc.text('MUSTER ROLL REPORT', pageWidth / 2, headerY + 25, { align: 'center' })
      
      // Form Number and Period
      doc.setFontSize(11)
      doc.setFont(undefined, 'normal')
      const periodText = `Form XVI-1 | Period: ${summary.selectedPeriod || `${new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long' })} ${year}`}`
      doc.text(periodText, pageWidth / 2, headerY + 32, { align: 'center' })
      
      // Add a line separator
      doc.setDrawColor(139, 92, 246)
      doc.setLineWidth(0.5)
      doc.line(15, headerY + 37, pageWidth - 15, headerY + 37)
      
      // Prepare table data with clock-in/clock-out times (compact format)
      const tableData = filteredData.map((row, index) => {
        const rowData = [
          index + 1,
          row.name.length > 25 ? row.name.substring(0, 22) + '...' : row.name, // Truncate long names
          row.designation || 'N/A',
          row.shift?.substring(0, 3).toUpperCase() || 'N/A', // Abbreviate shift
          ...daysInPeriod.map(({ day }) => {
            if (row.attendance && row.attendance[day] && row.attendance[day].status === 'P') {
              const att = row.attendance[day]
              const stepIn = att.stepIn || ''
              const stepOut = att.stepOut || ''
              // Compact format: "P\nHH:MM\nHH:MM" (removed "IN:" and "OUT:" labels to save space)
              if (stepIn && stepOut) {
                return `P\n${stepIn}\n${stepOut}`
              } else if (stepIn) {
                return `P\n${stepIn}`
              } else {
                return 'P'
              }
            }
            return '-'
          }),
          rowTotals[index] || 0
        ]
        return rowData
      })
      
      // Add total row
      const totalRow = [
        'TOTAL',
        '',
        '',
        '',
        ...daysInPeriod.map(({ day }) => dayTotals[day] || 0),
        grandTotal
      ]
      tableData.push(totalRow)
      
      // Table headers with properly formatted dates (compact format to fit all dates)
      const headers = [
        'SR',
        'NAME',
        'DESG',
        'SHIFT',
        ...daysInPeriod.map(({ day, date }) => {
          // Format as just "DD" to save space (removed day abbreviation)
          return String(day).padStart(2, '0')
        }),
        'TOT'
      ]
      
      // Check if autoTable is available
      console.log('Checking autoTable availability...', typeof doc.autoTable, typeof autoTable)
      
      // Table configuration with improved styling
      const tableConfig = {
        head: [headers],
        body: tableData,
        startY: headerY + 42,
        styles: { 
          fontSize: 5,
          cellPadding: 1,
          halign: 'center',
          valign: 'middle',
          lineWidth: 0.1,
          lineColor: [200, 200, 200]
        },
        headStyles: { 
          fillColor: [139, 92, 246],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          fontSize: 6,
          cellPadding: 1.5
        },
        bodyStyles: {
          halign: 'center',
          valign: 'top',
          fontSize: 5
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251]
        },
        columnStyles: (() => {
          // Calculate available width (landscape A4 is ~842 points, minus margins)
          const availableWidth = pageWidth - 30 // 15px margin on each side
          const fixedColumnsWidth = 8 + 28 + 12 + 12 + 10 // SR + NAME + DESG + SHIFT + TOT
          const dateColumnsWidth = availableWidth - fixedColumnsWidth
          const dateColumnWidth = Math.max(6, Math.floor(dateColumnsWidth / daysInPeriod.length)) // Minimum 6, distribute evenly
          
          const styles = {
            0: { cellWidth: 8, halign: 'center', fontSize: 6 }, // SR
            1: { cellWidth: 28, halign: 'left', fontSize: 6 },   // NAME (reduced)
            2: { cellWidth: 12, halign: 'left', fontSize: 6 },   // DESIGNATION (reduced)
            3: { cellWidth: 12, halign: 'center', fontSize: 6 }, // SHIFT (reduced)
          }
          // Date columns - optimized width to fit all dates
          daysInPeriod.forEach((_, idx) => {
            styles[idx + 4] = { cellWidth: dateColumnWidth, halign: 'center', fontSize: 4 }
          })
          // TOTAL column
          styles[daysInPeriod.length + 4] = { cellWidth: 10, halign: 'center', fontSize: 6 }
          return styles
        })(),
        margin: { top: headerY + 42, left: 10, right: 10 },
        theme: 'striped',
        didParseCell: function(data) {
          // Make date columns and attendance cells smaller with better formatting
          if (data.column.index >= 4 && data.column.index < daysInPeriod.length + 4) {
            data.cell.styles.fontSize = 4
            data.cell.styles.cellPadding = 0.5
            data.cell.styles.valign = 'top'
            data.cell.styles.lineHeight = 1.2
          }
          // Optimize other columns
          if (data.column.index === 1) { // NAME column
            data.cell.styles.fontSize = 5.5
          }
        }
      }
      
      // Try using autoTable as a function first (for jspdf-autotable v5.x)
      if (typeof autoTable === 'function') {
        console.log('Using autoTable as function...')
        autoTable(doc, tableConfig)
      } else if (typeof doc.autoTable === 'function') {
        console.log('Using doc.autoTable method...')
        doc.autoTable(tableConfig)
      } else {
        console.error('autoTable is not available in any form')
        alert('PDF export library not loaded. The autoTable plugin may not be properly imported. Please check the console and refresh the page.')
        // Try to create a simple PDF without table as fallback
        doc.text('PDF export requires jspdf-autotable plugin', 20, 50)
        doc.save(`MusterRoll_${year}_${month}.pdf`)
        return
      }
      
      // Footer with company branding
      const footerY = pageHeight - 15
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.3)
      doc.line(15, footerY - 5, pageWidth - 15, footerY - 5)
      
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text('ND Enterprise - Workforce Management System', pageWidth / 2, footerY, { align: 'center' })
      doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`, pageWidth / 2, footerY + 5, { align: 'center' })
      
      // Page numbers
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, footerY + 5, { align: 'right' })
      }
      
      console.log('Saving PDF...')
      doc.save(`ND_Enterprise_MusterRoll_${year}_${month}.pdf`)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Failed to export PDF. Please check the console for details.')
    }
  }

  const exportToExcel = () => {
    // Prepare worksheet data
    const wsData = []
    
    // Header row
    const headers = [
      'SR',
      'NAME',
      'DESIGNATION',
      'SHIFT',
      ...daysInPeriod.map(({ day }) => day.toString()),
      'TOTAL'
    ]
    wsData.push(headers)
    
    // Data rows
    filteredData.forEach((row, index) => {
      const rowData = [
        index + 1,
        row.name,
        row.designation,
        row.shift,
        ...daysInPeriod.map(({ day }) => {
          if (row.attendance && row.attendance[day] && row.attendance[day].status === 'P') {
            return 'P'
          }
          return '-'
        }),
        rowTotals[index] || 0
      ]
      wsData.push(rowData)
    })
    
    // Total row
    const totalRow = [
      'TOTAL',
      '',
      '',
      '',
      ...daysInPeriod.map(({ day }) => dayTotals[day] || 0),
      grandTotal
    ]
    wsData.push(totalRow)
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    
    // Set column widths
    const colWidths = [
      { wch: 5 },  // SR
      { wch: 25 }, // NAME
      { wch: 20 }, // DESIGNATION
      { wch: 10 }, // SHIFT
      ...daysInPeriod.map(() => ({ wch: 5 })), // Day columns
      { wch: 8 }   // TOTAL
    ]
    ws['!cols'] = colWidths
    
    XLSX.utils.book_append_sheet(wb, ws, 'Muster Roll')
    XLSX.writeFile(wb, `MusterRoll_${year}_${month}.xlsx`)
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Muster Roll Report</h1>
          <p className="page-subtitle">Form XVI 1 - January 2026</p>
        </div>
            <div className="header-actions">
              <button className="btn-icon" onClick={fetchMusterRollData} disabled={loading} title="Refresh">
                <FaSync />
                <span>Refresh</span>
              </button>
              <button className="btn-icon" onClick={exportToPDF} disabled={loading || filteredData.length === 0} title="Export to PDF">
                <FaFilePdf />
                <span>PDF</span>
              </button>
              <button className="btn-icon btn-icon-active" onClick={exportToExcel} disabled={loading || filteredData.length === 0} title="Export to Excel">
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
          {/* Mobile Card View */}
          <div className="muster-mobile-cards mobile-only">
            {loading ? (
              <div className="empty-state">Loading...</div>
            ) : filteredData.length === 0 ? (
              <div className="empty-state">No data available</div>
            ) : (
              filteredData.map((row, index) => {
                const summary = calculateEmployeeSummary(row)
                return (
                  <div key={row.employeeId || index} className="muster-card-mobile">
                    <div className="muster-card-header">
                      <div className="muster-card-info">
                        <h3 className="muster-card-name">{row.name}</h3>
                        <p className="muster-card-shift">{row.shift || 'N/A'}</p>
                      </div>
                      <div className="muster-card-summary">
                        <span className="summary-item summary-present">{summary.present}P</span>
                        <span className="summary-item summary-absent">{summary.absent}A</span>
                        <span className="summary-item summary-weekoff">{summary.weekOff}W</span>
                      </div>
                    </div>
                    <div className="muster-card-attendance">
                      <div className="attendance-days-header">
                        {daysInPeriod.map(({ day }) => (
                          <div key={day} className="attendance-day-header">{day}</div>
                        ))}
                      </div>
                      <div className="attendance-days-content">
                        {daysInPeriod.map(({ day }) => (
                          <div key={day} className="attendance-day-cell">
                            {row.attendance && row.attendance[day] ? (
                              <div className="attendance-day-content">
                                <div className={`attendance-day-status badge-${row.attendance[day].status.toLowerCase()}`}>
                                  {row.attendance[day].status}
                                </div>
                                {row.attendance[day].stepIn && (
                                  <div className="attendance-day-time attendance-time-in">
                                    {row.attendance[day].stepIn}
                                  </div>
                                )}
                                {row.attendance[day].stepOut && (
                                  <div className="attendance-day-time attendance-time-out">
                                    {row.attendance[day].stepOut}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="attendance-day-empty">-</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Desktop Table View */}
          <div className="table-wrapper-mobile desktop-only">
            <div className="scroll-hint">← Swipe to see all days →</div>
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
                  <th className="sticky-col total-col">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5 + daysInPeriod.length} className="empty-state">Loading...</td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={5 + daysInPeriod.length} className="empty-state">No data available</td>
                  </tr>
                ) : (
                  <>
                    {filteredData.map((row, index) => (
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
                        <td className="sticky-col total-col" style={{ fontWeight: 'bold', background: '#f9fafb' }}>
                          {rowTotals[index] || 0}
                        </td>
                      </tr>
                    ))}
                    {/* Total Row */}
                    <tr style={{ background: '#f3f4f6', fontWeight: 'bold' }}>
                      <td className="sticky-col" style={{ fontWeight: 'bold' }}>TOTAL</td>
                      <td className="sticky-col" style={{ fontWeight: 'bold' }} colSpan="3"></td>
                      {daysInPeriod.map(({ day }) => (
                        <td key={day} style={{ textAlign: 'center', fontWeight: 'bold', background: '#f3f4f6' }}>
                          {dayTotals[day] || 0}
                        </td>
                      ))}
                      <td className="sticky-col total-col" style={{ fontWeight: 'bold', background: '#e5e7eb' }}>
                        {grandTotal}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MasterRollReport

