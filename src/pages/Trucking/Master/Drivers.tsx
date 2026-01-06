import { useState, useEffect, useMemo } from 'react';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { storageService } from '../../../services/storage';
import { safeDeleteItem, filterActiveItems } from '../../../utils/data-persistence-helper';
import '../../../styles/common.css';
import '../../../styles/compact.css';

interface Driver {
  id: string;
  no: number;
  driverCode: string;
  name: string;
  licenseNo: string;
  licenseType: string;
  licenseExpiry: string;
  phone: string;
  email: string;
  address: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  vehicleId?: string;
  vehicleNo?: string;
  notes?: string;
}

const Drivers = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
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

  const [editingItem, setEditingItem] = useState<Driver | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<Partial<Driver>>({
    driverCode: '',
    name: '',
    licenseNo: '',
    licenseType: 'B2',
    licenseExpiry: '',
    phone: '',
    email: '',
    address: '',
    status: 'Active',
    vehicleId: '',
    notes: '',
  });

  useEffect(() => {
    loadDrivers();
    loadVehicles();
  }, []);

  const loadDrivers = async () => {
    const data = await storageService.get<Driver[]>('trucking_drivers') || [];
    const activeDrivers = filterActiveItems(data);
    setDrivers(activeDrivers.map((d, idx) => ({ ...d, no: idx + 1 })));
  };

  const loadVehicles = async () => {
    const data = await storageService.get<any[]>('trucking_vehicles') || [];
    setVehicles(data);
  };

  const handleSave = async () => {
    try {
      if (!formData.driverCode || !formData.name || !formData.licenseNo) {
        showAlert('Driver Code, Name, dan License No harus diisi', 'Information');
        return;
      }

      if (editingItem) {
        const vehicle = vehicles.find(v => v.id === formData.vehicleId);
        const updated = drivers.map(d =>
          d.id === editingItem.id
            ? { ...formData, id: editingItem.id, no: editingItem.no, vehicleNo: vehicle?.vehicleNo || '' } as Driver
            : d
        );
        await storageService.set('trucking_drivers', updated);
        setDrivers(updated.map((d, idx) => ({ ...d, no: idx + 1 })));
      } else {
        const vehicle = vehicles.find(v => v.id === formData.vehicleId);
        const newDriver: Driver = {
          id: Date.now().toString(),
          no: drivers.length + 1,
          ...formData,
          vehicleNo: vehicle?.vehicleNo || '',
        } as Driver;
        const updated = [...drivers, newDriver];
        await storageService.set('trucking_drivers', updated);
        setDrivers(updated.map((d, idx) => ({ ...d, no: idx + 1 })));
      }
      setShowForm(false);
      setEditingItem(null);
      setFormData({
        driverCode: '',
        name: '',
        licenseNo: '',
        licenseType: 'B2',
        licenseExpiry: '',
        phone: '',
        email: '',
        address: '',
        status: 'Active',
        vehicleId: '',
        notes: '',
      });
    } catch (error: any) {
      showAlert(`Error saving driver: ${error.message}`, 'Error');
    }
  };

  const handleEdit = (item: Driver) => {
    setEditingItem(item);
    setFormData(item);
  };

  const handleDelete = async (item: Driver) => {
    showConfirm(
      `Are you sure you want to delete driver "${item.name}"?`,
      async () => {
        try {
          // Pakai helper function untuk safe delete (tombstone pattern)
          const success = await safeDeleteItem('trucking_drivers', item.id, 'id');
          
          if (success) {
            // Reload data dengan filter active items
            const updatedDrivers = await storageService.get<Driver[]>('trucking_drivers') || [];
            const activeDrivers = filterActiveItems(updatedDrivers);
            setDrivers(activeDrivers.map((d, idx) => ({ ...d, no: idx + 1 })));
            showAlert(`Driver "${item.name}" deleted successfully`, 'Success');
          } else {
            showAlert(`Error deleting driver "${item.name}". Please try again.`, 'Error');
          }
        } catch (error: any) {
          showAlert(`Error deleting driver: ${error.message}`, 'Error');
        }
      },
      undefined,
      'Confirm Delete'
    );
  };

  const filteredDrivers = useMemo(() => {
    return (drivers || []).filter(driver => {
      if (!driver) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        (driver.driverCode || '').toLowerCase().includes(query) ||
        (driver.name || '').toLowerCase().includes(query) ||
        (driver.licenseNo || '').toLowerCase().includes(query) ||
        (driver.phone || '').toLowerCase().includes(query) ||
        (driver.email || '').toLowerCase().includes(query) ||
        (driver.vehicleNo || '').toLowerCase().includes(query) ||
        (driver.status || '').toLowerCase().includes(query)
      );
    });
  }, [drivers, searchQuery]);

  const columns = [
    { key: 'no', header: 'No' },
    { key: 'driverCode', header: 'Driver Code' },
    { key: 'name', header: 'Name' },
    { key: 'licenseNo', header: 'License No' },
    { key: 'licenseType', header: 'License Type' },
    { key: 'phone', header: 'Phone' },
    { key: 'vehicleNo', header: 'Vehicle' },
    {
      key: 'status',
      header: 'Status',
      render: (item: Driver) => (
        <span className={`status-badge status-${item.status?.toLowerCase()}`}>
          {item.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Driver) => (
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
        <h1>Master Drivers</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Add Driver'}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card title={editingItem ? "Edit Driver" : "Add New Driver"} className="mb-4">
          <Input
            label="Driver Code"
            value={formData.driverCode || ''}
            onChange={(v) => setFormData({ ...formData, driverCode: v })}
          />
          <Input
            label="Name"
            value={formData.name || ''}
            onChange={(v) => setFormData({ ...formData, name: v })}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="License No"
              value={formData.licenseNo || ''}
              onChange={(v) => setFormData({ ...formData, licenseNo: v })}
            />
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                License Type
              </label>
              <select
                value={formData.licenseType || 'B2'}
                onChange={(e) => setFormData({ ...formData, licenseType: e.target.value })}
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
                <option value="A">A - Motorcycle</option>
                <option value="B1">B1 - Passenger Car</option>
                <option value="B2">B2 - Commercial Vehicle</option>
                <option value="C">C - Truck</option>
                <option value="D">D - Bus</option>
              </select>
            </div>
          </div>
          <Input
            label="License Expiry"
            type="date"
            value={formData.licenseExpiry || ''}
            onChange={(v) => setFormData({ ...formData, licenseExpiry: v })}
          />
          <Input
            label="Phone"
            value={formData.phone || ''}
            onChange={(v) => setFormData({ ...formData, phone: v })}
          />
          <Input
            label="Email"
            type="email"
            value={formData.email || ''}
            onChange={(v) => setFormData({ ...formData, email: v })}
          />
          <Input
            label="Address"
            value={formData.address || ''}
            onChange={(v) => setFormData({ ...formData, address: v })}
          />
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Assigned Vehicle
            </label>
            <select
              value={formData.vehicleId || ''}
              onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
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
              <option value="">-- No Vehicle Assigned --</option>
              {vehicles.filter(v => v.status === 'Active').map(v => (
                <option key={v.id} value={v.id}>
                  {v.vehicleNo} - {v.licensePlate}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Status
            </label>
            <select
              value={formData.status || 'Active'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
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
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
          <Input
            label="Notes"
            value={formData.notes || ''}
            onChange={(v) => setFormData({ ...formData, notes: v })}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <Button onClick={() => { setShowForm(false); setEditingItem(null); setFormData({ driverCode: '', name: '', licenseNo: '', licenseType: 'B2', licenseExpiry: '', phone: '', email: '', address: '', status: 'Active', vehicleId: '', notes: '' }); }} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleSave} variant="primary">
              {editingItem ? 'Update Driver' : 'Save Driver'}
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
            placeholder="Search by Driver Code, Name, License No, Phone, Email, Vehicle, Status..."
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
        <Table columns={columns} data={filteredDrivers} emptyMessage={searchQuery ? "No drivers found matching your search" : "No drivers data"} />
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

export default Drivers;


