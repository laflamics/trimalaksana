import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { storageService } from '../../../services/storage';
import { filterActiveItems } from '../../../utils/packaging-delete-helper';
import { deletePackagingItem, reloadPackagingData } from '../../../utils/packaging-delete-helper';
import '../../../styles/common.css';
import '../../../styles/compact.css';

interface TaxRecord {
  id: string;
  taxDate: string;
  reference: string; // Invoice No, PO No, Payment No, etc
  referenceType: 'Invoice' | 'Purchase Order' | 'Payment' | 'Manual';
  taxType: 'PPN Masukan' | 'PPN Keluaran' | 'PPN Barang Mewah' | 'PPh 21' | 'PPh 23' | 'PPh 25' | 'PPh 4(2)' | 'Other';
  coaCode: string; // COA account code
  coaName: string; // COA account name
  baseAmount: number; // Amount sebelum tax
  taxPercent: number; // Tax percentage
  taxAmount: number; // Tax amount
  totalAmount: number; // Total amount (base + tax)
  customer?: string;
  supplier?: string;
  description: string;
  status: 'Open' | 'Paid' | 'Claimed';
  created: string;
  updated?: string;
}

interface Account {
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  balance: number;
}

const TaxManagement = () => {
  const [taxRecords, setTaxRecords] = useState<TaxRecord[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TaxRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [taxTypeFilter, setTaxTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [coaInputValue, setCoaInputValue] = useState('');
  const [baseAmountInputValue, setBaseAmountInputValue] = useState('');
  const [taxPercentInputValue, setTaxPercentInputValue] = useState('');
  const [taxAmountInputValue, setTaxAmountInputValue] = useState('');
  const [formData, setFormData] = useState<Partial<TaxRecord>>({
    taxDate: new Date().toISOString().split('T')[0],
    reference: '',
    referenceType: 'Manual',
    taxType: 'PPN Masukan',
    coaCode: '',
    coaName: '',
    baseAmount: 0,
    taxPercent: 11,
    taxAmount: 0,
    totalAmount: 0,
    description: '',
    status: 'Open',
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

  // Helper function untuk remove leading zero dari input angka
  const removeLeadingZero = (value: string): string => {
    if (!value) return value;
    if (value === '0' || value === '0.' || value === '0,') {
      return value;
    }
    if (value.startsWith('0') && value.length > 1) {
      if (value.startsWith('0.') || value.startsWith('0,')) {
        return value;
      }
      const cleaned = value.replace(/^0+/, '');
      return cleaned || '0';
    }
    return value;
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Load accounts
    const accs = await storageService.get<Account[]>('accounts') || [];
    // 🚀 FIX: Filter deleted items
    const activeAccounts = filterActiveItems(Array.isArray(accs) ? accs : []);
    setAccounts(activeAccounts);

    // Load invoices, purchase orders, payments
    const invs = await storageService.get<any[]>('invoices') || [];
    const pos = await storageService.get<any[]>('purchaseOrders') || [];
    const pays = await storageService.get<any[]>('payments') || [];
    // 🚀 FIX: Filter deleted items
    const activeInvoices = filterActiveItems(Array.isArray(invs) ? invs : []);
    const activePOs = filterActiveItems(Array.isArray(pos) ? pos : []);
    const activePayments = filterActiveItems(Array.isArray(pays) ? pays : []);
    setInvoices(activeInvoices);
    setPurchaseOrders(activePOs);
    setPayments(activePayments);

    // Load tax records
    let recordsRaw = await storageService.get<TaxRecord[]>('taxRecords') || [];
    // Ensure records is always an array
    // 🚀 FIX: Filter deleted items
    let records = filterActiveItems(Array.isArray(recordsRaw) ? recordsRaw : []);

    // Generate tax records dari invoices, purchase orders jika belum ada
    const generatedRecords: TaxRecord[] = [];

    // 🚀 FIX: Pakai activeInvoices yang sudah di-filter (tidak perlu invsArray lagi)
    // Generate dari Invoices (PPN Keluaran)
    activeInvoices.forEach((inv: any) => {
      const taxAmount = inv.tax || 0;
      const taxPercent = inv.taxPercent || 11;
      if (taxAmount > 0) {
        const existing = records.find(r => r.reference === inv.invoiceNo && r.referenceType === 'Invoice');
        if (!existing) {
          const baseAmount = inv.subtotal || inv.bom?.subtotal || (inv.total || 0) - taxAmount;
          generatedRecords.push({
            id: `tax-inv-${inv.id || inv.invoiceNo}`,
            taxDate: inv.invoiceDate || inv.created || new Date().toISOString().split('T')[0],
            reference: inv.invoiceNo || inv.id,
            referenceType: 'Invoice',
            taxType: 'PPN Keluaran',
            coaCode: '2-4110',
            coaName: 'PPN KELUARAN',
            baseAmount: baseAmount,
            taxPercent: taxPercent,
            taxAmount: taxAmount,
            totalAmount: (inv.total || inv.bom?.total || 0),
            customer: inv.customer,
            description: `PPN Keluaran dari Invoice ${inv.invoiceNo || inv.id} - ${inv.customer || 'Customer'}`,
            status: inv.status === 'CLOSE' ? 'Paid' : 'Open',
            created: inv.created || new Date().toISOString(),
          });
        }
      }
    });

    // 🚀 FIX: Pakai activePOs yang sudah di-filter (tidak perlu posArray lagi)
    // Generate dari Purchase Orders (PPN Masukan)
    activePOs.forEach((po: any) => {
      const includeTax = po.includeTax || po.includeTaxFlag || false;
      if (includeTax && po.total > 0) {
        const existing = records.find(r => r.reference === po.poNo && r.referenceType === 'Purchase Order');
        if (!existing) {
          const baseAmount = po.total / 1.11; // Reverse calculate base amount
          const taxAmount = po.total - baseAmount;
          generatedRecords.push({
            id: `tax-po-${po.id || po.poNo}`,
            taxDate: po.poDate || po.orderDate || po.created || new Date().toISOString().split('T')[0],
            reference: po.poNo || po.id,
            referenceType: 'Purchase Order',
            taxType: 'PPN Masukan',
            coaCode: '1-1410',
            coaName: 'PPN MASUKAN',
            baseAmount: baseAmount,
            taxPercent: 11,
            taxAmount: taxAmount,
            totalAmount: po.total,
            supplier: po.supplier,
            description: `PPN Masukan dari PO ${po.poNo || po.id} - ${po.supplier || 'Supplier'}`,
            status: po.status === 'CLOSE' || po.status === 'RECEIVED' ? 'Claimed' : 'Open',
            created: po.created || new Date().toISOString(),
          });
        }
      }
    });

    // Merge generated records dengan existing records
    if (generatedRecords.length > 0) {
      records = [...records, ...generatedRecords];
      await storageService.set('taxRecords', records);
    }

    setTaxRecords(records);
  };

  const getCoaInputDisplayValue = () => {
    if (coaInputValue !== undefined && coaInputValue !== '') {
      return coaInputValue;
    }
    if (formData.coaCode) {
      const account = accounts.find(a => a.code === formData.coaCode);
      if (account) {
        return `${account.code} - ${account.name}`;
      }
      return formData.coaCode;
    }
    return '';
  };

  const handleCoaInputChange = (text: string) => {
    setCoaInputValue(text);
    if (!text) {
      setFormData({ ...formData, coaCode: '', coaName: '' });
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
      setFormData({ ...formData, coaCode: matchedAccount.code, coaName: matchedAccount.name });
    } else {
      setFormData({ ...formData, coaCode: text });
    }
  };

  const handleBaseAmountChange = (value: string) => {
    const cleaned = removeLeadingZero(value.replace(/[^\d.,]/g, '').replace(',', '.'));
    setBaseAmountInputValue(cleaned);
    const numValue = parseFloat(cleaned) || 0;
    const taxPercent = parseFloat(taxPercentInputValue) || formData.taxPercent || 11;
    const taxAmount = numValue * (taxPercent / 100);
    setFormData({
      ...formData,
      baseAmount: numValue,
      taxAmount: taxAmount,
      totalAmount: numValue + taxAmount,
    });
    setTaxAmountInputValue(taxAmount.toFixed(2));
  };

  const handleTaxPercentChange = (value: string) => {
    const cleaned = removeLeadingZero(value.replace(/[^\d.,]/g, '').replace(',', '.'));
    setTaxPercentInputValue(cleaned);
    const numValue = parseFloat(cleaned) || 0;
    const baseAmount = parseFloat(baseAmountInputValue) || formData.baseAmount || 0;
    const taxAmount = baseAmount * (numValue / 100);
    setFormData({
      ...formData,
      taxPercent: numValue,
      taxAmount: taxAmount,
      totalAmount: baseAmount + taxAmount,
    });
    setTaxAmountInputValue(taxAmount.toFixed(2));
  };

  const handleTaxAmountChange = (value: string) => {
    const cleaned = removeLeadingZero(value.replace(/[^\d.,]/g, '').replace(',', '.'));
    setTaxAmountInputValue(cleaned);
    const numValue = parseFloat(cleaned) || 0;
    const baseAmount = parseFloat(baseAmountInputValue) || formData.baseAmount || 0;
    const taxPercent = baseAmount > 0 ? (numValue / baseAmount) * 100 : 0;
    setFormData({
      ...formData,
      taxAmount: numValue,
      taxPercent: taxPercent,
      totalAmount: baseAmount + numValue,
    });
    setTaxPercentInputValue(taxPercent.toFixed(2));
  };

  const handleSave = async () => {
    try {
      if (!formData.taxDate || !formData.reference || !formData.coaCode || !formData.taxType) {
        showAlert('Please fill all required fields', 'Validation Error');
        return;
      }

      if (formData.baseAmount === 0 && formData.taxAmount === 0) {
        showAlert('Base amount or tax amount must be greater than 0', 'Validation Error');
        return;
      }

      const selectedAccount = accounts.find(a => a.code === formData.coaCode);
      if (!selectedAccount) {
        showAlert('COA account not found', 'Error');
        return;
      }

      // Ensure taxRecords is always an array
      const taxRecordsArray = Array.isArray(taxRecords) ? taxRecords : [];
      
      if (editingRecord) {
        const updated = taxRecordsArray.map(r =>
          r.id === editingRecord.id
            ? { ...formData, id: editingRecord.id, updated: new Date().toISOString() } as TaxRecord
            : r
        );
        await storageService.set('taxRecords', updated);
        setTaxRecords(updated);
        showAlert('Tax record updated successfully', 'Success');
      } else {
        const newRecord: TaxRecord = {
          id: Date.now().toString(),
          ...formData,
          created: new Date().toISOString(),
        } as TaxRecord;
        const updated = [...taxRecordsArray, newRecord];
        await storageService.set('taxRecords', updated);
        setTaxRecords(updated);
        showAlert('Tax record created successfully', 'Success');
      }

      setShowForm(false);
      setEditingRecord(null);
      setCoaInputValue('');
      setBaseAmountInputValue('');
      setTaxPercentInputValue('');
      setTaxAmountInputValue('');
      setFormData({
        taxDate: new Date().toISOString().split('T')[0],
        reference: '',
        referenceType: 'Manual',
        taxType: 'PPN Masukan',
        coaCode: '',
        coaName: '',
        baseAmount: 0,
        taxPercent: 11,
        taxAmount: 0,
        totalAmount: 0,
        description: '',
        status: 'Open',
      });
    } catch (error: any) {
      showAlert(`Error saving tax record: ${error.message}`, 'Error');
    }
  };

  const handleEdit = (record: TaxRecord) => {
    setEditingRecord(record);
    setFormData(record);
    setCoaInputValue(`${record.coaCode} - ${record.coaName}`);
    setBaseAmountInputValue(String(record.baseAmount || 0));
    setTaxPercentInputValue(String(record.taxPercent || 11));
    setTaxAmountInputValue(String(record.taxAmount || 0));
    setShowForm(true);
  };

  const handleDelete = (record: TaxRecord) => {
    try {
      if (!record || !record.reference) {
        showAlert('Tax record tidak valid. Mohon coba lagi.', 'Error');
        return;
      }
      
      // Validate record.id exists
      if (!record.id) {
        showAlert(`❌ Error: Tax record ${record.reference || 'Unknown'} tidak memiliki ID. Tidak bisa dihapus.`, 'Error');
        return;
      }
      
      showConfirm(
        `Hapus Tax Record ${record.reference}?\n\n⚠️ Data akan dihapus dengan aman (tombstone pattern) untuk mencegah auto-sync mengembalikan data.\n\nTindakan ini tidak bisa dibatalkan.`,
        async () => {
          try {
            // 🚀 FIX: Pakai packaging delete helper untuk konsistensi
            const deleteResult = await deletePackagingItem('taxRecords', record.id, 'id');
            if (deleteResult.success) {
              // Reload data dengan helper (handle race condition)
              await reloadPackagingData('taxRecords', setTaxRecords);
              closeDialog();
              showAlert('Tax record deleted successfully', 'Success');
            } else {
              closeDialog();
              showAlert(`Error deleting tax record: ${deleteResult.error || 'Unknown error'}`, 'Error');
            }
          } catch (error: any) {
            closeDialog();
            showAlert(`Error deleting tax record: ${error.message}`, 'Error');
          }
        },
        () => closeDialog(),
        'Safe Delete Confirmation'
      );
    } catch (error: any) {
      showAlert(`Error: ${error.message}`, 'Error');
    }
  };

  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Sheet 1: Tax Records
      const wsData = [
        ['Tax Date', 'Reference', 'Reference Type', 'Tax Type', 'COA Code', 'COA Name', 'Base Amount', 'Tax %', 'Tax Amount', 'Total Amount', 'Customer/Supplier', 'Description', 'Status'],
        ...filteredRecords.map(r => [
          r.taxDate,
          r.reference,
          r.referenceType,
          r.taxType,
          r.coaCode,
          r.coaName,
          r.baseAmount,
          r.taxPercent,
          r.taxAmount,
          r.totalAmount,
          r.customer || r.supplier || '',
          r.description,
          r.status,
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Tax Records');

      // Sheet 2: Summary by Tax Type
      const summaryData = [
        ['Tax Type', 'Count', 'Total Base Amount', 'Total Tax Amount', 'Total Amount'],
        ...summaryByTaxType.map(s => [
          s.taxType,
          s.count,
          s.totalBaseAmount,
          s.totalTaxAmount,
          s.totalAmount,
        ]),
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary by Tax Type');

      const fileName = `Tax_Management_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Exported to ${fileName}`, 'Success');
    } catch (error: any) {
      showAlert(`Error exporting to Excel: ${error.message}`, 'Error');
    }
  };

  const filteredRecords = useMemo(() => {
    // Ensure taxRecords is always an array
    const taxRecordsArray = Array.isArray(taxRecords) ? taxRecords : [];
    return taxRecordsArray.filter(record => {
      const matchesSearch = !searchQuery ||
        record.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.supplier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.coaCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.coaName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDate = (!dateFrom || record.taxDate >= dateFrom) &&
        (!dateTo || record.taxDate <= dateTo);

      const matchesTaxType = taxTypeFilter === 'all' || record.taxType === taxTypeFilter;
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;

      return matchesSearch && matchesDate && matchesTaxType && matchesStatus;
    });
  }, [taxRecords, searchQuery, dateFrom, dateTo, taxTypeFilter, statusFilter]);

  const summaryByTaxType = useMemo(() => {
    const summary: Record<string, { count: number; totalBaseAmount: number; totalTaxAmount: number; totalAmount: number }> = {};
    // Ensure filteredRecords is always an array
    const filteredRecordsArray = Array.isArray(filteredRecords) ? filteredRecords : [];
    filteredRecordsArray.forEach(record => {
      if (!summary[record.taxType]) {
        summary[record.taxType] = { count: 0, totalBaseAmount: 0, totalTaxAmount: 0, totalAmount: 0 };
      }
      summary[record.taxType].count++;
      summary[record.taxType].totalBaseAmount += record.baseAmount || 0;
      summary[record.taxType].totalTaxAmount += record.taxAmount || 0;
      summary[record.taxType].totalAmount += record.totalAmount || 0;
    });
    return Object.entries(summary).map(([taxType, data]) => ({
      taxType,
      ...data,
    }));
  }, [filteredRecords]);

  const totalSummary = useMemo(() => {
    // Ensure filteredRecords is always an array
    const filteredRecordsArray = Array.isArray(filteredRecords) ? filteredRecords : [];
    return filteredRecordsArray.reduce((acc, record) => ({
      totalBaseAmount: acc.totalBaseAmount + (record.baseAmount || 0),
      totalTaxAmount: acc.totalTaxAmount + (record.taxAmount || 0),
      totalAmount: acc.totalAmount + (record.totalAmount || 0),
    }), { totalBaseAmount: 0, totalTaxAmount: 0, totalAmount: 0 });
  }, [filteredRecords]);

  const columns = [
    { key: 'taxDate', header: 'Tax Date' },
    { key: 'reference', header: 'Reference' },
    { key: 'referenceType', header: 'Type' },
    { key: 'taxType', header: 'Tax Type' },
    {
      key: 'coaCode',
      header: 'COA',
      render: (item: TaxRecord) => `${item.coaCode} - ${item.coaName}`,
    },
    {
      key: 'baseAmount',
      header: 'Base Amount',
      render: (item: TaxRecord) => `Rp ${(item.baseAmount || 0).toLocaleString('id-ID')}`,
    },
    {
      key: 'taxPercent',
      header: 'Tax %',
      render: (item: TaxRecord) => `${item.taxPercent || 0}%`,
    },
    {
      key: 'taxAmount',
      header: 'Tax Amount',
      render: (item: TaxRecord) => `Rp ${(item.taxAmount || 0).toLocaleString('id-ID')}`,
    },
    {
      key: 'totalAmount',
      header: 'Total Amount',
      render: (item: TaxRecord) => `Rp ${(item.totalAmount || 0).toLocaleString('id-ID')}`,
    },
    { key: 'customer', header: 'Customer/Supplier' },
    {
      key: 'status',
      header: 'Status',
      render: (item: TaxRecord) => (
        <span className={`status-badge status-${item.status.toLowerCase()}`}>
          {item.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: TaxRecord) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <Button variant="secondary" onClick={() => handleEdit(item)} style={{ fontSize: '12px', padding: '4px 8px' }}>Edit</Button>
          <Button variant="danger" onClick={() => handleDelete(item)} style={{ fontSize: '12px', padding: '4px 8px' }}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="module-compact">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Tax Management</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Input
              type="text"
              placeholder="Search..."
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
              value={taxTypeFilter}
              onChange={(e) => setTaxTypeFilter(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            >
              <option value="all">All Tax Types</option>
              <option value="PPN Masukan">PPN Masukan</option>
              <option value="PPN Keluaran">PPN Keluaran</option>
              <option value="PPN Barang Mewah">PPN Barang Mewah</option>
              <option value="PPh 21">PPh 21</option>
              <option value="PPh 23">PPh 23</option>
              <option value="PPh 25">PPh 25</option>
              <option value="PPh 4(2)">PPh 4(2)</option>
              <option value="Other">Other</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            >
              <option value="all">All Status</option>
              <option value="Open">Open</option>
              <option value="Paid">Paid</option>
              <option value="Claimed">Claimed</option>
            </select>
            <Button onClick={() => {
              setShowForm(true);
              setEditingRecord(null);
              setCoaInputValue('');
              setBaseAmountInputValue('');
              setTaxPercentInputValue('');
              setTaxAmountInputValue('');
              setFormData({
                taxDate: new Date().toISOString().split('T')[0],
                reference: '',
                referenceType: 'Manual',
                taxType: 'PPN Masukan',
                coaCode: '',
                coaName: '',
                baseAmount: 0,
                taxPercent: 11,
                taxAmount: 0,
                totalAmount: 0,
                description: '',
                status: 'Open',
              });
            }}>
              + New Tax Record
            </Button>
            <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
            <Button variant="secondary" onClick={loadData}>🔄 Refresh</Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
          <Card style={{ padding: '12px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)' }}>
              {filteredRecords.length}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Total Records</div>
          </Card>
          <Card style={{ padding: '12px' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--success)' }}>
              Rp {totalSummary.totalBaseAmount.toLocaleString('id-ID')}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Total Base Amount</div>
          </Card>
          <Card style={{ padding: '12px' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--warning)' }}>
              Rp {totalSummary.totalTaxAmount.toLocaleString('id-ID')}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Total Tax Amount</div>
          </Card>
          <Card style={{ padding: '12px' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent-color)' }}>
              Rp {totalSummary.totalAmount.toLocaleString('id-ID')}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Total Amount</div>
          </Card>
        </div>

        {/* Summary by Tax Type */}
        {summaryByTaxType.length > 0 && (
          <Card style={{ marginBottom: '20px', padding: '12px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>Summary by Tax Type</h3>
            <Table
              columns={[
                { key: 'taxType', header: 'Tax Type' },
                { key: 'count', header: 'Count' },
                {
                  key: 'totalBaseAmount',
                  header: 'Total Base Amount',
                  render: (item: any) => `Rp ${item.totalBaseAmount.toLocaleString('id-ID')}`,
                },
                {
                  key: 'totalTaxAmount',
                  header: 'Total Tax Amount',
                  render: (item: any) => `Rp ${item.totalTaxAmount.toLocaleString('id-ID')}`,
                },
                {
                  key: 'totalAmount',
                  header: 'Total Amount',
                  render: (item: any) => `Rp ${item.totalAmount.toLocaleString('id-ID')}`,
                },
              ]}
              data={summaryByTaxType}
            />
          </Card>
        )}

        <Table columns={columns} data={filteredRecords} emptyMessage="No tax records found" />

        {/* Form Dialog */}
        {showForm && (
          <div className="dialog-overlay" onClick={() => setShowForm(false)}>
            <div className="dialog-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%', textAlign: 'left' }}>
              <h3 style={{ marginTop: 0, marginBottom: '20px' }}>
                {editingRecord ? 'Edit Tax Record' : 'New Tax Record'}
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                    Tax Date *
                  </label>
                  <Input
                    type="date"
                    value={formData.taxDate || ''}
                    onChange={(value) => setFormData({ ...formData, taxDate: value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                    Reference *
                  </label>
                  <Input
                    type="text"
                    value={formData.reference || ''}
                    onChange={(value) => setFormData({ ...formData, reference: value })}
                    placeholder="Invoice No, PO No, etc"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                    Reference Type *
                  </label>
                  <select
                    value={formData.referenceType || 'Manual'}
                    onChange={(e) => setFormData({ ...formData, referenceType: e.target.value as any })}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  >
                    <option value="Invoice">Invoice</option>
                    <option value="Purchase Order">Purchase Order</option>
                    <option value="Payment">Payment</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                    Tax Type *
                  </label>
                  <select
                    value={formData.taxType || 'PPN Masukan'}
                    onChange={(e) => setFormData({ ...formData, taxType: e.target.value as any })}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  >
                    <option value="PPN Masukan">PPN Masukan</option>
                    <option value="PPN Keluaran">PPN Keluaran</option>
                    <option value="PPN Barang Mewah">PPN Barang Mewah</option>
                    <option value="PPh 21">PPh 21</option>
                    <option value="PPh 23">PPh 23</option>
                    <option value="PPh 25">PPh 25</option>
                    <option value="PPh 4(2)">PPh 4(2)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  COA Account *
                </label>
                <input
                  type="text"
                  list="coa-list"
                  value={getCoaInputDisplayValue()}
                  onChange={(e) => handleCoaInputChange(e.target.value)}
                  onBlur={() => {
                    if (formData.coaCode) {
                      const account = accounts.find(a => a.code === formData.coaCode);
                      if (account) {
                        setCoaInputValue(`${account.code} - ${account.name}`);
                        setFormData({ ...formData, coaName: account.name });
                      }
                    }
                  }}
                  placeholder="Search COA account..."
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
                <datalist id="coa-list">
                  {accounts.filter(a => 
                    a.code.toLowerCase().includes('tax') || 
                    a.code.toLowerCase().includes('ppn') || 
                    a.code.toLowerCase().includes('pph') ||
                    a.name.toLowerCase().includes('tax') ||
                    a.name.toLowerCase().includes('ppn') ||
                    a.name.toLowerCase().includes('pph')
                  ).map(account => (
                    <option key={account.code} value={`${account.code} - ${account.name}`} />
                  ))}
                </datalist>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                    Base Amount
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={baseAmountInputValue}
                    onChange={(e) => handleBaseAmountChange(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setBaseAmountInputValue(val.toFixed(2));
                    }}
                    placeholder="0"
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
                    Tax %
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={taxPercentInputValue}
                    onChange={(e) => handleTaxPercentChange(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setTaxPercentInputValue(val.toFixed(2));
                    }}
                    placeholder="11"
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
                    Tax Amount
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={taxAmountInputValue}
                    onChange={(e) => handleTaxAmountChange(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setTaxAmountInputValue(val.toFixed(2));
                    }}
                    placeholder="0"
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

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Total Amount
                </label>
                <div style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <Input
                    type="text"
                    value={`Rp ${(formData.totalAmount || 0).toLocaleString('id-ID')}`}
                    onChange={() => {}}
                    disabled
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                    Customer/Supplier
                  </label>
                  <Input
                    type="text"
                    value={formData.customer || formData.supplier || ''}
                    onChange={(value) => {
                      if (formData.taxType === 'PPN Keluaran') {
                        setFormData({ ...formData, customer: value });
                      } else {
                        setFormData({ ...formData, supplier: value });
                      }
                    }}
                    placeholder="Customer or Supplier name"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                    Status
                  </label>
                  <select
                    value={formData.status || 'Open'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  >
                    <option value="Open">Open</option>
                    <option value="Paid">Paid</option>
                    <option value="Claimed">Claimed</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tax description..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={() => {
                  setShowForm(false);
                  setEditingRecord(null);
                  setCoaInputValue('');
                  setBaseAmountInputValue('');
                  setTaxPercentInputValue('');
                  setTaxAmountInputValue('');
                  setFormData({
                    taxDate: new Date().toISOString().split('T')[0],
                    reference: '',
                    referenceType: 'Manual',
                    taxType: 'PPN Masukan',
                    coaCode: '',
                    coaName: '',
                    baseAmount: 0,
                    taxPercent: 11,
                    taxAmount: 0,
                    totalAmount: 0,
                    description: '',
                    status: 'Open',
                  });
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Dialog */}
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
      </Card>
    </div>
  );
};

export default TaxManagement;

