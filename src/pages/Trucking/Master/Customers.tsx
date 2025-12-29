import { useState, useEffect, useMemo } from 'react';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { storageService } from '../../../services/storage';
import '../../../styles/common.css';
import '../../../styles/compact.css';

interface Customer {
  id: string;
  no: number;
  kode: string;
  nama: string;
  kontak: string;
  npwp: string;
  email: string;
  telepon: string;
  alamat: string;
  kategori: string;
  deliveryAddress?: string;
  notes?: string;
}

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);
  // Custom Dialog state
  const [dialogState, setDialogState] = useState<{
    show: boolean;
    type: 'alert' | 'confirm' | null;
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    show: false,
    type: null,
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
      type: null,
      title: '',
      message: '',
    });
  };

  const [editingItem, setEditingItem] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<Partial<Customer>>({
    kode: '',
    nama: '',
    kontak: '',
    npwp: '',
    email: '',
    telepon: '',
    alamat: '',
    kategori: '',
    deliveryAddress: '',
    notes: '',
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const data = await storageService.get<Customer[]>('trucking_customers') || [];
    setCustomers(data.map((c, idx) => ({ ...c, no: idx + 1 })));
  };

  const handleSave = async () => {
    try {
      if (!formData.kode || !formData.nama) {
        showAlert('Kode dan Nama harus diisi', 'Information');
        return;
      }

      if (editingItem) {
        const updated = customers.map(c =>
          c.id === editingItem.id
            ? { ...formData, id: editingItem.id, no: editingItem.no } as Customer
            : c
        );
        await storageService.set('trucking_customers', updated);
        setCustomers(updated.map((c, idx) => ({ ...c, no: idx + 1 })));
      } else {
        const newCustomer: Customer = {
          id: Date.now().toString(),
          no: customers.length + 1,
          ...formData,
        } as Customer;
        const updated = [...customers, newCustomer];
        await storageService.set('trucking_customers', updated);
        setCustomers(updated.map((c, idx) => ({ ...c, no: idx + 1 })));
      }
      setShowForm(false);
      setEditingItem(null);
      setFormData({
        kode: '',
        nama: '',
        kontak: '',
        npwp: '',
        email: '',
        telepon: '',
        alamat: '',
        kategori: '',
        deliveryAddress: '',
        notes: '',
      });
    } catch (error: any) {
      showAlert(`Error saving customer: ${error.message}`, 'Error');
    }
  };

  const handleEdit = (item: Customer) => {
    setEditingItem(item);
    setFormData(item);
    setShowForm(true);
  };

  const handleDelete = async (item: Customer) => {
    showConfirm(
      `Are you sure you want to delete customer "${item.nama}"?`,
      async () => {
        try {
          const updated = customers.filter(c => c.id !== item.id);
          await storageService.set('trucking_customers', updated);
          setCustomers(updated.map((c, idx) => ({ ...c, no: idx + 1 })));
          showAlert(`Customer "${item.nama}" deleted successfully`, 'Success');
        } catch (error: any) {
          showAlert(`Error deleting customer: ${error.message}`, 'Error');
        }
      },
      undefined,
      'Confirm Delete'
    );
  };

  const filteredCustomers = useMemo(() => {
    return (customers || []).filter(customer => {
      if (!customer) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        (customer.kode || '').toLowerCase().includes(query) ||
        (customer.nama || '').toLowerCase().includes(query) ||
        (customer.kontak || '').toLowerCase().includes(query) ||
        (customer.email || '').toLowerCase().includes(query) ||
        (customer.telepon || '').toLowerCase().includes(query) ||
        (customer.alamat || '').toLowerCase().includes(query) ||
        (customer.kategori || '').toLowerCase().includes(query)
      );
    });
  }, [customers, searchQuery]);

  const columns = [
    { key: 'no', header: 'No' },
    { key: 'kode', header: 'Kode' },
    { key: 'nama', header: 'Nama' },
    { key: 'kontak', header: 'Kontak' },
    { key: 'email', header: 'Email' },
    { key: 'telepon', header: 'Telepon' },
    { key: 'alamat', header: 'Alamat' },
    { key: 'kategori', header: 'Kategori' },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Customer) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={() => handleEdit(item)}>Edit</Button>
          <Button variant="danger" onClick={() => handleDelete(item)}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="module-compact">
      <div className="page-header">
        <h1>Master Customers</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Add Customer'}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card title={editingItem ? "Edit Customer" : "Add New Customer"} className="mb-4">
          <Input
            label="Kode"
            value={formData.kode || ''}
            onChange={(v) => setFormData({ ...formData, kode: v })}
          />
          <Input
            label="Nama"
            value={formData.nama || ''}
            onChange={(v) => setFormData({ ...formData, nama: v })}
          />
          <Input
            label="Kontak (PIC)"
            value={formData.kontak || ''}
            onChange={(v) => setFormData({ ...formData, kontak: v })}
          />
          <Input
            label="NPWP"
            value={formData.npwp || ''}
            onChange={(v) => setFormData({ ...formData, npwp: v })}
          />
          <Input
            label="Email"
            type="email"
            value={formData.email || ''}
            onChange={(v) => setFormData({ ...formData, email: v })}
          />
          <Input
            label="Telepon"
            value={formData.telepon || ''}
            onChange={(v) => setFormData({ ...formData, telepon: v })}
          />
          <Input
            label="Alamat"
            value={formData.alamat || ''}
            onChange={(v) => setFormData({ ...formData, alamat: v })}
          />
          <Input
            label="Delivery Address"
            value={formData.deliveryAddress || ''}
            onChange={(v) => setFormData({ ...formData, deliveryAddress: v })}
            placeholder="Alamat pengiriman khusus (opsional)"
          />
          <Input
            label="Kategori"
            value={formData.kategori || ''}
            onChange={(v) => setFormData({ ...formData, kategori: v })}
          />
          <Input
            label="Notes"
            value={formData.notes || ''}
            onChange={(v) => setFormData({ ...formData, notes: v })}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <Button onClick={() => { setShowForm(false); setEditingItem(null); setFormData({ kode: '', nama: '', kontak: '', npwp: '', email: '', telepon: '', alamat: '', kategori: '', deliveryAddress: '', notes: '' }); }} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleSave} variant="primary">
              {editingItem ? 'Update Customer' : 'Save Customer'}
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
            placeholder="Search by Kode, Nama, Kontak, Email, Telepon, Alamat, Kategori..."
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
        <Table columns={columns} data={filteredCustomers} emptyMessage={searchQuery ? "No customers found matching your search" : "No customers data"} />
      </Card>
      {/* Custom Dialog */}
      {dialogState.show && (
        <div className="dialog-overlay" onClick={closeDialog}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <Card className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2>{dialogState.title}</h2>
                <Button variant="secondary" onClick={closeDialog} style={{ padding: '6px 12px' }}>✕</Button>
              </div>
              <p style={{ marginBottom: '20px', whiteSpace: 'pre-wrap' }}>{dialogState.message}</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                {dialogState.type === 'confirm' && (
                  <Button variant="secondary" onClick={closeDialog}>Cancel</Button>
                )}
                <Button
                  variant="primary"
                  onClick={() => {
                    if (dialogState.onConfirm) dialogState.onConfirm();
                    closeDialog();
                  }}
                >
                  {dialogState.type === 'confirm' ? 'Confirm' : 'OK'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

    </div>
  );
};

export default Customers;


