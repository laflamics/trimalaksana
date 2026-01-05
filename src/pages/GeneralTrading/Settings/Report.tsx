import { useState, useEffect, useMemo } from 'react';
import { Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, PieChart, Pie, Cell } from 'recharts';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { storageService } from '../../../services/storage';
import { openPrintWindow } from '../../../utils/actions';
import '../../../styles/common.css';
import '../../../styles/compact.css';

const Report = () => {
  const [activeTab, setActiveTab] = useState<'summary' | 'comprehensive' | 'so' | 'po' | 'delivery' | 'invoice' | 'inventory'>('summary');
  const [soData, setSoData] = useState<any[]>([]);
  const [poData, setPoData] = useState<any[]>([]);
  const [deliveryData, setDeliveryData] = useState<any[]>([]);
  const [invoiceData, setInvoiceData] = useState<any[]>([]);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState<any>({});
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

  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [paymentData, setPaymentData] = useState<any[]>([]);
  
  // Format date function - format: dd/mm/yyyy hh:mm:ss
  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch {
      return '-';
    }
  };
  
  // Filtered data berdasarkan search query
  const filteredSoData = useMemo(() => {
    if (!searchQuery) return soData;
    const query = searchQuery.toLowerCase();
    return soData.filter(item => {
      const itemsMatch = item.items?.some((itm: any) => 
        (itm.productName || itm.product || '').toLowerCase().includes(query)
      );
      return (
        (item.soNo || '').toLowerCase().includes(query) ||
        (item.customer || '').toLowerCase().includes(query) ||
        (item.paymentTerms || '').toLowerCase().includes(query) ||
        (item.status || '').toLowerCase().includes(query) ||
        itemsMatch
      );
    });
  }, [soData, searchQuery]);
  
  const filteredPoData = useMemo(() => {
    if (!searchQuery) return poData;
    const query = searchQuery.toLowerCase();
    return poData.filter(item => 
      (item.poNo || '').toLowerCase().includes(query) ||
      (item.supplier || '').toLowerCase().includes(query) ||
      (item.soNo || '').toLowerCase().includes(query) ||
      (item.productItem || '').toLowerCase().includes(query) ||
      (item.status || '').toLowerCase().includes(query) ||
      String(item.qty || '').includes(query) ||
      String(item.price || '').includes(query) ||
      String(item.total || '').includes(query)
    );
  }, [poData, searchQuery]);
  
  const filteredDeliveryData = useMemo(() => {
    if (!searchQuery) return deliveryData;
    const query = searchQuery.toLowerCase();
    return deliveryData.filter(item => {
      const itemsMatch = item.items?.some((itm: any) => 
        (itm.product || '').toLowerCase().includes(query)
      );
      return (
        (item.sjNo || '').toLowerCase().includes(query) ||
        (item.soNo || '').toLowerCase().includes(query) ||
        (item.customer || '').toLowerCase().includes(query) ||
        (item.product || '').toLowerCase().includes(query) ||
        (item.status || '').toLowerCase().includes(query) ||
        String(item.qty || '').includes(query) ||
        itemsMatch
      );
    });
  }, [deliveryData, searchQuery]);
  
  const filteredInvoiceData = useMemo(() => {
    if (!searchQuery) return invoiceData;
    const query = searchQuery.toLowerCase();
    return invoiceData.filter(item => 
      (item.invoiceNo || '').toLowerCase().includes(query) ||
      (item.customer || '').toLowerCase().includes(query) ||
      (item.soNo || '').toLowerCase().includes(query) ||
      (item.status || '').toLowerCase().includes(query) ||
      String(item.totalAmount || '').includes(query)
    );
  }, [invoiceData, searchQuery]);
  
  const filteredInventoryData = useMemo(() => {
    if (!searchQuery) return inventoryData;
    const query = searchQuery.toLowerCase();
    return inventoryData.filter(item => 
      (item.codeItem || '').toLowerCase().includes(query) ||
      (item.description || '').toLowerCase().includes(query) ||
      (item.kategori || '').toLowerCase().includes(query) ||
      (item.satuan || '').toLowerCase().includes(query) ||
      String(item.price || '').includes(query) ||
      String(item.nextStock || '').includes(query)
    );
  }, [inventoryData, searchQuery]);
  

  // Calculate total inventory value by category (product & Product)
  const inventoryValueSummary = useMemo(() => {
    const isProduct = (item: any) => {
      const kategori = (item.kategori || '').toLowerCase();
      if (!kategori) return false;
      return kategori.includes('product') || kategori.includes('finished') || kategori.includes('fg');
    };

    const productItems = inventoryData.filter((item: any) => isProduct(item));

    const productValue = productItems.reduce((sum: number, item: any) => {
      const nextStock = item.nextStock || 0;
      const price = item.price || 0;
      return sum + (nextStock * price);
    }, 0);


    return {
      productValue,
      totalValue: productValue,
    };
  }, [inventoryData]);

  // Reset search saat ganti tab
  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);
  

  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'comprehensive', label: 'Comprehensive' },
    { id: 'so', label: 'SO' },
    { id: 'po', label: 'PO' },
    { id: 'delivery', label: 'Delivery' },
    { id: 'invoice', label: 'Invoice' },
    { id: 'inventory', label: 'Inventory' },
  ];

  const soColumns = [
    { 
      key: 'soNo', 
      header: 'SO No (PO Customer)',
      render: (item: any) => (
        <strong style={{ color: '#2e7d32', fontSize: '14px' }}>{item.soNo}</strong>
      ),
    },
    { 
      key: 'customer', 
      header: 'Customer',
      render: (item: any) => (
        <span style={{ color: '#ffffff' }}>{item.customer}</span>
      ),
    },
    {
      key: 'paymentTerms',
      header: 'Payment Terms',
      render: (item: any) => (
        <span>
          {item.paymentTerms || '-'}
          {item.paymentTerms === 'TOP' && item.topDays && ` (${item.topDays} days)`}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => (
        <span className={`status-badge status-${(item.status || '').toLowerCase()}`}>
          {item.status || '-'}
        </span>
      ),
    },
    { 
      key: 'created', 
      header: 'Created',
      render: (item: any) => formatDateTime(item.created)
    },
    {
      key: 'items',
      header: 'Items',
      render: (item: any) => {
        if (item.items && Array.isArray(item.items) && item.items.length > 0) {
          const itemKey = `${item.soNo || item.id}`;
          const isExpanded = expandedItems.has(itemKey);
          const hasMultiple = item.items.length > 1;
          
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {hasMultiple && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    const newExpanded = new Set(expandedItems);
                    if (isExpanded) {
                      newExpanded.delete(itemKey);
                    } else {
                      newExpanded.add(itemKey);
                    }
                    setExpandedItems(newExpanded);
                  }}
                  style={{ fontSize: '10px', padding: '2px 6px', alignSelf: 'flex-start', marginBottom: '4px' }}
                >
                  {isExpanded ? '▼ Hide' : '▶ Show'} ({item.items.length})
                </Button>
              )}
              {(!hasMultiple || isExpanded) && item.items.map((itm: any, idx: number) => (
                <div key={idx} style={{ fontSize: '12px' }}>
                  {itm.productName || itm.product} - Qty: {itm.qty || 0} - Rp {(itm.total || 0).toLocaleString('id-ID')}
                </div>
              ))}
              {hasMultiple && !isExpanded && (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  {item.items[0].productName || item.items[0].product} - Qty: {item.items[0].qty || 0} - Rp {(item.items[0].total || 0).toLocaleString('id-ID')}...
                </div>
              )}
            </div>
          );
        }
        return <span style={{ color: 'var(--text-secondary)' }}>-</span>;
      },
    },
  ];

  const poColumns = [
    { 
      key: 'poNo', 
      header: 'PO No',
      render: (item: any) => (
        <strong style={{ color: '#2e7d32', fontSize: '14px' }}>{item.poNo}</strong>
      ),
    },
    { 
      key: 'supplier', 
      header: 'Supplier',
      render: (item: any) => (
        <span style={{ color: '#ffffff' }}>{item.supplier}</span>
      ),
    },
    { 
      key: 'soNo', 
      header: 'SO No',
      render: (item: any) => (
        <strong style={{ color: '#2e7d32', fontSize: '14px' }}>{item.soNo || '-'}</strong>
      ),
    },
    {
      key: 'purchaseReason',
      header: 'Reason',
      render: (item: any) => (
        <span style={{ color: item.purchaseReason ? '#ffffff' : 'var(--text-secondary)' }}>
          {item.purchaseReason || '-'}
        </span>
      ),
    },
    { key: 'productItem', header: 'product/Item' },
    { key: 'qty', header: 'Qty' },
    {
      key: 'price',
      header: 'Price',
      render: (item: any) => `Rp ${Math.ceil(item.price || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`,
    },
    {
      key: 'total',
      header: 'Total',
      render: (item: any) => `Rp ${Math.ceil(item.total || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`,
    },
    { key: 'paymentTerms', header: 'Payment Terms' },
    {
      key: 'topDays',
      header: 'TOP Days',
      render: (item: any) => {
        if (item.paymentTerms === 'COD' || item.paymentTerms === 'CBD') {
          return '-';
        }
        return item.topDays || 0;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => (
        <span className={`status-badge status-${(item.status || '').toLowerCase()}`}>
          {item.status || '-'}
        </span>
      ),
    },
    { key: 'receiptDate', header: 'Receipt Date' },
    { 
      key: 'created', 
      header: 'Created',
      render: (item: any) => formatDateTime(item.created)
    },
  ];


  const deliveryColumns = [
    { key: 'sjNo', header: 'SJ No (Surat Jalan No)' },
    { key: 'soNo', header: 'SO No' },
    { key: 'customer', header: 'Customer' },
    {
      key: 'product',
      header: 'Product(s)',
      render: (item: any) => {
        const items = item.items && Array.isArray(item.items) && item.items.length > 0 ? item.items : [];
        const hasItems = items.length > 0;
        const displayItems = hasItems ? items : [{ product: item.product || '-', qty: item.qty || 0, unit: item.unit || 'PCS' }];
        const itemKey = `${item.sjNo || item.id}`;
        const isExpanded = expandedItems.has(itemKey);
        const hasMultiple = displayItems.length > 1;
        
        return (
          <div>
            {hasMultiple && (
              <Button
                variant="secondary"
                onClick={() => {
                  const newExpanded = new Set(expandedItems);
                  if (isExpanded) {
                    newExpanded.delete(itemKey);
                  } else {
                    newExpanded.add(itemKey);
                  }
                  setExpandedItems(newExpanded);
                }}
                style={{ fontSize: '10px', padding: '2px 6px', marginBottom: '4px' }}
              >
                {isExpanded ? '▼ Hide' : '▶ Show'} ({displayItems.length})
              </Button>
            )}
            {(!hasMultiple || isExpanded) && displayItems.map((itm: any, idx: number) => (
              <div key={idx} style={{ marginBottom: idx < displayItems.length - 1 ? '4px' : '0', fontSize: '12px' }}>
                {itm.product} ({itm.qty} {itm.unit || 'PCS'})
              </div>
            ))}
            {hasMultiple && !isExpanded && (
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                {displayItems[0].product} ({displayItems[0].qty} {displayItems[0].unit || 'PCS'})...
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'qty',
      header: 'Total Qty',
      render: (item: any) => {
        if (item.items && Array.isArray(item.items) && item.items.length > 0) {
          const totalQty = item.items.reduce((sum: number, itm: any) => sum + (itm.qty || 0), 0);
          return <div>{totalQty} PCS</div>;
        }
        return <div>{item.qty || 0} PCS</div>;
      },
    },
    {
      key: 'deliveryDate',
      header: 'Tanggal Kirim',
      render: (item: any) => {
        const dateStr = item.deliveryDate || item.created;
        if (!dateStr) return '-';
        try {
          const date = new Date(dateStr);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        } catch {
          return '-';
        }
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => (
        <span className={`status-badge status-${(item.status || '').toLowerCase()}`}>
          {item.status || '-'}
        </span>
      ),
    },
  ];

  const invoiceColumns = [
    { key: 'invoiceNo', header: 'Invoice No' },
    { key: 'invoiceDate', header: 'Invoice Date' },
    { key: 'dueDate', header: 'Due Date' },
    { key: 'customer', header: 'Customer' },
    { key: 'soNo', header: 'SO No' },
    {
      key: 'total',
      header: 'Invoice Amount',
      render: (item: any) => {
        const total = item.total || item.totalAmount || item.bom?.total || 0;
        return `Rp ${total.toLocaleString('id-ID')}`;
      },
    },
    { key: 'status', header: 'Status' },
    { 
      key: 'created', 
      header: 'Created',
      render: (item: any) => formatDateTime(item.created || item.invoiceDate)
    },
  ];

  const inventoryColumns = [
    { 
      key: 'supplierName', 
      header: 'Supplier/Customer Name',
    },
    { key: 'codeItem', header: 'CODE item' },
    { key: 'description', header: 'DESCRIPTION/Nama Item' },
    { key: 'kategori', header: 'Kategori' },
    { key: 'satuan', header: 'Satuan/UOM' },
    {
      key: 'price',
      header: 'PRICE',
      render: (item: any) => `Rp ${(item.price || 0).toLocaleString('id-ID')}`,
    },
    {
      key: 'stockPremonth',
      header: 'STOCK/Premonth',
      render: (item: any) => (item.stockPremonth || 0).toLocaleString('id-ID'),
    },
    {
      key: 'receive',
      header: 'Receive',
      render: (item: any) => (item.receive || 0).toLocaleString('id-ID'),
    },
    {
      key: 'outgoing',
      header: 'Outgoing',
      render: (item: any) => (item.outgoing || 0).toLocaleString('id-ID'),
    },
    {
      key: 'return',
      header: 'Return',
      render: (item: any) => (item.return || 0).toLocaleString('id-ID'),
    },
    {
      key: 'nextStock',
      header: 'Next Stock',
      render: (item: any) => {
        const nextStock = (item.stockPremonth || 0) + (item.receive || 0) - (item.outgoing || 0) + (item.return || 0);
        return (
          <span style={{ fontWeight: 'bold', color: nextStock < 0 ? '#f44336' : 'var(--text-primary)' }}>
            {nextStock.toLocaleString('id-ID')}
          </span>
        );
      },
    },
    { 
      key: 'lastUpdate', 
      header: 'Last Update',
      render: (item: any) => formatDateTime(item.lastUpdate)
    },
  ];


  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      // Load SO data - GT menggunakan gt_salesOrders
      const salesOrders = await storageService.get<any[]>('gt_salesOrders') || [];
      setSoData(salesOrders);

      // Load PO data - GT menggunakan gt_purchaseOrders
      const purchaseOrders = await storageService.get<any[]>('gt_purchaseOrders') || [];
      setPoData(purchaseOrders);

      // Load Delivery data - GT menggunakan gt_delivery
      const delivery = await storageService.get<any[]>('gt_delivery') || [];
      setDeliveryData(delivery);

      // Load Invoice data - GT menggunakan gt_invoices
      const invoices = await storageService.get<any[]>('gt_invoices') || [];
      setInvoiceData(invoices);

      // Load Payment data - GT menggunakan gt_payments
      const paymentRecords = await storageService.get<any[]>('gt_payments') || [];
      setPaymentData(paymentRecords);

      // Load Inventory data - GT menggunakan gt_inventory
      const inventoryData = await storageService.get<any[]>('gt_inventory') || [];
      setInventoryData(inventoryData);

      // Load Financial data - GT menggunakan gt_journalEntries dan gt_accounts
      const entries = await storageService.get<any[]>('gt_journalEntries') || [];
      const accs = await storageService.get<any[]>('gt_accounts') || [];
      setJournalEntries(entries);
      setAccounts(accs);

    // Calculate Financial Summary from Journal Entries
    const balances: Record<string, { debit: number; credit: number; balance: number }> = {};
    const filteredEntries = (entries || []).filter((e: any) => {
      if (!dateTo) return true;
      const entryDate = new Date(e.entryDate);
      const to = new Date(dateTo);
      return entryDate <= to;
    });
    
    filteredEntries.forEach((entry: any) => {
      if (!balances[entry.account]) {
        balances[entry.account] = { debit: 0, credit: 0, balance: 0 };
      }
      balances[entry.account].debit += entry.debit || 0;
      balances[entry.account].credit += entry.credit || 0;
    });
    
    (accs || []).forEach(acc => {
      if (!balances[acc.code]) {
        balances[acc.code] = { debit: 0, credit: 0, balance: 0 };
      }
      if (acc.type === 'Asset' || acc.type === 'Expense') {
        balances[acc.code].balance = balances[acc.code].debit - balances[acc.code].credit;
      } else {
        balances[acc.code].balance = balances[acc.code].credit - balances[acc.code].debit;
      }
    });

    // Calculate Summary
    const totalSO = salesOrders.length;
    const totalPO = purchaseOrders.length;
    const totalProduction = 0; // GT tidak ada production
    const totalDelivery = delivery.length;
    const totalInvoice = invoices.length;
    
    // Revenue = Total dari Invoice Data
    const totalRevenue = invoices.reduce((sum, inv) => {
      const invTotal = inv.total || inv.totalAmount || inv.bom?.total || 0;
      return sum + invTotal;
    }, 0);
    
    // Expenses = Payment Supplier + Salary Staff + Expense Accounts dari Journal Entries
    // paymentRecords sudah di-load di atas
    const supplierPayments = paymentRecords
      .filter((p: any) => p.type === 'Payment')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    
    // Salary Staff - dari staff data atau payroll
    const staffData = await storageService.get<any[]>('staff') || [];
    const totalSalary = staffData.reduce((sum: number, s: any) => {
      const salary = s['GAJI POKOK'] || s.salary || s.gaji || 0;
      return sum + (typeof salary === 'string' ? parseFloat(salary.replace(/[^\d.-]/g, '')) || 0 : salary);
    }, 0);
    
    // Expense Accounts dari Journal Entries (COA type Expense)
    const expenseAccounts = (accs || []).filter(a => a.type === 'Expense');
    const expenseFromCOA = expenseAccounts.reduce((sum, acc) => {
      const accBalance = balances[acc.code]?.balance || 0;
      return sum + Math.abs(accBalance); // Expense biasanya negative, jadi pakai abs
    }, 0);
    
    // Total Expenses = Payment Supplier + Salary + Expense COA
    const totalExpenses = supplierPayments + totalSalary + expenseFromCOA;
    
    const totalPOAmount = purchaseOrders.reduce((sum, po) => sum + (po.total || 0), 0);
    
    // Financial data from COA
    const cash = balances['1000']?.balance || 0;
    const accountsReceivable = balances['1100']?.balance || 0;
    const inventory = balances['1200']?.balance || 0;
    const fixedAssets = balances['1300']?.balance || 0;
    const accountsPayable = balances['2000']?.balance || 0;
    
    // Revenue dan Expenses untuk display
    const revenue = totalRevenue;
    const expenses = totalExpenses;
    const netProfit = revenue - expenses;
    const totalAssets = cash + accountsReceivable + inventory + fixedAssets;
    const totalLiabilities = accountsPayable;
    const totalEquity = (accs || []).filter(a => a.type === 'Equity').reduce((sum, acc) => {
      let balance = balances[acc.code]?.balance || 0;
      if (acc.code === '3100') {
        balance = balance + netProfit; // Retained Earnings
      }
      return sum + balance;
    }, 0);
    
    // Calculate Outstanding (status OPEN)
    const outstandingSO = salesOrders.filter(so => so.status === 'OPEN').length;
    const outstandingPO = purchaseOrders.filter(po => po.status === 'OPEN').length;
    const outstandingProduction = 0; // GT tidak ada production
    const outstandingDelivery = delivery.filter(d => d.status === 'OPEN' || d.status === 'DRAFT').length;
    const outstandingInvoice = invoices.filter(inv => inv.status === 'OPEN').length;
    
    setSummaryData({
      totalSO,
      totalPO,
      totalProduction,
      totalDelivery,
      totalInvoice,
      totalRevenue,
      totalPOAmount,
      profit: netProfit,
      outstandingSO,
      outstandingPO,
      outstandingProduction,
      outstandingDelivery,
      outstandingInvoice,
      // Financial data
      cash,
      accountsReceivable,
      inventory,
      fixedAssets,
      accountsPayable,
      revenue, // Revenue dari Invoice Data
      expenses, // Expenses dari Payment Supplier + Salary Staff + Expense COA
      netProfit,
      totalAssets,
      totalLiabilities,
      totalEquity,
      // Breakdown untuk debugging
      supplierPayments,
      totalSalary,
      expenseFromCOA,
    });
    } catch (error: any) {
      console.error('Error loading report data:', error);
      showAlert('Error', `Error loading report data: ${error.message || 'Something went wrong'}`);
      // Set empty data untuk prevent crash
      setSoData([]);
      setPoData([]);
      setDeliveryData([]);
      setInvoiceData([]);
      setInventoryData([]);
      setJournalEntries([]);
      setAccounts([]);
      setSummaryData({});
    }
  };

  // Chart data for summary
  const chartData = useMemo(() => {
    if (!dateFrom || !dateTo) return [];
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    const data: any[] = [];
    let currentDate = new Date(fromDate);
    while (currentDate <= toDate) {
      const monthKey = currentDate.toLocaleDateString('en-US', { month: 'short' });
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const monthEntries = (journalEntries || []).filter((e: any) => {
        const entryDate = new Date(e.entryDate);
        return entryDate <= monthEnd;
      });
      const monthBalances: Record<string, { debit: number; credit: number; balance: number }> = {};
      monthEntries.forEach((entry: any) => {
        if (!monthBalances[entry.account]) {
          monthBalances[entry.account] = { debit: 0, credit: 0, balance: 0 };
        }
        monthBalances[entry.account].debit += entry.debit || 0;
        monthBalances[entry.account].credit += entry.credit || 0;
      });
      (accounts || []).forEach((acc: any) => {
        if (!monthBalances[acc.code]) {
          monthBalances[acc.code] = { debit: 0, credit: 0, balance: 0 };
        }
        if (acc.type === 'Asset' || acc.type === 'Expense') {
          monthBalances[acc.code].balance = monthBalances[acc.code].debit - monthBalances[acc.code].credit;
        } else {
          monthBalances[acc.code].balance = monthBalances[acc.code].credit - monthBalances[acc.code].debit;
        }
      });
      const totalAssets = (accounts || []).filter((a: any) => a.type === 'Asset').reduce((sum: number, acc: any) => sum + (monthBalances[acc.code]?.balance || 0), 0);
      data.push({ month: monthKey, value: Math.max(0, totalAssets) });
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    }
    return data;
  }, [journalEntries, accounts, dateFrom, dateTo]);

  // Generate HTML untuk export PDF seluruh data report
  const generateReportHtml = useMemo(() => {
    return (): string => {
    try {
    const formatDate = (dateString: string | undefined) => {
      if (!dateString) return '-';
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      } catch {
        return '-';
      }
    };

    const formatCurrency = (value: number) => {
      return `Rp ${(value || 0).toLocaleString('id-ID')}`;
    };

    const generateTableHtml = (data: any[], columns: any[], title: string) => {
      if (!data || data.length === 0) {
        return `<h3>${title}</h3><p>No data available</p>`;
      }

      let html = `<h3 style="margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #333; padding-bottom: 5px;">${title}</h3>`;
      html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px;">`;
      html += `<thead><tr style="background-color: #f0f0f0;">`;
      columns.forEach(col => {
        html += `<th style="border: 1px solid #ddd; padding: 6px; text-align: left; font-weight: bold;">${col.header || col.key}</th>`;
      });
      html += `</tr></thead><tbody>`;
      
      data.forEach((item, idx) => {
        html += `<tr style="background-color: ${idx % 2 === 0 ? '#fff' : '#f9f9f9'};">`;
        columns.forEach(col => {
          let value = '';
          if (col.render) {
            try {
              // Try to extract value from render function
              if (col.key === 'items' && item.items && Array.isArray(item.items)) {
                value = item.items.map((itm: any) => 
                  `${itm.productName || itm.product || '-'} - Qty: ${itm.qty || 0} - Rp ${(itm.total || 0).toLocaleString('id-ID')}`
                ).join('; ');
              } else if (col.key === 'productionDetails') {
                value = `${item.productName || item.product || '-'} | Target: ${item.target || 0} | Progress: ${item.progress || 0} | Remaining: ${item.remaining || 0}`;
              } else if (col.key === 'product' && item.items && Array.isArray(item.items)) {
                value = item.items.map((itm: any) => 
                  `${itm.product} (${itm.qty} ${itm.unit || 'PCS'})`
                ).join('; ');
              } else if (col.key === 'qty' && item.items && Array.isArray(item.items)) {
                const totalQty = item.items.reduce((sum: number, itm: any) => sum + (itm.qty || 0), 0);
                value = `${totalQty} PCS`;
              } else {
                // Fallback: try to get value directly
                const rawValue = item[col.key];
                if (typeof rawValue === 'number') {
                  value = rawValue.toLocaleString('id-ID');
                } else {
                  value = rawValue || '-';
                }
              }
            } catch (e) {
              const rawValue = item[col.key];
              value = rawValue || '-';
            }
          } else {
            const rawValue = item[col.key];
            if (typeof rawValue === 'number') {
              value = rawValue.toLocaleString('id-ID');
            } else {
              value = rawValue || '-';
            }
          }
          // Escape HTML
          value = String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;');
          html += `<td style="border: 1px solid #ddd; padding: 6px;">${value}</td>`;
        });
        html += `</tr>`;
      });
      
      html += `</tbody></table>`;
      return html;
    };

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Complete Report - ${new Date().toLocaleDateString('id-ID')}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
            font-size: 11px;
          }
          h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          h2 {
            color: #34495e;
            margin-top: 30px;
            margin-bottom: 15px;
            border-left: 4px solid #3498db;
            padding-left: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #3498db;
            color: white;
            font-weight: bold;
          }
          .summary-box {
            background-color: #ecf0f1;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          .summary-item {
            display: inline-block;
            margin: 5px 15px 5px 0;
            padding: 8px 12px;
            background-color: white;
            border-radius: 3px;
            border-left: 3px solid #3498db;
          }
          .summary-label {
            font-size: 9px;
            color: #7f8c8d;
            display: block;
          }
          .summary-value {
            font-size: 14px;
            font-weight: bold;
            color: #2c3e50;
          }
          @media print {
            body { margin: 0; }
            .page-break { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        <h1>COMPLETE REPORT</h1>
        <p style="color: #7f8c8d; margin-bottom: 20px;">
          Generated on: ${new Date().toLocaleString('id-ID')} | 
          Period: ${formatDate(dateFrom)} - ${formatDate(dateTo)}
        </p>
    `;

    // Summary Section
    html += `
      <div class="summary-box">
        <h2 style="margin-top: 0;">SUMMARY</h2>
        <div class="summary-item">
          <span class="summary-label">Total Sales Orders</span>
          <span class="summary-value">${summaryData.totalSO || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Total Purchase Orders</span>
          <span class="summary-value">${summaryData.totalPO || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Total Delivery</span>
          <span class="summary-value">${summaryData.totalDelivery || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Total Invoice</span>
          <span class="summary-value">${summaryData.totalInvoice || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Revenue</span>
          <span class="summary-value">${formatCurrency(summaryData.revenue || 0)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Expenses</span>
          <span class="summary-value">${formatCurrency(summaryData.expenses || 0)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Net Profit</span>
          <span class="summary-value">${formatCurrency(summaryData.netProfit || 0)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Inventory product Value</span>
          <span class="summary-value">${formatCurrency(inventoryValueSummary?.productValue || 0)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Inventory Product Value</span>
          <span class="summary-value">${formatCurrency(inventoryValueSummary?.productValue || 0)}</span>
        </div>
      </div>
    `;

    // Sales Orders
    html += generateTableHtml(filteredSoData, soColumns, 'SALES ORDERS');

    // Purchase Orders
    html += generateTableHtml(filteredPoData, poColumns, 'PURCHASE ORDERS');

    // Delivery
    html += generateTableHtml(filteredDeliveryData, deliveryColumns, 'DELIVERY NOTES');

    // Invoice
    html += generateTableHtml(filteredInvoiceData, invoiceColumns, 'INVOICES');

    // Inventory - products
    const productInventory = filteredInventoryData.filter((item: any) => {
      const kategori = (item.kategori || '').toLowerCase();
      return kategori.includes('product') || kategori === '' || !item.kategori;
    });
    html += generateTableHtml(productInventory, inventoryColumns, 'INVENTORY - productS');

    html += `
      </body>
      </html>
    `;

      return html;
    } catch (error: any) {
      console.error('Error generating report HTML:', error);
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Report Error</title>
        </head>
        <body>
          <h1>Error Generating Report</h1>
          <p>${error.message || 'Something went wrong while generating the report.'}</p>
          <p>Please check the console for more details.</p>
        </body>
        </html>
      `;
    }
    };
  }, [filteredSoData, filteredPoData, filteredDeliveryData, filteredInvoiceData, filteredInventoryData, soColumns, poColumns, deliveryColumns, invoiceColumns, inventoryColumns, summaryData, inventoryValueSummary, dateFrom, dateTo, formatDateTime]);

  const handleSaveToPDF = async () => {
    try {
      const html = generateReportHtml();
      if (!html || html.trim() === '') {
        showAlert('Error', 'Failed to generate report HTML. Please try again.');
        return;
      }
      
      const electronAPI = (window as any).electronAPI;
      const fileName = `Complete_Report_${new Date().toISOString().split('T')[0]}.pdf`;

      if (electronAPI && typeof electronAPI.savePdf === 'function') {
        const result = await electronAPI.savePdf(html, fileName);
        if (result.success) {
          showAlert(`✅ PDF berhasil disimpan ke:\n${result.path}`, 'Success');
        } else if (!result.canceled) {
          showAlert(`❌ Error saving PDF: ${result.error || 'Unknown error'}`, 'Error');
        }
      } else {
        // Browser: Open print dialog, user can select "Save as PDF"
        openPrintWindow(html, { autoPrint: false });
      }
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      showAlert('Error', `Error generating PDF: ${error.message || 'Something went wrong'}`);
    }
  };

  return (
    <div className="module-compact">
      <div className="page-header">
        <h1>Report Module</h1>
        <Button
          variant="primary"
          onClick={handleSaveToPDF}
          style={{ padding: '8px 16px', fontSize: '14px' }}
        >
          💾 Save to PDF
        </Button>
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
          {activeTab === 'summary' && (
            <div style={{ padding: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '16px', margin: 0 }}>Summary Report</h2>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(value) => setDateFrom(value)}
                  />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(value) => setDateTo(value)}
                  />
                  <Button onClick={loadAllData} style={{ padding: '4px 12px', fontSize: '12px' }}>🔄 Refresh</Button>
                </div>
              </div>

              {/* Charts & Financial Section */}
              <div className="report-charts-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                {/* Chart Card - Left */}
                <Card style={{ padding: '8px' }}>
                  <div style={{ 
                    padding: '8px', 
                    backgroundColor: '#0a0e27', 
                    borderRadius: '6px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                    marginBottom: '8px'
                  }}>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorSummary" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="month" stroke="#94a3b8" style={{ fontSize: '10px' }} />
                        <YAxis stroke="#94a3b8" style={{ fontSize: '10px' }} tickFormatter={(value) => value.toLocaleString('id-ID')} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#f1f5f9', fontSize: '11px' }}
                          formatter={(value: any) => [`Rp ${value.toLocaleString('id-ID')}`, 'Total Assets']}
                        />
                        <Area type="monotone" dataKey="value" stroke="#14b8a6" strokeWidth={2} fillOpacity={1} fill="url(#colorSummary)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Pie Chart - Assets Breakdown */}
                  <div style={{ 
                    padding: '8px', 
                    backgroundColor: '#0a0e27', 
                    borderRadius: '6px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                  }}>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Cash', value: Math.abs(summaryData.cash || 0) },
                            { name: 'AR', value: Math.abs(summaryData.accountsReceivable || 0) },
                            { name: 'Inventory', value: Math.abs(summaryData.inventory || 0) },
                            { name: 'Fixed Assets', value: Math.abs(summaryData.fixedAssets || 0) }
                          ].filter(item => item.value !== 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#14b8a6" />
                          <Cell fill="#3b82f6" />
                          <Cell fill="#8b5cf6" />
                          <Cell fill="#ec4899" />
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#f1f5f9', fontSize: '11px' }}
                          formatter={(value: any) => `Rp ${value.toLocaleString('id-ID')}`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Financial Summary Card - Right */}
                <Card style={{ padding: '8px' }}>
                  {/* Profit & Loss */}
                  <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '6px', fontSize: '11px', fontWeight: '600' }}>PROFIT & LOSS</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border-color)', fontSize: '10px' }}>
                    <span>Revenue</span>
                    <span style={{ fontWeight: '600', fontSize: '9px', color: 'var(--success)' }}>Rp {(summaryData.revenue || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border-color)', fontSize: '10px' }}>
                    <span>Expenses</span>
                    <span style={{ fontWeight: '600', fontSize: '9px', color: 'var(--warning)' }}>Rp {(summaryData.expenses || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', marginTop: '4px', marginBottom: '8px', borderTop: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '11px' }}>
                    <span>Net Profit</span>
                    <span style={{ color: (summaryData.netProfit || 0) >= 0 ? 'var(--success)' : 'var(--error)' }}>
                      Rp {(summaryData.netProfit || 0).toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* Assets & Liabilities */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                    {/* Assets */}
                    <div>
                      <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '6px', fontSize: '11px', fontWeight: '600' }}>ASSETS</h4>
                      {(summaryData.cash || 0) !== 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border-color)', fontSize: '10px' }}>
                          <span>Cash</span>
                          <span style={{ fontWeight: '600', fontSize: '9px' }}>Rp {(summaryData.cash || 0).toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      {(summaryData.accountsReceivable || 0) !== 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border-color)', fontSize: '10px' }}>
                          <span>AR</span>
                          <span style={{ fontWeight: '600', fontSize: '9px' }}>Rp {(summaryData.accountsReceivable || 0).toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      {(summaryData.inventory || 0) !== 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border-color)', fontSize: '10px' }}>
                          <span>Inventory</span>
                          <span style={{ fontWeight: '600', fontSize: '9px' }}>Rp {(summaryData.inventory || 0).toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      {(summaryData.fixedAssets || 0) !== 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border-color)', fontSize: '10px' }}>
                          <span>Fixed Assets</span>
                          <span style={{ fontWeight: '600', fontSize: '9px' }}>Rp {(summaryData.fixedAssets || 0).toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', marginTop: '4px', borderTop: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '11px' }}>
                        <span>Total Assets</span>
                        <span>Rp {(summaryData.totalAssets || 0).toLocaleString('id-ID')}</span>
                      </div>
                    </div>

                    {/* Liabilities & Equity */}
                    <div>
                      <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '6px', fontSize: '11px', fontWeight: '600' }}>LIABILITIES</h4>
                      {(summaryData.accountsPayable || 0) !== 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border-color)', fontSize: '10px' }}>
                          <span>AP</span>
                          <span style={{ fontWeight: '600', fontSize: '9px' }}>Rp {(summaryData.accountsPayable || 0).toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', marginTop: '4px', borderTop: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '11px' }}>
                        <span>Total Liabilities</span>
                        <span>Rp {(summaryData.totalLiabilities || 0).toLocaleString('id-ID')}</span>
                      </div>
                      
                      <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginTop: '12px', marginBottom: '6px', fontSize: '11px', fontWeight: '600' }}>EQUITY</h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', marginTop: '4px', borderTop: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '11px' }}>
                        <span>Total Equity</span>
                        <span>Rp {(summaryData.totalEquity || 0).toLocaleString('id-ID')}</span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', marginTop: '8px', borderTop: '2px solid var(--accent-color)', fontWeight: 'bold', fontSize: '12px' }}>
                        <span>Total L&E</span>
                        <span>Rp {((summaryData.totalLiabilities || 0) + (summaryData.totalEquity || 0)).toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Operational Summary Cards */}
              <div className="report-summary-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
                <Card style={{ padding: '8px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary)' }}>{summaryData.totalSO || 0}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginTop: '2px' }}>Sales Orders</div>
                  <div style={{ marginTop: '4px', fontSize: '9px', color: 'var(--warning)' }}>Outstanding: {summaryData.outstandingSO || 0}</div>
                </Card>
                <Card style={{ padding: '8px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary)' }}>{summaryData.totalPO || 0}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginTop: '2px' }}>Purchase Orders</div>
                  <div style={{ marginTop: '4px', fontSize: '9px', color: 'var(--warning)' }}>Outstanding: {summaryData.outstandingPO || 0}</div>
                </Card>
                <Card style={{ padding: '8px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary)' }}>{summaryData.totalDelivery || 0}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginTop: '2px' }}>Delivery Notes</div>
                  <div style={{ marginTop: '4px', fontSize: '9px', color: 'var(--warning)' }}>Outstanding: {summaryData.outstandingDelivery || 0}</div>
                </Card>
                <Card style={{ padding: '8px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary)' }}>{summaryData.totalInvoice || 0}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginTop: '2px' }}>Invoices</div>
                  <div style={{ marginTop: '4px', fontSize: '9px', color: 'var(--warning)' }}>Outstanding: {summaryData.outstandingInvoice || 0}</div>
                </Card>
                <Card style={{ padding: '8px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--success)' }}>Rp {(summaryData.revenue || 0).toLocaleString('id-ID')}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginTop: '2px' }}>Revenue</div>
                </Card>
                <Card style={{ padding: '8px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--warning)' }}>Rp {(summaryData.expenses || 0).toLocaleString('id-ID')}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginTop: '2px' }}>Expenses</div>
                </Card>
                {/* Inventory Value Cards */}
                <Card style={{ padding: '8px', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#3b82f6' }}>Rp {inventoryValueSummary.productValue.toLocaleString('id-ID')}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginTop: '2px' }}>Inventory product</div>
                  <div style={{ marginTop: '4px', fontSize: '9px', color: 'var(--text-secondary)' }}>Total Nilai (Next Stock)</div>
                </Card>
                <Card style={{ padding: '8px', backgroundColor: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#8b5cf6' }}>Rp {inventoryValueSummary.productValue.toLocaleString('id-ID')}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginTop: '2px' }}>Inventory Product</div>
                  <div style={{ marginTop: '4px', fontSize: '9px', color: 'var(--text-secondary)' }}>Total Nilai (Next Stock)</div>
                </Card>
                <Card style={{ padding: '8px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: (summaryData.netProfit || 0) >= 0 ? 'var(--success)' : 'var(--error)' }}>
                    Rp {(summaryData.netProfit || 0).toLocaleString('id-ID')}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginTop: '2px' }}>Net Profit</div>
                  <div style={{ marginTop: '4px', fontSize: '9px', color: 'var(--accent-color)' }}>
                    Margin: {summaryData.revenue && summaryData.revenue > 0 
                      ? `${((summaryData.netProfit || 0) / summaryData.revenue * 100).toFixed(2)}%` 
                      : '0.00%'}
                  </div>
                </Card>
              </div>
            </div>
          )}
          {activeTab === 'comprehensive' && (
            <div style={{ padding: '8px' }}>
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ fontSize: '16px', margin: 0 }}>Comprehensive Report</h2>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <Input
                  label="Search & Filter"
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search by Payment No, Invoice No, Supplier, Customer, Amount..."
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Card style={{ padding: '8px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>Payment Supplier ({paymentData.filter((p: any) => p.type === 'Payment').length})</h3>
                  <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                    <Table 
                      columns={[
                        { key: 'paymentNo', header: 'Payment No' },
                        { key: 'paymentDate', header: 'Date' },
                        { key: 'supplierName', header: 'Supplier' },
                        { key: 'poNo', header: 'PO No' },
                        {
                          key: 'amount',
                          header: 'Amount',
                          render: (item: any) => `Rp ${(item.amount || 0).toLocaleString('id-ID')}`,
                        },
                        { key: 'paymentMethod', header: 'Method' },
                      ]} 
                      data={paymentData.filter((p: any) => {
                        if (p.type !== 'Payment') return false;
                        if (!searchQuery) return true;
                        const query = searchQuery.toLowerCase();
                        return (
                          (p.paymentNo || '').toLowerCase().includes(query) ||
                          (p.supplierName || '').toLowerCase().includes(query) ||
                          (p.poNo || p.purchaseOrderNo || '').toLowerCase().includes(query) ||
                          String(p.amount || '').includes(query)
                        );
                      })} 
                      emptyMessage="No Payment Supplier data" 
                    />
                  </div>
                </Card>
                <Card style={{ padding: '8px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>Invoices ({invoiceData.length})</h3>
                  <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                    <Table 
                      columns={invoiceColumns} 
                      data={filteredInvoiceData} 
                      emptyMessage="No Invoice data" 
                    />
                  </div>
                </Card>
              </div>
            </div>
          )}
          {activeTab === 'so' && (
            <div style={{ padding: '8px' }}>
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ fontSize: '16px', margin: 0 }}>Sales Orders Report</h2>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Total: {soData.length} | Outstanding: {soData.filter(item => item.status === 'OPEN').length}
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <Input
                  label="Search & Filter"
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search by SO No, Customer, Product, Status..."
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Card style={{ padding: '8px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>All Sales Orders ({filteredSoData.length})</h3>
                  <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                    <Table columns={soColumns} data={filteredSoData} emptyMessage={searchQuery ? "No SO data found" : "No SO report data"} />
                  </div>
                </Card>
                <Card style={{ padding: '8px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>Outstanding ({filteredSoData.filter(item => item.status === 'OPEN').length})</h3>
                  <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                    <Table columns={soColumns} data={filteredSoData.filter(item => item.status === 'OPEN')} emptyMessage="No outstanding SO data" />
                  </div>
                </Card>
              </div>
            </div>
          )}
          {activeTab === 'po' && (
            <div style={{ padding: '8px' }}>
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ fontSize: '16px', margin: 0 }}>Purchase Orders Report</h2>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Total: {poData.length} | Outstanding: {poData.filter(item => item.status === 'OPEN').length}
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <Input
                  label="Search & Filter"
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search by PO No, Supplier, SO No, product, Status..."
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Card style={{ padding: '8px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>All Purchase Orders ({filteredPoData.length})</h3>
                  <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                    <Table columns={poColumns} data={filteredPoData} emptyMessage={searchQuery ? "No PO data found" : "No PO report data"} />
                  </div>
                </Card>
                <Card style={{ padding: '8px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>Outstanding ({filteredPoData.filter(item => item.status === 'OPEN').length})</h3>
                  <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                    <Table columns={poColumns} data={filteredPoData.filter(item => item.status === 'OPEN')} emptyMessage="No outstanding PO data" />
                  </div>
                </Card>
              </div>
            </div>
          )}
          {activeTab === 'delivery' && (
            <div style={{ padding: '8px' }}>
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ fontSize: '16px', margin: 0 }}>Delivery Report</h2>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Total: {deliveryData.length} | Outstanding: {deliveryData.filter(item => item.status === 'OPEN').length}
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <Input
                  label="Search & Filter"
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search by SJ No, SO No, Customer, Product, Status, Qty..."
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Card style={{ padding: '8px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>All Delivery ({filteredDeliveryData.length})</h3>
                  <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                    <Table columns={deliveryColumns} data={filteredDeliveryData} emptyMessage={searchQuery ? "No Delivery data found" : "No Delivery report data"} />
                  </div>
                </Card>
                <Card style={{ padding: '8px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>Outstanding ({filteredDeliveryData.filter(item => item.status === 'OPEN').length})</h3>
                  <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                    <Table columns={deliveryColumns} data={filteredDeliveryData.filter(item => item.status === 'OPEN')} emptyMessage="No outstanding Delivery data" />
                  </div>
                </Card>
              </div>
            </div>
          )}
          {activeTab === 'invoice' && (
            <div style={{ padding: '8px' }}>
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ fontSize: '16px', margin: 0 }}>Invoice Report</h2>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Total: {invoiceData.length} | Outstanding: {invoiceData.filter(item => item.status === 'OPEN').length}
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <Input
                  label="Search & Filter"
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search by Invoice No, Customer, SO No, Status, Total..."
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Card style={{ padding: '8px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>All Invoices ({filteredInvoiceData.length})</h3>
                  <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                    <Table columns={invoiceColumns} data={filteredInvoiceData} emptyMessage={searchQuery ? "No Invoice data found" : "No Invoice report data"} />
                  </div>
                </Card>
                <Card style={{ padding: '8px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>Outstanding ({filteredInvoiceData.filter(item => item.status === 'OPEN').length})</h3>
                  <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                    <Table columns={invoiceColumns} data={filteredInvoiceData.filter(item => item.status === 'OPEN')} emptyMessage="No outstanding Invoice data" />
                  </div>
                </Card>
              </div>
            </div>
          )}
          {activeTab === 'inventory' && (
            <div style={{ padding: '8px' }}>
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ fontSize: '16px', margin: 0 }}>Inventory Report</h2>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <Input
                  label="Search & Filter"
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search by Code, Description, Category, Unit, Price, Stock..."
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Card style={{ padding: '8px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>products</h3>
                  <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                    <Table 
                      columns={inventoryColumns.map(col => ({
                        ...col,
                        header: col.key === 'supplierName' ? 'Supplier Name' : col.header
                      }))} 
                      data={filteredInventoryData.filter((item: any) => {
                        const kategori = (item.kategori || '').toLowerCase();
                        return kategori.includes('product') || kategori === '' || !item.kategori;
                      })} 
                      emptyMessage="No product data" 
                    />
                  </div>
                </Card>
                <Card style={{ padding: '8px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>Products</h3>
                  <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                    <Table 
                      columns={inventoryColumns.map(col => ({
                        ...col,
                        header: col.key === 'supplierName' ? 'Customer Name' : col.header
                      }))} 
                      data={filteredInventoryData.filter((item: any) => {
                        const kategori = (item.kategori || '').toLowerCase();
                        return kategori.includes('product') || kategori.includes('produk');
                      })} 
                      emptyMessage="No Product data" 
                    />
                  </div>
                </Card>
              </div>
            </div>
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

export default Report;
