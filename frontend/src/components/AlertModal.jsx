import React from 'react'
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimesCircle } from 'react-icons/fa'
import './AlertModal.css'

const AlertModal = ({ isOpen, onClose, title, message, type = 'info' }) => {
  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FaCheckCircle className="alert-icon alert-icon-success" />
      case 'error':
        return <FaTimesCircle className="alert-icon alert-icon-error" />
      case 'warning':
        return <FaExclamationCircle className="alert-icon alert-icon-warning" />
      default:
        return <FaInfoCircle className="alert-icon alert-icon-info" />
    }
  }

  return (
    <div className="alert-modal-overlay" onClick={onClose}>
      <div className="alert-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="alert-modal-body">
          {getIcon()}
          <div className="alert-modal-text">
            {title && <h3 className="alert-modal-title">{title}</h3>}
            <p className="alert-modal-message">{message}</p>
          </div>
        </div>
        <div className="alert-modal-footer">
          <button className="btn-primary alert-modal-btn" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

export default AlertModal

