import { useState, useEffect, useMemo, useRef } from 'react';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import DateRangeFilter from '../../../components/DateRangeFilter';
import NotificationBell from '../../../components/NotificationBell';
import { storageService, StorageKeys } from '../../../services/storage';
import { loadGTDataFromLocalStorage } from '../../../utils/gtStorageHelper';
import { generateInvoiceHtml } from '../../../pdf/invoice-pdf-template';
import { openPrintWindow } from '../../../utils/actions';
import { loadLogoAsBase64 } from '../../../utils/logo-loader';
import { useLanguage } from '../../../hooks/useLanguage';
import { CreateInvoiceForm } from './CreateInvoiceForm';
import { EditInvoiceForm } from './EditInvoiceForm';
import '../../../styles/common.css';

const Accounting = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'invoices' | 'expenses'>('invoices');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [invoiceNotifications, setInvoiceNotifications] = useState<any[]>([]);
  const [viewPdfData, setViewPdfData] = useState<{ html: string; invoiceNo: string; invoiceDate?: string } | null>(null);
  
  // Format notifications untuk NotificationBell
  const invoiceNotifBell = useMemo(() => {
    return invoiceNotifications.map((notif: any) => ({
      id: notif.id,
      title: `Delivery ${notif.sjNo || 'N/A'}`,
      message: `SO: ${notif.soNo || 'N/A'} | Customer: ${notif.customer || 'N/A'}`,
      timestamp: notif.created || notif.timestamp,
      notif: notif, // Keep original data
    }));
  }, [invoiceNotifications]);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null);
  const [viewSJData, setViewSJData] = useState<{ signedDocument: string; signedDocumentName: string; sjNo: string } | null>(null);
  const [viewPaymentProofData, setViewPaymentProofData] = useState<{ paymentProof: string; paymentProofName: string; invoiceNo: string } | null>(null);
  const [signatureViewer, setSignatureViewer] = useState<{ 
    data: string; 
    fileName: string; 
    isPDF: boolean;
  } | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [updatingInvoice, setUpdatingInvoice] = useState<any | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCreateInvoiceDialog, setShowCreateInvoiceDialog] = useState(false);
  const [createMode, setCreateMode] = useState<'sj' | 'so' | 'manual'>('manual');
  const [manualInvoiceData, setManualInvoiceData] = useState({
    customer: '',
    invoiceNo: '',
    soNo: '',
    items: [],
    discount: 0,
    taxPercent: 11,
    dpPercent: 0,
    notes: '',
  });
  
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
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timeout);
  }, [toast]);

  const showToast = (message: string, variant: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, variant });
  };

  useEffect(() => {
    loadData();
    // Refresh setiap 2 detik untuk cek notifikasi baru
    const interval = setInterval(() => {
      loadData();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    // Load langsung dari localStorage untuk memastikan data terbaru
    const inv = await loadGTDataFromLocalStorage<any>(
      StorageKeys.GENERAL_TRADING.INVOICES,
      async () => await storageService.get<any[]>(StorageKeys.GENERAL_TRADING.INVOICES) || []
    );
    const exp = await loadGTDataFromLocalStorage<any>(
      StorageKeys.GENERAL_TRADING.EXPENSES,
      async () => await storageService.get<any[]>(StorageKeys.GENERAL_TRADING.EXPENSES) || []
    );
    const notifs = await loadGTDataFromLocalStorage<any>(
      StorageKeys.GENERAL_TRADING.INVOICE_NOTIFICATIONS,
      async () => await storageService.get<any[]>(StorageKeys.GENERAL_TRADING.INVOICE_NOTIFICATIONS) || []
    );
    console.log(`[Invoices] Loaded notifications: ${Array.isArray(notifs) ? notifs.length : 0} items`, notifs);
    const cust = await loadGTDataFromLocalStorage<any>(
      StorageKeys.GENERAL_TRADING.CUSTOMERS,
      async () => await storageService.get<any[]>(StorageKeys.GENERAL_TRADING.CUSTOMERS) || []
    );
    // Load langsung dari localStorage untuk memastikan data terbaru
    let prod = await loadGTDataFromLocalStorage<any>(
      StorageKeys.GENERAL_TRADING.PRODUCTS,
      async () => await storageService.get<any[]>(StorageKeys.GENERAL_TRADING.PRODUCTS) || []
    );
    const so = await loadGTDataFromLocalStorage<any>(
      StorageKeys.GENERAL_TRADING.SALES_ORDERS,
      async () => await storageService.get<any[]>(StorageKeys.GENERAL_TRADING.SALES_ORDERS) || []
    );
    const dn = await loadGTDataFromLocalStorage<any>(
      StorageKeys.GENERAL_TRADING.DELIVERY,
      async () => await storageService.get<any[]>(StorageKeys.GENERAL_TRADING.DELIVERY) || []
    );
    
    // Debug: Log products loading
    console.log(`[Invoices] Loaded products: ${prod.length} items`);
    if (prod.length === 0) {
      console.warn('[Invoices] ⚠️ Products array is empty! Trying force reload from file...');
      const fileData = await storageService.forceReloadFromFile<any[]>(StorageKeys.GENERAL_TRADING.PRODUCTS);
      if (fileData && Array.isArray(fileData) && fileData.length > 0) {
        console.log(`[Invoices] ✅ Force reload successful: ${fileData.length} products from file`);
        prod = fileData;
      } else {
        console.warn('[Invoices] ❌ Force reload failed - no products available');
      }
    }
    
    setInvoices(inv);
    setExpenses(exp);
    
    // Auto-cleanup: Hapus notifications yang sudah dibuat invoice atau status PROCESSED
    // Ensure notifs and inv are always arrays
    const notifsArray = Array.isArray(notifs) ? notifs : [];
    const invArray = Array.isArray(inv) ? inv : [];
    
    // Fix: Recalculate tax for invoices that don't have it
    const fixedInvoices = invArray.map((invoice: any) => {
      if (invoice.bom && invoice.bom.tax === undefined) {
        const subtotal = invoice.bom.subtotal || 0;
        const discount = invoice.bom.discount || 0;
        const taxPercent = invoice.bom.taxPercent || 11;
        const calculatedTax = Math.round((subtotal - discount) * (taxPercent / 100));
        
        console.log(`[Invoices] Recalculating tax for invoice ${invoice.invoiceNo}: tax=${calculatedTax}`);
        
        return {
          ...invoice,
          bom: {
            ...invoice.bom,
            tax: calculatedTax,
          }
        };
      }
      return invoice;
    });
    
    // Save fixed invoices if any were modified
    if (JSON.stringify(fixedInvoices) !== JSON.stringify(invArray)) {
      await storageService.set(StorageKeys.GENERAL_TRADING.INVOICES, fixedInvoices);
      console.log(`✅ Fixed ${fixedInvoices.filter((inv: any, idx: number) => invArray[idx]?.bom?.tax === undefined).length} invoices with missing tax`);
    }
    
    const cleanedNotifs = notifsArray.filter((n: any) => {
      // Debug: Log all notifications
      console.log(`[Invoices] Checking notification:`, {
        id: n.id,
        type: n.type,
        sjNo: n.sjNo,
        soNo: n.soNo,
        status: n.status,
      });
      
      // Hapus jika sudah ada invoice untuk SO/SJ ini
      const existingInvoice = fixedInvoices.find((i: any) => i.soNo === n.soNo && i.sjNo === n.sjNo);
      if (existingInvoice) {
        console.log(`[Invoices] ❌ Removing notification - invoice already exists for SO ${n.soNo} SJ ${n.sjNo}`);
        return false;
      }
      
      // Hapus jika status sudah PROCESSED
      if (n.status === 'PROCESSED') {
        console.log(`[Invoices] ❌ Removing notification - status is PROCESSED`);
        return false;
      }
      
      console.log(`[Invoices] ✅ Keeping notification - will show in bell`);
      return true;
    });
    
    // Update notifications di storage (cleanup yang sudah tidak relevan)
    if (JSON.stringify(cleanedNotifs) !== JSON.stringify(notifsArray)) {
      await storageService.set(StorageKeys.GENERAL_TRADING.INVOICE_NOTIFICATIONS, cleanedNotifs);
      console.log(`🧹 Cleaned up ${notifsArray.length - cleanedNotifs.length} obsolete invoice notifications`);
    }
    
    // Filter notifications yang belum dibuat invoice (status PENDING)
    const pendingNotifs = cleanedNotifs.filter((n: any) => n.status === 'PENDING');
    setInvoiceNotifications(pendingNotifs);
    setCustomers(cust);
    setProducts(prod);
    setSalesOrders(so);
    setDeliveryNotes(dn);
  };

  // Calculate COGS (Cost of Goods Sold) dari PO price
  // Best practice: COGS = purchase cost dari PO (GT tidak ada BOM)
  const calculateCOGS = async (so: any, invoiceLines: any[]): Promise<number> => {
    try {
      const [purchaseOrders] = await Promise.all([
        storageService.get<any[]>(StorageKeys.GENERAL_TRADING.PURCHASE_ORDERS) || [],
      ]);

      if (!purchaseOrders) {
        return 0;
      }

      let totalCOGS = 0;

      // Loop setiap product di invoice
      for (const line of invoiceLines) {
        const productId = (line.itemSku || '').toString().trim();
        const qty = Number(line.qty || 0);

        if (qty <= 0) continue;

        // Cari PO untuk product ini yang terkait dengan SO
        // Di GT, productId di PO = productId
        // Ensure purchaseOrders is always an array
        const purchaseOrdersArray = Array.isArray(purchaseOrders) ? purchaseOrders : [];
        const relatedPO = purchaseOrdersArray.find((po: any) => 
          po.soNo === so.soNo && 
          ((po.productId || '').toString().trim().toLowerCase() === productId.toLowerCase() ||
           (po.productItem || '').toString().trim().toLowerCase() === productId.toLowerCase()) &&
          (po.status === 'OPEN' || po.status === 'CLOSE')
        );

        if (relatedPO && relatedPO.total > 0 && relatedPO.qty > 0) {
          // Gunakan harga dari PO (actual cost)
          const costPerUnit = relatedPO.total / relatedPO.qty;
          totalCOGS += qty * costPerUnit;
        }
      }

      return Math.round(totalCOGS);
    } catch (error: any) {
      console.error('Error calculating COGS:', error);
      return 0; // Return 0 jika error (non-blocking)
    }
  };

  // Handler untuk create invoice dari form
  const handleCreateInvoiceSuccess = async (newInvoice: any) => {
    await loadData();
    setShowCreateInvoiceDialog(false);
    setManualInvoiceData({
      customer: '',
      invoiceNo: '',
      soNo: '',
      items: [],
      discount: 0,
      taxPercent: 11,
      dpPercent: 0,
      notes: '',
    });
    showToast(`✅ Invoice ${newInvoice.invoiceNo} created successfully`, 'success');
  };

  const handleEditInvoiceSuccess = async (updatedInvoice: any) => {
    await loadData();
    setEditingInvoice(null);
    showToast(`✅ Invoice ${updatedInvoice.invoiceNo} updated successfully`, 'success');
  };

  // Invoice Actions
  const handleCreateInvoice = async (item: any) => {
    // Handle dari notification atau dari item langsung
    // Ensure invoiceNotifications is always an array
    const invoiceNotificationsArray = Array.isArray(invoiceNotifications) ? invoiceNotifications : [];
    const notif = invoiceNotificationsArray.find((n: any) => n.soNo === item.soNo && n.sjNo === item.sjNo);
    const deliveryList = await storageService.get<any[]>(StorageKeys.GENERAL_TRADING.DELIVERY) || [];
    // Ensure deliveryList is always an array
    const deliveryListArray = Array.isArray(deliveryList) ? deliveryList : [];
    const delivery = deliveryListArray.find((d: any) => 
      d.soNo === item.soNo && (d.status === 'OPEN' || d.status === 'CLOSE')
    );
    
    if (!delivery) {
      showAlert(`Cannot create Invoice for SO: ${item.soNo}\n\nDelivery Note must be created and OPEN/CLOSE first.\n\nPlease create Delivery Note from QC PASS items first.`, 'Validation Error');
      return;
    }
    
    // Cek apakah invoice sudah ada
    // Ensure invoices is always an array
    const invoicesArray = Array.isArray(invoices) ? invoices : [];
    const existingInvoice = invoicesArray.find((inv: any) => inv.soNo === item.soNo && inv.sjNo === delivery.sjNo);
    if (existingInvoice) {
      showAlert(`Invoice already exists for SO: ${item.soNo}\n\nInvoice No: ${existingInvoice.invoiceNo}`, 'Information');
      return;
    }
    
    // Ensure salesOrders is always an array
    const salesOrdersArray = Array.isArray(salesOrders) ? salesOrders : [];
    const so = salesOrdersArray.find((s: any) => s.soNo === item.soNo);
    if (!so) {
      showAlert(`SO ${item.soNo} not found`, 'Error');
      return;
    }

    // Prepare invoice lines dari delivery items (lebih akurat karena sesuai dengan yang dikirim)
    const invoiceLines: any[] = [];
    
    // Load inventory sekali di luar loop
    const inventory = await storageService.get<any[]>(StorageKeys.GENERAL_TRADING.INVENTORY) || [];
    
    // Prioritaskan dari delivery.items
    if (delivery.items && Array.isArray(delivery.items) && delivery.items.length > 0) {
      for (const deliveryItem of delivery.items) {
        // Cari product berdasarkan nama product di delivery
        // Ensure products is always an array
        const productsArray = Array.isArray(products) ? products : [];
        const product = productsArray.find((p: any) => 
          p.nama === deliveryItem.product || 
          p.sku === deliveryItem.product ||
          p.kode === deliveryItem.product ||
          p.id === deliveryItem.product ||
          (p.description && p.description === deliveryItem.product)
        );
        
        // Cari juga di inventory
        // Ensure inventory is always an array
        const inventoryArray = Array.isArray(inventory) ? inventory : [];
        const invItem = inventoryArray.find((inv: any) => 
          inv.description === deliveryItem.product ||
          inv.codeItem === deliveryItem.product
        );
        
        // Ambil itemSku dari product atau inventory
        const itemSku = product?.sku || product?.kode || product?.id || 
                       invItem?.codeItem || invItem?.sku || invItem?.kode || 
                       deliveryItem.product || '';
        
        // Cari harga dari SO item yang sesuai (berdasarkan product name atau itemSku)
        // Ensure so.items is always an array
        const soItemsArray = Array.isArray(so.items) ? so.items : [];
        const soItem = soItemsArray.find((si: any) => 
          si.productName === deliveryItem.product ||
          si.itemSku === itemSku ||
          si.itemSku === product?.sku ||
          si.itemSku === product?.kode
        );
        
        const price = soItem?.price || soItem?.unitPrice || 
                     product?.hargaJual || product?.hargaFg || product?.hargaSales || 
                     invItem?.price || 0;
        const qty = Number(deliveryItem.qty || 0);
        
        invoiceLines.push({
          itemSku: itemSku,
          qty: qty,
          price: price,
          soNo: item.soNo || delivery.soNo || so.soNo || '', // Simpan SO number jika ada
        });
      }
    } 
    // Fallback ke SO items jika delivery.items tidak ada
    else if (so.items && Array.isArray(so.items) && so.items.length > 0) {
      // Ensure products is always an array
      const productsArray = Array.isArray(products) ? products : [];
      so.items.forEach((soItem: any) => {
        const product = productsArray.find((p: any) => 
          p.id === soItem.productId || 
          p.id === soItem.productKode ||
          p.sku === soItem.productKode || 
          p.kode === soItem.productKode ||
          p.nama === soItem.productName
        );
        
        const price = soItem.price || soItem.unitPrice || product?.hargaJual || product?.hargaFg || product?.hargaSales || 0;
        const qty = Number(soItem.qty || 0);
        
        invoiceLines.push({
          itemSku: soItem.productKode || soItem.productId || product?.sku || product?.kode || product?.id || soItem.productName || '',
          productName: soItem.productName || product?.nama || '',
          qty: qty,
          price: price,
          soNo: so.soNo || item.soNo || '', // Simpan SO number jika ada
        });
      });
    }
    // Fallback ke notification items jika tidak ada delivery dan SO items
    else if (notif && notif.items && Array.isArray(notif.items)) {
      // Ensure products is always an array
      const productsArray = Array.isArray(products) ? products : [];
      notif.items.forEach((notifItem: any) => {
        const product = productsArray.find((p: any) => 
          p.nama === notifItem.product || 
          p.sku === notifItem.product ||
          p.kode === notifItem.product
        );
        const price = product?.hargaJual || product?.hargaFg || product?.hargaSales || 0;
        invoiceLines.push({
          itemSku: product?.sku || product?.kode || product?.id || notifItem.product || '',
          qty: Number(notifItem.qty || 0),
          price: price,
          soNo: notifItem.soNo || item.soNo || '', // Simpan SO number jika ada
        });
      });
    }

    // Ensure invoiceLines is always an array
    const invoiceLinesArray = Array.isArray(invoiceLines) ? invoiceLines : [];
    const subtotal = invoiceLinesArray.reduce((sum: number, line: any) => 
      sum + (Number(line.qty || 0) * Number(line.price || 0)), 0
    );
    
    // Show confirmation dialog
    showConfirm(
      `Create Invoice for SO: ${item.soNo}?\n\nPO Customer No: ${notif?.poCustomerNo || item.poCustomerNo || '-'}\nSPK No: ${notif?.spkNos || item.spkNos || '-'}\nFrom Delivery: ${delivery.sjNo}\n\nCustomer: ${item.customer || notif?.customer}\nTotal Qty: ${notif?.totalQty || item.totalQty || 0} PCS`,
      async () => {
        await proceedWithInvoiceCreation();
      },
      () => {},
      'Create Invoice Confirmation'
    );
    
    async function proceedWithInvoiceCreation() {
    try {
      // invoicesArray already declared above
      const invoiceNo = `INV-${new Date().getFullYear()}${String(invoicesArray.length + 1).padStart(6, '0')}`;
      const newInvoice = {
        id: Date.now().toString(),
        invoiceNo,
        soNo: item.soNo,
        soId: so.id,
        sjNo: delivery.sjNo,
        customer: item.customer || notif?.customer,
        lines: invoiceLines,
        bom: {
          subtotal: subtotal,
          discount: 0,
          discountPercent: 0,
          tax: 0,
          taxPercent: 0,
          biayaLain: 0,
          total: subtotal,
          paymentTerms: so.paymentTerms || 'TOP',
          poData: {
            topDays: so.topDays || 30,
          },
          sjNo: delivery.sjNo,
          soNo: item.soNo,
          soId: so.id,
        },
        paymentTerms: so.paymentTerms || 'TOP',
        topDays: so.topDays || 30,
        status: 'OPEN',
        created: new Date().toISOString(),
      };
      
      // invoicesArray already declared above
      const updated = [...invoicesArray, newInvoice];
      await storageService.set(StorageKeys.GENERAL_TRADING.INVOICES, updated);
      setInvoices(updated);

      // Auto-create journal entries untuk General Ledger
      let cogsAmount = 0; // Simpan untuk ditampilkan di alert (scope di luar try-catch)
      try {
            const journalEntries = await storageService.get<any[]>(StorageKeys.GENERAL_TRADING.JOURNAL_ENTRIES) || [];
        const accounts = await storageService.get<any[]>(StorageKeys.GENERAL_TRADING.ACCOUNTS) || [];
        
        // Pastikan accounts ada
        // Ensure accounts is always an array
        const accountsArray = Array.isArray(accounts) ? accounts : [];
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
        }
        
        const entryDate = newInvoice.created ? new Date(newInvoice.created).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        // accountsArray already declared above
        const arAccount = accountsArray.find((a: any) => a.code === '1100') || { code: '1100', name: 'Accounts Receivable' };
        const revenueAccount = accountsArray.find((a: any) => a.code === '4000') || { code: '4000', name: 'Sales Revenue' };
        
        // Use bom.total (final amount) instead of subtotal
        const invoiceTotal = newInvoice.bom?.total || subtotal;
        
        const hasEntry = (account: string, debit: number, credit: number) =>
          journalEntries.some((entry: any) =>
            entry.reference === invoiceNo &&
            entry.account === account &&
            entry.debit === debit &&
            entry.credit === credit
          );

        const entriesToAdd: any[] = [];
        if (!hasEntry('1100', invoiceTotal, 0)) {
          entriesToAdd.push({
            entryDate,
            reference: invoiceNo,
            account: '1100',
            accountName: arAccount.name,
            debit: invoiceTotal,
            credit: 0,
            description: `Invoice ${invoiceNo} - ${newInvoice.customer}`,
          });
        }
        if (!hasEntry('4000', 0, invoiceTotal)) {
          entriesToAdd.push({
            entryDate,
            reference: invoiceNo,
            account: '4000',
            accountName: revenueAccount.name,
            debit: 0,
            credit: invoiceTotal,
            description: `Invoice ${invoiceNo} - ${newInvoice.customer}`,
          });
        }

        if (entriesToAdd.length > 0) {
          // Ensure journalEntries is always an array
          const journalEntriesArray = Array.isArray(journalEntries) ? journalEntries : [];
          const baseLength = journalEntriesArray.length;
          const entriesWithNo = entriesToAdd.map((entry, idx) => ({
            ...entry,
            id: `${Date.now()}-${idx + 1}`,
            no: baseLength + idx + 1,
          }));
          await storageService.set(StorageKeys.GENERAL_TRADING.JOURNAL_ENTRIES, [...journalEntriesArray, ...entriesWithNo]);
        }

        // Auto-create COGS journal entry (Debit COGS, Credit Inventory)
        // Best practice: COGS di-recognize saat revenue di-recognize (invoice dibuat)
        try {
          cogsAmount = await calculateCOGS(so, invoiceLines);
          
          if (cogsAmount > 0) {
            // accountsArray already declared above
            const cogsAccount = accountsArray.find((a: any) => a.code === '5000') || { code: '5000', name: 'Cost of Goods Sold' };
            const inventoryAccount = accountsArray.find((a: any) => a.code === '1200') || { code: '1200', name: 'Inventory' };
            
            // Cek apakah sudah ada COGS entry untuk invoice ini (prevent duplicate)
            const hasCOGSEntry = journalEntries.some((entry: any) =>
              entry.reference === invoiceNo &&
              entry.account === '5000'
            );

            if (!hasCOGSEntry) {
              const cogsEntries = [
                {
                  entryDate,
                  reference: invoiceNo,
                  account: '5000',
                  accountName: cogsAccount.name,
                  debit: cogsAmount,
                  credit: 0,
                  description: `COGS for Invoice ${invoiceNo} - ${newInvoice.customer}`,
                },
                {
                  entryDate,
                  reference: invoiceNo,
                  account: '1200',
                  accountName: inventoryAccount.name,
                  debit: 0,
                  credit: cogsAmount,
                  description: `COGS for Invoice ${invoiceNo} - ${newInvoice.customer}`,
                },
              ];

              const currentEntries = await storageService.get<any[]>(StorageKeys.GENERAL_TRADING.JOURNAL_ENTRIES) || [];
              const baseLength = currentEntries.length;
              const cogsEntriesWithNo = cogsEntries.map((entry, idx) => ({
                ...entry,
                id: `${Date.now()}-cogs-${idx + 1}`,
                no: baseLength + idx + 1,
              }));

              await storageService.set(StorageKeys.GENERAL_TRADING.JOURNAL_ENTRIES, [...currentEntries, ...cogsEntriesWithNo]);
              console.log(`✅ COGS journal entries created for Invoice ${invoiceNo}: COGS +${cogsAmount}, Inventory -${cogsAmount}`);
            }
          }
        } catch (error: any) {
          console.error('Error creating COGS journal entries:', error);
          // Jangan block proses, hanya log error (non-blocking)
        }
      } catch (error: any) {
        console.error('Error creating journal entries:', error);
        // Jangan block proses, hanya log error
      }

      // Update notification status
      if (notif) {
        // invoiceNotificationsArray already declared above
        const updatedNotifs = invoiceNotificationsArray.map((n: any) =>
          n.id === notif.id ? { ...n, status: 'PROCESSED' } : n
        );
        await storageService.set(StorageKeys.GENERAL_TRADING.INVOICE_NOTIFICATIONS, updatedNotifs);
        setInvoiceNotifications(updatedNotifs.filter((n: any) => n.status === 'PENDING'));
      }

      // Tampilkan alert dengan COGS info (gunakan cogsAmount yang sudah dihitung di atas)
      const cogsMessage = cogsAmount > 0 
        ? `\n✅ COGS journal entries created (COGS: Rp ${cogsAmount.toLocaleString('id-ID')})`
        : `\n⚠️ COGS tidak dapat dihitung (PO tidak ditemukan atau purchase cost tidak tersedia)`;
      
      showAlert(`✅ Invoice created: ${invoiceNo}\n\nFrom Delivery: ${delivery.sjNo}\n✅ AR + Revenue journal entries created${cogsMessage}`, 'Success');
      await loadData();
    } catch (error: any) {
      showAlert(`Error creating invoice: ${error.message}`, 'Error');
    }
    }
  };


  const handleEditInvoice = (item: any) => {
    setEditingInvoice(item);
  };

  const handleUpdateInvoice = (item: any) => {
    setUpdatingInvoice(item);
  };

  const handleViewPaymentProof = (item: any) => {
    if (!item.paymentProof) {
      showAlert(`Bukti transfer untuk Invoice ${item.invoiceNo} belum di-upload`, 'Warning');
      return;
    }

    const paymentProof = item.paymentProof;
    const fileName = item.paymentProofName || 'Bukti Transfer';
    
    // Deteksi tipe file
    const isPDF = fileName.toLowerCase().endsWith('.pdf') || 
                  paymentProof.startsWith('data:application/pdf') ||
                  (paymentProof.length > 100 && paymentProof.substring(0, 100).includes('JVBERi0'));
    
    // Normalize data URI format
    let normalizedProof = paymentProof;
    if (!normalizedProof.startsWith('data:')) {
      if (isPDF) {
        normalizedProof = `data:application/pdf;base64,${normalizedProof}`;
      } else {
        normalizedProof = `data:image/jpeg;base64,${normalizedProof}`;
      }
    }

    // Untuk PDF, langsung download
    if (isPDF) {
      handleDownloadPaymentProof(normalizedProof, fileName);
    } else {
      // Untuk image, buka di modal viewer
      setSignatureViewer({
        data: normalizedProof,
        fileName: fileName,
        isPDF: false
      });
    }
  };

  const handleDownloadPaymentProof = (paymentProof: string, fileName: string) => {
    try {
      // Extract base64 data
      let base64Data = paymentProof;
      let mimeType = 'image/jpeg';
      
      if (base64Data.includes(',')) {
        const parts = base64Data.split(',');
        base64Data = parts[1] || '';
        const mimeMatch = parts[0].match(/data:([^;]+)/);
        if (mimeMatch) {
          mimeType = mimeMatch[1];
        }
      }

      // Convert base64 to blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Determine file extension
      let extension = 'png';
      if (mimeType.includes('pdf')) {
        extension = 'pdf';
      } else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
        extension = 'jpg';
      } else if (mimeType.includes('png')) {
        extension = 'png';
      }
      
      link.download = fileName || `PaymentProof.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      showAlert('Error', `Error downloading document: ${error.message}`);
    }
  };

  const generateInvoiceHtmlContent = async (item: any): Promise<string> => {
    // Load customer data
    // Ensure customers is always an array
    const customersArray = Array.isArray(customers) ? customers : [];
    const customerData = customersArray.find((c: any) => c.nama === item.customer);
    const customerAddress = customerData?.alamat || '';
    const customerNpwp = customerData?.npwp || '';

    // Load SO untuk specNote
    // Ensure salesOrders is always an array
    const salesOrdersArray = Array.isArray(salesOrders) ? salesOrders : [];
    const so = salesOrdersArray.find((s: any) => s.soNo === item.soNo);
    const soSpecNote = so?.globalSpecNote || so?.specNote || '';

    // Build product map untuk template
    const productMap: Record<string, string> = {};
    
    // Load inventory untuk mencari product juga
    const inventory = await storageService.get<any[]>(StorageKeys.GENERAL_TRADING.INVENTORY) || [];
    // Ensure inventory is always an array
    const inventoryArray = Array.isArray(inventory) ? inventory : [];
    // Ensure products is always an array
    const productsArray = Array.isArray(products) ? products : [];
    
    // Use item.items if available (from imported data), otherwise use item.lines
    const itemLinesArray = Array.isArray(item.items) ? item.items : (Array.isArray(item.lines) ? item.lines : []);
    
    console.log('[Invoice PDF] Item:', item.invoiceNo);
    console.log('[Invoice PDF] itemLinesArray:', itemLinesArray);
    console.log('[Invoice PDF] item.items:', item.items);
    console.log('[Invoice PDF] item.lines:', item.lines);
    const productCodeMap: Record<string, string> = {}; // Map untuk kode item
    
    // Build productMap berdasarkan nama produk dari invoice lines
    itemLinesArray.forEach((line: any) => {
      // Gunakan itemSku atau product sebagai key untuk lookup
      const lookupKey = line.itemSku || line.product || '';
      
      // Untuk trucking: gunakan product field langsung (JASA ANGKUTAN)
      // Untuk GT: coba cari di product master
      let productName = line.product || '';
      let productCode = line.itemSku || '';
      
      // Jika product name kosong, coba cari di master
      if (!productName && line.itemSku) {
        const product = productsArray.find((p: any) => 
          p.sku === line.itemSku || 
          p.kode === line.itemSku || 
          p.id === line.itemSku ||
          p.product_id === line.itemSku ||
          (p.codeItem && p.codeItem === line.itemSku) ||
          p.nama === line.itemSku
        );
        if (product) {
          productName = product.nama || product.description || product.name || line.itemSku;
          productCode = product.product_id || product.kode || product.sku || product.codeItem || product.id || line.itemSku;
        }
      }
      
      if (lookupKey) {
        productMap[lookupKey] = productName || line.itemSku || lookupKey;
        productCodeMap[lookupKey] = productCode;
      }
    });

    // Load company settings from storage
    const companySettings = await storageService.get<any>('companySettings');

    // Default company info
    const company = {
      companyName: companySettings?.companyName || 'PT TRIMA LAKSANA JAYA PRATAMA',
      address: companySettings?.address || 'Jl. Raya Bekasi Km. 28, Cikarang, Bekasi 17530',
      phone: '',
      bankName: companySettings?.bankName || '',
      bankAccount: companySettings?.bankAccount || '',
      bankBranch: companySettings?.bankBranch || '',
      bankAccountName: companySettings?.bankAccountName || '',
      npwp: companySettings?.npwp || '',
    };

    // Load logo menggunakan utility function dengan multiple fallback paths
    const logoBase64 = await loadLogoAsBase64();

    // Prepare invoice object untuk template
    const inv = {
      invNo: item.invoiceNo,
      customer: item.customer,
      createdAt: item.created,
      notes: item.notes || '', // Include notes untuk ditampilkan di keterangan
      // itemLinesArray already declared above
      lines: itemLinesArray.map((line: any) => ({
        itemSku: line.itemSku || line.product || '',
        qty: line.qty || 0,
        price: line.price || 0,
        unit: line.unit || 'PCS', // Include unit
        soNo: line.soNo || item.soNo || '', // Simpan SO number jika ada, fallback ke invoice level
      })),
      bom: item.bom || {
        subtotal: item.items?.reduce((s: number, l: any) => s + Number(l.qty || 0) * Number(l.price || 0), 0) || 0,
        discount: item.discount || 0,
        tax: item.items?.reduce((t: number, l: any) => t + Number(l.tax || 0), 0) || 0,
        total: item.items?.reduce((t: number, l: any) => t + Number(l.totalAkhir || 0), 0) || 0,
        topDays: item.topDays || 30,
      },
    };

    return generateInvoiceHtml({
      logo: logoBase64,
      company,
      inv,
      customerAddress,
      customerNpwp,
      soSpecNote,
      productMap,
      productCodeMap, // Pass product code map untuk kode item
      templateType: item.templateType || 'template1', // Default template1
    });
  };

  const handleViewDetail = async (item: any) => {
    try {
      const html = await generateInvoiceHtmlContent(item);
      setViewPdfData({ html, invoiceNo: item.invoiceNo, invoiceDate: item.invoiceDate });
    } catch (error: any) {
      showAlert(`Error generating Invoice preview: ${error.message}`, 'Error');
    }
  };

  const handleSaveToPDF = async () => {
    if (!viewPdfData) return;

    try {
      const electronAPI = (window as any).electronAPI;
      
      // Format filename: inv_INV123_02092026.pdf
      let fileName = `${viewPdfData.invoiceNo}.pdf`;
      if (viewPdfData.invoiceDate) {
        try {
          const date = new Date(viewPdfData.invoiceDate);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          const dateStr = `${day}${month}${year}`;
          fileName = `inv_${viewPdfData.invoiceNo}_${dateStr}.pdf`;
        } catch (e) {
          // Fallback to simple format if date parsing fails
          fileName = `inv_${viewPdfData.invoiceNo}.pdf`;
        }
      } else {
        fileName = `inv_${viewPdfData.invoiceNo}.pdf`;
      }

      if (electronAPI && typeof electronAPI.savePdf === 'function') {
        const result = await electronAPI.savePdf(viewPdfData.html, fileName);
        if (result.success) {
          showToast(`PDF saved successfully to:\n${result.path}`, 'success');
          setViewPdfData(null);
        } else if (!result.canceled) {
          showToast(`Error saving PDF: ${result.error || 'Unknown error'}`, 'error');
        }
      } else {
        openPrintWindow(viewPdfData.html);
      }
    } catch (error: any) {
      showToast(`Error saving PDF: ${error.message}`, 'error');
    }
  };

  const handlePrintInvoice = async (item: any) => {
    try {
      const html = await generateInvoiceHtmlContent(item);
      openPrintWindow(html);
    } catch (error: any) {
      showAlert(`Error generating print preview: ${error.message}`, 'Error');
    }
  };

  const handleViewSuratJalan = async (item: any) => {
    try {
      // Load delivery note berdasarkan sjNo
      const deliveryList = await storageService.get<any[]>(StorageKeys.GENERAL_TRADING.DELIVERY) || [];
      // Ensure deliveryList is always an array
      const deliveryListArray = Array.isArray(deliveryList) ? deliveryList : [];
      const delivery = deliveryListArray.find((d: any) => d.sjNo === item.sjNo);
      
      if (!delivery) {
        showAlert(`Surat Jalan ${item.sjNo} tidak ditemukan`, 'Error');
        return;
      }

      if (!delivery.signedDocument && !delivery.signedDocumentPath) {
        showAlert(`Surat Jalan ${item.sjNo} belum di-upload (belum ada TTD)`, 'Warning');
        return;
      }

      let signedDocument = delivery.signedDocument || '';
      const fileName = delivery.signedDocumentName || 'Surat Jalan';
      
      // Jika file disimpan sebagai path (PDF yang besar), load dari file system
      if (delivery.signedDocumentPath) {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI && typeof electronAPI.loadUploadedFile === 'function') {
          try {
            const result = await electronAPI.loadUploadedFile(delivery.signedDocumentPath);
            if (result && result.success) {
              signedDocument = result.data || '';
            } else {
              throw new Error(result?.error || 'Failed to load file from file system');
            }
          } catch (loadError: any) {
            showAlert('Error', `Gagal memuat file: ${loadError.message}`);
            return;
          }
        } else {
          showAlert('Error', 'File disimpan sebagai file system, tetapi Electron API tidak tersedia.');
          return;
        }
      }

      if (!signedDocument) {
        showAlert('Error', 'No document data available');
        return;
      }

      // Normalize signedDocument format
      if (!signedDocument.startsWith('data:')) {
        // Assume it's base64, need to determine MIME type
        const isPDF = fileName.toLowerCase().endsWith('.pdf') || 
                     signedDocument.length > 100 && signedDocument.substring(0, 100).includes('JVBERi0');
        
        if (isPDF) {
          signedDocument = `data:application/pdf;base64,${signedDocument}`;
        } else {
          signedDocument = `data:image/jpeg;base64,${signedDocument}`;
        }
      }

      // Deteksi tipe file
      const isPDF = fileName.toLowerCase().endsWith('.pdf') || 
                    signedDocument.startsWith('data:application/pdf') ||
                    delivery.signedDocumentType === 'pdf' ||
                    (signedDocument.length > 100 && signedDocument.substring(0, 100).includes('JVBERi0'));

      // Untuk PDF, langsung download
      if (isPDF) {
        handleDownloadSuratJalan(delivery, signedDocument, fileName);
      } else {
        // Untuk image, buka di modal viewer
        setSignatureViewer({
          data: signedDocument,
          fileName: fileName,
          isPDF: false
        });
      }
    } catch (error: any) {
      showAlert(`Error loading Surat Jalan: ${error.message}`, 'Error');
    }
  };

  const handleDownloadSuratJalan = (delivery: any, signedDocument: string, fileName: string) => {
    try {
      // Extract base64 data
      let base64Data = signedDocument;
      let mimeType = 'image/jpeg';
      
      if (base64Data.includes(',')) {
        const parts = base64Data.split(',');
        base64Data = parts[1] || '';
        const mimeMatch = parts[0].match(/data:([^;]+)/);
        if (mimeMatch) {
          mimeType = mimeMatch[1];
        }
      }

      // Convert base64 to blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Determine file extension
      let extension = 'png';
      if (mimeType.includes('pdf')) {
        extension = 'pdf';
      } else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
        extension = 'jpg';
      } else if (mimeType.includes('png')) {
        extension = 'png';
      }
      
      link.download = fileName || `SJ-${delivery.sjNo}-signed.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      showAlert('Error', `Error downloading document: ${error.message}`);
    }
  };


  // Expense Actions
  const handleEditExpense = (item: any) => {
    showAlert(`Edit Expense: ${item.expenseNo} - Form to be implemented`, 'Information');
    // TODO: Open edit expense form
  };

  const handleDeleteExpense = async (item: any) => {
    showConfirm(
      `Delete expense: ${item.expenseNo}?`,
      async () => {
        await proceedWithDeleteExpense();
      },
      () => {},
      'Delete Expense'
    );
    return;
    
    async function proceedWithDeleteExpense() {
      try {
        // Ensure expenses is always an array
        const expensesArray = Array.isArray(expenses) ? expenses : [];
        const updated = expensesArray.filter(e => e.id !== item.id);
        await storageService.set(StorageKeys.GENERAL_TRADING.EXPENSES, updated);
        setExpenses(updated);
      } catch (error: any) {
        showAlert(`Error deleting expense: ${error.message}`, 'Error');
      }
    }
  };

  const tabs = [
    { id: 'invoices', label: 'Customer Invoices' },
    { id: 'expenses', label: 'Expenses (Petty Cash)' },
  ];

  const pendingQCColumns = [
    { 
      key: 'message', 
      header: t('common.notification'), 
      render: (item: any) => (
        <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
          <div><strong>Silahkan membuat invoicing untuk PO Customer no: {item.poCustomerNo || item.soNo}</strong></div>
          <div style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>
            Sesuai SPK no: {item.spkNos || '-'}
          </div>
          <div style={{ marginTop: '4px', fontSize: '12px' }}>
            SO No: {item.soNo} | SJ No: {item.sjNo} | Customer: {item.customer} | Qty: {item.totalQty || 0} PCS
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      render: (item: any) => (
        <Button variant="primary" onClick={() => handleCreateInvoice(item)}>Create Invoice</Button>
      ),
    },
  ];

  // Helper to normalize date string to ISO format (YYYY-MM-DD) - MOVED OUTSIDE useMemo
  const normalizeDate = (dateStr: string | number): string => {
    if (!dateStr) return '';
    
    // If already ISO format (YYYY-MM-DD), return as-is
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      return dateStr.split('T')[0];
    }
    
    // If MM/DD/YY format, convert to ISO
    if (typeof dateStr === 'string' && /^\d{1,2}\/\d{1,2}\/\d{2}$/.test(dateStr)) {
      const parts = dateStr.split('/');
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      let year = parts[2];
      if (year.length === 2) {
        year = '20' + year;
      }
      return `${year}-${month}-${day}`;
    }
    
    // Try parsing as Date
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {
      // ignore
    }
    
    return '';
  };

  const invoiceColumns = [
    { key: 'invoiceNo', header: t('finance.invoiceNo') },
    { 
      key: 'customer', 
      header: t('common.customer'),
      render: (item: any) => <span style={{ color: 'var(--text-primary)' }}>{item.customer}</span>
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (item: any) => (
        <span className={`status-badge status-${item.status?.toLowerCase() || 'draft'}`}>
          {item.status || 'DRAFT'}
        </span>
      ),
    },
    { 
      key: 'paymentTerms', 
      header: t('finance.paymentTerms'),
      render: (item: any) => {
        if (item.paymentTerms === 'TOP' && item.topDays) {
          return <span style={{ fontSize: '12px' }}>TOP ({item.topDays} hari)</span>;
        }
        return <span style={{ fontSize: '12px' }}>{item.paymentTerms || 'TOP'}</span>;
      }
    },
    { 
      key: 'created', 
      header: t('common.created'),
      render: (item: any) => {
        if (!item.created) return '-';
        try {
          const date = new Date(item.created);
          return <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {date.toLocaleDateString('id-ID', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>;
        } catch {
          return <span style={{ fontSize: '12px' }}>{item.created}</span>;
        }
      }
    },
    {
      key: 'actions',
      header: t('common.actions'),
      render: (item: any) => (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'nowrap' }}>
          <Button 
            variant="secondary" 
            onClick={() => handleViewDetail(item)}
            style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#2196F3', color: 'white' }}
          >
            View
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => handleEditInvoice(item)}
            style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#FF9800', color: 'white' }}
          >
            Edit
          </Button>
          {item.status === 'OPEN' && (
            <Button 
              variant="secondary" 
              onClick={() => handleUpdateInvoice(item)}
              style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#4CAF50', color: 'white' }}
            >
              Upload Bukti TF
            </Button>
          )}
          {item.status === 'CLOSE' && item.paymentProof && (
            <Button 
              variant="secondary" 
              onClick={() => handleViewPaymentProof(item)}
              style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#00BCD4', color: 'white' }}
            >
              View Bukti TF
            </Button>
          )}
          <Button 
            variant="secondary" 
            onClick={() => handlePrintInvoice(item)}
            style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#9C27B0', color: 'white' }}
          >
            Print
          </Button>
          {item.sjNo && (
            <Button 
              variant="secondary" 
              onClick={() => handleViewSuratJalan(item)}
              style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#607D8B', color: 'white' }}
            >
              Cek SJ
            </Button>
          )}
        </div>
      ),
    },
  ];


  // Sort invoices by created date (terbaru di atas)
  const sortedInvoices = useMemo(() => {
    // Ensure invoices is always an array
    const invoicesArray = Array.isArray(invoices) ? invoices : [];
    return [...invoicesArray].sort((a, b) => {
      const dateA = new Date(normalizeDate(a.created || '')).getTime();
      const dateB = new Date(normalizeDate(b.created || '')).getTime();
      return dateB - dateA; // Descending (newest first)
    });
  }, [invoices]);

  // Filter invoices berdasarkan search query
  const filteredInvoices = useMemo(() => {
    // Ensure sortedInvoices is always an array
    const sortedInvoicesArray = Array.isArray(sortedInvoices) ? sortedInvoices : [];
    let filtered = sortedInvoicesArray;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((i: any) =>
        (i.invoiceNo || '').toLowerCase().includes(query) ||
        (i.customer || '').toLowerCase().includes(query) ||
        (i.soNo || '').toLowerCase().includes(query) ||
        (i.status || '').toLowerCase().includes(query) ||
        (i.paymentTerms || '').toLowerCase().includes(query) ||
        (i.sjNo || '').toLowerCase().includes(query)
      );
    }
    
    // Date filter - normalize dates before comparing
    if (dateFrom) {
      const normalizedFrom = normalizeDate(dateFrom);
      filtered = filtered.filter((i: any) => {
        const normalizedInvoiceDate = normalizeDate(i.created || i.updated || '');
        return normalizedInvoiceDate >= normalizedFrom;
      });
    }
    if (dateTo) {
      const normalizedTo = normalizeDate(dateTo);
      filtered = filtered.filter((i: any) => {
        const normalizedInvoiceDate = normalizeDate(i.created || i.updated || '');
        return normalizedInvoiceDate <= normalizedTo;
      });
    }
    
    return filtered;
  }, [sortedInvoices, searchQuery, dateFrom, dateTo]);

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
  const getInvoiceRowColor = useMemo(() => {
    const uniqueSOs = Array.from(new Set(filteredInvoices.map(i => i.soNo)));
    const soColorMap = new Map<string, string>();
    
    // Detect theme mode
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light' || 
                       !document.documentElement.getAttribute('data-theme');
    // Get computed CSS variables untuk konsistensi dengan theme
    const computedStyle = getComputedStyle(document.documentElement);
    const bgSecondary = computedStyle.getPropertyValue('--bg-secondary').trim();
    const bgTertiary = computedStyle.getPropertyValue('--bg-tertiary').trim();
    
    // Use light colors for light mode, dark colors for dark mode
    const rowColors = isLightMode 
      ? ['#ffffff', '#f5f5f5'] // Light mode: white and light grey
      : [bgSecondary || '#1e1e1e', bgTertiary || '#2a2a2a']; // Dark mode: gunakan CSS variables atau fallback
    
    uniqueSOs.forEach((so, index) => {
      soColorMap.set(so, rowColors[index % rowColors.length]);
    });
    
    return (soNo: string) => soColorMap.get(soNo) || rowColors[0];
  }, [filteredInvoices]);

  // Get row color for expenses (selang-seling berdasarkan theme)
  const getExpenseRowColor = useMemo(() => {
    // Detect theme mode
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light' || 
                       !document.documentElement.getAttribute('data-theme');
    // Get computed CSS variables untuk konsistensi dengan theme
    const computedStyle = getComputedStyle(document.documentElement);
    const bgSecondary = computedStyle.getPropertyValue('--bg-secondary').trim();
    const bgTertiary = computedStyle.getPropertyValue('--bg-tertiary').trim();
    
    const lightColors = ['#ffffff', '#f5f5f5'];
    const darkColors = [bgSecondary || '#1e1e1e', bgTertiary || '#2a2a2a'];
    const colors = isLightMode ? lightColors : darkColors;
    
    return (expenseNo: string) => {
      const expenseIndex = filteredExpenses.findIndex((e: any) => e.expenseNo === expenseNo);
      return colors[expenseIndex % 2];
    };
  }, [filteredExpenses]);

  const expenseColumns = [
    { key: 'expenseNo', header: t('finance.expenseNo') },
    { key: 'category', header: t('finance.category') },
    { key: 'description', header: t('common.description') },
    {
      key: 'amount',
      header: t('finance.amount'),
      render: (item: any) => `Rp ${(item.amount || 0).toLocaleString('id-ID')}`,
    },
    { key: 'paidBy', header: t('finance.paidBy') },
    { key: 'expenseDate', header: t('finance.expenseDate') },
    { key: 'receiptProof', header: t('finance.receiptProof') },
    { key: 'notes', header: t('common.notes') },
    {
      key: 'actions',
      header: t('common.actions'),
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
        <h1>Accounting</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {activeTab === 'invoices' && invoiceNotifications.length > 0 && (
            <NotificationBell
              notifications={invoiceNotifBell}
              onNotificationClick={(notification) => {
                if (notification.notif) {
                  handleCreateInvoice(notification.notif);
                }
              }}
              icon="📧"
              emptyMessage="Tidak ada invoice notifications"
            />
          )}
        </div>
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
          {activeTab === 'invoices' && (
            <div>
              {/* Search & Date Filter */}
              <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 280px', minWidth: '240px' }}>
                  <Input
                    label="Search & Filter"
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search by Invoice No, Customer, SO No, Status, Payment Terms, SJ No..."
                  />
                </div>
                <div style={{ flex: '1 1 400px', minWidth: '350px' }}>
                  <DateRangeFilter
                    onDateChange={(from, to) => {
                      setDateFrom(from);
                      setDateTo(to);
                    }}
                    defaultFrom={dateFrom}
                    defaultTo={dateTo}
                  />
                </div>
              </div>

              {/* Notifications - HIDDEN, menggunakan NotificationBell di header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Existing Invoices</h3>
                <Button variant="primary" onClick={() => setShowCreateInvoiceDialog(true)}>
                  ➕ Create Invoice
                </Button>
              </div>
              <Table 
                columns={invoiceColumns} 
                data={filteredInvoices} 
                emptyMessage={searchQuery ? "No invoices found matching your search" : "No invoices"}
                getRowStyle={(item: any) => ({
                  backgroundColor: getInvoiceRowColor(item.soNo),
                })}
              />
            </div>
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

      {/* PDF Preview Dialog */}
      {viewPdfData && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000,
          }}
          onClick={() => setViewPdfData(null)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90%', width: '1200px', maxHeight: '90vh', overflow: 'auto' }}>
            <Card className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2>Preview Invoice - {viewPdfData.invoiceNo}</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="primary" onClick={handleSaveToPDF}>
                    💾 Save to PDF
                  </Button>
                  <Button variant="secondary" onClick={() => setViewPdfData(null)}>
                    ✕ Close
                  </Button>
                </div>
              </div>
              <iframe
                srcDoc={viewPdfData.html}
                style={{
                  width: '100%',
                  height: '70vh',
                  border: 'none',
                  backgroundColor: '#fff',
                }}
                title="PDF Preview"
              />
            </Card>
          </div>
        </div>
      )}

      {/* Signature Viewer Modal untuk Image */}
      {signatureViewer && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 10001,
            display: 'flex',
            flexDirection: 'column',
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => setSignatureViewer(null)}
        >
          {/* Header */}
          <div 
            style={{
              padding: '16px 24px',
              backgroundColor: 'rgba(30, 30, 30, 0.95)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backdropFilter: 'blur(10px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
              }}>
                📄
              </div>
              <div>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: '#fff',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}>
                  {signatureViewer.fileName}
                </h3>
                <div style={{ 
                  fontSize: '12px', 
                  color: 'rgba(255, 255, 255, 0.7)',
                  marginTop: '2px',
                }}>
                  Image Document
                </div>
              </div>
            </div>
            <button
              onClick={() => setSignatureViewer(null)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontSize: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              ✕
            </button>
          </div>

          {/* Content Area */}
          <div 
            style={{
              flex: 1,
              padding: '20px',
              overflow: 'auto',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              maxWidth: '90%',
              maxHeight: '90%',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              backgroundColor: '#1a1a1a',
              padding: '20px',
            }}>
              <img
                src={signatureViewer.data}
                alt={signatureViewer.fileName}
                style={{
                  maxWidth: '100%',
                  maxHeight: 'calc(100vh - 200px)',
                  display: 'block',
                  margin: '0 auto',
                  borderRadius: '8px',
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div 
            style={{
              padding: '16px 24px',
              backgroundColor: 'rgba(30, 30, 30, 0.95)',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              backdropFilter: 'blur(10px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSignatureViewer(null)}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
              }}
            >
              Tutup
            </button>
          </div>
        </div>
      )}


      {/* Edit Invoice Dialog */}
      {/* Custom Dialog */}
      {dialogState.show && (
        <div className="dialog-overlay" onClick={closeDialog}>
          <div className="dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className={`dialog-icon ${dialogState.type === 'alert' ? 'info' : 'warning'}`}>
              {dialogState.type === 'alert' ? 'ℹ️' : '⚠️'}
            </div>
            <h3 className="dialog-title">{dialogState.title}</h3>
            <p className="dialog-message">{dialogState.message}</p>
            <div className="dialog-actions">
              <Button variant="primary" onClick={dialogState.onConfirm || closeDialog}>
                {dialogState.type === 'alert' ? 'OK' : 'Confirm'}
              </Button>
              {dialogState.type === 'confirm' && (
                <Button variant="secondary" onClick={dialogState.onCancel || closeDialog}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {showCreateInvoiceDialog && (
        <CreateInvoiceForm
          manualInvoiceData={manualInvoiceData}
          onDataChange={setManualInvoiceData}
          customers={customers}
          onCreateInvoice={handleCreateInvoiceSuccess}
          onCancel={() => setShowCreateInvoiceDialog(false)}
          createMode={createMode}
          onModeChange={setCreateMode}
          deliveryNotes={deliveryNotes.map((dn: any) => ({
            id: dn.id,
            sjNo: dn.sjNo,
            customer: dn.customer,
            items: dn.items || [],
          }))}
          salesOrders={salesOrders}
          generateInvoiceNumber={() => {
            const year = new Date().getFullYear();
            const invoicesArray = Array.isArray(invoices) ? invoices : [];
            return `INV-${year}${String(invoicesArray.length + 1).padStart(6, '0')}`;
          }}
          products={products}
          invoices={invoices}
          onSuccess={(msg) => showToast(msg, 'success')}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}

      {editingInvoice && (
        <EditInvoiceForm
          invoice={editingInvoice}
          customers={customers}
          onSave={handleEditInvoiceSuccess}
          onCancel={() => setEditingInvoice(null)}
          onSuccess={(msg) => showToast(msg, 'success')}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}

      {/* Update Invoice (Upload Bukti Transfer) Dialog */}

      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            backgroundColor:
              toast.variant === 'success'
                ? 'rgba(46, 125, 50, 0.95)'
                : toast.variant === 'error'
                ? 'rgba(211, 47, 47, 0.95)'
                : 'rgba(66, 66, 66, 0.95)',
            color: '#fff',
            padding: '12px 18px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 12000,
            minWidth: '240px',
            fontSize: '14px',
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default Accounting;
