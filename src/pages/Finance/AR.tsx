import { useState } from 'react';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import { storageService } from '../../services/storage';
import '../../styles/common.css';

const AR = () => {
  // Custom Dialog state
  const [dialogState, setDialogState] = useState<{
    show: boolean;
    type: 'alert' | 'confirm' | null;
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    show: false,
    type: null,
    title: '',
    message: '',
  });

  // Helper functions untuk dialog
  const showAlert = (message: string, title: string = 'Information') => {
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
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(true);
    }
    setDialogState({
      show: true,
      type: 'confirm',
      title,
      message,
      onConfirm,
      onCancel,
    });
  };

  const closeDialog = () => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(false);
    }
    setDialogState({
      show: false,
      type: null,
      title: '',
      message: '',
    });
  };

  const [activeTab, setActiveTab] = useState<'supplier' | 'customer'>('supplier');
  const [supplierPayments, setSupplierPayments] = useState<any[]>([]);
  const [customerPayments, setCustomerPayments] = useState<any[]>([]);

  const handleMarkAsPaid = async (item: any, type: 'supplier' | 'customer') => {
    const itemType = type === 'supplier' ? 'PO' : 'Invoice';
    showConfirm(
      `Mark ${itemType} ${item.poNo || item.invoiceNo} as PAID?`,
      async () => {
        try {
          if (type === 'supplier') {
            const updated = supplierPayments.map(p =>
              p.id === item.id ? { ...p, status: 'PAID', paidAt: new Date().toISOString() } : p
            );
            await storageService.set('supplierPayments', updated);
            setSupplierPayments(updated);
          } else {
            const updated = customerPayments.map(p =>
              p.id === item.id ? { ...p, status: 'PAID', paidAt: new Date().toISOString() } : p
            );
            await storageService.set('customerPayments', updated);
            setCustomerPayments(updated);
          }
          showAlert(`Payment marked as PAID`, 'Information');
        } catch (error: any) {
          showAlert(`Error updating payment: ${error.message}`, 'Error');
        }
      },
      undefined,
      'Confirm Payment'
    );
  };

  const tabs = [
    { id: 'supplier', label: 'Supplier Payments' },
    { id: 'customer', label: 'Customer Payments' },
  ];

  const supplierPaymentColumns = [
    { key: 'poNo', header: 'PO No' },
    { key: 'supplier', header: 'Supplier' },
    { key: 'soNo', header: 'SO No' },
    {
      key: 'total',
      header: 'Total',
      render: (item: any) => `Rp ${(item.total || 0).toLocaleString('id-ID')}`,
    },
    { key: 'paymentTerms', header: 'Payment Terms' },
    { key: 'topDays', header: 'TOP (days)' },
    { key: 'poDate', header: 'PO Date' },
    { key: 'receivedDate', header: 'Received Date' },
    { key: 'dueDate', header: 'Due Date' },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => (
        <span className={`status-badge status-${item.status?.toLowerCase() || 'draft'}`}>
          {item.status || 'DRAFT'}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (item: any) => (
        <Button variant="primary" onClick={() => handleMarkAsPaid(item, 'supplier')}>Mark as Paid</Button>
      ),
    },
  ];

  const customerPaymentColumns = [
    { key: 'invoiceNo', header: 'Invoice No' },
    { key: 'customer', header: 'Customer' },
    { key: 'soNo', header: 'SO No' },
    { key: 'sjNo', header: 'SJ No' },
    {
      key: 'total',
      header: 'Total',
      render: (item: any) => `Rp ${(item.total || 0).toLocaleString('id-ID')}`,
    },
    { key: 'paymentTerms', header: 'Payment Terms' },
    { key: 'invoiceDate', header: 'Invoice Date' },
    { key: 'dueDate', header: 'Due Date' },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => (
        <span className={`status-badge status-${item.status?.toLowerCase() || 'draft'}`}>
          {item.status || 'DRAFT'}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (item: any) => (
        <Button variant="primary" onClick={() => handleMarkAsPaid(item, 'supplier')}>Mark as Paid</Button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Accounts Receivable</h1>
      </div>

      <Card>
        <div className="tab-container">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id as any)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="tab-content">
          {activeTab === 'supplier' && (
            <Table columns={supplierPaymentColumns} data={[]} emptyMessage="No supplier payments" />
          )}
          {activeTab === 'customer' && (
            <Table columns={customerPaymentColumns} data={[]} emptyMessage="No customer payments" />
          )}
        </div>
      </Card>
      {/* Custom Dialog */}
      {dialogState.show && (
        <div className="dialog-overlay" onClick={closeDialog}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <Card className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2>{dialogState.title}</h2>
                <Button variant="secondary" onClick={closeDialog} style={{ padding: '6px 12px' }}>✕</Button>
              </div>
              <p style={{ marginBottom: '20px', whiteSpace: 'pre-wrap' }}>{dialogState.message}</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                {dialogState.type === 'confirm' && (
                  <Button variant="secondary" onClick={closeDialog}>Cancel</Button>
                )}
                <Button
                  variant="primary"
                  onClick={() => {
                    if (dialogState.onConfirm) dialogState.onConfirm();
                    closeDialog();
                  }}
                >
                  {dialogState.type === 'confirm' ? 'Confirm' : 'OK'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

    </div>
  );
};

export default AR;
