import React from 'react'
import { FaExclamationTriangle, FaQuestionCircle } from 'react-icons/fa'
import './ConfirmModal.css'

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning' }) => {
  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  const getIcon = () => {
    if (type === 'danger') {
      return <FaExclamationTriangle className="confirm-icon confirm-icon-danger" />
    }
    return <FaQuestionCircle className="confirm-icon confirm-icon-warning" />
  }

  return (
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-body">
          {getIcon()}
          <div className="confirm-modal-text">
            {title && <h3 className="confirm-modal-title">{title}</h3>}
            <p className="confirm-modal-message">{message}</p>
          </div>
        </div>
        <div className="confirm-modal-footer">
          <button className="btn-secondary confirm-modal-btn" onClick={onClose}>
            {cancelText}
          </button>
          <button 
            className={`btn-primary confirm-modal-btn ${type === 'danger' ? 'confirm-btn-danger' : ''}`}
            onClick={handleConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal

