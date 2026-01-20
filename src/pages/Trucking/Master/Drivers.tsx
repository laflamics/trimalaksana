import { useState, useEffect, useMemo } from 'react';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { storageService } from '../../../services/storage';
import { deleteTruckingItem, reloadTruckingData, filterActiveItems } from '../../../utils/trucking-delete-helper';
import { useDialog } from '../../../hooks/useDialog';
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
  // Custom Dialog - menggunakan hook terpusat
  const { showAlert: showAlertBase, showConfirm: showConfirmBase, DialogComponent } = useDialog();
  
  // Wrapper untuk kompatibilitas dengan urutan parameter yang berbeda
  const showAlert = (message: string, title: string = 'Information') => {
    showAlertBase(message, title);
  };
  
  const showConfirm = (message: string, onConfirm: () => void, onCancel?: () => void, title: string = 'Confirmation') => {
    showConfirmBase(message, onConfirm, onCancel, title);
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
    try {
      console.log('[Trucking Drivers] handleDelete called for:', item?.name, item?.id);
      
      if (!item || !item.name) {
        showAlert('Driver tidak valid. Mohon coba lagi.', 'Error');
        return;
      }
      
      // Validate item.id exists
      if (!item.id) {
        console.error('[Trucking Drivers] Driver missing ID:', item);
        showAlert(`❌ Error: Driver "${item.name}" tidak memiliki ID. Tidak bisa dihapus.`, 'Error');
        return;
      }
      
      showConfirm(
        `Hapus Driver "${item.name}"?\n\n⚠️ Data akan dihapus dengan aman (tombstone pattern) untuk mencegah auto-sync mengembalikan data.\n\nTindakan ini tidak bisa dibatalkan.`,
        async () => {
          try {
            // 🚀 FIX: Pakai Trucking delete helper untuk konsistensi dan sync yang benar
            const deleteResult = await deleteTruckingItem('trucking_drivers', item.id, 'id');
            
            if (deleteResult.success) {
              // Reload data dengan helper (handle race condition)
              const activeDrivers = await reloadTruckingData('trucking_drivers', setDrivers);
              setDrivers(activeDrivers.map((d, idx) => ({ ...d, no: idx + 1 })));
              showAlert(`✅ Driver "${item.name}" berhasil dihapus dengan aman.\n\n🛡️ Data dilindungi dari auto-sync restoration.`, 'Success');
            } else {
              console.error('[Trucking Drivers] Delete failed:', deleteResult.error);
              showAlert(`❌ Error deleting driver "${item.name}": ${deleteResult.error || 'Unknown error'}`, 'Error');
            }
          } catch (error: any) {
            console.error('[Trucking Drivers] Error deleting driver:', error);
            showAlert(`❌ Error deleting driver: ${error.message}`, 'Error');
          }
        },
        undefined,
        'Safe Delete Confirmation'
      );
    } catch (error: any) {
      console.error('[Trucking Drivers] Error in handleDelete:', error);
      showAlert(`Error: ${error.message}`, 'Error');
    }
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
      {/* Custom Dialog - menggunakan hook terpusat */}
      <DialogComponent />
    </div>
  );
};

export default Drivers;


