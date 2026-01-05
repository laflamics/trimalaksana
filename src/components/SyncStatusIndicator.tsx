/**
 * Sync Status Indicator Component
 * Menampilkan status sync di background tanpa mengganggu user
 */

import React, { useState, useEffect } from 'react';
import { packagingSync } from '../services/packaging-sync';

interface SyncStatusIndicatorProps {
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  showDetails?: boolean;
  style?: React.CSSProperties;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  position = 'top-right',
  showDetails = false,
  style
}) => {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  
  useEffect(() => {
    // Listen to sync status changes
    const unsubscribe = packagingSync.onSyncStatusChange((status) => {
      setSyncStatus(status);
    });
    
    // Update queue status periodically
    const updateQueue = () => {
      const queue = packagingSync.getQueueStatus();
      setQueueStatus(queue);
    };
    
    updateQueue();
    const interval = setInterval(updateQueue, 1000);
    
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);
  
  const getPositionStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'fixed',
      zIndex: 9999,
      padding: '8px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      backdropFilter: 'blur(10px)',
      ...style
    };
    
    switch (position) {
      case 'top-right':
        return { ...baseStyle, top: '20px', right: '20px' };
      case 'bottom-right':
        return { ...baseStyle, bottom: '20px', right: '20px' };
      case 'top-left':
        return { ...baseStyle, top: '20px', left: '20px' };
      case 'bottom-left':
        return { ...baseStyle, bottom: '20px', left: '20px' };
      default:
        return { ...baseStyle, top: '20px', right: '20px' };
    }
  };
  
  const getStatusConfig = () => {
    switch (syncStatus) {
      case 'syncing':
        return {
          icon: '🔄',
          text: 'Syncing...',
          color: '#FF9800',
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
          borderColor: '#FF9800'
        };
      case 'synced':
        return {
          icon: '✓',
          text: 'Synced',
          color: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          borderColor: '#4CAF50'
        };
      case 'error':
        return {
          icon: '⚠️',
          text: 'Sync Error',
          color: '#f44336',
          backgroundColor: 'rgba(244, 67, 54, 0.1)',
          borderColor: '#f44336'
        };
      default:
        return {
          icon: '⚪',
          text: 'Idle',
          color: '#9E9E9E',
          backgroundColor: 'rgba(158, 158, 158, 0.1)',
          borderColor: '#9E9E9E'
        };
    }
  };
  
  const statusConfig = getStatusConfig();
  
  const getTooltipContent = () => {
    if (!queueStatus) return 'No sync data available';
    
    return (
      <div>
        <div><strong>Status:</strong> {syncStatus}</div>
        <div><strong>Pending:</strong> {queueStatus.pending || 0} operations</div>
        <div><strong>Unsynced:</strong> {queueStatus.unsynced || 0} items</div>
        {syncStatus === 'error' && (
          <div style={{ color: '#f44336', marginTop: '4px' }}>
            Click to retry sync
          </div>
        )}
      </div>
    );
  };
  
  const handleClick = async () => {
    if (syncStatus === 'error') {
      // Retry sync on error
      try {
        await packagingSync.forceSyncAll();
      } catch (error) {
        console.error('Manual sync retry failed:', error);
      }
    }
  };
  
  // Don't show indicator if idle and no pending operations
  if (syncStatus === 'idle' && (!queueStatus || (queueStatus.pending === 0 && queueStatus.unsynced === 0))) {
    return null;
  }
  
  return (
    <>
      <div
        style={{
          ...getPositionStyle(),
          color: statusConfig.color,
          backgroundColor: statusConfig.backgroundColor,
          border: `1px solid ${statusConfig.borderColor}`
        }}
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span 
          style={{ 
            animation: syncStatus === 'syncing' ? 'spin 1s linear infinite' : 'none' 
          }}
        >
          {statusConfig.icon}
        </span>
        
        {showDetails && (
          <span>{statusConfig.text}</span>
        )}
        
        {queueStatus && queueStatus.pending > 0 && (
          <span style={{
            backgroundColor: statusConfig.color,
            color: 'white',
            borderRadius: '10px',
            padding: '2px 6px',
            fontSize: '10px',
            minWidth: '16px',
            textAlign: 'center'
          }}>
            {queueStatus.pending}
          </span>
        )}
      </div>
      
      {/* Tooltip */}
      {showTooltip && (
        <div
          style={{
            position: 'fixed',
            ...(() => {
              const baseTooltip = {
                zIndex: 10000,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                maxWidth: '200px',
                backdropFilter: 'blur(10px)'
              };
              
              switch (position) {
                case 'top-right':
                  return { ...baseTooltip, top: '60px', right: '20px' };
                case 'bottom-right':
                  return { ...baseTooltip, bottom: '60px', right: '20px' };
                case 'top-left':
                  return { ...baseTooltip, top: '60px', left: '20px' };
                case 'bottom-left':
                  return { ...baseTooltip, bottom: '60px', left: '20px' };
                default:
                  return { ...baseTooltip, top: '60px', right: '20px' };
              }
            })()
          }}
        >
          {getTooltipContent()}
        </div>
      )}
      
      {/* CSS for spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default SyncStatusIndicator;