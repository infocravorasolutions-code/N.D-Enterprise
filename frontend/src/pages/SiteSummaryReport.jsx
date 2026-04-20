import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FaSync, FaFileExcel, FaFilePdf, FaArrowLeft } from 'react-icons/fa'
import { siteAPI, attendanceAPI } from '../services/api'
import Pagination from '../components/Pagination'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import logoImage from '../images/Logo.jpg'
import './Page.css'

const SiteSummaryReport = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0])
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0])
  const [attendanceData, setAttendanceData] = useState([])
  const [site, setSite] = useState(null)
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Check if readonly admin with assigned site
  const userData = JSON.parse(localStorage.getItem('user') || '{}')
  const userType = localStorage.getItem('userType')
  const isReadonlyAdminWithSite = userType === 'admin' && userData.role === 'readonly' && userData.siteId

  useEffect(() => {
    // Check if readonly admin is trying to access a site they're not assigned to
    if (isReadonlyAdminWithSite && userData.siteId !== id) {
      navigate(`/sites/${userData.siteId}/summary-report`, { replace: true })
      return
    }
    fetchSiteData()
    fetchAttendanceSummary()
  }, [id, fromDate, toDate, isReadonlyAdminWithSite, userData.siteId, navigate])

  const fetchSiteData = async () => {
    try {
      const response = await siteAPI.get(id)
      setSite(response.data)
    } catch (error) {
      console.error('Error fetching site:', error)
    }
  }

  const fetchAttendanceSummary = async () => {
    try {
      setLoading(true)
      // Fetch site-specific attendance for each date in the range
      const dates = getDatesBetween(fromDate, toDate)
      const summaryData = []
      
      for (const date of dates) {
        try {
          // Get site attendance for this date
          const attendanceResponse = await siteAPI.getAttendance(id, {
            startDate: date,
            endDate: date
          })
          
          const attendanceRecords = attendanceResponse.data || []
          
          // Group by shift
          const morning = attendanceRecords.filter(r => r.shift === 'morning').length
          const evening = attendanceRecords.filter(r => r.shift === 'evening').length
          const night = attendanceRecords.filter(r => r.shift === 'night').length
          
          summaryData.push({
            date: formatDateForDisplay(date),
            morning: morning,
            evening: evening,
            night: night,
            total: morning + evening + night
          })
        } catch (error) {
          console.error(`Error fetching data for ${date}:`, error)
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

  // Pagination
  const totalItems = attendanceData.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = attendanceData.slice(startIndex, endIndex)

  // Calculate totals
  const totals = attendanceData.reduce((acc, item) => ({
    morning: acc.morning + item.morning,
    evening: acc.evening + item.evening,
    night: acc.night + item.night,
    total: acc.total + item.total
  }), { morning: 0, evening: 0, night: 0, total: 0 })

  // Reset to page 1 when date range changes
  useEffect(() => {
    setCurrentPage(1)
  }, [fromDate, toDate])

  const exportToPDF = async () => {
    try {
      if (!attendanceData || attendanceData.length === 0) {
        alert('No data available to export')
        return
      }

      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      
      // Company Branding Header
      const headerY = 10
      const logoSize = 20
      
      // Add logo if available
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = logoImage
        
        await new Promise((resolve) => {
          img.onload = () => {
            try {
              doc.addImage(img, 'JPEG', 15, headerY, logoSize, logoSize * (img.height / img.width))
              resolve()
            } catch (e) {
              console.warn('Could not add logo to PDF:', e)
              resolve()
            }
          }
          img.onerror = () => {
            console.warn('Logo image failed to load')
            resolve()
          }
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
      
      // Site Name
      doc.setFontSize(11)
      doc.setFont(undefined, 'bold')
      doc.text(`Site: ${site?.name || 'N/A'}`, companyNameX, headerY + 22)
      if (site?.location) {
        doc.setFontSize(9)
        doc.setFont(undefined, 'normal')
        doc.text(`Location: ${site.location}`, companyNameX, headerY + 28)
      }
      
      // Report Title (centered)
      doc.setFontSize(16)
      doc.setFont(undefined, 'bold')
      doc.text('SUMMARY REPORT', pageWidth / 2, headerY + 25, { align: 'center' })
      
      // Period
      doc.setFontSize(11)
      doc.setFont(undefined, 'normal')
      const periodText = `Period: ${fromDate.split('-').reverse().join('-')} to ${toDate.split('-').reverse().join('-')}`
      doc.text(periodText, pageWidth / 2, headerY + 32, { align: 'center' })
      
      // Add a line separator
      doc.setDrawColor(139, 92, 246)
      doc.setLineWidth(0.5)
      doc.line(15, headerY + 37, pageWidth - 15, headerY + 37)
      
      // Prepare table data
      const tableData = attendanceData.map(row => [
        row.date,
        `${row.morning}P`,
        `${row.evening}P`,
        `${row.night}P`,
        `${row.total} Total Present`
      ])
      
      // Try using autoTable as a function first
      if (typeof autoTable === 'function') {
        autoTable(doc, {
          head: [['Date', 'Morning Shift', 'Evening Shift', 'Night Shift', 'Total']],
          body: tableData,
          startY: headerY + 42,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
          margin: { top: headerY + 42, left: 15, right: 15 }
        })
      } else if (typeof doc.autoTable === 'function') {
        doc.autoTable({
          head: [['Date', 'Morning Shift', 'Evening Shift', 'Night Shift', 'Total']],
          body: tableData,
          startY: headerY + 42,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
          margin: { top: headerY + 42, left: 15, right: 15 }
        })
      } else {
        alert('PDF export library not loaded. Please refresh the page and try again.')
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
      
      doc.save(`ND_Enterprise_${site?.name || 'Site'}_SummaryReport_${fromDate}_${toDate}.pdf`)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert(`Failed to export PDF: ${error.message}`)
    }
  }

  const exportToExcel = () => {
    // Prepare worksheet data
    const wsData = []
    
    // Header row
    wsData.push(['Date', 'Morning Shift', 'Evening Shift', 'Night Shift', 'Total'])
    
    // Data rows
    attendanceData.forEach(row => {
      wsData.push([
        row.date,
        `${row.morning}P`,
        `${row.evening}P`,
        `${row.night}P`,
        `${row.total} Total Present`
      ])
    })
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    
    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // Date
      { wch: 15 }, // Morning
      { wch: 15 }, // Evening
      { wch: 15 }, // Night
      { wch: 20 }  // Total
    ]
    
    XLSX.utils.book_append_sheet(wb, ws, 'Summary Report')
    XLSX.writeFile(wb, `${site?.name || 'Site'}_SummaryReport_${fromDate}_${toDate}.xlsx`)
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <button 
            className="btn-icon" 
            onClick={() => navigate(`/sites/${id}`)}
            style={{ marginBottom: '12px' }}
          >
            <FaArrowLeft style={{ marginRight: '8px' }} />
            Back to Site Details
          </button>
          <h1>{site?.name || 'Site'} - Summary Report</h1>
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
              <button className="btn-icon" onClick={exportToExcel} disabled={loading || attendanceData.length === 0}>
                <FaFileExcel />
                <span>Excel</span>
              </button>
              <button className="btn-icon" onClick={exportToPDF} disabled={loading || attendanceData.length === 0}>
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

export default SiteSummaryReport

