import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import DateRangeFilter from '../../../components/DateRangeFilter';
import { storageService, extractStorageValue, StorageKeys } from '../../../services/storage';
import '../../../styles/common.css';
import '../../../styles/compact.css';

interface JournalEntry {
  id: string;
  no: number;
  entryDate: string;
  reference: string;
  account: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
  created?: string;
  lastUpdate?: string;
  timestamp?: number;
  _timestamp?: number;
}

const AccountsPayable = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [agingFilter, setAgingFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [paymentRecords, setPaymentRecords] = useState<any[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'open' | 'close'>('open');

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


  useEffect(() => {
    loadData();
  }, []);

  const handleViewPaymentRecords = async (po: any) => {
    try {
      const payments = await storageService.get<Payment[]>('gt_payments') || [];
      const paymentsArray = Array.isArray(payments) ? payments : [];
      
      // Find all payments related to this PO
      const relatedPayments = paymentsArray.filter((p: any) => 
        (p.poNo || p.purchaseOrderNo || '').toString().trim() === (po.poNo || '').toString().trim()
      );
      
      setSelectedPO(po);
      setPaymentRecords(relatedPayments);
    } catch (error) {
      console.error('Error loading payment records:', error);
      setPaymentRecords([]);
    }
  };

  const handleRecordPayment = (po: any) => {
    setSelectedPO(po);
    setShowPaymentDialog(true);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaidAmount(po.balance); // Default to remaining balance
    setPaymentProof(null);
  };

  const handlePaymentSubmit = async () => {
    try {
      if (!paidAmount || paidAmount <= 0) {
        showAlert('Please enter a paid amount', 'Validation Error');
        return;
      }

      if (!selectedPO) return;

      // Create new payment record
      const payments = await storageService.get<Payment[]>('gt_payments') || [];
      const paymentsArray = Array.isArray(payments) ? payments : [];

      let proofBase64 = '';
      if (paymentProof) {
        proofBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(paymentProof);
        });
      }

      const newPayment = {
        id: Date.now().toString(),
        paymentNo: `PAY-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(paymentsArray.length + 1).padStart(4, '0')}`,
        paymentDate: paymentDate,
        type: 'Payment',
        poNo: selectedPO.poNo,
        purchaseOrderNo: selectedPO.poNo,
        supplierName: selectedPO.supplierName,
        amount: paidAmount,
        paymentMethod: 'Bank Transfer',
        invoiceNo: selectedPO.invoiceNo || '',
        customerName: selectedPO.customerName || '',
        soNo: selectedPO.soNo || '',
        paymentProof: proofBase64,
        proofFileName: paymentProof?.name || '',
        lastUpdate: new Date().toISOString(),
        timestamp: Date.now(),
        _timestamp: Date.now(),
      };

      const updated = [...paymentsArray, newPayment];
      await storageService.set(StorageKeys.GENERAL_TRADING.PAYMENTS, updated);

      showAlert(`✅ Payment recorded for PO ${selectedPO.poNo}\nPayment Date: ${paymentDate}\nPaid Amount: Rp ${paidAmount.toLocaleString('id-ID')}\n\n✅ Payment saved successfully`, 'Success');
      
      setShowPaymentDialog(false);
      setSelectedPO(null);
      setPaidAmount(0);
      setPaymentProof(null);
      
      loadData();
    } catch (error: any) {
      showAlert(`Error recording payment: ${error.message}`, 'Error');
    }
  };

  // Generate journal entries dari PO yang sudah CLOSE/RECEIVED tapi belum punya journal entry
  const generateMissingJournalEntries = async () => {
    try {
      // Konfirmasi dulu sebelum generate
      const confirmed = window.confirm(
        '⚠️ PERHATIAN!\n\n' +
        'Fungsi ini akan membuat journal entries untuk SEMUA PO yang sudah CLOSE/RECEIVED tapi belum punya journal entry.\n\n' +
        'Setiap PO akan membuat 2 journal entries:\n' +
        '- Debit Inventory (1200)\n' +
        '- Credit Accounts Payable (2000)\n\n' +
        'Apakah Anda yakin ingin melanjutkan?'
      );
      
      if (!confirmed) {
        return;
      }
      
      setLoading(true);
      const [entriesRaw, posRaw, accountsRaw] = await Promise.all([
        storageService.get<JournalEntry[]>('gt_journalEntries'),
        storageService.get<any[]>('gt_purchaseOrders'),
        storageService.get<Account[]>('gt_accounts'),
      ]);
      
      const entries = extractStorageValue(entriesRaw);
      const pos = extractStorageValue(posRaw);
      const accounts = extractStorageValue(accountsRaw);
      
      const entriesArray = Array.isArray(entries) ? entries : [];
      const posArray = Array.isArray(pos) ? pos : [];
      const accountsArray = Array.isArray(accounts) ? accounts : [];
      
      // Pastikan accounts ada
      if (accountsArray.length === 0) {
        const defaultAccounts = [
          { code: '1000', name: 'Cash', type: 'Asset', balance: 0 },
          { code: '1100', name: 'Accounts Receivable', type: 'Asset', balance: 0 },
          { code: '1200', name: 'Inventory', type: 'Asset', balance: 0 },
          { code: '1300', name: 'Fixed Assets', type: 'Asset', balance: 0 },
          { code: '2000', name: 'Accounts Payable', type: 'Liability', balance: 0 },
          { code: '2100', name: 'Accrued Expenses', type: 'Liability', balance: 0 },
          { code: '3000', name: 'Equity', type: 'Equity', balance: 0 },
          { code: '3100', name: 'Retained Earnings', type: 'Equity', balance: 0 },
          { code: '4000', name: 'Sales Revenue', type: 'Revenue', balance: 0 },
          { code: '4100', name: 'Other Income', type: 'Revenue', balance: 0 },
          { code: '5000', name: 'Cost of Goods Sold', type: 'Expense', balance: 0 },
          { code: '6000', name: 'Operating Expenses', type: 'Expense', balance: 0 },
          { code: '6100', name: 'Administrative Expenses', type: 'Expense', balance: 0 },
          { code: '6200', name: 'Financial Expenses', type: 'Expense', balance: 0 },
        ];
        await storageService.set(StorageKeys.GENERAL_TRADING.ACCOUNTS, defaultAccounts);
        accountsArray.push(...defaultAccounts);
      }
      
      const newEntries: JournalEntry[] = [];
      let entryNo = entriesArray.length + 1;
      const posToProcess: any[] = [];
      
      // Cek PO yang sudah CLOSE/RECEIVED dan sudah punya receiptDate (barang sudah diterima)
      // tapi belum punya journal entry untuk AP
      posArray.forEach((po: any) => {
        // Hanya proses PO yang sudah CLOSE/RECEIVED, punya total > 0, dan sudah punya receiptDate
        if ((po.status === 'CLOSE' || po.status === 'RECEIVED') && po.total > 0 && po.receiptDate) {
          // Cek apakah sudah ada journal entry untuk PO ini dengan account 2000
          const hasAPEntry = entriesArray.some((e: any) => 
            (e.reference === po.poNo || e.reference === po.id) && e.account === '2000'
          );
          
          if (!hasAPEntry) {
            posToProcess.push(po);
            // Gunakan receiptDate sebagai entryDate karena journal entry dibuat saat barang diterima
            const entryDate = po.receiptDate 
              ? new Date(po.receiptDate).toISOString().split('T')[0] 
              : (po.poDate || po.orderDate || po.created 
                ? new Date(po.poDate || po.orderDate || po.created).toISOString().split('T')[0] 
                : new Date().toISOString().split('T')[0]);
            const poTotal = po.total || 0;
            
            const inventoryAccount = accountsArray.find((a: any) => a.code === '1200') || { code: '1200', name: 'Inventory' };
            const apAccount = accountsArray.find((a: any) => a.code === '2000') || { code: '2000', name: 'Accounts Payable' };
            
            // Debit Inventory (1200), Credit Accounts Payable (2000)
            const now = new Date();
            newEntries.push(
              {
                id: `po-${po.id || po.poNo}-1`,
                no: entryNo++,
                entryDate: entryDate,
                reference: po.poNo || po.id,
                account: '1200',
                accountName: inventoryAccount.name,
                debit: poTotal,
                credit: 0,
                description: `PO ${po.poNo || po.id} - ${po.supplier || 'Supplier'}`,
                created: now.toISOString(),
                lastUpdate: now.toISOString(),
                timestamp: now.getTime(),
                _timestamp: now.getTime(),
              },
              {
                id: `po-${po.id || po.poNo}-2`,
                no: entryNo++,
                entryDate: entryDate,
                reference: po.poNo || po.id,
                account: '2000',
                accountName: apAccount.name,
                debit: 0,
                credit: poTotal,
                description: `PO ${po.poNo || po.id} - ${po.supplier || 'Supplier'}`,
                created: now.toISOString(),
                lastUpdate: now.toISOString(),
                timestamp: now.getTime(),
                _timestamp: now.getTime(),
              }
            );
          }
        }
      });
      
      if (newEntries.length > 0) {
        await storageService.set(StorageKeys.GENERAL_TRADING.JOURNAL_ENTRIES, [...entriesArray, ...newEntries]);
        showAlert(
          `✅ Generated ${newEntries.length} journal entries dari ${posToProcess.length} Purchase Orders\n\n` +
          `PO yang diproses:\n${posToProcess.map(po => `- ${po.poNo} (Rp ${(po.total || 0).toLocaleString('id-ID')})`).join('\n')}`,
          'Success'
        );
        // Reload data
        await loadData();
      } else {
        showAlert('No missing journal entries found. All PO already have journal entries.', 'Information');
      }
    } catch (error: any) {
      showAlert(`Error generating journal entries: ${error.message}`, 'Error');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [posRaw, paymentsRaw] = await Promise.all([
        storageService.get<any[]>('gt_purchaseOrders'),
        storageService.get<Payment[]>('gt_payments'),
      ]);
      
      // Extract values from wrapped storage format
      const pos = extractStorageValue(posRaw);
      const payments = extractStorageValue(paymentsRaw);
      
      // Merge PO data with payment data
      const posArray = Array.isArray(pos) ? pos : [];
      const paymentsArray = Array.isArray(payments) ? payments : [];
      
      // Create a map of payments by PO
      const paymentsByPO: Record<string, any[]> = {};
      paymentsArray.forEach((p: any) => {
        if (p.type === 'Payment') {
          const poNo = p.poNo || p.purchaseOrderNo || '';
          if (poNo) {
            if (!paymentsByPO[poNo]) paymentsByPO[poNo] = [];
            paymentsByPO[poNo].push(p);
          }
        }
      });
      
      // Merge PO data with payments
      const merged = posArray.map((po: any) => ({
        ...po,
        payments: paymentsByPO[po.poNo] || [],
      }));
      
      setPurchaseOrders(merged);
    } catch (error: any) {
      showAlert(`Error loading data: ${error.message}`, 'Error');
    } finally {
      setLoading(false);
    }
  };

  const calculateAging = (orderDate: string, paymentTerms: string, topDays?: number) => {
    const today = new Date();
    const order = new Date(orderDate);
    
    // Parse payment terms (e.g., "TOP" = use topDays, "NET30" = 30 days)
    let days = 30;
    if (topDays) {
      days = topDays;
    } else if (paymentTerms) {
      const match = paymentTerms.match(/\d+/);
      if (match) days = parseInt(match[0]);
    }
    
    const dueDate = new Date(order);
    dueDate.setDate(dueDate.getDate() + days);
    
    const diffTime = today.getTime() - dueDate.getTime();
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

  const apData = useMemo(() => {
    // CRITICAL: Ensure purchaseOrders is an array
    if (!Array.isArray(purchaseOrders)) return [];
    
    // Map POs to AP format with payment data
    return purchaseOrders.map((po: any) => {
      // Calculate total paid from payment records
      const payments = Array.isArray(po.payments) ? po.payments : [];
      const paidAmount = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      
      const agingDays = calculateAging(po.created || po.poDate || new Date().toISOString().split('T')[0], po.paymentTerms, po.topDays);
      const agingCategory = getAgingCategory(agingDays);
      const balance = Math.max(0, (po.total || 0) - paidAmount);
      
      return {
        poNo: po.poNo,
        poDate: po.created ? po.created.split('T')[0] : new Date().toISOString().split('T')[0],
        supplierName: po.supplier || '',
        soNo: po.soNo || '',
        invoiceNo: po.invoiceNo || '',
        customerName: po.customerName || '',
        total: po.total || 0,
        paidAmount: paidAmount,
        balance: balance,
        paymentTerms: po.paymentTerms || 'TOP',
        topDays: po.topDays || 30,
        agingDays: agingDays,
        agingCategory: agingCategory,
        isOverdue: agingDays > 0 && balance > 0,
        status: balance > 0 ? 'OPEN' : 'CLOSE',
        paymentRecords: payments,
      };
    });
  }, [purchaseOrders]);

  const filteredAP = useMemo(() => {
    // Ensure apData is always an array
    const apDataArray = Array.isArray(apData) ? apData : [];
    return apDataArray.filter(item => {
      const matchesSearch = !searchQuery ||
        (item.poNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.supplierName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.soNo || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'overdue' && item.isOverdue) ||
        (statusFilter === 'current' && !item.isOverdue);
      
      const matchesAging = agingFilter === 'all' || item.agingCategory === agingFilter;
      
      // Filter by tab: open or close
      const matchesTab = activeTab === 'open' ? item.status === 'OPEN' : item.status === 'CLOSE';
      
      // Date filtering
      const poDate = new Date(item.poDate);
      const matchesDateFrom = !dateFrom || poDate >= new Date(dateFrom);
      const matchesDateTo = !dateTo || poDate <= new Date(dateTo);
      
      return matchesSearch && matchesStatus && matchesAging && matchesTab && matchesDateFrom && matchesDateTo;
    });
  }, [apData, searchQuery, statusFilter, agingFilter, activeTab, dateFrom, dateTo]);

  const totalAP = useMemo(() => {
    // Ensure filteredAP is always an array
    const filteredAPArray = Array.isArray(filteredAP) ? filteredAP : [];
    return filteredAPArray.reduce((sum, item) => sum + (item.balance || 0), 0);
  }, [filteredAP]);

  // Calculate AP Close (Dana Keluar - Paid Out)
  const apClose = useMemo(() => {
    return (Array.isArray(apData) ? apData : [])
      .filter(item => item.status === 'CLOSE')
      .reduce((sum, item) => sum + (item.paidAmount || 0), 0);
  }, [apData]);

  // Calculate AP Open (Dana Belum Keluar - Unpaid)
  const apOpen = useMemo(() => {
    return (Array.isArray(apData) ? apData : [])
      .filter(item => item.status === 'OPEN')
      .reduce((sum, item) => sum + (item.balance || 0), 0);
  }, [apData]);

  const agingSummary = useMemo(() => {
    const summary: Record<string, number> = {
      'Not Due': 0,
      '0-30 Days': 0,
      '31-60 Days': 0,
      '61-90 Days': 0,
      'Over 90 Days': 0,
    };
    
    // Ensure filteredAP is always an array
    const filteredAPArray = Array.isArray(filteredAP) ? filteredAP : [];
    filteredAPArray.forEach(item => {
      summary[item.agingCategory] = (summary[item.agingCategory] || 0) + (item.balance || 0);
    });
    
    return summary;
  }, [filteredAP]);

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const dataToExport = filteredAP.map(item => ({
        'PO No': item.poNo || '',
        'PO Date': item.poDate || '',
        'Supplier': item.supplierName || '',
        'SO No': item.soNo || '',
        'PO Amount': item.total || 0,
        'Paid': item.paidAmount || 0,
        'Balance': item.balance || 0,
        'Payment Terms': item.paymentTerms || '',
        'Aging Days': item.agingDays || 0,
        'Aging Category': item.agingCategory || '',
        'Status': item.status || '',
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Accounts Payable');
      
      const fileName = `Accounts_Payable_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Exported ${dataToExport.length} AP records to ${fileName}`, 'Success');
    } catch (error: any) {
      showAlert(`Error exporting to Excel: ${error.message}`, 'Error');
    }
  };

  const openColumns = [
    { key: 'poNo', header: 'PO No' },
    { key: 'poDate', header: 'PO Date' },
    { key: 'supplierName', header: 'Supplier' },
    { key: 'soNo', header: 'SO No' },
    { key: 'invoiceNo', header: 'Invoice', render: (item: any) => <div style={{ color: item.invoiceNo ? '#1976d2' : 'var(--text-secondary)' }}>{item.invoiceNo || '-'}</div> },
    { key: 'customerName', header: 'Customer', render: (item: any) => <div style={{ color: item.customerName ? '#2e7d32' : 'var(--text-secondary)' }}>{item.customerName ? (item.customerName.length > 20 ? item.customerName.substring(0, 20) + '...' : item.customerName) : '-'}</div> },
    { key: 'total', header: 'PO Amount', render: (item: any) => `Rp ${(item.total || 0).toLocaleString('id-ID')}` },
    { key: 'paidAmount', header: 'Paid', render: (item: any) => `Rp ${(item.paidAmount || 0).toLocaleString('id-ID')}` },
    { key: 'balance', header: 'Balance', render: (item: any) => `Rp ${(item.balance || 0).toLocaleString('id-ID')}` },
    { key: 'paymentTerms', header: 'Payment Terms' },
    { key: 'agingDays', header: 'Aging Days', render: (item: any) => item.agingDays > 0 ? `${item.agingDays} days overdue` : `${Math.abs(item.agingDays)} days` },
    { key: 'agingCategory', header: 'Aging Category' },
    { key: 'status', header: 'Status' },
    { key: 'actions', header: 'Actions', render: (item: any) => (
      <div style={{ display: 'flex', gap: '6px' }}>
        <Button 
          variant="secondary" 
          onClick={() => handleViewPaymentRecords(item)}
          style={{ fontSize: '10px', padding: '3px 6px' }}
        >
          💳 Payments
        </Button>
        {item.balance > 0 && (
          <Button 
            variant="primary" 
            onClick={() => handleRecordPayment(item)}
            style={{ fontSize: '10px', padding: '3px 6px' }}
          >
            💰 Pay
          </Button>
        )}
      </div>
    )},
  ];

  const closeColumns = [
    { key: 'poNo', header: 'PO No' },
    { key: 'poDate', header: 'PO Date' },
    { key: 'supplierName', header: 'Supplier' },
    { key: 'soNo', header: 'SO No' },
    { key: 'invoiceNo', header: 'Invoice', render: (item: any) => <div style={{ color: item.invoiceNo ? '#1976d2' : 'var(--text-secondary)' }}>{item.invoiceNo || '-'}</div> },
    { key: 'customerName', header: 'Customer', render: (item: any) => <div style={{ color: item.customerName ? '#2e7d32' : 'var(--text-secondary)' }}>{item.customerName ? (item.customerName.length > 20 ? item.customerName.substring(0, 20) + '...' : item.customerName) : '-'}</div> },
    { key: 'total', header: 'PO Amount', render: (item: any) => `Rp ${(item.total || 0).toLocaleString('id-ID')}` },
    { key: 'paidAmount', header: 'Paid', render: (item: any) => `Rp ${(item.paidAmount || 0).toLocaleString('id-ID')}` },
    { key: 'paymentTerms', header: 'Payment Terms' },
    { key: 'status', header: 'Status', render: () => (
      <span style={{ color: '#4CAF50', fontWeight: '600' }}>✅ CLOSED</span>
    )},
  ];

  return (
    <div className="module-compact">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Accounts Payable</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Button 
              variant={activeTab === 'open' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('open')}
              style={{ fontSize: '12px', padding: '8px 16px' }}
            >
              📋 AP Open ({(Array.isArray(filteredAP) ? filteredAP : []).filter(item => item.status === 'OPEN').length})
            </Button>
            <Button 
              variant={activeTab === 'close' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('close')}
              style={{ fontSize: '12px', padding: '8px 16px' }}
            >
              ✅ AP Close ({(Array.isArray(filteredAP) ? filteredAP : []).filter(item => item.status === 'CLOSE').length})
            </Button>
          </div>
        </div>

        {/* Info Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          <div style={{ padding: '15px', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '1px solid #4caf50' }}>
            <div style={{ fontSize: '12px', color: '#2e7d32', marginBottom: '6px', fontWeight: '600' }}>💰 Dana Keluar (AP Close)</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1b5e20' }}>Rp {apClose.toLocaleString('id-ID')}</div>
            <div style={{ fontSize: '11px', color: '#558b2f', marginTop: '4px' }}>Sudah dibayarkan</div>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#fff3e0', borderRadius: '8px', border: '1px solid #ff9800' }}>
            <div style={{ fontSize: '12px', color: '#e65100', marginBottom: '6px', fontWeight: '600' }}>⏳ Dana Belum Keluar (AP Open)</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#bf360c' }}>Rp {apOpen.toLocaleString('id-ID')}</div>
            <div style={{ fontSize: '11px', color: '#d84315', marginTop: '4px' }}>Belum dibayarkan</div>
          </div>
        </div>

        {activeTab === 'open' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '10px', position: 'sticky', top: 0, backgroundColor: 'var(--bg-primary)', zIndex: 5, padding: '12px 0' }}>
            <Input
              type="text"
              placeholder="Search POs..."
              value={searchQuery}
              onChange={(value) => setSearchQuery(value)}
            />
            <DateRangeFilter
              onDateChange={(from, to) => {
                setDateFrom(from);
                setDateTo(to);
              }}
            />
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
            <Button variant="primary" onClick={generateMissingJournalEntries} disabled={loading} style={{ fontSize: '11px', padding: '6px 10px' }}>
              {loading ? '⏳ Generating...' : '🔧 Generate Missing'}
            </Button>
            <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
          </div>
        )}

        {activeTab === 'close' && (
          <div style={{ marginBottom: '20px', position: 'sticky', top: 0, backgroundColor: 'var(--bg-primary)', zIndex: 5, padding: '12px 0' }}>
            <Input
              type="text"
              placeholder="Search closed POs..."
              value={searchQuery}
              onChange={(value) => setSearchQuery(value)}
            />
          </div>
        )}

        {activeTab === 'open' && (
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <div>
                <strong>Total AP:</strong> Rp {totalAP.toLocaleString('id-ID')}
              </div>
              <div>
                <strong>Total POs:</strong> {filteredAP.length}
              </div>
              <div>
                <strong>Overdue:</strong> {(Array.isArray(filteredAP) ? filteredAP : []).filter(item => item.isOverdue).length}
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
            data={filteredAP}
            pageSize={10}
            showPagination={true}
            emptyMessage={activeTab === 'open' ? 'No open POs' : 'No closed POs'}
          />
        )}
      </Card>

      {/* Payment Records Modal */}
      {selectedPO && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{ width: '90%', maxWidth: '800px', maxHeight: '90vh', overflow: 'auto', backgroundColor: 'var(--bg-primary)', padding: '20px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Payment Records for PO {selectedPO.poNo}</h3>
              <Button 
                variant="secondary" 
                onClick={() => setSelectedPO(null)}
                style={{ fontSize: '12px', padding: '4px 8px' }}
              >
                ✕ Close
              </Button>
            </div>

            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', fontSize: '13px' }}>
                <div>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Supplier</div>
                  <div style={{ fontWeight: '600' }}>{selectedPO.supplierName || '-'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>SO No</div>
                  <div style={{ fontWeight: '600' }}>{selectedPO.soNo || '-'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Invoice</div>
                  <div style={{ fontWeight: '600', color: '#1976d2' }}>{selectedPO.invoiceNo || '-'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Customer</div>
                  <div style={{ fontWeight: '600', color: '#2e7d32' }}>{selectedPO.customerName || '-'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>PO Amount</div>
                  <div style={{ fontWeight: '600' }}>Rp {(selectedPO.total || 0).toLocaleString('id-ID')}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Paid</div>
                  <div style={{ fontWeight: '600', color: '#4caf50' }}>Rp {(selectedPO.paidAmount || 0).toLocaleString('id-ID')}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Balance</div>
                  <div style={{ fontWeight: '600', color: selectedPO.balance > 0 ? '#f44336' : '#4caf50' }}>Rp {(selectedPO.balance || 0).toLocaleString('id-ID')}</div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ marginTop: 0, marginBottom: '12px' }}>Payment Records ({paymentRecords.length})</h4>
              {paymentRecords.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600' }}>Payment No</th>
                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600' }}>Date</th>
                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600' }}>Invoice</th>
                        <th style={{ padding: '8px', textAlign: 'right', fontWeight: '600' }}>Amount</th>
                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600' }}>Method</th>
                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600' }}>Proof</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentRecords.map((payment: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '8px' }}>{payment.paymentNo || '-'}</td>
                          <td style={{ padding: '8px' }}>{payment.paymentDate || '-'}</td>
                          <td style={{ padding: '8px', color: '#1976d2', fontWeight: '600' }}>{payment.invoiceNo || '-'}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>Rp {(payment.amount || 0).toLocaleString('id-ID')}</td>
                          <td style={{ padding: '8px' }}>{payment.paymentMethod || '-'}</td>
                          <td style={{ padding: '8px' }}>
                            {payment.paymentProof ? (
                              <Button 
                                variant="secondary" 
                                onClick={() => {
                                  const win = window.open('', '_blank');
                                  if (win) {
                                    const src = payment.paymentProof.startsWith('data:') 
                                      ? payment.paymentProof 
                                      : `data:application/pdf;base64,${payment.paymentProof}`;
                                    win.document.write(`<iframe src="${src}" style="width:100%;height:100%;border:none;"></iframe>`);
                                  }
                                }}
                                style={{ fontSize: '10px', padding: '3px 6px' }}
                              >
                                📄 View
                              </Button>
                            ) : (
                              <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No payment records found for this PO
                </div>
              )}
            </div>

            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
              <h4 style={{ marginTop: 0, marginBottom: '12px' }}>Upload Payment Proof</h4>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600' }}>
                    Select File (PDF/Image)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          try {
                            const base64 = event.target?.result as string;
                            // Save to payments with proof
                            const payments = await storageService.get<Payment[]>('gt_payments') || [];
                            const paymentsArray = Array.isArray(payments) ? payments : [];
                            
                            const updated = paymentsArray.map((p: any) => 
                              p.poNo === selectedPO.poNo 
                                ? { ...p, paymentProof: base64, proofFileName: file.name }
                                : p
                            );
                            
                            await storageService.set(StorageKeys.GENERAL_TRADING.PAYMENTS, updated);
                            setPaymentRecords(updated.filter((p: any) => p.poNo === selectedPO.poNo));
                            
                            // Trigger CLOSE status when proof is uploaded
                            // Update financeNotifications status to CLOSE
                            const financeNotifications = await storageService.get<any[]>('gt_financeNotifications') || [];
                            const financeNotificationsArray = Array.isArray(financeNotifications) ? financeNotifications : [];
                            const updatedNotifications = financeNotificationsArray.map((n: any) =>
                              n.poNo === selectedPO.poNo && n.type === 'SUPPLIER_PAYMENT'
                                ? { ...n, status: 'CLOSE', paidAt: new Date().toISOString() }
                                : n
                            );
                            await storageService.set(StorageKeys.GENERAL_TRADING.FINANCE_NOTIFICATIONS, updatedNotifications);
                            
                            // Update purchaseOrders status to CLOSE
                            const purchaseOrders = await storageService.get<any[]>('gt_purchaseOrders') || [];
                            const purchaseOrdersArray = Array.isArray(purchaseOrders) ? purchaseOrders : [];
                            const updatedPOs = purchaseOrdersArray.map((po: any) =>
                              po.poNo === selectedPO.poNo ? { ...po, status: 'CLOSE' as const } : po
                            );
                            await storageService.set(StorageKeys.GENERAL_TRADING.PURCHASE_ORDERS, updatedPOs);
                            
                            alert('✅ Payment proof uploaded successfully\n✅ Status changed to CLOSE');
                            loadData(); // Reload to show updated status
                          } catch (error) {
                            alert('❌ Error uploading proof: ' + error);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                    }}
                  />
                </div>
                <Button 
                  variant="secondary"
                  style={{ fontSize: '11px', padding: '6px 10px' }}
                >
                  📤 Upload
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Dialog */}
      {showPaymentDialog && selectedPO && (
        <div className="dialog-overlay" onClick={() => setShowPaymentDialog(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <Card className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Record Payment</h2>
                <Button variant="secondary" onClick={() => setShowPaymentDialog(false)} style={{ padding: '6px 12px' }}>✕</Button>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>PO No</label>
                <div style={{ padding: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
                  {selectedPO.poNo}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Supplier</label>
                <div style={{ padding: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
                  {selectedPO.supplierName}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Invoice</label>
                <div style={{ padding: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', color: '#1976d2', fontWeight: '600' }}>
                  {selectedPO.invoiceNo || '-'}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Customer</label>
                <div style={{ padding: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', color: '#2e7d32', fontWeight: '600' }}>
                  {selectedPO.customerName || '-'}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>PO Amount</label>
                <div style={{ padding: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
                  Rp {selectedPO.total.toLocaleString('id-ID')}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Already Paid</label>
                <div style={{ padding: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
                  Rp {selectedPO.paidAmount.toLocaleString('id-ID')}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Remaining Balance</label>
                <div style={{ padding: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', color: '#f44336', fontWeight: '600' }}>
                  Rp {selectedPO.balance.toLocaleString('id-ID')}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Paid Amount *</label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  min="0"
                  max={selectedPO.balance}
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
                  Remaining: Rp {(selectedPO.balance - paidAmount).toLocaleString('id-ID')}
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
                <Button variant="secondary" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
                <Button variant="primary" onClick={handlePaymentSubmit}>💾 Save Payment</Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsPayable;

