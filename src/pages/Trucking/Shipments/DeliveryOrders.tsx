import { useState, useEffect, useMemo } from 'react';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import DateRangeFilter from '../../../components/DateRangeFilter';
import { storageService, StorageKeys } from '../../../services/storage';
import { deleteTruckingItem, reloadTruckingData, filterActiveItems } from '../../../utils/trucking-delete-helper';
import { setupRealTimeSync, TRUCKING_SYNC_KEYS } from '../../../utils/real-time-sync-helper';
import { useDialog } from '../../../hooks/useDialog';
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
  scheduledTime?: string; // Time for scheduled delivery
  actualDeliveryDate?: string;
  notes?: string;
  totalWeight?: number;
  totalVolume?: number;
  customerDirectDeal?: number; // Customer-Direct-Deal (harga deal langsung dengan customer)
  customerVendorDeal?: number; // Customer-Vendor-Deal (harga deal dengan vendor/supplier)
  totalDeal?: number; // Total Deal (total keseluruhan)
  discountPercent?: number; // Discount percentage (optional, for calculation)
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
  // Custom Dialog - menggunakan hook terpusat
  const { showAlert: showAlertBase, showConfirm: showConfirmBase, DialogComponent } = useDialog();
  
  // Wrapper untuk kompatibilitas dengan urutan parameter yang berbeda
  const showAlert = (message: string, title: string = 'Information') => {
    showAlertBase(message, title);
  };
  
  const showConfirm = (message: string, onConfirm: () => void, onCancel?: () => void, title: string = 'Confirmation') => {
    showConfirmBase(message, onConfirm, onCancel, title);
  };

  const [editingItem, setEditingItem] = useState<DeliveryOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
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
    customerDirectDeal: 0,
    customerVendorDeal: 0,
    totalDeal: 0,
    discountPercent: 0,
  });
  const [newItem, setNewItem] = useState({ product: '', qty: 0, unit: 'PCS', description: '', customUnit: '' });
  const [showCustomUnit, setShowCustomUnit] = useState(false);
  const [qtyInputValue, setQtyInputValue] = useState<string>(''); // State untuk manage qty input display
  const [customerDirectDealInputValue, setCustomerDirectDealInputValue] = useState<string>(''); // State untuk customer direct deal input
  const [customerVendorDealInputValue, setCustomerVendorDealInputValue] = useState<string>(''); // State untuk customer vendor deal input
  const [discountInputValue, setDiscountInputValue] = useState<string>(''); // State untuk discount input

  useEffect(() => {
    loadData();
    
    // Real-time listener untuk server updates
    const cleanup = setupRealTimeSync({
      keys: [TRUCKING_SYNC_KEYS.DELIVERY_ORDERS, TRUCKING_SYNC_KEYS.CUSTOMERS, TRUCKING_SYNC_KEYS.VEHICLES, TRUCKING_SYNC_KEYS.DRIVERS, TRUCKING_SYNC_KEYS.ROUTES],
      onUpdate: loadData,
    });
    
    return cleanup;
  }, []);

  const loadData = async () => {
    // Load semua data menggunakan storageService untuk membaca dari file storage juga
    const [ordersDataRaw, customersData, vehiclesData, driversData, routesData] = await Promise.all([
      storageService.get<DeliveryOrder[]>(StorageKeys.TRUCKING.DELIVERY_ORDERS),
      storageService.get<any[]>(StorageKeys.TRUCKING.CUSTOMERS),
      storageService.get<any[]>(StorageKeys.TRUCKING.VEHICLES),
      storageService.get<any[]>(StorageKeys.TRUCKING.DRIVERS),
      storageService.get<any[]>(StorageKeys.TRUCKING.ROUTES),
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
      // Ensure items is always an array for validation
      const items = Array.isArray(formData.items) ? formData.items : [];
      if (!formData.customerCode || items.length === 0) {
        showAlert('Customer dan Items harus diisi', 'Information');
        return;
      }

      const customer = customers.find(c => c.kode === formData.customerCode);
      const vehicle = vehicles.find(v => v.id === formData.vehicleId);
      const driver = drivers.find(d => d.id === formData.driverId);
      const route = routes.find(r => r.id === formData.routeId);

      // Load semua data menggunakan storageService untuk membaca dari file storage juga
      const allOrdersRaw = await storageService.get<DeliveryOrder[]>(StorageKeys.TRUCKING.DELIVERY_ORDERS);
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
        await storageService.set(StorageKeys.TRUCKING.DELIVERY_ORDERS, updated);
        
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
        await storageService.set(StorageKeys.TRUCKING.DELIVERY_ORDERS, updated);
        
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
        customerDirectDeal: 0,
        customerVendorDeal: 0,
        totalDeal: 0,
        discountPercent: 0,
      });
      setNewItem({ product: '', qty: 0, unit: 'PCS', description: '', customUnit: '' });
      setShowCustomUnit(false);
      setQtyInputValue('');
      setCustomerDirectDealInputValue('');
      setCustomerVendorDealInputValue('');
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
    setCustomerDirectDealInputValue(item.customerDirectDeal && item.customerDirectDeal > 0 ? String(item.customerDirectDeal) : '');
    setCustomerVendorDealInputValue(item.customerVendorDeal && item.customerVendorDeal > 0 ? String(item.customerVendorDeal) : '');
    setDiscountInputValue(item.discountPercent && item.discountPercent > 0 ? String(item.discountPercent) : '');
    setShowForm(true);
  };

  const handleDelete = async (item: DeliveryOrder) => {
    try {
      console.log('[Trucking DeliveryOrders] handleDelete called for:', item?.doNo, item?.id);
      
      if (!item || !item.doNo) {
        showAlert('Delivery Order tidak valid. Mohon coba lagi.', 'Error');
        return;
      }
      
      // Validate item.id exists
      if (!item.id) {
        console.error('[Trucking DeliveryOrders] Delivery Order missing ID:', item);
        showAlert(`❌ Error: Delivery Order "${item.doNo}" tidak memiliki ID. Tidak bisa dihapus.`, 'Error');
        return;
      }
      
      showConfirm(
        `Hapus Delivery Order "${item.doNo}"?\n\n⚠️ Data akan dihapus dengan aman (tombstone pattern) untuk mencegah auto-sync mengembalikan data.\n\nTindakan ini tidak bisa dibatalkan.`,
        async () => {
          try {
            // 🚀 FIX: Pakai Trucking delete helper untuk konsistensi dan sync yang benar
            const deleteResult = await deleteTruckingItem(StorageKeys.TRUCKING.DELIVERY_ORDERS, item.id, 'id');
            
            if (deleteResult.success) {
              // Reload data dengan helper (handle race condition)
              const activeOrders = await reloadTruckingData(StorageKeys.TRUCKING.DELIVERY_ORDERS, setOrders);
              // Sort by orderDate descending (newest first)
              const sortedUpdated = [...activeOrders].sort((a, b) => {
                const dateA = a.orderDate ? new Date(a.orderDate).getTime() : (a.created ? new Date(a.created).getTime() : 0);
                const dateB = b.orderDate ? new Date(b.orderDate).getTime() : (b.created ? new Date(b.created).getTime() : 0);
                return dateB - dateA; // Newest first
              });
              setOrders(sortedUpdated.map((o, idx) => ({ ...o, no: idx + 1 })));
              showAlert(`✅ Delivery Order "${item.doNo}" berhasil dihapus dengan aman.\n\n🛡️ Data dilindungi dari auto-sync restoration.`, 'Success');
            } else {
              console.error('[Trucking DeliveryOrders] Delete failed:', deleteResult.error);
              showAlert(`❌ Error deleting delivery order "${item.doNo}": ${deleteResult.error || 'Unknown error'}`, 'Error');
            }
          } catch (error: any) {
            console.error('[Trucking DeliveryOrders] Error deleting delivery order:', error);
            showAlert(`❌ Error deleting delivery order: ${error.message}`, 'Error');
          }
        },
        undefined,
        'Safe Delete Confirmation'
      );
    } catch (error: any) {
      console.error('[Trucking DeliveryOrders] Error in handleDelete:', error);
      showAlert(`Error: ${error.message}`, 'Error');
    }
  };

  const handleConfirmDO = async (item: DeliveryOrder) => {
    try {
      // Load semua data menggunakan storageService
      const allOrdersRaw = await storageService.get<DeliveryOrder[]>(StorageKeys.TRUCKING.DELIVERY_ORDERS);
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
      await storageService.set(StorageKeys.TRUCKING.DELIVERY_ORDERS, updated);
      
      // Filter out deleted items untuk display menggunakan helper function
      const activeOrders = filterActiveItems(updated);
      
      setOrders(activeOrders.map((o, idx) => ({ ...o, no: idx + 1 })));

      // 🚀 AUTO-CREATE PETTY CASH REQUEST langsung saat DO di-confirm
      // Petty Cash harus dibuat dan di-distribusi dulu sebelum bisa create Surat Jalan
      let pettyCashCreated = false;
      let pettyCashNo = '';
      
      // ✅ ALWAYS create Petty Cash when DO is confirmed (even without driver)
      const allPettyCashRaw = await storageService.get<any[]>(StorageKeys.TRUCKING.PETTY_CASH_REQUESTS);
      const allPettyCash = Array.isArray(allPettyCashRaw) ? allPettyCashRaw : 
                          (allPettyCashRaw && typeof allPettyCashRaw === 'object' && 'value' in allPettyCashRaw && Array.isArray((allPettyCashRaw as any).value) ? (allPettyCashRaw as any).value : []);
      
      const existingPettyCash = allPettyCash.find((pc: any) => 
        pc.doNo === item.doNo && !pc.deleted
      );
      
      if (!existingPettyCash) {
        // Load drivers data jika ada driver assigned
        let driver = null;
        if (item.driverId) {
          const driversDataRaw = await storageService.get<any[]>(StorageKeys.TRUCKING.DRIVERS);
          const driversData = driversDataRaw || drivers;
          driver = driversData.find((d: any) => d.id === item.driverId);
        }
        
        // Generate requestNo (format sama seperti di PettyCash.tsx)
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
        const requestNo = `PC-${year}${month}${day}-${random}`;
        pettyCashNo = requestNo;
        
        const now = new Date();
        const newPettyCash = {
          id: Date.now().toString(),
          no: allPettyCash.length + 1,
          requestNo: requestNo,
          driverId: driver?.id || item.driverId || '',
          driverName: driver?.name || item.driverName || 'Belum',
          driverCode: driver?.driverCode || '',
          amount: item.totalDeal || 0, // Auto-fill dari DO totalDeal
          purpose: `Uang jalan untuk DO ${item.doNo}`,
          description: `Petty cash untuk delivery order ${item.doNo} - ${item.customerName || ''}`,
          requestDate: now.toISOString().split('T')[0],
          status: 'Open', // Status awal Open (bukan Pending)
          doNo: item.doNo, // Reference ke DO
          notes: item.notes || '',
          created: now.toISOString(),
          lastUpdate: now.toISOString(),
          timestamp: now.getTime(),
          _timestamp: now.getTime(),
        };
        
        const updatedPettyCash = [...allPettyCash, newPettyCash];
        await storageService.set(StorageKeys.TRUCKING.PETTY_CASH_REQUESTS, updatedPettyCash);
        
        // 🚀 SEND NOTIFICATION to Petty Cash module
        try {
          const allNotificationsRaw = await storageService.get<any[]>(StorageKeys.TRUCKING.PETTY_CASH_NOTIFICATIONS);
          const allNotifications = Array.isArray(allNotificationsRaw) ? allNotificationsRaw : 
                                  (allNotificationsRaw && typeof allNotificationsRaw === 'object' && 'value' in allNotificationsRaw && Array.isArray((allNotificationsRaw as any).value) ? (allNotificationsRaw as any).value : []);
          
          const newNotification = {
            id: Date.now().toString(),
            type: 'PETTY_CASH_REQUESTED',
            status: 'Open',
            pettyCashNo: requestNo,
            doNo: item.doNo,
            driverId: driver?.id || item.driverId || '',
            driverName: driver?.name || item.driverName || 'Belum',
            customerName: item.customerName || '',
            amount: item.totalDeal || 0, // Auto-fill dari DO totalDeal
            created: new Date().toISOString(),
            timestamp: Date.now(),
          };
          
          const updatedNotifications = [...allNotifications, newNotification];
          await storageService.set(StorageKeys.TRUCKING.PETTY_CASH_NOTIFICATIONS, updatedNotifications);
          console.log(`📢 [DeliveryOrder] Sent notification to Petty Cash for ${requestNo}`);
        } catch (notifError) {
          console.warn(`⚠️ [DeliveryOrder] Failed to send Petty Cash notification:`, notifError);
          // Don't fail the whole operation if notification fails
        }
        
        // Small delay untuk memastikan background sync selesai
        await new Promise(resolve => setTimeout(resolve, 500));
        
        pettyCashCreated = true;
        console.log(`✅ [DeliveryOrder] Auto-created Petty Cash Request ${requestNo} for DO ${item.doNo}${driver ? ` (Driver: ${driver.name})` : ' (No driver assigned yet)'}`);
      } else {
        pettyCashNo = existingPettyCash.requestNo;
        console.log(`ℹ️ [DeliveryOrder] Petty Cash already exists for DO ${item.doNo}: ${existingPettyCash.requestNo}`);
      }
      
      showAlert(
        `✅ Delivery Order ${item.doNo} confirmed!\n\n` +
        (pettyCashCreated 
          ? `📋 Petty Cash Request ${pettyCashNo} telah dibuat otomatis.\n` +
            `💰 Silakan isi amount${!item.driverId ? ', assign driver,' : ','} approve, dan distribusi Petty Cash di menu Finance > Petty Cash.\n` +
            `📄 Surat Jalan akan otomatis dibuat saat Petty Cash di-distribusi.`
          : `📋 Petty Cash Request ${pettyCashNo} sudah ada.\n` +
            `💰 Silakan cek di menu Finance > Petty Cash.`
        ),
        'DO Confirmed'
      );
    } catch (error: any) {
      console.error('Error confirming DO:', error);
      showAlert(`Error confirming DO: ${error.message}`, 'Error');
    }
  };

  const handleStatusChange = async (item: DeliveryOrder, newStatus: DeliveryOrder['status']) => {
    try {
      // Load semua data menggunakan storageService
      const allOrdersRaw = await storageService.get<DeliveryOrder[]>(StorageKeys.TRUCKING.DELIVERY_ORDERS);
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
      await storageService.set(StorageKeys.TRUCKING.DELIVERY_ORDERS, updated);
      
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
    let filtered = (orders || []).filter(order => {
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
    
    // Date filter
    if (dateFrom) {
      filtered = filtered.filter(order => {
        const orderDate = order.orderDate || order.created || '';
        return orderDate >= dateFrom;
      });
    }
    if (dateTo) {
      filtered = filtered.filter(order => {
        const orderDate = order.orderDate || order.created || '';
        return orderDate <= dateTo;
      });
    }
    
    // Sort by orderDate (newest first)
    return filtered.sort((a, b) => {
      const dateA = a.orderDate ? new Date(a.orderDate).getTime() : (a.created ? new Date(a.created).getTime() : 0);
      const dateB = b.orderDate ? new Date(b.orderDate).getTime() : (b.created ? new Date(b.created).getTime() : 0);
      return dateB - dateA; // Newest first
    });
  }, [orders, searchQuery, dateFrom, dateTo]);

  const handleImportExcel = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls';
    input.onchange = async (e: any) => {
      try {
        const file = e.target.files[0];
        if (!file) return;

        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          showAlert('File Excel kosong atau format tidak sesuai', 'Error');
          return;
        }

        // Parse data dari Excel
        const importedOrders: DeliveryOrder[] = [];
        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          try {
            // Parse tanggal dari berbagai format
            const parseDate = (dateValue: any): string => {
              if (!dateValue) return new Date().toISOString().split('T')[0];
              
              // Jika sudah format YYYY-MM-DD
              if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
                return dateValue;
              }
              
              // Jika format DD Month YYYY (contoh: "02 Januari 2026")
              if (typeof dateValue === 'string') {
                const monthMap: Record<string, string> = {
                  'januari': '01', 'februari': '02', 'maret': '03', 'april': '04',
                  'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08',
                  'september': '09', 'oktober': '10', 'november': '11', 'desember': '12'
                };
                
                const parts = dateValue.toLowerCase().split(' ');
                if (parts.length === 3) {
                  const day = parts[0].padStart(2, '0');
                  const month = monthMap[parts[1]];
                  const year = parts[2];
                  if (month) {
                    return `${year}-${month}-${day}`;
                  }
                }
              }
              
              // Jika Excel serial number
              if (typeof dateValue === 'number') {
                const date = new Date((dateValue - 25569) * 86400 * 1000);
                return date.toISOString().split('T')[0];
              }
              
              // Fallback: coba parse as Date
              const date = new Date(dateValue);
              if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
              }
              
              return new Date().toISOString().split('T')[0];
            };

            // Parse price (hapus "Rp", spasi, koma, titik)
            const parsePrice = (priceValue: any): number => {
              if (!priceValue) return 0;
              if (typeof priceValue === 'number') return priceValue;
              
              const cleaned = String(priceValue)
                .replace(/Rp/gi, '')
                .replace(/\s/g, '')
                .replace(/\./g, '')
                .replace(/,/g, '');
              
              return parseFloat(cleaned) || 0;
            };

            const doNo = row['DO NO'] || row['doNo'] || generateDONo();
            const orderDate = parseDate(row['ORDER DATE'] || row['orderDate']);
            const customerName = row['CUSTOMER'] || row['customer'] || row['customerName'] || '';
            const vehicleNo = row['VEHICLE'] || row['vehicle'] || row['vehicleNo'] || '';
            const driverName = row['DRIVER'] || row['driver'] || row['driverName'] || '';
            const origin = row['ORI'] || row['Ori'] || row['origin'] || '';
            const routeName = row['ROUTE'] || row['route'] || row['routeName'] || '';
            const status = (row['STATUS'] || row['status'] || 'Open').toUpperCase() === 'OPEN' ? 'Open' : 'Close';
            const customerDirectDeal = parsePrice(row['Customer-direct-deal'] || row['CUSTOMER-DIRECT-DEAL'] || row['customerDirectDeal'] || 0);
            const customerVendorDeal = parsePrice(row['Customer-vendor-deal'] || row['CUSTOMER-VENDOR-DEAL'] || row['customerVendorDeal'] || 0);

            // Validasi minimal
            if (!customerName) {
              errors.push(`Baris ${i + 2}: Customer name kosong`);
              errorCount++;
              continue;
            }

            // Cari customer berdasarkan nama (case insensitive)
            const customer = customers.find(c => 
              c.nama?.toLowerCase().includes(customerName.toLowerCase()) ||
              customerName.toLowerCase().includes(c.nama?.toLowerCase())
            );

            // Cari vehicle berdasarkan vehicleNo (case insensitive, flexible matching)
            const vehicle = vehicles.find(v => {
              if (!v.vehicleNo || !vehicleNo) return false;
              const vNoClean = v.vehicleNo.toLowerCase().replace(/[\s-]/g, '');
              const searchClean = vehicleNo.toLowerCase().replace(/[\s-]/g, '');
              return vNoClean === searchClean || 
                     vNoClean.includes(searchClean) || 
                     searchClean.includes(vNoClean);
            });

            // Cari driver berdasarkan nama (case insensitive, flexible matching)
            const driver = drivers.find(d => {
              if (!d.name || !driverName) return false;
              const dNameClean = d.name.toLowerCase().trim();
              const searchClean = driverName.toLowerCase().trim();
              return dNameClean === searchClean ||
                     dNameClean.includes(searchClean) ||
                     searchClean.includes(dNameClean);
            });

            // Cari route berdasarkan routeName atau origin-destination
            const route = routes.find(r => 
              r.routeName?.toLowerCase().includes(routeName.toLowerCase()) ||
              routeName.toLowerCase().includes(r.routeName?.toLowerCase()) ||
              (origin && r.origin?.toLowerCase().includes(origin.toLowerCase()))
            );

            // Log untuk debugging jika tidak ketemu
            if (vehicleNo && !vehicle) {
              console.warn(`[Import] Vehicle not found: "${vehicleNo}"`);
            }
            if (driverName && !driver) {
              console.warn(`[Import] Driver not found: "${driverName}"`);
            }

            // Hitung discount percent jika ada perbedaan antara direct deal dan vendor deal
            let discountPercent = 0;
            if (customerDirectDeal > 0 && customerVendorDeal > 0 && customerVendorDeal < customerDirectDeal) {
              discountPercent = ((customerDirectDeal - customerVendorDeal) / customerDirectDeal) * 100;
            }

            const newOrder: DeliveryOrder = {
              id: Date.now().toString() + '-' + i,
              no: orders.length + importedOrders.length + 1,
              doNo: doNo,
              orderDate: orderDate,
              customerCode: customer?.kode || '',
              customerName: customerName,
              customerAddress: customer?.alamat || customer?.deliveryAddress || '',
              items: [], // Items bisa di-edit manual setelah import
              vehicleId: vehicle?.id || '',
              vehicleNo: vehicleNo,
              driverId: driver?.id || '',
              driverName: driverName,
              routeId: route?.id || '',
              routeName: routeName || (route ? `${route.routeName} (${route.origin} - ${route.destination})` : ''),
              status: status as 'Open' | 'Close',
              scheduledDate: orderDate,
              notes: origin ? `Origin: ${origin}` : '',
              customerDirectDeal: customerDirectDeal, // Customer-Direct-Deal
              customerVendorDeal: customerVendorDeal, // Customer-Vendor-Deal
              totalDeal: (customerDirectDeal || 0) + (customerVendorDeal || 0), // Total Deal = sum of both
              discountPercent: discountPercent,
              confirmed: false,
              created: new Date().toISOString(),
            };

            importedOrders.push(newOrder);
            successCount++;
          } catch (error: any) {
            errors.push(`Baris ${i + 2}: ${error.message}`);
            errorCount++;
          }
        }

        if (importedOrders.length === 0) {
          showAlert('Tidak ada data yang berhasil diimport.\n\n' + errors.join('\n'), 'Error');
          return;
        }

        // Simpan ke storage
        const allOrdersRaw = await storageService.get<DeliveryOrder[]>(StorageKeys.TRUCKING.DELIVERY_ORDERS);
        const allOrders = allOrdersRaw || orders;
        const updated = [...allOrders, ...importedOrders];
        
        await storageService.set(StorageKeys.TRUCKING.DELIVERY_ORDERS, updated);
        
        // Filter dan sort
        const activeOrders = filterActiveItems(updated);
        const sortedUpdated = activeOrders.sort((a, b) => {
          const dateA = a.orderDate ? new Date(a.orderDate).getTime() : (a.created ? new Date(a.created).getTime() : 0);
          const dateB = b.orderDate ? new Date(b.orderDate).getTime() : (b.created ? new Date(b.created).getTime() : 0);
          return dateB - dateA;
        });
        setOrders(sortedUpdated.map((o, idx) => ({ ...o, no: idx + 1 })));

        // Count linked items
        const linkedCustomers = importedOrders.filter(o => o.customerCode).length;
        const linkedVehicles = importedOrders.filter(o => o.vehicleId).length;
        const linkedDrivers = importedOrders.filter(o => o.driverId).length;
        const linkedRoutes = importedOrders.filter(o => o.routeId).length;

        let message = `✅ Import berhasil!\n\n`;
        message += `📊 Total: ${jsonData.length} baris\n`;
        message += `✅ Berhasil: ${successCount}\n`;
        message += `\n🔗 Auto-Linked:\n`;
        message += `  • Customers: ${linkedCustomers}/${successCount}\n`;
        message += `  • Vehicles: ${linkedVehicles}/${successCount}\n`;
        message += `  • Drivers: ${linkedDrivers}/${successCount}\n`;
        message += `  • Routes: ${linkedRoutes}/${successCount}\n`;
        
        if (errorCount > 0) {
          message += `\n❌ Gagal: ${errorCount}\n`;
          message += `Error:\n${errors.slice(0, 5).join('\n')}`;
          if (errors.length > 5) {
            message += `\n... dan ${errors.length - 5} error lainnya`;
          }
        }
        
        // Warning jika ada yang tidak ter-link
        const notLinkedVehicles = successCount - linkedVehicles;
        const notLinkedDrivers = successCount - linkedDrivers;
        if (notLinkedVehicles > 0 || notLinkedDrivers > 0) {
          message += `\n\n⚠️ Warning:\n`;
          if (notLinkedVehicles > 0) {
            message += `  • ${notLinkedVehicles} vehicle(s) tidak ditemukan di master data\n`;
          }
          if (notLinkedDrivers > 0) {
            message += `  • ${notLinkedDrivers} driver(s) tidak ditemukan di master data\n`;
          }
          message += `\nSilakan cek console untuk detail atau tambahkan ke master data.`;
        }

        showAlert(message, 'Import Result');
      } catch (error: any) {
        showAlert(`Error importing Excel: ${error.message}`, 'Error');
      }
    };
    input.click();
  };

  const columns = [
    { key: 'no', header: 'No' },
    { key: 'doNo', header: 'DO No' },
    { key: 'orderDate', header: 'Order Date' },
    { key: 'customerName', header: 'Customer' },
    { 
      key: 'customerDirectDeal', 
      header: 'Customer-Direct-deal',
      render: (item: DeliveryOrder) => (
        <span>
          {item.customerDirectDeal && item.customerDirectDeal > 0 ? `Rp ${item.customerDirectDeal.toLocaleString('id-ID')}` : '-'}
        </span>
      ),
    },
    { 
      key: 'customerVendorDeal', 
      header: 'Customer-Vendor-deal',
      render: (item: DeliveryOrder) => (
        <span>
          {item.customerVendorDeal && item.customerVendorDeal > 0 ? `Rp ${item.customerVendorDeal.toLocaleString('id-ID')}` : '-'}
        </span>
      ),
    },
    { 
      key: 'totalDeal', 
      header: 'Total Deal',
      render: (item: DeliveryOrder) => (
        <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>
          {item.totalDeal && item.totalDeal > 0 ? `Rp ${item.totalDeal.toLocaleString('id-ID')}` : '-'}
        </span>
      ),
    },
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
        // Ensure items is always an array
        const items = Array.isArray(order.items) ? order.items : [];
        const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
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
          totalItems: items.length,
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
        // Ensure items is always an array
        const items = Array.isArray(order.items) ? order.items : [];
        items.forEach((item, idx) => {
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
        const outstandingData = outstandingOrders.map(order => {
          // Ensure items is always an array
          const items = Array.isArray(order.items) ? order.items : [];
          return {
            doNo: order.doNo,
            orderDate: order.orderDate,
            customerName: order.customerName,
            vehicleNo: order.vehicleNo || '',
            driverName: order.driverName || '',
            routeName: order.routeName || '',
            status: order.status,
            scheduledDate: order.scheduledDate || '',
            totalItems: items.length,
            totalQty: items.reduce((sum, item) => sum + (item.qty || 0), 0),
          };
        });

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
          <Button variant="secondary" onClick={handleImportExcel}>📤 Import Excel</Button>
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
                await storageService.set(StorageKeys.TRUCKING.CUSTOMERS, dummyCustomers);
                await storageService.set(StorageKeys.TRUCKING.VEHICLES, dummyVehicles);
                await storageService.set(StorageKeys.TRUCKING.DRIVERS, dummyDrivers);
                await storageService.set(StorageKeys.TRUCKING.ROUTES, dummyRoutes);
                
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
              flex: '1 1 260px',
              padding: '8px 12px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ flex: '1 1 400px', minWidth: '350px' }}>
            <DateRangeFilter
              onDateChange={(from, to) => {
                setDateFrom(from);
                setDateTo(to);
              }}
              defaultFrom={dateFrom}
              defaultTo={dateTo}
            />
          </div>
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
                    {(() => {
                      // Ensure items is always an array
                      const items = Array.isArray(item.items) ? item.items : [];
                      return items.length > 0 && (
                        <div style={{ fontSize: '11px', background: 'var(--bg-secondary)', padding: '6px', borderRadius: '4px', marginBottom: '10px' }}>
                          <div style={{ fontWeight: 600, marginBottom: '3px' }}>Items ({items.length})</div>
                          {items.slice(0, 3).map((itm, idx) => (
                            <div key={idx}>• {itm.product} ({itm.qty} {itm.unit || 'PCS'})</div>
                          ))}
                          {items.length > 3 && <div style={{ opacity: 0.7 }}>... and {items.length - 3} more</div>}
                        </div>
                      );
                    })()}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {item.status === 'Open' && !item.confirmed && (
                        <Button variant="primary" onClick={() => handleConfirmDO(item)} style={{ fontSize: '10px', padding: '3px 6px', minHeight: '24px' }}>Confirm DO</Button>
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
          <div style={{ marginBottom: '16px' }}>zzs
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
            {(() => {
              // Ensure formData.items is always an array
              const items = Array.isArray(formData.items) ? formData.items : [];
              return items.length > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: '4px', padding: '12px' }}>
                  {items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: idx < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <span>{item.product} - {item.qty} {item.unit} {item.description ? `(${item.description})` : ''}</span>
                      <Button variant="danger" onClick={() => handleRemoveItem(idx)}>Remove</Button>
                    </div>
                  ))}
                </div>
              );
            })()}
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
                    });
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
                      setFormData({ 
                        ...formData, 
                        routeId: matchedRoute.id,
                        routeName: `${matchedRoute.routeName} (${matchedRoute.origin} - ${matchedRoute.destination})`,
                      });
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-primary)', fontWeight: '500', fontSize: '13px' }}>
                Customer-Direct-Deal (Rp)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={customerDirectDealInputValue !== '' ? customerDirectDealInputValue : (formData.customerDirectDeal && formData.customerDirectDeal > 0 ? String(formData.customerDirectDeal) : '')}
                onFocus={(e) => {
                  const input = e.target as HTMLInputElement;
                  const currentVal = formData.customerDirectDeal || 0;
                  if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                    setCustomerDirectDealInputValue('');
                    input.value = '';
                  } else {
                    input.select();
                  }
                }}
                onMouseDown={(e) => {
                  const input = e.target as HTMLInputElement;
                  const currentVal = formData.customerDirectDeal || 0;
                  if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                    setCustomerDirectDealInputValue('');
                    input.value = '';
                  }
                }}
                onChange={(e) => {
                  let val = e.target.value;
                  val = val.replace(/[^\d.,]/g, '');
                  const cleaned = removeLeadingZero(val);
                  setCustomerDirectDealInputValue(cleaned);
                  const directDeal = cleaned === '' ? 0 : Number(cleaned) || 0;
                  const vendorDeal = formData.customerVendorDeal || 0;
                  setFormData({ 
                    ...formData, 
                    customerDirectDeal: directDeal,
                    totalDeal: directDeal + vendorDeal // Auto-calculate total
                  });
                }}
                onBlur={(e) => {
                  const val = e.target.value;
                  if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                    setFormData({ ...formData, customerDirectDeal: 0 });
                    setCustomerDirectDealInputValue('');
                  } else {
                    setFormData({ ...formData, customerDirectDeal: Number(val) });
                    setCustomerDirectDealInputValue('');
                  }
                }}
                onKeyDown={(e) => {
                  const input = e.target as HTMLInputElement;
                  const currentVal = input.value;
                  if ((currentVal === '' || currentVal === '0') && /^[1-9]$/.test(e.key)) {
                    e.preventDefault();
                    const newVal = e.key;
                    setCustomerDirectDealInputValue(newVal);
                    input.value = newVal;
                    const directDeal = Number(newVal);
                    const vendorDeal = formData.customerVendorDeal || 0;
                    setFormData({ 
                      ...formData, 
                      customerDirectDeal: directDeal,
                      totalDeal: directDeal + vendorDeal
                    });
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
                Customer-Vendor-Deal (Rp)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={customerVendorDealInputValue !== '' ? customerVendorDealInputValue : (formData.customerVendorDeal && formData.customerVendorDeal > 0 ? String(formData.customerVendorDeal) : '')}
                onFocus={(e) => {
                  const input = e.target as HTMLInputElement;
                  const currentVal = formData.customerVendorDeal || 0;
                  if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                    setCustomerVendorDealInputValue('');
                    input.value = '';
                  } else {
                    input.select();
                  }
                }}
                onMouseDown={(e) => {
                  const input = e.target as HTMLInputElement;
                  const currentVal = formData.customerVendorDeal || 0;
                  if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                    setCustomerVendorDealInputValue('');
                    input.value = '';
                  }
                }}
                onChange={(e) => {
                  let val = e.target.value;
                  val = val.replace(/[^\d.,]/g, '');
                  const cleaned = removeLeadingZero(val);
                  setCustomerVendorDealInputValue(cleaned);
                  const vendorDeal = cleaned === '' ? 0 : Number(cleaned) || 0;
                  const directDeal = formData.customerDirectDeal || 0;
                  setFormData({ 
                    ...formData, 
                    customerVendorDeal: vendorDeal,
                    totalDeal: directDeal + vendorDeal // Auto-calculate total
                  });
                }}
                onBlur={(e) => {
                  const val = e.target.value;
                  if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                    setFormData({ ...formData, customerVendorDeal: 0 });
                    setCustomerVendorDealInputValue('');
                  } else {
                    setFormData({ ...formData, customerVendorDeal: Number(val) });
                    setCustomerVendorDealInputValue('');
                  }
                }}
                onKeyDown={(e) => {
                  const input = e.target as HTMLInputElement;
                  const currentVal = input.value;
                  if ((currentVal === '' || currentVal === '0') && /^[1-9]$/.test(e.key)) {
                    e.preventDefault();
                    const newVal = e.key;
                    setCustomerVendorDealInputValue(newVal);
                    input.value = newVal;
                    const vendorDeal = Number(newVal);
                    const directDeal = formData.customerDirectDeal || 0;
                    setFormData({ 
                      ...formData, 
                      customerVendorDeal: vendorDeal,
                      totalDeal: directDeal + vendorDeal
                    });
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
                Total Deal (Rp) - Auto
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={formData.totalDeal && formData.totalDeal > 0 ? formData.totalDeal.toLocaleString('id-ID') : '0'}
                disabled
                readOnly
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--accent-color)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'not-allowed',
                }}
              />
            </div>
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-primary)', fontWeight: '500', fontSize: '13px' }}>
              Discount (%) - Optional
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
      {/* Custom Dialog - menggunakan DialogComponent dari useDialog hook */}
      <DialogComponent />

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
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid var(--border)' }}>Price (Rp)</th>
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
                              customerDirectDeal: r._price || 0, // 🚀 Populate price from route master
                            });
                            
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
                              <td style={{ padding: '12px', textAlign: 'right', fontWeight: '500' }}>
                                {r._price ? `Rp ${r._price.toLocaleString('id-ID')}` : '-'}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <Button
                                  variant="primary"
                                  onClick={(e?: React.MouseEvent<HTMLButtonElement>) => {
                                    e?.stopPropagation();
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


