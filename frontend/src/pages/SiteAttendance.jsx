import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaCalendarAlt, FaClock, FaMapMarkerAlt, FaCheckCircle, FaTimes, FaEdit, FaTrash, FaFilePdf, FaFileExcel } from 'react-icons/fa'
import { siteAPI, attendanceAPI, employeeAPI, managerAPI } from '../services/api'
import { getStaticUrl } from '../config'
import AlertModal from '../components/AlertModal'
import ConfirmModal from '../components/ConfirmModal'
import { useAlert, useConfirm } from '../hooks/useModal'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import logoImage from '../images/Logo.jpg'
import { downloadPDF, downloadExcel } from '../utils/fileDownload'
import './Page.css'

const SiteAttendance = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [attendance, setAttendance] = useState([])
  const [site, setSite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [selectedManager, setSelectedManager] = useState('')
  const [shiftFilter, setShiftFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [employees, setEmployees] = useState([])
  const [managers, setManagers] = useState([])
  const [editingRecord, setEditingRecord] = useState(null)
  const [editFormData, setEditFormData] = useState({
    shift: '',
    startDate: '',
    clockIn: '',
    endDate: '',
    clockOut: '',
    location: ''
  })
  const [selectedRecords, setSelectedRecords] = useState(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const { alertState, showAlert, hideAlert } = useAlert()
  const { confirmState, showConfirm, hideConfirm } = useConfirm()

  // Check if readonly admin with assigned site
  const userData = JSON.parse(localStorage.getItem('user') || '{}')
  const userType = localStorage.getItem('userType')
  const isReadonlyAdminWithSite = userType === 'admin' && userData.role === 'readonly' && userData.siteId

  useEffect(() => {
    // Check if readonly admin is trying to access a site they're not assigned to
    if (isReadonlyAdminWithSite && userData.siteId !== id) {
      navigate(`/sites/${userData.siteId}/attendance`, { replace: true })
      return
    }
    fetchSiteData()
    fetchSiteEmployees()
    fetchSiteManagers()
  }, [id, isReadonlyAdminWithSite, userData.siteId, navigate])

  useEffect(() => {
    fetchAttendance()
    setSelectedRecords(new Set()) // Clear selections when filters change
  }, [id, startDate, endDate, selectedEmployee, selectedManager, shiftFilter, statusFilter])

  const fetchSiteData = async () => {
    try {
      const response = await siteAPI.get(id)
      setSite(response.data)
    } catch (error) {
      console.error('Error fetching site:', error)
    }
  }

  const fetchSiteEmployees = async () => {
    try {
      const response = await siteAPI.getEmployees(id)
      setEmployees(response.data || [])
    } catch (error) {
      console.error('Error fetching site employees:', error)
    }
  }

  const fetchSiteManagers = async () => {
    try {
      const response = await siteAPI.getManagers(id)
      setManagers(response.data || [])
    } catch (error) {
      console.error('Error fetching site managers:', error)
    }
  }

  const fetchAttendance = async () => {
    try {
      setLoading(true)
      const params = {}
      if (startDate) {
        params.startDate = startDate
      }
      if (endDate) {
        params.endDate = endDate
      }
      if (shiftFilter) {
        params.shift = shiftFilter
      }
      if (selectedEmployee) {
        params.employeeId = selectedEmployee
      }
      const response = await siteAPI.getAttendance(id, params)
      let records = response.data || []
      
      // Client-side filtering for manager (backend doesn't support managerId filter)
      if (selectedManager) {
        records = records.filter(record => {
          const managerId = record.managerId?._id || record.managerId
          return String(managerId) === String(selectedManager)
        })
      }
      
      // Client-side filtering for status
      if (statusFilter !== 'All') {
        records = records.filter(record => {
          const status = getStatus(record)
          if (statusFilter === 'Present') return status === 'Present'
          if (statusFilter === 'Absent') return status === 'Absent'
          if (statusFilter === 'Late') {
            return status === 'Present' && isLate(record.stepIn, record.shift)
          }
          if (statusFilter === 'Working') return status === 'Working'
          return true
        })
      }
      
      setAttendance(records)
    } catch (error) {
      console.error('Error fetching site attendance:', error)
      showAlert('Failed to fetch attendance. Please try again.', 'Error', 'error')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const calculateDuration = (stepIn, stepOut) => {
    if (!stepIn || !stepOut) return 'N/A'
    const start = new Date(stepIn)
    const end = new Date(stepOut)
    const diffMs = end - start
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const getStatus = (record) => {
    if (!record.stepIn) return 'Absent'
    if (!record.stepOut) return 'Working'
    return 'Present'
  }

  const isLate = (stepInTime, shift) => {
    if (!stepInTime) return false
    const stepIn = new Date(stepInTime)
    const hour = stepIn.getHours()
    
    if (shift === 'morning' && hour > 7) return true
    if (shift === 'evening' && hour > 15) return true
    if (shift === 'night' && hour > 23) return true
    
    return false
  }

  // Calculate counts
  const calculateCounts = () => {
    const counts = {
      total: attendance.length,
      present: 0,
      absent: 0,
      late: 0,
      working: 0
    }

    attendance.forEach(record => {
      const status = getStatus(record)
      if (status === 'Present') {
        counts.present++
        if (isLate(record.stepIn, record.shift)) {
          counts.late++
        }
      } else if (status === 'Absent') {
        counts.absent++
      } else if (status === 'Working') {
        counts.working++
      }
    })

    return counts
  }

  const counts = calculateCounts()

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

  const exportToPDF = async () => {
    try {
      if (!attendance || attendance.length === 0) {
        showAlert('No data available to export', 'Export Error', 'warning')
        return
      }

      const doc = new jsPDF('landscape')
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
      doc.text('ATTENDANCE REPORT', pageWidth / 2, headerY + 25, { align: 'center' })
      
      // Period
      doc.setFontSize(11)
      doc.setFont(undefined, 'normal')
      const dateRange = startDate && endDate 
        ? `Period: ${startDate.split('-').reverse().join('-')} to ${endDate.split('-').reverse().join('-')}`
        : 'All Records'
      doc.text(dateRange, pageWidth / 2, headerY + 32, { align: 'center' })

      // Filter info
      let filterInfo = []
      if (selectedEmployee) {
        const emp = employees.find(e => e._id === selectedEmployee)
        if (emp) filterInfo.push(`Employee: ${emp.name}`)
      }
      if (selectedManager) {
        const mgr = managers.find(m => m._id === selectedManager)
        if (mgr) filterInfo.push(`Manager: ${mgr.name}`)
      }
      if (shiftFilter) {
        const shiftLabel = shiftFilter === 'morning' ? 'Morning (7 AM - 3 PM)' 
          : shiftFilter === 'evening' ? 'Evening (3 PM - 11 PM)' 
          : 'Night (11 PM - 7 AM)'
        filterInfo.push(`Shift: ${shiftLabel}`)
      }
      if (statusFilter !== 'All') {
        filterInfo.push(`Status: ${statusFilter}`)
      }
      
      if (filterInfo.length > 0) {
        doc.setFontSize(9)
        doc.text(filterInfo.join(' | '), pageWidth / 2, headerY + 38, { align: 'center' })
      }
      
      // Add a line separator
      doc.setDrawColor(139, 92, 246)
      doc.setLineWidth(0.5)
      doc.line(15, headerY + 43, pageWidth - 15, headerY + 43)

      // Prepare table data
      const tableData = attendance.map(record => {
        const employeeName = record.employeeId?.name || 'Unknown'
        const managerName = record.managerId?.name || 'N/A'
        const shift = record.shift ? record.shift.charAt(0).toUpperCase() + record.shift.slice(1) : 'N/A'
        const stepIn = record.stepIn ? formatDateTime(record.stepIn) : 'Not stepped in'
        const stepOut = record.stepOut ? formatDateTime(record.stepOut) : 'Not stepped out'
        const duration = calculateDuration(record.stepIn, record.stepOut)
        const location = record.stepInAddress || record.address || 'N/A'
        const status = getStatus(record)

        return [
          employeeName,
          managerName,
          shift,
          stepIn,
          stepOut,
          duration,
          location.length > 30 ? location.substring(0, 30) + '...' : location,
          status
        ]
      })

      // Table headers
      const headers = [
        'Employee',
        'Manager',
        'Shift',
        'Step In',
        'Step Out',
        'Duration',
        'Location',
        'Status'
      ]

      // Try using autoTable as a function first
      if (typeof autoTable === 'function') {
        autoTable(doc, {
          head: [headers],
          body: tableData,
          startY: headerY + 48,
          styles: { 
            fontSize: 7,
            cellPadding: 1.5,
            overflow: 'linebreak'
          },
          headStyles: { 
            fillColor: [139, 92, 246], 
            textColor: 255, 
            fontStyle: 'bold',
            fontSize: 8
          },
          columnStyles: {
            0: { cellWidth: 30 }, // Employee
            1: { cellWidth: 25 }, // Manager
            2: { cellWidth: 15 }, // Shift
            3: { cellWidth: 35 }, // Step In
            4: { cellWidth: 35 }, // Step Out
            5: { cellWidth: 20 }, // Duration
            6: { cellWidth: 40 }, // Location
            7: { cellWidth: 20 }  // Status
          },
          margin: { top: headerY + 48, left: 10, right: 10 }
        })
      } else if (typeof doc.autoTable === 'function') {
        doc.autoTable({
          head: [headers],
          body: tableData,
          startY: headerY + 48,
          styles: { 
            fontSize: 7,
            cellPadding: 1.5,
            overflow: 'linebreak'
          },
          headStyles: { 
            fillColor: [139, 92, 246], 
            textColor: 255, 
            fontStyle: 'bold',
            fontSize: 8
          },
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 25 },
            2: { cellWidth: 15 },
            3: { cellWidth: 35 },
            4: { cellWidth: 35 },
            5: { cellWidth: 20 },
            6: { cellWidth: 40 },
            7: { cellWidth: 20 }
          },
          margin: { top: headerY + 48, left: 10, right: 10 }
        })
      } else {
        showAlert('PDF export library not loaded. Please refresh the page and try again.', 'Export Error', 'error')
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

      const fileName = `ND_Enterprise_${site?.name || 'Site'}_AttendanceReport_${startDate || 'all'}_${endDate || 'all'}.pdf`
      downloadPDF(doc, fileName)
      showAlert('PDF exported successfully', 'Export Success', 'success')
    } catch (error) {
      console.error('Error exporting PDF:', error)
      showAlert(`Failed to export PDF: ${error.message}`, 'Export Error', 'error')
    }
  }

  const exportToExcel = () => {
    try {
      if (!attendance || attendance.length === 0) {
        showAlert('No data available to export', 'Export Error', 'warning')
        return
      }

      // Prepare worksheet data
      const wsData = []

      // Header row
      wsData.push([
        'Employee',
        'Manager',
        'Shift',
        'Step In',
        'Step Out',
        'Duration',
        'Location',
        'Status'
      ])

      // Data rows
      attendance.forEach(record => {
        const employeeName = record.employeeId?.name || 'Unknown'
        const managerName = record.managerId?.name || 'N/A'
        const shift = record.shift ? record.shift.charAt(0).toUpperCase() + record.shift.slice(1) : 'N/A'
        const stepIn = record.stepIn ? formatDateTime(record.stepIn) : 'Not stepped in'
        const stepOut = record.stepOut ? formatDateTime(record.stepOut) : 'Not stepped out'
        const duration = calculateDuration(record.stepIn, record.stepOut)
        const location = record.stepInAddress || record.address || 'N/A'
        const status = getStatus(record)

        wsData.push([
          employeeName,
          managerName,
          shift,
          stepIn,
          stepOut,
          duration,
          location,
          status
        ])
      })

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(wsData)

      // Set column widths
      ws['!cols'] = [
        { wch: 25 }, // Employee
        { wch: 20 }, // Manager
        { wch: 12 }, // Shift
        { wch: 20 }, // Step In
        { wch: 20 }, // Step Out
        { wch: 15 }, // Duration
        { wch: 40 }, // Location
        { wch: 15 }  // Status
      ]

      // Add metadata sheet
      const metadata = []
      metadata.push([`${site?.name || 'Site'} - Attendance Report Export`])
      metadata.push([''])
      metadata.push(['Generated on:', new Date().toLocaleString()])
      metadata.push([''])
      if (startDate && endDate) {
        metadata.push(['Period:', `${startDate} to ${endDate}`])
      }
      if (selectedEmployee) {
        const emp = employees.find(e => e._id === selectedEmployee)
        if (emp) metadata.push(['Employee:', emp.name])
      }
      if (selectedManager) {
        const mgr = managers.find(m => m._id === selectedManager)
        if (mgr) metadata.push(['Manager:', mgr.name])
      }
      if (shiftFilter) {
        metadata.push(['Shift:', shiftFilter])
      }
      if (statusFilter !== 'All') {
        metadata.push(['Status:', statusFilter])
      }
      metadata.push([''])
      metadata.push(['Total Records:', attendance.length])
      metadata.push(['Present:', counts.present])
      metadata.push(['Absent:', counts.absent])
      metadata.push(['Late:', counts.late])
      metadata.push(['Working:', counts.working])

      const metadataWs = XLSX.utils.aoa_to_sheet(metadata)
      XLSX.utils.book_append_sheet(wb, metadataWs, 'Report Info')
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance Data')

      const fileName = `${site?.name || 'Site'}_AttendanceReport_${startDate || 'all'}_${endDate || 'all'}.xlsx`
      downloadExcel(wb, fileName)
      showAlert('Excel file exported successfully', 'Export Success', 'success')
    } catch (error) {
      console.error('Error exporting Excel:', error)
      showAlert(`Failed to export Excel: ${error.message}`, 'Export Error', 'error')
    }
  }

  const getImageUrl = (image) => {
    return getStaticUrl(image)
  }

  const formatDateForInput = (dateString) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    } catch (e) {
      return ''
    }
  }

  const formatTimeForInput = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const parseDateInput = (dateStr) => {
    if (!dateStr || dateStr.trim() === '') return null
    // Handle DD/MM/YYYY format
    const parts = dateStr.split('/')
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0')
      const month = parts[1].padStart(2, '0')
      const year = parts[2]
      return `${year}-${month}-${day}`
    }
    // Try to parse as-is if not in DD/MM/YYYY format
    return dateStr
  }

  const handleEdit = (record) => {
    setEditingRecord(record)
    const stepInDate = record.stepIn ? new Date(record.stepIn) : null
    const stepOutDate = record.stepOut ? new Date(record.stepOut) : null
    
    setEditFormData({
      shift: record.shift || 'morning',
      startDate: stepInDate ? formatDateForInput(record.stepIn) : '',
      clockIn: stepInDate ? formatTimeForInput(record.stepIn) : '',
      endDate: stepOutDate ? formatDateForInput(record.stepOut) : '',
      clockOut: stepOutDate ? formatTimeForInput(record.stepOut) : '',
      location: record.stepInAddress || record.address || ''
    })
  }

  const handleCloseEdit = () => {
    setEditingRecord(null)
    setEditFormData({
      shift: '',
      startDate: '',
      clockIn: '',
      endDate: '',
      clockOut: '',
      location: ''
    })
  }

  const handleSaveEdit = async () => {
    if (!editingRecord) return

    try {
      const updateData = {}
      
      // Update shift
      if (editFormData.shift) {
        updateData.shift = editFormData.shift
      }

      // Combine start date and clock in time
      if (editFormData.startDate && editFormData.clockIn) {
        const dateStr = parseDateInput(editFormData.startDate)
        const [hours, minutes] = editFormData.clockIn.split(':')
        updateData.stepIn = new Date(`${dateStr}T${hours}:${minutes}:00`).toISOString()
      } else if (editFormData.startDate) {
        const dateStr = parseDateInput(editFormData.startDate)
        updateData.stepIn = new Date(`${dateStr}T00:00:00`).toISOString()
      }

      // Combine end date and clock out time
      if (editFormData.endDate && editFormData.clockOut) {
        const dateStr = parseDateInput(editFormData.endDate)
        const [hours, minutes] = editFormData.clockOut.split(':')
        updateData.stepOut = new Date(`${dateStr}T${hours}:${minutes}:00`).toISOString()
      } else if (editFormData.endDate) {
        const dateStr = parseDateInput(editFormData.endDate)
        updateData.stepOut = new Date(`${dateStr}T00:00:00`).toISOString()
      } else {
        updateData.stepOut = null
      }

      // Update location/address
      if (editFormData.location) {
        updateData.stepInAddress = editFormData.location
        updateData.address = editFormData.location
      }

      await attendanceAPI.update(editingRecord._id, updateData)
      await fetchAttendance()
      handleCloseEdit()
      showAlert('Attendance record updated successfully', 'Success', 'success')
    } catch (error) {
      console.error('Error updating attendance:', error)
      showAlert(error.message || 'Failed to update attendance record', 'Error', 'error')
    }
  }

  const handleDelete = async (record) => {
    showConfirm(
      `Are you sure you want to delete this attendance record for ${record.employeeId?.name || 'employee'}?`,
      async () => {
        try {
          await attendanceAPI.delete(record._id)
          await fetchAttendance()
          showAlert('Attendance record deleted successfully', 'Success', 'success')
        } catch (error) {
          console.error('Error deleting attendance:', error)
          showAlert(error.message || 'Failed to delete attendance record', 'Error', 'error')
        }
      },
      {
        title: 'Delete Attendance Record',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger'
      }
    )
  }

  const handleSelectRecord = (recordId) => {
    setSelectedRecords(prev => {
      const newSet = new Set(prev)
      if (newSet.has(recordId)) {
        newSet.delete(recordId)
      } else {
        newSet.add(recordId)
      }
      return newSet
    })
  }

  const handleSelectAll = (checked) => {
    if (checked) {
      const allIds = new Set(attendance.map(record => record._id))
      setSelectedRecords(allIds)
    } else {
      setSelectedRecords(new Set())
    }
  }

  const handleBulkDelete = async () => {
    if (selectedRecords.size === 0) {
      showAlert('Please select at least one record to delete', 'No Selection', 'warning')
      return
    }

    const count = selectedRecords.size
    showConfirm(
      `Are you sure you want to delete ${count} attendance record(s)? This action cannot be undone.`,
      async () => {
        try {
          setIsDeleting(true)
          const deletePromises = Array.from(selectedRecords).map(id => attendanceAPI.delete(id))
          await Promise.all(deletePromises)
          setSelectedRecords(new Set())
          await fetchAttendance()
          showAlert(`${count} attendance record(s) deleted successfully`, 'Success', 'success')
        } catch (error) {
          console.error('Error deleting attendance records:', error)
          showAlert(error.message || 'Failed to delete attendance records', 'Error', 'error')
        } finally {
          setIsDeleting(false)
        }
      },
      {
        title: 'Delete Multiple Records',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger'
      }
    )
  }

  const isAllSelected = attendance.length > 0 && attendance.every(record => selectedRecords.has(record._id))
  const isSomeSelected = attendance.some(record => selectedRecords.has(record._id))

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
            <h1>{site?.name || 'Site'} - Attendance</h1>
            <p className="page-subtitle">View all attendance records for this site</p>
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Summary Cards - Always show counts */}
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#eff6ff', color: '#1e40af' }}>
              <FaCalendarAlt />
            </div>
            <div className="stat-info">
              <h3>Total Records</h3>
              <p className="stat-value">{counts.total}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
              <FaCheckCircle />
            </div>
            <div className="stat-info">
              <h3>Present</h3>
              <p className="stat-value">{counts.present}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>
              <FaTimes />
            </div>
            <div className="stat-info">
              <h3>Absent</h3>
              <p className="stat-value">{counts.absent}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fffbeb', color: '#f59e0b' }}>
              <FaClock />
            </div>
            <div className="stat-info">
              <h3>Late</h3>
              <p className="stat-value">{counts.late}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
              <FaClock />
            </div>
            <div className="stat-info">
              <h3>Working</h3>
              <p className="stat-value">{counts.working}</p>
            </div>
          </div>
        </div>

        {/* Export Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
          <button 
            className="btn-icon" 
            onClick={exportToExcel} 
            disabled={loading || attendance.length === 0}
            title="Export to Excel"
          >
            <FaFileExcel />
            <span>Excel</span>
          </button>
          <button 
            className="btn-icon" 
            onClick={exportToPDF} 
            disabled={loading || attendance.length === 0}
            title="Export to PDF"
          >
            <FaFilePdf />
            <span>PDF</span>
          </button>
        </div>

        {/* Filters */}
        <div className="filters-container">
          <div className="filter-group">
            <label>Date Range</label>
            <input 
              type="date" 
              className="form-input" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span>to</span>
            <input 
              type="date" 
              className="form-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
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
            <label>Manager</label>
            <select 
              className="form-input"
              value={selectedManager}
              onChange={(e) => setSelectedManager(e.target.value)}
            >
              <option value="">All Managers</option>
              {managers.map(mgr => (
                <option key={mgr._id} value={mgr._id}>
                  {mgr.name}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Shift</label>
            <select
              className="form-input"
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
            >
              <option value="">All Shifts</option>
              <option value="morning">Morning (7 AM - 3 PM)</option>
              <option value="evening">Evening (3 PM - 11 PM)</option>
              <option value="night">Night (11 PM - 7 AM)</option>
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
              <option>Working</option>
            </select>
          </div>
        </div>

        {/* Attendance Table */}
        <div className="content-section">
          <div className="section-header">
            <h2>Attendance Records ({attendance.length})</h2>
          </div>

          {attendance.length === 0 ? (
            <div className="empty-state">
              <p>No attendance records found for this site.</p>
            </div>
          ) : (
            <div className="table-container">
              {selectedRecords.size > 0 && (
                <div style={{ 
                  marginBottom: '16px', 
                  padding: '12px', 
                  background: '#eff6ff', 
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ fontWeight: '500', color: '#1e40af' }}>
                    {selectedRecords.size} record(s) selected
                  </span>
                  {!isReadonlyAdminWithSite && (
                    <button
                      className="btn-secondary"
                      onClick={handleBulkDelete}
                      disabled={isDeleting}
                      style={{ 
                        background: '#dc2626', 
                        color: 'white',
                        border: 'none'
                      }}
                    >
                      <FaTrash style={{ marginRight: '8px' }} />
                      {isDeleting ? 'Deleting...' : `Delete Selected (${selectedRecords.size})`}
                    </button>
                  )}
                </div>
              )}
              <table className="data-table">
                <thead>
                  <tr>
                    {!isReadonlyAdminWithSite && (
                      <th style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          ref={(input) => {
                            if (input) input.indeterminate = isSomeSelected && !isAllSelected
                          }}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                    )}
                    <th>Employee</th>
                    <th>Manager</th>
                    <th>Shift</th>
                    <th>Step In</th>
                    <th>Step Out</th>
                    <th>Duration</th>
                    <th>Location</th>
                    <th>Status</th>
                    {!isReadonlyAdminWithSite && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((record) => (
                    <tr key={record._id} style={{ background: !isReadonlyAdminWithSite && selectedRecords.has(record._id) ? '#eff6ff' : 'transparent' }}>
                      {!isReadonlyAdminWithSite && (
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedRecords.has(record._id)}
                            onChange={() => handleSelectRecord(record._id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                      )}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {getImageUrl(record.employeeId?.image) && (
                            <img 
                              src={getImageUrl(record.employeeId?.image)} 
                              alt={record.employeeId?.name}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                objectFit: 'cover'
                              }}
                            />
                          )}
                          <span>{record.employeeId?.name || 'N/A'}</span>
                        </div>
                      </td>
                      <td>{record.managerId?.name || 'N/A'}</td>
                      <td>
                        <span className={`status-badge ${record.shift === 'morning' ? 'status-active' : record.shift === 'evening' ? 'status-on-leave' : 'status-inactive'}`}>
                          {record.shift?.charAt(0).toUpperCase() + record.shift?.slice(1) || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px' }}>
                          <div><FaClock style={{ marginRight: '4px' }} />{formatDate(record.stepIn)}</div>
                          {record.stepInAddress && (
                            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                              <FaMapMarkerAlt style={{ marginRight: '4px' }} />
                              {record.stepInAddress}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {record.stepOut ? (
                          <div style={{ fontSize: '13px' }}>
                            <div><FaClock style={{ marginRight: '4px' }} />{formatDate(record.stepOut)}</div>
                            {record.stepOutAddress && (
                              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                                <FaMapMarkerAlt style={{ marginRight: '4px' }} />
                                {record.stepOutAddress}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Not stepped out</span>
                        )}
                      </td>
                      <td>{calculateDuration(record.stepIn, record.stepOut)}</td>
                      <td>
                        {record.stepInAddress ? (
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            <FaMapMarkerAlt style={{ marginRight: '4px' }} />
                            {record.stepInAddress.substring(0, 30)}...
                          </div>
                        ) : 'N/A'}
                      </td>
                      <td>
                        <span className={`status-badge ${record.stepOut ? 'status-active' : 'status-on-leave'}`}>
                          {record.stepOut ? 'Completed' : 'In Progress'}
                        </span>
                      </td>
                      <td>
                        {!isReadonlyAdminWithSite && (
                          <div className="action-buttons">
                            <button 
                              className="action-btn action-edit" 
                              title="Edit"
                              onClick={() => handleEdit(record)}
                            >
                              <FaEdit />
                            </button>
                            <button 
                              className="action-btn action-delete" 
                              title="Delete"
                              onClick={() => handleDelete(record)}
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
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingRecord && (
        <div className="modal-overlay" onClick={handleCloseEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-section">
                <h2 className="modal-title">Edit Attendance Record</h2>
                <p className="modal-subtitle">
                  Update the attendance record for {editingRecord.employeeId?.name || 'employee'} on {editingRecord.stepIn ? formatDateForInput(editingRecord.stepIn) : 'N/A'}.
                </p>
              </div>
              <button className="modal-close-btn" onClick={handleCloseEdit} aria-label="Close">
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Shift</label>
                <select
                  className="form-input"
                  value={editFormData.shift}
                  onChange={(e) => setEditFormData({ ...editFormData, shift: e.target.value })}
                >
                  <option value="morning">7 AM - 3 PM (Morning)</option>
                  <option value="evening">3 PM - 11 PM (Evening)</option>
                  <option value="night">11 PM - 7 AM (Night)</option>
                </select>
              </div>
              
              <div className="form-row-group">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <div className="input-with-icon">
                    <FaCalendarAlt className="input-icon-left" />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="dd/mm/yyyy"
                      value={editFormData.startDate}
                      onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                      pattern="\d{2}/\d{2}/\d{4}"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Clock In</label>
                  <div className="input-with-icon">
                    <FaClock className="input-icon-left" />
                    <input
                      type="time"
                      className="form-input"
                      placeholder="--:--"
                      value={editFormData.clockIn}
                      onChange={(e) => setEditFormData({ ...editFormData, clockIn: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="form-row-group">
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <div className="input-with-icon">
                    <FaCalendarAlt className="input-icon-left" />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="dd/mm/yyyy"
                      value={editFormData.endDate}
                      onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                      pattern="\d{2}/\d{2}/\d{4}"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Clock Out</label>
                  <div className="input-with-icon">
                    <FaClock className="input-icon-left" />
                    <input
                      type="time"
                      className="form-input"
                      placeholder="--:--"
                      value={editFormData.clockOut}
                      onChange={(e) => setEditFormData({ ...editFormData, clockOut: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Location</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter location"
                  value={editFormData.location}
                  onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={handleCloseEdit}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveEdit}>
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertState.isOpen}
        onClose={hideAlert}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={hideConfirm}
        onConfirm={confirmState.onConfirm || (() => {})}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        type={confirmState.type}
      />
    </div>
  )
}

export default SiteAttendance

