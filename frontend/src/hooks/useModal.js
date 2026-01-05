import { useState, useCallback } from 'react'

export const useAlert = () => {
  const [alertState, setAlertState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  })

  const showAlert = useCallback((message, title = '', type = 'info') => {
    setAlertState({
      isOpen: true,
      title,
      message,
      type
    })
  }, [])

  const hideAlert = useCallback(() => {
    setAlertState(prev => ({ ...prev, isOpen: false }))
  }, [])

  return {
    alertState,
    showAlert,
    hideAlert
  }
}

export const useConfirm = () => {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'warning',
    onConfirm: null
  })

  const showConfirm = useCallback((message, onConfirm, options = {}) => {
    setConfirmState({
      isOpen: true,
      title: options.title || '',
      message,
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      type: options.type || 'warning',
      onConfirm
    })
  }, [])

  const hideConfirm = useCallback(() => {
    setConfirmState(prev => ({ ...prev, isOpen: false, onConfirm: null }))
  }, [])

  return {
    confirmState,
    showConfirm,
    hideConfirm
  }
}

