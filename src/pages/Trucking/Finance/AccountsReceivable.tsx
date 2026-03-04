import { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import DateRangeFilter from '../../../components/DateRangeFilter';
import { storageService, StorageKeys } from '../../../services/storage';
import { setupRealTimeSync, TRUCKING_SYNC_KEYS } from '../../../utils/real-time-sync-helper';
import { useLanguage } from '../../../hooks/useLanguage';
import '../../../styles/common.css';
import '../../../styles/compact.css';

const AccountsReceivable = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [agingFilter, setAgingFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [newInvoiceAlert, setNewInvoiceAlert] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'open' | 'close'>('open');
  const invoiceNotificationListenerRef = useRef<(() => void) | null>(null);

  // Custom Dialog state
  const [, setDialogState] = useState<{
    show: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    show: false,
    type: 'alert',
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

  // Setup real-time listener untuk invoice notifications
  useEffect(() => {
    const setupInvoiceListener = async () => {
      // Listen untuk perubahan di invoiceNotifications
      invoiceNotificationListenerRef.current = () => {
        loadData();
        setNewInvoiceAlert('✅ New invoice detected! AR updated.');
        setTimeout(() => setNewInvoiceAlert(''), 3000);
      };

      // Subscribe ke storage changes
      const handleStorageChange = (event: StorageEvent) => {
        if (event.key === StorageKeys.TRUCKING.INVOICES && invoiceNotificationListenerRef.current) {
          invoiceNotificationListenerRef.current();
        }
      };

      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    };

    setupInvoiceListener();
  }, []);

  useEffect(() => {
    loadData();
    
    // Real-time listener untuk server updates
    const cleanup = setupRealTimeSync({
      keys: [TRUCKING_SYNC_KEYS.INVOICES, TRUCKING_SYNC_KEYS.PAYMENTS],
      onUpdate: loadData,
    });
    
    return cleanup;
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Fetch from server using storageService.get() - same as Invoice component
      const [invs, cust] = await Promise.all([
        storageService.get<any[]>(StorageKeys.TRUCKING.INVOICES) || [],
        storageService.get<any[]>(StorageKeys.TRUCKING.CUSTOMERS) || [],
      ]);
      
      setInvoices(Array.isArray(invs) ? invs : []);
      setCustomers(Array.isArray(cust) ? cust : []);
    } catch (error: any) {
      showAlert(`Error loading data: ${error.message}`, 'Error');
    } finally {
      setLoading(false);
    }
  };

  const calculateAging = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getAgingCategory = (days: number) => {
    if (days < 0) return 'Not Due';
    if (days <= 30) return '0-30 Days';
    if (days <= 60) return '31-60 Days';
    if (days <= 90) return '61-90 Days';
    return 'Over 90 Days';
  };

  const arData = useMemo(() => {
    // Ensure invoices is an array
    if (!Array.isArray(invoices)) return [];
    
    // Map invoices to AR format (both OPEN and CLOSE)
    return invoices
      .map((inv: any) => {
        // Find customer from master data
        const safeCustomers = Array.isArray(customers) ? customers : [];
        const customer = safeCustomers.find((c: any) => 
          c.kode === inv.customer || 
          c.nama === inv.customer ||
          inv.customer?.includes(c.nama) ||
          inv.customer?.includes(c.kode)
        );
        
        // Calculate due date
        const invDate = new Date(inv.invoiceDate || inv.created);
        const topDays = inv.topDays || inv.bom?.topDays || 30;
        const dueDate = new Date(invDate);
        dueDate.setDate(dueDate.getDate() + topDays);
        
        const agingDays = calculateAging(dueDate.toISOString().split('T')[0]);
        const agingCategory = getAgingCategory(agingDays);
        
        return {
          invoiceNo: inv.invoiceNo,
          invoiceDate: inv.invoiceDate || inv.created,
          dueDate: dueDate.toISOString().split('T')[0],
          customerName: inv.customer || '',
          customerCode: customer?.kode || '',
          customerCreditLimit: customer?.creditLimit || 0,
          soNo: inv.soNo || '',
          invoiceTotal: inv.bom?.total || inv.total || 0,
          paidAmount: inv.paidAmount || 0,
          balance: (inv.bom?.total || inv.total || 0) - (inv.paidAmount || 0),
          topDays: topDays,
          agingDays: agingDays,
          agingCategory: agingCategory,
          isOverdue: agingDays > 0,
          status: inv.status || 'OPEN',
          paidDate: inv.paidDate || '',
          paymentProof: inv.paymentProof || '',
        };
      });
  }, [invoices, customers]);

  // Filter AR data by status
  const openAR = useMemo(() => {
    return (Array.isArray(arData) ? arData : []).filter(item => item.status === 'OPEN');
  }, [arData]);

  const closeAR = useMemo(() => {
    return (Array.isArray(arData) ? arData : []).filter(item => item.status === 'CLOSE');
  }, [arData]);

  const filteredAR = useMemo(() => {
    // Get data based on active tab
    const sourceData = activeTab === 'open' ? openAR : closeAR;
    
    return (Array.isArray(sourceData) ? sourceData : []).filter(item => {
      const matchesSearch = !searchQuery ||
        (item.invoiceNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.soNo || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      // Only apply aging filter for OPEN tab
      const matchesAging = activeTab === 'close' ? true : (
        agingFilter === 'all' || item.agingCategory === agingFilter
      );
      
      // Date filtering
      const invoiceDate = new Date(item.invoiceDate);
      const matchesDateFrom = !dateFrom || invoiceDate >= new Date(dateFrom);
      const matchesDateTo = !dateTo || invoiceDate <= new Date(dateTo);
      
      return matchesSearch && matchesAging && matchesDateFrom && matchesDateTo;
    });
  }, [arData, searchQuery, agingFilter, activeTab, openAR, closeAR, dateFrom, dateTo]);

  const totalAR = useMemo(() => {
    return (Array.isArray(filteredAR) ? filteredAR : []).reduce((sum, item) => sum + (item.balance || 0), 0);
  }, [filteredAR]);

  const agingSummary = useMemo(() => {
    const summary: Record<string, number> = {
      'Not Due': 0,
      '0-30 Days': 0,
      '31-60 Days': 0,
      '61-90 Days': 0,
      'Over 90 Days': 0,
    };
    
    (Array.isArray(filteredAR) ? filteredAR : []).forEach(item => {
      summary[item.agingCategory] = (summary[item.agingCategory] || 0) + (item.balance || 0);
    });
    
    return summary;
  }, [filteredAR]);

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const dataToExport = filteredAR.map(item => ({
        'Invoice No': item.invoiceNo || '',
        'Invoice Date': item.invoiceDate || '',
        'Due Date': item.dueDate || '',
        'Customer': item.customerName || '',
        'SO No': item.soNo || '',
        'Invoice Amount': item.invoiceTotal || 0,
        'Paid': item.paidAmount || 0,
        'Balance': item.balance || 0,
        'Aging Days': item.agingDays || 0,
        'Aging Category': item.agingCategory || '',
        'Status': item.isOverdue ? 'Overdue' : 'Current',
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Accounts Receivable');
      
      const fileName = `Accounts_Receivable_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Exported ${dataToExport.length} AR records to ${fileName}`, 'Success');
    } catch (error: any) {
      showAlert(`Error exporting to Excel: ${error.message}`, 'Error');
    }
  };

  const handlePaymentClick = (item: any) => {
    setSelectedInvoice(item);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaidAmount(item.invoiceTotal); // Default to full amount
    setPaymentProof(null);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedInvoice) return;
    
    try {
      // Update invoice status to CLOSE
      const updated = invoices.map(inv =>
        inv.invoiceNo === selectedInvoice.invoiceNo 
          ? { 
              ...inv, 
              status: 'CLOSE', 
              paidDate: paymentDate,
              paidAmount: paidAmount,
              paymentProof: paymentProof?.name || '',
              lastUpdate: new Date().toISOString(),
            }
          : inv
      );
      
      await storageService.set(StorageKeys.TRUCKING.INVOICES, updated);
      setInvoices(updated);
      
      showAlert(`✅ Payment recorded for Invoice ${selectedInvoice.invoiceNo}\nPayment Date: ${paymentDate}\nPaid Amount: Rp ${paidAmount.toLocaleString('id-ID')}\n\n✅ Invoice status changed to CLOSE`, 'Success');
      setSelectedInvoice(null);
      setPaidAmount(0);
      setPaymentProof(null);
    } catch (error: any) {
      showAlert(`Error recording payment: ${error.message}`, 'Error');
    }
  };

  const openColumns = [
    { key: 'invoiceNo', header: 'Invoice No' },
    { key: 'invoiceDate', header: 'Invoice Date' },
    { key: 'dueDate', header: 'Due Date' },
    { key: 'customerName', header: 'Customer' },
    { key: 'soNo', header: 'SO No' },
    { key: 'invoiceTotal', header: 'Invoice Amount', render: (item: any) => {
      const invoiceTotal = item.invoiceTotal || 0;
      return `Rp ${invoiceTotal.toLocaleString('id-ID')}`;
    }},
    { key: 'paidAmount', header: 'Paid', render: (item: any) => `Rp ${(item.paidAmount || 0).toLocaleString('id-ID')}` },
    { key: 'balance', header: 'Balance', render: (item: any) => `Rp ${(item.balance || 0).toLocaleString('id-ID')}` },
    { key: 'agingDays', header: 'Aging Days', render: (item: any) => item.agingDays > 0 ? `${item.agingDays} days overdue` : `${Math.abs(item.agingDays)} days` },
    { key: 'agingCategory', header: 'Aging Category' },
    { key: 'status', header: 'Status', render: (item: any) => item.isOverdue ? 'Overdue' : 'Current' },
    {
      key: 'proof',
      header: 'Proof',
      render: (item: any) => (
        item.paymentProof ? (
          <Button 
            variant="secondary" 
            onClick={() => {
              const win = window.open('', '_blank');
              if (win) {
                const src = item.paymentProof.startsWith('data:') 
                  ? item.paymentProof 
                  : `data:application/pdf;base64,${item.paymentProof}`;
                win.document.write(`<iframe src="${src}" style="width:100%;height:100%;border:none;"></iframe>`);
              }
            }}
            style={{ fontSize: '10px', padding: '3px 6px' }}
          >
            📄 View
          </Button>
        ) : (
          <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>-</span>
        )
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (item: any) => (
        <Button 
          variant="primary" 
          onClick={() => handlePaymentClick(item)}
          style={{ fontSize: '12px', padding: '6px 12px' }}
        >
          💳 Record Payment
        </Button>
      ),
    },
  ];

  const closeColumns = [
    { key: 'invoiceNo', header: 'Invoice No' },
    { key: 'invoiceDate', header: 'Invoice Date' },
    { key: 'customerName', header: 'Customer' },
    { key: 'soNo', header: 'SO No' },
    { key: 'invoiceTotal', header: 'Invoice Amount', render: (item: any) => {
      const invoiceTotal = item.invoiceTotal || 0;
      return `Rp ${invoiceTotal.toLocaleString('id-ID')}`;
    }},
    { key: 'paidDate', header: 'Payment Date' },
    {
      key: 'paymentProof',
      header: 'Payment Proof',
      render: (item: any) => (
        item.paymentProof ? (
          <Button 
            variant="secondary" 
            onClick={() => {
              const win = window.open('', '_blank');
              if (win) {
                const src = item.paymentProof.startsWith('data:') 
                  ? item.paymentProof 
                  : `data:application/pdf;base64,${item.paymentProof}`;
                win.document.write(`<iframe src="${src}" style="width:100%;height:100%;border:none;"></iframe>`);
              }
            }}
            style={{ fontSize: '10px', padding: '3px 6px' }}
          >
            📄 View
          </Button>
        ) : (
          <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>-</span>
        )
      ),
    },
    { key: 'status', header: 'Status', render: () => (
      <span style={{ color: '#4CAF50', fontWeight: '600' }}>✅ CLOSED</span>
    )},
  ];

  return (
    <div className="module-compact">
      {newInvoiceAlert && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '16px',
          backgroundColor: '#d4edda',
          color: '#155724',
          borderRadius: '4px',
          border: '1px solid #c3e6cb',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          {newInvoiceAlert}
        </div>
      )}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Accounts Receivable</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Button 
              variant={activeTab === 'open' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('open')}
              style={{ fontSize: '12px', padding: '8px 16px' }}
            >
              📋 AR Open ({openAR.length})
            </Button>
            <Button 
              variant={activeTab === 'close' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('close')}
              style={{ fontSize: '12px', padding: '8px 16px' }}
            >
              ✅ AR Close ({closeAR.length})
            </Button>
          </div>
        </div>

        {/* Info Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          <div style={{ padding: '15px', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '1px solid #4caf50' }}>
            <div style={{ fontSize: '12px', color: '#2e7d32', marginBottom: '6px', fontWeight: '600' }}>💰 Dana Masuk (AR Close)</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1b5e20' }}>Rp {(Array.isArray(arData) ? arData : []).filter(item => item.status === 'CLOSE').reduce((sum, item) => sum + (item.paidAmount || 0), 0).toLocaleString('id-ID')}</div>
            <div style={{ fontSize: '11px', color: '#558b2f', marginTop: '4px' }}>Sudah diterima</div>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#fff3e0', borderRadius: '8px', border: '1px solid #ff9800' }}>
            <div style={{ fontSize: '12px', color: '#e65100', marginBottom: '6px', fontWeight: '600' }}>⏳ Outstanding Invoice (AR Open)</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#bf360c' }}>Rp {(Array.isArray(arData) ? arData : []).filter(item => item.status === 'OPEN').reduce((sum, item) => sum + (item.balance || 0), 0).toLocaleString('id-ID')}</div>
            <div style={{ fontSize: '11px', color: '#d84315', marginTop: '4px' }}>Belum diterima</div>
          </div>
        </div>

        {activeTab === 'open' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '10px', position: 'sticky', top: 0, backgroundColor: 'var(--bg-primary)', zIndex: 5, padding: '12px 0', flexWrap: 'wrap' }}>
              <Input
                type="text"
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(value) => setSearchQuery(value)}
              />
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <DateRangeFilter
                  onDateChange={(from, to) => {
                    setDateFrom(from);
                    setDateTo(to);
                  }}
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    const today = new Date();
                    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                    setDateFrom(firstDay.toISOString().split('T')[0]);
                    setDateTo(today.toISOString().split('T')[0]);
                  }}
                  style={{ fontSize: '11px', padding: '6px 12px' }}
                >
                  This Month
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const today = new Date();
                    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    setDateFrom(lastMonthStart.toISOString().split('T')[0]);
                    setDateTo(lastMonthEnd.toISOString().split('T')[0]);
                  }}
                  style={{ fontSize: '11px', padding: '6px 12px' }}
                >
                  Last Month
                </Button>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
              >
                <option value="all">All</option>
                <option value="current">Current</option>
                <option value="overdue">Overdue</option>
              </select>
              <select
                value={agingFilter}
                onChange={(e) => setAgingFilter(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
              >
                <option value="all">All Aging</option>
                <option value="Not Due">Not Due</option>
                <option value="0-30 Days">0-30 Days</option>
                <option value="31-60 Days">31-60 Days</option>
                <option value="61-90 Days">61-90 Days</option>
                <option value="Over 90 Days">Over 90 Days</option>
              </select>
              <Button variant="secondary" onClick={loadData} disabled={loading}>
                {loading ? '⏳ Loading...' : '🔄 Refresh'}
              </Button>
              <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
            </div>
          </>
        )}

        {activeTab === 'close' && (
          <div style={{ marginBottom: '20px', position: 'sticky', top: 0, backgroundColor: 'var(--bg-primary)', zIndex: 5, padding: '12px 0' }}>
            <Input
              type="text"
              placeholder="Search closed invoices..."
              value={searchQuery}
              onChange={(value) => setSearchQuery(value)}
            />
          </div>
        )}

        {activeTab === 'open' && (
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <div>
                <strong>Total AR:</strong> Rp {totalAR.toLocaleString('id-ID')}
              </div>
              <div>
                <strong>Total Invoices:</strong> {filteredAR.length}
              </div>
              <div>
                <strong>Overdue:</strong> {(Array.isArray(filteredAR) ? filteredAR : []).filter(item => item.isOverdue).length}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
              {Object.entries(agingSummary).map(([category, amount]) => (
                <div key={category} style={{ padding: '10px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{category}</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Rp {amount.toLocaleString('id-ID')}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div>⏳ Loading data...</div>
          </div>
        ) : (
          <Table 
            columns={activeTab === 'open' ? openColumns : closeColumns} 
            data={filteredAR}
            pageSize={10}
            showPagination={true}
            emptyMessage={activeTab === 'open' ? 'No open invoices' : 'No closed invoices'}
          />
        )}
      </Card>

      {/* Payment Dialog */}
      {selectedInvoice && (
        <div className="dialog-overlay" onClick={() => setSelectedInvoice(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <Card className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Record Payment</h2>
                <Button variant="secondary" onClick={() => setSelectedInvoice(null)} style={{ padding: '6px 12px' }}>✕</Button>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Invoice No</label>
                <div style={{ padding: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
                  {selectedInvoice.invoiceNo}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Customer</label>
                <div style={{ padding: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
                  {selectedInvoice.customerName}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Invoice Amount</label>
                <div style={{ padding: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
                  Rp {selectedInvoice.invoiceTotal.toLocaleString('id-ID')}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Paid Amount *</label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  min="0"
                  max={selectedInvoice.invoiceTotal}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Balance: Rp {(selectedInvoice.invoiceTotal - paidAmount).toLocaleString('id-ID')}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Payment Date *</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Upload Payment Proof</label>
                <input
                  type="file"
                  onChange={(e) => setPaymentProof(e.target.files?.[0] || null)}
                  accept=".pdf,.jpg,.jpeg,.png"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box',
                  }}
                />
                {paymentProof && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    ✅ {paymentProof.name}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={() => setSelectedInvoice(null)}>Cancel</Button>
                <Button variant="primary" onClick={handlePaymentSubmit}>💾 Save Payment</Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsReceivable;

