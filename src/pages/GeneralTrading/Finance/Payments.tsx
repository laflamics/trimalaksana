import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import NotificationBell from '../../../components/NotificationBell';
import { storageService } from '../../../services/storage';
import { loadGTDataFromLocalStorage } from '../../../utils/gtStorageHelper';
import '../../../styles/common.css';
import '../../../styles/compact.css';

interface Payment {
  id: string;
  no: number;
  paymentNo: string;
  paymentDate: string;
  type: 'Receipt' | 'Payment';
  invoiceNo?: string;
  poNo?: string;
  purchaseOrderNo?: string;
  customerCode?: string;
  supplierCode?: string;
  customerName?: string;
  supplierName?: string;
  amount: number;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Check' | 'Credit Card';
  reference?: string;
  notes?: string;
}

const Payments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [pendingFinanceNotifications, setPendingFinanceNotifications] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  
  // Format notifications untuk NotificationBell
  const financeNotifications = useMemo(() => {
    return pendingFinanceNotifications.map((notif: any) => ({
      id: notif.id,
      title: `PO ${notif.poNo || 'N/A'}`,
      message: `Supplier: ${notif.supplier || 'N/A'} | Product: ${notif.productItem || 'N/A'} | Qty: ${notif.qty || 0} PCS | Amount: Rp ${(notif.total || 0).toLocaleString('id-ID')}`,
      timestamp: notif.receivedDate || notif.created || notif.timestamp,
      notif: notif, // Keep original data
    }));
  }, [pendingFinanceNotifications]);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [amountInputValue, setAmountInputValue] = useState('');
  const [debitAccountInputValue, setDebitAccountInputValue] = useState('');
  const [creditAccountInputValue, setCreditAccountInputValue] = useState('');
  const [formData, setFormData] = useState<Partial<Payment & { debitAccount?: string; creditAccount?: string }>>({
    paymentDate: new Date().toISOString().split('T')[0],
    amount: 0,
    paymentMethod: 'Bank Transfer',
    debitAccount: '',
    creditAccount: '',
  });
  const [localAlert, setLocalAlert] = useState<{ show: boolean; message: string }>({
    show: false,
    message: '',
  });

  // Custom Dialog state
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
      type: 'alert',
      title: '',
      message: '',
    });
  };

  useEffect(() => {
    loadPayments();
    loadInvoices();
    loadPurchaseOrders();
    loadAccounts();
    // Refresh notifications setiap 2 detik
    const interval = setInterval(() => {
      loadPurchaseOrders();
    }, 2000);
    return () => clearInterval(interval);
  }, []);


  const loadAccounts = async () => {
    // Load langsung dari localStorage untuk memastikan data terbaru
    const data = await loadGTDataFromLocalStorage<any>(
      'gt_accounts',
      async () => await storageService.get<any[]>('gt_accounts') || []
    );
    if (!data || data.length === 0) {
      const defaultAccounts: any[] = [
        { code: '1000', name: 'Cash', type: 'Asset', balance: 0 },
        { code: '1100', name: 'Accounts Receivable', type: 'Asset', balance: 0 },
        { code: '2000', name: 'Accounts Payable', type: 'Liability', balance: 0 },
      ];
      await storageService.set('gt_accounts', defaultAccounts);
      setAccounts(defaultAccounts);
    } else {
      setAccounts(data);
    }
  };

  const showLocalAlert = (message: string) => {
    setLocalAlert({ show: true, message });
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(true);
    }
  };

  const closeLocalAlert = () => {
    setLocalAlert({ show: false, message: '' });
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(false);
    }
  };

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


  const getDebitAccountInputDisplayValue = () => {
    if (debitAccountInputValue !== undefined && debitAccountInputValue !== '') {
      return debitAccountInputValue;
    }
    // Ensure accounts is always an array
    const accountsArray = Array.isArray(accounts) ? accounts : [];
    if (formData.debitAccount) {
      const account = accountsArray.find(a => a.code === formData.debitAccount);
      if (account) {
        return `${account.code} - ${account.name}`;
      }
      return formData.debitAccount;
    }
    return '';
  };

  const getCreditAccountInputDisplayValue = () => {
    if (creditAccountInputValue !== undefined && creditAccountInputValue !== '') {
      return creditAccountInputValue;
    }
    // Ensure accounts is always an array
    const accountsArray = Array.isArray(accounts) ? accounts : [];
    if (formData.creditAccount) {
      const account = accountsArray.find((a: any) => a.code === formData.creditAccount);
      if (account) {
        return `${account.code} - ${account.name}`;
      }
      return formData.creditAccount;
    }
    return '';
  };

  const handleDebitAccountInputChange = (text: string) => {
    setDebitAccountInputValue(text);
    // Ensure accounts is always an array
    const accountsArray = Array.isArray(accounts) ? accounts : [];
    const matchedAccount = accountsArray.find(a => {
      const label = `${a.code || ''}${a.code ? ' - ' : ''}${a.name || ''}`;
      return label === text;
    });
    if (matchedAccount) {
      setFormData({ ...formData, debitAccount: matchedAccount.code });
    } else if (!text) {
      setFormData({ ...formData, debitAccount: '' });
    }
  };

  const handleCreditAccountInputChange = (text: string) => {
    setCreditAccountInputValue(text);
    // Ensure accounts is always an array
    const accountsArray = Array.isArray(accounts) ? accounts : [];
    const matchedAccount = accountsArray.find(a => {
      const label = `${a.code || ''}${a.code ? ' - ' : ''}${a.name || ''}`;
      return label === text;
    });
    if (matchedAccount) {
      setFormData({ ...formData, creditAccount: matchedAccount.code });
    } else if (!text) {
      setFormData({ ...formData, creditAccount: '' });
    }
  };


  const loadPayments = async () => {
    // Load from both 'gt_payments' (existing) and create unified list
    // Load langsung dari localStorage untuk memastikan data terbaru
    const existingPayments = await loadGTDataFromLocalStorage<any>(
      'gt_payments',
      async () => await storageService.get<any[]>('gt_payments') || []
    );
    // Ensure existingPayments is always an array
    const existingPaymentsArray = Array.isArray(existingPayments) ? existingPayments : [];
    const allPayments = existingPaymentsArray.map((p, idx) => ({
      id: p.id || Date.now().toString() + idx,
      no: idx + 1,
      paymentNo: p.paymentNo || `PAY-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(idx + 1).padStart(4, '0')}`,
      paymentDate: p.paymentDate || p.created || new Date().toISOString().split('T')[0],
      type: p.type || (p.invoiceNo ? 'Receipt' : 'Payment'),
      invoiceNo: p.invoiceNo,
      poNo: p.poNo,
      purchaseOrderNo: p.poNo || p.purchaseOrderNo,
      customerName: p.customer || p.customerName,
      supplierName: p.supplier || p.supplierName,
      amount: p.amount || p.total || 0,
      paymentMethod: p.paymentMethod || 'Bank Transfer',
      reference: p.reference,
      notes: p.notes,
    }));
    setPayments(allPayments);
  };

  const loadInvoices = async () => {
    // Load langsung dari localStorage untuk memastikan data terbaru
    const data = await loadGTDataFromLocalStorage<any>(
      'gt_invoices',
      async () => await storageService.get<any[]>('gt_invoices') || []
    );
    const paymentsData = await loadGTDataFromLocalStorage<any>(
      'gt_payments',
      async () => await storageService.get<any[]>('gt_payments') || []
    );
    // Ensure data and paymentsData are always arrays
    const dataArray = Array.isArray(data) ? data : [];
    const paymentsDataArray = Array.isArray(paymentsData) ? paymentsData : [];
    // Calculate balance for each invoice
    const invoicesWithBalance = dataArray.map(inv => {
      const invoicePayments = paymentsDataArray.filter((p: any) => p.invoiceNo === inv.invoiceNo);
      const paidAmount = invoicePayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      const balance = (inv.total || 0) - paidAmount;
      return { ...inv, paidAmount, balance };
    });
    setInvoices(invoicesWithBalance.filter(inv => inv.balance > 0));
  };

  const loadPurchaseOrders = async () => {
    const [poData, financeNotifData, grnData] = await Promise.all([
      storageService.get<any[]>('gt_purchaseOrders') || [],
      storageService.get<any[]>('gt_financeNotifications') || [],
      storageService.get<any[]>('gt_grn') || [],
    ]);
    
    // Auto-fix: Recalculate total untuk notification yang masih pakai total PO (fix untuk notification lama)
    // Ensure all data is always an array
    const financeNotifDataArray = Array.isArray(financeNotifData) ? financeNotifData : [];
    const poDataForFix = Array.isArray(poData) ? poData : [];
    const grnDataForFix = Array.isArray(grnData) ? grnData : [];
    const fixedNotifs = financeNotifDataArray.map((notif: any) => {
      // Jika notification punya grnNo tapi total-nya sama dengan total PO, berarti perlu di-recalculate
      if (notif.grnNo && notif.type === 'SUPPLIER_PAYMENT' && notif.status === 'PENDING') {
        // Cari PO dan GRN untuk recalculate
        const po = poDataForFix.find((p: any) => p.poNo === notif.poNo);
        const grn = grnDataForFix.find((g: any) => g.grnNo === notif.grnNo);
        
        if (po && grn && grn.qtyReceived) {
          // Recalculate total per GRN
          const unitPrice = po.price || 0;
          const subtotal = Math.ceil(grn.qtyReceived * unitPrice);
          const discountPercent = po.discountPercent || 0;
          const discountAmount = subtotal * discountPercent / 100;
          const grnTotal = Math.ceil(subtotal - discountAmount);
          
          // Jika total berbeda dengan yang ada, berarti perlu di-update
          if (notif.total !== grnTotal) {
            return {
              ...notif,
              total: grnTotal,
              qty: grn.qtyReceived,
              unitPrice: unitPrice,
              discountPercent: discountPercent,
            };
          }
        }
      }
      return notif;
    });
    
    // Update jika ada perubahan
    if (JSON.stringify(fixedNotifs) !== JSON.stringify(financeNotifDataArray)) {
      await storageService.set('gt_financeNotifications', fixedNotifs);
    }
    
    // Auto-cleanup: Hapus notifications yang sudah CLOSE
    const cleanedNotifs = fixedNotifs.filter((notif: any) => {
      // Hapus jika status sudah CLOSE
      if ((notif.status || 'PENDING').toUpperCase() === 'CLOSE') {
        return false;
      }
      
      // Keep notification jika masih PENDING (payment per GRN, jadi bisa ada multiple notifications per PO)
      return true;
    });
    
    // Update notifications di storage (cleanup yang sudah tidak relevan)
    if (financeNotifDataArray.length > 0 && JSON.stringify(cleanedNotifs) !== JSON.stringify(financeNotifDataArray)) {
      await storageService.set('gt_financeNotifications', cleanedNotifs);
    }
    
    const pending = cleanedNotifs.filter((notif: any) =>
      notif.type === 'SUPPLIER_PAYMENT' && (notif.status || 'PENDING').toUpperCase() !== 'CLOSE'
    );
    setPendingFinanceNotifications(pending);
    // Helper function untuk mendapatkan product name dari berbagai sumber
    const getProductNameFromNotification = async (notif: any, po: any): Promise<string> => {
      // Prioritas 1: dari GRN
      if (notif.grnNo) {
        const grnList = await storageService.get<any[]>('gt_grn') || [];
        const grn = grnList.find((g: any) => g.grnNo === notif.grnNo);
        // Format baru: productItem, format lama: materialItem (backward compatibility)
        if (grn && (grn.productItem || grn.materialItem)) {
          return grn.productItem || grn.materialItem;
        }
      }
      
      // Prioritas 2: dari PO
      // Format baru: productItem, format lama: materialItem (backward compatibility)
      if (po && (po.productItem || po.materialItem)) {
        return po.productItem || po.materialItem;
      }
      
      // Prioritas 3: dari notification
      // Format baru: productItem, format lama: materialItem (backward compatibility)
      if (notif.productItem || notif.materialItem) {
        return notif.productItem || notif.materialItem;
      }
      
      // Prioritas 4: dari productId (cari di master products)
      // Format baru: productId, format lama: materialId (backward compatibility)
      const productId = notif.productId || notif.materialId || po?.productId || po?.materialId;
      if (productId) {
        const products = await storageService.get<any[]>('gt_products') || [];
        // Ensure products is always an array
        const productsArray = Array.isArray(products) ? products : [];
        const product = productsArray.find((p: any) => 
          (p.product_id || p.kode || '').toString().trim().toLowerCase() === 
          (productId || '').toString().trim().toLowerCase()
        );
        if (product) {
          return product.nama || product.productName || product.itemName || '';
        }
      }
      
      return '-';
    };
    
    // Ensure poData is always an array
    const poDataArray = Array.isArray(poData) ? poData : [];
    const openFinancePOs = await Promise.all(pending.map(async (notif: any) => {
      const po = poDataArray.find((p: any) => p.poNo === notif.poNo);
      const productName = await getProductNameFromNotification(notif, po);
      
      return {
        id: po?.id || notif.id,
        poNo: notif.poNo || po?.poNo || '-',
        supplier: po?.supplier || notif.supplier || '-',
        soNo: po?.soNo || notif.soNo || '-',
        total: po?.total || notif.total || 0,
        status: po?.status || 'OPEN',
        productItem: productName, // Product name dari berbagai sumber
        qty: po?.qty || notif.qty || 0,
        receiptDate: po?.receiptDate || notif.receivedDate || '-',
        suratJalan: notif.suratJalan,
        suratJalanName: notif.suratJalanName,
        invoiceNo: notif.invoiceNo || '',
        invoiceFile: notif.invoiceFile || '',
        invoiceFileName: notif.invoiceFileName || '',
        grnNo: notif.grnNo,
        purchaseReason: po?.purchaseReason || notif.purchaseReason || '',
      };
    }));
    setPurchaseOrders(openFinancePOs);
  };

  const generatePaymentNo = () => {
    const date = new Date(formData.paymentDate || new Date());
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    // Ensure payments is always an array
    const paymentsArray = Array.isArray(payments) ? payments : [];
    const count = paymentsArray.length + 1;
    return `PAY-${year}${month}-${String(count).padStart(4, '0')}`;
  };

  const handleLoadFromInvoice = (invNo: string) => {
    // Ensure invoices is always an array
    const invoicesArray = Array.isArray(invoices) ? invoices : [];
    const inv = invoicesArray.find(i => i.invoiceNo === invNo);
    if (inv) {
      setAmountInputValue('');
      setFormData({
        ...formData,
        type: 'Receipt',
        invoiceNo: inv.invoiceNo,
        customerName: inv.customer,
        amount: inv.balance || inv.total,
      });
    }
  };

  const handleLoadFromPO = (poNo: string) => {
    // Ensure purchaseOrders is always an array
    const purchaseOrdersArray = Array.isArray(purchaseOrders) ? purchaseOrders : [];
    const po = purchaseOrdersArray.find(p => p.poNo === poNo);
    if (po) {
      setAmountInputValue('');
      setFormData({
        ...formData,
        poNo: po.poNo,
        purchaseOrderNo: po.poNo,
        supplierName: po.supplier,
        amount: po.total,
      });
    } else {
      showAlert('Tidak ada PO dengan status open payment. Semua PO sudah CLOSE atau belum punya GRN.', 'Information');
    }
  };

  // handleViewNotificationSJ removed - functionality moved to NotificationBell dropdown menu (if needed)

  const handleLoadNotificationToForm = (notif: any) => {
    setShowForm(true);
    setEditingPayment(null);
    setAmountInputValue('');
    const defaultDate = new Date().toISOString().split('T')[0];
    // Amount per GRN (untuk partial receipt support)
    const paymentAmount = notif.total || 0;
    setFormData({
      paymentDate: defaultDate,
      poNo: notif.poNo || '',
      purchaseOrderNo: notif.poNo || '',
      supplierName: notif.supplier || '',
      amount: paymentAmount, // Amount per GRN, bukan total PO
      paymentMethod: 'Bank Transfer',
      reference: notif.grnNo ? `GRN ${notif.grnNo}` : '',
      notes: notif.grnNo 
        ? `Payment for PO ${notif.poNo || ''} - GRN ${notif.grnNo} (${notif.qty || 0} PCS)${notif.invoiceNo ? ` - Invoice: ${notif.invoiceNo}` : ''}`
        : `Payment for PO ${notif.poNo || ''}${notif.invoiceNo ? ` - Invoice: ${notif.invoiceNo}` : ''}`,
      invoiceNo: notif.invoiceNo || '',
      debitAccount: '',
      creditAccount: '',
      // Store GRN info untuk tracking
      grnNo: notif.grnNo || '',
    } as any);
    setDebitAccountInputValue('');
    setCreditAccountInputValue('');
  };

  const handleSave = async () => {
    try {
      if (!formData.paymentDate || !formData.amount || formData.amount <= 0) {
        showLocalAlert('Please fill payment date and amount');
        return;
      }

      // Ensure payments is always an array
      const paymentsArray = Array.isArray(payments) ? payments : [];
      if (editingPayment) {
        const updated = paymentsArray.map(p =>
          p.id === editingPayment.id
            ? { ...formData, id: editingPayment.id, no: editingPayment.no, paymentNo: editingPayment.paymentNo } as Payment
            : p
        );
        await storageService.set('gt_payments', updated);
        setPayments(updated.map((p, idx) => ({ ...p, no: idx + 1 })));
      } else {
        const newPayment: Payment = {
          id: Date.now().toString(),
          no: paymentsArray.length + 1,
          paymentNo: generatePaymentNo(),
          ...formData,
        } as Payment;
        const updated = [...paymentsArray, newPayment];
        await storageService.set('gt_payments', updated);
        setPayments(updated.map((p, idx) => ({ ...p, no: idx + 1 })));
        
        // Auto-create journal entries untuk General Ledger
        try {
          const journalEntries = await storageService.get<any[]>('gt_journalEntries') || [];
          const accounts = await storageService.get<any[]>('gt_accounts') || [];
          const entryDate = formData.paymentDate || new Date().toISOString().split('T')[0];
          
          // Create journal entries using selected COA
          if (formData.debitAccount && formData.creditAccount) {
            // Ensure accounts is always an array
            const accountsArray = Array.isArray(accounts) ? accounts : [];
            const debitAccount = accountsArray.find((a: any) => a.code === formData.debitAccount);
            const creditAccount = accountsArray.find((a: any) => a.code === formData.creditAccount);
            const amount = formData.amount || 0;
            
            if (debitAccount && creditAccount) {
              const entriesToAdd = [
                {
                  entryDate: entryDate,
                  reference: newPayment.paymentNo,
                  account: formData.debitAccount,
                  accountName: debitAccount.name,
                  debit: amount,
                  credit: 0,
                  description: `Payment ${newPayment.paymentNo} - ${formData.customerName || formData.supplierName || 'Payment'}`,
                },
                {
                  entryDate: entryDate,
                  reference: newPayment.paymentNo,
                  account: formData.creditAccount,
                  accountName: creditAccount.name,
                  debit: 0,
                  credit: amount,
                  description: `Payment ${newPayment.paymentNo} - ${formData.customerName || formData.supplierName || 'Payment'}`,
                },
              ];

              // Ensure journalEntries is always an array
              const journalEntriesArray = Array.isArray(journalEntries) ? journalEntries : [];
              const baseLength = journalEntriesArray.length;
              const entriesWithNo = entriesToAdd.map((entry, idx) => ({
                ...entry,
                id: `${Date.now()}-${idx + 1}`,
                no: baseLength + idx + 1,
              }));
              await storageService.set('gt_journalEntries', [...journalEntriesArray, ...entriesWithNo]);
            }
          }
        } catch (error: any) {
          console.error('Error creating journal entries:', error);
        }

        if (formData.poNo) {
          try {
            const financeNotifications = await storageService.get<any[]>('gt_financeNotifications') || [];
            // Ensure financeNotifications is always an array
            const financeNotificationsArray = Array.isArray(financeNotifications) ? financeNotifications : [];
            
            // IMPORTANT: Hanya close notification untuk GRN yang dibayar (partial receipt support)
            // Jika ada grnNo di formData, hanya close notification untuk GRN tersebut
            // Jika tidak ada grnNo, close semua notification untuk PO (backward compatibility)
            const grnNo = (formData as any).grnNo;
            const updatedNotifications = financeNotificationsArray.map((n: any) => {
              if (n.poNo === formData.poNo && n.type === 'SUPPLIER_PAYMENT') {
                // Jika ada grnNo, hanya close notification untuk GRN tersebut
                if (grnNo && n.grnNo === grnNo) {
                  return { ...n, status: 'CLOSE', paidAt: new Date().toISOString() };
                }
                // Jika tidak ada grnNo, close semua (backward compatibility)
                if (!grnNo) {
                  return { ...n, status: 'CLOSE', paidAt: new Date().toISOString() };
                }
              }
              return n;
            });
            await storageService.set('gt_financeNotifications', updatedNotifications);

            // Cek apakah semua GRN untuk PO ini sudah dibayar
            const purchaseOrders = await storageService.get<any[]>('gt_purchaseOrders') || [];
            const purchaseOrdersArray = Array.isArray(purchaseOrders) ? purchaseOrders : [];
            const po = purchaseOrdersArray.find((p: any) => p.poNo === formData.poNo);
            
            if (po) {
              // Load semua GRN untuk PO ini
              const grnList = await storageService.get<any[]>('gt_grn') || [];
              const grnsForPO = grnList.filter((g: any) => 
                (g.poNo || '').toString().trim() === (formData.poNo || '').toString().trim()
              );
              
              // Cek apakah semua notification untuk GRN-GRN ini sudah CLOSE
              const allGRNsPaid = grnsForPO.every((grn: any) => {
                const notif = updatedNotifications.find((n: any) => 
                  n.poNo === formData.poNo && n.grnNo === grn.grnNo && n.type === 'SUPPLIER_PAYMENT'
                );
                return notif && (notif.status || 'PENDING').toUpperCase() === 'CLOSE';
              });
              
              // Hanya close PO jika semua GRN sudah dibayar
              if (allGRNsPaid) {
                const updatedPOs = purchaseOrdersArray.map((p: any) =>
                  p.poNo === formData.poNo ? { ...p, status: 'CLOSE' as const } : p
                );
                await storageService.set('gt_purchaseOrders', updatedPOs);
              }
            }
          } catch (error) {
            console.error('Error updating finance notifications after payment:', error);
          }
        }
        
        // Update invoice paid amount if invoice exists
        if (formData.invoiceNo) {
          // Note: invoices don't have paidAmount field, so we track via payments
          // This is just for display purposes
          // Payment record already created above, which will be used by AR module
        }
      }
      
      setShowForm(false);
      setEditingPayment(null);
      setAmountInputValue('');
      setDebitAccountInputValue('');
      setCreditAccountInputValue('');
      setFormData({ paymentDate: new Date().toISOString().split('T')[0], type: 'Receipt', amount: 0, paymentMethod: 'Bank Transfer', debitAccount: '', creditAccount: '' });
      loadPayments();
      loadInvoices();
      loadPurchaseOrders();
    } catch (error: any) {
      showAlert(`Error saving payment: ${error.message}`, 'Error');
    }
  };

  const filteredPayments = useMemo(() => {
    // Ensure payments is always an array
    const paymentsArray = Array.isArray(payments) ? payments : [];
    return paymentsArray.filter(payment => {
      const matchesSearch = !searchQuery ||
        (payment.paymentNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (payment.invoiceNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (payment.poNo || payment.purchaseOrderNo || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || payment.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [payments, searchQuery, typeFilter]);

  // Export to Excel
  const handleExportExcel = () => {
    try {
      // Ensure filteredPayments is always an array
      const filteredPaymentsArray = Array.isArray(filteredPayments) ? filteredPayments : [];
      const dataToExport = filteredPaymentsArray.map(payment => ({
        'No': payment.no,
        'Payment No': payment.paymentNo,
        'Payment Date': payment.paymentDate,
        'Type': payment.type,
        'Invoice No': payment.invoiceNo || '',
        'PO No': payment.poNo || payment.purchaseOrderNo || '',
        'Customer': payment.customerName || '',
        'Supplier': payment.supplierName || '',
        'Amount': payment.amount || 0,
        'Payment Method': payment.paymentMethod,
        'Reference': payment.reference || '',
        'Notes': payment.notes || '',
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Payments');
      
      const fileName = `Payments_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Exported ${dataToExport.length} payments to ${fileName}`, 'Success');
    } catch (error: any) {
      showAlert(`Error exporting to Excel: ${error.message}`, 'Error');
    }
  };

  // Download Template
  const handleDownloadTemplate = () => {
    try {
      // Template dengan contoh data
      const templateData = [
        {
          'Payment Date': '2024-01-15',
          'Type': 'Receipt',
          'Payment No': 'RCP-202401-0001',
          'Invoice No': 'INV-001',
          'PO No': '',
          'Customer': 'Customer ABC',
          'Supplier': '',
          'Amount': 5000000,
          'Payment Method': 'Bank Transfer',
          'Reference': 'TRF-123456',
          'Notes': 'Payment untuk invoice INV-001',
        },
        {
          'Payment Date': '2024-01-16',
          'Type': 'Payment',
          'Payment No': 'PAY-202401-0001',
          'Invoice No': '',
          'PO No': 'PO-001',
          'Customer': '',
          'Supplier': 'Supplier XYZ',
          'Amount': 3000000,
          'Payment Method': 'Bank Transfer',
          'Reference': 'TRF-123457',
          'Notes': 'Payment untuk PO PO-001',
        },
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      
      const fileName = `Payments_Template.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Template downloaded! Silakan isi data sesuai format dan import kembali.\n\nNote: Type harus "Receipt" atau "Payment"`, 'Success');
    } catch (error: any) {
      showAlert(`Error downloading template: ${error.message}`, 'Error');
    }
  };

  // Import from Excel
  const handleImportExcel = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (jsonData.length === 0) {
          showAlert('Excel file is empty or has no data', 'Error');
          return;
        }

        showConfirm(
          `Import ${jsonData.length} payments from Excel? This will add new payments.`,
          async () => {
            const newPayments: Payment[] = [];
        const errors: string[] = [];

        jsonData.forEach((row, index) => {
          try {
            const paymentDate = row['Payment Date'] || row['payment date'] || row['date'] || new Date().toISOString().split('T')[0];
            const type = (row['Type'] || row['type'] || 'Receipt').trim();
            const amount = parseFloat(row['Amount'] || row['amount'] || 0) || 0;
            const paymentMethod = (row['Payment Method'] || row['payment method'] || row['method'] || 'Bank Transfer').trim();

            if (!paymentDate || !amount || amount <= 0) {
              errors.push(`Row ${index + 2}: Missing required fields`);
              return;
            }

            const paymentNo = row['Payment No'] || row['payment no'] || generatePaymentNo();
            newPayments.push({
              id: `import-${Date.now()}-${index}`,
              no: payments.length + newPayments.length + 1,
              paymentNo: paymentNo,
              paymentDate: paymentDate,
              type: (type === 'Receipt' || type === 'Payment') ? type : 'Receipt',
              invoiceNo: row['Invoice No'] || row['invoice no'] || row['invoiceNo'] || '',
              poNo: row['PO No'] || row['po no'] || row['poNo'] || '',
              purchaseOrderNo: row['PO No'] || row['po no'] || row['purchaseOrderNo'] || '',
              customerName: row['Customer'] || row['customer'] || row['customerName'] || '',
              supplierName: row['Supplier'] || row['supplier'] || row['supplierName'] || '',
              amount: amount,
              paymentMethod: paymentMethod as any,
              reference: row['Reference'] || row['reference'] || '',
              notes: row['Notes'] || row['notes'] || '',
            });
          } catch (error: any) {
            errors.push(`Row ${index + 2}: ${error.message}`);
          }
        });

            if (newPayments.length > 0) {
              const updated = [...payments, ...newPayments];
              await storageService.set('gt_payments', updated);
              setPayments(updated.map((p, idx) => ({ ...p, no: idx + 1 })));
              showAlert(`✅ Imported ${newPayments.length} payments${errors.length > 0 ? `\n⚠️ ${errors.length} errors` : ''}`, 'Success');
              if (errors.length > 0) {
                console.error('Import errors:', errors);
              }
            } else {
              showAlert('⚠️ No valid payments to import', 'Warning');
            }
            closeDialog();
          },
          () => closeDialog(),
          'Import Confirmation'
        );
      } catch (error: any) {
        showAlert(`Error importing Excel: ${error.message}`, 'Error');
      }
    };
    input.click();
  };

  const columns = [
    { key: 'no', header: 'No' },
    { key: 'paymentNo', header: 'Payment No' },
    { key: 'paymentDate', header: 'Date' },
    { key: 'type', header: 'Type' },
    { key: 'invoiceNo', header: 'Invoice No' },
    { key: 'poNo', header: 'PO No' },
    { key: 'customerName', header: 'Customer' },
    { key: 'supplierName', header: 'Supplier' },
    { key: 'amount', header: 'Amount', render: (item: Payment) => `Rp ${item.amount.toLocaleString('id-ID')}` },
    { key: 'paymentMethod', header: 'Method' },
    { key: 'actions', header: 'Actions', render: (item: Payment) => (
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button onClick={() => { 
          setEditingPayment(item); 
          setAmountInputValue('');
          setFormData(item); 
          const debitAccount = (item as any).debitAccount || '';
          const creditAccount = (item as any).creditAccount || '';
          // Ensure accounts is always an array
          const accountsArray = Array.isArray(accounts) ? accounts : [];
          if (debitAccount) {
            const account = accountsArray.find(a => a.code === debitAccount);
            setDebitAccountInputValue(account ? `${account.code} - ${account.name}` : debitAccount);
          } else {
            setDebitAccountInputValue('');
          }
          if (creditAccount) {
            const account = accountsArray.find(a => a.code === creditAccount);
            setCreditAccountInputValue(account ? `${account.code} - ${account.name}` : creditAccount);
          } else {
            setCreditAccountInputValue('');
          }
          setShowForm(true); 
        }} style={{ fontSize: '12px', padding: '4px 8px' }}>Edit</Button>
        <Button variant="danger" onClick={() => {
          showConfirm(
            'Delete this payment?',
            async () => {
              // Ensure payments is always an array
              const paymentsArray = Array.isArray(payments) ? payments : [];
              const updated = paymentsArray.filter(p => p.id !== item.id);
              await storageService.set('gt_payments', updated);
              setPayments(updated.map((p, idx) => ({ ...p, no: idx + 1 })));
              closeDialog();
            },
            () => closeDialog(),
            'Delete Confirmation'
          );
        }} style={{ fontSize: '12px', padding: '4px 8px' }}>Delete</Button>
      </div>
    ) },
  ];

  return (
    <div className="module-compact">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
          <h2>Payments</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Input
              type="text"
              placeholder="Search payments..."
              value={searchQuery}
              onChange={(value) => setSearchQuery(value)}
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
            >
              <option value="all">All Types</option>
              <option value="Receipt">Receipt</option>
              <option value="Payment">Payment</option>
            </select>
            <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
            <Button variant="secondary" onClick={handleDownloadTemplate}>📋 Download Template</Button>
            <Button variant="secondary" onClick={handleImportExcel}>📤 Import Excel</Button>
            {pendingFinanceNotifications.length > 0 && (
              <NotificationBell
                notifications={financeNotifications}
                onNotificationClick={(notification) => {
                  if (notification.notif) {
                    handleLoadNotificationToForm(notification.notif);
                  }
                }}
                icon="💰"
                emptyMessage="Tidak ada pending supplier payments"
              />
            )}
            <Button onClick={() => { 
              setShowForm(true); 
              setEditingPayment(null); 
              setAmountInputValue('');
              setDebitAccountInputValue('');
              setCreditAccountInputValue('');
              setFormData({ paymentDate: new Date().toISOString().split('T')[0], amount: 0, paymentMethod: 'Bank Transfer', debitAccount: '', creditAccount: '' }); 
            }}>
              + New Payment
            </Button>
          </div>
        </div>

        {/* Notifications - HIDDEN, menggunakan NotificationBell di header */}

        <div style={{ minHeight: '400px' }}>
          <Table columns={columns} data={filteredPayments} />
        </div>
      </Card>

      {showForm && (
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
          <div style={{ width: '600px', maxHeight: '90vh', overflow: 'auto', backgroundColor: 'var(--bg-primary)', padding: '20px', borderRadius: '8px' }}>
            <h3>{editingPayment ? 'Edit Payment' : 'New Payment'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
              <Input
                label="Payment Date"
                type="date"
                value={formData.paymentDate || ''}
                onChange={(value) => setFormData({ ...formData, paymentDate: value })}
              />
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Debit Account (COA)
                </label>
                <input
                  type="text"
                  list={`debit-account-list-${editingPayment?.id || 'new'}`}
                  value={getDebitAccountInputDisplayValue()}
                  onChange={(e) => {
                    handleDebitAccountInputChange(e.target.value);
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    // Ensure accounts is always an array
                    const accountsArray = Array.isArray(accounts) ? accounts : [];
                    const matchedAccount = accountsArray.find(a => {
                      const label = `${a.code || ''}${a.code ? ' - ' : ''}${a.name || ''}`;
                      return label === value;
                    });
                    if (matchedAccount) {
                      setFormData({ ...formData, debitAccount: matchedAccount.code });
                    }
                  }}
                  placeholder="Select Debit Account..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
                <datalist id={`debit-account-list-${editingPayment?.id || 'new'}`}>
                  {(Array.isArray(accounts) ? accounts : []).map(acc => (
                    <option key={acc.code} value={`${acc.code} - ${acc.name}`}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </datalist>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Credit Account (COA)
                </label>
                <input
                  type="text"
                  list={`credit-account-list-${editingPayment?.id || 'new'}`}
                  value={getCreditAccountInputDisplayValue()}
                  onChange={(e) => {
                    handleCreditAccountInputChange(e.target.value);
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    // Ensure accounts is always an array
                    const accountsArray = Array.isArray(accounts) ? accounts : [];
                    const matchedAccount = accountsArray.find(a => {
                      const label = `${a.code || ''}${a.code ? ' - ' : ''}${a.name || ''}`;
                      return label === value;
                    });
                    if (matchedAccount) {
                      setFormData({ ...formData, creditAccount: matchedAccount.code });
                    }
                  }}
                  placeholder="Select Credit Account..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
                <datalist id={`credit-account-list-${editingPayment?.id || 'new'}`}>
                  {(Array.isArray(accounts) ? accounts : []).map(acc => (
                    <option key={acc.code} value={`${acc.code} - ${acc.name}`}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </datalist>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Load from Invoice (Optional)
                </label>
                <select
                  onChange={(e) => handleLoadFromInvoice(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  <option value="">Select Invoice (Optional)...</option>
                  {invoices.map(inv => (
                    <option key={inv.id} value={inv.invoiceNo}>{inv.invoiceNo} - {inv.customer} (Balance: Rp {inv.balance.toLocaleString('id-ID')})</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Load from Purchase Order (Optional)
                </label>
                <select
                  onChange={(e) => handleLoadFromPO(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  <option value="">Select Purchase Order (Optional)...</option>
                  {purchaseOrders.map(po => (
                    <option key={po.id} value={po.poNo}>{po.poNo} - {po.supplier}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Amount
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amountInputValue !== undefined && amountInputValue !== '' ? amountInputValue : (formData.amount !== undefined && formData.amount !== null && formData.amount !== 0 ? String(formData.amount) : '')}
                  onFocus={(e) => {
                    const input = e.target as HTMLInputElement;
                    const currentVal = formData.amount || 0;
                    if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                      setAmountInputValue('');
                      input.value = '';
                    } else {
                      input.select();
                    }
                  }}
                  onMouseDown={(e) => {
                    const input = e.target as HTMLInputElement;
                    const currentVal = formData.amount || 0;
                    if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                      setAmountInputValue('');
                      input.value = '';
                    }
                  }}
                  onChange={(e) => {
                    let val = e.target.value;
                    val = val.replace(/[^\d.,]/g, '');
                    const cleaned = removeLeadingZero(val);
                    setAmountInputValue(cleaned);
                    setFormData({ ...formData, amount: cleaned === '' ? 0 : Number(cleaned) || 0 });
                  }}
                  onBlur={(e) => {
                    const val = e.target.value;
                    if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                      setFormData({ ...formData, amount: 0 });
                      setAmountInputValue('');
                    } else {
                      setFormData({ ...formData, amount: Number(val) });
                      setAmountInputValue('');
                    }
                  }}
                  onKeyDown={(e) => {
                    const input = e.target as HTMLInputElement;
                    const currentVal = input.value;
                    if ((currentVal === '' || currentVal === '0') && /^[1-9]$/.test(e.key)) {
                      e.preventDefault();
                      const newVal = e.key;
                      setAmountInputValue(newVal);
                      input.value = newVal;
                      setFormData({ ...formData, amount: Number(newVal) });
                    }
                  }}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label>Payment Method</label>
                <select
                  value={formData.paymentMethod || 'Bank Transfer'}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Check">Check</option>
                  <option value="Credit Card">Credit Card</option>
                </select>
              </div>
              <Input
                label="Reference"
                value={formData.reference || ''}
                onChange={(value) => setFormData({ ...formData, reference: value })}
              />
              <Input
                label="Notes"
                type="textarea"
                value={formData.notes || ''}
                onChange={(value) => setFormData({ ...formData, notes: value })}
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <Button variant="secondary" onClick={() => { 
                  setShowForm(false); 
                  setEditingPayment(null); 
                  setAmountInputValue('');
                  setDebitAccountInputValue('');
                  setCreditAccountInputValue('');
                  setFormData({ paymentDate: new Date().toISOString().split('T')[0], amount: 0, paymentMethod: 'Bank Transfer', debitAccount: '', creditAccount: '' });
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {localAlert.show && (
        <div className="dialog-overlay" onClick={closeLocalAlert}>
          <div
            className="dialog-card"
            style={{ maxWidth: '420px', width: '90%', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: '12px' }}>Info</h3>
            <p style={{ marginBottom: '20px', whiteSpace: 'pre-line' }}>{localAlert.message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="primary" onClick={closeLocalAlert}>OK</Button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Dialog untuk Alert/Confirm */}
      {dialogState.show && (() => {
        const titleLower = dialogState.title.toLowerCase();
        let iconType = 'info';
        let iconChar = 'ℹ️';
        if (titleLower.includes('success') || titleLower.includes('berhasil')) {
          iconType = 'success';
          iconChar = '✓';
        } else if (titleLower.includes('error') || titleLower.includes('gagal') || titleLower.includes('cannot')) {
          iconType = 'error';
          iconChar = '✕';
        } else if (titleLower.includes('warning') || titleLower.includes('peringatan') || titleLower.includes('validation')) {
          iconType = 'warning';
          iconChar = '⚠';
        }
        
        return (
          <div className="dialog-overlay" onClick={dialogState.type === 'alert' ? closeDialog : undefined}>
            <div className="dialog-card" onClick={(e) => e.stopPropagation()}>
              <div className={`dialog-icon ${iconType}`}>
                {iconChar}
              </div>
              <h3 className="dialog-title">
                {dialogState.title}
              </h3>
              <div className="dialog-message">
                {dialogState.message}
              </div>
              <div className="dialog-actions">
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
        );
      })()}
    </div>
  );
};

export default Payments;

