import { useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import '../styles/common.css';

interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary' | 'secondary';
}

export const ConfirmDialog = ({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
}: ConfirmDialogProps) => {
  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <Card
        title={title}
        className="dialog-card"
        onClick={(e) => e.stopPropagation()}
      >
        <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={onConfirm}>
            {confirmText}
          </Button>
        </div>
      </Card>
    </div>
  );
};

