import { useState, useEffect, useMemo, useRef } from 'react';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import NotificationBell from '../../../components/NotificationBell';
import { storageService } from '../../../services/storage';
import { deleteTruckingItem, reloadTruckingData, filterActiveItems } from '../../../utils/trucking-delete-helper';
import { useDialog } from '../../../hooks/useDialog';
import { generateSuratJalanHtml } from '../../../pdf/suratjalan-pdf-template';
import { openPrintWindow, isMobile, isCapacitor, savePdfForMobile } from '../../../utils/actions';
import { loadLogoAsBase64 } from '../../../utils/logo-loader';
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

interface SuratJalanItem {
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

interface SuratJalan {
  id: string;
  no: number;
  sjNo: string;
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
  items: SuratJalanItem[];
  pettyCashRequestNo?: string;
  transferProof?: string;
  transferProofName?: string;
  distributedDate?: string;
  scheduledDate: string;
  scheduledTime: string;
  // NEW: Array untuk multiple signed documents
  signedDocuments?: SignedDocument[];
  // OLD: Single document (backward compatibility)
  signedDocument?: string; // Base64 untuk image, atau file:// path untuk PDF
  signedDocumentPath?: string; // Path ke file PDF di file system
  signedDocumentName?: string;
  signedDocumentType?: 'pdf' | 'image'; // Tipe file: pdf atau image
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

const SuratJalan = () => {
  const [suratJalan, setSuratJalan] = useState<SuratJalan[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [deliveryOrders, setDeliveryOrders] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [showReceiptDateDialog, setShowReceiptDateDialog] = useState(false);
  const [receiptDate, setReceiptDate] = useState('');
  const [pendingUploadItem, setPendingUploadItem] = useState<SuratJalan | null>(null);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<SuratJalan | null>(null);
  const [viewingDocuments, setViewingDocuments] = useState<SignedDocument[]>([]);
  const [viewingDocumentsItem, setViewingDocumentsItem] = useState<SuratJalan | null>(null);
  const [selectedDocumentIndex, setSelectedDocumentIndex] = useState(0);
  const [showRouteDialog, setShowRouteDialog] = useState(false);
  const [routeDialogSearch, setRouteDialogSearch] = useState('');
  const [notificationDialog, setNotificationDialog] = useState<{
    show: boolean;
    notif: any | null;
  }>({
    show: false,
    notif: null,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [formData, setFormData] = useState<Partial<SuratJalan>>({
    sjNo: '',
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
  const [viewPdfData, setViewPdfData] = useState<{ html: string; sjNo: string } | null>(null);

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
    // Optimasi: Auto-refresh setiap 30 detik untuk mengurangi bandwidth (sebelumnya 5 detik)
    // Gunakan event-based updates untuk real-time changes
    const interval = setInterval(loadData, 30000); // 30 detik - cukup untuk surat jalan updates
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      // Load semua data menggunakan storageService
      const [sjDataRaw, notifDataRaw, doDataRaw, schedulesDataRaw, driversData, vehiclesData, routesData] = await Promise.all([
        storageService.get<SuratJalan[]>('trucking_suratJalan'),
        storageService.get<any[]>('trucking_suratJalanNotifications'),
        storageService.get<any[]>('trucking_delivery_orders'),
        storageService.get<any[]>('trucking_unitSchedules'),
        storageService.get<any[]>('trucking_drivers'),
        storageService.get<any[]>('trucking_vehicles'),
        storageService.get<any[]>('trucking_routes'),
      ]);
      
      // Initialize empty arrays jika belum ada
      if (!sjDataRaw) {
        await storageService.set('trucking_suratJalan', []);
      }
      if (!notifDataRaw) {
        await storageService.set('trucking_suratJalanNotifications', []);
      }

      // Ensure arrays (handle null/undefined)
      const sjData = sjDataRaw || [];
      const notifData = notifDataRaw || [];
      const doData = doDataRaw || [];
      const schedulesData = schedulesDataRaw || [];

      console.log(`📊 [SuratJalan] Loaded data: ${sjData.length} SJ, ${notifData.length} notifications, ${doData.length} DOs`);

      // Filter out deleted items menggunakan helper function
      const activeSJ = filterActiveItems(sjData);
      const activeDOs = filterActiveItems(doData);
      
      // Sort by created date (newest first), fallback to scheduledDate if created not available
      const sortedSJ = activeSJ.sort((a, b) => {
        const dateA = a.created ? new Date(a.created).getTime() : (a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0);
        const dateB = b.created ? new Date(b.created).getTime() : (b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0);
        return dateB - dateA; // Newest first
      });
      setSuratJalan(sortedSJ.map((sj, idx) => ({ ...sj, no: idx + 1 })));
      
      // Filter notifications: hanya yang belum dibuat SJ-nya dan DO-nya masih ada
      // Hapus notification jika:
      // 1. Sudah di-delete (tombstone pattern)
      // 2. Sudah ada SJ untuk DO yang sama
      // 3. DO-nya sudah di-delete (tombstone)
      const originalNotifsCount = notifData.length;
      console.log(`📊 [SuratJalan] Processing ${originalNotifsCount} notifications, ${activeDOs.length} active DOs, ${activeSJ.length} active SJs`);
      
      // CRITICAL: Filter deleted items FIRST menggunakan filterActiveItems
      const activeNotifData = filterActiveItems(notifData);
      console.log(`📊 [SuratJalan] After filtering deleted items: ${activeNotifData.length} active notifications (from ${originalNotifsCount} total)`);
      
      const allNotifs = activeNotifData.filter((n: any) => {
        // Keep notification jika belum dibuat SJ-nya
        if (n.type === 'PETTY_CASH_DISTRIBUTED' && (n.status || 'Open') === 'Open') {
          // CRITICAL FIX: Jika DO data kosong (belum ada file), jangan filter notification
          // Ini untuk handle case dimana DO belum pernah di-save ke file storage
          if (activeDOs.length === 0) {
            console.log(`⚠️ [SuratJalan] No DO data found, keeping notification ${n.id} for DO ${n.doNo}`);
            // Cek apakah sudah ada SJ untuk DO ini
            const hasSJ = activeSJ.some((sj: any) => sj.doNo === n.doNo);
            if (hasSJ) {
              console.log(`🧹 [SuratJalan] Filtering out notification for DO ${n.doNo} - SJ already exists`);
              return false;
            }
            return true; // Keep notification jika DO data kosong (belum ada file)
          }
          
          // Cek apakah DO-nya sudah di-delete
          const doExists = activeDOs.some((doItem: any) => doItem.doNo === n.doNo);
          if (!doExists && n.doNo) {
            console.log(`🧹 [SuratJalan] Filtering out notification for DO ${n.doNo} - DO already deleted`);
            return false; // Hapus notification jika DO-nya sudah di-delete
          }
          
          // Cek apakah sudah ada SJ untuk DO ini
          const hasSJ = activeSJ.some((sj: any) => {
            const sjDoNo = sj.doNo;
            const notifDoNo = n.doNo;
            const match = sjDoNo === notifDoNo;
            if (match) {
              console.log(`🧹 [SuratJalan] Found matching SJ for notification: DO ${notifDoNo}, SJ ${sj.sjNo}`);
            }
            return match;
          });
          if (hasSJ) {
            console.log(`🧹 [SuratJalan] Filtering out notification for DO ${n.doNo} - SJ already exists`);
            return false; // Hapus notification yang sudah dibuat SJ-nya
          }
        }
        return true; // Keep other notifications
      });
      
      // SELALU update notifications di storage untuk memastikan data konsisten
      // Hapus notification yang sudah tidak relevan (DO deleted atau sudah ada SJ)
      // Update storage setiap kali ada perubahan atau jika ada notification yang perlu dihapus
      // Note: Keep deleted items (tombstones) in storage for sync, but don't include them in allNotifs
      // Merge allNotifs dengan deleted items dari original notifData untuk preserve tombstones
      const deletedNotifs = notifData.filter((n: any) => n.deleted === true || n.deletedAt);
      const allNotifsWithTombstones = [...allNotifs, ...deletedNotifs];
      
      const shouldUpdate = allNotifs.length !== activeNotifData.length || 
        (activeNotifData || []).some((n: any) => {
          if (n.type === 'PETTY_CASH_DISTRIBUTED' && (n.status || 'Open') === 'Open') {
            // Cek apakah DO sudah di-delete
            const doExists = activeDOs.some((doItem: any) => doItem.doNo === n.doNo);
            if (!doExists && n.doNo) {
              return true; // Perlu update karena DO sudah di-delete
            }
            // Cek apakah sudah ada SJ
            const hasSJ = activeSJ.some((sj: any) => sj.doNo === n.doNo);
            return hasSJ;
          }
          return false;
        });
      
      if (shouldUpdate) {
        // Save dengan tombstones untuk sync
        await storageService.set('trucking_suratJalanNotifications', allNotifsWithTombstones);
        console.log(`🧹 [SuratJalan] Cleaned up ${activeNotifData.length - allNotifs.length} obsolete notifications (from ${activeNotifData.length} active to ${allNotifs.length} relevant)`);
      }
      
      // Filter untuk display: hanya yang PENDING, belum dibuat SJ-nya, dan DO-nya masih ada
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
          // Cek apakah sudah ada SJ untuk DO ini
          const hasSJ = activeSJ.some((sj: any) => sj.doNo === n.doNo);
          if (hasSJ) {
            console.log(`🧹 [SuratJalan] Filtering out notification for display: DO ${n.doNo} - SJ already exists`);
            return false;
          }
          return true; // Keep notification jika DO data kosong
        }
        // Double-check: pastikan DO-nya masih ada
        const doExists = activeDOs.some((doItem: any) => doItem.doNo === n.doNo);
        if (!doExists && n.doNo) {
          console.log(`🧹 [SuratJalan] Filtering out notification for display: DO ${n.doNo} - DO already deleted`);
          return false;
        }
        // Double-check: pastikan tidak ada SJ untuk DO ini
        const hasSJ = activeSJ.some((sj: any) => sj.doNo === n.doNo);
        if (hasSJ) {
          console.log(`🧹 [SuratJalan] Filtering out notification for display: DO ${n.doNo} - SJ already exists`);
          return false;
        }
        return true;
      });
      
      console.log(`📊 [SuratJalan] Notifications: ${originalNotifsCount} original, ${allNotifs.length} after filter, ${activeNotifs.length} for display`);
      setNotifications(activeNotifs);
      setDeliveryOrders(doData || []);
      setSchedules(schedulesData || []);
      setDrivers(driversData || []);
      setVehicles(vehiclesData || []);
      setRoutes(routesData || []);
    } catch (error: any) {
      console.error('[SuratJalan] Error loading data:', error);
    }
  };

  // Format notifications untuk NotificationBell
  const sjNotifications = useMemo(() => {
    return notifications.map((notif: any) => ({
      id: notif.id,
      title: `PC ${notif.pettyCashRequestNo || 'N/A'} - DO ${notif.doNo || 'N/A'}`,
      message: `Driver: ${notif.driverName || 'N/A'} | Amount: Rp ${(notif.amount || 0).toLocaleString('id-ID')} | Vehicle: ${notif.vehicleNo || 'N/A'}`,
      timestamp: notif.created || notif.distributedDate || notif.timestamp,
      notif: notif, // Keep original data
    }));
  }, [notifications]);

  const generateSJNo = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `SJ-${year}${month}${day}-${random}`;
  };

  const handleCreateFromNotification = (notif: any) => {
    console.log('[SuratJalan] handleCreateFromNotification called with:', notif);
    setNotificationDialog({
      show: true,
      notif: notif,
    });
  };

  const handleDeleteNotification = async (notif: any) => {
    try {
      console.log('[Trucking SuratJalan] handleDeleteNotification called for:', notif?.id);
      
      if (!notif || !notif.id) {
        showAlert('Notification tidak valid. Mohon coba lagi.', 'Error');
        return;
      }
      
      // 🚀 FIX: Pakai Trucking delete helper untuk konsistensi dan sync yang benar
      const deleteResult = await deleteTruckingItem('trucking_suratJalanNotifications', notif.id, 'id');
      
      if (deleteResult.success) {
        // Reload data dengan filter active items
        const allNotifications = await storageService.get<any[]>('trucking_suratJalanNotifications') || [];
        const activeNotifs = filterActiveItems(allNotifications).filter((n: any) => {
          if (n.type !== 'PETTY_CASH_DISTRIBUTED' || (n.status || 'Open') !== 'Open') {
            return false;
          }
          // Filter jika sudah ada SJ untuk DO ini
          const sjDONos = new Set(suratJalan.map((sj: any) => sj.doNo));
          if (n.doNo && sjDONos.has(n.doNo)) {
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
        console.error('[Trucking SuratJalan] Delete notification failed:', deleteResult.error);
        showAlert(`❌ Error menghapus notifikasi: ${deleteResult.error || 'Unknown error'}`, 'Error');
      }
    } catch (error: any) {
      showAlert(`Error deleting notification: ${error.message}`, 'Error');
    }
  };

  const handleLoadFormFromNotification = (notif: any) => {
    console.log('[SuratJalan] handleLoadFormFromNotification called with:', notif);
    console.log('[SuratJalan] Available schedules:', schedules);
    console.log('[SuratJalan] Available delivery orders:', deliveryOrders);
    
    try {
      
      // Prioritas 1: Cari schedule berdasarkan driverId (SPK delivery)
      // Cari schedule yang paling baru atau yang statusnya SCHEDULED/IN_PROGRESS
      let relatedSchedule = null;
      if (notif.driverId) {
        const matchingSchedules = schedules.filter((s: any) => 
          s.driverId === notif.driverId
        );
        
        // Prioritas: Open > Close
        relatedSchedule = matchingSchedules.find((s: any) => s.status === 'Open') ||
                         matchingSchedules[0]; // Ambil yang pertama jika ada
        
        console.log('[SuratJalan] Matching schedules:', matchingSchedules);
        console.log('[SuratJalan] Selected schedule:', relatedSchedule);
      }
      
      // Prioritas 2: Cari DO data dari doNo di notifikasi atau schedule
      let doData = null;
      const doNoToSearch = notif.doNo || relatedSchedule?.doNo || '';
      if (doNoToSearch) {
        doData = deliveryOrders.find((doItem: any) => doItem.doNo === doNoToSearch);
        console.log('[SuratJalan] Searching DO with doNo:', doNoToSearch);
        console.log('[SuratJalan] Found DO data:', doData);
      }
      
      // Gunakan data dengan prioritas: Schedule > DO Data > Notification
      // Schedule adalah sumber data utama karena itu adalah SPK delivery
      const finalDoNo = relatedSchedule?.doNo || doData?.doNo || notif.doNo || '';
      const finalCustomerName = relatedSchedule?.customerName || doData?.customerName || notif.customerName || '';
      const finalCustomerAddress = relatedSchedule?.customerAddress || doData?.customerAddress || notif.customerAddress || '';
      const finalVehicleId = relatedSchedule?.vehicleId || doData?.vehicleId || notif.vehicleId || '';
      const finalVehicleNo = relatedSchedule?.vehicleNo || doData?.vehicleNo || notif.vehicleNo || '';
      const finalRouteId = relatedSchedule?.routeId || doData?.routeId || notif.routeId || '';
      const finalRouteName = relatedSchedule?.routeName || doData?.routeName || notif.routeName || '';
      const finalScheduledDate = relatedSchedule?.scheduledDate || doData?.scheduledDate || notif.scheduledDate || new Date().toISOString().split('T')[0];
      const finalScheduledTime = relatedSchedule?.scheduledTime || doData?.scheduledTime || notif.scheduledTime || '08:00';
      
      // Items dari DO data (prioritas tertinggi)
      const finalItems = doData?.items ? [...(doData.items || [])] : [];
      
      console.log('[SuratJalan] Final form data:', {
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
        driverId: notif.driverId || relatedSchedule?.driverId || '',
        driverName: notif.driverName || relatedSchedule?.driverName || '',
      });
      
      setFormData({
        sjNo: generateSJNo(),
        doNo: finalDoNo,
        customerName: finalCustomerName,
        customerAddress: finalCustomerAddress,
        driverId: notif.driverId || relatedSchedule?.driverId || '',
        driverName: notif.driverName || relatedSchedule?.driverName || '',
        driverCode: notif.driverCode || relatedSchedule?.driverCode || '',
        vehicleId: finalVehicleId,
        vehicleNo: finalVehicleNo,
        routeId: finalRouteId,
        routeName: finalRouteName,
        items: finalItems,
        pettyCashRequestNo: notif.pettyCashRequestNo || '',
        transferProof: notif.transferProof || '',
        transferProofName: notif.transferProofName || '',
        distributedDate: notif.distributedDate || '',
        scheduledDate: finalScheduledDate,
        scheduledTime: finalScheduledTime,
        status: 'Open',
        notes: notif.description || notif.purpose || relatedSchedule?.notes || '',
      });
      setNewItem({ product: '', qty: 0, unit: 'UNIT', description: '' });
      setNotificationDialog({ show: false, notif: null });
      setShowFormDialog(true);
      console.log('[SuratJalan] Form opened successfully');
    } catch (error: any) {
      console.error('[SuratJalan] Error in handleCreateFromNotification:', error);
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
        const updated = suratJalan.map(sj =>
          sj.id === editingItem.id
            ? {
                ...formData,
                id: editingItem.id,
                no: editingItem.no,
                sjNo: editingItem.sjNo,
                driverName: driver?.name || formData.driverName || '',
                driverCode: driver?.driverCode || formData.driverCode || '',
                vehicleNo: vehicle?.vehicleNo || formData.vehicleNo || '',
                routeName: route?.routeName || formData.routeName || '',
                created: editingItem.created || now.toISOString(),
                lastUpdate: now.toISOString(),
                timestamp: now.getTime(),
                _timestamp: now.getTime(),
              } as SuratJalan
            : sj
        );
        await storageService.set('trucking_suratJalan', updated);
        // Sort by created date (newest first)
        const sortedUpdated = updated.sort((a, b) => {
          const dateA = a.created ? new Date(a.created).getTime() : (a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0);
          const dateB = b.created ? new Date(b.created).getTime() : (b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0);
          return dateB - dateA; // Newest first
        });
        setSuratJalan(sortedUpdated.map((sj, idx) => ({ ...sj, no: idx + 1 })));
      } else {
        const now = new Date();
        const newSJ: SuratJalan = {
          id: Date.now().toString(),
          no: suratJalan.length + 1,
          sjNo: formData.sjNo || generateSJNo(),
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
        const allSJ = await storageService.get<SuratJalan[]>('trucking_suratJalan') || [];
        const updated = [...allSJ, newSJ];
        await storageService.set('trucking_suratJalan', updated);

        // Hapus notification setelah dibuat (berdasarkan doNo, bukan hanya dari dialog)
        const doNoToCheck = formData.doNo || notificationDialog.notif?.doNo;
        if (doNoToCheck) {
          const allNotifications = await storageService.get<any[]>('trucking_suratJalanNotifications') || [];
          // Hapus notification yang memiliki doNo yang sama
          const updatedNotifications = allNotifications.filter((n: any) => n.doNo !== doNoToCheck);
          await storageService.set('trucking_suratJalanNotifications', updatedNotifications);
          console.log(`✅ [SuratJalan] Removed notification for DO ${doNoToCheck}`);
        }
        
        // Reload data untuk memastikan filter deleted items dan notification terhapus
        await loadData();
      }

      setShowFormDialog(false);
      setEditingItem(null);
      setNotificationDialog({ show: false, notif: null });
      setFormData({
        sjNo: '',
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
      showAlert('✅ Surat Jalan berhasil disimpan', 'Success');
      loadData();
    } catch (error: any) {
      showAlert(`Error saving surat jalan: ${error.message}`, 'Error');
    }
  };

  const handleEdit = (item: SuratJalan) => {
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
      const itemId = item.id || item.sjNo || item.doNo || item.requestNo || item.memoNo || item.vehicleNo || item.driverCode || item.routeCode || item.kode || 'unknown';
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
      const auditLogs = await storageService.get<any[]>('trucking_auditLogs') || [];
      await storageService.set('trucking_auditLogs', [...auditLogs, auditLog]);
      return true;
    } catch (error) {
      console.error('Error saving tombstone to audit log:', error);
      return false;
    }
  };

  const handleDelete = async (item: SuratJalan) => {
    showConfirm(
      `Are you sure you want to delete Surat Jalan "${item.sjNo}"?`,
      async () => {
        try {
          // Simpan tombstone ke audit log sebelum menghapus
          await saveTombstoneToAuditLog(item, 'trucking_suratJalan');
          
          // Pakai helper function untuk safe delete (tombstone pattern)
          const deleteResult = await deleteTruckingItem('trucking_suratJalan', item.id, 'id');
          
          if (deleteResult.success) {
            // Reload data dengan helper function
            const activeSJ = await reloadTruckingData('trucking_suratJalan', setSuratJalan);
            
            // Sort by created date (newest first)
            const sortedUpdated = activeSJ.sort((a, b) => {
              const dateA = a.created ? new Date(a.created).getTime() : (a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0);
              const dateB = b.created ? new Date(b.created).getTime() : (b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0);
              return dateB - dateA; // Newest first
            });
            setSuratJalan(sortedUpdated.map((sj, idx) => ({ ...sj, no: idx + 1 })));
            showAlert(`Surat Jalan "${item.sjNo}" deleted successfully`, 'Success');
          } else {
            showAlert(`Error deleting surat jalan "${item.sjNo}": ${deleteResult.error || 'Please try again.'}`, 'Error');
          }
        } catch (error: any) {
          showAlert(`Error deleting surat jalan: ${error.message}`, 'Error');
        }
      },
      undefined,
      'Confirm Delete'
    );
  };

  const handleStatusChange = async (item: SuratJalan, newStatus: SuratJalan['status']) => {
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

      const updated = suratJalan.map(sj =>
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
      await storageService.set('trucking_suratJalan', updated);
      setSuratJalan(updated.map((sj, idx) => ({ ...sj, no: idx + 1 })));
    } catch (error: any) {
      showAlert(`Error updating status: ${error.message}`, 'Error');
    }
  };

  const handleViewPDF = async (item: SuratJalan) => {
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
        sjNo: item.sjNo,
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

      setViewPdfData({ html, sjNo: item.sjNo });
    } catch (error: any) {
      showAlert(`Error generating PDF preview: ${error.message}`, 'Error');
    }
  };

  const handleSaveToPDF = async () => {
    if (!viewPdfData) return;

    try {
      const electronAPI = (window as any).electronAPI;
      const fileName = `${viewPdfData.sjNo}.pdf`;

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

  // Helper function untuk convert old format ke new format
  const normalizeSignedDocuments = (sj: SuratJalan): SignedDocument[] => {
    const docs: SignedDocument[] = [];
    
    // Convert old format ke new format jika ada
    if (sj.signedDocument || sj.signedDocumentPath) {
      docs.push({
        document: sj.signedDocument || `file://${sj.signedDocumentPath}`,
        path: sj.signedDocumentPath,
        name: sj.signedDocumentName || 'Signed Document',
        type: sj.signedDocumentType || 'image',
        uploadedAt: sj.receivedDate || sj.created,
      });
    }
    
    // Add new format documents jika ada
    if (sj.signedDocuments && sj.signedDocuments.length > 0) {
      docs.push(...sj.signedDocuments);
    }
    
    return docs;
  };

  const handleUploadSignedDocument = async (item: SuratJalan) => {
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
    fileInput.multiple = true; // Support multiple files
    fileInput.onchange = async (e: any) => {
      const files = Array.from(e.target.files || []) as File[];
      if (!files || files.length === 0) {
        setPendingUploadItem(null);
        return;
      }

      try {
        // Process semua files
        const existingDocs = normalizeSignedDocuments(item);
        const newDocs: SignedDocument[] = [];
        
        // Process files sequentially
        for (const file of files) {
          await new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
              try {
          const base64 = e.target?.result as string;
          
          // Deteksi tipe file
          const isPDF = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
          const fileType: 'pdf' | 'image' = isPDF ? 'pdf' : 'image';
          
                let document: string;
                let path: string | undefined;
          
          if (isPDF) {
                  // PDF: Simpan sebagai file di file system
            const electronAPI = (window as any).electronAPI;
            
            if (!electronAPI) {
                    throw new Error('⚠️ Electron API tidak tersedia.\n\nPastikan aplikasi berjalan di Electron app, bukan di browser.');
            }
            
            if (typeof electronAPI.saveUploadedFile !== 'function') {
                    throw new Error('⚠️ Fungsi saveUploadedFile tidak tersedia.\n\nSilakan restart aplikasi Electron.');
            }
            
            try {
              const result = await electronAPI.saveUploadedFile(base64, file.name, 'pdf');
              if (result && result.success) {
                      path = result.path;
                      document = `file://${result.path}`;
              } else {
                throw new Error(result?.error || 'Failed to save PDF file');
              }
            } catch (fileError: any) {
              const errorMessage = fileError.message || String(fileError);
              if (errorMessage.includes('No handler registered') || 
                  errorMessage.includes('handler registered') ||
                  errorMessage.includes('Error invoking remote method')) {
                      throw new Error('⚠️ Handler Electron belum terdaftar.\n\nSilakan restart aplikasi Electron.');
              }
                    throw new Error(`❌ Gagal menyimpan PDF: ${errorMessage}`);
            }
          } else {
                  // Image: Simpan sebagai base64
                  document = base64;
                  path = undefined;
                }
                
                newDocs.push({
                  document: path ? `file://${path}` : document,
                  path: path,
                  name: file.name,
                  type: fileType,
                  uploadedAt: new Date().toISOString(),
                });
                
                resolve();
              } catch (error: any) {
                reject(error);
              }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
          });
        }
        
        // Combine existing dan new documents
        const allDocs = [...existingDocs, ...newDocs];
          
          const updated = suratJalan.map(sj =>
            sj.id === item.id
              ? {
                  ...sj,
                // Simpan sebagai array baru
                signedDocuments: allDocs,
                // Clear old format untuk konsistensi
                signedDocument: undefined,
                signedDocumentPath: undefined,
                signedDocumentName: undefined,
                signedDocumentType: undefined,
                  receivedDate: receiptDate,
                  status: 'Close' as const, // Otomatis close setelah upload signed document
                }
              : sj
          );
          
          // Save ke local storage
          try {
            await storageService.set('trucking_suratJalan', updated);
          } catch (storageError: any) {
            // Jika save ke storage gagal karena quota, coba handle khusus
            if (storageError.message?.includes('quota') || storageError.message?.includes('exceeded')) {
              // Jika PDF sudah disimpan di file system, kita bisa skip signedDocument di storage
              // Cek apakah ada path dari newDocs yang berhasil disimpan
              const savedDoc = newDocs.find(doc => doc.path);
              if (savedDoc && savedDoc.path) {
                // Simpan tanpa signedDocument (hanya path)
                const updatedWithoutBase64 = suratJalan.map(sj =>
                  sj.id === item.id
                    ? {
                        ...sj,
                        signedDocument: undefined, // Hapus base64 jika ada
                        signedDocumentPath: savedDoc.path,
                        signedDocumentName: savedDoc.name,
                        signedDocumentType: savedDoc.type,
                        receivedDate: receiptDate,
                        status: 'Close' as const,
                      }
                    : sj
                );
                await storageService.set('trucking_suratJalan', updatedWithoutBase64);
                // Sort by created date (newest first)
                const sortedUpdated = updatedWithoutBase64.sort((a, b) => {
                  const dateA = a.created ? new Date(a.created).getTime() : (a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0);
                  const dateB = b.created ? new Date(b.created).getTime() : (b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0);
                  return dateB - dateA; // Newest first
                });
                setSuratJalan(sortedUpdated.map((sj, idx) => ({ ...sj, no: idx + 1 })));
                setPendingUploadItem(null);
                return; // Exit early
              } else {
                throw new Error('Storage quota exceeded. Silakan hapus beberapa data lama atau hubungi administrator.');
              }
            }
            throw storageError; // Re-throw error lainnya
          }
          // Sort by created date (newest first)
          const sortedUpdated = updated.sort((a, b) => {
            const dateA = a.created ? new Date(a.created).getTime() : (a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0);
            const dateB = b.created ? new Date(b.created).getTime() : (b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0);
            return dateB - dateA; // Newest first
          });
          setSuratJalan(sortedUpdated.map((sj, idx) => ({ ...sj, no: idx + 1 })));
          
          // Close DO yang terkait setelah upload signed document
          try {
            const storageKey = 'trucking/trucking_delivery_orders';
            const doList = await storageService.get<any[]>(storageKey) || [];
            const relatedDO = doList.find((doItem: any) => doItem.doNo === item.doNo);
            if (relatedDO && relatedDO.status === 'Open') {
              const updatedDOs = doList.map((doItem: any) =>
                doItem.doNo === item.doNo
                  ? { ...doItem, status: 'Close' as const }
                  : doItem
              );
              await storageService.set(storageKey, updatedDOs);
              console.log(`✅ [SuratJalan] Closed DO ${item.doNo} after signed document upload`);
            }
          } catch (error: any) {
            console.error('Error closing DO:', error);
          }
          
          // Kirim notifikasi ke Invoice setelah upload signed document
          try {
            const invoiceNotifications = await storageService.get<any[]>('trucking_invoiceNotifications') || [];
            const existingNotif = invoiceNotifications.find((n: any) => 
              n.sjNo === item.sjNo && n.type === 'CUSTOMER_INVOICE'
            );
            
            if (!existingNotif) {
              const now = new Date();
              const newInvoiceNotification = {
                id: `invoice-${Date.now()}-${item.sjNo}`,
                type: 'CUSTOMER_INVOICE',
                sjNo: item.sjNo,
                doNo: item.doNo,
                customer: item.customerName,
                customerAddress: item.customerAddress,
                items: item.items || [],
                totalQty: (item.items || []).reduce((sum: number, itm: any) => sum + (itm.qty || 0), 0),
                status: 'PENDING',
                created: now.toISOString(),
                lastUpdate: now.toISOString(),
                timestamp: now.getTime(),
                _timestamp: now.getTime(),
              };
              await storageService.set('trucking_invoiceNotifications', [...invoiceNotifications, newInvoiceNotification]);
              console.log(`✅ [SuratJalan] Created invoice notification for SJ ${item.sjNo}`);
              showAlert(`✅ Signed document uploaded successfully for ${item.sjNo}\n\n✅ Status updated to CLOSE\n✅ DO ${item.doNo} closed\n📧 Notification sent to Invoice module`, 'Success');
            } else {
              showAlert(`✅ Signed document uploaded successfully for ${item.sjNo}\n\n✅ Status updated to CLOSE\n✅ DO ${item.doNo} closed`, 'Success');
            }
          } catch (error: any) {
            console.error('Error creating invoice notification:', error);
            showAlert(`✅ Signed document uploaded successfully for ${item.sjNo}\n\n✅ Status updated to CLOSE\n✅ DO ${item.doNo} closed`, 'Success');
          }
          setPendingUploadItem(null);
      } catch (error: any) {
          showAlert(`Error uploading files: ${error.message}`, 'Error');
        setPendingUploadItem(null);
      }
    };
    fileInput.click();
  };

  const handleViewSignedDocument = async (item: SuratJalan) => {
    const docs = normalizeSignedDocuments(item);
    
    if (docs.length === 0) {
      showAlert('No signed document available for this Surat Jalan', 'Information');
      return;
    }

    // Jika hanya 1 file, langsung view
    if (docs.length === 1) {
      await handleViewSingleDocument(item, docs[0]);
      return;
    }
    
    // Jika multiple files, buka gallery dialog
    setViewingDocuments(docs);
    setViewingDocumentsItem(item);
  };

  const handleViewSingleDocument = async (item: SuratJalan, doc: SignedDocument) => {
    try {
      let documentData = doc.document;
      
      // Jika file disimpan sebagai path (PDF yang besar), load dari file system
      if (doc.path) {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI && typeof electronAPI.loadUploadedFile === 'function') {
          try {
            const result = await electronAPI.loadUploadedFile(doc.path);
            if (result && result.success) {
              documentData = result.data || '';
            } else {
              throw new Error(result?.error || 'Failed to load file from file system');
            }
          } catch (loadError: any) {
            showAlert('Error', `Gagal memuat file: ${loadError.message}`);
            return;
          }
        } else if (isMobile() || isCapacitor()) {
          showAlert('Error', 'File disimpan sebagai file system path, tetapi tidak bisa diakses di mobile.\n\nFile ini mungkin dibuat di aplikasi desktop. Silakan buka di aplikasi desktop untuk view file.');
          return;
        } else {
          showAlert('Error', 'File disimpan sebagai file system, tetapi Electron API tidak tersedia.');
          return;
        }
      }
      
      if (!documentData) {
        showAlert('Error', 'No document data available');
        return;
      }
      
      // Deteksi tipe file
      const isPDF = doc.type === 'pdf' || 
                    doc.name.toLowerCase().endsWith('.pdf') ||
                    documentData.startsWith('data:application/pdf') ||
                    (documentData.length > 100 && documentData.substring(0, 100).includes('JVBERi0'));
      
      // Normalize data URI format
      if (!documentData.startsWith('data:')) {
        if (isPDF) {
          documentData = `data:application/pdf;base64,${documentData}`;
        } else {
          documentData = `data:image/jpeg;base64,${documentData}`;
        }
      }
      
      // Untuk PDF, langsung download saja
      if (isPDF) {
        const link = document.createElement('a');
        link.href = documentData;
        link.download = doc.name || `SJ-${item.sjNo}-signed.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      } else {
        // Untuk image, buka di new window
        const newWindow = window.open();
        if (!newWindow) {
          showAlert('Error', 'Popup blocked. Please allow popups to view document.');
          return;
        }
        newWindow.document.write(`
          <html>
            <head>
              <title>${doc.name || 'Signed Document'}</title>
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
            <img src="${documentData}" alt="${doc.name || 'Signed Document'}" 
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
  
  const handleDownloadSignedDocument = async (item: SuratJalan, doc?: SignedDocument) => {
    const docs = doc ? [doc] : normalizeSignedDocuments(item);
    
    if (docs.length === 0) {
      showAlert('Error', 'No signed document available');
      return;
    }

    // Download semua files
    for (const docItem of docs) {
    try {
        let documentData = docItem.document;
      
        if (docItem.path) {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI && typeof electronAPI.loadUploadedFile === 'function') {
          try {
              const result = await electronAPI.loadUploadedFile(docItem.path);
            if (result && result.success) {
                documentData = result.data || '';
            } else {
              throw new Error(result?.error || 'Failed to load file from file system');
            }
          } catch (loadError: any) {
              showAlert('Error', `Gagal memuat file ${docItem.name}: ${loadError.message}`);
              continue;
          }
        } else {
            showAlert('Error', `File ${docItem.name} disimpan sebagai file system, tetapi Electron API tidak tersedia.`);
            continue;
        }
      }
      
        if (!documentData) {
          continue;
      }
      
        const isPDF = docItem.type === 'pdf' || docItem.name.toLowerCase().endsWith('.pdf');
      
        // Extract base64 data
        let base64Data = documentData;
        let mimeType = isPDF ? 'application/pdf' : 'image/png';
      
      if (base64Data && base64Data.includes(',')) {
        const parts = base64Data.split(',');
        base64Data = parts[1] || '';
        const mimeMatch = parts[0].match(/data:([^;]+)/);
        if (mimeMatch) {
          mimeType = mimeMatch[1];
        }
      }
      
      if (!base64Data) {
          continue;
      }
      
      // Convert base64 to blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
        link.download = docItem.name || `SJ-${item.sjNo}-signed.${isPDF ? 'pdf' : 'png'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
        
        // Delay sedikit antara downloads
        if (docs.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
    } catch (error: any) {
        showAlert('Error', `Error downloading ${docItem.name}: ${error.message}`);
      }
    }
  };

  const filteredSuratJalan = useMemo(() => {
    const filtered = (suratJalan || []).filter(sj => {
      if (!sj) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        (sj.sjNo || '').toLowerCase().includes(query) ||
        (sj.doNo || '').toLowerCase().includes(query) ||
        (sj.customerName || '').toLowerCase().includes(query) ||
        (sj.driverName || '').toLowerCase().includes(query) ||
        (sj.vehicleNo || '').toLowerCase().includes(query) ||
        (sj.status || '').toLowerCase().includes(query)
      );
    });
    // Sort by created date (newest first)
    return filtered.sort((a, b) => {
      const dateA = a.created ? new Date(a.created).getTime() : (a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0);
      const dateB = b.created ? new Date(b.created).getTime() : (b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0);
      return dateB - dateA; // Newest first
    });
  }, [suratJalan, searchQuery]);

  const columns = [
    { key: 'no', header: 'No' },
    { key: 'sjNo', header: 'SJ No' },
    { key: 'doNo', header: 'DO No' },
    { key: 'customerName', header: 'Customer' },
    { key: 'driverName', header: 'Driver' },
    { key: 'vehicleNo', header: 'Vehicle' },
    { key: 'routeName', header: 'Route' },
    { key: 'scheduledDate', header: 'Scheduled Date' },
    {
      key: 'receivedDate',
      header: 'SJ Kembali',
      render: (item: SuratJalan) => (
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
      render: (item: SuratJalan) => {
        const docs = normalizeSignedDocuments(item);
        if (docs.length === 0) {
          return <span style={{ color: '#999', fontSize: '12px' }}>-</span>;
        }
        return (
          <span style={{ color: '#4CAF50', fontSize: '12px' }}>
            ✓ {docs.length} file{docs.length > 1 ? 's' : ''}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: SuratJalan) => (
        <span className={`status-badge status-${item.status?.toLowerCase().replace('_', '-')}`}>
          {item.status}
        </span>
      ),
    },
    { 
      key: 'created', 
      header: 'Created',
      render: (item: SuratJalan) => {
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
      render: (item: SuratJalan) => (
        <ActionMenu
          onReopen={item.status === 'Close' ? () => handleStatusChange(item, 'Open') : undefined}
          onEdit={() => handleEdit(item)}
          onViewPDF={() => handleViewPDF(item)}
          onUploadSigned={normalizeSignedDocuments(item).length === 0 ? () => handleUploadSignedDocument(item) : undefined}
          onViewSigned={normalizeSignedDocuments(item).length > 0 ? () => handleViewSignedDocument(item) : undefined}
          onDelete={item.status === 'Open' ? () => handleDelete(item) : undefined}
        />
      ),
    },
  ];

  return (
    <div className="module-compact">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
          <h2>Surat Jalan</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {notifications.length > 0 && (
              <NotificationBell
                notifications={sjNotifications}
                onNotificationClick={(notification) => {
                  if (notification.notif) {
                    handleCreateFromNotification(notification.notif);
                  }
                }}
                onDeleteNotification={handleDeleteNotification}
                icon="📄"
                emptyMessage="Tidak ada notifikasi Petty Cash yang perlu dibuat Surat Jalan"
              />
            )}
            <Button onClick={() => {
              setEditingItem(null);
              setFormData({ 
                sjNo: '', 
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
              + Create Surat Jalan
            </Button>
          </div>
        </div>

        {/* Notification Dialog */}
        {notificationDialog.show && notificationDialog.notif && (
          <div className="dialog-overlay" onClick={() => setNotificationDialog({ show: false, notif: null })}>
            <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
              <Card className="dialog-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2>📄 Create Surat Jalan</h2>
                  <Button variant="secondary" onClick={() => setNotificationDialog({ show: false, notif: null })} style={{ padding: '6px 12px' }}>✕</Button>
                </div>
                
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
                  <div style={{ marginBottom: '8px' }}><strong>Petty Cash Request:</strong> {notificationDialog.notif.pettyCashRequestNo}</div>
                  <div style={{ marginBottom: '8px' }}><strong>Amount:</strong> Rp {(notificationDialog.notif.amount || 0).toLocaleString('id-ID')}</div>
                  <div style={{ marginBottom: '8px' }}><strong>Driver:</strong> {notificationDialog.notif.driverName} ({notificationDialog.notif.driverCode})</div>
                  <div style={{ marginBottom: '8px' }}><strong>DO No:</strong> {notificationDialog.notif.doNo || '-'}</div>
                  <div><strong>Distributed Date:</strong> {notificationDialog.notif.distributedDate || '-'}</div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <Button variant="secondary" onClick={() => setNotificationDialog({ show: false, notif: null })}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={() => handleLoadFormFromNotification(notificationDialog.notif)}>
                    Create Surat Jalan
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
              sjNo: '', 
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
                  <h2>{editingItem ? '✏️ Edit Surat Jalan' : '📄 Create Surat Jalan'}</h2>
                  <Button variant="secondary" onClick={() => {
                    setShowFormDialog(false);
                    setEditingItem(null);
                    setNotificationDialog({ show: false, notif: null });
                    setFormData({ 
                      sjNo: '', 
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
                label="SJ No"
                value={formData.sjNo || ''}
                onChange={(v) => setFormData({ ...formData, sjNo: v })}
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
                  sjNo: '', 
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
                {editingItem ? 'Update Surat Jalan' : 'Save Surat Jalan'}
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
              placeholder="Search by SJ No, DO No, Customer, Driver, Vehicle, Status..."
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
              {filteredSuratJalan.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
                  {filteredSuratJalan.map((item) => (
                    <Card key={item.id} style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>{item.sjNo}</div>
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
                        {normalizeSignedDocuments(item).length > 0 && (
                          <div style={{ color: '#4CAF50', fontWeight: 600 }}>
                            ✓ {normalizeSignedDocuments(item).length} Signed Document{normalizeSignedDocuments(item).length > 1 ? 's' : ''} Uploaded
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
                        {normalizeSignedDocuments(item).length === 0 ? (
                          <Button variant="success" onClick={() => handleUploadSignedDocument(item)} style={{ fontSize: '11px', padding: '4px 8px' }}>
                            📤 Upload Signed SJ
                          </Button>
                        ) : (
                          <Button variant="secondary" onClick={() => handleViewSignedDocument(item)} style={{ fontSize: '11px', padding: '4px 8px' }}>
                            👁️ View Signed SJ ({normalizeSignedDocuments(item).length})
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
            </>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <Table columns={columns} data={filteredSuratJalan} emptyMessage={searchQuery ? "No surat jalan found matching your search" : "No surat jalan data"} />
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
                <h2>Surat Jalan Preview - {viewPdfData.sjNo}</h2>
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
                    height: '80vh',
                    border: 'none',
                    minHeight: '600px'
                  }}
                  title="Surat Jalan Preview"
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
                <h2>Signed Documents - {viewingDocumentsItem.sjNo} ({viewingDocuments.length} files)</h2>
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
                onDownload={() => handleDownloadSignedDocument(viewingDocumentsItem, viewingDocuments[selectedDocumentIndex])}
                onDownloadAll={() => handleDownloadSignedDocument(viewingDocumentsItem)}
              />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

// Document Viewer Component
const DocumentViewer = ({ item, doc, index, total, onPrevious, onNext, onDownload, onDownloadAll }: {
  item: SuratJalan;
  doc: SignedDocument;
  index: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
  onDownload: () => void;
  onDownloadAll: () => void;
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
      if (!data.startsWith('data:')) {
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
              height: '100%',
              minHeight: '500px',
              border: 'none',
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

export default SuratJalan;

