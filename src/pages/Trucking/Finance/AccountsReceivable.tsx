import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { storageService } from '../../../services/storage';
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

const AccountsReceivable = () => {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [agingFilter, setAgingFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);

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


  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [entries, invs, cust] = await Promise.all([
        storageService.get<JournalEntry[]>('trucking_journalEntries') || [],
        storageService.get<any[]>('trucking_invoices') || [],
        storageService.get<any[]>('trucking_customers') || [],
      ]);
      
      // Filter out deleted items (tombstone pattern)
      const activeEntries = (entries || []).filter((e: any) => {
        return !(e?.deleted === true || e?.deleted === 'true' || e?.deletedAt);
      });
      const activeInvoices = (invs || []).filter((i: any) => {
        return !(i?.deleted === true || i?.deleted === 'true' || i?.deletedAt);
      });
      const activeCustomers = (cust || []).filter((c: any) => {
        return !(c?.deleted === true || c?.deleted === 'true' || c?.deletedAt);
      });
      
      console.log(`📦 Loaded data:`, {
        journalEntries: activeEntries?.length || 0,
        invoices: activeInvoices?.length || 0,
        customers: activeCustomers?.length || 0,
      });
      
      setJournalEntries(activeEntries);
      setInvoices(activeInvoices);
      setCustomers(activeCustomers);
    } catch (error: any) {
      console.error('❌ Error loading data:', error);
      showAlert(`Error loading data: ${error.message}`, 'Error');
    } finally {
      setLoading(false);
    }
  };

  const calculateAging = (dueDate: string, invoiceDate: string) => {
    const today = new Date();
    const due = dueDate ? new Date(dueDate) : new Date(invoiceDate);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getAgingCategory = (days: number) => {
    if (days < 0) return 'Not Due';
    if (days <= 30) return '0-30 Days';
    if (days <= 60) return '31-60 Days';
    if (days <= 90) return '61-90 Days';
    return 'Over 90 Days';
  };

  const arData = useMemo(() => {
    // Ambil semua journal entries untuk account 1100 (Accounts Receivable)
    // Ensure journalEntries is always an array
    const journalEntriesArray = Array.isArray(journalEntries) ? journalEntries : [];
    const arEntries = journalEntriesArray.filter((entry: JournalEntry) => entry.account === '1100');
    
    console.log(`📋 Total AR journal entries: ${arEntries.length}`);
    
    // Group by reference (Invoice No)
    const arByReference: Record<string, {
      reference: string;
      totalDebit: number;
      totalCredit: number;
      balance: number;
      firstEntryDate: string;
      lastEntryDate: string;
      descriptions: string[];
    }> = {};
    
    arEntries.forEach((entry: JournalEntry) => {
      const ref = entry.reference || entry.id;
      if (!arByReference[ref]) {
        arByReference[ref] = {
          reference: ref,
          totalDebit: 0,
          totalCredit: 0,
          balance: 0,
          firstEntryDate: entry.entryDate,
          lastEntryDate: entry.entryDate,
          descriptions: [],
        };
      }
      
      arByReference[ref].totalDebit += entry.debit || 0;
      arByReference[ref].totalCredit += entry.credit || 0;
      // Untuk Asset (AR), balance = debit - credit
      arByReference[ref].balance = arByReference[ref].totalDebit - arByReference[ref].totalCredit;
      
      // Update dates
      if (entry.entryDate < arByReference[ref].firstEntryDate) {
        arByReference[ref].firstEntryDate = entry.entryDate;
      }
      if (entry.entryDate > arByReference[ref].lastEntryDate) {
        arByReference[ref].lastEntryDate = entry.entryDate;
      }
      
      if (entry.description && !arByReference[ref].descriptions.includes(entry.description)) {
        arByReference[ref].descriptions.push(entry.description);
      }
    });
    
    console.log(`📋 Total AR references: ${Object.keys(arByReference).length}`);
    
    // Map ke format AR dengan data dari invoices untuk customer info
    const result = Object.values(arByReference)
      .filter(item => item.balance > 0) // Hanya yang masih ada balance
      .map(item => {
        // Cari invoice berdasarkan reference (bisa INV-xxx atau invoice number)
        // Ensure invoices is always an array
        const invoicesArray = Array.isArray(invoices) ? invoices : [];
        const invoice = invoicesArray.find((inv: any) => 
          inv.invoiceNo === item.reference || 
          item.reference.includes(inv.invoiceNo) ||
          item.reference.startsWith('INV-')
        );
        
        // Extract customer dari description atau invoice
        let customerName = '';
        let customerCode = '';
        let soNo = '';
        let invoiceDate = item.firstEntryDate;
        let topDays = 30;
        let invoiceTotal = item.totalDebit; // Total AR = total debit
        
        if (invoice) {
          customerName = invoice.customer || '';
          soNo = invoice.soNo || '';
          invoiceDate = invoice.invoiceDate || invoice.created || item.firstEntryDate;
          topDays = invoice.topDays || 30;
          invoiceTotal = invoice.bom?.total || invoice.total || item.totalDebit;
        } else {
          // Extract dari description
          const desc = item.descriptions[0] || '';
          const customerMatch = desc.match(/- (.+?)$/);
          if (customerMatch) {
            customerName = customerMatch[1];
          }
        }
        
        // Cari customer dari master data
        // Ensure customers is always an array
        const customersArray = Array.isArray(customers) ? customers : [];
        const customer = customersArray.find((c: any) => 
          c.kode === customerName || 
          c.nama === customerName ||
          customerName.includes(c.nama) ||
          customerName.includes(c.kode)
        );
        
        if (customer) {
          customerCode = customer.kode || '';
          if (!customerName) customerName = customer.nama || '';
        }
        
        // Calculate due date
        const invDate = new Date(invoiceDate);
        const dueDate = new Date(invDate);
        dueDate.setDate(dueDate.getDate() + topDays);
        
        const agingDays = calculateAging(dueDate.toISOString().split('T')[0], invoiceDate);
        const agingCategory = getAgingCategory(agingDays);
        
        const result = {
          invoiceNo: item.reference,
          invoiceDate: invoiceDate,
          dueDate: dueDate.toISOString().split('T')[0],
          customerName: customerName,
          customerCode: customerCode,
          customerCreditLimit: customer?.creditLimit || 0,
          soNo: soNo,
          invoiceTotal: invoiceTotal,
          paidAmount: item.totalCredit, // Payment = total credit
          balance: item.balance,
          topDays: topDays,
          agingDays: agingDays,
          agingCategory: agingCategory,
          isOverdue: agingDays > 0 && item.balance > 0,
          status: item.balance > 0 ? 'OPEN' : 'CLOSE',
          description: item.descriptions.join('; '),
        };
        
        console.log(`📊 AR ${item.reference}: Debit=${item.totalDebit}, Credit=${item.totalCredit}, Balance=${item.balance}`);
        
        return result;
      })
      .filter(item => item.balance > 0); // Hanya tampilkan yang masih ada balance
    
    // Ensure return value is always an array
    return Array.isArray(result) ? result : [];
  }, [journalEntries, invoices, customers]);

  const filteredAR = useMemo(() => {
    // Ensure arData is always an array
    const arDataArray = Array.isArray(arData) ? arData : [];
    return arDataArray.filter(item => {
      const matchesSearch = !searchQuery ||
        (item.invoiceNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.soNo || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'overdue' && item.isOverdue) ||
        (statusFilter === 'current' && !item.isOverdue);
      
      const matchesAging = agingFilter === 'all' || item.agingCategory === agingFilter;
      
      return matchesSearch && matchesStatus && matchesAging;
    });
  }, [arData, searchQuery, statusFilter, agingFilter]);

  const totalAR = useMemo(() => {
    // Ensure filteredAR is always an array
    const filteredARArray = Array.isArray(filteredAR) ? filteredAR : [];
    return filteredARArray.reduce((sum, item) => sum + (item.balance || 0), 0);
  }, [filteredAR]);

  const agingSummary = useMemo(() => {
    const summary: Record<string, number> = {
      'Not Due': 0,
      '0-30 Days': 0,
      '31-60 Days': 0,
      '61-90 Days': 0,
      'Over 90 Days': 0,
    };
    
    // Ensure filteredAR is always an array
    const filteredARArray = Array.isArray(filteredAR) ? filteredAR : [];
    filteredARArray.forEach(item => {
      summary[item.agingCategory] = (summary[item.agingCategory] || 0) + (item.balance || 0);
    });
    
    return summary;
  }, [filteredAR]);

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const dataToExport = filteredAR.map(item => ({
        'Invoice No': item.invoiceNo || '',
        'Invoice Date': item.invoiceDate || '',
        'Due Date': item.dueDate || '',
        'Customer': item.customerName || '',
        'SO No': item.soNo || '',
        'Invoice Amount': item.invoiceTotal || 0,
        'Paid': item.paidAmount || 0,
        'Balance': item.balance || 0,
        'Aging Days': item.agingDays || 0,
        'Aging Category': item.agingCategory || '',
        'Status': item.isOverdue ? 'Overdue' : 'Current',
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Accounts Receivable');
      
      const fileName = `Accounts_Receivable_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Exported ${dataToExport.length} AR records to ${fileName}`, 'Success');
    } catch (error: any) {
      showAlert(`Error exporting to Excel: ${error.message}`, 'Error');
    }
  };

  const columns = [
    { key: 'invoiceNo', header: 'Invoice No' },
    { key: 'invoiceDate', header: 'Invoice Date' },
    { key: 'dueDate', header: 'Due Date' },
    { key: 'customerName', header: 'Customer' },
    { key: 'soNo', header: 'SO No' },
    { key: 'invoiceTotal', header: 'Invoice Amount', render: (item: any) => {
      const invoiceTotal = item.invoiceTotal || 0;
      return `Rp ${invoiceTotal.toLocaleString('id-ID')}`;
    }},
    { key: 'paidAmount', header: 'Paid', render: (item: any) => `Rp ${(item.paidAmount || 0).toLocaleString('id-ID')}` },
    { key: 'balance', header: 'Balance', render: (item: any) => `Rp ${(item.balance || 0).toLocaleString('id-ID')}` },
    { key: 'agingDays', header: 'Aging Days', render: (item: any) => item.agingDays > 0 ? `${item.agingDays} days overdue` : `${Math.abs(item.agingDays)} days` },
    { key: 'agingCategory', header: 'Aging Category' },
    { key: 'status', header: 'Status', render: (item: any) => item.isOverdue ? 'Overdue' : 'Current' },
  ];

  return (
    <div className="module-compact">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Accounts Receivable</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Input
              type="text"
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(value) => setSearchQuery(value)}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
            >
              <option value="all">All</option>
              <option value="current">Current</option>
              <option value="overdue">Overdue</option>
            </select>
            <select
              value={agingFilter}
              onChange={(e) => setAgingFilter(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
            >
              <option value="all">All Aging</option>
              <option value="Not Due">Not Due</option>
              <option value="0-30 Days">0-30 Days</option>
              <option value="31-60 Days">31-60 Days</option>
              <option value="61-90 Days">61-90 Days</option>
              <option value="Over 90 Days">Over 90 Days</option>
            </select>
            <Button variant="secondary" onClick={loadData} disabled={loading}>
              {loading ? '⏳ Loading...' : '🔄 Refresh'}
            </Button>
            <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
          </div>
        </div>

        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <div>
              <strong>Total AR:</strong> Rp {totalAR.toLocaleString('id-ID')}
            </div>
            <div>
              <strong>Total Invoices:</strong> {filteredAR.length}
            </div>
            <div>
              <strong>Overdue:</strong> {(Array.isArray(filteredAR) ? filteredAR : []).filter(item => item.isOverdue).length}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
            {Object.entries(agingSummary).map(([category, amount]) => (
              <div key={category} style={{ padding: '10px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{category}</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Rp {amount.toLocaleString('id-ID')}</div>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div>⏳ Loading data...</div>
          </div>
        ) : (
          <Table columns={columns} data={filteredAR} />
        )}
      </Card>
    </div>
  );
};

export default AccountsReceivable;

