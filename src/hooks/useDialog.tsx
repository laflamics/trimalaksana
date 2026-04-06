import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Button from '../components/Button';
import '../styles/common.css';

export interface DialogState {
  show: boolean;
  type: 'alert' | 'confirm' | 'prompt';
  title: string;
  message: string;
  inputValue?: string;
  inputPlaceholder?: string;
  onConfirm?: (value?: string) => void;
  onCancel?: () => void;
}

export const useDialog = () => {
  const [dialogState, setDialogState] = useState<DialogState>({
    show: false,
    type: 'alert',
    title: '',
    message: '',
  });

  const showAlert = (message: string, title: string = 'Information') => {
    // Set dialog open untuk disable global event listener
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(true);
    }
    setDialogState({
      show: true,
      type: 'alert',
      title,
      message,
    });
  };

  const showConfirm = (message: string, onConfirm: () => void, onCancel?: () => void, title: string = 'Confirmation') => {
    // Set dialog open untuk disable global event listener
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(true);
    }
    setDialogState({
      show: true,
      type: 'confirm',
      title,
      message,
      onConfirm: () => onConfirm(),
      onCancel,
    });
  };

  const showPrompt = (message: string, defaultValue: string = '', onConfirm: (value: string) => void, onCancel?: () => void, title: string = 'Input', placeholder: string = '') => {
    // Set dialog open untuk disable global event listener
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(true);
    }
    setDialogState({
      show: true,
      type: 'prompt',
      title,
      message,
      inputValue: defaultValue,
      inputPlaceholder: placeholder,
      onConfirm: (value?: string) => onConfirm(value || ''),
      onCancel,
    });
  };

  const closeDialog = () => {
    // Restore global event listener saat dialog ditutup
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(false);
    }
    setDialogState({
      show: false,
      type: 'alert',
      title: '',
      message: '',
    });
  };

  // Helper untuk detect icon type dari title
  const getIconType = (title: string) => {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('success') || titleLower.includes('berhasil')) {
      return { type: 'success', icon: '✓' };
    } else if (titleLower.includes('error') || titleLower.includes('gagal') || titleLower.includes('cannot')) {
      return { type: 'error', icon: '✕' };
    } else if (titleLower.includes('warning') || titleLower.includes('peringatan') || titleLower.includes('validation')) {
      return { type: 'warning', icon: '⚠' };
    }
    return { type: 'info', icon: 'ℹ️' };
  };

  // Dialog Component - menggunakan Portal untuk memastikan selalu di top level
  const DialogComponent = () => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
      return () => setMounted(false);
    }, []);

    if (!dialogState.show || !mounted) return null;

    const iconInfo = getIconType(dialogState.title);

    const dialogContent = (
      <div 
        className="dialog-overlay" 
        onClick={dialogState.type === 'alert' ? closeDialog : undefined} 
        style={{ 
          zIndex: 99999,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        <div 
          onClick={(e) => e.stopPropagation()} 
          style={{ 
            maxWidth: '600px', 
            width: '100%',
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden',
            animation: 'slideUp 0.3s ease-out',
          }}
        >
          {/* Header dengan gradient bar */}
          <div 
            style={{
              padding: '24px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            {/* Icon */}
            <div 
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 'bold',
                background: iconInfo.type === 'success' ? 'rgba(76, 175, 80, 0.1)' :
                            iconInfo.type === 'error' ? 'rgba(244, 67, 54, 0.1)' :
                            iconInfo.type === 'warning' ? 'rgba(255, 152, 0, 0.1)' :
                            'rgba(33, 150, 243, 0.1)',
                color: iconInfo.type === 'success' ? '#4caf50' :
                       iconInfo.type === 'error' ? '#f44336' :
                       iconInfo.type === 'warning' ? '#ff9800' :
                       '#2196f3',
              }}
            >
              {iconInfo.icon}
            </div>
            
            {/* Title */}
            <h2 style={{ 
              margin: 0, 
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              flex: 1,
            }}>
              {dialogState.title}
            </h2>

            {/* Close button untuk alert */}
            {dialogState.type === 'alert' && (
              <button
                onClick={closeDialog}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none';
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Content */}
          <div style={{ padding: '24px' }}>
            {/* Message */}
            <p style={{ 
              margin: '0 0 24px 0',
              color: 'var(--text-secondary)',
              fontSize: '14px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
            }}>
              {dialogState.message}
            </p>

            {/* Prompt input */}
            {dialogState.type === 'prompt' && (
              <div style={{ marginBottom: '24px' }}>
                <input
                  type="text"
                  value={dialogState.inputValue || ''}
                  onChange={(e) => setDialogState({ ...dialogState, inputValue: e.target.value })}
                  placeholder={dialogState.inputPlaceholder}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '2px solid var(--border-color)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary-color)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(33, 150, 243, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && dialogState.onConfirm) {
                      dialogState.onConfirm(dialogState.inputValue);
                      closeDialog();
                    } else if (e.key === 'Escape') {
                      if (dialogState.onCancel) dialogState.onCancel();
                      closeDialog();
                    }
                  }}
                />
              </div>
            )}

            {/* Actions */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end',
              flexWrap: 'wrap',
            }}>
              {(dialogState.type === 'confirm' || dialogState.type === 'prompt') && (
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    if (dialogState.onCancel) dialogState.onCancel();
                    closeDialog();
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button 
                variant={iconInfo.type === 'error' ? 'danger' : 'primary'} 
                onClick={async () => {
                  if (dialogState.onConfirm) {
                    try {
                      if (dialogState.type === 'prompt') {
                        await dialogState.onConfirm(dialogState.inputValue);
                      } else {
                        await dialogState.onConfirm();
                      }
                    } catch (error) {
                      console.error('Error in onConfirm callback:', error);
                    }
                  }
                  closeDialog();
                }}
              >
                {dialogState.type === 'alert' ? 'OK' : dialogState.type === 'prompt' ? 'Submit' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );

    // Gunakan Portal untuk render di document.body agar selalu di top level
    return typeof window !== 'undefined' && window.document 
      ? createPortal(dialogContent, document.body)
      : dialogContent;
  };

  return {
    dialogState,
    showAlert,
    showConfirm,
    showPrompt,
    closeDialog,
    DialogComponent,
  };
};

