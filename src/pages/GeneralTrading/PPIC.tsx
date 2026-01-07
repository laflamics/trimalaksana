import { useState, useEffect, useMemo, useRef } from 'react';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Input from '../../components/Input';
import DeliveryScheduleDialog from '../../components/DeliveryScheduleDialog';
import NotificationBell from '../../components/NotificationBell';
import { storageService, extractStorageValue } from '../../services/storage';
import { safeDeleteItem, filterActiveItems } from '../../utils/data-persistence-helper';
import { useDialog } from '../../hooks/useDialog';
// import { openPrintWindow } from '../../utils/actions'; // Not used yet
import '../../styles/common.css';
import '../../styles/compact.css';
import './PPIC.css';

// SPK Action Menu component untuk dropdown 3 titik
const SPKActionMenu = ({
  onCheckCreatePR,
  onScheduleDelivery,
  onDelete,
  hasSchedule,
  hasPR,
  isCreatingPR,
}: {
  onCheckCreatePR?: () => void;
  onScheduleDelivery?: () => void;
  onDelete?: () => void;
  hasSchedule?: boolean;
  hasPR?: boolean;
  isCreatingPR?: boolean;
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  
  // Removed console.log for better performance

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
      // Align menu to right edge of button (vertical dropdown, muncul ke kanan)
      const menuWidth = 200; // Approximate menu width
      const spaceOnRight = window.innerWidth - buttonRect.right;
      
      if (spaceOnRight >= menuWidth) {
        // Ada cukup ruang di kanan, align ke kanan edge button
        setMenuPosition({
          top: buttonRect.bottom + 4,
          left: buttonRect.right, // Mulai dari right edge button
        });
      } else {
        // Tidak cukup ruang di kanan, align ke kiri edge button (backward)
        setMenuPosition({
          top: buttonRect.bottom + 4,
          left: buttonRect.left - menuWidth, // Posisi ke kiri dengan offset menu width
        });
      }
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
            left: `${menuPosition.left}px`,
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 10000,
            minWidth: '180px',
            maxWidth: '220px',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {onCheckCreatePR && (
            <button
              onClick={() => { onCheckCreatePR(); setShowMenu(false); }}
              disabled={isCreatingPR || hasPR}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '6px 10px',
                border: 'none',
                background: 'transparent',
                color: (isCreatingPR || hasPR) ? 'var(--text-secondary)' : 'var(--text-primary)',
                cursor: (isCreatingPR || hasPR) ? 'not-allowed' : 'pointer',
                fontSize: '11px',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => !(isCreatingPR || hasPR) && (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {hasPR ? '✅ PR Created' : (isCreatingPR ? '⏳ Creating PR...' : '📋 Check & Create PR')}
            </button>
          )}
          {onScheduleDelivery && !hasSchedule && (
            <button
              onClick={() => { onScheduleDelivery(); setShowMenu(false); }}
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
              📅 Schedule Delivery
            </button>
          )}
          {hasSchedule && (
            <div style={{
              width: '100%',
              padding: '6px 10px',
              fontSize: '11px',
              color: '#2e7d32',
              fontWeight: '500',
            }}>
              ✅ Schedule Created
            </div>
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
                color: '#f44336',
                cursor: 'pointer',
                fontSize: '11px',
                borderRadius: '4px',
                borderTop: '1px solid var(--border-color)',
                marginTop: '4px',
                paddingTop: '8px',
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

const PPIC = () => {
  const [activeTab, setActiveTab] = useState<'spk' | 'schedule' | 'outstanding'>('spk');
  const [spkViewMode, setSpkViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedDeliveryItem, setSelectedDeliveryItem] = useState<{
    soNo: string;
    customer: string;
    spks: any[];
  } | null>(null);
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [spkData, setSpkData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingSO, setViewingSO] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<any[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<any[]>([]);
  const [creatingPR, setCreatingPR] = useState<{ [spkNo: string]: boolean }>({});
  const [pendingSONotifications, setPendingSONotifications] = useState<any[]>([]);
  const [selectedItemsForSPK, setSelectedItemsForSPK] = useState<{ [itemId: string]: boolean }>({});
  
  // Auto-select all items yang belum punya SPK ketika dialog dibuka
  useEffect(() => {
    if (viewingSO && viewingSO.items) {
      const autoSelected: { [key: string]: boolean } = {};
      viewingSO.items.forEach((item: any, idx: number) => {
        const itemId = item.id || `${viewingSO.soNo}-${idx}`;
        const existingSPK = spkData.find((s: any) => 
          s.soNo === viewingSO.soNo && 
          (s.product_id === item.productId || s.product_id === item.productKode || s.kode === item.productKode)
        );
        // Auto-select jika belum punya SPK
        if (!existingSPK) {
          autoSelected[itemId] = true;
        }
      });
      setSelectedItemsForSPK(autoSelected);
    } else {
      // Reset ketika dialog ditutup
      setSelectedItemsForSPK({});
    }
  }, [viewingSO, spkData]);
  
  // Format notifications untuk NotificationBell
  const soNotifications = useMemo(() => {
    return pendingSONotifications.map((notif: any) => {
      const so = salesOrders.find((s: any) => s.soNo === notif.soNo);
      return {
        id: notif.id,
        title: `SO ${notif.soNo || 'N/A'}`,
        message: `Customer: ${notif.customer || 'N/A'} | Items: ${notif.items?.length || 0} product(s)`,
        timestamp: notif.created || notif.timestamp,
        so: so || notif, // Keep original data
      };
    });
  }, [pendingSONotifications, salesOrders]);
  
  // Custom Dialog - menggunakan hook terpusat
  const { showAlert, showConfirm: showConfirmBase, closeDialog, DialogComponent } = useDialog();
  
  // Wrapper untuk kompatibilitas dengan urutan parameter yang berbeda
  const showConfirm = (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
    showConfirmBase(message, onConfirm, onCancel, title);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 10000); // Refresh data every 10 seconds (reduced frequency to prevent excessive re-renders)
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    // Initialize empty arrays in local storage first to prevent 404 errors
    // Check localStorage directly dengan key yang benar untuk GT
    const storageKeySpk = 'general-trading/gt_spk';
    const storageKeySchedule = 'general-trading/gt_schedule';
    const storageKeyPpicNotifications = 'general-trading/gt_ppicNotifications';
    
    // Check localStorage directly - jika belum ada, initialize empty array SEBELUM get
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const localSpk = window.localStorage.getItem(storageKeySpk);
        if (!localSpk || localSpk === 'null') {
          // Initialize empty array di local storage langsung (tidak via storageService.set untuk avoid double fetch)
          window.localStorage.setItem(storageKeySpk, JSON.stringify({
            value: [],
            timestamp: Date.now(),
            _timestamp: Date.now(),
          }));
        }
        const localSchedule = window.localStorage.getItem(storageKeySchedule);
        if (!localSchedule || localSchedule === 'null') {
          window.localStorage.setItem(storageKeySchedule, JSON.stringify({
            value: [],
            timestamp: Date.now(),
            _timestamp: Date.now(),
          }));
        }
        const localPpicNotif = window.localStorage.getItem(storageKeyPpicNotifications);
        if (!localPpicNotif || localPpicNotif === 'null') {
          window.localStorage.setItem(storageKeyPpicNotifications, JSON.stringify({
            value: [],
            timestamp: Date.now(),
            _timestamp: Date.now(),
          }));
        }
      } catch (e) {
        // Silent fail
      }
    }
    
    const spkRaw = extractStorageValue(await storageService.get<any[]>('gt_spk')) || [];
    const scheduleRaw = extractStorageValue(await storageService.get<any[]>('gt_schedule')) || [];
    const customersDataRaw = extractStorageValue(await storageService.get<any[]>('gt_customers')) || [];
    const productsDataRaw = extractStorageValue(await storageService.get<any[]>('gt_products')) || [];
    const salesOrdersDataRaw = extractStorageValue(await storageService.get<any[]>('gt_salesOrders')) || [];
    const inventoryDataRaw = extractStorageValue(await storageService.get<any[]>('gt_inventory')) || [];
    const purchaseOrdersDataRaw = extractStorageValue(await storageService.get<any[]>('gt_purchaseOrders')) || [];
    const deliveryNotesDataRaw = extractStorageValue(await storageService.get<any[]>('gt_delivery')) || [];
    const purchaseRequestsDataRaw = extractStorageValue(await storageService.get<any[]>('gt_purchaseRequests')) || [];
    
    // Filter out deleted items menggunakan helper function
    let spk = filterActiveItems(spkRaw);
    let schedule = filterActiveItems(scheduleRaw);
    const customersData = filterActiveItems(customersDataRaw);
    const productsData = filterActiveItems(productsDataRaw);
    const salesOrdersData = filterActiveItems(salesOrdersDataRaw);
    const inventoryData = filterActiveItems(inventoryDataRaw);
    const purchaseOrdersData = filterActiveItems(purchaseOrdersDataRaw);
    const deliveryNotesData = filterActiveItems(deliveryNotesDataRaw);
    const purchaseRequestsData = filterActiveItems(purchaseRequestsDataRaw);
    
    // Auto-update SPK status berdasarkan delivery
    let updatedSPK = false;
    const updatedSpkList = spk.map((s: any) => {
      if (!s.soNo || !s.spkNo) return s;
      
      const spkQty = parseFloat(s.qty || '0') || 0;
      if (spkQty <= 0) return s;

      // Cek apakah product di SPK ini sudah terkirim
      const spkProductId = (s.product_id || s.productId || s.kode || '').toString().trim();
      const spkProductName = (s.product || '').toString().trim();

      // Cari semua delivery yang terkait dengan SO ini dan statusnya CLOSE atau DELIVERED
      const relatedDeliveries = deliveryNotesData.filter((del: any) => 
        del.soNo === s.soNo && 
        (del.status === 'CLOSE' || del.status === 'DELIVERED')
      );

      // Hitung total qty yang sudah terkirim untuk product di SPK ini
      let totalDeliveredQty = 0;
      relatedDeliveries.forEach((del: any) => {
        if (del.items && Array.isArray(del.items)) {
          del.items.forEach((delItem: any) => {
            const deliverySpkNo = (delItem.spkNo || '').toString().trim();
            const currentSpkNo = (s.spkNo || '').toString().trim();
            const isRelatedToThisSPK = deliverySpkNo === currentSpkNo;
            
            if (!isRelatedToThisSPK) return;
            
            const delProductId = (delItem.productId || delItem.productKode || '').toString().trim().toLowerCase();
            const delProductName = (delItem.product || delItem.productName || '').toString().trim().toLowerCase();
            const spkProductIdLower = spkProductId.toLowerCase();
            const spkProductNameLower = spkProductName.toLowerCase();
            
            const productIdMatch = spkProductIdLower && delProductId && spkProductIdLower === delProductId;
            const productNameMatch = spkProductNameLower && delProductName && spkProductNameLower === delProductName;
            
            if (productIdMatch || productNameMatch) {
              totalDeliveredQty += parseFloat(delItem.qty || '0') || 0;
            }
          });
        }
      });

      // Update status berdasarkan delivery
      const isDelivered = totalDeliveredQty >= spkQty;
      
      if (isDelivered && s.status !== 'CLOSE') {
        updatedSPK = true;
        return { ...s, status: 'CLOSE' as const };
      } else if (!isDelivered && s.status === 'CLOSE') {
        updatedSPK = true;
        return { ...s, status: 'OPEN' as const };
      }
      
      return s;
    });
    
    if (updatedSPK) {
      await storageService.set('gt_spk', updatedSpkList);
      spk = updatedSpkList;
    }
    
    // Process PPIC notifications (from SO and GRN)
    const ppicNotificationsRaw = await storageService.get<any[]>('gt_ppicNotifications');
    const ppicNotifications = extractStorageValue(ppicNotificationsRaw) || [];
    // Removed excessive console.log for better performance
    let updatedNotifications = false;
    const processedNotifications: any[] = [];
    const deliveryNotifications = await storageService.get<any[]>('gt_deliveryNotifications') || [];
    let updatedDeliveryNotifications = [...deliveryNotifications];
    
    for (const notif of ppicNotifications) {
      if (notif.status !== 'PENDING') {
        processedNotifications.push(notif);
        continue;
      }
      
      if (notif.type === 'SO_CREATED') {
        // Notification dari SO - jangan langsung PROCESSED, biarkan PENDING untuk ditampilkan di UI
        // User akan mark sebagai PROCESSED setelah create SPK
        processedNotifications.push(notif);
        continue;
      }
      
      if (notif.type === 'STOCK_READY' && notif.spkNo) {
        // Notification dari GRN - update SPK status dan trigger schedule delivery
        const spkItem = spk.find((s: any) => (s.spkNo || '').toString().trim() === (notif.spkNo || '').toString().trim());
        if (spkItem && spkItem.status === 'OPEN') {
          // Update SPK status to stock fulfilled
          const spkIndex = spk.findIndex((s: any) => (s.spkNo || '').toString().trim() === (notif.spkNo || '').toString().trim());
          if (spkIndex >= 0) {
            spk[spkIndex] = {
              ...spk[spkIndex],
              stockFulfilled: true,
            };
          }
          
          // Create delivery notification if not exists
          const existingDelNotif = updatedDeliveryNotifications.find((n: any) => 
            (n.spkNo || '').toString().trim() === (notif.spkNo || '').toString().trim()
          );
          
          if (!existingDelNotif) {
            const newDeliveryNotif = {
              id: `delivery-ppic-${Date.now()}-${notif.spkNo}`,
              type: 'READY_TO_SHIP',
              soNo: notif.soNo || '',
              spkNo: notif.spkNo,
              customer: notif.customer || '',
              product: notif.product || '',
              productId: notif.productId || '',
              qty: notif.qty || 0,
              status: 'PENDING',
              stockFulfilled: true,
              created: new Date().toISOString(),
            };
            updatedDeliveryNotifications.push(newDeliveryNotif);
          }
          
          updatedNotifications = true;
          processedNotifications.push({ ...notif, status: 'PROCESSED' });
          continue;
        }
      }
      
      processedNotifications.push(notif);
    }
    
    if (updatedNotifications) {
      await storageService.set('gt_ppicNotifications', processedNotifications);
      if (updatedDeliveryNotifications.length > deliveryNotifications.length) {
        await storageService.set('gt_deliveryNotifications', updatedDeliveryNotifications);
      }
    }
    
    // Auto-fulfill SPK dari stock jika stock product cukup (langsung ke delivery, tidak ada production)
    let hasAutoFulfilled = false;
    // Helper function untuk mendapatkan inventory product code (parent jika turunan)
    const getInventoryProductCodeForAutoFulfill = (productId: string, productsData: any[]): string => {
      if (!productId) return productId;
      
      // Cari product di master data
      const product = productsData.find((p: any) => {
        const pId = (p.product_id || p.kode || '').toString().trim();
        return pId === productId;
      });
      
      // Jika product adalah turunan, gunakan parent product code untuk cek inventory
      if (product && product.isTurunan && product.parentProductId) {
        const parentProduct = productsData.find((p: any) => p.id === product.parentProductId);
        if (parentProduct && parentProduct.kode) {
          return parentProduct.kode;
        }
      }
      
      // Jika bukan turunan atau parent tidak ditemukan, gunakan product code sendiri
      return productId;
    };

    const autoFulfilledSpkList = spk.map((s: any) => {
      if (s.status !== 'OPEN' || s.stockFulfilled) return s;
      
      const spkQty = parseFloat(s.qty || '0') || 0;
      if (spkQty <= 0) return s;
      
      const spkProductId = (s.product_id || s.productId || s.kode || '').toString().trim();
      if (!spkProductId) return s;
      
      // Get inventory product code (parent jika turunan)
      const inventoryProductCode = getInventoryProductCodeForAutoFulfill(spkProductId, productsData);
      
      const inventoryItem = inventoryData.find((inv: any) => {
        const invCode = (inv.codeItem || '').toString().trim();
        return invCode === inventoryProductCode;
      });
      
      if (!inventoryItem) return s;
      
      const availableStock = inventoryItem.nextStock !== undefined 
        ? (inventoryItem.nextStock || 0)
        : (
            (inventoryItem.stockPremonth || 0) + 
            (inventoryItem.receive || 0) - 
            (inventoryItem.outgoing || 0) + 
            (inventoryItem.return || 0)
          );
      
      if (availableStock >= spkQty) {
        hasAutoFulfilled = true;
        return {
          ...s,
          stockFulfilled: true,
        };
      }
      
      return s;
    });
    
    if (hasAutoFulfilled) {
      await storageService.set('gt_spk', autoFulfilledSpkList);
      spk = autoFulfilledSpkList;
    }
    
    setSpkData(spk);
    setScheduleData(schedule);
    setCustomers(customersData);
    setProducts(productsData);
    setSalesOrders(salesOrdersData);
    setInventory(inventoryData);
    setPurchaseOrders(purchaseOrdersData);
    setDeliveryNotes(deliveryNotesData);
    setPurchaseRequests(purchaseRequestsData);
    
    // Set pending SO notifications untuk ditampilkan di UI
    // IMPORTANT: Tampilkan SO_CREATED notifications yang PENDING ATAU yang belum ada SPK-nya
    
    // Filter: Tampilkan SO_CREATED yang PENDING, atau yang PROCESSED tapi belum semua items punya SPK
    // IMPORTANT: Cek per item, bukan per SO (karena 1 SO bisa punya banyak items, dan user bisa create SPK per item)
    const pendingSO = ppicNotifications.filter((n: any) => {
      if (n?.type !== 'SO_CREATED') return false;
      
      // Jika status PENDING, tampilkan
      if (n?.status === 'PENDING') {
        return true;
      }
      
      // Jika status PROCESSED, cek apakah SEMUA items di SO sudah punya SPK
      // Jika belum semua items punya SPK, tampilkan juga (untuk create SPK untuk items yang belum)
      if (n?.status === 'PROCESSED') {
        // Cari SO yang terkait dengan notifikasi ini
        const relatedSO = salesOrdersData.find((so: any) => 
          (so.soNo || '').toString().trim() === (n.soNo || '').toString().trim()
        );
        
        if (!relatedSO || !relatedSO.items || relatedSO.items.length === 0) {
          // SO tidak ditemukan atau tidak punya items, cek apakah ada SPK untuk SO ini
          const hasSPK = spk.some((s: any) => (s.soNo || '').toString().trim() === (n.soNo || '').toString().trim());
          if (!hasSPK) {
            return true; // Tampilkan jika belum ada SPK
          }
          return false; // Sudah ada SPK, jangan tampilkan
        }
        
        // Cek apakah semua items di SO sudah punya SPK
        // IMPORTANT: Cek per item, bukan per SO (karena 1 SO bisa punya banyak items)
        const allItemsHaveSPK = relatedSO.items.every((item: any) => {
          const itemProductId = (item.productId || item.productKode || '').toString().trim();
          const itemProductKode = (item.productKode || item.productId || '').toString().trim();
          
          if (!itemProductId && !itemProductKode) {
            console.warn(`[PPIC] Item ${item.productName} tidak punya productId/productKode, skip dari cek SPK`);
            return true; // Skip jika tidak punya productId
          }
          
          // Cek apakah ada SPK untuk item ini (match berdasarkan productId/productKode)
          const hasSPKForItem = spk.some((s: any) => {
            const spkSoNo = (s.soNo || '').toString().trim();
            const spkProductId = (s.product_id || s.productId || s.kode || '').toString().trim();
            const spkKode = (s.kode || s.product_id || s.productId || '').toString().trim();
            
            const soNoMatch = spkSoNo === (n.soNo || '').toString().trim();
            const productMatch = (itemProductId && (spkProductId === itemProductId || spkKode === itemProductId)) ||
                                 (itemProductKode && (spkProductId === itemProductKode || spkKode === itemProductKode));
            
            return soNoMatch && productMatch;
          });
          
          // Removed console.log for better performance
          
          return hasSPKForItem;
        });
        
        if (!allItemsHaveSPK) {
          return true; // Tampilkan jika belum semua items punya SPK
        }
        
        return false; // Semua items sudah punya SPK, jangan tampilkan
      }
      
      return false;
    });
    
    setPendingSONotifications(pendingSO);
    
    // Sync notifications dari schedule data (untuk memastikan semua batch punya notifikasi)
    await syncNotificationsFromSchedule(schedule, spk);
  };
  
  // Sync notifications dari schedule data (untuk memastikan semua batch punya notifikasi)
  const syncNotificationsFromSchedule = async (scheduleList: any[], spkDataFromStorage: any[]) => {
    try {
      const deliveryNotifications = await storageService.get<any[]>('gt_deliveryNotifications') || [];
      const newNotifications: any[] = [];
      
      // Helper function untuk match SPK
      const matchSPK = (spk1: string, spk2: string): boolean => {
        if (!spk1 || !spk2) return false;
        if (spk1 === spk2) return true;
        const normalize = (spk: string) => spk.replace(/-/g, '/');
        const normalized1 = normalize(spk1);
        const normalized2 = normalize(spk2);
        if (normalized1 === normalized2) return true;
        const parts1 = normalized1.split('/');
        const parts2 = normalized2.split('/');
        if (parts1.length < 3 || parts2.length < 3) {
          return normalized1 === normalized2;
        }
        const base1 = parts1.slice(0, 3).join('/');
        const base2 = parts2.slice(0, 3).join('/');
        return base1 === base2;
      };
      
      // Iterate semua schedule
      scheduleList.forEach((scheduleItem: any) => {
        const spkNo = scheduleItem.spkNo;
        if (!spkNo) return;
        
        const spkItem = spkDataFromStorage.find((s: any) => matchSPK(s.spkNo, spkNo));
        if (!spkItem) return;
        
        // Iterate setiap deliveryBatch untuk SPK ini
        const deliveryBatches = Array.isArray(scheduleItem.deliveryBatches) ? scheduleItem.deliveryBatches : [];
        
        // Filter hanya batch yang createSJ !== false
        const batchesForSJ = deliveryBatches.filter((b: any) => b && b.createSJ !== false);
        
        // IMPORTANT: Setiap batch harus punya sjGroupId yang UNIK
        let batchIndex = 0;
        batchesForSJ.forEach((batch: any) => {
          if (!batch) return;
          
          // Buat sjGroupId unik per batch jika tidak ada atau sama dengan batch sebelumnya
          let sjGroupId = batch?.sjGroupId;
          if (!sjGroupId || sjGroupId === 'no-group') {
            // Generate unique sjGroupId per batch (dengan timestamp + index untuk uniqueness)
            sjGroupId = `sj-group-${spkNo}-${Date.now()}-${batchIndex}-${Math.random().toString(36).substr(2, 4)}`;
          } else {
            // Pastikan sjGroupId unik dengan menambahkan batch index jika perlu
            const existingBatchWithSameGroup = batchesForSJ.slice(0, batchIndex).find((b: any) => b && b.sjGroupId === sjGroupId);
            if (existingBatchWithSameGroup) {
              // sjGroupId sudah digunakan oleh batch sebelumnya, buat yang baru
              sjGroupId = `${sjGroupId}-batch${batchIndex}`;
            }
          }
          
          // Cek apakah notification sudah ada untuk SPK ini DENGAN sjGroupId yang sama
          const existingNotif = deliveryNotifications.find((n: any) => {
            const notifSpkNo = (n.spkNo || '').toString().trim();
            const notifSjGroupId = n.sjGroupId || (n.deliveryBatches && n.deliveryBatches[0]?.sjGroupId) || null;
            const currentSjGroupId = sjGroupId !== 'no-group' ? sjGroupId : null;
            return matchSPK(notifSpkNo, spkNo) && notifSjGroupId === currentSjGroupId;
          });
          
          // Cek juga di newNotifications yang sudah dibuat dalam loop ini
          const existingInNew = newNotifications.find((n: any) => {
            const notifSpkNo = (n.spkNo || '').toString().trim();
            const notifSjGroupId = n.sjGroupId || (n.deliveryBatches && n.deliveryBatches[0]?.sjGroupId) || null;
            const currentSjGroupId = sjGroupId !== 'no-group' ? sjGroupId : null;
            return matchSPK(notifSpkNo, spkNo) && notifSjGroupId === currentSjGroupId;
          });
          
          if (existingNotif || existingInNew) {
            // Notifikasi sudah ada, skip
            batchIndex++;
            return;
          }
          
          // Create new notification
          const productId = (spkItem.product_id || spkItem.productId || spkItem.kode || '').toString().trim();
          const batchQty = parseFloat(batch.qty || spkItem.qty || '0') || 0;
          
          // Update batch dengan sjGroupId yang sudah di-generate
          const batchWithGroupId = {
            ...batch,
            sjGroupId: sjGroupId,
          };
          
          newNotifications.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            type: 'READY_TO_DELIVER',
            soNo: spkItem.soNo || '',
            customer: spkItem.customer || '',
            spkNo: spkNo,
            sjGroupId: sjGroupId !== 'no-group' ? sjGroupId : undefined,
            product: spkItem.product || '',
            productId: productId,
            qty: batchQty,
            deliveryBatches: [batchWithGroupId],
            status: 'PENDING',
            created: new Date().toISOString(),
            stockFulfilled: false,
          });
          
          batchIndex++;
        });
      });
      
      // Save notifications jika ada yang baru
      if (newNotifications.length > 0) {
        await storageService.set('gt_deliveryNotifications', [...deliveryNotifications, ...newNotifications]);
      }
    } catch (error) {
      // Silent fail
    }
  };

  // Group SPK by SO No
  const groupedSpkData = useMemo(() => {
    const grouped: { [key: string]: any[] } = {};
    spkData.forEach((spk: any) => {
      const soNo = spk.soNo || 'UNKNOWN';
      if (!grouped[soNo]) {
        grouped[soNo] = [];
      }
      grouped[soNo].push(spk);
    });
    return Object.entries(grouped).map(([soNo, spks]) => ({
      soNo,
      spks,
      customer: spks[0]?.customer || '',
      totalQty: spks.reduce((sum, s) => sum + (parseFloat(s.qty || '0') || 0), 0),
      status: spks.every((s: any) => s.status === 'CLOSE') ? 'CLOSE' : 'OPEN',
    }));
  }, [spkData]);

  // Filtered SPK data
  const filteredSpkData = useMemo(() => {
    let filtered = groupedSpkData;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((group: any) => 
        group.soNo.toLowerCase().includes(query) ||
        group.customer.toLowerCase().includes(query) ||
        group.spks.some((s: any) => 
          (s.spkNo || '').toLowerCase().includes(query) ||
          (s.product || '').toLowerCase().includes(query)
        )
      );
    }
    
    if (activeTab === 'outstanding') {
      filtered = filtered.filter((group: any) => group.status === 'OPEN');
    }
    
    return filtered.sort((a, b) => {
      const dateA = a.spks[0]?.created || '';
      const dateB = b.spks[0]?.created || '';
      return dateB.localeCompare(dateA);
    });
  }, [groupedSpkData, searchQuery, activeTab]);

  // Flatten SPK data untuk table view (Excel-like) - setiap SPK jadi row terpisah
  const flattenedSpkData = useMemo(() => {
    if (spkViewMode !== 'table') return [];
    
    const flattened: any[] = [];
    filteredSpkData.forEach((group: any) => {
      group.spks.forEach((spk: any) => {
        // Gunakan spkData terbaru untuk mendapatkan stockFulfilled yang sudah di-update
        const currentSpk = spkData.find((s: any) => 
          (s.spkNo || '').toString().trim() === (spk.spkNo || '').toString().trim()
        ) || spk;
        
        const schedule = scheduleData.find((s: any) => 
          (s.spkNo || '').toString().trim() === (spk.spkNo || '').toString().trim()
        );
        // GT: Cek hasSchedule berdasarkan deliveryBatches (bukan scheduleStartDate)
        const hasSchedule = !!(schedule && schedule.deliveryBatches && Array.isArray(schedule.deliveryBatches) && schedule.deliveryBatches.length > 0);
        const hasPR = purchaseRequests.some((pr: any) => 
          (pr.spkNo || '').toString().trim() === (spk.spkNo || '').toString().trim()
        );
        
        flattened.push({
          id: currentSpk.id || spk.id || `${group.soNo}-${spk.spkNo}`,
          soNo: group.soNo,
          customer: group.customer,
          spkNo: spk.spkNo || '-',
          productCode: spk.product_id || spk.kode || '-',
          product: spk.product || '-',
          qty: spk.qty || 0,
          unit: spk.unit || 'PCS',
          status: spk.status || 'OPEN',
          hasSchedule,
          hasPR,
          scheduleStartDate: schedule?.scheduleStartDate || schedule?.deliveryDate || '-',
          scheduleEndDate: schedule?.scheduleEndDate || '-',
          stockFulfilled: currentSpk.stockFulfilled || false,
          _group: group,
          _spk: currentSpk, // Gunakan currentSpk yang sudah ter-update
        });
      });
    });
    return flattened;
  }, [filteredSpkData, scheduleData, purchaseRequests, spkViewMode, spkData]);

  // Get row color based on SO No (dark theme selang-seling)
  const getRowColor = (soNo: string): string => {
    const uniqueSOs = Array.from(new Set(filteredSpkData.map((g: any) => g.soNo)));
    const soIndex = uniqueSOs.indexOf(soNo);
    const rowColors = ['#1b1b1b', '#2f2f2f'];
    const index = soIndex >= 0 ? soIndex : 0;
    return rowColors[index % rowColors.length];
  };

  // Filtered Schedule data
  const filteredScheduleData = useMemo(() => {
    let filtered = scheduleData;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((s: any) => 
        (s.spkNo || '').toLowerCase().includes(query) ||
        (s.soNo || '').toLowerCase().includes(query)
      );
    }
    
    return filtered.sort((a, b) => {
      const dateA = a.created || '';
      const dateB = b.created || '';
      return dateB.localeCompare(dateA);
    });
  }, [scheduleData, searchQuery]);

  // Handle Create SPK from SO
  const handleCreateSPKFromSO = async (so: any) => {
    if (!so || !so.items || so.items.length === 0) {
      showAlert('SO tidak memiliki items', 'Error');
      return;
    }
    
    // Filter items yang dipilih untuk create SPK
    const itemsToCreate = so.items.filter((item: any, idx: number) => {
      const itemId = item.id || `${so.soNo}-${idx}`;
      return selectedItemsForSPK[itemId] === true;
    });
    
    if (itemsToCreate.length === 0) {
      showAlert('Silakan pilih minimal 1 product untuk dibuat SPK', 'Warning');
      return;
    }
    
    try {
      const existingSpk = extractStorageValue(await storageService.get<any[]>('gt_spk')) || [];
      const newSPKs: any[] = [];
      
      for (const item of itemsToCreate) {
        if (!item.productId && !item.productKode) continue;
        
        // Check if SPK already exists for this SO and product
        const existingSPK = existingSpk.find((s: any) => 
          s.soNo === so.soNo && 
          (s.product_id === item.productId || s.product_id === item.productKode || s.kode === item.productKode)
        );
        
        if (existingSPK) {
          continue;
        }
        
        // Generate SPK No
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = String(now.getFullYear()).slice(-2);
        const generateRandomCode = () => {
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          let code = '';
          for (let i = 0; i < 5; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return code;
        };
        
        let spkNo = '';
        let isUnique = false;
        while (!isUnique) {
          const randomCode = generateRandomCode();
          spkNo = `SPK/${year}${month}${day}/${randomCode}`;
          isUnique = !existingSpk.some((s: any) => s.spkNo === spkNo);
        }
        
        // Debug: Log SO item data
        // Removed console.log for better performance
        
        const spkQty = Number(item.qty) || 0;
        if (!spkQty || spkQty <= 0) {
          showAlert(`Error: Qty tidak valid untuk product ${item.productName || item.productId} (${item.qty}). Silakan cek data SO.`, 'Error');
          continue;
        }
        
        const newSPK = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          spkNo: spkNo,
          soNo: so.soNo || '',
          customer: so.customer || '',
          product: item.productName || '',
          product_id: item.productId || item.productKode || '',
          kode: item.productKode || item.productId || '',
          qty: spkQty,
          unit: item.unit || 'PCS',
          status: 'OPEN',
          created: new Date().toISOString(),
          notes: item.specNote || so.globalSpecNote || '',
        };
        
        // Removed console.log for better performance
        newSPKs.push(newSPK);
      }
      
      if (newSPKs.length === 0) {
        showAlert(`Tidak ada product yang bisa dibuat SPK untuk SO ${so.soNo}.`, 'Warning');
        return;
      }
      
      // Save SPKs
      const currentSPKs = await storageService.get<any[]>('gt_spk') || [];
      const updatedSPKs = [...currentSPKs, ...newSPKs];
      await storageService.set('gt_spk', updatedSPKs);
      setSpkData(updatedSPKs);
      
      // Mark notification as PROCESSED hanya jika semua items sudah dibuat SPK
      // IMPORTANT: Gunakan updatedSPKs (yang sudah include SPK baru) untuk cek apakah semua items punya SPK
      try {
        // Gabungkan existing SPK dengan SPK baru untuk cek lengkap
        const allSPKsForSO = [...existingSpk, ...newSPKs];
        
        const allItemsHaveSPK = so.items.every((item: any) => {
          const itemProductId = (item.productId || item.productKode || '').toString().trim();
          if (!itemProductId) {
            console.warn(`[PPIC] Item ${item.productName} tidak punya productId/productKode, skip dari cek SPK`);
            return true; // Skip jika tidak punya productId
          }
          
          // Cek apakah ada SPK untuk item ini (match berdasarkan productId/productKode)
          const hasSPKForItem = allSPKsForSO.some((s: any) => {
            const spkSoNo = (s.soNo || '').toString().trim();
            const spkProductId = (s.product_id || s.productId || s.kode || '').toString().trim();
            const soNoMatch = spkSoNo === (so.soNo || '').toString().trim();
            const productMatch = spkProductId === itemProductId || 
                                 spkProductId === (item.productKode || '').toString().trim() ||
                                 (s.kode || '').toString().trim() === (item.productKode || '').toString().trim();
            return soNoMatch && productMatch;
          });
          
          if (!hasSPKForItem) {
            // Removed console.log for better performance
          }
          
          return hasSPKForItem;
        });
        
        // Removed console.log for better performance
        
        if (allItemsHaveSPK) {
          const ppicNotifications = await storageService.get<any[]>('gt_ppicNotifications') || [];
          const updatedNotifications = ppicNotifications.map((n: any) => 
            n.soNo === so.soNo && n.type === 'SO_CREATED' && n.status === 'PENDING'
              ? { ...n, status: 'PROCESSED', processedAt: new Date().toISOString() }
              : n
          );
          await storageService.set('gt_ppicNotifications', updatedNotifications);
          // Removed console.log for better performance
        } else {
          // Removed console.log for better performance
        }
      } catch (error: any) {
      }
      
      // Reset selected items
      setSelectedItemsForSPK({});
      showAlert(`SPK berhasil dibuat untuk SO ${so.soNo}:\n\n${newSPKs.map(s => `• ${s.spkNo} - ${s.product} (${s.qty} ${s.unit})`).join('\n')}`, 'Success');
      setViewingSO(null);
      loadData();
    } catch (error: any) {
      showAlert(`Error creating SPK: ${error.message}`, 'Error');
    }
  };

  // Handle Check Inventory and Create PR if needed
  // Helper function untuk mendapatkan inventory product code (parent jika turunan)
  const getInventoryProductCode = (productId: string): string => {
    if (!productId) return productId;
    
    // Cari product di master data
    const product = products.find((p: any) => {
      const pId = (p.product_id || p.kode || '').toString().trim();
      return pId === productId;
    });
    
    // Jika product adalah turunan, gunakan parent product code untuk cek inventory
    if (product && product.isTurunan && product.parentProductId) {
      const parentProduct = products.find((p: any) => p.id === product.parentProductId);
      if (parentProduct && parentProduct.kode) {
        // Removed console.log for better performance
        return parentProduct.kode;
      }
    }
    
    // Jika bukan turunan atau parent tidak ditemukan, gunakan product code sendiri
    return productId;
  };

  const handleCheckInventoryAndCreatePR = async (spk: any) => {
    try {
      const spkNo = (spk.spkNo || '').toString().trim();
      const productId = (spk.product_id || spk.productId || spk.kode || '').toString().trim();
      
      if (!productId) {
        showAlert('Product ID tidak ditemukan di SPK', 'Error');
        return;
      }
      
      // Get inventory product code (parent jika turunan)
      const inventoryProductCode = getInventoryProductCode(productId);
      
      // Check inventory menggunakan parent product code jika turunan
      const inventoryItem = inventory.find((inv: any) => {
        const invCode = (inv.codeItem || '').toString().trim();
        return invCode === inventoryProductCode;
      });
      
      const availableStock = inventoryItem 
        ? (inventoryItem.nextStock !== undefined 
            ? (inventoryItem.nextStock || 0)
            : (
                (inventoryItem.stockPremonth || 0) + 
                (inventoryItem.receive || 0) - 
                (inventoryItem.outgoing || 0) + 
                (inventoryItem.return || 0)
              ))
        : 0;
      
      // Removed console.log for better performance
      
      const requiredQty = parseFloat(spk.qty || '0') || 0;
      
      // Debug: Validate requiredQty
      if (!requiredQty || requiredQty <= 0) {
        showAlert(`Error: Qty SPK tidak valid (${requiredQty}). Silakan cek data SPK.`, 'Error');
        return;
      }
      
      if (availableStock >= requiredQty) {
        // Update SPK stockFulfilled status
        const updatedSpkData = spkData.map((s: any) => {
          if ((s.spkNo || '').toString().trim() === spkNo) {
            return { ...s, stockFulfilled: true };
          }
          return s;
        });
        await storageService.set('gt_spk', updatedSpkData);
        setSpkData(updatedSpkData);
        
        showAlert(`Stock cukup untuk SPK ${spkNo}!\n\nAvailable: ${availableStock}\nRequired: ${requiredQty}\n\nTidak perlu membuat PR.`, 'Information');
        loadData();
        return;
      }
      
      // Check if PR already exists
      const existingPR = purchaseRequests.find((pr: any) => 
        (pr.spkNo || '').toString().trim() === spkNo
      );
      
      if (existingPR) {
        showAlert(`PR untuk SPK ${spkNo} sudah ada!\n\nPR No: ${existingPR.prNo}\nStatus: ${existingPR.status}`, 'Information');
        return;
      }
      
      // Create PR
      setCreatingPR(prev => ({ ...prev, [spkNo]: true }));
      
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);
      const generateRandomCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 5; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };
      
      const existingPRs = await storageService.get<any[]>('gt_purchaseRequests') || [];
      let prNo = '';
      let isUnique = false;
      while (!isUnique) {
        const randomCode = generateRandomCode();
        prNo = `PR/${year}${month}${day}/${randomCode}`;
        isUnique = !existingPRs.some((pr: any) => pr.prNo === prNo);
      }
      
      const product = products.find((p: any) => 
        (p.product_id || p.kode || '').toString().trim() === productId
      );
      
      // Enrich customer data dari master
      const customerData = customers.find((c: any) => 
        (c.nama || '').toLowerCase() === (spk.customer || '').toLowerCase()
      );
      
      // Cek apakah sudah ada PO untuk product ini
      const relatedPOs = purchaseOrders.filter((po: any) => 
        (po.productId || po.productKode || '').toString().trim() === productId &&
        po.status !== 'CANCELLED'
      );
      
      // Track customer delivery history (for future use)
      // const customerDeliveries = deliveryNotes.filter((dn: any) => 
      //   (dn.customer || '').toLowerCase() === (spk.customer || '').toLowerCase()
      // );
      
      const shortageQty = requiredQty - availableStock;
      
      // Removed console.log for better performance
      
      const newPR = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        prNo: prNo,
        spkNo: spkNo,
        soNo: spk.soNo || '',
        customer: spk.customer || '',
        customerCode: customerData?.kode || '',
        product: spk.product || product?.nama || '',
        productId: productId,
        items: [{
          productId: productId,
          productKode: productId,
          productName: spk.product || product?.nama || '',
          supplier: '', // Akan dipilih di Purchasing
          qty: shortageQty, // Qty yang perlu dibeli (shortage)
          unit: spk.unit || 'PCS',
          price: product?.hargaSales || product?.hargaFg || 0,
          requiredQty: requiredQty, // Qty yang dibutuhkan dari SPK
          availableStock: availableStock, // Stock yang tersedia
          shortageQty: shortageQty, // Qty yang kurang (required - available)
        }],
        status: 'PENDING',
        created: new Date().toISOString(),
        relatedPOs: relatedPOs.map((po: any) => po.poNo), // Track related POs
      };
      
      // Removed console.log for better performance
      
      const updatedPRs = [...purchaseRequests, newPR];
      await storageService.set('gt_purchaseRequests', updatedPRs);
      setPurchaseRequests(updatedPRs);
      
      // Send notification to Purchasing
      try {
        const purchasingNotifications = await storageService.get<any[]>('gt_purchasingNotifications') || [];
        const existingNotif = purchasingNotifications.find((n: any) => n.prNo === prNo);
        
        if (!existingNotif) {
          const newPurchasingNotification = {
            id: `purchasing-${Date.now()}-${prNo}`,
            type: 'PR_CREATED',
            prNo: prNo,
            spkNo: spkNo,
            soNo: spk.soNo || '',
            customer: spk.customer || '',
            product: spk.product || product?.nama || '',
            productId: productId,
            qty: shortageQty,
            unit: spk.unit || 'PCS',
            status: 'PENDING',
            created: new Date().toISOString(),
          };
          await storageService.set('gt_purchasingNotifications', [...purchasingNotifications, newPurchasingNotification]);
        }
      } catch (error: any) {
      }
      
      setCreatingPR(prev => ({ ...prev, [spkNo]: false }));
      showAlert(`PR berhasil dibuat untuk SPK ${spkNo}!\n\nPR No: ${prNo}\nProduct: ${spk.product}\nShortage Qty: ${shortageQty} ${spk.unit}\n\n📧 Notification sent to Purchasing`, 'Success');
      loadData();
    } catch (error: any) {
      setCreatingPR(prev => ({ ...prev, [spk.spkNo]: false }));
      showAlert(`Error creating PR: ${error.message}`, 'Error');
    }
  };

  // Handle Save Delivery Schedule
  const handleSaveDeliverySchedule = async (data: { spkDeliveries: { spkNo: string; deliveryBatches: any[] }[] }) => {
    try {
      if (!data.spkDeliveries || data.spkDeliveries.length === 0) {
        showAlert('Tidak ada delivery schedule yang disimpan', 'Warning');
        return;
      }
      
      // Validasi: Cek apakah ada SPK yang sudah punya schedule
      const spksWithSchedule: string[] = [];
      for (const spkDelivery of data.spkDeliveries) {
        const spkNo = (spkDelivery.spkNo || '').toString().trim();
        if (!spkNo) continue;
        
        const existingSchedule = scheduleData.find((s: any) => 
          (s.spkNo || '').toString().trim() === spkNo
        );
        
        if (existingSchedule) {
          spksWithSchedule.push(spkNo);
        }
      }
      
      // Jika ada SPK yang sudah punya schedule, tampilkan konfirmasi untuk update
      if (spksWithSchedule.length > 0) {
        const confirmMessage = `SPK berikut sudah memiliki delivery schedule:\n\n${spksWithSchedule.map(spk => `- ${spk}`).join('\n')}\n\nApakah Anda ingin mengupdate schedule yang sudah ada?`;
        
        showConfirm(
          'Schedule Already Exists',
          confirmMessage,
          async () => {
            // User confirm untuk update - lanjutkan proses save
            await proceedSaveDeliverySchedule(data);
          },
          () => {
            // User cancel - tidak update
            setSelectedDeliveryItem(null);
          }
        );
        return;
      }
      
      // Jika tidak ada yang sudah punya schedule, langsung save
      await proceedSaveDeliverySchedule(data);
    } catch (error: any) {
      showAlert(`Error saving delivery schedule: ${error.message}`, 'Error');
    }
  };
  
  // Helper function untuk proceed save delivery schedule
  const proceedSaveDeliverySchedule = async (data: { spkDeliveries: { spkNo: string; deliveryBatches: any[] }[] }) => {
    let updated = [...scheduleData];
    const deliveryNotifications = await storageService.get<any[]>('gt_deliveryNotifications') || [];
    let newNotifications: any[] = [];
    
    for (const spkDelivery of data.spkDeliveries) {
      const spkNo = (spkDelivery.spkNo || '').toString().trim();
      if (!spkNo) continue;
      
      const existingSchedule = scheduleData.find((s: any) => 
        (s.spkNo || '').toString().trim() === spkNo
      );
      
      const spkItem = spkData.find((s: any) => (s.spkNo || '').toString().trim() === spkNo);
      if (!spkItem) continue;
      
      // Get first delivery batch date or use current date
      const firstBatch = spkDelivery.deliveryBatches && spkDelivery.deliveryBatches.length > 0
        ? spkDelivery.deliveryBatches[0]
        : null;
      
      const scheduleItem = {
        id: existingSchedule?.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
        spkNo: spkNo,
        soNo: spkItem.soNo || '',
        deliveryDate: firstBatch?.deliveryDate 
          ? new Date(firstBatch.deliveryDate).toISOString() 
          : new Date().toISOString(),
        deliveryBatches: spkDelivery.deliveryBatches || [],
        created: existingSchedule?.created || new Date().toISOString(),
        updated: new Date().toISOString(),
      };
      
      // Remove existing schedule for this SPK
      updated = updated.filter((s: any) => (s.spkNo || '').toString().trim() !== spkNo);
      updated.push(scheduleItem);
      
      // Create delivery notification untuk setiap batch (per sjGroupId)
      // IMPORTANT: Setiap batch dengan sjGroupId berbeda harus punya notifikasi sendiri
      const deliveryBatches = spkDelivery.deliveryBatches || [];
      const productId = (spkItem.product_id || spkItem.productId || spkItem.kode || '').toString().trim();
      
      // Cek stock sekali untuk semua batch
      const inventoryProductCode = getInventoryProductCode(productId);
      const inventoryItem = inventory.find((inv: any) => {
        const invCode = (inv.codeItem || '').toString().trim();
        return invCode === inventoryProductCode;
      });
      
      const availableStock = inventoryItem 
        ? (inventoryItem.nextStock !== undefined 
            ? (inventoryItem.nextStock || 0)
            : (
                (inventoryItem.stockPremonth || 0) + 
                (inventoryItem.receive || 0) - 
                (inventoryItem.outgoing || 0) + 
                (inventoryItem.return || 0)
              ))
        : 0;
      
      // Loop setiap batch dan buat notifikasi per batch
      // IMPORTANT: Setiap batch harus punya sjGroupId yang UNIK untuk memastikan notifikasi terpisah
      // Jika batch tidak punya sjGroupId atau sjGroupId sama, buat sjGroupId unik per batch
      // IMPORTANT: Hanya buat notifikasi untuk batch yang createSJ !== false
      const batchesForSJ = deliveryBatches.filter((b: any) => b && b.createSJ !== false);
      let batchIndex = 0;
      for (const batch of batchesForSJ) {
        if (!batch) continue; // Skip batch yang null/undefined
        
        // Buat sjGroupId unik per batch jika tidak ada atau sama dengan batch sebelumnya
        let sjGroupId = batch.sjGroupId;
        if (!sjGroupId || sjGroupId === 'no-group') {
          // Generate unique sjGroupId per batch (dengan timestamp + index untuk uniqueness)
          sjGroupId = `sj-group-${spkNo}-${Date.now()}-${batchIndex}-${Math.random().toString(36).substr(2, 4)}`;
        } else {
          // Pastikan sjGroupId unik dengan menambahkan batch index jika perlu
          const existingBatchWithSameGroup = deliveryBatches.slice(0, batchIndex).find((b: any) => b && b.sjGroupId === sjGroupId);
          if (existingBatchWithSameGroup) {
            // sjGroupId sudah digunakan oleh batch sebelumnya, buat yang baru
            sjGroupId = `${sjGroupId}-batch${batchIndex}`;
          }
        }
        
        const batchQty = parseFloat(batch.qty || spkItem.qty || '0') || 0;
        
        // Cek apakah notifikasi sudah ada untuk SPK ini dengan sjGroupId yang sama
        const existingNotif = deliveryNotifications.find((n: any) => {
          const notifSpkNo = (n.spkNo || '').toString().trim();
          const notifSjGroupId = n.sjGroupId || (n.deliveryBatches && n.deliveryBatches[0]?.sjGroupId) || null;
          return notifSpkNo === spkNo && notifSjGroupId === sjGroupId;
        });
        
        // Cek juga di newNotifications yang sudah dibuat dalam loop ini
        const existingInNew = newNotifications.find((n: any) => {
          const notifSpkNo = (n.spkNo || '').toString().trim();
          const notifSjGroupId = n.sjGroupId || (n.deliveryBatches && n.deliveryBatches[0]?.sjGroupId) || null;
          return notifSpkNo === spkNo && notifSjGroupId === sjGroupId;
        });
        
        if (existingNotif || existingInNew) {
          // Notifikasi sudah ada, skip
          batchIndex++;
          continue;
        }
        
        const stockFulfilled = availableStock >= batchQty;
        
        // Update SPK stockFulfilled status (hanya sekali, untuk semua batch)
        if (stockFulfilled && batchIndex === 0) {
          const updatedSpkData = spkData.map((s: any) => {
            if ((s.spkNo || '').toString().trim() === spkNo) {
              return { ...s, stockFulfilled: true };
            }
            return s;
          });
          await storageService.set('gt_spk', updatedSpkData);
          setSpkData(updatedSpkData);
        }
        
        // Update batch dengan sjGroupId yang sudah di-generate
        const batchWithGroupId = {
          ...batch,
          sjGroupId: sjGroupId,
        };
        
        const newNotification = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          type: 'READY_TO_DELIVER',
          soNo: spkItem.soNo || '',
          customer: spkItem.customer || '',
          spkNo: spkNo,
          sjGroupId: sjGroupId,
          product: spkItem.product || '',
          productId: productId,
          qty: batchQty,
          deliveryBatches: [batchWithGroupId], // Hanya batch ini untuk notifikasi ini
          status: 'PENDING', // IMPORTANT: Tetap PENDING meskipun stock fulfilled, karena belum dibuat delivery note
          created: new Date().toISOString(),
          stockFulfilled: stockFulfilled,
        };
        newNotifications.push(newNotification);
        
        batchIndex++;
      }
    }
    
    await storageService.set('gt_schedule', updated);
    setScheduleData(updated);
    
    if (newNotifications.length > 0) {
      await storageService.set('gt_deliveryNotifications', [...deliveryNotifications, ...newNotifications]);
      showAlert(`Delivery schedule saved successfully untuk ${data.spkDeliveries.length} SPK(s)\n\n📧 ${newNotifications.length} notification(s) sent to Delivery Note\n\n💡 Stock akan dicek saat create Delivery Note.`, 'Success');
    } else {
      showAlert(`Delivery schedule saved untuk ${data.spkDeliveries.length} SPK(s)`, 'Success');
    }
    
    setSelectedDeliveryItem(null);
    loadData();
  };

  const handleDeleteSPK = async (spk: any) => {
    if (!spk || !spk.id) {
      showAlert('SPK tidak valid. Mohon coba lagi.', 'Error');
      return;
    }

    const spkNo = spk.spkNo || spk.id;
    
    // Check if SPK has related data (schedule, delivery, etc.)
    try {
      const [scheduleListRaw, deliveryListRaw] = await Promise.all([
        storageService.get<any[]>('gt_schedule'),
        storageService.get<any[]>('gt_delivery'),
      ]);

      const scheduleList = scheduleListRaw || [];
      const deliveryList = deliveryListRaw || [];

      const hasSchedule = scheduleList.some((s: any) => s.spkNo === spkNo);
      const hasDelivery = deliveryList.some((dn: any) => 
        dn.spkNo === spkNo || (dn.items || []).some((itm: any) => itm.spkNo === spkNo)
      );

      if (hasSchedule || hasDelivery) {
        const reasons: string[] = [];
        if (hasSchedule) reasons.push('Schedule data');
        if (hasDelivery) reasons.push('Delivery Note data');
        
        showAlert(
          `Tidak bisa menghapus SPK ${spkNo} karena masih memiliki data turunan:\n\n${reasons.map(r => `• ${r}`).join('\n')}\n\nSilakan bersihkan data turunan tersebut terlebih dahulu.`,
          'Cannot Delete SPK'
        );
        return;
      }

      // Show confirmation dialog
      showConfirm(
        'Delete SPK',
        `Hapus SPK ${spkNo}?\n\nTindakan ini akan:\n• Menghapus SPK dari daftar\n• Menghapus notifikasi terkait\n\nPastikan tidak ada proses lanjutan untuk SPK ini.`,
        async () => {
          try {
            // Use tombstone pattern untuk prevent data resurrection dari sync
            const success = await safeDeleteItem('gt_spk', spk.id, 'id');
            if (!success) {
              showAlert('Gagal menghapus SPK. Silakan coba lagi.', 'Error');
              return;
            }
            
            // Reload SPK data dengan filter active items (after tombstone deletion)
            await loadData();
            
            showAlert(`SPK ${spkNo} berhasil dihapus.`, 'Success');
          } catch (error: any) {
            showAlert(`Error deleting SPK: ${error.message}`, 'Error');
          }
        },
      );
    } catch (error: any) {
      showAlert(`Error checking SPK dependencies: ${error.message}`, 'Error');
    }
  };

  // Format date
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr || '-';
    }
  };

  // SPK Columns
  const spkColumns = [
    {
      key: 'soNo',
      header: 'SO No',
      render: (group: any) => (
        <strong style={{ color: '#2e7d32', whiteSpace: 'nowrap' }}>{group.soNo}</strong>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (group: any) => <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '200px' }}>{group.customer}</span>,
    },
    {
      key: 'spks',
      header: 'SPKs & Actions',
      render: (group: any) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {group.spks.map((spk: any, idx: number) => {
            // Cek apakah delivery schedule sudah dibuat untuk SPK ini
            // GT: Cek hasSchedule berdasarkan deliveryBatches (bukan hanya existence)
            const schedule = scheduleData.find((s: any) => 
              (s.spkNo || '').toString().trim() === (spk.spkNo || '').toString().trim()
            );
            const hasSchedule = !!(schedule && schedule.deliveryBatches && Array.isArray(schedule.deliveryBatches) && schedule.deliveryBatches.length > 0);
            
            // Cek apakah PR sudah dibuat untuk SPK ini
            const hasPR = purchaseRequests.some((pr: any) => 
              (pr.spkNo || '').toString().trim() === (spk.spkNo || '').toString().trim()
            );
            
            // Cek apakah sudah ada delivery note untuk SPK ini
            const relatedDelivery = deliveryNotes.find((dn: any) => {
              if (!dn.items || !Array.isArray(dn.items)) return false;
              return dn.items.some((item: any) => 
                (item.spkNo || '').toString().trim() === (spk.spkNo || '').toString().trim()
              );
            });
            const hasDelivery = !!relatedDelivery;
            
            return (
              <div 
                key={spk.id} 
                style={{ 
                  display: 'grid',
                  gridTemplateColumns: '110px 1fr auto',
                  gap: '6px',
                  alignItems: 'center',
                  padding: '6px 8px',
                  backgroundColor: idx % 2 === 0 ? 'var(--bg-secondary)' : 'transparent',
                  fontSize: '12px',
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                {/* SPK No */}
                <div style={{ fontWeight: '600', color: 'var(--primary)', minWidth: '0', maxWidth: '110px', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                  <span title={spk.spkNo} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{spk.spkNo}</span>
                  {hasPR && (
                    <span style={{ fontSize: '14px', color: '#4caf50', fontWeight: '600' }} title="PR Created">
                      ✓
                    </span>
                  )}
                  {hasSchedule && (
                    <span style={{ fontSize: '14px', color: '#2196F3', fontWeight: '600' }} title="Schedule Created">
                      ✓
                    </span>
                  )}
                </div>
                
                {/* Product Info */}
                <div style={{ color: 'var(--text-primary)' }}>
                  <div>{spk.product}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                    <span>{spk.qty} {spk.unit}</span>
                    <span className={`status-badge status-${spk.status?.toLowerCase() || 'open'}`} style={{ fontSize: '10px' }}>
                      {spk.status || 'OPEN'}
                    </span>
                    {spk.stockFulfilled && (
                      <span style={{ fontSize: '10px', color: '#4caf50', fontWeight: '500' }}>
                        ✓ Stock Ready
                      </span>
                    )}
                    {hasPR && (
                      <span style={{ fontSize: '10px', color: '#4caf50', fontWeight: '500' }}>
                        ✓ PR Created
                      </span>
                    )}
                    {hasSchedule && (
                      <span style={{ fontSize: '10px', color: '#2196F3', fontWeight: '500' }}>
                        ✓ Schedule
                      </span>
                    )}
                    {hasDelivery && (
                      <span style={{ fontSize: '10px', color: '#ff9800', fontWeight: '500' }}>
                        ✓ Delivery
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Action Menu */}
                {spk.status === 'OPEN' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <SPKActionMenu
                      onCheckCreatePR={() => handleCheckInventoryAndCreatePR(spk)}
                      onScheduleDelivery={() => {
                        setSelectedDeliveryItem({
                          soNo: spk.soNo || '',
                          customer: spk.customer || '',
                          spks: [{
                            spkNo: spk.spkNo || '',
                            soNo: spk.soNo || '',
                            product: spk.product || '',
                            productId: spk.product_id || spk.kode || '',
                            qty: parseFloat(spk.qty || '0') || 0,
                            productionBatches: [],
                            deliveryBatches: [],
                          }],
                        });
                      }}
                      hasSchedule={hasSchedule}
                      hasPR={hasPR}
                      isCreatingPR={creatingPR[spk.spkNo]}
                    />
                  </div>
                )}
                {spk.status !== 'OPEN' && (
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    {spk.status}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ),
    },
  ];

  // Columns untuk table view (Excel-like) - menggunakan flattened data
  const spkTableColumns = [
    { 
      key: 'soNo', 
      header: 'SO No',
      render: (item: any) => (
        <strong style={{ color: '#2e7d32', fontSize: '13px' }}>{item.soNo}</strong>
      ),
    },
    { 
      key: 'customer', 
      header: 'Customer',
      render: (item: any) => {
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        const color = theme === 'light' ? '#000000' : '#ffffff';
        return (
          <span style={{ fontSize: '13px', color }}>{item.customer}</span>
        );
      },
    },
    {
      key: 'spkNo',
      header: 'SPK No',
      render: (item: any) => (
        <strong style={{ fontSize: '13px', color: 'var(--primary)' }}>{item.spkNo}</strong>
      ),
    },
    {
      key: 'productCode',
      header: 'Product Code',
      render: (item: any) => (
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.productCode}</span>
      ),
    },
    {
      key: 'product',
      header: 'Product',
      render: (item: any) => (
        <span style={{ fontSize: '13px' }}>{item.product}</span>
      ),
    },
    {
      key: 'qty',
      header: 'Qty',
      render: (item: any) => (
        <span style={{ fontSize: '13px', textAlign: 'right', display: 'block' }}>
          {Number(item.qty || 0).toLocaleString('id-ID')} {item.unit}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => (
        <span className={`status-badge status-${item.status.toLowerCase()}`}>
          {item.status}
        </span>
      ),
    },
    {
      key: 'hasSchedule',
      header: 'Schedule',
      render: (item: any) => (
        <span style={{ fontSize: '12px', color: item.hasSchedule ? '#2196F3' : 'var(--text-secondary)' }}>
          {item.hasSchedule ? '✓' : '-'}
        </span>
      ),
    },
    {
      key: 'hasPR',
      header: 'PR',
      render: (item: any) => (
        <span style={{ fontSize: '12px', color: item.hasPR ? '#4caf50' : 'var(--text-secondary)' }}>
          {item.hasPR ? '✓' : '-'}
        </span>
      ),
    },
    {
      key: 'stockFulfilled',
      header: 'Stock',
      render: (item: any) => (
        <span style={{ fontSize: '12px', color: item.stockFulfilled ? '#4caf50' : 'var(--text-secondary)' }}>
          {item.stockFulfilled ? '✓' : '-'}
        </span>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      render: (item: any) => {
        const createdDate = item.created || item._spk?.created;
        if (!createdDate) return <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>-</span>;
        try {
          const date = new Date(createdDate);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const seconds = String(date.getSeconds()).padStart(2, '0');
          return (
            <div style={{ fontSize: '12px' }}>
              <div style={{ fontWeight: '500' }}>{day}/{month}/{year}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{hours}:{minutes}:{seconds}</div>
            </div>
          );
        } catch {
          return <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>-</span>;
        }
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: any) => (
        <SPKActionMenu
          onCheckCreatePR={() => handleCheckInventoryAndCreatePR(item._spk)}
          onScheduleDelivery={() => {
            setSelectedDeliveryItem({
              soNo: item.soNo || '',
              customer: item.customer || '',
              spks: [{
                spkNo: item.spkNo || '',
                soNo: item.soNo || '',
                product: item.product || '',
                productId: item.productCode || '',
                qty: item.qty || 0,
                productionBatches: [],
                deliveryBatches: [],
              }],
            });
          }}
          onDelete={() => handleDeleteSPK(item._spk)}
          hasSchedule={item.hasSchedule}
          hasPR={item.hasPR}
          isCreatingPR={creatingPR[item.spkNo]}
        />
      ),
    },
  ];

  // Schedule Columns
  const scheduleColumns = [
    {
      key: 'spkNo',
      header: 'SPK No',
      render: (item: any) => <strong style={{ color: '#2e7d32' }}>{item.spkNo}</strong>,
    },
    {
      key: 'soNo',
      header: 'SO No',
      render: (item: any) => <span>{item.soNo}</span>,
    },
    {
      key: 'deliveryDate',
      header: 'Delivery Date',
      render: (item: any) => <span>{formatDate(item.deliveryDate)}</span>,
    },
    {
      key: 'batches',
      header: 'Batches',
      render: (item: any) => (
        <div>
          {item.deliveryBatches && item.deliveryBatches.length > 0 ? (
            item.deliveryBatches.map((batch: any, idx: number) => (
              <div key={idx} style={{ fontSize: '12px' }}>
                Batch {batch.batchNo}: {batch.qty} PCS - {formatDate(batch.deliveryDate)}
              </div>
            ))
          ) : (
            <span style={{ color: 'var(--text-secondary)' }}>No batches</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: any) => (
        <Button
          variant="secondary"
          onClick={() => {
            const spk = spkData.find((s: any) => (s.spkNo || '').toString().trim() === (item.spkNo || '').toString().trim());
            if (spk) {
              setSelectedDeliveryItem({
                soNo: spk.soNo || '',
                customer: spk.customer || '',
                spks: [{
                  spkNo: spk.spkNo || '',
                  soNo: spk.soNo || '',
                  product: spk.product || '',
                  productId: spk.product_id || spk.kode || '',
                  qty: parseFloat(spk.qty || '0') || 0,
                  productionBatches: [],
                  deliveryBatches: item.deliveryBatches || [],
                }],
              });
            }
          }}
          style={{ fontSize: '11px', padding: '4px 8px' }}
        >
          Edit Schedule
        </Button>
      ),
    },
  ];

  return (
    <div className="module-compact">
      <div className="page-header">
        <h1>PPIC - Production Planning & Inventory Control</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {pendingSONotifications.length > 0 && (
            <NotificationBell
              notifications={soNotifications}
              onNotificationClick={(notification) => {
                if (notification.so) {
                  setViewingSO(notification.so);
                } else {
                  const so = salesOrders.find((s: any) => s.soNo === notification.title.replace('SO ', ''));
                  if (so) {
                    setViewingSO(so);
                  } else {
                    showAlert(`SO tidak ditemukan.`, 'Error');
                  }
                }
              }}
              icon="📋"
              emptyMessage="Tidak ada Sales Order yang perlu diproses"
            />
          )}
        </div>
      </div>

      {/* Tabs */}
      <Card style={{ width: '100%', overflow: 'visible', maxWidth: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px', padding: '0 20px' }}>
          <div className="tab-container" style={{ marginBottom: 0, flex: '1 1 auto', padding: 0 }}>
            <button
              className={`tab-button ${activeTab === 'spk' ? 'active' : ''}`}
              onClick={() => setActiveTab('spk')}
            >
              SPK ({(Array.isArray(spkData) ? spkData : []).length})
            </button>
            <button
              className={`tab-button ${activeTab === 'schedule' ? 'active' : ''}`}
              onClick={() => setActiveTab('schedule')}
            >
              Delivery Schedule ({(Array.isArray(scheduleData) ? scheduleData : []).length})
            </button>
            <button
              className={`tab-button ${activeTab === 'outstanding' ? 'active' : ''}`}
              onClick={() => setActiveTab('outstanding')}
            >
              Outstanding ({(Array.isArray(spkData) ? spkData : []).filter((s: any) => s.status === 'OPEN').length})
            </button>
          </div>
          <div style={{ flex: '0 0 280px', minWidth: '240px' }}>
            <Input
              label="Search"
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by SO No, SPK No, Customer..."
            />
          </div>
        </div>
        <div className="tab-content" style={{ width: '100%', overflowX: 'auto', overflowY: 'visible', minWidth: 0, padding: '0 20px 20px' }}>
          {activeTab === 'spk' && (
            <div style={{ width: '100%', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>SPK List</h2>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setSpkViewMode('table')}
                      style={{
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: spkViewMode === 'table' ? '600' : '400',
                        backgroundColor: spkViewMode === 'table' ? 'var(--primary-color)' : 'transparent',
                        color: spkViewMode === 'table' 
                          ? (document.documentElement.getAttribute('data-theme') === 'light' ? '#1a1a1a' : '#fff')
                          : 'var(--text-primary)',
                        border: `1px solid ${spkViewMode === 'table' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      📊 Table
                    </button>
                    <button
                      onClick={() => setSpkViewMode('cards')}
                      style={{
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: spkViewMode === 'cards' ? '600' : '400',
                        backgroundColor: spkViewMode === 'cards' ? 'var(--primary-color)' : 'transparent',
                        color: spkViewMode === 'cards' 
                          ? (document.documentElement.getAttribute('data-theme') === 'light' ? '#1a1a1a' : '#fff')
                          : 'var(--text-primary)',
                        border: `1px solid ${spkViewMode === 'cards' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      🃏 Cards
                    </button>
                  </div>
                  <Button variant="primary" onClick={() => {
                    // Show SO selection dialog
                    const openSOs = salesOrders.filter((so: any) => so.status === 'OPEN');
                    if (openSOs.length === 0) {
                      showAlert('Tidak ada SO yang OPEN. Silakan buat SO terlebih dahulu.', 'Information');
                      return;
                    }
                    // For now, show first SO (can be enhanced with dialog)
                    setViewingSO(openSOs[0]);
                  }}>
                    + Create SPK from SO
                  </Button>
                </div>
              </div>
              {filteredSpkData.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>
                  No SPK found. Click "+ Create SPK from SO" to create a new SPK.
                </p>
              ) : (
                spkViewMode === 'cards' ? (
                  <div style={{ width: '100%', overflowX: 'auto', marginLeft: '-20px', marginRight: '-20px', paddingLeft: '20px', paddingRight: '20px' }}>
                    <div className="ppic-spk-table">
                      <Table
                        columns={spkColumns}
                        data={filteredSpkData}
                        emptyMessage="No SPK found"
                      />
                    </div>
                  </div>
                ) : (
                  <Table
                    columns={spkTableColumns}
                    data={flattenedSpkData}
                    emptyMessage="No SPK found"
                    getRowStyle={(item: any) => ({
                      backgroundColor: getRowColor(item.soNo),
                    })}
                  />
                )
              )}
            </div>
          )}
          
          {activeTab === 'schedule' && (
            <div style={{ width: '100%', minWidth: 0 }}>
              <h2 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>Delivery Schedule</h2>
              {filteredScheduleData.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>
                  No delivery schedule found.
                </p>
              ) : (
                <div style={{ width: '100%', overflowX: 'auto', marginLeft: '-20px', marginRight: '-20px', paddingLeft: '20px', paddingRight: '20px' }}>
                  <Table
                    columns={scheduleColumns}
                    data={filteredScheduleData}
                    emptyMessage="No schedule found"
                  />
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'outstanding' && (
            <div style={{ width: '100%', minWidth: 0 }}>
              <h2 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>Outstanding SPK</h2>
              {filteredSpkData.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>
                  No outstanding SPK found.
                </p>
              ) : (
                <div style={{ width: '100%', overflowX: 'auto', marginLeft: '-20px', marginRight: '-20px', paddingLeft: '20px', paddingRight: '20px' }}>
                  <div className="ppic-spk-table">
                    <Table
                      columns={spkColumns}
                      data={filteredSpkData}
                      emptyMessage="No outstanding SPK found"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* SO Selection Dialog for Create SPK */}
      {viewingSO && (
        <div className="dialog-overlay" onClick={() => {
          setViewingSO(null);
          setSelectedItemsForSPK({});
          closeDialog();
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
            <Card
              title={`Create SPK from SO - ${viewingSO.soNo}`}
              className="dialog-card"
            >
              <div style={{ marginBottom: '16px' }}>
                <p><strong>SO No:</strong> {viewingSO.soNo}</p>
                <p><strong>Customer:</strong> {viewingSO.customer}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <p style={{ margin: 0 }}><strong>Pilih product yang akan dibuat SPK:</strong></p>
                  <Button 
                    variant="secondary" 
                    onClick={() => {
                      // Auto-select all items yang belum punya SPK
                      const autoSelected: { [key: string]: boolean } = {};
                      (viewingSO.items || []).forEach((item: any, idx: number) => {
                        const itemId = item.id || `${viewingSO.soNo}-${idx}`;
                        const existingSPK = spkData.find((s: any) => 
                          s.soNo === viewingSO.soNo && 
                          (s.product_id === item.productId || s.product_id === item.productKode || s.kode === item.productKode)
                        );
                        if (!existingSPK) {
                          autoSelected[itemId] = true;
                        }
                      });
                      setSelectedItemsForSPK(autoSelected);
                    }}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    Select All
                  </Button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                      <th style={{ padding: '8px', textAlign: 'left', width: '40px' }}>Select</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Product</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Qty</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Unit</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewingSO.items || []).map((item: any, idx: number) => {
                      const itemId = item.id || `${viewingSO.soNo}-${idx}`;
                      const existingSPK = spkData.find((s: any) => 
                        s.soNo === viewingSO.soNo && 
                        (s.product_id === item.productId || s.product_id === item.productKode || s.kode === item.productKode)
                      );
                      const isChecked = selectedItemsForSPK[itemId] === true;
                      
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            {existingSPK ? (
                              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>✓</span>
                            ) : (
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  setSelectedItemsForSPK({
                                    ...selectedItemsForSPK,
                                    [itemId]: e.target.checked
                                  });
                                }}
                                style={{ cursor: 'pointer' }}
                              />
                            )}
                          </td>
                          <td style={{ padding: '8px' }}>{item.productName}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{item.qty}</td>
                          <td style={{ padding: '8px' }}>{item.unit}</td>
                          <td style={{ padding: '8px' }}>
                            {existingSPK ? (
                              <span style={{ color: 'var(--success)', fontSize: '12px' }}>
                                SPK: {existingSPK.spkNo}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>New</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={() => {
                  setViewingSO(null);
                  setSelectedItemsForSPK({});
                }}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => handleCreateSPKFromSO(viewingSO)}>
                  Create SPK
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Delivery Schedule Dialog */}
      {selectedDeliveryItem && (
        <DeliveryScheduleDialog
          item={selectedDeliveryItem}
          onClose={() => setSelectedDeliveryItem(null)}
          onSave={handleSaveDeliverySchedule}
        />
      )}

      {/* Custom Dialog - menggunakan hook terpusat */}
      <DialogComponent />
    </div>
  );
};

export default PPIC;

