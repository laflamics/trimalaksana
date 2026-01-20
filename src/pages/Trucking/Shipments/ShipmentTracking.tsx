import { useState, useEffect, useMemo } from 'react';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import { storageService } from '../../../services/storage';
import * as XLSX from 'xlsx';
import { createStyledWorksheet, setColumnWidths, ExcelColumn } from '../../../utils/excel-helper';
import '../../../styles/common.css';

interface truckingStatus {
  id: string;
  doNo: string;
  customerName: string;
  vehicleNo: string;
  driverName: string;
  currentLocation?: string;
  latitude?: number;
  longitude?: number;
  status: 'Open' | 'Close';
  lastUpdate: string;
  estimatedArrival?: string;
  notes?: string;
}

const Shipmenttrucking = () => {
  const [truckings, settruckings] = useState<truckingStatus[]>([]);
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


  useEffect(() => {
    loadtruckings();
    // Optimasi: Refresh setiap 15 detik untuk tracking (sebelumnya 5 detik)
    // Balance antara real-time tracking dan bandwidth
    const interval = setInterval(loadtruckings, 15000); // 15 detik - cukup untuk shipment tracking
    return () => clearInterval(interval);
  }, []);

  const loadtruckings = async () => {
    let orders = await storageService.get<any[]>('trucking_delivery_orders') || [];
    
    // CRITICAL: Extract array from storage wrapper if needed
    if (orders && typeof orders === 'object' && 'value' in orders && Array.isArray(orders.value)) {
      orders = orders.value;
    }
    
    // Safety check: ensure orders is an array
    if (!Array.isArray(orders)) {
      console.warn('[ShipmentTracking] orders is not an array:', orders);
      orders = [];
    }
    
    const truckingsData: truckingStatus[] = orders
      .filter(o => o.status === 'Open')
      .map(o => ({
        id: o.id,
        doNo: o.doNo,
        customerName: o.customerName || '',
        vehicleNo: o.vehicleNo || '',
        driverName: o.driverName || '',
        currentLocation: o.currentLocation || 'Not available',
        latitude: o.latitude,
        longitude: o.longitude,
        status: o.status,
        lastUpdate: o.lastUpdate || o.orderDate || new Date().toISOString(),
        estimatedArrival: o.estimatedArrival,
        notes: o.notes,
      }));
    settruckings(truckingsData);
  };

  const filteredtruckings = useMemo(() => {
    // Ensure truckings is always an array
    const truckingsArray = Array.isArray(truckings) ? truckings : [];
    return truckingsArray.filter(trucking => {
      if (!trucking) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        (trucking.doNo || '').toLowerCase().includes(query) ||
        (trucking.customerName || '').toLowerCase().includes(query) ||
        (trucking.vehicleNo || '').toLowerCase().includes(query) ||
        (trucking.driverName || '').toLowerCase().includes(query) ||
        (trucking.status || '').toLowerCase().includes(query)
      );
    });
  }, [truckings, searchQuery]);

  const columns = [
    { key: 'doNo', header: 'DO No' },
    { key: 'customerName', header: 'Customer' },
    { key: 'vehicleNo', header: 'Vehicle' },
    { key: 'driverName', header: 'Driver' },
    { key: 'currentLocation', header: 'Current Location' },
    {
      key: 'status',
      header: 'Status',
      render: (item: truckingStatus) => (
        <span className={`status-badge status-${item.status?.toLowerCase().replace(' ', '-')}`}>
          {item.status}
        </span>
      ),
    },
    { key: 'lastUpdate', header: 'Last Update' },
    { key: 'estimatedArrival', header: 'Est. Arrival' },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: truckingStatus) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          {item.latitude && item.longitude && (
            <Button
              variant="primary"
              onClick={() => {
                window.open(`https://www.google.com/maps?q=${item.latitude},${item.longitude}`, '_blank');
              }}
            >
              View Map
            </Button>
          )}
        </div>
      ),
    },
  ];

  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Helper function untuk add summary row
      const addSummaryRow = (ws: XLSX.WorkSheet, columns: ExcelColumn[], summaryData: Record<string, any>) => {
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        const summaryRowIdx = range.e.r + 2;
        const emptyRowIdx = range.e.r + 1;
        
        columns.forEach((_, colIdx) => {
          const emptyCell = XLSX.utils.encode_cell({ r: emptyRowIdx, c: colIdx });
          ws[emptyCell] = { t: 's', v: '' };
          
          const summaryCell = XLSX.utils.encode_cell({ r: summaryRowIdx, c: colIdx });
          const col = columns[colIdx];
          const value = summaryData[col.key] ?? '';
          
          if (col.format === 'currency' && typeof value === 'number') {
            ws[summaryCell] = { t: 'n', v: value, z: '#,##0' };
          } else if (col.format === 'number' && typeof value === 'number') {
            ws[summaryCell] = { t: 'n', v: value };
          } else {
            ws[summaryCell] = { t: 's', v: String(value || '') };
          }
        });
        
        ws['!ref'] = XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: summaryRowIdx, c: range.e.c },
        });
      };
      
      // Sheet 1: All trucking Status - Detail lengkap
      const truckingData = truckings.map((trucking: truckingStatus) => ({
        doNo: trucking.doNo,
        customerName: trucking.customerName,
        vehicleNo: trucking.vehicleNo,
        driverName: trucking.driverName,
        currentLocation: trucking.currentLocation || 'Not available',
        latitude: trucking.latitude || '',
        longitude: trucking.longitude || '',
        status: trucking.status,
        lastUpdate: trucking.lastUpdate,
        estimatedArrival: trucking.estimatedArrival || '',
        notes: trucking.notes || '',
      }));

      if (truckingData.length > 0) {
        const truckingColumns: ExcelColumn[] = [
          { key: 'doNo', header: 'DO No', width: 20 },
          { key: 'customerName', header: 'Customer', width: 30 },
          { key: 'vehicleNo', header: 'Vehicle No', width: 15 },
          { key: 'driverName', header: 'Driver Name', width: 20 },
          { key: 'currentLocation', header: 'Current Location', width: 40 },
          { key: 'latitude', header: 'Latitude', width: 15, format: 'number' },
          { key: 'longitude', header: 'Longitude', width: 15, format: 'number' },
          { key: 'status', header: 'Status', width: 15 },
          { key: 'lastUpdate', header: 'Last Update', width: 18, format: 'date' },
          { key: 'estimatedArrival', header: 'Estimated Arrival', width: 18, format: 'date' },
          { key: 'notes', header: 'Notes', width: 40 },
        ];
        const wstrucking = createStyledWorksheet(truckingData, truckingColumns, 'Sheet 1 - Shipment trucking');
        setColumnWidths(wstrucking, truckingColumns);
        addSummaryRow(wstrucking, truckingColumns, {
          doNo: `TOTAL (${truckingData.length} shipments)`,
        });
        XLSX.utils.book_append_sheet(wb, wstrucking, 'Sheet 1 - Shipment trucking');
      }

      // Sheet 2: trucking Summary by Status
      const statusSummary: Record<string, any> = {};
      truckings.forEach((trucking: truckingStatus) => {
        const status = trucking.status || 'Unknown';
        if (!statusSummary[status]) {
          statusSummary[status] = {
            status: status,
            count: 0,
          };
        }
        statusSummary[status].count++;
      });

      const statusSummaryData = Object.values(statusSummary);
      if (statusSummaryData.length > 0) {
        const statusColumns: ExcelColumn[] = [
          { key: 'status', header: 'Status', width: 20 },
          { key: 'count', header: 'Count', width: 12, format: 'number' },
        ];
        const wsStatus = createStyledWorksheet(statusSummaryData, statusColumns, 'Sheet 2 - Status Summary');
        setColumnWidths(wsStatus, statusColumns);
        const totalCount = statusSummaryData.reduce((sum: number, s: any) => sum + (s.count || 0), 0);
        addSummaryRow(wsStatus, statusColumns, {
          status: 'TOTAL',
          count: totalCount,
        });
        XLSX.utils.book_append_sheet(wb, wsStatus, 'Sheet 2 - Status Summary');
      }

      if (wb.SheetNames.length === 0) {
        showAlert('No data available to export', 'Information');
        return;
      }

      const fileName = `Shipment_trucking_Complete_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Exported complete shipment trucking data (${truckingData.length} shipments) to ${fileName}`, 'Success');
    } catch (error: any) {
      showAlert(`Error exporting to Excel: ${error.message}`, 'Error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Shipment trucking</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Auto-refresh every 5 seconds
          </span>
        </div>
      </div>

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
        <Table columns={columns} data={filteredtruckings} emptyMessage={searchQuery ? "No shipments found matching your search" : "No active shipments to track"} />
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

export default Shipmenttrucking;


