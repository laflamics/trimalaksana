import { useState, useEffect, useMemo } from 'react';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { storageService } from '../../../services/storage';
import { safeDeleteItem, filterActiveItems } from '../../../utils/data-persistence-helper';
import * as XLSX from 'xlsx';
import { createStyledWorksheet, setColumnWidths, ExcelColumn } from '../../../utils/excel-helper';
import '../../../styles/common.css';
import '../../../styles/compact.css';

// Helper function to remove leading zeros
const removeLeadingZero = (value: string): string => {
  if (!value) return '';
  // Remove leading zeros but keep at least one digit if input exists
  return value.replace(/^0+(?=\d)/, '');
};

interface DeliveryOrderItem {
  product: string;
  qty: number;
  unit: string;
  description?: string;
}

interface DeliveryOrder {
  id: string;
  no: number;
  doNo: string;
  orderDate: string;
  customerCode: string;
  customerName: string;
  customerAddress: string;
  items: DeliveryOrderItem[];
  vehicleId?: string;
  vehicleNo?: string;
  driverId?: string;
  driverName?: string;
  routeId?: string;
  routeName?: string;
  status: 'Open' | 'Close';
  scheduledDate?: string;
  actualDeliveryDate?: string;
  notes?: string;
  totalWeight?: number;
  totalVolume?: number;
  totalDeal?: number; // Total deal/harga kesepakatan delivery
  discountPercent?: number; // Discount percentage
  confirmed?: boolean; // Flag apakah sudah di-confirm
  confirmedAt?: string; // Timestamp kapan di-confirm
  created?: string; // Timestamp when created
  deleted?: boolean; // Tombstone flag for soft delete
  deletedAt?: string; // Timestamp when deleted
}

const DeliveryOrders = () => {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [showRouteDialog, setShowRouteDialog] = useState(false);
  const [routeDialogSearch, setRouteDialogSearch] = useState('');
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

  const [editingItem, setEditingItem] = useState<DeliveryOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<Partial<DeliveryOrder>>({
    doNo: '',
    orderDate: new Date().toISOString().split('T')[0],
    customerCode: '',
    customerName: '',
    customerAddress: '',
    items: [],
    vehicleId: '',
    driverId: '',
    routeId: '',
    status: 'Open',
    scheduledDate: '',
    notes: '',
    totalDeal: 0,
    discountPercent: 0,
  });
  const [newItem, setNewItem] = useState({ product: '', qty: 0, unit: 'PCS', description: '', customUnit: '' });
  const [showCustomUnit, setShowCustomUnit] = useState(false);
  const [qtyInputValue, setQtyInputValue] = useState<string>(''); // State untuk manage qty input display
  const [totalDealInputValue, setTotalDealInputValue] = useState<string>(''); // State untuk total deal input
  const [discountInputValue, setDiscountInputValue] = useState<string>(''); // State untuk discount input

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Load semua data menggunakan storageService untuk membaca dari file storage juga
    const [ordersDataRaw, customersData, vehiclesData, driversData, routesData] = await Promise.all([
      storageService.get<DeliveryOrder[]>('trucking_delivery_orders'),
      storageService.get<any[]>('trucking_customers'),
      storageService.get<any[]>('trucking_vehicles'),
      storageService.get<any[]>('trucking_drivers'),
      storageService.get<any[]>('trucking_routes'),
    ]);
    
    // Ensure arrays (handle null/undefined)
    const ordersData = ordersDataRaw || [];
    
    // Filter out deleted items menggunakan helper function
    const activeOrders = filterActiveItems(ordersData);
    
    console.log(`[DeliveryOrders] Loaded ${ordersData.length} DOs, filtered to ${activeOrders.length} active DOs`);
    
    // Sort by orderDate (newest first), fallback to created if orderDate not available
    const sortedOrders = activeOrders.sort((a, b) => {
      const dateA = a.orderDate ? new Date(a.orderDate).getTime() : (a.created ? new Date(a.created).getTime() : 0);
      const dateB = b.orderDate ? new Date(b.orderDate).getTime() : (b.created ? new Date(b.created).getTime() : 0);
      return dateB - dateA; // Newest first
    });
    setOrders(sortedOrders.map((o, idx) => ({ ...o, no: idx + 1 })));
    
    // Filter out deleted items for master data menggunakan helper function
    const activeCustomers = filterActiveItems(customersData || []);
    const activeVehicles = filterActiveItems(vehiclesData || []);
    const activeDrivers = filterActiveItems(driversData || []);
    const activeRoutes = filterActiveItems(routesData || []);
    
    setCustomers(activeCustomers);
    setVehicles(activeVehicles);
    setDrivers(activeDrivers);
    setRoutes(activeRoutes);
  };

  // Helper function untuk extract kota dari alamat
  const extractCityFromAddress = (address: string): string => {
    if (!address) return '';
    
    // List kota besar di Indonesia (bisa ditambah lagi)
    const cities = [
      'Jakarta', 'Bandung', 'Surabaya', 'Medan', 'Semarang', 'Makassar', 'Palembang', 
      'Denpasar', 'Yogyakarta', 'Malang', 'Surakarta', 'Bogor', 'Depok', 'Tangerang',
      'Bekasi', 'Cimahi', 'Padang', 'Pekanbaru', 'Pontianak', 'Balikpapan', 'Samarinda',
      'Manado', 'Jambi', 'Cirebon', 'Sukabumi', 'Tasikmalaya', 'Pekalongan', 'Magelang',
      'Kediri', 'Blitar', 'Madiun', 'Pasuruan', 'Probolinggo', 'Banjarmasin', 'Palangkaraya',
      'Kupang', 'Mataram', 'Ambon', 'Jayapura', 'Palu', 'Kendari', 'Gorontalo', 'Ternate'
    ];
    
    const addressLower = address.toLowerCase();
    
    // Cari kota yang disebutkan di alamat
    for (const city of cities) {
      if (addressLower.includes(city.toLowerCase())) {
        return city;
      }
    }
    
    // Jika tidak ketemu, coba extract kata terakhir (biasanya kota)
    const parts = address.split(',').map(p => p.trim());
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1];
      return lastPart;
    }
    
    return '';
  };

  // Helper function untuk mencari route yang cocok berdasarkan alamat customer
  const findMatchingRoute = (customerAddress: string): any => {
    if (!customerAddress || routes.length === 0) return null;
    
    const customerCity = extractCityFromAddress(customerAddress);
    if (!customerCity) return null;
    
    // Cari route yang destination-nya match dengan kota customer
    const matchingRoute = routes.find(route => {
      if (route.status !== 'Active') return false;
      
      const routeDestination = route.destination?.toLowerCase() || '';
      const customerCityLower = customerCity.toLowerCase();
      
      // Exact match atau contains
      return routeDestination.includes(customerCityLower) || customerCityLower.includes(routeDestination);
    });
    
    return matchingRoute || null;
  };

  const generateDONo = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `DO-${year}${month}${day}-${random}`;
  };

  const handleAddItem = () => {
    if (!newItem.product || newItem.qty <= 0) {
      showAlert('Product dan Qty harus diisi', 'Information');
      return;
    }
    if (newItem.unit === 'OTHER' && !newItem.customUnit) {
      showAlert('Custom unit harus diisi jika memilih OTHER', 'Information');
      return;
    }
    const itemToAdd = {
      ...newItem,
      unit: newItem.unit === 'OTHER' ? newItem.customUnit : newItem.unit,
    };
    setFormData({
      ...formData,
      items: [...(formData.items || []), itemToAdd],
    });
    setNewItem({ product: '', qty: 0, unit: 'PCS', description: '', customUnit: '' });
    setShowCustomUnit(false);
  };

  const handleRemoveItem = (index: number) => {
    const items = [...(formData.items || [])];
    items.splice(index, 1);
    setFormData({ ...formData, items });
  };

  const handleSave = async () => {
    try {
      if (!formData.customerCode || !formData.items || formData.items.length === 0) {
        showAlert('Customer dan Items harus diisi', 'Information');
        return;
      }

      const customer = customers.find(c => c.kode === formData.customerCode);
      const vehicle = vehicles.find(v => v.id === formData.vehicleId);
      const driver = drivers.find(d => d.id === formData.driverId);
      const route = routes.find(r => r.id === formData.routeId);

      // Load semua data menggunakan storageService untuk membaca dari file storage juga
      const allOrdersRaw = await storageService.get<DeliveryOrder[]>('trucking_delivery_orders');
      const allOrders = allOrdersRaw || orders; // Fallback ke orders state jika kosong
      
      if (editingItem) {
        const updated = allOrders.map((o: any) =>
          o.id === editingItem.id
            ? {
                ...formData,
                id: editingItem.id,
                no: editingItem.no,
                doNo: editingItem.doNo,
                customerName: customer?.nama || formData.customerName || '',
                customerAddress: customer?.alamat || customer?.deliveryAddress || formData.customerAddress || '',
                vehicleNo: vehicle?.vehicleNo || formData.vehicleNo || '',
                driverName: driver?.name || formData.driverName || '',
                // Pastikan routeName dari formData digunakan (bisa manual input), baru fallback ke route?.routeName
                // routeName harus di-set setelah spread formData agar tidak ter-overwrite
                routeName: formData.routeName || route?.routeName || '',
                routeId: formData.routeId || route?.id || '',
                // Preserve deleted flag jika ada
                deleted: o.deleted,
                deletedAt: o.deletedAt,
              } as DeliveryOrder
            : o
        );
        
        // Simpan menggunakan storageService untuk menyimpan ke file storage juga
        await storageService.set('trucking_delivery_orders', updated);
        
        // Filter out deleted items untuk display menggunakan helper function
        const activeOrders = filterActiveItems(updated);
        
        // Sort by orderDate (newest first)
        const sortedUpdated = activeOrders.sort((a, b) => {
          const dateA = a.orderDate ? new Date(a.orderDate).getTime() : (a.created ? new Date(a.created).getTime() : 0);
          const dateB = b.orderDate ? new Date(b.orderDate).getTime() : (b.created ? new Date(b.created).getTime() : 0);
          return dateB - dateA; // Newest first
        });
        setOrders(sortedUpdated.map((o, idx) => ({ ...o, no: idx + 1 })));
      } else {
        // Generate DO No jika kosong atau tidak ada
        const doNo = (formData.doNo && formData.doNo.trim() !== '') ? formData.doNo : generateDONo();
        const newOrder: DeliveryOrder = {
          id: Date.now().toString(),
          no: filterActiveItems(allOrders).length + 1,
          customerName: customer?.nama || '',
          customerAddress: customer?.alamat || customer?.deliveryAddress || '',
          vehicleNo: vehicle?.vehicleNo || '',
          driverName: driver?.name || '',
          // Gunakan formData.routeName dulu (bisa manual input), baru fallback ke route?.routeName
          routeName: formData.routeName || route?.routeName || '',
          ...formData,
          doNo: doNo, // Generate DO No otomatis jika kosong, override formData.doNo
          confirmed: false, // Default: belum di-confirm
          created: new Date().toISOString(), // Set created timestamp
        } as DeliveryOrder;
        const updated = [...allOrders, newOrder];
        
        // Simpan menggunakan storageService untuk menyimpan ke file storage juga
        await storageService.set('trucking_delivery_orders', updated);
        
        // Filter out deleted items untuk display menggunakan helper function
        const activeOrders = filterActiveItems(updated);
        
        // Sort by orderDate (newest first)
        const sortedUpdated = activeOrders.sort((a, b) => {
          const dateA = a.orderDate ? new Date(a.orderDate).getTime() : (a.created ? new Date(a.created).getTime() : 0);
          const dateB = b.orderDate ? new Date(b.orderDate).getTime() : (b.created ? new Date(b.created).getTime() : 0);
          return dateB - dateA; // Newest first
        });
        setOrders(sortedUpdated.map((o, idx) => ({ ...o, no: idx + 1 })));
      }
      setShowForm(false);
      setEditingItem(null);
      setFormData({
        doNo: '',
        orderDate: new Date().toISOString().split('T')[0],
        customerCode: '',
        customerName: '',
        customerAddress: '',
        items: [],
        vehicleId: '',
        driverId: '',
        routeId: '',
        status: 'Open',
        scheduledDate: '',
        notes: '',
        totalDeal: 0,
        discountPercent: 0,
      });
      setNewItem({ product: '', qty: 0, unit: 'PCS', description: '', customUnit: '' });
      setShowCustomUnit(false);
      setQtyInputValue('');
      setTotalDealInputValue('');
      setDiscountInputValue('');
    } catch (error: any) {
      showAlert(`Error saving delivery order: ${error.message}`, 'Error');
    }
  };

  const handleEdit = (item: DeliveryOrder) => {
    setEditingItem(item);
    setFormData(item);
    setNewItem({ product: '', qty: 0, unit: 'PCS', description: '', customUnit: '' });
    setShowCustomUnit(false);
    setQtyInputValue(''); // Reset qty input
    setTotalDealInputValue(item.totalDeal && item.totalDeal > 0 ? String(item.totalDeal) : '');
    setDiscountInputValue(item.discountPercent && item.discountPercent > 0 ? String(item.discountPercent) : '');
    setShowForm(true);
  };

  const handleDelete = async (item: DeliveryOrder) => {
    showConfirm(
      `Are you sure you want to delete delivery order "${item.doNo}"?`,
      async () => {
        try {
          // Simpan tombstone ke audit log sebelum menghapus
          const timestamp = new Date().toISOString();
          const itemId = item.id || item.doNo || 'unknown';
          const auditLog = {
            id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            refType: 'trucking_delivery_orders',
            refId: itemId,
            actorId: 'user', // TODO: get from auth context
            action: 'DELETE',
            deleted: true,
            deletedAt: timestamp,
            data: item, // Simpan data lengkap untuk tombstone
            createdAt: timestamp,
          };
          
          // Simpan audit log menggunakan storageService
          const auditLogs = await storageService.get<any[]>('trucking_auditLogs') || [];
          await storageService.set('trucking_auditLogs', [...auditLogs, auditLog]);
          
          // Pakai helper function untuk safe delete (tombstone pattern)
          const success = await safeDeleteItem('trucking_delivery_orders', item.id, 'id');
          
          if (success) {
            // Reload data dengan filter active items
            const updatedOrders = await storageService.get<DeliveryOrder[]>('trucking_delivery_orders') || [];
            const activeOrders = filterActiveItems(updatedOrders);
            
            // Sort by orderDate (newest first)
            const sortedUpdated = activeOrders.sort((a, b) => {
              const dateA = a.orderDate ? new Date(a.orderDate).getTime() : (a.created ? new Date(a.created).getTime() : 0);
              const dateB = b.orderDate ? new Date(b.orderDate).getTime() : (b.created ? new Date(b.created).getTime() : 0);
              return dateB - dateA; // Newest first
            });
            setOrders(sortedUpdated.map((o, idx) => ({ ...o, no: idx + 1 })));
            showAlert(`Delivery order "${item.doNo}" deleted successfully`, 'Success');
          } else {
            showAlert(`Error deleting delivery order "${item.doNo}". Please try again.`, 'Error');
          }
        } catch (error: any) {
          showAlert(`Error deleting delivery order: ${error.message}`, 'Error');
        }
      },
      undefined,
      'Confirm Delete'
    );
  };

  const handleConfirmDO = async (item: DeliveryOrder) => {
    try {
      // Load semua data menggunakan storageService
      const allOrdersRaw = await storageService.get<DeliveryOrder[]>('trucking_delivery_orders');
      const allOrders = allOrdersRaw || orders;
      
      // Update DO dengan confirmed flag
      const updated = allOrders.map((o: any) =>
        o.id === item.id
          ? {
              ...o,
              confirmed: true,
              confirmedAt: new Date().toISOString(),
            }
          : o
      );
      
      // Simpan menggunakan storageService
      await storageService.set('trucking_delivery_orders', updated);
      
      // Filter out deleted items untuk display menggunakan helper function
      const activeOrders = filterActiveItems(updated);
      
      setOrders(activeOrders.map((o, idx) => ({ ...o, no: idx + 1 })));

      // Kirim notifikasi ke Pengaturan Unit
      const unitNotifications = await storageService.get<any[]>('trucking_unitNotifications') || [];
      const existingNotif = unitNotifications.find((n: any) => n.doNo === item.doNo && n.type === 'DO_CONFIRMED');
      
      if (!existingNotif) {
        const now = new Date();
        const newNotification = {
          id: `unit-${Date.now()}-${item.doNo}`,
          type: 'DO_CONFIRMED',
          doNo: item.doNo,
          customerCode: item.customerCode,
          customerName: item.customerName,
          customerAddress: item.customerAddress,
          items: item.items || [],
          vehicleId: item.vehicleId || '',
          vehicleNo: item.vehicleNo || '',
          driverId: item.driverId || '',
          driverName: item.driverName || '',
          routeId: item.routeId || '',
          routeName: item.routeName || '',
          scheduledDate: item.scheduledDate || '',
          orderDate: item.orderDate,
          totalWeight: item.totalWeight || 0,
          totalVolume: item.totalVolume || 0,
          notes: item.notes || '',
          status: 'Open',
          created: now.toISOString(),
          lastUpdate: now.toISOString(),
          timestamp: now.getTime(),
          _timestamp: now.getTime(),
        };
        await storageService.set('trucking_unitNotifications', [...unitNotifications, newNotification]);
        console.log(`✅ [DeliveryOrder] Created unit scheduling notification for DO ${item.doNo}`);
        showAlert(`Delivery Order ${item.doNo} confirmed!\n\n📧 Notification sent to Pengaturan Unit for scheduling.`, 'Success');
      } else {
        showAlert(`Notification for DO ${item.doNo} already exists in Pengaturan Unit.`, 'Information');
      }
    } catch (error: any) {
      showAlert(`Error confirming delivery order: ${error.message}`, 'Error');
    }
  };

  const handleStatusChange = async (item: DeliveryOrder, newStatus: DeliveryOrder['status']) => {
    try {
      // Load semua data menggunakan storageService
      const allOrdersRaw = await storageService.get<DeliveryOrder[]>('trucking_delivery_orders');
      const allOrders = allOrdersRaw || orders;
      
      const updated = allOrders.map((o: any) =>
        o.id === item.id
          ? {
              ...o,
              status: newStatus,
              actualDeliveryDate: newStatus === 'Close' ? new Date().toISOString().split('T')[0] : o.actualDeliveryDate,
            }
          : o
      );
      
      // Simpan menggunakan storageService
      await storageService.set('trucking_delivery_orders', updated);
      
      // Filter out deleted items untuk display menggunakan helper function
      const activeOrders = filterActiveItems(updated);
      
      // Sort by orderDate (newest first)
      const sortedUpdated = activeOrders.sort((a, b) => {
        const dateA = a.orderDate ? new Date(a.orderDate).getTime() : (a.created ? new Date(a.created).getTime() : 0);
        const dateB = b.orderDate ? new Date(b.orderDate).getTime() : (b.created ? new Date(b.created).getTime() : 0);
        return dateB - dateA; // Newest first
      });
      setOrders(sortedUpdated.map((o, idx) => ({ ...o, no: idx + 1 })));
    } catch (error: any) {
      showAlert(`Error updating status: ${error.message}`, 'Error');
    }
  };

  const filteredOrders = useMemo(() => {
    const filtered = (orders || []).filter(order => {
      if (!order) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        (order.doNo || '').toLowerCase().includes(query) ||
        (order.customerName || '').toLowerCase().includes(query) ||
        (order.vehicleNo || '').toLowerCase().includes(query) ||
        (order.driverName || '').toLowerCase().includes(query) ||
        (order.status || '').toLowerCase().includes(query)
      );
    });
    // Sort by orderDate (newest first)
    return filtered.sort((a, b) => {
      const dateA = a.orderDate ? new Date(a.orderDate).getTime() : (a.created ? new Date(a.created).getTime() : 0);
      const dateB = b.orderDate ? new Date(b.orderDate).getTime() : (b.created ? new Date(b.created).getTime() : 0);
      return dateB - dateA; // Newest first
    });
  }, [orders, searchQuery]);

  const columns = [
    { key: 'no', header: 'No' },
    { key: 'doNo', header: 'DO No' },
    { key: 'orderDate', header: 'Order Date' },
    { key: 'customerName', header: 'Customer' },
    { key: 'vehicleNo', header: 'Vehicle' },
    { key: 'driverName', header: 'Driver' },
    { key: 'routeName', header: 'Route' },
    {
      key: 'status',
      header: 'Status',
      render: (item: DeliveryOrder) => (
        <span className={`status-badge status-${item.status?.toLowerCase().replace(' ', '-')}`}>
          {item.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: DeliveryOrder) => (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {item.status === 'Open' && !item.confirmed && (
            <Button variant="primary" onClick={() => handleConfirmDO(item)} style={{ fontSize: '10px', padding: '3px 6px', minHeight: '24px' }}>
              Confirm DO
            </Button>
          )}
          {item.status === 'Open' && (
            <Button variant="success" onClick={() => handleStatusChange(item, 'Close')} style={{ fontSize: '10px', padding: '3px 6px', minHeight: '24px' }}>
              Close
            </Button>
          )}
          {item.status === 'Close' && (
            <Button variant="secondary" onClick={() => handleStatusChange(item, 'Open')} style={{ fontSize: '10px', padding: '3px 6px', minHeight: '24px' }}>
              Reopen
            </Button>
          )}
          <Button variant="secondary" onClick={() => handleEdit(item)} style={{ fontSize: '10px', padding: '3px 6px', minHeight: '24px' }}>Edit</Button>
          {item.status === 'Open' && (
            <Button variant="danger" onClick={() => handleDelete(item)} style={{ fontSize: '10px', padding: '3px 6px', minHeight: '24px' }}>Delete</Button>
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
      
      // Sheet 1: All Delivery Orders - Summary
      const allOrdersData = orders.map(order => {
        const totalQty = order.items.reduce((sum, item) => sum + (item.qty || 0), 0);
        return {
          doNo: order.doNo,
          orderDate: order.orderDate,
          customerCode: order.customerCode,
          customerName: order.customerName,
          customerAddress: order.customerAddress,
          vehicleNo: order.vehicleNo || '',
          driverName: order.driverName || '',
          routeName: order.routeName || '',
          status: order.status,
          scheduledDate: order.scheduledDate || '',
          actualDeliveryDate: order.actualDeliveryDate || '',
          totalItems: order.items.length,
          totalQty: totalQty,
          totalWeight: order.totalWeight || 0,
          totalVolume: order.totalVolume || 0,
          notes: order.notes || '',
        };
      });

      if (allOrdersData.length > 0) {
        const ordersColumns: ExcelColumn[] = [
          { key: 'doNo', header: 'DO No', width: 20 },
          { key: 'orderDate', header: 'Order Date', width: 18, format: 'date' },
          { key: 'customerCode', header: 'Customer Code', width: 15 },
          { key: 'customerName', header: 'Customer Name', width: 30 },
          { key: 'customerAddress', header: 'Customer Address', width: 40 },
          { key: 'vehicleNo', header: 'Vehicle No', width: 15 },
          { key: 'driverName', header: 'Driver Name', width: 20 },
          { key: 'routeName', header: 'Route', width: 30 },
          { key: 'status', header: 'Status', width: 15 },
          { key: 'scheduledDate', header: 'Scheduled Date', width: 18, format: 'date' },
          { key: 'actualDeliveryDate', header: 'Actual Delivery Date', width: 18, format: 'date' },
          { key: 'totalItems', header: 'Total Items', width: 12, format: 'number' },
          { key: 'totalQty', header: 'Total Qty', width: 12, format: 'number' },
          { key: 'totalWeight', header: 'Total Weight (KG)', width: 15, format: 'number' },
          { key: 'totalVolume', header: 'Total Volume (M3)', width: 15, format: 'number' },
          { key: 'notes', header: 'Notes', width: 40 },
        ];
        const wsOrders = createStyledWorksheet(allOrdersData, ordersColumns, 'Sheet 1 - Delivery Orders');
        setColumnWidths(wsOrders, ordersColumns);
        const totalQty = allOrdersData.reduce((sum, o) => sum + (o.totalQty || 0), 0);
        const totalWeight = allOrdersData.reduce((sum, o) => sum + (o.totalWeight || 0), 0);
        const totalVolume = allOrdersData.reduce((sum, o) => sum + (o.totalVolume || 0), 0);
        addSummaryRow(wsOrders, ordersColumns, {
          doNo: 'TOTAL',
          totalItems: allOrdersData.length,
          totalQty: totalQty,
          totalWeight: totalWeight,
          totalVolume: totalVolume,
        });
        XLSX.utils.book_append_sheet(wb, wsOrders, 'Sheet 1 - Delivery Orders');
      }
      
      // Sheet 2: Order Items Detail
      const itemsDetail: any[] = [];
      orders.forEach(order => {
        order.items.forEach((item, idx) => {
          itemsDetail.push({
            doNo: order.doNo,
            customerName: order.customerName,
            status: order.status,
            itemNo: idx + 1,
            product: item.product,
            qty: item.qty,
            unit: item.unit,
            description: item.description || '',
          });
        });
      });
      
      if (itemsDetail.length > 0) {
        const itemsColumns: ExcelColumn[] = [
          { key: 'doNo', header: 'DO No', width: 20 },
          { key: 'customerName', header: 'Customer', width: 30 },
          { key: 'status', header: 'Status', width: 15 },
          { key: 'itemNo', header: 'Item No', width: 10, format: 'number' },
          { key: 'product', header: 'Product', width: 40 },
          { key: 'qty', header: 'Qty', width: 12, format: 'number' },
          { key: 'unit', header: 'Unit', width: 10 },
          { key: 'description', header: 'Description', width: 40 },
        ];
        const wsItems = createStyledWorksheet(itemsDetail, itemsColumns, 'Sheet 2 - Order Items');
        setColumnWidths(wsItems, itemsColumns);
        const itemsTotalQty = itemsDetail.reduce((sum, i) => sum + (i.qty || 0), 0);
        addSummaryRow(wsItems, itemsColumns, {
          doNo: 'TOTAL',
          itemNo: itemsDetail.length,
          qty: itemsTotalQty,
        });
        XLSX.utils.book_append_sheet(wb, wsItems, 'Sheet 2 - Order Items');
      }

      // Sheet 3: Outstanding (Status Open)
      const outstandingOrders = orders.filter(o => o.status === 'Open');
      if (outstandingOrders.length > 0) {
        const outstandingData = outstandingOrders.map(order => ({
          doNo: order.doNo,
          orderDate: order.orderDate,
          customerName: order.customerName,
          vehicleNo: order.vehicleNo || '',
          driverName: order.driverName || '',
          routeName: order.routeName || '',
          status: order.status,
          scheduledDate: order.scheduledDate || '',
          totalItems: order.items.length,
          totalQty: order.items.reduce((sum, item) => sum + (item.qty || 0), 0),
        }));

        const outstandingColumns: ExcelColumn[] = [
          { key: 'doNo', header: 'DO No', width: 20 },
          { key: 'orderDate', header: 'Order Date', width: 18, format: 'date' },
          { key: 'customerName', header: 'Customer', width: 30 },
          { key: 'vehicleNo', header: 'Vehicle No', width: 15 },
          { key: 'driverName', header: 'Driver Name', width: 20 },
          { key: 'routeName', header: 'Route', width: 30 },
          { key: 'status', header: 'Status', width: 15 },
          { key: 'scheduledDate', header: 'Scheduled Date', width: 18, format: 'date' },
          { key: 'totalItems', header: 'Total Items', width: 12, format: 'number' },
          { key: 'totalQty', header: 'Total Qty', width: 12, format: 'number' },
        ];
        const wsOutstanding = createStyledWorksheet(outstandingData, outstandingColumns, 'Sheet 3 - Outstanding');
        setColumnWidths(wsOutstanding, outstandingColumns);
        const totalOutstandingQty = outstandingData.reduce((sum, o) => sum + (o.totalQty || 0), 0);
        addSummaryRow(wsOutstanding, outstandingColumns, {
          doNo: 'TOTAL',
          totalItems: outstandingData.length,
          totalQty: totalOutstandingQty,
        });
        XLSX.utils.book_append_sheet(wb, wsOutstanding, 'Sheet 3 - Outstanding');
      }

      if (wb.SheetNames.length === 0) {
        showAlert('No data available to export', 'Information');
        return;
      }

      const fileName = `Delivery_Orders_Complete_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Exported complete delivery orders data (${allOrdersData.length} orders, ${itemsDetail.length} items, ${outstandingOrders.length} outstanding) to ${fileName}`, 'Success');
    } catch (error: any) {
      showAlert(`Error exporting to Excel: ${error.message}`, 'Error');
    }
  };

  return (
    <div className="module-compact">
      <div className="page-header">
        <h1>Delivery Orders</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
          <Button 
            variant="secondary" 
            onClick={async () => {
              try {
                // Generate dummy MASTER data saja (sesuai struktur interface)
                const dummyCustomers = [
                  { 
                    id: '1', 
                    no: 1,
                    kode: 'CUST001', 
                    nama: 'PT. Dummy Customer 1', 
                    kontak: 'John Doe',
                    npwp: '12.345.678.9-000.000',
                    email: 'customer1@dummy.com',
                    telepon: '021-12345678',
                    alamat: 'Jl. Dummy No. 1, Jakarta', 
                    deliveryAddress: 'Jl. Dummy No. 1, Jakarta',
                    kategori: 'Regular',
                    notes: 'Dummy customer for testing'
                  },
                  { 
                    id: '2', 
                    no: 2,
                    kode: 'CUST002', 
                    nama: 'PT. Dummy Customer 2', 
                    kontak: 'Jane Smith',
                    npwp: '12.345.678.9-000.001',
                    email: 'customer2@dummy.com',
                    telepon: '022-12345678',
                    alamat: 'Jl. Dummy No. 2, Bandung', 
                    deliveryAddress: 'Jl. Dummy No. 2, Bandung',
                    kategori: 'Regular',
                    notes: 'Dummy customer for testing'
                  },
                  { 
                    id: '3', 
                    no: 3,
                    kode: 'CUST003', 
                    nama: 'PT. Dummy Customer 3', 
                    kontak: 'Bob Johnson',
                    npwp: '12.345.678.9-000.002',
                    email: 'customer3@dummy.com',
                    telepon: '031-12345678',
                    alamat: 'Jl. Dummy No. 3, Surabaya', 
                    deliveryAddress: 'Jl. Dummy No. 3, Surabaya',
                    kategori: 'Regular',
                    notes: 'Dummy customer for testing'
                  },
                ];
                const dummyVehicles = [
                  { 
                    id: '1', 
                    no: 1,
                    vehicleNo: 'B-1234-XX', 
                    vehicleType: 'Truck', 
                    brand: 'Hino',
                    model: 'Dutro 130',
                    year: 2020,
                    capacity: 5000, 
                    capacityUnit: 'KG',
                    fuelType: 'Diesel',
                    licensePlate: 'B-1234-XX', 
                    stnkExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    kirExpiry: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    status: 'Active',
                    notes: 'Dummy vehicle for testing'
                  },
                  { 
                    id: '2', 
                    no: 2,
                    vehicleNo: 'B-5678-YY', 
                    vehicleType: 'Truck', 
                    brand: 'Isuzu',
                    model: 'Elf NKR',
                    year: 2021,
                    capacity: 3000, 
                    capacityUnit: 'KG',
                    fuelType: 'Diesel',
                    licensePlate: 'B-5678-YY', 
                    stnkExpiry: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    kirExpiry: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    status: 'Active',
                    notes: 'Dummy vehicle for testing'
                  },
                ];
                const dummyDrivers = [
                  { 
                    id: '1', 
                    no: 1,
                    driverCode: 'DRV001',
                    name: 'Driver Dummy 1', 
                    licenseNo: 'SIM-001', 
                    licenseType: 'B2',
                    licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    phone: '081234567890',
                    email: 'driver1@dummy.com',
                    address: 'Jl. Driver Dummy 1, Jakarta',
                    status: 'Active',
                    notes: 'Dummy driver for testing'
                  },
                  { 
                    id: '2', 
                    no: 2,
                    driverCode: 'DRV002',
                    name: 'Driver Dummy 2', 
                    licenseNo: 'SIM-002', 
                    licenseType: 'B2',
                    licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    phone: '081234567891',
                    email: 'driver2@dummy.com',
                    address: 'Jl. Driver Dummy 2, Jakarta',
                    status: 'Active',
                    notes: 'Dummy driver for testing'
                  },
                ];
                const dummyRoutes = [
                  { 
                    id: '1', 
                    no: 1,
                    routeCode: 'RT001',
                    routeName: 'Jakarta - Bandung', 
                    origin: 'Jakarta', 
                    destination: 'Bandung', 
                    distance: 150, 
                    distanceUnit: 'KM',
                    estimatedTime: 3, 
                    estimatedTimeUnit: 'Hours',
                    tollCost: 50000,
                    fuelCost: 200000,
                    status: 'Active',
                    notes: 'Dummy route for testing'
                  },
                  { 
                    id: '2', 
                    no: 2,
                    routeCode: 'RT002',
                    routeName: 'Jakarta - Surabaya', 
                    origin: 'Jakarta', 
                    destination: 'Surabaya', 
                    distance: 700, 
                    distanceUnit: 'KM',
                    estimatedTime: 12, 
                    estimatedTimeUnit: 'Hours',
                    tollCost: 250000,
                    fuelCost: 800000,
                    status: 'Active',
                    notes: 'Dummy route for testing'
                  },
                ];

                // Save to storage (hanya master data)
                await storageService.set('trucking_customers', dummyCustomers);
                await storageService.set('trucking_vehicles', dummyVehicles);
                await storageService.set('trucking_drivers', dummyDrivers);
                await storageService.set('trucking_routes', dummyRoutes);
                
                showAlert('✅ Master data dummy berhasil dibuat! (3 Customers, 2 Vehicles, 2 Drivers, 2 Routes)', 'Success');
                loadData();
              } catch (error: any) {
                showAlert(`Error creating dummy data: ${error.message}`, 'Error');
              }
            }}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            🧪 Generate Master Data
          </Button>
          <Button onClick={() => setShowForm(true)}>
            + Create Delivery Order
          </Button>
        </div>
      </div>

      <Card>
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '6px' }}>
            <button
              onClick={() => setViewMode('card')}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '4px',
                background: viewMode === 'card' ? 'var(--accent-color)' : 'transparent',
                color: viewMode === 'card' ? 'white' : 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: viewMode === 'card' ? '600' : '400',
              }}
            >
              🎴 Card
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '4px',
                background: viewMode === 'table' ? 'var(--accent-color)' : 'transparent',
                color: viewMode === 'table' ? 'white' : 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: viewMode === 'table' ? '600' : '400',
              }}
            >
              📊 Table
            </button>
          </div>
        </div>

        {/* Card View */}
        {viewMode === 'card' && (
          <>
            {filteredOrders.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                {filteredOrders.map((item) => (
                  <Card key={item.id} style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>{item.doNo}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.customerName}</div>
                      </div>
                      <span className={`status-badge status-${item.status?.toLowerCase()}`}>
                        {item.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div>📅 Order Date: {item.orderDate || '-'}</div>
                      <div>🚚 Route: {item.routeName || '-'}</div>
                      <div>👤 Driver: {item.driverName || '-'}</div>
                      <div>🚛 Vehicle: {item.vehicleNo || '-'}</div>
                      {item.scheduledDate && <div>📆 Scheduled: {item.scheduledDate}</div>}
                    </div>
                    {item.items && item.items.length > 0 && (
                      <div style={{ fontSize: '11px', background: 'var(--bg-secondary)', padding: '6px', borderRadius: '4px', marginBottom: '10px' }}>
                        <div style={{ fontWeight: 600, marginBottom: '3px' }}>Items ({item.items.length})</div>
                        {item.items.slice(0, 3).map((itm, idx) => (
                          <div key={idx}>• {itm.product} ({itm.qty} {itm.unit || 'PCS'})</div>
                        ))}
                        {item.items.length > 3 && <div style={{ opacity: 0.7 }}>... and {item.items.length - 3} more</div>}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {item.status === 'Open' && (
                        <Button variant="success" onClick={() => handleStatusChange(item, 'Close')} style={{ fontSize: '10px', padding: '3px 6px', minHeight: '24px' }}>
                          Close
                        </Button>
                      )}
                      {item.status === 'Close' && (
                        <Button variant="secondary" onClick={() => handleStatusChange(item, 'Open')} style={{ fontSize: '10px', padding: '3px 6px', minHeight: '24px' }}>
                          Reopen
                        </Button>
                      )}
                      <Button variant="secondary" onClick={() => handleEdit(item)} style={{ fontSize: '10px', padding: '3px 6px', minHeight: '24px' }}>Edit</Button>
                      {item.status === 'Open' && !item.confirmed && (
                        <Button variant="primary" onClick={() => handleConfirmDO(item)} style={{ fontSize: '10px', padding: '3px 6px', minHeight: '24px' }}>Confirm DO</Button>
                      )}
                      {item.status === 'Open' && (
                        <Button variant="danger" onClick={() => handleDelete(item)} style={{ fontSize: '10px', padding: '3px 6px', minHeight: '24px' }}>Delete</Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                {searchQuery ? "No delivery orders found matching your search" : "No delivery orders data"}
              </div>
            )}
          </>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <Table columns={columns} data={filteredOrders} emptyMessage={searchQuery ? "No delivery orders found matching your search" : "No delivery orders data"} />
        )}
      </Card>

      {/* Form Dialog */}
      {showForm && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            overflow: 'auto',
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowForm(false);
              setEditingItem(null);
              setFormData({ 
                doNo: '', 
                orderDate: new Date().toISOString().split('T')[0], 
                customerCode: '', 
                customerName: '', 
                customerAddress: '', 
                items: [], 
                vehicleId: '', 
                driverId: '', 
                routeId: '', 
                status: 'Open', 
                scheduledDate: '', 
                notes: '' 
              });
            }
          }}
        >
          <div 
            style={{ 
              width: '90%', 
              maxWidth: '900px', 
              maxHeight: '90vh', 
              overflow: 'auto', 
              backgroundColor: 'var(--bg-primary)', 
              padding: '20px', 
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Card title={editingItem ? "Edit Delivery Order" : "Create New Delivery Order"}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <Input
              label="DO No"
              value={formData.doNo || ''}
              onChange={(v) => setFormData({ ...formData, doNo: v })}
              placeholder={editingItem ? "DO No" : "Auto-generated (leave empty)"}
              disabled={!editingItem} // Disable untuk new order, biar auto-generate
            />
            <Input
              label="Order Date"
              type="date"
              value={formData.orderDate || ''}
              onChange={(v) => setFormData({ ...formData, orderDate: v })}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Customer *
            </label>
            <select
              value={formData.customerCode || ''}
              onChange={(e) => {
                const customer = customers.find(c => c.kode === e.target.value);
                const customerAddress = customer?.alamat || customer?.deliveryAddress || '';
                
                // Auto-detect route berdasarkan alamat customer
                // Route bisa diubah manual setelah auto-detect
                const matchedRoute = findMatchingRoute(customerAddress);
                
                // Update formData dengan customer info dan auto-detected route
                setFormData({
                  ...formData,
                  customerCode: e.target.value,
                  customerName: customer?.nama || '',
                  customerAddress: customerAddress,
                  // Auto-fill route jika ditemukan (bisa diubah manual setelah ini)
                  routeId: matchedRoute?.id || '',
                  routeName: matchedRoute ? `${matchedRoute.routeName} (${matchedRoute.origin} - ${matchedRoute.destination})` : '',
                });
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
              <option value="">-- Pilih Customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.kode}>
                  {c.kode} - {c.nama}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Customer Address"
            value={formData.customerAddress || ''}
            onChange={(v) => setFormData({ ...formData, customerAddress: v })}
          />

          <div style={{ marginTop: '24px', marginBottom: '16px' }}>
            <h3 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>Items</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '8px', marginBottom: '8px' }}>
              <Input
                value={newItem.product}
                onChange={(v) => setNewItem({ ...newItem, product: v })}
                placeholder="Product/Description"
              />
              <input
                type="text"
                inputMode="numeric"
                value={qtyInputValue !== '' ? qtyInputValue : (newItem.qty > 0 ? String(newItem.qty) : '')}
                onFocus={(e) => {
                  const input = e.target as HTMLInputElement;
                  const currentQty = newItem.qty;
                  if (currentQty === 0 || currentQty === null || currentQty === undefined || String(currentQty) === '0') {
                    setQtyInputValue('');
                    input.value = '';
                  } else {
                    input.select();
                  }
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  const input = e.target as HTMLInputElement;
                  const currentQty = newItem.qty;
                  if (currentQty === 0 || currentQty === null || currentQty === undefined || String(currentQty) === '0') {
                    setQtyInputValue('');
                    input.value = '';
                  }
                }}
                onChange={(e) => {
                  e.stopPropagation();
                  let val = e.target.value;
                  val = val.replace(/[^\d.,]/g, '');
                  const cleaned = removeLeadingZero(val);
                  setQtyInputValue(cleaned);
                  setNewItem({ ...newItem, qty: cleaned === '' ? 0 : Number(cleaned) || 0 });
                }}
                onBlur={(e) => {
                  e.stopPropagation();
                  const val = e.target.value;
                  if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                    setNewItem({ ...newItem, qty: 0 });
                    setQtyInputValue('');
                  } else {
                    setNewItem({ ...newItem, qty: Number(val) });
                    setQtyInputValue('');
                  }
                }}
                onKeyDown={(e) => {
                  const input = e.target as HTMLInputElement;
                  const currentVal = input.value;
                  if ((currentVal === '' || currentVal === '0') && /^[1-9]$/.test(e.key)) {
                    e.preventDefault();
                    const newVal = e.key;
                    setQtyInputValue(newVal);
                    input.value = newVal;
                    setNewItem({ ...newItem, qty: Number(newVal) });
                  }
                }}
                placeholder="Qty"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <select
                  value={newItem.unit}
                  onChange={(e) => {
                    const selectedUnit = e.target.value;
                    setNewItem({ ...newItem, unit: selectedUnit, customUnit: selectedUnit === 'OTHER' ? newItem.customUnit : '' });
                    setShowCustomUnit(selectedUnit === 'OTHER');
                  }}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                >
                  <option value="PCS">PCS</option>
                  <option value="KG">KG</option>
                  <option value="TON">TON</option>
                  <option value="M3">M3</option>
                  <option value="M2">M²</option>
                  <option value="METER">METER</option>
                  <option value="LITER">LITER</option>
                  <option value="BOX">BOX</option>
                  <option value="PALLET">PALLET</option>
                  <option value="ROLL">ROLL</option>
                  <option value="SET">SET</option>
                  <option value="UNIT">UNIT</option>
                  <option value="LOT">LOT</option>
                  <option value="OTHER">OTHER</option>
                </select>
                {showCustomUnit && (
                  <Input
                    value={newItem.customUnit}
                    onChange={(v) => setNewItem({ ...newItem, customUnit: v })}
                    placeholder="Enter custom unit"
                  />
                )}
              </div>
              <Input
                value={newItem.description}
                onChange={(v) => setNewItem({ ...newItem, description: v })}
                placeholder="Notes"
              />
              <Button onClick={handleAddItem}>Add</Button>
            </div>
            {formData.items && formData.items.length > 0 && (
              <div style={{ border: '1px solid var(--border)', borderRadius: '4px', padding: '12px' }}>
                {formData.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: idx < formData.items!.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span>{item.product} - {item.qty} {item.unit} {item.description ? `(${item.description})` : ''}</span>
                    <Button variant="danger" onClick={() => handleRemoveItem(idx)}>Remove</Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-primary)', fontWeight: '500', fontSize: '13px' }}>
                Vehicle
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
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-primary)', fontWeight: '500', fontSize: '13px' }}>
                Driver
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
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-primary)', fontWeight: '500', fontSize: '13px' }}>
                Route <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>(auto-detect, pilih dari list, atau ketik manual)</span>
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={formData.routeName || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Cari route yang match dengan input
                    const matchedRoute = routes.find(r => {
                      const routeDisplay = `${r.routeName} (${r.origin} - ${r.destination})`;
                      const routeDisplayWithCustomer = `${r.routeName} (${r.origin} - ${r.destination}) [${r._customer || ''}]`;
                      return routeDisplay === value || 
                             routeDisplayWithCustomer === value ||
                             r.routeName === value ||
                             (r._customer && value.includes(r._customer));
                    });
                    
                    setFormData({ 
                      ...formData, 
                      routeId: matchedRoute?.id || '',
                      routeName: matchedRoute ? `${matchedRoute.routeName} (${matchedRoute.origin} - ${matchedRoute.destination})` : value, // Bisa input manual
                      // Auto-fill totalDeal dari _price route jika ada
                      totalDeal: matchedRoute?._price ? (matchedRoute._price + (matchedRoute.tollCost || 0) + (matchedRoute.fuelCost || 0)) : formData.totalDeal || 0,
                    });
                    
                    // Update totalDealInputValue jika route match
                    if (matchedRoute?._price) {
                      const total = matchedRoute._price + (matchedRoute.tollCost || 0) + (matchedRoute.fuelCost || 0);
                      setTotalDealInputValue(total > 0 ? String(total) : '');
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    // Saat blur, coba match dengan route yang ada
                    const matchedRoute = routes.find(r => {
                      const routeDisplay = `${r.routeName} (${r.origin} - ${r.destination})`;
                      const routeDisplayWithCustomer = `${r.routeName} (${r.origin} - ${r.destination}) [${r._customer || ''}]`;
                      return routeDisplay === value || 
                             routeDisplayWithCustomer === value ||
                             r.routeName === value ||
                             (r._customer && value.includes(r._customer));
                    });
                    
                    if (matchedRoute) {
                      const totalDeal = matchedRoute._price ? (matchedRoute._price + (matchedRoute.tollCost || 0) + (matchedRoute.fuelCost || 0)) : formData.totalDeal || 0;
                      setFormData({ 
                        ...formData, 
                        routeId: matchedRoute.id,
                        routeName: `${matchedRoute.routeName} (${matchedRoute.origin} - ${matchedRoute.destination})`,
                        // Auto-fill totalDeal dari _price route jika ada
                        totalDeal: totalDeal,
                      });
                      // Update totalDealInputValue
                      if (matchedRoute._price) {
                        setTotalDealInputValue(totalDeal > 0 ? String(totalDeal) : '');
                      }
                    }
                  }}
                  placeholder="Ketik route atau klik Select untuk pilih"
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
                <Button
                  variant="secondary"
                  onClick={() => setShowRouteDialog(true)}
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  Select
                </Button>
              </div>
              <datalist id={`route-list-${editingItem?.id || 'new'}`} style={{ display: 'none' }}>
                {routes
                  .filter(r => {
                    // Filter by status Active
                    if (r.status !== 'Active') return false;
                    // Jika ada search query di input, filter juga
                    const searchQuery = (formData.routeName || '').toLowerCase().trim();
                    if (searchQuery && searchQuery.length > 0) {
                      const routeDisplay = `${r.routeName} (${r.origin} - ${r.destination})`.toLowerCase();
                      const routeNameLower = (r.routeName || '').toLowerCase();
                      const originLower = (r.origin || '').toLowerCase();
                      const destLower = (r.destination || '').toLowerCase();
                      const customerLower = (r._customer || '').toLowerCase();
                      const routeCodeLower = (r.routeCode || '').toLowerCase();
                      return routeDisplay.includes(searchQuery) || 
                             routeNameLower.includes(searchQuery) ||
                             originLower.includes(searchQuery) ||
                             destLower.includes(searchQuery) ||
                             customerLower.includes(searchQuery) ||
                             routeCodeLower.includes(searchQuery);
                    }
                    return true;
                  })
                  .slice(0, 100) // Limit to 100 results untuk performa
                  .map(r => (
                    <option key={r.id} value={`${r.routeName} (${r.origin} - ${r.destination})`}>
                      {r.routeName} {r._customer ? `[${r._customer}]` : ''}
                    </option>
                  ))}
              </datalist>
            </div>
          </div>
          <Input
            label="Scheduled Date"
            type="date"
            value={formData.scheduledDate || ''}
            onChange={(v) => setFormData({ ...formData, scheduledDate: v })}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-primary)', fontWeight: '500', fontSize: '13px' }}>
                Total Deal (Rp)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={totalDealInputValue !== '' ? totalDealInputValue : (formData.totalDeal && formData.totalDeal > 0 ? String(formData.totalDeal) : '')}
                onFocus={(e) => {
                  const input = e.target as HTMLInputElement;
                  const currentVal = formData.totalDeal || 0;
                  if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                    setTotalDealInputValue('');
                    input.value = '';
                  } else {
                    input.select();
                  }
                }}
                onMouseDown={(e) => {
                  const input = e.target as HTMLInputElement;
                  const currentVal = formData.totalDeal || 0;
                  if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                    setTotalDealInputValue('');
                    input.value = '';
                  }
                }}
                onChange={(e) => {
                  let val = e.target.value;
                  val = val.replace(/[^\d.,]/g, '');
                  const cleaned = removeLeadingZero(val);
                  setTotalDealInputValue(cleaned);
                  setFormData({ ...formData, totalDeal: cleaned === '' ? 0 : Number(cleaned) || 0 });
                }}
                onBlur={(e) => {
                  const val = e.target.value;
                  if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                    setFormData({ ...formData, totalDeal: 0 });
                    setTotalDealInputValue('');
                  } else {
                    setFormData({ ...formData, totalDeal: Number(val) });
                    setTotalDealInputValue('');
                  }
                }}
                onKeyDown={(e) => {
                  const input = e.target as HTMLInputElement;
                  const currentVal = input.value;
                  if ((currentVal === '' || currentVal === '0') && /^[1-9]$/.test(e.key)) {
                    e.preventDefault();
                    const newVal = e.key;
                    setTotalDealInputValue(newVal);
                    input.value = newVal;
                    setFormData({ ...formData, totalDeal: Number(newVal) });
                  }
                }}
                placeholder="0"
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                }}
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-primary)', fontWeight: '500', fontSize: '13px' }}>
                Discount (%)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={discountInputValue !== '' ? discountInputValue : (formData.discountPercent && formData.discountPercent > 0 ? String(formData.discountPercent) : '')}
                onFocus={(e) => {
                  const input = e.target as HTMLInputElement;
                  const currentVal = formData.discountPercent || 0;
                  if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                    setDiscountInputValue('');
                    input.value = '';
                  } else {
                    input.select();
                  }
                }}
                onMouseDown={(e) => {
                  const input = e.target as HTMLInputElement;
                  const currentVal = formData.discountPercent || 0;
                  if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                    setDiscountInputValue('');
                    input.value = '';
                  }
                }}
                onChange={(e) => {
                  let val = e.target.value;
                  val = val.replace(/[^\d.,]/g, '');
                  const cleaned = removeLeadingZero(val);
                  setDiscountInputValue(cleaned);
                  const discount = cleaned === '' ? 0 : Number(cleaned) || 0;
                  // Max 100%
                  const finalDiscount = discount > 100 ? 100 : discount;
                  setFormData({ ...formData, discountPercent: finalDiscount });
                  if (discount > 100) {
                    setDiscountInputValue('100');
                  }
                }}
                onBlur={(e) => {
                  const val = e.target.value;
                  if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                    setFormData({ ...formData, discountPercent: 0 });
                    setDiscountInputValue('');
                  } else {
                    const discount = Number(val);
                    const finalDiscount = discount > 100 ? 100 : discount;
                    setFormData({ ...formData, discountPercent: finalDiscount });
                    setDiscountInputValue('');
                  }
                }}
                onKeyDown={(e) => {
                  const input = e.target as HTMLInputElement;
                  const currentVal = input.value;
                  if ((currentVal === '' || currentVal === '0') && /^[1-9]$/.test(e.key)) {
                    e.preventDefault();
                    const newVal = e.key;
                    setDiscountInputValue(newVal);
                    input.value = newVal;
                    setFormData({ ...formData, discountPercent: Number(newVal) });
                  }
                }}
                placeholder="0"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>
          <Input
            label="Notes"
            value={formData.notes || ''}
            onChange={(v) => setFormData({ ...formData, notes: v })}
          />
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <Button onClick={() => { 
                  setShowForm(false); 
                  setEditingItem(null); 
                  setFormData({ 
                    doNo: '', 
                    orderDate: new Date().toISOString().split('T')[0], 
                    customerCode: '', 
                    customerName: '', 
                    customerAddress: '', 
                    items: [], 
                    vehicleId: '', 
                    driverId: '', 
                    routeId: '', 
                    status: 'Open', 
                    scheduledDate: '', 
                    notes: '' 
                  }); 
                }} variant="secondary">
                  Cancel
                </Button>
                <Button onClick={handleSave} variant="primary">
                  {editingItem ? 'Update Order' : 'Save Order'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
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

      {/* Route Selection Dialog */}
      {showRouteDialog && (
        <div className="dialog-overlay" onClick={() => {
          setShowRouteDialog(false);
          setRouteDialogSearch('');
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <Card
              title="Select Route"
              className="dialog-card"
            >
              <div style={{ marginBottom: '16px' }}>
                <input
                  type="text"
                  value={routeDialogSearch}
                  onChange={(e) => setRouteDialogSearch(e.target.value)}
                  placeholder="Search by route name, origin, or destination..."
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div style={{ 
                maxHeight: '60vh', 
                overflowY: 'auto',
                border: '1px solid var(--border)',
                borderRadius: '4px',
              }}>
                {(() => {
                  const activeRoutes = routes.filter(r => r.status === 'Active');
                  let filtered = activeRoutes;
                  if (routeDialogSearch) {
                    const query = routeDialogSearch.toLowerCase();
                    filtered = activeRoutes.filter(r => {
                      const routeName = (r.routeName || '').toLowerCase();
                      const origin = (r.origin || '').toLowerCase();
                      const destination = (r.destination || '').toLowerCase();
                      return routeName.includes(query) || origin.includes(query) || destination.includes(query);
                    });
                  }
                  const filteredRoutes = filtered.slice(0, 200);
                  
                  if (filteredRoutes.length === 0) {
                    return (
                      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No routes found
                      </div>
                    );
                  }
                  
                  return (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-tertiary)', zIndex: 10 }}>
                        <tr>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid var(--border)' }}>Route Name</th>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid var(--border)' }}>Origin</th>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid var(--border)' }}>Destination</th>
                          <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid var(--border)' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRoutes.map(r => {
                          const handleSelect = () => {
                            const routeDisplay = `${r.routeName} (${r.origin} - ${r.destination})`;
                            setFormData({ 
                              ...formData, 
                              routeId: r.id,
                              routeName: routeDisplay,
                              // Auto-fill totalDeal dari _price route jika ada
                              totalDeal: r._price ? (r._price + (r.tollCost || 0) + (r.fuelCost || 0)) : formData.totalDeal || 0,
                            });
                            
                            // Update totalDealInputValue jika route match
                            if (r._price) {
                              const total = r._price + (r.tollCost || 0) + (r.fuelCost || 0);
                              setTotalDealInputValue(total > 0 ? String(total) : '');
                            }
                            
                            setShowRouteDialog(false);
                            setRouteDialogSearch('');
                          };
                          return (
                            <tr
                              key={r.id}
                              style={{
                                borderBottom: '1px solid var(--border)',
                                cursor: 'pointer',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              onClick={handleSelect}
                            >
                              <td style={{ padding: '12px' }}>{r.routeName || '-'}</td>
                              <td style={{ padding: '12px' }}>{r.origin || '-'}</td>
                              <td style={{ padding: '12px' }}>{r.destination || '-'}</td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <Button
                                  variant="primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelect();
                                  }}
                                  style={{ fontSize: '12px', padding: '4px 12px' }}
                                >
                                  Select
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Showing {(() => {
                    const activeRoutes = routes.filter(r => r.status === 'Active');
                    let filtered = activeRoutes;
                    if (routeDialogSearch) {
                      const query = routeDialogSearch.toLowerCase();
                      filtered = activeRoutes.filter(r => {
                        const routeName = (r.routeName || '').toLowerCase();
                        const origin = (r.origin || '').toLowerCase();
                        const destination = (r.destination || '').toLowerCase();
                        return routeName.includes(query) || origin.includes(query) || destination.includes(query);
                      });
                    }
                    return Math.min(filtered.length, 200);
                  })()} of {(() => {
                    const activeRoutes = routes.filter(r => r.status === 'Active');
                    if (routeDialogSearch) {
                      const query = routeDialogSearch.toLowerCase();
                      return activeRoutes.filter(r => {
                        const routeName = (r.routeName || '').toLowerCase();
                        const origin = (r.origin || '').toLowerCase();
                        const destination = (r.destination || '').toLowerCase();
                        return routeName.includes(query) || origin.includes(query) || destination.includes(query);
                      }).length;
                    }
                    return activeRoutes.length;
                  })()} route{Math.min(routes.filter(r => r.status === 'Active').length, 200) !== 1 ? 's' : ''}
                  {routes.filter(r => r.status === 'Active').length >= 200 && (
                    <span style={{ color: '#ff9800', marginLeft: '8px' }}>
                      (Limited to 200. Use search to narrow down)
                    </span>
                  )}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowRouteDialog(false);
                    setRouteDialogSearch('');
                  }}
                >
                  Close
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

    </div>
  );
};

export default DeliveryOrders;


