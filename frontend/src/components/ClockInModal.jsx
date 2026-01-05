import React, { useState, useEffect, useRef } from 'react'
import { FaTimes, FaCamera, FaMapMarkerAlt, FaRedo, FaUpload } from 'react-icons/fa'
import './ClockInModal.css'

const ClockInModal = ({ isOpen, onClose, employee, onConfirm }) => {
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [location, setLocation] = useState('')
  const [autoDetectedLocation, setAutoDetectedLocation] = useState('')
  const [latitude, setLatitude] = useState(null)
  const [longitude, setLongitude] = useState(null)
  const [shift, setShift] = useState(employee?.shift || 'morning')
  const [note, setNote] = useState('')
  const [capturing, setCapturing] = useState(false)
  const [locationDetecting, setLocationDetecting] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      detectLocation()
      // Reset form when modal opens
      setPhoto(null)
      setPhotoPreview(null)
      setNote('')
      setShift(employee?.shift || 'morning')
    } else {
      // Cleanup camera when modal closes
      stopCamera()
    }
    return () => {
      stopCamera()
    }
  }, [isOpen, employee])

  const detectLocation = async () => {
    setLocationDetecting(true)
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const lat = position.coords.latitude
            const lng = position.coords.longitude
            setLatitude(lat)
            setLongitude(lng)

            // Try reverse geocoding using Nominatim (free, no API key required)
            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`
              )
              const data = await response.json()
              
              if (data && data.address) {
                const address = data.address
                // Build a readable address string
                const parts = []
                if (address.city || address.town || address.village) {
                  parts.push(address.city || address.town || address.village)
                }
                if (address.state) {
                  parts.push(address.state)
                }
                if (address.country) {
                  parts.push(address.country)
                }
                const locationName = parts.length > 0 ? parts.join(', ') : data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
                setAutoDetectedLocation(locationName)
                setLocation(locationName)
              } else {
                // Fallback to coordinates
                const locationName = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
                setAutoDetectedLocation(locationName)
                setLocation(locationName)
              }
            } catch (error) {
              console.error('Reverse geocoding error:', error)
              // Fallback to coordinates
              const locationName = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
              setAutoDetectedLocation(locationName)
              setLocation(locationName)
            }
          },
          (error) => {
            console.error('Geolocation error:', error)
            let errorMsg = 'Location not available'
            if (error.code === 1) {
              errorMsg = 'Permission denied. Please enable location access.'
            } else if (error.code === 2) {
              errorMsg = 'Location unavailable. Please check your connection.'
            } else if (error.code === 3) {
              errorMsg = 'Location timeout. Please try again.'
            }
            setAutoDetectedLocation(errorMsg)
            setLocation('')
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        )
      } else {
        setAutoDetectedLocation('Geolocation not supported by your browser')
      }
    } catch (error) {
      console.error('Location detection error:', error)
      setAutoDetectedLocation('Location not available')
    } finally {
      setLocationDetecting(false)
    }
  }

  const startCamera = async () => {
    try {
      setCapturing(true)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('Unable to access camera. Please check permissions.')
      setCapturing(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCapturing(false)
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0)

      canvas.toBlob((blob) => {
        const file = new File([blob], 'clock-in-photo.jpg', { type: 'image/jpeg' })
        setPhoto(file)
        setPhotoPreview(URL.createObjectURL(blob))
        stopCamera()
      }, 'image/jpeg', 0.9)
    }
  }

  const handleStartOver = () => {
    setPhoto(null)
    setPhotoPreview(null)
    stopCamera()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image size should be less than 10MB')
        return
      }

      setPhoto(file)
      setPhotoPreview(URL.createObjectURL(file))
      stopCamera() // Stop camera if it's running
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleConfirm = () => {
    if (!photo) {
      alert('Please capture a photo first')
      return
    }
    if (!location) {
      alert('Please enter location')
      return
    }

    const clockInData = {
      employeeId: employee._id,
      shift: shift,
      address: location,
      longitude: longitude,
      latitude: latitude,
      note: note
    }

    onConfirm(clockInData, photo)
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content clock-in-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-section">
            <h2 className="modal-title">Clock-In for {employee?.name || 'Employee'}</h2>
            <p className="modal-subtitle">Verify your identity and confirm your location.</p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </div>
        <div className="modal-body">
          {/* Photo Section */}
          <div className="clock-in-photo-section">
            {!photoPreview ? (
              <div className="photo-capture-area">
                {!capturing ? (
                  <div className="photo-options">
                    <div className="photo-placeholder" onClick={startCamera}>
                      <FaCamera className="camera-icon" />
                      <p>Capture Photo</p>
                    </div>
                    <div className="photo-divider">
                      <span>OR</span>
                    </div>
                    <div className="photo-placeholder" onClick={handleUploadClick}>
                      <FaUpload className="camera-icon" />
                      <p>Upload Photo</p>
                    </div>
                  </div>
                ) : (
                  <div className="camera-preview">
                    <video ref={videoRef} autoPlay playsInline className="camera-video" />
                    <button className="capture-btn" onClick={capturePhoto}>
                      <FaCamera />
                      Capture Photo
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="photo-preview-area">
                <img src={photoPreview} alt="Captured photo" className="captured-photo" />
                <button className="retake-btn" onClick={handleStartOver}>
                  <FaRedo /> Retake
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>

          {/* Location Section */}
          <div className="form-group">
            <label className="form-label">Location Name *</label>
            {autoDetectedLocation && (
              <div className="auto-detected-location">
                <span className="check-icon">✔</span>
                Auto-detected: {autoDetectedLocation}
              </div>
            )}
            <input
              type="text"
              className="form-input"
              placeholder="Enter location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
            <button 
              type="button" 
              className="btn-redetect" 
              onClick={detectLocation}
              disabled={locationDetecting}
            >
              <FaMapMarkerAlt /> {locationDetecting ? 'Detecting...' : 'Re-detect Location'}
            </button>
          </div>

          {/* Shift Section */}
          <div className="form-group">
            <label className="form-label">Shift</label>
            <select
              className="form-input"
              value={shift}
              onChange={(e) => setShift(e.target.value)}
            >
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
              <option value="night">Night</option>
            </select>
          </div>

          {/* Note Section */}
          <div className="form-group">
            <label className="form-label">Note</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., clean all area"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Coordinates */}
          {latitude && longitude && (
            <div className="coordinates-info">
              Latitude: {latitude.toFixed(14)} Longitude: {longitude.toFixed(14)}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleStartOver}>
            Start Over
          </button>
          <button className="btn-primary" onClick={handleConfirm}>
            Confirm & Clock In
          </button>
        </div>
      </div>
    </div>
  )
}

export default ClockInModal

