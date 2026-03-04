import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import DateRangeFilter from '../../../components/DateRangeFilter';
import NotificationBell from '../../../components/NotificationBell';
import { storageService, StorageKeys } from '../../../services/storage';
import { useLanguage } from '../../../hooks/useLanguage';
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
  tax?: number;
  taxPercent?: number;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Check' | 'Credit Card';
  reference?: string;
  notes?: string;
  grnNo?: string;
  materialItem?: string;
  soNo?: string;
  spkNo?: string;
  created?: string;
  customer?: string;
  supplier?: string;
  total?: number;
}

interface Account {
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  balance: number;
}

interface JournalEntry {
  id: string;
  no: number;
  entryDate: string;
  reference: string;
  account: string;
  debit: number;
  credit: number;
  description: string;
}

const Payments = () => {
  const { t } = useLanguage();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [pendingFinanceNotifications, setPendingFinanceNotifications] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [amountInputValue, setAmountInputValue] = useState('');
  const [taxPercentInputValue, setTaxPercentInputValue] = useState('');
  const [debitAccountInputValue, setDebitAccountInputValue] = useState('');
  const [creditAccountInputValue, setCreditAccountInputValue] = useState('');
  const [formData, setFormData] = useState<Partial<Payment & { debitAccount?: string; creditAccount?: string }>>({
    paymentDate: new Date().toISOString().split('T')[0],
    amount: 0,
    tax: 0,
    taxPercent: 11,
    paymentMethod: 'Bank Transfer',
    debitAccount: '',
    creditAccount: '',
  });
  const [showNotifications, setShowNotifications] = useState(true);
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
    loadPurchaseOrders();
    loadAccounts();
  }, []);


  const loadAccounts = async () => {
    const data = await storageService.get<Account[]>(StorageKeys.GENERAL_TRADING.ACCOUNTS) || [];
    if (!data || data.length === 0) {
      const defaultAccounts: any[] = [
        { code: '1000', name: 'Cash', type: 'Asset', balance: 0 },
        { code: '1100', name: 'Accounts Receivable', type: 'Asset', balance: 0 },
        { code: '2000', name: 'Accounts Payable', type: 'Liability', balance: 0 },
      ];
      await storageService.set(StorageKeys.GENERAL_TRADING.ACCOUNTS, defaultAccounts);
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

  // Helper function untuk calculate tax amount
  const calculateTaxAmount = (amount: number, taxPercent: number): number => {
    return amount * (taxPercent / 100);
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
    // Load from both 'payments' (existing) and create unified list
    const existingPayments = await storageService.get<Payment[]>(StorageKeys.GENERAL_TRADING.PAYMENTS) || [];
    // Ensure existingPayments is always an array
    const existingPaymentsArray = Array.isArray(existingPayments) ? existingPayments : [];
    
    // Auto-fill invoice and customer data from invoices storage
    const invoices = await storageService.get<any[]>(StorageKeys.GENERAL_TRADING.INVOICES) || [];
    const invoicesArray = Array.isArray(invoices) ? invoices : [];
    
    const normalize = (str: string) => (str || '').toString().trim().toLowerCase();
    
    const allPayments = existingPaymentsArray.map((p, idx) => {
      let payment = {
        id: p.id || Date.now().toString() + idx,
        no: idx + 1,
        paymentNo: p.paymentNo || `PAY-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(idx + 1).padStart(4, '0')}`,
        paymentDate: p.paymentDate || p.created || new Date().toISOString().split('T')[0],
        type: p.type || (p.invoiceNo ? 'Receipt' : 'Payment'),
        invoiceNo: p.invoiceNo,
        poNo: p.poNo,
        purchaseOrderNo: p.poNo || p.purchaseOrderNo,
        customerName: p.customerName || p.customer,
        supplierName: p.supplier || p.supplierName,
        amount: p.amount || p.total || 0,
        paymentMethod: p.paymentMethod || 'Bank Transfer',
        reference: p.reference,
        notes: p.notes,
        grnNo: p.grnNo,
        materialItem: p.materialItem,
        soNo: p.soNo,
        spkNo: p.spkNo,
      };
      
      // Auto-fill invoice and customer if soNo exists but invoiceNo is empty
      if (payment.soNo && !payment.invoiceNo) {
        const soNo = normalize(payment.soNo);
        const relatedInvoice = invoicesArray.find((inv: any) => {
          const invSoNo = normalize(inv.soNo || '');
          return invSoNo === soNo;
        });
        
        if (relatedInvoice) {
          payment.invoiceNo = relatedInvoice.invoiceNo || '';
          payment.customerName = relatedInvoice.customer || '';
        }
      }
      
      return payment;
    });
    
    // Update payments in storage if any were auto-filled
    const needsUpdate = existingPaymentsArray.some((p) => {
      const soNo = normalize(p.soNo || '');
      if (soNo && !p.invoiceNo) {
        const relatedInvoice = invoicesArray.find((inv: any) => {
          const invSoNo = normalize(inv.soNo || '');
          return invSoNo === soNo;
        });
        return !!relatedInvoice;
      }
      return false;
    });
    
    if (needsUpdate) {
      const updatedPayments = existingPaymentsArray.map((p) => {
        if (p.soNo && !p.invoiceNo) {
          const soNo = normalize(p.soNo);
          const relatedInvoice = invoicesArray.find((inv: any) => {
            const invSoNo = normalize(inv.soNo || '');
            return invSoNo === soNo;
          });
          
          if (relatedInvoice) {
            return {
              ...p,
              invoiceNo: relatedInvoice.invoiceNo || p.invoiceNo,
              customerName: relatedInvoice.customer || p.customerName,
            };
          }
        }
        return p;
      });
      
      await storageService.set(StorageKeys.GENERAL_TRADING.PAYMENTS, updatedPayments);
    }
    
    setPayments(allPayments);
  };

  const loadPurchaseOrders = async () => {
    const [poData, financeNotifData, paymentsData] = await Promise.all([
      storageService.get<any[]>(StorageKeys.GENERAL_TRADING.PURCHASE_ORDERS) || [],
      storageService.get<any[]>(StorageKeys.GENERAL_TRADING.FINANCE_NOTIFICATIONS) || [],
      storageService.get<Payment[]>(StorageKeys.GENERAL_TRADING.PAYMENTS) || [],
    ]);
    
    // Auto-cleanup: Hapus notifications yang sudah CLOSE atau PO sudah dibayar
    // Ensure financeNotifData and paymentsData are always arrays
    const financeNotifDataArray = Array.isArray(financeNotifData) ? financeNotifData : [];
    const paymentsDataArray = Array.isArray(paymentsData) ? paymentsData : [];
    const cleanedNotifs = financeNotifDataArray.filter((notif: any) => {
      // Hapus jika status sudah CLOSE
      if ((notif.status || 'PENDING').toUpperCase() === 'CLOSE') {
        return false;
      }
      
      // Hapus jika PO sudah dibayar (cek dari payments)
      const hasPayment = paymentsDataArray.some((p: any) => 
        (p.poNo === notif.poNo || p.purchaseOrderNo === notif.poNo) && 
        p.type === 'Payment'
      );
      
      return !hasPayment;
    });
    
    // Update notifications di storage (cleanup yang sudah tidak relevan)
    if (financeNotifDataArray.length > 0 && JSON.stringify(cleanedNotifs) !== JSON.stringify(financeNotifDataArray)) {
      await storageService.set(StorageKeys.GENERAL_TRADING.FINANCE_NOTIFICATIONS, cleanedNotifs);
    }
    
    const pending = cleanedNotifs.filter((notif: any) =>
      notif.type === 'SUPPLIER_PAYMENT' && (notif.status || 'PENDING').toUpperCase() !== 'CLOSE'
    );
    setPendingFinanceNotifications(pending);
    
    // Ensure poData is always an array
    const poDataArray = Array.isArray(poData) ? poData : [];
    const openFinancePOs = pending.map((notif: any) => {
      const po = poDataArray.find((p: any) => p.poNo === notif.poNo);
      return {
        id: po?.id || notif.id,
        poNo: notif.poNo || po?.poNo || '-',
        supplier: po?.supplier || notif.supplier || '-',
        soNo: po?.soNo || notif.soNo || '-',
        total: po?.total || notif.total || 0,
        status: po?.status || 'OPEN',
        materialItem: po?.materialItem || notif.materialItem || '-',
        qty: po?.qty || notif.qty || 0,
        receiptDate: po?.receiptDate || notif.receivedDate || '-',
        suratJalan: notif.suratJalan,
        suratJalanName: notif.suratJalanName,
        grnNo: notif.grnNo,
        purchaseReason: po?.purchaseReason || notif.purchaseReason || '',
      };
    });
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

  const handleViewNotificationSJ = (notif: any) => {
    if (!notif?.suratJalan) {
      showAlert('Tidak ada file surat jalan yang diupload.', 'Error');
      return;
    }
    const win = window.open('', '_blank');
    if (!win) {
      showAlert('Popup diblokir browser. Tolong izinkan popup untuk melihat surat jalan.', 'Warning');
      return;
    }
    const src = notif.suratJalan.startsWith('data:')
      ? notif.suratJalan
      : `data:application/pdf;base64,${notif.suratJalan}`;
    win.document.write(`<iframe src="${src}" style="width:100%;height:100%;border:none;"></iframe>`);
  };

  const handleViewNotificationInvoice = (notif: any) => {
    if (!notif?.invoiceFile) {
      showAlert('Tidak ada file invoice yang diupload.', 'Error');
      return;
    }
    const win = window.open('', '_blank');
    if (!win) {
      showAlert('Popup diblokir browser. Tolong izinkan popup untuk melihat invoice.', 'Warning');
      return;
    }
    const src = notif.invoiceFile.startsWith('data:')
      ? notif.invoiceFile
      : `data:application/pdf;base64,${notif.invoiceFile}`;
    win.document.write(`<iframe src="${src}" style="width:100%;height:100%;border:none;"></iframe>`);
  };

  const handleLoadNotificationToForm = async (notif: any) => {
    try {
      console.log('[Payment] handleLoadNotificationToForm called with notification:', { poNo: notif.poNo, soNo: notif.soNo, spkNo: notif.spkNo, grnNo: notif.grnNo });
      setEditingPayment(null);
      setAmountInputValue('');
      const defaultDate = new Date().toISOString().split('T')[0];
      
      // Trace invoice dari SPK/SO
      let invoiceNo = '';
      let customerName = '';
      try {
        const invoices = await storageService.get<any[]>(StorageKeys.GENERAL_TRADING.INVOICES) || [];
        const invoicesArray = Array.isArray(invoices) ? invoices : [];
        const spks = await storageService.get<any[]>(StorageKeys.GENERAL_TRADING.SPK) || [];
        const spksArray = Array.isArray(spks) ? spks : [];
        const salesOrders = await storageService.get<any[]>(StorageKeys.GENERAL_TRADING.SALES_ORDERS) || [];
        const salesOrdersArray = Array.isArray(salesOrders) ? salesOrders : [];
        
        // Helper function untuk normalize string untuk comparison
        const normalize = (str: string) => (str || '').toString().trim().toLowerCase();
        
        // First, try to find invoice directly by SO or SPK from notification
        let relatedInvoice = invoicesArray.find((inv: any) => {
          const invSoNo = normalize(inv.soNo || '');
          const invSpkNo = normalize(inv.spkNo || '');
          const notifSoNo = normalize(notif.soNo || '');
          const notifSpkNo = normalize(notif.spkNo || '');
          
          return (invSoNo && notifSoNo && invSoNo === notifSoNo) || 
                 (invSpkNo && notifSpkNo && invSpkNo === notifSpkNo);
        });
        
        // If not found, try to trace through PO → SPK → Invoice
        if (!relatedInvoice && notif.poNo) {
          const poNo = normalize(notif.poNo);
          
          // Find SPK that references this PO
          const relatedSpk = spksArray.find((spk: any) => {
            const spkPoNo = normalize(spk.poNo || spk.purchaseOrderNo || '');
            return spkPoNo === poNo;
          });
          
          if (relatedSpk) {
            // Find invoice by SPK
            relatedInvoice = invoicesArray.find((inv: any) => {
              const invSpkNo = normalize(inv.spkNo || '');
              const spkNo = normalize(relatedSpk.spkNo || '');
              return invSpkNo === spkNo;
            });
            
            // If still not found, try by SO
            if (!relatedInvoice && relatedSpk.soNo) {
              relatedInvoice = invoicesArray.find((inv: any) => {
                const invSoNo = normalize(inv.soNo || '');
                const soNo = normalize(relatedSpk.soNo || '');
                return invSoNo === soNo;
              });
            }
          }
        }
        
        // If still not found, try by SO from notification directly
        if (!relatedInvoice && notif.soNo) {
          const notifSoNo = normalize(notif.soNo);
          relatedInvoice = invoicesArray.find((inv: any) => {
            const invSoNo = normalize(inv.soNo || '');
            return invSoNo === notifSoNo;
          });
        }
        
        // If still not found, try to find by customer from SO
        if (!relatedInvoice && notif.soNo) {
          const notifSoNo = normalize(notif.soNo);
          const relatedSO = salesOrdersArray.find((so: any) => {
            const soNo = normalize(so.soNo || so.no || '');
            return soNo === notifSoNo;
          });
          
          if (relatedSO) {
            // Find invoice by customer
            relatedInvoice = invoicesArray.find((inv: any) => {
              const invCustomer = normalize(inv.customer || '');
              const soCustomer = normalize(relatedSO.customer || relatedSO.customerName || '');
              return invCustomer === soCustomer && invCustomer !== '';
            });
          }
        }
        
        if (relatedInvoice) {
          invoiceNo = relatedInvoice.invoiceNo || '';
          customerName = relatedInvoice.customer || '';
          console.log('[Payment] ✅ Invoice found:', { invoiceNo, customerName, soNo: relatedInvoice.soNo });
        } else {
          console.log('[Payment] ⚠️ Invoice NOT found for notification:', { notifSoNo: notif.soNo, notifSpkNo: notif.spkNo, notifPoNo: notif.poNo });
        }
      } catch (error) {
        console.error('Error tracing invoice:', error);
      }
      
      const paymentData = {
        paymentDate: defaultDate,
        type: 'Payment' as const,
        poNo: notif.poNo || '',
        purchaseOrderNo: notif.poNo || '',
        supplierName: notif.supplier || '',
        amount: notif.total || 0,
        paymentMethod: 'Bank Transfer' as const,
        reference: notif.grnNo ? `GRN ${notif.grnNo}` : '',
        notes: `Payment for PO ${notif.poNo || ''}${notif.materialItem ? ` - ${notif.materialItem}` : ''}${invoiceNo ? ` | Invoice: ${invoiceNo}` : ''}`,
        invoiceNo: invoiceNo,
        grnNo: notif.grnNo || '',
        materialItem: notif.materialItem || '',
        soNo: notif.soNo || '',
        spkNo: notif.spkNo || '',
        debitAccount: '2000', // Default: Accounts Payable
        creditAccount: '1000', // Default: Cash
        customerName: customerName, // Track customer
      };
      
      // Show form with pre-filled data so user can review/edit before final save
      setFormData(paymentData);
      setAmountInputValue(String(paymentData.amount || 0));
      setShowForm(true);
      
      loadPayments();
      loadPurchaseOrders();
      const amount = paymentData.amount || 0;
      const invoiceDisplay = paymentData.invoiceNo ? `Invoice: ${paymentData.invoiceNo}` : 'Not found - please enter manually';
      const customerDisplay = paymentData.customerName ? `Customer: ${paymentData.customerName}` : 'Not found - please enter manually';
      showAlert(`✅ Payment form loaded\n\nPayment No: ${generatePaymentNo()}\nAmount: Rp ${amount.toLocaleString('id-ID')}\n${invoiceDisplay}\n${customerDisplay}\n\nReview and save, or edit the fields manually.`, 'Info');
    } catch (error: any) {
      showAlert(`Error creating payment: ${error.message}`, 'Error');
    }
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
            ? { 
                ...formData, 
                id: editingPayment.id, 
                no: editingPayment.no, 
                paymentNo: editingPayment.paymentNo,
                lastUpdate: new Date().toISOString(),
                timestamp: Date.now(),
                _timestamp: Date.now()
              } as Payment
            : p
        );
        await storageService.set(StorageKeys.GENERAL_TRADING.PAYMENTS, updated);
        setPayments(updated.map((p, idx) => ({ ...p, no: idx + 1 })));
      } else {
        const newPayment: Payment = {
          id: Date.now().toString(),
          no: paymentsArray.length + 1,
          paymentNo: generatePaymentNo(),
          lastUpdate: new Date().toISOString(),
          timestamp: Date.now(),
          _timestamp: Date.now(),
          ...formData,
        } as Payment;
        const updated = [...paymentsArray, newPayment];
        await storageService.set(StorageKeys.GENERAL_TRADING.PAYMENTS, updated);
        setPayments(updated.map((p, idx) => ({ ...p, no: idx + 1 })));
        
        // Auto-create journal entries untuk General Ledger
        try {
          const journalEntries = await storageService.get<JournalEntry[]>(StorageKeys.GENERAL_TRADING.JOURNAL_ENTRIES) || [];
          const accounts = await storageService.get<Account[]>(StorageKeys.GENERAL_TRADING.ACCOUNTS) || [];
          const entryDate = formData.paymentDate || new Date().toISOString().split('T')[0];
          const amount = formData.amount || 0;
          
          // Ensure accounts is always an array
          const accountsArray = Array.isArray(accounts) ? accounts : [];
          
          // Determine debit and credit accounts
          let debitAccountCode = formData.debitAccount || '';
          let creditAccountCode = formData.creditAccount || '';
          
          // Jika debitAccount atau creditAccount kosong, gunakan default berdasarkan type
          if (!debitAccountCode || !creditAccountCode) {
            if (formData.type === 'Receipt') {
              // Receipt: Debit Cash (1000), Credit Accounts Receivable (1100)
              debitAccountCode = debitAccountCode || '1000';
              creditAccountCode = creditAccountCode || '1100';
            } else {
              // Payment: Debit Accounts Payable (2000), Credit Cash (1000)
              debitAccountCode = debitAccountCode || '2000';
              creditAccountCode = creditAccountCode || '1000';
            }
          }
          
          const debitAccount = accountsArray.find((a: any) => a.code === debitAccountCode);
          const creditAccount = accountsArray.find((a: any) => a.code === creditAccountCode);
          
          if (debitAccount && creditAccount && amount > 0) {
            // Cek apakah sudah ada journal entries untuk payment ini
            const existingEntries = journalEntries.filter((e: any) => e.reference === newPayment.paymentNo);
            if (existingEntries.length === 0) {
              const entriesToAdd = [
                {
                  entryDate: entryDate,
                  reference: newPayment.paymentNo,
                  account: debitAccountCode,
                  accountName: debitAccount.name,
                  debit: amount,
                  credit: 0,
                  description: `${formData.type || 'Payment'} ${newPayment.paymentNo} - ${formData.customerName || formData.supplierName || 'Payment'}`,
                },
                {
                  entryDate: entryDate,
                  reference: newPayment.paymentNo,
                  account: creditAccountCode,
                  accountName: creditAccount.name,
                  debit: 0,
                  credit: amount,
                  description: `${formData.type || 'Payment'} ${newPayment.paymentNo} - ${formData.customerName || formData.supplierName || 'Payment'}`,
                },
              ];

              // Ensure journalEntries is always an array
              const journalEntriesArray = Array.isArray(journalEntries) ? journalEntries : [];
              const baseLength = journalEntriesArray.length;
              const entriesWithNo = entriesToAdd.map((entry, idx) => ({
                ...entry,
                id: `pay-${Date.now()}-${idx + 1}`,
                no: baseLength + idx + 1,
              }));
              await storageService.set(StorageKeys.GENERAL_TRADING.JOURNAL_ENTRIES, [...journalEntriesArray, ...entriesWithNo]);
            }
          }
        } catch (error: any) {
        }

        // NOTE: CLOSE status is now triggered in AP module when payment proof is uploaded
        // Do NOT set CLOSE status here
      }
      
      setShowForm(false);
      setEditingPayment(null);
      setAmountInputValue('');
      setDebitAccountInputValue('');
      setCreditAccountInputValue('');
      setTaxPercentInputValue('');
      setFormData({ paymentDate: new Date().toISOString().split('T')[0], type: 'Receipt', amount: 0, tax: 0, taxPercent: 11, paymentMethod: 'Bank Transfer', debitAccount: '', creditAccount: '' });
      loadPayments();
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
      
      // Date filter
      if (dateFrom || dateTo) {
        const paymentDate = payment.paymentDate || '';
        if (dateFrom && paymentDate < dateFrom) return false;
        if (dateTo && paymentDate > dateTo) return false;
      }
      
      return matchesSearch && matchesType;
    });
  }, [payments, searchQuery, typeFilter, dateFrom, dateTo]);

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
            // Ensure payments is always an array
            const paymentsArray = Array.isArray(payments) ? payments : [];
            newPayments.push({
              id: `import-${Date.now()}-${index}`,
              no: paymentsArray.length + newPayments.length + 1,
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
              await storageService.set(StorageKeys.GENERAL_TRADING.PAYMENTS, updated);
              setPayments(updated.map((p, idx) => ({ ...p, no: idx + 1 })));
              showAlert(`✅ Imported ${newPayments.length} payments${errors.length > 0 ? `\n⚠️ ${errors.length} errors` : ''}`, 'Success');
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
    { 
      key: 'no', 
      header: '#',
      render: (item: Payment) => <div style={{ minWidth: '25px', textAlign: 'center', fontSize: '11px' }}>{item.no}</div>
    },
    { 
      key: 'paymentNo', 
      header: 'Payment No',
      render: (item: Payment) => <div style={{ minWidth: '90px', fontSize: '11px' }} title={item.paymentNo}>{item.paymentNo.length > 12 ? item.paymentNo.substring(0, 12) + '...' : item.paymentNo}</div>
    },
    { 
      key: 'paymentDate', 
      header: 'Date',
      render: (item: Payment) => <div style={{ minWidth: '70px', fontSize: '11px' }}>{item.paymentDate}</div>
    },
    { 
      key: 'type', 
      header: 'Type',
      render: (item: Payment) => <div style={{ minWidth: '50px', fontSize: '11px' }}>{item.type}</div>
    },
    { 
      key: 'invoiceNo', 
      header: 'Invoice',
      render: (item: Payment) => <div style={{ minWidth: '90px', fontSize: '11px', fontWeight: '500', color: item.invoiceNo ? '#1976d2' : 'var(--text-secondary)' }} title={item.invoiceNo || '-'}>{item.invoiceNo || '-'}</div>
    },
    { 
      key: 'poNo', 
      header: 'PO',
      render: (item: Payment) => <div style={{ minWidth: '70px', fontSize: '11px', fontWeight: '500' }} title={item.poNo || '-'}>{item.poNo || '-'}</div>
    },
    { 
      key: 'customerName', 
      header: 'Customer',
      render: (item: Payment) => <div style={{ minWidth: '120px', fontSize: '11px', color: item.customerName ? '#2e7d32' : 'var(--text-secondary)' }} title={item.customerName || '-'}>{item.customerName ? (item.customerName.length > 15 ? item.customerName.substring(0, 15) + '...' : item.customerName) : '-'}</div>
    },
    { 
      key: 'supplierName', 
      header: 'Supplier',
      render: (item: Payment) => <div style={{ minWidth: '100px', fontSize: '11px' }} title={item.supplierName || '-'}>{item.supplierName ? (item.supplierName.length > 12 ? item.supplierName.substring(0, 12) + '...' : item.supplierName) : '-'}</div>
    },
    { 
      key: 'amount', 
      header: 'Amount', 
      render: (item: Payment) => <div style={{ minWidth: '90px', fontSize: '11px', textAlign: 'right' }}>Rp {item.amount.toLocaleString('id-ID')}</div>
    },
    { 
      key: 'paymentMethod', 
      header: 'Method',
      render: (item: Payment) => <div style={{ minWidth: '60px', fontSize: '11px' }}>{item.paymentMethod}</div>
    },
    { 
      key: 'actions', 
      header: 'Actions', 
      render: (item: Payment) => (
        <div style={{ display: 'flex', gap: '4px', minWidth: '90px' }}>
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
          }} variant="secondary" style={{ fontSize: '10px', padding: '3px 6px', minWidth: 'auto' }}>
            Edit
          </Button>
          <Button variant="danger" onClick={() => {
            showConfirm(
              'Delete this payment?',
              async () => {
                try {
                  // Hard delete - langsung hapus dari array
                  const paymentsArray = Array.isArray(payments) ? payments : [];
                  const updated = paymentsArray.filter(p => p.id !== item.id);
                  await storageService.set(StorageKeys.GENERAL_TRADING.PAYMENTS, updated);
                  setPayments(updated.map((p, idx) => ({ ...p, no: idx + 1 })));
                  closeDialog();
                  showAlert('Payment deleted successfully', 'Success');
                } catch (error: any) {
                  closeDialog();
                  showAlert(`Error deleting payment: ${error.message}`, 'Error');
                }
              },
              () => closeDialog(),
              'Delete Confirmation'
            );
          }} style={{ fontSize: '10px', padding: '3px 6px', minWidth: 'auto' }}>
            Del
          </Button>
        </div>
      )
    },
  ];

  return (
    <div className="module-compact" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', minHeight: '600px', overflow: 'hidden' }}>
      <Card style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: '16px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap', flexShrink: 0 }}>
            <h2 style={{ margin: 0 }}>Payments</h2>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ marginBottom: 0, display: 'flex', alignItems: 'center', flex: '1 1 200px', minWidth: '150px' }}>
                <Input
                  type="text"
                  placeholder="Search payments..."
                  value={searchQuery}
                  onChange={(value) => setSearchQuery(value)}
                />
              </div>
              <div style={{ flex: '1 1 400px', minWidth: '300px' }}>
                <DateRangeFilter
                  onDateChange={(from, to) => {
                    setDateFrom(from);
                    setDateTo(to);
                  }}
                  defaultFrom={dateFrom}
                  defaultTo={dateTo}
                />
              </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
            >
              <option value="all">All Types</option>
              <option value="Receipt">Receipt</option>
              <option value="Payment">Payment</option>
              <option value="General">General</option>
              <option value="PettyCash">Petty Cash</option>
            </select>
            {pendingFinanceNotifications.length > 0 && (
              <NotificationBell
                notifications={pendingFinanceNotifications.map((notif: any) => ({
                  id: notif.id,
                  title: `PO ${notif.poNo || '-'}`,
                  message: `Supplier: ${notif.supplier || '-'} | Total: Rp ${(notif.total || 0).toLocaleString('id-ID')}`,
                  notif: notif,
                }))}
                onNotificationClick={(notification) => {
                  if (notification.notif) {
                    handleLoadNotificationToForm(notification.notif);
                  }
                }}
                icon="🔔"
                emptyMessage="Tidak ada notifikasi payment"
              />
            )}
            <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
            <Button variant="secondary" onClick={handleDownloadTemplate}>📋 Download Template</Button>
            <Button variant="secondary" onClick={handleImportExcel}>📤 Import Excel</Button>
            <Button onClick={() => { 
              setShowForm(true); 
              setEditingPayment(null); 
              setAmountInputValue(''); 
              setDebitAccountInputValue(''); 
              setCreditAccountInputValue(''); 
              setTaxPercentInputValue('');
              setFormData({ paymentDate: new Date().toISOString().split('T')[0], amount: 0, tax: 0, taxPercent: 11, paymentMethod: 'Bank Transfer', debitAccount: '', creditAccount: '' }); 
            }}>
              + New Payment
            </Button>
          </div>
        </div>

        {/* Notifications - HIDDEN, menggunakan NotificationBell di header */}
        {false && pendingFinanceNotifications.length > 0 && (
          <div style={{ 
            marginBottom: '16px', 
            padding: '10px 12px', 
            backgroundColor: document.documentElement.getAttribute('data-theme') === 'light' ? 'rgba(0, 170, 85, 0.1)' : 'rgba(76, 175, 80, 0.15)',
            border: `1px solid ${document.documentElement.getAttribute('data-theme') === 'light' ? 'rgba(0, 170, 85, 0.3)' : 'rgba(76, 175, 80, 0.35)'}`,
            borderRadius: '6px',
            color: document.documentElement.getAttribute('data-theme') === 'light' ? 'var(--text-primary)' : '#d7f2d9',
            fontSize: '12px',
            lineHeight: 1.3
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span role="img" aria-label="bell">🔔</span>
                <span style={{ fontWeight: 600, color: document.documentElement.getAttribute('data-theme') === 'light' ? 'var(--text-primary)' : '#c8e6c9', fontSize: '13px' }}>
                  Pending Supplier Payments ({pendingFinanceNotifications.length})
                </span>
              </div>
              <Button
                variant="secondary"
                onClick={() => setShowNotifications(false)}
                style={{ 
                  padding: '4px 8px', 
                  fontSize: '11px', 
                  backgroundColor: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#ffffff', 
                  color: document.documentElement.getAttribute('data-theme') === 'light' ? '#1a1a1a' : '#1b1b1b', 
                  border: 'none' 
                }}
              >
                Hide
              </Button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {pendingFinanceNotifications.map((notif: any) => (
                <div 
                  key={notif.id} 
                  style={{ 
                    flex: '0 1 220px',
                    minWidth: '180px',
                    maxWidth: '240px',
                    backgroundColor: document.documentElement.getAttribute('data-theme') === 'light' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.08)',
                    border: `1px solid ${document.documentElement.getAttribute('data-theme') === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)'}`,
                    borderRadius: '5px',
                    padding: '8px',
                    fontSize: '11px',
                    color: document.documentElement.getAttribute('data-theme') === 'light' ? 'var(--text-primary)' : '#e8f5e9',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '2px', fontSize: '12px' }}>
                    PO {notif.poNo || '-'}
                  </div>
                  <div>Supplier: {notif.supplier || '-'}</div>
                  <div>Material: {notif.materialItem || '-'}</div>
                  <div>Qty: {notif.qty || 0}</div>
                  <div>Total: Rp {(notif.total || 0).toLocaleString('id-ID')}</div>
                  <div>Receipt: {notif.receivedDate || '-'}</div>
                  {notif.purchaseReason && (
                    <div style={{ fontStyle: 'italic', color: document.documentElement.getAttribute('data-theme') === 'light' ? 'var(--text-secondary)' : '#cde6ce' }}>Reason: {notif.purchaseReason}</div>
                  )}
                  {notif.grnNo && <div>GRN: {notif.grnNo}</div>}
                  {notif.invoiceNo && <div style={{ fontWeight: 600, color: '#4caf50' }}>Invoice: {notif.invoiceNo}</div>}
                  {notif.invoiceFileName && <div style={{ fontSize: '10px', color: '#81c784' }}>📄 {notif.invoiceFileName}</div>}
                  {notif.suratJalanName && <div>SJ: {notif.suratJalanName}</div>}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    {notif.invoiceFile && (
                      <Button variant="secondary" onClick={() => handleViewNotificationInvoice(notif)} style={{ fontSize: '10px', padding: '3px 6px', backgroundColor: '#4caf50', color: 'white' }}>
                        📄 View Invoice
                      </Button>
                    )}
                    {notif.suratJalan && (
                      <Button variant="secondary" onClick={() => handleViewNotificationSJ(notif)} style={{ fontSize: '10px', padding: '3px 6px' }}>
                        View SJ
                      </Button>
                    )}
                    <Button variant="primary" onClick={() => handleLoadNotificationToForm(notif)} style={{ fontSize: '10px', padding: '3px 6px' }}>
                      Load Form
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Table columns={columns} data={filteredPayments} />
          </div>
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
                    const amount = cleaned === '' ? 0 : Number(cleaned) || 0;
                    const taxPercent = formData.taxPercent || 11;
                    const taxAmount = calculateTaxAmount(amount, taxPercent);
                    setFormData({ ...formData, amount: amount, tax: taxAmount });
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

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Tax % (Default 11%)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={taxPercentInputValue !== undefined && taxPercentInputValue !== '' ? taxPercentInputValue : (formData.taxPercent !== undefined && formData.taxPercent !== null && formData.taxPercent !== 0 ? String(formData.taxPercent) : '11')}
                  onChange={(e) => {
                    let val = e.target.value;
                    val = val.replace(/[^\d.,]/g, '');
                    setTaxPercentInputValue(val);
                    const percent = val === '' ? 11 : Number(val) || 11;
                    const amount = formData.amount || 0;
                    const taxAmount = calculateTaxAmount(amount, percent);
                    setFormData({ ...formData, taxPercent: percent, tax: taxAmount });
                  }}
                  onBlur={(e) => {
                    const val = e.target.value;
                    const percent = val === '' || isNaN(Number(val)) || Number(val) < 0 ? 11 : Number(val);
                    const amount = formData.amount || 0;
                    const taxAmount = calculateTaxAmount(amount, percent);
                    setFormData({ ...formData, taxPercent: percent, tax: taxAmount });
                    setTaxPercentInputValue('');
                  }}
                  placeholder="11"
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

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Tax Amount (Auto-calculated)
                </label>
                <div style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}>
                  Rp {(formData.tax || 0).toLocaleString('id-ID')}
                </div>
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
                label="Invoice No"
                value={formData.invoiceNo || ''}
                onChange={(value) => setFormData({ ...formData, invoiceNo: value })}
                placeholder="Auto-filled from invoice lookup"
              />
              <Input
                label="Customer Name"
                value={formData.customerName || ''}
                onChange={(value) => setFormData({ ...formData, customerName: value })}
                placeholder="Auto-filled from invoice lookup"
              />
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
                  setTaxPercentInputValue('');
                  setFormData({ paymentDate: new Date().toISOString().split('T')[0], amount: 0, tax: 0, taxPercent: 11, paymentMethod: 'Bank Transfer', debitAccount: '', creditAccount: '' });
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

