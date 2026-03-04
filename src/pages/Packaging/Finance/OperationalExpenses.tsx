import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import DateRangeFilter from '../../../components/DateRangeFilter';
import { storageService, StorageKeys } from '../../../services/storage';
import { logCreate, logUpdate, logDelete } from '../../../utils/activity-logger';
import { useLanguage } from '../../../hooks/useLanguage';
import '../../../styles/common.css';
import '../../../styles/compact.css';

interface OperationalExpense {
  id: string;
  no: number;
  expenseNo: string;
  expenseDate: string;
  type: 'General' | 'PettyCash';
  category: 'Electricity' | 'Water' | 'Gas' | 'Salary' | 'Logistics' | 'Other';
  description: string;
  amount: number;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Check' | 'Credit Card';
  approvedBy?: string;
  requestor?: string; // For Petty Cash
  notes?: string;
  created?: string;
  lastUpdate?: string;
  timestamp?: number;
  _timestamp?: number;
}

const OperationalExpenses = () => {
  const { t } = useLanguage();
  const [expenses, setExpenses] = useState<OperationalExpense[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'General' | 'PettyCash'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<OperationalExpense | null>(null);
  const [amountInputValue, setAmountInputValue] = useState('');
  const [formData, setFormData] = useState<Partial<OperationalExpense>>({
    expenseDate: new Date().toISOString().split('T')[0],
    type: 'General',
    category: 'Other',
    amount: 0,
    paymentMethod: 'Bank Transfer',
    requestor: '',
  });

  // Custom Dialog state
  const [, setDialogState] = useState<{
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await storageService.get<OperationalExpense[]>('operationalExpenses') || [];
      const expensesArray = Array.isArray(data) ? data : [];
      setExpenses(expensesArray);
    } catch (error: any) {
      showAlert(`Error loading data: ${error.message}`, 'Error');
    } finally {
      setLoading(false);
    }
  };

  const generateExpenseNo = () => {
    const date = new Date(formData.expenseDate || new Date());
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const type = formData.type === 'General' ? 'GEN' : 'PC';
    const count = expenses.filter(e => e.type === formData.type).length + 1;
    return `${type}-${year}${month}-${String(count).padStart(4, '0')}`;
  };

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

  const handleSave = async () => {
    try {
      if (!formData.expenseDate || !formData.amount || formData.amount <= 0) {
        showAlert('Please fill all required fields', 'Validation Error');
        return;
      }

      if (!formData.description || formData.description.trim() === '') {
        showAlert('Please enter a description', 'Validation Error');
        return;
      }

      const expensesArray = Array.isArray(expenses) ? expenses : [];

      if (editingExpense) {
        const updated = expensesArray.map(e =>
          e.id === editingExpense.id
            ? {
                ...formData,
                id: editingExpense.id,
                no: editingExpense.no,
                expenseNo: editingExpense.expenseNo,
                lastUpdate: new Date().toISOString(),
                timestamp: Date.now(),
                _timestamp: Date.now(),
              } as OperationalExpense
            : e
        );
        await storageService.set(StorageKeys.PACKAGING.OPERATIONAL_EXPENSES, updated);
        await logUpdate('OperationalExpense', editingExpense.id, '/packaging/finance/operational-expenses', {
          expenseNo: editingExpense.expenseNo,
          amount: formData.amount,
          type: formData.type,
        });
        setExpenses(updated);
      } else {
        const newExpense: OperationalExpense = {
          id: Date.now().toString(),
          no: expensesArray.length + 1,
          expenseNo: generateExpenseNo(),
          expenseDate: formData.expenseDate || new Date().toISOString().split('T')[0],
          type: formData.type as 'General' | 'PettyCash',
          category: formData.category as any,
          description: formData.description || '',
          amount: formData.amount || 0,
          paymentMethod: formData.paymentMethod as any,
          approvedBy: formData.approvedBy,
          requestor: formData.requestor,
          notes: formData.notes,
          created: new Date().toISOString(),
          lastUpdate: new Date().toISOString(),
          timestamp: Date.now(),
          _timestamp: Date.now(),
        };
        const updated = [...expensesArray, newExpense];
        await storageService.set(StorageKeys.PACKAGING.OPERATIONAL_EXPENSES, updated);
        await logCreate('OperationalExpense', newExpense.id, '/packaging/finance/operational-expenses', {
          expenseNo: newExpense.expenseNo,
          amount: newExpense.amount,
          type: newExpense.type,
        });
        setExpenses(updated);
      }

      setShowForm(false);
      setEditingExpense(null);
      setAmountInputValue('');
      setFormData({
        expenseDate: new Date().toISOString().split('T')[0],
        type: 'General',
        category: 'Other',
        amount: 0,
        paymentMethod: 'Bank Transfer',
        requestor: '',
      });
      showAlert(`✅ Expense ${editingExpense ? 'updated' : 'saved'} successfully`, 'Success');
    } catch (error: any) {
      showAlert(`Error saving expense: ${error.message}`, 'Error');
    }
  };

  const filteredExpenses = useMemo(() => {
    const expensesArray = Array.isArray(expenses) ? expenses : [];
    return expensesArray.filter(expense => {
      const matchesSearch = !searchQuery ||
        (expense.expenseNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (expense.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = typeFilter === 'all' || expense.type === typeFilter;
      const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
      
      // Date filtering
      const expenseDate = new Date(expense.expenseDate);
      const matchesDateFrom = !dateFrom || expenseDate >= new Date(dateFrom);
      const matchesDateTo = !dateTo || expenseDate <= new Date(dateTo);
      
      return matchesSearch && matchesType && matchesCategory && matchesDateFrom && matchesDateTo;
    });
  }, [expenses, searchQuery, typeFilter, categoryFilter, dateFrom, dateTo]);

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [filteredExpenses]);

  const categoryStats = useMemo(() => {
    const stats: Record<string, { count: number; total: number }> = {
      'Electricity': { count: 0, total: 0 },
      'Water': { count: 0, total: 0 },
      'Gas': { count: 0, total: 0 },
      'Salary': { count: 0, total: 0 },
      'Logistics': { count: 0, total: 0 },
      'Other': { count: 0, total: 0 },
    };

    filteredExpenses.forEach(e => {
      if (stats[e.category]) {
        stats[e.category].count += 1;
        stats[e.category].total += e.amount || 0;
      }
    });

    return stats;
  }, [filteredExpenses]);

  const handleExportExcel = () => {
    try {
      const dataToExport = filteredExpenses.map(expense => ({
        'No': expense.no,
        'Expense No': expense.expenseNo,
        'Date': expense.expenseDate,
        'Type': expense.type,
        'Category': expense.category,
        'Description': expense.description,
        'Amount': expense.amount,
        'Payment Method': expense.paymentMethod,
        'Approved By': expense.approvedBy || '',
        ...(typeFilter === 'PettyCash' ? { 'Requestor': expense.requestor || '' } : {}),
        'Notes': expense.notes || '',
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Operational Expenses');

      const fileName = `Operational_Expenses_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Exported ${dataToExport.length} expenses to ${fileName}`, 'Success');
    } catch (error: any) {
      showAlert(`Error exporting to Excel: ${error.message}`, 'Error');
    }
  };

  // Helper function to parse various date formats to YYYY-MM-DD
  const parseDateString = (dateStr: string): string => {
    if (!dateStr) return '';
    
    dateStr = dateStr.trim();
    
    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Format: 1-Jan, 1-Jan-2026, 01-Jan-2026
    const monthNames: { [key: string]: string } = {
      'jan': '01', 'january': '01',
      'feb': '02', 'february': '02',
      'mar': '03', 'march': '03',
      'apr': '04', 'april': '04',
      'may': '05',
      'jun': '06', 'june': '06',
      'jul': '07', 'july': '07',
      'aug': '08', 'august': '08',
      'sep': '09', 'september': '09',
      'oct': '10', 'october': '10',
      'nov': '11', 'november': '11',
      'dec': '12', 'december': '12'
    };
    
    // Try parsing "1-Jan" or "1-Jan-2026" format
    const match = dateStr.match(/^(\d{1,2})-([a-zA-Z]+)(?:-(\d{4}))?$/);
    if (match) {
      const day = String(parseInt(match[1])).padStart(2, '0');
      const monthStr = match[2].toLowerCase();
      const month = monthNames[monthStr];
      const year = match[3] || new Date().getFullYear().toString();
      
      if (month) {
        return `${year}-${month}-${day}`;
      }
    }
    
    // Try parsing "DD/MM/YYYY" format
    const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const day = String(parseInt(slashMatch[1])).padStart(2, '0');
      const month = String(parseInt(slashMatch[2])).padStart(2, '0');
      const year = slashMatch[3];
      return `${year}-${month}-${day}`;
    }
    
    // Try parsing "DD-MM-YYYY" format
    const dashMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dashMatch) {
      const day = String(parseInt(dashMatch[1])).padStart(2, '0');
      const month = String(parseInt(dashMatch[2])).padStart(2, '0');
      const year = dashMatch[3];
      return `${year}-${month}-${day}`;
    }
    
    // Try parsing with JavaScript Date object as fallback
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch {
      // Fallback failed
    }
    
    // Return original if parsing fails
    return dateStr;
  };

  const handleImportExcel = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        setImportLoading(true);
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (jsonData.length === 0) {
          showAlert('File Excel kosong atau tidak ada data yang bisa diimport.', 'Error');
          return;
        }

        // Helper to map columns (case-insensitive)
        const mapColumn = (row: any, possibleNames: string[]): string => {
          const normalizeKey = (key: string) => key.trim().toLowerCase().replace(/\s+/g, ' ');
          for (const name of possibleNames) {
            const normalizedName = normalizeKey(name);
            const keys = Object.keys(row);
            const found = keys.find(k => normalizeKey(k) === normalizedName);
            if (found) {
              const value = String(row[found] || '').trim();
              if (value) return value;
            }
          }
          return '';
        };

        const expensesArray = Array.isArray(expenses) ? expenses : [];
        const newExpenses: OperationalExpense[] = [];
        let importCount = 0;

        jsonData.forEach((row, index) => {
          try {
            let expenseDate = mapColumn(row, ['Date', 'DATE', 'Tanggal', 'TANGGAL', 'Expense Date', 'expense date']);
            // Parse date to YYYY-MM-DD format
            expenseDate = parseDateString(expenseDate);
            
            const type = mapColumn(row, ['Type', 'TYPE', 'Tipe', 'TIPE']);
            const category = mapColumn(row, ['Category', 'CATEGORY', 'Kategori', 'KATEGORI']);
            const description = mapColumn(row, ['Description', 'DESCRIPTION', 'Deskripsi', 'DESKRIPSI']);
            const amountStr = mapColumn(row, ['Amount', 'AMOUNT', 'Jumlah', 'JUMLAH']);
            const paymentMethod = mapColumn(row, ['Payment Method', 'PAYMENT METHOD', 'Metode Pembayaran', 'metode pembayaran']);
            const approvedBy = mapColumn(row, ['Approved By', 'APPROVED BY', 'Disetujui Oleh', 'disetujui oleh']);
            const requestor = mapColumn(row, ['Requestor', 'REQUESTOR', 'Peminta', 'PEMINTA']);
            const notes = mapColumn(row, ['Notes', 'NOTES', 'Catatan', 'CATATAN']);

            // Skip empty rows
            if (!expenseDate || !description) return;

            // Parse amount
            const amount = parseFloat(amountStr.replace(/[^\d.,]/g, '').replace(/\./g, '')) || 0;

            // Validate type
            const validType = (type.toLowerCase().includes('petty') || type.toLowerCase().includes('pc')) ? 'PettyCash' : 'General';
            
            // Validate category
            const validCategories = ['Electricity', 'Water', 'Gas', 'Salary', 'Logistics', 'Other'];
            const validCategory = validCategories.find(c => c.toLowerCase() === category.toLowerCase()) || 'Other';

            // Validate payment method
            const validMethods = ['Cash', 'Bank Transfer', 'Check', 'Credit Card'];
            const validPaymentMethod = validMethods.find(m => m.toLowerCase() === paymentMethod.toLowerCase()) || 'Bank Transfer';

            const newExpense: OperationalExpense = {
              id: Date.now().toString() + Math.random().toString(36).substring(2, 8),
              no: expensesArray.length + newExpenses.length + 1,
              expenseNo: `${validType === 'General' ? 'GEN' : 'PC'}-${new Date(expenseDate).getFullYear()}${String(new Date(expenseDate).getMonth() + 1).padStart(2, '0')}-${String(expensesArray.length + newExpenses.length + 1).padStart(4, '0')}`,
              expenseDate: expenseDate,
              type: validType as 'General' | 'PettyCash',
              category: validCategory as any,
              description: description,
              amount: amount,
              paymentMethod: validPaymentMethod as any,
              approvedBy: approvedBy || undefined,
              requestor: requestor || undefined,
              notes: notes || undefined,
              created: new Date().toISOString(),
              lastUpdate: new Date().toISOString(),
              timestamp: Date.now(),
              _timestamp: Date.now(),
            };

            newExpenses.push(newExpense);
            importCount++;
          } catch (err) {
            console.error(`Error processing row ${index}:`, err);
          }
        });

        if (importCount === 0) {
          showAlert('Tidak ada data yang valid untuk diimport.', 'Warning');
          return;
        }

        const updated = [...expensesArray, ...newExpenses];
        await storageService.set(StorageKeys.PACKAGING.OPERATIONAL_EXPENSES, updated);
        setExpenses(updated);
        showAlert(`✅ Berhasil import ${importCount} expense(s) dari ${file.name}`, 'Success');
      } catch (error: any) {
        showAlert(`Error importing Excel: ${error.message}`, 'Error');
      } finally {
        setImportLoading(false);
      }
    };
    input.click();
  };

  const columns = [
    {
      key: 'no',
      header: '#',
      render: (item: OperationalExpense) => <div style={{ minWidth: '25px', textAlign: 'center', fontSize: '11px' }}>{item.no}</div>
    },
    {
      key: 'expenseNo',
      header: 'Expense No',
      render: (item: OperationalExpense) => <div style={{ minWidth: '100px', fontSize: '11px', fontWeight: '600' }}>{item.expenseNo}</div>
    },
    {
      key: 'expenseDate',
      header: 'Date',
      render: (item: OperationalExpense) => <div style={{ minWidth: '80px', fontSize: '11px' }}>{item.expenseDate}</div>
    },
    {
      key: 'type',
      header: 'Type',
      render: (item: OperationalExpense) => (
        <div style={{ minWidth: '80px', fontSize: '11px', fontWeight: '600', color: item.type === 'General' ? '#2196F3' : '#FF9800' }}>
          {item.type === 'General' ? '💡 General' : '💵 Petty Cash'}
        </div>
      )
    },
    {
      key: 'category',
      header: 'Category',
      render: (item: OperationalExpense) => <div style={{ minWidth: '90px', fontSize: '11px', fontWeight: '500' }}>{item.category}</div>
    },
    {
      key: 'description',
      header: 'Description',
      render: (item: OperationalExpense) => (
        <div style={{ minWidth: '150px', fontSize: '11px' }} title={item.description}>
          {item.description.length > 25 ? item.description.substring(0, 25) + '...' : item.description}
        </div>
      )
    },
    ...(typeFilter === 'PettyCash' ? [{
      key: 'requestor',
      header: 'Requestor',
      render: (item: OperationalExpense) => <div style={{ minWidth: '100px', fontSize: '11px' }}>{item.requestor || '-'}</div>
    }] : []),
    {
      key: 'amount',
      header: 'Amount',
      render: (item: OperationalExpense) => <div style={{ minWidth: '100px', fontSize: '11px', textAlign: 'right', fontWeight: '600' }}>Rp {(item.amount || 0).toLocaleString('id-ID')}</div>
    },
    {
      key: 'paymentMethod',
      header: 'Method',
      render: (item: OperationalExpense) => <div style={{ minWidth: '80px', fontSize: '11px' }}>{item.paymentMethod}</div>
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: OperationalExpense) => (
        <div style={{ display: 'flex', gap: '4px', minWidth: '90px' }}>
          <Button
            onClick={() => {
              setEditingExpense(item);
              setAmountInputValue('');
              setFormData(item);
              setShowForm(true);
            }}
            variant="secondary"
            style={{ fontSize: '10px', padding: '3px 6px', minWidth: 'auto' }}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (window.confirm('Delete this expense?')) {
                try {
                  const expensesArray = Array.isArray(expenses) ? expenses : [];
                  const updated = expensesArray.filter(e => e.id !== item.id);
                  await storageService.set(StorageKeys.PACKAGING.OPERATIONAL_EXPENSES, updated);
                  await logDelete('OperationalExpense', item.id, '/packaging/finance/operational-expenses', {
                    expenseNo: item.expenseNo,
                    amount: item.amount,
                    type: item.type,
                  });
                  setExpenses(updated);
                  showAlert('Expense deleted successfully', 'Success');
                } catch (error: any) {
                  showAlert(`Error deleting expense: ${error.message}`, 'Error');
                }
              }
            }}
            style={{ fontSize: '10px', padding: '3px 6px', minWidth: 'auto' }}
          >
            Del
          </Button>
        </div>
      )
    },
  ];

  return (
    <div className="module-compact">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Operational Expenses</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Button
              variant={typeFilter === 'all' ? 'primary' : 'secondary'}
              onClick={() => setTypeFilter('all')}
              style={{ fontSize: '12px', padding: '8px 16px' }}
            >
              All ({expenses.length})
            </Button>
            <Button
              variant={typeFilter === 'General' ? 'primary' : 'secondary'}
              onClick={() => setTypeFilter('General')}
              style={{ fontSize: '12px', padding: '8px 16px' }}
            >
              💡 General ({expenses.filter(e => e.type === 'General').length})
            </Button>
            <Button
              variant={typeFilter === 'PettyCash' ? 'primary' : 'secondary'}
              onClick={() => setTypeFilter('PettyCash')}
              style={{ fontSize: '12px', padding: '8px 16px' }}
            >
              💵 Petty Cash ({expenses.filter(e => e.type === 'PettyCash').length})
            </Button>
          </div>
        </div>

        {/* Category Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {Object.entries(categoryStats).map(([category, stats]) => (
            <div key={category} style={{ padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{category}</div>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>Rp {stats.total.toLocaleString('id-ID')}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{stats.count} transaction(s)</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '10px', position: 'sticky', top: 0, backgroundColor: 'var(--bg-primary)', zIndex: 5, padding: '12px 0' }}>
          <Input
            type="text"
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(value) => setSearchQuery(value)}
          />
          <DateRangeFilter
            onDateChange={(from, to) => {
              setDateFrom(from);
              setDateTo(to);
            }}
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
          >
            <option value="all">All Categories</option>
            <option value="Electricity">💡 Electricity</option>
            <option value="Water">💧 Water</option>
            <option value="Gas">🔥 Gas</option>
            <option value="Salary">💰 Salary</option>
            <option value="Logistics">🚚 Logistics</option>
            <option value="Other">📌 Other</option>
          </select>
          <Button variant="secondary" onClick={loadData} disabled={loading}>
            {loading ? '⏳ Loading...' : '🔄 Refresh'}
          </Button>
          <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
          <Button variant="secondary" onClick={handleImportExcel} disabled={importLoading}>
            {importLoading ? '⏳ Importing...' : '📤 Import Excel'}
          </Button>
          <Button
            onClick={() => {
              setShowForm(true);
              setEditingExpense(null);
              setAmountInputValue('');
              setFormData({
                expenseDate: new Date().toISOString().split('T')[0],
                type: 'General',
                category: 'Other',
                amount: 0,
                paymentMethod: 'Bank Transfer',
                requestor: '',
              });
            }}
          >
            + New Expense
          </Button>
        </div>

        {/* Summary */}
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>Total Expenses:</strong> Rp {totalExpenses.toLocaleString('id-ID')}
            </div>
            <div>
              <strong>Count:</strong> {filteredExpenses.length}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div>⏳ Loading data...</div>
          </div>
        ) : (
          <Table
            columns={columns}
            data={filteredExpenses}
            pageSize={10}
            showPagination={true}
            emptyMessage="No expenses found"
          />
        )}
      </Card>

      {/* Form Dialog */}
      {showForm && (
        <div className="dialog-overlay" onClick={() => setShowForm(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <Card className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>{editingExpense ? 'Edit Expense' : 'New Expense'}</h2>
                <Button variant="secondary" onClick={() => setShowForm(false)} style={{ padding: '6px 12px' }}>✕</Button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <Input
                  label="Expense Date"
                  type="date"
                  value={formData.expenseDate || ''}
                  onChange={(value) => setFormData({ ...formData, expenseDate: value })}
                />

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Type *</label>
                  <select
                    value={formData.type || 'General'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="General">💡 General Payment</option>
                    <option value="PettyCash">💵 Petty Cash</option>
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Category *</label>
                  <select
                    value={formData.category || 'Other'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="Electricity">💡 Electricity</option>
                    <option value="Water">💧 Water</option>
                    <option value="Gas">🔥 Gas</option>
                    <option value="Salary">💰 Salary</option>
                    <option value="Logistics">🚚 Logistics</option>
                    <option value="Other">📌 Other</option>
                  </select>
                </div>

                <Input
                  label="Description *"
                  type="text"
                  placeholder="e.g., Monthly electricity bill, Staff lunch, etc."
                  value={formData.description || ''}
                  onChange={(value) => setFormData({ ...formData, description: value })}
                />

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Amount *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amountInputValue !== undefined && amountInputValue !== '' ? amountInputValue : (formData.amount !== undefined && formData.amount !== null && formData.amount !== 0 ? String(formData.amount) : '')}
                    onChange={(e) => {
                      let val = e.target.value;
                      val = val.replace(/[^\d.,]/g, '');
                      const cleaned = removeLeadingZero(val);
                      setAmountInputValue(cleaned);
                      const amount = cleaned === '' ? 0 : Number(cleaned) || 0;
                      setFormData({ ...formData, amount: amount });
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
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Payment Method</label>
                  <select
                    value={formData.paymentMethod || 'Bank Transfer'}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="Cash">💵 Cash</option>
                    <option value="Bank Transfer">🏦 Bank Transfer</option>
                    <option value="Check">📋 Check</option>
                    <option value="Credit Card">💳 Credit Card</option>
                  </select>
                </div>

                <Input
                  label="Approved By"
                  type="text"
                  placeholder="e.g., Manager name"
                  value={formData.approvedBy || ''}
                  onChange={(value) => setFormData({ ...formData, approvedBy: value })}
                />

                {formData.type === 'PettyCash' && (
                  <Input
                    label="Requestor"
                    type="text"
                    placeholder="e.g., Employee name"
                    value={formData.requestor || ''}
                    onChange={(value) => setFormData({ ...formData, requestor: value })}
                  />
                )}

                <Input
                  label="Notes"
                  type="text"
                  placeholder="Additional notes..."
                  value={formData.notes || ''}
                  onChange={(value) => setFormData({ ...formData, notes: value })}
                />

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button variant="primary" onClick={handleSave}>💾 Save Expense</Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationalExpenses;
