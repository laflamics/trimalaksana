/**
 * Optimistic Button Component
 * Tombol yang memberikan feedback instant tanpa loading state
 * Background sync berjalan tanpa user menunggu
 */

import React, { useState, useEffect } from 'react';
import Button from './Button';
import { optimisticOps } from '../services/optimistic-operations';
import { packagingSync } from '../services/packaging-sync';

interface OptimisticButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  onClick: () => Promise<any>;
  children: React.ReactNode;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
  showSyncStatus?: boolean; // Show sync indicator
  successMessage?: string; // Custom success message
  errorMessage?: string; // Custom error message
}

const OptimisticButton: React.FC<OptimisticButtonProps> = ({
  variant = 'primary',
  onClick,
  children,
  disabled = false,
  style,
  className,
  showSyncStatus = true,
  successMessage = 'Success',
  errorMessage = 'Error'
}) => {
  const [state, setState] = useState<'idle' | 'success' | 'error'>('idle');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  
  // Listen to sync status changes
  useEffect(() => {
    const unsubscribe = packagingSync.onSyncStatusChange((status) => {
      setSyncStatus(status);
    });
    
    return unsubscribe;
  }, []);
  
  const handleClick = async () => {
    if (disabled) return;
    
    try {
      // Execute optimistic operation
      await onClick();
      
      // Show instant success feedback
      setState('success');
      setMessage(successMessage);
      
      // Reset state after 2 seconds
      setTimeout(() => {
        setState('idle');
        setMessage('');
      }, 2000);
      
    } catch (error) {
      // Show error state
      setState('error');
      setMessage(error instanceof Error ? error.message : errorMessage);
      
      // Reset state after 3 seconds
      setTimeout(() => {
        setState('idle');
        setMessage('');
      }, 3000);
    }
  };
  
  const getButtonStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'relative',
      transition: 'all 0.2s ease',
      ...style
    };
    
    if (state === 'success') {
      return {
        ...baseStyle,
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
        color: 'white'
      };
    }
    
    if (state === 'error') {
      return {
        ...baseStyle,
        backgroundColor: '#f44336',
        borderColor: '#f44336',
        color: 'white'
      };
    }
    
    return baseStyle;
  };
  
  const getSyncIndicator = () => {
    if (!showSyncStatus) return null;
    
    const indicatorStyle: React.CSSProperties = {
      position: 'absolute',
      top: '-2px',
      right: '-2px',
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      fontSize: '6px'
    };
    
    switch (syncStatus) {
      case 'syncing':
        return (
          <div 
            style={{
              ...indicatorStyle,
              backgroundColor: '#FF9800',
              animation: 'pulse 1s infinite'
            }}
            title="Syncing to server..."
          />
        );
      case 'synced':
        return (
          <div 
            style={{
              ...indicatorStyle,
              backgroundColor: '#4CAF50'
            }}
            title="Synced"
          />
        );
      case 'error':
        return (
          <div 
            style={{
              ...indicatorStyle,
              backgroundColor: '#f44336'
            }}
            title="Sync error - will retry"
          />
        );
      default:
        return null;
    }
  };
  
  const getButtonContent = () => {
    if (state === 'success') {
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          ✓ {message}
        </span>
      );
    }
    
    if (state === 'error') {
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          ✗ {message}
        </span>
      );
    }
    
    return children;
  };
  
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <Button
        variant={variant}
        onClick={handleClick}
        disabled={disabled}
        style={getButtonStyle()}
        className={className}
      >
        {getButtonContent()}
      </Button>
      {getSyncIndicator()}
      
      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default OptimisticButton;