import { useState, useEffect, useMemo } from 'react';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { storageService } from '../../../services/storage';
import '../../../styles/common.css';

interface StatusUpdate {
  id: string;
  doNo: string;
  customerName: string;
  vehicleNo: string;
  driverName: string;
  status: string;
  updateTime: string;
  location?: string;
  notes?: string;
  updatedBy?: string;
}

const StatusUpdates = () => {
  const [updates, setUpdates] = useState<StatusUpdate[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
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

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [updateNote, setUpdateNote] = useState('');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    let ordersData = await storageService.get<any[]>('trucking_delivery_orders') || [];
    
    // CRITICAL: Extract array from storage wrapper if needed
    if (ordersData && typeof ordersData === 'object' && 'value' in ordersData && Array.isArray(ordersData.value)) {
      ordersData = ordersData.value;
    }
    
    // Safety check: ensure ordersData is an array
    if (!Array.isArray(ordersData)) {
      console.warn('[StatusUpdates] ordersData is not an array:', ordersData);
      ordersData = [];
    }
    
    setOrders(ordersData);
    
    // Generate status updates dari history orders
    const updatesData: StatusUpdate[] = [];
    ordersData.forEach(order => {
      if (order.statusHistory) {
        order.statusHistory.forEach((history: any) => {
          updatesData.push({
            id: `${order.id}-${history.timestamp}`,
            doNo: order.doNo,
            customerName: order.customerName || '',
            vehicleNo: order.vehicleNo || '',
            driverName: order.driverName || '',
            status: history.status,
            updateTime: history.timestamp,
            location: history.location,
            notes: history.notes,
            updatedBy: history.updatedBy,
          });
        });
      } else {
        // Fallback: create update dari current status
        updatesData.push({
          id: `${order.id}-current`,
          doNo: order.doNo,
          customerName: order.customerName || '',
          vehicleNo: order.vehicleNo || '',
          driverName: order.driverName || '',
          status: order.status,
          updateTime: order.lastUpdate || order.orderDate || new Date().toISOString(),
          location: order.currentLocation,
          notes: order.notes,
        });
      }
    });
    setUpdates(updatesData.sort((a, b) => new Date(b.updateTime).getTime() - new Date(a.updateTime).getTime()));
  };

  const handleAddUpdate = async () => {
    if (!selectedOrder || !updateNote) {
      showAlert('Please select an order and enter update notes', 'Information');
      return;
    }

    try {
      const updatedOrders = orders.map(o => {
        if (o.id === selectedOrder.id) {
          const statusHistory = o.statusHistory || [];
          statusHistory.push({
            status: o.status,
            timestamp: new Date().toISOString(),
            location: o.currentLocation,
            notes: updateNote,
            updatedBy: 'Current User',
          });
          return {
            ...o,
            statusHistory,
            lastUpdate: new Date().toISOString(),
          };
        }
        return o;
      });
      await storageService.set('trucking_delivery_orders', updatedOrders);
      setUpdateNote('');
      setSelectedOrder(null);
      loadData();
    } catch (error: any) {
      showAlert(`Error adding status update: ${error.message}`, 'Error');
    }
  };

  const filteredUpdates = useMemo(() => {
    return (updates || []).filter(update => {
      if (!update) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        (update.doNo || '').toLowerCase().includes(query) ||
        (update.customerName || '').toLowerCase().includes(query) ||
        (update.vehicleNo || '').toLowerCase().includes(query) ||
        (update.driverName || '').toLowerCase().includes(query) ||
        (update.status || '').toLowerCase().includes(query)
      );
    });
  }, [updates, searchQuery]);

  const columns = [
    { key: 'doNo', header: 'DO No' },
    { key: 'customerName', header: 'Customer' },
    { key: 'vehicleNo', header: 'Vehicle' },
    { key: 'driverName', header: 'Driver' },
    {
      key: 'status',
      header: 'Status',
      render: (item: StatusUpdate) => (
        <span className={`status-badge status-${item.status?.toLowerCase().replace(' ', '-')}`}>
          {item.status}
        </span>
      ),
    },
    { key: 'location', header: 'Location' },
    { key: 'updateTime', header: 'Update Time' },
    { key: 'notes', header: 'Notes' },
    { key: 'updatedBy', header: 'Updated By' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Status Updates</h1>
      </div>

      <Card title="Add Status Update" className="mb-4">
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
            Select Delivery Order
          </label>
          <select
            value={selectedOrder?.id || ''}
            onChange={(e) => {
              const order = orders.find(o => o.id === e.target.value);
              setSelectedOrder(order || null);
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
            <option value="">-- Pilih Delivery Order --</option>
            {orders.filter(o => o.status !== 'Draft' && o.status !== 'Cancelled').map(o => (
              <option key={o.id} value={o.id}>
                {o.doNo} - {o.customerName} ({o.status})
              </option>
            ))}
          </select>
        </div>
        {selectedOrder && (
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }}>
            <p><strong>DO No:</strong> {selectedOrder.doNo}</p>
            <p><strong>Customer:</strong> {selectedOrder.customerName}</p>
            <p><strong>Vehicle:</strong> {selectedOrder.vehicleNo}</p>
            <p><strong>Driver:</strong> {selectedOrder.driverName}</p>
            <p><strong>Current Status:</strong> {selectedOrder.status}</p>
          </div>
        )}
        <Input
          label="Update Notes"
          value={updateNote}
          onChange={setUpdateNote}
          placeholder="Enter status update notes..."
        />
        <div style={{ marginTop: '16px' }}>
          <Button onClick={handleAddUpdate} disabled={!selectedOrder || !updateNote}>
            Add Status Update
          </Button>
        </div>
      </Card>

      <Card>
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by DO No, Customer, Vehicle, Driver, Status..."
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
        <Table columns={columns} data={filteredUpdates} emptyMessage={searchQuery ? "No status updates found matching your search" : "No status updates"} />
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

export default StatusUpdates;


