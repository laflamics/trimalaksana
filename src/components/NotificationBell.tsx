import { useState, useEffect, useRef } from 'react';
import Button from './Button';
import '../styles/common.css';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp?: string;
  onClick?: () => void;
  [key: string]: any;
}

interface NotificationBellProps {
  notifications: Notification[];
  onNotificationClick?: (notification: Notification) => void;
  onDeleteNotification?: (notification: Notification) => void;
  icon?: string;
  emptyMessage?: string;
}

const NotificationBell = ({ 
  notifications, 
  onNotificationClick,
  onDeleteNotification,
  icon = '🔔',
  emptyMessage = 'Tidak ada notifikasi'
}: NotificationBellProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [dialogPosition, setDialogPosition] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const dialogRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Update dialog position saat dialog dibuka
  useEffect(() => {
    if (showDialog && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDialogPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [showDialog]);

  // Close dialog saat klik di luar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowDialog(false);
      }
    };

    if (showDialog) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDialog]);

  // Sort notifications: terbaru di atas
  const sortedNotifications = [...notifications].sort((a, b) => {
    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return timeB - timeA; // Terbaru di atas
  });

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleNotificationClick = (notification: Notification) => {
    if (onNotificationClick) {
      onNotificationClick(notification);
    } else if (notification.onClick) {
      notification.onClick();
    }
    setShowDialog(false);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={buttonRef}
        onClick={() => setShowDialog(!showDialog)}
        style={{
          background: 'transparent',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '6px 10px',
          cursor: 'pointer',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '36px',
          height: '36px',
          transition: 'all 0.2s ease',
          color: 'var(--text-primary)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        title="Notifikasi"
      >
        <span style={{ fontSize: '18px' }}>{icon}</span>
        {notifications.length > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              backgroundColor: '#ff4444',
              color: '#fff',
              borderRadius: '10px',
              minWidth: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: '600',
              padding: '0 4px',
              border: '2px solid var(--bg-secondary)',
            }}
          >
            {notifications.length > 99 ? '99+' : notifications.length}
          </span>
        )}
      </button>

      {showDialog && (
        <>
          {/* Overlay backdrop untuk memastikan dialog selalu di layer paling luar */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 99998,
              backgroundColor: 'transparent',
              pointerEvents: 'none',
            }}
          />
          <div
            ref={dialogRef}
            style={{
              position: 'fixed',
              top: `${dialogPosition.top}px`,
              right: `${dialogPosition.right}px`,
              width: '360px',
              maxWidth: '90vw',
              maxHeight: '500px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              zIndex: 99999,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
              Notifikasi ({notifications.length})
            </strong>
            <button
              onClick={() => setShowDialog(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '0',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>

          {/* Notifications List */}
          <div
            style={{
              overflowY: 'auto',
              maxHeight: '400px',
            }}
          >
            {sortedNotifications.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                }}
              >
                {emptyMessage}
              </div>
            ) : (
              sortedNotifications.map((notification, idx) => (
                <div
                  key={notification.id || idx}
                  style={{
                    padding: '12px 16px',
                    borderBottom: idx < sortedNotifications.length - 1 ? '1px solid var(--border-color)' : 'none',
                    transition: 'background-color 0.2s ease',
                    backgroundColor: 'var(--bg-secondary)',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                  }}
                >
                  <div
                    onClick={() => handleNotificationClick(notification)}
                    style={{
                      cursor: 'pointer',
                      paddingRight: onDeleteNotification ? '30px' : '0',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: 'var(--text-primary)',
                        marginBottom: '4px',
                      }}
                    >
                      {notification.title}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        marginBottom: '4px',
                        lineHeight: '1.4',
                      }}
                    >
                      {notification.message}
                    </div>
                    {notification.timestamp && (
                      <div
                        style={{
                          fontSize: '10px',
                          color: 'var(--text-secondary)',
                          opacity: 0.7,
                        }}
                      >
                        {formatTime(notification.timestamp)}
                      </div>
                    )}
                  </div>
                  {onDeleteNotification && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNotification(notification);
                      }}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'transparent',
                        border: 'none',
                        color: '#EF4444',
                        cursor: 'pointer',
                        fontSize: '14px',
                        padding: '4px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title="Hapus notifikasi"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;

