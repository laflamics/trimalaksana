import { useState, useEffect } from 'react';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import ImportJsonDialog from '../../components/ImportJsonDialog';
import BulkImportDialog from '../../components/BulkImportDialog';
import { storageService, extractStorageValue } from '../../services/storage';
import { filterActiveItems } from '../../utils/data-persistence-helper';
import axios from 'axios';
import '../../styles/common.css';
import '../../styles/compact.css';

// Comprehensive list of storage keys per category
const getCategoryKeys = (category: string): string[] => {
  const categories: { [key: string]: string[] } = {
    packaging: [
      // Master Data
      'products', 'customers', 'suppliers', 'materials', 'bom',
      // Production Flow
      'spk', 'schedule', 'production', 'qc', 'productionResults', 'ptp',
      // Purchasing & Inventory
      'purchaseRequests', 'purchaseOrders', 'grn', 'inventory', // grn akan map ke grnPackaging
      // Sales & Delivery
      'salesOrders', 'delivery',
      // Notifications
      'productionNotifications', 'deliveryNotifications', 'invoiceNotifications', 'financeNotifications',
      // Finance
      'payments', 'journalEntries', 'accounts', 'invoices', 'expenses', 'operationalExpenses',
      // Other
      'audit', 'outbox'
    ],
    all: [] // Will be populated with all keys
  };

  if (category === 'all') {
    // Combine all categories
    const allKeys = new Set<string>();
    Object.values(categories).forEach(keys => {
      keys.forEach(key => allKeys.add(key));
    });
    return Array.from(allKeys);
  }

  return categories[category] || [];
};

const DBActivity = () => {
  const [activeSection, setActiveSection] = useState<string>('products');
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string>('');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState<string>('');
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState<string>('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [clearMessage, setClearMessage] = useState<string>('');
  const [clearingCategory, setClearingCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(50);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [deleteLoading, setDeleteLoading] = useState(false);
  
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Seed dialog state
  const [showSeedDialog, setShowSeedDialog] = useState(false);

  const sections = [
    { id: 'products', label: 'Products' },
    { id: 'materials', label: 'Materials' },
    { id: 'customers', label: 'Customers' },
    { id: 'suppliers', label: 'Suppliers' },
    { id: 'sales-orders', label: 'Sales Orders (SO)' },
    { id: 'purchase-requests', label: 'Purchase Requests (PR)' },
    { id: 'purchase-orders', label: 'Purchase Orders (PO)' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'spk', label: 'SPK' },
    { id: 'grn', label: 'Goods Receipt Notes (GRN)' },
    { id: 'production', label: 'Production Results' },
    { id: 'qc', label: 'QC Checks' },
    { id: 'delivery', label: 'Delivery Notes' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'ptp', label: 'PTP (Production to Production)' },
    { id: 'payments', label: 'Payments' },
    { id: 'journal-entries', label: 'Journal Entries' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'operational-expenses', label: 'Operational Expenses' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'accounting', label: 'Accounting' },
    { id: 'general-ledger', label: 'General Ledger' },
    { id: 'financial-reports', label: 'Financial Reports' },
    { id: 'accounts-receivable', label: 'Accounts Receivable' },
    { id: 'accounts-payable', label: 'Accounts Payable' },
    { id: 'tax-management', label: 'Tax Management' },
    { id: 'all-business-reports', label: 'All Business Reports' },
    { id: 'coa', label: 'Chart of Accounts (COA)' },
    { id: 'audit', label: 'Audit Logs' },
    { id: 'outbox', label: 'Outbox Events (Undelivered)' },
    { id: 'settings', label: 'Company Settings' },
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

  const spkColumns = [
    { key: 'spkNo', header: 'SPK NO' },
    { key: 'soNo', header: 'SO No' },
    { key: 'product', header: 'Product' },
    { key: 'qty', header: 'Qty' },
    { key: 'status', header: 'Status' },
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

  const productionColumns = [
    { key: 'id', header: 'ID' },
    { key: 'soNo', header: 'SO No' },
    { key: 'product', header: 'Product' },
    { key: 'qtyProduced', header: 'Qty Produced' },
    { key: 'status', header: 'Status' },
    { key: 'created', header: 'Created' },
  ];

  const qcColumns = [
    { key: 'type', header: 'Type' },
    { key: 'id', header: 'ID' },
    { key: 'soNo', header: 'SO No' },
    { key: 'product', header: 'Product' },
    { key: 'grnLineId', header: 'GRN Line ID' },
    { key: 'stage', header: 'Stage' },
    { key: 'status', header: 'Status' },
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

  const expenseColumns = [
    { key: 'id', header: 'ID' },
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
    { key: 'created', header: 'Created' },
  ];

  const operationalExpenseColumns = [
    { key: 'id', header: 'ID' },
    { key: 'expenseNo', header: 'Expense No' },
    { key: 'type', header: 'Type' },
    { key: 'category', header: 'Category' },
    { key: 'description', header: 'Description' },
    {
      key: 'amount',
      header: 'Amount',
      render: (item: any) => `Rp ${(item.amount || 0).toLocaleString('id-ID')}`,
    },
    { key: 'paymentMethod', header: 'Payment Method' },
    { key: 'approvedBy', header: 'Approved By' },
    { key: 'requestor', header: 'Requestor' },
    { key: 'expenseDate', header: 'Expense Date' },
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

  const outboxColumns = [
    { key: 'id', header: 'ID' },
    { key: 'refType', header: 'Ref Type' },
    { key: 'refId', header: 'Ref ID' },
    { key: 'operation', header: 'Operation' },
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

  const ptpColumns = [
    { key: 'id', header: 'ID' },
    { key: 'requestNo', header: 'Request No' },
    { key: 'customer', header: 'Customer' },
    { key: 'productItem', header: 'Product Item' },
    { key: 'qty', header: 'Qty' },
    { key: 'unit', header: 'Unit' },
    { key: 'reason', header: 'Reason' },
    { key: 'status', header: 'Status' },
    { key: 'requestDate', header: 'Request Date' },
    { key: 'created', header: 'Created' },
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

  // Helper untuk get storage key dan id field berdasarkan section
  const getStorageConfig = (section: string): { key: string; idField: string } => {
    const configs: { [key: string]: { key: string; idField: string } } = {
      'products': { key: 'products', idField: 'id' },
      'materials': { key: 'materials', idField: 'id' },
      'customers': { key: 'customers', idField: 'id' },
      'suppliers': { key: 'suppliers', idField: 'id' },
      'sales-orders': { key: 'salesOrders', idField: 'id' },
      'purchase-requests': { key: 'purchaseRequests', idField: 'id' },
      'purchase-orders': { key: 'purchaseOrders', idField: 'id' },
      'invoices': { key: 'invoices', idField: 'id' },
      'spk': { key: 'spk', idField: 'id' },
      'grn': { key: 'grnPackaging', idField: 'id' },
      'production': { key: 'production', idField: 'id' },
      'qc': { key: 'qc', idField: 'id' },
      'delivery': { key: 'delivery', idField: 'id' },
      'inventory': { key: 'inventory', idField: 'id' },
      'ptp': { key: 'ptp', idField: 'id' },
      'payments': { key: 'payments', idField: 'id' },
      'journal-entries': { key: 'journalEntries', idField: 'id' },
      'expenses': { key: 'expenses', idField: 'id' },
      'operational-expenses': { key: 'operationalExpenses', idField: 'id' },
      'accounting': { key: 'journalEntries', idField: 'id' }, // Accounting uses journalEntries
      'general-ledger': { key: 'journalEntries', idField: 'id' }, // General Ledger uses journalEntries
      'financial-reports': { key: 'journalEntries', idField: 'id' }, // Financial Reports uses journalEntries
      'accounts-receivable': { key: 'invoices', idField: 'id' }, // AR uses invoices
      'accounts-payable': { key: 'purchaseOrders', idField: 'id' }, // AP uses purchaseOrders
      'tax-management': { key: 'taxRecords', idField: 'id' },
      'all-business-reports': { key: 'journalEntries', idField: 'id' }, // Reports use journalEntries
      'coa': { key: 'accounts', idField: 'code' }, // COA uses 'code' as ID field
      'notifications': { key: 'productionNotifications', idField: 'id' }, // Note: notifications combine multiple types, delete will handle each type separately
      'audit': { key: 'audit', idField: 'id' },
      'outbox': { key: 'outbox', idField: 'id' },
    };
    return configs[section] || { key: section, idField: 'id' };
  };

  const getColumns = () => {
    const baseColumns = (() => {
      switch (activeSection) {
        case 'products': return productColumns;
        case 'customers': return customerColumns;
        case 'suppliers': return supplierColumns;
        case 'sales-orders': return soColumns;
        case 'purchase-requests': return prColumns;
        case 'purchase-orders': return poColumns;
        case 'invoices': return invoiceColumns;
        case 'spk': return spkColumns;
        case 'grn': return grnColumns;
        case 'production': return productionColumns;
        case 'qc': return qcColumns;
        case 'delivery': return deliveryColumns;
        case 'inventory': return inventoryColumns;
        case 'ptp': return ptpColumns;
        case 'payments': return paymentColumns;
        case 'journal-entries': return journalEntryColumns;
        case 'notifications': return notificationColumns;
        case 'expenses': return expenseColumns;
        case 'operational-expenses': return operationalExpenseColumns;
        case 'accounting': return journalEntryColumns; // Accounting uses journal entries
        case 'general-ledger': return journalEntryColumns; // General Ledger uses journal entries
        case 'financial-reports': return journalEntryColumns; // Financial Reports uses journal entries
        case 'accounts-receivable': return invoiceColumns; // AR uses invoices
        case 'accounts-payable': return poColumns; // AP uses purchase orders
        case 'tax-management': return [
          { key: 'id', header: 'ID' },
          { key: 'taxDate', header: 'Tax Date' },
          { key: 'reference', header: 'Reference' },
          { key: 'referenceType', header: 'Reference Type' },
          { key: 'taxType', header: 'Tax Type' },
          { key: 'baseAmount', header: 'Base Amount' },
          { key: 'taxAmount', header: 'Tax Amount' },
          { key: 'totalAmount', header: 'Total Amount' },
          { key: 'status', header: 'Status' },
          { key: 'created', header: 'Created' },
        ];
        case 'all-business-reports': return journalEntryColumns; // Reports use journal entries
        case 'coa': return [
          { key: 'code', header: 'Code' },
          { key: 'name', header: 'Name' },
          { key: 'type', header: 'Type' },
          { key: 'balance', header: 'Balance' },
        ];
        case 'audit': return auditColumns;
        case 'outbox': return outboxColumns;
        case 'materials': return [
          { key: 'id', header: 'ID' },
          { key: 'material_id', header: 'Material ID' },
          { key: 'kode', header: 'Code' },
          { key: 'nama', header: 'Name' },
          { key: 'created', header: 'Created' },
        ];
        default: return productColumns;
      }
    })();

    // Skip checkbox dan actions untuk section 'settings' (bukan data yang bisa di-delete)
    if (activeSection === 'settings') {
      return baseColumns;
    }

    // Tambahkan checkbox column di awal
    const checkboxColumn = {
      key: '_checkbox',
      header: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={selectedItemIds.size > 0 && selectedItemIds.size === getCurrentData().length && getCurrentData().length > 0}
            onChange={(e) => {
              if (e.target.checked) {
                const currentData = getCurrentData();
                const allIds = new Set(currentData.map((item: any) => {
                  const config = getStorageConfig(activeSection);
                  return String(item[config.idField] || item.id || '');
                }).filter((id: string) => id));
                setSelectedItemIds(allIds);
              } else {
                setSelectedItemIds(new Set());
              }
            }}
            style={{ cursor: 'pointer' }}
          />
          <span style={{ fontSize: '12px' }}>Select All</span>
        </div>
      ),
      render: (item: any) => {
        const config = getStorageConfig(activeSection);
        const itemId = String(item[config.idField] || item.id || '');
        return (
          <input
            type="checkbox"
            checked={selectedItemIds.has(itemId)}
            onChange={(e) => {
              const newSet = new Set(selectedItemIds);
              if (e.target.checked) {
                newSet.add(itemId);
              } else {
                newSet.delete(itemId);
              }
              setSelectedItemIds(newSet);
            }}
            style={{ cursor: 'pointer' }}
          />
        );
      }
    };

    // Tambahkan actions column di akhir (untuk delete single)
    const actionsColumn = {
      key: '_actions',
      header: 'Actions',
      render: (item: any) => {
        const config = getStorageConfig(activeSection);
        const itemId = String(item[config.idField] || item.id || '');
        return (
          <Button
            variant="danger"
            onClick={() => handleDeleteSingleItem(itemId, item)}
            disabled={deleteLoading}
            style={{ fontSize: '11px', padding: '4px 8px' }}
          >
            Delete
          </Button>
        );
      }
    };

    return [checkboxColumn, ...baseColumns, actionsColumn];
  };

  const getAllData = (): any[] => {
    try {
      // 🚀 FIX: Data sudah di-filter di loadData(), jadi tidak perlu filter lagi
      // Tapi tetap filter sebagai double check untuk safety
      switch (activeSection) {
      case 'products': {
        const products = extractStorageValue(data.products);
        // Data sudah di-filter di loadData(), tapi filter lagi sebagai double check
        const activeProducts = filterActiveItems(Array.isArray(products) ? products : []);
        return activeProducts.map((item: any) => ({
          id: item.id,
          kode: item.kode,
          nama: item.nama,
          created: item.created,
        }));
      }
      case 'customers': {
        const customers = extractStorageValue(data.customers);
        const activeCustomers = filterActiveItems(Array.isArray(customers) ? customers : []);
        return activeCustomers.map((item: any) => ({
          id: item.id,
          kontak: item.kontak,
          nama: item.nama,
          telepon: item.telepon,
          created: item.created,
        }));
      }
      case 'suppliers': {
        const suppliers = extractStorageValue(data.suppliers);
        const activeSuppliers = filterActiveItems(Array.isArray(suppliers) ? suppliers : []);
        return activeSuppliers.map((item: any) => ({
          id: item.id,
          kontak: item.kontak,
          nama: item.nama,
          telepon: item.telepon,
          created: item.created,
        }));
      }
      case 'sales-orders': {
        const so = extractStorageValue(data.salesOrders);
        return filterActiveItems(Array.isArray(so) ? so : []);
      }
      case 'purchase-requests': {
        const pr = extractStorageValue(data.purchaseRequests);
        return filterActiveItems(Array.isArray(pr) ? pr : []);
      }
      case 'purchase-orders': {
        const po = extractStorageValue(data.purchaseOrders);
        return filterActiveItems(Array.isArray(po) ? po : []);
      }
      case 'invoices': {
        const inv = extractStorageValue(data.invoices);
        return filterActiveItems(Array.isArray(inv) ? inv : []);
      }
      case 'spk': {
        const spk = extractStorageValue(data.spk);
        return filterActiveItems(Array.isArray(spk) ? spk : []);
      }
      case 'grn': {
        // Try both grn and grnPackaging
        const grn = extractStorageValue(data.grn || data.grnPackaging);
        return filterActiveItems(Array.isArray(grn) ? grn : []);
      }
      case 'production': {
        const prod = extractStorageValue(data.production);
        return filterActiveItems(Array.isArray(prod) ? prod : []);
      }
      case 'qc': {
        const qc = extractStorageValue(data.qc);
        return filterActiveItems(Array.isArray(qc) ? qc : []);
      }
      case 'delivery': {
        // Try both delivery
        const del = extractStorageValue(data.delivery);
        return filterActiveItems(Array.isArray(del) ? del : []);
      }
      case 'inventory': {
        const inv = extractStorageValue(data.inventory);
        return filterActiveItems(Array.isArray(inv) ? inv : []);
      }
      case 'payments': {
        const pay = extractStorageValue(data.payments);
        return filterActiveItems(Array.isArray(pay) ? pay : []);
      }
      case 'journal-entries': {
        const je = extractStorageValue(data.journalEntries);
        return filterActiveItems(Array.isArray(je) ? je : []);
      }
      case 'notifications': {
        // Combine all notification types
        const prodNotifs = extractStorageValue(data.productionNotifications);
        const delNotifs = extractStorageValue(data.deliveryNotifications);
        const invNotifs = extractStorageValue(data.invoiceNotifications);
        const finNotifs = extractStorageValue(data.financeNotifications);
        const allNotifs = [
          ...filterActiveItems(Array.isArray(prodNotifs) ? prodNotifs : []).map((n: any) => ({ ...n, type: n.type || 'PRODUCTION_SCHEDULE' })),
          ...filterActiveItems(Array.isArray(delNotifs) ? delNotifs : []).map((n: any) => ({ ...n, type: n.type || 'DELIVERY_SCHEDULE' })),
          ...filterActiveItems(Array.isArray(invNotifs) ? invNotifs : []).map((n: any) => ({ ...n, type: n.type || 'CUSTOMER_INVOICE' })),
          ...filterActiveItems(Array.isArray(finNotifs) ? finNotifs : []).map((n: any) => ({ ...n, type: n.type || 'SUPPLIER_PAYMENT' })),
        ];
        return allNotifs;
      }
      case 'expenses': {
        const exp = extractStorageValue(data.expenses);
        return filterActiveItems(Array.isArray(exp) ? exp : []);
      }
      case 'operational-expenses': {
        const opExp = extractStorageValue(data.operationalExpenses);
        return filterActiveItems(Array.isArray(opExp) ? opExp : []);
      }
      case 'accounting': {
        // Accounting uses journalEntries
        const je = extractStorageValue(data.journalEntries);
        return filterActiveItems(Array.isArray(je) ? je : []);
      }
      case 'general-ledger': {
        // General Ledger uses journalEntries
        const je = extractStorageValue(data.journalEntries);
        return filterActiveItems(Array.isArray(je) ? je : []);
      }
      case 'financial-reports': {
        // Financial Reports uses journalEntries
        const je = extractStorageValue(data.journalEntries);
        return filterActiveItems(Array.isArray(je) ? je : []);
      }
      case 'accounts-receivable': {
        // AR uses invoices
        const inv = extractStorageValue(data.invoices);
        return filterActiveItems(Array.isArray(inv) ? inv : []);
      }
      case 'accounts-payable': {
        // AP uses purchaseOrders
        const po = extractStorageValue(data.purchaseOrders);
        return filterActiveItems(Array.isArray(po) ? po : []);
      }
      case 'tax-management': {
        const tax = extractStorageValue(data.taxRecords);
        return filterActiveItems(Array.isArray(tax) ? tax : []);
      }
      case 'all-business-reports': {
        // Reports use journalEntries
        const je = extractStorageValue(data.journalEntries);
        return filterActiveItems(Array.isArray(je) ? je : []);
      }
      case 'coa': {
        const accounts = extractStorageValue(data.accounts);
        return filterActiveItems(Array.isArray(accounts) ? accounts : []);
      }
      case 'audit': {
        // Audit logs are already aggregated in loadData() from all dates
        const audit = extractStorageValue(data.audit);
        if (Array.isArray(audit) && audit.length > 0) {
          // Sort by created date (newest first)
          return audit.sort((a: any, b: any) => {
            const dateA = new Date(a.created || a.timestamp || 0).getTime();
            const dateB = new Date(b.created || b.timestamp || 0).getTime();
            return dateB - dateA; // Descending (newest first)
          });
        }
        return [];
      }
      case 'outbox': {
        const outbox = extractStorageValue(data.outbox);
        return Array.isArray(outbox) ? outbox : [];
      }
      case 'materials': {
        const materials = extractStorageValue(data.materials);
        const activeMaterials = filterActiveItems(Array.isArray(materials) ? materials : []);
        return activeMaterials.map((item: any) => ({
          id: item.id,
          material_id: item.material_id || item.kode,
          kode: item.kode,
          nama: item.nama,
          created: item.created,
        }));
      }
      case 'ptp': {
        const ptp = extractStorageValue(data.ptp);
        return filterActiveItems(Array.isArray(ptp) ? ptp : []);
      }
      default: return [];
      }
    } catch (error) {
      console.error('[DBActivity] Error in getAllData():', error);
      return [];
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
  
  const allClearableKeys = [
    { key: 'products', label: 'Products' },
    { key: 'materials', label: 'Materials' },
    { key: 'customers', label: 'Customers' },
    { key: 'suppliers', label: 'Suppliers' },
    { key: 'staff', label: 'Staff' },
    { key: 'salesOrders', label: 'Sales Orders' },
    { key: 'purchaseRequests', label: 'Purchase Requests' },
    { key: 'purchaseOrders', label: 'Purchase Orders' },
    { key: 'invoices', label: 'Invoices' },
    { key: 'spk', label: 'SPK' },
    { key: 'grn', label: 'GRN' },
    { key: 'production', label: 'Production' },
    { key: 'qc', label: 'QC Checks' },
    { key: 'delivery', label: 'Delivery Notes' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'operationalExpenses', label: 'Operational Expenses' },
    { key: 'audit', label: 'Audit Logs' },
    { key: 'outbox', label: 'Outbox Events' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'productionNotifications', label: 'Production Notifications' },
    { key: 'deliveryNotifications', label: 'Delivery Notifications' },
    { key: 'invoiceNotifications', label: 'Invoice Notifications' },
    { key: 'financeNotifications', label: 'Finance Notifications' },
    { key: 'payments', label: 'Payments' },
    { key: 'journalEntries', label: 'Journal Entries' },
    { key: 'accounts', label: 'Accounts' },
    { key: 'bom', label: 'BOM' },
    { key: 'schedule', label: 'Schedule' },
    { key: 'ptp', label: 'PTP' },
    { key: 'productionResults', label: 'Production Results' },
  ];

  const getCurrentData = () => {
    const allData = getAllData();
    // Ensure allData is always an array
    if (!Array.isArray(allData)) {
      console.warn('[DBActivity] getAllData() returned non-array:', typeof allData, allData);
      return [];
    }
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return allData.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const allData = getAllData();
    // Ensure allData is always an array
    if (!Array.isArray(allData)) {
      return 1;
    }
    const total = Math.ceil(allData.length / itemsPerPage);
    return total > 0 ? total : 1;
  };

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
    setCurrentPage(1); // Reset to first page when changing section
    setSelectedItemIds(new Set()); // Reset selected items when changing section
  };

  const deleteItemFromServer = async (storageKey: string, itemId: string, idField: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      
      // Get current data from server
      const response = await axios.get(`${apiBaseUrl}/api/storage/${storageKey}`, {
        timeout: 5000,
      });
      
      if (!response.data?.success || !response.data?.data?.value) {
        return { success: false, error: 'Failed to fetch current data from server' };
      }
      
      let currentData = response.data.data.value;
      if (!Array.isArray(currentData)) {
        currentData = extractStorageValue(currentData);
      }
      
      // Find and remove the item
      const filteredData = currentData.filter((item: any) => {
        const itemIdValue = String(item[idField] || item.id || '');
        return itemIdValue !== itemId;
      });
      
      if (filteredData.length === currentData.length) {
        return { success: false, error: 'Item not found' };
      }
      
      // Update server with filtered data
      await axios.post(`${apiBaseUrl}/api/storage/${storageKey}`, {
        value: filteredData,
      }, {
        timeout: 5000,
      });
      
      console.log(`[DBActivity] ✅ Deleted item ${itemId} from server storage key: ${storageKey}`);
      return { success: true };
    } catch (error: any) {
      console.error(`[DBActivity] Error deleting from server:`, error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  };

  const handleDeleteSingleItem = async (itemId: string, item: any) => {
    const config = getStorageConfig(activeSection);
    const itemName = item.nama || item.kode || item.soNo || item.poNo || item.prNo || item.spkNo || item.sjNo || item.invoiceNo || item.expenseNo || item.paymentNo || item.id || itemId;
    
    showConfirm(
      `Delete this item?\n\n${itemName}\n\nThis action cannot be undone.`,
      async () => {
        setDeleteLoading(true);
        try {
          let deleteResult;
          
          // Try to delete from server first
          if (activeSection === 'notifications') {
            const notificationKeys = ['productionNotifications', 'deliveryNotifications', 'invoiceNotifications', 'financeNotifications'];
            let deleted = false;
            for (const key of notificationKeys) {
              const result = await deleteItemFromServer(key, itemId, config.idField);
              if (result.success) {
                deleted = true;
                break;
              }
            }
            deleteResult = deleted ? { success: true } : { success: false, error: 'Notification not found in any storage key' };
          } else {
            deleteResult = await deleteItemFromServer(config.key, itemId, config.idField);
          }
          
          if (deleteResult.success) {
            showAlert(`Item deleted successfully from server`, 'Success');
            loadData();
            setSelectedItemIds(new Set());
          } else {
            showAlert(`Error deleting item: ${deleteResult.error || 'Unknown error'}`, 'Error');
          }
        } catch (error: any) {
          showAlert(`Error deleting item: ${error.message}`, 'Error');
        } finally {
          setDeleteLoading(false);
        }
      },
      undefined,
      'Confirm Delete'
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedItemIds.size === 0) {
      showAlert('Please select at least one item to delete.', 'No Selection');
      return;
    }

    const config = getStorageConfig(activeSection);
    const itemCount = selectedItemIds.size;
    
    showConfirm(
      `Delete ${itemCount} selected item(s)?\n\nThis action cannot be undone.`,
      async () => {
        setDeleteLoading(true);
        try {
          const itemIdsArray = Array.from(selectedItemIds);
          const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
          
          let totalSuccess = 0;
          let totalFailed = 0;
          const allErrors: string[] = [];
          
          if (activeSection === 'notifications') {
            const notificationKeys = ['productionNotifications', 'deliveryNotifications', 'invoiceNotifications', 'financeNotifications'];
            
            for (const key of notificationKeys) {
              try {
                const response = await axios.get(`${apiBaseUrl}/api/storage/${key}`, {
                  timeout: 5000,
                });
                
                if (response.data?.success && response.data?.data?.value) {
                  let currentData = response.data.data.value;
                  if (!Array.isArray(currentData)) {
                    currentData = extractStorageValue(currentData);
                  }
                  
                  const filteredData = currentData.filter((item: any) => {
                    const itemIdValue = String(item[config.idField] || item.id || '');
                    return !itemIdsArray.includes(itemIdValue);
                  });
                  
                  const deletedCount = currentData.length - filteredData.length;
                  if (deletedCount > 0) {
                    await axios.post(`${apiBaseUrl}/api/storage/${key}`, {
                      value: filteredData,
                    }, {
                      timeout: 5000,
                    });
                    totalSuccess += deletedCount;
                  }
                }
              } catch (error: any) {
                console.warn(`[DBActivity] Error deleting from ${key}:`, error.message);
              }
            }
          } else {
            try {
              const response = await axios.get(`${apiBaseUrl}/api/storage/${config.key}`, {
                timeout: 5000,
              });
              
              if (response.data?.success && response.data?.data?.value) {
                let currentData = response.data.data.value;
                if (!Array.isArray(currentData)) {
                  currentData = extractStorageValue(currentData);
                }
                
                const filteredData = currentData.filter((item: any) => {
                  const itemIdValue = String(item[config.idField] || item.id || '');
                  return !itemIdsArray.includes(itemIdValue);
                });
                
                totalSuccess = currentData.length - filteredData.length;
                totalFailed = itemIdsArray.length - totalSuccess;
                
                if (totalSuccess > 0) {
                  await axios.post(`${apiBaseUrl}/api/storage/${config.key}`, {
                    value: filteredData,
                  }, {
                    timeout: 5000,
                  });
                }
              }
            } catch (error: any) {
              console.error(`[DBActivity] Error deleting from server:`, error);
              allErrors.push(error.message || 'Unknown error');
            }
          }
          
          if (totalSuccess > 0) {
            showAlert(
              `Successfully deleted ${totalSuccess} item(s) from server${totalFailed > 0 ? `\n${totalFailed} item(s) failed to delete` : ''}`,
              totalFailed > 0 ? 'Partial Success' : 'Success'
            );
            loadData();
            setSelectedItemIds(new Set());
          } else {
            showAlert(
              `Failed to delete items. Errors:\n${allErrors.slice(0, 5).join('\n')}${allErrors.length > 5 ? `\n... and ${allErrors.length - 5} more` : ''}`,
              'Error'
            );
          }
        } catch (error: any) {
          showAlert(`Error deleting items: ${error.message}`, 'Error');
        } finally {
          setDeleteLoading(false);
        }
      },
      undefined,
      'Confirm Delete Selected'
    );
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const allData: any = {};
      const keys = [
        // Master Data
        'products', 'customers', 'suppliers', 'materials', 'bom', 'staff',
        // Production Flow
        'spk', 'schedule', 'production', 'qc', 'productionResults', 'ptp',
        // Purchasing & Inventory
        'purchaseRequests', 'purchaseOrders', 'grn', 'inventory',
        // Sales & Delivery
        'salesOrders', 'delivery',
        // Notifications
        'productionNotifications', 'deliveryNotifications', 'invoiceNotifications', 'financeNotifications',
        // Finance
        'payments', 'journalEntries', 'accounts', 'invoices', 'expenses', 'operationalExpenses', 'taxRecords',
        // Other
        'audit', 'outbox', 'companySettings',
      ];
      
      const keyMapping: { [key: string]: string[] } = {
        'grn': ['grnPackaging', 'grn'],
        'delivery': ['delivery'],
      };
      
      // Load dari server API
      const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      
      for (const key of keys) {
        try {
          const mappedKeys = keyMapping[key] || [key];
          let dataArray: any[] = [];
          let foundOnServer = false;
          
          // Try to fetch from server for each mapped key
          for (const mappedKey of mappedKeys) {
            try {
              const response = await axios.get(`${apiBaseUrl}/api/storage/${mappedKey}`, {
                timeout: 5000,
              });
              
              if (response.data?.success && response.data?.data?.value) {
                const value = response.data.data.value;
                const extracted = extractStorageValue(value);
                if (extracted.length > 0) {
                  dataArray = extracted;
                  foundOnServer = true;
                  console.log(`[DBActivity] ✅ Loaded ${key} from server (${dataArray.length} items)`);
                  break;
                }
              }
            } catch (error: any) {
              if (error.response?.status !== 404) {
                console.warn(`[DBActivity] Error fetching ${mappedKey} from server:`, error.message);
              }
            }
          }
          
          // Fallback to localStorage if not found on server
          if (!foundOnServer) {
            for (const mappedKey of mappedKeys) {
              const possibleKeys = [`packaging/${mappedKey}`, mappedKey];
              for (const storageKey of possibleKeys) {
                const valueStr = localStorage.getItem(storageKey);
                if (valueStr) {
                  try {
                    const parsed = JSON.parse(valueStr);
                    const extracted = extractStorageValue(parsed);
                    if (extracted.length > 0) {
                      dataArray = extracted;
                      console.log(`[DBActivity] ⚠️ Loaded ${key} from localStorage (server not available)`);
                      break;
                    }
                  } catch (e) {
                    console.warn(`[DBActivity] Error parsing localStorage key ${storageKey}:`, e);
                  }
                }
              }
              if (dataArray.length > 0) break;
            }
          }
          
          const activeDataArray = filterActiveItems(dataArray);
          const deletedCount = dataArray.length - activeDataArray.length;
          console.log(`[DBActivity] Final ${key}: ${dataArray.length} items (${deletedCount} deleted, ${activeDataArray.length} active)`);
          allData[key] = activeDataArray;
          
          if (keyMapping[key]) {
            for (const mappedKey of keyMapping[key]) {
              if (mappedKey !== key) {
                allData[mappedKey] = activeDataArray;
              }
            }
          }
        } catch (error) {
          console.warn(`[DBActivity] Error loading ${key}:`, error);
          allData[key] = [];
        }
      }
      
      setData(allData);
      console.log('[DBActivity] Loaded data from server:', Object.keys(allData).map(k => `${k}: ${allData[k]?.length || 0}`).join(', '));
    } catch (error) {
      console.error('[DBActivity] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedFromBundle = async () => {
    setShowSeedDialog(false);
    setSeedLoading(true);
    setSeedMessage('');

    try {
      setSeedMessage('✗ Import from bundle is not available in this version');
      return;
    } catch (error: any) {
      console.error('Import from bundle error:', error);
      setSeedMessage(`✗ Error: ${error.message || 'Failed to import from bundle'}`);
    } finally {
      setSeedLoading(false);
      setTimeout(() => setSeedMessage(''), 10000);
    }
  };

  const handleSeedFromServer = async (seedType: 'packaging' | 'gt' | 'trucking' = 'packaging') => {
    setShowSeedDialog(false);
    setSeedLoading(true);
    setSeedMessage('');

    try {
      // Determine seed name
      let seedName = 'Packaging';
      if (seedType === 'gt') {
        seedName = 'General Trading';
      } else if (seedType === 'trucking') {
        seedName = 'Trucking';
      }

      setSeedMessage(`🔄 Reading ${seedName} data from data/localStorage/...`);

      // Check if Electron API is available
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI || !electronAPI.readDataFiles) {
        setSeedMessage(`✗ File system access not available. This feature only works in Electron app.`);
        setSeedLoading(false);
        return;
      }

      // Read all data files from data/localStorage/
      const allData = await electronAPI.readDataFiles();
      
      if (!allData || Object.keys(allData).length === 0) {
        setSeedMessage(`✗ No data files found in data/localStorage/ folder.`);
        setSeedLoading(false);
        return;
      }

      // Define keys for each business type
      const packagingKeys = [
        'products', 'customers', 'suppliers', 'materials', 'bom', 'staff',
        'spk', 'schedule', 'production', 'qc', 'productionResults', 'ptp',
        'purchaseRequests', 'purchaseOrders', 'grn', 'grnPackaging', 'inventory',
        'salesOrders', 'delivery',
        'productionNotifications', 'deliveryNotifications', 'invoiceNotifications', 'financeNotifications',
        'payments', 'journalEntries', 'accounts', 'invoices', 'expenses',
        'audit', 'outbox', 'companySettings'
      ];

      const gtKeys = [
        'gt_products', 'gt_customers', 'gt_suppliers',
        'gt_salesOrders', 'gt_purchaseRequests', 'gt_purchaseOrders', 'gt_invoices',
        'gt_grn', 'gt_delivery', 'gt_inventory',
        'gt_deliveryNotifications', 'gt_invoiceNotifications', 'gt_financeNotifications', 'gt_productionNotifications',
        'gt_payments', 'gt_journalEntries', 'gt_accounts', 'gt_expenses',
        'gt_returns', 'gt_spk', 'gt_schedule'
      ];

      const truckingKeys = [
        'trucking_customers', 'trucking_drivers', 'trucking_routes', 'trucking_vehicles',
        'trucking_pettyCash', 'trucking_pettycash_requests',
        'trucking_payments', 'trucking_bills', 'Trucking_bills',
        'trucking_route_plans', 'Trucking_route_plans',
        'trucking_delivery_orders'
      ];

      // Select keys based on seedType
      let keysToImport: string[] = [];
      if (seedType === 'packaging') {
        keysToImport = packagingKeys;
      } else if (seedType === 'gt') {
        keysToImport = gtKeys;
      } else if (seedType === 'trucking') {
        keysToImport = truckingKeys;
      }

      // Filter data based on keys and folder structure
      // readDataFiles returns keys in format:
      // - Root: "products", "customers", etc.
      // - Subfolder: "general-trading/gt_products", "trucking/trucking_customers", etc.
      const dataToImport: Record<string, any> = {};
      
      for (const key of keysToImport) {
        // Try multiple key formats based on folder structure
        const possibleKeys: string[] = [];
        
        if (seedType === 'packaging') {
          // Packaging: root level keys
          possibleKeys.push(key); // "products", "customers", etc.
          possibleKeys.push(`packaging/${key}`); // "packaging/products" (if exists)
        } else if (seedType === 'gt') {
          // GT: from general-trading/ folder
          possibleKeys.push(`general-trading/${key}`); // "general-trading/gt_products"
          possibleKeys.push(key); // "gt_products" (if in root)
          possibleKeys.push(key.replace('gt_', '')); // "products" (without prefix)
        } else if (seedType === 'trucking') {
          // Trucking: from trucking/ folder
          possibleKeys.push(`trucking/${key}`); // "trucking/trucking_customers"
          possibleKeys.push(key); // "trucking_customers" (if in root)
          possibleKeys.push(key.replace('trucking_', '')); // "customers" (without prefix)
        }

        // Find matching key in allData
        for (const possibleKey of possibleKeys) {
          if (allData[possibleKey] !== undefined) {
            dataToImport[key] = allData[possibleKey];
            break;
          }
        }
      }

      if (Object.keys(dataToImport).length === 0) {
        setSeedMessage(`✗ No ${seedName} data found in data/localStorage/ folder.`);
        setSeedLoading(false);
        return;
      }

      setSeedMessage(`🔄 Importing ${Object.keys(dataToImport).length} keys to storage...`);

      // Import each key to storage
      let imported = 0;
      let errors: string[] = [];

      for (const [key, value] of Object.entries(dataToImport)) {
        try {
          // Extract value (handle wrapped format {value, timestamp})
          let dataValue = value;
          if (value && typeof value === 'object' && value.value !== undefined) {
            dataValue = value.value;
          }

          // Save to storage
          await storageService.set(key, dataValue);
          imported++;
        } catch (error: any) {
          const errorMsg = `Error importing ${key}: ${error.message}`;
          errors.push(errorMsg);
        }
      }

      if (imported > 0) {
        const details = errors.length > 0 
          ? ` (${errors.length} errors occurred)` 
          : '';
        setSeedMessage(`✓ ${seedName} seed completed: ${imported} keys imported${details}`);
        
        // Reload data after seed
        setTimeout(() => {
          loadData();
        }, 500);
      } else if (errors.length > 0) {
        const errorMsg = errors.length === 1 
          ? errors[0] 
          : `${errors[0]} (and ${errors.length - 1} more errors)`;
        setSeedMessage(`✗ ${errorMsg}`);
      } else {
        setSeedMessage(`✗ No data imported.`);
      }
    } catch (error: any) {
      setSeedMessage(`✗ Error: ${error.message || 'Failed to seed from data/localStorage/'}`);
    } finally {
      setSeedLoading(false);
      setTimeout(() => setSeedMessage(''), 15000);
    }
  };

  const handleSeedFromFiles = async () => {
    setShowSeedDialog(false);
    setSeedLoading(true);
    setSeedMessage('');

    try {
      setSeedMessage('✗ Import from JSON files is not available in this version');
      return;
    } catch (error: any) {
      console.error('Import from files error:', error);
      setSeedMessage(`✗ Error: ${error.message || 'Failed to import data'}`);
    } finally {
      setSeedLoading(false);
      setTimeout(() => setSeedMessage(''), 10000);
    }
  };

  const handleSeedTruckingFromPC = async () => {
    setShowSeedDialog(false);
    setSeedLoading(true);
    setSeedMessage('');

    try {
      setSeedMessage('✗ Seed trucking from PC is not available in this version');
      return;
    } catch (error: any) {
      console.error('Seed trucking from PC error:', error);
      setSeedMessage(`✗ Error: ${error.message || 'Failed to seed trucking data'}`);
    } finally {
      setSeedLoading(false);
      setTimeout(() => setSeedMessage(''), 10000);
    }
  };

  const handleSeed = async () => {
    setShowSeedDialog(true);
  };

  const handleExport = async () => {
    setExportLoading(true);
    setExportMessage('');

    try {
      setExportMessage('✗ Export is not available in this version');
      return;
    } catch (error: any) {
      console.error('Export error:', error);
      setExportMessage(`✗ Error: ${error.message || 'Failed to export data'}`);
    } finally {
      setExportLoading(false);
      setTimeout(() => setExportMessage(''), 10000);
    }
  };

  const handleImportJson = async (data: any, storageKey: string) => {
    setImportLoading(true);
    setImportMessage('');

    try {
      if (!Array.isArray(data)) {
        throw new Error('Data must be an array');
      }

      console.log(`📥 [Import] Importing ${data.length} items to ${storageKey}`);
      
      // Save to storage using storageService
      await storageService.set(storageKey, data);
      
      setImportMessage(`✓ Successfully imported ${data.length} items to ${storageKey}`);
      console.log(`✅ [Import] Successfully imported ${data.length} items`);
      
      // Reload data after import
      setTimeout(() => {
        loadData();
      }, 500);
    } catch (error: any) {
      console.error('❌ [Import] Error:', error);
      setImportMessage(`✗ Error: ${error.message || 'Failed to import data'}`);
    } finally {
      setImportLoading(false);
      setTimeout(() => setImportMessage(''), 10000);
    }
  };

  const handleBulkImport = async (type: 'products' | 'salesOrders' | 'deliveryNotes' | 'invoices', data: any[]) => {
    setImportLoading(true);
    setImportMessage('');

    try {
      if (!Array.isArray(data)) {
        throw new Error('Data must be an array');
      }

      // Map import type to storage key
      const storageKeyMap: Record<string, string> = {
        'products': 'products',
        'salesOrders': 'salesOrders',
        'deliveryNotes': 'delivery',
        'invoices': 'invoices',
      };

      const storageKey = storageKeyMap[type];
      if (!storageKey) {
        throw new Error(`Unknown import type: ${type}`);
      }

      console.log(`📥 [Bulk Import] Importing ${data.length} ${type} to ${storageKey}`);
      
      // Save to server using API
      const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      await axios.post(`${apiBaseUrl}/api/storage/${storageKey}`, {
        value: data,
      }, {
        timeout: 10000,
      });
      
      setImportMessage(`✓ Successfully imported ${data.length} ${type}`);
      console.log(`✅ [Bulk Import] Successfully imported ${data.length} ${type}`);
      
      // Reload data after import
      setTimeout(() => {
        loadData();
      }, 500);
    } catch (error: any) {
      console.error('❌ [Bulk Import] Error:', error);
      setImportMessage(`✗ Error: ${error.message || 'Failed to import data'}`);
    } finally {
      setImportLoading(false);
      setTimeout(() => setImportMessage(''), 10000);
    }
  };

  const handleClear = () => {
    // Show category selection dialog instead of manual selection
    setShowClearDialog(true);
  };
  
  const handleClearByCategory = (category: string) => {
    // Set selected category untuk show detail items
    setSelectedCategory(category);
    // Pre-select all keys in this category
    const categoryKeys = getCategoryKeys(category);
    setSelectedKeys(new Set(categoryKeys));
  };
  
  const handleClearSelectedItems = async () => {
    console.log('🔍 [Clear] handleClearSelectedItems called, selectedKeys:', selectedKeys.size);
    
    if (selectedKeys.size === 0) {
      showAlert('Pilih minimal 1 item untuk dihapus.', 'No Selection');
      return;
    }
    
    const categoryName = selectedCategory ? 
      selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1).replace(/([A-Z])/g, ' $1') : 
      'Selected Items';
    const confirmMessage = `⚠️ PERINGATAN!\n\nAnda akan menghapus ${selectedKeys.size} item(s) dari kategori: ${categoryName}\n\nItem yang akan dihapus:\n${Array.from(selectedKeys).slice(0, 10).map(k => `• ${k}`).join('\n')}${selectedKeys.size > 10 ? `\n... dan ${selectedKeys.size - 10} item lainnya` : ''}\n\nTindakan ini TIDAK DAPAT DIBATALKAN!\n\nApakah Anda yakin?`;
    
    console.log('🔍 [Clear] Showing confirm dialog with message:', confirmMessage);
    
    const performClear = async () => {
      console.log('🔍 [Clear] User confirmed, starting clear process...');
      setShowClearDialog(false);
      setClearingCategory(selectedCategory);
      setClearLoading(true);
      setClearMessage('');
      
      try {
        const keys = Array.from(selectedKeys);
        console.log('🔍 [Clear] Keys to clear:', keys);
        let cleared = 0;
        let errors: string[] = [];
        
        // Key mapping untuk handle multiple key formats (sama seperti loadData)
        const keyMapping: { [key: string]: string[] } = {
          'grn': ['grnPackaging', 'grn'], // GRN bisa pakai grnPackaging atau grn
          'delivery': ['delivery'], // Delivery uses 'delivery' key only
        };
        
        // Clear from file storage (if Electron)
        const electronAPI = (window as any).electronAPI;
        if (electronAPI && electronAPI.deleteStorage) {
          console.log('🔍 [Clear] Using Electron API to delete storage');
          for (const key of keys) {
            // Get possible key formats
            const possibleKeys = keyMapping[key] || [key];
            
            for (const storageKey of possibleKeys) {
              try {
                await electronAPI.deleteStorage(storageKey);
                console.log(`✅ [Clear] Deleted ${storageKey} from Electron storage`);
              } catch (error: any) {
                // File might not exist, that's okay
                console.warn(`[Clear] File storage delete warning for ${storageKey}:`, error.message);
              }
            }
            
            // Count cleared (only count once per key, not per format)
            cleared++;
          }
        }
        
        // Also clear from localStorage
        console.log('🔍 [Clear] Clearing from localStorage/storageService');
        for (const key of keys) {
          // Get possible key formats
          const possibleKeys = keyMapping[key] || [key];
          
          for (const storageKey of possibleKeys) {
            try {
              // Remove directly from localStorage
              localStorage.removeItem(storageKey);
              console.log(`[Clear] Removed from localStorage: ${storageKey}`);
              
              // Also use storageService.remove for consistency
              await storageService.remove(storageKey);
              
              if (!electronAPI || !electronAPI.deleteStorage) {
                // Count cleared (only count once per key, not per format)
                if (storageKey === possibleKeys[0]) {
                  cleared++;
                }
              }
              console.log(`✅ [Clear] Deleted ${storageKey} from storageService`);
            } catch (error: any) {
              console.error(`❌ [Clear] Error deleting ${storageKey} from storageService:`, error);
              if (!errors.some(e => e.includes(storageKey))) {
                errors.push(`${storageKey}: ${error.message}`);
              }
            }
          }
        }
        
        if (errors.length > 0) {
          setClearMessage(`⚠ Cleared ${cleared} items, but ${errors.length} errors occurred`);
          console.error('Clear errors:', errors);
        } else {
          setClearMessage(`✓ Successfully cleared ${cleared} data items`);
          console.log(`✅ [Clear] Successfully cleared ${cleared} items`);
        }
        
        // Reload data after clear
        setTimeout(() => {
          loadData();
        }, 500);
      } catch (error: any) {
        console.error('❌ [Clear] Error in performClear:', error);
        setClearMessage(`✗ Error: ${error.message || 'Failed to clear data'}`);
      } finally {
        setClearLoading(false);
        setClearingCategory(null);
        setSelectedCategory(null);
        setSelectedKeys(new Set());
        setTimeout(() => setClearMessage(''), 10000);
      }
    };
    
    try {
      showConfirm(
        confirmMessage,
        performClear,
        () => {
          console.log('🔍 [Clear] User cancelled clear');
          setClearingCategory(null);
        },
        'Confirm Clear Selected Items'
      );
    } catch (error: any) {
      console.error('❌ [Clear] Error calling showConfirm:', error);
      showAlert(`Error: ${error.message || 'Failed to show confirmation dialog'}`, 'Error');
    }
  };
  
  const handleClearAllInCategory = (category: string) => {
    setShowClearDialog(false);
    handleClearDatabase(category);
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
      if (electronAPI && electronAPI.deleteStorage) {
        for (const key of keys) {
          try {
            await electronAPI.deleteStorage(key);
            cleared++;
          } catch (error: any) {
            errors.push(`${key}: ${error.message}`);
          }
        }
      }

      // Also clear from localStorage
      for (const key of keys) {
        try {
          await storageService.remove(key);
          if (!electronAPI || !electronAPI.deleteStorage) {
            cleared++;
          }
        } catch (error: any) {
          if (!errors.some(e => e.includes(key))) {
            errors.push(`${key}: ${error.message}`);
          }
        }
      }

      if (errors.length > 0) {
        setClearMessage(`⚠ Cleared ${cleared} items, but ${errors.length} errors occurred`);
        console.error('Clear errors:', errors);
      } else {
        setClearMessage(`✓ Successfully cleared ${cleared} data items`);
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

  const handleClearDatabase = async (category: string) => {
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1');
    const confirmMessage = `⚠️ PERINGATAN!\n\nAnda akan menghapus SEMUA data untuk kategori: ${categoryName}\n\nIni termasuk:\n- Semua transaksi\n- Semua master data\n- Semua notifications\n- Semua history\n\nTindakan ini TIDAK DAPAT DIBATALKAN!\n\nApakah Anda yakin?`;
    
    const performClear = async () => {
      setClearingCategory(category);
      setClearLoading(true);
      setClearMessage('');
      
      try {
        const keys = getCategoryKeys(category);
        let deletedCount = 0;
        let errorCount = 0;

        console.log(`[Clear DB] Starting clear for category: ${category}`);
        console.log(`[Clear DB] Keys to delete:`, keys);

        for (const key of keys) {
          try {
            await storageService.set(key, []);
            deletedCount++;
            console.log(`[Clear DB] ✅ Deleted: ${key}`);
          } catch (error: any) {
            console.error(`[Clear DB] ❌ Error deleting ${key}:`, error);
            errorCount++;
          }
        }

        // Also clear from server if using server storage
        const config = storageService.getConfig();
        if (config.type === 'server' && config.serverUrl) {
          console.log(`[Clear DB] Syncing deletions to server...`);
          try {
            // Delete from server
            for (const key of keys) {
              try {
                await fetch(`${config.serverUrl}/api/storage/${key}`, {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' }
                });
              } catch (error) {
                console.warn(`[Clear DB] Warning: Could not delete ${key} from server:`, error);
              }
            }
          } catch (error) {
            console.error(`[Clear DB] Error syncing to server:`, error);
          }
        }

        const message = `✅ Database cleared!\n\nCategory: ${categoryName}\nDeleted: ${deletedCount} keys\nErrors: ${errorCount}`;
        setClearMessage(`✓ Cleared ${categoryName}: ${deletedCount} keys deleted`);
        console.log(`[Clear DB] ${message}`);

        // Reload data to reflect changes
        if (deletedCount > 0) {
          setTimeout(() => {
            loadData();
          }, 500);
        }
      } catch (error: any) {
        console.error(`[Clear DB] Fatal error:`, error);
        setClearMessage(`✗ Error clearing database: ${error.message}`);
      } finally {
        setClearingCategory(null);
        setClearLoading(false);
        setTimeout(() => setClearMessage(''), 10000);
      }
    };

    // Double confirmation
    showConfirm(
      `⚠️ KONFIRMASI KEDUA!\n\nAnda benar-benar yakin ingin menghapus SEMUA data ${categoryName}?\n\nKetik OK untuk melanjutkan.`,
      performClear,
      undefined,
      'Final Confirmation'
    );
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
            variant="secondary" 
            onClick={() => setShowImportDialog(true)}
            disabled={importLoading}
            style={{ marginLeft: '8px' }}
          >
            {importLoading ? 'Importing...' : 'Import JSON'}
          </Button>
          <Button 
            variant="primary" 
            onClick={() => setShowBulkImportDialog(true)}
            disabled={importLoading}
            style={{ marginLeft: '8px' }}
          >
            📥 Bulk Import CSV
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
          {importMessage && (
            <span style={{ 
              color: importMessage.startsWith('✓') ? 'var(--success)' : 'var(--error)',
              fontSize: '13px',
              marginLeft: '8px'
            }}>
              {importMessage}
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
              {/* Selection and Delete Controls */}
              {selectedItemIds.size > 0 && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '12px',
                  padding: '12px',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)'
                }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>
                    {selectedItemIds.size} item(s) selected
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      variant="secondary"
                      onClick={() => setSelectedItemIds(new Set())}
                      disabled={deleteLoading}
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      Clear Selection
                    </Button>
                    <Button
                      variant="danger"
                      onClick={handleDeleteSelected}
                      disabled={deleteLoading}
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      {deleteLoading ? 'Deleting...' : `Delete Selected (${selectedItemIds.size})`}
                    </Button>
                  </div>
                </div>
              )}

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
                data={Array.isArray(getCurrentData()) ? getCurrentData() : []} 
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
                  onClick={handleSeedFromBundle}
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
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>📦 Dari Bundle (Recommended)</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Import data dari bundle yang sudah di-bundle ke aplikasi. Cocok untuk aplikasi yang sudah di-build.
                  </div>
                </button>

                <button
                  onClick={() => handleSeedFromServer('packaging')}
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
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>📁 Dari data/localStorage/ - Packaging</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Import data Packaging dari folder data/localStorage/ di project. Membaca file JSON sesuai key bisnis.
                  </div>
                </button>

                <button
                  onClick={() => handleSeedFromServer('gt')}
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
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>📁 Dari data/localStorage/ - General Trading</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Import data General Trading dari folder data/localStorage/general-trading/ di project. Membaca file JSON sesuai key bisnis.
                  </div>
                </button>

                <button
                  onClick={() => handleSeedFromServer('trucking')}
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
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>📁 Dari data/localStorage/ - Trucking</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Import data Trucking dari folder data/localStorage/trucking/ di project. Membaca file JSON sesuai key bisnis.
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

                {typeof window !== 'undefined' && window.electronAPI && (
                  <button
                    onClick={handleSeedTruckingFromPC}
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
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>📥 Seed Trucking dari PC Utama</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Import data trucking dari PC utama: D:\trimalaksanaapps\PT.Trima Laksana Jaya Pratama\docker\data\localstorage\trucking
                    </div>
                  </button>
                )}
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
                if (dialogState.onConfirm) {
                  dialogState.onConfirm();
                }
                closeDialog(); // Always close dialog after action
              }}>
                {dialogState.type === 'alert' ? 'OK' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Clear Dialog dengan Category Selection dan Detail Items */}
      {showClearDialog && (
        <div className="dialog-overlay" onClick={() => {
          setShowClearDialog(false);
          setSelectedCategory(null);
          setSelectedKeys(new Set());
        }} style={{ zIndex: 10000 }}>
          <div className="dialog-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
            {!selectedCategory ? (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    🗑️ Clear Database per Category
                  </h3>
                </div>
                
                <div style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Pilih kategori untuk melihat detail items yang bisa dihapus. <strong style={{ color: 'var(--error)' }}>TIDAK DAPAT DIBATALKAN!</strong>
                </div>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '12px',
                  marginBottom: '16px'
                }}>
                  <Button
                    onClick={() => handleClearByCategory('packaging')}
                    variant="danger"
                    disabled={!!clearingCategory || clearLoading}
                    style={{ 
                      backgroundColor: 'var(--error)',
                      color: 'white'
                    }}
                  >
                    📦 Packaging
                  </Button>
                  
                  <Button
                    onClick={() => handleClearByCategory('generalTrading')}
                    variant="danger"
                    disabled={!!clearingCategory || clearLoading}
                    style={{ 
                      backgroundColor: 'var(--error)',
                      color: 'white'
                    }}
                  >
                    🛒 General Trading
                  </Button>
                  
                  <Button
                    onClick={() => handleClearByCategory('trucking')}
                    variant="danger"
                    disabled={!!clearingCategory || clearLoading}
                    style={{ 
                      backgroundColor: 'var(--error)',
                      color: 'white'
                    }}
                  >
                    🚚 Trucking
                  </Button>
                  
                  <Button
                    onClick={() => handleClearByCategory('finance')}
                    variant="danger"
                    disabled={!!clearingCategory || clearLoading}
                    style={{ 
                      backgroundColor: 'var(--error)',
                      color: 'white'
                    }}
                  >
                    💰 Finance
                  </Button>
                  
                  <Button
                    onClick={() => handleClearByCategory('master')}
                    variant="danger"
                    disabled={!!clearingCategory || clearLoading}
                    style={{ 
                      backgroundColor: 'var(--error)',
                      color: 'white'
                    }}
                  >
                    📋 Master Data
                  </Button>
                  
                  <Button
                    onClick={() => handleClearAllInCategory('all')}
                    variant="danger"
                    disabled={!!clearingCategory || clearLoading}
                    style={{ 
                      backgroundColor: '#8b0000',
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  >
                    ⚠️ Clear ALL
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    🗑️ Clear: {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1).replace(/([A-Z])/g, ' $1')}
                  </h3>
                  <Button 
                    variant="secondary" 
                    onClick={() => {
                      setSelectedCategory(null);
                      setSelectedKeys(new Set());
                    }}
                    style={{ fontSize: '12px', padding: '4px 8px' }}
                  >
                    ← Back
                  </Button>
                </div>
                
                <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    Pilih items yang ingin dihapus ({selectedKeys.size} selected)
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const categoryKeys = getCategoryKeys(selectedCategory);
                      if (selectedKeys.size === categoryKeys.length) {
                        setSelectedKeys(new Set());
                      } else {
                        setSelectedKeys(new Set(categoryKeys));
                      }
                    }}
                    style={{ fontSize: '12px', padding: '4px 8px' }}
                  >
                    {selectedKeys.size === getCategoryKeys(selectedCategory).length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                
                <div style={{ 
                  maxHeight: '400px', 
                  overflowY: 'auto', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '8px',
                  padding: '8px',
                  marginBottom: '16px',
                  backgroundColor: 'var(--bg-secondary)'
                }}>
                  {getCategoryKeys(selectedCategory).map((key) => {
                    // Key mapping untuk handle multiple key formats (sama seperti loadData)
                    const keyMapping: { [key: string]: string[] } = {
                      'grn': ['grnPackaging', 'grn'], // GRN bisa pakai grnPackaging atau grn
                      'delivery': ['delivery'], // Delivery uses 'delivery' key only
                    };
                    
                    // Get mapped keys if exists, otherwise use original key
                    const mappedKeys = keyMapping[key] || [key];
                    
                    // Try to get data from mapped keys
                    let keyData: any[] = [];
                    for (const mappedKey of mappedKeys) {
                      if (data[mappedKey] && Array.isArray(data[mappedKey]) && data[mappedKey].length > 0) {
                        keyData = data[mappedKey];
                        break;
                      }
                    }
                    
                    const itemCount = Array.isArray(keyData) ? keyData.length : (keyData ? 1 : 0);
                    return (
                      <div 
                        key={key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px',
                          borderBottom: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          backgroundColor: selectedKeys.has(key) ? 'var(--bg-tertiary)' : 'transparent',
                          borderRadius: '4px',
                          marginBottom: '4px'
                        }}
                        onClick={() => {
                          const newSet = new Set(selectedKeys);
                          if (newSet.has(key)) {
                            newSet.delete(key);
                          } else {
                            newSet.add(key);
                          }
                          setSelectedKeys(newSet);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedKeys.has(key)}
                          onChange={() => {
                            const newSet = new Set(selectedKeys);
                            if (newSet.has(key)) {
                              newSet.delete(key);
                            } else {
                              newSet.add(key);
                            }
                            setSelectedKeys(newSet);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{ marginRight: '12px', cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{key}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div style={{ 
                  marginTop: '16px', 
                  padding: '12px', 
                  backgroundColor: 'var(--bg-secondary)', 
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)'
                }}>
                  <strong style={{ color: 'var(--error)' }}>⚠️ PERINGATAN:</strong>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>Data yang dihapus TIDAK DAPAT DIPULIHKAN</li>
                    <li>Pastikan Anda sudah backup data penting</li>
                    <li>Clear akan menghapus data di local dan server (jika menggunakan server storage)</li>
                  </ul>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <Button variant="secondary" onClick={() => {
                    setShowClearDialog(false);
                    setSelectedCategory(null);
                    setSelectedKeys(new Set());
                  }}>
                    Cancel
                  </Button>
                  <Button 
                    variant="danger" 
                    onClick={() => {
                      console.log('🔍 [Clear] Button clicked, selectedKeys:', selectedKeys.size);
                      handleClearSelectedItems();
                    }}
                    disabled={selectedKeys.size === 0 || clearLoading || !!clearingCategory}
                    style={{
                      opacity: (selectedKeys.size === 0 || clearLoading || !!clearingCategory) ? 0.5 : 1,
                      cursor: (selectedKeys.size === 0 || clearLoading || !!clearingCategory) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {clearLoading || clearingCategory ? 'Clearing...' : `Clear ${selectedKeys.size} Selected`}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <ImportJsonDialog
        show={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleImportJson}
      />

      <BulkImportDialog
        show={showBulkImportDialog}
        onClose={() => setShowBulkImportDialog(false)}
        onImport={handleBulkImport}
        loading={importLoading}
      />
    </div>
  );
};

export default DBActivity;
