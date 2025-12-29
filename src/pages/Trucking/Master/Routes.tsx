import { useState, useEffect, useMemo } from 'react';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { storageService } from '../../../services/storage';
import '../../../styles/common.css';
import '../../../styles/compact.css';

interface Route {
  id: string;
  no: number;
  routeCode: string;
  routeName: string;
  origin: string;
  destination: string;
  distance: number;
  distanceUnit: string;
  estimatedTime: number;
  estimatedTimeUnit: string;
  tollCost: number;
  fuelCost: number;
  status: 'Active' | 'Inactive';
  notes?: string;
}

const Routes = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
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

  const [editingItem, setEditingItem] = useState<Route | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<Partial<Route>>({
    routeCode: '',
    routeName: '',
    origin: '',
    destination: '',
    distance: 0,
    distanceUnit: 'KM',
    estimatedTime: 0,
    estimatedTimeUnit: 'Hours',
    tollCost: 0,
    fuelCost: 0,
    status: 'Active',
    notes: '',
  });

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    const data = await storageService.get<Route[]>('trucking_routes') || [];
    setRoutes(data.map((r, idx) => ({ ...r, no: idx + 1 })));
  };

  const handleSave = async () => {
    try {
      if (!formData.routeCode || !formData.routeName || !formData.origin || !formData.destination) {
        showAlert('Route Code, Route Name, Origin, dan Destination harus diisi', 'Information');
        return;
      }

      if (editingItem) {
        const updated = routes.map(r =>
          r.id === editingItem.id
            ? { ...formData, id: editingItem.id, no: editingItem.no } as Route
            : r
        );
        await storageService.set('trucking_routes', updated);
        setRoutes(updated.map((r, idx) => ({ ...r, no: idx + 1 })));
      } else {
        const newRoute: Route = {
          id: Date.now().toString(),
          no: routes.length + 1,
          ...formData,
        } as Route;
        const updated = [...routes, newRoute];
        await storageService.set('trucking_routes', updated);
        setRoutes(updated.map((r, idx) => ({ ...r, no: idx + 1 })));
      }
      setShowForm(false);
      setEditingItem(null);
      setFormData({
        routeCode: '',
        routeName: '',
        origin: '',
        destination: '',
        distance: 0,
        distanceUnit: 'KM',
        estimatedTime: 0,
        estimatedTimeUnit: 'Hours',
        tollCost: 0,
        fuelCost: 0,
        status: 'Active',
        notes: '',
      });
    } catch (error: any) {
      showAlert(`Error saving route: ${error.message}`, 'Error');
    }
  };

  const handleEdit = (item: Route) => {
    setEditingItem(item);
    setFormData(item);
    setShowForm(true);
  };

  const handleDelete = async (item: Route) => {
    showConfirm(
      `Are you sure you want to delete route "${item.routeName}"?`,
      async () => {
        try {
          const updated = routes.filter(r => r.id !== item.id);
          await storageService.set('trucking_routes', updated);
          setRoutes(updated.map((r, idx) => ({ ...r, no: idx + 1 })));
          showAlert(`Route "${item.routeName}" deleted successfully`, 'Success');
        } catch (error: any) {
          showAlert(`Error deleting route: ${error.message}`, 'Error');
        }
      },
      undefined,
      'Confirm Delete'
    );
  };

  const filteredRoutes = useMemo(() => {
    return (routes || []).filter(route => {
      if (!route) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        (route.routeCode || '').toLowerCase().includes(query) ||
        (route.routeName || '').toLowerCase().includes(query) ||
        (route.origin || '').toLowerCase().includes(query) ||
        (route.destination || '').toLowerCase().includes(query) ||
        (route.status || '').toLowerCase().includes(query)
      );
    });
  }, [routes, searchQuery]);

  const columns = [
    { key: 'no', header: 'No' },
    { key: 'routeCode', header: 'Route Code' },
    { key: 'routeName', header: 'Route Name' },
    { key: 'origin', header: 'Origin' },
    { key: 'destination', header: 'Destination' },
    {
      key: 'distance',
      header: 'Distance',
      render: (item: Route) => `${item.distance || 0} ${item.distanceUnit || 'KM'}`,
    },
    {
      key: 'estimatedTime',
      header: 'Est. Time',
      render: (item: Route) => `${item.estimatedTime || 0} ${item.estimatedTimeUnit || 'Hours'}`,
    },
    {
      key: 'tollCost',
      header: 'Toll Cost',
      render: (item: Route) => `Rp ${(item.tollCost || 0).toLocaleString('id-ID')}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Route) => (
        <span className={`status-badge status-${item.status?.toLowerCase()}`}>
          {item.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Route) => (
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
        <h1>Master Routes</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Add Route'}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card title={editingItem ? "Edit Route" : "Add New Route"} className="mb-4">
          <Input
            label="Route Code"
            value={formData.routeCode || ''}
            onChange={(v) => setFormData({ ...formData, routeCode: v })}
          />
          <Input
            label="Route Name"
            value={formData.routeName || ''}
            onChange={(v) => setFormData({ ...formData, routeName: v })}
          />
          <Input
            label="Origin"
            value={formData.origin || ''}
            onChange={(v) => setFormData({ ...formData, origin: v })}
          />
          <Input
            label="Destination"
            value={formData.destination || ''}
            onChange={(v) => setFormData({ ...formData, destination: v })}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="Distance"
              type="number"
              value={String(formData.distance || 0)}
              onChange={(v) => setFormData({ ...formData, distance: Number(v) })}
            />
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                Distance Unit
              </label>
              <select
                value={formData.distanceUnit || 'KM'}
                onChange={(e) => setFormData({ ...formData, distanceUnit: e.target.value })}
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
                <option value="KM">KM</option>
                <option value="Miles">Miles</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="Estimated Time"
              type="number"
              value={String(formData.estimatedTime || 0)}
              onChange={(v) => setFormData({ ...formData, estimatedTime: Number(v) })}
            />
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                Time Unit
              </label>
              <select
                value={formData.estimatedTimeUnit || 'Hours'}
                onChange={(e) => setFormData({ ...formData, estimatedTimeUnit: e.target.value })}
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
                <option value="Hours">Hours</option>
                <option value="Minutes">Minutes</option>
                <option value="Days">Days</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="Toll Cost"
              type="number"
              value={String(formData.tollCost || 0)}
              onChange={(v) => setFormData({ ...formData, tollCost: Number(v) })}
            />
            <Input
              label="Fuel Cost (Est.)"
              type="number"
              value={String(formData.fuelCost || 0)}
              onChange={(v) => setFormData({ ...formData, fuelCost: Number(v) })}
            />
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
            </select>
          </div>
          <Input
            label="Notes"
            value={formData.notes || ''}
            onChange={(v) => setFormData({ ...formData, notes: v })}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <Button onClick={() => { setShowForm(false); setEditingItem(null); setFormData({ routeCode: '', routeName: '', origin: '', destination: '', distance: 0, distanceUnit: 'KM', estimatedTime: 0, estimatedTimeUnit: 'Hours', tollCost: 0, fuelCost: 0, status: 'Active', notes: '' }); }} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleSave} variant="primary">
              {editingItem ? 'Update Route' : 'Save Route'}
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
            placeholder="Search by Route Code, Route Name, Origin, Destination, Status..."
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
        <Table columns={columns} data={filteredRoutes} emptyMessage={searchQuery ? "No routes found matching your search" : "No routes data"} />
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

export default Routes;


