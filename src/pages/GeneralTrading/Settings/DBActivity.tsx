import { useState, useEffect } from 'react';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import { storageService } from '../../../services/storage';
import axios from 'axios';
import '../../../styles/common.css';
import '../../../styles/compact.css';

const DBActivity = () => {
  const [activeSection, setActiveSection] = useState<string>('products');
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
  
  // Seed dialog state
  const [showSeedDialog, setShowSeedDialog] = useState(false);

  const sections = [
    // Master Data
    { id: 'products', label: 'Products', category: 'Master Data' },
    { id: 'customers', label: 'Customers', category: 'Master Data' },
    { id: 'suppliers', label: 'Suppliers', category: 'Master Data' },
    // Sales & Orders
    { id: 'sales-orders', label: 'Sales Orders (SO)', category: 'Sales & Orders' },
    { id: 'quotations', label: 'Quotations', category: 'Sales & Orders' },
    // PPIC
    { id: 'spk', label: 'SPK (Production Plan)', category: 'PPIC' },
    { id: 'schedule', label: 'Delivery Schedule', category: 'PPIC' },
    // Purchasing
    { id: 'purchase-requests', label: 'Purchase Requests (PR)', category: 'Purchasing' },
    { id: 'purchase-orders', label: 'Purchase Orders (PO)', category: 'Purchasing' },
    { id: 'grn', label: 'Goods Receipt Notes (GRN)', category: 'Purchasing' },
    // Inventory & Delivery
    { id: 'inventory', label: 'Inventory', category: 'Inventory & Delivery' },
    { id: 'delivery', label: 'Delivery Notes', category: 'Inventory & Delivery' },
    // Finance
    { id: 'invoices', label: 'Invoices', category: 'Finance' },
    { id: 'payments', label: 'Payments', category: 'Finance' },
    { id: 'journal-entries', label: 'Journal Entries', category: 'Finance' },
    // Notifications
    { id: 'notifications', label: 'Notifications', category: 'Notifications' },
  ];

  const productColumns = [
    { key: 'id', header: 'ID' },
    { key: 'kode', header: 'SKU' },
    { key: 'nama', header: 'Name' },
    { key: 'created', header: 'Created' },
  ];

  const customerColumns = [
    { key: 'id', header: 'ID' },
    { key: 'kontak', header: 'PIC Name' },
    { key: 'nama', header: 'Company' },
    { key: 'telepon', header: 'Phone' },
    { key: 'created', header: 'Created' },
  ];

  const supplierColumns = [
    { key: 'id', header: 'ID' },
    { key: 'kontak', header: 'PIC Name' },
    { key: 'nama', header: 'Company' },
    { key: 'telepon', header: 'Phone' },
    { key: 'created', header: 'Created' },
  ];

  const soColumns = [
    { key: 'id', header: 'ID' },
    { key: 'soNo', header: 'SO No' },
    { key: 'customer', header: 'Customer' },
    { key: 'status', header: 'Status' },
    { key: 'created', header: 'Created' },
  ];

  const prColumns = [
    { key: 'id', header: 'ID' },
    { key: 'prNo', header: 'PR No' },
    { key: 'spkNo', header: 'SPK No' },
    { key: 'soNo', header: 'SO No' },
    { key: 'customer', header: 'Customer' },
    { key: 'product', header: 'Product' },
    { 
      key: 'items', 
      header: 'Items Count',
      render: (item: any) => (item.items || []).length
    },
    { key: 'status', header: 'Status' },
    { key: 'createdBy', header: 'Created By' },
    { key: 'created', header: 'Created' },
  ];

  const poColumns = [
    { key: 'id', header: 'ID' },
    { key: 'poNo', header: 'PO No' },
    { key: 'supplier', header: 'Supplier' },
    { key: 'paymentTerms', header: 'Payment Terms' },
    { key: 'topDays', header: 'TOP (days)' },
    { key: 'status', header: 'Status' },
    { key: 'created', header: 'Created' },
  ];

  const invoiceColumns = [
    { key: 'id', header: 'ID' },
    { key: 'invoiceNo', header: 'Invoice No' },
    { key: 'customer', header: 'Customer' },
    { key: 'status', header: 'Status' },
    { key: 'paidAt', header: 'Paid At' },
    { key: 'created', header: 'Created' },
  ];

  const grnColumns = [
    { key: 'id', header: 'ID' },
    { key: 'grnNo', header: 'GRN No' },
    { key: 'poId', header: 'PO ID' },
    { key: 'status', header: 'Status' },
    { key: 'date', header: 'Date' },
    { key: 'created', header: 'Created' },
  ];

  const deliveryColumns = [
    { key: 'id', header: 'ID' },
    { key: 'sjNo', header: 'SJ No' },
    { key: 'soNo', header: 'SO No' },
    { key: 'customer', header: 'Customer' },
    { key: 'product', header: 'Product' },
    { key: 'qty', header: 'Qty' },
    { key: 'status', header: 'Status' },
    { key: 'created', header: 'Created' },
  ];


  const inventoryColumns = [
    { key: 'id', header: 'ID' },
    { key: 'codeItem', header: 'Code Item' },
    { key: 'description', header: 'Description' },
    { key: 'kategori', header: 'Category' },
    { key: 'nextStock', header: 'Stock' },
    { key: 'lastUpdate', header: 'Last Update' },
  ];

  const paymentColumns = [
    { key: 'id', header: 'ID' },
    { key: 'paymentNo', header: 'Payment No' },
    { key: 'type', header: 'Type' },
    { key: 'invoiceNo', header: 'Invoice No' },
    { key: 'poNo', header: 'PO No' },
    { key: 'amount', header: 'Amount' },
    { key: 'paymentDate', header: 'Payment Date' },
  ];

  const journalEntryColumns = [
    { key: 'id', header: 'ID' },
    { key: 'no', header: 'No' },
    { key: 'entryDate', header: 'Entry Date' },
    { key: 'reference', header: 'Reference' },
    { key: 'account', header: 'Account' },
    { key: 'accountName', header: 'Account Name' },
    { key: 'debit', header: 'Debit' },
    { key: 'credit', header: 'Credit' },
    { key: 'description', header: 'Description' },
  ];

  const notificationColumns = [
    { key: 'id', header: 'ID' },
    { key: 'type', header: 'Type' },
    { key: 'soNo', header: 'SO No' },
    { key: 'spkNo', header: 'SPK No' },
    { key: 'poNo', header: 'PO No' },
    { key: 'status', header: 'Status' },
    { key: 'created', header: 'Created' },
  ];

  const getColumns = () => {
    switch (activeSection) {
      case 'products': return productColumns;
      case 'customers': return customerColumns;
      case 'suppliers': return supplierColumns;
      case 'sales-orders': return soColumns;
      case 'quotations': return soColumns; // Quotations use same structure as SO
      case 'spk': return prColumns; // SPK uses similar columns to PR
      case 'schedule': return deliveryColumns; // Schedule uses similar columns to delivery
      case 'purchase-requests': return prColumns;
      case 'purchase-orders': return poColumns;
      case 'invoices': return invoiceColumns;
      case 'grn': return grnColumns;
      case 'delivery': return deliveryColumns;
      case 'inventory': return inventoryColumns;
      case 'payments': return paymentColumns;
      case 'journal-entries': return journalEntryColumns;
      case 'notifications': return notificationColumns;
      default: return productColumns;
    }
  };

  const getAllData = () => {
    switch (activeSection) {
      case 'products': {
        const products = data.gt_products || [];
        return Array.isArray(products) ? products.map((item: any) => ({
          id: item.id,
          kode: item.kode || item.product_id,
          nama: item.nama,
          created: item.created,
        })) : [];
      }
      case 'customers': {
        const customers = data.gt_customers || [];
        return Array.isArray(customers) ? customers.map((item: any) => ({
          id: item.id,
          kontak: item.kontak,
          nama: item.nama,
          telepon: item.telepon,
          created: item.created,
        })) : [];
      }
      case 'suppliers': {
        const suppliers = data.gt_suppliers || [];
        return Array.isArray(suppliers) ? suppliers.map((item: any) => ({
          id: item.id,
          kontak: item.kontak,
          nama: item.nama,
          telepon: item.telepon,
          created: item.created,
        })) : [];
      }
      case 'sales-orders': {
        const so = data.gt_salesOrders;
        return Array.isArray(so) ? so : [];
      }
      case 'quotations': {
        const quotes = data.gt_quotations;
        return Array.isArray(quotes) ? quotes : [];
      }
      case 'spk': {
        const spk = data.gt_spk;
        return Array.isArray(spk) ? spk : [];
      }
      case 'schedule': {
        const schedule = data.gt_schedule;
        return Array.isArray(schedule) ? schedule : [];
      }
      case 'purchase-requests': {
        const pr = data.gt_purchaseRequests;
        return Array.isArray(pr) ? pr : [];
      }
      case 'purchase-orders': {
        const po = data.gt_purchaseOrders;
        return Array.isArray(po) ? po : [];
      }
      case 'invoices': {
        const invoices = data.gt_invoices;
        return Array.isArray(invoices) ? invoices : [];
      }
      case 'grn': {
        const grn = data.gt_grn;
        return Array.isArray(grn) ? grn : [];
      }
      case 'delivery': {
        const delivery = data.gt_delivery;
        return Array.isArray(delivery) ? delivery : [];
      }
      case 'inventory': {
        const inventory = data.gt_inventory;
        return Array.isArray(inventory) ? inventory : [];
      }
      case 'payments': {
        const payments = data.gt_payments;
        return Array.isArray(payments) ? payments : [];
      }
      case 'journal-entries': {
        const journal = data.gt_journalEntries;
        return Array.isArray(journal) ? journal : [];
      }
      case 'notifications': {
        // Combine all notification types
        const allNotifs = [
          ...(Array.isArray(data.gt_ppicNotifications) ? data.gt_ppicNotifications : []).map((n: any) => ({ ...n, type: n.type || 'SO_CREATED' })),
          ...(Array.isArray(data.gt_purchasingNotifications) ? data.gt_purchasingNotifications : []).map((n: any) => ({ ...n, type: n.type || 'PR_CREATED' })),
          ...(Array.isArray(data.gt_deliveryNotifications) ? data.gt_deliveryNotifications : []).map((n: any) => ({ ...n, type: n.type || 'READY_TO_DELIVER' })),
          ...(Array.isArray(data.gt_invoiceNotifications) ? data.gt_invoiceNotifications : []).map((n: any) => ({ ...n, type: n.type || 'CUSTOMER_INVOICE' })),
          ...(Array.isArray(data.gt_financeNotifications) ? data.gt_financeNotifications : []).map((n: any) => ({ ...n, type: n.type || 'SUPPLIER_PAYMENT' })),
          ...(Array.isArray(data.gt_productionNotifications) ? data.gt_productionNotifications : []).map((n: any) => ({ ...n, type: n.type || 'PRODUCTION' })),
        ];
        return allNotifs;
      }
      case 'expenses': {
        const expenses = data.expenses;
        return Array.isArray(expenses) ? expenses : [];
      }
      case 'audit': {
        const audit = data.audit;
        return Array.isArray(audit) ? audit : [];
      }
      case 'outbox': {
        const outbox = data.outbox;
        return Array.isArray(outbox) ? outbox : [];
      }
      default: return [];
    }
  };
  
  const showAlert = (message: string, title: string = 'Information') => {
    setDialogState({
      show: true,
      type: 'alert',
      title,
      message,
    });
  };
  
  const showConfirm = (message: string, onConfirm: () => void, onCancel?: () => void, title: string = 'Confirmation') => {
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
    setDialogState({
      show: false,
      type: 'alert',
      title: '',
      message: '',
    });
  };
  
  // Kategorisasi keys untuk delete dengan tepat sasaran
  const allClearableKeys = [
    // ===== MASTER DATA =====
    { key: 'gt_products', label: 'Products', category: 'Master Data' },
    { key: 'gt_customers', label: 'Customers', category: 'Master Data' },
    { key: 'gt_suppliers', label: 'Suppliers', category: 'Master Data' },
    { key: 'staff', label: 'Staff', category: 'Master Data' },
    
    // ===== SALES & ORDERS =====
    { key: 'gt_salesOrders', label: 'Sales Orders (SO)', category: 'Sales & Orders' },
    { key: 'gt_quotations', label: 'Quotations', category: 'Sales & Orders' },
    
    // ===== PPIC =====
    { key: 'gt_spk', label: 'SPK (Production Plan)', category: 'PPIC' },
    { key: 'gt_schedule', label: 'Delivery Schedule', category: 'PPIC' },
    { key: 'gt_ppicNotifications', label: 'PPIC Notifications', category: 'PPIC' },
    
    // ===== PURCHASING =====
    { key: 'gt_purchaseRequests', label: 'Purchase Requests (PR)', category: 'Purchasing' },
    { key: 'gt_purchaseOrders', label: 'Purchase Orders (PO)', category: 'Purchasing' },
    { key: 'gt_grn', label: 'Goods Receipt Notes (GRN)', category: 'Purchasing' },
    { key: 'gt_purchasingNotifications', label: 'Purchasing Notifications', category: 'Purchasing' },
    
    // ===== INVENTORY & DELIVERY =====
    { key: 'gt_inventory', label: 'Inventory', category: 'Inventory & Delivery' },
    { key: 'gt_delivery', label: 'Delivery Notes', category: 'Inventory & Delivery' },
    { key: 'gt_deliveryNotifications', label: 'Delivery Notifications', category: 'Inventory & Delivery' },
    
    // ===== FINANCE =====
    { key: 'gt_invoices', label: 'Invoices', category: 'Finance' },
    { key: 'gt_payments', label: 'Payments', category: 'Finance' },
    { key: 'gt_journalEntries', label: 'Journal Entries', category: 'Finance' },
    { key: 'gt_accounts', label: 'Accounts', category: 'Finance' },
    { key: 'gt_financeNotifications', label: 'Finance Notifications', category: 'Finance' },
    { key: 'gt_invoiceNotifications', label: 'Invoice Notifications', category: 'Finance' },
    { key: 'gt_taxRecords', label: 'Tax Records', category: 'Finance' },
    
    // ===== SYSTEM =====
    { key: 'expenses', label: 'Expenses', category: 'System' },
    { key: 'gt_expenses', label: 'GT Expenses', category: 'System' },
    { key: 'gt_productionNotifications', label: 'Production Notifications', category: 'System' },
    { key: 'audit', label: 'Audit Logs', category: 'System' },
    { key: 'outbox', label: 'Outbox Events', category: 'System' },
  ];

  const getCurrentData = () => {
    const allData = getAllData();
    // Ensure allData is always an array
    const dataArray = Array.isArray(allData) ? allData : [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return dataArray.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const allData = getAllData();
    // Ensure allData is always an array
    const dataArray = Array.isArray(allData) ? allData : [];
    const total = Math.ceil(dataArray.length / itemsPerPage);
    return total > 0 ? total : 1;
  };

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
    setCurrentPage(1); // Reset to first page when changing section
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load langsung dari localStorage untuk memastikan data yang sudah di-mark sebagai deleted tetap terbaca
      // Sama seperti Trucking - baca local dulu, lebih cepat dan data lengkap
      const allData: any = {};
      // Comprehensive list of all GT keys - must match allClearableKeys
      const keys = [
        // Master Data
        'gt_products', 'gt_customers', 'gt_suppliers', 'gt_productCategories', 'staff',
        // Sales & Orders
        'gt_salesOrders', 'gt_quotations',
        // PPIC
        'gt_spk', 'gt_schedule', 'gt_ppicNotifications',
        // Purchasing
        'gt_purchaseRequests', 'gt_purchaseOrders', 'gt_grn', 'gt_purchasingNotifications',
        // Inventory & Delivery
        'gt_inventory', 'gt_delivery', 'gt_deliveryNotifications',
        // Finance
        'gt_invoices', 'gt_payments', 'gt_journalEntries', 'gt_accounts',
        'gt_financeNotifications', 'gt_invoiceNotifications', 'gt_taxRecords',
        // System
        'expenses', 'gt_expenses', 'audit', 'outbox',
        // Additional notifications
        'gt_productionNotifications',
      ];
      
      // Load langsung dari localStorage (sama seperti Trucking)
      for (const key of keys) {
        try {
          // Try multiple key formats
          const possibleKeys = [
            `general-trading/${key}`, // With business prefix
            key, // Direct key
          ];
          
          let dataArray: any[] = [];
          for (const storageKey of possibleKeys) {
            const valueStr = localStorage.getItem(storageKey);
            if (valueStr) {
              try {
                const parsed = JSON.parse(valueStr);
                dataArray = Array.isArray(parsed?.value) ? parsed.value : (Array.isArray(parsed) ? parsed : []);
                if (dataArray.length > 0) {
                  break; // Found data, use this
                }
              } catch (e) {
                // Invalid JSON, try next key
              }
            }
          }
          
          // If still empty, try storageService as fallback
          if (dataArray.length === 0) {
            const value = await storageService.get(key);
            if (value) {
              const actualValue = Array.isArray(value) ? value : ((value as any).value !== undefined ? (value as any).value : value);
              dataArray = Array.isArray(actualValue) ? actualValue : [];
            }
          }
          
          const deletedCount = dataArray.filter((i: any) => i?.deleted === true || i?.deleted === 'true' || i?.deletedAt).length;
          console.log(`[DBActivity] Loaded ${key}: ${dataArray.length} items (including ${deletedCount} deleted items)`);
          allData[key] = dataArray;
        } catch (error) {
          console.warn(`[DBActivity] Error loading ${key}:`, error);
          allData[key] = [];
        }
      }
      
      // Also try to scan localStorage for GT keys (fallback)
      try {
        // Scan localStorage for GT keys that might not be in the list
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('gt_') || key.includes('general-trading/')) && !allData[key]) {
            try {
              const valueStr = localStorage.getItem(key);
              if (valueStr) {
                const value = JSON.parse(valueStr);
                const actualValue = value?.value !== undefined ? value.value : value;
                if (actualValue && Array.isArray(actualValue) && actualValue.length > 0) {
                  // Normalize key (remove prefix if exists)
                  let normalizedKey = key.replace('general-trading/', '');
                  normalizedKey = normalizedKey.replace(/\.json$/, ''); // Remove .json extension if exists
                  if (!allData[normalizedKey]) {
                    allData[normalizedKey] = actualValue;
                    console.log(`[DBActivity] Found additional GT key in localStorage: ${key} -> ${normalizedKey} (${actualValue.length} items)`);
                  }
                }
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      } catch (error) {
        console.warn('[DBActivity] Error scanning localStorage:', error);
      }
      
      console.log('[DBActivity] Loaded all data from localStorage, setting state...');
      console.log('[DBActivity] Data counts:', Object.keys(allData).map(k => `${k}: ${allData[k]?.length || 0}`).join(', '));
      setData(allData);
    } catch (error) {
      console.error('[DBActivity] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedFromServer = async () => {
    setShowSeedDialog(false);
    setSeedLoading(true);
    setSeedMessage('');

    try {
      const config = storageService.getConfig();
      if (!config.serverUrl) {
        setSeedMessage(`✗ Server URL not configured. Please set up server connection first.`);
        setSeedLoading(false);
        return;
      }

      // Call server seed endpoint
      const response = await fetch(`${config.serverUrl}/api/seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const result = await response.json();
        setSeedMessage(`✓ ${result.message || 'Seed completed successfully'}`);
        
        // Sync data from server after seed
        setTimeout(async () => {
          await storageService.syncFromServer();
          loadData();
        }, 1000);
      } else {
        const error = await response.json();
        setSeedMessage(`✗ Server seed failed: ${error.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Seed from server error:', error);
      setSeedMessage(`✗ Error: ${error.message || 'Failed to seed from server'}`);
    } finally {
      setSeedLoading(false);
      setTimeout(() => setSeedMessage(''), 10000);
    }
  };

  const handleSeedGT = async () => {
    setShowSeedDialog(false);
    setSeedLoading(true);
    setSeedMessage('');

    try {
      const config = storageService.getConfig();
      
      // Try server first if available
      if (config.serverUrl) {
        try {
          const response = await fetch(`${config.serverUrl}/api/seedgt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });

          if (response.ok) {
            const result = await response.json();
            setSeedMessage(`✓ ${result.message || 'GT Seed completed successfully'}`);
            
            // Sync data from server after seed
            setTimeout(async () => {
              await storageService.syncFromServer();
              loadData();
            }, 1000);
            setSeedLoading(false);
            setTimeout(() => setSeedMessage(''), 10000);
            return;
          }
        } catch (serverError) {
          console.log('Server not available, trying local seed script...');
        }
      }

      // Fallback: Run seedgt.js script locally
      try {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI && electronAPI.execCommand) {
          // Run seedgt.js script via Electron
          const result = await electronAPI.execCommand('node scripts/seedgt.js', { cwd: process.cwd() });
          if (result.success) {
            setSeedMessage(`✓ GT Seed completed successfully!\n${result.stdout || ''}`);
            setTimeout(() => {
              loadData();
            }, 1000);
            setSeedLoading(false);
            setTimeout(() => setSeedMessage(''), 10000);
            return;
          } else {
            throw new Error(result.stderr || 'Seed script failed');
          }
        }
      } catch (scriptError: any) {
        console.log('Cannot run seed script, trying import from files...', scriptError);
      }

      // Fallback: Import from storage/files
      let imported = 0;
      const errors: string[] = [];

      // Direct import from data/gt_*.json files (REPLACE existing data)
      // Skip Method 1 & 2 - always fetch fresh data from JSON files
      // Files are in data/ root: gt_products.json, gt_customers.json, gt_suppliers.json
      // ALWAYS try to import customers and suppliers, even if imported > 0
      {
        // Import Products from JSON file
        try {
          const productsPath = 'data/gt_products.json';
          const productsResponse = await fetch(productsPath, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
          });
          
          if (productsResponse.ok) {
            const products = await productsResponse.json();
            // Ensure products is an array
            if (Array.isArray(products)) {
              await storageService.set('gt_products', products);
              imported++;
              console.log(`✓ Imported ${products.length} products from ${productsPath}`);
            } else {
              errors.push(`Products: Invalid data format (expected array)`);
            }
          } else {
            errors.push(`Products: HTTP ${productsResponse.status} - ${productsResponse.statusText}`);
          }
        } catch (error: any) {
          const errorMsg = error.message || 'Unknown error';
          // Don't add to errors if it's just file not found (normal in production)
          if (!errorMsg.includes('Failed to fetch') && !errorMsg.includes('404')) {
            errors.push(`Products: ${errorMsg}`);
          } else {
            console.log(`Products file not found at data/gt_products.json (this is normal in production)`);
          }
        }

        // Import Customers from JSON (GT specific file) - Use Electron API
        // readDataFiles now prioritizes root data/ folder over localStorage
        try {
          console.log('[GT Seed] Attempting to read data/gt_customers.json...');
          
          const electronAPI = (window as any).electronAPI;
          let customers: any[] | null = null;
          
          // Use readDataFiles which now reads root data/ folder FIRST (priority)
          if (electronAPI && electronAPI.readDataFiles) {
            const allData = await electronAPI.readDataFiles();
            if (allData && typeof allData === 'object' && !Array.isArray(allData)) {
              // Check for gt_customers in the data (from data/gt_customers.json - root folder has priority)
              if (allData.gt_customers && Array.isArray(allData.gt_customers)) {
                customers = allData.gt_customers;
                console.log('[GT Seed] Found customers in readDataFiles (from root data/):', allData.gt_customers.length);
              }
            }
          }
          
          if (customers && Array.isArray(customers) && customers.length > 0) {
            // REPLACE all data - use JSON as source of truth (don't merge)
            console.log('[GT Seed] Replacing customers with data from JSON:', customers.length);
            await storageService.set('gt_customers', customers as any[]);
            
            // Verify save
            const verifyCustomers = await storageService.get<any[]>('gt_customers') || [];
            console.log('[GT Seed] Verified saved customers:', verifyCustomers.length);
            
            if (verifyCustomers.length > 0) {
                    imported++;
              console.log(`✓ Imported ${verifyCustomers.length} customers from data/gt_customers.json (REPLACED)`);
              }
          } else {
            console.log('[GT Seed] Customers not found or empty');
          }
        } catch (error: any) {
          const errorMsg = error.message || 'Unknown error';
          console.error('[GT Seed] Error reading customers:', errorMsg);
            errors.push(`Customers: ${errorMsg}`);
        }

        // Import Suppliers from JSON (GT specific file) - Use Electron API
        try {
          console.log('[GT Seed] Attempting to read data/gt_suppliers.json...');
          
          const electronAPI = (window as any).electronAPI;
          let suppliers: any[] | null = null;
          
          // Use readDataFiles which reads all JSON files from data/ folder
          if (electronAPI && electronAPI.readDataFiles) {
            const allData = await electronAPI.readDataFiles();
            if (allData && typeof allData === 'object' && !Array.isArray(allData)) {
              // Check for gt_suppliers in the data (from data/gt_suppliers.json)
              if (allData.gt_suppliers && Array.isArray(allData.gt_suppliers)) {
                suppliers = allData.gt_suppliers;
                console.log('[GT Seed] Found suppliers in readDataFiles:', allData.gt_suppliers.length);
              }
            }
          }
          
          if (suppliers && Array.isArray(suppliers) && suppliers.length > 0) {
            // REPLACE all data - use JSON as source of truth (don't merge)
            console.log('[GT Seed] Replacing suppliers with data from JSON:', suppliers.length);
            await storageService.set('gt_suppliers', suppliers as any[]);
            
            // Verify save
            const verifySuppliers = await storageService.get<any[]>('gt_suppliers') || [];
            console.log('[GT Seed] Verified saved suppliers:', verifySuppliers.length);
            
            if (verifySuppliers.length > 0) {
                    imported++;
              console.log(`✓ Imported ${verifySuppliers.length} suppliers from data/gt_suppliers.json (REPLACED existing data)`);
              }
          } else {
            console.log('[GT Seed] Suppliers not found or empty');
          }
        } catch (error: any) {
          const errorMsg = error.message || 'Unknown error';
          console.error('[GT Seed] Error reading suppliers:', errorMsg);
            errors.push(`Suppliers: ${errorMsg}`);
        }
      }


      if (imported > 0) {
        const details = errors.length > 0 
          ? ` (${errors.length} errors occurred)` 
          : '';
        setSeedMessage(`✓ Imported ${imported} GT data sets${details}`);
        setTimeout(() => {
          loadData();
        }, 500);
      } else if (errors.length > 0) {
        // Filter out "file not found" errors yang normal di production
        const realErrors = errors.filter(e => !e.includes('Failed to fetch') && !e.includes('404'));
        if (realErrors.length > 0) {
          const errorMsg = realErrors.length === 1 
            ? realErrors[0] 
            : `${realErrors[0]} (and ${realErrors.length - 1} more errors)`;
          setSeedMessage(`✗ ${errorMsg}`);
        } else {
          // Semua error adalah "file not found" - normal di production
          setSeedMessage(`✗ No GT data files found. For production apps, data should be bundled or imported from server.`);
        }
      } else {
        setSeedMessage(`✗ No GT data found. Please run seedgt.js script or ensure data files exist in data/localStorage/general-trading/ folder.`);
      }
    } catch (error: any) {
      console.error('GT Seed error:', error);
      setSeedMessage(`✗ Error: ${error.message || 'Failed to seed GT data'}`);
    } finally {
      setSeedLoading(false);
      setTimeout(() => setSeedMessage(''), 10000);
    }
  };

  const handleSeedFromFiles = async () => {
    setShowSeedDialog(false);
    setSeedLoading(true);
    setSeedMessage('');

    try {
      const result = await storageService.importFromJsonFiles();
      
      if (result.imported > 0) {
        const details = result.errors.length > 0 
          ? ` (${result.errors.length} errors occurred)` 
          : '';
        setSeedMessage(`✓ Imported ${result.imported} data files from data/ folder${details}`);
        setTimeout(() => {
          loadData();
        }, 500);
      } else if (result.errors.length > 0) {
        const errorMsg = result.errors.length === 1 
          ? result.errors[0] 
          : `${result.errors[0]} (and ${result.errors.length - 1} more errors)`;
        setSeedMessage(`✗ ${errorMsg}`);
      } else {
        setSeedMessage(`✗ No data files found in data/ folder`);
      }
    } catch (error: any) {
      console.error('Import from files error:', error);
      setSeedMessage(`✗ Error: ${error.message || 'Failed to import data'}`);
    } finally {
      setSeedLoading(false);
      setTimeout(() => setSeedMessage(''), 10000);
    }
  };

  const handleSeed = async () => {
    // For GT module, directly call handleSeedGT to import from data/gt_customers.json and data/gt_suppliers.json
    await handleSeedGT();
  };

  const handleExport = async () => {
    setExportLoading(true);
    setExportMessage('');

    try {
      const result = await storageService.exportAllData();
      
      if (result.success && result.data) {
        // If Electron, it's already saved via IPC
        const electronAPI = (window as any).electronAPI;
        if (electronAPI && electronAPI.exportLocalStorage) {
          setExportMessage(`✓ Exported ${Object.keys(result.data).length} data files to data/localStorage/`);
        } else {
          // Browser: download as JSON
          const jsonStr = JSON.stringify(result.data, null, 2);
          const blob = new Blob([jsonStr], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `erp-export-${new Date().toISOString().split('T')[0]}.json`;
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
      console.error('Export error:', error);
      setExportMessage(`✗ Error: ${error.message || 'Failed to export data'}`);
    } finally {
      setExportLoading(false);
      setTimeout(() => setExportMessage(''), 10000);
    }
  };

  const handleClear = () => {
    setSelectedKeys(new Set(allClearableKeys.map(k => k.key)));
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

      // Clear from file storage (if Electron)
      const electronAPI = (window as any).electronAPI;
      
      // IMPORTANT: Clear from all possible key formats (same as loadData)
      for (const key of keys) {
        // Try multiple key formats (same as loadData)
        const possibleKeys = [
          `general-trading/${key}`, // With business prefix
          key, // Direct key
        ];
        
        // Clear from file storage (if Electron)
        if (electronAPI && electronAPI.deleteStorage) {
          for (const storageKey of possibleKeys) {
            try {
              await electronAPI.deleteStorage(storageKey);
              console.log(`[Clear] Deleted from file storage: ${storageKey}`);
            } catch (error: any) {
              // File might not exist, that's okay
              console.warn(`[Clear] File storage delete warning for ${storageKey}:`, error.message);
            }
          }
        }
        
        // Clear from localStorage (all formats)
        for (const storageKey of possibleKeys) {
          try {
            // Remove directly from localStorage
            localStorage.removeItem(storageKey);
            console.log(`[Clear] Removed from localStorage: ${storageKey}`);
            
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
      
      // Also scan and remove any remaining GT keys that match pattern
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const storageKey = localStorage.key(i);
          if (storageKey) {
            // Check if this key matches any of the selected keys (with or without prefix)
            const matches = keys.some(key => {
              return storageKey === key || 
                     storageKey === `general-trading/${key}` ||
                     storageKey.startsWith(`general-trading/${key}/`) ||
                     (key.startsWith('gt_') && storageKey.includes(key));
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
            console.log(`[Clear] Removed additional key from localStorage: ${storageKey}`);
            if (electronAPI && electronAPI.deleteStorage) {
              await electronAPI.deleteStorage(storageKey);
            }
          } catch (error: any) {
            console.warn(`[Clear] Error removing additional key ${storageKey}:`, error);
          }
        }
      } catch (error: any) {
        console.warn('[Clear] Error scanning localStorage for additional keys:', error);
      }

      if (errors.length > 0) {
        setClearMessage(`⚠ Cleared ${cleared} items, but ${errors.length} errors occurred`);
        console.error('Clear errors:', errors);
      } else {
        setClearMessage(`✓ Successfully cleared ${cleared} data items`);
      }

      // Force clear localStorage for selected keys (double-check)
      console.log('[Clear] Double-checking localStorage after clear...');
      for (const key of keys) {
        const possibleKeys = [
          `general-trading/${key}`,
          key,
        ];
        for (const storageKey of possibleKeys) {
          const stillExists = localStorage.getItem(storageKey);
          if (stillExists) {
            console.warn(`[Clear] ⚠️ Key still exists after clear: ${storageKey}, forcing removal...`);
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
      }
      
      // Reload data after clear
      setTimeout(() => {
        loadData();
      }, 500);
    } catch (error: any) {
      console.error('Clear error:', error);
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

  // Reset to page 1 if current page exceeds total pages after data change
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
            onClick={() => {
              showConfirm(
                'Run database migration?\n\nThis will update database schema if needed.',
                () => {
                  closeDialog();
                  showAlert('Migration functionality - To be implemented\n\nThis will run database schema migrations.', 'Migration');
                },
                () => closeDialog(),
                'Run Migration'
              );
            }}
          >
            Run Migrate
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
            style={{ marginLeft: '8px' }}
          >
            {exportLoading ? 'Exporting...' : 'Export Data'}
          </Button>
          <Button 
            variant="danger" 
            onClick={handleClear}
            disabled={clearLoading}
            style={{ marginLeft: '8px' }}
          >
            {clearLoading ? 'Clearing...' : 'Clear Data'}
          </Button>
          {seedMessage && (
            <span style={{ 
              color: seedMessage.startsWith('✓') ? 'var(--success)' : 'var(--error)',
              fontSize: '13px',
              marginLeft: '8px'
            }}>
              {seedMessage}
            </span>
          )}
          {clearMessage && (
            <span style={{ 
              color: clearMessage.startsWith('✓') ? 'var(--success)' : clearMessage.startsWith('⚠') ? '#ff9800' : 'var(--error)',
              fontSize: '13px',
              marginLeft: '8px'
            }}>
              {clearMessage}
            </span>
          )}
          {exportMessage && (
            <span style={{ 
              color: exportMessage.startsWith('✓') ? 'var(--success)' : 'var(--error)',
              fontSize: '13px',
              marginLeft: '8px'
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
          {activeSection === 'settings' ? (
            <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>
              Company Settings:
              <br />- Company Name
              <br />- Address
              <br />- Phone
              <br />- Purchasing PIC (Name, Phone)
            </div>
          ) : (
            <>
              {/* Pagination Controls */}
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
            </>
          )}
        </div>
      </Card>
      
      {/* Seed Method Selection Dialog */}
      {showSeedDialog && (
        <div className="dialog-overlay" onClick={() => setShowSeedDialog(false)} style={{ zIndex: 10000 }}>
          <div className="dialog-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                Pilih Metode Seed
              </h3>
            </div>
            
            <div style={{ marginBottom: '24px', fontSize: '14px', color: 'var(--text-primary)' }}>
              <p style={{ marginBottom: '16px' }}>Dari mana data akan di-import?</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  onClick={handleSeedFromServer}
                  disabled={seedLoading}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    cursor: seedLoading ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!seedLoading) {
                      e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                      e.currentTarget.style.borderColor = 'var(--accent-color)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!seedLoading) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                    }
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>🌐 Dari Server Docker</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Jalankan seed script di server Docker. Server harus punya file Excel di folder data/.
                  </div>
                </button>
                
                <button
                  onClick={handleSeedGT}
                  disabled={seedLoading}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    cursor: seedLoading ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!seedLoading) {
                      e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                      e.currentTarget.style.borderColor = 'var(--accent-color)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!seedLoading) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                    }
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>📦 Seed GT Data</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Jalankan seedgt.js untuk import data dari stock_opname_STOCK_GENERAL_(GT).csv, master_item_produk_GT.xlsx, customers.json, suppliers.json
                    <br />
                    <strong>Catatan:</strong> Untuk seed dari CSV stock opname, jalankan: <code>node scripts/seedgt.js</code>
                  </div>
                </button>

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
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!seedLoading) {
                      e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                      e.currentTarget.style.borderColor = 'var(--accent-color)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!seedLoading) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                    }
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>📁 Dari Folder data/</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Import data dari folder data/localStorage/ di project. Hanya bekerja jika folder project ada.
                  </div>
                </button>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setShowSeedDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Custom Dialog untuk Alert/Confirm */}
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
      
      {/* Clear Dialog dengan Checkboxes */}
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
              {/* Group by category */}
              {['Master Data', 'Sales & Orders', 'PPIC', 'Purchasing', 'Inventory & Delivery', 'Finance', 'System'].map((category) => {
                const categoryKeys = allClearableKeys.filter(k => k.category === category);
                if (categoryKeys.length === 0) return null;
                
                return (
                  <div key={category} style={{ marginBottom: '16px' }}>
                    <div style={{ 
                      fontSize: '12px', 
                      fontWeight: '600', 
                      color: 'var(--text-secondary)', 
                      marginBottom: '8px',
                      paddingBottom: '4px',
                      borderBottom: '1px solid var(--border)'
                    }}>
                      {category}
                    </div>
                    {categoryKeys.map((item) => (
                      <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '4px', marginBottom: '4px', backgroundColor: selectedKeys.has(item.key) ? 'var(--hover-bg)' : 'transparent' }}>
                        <input
                          type="checkbox"
                          checked={selectedKeys.has(item.key)}
                          onChange={() => toggleKey(item.key)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <label style={{ fontSize: '14px', color: 'var(--text-primary)', cursor: 'pointer', flex: 1 }}>
                          {item.label}
                        </label>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setShowClearDialog(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleClearConfirm} disabled={selectedKeys.size === 0}>
                Clear Selected ({selectedKeys.size})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DBActivity;
