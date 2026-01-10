import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { storageService } from '../../../services/storage';
import { safeDeleteItem, filterActiveItems } from '../../../utils/data-persistence-helper';
import '../../../styles/common.css';
import '../../../styles/compact.css';

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

interface Account {
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  balance: number;
}

const Accounting = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [accountInputValue, setAccountInputValue] = useState('');
  const [debitInputValue, setDebitInputValue] = useState('');
  const [creditInputValue, setCreditInputValue] = useState('');
  const [formData, setFormData] = useState<Partial<JournalEntry>>({
    entryDate: new Date().toISOString().split('T')[0],
    reference: '',
    account: '',
    debit: 0,
    credit: 0,
    description: '',
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
    loadEntries();
    loadAccounts();
  }, []);

  const loadEntries = async () => {
    let data = await storageService.get<JournalEntry[]>('trucking_journalEntries') || [];
    
    // Filter out deleted items menggunakan helper function
    const activeData = filterActiveItems(data || []);
    
    // Ensure data is always an array before checking length
    const dataArray = Array.isArray(activeData) ? activeData : [];
    
    // Jika journal entries kosong, generate dari transaksi yang sudah ada
    if (dataArray.length === 0) {
      await generateJournalEntriesFromTransactions();
      data = await storageService.get<JournalEntry[]>('trucking_journalEntries') || [];
      // Filter out deleted items again after reload menggunakan helper function
      const reloadedActiveData = filterActiveItems(data || []);
      // Ensure data is still an array after reload
      const reloadedDataArray = Array.isArray(reloadedActiveData) ? reloadedActiveData : [];
      setEntries(reloadedDataArray.map((e, idx) => ({ ...e, no: idx + 1 })));
    } else {
      setEntries(dataArray.map((e, idx) => ({ ...e, no: idx + 1 })));
    }
  };

  // Generate journal entries dari transaksi yang sudah ada
  const generateJournalEntriesFromTransactions = async () => {
    try {
      // Load existing journal entries untuk prevent duplicate
      const existingEntriesRaw = await storageService.get<JournalEntry[]>('trucking_journalEntries') || [];
      const existingEntries = filterActiveItems(Array.isArray(existingEntriesRaw) ? existingEntriesRaw : []);
      
      const [invoices, payments, purchaseOrders] = await Promise.all([
        storageService.get<any[]>('trucking_invoices') || [],
        storageService.get<any[]>('trucking_payments') || [],
        storageService.get<any[]>('trucking_purchaseOrders') || [],
      ]);

      const newEntries: JournalEntry[] = [];
      let entryNo = existingEntries.length + 1;

      // Generate dari Invoices (AR + Revenue)
      // Ensure invoices is always an array
      const invoicesArray = Array.isArray(invoices) ? invoices : [];
      invoicesArray.forEach((inv: any) => {
        const invoiceNo = inv.invoiceNo || inv.id;
        // Cek apakah sudah ada entries untuk invoice ini
        const hasInvoiceEntries = existingEntries.some((entry: any) =>
          entry.reference === invoiceNo
        );
        
        if (!hasInvoiceEntries) {
          const invoiceTotal = inv.bom?.total || inv.total || 0;
          if (invoiceTotal > 0) {
            const entryDate = inv.created ? new Date(inv.created).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            newEntries.push(
              {
                id: `inv-${inv.id}-1`,
                no: entryNo++,
                entryDate: entryDate,
                reference: invoiceNo,
                account: '1100',
                debit: invoiceTotal,
                credit: 0,
                description: `Invoice ${invoiceNo} - ${inv.customer || 'Customer'}`,
              },
              {
                id: `inv-${inv.id}-2`,
                no: entryNo++,
                entryDate: entryDate,
                reference: invoiceNo,
                account: '4000',
                debit: 0,
                credit: invoiceTotal,
                description: `Invoice ${invoiceNo} - ${inv.customer || 'Customer'}`,
              }
            );
          }
        }
      });

      // Generate dari Payments (Receipt: Cash + AR, Payment: AP + Cash)
      // Ensure payments is always an array
      const paymentsArray = Array.isArray(payments) ? payments : [];
      paymentsArray.forEach((pay: any) => {
        const amount = pay.amount || pay.total || 0;
        if (amount > 0) {
          const entryDate = pay.paymentDate || pay.created ? new Date(pay.paymentDate || pay.created).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
          const reference = pay.type === 'Receipt' && pay.invoiceNo ? `PAYMENT-${pay.invoiceNo}` : (pay.paymentNo || pay.invoiceNo || pay.poNo || pay.id);
          
          // Cek apakah sudah ada entries untuk payment ini
          const hasPaymentEntries = existingEntries.some((entry: any) =>
            entry.reference === reference
          );
          
          if (hasPaymentEntries) {
            return; // Skip jika sudah ada entries
          }
          
          if (pay.type === 'Receipt' || pay.invoiceNo) {
            // Customer Payment: Debit Cash, Credit AR
            newEntries.push(
              {
                id: `pay-${pay.id}-1`,
                no: entryNo++,
                entryDate: entryDate,
                reference: reference,
                account: '1000',
                debit: amount,
                credit: 0,
                description: `Receipt ${reference} - ${pay.customer || pay.customerName || 'Customer'}`,
              },
              {
                id: `pay-${pay.id}-2`,
                no: entryNo++,
                entryDate: entryDate,
                reference: reference,
                account: '1100',
                debit: 0,
                credit: amount,
                description: `Receipt ${reference} - ${pay.customer || pay.customerName || 'Customer'}`,
              }
            );
          } else if (pay.type === 'Payment' || pay.poNo || pay.purchaseOrderNo) {
            // Supplier Payment: Debit AP, Credit Cash
            newEntries.push(
              {
                id: `pay-${pay.id}-1`,
                no: entryNo++,
                entryDate: entryDate,
                reference: reference,
                account: '2000',
                debit: amount,
                credit: 0,
                description: `Payment ${reference} - ${pay.supplier || pay.supplierName || 'Supplier'}`,
              },
              {
                id: `pay-${pay.id}-2`,
                no: entryNo++,
                entryDate: entryDate,
                reference: reference,
                account: '1000',
                debit: 0,
                credit: amount,
                description: `Payment ${reference} - ${pay.supplier || pay.supplierName || 'Supplier'}`,
              }
            );
          }
        }
      });

      // Generate dari Invoice Payments (jika invoice status CLOSE tapi tidak ada payment record)
      // invoicesArray already declared above
      invoicesArray.forEach((inv: any) => {
        if (inv.status === 'CLOSE' && inv.paymentProof) {
          const invoiceTotal = inv.bom?.total || inv.total || 0;
          if (invoiceTotal > 0) {
            // paymentsArray already declared above
            const hasPayment = paymentsArray.some((p: any) => p.invoiceNo === inv.invoiceNo);
            if (!hasPayment) {
              const entryDate = inv.paidAt ? new Date(inv.paidAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
              newEntries.push(
                {
                  id: `inv-pay-${inv.id}-1`,
                  no: entryNo++,
                  entryDate: entryDate,
                  reference: inv.invoiceNo || inv.id,
                  account: '1000',
                  debit: invoiceTotal,
                  credit: 0,
                  description: `Payment for Invoice ${inv.invoiceNo || inv.id} - ${inv.customer || 'Customer'}`,
                },
                {
                  id: `inv-pay-${inv.id}-2`,
                  no: entryNo++,
                  entryDate: entryDate,
                  reference: inv.invoiceNo || inv.id,
                  account: '1100',
                  debit: 0,
                  credit: invoiceTotal,
                  description: `Payment for Invoice ${inv.invoiceNo || inv.id} - ${inv.customer || 'Customer'}`,
                }
              );
            }
          }
        }
      });

      // Generate dari Purchase Orders yang sudah CLOSE/RECEIVED (Inventory + AP)
      // Ensure purchaseOrders is always an array
      const purchaseOrdersArray = Array.isArray(purchaseOrders) ? purchaseOrders : [];
      purchaseOrdersArray.forEach((po: any) => {
        if ((po.status === 'CLOSE' || po.status === 'RECEIVED') && po.total > 0) {
          // Cek apakah sudah ada journal entry untuk PO ini
          const hasJournalEntry = newEntries.some((e: any) => e.reference === po.poNo && e.account === '2000');
          if (!hasJournalEntry) {
            const entryDate = po.poDate || po.orderDate || po.created ? new Date(po.poDate || po.orderDate || po.created).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            const poTotal = po.total || 0;
            
            // Debit Inventory (1200), Credit Accounts Payable (2000)
            newEntries.push(
              {
                id: `po-${po.id || po.poNo}-1`,
                no: entryNo++,
                entryDate: entryDate,
                reference: po.poNo || po.id,
                account: '1200',
                debit: poTotal,
                credit: 0,
                description: `PO ${po.poNo || po.id} - ${po.supplier || 'Supplier'}`,
              },
              {
                id: `po-${po.id || po.poNo}-2`,
                no: entryNo++,
                entryDate: entryDate,
                reference: po.poNo || po.id,
                account: '2000',
                debit: 0,
                credit: poTotal,
                description: `PO ${po.poNo || po.id} - ${po.supplier || 'Supplier'}`,
              }
            );
          }
        }
      });

      if (newEntries.length > 0) {
        await storageService.set('trucking_journalEntries', newEntries);
        console.log(`✅ Generated ${newEntries.length} journal entries from existing transactions`);
      }
    } catch (error: any) {
      console.error('Error generating journal entries:', error);
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

  const getAccountInputDisplayValue = () => {
    if (accountInputValue !== undefined && accountInputValue !== '') {
      return accountInputValue;
    }
    if (formData.account) {
      const account = accounts.find(a => a.code === formData.account);
      if (account) {
        return `${account.code} - ${account.name}`;
      }
      return formData.account;
    }
    return '';
  };

  const handleAccountInputChange = (text: string) => {
    setAccountInputValue(text);
    if (!text) {
      setFormData({ ...formData, account: '' });
      return;
    }
    const normalized = text.toLowerCase();
    const matchedAccount = accounts.find(a => {
      const label = `${a.code || ''}${a.code ? ' - ' : ''}${a.name || ''}`.toLowerCase();
      const code = (a.code || '').toLowerCase();
      const name = (a.name || '').toLowerCase();
      return label === normalized || code === normalized || name === normalized;
    });
    if (matchedAccount) {
      setFormData({ ...formData, account: matchedAccount.code });
    } else {
      setFormData({ ...formData, account: text });
    }
  };

  const loadAccounts = async () => {
    const data = await storageService.get<Account[]>('trucking_accounts') || [];
    if (!data || data.length === 0) {
      const defaultAccounts: Account[] = [
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
      await storageService.set('trucking_accounts', defaultAccounts);
      setAccounts(defaultAccounts);
    } else {
      setAccounts(data);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.entryDate || !formData.account || (!formData.debit && !formData.credit)) {
        showAlert('Please fill all required fields', 'Validation Error');
        return;
      }

      const selectedAccount = accounts.find(a => a.code === formData.account);
      if (!selectedAccount) {
        showAlert('Account not found', 'Error');
        return;
      }

      if (editingEntry) {
        const updated = entries.map(e =>
          e.id === editingEntry.id
            ? { ...formData, id: editingEntry.id, no: editingEntry.no } as JournalEntry
            : e
        );
        await storageService.set('trucking_journalEntries', updated);
        setEntries(updated.map((e, idx) => ({ ...e, no: idx + 1 })));
      } else {
        // Jika ada reference yang sama, adjust entry yang sudah ada agar tetap balanced
        const relatedEntries = entries.filter(e => e.reference === formData.reference);
        let updated = [...entries];
        
        // Cari index entry pertama dengan reference yang sama untuk insert entry baru di sela-sela
        let insertIndex = updated.length; // Default: append di akhir
        if (relatedEntries.length > 0) {
          const firstRelatedIndex = updated.findIndex(e => e.reference === formData.reference);
          if (firstRelatedIndex >= 0) {
            // Insert setelah entry pertama dengan reference yang sama
            insertIndex = firstRelatedIndex + 1;
          }
          
          // Hitung total debit dan credit untuk reference yang sama
          const totalDebit = relatedEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
          const totalCredit = relatedEntries.reduce((sum, e) => sum + (e.credit || 0), 0);
          
          // Hitung entry baru
          const newDebit = formData.debit || 0;
          const newCredit = formData.credit || 0;
          
          // Hitung selisih yang perlu di-adjust (selisih setelah entry baru ditambahkan)
          const totalAfterNew = (totalDebit + newDebit) - (totalCredit + newCredit);
          
          // Jika ada selisih, adjust entry pertama yang sesuai
          if (totalAfterNew !== 0) {
            // Jika entry baru adalah debit, kurangi debit dari entry pertama yang punya debit
            if (newDebit > 0) {
              const firstDebitEntry = relatedEntries.find(e => e.debit && e.debit > 0);
              if (firstDebitEntry) {
                // Kurangi debit entry pertama dengan selisih yang ada
                updated = updated.map(e => {
                  if (e.id === firstDebitEntry.id) {
                    const adjustedDebit = Math.max(0, (firstDebitEntry.debit || 0) - totalAfterNew);
                    return { ...e, debit: adjustedDebit } as JournalEntry;
                  }
                  return e;
                });
              }
            } 
            // Jika entry baru adalah kredit, kurangi kredit dari entry pertama yang punya kredit
            else if (newCredit > 0) {
              const firstCreditEntry = relatedEntries.find(e => e.credit && e.credit > 0);
              if (firstCreditEntry) {
                // Kurangi kredit entry pertama dengan selisih yang ada
                updated = updated.map(e => {
                  if (e.id === firstCreditEntry.id) {
                    const adjustedCredit = Math.max(0, (firstCreditEntry.credit || 0) - Math.abs(totalAfterNew));
                    return { ...e, credit: adjustedCredit } as JournalEntry;
                  }
                  return e;
                });
              }
            }
          }
        }
        
        const newEntry: JournalEntry = {
          id: Date.now().toString(),
          no: insertIndex + 1,
          ...formData,
        } as JournalEntry;
        
        // Insert entry baru di posisi yang tepat (di sela-sela)
        updated.splice(insertIndex, 0, newEntry);
        
        await storageService.set('trucking_journalEntries', updated);
        setEntries(updated.map((e, idx) => ({ ...e, no: idx + 1 })));
      }
      
      setShowForm(false);
      setEditingEntry(null);
      setAccountInputValue('');
      setDebitInputValue('');
      setCreditInputValue('');
      setFormData({ entryDate: new Date().toISOString().split('T')[0], reference: '', account: '', debit: 0, credit: 0, description: '' });
    } catch (error: any) {
      showAlert(`Error saving entry: ${error.message}`, 'Error');
    }
  };

  const filteredEntries = useMemo(() => {
    // Ensure entries is always an array
    const entriesArray = Array.isArray(entries) ? entries : [];
    return entriesArray.filter(entry => {
      // Ensure entry exists and has required properties
      if (!entry) return false;
      
      const matchesSearch = !searchQuery ||
        (entry.reference || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.account || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDate = (!dateFrom || (entry.entryDate && entry.entryDate >= dateFrom)) &&
        (!dateTo || (entry.entryDate && entry.entryDate <= dateTo));
      
      return matchesSearch && matchesDate;
    });
  }, [entries, searchQuery, dateFrom, dateTo]);

  const totalDebit = useMemo(() => {
    // Ensure filteredEntries is always an array
    const filteredEntriesArray = Array.isArray(filteredEntries) ? filteredEntries : [];
    return filteredEntriesArray.reduce((sum, entry) => sum + (entry.debit || 0), 0);
  }, [filteredEntries]);

  const totalCredit = useMemo(() => {
    // Ensure filteredEntries is always an array
    const filteredEntriesArray = Array.isArray(filteredEntries) ? filteredEntries : [];
    return filteredEntriesArray.reduce((sum, entry) => sum + (entry.credit || 0), 0);
  }, [filteredEntries]);

  // Export to Excel
  const handleExportExcel = () => {
    try {
      // Ensure filteredEntries is always an array
      const filteredEntriesArray = Array.isArray(filteredEntries) ? filteredEntries : [];
      const dataToExport = filteredEntriesArray.map(entry => ({
        'No': entry.no,
        'Date': entry.entryDate,
        'Reference': entry.reference,
        'Account': entry.account,
        'Description': entry.description,
        'Debit': entry.debit || 0,
        'Credit': entry.credit || 0,
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Journal Entries');
      
      const fileName = `Journal_Entries_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Exported ${dataToExport.length} entries to ${fileName}`, 'Success');
    } catch (error: any) {
      showAlert(`Error exporting to Excel: ${error.message}`, 'Error');
    }
  };

  // Download Template Excel
  const handleDownloadTemplate = () => {
    try {
      const templateData = [
        { 'Date': '2024-01-15', 'Reference': 'REF-001', 'Account': '1000', 'Description': 'Contoh entry debit', 'Debit': 1000000, 'Credit': 0 },
        { 'Date': '2024-01-15', 'Reference': 'REF-001', 'Account': '4000', 'Description': 'Contoh entry credit', 'Debit': 0, 'Credit': 1000000 },
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      
      const fileName = `Accounting_Template.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Template downloaded! Silakan isi data sesuai format dan import kembali.`, 'Success');
    } catch (error: any) {
      showAlert(`Error downloading template: ${error.message}`, 'Error');
    }
  };

  // Import from Excel
  const handleImportExcel = () => {
    // Show preview dialog dengan contoh header sebelum browse file
    const exampleHeaders = ['Date', 'Reference', 'Account', 'Description', 'Debit', 'Credit'];
    const exampleData = [
      { 'Date': '2024-01-15', 'Reference': 'REF-001', 'Account': '1000', 'Description': 'Contoh entry debit', 'Debit': 1000000, 'Credit': 0 },
      { 'Date': '2024-01-15', 'Reference': 'REF-001', 'Account': '4000', 'Description': 'Contoh entry credit', 'Debit': 0, 'Credit': 1000000 },
    ];
    
    const showPreviewDialog = () => {
      showConfirm(
        `📋 Format Excel untuk Import Journal Entries\n\nPastikan file Excel Anda memiliki header berikut:\n\n${exampleHeaders.join(' | ')}\n\nContoh data:\n${exampleData.map((row, idx) => `${idx + 1}. ${exampleHeaders.map(h => String(row[h as keyof typeof row] || '')).join(' | ')}`).join('\n')}\n\n⚠️ Catatan:\n- Header harus ada di baris pertama\n- Date format: YYYY-MM-DD\n- Account harus ada di COA\n- Debit atau Credit harus diisi (tidak boleh keduanya 0)\n\nKlik "Download Template" untuk mendapatkan file Excel template, atau "Lanjutkan" untuk memilih file Excel yang sudah Anda siapkan.`,
        () => {
          closeDialog();
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
                `Import ${jsonData.length} entries from Excel? This will add new entries to Accounting.`,
                async () => {
                  const newEntries: JournalEntry[] = [];
                  const errors: string[] = [];

                  jsonData.forEach((row, index) => {
                    try {
                      const entryDate = row['Date'] || row['date'] || new Date().toISOString().split('T')[0];
                      const reference = String(row['Reference'] || row['reference'] || '').trim();
                      const accountCode = String(row['Account'] || row['account'] || row['Account Code'] || '').trim();
                      const description = String(row['Description'] || row['description'] || '').trim();
                      const debit = parseFloat(row['Debit'] || row['debit'] || 0) || 0;
                      const credit = parseFloat(row['Credit'] || row['credit'] || 0) || 0;

                      if (!entryDate || !accountCode || (!debit && !credit)) {
                        errors.push(`Row ${index + 2}: Missing required fields`);
                        return;
                      }

                      const account = accounts.find(a => a.code === accountCode);
                      if (!account) {
                        errors.push(`Row ${index + 2}: Account code ${accountCode} not found`);
                        return;
                      }

                      newEntries.push({
                        id: `import-${Date.now()}-${index}`,
                        no: entries.length + newEntries.length + 1,
                        entryDate: entryDate,
                        reference: reference,
                        account: accountCode,
                        debit: debit,
                        credit: credit,
                        description: description,
                      });
                    } catch (error: any) {
                      errors.push(`Row ${index + 2}: ${error.message}`);
                    }
                  });

                  if (newEntries.length > 0) {
                    const updated = [...entries, ...newEntries];
                    await storageService.set('trucking_journalEntries', updated);
                    setEntries(updated.map((e, idx) => ({ ...e, no: idx + 1 })));
                    showAlert(`✅ Imported ${newEntries.length} entries${errors.length > 0 ? `\n⚠️ ${errors.length} errors` : ''}`, 'Success');
                    if (errors.length > 0) {
                      console.error('Import errors:', errors);
                    }
                  } else {
                    showAlert('⚠️ No valid entries to import', 'Warning');
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
        },
        () => closeDialog(),
        'Format Excel Preview'
      );
    };
    
    showPreviewDialog();
  };

  const columns = [
    { key: 'no', header: 'No' },
    { key: 'entryDate', header: 'Date' },
    { key: 'reference', header: 'Reference' },
    { key: 'account', header: 'Account' },
    { key: 'description', header: 'Description' },
    { key: 'debit', header: 'Debit', render: (item: JournalEntry) => item.debit ? `Rp ${item.debit.toLocaleString('id-ID')}` : '-' },
    { key: 'credit', header: 'Credit', render: (item: JournalEntry) => item.credit ? `Rp ${item.credit.toLocaleString('id-ID')}` : '-' },
    { key: 'actions', header: 'Actions', render: (item: JournalEntry) => (
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button onClick={() => { 
          setEditingEntry(item); 
          const account = accounts.find(a => a.code === item.account);
          if (account) {
            setAccountInputValue(`${account.code} - ${account.name}`);
          } else {
            setAccountInputValue(item.account || '');
          }
          setDebitInputValue('');
          setCreditInputValue('');
          setFormData(item); 
          setShowForm(true); 
        }} style={{ fontSize: '12px', padding: '4px 8px' }}>Edit</Button>
        <Button variant="danger" onClick={() => {
          showConfirm(
            'Delete this entry?',
            async () => {
              try {
                // Pakai helper function untuk safe delete (tombstone pattern)
                const success = await safeDeleteItem('trucking_journalEntries', item.id, 'id');
                
                if (!success) {
                  closeDialog();
                  showAlert('Error deleting entry. Please try again.', 'Error');
                  return;
                }
                
                // Load updated data untuk logic restore balance
                let updated = await storageService.get<any[]>('trucking_journalEntries') || [];
                
                // Filter untuk logic restore balance (hanya active entries)
                const activeEntries = filterActiveItems(updated);
                
                // Jika entry yang di-delete punya reference yang sama dengan entry lain, restore balance
                const relatedEntries = activeEntries.filter(e => e.reference === item.reference);
                if (relatedEntries.length > 0) {
                  // Hitung total debit dan credit untuk reference yang sama setelah delete
                  const totalDebit = relatedEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
                  const totalCredit = relatedEntries.reduce((sum, e) => sum + (e.credit || 0), 0);
                  
                  // Hitung selisih (harusnya 0 kalau balanced)
                  const balanceDiff = totalDebit - totalCredit;
                  
                  // Jika ada selisih, restore balance dengan adjust entry pertama yang tersisa
                  // Ini berarti entry yang di-delete adalah entry yang menyebabkan adjustment sebelumnya
                  if (balanceDiff !== 0) {
                    // Cari entry pertama dengan reference yang sama (biasanya entry utama)
                    const firstRelatedEntry = relatedEntries[0];
                    if (firstRelatedEntry) {
                      // Restore entry pertama dengan menambahkan/mengurangi selisih
                      updated = updated.map(e => {
                        if (e.id === firstRelatedEntry.id) {
                          if (firstRelatedEntry.debit && firstRelatedEntry.debit > 0) {
                            // Restore debit dengan menambahkan kembali selisih yang dikurangi sebelumnya
                            const restoredDebit = (firstRelatedEntry.debit || 0) + balanceDiff;
                            return { ...e, debit: Math.max(0, restoredDebit) } as JournalEntry;
                          } else if (firstRelatedEntry.credit && firstRelatedEntry.credit > 0) {
                            // Restore credit dengan mengurangi selisih yang ditambahkan sebelumnya
                            const restoredCredit = (firstRelatedEntry.credit || 0) - balanceDiff;
                            return { ...e, credit: Math.max(0, restoredCredit) } as JournalEntry;
                          }
                        }
                        return e;
                      });
                      
                      // Simpan perubahan restore balance
                      await storageService.set('trucking_journalEntries', updated);
                    }
                  }
                  // Jika balanceDiff === 0, berarti entry yang di-delete adalah entry yang balanced
                  // atau entry debit/kredit utama yang dihapus, jadi tidak perlu restore
                }
                
                // Filter out deleted items untuk display menggunakan helper function
                const finalActiveEntries = filterActiveItems(updated);
                setEntries(finalActiveEntries.map((e, idx) => ({ ...e, no: idx + 1 })));
                closeDialog();
                showAlert('Entry deleted successfully', 'Success');
              } catch (error: any) {
                closeDialog();
                showAlert(`Error deleting entry: ${error.message}`, 'Error');
              }
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Accounting - Journal Entries</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Input
              type="text"
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(value) => setSearchQuery(value)}
            />
            <Input
              type="date"
              placeholder="From Date"
              value={dateFrom}
              onChange={(value) => setDateFrom(value)}
            />
            <Input
              type="date"
              placeholder="To Date"
              value={dateTo}
              onChange={(value) => setDateTo(value)}
            />
            <Button onClick={() => { 
              setShowForm(true); 
              setEditingEntry(null); 
              setAccountInputValue('');
              setDebitInputValue('');
              setCreditInputValue('');
              setFormData({ entryDate: new Date().toISOString().split('T')[0], reference: '', account: '', debit: 0, credit: 0, description: '' }); 
            }}>
              + New Entry
            </Button>
            <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
            <Button variant="secondary" onClick={handleDownloadTemplate}>📋 Download Template</Button>
            <Button variant="secondary" onClick={handleImportExcel}>📤 Import Excel</Button>
          </div>
        </div>

        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div><strong>Total Debit:</strong> Rp {totalDebit.toLocaleString('id-ID')}</div>
            <div><strong>Total Credit:</strong> Rp {totalCredit.toLocaleString('id-ID')}</div>
            <div style={{ color: totalDebit === totalCredit ? 'green' : 'red' }}>
              <strong>Balance:</strong> Rp {Math.abs(totalDebit - totalCredit).toLocaleString('id-ID')}
              {totalDebit !== totalCredit && ' (Unbalanced!)'}
            </div>
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={String(col.key)}>{col.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(filteredEntries) ? filteredEntries : []).length === 0 ? (
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <td colSpan={columns.length} className="table-empty">
                    No data available
                  </td>
                </tr>
              ) : (
                // Ensure filteredEntries is always an array
                (Array.isArray(filteredEntries) ? filteredEntries : []).map((item, idx) => {
                  const filteredEntriesArray = Array.isArray(filteredEntries) ? filteredEntries : [];
                  const nextEntry = filteredEntriesArray[idx + 1];
                  const prevEntry = idx > 0 ? filteredEntriesArray[idx - 1] : null;
                  // Tombol "+" muncul setelah entry pertama dengan reference yang sama, jika ada entry berikutnya dengan reference yang sama
                  const showAddButton = nextEntry && 
                    nextEntry.reference === item.reference && 
                    (!prevEntry || prevEntry.reference !== item.reference);
                  
                  return (
                    <React.Fragment key={item.id || idx}>
                      <tr style={{ background: 'var(--bg-secondary)' }}>
                        {columns.map((col) => (
                          <td
                            key={String(col.key)}
                            style={{
                              borderBottom: 'none',
                              paddingBottom: '12px',
                              paddingTop: '12px',
                              background: 'var(--bg-secondary)',
                            }}
                          >
                            {col.render
                              ? col.render(item)
                              : String(item[col.key as keyof JournalEntry] || '')}
                          </td>
                        ))}
                      </tr>
                      {showAddButton && (
                        <tr style={{ backgroundColor: 'transparent', height: '1px', position: 'relative' }}>
                          <td colSpan={columns.length} style={{ padding: '0px', borderTop: 'none', borderBottom: 'none', position: 'relative', height: '1px' }}>
                            <div style={{ 
                              position: 'relative', 
                              height: '1px', 
                              backgroundColor: 'var(--border-color)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-start'
                            }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingEntry(null); 
                                  setAccountInputValue('');
                                  setDebitInputValue('');
                                  setCreditInputValue('');
                                  setFormData({ 
                                    entryDate: item.entryDate, 
                                    reference: item.reference, 
                                    account: '', 
                                    debit: 0, 
                                    credit: 0, 
                                    description: '' 
                                  }); 
                                  setShowForm(true); 
                                }}
                                ref={(el) => {
                                  if (el) {
                                    el.style.setProperty('transform', 'translateY(-50%) scale(1)', 'important');
                                    el.style.setProperty('transition', 'none', 'important');
                                  }
                                }}
                                style={{
                                  position: 'absolute',
                                  left: '4px',
                                  top: '50%',
                                  transform: 'translateY(-50%) scale(1)',
                                  fontSize: '9px',
                                  padding: '0px',
                                  width: '14px',
                                  height: '14px',
                                  backgroundColor: 'var(--bg-primary)',
                                  color: 'var(--text-secondary)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '2px',
                                  cursor: 'pointer',
                                  fontWeight: 'normal',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  lineHeight: '1',
                                  opacity: 0.5,
                                  zIndex: 10,
                                  transition: 'none',
                                  outline: 'none',
                                  boxShadow: 'none'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.setProperty('transform', 'translateY(-50%) scale(1)', 'important');
                                  e.currentTarget.style.setProperty('transition', 'none', 'important');
                                  e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                                  e.currentTarget.style.color = 'var(--text-secondary)';
                                  e.currentTarget.style.opacity = '0.5';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.setProperty('transform', 'translateY(-50%) scale(1)', 'important');
                                  e.currentTarget.style.setProperty('transition', 'none', 'important');
                                  e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                                  e.currentTarget.style.color = 'var(--text-secondary)';
                                  e.currentTarget.style.opacity = '0.5';
                                }}
                                onMouseDown={(e) => {
                                  e.currentTarget.style.setProperty('transform', 'translateY(-50%) scale(1)', 'important');
                                  e.currentTarget.style.setProperty('transition', 'none', 'important');
                                  e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                                  e.currentTarget.style.color = 'var(--text-secondary)';
                                  e.currentTarget.style.opacity = '0.5';
                                }}
                                onMouseUp={(e) => {
                                  e.currentTarget.style.setProperty('transform', 'translateY(-50%) scale(1)', 'important');
                                  e.currentTarget.style.setProperty('transition', 'none', 'important');
                                  e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                                  e.currentTarget.style.color = 'var(--text-secondary)';
                                  e.currentTarget.style.opacity = '0.5';
                                }}
                                onFocus={(e) => {
                                  e.currentTarget.style.setProperty('transform', 'translateY(-50%) scale(1)', 'important');
                                  e.currentTarget.style.setProperty('transition', 'none', 'important');
                                  e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                                  e.currentTarget.style.color = 'var(--text-secondary)';
                                  e.currentTarget.style.opacity = '0.5';
                                  e.currentTarget.style.outline = 'none';
                                  e.currentTarget.style.boxShadow = 'none';
                                }}
                                onBlur={(e) => {
                                  e.currentTarget.style.setProperty('transform', 'translateY(-50%) scale(1)', 'important');
                                  e.currentTarget.style.setProperty('transition', 'none', 'important');
                                  e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                                  e.currentTarget.style.color = 'var(--text-secondary)';
                                  e.currentTarget.style.opacity = '0.5';
                                }}
                                title="Add related entry"
                              >
                                +
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
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
        }} onClick={() => {
          setShowForm(false);
          setEditingEntry(null);
          setAccountInputValue('');
          setDebitInputValue('');
          setCreditInputValue('');
          setFormData({ entryDate: new Date().toISOString().split('T')[0], reference: '', account: '', debit: 0, credit: 0, description: '' });
        }}>
          <Card 
            title={editingEntry ? 'Edit Journal Entry' : 'New Journal Entry'}
            style={{ 
              width: '600px', 
              maxWidth: '90vw', 
              maxHeight: '90vh', 
              overflow: 'auto',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Input
                label="Entry Date"
                type="date"
                value={formData.entryDate || ''}
                onChange={(value) => setFormData({ ...formData, entryDate: value })}
              />
              <Input
                label="Reference"
                value={formData.reference || ''}
                onChange={(value) => setFormData({ ...formData, reference: value })}
              />
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Account
                </label>
                <input
                  type="text"
                  list={`account-list-${editingEntry?.id || 'new'}`}
                  value={getAccountInputDisplayValue()}
                  onChange={(e) => {
                    handleAccountInputChange(e.target.value);
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    const matchedAccount = accounts.find(a => {
                      const label = `${a.code || ''}${a.code ? ' - ' : ''}${a.name || ''}`;
                      return label === value;
                    });
                    if (matchedAccount) {
                      setFormData({ ...formData, account: matchedAccount.code });
                    }
                  }}
                  placeholder="Select Account..."
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
                <datalist id={`account-list-${editingEntry?.id || 'new'}`}>
                  {accounts.map(acc => (
                    <option key={acc.code} value={`${acc.code} - ${acc.name}`}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </datalist>
              </div>
              <Input
                label="Description"
                value={formData.description || ''}
                onChange={(value) => setFormData({ ...formData, description: value })}
              />
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Debit
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={debitInputValue !== undefined && debitInputValue !== '' ? debitInputValue : (formData.debit !== undefined && formData.debit !== null && formData.debit !== 0 ? String(formData.debit) : '')}
                  onFocus={(e) => {
                    const input = e.target as HTMLInputElement;
                    const currentVal = formData.debit || 0;
                    if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                      setDebitInputValue('');
                      input.value = '';
                    } else {
                      input.select();
                    }
                  }}
                  onMouseDown={(e) => {
                    const input = e.target as HTMLInputElement;
                    const currentVal = formData.debit || 0;
                    if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                      setDebitInputValue('');
                      input.value = '';
                    }
                  }}
                  onChange={(e) => {
                    let val = e.target.value;
                    val = val.replace(/[^\d.,]/g, '');
                    const cleaned = removeLeadingZero(val);
                    setDebitInputValue(cleaned);
                    const debit = cleaned === '' ? 0 : Number(cleaned) || 0;
                    setFormData({ ...formData, debit, credit: debit > 0 ? 0 : formData.credit });
                  }}
                  onBlur={(e) => {
                    const val = e.target.value;
                    if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                      setFormData({ ...formData, debit: 0 });
                      setDebitInputValue('');
                    } else {
                      const debit = Number(val);
                      setFormData({ ...formData, debit, credit: debit > 0 ? 0 : formData.credit });
                      setDebitInputValue('');
                    }
                  }}
                  onKeyDown={(e) => {
                    const input = e.target as HTMLInputElement;
                    const currentVal = input.value;
                    if ((currentVal === '' || currentVal === '0') && /^[1-9]$/.test(e.key)) {
                      e.preventDefault();
                      const newVal = e.key;
                      setDebitInputValue(newVal);
                      input.value = newVal;
                      const debit = Number(newVal);
                      setFormData({ ...formData, debit, credit: debit > 0 ? 0 : formData.credit });
                    }
                  }}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Credit
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={creditInputValue !== undefined && creditInputValue !== '' ? creditInputValue : (formData.credit !== undefined && formData.credit !== null && formData.credit !== 0 ? String(formData.credit) : '')}
                  onFocus={(e) => {
                    const input = e.target as HTMLInputElement;
                    const currentVal = formData.credit || 0;
                    if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                      setCreditInputValue('');
                      input.value = '';
                    } else {
                      input.select();
                    }
                  }}
                  onMouseDown={(e) => {
                    const input = e.target as HTMLInputElement;
                    const currentVal = formData.credit || 0;
                    if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                      setCreditInputValue('');
                      input.value = '';
                    }
                  }}
                  onChange={(e) => {
                    let val = e.target.value;
                    val = val.replace(/[^\d.,]/g, '');
                    const cleaned = removeLeadingZero(val);
                    setCreditInputValue(cleaned);
                    const credit = cleaned === '' ? 0 : Number(cleaned) || 0;
                    setFormData({ ...formData, credit, debit: credit > 0 ? 0 : formData.debit });
                  }}
                  onBlur={(e) => {
                    const val = e.target.value;
                    if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                      setFormData({ ...formData, credit: 0 });
                      setCreditInputValue('');
                    } else {
                      const credit = Number(val);
                      setFormData({ ...formData, credit, debit: credit > 0 ? 0 : formData.debit });
                      setCreditInputValue('');
                    }
                  }}
                  onKeyDown={(e) => {
                    const input = e.target as HTMLInputElement;
                    const currentVal = input.value;
                    if ((currentVal === '' || currentVal === '0') && /^[1-9]$/.test(e.key)) {
                      e.preventDefault();
                      const newVal = e.key;
                      setCreditInputValue(newVal);
                      input.value = newVal;
                      const credit = Number(newVal);
                      setFormData({ ...formData, credit, debit: credit > 0 ? 0 : formData.debit });
                    }
                  }}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <Button variant="secondary" onClick={() => { 
                  setShowForm(false); 
                  setEditingEntry(null); 
                  setAccountInputValue('');
                  setDebitInputValue('');
                  setCreditInputValue('');
                  setFormData({ entryDate: new Date().toISOString().split('T')[0], reference: '', account: '', debit: 0, credit: 0, description: '' });
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  Save
                </Button>
              </div>
            </div>
          </Card>
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
              <div className="dialog-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {dialogState.type === 'confirm' && dialogState.title && dialogState.title.includes('Format Excel') && (
                  <Button variant="secondary" onClick={() => {
                    handleDownloadTemplate();
                    closeDialog();
                  }} style={{ marginRight: 'auto' }}>
                    📥 Download Template
                  </Button>
                )}
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

export default Accounting;

