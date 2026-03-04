/**
 * Import JSON Dialog
 * 
 * Dialog untuk import JSON data ke storage
 * Support: materials, suppliers, user access control
 */

import React, { useState, useRef } from 'react';
import Button from './Button';
import '../styles/common.css';

interface ImportJsonDialogProps {
  show: boolean;
  onClose: () => void;
  onImport: (data: any, storageKey: string) => Promise<void>;
}

const ImportJsonDialog: React.FC<ImportJsonDialogProps> = ({ show, onClose, onImport }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedKey, setSelectedKey] = useState('materials');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importOptions = [
    { key: 'materials', label: 'Materials' },
    { key: 'suppliers', label: 'Suppliers' },
    { key: 'userAccessControl', label: 'User Access Control' },
    { key: 'products', label: 'Packaging - Products' },
    { key: 'salesOrders', label: 'Packaging - Sales Orders (SO)' },
    { key: 'delivery', label: 'Packaging - Delivery Notes (DN)' },
    { key: 'invoices', label: 'Packaging - Invoices' },
    { key: 'journalEntries', label: 'Packaging - Accounting' },
    { key: 'payments', label: 'Packaging - Payments' },
    // General Trading imports
    { key: 'gt_products', label: 'GT - Products' },
    { key: 'gt_salesOrders', label: 'GT - Sales Orders (SO)' },
    { key: 'gt_delivery', label: 'GT - Delivery Notes (DN)' },
    { key: 'gt_invoices', label: 'GT - Invoices' },
    { key: 'gt_customers', label: 'GT - Customers' },
    { key: 'gt_suppliers', label: 'GT - Suppliers' },
    { key: 'gt_journalEntries', label: 'GT - Accounting' },
    { key: 'gt_payments', label: 'GT - Payments' },
    // Trucking imports
    { key: 'trucking_products', label: 'Trucking - Products' },
    { key: 'trucking_salesOrders', label: 'Trucking - Sales Orders (SO)' },
    { key: 'trucking_suratJalan', label: 'Trucking - Surat Jalan (SJ)' },
    { key: 'trucking_invoices', label: 'Trucking - Invoices' },
    { key: 'trucking_journalEntries', label: 'Trucking - Accounting' },
    { key: 'trucking_payments', label: 'Trucking - Payments' },
  ];

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage('');

    try {
      const fileContent = await file.text();
      const data = JSON.parse(fileContent);

      // Extract value array if wrapped
      const importData = data.value || data;

      if (!Array.isArray(importData)) {
        setMessage('❌ JSON must contain an array or have a "value" property with an array');
        return;
      }

      console.log(`📥 Importing ${importData.length} items to ${selectedKey}`);
      await onImport(importData, selectedKey);

      setMessage(`✅ Successfully imported ${importData.length} items to ${selectedKey}`);
      setTimeout(() => {
        onClose();
        setMessage('');
      }, 2000);
    } catch (error: any) {
      console.error('Import error:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>
          📥 Import JSON Data
        </h2>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600' }}>
            Select Data Type:
          </label>
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            {importOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600' }}>
            Select JSON File:
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          />
        </div>

        {message && (
          <div
            style={{
              marginBottom: '16px',
              padding: '12px',
              borderRadius: '4px',
              backgroundColor: message.includes('✅') ? '#e8f5e9' : '#ffebee',
              color: message.includes('✅') ? '#2e7d32' : '#c62828',
              fontSize: '13px',
              wordBreak: 'break-word',
            }}
          >
            {message}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImportJsonDialog;
