import { useState, useEffect, useMemo, useRef } from 'react';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import NotificationBell from '../../../components/NotificationBell';
import { storageService, StorageKeys, extractStorageValue } from '../../../services/storage';
import { filterActiveItems } from '../../../utils/trucking-delete-helper';
import { setupRealTimeSync, TRUCKING_SYNC_KEYS } from '../../../utils/real-time-sync-helper';
import { useDialog } from '../../../hooks/useDialog';
import { openPrintWindow, isMobile, isCapacitor, savePdfForMobile } from '../../../utils/actions';
import { loadLogoAsBase64 } from '../../../utils/logo-loader';
import { generatePettyCashMemoHtml } from '../../../pdf/pettycash-memo-pdf-template';
import '../../../styles/common.css';
import '../../../styles/compact.css';

interface PettyCashRequest {
  id: string;
  no: number;
  requestNo: string;
  driverId: string;
  driverName: string;
  driverCode: string;
  amount: number;
  purpose: string;
  description: string;
  requestDate: string;
  status: 'Open' | 'Close';
  approvedBy?: string;
  approvedDate?: string;
  rejectedReason?: string;
  paidDate?: string;
  receiptProof?: string;
  receiptProofName?: string;
  transferProof?: string; // Bukti transfer untuk distribusi
  transferProofName?: string; // Nama file bukti transfer
  distributedDate?: string; // Tanggal distribusi
  notes?: string;
  doNo?: string; // Reference ke DO untuk menghindari duplicate data
}

interface PettyCashMemoItem {
  id: string;
  no: number;
  customer: string;
  tujuan: string;
  unit: string;
  uraian: string;
  ket: string;
  nominal: number;
}

interface PettyCashMemo {
  id: string;
  memoNo: string;
  memoDate: string;
  location: string;
  items: PettyCashMemoItem[];
  total: number;
  bankAccountNo: string;
  bankName: string;
  recipientName: string;
  createdAt: string;
}

// Action Menu Component untuk compact actions
const ActionMenu = ({ onApprove, onReject, onEdit, onDelete, onDistribute, onViewReceipt, onViewTransferProof, onGenerateMemo, hasMemo, onViewMemo, showApprove, showReject }: {
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDistribute?: () => void;
  onViewReceipt?: () => void;
  onViewTransferProof?: () => void;
  onGenerateMemo: () => void;
  hasMemo?: boolean;
  onViewMemo?: () => void;
  showApprove?: boolean;
  showReject?: boolean;
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
      const updatePosition = () => {
        if (!buttonRef.current) return;
        
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const estimatedMenuHeight = 300; // Estimate menu height
        const spaceBelow = window.innerHeight - buttonRect.bottom;
        const spaceAbove = buttonRect.top;
        
        // Check if menu is rendered and get actual height
        if (menuRef.current) {
          const actualMenuHeight = menuRef.current.offsetHeight;
          const openUpward = spaceBelow < actualMenuHeight && spaceAbove > spaceBelow;
          
          setMenuPosition({
            top: openUpward ? buttonRect.top - actualMenuHeight - 4 : buttonRect.bottom + 4,
            right: window.innerWidth - buttonRect.right,
          });
        } else {
          // Initial position before menu is rendered
          const openUpward = spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow;
          setMenuPosition({
            top: openUpward ? buttonRect.top - estimatedMenuHeight - 4 : buttonRect.bottom + 4,
            right: window.innerWidth - buttonRect.right,
          });
        }
      };
      
      // Update position immediately
      updatePosition();
      
      // Update again after menu is rendered (using setTimeout to ensure DOM is updated)
      const timeoutId = setTimeout(updatePosition, 0);
      
      // Also update on window resize or scroll
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      
      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
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
            top: `${Math.max(4, Math.min(menuPosition.top, window.innerHeight - 100))}px`,
            right: `${Math.max(4, Math.min(menuPosition.right, window.innerWidth - 170))}px`,
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 10000,
            minWidth: '160px',
            maxWidth: '220px',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'calc(100vh - 8px)',
            overflowY: 'auto',
          }}
        >
          {showApprove !== false && (
            <button
              onClick={() => { onApprove(); setShowMenu(false); }}
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
              ✓ Approve
            </button>
          )}
          {showReject !== false && (
            <button
              onClick={() => { onReject(); setShowMenu(false); }}
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
              ✗ Reject
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
          {onDistribute && (
            <button
              onClick={() => { onDistribute(); setShowMenu(false); }}
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
              📤 Distribusi
            </button>
          )}
          {onViewReceipt && (
            <button
              onClick={() => { onViewReceipt(); setShowMenu(false); }}
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
              📄 View Receipt
            </button>
          )}
          {onViewTransferProof && (
            <button
              onClick={() => { onViewTransferProof(); setShowMenu(false); }}
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
              📎 View Transfer Proof
            </button>
          )}
          {hasMemo && onViewMemo ? (
            <button
              onClick={() => { onViewMemo(); setShowMenu(false); }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '6px 10px',
                border: 'none',
                background: 'transparent',
                color: '#4CAF50',
                cursor: 'pointer',
                fontSize: '11px',
                borderRadius: '4px',
                fontWeight: '500',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(76, 175, 80, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              ✓ View Memo
            </button>
          ) : (
            <button
              onClick={() => { onGenerateMemo(); setShowMenu(false); }}
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
              📄 Generate Memo
            </button>
          )}
          <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
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
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            🗑️ Delete
          </button>
        </div>
      )}
    </>
  );
};

const PettyCash = () => {
  const [requests, setRequests] = useState<PettyCashRequest[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  
  // Format notifications untuk NotificationBell
  const pettyCashNotifications = useMemo(() => {
    return notifications.map((notif: any) => ({
      id: notif.id,
      title: `DO ${notif.doNo || 'N/A'}`,
      message: `Driver: ${notif.driverName || 'N/A'} | Route: ${notif.routeName || 'N/A'} | Vehicle: ${notif.vehicleNo || 'N/A'}`,
      timestamp: notif.created || notif.scheduledDate || notif.timestamp,
      notif: notif, // Keep original data
    }));
  }, [notifications]);
  const [showMemoDialog, setShowMemoDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [activeTab, setActiveTab] = useState<'requests' | 'memo'>('requests');
  const [showSelectRequestDialog, setShowSelectRequestDialog] = useState(false);
  const [selectedRequestsForMemo, setSelectedRequestsForMemo] = useState<string[]>([]);
  // Custom Dialog - menggunakan hook terpusat
  const { showAlert: showAlertBase, showConfirm: showConfirmBase, DialogComponent } = useDialog();
  
  // Wrapper untuk kompatibilitas dengan urutan parameter yang berbeda
  const showAlert = (message: string, title: string = 'Information') => {
    showAlertBase(message, title);
  };
  
  const showConfirm = (message: string, onConfirm: () => void, onCancel?: () => void, title: string = 'Confirmation') => {
    showConfirmBase(message, onConfirm, onCancel, title);
  };

  const [editingItem, setEditingItem] = useState<PettyCashRequest | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [notificationDialog, setNotificationDialog] = useState<{
    show: boolean;
    notif: any | null;
    amount: string;
    purpose: string;
    description: string;
  }>({
    show: false,
    notif: null,
    amount: '',
    purpose: '',
    description: '',
  });
  const [formData, setFormData] = useState<Partial<PettyCashRequest>>({
    driverId: '',
    amount: 0,
    purpose: '',
    description: '',
    requestDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  
  // Memo state (showMemoForm sudah tidak digunakan, diganti showMemoDialog)
  const [memos, setMemos] = useState<PettyCashMemo[]>([]);
  const [memoFormData, setMemoFormData] = useState<Partial<PettyCashMemo>>({
    memoDate: new Date().toISOString().split('T')[0],
    location: 'Cikarang',
    items: [],
    bankAccountNo: '0418 0100 1673 566',
    bankName: 'BRI',
    recipientName: 'Dirgantoro A Trimantoko',
  });
  
  // selectedRequests sudah tidak digunakan lagi, generate memo langsung dari action menu
  
  // PDF Preview state
  const [viewPdfData, setViewPdfData] = useState<{ html: string; memoNo: string } | null>(null);
  
  // Transfer Proof View Dialog state
  const [viewTransferProof, setViewTransferProof] = useState<{
    show: boolean;
    proof: string;
    proofName: string;
  } | null>(null);

  useEffect(() => {
    loadAllData();
    
    // Real-time listener untuk server updates
    const cleanup = setupRealTimeSync({
      keys: [TRUCKING_SYNC_KEYS.PETTYCASH_REQUESTS, TRUCKING_SYNC_KEYS.DELIVERY_ORDERS, TRUCKING_SYNC_KEYS.PETTYCASH_MEMOS, TRUCKING_SYNC_KEYS.PETTYCASH_NOTIFICATIONS],
      onUpdate: loadAllData,
    });
    
    // Auto-refresh setiap 10 detik untuk memastikan data baru dari DO langsung muncul
    const interval = setInterval(loadAllData, 10000);
    
    return () => {
      clearInterval(interval);
      cleanup();
    };
  }, []);

  const loadAllData = async () => {
    try {
      console.log('[PettyCash] 🔄 Loading all data...');
      // Load semua data menggunakan storageService untuk membaca dari file storage juga
      const [requestsDataRaw, doDataRaw, memosDataRaw, driversData, notifData] = await Promise.all([
        storageService.get<PettyCashRequest[]>(StorageKeys.TRUCKING.PETTY_CASH_REQUESTS),
        storageService.get<any[]>(StorageKeys.TRUCKING.DELIVERY_ORDERS),
        storageService.get<PettyCashMemo[]>(StorageKeys.TRUCKING.PETTY_CASH_MEMOS),
        storageService.get<any[]>(StorageKeys.TRUCKING.DRIVERS),
        storageService.get<any[]>(StorageKeys.TRUCKING.PETTY_CASH_NOTIFICATIONS),
      ]);
      
      // Ensure arrays (handle null/undefined and wrapped objects)
      const requestsData = extractStorageValue(requestsDataRaw);
      const doData = extractStorageValue(doDataRaw);
      const memosData = extractStorageValue(memosDataRaw);
      const notificationsData = extractStorageValue(notifData);
      const driversDataArray = extractStorageValue(driversData);
      
      console.log('[PettyCash] 📊 Raw data loaded:', {
        requests: requestsData.length,
        deliveryOrders: doData.length,
        memos: memosData.length,
        drivers: driversDataArray.length,
        notifications: notificationsData.length,
      });
      
      // Filter out deleted DOs menggunakan helper function
      const activeDOs = filterActiveItems(doData);
      const activeDONos = new Set(activeDOs.map((d: any) => d.doNo));
      
      // Filter out deleted items menggunakan helper function
      const activeRequests = filterActiveItems(requestsData);
      
      console.log(`[PettyCash] ✅ Loaded ${requestsData.length} requests, filtered to ${activeRequests.length} active requests`);
      
      // Log detail setiap request untuk debugging
      activeRequests.forEach((req: any, idx: number) => {
        console.log(`[PettyCash] Request ${idx + 1}:`, {
          requestNo: req.requestNo,
          doNo: req.doNo,
          driverName: req.driverName,
          amount: req.amount,
          status: req.status,
          requestDate: req.requestDate,
        });
      });
      
      // Sort by requestDate (newest first)
      const sortedRequests = activeRequests.sort((a, b) => {
        const dateA = a.requestDate ? new Date(a.requestDate).getTime() : 0;
        const dateB = b.requestDate ? new Date(b.requestDate).getTime() : 0;
        return dateB - dateA; // Newest first
      });
      setRequests(sortedRequests.map((r, idx) => ({ ...r, no: idx + 1 })));
      
      // Filter out deleted drivers menggunakan helper function
      const activeDrivers = filterActiveItems(driversDataArray).filter((d: any) => d.status === 'Active');
      setDrivers(activeDrivers);
      
      // Filter out deleted notifications and only show PENDING ones
      // Also filter out notifications for deleted DOs
      // Also filter out notifications that already have a petty cash request
      const requestDONos = new Set(requestsData.map((r: any) => r.doNo).filter(Boolean));
      const activeNotifs = filterActiveItems(notificationsData).filter((n: any) => {
        // Exclude notifications for deleted DOs
        if (n.doNo && !activeDONos.has(n.doNo)) {
          return false;
        }
        // Exclude notifications that already have a petty cash request
        if (n.doNo && requestDONos.has(n.doNo)) {
          return false;
        }
        // Only show SCHEDULE_CREATED notifications that are Open
        return n.type === 'SCHEDULE_CREATED' && (n.status || 'Open') === 'Open';
      });
      
      // Hapus notifikasi yang sudah punya request dari storage
      if (requestDONos.size > 0 && notificationsData.length > 0) {
        const notificationsToRemove = notificationsData.filter((n: any) => 
          n.type === 'SCHEDULE_CREATED' && n.doNo && requestDONos.has(n.doNo)
        );
        
        if (notificationsToRemove.length > 0) {
          const allNotifications = await storageService.get<any[]>(StorageKeys.TRUCKING.PETTY_CASH_NOTIFICATIONS) || [];
          const updatedNotifications = allNotifications.filter((n: any) => 
            !(n.type === 'SCHEDULE_CREATED' && n.doNo && requestDONos.has(n.doNo))
          );
          await storageService.set(StorageKeys.TRUCKING.PETTY_CASH_NOTIFICATIONS, updatedNotifications);
          console.log(`[PettyCash] Removed ${notificationsToRemove.length} notifications for DOs with existing requests`);
        }
      }
      
      setNotifications(activeNotifs);
      
      // Filter out deleted items sebagai safety net (jaga-jaga kalau masih ada data yang ter-mark sebagai deleted)
      const activeMemos = filterActiveItems(memosData || []);
      console.log(`[PettyCash] Loaded ${memosData.length} memos, filtered to ${activeMemos.length} active memos`);
      setMemos(activeMemos);
      
      console.log('[PettyCash] ✅ Data loading complete');
    } catch (error: any) {
      console.error('[PettyCash] ❌ Error loading data:', error);
    }
  };

  const generateRequestNo = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `PC-${year}${month}${day}-${random}`;
  };

  const handleLoadFromDriver = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (driver) {
      setFormData({
        ...formData,
        driverId: driver.id,
        driverName: driver.name,
        driverCode: driver.driverCode,
      });
    }
  };

  const handleSave = async () => {
    try {
      // Validation dengan pesan yang lebih spesifik
      if (!formData.driverId) {
        showAlert('Driver harus dipilih', 'Information');
        return;
      }
      
      if (!formData.amount || formData.amount <= 0) {
        if (editingItem && editingItem.doNo) {
          showAlert(`Amount harus diisi. Jika auto-fill gagal, cek DO ${editingItem.doNo} apakah ada totalDeal-nya.`, 'Information');
        } else {
          showAlert('Amount harus diisi dan lebih dari 0', 'Information');
        }
        return;
      }
      
      if (!formData.purpose) {
        showAlert('Purpose harus diisi', 'Information');
        return;
      }

      const driver = drivers.find(d => d.id === formData.driverId);
      if (!driver) {
        showAlert('Driver tidak ditemukan', 'Information');
        return;
      }

      if (editingItem) {
        const updated = requests.map(r =>
          r.id === editingItem.id
            ? { 
                ...formData, 
                id: editingItem.id, 
                no: editingItem.no,
                driverName: driver.name,
                driverCode: driver.driverCode,
                requestNo: editingItem.requestNo,
                doNo: editingItem.doNo, // Preserve DO reference
              } as PettyCashRequest
            : r
        );
        await storageService.set(StorageKeys.TRUCKING.PETTY_CASH_REQUESTS, updated);
        // Sort by requestDate (newest first)
        const sortedUpdated = updated.sort((a, b) => {
          const dateA = a.requestDate ? new Date(a.requestDate).getTime() : 0;
          const dateB = b.requestDate ? new Date(b.requestDate).getTime() : 0;
          return dateB - dateA; // Newest first
        });
        setRequests(sortedUpdated.map((r, idx) => ({ ...r, no: idx + 1 })));
      } else {
        const newRequest: PettyCashRequest = {
          id: Date.now().toString(),
          no: requests.length + 1,
          requestNo: generateRequestNo(),
          driverId: driver.id,
          driverName: driver.name,
          driverCode: driver.driverCode,
          amount: formData.amount || 0,
          purpose: formData.purpose || '',
          description: formData.description || '',
          requestDate: formData.requestDate || new Date().toISOString().split('T')[0],
          status: 'Open',
          notes: formData.notes || '',
        };
        const updated = [...requests, newRequest];
        await storageService.set(StorageKeys.TRUCKING.PETTY_CASH_REQUESTS, updated);
        // Sort by requestDate (newest first)
        const sortedUpdated = updated.sort((a, b) => {
          const dateA = a.requestDate ? new Date(a.requestDate).getTime() : 0;
          const dateB = b.requestDate ? new Date(b.requestDate).getTime() : 0;
          return dateB - dateA; // Newest first
        });
        setRequests(sortedUpdated.map((r, idx) => ({ ...r, no: idx + 1 })));
        
        // Hapus notification setelah request dibuat dari notification
        // Cek apakah ada notification yang sesuai dengan driver dan DO
        const allNotifications = await storageService.get<any[]>(StorageKeys.TRUCKING.PETTY_CASH_NOTIFICATIONS) || [];
        const matchingNotif = allNotifications.find((n: any) => 
          n.type === 'SCHEDULE_CREATED' && 
          n.driverId === newRequest.driverId &&
          (n.status || 'PENDING') === 'PENDING'
        );
        
        if (matchingNotif) {
          const updatedNotifications = allNotifications.filter((n: any) => n.id !== matchingNotif.id);
          await storageService.set(StorageKeys.TRUCKING.PETTY_CASH_NOTIFICATIONS, updatedNotifications);
          setNotifications(updatedNotifications.filter((n: any) => 
            n.type === 'SCHEDULE_CREATED' && (n.status || 'Open') === 'Open'
          ));
        }
      }
      setShowFormDialog(false);
      setEditingItem(null);
      setFormData({
        driverId: '',
        amount: 0,
        purpose: '',
        description: '',
        requestDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
      showAlert('✅ Petty Cash Request berhasil disimpan', 'Success');
    } catch (error: any) {
      showAlert(`Error saving request: ${error.message}`, 'Error');
    }
  };

  const handleApprove = async (item: PettyCashRequest) => {
    showConfirm(
      `Approve petty cash request ${item.requestNo} untuk ${item.driverName} sebesar Rp ${item.amount.toLocaleString('id-ID')}?`,
      async () => {
        try {
          const updated = requests.map(r =>
            r.id === item.id
              ? { 
                  ...r, 
                  status: 'Open' as const,
                  approvedBy: 'Admin', // TODO: Get from current user
                  approvedDate: new Date().toISOString().split('T')[0],
                }
              : r
          );
          await storageService.set(StorageKeys.TRUCKING.PETTY_CASH_REQUESTS, updated);
          
          // Sort by requestDate (newest first)
          const sortedUpdated = updated.sort((a, b) => {
          const dateA = a.requestDate ? new Date(a.requestDate).getTime() : 0;
          const dateB = b.requestDate ? new Date(b.requestDate).getTime() : 0;
          return dateB - dateA; // Newest first
        });
        setRequests(sortedUpdated.map((r, idx) => ({ ...r, no: idx + 1 })));
        showAlert('✅ Request approved', 'Success');
        } catch (error: any) {
          showAlert(`Error approving request: ${error.message}`, 'Error');
        }
      },
      undefined,
      'Confirm Approval'
    );
  };

  const handleReject = async (item: PettyCashRequest) => {
    const reason = prompt(`Masukkan alasan reject untuk request ${item.requestNo}:`);
    if (!reason) return;
    
    try {
      const updated = requests.map(r =>
        r.id === item.id
          ? { 
              ...r, 
              status: 'Close' as const,
              rejectedReason: reason,
              approvedDate: new Date().toISOString().split('T')[0],
            }
          : r
      );
      await storageService.set(StorageKeys.TRUCKING.PETTY_CASH_REQUESTS, updated);
      setRequests(updated.map((r, idx) => ({ ...r, no: idx + 1 })));
      showAlert('❌ Request rejected', 'Information');
    } catch (error: any) {
      showAlert(`Error rejecting request: ${error.message}`, 'Error');
    }
  };

  // handleMarkAsPaid sudah digabung ke handleDistributePettyCash

  const handleViewReceipt = (item: PettyCashRequest) => {
    if (!item.receiptProof) {
      showAlert('Receipt proof belum di-upload', 'Information');
      return;
    }
    
    const newWindow = window.open();
    if (newWindow && item.receiptProof) {
      if (item.receiptProof.startsWith('data:image/')) {
        newWindow.document.write(`<img src="${item.receiptProof}" style="max-width: 100%; height: auto;" />`);
      } else if (item.receiptProof.startsWith('data:application/pdf')) {
        newWindow.document.write(`<iframe src="${item.receiptProof}" style="width: 100%; height: 100vh; border: none;"></iframe>`);
      }
    }
  };

  const handleDistributePettyCash = async (item: PettyCashRequest) => {
    if (item.status !== 'Open') {
      showAlert('Hanya request dengan status Open yang bisa di-distribusi', 'Information');
      return;
    }
    
    // Konfirmasi distribusi tanpa upload file
    showConfirm(
      `Konfirmasi distribusi Petty Cash Request ${item.requestNo}?\n\n` +
      `Driver: ${item.driverName} (${item.driverCode})\n` +
      `Amount: Rp ${item.amount.toLocaleString('id-ID')}\n` +
      `Purpose: ${item.purpose}\n\n` +
      `Petty cash akan ditandai sebagai sudah di-distribusi.`,
      async () => {
        try {
          // Update dengan distributedDate saja, tanpa upload file
          const updated = requests.map(r =>
            r.id === item.id
              ? { 
                  ...r, 
                  status: 'Open' as const,
                  distributedDate: new Date().toISOString().split('T')[0],
                }
              : r
          );
          await processDistributionUpdate(updated, item);
        } catch (error: any) {
          showAlert(`Error distributing petty cash: ${error.message}`, 'Error');
        }
      },
      undefined,
      'Confirm Distribution'
    );
  };

  const processDistributionUpdate = async (
    updated: PettyCashRequest[],
    item: PettyCashRequest
  ) => {
    try {
          await storageService.set(StorageKeys.TRUCKING.PETTY_CASH_REQUESTS, updated);
          // Sort by requestDate (newest first)
          const sortedUpdated = updated.sort((a, b) => {
            const dateA = a.requestDate ? new Date(a.requestDate).getTime() : 0;
            const dateB = b.requestDate ? new Date(b.requestDate).getTime() : 0;
            return dateB - dateA; // Newest first
          });
          setRequests(sortedUpdated.map((r, idx) => ({ ...r, no: idx + 1 })));
          
          // Auto-create journal entries untuk General Ledger
          try {
            const journalEntries = await storageService.get<any[]>(StorageKeys.TRUCKING.JOURNAL_ENTRIES) || [];
            const accounts = await storageService.get<any[]>(StorageKeys.TRUCKING.ACCOUNTS) || [];
            const accountsArray = Array.isArray(accounts) ? accounts : [];
            
            if (accountsArray.length === 0) {
              const defaultAccounts = [
                { code: '1000', name: 'Cash', type: 'Asset', balance: 0 },
                { code: '1100', name: 'Accounts Receivable', type: 'Asset', balance: 0 },
                { code: '1200', name: 'Inventory', type: 'Asset', balance: 0 },
                { code: '1300', name: 'Fixed Assets', type: 'Asset', balance: 0 },
                { code: '2000', name: 'Accounts Payable', type: 'Liability', balance: 0 },
                { code: '2100', name: 'Tax Payable', type: 'Liability', balance: 0 },
                { code: '3000', name: 'Equity', type: 'Equity', balance: 0 },
                { code: '3100', name: 'Retained Earnings', type: 'Equity', balance: 0 },
                { code: '4000', name: 'Sales Revenue', type: 'Revenue', balance: 0 },
                { code: '4100', name: 'Other Income', type: 'Revenue', balance: 0 },
                { code: '5000', name: 'Cost of Goods Sold', type: 'Expense', balance: 0 },
                { code: '6000', name: 'Operating Expenses', type: 'Expense', balance: 0 },
                { code: '6100', name: 'Administrative Expenses', type: 'Expense', balance: 0 },
                { code: '6200', name: 'Financial Expenses', type: 'Expense', balance: 0 },
              ];
              await storageService.set(StorageKeys.TRUCKING.ACCOUNTS, defaultAccounts);
            }
            
            const entryDate = new Date().toISOString().split('T')[0];
            const expenseAccount = accountsArray.find((a: any) => a.code === '6000') || { code: '6000', name: 'Operating Expenses' };
            const cashAccount = accountsArray.find((a: any) => a.code === '1000') || { code: '1000', name: 'Cash' };
            
            const reference = `PETTYCASH-${item.requestNo}`;
            const hasEntry = journalEntries.some((entry: any) =>
              entry.reference === reference &&
              (entry.account === '6000' || entry.account === '1000')
            );

            if (!hasEntry) {
              const entriesToAdd = [
                {
                  entryDate,
                  reference,
                  account: '6000',
                  accountName: expenseAccount.name,
                  debit: item.amount,
                  credit: 0,
                  description: `Petty Cash ${item.requestNo} - ${item.driverName} - ${item.purpose}`,
                },
                {
                  entryDate,
                  reference,
                  account: '1000',
                  accountName: cashAccount.name,
                  debit: 0,
                  credit: item.amount,
                  description: `Petty Cash ${item.requestNo} - ${item.driverName}`,
                },
              ];

              const journalEntriesArray = Array.isArray(journalEntries) ? journalEntries : [];
              const baseLength = journalEntriesArray.length;
              const entriesWithNo = entriesToAdd.map((entry, idx) => ({
                ...entry,
                id: `${Date.now()}-pc-${idx + 1}`,
                no: baseLength + idx + 1,
              }));
              
              await storageService.set(StorageKeys.TRUCKING.JOURNAL_ENTRIES, [...journalEntriesArray, ...entriesWithNo]);
              console.log(`✅ Journal entries created for Petty Cash ${item.requestNo}: Expense +${item.amount}, Cash -${item.amount}`);
            }
          } catch (error: any) {
            console.error('Error creating journal entries for petty cash:', error);
            // Jangan block proses, hanya log error
          }
          
          // 🚀 AUTO-CREATE SURAT JALAN setelah distribusi Petty Cash
          try {
            if (item.doNo) {
              // Load DO data untuk mendapatkan informasi lengkap
              const deliveryOrdersRaw = await storageService.get<any[]>(StorageKeys.TRUCKING.DELIVERY_ORDERS) || [];
              // Filter active items menggunakan helper function
              const deliveryOrders = filterActiveItems(deliveryOrdersRaw);
              const doData = deliveryOrders.find((doItem: any) => doItem.doNo === item.doNo);
              
              if (doData) {
                // Cek apakah Surat Jalan sudah ada
                const allDN = await storageService.get<any[]>(StorageKeys.TRUCKING.SURAT_JALAN) || [];
                const existingDN = allDN.find((dn: any) => dn.doNo === item.doNo && !dn.deleted);
                
                if (!existingDN) {
                  // Load data untuk create Delivery Note
                  const [driversDataRaw, vehiclesDataRaw, routesDataRaw] = await Promise.all([
                    storageService.get<any[]>(StorageKeys.TRUCKING.DRIVERS),
                    storageService.get<any[]>(StorageKeys.TRUCKING.VEHICLES),
                    storageService.get<any[]>(StorageKeys.TRUCKING.ROUTES),
                  ]);
                  
                  const driversData = driversDataRaw || [];
                  const vehiclesData = vehiclesDataRaw || [];
                  const routesData = routesDataRaw || [];
                  
                  const driver = driversData.find((d: any) => d.id === doData.driverId);
                  const vehicle = vehiclesData.find((v: any) => v.id === doData.vehicleId);
                  const route = routesData.find((r: any) => r.id === doData.routeId);
                  
                  // Generate DN No
                  const date = new Date();
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
                  const dnNo = `DN-${year}${month}${day}-${random}`;
                  
                  // Create Delivery Note
                  const now = new Date();
                  const items = Array.isArray(doData.items) ? doData.items : [];
                  const newDN = {
                    id: Date.now().toString(),
                    no: allDN.length + 1,
                    dnNo: dnNo,
                    doNo: doData.doNo || '',
                    customerName: doData.customerName || '',
                    customerAddress: doData.customerAddress || '',
                    driverId: doData.driverId || '',
                    driverName: driver?.name || doData.driverName || '',
                    driverCode: driver?.driverCode || '',
                    vehicleId: doData.vehicleId || '',
                    vehicleNo: vehicle?.vehicleNo || doData.vehicleNo || '',
                    routeId: doData.routeId || '',
                    routeName: route?.routeName || doData.routeName || '',
                    items: items,
                    scheduledDate: doData.scheduledDate || new Date().toISOString().split('T')[0],
                    scheduledTime: doData.scheduledTime || '08:00',
                    status: 'Open',
                    notes: doData.notes || '',
                    pettyCashNo: item.requestNo, // Reference ke Petty Cash
                    created: now.toISOString(),
                    lastUpdate: now.toISOString(),
                    timestamp: now.getTime(),
                    _timestamp: now.getTime(),
                  };
                  
                  await storageService.set(StorageKeys.TRUCKING.SURAT_JALAN, [...allDN, newDN]);
                  console.log(`✅ [PettyCash] Auto-created Surat Jalan ${dnNo} for DO ${doData.doNo} after Petty Cash distribution (${item.requestNo})`);
                } else {
                  console.log(`ℹ️ [PettyCash] Surat Jalan already exists for DO ${item.doNo}: ${existingDN.dnNo}`);
                }
              }
            }
          } catch (error: any) {
            console.error('Error creating Surat Jalan:', error);
            // Jangan block proses, hanya log error
          }
          
          showAlert(
            `✅ Petty cash berhasil di-distribusi!\n\n` +
            (item.doNo ? `📄 Surat Jalan telah dibuat otomatis untuk DO ${item.doNo}.\n` : '') +
            `Silakan cek di menu Shipments > Delivery Note.`,
            'Success'
          );
    } catch (error: any) {
      console.error('Error processing distribution update:', error);
      showAlert(`Error processing distribution: ${error.message}`, 'Error');
    }
  };

  const handleViewTransferProof = (item: PettyCashRequest) => {
    if (!item.transferProof) {
      showAlert('Transfer proof belum di-upload', 'Information');
      return;
    }
    
    setViewTransferProof({
      show: true,
      proof: item.transferProof,
      proofName: item.transferProofName || 'Transfer Proof',
    });
  };

  // 🚀 BULK APPROVE & DISTRIBUTE - Process all Open requests at once
  const handleBulkApproveAndDistribute = async () => {
    const openRequests = requests.filter(r => r.status === 'Open' && r.amount > 0);
    
    if (openRequests.length === 0) {
      showAlert('Tidak ada Petty Cash Request dengan status Open dan amount > 0', 'Information');
      return;
    }

    showConfirm(
      `Approve & Distribute ${openRequests.length} Petty Cash Requests sekaligus?\n\n` +
      `Total Amount: Rp ${openRequests.reduce((sum, r) => sum + r.amount, 0).toLocaleString('id-ID')}\n\n` +
      `⚠️ Semua request akan di-approve dan di-distribute, dan Delivery Note akan dibuat otomatis.`,
      async () => {
        try {
          console.log(`[PettyCash] 🚀 Bulk processing ${openRequests.length} requests...`);
          
          let successCount = 0;
          let suratJalanCount = 0;
          const errors: string[] = [];

          for (const item of openRequests) {
            try {
              // Load all data
              const allRequests = await storageService.get<PettyCashRequest[]>(StorageKeys.TRUCKING.PETTY_CASH_REQUESTS) || [];
              const deliveryOrders = await storageService.get<any[]>(StorageKeys.TRUCKING.DELIVERY_ORDERS) || [];
              const drivers = await storageService.get<any[]>(StorageKeys.TRUCKING.DRIVERS) || [];
              const vehicles = await storageService.get<any[]>(StorageKeys.TRUCKING.VEHICLES) || [];
              const routes = await storageService.get<any[]>(StorageKeys.TRUCKING.ROUTES) || [];
              const deliveryNotes = await storageService.get<any[]>(StorageKeys.TRUCKING.SURAT_JALAN) || [];

              // Update request to Close status
              const updated = allRequests.map(r =>
                r.id === item.id
                  ? {
                      ...r,
                      status: 'Close' as const,
                      distributedDate: new Date().toISOString().split('T')[0],
                    }
                  : r
              );

              await storageService.set(StorageKeys.TRUCKING.PETTY_CASH_REQUESTS, updated);
              await new Promise(resolve => setTimeout(resolve, 500)); // Delay for sync

              // Create Delivery Note if has DO
              if (item.doNo) {
                const existingDN = deliveryNotes.find(dn => dn.doNo === item.doNo && !dn.deleted);
                
                if (!existingDN) {
                  const doItem = deliveryOrders.find(d => d.doNo === item.doNo);
                  if (doItem) {
                    const driver = drivers.find(d => d.id === doItem.driverId);
                    const vehicle = vehicles.find(v => v.id === doItem.vehicleId);
                    const route = routes.find(r => r.id === doItem.routeId);

                    const date = new Date();
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
                    const dnNo = `DN-${year}${month}${day}-${random}`;

                    const newDN = {
                      id: Date.now().toString() + Math.random(),
                      no: deliveryNotes.length + suratJalanCount + 1,
                      dnNo: dnNo,
                      doNo: doItem.doNo,
                      pettyCashNo: item.requestNo,
                      customerName: doItem.customerName,
                      customerAddress: doItem.customerAddress || '',
                      driverId: driver?.id || doItem.driverId || '',
                      driverName: driver?.name || doItem.driverName || '',
                      driverCode: driver?.driverCode || '',
                      vehicleId: vehicle?.id || doItem.vehicleId || '',
                      vehicleNo: vehicle?.vehicleNo || doItem.vehicleNo || '',
                      routeId: route?.id || doItem.routeId || '',
                      routeName: route?.routeName || doItem.routeName || '',
                      items: doItem.items || [],
                      scheduledDate: doItem.deliveryDate || new Date().toISOString().split('T')[0],
                      scheduledTime: '08:00',
                      status: 'Open',
                      notes: doItem.notes || `Origin: ${doItem.origin || 'cikarang'}`,
                      created: new Date().toISOString(),
                      lastUpdate: new Date().toISOString(),
                      timestamp: Date.now(),
                      _timestamp: Date.now(),
                    };

                    deliveryNotes.push(newDN);
                    await storageService.set(StorageKeys.TRUCKING.SURAT_JALAN, deliveryNotes);
                    await new Promise(resolve => setTimeout(resolve, 500)); // Delay for sync
                    suratJalanCount++;
                    console.log(`[PettyCash] ✅ Created Surat Jalan ${dnNo} for ${item.requestNo}`);
                  }
                }
              }

              successCount++;
              console.log(`[PettyCash] ✅ Processed ${item.requestNo}`);
            } catch (error: any) {
              console.error(`[PettyCash] ❌ Error processing ${item.requestNo}:`, error);
              errors.push(`${item.requestNo}: ${error.message}`);
            }
          }

          // Reload data
          await loadAllData();

          // Show summary
          let message = `✅ Bulk processing complete!\n\n`;
          message += `📊 Processed: ${successCount}/${openRequests.length}\n`;
          message += `📄 Delivery Note created: ${suratJalanCount}\n`;
          
          if (errors.length > 0) {
            message += `\n⚠️ Errors (${errors.length}):\n${errors.slice(0, 3).join('\n')}`;
            if (errors.length > 3) {
              message += `\n... and ${errors.length - 3} more`;
            }
          }

          showAlert(message, 'Success');
        } catch (error: any) {
          console.error('[PettyCash] ❌ Bulk processing error:', error);
          showAlert(`Error: ${error.message}`, 'Error');
        }
      },
      undefined,
      'Bulk Approve & Distribute'
    );
  };

  const handleEdit = async (item: PettyCashRequest) => {
    // Set editing item dan form data dulu (dengan amount awal)
    setEditingItem(item);
    setFormData({
      driverId: item.driverId,
      amount: item.amount,
      purpose: item.purpose,
      description: item.description,
      requestDate: item.requestDate,
      notes: item.notes,
    });
    setShowFormDialog(true);
    
    // Auto-fill amount from DO if amount is 0 and doNo exists (async, after form opens)
    if (item.amount === 0 && item.doNo) {
      try {
        console.log(`[PettyCash] 🔍 Attempting auto-fill for ${item.requestNo} with DO ${item.doNo}`);
        
        // Load DO data
        const doDataRaw = await storageService.get<any[]>(StorageKeys.TRUCKING.DELIVERY_ORDERS);
        console.log(`[PettyCash] 📦 Raw DO data from storage:`, doDataRaw);
        
        const activeDOs = filterActiveItems(doDataRaw || []);
        console.log(`[PettyCash] 📊 Found ${activeDOs.length} active DOs`);
        
        if (activeDOs.length > 0) {
          console.log(`[PettyCash] 📋 First 3 DOs:`, activeDOs.slice(0, 3).map((d: any) => ({ doNo: d.doNo, totalDeal: d.totalDeal })));
        }
        
        const matchingDO = activeDOs.find((d: any) => d.doNo === item.doNo);
        console.log(`[PettyCash] 🔎 Matching DO for ${item.doNo}:`, matchingDO);
        
        if (matchingDO && matchingDO.totalDeal && matchingDO.totalDeal > 0) {
          const autoFilledAmount = matchingDO.totalDeal;
          console.log(`[PettyCash] ✅ Auto-filled amount from DO ${item.doNo}: Rp ${autoFilledAmount.toLocaleString('id-ID')}`);
          
          // Update formData dengan amount yang ter-auto-fill
          setFormData(prev => ({
            ...prev,
            amount: autoFilledAmount,
          }));
          
          // Show notification
          showAlert(`💰 Amount auto-filled dari DO: Rp ${autoFilledAmount.toLocaleString('id-ID')}`, 'Auto-Fill');
        } else {
          console.log(`[PettyCash] ⚠️ Auto-fill failed: DO not found or totalDeal is 0/empty`);
          if (!matchingDO) {
            console.log(`[PettyCash] ❌ DO ${item.doNo} not found in storage`);
          } else {
            console.log(`[PettyCash] ❌ DO found but totalDeal is:`, matchingDO.totalDeal);
          }
        }
      } catch (error) {
        console.error('[PettyCash] ❌ Error auto-filling amount from DO:', error);
      }
    }
  };

  // Helper function untuk save tombstone ke audit log
  const saveTombstoneToAuditLog = async (item: any, refType: string) => {
    try {
      const timestamp = new Date().toISOString();
      const itemId = item.id || item.requestNo || item.memoNo || 'unknown';
      const auditLog = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        refType: refType,
        refId: itemId,
        actorId: 'user',
        action: 'DELETE',
        deleted: true,
        deletedAt: timestamp,
        data: item,
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

  const handleDelete = async (item: PettyCashRequest) => {
    // Tampilkan warning jika request sudah di-approve atau di-close
    const warningMessage = item.status === 'Close' 
      ? `Request "${item.requestNo}" sudah di-close. Apakah Anda yakin ingin menghapus?`
      : item.approvedBy || item.approvedDate
      ? `Request "${item.requestNo}" sudah di-approve. Apakah Anda yakin ingin menghapus?`
      : `Are you sure you want to delete request "${item.requestNo}"?`;
    
    showConfirm(
      warningMessage,
      async () => {
        try {
          // 🚀 FIX: Langsung delete dari server tanpa helper
          // 1. Get current data dari server
          const currentRequests = await storageService.get<PettyCashRequest[]>(StorageKeys.TRUCKING.PETTY_CASH_REQUESTS) || [];
          
          // 2. Filter out item yang mau didelete
          const updatedRequests = currentRequests.filter((r: PettyCashRequest) => r.id !== item.id);
          
          // 3. POST ke server (skipServerSync: false = langsung ke server)
          await storageService.set(StorageKeys.TRUCKING.PETTY_CASH_REQUESTS, updatedRequests, false);
          
          // 4. Update state lokal
          const sortedUpdated = [...updatedRequests].sort((a, b) => {
            const dateA = a.requestDate ? new Date(a.requestDate).getTime() : 0;
            const dateB = b.requestDate ? new Date(b.requestDate).getTime() : 0;
            return dateB - dateA; // Newest first
          });
          setRequests(sortedUpdated.map((r, idx) => ({ ...r, no: idx + 1 })));
          
          showAlert(`✅ Request "${item.requestNo}" berhasil dihapus.`, 'Success');
        } catch (error: any) {
          showAlert(`Error deleting request: ${error.message}`, 'Error');
        }
      },
      undefined,
      'Confirm Delete'
    );
  };

  const filteredRequests = useMemo(() => {
    let filtered = (requests || []).filter(request => {
      if (!request) return false;
      if (statusFilter !== 'ALL' && request.status !== statusFilter) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        (request.requestNo || '').toLowerCase().includes(query) ||
        (request.driverName || '').toLowerCase().includes(query) ||
        (request.driverCode || '').toLowerCase().includes(query) ||
        (request.purpose || '').toLowerCase().includes(query) ||
        (request.description || '').toLowerCase().includes(query) ||
        String(request.amount || 0).includes(query)
      );
    });
    return filtered.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
  }, [requests, searchQuery, statusFilter]);

  // handleToggleRequestSelection dan handleSelectAllRequests sudah tidak digunakan lagi

  const handleCreateRequestFromNotification = (notif: any) => {
    setNotificationDialog({
      show: true,
      notif: notif,
      amount: '',
      purpose: `Uang jalan untuk DO ${notif.doNo} - ${notif.routeName || 'Route'}`,
      description: '', // Tidak perlu copy semua data, cukup reference ke DO via doNo
    });
  };

  const handleSaveFromNotificationDialog = async () => {
    try {
      const notif = notificationDialog.notif;
      if (!notif) return;

      const amount = parseFloat(notificationDialog.amount);
      if (!amount || amount <= 0) {
        showAlert('Amount harus diisi dan lebih dari 0', 'Information');
        return;
      }

      if (!notificationDialog.purpose || notificationDialog.purpose.trim() === '') {
        showAlert('Purpose harus diisi', 'Information');
        return;
      }

      const driver = drivers.find(d => d.id === notif.driverId);
      if (!driver) {
        showAlert('Driver tidak ditemukan', 'Information');
        return;
      }

      const newRequest: PettyCashRequest = {
        id: Date.now().toString(),
        no: requests.length + 1,
        requestNo: generateRequestNo(),
        driverId: driver.id,
        driverName: driver.name,
        driverCode: driver.driverCode,
        amount: amount,
        purpose: notificationDialog.purpose,
        description: notificationDialog.description || '', // Optional, bisa kosong karena data ada di DO
        requestDate: new Date().toISOString().split('T')[0],
        status: 'Open',
        notes: notif.notes || '',
        doNo: notif.doNo, // Reference ke DO untuk menghindari duplicate data
      };

      const updated = [...requests, newRequest];
      await storageService.set(StorageKeys.TRUCKING.PETTY_CASH_REQUESTS, updated);
      
      // Sort by requestDate (newest first)
      const sortedUpdated = updated.sort((a, b) => {
        const dateA = a.requestDate ? new Date(a.requestDate).getTime() : 0;
        const dateB = b.requestDate ? new Date(b.requestDate).getTime() : 0;
        return dateB - dateA; // Newest first
      });
      setRequests(sortedUpdated.map((r, idx) => ({ ...r, no: idx + 1 })));

      // Hapus notification setelah dibuat (hapus semua notifikasi untuk DO ini)
      const allNotifications = await storageService.get<any[]>(StorageKeys.TRUCKING.PETTY_CASH_NOTIFICATIONS) || [];
      const updatedNotifications = allNotifications.filter((n: any) => 
        !(n.type === 'SCHEDULE_CREATED' && n.doNo === notif.doNo)
      );
      await storageService.set(StorageKeys.TRUCKING.PETTY_CASH_NOTIFICATIONS, updatedNotifications);
      console.log(`✅ [PettyCash] Removed notification for DO ${notif.doNo} after creating request`);

      setNotificationDialog({ show: false, notif: null, amount: '', purpose: '', description: '' });
      showAlert(`Petty cash request "${newRequest.requestNo}" berhasil dibuat!`, 'Success');
      
      // Reload semua data untuk memastikan UI update
      await loadAllData();
    } catch (error: any) {
      showAlert(`Error creating request: ${error.message}`, 'Error');
    }
  };

  // Memo functions
  const generateMemoNo = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `MEMO-${year}${month}${day}-${random}`;
  };

  const handleAddMemoItem = () => {
    const newItem: PettyCashMemoItem = {
      id: Date.now().toString(),
      no: (memoFormData.items?.length || 0) + 1,
      customer: '',
      tujuan: '',
      unit: '',
      uraian: '',
      ket: '',
      nominal: 0,
    };
    setMemoFormData({
      ...memoFormData,
      items: [...(memoFormData.items || []), newItem],
    });
  };

  const handleRemoveMemoItem = (itemId: string) => {
    const updatedItems = (memoFormData.items || []).filter(item => item.id !== itemId);
    // Re-number items
    const renumberedItems = updatedItems.map((item, idx) => ({ ...item, no: idx + 1 }));
    setMemoFormData({
      ...memoFormData,
      items: renumberedItems,
    });
  };

  const handleUpdateMemoItem = (itemId: string, field: keyof PettyCashMemoItem, value: any) => {
    const updatedItems = (memoFormData.items || []).map(item =>
      item.id === itemId ? { ...item, [field]: value } : item
    );
    setMemoFormData({
      ...memoFormData,
      items: updatedItems,
    });
  };

  const handleSaveMemo = async () => {
    try {
      if (!memoFormData.items || memoFormData.items.length === 0) {
        showAlert('Minimal harus ada 1 item dalam memo', 'Information');
        return;
      }

      if (!memoFormData.memoDate || !memoFormData.location) {
        showAlert('Tanggal dan Lokasi harus diisi', 'Information');
        return;
      }

      const total = (memoFormData.items || []).reduce((sum, item) => sum + (item.nominal || 0), 0);

      const newMemo: PettyCashMemo = {
        id: Date.now().toString(),
        memoNo: generateMemoNo(),
        memoDate: memoFormData.memoDate || new Date().toISOString().split('T')[0],
        location: memoFormData.location || 'Cikarang',
        items: (memoFormData.items || []).map((item, idx) => ({ ...item, no: idx + 1 })),
        total,
        bankAccountNo: memoFormData.bankAccountNo || '0418 0100 1673 566',
        bankName: memoFormData.bankName || 'BRI',
        recipientName: memoFormData.recipientName || 'Dirgantoro A Trimantoko',
        createdAt: new Date().toISOString(),
      };

      const updated = [...memos, newMemo];
      await storageService.set(StorageKeys.TRUCKING.PETTY_CASH_MEMOS, updated);
      setMemos(updated);
      setShowMemoDialog(false);
      setMemoFormData({
        memoDate: new Date().toISOString().split('T')[0],
        location: 'Cikarang',
        items: [],
        bankAccountNo: '0418 0100 1673 566',
        bankName: 'BRI',
        recipientName: 'Dirgantoro A Trimantoko',
      });
      showAlert('✅ Internal Memo berhasil disimpan', 'Success');
    } catch (error: any) {
      showAlert(`Error saving memo: ${error.message}`, 'Error');
    }
  };

  const generateMemoHtmlContent = async (memo: PettyCashMemo): Promise<string> => {
    const logoBase64 = await loadLogoAsBase64();
    const company = await storageService.get<{ companyName: string; address: string }>('company') || {
      companyName: 'PT. Trimalaksana',
      address: 'Jl. Raya Cikarang, Bekasi',
    };

    return generatePettyCashMemoHtml({
      logo: logoBase64,
      company,
      memoDate: memo.memoDate,
      location: memo.location,
      items: memo.items,
      total: memo.total,
      bankAccountNo: memo.bankAccountNo,
      bankName: memo.bankName,
      recipientName: memo.recipientName,
    });
  };

  const handleViewMemo = async (memo: PettyCashMemo) => {
    try {
      const html = await generateMemoHtmlContent(memo);
      setViewPdfData({ html, memoNo: memo.memoNo });
    } catch (error: any) {
      showAlert(`Error generating memo preview: ${error.message}`, 'Error');
    }
  };

  const handleSaveToPDF = async () => {
    if (!viewPdfData) return;

    try {
      const electronAPI = (window as any).electronAPI;
      const fileName = `${viewPdfData.memoNo}.pdf`;

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
        // Ini lebih reliable daripada hidden iframe
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.open();
          printWindow.document.write(viewPdfData.html);
          printWindow.document.close();
          // Trigger print dialog setelah content loaded
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print();
            }, 250);
          };
          // Fallback jika onload tidak trigger
          setTimeout(() => {
            if (printWindow && !printWindow.closed) {
              printWindow.print();
            }
          }, 500);
          showAlert('Print dialog akan muncul. Pilih "Save as PDF" untuk menyimpan dokumen.', 'Info');
        } else {
          // Jika popup blocked, fallback ke openPrintWindow
          openPrintWindow(viewPdfData.html, { autoPrint: true });
        }
      }
    } catch (error: any) {
      showAlert(`Error saving PDF: ${error.message}`, 'Error');
    }
  };

  const handleDeleteMemo = async (memo: PettyCashMemo) => {
    try {
      console.log('[Trucking PettyCash] handleDeleteMemo called for:', memo?.memoNo, memo?.id);
      
      if (!memo || !memo.memoNo) {
        showAlert('Petty Cash Memo tidak valid. Mohon coba lagi.', 'Error');
        return;
      }
      
      // Validate memo.id exists
      if (!memo.id) {
        console.error('[Trucking PettyCash] Memo missing ID:', memo);
        showAlert(`❌ Error: Memo "${memo.memoNo}" tidak memiliki ID. Tidak bisa dihapus.`, 'Error');
        return;
      }
      
      showConfirm(
        `Hapus Memo "${memo.memoNo}"?\n\n⚠️ Data akan dihapus dari server.\n\nTindakan ini tidak bisa dibatalkan.`,
        async () => {
          try {
            // 🚀 FIX: Langsung delete dari server tanpa helper
            // 1. Get current data dari server
            const currentMemos = await storageService.get<PettyCashMemo[]>(StorageKeys.TRUCKING.PETTY_CASH_MEMOS) || [];
            
            // 2. Filter out item yang mau didelete
            const updatedMemos = currentMemos.filter((m: PettyCashMemo) => m.id !== memo.id);
            
            // 3. POST ke server (skipServerSync: false = langsung ke server)
            await storageService.set(StorageKeys.TRUCKING.PETTY_CASH_MEMOS, updatedMemos, false);
            
            // 4. Update state lokal
            const sortedUpdated = [...updatedMemos].sort((a, b) => {
              const dateA = a.memoDate ? new Date(a.memoDate).getTime() : 0;
              const dateB = b.memoDate ? new Date(b.memoDate).getTime() : 0;
              return dateB - dateA; // Newest first
            });
            setMemos(sortedUpdated.map((m, idx) => ({ ...m, no: idx + 1 })));
            
            showAlert(`✅ Memo "${memo.memoNo}" berhasil dihapus.`, 'Success');
          } catch (error: any) {
            console.error('[Trucking PettyCash] Error deleting memo:', error);
            showAlert(`❌ Error deleting memo: ${error.message}`, 'Error');
          }
        },
        undefined,
        'Safe Delete Confirmation'
      );
    } catch (error: any) {
      console.error('[Trucking PettyCash] Error in handleDeleteMemo:', error);
      showAlert(`Error: ${error.message}`, 'Error');
    }
  };

  // Columns untuk memo table
  const memoColumns = [
    { key: 'memoNo', header: 'Memo No' },
    { key: 'memoDate', header: 'Tanggal' },
    { key: 'location', header: 'Lokasi' },
    {
      key: 'customer',
      header: 'Customer',
      render: (item: PettyCashMemo) => {
        // Ambil customer dari items, gabungkan jika berbeda
        const customers = item.items?.map(i => i.customer).filter(Boolean) || [];
        const uniqueCustomers = [...new Set(customers)];
        return (
          <span style={{ fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px', display: 'inline-block' }}>
            {uniqueCustomers.length > 0 
              ? (uniqueCustomers.length === 1 
                  ? uniqueCustomers[0] 
                  : `${uniqueCustomers[0]}${uniqueCustomers.length > 1 ? ` (+${uniqueCustomers.length - 1})` : ''}`)
              : '-'}
          </span>
        );
      },
    },
    {
      key: 'driver',
      header: 'Driver',
      render: (item: PettyCashMemo) => {
        // Cari driver dari request yang terkait berdasarkan item.id
        const relatedRequests = requests.filter(r => 
          item.items?.some(memoItem => memoItem.id === r.id)
        );
        const drivers = relatedRequests.map(r => r.driverName).filter(Boolean);
        const uniqueDrivers = [...new Set(drivers)];
        return (
          <span style={{ fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px', display: 'inline-block' }}>
            {uniqueDrivers.length > 0 
              ? (uniqueDrivers.length === 1 
                  ? uniqueDrivers[0] 
                  : `${uniqueDrivers[0]}${uniqueDrivers.length > 1 ? ` (+${uniqueDrivers.length - 1})` : ''}`)
              : '-'}
          </span>
        );
      },
    },
    { 
      key: 'total', 
      header: 'Total',
      render: (item: PettyCashMemo) => (
        <span style={{ textAlign: 'right', display: 'block' }}>
          Rp {item.total.toLocaleString('id-ID')}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: PettyCashMemo) => (
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
          <Button
            variant="primary"
            onClick={() => handleViewMemo(item)}
            style={{ fontSize: '11px', padding: '4px 8px' }}
          >
            👁️ View
          </Button>
          <Button
            variant="danger"
            onClick={() => handleDeleteMemo(item)}
            style={{ fontSize: '11px', padding: '4px 8px' }}
          >
            🗑️ Delete
          </Button>
        </div>
      ),
    },
  ];

  // Extract data from request description
  const extractCustomerFromDescription = (description: string): string => {
    const customerMatch = description.match(/Customer:\s*([^\n]+)/i);
    if (customerMatch) {
      return customerMatch[1].trim();
    }
    return '';
  };

  const extractTujuanFromPurpose = (purpose: string, description: string): string => {
    // Extract tujuan dari purpose, contoh: "Uang jalan untuk DO DO-20251215-0126 - Jakarta - Surabaya"
    // Format: "... - [Tujuan]"
    const purposeMatch = purpose.match(/-\s*([^-]+)$/);
    if (purposeMatch) {
      return purposeMatch[1].trim();
    }
    
    // Coba extract dari description jika ada route info
    const routeMatch = description.match(/Route:\s*([^\n]+)/i);
    if (routeMatch) {
      return routeMatch[1].trim();
    }
    
    // Fallback: extract dari purpose jika ada pattern "A - B"
    const dashMatch = purpose.match(/([A-Za-z\s]+)\s*-\s*([A-Za-z\s]+)$/);
    if (dashMatch && dashMatch[2]) {
      return dashMatch[2].trim();
    }
    
    return '';
  };

  const extractVehicleFromDescription = (description: string, driverCode: string): string => {
    const vehicleMatch = description.match(/Vehicle:\s*([^\n]+)/i);
    if (vehicleMatch) {
      return vehicleMatch[1].trim();
    }
    // Fallback ke driver code
    return driverCode || '';
  };

  // Generate memo from request(s) - bisa dari 1 request atau multiple requestIds
  const handleGenerateMemoFromRequests = async (requestIds?: string[]) => {
    let selectedItems: PettyCashRequest[];
    
    if (requestIds && requestIds.length > 0) {
      // Jika ada requestIds yang dikirim, gunakan itu
      selectedItems = requests.filter(r => requestIds.includes(r.id));
    } else {
      // Fallback: ambil semua request yang Open (untuk backward compatibility)
      selectedItems = requests.filter(r => r.status === 'Open');
    }
    
    if (selectedItems.length === 0) {
      showAlert('Tidak ada request yang bisa di-generate memo', 'Information');
      return;
    }
    
    // Load DO data untuk reference jika ada doNo
    const doData = await storageService.get<any[]>(StorageKeys.TRUCKING.DELIVERY_ORDERS) || [];
    const activeDOs = filterActiveItems(doData);
    
    // Convert requests to memo items
    const memoItems: PettyCashMemoItem[] = selectedItems.map((req, idx) => {
      let customer = '';
      let tujuan = '';
      let vehicle = '';
      
      // Jika ada doNo, ambil data langsung dari DO (direct mapping, no extraction)
      if (req.doNo) {
        const doItem = activeDOs.find((d: any) => d.doNo === req.doNo);
        if (doItem) {
          customer = doItem.customerName || '';
          tujuan = doItem.routeName || '';
          vehicle = doItem.vehicleNo || '';
        } else {
          // DO tidak ditemukan - gunakan fallback dari request
          customer = req.driverName || '';
          tujuan = '';
          vehicle = req.driverCode || '';
        }
      } else {
        // Jika tidak ada doNo - gunakan fallback dari request
        customer = req.driverName || '';
        tujuan = '';
        vehicle = req.driverCode || '';
      }
      
      // Extract ket from purpose or default to TLJP
      let ket = 'TLJP';
      if (req.purpose?.toLowerCase().includes('lintas') || req.description?.toLowerCase().includes('lintas')) {
        ket = 'Lintas';
      }

      // Uraian bisa dari requestNo atau DO No jika ada
      let uraian = req.requestNo || '';
      if (req.doNo) {
        uraian = req.doNo; // Gunakan DO No sebagai uraian
      } else if (req.description) {
        // Ambil bagian pertama dari description (sebelum newline atau sebelum "Customer:")
        const firstLine = req.description.split('\n')[0].split('Customer:')[0].trim();
        if (firstLine && firstLine.length < 50) {
          uraian = firstLine;
        }
      }

      return {
        id: req.id,
        no: idx + 1,
        customer: customer,
        tujuan: tujuan,
        unit: vehicle || req.driverCode || 'CDD',
        uraian: uraian,
        ket: ket,
        nominal: req.amount || 0,
      };
    });

    const total = memoItems.reduce((sum, item) => sum + (item.nominal || 0), 0);

    // Auto-save memo
    try {
      const newMemo: PettyCashMemo = {
        id: Date.now().toString(),
        memoNo: generateMemoNo(),
        memoDate: new Date().toISOString().split('T')[0],
        location: 'Cikarang',
        items: memoItems,
        total,
        bankAccountNo: '0418 0100 1673 566',
        bankName: 'BRI',
        recipientName: 'Dirgantoro A Trimantoko',
        createdAt: new Date().toISOString(),
      };

      const updated = [...memos, newMemo];
      await storageService.set(StorageKeys.TRUCKING.PETTY_CASH_MEMOS, updated);
      setMemos(updated);
      showAlert(`✅ Internal Memo berhasil dibuat dari ${selectedItems.length} request`, 'Success');
      
      // Auto view memo
      setTimeout(() => {
        handleViewMemo(newMemo);
      }, 500);
    } catch (error: any) {
      showAlert(`Error generating memo: ${error.message}`, 'Error');
    }
  };

  return (
    <div className="module-compact">
      <div className="page-header">
        <h1>Petty Cash Requests (Uang Jalan)</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {notifications.length > 0 && (
            <NotificationBell
              notifications={pettyCashNotifications}
              onNotificationClick={(notification) => {
                if (notification.notif) {
                  handleCreateRequestFromNotification(notification.notif);
                }
              }}
              icon="💰"
              emptyMessage="Tidak ada schedule notifications"
            />
          )}
          <Button onClick={handleBulkApproveAndDistribute} variant="primary" style={{ padding: '8px 12px', backgroundColor: '#10b981', borderColor: '#10b981' }}>
            ⚡ Approve & Distribute All
          </Button>
          <Button onClick={loadAllData} variant="secondary" style={{ padding: '8px 12px' }}>
            🔄 Refresh
          </Button>
          <Button onClick={() => setShowMemoDialog(true)} variant="primary">
            📄 Buat Internal Memo
          </Button>
          <Button onClick={() => {
            setEditingItem(null);
            setFormData({
              driverId: '',
              amount: 0,
              purpose: '',
              description: '',
              requestDate: new Date().toISOString().split('T')[0],
              notes: '',
            });
            setShowFormDialog(true);
          }}>
            + Request Petty Cash
          </Button>
        </div>
      </div>

      {/* Notifications - HIDDEN, menggunakan NotificationBell di header */}

      {/* Memo Dialog */}
      {showMemoDialog && (
        <div className="dialog-overlay" onClick={() => setShowMemoDialog(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <Card className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>📄 Buat Internal Memo - Permohonan Dana</h2>
                <Button variant="secondary" onClick={() => setShowMemoDialog(false)} style={{ padding: '6px 12px' }}>✕</Button>
              </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <Input
              label="Tanggal Memo *"
              type="date"
              value={memoFormData.memoDate || ''}
              onChange={(v) => setMemoFormData({ ...memoFormData, memoDate: v })}
            />
            <Input
              label="Lokasi *"
              value={memoFormData.location || ''}
              onChange={(v) => setMemoFormData({ ...memoFormData, location: v })}
              placeholder="Contoh: Cikarang"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ color: 'var(--text-primary)', fontWeight: '500' }}>Items *</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button 
                  onClick={() => setShowSelectRequestDialog(true)} 
                  variant="primary" 
                  style={{ fontSize: '12px', padding: '4px 8px' }}
                >
                  📋 Select from Requests
                </Button>
                <Button onClick={handleAddMemoItem} variant="secondary" style={{ fontSize: '12px', padding: '4px 8px' }}>
                  + Tambah Item
                </Button>
              </div>
            </div>
            {memoFormData.items && memoFormData.items.length > 0 ? (
              <div style={{ border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                      <th style={{ padding: '8px', border: '1px solid var(--border)', textAlign: 'left' }}>No</th>
                      <th style={{ padding: '8px', border: '1px solid var(--border)', textAlign: 'left' }}>Customer</th>
                      <th style={{ padding: '8px', border: '1px solid var(--border)', textAlign: 'left' }}>Tujuan</th>
                      <th style={{ padding: '8px', border: '1px solid var(--border)', textAlign: 'left' }}>Unit</th>
                      <th style={{ padding: '8px', border: '1px solid var(--border)', textAlign: 'left' }}>Uraian</th>
                      <th style={{ padding: '8px', border: '1px solid var(--border)', textAlign: 'left' }}>Ket</th>
                      <th style={{ padding: '8px', border: '1px solid var(--border)', textAlign: 'left' }}>Nominal</th>
                      <th style={{ padding: '8px', border: '1px solid var(--border)', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memoFormData.items.map((item) => (
                      <tr key={item.id}>
                        <td style={{ padding: '4px', border: '1px solid var(--border)' }}>{item.no}</td>
                        <td style={{ padding: '4px', border: '1px solid var(--border)' }}>
                          <input
                            type="text"
                            value={item.customer}
                            onChange={(e) => handleUpdateMemoItem(item.id, 'customer', e.target.value)}
                            style={{ width: '100%', padding: '4px', border: 'none', background: 'transparent', color: 'var(--text-primary)' }}
                            placeholder="Customer"
                          />
                        </td>
                        <td style={{ padding: '4px', border: '1px solid var(--border)' }}>
                          <input
                            type="text"
                            value={item.tujuan}
                            onChange={(e) => handleUpdateMemoItem(item.id, 'tujuan', e.target.value)}
                            style={{ width: '100%', padding: '4px', border: 'none', background: 'transparent', color: 'var(--text-primary)' }}
                            placeholder="Tujuan"
                          />
                        </td>
                        <td style={{ padding: '4px', border: '1px solid var(--border)' }}>
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => handleUpdateMemoItem(item.id, 'unit', e.target.value)}
                            style={{ width: '100%', padding: '4px', border: 'none', background: 'transparent', color: 'var(--text-primary)' }}
                            placeholder="Unit"
                          />
                        </td>
                        <td style={{ padding: '4px', border: '1px solid var(--border)' }}>
                          <input
                            type="text"
                            value={item.uraian}
                            onChange={(e) => handleUpdateMemoItem(item.id, 'uraian', e.target.value)}
                            style={{ width: '100%', padding: '4px', border: 'none', background: 'transparent', color: 'var(--text-primary)' }}
                            placeholder="Uraian"
                          />
                        </td>
                        <td style={{ padding: '4px', border: '1px solid var(--border)' }}>
                          <input
                            type="text"
                            value={item.ket}
                            onChange={(e) => handleUpdateMemoItem(item.id, 'ket', e.target.value)}
                            style={{ width: '100%', padding: '4px', border: 'none', background: 'transparent', color: 'var(--text-primary)' }}
                            placeholder="Ket"
                          />
                        </td>
                        <td style={{ padding: '4px', border: '1px solid var(--border)' }}>
                          <input
                            type="number"
                            value={item.nominal}
                            onChange={(e) => handleUpdateMemoItem(item.id, 'nominal', Number(e.target.value))}
                            style={{ width: '100%', padding: '4px', border: 'none', background: 'transparent', color: 'var(--text-primary)' }}
                            placeholder="0"
                          />
                        </td>
                        <td style={{ padding: '4px', border: '1px solid var(--border)', textAlign: 'center' }}>
                          <Button
                            variant="danger"
                            onClick={() => handleRemoveMemoItem(item.id)}
                            style={{ fontSize: '11px', padding: '2px 6px' }}
                          >
                            Hapus
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: '8px', backgroundColor: 'var(--bg-tertiary)', textAlign: 'right', fontWeight: 'bold' }}>
                  Total: Rp {(memoFormData.items || []).reduce((sum, item) => sum + (item.nominal || 0), 0).toLocaleString('id-ID')}
                </div>
              </div>
            ) : (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Belum ada item. Klik "Tambah Item" untuk menambahkan.
              </div>
            )}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Bank Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Input
                label="No. Rekening"
                value={memoFormData.bankAccountNo || ''}
                onChange={(v) => setMemoFormData({ ...memoFormData, bankAccountNo: v })}
              />
              <Input
                label="Bank"
                value={memoFormData.bankName || ''}
                onChange={(v) => setMemoFormData({ ...memoFormData, bankName: v })}
              />
            </div>
            <Input
              label="Recipient Name"
              value={memoFormData.recipientName || ''}
              onChange={(v) => setMemoFormData({ ...memoFormData, recipientName: v })}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
            <Button
              onClick={() => {
                setShowMemoDialog(false);
                setMemoFormData({
                  memoDate: new Date().toISOString().split('T')[0],
                  location: 'Cikarang',
                  items: [],
                  bankAccountNo: '0418 0100 1673 566',
                  bankName: 'BRI',
                  recipientName: 'Dirgantoro A Trimantoko',
                });
              }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button onClick={handleSaveMemo} variant="primary">
              Simpan Memo
            </Button>
          </div>
            </Card>
          </div>
        </div>
      )}

      {/* Select Request Dialog untuk Memo */}
      {showSelectRequestDialog && (
        <div className="dialog-overlay" onClick={() => setShowSelectRequestDialog(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <Card className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>📋 Pilih Request untuk Memo</h2>
                <Button variant="secondary" onClick={() => setShowSelectRequestDialog(false)} style={{ padding: '6px 12px' }}>✕</Button>
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                    Pilih Request ({selectedRequestsForMemo.length} selected)
                  </label>
                  <Button 
                    variant="secondary" 
                    onClick={() => {
                      const availableRequests = requests.filter(r => r.status === 'Open' || r.status === 'Close');
                      if (selectedRequestsForMemo.length === availableRequests.length) {
                        setSelectedRequestsForMemo([]);
                      } else {
                        setSelectedRequestsForMemo(availableRequests.map(r => r.id));
                      }
                    }}
                    style={{ fontSize: '12px', padding: '4px 8px' }}
                  >
                    {selectedRequestsForMemo.length === (requests.filter(r => r.status === 'Open' || r.status === 'Close')).length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                
                <div style={{ 
                  border: '1px solid var(--border)', 
                  borderRadius: '4px', 
                  maxHeight: '400px', 
                  overflowY: 'auto',
                  backgroundColor: 'var(--bg-primary)'
                }}>
                  {(requests.filter(r => r.status === 'Open' || r.status === 'Close')).length > 0 ? (
                    (requests.filter(r => r.status === 'Open' || r.status === 'Close')).map((req) => {
                      const isSelected = selectedRequestsForMemo.includes(req.id);
                      return (
                        <div
                          key={req.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedRequestsForMemo(selectedRequestsForMemo.filter(id => id !== req.id));
                            } else {
                              setSelectedRequestsForMemo([...selectedRequestsForMemo, req.id]);
                            }
                          }}
                          style={{
                            padding: '12px',
                            borderBottom: '1px solid var(--border)',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            onClick={(e) => e.stopPropagation()}
                            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>
                              {req.requestNo}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                              Driver: {req.driverName} ({req.driverCode})
                            </div>
                            {req.doNo && (
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                                DO: {req.doNo}
                              </div>
                            )}
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              Amount: Rp {(req.amount || 0).toLocaleString('id-ID')} | Purpose: {req.purpose || '-'}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Tidak ada request yang tersedia
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
                <Button
                  onClick={() => {
                    setShowSelectRequestDialog(false);
                    setSelectedRequestsForMemo([]);
                  }}
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (selectedRequestsForMemo.length === 0) {
                      showAlert('Pilih minimal 1 request', 'Information');
                      return;
                    }
                    
                    // Load DO data untuk reference
                    const doData = await storageService.get<any[]>(StorageKeys.TRUCKING.DELIVERY_ORDERS) || [];
                    const activeDOs = filterActiveItems(doData);
                    
                    // Convert selected requests to memo items
                    const selectedRequests = requests.filter(r => selectedRequestsForMemo.includes(r.id));
                    const memoItems: PettyCashMemoItem[] = selectedRequests.map((req, idx) => {
                      let customer = '';
                      let tujuan = '';
                      let vehicle = '';
                      
                      // Jika ada doNo, ambil data langsung dari DO (direct mapping, no extraction)
                      if (req.doNo) {
                        const doItem = activeDOs.find((d: any) => d.doNo === req.doNo);
                        if (doItem) {
                          customer = doItem.customerName || '';
                          tujuan = doItem.routeName || '';
                          vehicle = doItem.vehicleNo || '';
                        } else {
                          // DO tidak ditemukan - gunakan fallback dari request
                          customer = req.driverName || '';
                          tujuan = '';
                          vehicle = req.driverCode || '';
                        }
                      } else {
                        // Jika tidak ada doNo - gunakan fallback dari request
                        customer = req.driverName || '';
                        tujuan = '';
                        vehicle = req.driverCode || '';
                      }
                      
                      let ket = 'TLJP';
                      if (req.purpose?.toLowerCase().includes('lintas') || req.description?.toLowerCase().includes('lintas')) {
                        ket = 'Lintas';
                      }

                      let uraian = req.requestNo || '';
                      if (req.doNo) {
                        uraian = req.doNo;
                      } else if (req.description) {
                        const firstLine = req.description.split('\n')[0].split('Customer:')[0].trim();
                        if (firstLine && firstLine.length < 50) {
                          uraian = firstLine;
                        }
                      }

                      return {
                        id: req.id,
                        no: (memoFormData.items?.length || 0) + idx + 1,
                        customer: customer,
                        tujuan: tujuan,
                        unit: vehicle || req.driverCode || 'CDD',
                        uraian: uraian,
                        ket: ket,
                        nominal: req.amount || 0,
                      };
                    });
                    
                    // Add items to memoFormData
                    setMemoFormData({
                      ...memoFormData,
                      items: [...(memoFormData.items || []), ...memoItems],
                    });
                    
                    setShowSelectRequestDialog(false);
                    setSelectedRequestsForMemo([]);
                    showAlert(`✅ ${selectedRequestsForMemo.length} request(s) ditambahkan ke memo`, 'Success');
                  }}
                  variant="primary"
                >
                  Add to Memo ({selectedRequestsForMemo.length})
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Request Form Dialog */}
      {showFormDialog && (
        <div className="dialog-overlay" onClick={() => {
          setShowFormDialog(false);
          setEditingItem(null);
          setFormData({
            driverId: '',
            amount: 0,
            purpose: '',
            description: '',
            requestDate: new Date().toISOString().split('T')[0],
            notes: '',
          });
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
            <Card className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>{editingItem ? '✏️ Edit Petty Cash Request' : '💰 Request Petty Cash (Uang Jalan)'}</h2>
                <Button variant="secondary" onClick={() => {
                  setShowFormDialog(false);
                  setEditingItem(null);
                  setFormData({
                    driverId: '',
                    amount: 0,
                    purpose: '',
                    description: '',
                    requestDate: new Date().toISOString().split('T')[0],
                    notes: '',
                  });
                }} style={{ padding: '6px 12px' }}>✕</Button>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Driver *
                </label>
                <select
                  value={formData.driverId || ''}
                  onChange={(e) => {
                    handleLoadFromDriver(e.target.value);
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
                      {d.driverCode} - {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Input
                  label="Amount (Rp) *"
                  type="number"
                  value={String(formData.amount || 0)}
                  onChange={(v) => setFormData({ ...formData, amount: Number(v) })}
                />
                <Input
                  label="Request Date"
                  type="date"
                  value={formData.requestDate || ''}
                  onChange={(v) => setFormData({ ...formData, requestDate: v })}
                />
              </div>
              <Input
                label="Purpose *"
                value={formData.purpose || ''}
                onChange={(v) => setFormData({ ...formData, purpose: v })}
                placeholder="Contoh: Uang jalan Jakarta-Bandung"
              />
              <Input
                label="Description"
                value={formData.description || ''}
                onChange={(v) => setFormData({ ...formData, description: v })}
                placeholder="Keterangan tambahan (opsional)"
              />
              <Input
                label="Notes"
                value={formData.notes || ''}
                onChange={(v) => setFormData({ ...formData, notes: v })}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
                <Button onClick={() => {
                  setShowFormDialog(false);
                  setEditingItem(null);
                  setFormData({
                    driverId: '',
                    amount: 0,
                    purpose: '',
                    description: '',
                    requestDate: new Date().toISOString().split('T')[0],
                    notes: '',
                  });
                }} variant="secondary">
                  Cancel
                </Button>
                <Button onClick={handleSave} variant="primary">
                  {editingItem ? 'Update Request' : 'Submit Request'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Card>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid var(--border-color)' }}>
          <button
            onClick={() => setActiveTab('requests')}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'requests' ? '3px solid var(--accent-color)' : '3px solid transparent',
              color: activeTab === 'requests' ? 'var(--accent-color)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'requests' ? '600' : '400',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            💰 Requests ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab('memo')}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'memo' ? '3px solid var(--accent-color)' : '3px solid transparent',
              color: activeTab === 'memo' ? 'var(--accent-color)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'memo' ? '600' : '400',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            📄 Internal Memo ({memos.length})
          </button>
        </div>

        {/* Tab Content - Requests */}
        {activeTab === 'requests' && (
          <>
            <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Request No, Driver, Purpose, Amount..."
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '8px 12px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontFamily: 'inherit',
            }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontFamily: 'inherit',
            }}
          >
            <option value="ALL">All Status</option>
            <option value="Open">Open</option>
            <option value="Close">Close</option>
          </select>
          {selectedRequestIds.length > 0 && (
            <Button 
              variant="primary" 
              onClick={() => {
                handleGenerateMemoFromRequests(selectedRequestIds);
                setSelectedRequestIds([]);
              }}
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              📄 Generate Memo ({selectedRequestIds.length})
            </Button>
          )}
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
        {viewMode === 'card' && (
          filteredRequests.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
            {filteredRequests.map((item) => (
              <Card key={item.id} style={{ padding: '16px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={selectedRequestIds.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRequestIds([...selectedRequestIds, item.id]);
                        } else {
                          setSelectedRequestIds(selectedRequestIds.filter(id => id !== item.id));
                        }
                      }}
                      style={{ marginTop: '4px', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>{item.requestNo}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.driverName} ({item.driverCode})</div>
                      {item.doNo && (
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          DO: {item.doNo}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`status-badge status-${item.status?.toLowerCase().replace('_', '-')}`}>
                    {item.status}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>💰 Amount: <strong>Rp {(item.amount || 0).toLocaleString('id-ID')}</strong></div>
                  <div>📅 Request Date: {item.requestDate || '-'}</div>
                  {item.approvedDate && <div>✓ Approved/Paid: {item.approvedDate}</div>}
                  {item.paidDate && <div>💵 Paid Date: {item.paidDate}</div>}
                  {item.distributedDate && <div>📤 Distributed: {item.distributedDate}</div>}
                  {item.purpose && <div style={{ marginTop: '4px', padding: '6px', background: 'var(--bg-secondary)', borderRadius: '4px' }}>
                    <div style={{ fontWeight: 600, marginBottom: '2px' }}>Purpose:</div>
                    <div>{item.purpose}</div>
                  </div>}
                </div>
                {item.rejectedReason && (
                  <div style={{ fontSize: '11px', color: '#EF4444', padding: '6px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px', marginBottom: '12px' }}>
                    <strong>Rejected:</strong> {item.rejectedReason}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(() => {
                    // Cek apakah request sudah punya memo
                    const relatedMemo = memos.find(memo => 
                      memo.items && memo.items.some(memoItem => memoItem.id === item.id)
                    );
                    
                    // Handle missing status - default to 'Open'
                    const itemStatus = item.status || 'Open';
                    
                    if (itemStatus === 'Open') {
                      // Sembunyikan approve/reject jika sudah di-approve atau di-reject
                      const isApproved = !!(item.approvedBy || item.approvedDate);
                      const isRejected = !!item.rejectedReason;
                      const showApprove = !isApproved && !isRejected;
                      const showReject = !isApproved && !isRejected;
                      
                      return (
                        <ActionMenu
                          onApprove={() => handleApprove(item)}
                          onReject={() => handleReject(item)}
                          onEdit={() => handleEdit(item)}
                          onDelete={() => handleDelete(item)}
                          onDistribute={() => handleDistributePettyCash(item)}
                          onViewReceipt={item.receiptProof ? () => handleViewReceipt(item) : undefined}
                          onViewTransferProof={item.transferProof ? () => handleViewTransferProof(item) : undefined}
                          onGenerateMemo={async () => {
                            handleGenerateMemoFromRequests([item.id]);
                          }}
                          hasMemo={!!relatedMemo}
                          onViewMemo={relatedMemo ? () => handleViewMemo(relatedMemo) : undefined}
                          showApprove={showApprove}
                          showReject={showReject}
                        />
                      );
                    }
                    if (itemStatus === 'Close') {
                      // Untuk status Close, tampilkan ActionMenu dengan opsi terbatas
                      return (
                        <ActionMenu
                          onApprove={() => {}}
                          onReject={() => {}}
                          onEdit={() => {}}
                          onDelete={() => handleDelete(item)}
                          onViewReceipt={item.receiptProof ? () => handleViewReceipt(item) : undefined}
                          onViewTransferProof={item.transferProof ? () => handleViewTransferProof(item) : undefined}
                          onGenerateMemo={async () => {
                            handleGenerateMemoFromRequests([item.id]);
                          }}
                          hasMemo={!!relatedMemo}
                          onViewMemo={relatedMemo ? () => handleViewMemo(relatedMemo) : undefined}
                          showApprove={false}
                          showReject={false}
                        />
                      );
                    }
                    // Fallback: tampilkan ActionMenu untuk status undefined atau lainnya (default to Open behavior)
                    const isApproved = !!(item.approvedBy || item.approvedDate);
                    const isRejected = !!item.rejectedReason;
                    const showApprove = !isApproved && !isRejected;
                    const showReject = !isApproved && !isRejected;
                    
                    return (
                      <ActionMenu
                        onApprove={() => handleApprove(item)}
                        onReject={() => handleReject(item)}
                        onEdit={() => handleEdit(item)}
                        onDelete={() => handleDelete(item)}
                        onDistribute={() => handleDistributePettyCash(item)}
                        onViewReceipt={item.receiptProof ? () => handleViewReceipt(item) : undefined}
                        onViewTransferProof={item.transferProof ? () => handleViewTransferProof(item) : undefined}
                        onGenerateMemo={async () => {
                          handleGenerateMemoFromRequests([item.id]);
                        }}
                        hasMemo={!!relatedMemo}
                        onViewMemo={relatedMemo ? () => handleViewMemo(relatedMemo) : undefined}
                        showApprove={showApprove}
                        showReject={showReject}
                      />
                    );
                  })()}
                </div>
              </Card>
            ))}
            </div>
          ) : (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
              {searchQuery || statusFilter !== 'ALL' ? "No requests found matching your search" : "No petty cash requests"}
            </div>
          )
        )}
        {viewMode === 'table' && (
          <Table 
            columns={[
              {
                key: 'select',
                header: (
                  <input
                    type="checkbox"
                    checked={filteredRequests.length > 0 && filteredRequests.every(req => selectedRequestIds.includes(req.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRequestIds(filteredRequests.map(req => req.id));
                      } else {
                        setSelectedRequestIds([]);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                ),
                render: (item: PettyCashRequest) => (
                  <input
                    type="checkbox"
                    checked={selectedRequestIds.includes(item.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRequestIds([...selectedRequestIds, item.id]);
                      } else {
                        setSelectedRequestIds(selectedRequestIds.filter(id => id !== item.id));
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                ),
              },
              { key: 'no', header: 'No' },
              { key: 'requestNo', header: 'Request No' },
              { key: 'requestDate', header: 'Request Date' },
              { key: 'driverName', header: 'Driver' },
              { key: 'driverCode', header: 'Driver Code' },
              {
                key: 'doNo',
                header: 'DO No',
                render: (item: PettyCashRequest) => item.doNo || '-',
              },
              {
                key: 'amount',
                header: 'Amount',
                render: (item: PettyCashRequest) => `Rp ${(item.amount || 0).toLocaleString('id-ID')}`,
              },
              { key: 'purpose', header: 'Purpose' },
              { key: 'description', header: 'Description' },
              {
                key: 'status',
                header: 'Status',
                render: (item: PettyCashRequest) => (
                  <span className={`status-badge status-${item.status?.toLowerCase()}`}>
                    {item.status}
                  </span>
                ),
              },
              { key: 'approvedDate', header: 'Approved/Paid Date' },
              {
                key: 'actions',
                header: 'Actions',
                render: (item: PettyCashRequest) => {
                  // Cek apakah request sudah punya memo
                  const relatedMemo = memos.find(memo => 
                    memo.items && memo.items.some(memoItem => memoItem.id === item.id)
                  );
                  
                  // Handle missing status - default to 'Open'
                  const itemStatus = item.status || 'Open';
                  
                  if (itemStatus === 'Open') {
                    // Sembunyikan approve/reject jika sudah di-approve atau di-reject
                    const isApproved = !!(item.approvedBy || item.approvedDate);
                    const isRejected = !!item.rejectedReason;
                    const showApprove = !isApproved && !isRejected;
                    const showReject = !isApproved && !isRejected;
                    
                    return (
                      <ActionMenu
                        onApprove={() => handleApprove(item)}
                        onReject={() => handleReject(item)}
                        onEdit={() => handleEdit(item)}
                        onDelete={() => handleDelete(item)}
                        onDistribute={() => handleDistributePettyCash(item)}
                        onViewReceipt={item.receiptProof ? () => handleViewReceipt(item) : undefined}
                        onViewTransferProof={item.transferProof ? () => handleViewTransferProof(item) : undefined}
                        onGenerateMemo={async () => {
                          handleGenerateMemoFromRequests([item.id]);
                        }}
                        hasMemo={!!relatedMemo}
                        onViewMemo={relatedMemo ? () => handleViewMemo(relatedMemo) : undefined}
                        showApprove={showApprove}
                        showReject={showReject}
                      />
                    );
                  }
                  if (itemStatus === 'Close') {
                    // Untuk status Close, tampilkan ActionMenu dengan opsi terbatas
                    return (
                      <ActionMenu
                        onApprove={() => {}}
                        onReject={() => {}}
                        onEdit={() => {}}
                        onDelete={() => handleDelete(item)}
                        onViewReceipt={item.receiptProof ? () => handleViewReceipt(item) : undefined}
                        onViewTransferProof={item.transferProof ? () => handleViewTransferProof(item) : undefined}
                        onGenerateMemo={async () => {
                          handleGenerateMemoFromRequests([item.id]);
                        }}
                        hasMemo={!!relatedMemo}
                        onViewMemo={relatedMemo ? () => handleViewMemo(relatedMemo) : undefined}
                        showApprove={false}
                        showReject={false}
                      />
                    );
                  }
                  // Fallback: tampilkan ActionMenu untuk status undefined atau lainnya (default to Open behavior)
                  const isApproved = !!(item.approvedBy || item.approvedDate);
                  const isRejected = !!item.rejectedReason;
                  const showApprove = !isApproved && !isRejected;
                  const showReject = !isApproved && !isRejected;
                  
                  return (
                    <ActionMenu
                      onApprove={() => handleApprove(item)}
                      onReject={() => handleReject(item)}
                      onEdit={() => handleEdit(item)}
                      onDelete={() => handleDelete(item)}
                      onDistribute={() => handleDistributePettyCash(item)}
                      onViewReceipt={item.receiptProof ? () => handleViewReceipt(item) : undefined}
                      onViewTransferProof={item.transferProof ? () => handleViewTransferProof(item) : undefined}
                      onGenerateMemo={async () => {
                        handleGenerateMemoFromRequests([item.id]);
                      }}
                      hasMemo={!!relatedMemo}
                      onViewMemo={relatedMemo ? () => handleViewMemo(relatedMemo) : undefined}
                      showApprove={showApprove}
                      showReject={showReject}
                    />
                  );
                },
              },
            ]} 
            data={filteredRequests} 
            emptyMessage={searchQuery || statusFilter !== 'ALL' ? "No requests found matching your search" : "No petty cash requests"} 
          />
          )}
          </>
        )}

        {/* Tab Content - Memo */}
        {activeTab === 'memo' && (
          <Table 
            columns={memoColumns} 
            data={memos} 
            emptyMessage="No internal memos found"
          />
        )}
      </Card>
      {/* PDF Preview Dialog */}
      {viewPdfData && (
        <div className="dialog-overlay" onClick={() => setViewPdfData(null)} style={{ zIndex: 10000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90%', width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
            <Card className="dialog-card" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2>Internal Memo Preview - {viewPdfData.memoNo}</h2>
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
                  title="Memo Preview"
                />
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Custom Dialog - menggunakan hook terpusat */}
      <DialogComponent />

      {/* Notification Dialog untuk Create Request */}
      {notificationDialog.show && notificationDialog.notif && (
        <div className="dialog-overlay" onClick={() => setNotificationDialog({ ...notificationDialog, show: false })}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
            <Card className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>💰 Petty Cash Request</h2>
                <Button variant="secondary" onClick={() => setNotificationDialog({ ...notificationDialog, show: false })} style={{ padding: '6px 12px' }}>✕</Button>
              </div>
              
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
                <div style={{ marginBottom: '8px' }}><strong>🚚 DO:</strong> {notificationDialog.notif.doNo}</div>
                <div style={{ marginBottom: '8px' }}><strong>Driver:</strong> {notificationDialog.notif.driverName}</div>
                <div style={{ marginBottom: '8px' }}><strong>Route:</strong> {notificationDialog.notif.routeName || '-'}</div>
                <div style={{ marginBottom: '8px' }}><strong>Vehicle:</strong> {notificationDialog.notif.vehicleNo || '-'}</div>
                <div><strong>Scheduled:</strong> {notificationDialog.notif.scheduledDate} {notificationDialog.notif.scheduledTime || ''}</div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Amount (Rp) <span style={{ color: 'red' }}>*</span>
                </label>
                <Input
                  type="number"
                  value={notificationDialog.amount}
                  onChange={(v) => setNotificationDialog({ ...notificationDialog, amount: v })}
                  placeholder="Masukkan jumlah uang jalan"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Purpose <span style={{ color: 'red' }}>*</span>
                </label>
                <Input
                  type="textarea"
                  value={notificationDialog.purpose}
                  onChange={(v) => setNotificationDialog({ ...notificationDialog, purpose: v })}
                  placeholder="Tujuan penggunaan uang jalan"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Description (Optional)
                </label>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Data lengkap (Customer, Address, Items, Vehicle, Route) sudah tersedia di DO. Description hanya untuk catatan tambahan jika diperlukan.
                </div>
                <Input
                  type="textarea"
                  value={notificationDialog.description}
                  onChange={(v) => setNotificationDialog({ ...notificationDialog, description: v })}
                  placeholder="Keterangan tambahan (optional)"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={() => setNotificationDialog({ ...notificationDialog, show: false })}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSaveFromNotificationDialog}>
                  💰 Request
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Transfer Proof View Dialog */}
      {viewTransferProof && viewTransferProof.show && (
        <div className="dialog-overlay" onClick={() => setViewTransferProof(null)} style={{ zIndex: 10000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90%', width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
            <Card className="dialog-card" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2>📎 Bukti Distribusi - {viewTransferProof.proofName}</h2>
                <Button variant="secondary" onClick={() => setViewTransferProof(null)} style={{ padding: '6px 12px' }}>✕</Button>
              </div>
              <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border)', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                {viewTransferProof.proof.startsWith('data:image/') ? (
                  <img 
                    src={viewTransferProof.proof} 
                    alt="Transfer Proof" 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '80vh', 
                      height: 'auto',
                      objectFit: 'contain'
                    }} 
                  />
                ) : viewTransferProof.proof.startsWith('data:application/pdf') ? (
                  <iframe
                    src={viewTransferProof.proof}
                    style={{
                      width: '100%',
                      height: '80vh',
                      border: 'none',
                      minHeight: '600px'
                    }}
                    title="Transfer Proof"
                  />
                ) : (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Format file tidak didukung. Silakan download file untuk melihat.
                  </div>
                )}
              </div>
              <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <Button 
                  variant="primary" 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = viewTransferProof.proof;
                    link.download = viewTransferProof.proofName;
                    link.click();
                  }} 
                  style={{ padding: '6px 12px' }}
                >
                  💾 Download
                </Button>
                <Button variant="secondary" onClick={() => setViewTransferProof(null)} style={{ padding: '6px 12px' }}>Close</Button>
              </div>
            </Card>
          </div>
        </div>
      )}

    </div>
  );
};

export default PettyCash;

