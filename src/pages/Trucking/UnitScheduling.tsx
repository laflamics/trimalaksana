import { useState, useEffect, useMemo, useRef } from 'react';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Input from '../../components/Input';
import NotificationBell from '../../components/NotificationBell';
import { storageService } from '../../services/storage';
import { safeDeleteItem, filterActiveItems } from '../../utils/data-persistence-helper';
import '../../styles/common.css';
import '../../styles/compact.css';

interface UnitSchedule {
  id: string;
  doNo: string;
  customerName: string;
  customerAddress: string;
  vehicleId: string;
  vehicleNo: string;
  driverId: string;
  driverName: string;
  routeId: string;
  routeName: string;
  scheduledDate: string;
  scheduledTime: string;
  estimatedArrivalDate?: string;
  estimatedArrivalTime?: string;
  estimatedArrival?: string; // Keep for backward compatibility
  status: 'Open' | 'Close';
  notes?: string;
  created: string;
}

// Action Menu Component untuk compact actions
const ActionMenu = ({ onEdit, onClose, onReopen, onDelete, status, onCreateSchedule }: {
  onEdit: () => void;
  onClose?: () => void;
  onReopen?: () => void;
  onDelete?: () => void;
  onCreateSchedule?: () => void;
  status: 'Open' | 'Close';
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
        const estimatedMenuHeight = 200; // Estimate menu height
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
          {onCreateSchedule && (
            <button
              onClick={() => { onCreateSchedule(); setShowMenu(false); }}
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
              ➕ Create Schedule
            </button>
          )}
          {!onCreateSchedule && onEdit && (
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
          )}
          {status === 'Open' && onClose && (
            <button
              onClick={() => { onClose(); setShowMenu(false); }}
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
              ✓ Close
            </button>
          )}
          {status === 'Close' && onReopen && (
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
              🔄 Reopen
            </button>
          )}
          {onDelete && (
            <>
              {(!!onCreateSchedule || (!onCreateSchedule && !!onEdit) || (status === 'Open' && !!onClose) || (status === 'Close' && !!onReopen)) && (
                <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
              )}
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
            </>
          )}
        </div>
      )}
    </>
  );
};

const UnitScheduling = () => {
  const [activeTab, setActiveTab] = useState<'confirmed' | 'schedules' | 'completed'>('confirmed');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [confirmedDOs, setConfirmedDOs] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<UnitSchedule[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [deliveryOrders, setDeliveryOrders] = useState<any[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
  
  // Format notifications untuk NotificationBell
  const unitNotifications = useMemo(() => {
    return notifications.map((notif: any) => ({
      id: notif.id,
      title: `DO ${notif.doNo || 'N/A'}`,
      message: `Customer: ${notif.customerName || 'N/A'} | Address: ${notif.customerAddress || 'N/A'}`,
      timestamp: notif.created || notif.confirmedAt || notif.timestamp,
      notif: notif, // Keep original data
    }));
  }, [notifications]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [formData, setFormData] = useState<Partial<UnitSchedule>>({
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '08:00',
    estimatedArrivalDate: '',
    estimatedArrivalTime: '',
    estimatedArrival: '', // Keep for backward compatibility
    status: 'Open',
    notes: '',
  });

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
    loadData();
    // Auto-refresh setiap 5 detik
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      // Load semua data menggunakan storageService untuk membaca dari file storage juga
      const [scheduleDataRaw, doDataRaw, notifDataRaw, vehiclesDataRaw, driversDataRaw, routesDataRaw] = await Promise.all([
        storageService.get<UnitSchedule[]>('trucking_unitSchedules'),
        storageService.get<any[]>('trucking_delivery_orders'),
        storageService.get<any[]>('trucking_unitNotifications'),
        storageService.get<any[]>('trucking_vehicles'),
        storageService.get<any[]>('trucking_drivers'),
        storageService.get<any[]>('trucking_routes'),
      ]);
      
      // Ensure arrays (handle null/undefined)
      const scheduleData = scheduleDataRaw || [];
      const doData = doDataRaw || [];
      const notifData = notifDataRaw || [];
      const vehiclesData = vehiclesDataRaw || [];
      const driversData = driversDataRaw || [];
      const routesData = routesDataRaw || [];

      console.log(`📊 [UnitScheduling] Loaded data: ${scheduleData.length} schedules, ${notifData.length} notifications, ${doData.length} DOs`);

      // Filter out deleted items menggunakan helper function
      const activeDoData = filterActiveItems(doData);
      
      // Create set of active DO numbers untuk validasi schedule dan notification
      const activeDONos = new Set(activeDoData.map((d: any) => d.doNo));
      
      const activeNotifData = filterActiveItems(notifData).filter((n: any) => {
        // CRITICAL FIX: Jika DO data kosong (belum ada file), jangan filter notification
        // Ini untuk handle case dimana DO belum pernah di-save ke file storage
        if (activeDONos.size === 0) {
          console.log(`⚠️ [UnitScheduling] No DO data found, keeping notification ${n.id} for DO ${n.doNo}`);
          return true; // Keep notification jika DO data kosong
        }
        // Filter jika DO yang di-reference sudah di-delete
        if (n.doNo && !activeDONos.has(n.doNo)) {
          console.log(`[UnitScheduling] Filtering out notification for deleted DO: ${n.doNo}`);
          return false;
        }
        return true;
      });
      
      // Filter deleted schedules menggunakan helper function
      const activeScheduleData = filterActiveItems(scheduleData).filter((s: any) => {
        // Filter jika schedule sendiri sudah di-delete (sudah di-filter oleh filterActiveItems)
        // Filter jika DO yang di-reference sudah di-delete
        if (s.doNo && !activeDONos.has(s.doNo)) {
          console.log(`[UnitScheduling] Filtering out schedule for deleted DO: ${s.doNo}`);
          return false;
        }
        return true;
      });
      
      const activeVehiclesData = filterActiveItems(vehiclesData || []);
      const activeDriversData = filterActiveItems(driversData || []);
      const activeRoutesData = filterActiveItems(routesData || []);
      
      // Filter notifications: hanya yang belum punya schedule
      const scheduledDONos = new Set(activeScheduleData.map((s: any) => s.doNo));
      const pendingNotifs = activeNotifData.filter((n: any) => {
        // Filter hanya yang PENDING
        if (n.type !== 'DO_CONFIRMED' || (n.status || 'Open') !== 'Open') {
          return false;
        }
        // Filter jika sudah ada schedule untuk DO ini
        if (n.doNo && scheduledDONos.has(n.doNo)) {
          return false;
        }
        return true;
      });
      
      // Hapus notifikasi yang sudah punya schedule dari storage
      if (scheduledDONos.size > 0) {
        const notificationsToRemove = activeNotifData.filter((n: any) => 
          n.type === 'DO_CONFIRMED' && n.doNo && scheduledDONos.has(n.doNo)
        );
        
        if (notificationsToRemove.length > 0) {
          const allNotifications = await storageService.get<any[]>('trucking_unitNotifications') || [];
          const updatedNotifications = allNotifications.filter((n: any) => 
            !(n.type === 'DO_CONFIRMED' && n.doNo && scheduledDONos.has(n.doNo))
          );
          await storageService.set('trucking_unitNotifications', updatedNotifications);
          console.log(`[UnitScheduling] Removed ${notificationsToRemove.length} notifications for scheduled DOs`);
        }
      }
      
      setNotifications(pendingNotifs);
      
      // Load semua notifications yang sudah di-confirm (PENDING dan SCHEDULED)
      const allConfirmedNotifs = activeNotifData.filter((n: any) => 
        n.type === 'DO_CONFIRMED'
      );
      // Sort confirmed DOs by created date (newest first)
      const sortedConfirmedDOs = allConfirmedNotifs.sort((a: any, b: any) => {
        const dateA = a.created ? new Date(a.created).getTime() : (a.confirmedAt ? new Date(a.confirmedAt).getTime() : 0);
        const dateB = b.created ? new Date(b.created).getTime() : (b.confirmedAt ? new Date(b.confirmedAt).getTime() : 0);
        return dateB - dateA; // Newest first
      });
      setConfirmedDOs(sortedConfirmedDOs.map((n: any, idx: number) => ({ ...n, no: idx + 1 })));
      
      // Sort schedules by created date (newest first), fallback to scheduledDate
      const sortedSchedules = activeScheduleData.sort((a: any, b: any) => {
        const dateA = a.created ? new Date(a.created).getTime() : (a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0);
        const dateB = b.created ? new Date(b.created).getTime() : (b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0);
        return dateB - dateA; // Newest first
      });
      setSchedules(sortedSchedules.map((s, idx) => ({ ...s, no: idx + 1 })) as any);
      setVehicles(activeVehiclesData);
      setDrivers(activeDriversData);
      setRoutes(activeRoutesData);
      setDeliveryOrders(activeDoData);
    } catch (error: any) {
      console.error('[UnitScheduling] Error loading data:', error);
    }
  };

  const handleCreateScheduleFromNotification = (notif: any) => {
    setSelectedNotification(notif);
    
    // Cari DO data untuk mendapatkan data lengkap
    const doData = deliveryOrders.find((doItem: any) => doItem.doNo === notif.doNo);
    
    // Gunakan data dari DO jika ada, fallback ke notif
    const dataSource = doData || notif;
    
    // Cari route berdasarkan routeId atau routeName dari DO
    let matchedRouteId = dataSource.routeId || notif.routeId || '';
    let matchedRouteName = dataSource.routeName || notif.routeName || '';
    
    // Jika routeId tidak ada atau tidak match dengan routes yang ada, cari berdasarkan routeName
    if (matchedRouteName && (!matchedRouteId || !routes.find(r => r.id === matchedRouteId))) {
      const routeByName = routes.find(r => 
        r.status === 'Active' && 
        (r.routeName === matchedRouteName || r.routeName?.toLowerCase() === matchedRouteName?.toLowerCase())
      );
      if (routeByName) {
        matchedRouteId = routeByName.id;
        matchedRouteName = routeByName.routeName;
      }
    }
    
    setFormData({
      doNo: dataSource.doNo || notif.doNo,
      customerName: dataSource.customerName || notif.customerName,
      customerAddress: dataSource.customerAddress || notif.customerAddress,
      vehicleId: dataSource.vehicleId || notif.vehicleId || '',
      vehicleNo: dataSource.vehicleNo || notif.vehicleNo || '',
      driverId: dataSource.driverId || notif.driverId || '',
      driverName: dataSource.driverName || notif.driverName || '',
      routeId: matchedRouteId,
      routeName: matchedRouteName,
      scheduledDate: dataSource.scheduledDate || notif.scheduledDate || new Date().toISOString().split('T')[0],
      scheduledTime: '08:00',
      estimatedArrivalDate: '', // Akan diisi manual atau dari route
      estimatedArrivalTime: '',
      estimatedArrival: '',
      status: 'Open',
      notes: dataSource.notes || notif.notes || '',
    });
    setShowScheduleForm(true);
  };

  const handleSaveSchedule = async () => {
    try {
      if (!formData.doNo || !formData.scheduledDate || !formData.scheduledTime) {
        showAlert('DO No, Scheduled Date, dan Scheduled Time harus diisi', 'Validation Error');
        return;
      }

      const vehicle = vehicles.find(v => v.id === formData.vehicleId);
      const driver = drivers.find(d => d.id === formData.driverId);
      const route = routes.find(r => r.id === formData.routeId);

      const newSchedule: UnitSchedule = {
        id: Date.now().toString(),
        doNo: formData.doNo || '',
        customerName: formData.customerName || '',
        customerAddress: formData.customerAddress || '',
        vehicleId: formData.vehicleId || '',
        vehicleNo: vehicle?.vehicleNo || formData.vehicleNo || '',
        driverId: formData.driverId || '',
        driverName: driver?.name || formData.driverName || '',
        routeId: formData.routeId || '',
        routeName: route?.routeName || formData.routeName || '',
        scheduledDate: formData.scheduledDate || '',
        scheduledTime: formData.scheduledTime || '',
        estimatedArrivalDate: formData.estimatedArrivalDate || '',
        estimatedArrivalTime: formData.estimatedArrivalTime || '',
        estimatedArrival: formData.estimatedArrivalDate && formData.estimatedArrivalTime 
          ? `${formData.estimatedArrivalDate} ${formData.estimatedArrivalTime}` 
          : formData.estimatedArrival || '', // Keep for backward compatibility
        status: formData.status || 'Open',
        notes: formData.notes || '',
        created: new Date().toISOString(),
      };

      const updatedSchedules = [...schedules, newSchedule];
      await storageService.set('trucking_unitSchedules', updatedSchedules);
      // Sort by created date (newest first)
      const sortedSchedules = updatedSchedules.sort((a: any, b: any) => {
        const dateA = a.created ? new Date(a.created).getTime() : (a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0);
        const dateB = b.created ? new Date(b.created).getTime() : (b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0);
        return dateB - dateA; // Newest first
      });
      setSchedules(sortedSchedules.map((s, idx) => ({ ...s, no: idx + 1 })) as any);

      // Hapus notification setelah schedule dibuat (hapus semua notifikasi untuk DO ini)
      const allNotifications = await storageService.get<any[]>('trucking_unitNotifications') || [];
      const updatedNotifications = allNotifications.filter((n: any) => 
        !(n.type === 'DO_CONFIRMED' && n.doNo === newSchedule.doNo)
      );
      await storageService.set('trucking_unitNotifications', updatedNotifications);
      
      // Update state notifications
      const scheduledDONos = new Set([...schedules.map((s: any) => s.doNo), newSchedule.doNo]);
      const remainingNotifs = updatedNotifications.filter((n: any) => {
        if (n.type !== 'DO_CONFIRMED' || (n.status || 'Open') !== 'Open') {
          return false;
        }
        if (n.doNo && scheduledDONos.has(n.doNo)) {
          return false;
        }
        return true;
      });
      setNotifications(remainingNotifs);

      // Kirim notifikasi ke Petty Cash untuk pengaturan uang jalan
      try {
        const pettyCashNotifications = await storageService.get<any[]>('trucking_pettyCashNotifications') || [];
        const existingNotif = pettyCashNotifications.find((n: any) => 
          n.scheduleId === newSchedule.id && n.type === 'SCHEDULE_CREATED'
        );
        
        if (!existingNotif && newSchedule.driverId) {
          const newPettyCashNotification = {
            id: `pettycash-${Date.now()}-${newSchedule.id}`,
            type: 'SCHEDULE_CREATED',
            scheduleId: newSchedule.id,
            doNo: newSchedule.doNo,
            customerName: newSchedule.customerName,
            customerAddress: newSchedule.customerAddress,
            driverId: newSchedule.driverId,
            driverName: newSchedule.driverName,
            vehicleId: newSchedule.vehicleId,
            vehicleNo: newSchedule.vehicleNo,
            routeId: newSchedule.routeId,
            routeName: newSchedule.routeName,
            scheduledDate: newSchedule.scheduledDate,
            scheduledTime: newSchedule.scheduledTime,
            estimatedArrival: newSchedule.estimatedArrival,
            notes: newSchedule.notes || '',
            status: 'Open',
            created: new Date().toISOString(),
          };
          await storageService.set('trucking_pettyCashNotifications', [...pettyCashNotifications, newPettyCashNotification]);
          console.log(`✅ [UnitScheduling] Created petty cash notification for schedule ${newSchedule.id} (DO ${newSchedule.doNo})`);
        }
      } catch (error: any) {
        console.error('Error creating petty cash notification:', error);
      }

      showAlert(`Schedule berhasil dibuat untuk DO ${formData.doNo}!\n\n📧 Notification sent to Petty Cash for uang jalan setup.`, 'Success');
      setShowScheduleForm(false);
      setSelectedNotification(null);
      setFormData({
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: '08:00',
        estimatedArrival: '',
        status: 'Open',
        notes: '',
      });
      loadData();
    } catch (error: any) {
      showAlert(`Error saving schedule: ${error.message}`, 'Error');
    }
  };

  const handleEditSchedule = (schedule: UnitSchedule) => {
    setSelectedNotification(null);
    // Parse estimatedArrival lama jika ada (format: "YYYY-MM-DD HH:mm" atau hanya waktu)
    let estimatedArrivalDate = schedule.estimatedArrivalDate || '';
    let estimatedArrivalTime = schedule.estimatedArrivalTime || '';
    
    if (!estimatedArrivalDate && !estimatedArrivalTime && schedule.estimatedArrival) {
      // Coba parse dari estimatedArrival lama
      const parts = schedule.estimatedArrival.split(' ');
      if (parts.length >= 2) {
        estimatedArrivalDate = parts[0];
        estimatedArrivalTime = parts[1];
      } else if (parts.length === 1) {
        // Hanya waktu, gunakan scheduledDate sebagai tanggal
        estimatedArrivalTime = parts[0];
        estimatedArrivalDate = schedule.scheduledDate || '';
      }
    }
    
    setFormData({
      ...schedule,
      estimatedArrivalDate,
      estimatedArrivalTime,
    });
    setShowScheduleForm(true);
  };

  const handleDeleteSchedule = async (schedule: UnitSchedule) => {
    showConfirm(
      `Are you sure you want to delete schedule for DO "${schedule.doNo}"?`,
      async () => {
        try {
          // Pakai helper function untuk safe delete (tombstone pattern)
          const success = await safeDeleteItem('trucking_unitSchedules', schedule.id, 'id');
          
          if (success) {
            // Reload data dengan filter active items
            const updatedSchedules = await storageService.get<UnitSchedule[]>('trucking_unitSchedules') || [];
            const activeSchedules = filterActiveItems(updatedSchedules);
            
            // Sort by created date (newest first)
            const sortedSchedules = activeSchedules.sort((a: any, b: any) => {
              const dateA = a.created ? new Date(a.created).getTime() : (a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0);
              const dateB = b.created ? new Date(b.created).getTime() : (b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0);
              return dateB - dateA; // Newest first
            });
            setSchedules(sortedSchedules.map((s, idx) => ({ ...s, no: idx + 1 })) as any);
            showAlert(`Schedule for DO "${schedule.doNo}" deleted successfully`, 'Success');
          } else {
            showAlert(`Error deleting schedule for DO "${schedule.doNo}". Please try again.`, 'Error');
          }
        } catch (error: any) {
          showAlert(`Error deleting schedule: ${error.message}`, 'Error');
        }
      },
      undefined,
      'Confirm Delete'
    );
  };

  const handleStatusChange = async (schedule: UnitSchedule, newStatus: UnitSchedule['status']) => {
    try {
      const updated = schedules.map(s =>
        s.id === schedule.id
          ? { ...s, status: newStatus }
          : s
      );
      await storageService.set('trucking_unitSchedules', updated);
      // Sort by created date (newest first)
      const sortedSchedules = updated.sort((a: any, b: any) => {
        const dateA = a.created ? new Date(a.created).getTime() : (a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0);
        const dateB = b.created ? new Date(b.created).getTime() : (b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0);
        return dateB - dateA; // Newest first
      });
      setSchedules(sortedSchedules.map((s, idx) => ({ ...s, no: idx + 1 })) as any);
    } catch (error: any) {
      showAlert(`Error updating status: ${error.message}`, 'Error');
    }
  };

  const handleDeleteNotification = async (notification: any) => {
    try {
      // Gunakan safeDeleteItem untuk soft delete (tombstone pattern)
      const notifId = notification.notif?.id || notification.id;
      if (!notifId) {
        showAlert('Error: Notification ID tidak ditemukan', 'Error');
        return;
      }
      
      const success = await safeDeleteItem('trucking_unitNotifications', notifId, 'id');
      
      if (success) {
        // Reload data dengan filter active items
        const allNotifications = await storageService.get<any[]>('trucking_unitNotifications') || [];
        const activeNotifs = filterActiveItems(allNotifications).filter((n: any) => {
          if (n.type !== 'DO_CONFIRMED' || (n.status || 'Open') !== 'Open') {
            return false;
          }
          // Filter jika sudah ada schedule untuk DO ini
          const scheduledDONos = new Set(schedules.map((s: any) => s.doNo));
          if (n.doNo && scheduledDONos.has(n.doNo)) {
            return false;
          }
          return true;
        });
        setNotifications(activeNotifs);
        showAlert('Notifikasi berhasil dihapus', 'Success');
      } else {
        showAlert('Error menghapus notifikasi. Silakan coba lagi.', 'Error');
      }
    } catch (error: any) {
      showAlert(`Error deleting notification: ${error.message}`, 'Error');
    }
  };

  const handleDeleteConfirmedDO = async (confirmedDO: any) => {
    try {
      // Cari notification yang sesuai dengan DO ini
      const allNotifications = await storageService.get<any[]>('trucking_unitNotifications') || [];
      const matchingNotif = allNotifications.find((n: any) => 
        n.type === 'DO_CONFIRMED' && n.doNo === confirmedDO.doNo
      );
      
      if (!matchingNotif || !matchingNotif.id) {
        showAlert('Error: Notification untuk DO ini tidak ditemukan', 'Error');
        return;
      }
      
      const success = await safeDeleteItem('trucking_unitNotifications', matchingNotif.id, 'id');
      
      if (success) {
        // Reload data
        await loadData();
        showAlert('Confirmed DO berhasil dihapus', 'Success');
      } else {
        showAlert('Error menghapus confirmed DO. Silakan coba lagi.', 'Error');
      }
    } catch (error: any) {
      showAlert(`Error deleting confirmed DO: ${error.message}`, 'Error');
    }
  };

  const filteredSchedules = useMemo(() => {
    let filtered: UnitSchedule[] = [];
    if (activeTab === 'schedules') {
      filtered = schedules.filter(s => s.status === 'Open');
    } else if (activeTab === 'completed') {
      filtered = schedules.filter(s => s.status === 'Close');
    }
    // Sort by created date (newest first), fallback to scheduledDate
    return filtered.sort((a, b) => {
      const dateA = a.created ? new Date(a.created).getTime() : (a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0);
      const dateB = b.created ? new Date(b.created).getTime() : (b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0);
      return dateB - dateA; // Newest first
    });
  }, [schedules, activeTab]);

  const confirmedDOColumns = [
    { key: 'no', header: 'No' },
    { key: 'doNo', header: 'DO No' },
    { key: 'customerName', header: 'Customer' },
    { key: 'customerAddress', header: 'Address' },
    {
      key: 'items',
      header: 'Items',
      render: (item: any) => {
        const itemsCount = item.items?.length || 0;
        if (itemsCount === 0) return <span>-</span>;
        return (
          <span style={{ fontSize: '12px' }}>
            {itemsCount} item(s)
            {item.items && item.items.length > 0 && (
              <div style={{ marginTop: '4px', fontSize: '11px', opacity: 0.8 }}>
                {item.items.slice(0, 2).map((it: any, idx: number) => (
                  <div key={idx}>
                    {it.product || it.productName || 'N/A'} ({it.qty || 0} {it.unit || ''})
                  </div>
                ))}
                {item.items.length > 2 && <div>+{item.items.length - 2} more...</div>}
              </div>
            )}
          </span>
        );
      },
    },
    { key: 'vehicleNo', header: 'Vehicle' },
    { key: 'driverName', header: 'Driver' },
    { key: 'routeName', header: 'Route' },
    { key: 'scheduledDate', header: 'Scheduled Date' },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => (
        <span className={`status-badge status-${(item.status || 'Open').toLowerCase()}`}>
          {item.status || 'Open'}
        </span>
      ),
    },
    {
      key: 'created',
      header: 'Confirmed At',
      render: (item: any) => {
        const date = item.created ? new Date(item.created).toLocaleString('id-ID') : '-';
        return <span style={{ fontSize: '12px' }}>{date}</span>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: any) => (
        <ActionMenu
          onEdit={() => {}}
          onCreateSchedule={() => handleCreateScheduleFromNotification(item)}
          onDelete={() => handleDeleteConfirmedDO(item)}
          status="Open"
        />
      ),
    },
  ];

  const columns = [
    { key: 'no', header: 'No' },
    { key: 'doNo', header: 'DO No' },
    { key: 'customerName', header: 'Customer' },
    { key: 'vehicleNo', header: 'Vehicle' },
    { key: 'driverName', header: 'Driver' },
    { key: 'routeName', header: 'Route' },
    { key: 'scheduledDate', header: 'Scheduled Date' },
    { key: 'scheduledTime', header: 'Scheduled Time' },
    { 
      key: 'estimatedArrival', 
      header: 'Estimated Arrival',
      render: (item: UnitSchedule) => {
        if (item.estimatedArrivalDate && item.estimatedArrivalTime) {
          return `${item.estimatedArrivalDate} ${item.estimatedArrivalTime}`;
        }
        // Fallback untuk data lama
        return item.estimatedArrival || '-';
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: UnitSchedule) => (
        <span className={`status-badge status-${item.status?.toLowerCase().replace('_', '-')}`}>
          {item.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: UnitSchedule) => (
        <ActionMenu
          onEdit={() => handleEditSchedule(item)}
          onClose={item.status === 'Open' ? () => handleStatusChange(item, 'Close') : undefined}
          onReopen={item.status === 'Close' ? () => handleStatusChange(item, 'Open') : undefined}
          onDelete={item.status === 'Open' ? () => handleDeleteSchedule(item) : undefined}
          status={item.status}
        />
      ),
    },
  ];

  // Columns untuk notifications table
  const notificationColumns = [
    { key: 'doNo', header: 'DO No' },
    { key: 'customerName', header: 'Customer' },
    { 
      key: 'items', 
      header: 'Items',
      render: (item: any) => {
        const itemsCount = item.items?.length || 0;
        return <span>{itemsCount} item(s)</span>;
      }
    },
    { key: 'vehicleNo', header: 'Vehicle' },
    { key: 'driverName', header: 'Driver' },
    { key: 'routeName', header: 'Route' },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: any) => (
        <Button
          variant="primary"
          onClick={() => handleCreateScheduleFromNotification(item)}
          style={{ fontSize: '11px', padding: '4px 8px' }}
        >
          Create Schedule
        </Button>
      ),
    },
  ];

  return (
    <div className="module-compact">
      <div className="page-header">
        <h1>Unit Scheduling</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {notifications.length > 0 && (
            <NotificationBell
              notifications={unitNotifications}
              onNotificationClick={(notification) => {
                if (notification.notif) {
                  handleCreateScheduleFromNotification(notification.notif);
                }
              }}
              onDeleteNotification={handleDeleteNotification}
              icon="🚚"
              emptyMessage="Tidak ada DO yang perlu di-schedule"
            />
          )}
        </div>
      </div>
      
      {/* Notifications - HIDDEN, menggunakan NotificationBell di header */}
      {false && notifications.length > 0 && (
        <Card className="mb-4">
          <div style={{ 
            backgroundColor: document.documentElement.getAttribute('data-theme') === 'light' ? '#4caf50' : '#2e7d32', 
            color: document.documentElement.getAttribute('data-theme') === 'light' ? '#1a1a1a' : '#ffffff', 
            padding: '12px 16px', 
            borderRadius: '6px',
            marginBottom: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <strong>📋 Delivery Order Notifications ({notifications.length})</strong>
                <div style={{ fontSize: '13px', opacity: 0.85 }}>DO yang sudah confirmed dan perlu dibuat schedule</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
          <h2>Pengaturan Unit</h2>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid var(--border-color)' }}>
          <button
            onClick={() => setActiveTab('confirmed')}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'confirmed' ? '3px solid var(--accent-color)' : '3px solid transparent',
              color: activeTab === 'confirmed' ? 'var(--accent-color)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'confirmed' ? '600' : '400',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ✓ Confirmed DO ({confirmedDOs.length})
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'schedules' ? '3px solid var(--accent-color)' : '3px solid transparent',
              color: activeTab === 'schedules' ? 'var(--accent-color)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'schedules' ? '600' : '400',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            📅 Schedules ({filteredSchedules.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'completed' ? '3px solid var(--accent-color)' : '3px solid transparent',
              color: activeTab === 'completed' ? 'var(--accent-color)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'completed' ? '600' : '400',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ✓ Closed ({schedules.filter(s => s.status === 'Close').length})
          </button>
        </div>


        {/* Confirmed DO View */}
        {activeTab === 'confirmed' && (
          <Card>
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'flex-end' }}>
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
            {viewMode === 'card' ? (
              confirmedDOs.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
                  {confirmedDOs.map((item: any) => (
                    <Card key={item.id} style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>{item.doNo}</div>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.customerName}</div>
                        </div>
                        <span className={`status-badge status-${item.status?.toLowerCase()}`}>
                          {item.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>📅 Order Date: {item.orderDate || '-'}</div>
                        <div>🚚 Route: {item.routeName || '-'}</div>
                        <div>👤 Driver: {item.driverName || '-'}</div>
                        <div>🚛 Vehicle: {item.vehicleNo || '-'}</div>
                        {item.scheduledDate && <div>📆 Scheduled: {item.scheduledDate}</div>}
                        {item.confirmedAt && <div>✓ Confirmed: {new Date(item.confirmedAt).toLocaleString('id-ID')}</div>}
                      </div>
                      {item.items && item.items.length > 0 && (
                        <div style={{ fontSize: '12px', background: 'var(--bg-secondary)', padding: '8px', borderRadius: '6px', marginBottom: '12px' }}>
                          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Items ({item.items.length})</div>
                          {item.items.slice(0, 3).map((itm: any, idx: number) => (
                            <div key={idx}>• {itm.product} ({itm.qty} {itm.unit || 'PCS'})</div>
                          ))}
                          {item.items.length > 3 && <div style={{ opacity: 0.7 }}>... and {item.items.length - 3} more</div>}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                        <ActionMenu
                          onEdit={() => {}}
                          onCreateSchedule={() => handleCreateScheduleFromNotification(item)}
                          onDelete={() => handleDeleteConfirmedDO(item)}
                          status="Open"
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No confirmed delivery orders
                </div>
              )
            ) : (
              <Table columns={confirmedDOColumns} data={confirmedDOs} emptyMessage="No confirmed delivery orders" />
            )}
          </Card>
        )}

        {/* Schedules View */}
        {(activeTab === 'schedules' || activeTab === 'completed') && (
          <Card>
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'flex-end' }}>
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
            {viewMode === 'card' ? (
              filteredSchedules.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
                  {filteredSchedules.map((item) => (
                    <Card key={item.id} style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>{item.doNo}</div>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.customerName}</div>
                        </div>
                        <span className={`status-badge status-${item.status?.toLowerCase().replace('_', '-')}`}>
                          {item.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>🚛 Vehicle: {item.vehicleNo || '-'}</div>
                        <div>👤 Driver: {item.driverName || '-'}</div>
                        <div>🚚 Route: {item.routeName || '-'}</div>
                        <div>📅 Scheduled: {item.scheduledDate || '-'} {item.scheduledTime || ''}</div>
                        {(item.estimatedArrivalDate && item.estimatedArrivalTime) && (
                          <div>⏰ Est. Arrival: {item.estimatedArrivalDate} {item.estimatedArrivalTime}</div>
                        )}
                        {item.estimatedArrival && !item.estimatedArrivalDate && (
                          <div>⏰ Est. Arrival: {item.estimatedArrival}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <ActionMenu
                          onEdit={() => handleEditSchedule(item)}
                          onClose={item.status === 'Open' ? () => handleStatusChange(item, 'Close') : undefined}
                          onReopen={item.status === 'Close' ? () => handleStatusChange(item, 'Open') : undefined}
                          onDelete={item.status === 'Open' ? () => handleDeleteSchedule(item) : undefined}
                          status={item.status}
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  {activeTab === 'schedules' ? "No active schedules" : "No completed schedules"}
                </div>
              )
            ) : (
              <Table columns={columns} data={filteredSchedules} emptyMessage={activeTab === 'schedules' ? "No active schedules" : "No completed schedules"} />
            )}
          </Card>
        )}

        {/* Schedule Form Dialog */}
        {showScheduleForm && (
          <div style={{
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
          }}>
            <div style={{ width: '700px', maxHeight: '90vh', overflow: 'auto', backgroundColor: 'var(--bg-primary)', padding: '20px', borderRadius: '8px' }}>
              <h3>{selectedNotification ? 'Create Schedule from Notification' : 'Edit Schedule'}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                {selectedNotification && (
                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '13px' }}>
                    <div><strong>DO No:</strong> {formData.doNo}</div>
                    <div><strong>Customer:</strong> {formData.customerName}</div>
                    <div><strong>Address:</strong> {formData.customerAddress}</div>
                    <div><strong>Items:</strong> {selectedNotification.items?.length || 0} item(s)</div>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Input
                    label="DO No"
                    value={formData.doNo || ''}
                    onChange={(v) => setFormData({ ...formData, doNo: v })}
                    disabled={!!selectedNotification}
                  />
                  <Input
                    label="Scheduled Date"
                    type="date"
                    value={formData.scheduledDate || ''}
                    onChange={(v) => setFormData({ ...formData, scheduledDate: v })}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Input
                    label="Scheduled Time"
                    type="time"
                    value={formData.scheduledTime || ''}
                    onChange={(v) => setFormData({ ...formData, scheduledTime: v })}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Input
                    label="Estimated Arrival Date"
                    type="date"
                    value={formData.estimatedArrivalDate || ''}
                    onChange={(v) => setFormData({ ...formData, estimatedArrivalDate: v })}
                  />
                  <Input
                    label="Estimated Arrival Time"
                    type="time"
                    value={formData.estimatedArrivalTime || ''}
                    onChange={(v) => setFormData({ ...formData, estimatedArrivalTime: v })}
                  />
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
                    Driver
                  </label>
                  <select
                    value={formData.driverId || ''}
                    onChange={(e) => {
                      const driver = drivers.find(d => d.id === e.target.value);
                      setFormData({ 
                        ...formData, 
                        driverId: e.target.value,
                        driverName: driver?.name || '',
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
                    <option value="">-- Pilih Driver --</option>
                    {drivers.filter(d => d.status === 'Active').map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} - {d.licenseNo}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                    Route {formData.routeName && <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>(auto-filled from DO)</span>}
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
                      backgroundColor: formData.routeId ? 'var(--bg-secondary)' : 'var(--bg-primary)',
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
                  {formData.routeName && !formData.routeId && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Route dari DO: <strong>{formData.routeName}</strong> (tidak ditemukan di master routes, bisa pilih dari dropdown atau biarkan kosong)
                    </div>
                  )}
                </div>
                <Input
                  label="Notes"
                  type="textarea"
                  value={formData.notes || ''}
                  onChange={(v) => setFormData({ ...formData, notes: v })}
                />
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                  <Button variant="secondary" onClick={() => { 
                    setShowScheduleForm(false); 
                    setSelectedNotification(null);
                    setFormData({
                      scheduledDate: new Date().toISOString().split('T')[0],
                      scheduledTime: '08:00',
                      estimatedArrivalDate: '',
                      estimatedArrivalTime: '',
                      estimatedArrival: '',
                      status: 'Open',
                      notes: '',
                    });
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveSchedule} variant="primary">
                    {selectedNotification ? 'Create Schedule' : 'Update Schedule'}
                  </Button>
                </div>
              </div>
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
      </Card>
    </div>
  );
};

export default UnitScheduling;
