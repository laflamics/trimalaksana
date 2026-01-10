import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { storageService } from '../../../services/storage';
import { deletePackagingItem, reloadPackagingData } from '../../../utils/packaging-delete-helper';
import '../../../styles/common.css';
import '../../../styles/compact.css';

interface JournalEntry {
  id: string;
  no: number;
  entryDate: string;
  reference: string;
  account: string;
  accountName: string;
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

const GeneralLedger = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [formData, setFormData] = useState<Partial<JournalEntry>>({
    entryDate: new Date().toISOString().split('T')[0],
    reference: '',
    account: '',
    accountName: '',
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
    let data = await storageService.get<JournalEntry[]>('journalEntries') || [];
    
    // 🚀 FIX: Filter deleted items langsung saat load
    const dataArray = Array.isArray(data) ? data : [];
    const activeDataArray = filterActiveItems(dataArray);
    
    // Jika journal entries kosong (setelah filter), generate dari transaksi yang sudah ada
    if (activeDataArray.length === 0) {
      console.log('📝 Journal entries kosong, mulai generate dari transaksi...');
      await generateJournalEntriesFromTransactions();
      // Reload setelah generate
      data = await storageService.get<JournalEntry[]>('journalEntries') || [];
      // Filter lagi setelah generate
      const reloadedDataArray = Array.isArray(data) ? data : [];
      const reloadedActiveData = filterActiveItems(reloadedDataArray);
      console.log(`✅ Generated ${reloadedActiveData.length} journal entries`);
      setEntries(reloadedActiveData.map((e, idx) => ({ ...e, no: idx + 1 })));
    } else {
      setEntries(activeDataArray.map((e, idx) => ({ ...e, no: idx + 1 })));
    }
  };

  // Generate journal entries dari transaksi yang sudah ada
  const generateJournalEntriesFromTransactions = async () => {
    try {
      const [invoices, payments, purchaseOrders, existingEntries] = await Promise.all([
        storageService.get<any[]>('invoices') || [],
        storageService.get<any[]>('payments') || [],
        storageService.get<any[]>('purchaseOrders') || [],
        storageService.get<any[]>('journalEntries') || [],
      ]);

      // 🚀 FIX: Filter deleted items dari transaksi
      const invoicesData = filterActiveItems(Array.isArray(invoices) ? invoices : []);
      const paymentsData = filterActiveItems(Array.isArray(payments) ? payments : []);
      const purchaseOrdersData = filterActiveItems(Array.isArray(purchaseOrders) ? purchaseOrders : []);
      const existingEntriesData = filterActiveItems(Array.isArray(existingEntries) ? existingEntries : []);

      console.log(`📊 Data ditemukan: ${invoicesData.length} invoices, ${paymentsData.length} payments, ${purchaseOrdersData.length} POs`);

      // Jika sudah ada entries, skip generate
      if (existingEntriesData.length > 0) {
        console.log('✅ Journal entries sudah ada, skip generate');
        return;
      }

      const newEntries: JournalEntry[] = [];
      let entryNo = 1;

      // Generate dari Invoices (AR + Revenue)
      invoicesData.forEach((inv: any) => {
        const invoiceTotal = inv.bom?.total || inv.total || 0;
        if (invoiceTotal > 0) {
          const entryDate = inv.created ? new Date(inv.created).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
          newEntries.push(
            {
              id: `inv-${inv.id}-1`,
              no: entryNo++,
              entryDate: entryDate,
              reference: inv.invoiceNo || inv.id,
              account: '1100',
              accountName: 'Accounts Receivable',
              debit: invoiceTotal,
              credit: 0,
              description: `Invoice ${inv.invoiceNo || inv.id} - ${inv.customer || 'Customer'}`,
            },
            {
              id: `inv-${inv.id}-2`,
              no: entryNo++,
              entryDate: entryDate,
              reference: inv.invoiceNo || inv.id,
              account: '4000',
              accountName: 'Sales Revenue',
              debit: 0,
              credit: invoiceTotal,
              description: `Invoice ${inv.invoiceNo || inv.id} - ${inv.customer || 'Customer'}`,
            }
          );
        }
      });

      // Generate dari Payments (Receipt: Cash + AR, Payment: AP + Cash)
      paymentsData.forEach((pay: any) => {
        const amount = pay.amount || pay.total || 0;
        if (amount > 0) {
          const entryDate = pay.paymentDate || pay.created ? new Date(pay.paymentDate || pay.created).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
          const reference = pay.paymentNo || pay.invoiceNo || pay.poNo || pay.id;
          
          if (pay.type === 'Receipt' || pay.invoiceNo) {
            // Customer Payment: Debit Cash, Credit AR
            newEntries.push(
              {
                id: `pay-${pay.id}-1`,
                no: entryNo++,
                entryDate: entryDate,
                reference: reference,
                account: '1000',
                accountName: 'Cash',
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
                accountName: 'Accounts Receivable',
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
                accountName: 'Accounts Payable',
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
                accountName: 'Cash',
                debit: 0,
                credit: amount,
                description: `Payment ${reference} - ${pay.supplier || pay.supplierName || 'Supplier'}`,
              }
            );
          }
        }
      });

      // Generate dari Invoice Payments (jika invoice status CLOSE tapi tidak ada payment record)
      invoicesData.forEach((inv: any) => {
        if (inv.status === 'CLOSE' && inv.paymentProof) {
          const invoiceTotal = inv.bom?.total || inv.total || 0;
          if (invoiceTotal > 0) {
            // Cek apakah sudah ada payment record
            const hasPayment = paymentsData.some((p: any) => p.invoiceNo === inv.invoiceNo);
            if (!hasPayment) {
              const entryDate = inv.paidAt ? new Date(inv.paidAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
              newEntries.push(
                {
                  id: `inv-pay-${inv.id}-1`,
                  no: entryNo++,
                  entryDate: entryDate,
                  reference: inv.invoiceNo || inv.id,
                  account: '1000',
                  accountName: 'Cash',
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
                  accountName: 'Accounts Receivable',
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
      purchaseOrdersData.forEach((po: any) => {
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
                accountName: 'Inventory',
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
                accountName: 'Accounts Payable',
                debit: 0,
                credit: poTotal,
                description: `PO ${po.poNo || po.id} - ${po.supplier || 'Supplier'}`,
              }
            );
          }
        }
      });

      if (newEntries.length > 0) {
        await storageService.set('journalEntries', newEntries);
        console.log(`✅ Generated ${newEntries.length} journal entries from existing transactions`);
        // Alert user
        showAlert(`✅ Generated ${newEntries.length} journal entries from existing transactions!\n\n- ${invoicesData.length} Invoices\n- ${paymentsData.length} Payments\n- ${purchaseOrdersData.length} Purchase Orders`, 'Success');
      } else {
        console.log('⚠️ Tidak ada transaksi untuk di-generate');
        showAlert('⚠️ Tidak ada transaksi yang dapat di-generate ke journal entries.\n\nPastikan ada:\n- Invoices\n- Payments\n- Purchase Orders (CLOSE/RECEIVED)', 'Warning');
      }
    } catch (error: any) {
      console.error('❌ Error generating journal entries:', error);
      showAlert(`❌ Error generating journal entries: ${error.message}`, 'Error');
    }
  };

  const loadAccounts = async () => {
    const data = await storageService.get<Account[]>('accounts') || [];
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
      await storageService.set('accounts', defaultAccounts);
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
            ? { 
                ...formData, 
                id: editingEntry.id, 
                no: editingEntry.no, 
                accountName: selectedAccount.name,
                lastUpdate: new Date().toISOString(),
                timestamp: Date.now(),
                _timestamp: Date.now()
              } as JournalEntry
            : e
        );
        await storageService.set('journalEntries', updated);
        setEntries(updated.map((e, idx) => ({ ...e, no: idx + 1 })));
      } else {
        const newEntry: JournalEntry = {
          id: Date.now().toString(),
          no: entries.length + 1,
          accountName: selectedAccount.name,
          lastUpdate: new Date().toISOString(),
          timestamp: Date.now(),
          _timestamp: Date.now(),
          ...formData,
        } as JournalEntry;
        const updated = [...entries, newEntry];
        await storageService.set('journalEntries', updated);
        setEntries(updated.map((e, idx) => ({ ...e, no: idx + 1 })));
      }
      
      setShowForm(false);
      setEditingEntry(null);
      setFormData({ entryDate: new Date().toISOString().split('T')[0], reference: '', account: '', accountName: '', debit: 0, credit: 0, description: '' });
    } catch (error: any) {
      showAlert(`Error saving entry: ${error.message}`, 'Error');
    }
  };

  const filteredEntries = useMemo(() => {
    // Ensure entries is always an array
    const entriesArray = Array.isArray(entries) ? entries : [];
    return entriesArray.filter(entry => {
      const matchesSearch = !searchQuery ||
        entry.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.account.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDate = (!dateFrom || entry.entryDate >= dateFrom) &&
        (!dateTo || entry.entryDate <= dateTo);
      
      const matchesAccount = accountFilter === 'all' || entry.account === accountFilter;
      
      return matchesSearch && matchesDate && matchesAccount;
    });
  }, [entries, searchQuery, dateFrom, dateTo, accountFilter]);

  const accountBalances = useMemo(() => {
    const balances: Record<string, { debit: number; credit: number; balance: number }> = {};
    
    // Ensure filteredEntries is always an array
    const filteredEntriesArray = Array.isArray(filteredEntries) ? filteredEntries : [];
    filteredEntriesArray.forEach(entry => {
      if (!balances[entry.account]) {
        balances[entry.account] = { debit: 0, credit: 0, balance: 0 };
      }
      balances[entry.account].debit += entry.debit || 0;
      balances[entry.account].credit += entry.credit || 0;
    });
    
    Object.keys(balances).forEach(accCode => {
      const account = accounts.find(a => a.code === accCode);
      if (account) {
        if (account.type === 'Asset' || account.type === 'Expense') {
          balances[accCode].balance = balances[accCode].debit - balances[accCode].credit;
        } else {
          balances[accCode].balance = balances[accCode].credit - balances[accCode].debit;
        }
      }
    });
    
    return balances;
  }, [filteredEntries, accounts]);

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
        'Account Code': entry.account,
        'Account Name': entry.accountName,
        'Description': entry.description,
        'Debit': entry.debit || 0,
        'Credit': entry.credit || 0,
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'General Ledger');
      
      const fileName = `General_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Exported ${dataToExport.length} entries to ${fileName}`, 'Success');
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
          'Date': '2024-01-15',
          'Reference': 'REF-001',
          'Account Code': '1000',
          'Account Name': 'Cash',
          'Description': 'Contoh entry debit',
          'Debit': 1000000,
          'Credit': 0,
        },
        {
          'Date': '2024-01-15',
          'Reference': 'REF-001',
          'Account Code': '4000',
          'Account Name': 'Sales Revenue',
          'Description': 'Contoh entry credit',
          'Debit': 0,
          'Credit': 1000000,
        },
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      
      // Tambahkan sheet dengan daftar account codes
      const accountList = accounts.map(acc => ({
        'Account Code': acc.code,
        'Account Name': acc.name,
        'Type': acc.type,
      }));
      const wsAccounts = XLSX.utils.json_to_sheet(accountList);
      XLSX.utils.book_append_sheet(wb, wsAccounts, 'Account List');
      
      const fileName = `General_Ledger_Template.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Template downloaded! Silakan isi data sesuai format dan import kembali.`, 'Success');
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
          `Import ${jsonData.length} entries from Excel? This will add new entries to General Ledger.`,
          async () => {
            const newEntries: JournalEntry[] = [];
        const errors: string[] = [];

        jsonData.forEach((row, index) => {
          try {
            const entryDate = row['Date'] || row['date'] || new Date().toISOString().split('T')[0];
            const reference = String(row['Reference'] || row['reference'] || '').trim();
            const accountCode = String(row['Account Code'] || row['Account'] || row['account'] || row['account code'] || '').trim();
            const accountName = String(row['Account Name'] || row['account name'] || '').trim();
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
              accountName: accountName || account.name,
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
              await storageService.set('journalEntries', updated);
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
  };

  const columns = [
    { key: 'no', header: 'No' },
    { key: 'entryDate', header: 'Date' },
    { key: 'reference', header: 'Reference' },
    { key: 'account', header: 'Account Code' },
    { key: 'accountName', header: 'Account Name' },
    { key: 'description', header: 'Description' },
    { key: 'debit', header: 'Debit', render: (item: JournalEntry) => item.debit ? `Rp ${item.debit.toLocaleString('id-ID')}` : '-' },
    { key: 'credit', header: 'Credit', render: (item: JournalEntry) => item.credit ? `Rp ${item.credit.toLocaleString('id-ID')}` : '-' },
    { key: 'actions', header: 'Actions', render: (item: JournalEntry) => (
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button onClick={() => { setEditingEntry(item); setFormData(item); setShowForm(true); }} style={{ fontSize: '12px', padding: '4px 8px' }}>Edit</Button>
        <Button variant="danger" onClick={() => {
          showConfirm(
            'Delete this entry?',
            async () => {
              // 🚀 FIX: Pakai packaging delete helper untuk konsistensi
              const deleteResult = await deletePackagingItem('journalEntries', item.id, 'id');
              if (deleteResult.success) {
                // Reload data dengan helper (handle race condition)
                const dataRaw = await storageService.get<any[]>('journalEntries') || [];
                const data = dataRaw.filter((e: any) => !e.deleted && !e.deletedAt);
                setEntries(data.map((e, idx) => ({ ...e, no: idx + 1 })));
                closeDialog();
                showAlert('Journal entry deleted successfully', 'Success');
              } else {
                closeDialog();
                showAlert(`Error deleting entry: ${deleteResult.error || 'Unknown error'}`, 'Error');
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
          <h2>General Ledger</h2>
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
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
            >
              <option value="all">All Accounts</option>
              {accounts.map(acc => (
                <option key={acc.code} value={acc.code}>{acc.code} - {acc.name}</option>
              ))}
            </select>
            <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
            <Button variant="secondary" onClick={handleDownloadTemplate}>📋 Download Template</Button>
            <Button variant="secondary" onClick={handleImportExcel}>📤 Import Excel</Button>
            <Button onClick={() => { setShowForm(true); setEditingEntry(null); setFormData({ entryDate: new Date().toISOString().split('T')[0], reference: '', account: '', accountName: '', debit: 0, credit: 0, description: '' }); }}>
              + New Entry
            </Button>
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

        <Table columns={columns} data={filteredEntries} />
      </Card>

      {/* Account Balances Summary */}
      <div style={{ marginTop: '30px' }}>
        <Card>
          <h3 style={{ marginBottom: '15px' }}>Account Balances Summary</h3>
          <Table
            columns={[
              { key: 'code', header: 'Account Code' },
              { key: 'name', header: 'Account Name' },
              { key: 'type', header: 'Type' },
              { key: 'debit', header: 'Total Debit' },
              { key: 'credit', header: 'Total Credit' },
              { key: 'balance', header: 'Balance' },
            ]}
            data={accounts.map((acc) => ({
              id: acc.code,
              code: acc.code,
              name: acc.name,
              type: acc.type,
              debit: accountBalances[acc.code]?.debit || 0,
              credit: accountBalances[acc.code]?.credit || 0,
              balance: accountBalances[acc.code]?.balance || 0,
            })).map(item => ({
              ...item,
              debit: `Rp ${item.debit.toLocaleString('id-ID')}`,
              credit: `Rp ${item.credit.toLocaleString('id-ID')}`,
              balance: `Rp ${item.balance.toLocaleString('id-ID')}`,
            }))}
          />
        </Card>
      </div>

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
            <h3>{editingEntry ? 'Edit Journal Entry' : 'New Journal Entry'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
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
              <div>
                <label>Account</label>
                <select
                  value={formData.account || ''}
                  onChange={(e) => {
                    const selected = accounts.find(a => a.code === e.target.value);
                    setFormData({ ...formData, account: e.target.value, accountName: selected?.name || '' });
                  }}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                >
                  <option value="">Select Account...</option>
                  {accounts.map(acc => (
                    <option key={acc.code} value={acc.code}>{acc.code} - {acc.name}</option>
                  ))}
                </select>
              </div>
              <Input
                label="Description"
                value={formData.description || ''}
                onChange={(value) => setFormData({ ...formData, description: value })}
              />
              <Input
                label="Debit"
                type="number"
                value={formData.debit?.toString() || '0'}
                onChange={(value) => {
                  const debit = parseFloat(value) || 0;
                  setFormData({ ...formData, debit, credit: debit > 0 ? 0 : formData.credit });
                }}
              />
              <Input
                label="Credit"
                type="number"
                value={formData.credit?.toString() || '0'}
                onChange={(value) => {
                  const credit = parseFloat(value) || 0;
                  setFormData({ ...formData, credit, debit: credit > 0 ? 0 : formData.debit });
                }}
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <Button variant="secondary" onClick={() => { setShowForm(false); setEditingEntry(null); }}>
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
    </div>
  );
};

export default GeneralLedger;

