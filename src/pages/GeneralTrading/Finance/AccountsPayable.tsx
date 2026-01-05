import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { storageService } from '../../../services/storage';
import { loadGTDataFromLocalStorage } from '../../../utils/gtStorageHelper';
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

const AccountsPayable = () => {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
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
      // Load langsung dari localStorage untuk memastikan data terbaru
      const [entries, pos, supp] = await Promise.all([
        loadGTDataFromLocalStorage<JournalEntry>(
          'gt_journalEntries',
          async () => await storageService.get<JournalEntry[]>('gt_journalEntries') || []
        ),
        loadGTDataFromLocalStorage<any>(
          'gt_purchaseOrders',
          async () => await storageService.get<any[]>('gt_purchaseOrders') || []
        ),
        loadGTDataFromLocalStorage<any>(
          'gt_suppliers',
          async () => await storageService.get<any[]>('gt_suppliers') || []
        ),
      ]);
      
      console.log(`📦 Loaded data:`, {
        journalEntries: entries?.length || 0,
        purchaseOrders: pos?.length || 0,
        suppliers: supp?.length || 0,
      });
      
      setJournalEntries(entries || []);
      setPurchaseOrders(pos || []);
      setSuppliers(supp || []);
    } catch (error: any) {
      console.error('❌ Error loading data:', error);
      showAlert(`Error loading data: ${error.message}`, 'Error');
    } finally {
      setLoading(false);
    }
  };

  const calculateAging = (orderDate: string, paymentTerms: string, topDays?: number) => {
    const today = new Date();
    const order = new Date(orderDate);
    
    // Parse payment terms (e.g., "TOP" = use topDays, "NET30" = 30 days)
    let days = 30;
    if (topDays) {
      days = topDays;
    } else if (paymentTerms) {
      const match = paymentTerms.match(/\d+/);
      if (match) days = parseInt(match[0]);
    }
    
    const dueDate = new Date(order);
    dueDate.setDate(dueDate.getDate() + days);
    
    const diffTime = today.getTime() - dueDate.getTime();
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

  const apData = useMemo(() => {
    // Ambil semua journal entries untuk account 2000 (Accounts Payable)
    // Ensure journalEntries is always an array
    const journalEntriesArray = Array.isArray(journalEntries) ? journalEntries : [];
    const apEntries = journalEntriesArray.filter((entry: JournalEntry) => entry.account === '2000');
    
    console.log(`📋 Total AP journal entries: ${apEntries.length}`);
    
    // Group by reference (PO No)
    const apByReference: Record<string, {
      reference: string;
      totalCredit: number;
      totalDebit: number;
      balance: number;
      firstEntryDate: string;
      lastEntryDate: string;
      descriptions: string[];
    }> = {};
    
    apEntries.forEach((entry: JournalEntry) => {
      const ref = entry.reference || entry.id;
      if (!apByReference[ref]) {
        apByReference[ref] = {
          reference: ref,
          totalCredit: 0,
          totalDebit: 0,
          balance: 0,
          firstEntryDate: entry.entryDate,
          lastEntryDate: entry.entryDate,
          descriptions: [],
        };
      }
      
      apByReference[ref].totalCredit += entry.credit || 0;
      apByReference[ref].totalDebit += entry.debit || 0;
      apByReference[ref].balance = apByReference[ref].totalCredit - apByReference[ref].totalDebit;
      
      // Update dates
      if (entry.entryDate < apByReference[ref].firstEntryDate) {
        apByReference[ref].firstEntryDate = entry.entryDate;
      }
      if (entry.entryDate > apByReference[ref].lastEntryDate) {
        apByReference[ref].lastEntryDate = entry.entryDate;
      }
      
      if (entry.description && !apByReference[ref].descriptions.includes(entry.description)) {
        apByReference[ref].descriptions.push(entry.description);
      }
    });
    
    console.log(`📋 Total AP references: ${Object.keys(apByReference).length}`);
    
    // Map ke format AP dengan data dari PO untuk supplier info
    const result = Object.values(apByReference)
      .filter(item => item.balance > 0) // Hanya yang masih ada balance
      .map(item => {
        // Cari PO berdasarkan reference (bisa PO-xxx atau payment number)
        // Ensure purchaseOrders is always an array
        const purchaseOrdersArray = Array.isArray(purchaseOrders) ? purchaseOrders : [];
        const po = purchaseOrdersArray.find((p: any) => 
          p.poNo === item.reference || 
          item.reference.includes(p.poNo) ||
          item.reference.startsWith('PO-')
        );
        
        // Extract supplier dari description atau PO
        let supplierName = '';
        let supplierCode = '';
        let soNo = '';
        let paymentTerms = 'TOP';
        let topDays = 30;
        
        if (po) {
          supplierName = po.supplier || '';
          soNo = po.soNo || '';
          paymentTerms = po.paymentTerms || 'TOP';
          topDays = po.topDays || 30;
        } else {
          // Extract dari description
          const desc = item.descriptions[0] || '';
          const supplierMatch = desc.match(/- (.+?)$/);
          if (supplierMatch) {
            supplierName = supplierMatch[1];
          }
        }
        
        // Cari supplier dari master data
        // Ensure suppliers is always an array
        const suppliersArray = Array.isArray(suppliers) ? suppliers : [];
        const supplier = suppliersArray.find((s: any) => 
          s.kode === supplierName || 
          s.nama === supplierName ||
          supplierName.includes(s.nama) ||
          supplierName.includes(s.kode)
        );
        
        if (supplier) {
          supplierCode = supplier.kode || '';
          if (!supplierName) supplierName = supplier.nama || '';
        }
        
        const poDate = item.firstEntryDate;
        const agingDays = calculateAging(poDate, paymentTerms, topDays);
        const agingCategory = getAgingCategory(agingDays);
        
        const result = {
          poNo: item.reference,
          poDate: poDate,
          supplierName: supplierName,
          supplierCode: supplierCode,
          soNo: soNo,
          total: item.totalCredit, // Total AP = total credit
          paidAmount: item.totalDebit, // Payment = total debit
          balance: item.balance,
          paymentTerms: paymentTerms,
          topDays: topDays,
          agingDays: agingDays,
          agingCategory: agingCategory,
          isOverdue: agingDays > 0 && item.balance > 0,
          status: item.balance > 0 ? 'OPEN' : 'CLOSE',
          description: item.descriptions.join('; '),
        };
        
        console.log(`📊 AP ${item.reference}: Credit=${item.totalCredit}, Debit=${item.totalDebit}, Balance=${item.balance}`);
        
        return result;
      })
      .filter(item => item.balance > 0); // Hanya tampilkan yang masih ada balance
    
    // Ensure return value is always an array
    return Array.isArray(result) ? result : [];
  }, [journalEntries, purchaseOrders, suppliers]);

  const filteredAP = useMemo(() => {
    // Ensure apData is always an array
    const apDataArray = Array.isArray(apData) ? apData : [];
    return apDataArray.filter(item => {
      const matchesSearch = !searchQuery ||
        (item.poNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.supplierName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.soNo || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'overdue' && item.isOverdue) ||
        (statusFilter === 'current' && !item.isOverdue);
      
      const matchesAging = agingFilter === 'all' || item.agingCategory === agingFilter;
      
      return matchesSearch && matchesStatus && matchesAging;
    });
  }, [apData, searchQuery, statusFilter, agingFilter]);

  const totalAP = useMemo(() => {
    // Ensure filteredAP is always an array
    const filteredAPArray = Array.isArray(filteredAP) ? filteredAP : [];
    return filteredAPArray.reduce((sum, item) => sum + (item.balance || 0), 0);
  }, [filteredAP]);

  const agingSummary = useMemo(() => {
    const summary: Record<string, number> = {
      'Not Due': 0,
      '0-30 Days': 0,
      '31-60 Days': 0,
      '61-90 Days': 0,
      'Over 90 Days': 0,
    };
    
    // Ensure filteredAP is always an array
    const filteredAPArray = Array.isArray(filteredAP) ? filteredAP : [];
    filteredAPArray.forEach(item => {
      summary[item.agingCategory] = (summary[item.agingCategory] || 0) + (item.balance || 0);
    });
    
    return summary;
  }, [filteredAP]);

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const dataToExport = filteredAP.map(item => ({
        'PO No': item.poNo || '',
        'PO Date': item.poDate || '',
        'Supplier': item.supplierName || '',
        'SO No': item.soNo || '',
        'PO Amount': item.total || 0,
        'Paid': item.paidAmount || 0,
        'Balance': item.balance || 0,
        'Payment Terms': item.paymentTerms || '',
        'Aging Days': item.agingDays || 0,
        'Aging Category': item.agingCategory || '',
        'Status': item.status || '',
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Accounts Payable');
      
      const fileName = `Accounts_Payable_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Exported ${dataToExport.length} AP records to ${fileName}`, 'Success');
    } catch (error: any) {
      showAlert(`Error exporting to Excel: ${error.message}`, 'Error');
    }
  };

  const columns = [
    { key: 'poNo', header: 'PO No' },
    { key: 'poDate', header: 'PO Date' },
    { key: 'supplierName', header: 'Supplier' },
    { key: 'soNo', header: 'SO No' },
    { key: 'total', header: 'PO Amount', render: (item: any) => `Rp ${(item.total || 0).toLocaleString('id-ID')}` },
    { key: 'paidAmount', header: 'Paid', render: (item: any) => `Rp ${(item.paidAmount || 0).toLocaleString('id-ID')}` },
    { key: 'balance', header: 'Balance', render: (item: any) => `Rp ${(item.balance || 0).toLocaleString('id-ID')}` },
    { key: 'paymentTerms', header: 'Payment Terms' },
    { key: 'agingDays', header: 'Aging Days', render: (item: any) => item.agingDays > 0 ? `${item.agingDays} days overdue` : `${Math.abs(item.agingDays)} days` },
    { key: 'agingCategory', header: 'Aging Category' },
    { key: 'status', header: 'Status' },
  ];

  return (
    <div className="module-compact">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Accounts Payable</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Input
              type="text"
              placeholder="Search POs..."
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
              <strong>Total AP:</strong> Rp {totalAP.toLocaleString('id-ID')}
            </div>
            <div>
              <strong>Total POs:</strong> {filteredAP.length}
            </div>
            <div>
              <strong>Overdue:</strong> {(Array.isArray(filteredAP) ? filteredAP : []).filter(item => item.isOverdue).length}
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
          <Table columns={columns} data={filteredAP} />
        )}
      </Card>
    </div>
  );
};

export default AccountsPayable;

