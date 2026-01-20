import { useState, useEffect, useMemo } from 'react';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { storageService } from '../../../services/storage';
import { deleteTruckingItem, reloadTruckingData, filterActiveItems } from '../../../utils/trucking-delete-helper';
import { useDialog } from '../../../hooks/useDialog';
import '../../../styles/common.css';

interface Payment {
  id: string;
  no: number;
  paymentNo: string;
  paymentDate: string;
  billNo: string;
  customerCode: string;
  customerName: string;
  amount: number;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Check' | 'Credit Card';
  reference?: string;
  notes?: string;
}

const Payments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  // Custom Dialog - menggunakan hook terpusat
  const { showAlert: showAlertBase, showConfirm: showConfirmBase, DialogComponent } = useDialog();
  
  // Wrapper untuk kompatibilitas dengan urutan parameter yang berbeda
  const showAlert = (message: string, title: string = 'Information') => {
    showAlertBase(message, title);
  };
  
  const showConfirm = (message: string, onConfirm: () => void, onCancel?: () => void, title: string = 'Confirmation') => {
    showConfirmBase(message, onConfirm, onCancel, title);
  };

  const [editingItem, setEditingItem] = useState<Payment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<Partial<Payment>>({
    paymentNo: '',
    paymentDate: new Date().toISOString().split('T')[0],
    billNo: '',
    customerCode: '',
    customerName: '',
    amount: 0,
    paymentMethod: 'Bank Transfer',
    reference: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [paymentsData, billsData] = await Promise.all([
      storageService.get<Payment[]>('trucking_payments') || [],
      storageService.get<any[]>('trucking_bills') || [],
    ]);
    
    // Filter out deleted items menggunakan helper function
    const activePayments = filterActiveItems(paymentsData || []);
    const activeBills = filterActiveItems(billsData || []);
    
    setPayments(activePayments.map((p, idx) => ({ ...p, no: idx + 1 })));
    setBills(activeBills.filter(b => b.status === 'Sent' || b.status === 'Overdue'));
  };

  const generatePaymentNo = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `PAY-${year}${month}${day}-${random}`;
  };

  const handleLoadFromBill = (billNo: string) => {
    const bill = bills.find(b => b.billNo === billNo);
    if (bill) {
      setFormData({
        ...formData,
        billNo: bill.billNo,
        customerCode: bill.customerCode,
        customerName: bill.customerName,
        amount: bill.total,
      });
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.billNo || !formData.amount || formData.amount <= 0) {
        showAlert('Bill No dan Amount harus diisi', 'Information');
        return;
      }

      if (editingItem) {
        // Load semua data dari storage untuk update
        const allPayments = await storageService.get<Payment[]>('trucking_payments') || [];
        const updated = allPayments.map(p =>
          p.id === editingItem.id
            ? { ...formData, id: editingItem.id, no: editingItem.no } as Payment
            : p
        );
        await storageService.set('trucking_payments', updated);
        // Reload data dengan filter active items menggunakan helper function
        await loadData();
      } else {
        const newPayment: Payment = {
          id: Date.now().toString(),
          no: payments.length + 1,
          paymentNo: formData.paymentNo || generatePaymentNo(),
          ...formData,
        } as Payment;
        const updated = [...payments, newPayment];
        await storageService.set('trucking_payments', updated);
        
        // Update bill status to Paid
        const billsData = await storageService.get<any[]>('trucking_bills') || [];
        const updatedBills = billsData.map(b =>
          b.billNo === formData.billNo
            ? { ...b, status: 'Paid', paidDate: formData.paymentDate }
            : b
        );
        await storageService.set('trucking_bills', updatedBills);
        setBills(updatedBills.filter(b => b.status === 'Sent' || b.status === 'Overdue'));
      }
      setShowForm(false);
      setEditingItem(null);
      setFormData({
        paymentNo: '',
        paymentDate: new Date().toISOString().split('T')[0],
        billNo: '',
        customerCode: '',
        customerName: '',
        amount: 0,
        paymentMethod: 'Bank Transfer',
        reference: '',
        notes: '',
      });
    } catch (error: any) {
      showAlert(`Error saving payment: ${error.message}`, 'Error');
    }
  };

  const handleEdit = (item: Payment) => {
    setEditingItem(item);
    setFormData(item);
    setShowForm(true);
  };

  const handleDelete = async (item: Payment) => {
    try {
      console.log('[Trucking Payments] handleDelete called for:', item?.paymentNo, item?.id);
      
      if (!item || !item.paymentNo) {
        showAlert('Payment tidak valid. Mohon coba lagi.', 'Error');
        return;
      }
      
      // Validate item.id exists
      if (!item.id) {
        console.error('[Trucking Payments] Payment missing ID:', item);
        showAlert(`❌ Error: Payment "${item.paymentNo}" tidak memiliki ID. Tidak bisa dihapus.`, 'Error');
        return;
      }
      
      showConfirm(
        `Hapus Payment "${item.paymentNo}"?\n\n⚠️ Data akan dihapus dengan aman (tombstone pattern) untuk mencegah auto-sync mengembalikan data.\n\nTindakan ini tidak bisa dibatalkan.`,
        async () => {
          try {
            // 🚀 FIX: Pakai Trucking delete helper untuk konsistensi dan sync yang benar
            const deleteResult = await deleteTruckingItem('trucking_payments', item.id, 'id');
            
            if (deleteResult.success) {
              // Reload data dengan helper (handle race condition)
              const activePayments = await reloadTruckingData('trucking_payments', setPayments);
              setPayments(activePayments.map((p, idx) => ({ ...p, no: idx + 1 })));
              showAlert(`✅ Payment "${item.paymentNo}" berhasil dihapus dengan aman.\n\n🛡️ Data dilindungi dari auto-sync restoration.`, 'Success');
            } else {
              console.error('[Trucking Payments] Delete failed:', deleteResult.error);
              showAlert(`❌ Error deleting payment "${item.paymentNo}": ${deleteResult.error || 'Unknown error'}`, 'Error');
            }
          } catch (error: any) {
            console.error('[Trucking Payments] Error deleting payment:', error);
            showAlert(`❌ Error deleting payment: ${error.message}`, 'Error');
          }
        },
        undefined,
        'Safe Delete Confirmation'
      );
    } catch (error: any) {
      console.error('[Trucking Payments] Error in handleDelete:', error);
      showAlert(`Error: ${error.message}`, 'Error');
    }
  };

  const filteredPayments = useMemo(() => {
    return (payments || []).filter(payment => {
      if (!payment) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        (payment.paymentNo || '').toLowerCase().includes(query) ||
        (payment.billNo || '').toLowerCase().includes(query) ||
        (payment.customerName || '').toLowerCase().includes(query) ||
        (payment.paymentMethod || '').toLowerCase().includes(query)
      );
    });
  }, [payments, searchQuery]);

  const columns = [
    { key: 'no', header: 'No' },
    { key: 'paymentNo', header: 'Payment No' },
    { key: 'paymentDate', header: 'Payment Date' },
    { key: 'billNo', header: 'Bill No' },
    { key: 'customerName', header: 'Customer' },
    {
      key: 'amount',
      header: 'Amount',
      render: (item: Payment) => `Rp ${(item.amount || 0).toLocaleString('id-ID')}`,
    },
    { key: 'paymentMethod', header: 'Payment Method' },
    { key: 'reference', header: 'Reference' },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Payment) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={() => handleEdit(item)}>Edit</Button>
          <Button variant="danger" onClick={() => handleDelete(item)}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Payments</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Record Payment'}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card title={editingItem ? "Edit Payment" : "Record New Payment"} className="mb-4">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="Payment No"
              value={formData.paymentNo || ''}
              onChange={(v) => setFormData({ ...formData, paymentNo: v })}
              placeholder="Auto-generated if empty"
            />
            <Input
              label="Payment Date"
              type="date"
              value={formData.paymentDate || ''}
              onChange={(v) => setFormData({ ...formData, paymentDate: v })}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Bill No *
            </label>
            <select
              value={formData.billNo || ''}
              onChange={(e) => {
                handleLoadFromBill(e.target.value);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
              }}
            >
              <option value="">-- Pilih Bill --</option>
              {bills.map(b => (
                <option key={b.id} value={b.billNo}>
                  {b.billNo} - {b.customerName} - Rp {b.total.toLocaleString('id-ID')}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Customer"
            value={formData.customerName || ''}
            onChange={(v) => setFormData({ ...formData, customerName: v })}
            disabled
          />
          <Input
            label="Amount"
            type="number"
            value={String(formData.amount || 0)}
            onChange={(v) => setFormData({ ...formData, amount: Number(v) })}
          />
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Payment Method
            </label>
            <select
              value={formData.paymentMethod || 'Bank Transfer'}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
              }}
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
            onChange={(v) => setFormData({ ...formData, reference: v })}
            placeholder="Transaction reference number"
          />
          <Input
            label="Notes"
            value={formData.notes || ''}
            onChange={(v) => setFormData({ ...formData, notes: v })}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <Button onClick={() => { setShowForm(false); setEditingItem(null); setFormData({ paymentNo: '', paymentDate: new Date().toISOString().split('T')[0], billNo: '', customerCode: '', customerName: '', amount: 0, paymentMethod: 'Bank Transfer', reference: '', notes: '' }); }} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleSave} variant="primary">
              {editingItem ? 'Update Payment' : 'Save Payment'}
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Payment No, Bill No, Customer, Payment Method..."
            style={{
              flex: 1,
              padding: '8px 12px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontFamily: 'inherit',
            }}
          />
        </div>
        <Table columns={columns} data={filteredPayments} emptyMessage={searchQuery ? "No payments found matching your search" : "No payments data"} />
      </Card>
      {/* Custom Dialog */}
      {/* Custom Dialog - menggunakan hook terpusat */}
      <DialogComponent />

    </div>
  );
};

export default Payments;


