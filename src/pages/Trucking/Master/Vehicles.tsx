import { useState, useEffect, useMemo } from 'react';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { storageService, extractStorageValue } from '../../../services/storage';
import { deleteTruckingItem, reloadTruckingData, filterActiveItems } from '../../../utils/trucking-delete-helper';
import { useDialog } from '../../../hooks/useDialog';
import '../../../styles/common.css';
import '../../../styles/compact.css';

interface Vehicle {
  id: string;
  no: number;
  vehicleNo: string;
  vehicleType: string;
  brand: string;
  model: string;
  year: number;
  capacity: number;
  capacityUnit: string;
  fuelType: string;
  licensePlate: string;
  stnkExpiry: string;
  kirExpiry: string;
  status: 'Active' | 'Maintenance' | 'Inactive';
  driver?: string;
  driverId?: string;
  notes?: string;
}

const Vehicles = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
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

  const [editingItem, setEditingItem] = useState<Vehicle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<Partial<Vehicle>>({
    vehicleNo: '',
    vehicleType: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    capacity: 0,
    capacityUnit: 'KG',
    fuelType: 'Diesel',
    licensePlate: '',
    stnkExpiry: '',
    kirExpiry: '',
    status: 'Active',
    driver: '',
    notes: '',
  });

  useEffect(() => {
    loadVehicles();
    loadDrivers();
  }, []);

  const loadVehicles = async () => {
    const data = await storageService.get<Vehicle[]>('trucking_vehicles') || [];
    const activeVehicles = filterActiveItems(data);
    setVehicles(activeVehicles.map((v, idx) => ({ ...v, no: idx + 1 })));
  };

  const loadDrivers = async () => {
    const data = await storageService.get<any[]>('trucking_drivers') || [];
    setDrivers(data);
  };

  const handleSave = async () => {
    try {
      if (!formData.vehicleNo || !formData.licensePlate) {
        showAlert('Vehicle No dan License Plate harus diisi', 'Information');
        return;
      }

      if (editingItem) {
        const updated = vehicles.map(v =>
          v.id === editingItem.id
            ? { ...formData, id: editingItem.id, no: editingItem.no } as Vehicle
            : v
        );
        await storageService.set('trucking_vehicles', updated);
        setVehicles(updated.map((v, idx) => ({ ...v, no: idx + 1 })));
      } else {
        const newVehicle: Vehicle = {
          id: Date.now().toString(),
          no: vehicles.length + 1,
          ...formData,
        } as Vehicle;
        const updated = [...vehicles, newVehicle];
        await storageService.set('trucking_vehicles', updated);
        setVehicles(updated.map((v, idx) => ({ ...v, no: idx + 1 })));
      }
      setShowForm(false);
      setEditingItem(null);
      setFormData({
        vehicleNo: '',
        vehicleType: '',
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        capacity: 0,
        capacityUnit: 'KG',
        fuelType: 'Diesel',
        licensePlate: '',
        stnkExpiry: '',
        kirExpiry: '',
        status: 'Active',
        driver: '',
        notes: '',
      });
    } catch (error: any) {
      showAlert(`Error saving vehicle: ${error.message}`, 'Error');
    }
  };

  const handleEdit = (item: Vehicle) => {
    setEditingItem(item);
    setFormData(item);
    setShowForm(true);
  };

  const handleDelete = async (item: Vehicle) => {
    try {
      console.log('[Trucking Vehicles] handleDelete called for:', item?.vehicleNo, item?.id);
      
      if (!item || !item.vehicleNo) {
        showAlert('Vehicle tidak valid. Mohon coba lagi.', 'Error');
        return;
      }
      
      // Validate item.id exists
      if (!item.id) {
        console.error('[Trucking Vehicles] Vehicle missing ID:', item);
        showAlert(`❌ Error: Vehicle "${item.vehicleNo}" tidak memiliki ID. Tidak bisa dihapus.`, 'Error');
        return;
      }
      
      showConfirm(
        `Hapus Vehicle "${item.vehicleNo}"?\n\n⚠️ Data akan dihapus dengan aman (tombstone pattern) untuk mencegah auto-sync mengembalikan data.\n\nTindakan ini tidak bisa dibatalkan.`,
        async () => {
          try {
            // 🚀 FIX: Pakai Trucking delete helper untuk konsistensi dan sync yang benar
            const deleteResult = await deleteTruckingItem('trucking_vehicles', item.id, 'id');
            
            if (deleteResult.success) {
              // Reload data dengan helper (handle race condition)
              const activeVehicles = await reloadTruckingData('trucking_vehicles', setVehicles);
              setVehicles(activeVehicles.map((v, idx) => ({ ...v, no: idx + 1 })));
              showAlert(`✅ Vehicle "${item.vehicleNo}" berhasil dihapus dengan aman.\n\n🛡️ Data dilindungi dari auto-sync restoration.`, 'Success');
            } else {
              console.error('[Trucking Vehicles] Delete failed:', deleteResult.error);
              showAlert(`❌ Error deleting vehicle "${item.vehicleNo}": ${deleteResult.error || 'Unknown error'}`, 'Error');
            }
          } catch (error: any) {
            console.error('[Trucking Vehicles] Error deleting vehicle:', error);
            showAlert(`❌ Error deleting vehicle: ${error.message}`, 'Error');
          }
        },
        undefined,
        'Safe Delete Confirmation'
      );
    } catch (error: any) {
      console.error('[Trucking Vehicles] Error in handleDelete:', error);
      showAlert(`Error: ${error.message}`, 'Error');
    }
  };

  const filteredVehicles = useMemo(() => {
    return (vehicles || []).filter(vehicle => {
      if (!vehicle) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        (vehicle.vehicleNo || '').toLowerCase().includes(query) ||
        (vehicle.licensePlate || '').toLowerCase().includes(query) ||
        (vehicle.brand || '').toLowerCase().includes(query) ||
        (vehicle.model || '').toLowerCase().includes(query) ||
        (vehicle.vehicleType || '').toLowerCase().includes(query) ||
        (vehicle.driver || '').toLowerCase().includes(query) ||
        (vehicle.status || '').toLowerCase().includes(query)
      );
    });
  }, [vehicles, searchQuery]);

  const columns = [
    { key: 'no', header: 'No' },
    { key: 'vehicleNo', header: 'Vehicle No' },
    { key: 'licensePlate', header: 'License Plate' },
    { key: 'vehicleType', header: 'Type' },
    { key: 'brand', header: 'Brand' },
    { key: 'model', header: 'Model' },
    { key: 'year', header: 'Year' },
    { key: 'capacity', header: 'Capacity' },
    { key: 'driver', header: 'Driver' },
    {
      key: 'status',
      header: 'Status',
      render: (item: Vehicle) => (
        <span className={`status-badge status-${item.status?.toLowerCase()}`}>
          {item.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Vehicle) => (
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
        <h1>Master Vehicles</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Add Vehicle'}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card title={editingItem ? "Edit Vehicle" : "Add New Vehicle"} className="mb-4">
          <Input
            label="Vehicle No"
            value={formData.vehicleNo || ''}
            onChange={(v) => setFormData({ ...formData, vehicleNo: v })}
          />
          <Input
            label="License Plate"
            value={formData.licensePlate || ''}
            onChange={(v) => setFormData({ ...formData, licensePlate: v })}
          />
          <Input
            label="Vehicle Type"
            value={formData.vehicleType || ''}
            onChange={(v) => setFormData({ ...formData, vehicleType: v })}
            placeholder="Truck, Pickup, Van, etc"
          />
          <Input
            label="Brand"
            value={formData.brand || ''}
            onChange={(v) => setFormData({ ...formData, brand: v })}
          />
          <Input
            label="Model"
            value={formData.model || ''}
            onChange={(v) => setFormData({ ...formData, model: v })}
          />
          <Input
            label="Year"
            type="number"
            value={String(formData.year || new Date().getFullYear())}
            onChange={(v) => setFormData({ ...formData, year: Number(v) })}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="Capacity"
              type="number"
              value={String(formData.capacity || 0)}
              onChange={(v) => setFormData({ ...formData, capacity: Number(v) })}
            />
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                Capacity Unit
              </label>
              <select
                value={formData.capacityUnit || 'KG'}
                onChange={(e) => setFormData({ ...formData, capacityUnit: e.target.value })}
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
                <option value="KG">KG</option>
                <option value="TON">TON</option>
                <option value="M3">M3</option>
                <option value="PCS">PCS</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Fuel Type
            </label>
            <select
              value={formData.fuelType || 'Diesel'}
              onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
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
              <option value="Diesel">Diesel</option>
              <option value="Petrol">Petrol</option>
              <option value="Electric">Electric</option>
              <option value="LPG">LPG</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="STNK Expiry"
              type="date"
              value={formData.stnkExpiry || ''}
              onChange={(v) => setFormData({ ...formData, stnkExpiry: v })}
            />
            <Input
              label="KIR Expiry"
              type="date"
              value={formData.kirExpiry || ''}
              onChange={(v) => setFormData({ ...formData, kirExpiry: v })}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Driver
            </label>
            <select
              value={formData.driverId || ''}
              onChange={(e) => {
                const driver = drivers.find(d => d.id === e.target.value);
                setFormData({ ...formData, driverId: e.target.value, driver: driver?.name || '' });
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
              <option value="">-- Pilih Driver --</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} - {d.licenseNo}
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
              <option value="Maintenance">Maintenance</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <Input
            label="Notes"
            value={formData.notes || ''}
            onChange={(v) => setFormData({ ...formData, notes: v })}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <Button onClick={() => { setShowForm(false); setEditingItem(null); setFormData({ vehicleNo: '', vehicleType: '', brand: '', model: '', year: new Date().getFullYear(), capacity: 0, capacityUnit: 'KG', fuelType: 'Diesel', licensePlate: '', stnkExpiry: '', kirExpiry: '', status: 'Active', driver: '', notes: '' }); }} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleSave} variant="primary">
              {editingItem ? 'Update Vehicle' : 'Save Vehicle'}
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
            placeholder="Search by Vehicle No, License Plate, Brand, Model, Type, Driver, Status..."
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
        <Table columns={columns} data={filteredVehicles} emptyMessage={searchQuery ? "No vehicles found matching your search" : "No vehicles data"} />
      </Card>
      
      {/* Custom Dialog - menggunakan hook terpusat */}
      <DialogComponent />
    </div>
  );
};

export default Vehicles;


