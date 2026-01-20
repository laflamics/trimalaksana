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
        }}
      >
        <div 
          className="dialog-card" 
          onClick={(e) => e.stopPropagation()} 
          style={{ 
            maxWidth: '500px', 
            width: '90%',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Modern gradient background effect */}
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: iconInfo.type === 'success' ? 'linear-gradient(90deg, #4caf50, #66bb6a)' :
                          iconInfo.type === 'error' ? 'linear-gradient(90deg, #f44336, #e57373)' :
                          iconInfo.type === 'warning' ? 'linear-gradient(90deg, #ff9800, #ffb74d)' :
                          'linear-gradient(90deg, #2196f3, #64b5f6)',
              zIndex: 1,
            }}
          />
          
          <div style={{ position: 'relative', zIndex: 2 }}>
            {/* Icon dengan modern design */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px', 
              marginBottom: '20px' 
            }}>
              <div 
                className={`dialog-icon ${iconInfo.type}`}
                style={{
                  position: 'relative',
                  boxShadow: iconInfo.type === 'success' ? '0 4px 12px rgba(76, 175, 80, 0.3)' :
                             iconInfo.type === 'error' ? '0 4px 12px rgba(244, 67, 54, 0.3)' :
                             iconInfo.type === 'warning' ? '0 4px 12px rgba(255, 152, 0, 0.3)' :
                             '0 4px 12px rgba(33, 150, 243, 0.3)',
                }}
              >
                {iconInfo.icon}
              </div>
              <h3 className="dialog-title" style={{ margin: 0, flex: 1 }}>
                {dialogState.title}
              </h3>
            </div>
            
            <div className="dialog-message" style={{ marginBottom: dialogState.type === 'prompt' ? '20px' : '24px' }}>
              {dialogState.message}
            </div>

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
                  padding: '10px 14px',
                  border: '2px solid var(--border-color)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--primary-color)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(33, 150, 243, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border-color)';
                  e.target.style.boxShadow = 'none';
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
          
            <div className="dialog-actions" style={{ marginTop: '24px' }}>
              {(dialogState.type === 'confirm' || dialogState.type === 'prompt') && (
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    if (dialogState.onCancel) dialogState.onCancel();
                    closeDialog();
                  }}
                  style={{
                    minWidth: '100px',
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
                  // IMPORTANT: Selalu tutup dialog setelah onConfirm dipanggil (untuk semua tipe dialog)
                  closeDialog();
                }}
                style={{
                  minWidth: '100px',
                  boxShadow: iconInfo.type === 'error' ? '0 4px 12px rgba(244, 67, 54, 0.3)' :
                             '0 4px 12px rgba(33, 150, 243, 0.3)',
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

