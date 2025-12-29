import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import NotificationBell from '../../../components/NotificationBell';
import { storageService } from '../../../services/storage';
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
    loadInvoices();
    loadPurchaseOrders();
    loadAccounts();
  }, []);


  const loadAccounts = async () => {
    const data = await storageService.get<any[]>('accounts') || [];
    if (!data || data.length === 0) {
      const defaultAccounts: any[] = [
        { code: '1000', name: 'Cash', type: 'Asset', balance: 0 },
        { code: '1100', name: 'Accounts Receivable', type: 'Asset', balance: 0 },
        { code: '2000', name: 'Accounts Payable', type: 'Liability', balance: 0 },
      ];
      await storageService.set('accounts', defaultAccounts);
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
    // Load from both 'payments' (existing) and create unified list
    const existingPayments = await storageService.get<any[]>('payments') || [];
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
    const data = await storageService.get<any[]>('invoices') || [];
    const paymentsData = await storageService.get<any[]>('payments') || [];
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
    const [poData, financeNotifData, paymentsData] = await Promise.all([
      storageService.get<any[]>('purchaseOrders') || [],
      storageService.get<any[]>('financeNotifications') || [],
      storageService.get<any[]>('payments') || [],
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
      await storageService.set('financeNotifications', cleanedNotifs);
      console.log(`🧹 Cleaned up ${financeNotifDataArray.length - cleanedNotifs.length} obsolete finance notifications`);
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

  const handleLoadNotificationToForm = (notif: any) => {
    setShowForm(true);
    setEditingPayment(null);
    setAmountInputValue('');
    const defaultDate = new Date().toISOString().split('T')[0];
    setFormData({
      paymentDate: defaultDate,
      poNo: notif.poNo || '',
      purchaseOrderNo: notif.poNo || '',
      supplierName: notif.supplier || '',
      amount: notif.total || 0,
      paymentMethod: 'Bank Transfer',
      reference: notif.grnNo ? `GRN ${notif.grnNo}` : '',
      notes: `Payment for PO ${notif.poNo || ''}${notif.invoiceNo ? ` - Invoice: ${notif.invoiceNo}` : ''}`,
      invoiceNo: notif.invoiceNo || '',
      debitAccount: '',
      creditAccount: '',
    });
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
        await storageService.set('payments', updated);
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
        await storageService.set('payments', updated);
        setPayments(updated.map((p, idx) => ({ ...p, no: idx + 1 })));
        
        // Auto-create journal entries untuk General Ledger
        try {
          const journalEntries = await storageService.get<any[]>('journalEntries') || [];
          const accounts = await storageService.get<any[]>('accounts') || [];
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
              await storageService.set('journalEntries', [...journalEntriesArray, ...entriesWithNo]);
              console.log(`✅ Created journal entries for ${formData.type || 'Payment'} ${newPayment.paymentNo}`);
            }
          } else {
            console.warn(`⚠️ Cannot create journal entries: debitAccount=${debitAccountCode}, creditAccount=${creditAccountCode}, amount=${amount}`);
          }
        } catch (error: any) {
          console.error('Error creating journal entries:', error);
        }

        if (formData.poNo) {
          try {
            const financeNotifications = await storageService.get<any[]>('financeNotifications') || [];
            // Ensure financeNotifications is always an array
            const financeNotificationsArray = Array.isArray(financeNotifications) ? financeNotifications : [];
            const updatedNotifications = financeNotificationsArray.map((n: any) =>
              n.poNo === formData.poNo && n.type === 'SUPPLIER_PAYMENT'
                ? { ...n, status: 'CLOSE', paidAt: new Date().toISOString() }
                : n
            );
            await storageService.set('financeNotifications', updatedNotifications);

            const purchaseOrders = await storageService.get<any[]>('purchaseOrders') || [];
            // Ensure purchaseOrders is always an array
            const purchaseOrdersArray = Array.isArray(purchaseOrders) ? purchaseOrders : [];
            const updatedPOs = purchaseOrdersArray.map((po: any) =>
              po.poNo === formData.poNo ? { ...po, status: 'CLOSE' as const } : po
            );
            await storageService.set('purchaseOrders', updatedPOs);
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
              await storageService.set('payments', updated);
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
      render: (item: Payment) => <div style={{ minWidth: '80px', fontSize: '11px' }} title={item.invoiceNo || '-'}>{item.invoiceNo ? (item.invoiceNo.length > 10 ? item.invoiceNo.substring(0, 10) + '...' : item.invoiceNo) : '-'}</div>
    },
    { 
      key: 'poNo', 
      header: 'PO',
      render: (item: Payment) => <div style={{ minWidth: '70px', fontSize: '11px' }} title={item.poNo || '-'}>{item.poNo ? (item.poNo.length > 8 ? item.poNo.substring(0, 8) + '...' : item.poNo) : '-'}</div>
    },
    { 
      key: 'customerName', 
      header: 'Customer',
      render: (item: Payment) => <div style={{ minWidth: '100px', fontSize: '11px' }} title={item.customerName || '-'}>{item.customerName ? (item.customerName.length > 12 ? item.customerName.substring(0, 12) + '...' : item.customerName) : '-'}</div>
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
                // Ensure payments is always an array
                const paymentsArray = Array.isArray(payments) ? payments : [];
                const updated = paymentsArray.filter(p => p.id !== item.id);
                await storageService.set('payments', updated);
                setPayments(updated.map((p, idx) => ({ ...p, no: idx + 1 })));
                closeDialog();
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
              <div style={{ marginBottom: 0, display: 'flex', alignItems: 'center' }}>
                <Input
                  type="text"
                  placeholder="Search payments..."
                  value={searchQuery}
                  onChange={(value) => setSearchQuery(value)}
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
              setFormData({ paymentDate: new Date().toISOString().split('T')[0], amount: 0, paymentMethod: 'Bank Transfer', debitAccount: '', creditAccount: '' }); 
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
                <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                  <div style={{ width: '100%', overflowX: 'auto' }}>
                    <Table columns={columns} data={filteredPayments} />
                  </div>
                </div>
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
                  {(Array.isArray(purchaseOrders) ? purchaseOrders : []).map(po => (
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

