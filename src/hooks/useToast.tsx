import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import '../styles/toast.css';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration: number = 3000) => {
    const id = Date.now().toString();
    const toast: Toast = { id, message, type, duration };
    
    setToasts(prev => [...prev, toast]);
    
    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
    
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const ToastContainer = () => {
    if (toasts.length === 0) return null;

    const toastElements = toasts.map(toast => (
      <div
        key={toast.id}
        className={`toast toast-${toast.type}`}
        onClick={() => removeToast(toast.id)}
      >
        <div className="toast-content">
          <span className="toast-icon">
            {toast.type === 'success' && '✓'}
            {toast.type === 'error' && '✕'}
            {toast.type === 'info' && 'ℹ'}
            {toast.type === 'warning' && '⚠'}
          </span>
          <span className="toast-message">{toast.message}</span>
        </div>
      </div>
    ));

    return typeof window !== 'undefined' && window.document
      ? createPortal(
          <div className="toast-container">
            {toastElements}
          </div>,
          document.body
        )
      : null;
  };

  return {
    showToast,
    removeToast,
    ToastContainer,
  };
};
