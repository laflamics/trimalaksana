import { useState, useEffect, useMemo } from 'react';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import DateRangeFilter from '../../../components/DateRangeFilter';
import NotificationBell from '../../../components/NotificationBell';
import { storageService, StorageKeys } from '../../../services/storage';
import { deleteTruckingItem, reloadTruckingData, filterActiveItems } from '../../../utils/trucking-delete-helper';
import { setupRealTimeSync, TRUCKING_SYNC_KEYS } from '../../../utils/real-time-sync-helper';
import { useDialog } from '../../../hooks/useDialog';
import { useLanguage } from '../../../hooks/useLanguage';
import { generateInvoiceHtml } from '../../../pdf/invoice-pdf-template';
import { openPrintWindow, isMobile, isCapacitor, savePdfForMobile } from '../../../utils/actions';
import { loadLogoAsBase64 } from '../../../utils/logo-loader';
import '../../../styles/common.css';

const Accounting = () => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'expenses'>('invoices');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [invoiceNotifications, setInvoiceNotifications] = useState<any[]>([]);
  const [viewPdfData, setViewPdfData] = useState<{ html: string; invoiceNo: string } | null>(null);
  
  // Format notifications untuk NotificationBell
  const invoiceNotifBell = useMemo(() => {
    return invoiceNotifications.map((notif: any) => ({
      id: notif.id,
      title: `Delivery ${notif.sjNo || 'N/A'}`,
      message: `DO: ${notif.doNo || 'N/A'} | Customer: ${notif.customerName || 'N/A'}`,
      timestamp: notif.created || notif.timestamp,
      notif: notif, // Keep original data
    }));
  }, [invoiceNotifications]);
  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null); // Store invoice being viewed
  const [viewTemplateType, setViewTemplateType] = useState<'template1' | 'template2' | 'template3' | 'template4'>('template1'); // Template type for view
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null);
  const [viewSJData, setViewSJData] = useState<{ signedDocument: string; signedDocumentName: string; sjNo: string } | null>(null);
  const [signatureViewer, setSignatureViewer] = useState<{ 
    data: string; 
    fileName: string; 
    isPDF: boolean;
  } | null>(null);
  const [viewPaymentProofData, setViewPaymentProofData] = useState<{ paymentProof: string; paymentProofName: string; invoiceNo: string } | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [updatingInvoice, setUpdatingInvoice] = useState<any | null>(null);
  const [showCreateInvoiceDialog, setShowCreateInvoiceDialog] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Custom Dialog - menggunakan hook terpusat
  const { showAlert: showAlertBase, showConfirm: showConfirmBase, DialogComponent } = useDialog();
  
  // Wrapper untuk kompatibilitas dengan urutan parameter yang berbeda
  const showAlert = (message: string, title: string = 'Information') => {
    showAlertBase(message, title);
  };
  
  const showConfirm = (message: string, onConfirm: () => void, onCancel?: () => void, title: string = 'Confirmation') => {
    showConfirmBase(message, onConfirm, onCancel, title);
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
    
    // Real-time listener untuk server updates
    const cleanup = setupRealTimeSync({
      keys: [TRUCKING_SYNC_KEYS.INVOICES, TRUCKING_SYNC_KEYS.SURAT_JALAN, TRUCKING_SYNC_KEYS.DELIVERY_ORDERS],
      onUpdate: loadData,
    });
    
    // Refresh setiap 2 detik untuk cek notifikasi baru
    const interval = setInterval(() => {
      loadData();
    }, 2000);
    
    return () => {
      clearInterval(interval);
      cleanup();
    };
  }, []);

  const loadData = async () => {
    const inv = await storageService.get<any[]>(StorageKeys.TRUCKING.INVOICES) || [];
    const exp = await storageService.get<any[]>(StorageKeys.TRUCKING.EXPENSES) || [];
    const notifs = await storageService.get<any[]>(StorageKeys.TRUCKING.INVOICE_NOTIFICATIONS) || [];
    const cust = await storageService.get<any[]>(StorageKeys.TRUCKING.CUSTOMERS) || [];
    const prod = await storageService.get<any[]>(StorageKeys.TRUCKING.PRODUCTS) || [];
    const so = await storageService.get<any[]>(StorageKeys.TRUCKING.SALES_ORDERS) || [];
    
    // Filter out deleted items menggunakan helper function
    const activeInvoices = filterActiveItems(inv || []);
    const activeExpenses = filterActiveItems(exp || []);
    
    console.log(`[Invoices] Loaded ${(inv || []).length} invoices, filtered to ${activeInvoices.length} active invoices`);
    setInvoices(activeInvoices);
    setExpenses(activeExpenses);
    
    // Auto-cleanup: Hapus notifications yang sudah dibuat invoice atau status PROCESSED
    // Ensure notifs and inv are always arrays
    const notifsArray = Array.isArray(notifs) ? notifs : [];
    const invArray = Array.isArray(activeInvoices) ? activeInvoices : [];
    const cleanedNotifs = notifsArray.filter((n: any) => {
      // Hapus jika sudah ada invoice untuk SJ ini
      const existingInvoiceBySJ = invArray.find((i: any) => i.sjNo === n.sjNo);
      if (existingInvoiceBySJ) {
        return false;
      }
      
      // Hapus jika sudah ada invoice untuk DO ini (cek via doNo di invoice)
      if (n.doNo) {
        const existingInvoiceByDO = invArray.find((i: any) => {
          // Cek apakah invoice punya doNo yang sama
          if (i.doNo) {
            if (typeof i.doNo === 'string') {
              // doNo bisa berupa string dengan koma (multiple DOs) atau single DO
              const doNoList = i.doNo.split(',').map((d: string) => d.trim());
              return doNoList.includes(n.doNo) || i.doNo === n.doNo;
            }
            if (Array.isArray(i.doNo)) {
              return i.doNo.includes(n.doNo);
            }
          }
          // Cek juga via SJ jika invoice punya sjNo
          if (i.sjNo && n.sjNo) {
            // Load SJ untuk cek doNo
            return false; // Akan dicek di bagian SJ
          }
          return false;
        });
        if (existingInvoiceByDO) {
          console.log(`🧹 [Invoices] Filtering out notification for DO ${n.doNo} - invoice already exists`);
          return false;
        }
      }
      
      // Hapus jika status sudah PROCESSED
      if (n.status === 'PROCESSED') {
        return false;
      }
      
      return true;
    });
    
    // Update notifications di storage (cleanup yang sudah tidak relevan)
    if (JSON.stringify(cleanedNotifs) !== JSON.stringify(notifsArray)) {
      await storageService.set(StorageKeys.TRUCKING.INVOICE_NOTIFICATIONS, cleanedNotifs);
      console.log(`🧹 Cleaned up ${notifsArray.length - cleanedNotifs.length} obsolete invoice notifications`);
    }
    
    // Filter notifications yang belum dibuat invoice (status PENDING)
    const pendingNotifs = cleanedNotifs.filter((n: any) => n.status === 'PENDING');
    setInvoiceNotifications(pendingNotifs);
    setCustomers(cust);
    setProducts(prod);
    setSalesOrders(so);
  };

  // Calculate COGS (Cost of Goods Sold) dari PO price
  // Best practice: COGS = purchase cost dari PO (GT tidak ada BOM)
  const calculateCOGS = async (sj: any, invoiceLines: any[]): Promise<number> => {
    try {
      const [purchaseOrders, deliveryOrders] = await Promise.all([
        storageService.get<any[]>(StorageKeys.TRUCKING.PURCHASE_ORDERS) || [],
        storageService.get<any[]>('trucking/trucking_delivery_orders') || [],
      ]);

      let totalCOGS = 0;

      // Untuk trucking, coba cari COGS dari DO yang terkait dengan SJ
      if (sj?.doNo) {
        const doList = Array.isArray(deliveryOrders) ? deliveryOrders : [];
        const relatedDO = doList.find((doItem: any) => doItem.doNo === sj.doNo);
        
        // Jika ada totalDeal di DO, gunakan itu sebagai COGS
        if (relatedDO?.totalDeal && relatedDO.totalDeal > 0) {
          return Math.round(relatedDO.totalDeal);
        }
      }

      // Fallback: Cari dari Purchase Orders berdasarkan DO No atau product
      if (purchaseOrders && Array.isArray(purchaseOrders) && purchaseOrders.length > 0) {
        // Loop setiap product di invoice
        for (const line of invoiceLines) {
          const productId = (line.itemSku || '').toString().trim();
          const qty = Number(line.qty || 0);

          if (qty <= 0) continue;

          // Cari PO untuk product ini yang terkait dengan DO (jika ada doNo di PO)
          const purchaseOrdersArray = Array.isArray(purchaseOrders) ? purchaseOrders : [];
          const relatedPO = purchaseOrdersArray.find((po: any) => 
            (sj?.doNo && po.doNo === sj.doNo) &&
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
      }

      return Math.round(totalCOGS);
    } catch (error: any) {
      console.error('Error calculating COGS:', error);
      return 0; // Return 0 jika error (non-blocking)
    }
  };

  // Invoice Actions
  const handleCreateInvoice = async (item: any, skipValidation: boolean = false) => {
    // Handle dari notification atau dari item langsung
    // Ensure invoiceNotifications is always an array
    const invoiceNotificationsArray = Array.isArray(invoiceNotifications) ? invoiceNotifications : [];
    const notif = invoiceNotificationsArray.find((n: any) => n.sjNo === item.sjNo);
    
    // Cek apakah invoice sudah ada
    // Ensure invoices is always an array
    const invoicesArray = Array.isArray(invoices) ? invoices : [];
    const existingInvoice = invoicesArray.find((inv: any) => inv.sjNo === item.sjNo);
    if (existingInvoice) {
      showAlert(`Invoice already exists for SJ: ${item.sjNo}\n\nInvoice No: ${existingInvoice.invoiceNo}`, 'Information');
      return;
    }
    
    // Load Surat Jalan untuk validasi
    const suratJalanList = await storageService.get<any[]>(StorageKeys.TRUCKING.SURAT_JALAN) || [];
    const sj = suratJalanList.find((s: any) => s.sjNo === item.sjNo);
    
    if (!sj) {
      showAlert(`Surat Jalan ${item.sjNo} not found`, 'Error');
      return;
    }
    
    // Validasi: SJ harus sudah close dan signed (skip jika dari dialog manual)
    if (!skipValidation) {
      if (sj.status !== 'Close') {
        showAlert(`Cannot create Invoice for SJ: ${item.sjNo}\n\nSurat Jalan must be CLOSE first.`, 'Validation Error');
        return;
      }
      
      if (!sj.signedDocument) {
        showAlert(`Cannot create Invoice for SJ: ${item.sjNo}\n\nSigned document must be uploaded first.`, 'Validation Error');
        return;
      }
    }

    // Prepare invoice lines dari SJ items (untuk trucking, langsung dari SJ)
    const invoiceLines: any[] = [];
    
    // Load DO untuk mendapatkan harga (totalDeal)
    const doList = await storageService.get<any[]>(StorageKeys.TRUCKING.DELIVERY_ORDERS) || [];
    const relatedDO = doList.find((doItem: any) => doItem.doNo === sj.doNo);
    
    // Ambil totalDeal dari DO sebagai total harga
    const totalDeal = relatedDO?.totalDeal || 0;
    
    // Hitung total qty untuk proporsi harga per item
    const totalQty = (sj.items || []).reduce((sum: number, itm: any) => sum + (Number(itm.qty) || 0), 0);
    
    // Load inventory sekali di luar loop
    const inventory = await storageService.get<any[]>(StorageKeys.TRUCKING.EXPENSES) || [];
    
    // Gunakan items dari SJ
    if (sj.items && Array.isArray(sj.items) && sj.items.length > 0) {
      for (const sjItem of sj.items) {
        // Cari product berdasarkan nama product di SJ
        // Ensure products is always an array
        const productsArray = Array.isArray(products) ? products : [];
        const product = productsArray.find((p: any) => 
          p.nama === sjItem.product || 
          p.sku === sjItem.product ||
          p.kode === sjItem.product ||
          p.id === sjItem.product ||
          (p.description && p.description === sjItem.product)
        );
        
        // Cari juga di inventory
        // Ensure inventory is always an array
        const inventoryArray = Array.isArray(inventory) ? inventory : [];
        const invItem = inventoryArray.find((inv: any) => 
          inv.description === sjItem.product ||
          inv.codeItem === sjItem.product
        );
        
        // Ambil itemSku dari product atau inventory
        const itemSku = product?.sku || product?.kode || product?.id || 
                       invItem?.codeItem || invItem?.sku || invItem?.kode || 
                       sjItem.product || '';
        
        const qty = Number(sjItem.qty || 0);
        
        // Hitung harga per unit dari totalDeal
        // Harga per unit = totalDeal / totalQty (sama untuk semua item)
        // Jika hanya 1 item, harga per unit = totalDeal / qty item tersebut
        let pricePerUnit = 0;
        if (totalDeal > 0 && totalQty > 0) {
          // Harga per unit sama untuk semua item
          pricePerUnit = totalDeal / totalQty;
        } else if (totalDeal > 0 && qty > 0) {
          // Fallback: jika tidak ada totalQty, gunakan qty item ini
          pricePerUnit = totalDeal / qty;
        }
        
        invoiceLines.push({
          itemSku: itemSku,
          qty: qty,
          price: pricePerUnit, // Harga per unit
          unit: sjItem.unit || 'PCS', // Include unit
          pot: 0, // Default POT untuk auto-generated dari SJ
        });
      }
    } 
    // Fallback ke notification items jika tidak ada SJ items
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
          unit: notifItem.unit || 'PCS', // Include unit
          pot: 0, // Default POT untuk auto-generated dari notification
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
      `Create Invoice for SJ: ${item.sjNo}?\n\nDO No: ${sj.doNo || '-'}\nCustomer: ${sj.customerName || item.customer}\nTotal Qty: ${(sj.items || []).reduce((sum: number, itm: any) => sum + (itm.qty || 0), 0)} ${(sj.items || [])[0]?.unit || 'PCS'}`,
      async () => {
        await proceedWithInvoiceCreation();
      },
      () => {},
      'Create Invoice Confirmation'
    );
    
    async function proceedWithInvoiceCreation() {
    try {
      // Generate random invoice number
      const generateRandomCode = () => {
        const chars = '0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };
      
      // Ensure unique invoice number
      let invoiceNo = '';
      let isUnique = false;
      while (!isUnique) {
        const randomCode = generateRandomCode();
        invoiceNo = `INV-${new Date().getFullYear()}${randomCode}`;
        // invoicesArray already declared above
        isUnique = !invoicesArray.some((inv: any) => inv.invoiceNo === invoiceNo);
      }
      
      const newInvoice = {
        id: Date.now().toString(),
        invoiceNo,
        sjNo: sj.sjNo,
        doNo: sj.doNo,
        customer: sj.customerName || item.customer,
        customerAddress: sj.customerAddress || '',
        lines: invoiceLines,
        bom: {
          subtotal: subtotal,
          discount: 0,
          discountPercent: 0,
          tax: 0,
          taxPercent: 0,
          biayaLain: 0,
          total: subtotal,
          paymentTerms: 'TOP',
          poData: {
            topDays: 30,
          },
          sjNo: sj.sjNo,
          doNo: sj.doNo,
        },
        paymentTerms: 'TOP',
        topDays: 30,
        status: 'OPEN',
        created: new Date().toISOString(),
      };
      
      // invoicesArray already declared above
      const updated = [...invoicesArray, newInvoice];
      await storageService.set(StorageKeys.TRUCKING.INVOICES, updated);
      // Filter out deleted items setelah update
      const activeUpdated = filterActiveItems(updated);
      setInvoices(activeUpdated);

      // Auto-create journal entries untuk General Ledger
      let cogsAmount = 0; // Simpan untuk ditampilkan di alert (scope di luar try-catch)
      try {
            // Reload journalEntries dari storage untuk prevent duplicate (filter out deleted items)
            const journalEntriesRaw = await storageService.get<any[]>(StorageKeys.TRUCKING.JOURNAL_ENTRIES) || [];
            const journalEntries = filterActiveItems(Array.isArray(journalEntriesRaw) ? journalEntriesRaw : []);
        const accounts = await storageService.get<any[]>(StorageKeys.TRUCKING.ACCOUNTS) || [];
        
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
          await storageService.set(StorageKeys.TRUCKING.ACCOUNTS, defaultAccounts);
        }
        
        const entryDate = newInvoice.created ? new Date(newInvoice.created).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        // accountsArray already declared above
        const arAccount = accountsArray.find((a: any) => a.code === '1100') || { code: '1100', name: 'Accounts Receivable' };
        const revenueAccount = accountsArray.find((a: any) => a.code === '4000') || { code: '4000', name: 'Sales Revenue' };
        const discountAccount = accountsArray.find((a: any) => a.code === '6000') || { code: '6000', name: 'Operating Expenses' };
        const taxPayableAccount = accountsArray.find((a: any) => a.code === '2100') || { code: '2100', name: 'Tax Payable' };
        const otherIncomeAccount = accountsArray.find((a: any) => a.code === '4100') || { code: '4100', name: 'Other Income' };
        
        // Get calculation values
        const bomData = newInvoice.bom || {};
        const invoiceSubtotal = bomData.subtotal || subtotal;
        const discount = bomData.discount || 0;
        const tax = bomData.tax || 0;
        const biayaLain = bomData.biayaLain || 0;
        const invoiceTotal = bomData.total || (invoiceSubtotal - discount + tax + biayaLain);
        const netRevenue = invoiceSubtotal - discount; // Revenue setelah discount
        
        // Cek apakah sudah ada journal entries untuk invoice ini (prevent duplicate)
        const hasInvoiceEntries = journalEntries.some((entry: any) =>
          entry.reference === invoiceNo
        );
        
        if (hasInvoiceEntries) {
          // Skip jika sudah ada entries untuk invoice ini
          console.log(`⚠️ Journal entries already exist for Invoice ${invoiceNo}, skipping...`);
        } else {
          const hasEntry = (account: string, debit: number, credit: number) =>
            journalEntries.some((entry: any) =>
              entry.reference === invoiceNo &&
              entry.account === account &&
              entry.debit === debit &&
              entry.credit === credit
            );

          const entriesToAdd: any[] = [];
          // Debit AR = Total invoice
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
          // Credit Revenue = Subtotal - Discount
          if (netRevenue > 0 && !hasEntry('4000', 0, netRevenue)) {
            entriesToAdd.push({
              entryDate,
              reference: invoiceNo,
              account: '4000',
              accountName: revenueAccount.name,
              debit: 0,
              credit: netRevenue,
              description: `Invoice ${invoiceNo} - ${newInvoice.customer} (Revenue)`,
            });
          }
          // Debit Discount Expense = Discount
          if (discount > 0 && !hasEntry('6000', discount, 0)) {
            entriesToAdd.push({
              entryDate,
              reference: invoiceNo,
              account: '6000',
              accountName: discountAccount.name,
              debit: discount,
              credit: 0,
              description: `Invoice ${invoiceNo} - Discount`,
            });
          }
          // Credit Tax Payable = Tax
          if (tax > 0 && !hasEntry('2100', 0, tax)) {
            entriesToAdd.push({
              entryDate,
              reference: invoiceNo,
              account: '2100',
              accountName: taxPayableAccount.name,
              debit: 0,
              credit: tax,
              description: `Invoice ${invoiceNo} - Tax (PPN Keluaran)`,
            });
          }
          // Credit Other Income = Biaya Lain
          if (biayaLain > 0 && !hasEntry('4100', 0, biayaLain)) {
            entriesToAdd.push({
              entryDate,
              reference: invoiceNo,
              account: '4100',
              accountName: otherIncomeAccount.name,
              debit: 0,
              credit: biayaLain,
              description: `Invoice ${invoiceNo} - Biaya Lain`,
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
            await storageService.set(StorageKeys.TRUCKING.JOURNAL_ENTRIES, [...journalEntriesArray, ...entriesWithNo]);
          }
        }

        // Auto-create COGS journal entry (Debit COGS, Credit Inventory)
        // Best practice: COGS di-recognize saat revenue di-recognize (invoice dibuat)
        try {
          cogsAmount = await calculateCOGS(sj, invoiceLines);
          
          if (cogsAmount > 0) {
            // Reload journalEntries lagi untuk COGS check (prevent duplicate)
            const journalEntriesForCOGS = await storageService.get<any[]>(StorageKeys.TRUCKING.JOURNAL_ENTRIES) || [];
            const activeJournalEntriesForCOGS = filterActiveItems(Array.isArray(journalEntriesForCOGS) ? journalEntriesForCOGS : []);
            
            // accountsArray already declared above
            const cogsAccount = accountsArray.find((a: any) => a.code === '5000') || { code: '5000', name: 'Cost of Goods Sold' };
            const inventoryAccount = accountsArray.find((a: any) => a.code === '1200') || { code: '1200', name: 'Inventory' };
            
            // Cek apakah sudah ada COGS entry untuk invoice ini (prevent duplicate)
            const hasCOGSEntry = activeJournalEntriesForCOGS.some((entry: any) =>
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

              const currentEntriesRaw = await storageService.get<any[]>(StorageKeys.TRUCKING.JOURNAL_ENTRIES) || [];
              const currentEntries = filterActiveItems(Array.isArray(currentEntriesRaw) ? currentEntriesRaw : []);
              const baseLength = currentEntries.length;
              const cogsEntriesWithNo = cogsEntries.map((entry, idx) => ({
                ...entry,
                id: `${Date.now()}-cogs-${idx + 1}`,
                no: baseLength + idx + 1,
              }));

              await storageService.set(StorageKeys.TRUCKING.JOURNAL_ENTRIES, [...currentEntries, ...cogsEntriesWithNo]);
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

      // Hapus notification setelah invoice dibuat
      if (notif) {
        const updatedNotifs = invoiceNotificationsArray.filter((n: any) => n.id !== notif.id);
        await storageService.set(StorageKeys.TRUCKING.INVOICE_NOTIFICATIONS, updatedNotifs);
        setInvoiceNotifications(updatedNotifs.filter((n: any) => n.status === 'PENDING'));
        console.log(`✅ [Invoices] Removed notification for SJ ${item.sjNo} after creating invoice`);
      }

      // Tampilkan alert dengan COGS info (gunakan cogsAmount yang sudah dihitung di atas)
      const cogsMessage = cogsAmount > 0 
        ? `\n✅ COGS journal entries created (COGS: Rp ${cogsAmount.toLocaleString('id-ID')})`
        : `\n⚠️ COGS tidak dapat dihitung (PO tidak ditemukan atau purchase cost tidak tersedia)`;
      
      showAlert(`✅ Invoice created: ${invoiceNo}\n\nFrom Surat Jalan: ${sj.sjNo}\n✅ AR + Revenue journal entries created${cogsMessage}`, 'Success');
      await loadData();
    } catch (error: any) {
      showAlert(`Error creating invoice: ${error.message}`, 'Error');
    }
    }
  };

  // Handle manual invoice creation
  const handleCreateManualInvoice = async (manualData: any, doNos?: string[]) => {
    try {
      // Generate random invoice number
      const generateRandomCode = () => {
        const chars = '0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };
      
      const year = new Date().getFullYear();
      let invoiceNo = `INV-${year}${generateRandomCode()}`;
      
      // Ensure uniqueness
      const invoicesArray = Array.isArray(invoices) ? invoices : [];
      while (invoicesArray.some((inv: any) => inv.invoiceNo === invoiceNo)) {
        invoiceNo = `INV-${year}${generateRandomCode()}`;
      }

      // Prepare invoice lines
      const invoiceLines = manualData.items.map((item: any) => ({
        itemSku: item.sku || item.product, // Use sku if available, fallback to product
        qty: Number(item.qty || 0),
        price: Number(item.price || 0),
        unit: item.unit || 'PCS', // Include unit
        pot: Number(item.pot || 0), // Include POT (khusus trucking)
      }));

      // Use BOM from manualData if provided, otherwise calculate from items
      const bomData = manualData.bom || {};
      const subtotal = bomData.subtotal || invoiceLines.reduce((sum: number, line: any) => 
        sum + (Number(line.qty || 0) * Number(line.price || 0)), 0
      );
      const discount = bomData.discount || 0;
      const discountPercent = bomData.discountPercent || 0;
      const tax = bomData.tax || 0;
      const taxPercent = bomData.taxPercent || 0;
      const biayaLain = bomData.biayaLain || 0;
      const total = bomData.total || (subtotal - discount + tax + biayaLain);

      // Cari SJ yang terkait dengan DO jika ada
      let sjNo = '';
      if (doNos && doNos.length > 0) {
        const sjData = await storageService.get<any[]>(StorageKeys.TRUCKING.SURAT_JALAN) || [];
        const relatedSJ = sjData.find((sj: any) => doNos.includes(sj.doNo));
        if (relatedSJ) {
          sjNo = relatedSJ.sjNo;
        }
      }

      const newInvoice = {
        id: `invoice-${Date.now()}`,
        invoiceNo,
        customer: manualData.customer,
        customerAddress: manualData.customerAddress || '',
        customerNpwp: manualData.customerNpwp || '',
        sjNo: sjNo || '', // Link ke SJ jika ada dari DO
        soNo: '', // Manual invoice tidak punya SO
        doNo: doNos && doNos.length > 0 ? doNos.join(', ') : '', // Link ke DO jika ada
        lines: invoiceLines,
        bom: {
          subtotal,
          discount,
          discountPercent,
          tax,
          taxPercent,
          biayaLain,
          total,
          tanggalJt: bomData.tanggalJt || '',
          dpPo: bomData.dpPo || 0,
          tunai: bomData.tunai || 0,
          kredit: bomData.kredit || 0,
          kDebet: bomData.kDebet || 0,
          kKredit: bomData.kKredit || 0,
          kembaliKeKasir: bomData.kembaliKeKasir || 0,
          tandaTangan: (manualData.templateType === 'template2' || manualData.templateType === 'template3') ? (manualData.tandaTangan || 'M Ali Audah') : '',
        },
        status: 'OPEN' as const,
        paymentTerms: manualData.paymentTerms || 'TOP',
        topDays: manualData.topDays || 30,
        notes: manualData.notes || '',
        created: new Date().toISOString(),
        templateType: manualData.templateType || 'template1',
      };

      const updated = [...invoicesArray, newInvoice];
      await storageService.set(StorageKeys.TRUCKING.INVOICES, updated);
      
      // Filter out deleted items setelah update
      const activeUpdated = filterActiveItems(updated);
      setInvoices(activeUpdated);

      // Auto-create journal entries untuk General Ledger
      try {
        // Reload journalEntries dari storage untuk prevent duplicate (filter out deleted items)
        const journalEntriesRaw = await storageService.get<any[]>(StorageKeys.TRUCKING.JOURNAL_ENTRIES) || [];
        const journalEntries = filterActiveItems(Array.isArray(journalEntriesRaw) ? journalEntriesRaw : []);
        const accountsRaw = await storageService.get<any[]>(StorageKeys.TRUCKING.ACCOUNTS) || [];
        const accountsArray = filterActiveItems(Array.isArray(accountsRaw) ? accountsRaw : []);
        
        if (accountsArray.length === 0) {
          const defaultAccounts = [
            { code: '1000', name: 'Cash', type: 'Asset', balance: 0 },
            { code: '1100', name: 'Accounts Receivable', type: 'Asset', balance: 0 },
            { code: '1200', name: 'Inventory', type: 'Asset', balance: 0 },
            { code: '1300', name: 'Fixed Assets', type: 'Asset', balance: 0 },
            { code: '2000', name: 'Accounts Payable', type: 'Liability', balance: 0 },
            { code: '2100', name: 'Tax Payable', type: 'Liability', balance: 0 },
            { code: '3000', name: 'Equity', type: 'Equity', balance: 0 },
            { code: '3100', name: 'Retained Earnings', type: 'Equity', balance: 0 },
            { code: '4000', name: 'Sales Revenue', type: 'Revenue', balance: 0 },
            { code: '4100', name: 'Other Income', type: 'Revenue', balance: 0 },
            { code: '5000', name: 'Cost of Goods Sold', type: 'Expense', balance: 0 },
            { code: '6000', name: 'Operating Expenses', type: 'Expense', balance: 0 },
            { code: '6100', name: 'Administrative Expenses', type: 'Expense', balance: 0 },
            { code: '6200', name: 'Financial Expenses', type: 'Expense', balance: 0 },
          ];
          await storageService.set(StorageKeys.TRUCKING.ACCOUNTS, defaultAccounts);
        }
        
        const entryDate = newInvoice.created ? new Date(newInvoice.created).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        const arAccount = accountsArray.find((a: any) => a.code === '1100') || { code: '1100', name: 'Accounts Receivable' };
        const revenueAccount = accountsArray.find((a: any) => a.code === '4000') || { code: '4000', name: 'Sales Revenue' };
        const discountAccount = accountsArray.find((a: any) => a.code === '6000') || { code: '6000', name: 'Operating Expenses' };
        const taxPayableAccount = accountsArray.find((a: any) => a.code === '2100') || { code: '2100', name: 'Tax Payable' };
        const otherIncomeAccount = accountsArray.find((a: any) => a.code === '4100') || { code: '4100', name: 'Other Income' };
        
        const invoiceSubtotal = bomData.subtotal || subtotal;
        const discount = bomData.discount || 0;
        const tax = bomData.tax || 0;
        const biayaLain = bomData.biayaLain || 0;
        const invoiceTotal = bomData.total || total;
        const netRevenue = invoiceSubtotal - discount;
        
        // Cek apakah sudah ada journal entries untuk invoice ini (prevent duplicate)
        const hasInvoiceEntries = journalEntries.some((entry: any) =>
          entry.reference === invoiceNo
        );
        
        if (hasInvoiceEntries) {
          // Skip jika sudah ada entries untuk invoice ini
          console.log(`⚠️ Journal entries already exist for Invoice ${invoiceNo}, skipping...`);
        } else {
          const hasEntry = (account: string, debit: number, credit: number) =>
            journalEntries.some((entry: any) =>
              entry.reference === invoiceNo &&
              entry.account === account &&
              entry.debit === debit &&
              entry.credit === credit
            );

          const entriesToAdd: any[] = [];
          // Debit AR = Total invoice
          if (!hasEntry('1100', invoiceTotal, 0)) {
            entriesToAdd.push({
              entryDate,
              reference: invoiceNo,
              account: '1100',
              accountName: arAccount.name,
              debit: invoiceTotal,
              credit: 0,
              description: `Invoice ${invoiceNo} - ${manualData.customer}`,
            });
          }
          // Credit Revenue = Subtotal - Discount
          if (netRevenue > 0 && !hasEntry('4000', 0, netRevenue)) {
            entriesToAdd.push({
              entryDate,
              reference: invoiceNo,
              account: '4000',
              accountName: revenueAccount.name,
              debit: 0,
              credit: netRevenue,
              description: `Invoice ${invoiceNo} - ${manualData.customer} (Revenue)`,
            });
          }
          // Debit Discount Expense = Discount
          if (discount > 0 && !hasEntry('6000', discount, 0)) {
            entriesToAdd.push({
              entryDate,
              reference: invoiceNo,
              account: '6000',
              accountName: discountAccount.name,
              debit: discount,
              credit: 0,
              description: `Invoice ${invoiceNo} - Discount`,
            });
          }
          // Credit Tax Payable = Tax
          if (tax > 0 && !hasEntry('2100', 0, tax)) {
            entriesToAdd.push({
              entryDate,
              reference: invoiceNo,
              account: '2100',
              accountName: taxPayableAccount.name,
              debit: 0,
              credit: tax,
              description: `Invoice ${invoiceNo} - Tax (PPN Keluaran)`,
            });
          }
          // Credit Other Income = Biaya Lain
          if (biayaLain > 0 && !hasEntry('4100', 0, biayaLain)) {
            entriesToAdd.push({
              entryDate,
              reference: invoiceNo,
              account: '4100',
              accountName: otherIncomeAccount.name,
              debit: 0,
              credit: biayaLain,
              description: `Invoice ${invoiceNo} - Biaya Lain`,
            });
          }

          if (entriesToAdd.length > 0) {
            const journalEntriesArray = Array.isArray(journalEntries) ? journalEntries : [];
            const baseLength = journalEntriesArray.length;
            const entriesWithNo = entriesToAdd.map((entry, idx) => ({
              ...entry,
              id: `${Date.now()}-manual-${idx + 1}`,
              no: baseLength + idx + 1,
            }));
            await storageService.set(StorageKeys.TRUCKING.JOURNAL_ENTRIES, [...journalEntriesArray, ...entriesWithNo]);
          }
        }

        // Auto-create tax record untuk Tax Management
        if (tax > 0) {
          const taxRecords = await storageService.get<any[]>(StorageKeys.TRUCKING.TAX_RECORDS) || [];
          const existingTaxRecord = taxRecords.find((r: any) => 
            r.reference === invoiceNo && r.referenceType === 'Invoice'
          );
          
          if (!existingTaxRecord) {
            const baseAmount = invoiceSubtotal - discount;
            const newTaxRecord = {
              id: `tax-inv-${newInvoice.id}`,
              taxDate: entryDate,
              reference: invoiceNo,
              referenceType: 'Invoice' as const,
              taxType: 'PPN Keluaran' as const,
              coaCode: '2100',
              coaName: 'Tax Payable',
              baseAmount: baseAmount,
              taxPercent: bomData.taxPercent || (baseAmount > 0 ? (tax / baseAmount) * 100 : 0),
              taxAmount: tax,
              totalAmount: baseAmount + tax,
              customer: manualData.customer,
              description: `PPN Keluaran dari Invoice ${invoiceNo} - ${manualData.customer}`,
              status: 'Open' as const,
              created: newInvoice.created,
            };
            
            await storageService.set(StorageKeys.TRUCKING.TAX_RECORDS, [...taxRecords, newTaxRecord]);
          }
        }
      } catch (error: any) {
        console.error('Error creating journal entries for manual invoice:', error);
        // Jangan block proses, hanya log error
      }
      
      // Hapus notifikasi jika invoice dibuat dari DO
      if (doNos && doNos.length > 0) {
        const allNotifs = await storageService.get<any[]>(StorageKeys.TRUCKING.INVOICE_NOTIFICATIONS) || [];
        // Hapus notifikasi yang terkait dengan DO yang sudah dibuat invoice
        const updatedNotifs = allNotifs.filter((n: any) => {
          // Cek apakah notifikasi terkait dengan DO yang sudah dibuat invoice
          if (n.doNo && doNos.includes(n.doNo)) {
            return false; // Hapus notifikasi untuk DO ini
          }
          // Cek via SJ jika ada
          if (n.sjNo && sjNo && n.sjNo === sjNo) {
            return false; // Hapus notifikasi untuk SJ ini
          }
          return true;
        });
        await storageService.set(StorageKeys.TRUCKING.INVOICE_NOTIFICATIONS, updatedNotifs);
        console.log(`✅ [Invoices] Removed ${allNotifs.length - updatedNotifs.length} notifications for DOs ${doNos.join(', ')} after creating invoice`);
      }
      
      showAlert(`✅ Invoice created: ${invoiceNo}\n\nCustomer: ${manualData.customer}\nManual Invoice`, 'Success');
      // Reload data untuk update notifikasi dan list DO
      await loadData();
    } catch (error: any) {
      showAlert(`Error creating manual invoice: ${error.message}`, 'Error');
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

  const generateInvoiceHtmlContent = async (item: any, templateTypeOverride?: string): Promise<string> => {
    // Load customer data
    // Ensure customers is always an array
    const customersArray = Array.isArray(customers) ? customers : [];
    const customerData = customersArray.find((c: any) => c.nama === item.customer);
    const customerAddress = customerData?.alamat || '';
    const customerNpwp = customerData?.npwp || '';

    // Untuk trucking, tidak perlu SO, langsung dari SJ/DO
    const soSpecNote = item.notes || '';

    // Build product map untuk template
    const productMap: Record<string, string> = {};
    
    // Load inventory untuk mencari product juga
    const inventory = await storageService.get<any[]>(StorageKeys.TRUCKING.EXPENSES) || [];
    // Ensure inventory is always an array
    const inventoryArray = Array.isArray(inventory) ? inventory : [];
    // Ensure products is always an array
    const productsArray = Array.isArray(products) ? products : [];
    
    const itemLinesArray = Array.isArray(item.items) ? item.items : (Array.isArray(item.lines) ? item.lines : []);
    const productCodeMap: Record<string, string> = {}; // Map untuk kode item
    itemLinesArray.forEach((line: any) => {
      const lookupKey = line.itemSku || line.product || '';
      
      // Untuk trucking: gunakan product field langsung (JASA ANGKUTAN)
      let productName = line.product || '';
      let productCode = line.itemSku || '';
      
      // Jika product name kosong, coba cari di master
      if (!productName && line.itemSku) {
        const product = productsArray.find((p: any) => 
          p.sku === line.itemSku || 
          p.kode === line.itemSku || 
          p.id === line.itemSku ||
          p.product_id === line.itemSku ||
          (p.codeItem && p.codeItem === line.itemSku)
        );
        if (product) {
          productName = product.nama || product.description || product.name || line.itemSku;
          productCode = product.kode || product.sku || product.codeItem || line.itemSku;
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
        itemSku: line.itemSku || '',
        itemName: line.itemName || '', // ✅ Add itemName
        qty: line.qty || 0,
        unit: line.unit || 'PCS', // Include unit
        price: line.price || 0,
        total: line.total || 0, // ✅ Add total
        discount: line.discount || 0, // ✅ Add discount
        pot: line.pot || 0, // Include POT (khusus trucking)
      })),
      bom: item.bom || {},
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
      templateType: templateTypeOverride || item.templateType || 'template1', // Use override if provided, otherwise use item's templateType
      hideSO: true, // Hide SO column khusus untuk trucking
    });
  };

  const handleViewDetail = async (item: any) => {
    try {
      setViewingInvoice(item);
      const initialTemplateType = item.templateType || 'template1';
      setViewTemplateType(initialTemplateType as 'template1' | 'template2');
      const html = await generateInvoiceHtmlContent(item, initialTemplateType);
      setViewPdfData({ html, invoiceNo: item.invoiceNo });
    } catch (error: any) {
      showAlert(`Error generating Invoice preview: ${error.message}`, 'Error');
    }
  };

  const handleChangeViewTemplate = async (newTemplateType: 'template1' | 'template2' | 'template3' | 'template4') => {
    if (!viewingInvoice) return;
    try {
      setViewTemplateType(newTemplateType);
      const html = await generateInvoiceHtmlContent(viewingInvoice, newTemplateType);
      setViewPdfData({ html, invoiceNo: viewingInvoice.invoiceNo });
    } catch (error: any) {
      showAlert(`Error generating Invoice preview: ${error.message}`, 'Error');
    }
  };

  const handleSaveToPDF = async () => {
    if (!viewPdfData) return;

    try {
      const electronAPI = (window as any).electronAPI;
      const fileName = `${viewPdfData.invoiceNo}.pdf`;

      if (electronAPI && typeof electronAPI.savePdf === 'function') {
        // Electron: Use file picker to select save location
        const result = await electronAPI.savePdf(viewPdfData.html, fileName);
        if (result.success) {
          showToast(`PDF saved successfully to:\n${result.path}`, 'success');
          setViewPdfData(null);
        } else if (!result.canceled) {
          showToast(`Error saving PDF: ${result.error || 'Unknown error'}`, 'error');
        }
      } else if (isMobile() || isCapacitor()) {
        // Mobile/Capacitor: Use Web Share API or download link
        await savePdfForMobile(
          viewPdfData.html,
          fileName,
          (message) => {
            showToast(message, 'success');
            setViewPdfData(null); // Close view setelah save
          },
          (message) => showToast(message, 'error')
        );
      } else {
        // Browser: Buka window baru dengan print dialog langsung
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.open();
          printWindow.document.write(viewPdfData.html);
          printWindow.document.close();
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print();
            }, 250);
          };
          setTimeout(() => {
            if (printWindow && !printWindow.closed) {
              printWindow.print();
            }
          }, 500);
          showToast('Print dialog akan muncul. Pilih "Save as PDF" untuk menyimpan dokumen.', 'info');
        } else {
          openPrintWindow(viewPdfData.html, { autoPrint: true });
        }
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
      // Load Surat Jalan berdasarkan sjNo
      const suratJalanList = await storageService.get<any[]>(StorageKeys.TRUCKING.SURAT_JALAN) || [];
      // Ensure suratJalanList is always an array
      const suratJalanArray = Array.isArray(suratJalanList) ? suratJalanList : [];
      const sj = suratJalanArray.find((s: any) => s.sjNo === item.sjNo);
      
      if (!sj) {
        showAlert(`Surat Jalan ${item.sjNo} tidak ditemukan`, 'Error');
        return;
      }

      if (!sj.signedDocument && !sj.signedDocumentPath) {
        showAlert(`Surat Jalan ${item.sjNo} belum di-upload (belum ada TTD)`, 'Warning');
        return;
      }

      let signedDocument = sj.signedDocument || '';
      const fileName = sj.signedDocumentName || 'Surat Jalan';
      
      // Jika file disimpan sebagai path (PDF yang besar), load dari file system
      if (sj.signedDocumentPath) {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI && typeof electronAPI.loadUploadedFile === 'function') {
          try {
            const result = await electronAPI.loadUploadedFile(sj.signedDocumentPath);
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

      // Normalize data URI format
      if (!signedDocument.startsWith('data:')) {
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
                    sj.signedDocumentType === 'pdf' ||
                    (signedDocument.length > 100 && signedDocument.substring(0, 100).includes('JVBERi0'));

      // Untuk PDF, langsung download
      if (isPDF) {
        handleDownloadSuratJalan(signedDocument, fileName);
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

  const handleDownloadSuratJalan = (signedDocument: string, fileName: string) => {
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
      
      link.download = fileName || `SJ-signed.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      showAlert('Error', `Error downloading document: ${error.message}`);
    }
  };


  // Helper function untuk save tombstone ke audit log
  const saveTombstoneToAuditLog = async (item: any, refType: string) => {
    try {
      const timestamp = new Date().toISOString();
      const itemId = item.id || item.invoiceNo || item.expenseNo || 'unknown';
      const auditLog = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        refType: refType,
        refId: itemId,
        actorId: 'user',
        action: 'DELETE',
        deleted: true,
        deletedAt: timestamp,
        data: item,
        createdAt: timestamp,
      };
      
      // Simpan audit log menggunakan storageService
      const auditLogs = await storageService.get<any[]>(StorageKeys.TRUCKING.AUDIT_LOGS) || [];
      await storageService.set(StorageKeys.TRUCKING.AUDIT_LOGS, [...auditLogs, auditLog]);
      return true;
    } catch (error) {
      console.error('Error saving tombstone to audit log:', error);
      return false;
    }
  };

  const handleDeleteInvoice = async (item: any) => {
    try {
      console.log('[Trucking Invoices] handleDeleteInvoice called for:', item?.invoiceNo, item?.id);
      
      if (!item || !item.invoiceNo) {
        showAlert('Invoice tidak valid. Mohon coba lagi.', 'Error');
        return;
      }
      
      // Validate item.id exists
      if (!item.id) {
        console.error('[Trucking Invoices] Invoice missing ID:', item);
        showAlert(`❌ Error: Invoice "${item.invoiceNo}" tidak memiliki ID. Tidak bisa dihapus.`, 'Error');
        return;
      }
      
      showConfirm(
        `Hapus Invoice "${item.invoiceNo}"?\n\n⚠️ Data akan dihapus dengan aman (tombstone pattern) untuk mencegah auto-sync mengembalikan data.\n\nTindakan ini tidak bisa dibatalkan.`,
        async () => {
          try {
            // 🚀 FIX: Pakai Trucking delete helper untuk konsistensi dan sync yang benar
            const deleteResult = await deleteTruckingItem(StorageKeys.TRUCKING.INVOICES, item.id, 'id');
            
            if (deleteResult.success) {
              // Reload data
              await loadData();
              showAlert(`✅ Invoice "${item.invoiceNo}" berhasil dihapus dengan aman.\n\n🛡️ Data dilindungi dari auto-sync restoration.`, 'Success');
            } else {
              console.error('[Trucking Invoices] Delete failed:', deleteResult.error);
              showAlert(`❌ Error deleting invoice "${item.invoiceNo}": ${deleteResult.error || 'Unknown error'}`, 'Error');
            }
          } catch (error: any) {
            console.error('[Trucking Invoices] Error deleting invoice:', error);
            showAlert(`❌ Error deleting invoice: ${error.message}`, 'Error');
          }
        },
        undefined,
        'Safe Delete Confirmation'
      );
    } catch (error: any) {
      console.error('[Trucking Invoices] Error in handleDeleteInvoice:', error);
      showAlert(`Error: ${error.message}`, 'Error');
    }
  };

  // Expense Actions
  const handleEditExpense = (item: any) => {
    showAlert(`Edit Expense: ${item.expenseNo} - Form to be implemented`, 'Information');
    // TODO: Open edit expense form
  };

  const handleDeleteExpense = async (item: any) => {
    try {
      console.log('[Trucking Invoices] handleDeleteExpense called for:', item?.expenseNo, item?.id);
      
      if (!item || !item.expenseNo) {
        showAlert('Expense tidak valid. Mohon coba lagi.', 'Error');
        return;
      }
      
      // Validate item.id exists
      if (!item.id) {
        console.error('[Trucking Invoices] Expense missing ID:', item);
        showAlert(`❌ Error: Expense "${item.expenseNo}" tidak memiliki ID. Tidak bisa dihapus.`, 'Error');
        return;
      }
      
      showConfirm(
        `Hapus Expense "${item.expenseNo}"?\n\n⚠️ Data akan dihapus dengan aman (tombstone pattern) untuk mencegah auto-sync mengembalikan data.\n\nTindakan ini tidak bisa dibatalkan.`,
        async () => {
          try {
            // 🚀 FIX: Pakai Trucking delete helper untuk konsistensi dan sync yang benar
            const deleteResult = await deleteTruckingItem(StorageKeys.TRUCKING.EXPENSES, item.id, 'id');
            
            if (deleteResult.success) {
              // Reload data dengan helper (handle race condition)
              const activeExpenses = await reloadTruckingData(StorageKeys.TRUCKING.EXPENSES, setExpenses);
              setExpenses(activeExpenses);
              await loadData();
              showAlert(`✅ Expense "${item.expenseNo}" berhasil dihapus dengan aman.\n\n🛡️ Data dilindungi dari auto-sync restoration.`, 'Success');
            } else {
              console.error('[Trucking Invoices] Delete expense failed:', deleteResult.error);
              showAlert(`❌ Error deleting expense "${item.expenseNo}": ${deleteResult.error || 'Unknown error'}`, 'Error');
            }
          } catch (error: any) {
            console.error('[Trucking Invoices] Error deleting expense:', error);
            showAlert(`❌ Error deleting expense: ${error.message}`, 'Error');
          }
        },
        undefined,
        'Safe Delete Confirmation'
      );
    } catch (error: any) {
      console.error('[Trucking Invoices] Error in handleDeleteExpense:', error);
      showAlert(`Error: ${error.message}`, 'Error');
    }
  };

  const tabs = [
    { id: 'invoices', label: 'Customer Invoices' },
    { id: 'expenses', label: 'Expenses (Petty Cash)' },
  ];

  // Handler untuk menghapus notification ketika checkbox di-check
  const handleDismissNotification = async (notif: any) => {
    try {
      const notifsArray = Array.isArray(invoiceNotifications) ? invoiceNotifications : [];
      const updatedNotifs = notifsArray.filter((n: any) => {
        // Hapus notification yang sama (berdasarkan sjNo atau id)
        if (n.sjNo && notif.sjNo && n.sjNo === notif.sjNo) {
          return false;
        }
        if (n.id && notif.id && n.id === notif.id) {
          return false;
        }
        return true;
      });
      
      await storageService.set(StorageKeys.TRUCKING.INVOICE_NOTIFICATIONS, updatedNotifs);
      setInvoiceNotifications(updatedNotifs.filter((n: any) => n.status === 'PENDING'));
      showToast('Notification dismissed', 'success');
    } catch (error: any) {
      console.error('Error dismissing notification:', error);
      showAlert(`Error dismissing notification: ${error.message}`, 'Error');
    }
  };

  const pendingQCColumns = [
    { 
      key: 'checkbox',
      header: '',
      render: (item: any) => (
        <input
          type="checkbox"
          onClick={(e) => {
            e.stopPropagation();
            handleDismissNotification(item);
          }}
          style={{ 
            cursor: 'pointer',
            width: '18px',
            height: '18px',
          }}
        />
      ),
    },
    { 
      key: 'message', 
      header: 'Notification', 
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
      header: 'Actions',
      render: (item: any) => (
        <Button variant="primary" onClick={() => handleCreateInvoice(item)}>Create Invoice</Button>
      ),
    },
  ];

  const invoiceColumns = [
    { key: 'invoiceNo', header: 'Invoice No' },
    { 
      key: 'customer', 
      header: 'Customer',
      render: (item: any) => <span style={{ color: 'var(--text-primary)' }}>{item.customer}</span>
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => (
        <span className={`status-badge status-${item.status?.toLowerCase() || 'draft'}`}>
          {item.status || 'DRAFT'}
        </span>
      ),
    },
    { key: 'paymentTerms', header: 'Payment Terms' },
    { key: 'created', header: 'Created' },
    {
      key: 'actions',
      header: 'Actions',
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
          <Button 
            variant="danger" 
            onClick={() => handleDeleteInvoice(item)}
            style={{ fontSize: '11px', padding: '4px 8px' }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];


  // Sort invoices by created date (terbaru di atas)
  const sortedInvoices = useMemo(() => {
    // Ensure invoices is always an array
    const invoicesArray = Array.isArray(invoices) ? invoices : [];
    // Filter out deleted items menggunakan helper function
    const activeInvoices = filterActiveItems(invoicesArray);
    return [...activeInvoices].sort((a, b) => {
      const dateA = new Date(a.created || 0).getTime();
      const dateB = new Date(b.created || 0).getTime();
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
    
    // Date filter
    if (dateFrom) {
      filtered = filtered.filter((i: any) => {
        const invoiceDate = i.created || i.updated || '';
        return invoiceDate >= dateFrom;
      });
    }
    if (dateTo) {
      filtered = filtered.filter((i: any) => {
        const invoiceDate = i.created || i.updated || '';
        return invoiceDate <= dateTo;
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

  // Get row color (zebra striping - konsisten dengan module lain)
  const getInvoiceRowColor = (item: any): string => {
    const index = filteredInvoices.findIndex((i: any) => i.id === item.id);
    // Detect theme mode
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light' || 
                       !document.documentElement.getAttribute('data-theme');
    if (isLightMode) {
      return index % 2 === 0 ? '#ffffff' : '#f5f5f5'; // Light mode: white and light grey
    } else {
      return index % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)'; // Dark mode: transparent and subtle
    }
  };

  // Get row color for expenses (selang-seling berdasarkan theme)
  const getExpenseRowColor = (expenseNo: string): string => {
    const expenseIndex = filteredExpenses.findIndex((e: any) => e.expenseNo === expenseNo);
    // Detect theme mode
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light' || 
                       !document.documentElement.getAttribute('data-theme');
    if (isLightMode) {
      return expenseIndex % 2 === 0 ? '#ffffff' : '#f5f5f5'; // Light mode: white and light grey
    } else {
      return expenseIndex % 2 === 0 ? '#1a1a1a' : '#1f1f1f'; // Dark mode: dark grey
    }
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
              {/* Header dengan tombol Create Invoice */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
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
                <Button 
                  variant="primary" 
                  onClick={() => setShowCreateInvoiceDialog(true)}
                >
                  + Create Invoice
                </Button>
              </div>

              {/* Notifications - HIDDEN, menggunakan NotificationBell di header */}
              <h3 style={{ marginTop: '32px', marginBottom: '16px', color: 'var(--text-primary)' }}>Existing Invoices</h3>
              <Table 
                columns={invoiceColumns} 
                data={filteredInvoices} 
                emptyMessage={searchQuery ? "No invoices found matching your search" : "No invoices"}
                getRowStyle={(item: any) => ({
                  backgroundColor: getInvoiceRowColor(item),
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ margin: 0 }}>Preview Invoice - {viewPdfData.invoiceNo}</h2>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Template Selection Buttons */}
                  <div style={{ display: 'flex', gap: '6px', padding: '4px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <button
                      type="button"
                      onClick={() => handleChangeViewTemplate('template1')}
                      style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: '4px',
                        backgroundColor: viewTemplateType === 'template1' ? 'var(--primary-color)' : 'transparent',
                        color: viewTemplateType === 'template1' ? '#fff' : 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: viewTemplateType === 'template1' ? '600' : '400',
                        transition: 'all 0.2s',
                      }}
                    >
                      Template 1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangeViewTemplate('template2')}
                      style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: '4px',
                        backgroundColor: viewTemplateType === 'template2' ? 'var(--primary-color)' : 'transparent',
                        color: viewTemplateType === 'template2' ? '#fff' : 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: viewTemplateType === 'template2' ? '600' : '400',
                        transition: 'all 0.2s',
                      }}
                    >
                      Template 2
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangeViewTemplate('template3')}
                      style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: '4px',
                        backgroundColor: viewTemplateType === 'template3' ? 'var(--primary-color)' : 'transparent',
                        color: viewTemplateType === 'template3' ? '#fff' : 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: viewTemplateType === 'template3' ? '600' : '400',
                        transition: 'all 0.2s',
                      }}
                    >
                      Template 3
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangeViewTemplate('template4')}
                      style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: '4px',
                        backgroundColor: viewTemplateType === 'template4' ? 'var(--primary-color)' : 'transparent',
                        color: viewTemplateType === 'template4' ? '#fff' : 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: viewTemplateType === 'template4' ? '600' : '400',
                        transition: 'all 0.2s',
                      }}
                    >
                      Template 4
                    </button>
                  </div>
                  <Button variant="primary" onClick={handleSaveToPDF}>
                    💾 Save to PDF
                  </Button>
                  <Button variant="secondary" onClick={() => {
                    setViewPdfData(null);
                    setViewingInvoice(null);
                  }}>
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
      {/* Custom Dialog - menggunakan hook terpusat */}
      <DialogComponent />

      {showCreateInvoiceDialog && (
        <CreateInvoiceDialog
          invoices={invoices}
          onClose={() => setShowCreateInvoiceDialog(false)}
          onCreate={async (data: { doNos?: string[]; sjNos?: string[]; manualData?: any }) => {
            if (data.doNos && data.doNos.length > 0) {
              // Create invoice dari DO yang dipilih
              await handleCreateManualInvoice(data.manualData, data.doNos);
            } else if (data.sjNos && data.sjNos.length > 0) {
              // Create invoice untuk setiap SJ yang dipilih
              for (const sjNo of data.sjNos) {
                const notif = invoiceNotifications.find((n: any) => n.sjNo === sjNo);
                const item = notif || { sjNo };
                await handleCreateInvoice(item, true); // Pass skipValidation flag
              }
            } else if (data.manualData) {
              // Create manual invoice
              await handleCreateManualInvoice(data.manualData);
            }
            // Reload data untuk update list DO dan notifikasi
            await loadData();
            setShowCreateInvoiceDialog(false);
          }}
        />
      )}

      {editingInvoice && (
        <EditInvoiceDialog
          invoice={editingInvoice}
          customers={customers}
          products={products}
          salesOrders={salesOrders}
          onClose={() => setEditingInvoice(null)}
          onSave={async (updatedData) => {
            // Load semua data dari storage untuk update
            const allInvoices = await storageService.get<any[]>(StorageKeys.TRUCKING.INVOICES) || [];
            const updated = allInvoices.map(inv =>
              inv.id === editingInvoice.id ? { ...inv, ...updatedData } : inv
            );
            await storageService.set(StorageKeys.TRUCKING.INVOICES, updated);
            // Reload data dengan filter active items menggunakan helper function
            await loadData();
            setEditingInvoice(null);
            showAlert('✅ Invoice updated', 'Success');
          }}
        />
      )}

      {/* Update Invoice (Upload Bukti Transfer) Dialog */}
      {updatingInvoice && (
        <UpdateInvoiceDialog
          invoice={updatingInvoice}
          onClose={() => setUpdatingInvoice(null)}
          showAlert={showAlert}
          onSave={async (paymentProof: string, paymentProofName: string) => {
            const updated = invoices.map(inv =>
              inv.id === updatingInvoice.id
                ? {
                    ...inv,
                    status: 'CLOSE' as const,
                    paymentProof: paymentProof,
                    paymentProofName: paymentProofName,
                    paidAt: new Date().toISOString(),
                  }
                : inv
            );
            await storageService.set(StorageKeys.TRUCKING.INVOICES, updated);
            // Reload data dengan filter active items menggunakan helper function
            await loadData();
            
            // Create payment record untuk AR tracking
            try {
              const invoiceTotal = updatingInvoice.bom?.total || 0;
              const existingPayments = await storageService.get<any[]>(StorageKeys.TRUCKING.PAYMENTS) || [];
              
              // Cek apakah payment record sudah ada
              const existingPayment = existingPayments.find((p: any) => 
                p.invoiceNo === updatingInvoice.invoiceNo && p.type === 'Receipt'
              );
              
              if (!existingPayment) {
                // Create payment record
                const paymentNo = `RCP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(existingPayments.length + 1).padStart(4, '0')}`;
                const newPayment = {
                  id: Date.now().toString(),
                  paymentNo: paymentNo,
                  paymentDate: new Date().toISOString().split('T')[0],
                  type: 'Receipt',
                  invoiceNo: updatingInvoice.invoiceNo,
                  customer: updatingInvoice.customer,
                  customerName: updatingInvoice.customer,
                  amount: invoiceTotal,
                  paymentMethod: 'Bank Transfer',
                  reference: updatingInvoice.invoiceNo,
                  notes: `Payment for Invoice ${updatingInvoice.invoiceNo}`,
                  created: new Date().toISOString(),
                };
                
                await storageService.set(StorageKeys.TRUCKING.PAYMENTS, [...existingPayments, newPayment]);
              }
            } catch (error: any) {
              console.error('Error creating payment record:', error);
            }
            
            // Auto-create journal entries untuk payment (Cash + AR)
            try {
              // Reload journalEntries dari storage untuk prevent duplicate (filter out deleted items)
              const journalEntriesRaw = await storageService.get<any[]>(StorageKeys.TRUCKING.JOURNAL_ENTRIES) || [];
              const journalEntries = (Array.isArray(journalEntriesRaw) ? journalEntriesRaw : []).filter((e: any) => {
                return !(e?.deleted === true || e?.deleted === 'true' || e?.deletedAt);
              });
              const accountsRaw = await storageService.get<any[]>(StorageKeys.TRUCKING.ACCOUNTS) || [];
              const accounts = filterActiveItems(accountsRaw || []);
              const invoiceTotal = updatingInvoice.bom?.total || 0;
              const entryDate = new Date().toISOString().split('T')[0];
              
              const cashAccount = accounts.find((a: any) => a.code === '1000') || { code: '1000', name: 'Cash' };
              const arAccount = accounts.find((a: any) => a.code === '1100') || { code: '1100', name: 'Accounts Receivable' };
              
              // Gunakan reference yang berbeda untuk payment (PAYMENT-{invoiceNo})
              const paymentReference = `PAYMENT-${updatingInvoice.invoiceNo}`;
              
              // Create journal entries: Debit Cash, Credit AR
              // Pastikan kedua entries dibuat bersamaan untuk balance
              const hasPaymentEntry = journalEntries.some((entry: any) =>
                entry.reference === paymentReference &&
                (entry.account === '1000' || entry.account === '1100')
              );

              if (!hasPaymentEntry) {
                const entriesToAdd = [
                  {
                    entryDate,
                    reference: paymentReference,
                    account: '1000',
                    accountName: cashAccount.name,
                    debit: invoiceTotal,
                    credit: 0,
                    description: `Payment received for Invoice ${updatingInvoice.invoiceNo} - ${updatingInvoice.customer}`,
                  },
                  {
                    entryDate,
                    reference: paymentReference,
                    account: '1100',
                    accountName: arAccount.name,
                    debit: 0,
                    credit: invoiceTotal,
                    description: `Payment received for Invoice ${updatingInvoice.invoiceNo} - ${updatingInvoice.customer}`,
                  },
                ];

                const baseLength = journalEntries.length;
                const entriesWithNo = entriesToAdd.map((entry, idx) => ({
                  ...entry,
                  id: `${Date.now()}-payment-${idx + 1}`,
                  no: baseLength + idx + 1,
                }));
                await storageService.set(StorageKeys.TRUCKING.JOURNAL_ENTRIES, [...journalEntries, ...entriesWithNo]);
              }
            } catch (error: any) {
              console.error('Error creating journal entries for payment:', error);
            }
            
            // Auto-close SO saat invoice dibayar (GT tidak ada SPK)
            if (updatingInvoice.soNo) {
              const salesOrders = await storageService.get<any[]>(StorageKeys.TRUCKING.SALES_ORDERS) || [];
              const updatedSOs = salesOrders.map(so =>
                so.soNo === updatingInvoice.soNo && so.status === 'OPEN'
                  ? { ...so, status: 'CLOSE' as const }
                  : so
              );
              await storageService.set(StorageKeys.TRUCKING.SALES_ORDERS, updatedSOs);
              
              setUpdatingInvoice(null);
              showAlert(`✅ Bukti transfer uploaded\n\n✅ Invoice ${updatingInvoice.invoiceNo} status updated to CLOSE\n✅ SO ${updatingInvoice.soNo} automatically closed`, 'Success');
            } else {
              setUpdatingInvoice(null);
              showAlert(`✅ Bukti transfer uploaded\n\n✅ Invoice ${updatingInvoice.invoiceNo} status updated to CLOSE`, 'Success');
            }
            
            await loadData();
          }}
        />
      )}

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

// Create Invoice Dialog Component
const CreateInvoiceDialog = ({
  invoices,
  onClose,
  onCreate
}: {
  invoices: any[];
  onClose: () => void;
  onCreate: (data: { doNos?: string[]; sjNos?: string[]; manualData?: any }) => Promise<void>;
}) => {
  const [deliveryOrderList, setDeliveryOrderList] = useState<any[]>([]);
  const [suratJalanList, setSuratJalanList] = useState<any[]>([]);
  const [selectedDOs, setSelectedDOs] = useState<string[]>([]);
  const [selectedSJs, setSelectedSJs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'do' | 'sj' | 'manual'>('manual');
  
  // Auto-populated data dari DO yang dipilih
  const [autoCustomer, setAutoCustomer] = useState('');
  const [autoCustomerAddress, setAutoCustomerAddress] = useState('');
  const [autoCustomerNpwp, setAutoCustomerNpwp] = useState('');
  const [autoItems, setAutoItems] = useState<Array<{ sku: string; product: string; qty: number; price: number; unit?: string; pot?: number }>>([]);
  const [autoNotes, setAutoNotes] = useState('');
  
  // Manual input fields
  const [manualCustomer, setManualCustomer] = useState('');
  const [manualCustomerAddress, setManualCustomerAddress] = useState('');
  const [manualCustomerNpwp, setManualCustomerNpwp] = useState('');
  const [manualItems, setManualItems] = useState<Array<{ sku: string; product: string; qty: number; price: number; unit?: string; pot?: number }>>([{ sku: '', product: '', qty: 1, price: 0, unit: 'PCS', pot: 0 }]);
  const [manualNotes, setManualNotes] = useState('');
  const [tandaTangan, setTandaTangan] = useState('M Ali Audah'); // Default untuk Template 2
  
  // Calculation fields (untuk semua mode)
  const [calculation, setCalculation] = useState({
    subtotal: 0,
    discount: 0,
    discountPercent: 0,
    tax: 0,
    taxPercent: 11, // Default PPN rate
    biayaLain: 0,
    total: 0,
    tanggalJt: '',
    dpPo: 0,
    tunai: 0,
    kredit: 0,
    kDebet: 0,
    kKredit: 0,
    kembaliKeKasir: 0,
  });
  
  // Payment terms
  const [paymentTerms, setPaymentTerms] = useState('TOP');
  const [topDays, setTopDays] = useState(30);
  const [templateType, setTemplateType] = useState('template1');
  
  // Customers list untuk dropdown
  const [customersList, setCustomersList] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [doData, sjData] = await Promise.all([
          storageService.get<any[]>(StorageKeys.TRUCKING.DELIVERY_ORDERS) || [],
          storageService.get<any[]>(StorageKeys.TRUCKING.SURAT_JALAN) || [],
        ]);
        
        // Filter: hanya yang belum di-delete menggunakan helper function
        const activeDOsRaw = filterActiveItems(doData || []);
        const activeDOs = activeDOsRaw.filter((doItem: any) => {
          // Filter: belum ada invoice untuk DO ini (cek via SJ atau langsung dari doNo)
          const hasInvoice = invoices.some((inv: any) => {
            // Cek apakah invoice punya doNo yang sama
            if (inv.doNo && inv.doNo.includes(doItem.doNo)) {
              return true;
            }
            // Cek via SJ
            const sj = (sjData || []).find((s: any) => s.doNo === doItem.doNo);
            return sj && inv.sjNo === sj.sjNo;
          });
          return !hasInvoice;
        });
        
        const activeSJRaw = filterActiveItems(sjData || []);
        const activeSJ = activeSJRaw.filter((sj: any) => {
          const hasInvoice = invoices.some((inv: any) => inv.sjNo === sj.sjNo);
          return !hasInvoice;
        });
        
        setDeliveryOrderList(activeDOs);
        setSuratJalanList(activeSJ);
      } catch (error: any) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [invoices]);
  
  // Auto-populate data ketika DO dipilih
  useEffect(() => {
    if (selectedDOs.length > 0 && mode === 'do') {
      const loadDOData = async () => {
        // Load menggunakan storageService untuk membaca dari file storage juga
        const doDataRaw = await storageService.get<any[]>(StorageKeys.TRUCKING.DELIVERY_ORDERS);
        const doData = doDataRaw || [];
        const selectedDOItems = doData.filter((doItem: any) => selectedDOs.includes(doItem.doNo));
        
        if (selectedDOItems.length > 0) {
          // Ambil customer dari DO pertama (atau gabungkan jika berbeda)
          const customers = [...new Set(selectedDOItems.map((doItem: any) => doItem.customerName).filter(Boolean))];
          setAutoCustomer(customers.join(', ') || '');
          
          // Gabungkan semua items dari semua DO yang dipilih
          const allItems: Array<{ sku: string; product: string; qty: number; price: number; unit?: string; pot?: number }> = [];
          let totalDeal = 0;
          
          selectedDOItems.forEach((doItem: any) => {
            totalDeal += doItem.totalDeal || 0;
            const items = doItem.items || [];
            const totalQty = items.reduce((sum: number, itm: any) => sum + (Number(itm.qty) || 0), 0);
            
            items.forEach((item: any) => {
              const qty = Number(item.qty || 0);
              // Hitung harga per unit dari totalDeal
              const pricePerUnit = totalQty > 0 && totalDeal > 0 ? (doItem.totalDeal || 0) / totalQty : 0;
              
              allItems.push({
                sku: item.product || '', // Use product as SKU for now
                product: item.product || '',
                qty: qty,
                price: pricePerUnit,
                unit: item.unit || 'PCS',
                pot: 0, // Default POT untuk auto-generated dari DO
              });
            });
          });
          
          setAutoItems(allItems);
          
          // Calculate initial calculation
          const subtotal = allItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
          setCalculation({
            subtotal,
            discount: 0,
            discountPercent: 0,
            tax: 0,
            taxPercent: 0,
            biayaLain: 0,
            total: subtotal,
            tanggalJt: '',
            dpPo: 0,
            tunai: 0,
            kredit: 0,
            kDebet: 0,
            kKredit: 0,
            kembaliKeKasir: 0,
          });
          
          // Gabungkan notes dari semua DO
          const notes = selectedDOItems.map((doItem: any) => {
            const doInfo = `DO: ${doItem.doNo}${doItem.notes ? ` - ${doItem.notes}` : ''}`;
            return doInfo;
          }).join('\n');
          setAutoNotes(notes);
        }
      };
      loadDOData();
    } else {
      // Reset ketika tidak ada DO yang dipilih
      setAutoCustomer('');
      setAutoItems([]);
      setAutoNotes('');
    }
  }, [selectedDOs, mode]);

  const handleDOToggle = (doNo: string) => {
    setSelectedDOs(prev => 
      prev.includes(doNo) 
        ? prev.filter(d => d !== doNo)
        : [...prev, doNo]
    );
  };

  const handleSJToggle = (sjNo: string) => {
    setSelectedSJs(prev => 
      prev.includes(sjNo) 
        ? prev.filter(s => s !== sjNo)
        : [...prev, sjNo]
    );
  };

  const handleAddManualItem = () => {
    setManualItems([...manualItems, { sku: '', product: '', qty: 1, price: 0, unit: 'PCS', pot: 0 }]);
  };

  const handleRemoveManualItem = (index: number) => {
    setManualItems(manualItems.filter((_, i) => i !== index));
  };

  const handleManualItemChange = (index: number, field: string, value: any) => {
    const updated = [...manualItems];
    updated[index] = { ...updated[index], [field]: value };
    setManualItems(updated);
    recalculateCalculation(updated);
  };
  
  const recalculateCalculation = (items: Array<{ sku: string; product: string; qty: number; price: number; unit?: string; pot?: number }>) => {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.price || 0)), 0);
    const discount = calculation.discount || 0;
    const tax = calculation.tax || 0;
    const biayaLain = calculation.biayaLain || 0;
    const total = subtotal - discount + tax + biayaLain;
    
    setCalculation({
      ...calculation,
      subtotal,
      total,
    });
  };
  
  const handleCalculationChange = (field: string, value: any) => {
    const updated = { ...calculation, [field]: value };
    
    // Recalculate totals
    const subtotal = updated.subtotal || 0;
    const discount = updated.discount || 0;
    let tax = updated.tax || 0;
    let taxPercent = updated.taxPercent || 0;
    const biayaLain = updated.biayaLain || 0;
    
    // Auto-calculate tax if subtotal changed and tax is 0 (default 11% PPN)
    if (field === 'subtotal' && tax === 0 && subtotal > 0) {
      taxPercent = 11; // Default PPN rate
      tax = (subtotal * taxPercent) / 100;
    }
    
    const total = subtotal - discount + tax + biayaLain;
    
    // Recalculate percentages
    const discountPercent = subtotal > 0 ? (discount / subtotal) * 100 : 0;
    const finalTaxPercent = subtotal > 0 ? (tax / subtotal) * 100 : 0;
    
    setCalculation({
      ...updated,
      tax,
      total,
      discountPercent,
      taxPercent: finalTaxPercent,
    });
  };
  
  const handleCustomerSelect = (customerName: string) => {
    setManualCustomer(customerName);
    const customerData = customersList.find((c: any) => c.nama === customerName);
    if (customerData) {
      setManualCustomerAddress(customerData.alamat || '');
      setManualCustomerNpwp(customerData.npwp || '');
    }
  };

  const handleCreate = async () => {
    if (mode === 'do') {
      if (selectedDOs.length === 0) {
        alert('Please select at least one Delivery Order');
        return;
      }
      // Gunakan data auto-populated dari DO
      if (!autoCustomer || autoItems.length === 0) {
        alert('Please wait for data to load from selected Delivery Orders');
        return;
      }
      await onCreate({ 
        doNos: selectedDOs,
        manualData: {
          customer: autoCustomer,
          customerAddress: autoCustomerAddress,
          customerNpwp: autoCustomerNpwp,
          items: autoItems,
          notes: autoNotes,
          bom: calculation, // Keep 'bom' key for storage compatibility, but use 'calculation' variable
          paymentTerms,
          topDays,
          templateType,
        }
      });
    } else if (mode === 'sj') {
      if (selectedSJs.length === 0) {
        alert('Please select at least one Surat Jalan');
        return;
      }
      await onCreate({ sjNos: selectedSJs });
    } else {
      if (!manualCustomer || manualItems.length === 0 || manualItems.some(item => !item.product)) {
        alert('Please fill in customer and at least one item with product name');
        return;
      }
      await onCreate({ 
        manualData: {
          customer: manualCustomer,
          customerAddress: manualCustomerAddress,
          customerNpwp: manualCustomerNpwp,
          items: manualItems,
          notes: manualNotes,
          bom: calculation, // Keep 'bom' key for storage compatibility, but use 'calculation' variable
          paymentTerms,
          topDays,
          templateType,
          tandaTangan: (templateType === 'template2' || templateType === 'template3') ? tandaTangan : '',
        }
      });
    }
  };

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
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '8px',
          padding: '16px',
          maxWidth: '1200px',
          width: '95%',
          maxHeight: '95vh',
          overflowY: 'auto',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '18px' }}>Create Invoice</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '0',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* Mode Toggle */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
          <button
            onClick={() => setMode('do')}
            style={{
              flex: 1,
              padding: '6px 8px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: mode === 'do' ? 'var(--accent-color)' : 'var(--bg-secondary)',
              color: mode === 'do' ? '#fff' : 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: mode === 'do' ? '600' : '400',
            }}
          >
            From Delivery Order
          </button>
          <button
            onClick={() => setMode('sj')}
            style={{
              flex: 1,
              padding: '6px 8px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: mode === 'sj' ? 'var(--accent-color)' : 'var(--bg-secondary)',
              color: mode === 'sj' ? '#fff' : 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: mode === 'sj' ? '600' : '400',
            }}
          >
            From Surat Jalan
          </button>
          <button
            onClick={() => setMode('manual')}
            style={{
              flex: 1,
              padding: '6px 8px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: mode === 'manual' ? 'var(--accent-color)' : 'var(--bg-secondary)',
              color: mode === 'manual' ? '#fff' : 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: mode === 'manual' ? '600' : '400',
            }}
          >
            Manual Input
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
        ) : mode === 'do' ? (
          <>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-primary)', fontWeight: '500', fontSize: '12px' }}>
                Select Delivery Order(s) * (You can select multiple)
              </label>
              <div style={{ 
                maxHeight: '300px', 
                overflowY: 'auto', 
                border: '1px solid var(--border-color)', 
                borderRadius: '4px',
                padding: '8px',
                backgroundColor: 'var(--bg-secondary)'
              }}>
                {deliveryOrderList.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No Delivery Order available
                  </div>
                ) : (
                  deliveryOrderList.map((doItem: any) => (
                    <div 
                      key={doItem.doNo}
                      style={{
                        padding: '10px',
                        marginBottom: '8px',
                        borderRadius: '4px',
                        backgroundColor: selectedDOs.includes(doItem.doNo) ? 'rgba(76, 175, 80, 0.2)' : 'transparent',
                        border: selectedDOs.includes(doItem.doNo) ? '1px solid var(--accent-color)' : '1px solid transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => handleDOToggle(doItem.doNo)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="checkbox"
                          checked={selectedDOs.includes(doItem.doNo)}
                          onChange={() => handleDOToggle(doItem.doNo)}
                          style={{ cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', marginBottom: '4px' }}>{doItem.doNo}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Customer: {doItem.customerName || 'N/A'} | Status: {doItem.status || '-'} | Total Deal: Rp {(doItem.totalDeal || 0).toLocaleString('id-ID')}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Items: {(doItem.items || []).length} item(s) | Qty: {(doItem.items || []).reduce((sum: number, itm: any) => sum + (itm.qty || 0), 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {selectedDOs.length > 0 && (
              <div style={{ 
                marginBottom: '10px', 
                padding: '8px', 
                backgroundColor: 'var(--bg-secondary)', 
                borderRadius: '4px',
                fontSize: '11px'
              }}>
                <div><strong>Selected:</strong> {selectedDOs.length} Delivery Order(s)</div>
                <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                  {selectedDOs.join(', ')}
                </div>
              </div>
            )}

            {/* Auto-populated data preview */}
            {selectedDOs.length > 0 && autoItems.length > 0 && (
              <div style={{ 
                marginBottom: '10px', 
                padding: '8px', 
                backgroundColor: 'rgba(76, 175, 80, 0.1)', 
                borderRadius: '4px',
                fontSize: '11px',
                border: '1px solid rgba(76, 175, 80, 0.3)'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)', fontSize: '11px' }}>
                  📋 Auto-populated Data:
                </div>
                <div style={{ marginBottom: '2px', fontSize: '11px' }}><strong>Customer:</strong> {autoCustomer || '-'}</div>
                <div style={{ marginBottom: '4px', fontSize: '11px' }}><strong>Items:</strong> {autoItems.length} item(s)</div>
                <div style={{ maxHeight: '100px', overflowY: 'auto', fontSize: '10px' }}>
                  {autoItems.map((item, idx) => (
                    <div key={idx} style={{ padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      {item.product} - Qty: {item.qty} {item.unit || 'PCS'} - Price: Rp {item.price.toLocaleString('id-ID')}
                    </div>
                  ))}
                </div>
                {autoNotes && (
                  <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                    <strong>Notes:</strong> {autoNotes}
                  </div>
                )}
              </div>
            )}

            {/* Calculation Fields for DO Mode */}
            {selectedDOs.length > 0 && autoItems.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <h3 style={{ marginBottom: '8px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>Calculation</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>
                      Discount (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={calculation.discountPercent === 0 ? '' : calculation.discountPercent}
                      onChange={(e) => {
                        const percent = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                        const discount = (calculation.subtotal || 0) * (percent / 100);
                        handleCalculationChange('discountPercent', percent);
                        handleCalculationChange('discount', discount);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>
                      Discount (Rp)
                    </label>
                    <input
                      type="number"
                      value={calculation.discount === 0 ? '' : calculation.discount}
                      onChange={(e) => {
                        const discount = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                        const percent = (calculation.subtotal || 0) > 0 ? (discount / (calculation.subtotal || 1)) * 100 : 0;
                        handleCalculationChange('discount', discount);
                        handleCalculationChange('discountPercent', percent);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>
                      Tax (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={calculation.taxPercent === 0 ? '' : calculation.taxPercent}
                      onChange={(e) => {
                        const percent = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                        const tax = (calculation.subtotal || 0) * (percent / 100);
                        handleCalculationChange('taxPercent', percent);
                        handleCalculationChange('tax', tax);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>
                      Tax (Rp)
                    </label>
                    <input
                      type="number"
                      value={calculation.tax === 0 ? '' : calculation.tax}
                      onChange={(e) => {
                        const tax = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                        const percent = (calculation.subtotal || 0) > 0 ? (tax / (calculation.subtotal || 1)) * 100 : 0;
                        handleCalculationChange('tax', tax);
                        handleCalculationChange('taxPercent', percent);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>
                      Biaya Lain (Rp)
                    </label>
                    <input
                      type="number"
                      value={calculation.biayaLain === 0 ? '' : calculation.biayaLain}
                      onChange={(e) => handleCalculationChange('biayaLain', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '8px', padding: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Subtotal:</span>
                    <strong>Rp {calculation.subtotal?.toLocaleString('id-ID') || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Discount ({calculation.discountPercent?.toFixed(2) || 0}%):</span>
                    <strong>Rp {calculation.discount?.toLocaleString('id-ID') || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Tax ({calculation.taxPercent?.toFixed(2) || 0}%):</span>
                    <strong>Rp {calculation.tax?.toLocaleString('id-ID') || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Biaya Lain:</span>
                    <strong>Rp {calculation.biayaLain?.toLocaleString('id-ID') || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid var(--border-color)' }}>
                    <span><strong>Total:</strong></span>
                    <strong>Rp {calculation.total?.toLocaleString('id-ID') || 0}</strong>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : mode === 'sj' ? (
          <>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '12px', color: 'var(--text-primary)', fontWeight: '500' }}>
                Select Surat Jalan(s) * (You can select multiple)
              </label>
              <div style={{ 
                maxHeight: '300px', 
                overflowY: 'auto', 
                border: '1px solid var(--border-color)', 
                borderRadius: '4px',
                padding: '8px',
                backgroundColor: 'var(--bg-secondary)'
              }}>
                {suratJalanList.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No Surat Jalan available
                  </div>
                ) : (
                  suratJalanList.map((sj: any) => (
                    <div 
                      key={sj.sjNo}
                      style={{
                        padding: '10px',
                        marginBottom: '8px',
                        borderRadius: '4px',
                        backgroundColor: selectedSJs.includes(sj.sjNo) ? 'rgba(76, 175, 80, 0.2)' : 'transparent',
                        border: selectedSJs.includes(sj.sjNo) ? '1px solid var(--accent-color)' : '1px solid transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => handleSJToggle(sj.sjNo)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="checkbox"
                          checked={selectedSJs.includes(sj.sjNo)}
                          onChange={() => handleSJToggle(sj.sjNo)}
                          style={{ cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', marginBottom: '4px' }}>{sj.sjNo}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            DO: {sj.doNo || '-'} | Customer: {sj.customerName || sj.customer || 'N/A'} | Status: {sj.status || '-'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {selectedSJs.length > 0 && (
              <div style={{ 
                marginBottom: '10px', 
                padding: '8px', 
                backgroundColor: 'var(--bg-secondary)', 
                borderRadius: '4px',
                fontSize: '11px'
              }}>
                <div><strong>Selected:</strong> {selectedSJs.length} Surat Jalan(s)</div>
                <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                  {selectedSJs.join(', ')}
                </div>
              </div>
            )}

            {/* Calculation Fields for SJ Mode */}
            {selectedSJs.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <h3 style={{ marginBottom: '8px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>Calculation</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>
                      Discount (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={calculation.discountPercent === 0 ? '' : calculation.discountPercent}
                      onChange={(e) => {
                        const percent = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                        const discount = (calculation.subtotal || 0) * (percent / 100);
                        handleCalculationChange('discountPercent', percent);
                        handleCalculationChange('discount', discount);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>
                      Discount (Rp)
                    </label>
                    <input
                      type="number"
                      value={calculation.discount === 0 ? '' : calculation.discount}
                      onChange={(e) => {
                        const discount = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                        const percent = (calculation.subtotal || 0) > 0 ? (discount / (calculation.subtotal || 1)) * 100 : 0;
                        handleCalculationChange('discount', discount);
                        handleCalculationChange('discountPercent', percent);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>
                      Tax (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={calculation.taxPercent === 0 ? '' : calculation.taxPercent}
                      onChange={(e) => {
                        const percent = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                        const tax = (calculation.subtotal || 0) * (percent / 100);
                        handleCalculationChange('taxPercent', percent);
                        handleCalculationChange('tax', tax);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>
                      Tax (Rp)
                    </label>
                    <input
                      type="number"
                      value={calculation.tax === 0 ? '' : calculation.tax}
                      onChange={(e) => {
                        const tax = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                        const percent = (calculation.subtotal || 0) > 0 ? (tax / (calculation.subtotal || 1)) * 100 : 0;
                        handleCalculationChange('tax', tax);
                        handleCalculationChange('taxPercent', percent);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>
                      Biaya Lain (Rp)
                    </label>
                    <input
                      type="number"
                      value={calculation.biayaLain === 0 ? '' : calculation.biayaLain}
                      onChange={(e) => handleCalculationChange('biayaLain', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '8px', padding: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Subtotal:</span>
                    <strong>Rp {calculation.subtotal?.toLocaleString('id-ID') || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Discount ({calculation.discountPercent?.toFixed(2) || 0}%):</span>
                    <strong>Rp {calculation.discount?.toLocaleString('id-ID') || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Tax ({calculation.taxPercent?.toFixed(2) || 0}%):</span>
                    <strong>Rp {calculation.tax?.toLocaleString('id-ID') || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Biaya Lain:</span>
                    <strong>Rp {calculation.biayaLain?.toLocaleString('id-ID') || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid var(--border-color)' }}>
                    <span><strong>Total:</strong></span>
                    <strong>Rp {calculation.total?.toLocaleString('id-ID') || 0}</strong>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                Customer *
              </label>
              {customersList.length > 0 ? (
                <select
                  value={manualCustomer}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                >
                  <option value="">-- Select Customer --</option>
                  {customersList.map((c: any) => (
                    <option key={c.id || c.nama} value={c.nama}>{c.nama}</option>
                  ))}
                </select>
              ) : (
                <Input
                  value={manualCustomer}
                  onChange={setManualCustomer}
                  placeholder="Enter customer name"
                />
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                Customer Address
              </label>
              <textarea
                value={manualCustomerAddress}
                onChange={(e) => setManualCustomerAddress(e.target.value)}
                placeholder="Customer address..."
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  minHeight: '60px',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                Customer NPWP
              </label>
              <Input
                value={manualCustomerNpwp}
                onChange={setManualCustomerNpwp}
                placeholder="Customer NPWP"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                  Items *
                </label>
                <Button variant="secondary" onClick={handleAddManualItem} style={{ padding: '6px 12px', fontSize: '12px' }}>
                  + Add Item
                </Button>
              </div>
              {manualItems.map((item, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  marginBottom: '8px',
                  alignItems: 'center'
                }}>
                  <div style={{ flex: 1 }}>
                    <Input
                      value={item.sku}
                      onChange={(val) => handleManualItemChange(index, 'sku', val)}
                      placeholder="SKU"
                    />
                  </div>
                  <div style={{ flex: 2 }}>
                    <Input
                      value={item.product}
                      onChange={(val) => handleManualItemChange(index, 'product', val)}
                      placeholder="Product name"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Input
                      value={String(item.qty)}
                      onChange={(val) => handleManualItemChange(index, 'qty', Number(val) || 0)}
                      placeholder="Qty"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <select
                        value={item.unit && ['PCS', 'BOX', 'PACK', 'LOT'].includes(item.unit) ? item.unit : 'CUSTOM'}
                        onChange={(e) => {
                          if (e.target.value === 'CUSTOM') {
                            handleManualItemChange(index, 'unit', '');
                          } else {
                            handleManualItemChange(index, 'unit', e.target.value);
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '8px',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          backgroundColor: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          fontSize: '14px',
                        }}
                      >
                        <option value="PCS">PCS</option>
                        <option value="BOX">BOX</option>
                        <option value="PACK">PACK</option>
                        <option value="LOT">LOT</option>
                        <option value="CUSTOM">Custom...</option>
                      </select>
                      {(!item.unit || item.unit === 'CUSTOM' || !['PCS', 'BOX', 'PACK', 'LOT'].includes(item.unit)) && (
                        <input
                          type="text"
                          value={item.unit && !['PCS', 'BOX', 'PACK', 'LOT', 'CUSTOM'].includes(item.unit) ? item.unit : ''}
                          onChange={(e) => handleManualItemChange(index, 'unit', e.target.value)}
                          placeholder="UOM"
                          style={{
                            flex: 1,
                            padding: '8px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            fontSize: '14px',
                            minWidth: '80px',
                          }}
                        />
                      )}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Input
                      value={String(item.price)}
                      onChange={(val) => handleManualItemChange(index, 'price', Number(val) || 0)}
                      placeholder="Price"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Input
                      value={String(item.pot || 0)}
                      onChange={(val) => handleManualItemChange(index, 'pot', Number(val) || 0)}
                      placeholder="POT"
                    />
                  </div>
                  {manualItems.length > 1 && (
                    <Button 
                      variant="secondary" 
                      onClick={() => handleRemoveManualItem(index)}
                      style={{ padding: '6px 12px' }}
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
            </div>


            {/* Calculation Fields for Manual Mode */}
            {manualItems.length > 0 && manualItems.some(item => item.product) && (
              <div style={{ marginBottom: '12px' }}>
                <h3 style={{ marginBottom: '8px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>Calculation</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>
                      Discount (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={calculation.discountPercent === 0 ? '' : calculation.discountPercent}
                      onChange={(e) => {
                        const percent = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                        const discount = (calculation.subtotal || 0) * (percent / 100);
                        handleCalculationChange('discountPercent', percent);
                        handleCalculationChange('discount', discount);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>
                      Discount (Rp)
                    </label>
                    <input
                      type="number"
                      value={calculation.discount === 0 ? '' : calculation.discount}
                      onChange={(e) => {
                        const discount = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                        const percent = (calculation.subtotal || 0) > 0 ? (discount / (calculation.subtotal || 1)) * 100 : 0;
                        handleCalculationChange('discount', discount);
                        handleCalculationChange('discountPercent', percent);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>
                      Tax (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={calculation.taxPercent === 0 ? '' : calculation.taxPercent}
                      onChange={(e) => {
                        const percent = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                        const tax = (calculation.subtotal || 0) * (percent / 100);
                        handleCalculationChange('taxPercent', percent);
                        handleCalculationChange('tax', tax);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>
                      Tax (Rp)
                    </label>
                    <input
                      type="number"
                      value={calculation.tax === 0 ? '' : calculation.tax}
                      onChange={(e) => {
                        const tax = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                        const percent = (calculation.subtotal || 0) > 0 ? (tax / (calculation.subtotal || 1)) * 100 : 0;
                        handleCalculationChange('tax', tax);
                        handleCalculationChange('taxPercent', percent);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>
                      Biaya Lain (Rp)
                    </label>
                    <input
                      type="number"
                      value={calculation.biayaLain === 0 ? '' : calculation.biayaLain}
                      onChange={(e) => handleCalculationChange('biayaLain', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '8px', padding: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Subtotal:</span>
                    <strong>Rp {calculation.subtotal?.toLocaleString('id-ID') || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Discount ({calculation.discountPercent?.toFixed(2) || 0}%):</span>
                    <strong>Rp {calculation.discount?.toLocaleString('id-ID') || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Tax ({calculation.taxPercent?.toFixed(2) || 0}%):</span>
                    <strong>Rp {calculation.tax?.toLocaleString('id-ID') || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Biaya Lain:</span>
                    <strong>Rp {calculation.biayaLain?.toLocaleString('id-ID') || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid var(--border-color)' }}>
                    <span><strong>Total:</strong></span>
                    <strong>Rp {calculation.total?.toLocaleString('id-ID') || 0}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Terms for Manual Mode */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>
                    Payment Terms
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => {
                      setPaymentTerms(e.target.value);
                      if (e.target.value === 'COD' || e.target.value === 'CBD') {
                        setTopDays(0);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '11px',
                    }}
                  >
                    <option value="TOP">TOP</option>
                    <option value="COD">COD</option>
                    <option value="CBD">CBD</option>
                  </select>
                </div>
                {paymentTerms === 'TOP' && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>
                      TOP Days
                    </label>
                    <input
                      type="number"
                      value={topDays === 0 ? '' : topDays}
                      onChange={(e) => setTopDays(e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Template Selection for Manual Mode */}
            <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                📄 Pilih Template Invoice
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setTemplateType('template1')}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: `2px solid ${templateType === 'template1' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                    borderRadius: '6px',
                    backgroundColor: templateType === 'template1' ? 'var(--primary-color)' : 'var(--bg-primary)',
                    color: templateType === 'template1' ? '#fff' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: templateType === 'template1' ? '600' : '400',
                    transition: 'all 0.2s',
                  }}
                >
                  Template 1 (Default)
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateType('template2')}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: `2px solid ${templateType === 'template2' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                    borderRadius: '6px',
                    backgroundColor: templateType === 'template2' ? 'var(--primary-color)' : 'var(--bg-primary)',
                    color: templateType === 'template2' ? '#fff' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: templateType === 'template2' ? '600' : '400',
                    transition: 'all 0.2s',
                  }}
                >
                  Template 2 (Baru) ✨
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateType('template3')}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: `2px solid ${templateType === 'template3' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                    borderRadius: '6px',
                    backgroundColor: templateType === 'template3' ? 'var(--primary-color)' : 'var(--bg-primary)',
                    color: templateType === 'template3' ? '#fff' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: templateType === 'template3' ? '600' : '400',
                    transition: 'all 0.2s',
                  }}
                >
                  Template 3 (Tanpa Terbilang) ✨
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateType('template4')}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: `2px solid ${templateType === 'template4' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                    borderRadius: '6px',
                    backgroundColor: templateType === 'template4' ? 'var(--primary-color)' : 'var(--bg-primary)',
                    color: templateType === 'template4' ? '#fff' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: templateType === 'template4' ? '600' : '400',
                    transition: 'all 0.2s',
                  }}
                >
                  Template 4 (Terbilang Bawah) ✨
                </button>
              </div>
            </div>

            {/* Additional Fields for Manual Mode */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Tanggal Jatuh Tempo</label>
                <input
                  type="date"
                  value={calculation.tanggalJt ? new Date(calculation.tanggalJt).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleCalculationChange('tanggalJt', e.target.value ? new Date(e.target.value).toISOString() : '')}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>DP PO</label>
                <input
                  type="number"
                  value={calculation.dpPo === 0 || !calculation.dpPo ? '' : calculation.dpPo}
                  onChange={(e) => handleCalculationChange('dpPo', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Tunai</label>
                <input
                  type="number"
                  value={calculation.tunai === 0 || !calculation.tunai ? '' : calculation.tunai}
                  onChange={(e) => handleCalculationChange('tunai', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Kredit</label>
                <input
                  type="number"
                  value={calculation.kredit === 0 || !calculation.kredit ? '' : calculation.kredit}
                  onChange={(e) => handleCalculationChange('kredit', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>K.Debet</label>
                <input
                  type="number"
                  value={calculation.kDebet === 0 || !calculation.kDebet ? '' : calculation.kDebet}
                  onChange={(e) => handleCalculationChange('kDebet', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>K.Kredit</label>
                <input
                  type="number"
                  value={calculation.kKredit === 0 || !calculation.kKredit ? '' : calculation.kKredit}
                  onChange={(e) => handleCalculationChange('kKredit', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Kembali</label>
                <input
                  type="number"
                  value={calculation.kembaliKeKasir === 0 || !calculation.kembaliKeKasir ? '' : calculation.kembaliKeKasir}
                  onChange={(e) => handleCalculationChange('kembaliKeKasir', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>

            {/* Tanda Tangan Field - Hanya untuk Template 2 dan Template 3 */}
            {(templateType === 'template2' || templateType === 'template3') && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Tanda Tangan (Hormat Kami)
                </label>
                <input
                  type="text"
                  value={tandaTangan}
                  onChange={(e) => setTandaTangan(e.target.value)}
                  placeholder="M Ali Audah"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                Notes (Optional)
              </label>
              <textarea
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="Additional notes..."
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical',
                }}
              />
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleCreate} 
            disabled={
              mode === 'do'
                ? selectedDOs.length === 0 || autoItems.length === 0
                : mode === 'sj' 
                ? selectedSJs.length === 0 
                : !manualCustomer || manualItems.length === 0 || manualItems.some(item => !item.product)
            }
          >
            Create Invoice
          </Button>
        </div>
      </div>
    </div>
  );
};

// Edit Invoice Dialog Component
const EditInvoiceDialog = ({ 
  invoice, 
  products, 
  onClose, 
  onSave 
}: { 
  invoice: any; 
  customers: any[]; 
  products: any[]; 
  salesOrders: any[]; 
  onClose: () => void; 
  onSave: (data: any) => Promise<void> 
}) => {
  // Initialize lines dengan memastikan semua punya POT
  const invoiceLinesArray = Array.isArray(invoice.lines) ? invoice.lines : [];
  const initialLines = invoiceLinesArray.map((line: any) => ({
    ...line,
    pot: line.pot !== undefined ? line.pot : 0, // Ensure POT exists, default to 0
  }));
  const [lines, setLines] = useState<any[]>(initialLines);
  const [qtyInputValues, setQtyInputValues] = useState<{ [key: number]: string }>({});
  const [priceInputValues, setPriceInputValues] = useState<{ [key: number]: string }>({});
  
  // Initialize BOM dengan menghitung discountPercent dan taxPercent dari nilai yang ada
  const initialBom = invoice.bom || {};
  const initialSubtotal = invoiceLinesArray.reduce((sum: number, line: any) => 
    sum + (Number(line.qty || 0) * Number(line.price || 0)), 0
  );
  const initialDiscount = initialBom.discount || 0;
  const initialTax = initialBom.tax || 0;
  const initialDiscountPercent = initialSubtotal > 0 ? (initialDiscount / initialSubtotal) * 100 : 0;
  const initialTaxPercent = initialSubtotal > 0 ? (initialTax / initialSubtotal) * 100 : 0;
  
  const [bom, setBom] = useState<any>({
    ...initialBom,
    subtotal: initialSubtotal,
    discount: initialDiscount,
    discountPercent: initialDiscountPercent,
    tax: initialTax,
    taxPercent: initialTaxPercent,
    biayaLain: initialBom.biayaLain || 0,
    tanggalJt: initialBom.tanggalJt || '',
    dpPo: initialBom.dpPo || 0,
    tunai: initialBom.tunai || 0,
    kredit: initialBom.kredit || 0,
    kDebet: initialBom.kDebet || 0,
    kKredit: initialBom.kKredit || 0,
    kembaliKeKasir: initialBom.kembaliKeKasir || 0,
  });
  const [paymentTerms, setPaymentTerms] = useState(invoice.paymentTerms || 'TOP');
  const [topDays, setTopDays] = useState(invoice.topDays || 30);
  const [notes, setNotes] = useState(invoice.notes || '');
  const [templateType, setTemplateType] = useState(invoice.templateType || 'template1');
  const [tandaTangan, setTandaTangan] = useState(invoice.bom?.tandaTangan || ((invoice.templateType === 'template2' || invoice.templateType === 'template3') ? 'M Ali Audah' : ''));

  // Helper function to calculate due date based on payment terms
  const calculateDueDate = (terms: string, days: number): string => {
    const today = new Date();
    if (terms === 'TOP' && days > 0) {
      const dueDate = new Date(today);
      dueDate.setDate(today.getDate() + days);
      return dueDate.toISOString();
    } else if (terms === 'COD' || terms === 'CBD') {
      // COD/CBD: same day as invoice
      return today.toISOString();
    }
    return '';
  };

  // Auto-update tanggal jatuh tempo when payment terms or topDays change (only on mount or when changed)
  useEffect(() => {
    const newDueDate = calculateDueDate(paymentTerms, topDays);
    if (newDueDate) {
      // Only update if different from current value
      const currentDate = bom.tanggalJt ? new Date(bom.tanggalJt).toISOString().split('T')[0] : '';
      const newDate = newDueDate.split('T')[0];
      if (currentDate !== newDate) {
        handleBomChange('tanggalJt', newDueDate);
      }
    }
  }, [paymentTerms, topDays]);

  // Helper function untuk remove leading zero dari input angka
  const removeLeadingZero = (value: string): string => {
    if (!value) return value;
    // Jika hanya "0", "0.", atau "0," biarkan
    if (value === '0' || value === '0.' || value === '0,') {
      return value;
    }
    // Hapus semua leading zero kecuali untuk "0." atau "0,"
    if (value.startsWith('0') && value.length > 1) {
      // Jika dimulai dengan "0." atau "0," biarkan
      if (value.startsWith('0.') || value.startsWith('0,')) {
        return value;
      }
      // Hapus semua leading zero
      const cleaned = value.replace(/^0+/, '');
      return cleaned || '0';
    }
    return value;
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    
    // Recalculate price if qty or price changed
    if (field === 'qty' || field === 'price') {
      updated[index].subtotal = Number(updated[index].qty || 0) * Number(updated[index].price || 0);
    }
    
    setLines(updated);
    recalculateTotals(updated, bom);
  };

  const handleAddLine = () => {
    setLines([...lines, { itemSku: '', qty: 0, price: 0, subtotal: 0, unit: 'PCS', pot: 0 }]);
  };

  const handleRemoveLine = (index: number) => {
    const updated = lines.filter((_, i) => i !== index);
    setLines(updated);
    recalculateTotals(updated, bom);
  };

  const recalculateTotals = (currentLines: any[], currentBom: any) => {
    const subtotal = currentLines.reduce((sum, line) => sum + (Number(line.qty || 0) * Number(line.price || 0)), 0);
    const discount = currentBom.discount || 0;
    const tax = currentBom.tax || 0;
    const biayaLain = currentBom.biayaLain || 0;
    const total = subtotal - discount + tax + biayaLain;
    
    setBom({
      ...currentBom,
      subtotal,
      total,
    });
  };

  const handleBomChange = (field: string, value: any) => {
    const updated = { ...bom, [field]: value };
    setBom(updated);
    recalculateTotals(lines, updated);
  };

  const handleSave = () => {
    // Pastikan tandaTangan disimpan ke bom jika template2
    const updatedBom = {
      ...bom,
      ...((templateType === 'template2' || templateType === 'template3') ? { tandaTangan: tandaTangan || 'M Ali Audah' } : {}),
    };
    
    onSave({
      lines,
      bom: updatedBom,
      paymentTerms,
      topDays,
      notes,
      templateType,
    });
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90%', width: '1000px', maxHeight: '90vh', overflow: 'auto' }}>
        <Card className="dialog-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Edit Invoice - {invoice.invoiceNo}</h2>
            <Button variant="secondary" onClick={onClose} style={{ padding: '6px 12px' }}>✕</Button>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>Invoice Lines</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>SKU</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Product</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Qty</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Unit</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Price</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>POT</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Subtotal</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => {
                  const product = products.find((p: any) => 
                    p.sku === line.itemSku || p.kode === line.itemSku || p.id === line.itemSku
                  );
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="text"
                          value={line.itemSku || ''}
                          onChange={(e) => handleLineChange(idx, 'itemSku', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                          }}
                          placeholder="SKU"
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {product?.nama || '-'}
                        </div>
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={qtyInputValues[idx] !== undefined ? qtyInputValues[idx] : (line.qty !== undefined && line.qty !== null && line.qty !== 0 ? String(line.qty) : '')}
                          onFocus={(e) => {
                            const input = e.target as HTMLInputElement;
                            const currentQty = line.qty;
                            if (currentQty === 0 || currentQty === null || currentQty === undefined || String(currentQty) === '0') {
                              setQtyInputValues(prev => ({ ...prev, [idx]: '' }));
                              input.value = '';
                            } else {
                              input.select();
                            }
                          }}
                          onMouseDown={(e) => {
                            const input = e.target as HTMLInputElement;
                            const currentQty = line.qty;
                            if (currentQty === 0 || currentQty === null || currentQty === undefined || String(currentQty) === '0') {
                              setQtyInputValues(prev => ({ ...prev, [idx]: '' }));
                              input.value = '';
                            }
                          }}
                          onChange={(e) => {
                            let val = e.target.value;
                            val = val.replace(/[^\d.,]/g, '');
                            const cleaned = removeLeadingZero(val);
                            setQtyInputValues(prev => ({ ...prev, [idx]: cleaned }));
                            handleLineChange(idx, 'qty', cleaned === '' ? 0 : Number(cleaned) || 0);
                          }}
                          onBlur={(e) => {
                            const val = e.target.value;
                            if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                              handleLineChange(idx, 'qty', 0);
                              setQtyInputValues(prev => {
                                const newVal = { ...prev };
                                delete newVal[idx];
                                return newVal;
                              });
                            } else {
                              handleLineChange(idx, 'qty', Number(val));
                              setQtyInputValues(prev => {
                                const newVal = { ...prev };
                                delete newVal[idx];
                                return newVal;
                              });
                            }
                          }}
                          onKeyDown={(e) => {
                            const input = e.target as HTMLInputElement;
                            const currentVal = input.value;
                            if ((currentVal === '' || currentVal === '0') && /^[1-9]$/.test(e.key)) {
                              e.preventDefault();
                              const newVal = e.key;
                              setQtyInputValues(prev => ({ ...prev, [idx]: newVal }));
                              input.value = newVal;
                              handleLineChange(idx, 'qty', Number(newVal));
                            }
                          }}
                          placeholder="0"
                          style={{
                            width: '100%',
                            padding: '6px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            textAlign: 'right',
                          }}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <select
                            value={line.unit && ['PCS', 'BOX', 'PACK', 'LOT'].includes(line.unit) ? line.unit : 'CUSTOM'}
                            onChange={(e) => {
                              if (e.target.value === 'CUSTOM') {
                                handleLineChange(idx, 'unit', '');
                              } else {
                                handleLineChange(idx, 'unit', e.target.value);
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: '6px',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              backgroundColor: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              fontSize: '14px',
                            }}
                          >
                            <option value="PCS">PCS</option>
                            <option value="BOX">BOX</option>
                            <option value="PACK">PACK</option>
                            <option value="LOT">LOT</option>
                            <option value="CUSTOM">Custom...</option>
                          </select>
                          {(!line.unit || line.unit === 'CUSTOM' || !['PCS', 'BOX', 'PACK', 'LOT'].includes(line.unit)) && (
                            <input
                              type="text"
                              value={line.unit && !['PCS', 'BOX', 'PACK', 'LOT', 'CUSTOM'].includes(line.unit) ? line.unit : ''}
                              onChange={(e) => handleLineChange(idx, 'unit', e.target.value)}
                              placeholder="UOM"
                              style={{
                                flex: 1,
                                padding: '6px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                fontSize: '14px',
                                minWidth: '80px',
                              }}
                            />
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={priceInputValues[idx] !== undefined ? priceInputValues[idx] : (line.price !== undefined && line.price !== null && line.price !== 0 ? String(line.price) : '')}
                          onFocus={(e) => {
                            const input = e.target as HTMLInputElement;
                            const currentPrice = line.price;
                            if (currentPrice === 0 || currentPrice === null || currentPrice === undefined || String(currentPrice) === '0') {
                              setPriceInputValues(prev => ({ ...prev, [idx]: '' }));
                              input.value = '';
                            } else {
                              input.select();
                            }
                          }}
                          onMouseDown={(e) => {
                            const input = e.target as HTMLInputElement;
                            const currentPrice = line.price;
                            if (currentPrice === 0 || currentPrice === null || currentPrice === undefined || String(currentPrice) === '0') {
                              setPriceInputValues(prev => ({ ...prev, [idx]: '' }));
                              input.value = '';
                            }
                          }}
                          onChange={(e) => {
                            let val = e.target.value;
                            val = val.replace(/[^\d.,]/g, '');
                            const cleaned = removeLeadingZero(val);
                            setPriceInputValues(prev => ({ ...prev, [idx]: cleaned }));
                            handleLineChange(idx, 'price', cleaned === '' ? 0 : Number(cleaned) || 0);
                          }}
                          onBlur={(e) => {
                            const val = e.target.value;
                            if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                              handleLineChange(idx, 'price', 0);
                              setPriceInputValues(prev => {
                                const newVal = { ...prev };
                                delete newVal[idx];
                                return newVal;
                              });
                            } else {
                              handleLineChange(idx, 'price', Number(val));
                              setPriceInputValues(prev => {
                                const newVal = { ...prev };
                                delete newVal[idx];
                                return newVal;
                              });
                            }
                          }}
                          onKeyDown={(e) => {
                            const input = e.target as HTMLInputElement;
                            const currentVal = input.value;
                            if ((currentVal === '' || currentVal === '0') && /^[1-9]$/.test(e.key)) {
                              e.preventDefault();
                              const newVal = e.key;
                              setPriceInputValues(prev => ({ ...prev, [idx]: newVal }));
                              input.value = newVal;
                              handleLineChange(idx, 'price', Number(newVal));
                            }
                          }}
                          placeholder="0"
                          style={{
                            width: '100%',
                            padding: '6px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            textAlign: 'right',
                          }}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={line.pot !== undefined && line.pot !== null && line.pot !== 0 ? String(line.pot) : ''}
                          onChange={(e) => {
                            let val = e.target.value;
                            val = val.replace(/[^\d.,]/g, '');
                            const cleaned = removeLeadingZero(val);
                            handleLineChange(idx, 'pot', cleaned === '' ? 0 : Number(cleaned) || 0);
                          }}
                          placeholder="0"
                          style={{
                            width: '100%',
                            padding: '6px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            textAlign: 'right',
                          }}
                        />
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {Number(line.qty || 0) * Number(line.price || 0)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <Button 
                          variant="danger" 
                          onClick={() => handleRemoveLine(idx)}
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                        >
                          Del
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Button variant="secondary" onClick={handleAddLine} style={{ fontSize: '12px', padding: '6px 12px' }}>
              + Add Line
            </Button>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>Calculation</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Discount (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={bom.discountPercent === 0 || !bom.discountPercent ? '' : bom.discountPercent}
                  onChange={(e) => {
                    const percent = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                    const discount = (bom.subtotal || 0) * (percent / 100);
                    handleBomChange('discountPercent', percent);
                    handleBomChange('discount', discount);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Discount (Rp)
                </label>
                <input
                  type="number"
                  value={bom.discount === 0 || !bom.discount ? '' : bom.discount}
                  onChange={(e) => {
                    const discount = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                    const percent = (bom.subtotal || 0) > 0 ? (discount / (bom.subtotal || 1)) * 100 : 0;
                    handleBomChange('discount', discount);
                    handleBomChange('discountPercent', percent);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Tax (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={bom.taxPercent === 0 || !bom.taxPercent ? '' : bom.taxPercent}
                  onChange={(e) => {
                    const percent = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                    const tax = (bom.subtotal || 0) * (percent / 100);
                    handleBomChange('taxPercent', percent);
                    handleBomChange('tax', tax);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Tax (Rp)
                </label>
                <input
                  type="number"
                  value={bom.tax === 0 || !bom.tax ? '' : bom.tax}
                  onChange={(e) => {
                    const tax = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                    const percent = (bom.subtotal || 0) > 0 ? (tax / (bom.subtotal || 1)) * 100 : 0;
                    handleBomChange('tax', tax);
                    handleBomChange('taxPercent', percent);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Biaya Lain
                </label>
                <input
                  type="number"
                  value={bom.biayaLain === 0 || !bom.biayaLain ? '' : bom.biayaLain}
                  onChange={(e) => handleBomChange('biayaLain', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Payment Terms
                </label>
                <select
                  value={paymentTerms}
                  onChange={(e) => {
                    setPaymentTerms(e.target.value);
                    if (e.target.value === 'COD' || e.target.value === 'CBD') {
                      setTopDays(0);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="TOP">TOP</option>
                  <option value="COD">COD</option>
                  <option value="CBD">CBD</option>
                </select>
              </div>
              {paymentTerms === 'TOP' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                    TOP Days
                  </label>
                  <input
                    type="number"
                    value={topDays === 0 ? '' : topDays}
                    onChange={(e) => setTopDays(e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              )}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Tanggal Jatuh Tempo
                </label>
                <input
                  type="date"
                  value={bom.tanggalJt ? new Date(bom.tanggalJt).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleBomChange('tanggalJt', e.target.value ? new Date(e.target.value).toISOString() : '')}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  DP PO
                </label>
                <input
                  type="number"
                  value={bom.dpPo === 0 || !bom.dpPo ? '' : bom.dpPo}
                  onChange={(e) => handleBomChange('dpPo', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Tunai
                </label>
                <input
                  type="number"
                  value={bom.tunai === 0 || !bom.tunai ? '' : bom.tunai}
                  onChange={(e) => handleBomChange('tunai', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Kredit
                </label>
                <input
                  type="number"
                  value={bom.kredit === 0 || !bom.kredit ? '' : bom.kredit}
                  onChange={(e) => handleBomChange('kredit', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  K.Debet
                </label>
                <input
                  type="number"
                  value={bom.kDebet === 0 || !bom.kDebet ? '' : bom.kDebet}
                  onChange={(e) => handleBomChange('kDebet', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  K.Kredit
                </label>
                <input
                  type="number"
                  value={bom.kKredit === 0 || !bom.kKredit ? '' : bom.kKredit}
                  onChange={(e) => handleBomChange('kKredit', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Kembali
                </label>
                <input
                  type="number"
                  value={bom.kembaliKeKasir === 0 || !bom.kembaliKeKasir ? '' : bom.kembaliKeKasir}
                  onChange={(e) => handleBomChange('kembaliKeKasir', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>
            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Subtotal:</span>
                <strong>{bom.subtotal?.toLocaleString('id-ID') || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Discount ({bom.discountPercent?.toFixed(2) || 0}%):</span>
                <strong>{bom.discount?.toLocaleString('id-ID') || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Tax ({bom.taxPercent?.toFixed(2) || 0}%):</span>
                <strong>{bom.tax?.toLocaleString('id-ID') || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Biaya Lain:</span>
                <strong>{bom.biayaLain?.toLocaleString('id-ID') || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Tanggal Jatuh Tempo:</span>
                <strong>{bom.tanggalJt ? new Date(bom.tanggalJt).toLocaleDateString('id-ID') : '-'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border-color)', marginBottom: '8px' }}>
                <span><strong>Total:</strong></span>
                <strong>{bom.total?.toLocaleString('id-ID') || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>DP PO:</span>
                <strong>{bom.dpPo?.toLocaleString('id-ID') || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Tunai:</span>
                <strong>{bom.tunai?.toLocaleString('id-ID') || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Kredit:</span>
                <strong>{bom.kredit?.toLocaleString('id-ID') || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>K.Debet:</span>
                <strong>{bom.kDebet?.toLocaleString('id-ID') || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>K.Kredit:</span>
                <strong>{bom.kKredit?.toLocaleString('id-ID') || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Kembali:</span>
                <strong>{bom.kembaliKeKasir?.toLocaleString('id-ID') || 0}</strong>
              </div>
            </div>
          </div>

          {/* Template Selection */}
          <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
              📄 Pilih Template Invoice
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setTemplateType('template1')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: `2px solid ${templateType === 'template1' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                  borderRadius: '6px',
                  backgroundColor: templateType === 'template1' ? 'var(--primary-color)' : 'var(--bg-primary)',
                  color: templateType === 'template1' ? '#fff' : 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: templateType === 'template1' ? '600' : '400',
                  transition: 'all 0.2s',
                }}
              >
                Template 1 (Default)
              </button>
                <button
                  type="button"
                  onClick={() => setTemplateType('template2')}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: `2px solid ${templateType === 'template2' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                    borderRadius: '6px',
                    backgroundColor: templateType === 'template2' ? 'var(--primary-color)' : 'var(--bg-primary)',
                    color: templateType === 'template2' ? '#fff' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: templateType === 'template2' ? '600' : '400',
                    transition: 'all 0.2s',
                  }}
                >
                  Template 2 (Baru) ✨
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateType('template3')}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: `2px solid ${templateType === 'template3' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                    borderRadius: '6px',
                    backgroundColor: templateType === 'template3' ? 'var(--primary-color)' : 'var(--bg-primary)',
                    color: templateType === 'template3' ? '#fff' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: templateType === 'template3' ? '600' : '400',
                    transition: 'all 0.2s',
                  }}
                >
                  Template 3 (Tanpa Terbilang) ✨
                </button>
              </div>
          </div>

          {/* Tanda Tangan Field - Hanya untuk Template 2 dan Template 3 */}
          {(templateType === 'template2' || templateType === 'template3') && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                Tanda Tangan (Hormat Kami)
              </label>
              <input
                type="text"
                value={tandaTangan}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setTandaTangan(newValue);
                  // Update bom langsung saat onChange agar tersimpan otomatis
                  handleBomChange('tandaTangan', newValue || 'M Ali Audah');
                }}
                placeholder="M Ali Audah"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              />
            </div>
          )}

          {/* Notes/Keterangan Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Keterangan / Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Masukkan keterangan atau catatan untuk invoice ini (bisa sepanjang apapun, bahkan sampai 100 lembar)..."
              rows={10}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                minHeight: '200px',
                maxHeight: 'none',
                overflowY: 'auto',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>Save Changes</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

// Update Invoice (Upload Bukti Transfer) Dialog Component
const UpdateInvoiceDialog = ({ 
  invoice, 
  onClose, 
  onSave,
  showAlert: parentShowAlert
}: { 
  invoice: any; 
  onClose: () => void; 
  onSave: (paymentProof: string, paymentProofName: string) => Promise<void>;
  showAlert: (message: string, title?: string) => void;
}) => {
  const [paymentFile, setPaymentFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPaymentFile(file);
    }
  };

  const handleSave = async () => {
    if (!paymentFile) {
      parentShowAlert('⚠️ Please upload bukti transfer customer', 'Warning');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        await onSave(base64, paymentFile.name);
      };
      reader.readAsDataURL(paymentFile);
    } catch (error: any) {
      parentShowAlert(`Error uploading file: ${error.message}`, 'Error');
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
        <Card className="dialog-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Upload Bukti Transfer - {invoice.invoiceNo}</h2>
            <Button variant="secondary" onClick={onClose} style={{ padding: '6px 12px' }}>✕</Button>
          </div>

          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
            <div style={{ fontSize: '13px', marginBottom: '8px' }}>
              <strong>Invoice No:</strong> {invoice.invoiceNo}
            </div>
            <div style={{ fontSize: '13px', marginBottom: '8px' }}>
              <strong>Customer:</strong> {invoice.customer}
            </div>
            <div style={{ fontSize: '13px', marginBottom: '8px' }}>
              <strong>Total:</strong> Rp {invoice.bom?.total?.toLocaleString('id-ID') || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              ⚠️ Setelah upload bukti transfer, status invoice akan otomatis menjadi CLOSE
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Upload Bukti Transfer Customer *
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
            {paymentFile && (
              <div style={{ fontSize: '12px', color: 'var(--success)', marginTop: '4px' }}>
                Selected: {paymentFile.name}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>
              Upload & Close Invoice
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Accounting;
