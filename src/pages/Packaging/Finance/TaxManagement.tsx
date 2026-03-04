import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import DateRangeFilter from '../../../components/DateRangeFilter';
import { storageService, extractStorageValue, StorageKeys } from '../../../services/storage';
import { logCreate, logUpdate, logDelete } from '../../../utils/activity-logger';
import { useLanguage } from '../../../hooks/useLanguage';
import '../../../styles/common.css';
import '../../../styles/compact.css';

interface TaxRecord {
  id: string;
  taxDate: string;
  reference: string;
  referenceType: 'Invoice' | 'Payment';
  taxType: 'PPN Keluaran' | 'PPN Masukan';
  baseAmount: number;
  taxPercent: number;
  taxAmount: number;
  totalAmount: number;
  customer?: string;
  supplier?: string;
  description: string;
  status: 'Open' | 'Paid';
  paidDate?: string;
  paidAmount?: number;
  paymentProof?: string;
  proofFileName?: string;
  created: string;
}

const TaxManagement = () => {
  const { t } = useLanguage();
  const [taxRecords, setTaxRecords] = useState<TaxRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'open' | 'paid'>('open');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TaxRecord | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);

  // Custom Dialog state
  const [, setDialogState] = useState<{
    show: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
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
      const [invsRaw, paymentsRaw, taxRecordsRaw] = await Promise.all([
        storageService.get<any[]>('invoices'),
        storageService.get<any[]>('payments'),
        storageService.get<any[]>('taxRecords'),
      ]);

      const invs = extractStorageValue(invsRaw);
      const pmts = extractStorageValue(paymentsRaw);
      const existingTaxRecords = extractStorageValue(taxRecordsRaw);

      // Generate tax records from invoices and payments
      const records: TaxRecord[] = [];

      // From Invoices (PPN Keluaran)
      (Array.isArray(invs) ? invs : []).forEach((inv: any) => {
        const taxAmount = inv.bom?.tax || inv.tax || 0;
        if (taxAmount > 0) {
          const baseAmount = inv.bom?.subtotal || (inv.bom?.total || inv.total || 0) - taxAmount;
          records.push({
            id: `tax-inv-${inv.id || inv.invoiceNo}`,
            taxDate: inv.invoiceDate || inv.created || new Date().toISOString().split('T')[0],
            reference: inv.invoiceNo || inv.id,
            referenceType: 'Invoice',
            taxType: 'PPN Keluaran',
            baseAmount: baseAmount,
            taxPercent: inv.bom?.taxPercent || inv.taxPercent || 11,
            taxAmount: taxAmount,
            totalAmount: inv.bom?.total || inv.total || 0,
            customer: inv.customer,
            description: `PPN Keluaran - Invoice ${inv.invoiceNo || inv.id}`,
            status: inv.status === 'CLOSE' ? 'Paid' : 'Open',
            paidDate: inv.status === 'CLOSE' ? inv.paidDate : undefined,
            created: inv.created || new Date().toISOString(),
          });
        }
      });

      // From Payments (PPN Masukan)
      (Array.isArray(pmts) ? pmts : []).forEach((pmt: any) => {
        if (pmt.type === 'Payment') {
          const taxAmount = pmt.tax || 0;
          if (taxAmount > 0) {
            const baseAmount = (pmt.amount || 0) - taxAmount;
            // Check if this record already exists and has been marked as Paid
            const existingRecord = (Array.isArray(existingTaxRecords) ? existingTaxRecords : []).find(
              r => r.id === `tax-pmt-${pmt.id || pmt.paymentNo}`
            );
            records.push({
              id: `tax-pmt-${pmt.id || pmt.paymentNo}`,
              taxDate: pmt.paymentDate || pmt.created || new Date().toISOString().split('T')[0],
              reference: pmt.paymentNo || pmt.id,
              referenceType: 'Payment',
              taxType: 'PPN Masukan',
              baseAmount: baseAmount,
              taxPercent: pmt.taxPercent || 11,
              taxAmount: taxAmount,
              totalAmount: pmt.amount || 0,
              supplier: pmt.supplierName,
              description: `PPN Masukan - Payment ${pmt.paymentNo || pmt.id}`,
              status: existingRecord?.status || 'Open',
              paidDate: existingRecord?.paidDate,
              paidAmount: existingRecord?.paidAmount,
              paymentProof: existingRecord?.paymentProof,
              proofFileName: existingRecord?.proofFileName,
              created: pmt.created || new Date().toISOString(),
            });
          }
        }
      });

      // Merge with existing paid records that might not have corresponding invoices/payments anymore
      const mergedRecords = records.map(r => {
        const existing = (Array.isArray(existingTaxRecords) ? existingTaxRecords : []).find(e => e.id === r.id);
        if (existing && existing.status === 'Paid') {
          return { ...r, ...existing };
        }
        return r;
      });

      // Add any existing paid records that don't have corresponding invoices/payments
      const existingPaidRecords = (Array.isArray(existingTaxRecords) ? existingTaxRecords : []).filter(
        e => e.status === 'Paid' && !mergedRecords.find(r => r.id === e.id)
      );

      const finalRecords = [...mergedRecords, ...existingPaidRecords];

      // Save to storage for AllReportsFinance to read
      await storageService.set(StorageKeys.PACKAGING.TAX_RECORDS, finalRecords);

      setTaxRecords(finalRecords);
    } catch (error: any) {
      showAlert(`Error loading data: ${error.message}`, 'Error');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return (Array.isArray(taxRecords) ? taxRecords : []).filter(record => {
      const matchesSearch = !searchQuery ||
        record.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.supplier?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTab = activeTab === 'open' ? record.status === 'Open' : record.status === 'Paid';
      
      // Date filtering
      const taxDate = new Date(record.taxDate);
      const matchesDateFrom = !dateFrom || taxDate >= new Date(dateFrom);
      const matchesDateTo = !dateTo || taxDate <= new Date(dateTo);

      return matchesSearch && matchesTab && matchesDateFrom && matchesDateTo;
    });
  }, [taxRecords, searchQuery, activeTab, dateFrom, dateTo]);

  const handleRecordPayment = (record: TaxRecord) => {
    setSelectedRecord(record);
    setShowPaymentDialog(true);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaidAmount(record.taxAmount);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedRecord) return;

    try {
      if (!paidAmount || paidAmount <= 0) {
        showAlert('Please enter a paid amount', 'Validation Error');
        return;
      }

      let proofBase64 = '';
      if (paymentProof) {
        proofBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(paymentProof);
        });
      }

      // Update tax record status to Paid
      const updated = taxRecords.map(r =>
        r.id === selectedRecord.id
          ? { 
              ...r, 
              status: 'Paid' as const, 
              paidDate: paymentDate, 
              paidAmount: paidAmount,
              paymentProof: proofBase64,
              proofFileName: paymentProof?.name || '',
            }
          : r
      );

      // Save to storage
      await storageService.set(StorageKeys.PACKAGING.TAX_RECORDS, updated);
      
      // Log the payment
      await logUpdate('TaxRecord', selectedRecord.id, '/packaging/finance/tax-management', {
        reference: selectedRecord.reference,
        taxAmount: selectedRecord.taxAmount,
        paidAmount: paidAmount,
        paymentDate: paymentDate,
        status: 'Paid',
      });

      setTaxRecords(updated);
      showAlert(`✅ Tax payment recorded\nAmount: Rp ${paidAmount.toLocaleString('id-ID')}\nDate: ${paymentDate}${paymentProof ? '\n📄 Proof uploaded' : ''}`, 'Success');

      setShowPaymentDialog(false);
      setSelectedRecord(null);
      setPaidAmount(0);
      setPaymentProof(null);
    } catch (error: any) {
      showAlert(`Error recording payment: ${error.message}`, 'Error');
    }
  };

  const handleExportExcel = () => {
    try {
      const dataToExport = filteredRecords.map(item => ({
        'Tax Date': item.taxDate,
        'Reference': item.reference,
        'Type': item.referenceType,
        'Tax Type': item.taxType,
        'Base Amount': item.baseAmount,
        'Tax %': item.taxPercent,
        'Tax Amount': item.taxAmount,
        'Total Amount': item.totalAmount,
        'Customer/Supplier': item.customer || item.supplier || '',
        'Status': item.status,
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Tax Records');

      const fileName = `Tax_Management_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Exported to ${fileName}`, 'Success');
    } catch (error: any) {
      showAlert(`Error exporting to Excel: ${error.message}`, 'Error');
    }
  };

  const columns = [
    { key: 'taxDate', header: 'Tax Date' },
    { key: 'reference', header: 'Reference' },
    { key: 'referenceType', header: 'Type' },
    { key: 'taxType', header: 'Tax Type' },
    { key: 'baseAmount', header: 'Base Amount', render: (item: TaxRecord) => `Rp ${(item.baseAmount || 0).toLocaleString('id-ID')}` },
    { key: 'taxPercent', header: 'Tax %', render: (item: TaxRecord) => `${item.taxPercent || 0}%` },
    { key: 'taxAmount', header: 'Tax Amount', render: (item: TaxRecord) => `Rp ${(item.taxAmount || 0).toLocaleString('id-ID')}` },
    { key: 'customer', header: 'Customer/Supplier', render: (item: TaxRecord) => item.customer || item.supplier || '-' },
    { key: 'status', header: 'Status' },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: TaxRecord) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          {item.status === 'Open' && (
            <Button
              variant="primary"
              onClick={() => handleRecordPayment(item)}
              style={{ fontSize: '10px', padding: '3px 6px' }}
            >
              💳 Pay Tax
            </Button>
          )}
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
            <Button
              variant={activeTab === 'open' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('open')}
              style={{ fontSize: '12px', padding: '8px 16px' }}
            >
              📋 Open ({(Array.isArray(taxRecords) ? taxRecords : []).filter(r => r.status === 'Open').length})
            </Button>
            <Button
              variant={activeTab === 'paid' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('paid')}
              style={{ fontSize: '12px', padding: '8px 16px' }}
            >
              ✅ Paid ({(Array.isArray(taxRecords) ? taxRecords : []).filter(r => r.status === 'Paid').length})
            </Button>
          </div>
        </div>

        {/* Info Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          <div style={{ padding: '15px', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '1px solid #4caf50' }}>
            <div style={{ fontSize: '12px', color: '#2e7d32', marginBottom: '6px', fontWeight: '600' }}>✅ Tax Paid</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1b5e20' }}>
              Rp {(Array.isArray(taxRecords) ? taxRecords : []).filter(r => r.status === 'Paid').reduce((sum, r) => sum + (r.taxAmount || 0), 0).toLocaleString('id-ID')}
            </div>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#fff3e0', borderRadius: '8px', border: '1px solid #ff9800' }}>
            <div style={{ fontSize: '12px', color: '#e65100', marginBottom: '6px', fontWeight: '600' }}>⏳ Tax Outstanding</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#bf360c' }}>
              Rp {(Array.isArray(taxRecords) ? taxRecords : []).filter(r => r.status === 'Open').reduce((sum, r) => sum + (r.taxAmount || 0), 0).toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '10px', position: 'sticky', top: 0, backgroundColor: 'var(--bg-primary)', zIndex: 5, padding: '12px 0' }}>
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(value) => setSearchQuery(value)}
          />
          <DateRangeFilter
            onDateChange={(from, to) => {
              setDateFrom(from);
              setDateTo(to);
            }}
          />
          <Button variant="secondary" onClick={loadData} disabled={loading}>
            {loading ? '⏳ Loading...' : '🔄 Refresh'}
          </Button>
          <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div>⏳ Loading data...</div>
          </div>
        ) : (
          <Table columns={columns} data={filteredRecords} emptyMessage="No tax records found" pageSize={10} showPagination={true} />
        )}
      </Card>

      {/* Payment Dialog */}
      {showPaymentDialog && selectedRecord && (
        <div className="dialog-overlay" onClick={() => setShowPaymentDialog(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <Card className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Record Tax Payment</h2>
                <Button variant="secondary" onClick={() => setShowPaymentDialog(false)} style={{ padding: '6px 12px' }}>✕</Button>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Reference</label>
                <div style={{ padding: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
                  {selectedRecord.reference}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Tax Type</label>
                <div style={{ padding: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
                  {selectedRecord.taxType}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Tax Amount</label>
                <div style={{ padding: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
                  Rp {selectedRecord.taxAmount.toLocaleString('id-ID')}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Payment Date *</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
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
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Paid Amount *</label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  min="0"
                  max={selectedRecord.taxAmount}
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
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Upload Payment Proof</label>
                <input
                  type="file"
                  onChange={(e) => setPaymentProof(e.target.files?.[0] || null)}
                  accept=".pdf,.jpg,.jpeg,.png"
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
                {paymentProof && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    ✅ {paymentProof.name}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
                <Button variant="primary" onClick={handlePaymentSubmit}>💾 Save Payment</Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxManagement;
