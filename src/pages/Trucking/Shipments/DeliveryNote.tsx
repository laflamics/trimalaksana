import { useState, useEffect, useMemo, useRef } from 'react';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import DateRangeFilter from '../../../components/DateRangeFilter';
import NotificationBell from '../../../components/NotificationBell';
import { storageService, StorageKeys } from '../../../services/storage';
import { deleteTruckingItem, reloadTruckingData, filterActiveItems } from '../../../utils/trucking-delete-helper';
import { useDialog } from '../../../hooks/useDialog';
import { generateSuratJalanHtml } from '../../../pdf/suratjalan-pdf-template';
import { openPrintWindow, isMobile, isCapacitor, savePdfForMobile } from '../../../utils/actions';
import { loadLogoAsBase64 } from '../../../utils/logo-loader';
import BlobService from '../../../services/blob-service';
import '../../../styles/common.css';
import '../../../styles/compact.css';

// Action Menu Component untuk compact actions
const ActionMenu = ({ onReopen, onEdit, onViewPDF, onUploadSigned, onViewSigned, onDelete }: {
  onReopen?: () => void;
  onEdit: () => void;
  onViewPDF: () => void;
  onUploadSigned?: () => void;
  onViewSigned?: () => void;
  onDelete?: () => void;
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  useEffect(() => {
    if (showMenu && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: buttonRect.bottom + 4,
        right: window.innerWidth - buttonRect.right,
      });
    }
  }, [showMenu]);
  
  return (
    <>
      <div ref={buttonRef} style={{ position: 'relative', display: 'inline-block' }}>
        <Button 
          variant="secondary" 
          onClick={() => setShowMenu(!showMenu)}
          style={{ fontSize: '10px', padding: '3px 6px', minHeight: '24px' }}
        >
          ⋮
        </Button>
      </div>
      {showMenu && (
        <div 
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${menuPosition.top}px`,
            right: `${menuPosition.right}px`,
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 10000,
            minWidth: '160px',
            maxWidth: '220px',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column', // Ensure vertical layout
          }}
        >
          {onReopen && (
            <button
              onClick={() => { onReopen(); setShowMenu(false); }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '6px 10px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '11px',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              ↻ Reopen
            </button>
          )}
          <button
            onClick={() => { onEdit(); setShowMenu(false); }}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '6px 10px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '11px',
              borderRadius: '4px',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ✏️ Edit
          </button>
          <button
            onClick={() => { onViewPDF(); setShowMenu(false); }}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '6px 10px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '11px',
              borderRadius: '4px',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            📄 View PDF
          </button>
          {onUploadSigned && (
            <button
              onClick={() => { onUploadSigned(); setShowMenu(false); }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '6px 10px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '11px',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              📤 Upload Signed SJ
            </button>
          )}
          {onViewSigned && (
            <button
              onClick={() => { onViewSigned(); setShowMenu(false); }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '6px 10px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '11px',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              👁️ View Signed SJ
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => { onDelete(); setShowMenu(false); }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '6px 10px',
                border: 'none',
                background: 'transparent',
                color: '#EF4444',
                cursor: 'pointer',
                fontSize: '11px',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              🗑️ Delete
            </button>
          )}
        </div>
      )}
    </>
  );
};

interface DeliveryNoteItem {
  product: string;
  qty: number;
  unit: string;
  description?: string;
}

interface SignedDocument {
  document: string; // Base64 untuk image, atau file:// path untuk PDF
  path?: string; // Path ke file PDF di file system
  name: string;
  type: 'pdf' | 'image';
  uploadedAt?: string; // Timestamp saat upload
}

interface DeliveryNote {
  id: string;
  no: number;
  dnNo: string;
  doNo: string;
  customerName: string;
  customerAddress: string;
  driverId: string;
  driverName: string;
  driverCode: string;
  vehicleId: string;
  vehicleNo: string;
  routeId: string;
  routeName: string;
  items: DeliveryNoteItem[];
  pettyCashRequestNo?: string;
  transferProof?: string;
  transferProofName?: string;
  distributedDate?: string;
  scheduledDate: string;
  scheduledTime: string;
  // MinIO: Signed document stored on MinIO
  signedDocumentId?: string; // FileId stored on MinIO
  signedDocumentName?: string;
  // Backward compatibility - will be migrated to MinIO
  signedDocuments?: SignedDocument[];
  signedDocument?: string; // Deprecated - use signedDocumentId
  signedDocumentPath?: string; // Deprecated
  signedDocumentType?: 'pdf' | 'image'; // Deprecated
  departureDate?: string;
  departureTime?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  status: 'Open' | 'Close';
  notes?: string;
  created: string;
  lastUpdate?: string;
  timestamp?: number;
  _timestamp?: number;
  receivedDate?: string;
  receivedBy?: string;
}

// Format date function untuk Created column (sama seperti di SO)
const formatDateSimple = (dateString: string | undefined) => {
  if (!dateString) return { date: '-', time: '', full: '-' };
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return { date: '-', time: '', full: '-' };
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return {
      date: `${day}/${month}/${year}`,
      time: `${hours}:${minutes}:${seconds}`,
      full: `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
    };
  } catch {
    return { date: '-', time: '', full: '-' };
  }
};

const DeliveryNote = () => {
  const [deliveryNote, setDeliveryNote] = useState<DeliveryNote[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [deliveryOrders, setDeliveryOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [showReceiptDateDialog, setShowReceiptDateDialog] = useState(false);
  const [receiptDate, setReceiptDate] = useState('');
  const [pendingUploadItem, setPendingUploadItem] = useState<DeliveryNote | null>(null);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<DeliveryNote | null>(null);
  const [viewingDocuments, setViewingDocuments] = useState<SignedDocument[]>([]);
  const [viewingDocumentsItem, setViewingDocumentsItem] = useState<DeliveryNote | null>(null);
  const [selectedDocumentIndex, setSelectedDocumentIndex] = useState(0);
  const [notificationDialog, setNotificationDialog] = useState<{
    show: boolean;
    notif: any | null;
  }>({
    show: false,
    notif: null,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [formData, setFormData] = useState<Partial<DeliveryNote>>({
    dnNo: '',
    doNo: '',
    customerName: '',
    customerAddress: '',
    driverId: '',
    vehicleId: '',
    routeId: '',
    items: [],
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '08:00',
    status: 'Open',
    notes: '',
  });
  const [newItem, setNewItem] = useState({ product: '', qty: 0, unit: 'UNIT', description: '' });
  const [viewPdfData, setViewPdfData] = useState<{ html: string; dnNo: string } | null>(null);

  // Custom Dialog - menggunakan hook terpusat
  const { showAlert: showAlertBase, showConfirm: showConfirmBase, DialogComponent } = useDialog();
  
  // Wrapper untuk kompatibilitas dengan urutan parameter yang berbeda
  const showAlert = (message: string, title: string = 'Information') => {
    showAlertBase(message, title);
  };
  
  const showConfirm = (message: string, onConfirm: () => void, onCancel?: () => void, title: string = 'Confirmation') => {
    showConfirmBase(message, onConfirm, onCancel, title);
  };

  useEffect(() => {
    loadData();
    
    // Real-time listener untuk server updates
    const handleStorageChange = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string; action?: string }>).detail;
      const key = detail?.key;
      
      // Reload data jika ada update untuk Surat Jalan atau notifications
      if (key === StorageKeys.TRUCKING.SURAT_JALAN || key === StorageKeys.TRUCKING.SURAT_JALAN_NOTIFICATIONS || 
          key === StorageKeys.TRUCKING.DELIVERY_ORDERS || key === StorageKeys.TRUCKING.UNIT_SCHEDULES) {
        console.log(`[DeliveryNote] 🔄 Real-time update received for ${key}, reloading...`);
        loadData();
      }
    };
    
    window.addEventListener('app-storage-changed', handleStorageChange as EventListener);
    
    // Optimasi: Auto-refresh setiap 30 detik untuk mengurangi bandwidth (sebelumnya 5 detik)
    // Gunakan event-based updates untuk real-time changes
    const interval = setInterval(loadData, 30000); // 30 detik - cukup untuk delivery updates
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('app-storage-changed', handleStorageChange as EventListener);
    };
  }, []);

  const loadData = async () => {
    try {
      // Load semua data menggunakan storageService
      const [dnDataRaw, notifDataRaw, doDataRaw, , driversData, vehiclesData, routesData] = await Promise.all([
        storageService.get<DeliveryNote[]>(StorageKeys.TRUCKING.SURAT_JALAN),
        storageService.get<any[]>(StorageKeys.TRUCKING.SURAT_JALAN_NOTIFICATIONS),
        storageService.get<any[]>(StorageKeys.TRUCKING.DELIVERY_ORDERS),
        storageService.get<any[]>(StorageKeys.TRUCKING.UNIT_SCHEDULES),
        storageService.get<any[]>(StorageKeys.TRUCKING.DRIVERS),
        storageService.get<any[]>(StorageKeys.TRUCKING.VEHICLES),
        storageService.get<any[]>(StorageKeys.TRUCKING.ROUTES),
      ]);
      
      // Initialize empty arrays jika belum ada
      if (!dnDataRaw) {
        await storageService.set(StorageKeys.TRUCKING.SURAT_JALAN, []);
      }
      if (!notifDataRaw) {
        await storageService.set(StorageKeys.TRUCKING.SURAT_JALAN_NOTIFICATIONS, []);
      }

      // CRITICAL: Extract arrays from storage wrapper if needed
      const extractArray = <T,>(data: any): T[] => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object' && 'value' in data && Array.isArray(data.value)) {
          return data.value;
        }
        return [];
      };

      // Ensure arrays (handle null/undefined and storage wrappers)
      const dnData = extractArray(dnDataRaw);
      const notifData = extractArray(notifDataRaw);
      const doData = extractArray(doDataRaw);

      console.log(`📊 [DeliveryNote] Loaded data: ${dnData.length} DN, ${notifData.length} notifications, ${doData.length} DOs`);

      // Filter out deleted items menggunakan helper function
      const activeDN = filterActiveItems(dnData as Record<string, any>[]);
      const activeDOs = filterActiveItems(doData as Record<string, any>[]);
      
      // Sort by created date (newest first), fallback to scheduledDate if created not available
      const sortedDN = activeDN.sort((a, b) => {
        const dateA = a.created ? new Date(a.created).getTime() : (a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0);
        const dateB = b.created ? new Date(b.created).getTime() : (b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0);
        return dateB - dateA; // Newest first
      });
      setDeliveryNote(sortedDN.map((dn, idx) => ({ ...dn, no: idx + 1 } as DeliveryNote)));
      
      // Filter notifications: hanya yang belum dibuat DN-nya dan DO-nya masih ada
      // Hapus notification jika:
      // 1. Sudah di-delete (tombstone pattern)
      // 2. Sudah ada DN untuk DO yang sama
      // 3. DO-nya sudah di-delete (tombstone)
      const originalNotifsCount = notifData.length;
      console.log(`📊 [DeliveryNote] Processing ${originalNotifsCount} notifications, ${activeDOs.length} active DOs, ${activeDN.length} active DNs`);
      
      // CRITICAL: Filter deleted items FIRST menggunakan filterActiveItems
      const activeNotifData = filterActiveItems(notifData as Record<string, any>[]) || [];
      console.log(`📊 [DeliveryNote] After filtering deleted items: ${activeNotifData.length} active notifications (from ${originalNotifsCount} total)`);
      
      const allNotifs = (activeNotifData || []).filter((n: any) => {
        // Keep notification jika belum dibuat DN-nya
        if (n.type === 'DO_CONFIRMED' && (n.status || 'Open') === 'Open') {
          // CRITICAL FIX: Jika DO data kosong (belum ada file), jangan filter notification
          // Ini untuk handle case dimana DO belum pernah di-save ke file storage
          if (activeDOs.length === 0) {
            console.log(`⚠️ [DeliveryNote] No DO data found, keeping notification ${n.id} for DO ${n.doNo}`);
            // Cek apakah sudah ada DN untuk DO ini
            const hasDN = activeDN.some((dn: any) => dn.doNo === n.doNo);
            if (hasDN) {
              console.log(`🧹 [DeliveryNote] Filtering out notification for DO ${n.doNo} - DN already exists`);
              return false;
            }
            return true; // Keep notification jika DO data kosong (belum ada file)
          }
          
          // Cek apakah DO-nya sudah di-delete
          const doExists = activeDOs.some((doItem: any) => doItem.doNo === n.doNo);
          if (!doExists && n.doNo) {
            console.log(`🧹 [DeliveryNote] Filtering out notification for DO ${n.doNo} - DO already deleted`);
            return false; // Hapus notification jika DO-nya sudah di-delete
          }
          
          // Cek apakah sudah ada DN untuk DO ini
          const hasDN = activeDN.some((dn: any) => {
            const dnDoNo = dn.doNo;
            const notifDoNo = n.doNo;
            const match = dnDoNo === notifDoNo;
            if (match) {
              console.log(`🧹 [DeliveryNote] Found matching DN for notification: DO ${notifDoNo}, DN ${dn.dnNo}`);
            }
            return match;
          });
          if (hasDN) {
            console.log(`🧹 [DeliveryNote] Filtering out notification for DO ${n.doNo} - DN already exists`);
            return false; // Hapus notification yang sudah dibuat DN-nya
          }
        }
        return true; // Keep other notifications
      });
      
      // SELALU update notifications di storage untuk memastikan data konsisten
      // Hapus notification yang sudah tidak relevan (DO deleted atau sudah ada DN)
      // Update storage setiap kali ada perubahan atau jika ada notification yang perlu dihapus
      // Note: Keep deleted items (tombstones) in storage for sync, but don't include them in allNotifs
      // Merge allNotifs dengan deleted items dari original notifData untuk preserve tombstones
      const deletedNotifs = (notifData || []).filter((n: any) => n.deleted === true || n.deletedAt);
      const allNotifsWithTombstones = [...allNotifs, ...deletedNotifs];
      
      const shouldUpdate = allNotifs.length !== activeNotifData.length || 
        (activeNotifData || []).some((n: any) => {
          if (n.type === 'DO_CONFIRMED' && (n.status || 'Open') === 'Open') {
            // Cek apakah DO sudah di-delete
            const doExists = activeDOs.some((doItem: any) => doItem.doNo === n.doNo);
            if (!doExists && n.doNo) {
              return true; // Perlu update karena DO sudah di-delete
            }
            // Cek apakah sudah ada DN
            const hasDN = activeDN.some((dn: any) => dn.doNo === n.doNo);
            return hasDN;
          }
          return false;
        });
      
      if (shouldUpdate) {
        // Save dengan tombstones untuk sync
        await storageService.set(StorageKeys.TRUCKING.SURAT_JALAN_NOTIFICATIONS, allNotifsWithTombstones);
        console.log(`🧹 [DeliveryNote] Cleaned up ${activeNotifData.length - allNotifs.length} obsolete notifications (from ${activeNotifData.length} active to ${allNotifs.length} relevant)`);
      }
      
      // Filter untuk display: hanya yang PENDING, belum dibuat DN-nya, dan DO-nya masih ada
      // Note: allNotifs sudah di-filter untuk deleted items, jadi tidak perlu filter lagi
      const activeNotifs = allNotifs.filter((n: any) => {
        // Double-check: pastikan tidak deleted (shouldn't happen but safety check)
        if (n.deleted === true || n.deletedAt) {
          return false;
        }
        if (n.type !== 'PETTY_CASH_DISTRIBUTED' || (n.status || 'Open') !== 'Open') {
          return false;
        }
        // CRITICAL FIX: Jika DO data kosong (belum ada file), tetap tampilkan notification
        if (activeDOs.length === 0) {
          // Cek apakah sudah ada DN untuk DO ini
          const hasDN = activeDN.some((dn: any) => dn.doNo === n.doNo);
          if (hasDN) {
            console.log(`🧹 [DeliveryNote] Filtering out notification for display: DO ${n.doNo} - DN already exists`);
            return false;
          }
          return true; // Keep notification jika DO data kosong
        }
        // Double-check: pastikan DO-nya masih ada
        const doExists = activeDOs.some((doItem: any) => doItem.doNo === n.doNo);
        if (!doExists && n.doNo) {
          console.log(`🧹 [DeliveryNote] Filtering out notification for display: DO ${n.doNo} - DO already deleted`);
          return false;
        }
        // Double-check: pastikan tidak ada DN untuk DO ini
        const hasDN = activeDN.some((dn: any) => dn.doNo === n.doNo);
        if (hasDN) {
          console.log(`🧹 [DeliveryNote] Filtering out notification for display: DO ${n.doNo} - DN already exists`);
          return false;
        }
        return true;
      });
      
      console.log(`📊 [DeliveryNote] Notifications: ${originalNotifsCount} original, ${allNotifs.length} after filter, ${activeNotifs.length} for display`);
      setNotifications(activeNotifs);
      setDeliveryOrders(doData);
      setDrivers(extractArray(driversData));
      setVehicles(extractArray(vehiclesData));
      setRoutes(extractArray(routesData));
    } catch (error: any) {
      console.error('[DeliveryNote] Error loading data:', error);
    }
  };

  // Format notifications untuk NotificationBell
  const dnNotifications = useMemo(() => {
    return notifications.map((notif: any) => ({
      id: notif.id,
      title: `DO ${notif.doNo || 'N/A'} - ${notif.customerName || 'N/A'}`,
      message: `Driver: ${notif.driverName || 'N/A'} | Vehicle: ${notif.vehicleNo || 'N/A'} | Route: ${notif.routeName || 'N/A'}`,
      timestamp: notif.created || notif.confirmedAt || notif.timestamp,
      notif: notif, // Keep original data
    }));
  }, [notifications]);

  const generateDNNo = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `DN-${year}${month}${day}-${random}`;
  };

  const handleCreateFromNotification = (notif: any) => {
    console.log('[DeliveryNote] handleCreateFromNotification called with:', notif);
    setNotificationDialog({
      show: true,
      notif: notif,
    });
  };

  const handleDeleteNotification = async (notif: any) => {
    try {
      console.log('[Trucking DeliveryNote] handleDeleteNotification called for:', notif?.id);
      
      if (!notif || !notif.id) {
        showAlert('Notification tidak valid. Mohon coba lagi.', 'Error');
        return;
      }
      
      // 🚀 FIX: Pakai Trucking delete helper untuk konsistensi dan sync yang benar
      const deleteResult = await deleteTruckingItem(StorageKeys.TRUCKING.SURAT_JALAN_NOTIFICATIONS, notif.id, 'id');
      
      if (deleteResult.success) {
        // Reload data dengan filter active items
        const allNotificationsRaw = await storageService.get<any[]>(StorageKeys.TRUCKING.SURAT_JALAN_NOTIFICATIONS);
        const allNotifications = (Array.isArray(allNotificationsRaw) ? allNotificationsRaw : 
                                (allNotificationsRaw && typeof allNotificationsRaw === 'object' && 'value' in allNotificationsRaw && Array.isArray((allNotificationsRaw as any).value) ? (allNotificationsRaw as any).value : [])) as any[];
        const activeNotifs = filterActiveItems(allNotifications as Record<string, any>[]).filter((n: any) => {
          if (n.type !== 'DO_CONFIRMED' || (n.status || 'Open') !== 'Open') {
            return false;
          }
          // Filter jika sudah ada DN untuk DO ini
          const dnDONos = new Set(deliveryNote.map((dn: any) => dn.doNo));
          if (n.doNo && dnDONos.has(n.doNo)) {
            return false;
          }
          // Filter jika DO sudah di-delete
          const activeDOs = filterActiveItems(deliveryOrders);
          const doNos = new Set(activeDOs.map((doItem: any) => doItem.doNo));
          if (n.doNo && !doNos.has(n.doNo)) {
            return false;
          }
          return true;
        });
        setNotifications(activeNotifs);
        showAlert('✅ Notifikasi berhasil dihapus dengan aman.\n\n🛡️ Data dilindungi dari auto-sync restoration.', 'Success');
      } else {
        console.error('[Trucking DeliveryNote] Delete notification failed:', deleteResult.error);
        showAlert(`❌ Error menghapus notifikasi: ${deleteResult.error || 'Unknown error'}`, 'Error');
      }
    } catch (error: any) {
      showAlert(`Error deleting notification: ${error.message}`, 'Error');
    }
  };

  const handleLoadFormFromNotification = (notif: any) => {
    console.log('[DeliveryNote] handleLoadFormFromNotification called with:', notif);
    console.log('[DeliveryNote] Available delivery orders:', deliveryOrders);
    
    try {
      // DN dibuat dari confirm DO notification, jadi langsung ambil dari DO data atau notification
      // Cari DO data dari doNo di notifikasi
      let doData = null;
      const doNoToSearch = notif.doNo || '';
      if (doNoToSearch) {
        doData = deliveryOrders.find((doItem: any) => doItem.doNo === doNoToSearch);
        console.log('[DeliveryNote] Searching DO with doNo:', doNoToSearch);
        console.log('[DeliveryNote] Found DO data:', doData);
      }
      
      // Gunakan data dengan prioritas: DO Data > Notification
      const finalDoNo = doData?.doNo || notif.doNo || '';
      const finalCustomerName = doData?.customerName || notif.customerName || '';
      const finalCustomerAddress = doData?.customerAddress || notif.customerAddress || '';
      const finalVehicleId = doData?.vehicleId || notif.vehicleId || '';
      const finalVehicleNo = doData?.vehicleNo || notif.vehicleNo || '';
      const finalRouteId = doData?.routeId || notif.routeId || '';
      const finalRouteName = doData?.routeName || notif.routeName || '';
      const finalScheduledDate = doData?.scheduledDate || notif.scheduledDate || new Date().toISOString().split('T')[0];
      const finalScheduledTime = doData?.scheduledTime || notif.scheduledTime || '08:00';
      
      // Items dari DO data (prioritas tertinggi)
      const finalItems = doData?.items ? [...(doData.items || [])] : [];
      
      console.log('[DeliveryNote] Final form data:', {
        doNo: finalDoNo,
        customerName: finalCustomerName,
        customerAddress: finalCustomerAddress,
        vehicleId: finalVehicleId,
        vehicleNo: finalVehicleNo,
        routeId: finalRouteId,
        routeName: finalRouteName,
        scheduledDate: finalScheduledDate,
        scheduledTime: finalScheduledTime,
        itemsCount: finalItems.length,
        driverId: notif.driverId || '',
        driverName: notif.driverName || '',
      });
      
      setFormData({
        dnNo: generateDNNo(),
        doNo: finalDoNo,
        customerName: finalCustomerName,
        customerAddress: finalCustomerAddress,
        driverId: notif.driverId || '',
        driverName: notif.driverName || '',
        driverCode: notif.driverCode || '',
        vehicleId: finalVehicleId,
        vehicleNo: finalVehicleNo,
        routeId: finalRouteId,
        routeName: finalRouteName,
        items: finalItems,
        scheduledDate: finalScheduledDate,
        scheduledTime: finalScheduledTime,
        status: 'Open',
        notes: doData?.notes || notif.notes || '',
      });
      setNewItem({ product: '', qty: 0, unit: 'UNIT', description: '' });
      setNotificationDialog({ show: false, notif: null });
      setShowFormDialog(true);
      console.log('[DeliveryNote] Form opened successfully');
    } catch (error: any) {
      console.error('[DeliveryNote] Error in handleCreateFromNotification:', error);
      showAlert(`Error opening form: ${error.message}`, 'Error');
    }
  };

  const handleAddItem = () => {
    if (!newItem.product || newItem.qty <= 0) {
      showAlert('Product dan Qty harus diisi', 'Information');
      return;
    }
    setFormData({
      ...formData,
      items: [...(formData.items || []), { ...newItem }],
    });
    setNewItem({ product: '', qty: 0, unit: 'PCS', description: '' });
  };

  const handleRemoveItem = (index: number) => {
    const items = [...(formData.items || [])];
    items.splice(index, 1);
    setFormData({ ...formData, items });
  };

  const handleSave = async () => {
    try {
      if (!formData.doNo || !formData.driverId || !formData.items || formData.items.length === 0) {
        showAlert('DO No, Driver, dan Items harus diisi', 'Information');
        return;
      }

      const driver = drivers.find(d => d.id === formData.driverId);
      const vehicle = vehicles.find(v => v.id === formData.vehicleId);
      const route = routes.find(r => r.id === formData.routeId);

      if (editingItem) {
        const now = new Date();
        const updated = deliveryNote.map(dn =>
          dn.id === editingItem.id
            ? {
                ...formData,
                id: editingItem.id,
                no: editingItem.no,
                dnNo: editingItem.dnNo,
                driverName: driver?.name || formData.driverName || '',
                driverCode: driver?.driverCode || formData.driverCode || '',
                vehicleNo: vehicle?.vehicleNo || formData.vehicleNo || '',
                routeName: route?.routeName || formData.routeName || '',
                created: editingItem.created || now.toISOString(),
                lastUpdate: now.toISOString(),
                timestamp: now.getTime(),
                _timestamp: now.getTime(),
              } as DeliveryNote
            : dn
        );
        await storageService.set(StorageKeys.TRUCKING.SURAT_JALAN, updated);
        // Sort by created date (newest first)
        const sortedUpdated = updated.sort((a, b) => {
          const dateA = a.created ? new Date(a.created).getTime() : (a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0);
          const dateB = b.created ? new Date(b.created).getTime() : (b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0);
          return dateB - dateA; // Newest first
        });
        setDeliveryNote(sortedUpdated.map((dn, idx) => ({ ...dn, no: idx + 1 })));
      } else {
        const now = new Date();
        const newDN: DeliveryNote = {
          id: Date.now().toString(),
          no: deliveryNote.length + 1,
          dnNo: formData.dnNo || generateDNNo(),
          doNo: formData.doNo || '',
          customerName: formData.customerName || '',
          customerAddress: formData.customerAddress || '',
          driverId: formData.driverId || '',
          driverName: driver?.name || formData.driverName || '',
          driverCode: driver?.driverCode || formData.driverCode || '',
          vehicleId: formData.vehicleId || '',
          vehicleNo: vehicle?.vehicleNo || formData.vehicleNo || '',
          routeId: formData.routeId || '',
          routeName: route?.routeName || formData.routeName || '',
          items: formData.items || [],
          pettyCashRequestNo: formData.pettyCashRequestNo || '',
          transferProof: formData.transferProof || '',
          transferProofName: formData.transferProofName || '',
          distributedDate: formData.distributedDate || '',
          scheduledDate: formData.scheduledDate || '',
          scheduledTime: formData.scheduledTime || '',
          status: formData.status || 'Open',
          notes: formData.notes || '',
          created: now.toISOString(),
          lastUpdate: now.toISOString(),
          timestamp: now.getTime(),
          _timestamp: now.getTime(),
        };
        // Simpan ke storage
        const allDN = await storageService.get<DeliveryNote[]>(StorageKeys.TRUCKING.SURAT_JALAN) || [];
        const updated = [...allDN, newDN];
        await storageService.set(StorageKeys.TRUCKING.SURAT_JALAN, updated);

        // Hapus notification setelah dibuat (berdasarkan doNo, bukan hanya dari dialog)
        const doNoToCheck = formData.doNo || notificationDialog.notif?.doNo;
        if (doNoToCheck) {
          const allNotificationsRaw = await storageService.get<any[]>(StorageKeys.TRUCKING.SURAT_JALAN_NOTIFICATIONS);
          const allNotifications = (Array.isArray(allNotificationsRaw) ? allNotificationsRaw : 
                                  (allNotificationsRaw && typeof allNotificationsRaw === 'object' && 'value' in allNotificationsRaw && Array.isArray((allNotificationsRaw as any).value) ? (allNotificationsRaw as any).value : [])) as any[];
          // Hapus notification yang memiliki doNo yang sama
          const updatedNotifications = allNotifications.filter((n: any) => n.doNo !== doNoToCheck);
          await storageService.set(StorageKeys.TRUCKING.SURAT_JALAN_NOTIFICATIONS, updatedNotifications);
          console.log(`✅ [DeliveryNote] Removed notification for DO ${doNoToCheck}`);
        }
        
        // Reload data untuk memastikan filter deleted items dan notification terhapus
        await loadData();
      }

      setShowFormDialog(false);
      setEditingItem(null);
      setNotificationDialog({ show: false, notif: null });
      setFormData({
        dnNo: '',
        doNo: '',
        customerName: '',
        customerAddress: '',
        driverId: '',
        vehicleId: '',
        routeId: '',
        items: [],
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: '08:00',
        status: 'Open',
        notes: '',
      });
      showAlert('✅ Delivery Note berhasil disimpan', 'Success');
      loadData();
    } catch (error: any) {
      showAlert(`Error saving delivery note: ${error.message}`, 'Error');
    }
  };

  const handleEdit = (item: DeliveryNote) => {
    setEditingItem(item);
    setFormData({
      ...item,
      items: item.items ? [...item.items] : [],
    });
    setNewItem({ product: '', qty: 0, unit: 'PCS', description: '' });
    setNotificationDialog({ show: false, notif: null });
    setShowFormDialog(true);
  };

  // Helper function untuk save tombstone ke audit log
  const saveTombstoneToAuditLog = async (item: any, refType: string) => {
    try {
      const timestamp = new Date().toISOString();
      const itemId = item.id || item.dnNo || item.doNo || item.requestNo || item.memoNo || item.vehicleNo || item.driverCode || item.routeCode || item.kode || 'unknown';
      const auditLog = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        refType: refType,
        refId: itemId,
        actorId: 'user', // TODO: get from auth context
        action: 'DELETE',
        deleted: true,
        deletedAt: timestamp,
        data: item, // Simpan data lengkap untuk tombstone
        createdAt: timestamp,
      };
      
      // Simpan audit log menggunakan storageService
      const auditLogs = await storageService.get<any[]>(StorageKeys.TRUCKING.AUDIT_LOGS) || [];
      await storageService.set(StorageKeys.TRUCKING.AUDIT_LOGS, [...auditLogs, auditLog]);
      return true;
    } catch (error) {
      console.error('Error saving tombstone to audit log:', error);
      return false;
    }
  };

  const handleDelete = async (item: DeliveryNote) => {
    showConfirm(
      `Are you sure you want to delete Delivery Note "${item.dnNo}"?`,
      async () => {
        try {
          // Simpan tombstone ke audit log sebelum menghapus
          await saveTombstoneToAuditLog(item, StorageKeys.TRUCKING.SURAT_JALAN);
          
          // Pakai helper function untuk safe delete (tombstone pattern)
          const deleteResult = await deleteTruckingItem(StorageKeys.TRUCKING.SURAT_JALAN, item.id, 'id');
          
          if (deleteResult.success) {
            // Reload data dengan helper function
            const activeDN = await reloadTruckingData(StorageKeys.TRUCKING.SURAT_JALAN, setDeliveryNote);
            
            // Sort by created date (newest first)
            const sortedUpdated = activeDN.sort((a, b) => {
              const dateA = a.created ? new Date(a.created).getTime() : (a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0);
              const dateB = b.created ? new Date(b.created).getTime() : (b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0);
              return dateB - dateA; // Newest first
            });
            setDeliveryNote(sortedUpdated.map((dn, idx) => ({ ...dn, no: idx + 1 })));
            showAlert(`Delivery Note "${item.dnNo}" deleted successfully`, 'Success');
          } else {
            showAlert(`Error deleting delivery note "${item.dnNo}": ${deleteResult.error || 'Please try again.'}`, 'Error');
          }
        } catch (error: any) {
          showAlert(`Error deleting delivery note: ${error.message}`, 'Error');
        }
      },
      undefined,
      'Confirm Delete'
    );
  };

  const handleStatusChange = async (item: DeliveryNote, newStatus: DeliveryNote['status']) => {
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

      const updated = deliveryNote.map(sj =>
        sj.id === item.id
          ? {
              ...sj,
              status: newStatus,
              departureDate: newStatus === 'Close' ? (sj.departureDate || dateStr) : sj.departureDate,
              departureTime: newStatus === 'Close' ? (sj.departureTime || timeStr) : sj.departureTime,
              arrivalDate: newStatus === 'Close' ? (sj.arrivalDate || dateStr) : sj.arrivalDate,
              arrivalTime: newStatus === 'Close' ? (sj.arrivalTime || timeStr) : sj.arrivalTime,
            }
          : sj
      );
      await storageService.set(StorageKeys.TRUCKING.SURAT_JALAN, updated);
      setDeliveryNote(updated.map((sj, idx) => ({ ...sj, no: idx + 1 })));
    } catch (error: any) {
      showAlert(`Error updating status: ${error.message}`, 'Error');
    }
  };

  const handleViewPDF = async (item: DeliveryNote) => {
    try {
      // Cari DO data untuk mendapatkan items lengkap
      const doData = deliveryOrders.find((doItem: any) => doItem.doNo === item.doNo);
      
      // Load logo dan company info
      const logoBase64 = await loadLogoAsBase64();
      const company = await storageService.get<{ companyName: string; address: string }>('company') || {
        companyName: 'PT. Trimalaksana',
        address: 'Jl. Raya Cikarang, Bekasi',
      };

      // Prepare items untuk template - convert ke format yang diharapkan template
      // Ensure items is always an array to prevent "filter is not a function" error
      const rawItems = item.items || doData?.items || [];
      const items = Array.isArray(rawItems) ? rawItems : [];
      
      const soLines = items.map((it: any) => ({
        itemSku: it.sku || it.productCode || '', // PRODUCT CODE hanya dari SKU/productCode, kosongkan jika tidak ada
        qty: it.qty || 0,
        productName: it.product || it.description || '', // ITEM dari product/description
      }));

      // Prepare data untuk template
      const deliveryNoteData = {
        soNo: item.doNo,
        customer: item.customerName,
        customerAddress: item.customerAddress,
        items: items,
        qty: items.reduce((sum: number, i: any) => sum + (i.qty || 0), 0),
        qtyProduced: items.reduce((sum: number, i: any) => sum + (i.qty || 0), 0),
        specNote: item.notes || '',
        soLines: soLines,
      };

      const sjData = {
        sjNo: item.dnNo, // Template menggunakan sjNo, tapi kita pass dnNo
        sjDate: item.scheduledDate || new Date().toISOString().split('T')[0],
        driver: item.driverName || '',
        vehicleNo: item.vehicleNo || '',
      };

      const html = generateSuratJalanHtml({
        logo: logoBase64,
        company,
        item: deliveryNoteData,
        sjData,
        products: [], // Products tidak diperlukan untuk trucking
      });

      setViewPdfData({ html, dnNo: item.dnNo });
    } catch (error: any) {
      showAlert(`Error generating PDF preview: ${error.message}`, 'Error');
    }
  };

  const handleSaveToPDF = async () => {
    if (!viewPdfData) return;

    try {
      const electronAPI = (window as any).electronAPI;
      const fileName = `${viewPdfData.dnNo}.pdf`;

      if (electronAPI && typeof electronAPI.savePdf === 'function') {
        // Electron: Use file picker to select save location
        const result = await electronAPI.savePdf(viewPdfData.html, fileName);
        if (result.success) {
          showAlert(`PDF saved successfully to:\n${result.path}`, 'Success');
          setViewPdfData(null);
        } else if (!result.canceled) {
          showAlert(`Error saving PDF: ${result.error || 'Unknown error'}`, 'Error');
        }
      } else if (isMobile() || isCapacitor()) {
        // Mobile/Capacitor: Use Web Share API or download link
        await savePdfForMobile(
          viewPdfData.html,
          fileName,
          (message) => {
            showAlert(message, 'Success');
            setViewPdfData(null); // Close view setelah save
          },
          (message) => showAlert(message, 'Error')
        );
      } else {
        // Browser: Buka window baru dengan print dialog langsung
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.open();
          printWindow.document.write(viewPdfData.html);
          printWindow.document.close();
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print();
            }, 250);
          };
          setTimeout(() => {
            if (printWindow && !printWindow.closed) {
              printWindow.print();
            }
          }, 500);
          showAlert('Print dialog akan muncul. Pilih "Save as PDF" untuk menyimpan dokumen.', 'Info');
        } else {
          openPrintWindow(viewPdfData.html, { autoPrint: true });
        }
      }
    } catch (error: any) {
      showAlert(`Error saving PDF: ${error.message}`, 'Error');
    }
  };

  const handleUploadSignedDocument = async (item: DeliveryNote) => {
    // Show dialog untuk input tanggal receipt dulu
    setPendingUploadItem(item);
    setReceiptDate(new Date().toISOString().split('T')[0]);
    setShowReceiptDateDialog(true);
  };

  const handleConfirmReceiptDate = () => {
    if (!receiptDate || !pendingUploadItem) {
      showAlert('Tanggal receipt harus diisi', 'Validation Error');
      return;
    }
    setShowReceiptDateDialog(false);
    // Lanjutkan upload setelah tanggal receipt diisi
    const item = pendingUploadItem;
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,.pdf';
    fileInput.multiple = true; // Allow multiple file selection
    fileInput.onchange = async (e: any) => {
      const files = Array.from(e.target.files || []) as File[];
      if (!files || files.length === 0) {
        setPendingUploadItem(null);
        return;
      }

      try {
        // Upload all files to MinIO using BlobService
        const uploadPromises = files.map(file => BlobService.uploadFile(file, 'trucking'));
        const uploadResults = await Promise.all(uploadPromises);
        
        // Create array of uploaded documents with metadata
        const uploadedDocuments = uploadResults.map((result, index) => ({
          fileId: result.fileId,
          fileName: files[index].name,
          uploadedAt: new Date().toISOString(),
        }));
        
        // Update delivery dengan signed document fileIds dan status Close
        const updated = deliveryNote.map(dn =>
          dn.id === item.id
            ? {
                ...dn,
                signedDocumentId: uploadedDocuments[0].fileId, // Primary document (first upload)
                signedDocumentName: uploadedDocuments[0].fileName,
                // APPEND new documents ke existing signedDocuments (jangan replace)
                signedDocuments: [
                  ...(dn.signedDocuments || []), // Keep existing documents
                  ...uploadedDocuments.map(doc => ({
                    document: doc.fileId, // Store fileId instead of base64
                    name: doc.fileName,
                    type: (doc.fileName.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image') as 'pdf' | 'image',
                    uploadedAt: doc.uploadedAt,
                  }))
                ],
                receivedDate: receiptDate,
                status: 'Close' as const, // Otomatis close setelah upload signed document
              }
            : dn
        );
          
        // Save ke storage
        await storageService.set(StorageKeys.TRUCKING.SURAT_JALAN, updated);
        
        // Sort by created date (newest first)
        const sortedUpdated = updated.sort((a, b) => {
          const dateA = a.created ? new Date(a.created).getTime() : (a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0);
          const dateB = b.created ? new Date(b.created).getTime() : (b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0);
          return dateB - dateA; // Newest first
        });
        setDeliveryNote(sortedUpdated.map((dn, idx) => ({ ...dn, no: idx + 1 })));
        
        // Close DO yang terkait setelah upload signed document
        try {
          const doListRaw = await storageService.get<any[]>(StorageKeys.TRUCKING.DELIVERY_ORDERS);
          const doList = (Array.isArray(doListRaw) ? doListRaw : 
                        (doListRaw && typeof doListRaw === 'object' && 'value' in doListRaw && Array.isArray((doListRaw as any).value) ? (doListRaw as any).value : [])) as any[];
          const relatedDO = doList.find((doItem: any) => doItem.doNo === item.doNo);
          if (relatedDO && relatedDO.status === 'Open') {
            const updatedDOs = doList.map((doItem: any) =>
              doItem.doNo === item.doNo
                ? { ...doItem, status: 'Close' as const }
                : doItem
            );
            await storageService.set(StorageKeys.TRUCKING.DELIVERY_ORDERS, updatedDOs);
          }
        } catch (doError) {
          console.warn('[DeliveryNote] Warning: Could not close related DO', doError);
        }

        // Kirim notifikasi ke Invoice setelah upload signed document
        try {
          const invoiceNotificationsRaw = await storageService.get<any[]>(StorageKeys.TRUCKING.INVOICE_NOTIFICATIONS);
          const invoiceNotifications = (Array.isArray(invoiceNotificationsRaw) ? invoiceNotificationsRaw : 
                                      (invoiceNotificationsRaw && typeof invoiceNotificationsRaw === 'object' && 'value' in invoiceNotificationsRaw && Array.isArray((invoiceNotificationsRaw as any).value) ? (invoiceNotificationsRaw as any).value : [])) as any[];

          const existingNotif = invoiceNotifications.find((n: any) => 
            n.dnNo === item.dnNo && n.type === 'CUSTOMER_INVOICE'
          );

          if (!existingNotif) {
            // Load SJ untuk mendapatkan data lengkap (sjNo, items, customer, dll)
            const suratJalanList = await storageService.get<any[]>(StorageKeys.TRUCKING.SURAT_JALAN) || [];
            const relatedSJ = suratJalanList.find((sj: any) => sj.dnNo === item.dnNo);
            
            // Load DO untuk mendapatkan totalDeal dan customer info
            const doList = await storageService.get<any[]>(StorageKeys.TRUCKING.DELIVERY_ORDERS) || [];
            const relatedDO = doList.find((doItem: any) => doItem.doNo === item.doNo);
            
            const newNotif = {
              id: Date.now().toString(),
              type: 'CUSTOMER_INVOICE',
              dnNo: item.dnNo,
              doNo: item.doNo,
              sjNo: relatedSJ?.sjNo || '', // ✅ Add sjNo
              customerName: relatedDO?.customerName || relatedSJ?.customerName || '', // ✅ Add customer name
              customerAddress: relatedDO?.customerAddress || relatedSJ?.customerAddress || '', // ✅ Add customer address
              items: relatedSJ?.items || [], // ✅ Add items dari SJ
              totalDeal: relatedDO?.totalDeal || 0, // ✅ Add totalDeal dari DO
              status: 'PENDING',
              createdAt: new Date().toISOString(),
            };
            
            console.log(`✅ [DeliveryNote] Created invoice notification with full data:`, newNotif);
            await storageService.set(StorageKeys.TRUCKING.INVOICE_NOTIFICATIONS, [...invoiceNotifications, newNotif]);
          }
        } catch (notifError) {
          console.warn('[DeliveryNote] Warning: Could not create invoice notification', notifError);
        }

        showAlert('✅ Signed document uploaded successfully', 'Success');
        setPendingUploadItem(null);
      } catch (error: any) {
        console.error('[DeliveryNote] Upload error details:', error);
        let errorMessage = error.message || 'Unknown error';
        
        // Provide better error messages for common issues
        if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION')) {
          errorMessage = 'Server tidak dapat diakses. Pastikan server PC Utama sedang berjalan dan terhubung ke Tailscale.';
        } else if (error.message?.includes('timeout')) {
          errorMessage = 'Upload timeout - server tidak merespons. Coba lagi atau periksa koneksi server.';
        }
        
        showAlert(`❌ Error uploading document: ${errorMessage}`, 'Error');
        setPendingUploadItem(null);
      }
    };
    fileInput.click();
  };

  const handleViewSignedDocument = async (item: DeliveryNote) => {
    if (!item.signedDocumentId && (!item.signedDocuments || item.signedDocuments.length === 0)) {
      showAlert('No signed document available for this Delivery Note', 'Information');
      return;
    }

    try {
      // Get all documents - prioritize signedDocuments array, fallback to single signedDocumentId
      const documents: SignedDocument[] = item.signedDocuments && item.signedDocuments.length > 0 
        ? item.signedDocuments 
        : [{
            document: item.signedDocumentId || '',
            name: item.signedDocumentName || `DN-${item.dnNo}-signed`,
            type: (item.signedDocumentName || '').toLowerCase().endsWith('.pdf') ? 'pdf' : 'image',
            uploadedAt: item.created,
          }];

      // If multiple documents, show a gallery/list view
      if (documents.length > 1) {
        setViewingDocuments(documents);
        setViewingDocumentsItem(item);
        setSelectedDocumentIndex(0);
        // You can open a modal here to display the gallery
        // For now, just view the first document
      }

      // View the first document (or selected one)
      const doc = documents[0];
      const fileName = doc.name || `DN-${item.dnNo}-signed`;
      const isPDF = doc.type === 'pdf' || fileName.toLowerCase().endsWith('.pdf');
      
      // Get download URL from BlobService
      const url = BlobService.getDownloadUrl(doc.document, 'trucking');
      
      // Untuk PDF, langsung download saja (lebih reliable)
      if (isPDF) {
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Untuk image, buka di new window
        const newWindow = window.open();
        if (!newWindow) {
          showAlert('Error', 'Popup blocked. Please allow popups to view document.');
          return;
        }
        
        // Build HTML for image gallery if multiple documents
        let imageHtml = '';
        if (documents.length > 1) {
          imageHtml = `
            <div style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 8px 12px; border-radius: 4px; font-size: 12px;">
              Document 1 of ${documents.length}
            </div>
          `;
        }
        
        newWindow.document.write(`
          <html>
            <head>
              <title>${fileName}</title>
              <style>
                body { 
                  margin: 0; 
                  padding: 20px; 
                  display: flex; 
                  justify-content: center; 
                  align-items: center; 
                  min-height: 100vh;
                  background: #f5f5f5;
                }
                img { 
                  max-width: 100%; 
                  max-height: 100vh; 
                  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                }
              </style>
            </head>
            <body>
              ${imageHtml}
              <img src="${url}" alt="${fileName}" 
                   onerror="this.parentElement.innerHTML='<div style=\\'padding:20px;text-align:center;\\'><p>Error loading image</p></div>';" />
            </body>
          </html>
        `);
        newWindow.document.close();
      }
    } catch (error: any) {
      showAlert('Error', `Error viewing document: ${error.message}`);
    }
  };


  const handleDownloadSignedDocument = async (item: DeliveryNote) => {
    if (!item.signedDocumentId) {
      showAlert('Error', 'No signed document available');
      return;
    }

    try {
      const fileName = item.signedDocumentName || `DN-${item.dnNo}-signed`;
      
      // Use BlobService to download the file
      await BlobService.downloadFile(item.signedDocumentId, fileName, 'trucking');
    } catch (error: any) {
      showAlert('Error', `Error downloading document: ${error.message}`);
    }
  };

  const handleDeleteSignedDocument = async (item: DeliveryNote, docIndex: number) => {
    if (!item.signedDocuments || item.signedDocuments.length === 0) {
      showAlert('Error', 'No documents to delete');
      return;
    }

    const docToDelete = item.signedDocuments[docIndex];
    if (!docToDelete) {
      showAlert('Error', 'Document not found');
      return;
    }

    showConfirm(
      `Delete document "${docToDelete.name}"?\n\nThis will remove the file from storage.`,
      async () => {
        try {
          // Delete from MinIO/Vercel using BlobService
          if (docToDelete.document) {
            try {
              await BlobService.deleteFile(docToDelete.document, 'trucking');
            } catch (deleteError: any) {
              console.warn('Warning deleting from blob storage:', deleteError);
              // Continue anyway - remove from database even if blob delete fails
            }
          }

          // Remove from signedDocuments array
          const updatedDocuments = item.signedDocuments!.filter((_, idx) => idx !== docIndex);
          
          // Update delivery note
          const updated = deliveryNote.map(dn =>
            dn.id === item.id
              ? {
                  ...dn,
                  signedDocuments: updatedDocuments,
                  // If this was the primary document, update primary reference
                  signedDocumentId: updatedDocuments.length > 0 ? updatedDocuments[0].document : undefined,
                  signedDocumentName: updatedDocuments.length > 0 ? updatedDocuments[0].name : undefined,
                }
              : dn
          );

          // Save to server
          await storageService.set(StorageKeys.TRUCKING.SURAT_JALAN, updated, false);
          setDeliveryNote(updated.map((dn, idx) => ({ ...dn, no: idx + 1 })));

          // Update viewing documents
          const newViewingDocs = viewingDocuments.filter((_, idx) => idx !== docIndex);
          setViewingDocuments(newViewingDocs);
          
          // Adjust selected index if needed
          if (selectedDocumentIndex >= newViewingDocs.length && newViewingDocs.length > 0) {
            setSelectedDocumentIndex(newViewingDocs.length - 1);
          }

          showAlert(`✅ Document "${docToDelete.name}" deleted successfully`, 'Success');
        } catch (error: any) {
          showAlert(`❌ Error deleting document: ${error.message}`, 'Error');
        }
      },
      () => {}, // onCancel
      'Delete Document'
    );
  };

  const filteredDeliveryNote = useMemo(() => {
    let filtered = (deliveryNote || []).filter(sj => {
      if (!sj) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        (sj.dnNo || '').toLowerCase().includes(query) ||
        (sj.doNo || '').toLowerCase().includes(query) ||
        (sj.customerName || '').toLowerCase().includes(query) ||
        (sj.driverName || '').toLowerCase().includes(query) ||
        (sj.vehicleNo || '').toLowerCase().includes(query) ||
        (sj.status || '').toLowerCase().includes(query)
      );
    });
    
    // Date filter
    if (dateFrom) {
      filtered = filtered.filter(sj => {
        const sjDate = sj.created || sj.scheduledDate || '';
        return sjDate >= dateFrom;
      });
    }
    if (dateTo) {
      filtered = filtered.filter(sj => {
        const sjDate = sj.created || sj.scheduledDate || '';
        return sjDate <= dateTo;
      });
    }
    
    // Sort by created date (newest first)
    return filtered.sort((a, b) => {
      const dateA = a.created ? new Date(a.created).getTime() : (a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0);
      const dateB = b.created ? new Date(b.created).getTime() : (b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0);
      return dateB - dateA; // Newest first
    });
  }, [deliveryNote, searchQuery, dateFrom, dateTo]);

  // Pagination
  const paginatedDeliveryNote = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredDeliveryNote.slice(startIndex, endIndex);
  }, [filteredDeliveryNote, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredDeliveryNote.length / itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFrom, dateTo]);

  const columns = [
    { key: 'no', header: 'No' },
    { key: 'dnNo', header: 'DN No' },
    { key: 'doNo', header: 'DO No' },
    { key: 'customerName', header: 'Customer' },
    { key: 'driverName', header: 'Driver' },
    { key: 'vehicleNo', header: 'Vehicle' },
    { key: 'routeName', header: 'Route' },
    { key: 'scheduledDate', header: 'Scheduled Date' },
    {
      key: 'receivedDate',
      header: 'SJ Kembali',
      render: (item: DeliveryNote) => (
        item.receivedDate ? (
          <span style={{ fontSize: '12px' }}>{new Date(item.receivedDate).toLocaleDateString('id-ID')}</span>
        ) : (
          <span style={{ color: '#999', fontSize: '12px' }}>-</span>
        )
      ),
    },
    {
      key: 'signedDocument',
      header: 'Signed Document',
      render: (item: DeliveryNote) => {
        if (!item.signedDocumentId) {
          return <span style={{ color: '#999', fontSize: '12px' }}>-</span>;
        }
        return (
          <span style={{ color: '#4CAF50', fontSize: '12px' }}>
            ✓ {item.signedDocumentName || 'Signed'}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: DeliveryNote) => (
        <span className={`status-badge status-${item.status?.toLowerCase().replace('_', '-')}`}>
          {item.status}
        </span>
      ),
    },
    { 
      key: 'created', 
      header: 'Created',
      render: (item: DeliveryNote) => {
        const { date, time } = formatDateSimple(item.created);
        return (
          <div style={{ fontSize: '12px' }}>
            <div style={{ fontWeight: '500' }}>{date}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{time}</div>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: DeliveryNote) => (
        <ActionMenu
          onReopen={item.status === 'Close' ? () => handleStatusChange(item, 'Open') : undefined}
          onEdit={() => handleEdit(item)}
          onViewPDF={() => handleViewPDF(item)}
          onUploadSigned={() => handleUploadSignedDocument(item)}
          onViewSigned={item.signedDocumentId ? () => handleViewSignedDocument(item) : undefined}
          onDelete={item.status === 'Open' ? () => handleDelete(item) : undefined}
        />
      ),
    },
  ];

  return (
    <div className="module-compact">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
          <h2>Delivery Note</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {notifications.length > 0 && (
              <NotificationBell
                notifications={dnNotifications}
                onNotificationClick={(notification) => {
                  if (notification.notif) {
                    handleCreateFromNotification(notification.notif);
                  }
                }}
                onDeleteNotification={handleDeleteNotification}
                icon="📄"
                emptyMessage="Tidak ada notifikasi DO yang perlu dibuat Delivery Note"
              />
            )}
            <Button onClick={() => {
              setEditingItem(null);
              setFormData({ 
                dnNo: '', 
                doNo: '', 
                customerName: '', 
                customerAddress: '', 
                driverId: '',
                vehicleId: '',
                routeId: '',
                items: [], 
                scheduledDate: new Date().toISOString().split('T')[0], 
                scheduledTime: '08:00', 
                status: 'Open', 
                notes: '' 
              });
              setNewItem({ product: '', qty: 0, unit: 'UNIT', description: '' });
              setShowFormDialog(true);
            }}>
              + Create Delivery Note
            </Button>
          </div>
        </div>

        {/* Notification Dialog */}
        {notificationDialog.show && notificationDialog.notif && (
          <div className="dialog-overlay" onClick={() => setNotificationDialog({ show: false, notif: null })}>
            <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
              <Card className="dialog-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2>📄 Create Delivery Note</h2>
                  <Button variant="secondary" onClick={() => setNotificationDialog({ show: false, notif: null })} style={{ padding: '6px 12px' }}>✕</Button>
                </div>
                
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
                  <div style={{ marginBottom: '8px' }}><strong>DO No:</strong> {notificationDialog.notif.doNo || '-'}</div>
                  <div style={{ marginBottom: '8px' }}><strong>Customer:</strong> {notificationDialog.notif.customerName || '-'}</div>
                  <div style={{ marginBottom: '8px' }}><strong>Driver:</strong> {notificationDialog.notif.driverName || '-'} ({notificationDialog.notif.driverCode || '-'})</div>
                  <div style={{ marginBottom: '8px' }}><strong>Vehicle:</strong> {notificationDialog.notif.vehicleNo || '-'}</div>
                  <div style={{ marginBottom: '8px' }}><strong>Route:</strong> {notificationDialog.notif.routeName || '-'}</div>
                  <div><strong>Scheduled Date:</strong> {notificationDialog.notif.scheduledDate || '-'}</div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <Button variant="secondary" onClick={() => setNotificationDialog({ show: false, notif: null })}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={() => handleLoadFormFromNotification(notificationDialog.notif)}>
                    Create Delivery Note
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Form Dialog */}
        {showFormDialog && (
          <div className="dialog-overlay" onClick={() => {
            setShowFormDialog(false);
            setEditingItem(null);
            setNotificationDialog({ show: false, notif: null });
            setFormData({ 
              dnNo: '', 
              doNo: '', 
              customerName: '', 
              customerAddress: '', 
              driverId: '',
              vehicleId: '',
              routeId: '',
              items: [], 
              scheduledDate: new Date().toISOString().split('T')[0], 
              scheduledTime: '08:00', 
              status: 'Open', 
              notes: '' 
            });
            setNewItem({ product: '', qty: 0, unit: 'UNIT', description: '' });
          }}>
            <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
              <Card className="dialog-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2>{editingItem ? '✏️ Edit Delivery Note' : '📄 Create Delivery Note'}</h2>
                  <Button variant="secondary" onClick={() => {
                    setShowFormDialog(false);
                    setEditingItem(null);
                    setNotificationDialog({ show: false, notif: null });
                    setFormData({ 
                      dnNo: '', 
                      doNo: '', 
                      customerName: '', 
                      customerAddress: '', 
                      driverId: '',
                      vehicleId: '',
                      routeId: '',
                      items: [], 
                      scheduledDate: new Date().toISOString().split('T')[0], 
                      scheduledTime: '08:00', 
                      status: 'Open', 
                      notes: '' 
                    });
                    setNewItem({ product: '', qty: 0, unit: 'UNIT', description: '' });
                  }} style={{ padding: '6px 12px' }}>✕</Button>
                </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Input
                label="DN No"
                value={formData.dnNo || ''}
                onChange={(v) => setFormData({ ...formData, dnNo: v })}
                placeholder="Auto-generated if empty"
              />
              <Input
                label="DO No"
                value={formData.doNo || ''}
                onChange={(v) => setFormData({ ...formData, doNo: v })}
                disabled={false}
                placeholder="Enter DO No"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Input
                label="Customer Name"
                value={formData.customerName || ''}
                onChange={(v) => setFormData({ ...formData, customerName: v })}
                disabled={false}
                placeholder="Enter Customer Name"
              />
              <Input
                label="Scheduled Date"
                type="date"
                value={formData.scheduledDate || ''}
                onChange={(v) => setFormData({ ...formData, scheduledDate: v })}
              />
            </div>
            <Input
              label="Customer Address"
              value={formData.customerAddress || ''}
              onChange={(v) => setFormData({ ...formData, customerAddress: v })}
              disabled={false}
              placeholder="Enter Customer Address"
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Driver *
                </label>
                <select
                  value={formData.driverId || ''}
                  onChange={(e) => {
                    const driver = drivers.find(d => d.id === e.target.value);
                    setFormData({ 
                      ...formData, 
                      driverId: e.target.value,
                      driverName: driver?.name || '',
                      driverCode: driver?.driverCode || '',
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
                  disabled={false}
                >
                  <option value="">-- Pilih Driver --</option>
                  {drivers.filter(d => d.status === 'Active').map(d => (
                    <option key={d.id} value={d.id}>
                      {d.driverCode} - {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Vehicle
                </label>
                <select
                  value={formData.vehicleId || ''}
                  onChange={(e) => {
                    const vehicle = vehicles.find(v => v.id === e.target.value);
                    setFormData({ 
                      ...formData, 
                      vehicleId: e.target.value,
                      vehicleNo: vehicle?.vehicleNo || '',
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
                  disabled={false}
                >
                  <option value="">-- Pilih Vehicle --</option>
                  {vehicles.filter(v => v.status === 'Active').map(v => (
                    <option key={v.id} value={v.id}>
                      {v.vehicleNo} - {v.licensePlate}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Scheduled Time"
                type="time"
                value={formData.scheduledTime || ''}
                onChange={(v) => setFormData({ ...formData, scheduledTime: v })}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                Route
              </label>
              <select
                value={formData.routeId || ''}
                onChange={(e) => {
                  const route = routes.find(r => r.id === e.target.value);
                  setFormData({ 
                    ...formData, 
                    routeId: e.target.value,
                    routeName: route?.routeName || '',
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
                  disabled={false}
                >
                  <option value="">-- Pilih Route --</option>
                {routes.filter(r => r.status === 'Active').map(r => (
                  <option key={r.id} value={r.id}>
                    {r.routeName} ({r.origin} - {r.destination})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: '24px', marginBottom: '16px' }}>
              <h3 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>Items</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '8px', marginBottom: '8px', alignItems: 'end' }}>
                <div>
                  <Input
                    value={newItem.product}
                    onChange={(v) => setNewItem({ ...newItem, product: v })}
                    placeholder="Product/Description"
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    value={String(newItem.qty || 0)}
                    onChange={(v) => setNewItem({ ...newItem, qty: Number(v) || 0 })}
                    placeholder="Qty"
                  />
                </div>
                <div>
                  <select
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
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
                    <option value="UNIT">UNIT</option>
                    <option value="PCS">PCS</option>
                    <option value="KG">KG</option>
                    <option value="TON">TON</option>
                    <option value="M3">M3</option>
                    <option value="BOX">BOX</option>
                    <option value="LOT">LOT</option>
                  </select>
                </div>
                <div>
                  <Input
                    value={newItem.description || ''}
                    onChange={(v) => setNewItem({ ...newItem, description: v })}
                    placeholder="Notes"
                  />
                </div>
                <div>
                  <Button onClick={handleAddItem} style={{ whiteSpace: 'nowrap' }}>Add</Button>
                </div>
              </div>
              {formData.items && formData.items.length > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: '4px', padding: '12px', marginTop: '12px' }}>
                  <div style={{ marginBottom: '8px', fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Items ({formData.items.length})
                  </div>
                  {formData.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: idx < formData.items!.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <span style={{ fontSize: '13px' }}>{item.product || 'N/A'} - {item.qty || 0} {item.unit || 'UNIT'} {item.description ? `(${item.description})` : ''}</span>
                      <Button variant="danger" onClick={() => handleRemoveItem(idx)} style={{ padding: '4px 8px', fontSize: '12px' }}>Remove</Button>
                    </div>
                  ))}
                </div>
              )}
              {(!formData.items || formData.items.length === 0) && (
                <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', border: '1px dashed var(--border)', borderRadius: '4px' }}>
                  No items added yet. Fill in the fields above and click "Add" to add items.
                </div>
              )}
            </div>

            <Input
              label="Notes"
              value={formData.notes || ''}
              onChange={(v) => setFormData({ ...formData, notes: v })}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <Button onClick={() => { 
                setShowFormDialog(false); 
                setEditingItem(null); 
                setNotificationDialog({ show: false, notif: null });
                setFormData({ 
                  dnNo: '', 
                  doNo: '', 
                  customerName: '', 
                  customerAddress: '', 
                  driverId: '',
                  vehicleId: '',
                  routeId: '',
                  items: [], 
                  scheduledDate: new Date().toISOString().split('T')[0], 
                  scheduledTime: '08:00', 
                  status: 'Open', 
                  notes: '' 
                });
                setNewItem({ product: '', qty: 0, unit: 'UNIT', description: '' });
              }} variant="secondary">
                Cancel
              </Button>
              <Button onClick={handleSave} variant="primary">
                {editingItem ? 'Update Delivery Note' : 'Save Delivery Note'}
              </Button>
            </div>
              </Card>
            </div>
          </div>
        )}

        {/* View Toggle & Search */}
        <Card>
          <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by DN No, DO No, Customer, Driver, Vehicle, Status..."
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
              {paginatedDeliveryNote.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
                  {paginatedDeliveryNote.map((item) => (
                    <Card key={item.id} style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>{item.dnNo}</div>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.customerName}</div>
                        </div>
                        <span className={`status-badge status-${item.status?.toLowerCase().replace('_', '-')}`}>
                          {item.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>📋 DO No: {item.doNo || '-'}</div>
                        <div>👤 Driver: {item.driverName || '-'}</div>
                        <div>🚛 Vehicle: {item.vehicleNo || '-'}</div>
                        <div>🚚 Route: {item.routeName || '-'}</div>
                        <div>📅 Scheduled: {item.scheduledDate || '-'} {item.scheduledTime || ''}</div>
                        {item.signedDocumentId && (
                          <div style={{ color: '#4CAF50', fontWeight: 600 }}>
                            ✓ Signed Document Uploaded
                          </div>
                        )}
                      </div>
                      {item.items && item.items.length > 0 && (
                        <div style={{ fontSize: '12px', background: 'var(--bg-secondary)', padding: '8px', borderRadius: '6px', marginBottom: '12px' }}>
                          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Items ({item.items.length})</div>
                          {item.items.slice(0, 3).map((itm, idx) => (
                            <div key={idx}>• {itm.product} ({itm.qty} {itm.unit || 'UNIT'})</div>
                          ))}
                          {item.items.length > 3 && <div style={{ opacity: 0.7 }}>... and {item.items.length - 3} more</div>}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {item.status === 'Close' && (
                          <Button variant="secondary" onClick={() => handleStatusChange(item, 'Open')} style={{ fontSize: '11px', padding: '4px 8px' }}>
                            Reopen
                          </Button>
                        )}
                        <Button variant="secondary" onClick={() => handleEdit(item)} style={{ fontSize: '11px', padding: '4px 8px' }}>Edit</Button>
                        <Button variant="primary" onClick={() => handleViewPDF(item)} style={{ fontSize: '11px', padding: '4px 8px' }}>View PDF</Button>
                        {!item.signedDocumentId ? (
                          <Button variant="success" onClick={() => handleUploadSignedDocument(item)} style={{ fontSize: '11px', padding: '4px 8px' }}>
                            📤 Upload Signed SJ
                          </Button>
                        ) : (
                          <Button variant="secondary" onClick={() => handleViewSignedDocument(item)} style={{ fontSize: '11px', padding: '4px 8px' }}>
                            👁️ View Signed SJ
                          </Button>
                        )}
                        {item.status === 'Open' && (
                          <Button variant="danger" onClick={() => handleDelete(item)} style={{ fontSize: '11px', padding: '4px 8px' }}>Delete</Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  {searchQuery ? "No surat jalan found matching your search" : "No surat jalan data"}
                </div>
              )}
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '12px',
                  marginTop: '20px',
                  padding: '12px',
                  borderTop: '1px solid var(--border)',
                }}>
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    ← Previous
                  </Button>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Page {currentPage} of {totalPages} ({filteredDeliveryNote.length} items)
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    Next →
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <Table columns={columns} data={paginatedDeliveryNote} emptyMessage={searchQuery ? "No surat jalan found matching your search" : "No surat jalan data"} />
          )}
        </Card>

        {/* Custom Dialog */}
        {/* Custom Dialog - menggunakan hook terpusat */}
        <DialogComponent />
      </Card>

      {/* Receipt Date Dialog */}
      {showReceiptDateDialog && (
        <div className="dialog-overlay" onClick={() => { setShowReceiptDateDialog(false); setPendingUploadItem(null); }} style={{ zIndex: 10000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <Card className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Input Tanggal Receipt SJ</h2>
                <Button variant="secondary" onClick={() => { setShowReceiptDateDialog(false); setPendingUploadItem(null); }} style={{ padding: '6px 12px' }}>✕</Button>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Tanggal Receipt SJ *
                </label>
                <input
                  type="date"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={() => { setShowReceiptDateDialog(false); setPendingUploadItem(null); }} style={{ padding: '8px 16px' }}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleConfirmReceiptDate} style={{ padding: '8px 16px' }}>
                  Confirm
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* PDF Preview Dialog */}
      {viewPdfData && (
        <div className="dialog-overlay" onClick={() => setViewPdfData(null)} style={{ zIndex: 10000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90%', width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
            <Card className="dialog-card" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2>Delivery Note Preview - {viewPdfData.dnNo}</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="primary" onClick={handleSaveToPDF} style={{ padding: '6px 12px' }}>
                    💾 Save to PDF
                  </Button>
                  <Button variant="secondary" onClick={() => setViewPdfData(null)} style={{ padding: '6px 12px' }}>✕</Button>
                </div>
              </div>
              <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border)', borderRadius: '4px' }}>
                <iframe
                  srcDoc={viewPdfData.html}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    minHeight: '600px'
                  }}
                  title="Delivery Note Preview"
                />
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Gallery Dialog untuk Multiple Signed Documents */}
      {viewingDocuments.length > 0 && viewingDocumentsItem && (
        <div className="dialog-overlay" onClick={() => { setViewingDocuments([]); setViewingDocumentsItem(null); setSelectedDocumentIndex(0); }} style={{ zIndex: 10001 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '95%', width: '95%', maxHeight: '95vh', overflow: 'auto' }}>
            <Card className="dialog-card" style={{ maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2>Signed Documents - {viewingDocumentsItem.dnNo} ({viewingDocuments.length} files)</h2>
                <Button variant="secondary" onClick={() => { setViewingDocuments([]); setViewingDocumentsItem(null); setSelectedDocumentIndex(0); }} style={{ padding: '6px 12px' }}>✕</Button>
              </div>
              
              {/* Thumbnail List */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
                {viewingDocuments.map((doc, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedDocumentIndex(idx)}
                    style={{
                      minWidth: '120px',
                      padding: '8px',
                      border: `2px solid ${selectedDocumentIndex === idx ? 'var(--accent-color)' : 'var(--border-color)'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: selectedDocumentIndex === idx ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '32px', marginBottom: '4px' }}>
                      {doc.type === 'pdf' ? '📄' : '🖼️'}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: selectedDocumentIndex === idx ? '600' : '400', wordBreak: 'break-word' }}>
                      {doc.name}
                    </div>
                    {doc.uploadedAt && (
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {new Date(doc.uploadedAt).toLocaleDateString('id-ID')}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Document Viewer */}
              <DocumentViewer
                item={viewingDocumentsItem}
                doc={viewingDocuments[selectedDocumentIndex]}
                index={selectedDocumentIndex}
                total={viewingDocuments.length}
                onPrevious={() => setSelectedDocumentIndex(Math.max(0, selectedDocumentIndex - 1))}
                onNext={() => setSelectedDocumentIndex(Math.min(viewingDocuments.length - 1, selectedDocumentIndex + 1))}
                onDownload={() => handleDownloadSignedDocument(viewingDocumentsItem!)}
                onDownloadAll={() => handleDownloadSignedDocument(viewingDocumentsItem!)}
                onDelete={() => handleDeleteSignedDocument(viewingDocumentsItem!, selectedDocumentIndex)}
              />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

// Document Viewer Component
const DocumentViewer = ({ item, doc, index, total, onPrevious, onNext, onDownload, onDownloadAll, onDelete }: {
  item: DeliveryNote;
  doc: SignedDocument;
  index: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
  onDownload: () => void;
  onDownloadAll: () => void;
  onDelete?: () => void;
}) => {
  const [documentData, setDocumentData] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadDocument();
  }, [doc]);

  const loadDocument = async () => {
    setLoading(true);
    setError('');
    try {
      let data = doc.document;
      
      // If doc.document is a fileId (UUID), fetch from MinIO using BlobService
      if (data && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data)) {
        // This is a fileId, get the download URL from MinIO
        try {
          const url = BlobService.getDownloadUrl(data, 'trucking');
          // For both images and PDFs, use the URL directly
          // Browser will handle rendering appropriately
          setDocumentData(url);
          setLoading(false);
          return;
        } catch (fetchError: any) {
          setError(`Error getting file URL: ${fetchError.message}`);
          setLoading(false);
          return;
        }
      }
      
      if (doc.path) {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI && typeof electronAPI.loadUploadedFile === 'function') {
          try {
            const result = await electronAPI.loadUploadedFile(doc.path);
            if (result && result.success) {
              data = result.data || '';
            } else {
              throw new Error(result?.error || 'Failed to load file');
            }
          } catch (loadError: any) {
            setError(`Gagal memuat file: ${loadError.message}`);
            setLoading(false);
            return;
          }
        } else if (isMobile() || isCapacitor()) {
          setError('File tidak bisa diakses di mobile. Silakan buka di desktop.');
          setLoading(false);
          return;
        } else {
          setError('Electron API tidak tersedia.');
          setLoading(false);
          return;
        }
      }
      
      if (!data) {
        setError('No document data available');
        setLoading(false);
        return;
      }
      
      // Normalize data URI
      if (!data.startsWith('data:') && !data.startsWith('http')) {
        const isPDF = doc.type === 'pdf';
        data = isPDF ? `data:application/pdf;base64,${data}` : `data:image/jpeg;base64,${data}`;
      }
      
      setDocumentData(data);
      setLoading(false);
    } catch (err: any) {
      setError(`Error loading document: ${err.message}`);
      setLoading(false);
    }
  };

  const isPDF = doc.type === 'pdf' || doc.name.toLowerCase().endsWith('.pdf');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '8px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button variant="secondary" onClick={onPrevious} disabled={index === 0} style={{ padding: '4px 8px', fontSize: '12px' }}>
            ← Previous
          </Button>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {index + 1} / {total}
          </span>
          <Button variant="secondary" onClick={onNext} disabled={index === total - 1} style={{ padding: '4px 8px', fontSize: '12px' }}>
            Next →
          </Button>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={onDownload} style={{ padding: '4px 8px', fontSize: '12px' }}>
            📥 Download
          </Button>
          {total > 1 && (
            <Button variant="secondary" onClick={onDownloadAll} style={{ padding: '4px 8px', fontSize: '12px' }}>
              📥 Download All
            </Button>
          )}
          <Button 
            variant="danger" 
            onClick={onDelete} 
            style={{ 
              padding: '6px 12px', 
              fontSize: '12px',
              backgroundColor: '#EF4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            🗑️ Delete This File
          </Button>
        </div>
      </div>

      {/* Document Content */}
      <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '6px', overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f5f5f5', minHeight: '500px' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading document...
          </div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#EF4444' }}>
            {error}
          </div>
        ) : isPDF ? (
          <iframe
            src={documentData}
            style={{
              width: '100%',
              height: 'auto',
              minHeight: '500px',
              border: 'none',
              transform: 'scale(0.95)',
              transformOrigin: 'top center',
            }}
            title={doc.name}
          />
        ) : (
          <img
            src={documentData}
            alt={doc.name}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
            onError={() => setError('Error loading image')}
          />
        )}
      </div>
    </div>
  );
};

export default DeliveryNote;

