import { useState, useEffect, useMemo, useRef } from 'react';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Input from '../../components/Input';
import DateRangeFilter from '../../components/DateRangeFilter';
import DeliveryScheduleDialog from '../../components/DeliveryScheduleDialog';
import NotificationBell from '../../components/NotificationBell';
import { storageService, extractStorageValue, StorageKeys } from '../../services/storage';
import { deleteGTItem, reloadGTData, filterActiveItems } from '../../utils/gt-delete-helper';
import { useDialog } from '../../hooks/useDialog';
import { useLanguage } from '../../hooks/useLanguage';
// import { openPrintWindow } from '../../utils/actions'; // Not used yet
import '../../styles/common.css';
import '../../styles/compact.css';
import './PPIC.css';

// CRITICAL: Safe .some() helper to prevent TypeError
const safeSome = (array: any, predicate: (item: any) => boolean): boolean => {
  if (!Array.isArray(array)) {
    console.error('[GT PPIC] safeSome: array is not an array:', typeof array);
    return false;
  }
  try {
    return array.some(predicate);
  } catch (error) {
    console.error('[GT PPIC] safeSome: error in .some() operation:', error);
    return false;
  }
};

// CRITICAL: Safe .every() helper to prevent TypeError
const safeEvery = (array: any, predicate: (item: any) => boolean): boolean => {
  if (!Array.isArray(array)) {
    console.error('[GT PPIC] safeEvery: array is not an array:', typeof array);
    return false;
  }
  try {
    return array.every(predicate);
  } catch (error) {
    console.error('[GT PPIC] safeEvery: error in .every() operation:', error);
    return false;
  }
};

// CRITICAL: Safe .map() helper to prevent TypeError
const safeMap = <T, R>(array: any, mapper: (item: T, index: number) => R): R[] => {
  if (!Array.isArray(array)) {
    console.error('[GT PPIC] safeMap: array is not an array:', typeof array);
    return [];
  }
  try {
    return array.map(mapper);
  } catch (error) {
    console.error('[GT PPIC] safeMap: error in .map() operation:', error);
    return [];
  }
};

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
  const [spkViewMode, setSpkViewMode] = useState<'cards' | 'table'>('table');
  const [selectedDeliveryItem, setSelectedDeliveryItem] = useState<{
    soNo: string;
    customer: string;
    spks: any[];
  } | null>(null);
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [spkData, setSpkData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewingSO, setViewingSO] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<any[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<any[]>([]);
  const [creatingPR, setCreatingPR] = useState<{ [spkNo: string]: boolean }>({});
  const [selectedItemsForSPK, setSelectedItemsForSPK] = useState<{ [itemId: string]: boolean }>({});
  
  // CRITICAL: Flag untuk skip event listener setelah create SPK lokal
  // Ini mencegah loadData() trigger setelah create SPK yang menyebabkan SO hilang dari table list
  const skipReloadRef = useRef<{ skipUntil: number; reason: string }>({ skipUntil: 0, reason: '' });
  
  // CRITICAL: Ensure all state variables used with .some() are always arrays
  // Handle nested objects from server by using extractStorageValue
  const safePurchaseRequests = Array.isArray(purchaseRequests) ? purchaseRequests : (purchaseRequests ? extractStorageValue(purchaseRequests) : []);
  const safeSpkData = Array.isArray(spkData) ? spkData : (spkData ? extractStorageValue(spkData) : []);
  const safeScheduleData = Array.isArray(scheduleData) ? scheduleData : (scheduleData ? extractStorageValue(scheduleData) : []);
  const safeDeliveryNotes = Array.isArray(deliveryNotes) ? deliveryNotes : (deliveryNotes ? extractStorageValue(deliveryNotes) : []);
  const safeSalesOrders = Array.isArray(salesOrders) ? salesOrders : (salesOrders ? extractStorageValue(salesOrders) : []);
  
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
  
  // SIMPLE: Filter SO yang sudah ppicNotified tapi belum dibuat SPK
  const confirmedSOsPending = useMemo(() => {
    if (!Array.isArray(safeSalesOrders) || !Array.isArray(safeSpkData)) return [];
    
    return safeSalesOrders.filter((so: any) => {
      if (!so || !so.ppicNotified) return false;
      const hasSPK = safeSpkData.some((spk: any) => spk && spk.soNo === so.soNo);
      return !hasSPK;
    });
  }, [safeSalesOrders, safeSpkData]);

  // Format confirmedSOsPending menjadi notifications untuk NotificationBell (sama seperti Packaging)
  const soNotifications = useMemo(() => {
    // CRITICAL: Ensure confirmedSOsPending is always an array to prevent .map() error
    if (!Array.isArray(confirmedSOsPending)) {
      return [];
    }
    return confirmedSOsPending.map((so: any) => ({
      id: so.id,
      title: `SO ${so.soNo} - ${so.customer}`,
      message: `Products: ${(so.items || []).length} | Confirmed: ${so.ppicNotifiedAt ? new Date(so.ppicNotifiedAt).toLocaleDateString('id-ID') : '-'}`,
      timestamp: so.ppicNotifiedAt || so.created,
      so: so, // Keep original data
    }));
  }, [confirmedSOsPending]);
  
  // Custom Dialog - menggunakan hook terpusat
  const { showAlert: showAlertBase, showConfirm: showConfirmBase, closeDialog, DialogComponent } = useDialog();
  
  // Guard untuk prevent dialog spam (sama seperti Packaging DeliveryNote)
  const dialogGuardRef = useRef<{ lastCall: number; callCount: number; lastMessage: string }>({ 
    lastCall: 0, 
    callCount: 0,
    lastMessage: ''
  });
  
  // Wrapper untuk showAlert dengan guard untuk prevent multiple calls
  const showAlert = (message: string, title: string = 'Information') => {
    // Prevent spam: max 1 call per 1000ms untuk message yang sama, max 2 calls total
    const now = Date.now();
    const isSameMessage = message === dialogGuardRef.current.lastMessage;
    
    if (isSameMessage && now - dialogGuardRef.current.lastCall < 1000) {
      dialogGuardRef.current.callCount++;
      if (dialogGuardRef.current.callCount >= 2) {
        return; // Skip jika terlalu banyak calls untuk message yang sama
      }
    } else {
      dialogGuardRef.current.callCount = 0;
      dialogGuardRef.current.lastMessage = message;
    }
    dialogGuardRef.current.lastCall = now;
    showAlertBase(message, title);
  };
  
  // Wrapper untuk kompatibilitas dengan urutan parameter yang berbeda
  const showConfirm = (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
    showConfirmBase(message, onConfirm, onCancel, title);
  };

  useEffect(() => {
    loadData();
    // CRITICAL: Tidak perlu interval refresh - sudah ada listener untuk gt_salesOrders
    // Interval refresh akan overwrite spkData dengan data lama dari server
    // Sync akan terjadi via app-storage-changed listener untuk gt_salesOrders
  }, []);

  // Listen storage changes (SPK/schedule/purchaseRequests/salesOrders) biar abis klik notif langsung kebaca tanpa refresh manual
  // Sama seperti Packaging PPIC yang listen untuk spk, schedule, production, salesOrders
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let debounceTimer: NodeJS.Timeout | null = null;
    let isLoading = false; // Guard untuk prevent loop

    const handleStorageChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ key?: string }>;
      const key = customEvent.detail?.key || '';

      // Listen untuk perubahan yang relevan (sama seperti Packaging)
      if (
        key === 'general-trading/' + StorageKeys.GENERAL_TRADING.SPK ||
        key === StorageKeys.GENERAL_TRADING.SPK ||
        key === 'general-trading/' + StorageKeys.GENERAL_TRADING.SCHEDULE ||
        key === StorageKeys.GENERAL_TRADING.SCHEDULE ||
        key === 'general-trading/' + StorageKeys.GENERAL_TRADING.PURCHASE_REQUESTS ||
        key === StorageKeys.GENERAL_TRADING.PURCHASE_REQUESTS ||
        key === 'general-trading/' + StorageKeys.GENERAL_TRADING.SALES_ORDERS ||
        key === StorageKeys.GENERAL_TRADING.SALES_ORDERS
      ) {
        // CRITICAL: Skip reload jika baru saja create SPK lokal (untuk prevent SO hilang dari table list)
        const now = Date.now();
        if (now < skipReloadRef.current.skipUntil) {
          return; // Skip reload untuk perubahan lokal
        }
        
        // Skip jika sedang loading untuk prevent loop
        if (isLoading) return;
        
        // Debounce: tunggu 300ms sebelum reload, kalau ada perubahan lagi dalam 300ms, cancel yang sebelumnya
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(async () => {
          isLoading = true;
          try {
            await loadData();
          } finally {
            isLoading = false;
            debounceTimer = null;
          }
        }, 300);
      }
    };

    window.addEventListener('app-storage-changed', handleStorageChange as EventListener);
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      window.removeEventListener('app-storage-changed', handleStorageChange as EventListener);
    };
  }, []);

  // Helper function to load from storage service (uses server in server mode)
  const loadFromStorage = async (key: string): Promise<any[]> => {
    try {
      // Use storageService which handles server mode correctly
      const data = await storageService.get<any[]>(key);
      const extracted = extractStorageValue(data);
      return extracted;
    } catch (e) {
      console.error(`Error loading ${key}:`, e);
    }
    return [];
  };

  const loadData = async () => {
    // CRITICAL: Load from storage service (uses server in server mode, localStorage in local mode)
    // This ensures we always get fresh data from the configured storage backend
    const spkRaw = await loadFromStorage(StorageKeys.GENERAL_TRADING.SPK);
    const scheduleRaw = await loadFromStorage(StorageKeys.GENERAL_TRADING.SCHEDULE);
    const customersDataRaw = await loadFromStorage(StorageKeys.GENERAL_TRADING.CUSTOMERS);
    const productsDataRaw = await loadFromStorage(StorageKeys.GENERAL_TRADING.PRODUCTS);
    let salesOrdersDataRaw = await loadFromStorage(StorageKeys.GENERAL_TRADING.SALES_ORDERS);
    const inventoryDataRaw = await loadFromStorage(StorageKeys.GENERAL_TRADING.INVENTORY);
    const purchaseOrdersDataRaw = await loadFromStorage(StorageKeys.GENERAL_TRADING.PURCHASE_ORDERS);
    const deliveryNotesDataRaw = await loadFromStorage(StorageKeys.GENERAL_TRADING.DELIVERY);
    const purchaseRequestsDataRaw = await loadFromStorage(StorageKeys.GENERAL_TRADING.PURCHASE_REQUESTS);
    
    // Force reload key data if very few items detected (sama seperti Packaging)
    if (customersDataRaw.length <= 1) {
      const fileData = await storageService.forceReloadFromFile<any[]>(StorageKeys.GENERAL_TRADING.CUSTOMERS);
      if (fileData && Array.isArray(fileData) && fileData.length > customersDataRaw.length) {
        // Update localStorage dengan data dari file
        const storageKey = 'general-trading/gt_customers';
        localStorage.setItem(storageKey, JSON.stringify({
          value: fileData,
          timestamp: Date.now(),
          _timestamp: Date.now(),
        }));
      }
    }
    
    if (productsDataRaw.length <= 1) {
      const fileData = await storageService.forceReloadFromFile<any[]>(StorageKeys.GENERAL_TRADING.PRODUCTS);
      if (fileData && Array.isArray(fileData) && fileData.length > productsDataRaw.length) {
        const storageKey = 'general-trading/gt_products';
        localStorage.setItem(storageKey, JSON.stringify({
          value: fileData,
          timestamp: Date.now(),
          _timestamp: Date.now(),
        }));
      }
    }
    
    // CRITICAL: Force reload dari server jika data sedikit atau tidak ada
    // Ini memastikan data terbaru dari server (termasuk flag ppicNotified) selalu di-load
    if (salesOrdersDataRaw.length <= 1) {
      // Coba load dari server via storageService.get() yang akan sync dari server
      try {
        const serverData = await storageService.get<any[]>(StorageKeys.GENERAL_TRADING.SALES_ORDERS);
        if (serverData && Array.isArray(serverData)) {
          const extracted = extractStorageValue(serverData) || [];
          if (extracted.length > salesOrdersDataRaw.length) {
            salesOrdersDataRaw = extracted;
            // Update localStorage dengan data dari server
            const storageKey = 'general-trading/gt_salesOrders';
            localStorage.setItem(storageKey, JSON.stringify({
              value: extracted,
              timestamp: Date.now(),
              _timestamp: Date.now(),
            }));
          }
        }
      } catch (error) {
        // Fallback ke force reload dari file jika server sync gagal
        const fileData = await storageService.forceReloadFromFile<any[]>(StorageKeys.GENERAL_TRADING.SALES_ORDERS);
        if (fileData && Array.isArray(fileData) && fileData.length > salesOrdersDataRaw.length) {
          const storageKey = 'general-trading/gt_salesOrders';
          localStorage.setItem(storageKey, JSON.stringify({
            value: fileData,
            timestamp: Date.now(),
            _timestamp: Date.now(),
          }));
          salesOrdersDataRaw = fileData;
        }
      }
    }
    
    // Reload dari localStorage setelah force reload (jika ada)
    // Note: loadFromStorage is async, so we use the raw data that was already loaded
    
    // Filter out deleted items menggunakan helper function
    let spk = filterActiveItems(spkRaw);
    let schedule = filterActiveItems(scheduleRaw);
    const customersData = filterActiveItems(customersDataRaw);
    const productsData = filterActiveItems(productsDataRaw);
    let salesOrdersData = filterActiveItems(salesOrdersDataRaw);
    const inventoryData = filterActiveItems(inventoryDataRaw);
    const purchaseOrdersData = filterActiveItems(purchaseOrdersDataRaw);
    const deliveryNotesData = filterActiveItems(deliveryNotesDataRaw);
    const purchaseRequestsData = filterActiveItems(purchaseRequestsDataRaw);
    
    // CRITICAL: Preserve SPK data dari state yang sudah ada saat reload
    // Ini mencegah SO hilang dari table list setelah create SPK karena event listener trigger loadData()
    // Race condition: localStorage mungkin belum ter-update dengan SPK baru, jadi preserve dari state
    const currentSpkData = Array.isArray(spkData) ? spkData : [];
    if (currentSpkData.length > 0 && spk.length >= 0) {
      // Merge SPK dari state yang sudah ada ke data yang di-reload
      // Prioritaskan SPK dari state jika lebih baru (ada SPK yang belum ada di localStorage)
      const spkFromState = currentSpkData.filter((stateSpk: any) => {
        // Cek apakah SPK ini sudah ada di data yang di-reload
        const existsInReloaded = spk.some((reloadedSpk: any) => 
          reloadedSpk.id === stateSpk.id || reloadedSpk.spkNo === stateSpk.spkNo
        );
        // Jika tidak ada di reloaded data, berarti SPK baru yang belum ter-sync ke localStorage
        return !existsInReloaded;
      });
      // Gabungkan: SPK dari localStorage + SPK baru dari state
      spk = [...spk, ...spkFromState];
    }
    
    // CRITICAL: Preserve ppicNotified flag dari state yang sudah ada saat reload
    // Ini mencegah SO hilang dari table list setelah create SPK/PR/schedule karena event listener trigger loadData()
    // Sama seperti Packaging yang preserve confirmed flag
    const currentSalesOrders = Array.isArray(salesOrders) ? salesOrders : [];
    
    // CRITICAL: Juga preserve dari localStorage jika state kosong (saat refresh)
    // Ini memastikan flag ppicNotified tidak hilang saat refresh
    let preservedSalesOrders = currentSalesOrders;
    if (currentSalesOrders.length === 0) {
      // Saat refresh, coba preserve dari data yang sudah di-load
      const preservedFromStorage = salesOrdersDataRaw;
      preservedSalesOrders = Array.isArray(preservedFromStorage) ? preservedFromStorage : [];
    }
    
    if (preservedSalesOrders.length > 0 && salesOrdersData.length > 0) {
      // Merge ppicNotified flag dari state/localStorage yang sudah ada ke data yang di-reload
      salesOrdersData = salesOrdersData.map((so: any) => {
        const existingSO = preservedSalesOrders.find((existing: any) => 
          existing.id === so.id || existing.soNo === so.soNo
        );
        // CRITICAL: Preserve flag jika existing SO memiliki flag = true
        // Ini handle baik race condition maupun refresh scenario
        if (existingSO && existingSO.ppicNotified === true) {
          return {
            ...so,
            ppicNotified: true,
            ppicNotifiedAt: existingSO.ppicNotifiedAt || so.ppicNotifiedAt,
            ppicNotifiedBy: existingSO.ppicNotifiedBy || so.ppicNotifiedBy,
          };
        }
        // CRITICAL: Juga preserve jika data yang di-reload tidak memiliki flag tapi seharusnya punya
        // Cek berdasarkan timestamp atau logic lain
        return so;
      });
    }
    
    // Set salesOrders state untuk digunakan di confirmedSOsPending
    setSalesOrders(salesOrdersData);
    
    // CRITICAL: Ensure all variables used with .some() are arrays
    if (!Array.isArray(spk)) {
      console.error('[GT PPIC] spk is not an array:', typeof spk, spk);
      spk = [];
    }
    if (!Array.isArray(schedule)) {
      console.error('[GT PPIC] schedule is not an array:', typeof schedule, schedule);
      schedule = [];
    }
    
    // Auto-update SPK status berdasarkan delivery
    let updatedSPK = false;
    const updatedSpkList = safeMap(spk, (s: any) => {
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
      await storageService.set(StorageKeys.GENERAL_TRADING.SPK, updatedSpkList);
      spk = updatedSpkList;
    }
    
    // Process delivery notifications (untuk GRN stock ready)
    const deliveryNotificationsRaw = await storageService.get<any[]>(StorageKeys.GENERAL_TRADING.DELIVERY_NOTIFICATIONS) || [];
    const deliveryNotifications = extractStorageValue(deliveryNotificationsRaw) || [];
    let updatedDeliveryNotifications = [...deliveryNotifications];
    
    // Process GRN notifications untuk stock ready (jika ada)
    // Note: GT tidak pakai gt_ppicNotifications untuk SO, langsung filter dari gt_salesOrders
    
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

    const autoFulfilledSpkList = safeMap(spk, (s: any) => {
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
      await storageService.set(StorageKeys.GENERAL_TRADING.SPK, autoFulfilledSpkList);
      spk = autoFulfilledSpkList;
    }
    
    // SIMPLE: Update state langsung
    setSpkData(Array.isArray(spk) ? spk : []);
    setScheduleData(schedule);
    setCustomers(customersData);
    setProducts(productsData);
    setSalesOrders(salesOrdersData);
    setInventory(inventoryData);
    setPurchaseOrders(purchaseOrdersData);
    setDeliveryNotes(deliveryNotesData);
    setPurchaseRequests(purchaseRequestsData);
    
    // CRITICAL: Ensure all state data are arrays
    if (!Array.isArray(spk)) {
      console.error('[GT PPIC] Setting non-array spk to state:', typeof spk);
      setSpkData([]);
    }
    if (!Array.isArray(schedule)) {
      console.error('[GT PPIC] Setting non-array schedule to state:', typeof schedule);
      setScheduleData([]);
    }
    if (!Array.isArray(purchaseRequestsData)) {
      console.error('[GT PPIC] Setting non-array purchaseRequestsData to state:', typeof purchaseRequestsData);
      setPurchaseRequests([]);
    }
    if (!Array.isArray(deliveryNotesData)) {
      console.error('[GT PPIC] Setting non-array deliveryNotesData to state:', typeof deliveryNotesData);
      setDeliveryNotes([]);
    }
    
    // Set pending SO notifications untuk ditampilkan di UI
    // IMPORTANT: Tampilkan SO_CREATED notifications yang PENDING ATAU yang belum ada SPK-nya
    
    // Tidak perlu filter dari ppicNotifications lagi - sudah pakai confirmedSOsPending dari useMemo yang filter langsung dari salesOrders
    // Sync notifications dari schedule data (untuk memastikan semua batch punya notifikasi)
    await syncNotificationsFromSchedule(schedule, spk);
  };
  
  // Sync notifications dari schedule data (untuk memastikan semua batch punya notifikasi)
  const syncNotificationsFromSchedule = async (scheduleList: any[], spkDataFromStorage: any[]) => {
    try {
      const deliveryNotificationsRaw = await storageService.get<any[]>(StorageKeys.GENERAL_TRADING.DELIVERY_NOTIFICATIONS) || [];
      const deliveryNotifications = extractStorageValue(deliveryNotificationsRaw) || [];
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
        await storageService.set(StorageKeys.GENERAL_TRADING.DELIVERY_NOTIFICATIONS, [...deliveryNotifications, ...newNotifications]);
      }
    } catch (error) {
      // Silent fail
    }
  };

  // Group SPK by SO No
  const groupedSpkData = useMemo(() => {
    // CRITICAL: Ensure spkData is array before processing
    if (!Array.isArray(spkData)) {
      console.error('[GT PPIC] spkData is not an array in groupedSpkData:', typeof spkData);
      return [];
    }
    
    try {
      const grouped: { [key: string]: any[] } = {};
      spkData.forEach((spk: any) => {
        const soNo = spk.soNo || 'UNKNOWN';
        if (!grouped[soNo]) {
          grouped[soNo] = [];
        }
        grouped[soNo].push(spk);
      });
      
      return Object.entries(grouped).map(([soNo, spks]) => {
        // CRITICAL: Ensure spks is always an array
        const safeSpks = Array.isArray(spks) ? spks : [];
        return {
          soNo,
          spks: safeSpks,
          customer: safeSpks.length > 0 ? safeSpks[0].customer || '' : '',
          totalQty: safeSpks.reduce((sum, s) => sum + (parseFloat(s.qty || '0') || 0), 0),
          status: safeSpks.length > 0 && safeEvery(safeSpks, (s: any) => s.status === 'CLOSE') ? 'CLOSE' : 'OPEN',
        };
      });
    } catch (error) {
      console.error('[GT PPIC] Error in groupedSpkData processing:', error);
      return [];
    }
  }, [spkData]);

  // Filtered SPK data
  const filteredSpkData = useMemo(() => {
    let filtered = groupedSpkData;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((group: any) => 
        group.soNo.toLowerCase().includes(query) ||
        group.customer.toLowerCase().includes(query) ||
        safeSome(group.spks || [], (s: any) => 
          (s.spkNo || '').toLowerCase().includes(query) ||
          (s.product || '').toLowerCase().includes(query)
        )
      );
    }
    
    // Date filter
    if (dateFrom) {
      filtered = filtered.filter((group: any) => {
        const groupDate = group.spks[0]?.created || '';
        return groupDate >= dateFrom;
      });
    }
    if (dateTo) {
      filtered = filtered.filter((group: any) => {
        const groupDate = group.spks[0]?.created || '';
        return groupDate <= dateTo;
      });
    }
    
    if (activeTab === 'outstanding') {
      filtered = filtered.filter((group: any) => group.status === 'OPEN');
    }
    
    return filtered.sort((a, b) => {
      const dateA = a.spks[0]?.created || '';
      const dateB = b.spks[0]?.created || '';
      return dateB.localeCompare(dateA);
    });
  }, [groupedSpkData, searchQuery, activeTab, dateFrom, dateTo]);

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
        
        // CRITICAL: Ensure purchaseRequests is array before using .some()
        const safePRForFlattened = Array.isArray(purchaseRequests) ? purchaseRequests : [];
        if (!Array.isArray(safePRForFlattened)) {
          console.error('[GT PPIC] purchaseRequests is not an array in flattenedSpkData:', typeof purchaseRequests);
        }
        const hasPR = safeSome(safePRForFlattened, (pr: any) => 
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
      const existingSpk = extractStorageValue(await storageService.get<any[]>(StorageKeys.GENERAL_TRADING.SPK)) || [];
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
          // CRITICAL: Ensure existingSpk is array before using .some()
          if (!Array.isArray(existingSpk)) {
            console.error('[GT PPIC] existingSpk is not an array in SPK creation:', typeof existingSpk);
            isUnique = true; // Assume unique if can't check
          } else {
            isUnique = !safeSome(existingSpk, (s: any) => s.spkNo === spkNo);
          }
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
      
      // SIMPLE: Save SPKs - langsung update state dan storage
      const currentSPKsRaw = await storageService.get<any[]>(StorageKeys.GENERAL_TRADING.SPK) || [];
      const currentSPKs = extractStorageValue(currentSPKsRaw) || [];
      const updatedSPKs = [...currentSPKs, ...newSPKs];
      
      // CRITICAL: Skip event listener untuk 2 detik setelah create SPK
      // Ini mencegah loadData() trigger yang menyebabkan SO hilang dari table list
      skipReloadRef.current = {
        skipUntil: Date.now() + 2000, // Skip reload selama 2 detik
        reason: 'createSPK'
      };
      
      // Update state langsung (confirmedSOsPending akan otomatis update)
      setSpkData(updatedSPKs);
      
      // CRITICAL: Force immediate sync ke server untuk create SPK
      // Ini memastikan data langsung tersedia di device lain
      await storageService.set(StorageKeys.GENERAL_TRADING.SPK, updatedSPKs, true);
      
      // Reset dan close
      setSelectedItemsForSPK({});
      setViewingSO(null);
      
      showAlert(`SPK berhasil dibuat untuk SO ${so.soNo}:\n\n${newSPKs.map(s => `• ${s.spkNo} - ${s.product} (${s.qty} ${s.unit})`).join('\n')}`, 'Success');
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
        const updatedSpkData = safeMap(spkData, (s: any) => {
          if ((s.spkNo || '').toString().trim() === spkNo) {
            return { ...s, stockFulfilled: true };
          }
          return s;
        });
        await storageService.set(StorageKeys.GENERAL_TRADING.SPK, updatedSpkData);
        setSpkData(updatedSpkData);
        
        showAlert(`Stock cukup untuk SPK ${spkNo}!\n\nAvailable: ${availableStock}\nRequired: ${requiredQty}\n\nTidak perlu membuat PR.`, 'Information');
        // CRITICAL: Jangan panggil loadData() di sini!
        // Event listener akan auto-trigger jika ada perubahan dari storage
        // Memanggil loadData() hanya akan reload ulang semua data dan menyebabkan notifikasi flickering
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
      
      const existingPRsRaw = await storageService.get<any[]>(StorageKeys.GENERAL_TRADING.PURCHASE_REQUESTS) || [];
      const existingPRs = extractStorageValue(existingPRsRaw) || [];
      let prNo = '';
      let isUnique = false;
      while (!isUnique) {
        const randomCode = generateRandomCode();
        prNo = `PR/${year}${month}${day}/${randomCode}`;
        // CRITICAL: Ensure existingPRs is array before using .some()
        if (!Array.isArray(existingPRs)) {
          console.error('[GT PPIC] existingPRs is not an array in PR creation:', typeof existingPRs);
          isUnique = true; // Assume unique if can't check
        } else {
          isUnique = !safeSome(existingPRs, (pr: any) => pr.prNo === prNo);
        }
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
      // CRITICAL: Force immediate sync ke server untuk create PR
      // Ini memastikan PR langsung muncul di Purchasing di device lain
      console.log(`[GT PPIC] 📤 Creating PR and POST to server: ${prNo}`);
      await storageService.set(StorageKeys.GENERAL_TRADING.PURCHASE_REQUESTS, updatedPRs, true);
      console.log(`[GT PPIC] ✅ PR created and synced to server: ${prNo}`);
      setPurchaseRequests(updatedPRs);
      
      // CRITICAL: Send notification to Purchasing IMMEDIATELY after PR creation
      // Ini harus POST ke server, bukan hanya local
      let notificationSent = false;
      try {
        // CRITICAL: Get current notifications dengan proper extraction
        const purchasingNotificationsRaw = await storageService.get<any[]>(StorageKeys.GENERAL_TRADING.PURCHASING_NOTIFICATIONS);
        let purchasingNotifications = extractStorageValue(purchasingNotificationsRaw) || [];
        
        // CRITICAL: Ensure array format
        if (!Array.isArray(purchasingNotifications)) {
          console.warn('[GT PPIC] purchasingNotifications is not an array, resetting to empty array');
          purchasingNotifications = [];
        }
        
        const existingNotif = purchasingNotifications.find((n: any) => n && n.prNo === prNo);
        
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
            pr: newPR, // Include full PR object for Purchasing
          };
          
          // CRITICAL: Ensure we're saving array format
          const updatedNotifications = [...purchasingNotifications, newPurchasingNotification];
          
          // CRITICAL: Save dengan await dan verify
          // CRITICAL: Force immediate sync ke server untuk purchasing notifications
          // Ini memastikan notifikasi langsung muncul di Purchasing di device lain
          // MUST POST TO SERVER, NOT LOCAL ONLY
          console.log(`[GT PPIC] 📤 POST purchasing notification to SERVER: ${prNo}`);
          console.log(`[GT PPIC] Notification data:`, {
            prNo,
            spkNo,
            soNo: spk.soNo,
            customer: spk.customer,
            product: spk.product,
            qty: shortageQty,
            totalNotifications: updatedNotifications.length
          });
          
          // CRITICAL: immediateSync = true untuk POST ke server
          await storageService.set(StorageKeys.GENERAL_TRADING.PURCHASING_NOTIFICATIONS, updatedNotifications, true);
          
          console.log(`[GT PPIC] ✅ Purchasing notification POSTED to server: ${prNo} (${updatedNotifications.length} total notifications)`);
          
          // CRITICAL: Verify save dengan read back dari server
          // Wait a bit for server sync to complete
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const verifyRaw = await storageService.get<any[]>(StorageKeys.GENERAL_TRADING.PURCHASING_NOTIFICATIONS);
          const verifyNotifications = extractStorageValue(verifyRaw) || [];
          const verifyNotif = verifyNotifications.find((n: any) => n && n.prNo === prNo);
          
          if (verifyNotif) {
            notificationSent = true;
            console.log(`[GT PPIC] ✅ Verified: Purchasing notification found after POST: ${prNo}`);
          } else {
            console.error('[GT PPIC] ❌ Notification not found after POST - server sync may have failed!');
            console.error('[GT PPIC] Verify data:', {
              prNo,
              totalNotifications: verifyNotifications.length,
              notifications: verifyNotifications.map((n: any) => ({ prNo: n.prNo, type: n.type }))
            });
          }
        } else {
          notificationSent = true; // Already exists
          console.log(`[GT PPIC] ℹ️ Notification already exists for PR: ${prNo}`);
        }
      } catch (error: any) {
        // Log error but don't fail the PR creation
        console.error('[GT PPIC] ❌ Error POST notification to Purchasing:', error);
        console.error('[GT PPIC] Error details:', {
          message: error.message,
          stack: error.stack,
          prNo,
          spkNo,
        });
      }
      
      setCreatingPR(prev => ({ ...prev, [spkNo]: false }));
      
      const notificationMessage = notificationSent 
        ? `PR berhasil dibuat untuk SPK ${spkNo}!\n\nPR No: ${prNo}\nProduct: ${spk.product}\nShortage Qty: ${shortageQty} ${spk.unit}\n\n📧 Notification sent to Purchasing`
        : `PR berhasil dibuat untuk SPK ${spkNo}!\n\nPR No: ${prNo}\nProduct: ${spk.product}\nShortage Qty: ${shortageQty} ${spk.unit}\n\n⚠️ Warning: Notification to Purchasing may not have been sent. Please check.`;
      
      showAlert(notificationMessage, 'Success');
      
      // CRITICAL: Jangan panggil loadData() di sini!
      // State sudah di-update langsung via setPurchaseRequests()
      // Event listener akan auto-trigger jika ada perubahan dari storage
      // Memanggil loadData() hanya akan reload ulang semua data yang sudah ada dan menyebabkan refresh
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
    const deliveryNotificationsRaw = await storageService.get<any[]>(StorageKeys.GENERAL_TRADING.DELIVERY_NOTIFICATIONS) || [];
    const deliveryNotifications = extractStorageValue(deliveryNotificationsRaw) || [];
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
          const updatedSpkData = safeMap(spkData, (s: any) => {
            if ((s.spkNo || '').toString().trim() === spkNo) {
              return { ...s, stockFulfilled: true };
            }
            return s;
          });
          await storageService.set(StorageKeys.GENERAL_TRADING.SPK, updatedSpkData);
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
    
    // CRITICAL: Force immediate sync ke server untuk save delivery schedule
    // Ini memastikan data langsung tersedia di device lain
    await storageService.set(StorageKeys.GENERAL_TRADING.SCHEDULE, updated, true);
    setScheduleData(updated);
    
    // CRITICAL: Skip event listener untuk 2 detik setelah save delivery schedule
    // Ini mencegah loadData() trigger yang menyebabkan SO hilang dari table list
    skipReloadRef.current = {
      skipUntil: Date.now() + 2000, // Skip reload selama 2 detik
      reason: 'saveDeliverySchedule'
    };
    
    if (newNotifications.length > 0) {
      // CRITICAL: Force immediate sync ke server untuk delivery notifications
      // Ini memastikan notifikasi langsung muncul di Delivery Note di device lain
      await storageService.set(StorageKeys.GENERAL_TRADING.DELIVERY_NOTIFICATIONS, [...deliveryNotifications, ...newNotifications], true);
      showAlert(`Delivery schedule saved successfully untuk ${data.spkDeliveries.length} SPK(s)\n\n📧 ${newNotifications.length} notification(s) sent to Delivery Note\n\n💡 Stock akan dicek saat create Delivery Note.`, 'Success');
    } else {
      showAlert(`Delivery schedule saved untuk ${data.spkDeliveries.length} SPK(s)`, 'Success');
    }
    
    setSelectedDeliveryItem(null);
    
    // Jangan panggil loadData() karena akan reload salesOrders dan bisa kehilangan flag ppicNotified
    // Event listener akan handle update jika ada perubahan dari device lain
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
        storageService.get<any[]>(StorageKeys.GENERAL_TRADING.SCHEDULE),
        storageService.get<any[]>(StorageKeys.GENERAL_TRADING.DELIVERY),
      ]);

      const scheduleList = scheduleListRaw || [];
      const deliveryList = deliveryListRaw || [];

      // CRITICAL: Ensure arrays before using .some()
      if (!Array.isArray(scheduleList)) {
        console.error('[GT PPIC] scheduleList is not an array in handleDeleteSPK:', typeof scheduleList);
      }
      if (!Array.isArray(deliveryList)) {
        console.error('[GT PPIC] deliveryList is not an array in handleDeleteSPK:', typeof deliveryList);
      }

      const hasSchedule = safeSome(scheduleList, (s: any) => s.spkNo === spkNo);
      const hasDelivery = safeSome(deliveryList, (dn: any) => 
        dn.spkNo === spkNo || safeSome(dn.items || [], (itm: any) => itm.spkNo === spkNo)
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
        'Safe Delete Confirmation',
        `Hapus SPK ${spkNo}?\n\n⚠️ Data akan dihapus dengan aman (tombstone pattern) untuk mencegah auto-sync mengembalikan data.\n\nTindakan ini akan:\n• Menghapus SPK dari daftar\n• Menghapus notifikasi terkait\n\nPastikan tidak ada proses lanjutan untuk SPK ini.\n\nTindakan ini tidak bisa dibatalkan.`,
        async () => {
          try {
            console.log('[GT PPIC] handleDeleteSPK called for:', spkNo, spk.id);
            
            // 🚀 FIX: Pakai GT delete helper untuk konsistensi dan sync yang benar
            const deleteResult = await deleteGTItem(StorageKeys.GENERAL_TRADING.SPK, spk.id, 'id');
            if (!deleteResult.success) {
              console.error('[GT PPIC] Delete failed:', deleteResult.error);
              showAlert(`❌ Error deleting SPK ${spkNo}: ${deleteResult.error || 'Unknown error'}`, 'Error');
              return;
            }
            
            // Reload SPK data dengan helper (handle race condition)
            const activeSpkData = await reloadGTData(StorageKeys.GENERAL_TRADING.SPK, setSpkData);
            setSpkData(activeSpkData);
            
            // Reload all data untuk refresh UI
            await loadData();
            
            showAlert(`✅ SPK ${spkNo} berhasil dihapus dengan aman.\n\n🛡️ Data dilindungi dari auto-sync restoration.`, 'Success');
          } catch (error: any) {
            console.error('[GT PPIC] Error deleting SPK:', error);
            showAlert(`❌ Error deleting SPK: ${error.message}`, 'Error');
          }
        }
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
          {safeMap(group.spks || [], (spk: any, idx: number) => {
            // Cek apakah delivery schedule sudah dibuat untuk SPK ini
            // GT: Cek hasSchedule berdasarkan deliveryBatches (bukan hanya existence)
            const schedule = scheduleData.find((s: any) => 
              (s.spkNo || '').toString().trim() === (spk.spkNo || '').toString().trim()
            );
            const hasSchedule = !!(schedule && schedule.deliveryBatches && Array.isArray(schedule.deliveryBatches) && schedule.deliveryBatches.length > 0);
            
        // CRITICAL: Ensure purchaseRequests is array before using .some()
        const safePRForCheck = Array.isArray(safePurchaseRequests) ? safePurchaseRequests : [];
        if (!Array.isArray(safePRForCheck)) {
          console.error('[GT PPIC] safePRForCheck is not an array:', typeof safePRForCheck);
        }
        const hasPR = safeSome(safePRForCheck, (pr: any) => 
          (pr.spkNo || '').toString().trim() === (spk.spkNo || '').toString().trim()
        );
            
            // Cek apakah sudah ada delivery note untuk SPK ini
            const safeDeliveryNotesForCheck = Array.isArray(safeDeliveryNotes) ? safeDeliveryNotes : [];
            const relatedDelivery = safeDeliveryNotesForCheck.find((dn: any) => {
              if (!dn.items || !Array.isArray(dn.items)) return false;
              return safeSome(dn.items, (item: any) => 
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
          {confirmedSOsPending.length > 0 && (
            <NotificationBell
              notifications={soNotifications}
              onNotificationClick={async (notification) => {
                // CRITICAL: Saat user klik notifikasi, langsung update state dan pastikan SO muncul di table list
                if (notification.so) {
                  // Pastikan SO ada di salesOrders state
                  const existingSO = salesOrders.find((s: any) => s.id === notification.so.id || s.soNo === notification.so.soNo);
                  if (!existingSO) {
                    // Jika SO belum ada di state, tambahkan langsung
                    const updatedSalesOrders = [...salesOrders, notification.so];
                    setSalesOrders(updatedSalesOrders);
                    // CRITICAL: Force immediate sync ke server untuk confirm notifikasi
                    // Ini memastikan data langsung tersedia di device lain
                    await storageService.set(StorageKeys.GENERAL_TRADING.SALES_ORDERS, updatedSalesOrders, true);
                  } else {
                    // Pastikan flag ppicNotified tetap true
                    if (!existingSO.ppicNotified) {
                      const updatedSalesOrders = salesOrders.map((s: any) => 
                        s.id === notification.so.id || s.soNo === notification.so.soNo
                          ? { ...s, ppicNotified: true, ppicNotifiedAt: notification.so.ppicNotifiedAt || new Date().toISOString() }
                          : s
                      );
                      setSalesOrders(updatedSalesOrders);
                      // CRITICAL: Force immediate sync ke server untuk confirm notifikasi
                      await storageService.set(StorageKeys.GENERAL_TRADING.SALES_ORDERS, updatedSalesOrders, true);
                    }
                  }
                  setViewingSO(notification.so);
                } else {
                  const so = salesOrders.find((s: any) => s.soNo === notification.title.replace('SO ', ''));
                  if (so) {
                    // Pastikan flag ppicNotified true
                    if (!so.ppicNotified) {
                      const updatedSalesOrders = salesOrders.map((s: any) => 
                        s.soNo === so.soNo
                          ? { ...s, ppicNotified: true, ppicNotifiedAt: new Date().toISOString() }
                          : s
                      );
                      setSalesOrders(updatedSalesOrders);
                      // CRITICAL: Force immediate sync ke server untuk confirm notifikasi
                      await storageService.set(StorageKeys.GENERAL_TRADING.SALES_ORDERS, updatedSalesOrders, true);
                    }
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
          <div style={{ flex: '0 0 400px', minWidth: '350px' }}>
            <DateRangeFilter
              onDateChange={(from, to) => {
                setDateFrom(from);
                setDateTo(to);
              }}
              defaultFrom={dateFrom}
              defaultTo={dateTo}
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

