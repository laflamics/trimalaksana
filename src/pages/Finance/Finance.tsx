import { useState, useEffect, useMemo } from 'react';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { storageService } from '../../services/storage';
import { deletePackagingItem, reloadPackagingData } from '../../utils/packaging-delete-helper';
import '../../styles/common.css';

const Finance = () => {
  const [activeTab, setActiveTab] = useState<'supplier-payments' | 'expenses'>('supplier-payments');
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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


  useEffect(() => {
    loadData();
    // Refresh setiap 2 detik untuk cek notifikasi baru
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    // Load notifications dari GRN (Purchasing) - hanya yang masih OPEN (belum di-close)
    const financeNotifications = await storageService.get<any[]>('financeNotifications') || [];
    const pendingNotifications = financeNotifications.filter((n: any) => 
      (n.status === 'PENDING' || n.status === 'OPEN') && n.type === 'SUPPLIER_PAYMENT'
    );
    setNotifications(pendingNotifications);

    // Load semua PO
    const purchaseOrders = await storageService.get<any[]>('purchaseOrders') || [];
    
    // Gabungkan notifications dengan PO data untuk payment list
    const allPayments = financeNotifications
      .filter((n: any) => n.type === 'SUPPLIER_PAYMENT')
      .map((n: any) => {
        const po = purchaseOrders.find((p: any) => p.poNo === n.poNo);
        const paymentStatus = ((n.status || 'PENDING').toUpperCase() === 'CLOSE') ? 'CLOSE' : 'OPEN';
        return {
          ...n,
          poNo: n.poNo || po?.poNo || '-',
          supplier: n.supplier || po?.supplier || '-',
          soNo: n.soNo || po?.soNo || '-',
          total: n.total || po?.total || 0,
          status: po?.status || 'OPEN',
          paymentStatus,
          materialItem: n.materialItem || po?.materialItem || '-',
          qty: n.qty || po?.qty || 0,
          receiptDate: n.receivedDate || po?.receiptDate || '-',
          suratJalan: n.suratJalan,
          suratJalanName: n.suratJalanName,
          grnNo: n.grnNo,
        };
      });

    // Jika ada PO yang sudah CLOSE tapi belum ada di notifications, tambahkan juga (untuk backward compatibility)
    const poWithoutNotification = purchaseOrders
      .filter((po: any) => po.status === 'CLOSE' && !allPayments.find((p: any) => p.poNo === po.poNo))
      .map((po: any) => ({
        id: po.id,
        poNo: po.poNo,
        supplier: po.supplier,
        soNo: po.soNo,
        total: po.total,
        status: po.status || 'CLOSE',
        paymentStatus: 'CLOSE',
      }));

    const uniquePayments = [...allPayments, ...poWithoutNotification].filter((p, index, self) =>
      index === self.findIndex((t) => t.poNo === p.poNo)
    );
    setPayments(uniquePayments);

    const exp = await storageService.get<any[]>('expenses') || [];
    // Ensure exp is always an array
    const expArray = Array.isArray(exp) ? exp : [];
    setExpenses(expArray);
  };

  const handleMarkAsPaid = async (item: any, paymentProof?: string, paymentProofName?: string) => {
    showConfirm(
      `Mark payment for PO: ${item.poNo} as CLOSE?\n\nThis will close the PO.`,
      async () => {
        try {
          // Update notification status to CLOSE (bukan PAID)
          const financeNotifications = await storageService.get<any[]>('financeNotifications') || [];
          // Ensure financeNotifications is always an array
          const financeNotificationsArray = Array.isArray(financeNotifications) ? financeNotifications : [];
          const updatedNotifications = financeNotificationsArray.map((n: any) =>
            n.id === item.id || (n.soNo === item.soNo && n.type === 'SUPPLIER_PAYMENT' && n.poNo === item.poNo)
              ? { ...n, status: 'CLOSE', paidAt: new Date().toISOString(), paymentProof, paymentProofName }
              : n
          );
          await storageService.set('financeNotifications', updatedNotifications);

          // Update PO status to CLOSE setelah payment (ini trigger close PO)
          const purchaseOrders = await storageService.get<any[]>('purchaseOrders') || [];
          // Ensure purchaseOrders is always an array
          const purchaseOrdersArray = Array.isArray(purchaseOrders) ? purchaseOrders : [];
          const updatedPOs = purchaseOrdersArray.map((po: any) =>
            po.poNo === item.poNo ? { ...po, status: 'CLOSE' as const } : po
          );
          await storageService.set('purchaseOrders', updatedPOs);

          // Create payment record untuk AP tracking
          try {
            // purchaseOrdersArray already declared above
            const po = purchaseOrdersArray.find((p: any) => p.poNo === item.poNo);
            const paymentAmount = po?.total || item.total || 0;
            const existingPayments = await storageService.get<any[]>('payments') || [];
            // Ensure existingPayments is always an array
            const existingPaymentsArray = Array.isArray(existingPayments) ? existingPayments : [];
            
            // Cek apakah payment record sudah ada
            const existingPayment = existingPaymentsArray.find((p: any) => 
              (p.poNo === item.poNo || p.purchaseOrderNo === item.poNo) && p.type === 'Payment'
            );
            
            if (!existingPayment) {
              // Create payment record
              // existingPaymentsArray already declared above
              const paymentNo = `PAY-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(existingPaymentsArray.length + 1).padStart(4, '0')}`;
              const newPayment = {
                id: Date.now().toString(),
                paymentNo: paymentNo,
                paymentDate: new Date().toISOString().split('T')[0],
                type: 'Payment',
                poNo: item.poNo,
                purchaseOrderNo: item.poNo,
                supplier: item.supplier || po?.supplier || 'Supplier',
                supplierName: item.supplier || po?.supplier || 'Supplier',
                amount: paymentAmount,
                paymentMethod: 'Bank Transfer',
                reference: item.poNo,
                notes: `Payment for PO ${item.poNo}`,
                created: new Date().toISOString(),
              };
              
              await storageService.set('payments', [...existingPaymentsArray, newPayment]);
            }
          } catch (error: any) {
            console.error('Error creating payment record:', error);
          }

          // Auto-create journal entries untuk supplier payment (AP + Cash)
          try {
            const journalEntries = await storageService.get<any[]>('journalEntries') || [];
            const accounts = await storageService.get<any[]>('accounts') || [];
            const po = purchaseOrdersArray.find((p: any) => p.poNo === item.poNo);
            const paymentAmount = po?.total || item.total || 0;
            const entryDate = new Date().toISOString().split('T')[0];
            
            const apAccount = accounts.find((a: any) => a.code === '2000') || { code: '2000', name: 'Accounts Payable' };
            const cashAccount = accounts.find((a: any) => a.code === '1000') || { code: '1000', name: 'Cash' };
            
            // Create journal entries: Debit AP, Credit Cash
            // Pastikan kedua entries dibuat bersamaan untuk balance
            const paymentReference = `PAYMENT-${item.poNo}`;
            const hasPaymentEntry = journalEntries.some((entry: any) =>
              entry.reference === paymentReference &&
              (entry.account === '2000' || entry.account === '1000')
            );

            if (!hasPaymentEntry) {
              const entriesToAdd = [
                {
                  entryDate: entryDate,
                  reference: paymentReference,
                  account: '2000',
                  accountName: apAccount.name,
                  debit: paymentAmount,
                  credit: 0,
                  description: `Supplier Payment for PO ${item.poNo} - ${item.supplier || 'Supplier'}`,
                },
                {
                  entryDate: entryDate,
                  reference: paymentReference,
                  account: '1000',
                  accountName: cashAccount.name,
                  debit: 0,
                  credit: paymentAmount,
                  description: `Supplier Payment for PO ${item.poNo} - ${item.supplier || 'Supplier'}`,
                },
              ];
              
              const baseLength = journalEntries.length;
              const entriesWithNo = entriesToAdd.map((entry, idx) => ({
                ...entry,
                id: `${Date.now()}-${idx + 1}`,
                no: baseLength + idx + 1,
              }));
              await storageService.set('journalEntries', [...journalEntries, ...entriesWithNo]);
            }
          } catch (error: any) {
            console.error('Error creating journal entries for supplier payment:', error);
          }

          // Update payments list
          const updated = payments.map(p =>
            p.poNo === item.poNo
              ? { ...p, paymentStatus: 'CLOSE', status: 'CLOSE', paidAt: new Date().toISOString() }
              : p
          );
          setPayments(updated);
          
          showAlert(`✅ Payment completed\n\n✅ PO ${item.poNo} closed\n✅ Journal entries created in General Ledger`, 'Success');
          setSelectedPayment(null);
          loadData();
        } catch (error: any) {
          showAlert(`Error marking payment as CLOSE: ${error.message}`, 'Error');
        }
      },
      undefined,
      'Confirm Payment'
    );
  };

  const handleViewPayment = (item: any) => {
    setSelectedPayment(item);
  };

  const handleEditExpense = (item: any) => {
    showAlert(`Edit Expense: ${item.expenseNo} - Form to be implemented`, 'Information');
  };

  const handleDeleteExpense = async (item: any) => {
    showConfirm(
      `Delete expense: ${item.expenseNo}?`,
      async () => {
        try {
          // 🚀 FIX: Pakai packaging delete helper untuk konsistensi
          const deleteResult = await deletePackagingItem('expenses', item.id, 'id');
          if (deleteResult.success) {
            // Reload data dengan helper (handle race condition)
            await reloadPackagingData('expenses', setExpenses);
            showAlert(`Expense ${item.expenseNo} deleted successfully`, 'Success');
          } else {
            showAlert(`Error deleting expense: ${deleteResult.error || 'Unknown error'}`, 'Error');
          }
        } catch (error: any) {
          showAlert(`Error deleting expense: ${error.message}`, 'Error');
        }
      },
      undefined,
      'Confirm Delete'
    );
  };

  const tabs = [
    { id: 'supplier-payments', label: 'Supplier Payments' },
    { id: 'expenses', label: 'Expenses (Petty Cash)' },
  ];

  const supplierPaymentColumns = [
    { key: 'poNo', header: 'PO No' },
    { 
      key: 'supplier', 
      header: 'Supplier',
      render: (item: any) => <span style={{ color: '#ffffff' }}>{item.supplier}</span>
    },
    { key: 'soNo', header: 'SO No' },
    {
      key: 'total',
      header: 'Total',
      render: (item: any) => `Rp ${(item.total || 0).toLocaleString('id-ID')}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => {
        const paymentStatus = (item.paymentStatus || 'OPEN').toUpperCase();
        return (
          <span className={`status-badge status-${paymentStatus.toLowerCase()}`}>
            {paymentStatus}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: any) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          {(item.paymentStatus || 'OPEN').toUpperCase() === 'OPEN' && (
            <Button variant="primary" onClick={() => handleMarkAsPaid(item)}>Close Payment</Button>
          )}
          <Button variant="secondary" onClick={() => handleViewPayment(item)}>View Payment</Button>
        </div>
      ),
    },
  ];

  // Sort payments by created date (terbaru di atas)
  const sortedPayments = useMemo(() => {
    // Ensure payments is always an array
    const paymentsArray = Array.isArray(payments) ? payments : [];
    return [...paymentsArray].sort((a, b) => {
      const dateA = new Date(a.created || 0).getTime();
      const dateB = new Date(b.created || 0).getTime();
      return dateB - dateA; // Descending (newest first)
    });
  }, [payments]);

  // Filter payments berdasarkan search query
  const filteredPayments = useMemo(() => {
    // Ensure sortedPayments is always an array
    const sortedArray = Array.isArray(sortedPayments) ? sortedPayments : [];
    if (!searchQuery) return sortedArray;
    const query = searchQuery.toLowerCase();
    return sortedArray.filter((p: any) =>
      (p.poNo || '').toLowerCase().includes(query) ||
      (p.supplier || '').toLowerCase().includes(query) ||
      (p.soNo || '').toLowerCase().includes(query) ||
      (p.status || '').toLowerCase().includes(query) ||
      String(p.total || 0).includes(query)
    );
  }, [sortedPayments, searchQuery]);

  // Filter expenses berdasarkan search query
  const filteredExpenses = useMemo(() => {
    // Ensure expenses is always an array
    const expensesArray = Array.isArray(expenses) ? expenses : [];
    if (!searchQuery) return expensesArray;
    const query = searchQuery.toLowerCase();
    return expensesArray.filter((e: any) =>
      (e.expenseNo || '').toLowerCase().includes(query) ||
      (e.category || '').toLowerCase().includes(query) ||
      (e.description || '').toLowerCase().includes(query) ||
      (e.paidBy || '').toLowerCase().includes(query) ||
      String(e.amount || 0).includes(query)
    );
  }, [expenses, searchQuery]);

  // Get row color based on SO No (dark theme selang-seling - sama seperti PPIC)
  const getRowColor = (soNo: string): string => {
    // Ensure filteredPayments is always an array
    const filteredPaymentsArray = Array.isArray(filteredPayments) ? filteredPayments : [];
    const uniqueSOs = Array.from(new Set(filteredPaymentsArray.map(p => p.soNo)));
    const soIndex = uniqueSOs.indexOf(soNo);
    const rowColors = ['#1b1b1b', '#2f2f2f'];
    const index = soIndex >= 0 ? soIndex : 0;
    return rowColors[index % rowColors.length];
  };

  // Get row color for expenses (dark theme selang-seling)
  const getExpenseRowColor = (expenseNo: string): string => {
    const expenseIndex = filteredExpenses.findIndex((e: any) => e.expenseNo === expenseNo);
    return expenseIndex % 2 === 0 ? '#1a1a1a' : '#1f1f1f';
  };

  const expenseColumns = [
    { key: 'expenseNo', header: 'Expense No' },
    { key: 'category', header: 'Category' },
    { key: 'description', header: 'Description' },
    {
      key: 'amount',
      header: 'Amount',
      render: (item: any) => `Rp ${(item.amount || 0).toLocaleString('id-ID')}`,
    },
    { key: 'paidBy', header: 'Paid By' },
    { key: 'expenseDate', header: 'Expense Date' },
    { key: 'receiptProof', header: 'Receipt Proof' },
    { key: 'notes', header: 'Notes' },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: any) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={() => handleEditExpense(item)}>Edit</Button>
          <Button variant="danger" onClick={() => handleDeleteExpense(item)}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Finance</h1>
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
          {activeTab === 'supplier-payments' && (
            <>
              {/* Search Input */}
              <div style={{ marginBottom: '16px' }}>
                <Input
                  label="Search & Filter"
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search by PO No, Supplier, SO No, Status, Total..."
                />
              </div>

              {/* Notifications dari Delivery Note */}
              {notifications.length > 0 && (
                <div style={{ 
                  marginBottom: '20px', 
                  padding: '16px', 
                  backgroundColor: '#4CAF50', 
                  borderRadius: '8px',
                  color: 'white'
                }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
                    📧 New Notifications ({notifications.length})
                  </h3>
                  {notifications.map((notif: any) => (
                    <div key={notif.id} style={{ 
                      marginBottom: '8px', 
                      padding: '12px', 
                      backgroundColor: 'rgba(255,255,255,0.1)', 
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}>
                      <div><strong>GRN No:</strong> {notif.grnNo || '-'}</div>
                      <div><strong>PO No:</strong> {notif.poNo || '-'}</div>
                      <div><strong>Supplier:</strong> {notif.supplier || '-'}</div>
                      <div><strong>SO No:</strong> {notif.soNo || '-'}</div>
                      <div><strong>Total:</strong> Rp {(notif.total || 0).toLocaleString('id-ID')}</div>
                      <div><strong>Received Date:</strong> {notif.receivedDate || '-'}</div>
                      {notif.invoiceNo && <div><strong>Invoice No:</strong> {notif.invoiceNo}</div>}
                      {notif.invoiceFileName && <div><strong>Invoice File:</strong> {notif.invoiceFileName}</div>}
                      {notif.suratJalanName && <div><strong>Surat Jalan:</strong> {notif.suratJalanName}</div>}
                      <Button 
                        variant="primary" 
                        onClick={() => setSelectedPayment(notif)}
                        style={{ marginTop: '8px', fontSize: '12px', padding: '6px 12px' }}
                      >
                        Process Payment
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Table 
                columns={supplierPaymentColumns} 
                data={filteredPayments} 
                emptyMessage={searchQuery ? "No supplier payments found matching your search" : "No supplier payments"}
                getRowStyle={(item: any) => ({
                  backgroundColor: getRowColor(item.soNo),
                })}
              />
            </>
          )}
          {activeTab === 'expenses' && (
            <>
              {/* Search Input */}
              <div style={{ marginBottom: '16px' }}>
                <Input
                  label="Search & Filter"
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search by Expense No, Category, Description, Paid By, Amount..."
                />
              </div>
              <Table 
                columns={expenseColumns} 
                data={filteredExpenses} 
                emptyMessage={searchQuery ? "No expenses found matching your search" : "No expenses"}
                getRowStyle={(item: any) => ({
                  backgroundColor: getExpenseRowColor(item.expenseNo || item.id || ''),
                })}
              />
            </>
          )}
        </div>
      </Card>

      {/* Payment Dialog */}
      {selectedPayment && (
        <PaymentDialog
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          onMarkAsPaid={handleMarkAsPaid}
        />
      )}
    </div>
  );
};

// Payment Dialog Component
const PaymentDialog = ({ payment, onClose, onMarkAsPaid }: { payment: any; onClose: () => void; onMarkAsPaid: (item: any, proof?: string, proofName?: string) => void }) => {
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [viewSJData, setViewSJData] = useState<{ url: string; name: string; isBlob?: boolean } | null>(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPaymentProof(file);
    }
  };

  const handleSubmit = async () => {
    let proofBase64 = payment.paymentProof;
    let proofName = payment.paymentProofName;

    if (paymentProof) {
      const reader = new FileReader();
      reader.onload = (e) => {
        proofBase64 = e.target?.result as string;
        proofName = paymentProof.name;
        onMarkAsPaid(payment, proofBase64, proofName);
      };
      reader.readAsDataURL(paymentProof);
    } else {
      onMarkAsPaid(payment);
    }
  };

  useEffect(() => {
    return () => {
      if (viewSJData?.isBlob && viewSJData.url.startsWith('blob:')) {
        URL.revokeObjectURL(viewSJData.url);
      }
    };
  }, [viewSJData]);

  const handleViewSuratJalan = () => {
    if (!payment?.suratJalan) {
      showAlert('Tidak ada file surat jalan yang diupload.', 'Information');
      return;
    }
    
    try {
      let documentSrc = payment.suratJalan.startsWith('data:')
        ? payment.suratJalan
        : `data:application/pdf;base64,${payment.suratJalan}`;
      let isBlob = false;
      
      if (documentSrc.startsWith('data:application/pdf') || 
          payment.suratJalanName?.toLowerCase().endsWith('.pdf')) {
        try {
          const base64Data = documentSrc.includes(',') 
            ? documentSrc.split(',')[1] 
            : (payment.suratJalan.startsWith('data:') ? payment.suratJalan.split(',')[1] : payment.suratJalan);
          
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          
          documentSrc = URL.createObjectURL(blob);
          isBlob = true;
        } catch (blobError) {
          console.warn('Failed to convert PDF to blob, using base64 directly:', blobError);
        }
      }
      
      setViewSJData({
        url: documentSrc,
        name: payment.suratJalanName || 'Surat Jalan',
        isBlob,
      });
    } catch (error: any) {
      console.error('Error viewing Surat Jalan:', error);
      showAlert(`Error viewing Surat Jalan: ${error.message}`, 'Error');
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
        <Card className="dialog-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Close Payment</h2>
            <Button variant="secondary" onClick={onClose} style={{ padding: '6px 12px' }}>✕</Button>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                Payment Information
              </label>
              <div style={{ 
                padding: '12px', 
                backgroundColor: 'var(--bg-secondary)', 
                borderRadius: '6px',
                fontSize: '13px',
                lineHeight: '1.6'
              }}>
                <div><strong>PO No:</strong> {payment.poNo || '-'}</div>
                <div><strong>Supplier:</strong> {payment.supplier || '-'}</div>
                <div><strong>SO No:</strong> {payment.soNo || '-'}</div>
                <div><strong>Total:</strong> Rp {(payment.total || 0).toLocaleString('id-ID')}</div>
                <div><strong>Payment Status:</strong> {(payment.paymentStatus || 'OPEN').toUpperCase()}</div>
                {payment.status && <div><strong>PO Status:</strong> {payment.status}</div>}
                {payment.materialItem && <div><strong>Material:</strong> {payment.materialItem}</div>}
                {payment.qty !== undefined && <div><strong>Qty:</strong> {payment.qty}</div>}
                {payment.receiptDate && <div><strong>Receipt Date:</strong> {payment.receiptDate}</div>}
                {payment.grnNo && <div><strong>GRN No:</strong> {payment.grnNo}</div>}
                {payment.suratJalanName && <div><strong>Surat Jalan:</strong> {payment.suratJalanName}</div>}
              </div>
              {payment.suratJalan && (
                <Button
                  variant="secondary"
                  onClick={handleViewSuratJalan}
                  style={{ marginTop: '8px', padding: '6px 12px', fontSize: '12px' }}
                >
                  View Surat Jalan
                </Button>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                Payment Proof (Optional)
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              />
              {payment.paymentProofName && !paymentProof && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Current: {payment.paymentProofName}
                </div>
              )}
              {paymentProof && (
                <div style={{ fontSize: '12px', color: 'var(--success)', marginTop: '4px' }}>
                  Selected: {paymentProof.name}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button variant="primary" onClick={handleSubmit}>
                Close Payment
              </Button>
            </div>
          </div>
        </Card>
      </div>
      {viewSJData && (
        <div
          className="dialog-overlay"
          onClick={() => {
            if (viewSJData.isBlob && viewSJData.url.startsWith('blob:')) {
              URL.revokeObjectURL(viewSJData.url);
            }
            setViewSJData(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90%', width: '900px', maxHeight: '90vh', overflow: 'auto' }}
          >
            <Card className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2>Surat Jalan - {viewSJData.name}</h2>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (viewSJData.isBlob && viewSJData.url.startsWith('blob:')) {
                      URL.revokeObjectURL(viewSJData.url);
                    }
                    setViewSJData(null);
                  }}
                >
                  ✕ Close
                </Button>
              </div>
              <div
                style={{
                  width: '100%',
                  maxHeight: '70vh',
                  overflow: 'auto',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  backgroundColor: '#f5f5f5',
                  padding: '20px',
                  borderRadius: '4px',
                }}
              >
                {viewSJData.url.startsWith('data:image/') ? (
                  <img
                    src={viewSJData.url}
                    alt={viewSJData.name}
                    style={{
                      maxWidth: '100%',
                      height: 'auto',
                      borderRadius: '4px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  />
                ) : (
                  <iframe
                    src={viewSJData.url}
                    style={{
                      width: '100%',
                      height: '70vh',
                      border: 'none',
                      borderRadius: '4px',
                      backgroundColor: '#fff',
                    }}
                    title="Surat Jalan PDF"
                  />
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
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

export default Finance;
