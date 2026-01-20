import { useState, useEffect, useMemo } from 'react';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { storageService, extractStorageValue } from '../../../services/storage';
import { filterActiveItems } from '../../../utils/data-persistence-helper';
import '../../../styles/common.css';

interface RoutePlan {
  id: string;
  no: number;
  planNo: string;
  planDate: string;
  routeId: string;
  routeName: string;
  origin: string;
  destination: string;
  vehicleId: string;
  vehicleNo: string;
  driverId: string;
  driverName: string;
  doIds: string[];
  doNumbers: string[];
  totalWeight: number;
  totalVolume: number;
  estimatedDeparture: string;
  estimatedArrival: string;
  status: 'Open' | 'Close';
  notes?: string;
}

const RoutePlanning = () => {
  const [plans, setPlans] = useState<RoutePlan[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
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

  const [editingItem, setEditingItem] = useState<RoutePlan | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<Partial<RoutePlan>>({
    planNo: '',
    planDate: new Date().toISOString().split('T')[0],
    routeId: '',
    vehicleId: '',
    driverId: '',
    doIds: [],
    estimatedDeparture: '',
    estimatedArrival: '',
    status: 'Open',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load semua data menggunakan storageService untuk membaca dari file storage juga
      const [plansDataRaw, ordersDataRaw, routesDataRaw, vehiclesDataRaw, driversDataRaw] = await Promise.all([
        storageService.get<RoutePlan[]>('trucking_route_plans'),
        storageService.get<any[]>('trucking_delivery_orders'),
        storageService.get<any[]>('trucking_routes'),
        storageService.get<any[]>('trucking_vehicles'),
        storageService.get<any[]>('trucking_drivers'),
      ]);
      
      // CRITICAL: Extract array from storage wrapper if needed
      const plansData = extractStorageValue(plansDataRaw);
      const ordersData = extractStorageValue(ordersDataRaw);
      const routesData = extractStorageValue(routesDataRaw);
      const vehiclesData = extractStorageValue(vehiclesDataRaw);
      const driversData = extractStorageValue(driversDataRaw);
      
      // Filter out deleted items menggunakan helper function
      const activePlans = filterActiveItems(plansData);
      const activeOrders = filterActiveItems(ordersData);
      const activeRoutes = filterActiveItems(routesData);
      const activeVehicles = filterActiveItems(vehiclesData);
      const activeDrivers = filterActiveItems(driversData);
      
      setPlans(activePlans.map((p, idx) => ({ ...p, no: idx + 1 })));
      setOrders(activeOrders.filter(o => o.status === 'Open'));
      setRoutes(activeRoutes);
      setVehicles(activeVehicles);
      setDrivers(activeDrivers);
    } catch (error: any) {
      console.error('Error loading route planning data:', error);
    }
  };

  const generatePlanNo = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `RP-${year}${month}${day}-${random}`;
  };

  const handleSave = async () => {
    try {
      if (!formData.routeId || !formData.vehicleId || !formData.driverId || !formData.doIds || formData.doIds.length === 0) {
        showAlert('Route, Vehicle, Driver, dan Delivery Orders harus diisi', 'Information');
        return;
      }

      const route = routes.find(r => r.id === formData.routeId);
      const vehicle = vehicles.find(v => v.id === formData.vehicleId);
      const driver = drivers.find(d => d.id === formData.driverId);
      const selectedOrders = orders.filter(o => formData.doIds?.includes(o.id));

      if (editingItem) {
        const updated = plans.map(p =>
          p.id === editingItem.id
            ? {
                ...formData,
                id: editingItem.id,
                no: editingItem.no,
                planNo: editingItem.planNo,
                routeName: route?.routeName || '',
                origin: route?.origin || '',
                destination: route?.destination || '',
                vehicleNo: vehicle?.vehicleNo || '',
                driverName: driver?.name || '',
                doNumbers: selectedOrders.map(o => o.doNo),
                totalWeight: selectedOrders.reduce((sum, o) => sum + (o.totalWeight || 0), 0),
                totalVolume: selectedOrders.reduce((sum, o) => sum + (o.totalVolume || 0), 0),
              } as RoutePlan
            : p
        );
        await storageService.set('trucking_route_plans', updated);
        setPlans(updated.map((p, idx) => ({ ...p, no: idx + 1 })));
      } else {
        const newPlan: RoutePlan = {
          id: Date.now().toString(),
          no: plans.length + 1,
          planNo: formData.planNo || generatePlanNo(),
          routeName: route?.routeName || '',
          origin: route?.origin || '',
          destination: route?.destination || '',
          vehicleNo: vehicle?.vehicleNo || '',
          driverName: driver?.name || '',
          doNumbers: selectedOrders.map(o => o.doNo),
          totalWeight: selectedOrders.reduce((sum, o) => sum + (o.totalWeight || 0), 0),
          totalVolume: selectedOrders.reduce((sum, o) => sum + (o.totalVolume || 0), 0),
          ...formData,
        } as RoutePlan;
        const updated = [...plans, newPlan];
        await storageService.set('trucking_route_plans', updated);
        setPlans(updated.map((p, idx) => ({ ...p, no: idx + 1 })));
      }
      setShowForm(false);
      setEditingItem(null);
      setFormData({
        planNo: '',
        planDate: new Date().toISOString().split('T')[0],
        routeId: '',
        vehicleId: '',
        driverId: '',
        doIds: [],
        estimatedDeparture: '',
        estimatedArrival: '',
        status: 'Open',
        notes: '',
      });
    } catch (error: any) {
      showAlert(`Error saving route plan: ${error.message}`, 'Error');
    }
  };

  const filteredPlans = useMemo(() => {
    return (plans || []).filter(plan => {
      if (!plan) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        (plan.planNo || '').toLowerCase().includes(query) ||
        (plan.routeName || '').toLowerCase().includes(query) ||
        (plan.vehicleNo || '').toLowerCase().includes(query) ||
        (plan.driverName || '').toLowerCase().includes(query) ||
        (plan.status || '').toLowerCase().includes(query)
      );
    });
  }, [plans, searchQuery]);

  const columns = [
    { key: 'no', header: 'No' },
    { key: 'planNo', header: 'Plan No' },
    { key: 'planDate', header: 'Plan Date' },
    { key: 'routeName', header: 'Route' },
    { key: 'vehicleNo', header: 'Vehicle' },
    { key: 'driverName', header: 'Driver' },
    {
      key: 'doNumbers',
      header: 'DO Count',
      render: (item: RoutePlan) => item.doNumbers?.length || 0,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: RoutePlan) => (
        <span className={`status-badge status-${item.status?.toLowerCase().replace(' ', '-')}`}>
          {item.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: RoutePlan) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={() => { setEditingItem(item); setFormData(item); setShowForm(true); }}>Edit</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Route Planning</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Create Route Plan'}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card title={editingItem ? "Edit Route Plan" : "Create New Route Plan"} className="mb-4">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="Plan No"
              value={formData.planNo || ''}
              onChange={(v) => setFormData({ ...formData, planNo: v })}
              placeholder="Auto-generated if empty"
            />
            <Input
              label="Plan Date"
              type="date"
              value={formData.planDate || ''}
              onChange={(v) => setFormData({ ...formData, planDate: v })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                Route *
              </label>
              <select
                value={formData.routeId || ''}
                onChange={(e) => setFormData({ ...formData, routeId: e.target.value })}
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
                <option value="">-- Pilih Route --</option>
                {routes.filter(r => r.status === 'Active').map(r => (
                  <option key={r.id} value={r.id}>
                    {r.routeName} ({r.origin} - {r.destination})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                Vehicle *
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
                <option value="">-- Pilih Vehicle --</option>
                {vehicles.filter(v => v.status === 'Active').map(v => (
                  <option key={v.id} value={v.id}>
                    {v.vehicleNo} - {v.licensePlate}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                Driver *
              </label>
              <select
                value={formData.driverId || ''}
                onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
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
                {drivers.filter(d => d.status === 'Active').map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} - {d.licenseNo}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Delivery Orders *
            </label>
            <select
              multiple
              value={formData.doIds || []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setFormData({ ...formData, doIds: selected });
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                minHeight: '150px',
              }}
            >
              {orders.map(o => (
                <option key={o.id} value={o.id}>
                  {o.doNo} - {o.customerName} ({o.status})
                </option>
              ))}
            </select>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Hold Ctrl/Cmd to select multiple orders
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="Estimated Departure"
              type="datetime-local"
              value={formData.estimatedDeparture || ''}
              onChange={(v) => setFormData({ ...formData, estimatedDeparture: v })}
            />
            <Input
              label="Estimated Arrival"
              type="datetime-local"
              value={formData.estimatedArrival || ''}
              onChange={(v) => setFormData({ ...formData, estimatedArrival: v })}
            />
          </div>
          <Input
            label="Notes"
            value={formData.notes || ''}
            onChange={(v) => setFormData({ ...formData, notes: v })}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <Button onClick={() => { setShowForm(false); setEditingItem(null); setFormData({ planNo: '', planDate: new Date().toISOString().split('T')[0], routeId: '', vehicleId: '', driverId: '', doIds: [], estimatedDeparture: '', estimatedArrival: '', status: 'Draft', notes: '' }); }} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleSave} variant="primary">
              {editingItem ? 'Update Plan' : 'Save Plan'}
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
            placeholder="Search by Plan No, Route, Vehicle, Driver, Status..."
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
        <Table columns={columns} data={filteredPlans} emptyMessage={searchQuery ? "No route plans found matching your search" : "No route plans data"} />
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

export default RoutePlanning;


