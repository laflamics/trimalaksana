import { useState, useEffect } from 'react';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import { storageService } from '../../../services/storage';
import { filterActiveItems } from '../../../utils/data-persistence-helper';
import '../../../styles/common.css';
import '../../../styles/compact.css';

const DBActivity = () => {
  const [activeSection, setActiveSection] = useState<string>('vehicles');
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string>('');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState<string>('');
  const [clearLoading, setClearLoading] = useState(false);
  const [clearMessage, setClearMessage] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(50);
  
  // Custom dialog state
  const [dialogState, setDialogState] = useState<{
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
  
  // Clear dialog state with checkboxes
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [dataCounts, setDataCounts] = useState<Record<string, number>>({});
  
  // Seed dialog state
  const [showSeedDialog, setShowSeedDialog] = useState(false);

  const showAlert = (message: string, title: string = 'Information') => {
    setDialogState({
      show: true,
      type: 'alert',
      title,
      message,
    });
  };

  const closeDialog = () => {
    setDialogState({
      show: false,
      type: 'alert',
      title: '',
      message: '',
    });
  };

  const sections = [
    // Master Data
    { id: 'vehicles', label: 'Vehicles', category: 'Master Data' },
    { id: 'drivers', label: 'Drivers', category: 'Master Data' },
    { id: 'routes', label: 'Routes', category: 'Master Data' },
    { id: 'customers', label: 'Customers', category: 'Master Data' },
    // Operations
    { id: 'delivery-orders', label: 'Delivery Orders', category: 'Operations' },
    { id: 'unit-schedules', label: 'Unit Schedules', category: 'Operations' },
    { id: 'petty-cash', label: 'Petty Cash', category: 'Operations' },
    { id: 'surat-jalan', label: 'Surat Jalan', category: 'Operations' },
    // Finance
    { id: 'coa', label: 'Chart of Accounts', category: 'Finance' },
    { id: 'journal-entries', label: 'Journal Entries', category: 'Finance' },
    { id: 'accounting', label: 'Accounting', category: 'Finance' },
    { id: 'general-ledger', label: 'General Ledger', category: 'Finance' },
    { id: 'financial-reports', label: 'Financial Reports', category: 'Finance' },
    { id: 'invoices', label: 'Invoices', category: 'Finance' },
    { id: 'payments', label: 'Payments', category: 'Finance' },
    { id: 'accounts-receivable', label: 'Accounts Receivable', category: 'Finance' },
    { id: 'accounts-payable', label: 'Accounts Payable', category: 'Finance' },
    { id: 'tax-management', label: 'Tax Management', category: 'Finance' },
    { id: 'cost-analysis', label: 'Cost Analysis', category: 'Finance' },
    // Notifications
    { id: 'notifications', label: 'Notifications', category: 'Notifications' },
    // System
    { id: 'audit', label: 'Audit Logs', category: 'System' },
  ];

  const vehicleColumns = [
    { key: 'id', header: 'ID' },
    { key: 'vehicleNo', header: 'Vehicle No' },
    { key: 'licensePlate', header: 'License Plate' },
    { key: 'vehicleType', header: 'Type' },
    { key: 'brand', header: 'Brand' },
    { key: 'model', header: 'Model' },
    { key: 'status', header: 'Status' },
  ];

  const driverColumns = [
    { key: 'id', header: 'ID' },
    { key: 'driverCode', header: 'Driver Code' },
    { key: 'name', header: 'Name' },
    { key: 'licenseNo', header: 'License No' },
    { key: 'phone', header: 'Phone' },
    { key: 'status', header: 'Status' },
  ];

  const routeColumns = [
    { key: 'id', header: 'ID' },
    { key: 'routeCode', header: 'Route Code' },
    { key: 'routeName', header: 'Route Name' },
    { key: 'origin', header: 'Origin' },
    { key: 'destination', header: 'Destination' },
    { key: 'distance', header: 'Distance' },
    { key: 'status', header: 'Status' },
  ];

  const customerColumns = [
    { key: 'id', header: 'ID' },
    { key: 'kode', header: 'Code' },
    { key: 'nama', header: 'Name' },
    { key: 'kontak', header: 'Contact' },
    { key: 'telepon', header: 'Phone' },
  ];

  const deliveryOrderColumns = [
    { key: 'id', header: 'ID' },
    { key: 'doNo', header: 'DO No' },
    { key: 'customerName', header: 'Customer' },
    { key: 'driverName', header: 'Driver' },
    { key: 'vehicleNo', header: 'Vehicle' },
    { key: 'status', header: 'Status' },
    { key: 'orderDate', header: 'Order Date' },
  ];

  const unitScheduleColumns = [
    { key: 'id', header: 'ID' },
    { key: 'doNo', header: 'DO No' },
    { key: 'customerName', header: 'Customer' },
    { key: 'driverName', header: 'Driver' },
    { key: 'vehicleNo', header: 'Vehicle' },
    { key: 'scheduledDate', header: 'Scheduled Date' },
    { key: 'status', header: 'Status' },
  ];

  const pettyCashColumns = [
    { key: 'id', header: 'ID' },
    { key: 'requestNo', header: 'Request No' },
    { key: 'driverName', header: 'Driver' },
    { key: 'amount', header: 'Amount', render: (item: any) => `Rp ${(item.amount || 0).toLocaleString('id-ID')}` },
    { key: 'status', header: 'Status' },
    { key: 'requestDate', header: 'Request Date' },
  ];

  const suratJalanColumns = [
    { key: 'id', header: 'ID' },
    { key: 'sjNo', header: 'SJ No' },
    { key: 'doNo', header: 'DO No' },
    { key: 'customerName', header: 'Customer' },
    { key: 'driverName', header: 'Driver' },
    { key: 'status', header: 'Status' },
    { key: 'scheduledDate', header: 'Scheduled Date' },
  ];

  const notificationColumns = [
    { key: 'id', header: 'ID' },
    { key: 'type', header: 'Type' },
    { key: 'doNo', header: 'DO No' },
    { key: 'status', header: 'Status' },
    { key: 'created', header: 'Created' },
  ];

  const auditColumns = [
    { key: 'id', header: 'ID' },
    { key: 'refType', header: 'Ref Type' },
    { key: 'refId', header: 'Ref ID' },
    { key: 'actorId', header: 'Actor ID' },
    { key: 'action', header: 'Action' },
    { key: 'created', header: 'Created' },
  ];

  const getColumns = () => {
    switch (activeSection) {
      case 'vehicles': return vehicleColumns;
      case 'drivers': return driverColumns;
      case 'routes': return routeColumns;
      case 'customers': return customerColumns;
      case 'delivery-orders': return deliveryOrderColumns;
      case 'unit-schedules': return unitScheduleColumns;
      case 'petty-cash': return pettyCashColumns;
      case 'surat-jalan': return suratJalanColumns;
      case 'coa': return [
        { key: 'code', header: 'Account Code' },
        { key: 'name', header: 'Account Name' },
        { key: 'type', header: 'Type' },
        { key: 'balance', header: 'Balance' },
      ];
      case 'journal-entries': return [
        { key: 'no', header: 'No' },
        { key: 'entryDate', header: 'Date' },
        { key: 'reference', header: 'Reference' },
        { key: 'account', header: 'Account' },
        { key: 'debit', header: 'Debit' },
        { key: 'credit', header: 'Credit' },
        { key: 'description', header: 'Description' },
      ];
      case 'invoices': return [
        { key: 'invoiceNo', header: 'Invoice No' },
        { key: 'customer', header: 'Customer' },
        { key: 'total', header: 'Total' },
        { key: 'status', header: 'Status' },
        { key: 'created', header: 'Created' },
      ];
      case 'payments': return [
        { key: 'paymentNo', header: 'Payment No' },
        { key: 'customerName', header: 'Customer' },
        { key: 'amount', header: 'Amount' },
        { key: 'paymentMethod', header: 'Method' },
        { key: 'paymentDate', header: 'Date' },
      ];
      case 'accounting': return [
        { key: 'no', header: 'No' },
        { key: 'entryDate', header: 'Date' },
        { key: 'reference', header: 'Reference' },
        { key: 'account', header: 'Account' },
        { key: 'debit', header: 'Debit' },
        { key: 'credit', header: 'Credit' },
        { key: 'description', header: 'Description' },
      ];
      case 'general-ledger': return [
        { key: 'no', header: 'No' },
        { key: 'entryDate', header: 'Date' },
        { key: 'reference', header: 'Reference' },
        { key: 'account', header: 'Account' },
        { key: 'debit', header: 'Debit' },
        { key: 'credit', header: 'Credit' },
        { key: 'description', header: 'Description' },
      ];
      case 'financial-reports': return [
        { key: 'reportType', header: 'Report Type' },
        { key: 'period', header: 'Period' },
        { key: 'totalRevenue', header: 'Total Revenue' },
        { key: 'totalExpenses', header: 'Total Expenses' },
        { key: 'netIncome', header: 'Net Income' },
        { key: 'created', header: 'Created' },
      ];
      case 'accounts-receivable': return [
        { key: 'invoiceNo', header: 'Invoice No' },
        { key: 'customer', header: 'Customer' },
        { key: 'amount', header: 'Amount' },
        { key: 'dueDate', header: 'Due Date' },
        { key: 'status', header: 'Status' },
        { key: 'created', header: 'Created' },
      ];
      case 'accounts-payable': return [
        { key: 'billNo', header: 'Bill No' },
        { key: 'supplier', header: 'Supplier' },
        { key: 'amount', header: 'Amount' },
        { key: 'dueDate', header: 'Due Date' },
        { key: 'status', header: 'Status' },
        { key: 'created', header: 'Created' },
      ];
      case 'tax-management': return [
        { key: 'taxType', header: 'Tax Type' },
        { key: 'reference', header: 'Reference' },
        { key: 'amount', header: 'Amount' },
        { key: 'taxAmount', header: 'Tax Amount' },
        { key: 'period', header: 'Period' },
        { key: 'status', header: 'Status' },
        { key: 'created', header: 'Created' },
      ];
      case 'cost-analysis': return [
        { key: 'category', header: 'Category' },
        { key: 'description', header: 'Description' },
        { key: 'amount', header: 'Amount' },
        { key: 'period', header: 'Period' },
        { key: 'created', header: 'Created' },
      ];
      case 'notifications': return notificationColumns;
      case 'audit': return auditColumns;
      default: return vehicleColumns;
    }
  };

  const getAllData = () => {
    switch (activeSection) {
      case 'vehicles': {
        const vehicles = data.trucking_vehicles || [];
        return filterActiveItems(Array.isArray(vehicles) ? vehicles : []);
      }
      case 'drivers': {
        const drivers = data.trucking_drivers || [];
        return filterActiveItems(Array.isArray(drivers) ? drivers : []);
      }
      case 'routes': {
        const routes = data.trucking_routes || [];
        return filterActiveItems(Array.isArray(routes) ? routes : []);
      }
      case 'customers': {
        const customers = data.trucking_customers || [];
        return filterActiveItems(Array.isArray(customers) ? customers : []);
      }
      case 'delivery-orders': {
        const doData = data.trucking_delivery_orders || [];
        return filterActiveItems(Array.isArray(doData) ? doData : []);
      }
      case 'unit-schedules': {
        const schedules = data.trucking_unitSchedules || [];
        return filterActiveItems(Array.isArray(schedules) ? schedules : []);
      }
      case 'petty-cash': {
        const pettyCash = data.trucking_pettycash_requests || [];
        return filterActiveItems(Array.isArray(pettyCash) ? pettyCash : []);
      }
      case 'surat-jalan': {
        const sj = data.trucking_suratJalan || [];
        return filterActiveItems(Array.isArray(sj) ? sj : []);
      }
      case 'coa': {
        const coa = data.trucking_accounts || [];
        return filterActiveItems(Array.isArray(coa) ? coa : []);
      }
      case 'journal-entries': {
        const entries = data.trucking_journalEntries || [];
        return filterActiveItems(Array.isArray(entries) ? entries : []);
      }
      case 'accounting': {
        const entries = data.trucking_journalEntries || [];
        return filterActiveItems(Array.isArray(entries) ? entries : []);
      }
      case 'general-ledger': {
        const entries = data.trucking_journalEntries || [];
        return filterActiveItems(Array.isArray(entries) ? entries : []);
      }
      case 'financial-reports': {
        // Financial reports are generated from journal entries, so return empty array
        // Reports are typically generated on-demand, not stored
        return [];
      }
      case 'invoices': {
        const invoices = data.trucking_invoices || [];
        return filterActiveItems(Array.isArray(invoices) ? invoices : []);
      }
      case 'payments': {
        const payments = data.trucking_payments || [];
        return filterActiveItems(Array.isArray(payments) ? payments : []);
      }
      case 'accounts-receivable': {
        // AR is calculated from invoices, show invoices with outstanding balance
        const invoices = data.trucking_invoices || [];
        const filtered = filterActiveItems(Array.isArray(invoices) ? invoices : []);
        return filtered.filter((inv: any) => {
          const paid = inv.paidAmount || 0;
          const total = inv.total || 0;
          return total > paid;
        });
      }
      case 'accounts-payable': {
        // AP is calculated from bills/purchase orders, show bills with outstanding balance
        const bills = data.trucking_bills || [];
        const filtered = filterActiveItems(Array.isArray(bills) ? bills : []);
        return filtered.filter((bill: any) => {
          const paid = bill.paidAmount || 0;
          const total = bill.amount || 0;
          return total > paid;
        });
      }
      case 'tax-management': {
        const taxRecords = data.trucking_taxRecords || [];
        return filterActiveItems(Array.isArray(taxRecords) ? taxRecords : []);
      }
      case 'cost-analysis': {
        // Cost analysis is typically calculated from expenses and journal entries
        const expenses = data.trucking_expenses || [];
        return filterActiveItems(Array.isArray(expenses) ? expenses : []);
      }
      case 'notifications': {
        // Combine all notification types
        const allNotifs = [
          ...(Array.isArray(data.trucking_unitNotifications) ? data.trucking_unitNotifications : []).map((n: any) => ({ ...n, type: n.type || 'DO_CONFIRMED' })),
          ...(Array.isArray(data.trucking_pettyCashNotifications) ? data.trucking_pettyCashNotifications : []).map((n: any) => ({ ...n, type: n.type || 'SCHEDULE_CREATED' })),
          ...(Array.isArray(data.trucking_suratJalanNotifications) ? data.trucking_suratJalanNotifications : []).map((n: any) => ({ ...n, type: n.type || 'PETTY_CASH_DISTRIBUTED' })),
        ];
        return filterActiveItems(allNotifs);
      }
      case 'audit': {
        const audit = data.trucking_audit || [];
        return Array.isArray(audit) ? audit : [];
      }
      default: return [];
    }
  };

  const allClearableKeys = [
    // ===== MASTER DATA =====
    { key: 'trucking_vehicles', label: 'Vehicles', category: 'Master Data' },
    { key: 'trucking_drivers', label: 'Drivers', category: 'Master Data' },
    { key: 'trucking_routes', label: 'Routes', category: 'Master Data' },
    { key: 'trucking_customers', label: 'Customers', category: 'Master Data' },
    
    // ===== OPERATIONS =====
    { key: 'trucking_delivery_orders', label: 'Delivery Orders', category: 'Operations' },
    { key: 'trucking_unitSchedules', label: 'Unit Schedules', category: 'Operations' },
    { key: 'trucking_pettycash_requests', label: 'Petty Cash Requests', category: 'Operations' },
    { key: 'trucking_pettycash_memos', label: 'Petty Cash Memos', category: 'Operations' },
    { key: 'trucking_suratJalan', label: 'Surat Jalan', category: 'Operations' },
    
    // ===== FINANCE =====
    { key: 'trucking_accounts', label: 'Chart of Accounts', category: 'Finance' },
    { key: 'trucking_journalEntries', label: 'Journal Entries', category: 'Finance' },
    { key: 'trucking_invoices', label: 'Invoices', category: 'Finance' },
    { key: 'trucking_payments', label: 'Payments', category: 'Finance' },
    { key: 'trucking_expenses', label: 'Expenses', category: 'Finance' },
    { key: 'trucking_taxRecords', label: 'Tax Records', category: 'Finance' },
    { key: 'trucking_bills', label: 'Bills', category: 'Finance' },
    { key: 'trucking_invoiceNotifications', label: 'Invoice Notifications', category: 'Finance' },
    
    // ===== NOTIFICATIONS =====
    { key: 'trucking_unitNotifications', label: 'Unit Notifications', category: 'Notifications' },
    { key: 'trucking_pettyCashNotifications', label: 'Petty Cash Notifications', category: 'Notifications' },
    { key: 'trucking_suratJalanNotifications', label: 'Surat Jalan Notifications', category: 'Notifications' },
    
    // ===== SYSTEM =====
    { key: 'trucking_audit', label: 'Audit Logs', category: 'System' },
  ];

  const getCurrentData = () => {
    const allData = getAllData();
    const dataArray = Array.isArray(allData) ? allData : [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return dataArray.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const allData = getAllData();
    const dataArray = Array.isArray(allData) ? allData : [];
    const total = Math.ceil(dataArray.length / itemsPerPage);
    return total > 0 ? total : 1;
  };

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
    setCurrentPage(1);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Pakai storageService.get() seperti di Drivers - sudah dioptimasi untuk load dari localStorage dulu, sync background
      const keys = [
        'trucking_vehicles', 'trucking_drivers', 'trucking_routes', 'trucking_customers',
        'trucking_delivery_orders', 'trucking_unitSchedules', 'trucking_pettycash_requests', 'trucking_pettycash_memos', 'trucking_suratJalan',
        'trucking_accounts', 'trucking_journalEntries', 'trucking_invoices', 'trucking_payments',
        'trucking_expenses', 'trucking_taxRecords', 'trucking_bills', 'trucking_purchaseOrders', 'trucking_invoiceNotifications',
        'trucking_unitNotifications', 'trucking_pettyCashNotifications', 'trucking_suratJalanNotifications',
        'trucking_audit',
      ];
      
      // Load data menggunakan storageService untuk konsistensi (tetap baca semua data termasuk deleted untuk activity log)
      const allData: any = {};
      for (const key of keys) {
        try {
          // Pakai storageService.get() untuk konsistensi, tapi tetap simpan semua data termasuk deleted
          const dataArray = await storageService.get<any[]>(key) || [];
          allData[key] = dataArray;
        } catch (error) {
          allData[key] = [];
        }
      }
      
      setData(allData);
    } catch (error) {
      // Error loading data
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setShowSeedDialog(true);
  };

  const handleSeedFromFiles = async () => {
    setShowSeedDialog(false);
    setSeedLoading(true);
    setSeedMessage('');

    try {
      const result = await storageService.importFromJsonFiles();
      
      if (result.imported > 0) {
        setSeedMessage(`✓ Imported ${result.imported} data files from data/ folder`);
        setTimeout(() => {
          loadData();
        }, 500);
      } else {
        setSeedMessage(`✗ No data files found in data/ folder`);
      }
    } catch (error: any) {
      setSeedMessage(`✗ Error: ${error.message || 'Failed to import data'}`);
    } finally {
      setSeedLoading(false);
      setTimeout(() => setSeedMessage(''), 10000);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    setExportMessage('');

    try {
      const result = await storageService.exportAllData();
      
      if (result.success && result.data) {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI && electronAPI.exportLocalStorage) {
          setExportMessage(`✓ Exported ${Object.keys(result.data).length} data files to data/localStorage/`);
        } else {
          const jsonStr = JSON.stringify(result.data, null, 2);
          const blob = new Blob([jsonStr], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `trucking-export-${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setExportMessage(`✓ Exported ${Object.keys(result.data).length} data files (downloaded)`);
        }
      } else {
        setExportMessage(`✗ Export failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      setExportMessage(`✗ Error: ${error.message || 'Failed to export data'}`);
    } finally {
      setExportLoading(false);
      setTimeout(() => setExportMessage(''), 10000);
    }
  };

  const handleClear = async () => {
    setSelectedKeys(new Set(allClearableKeys.map(k => k.key)));
    
    // Load counts untuk setiap key yang bisa di-clear menggunakan storageService
    const counts: Record<string, number> = {};
    for (const keyInfo of allClearableKeys) {
      try {
        const dataArray = await storageService.get<any[]>(keyInfo.key) || [];
        counts[keyInfo.key] = Array.isArray(dataArray) ? dataArray.length : 0;
      } catch (error) {
        counts[keyInfo.key] = 0;
      }
    }
    setDataCounts(counts);
    setShowClearDialog(true);
  };
  
  const handleClearConfirm = async () => {
    if (selectedKeys.size === 0) {
      showAlert('Please select at least one item to clear.', 'No Selection');
      return;
    }
    
    setShowClearDialog(false);
    setClearLoading(true);
    setClearMessage('');

    try {
      const keys = Array.from(selectedKeys);
      let cleared = 0;
      let errors: string[] = [];
      const electronAPI = (window as any).electronAPI;

      // IMPORTANT: Clear from all possible key formats (same as loadData)
      for (const key of keys) {
        // Try multiple key formats (same as loadData)
        const possibleKeys = [
          `trucking/${key}`, // With business prefix
          key, // Direct key
        ];
        
        // Clear from file storage (if Electron)
        if (electronAPI && electronAPI.deleteStorage) {
          for (const storageKey of possibleKeys) {
            try {
              await electronAPI.deleteStorage(storageKey);
            } catch (error: any) {
              // File might not exist, that's okay
            }
          }
        }
        
        // Clear from localStorage (all formats) - BENAR-BENAR HAPUS, bukan tombstone
        for (const storageKey of possibleKeys) {
          try {
            // Remove directly from localStorage
            localStorage.removeItem(storageKey);
            
            // Also use storageService.remove for consistency
            await storageService.remove(storageKey);
            
            if (!electronAPI || !electronAPI.deleteStorage) {
              cleared++;
            }
          } catch (error: any) {
            if (!errors.some(e => e.includes(storageKey))) {
              errors.push(`${storageKey}: ${error.message}`);
            }
          }
        }
        
        // Count cleared (only count once per key, not per format)
        if (electronAPI && electronAPI.deleteStorage) {
          cleared++;
        }
      }
      
      // Also scan and remove any remaining Trucking keys that match pattern
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const storageKey = localStorage.key(i);
          if (storageKey) {
            // Check if this key matches any of the selected keys (with or without prefix)
            const matches = keys.some(key => {
              return storageKey === key || 
                     storageKey === `trucking/${key}` ||
                     storageKey.startsWith(`trucking/${key}/`) ||
                     (key.startsWith('trucking_') && storageKey.includes(key));
            });
            if (matches && !keysToRemove.includes(storageKey)) {
              keysToRemove.push(storageKey);
            }
          }
        }
        
        // Remove all matching keys
        for (const storageKey of keysToRemove) {
          try {
            localStorage.removeItem(storageKey);
            if (electronAPI && electronAPI.deleteStorage) {
              await electronAPI.deleteStorage(storageKey);
            }
          } catch (error: any) {
            // Ignore errors
          }
        }
      } catch (error: any) {
        // Ignore scanning errors
      }

      if (errors.length > 0) {
        setClearMessage(`⚠ Cleared ${cleared} items, but ${errors.length} errors occurred`);
      } else {
        setClearMessage(`✓ Successfully cleared ${cleared} data items`);
      }

      // Force clear localStorage for selected keys (double-check)
      for (const key of keys) {
        try {
          // Double-check menggunakan storageService untuk konsistensi
          const stillExists = await storageService.get<any[]>(key);
          if (stillExists && Array.isArray(stillExists) && stillExists.length > 0) {
            // Force clear dengan set empty array
            await storageService.set(key, []);
            // Juga clear dari localStorage langsung untuk memastikan
            const possibleKeys = [`trucking/${key}`, key];
            for (const storageKey of possibleKeys) {
              localStorage.removeItem(storageKey);
              if (electronAPI && electronAPI.deleteStorage) {
                try {
                  await electronAPI.deleteStorage(storageKey);
                } catch (e) {
                  // Ignore
                }
              }
            }
          }
        } catch (error) {
          // Ignore errors during double-check
        }
      }
      
      // Reload data after clear
      setTimeout(() => {
        loadData();
      }, 500);
    } catch (error: any) {
      setClearMessage(`✗ Error: ${error.message || 'Failed to clear data'}`);
    } finally {
      setClearLoading(false);
      setTimeout(() => setClearMessage(''), 10000);
    }
  };
  
  const toggleSelectAll = () => {
    if (selectedKeys.size === allClearableKeys.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(allClearableKeys.map(k => k.key)));
    }
  };
  
  const toggleKey = (key: string) => {
    const newSet = new Set(selectedKeys);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedKeys(newSet);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const totalPages = getTotalPages();
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [data, activeSection, itemsPerPage]);

  return (
    <div className="module-compact">
      <div className="page-header">
        <h1>Database Activity Log</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={loadData} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
          <Button 
            variant="secondary" 
            onClick={handleSeed} 
            disabled={seedLoading}
          >
            {seedLoading ? 'Seeding...' : 'Seed Database'}
          </Button>
          <Button 
            variant="secondary" 
            onClick={handleExport} 
            disabled={exportLoading}
          >
            {exportLoading ? 'Exporting...' : 'Export Data'}
          </Button>
          <Button 
            variant="danger" 
            onClick={handleClear}
            disabled={clearLoading}
          >
            {clearLoading ? 'Clearing...' : 'Clear Data'}
          </Button>
          {seedMessage && (
            <span style={{ 
              color: seedMessage.startsWith('✓') ? 'var(--success)' : 'var(--error)',
              fontSize: '13px',
            }}>
              {seedMessage}
            </span>
          )}
          {clearMessage && (
            <span style={{ 
              color: clearMessage.startsWith('✓') ? 'var(--success)' : clearMessage.startsWith('⚠') ? '#ff9800' : 'var(--error)',
              fontSize: '13px',
            }}>
              {clearMessage}
            </span>
          )}
          {exportMessage && (
            <span style={{ 
              color: exportMessage.startsWith('✓') ? 'var(--success)' : 'var(--error)',
              fontSize: '13px',
            }}>
              {exportMessage}
            </span>
          )}
        </div>
      </div>

      <Card>
        <div className="tab-container">
          {sections.map((section) => (
            <button
              key={section.id}
              className={`tab-button ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => handleSectionChange(section.id)}
            >
              {section.label}
            </button>
          ))}
        </div>

        <div className="tab-content">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Items per page:
              </span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  padding: '6px 10px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                }}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                {getAllData().length > 0 ? (
                  <>Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, getAllData().length)} of {getAllData().length}</>
                ) : (
                  <>No data</>
                )}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Button
                variant="secondary"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                Previous
              </Button>
              <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                Page {currentPage} of {getTotalPages() || 1}
              </span>
              <Button
                variant="secondary"
                onClick={() => setCurrentPage(prev => Math.min(getTotalPages(), prev + 1))}
                disabled={currentPage >= getTotalPages()}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                Next
              </Button>
            </div>
          </div>

          <Table 
            columns={getColumns()} 
            data={getCurrentData()} 
            emptyMessage={`No ${sections.find(s => s.id === activeSection)?.label} data`} 
          />
        </div>
      </Card>
      
      {/* Seed Dialog */}
      {showSeedDialog && (
        <div className="dialog-overlay" onClick={() => setShowSeedDialog(false)} style={{ zIndex: 10000 }}>
          <div className="dialog-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                Seed Database
              </h3>
            </div>
            
            <div style={{ marginBottom: '24px', fontSize: '14px', color: 'var(--text-primary)' }}>
              <p style={{ marginBottom: '16px' }}>Import data trucking dari folder data/</p>
              
              <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <strong>Note:</strong> Untuk seed dari CSV files, jalankan script terlebih dahulu:
                <br />• <code>node scripts/seedtrucking.js</code>
                <br />Script akan membaca CSV files dan menyimpan ke JSON files di data/localStorage/trucking/
              </div>
              
              <button
                onClick={handleSeedFromFiles}
                disabled={seedLoading}
                style={{
                  padding: '12px 16px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  cursor: seedLoading ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>📁 Import dari JSON Files</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Import data dari folder data/localStorage/trucking/ (vehicles, drivers, customers, dll)
                </div>
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setShowSeedDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Custom Dialog */}
      {dialogState.show && (
        <div className="dialog-overlay" onClick={dialogState.type === 'alert' ? closeDialog : undefined} style={{ zIndex: 10000 }}>
          <div className="dialog-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                {dialogState.title}
              </h3>
            </div>
            
            <div style={{ marginBottom: '24px', fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
              {dialogState.message}
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              {dialogState.type === 'confirm' && (
                <Button variant="secondary" onClick={() => {
                  if (dialogState.onCancel) dialogState.onCancel();
                  closeDialog();
                }}>
                  Cancel
                </Button>
              )}
              <Button variant="primary" onClick={() => {
                if (dialogState.onConfirm) dialogState.onConfirm();
                if (dialogState.type === 'alert') closeDialog();
              }}>
                {dialogState.type === 'alert' ? 'OK' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Clear Dialog */}
      {showClearDialog && (
        <div className="dialog-overlay" onClick={() => setShowClearDialog(false)} style={{ zIndex: 10000 }}>
          <div className="dialog-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                Clear Data
              </h3>
            </div>
            
            <div style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              ⚠️ WARNING: This will permanently delete selected data. This action cannot be undone.
            </div>
            
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
              <input
                type="checkbox"
                checked={selectedKeys.size === allClearableKeys.length}
                onChange={toggleSelectAll}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', cursor: 'pointer' }}>
                Select All ({selectedKeys.size} / {allClearableKeys.length})
              </label>
            </div>
            
            <div style={{ marginBottom: '24px', maxHeight: '400px', overflowY: 'auto' }}>
              {['Master Data', 'Operations', 'Finance', 'Notifications', 'System'].map((category) => {
                const categoryKeys = allClearableKeys.filter(k => k.category === category);
                if (categoryKeys.length === 0) return null;
                
                const selectedInCategory = categoryKeys.filter(k => selectedKeys.has(k.key));
                const totalCountInCategory = selectedInCategory.reduce((sum, k) => sum + (dataCounts[k.key] || 0), 0);
                
                return (
                  <div key={category} style={{ marginBottom: '16px' }}>
                    <div style={{ 
                      fontSize: '12px', 
                      fontWeight: '600', 
                      color: 'var(--text-secondary)', 
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>{category}</span>
                      {selectedInCategory.length > 0 && (
                        <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: '500' }}>
                          {totalCountInCategory} records will be deleted
                        </span>
                      )}
                    </div>
                    {categoryKeys.map((keyInfo) => {
                      const count = dataCounts[keyInfo.key] || 0;
                      const isSelected = selectedKeys.has(keyInfo.key);
                      return (
                        <div key={keyInfo.key} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          padding: '8px 12px',
                          borderRadius: '4px',
                          backgroundColor: isSelected ? 'var(--bg-hover)' : 'transparent'
                        }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleKey(keyInfo.key)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <label style={{ fontSize: '14px', color: 'var(--text-primary)', cursor: 'pointer', flex: 1 }}>
                            {keyInfo.label}
                          </label>
                          <span style={{ 
                            fontSize: '12px', 
                            color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                            fontWeight: isSelected ? '600' : '400',
                            minWidth: '60px',
                            textAlign: 'right'
                          }}>
                            {count} {count === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Summary:
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                {selectedKeys.size} data type(s) selected • {Object.keys(dataCounts).filter(k => selectedKeys.has(k)).reduce((sum, k) => sum + (dataCounts[k] || 0), 0)} total records will be deleted
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setShowClearDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="danger" 
                onClick={handleClearConfirm}
                disabled={selectedKeys.size === 0 || clearLoading}
              >
                {clearLoading ? 'Clearing...' : `Clear ${selectedKeys.size} Selected`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DBActivity;

