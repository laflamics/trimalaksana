import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Input from '../../components/Input';
import ScheduleTable from '../../components/ScheduleTable';
import ScheduleDialog from '../../components/ScheduleDialog';
import DeliveryScheduleDialog from '../../components/DeliveryScheduleDialog';
import GeneralScheduleDialog from '../../components/GeneralScheduleDialog';
import BOMDialog from '../../components/BOMDialog';
import NotificationBell from '../../components/NotificationBell';
import { storageService, extractStorageValue } from '../../services/storage';
import { materialAllocator } from '../../services/material-allocator';
import { filterActiveItems } from '../../utils/data-persistence-helper';
import { 
  deletePackagingItem, 
  deletePackagingItems, 
  reloadPackagingData
} from '../../utils/packaging-delete-helper';
import { openPrintWindow, isMobile, isCapacitor, savePdfForMobile } from '../../utils/actions';
import { loadLogoAsBase64 } from '../../utils/logo-loader';
import { generatePRHtml } from '../../pdf/pr-pdf-template';
import * as XLSX from 'xlsx';
import { createStyledWorksheet, setColumnWidths, ExcelColumn } from '../../utils/excel-helper';
import { getTheme } from '../../utils/theme';
import { logCreate, logUpdate, logDelete } from '../../utils/activity-logger';
import '../../styles/common.css';
import '../../styles/compact.css';

// PTP Action Menu Component untuk dropdown 3 titik (vertical)
const PTPActionMenu = ({
  onView,
  onCreateSPK,
  onMatchSO,
  hasSPK,
}: {
  onView?: () => void;
  onCreateSPK?: () => void;
  onMatchSO?: () => void;
  hasSPK?: boolean;
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
      requestAnimationFrame(() => {
        if (!buttonRef.current) return;
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const menuHeight = 200;
        const spaceBelow = window.innerHeight - buttonRect.bottom;
        const spaceAbove = buttonRect.top;
        const gap = 0;
        
        if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
          setMenuPosition({
            top: buttonRect.top - menuHeight - gap,
            right: window.innerWidth - buttonRect.right,
          });
        } else {
          setMenuPosition({
            top: buttonRect.bottom + gap,
            right: window.innerWidth - buttonRect.right,
          });
        }
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
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 10000,
            minWidth: '160px',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {onView && (
            <button
              onClick={() => { onView(); setShowMenu(false); }}
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
              👁️ View
            </button>
          )}
          {onCreateSPK && !hasSPK && (
            <button
              onClick={() => { onCreateSPK(); setShowMenu(false); }}
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
              📋 Create SPK
            </button>
          )}
          {onMatchSO && (
            <button
              onClick={() => { onMatchSO(); setShowMenu(false); }}
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
              🔗 Match SO
            </button>
          )}
        </div>
      )}
    </>
  );
};

// Action Menu Component untuk compact actions (3 dots dropdown)
const ActionMenu = ({ 
  onGeneralSchedule, 
  onViewBOM, 
  onEditBOM, 
  onCreatePR, 
  onSchedule, 
  onStatus, 
  onDelete,
  showEditBOM = false,
  showCreatePR = false,
  showSchedule = false,
  prIsApproved = false,
  isCreatingPR = false,
}: {
  onGeneralSchedule?: () => void;
  onViewBOM?: () => void;
  onEditBOM?: () => void;
  onCreatePR?: () => void;
  onSchedule?: () => void;
  onStatus?: () => void;
  onDelete?: () => void;
  showEditBOM?: boolean;
  showCreatePR?: boolean;
  showSchedule?: boolean;
  prIsApproved?: boolean;
  isCreatingPR?: boolean;
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
      // Use requestAnimationFrame to ensure menu is rendered before calculating position
      requestAnimationFrame(() => {
        if (!buttonRef.current) return;
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const menuHeight = 250; // Estimated menu height
        const spaceBelow = window.innerHeight - buttonRect.bottom;
        const spaceAbove = buttonRect.top;
        const gap = 0; // No gap for tight positioning
        
        // If not enough space below but enough space above, position above
        if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
          setMenuPosition({
            top: buttonRect.top - menuHeight - gap,
            right: window.innerWidth - buttonRect.left,
          });
        } else {
          // Default: position below with small gap
          setMenuPosition({
            top: buttonRect.bottom + gap,
            right: window.innerWidth - buttonRect.left,
          });
        }
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
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 10000,
            minWidth: '160px',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {onGeneralSchedule && (
            <button
              onClick={() => { onGeneralSchedule(); setShowMenu(false); }}
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
              📅 General Schedule
            </button>
          )}
          {onViewBOM && (
            <button
              onClick={() => { onViewBOM(); setShowMenu(false); }}
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
              👁️ View BOM
            </button>
          )}
          {onEditBOM && showEditBOM && (
            <button
              onClick={() => { onEditBOM(); setShowMenu(false); }}
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
              ✏️ Edit BOM
            </button>
          )}
          {onCreatePR && showCreatePR && (
            <button
              onClick={() => { onCreatePR(); setShowMenu(false); }}
              disabled={isCreatingPR || prIsApproved}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '6px 10px',
                border: 'none',
                background: prIsApproved ? 'var(--success)' : 'transparent',
                color: prIsApproved ? '#fff' : 'var(--text-primary)',
                cursor: (isCreatingPR || prIsApproved) ? 'not-allowed' : 'pointer',
                fontSize: '11px',
                borderRadius: '4px',
                opacity: (isCreatingPR || prIsApproved) ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isCreatingPR && !prIsApproved) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!prIsApproved) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {isCreatingPR ? '⏳ Creating PR...' : prIsApproved ? '✓ PR Created' : '📋 Create PR'}
            </button>
          )}
          {onSchedule && showSchedule && (
            <button
              onClick={() => { onSchedule(); setShowMenu(false); }}
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
              📅 Schedule
            </button>
          )}
          {onStatus && (
            <button
              onClick={() => { onStatus(); setShowMenu(false); }}
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
              🔄 Status
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

const PPIC = () => {
  const [activeTab, setActiveTab] = useState<'spk' | 'ptp' | 'schedule' | 'analisa' | 'outstanding'>('spk');
  const [selectedScheduleItem, setSelectedScheduleItem] = useState<any>(null);
  const [selectedDeliveryItem, setSelectedDeliveryItem] = useState<any>(null);
  const [selectedGeneralScheduleItem, setSelectedGeneralScheduleItem] = useState<any>(null); // Untuk dialog gabungan
  const [generalScheduleActiveTab, setGeneralScheduleActiveTab] = useState<'production' | 'delivery'>('production'); // Tab aktif di dialog gabungan
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [spkData, setSpkData] = useState<any[]>([]);
  const [ptpData, setPtpData] = useState<any[]>([]);
  const [productionData, setProductionData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingBOM, setEditingBOM] = useState<any>(null);
  const [editingSPKBOM, setEditingSPKBOM] = useState<any>(null); // State untuk edit SPK-specific BOM override
  const [showCreatePTP, setShowCreatePTP] = useState(false);
  const [viewingPTP, setViewingPTP] = useState<any>(null);
  const [matchingPTP, setMatchingPTP] = useState<any>(null);
  const [viewingSO, setViewingSO] = useState<any>(null);
  const [pendingSPKs, setPendingSPKs] = useState<any[]>([]); // SPK yang baru dibuat, perlu schedule
  const [materials, setMaterials] = useState<any[]>([]);
  const [bomData, setBomData] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<any[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<any[]>([]);
  const [viewingProductBOM, setViewingProductBOM] = useState<{ spk: any; bomItems: any[] } | null>(null);
  const [analisaSubTab, setAnalisaSubTab] = useState<'overview' | 'spk' | 'po' | 'so' | 'production' | 'ptp'>('overview');
  const [spkViewMode, setSpkViewMode] = useState<'cards' | 'table'>('cards'); // Default card view
  const [ptpViewMode, setPtpViewMode] = useState<'cards' | 'table'>('cards'); // Default card view
  const [creatingPR, setCreatingPR] = useState<{ [spkNo: string]: boolean }>({}); // Track PR yang sedang dibuat
  const [viewPdfData, setViewPdfData] = useState<{ html: string; prNo: string } | null>(null);
  const [whatToDoNextDialog, setWhatToDoNextDialog] = useState<{ show: boolean; spk: any; checklist: any }>({
    show: false,
    spk: null,
    checklist: null,
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(getTheme());
  
  useEffect(() => {
    // Update theme saat berubah
    const checkTheme = () => {
      const currentTheme = getTheme();
      setTheme(currentTheme);
    };
    checkTheme();
    
    // Listen untuk perubahan theme via MutationObserver
    const observer = new MutationObserver(() => {
      checkTheme();
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    
    return () => observer.disconnect();
  }, []);
  
  // Custom Dialog state (untuk ganti confirm/alert)
  const [dialogState, setDialogState] = useState<{
    show: boolean;
    type: 'showAlert' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    show: false,
    type: 'showAlert',
    title: '',
    message: '',
  });
  
  // Helper functions untuk dialog
  const showAlert = (message: string, title: string = 'Information') => {
    // Set dialog open untuk disable global event listener
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(true);
    }
    setDialogState({
      show: true,
      type: 'showAlert',
      title,
      message,
    });
  };
  
  const showConfirm = (message: string, onConfirm: () => void, onCancel?: () => void, title: string = 'Confirmation') => {
    // Set dialog open untuk disable global event listener
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
    // Restore global event listener saat dialog ditutup
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(false);
    }
    setDialogState({
      show: false,
      type: 'showAlert',
      title: '',
      message: '',
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Listen storage changes (SPK/PTP/schedule/production) biar abis klik notif langsung kebaca tanpa refresh manual
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let debounceTimer: NodeJS.Timeout | null = null;

    const handleStorageChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ key?: string }>;
      const key = customEvent.detail?.key || '';

      if (
        key === 'spk' ||
        key === 'ptp' ||
        key === 'schedule' ||
        key === 'production' ||
        key === 'salesOrders'
      ) {
        // Debounce: tunggu 300ms sebelum reload, kalau ada perubahan lagi dalam 300ms, cancel yang sebelumnya
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(() => {
          loadData();
          debounceTimer = null;
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

  // Listen for BOM updates from other modules (e.g., Master Products)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBOMUpdate = (event: Event) => {
      // Reload data to sync BOM changes
      loadData();
    };

    window.addEventListener('bomUpdated', handleBOMUpdate as EventListener);
    
    return () => {
      window.removeEventListener('bomUpdated', handleBOMUpdate as EventListener);
    };
  }, []);

  // Helper function to load from localStorage directly (non-blocking)
  const loadFromLocalStorage = (key: string): any[] => {
    try {
      // Try direct key first (Packaging uses direct keys)
      let valueStr = localStorage.getItem(key);
      if (!valueStr) {
        // Try with packaging/ prefix as fallback
        valueStr = localStorage.getItem(`packaging/${key}`);
      }
      if (valueStr) {
        const parsed = JSON.parse(valueStr);
        const extracted = extractStorageValue(parsed);
        return extracted;
      }
    } catch (e) {
      console.warn(`[PPIC] Error loading ${key} from localStorage:`, e);
    }
    return [];
  };

  const loadData = async () => {
    // OPTIMIZATION: Load from localStorage FIRST (instant, non-blocking)
    // Then sync from server in background if needed
    const spkRaw = loadFromLocalStorage('spk');
    let spk = filterActiveItems(spkRaw); // Filter deleted SPK items (tombstone pattern)
    const ptpRaw = loadFromLocalStorage('ptp');
    const ptp = filterActiveItems(ptpRaw); // Filter deleted PTP items
    let schedule = loadFromLocalStorage('schedule');
    let production = loadFromLocalStorage('production');
    const customersData = loadFromLocalStorage('customers');
    const productsData = loadFromLocalStorage('products');
    const salesOrdersData = loadFromLocalStorage('salesOrders');
    const materialsData = loadFromLocalStorage('materials');
    const bomDataLoaded = loadFromLocalStorage('bom');
    const inventoryData = loadFromLocalStorage('inventory');
    const purchaseOrdersData = loadFromLocalStorage('purchaseOrders');
    const deliveryNotesData = loadFromLocalStorage('delivery');
    const purchaseRequestsData = loadFromLocalStorage('purchaseRequests');
    
    // NOTE: Tidak perlu background sync manual di sini karena:
    // 1. storageService.get() sudah punya background sync sendiri
    // 2. Auto-sync interval sudah handle sync periodik
    // 3. Load dari localStorage sudah cukup untuk instant UI update
    
    // Cleanup: Hapus SPK utama yang sudah di-split menjadi batch SPK
    // Cek setiap SPK, jika ada batch SPK dengan pattern `${spkNo}-A`, `${spkNo}-B`, dst, hapus SPK utama
    let hasCleanedSpk = false;
    const cleanedSpk = spk.filter((spkItem: any) => {
      const spkNo = (spkItem.spkNo || '').toString().trim();
      if (!spkNo) return true; // Keep jika tidak ada spkNo
      
      // Jika SPK ini punya originalSpkNo atau batchNo, berarti ini SPK batch (valid, keep)
      if (spkItem.originalSpkNo || spkItem.batchNo) {
        return true;
      }
      
      // Cek apakah SPK ini sendiri adalah batch (punya pattern `-A`, `-B`, dst di akhir)
      const isBatchSPK = /-[A-Z0-9]$/.test(spkNo);
      if (isBatchSPK) {
        return true; // Ini batch SPK, keep
      }
      
      // Cek apakah ada SPK batch yang berasal dari SPK ini
      const hasBatchSPKs = spk.some((otherSpk: any) => {
        const otherSpkNo = (otherSpk.spkNo || '').toString().trim();
        if (!otherSpkNo) return false;
        
        // Cek apakah otherSpk adalah batch dari spk ini
        if (otherSpkNo.startsWith(spkNo + '-')) {
          const suffix = otherSpkNo.substring(spkNo.length + 1);
          // Valid jika suffix adalah single character (A-Z) atau single digit (0-9)
          if (suffix.length === 1 && /^[A-Z0-9]$/.test(suffix)) {
            return true;
          }
        }
        return false;
      });
      
      // Jika ada batch SPK, hapus SPK utama ini
      if (hasBatchSPKs) {
        hasCleanedSpk = true;
        console.log(`🧹 Cleanup: Removing main SPK ${spkNo} because it has batch SPKs`);
        return false;
      }
      
      return true;
    });
    
    // Save cleaned SPK list jika ada perubahan
    if (hasCleanedSpk) {
      await storageService.set('spk', cleanedSpk);
      spk = cleanedSpk;
      console.log(`✅ Cleaned up SPK list: removed ${spk.length - cleanedSpk.length} main SPK(s) that have batch SPKs`);
    }
    
    // Auto-update SPK status berdasarkan:
    // 1. Production progress: CLOSE jika production sudah selesai (progress >= target)
    // 2. Delivery: CLOSE jika product sudah terkirim
    // - OPEN jika SPK sudah CLOSE tapi production belum selesai DAN product belum terkirim (re-open)
    // IMPORTANT: Setiap SPK di-close secara independen berdasarkan product di SPK tersebut, bukan semua product di SO
    let updatedSPK = false;
    const updatedSpkList = cleanedSpk.map((s: any) => {
      if (!s.soNo || !s.spkNo) return s;
      
      const spkQty = parseFloat(s.qty || '0') || 0;
      if (spkQty <= 0) return s; // Skip jika qty 0

      // Cek production progress untuk SPK ini
      const relatedProduction = production.find((p: any) => p.spkNo === s.spkNo);
      const productionProgress = relatedProduction ? (relatedProduction.progress || relatedProduction.producedQty || 0) : 0;
      const productionTarget = relatedProduction ? (relatedProduction.target || relatedProduction.targetQty || spkQty) : spkQty;
      const isProductionComplete = productionProgress >= productionTarget;
      
      // Cek apakah product di SPK ini sudah terkirim
      const spkProductId = (s.product_id || s.productId || '').toString().trim();
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
            // IMPORTANT: Cek apakah delivery item ini terkait dengan SPK ini
            // Delivery item punya spkNo field (bukan spkNos array)
            const deliverySpkNo = (delItem.spkNo || '').toString().trim();
            const currentSpkNo = (s.spkNo || '').toString().trim();
            const isRelatedToThisSPK = deliverySpkNo === currentSpkNo;
            
            if (!isRelatedToThisSPK) return; // Skip jika tidak terkait dengan SPK ini
            
            // Match berdasarkan productId, productKode, atau productName
            const delProductId = (delItem.productId || delItem.productKode || '').toString().trim().toLowerCase();
            const delProductName = (delItem.product || delItem.productName || '').toString().trim().toLowerCase();
            const spkProductIdLower = spkProductId.toLowerCase();
            const spkProductNameLower = spkProductName.toLowerCase();
            
            // Match jika productId sama, atau productName sama
            const productIdMatch = spkProductIdLower && delProductId && spkProductIdLower === delProductId;
            const productNameMatch = spkProductNameLower && delProductName && spkProductNameLower === delProductName;
            
            if (productIdMatch || productNameMatch) {
              totalDeliveredQty += parseFloat(delItem.qty || '0') || 0;
            }
          });
        }
      });

      // Update status berdasarkan production progress ATAU delivery status
      const isDelivered = totalDeliveredQty >= spkQty;
      const shouldBeClosed = isProductionComplete || isDelivered;
      
      if (shouldBeClosed && s.status !== 'CLOSE') {
        // Production sudah selesai ATAU product sudah terkirim, close SPK
        updatedSPK = true;
        const reason = isProductionComplete ? `Production complete (${productionProgress}/${productionTarget})` : `Product delivered (${totalDeliveredQty}/${spkQty})`;
        console.log(`✅ Auto-closing SPK ${s.spkNo}: ${reason}`);
        return { ...s, status: 'CLOSE' as const };
      } else if (!shouldBeClosed && s.status === 'CLOSE') {
        // SPK sudah CLOSE tapi production belum selesai DAN product belum terkirim, re-open SPK
        updatedSPK = true;
        console.log(`⚠️ Auto-reopening SPK ${s.spkNo}: Production not complete (${productionProgress}/${productionTarget}) and product not delivered (${totalDeliveredQty}/${spkQty})`);
        return { ...s, status: 'OPEN' as const };
      }
      
      return s;
    });
    
    if (updatedSPK) {
      await storageService.set('spk', updatedSpkList);
      console.log('✅ Auto-updated SPK(s) from DRAFT/OPEN to CLOSE (all products in SO have been delivered)');
    }
    
    // Auto-fulfill SPK dari stock jika stock product cukup
    // Cek setiap SPK OPEN, jika stock product cukup, auto-fulfill (skip PR, Schedule, BOM, QC, langsung ke delivery)
    let hasAutoFulfilled = false;
    const autoFulfilledSpkList = (updatedSPK ? updatedSpkList : cleanedSpk).map((s: any) => {
      // Hanya proses SPK yang statusnya OPEN dan belum fulfilled
      if (s.status !== 'OPEN' || s.stockFulfilled) return s;
      
      const spkQty = parseFloat(s.qty || '0') || 0;
      if (spkQty <= 0) return s; // Skip jika qty 0
      
      // Cek product ID dari SPK
      const spkProductId = (s.product_id || s.productId || s.kode || '').toString().trim();
      if (!spkProductId) return s; // Skip jika tidak ada product ID
      
      // Cari product di inventory
      const inventoryItem = inventoryData.find((inv: any) => {
        const invCode = (inv.codeItem || '').toString().trim();
        return invCode === spkProductId;
      });
      
      if (!inventoryItem) return s; // Skip jika product tidak ada di inventory
      
      // Hitung available stock
      // Available stock = stockPremonth + receive - outgoing + return
      // Atau bisa juga pakai nextStock jika sudah dihitung
      const baseStock = inventoryItem.nextStock !== undefined 
        ? (inventoryItem.nextStock || 0)
        : (
            (inventoryItem.stockPremonth || 0) + 
            (inventoryItem.receive || 0) - 
            (inventoryItem.outgoing || 0) + 
            (inventoryItem.return || 0)
          );
      
      // IMPORTANT: Hitung stock yang sudah digunakan oleh SPK lain (yang belum di-close)
      // Cek delivery data untuk melihat stock yang sudah digunakan oleh SPK lain untuk product yang sama
      let stockUsedByOtherSPKs = 0;
      const currentSpkNo = (s.spkNo || '').toString().trim();
      
      // Cek semua SPK lain yang menggunakan product yang sama dan belum di-close
      const otherSPKsWithSameProduct = (updatedSPK ? updatedSpkList : cleanedSpk).filter((otherSpk: any) => {
        const otherSpkNo = (otherSpk.spkNo || '').toString().trim();
        const otherSpkProductId = (otherSpk.product_id || otherSpk.productId || otherSpk.kode || '').toString().trim();
        // Skip SPK ini sendiri
        if (otherSpkNo === currentSpkNo) return false;
        // Skip SPK yang sudah di-close
        if (otherSpk.status === 'CLOSE') return false;
        // Skip jika product berbeda
        if (otherSpkProductId !== spkProductId) return false;
        // Skip jika sudah stockFulfilled (sudah dialokasikan stock)
        if (otherSpk.stockFulfilled === true) return false;
        return true;
      });
      
      // Hitung total qty dari SPK lain yang sudah menggunakan stock
      otherSPKsWithSameProduct.forEach((otherSpk: any) => {
        const otherSpkQty = parseFloat(otherSpk.qty || '0') || 0;
        stockUsedByOtherSPKs += otherSpkQty;
      });
      
      // Cek juga delivery yang sudah dibuat untuk SPK lain (yang belum di-close)
      const deliveriesForOtherSPKs = deliveryNotesData.filter((del: any) => {
        // Skip delivery yang sudah di-close atau deleted
        if (del.status === 'CLOSE' || del.status === 'DELIVERED' || del.deleted === true) return false;
        // Cek apakah delivery ini untuk product yang sama
        if (del.items && Array.isArray(del.items)) {
          return del.items.some((item: any) => {
            const itemProductId = (item.productId || item.productKode || '').toString().trim();
            const itemSpkNo = (item.spkNo || '').toString().trim();
            // Skip jika untuk SPK ini sendiri
            if (itemSpkNo === currentSpkNo) return false;
            // Cek apakah product sama
            return itemProductId === spkProductId;
          });
        }
        return false;
      });
      
      // Hitung total qty dari delivery yang sudah dibuat untuk SPK lain
      deliveriesForOtherSPKs.forEach((del: any) => {
        if (del.items && Array.isArray(del.items)) {
          del.items.forEach((item: any) => {
            const itemProductId = (item.productId || item.productKode || '').toString().trim();
            const itemSpkNo = (item.spkNo || '').toString().trim();
            // Skip jika untuk SPK ini sendiri
            if (itemSpkNo === currentSpkNo) return;
            // Cek apakah product sama
            if (itemProductId === spkProductId) {
              const itemQty = parseFloat(item.qty || '0') || 0;
              stockUsedByOtherSPKs += itemQty;
            }
          });
        }
      });
      
      // Available stock = base stock - stock yang sudah digunakan oleh SPK lain
      const availableStock = Math.max(0, baseStock - stockUsedByOtherSPKs);
      
      // IMPORTANT: Validasi stock harus > 0 dan cukup untuk fulfill SPK ini
      // Jangan set stockFulfilled jika inventory kosong atau stock tidak cukup
      if (availableStock > 0 && availableStock >= spkQty) {
        hasAutoFulfilled = true;
        console.log(`✅ Auto-fulfill SPK ${s.spkNo}: Stock cukup (${availableStock} >= ${spkQty}), skip PR/Schedule/BOM/QC, langsung ke delivery`);
        
        // Update schedule progress jika ada
        const relatedSchedule = schedule.find((sch: any) => sch.spkNo === s.spkNo);
        if (relatedSchedule) {
          schedule = schedule.map((sch: any) => {
            if (sch.spkNo === s.spkNo) {
              return {
                ...sch,
                progress: spkQty, // Set progress = target
                updated: new Date().toISOString(),
              };
            }
            return sch;
          });
        }
        
        // Update production progress jika ada
        const relatedProduction = production.find((p: any) => p.spkNo === s.spkNo);
        if (relatedProduction) {
          production = production.map((p: any) => {
            if (p.spkNo === s.spkNo) {
              return {
                ...p,
                progress: spkQty, // Set progress = target
                producedQty: spkQty,
                updated: new Date().toISOString(),
              };
            }
            return p;
          });
        }
        
        // Mark SPK sebagai stock-fulfilled
        return {
          ...s,
          stockFulfilled: true,
          progress: spkQty, // Set progress = target untuk display
        };
      }
      
      return s;
    });
    
    // Save jika ada auto-fulfill
    if (hasAutoFulfilled) {
      await storageService.set('spk', autoFulfilledSpkList);
      if (schedule.length > 0) {
        await storageService.set('schedule', schedule);
      }
      if (production.length > 0) {
        await storageService.set('production', production);
      }
      console.log('✅ Auto-fulfilled SPK(s) from stock - ready for delivery');
    }
    
    setSpkData(hasAutoFulfilled ? autoFulfilledSpkList : (updatedSPK ? updatedSpkList : cleanedSpk));
    
    // IMPORTANT: Sync notifications dari schedule data yang sudah ada
    // Ini memastikan notifications dibuat untuk semua schedule yang punya deliveryBatches
    if (schedule && Array.isArray(schedule) && schedule.length > 0) {
      console.log('🔍 [PPIC] Syncing notifications from schedule data on load...');
      console.log(`🔍 [PPIC] Found ${schedule.length} schedule(s) to sync`);
      schedule.forEach((s: any) => {
        const batches = Array.isArray(s.deliveryBatches) ? s.deliveryBatches : [];
        const batchesForSJ = batches.filter((b: any) => b && b.createSJ !== false);
        console.log(`  📋 Schedule SPK ${s.spkNo}: ${batchesForSJ.length} batch(es) with createSJ=true`);
      });
      // DISABLED: Trigger delivery notifications dari schedule
      // try {
      //   await createNotificationsFromSchedule(schedule);
      // } catch (error) {
      //   console.error('❌ [PPIC] Error syncing notifications from schedule:', error);
      // }
      console.log('ℹ️ [PPIC] Delivery notification trigger from schedule is DISABLED');
    } else {
      console.log('ℹ️ [PPIC] No schedule data to sync notifications');
    }
    
    // Auto-fulfill PTP dari stock jika stock product cukup
    // Cek setiap PTP OPEN, jika stock product cukup, auto-fulfill (skip PR, Schedule, BOM, QC, langsung ke delivery)
    let hasAutoFulfilledPTP = false;
    const autoFulfilledPtpList = ptp.map((p: any) => {
      // Hanya proses PTP yang statusnya OPEN dan belum fulfilled
      if (p.status !== 'OPEN' || p.stockFulfilled) return p;
      
      const ptpQty = parseFloat(p.qty || '0') || 0;
      if (ptpQty <= 0) return p; // Skip jika qty 0
      
      // Cari product dari productItem (bisa nama atau kode)
      const productItemLower = (p.productItem || '').toLowerCase().trim();
      if (!productItemLower) return p; // Skip jika tidak ada productItem
      
      // Cari product di master products
      const product = productsData.find((prod: any) => {
        const productName = (prod.nama || '').toLowerCase().trim();
        const productCode = (prod.kode || '').toLowerCase().trim();
        const productId = (prod.product_id || '').toLowerCase().trim();
        return productName === productItemLower || 
               productCode === productItemLower || 
               productId === productItemLower ||
               productName.includes(productItemLower) ||
               productCode.includes(productItemLower);
      });
      
      if (!product) return p; // Skip jika product tidak ditemukan
      
      // Cari product di inventory menggunakan product_id atau kode
      const productId = (product.product_id || product.kode || '').toString().trim();
      if (!productId) return p; // Skip jika tidak ada product ID
      
      const inventoryItem = inventoryData.find((inv: any) => {
        const invCode = (inv.codeItem || '').toString().trim();
        return invCode === productId;
      });
      
      if (!inventoryItem) return p; // Skip jika product tidak ada di inventory
      
      // Hitung available stock
      const availableStock = inventoryItem.nextStock !== undefined 
        ? (inventoryItem.nextStock || 0)
        : (
            (inventoryItem.stockPremonth || 0) + 
            (inventoryItem.receive || 0) - 
            (inventoryItem.outgoing || 0) + 
            (inventoryItem.return || 0)
          );
      
      // Cek apakah stock cukup untuk fulfill PTP ini
      if (availableStock >= ptpQty) {
        hasAutoFulfilledPTP = true;
        console.log(`✅ Auto-fulfill PTP ${p.requestNo}: Stock cukup (${availableStock} >= ${ptpQty}), skip PR/Schedule/BOM/QC, langsung ke delivery`);
        
        // Mark PTP sebagai stock-fulfilled
        return {
          ...p,
          stockFulfilled: true,
          progress: ptpQty, // Set progress = target untuk display
        };
      }
      
      return p;
    });
    
    // Save jika ada auto-fulfill PTP
    if (hasAutoFulfilledPTP) {
      await storageService.set('ptp', autoFulfilledPtpList);
      console.log('✅ Auto-fulfilled PTP(s) from stock - ready for delivery');
    }
    
    setPtpData(hasAutoFulfilledPTP ? autoFulfilledPtpList : ptp);
    setScheduleData(schedule);
    setProductionData(production);
    setCustomers(customersData);
    setProducts(productsData);
    // ENHANCED: Filter active items for display (hide deleted items)
    setSalesOrders(filterActiveItems(salesOrdersData));
    setMaterials(materialsData);
    setBomData(bomDataLoaded);
    setInventory(inventoryData);
    setPurchaseOrders(purchaseOrdersData);
    setDeliveryNotes(deliveryNotesData);
    setPurchaseRequests(purchaseRequestsData);
  };

  // Group SPK by SO No (satu SO jadi satu baris dengan list SPK)
  const groupedSpkData = useMemo(() => {
    // Filter: Skip SPK utama yang sudah di-split menjadi batch SPK
    // Cek apakah ada SPK batch dengan pattern `${spkNo}-A`, `${spkNo}-B`, dst
    const filteredSpkData = spkData.filter((spk: any) => {
      const spkNo = (spk.spkNo || '').toString().trim();
      if (!spkNo) return true; // Skip jika tidak ada spkNo
      
      // Jika SPK ini punya originalSpkNo atau batchNo, berarti ini SPK batch (valid, jangan skip)
      if (spk.originalSpkNo || spk.batchNo) {
        return true;
      }
      
      // Cek apakah SPK ini sendiri adalah batch (punya pattern `-A`, `-B`, dst di akhir)
      // Pattern: "SPK-02/12/25/00003-A" adalah batch, "SPK-02/12/25/00003" adalah utama
      const isBatchSPK = /-[A-Z0-9]$/.test(spkNo);
      if (isBatchSPK) {
        return true; // Ini batch SPK, valid
      }
      
      // Cek apakah ada SPK batch yang berasal dari SPK ini
      // Pattern: SPK utama "SPK-02/12/25/00003" akan punya batch "SPK-02/12/25/00003-A", "SPK-02/12/25/00003-B", dst
      const hasBatchSPKs = spkData.some((otherSpk: any) => {
        const otherSpkNo = (otherSpk.spkNo || '').toString().trim();
        if (!otherSpkNo) return false;
        
        // Cek apakah otherSpk adalah batch dari spk ini
        // Pattern: otherSpkNo harus dimulai dengan spkNo + "-"
        if (otherSpkNo.startsWith(spkNo + '-')) {
          // Pastikan suffix adalah single letter (A, B, C, dst) atau angka
          const suffix = otherSpkNo.substring(spkNo.length + 1);
          // Valid jika suffix adalah single character (A-Z) atau single digit (0-9)
          if (suffix.length === 1 && /^[A-Z0-9]$/.test(suffix)) {
            return true;
          }
        }
        return false;
      });
      
      // Jika ada batch SPK, skip SPK utama ini
      if (hasBatchSPKs) {
        console.log(`⚠️ Filtering out main SPK ${spkNo} because it has batch SPKs`);
        return false;
      }
      
      return true;
    });
    
    // Group by SO No
    const grouped = filteredSpkData.reduce((acc: any, spk: any) => {
      const soNo = spk.soNo || '';
      if (!acc[soNo]) {
        // IMPORTANT: Gunakan confirmedAt atau created dari SO untuk sorting yang benar
        // Cari SO dari salesOrders untuk mendapatkan tanggal yang tepat
        // Pastikan pencarian case-sensitive dan exact match
        const so = salesOrders.find((s: any) => {
          if (!s || !s.soNo) return false;
          return String(s.soNo).trim() === String(soNo).trim();
        });
        // Prioritaskan confirmedAt, lalu created dari SO, baru fallback ke SPK created
        const soDate = so?.confirmedAt || so?.created || '';
        
        acc[soNo] = {
          soNo: soNo,
          customer: spk.customer || '',
          spkList: [],
          totalQty: 0,
          statuses: new Set<string>(),
          created: soDate || spk.created || '', // Prioritaskan SO date (confirmedAt atau created)
        };
      }
      
      // Get progress from schedule or production
      // Untuk SPK batch, cari schedule berdasarkan spkNo batch
      // Prioritaskan spk.progress jika ada (untuk stock-fulfilled SPK)
      const schedule = scheduleData.find((s: any) => s.spkNo === spk.spkNo);
      const production = productionData.find((p: any) => p.spkNo === spk.spkNo);
      const progress = spk.progress !== undefined 
        ? spk.progress 
        : (schedule?.progress || production?.progress || production?.producedQty || 0);
      const target = spk.qty || 0;
      
      acc[soNo].spkList.push({
        ...spk,
        progress: progress,
        target: target,
      });
      
      acc[soNo].totalQty += target;
      if (spk.status) acc[soNo].statuses.add(spk.status);
      
      // IMPORTANT: Jangan update created date jika sudah ada SO date
      // Hanya update jika tidak ada SO dan perlu fallback ke latest SPK date
      const so = salesOrders.find((s: any) => {
        if (!s || !s.soNo) return false;
        return String(s.soNo).trim() === String(soNo).trim();
      });
      if (!so) {
        // Jika tidak ada SO, gunakan latest SPK created date sebagai fallback
        if (spk.created && (!acc[soNo].created || spk.created > acc[soNo].created)) {
          acc[soNo].created = spk.created;
        }
      }
      // Jika ada SO, jangan update - sudah di-set di awal dengan SO date
      
      return acc;
    }, {});

    // Convert to array and sort: Terbaru di atas, SEMUA SPK CLOSE di bawah
    return Object.values(grouped).sort((a: any, b: any) => {
      // Priority 1: Hanya SO yang SEMUA SPK-nya CLOSE yang pindah ke bawah
      // Cek apakah semua SPK dalam SO itu statusnya CLOSE
      const allCloseA = a.spkList && a.spkList.length > 0 && a.spkList.every((spk: any) => spk.status === 'CLOSE');
      const allCloseB = b.spkList && b.spkList.length > 0 && b.spkList.every((spk: any) => spk.status === 'CLOSE');
      
      if (allCloseA !== allCloseB) {
        return allCloseA ? 1 : -1; // Semua CLOSE di bawah, yang masih ada OPEN di atas
      }
      
      // Priority 2: Yang paling baru di atas (berdasarkan confirmedAt atau created dari SO)
      // Pastikan date valid sebelum compare
      const dateAStr = a.created || '';
      const dateBStr = b.created || '';
      
      // Parse dates dengan validasi
      let dateA = 0;
      let dateB = 0;
      
      if (dateAStr) {
        const parsedA = new Date(dateAStr).getTime();
        dateA = isNaN(parsedA) ? 0 : parsedA;
      }
      
      if (dateBStr) {
        const parsedB = new Date(dateBStr).getTime();
        dateB = isNaN(parsedB) ? 0 : parsedB;
      }
      
      // Descending (newest first) - yang lebih besar (lebih baru) di atas
      return dateB - dateA;
    });
  }, [spkData, scheduleData, productionData, salesOrders]);

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
      
      // Sheet 1: SPK Data - Detail lengkap setiap SPK
      const spkDetailData: any[] = [];
      spkData.forEach((spk: any) => {
        const schedule = scheduleData.find((s: any) => s.spkNo === spk.spkNo);
        const production = productionData.find((p: any) => p.spkNo === spk.spkNo);
        const progress = schedule?.progress || production?.progress || production?.producedQty || 0;
        const target = spk.qty || 0;
        const remaining = target - progress;
        
        spkDetailData.push({
          spkNo: spk.spkNo || '',
          soNo: spk.soNo || '',
          customer: spk.customer || '',
          productCode: spk.productCode || spk.product || '',
          productName: spk.productName || spk.product || '',
          qty: target,
          unit: spk.unit || 'PCS',
          progress: progress,
          remaining: remaining,
          status: spk.status || '',
          scheduleDate: schedule?.scheduleDate || spk.scheduleDate || '',
          scheduleEndDate: schedule?.scheduleEndDate || '',
          created: spk.created || '',
          createdBy: spk.createdBy || '',
          notes: spk.notes || '',
          hasBOM: spk.bom && spk.bom.length > 0 ? 'Yes' : 'No',
          bomMaterialCount: spk.bom ? spk.bom.length : 0,
        });
      });

      if (spkDetailData.length > 0) {
        const spkColumns: ExcelColumn[] = [
          { key: 'spkNo', header: 'SPK No', width: 20 },
          { key: 'soNo', header: 'SO No', width: 20 },
          { key: 'customer', header: 'Customer', width: 30 },
          { key: 'productCode', header: 'Product Code', width: 20 },
          { key: 'productName', header: 'Product Name', width: 40 },
          { key: 'qty', header: 'Qty', width: 12, format: 'number' },
          { key: 'unit', header: 'Unit', width: 10 },
          { key: 'progress', header: 'Progress', width: 12, format: 'number' },
          { key: 'remaining', header: 'Remaining', width: 12, format: 'number' },
          { key: 'status', header: 'Status', width: 12 },
          { key: 'scheduleDate', header: 'Schedule Date', width: 18, format: 'date' },
          { key: 'scheduleEndDate', header: 'Schedule End Date', width: 18, format: 'date' },
          { key: 'created', header: 'Created Date', width: 18, format: 'date' },
          { key: 'createdBy', header: 'Created By', width: 15 },
          { key: 'hasBOM', header: 'Has BOM', width: 12 },
          { key: 'bomMaterialCount', header: 'BOM Materials', width: 15, format: 'number' },
          { key: 'notes', header: 'Notes', width: 40 },
        ];
        const wsSpk = createStyledWorksheet(spkDetailData, spkColumns, 'Sheet 1 - SPK');
        setColumnWidths(wsSpk, spkColumns);
        const totalQty = spkDetailData.reduce((sum, s) => sum + (s.qty || 0), 0);
        const totalProgress = spkDetailData.reduce((sum, s) => sum + (s.progress || 0), 0);
        addSummaryRow(wsSpk, spkColumns, {
          spkNo: 'TOTAL',
          qty: totalQty,
          progress: totalProgress,
        });
        XLSX.utils.book_append_sheet(wb, wsSpk, 'Sheet 1 - SPK');
      }

      // Sheet 2: PTP Data
      if (ptpData.length > 0) {
        const ptpDataExport = ptpData.map((ptp: any) => ({
          requestNo: ptp.requestNo || '',
          customer: ptp.customer || '',
          product: ptp.product || '',
          qty: ptp.qty || 0,
          unit: ptp.unit || '',
          status: ptp.status || '',
          created: ptp.created || '',
          createdBy: ptp.createdBy || '',
          notes: ptp.notes || '',
          matchedSO: ptp.matchedSO || '',
          matchedSPK: ptp.matchedSPK || '',
        }));

        const ptpColumns: ExcelColumn[] = [
          { key: 'requestNo', header: 'Request No', width: 20 },
          { key: 'customer', header: 'Customer', width: 30 },
          { key: 'product', header: 'Product', width: 40 },
          { key: 'qty', header: 'Qty', width: 12, format: 'number' },
          { key: 'unit', header: 'Unit', width: 10 },
          { key: 'status', header: 'Status', width: 15 },
          { key: 'matchedSO', header: 'Matched SO', width: 20 },
          { key: 'matchedSPK', header: 'Matched SPK', width: 20 },
          { key: 'created', header: 'Created Date', width: 18, format: 'date' },
          { key: 'createdBy', header: 'Created By', width: 15 },
          { key: 'notes', header: 'Notes', width: 40 },
        ];
        const wsPtp = createStyledWorksheet(ptpDataExport, ptpColumns, 'Sheet 2 - PTP');
        setColumnWidths(wsPtp, ptpColumns);
        const totalPtpQty = ptpDataExport.reduce((sum, p) => sum + (p.qty || 0), 0);
        addSummaryRow(wsPtp, ptpColumns, {
          requestNo: 'TOTAL',
          qty: totalPtpQty,
        });
        XLSX.utils.book_append_sheet(wb, wsPtp, 'Sheet 2 - PTP');
      }

      // Sheet 3: Schedule Data
      if (transformedScheduleData.length > 0) {
        const scheduleDataExport = transformedScheduleData.map((schedule: any) => ({
          scheduleDate: schedule.scheduleDate || '',
          scheduleEndDate: schedule.scheduleEndDate || '',
          soNo: schedule.soNo || '',
          spkNo: schedule.spkNo || '',
          customer: schedule.customer || '',
          productCode: schedule.productCode || '',
          productName: schedule.productName || '',
          qty: schedule.qty || 0,
          unit: schedule.unit || '',
          progress: schedule.progress || 0,
          remaining: (schedule.qty || 0) - (schedule.progress || 0),
          status: schedule.status || '',
          deliveryDate: schedule.deliveryDate || '',
        }));

        const scheduleColumns: ExcelColumn[] = [
          { key: 'scheduleDate', header: 'Schedule Date', width: 18, format: 'date' },
          { key: 'scheduleEndDate', header: 'Schedule End Date', width: 18, format: 'date' },
          { key: 'deliveryDate', header: 'Delivery Date', width: 18, format: 'date' },
          { key: 'soNo', header: 'SO No', width: 20 },
          { key: 'spkNo', header: 'SPK No', width: 20 },
          { key: 'customer', header: 'Customer', width: 30 },
          { key: 'productCode', header: 'Product Code', width: 20 },
          { key: 'productName', header: 'Product Name', width: 40 },
          { key: 'qty', header: 'Qty', width: 12, format: 'number' },
          { key: 'unit', header: 'Unit', width: 10 },
          { key: 'progress', header: 'Progress', width: 12, format: 'number' },
          { key: 'remaining', header: 'Remaining', width: 12, format: 'number' },
          { key: 'status', header: 'Status', width: 15 },
        ];
        const wsSchedule = createStyledWorksheet(scheduleDataExport, scheduleColumns, 'Sheet 3 - Schedule');
        setColumnWidths(wsSchedule, scheduleColumns);
        const totalScheduleQty = scheduleDataExport.reduce((sum, s) => sum + (s.qty || 0), 0);
        const totalScheduleProgress = scheduleDataExport.reduce((sum, s) => sum + (s.progress || 0), 0);
        addSummaryRow(wsSchedule, scheduleColumns, {
          scheduleDate: 'TOTAL',
          qty: totalScheduleQty,
          progress: totalScheduleProgress,
        });
        XLSX.utils.book_append_sheet(wb, wsSchedule, 'Sheet 3 - Schedule');
      }

      // Sheet 4: Outstanding (SPK + PTP dengan status OPEN)
      const outstandingSPK = spkData.filter((s: any) => s.status === 'OPEN');
      const outstandingPTP = ptpData.filter((p: any) => p.status === 'OPEN');
      const outstandingData: any[] = [];
      
      outstandingSPK.forEach((spk: any) => {
        outstandingData.push({
          type: 'SPK',
          no: spk.spkNo || '',
          soNo: spk.soNo || '',
          customer: spk.customer || '',
          product: spk.productName || spk.product || '',
          qty: spk.qty || 0,
          unit: spk.unit || 'PCS',
          status: spk.status || '',
          created: spk.created || '',
        });
      });
      
      outstandingPTP.forEach((ptp: any) => {
        outstandingData.push({
          type: 'PTP',
          no: ptp.requestNo || '',
          soNo: ptp.matchedSO || '',
          customer: ptp.customer || '',
          product: ptp.product || '',
          qty: ptp.qty || 0,
          unit: ptp.unit || '',
          status: ptp.status || '',
          created: ptp.created || '',
        });
      });

      if (outstandingData.length > 0) {
        const outstandingColumns: ExcelColumn[] = [
          { key: 'type', header: 'Type', width: 10 },
          { key: 'no', header: 'No', width: 20 },
          { key: 'soNo', header: 'SO No', width: 20 },
          { key: 'customer', header: 'Customer', width: 30 },
          { key: 'product', header: 'Product', width: 40 },
          { key: 'qty', header: 'Qty', width: 12, format: 'number' },
          { key: 'unit', header: 'Unit', width: 10 },
          { key: 'status', header: 'Status', width: 12 },
          { key: 'created', header: 'Created Date', width: 18, format: 'date' },
        ];
        const wsOutstanding = createStyledWorksheet(outstandingData, outstandingColumns, 'Sheet 4 - Outstanding');
        setColumnWidths(wsOutstanding, outstandingColumns);
        const totalOutstandingQty = outstandingData.reduce((sum, o) => sum + (o.qty || 0), 0);
        addSummaryRow(wsOutstanding, outstandingColumns, {
          type: 'TOTAL',
          qty: totalOutstandingQty,
        });
        XLSX.utils.book_append_sheet(wb, wsOutstanding, 'Sheet 4 - Outstanding');
      }

      // Sheet 5: SPK BOM Detail
      const bomDetailData: any[] = [];
      spkData.forEach((spk: any) => {
        if (spk.bom && spk.bom.length > 0) {
          spk.bom.forEach((bomItem: any) => {
            bomDetailData.push({
              spkNo: spk.spkNo || '',
              soNo: spk.soNo || '',
              customer: spk.customer || '',
              productCode: spk.productCode || spk.product || '',
              productName: spk.productName || spk.product || '',
              productQty: spk.qty || 0,
              materialId: bomItem.materialId || bomItem.material_id || '',
              materialName: bomItem.materialName || bomItem.material_name || '',
              materialUnit: bomItem.unit || '',
              materialQty: bomItem.qty || bomItem.ratio || 0,
              ratio: bomItem.ratio || 0,
            });
          });
        }
      });

      if (bomDetailData.length > 0) {
        const bomColumns: ExcelColumn[] = [
          { key: 'spkNo', header: 'SPK No', width: 20 },
          { key: 'soNo', header: 'SO No', width: 20 },
          { key: 'customer', header: 'Customer', width: 30 },
          { key: 'productCode', header: 'Product Code', width: 20 },
          { key: 'productName', header: 'Product Name', width: 40 },
          { key: 'productQty', header: 'Product Qty', width: 15, format: 'number' },
          { key: 'materialId', header: 'Material ID', width: 20 },
          { key: 'materialName', header: 'Material Name', width: 40 },
          { key: 'materialUnit', header: 'Material Unit', width: 15 },
          { key: 'materialQty', header: 'Material Qty', width: 15, format: 'number' },
          { key: 'ratio', header: 'Ratio', width: 12, format: 'number' },
        ];
        const wsBOM = createStyledWorksheet(bomDetailData, bomColumns, 'Sheet 5 - SPK BOM');
        setColumnWidths(wsBOM, bomColumns);
        const totalBomQty = bomDetailData.reduce((sum, b) => sum + (b.materialQty || 0), 0);
        addSummaryRow(wsBOM, bomColumns, {
          spkNo: 'TOTAL',
          materialQty: totalBomQty,
        });
        XLSX.utils.book_append_sheet(wb, wsBOM, 'Sheet 5 - SPK BOM');
      }

      if (wb.SheetNames.length === 0) {
        showAlert('No data available to export', 'Error');
        return;
      }

      const fileName = `PPIC_Complete_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Exported complete PPIC data (${spkDetailData.length} SPK, ${ptpData.length} PTP, ${transformedScheduleData.length} Schedule, ${outstandingData.length} Outstanding) to ${fileName}`, 'Success');
    } catch (error: any) {
      showAlert(`Error exporting to Excel: ${error.message}`, 'Error');
    }
  };

  // Transform scheduleData ke format ScheduleTable
  const transformedScheduleData = useMemo(() => {
    const result: any[] = [];
    
    // Defensive check: pastikan scheduleData adalah array
    if (!Array.isArray(scheduleData) || scheduleData.length === 0) {
      return result;
    }
    
    scheduleData.forEach((schedule: any) => {
      // Find SPK berdasarkan spkNo atau soNo
      let spk = schedule.spkNo ? spkData.find((s: any) => s.spkNo === schedule.spkNo) : null;
      
      // Jika tidak ketemu dengan spkNo, cari berdasarkan soNo
      if (!spk && schedule.soNo) {
        const matchingSPKs = spkData.filter((s: any) => s.soNo === schedule.soNo);
        if (matchingSPKs.length > 0) {
          spk = matchingSPKs[0]; // Ambil yang pertama sebagai referensi
        }
      }
      
      // Cek apakah schedule ini punya batch
      const hasBatches = schedule.batches && schedule.batches.length > 0;
      
      if (hasBatches) {
        // Jika ada batches, buat row untuk setiap batch (dan SKIP schedule utama)
        // Jika schedule punya spkNo, semua batch di-assign ke SPK tersebut
        // Jika schedule tidak punya spkNo, assign batch ke SPK yang sesuai berdasarkan soNo
        const matchingSPKs = schedule.soNo ? spkData.filter((s: any) => s.soNo === schedule.soNo) : [];
        
        schedule.batches.forEach((batch: any, batchIdx: number) => {
          // Jika schedule punya spkNo, semua batch di-assign ke SPK tersebut
          let assignedSPK = spk;
          
          if (schedule.spkNo) {
            // Schedule punya spkNo, semua batch untuk SPK ini
            assignedSPK = spk;
          } else if (matchingSPKs.length > 0) {
            // Schedule tidak punya spkNo, assign batch secara round-robin
            if (matchingSPKs.length === 1) {
              assignedSPK = matchingSPKs[0];
            } else if (batchIdx < matchingSPKs.length) {
              assignedSPK = matchingSPKs[batchIdx];
            } else {
              // Jika batch lebih banyak dari SPK, assign ke SPK terakhir
              assignedSPK = matchingSPKs[matchingSPKs.length - 1];
            }
          }
          
          // Cari delivery batch yang sesuai (berdasarkan batchNo atau qty yang sama)
          const deliveryBatch = schedule.deliveryBatches?.find((db: any) => 
            db.batchNo === batch.batchNo || (db.qty === batch.qty && !schedule.deliveryBatches?.find((d: any) => d.batchNo === batch.batchNo))
          );
          
          result.push({
            id: `${schedule.id || schedule.spkNo || 'batch'}-batch-${batch.id || batchIdx}`,
            spkNo: schedule.spkNo ? `${schedule.spkNo}-${batch.batchNo}` : (assignedSPK ? `${assignedSPK.spkNo}-${batch.batchNo}` : `BATCH-${batch.batchNo}`),
            soNo: schedule.soNo || assignedSPK?.soNo || '',
            customer: assignedSPK?.customer || '',
            poCustomer: schedule.soNo || assignedSPK?.soNo || '',
            code: assignedSPK?.product_id || assignedSPK?.kode || '',
            item: assignedSPK?.product || '',
            quantity: batch.qty || 0,
            unit: assignedSPK?.unit || 'PCS',
            scheduleDate: batch.startDate || schedule.scheduleStartDate || schedule.scheduleDate || '',
            scheduleStartDate: batch.startDate,
            scheduleEndDate: batch.endDate,
            scheduleDeliveryDate: deliveryBatch?.deliveryDate,
            status: (assignedSPK?.status || 'OPEN') as 'OPEN' | 'OPEN' | 'CLOSE',
            target: batch.qty || 0,
            progress: 0,
            remaining: batch.qty || 0,
            keterangan: schedule.keterangan || `Batch ${batch.batchNo}`,
            isBatch: true,
            batchNo: batch.batchNo,
          });
        });
        // SKIP schedule utama jika ada batches - hanya tampilkan batch-batchnya
      } else {
        // Jika TIDAK ada batch di schedule ini, tampilkan schedule utama
        if (schedule.spkNo && spk) {
          // Jika ada delivery batches tapi tidak ada production batches, ambil delivery date dari batch pertama
          const firstDeliveryBatch = schedule.deliveryBatches && schedule.deliveryBatches.length > 0 
            ? schedule.deliveryBatches[0] 
            : null;
          
          result.push({
            id: schedule.id || schedule.spkNo,
            spkNo: schedule.spkNo,
            soNo: schedule.soNo || spk?.soNo || '',
            customer: spk?.customer || '',
            poCustomer: schedule.soNo || spk?.soNo || '',
            code: spk?.product_id || spk?.kode || '',
            item: spk?.product || '',
            quantity: spk?.qty || 0,
            unit: spk?.unit || 'PCS',
            scheduleDate: schedule.scheduleStartDate || schedule.scheduleDate || '',
            scheduleStartDate: schedule.scheduleStartDate,
            scheduleEndDate: schedule.scheduleEndDate,
            scheduleDeliveryDate: firstDeliveryBatch?.deliveryDate || schedule.scheduleDeliveryDate,
            status: (spk?.status || 'OPEN') as 'OPEN' | 'OPEN' | 'CLOSE',
            target: spk?.qty || 0,
            progress: schedule.progress || 0,
            remaining: (spk?.qty || 0) - (schedule.progress || 0),
            keterangan: schedule.keterangan || '',
            isBatch: false,
          });
        }
      }
    });
    
    return result;
  }, [scheduleData, spkData]);

  // Filter SPK data berdasarkan search query (search semua field termasuk status)
  const filteredSpkData = useMemo(() => {
    let filtered = groupedSpkData;
    
    // Tab filter - Outstanding tab hanya show status OPEN
    if (activeTab === 'outstanding') {
      filtered = filtered.map((item: any) => {
        // Filter spkList untuk hanya yang status OPEN
        const openSpks = item.spkList.filter((spk: any) => spk.status === 'OPEN');
        
        // Jika tidak ada SPK OPEN, skip item ini
        if (openSpks.length === 0) {
          return null;
        }
        
        // Recalculate totalQty hanya dari SPK OPEN
        const totalQty = openSpks.reduce((sum: number, spk: any) => sum + (spk.qty || spk.target || 0), 0);
        
        // Update statuses untuk hanya berisi OPEN
        const statuses = new Set<string>();
        statuses.add('OPEN');
        
        return {
          ...item,
          spkList: openSpks,
          totalQty,
          statuses,
        };
      }).filter((item: any) => item !== null); // Remove null items
    }
    
    if (!searchQuery) return filtered;
    
    const query = searchQuery.toLowerCase();
    return filtered.filter((item: any) => {
      // Filter by SO No, Customer
      if (
        (item.soNo || '').toLowerCase().includes(query) ||
        (item.customer || '').toLowerCase().includes(query)
      ) {
        return true;
      }
      
      // Filter by status di level grouped (cek semua status dalam statuses)
      const statusesArray = Array.from(item.statuses || []) as string[];
      if (statusesArray.some((status: string) => (status || '').toLowerCase().includes(query))) {
        return true;
      }
      
      // Filter by SPK No, Product, Status, dan field lainnya dalam spkList
      return item.spkList.some((spk: any) => {
        return (
          (spk.spkNo || '').toLowerCase().includes(query) ||
          (spk.product || '').toLowerCase().includes(query) ||
          (spk.status || '').toLowerCase().includes(query) ||
          (spk.product_id || '').toLowerCase().includes(query) ||
          (spk.kode || '').toLowerCase().includes(query) ||
          String(spk.qty || '').includes(query) ||
          (spk.notes || '').toLowerCase().includes(query) ||
          (spk.specNote || '').toLowerCase().includes(query)
        );
      });
    });
  }, [groupedSpkData, searchQuery, activeTab]);

  // Filter PTP data berdasarkan search query (search semua field termasuk status)
  const filteredPtpData = useMemo(() => {
    if (!searchQuery) return ptpData;
    
    const query = searchQuery.toLowerCase();
    return ptpData.filter((item: any) => {
      return (
        (item.requestNo || '').toLowerCase().includes(query) ||
        (item.customer || '').toLowerCase().includes(query) ||
        (item.productItem || '').toLowerCase().includes(query) ||
        (item.reason || '').toLowerCase().includes(query) ||
        (item.status || '').toLowerCase().includes(query) ||
        (item.unit || '').toLowerCase().includes(query) ||
        String(item.qty || '').includes(query) ||
        (item.soNo || '').toLowerCase().includes(query) ||
        (item.linkedSO || '').toLowerCase().includes(query) ||
        (item.notes || '').toLowerCase().includes(query)
      );
    });
  }, [ptpData, searchQuery]);

  // Get row color based on Customer (theme-aware selang-seling dengan warna berbeda)
  const getRowColor = (customer: string): string => {
    // Ambil semua customer unik dari filteredSpkData
    const uniqueCustomers = Array.from(new Set(filteredSpkData.map((g: any) => g.customer || '').filter((c: string) => c !== '')));
    const customerIndex = uniqueCustomers.findIndex((c: string) => c === customer);
    const theme = document.documentElement.getAttribute('data-theme');
    // Warna selang-seling yang lebih berbeda dan mudah dibedakan
    const rowColors = theme === 'light' 
      ? [
          '#f0f7ff', // Biru muda
          '#fff5f0', // Orange muda
          '#f0fff4', // Hijau muda
          '#fff0f5', // Pink muda
          '#f5f0ff', // Ungu muda
          '#fffef0', // Kuning muda
        ]
      : [
          '#2a4a6a', // Biru gelap (lebih terang)
          '#5a4a3a', // Orange gelap (lebih terang)
          '#3a5a4a', // Hijau gelap (lebih terang)
          '#5a3a4a', // Pink gelap (lebih terang)
          '#4a3a5a', // Ungu gelap (lebih terang)
          '#5a5a3a', // Kuning gelap (lebih terang)
        ];
    const index = customerIndex >= 0 ? customerIndex : 0;
    return rowColors[index % rowColors.length];
  };

  // Filter SO yang sudah confirmed tapi belum dibuat SPK
  const confirmedSOsPending = useMemo(() => {
    return salesOrders.filter((so: any) => {
      // SO harus confirmed
      if (!so.confirmed) return false;
      
      // Cek apakah sudah ada SPK untuk SO ini
      const hasSPK = spkData.some((spk: any) => spk.soNo === so.soNo);
      
      // Return true jika confirmed tapi belum ada SPK
      return !hasSPK;
    });
  }, [salesOrders, spkData]);

  // Handle view SO detail
  const handleViewSODetail = useCallback((so: any) => {
    setViewingSO(so);
  }, []);

  // Format confirmedSOsPending menjadi notifications untuk NotificationBell
  const soNotifications = useMemo(() => {
    return confirmedSOsPending.map((so: any) => ({
      id: so.id,
      title: `SO ${so.soNo} - ${so.customer}`,
      message: `Products: ${(so.items || []).length} | Confirmed: ${so.confirmedAt ? new Date(so.confirmedAt).toLocaleDateString('id-ID') : '-'}`,
      timestamp: so.confirmedAt || so.created,
      onClick: () => handleViewSODetail(so),
      so: so, // Keep original data
    }));
  }, [confirmedSOsPending, handleViewSODetail]);

  // Handle save schedule and SPK
  const handleSaveScheduleAndSPK = async (scheduleInfo: any, bomData: any) => {
    try {
      // Save SPKs
      const updatedSPKs = [...spkData, ...pendingSPKs];
      await storageService.set('spk', updatedSPKs);
      setSpkData(updatedSPKs);
      
      // Save schedules
      const newSchedules = pendingSPKs.map((spk: any, idx: number) => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9) + idx,
        spkNo: spk.spkNo,
        soNo: spk.soNo,
        scheduleStartDate: scheduleInfo.startDate ? new Date(scheduleInfo.startDate).toISOString() : new Date().toISOString(),
        scheduleEndDate: scheduleInfo.endDate ? new Date(scheduleInfo.endDate).toISOString() : new Date().toISOString(),
        batches: (bomData && bomData.batches) ? bomData.batches : [],
        progress: 0,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      }));
      
      const updatedSchedules = [...scheduleData, ...newSchedules];
      await storageService.set('schedule', updatedSchedules);
      setScheduleData(updatedSchedules);

      // Kirim notifikasi ke Production untuk setiap SPK yang dibuat
      const productionNotifications = await storageService.get<any[]>('productionNotifications') || [];
      const newNotifications = pendingSPKs.map((spk: any) => {
        const existingNotification = productionNotifications.find((n: any) => 
          n.spkNo === spk.spkNo && n.productId === (spk.product_id || spk.kode)
        );
        if (existingNotification) return null; // Skip jika sudah ada untuk kombinasi SPK + product
        
        const schedule = newSchedules.find((s: any) => s.spkNo === spk.spkNo);
        return {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          type: 'PRODUCTION_SCHEDULE',
          spkNo: spk.spkNo,
          soNo: spk.soNo,
          customer: spk.customer || '',
          product: spk.product || '',
          productId: spk.product_id || spk.kode || '',
          qty: spk.qty || 0,
          scheduleStartDate: schedule?.scheduleStartDate || new Date().toISOString(),
          scheduleEndDate: schedule?.scheduleEndDate || new Date().toISOString(),
          batches: schedule?.batches || [],
          status: 'WAITING_MATERIAL',
          materialStatus: 'PENDING',
          created: new Date().toISOString(),
        };
      }).filter((n: any) => n !== null);

      if (newNotifications.length > 0) {
        await storageService.set('productionNotifications', [...productionNotifications, ...newNotifications]);
        console.log(`✅ Production notifications created: ${newNotifications.length} notifications`);
      }
      
      showAlert(`SPK dan Schedule berhasil dibuat!\n\n${pendingSPKs.length} SPK telah dibuat.\n📧 Notifications sent to Production - Waiting for material receipt from Purchasing`, 'Success');
      setPendingSPKs([]);
      loadData();
    } catch (error: any) {
      showAlert(`Error saving schedule and SPK: ${error.message}`, 'Error');
    }
  };

  // Reset search saat ganti tab
  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);

  const tabs = [
    { id: 'spk', label: 'SPK' },
    { id: 'ptp', label: 'Permintaan Tanpa PO' },
    { id: 'outstanding', label: `Outstanding (${(spkData.filter(s => s.status === 'OPEN').length + ptpData.filter(p => p.status === 'OPEN').length)})` },
    { id: 'schedule', label: 'Schedule' },
    { id: 'analisa', label: 'Analisa' },
  ];

  const spkColumns = [
    { 
      key: 'soNo', 
      header: 'SO No',
      render: (item: any) => {
        // Hitung status general: CLOSE jika semua SPK sudah CLOSE, selain itu OPEN
        const allSPKsClosed = item.spkList.every((spk: any) => {
          const status = spk.status || 'OPEN';
          return status === 'CLOSE';
        });
        const generalStatus = allSPKsClosed ? 'CLOSE' : 'OPEN';
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <strong style={{ color: '#2e7d32', fontSize: '14px' }}>{item.soNo}</strong>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className={`status-badge status-${generalStatus.toLowerCase()}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                {generalStatus}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                ({item.spkList.filter((spk: any) => (spk.status || 'OPEN') === 'CLOSE').length}/{item.spkList.length} SPK)
              </span>
            </div>
          </div>
        );
      },
    },
    { 
      key: 'customer', 
      header: 'Customer',
      render: (item: any) => (
        <span style={{ color: 'var(--text-primary)' }}>{item.customer}</span>
      ),
    },
    {
      key: 'spkDetails',
      header: 'SPK Details',
      render: (item: any) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* General Schedule Button */}
          <div style={{ 
            marginBottom: '4px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--border-color)'
          }}>
            <Button 
              variant="secondary" 
              onClick={() => handleGeneralScheduleForSO(item)}
              style={{ 
                fontSize: '12px', 
                padding: '6px 12px', 
                backgroundColor: '#4caf50', 
                color: '#fff',
                width: '100%'
              }}
            >
              📅 General Schedule
            </Button>
          </div>
          
          {/* SPK Cards Grid - 2 columns */}
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
          }}>
            {item.spkList.map((spk: any, idx: number) => {
              // Cari schedule: untuk batch SPK, schedule mungkin masih menggunakan SPK utama
              const spkNo = (spk.spkNo || '').toString().trim();
              const isBatchSPK = spk.batchNo || spk.originalSpkNo || /-[A-Z0-9]$/.test(spkNo);
              
              let schedule = scheduleData.find((s: any) => s.spkNo === spk.spkNo);
              
              // Jika tidak ketemu dan ini batch SPK, coba cari schedule berdasarkan originalSpkNo atau base SPK number
              if (!schedule && isBatchSPK) {
                if (spk.originalSpkNo) {
                  schedule = scheduleData.find((s: any) => s.spkNo === spk.originalSpkNo);
                } else if (/-[A-Z0-9]$/.test(spkNo)) {
                  // Extract base SPK number (remove suffix -A, -B, dst)
                  const baseSpkNo = spkNo.replace(/-[A-Z0-9]$/, '');
                  schedule = scheduleData.find((s: any) => s.spkNo === baseSpkNo);
                }
              }
              
              const progress = spk.progress || 0;
              
              // IMPORTANT: Progress display (product qty) adalah qty barang yang diproduksi
              // JANGAN pakai calculatedOverrideQty atau material override untuk progress display
              // Progress display harus ikutin qty asli dari SPK/SO atau qty batch jika sudah dibagi batch
              // Material override hanya untuk material requirement, BUKAN untuk product qty display
              let target = spk.qty || 0; // Pakai qty asli dari SPK (dari SO), bukan spk.target atau calculatedOverrideQty
              
              if (isBatchSPK && schedule && schedule.batches && schedule.batches.length > 0) {
                // SPK ini adalah batch SPK, cari batch yang sesuai
                // IMPORTANT: Untuk batch SPK, progress display HARUS pakai batch qty dari schedule (terbaru)
                // Bukan spk.qty yang mungkin sudah outdated
                let matchingBatch = null;
                
                // Cek berdasarkan batchNo jika ada
                if (spk.batchNo) {
                  matchingBatch = schedule.batches.find((b: any) => b.batchNo === spk.batchNo);
                }
                
                // Jika tidak ketemu, cek berdasarkan suffix SPK number (A, B, C, dst)
                if (!matchingBatch && /-([A-Z0-9])$/.test(spkNo)) {
                  const batchSuffix = spkNo.match(/-([A-Z0-9])$/)?.[1];
                  if (batchSuffix) {
                    matchingBatch = schedule.batches.find((b: any) => 
                      b.batchNo === batchSuffix || 
                      (b.batchNo && b.batchNo.toUpperCase() === batchSuffix.toUpperCase())
                    );
                  }
                }
                
                // Jika masih tidak ketemu, ambil batch berdasarkan index
                if (!matchingBatch && schedule.batches.length > 0) {
                  const batchIndex = spkNo.match(/-([A-Z0-9])$/)?.[1];
                  if (batchIndex) {
                    const charCode = batchIndex.charCodeAt(0);
                    const index = charCode >= 65 && charCode <= 90 ? charCode - 65 : (charCode >= 48 && charCode <= 57 ? charCode - 48 : 0);
                    if (index >= 0 && index < schedule.batches.length) {
                      matchingBatch = schedule.batches[index];
                    }
                  }
                }
                
                // IMPORTANT: Untuk batch SPK, SELALU pakai batch qty dari schedule jika ada
                // Jangan pakai spk.qty karena mungkin sudah outdated
                if (matchingBatch && matchingBatch.qty !== undefined && matchingBatch.qty !== null) {
                  target = matchingBatch.qty;
                } else if (schedule.batches.length > 0) {
                  // Fallback: jika tidak ketemu matching batch, coba ambil batch pertama
                  // Atau pakai qty SPK asli jika tidak ada batch sama sekali
                  const firstBatch = schedule.batches[0];
                  if (firstBatch && firstBatch.qty !== undefined && firstBatch.qty !== null) {
                    target = firstBatch.qty;
                  } else {
                    target = spk.qty || 0;
                  }
                }
              }
              
              const progressText = `${progress}/${target}`;
              
              // Tentukan warna berdasarkan kondisi
              let progressColor = '#d32f2f'; // Merah default (kurang dari target)
              if (progress === target && target > 0) {
                progressColor = '#2e7d32'; // Hijau (sama dengan target)
              } else if (progress > target) {
                progressColor = '#f57c00'; // Kuning (lebih dari target)
              }
              
              const formatDate = (dateStr: string | undefined) => {
                if (!dateStr) return '-';
                try {
                  const date = new Date(dateStr);
                  if (isNaN(date.getTime())) return '-';
                  const day = String(date.getDate()).padStart(2, '0');
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const year = date.getFullYear();
                  return `${day}/${month}/${year}`;
                } catch {
                  return '-';
                }
              };
              
              const hasProductionBatches = schedule?.batches && schedule.batches.length > 0;
              const hasDeliveryBatches = schedule?.deliveryBatches && schedule.deliveryBatches.length > 0;
              
              // Cek PR
              const spkNoNormalized = (spk.spkNo || '').toString().trim();
              const relatedPR = purchaseRequests.find((pr: any) => {
                const prSpkNo = (pr.spkNo || '').toString().trim();
                if (!prSpkNo || prSpkNo === '') return false;
                if (prSpkNo !== spkNoNormalized) return false;
                const prProduct = (pr.product || '').toString().trim();
                const spkProduct = (spk.product || '').toString().trim();
                if (prProduct && spkProduct && prProduct !== spkProduct) return false;
                return true;
              });
              const hasPR = !!relatedPR;
              const prIsApproved = relatedPR && (relatedPR.status === 'APPROVED' || relatedPR.status === 'PO_CREATED');
              
              // Cek Schedule
              const hasSchedule = schedule && schedule.scheduleStartDate;
              
              // Cek BOM dan hitung kebutuhan material
              const productId = (spk.product_id || spk.productId || spk.kode || spk.productKode || '').toString().trim();
              const productBOM = bomData.filter((b: any) => {
                const bomProductId = (b.product_id || b.kode || '').toString().trim();
                if (!productId || !bomProductId) return false;
                return bomProductId.toLowerCase() === productId.toLowerCase();
              });
              const hasBOM = productBOM.length > 0; // BOM ada jika data BOM ada, tidak perlu schedule/PR
              
              // Hitung kebutuhan material berdasarkan BOM dan qty SPK
              // IMPORTANT: Untuk batch SPK, material requirement harus pakai batch qty dari schedule
              // Bukan dari override calculation, karena user yang bagi batch
              const spkBOMOverride = spk.bomOverride || {};
              
              // Untuk batch SPK, pakai batch qty dari schedule (sama seperti progress display)
              let targetForMaterial = spk.target || spk.qty || 0;
              let matchingBatchForMaterial: any = null; // Simpan matchingBatch untuk digunakan di material calculation
              
              if (isBatchSPK && schedule && schedule.batches && schedule.batches.length > 0) {
                // SPK ini adalah batch SPK, cari batch yang sesuai (sama seperti progress display)
                let matchingBatch = null;
                
                if (spk.batchNo) {
                  matchingBatch = schedule.batches.find((b: any) => b.batchNo === spk.batchNo);
                }
                
                if (!matchingBatch && /-([A-Z0-9])$/.test(spkNo)) {
                  const batchSuffix = spkNo.match(/-([A-Z0-9])$/)?.[1];
                  if (batchSuffix) {
                    matchingBatch = schedule.batches.find((b: any) => 
                      b.batchNo === batchSuffix || 
                      (b.batchNo && b.batchNo.toUpperCase() === batchSuffix.toUpperCase())
                    );
                  }
                }
                
                if (!matchingBatch && schedule.batches.length > 0) {
                  const batchIndex = spkNo.match(/-([A-Z0-9])$/)?.[1];
                  if (batchIndex) {
                    const charCode = batchIndex.charCodeAt(0);
                    const index = charCode >= 65 && charCode <= 90 ? charCode - 65 : (charCode >= 48 && charCode <= 57 ? charCode - 48 : 0);
                    if (index >= 0 && index < schedule.batches.length) {
                      matchingBatch = schedule.batches[index];
                    }
                  }
                }
                
                if (matchingBatch && matchingBatch.qty) {
                  targetForMaterial = matchingBatch.qty;
                  matchingBatchForMaterial = matchingBatch; // Simpan untuk digunakan di material calculation
                }
              } else {
                // Bukan batch SPK, hitung dari override jika ada
                let calculatedOverrideQtyForMaterial: number | undefined = undefined;
                if (Object.keys(spkBOMOverride).length > 0) {
                  let maxOverrideQty = 0;
                  for (const bom of productBOM) {
                    const bomMaterialId = (bom.material_id || '').toString().trim();
                    if (spkBOMOverride[bomMaterialId] !== undefined && spkBOMOverride[bomMaterialId] !== null) {
                      const overrideQty = parseFloat(spkBOMOverride[bomMaterialId]) || 0;
                      const ratio = parseFloat(bom.ratio) || 1;
                      const calculatedQty = ratio > 0 ? overrideQty / ratio : overrideQty;
                      if (calculatedQty > maxOverrideQty) {
                        maxOverrideQty = calculatedQty;
                      }
                    }
                  }
                  
                  if (maxOverrideQty > 0) {
                    calculatedOverrideQtyForMaterial = Math.ceil(maxOverrideQty);
                  }
                }
                
                targetForMaterial = spk.overrideQty || calculatedOverrideQtyForMaterial || spk.target || spk.qty || 0;
              }
              
              const spkQtyForMaterial = targetForMaterial;
              const bomMaterials: Array<{ materialId: string; materialName: string; requiredQty: number; unit: string }> = [];
              
              if (productBOM.length > 0 && spkQtyForMaterial > 0) {
                const bomMap = new Map<string, { materialId: string; materialName: string; requiredQty: number; unit: string }>();
                productBOM.forEach((bom: any) => {
                  const materialId = (bom.material_id || '').toString().trim();
                  if (!materialId) return;
                  
                  const material = materials.find((m: any) => 
                    ((m.material_id || m.kode || '').toString().trim()) === materialId
                  );
                  
                  // IMPORTANT: Jika ada BOM override untuk material ini, bagi proporsional dengan batch qty
                  // Jika tidak ada override, gunakan ratio calculation dengan batch qty
                  let requiredQty: number;
                  if (spkBOMOverride[materialId] !== undefined && spkBOMOverride[materialId] !== null) {
                    // Ada override qty untuk material ini
                    // Untuk batch SPK, override qty harus dibagi proporsional dengan batch qty
                    if (isBatchSPK && schedule && schedule.batches && schedule.batches.length > 0) {
                      // Hitung total qty dari semua batch untuk mendapatkan original SPK qty
                      const totalBatchQty = schedule.batches.reduce((sum: number, b: any) => sum + (b.qty || 0), 0);
                      const batchQty = matchingBatchForMaterial ? (matchingBatchForMaterial.qty || 0) : spkQtyForMaterial;
                      
                      // Hitung proporsi batch qty terhadap total batch qty
                      const batchRatio = totalBatchQty > 0 ? batchQty / totalBatchQty : 1;
                      
                      // Bagi override qty proporsional dengan batch qty
                      const overrideQty = parseFloat(spkBOMOverride[materialId]) || 0;
                      requiredQty = overrideQty * batchRatio;
                    } else {
                      // Bukan batch SPK, pakai override qty langsung
                      requiredQty = parseFloat(spkBOMOverride[materialId]) || 0;
                    }
                  } else {
                    // Tidak ada override, gunakan ratio calculation dengan batch qty
                    requiredQty = spkQtyForMaterial * (bom.ratio || 1);
                  }
                  
                  if (bomMap.has(materialId)) {
                    bomMap.get(materialId)!.requiredQty += requiredQty;
                  } else {
                    bomMap.set(materialId, {
                      materialId,
                      materialName: material?.nama || materialId,
                      requiredQty,
                      unit: material?.satuan || material?.unit || 'PCS',
                    });
                  }
                });
                bomMaterials.push(...Array.from(bomMap.values()));
              }
              
              // Gunakan warna customer dari SO parent untuk background card
              const cardBgColor = getRowColor(item.customer || '');
              
              return (
                <div key={spk.id || idx} style={{ 
                  padding: '12px',
                  backgroundColor: cardBgColor, 
                  borderRadius: '6px',
                  fontSize: '12px',
                  border: '1px solid var(--border-color)',
                  borderLeft: '4px solid var(--primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}>
                  {/* SPK Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '2px' }}>
                        {spk.spkNo}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
                        {spk.product}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <div>
                        {/* Status per SPK - independent dari status general */}
                        <span className={`status-badge status-${(spk.status === 'DRAFT' ? 'OPEN' : spk.status || 'OPEN').toLowerCase()}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                          {spk.status === 'DRAFT' ? 'OPEN' : (spk.status || 'OPEN')}
                        </span>
                        {spk.stockFulfilled && (
                          <span style={{ 
                            fontSize: '9px', 
                            padding: '4px 8px', 
                            backgroundColor: '#4caf50', 
                            color: '#fff', 
                            borderRadius: '6px',
                            marginLeft: '4px',
                            border: '2px solid #66bb6a',
                            boxShadow: '0 2px 4px rgba(76, 175, 80, 0.3)',
                            fontWeight: '600',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            📦 Stock Ready
                          </span>
                        )}
                      </div>
                      <div style={{ 
                        fontSize: '11px', 
                        fontWeight: 'bold', 
                        color: progressColor,
                        padding: '6px 10px',
                        backgroundColor: progressColor === '#2e7d32' ? '#e8f5e9' : progressColor === '#f57c00' ? '#fff3e0' : '#ffebee',
                        borderRadius: '6px',
                        border: `2px solid ${progressColor}`,
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                        minWidth: '60px',
                        textAlign: 'center'
                      }}>
                        {progressText}
                      </div>
                    </div>
                  </div>
                  
                  {/* Schedule Info - Production & Delivery */}
                  {schedule && (
                    <div style={{ 
                      padding: '10px',
                      backgroundColor: 'var(--bg-tertiary)',
                      borderRadius: '8px',
                      border: '2px solid var(--border-color)',
                      fontSize: '10px',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                    }}>
                      {/* Production Schedule - Horizontal Layout */}
                      {hasProductionBatches ? (
                        <div style={{ marginBottom: hasDeliveryBatches ? '8px' : '0' }}>
                          <div style={{ 
                            fontSize: '10px', 
                            fontWeight: 'bold', 
                            color: '#2196F3', 
                            marginBottom: '4px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px',
                            padding: '4px 8px',
                            backgroundColor: 'rgba(33, 150, 243, 0.1)',
                            borderRadius: '6px',
                            border: '2px solid #2196F3',
                            boxShadow: '0 2px 4px rgba(33, 150, 243, 0.2)'
                          }}>
                            <span style={{ fontSize: '14px', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>🏭</span>
                            <span>Schedule</span>
                            {schedule.scheduleStartDate && schedule.scheduleEndDate && (
                              <span style={{ fontSize: '9px', fontWeight: 'normal' }}>
                                {formatDate(schedule.scheduleStartDate)} - {formatDate(schedule.scheduleEndDate)}
                              </span>
                            )}
                            <span style={{ marginLeft: 'auto', fontSize: '9px', fontWeight: 'normal' }}>
                              Batches:
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                            {schedule.batches.map((batch: any, batchIdx: number) => (
                              <div key={batch.id || batchIdx} style={{ 
                                fontSize: '9px', 
                                color: 'var(--text-primary)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 6px',
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: '4px',
                                border: '1px solid var(--border-color)'
                              }}>
                                <span style={{ fontWeight: 'bold' }}>Batch {batch.batchNo || String.fromCharCode(65 + batchIdx)}</span>
                                <span>Qty: {batch.qty}</span>
                                {batch.startDate && batch.endDate && (
                                  <span style={{ color: 'var(--text-secondary)' }}>
                                    {formatDate(batch.startDate)} - {formatDate(batch.endDate)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : schedule.scheduleStartDate ? (
                        <div style={{ 
                          fontSize: '10px', 
                          color: '#2196F3', 
                          marginBottom: hasDeliveryBatches ? '4px' : '0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 8px',
                          backgroundColor: 'rgba(33, 150, 243, 0.1)',
                          borderRadius: '6px',
                          border: '2px solid #2196F3',
                          boxShadow: '0 2px 4px rgba(33, 150, 243, 0.2)'
                        }}>
                          <span style={{ fontSize: '14px', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>🏭</span>
                          <span>Schedule</span>
                          <span>{formatDate(schedule.scheduleStartDate)} - {formatDate(schedule.scheduleEndDate)}</span>
                        </div>
                      ) : null}
                      
                      {/* Delivery Schedule */}
                      {hasDeliveryBatches && (
                        <div style={{ 
                          marginTop: hasProductionBatches ? '6px' : '0',
                          paddingTop: hasProductionBatches ? '6px' : '0',
                          borderTop: hasProductionBatches ? '1px solid var(--border-color)' : 'none',
                        }}>
                          <div style={{ 
                            fontSize: '10px', 
                            fontWeight: 'bold', 
                            color: '#4caf50', 
                            marginBottom: '4px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px',
                            padding: '4px 8px',
                            backgroundColor: 'rgba(76, 175, 80, 0.1)',
                            borderRadius: '6px',
                            border: '2px solid #4caf50',
                            boxShadow: '0 2px 4px rgba(76, 175, 80, 0.2)'
                          }}>
                            <span style={{ fontSize: '14px', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>🚚</span>
                            <span>Deliv: {schedule.deliveryBatches.length} batch</span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '2px' }}>
                            {schedule.deliveryBatches.slice(0, 2).map((batch: any, batchIdx: number) => (
                              <div key={batch.id || batchIdx} style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
                                {batch.batchNo || String.fromCharCode(65 + batchIdx)}: {formatDate(batch.deliveryDate)}
                                {batch.sjGroupId && (
                                  <span style={{ marginLeft: '4px', padding: '1px 4px', backgroundColor: '#4caf50', color: '#fff', borderRadius: '2px', fontSize: '8px' }}>
                                    {batch.sjGroupId.replace('sj-group-', 'SJ-')}
                                  </span>
                                )}
                              </div>
                            ))}
                            {schedule.deliveryBatches.length > 2 && (
                              <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
                                +{schedule.deliveryBatches.length - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* BOM Materials Info */}
                  {bomMaterials.length > 0 && (
                    <div style={{
                      padding: '8px 10px',
                      backgroundColor: 'rgba(156, 39, 176, 0.1)',
                      borderRadius: '8px',
                      border: '2px solid rgba(156, 39, 176, 0.3)',
                      fontSize: '10px',
                      marginTop: '4px',
                      boxShadow: '0 2px 6px rgba(156, 39, 176, 0.2)',
                    }}>
                      <div style={{ 
                        fontWeight: 'bold', 
                        color: '#9c27b0', 
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        <span style={{ fontSize: '14px' }}>🧱</span>
                        <span>BOM Materials ({bomMaterials.length})</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
                        {bomMaterials.map((mat: any, matIdx: number) => (
                          <div key={mat.materialId || matIdx} style={{ 
                            fontSize: '10px',
                            color: '#fff',
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '8px',
                            padding: '3px 6px',
                            backgroundColor: 'rgba(156, 39, 176, 0.2)',
                            borderRadius: '4px',
                            border: '1px solid rgba(156, 39, 176, 0.3)',
                          }}>
                            <span style={{ flex: 1 }}>
                              {mat.materialName}
                            </span>
                            <span style={{ fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap' }}>
                              {Math.ceil(mat.requiredQty)} {mat.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Stock Fulfilled Info */}
                  {spk.stockFulfilled && (
                    <div style={{
                      padding: '8px 10px',
                      backgroundColor: '#e8f5e9',
                      borderRadius: '8px',
                      fontSize: '10px',
                      color: '#2e7d32',
                      border: '2px solid #4caf50',
                      marginTop: '4px',
                      boxShadow: '0 2px 6px rgba(76, 175, 80, 0.2)',
                      fontWeight: '500',
                    }}>
                      ✅ Stock cukup - Skip PR/Schedule/BOM/QC, langsung ke Delivery
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div style={{ 
                    display: 'flex',
                    gap: '4px',
                    flexWrap: 'wrap',
                    marginTop: '4px',
                    position: 'relative',
                    zIndex: 1,
                    pointerEvents: 'auto',
                  }}>
                    {!spk.stockFulfilled && (
                      <>
                        <Button 
                          variant="secondary" 
                          onClick={() => handleViewProductBOM(spk)}
                          style={{ fontSize: '10px', padding: '3px 6px' }}
                        >
                          View BOM
                        </Button>
                        {(spk.status || 'OPEN').toUpperCase() === 'OPEN' && (
                          <Button 
                            variant="secondary" 
                            onClick={() => handleEditBOM(spk)}
                            style={{ fontSize: '10px', padding: '3px 6px' }}
                          >
                            Edit BOM
                          </Button>
                        )}
                        <Button 
                          variant="secondary" 
                          onClick={() => handleCreatePR(spk)}
                          disabled={creatingPR[spk.spkNo] || prIsApproved || false}
                          style={{ 
                            fontSize: '10px', 
                            padding: '3px 6px',
                            opacity: (creatingPR[spk.spkNo] || prIsApproved) ? 0.5 : 1,
                            cursor: (creatingPR[spk.spkNo] || prIsApproved) ? 'not-allowed' : 'pointer',
                            backgroundColor: prIsApproved ? 'var(--success)' : undefined,
                            color: prIsApproved ? '#fff' : undefined
                          }}
                        >
                          {creatingPR[spk.spkNo] ? '...' : prIsApproved ? 'PR✓' : 'PR'}
                        </Button>
                        {hasPR && (
                          <Button 
                            variant="secondary" 
                            onClick={() => handleViewPR(spk)}
                            style={{ fontSize: '10px', padding: '3px 6px' }}
                          >
                            View PR
                          </Button>
                        )}
                        <Button 
                          variant="secondary" 
                          onClick={() => handleScheduleSPK(spk)}
                          style={{ fontSize: '10px', padding: '3px 6px' }}
                        >
                          Schedule
                        </Button>
                      </>
                    )}
                    {spk.stockFulfilled && (
                      <div style={{
                        fontSize: '10px',
                        color: '#4caf50',
                        fontWeight: 'bold',
                        padding: '3px 6px',
                      }}>
                        🚀 Ready for Delivery
                      </div>
                    )}
                    <Button 
                      variant="secondary" 
                      onClick={(e?: React.MouseEvent<HTMLButtonElement>) => {
                        if (e) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                        console.log('🔍 [PPIC] Status button clicked for SPK:', spk.spkNo);
                        handleUpdateStatus(spk);
                      }}
                      style={{ 
                        fontSize: '10px', 
                        padding: '3px 6px',
                        position: 'relative',
                        zIndex: 10,
                        pointerEvents: 'auto',
                        cursor: 'pointer'
                      }}
                    >
                      Status
                    </Button>
                    <Button 
                      variant="danger" 
                      onClick={() => handleDeleteSPK(spk)}
                      style={{ fontSize: '10px', padding: '3px 6px' }}
                    >
                      Del
                    </Button>
                  </div>
                  
                  {/* Checklist */}
                  <div style={{
                    display: 'flex',
                    gap: '6px',
                    alignItems: 'center',
                    fontSize: '9px',
                    color: 'var(--text-secondary)',
                    paddingTop: '4px',
                    borderTop: '1px solid var(--border-color)',
                  }}>
                    {spk.stockFulfilled ? (
                      <span style={{ color: '#4caf50', fontWeight: 'bold' }}>
                        ✅ Stock Fulfilled - Ready for Delivery
                      </span>
                    ) : (
                      <>
                        <span style={{ color: hasSchedule ? 'var(--success)' : 'var(--text-secondary)' }}>
                          {hasSchedule ? '✅' : '☐'} Schedule
                        </span>
                        <span style={{ color: hasPR ? (prIsApproved ? 'var(--success)' : 'var(--warning)') : 'var(--text-secondary)' }}>
                          {hasPR ? (prIsApproved ? '✅' : '☑') : '☐'} PR
                        </span>
                        <span style={{ color: hasBOM ? 'var(--success)' : 'var(--text-secondary)' }}>
                          {hasBOM ? '✅' : '☐'} BOM
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ),
    },
  ];

  // Render SPK Card View (untuk toggle view mode)
  const renderSpkCardView = (data: any[], emptyMessage: string) => {
    if (!data || data.length === 0) {
      return (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          {emptyMessage}
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {data.map((item: any, idx: number) => {
          const allSPKsClosed = item.spkList.every((spk: any) => {
            const status = spk.status || 'OPEN';
            return status === 'CLOSE';
          });
          const generalStatus = allSPKsClosed ? 'CLOSE' : 'OPEN';
          
          // Warna selang-seling untuk SO card - lebih jelas perbedaannya
          const cardBgColors = [
            'var(--bg-primary)', // Default
            'rgba(33, 150, 243, 0.25)', // Light blue - lebih jelas
            'rgba(76, 175, 80, 0.25)', // Light green - lebih jelas
            'rgba(255, 152, 0, 0.25)', // Light orange - lebih jelas
            'rgba(156, 39, 176, 0.25)', // Light purple - lebih jelas
          ];
          const cardBgColor = cardBgColors[idx % cardBgColors.length];
          
          return (
            <div key={`${item.soNo}-${idx}`} style={{ backgroundColor: cardBgColor, borderRadius: '8px', padding: '1px' }}>
              <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>SO No</div>
                  <div style={{ fontSize: '20px', fontWeight: 600 }}>{item.soNo || '-'}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.customer || '-'}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <Button 
                    variant="secondary" 
                    onClick={() => handleGeneralScheduleForSO(item)}
                    style={{ 
                      fontSize: '11px', 
                      padding: '4px 8px', 
                      backgroundColor: '#4caf50', 
                      color: '#fff',
                      whiteSpace: 'nowrap',
                      height: 'fit-content',
                    }}
                  >
                    📅 General Schedule
                  </Button>
                  <span className={`status-badge status-${generalStatus.toLowerCase()}`} style={{ fontSize: '12px' }}>
                    {generalStatus}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    ({item.spkList.filter((spk: any) => (spk.status || 'OPEN') === 'CLOSE').length}/{item.spkList.length} SPK)
                  </span>
                </div>
              </div>

              {/* SPK Cards Grid - 4 columns */}
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                marginTop: '12px',
              }}>
                {item.spkList.map((spk: any, spkIdx: number) => {
                  // Cari schedule: untuk batch SPK, schedule mungkin masih menggunakan SPK utama
                  const spkNo = (spk.spkNo || '').toString().trim();
                  const isBatchSPK = spk.batchNo || spk.originalSpkNo || /-[A-Z0-9]$/.test(spkNo);
                  
                  let schedule = scheduleData.find((s: any) => s.spkNo === spk.spkNo);
                  
                  // Jika tidak ketemu dan ini batch SPK, coba cari schedule berdasarkan originalSpkNo atau base SPK number
                  if (!schedule && isBatchSPK) {
                    if (spk.originalSpkNo) {
                      schedule = scheduleData.find((s: any) => s.spkNo === spk.originalSpkNo);
                    } else if (/-[A-Z0-9]$/.test(spkNo)) {
                      // Extract base SPK number (remove suffix -A, -B, dst)
                      const baseSpkNo = spkNo.replace(/-[A-Z0-9]$/, '');
                      schedule = scheduleData.find((s: any) => s.spkNo === baseSpkNo);
                    }
                  }
                  
                  const progress = spk.progress || 0;
                  
                  // IMPORTANT: Progress display (product qty) adalah qty barang yang diproduksi
                  // JANGAN pakai calculatedOverrideQty atau material override untuk progress display
                  // Progress display harus ikutin qty asli dari SPK/SO atau qty batch jika sudah dibagi batch
                  // Material override hanya untuk material requirement, BUKAN untuk product qty display
                  let target = spk.qty || 0; // Pakai qty asli dari SPK (dari SO), bukan spk.target atau calculatedOverrideQty
                  
                  if (isBatchSPK && schedule && schedule.batches && schedule.batches.length > 0) {
                    // SPK ini adalah batch SPK, cari batch yang sesuai
                    // IMPORTANT: Untuk batch SPK, progress display HARUS pakai batch qty dari schedule (terbaru)
                    // Bukan spk.qty yang mungkin sudah outdated
                    let matchingBatch = null;
                    
                    if (spk.batchNo) {
                      matchingBatch = schedule.batches.find((b: any) => b.batchNo === spk.batchNo);
                    }
                    
                    if (!matchingBatch && /-([A-Z0-9])$/.test(spkNo)) {
                      const batchSuffix = spkNo.match(/-([A-Z0-9])$/)?.[1];
                      if (batchSuffix) {
                        matchingBatch = schedule.batches.find((b: any) => 
                          b.batchNo === batchSuffix || 
                          (b.batchNo && b.batchNo.toUpperCase() === batchSuffix.toUpperCase())
                        );
                      }
                    }
                    
                    if (!matchingBatch && schedule.batches.length > 0) {
                      const batchIndex = spkNo.match(/-([A-Z0-9])$/)?.[1];
                      if (batchIndex) {
                        const charCode = batchIndex.charCodeAt(0);
                        const index = charCode >= 65 && charCode <= 90 ? charCode - 65 : (charCode >= 48 && charCode <= 57 ? charCode - 48 : 0);
                        if (index >= 0 && index < schedule.batches.length) {
                          matchingBatch = schedule.batches[index];
                        }
                      }
                    }
                    
                    // IMPORTANT: Untuk batch SPK, SELALU pakai batch qty dari schedule jika ada
                    // Jangan pakai spk.qty karena mungkin sudah outdated
                    if (matchingBatch && matchingBatch.qty !== undefined && matchingBatch.qty !== null) {
                      target = matchingBatch.qty;
                    } else if (schedule.batches.length > 0) {
                      // Fallback: jika tidak ketemu matching batch, coba ambil batch pertama
                      // Atau pakai qty SPK asli jika tidak ada batch sama sekali
                      const firstBatch = schedule.batches[0];
                      if (firstBatch && firstBatch.qty !== undefined && firstBatch.qty !== null) {
                        target = firstBatch.qty;
                      } else {
                        target = spk.qty || 0;
                      }
                    }
                  }
                  
                  const progressText = `${progress}/${target}`;
                  
                  // Tentukan warna berdasarkan kondisi
                  let progressColor = '#d32f2f'; // Merah default (kurang dari target)
                  if (progress === target && target > 0) {
                    progressColor = '#2e7d32'; // Hijau (sama dengan target)
                  } else if (progress > target) {
                    progressColor = '#f57c00'; // Kuning (lebih dari target)
                  }
                  
                  const formatDate = (dateStr: string | undefined) => {
                    if (!dateStr) return '-';
                    try {
                      const date = new Date(dateStr);
                      if (isNaN(date.getTime())) return '-';
                      const day = String(date.getDate()).padStart(2, '0');
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const year = date.getFullYear();
                      return `${day}/${month}/${year}`;
                    } catch {
                      return '-';
                    }
                  };
                  
                  const hasProductionBatches = schedule?.batches && schedule.batches.length > 0;
                  const hasDeliveryBatches = schedule?.deliveryBatches && schedule.deliveryBatches.length > 0;
                  
                  // Cek PR - IMPORTANT: Gunakan logika yang sama dengan table list (flattenedSpkData)
                  const spkNoNormalized = (spk.spkNo || '').toString().trim();
                  const relatedPR = purchaseRequests.find((pr: any) => {
                    const prSpkNo = (pr.spkNo || '').toString().trim();
                    if (!prSpkNo || prSpkNo === '') return false;
                    if (prSpkNo !== spkNoNormalized) return false;
                    const prProduct = (pr.product || '').toString().trim();
                    const spkProduct = (spk.product || '').toString().trim();
                    if (prProduct && spkProduct && prProduct !== spkProduct) return false;
                    return true;
                  });
                  const hasPR = !!relatedPR;
                  const prIsApproved = relatedPR && (relatedPR.status === 'APPROVED' || relatedPR.status === 'PO_CREATED');
                  
                  // IMPORTANT: Pastikan tombol PR muncul jika PR belum dibuat (konsisten dengan table list)
                  // showCreatePR = !spk.stockFulfilled (sama seperti table list)
                  const showCreatePR = !spk.stockFulfilled;
                  
                  // Cek Schedule
                  const hasSchedule = schedule && schedule.scheduleStartDate;
                  
                  // Cek BOM dan hitung kebutuhan material
                  const productId = (spk.product_id || spk.productId || spk.kode || spk.productKode || '').toString().trim();
                  const productBOM = bomData.filter((b: any) => {
                    const bomProductId = (b.product_id || b.kode || '').toString().trim();
                    if (!productId || !bomProductId) return false;
                    return bomProductId.toLowerCase() === productId.toLowerCase();
                  });
                  const hasBOM = productBOM.length > 0; // BOM ada jika data BOM ada, tidak perlu schedule/PR
                  
                  // Hitung kebutuhan material berdasarkan BOM dan qty SPK
                  // IMPORTANT: Untuk batch SPK, material requirement harus pakai batch qty dari schedule
                  // Bukan dari override calculation, karena user yang bagi batch
                  const spkBOMOverrideForMaterial = spk.bomOverride || {};
                  
                  // Untuk batch SPK, pakai batch qty dari schedule (sama seperti progress display)
                  let targetForMaterial = spk.target || spk.qty || 0;
                  let matchingBatchForMaterial: any = null; // Simpan matchingBatch untuk digunakan di material calculation
                  
                  if (isBatchSPK && schedule && schedule.batches && schedule.batches.length > 0) {
                    // SPK ini adalah batch SPK, cari batch yang sesuai (sama seperti progress display)
                    let matchingBatch = null;
                    
                    if (spk.batchNo) {
                      matchingBatch = schedule.batches.find((b: any) => b.batchNo === spk.batchNo);
                    }
                    
                    if (!matchingBatch && /-([A-Z0-9])$/.test(spkNo)) {
                      const batchSuffix = spkNo.match(/-([A-Z0-9])$/)?.[1];
                      if (batchSuffix) {
                        matchingBatch = schedule.batches.find((b: any) => 
                          b.batchNo === batchSuffix || 
                          (b.batchNo && b.batchNo.toUpperCase() === batchSuffix.toUpperCase())
                        );
                      }
                    }
                    
                    if (!matchingBatch && schedule.batches.length > 0) {
                      const batchIndex = spkNo.match(/-([A-Z0-9])$/)?.[1];
                      if (batchIndex) {
                        const charCode = batchIndex.charCodeAt(0);
                        const index = charCode >= 65 && charCode <= 90 ? charCode - 65 : (charCode >= 48 && charCode <= 57 ? charCode - 48 : 0);
                        if (index >= 0 && index < schedule.batches.length) {
                          matchingBatch = schedule.batches[index];
                        }
                      }
                    }
                    
                    if (matchingBatch && matchingBatch.qty) {
                      targetForMaterial = matchingBatch.qty;
                      matchingBatchForMaterial = matchingBatch; // Simpan untuk digunakan di material calculation
                    }
                  } else {
                    // Bukan batch SPK, hitung dari override jika ada
                    let calculatedOverrideQtyForMaterial: number | undefined = undefined;
                    if (Object.keys(spkBOMOverrideForMaterial).length > 0) {
                      const productIdForMaterial = (spk.product_id || spk.kode || '').toString().trim();
                      const productBOMForMaterial = bomData.filter((b: any) => {
                        const bomProductId = (b.product_id || b.kode || '').toString().trim();
                        return bomProductId === productIdForMaterial;
                      });
                      
                      let maxOverrideQtyForMaterial = 0;
                      for (const bom of productBOMForMaterial) {
                        const bomMaterialId = (bom.material_id || '').toString().trim();
                        if (spkBOMOverrideForMaterial[bomMaterialId] !== undefined && spkBOMOverrideForMaterial[bomMaterialId] !== null) {
                          const overrideQty = parseFloat(spkBOMOverrideForMaterial[bomMaterialId]) || 0;
                          const ratio = parseFloat(bom.ratio) || 1;
                          const calculatedQty = ratio > 0 ? overrideQty / ratio : overrideQty;
                          if (calculatedQty > maxOverrideQtyForMaterial) {
                            maxOverrideQtyForMaterial = calculatedQty;
                          }
                        }
                      }
                      
                      if (maxOverrideQtyForMaterial > 0) {
                        calculatedOverrideQtyForMaterial = Math.ceil(maxOverrideQtyForMaterial);
                      }
                    }
                    
                    targetForMaterial = spk.overrideQty || calculatedOverrideQtyForMaterial || spk.target || spk.qty || 0;
                  }
                  
                  const spkQtyForMaterial = targetForMaterial;
                  const bomMaterials: Array<{ materialId: string; materialName: string; requiredQty: number; unit: string }> = [];
                  const spkBOMOverride = spkBOMOverrideForMaterial; // SPK-specific BOM override: { materialId: qty }
                  
                  if (productBOM.length > 0 && spkQtyForMaterial > 0) {
                    const bomMap = new Map<string, { materialId: string; materialName: string; requiredQty: number; unit: string }>();
                    productBOM.forEach((bom: any) => {
                      const materialId = (bom.material_id || '').toString().trim();
                      if (!materialId) return;
                      
                      const material = materials.find((m: any) => 
                        ((m.material_id || m.kode || '').toString().trim()) === materialId
                      );
                      
                      // IMPORTANT: Jika ada BOM override untuk material ini, bagi proporsional dengan batch qty
                      // Jika tidak ada override, gunakan ratio calculation dengan batch qty
                      let requiredQty: number;
                      if (spkBOMOverride[materialId] !== undefined && spkBOMOverride[materialId] !== null) {
                        // Ada override qty untuk material ini
                        // Untuk batch SPK, override qty harus dibagi proporsional dengan batch qty
                        if (isBatchSPK && schedule && schedule.batches && schedule.batches.length > 0) {
                          // Hitung total qty dari semua batch untuk mendapatkan original SPK qty
                          const totalBatchQty = schedule.batches.reduce((sum: number, b: any) => sum + (b.qty || 0), 0);
                          const batchQty = matchingBatchForMaterial ? (matchingBatchForMaterial.qty || 0) : spkQtyForMaterial;
                          
                          // Hitung proporsi batch qty terhadap total batch qty
                          const batchRatio = totalBatchQty > 0 ? batchQty / totalBatchQty : 1;
                          
                          // Bagi override qty proporsional dengan batch qty
                          const overrideQty = parseFloat(spkBOMOverride[materialId]) || 0;
                          requiredQty = overrideQty * batchRatio;
                        } else {
                          // Bukan batch SPK, pakai override qty langsung
                          requiredQty = parseFloat(spkBOMOverride[materialId]) || 0;
                        }
                      } else {
                        // Tidak ada override, gunakan ratio calculation dengan batch qty
                        requiredQty = spkQtyForMaterial * (bom.ratio || 1);
                      }
                      
                      if (bomMap.has(materialId)) {
                        bomMap.get(materialId)!.requiredQty += requiredQty;
                      } else {
                        bomMap.set(materialId, {
                          materialId,
                          materialName: material?.nama || materialId,
                          requiredQty,
                          unit: material?.satuan || material?.unit || 'PCS',
                        });
                      }
                    });
                    bomMaterials.push(...Array.from(bomMap.values()));
                  }
                  
                  // Gunakan warna customer dari SO parent untuk background card
                  const cardBgColor = getRowColor(item.customer || '');
                  
                  return (
                    <div key={spk.id || spkIdx} style={{ 
                      padding: '8px',
                      backgroundColor: cardBgColor, 
                      borderRadius: '4px',
                      fontSize: '10px',
                      border: '1px solid var(--border-color)',
                      borderLeft: '3px solid var(--primary)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}>
                      {/* SPK Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 'bold', fontSize: '11px', color: 'var(--text-primary)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {spk.spkNo}
                          </div>
                          <div style={{ fontSize: '9px', color: 'var(--text-secondary)', lineHeight: '1.2', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {spk.product}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', marginLeft: '4px' }}>
                          <div>
                            {/* Status per SPK - independent dari status general */}
                            <span className={`status-badge status-${(spk.status === 'DRAFT' ? 'OPEN' : spk.status || 'OPEN').toLowerCase()}`} style={{ fontSize: '8px', padding: '1px 4px' }}>
                              {spk.status === 'DRAFT' ? 'OPEN' : (spk.status || 'OPEN')}
                            </span>
                            {spk.stockFulfilled && (
                              <span style={{ 
                                fontSize: '7px', 
                                padding: '2px 4px', 
                                backgroundColor: '#4caf50', 
                                color: '#fff', 
                                borderRadius: '4px',
                                marginLeft: '2px',
                                border: '1px solid #66bb6a',
                                fontWeight: '600',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px'
                              }}>
                                📦
                              </span>
                            )}
                          </div>
                          <div style={{ 
                            fontSize: '9px', 
                            fontWeight: 'bold', 
                            color: progressColor,
                            padding: '3px 6px',
                            backgroundColor: progressColor === '#2e7d32' ? '#e8f5e9' : progressColor === '#f57c00' ? '#fff3e0' : '#ffebee',
                            borderRadius: '4px',
                            border: `1px solid ${progressColor}`,
                            minWidth: '45px',
                            textAlign: 'center'
                          }}>
                            {progressText}
                          </div>
                        </div>
                      </div>
                      
                      {/* Schedule Info - Production & Delivery */}
                      {schedule && (
                        <div style={{ 
                          padding: '6px',
                          backgroundColor: 'var(--bg-tertiary)',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          fontSize: '8px',
                        }}>
                          {/* Production Schedule - Horizontal Layout */}
                          {hasProductionBatches ? (
                            <div style={{ marginBottom: hasDeliveryBatches ? '4px' : '0' }}>
                              <div style={{ 
                                fontSize: '8px', 
                                fontWeight: 'bold', 
                                color: '#2196F3', 
                                marginBottom: '2px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '4px',
                                padding: '2px 4px',
                                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                                borderRadius: '3px',
                                border: '1px solid #2196F3',
                              }}>
                                <span style={{ fontSize: '10px' }}>🏭</span>
                                <span>Schedule</span>
                                {schedule.scheduleStartDate && schedule.scheduleEndDate && (
                                  <span style={{ fontSize: '7px', fontWeight: 'normal' }}>
                                    {formatDate(schedule.scheduleStartDate)} - {formatDate(schedule.scheduleEndDate)}
                                  </span>
                                )}
                              </div>
                              {/* Hide batch info karena data sudah ada di atasnya (progress display) */}
                              {/* <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
                                {schedule.batches.map((batch: any, batchIdx: number) => (
                                  <div key={batch.id || batchIdx} style={{ 
                                    fontSize: '7px', 
                                    color: 'var(--text-primary)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                    padding: '1px 3px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: '3px',
                                    border: '1px solid var(--border-color)'
                                  }}>
                                    <span style={{ fontWeight: 'bold' }}>B{batch.batchNo || String.fromCharCode(65 + batchIdx)}</span>
                                    <span>Q:{batch.qty}</span>
                                  </div>
                                ))}
                              </div> */}
                            </div>
                          ) : schedule.scheduleStartDate ? (
                            <div style={{ 
                              fontSize: '8px', 
                              color: '#2196F3', 
                              marginBottom: hasDeliveryBatches ? '2px' : '0',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 4px',
                              backgroundColor: 'rgba(33, 150, 243, 0.1)',
                              borderRadius: '3px',
                              border: '1px solid #2196F3',
                            }}>
                              <span style={{ fontSize: '10px' }}>🏭</span>
                              <span>{formatDate(schedule.scheduleStartDate)} - {formatDate(schedule.scheduleEndDate)}</span>
                            </div>
                          ) : null}
                          
                          {/* Delivery Schedule */}
                          {hasDeliveryBatches && (
                            <div style={{ 
                              marginTop: hasProductionBatches ? '4px' : '0',
                              paddingTop: hasProductionBatches ? '4px' : '0',
                              borderTop: hasProductionBatches ? '1px solid var(--border-color)' : 'none',
                            }}>
                              <div style={{ 
                                fontSize: '8px', 
                                fontWeight: 'bold', 
                                color: '#4caf50', 
                                marginBottom: '2px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '4px',
                                padding: '2px 4px',
                                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                borderRadius: '3px',
                                border: '1px solid #4caf50',
                              }}>
                                <span style={{ fontSize: '10px' }}>🚚</span>
                                <span>Deliv: {schedule.deliveryBatches.length}</span>
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', marginBottom: '2px' }}>
                                {schedule.deliveryBatches.slice(0, 2).map((batch: any, batchIdx: number) => (
                                  <div key={batch.id || batchIdx} style={{ fontSize: '7px', color: 'var(--text-secondary)' }}>
                                    {batch.batchNo || String.fromCharCode(65 + batchIdx)}: {formatDate(batch.deliveryDate)}
                                  </div>
                                ))}
                                {schedule.deliveryBatches.length > 2 && (
                                  <div style={{ fontSize: '7px', color: 'var(--text-secondary)' }}>
                                    +{schedule.deliveryBatches.length - 2}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* BOM Materials Info */}
                      {bomMaterials.length > 0 && (
                        <div style={{
                          padding: '4px 6px',
                          backgroundColor: 'rgba(156, 39, 176, 0.1)',
                          borderRadius: '4px',
                          border: '1px solid rgba(156, 39, 176, 0.3)',
                          fontSize: '7px',
                          marginTop: '2px',
                        }}>
                          <div style={{ 
                            fontWeight: 'bold', 
                            color: '#9c27b0', 
                            marginBottom: '3px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}>
                            <span>🧱</span>
                            <span>BOM Materials ({bomMaterials.length})</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '60px', overflowY: 'auto' }}>
                            {bomMaterials.slice(0, 3).map((mat: any, matIdx: number) => (
                              <div key={mat.materialId || matIdx} style={{ 
                                fontSize: '7px',
                                color: theme === 'light' ? '#000' : '#fff',
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: '4px',
                                padding: '1px 2px',
                              }}>
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {mat.materialName.length > 15 ? mat.materialName.substring(0, 15) + '...' : mat.materialName}
                                </span>
                                <span style={{ fontWeight: 'bold', color: theme === 'light' ? '#000' : '#fff', whiteSpace: 'nowrap' }}>
                                  {Math.ceil(mat.requiredQty)} {mat.unit}
                                </span>
                              </div>
                            ))}
                            {bomMaterials.length > 3 && (
                              <div style={{ fontSize: '7px', color: theme === 'light' ? '#000' : '#fff', fontStyle: 'italic', paddingTop: '2px', borderTop: '1px solid rgba(156, 39, 176, 0.2)' }}>
                                +{bomMaterials.length - 3} material lainnya
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Stock Fulfilled Info */}
                      {spk.stockFulfilled && (
                        <div style={{
                          padding: '4px 6px',
                          backgroundColor: '#e8f5e9',
                          borderRadius: '4px',
                          fontSize: '8px',
                          color: '#2e7d32',
                          border: '1px solid #4caf50',
                          marginTop: '2px',
                          fontWeight: '500',
                        }}>
                          ✅ Stock Ready
                        </div>
                      )}
                      
                      {/* Actions */}
                      <div style={{ 
                        display: 'flex',
                        gap: '2px',
                        flexWrap: 'wrap',
                        marginTop: '2px',
                        position: 'relative',
                        zIndex: 1,
                        pointerEvents: 'auto',
                      }}>
                        {!spk.stockFulfilled && (
                          <>
                            <Button 
                              variant="secondary" 
                              onClick={() => handleViewProductBOM(spk)}
                              style={{ fontSize: '8px', padding: '2px 4px', minHeight: '20px' }}
                            >
                              BOM
                            </Button>
                            {(spk.status || 'OPEN').toUpperCase() === 'OPEN' && (
                              <Button 
                                variant="secondary" 
                                onClick={() => handleEditBOM(spk)}
                                style={{ fontSize: '8px', padding: '2px 4px', minHeight: '20px' }}
                              >
                                Edit
                              </Button>
                            )}
                            {/* IMPORTANT: Tombol PR harus selalu muncul jika !spk.stockFulfilled (konsisten dengan table list: showCreatePR={!spk.stockFulfilled}) */}
                            <Button 
                              variant="secondary" 
                              onClick={() => handleCreatePR(spk)}
                              disabled={creatingPR[spk.spkNo] || prIsApproved || false}
                              style={{ 
                                fontSize: '8px', 
                                padding: '2px 4px',
                                minHeight: '20px',
                                opacity: (creatingPR[spk.spkNo] || prIsApproved) ? 0.5 : 1,
                                cursor: (creatingPR[spk.spkNo] || prIsApproved) ? 'not-allowed' : 'pointer',
                                backgroundColor: prIsApproved ? 'var(--success)' : undefined,
                                color: prIsApproved ? '#fff' : undefined
                              }}
                            >
                              {creatingPR[spk.spkNo] ? '...' : prIsApproved ? 'PR✓' : 'PR'}
                            </Button>
                            <Button 
                              variant="secondary" 
                              onClick={() => handleScheduleSPK(spk)}
                              style={{ fontSize: '8px', padding: '2px 4px', minHeight: '20px' }}
                            >
                              📅
                            </Button>
                          </>
                        )}
                        {spk.stockFulfilled && (
                          <div style={{
                            fontSize: '8px',
                            color: '#4caf50',
                            fontWeight: 'bold',
                            padding: '2px 4px',
                          }}>
                            🚀
                          </div>
                        )}
                        <Button 
                          variant="secondary" 
                          onClick={(e?: React.MouseEvent<HTMLButtonElement>) => {
                            if (e) {
                              e.preventDefault();
                              e.stopPropagation();
                            }
                            console.log('🔍 [PPIC] Status button clicked for SPK:', spk.spkNo);
                            handleUpdateStatus(spk);
                          }}
                          style={{ 
                            fontSize: '8px', 
                            padding: '2px 4px',
                            minHeight: '20px',
                            position: 'relative',
                            zIndex: 10,
                            pointerEvents: 'auto',
                            cursor: 'pointer'
                          }}
                        >
                          ⚙️
                        </Button>
                        <Button 
                          variant="danger" 
                          onClick={() => handleDeleteSPK(spk)}
                          style={{ fontSize: '8px', padding: '2px 4px', minHeight: '20px' }}
                        >
                          🗑️
                        </Button>
                      </div>
                      
                      {/* Checklist */}
                      <div style={{
                        display: 'flex',
                        gap: '6px',
                        alignItems: 'center',
                        fontSize: '8px',
                        color: 'var(--text-secondary)',
                        paddingTop: '2px',
                        borderTop: '1px solid var(--border-color)',
                      }}>
                        {spk.stockFulfilled ? (
                          <span style={{ color: '#4caf50', fontWeight: 'bold' }}>
                            ✅ Stock Fulfilled - Ready for Delivery
                          </span>
                        ) : (
                          <>
                            <span style={{ color: hasSchedule ? 'var(--success)' : 'var(--text-secondary)' }}>
                              {hasSchedule ? '✅' : '☐'} Schedule
                            </span>
                            <span style={{ color: hasPR ? (prIsApproved ? 'var(--success)' : 'var(--warning)') : 'var(--text-secondary)' }}>
                              {hasPR ? (prIsApproved ? '✅' : '☑') : '☐'} PR
                            </span>
                            <span style={{ color: hasBOM ? 'var(--success)' : 'var(--text-secondary)' }}>
                              {hasBOM ? '✅' : '☐'} BOM
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              </Card>
            </div>
          );
        })}
      </div>
    );
  };

  // Render PTP Card View - sama layout dengan SPK (grid 4 kolom)
  const renderPtpCardView = (data: any[], emptyMessage: string) => {
    if (!data || data.length === 0) {
      return (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          {emptyMessage}
        </div>
      );
    }

    return (
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
      }}>
        {data.map((item: any, idx: number) => {
          const status = item.status === 'DRAFT' ? 'OPEN' : (item.status || 'OPEN');
          
          // Warna selang-seling untuk PTP card - lebih jelas perbedaannya
          const cardBgColors = [
            'var(--bg-primary)', // Default
            'rgba(33, 150, 243, 0.25)', // Light blue - lebih jelas
            'rgba(76, 175, 80, 0.25)', // Light green - lebih jelas
            'rgba(255, 152, 0, 0.25)', // Light orange - lebih jelas
            'rgba(156, 39, 176, 0.25)', // Light purple - lebih jelas
          ];
          const cardBgColor = cardBgColors[idx % cardBgColors.length];
          
          // Cek apakah PTP sudah jadi SPK
          const relatedSPK = spkData.find((s: any) => s.ptpRequestNo === item.requestNo);
          const hasSPK = !!relatedSPK;
          
          // Get progress dari SPK terkait jika ada, atau dari PTP sendiri
          let progress = 0;
          let target = item.qty || 0;
          
          if (relatedSPK) {
            const schedule = scheduleData.find((s: any) => s.spkNo === relatedSPK.spkNo);
            const production = productionData.find((p: any) => p.spkNo === relatedSPK.spkNo);
            progress = relatedSPK.progress !== undefined 
              ? relatedSPK.progress 
              : (schedule?.progress || production?.progress || production?.producedQty || 0);
            target = relatedSPK.qty || item.qty || 0;
          } else {
            progress = item.progress || 0;
            target = item.qty || 0;
          }
          
          const progressText = `${progress}/${target}`;
          
          // Tentukan warna berdasarkan kondisi
          let progressColor = '#d32f2f';
          if (progress === target && target > 0) {
            progressColor = '#2e7d32';
          } else if (progress > target) {
            progressColor = '#f57c00';
          }
          
          // Cek PR untuk SPK terkait
          const hasPR = relatedSPK ? purchaseRequests.some((pr: any) => {
            const prSpkNo = (pr.spkNo || '').toString().trim();
            const spkNo = (relatedSPK.spkNo || '').toString().trim();
            return prSpkNo === spkNo;
          }) : false;
          
          // Cek Schedule untuk SPK terkait
          const hasSchedule = relatedSPK ? scheduleData.some((s: any) => s.spkNo === relatedSPK.spkNo) : false;
          
          // Cek BOM
          const productId = relatedSPK ? ((relatedSPK.product_id || relatedSPK.productId || relatedSPK.kode || relatedSPK.productKode || '').toString().trim()) : '';
          const productBOM = productId ? bomData.filter((b: any) => {
            const bomProductId = (b.product_id || b.kode || '').toString().trim();
            if (!productId || !bomProductId) return false;
            return bomProductId.toLowerCase() === productId.toLowerCase();
          }) : [];
          const hasBOM = productBOM.length > 0; // BOM ada jika data BOM ada, tidak perlu schedule/PR
          
          return (
            <div key={`${item.requestNo}-${idx}`} style={{ backgroundColor: cardBgColor, borderRadius: '8px', padding: '1px' }}>
              <Card>
                {/* Header - Compact */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Request No</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, wordBreak: 'break-word' }}>{item.requestNo || '-'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', wordBreak: 'break-word' }}>{item.customer || '-'}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                    <span className={`status-badge status-${status.toLowerCase()}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                      {status}
                    </span>
                    {item.stockFulfilled && (
                      <span style={{ 
                        fontSize: '8px', 
                        padding: '2px 6px', 
                        backgroundColor: '#4caf50', 
                        color: '#fff', 
                        borderRadius: '4px',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                      }}>
                        📦 Stock
                      </span>
                    )}
                  </div>
                </div>

                {/* PTP Details - Compact */}
                <div style={{ padding: '6px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px', gap: '4px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Product</div>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-primary)', wordBreak: 'break-word', lineHeight: '1.3' }}>{item.productItem || '-'}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0, marginLeft: '4px' }}>
                      <div style={{ 
                        fontSize: '10px', 
                        fontWeight: 'bold', 
                        color: progressColor,
                        padding: '3px 6px',
                        backgroundColor: progressColor === '#2e7d32' ? '#e8f5e9' : progressColor === '#f57c00' ? '#fff3e0' : '#ffebee',
                        borderRadius: '4px',
                        border: `1px solid ${progressColor}`,
                        minWidth: '45px',
                        textAlign: 'center'
                      }}>
                        {progressText}
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {item.qty || 0} {item.unit || 'PCS'}
                      </div>
                    </div>
                  </div>
                  
                  {item.stockFulfilled && (
                    <div style={{
                      padding: '4px 6px',
                      backgroundColor: '#e8f5e9',
                      borderRadius: '4px',
                      fontSize: '9px',
                      color: '#2e7d32',
                      border: '1px solid #4caf50',
                      marginTop: '4px',
                      fontWeight: '500',
                      wordBreak: 'break-word',
                    }}>
                      ✅ Stock Fulfilled - Ready for Delivery
                    </div>
                  )}
                  
                  {/* Checklist - Compact */}
                  <div style={{
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'center',
                    fontSize: '8px',
                    color: 'var(--text-secondary)',
                    paddingTop: '4px',
                    marginTop: '4px',
                    borderTop: '1px solid var(--border-color)',
                    flexWrap: 'wrap',
                  }}>
                    {item.stockFulfilled ? (
                      <span style={{ color: '#4caf50', fontWeight: 'bold', fontSize: '8px' }}>
                        ✅ Ready
                      </span>
                    ) : (
                      <>
                        <span style={{ color: hasSPK ? 'var(--success)' : 'var(--text-secondary)' }}>
                          {hasSPK ? '✅' : '☐'} SPK
                        </span>
                        <span style={{ color: hasSchedule ? 'var(--success)' : 'var(--text-secondary)' }}>
                          {hasSchedule ? '✅' : '☐'} Sch
                        </span>
                        <span style={{ color: hasPR ? 'var(--success)' : 'var(--text-secondary)' }}>
                          {hasPR ? '✅' : '☐'} PR
                        </span>
                        <span style={{ color: hasBOM ? 'var(--success)' : 'var(--text-secondary)' }}>
                          {hasBOM ? '✅' : '☐'} BOM
                        </span>
                      </>
                    )}
                  </div>
                  
                  {/* Actions - Compact */}
                  <div style={{ 
                    display: 'flex',
                    gap: '2px',
                    flexWrap: 'wrap',
                    marginTop: '4px',
                    paddingTop: '4px',
                    borderTop: '1px solid var(--border-color)',
                  }}>
                    {!item.stockFulfilled && (
                      <>
                        <Button 
                          variant="secondary" 
                          onClick={() => handleViewPTP(item)}
                          style={{ fontSize: '8px', padding: '2px 4px', minHeight: '20px' }}
                        >
                          View
                        </Button>
                        {!hasSPK && (
                          <Button 
                            variant="secondary" 
                            onClick={() => handleCreateSPKFromPTP(item)}
                            style={{ fontSize: '8px', padding: '2px 4px', minHeight: '20px' }}
                          >
                            SPK
                          </Button>
                        )}
                        <Button 
                          variant="secondary" 
                          onClick={() => handleMatchSO(item)}
                          style={{ fontSize: '8px', padding: '2px 4px', minHeight: '20px' }}
                        >
                          SO
                        </Button>
                      </>
                    )}
                    {item.stockFulfilled && (
                      <div style={{
                        fontSize: '8px',
                        color: '#4caf50',
                        fontWeight: 'bold',
                        padding: '2px 4px',
                      }}>
                        🚀
                      </div>
                    )}
                    {item.status !== 'CLOSE' && (
                      <Button 
                        variant="danger" 
                        onClick={() => handleClosePTP(item)}
                        style={{ fontSize: '8px', padding: '2px 4px', minHeight: '20px' }}
                      >
                        Close
                      </Button>
                    )}
                    <Button 
                      variant="danger" 
                      onClick={() => handleDeletePTP(item)}
                      style={{ fontSize: '8px', padding: '2px 4px', minHeight: '20px' }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    );
  };

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

  // Table columns untuk SPK (simplified table view)
  // Flatten SPK data untuk table view (Excel-like) - setiap SPK jadi row terpisah
  const flattenedSpkData = useMemo(() => {
    if (spkViewMode !== 'table') return [];
    
    const flattened: any[] = [];
    filteredSpkData.forEach((group: any) => {
      group.spkList.forEach((spk: any) => {
        const schedule = scheduleData.find((s: any) => s.spkNo === spk.spkNo);
        const spkNoNormalized = (spk.spkNo || '').toString().trim();
        const relatedPR = purchaseRequests.find((pr: any) => {
          const prSpkNo = (pr.spkNo || '').toString().trim();
          if (!prSpkNo || prSpkNo === '') return false;
          if (prSpkNo !== spkNoNormalized) return false;
          const prProduct = (pr.product || '').toString().trim();
          const spkProduct = (spk.product || '').toString().trim();
          if (prProduct && spkProduct && prProduct !== spkProduct) return false;
          return true;
        });
        const hasPR = !!relatedPR;
        const prIsApproved = relatedPR && (relatedPR.status === 'APPROVED' || relatedPR.status === 'PO_CREATED');
        
        // Get padCode from product
        const productId = spk.product_id || spk.kode || '';
        const masterProduct = products.find(p => 
          (p.product_id || p.kode) === productId
        );
        const padCode = masterProduct?.padCode || '';
        
        flattened.push({
          id: spk.id || `${group.soNo}-${spk.spkNo}`,
          soNo: group.soNo,
          customer: group.customer,
          spkNo: spk.spkNo || '-',
          productCode: spk.product_id || spk.kode || '-',
          product: spk.product || '-',
          padCode: padCode,
          qty: spk.qty || spk.target || 0,
          progress: spk.progress || 0,
          target: spk.target || spk.qty || 0,
          status: spk.status || 'OPEN',
          hasSchedule: !!(schedule && schedule.scheduleStartDate),
          hasPR,
          prIsApproved,
          scheduleStartDate: schedule?.scheduleStartDate || '-',
          scheduleEndDate: schedule?.scheduleEndDate || '-',
          _group: group,
          _spk: spk,
        });
      });
    });
    return flattened;
  }, [filteredSpkData, scheduleData, purchaseRequests, spkViewMode, products]);

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
      render: (item: any) => (
        <span style={{ fontSize: '13px' }}>{item.customer}</span>
      ),
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
      key: 'padCode',
      header: 'Pad Code',
      render: (item: any) => (
        <span style={{ fontSize: '12px', color: item.padCode && item.padCode !== '-' ? 'var(--primary)' : 'var(--text-secondary)' }}>
          {item.padCode || '-'}
        </span>
      ),
    },
    {
      key: 'qty',
      header: 'Qty',
      render: (item: any) => (
        <span style={{ fontSize: '13px', textAlign: 'right', display: 'block' }}>
          {Number(item.qty || 0).toLocaleString('id-ID')} PCS
        </span>
      ),
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (item: any) => {
        const progress = item.progress || 0;
        const target = item.target || 0;
        const progressText = `${Number(progress).toLocaleString('id-ID')}/${Number(target).toLocaleString('id-ID')}`;
        let color = '#d32f2f';
        if (progress === target && target > 0) {
          color = '#2e7d32';
        } else if (progress > target) {
          color = '#f57c00';
        }
        return (
          <span style={{ fontSize: '13px', fontWeight: 'bold', color, textAlign: 'right', display: 'block' }}>
            {progressText}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => (
        <span className={`status-badge status-${item.status?.toLowerCase()}`} style={{ fontSize: '11px' }}>
          {item.status}
        </span>
      ),
    },
    {
      key: 'hasSchedule',
      header: 'Schedule',
      render: (item: any) => (
        <span style={{ fontSize: '12px', color: item.hasSchedule ? '#2e7d32' : 'var(--text-secondary)' }}>
          {item.hasSchedule ? '✅' : '☐'}
        </span>
      ),
    },
    {
      key: 'hasPR',
      header: 'PR',
      render: (item: any) => {
        const color = item.hasPR ? (item.prIsApproved ? '#2e7d32' : '#ff9800') : 'var(--text-secondary)';
        const icon = item.hasPR ? (item.prIsApproved ? '✅' : '☑') : '☐';
        return (
          <span style={{ fontSize: '12px', color }}>
            {icon}
          </span>
        );
      },
    },
    {
      key: 'scheduleStartDate',
      header: 'Schedule Start',
      render: (item: any) => {
        if (!item.scheduleStartDate || item.scheduleStartDate === '-') return <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>-</span>;
        const date = new Date(item.scheduleStartDate);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return (
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {`${day}/${month}/${year}`}
          </span>
        );
      },
    },
    {
      key: 'scheduleEndDate',
      header: 'Schedule End',
      render: (item: any) => {
        if (!item.scheduleEndDate || item.scheduleEndDate === '-') return <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>-</span>;
        const date = new Date(item.scheduleEndDate);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return (
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {`${day}/${month}/${year}`}
          </span>
        );
      },
    },
    { 
      key: 'created', 
      header: 'Created',
      render: (item: any) => {
        const createdDate = item.created || item._spk?.created || '';
        const { date, time } = formatDateSimple(createdDate);
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
      render: (item: any) => {
        const spk = item._spk;
        if (!spk) return null;
        return (
          <ActionMenu
            onViewBOM={() => handleViewProductBOM(spk)}
            onEditBOM={() => handleEditBOM(spk)}
            onCreatePR={() => handleCreatePR(spk)}
            onSchedule={() => handleScheduleSPK(spk)}
            onStatus={() => handleUpdateStatus(spk)}
            onDelete={() => handleDeleteSPK(spk)}
            showEditBOM={(spk.status || 'OPEN').toUpperCase() === 'OPEN'}
            showCreatePR={!spk.stockFulfilled}
            showSchedule={!spk.stockFulfilled}
            prIsApproved={item.prIsApproved}
            isCreatingPR={creatingPR[spk.spkNo] || false}
          />
        );
      },
    },
  ];

  // Flatten PTP data untuk table view (Excel-like)
  const flattenedPtpData = useMemo(() => {
    if (ptpViewMode !== 'table') return [];
    
    const flattened: any[] = [];
    filteredPtpData.forEach((item: any) => {
      const status = item.status === 'DRAFT' ? 'OPEN' : (item.status || 'OPEN');
      const relatedSPK = spkData.find((s: any) => s.ptpRequestNo === item.requestNo);
      const hasSPK = !!relatedSPK;
      
      let progress = 0;
      let target = item.qty || 0;
      
      if (relatedSPK) {
        const schedule = scheduleData.find((s: any) => s.spkNo === relatedSPK.spkNo);
        const production = productionData.find((p: any) => p.spkNo === relatedSPK.spkNo);
        progress = relatedSPK.progress !== undefined 
          ? relatedSPK.progress 
          : (schedule?.progress || production?.progress || production?.producedQty || 0);
        target = relatedSPK.qty || item.qty || 0;
      } else {
        progress = item.progress || 0;
        target = item.qty || 0;
      }
      
      const hasPR = relatedSPK ? purchaseRequests.some((pr: any) => {
        const prSpkNo = (pr.spkNo || '').toString().trim();
        const spkNo = (relatedSPK.spkNo || '').toString().trim();
        return prSpkNo === spkNo;
      }) : false;
      
      const hasSchedule = relatedSPK ? scheduleData.some((s: any) => s.spkNo === relatedSPK.spkNo) : false;
      
      flattened.push({
        id: item.id || item.requestNo,
        requestNo: item.requestNo || '-',
        customer: item.customer || '-',
        productItem: item.productItem || '-',
        qty: target,
        progress,
        target,
        status,
        hasSPK,
        hasPR,
        hasSchedule,
        spkNo: relatedSPK?.spkNo || '-',
        stockFulfilled: item.stockFulfilled || false,
        created: item.created || '-',
        _ptp: item,
      });
    });
    return flattened;
  }, [filteredPtpData, spkData, scheduleData, productionData, purchaseRequests, ptpViewMode]);

  const ptpTableColumns = [
    {
      key: 'requestNo',
      header: 'Request No',
      render: (item: any) => (
        <strong style={{ fontSize: '13px', color: '#2e7d32' }}>{item.requestNo}</strong>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (item: any) => (
        <span style={{ fontSize: '13px' }}>{item.customer}</span>
      ),
    },
    {
      key: 'productItem',
      header: 'Product',
      render: (item: any) => (
        <span style={{ fontSize: '13px' }}>{item.productItem}</span>
      ),
    },
    {
      key: 'qty',
      header: 'Qty',
      render: (item: any) => (
        <span style={{ fontSize: '13px', textAlign: 'right', display: 'block' }}>
          {Number(item.qty || 0).toLocaleString('id-ID')} PCS
        </span>
      ),
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (item: any) => {
        const progress = item.progress || 0;
        const target = item.target || 0;
        const progressText = `${Number(progress).toLocaleString('id-ID')}/${Number(target).toLocaleString('id-ID')}`;
        let color = '#d32f2f';
        if (progress === target && target > 0) {
          color = '#2e7d32';
        } else if (progress > target) {
          color = '#f57c00';
        }
        return (
          <span style={{ fontSize: '13px', fontWeight: 'bold', color, textAlign: 'right', display: 'block' }}>
            {progressText}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => (
        <span className={`status-badge status-${item.status?.toLowerCase()}`} style={{ fontSize: '11px' }}>
          {item.status}
        </span>
      ),
    },
    {
      key: 'hasSPK',
      header: 'SPK',
      render: (item: any) => (
        <span style={{ fontSize: '12px', color: item.hasSPK ? '#2e7d32' : 'var(--text-secondary)' }}>
          {item.hasSPK ? '✅' : '☐'}
        </span>
      ),
    },
    {
      key: 'spkNo',
      header: 'SPK No',
      render: (item: any) => (
        <span style={{ fontSize: '12px', color: item.hasSPK ? 'var(--primary)' : 'var(--text-secondary)' }}>
          {item.spkNo}
        </span>
      ),
    },
    {
      key: 'hasSchedule',
      header: 'Schedule',
      render: (item: any) => (
        <span style={{ fontSize: '12px', color: item.hasSchedule ? '#2e7d32' : 'var(--text-secondary)' }}>
          {item.hasSchedule ? '✅' : '☐'}
        </span>
      ),
    },
    {
      key: 'hasPR',
      header: 'PR',
      render: (item: any) => (
        <span style={{ fontSize: '12px', color: item.hasPR ? '#2e7d32' : 'var(--text-secondary)' }}>
          {item.hasPR ? '✅' : '☐'}
        </span>
      ),
    },
    {
      key: 'stockFulfilled',
      header: 'Stock Ready',
      render: (item: any) => (
        <span style={{ fontSize: '12px', color: item.stockFulfilled ? '#2e7d32' : 'var(--text-secondary)' }}>
          {item.stockFulfilled ? '✅' : '☐'}
        </span>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      render: (item: any) => {
        if (!item.created || item.created === '-') return <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>-</span>;
        try {
          const date = new Date(item.created);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return (
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {`${day}/${month}/${year}`}
            </span>
          );
        } catch {
          return <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>-</span>;
        }
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: any) => {
        const relatedSPK = spkData.find((s: any) => s.ptpRequestNo === item.requestNo);
        const hasSPK = !!relatedSPK;
        
        // Find full PTP item from ptpData
        const fullPTPItem = ptpData.find((p: any) => p.requestNo === item.requestNo);
        
        return (
          <PTPActionMenu
            onView={() => {
              if (fullPTPItem) {
                handleViewPTP(fullPTPItem);
              }
            }}
            onCreateSPK={() => {
              if (fullPTPItem) {
                handleCreateSPKFromPTP(fullPTPItem);
              }
            }}
            onMatchSO={() => {
              if (fullPTPItem) {
                handleMatchSO(fullPTPItem);
              }
            }}
            hasSPK={hasSPK}
          />
        );
      },
    },
  ];

  const handleScheduleClick = (item: any) => {
    // Extract spkNo dari item (bisa dari spkNo langsung atau dari format SPK-2025000001-A)
    let spkNo = item.spkNo;
    if (spkNo && spkNo.includes('-')) {
      // Jika format SPK-2025000001-A, ambil SPK-2025000001 saja
      const parts = spkNo.split('-');
      if (parts.length >= 3) {
        spkNo = `${parts[0]}-${parts[1]}`;
      }
    }
    
    // Find SPK untuk ambil data lengkap
    const spkItem = spkData.find((s: any) => s.spkNo === spkNo);
    
    // Find existing schedule untuk SPK ini
    const existingSchedule = scheduleData.find((s: any) => s.spkNo === spkNo);
    
    setSelectedScheduleItem({
      spkNo: spkNo, // Pastikan spkNo selalu ada (tanpa batch suffix)
      soNo: item.soNo || spkItem?.soNo || '',
      product: item.item || item.product || spkItem?.product || '',
      qty: item.quantity || item.qty || spkItem?.qty || 0,
      target: item.target || item.quantity || item.qty || spkItem?.qty || 0,
      progress: item.progress || 0,
      remaining: (item.target || item.quantity || item.qty || spkItem?.qty || 0) - (item.progress || 0),
      scheduleStartDate: existingSchedule?.scheduleStartDate || item.scheduleStartDate || item.scheduleStartDate,
      scheduleEndDate: existingSchedule?.scheduleEndDate || item.scheduleEndDate || item.scheduleEndDate,
      scheduleDate: existingSchedule?.scheduleDate || item.scheduleDate,
      batches: existingSchedule?.batches || item.batches || [],
    });
  };

  const handleSaveSchedule = async (data: any) => {
    try {
      // Pastikan spkNo ada dari selectedScheduleItem
      const spkNo = selectedScheduleItem?.spkNo || data.spkNo;
      if (!spkNo) {
        showAlert('Error: SPK No tidak ditemukan', 'Error');
        return;
      }
      
      // Find existing schedule untuk preserve data yang sudah ada
      // Cari berdasarkan spkNo atau soNo jika schedule tidak punya spkNo
      let existingSchedule = scheduleData.find((s: any) => s.spkNo === spkNo);
      if (!existingSchedule && selectedScheduleItem?.soNo) {
        // Jika tidak ketemu dengan spkNo, cari berdasarkan soNo dan spkNo dari selectedScheduleItem
        existingSchedule = scheduleData.find((s: any) => 
          s.soNo === selectedScheduleItem.soNo && !s.spkNo
        );
      }
      
      const spkItem = spkData.find((s: any) => s.spkNo === spkNo);
      const batches = data.batches || existingSchedule?.batches || [];
      const hasBatches = batches.length > 0;
      
      // Jika ada batches, split SPK menjadi multiple SPK (SPK-00000-A, SPK-00000-B, dst)
      if (hasBatches && spkItem) {
        const currentSPKs = await storageService.get<any[]>('spk') || [];
        const currentSchedules = await storageService.get<any[]>('schedule') || [];
        const productionNotifications = await storageService.get<any[]>('productionNotifications') || [];
        
        // Hapus SPK utama dan schedule-nya
        const updatedSPKs = currentSPKs.filter((s: any) => s.spkNo !== spkNo);
        const updatedSchedules = currentSchedules.filter((s: any) => s.spkNo !== spkNo);
        const updatedNotifications = productionNotifications.filter((n: any) => n.spkNo !== spkNo);
        
        // Buat SPK baru untuk setiap batch
        const newSPKs: any[] = [];
        const newSchedules: any[] = [];
        const newNotifications: any[] = [];
        
        batches.forEach((batch: any, batchIdx: number) => {
          const batchNo = batch.batchNo || String.fromCharCode(65 + batchIdx); // A, B, C, dst
          const batchSpkNo = `${spkNo}-${batchNo}`;
          const batchQty = batch.qty || 0;
          
          // Create SPK untuk batch ini
          const newSPK = {
            ...spkItem,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9) + batchIdx,
            spkNo: batchSpkNo,
            qty: batchQty,
            originalSpkNo: spkNo, // Track SPK asal
            batchNo: batchNo,
            status: 'OPEN',
            created: new Date().toISOString(),
          };
          newSPKs.push(newSPK);
          
          // Create schedule untuk batch ini
          const batchSchedule = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9) + batchIdx,
            spkNo: batchSpkNo,
            soNo: spkItem.soNo || '',
            scheduleStartDate: batch.startDate ? new Date(batch.startDate).toISOString() : (data.startDate ? new Date(data.startDate).toISOString() : new Date().toISOString()),
            scheduleEndDate: batch.endDate ? new Date(batch.endDate).toISOString() : (data.endDate ? new Date(data.endDate).toISOString() : new Date().toISOString()),
            batches: [batch], // Satu batch per SPK
            progress: 0,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
          };
          newSchedules.push(batchSchedule);
          
          // Create notification untuk batch ini
          const batchNotification = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9) + batchIdx,
            type: 'PRODUCTION_SCHEDULE',
            spkNo: batchSpkNo,
            soNo: spkItem.soNo || '',
            customer: spkItem.customer || '',
            product: spkItem.product || '',
            productId: spkItem.product_id || spkItem.kode || '',
            qty: batchQty,
            scheduleStartDate: batchSchedule.scheduleStartDate,
            scheduleEndDate: batchSchedule.scheduleEndDate,
            batches: [batch],
            status: 'WAITING_MATERIAL',
            materialStatus: 'PENDING',
            created: new Date().toISOString(),
          };
          newNotifications.push(batchNotification);
        });
        
        // Save semua SPK batch
        await storageService.set('spk', [...updatedSPKs, ...newSPKs]);
        setSpkData([...updatedSPKs, ...newSPKs]);
        
        // Save semua schedule batch
        await storageService.set('schedule', [...updatedSchedules, ...newSchedules]);
        setScheduleData([...updatedSchedules, ...newSchedules]);
        
        // Save notifications
        if (newNotifications.length > 0) {
          await storageService.set('productionNotifications', [...updatedNotifications, ...newNotifications]);
          console.log(`✅ SPK split into ${newSPKs.length} batch SPKs: ${newSPKs.map(s => s.spkNo).join(', ')}`);
        }
        
        // Jangan tutup dialog jika dipanggil dari GeneralScheduleDialog
        const isFromGeneralSchedule = selectedGeneralScheduleItem !== null;
        
        if (!isFromGeneralSchedule) {
          showAlert(`SPK ${spkNo} telah di-split menjadi ${newSPKs.length} batch SPK:\n\n${newSPKs.map(s => `• ${s.spkNo} (${s.qty} PCS)`).join('\n')}\n\n📧 Notifications sent to Production - Waiting for material receipt from Purchasing`, 'Success');
          setSelectedScheduleItem(null);
        } else {
          showAlert(`SPK ${spkNo} telah di-split menjadi ${newSPKs.length} batch SPK:\n\n${newSPKs.map(s => `• ${s.spkNo} (${s.qty} PCS)`).join('\n')}\n\n📧 Notifications sent to Production - Waiting for material receipt from Purchasing`, 'Success');
        }
        
        // Reload data
        loadData();
        return;
      }
      
      // Jika tidak ada batches, lanjutkan seperti biasa
      const scheduleItem = {
        id: existingSchedule?.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
        spkNo: spkNo, // Pastikan spkNo selalu ada
        soNo: selectedScheduleItem?.soNo || existingSchedule?.soNo || spkItem?.soNo || '',
        scheduleStartDate: data.startDate ? new Date(data.startDate).toISOString() : (existingSchedule?.scheduleStartDate || spkItem?.scheduleStartDate || new Date().toISOString()),
        scheduleEndDate: data.endDate ? new Date(data.endDate).toISOString() : (existingSchedule?.scheduleEndDate || spkItem?.scheduleEndDate || new Date().toISOString()),
        batches: batches,
        progress: existingSchedule?.progress || 0,
        created: existingSchedule?.created || new Date().toISOString(),
        updated: new Date().toISOString(),
      };

      // Update atau create schedule
      // Pastikan hanya ada 1 schedule per SPK (berdasarkan spkNo)
      let updated = scheduleData.filter(s => s.spkNo !== spkNo);
      
      // Tambahkan schedule baru/updated
      updated.push(scheduleItem);
      
      // Clean up: Hapus schedule lama yang tidak punya spkNo untuk soNo yang sama
      // (untuk migrate data lama)
      if (scheduleItem.spkNo && scheduleItem.soNo) {
        updated = updated.filter(s => {
          // Hapus schedule tanpa spkNo yang punya soNo sama, karena sekarang sudah punya schedule dengan spkNo
          if (!s.spkNo && s.soNo === scheduleItem.soNo) {
            return false;
          }
          return true;
        });
      }
      
      await storageService.set('schedule', updated);
      setScheduleData(updated);

      // Kirim notifikasi ke Production setelah schedule dibuat (hanya jika tidak ada batches)
      // Jika ada batches, notification sudah dibuat di bagian batch splitting di atas
      if (!hasBatches) {
        const productionNotifications = await storageService.get<any[]>('productionNotifications') || [];
        const targetSpk = spkData.find((s: any) => s.spkNo === spkNo);
        const existingNotification = productionNotifications.find(
          (n: any) => n.spkNo === spkNo && n.productId === (targetSpk?.product_id || targetSpk?.kode)
        );
        
        if (!existingNotification) {
          // Cari SPK untuk mendapatkan info lengkap
          const spkItem = spkData.find((s: any) => s.spkNo === spkNo);
          if (spkItem) {
            const newNotification = {
              id: Date.now().toString(),
              type: 'PRODUCTION_SCHEDULE',
              spkNo: spkNo,
              soNo: scheduleItem.soNo,
              customer: spkItem.customer || '',
              product: spkItem.product || '',
              productId: spkItem.product_id || spkItem.kode || '',
              qty: spkItem.qty || 0,
              scheduleStartDate: scheduleItem.scheduleStartDate,
              scheduleEndDate: scheduleItem.scheduleEndDate,
              batches: scheduleItem.batches || [],
              status: 'WAITING_MATERIAL', // Status: Waiting for material receipt from Purchasing
              materialStatus: 'PENDING', // Material belum diterima
              created: new Date().toISOString(),
            };
            await storageService.set('productionNotifications', [...productionNotifications, newNotification]);
            console.log(`✅ Production notification created: SPK ${spkNo} - Waiting for material receipt`);
          }
        }
      }

      // Jangan tutup dialog jika dipanggil dari GeneralScheduleDialog
      // Hanya tutup jika dipanggil dari ScheduleDialog standalone
      const isFromGeneralSchedule = selectedGeneralScheduleItem !== null;
      
      if (!isFromGeneralSchedule) {
        showAlert('Schedule saved successfully\n\n📧 Notification sent to Production - Waiting for material receipt from Purchasing', 'Success');
        setSelectedScheduleItem(null);
      } else {
        // Jika dari GeneralScheduleDialog, hanya show alert tanpa tutup dialog
        showAlert(`Production schedule saved for SPK ${spkNo}\n\n📧 Notification sent to Production - Waiting for material receipt from Purchasing`, 'Success');
      }
      
      // Reload data
      loadData();
    } catch (error: any) {
      showAlert(`Error saving schedule: ${error.message}`, 'Error');
    }
  };

  // SPK Actions
  const handlePreviewSPK = (item: any) => {
    const html = `
        <html>
          <head>
            <title>SPK ${item.spkNo}</title>
            <style>
              body { font-family: Arial; padding: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <h1>WORK ORDER (SPK)</h1>
            <p><strong>SPK No:</strong> ${item.spkNo || '-'}</p>
            <p><strong>SO No:</strong> ${item.soNo || '-'}</p>
            <p><strong>Customer:</strong> ${item.customer || '-'}</p>
            <p><strong>Product:</strong> ${item.product || '-'}</p>
            <p><strong>Qty:</strong> ${item.qty || 0}</p>
            <p><strong>Status:</strong> ${item.status || 'OPEN'}</p>
            <p><strong>Schedule:</strong> ${item.schedule || '-'}</p>
            <p><strong>Progress:</strong> ${item.progress || 0}%</p>
            <p><strong>Created:</strong> ${item.created || '-'}</p>
          </body>
        </html>
    `;
    openPrintWindow(html);
  };

  const handleEditBOM = (item: any) => {
    // Buka dialog untuk edit SPK-specific BOM override (bukan master BOM)
    const productId = (item.product_id || item.kode || '').toString().trim();
    const productBOM = bomData.filter((b: any) => {
      const bomProductId = (b.product_id || b.kode || '').toString().trim();
      return bomProductId === productId && bomProductId !== '';
    });
    
    // Jika BOM belum ada, buka dialog edit BOM master langsung
    if (productBOM.length === 0) {
      // Cari product data untuk mendapatkan nama product
      const productData = products.find((p: any) => {
        const pId = (p.product_id || p.kode || '').toString().trim();
        return pId === productId;
      });
      
      // Buka dialog edit BOM master
      setEditingBOM({
        product_id: productId,
        kode: productId,
        product: item.product || item.productName || productData?.nama || 'Product',
        spkNo: item.spkNo, // Simpan SPK No untuk referensi
      });
      return;
    }
    
    // Load SPK-specific override jika ada
    const spkBOMOverride = item.bomOverride || {};
    const spkQty = parseFloat(item.qty || '0') || 0;
    
    // Buat list material dengan qty dari override atau ratio
    const bomMaterialsList = productBOM.map((bom: any) => {
      const materialId = (bom.material_id || '').toString().trim();
      const material = materials.find((m: any) => 
        ((m.material_id || m.kode || '').toString().trim()) === materialId
      );
      
      // Gunakan override jika ada, kalau tidak pakai ratio
      let requiredQty: number;
      if (spkBOMOverride[materialId] !== undefined && spkBOMOverride[materialId] !== null) {
        requiredQty = parseFloat(spkBOMOverride[materialId]) || 0;
      } else {
        requiredQty = spkQty * (bom.ratio || 1);
      }
      
      return {
        materialId,
        materialName: material?.nama || materialId,
        ratio: bom.ratio || 1,
        requiredQty,
        unit: material?.satuan || material?.unit || 'PCS',
        isOverride: spkBOMOverride[materialId] !== undefined && spkBOMOverride[materialId] !== null,
      };
    });
    
    setEditingSPKBOM({
      spk: item,
      bomMaterials: bomMaterialsList,
      spkQty,
    });
  };
  
  const handleSaveSPKBOMOverride = async (overrideData: { [materialId: string]: number }) => {
    if (!editingSPKBOM || !editingSPKBOM.spk) return;
    
    try {
      const spk = editingSPKBOM.spk;
      const currentSPKs = extractStorageValue(await storageService.get<any[]>('spk'));
      
      // Update SPK dengan bomOverride
      const updatedSPKs = currentSPKs.map((s: any) => {
        if (s.spkNo === spk.spkNo) {
          return {
            ...s,
            bomOverride: overrideData,
            updated: new Date().toISOString(),
          };
        }
        return s;
      });
      
      await storageService.set('spk', updatedSPKs);
      showAlert(`BOM override berhasil disimpan untuk SPK: ${spk.spkNo}\n\nOverride hanya berlaku untuk SPK ini, tidak mengubah master BOM.`, 'Success');
      setEditingSPKBOM(null);
      
      // Reload data untuk update tampilan
      loadData();
    } catch (error: any) {
      showAlert(`Error saving SPK BOM override: ${error.message}`, 'Error');
    }
  };

  const handleViewProductBOM = (spk: any) => {
    try {
      const productId = (spk.product_id || spk.kode || '').toString().trim();
      if (!productId) {
        showAlert('Product ID tidak ditemukan.', 'Information');
        return;
      }

      // Filter BOM berdasarkan productId
      const productBOMRaw = bomData.filter((b: any) => ((b.product_id || b.kode || '').toString().trim()) === productId);
      
      // IMPORTANT: Deduplicate berdasarkan material_id (jika ada duplikasi)
      const bomMap = new Map<string, any>();
      productBOMRaw.forEach((bom: any) => {
        const materialId = (bom.material_id || '').toString().trim();
        if (!materialId) return;
        
        if (!bomMap.has(materialId)) {
          const material = materials.find((m: any) => (m.material_id || m.kode || '').toString().trim() === materialId);
          bomMap.set(materialId, {
            id: bom.id,
            materialId,
            materialName: material?.nama || bom.material_name || materialId,
            ratio: bom.ratio || 1,
            unit: material?.satuan || material?.unit || 'PCS',
          });
        } else {
          // Jika material sudah ada, keep yang pertama (atau bisa gabungkan ratio jika perlu)
          console.log(`⚠️ [View BOM] Duplicate BOM entry found for material ${materialId}, keeping first entry`);
        }
      });
      
      const productBOM = Array.from(bomMap.values());
      
      console.log(`📋 [View BOM] Product ${productId}: Found ${productBOMRaw.length} BOM entries, ${productBOM.length} unique materials after deduplication`);

      if (productBOM.length === 0) {
        showAlert(`BOM belum tersedia untuk product ${spk.product || spk.productName || spk.product_id}.`, 'Information');
        return;
      }

      setViewingProductBOM({
        spk,
        bomItems: productBOM,
      });
    } catch (error: any) {
      showAlert(`Error menampilkan BOM: ${error.message}`, 'Error');
    }
  };

  const generatePRHtmlContent = async (pr: any) => {
    // Load company info from settings
    const companySettings = await storageService.get<{ companyName: string; address: string }>('companySettings');
    const company = {
      companyName: companySettings?.companyName || 'PT TRIMA LAKSANA JAYA PRATAMA',
      address: companySettings?.address || 'Jl. Raya Bekasi Km. 28, Cikarang, Bekasi 17530',
    };

    // Logo menggunakan logo-loader utility
    let logo = await loadLogoAsBase64();

    // Prepare enriched lines dari PR items
    // Pastikan harga selalu ada, jika tidak ada di item, cari dari master material
    const materialsData = await storageService.get<any[]>('materials') || [];
    const enrichedLines = (pr.items || []).map((item: any) => {
      // Jika price tidak ada atau 0, cari dari master material
      let itemPrice = item.price || 0;
      if (!itemPrice || itemPrice === 0) {
        const materialId = (item.materialId || item.materialKode || '').toString().trim();
        const material = materialsData.find((m: any) => {
          const mId = (m.material_id || m.kode || '').toString().trim();
          return mId === materialId;
        });
        if (material) {
          itemPrice = material.priceMtr || material.harga || (material as any).hargaSales || 0;
        }
      }
      
      return {
        itemName: item.materialName || '-',
        itemSku: item.materialKode || item.materialId || '-',
        qty: item.qty || item.shortageQty || 0,
        price: Math.ceil(itemPrice), // Pastikan harga selalu ada dan bulatkan ke atas
        unit: item.unit || 'PCS',
        description: item.materialName || '',
      };
    });

    // Calculate total
    const total = enrichedLines.reduce((sum: number, line: any) => sum + (line.qty * line.price), 0);

    // Prepare detail object
    const detail = {
      prNo: pr.prNo,
      createdAt: pr.created,
      spkNo: pr.spkNo,
      soNo: pr.soNo,
    };

    // Generate HTML using template
    return generatePRHtml({
      logo,
      company,
      detail,
      customer: pr.customer || '-',
      product: pr.product || '-',
      enrichedLines,
      total,
    });
  };

  const handleViewPR = async (spk: any) => {
    try {
      // Cari PR untuk SPK ini
      const spkNo = (spk.spkNo || '').toString().trim();
      const relatedPR = purchaseRequests.find((pr: any) => 
        (pr.spkNo || '').toString().trim() === spkNo
      );

      if (!relatedPR) {
        showAlert(`Tidak ada Purchase Request untuk SPK ${spkNo}`, 'Information');
        return;
      }

      const html = await generatePRHtmlContent(relatedPR);
      setViewPdfData({ html, prNo: relatedPR.prNo });
    } catch (error: any) {
      showAlert(`Error generating PR preview: ${error.message}`, 'Error');
    }
  };

  const handleSavePRToPDF = async () => {
    if (!viewPdfData) return;

    try {
      const electronAPI = (window as any).electronAPI;
      const fileName = `${viewPdfData.prNo}.pdf`;

      // Check if Electron API is available (for file picker)
      if (electronAPI && typeof electronAPI.savePdf === 'function') {
        // Electron: Use file picker to select save location, then convert HTML to PDF and save
        const result = await electronAPI.savePdf(viewPdfData.html, fileName);
        if (result.success) {
          showAlert(`PDF saved successfully to:\n${result.path}`, 'Success');
          setViewPdfData(null);
        } else if (!result.canceled) {
          showAlert(`Error saving PDF: ${result.error || 'Unknown error'}`, 'Error');
        }
        // If canceled, do nothing (user closed dialog)
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
        // Browser: Open print dialog, user can select "Save as PDF"
        openPrintWindow(viewPdfData.html);
      }
    } catch (error: any) {
      console.error('Error saving PDF:', error);
      showAlert(`Error: ${error.message || 'Unknown error'}`, 'Error');
    }
  };

  const handleSaveBOM = async (bomItems: any[]) => {
    if (!editingBOM) return;

    try {
      // Load existing BOM
      const existingBOM = extractStorageValue(await storageService.get<any[]>('bom'));
      const productId = (editingBOM.product_id || editingBOM.kode || '').toString().trim();

      if (!productId) {
        showAlert('Product ID tidak ditemukan. Tidak bisa menyimpan BOM.', 'Error');
        setEditingBOM(null);
        return;
      }

      // Remove old BOM items for this product (hapus semua yang product_id sama)
      const filteredBOM = existingBOM.filter(b => {
        const bomProductId = (b.product_id || b.kode || '').toString().trim();
        return bomProductId !== productId;
      });

      // Add new BOM items - format sesuai sheet: product_id, material_id, ratio
      // Jangan duplicate material_id di BOM yang sama
      const materialIdSet = new Set<string>();
      const newBOMItems = bomItems
        .filter(item => {
          const materialId = (item.material_id || '').toString().trim();
          if (!materialId) return false;
          if (materialIdSet.has(materialId)) {
            // Skip duplicate material_id
            return false;
          }
          materialIdSet.add(materialId);
          return true;
        })
        .map(item => ({
          id: item.id || `bom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          product_id: productId,
          material_id: item.material_id,
          ratio: item.ratio || 1,
          created: item.id ? undefined : new Date().toISOString(),
        }));

      // Save to storage
      const updatedBOM = [...filteredBOM, ...newBOMItems];
      await storageService.set('bom', updatedBOM);

      // Broadcast event untuk sync ke Master Products dan module lain
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bomUpdated', { 
          detail: { productId, bomItems: newBOMItems, source: 'PPIC' } 
        }));
      }

      // Tampilkan pesan sukses dengan info SPK jika ada
      const successMessage = editingBOM.spkNo 
        ? `BOM berhasil disimpan untuk SPK: ${editingBOM.spkNo}\n\n(${newBOMItems.length} material)`
        : `BOM berhasil disimpan untuk product: ${editingBOM.product || productId}\n\n(${newBOMItems.length} material)`;
      showAlert(successMessage, 'Success');
      setEditingBOM(null);
      
      // Reload data untuk update tampilan
      loadData();
    } catch (error: any) {
      showAlert(`Error saving BOM: ${error.message}`, 'Error');
    }
  };

  // Check material stock availability (MRP) - dengan mempertimbangkan production yang sudah CLOSE dan SPK yang sudah dibuat
  // IMPORTANT: Fungsi ini harus mempertimbangkan alokasi stock yang sudah dilakukan untuk SPK lain
  const checkMaterialStock = async (materialId: string, excludeSpkNo?: string): Promise<number> => {
    const inventory = extractStorageValue(await storageService.get<any[]>('inventory'));
    const material = inventory.find((inv: any) => 
      (inv.codeItem || '').toString().trim() === materialId.toString().trim()
    );
    
    if (!material) return 0; // Material tidak ada di inventory, anggap stok 0
    
    // Base stock dari inventory (tanpa outgoing, karena outgoing sudah termasuk alokasi)
    // Kita akan hitung reserved material secara manual untuk akurasi
    const baseStockWithoutOutgoing = (material.stockPremonth || 0) + (material.receive || 0) + (material.return || 0);
    
    // Cek production yang sudah CLOSE untuk hitung outgoing yang sudah terpakai
    const productionList = extractStorageValue(await storageService.get<any[]>('production'));
    const bomDataForCheck = extractStorageValue(await storageService.get<any[]>('bom'));
    const spkList = extractStorageValue(await storageService.get<any[]>('spk'));
    const salesOrdersList = extractStorageValue(await storageService.get<any[]>('salesOrders'));
    
    // Hitung material yang sudah digunakan oleh production CLOSE
    let materialUsedByClosedProduction = 0;
    for (const prod of productionList) {
      if (prod.status === 'CLOSE' && prod.spkNo) {
        const spk = spkList.find((s: any) => s.spkNo === prod.spkNo);
        if (spk && spk.soNo) {
          const so = salesOrdersList.find((s: any) => s.soNo === spk.soNo);
          if (so && so.items) {
            for (const soItem of so.items) {
              const productId = (soItem.productId || soItem.productKode || '').toString().trim();
              const productBOM = bomDataForCheck.filter((b: any) => {
                const bomProductId = (b.product_id || b.kode || '').toString().trim();
                return bomProductId === productId;
              });
              
              for (const bom of productBOM) {
                const bomMaterialId = (bom.material_id || '').toString().trim();
                if (bomMaterialId === materialId.toString().trim()) {
                  // Production sudah CLOSE, material sudah terpakai
                  const qtyUsed = (spk.qty || 0) * (bom.ratio || 1);
                  materialUsedByClosedProduction += qtyUsed;
                }
              }
            }
          }
        }
      }
    }
    
    // Hitung material yang sudah dialokasikan untuk SPK lain (via allocatedSPKs dan outgoing)
    // Ini penting untuk mencegah double allocation
    let materialAllocatedByOtherSPKs = 0;
    
    // Cek allocatedSPKs di inventory item
    if (material.allocatedSPKs && Array.isArray(material.allocatedSPKs)) {
      // Hitung total alokasi dari SPK yang sudah dialokasikan
      for (const allocatedSpkNo of material.allocatedSPKs) {
        // Skip SPK yang sedang dicek (excludeSpkNo)
        if (excludeSpkNo && allocatedSpkNo === excludeSpkNo) continue;
        
        const allocatedSpk = spkList.find((s: any) => s.spkNo === allocatedSpkNo);
        if (allocatedSpk && (allocatedSpk.status === 'OPEN' || allocatedSpk.status === 'DRAFT')) {
          // Hitung qty material yang dialokasikan untuk SPK ini
          if (allocatedSpk.soNo) {
            const so = salesOrdersList.find((s: any) => s.soNo === allocatedSpk.soNo);
            if (so && so.items) {
              for (const soItem of so.items) {
                const productId = (soItem.productId || soItem.productKode || '').toString().trim();
                const productBOM = bomDataForCheck.filter((b: any) => {
                  const bomProductId = (b.product_id || b.kode || '').toString().trim();
                  return bomProductId === productId;
                });
                
                for (const bom of productBOM) {
                  const bomMaterialId = (bom.material_id || '').toString().trim();
                  if (bomMaterialId === materialId.toString().trim()) {
                    // Cek apakah ada override qty
                    const spkBOMOverride = allocatedSpk.bomOverride || {};
                    let qtyAllocated: number;
                    if (spkBOMOverride[bomMaterialId] !== undefined && spkBOMOverride[bomMaterialId] !== null) {
                      qtyAllocated = parseFloat(spkBOMOverride[bomMaterialId]) || 0;
                    } else {
                      qtyAllocated = (allocatedSpk.qty || 0) * (bom.ratio || 1);
                    }
                    materialAllocatedByOtherSPKs += qtyAllocated;
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // Hitung material yang akan digunakan oleh SPK yang sudah dibuat (tapi production belum CLOSE dan belum dialokasikan)
    // Ini untuk SPK yang belum dialokasikan stock tapi sudah dibuat
    let materialReservedBySPK = 0;
    for (const spk of spkList) {
      // Skip SPK yang sedang dicek
      if (excludeSpkNo && spk.spkNo === excludeSpkNo) continue;
      
      // Skip SPK yang sudah dialokasikan (sudah dihitung di materialAllocatedByOtherSPKs)
      if (material.allocatedSPKs && Array.isArray(material.allocatedSPKs) && material.allocatedSPKs.includes(spk.spkNo)) {
        continue;
      }
      
      if ((spk.status === 'OPEN' || spk.status === 'DRAFT') && spk.soNo) {
        const so = salesOrdersList.find((s: any) => s.soNo === spk.soNo);
        if (so && so.items) {
          for (const soItem of so.items) {
            const productId = (soItem.productId || soItem.productKode || '').toString().trim();
            const productBOM = bomDataForCheck.filter((b: any) => {
              const bomProductId = (b.product_id || b.kode || '').toString().trim();
              return bomProductId === productId;
            });
            
            for (const bom of productBOM) {
              const bomMaterialId = (bom.material_id || '').toString().trim();
              if (bomMaterialId === materialId.toString().trim()) {
                // Cek apakah production untuk SPK ini sudah CLOSE
                const prodForSPK = productionList.find((p: any) => p.spkNo === spk.spkNo && p.status === 'CLOSE');
                if (!prodForSPK) {
                  // SPK sudah dibuat tapi production belum CLOSE, material akan digunakan
                  // Cek apakah ada override qty
                  const spkBOMOverride = spk.bomOverride || {};
                  let qtyNeeded: number;
                  if (spkBOMOverride[bomMaterialId] !== undefined && spkBOMOverride[bomMaterialId] !== null) {
                    qtyNeeded = parseFloat(spkBOMOverride[bomMaterialId]) || 0;
                  } else {
                    qtyNeeded = (spk.qty || 0) * (bom.ratio || 1);
                  }
                  materialReservedBySPK += qtyNeeded;
                }
              }
            }
          }
        }
      }
    }
    
    // Available stock = base stock - material yang sudah digunakan - material yang sudah dialokasikan - material yang reserved
    // Base stock tanpa outgoing, lalu kurangi semua alokasi dan reserved
    const availableStock = baseStockWithoutOutgoing - materialUsedByClosedProduction - materialAllocatedByOtherSPKs - materialReservedBySPK;
    
    // Pastikan tidak negatif
    return Math.max(0, availableStock);
  };

  const handleCreatePR = async (item: any) => {
    const spkNo = (item.spkNo || '').toString().trim();
    
    // Prevent double click - cek apakah sedang proses
    if (creatingPR[spkNo]) {
      console.log('[PPIC] Create PR already in progress for', spkNo);
      return;
    }
    
    try {
      console.log('[PPIC] Creating PR for SPK:', spkNo);
      // Refresh data sebelum cek stock untuk memastikan data ter-update
      await loadData();
      console.log('[PPIC] Data loaded successfully');
    } catch (error: any) {
      console.error('[PPIC] Error loading data:', error);
      showAlert(`Error loading data: ${error.message}`, 'Error');
      return;
    }
    
    // Cek apakah sudah ada PR untuk SPK ini
    const existingPR = purchaseRequests.find((pr: any) => {
      const prSpkNo = (pr.spkNo || '').toString().trim();
      return prSpkNo === spkNo && prSpkNo !== '';
    });
    
    if (existingPR) {
      // Jika PR status PO_CREATED, cek apakah PO masih ada
      if (existingPR.status === 'PO_CREATED') {
        const purchaseOrders = extractStorageValue(await storageService.get<any[]>('purchaseOrders'));
        const relatedPOs = purchaseOrders.filter((po: any) => 
          (po.spkNo || '').toString().trim() === spkNo || 
          (po.soNo || '').toString().trim() === (existingPR.soNo || '').toString().trim()
        );
        
        if (relatedPOs.length === 0) {
          // PO tidak ada, tanya apakah mau delete PR yang "terjebak"
          showConfirm(
            `PR untuk SPK ${spkNo} sudah ada dengan status PO_CREATED, tapi PO tidak ditemukan!\n\nPR No: ${existingPR.prNo}\nStatus: ${existingPR.status}\n\nKemungkinan PO sudah dihapus atau data tidak konsisten.\n\nHapus PR ini dan buat PR baru?`,
            async () => {
              try {
                const updatedPRs = purchaseRequests.filter((pr: any) => pr.id !== existingPR.id);
                await storageService.set('purchaseRequests', updatedPRs);
                setPurchaseRequests(updatedPRs);
                // Retry create PR
                await handleCreatePRContinue(item);
              } catch (error: any) {
                showAlert(`Error deleting PR: ${error.message}`, 'Error');
              }
            },
            () => {
              setCreatingPR(prev => {
                const newState = { ...prev };
                delete newState[spkNo];
                return newState;
              });
              closeDialog();
            },
            'PR Terjebak - Hapus & Buat Baru?'
          );
          return;
        } else {
          // PO masih ada, tidak bisa buat PR baru
          showAlert(`PR untuk SPK ${spkNo} sudah ada!\n\nPR No: ${existingPR.prNo}\nStatus: ${existingPR.status}\n\nPO terkait: ${relatedPOs.map(po => po.poNo).join(', ')}\n\nTidak bisa membuat PR duplikat.`, 'Information');
          return;
        }
      } else {
        // PR status PENDING atau APPROVED
        showAlert(`PR untuk SPK ${spkNo} sudah ada!\n\nPR No: ${existingPR.prNo}\nStatus: ${existingPR.status}\n\nTidak bisa membuat PR duplikat.`, 'Information');
        return;
      }
    }
    
    try {
      // Set loading state
      setCreatingPR(prev => ({ ...prev, [spkNo]: true }));
      
      // Cek apakah product sudah ada di inventory (finished goods)
      const inventory = extractStorageValue(await storageService.get<any[]>('inventory'));
      const productId = (item.product_id || item.kode || '').toString().trim();
      
      // Cek stok finished goods (product)
      const productInv = inventory.find((inv: any) => 
        (inv.codeItem || '').toString().trim() === productId
      );
      const productStock = productInv 
        ? (productInv.stockPremonth || 0) + (productInv.receive || 0) - (productInv.outgoing || 0) + (productInv.return || 0)
        : 0;
      
      // Hitung total kebutuhan product dari semua SPK aktif yang menggunakan product yang sama
      // SPK aktif = status OPEN atau DRAFT, dan belum ada production yang CLOSE
      const normalizeKey = (value: any) => (value ?? '').toString().trim().toLowerCase();
      const currentProductKey = normalizeKey(productId);
      let totalRequiredQty = 0;
      const matchingSPKs: any[] = [];
      
      // Loop semua SPK aktif yang menggunakan product yang sama
      for (const spk of spkData) {
        // Skip SPK yang sudah CLOSE
        if (spk.status === 'CLOSE') continue;
        
        // Skip SPK yang sudah ada production CLOSE
        const relatedProduction = productionData.find((p: any) => 
          p.spkNo === spk.spkNo && p.status === 'CLOSE'
        );
        if (relatedProduction) continue;
        
        // Cek apakah SPK ini menggunakan product yang sama
        const spkProductKey = normalizeKey(spk.product_id || spk.kode);
        if (spkProductKey === currentProductKey) {
          const spkQty = parseFloat(spk.qty || '0') || 0;
          totalRequiredQty += spkQty;
          matchingSPKs.push({ spkNo: spk.spkNo, qty: spkQty });
        }
      }
      
      console.log(`🔍 [PPIC Stock Check] SPK ${spkNo}, Product ${productId}:`);
      console.log(`   Stock tersedia: ${productStock}`);
      console.log(`   Total kebutuhan semua SPK aktif: ${totalRequiredQty}`);
      console.log(`   SPK yang menggunakan product sama: ${matchingSPKs.map(s => `${s.spkNo} (${s.qty})`).join(', ')}`);
      
      // Jika product stock sudah cukup untuk TOTAL kebutuhan semua SPK aktif, tidak perlu beli material
      // TAPI: hanya jika totalRequiredQty > 0 DAN stock cukup untuk semua kebutuhan
      // Jika stock tidak cukup, lanjutkan untuk membuat PR
      if (totalRequiredQty > 0 && productStock >= totalRequiredQty) {
        // Stock cukup untuk semua SPK aktif - SKIP PR/GRN, langsung set production selesai
        setCreatingPR(prev => {
          const newState = { ...prev };
          delete newState[spkNo];
          return newState;
        });
        
        // IMPORTANT: Langsung create production notification dan production record dengan status CLOSE
        try {
          const productionNotifications = await storageService.get<any[]>('productionNotifications') || [];
          const productions = await storageService.get<any[]>('production') || [];
          
          // Cek apakah sudah ada production notification untuk SPK ini
          const existingNotif = productionNotifications.find((n: any) => 
            n.spkNo === item.spkNo && n.productId === productId
          );
          
          // Cek apakah sudah ada production record untuk SPK ini
          const existingProduction = productions.find((p: any) => p.spkNo === item.spkNo);
          
          const targetQty = item.qty || 0;
          const now = new Date();
          const day = String(now.getDate()).padStart(2, '0');
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const year = String(now.getFullYear()).slice(-2);
          
          // Generate production number
          const generateRandomCode = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let code = '';
            for (let i = 0; i < 5; i++) {
              code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return code;
          };
          const prodRandomCode = generateRandomCode();
          const productionNo = `PROD/${year}${month}${day}/${prodRandomCode}`;
          
          // Update atau create production notification dengan status COMPLETED
          let updatedNotifications = [...productionNotifications];
          if (existingNotif) {
            updatedNotifications = updatedNotifications.map((n: any) => 
              n.id === existingNotif.id ? {
                ...n,
                status: 'COMPLETED',
                materialStatus: 'RECEIVED',
                pendingQty: 0,
                qty: targetQty,
              } : n
            );
          } else {
            // Create new notification dengan status COMPLETED
            const newNotification = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              type: 'PRODUCTION_SCHEDULE',
              spkNo: item.spkNo,
              soNo: item.soNo || '',
              customer: item.customer || '',
              product: item.product || '',
              productId: productId,
              qty: targetQty,
              status: 'COMPLETED',
              materialStatus: 'RECEIVED',
              pendingQty: 0,
              created: new Date().toISOString(),
            };
            updatedNotifications.push(newNotification);
          }
          
          // Update atau create production record dengan status CLOSE dan progress = target
          let updatedProductions = [...productions];
          if (existingProduction) {
            updatedProductions = updatedProductions.map((p: any) => 
              p.id === existingProduction.id ? {
                ...p,
                status: 'CLOSE',
                progress: targetQty,
                producedQty: targetQty,
                remaining: 0,
              } : p
            );
          } else {
            // Create new production record dengan status CLOSE
            const newProduction = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              productionNo: productionNo,
              spkNo: item.spkNo,
              soNo: item.soNo || '',
              customer: item.customer || '',
              product: item.product || '',
              productId: productId,
              target: targetQty,
              targetQty: targetQty,
              status: 'CLOSE',
              date: new Date().toISOString().split('T')[0],
              progress: targetQty,
              producedQty: targetQty,
              remaining: 0,
            };
            updatedProductions.push(newProduction);
          }
          
          // Save to storage
          await storageService.set('productionNotifications', updatedNotifications);
          await storageService.set('production', updatedProductions);
          
          console.log(`✅ [PPIC Stock Sufficient] SPK ${item.spkNo}: Stock cukup, production langsung set ke CLOSE (${targetQty}/${targetQty})`);
        } catch (error: any) {
          console.error('[PPIC] Error creating production for sufficient stock:', error);
        }
        
        showAlert(`SPK: ${item.spkNo}\n\n✅ Product sudah cukup stok!\n\nStok tersedia: ${productStock}\nTotal kebutuhan semua SPK aktif: ${totalRequiredQty} ${item.qty ? `(SPK ini: ${item.qty})` : ''}\n\nSPK yang menggunakan product sama:\n${matchingSPKs.map(s => `• ${s.spkNo}: ${s.qty} PCS`).join('\n')}\n\n✅ Production langsung set ke selesai (${item.qty || 0}/${item.qty || 0}). Work to do: Pengiriman.`, 'Information');
        loadData(); // Refresh data
        return;
      } else if (totalRequiredQty > 0 && productStock < totalRequiredQty) {
        // Stock tidak cukup untuk semua SPK aktif, lanjutkan untuk membuat PR
        console.log(`⚠️ [PPIC Stock Check] Product ${productId}: Stock tidak cukup untuk semua SPK aktif. Available: ${productStock}, Total Required: ${totalRequiredQty} (SPK ${spkNo}: ${item.qty || 0})`);
        console.log('[PPIC] ✅ Passed stock check - will show confirm dialog');
      } else {
        // totalRequiredQty = 0 atau tidak ada SPK lain, lanjutkan untuk membuat PR
        console.log(`ℹ️ [PPIC Stock Check] Product ${productId}: Total required = ${totalRequiredQty}. Lanjutkan create PR untuk material.`);
        console.log('[PPIC] ✅ No other SPKs - will show confirm dialog');
      }
      
      console.log('[PPIC] 🚀 About to call showConfirm...');
      console.log('[PPIC] Showing confirm dialog for PR creation');
      
      try {
        showConfirm(
          `Kirim kebutuhan material ke Purchasing untuk SPK: ${item.spkNo}?\n\nPurchasing akan membuatkan PO untuk material yang stoknya kurang.`,
          async () => {
            console.log('[PPIC] User confirmed, creating PR...');
            await handleCreatePRContinue(item);
          },
          () => {
            console.log('[PPIC] User cancelled PR creation');
            setCreatingPR(prev => {
              const newState = { ...prev };
              delete newState[spkNo];
              return newState;
            });
            closeDialog();
          },
          'Create Purchase Request'
        );
        console.log('[PPIC] ✅ showConfirm completed, waiting for user action...');
      } catch (confirmError: any) {
        console.error('[PPIC] ❌ Error calling showConfirm:', confirmError);
      }
      return;
    } catch (error: any) {
      console.error('[PPIC] Error in handleCreatePR:', error);
      setCreatingPR(prev => {
        const newState = { ...prev };
        delete newState[spkNo];
        return newState;
      });
      showAlert(`Error creating PR: ${error.message}`, 'Error');
    }
  };

  const handleCreatePRContinue = async (item: any) => {
    const spkNo = (item.spkNo || '').toString().trim();
    
    try {
      console.log('[PPIC] Continue creating PR for SPK:', spkNo);
      // Double check: cek lagi apakah sudah ada PR (prevent race condition)
      const currentPRs = extractStorageValue(await storageService.get<any[]>('purchaseRequests'));
      console.log('[PPIC] Current PRs count:', currentPRs.length);
      const existingPR = currentPRs.find((pr: any) => {
        const prSpkNo = (pr.spkNo || '').toString().trim();
        return prSpkNo === spkNo && prSpkNo !== '';
      });
      
      if (existingPR) {
        setCreatingPR(prev => {
          const newState = { ...prev };
          delete newState[spkNo];
          return newState;
        });
        showAlert(`PR untuk SPK ${spkNo} sudah ada!\n\nPR No: ${existingPR.prNo}\nStatus: ${existingPR.status}\n\nTidak bisa membuat PR duplikat.`, 'Information');
        closeDialog();
        return;
      }
      
      const productId = (item.product_id || item.kode || '').toString().trim();
      const bomData = extractStorageValue(await storageService.get<any[]>('bom'));
      const materials = extractStorageValue(await storageService.get<any[]>('materials'));
      
      // IMPORTANT: Filter BOM dan deduplicate berdasarkan material_id
      // Setiap material hanya muncul sekali, meskipun ada duplikasi di BOM data
      const spkBOMRaw = bomData.filter(b => {
        const bomProductId = (b.product_id || b.kode || '').toString().trim();
        return bomProductId === productId;
      });
      
      // Deduplicate BOM berdasarkan material_id (jika ada duplikasi)
      const bomMap = new Map<string, any>();
      spkBOMRaw.forEach((bom: any) => {
        const materialId = (bom.material_id || '').toString().trim();
        if (!materialId) return;
        
        if (!bomMap.has(materialId)) {
          bomMap.set(materialId, bom);
        } else {
          // Jika material sudah ada, keep yang pertama (skip duplikasi)
          console.log(`⚠️ [BOM Deduplication] Duplicate BOM entry found for material ${materialId}, keeping first entry`);
        }
      });
      
      const spkBOM = Array.from(bomMap.values());
      
      console.log(`📋 [BOM] Product ${productId}: Found ${spkBOMRaw.length} BOM entries, ${spkBOM.length} unique materials after deduplication`);
      
      if (spkBOM.length === 0) {
        setCreatingPR(prev => {
          const newState = { ...prev };
          delete newState[spkNo];
          return newState;
        });
        showAlert(`SPK: ${item.spkNo}\n\n⚠️ BOM belum dikonfigurasi untuk product ini.\n\nSilakan tambahkan BOM di Master Products terlebih dahulu.`, 'Warning');
        closeDialog();
        return;
      }
      
      // Step 1: Cek material yang stock-nya cukup dan tanya apakah mau pakai stock
      const materialsWithStock: any[] = [];
      const materialsNeedingPR: any[] = [];
      const materialStatus: string[] = [];
      
      for (const bom of spkBOM) {
        const bomMaterialId = (bom.material_id || '').toString().trim();
        const material = materials.find(m => {
          const mId = (m.material_id || m.kode || '').toString().trim();
          return mId === bomMaterialId;
        });
        
        if (!material) {
          console.warn(`⚠️  Warning: Material not found for BOM material_id: ${bomMaterialId}`);
          materialStatus.push(`❌ ${bomMaterialId} - Material tidak ditemukan di Master`);
          continue;
        }
        
        // IMPORTANT: Cek apakah ada override qty dari PPIC (tidak mengikuti ratio)
        // Jika ada bomOverride di SPK, gunakan itu. Jika tidak, gunakan ratio calculation
        const spkBOMOverride = item.bomOverride || {}; // SPK-specific BOM override: { materialId: qty }
        const bomRatio = parseFloat(bom.ratio) || 1;
        const spkQty = parseFloat(item.qty) || 0;
        
        let requiredQty: number;
        if (spkBOMOverride[bomMaterialId] !== undefined && spkBOMOverride[bomMaterialId] !== null) {
          // Gunakan override qty dari PPIC (tidak mengikuti ratio)
          requiredQty = parseFloat(spkBOMOverride[bomMaterialId]) || 0;
          console.log(`📊 [BOM Override] Material ${bomMaterialId}: Using override qty=${requiredQty} (not following ratio ${bomRatio})`);
        } else {
          // Gunakan ratio calculation (default)
          requiredQty = spkQty * bomRatio;
          console.log(`📊 [BOM Calculation] Material ${bomMaterialId}: SPK Qty=${spkQty}, Ratio=${bomRatio}, Required=${requiredQty}`);
        }
        
        // Check stock availability menggunakan fungsi checkMaterialStock
        // IMPORTANT: Exclude SPK ini dari perhitungan reserved material (untuk mencegah double-count)
        const availableStock = await checkMaterialStock(bomMaterialId, spkNo);
        
        if (availableStock >= requiredQty) {
          // Stock cukup, simpan untuk ditanyakan apakah mau pakai stock
          materialsWithStock.push({
            bom,
            material,
            bomMaterialId,
            requiredQty,
            availableStock,
          });
          materialStatus.push(`✅ ${material.nama} - Stok cukup (${availableStock} >= ${requiredQty})`);
        } else {
          // Stock tidak cukup, perlu PR
          const shortageQty = requiredQty - availableStock;
          const materialPrice = material.priceMtr || material.harga || (material as any).hargaSales || 0;
          
          materialsNeedingPR.push({
            bom,
            material,
            bomMaterialId,
            requiredQty,
            availableStock,
            shortageQty,
            materialPrice,
          });
          materialStatus.push(`❌ ${material.nama} - Kurang ${shortageQty} (butuh: ${requiredQty}, ada: ${availableStock})`);
        }
      }
      
      // Step 2: Jika ada material yang stock-nya cukup, tanya apakah mau pakai stock
      let useStockForMaterials: string[] = []; // List material ID yang mau pakai stock
      
      if (materialsWithStock.length > 0) {
        const materialList = materialsWithStock.map(m => 
          `• ${m.material.nama} (${m.bomMaterialId})\n  Butuh: ${m.requiredQty}, Tersedia: ${m.availableStock}`
        ).join('\n\n');
        
        const useStock = await new Promise<boolean>((resolve) => {
          showConfirm(
            `SPK: ${item.spkNo}\n\nAda ${materialsWithStock.length} material yang stoknya cukup:\n\n${materialList}\n\nApakah Anda mau menggunakan stock yang ada untuk lanjut ke produksi?\n\nJika Ya, stock akan dialokasikan untuk SPK ini dan material lain yang kurang akan dibuatkan PR.`,
            async () => {
              // User pilih pakai stock
              useStockForMaterials = materialsWithStock.map(m => m.bomMaterialId);
              
              // Alokasikan stock dengan update inventory outgoing
              const inventory = extractStorageValue(await storageService.get<any[]>('inventory'));
              
              for (const mat of materialsWithStock) {
                const inventoryItem = inventory.find((inv: any) => 
                  (inv.codeItem || '').toString().trim() === mat.bomMaterialId
                );
                
                if (inventoryItem) {
                  // Update outgoing untuk alokasi stock
                  const oldOutgoing = inventoryItem.outgoing || 0;
                  const newOutgoing = oldOutgoing + mat.requiredQty;
                  inventoryItem.outgoing = newOutgoing;
                  
                  // Recalculate nextStock
                  inventoryItem.nextStock = 
                    (inventoryItem.stockPremonth || 0) + 
                    (inventoryItem.receive || 0) - 
                    newOutgoing + 
                    (inventoryItem.return || 0);
                  inventoryItem.lastUpdate = new Date().toISOString();
                  
                  // Track SPK yang sudah dialokasikan stock (untuk anti-duplicate)
                  if (!inventoryItem.allocatedSPKs) {
                    inventoryItem.allocatedSPKs = [];
                  }
                  if (!inventoryItem.allocatedSPKs.includes(spkNo)) {
                    inventoryItem.allocatedSPKs.push(spkNo);
                  }
                  
                  console.log(`✅ [Stock Allocation] Material ${mat.material.nama} (${mat.bomMaterialId}): Allocated ${mat.requiredQty} for SPK ${spkNo}`);
                }
              }
              
              await storageService.set('inventory', inventory);
              closeDialog();
              resolve(true);
            },
            () => {
              // User pilih tidak pakai stock
              closeDialog();
              resolve(false);
            },
            'Gunakan Stock yang Ada?'
          );
        });
        
        if (!useStock) {
          // User tidak mau pakai stock, semua material yang cukup juga perlu PR
          for (const mat of materialsWithStock) {
            const materialPrice = mat.material.priceMtr || mat.material.harga || (mat.material as any).hargaSales || 0;
            materialsNeedingPR.push({
              bom: mat.bom,
              material: mat.material,
              bomMaterialId: mat.bomMaterialId,
              requiredQty: mat.requiredQty,
              availableStock: mat.availableStock,
              shortageQty: mat.requiredQty, // Semua perlu dibeli karena tidak pakai stock
              materialPrice,
            });
          }
        }
      }
      
      // Step 3: Buat PR untuk material yang kurang
      // IMPORTANT: Deduplicate materials berdasarkan materialId (gabungkan qty jika ada duplikasi)
      const materialMap = new Map<string, any>();
      
      for (const mat of materialsNeedingPR) {
        // Skip material yang sudah dialokasikan stock
        if (useStockForMaterials.includes(mat.bomMaterialId)) {
          continue;
        }
        
        const materialId = (mat.bomMaterialId || '').toString().trim();
        if (!materialId) continue;
        
        // Jika material sudah ada di map, gabungkan qty
        if (materialMap.has(materialId)) {
          const existing = materialMap.get(materialId);
          // Gabungkan requiredQty dan shortageQty
          existing.requiredQty += mat.requiredQty;
          existing.shortageQty += mat.shortageQty;
          // Keep availableStock yang lebih kecil (worst case)
          existing.availableStock = Math.min(existing.availableStock, mat.availableStock);
          console.log(`🔄 [PPIC PR] Deduplicating material ${materialId}: Combined qty (required: ${existing.requiredQty}, shortage: ${existing.shortageQty})`);
        } else {
          // Pastikan harga selalu diambil dari master material (fallback ke materialPrice jika ada)
          let materialPrice = mat.materialPrice || 
                             mat.material?.priceMtr || 
                             mat.material?.harga || 
                             (mat.material as any)?.hargaSales || 
                             0;
          
          // Jika harga masih 0, coba cari lagi dari master materials yang sudah di-load
          if (!materialPrice || materialPrice === 0) {
            const materials = extractStorageValue(await storageService.get<any[]>('materials'));
            const materialFromMaster = materials.find((m: any) => {
              const mId = (m.material_id || m.kode || '').toString().trim();
              return mId === materialId;
            });
            if (materialFromMaster) {
              materialPrice = materialFromMaster.priceMtr || 
                             materialFromMaster.harga || 
                             (materialFromMaster as any).hargaSales || 
                             0;
            }
          }
          
          // Validasi: Jika harga masih 0, log warning
          if (!materialPrice || materialPrice === 0) {
            console.warn(`⚠️ [PPIC PR] Material ${mat.material.nama} (${materialId}) tidak punya harga di master data. Menggunakan harga 0.`);
          }
          
          materialMap.set(materialId, {
            materialId: materialId,
            materialName: mat.material.nama,
            materialKode: mat.material.material_id || mat.material.kode,
            supplier: mat.material.supplier || '',
            unit: mat.material.satuan || 'PCS',
            price: Math.ceil(materialPrice),
            requiredQty: mat.requiredQty,
            availableStock: mat.availableStock,
            shortageQty: mat.shortageQty,
          });
        }
      }
      
      // Convert map to array
      const prItems: any[] = Array.from(materialMap.values());
      
      if (prItems.length > 0) {
        // Create Purchase Request
        const allPRs = extractStorageValue(await storageService.get<any[]>('purchaseRequests'));
        // Generate random PR number
        const now = new Date();
        const year = String(now.getFullYear()).slice(-2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const randomCode = Math.random().toString(36).substr(2, 5).toUpperCase();
        const prNo = `PR-${year}${month}${day}-${randomCode}`;
        
        const prData = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          prNo: prNo,
          spkNo: item.spkNo,
          soNo: item.soNo,
          customer: item.customer,
          product: item.product,
          items: prItems,
          status: 'PENDING', // PENDING -> APPROVED -> PO CREATED
          created: new Date().toISOString(),
          createdBy: 'PPIC',
        };
        
        const currentPR = extractStorageValue(await storageService.get<any[]>('purchaseRequests'));
        await storageService.set('purchaseRequests', [...currentPR, prData]);
        
        const statusText = materialStatus.join('\n');
        showAlert(`Purchase Request ${prData.prNo} berhasil dikirim ke Purchasing!\n\n📋 Status Material:\n${statusText}\n\n✅ ${prItems.length} material memerlukan pembelian.`, 'Success');
        closeDialog();
        // Clear loading state
        setCreatingPR(prev => {
          const newState = { ...prev };
          delete newState[spkNo];
          return newState;
        });
        loadData();
      } else {
        const statusText = materialStatus.join('\n');
        // IMPORTANT: Semua material sudah cukup stok - SKIP PR/GRN, langsung set production selesai
        try {
          const productionNotifications = await storageService.get<any[]>('productionNotifications') || [];
          const productions = await storageService.get<any[]>('production') || [];
          
          // Cek apakah sudah ada production notification untuk SPK ini
          const existingNotif = productionNotifications.find((n: any) => 
            n.spkNo === item.spkNo && n.productId === (item.product_id || item.kode)
          );
          
          // Cek apakah sudah ada production record untuk SPK ini
          const existingProduction = productions.find((p: any) => p.spkNo === item.spkNo);
          
          const targetQty = item.qty || 0;
          const now = new Date();
          const day = String(now.getDate()).padStart(2, '0');
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const year = String(now.getFullYear()).slice(-2);
          
          // Generate production number
          const generateRandomCode = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let code = '';
            for (let i = 0; i < 5; i++) {
              code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return code;
          };
          const prodRandomCode = generateRandomCode();
          const productionNo = `PROD/${year}${month}${day}/${prodRandomCode}`;
          
          // Update atau create production notification dengan status COMPLETED
          let updatedNotifications = [...productionNotifications];
          if (existingNotif) {
            updatedNotifications = updatedNotifications.map((n: any) => 
              n.id === existingNotif.id ? {
                ...n,
                status: 'COMPLETED',
                materialStatus: 'RECEIVED',
                pendingQty: 0,
                qty: targetQty,
              } : n
            );
          } else {
            // Create new notification dengan status COMPLETED
            const newNotification = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              type: 'PRODUCTION_SCHEDULE',
              spkNo: item.spkNo,
              soNo: item.soNo || '',
              customer: item.customer || '',
              product: item.product || '',
              productId: item.product_id || item.kode || '',
              qty: targetQty,
              status: 'COMPLETED',
              materialStatus: 'RECEIVED',
              pendingQty: 0,
              created: new Date().toISOString(),
            };
            updatedNotifications.push(newNotification);
          }
          
          // Update atau create production record dengan status CLOSE dan progress = target
          let updatedProductions = [...productions];
          if (existingProduction) {
            updatedProductions = updatedProductions.map((p: any) => 
              p.id === existingProduction.id ? {
                ...p,
                status: 'CLOSE',
                progress: targetQty,
                producedQty: targetQty,
                remaining: 0,
              } : p
            );
          } else {
            // Create new production record dengan status CLOSE
            const newProduction = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              productionNo: productionNo,
              spkNo: item.spkNo,
              soNo: item.soNo || '',
              customer: item.customer || '',
              product: item.product || '',
              productId: item.product_id || item.kode || '',
              target: targetQty,
              targetQty: targetQty,
              status: 'CLOSE',
              date: new Date().toISOString().split('T')[0],
              progress: targetQty,
              producedQty: targetQty,
              remaining: 0,
            };
            updatedProductions.push(newProduction);
          }
          
          // Save to storage
          await storageService.set('productionNotifications', updatedNotifications);
          await storageService.set('production', updatedProductions);
          
          console.log(`✅ [PPIC All Materials Sufficient] SPK ${item.spkNo}: Semua material cukup, production langsung set ke CLOSE (${targetQty}/${targetQty})`);
        } catch (error: any) {
          console.error('[PPIC] Error creating production for sufficient materials:', error);
        }
        
        showAlert(`SPK: ${item.spkNo}\n\n✅ Semua material sudah cukup stok!\n\n📋 Status Material:\n${statusText}\n\n✅ Production langsung set ke selesai (${item.qty || 0}/${item.qty || 0}). Work to do: Pengiriman.`, 'Information');
        closeDialog();
        // Clear loading state
        setCreatingPR(prev => {
          const newState = { ...prev };
          delete newState[spkNo];
          return newState;
        });
        loadData(); // Refresh data
      }
    } catch (error: any) {
      console.error('[PPIC] Error creating PR:', error);
      // Clear loading state on error
      setCreatingPR(prev => {
        const newState = { ...prev };
        delete newState[spkNo];
        return newState;
      });
      showAlert(`Error creating PR: ${error.message}`, 'Error');
      closeDialog();
    }
  };


  const handleScheduleSPK = (spk: any) => {
    // Find existing schedule untuk SPK ini (harus berdasarkan spkNo)
    const existingSchedule = scheduleData.find((s: any) => s.spkNo === spk.spkNo);
    
    // Pastikan schedule selalu punya spkNo
    setSelectedScheduleItem({
      spkNo: spk.spkNo, // Pastikan spkNo selalu ada
      soNo: spk.soNo,
      product: spk.product,
      qty: spk.qty,
      target: spk.qty || 0,
      progress: spk.progress || 0,
      remaining: (spk.qty || 0) - (spk.progress || 0),
      scheduleStartDate: existingSchedule?.scheduleStartDate,
      scheduleEndDate: existingSchedule?.scheduleEndDate,
      scheduleDate: existingSchedule?.scheduleDate,
      batches: existingSchedule?.batches || [],
    });
  };

  const handleDeliveryScheduleForSO = (soItem: any) => {
    // Ambil semua SPK dari SO ini
    const spks = soItem.spkList || [];
    
    // Ambil semua schedule untuk SPK-SPK ini
    const schedules = spks.map((spk: any) => {
      const schedule = scheduleData.find((s: any) => s.spkNo === spk.spkNo);
      return {
        spkNo: spk.spkNo,
        soNo: spk.soNo,
        product: spk.product,
        productId: spk.product_id || spk.kode,
        qty: spk.qty,
        productionBatches: schedule?.batches || [],
        deliveryBatches: schedule?.deliveryBatches || [],
      };
    });
    
    setSelectedDeliveryItem({
      soNo: soItem.soNo,
      customer: soItem.customer,
      spks: schedules,
    });
  };

  // Handler untuk General Schedule (gabungan Production + Delivery)
  const handleGeneralScheduleForSO = (soItem: any) => {
    // Ambil semua SPK dari SO ini
    const spks = soItem.spkList || [];
    
    // Ambil semua schedule untuk SPK-SPK ini
    const schedules = spks.map((spk: any) => {
      const schedule = scheduleData.find((s: any) => s.spkNo === spk.spkNo);
      
      // IMPORTANT: Product qty HARUS pakai qty asli dari SPK/SO, BUKAN dari material override
      // Material override hanya untuk material requirement, bukan untuk product qty
      // Progress display dan General Schedule harus ikutin qty asli dari SO data
      const finalQty = spk.qty || 0; // Pakai qty asli dari SPK (dari SO), bukan dari override calculation
      const finalTarget = spk.qty || 0; // Pakai qty asli dari SPK (dari SO), bukan dari override calculation
      
      return {
        spkNo: spk.spkNo,
        soNo: spk.soNo,
        product: spk.product,
        productId: spk.product_id || spk.kode,
        qty: finalQty,
        target: finalTarget,
        progress: spk.progress || 0,
        remaining: finalQty - (spk.progress || 0),
        scheduleStartDate: schedule?.scheduleStartDate,
        scheduleEndDate: schedule?.scheduleEndDate,
        scheduleDate: schedule?.scheduleDate,
        productionBatches: schedule?.batches || [],
        deliveryBatches: schedule?.deliveryBatches || [],
        // Jangan kirim overrideQty karena product qty tidak boleh terpengaruh material override
      };
    });
    
    setSelectedGeneralScheduleItem({
      soNo: soItem.soNo,
      customer: soItem.customer,
      spks: schedules,
    });
    setGeneralScheduleActiveTab('production'); // Default ke production schedule
  };

  // Function untuk membuat delivery notifications dari delivery schedule
  // IMPORTANT: Cek inventory stock dan group batch dengan sjGroupId sama jadi 1 notification
  const createDeliveryNotificationsFromSchedule = async (spkDeliveries: any[]) => {
    try {
      console.log('🔍 [Delivery Schedule] Creating notifications from delivery schedule...');
      
      // OPTIMIZATION: Load from localStorage directly (non-blocking)
      const inventory = loadFromLocalStorage('inventory');
      const deliveryNotifications = loadFromLocalStorage('deliveryNotifications');
      
      // Helper function untuk cek inventory stock
      const checkInventoryStock = (productId: string, requiredQty: number): { available: number; sufficient: boolean } => {
        const inventoryItem = inventory.find((inv: any) => {
          const invCode = (inv.codeItem || '').toString().trim().toLowerCase();
          const prodCode = (productId || '').toString().trim().toLowerCase();
          return invCode === prodCode;
        });
        
        if (!inventoryItem) {
          console.log(`⚠️ [Stock Check] Product ${productId} not found in inventory`);
          return { available: 0, sufficient: false };
        }
        
        // Available stock = nextStock (stockPremonth + receive - outgoing + return)
        const availableStock = inventoryItem.nextStock !== undefined 
          ? (inventoryItem.nextStock || 0)
          : (
              (inventoryItem.stockPremonth || 0) + 
              (inventoryItem.receive || 0) - 
              (inventoryItem.outgoing || 0) + 
              (inventoryItem.return || 0)
            );
        
        const sufficient = availableStock >= requiredQty;
        console.log(`🔍 [Stock Check] Product ${productId}: Required ${requiredQty}, Available ${availableStock}, Sufficient: ${sufficient}`);
        
        return { available: availableStock, sufficient };
      };
      
      // Helper function untuk extract SJ number dari sjGroupId
      const extractSjNumber = (sjGroupId: string | undefined): string => {
        if (!sjGroupId) return '';
        // Format: sj-group-1 -> SJ1, sj-group-2 -> SJ2, dst
        const match = sjGroupId.match(/sj-group-(\d+)/);
        if (match && match[1]) {
          return `SJ${match[1]}`;
        }
        // Fallback: jika format tidak sesuai, gunakan hash dari sjGroupId
        return `SJ${sjGroupId.split('-').pop() || '1'}`;
      };
      
      // Collect semua batch yang createSJ = true dari semua SPK
      // IMPORTANT: Setiap batch dengan sjGroupId berbeda akan punya SPK number berbeda dengan suffix -SJ{number}
      const allBatchesForSJ: Array<{
        batch: any;
        spkNo: string; // SPK number dengan suffix -SJ{number} jika ada sjGroupId
        originalSpkNo: string; // SPK number asli (tanpa suffix)
        soNo: string;
        customer: string;
        product: string;
        productId: string;
        qty: number;
        stockCheck: { available: number; sufficient: boolean };
      }> = [];
      
      for (const spkDelivery of spkDeliveries) {
        const spkItem = spkData.find((s: any) => s.spkNo === spkDelivery.spkNo);
        if (!spkItem) {
          console.log(`⚠️ [Delivery Schedule] SPK ${spkDelivery.spkNo} not found in spkData, skipping`);
          continue;
        }
        
        // Filter hanya batch yang createSJ = true
        const batchesForSJ = (spkDelivery.deliveryBatches || []).filter((b: any) => b.createSJ !== false);
        
        for (const batch of batchesForSJ) {
          const productId = (spkItem.product_id || spkItem.kode || '').toString().trim();
          const batchQty = batch.qty || 0;
          
          // Cek inventory stock untuk batch ini
          const stockCheck = checkInventoryStock(productId, batchQty);
          
          // IMPORTANT: Buat SPK number dengan suffix -SJ{number} berdasarkan sjGroupId
          // Format: SPK/{year}{month}{day}/{randomCode}-SJ{number}
          const originalSpkNo = spkDelivery.spkNo;
          const sjGroupId = batch.sjGroupId;
          let spkNoWithSuffix = originalSpkNo;
          
          if (sjGroupId) {
            const sjNumber = extractSjNumber(sjGroupId);
            // Tambahkan suffix -SJ{number} ke SPK number jika belum ada
            // Cek apakah SPK sudah punya suffix -SJ{number}
            if (!originalSpkNo.includes(`-${sjNumber}`) && !originalSpkNo.includes(`/${sjNumber}`)) {
              // Tambahkan suffix -SJ{number} di akhir SPK number
              spkNoWithSuffix = `${originalSpkNo}-${sjNumber}`;
              console.log(`🔍 [Delivery Schedule] SPK ${originalSpkNo} -> ${spkNoWithSuffix} (sjGroupId: ${sjGroupId})`);
            }
          }
          
          allBatchesForSJ.push({
            batch,
            spkNo: spkNoWithSuffix, // SPK dengan suffix -SJ{number}
            originalSpkNo: originalSpkNo, // SPK asli untuk reference
            soNo: spkItem.soNo,
            customer: spkItem.customer || '',
            product: spkItem.product || '',
            productId: productId,
            qty: batchQty,
            stockCheck,
          });
        }
      }
      
      // Group batches berdasarkan sjGroupId DAN SO No - batch dengan sjGroupId sama DAN SO sama akan digabung jadi 1 notification
      const groupedBySjGroup: { [key: string]: typeof allBatchesForSJ } = {};
      
      allBatchesForSJ.forEach(item => {
        // Key: SO No + sjGroupId (batch dengan sjGroupId sama tapi SO berbeda tidak bisa digabung)
        const sjGroupId = item.batch.sjGroupId || 'no-group';
        const groupKey = `${item.soNo}|||${sjGroupId}`;
        
        if (!groupedBySjGroup[groupKey]) {
          groupedBySjGroup[groupKey] = [];
        }
        groupedBySjGroup[groupKey].push(item);
      });
      
      // Create notifications per sjGroupId (1 notification per sjGroupId = 1 surat jalan)
      const newNotifications: any[] = [];
      const stockInsufficientBatches: Array<{ spkNo: string; product: string; required: number; available: number }> = [];
      
      for (const [sjGroupId, batches] of Object.entries(groupedBySjGroup)) {
        // Cek apakah semua batch dalam group ini stock-nya cukup
        const allStockSufficient = batches.every(item => item.stockCheck.sufficient);
        
        if (!allStockSufficient) {
          // Ada batch yang stock-nya tidak cukup - blocking
          batches.forEach(item => {
            if (!item.stockCheck.sufficient) {
              stockInsufficientBatches.push({
                spkNo: item.spkNo,
                product: item.product,
                required: item.qty,
                available: item.stockCheck.available,
              });
            }
          });
          console.log(`⚠️ [Delivery Schedule] Stock insufficient for sjGroupId ${sjGroupId}, skipping notification creation`);
          continue; // Skip create notification jika stock tidak cukup
        }
        
        // Semua batch stock-nya cukup - create notification
        // Ambil info dari batch pertama (karena semua batch dalam group punya SO yang sama)
        const firstBatch = batches[0];
        const soNo = firstBatch.soNo;
        const customer = firstBatch.customer;
        
        // Cek apakah notification sudah ada untuk sjGroupId ini
        const existingNotifIndex = deliveryNotifications.findIndex((n: any) => {
          const notifSjGroupId = n.sjGroupId || (n.deliveryBatches && n.deliveryBatches[0]?.sjGroupId) || null;
          const currentSjGroupId = sjGroupId !== 'no-group' ? sjGroupId : null;
          return notifSjGroupId === currentSjGroupId;
        });
        
        if (existingNotifIndex >= 0) {
          // Update existing notification
          const existingNotif = deliveryNotifications[existingNotifIndex];
          deliveryNotifications[existingNotifIndex] = {
            ...existingNotif,
            deliveryBatches: batches.map(item => item.batch),
            status: 'READY_TO_SHIP', // Stock tersedia, ready untuk dibuat delivery note
            updated: new Date().toISOString(),
          };
          console.log(`🔄 [Delivery Schedule] Updated notification for sjGroupId ${sjGroupId}`);
        } else {
          // Create new notification
          // IMPORTANT: 1 notification per sjGroupId = 1 surat jalan
          // Semua batch dengan sjGroupId sama akan digabung dalam 1 notification
          // IMPORTANT: SPK number sudah include suffix -SJ{number} untuk membedakan batch yang berbeda
          const notification = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            type: 'DELIVERY_SCHEDULE',
            soNo: soNo,
            customer: customer,
            spkNo: batches.length === 1 ? batches[0].spkNo : batches.map(item => item.spkNo).join(', '), // Single SPK atau multiple (dengan suffix -SJ{number})
            spkNos: batches.map(item => item.spkNo), // Array of SPK numbers (dengan suffix -SJ{number})
            originalSpkNos: batches.map(item => item.originalSpkNo), // Array of original SPK numbers (tanpa suffix) untuk reference
            sjGroupId: sjGroupId !== 'no-group' ? sjGroupId : undefined,
            product: batches.length === 1 ? batches[0].product : 'Multiple Products', // Single product atau multiple
            products: batches.map(item => ({
              spkNo: item.spkNo, // SPK dengan suffix -SJ{number}
              originalSpkNo: item.originalSpkNo, // SPK asli untuk reference
              product: item.product,
              productId: item.productId,
              qty: item.qty,
            })),
            productId: batches.length === 1 ? batches[0].productId : '', // Single product ID atau empty
            qty: batches.reduce((sum, item) => sum + item.qty, 0), // Total qty dari semua batch
            deliveryBatches: batches.map(item => item.batch), // Semua batch dalam group
            status: 'READY_TO_SHIP', // Stock tersedia, ready untuk dibuat delivery note
            created: new Date().toISOString(),
          };
          
          newNotifications.push(notification);
          console.log(`✅ [Delivery Schedule] Created notification for sjGroupId ${sjGroupId} with ${batches.length} batch(es), total qty: ${notification.qty}`);
        }
      }
      
      // Jika ada batch yang stock-nya tidak cukup, show alert
      if (stockInsufficientBatches.length > 0) {
        const insufficientList = stockInsufficientBatches.map(item => 
          `- ${item.product} (SPK: ${item.spkNo}): Required ${item.required}, Available ${item.available}`
        ).join('\n');
        
        showAlert(
          'Stock Tidak Tersedia',
          `Tidak dapat membuat delivery notification karena stock tidak cukup:\n\n${insufficientList}\n\nSilakan cek inventory terlebih dahulu.`,
        );
      }
      
      // Save notifications (non-blocking - langsung ke localStorage, sync ke server di background)
      const finalNotifications = [...deliveryNotifications];
      if (newNotifications.length > 0) {
        finalNotifications.push(...newNotifications);
        // Set langsung ke localStorage dulu, baru sync ke server di background
        await storageService.set('deliveryNotifications', finalNotifications);
        console.log(`✅ [Delivery Schedule] Created ${newNotifications.length} notification(s) from delivery schedule`);
      }
      
      return { created: newNotifications.length, insufficient: stockInsufficientBatches.length };
    } catch (error: any) {
      console.error('❌ [Delivery Schedule] Error creating notifications:', error);
      throw error;
    }
  };

  // Helper function untuk membuat notifications dari schedule data (DISABLED - tidak digunakan lagi)
  const createNotificationsFromSchedule = async (scheduleList: any[]) => {
    try {
      console.log('🔍 [Schedule] Creating notifications from schedule data...');
      // Load spkData dari storage untuk memastikan data terbaru
      const spkDataFromStorage = extractStorageValue(await storageService.get<any[]>('spk')) || [];
      const deliveryNotifications = await storageService.get<any[]>('deliveryNotifications') || [];
      const newNotifications: any[] = [];
      
      console.log(`🔍 [Schedule] Loaded ${spkDataFromStorage.length} SPKs from storage`);
      console.log(`🔍 [Schedule] Processing ${scheduleList.length} schedule items`);
      
      // Helper function untuk match SPK
      const matchSPK = (spk1: string, spk2: string): boolean => {
        if (!spk1 || !spk2) return false;
        if (spk1 === spk2) return true;
        const normalize = (spk: string) => spk.replace(/-/g, '/');
        const normalized1 = normalize(spk1);
        const normalized2 = normalize(spk2);
        if (normalized1 === normalized2) return true;
        const base1 = normalized1.split('/').slice(0, 2).join('/');
        const base2 = normalized2.split('/').slice(0, 2).join('/');
        return base1 === base2;
      };
      
      // Iterate semua schedule
      scheduleList.forEach((scheduleItem: any) => {
        const spkNo = scheduleItem.spkNo;
        if (!spkNo) {
          console.log(`  ⚠️ [Schedule] Schedule item without spkNo, skipping`);
          return;
        }
        
        const spkItem = spkDataFromStorage.find((s: any) => s.spkNo === spkNo);
        if (!spkItem) {
          console.log(`  ⚠️ [Schedule] SPK ${spkNo} not found in spkData (total SPKs: ${spkDataFromStorage.length}), skipping`);
          console.log(`  🔍 [Schedule] Available SPKs:`, spkDataFromStorage.slice(0, 5).map((s: any) => s.spkNo));
          return;
        }
        
        console.log(`  ✅ [Schedule] Found SPK ${spkNo} in spkData`);
        
        // Iterate setiap deliveryBatch untuk SPK ini
        const deliveryBatches = Array.isArray(scheduleItem.deliveryBatches) ? scheduleItem.deliveryBatches : [];
        console.log(`🔍 [Schedule] Processing SPK ${spkNo}, total batches: ${deliveryBatches.length}`);
        
        // Filter hanya batch yang createSJ !== false
        const batchesForSJ = deliveryBatches.filter((b: any) => b && b.createSJ !== false);
        console.log(`🔍 [Schedule] Batches with createSJ=true: ${batchesForSJ.length} out of ${deliveryBatches.length}`);
        
        batchesForSJ.forEach((batch: any, batchIndex: number) => {
          if (!batch) return;
          
          const sjGroupId = batch?.sjGroupId || 'no-group';
          console.log(`  🔍 [Schedule] Processing batch ${batchIndex} for SPK ${spkNo}, sjGroupId: ${sjGroupId}`);
          
          // Cek apakah notification sudah ada untuk SPK ini DENGAN sjGroupId yang sama
          const existingNotifIndex = deliveryNotifications.findIndex((n: any) => {
            const notifSpkNo = (n.spkNo || '').toString().trim();
            const spkMatches = (notifSpkNo && matchSPK(notifSpkNo, spkNo)) || 
                              (n.spkNos && Array.isArray(n.spkNos) && n.spkNos.some((spk: string) => {
                                const spkStr = (spk || '').toString().trim();
                                return spkStr && matchSPK(spkStr, spkNo);
                              }));
            
            if (!spkMatches) return false;
            
            const notifSjGroupId = n.sjGroupId || (n.deliveryBatches && n.deliveryBatches[0]?.sjGroupId) || null;
            const currentSjGroupId = sjGroupId !== 'no-group' ? sjGroupId : null;
            
            return notifSjGroupId === currentSjGroupId;
          });
          
          // Cek juga di newNotifications yang sudah dibuat dalam loop ini
          const existingInNew = newNotifications.findIndex((n: any) => {
            const notifSpkNo = (n.spkNo || '').toString().trim();
            const spkMatches = (notifSpkNo && matchSPK(notifSpkNo, spkNo)) || 
                              (n.spkNos && Array.isArray(n.spkNos) && n.spkNos.some((spk: string) => {
                                const spkStr = (spk || '').toString().trim();
                                return spkStr && matchSPK(spkStr, spkNo);
                              }));
            
            if (!spkMatches) return false;
            
            const notifSjGroupId = n.sjGroupId || (n.deliveryBatches && n.deliveryBatches[0]?.sjGroupId) || null;
            const currentSjGroupId = sjGroupId !== 'no-group' ? sjGroupId : null;
            
            return notifSjGroupId === currentSjGroupId;
          });
          
          if (existingNotifIndex >= 0) {
            // Update existing notification
            console.log(`  🔄 [Schedule] Updating existing notification for SPK ${spkNo}, sjGroupId: ${sjGroupId}`);
            deliveryNotifications[existingNotifIndex] = {
              ...deliveryNotifications[existingNotifIndex],
              qty: batch.qty || spkItem.qty || 0,
              deliveryBatches: [batch],
              updated: new Date().toISOString(),
            };
          } else if (existingInNew >= 0) {
            // Skip jika sudah dibuat dalam loop ini
            console.log(`  ⏭️ [Schedule] Skipping duplicate in newNotifications for SPK ${spkNo}, sjGroupId: ${sjGroupId}`);
          } else {
            // Create new notification
            newNotifications.push({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              type: 'DELIVERY_SCHEDULE',
              soNo: spkItem.soNo,
              customer: spkItem.customer || '',
              spkNo: spkNo,
              sjGroupId: sjGroupId !== 'no-group' ? sjGroupId : undefined,
              product: spkItem.product || '',
              productId: spkItem.productId || '',
              qty: batch.qty || spkItem.qty || 0,
              deliveryBatches: [batch],
              status: 'WAITING_PRODUCTION',
              created: new Date().toISOString(),
            });
            console.log(`  ✅ [Schedule] Created new notification for SPK ${spkNo}, sjGroupId: ${sjGroupId}`);
          }
        });
      });
      
      // Save notifications (termasuk yang di-update dan yang baru)
      // IMPORTANT: Pastikan semua notifications (yang di-update dan yang baru) tersimpan dengan benar
      const finalNotifications = [...deliveryNotifications]; // Sudah include yang di-update
      if (newNotifications.length > 0) {
        finalNotifications.push(...newNotifications);
      }
      
      // Selalu simpan untuk memastikan notifications yang di-update juga tersimpan
      await storageService.set('deliveryNotifications', finalNotifications);
      
      if (newNotifications.length > 0) {
        console.log(`✅ [Schedule] Created ${newNotifications.length} new notification(s) from schedule`);
        newNotifications.forEach((notif: any) => {
          console.log(`  📋 New notification: SPK ${notif.spkNo}, sjGroupId: ${notif.sjGroupId || 'null'}, qty: ${notif.qty}`);
        });
      } else {
        console.log(`ℹ️ [Schedule] No new notifications to create (all already exist)`);
      }
      
      // Verify notifications tersimpan
      const verifyNotifications = await storageService.get<any[]>('deliveryNotifications') || [];
      console.log(`✅ [Schedule] Verified: ${verifyNotifications.length} notification(s) in storage`);
      verifyNotifications.forEach((n: any) => {
        console.log(`  📋 Storage notification: SPK ${n.spkNo}, sjGroupId: ${n.sjGroupId || 'null'}, status: ${n.status}`);
      });
    } catch (error) {
      console.error('❌ [Schedule] Error creating notifications from schedule:', error);
    }
  };

  const handleSaveDeliverySchedule = async (data: any) => {
    try {
      console.log('🔍 [Schedule] handleSaveDeliverySchedule called with data:', JSON.stringify(data, null, 2));
      
      if (!data.spkDeliveries || data.spkDeliveries.length === 0) {
        showAlert('Error: Tidak ada delivery schedule untuk disimpan', 'Error');
        return;
      }
      
      // Log semua spkDeliveries dan deliveryBatches-nya
      console.log('🔍 [Schedule] Total spkDeliveries:', data.spkDeliveries.length);
      data.spkDeliveries.forEach((spkDelivery: any, idx: number) => {
        console.log(`  [${idx}] SPK: ${spkDelivery.spkNo}, deliveryBatches: ${spkDelivery.deliveryBatches?.length || 0}`);
        if (spkDelivery.deliveryBatches && Array.isArray(spkDelivery.deliveryBatches)) {
          spkDelivery.deliveryBatches.forEach((batch: any, batchIdx: number) => {
            console.log(`    Batch ${batchIdx}: batchNo=${batch.batchNo}, qty=${batch.qty}, sjGroupId=${batch.sjGroupId || 'null'}, createSJ=${batch.createSJ}`);
          });
        }
      });
      
      // Update schedule untuk setiap SPK
      const updated = [...scheduleData];
      
      for (const spkDelivery of data.spkDeliveries) {
        const spkNo = spkDelivery.spkNo;
        let existingSchedule = updated.find((s: any) => s.spkNo === spkNo);
        
        if (!existingSchedule) {
          // Create new schedule jika belum ada
          const spkItem = spkData.find((s: any) => s.spkNo === spkNo);
          existingSchedule = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            spkNo: spkNo,
            soNo: spkItem?.soNo || selectedDeliveryItem?.soNo || '',
            scheduleStartDate: new Date().toISOString(),
            scheduleEndDate: new Date().toISOString(),
            batches: [],
            deliveryBatches: [],
            progress: 0,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
          };
          updated.push(existingSchedule);
        }
        
        // Update delivery batches untuk SPK ini
        const scheduleIndex = updated.findIndex((s: any) => s.spkNo === spkNo);
        updated[scheduleIndex] = {
          ...updated[scheduleIndex],
          deliveryBatches: spkDelivery.deliveryBatches || [],
          updated: new Date().toISOString(),
        };
      }
      
      // OPTIMIZATION: Set langsung ke localStorage (non-blocking), sync ke server di background
      await storageService.set('schedule', updated);
      setScheduleData(updated);

      // IMPORTANT: Buat notifications dari delivery schedule yang sudah di-save
      // Cek inventory stock dan group batch dengan sjGroupId sama jadi 1 notification
      const result = await createDeliveryNotificationsFromSchedule(data.spkDeliveries);
      
      // Show success message
      const isFromGeneralSchedule = selectedGeneralScheduleItem !== null;
      let successMessage = `Delivery schedule berhasil disimpan untuk ${data.spkDeliveries.length} SPK`;
      
      if (result.created > 0) {
        successMessage += `\n\n✅ ${result.created} notification(s) dibuat - Ready to Ship`;
      }
      
      if (result.insufficient > 0) {
        successMessage += `\n\n⚠️ ${result.insufficient} batch(s) tidak dibuat karena stock tidak cukup`;
      }
      
      if (!isFromGeneralSchedule) {
        showAlert(successMessage, 'Success');
        setSelectedDeliveryItem(null);
      } else {
        showAlert(successMessage, 'Success');
      }
      
      // NOTE: Tidak perlu loadData() karena state sudah di-update langsung
      // loadData() akan dipanggil otomatis oleh event listener jika ada perubahan storage
    } catch (error: any) {
      showAlert(`Error saving delivery schedule: ${error.message}`, 'Error');
    }
  };

  const handleUpdateStatus = async (item: any) => {
    console.log('🔍 [PPIC] handleUpdateStatus called with item:', item);
    // Cek status semua checklist
    const spkNoNormalized = (item.spkNo || '').toString().trim();
    const isStockFulfilled = item.stockFulfilled || false;
    
    // Cek PR (skip jika stockFulfilled)
    const relatedPR = purchaseRequests.find((pr: any) => {
      const prSpkNo = (pr.spkNo || '').toString().trim();
      if (!prSpkNo || prSpkNo === '') return false;
      if (prSpkNo !== spkNoNormalized) return false;
      const prProduct = (pr.product || '').toString().trim();
      const spkProduct = (item.product || '').toString().trim();
      if (prProduct && spkProduct && prProduct !== spkProduct) return false;
      return true;
    });
    const hasPR = !!relatedPR;
    const prStatus = relatedPR ? relatedPR.status : null;
    
    // Cek BOM - improved matching untuk handle berbagai format product ID
    const productId = (item.product_id || item.productId || item.kode || item.productKode || '').toString().trim();
    const productBOM = bomData.filter((b: any) => {
      const bomProductId = (b.product_id || b.kode || '').toString().trim();
      // Match jika productId sama (case-insensitive, trim whitespace)
      if (!productId || !bomProductId) return false;
      return bomProductId.toLowerCase() === productId.toLowerCase();
    });
    const hasBOM = productBOM.length > 0;
    
    // Debug logging untuk troubleshooting
    if (!hasBOM && productId) {
      console.log(`[PPIC Checklist] BOM not found for productId: "${productId}"`, {
        itemProductId: item.product_id,
        itemProductIdAlt: item.productId,
        itemKode: item.kode,
        itemProductKode: item.productKode,
        bomDataCount: bomData.length,
        bomProductIds: bomData.slice(0, 5).map((b: any) => ({
          product_id: b.product_id,
          kode: b.kode,
        })),
      });
    }
    
    // Cek Schedule
    const schedule = scheduleData.find((s: any) => {
      if (!s.spkNo) return false;
      const sSpkNo = (s.spkNo || '').toString().trim();
      return sSpkNo === spkNoNormalized;
    });
    const hasSchedule = schedule && schedule.scheduleStartDate;
    
    // Helper function untuk match SPK (handle batch format)
    const matchSPK = (spk1: string, spk2: string): boolean => {
      if (!spk1 || !spk2) return false;
      if (spk1 === spk2) return true;
      const normalize = (spk: string) => spk.replace(/-/g, '/');
      const normalized1 = normalize(spk1);
      const normalized2 = normalize(spk2);
      if (normalized1 === normalized2) return true;
      const base1 = normalized1.split('/').slice(0, 2).join('/');
      const base2 = normalized2.split('/').slice(0, 2).join('/');
      return base1 === base2;
    };
    
    // Cek Delivery Notification (gunakan matchSPK untuk handle format berbeda)
    const deliveryNotifications = await storageService.get<any[]>('deliveryNotifications') || [];
    const hasDeliveryNotif = deliveryNotifications.some((n: any) => {
      const notifSpkNo = (n.spkNo || '').toString().trim();
      if (notifSpkNo && matchSPK(notifSpkNo, spkNoNormalized)) return true;
      if (n.spkNos && Array.isArray(n.spkNos)) {
        return n.spkNos.some((spk: string) => {
          const spkStr = (spk || '').toString().trim();
          return spkStr && matchSPK(spkStr, spkNoNormalized);
        });
      }
      return false;
    });
    
    console.log(`🔍 [PPIC Status Dialog] SPK ${spkNoNormalized} - hasDeliveryNotif: ${hasDeliveryNotif}, Total notifications: ${deliveryNotifications.length}`);
    
    // Prepare checklist
    const checklist = {
      isStockFulfilled,
      hasPR: isStockFulfilled ? true : hasPR, // Skip PR jika stockFulfilled
      prStatus: isStockFulfilled ? 'SKIPPED' : prStatus,
      prNo: relatedPR ? (relatedPR.prNo || relatedPR.id) : null,
      hasBOM,
      hasSchedule,
      scheduleStartDate: schedule?.scheduleStartDate,
      scheduleEndDate: schedule?.scheduleEndDate,
      hasDeliveryNotif,
    };
    
    setWhatToDoNextDialog({
      show: true,
      spk: item,
      checklist,
    });
  };

  const handleTriggerDeliveryNotification = async (spk: any) => {
    try {
      const spkNo = (spk.spkNo || '').toString().trim();
      if (!spkNo) {
        showAlert('SPK No tidak valid', 'Error');
        return;
      }

      // Helper function untuk match SPK (handle batch format)
      const matchSPK = (spk1: string, spk2: string): boolean => {
        if (!spk1 || !spk2) return false;
        if (spk1 === spk2) return true;
        // Support both formats: old format (strip) and new format (slash)
        const normalize = (spk: string) => {
          // Convert to slash format for comparison
          return spk.replace(/-/g, '/');
        };
        const normalized1 = normalize(spk1);
        const normalized2 = normalize(spk2);
        if (normalized1 === normalized2) return true;
        // Match base SPK (first 2 parts: SPK/251212)
        const base1 = normalized1.split('/').slice(0, 2).join('/');
        const base2 = normalized2.split('/').slice(0, 2).join('/');
        return base1 === base2;
      };

      // Cek apakah notification sudah ada (gunakan matchSPK untuk handle format berbeda)
      const deliveryNotifications = await storageService.get<any[]>('deliveryNotifications') || [];
      const existingNotif = deliveryNotifications.find((n: any) => {
        const notifSpkNo = (n.spkNo || '').toString().trim();
        if (notifSpkNo && matchSPK(notifSpkNo, spkNo)) return true;
        if (n.spkNos && Array.isArray(n.spkNos)) {
          return n.spkNos.some((spk: string) => {
            const spkStr = (spk || '').toString().trim();
            return spkStr && matchSPK(spkStr, spkNo);
          });
        }
        return false;
      });

      if (existingNotif) {
        showAlert('Delivery notification sudah ada untuk SPK ini', 'Information');
        // Update dialog untuk refresh status
        setWhatToDoNextDialog(prev => ({
          ...prev,
          checklist: {
            ...prev.checklist,
            hasDeliveryNotif: true,
          },
        }));
        return;
      }

      // Cari schedule untuk ambil deliveryBatches jika ada
      const schedule = scheduleData.find((s: any) => {
        if (!s.spkNo) return false;
        const sSpkNo = (s.spkNo || '').toString().trim();
        return sSpkNo === spkNo;
      });

      // Buat delivery batch dari schedule atau dari SPK qty
      let deliveryBatch: any = null;
      if (schedule && schedule.deliveryBatches && schedule.deliveryBatches.length > 0) {
        deliveryBatch = schedule.deliveryBatches[0];
      } else {
        // Buat batch default jika tidak ada schedule
        deliveryBatch = {
          batchNo: 'A',
          qty: spk.qty || spk.target || 0,
          deliveryDate: new Date().toISOString(),
          sjGroupId: `sj-group-${Date.now()}`,
        };
      }

      // Create delivery notification untuk stockFulfilled SPK
      const newNotification = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type: 'DELIVERY_SCHEDULE',
        soNo: spk.soNo || '',
        customer: spk.customer || '',
        spkNo: spkNo,
        sjGroupId: deliveryBatch.sjGroupId,
        product: spk.product || '',
        productId: spk.product_id || spk.kode || '',
        qty: deliveryBatch.qty || spk.qty || spk.target || 0,
        deliveryBatches: [deliveryBatch],
        status: 'READY_TO_SHIP', // Langsung ready karena stock sudah ada (skip production & QC)
        created: new Date().toISOString(),
        stockFulfilled: true, // Flag untuk stock fulfilled
      };

      console.log('🚀 [PPIC] Creating delivery notification for stockFulfilled SPK:', {
        spkNo,
        status: newNotification.status,
        stockFulfilled: newNotification.stockFulfilled,
        product: newNotification.product,
        qty: newNotification.qty,
      });

      // Pastikan tidak ada duplikasi sebelum push
      const isDuplicate = deliveryNotifications.some((n: any) => {
        const notifSpkNo = (n.spkNo || '').toString().trim();
        if (notifSpkNo && matchSPK(notifSpkNo, spkNo)) return true;
        if (n.spkNos && Array.isArray(n.spkNos)) {
          return n.spkNos.some((spk: string) => {
            const spkStr = (spk || '').toString().trim();
            return spkStr && matchSPK(spkStr, spkNo);
          });
        }
        return false;
      });
      
      if (isDuplicate) {
        console.log(`⚠️ [PPIC] Duplicate notification found for SPK ${spkNo}, skipping create`);
        showAlert('Delivery notification sudah ada untuk SPK ini', 'Information');
        // Update dialog untuk refresh status
        const updatedNotifications = await storageService.get<any[]>('deliveryNotifications') || [];
        const hasDeliveryNotifNow = updatedNotifications.some((n: any) => {
          const notifSpkNo = (n.spkNo || '').toString().trim();
          if (notifSpkNo && matchSPK(notifSpkNo, spkNo)) return true;
          if (n.spkNos && Array.isArray(n.spkNos)) {
            return n.spkNos.some((spk: string) => {
              const spkStr = (spk || '').toString().trim();
              return spkStr && matchSPK(spkStr, spkNo);
            });
          }
          return false;
        });
        setWhatToDoNextDialog(prev => ({
          ...prev,
          checklist: {
            ...prev.checklist,
            hasDeliveryNotif: hasDeliveryNotifNow,
          },
        }));
        return;
      }
      
      // DISABLED: Save delivery notification
      // deliveryNotifications.push(newNotification);
      // await storageService.set('deliveryNotifications', deliveryNotifications);
      
      // // Verify notification tersimpan
      // const verifyNotifications = await storageService.get<any[]>('deliveryNotifications') || [];
      // const savedNotification = verifyNotifications.find((n: any) => n.id === newNotification.id);
      // if (!savedNotification) {
      //   console.error(`❌ [PPIC] Notification not saved! ID: ${newNotification.id}`);
      //   showAlert('Error: Notification tidak tersimpan. Silakan coba lagi.', 'Error');
      //   return;
      // }
      // console.log(`✅ [PPIC] Notification verified in storage: ID ${savedNotification.id}, SPK ${savedNotification.spkNo}`);
      
      // console.log('✅ [PPIC] Notification saved. Total notifications:', deliveryNotifications.length);
      // console.log('✅ [PPIC] Saved notification:', {
      //   id: newNotification.id,
      //   spkNo: newNotification.spkNo,
      //   status: newNotification.status,
      //   stockFulfilled: newNotification.stockFulfilled,
      // });

      // showAlert(`✅ Delivery notification berhasil dibuat untuk SPK ${spkNo}\n\n📧 Data sudah dikirim ke Delivery Note`, 'Success');
      console.log('ℹ️ [PPIC] Delivery notification trigger (handleTriggerDeliveryNotification) is DISABLED');
      showAlert('ℹ️ Delivery notification trigger is currently DISABLED', 'Information');
      
      // Reload deliveryNotifications untuk pastikan data terbaru
      const updatedNotifications = await storageService.get<any[]>('deliveryNotifications') || [];
      console.log('✅ [PPIC] Reloaded notifications after save:', updatedNotifications.length);
      
      // Update dialog dengan data terbaru
      const hasDeliveryNotifNow = updatedNotifications.some((n: any) => {
        const notifSpkNo = (n.spkNo || '').toString().trim();
        if (notifSpkNo && matchSPK(notifSpkNo, spkNo)) return true;
        if (n.spkNos && Array.isArray(n.spkNos)) {
          return n.spkNos.some((spk: string) => {
            const spkStr = (spk || '').toString().trim();
            return spkStr && matchSPK(spkStr, spkNo);
          });
        }
        return false;
      });
      
      console.log(`✅ [PPIC] After reload, hasDeliveryNotif: ${hasDeliveryNotifNow} for SPK ${spkNo}`);
      
      setWhatToDoNextDialog(prev => ({
        ...prev,
        checklist: {
          ...prev.checklist,
          hasDeliveryNotif: hasDeliveryNotifNow,
        },
      }));
      
      // Reload data
      loadData();
    } catch (error: any) {
      showAlert(`Error creating delivery notification: ${error.message}`, 'Error');
    }
  };

  const handleDeleteSPK = async (spk: any) => {
    if (!spk || !spk.spkNo) {
      showAlert('SPK tidak valid. Mohon coba lagi.', 'Error');
      return;
    }

    const spkNo = (spk.spkNo || '').toString().trim();
    const soNo = (spk.soNo || '').toString().trim();

    try {
      const [
        purchaseRequestsData,
        purchaseOrdersData,
        productionList,
        qcList,
        deliveryList,
      ] = await Promise.all([
        storageService.get<any[]>('purchaseRequests'),
        storageService.get<any[]>('purchaseOrders'),
        storageService.get<any[]>('production'),
        storageService.get<any[]>('qc'),
        storageService.get<any[]>('delivery'),
      ]);

      const prData = extractStorageValue(purchaseRequestsData);
      const poData = extractStorageValue(purchaseOrdersData);
      const productionDataSafe = extractStorageValue(productionList);
      const qcDataSafe = extractStorageValue(qcList);
      const deliveryDataSafe = extractStorageValue(deliveryList);

      const blockingReasons: string[] = [];

      const relatedPRs = prData.filter((pr: any) => (pr.spkNo || '').toString().trim() === spkNo);
      if (relatedPRs.length > 0) {
        blockingReasons.push(`PR (${relatedPRs.map(pr => pr.prNo || pr.id).join(', ')})`);
      }

      const relatedPOs = poData.filter((po: any) => (po.spkNo || '').toString().trim() === spkNo);
      if (relatedPOs.length > 0) {
        blockingReasons.push(`PO (${relatedPOs.map(po => po.poNo || po.id).join(', ')})`);
      }

      const relatedProductions = productionDataSafe.filter((prod: any) => {
        const prodSpk = (prod.spkNo || '').toString().trim();
        const prodSo = (prod.soNo || '').toString().trim();
        return prodSpk === spkNo || (soNo && prodSo === soNo);
      });
      if (relatedProductions.length > 0) {
        blockingReasons.push('Production data');
      }

      const relatedQC = qcDataSafe.filter((qc: any) => (qc.spkNo || '').toString().trim() === spkNo);
      if (relatedQC.length > 0) {
        blockingReasons.push('QC data');
      }

      const relatedDelivery = deliveryDataSafe.filter((dn: any) => {
        if ((dn.spkNo || '').toString().trim() === spkNo) return true;
        return (dn.items || []).some((itm: any) => (itm.spkNo || '').toString().trim() === spkNo);
      });
      if (relatedDelivery.length > 0) {
        blockingReasons.push('Delivery Note data');
      }

      if (blockingReasons.length > 0) {
        showAlert(
          `Tidak bisa menghapus SPK ${spkNo} karena masih memiliki data turunan:\n\n${blockingReasons
            .map(reason => `• ${reason}`)
            .join('\n')}\n\nSilakan bersihkan data turunan tersebut terlebih dahulu.`,
          'Cannot Delete SPK'
        );
        return;
      }

      showConfirm(
        `Hapus SPK ${spkNo}?\n\nTindakan ini akan:\n• Menghapus SPK dari daftar\n• Menghapus schedule & notifikasi terkait\n• Melepas alokasi stok material (jika ada)\n\nPastikan tidak ada proses lanjutan untuk SPK ini.`,
        async () => {
          try {
            const [scheduleList, inventoryData, productionNotifications, deliveryNotifications] =
              await Promise.all([
                storageService.get<any[]>('schedule'),
                storageService.get<any[]>('inventory'),
                storageService.get<any[]>('productionNotifications'),
                storageService.get<any[]>('deliveryNotifications'),
              ]);

            const scheduleListSafe = extractStorageValue(scheduleList);
            const inventorySafe = extractStorageValue(inventoryData);
            const productionNotifSafe = extractStorageValue(productionNotifications);
            const deliveryNotifSafe = extractStorageValue(deliveryNotifications);

            // Release inventory allocation based on BOM
            const productId = (spk.product_id || spk.kode || spk.productId || '').toString().trim();
            const productBOM = bomData.filter((bom: any) => {
              const bomProductId = (bom.product_id || bom.kode || '').toString().trim();
              return bomProductId && productId && bomProductId === productId;
            });

            if (productBOM.length > 0 && inventorySafe.length > 0) {
              let inventoryChanged = false;
              for (const bom of productBOM) {
                const materialId = (bom.materialId || bom.material_id || bom.kode_material || '').toString().trim();
                if (!materialId) continue;

                const inventoryItem = inventorySafe.find((inv: any) => (inv.codeItem || '').toString().trim() === materialId);
                if (!inventoryItem || !Array.isArray(inventoryItem.allocatedSPKs)) continue;
                if (!inventoryItem.allocatedSPKs.includes(spkNo)) continue;

                const ratio = parseFloat(bom.ratio || bom.qty || '1') || 1;
                const requiredQty = Math.ceil((spk.qty || 0) * ratio);
                const oldOutgoing = inventoryItem.outgoing || 0;
                const newOutgoing = Math.max(0, oldOutgoing - requiredQty);

                inventoryItem.outgoing = newOutgoing;
                inventoryItem.allocatedSPKs = inventoryItem.allocatedSPKs.filter((id: string) => id !== spkNo);
                inventoryItem.nextStock =
                  (inventoryItem.stockPremonth || 0) +
                  (inventoryItem.receive || 0) -
                  newOutgoing +
                  (inventoryItem.return || 0);
                inventoryItem.lastUpdate = new Date().toISOString();
                inventoryChanged = true;
              }

              if (inventoryChanged) {
                await storageService.set('inventory', inventorySafe);
              }
            }

            // 🚀 FIX: Pakai packaging delete helper untuk konsistensi dan sync yang benar
            // Remove SPK record using tombstone pattern (soft delete)
            const deleteResult = await deletePackagingItem('spk', spk.id, 'id');
            if (!deleteResult.success) {
              showAlert(`Gagal menghapus SPK: ${deleteResult.error || 'Unknown error'}`, 'Error');
              return;
            }
            
            // Reload SPK data dengan helper (handle race condition)
            await reloadPackagingData('spk', setSpkData);
            setPendingSPKs(prev => prev.filter((pending: any) => pending.spkNo !== spkNo));

            // Remove schedule using tombstone pattern (soft delete)
            const scheduleToDelete = scheduleListSafe.find((schedule: any) => schedule.spkNo === spkNo);
            if (scheduleToDelete) {
              await deletePackagingItem('schedule', scheduleToDelete.id, 'id');
              // Reload schedule data dengan helper
              await reloadPackagingData('schedule', setScheduleData);
            }

            // 🚀 FIX: Batch delete notifications (parallel, lebih cepat)
            const productionNotifToDelete = productionNotifSafe.filter((notif: any) => notif.spkNo === spkNo);
            const deliveryNotifToDelete = deliveryNotifSafe.filter((notif: any) => notif.spkNo === spkNo);
            
            const productionNotifIds = productionNotifToDelete.map((notif: any) => notif.id);
            const deliveryNotifIds = deliveryNotifToDelete.map((notif: any) => notif.id);
            
            // Delete semua notifications secara parallel
            await Promise.all([
              productionNotifIds.length > 0 ? deletePackagingItems('productionNotifications', productionNotifIds, 'id') : Promise.resolve({ success: 0, failed: 0, errors: [] }),
              deliveryNotifIds.length > 0 ? deletePackagingItems('deliveryNotifications', deliveryNotifIds, 'id') : Promise.resolve({ success: 0, failed: 0, errors: [] })
            ]);

            closeDialog();
            showAlert(`SPK ${spkNo} berhasil dihapus dan stok yang dialokasikan sudah dilepas.`, 'Success');
            loadData();
          } catch (error: any) {
            showAlert(`Error deleting SPK: ${error.message}`, 'Error');
          }
        },
        () => closeDialog(),
        'Delete SPK'
      );
    } catch (error: any) {
      showAlert(`Error checking SPK dependencies: ${error.message}`, 'Error');
    }
  };

  // PTP Actions
  const handleViewPTP = (item: any) => {
    setViewingPTP(item);
  };

  const handleCreateSPKFromPTP = async (item: any) => {
    showConfirm(
      `Create SPK from PTP Request: ${item.requestNo}?\n\nNote: SPK akan dibuat tanpa SO (skip SO).`,
      async () => {
        await handleCreateSPKFromPTPContinue(item);
      },
      () => closeDialog(),
      'Create SPK from PTP'
    );
    return;
  };

  const handleCreateSPKFromPTPContinue = async (item: any) => {
    try {
      // Validasi data PTP
      if (!item || !item.requestNo) {
        showAlert('Error: PTP data tidak valid', 'Error');
        closeDialog();
        return;
      }

      // Support both old format (single productItem) and new format (items array)
      const items = item.items && Array.isArray(item.items) && item.items.length > 0
        ? item.items
        : item.productItem
          ? [{
              productItem: item.productItem,
              qty: item.qty || 0,
              unit: item.unit || 'PCS',
              price: item.price || 0,
              total: item.total || 0,
            }]
          : [];

      if (items.length === 0) {
        showAlert('Error: PTP tidak memiliki product items', 'Error');
        closeDialog();
        return;
      }

      // Validate all items
      for (const ptpItem of items) {
        if (!ptpItem.productItem) {
          showAlert('Error: Product/Item tidak ditemukan di PTP', 'Error');
          closeDialog();
          return;
        }

        if (!ptpItem.qty || ptpItem.qty <= 0) {
          showAlert('Error: Quantity harus lebih dari 0 untuk semua items', 'Error');
          closeDialog();
          return;
        }
      }

      // Create SPK from PTP (skip SO - langsung buat SPK)
      // Create one SPK per item in PTP
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);
      const existingSpk = extractStorageValue(await storageService.get<any[]>('spk'));
      
      // Generate random alphanumeric code (5 chars)
      const generateRandomCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 5; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };
      
      const newSPKs: any[] = [];
      let materialReservationMessage = '';
      
      // Create SPK for each item
      for (const ptpItem of items) {
        // Find product by name or code (case-insensitive)
        const productItemLower = (ptpItem.productItem || '').toLowerCase().trim();
        const product = products.find(p => {
          const productName = (p.nama || '').toLowerCase().trim();
          const productCode = (p.kode || '').toLowerCase().trim();
          const productId = (p.product_id || '').toLowerCase().trim();
          return productName === productItemLower || 
                 productCode === productItemLower || 
                 productId === productItemLower ||
                 productName.includes(productItemLower) ||
                 productCode.includes(productItemLower);
        });

        if (!product) {
          showAlert(`Error: Product "${ptpItem.productItem}" tidak ditemukan di Master Products.\n\nPastikan product sudah ada di Master Products sebelum membuat SPK.`, 'Error');
          closeDialog();
          return;
        }

        // Ensure unique SPK number
        let spkNo = '';
        let isUnique = false;
        while (!isUnique) {
          const randomCode = generateRandomCode();
          spkNo = `SPK/${year}${month}${day}/${randomCode}`;
          isUnique = !existingSpk.some(s => s.spkNo === spkNo) && !newSPKs.some(s => s.spkNo === spkNo);
        }
        
        const newSPK = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9) + newSPKs.length,
          spkNo: spkNo,
          soNo: item.soNo || item.requestNo, // Use linked SO or requestNo as fallback
          customer: item.customer || '',
          product: ptpItem.productItem,
          product_id: product.product_id || product.kode || '',
          kode: product.kode || product.product_id || '',
          qty: parseFloat(ptpItem.qty) || 0,
          status: 'OPEN',
          created: new Date().toISOString(),
          ptpRequestNo: item.requestNo, // Link dengan PTP
        };

        newSPKs.push(newSPK);
      }

      const currentSPK = extractStorageValue(await storageService.get<any[]>('spk'));
      await storageService.set('spk', [...currentSPK, ...newSPKs]);
      setSpkData([...currentSPK, ...newSPKs]);
      
      // ENHANCED: Reserve materials for all new SPKs
      const bomList = await storageService.get<any[]>('bom') || [];
      const materialsList = await storageService.get<any[]>('materials') || [];
      
      const normalizeKey = (value: any) => (value ?? '').toString().trim().toLowerCase();
      const toNumber = (value: any) => {
        if (typeof value === 'number' && !Number.isNaN(value)) return value;
        const parsed = parseFloat(value);
        return Number.isNaN(parsed) ? 0 : parsed;
      };
      
      // Build product BOM map
      const productBomMap: Record<string, any[]> = {};
      bomList.forEach((bom: any) => {
        const key = normalizeKey(bom.product_id || bom.kode);
        if (!key) return;
        if (!productBomMap[key]) {
          productBomMap[key] = [];
        }
        productBomMap[key].push(bom);
      });
      
      // Reserve materials for each SPK
      for (const newSPK of newSPKs) {
        const productKey = normalizeKey(newSPK.product_id || newSPK.kode);
        const spkQty = toNumber(newSPK.qty);
        
        if (productKey && spkQty > 0) {
          const bomForProduct = productBomMap[productKey] || [];
          if (bomForProduct.length > 0) {
            // Calculate material requirements
            const materialRequirements: any[] = [];
            bomForProduct.forEach((bom: any) => {
              const materialKey = normalizeKey(bom.material_id || bom.kode || bom.materialId);
              if (!materialKey) return;
              
              const ratio = toNumber(bom.ratio || 1) || 1;
              const requiredQty = Math.max(Math.ceil(spkQty * ratio), 0);
              if (requiredQty === 0) return;
              
              // Find material name
              const material = materialsList.find((m: any) => 
                normalizeKey(m.material_id || m.kode) === materialKey
              );
              
              materialRequirements.push({
                id: materialKey,
                nama: material?.name || material?.material_name || bom.material_name || materialKey,
                qty: requiredQty,
                unit: material?.unit || bom.unit || 'PCS',
              });
            });
            
            if (materialRequirements.length > 0) {
              try {
                const reservation = await materialAllocator.reserveMaterials(newSPK.spkNo, materialRequirements);
                
                if (reservation.success) {
                  console.log(`✅ [PPIC] Materials reserved for SPK ${newSPK.spkNo}: ${materialRequirements.length} materials`);
                  if (!materialReservationMessage) {
                    materialReservationMessage = `\n📦 Materials reserved for ${newSPKs.length} SPK(s)`;
                  }
                } else {
                  console.warn(`⚠️ [PPIC] Material shortage for SPK ${newSPK.spkNo}:`, reservation.shortages);
                  const shortageList = reservation.shortages.map((s: any) => s.materialName).join(', ');
                  if (!materialReservationMessage) {
                    materialReservationMessage = `\n⚠️ Material shortage: ${shortageList}`;
                  }
                }
              } catch (error) {
                console.error(`❌ [PPIC] Error reserving materials for SPK ${newSPK.spkNo}:`, error);
                if (!materialReservationMessage) {
                  materialReservationMessage = `\n❌ Error reserving materials`;
                }
              }
            }
          }
        }
      }
      
      // Update PTP status to OPEN
      const updatedPTP = ptpData.map(p => 
        p.id === item.id ? { ...p, status: 'OPEN' } : p
      );
      await storageService.set('ptp', updatedPTP);
      setPtpData(updatedPTP);
      
      const spkNos = newSPKs.map((s: any) => s.spkNo).join(', ');
      const itemsSummary = items.map((i: any) => `${i.productItem} (${i.qty} ${i.unit || 'PCS'})`).join('\n');
      showAlert(`✅ ${newSPKs.length} SPK berhasil dibuat!\n\nSPK No: ${spkNos}\n\nItems:\n${itemsSummary}${materialReservationMessage}\n\nPTP status updated to OPEN.`, 'Success');
      closeDialog();
      loadData();
    } catch (error: any) {
      console.error('Error creating SPK from PTP:', error);
      showAlert(`❌ Error creating SPK: ${error.message || 'Unknown error'}\n\nSilakan coba lagi atau hubungi administrator.`, 'Error');
      closeDialog();
    }
  };

  const handleMatchSO = (item: any) => {
    setMatchingPTP(item);
  };

  const handleCreateSOFromPTP = async (soNo: string, paymentTerms: string, topDays: number) => {
    if (!matchingPTP) return;
    
    try {
      // Find product
      const product = products.find(p => 
        (p.nama || '').toLowerCase().includes((matchingPTP.productItem || '').toLowerCase()) ||
        (p.kode || '').toLowerCase() === (matchingPTP.productItem || '').toLowerCase()
      );

      if (!product) {
        showAlert('Product tidak ditemukan. Pastikan product sudah ada di Master Products.', 'Error');
        return;
      }

      // Create SO from PTP
      const newSO = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        soNo: soNo,
        customer: matchingPTP.customer,
        customerKode: customers.find(c => c.nama === matchingPTP.customer)?.kode || '',
        paymentTerms: paymentTerms,
        topDays: topDays || undefined,
        status: 'OPEN',
        created: new Date().toISOString(),
        items: [{
          id: Date.now().toString(),
          productId: product.product_id || product.kode,
          productKode: product.kode,
          productName: matchingPTP.productItem,
          qty: matchingPTP.qty,
          unit: matchingPTP.unit,
          price: product.hargaSales || product.hargaFg || 0,
          total: (product.hargaSales || product.hargaFg || 0) * matchingPTP.qty,
        }],
        category: 'packaging',
      };

      const currentSO = extractStorageValue(await storageService.get<any[]>('salesOrders'));
      await storageService.set('salesOrders', [...currentSO, newSO]);
      setSalesOrders([...currentSO, newSO]);

      // Link PTP dengan SO
      const updatedPTP = ptpData.map(p => 
        p.id === matchingPTP.id 
          ? { ...p, soNo: soNo, status: 'OPEN', linkedSO: soNo } 
          : p
      );
      await storageService.set('ptp', updatedPTP);
      setPtpData(updatedPTP);

      // Update SPK yang sudah dibuat dari PTP ini untuk update soNo-nya
      const currentSPK = extractStorageValue(await storageService.get<any[]>('spk'));
      const spkToUpdate = currentSPK.filter((s: any) => s.ptpRequestNo === matchingPTP.requestNo);
      const updatedSPK = currentSPK.map((s: any) => {
        if (s.ptpRequestNo === matchingPTP.requestNo) {
          return {
            ...s,
            soNo: soNo, // Update soNo dari requestNo ke soNo yang baru
          };
        }
        return s;
      });
      
      if (spkToUpdate.length > 0) {
        await storageService.set('spk', updatedSPK);
        setSpkData(updatedSPK);
        
        // Update schedule soNo untuk SPK terkait
        const currentSchedules = extractStorageValue(await storageService.get<any[]>('schedule'));
        const updatedSchedules = currentSchedules.map((sch: any) => {
          if (spkToUpdate.some((s: any) => s.spkNo === sch.spkNo)) {
            return {
              ...sch,
              soNo: soNo, // Update soNo di schedule juga
            };
          }
          return sch;
        });
        if (updatedSchedules.some((sch: any, idx: number) => sch.soNo !== currentSchedules[idx]?.soNo)) {
          await storageService.set('schedule', updatedSchedules);
          setScheduleData(updatedSchedules);
        }
        
        // Update production notifications soNo untuk SPK terkait
        const currentProdNotif = extractStorageValue(await storageService.get<any[]>('productionNotifications'));
        const updatedProdNotif = currentProdNotif.map((notif: any) => {
          if (spkToUpdate.some((s: any) => s.spkNo === notif.spkNo)) {
            return {
              ...notif,
              soNo: soNo, // Update soNo di production notification juga
            };
          }
          return notif;
        });
        if (updatedProdNotif.some((notif: any, idx: number) => notif.soNo !== currentProdNotif[idx]?.soNo)) {
          await storageService.set('productionNotifications', updatedProdNotif);
        }
        
        // Update delivery notifications soNo untuk SPK terkait
        const currentDelNotif = extractStorageValue(await storageService.get<any[]>('deliveryNotifications'));
        const updatedDelNotif = currentDelNotif.map((notif: any) => {
          if (spkToUpdate.some((s: any) => s.spkNo === notif.spkNo)) {
            return {
              ...notif,
              soNo: soNo, // Update soNo di delivery notification juga
            };
          }
          return notif;
        });
        if (updatedDelNotif.some((notif: any, idx: number) => notif.soNo !== currentDelNotif[idx]?.soNo)) {
          await storageService.set('deliveryNotifications', updatedDelNotif);
        }
        
        console.log(`✅ Updated SPK, Schedule, and Notifications soNo for PTP ${matchingPTP.requestNo} to SO ${soNo}`);
      }

      showAlert(`SO ${soNo} created and linked to PTP ${matchingPTP.requestNo}\n\n✅ SPK terkait juga di-update dengan SO No baru`, 'Success');
      setMatchingPTP(null);
      loadData();
    } catch (error: any) {
      showAlert(`Error creating SO: ${error.message}`, 'Error');
    }
  };

  const handleLinkExistingSO = async (soNo: string) => {
    if (!matchingPTP) return;
    
    try {
      const so = salesOrders.find(s => s.soNo === soNo);
      if (!so) {
        showAlert('SO tidak ditemukan', 'Error');
        return;
      }

      // Link PTP dengan SO
      const updatedPTP = ptpData.map(p => 
        p.id === matchingPTP.id 
          ? { ...p, soNo: soNo, linkedSO: soNo } 
          : p
      );
      await storageService.set('ptp', updatedPTP);
      setPtpData(updatedPTP);

      // Update SPK yang sudah dibuat dari PTP ini untuk update soNo-nya
      const currentSPK = extractStorageValue(await storageService.get<any[]>('spk'));
      const spkToUpdate = currentSPK.filter((s: any) => s.ptpRequestNo === matchingPTP.requestNo);
      const updatedSPK = currentSPK.map((s: any) => {
        if (s.ptpRequestNo === matchingPTP.requestNo) {
          return {
            ...s,
            soNo: soNo, // Update soNo dari requestNo ke soNo yang baru
          };
        }
        return s;
      });
      
      if (spkToUpdate.length > 0) {
        await storageService.set('spk', updatedSPK);
        setSpkData(updatedSPK);
        
        // Update schedule soNo untuk SPK terkait
        const currentSchedules = extractStorageValue(await storageService.get<any[]>('schedule'));
        const updatedSchedules = currentSchedules.map((sch: any) => {
          if (spkToUpdate.some((s: any) => s.spkNo === sch.spkNo)) {
            return {
              ...sch,
              soNo: soNo, // Update soNo di schedule juga
            };
          }
          return sch;
        });
        if (updatedSchedules.some((sch: any, idx: number) => sch.soNo !== currentSchedules[idx]?.soNo)) {
          await storageService.set('schedule', updatedSchedules);
          setScheduleData(updatedSchedules);
        }
        
        // Update production notifications soNo untuk SPK terkait
        const currentProdNotif = extractStorageValue(await storageService.get<any[]>('productionNotifications'));
        const updatedProdNotif = currentProdNotif.map((notif: any) => {
          if (spkToUpdate.some((s: any) => s.spkNo === notif.spkNo)) {
            return {
              ...notif,
              soNo: soNo, // Update soNo di production notification juga
            };
          }
          return notif;
        });
        if (updatedProdNotif.some((notif: any, idx: number) => notif.soNo !== currentProdNotif[idx]?.soNo)) {
          await storageService.set('productionNotifications', updatedProdNotif);
        }
        
        // Update delivery notifications soNo untuk SPK terkait
        const currentDelNotif = extractStorageValue(await storageService.get<any[]>('deliveryNotifications'));
        const updatedDelNotif = currentDelNotif.map((notif: any) => {
          if (spkToUpdate.some((s: any) => s.spkNo === notif.spkNo)) {
            return {
              ...notif,
              soNo: soNo, // Update soNo di delivery notification juga
            };
          }
          return notif;
        });
        if (updatedDelNotif.some((notif: any, idx: number) => notif.soNo !== currentDelNotif[idx]?.soNo)) {
          await storageService.set('deliveryNotifications', updatedDelNotif);
        }
        
        console.log(`✅ Updated SPK, Schedule, and Notifications soNo for PTP ${matchingPTP.requestNo} to SO ${soNo}`);
      }

      showAlert(`PTP ${matchingPTP.requestNo} linked to SO ${soNo}\n\n✅ SPK terkait juga di-update dengan SO No baru`, 'Success');
      setMatchingPTP(null);
      loadData();
    } catch (error: any) {
      showAlert(`Error linking SO: ${error.message}`, 'Error');
    }
  };

  const handleClosePTP = async (item: any) => {
    // Check if PTP sudah link dengan SO
    if (!item.soNo && !item.linkedSO) {
      showAlert('PTP belum di-link dengan SO. Harap link dengan SO terlebih dahulu sebelum close.', 'Warning');
      return;
    }

    // Check if semua step sudah selesai (SPK, Production, Delivery, Invoice)
    const soNo = item.soNo || item.linkedSO;
    const relatedSPK = spkData.filter(s => s.soNo === soNo || s.soNo === item.requestNo);
    const relatedProduction = productionData.filter(p => 
      relatedSPK.some(s => s.spkNo === p.spkNo)
    );
    
    // Check if ada SPK yang belum CLOSE
    const hasUnclosedSPK = relatedSPK.some(s => s.status !== 'CLOSE');
    if (hasUnclosedSPK) {
      showAlert('Tidak bisa close PTP. Masih ada SPK yang belum CLOSE.', 'Warning');
      return;
    }

    // Check if production sudah selesai
    const hasIncompleteProduction = relatedProduction.some(p => 
      (p.producedQty || 0) < (p.targetQty || 0)
    );
    if (hasIncompleteProduction) {
      showAlert('Tidak bisa close PTP. Production belum selesai.', 'Warning');
      return;
    }

    showConfirm(
      `Close PTP Request: ${item.requestNo}?\n\nPastikan semua step sudah selesai.`,
      async () => {
        await handleClosePTPContinue(item);
      },
      () => closeDialog(),
      'Close PTP'
    );
    return;
  };

  const handleClosePTPContinue = async (item: any) => {
    try {
      const updatedPTP = ptpData.map(p => 
        p.id === item.id ? { ...p, status: 'CLOSE', closedAt: new Date().toISOString() } : p
      );
      await storageService.set('ptp', updatedPTP);
      setPtpData(updatedPTP);
      showAlert(`PTP ${item.requestNo} closed successfully`, 'Success');
      closeDialog();
      loadData();
    } catch (error: any) {
      showAlert(`Error closing PTP: ${error.message}`, 'Error');
      closeDialog();
    }
  };

  const handleDeletePTP = async (item: any) => {
    if (!item || !item.requestNo) {
      showAlert('PTP tidak valid. Mohon coba lagi.', 'Error');
      return;
    }

    showConfirm(
      `Hapus PTP ${item.requestNo}?\n\nTindakan ini akan menghapus PTP dari daftar.`,
      async () => {
        try {
          // 🚀 FIX: Pakai packaging delete helper untuk konsistensi
          const deleteResult = await deletePackagingItem('ptp', item.id, 'id');
          if (!deleteResult.success) {
            showAlert(`Gagal menghapus PTP: ${deleteResult.error || 'Unknown error'}`, 'Error');
            return;
          }
          
          // Reload PTP data dengan helper (handle race condition)
          await reloadPackagingData('ptp', setPtpData);
          
          showAlert(`PTP ${item.requestNo} berhasil dihapus.`, 'Success');
          loadData();
        } catch (error: any) {
          showAlert(`Error deleting PTP: ${error.message}`, 'Error');
        }
      },
      undefined,
      'Confirm Delete'
    );
  };

  const handleCreatePTP = async (formData: any) => {
    try {
      // Support both old format (single productItem) and new format (items array)
      const items = formData.items && Array.isArray(formData.items) && formData.items.length > 0
        ? formData.items.map((item: any) => ({
            ...item,
            total: (item.qty || 0) * (item.price || 0), // Ensure total is calculated
          }))
        : formData.productItem
          ? [{
              id: Date.now().toString(),
              productItem: formData.productItem,
              qty: formData.qty || 0,
              unit: formData.unit || 'PCS',
              price: formData.price || 0,
              total: (formData.qty || 0) * (formData.price || 0),
              reason: formData.reason || '',
            }]
          : [];

      if (items.length === 0) {
        showAlert('Harap tambahkan minimal 1 product', 'Warning');
        return;
      }

      // Calculate totals
      const totalQty = items.reduce((sum: number, item: any) => sum + (item.qty || 0), 0);
      const totalAmount = items.reduce((sum: number, item: any) => sum + (item.total || 0), 0);

      // Create PTP with items array
      const newPTP = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        requestNo: formData.requestNo || `PTP-${new Date().getFullYear()}${String(Date.now()).slice(-6)}`,
        customer: formData.customer,
        items: items, // New format: items array with price and total
        // Backward compatibility: keep single productItem, qty, unit for old data
        productItem: items.length === 1 ? items[0].productItem : items.map((i: any) => i.productItem).join(', '),
        qty: totalQty,
        unit: items.length === 1 ? items[0].unit : 'PCS',
        price: items.length === 1 ? items[0].price : 0, // Single price for backward compatibility
        total: totalAmount, // Total amount for all items
        reason: formData.reason || items.map((i: any) => i.reason).filter((r: any) => r).join('; ') || '',
        status: 'OPEN',
        requestDate: formData.requestDate || new Date().toISOString().split('T')[0],
        created: new Date().toISOString(),
      };

      const currentPTP = extractStorageValue(await storageService.get<any[]>('ptp'));
      await storageService.set('ptp', [...currentPTP, newPTP]);
      setPtpData([...currentPTP, newPTP]);
      setShowCreatePTP(false);
      showAlert(`PTP ${newPTP.requestNo} created successfully dengan ${items.length} product(s)`, 'Success');
      loadData();
    } catch (error: any) {
      showAlert(`Error creating PTP: ${error.message}`, 'Error');
    }
  };

  return (
    <div className="module-compact">
      <div className="page-header">
        <h1>PPIC - Production Planning & Inventory Control</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {confirmedSOsPending.length > 0 && (
            <NotificationBell
              notifications={soNotifications}
              onNotificationClick={(notification) => {
                if (notification.so) {
                  handleViewSODetail(notification.so);
                }
              }}
              icon="📋"
              emptyMessage="Tidak ada Sales Order yang perlu diproses"
            />
          )}
          <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
        </div>
      </div>

      <Card>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'flex-start',
            marginBottom: '16px',
          }}
        >
          {(activeTab === 'spk' || activeTab === 'ptp' || activeTab === 'outstanding' || activeTab === 'schedule') && (
            <div style={{ flex: '0 0 280px', minWidth: '240px' }}>
              <Input
                label="Search & Filter"
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={
                  activeTab === 'spk'
                    ? 'Search by SO No, Customer, SPK No, Product, Status...'
                    : activeTab === 'ptp'
                      ? 'Search by Request No, Customer, Product, Reason, Status...'
                      : activeTab === 'schedule'
                        ? 'Search by SPK No, SO No, Customer, Item, Code...'
                        : 'Search by SO No, Customer, SPK No, Request No, Product, Status...'
                }
              />
            </div>
          )}

          <div className="tab-container" style={{ marginBottom: 0, flex: '1 1 auto' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id as any)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          {/* View Mode Toggle - hanya untuk tab SPK */}
          {activeTab === 'spk' && (
            <div
              style={{
                display: 'inline-flex',
                borderRadius: '999px',
                overflow: 'hidden',
                border: '1px solid',
                borderColor: (document.documentElement.getAttribute('data-theme') || 'dark') === 'light' ? '#000' : '#fff',
              }}
            >
              {(['cards', 'table'] as const).map(mode => {
                const theme = document.documentElement.getAttribute('data-theme') || 'dark';
                const isActive = spkViewMode === mode;
                const isLight = theme === 'light';

                const activeBg = isLight ? '#000' : '#fff';
                const inactiveBg = 'transparent';
                const activeColor = isLight ? '#fff' : '#000';
                const inactiveColor = isLight ? '#000' : '#fff';

                return (
                  <button
                    key={mode}
                    onClick={() => setSpkViewMode(mode)}
                    style={{
                      padding: '6px 12px',
                      border: 'none',
                      backgroundColor: isActive ? activeBg : inactiveBg,
                      color: isActive ? activeColor : inactiveColor,
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    {mode === 'cards' ? 'Cards' : 'Table'}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="tab-content">
          {activeTab === 'spk' && (
            <>
              {spkViewMode === 'cards' ? (
                renderSpkCardView(
                  filteredSpkData,
                  searchQuery ? "No SPK data found matching your search" : "No SPK data"
                )
              ) : (
                <Table 
                  columns={spkTableColumns} 
                  data={flattenedSpkData} 
                  emptyMessage={searchQuery ? "No SPK data found matching your search" : "No SPK data"}
                  getRowStyle={(item: any) => ({
                    backgroundColor: getRowColor(item.customer || ''),
                  })}
                />
              )}
            </>
          )}
          {activeTab === 'ptp' && (
            <div>
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', alignSelf: 'flex-end' }}>
                  <button
                    onClick={() => setPtpViewMode('cards')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: ptpViewMode === 'cards' ? 'var(--accent-color)' : 'transparent',
                      color: ptpViewMode === 'cards' ? '#fff' : 'var(--text-secondary)',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Card View
                  </button>
                  <button
                    onClick={() => setPtpViewMode('table')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: ptpViewMode === 'table' ? 'var(--accent-color)' : 'transparent',
                      color: ptpViewMode === 'table' ? '#fff' : 'var(--text-secondary)',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Table View
                  </button>
                </div>
                <Button variant="primary" onClick={() => setShowCreatePTP(true)}>
                  Create PTP
                </Button>
              </div>
              {ptpViewMode === 'cards' ? (
                renderPtpCardView(
                  filteredPtpData,
                  searchQuery ? "No PTP data found matching your search" : "No PTP data"
                )
              ) : (
                <Table 
                  columns={ptpTableColumns} 
                  data={flattenedPtpData} 
                  emptyMessage={searchQuery ? "No PTP data found matching your search" : "No PTP data"}
                  getRowStyle={(item: any) => ({
                    backgroundColor: getRowColor(item.customer || ''),
                  })}
                />
              )}
            </div>
          )}
          {activeTab === 'outstanding' && (
            <div>
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Outstanding SPK ({filteredSpkData.length})</h3>
                {renderSpkCardView(
                  filteredSpkData,
                  searchQuery ? "No outstanding SPK data found matching your search" : "No outstanding SPK data"
                )}
              </div>
              <div>
                <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Outstanding PTP ({filteredPtpData.filter((item: any) => item.status === 'OPEN').length})</h3>
                {renderPtpCardView(
                  filteredPtpData.filter((item: any) => item.status === 'OPEN'),
                  searchQuery ? "No outstanding PTP data found matching your search" : "No outstanding PTP data"
                )}
              </div>
            </div>
          )}
          {activeTab === 'schedule' && (
            <ScheduleTable
              data={transformedScheduleData}
              onScheduleClick={handleScheduleClick}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              hideSearchInput
            />
          )}
          {activeTab === 'analisa' && (
            <div style={{ padding: '20px' }}>
              {/* Sub-tabs */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'spk', label: `SPK (${spkData.length})` },
                  { id: 'po', label: `PO (${purchaseOrders.length})` },
                  { id: 'so', label: `SO (${salesOrders.length})` },
                  { id: 'production', label: `Production (${productionData.length})` },
                  { id: 'ptp', label: `PTP (${ptpData.length})` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setAnalisaSubTab(tab.id as any)}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      background: analisaSubTab === tab.id ? 'var(--accent-color)' : 'transparent',
                      color: analisaSubTab === tab.id ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: analisaSubTab === tab.id ? '600' : '400',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Overview Dashboard */}
              {analisaSubTab === 'overview' && (
                <div>
                  {/* Statistik Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    <Card>
                      <div style={{ padding: '16px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total SPK</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--accent-color)' }}>{spkData.length}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                          Open: {spkData.filter((s: any) => s.status === 'OPEN').length} | 
                          Close: {spkData.filter((s: any) => s.status === 'CLOSE').length}
                        </div>
                      </div>
                    </Card>
                    <Card>
                      <div style={{ padding: '16px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total PO</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00ff88' }}>{purchaseOrders.length}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                          Open: {purchaseOrders.filter((p: any) => p.status === 'OPEN').length} | 
                          Close: {purchaseOrders.filter((p: any) => p.status === 'CLOSE').length}
                        </div>
                      </div>
                    </Card>
                    <Card>
                      <div style={{ padding: '16px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total SO</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2e7d32' }}>{salesOrders.length}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                          Open: {salesOrders.filter((s: any) => s.status === 'OPEN').length} | 
                          Close: {salesOrders.filter((s: any) => s.status === 'CLOSE').length}
                        </div>
                      </div>
                    </Card>
                    <Card>
                      <div style={{ padding: '16px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Production</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffaa00' }}>{productionData.length}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                          Open: {productionData.filter((p: any) => p.status === 'OPEN').length} | 
                          Close: {productionData.filter((p: any) => p.status === 'CLOSE').length}
                        </div>
                      </div>
                    </Card>
                    <Card>
                      <div style={{ padding: '16px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total PTP</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff4444' }}>{ptpData.length}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                          Open: {ptpData.filter((p: any) => p.status === 'OPEN').length} | 
                          Close: {ptpData.filter((p: any) => p.status === 'CLOSE').length}
                        </div>
                      </div>
                    </Card>
                    <Card>
                      <div style={{ padding: '16px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Delivery</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00d4ff' }}>{deliveryNotes.length}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                          Open: {deliveryNotes.filter((d: any) => d.status === 'OPEN').length} | 
                          Close: {deliveryNotes.filter((d: any) => d.status === 'CLOSE').length}
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Status Breakdown */}
                  <Card>
                    <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>Status Breakdown</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>SPK Status</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {['DRAFT', 'OPEN', 'CLOSE'].map(status => {
                            const count = spkData.filter((s: any) => s.status === status).length;
                            return (
                              <div key={status} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                <span>{status}:</span>
                                <span style={{ fontWeight: '600' }}>{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>PO Status</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {['DRAFT', 'OPEN', 'CLOSE'].map(status => {
                            const count = purchaseOrders.filter((p: any) => p.status === status).length;
                            return (
                              <div key={status} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                <span>{status}:</span>
                                <span style={{ fontWeight: '600' }}>{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>SO Status</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {['OPEN', 'CLOSE'].map(status => {
                            const count = salesOrders.filter((s: any) => s.status === status).length;
                            return (
                              <div key={status} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                <span>{status}:</span>
                                <span style={{ fontWeight: '600' }}>{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* SPK Detail */}
              {analisaSubTab === 'spk' && (
                <div>
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '16px', margin: 0 }}>SPK Analysis</h3>
                    <Button variant="secondary" onClick={() => setActiveTab('spk')} style={{ fontSize: '11px', padding: '4px 8px' }}>
                      View All SPK
                    </Button>
                  </div>
                  <Table 
                    columns={[
                      { key: 'spkNo', header: 'SPK No', render: (item: any) => <strong style={{ color: 'var(--accent-color)' }}>{item.spkNo || '-'}</strong> },
                      { key: 'soNo', header: 'SO No', render: (item: any) => <span style={{ color: '#2e7d32' }}>{item.soNo || '-'}</span> },
                      { key: 'customer', header: 'Customer' },
                      { key: 'product', header: 'Product' },
                      { key: 'qty', header: 'Qty' },
                      { key: 'status', header: 'Status', render: (item: any) => <span className={`status-badge status-${(item.status || 'OPEN').toLowerCase()}`}>{item.status || 'OPEN'}</span> },
                      { key: 'created', header: 'Created', render: (item: any) => item.created ? new Date(item.created).toLocaleDateString('id-ID') : '-' },
                    ]} 
                    data={spkData.slice(0, 20)} 
                    emptyMessage="No SPK data"
                  />
                </div>
              )}

              {/* PO Detail */}
              {analisaSubTab === 'po' && (
                <div>
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '16px', margin: 0 }}>Purchase Order Analysis</h3>
                  </div>
                  <Table 
                    columns={[
                      { key: 'poNo', header: 'PO No', render: (item: any) => <strong style={{ color: '#00ff88' }}>{item.poNo || '-'}</strong> },
                      { key: 'supplier', header: 'Supplier' },
                      { key: 'soNo', header: 'SO No', render: (item: any) => <span style={{ color: '#2e7d32' }}>{item.soNo || '-'}</span> },
                      { key: 'materialItem', header: 'Material' },
                      { key: 'qty', header: 'Qty' },
                      { key: 'price', header: 'Price', render: (item: any) => `Rp ${(item.price || 0).toLocaleString('id-ID')}` },
                      { key: 'status', header: 'Status', render: (item: any) => <span className={`status-badge status-${(item.status || 'OPEN').toLowerCase()}`}>{item.status || 'OPEN'}</span> },
                    ]} 
                    data={purchaseOrders.slice(0, 20)} 
                    emptyMessage="No PO data"
                  />
                </div>
              )}

              {/* SO Detail */}
              {analisaSubTab === 'so' && (
                <div>
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '16px', margin: 0 }}>Sales Order Analysis</h3>
                  </div>
                  <Table 
                    columns={[
                      { key: 'soNo', header: 'SO No', render: (item: any) => <strong style={{ color: '#2e7d32' }}>{item.soNo || '-'}</strong> },
                      { key: 'customer', header: 'Customer' },
                      { key: 'paymentTerms', header: 'Payment Terms' },
                      { key: 'status', header: 'Status', render: (item: any) => <span className={`status-badge status-${(item.status || 'DRAFT').toLowerCase()}`}>{item.status || 'DRAFT'}</span> },
                      { key: 'created', header: 'Created', render: (item: any) => item.created ? new Date(item.created).toLocaleDateString('id-ID') : '-' },
                      { 
                        key: 'actions', 
                        header: 'Actions',
                        render: (item: any) => (
                          <Button 
                            variant="secondary" 
                            onClick={() => setViewingSO(item)}
                            style={{ fontSize: '10px', padding: '2px 5px' }}
                          >
                            View Detail
                          </Button>
                        )
                      },
                    ]} 
                    data={salesOrders.slice(0, 20)} 
                    emptyMessage="No SO data"
                  />
                </div>
              )}

              {/* Production Detail */}
              {analisaSubTab === 'production' && (
                <div>
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '16px', margin: 0 }}>Production Analysis</h3>
                  </div>
                  <Table 
                    columns={[
                      { key: 'productionNo', header: 'Production No', render: (item: any) => <strong style={{ color: '#ffaa00' }}>{item.productionNo || item.grnNo || '-'}</strong> },
                      { key: 'soNo', header: 'SO No', render: (item: any) => <span style={{ color: '#2e7d32' }}>{item.soNo || '-'}</span> },
                      { key: 'spkNo', header: 'SPK No' },
                      { key: 'customer', header: 'Customer' },
                      { key: 'target', header: 'Target' },
                      { key: 'progress', header: 'Progress', render: (item: any) => `${item.progress || 0} / ${item.target || 0}` },
                      { key: 'status', header: 'Status', render: (item: any) => <span className={`status-badge status-${(item.status || 'OPEN').toLowerCase()}`}>{item.status || 'OPEN'}</span> },
                    ]} 
                    data={productionData.slice(0, 20)} 
                    emptyMessage="No Production data"
                  />
                </div>
              )}

              {/* PTP Detail */}
              {analisaSubTab === 'ptp' && (
                <div>
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '16px', margin: 0 }}>PTP Analysis</h3>
                  </div>
                  <Table 
                    columns={[
                      { key: 'requestNo', header: 'Request No', render: (item: any) => <strong style={{ color: '#ff4444' }}>{item.requestNo || '-'}</strong> },
                      { key: 'customer', header: 'Customer' },
                      { key: 'productItem', header: 'Product/Item' },
                      { key: 'qty', header: 'Qty' },
                      { key: 'reason', header: 'Reason' },
                      { key: 'status', header: 'Status', render: (item: any) => <span className={`status-badge status-${(item.status || 'OPEN').toLowerCase()}`}>{item.status || 'OPEN'}</span> },
                      { key: 'soNo', header: 'Linked SO', render: (item: any) => item.soNo ? <span style={{ color: '#2e7d32' }}>{item.soNo}</span> : '-' },
                      { 
                        key: 'actions', 
                        header: 'Actions',
                        render: (item: any) => (
                          <Button 
                            variant="secondary" 
                            onClick={() => setViewingPTP(item)}
                            style={{ fontSize: '10px', padding: '2px 5px' }}
                          >
                            View
                          </Button>
                        )
                      },
                    ]} 
                    data={ptpData.slice(0, 20)} 
                    emptyMessage="No PTP data"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {selectedScheduleItem && (
        <ScheduleDialog
          item={selectedScheduleItem}
          onClose={() => setSelectedScheduleItem(null)}
          onSave={handleSaveSchedule}
        />
      )}

      {selectedDeliveryItem && (
        <DeliveryScheduleDialog
          item={selectedDeliveryItem}
          onClose={() => setSelectedDeliveryItem(null)}
          onSave={handleSaveDeliverySchedule}
        />
      )}

      {selectedGeneralScheduleItem && (
        <GeneralScheduleDialog
          item={selectedGeneralScheduleItem}
          activeTab={generalScheduleActiveTab}
          onClose={() => {
            setSelectedGeneralScheduleItem(null);
            setGeneralScheduleActiveTab('production');
          }}
          onSaveProduction={async (data: any) => {
            try {
              // Handle save production schedule untuk multiple SPKs
              // Format dari ProductionScheduleDialog: { spkProductions: [{ spkNo, startDate, endDate, batches }] }
              if (!data.spkProductions || data.spkProductions.length === 0) {
                showAlert('Error: Tidak ada production schedule untuk disimpan', 'Error');
                return;
              }
              
              // Handle batch splitting untuk setiap SPK
              const currentSPKs = await storageService.get<any[]>('spk') || [];
              const currentSchedules = await storageService.get<any[]>('schedule') || [];
              const productionNotifications = await storageService.get<any[]>('productionNotifications') || [];
              
              let updatedSPKs = [...currentSPKs];
              let updatedSchedules = [...currentSchedules];
              let updatedNotifications = [...productionNotifications];
              
              for (const spkProduction of data.spkProductions) {
                const spkNo = spkProduction.spkNo;
                const batches = spkProduction.batches || [];
                const hasBatches = batches.length > 0;
                const spkItem = spkData.find((s: any) => s.spkNo === spkNo);
                
                if (hasBatches && spkItem) {
                  // Split SPK menjadi multiple SPK berdasarkan batches
                  // Hapus SPK utama dan schedule-nya
                  updatedSPKs = updatedSPKs.filter((s: any) => s.spkNo !== spkNo);
                  updatedSchedules = updatedSchedules.filter((s: any) => s.spkNo !== spkNo);
                  updatedNotifications = updatedNotifications.filter((n: any) => n.spkNo !== spkNo);
                  
                  // Buat SPK baru untuk setiap batch
                  batches.forEach((batch: any, batchIdx: number) => {
                    const batchNo = batch.batchNo || String.fromCharCode(65 + batchIdx); // A, B, C, dst
                    const batchSpkNo = `${spkNo}-${batchNo}`;
                    const batchQty = batch.qty || 0;
                    
                    // Create SPK untuk batch ini
                    const newSPK = {
                      ...spkItem,
                      id: Date.now().toString() + Math.random().toString(36).substr(2, 9) + batchIdx,
                      spkNo: batchSpkNo,
                      qty: batchQty,
                      originalSpkNo: spkNo, // Track SPK asal
                      batchNo: batchNo,
                      status: 'OPEN',
                      created: new Date().toISOString(),
                    };
                    updatedSPKs.push(newSPK);
                    
                    // Create schedule untuk batch ini
                    const batchSchedule = {
                      id: Date.now().toString() + Math.random().toString(36).substr(2, 9) + batchIdx,
                      spkNo: batchSpkNo,
                      soNo: spkItem.soNo || '',
                      scheduleStartDate: batch.startDate ? new Date(batch.startDate).toISOString() : (spkProduction.startDate ? new Date(spkProduction.startDate).toISOString() : new Date().toISOString()),
                      scheduleEndDate: batch.endDate ? new Date(batch.endDate).toISOString() : (spkProduction.endDate ? new Date(spkProduction.endDate).toISOString() : new Date().toISOString()),
                      batches: [batch], // Satu batch per SPK
                      deliveryBatches: [],
                      progress: 0,
                      created: new Date().toISOString(),
                      updated: new Date().toISOString(),
                    };
                    updatedSchedules.push(batchSchedule);
                    
                    // Create notification untuk batch ini
                    const batchNotification = {
                      id: Date.now().toString() + Math.random().toString(36).substr(2, 9) + batchIdx,
                      type: 'PRODUCTION_SCHEDULE',
                      spkNo: batchSpkNo,
                      soNo: spkItem.soNo || '',
                      customer: spkItem.customer || '',
                      product: spkItem.product || '',
                      productId: spkItem.product_id || spkItem.kode || '',
                      qty: batchQty,
                      scheduleStartDate: batchSchedule.scheduleStartDate,
                      scheduleEndDate: batchSchedule.scheduleEndDate,
                      batches: [batch],
                      status: 'WAITING_MATERIAL',
                      materialStatus: 'PENDING',
                      created: new Date().toISOString(),
                    };
                    updatedNotifications.push(batchNotification);
                  });
                  
                  console.log(`✅ SPK ${spkNo} split into ${batches.length} batch SPKs`);
                } else {
                  // Tidak ada batches, update schedule seperti biasa
                  let existingSchedule = updatedSchedules.find((s: any) => s.spkNo === spkNo);
                  
                  if (!existingSchedule) {
                    const spkItem = spkData.find((s: any) => s.spkNo === spkNo);
                    existingSchedule = {
                      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                      spkNo: spkNo,
                      soNo: spkItem?.soNo || '',
                      scheduleStartDate: spkProduction.startDate ? new Date(spkProduction.startDate).toISOString() : new Date().toISOString(),
                      scheduleEndDate: spkProduction.endDate ? new Date(spkProduction.endDate).toISOString() : new Date().toISOString(),
                      batches: [],
                      deliveryBatches: [],
                      progress: 0,
                      created: new Date().toISOString(),
                      updated: new Date().toISOString(),
                    };
                    updatedSchedules.push(existingSchedule);
                  }
                  
                  // Update schedule untuk SPK ini
                  const scheduleIndex = updatedSchedules.findIndex((s: any) => s.spkNo === spkNo);
                  updatedSchedules[scheduleIndex] = {
                    ...updatedSchedules[scheduleIndex],
                    scheduleStartDate: spkProduction.startDate ? new Date(spkProduction.startDate).toISOString() : updatedSchedules[scheduleIndex].scheduleStartDate,
                    scheduleEndDate: spkProduction.endDate ? new Date(spkProduction.endDate).toISOString() : updatedSchedules[scheduleIndex].scheduleEndDate,
                    batches: batches,
                    updated: new Date().toISOString(),
                  };
                  
                  // Update notification jika tidak ada batches
                  const targetSpk = spkData.find((s: any) => s.spkNo === spkNo);
                  const existingNotification = updatedNotifications.find(
                    (n: any) => n.spkNo === spkNo && n.productId === (targetSpk?.product_id || targetSpk?.kode)
                  );
                  
                  if (!existingNotification && targetSpk) {
                    const newNotification = {
                      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                      type: 'PRODUCTION_SCHEDULE',
                      spkNo: spkNo,
                      soNo: targetSpk.soNo || '',
                      customer: targetSpk.customer || '',
                      product: targetSpk.product || '',
                      productId: targetSpk.product_id || targetSpk.kode || '',
                      qty: targetSpk.qty || 0,
                      scheduleStartDate: spkProduction.startDate ? new Date(spkProduction.startDate).toISOString() : new Date().toISOString(),
                      scheduleEndDate: spkProduction.endDate ? new Date(spkProduction.endDate).toISOString() : new Date().toISOString(),
                      batches: batches,
                      status: 'WAITING_MATERIAL',
                      materialStatus: 'PENDING',
                      created: new Date().toISOString(),
                    };
                    updatedNotifications.push(newNotification);
                  }
                }
              }
              
              // Save semua perubahan
              await storageService.set('spk', updatedSPKs);
              setSpkData(updatedSPKs);
              
              await storageService.set('schedule', updatedSchedules);
              setScheduleData(updatedSchedules);
              
              if (updatedNotifications.length > 0) {
                await storageService.set('productionNotifications', updatedNotifications);
                console.log(`✅ Production notifications created/updated for ${data.spkProductions.length} SPKs - Waiting for material receipt`);
              }
              
              // Jangan tutup dialog jika dipanggil dari GeneralScheduleDialog
              const isFromGeneralSchedule = selectedGeneralScheduleItem !== null;
              
              if (!isFromGeneralSchedule) {
                showAlert(`Production schedule saved for ${data.spkProductions.length} SPK\n\n📧 Notifications sent to Production - Waiting for material receipt from Purchasing`, 'Success');
              } else {
                showAlert(`Production schedule saved for ${data.spkProductions.length} SPK\n\n📧 Notifications sent to Production - Waiting for material receipt from Purchasing`, 'Success');
              }
              
              // Reload data setelah save
              loadData();
            } catch (error: any) {
              showAlert(`Error saving production schedule: ${error.message}`, 'Error');
            }
          }}
          onSaveDelivery={handleSaveDeliverySchedule}
        />
      )}

      {editingBOM && (
        <BOMDialog
          productId={editingBOM.product_id || editingBOM.kode || ''}
          productName={editingBOM.product || 'Product'}
          productKode={editingBOM.kode || editingBOM.product_id || ''}
          onClose={() => setEditingBOM(null)}
          onSave={handleSaveBOM}
        />
      )}

      {/* Dialog untuk edit SPK-specific BOM override */}
      {editingSPKBOM && (() => {
        const SPKBOMOverrideDialog = () => {
          const [overrideQtys, setOverrideQtys] = useState<{ [materialId: string]: string }>(() => {
            const initial: { [materialId: string]: string } = {};
            editingSPKBOM.bomMaterials.forEach((mat: any) => {
              if (mat.isOverride) {
                initial[mat.materialId] = mat.requiredQty.toString();
              }
            });
            return initial;
          });
          
          const handleQtyChange = (materialId: string, value: string) => {
            if (value === '' || /^\d*\.?\d*$/.test(value)) {
              setOverrideQtys(prev => ({
                ...prev,
                [materialId]: value,
              }));
            }
          };
          
          const handleSave = () => {
            const overrideData: { [key: string]: number } = {};
            Object.keys(overrideQtys).forEach((materialId) => {
              const qty = overrideQtys[materialId];
              if (qty && qty !== '') {
                const numQty = parseFloat(qty);
                if (!isNaN(numQty) && numQty >= 0) {
                  overrideData[materialId] = numQty;
                }
              }
            });
            handleSaveSPKBOMOverride(overrideData);
          };
          
          return (
            <div className="dialog-overlay" onClick={() => setEditingSPKBOM(null)}>
              <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
                <Card className="dialog-card">
                  <h2>Edit BOM Override - {editingSPKBOM.spk.spkNo}</h2>
                  <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '13px' }}>
                    <div><strong>Product:</strong> {editingSPKBOM.spk.product}</div>
                    <div><strong>Qty SPK:</strong> {editingSPKBOM.spkQty} {editingSPKBOM.spk.unit || 'PCS'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>
                      💡 Override hanya berlaku untuk SPK ini. Jika tidak di-override, akan menggunakan ratio dari master BOM.
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '20px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-color)' }}>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Material</th>
                          <th style={{ padding: '10px', textAlign: 'right' }}>Ratio</th>
                          <th style={{ padding: '10px', textAlign: 'right' }}>Qty (Default)</th>
                          <th style={{ padding: '10px', textAlign: 'right' }}>Qty Override</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editingSPKBOM.bomMaterials.map((mat: any, idx: number) => {
                          const defaultQty = editingSPKBOM.spkQty * mat.ratio;
                          const overrideQty = overrideQtys[mat.materialId] || '';
                          
                          return (
                            <tr key={mat.materialId || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '10px' }}>
                                <div style={{ fontWeight: '500' }}>{mat.materialName}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>({mat.materialId})</div>
                              </td>
                              <td style={{ padding: '10px', textAlign: 'right' }}>{mat.ratio}</td>
                              <td style={{ padding: '10px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                {Math.ceil(defaultQty)}
                              </td>
                              <td style={{ padding: '10px', textAlign: 'right' }}>
                                <input
                                  type="text"
                                  value={overrideQty}
                                  onChange={(e) => handleQtyChange(mat.materialId, e.target.value)}
                                  placeholder={Math.ceil(defaultQty).toString()}
                                  style={{
                                    width: '100px',
                                    padding: '4px 8px',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '4px',
                                    backgroundColor: 'var(--bg-primary)',
                                    color: 'var(--text-primary)',
                                    textAlign: 'right',
                                  }}
                                />
                              </td>
                              <td style={{ padding: '10px' }}>{mat.unit}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <Button variant="secondary" onClick={() => setEditingSPKBOM(null)}>
                      Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSave}>
                      Save Override
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          );
        };
        
        return <SPKBOMOverrideDialog />;
      })()}

    {viewingProductBOM && (
      <div className="dialog-overlay" onClick={() => setViewingProductBOM(null)}>
        <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
          <Card className="dialog-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0 }}>View BOM</h2>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {viewingProductBOM.spk.product || '-'} ({viewingProductBOM.spk.spkNo || '-'})
                </div>
              </div>
              <Button variant="secondary" onClick={() => setViewingProductBOM(null)} style={{ padding: '4px 8px' }}>
                ✕
              </Button>
            </div>

            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px' }}>Material</th>
                    <th style={{ padding: '8px', textAlign: 'center', fontSize: '12px', width: '80px' }}>Unit</th>
                    <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px', width: '100px' }}>Ratio</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingProductBOM.bomItems.map((bom: any, idx: number) => (
                    <tr key={bom.id || `${bom.materialId}-${idx}`} style={{ borderTop: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px', fontSize: '12px' }}>
                        <div style={{ fontWeight: 600 }}>{bom.materialName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{bom.materialId}</div>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center', fontSize: '12px' }}>{(bom.unit || 'PCS').toUpperCase()}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>{bom.ratio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    )}

      {/* View PTP Dialog */}
      {viewingPTP && (
        <div className="dialog-overlay" onClick={() => setViewingPTP(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <Card className="dialog-card">
              <h2 style={{ fontSize: '18px', marginBottom: '12px', wordBreak: 'break-word' }}>PTP Details</h2>
              <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', wordBreak: 'break-word' }}>{viewingPTP.requestNo}</div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px', wordBreak: 'break-word' }}>{viewingPTP.productItem}</div>
              
              {/* Stock Fulfilled Banner */}
              {viewingPTP.stockFulfilled && (
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: '#e8f5e9',
                  borderRadius: '6px',
                  border: '1px solid #4caf50',
                  marginBottom: '12px',
                  fontSize: '12px',
                  color: '#2e7d32',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  wordBreak: 'break-word',
                }}>
                  <span>✅</span>
                  <span>Stock cukup - Skip PR/Schedule/BOM/QC, langsung ke Delivery</span>
                </div>
              )}
              
              {/* Info Grid - Compact */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px', fontSize: '12px' }}>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '2px' }}>Customer</div>
                  <div style={{ fontWeight: '500', wordBreak: 'break-word' }}>{viewingPTP.customer || '-'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '2px' }}>Qty</div>
                  <div style={{ fontWeight: '500' }}>{viewingPTP.qty || 0} {viewingPTP.unit || 'PCS'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '2px' }}>Status</div>
                  <div>
                    <span className={`status-badge status-${(viewingPTP.status === 'DRAFT' ? 'OPEN' : viewingPTP.status || 'OPEN').toLowerCase()}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                      {viewingPTP.status === 'DRAFT' ? 'OPEN' : (viewingPTP.status || 'OPEN')}
                    </span>
                  </div>
                </div>
                {viewingPTP.soNo && (
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '2px' }}>Linked SO</div>
                    <div style={{ fontWeight: '500', wordBreak: 'break-word' }}>{viewingPTP.soNo}</div>
                  </div>
                )}
              </div>
              
              {viewingPTP.reason && (
                <div style={{ marginBottom: '12px', fontSize: '12px' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '2px' }}>Reason</div>
                  <div style={{ wordBreak: 'break-word' }}>{viewingPTP.reason}</div>
                </div>
              )}
              
              {/* Ready for Delivery & Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                {viewingPTP.stockFulfilled && (
                  <div style={{ fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>🚀</span>
                    <span>Ready for Delivery</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                  {viewingPTP.status !== 'CLOSE' && (
                    <Button 
                      variant="danger" 
                      onClick={() => {
                        handleClosePTP(viewingPTP);
                        setViewingPTP(null);
                      }}
                      style={{ fontSize: '11px', padding: '6px 12px' }}
                    >
                      Close
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => setViewingPTP(null)} style={{ fontSize: '11px', padding: '6px 12px' }}>Close</Button>
                </div>
              </div>
              
              {/* Stock Fulfilled Status */}
              {viewingPTP.stockFulfilled && (
                <div style={{
                  marginTop: '8px',
                  padding: '6px 10px',
                  backgroundColor: 'rgba(76, 175, 80, 0.1)',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: '#2e7d32',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <span>✅</span>
                  <span>Stock Fulfilled - Ready for Delivery</span>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Create PTP Dialog */}
      {showCreatePTP && (
        <CreatePTPDialog
          customers={customers}
          products={products}
          onClose={() => setShowCreatePTP(false)}
          onSave={handleCreatePTP}
        />
      )}

      {/* Match SO Dialog */}
      {matchingPTP && (
        <MatchSODialog
          ptp={matchingPTP}
          salesOrders={salesOrders}
          onClose={() => setMatchingPTP(null)}
          onCreateSO={handleCreateSOFromPTP}
          onLinkSO={handleLinkExistingSO}
        />
      )}

      {/* Schedule & BOM Review Dialog */}
      {pendingSPKs.length > 0 && (
        <ScheduleBOMDialog
          spks={pendingSPKs}
          bomData={bomData}
          materials={materials}
          inventory={inventory}
          onClose={() => setPendingSPKs([])}
          onSave={handleSaveScheduleAndSPK}
        />
      )}

      {/* View SO Detail Dialog with Schedule & BOM */}
      {viewingSO && (
        <SODetailDialog
          so={viewingSO}
          bomData={bomData}
          materials={materials}
          inventory={inventory}
          onClose={() => setViewingSO(null)}
          onBOMUpdated={async () => {
            // Reload data setelah BOM di-update
            // Reload bomData secara eksplisit untuk memastikan ter-update
            const updatedBOM = await storageService.get<any[]>('bom');
            if (updatedBOM) {
              setBomData(extractStorageValue(updatedBOM));
            }
            // Juga reload semua data lainnya
            loadData();
          }}
        />
      )}

      {/* What to Do Next Dialog */}
      {whatToDoNextDialog.show && whatToDoNextDialog.spk && (
        <div className="dialog-overlay" onClick={() => setWhatToDoNextDialog({ show: false, spk: null, checklist: null })}>
          <div className="dialog-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                📋 What to Do Next - {whatToDoNextDialog.spk.spkNo}
              </h3>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {whatToDoNextDialog.spk.product}
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {/* PR Checklist */}
              <div style={{
                padding: '12px',
                backgroundColor: whatToDoNextDialog.checklist?.isStockFulfilled 
                  ? 'rgba(33, 150, 243, 0.1)' 
                  : whatToDoNextDialog.checklist?.hasPR 
                    ? 'rgba(76, 175, 80, 0.1)' 
                    : 'rgba(211, 47, 47, 0.1)',
                borderRadius: '8px',
                border: `2px solid ${
                  whatToDoNextDialog.checklist?.isStockFulfilled 
                    ? '#2196F3' 
                    : whatToDoNextDialog.checklist?.hasPR 
                      ? '#4caf50' 
                      : '#d32f2f'
                }`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>
                    {whatToDoNextDialog.checklist?.isStockFulfilled 
                      ? '⏭️' 
                      : whatToDoNextDialog.checklist?.hasPR 
                        ? '✅' 
                        : '☐'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      Purchase Request (PR)
                    </div>
                    {whatToDoNextDialog.checklist?.isStockFulfilled ? (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <strong>SKIPPED</strong> - Stock sudah ready, tidak perlu PR
                      </div>
                    ) : whatToDoNextDialog.checklist?.hasPR ? (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        PR Status: <strong>{whatToDoNextDialog.checklist.prStatus}</strong>
                        {whatToDoNextDialog.checklist.prNo && (
                          <span> - {whatToDoNextDialog.checklist.prNo}</span>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Belum dibuat. Klik tombol "PR" untuk membuat Purchase Request.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* BOM Checklist */}
              <div style={{
                padding: '12px',
                backgroundColor: whatToDoNextDialog.checklist?.hasBOM ? 'rgba(76, 175, 80, 0.1)' : 'rgba(211, 47, 47, 0.1)',
                borderRadius: '8px',
                border: `2px solid ${whatToDoNextDialog.checklist?.hasBOM ? '#4caf50' : '#d32f2f'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>
                    {whatToDoNextDialog.checklist?.hasBOM ? '✅' : '☐'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      Bill of Materials (BOM)
                    </div>
                    {whatToDoNextDialog.checklist?.hasBOM ? (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        BOM sudah tersedia untuk product ini.
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Belum ada BOM. Klik "View BOM" atau "Edit BOM" untuk mengelola BOM.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Schedule Checklist */}
              <div style={{
                padding: '12px',
                backgroundColor: whatToDoNextDialog.checklist?.hasSchedule ? 'rgba(76, 175, 80, 0.1)' : 'rgba(211, 47, 47, 0.1)',
                borderRadius: '8px',
                border: `2px solid ${whatToDoNextDialog.checklist?.hasSchedule ? '#4caf50' : '#d32f2f'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>
                    {whatToDoNextDialog.checklist?.hasSchedule ? '✅' : '☐'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      Schedule
                    </div>
                    {whatToDoNextDialog.checklist?.hasSchedule ? (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Schedule sudah dibuat.
                        {whatToDoNextDialog.checklist.scheduleStartDate && (
                          <span> Start: {new Date(whatToDoNextDialog.checklist.scheduleStartDate).toLocaleDateString('id-ID')}</span>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Belum ada schedule. Klik tombol "Schedule" untuk membuat schedule.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Delivery Notification Checklist */}
              <div style={{
                padding: '12px',
                backgroundColor: whatToDoNextDialog.checklist?.hasDeliveryNotif ? 'rgba(76, 175, 80, 0.1)' : 'rgba(211, 47, 47, 0.1)',
                borderRadius: '8px',
                border: `2px solid ${whatToDoNextDialog.checklist?.hasDeliveryNotif ? '#4caf50' : '#d32f2f'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>
                    {whatToDoNextDialog.checklist?.hasDeliveryNotif ? '✅' : '☐'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      Delivery Notification (WH/Delivery)
                    </div>
                    {whatToDoNextDialog.checklist?.hasDeliveryNotif ? (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Notifikasi sudah dikirim ke WH/Delivery untuk SPK ini.
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {whatToDoNextDialog.checklist?.isStockFulfilled 
                          ? 'Belum ada notifikasi. Klik tombol "Send to Delivery" untuk mengirim data ke Delivery Note.'
                          : 'Belum ada notifikasi. Notifikasi akan otomatis dibuat saat schedule delivery dibuat.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center' }}>
              {/* DISABLED: Manual trigger delivery notification button */}
              {/* {whatToDoNextDialog.checklist?.isStockFulfilled && !whatToDoNextDialog.checklist?.hasDeliveryNotif && (
                <Button 
                  variant="primary" 
                  onClick={() => handleTriggerDeliveryNotification(whatToDoNextDialog.spk)}
                  style={{ marginRight: 'auto' }}
                >
                  🚀 Send to Delivery Note
                </Button>
              )} */}
              <Button variant="secondary" onClick={() => setWhatToDoNextDialog({ show: false, spk: null, checklist: null })}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Custom Dialog for Alert/Confirm */}
      {dialogState.show && (
        <div className="dialog-overlay" onClick={dialogState.type === 'showAlert' ? closeDialog : undefined} style={{ zIndex: 10000 }}>
          <div className="dialog-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                {dialogState.title}
              </h3>
            </div>
            
            <div style={{ marginBottom: '24px', fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
              {dialogState.message}
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              {dialogState.type === 'confirm' && (
                <Button variant="secondary" onClick={() => {
                  if (dialogState.onCancel) dialogState.onCancel();
                  closeDialog();
                }}>
                  Cancel
                </Button>
              )}
              <Button variant="primary" onClick={() => {
                if (dialogState.onConfirm) dialogState.onConfirm();
                if (dialogState.type === 'showAlert') closeDialog();
              }}>
                {dialogState.type === 'showAlert' ? 'OK' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Dialog untuk PR */}
      {viewPdfData && (
        <div className="dialog-overlay" onClick={() => setViewPdfData(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90%', width: '1200px', maxHeight: '90vh', overflow: 'auto' }}>
            <Card className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2>Preview PR - {viewPdfData.prNo}</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="primary" onClick={handleSavePRToPDF}>
                    💾 Save to PDF
                  </Button>
                  <Button variant="secondary" onClick={() => setViewPdfData(null)}>
                    Close
                  </Button>
                </div>
              </div>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                <iframe
                  srcDoc={viewPdfData.html}
                  style={{
                    width: '100%',
                    height: '70vh',
                    border: 'none',
                    backgroundColor: '#fff',
                  }}
                  title="PR Preview"
                />
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

// SO Detail Dialog with Schedule & BOM Component
const SODetailDialog = ({ so, bomData, materials, inventory, onClose, onBOMUpdated }: any) => {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [bomItems, setBomItems] = useState<any[]>([]);
  const [editingBOM, setEditingBOM] = useState<any>(null); // State untuk product yang sedang di-edit BOM-nya
  
  // Custom Dialog state
  const [dialogState, setDialogState] = useState<{
    show: boolean;
    type: 'showAlert' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    show: false,
    type: 'showAlert',
    title: '',
    message: '',
  });
  
  const showAlert = (message: string, title: string = 'Information') => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(true);
    }
    setDialogState({
      show: true,
      type: 'showAlert',
      title,
      message,
    });
  };
  
  const closeDialog = () => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(false);
    }
    setDialogState({
      show: false,
      type: 'showAlert',
      title: '',
      message: '',
    });
  };
  const [materialStock, setMaterialStock] = useState<{ [key: string]: number }>({});
  const [activeSection, setActiveSection] = useState<'detail' | 'schedule'>('detail');
  const [theme, setTheme] = useState<'light' | 'dark'>(getTheme());
  
  useEffect(() => {
    // Update theme saat berubah
    const checkTheme = () => {
      const currentTheme = getTheme();
      setTheme(currentTheme);
    };
    checkTheme();
    
    // Listen untuk perubahan theme via MutationObserver
    const observer = new MutationObserver(() => {
      checkTheme();
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Defensive check: pastikan so dan so.items ada
    if (!so || !so.items || !Array.isArray(so.items)) {
      setBomItems([]);
      setMaterialStock({});
      return;
    }
    
    // Aggregate BOM dari semua products di SO
    const aggregatedBOM: { [key: string]: any } = {};
    
    so.items.forEach((item: any) => {
      // Skip jika product sudah voided
      if (!item || (item as any).voided) return;
      
      const productId = (item.productId || item.productKode || '').toString().trim();
      const productBOM = bomData.filter((b: any) => {
        const bomProductId = (b.product_id || b.kode || '').toString().trim();
        return bomProductId === productId;
      });
      
      productBOM.forEach((bom: any) => {
        const materialId = (bom.material_id || '').toString().trim();
        const material = materials.find((m: any) => 
          ((m.material_id || m.kode || '').toString().trim()) === materialId
        );
        
        const requiredQty = (item.qty || 0) * (bom.ratio || 1);
        
        if (aggregatedBOM[materialId]) {
          aggregatedBOM[materialId].requiredQty += requiredQty;
        } else {
          aggregatedBOM[materialId] = {
            materialId: materialId,
            materialName: material?.nama || materialId,
            unit: material?.satuan || 'PCS',
            requiredQty: requiredQty,
            ratio: bom.ratio || 1,
          };
        }
      });
    });
    
    setBomItems(Object.values(aggregatedBOM));
    
    // Check stock untuk setiap material
    const stockMap: { [key: string]: number } = {};
    Object.values(aggregatedBOM).forEach((item: any) => {
      const invMaterial = inventory.find((inv: any) => 
        (inv.codeItem || '').toString().trim() === item.materialId.toString().trim()
      );
      stockMap[item.materialId] = invMaterial 
        ? (invMaterial.stockPremonth || 0) + (invMaterial.receive || 0) - (invMaterial.outgoing || 0) + (invMaterial.return || 0)
        : 0;
    });
    setMaterialStock(stockMap);
  }, [so, bomData, materials, inventory]);

  const handleUpdateBOMQty = (materialId: string, newQty: number) => {
    setBomItems(bomItems.map(item => 
      item.materialId === materialId 
        ? { ...item, requiredQty: Math.max(0, newQty) }
        : item
    ));
  };

  // Handle edit BOM untuk product tertentu (sama seperti di SPK card)
  const handleEditBOMProduct = (productItem: any) => {
    const productId = (productItem.productId || productItem.productKode || '').toString().trim();
    const productName = productItem.productName || '';
    const productKode = productItem.productKode || productItem.productId || '';
    
    if (!productId) {
      showAlert('Product ID tidak ditemukan.', 'Information');
      return;
    }
    
    setEditingBOM({
      productId,
      productName,
      productKode,
      soNo: so.soNo,
    });
  };

  // Handle save BOM untuk product tertentu (sama seperti di SPK card)
  const handleSaveBOMProduct = async (bomItems: any[]) => {
    if (!editingBOM) return;

    try {
      const { storageService, extractStorageValue } = await import('../../services/storage');
      
      // Load existing BOM
      const existingBOM = extractStorageValue(await storageService.get<any[]>('bom'));
      const productId = (editingBOM.productId || editingBOM.productKode || '').toString().trim();

      if (!productId) {
        showAlert('Product ID tidak ditemukan. Tidak bisa menyimpan BOM.', 'Error');
        setEditingBOM(null);
        return;
      }

      // Remove old BOM items for this product (hapus semua yang product_id sama)
      const filteredBOM = existingBOM.filter(b => {
        const bomProductId = (b.product_id || b.kode || '').toString().trim();
        return bomProductId !== productId;
      });

      // Add new BOM items - format sesuai sheet: product_id, material_id, ratio
      // Jangan duplicate material_id di BOM yang sama
      const materialIdSet = new Set<string>();
      const newBOMItems = bomItems
        .filter(item => {
          const materialId = (item.material_id || '').toString().trim();
          if (!materialId) return false;
          if (materialIdSet.has(materialId)) {
            // Skip duplicate material_id
            return false;
          }
          materialIdSet.add(materialId);
          return true;
        })
        .map(item => ({
          id: item.id || `bom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          product_id: productId,
          material_id: item.material_id,
          ratio: item.ratio || 1,
          created: item.id ? undefined : new Date().toISOString(),
        }));

      // Save to storage
      const updatedBOM = [...filteredBOM, ...newBOMItems];
      await storageService.set('bom', updatedBOM);

      // Broadcast event untuk sync ke Master Products dan module lain
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bomUpdated', { 
          detail: { productId, bomItems: newBOMItems, source: 'PPIC' } 
        }));
      }

      showAlert(`BOM berhasil disimpan untuk Product: ${editingBOM.productName} (${editingBOM.productKode})\n\n(${newBOMItems.length} material)`, 'Success');
      setEditingBOM(null);
      
      // Reload data jika ada callback - ini akan trigger reload bomData di parent
      if (onBOMUpdated) {
        onBOMUpdated();
      }
      
      // Trigger reload BOM di dialog ini juga dengan memanggil useEffect dependency
      // Tapi karena bomData adalah prop, kita perlu reload dari parent
      // Jadi cukup dengan callback onBOMUpdated saja
    } catch (error: any) {
      showAlert(`Error saving BOM: ${error.message}`, 'Error');
    }
  };

  const handleCreateSPKAndSchedule = async () => {
    if (!startDate || !endDate) {
      showAlert('Harap isi tanggal mulai dan selesai produksi', 'Warning');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      showAlert('Tanggal mulai tidak boleh lebih besar dari tanggal selesai', 'Warning');
      return;
    }
    
    // Defensive check: pastikan so dan so.items ada
    if (!so) {
      showAlert('Error: Sales Order data tidak ditemukan', 'Error');
      console.error('[PPIC] handleCreateSPKAndSchedule: so is null/undefined');
      return;
    }
    
    if (!so.items || !Array.isArray(so.items) || so.items.length === 0) {
      showAlert('Error: Sales Order tidak memiliki items', 'Error');
      console.error('[PPIC] handleCreateSPKAndSchedule: so.items is empty or invalid', so);
      return;
    }
    
    try {
      const { storageService } = await import('../../services/storage');
      
      const newSPKs: any[] = [];
      
      for (const item of so.items) {
        // Skip jika product sudah voided
        if (!item || (item as any).voided) continue;
        
        const currentSPKs = await storageService.get<any[]>('spk') || [];
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);
      
      // Generate random alphanumeric code (5 chars)
      const generateRandomCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 5; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };
      
      // Ensure unique SPK number
      let spkNo = '';
      let isUnique = false;
      while (!isUnique) {
        const randomCode = generateRandomCode();
        spkNo = `SPK/${year}${month}${day}/${randomCode}`;
        isUnique = ![...currentSPKs, ...newSPKs].some(s => s.spkNo === spkNo);
      }
        // Defensive check: pastikan field yang diperlukan ada
        if (!item.productName && !item.productId && !item.productKode) {
          console.warn('[PPIC] Skipping item without product info:', item);
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
          qty: Number(item.qty) || 0,
          unit: item.unit || 'PCS',
          status: 'OPEN',
          created: new Date().toISOString(),
          notes: item.specNote || so.globalSpecNote || '',
        };
        newSPKs.push(newSPK);
      }
      
      if (newSPKs.length === 0) {
        showAlert(`Tidak ada product yang bisa dibuat SPK untuk SO ${so.soNo}.`, 'Warning');
        return;
      }
      
      // Save SPKs
      const currentSPKs = await storageService.get<any[]>('spk') || [];
      const updatedSPKs = [...currentSPKs, ...newSPKs];
      await storageService.set('spk', updatedSPKs);
      
      // ENHANCED: Reserve materials for each SPK
      const bomList = await storageService.get<any[]>('bom') || [];
      const materialsList = await storageService.get<any[]>('materials') || [];
      
      const normalizeKey = (value: any) => (value ?? '').toString().trim().toLowerCase();
      const toNumber = (value: any) => {
        if (typeof value === 'number' && !Number.isNaN(value)) return value;
        const parsed = parseFloat(value);
        return Number.isNaN(parsed) ? 0 : parsed;
      };
      
      // Build product BOM map
      const productBomMap: Record<string, any[]> = {};
      bomList.forEach((bom: any) => {
        const key = normalizeKey(bom.product_id || bom.kode);
        if (!key) return;
        if (!productBomMap[key]) {
          productBomMap[key] = [];
        }
        productBomMap[key].push(bom);
      });
      
      // Reserve materials for each SPK
      const reservationResults: any[] = [];
      for (const spk of newSPKs) {
        const productKey = normalizeKey(spk.product_id || spk.kode);
        const spkQty = toNumber(spk.qty);
        
        if (!productKey || spkQty <= 0) {
          console.warn(`[PPIC] Skipping material reservation for SPK ${spk.spkNo}: Invalid product or qty`);
          continue;
        }
        
        const bomForProduct = productBomMap[productKey] || [];
        if (bomForProduct.length === 0) {
          console.warn(`[PPIC] No BOM found for product ${productKey} in SPK ${spk.spkNo}`);
          continue;
        }
        
        // Calculate material requirements
        const materialRequirements: any[] = [];
        bomForProduct.forEach((bom: any) => {
          const materialKey = normalizeKey(bom.material_id || bom.kode || bom.materialId);
          if (!materialKey) return;
          
          const ratio = toNumber(bom.ratio || 1) || 1;
          const requiredQty = Math.max(Math.ceil(spkQty * ratio), 0);
          if (requiredQty === 0) return;
          
          // Find material name
          const material = materialsList.find((m: any) => 
            normalizeKey(m.material_id || m.kode) === materialKey
          );
          
          materialRequirements.push({
            id: materialKey,
            nama: material?.name || material?.material_name || bom.material_name || materialKey,
            qty: requiredQty,
            unit: material?.unit || bom.unit || 'PCS',
          });
        });
        
        if (materialRequirements.length > 0) {
          try {
            const reservation = await materialAllocator.reserveMaterials(spk.spkNo, materialRequirements);
            reservationResults.push({
              spkNo: spk.spkNo,
              success: reservation.success,
              message: reservation.message,
              shortages: reservation.shortages,
            });
            
            if (reservation.success) {
              console.log(`✅ [PPIC] Materials reserved for SPK ${spk.spkNo}: ${materialRequirements.length} materials`);
            } else {
              console.warn(`⚠️ [PPIC] Material shortage for SPK ${spk.spkNo}:`, reservation.shortages);
            }
          } catch (error) {
            console.error(`❌ [PPIC] Error reserving materials for SPK ${spk.spkNo}:`, error);
            reservationResults.push({
              spkNo: spk.spkNo,
              success: false,
              message: `Error: ${error}`,
              shortages: [],
            });
          }
        }
      }
      
      // Check if any SPK has material shortages
      const spksWithShortages = reservationResults.filter(r => !r.success);
      if (spksWithShortages.length > 0) {
        const shortageDetails = spksWithShortages.map(r => 
          `${r.spkNo}: ${r.shortages.map((s: any) => s.materialName).join(', ')}`
        ).join('\n');
        
        console.warn(`⚠️ [PPIC] Material shortages detected for ${spksWithShortages.length} SPK(s):\n${shortageDetails}`);
        // Continue with SPK creation but notify about shortages
      }
      
      const successfulReservations = reservationResults.filter(r => r.success);
      console.log(`✅ [PPIC] Material reservations completed: ${successfulReservations.length}/${newSPKs.length} SPKs have materials reserved`);
      
      // Save schedules
      const currentSchedules = await storageService.get<any[]>('schedule') || [];
      const newSchedules = newSPKs.map((spk: any, idx: number) => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9) + idx,
        spkNo: spk.spkNo,
        soNo: spk.soNo,
        scheduleStartDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        scheduleEndDate: endDate ? new Date(endDate).toISOString() : new Date().toISOString(),
        batches: [],
        progress: 0,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      }));
      
      const updatedSchedules = [...currentSchedules, ...newSchedules];
      await storageService.set('schedule', updatedSchedules);
      
      // Create production notifications untuk setiap SPK yang dibuat
      const productionNotifications = await storageService.get<any[]>('productionNotifications') || [];
      const newNotifications = newSPKs.map((spk: any) => {
        const existingNotification = productionNotifications.find((n: any) => 
          n.spkNo === spk.spkNo && n.productId === (spk.product_id || spk.kode)
        );
        if (existingNotification) return null; // Skip jika sudah ada
        
        const schedule = newSchedules.find((s: any) => s.spkNo === spk.spkNo);
        return {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          type: 'PRODUCTION_SCHEDULE',
          spkNo: spk.spkNo,
          soNo: spk.soNo,
          customer: spk.customer || '',
          product: spk.product || '',
          productId: spk.product_id || spk.kode || '',
          qty: spk.qty || 0,
          scheduleStartDate: schedule?.scheduleStartDate || new Date().toISOString(),
          scheduleEndDate: schedule?.scheduleEndDate || new Date().toISOString(),
          batches: schedule?.batches || [],
          status: 'WAITING_MATERIAL',
          materialStatus: 'PENDING',
          created: new Date().toISOString(),
        };
      }).filter((n: any) => n !== null);

      if (newNotifications.length > 0) {
        await storageService.set('productionNotifications', [...productionNotifications, ...newNotifications]);
        console.log(`✅ Production notifications created: ${newNotifications.length} notifications for ${newSPKs.length} SPKs`);
      }
      
      showAlert(`SPK dan Schedule berhasil dibuat!\n\n${newSPKs.length} SPK telah dibuat.\n📦 Materials reserved: ${successfulReservations.length}/${newSPKs.length} SPKs\n📧 Notifications sent to Production - ${successfulReservations.length > 0 ? 'Materials ready for production' : 'Waiting for material receipt from Purchasing'}`, 'Success');
      onClose();
    } catch (error: any) {
      console.error('[PPIC] Error creating SPK and schedule:', error);
      console.error('[PPIC] Error stack:', error.stack);
      console.error('[PPIC] SO data:', so);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      showAlert(`Error creating SPK and schedule: ${errorMessage}\n\nSilakan coba lagi atau hubungi administrator.`, 'Error');
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1200px', width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
        <Card className="dialog-card">
          <h2>Detail Sales Order - {so.soNo}</h2>
          
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '20px', borderBottom: '2px solid var(--border-color)' }}>
            <button
              onClick={() => setActiveSection('detail')}
              style={{
                padding: '8px 16px',
                border: 'none',
                backgroundColor: activeSection === 'detail' ? 'var(--primary)' : 'transparent',
                color: theme === 'light' ? '#000' : (activeSection === 'detail' ? '#fff' : 'var(--text-primary)'),
                cursor: 'pointer',
                borderTopLeftRadius: '4px',
                borderTopRightRadius: '4px',
              }}
            >
              Detail SO
            </button>
            <button
              onClick={() => setActiveSection('schedule')}
              style={{
                padding: '8px 16px',
                border: 'none',
                backgroundColor: activeSection === 'schedule' ? 'var(--primary)' : 'transparent',
                color: theme === 'light' ? '#000' : (activeSection === 'schedule' ? '#fff' : 'var(--text-primary)'),
                cursor: 'pointer',
                borderTopLeftRadius: '4px',
                borderTopRightRadius: '4px',
              }}
            >
              Schedule & BOM
            </button>
          </div>
          
          <div style={{ marginTop: '20px' }}>
            {activeSection === 'detail' && (
              <>
                {/* SO Info */}
                <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                    <div>
                      <strong>SO No:</strong> <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>{so.soNo}</span>
                    </div>
                    <div>
                      <strong>Customer:</strong> <span style={{ color: 'var(--text-primary)' }}>{so.customer}</span>
                    </div>
                    <div>
                      <strong>Customer Kode:</strong> {so.customerKode || '-'}
                    </div>
                    <div>
                      <strong>Status:</strong> <span className={`status-badge status-${(so.status || '').toLowerCase()}`}>{so.status}</span>
                    </div>
                    <div>
                      <strong>Payment Terms:</strong> {so.paymentTerms || '-'}
                      {so.paymentTerms === 'TOP' && so.topDays && ` (${so.topDays} days)`}
                    </div>
                    <div>
                      <strong>Created:</strong> {so.created ? new Date(so.created).toLocaleString('id-ID') : '-'}
                    </div>
                    {so.confirmedAt && (
                      <div>
                        <strong>Confirmed At:</strong> {new Date(so.confirmedAt).toLocaleString('id-ID')}
                      </div>
                    )}
                    {so.confirmedBy && (
                      <div>
                        <strong>Confirmed By:</strong> {so.confirmedBy}
                      </div>
                    )}
                  </div>
                  {so.globalSpecNote && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                      <strong>Global Spec Note:</strong>
                      <div style={{ marginTop: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {so.globalSpecNote}
                      </div>
                    </div>
                  )}
                </div>

                {/* Products List */}
                <h3 style={{ marginBottom: '12px' }}>Products ({so.items?.length || 0}):</h3>
                <div style={{ marginBottom: '20px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Product</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>QT</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Harga Satuan</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Total Harga</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {so.items?.map((item: any, idx: number) => (
                        <tr key={item.id || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px' }}>
                            <div style={{ fontWeight: 'bold' }}>{item.productName}</div>
                            {item.productKode && (
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                ({item.productKode})
                              </div>
                            )}
                            {item.specNote && (
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>
                                Note: {item.specNote}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            <strong>{item.qty} {item.unit || 'PCS'}</strong>
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>
                            Rp {Math.ceil((item.total || 0) / (item.qty || 1) || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>
                            <strong style={{ color: '#2e7d32' }}>
                              Rp {Math.ceil(item.total || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                            </strong>
                          </td>
                          <td style={{ padding: '10px' }}>
                            {(item as any).voided ? (
                              <span style={{ color: 'var(--error)', fontSize: '11px', fontStyle: 'italic' }}>VOIDED</span>
                            ) : (
                              <span style={{ color: 'var(--success)', fontSize: '11px' }}>ACTIVE</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: 'var(--bg-secondary)', fontWeight: 'bold' }}>
                        <td colSpan={3} style={{ padding: '10px', textAlign: 'right' }}>Grand Total:</td>
                        <td style={{ padding: '10px', textAlign: 'right', color: '#2e7d32', fontSize: '15px' }}>
                          Rp {Math.ceil((so.items || []).reduce((sum: number, item: any) => sum + (item.total || 0), 0)).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}

            {activeSection === 'schedule' && (
              <>
                {/* Schedule Input */}
                <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                      Mulai Produksi *
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                      Selesai Produksi *
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                </div>

                {/* Product BOM Information - Gabungkan Product dengan BOM Materials */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: '600' }}>📋 Product & BOM Materials:</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {so.items?.filter((item: any) => !(item as any).voided).map((productItem: any, productIdx: number) => {
                      const productId = (productItem.productId || productItem.productKode || '').toString().trim();
                      const productBOM = bomData.filter((b: any) => {
                        const bomProductId = (b.product_id || b.kode || '').toString().trim();
                        return bomProductId === productId && bomProductId !== '';
                      });
                      
                      // Hitung kebutuhan material untuk product ini
                      const productQty = parseFloat(productItem.qty || '0') || 0;
                      const productBomMaterials: Array<{ materialId: string; materialName: string; requiredQty: number; unit: string; ratio: number }> = [];
                      
                      if (productBOM.length > 0 && productQty > 0) {
                        const bomMap = new Map<string, { materialId: string; materialName: string; requiredQty: number; unit: string; ratio: number }>();
                        productBOM.forEach((bom: any) => {
                          const materialId = (bom.material_id || '').toString().trim();
                          if (!materialId) return;
                          
                          const material = materials.find((m: any) => 
                            ((m.material_id || m.kode || '').toString().trim()) === materialId
                          );
                          const requiredQty = productQty * (bom.ratio || 1);
                          
                          if (bomMap.has(materialId)) {
                            bomMap.get(materialId)!.requiredQty += requiredQty;
                          } else {
                            bomMap.set(materialId, {
                              materialId,
                              materialName: material?.nama || materialId,
                              requiredQty,
                              unit: material?.satuan || material?.unit || 'PCS',
                              ratio: bom.ratio || 1,
                            });
                          }
                        });
                        productBomMaterials.push(...Array.from(bomMap.values()));
                      }
                      
                      return (
                        <div key={productItem.id || productIdx} style={{ 
                          padding: '16px', 
                          backgroundColor: 'var(--bg-secondary)', 
                          borderRadius: '8px', 
                          border: '1px solid var(--border-color)' 
                        }}>
                          {/* Product Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                                {productItem.productName}
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                Kode: {productItem.productKode || productItem.productId || '-'}
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)' }}>
                                Qty: {productItem.qty} {productItem.unit || 'PCS'}
                              </div>
                            </div>
                            <Button
                              variant="secondary"
                              onClick={() => handleEditBOMProduct(productItem)}
                              style={{ fontSize: '12px', padding: '6px 12px' }}
                            >
                              ✏️ Edit BOM Master
                            </Button>
                          </div>
                          
                          {/* BOM Materials untuk Product ini */}
                          {productBomMaterials.length > 0 ? (
                            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                              <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                BOM Materials ({productBomMaterials.length}):
                              </div>
                              <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                  <thead>
                                    <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                                      <th style={{ padding: '8px', textAlign: 'left' }}>Material</th>
                                      <th style={{ padding: '8px', textAlign: 'right' }}>Ratio</th>
                                      <th style={{ padding: '8px', textAlign: 'right' }}>Required Qty</th>
                                      <th style={{ padding: '8px', textAlign: 'left' }}>Unit</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {productBomMaterials.map((mat: any, matIdx: number) => {
                                      const stock = materialStock[mat.materialId] || 0;
                                      const shortage = Math.max(0, mat.requiredQty - stock);
                                      const isShortage = shortage > 0;
                                      
                                      return (
                                        <tr key={mat.materialId || matIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                          <td style={{ padding: '8px' }}>
                                            <div style={{ fontWeight: '500' }}>{mat.materialName}</div>
                                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>({mat.materialId})</div>
                                          </td>
                                          <td style={{ padding: '8px', textAlign: 'right' }}>
                                            {mat.ratio}
                                          </td>
                                          <td style={{ padding: '8px', textAlign: 'right' }}>
                                            <span style={{ fontWeight: '600', color: isShortage ? 'var(--error)' : 'var(--text-primary)' }}>
                                              {Math.ceil(mat.requiredQty)}
                                            </span>
                                            {isShortage && (
                                              <div style={{ fontSize: '10px', color: 'var(--error)' }}>
                                                Stock: {Math.ceil(stock)} (Kurang: {Math.ceil(shortage)})
                                              </div>
                                            )}
                                          </td>
                                          <td style={{ padding: '8px' }}>{mat.unit}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : (
                            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                              ⚠️ Belum ada BOM untuk product ini. Klik "Edit BOM Master" untuk menambahkan BOM.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '12px', padding: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                    💡 Klik tombol "Edit BOM Master" untuk mengedit BOM master. Perubahan akan tersimpan ke master BOM dan mempengaruhi semua SPK yang menggunakan product tersebut.
                  </div>
                </div>
              </>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
              {activeSection === 'schedule' && (
                <Button variant="primary" onClick={handleCreateSPKAndSchedule}>
                  Create SPK & Schedule
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
      
      {/* BOM Dialog untuk edit BOM product */}
      {editingBOM && (
        <BOMDialog
          productId={editingBOM.productId || editingBOM.productKode || ''}
          productName={editingBOM.productName || 'Product'}
          productKode={editingBOM.productKode || editingBOM.productId || ''}
          onClose={() => setEditingBOM(null)}
          onSave={handleSaveBOMProduct}
        />
      )}

      {/* Custom Dialog */}
      {dialogState.show && (() => {
        const titleLower = dialogState.title.toLowerCase();
        let iconType = 'info';
        let iconChar = 'ℹ️';
        if (titleLower.includes('success') || titleLower.includes('berhasil')) {
          iconType = 'success';
          iconChar = '✓';
        } else if (titleLower.includes('error') || titleLower.includes('gagal') || titleLower.includes('cannot')) {
          iconType = 'error';
          iconChar = '✕';
        } else if (titleLower.includes('warning') || titleLower.includes('peringatan') || titleLower.includes('validation')) {
          iconType = 'warning';
          iconChar = '⚠';
        }
        
        return (
          <div className="dialog-overlay" onClick={dialogState.type === 'showAlert' ? closeDialog : undefined}>
            <div className="dialog-card" onClick={(e) => e.stopPropagation()}>
              <div className={`dialog-icon ${iconType}`}>
                {iconChar}
              </div>
              <h3 className="dialog-title">
                {dialogState.title}
              </h3>
              <div className="dialog-message">
                {dialogState.message}
              </div>
              <div className="dialog-actions">
                <Button variant="primary" onClick={closeDialog}>
                  OK
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// Schedule & BOM Review Dialog Component
const ScheduleBOMDialog = ({ spks, bomData, materials, inventory, onClose, onSave }: any) => {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [bomItems, setBomItems] = useState<any[]>([]);
  const [materialStock, setMaterialStock] = useState<{ [key: string]: number }>({});
  
  // Custom Dialog state
  const [dialogState, setDialogState] = useState<{
    show: boolean;
    type: 'showAlert' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    show: false,
    type: 'showAlert',
    title: '',
    message: '',
  });
  
  const showAlert = (message: string, title: string = 'Information') => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(true);
    }
    setDialogState({
      show: true,
      type: 'showAlert',
      title,
      message,
    });
  };
  
  const closeDialog = () => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(false);
    }
    setDialogState({
      show: false,
      type: 'showAlert',
      title: '',
      message: '',
    });
  };

  useEffect(() => {
    // Aggregate BOM dari semua SPK
    const aggregatedBOM: { [key: string]: any } = {};
    
    spks.forEach((spk: any) => {
      const productId = (spk.product_id || '').toString().trim();
      const productBOM = bomData.filter((b: any) => {
        const bomProductId = (b.product_id || b.kode || '').toString().trim();
        return bomProductId === productId;
      });
      
      productBOM.forEach((bom: any) => {
        const materialId = (bom.material_id || '').toString().trim();
        const material = materials.find((m: any) => 
          ((m.material_id || m.kode || '').toString().trim()) === materialId
        );
        
        const requiredQty = (spk.qty || 0) * (bom.ratio || 1);
        
        if (aggregatedBOM[materialId]) {
          aggregatedBOM[materialId].requiredQty += requiredQty;
        } else {
          aggregatedBOM[materialId] = {
            materialId: materialId,
            materialName: material?.nama || materialId,
            unit: material?.satuan || 'PCS',
            requiredQty: requiredQty,
            ratio: bom.ratio || 1,
          };
        }
      });
    });
    
    setBomItems(Object.values(aggregatedBOM));
    
    // Check stock untuk setiap material
    const stockMap: { [key: string]: number } = {};
    Object.values(aggregatedBOM).forEach((item: any) => {
      const invMaterial = inventory.find((inv: any) => 
        (inv.codeItem || '').toString().trim() === item.materialId.toString().trim()
      );
      stockMap[item.materialId] = invMaterial 
        ? (invMaterial.stockPremonth || 0) + (invMaterial.receive || 0) - (invMaterial.outgoing || 0) + (invMaterial.return || 0)
        : 0;
    });
    setMaterialStock(stockMap);
  }, [spks, bomData, materials, inventory]);

  const handleUpdateBOMQty = (materialId: string, newQty: number) => {
    setBomItems(bomItems.map(item => 
      item.materialId === materialId 
        ? { ...item, requiredQty: Math.max(0, newQty) }
        : item
    ));
  };

  const handleSave = () => {
    if (!startDate || !endDate) {
      showAlert('Harap isi tanggal mulai dan selesai produksi', 'Warning');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      showAlert('Tanggal mulai tidak boleh lebih besar dari tanggal selesai', 'Warning');
      return;
    }
    
    onSave({ startDate, endDate }, bomItems);
  };

  const handleCreatePRForShortage = async () => {
    const { storageService } = await import('../../services/storage');
    
    const shortageMaterials = bomItems.filter((item: any) => {
      const stock = materialStock[item.materialId] || 0;
      return stock < item.requiredQty;
    });
    
    if (shortageMaterials.length === 0) {
      showAlert('Semua material sudah cukup stok.', 'Information');
      return;
    }
    
    // Create PR for each SPK
    for (const spk of spks) {
      const prItems: any[] = [];
      
      shortageMaterials.forEach((item: any) => {
        const stock = materialStock[item.materialId] || 0;
        const shortageQty = item.requiredQty - stock;
        const material = materials.find((m: any) => 
          ((m.material_id || m.kode || '').toString().trim()) === item.materialId
        );
        
        if (shortageQty > 0) {
          // Pastikan harga selalu diambil dari master material
          const materialPrice = material?.priceMtr || 
                               material?.harga || 
                               (material as any)?.hargaSales || 
                               0;
          
          prItems.push({
            materialId: item.materialId,
            materialName: item.materialName,
            materialKode: material?.material_id || material?.kode || item.materialId,
            supplier: material?.supplier || '',
            qty: shortageQty,
            unit: item.unit,
            price: Math.ceil(materialPrice), // Pastikan harga selalu ada
            requiredQty: item.requiredQty,
            availableStock: stock,
            shortageQty: shortageQty,
          });
        }
      });
      
      if (prItems.length > 0) {
        const currentPR = extractStorageValue(await storageService.get<any[]>('purchaseRequests'));
        // Generate random PR number
        const now = new Date();
        const year = String(now.getFullYear()).slice(-2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const randomCode = Math.random().toString(36).substr(2, 5).toUpperCase();
        const prNo = `PR-${year}${month}${day}-${randomCode}`;
        
        const prData = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          prNo: prNo,
          spkNo: spk.spkNo,
          soNo: spk.soNo,
          customer: spk.customer,
          product: spk.product,
          items: prItems,
          status: 'PENDING',
          created: new Date().toISOString(),
          createdBy: 'PPIC',
        };
        
        await storageService.set('purchaseRequests', [...currentPR, prData]);
      }
    }
    
    showAlert(`Purchase Request berhasil dibuat untuk material yang kurang!\n\n${shortageMaterials.length} material memerlukan pembelian.`, 'Success');
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1200px', width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
        <Card className="dialog-card">
          <h2>Schedule & BOM Review</h2>
          
          <div style={{ marginTop: '20px' }}>
            {/* SPK Info */}
            <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
              <strong>SPK yang akan dibuat ({spks.length}):</strong>
              <div style={{ marginTop: '8px', fontSize: '13px' }}>
                {spks.map((spk: any) => (
                  <div key={spk.id}>• {spk.spkNo} - {spk.product} ({spk.qty} {spk.unit})</div>
                ))}
              </div>
            </div>

            {/* Schedule Input - Horizontal Layout */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                  Schedule *
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      flex: '1',
                      padding: '8px 12px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>-</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                      flex: '1',
                      padding: '8px 12px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* BOM Materials - Horizontal Layout */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>📦 Materials Used (BOM):</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {bomItems.map((item: any, idx: number) => {
                  const stock = materialStock[item.materialId] || 0;
                  const shortage = Math.max(0, item.requiredQty - stock);
                  const isShortage = shortage > 0;
                  
                  return (
                    <div key={item.materialId || idx} style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 10px',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '6px',
                      border: `1px solid ${isShortage ? 'var(--error)' : 'var(--border-color)'}`,
                      fontSize: '12px',
                      flex: '0 1 auto',
                      minWidth: 'fit-content'
                    }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                        {item.materialName}
                      </span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                        Required: {item.requiredQty}
                      </span>
                      <span style={{ color: stock > 0 ? 'var(--success)' : 'var(--text-secondary)', fontSize: '11px' }}>
                        Stock: {Math.ceil(stock)}
                      </span>
                      {isShortage && (
                        <span style={{ color: 'var(--error)', fontSize: '11px', fontWeight: 'bold' }}>
                          Shortage: {Math.ceil(shortage)} {item.unit}
                        </span>
                      )}
                      <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                        {item.unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              {bomItems.some((item: any) => {
                const stock = materialStock[item.materialId] || 0;
                return stock < item.requiredQty;
              }) && (
                <Button variant="secondary" onClick={handleCreatePRForShortage} style={{ backgroundColor: '#ff9800', color: '#fff' }}>
                  Create PR untuk Material Kurang
                </Button>
              )}
              <Button variant="primary" onClick={handleSave}>
                Save Schedule & SPK
              </Button>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Custom Dialog */}
      {dialogState.show && (
        <div className="dialog-overlay" onClick={closeDialog} style={{ zIndex: 10001 }}>
          <div className="dialog-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                {dialogState.title}
              </h3>
            </div>
            <div style={{ marginBottom: '24px', fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
              {dialogState.message}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button variant="primary" onClick={closeDialog}>
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Create PTP Dialog Component
const CreatePTPDialog = ({ customers, products, onClose, onSave }: any) => {
  interface PTPItem {
    id: string;
    productItem: string;
    qty: number;
    unit: string;
    price: number;
    total: number;
    reason?: string;
  }

  const [formData, setFormData] = useState({
    requestNo: '',
    customer: '',
    items: [] as PTPItem[],
    reason: '',
    requestDate: new Date().toISOString().split('T')[0],
  });
  
  // Product search dialog state
  const [showProductDialog, setShowProductDialog] = useState<number | null>(null);
  const [productDialogSearch, setProductDialogSearch] = useState('');
  const [productInputValue, setProductInputValue] = useState<{ [key: number]: string }>({});
  
  // Customer search dialog state
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [customerDialogSearch, setCustomerDialogSearch] = useState('');
  const [customerInputValue, setCustomerInputValue] = useState('');
  
  // Custom Dialog state
  const [dialogState, setDialogState] = useState<{
    show: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    show: false,
    type: 'alert',
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
  
  const closeDialog = () => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(false);
    }
    setDialogState({
      show: false,
      type: 'alert',
      title: '',
      message: '',
    });
  };

  // Add item
  const handleAddItem = () => {
    const newItem: PTPItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      productItem: '',
      qty: 0,
      unit: 'PCS',
      price: 0,
      total: 0,
      reason: '',
    };
    setFormData({ ...formData, items: [...formData.items, newItem] });
  };

  // Filtered products for dialog with limit for performance
  const filteredProductsForDialog = useMemo(() => {
    // CRITICAL: Ensure products is always an array
    const productsArray = Array.isArray(products) ? products : [];
    
    let filtered = productsArray;
    if (productDialogSearch) {
      const query = productDialogSearch.toLowerCase();
      
      filtered = productsArray.filter(p => {
        if (!p) return false;
        const code = (p.kode || p.product_id || '').toLowerCase();
        const name = (p.nama || '').toLowerCase();
        const customer = (p.customer || '').toLowerCase();
        const label = `${code}${code ? ' - ' : ''}${name}`.toLowerCase();
        
        const codeMatch = code.includes(query);
        const nameMatch = name.includes(query);
        const customerMatch = customer.includes(query);
        const labelMatch = label.includes(query);
        const matches = codeMatch || nameMatch || customerMatch || labelMatch;
        
        return matches;
      });
    }
    
    // Limit to 200 items for performance (user can search to narrow down)
    const limited = filtered.slice(0, 200);
    
    return limited;
  }, [productDialogSearch, products]);

  // Filtered customers for dialog with limit for performance
  const filteredCustomersForDialog = useMemo(() => {
    // CRITICAL: Ensure customers is always an array
    const customersArray = Array.isArray(customers) ? customers : [];
    
    let filtered = customersArray;
    if (customerDialogSearch) {
      const query = customerDialogSearch.toLowerCase();
      filtered = customersArray.filter(c => {
        if (!c) return false;
        const code = (c.kode || '').toLowerCase();
        const name = (c.nama || '').toLowerCase();
        return code.includes(query) || name.includes(query);
      });
    }
    
    // Limit to 200 items for performance
    return filtered.slice(0, 200);
  }, [customerDialogSearch, customers]);

  const getCustomerInputDisplayValue = () => {
    if (customerInputValue) {
      return customerInputValue;
    }
    if (formData.customer) {
      const customer = customers.find((c: any) => c.nama === formData.customer);
      if (customer) {
        return `${customer.kode || ''} - ${customer.nama}`;
      }
      return formData.customer;
    }
    return '';
  };

  const getProductInputDisplayValue = (index: number, item?: PTPItem) => {
    if (productInputValue[index] !== undefined) {
      return productInputValue[index];
    }
    if (item?.productItem) {
      const product = products.find((p: any) => p.nama === item.productItem || p.kode === item.productItem);
      if (product) {
        return `${product.kode || product.product_id} - ${product.nama}`;
      }
      return item.productItem;
    }
    return '';
  };

  // Handle qty input change - auto-replace 0 when user types
  const handleQtyChange = (itemId: string, value: string) => {
    // If current value is "0" and user types a number, replace it
    const currentItem = formData.items.find(item => item.id === itemId);
    if (currentItem && currentItem.qty === 0 && value.length === 1 && /^\d$/.test(value)) {
      // User is typing first digit, replace 0 with the new digit
      handleUpdateItem(itemId, 'qty', parseFloat(value) || 0);
    } else {
      // Normal update
      handleUpdateItem(itemId, 'qty', parseFloat(value) || 0);
    }
  };

  // Remove item
  const handleRemoveItem = (itemId: string) => {
    setFormData({ ...formData, items: formData.items.filter(item => item.id !== itemId) });
  };

  // Update item
  const handleUpdateItem = (itemId: string, field: keyof PTPItem, value: any) => {
    setFormData({
      ...formData,
      items: formData.items.map(item => {
        if (item.id === itemId) {
          const updated = { ...item, [field]: value };
          // Auto-calculate total when qty or price changes
          if (field === 'qty' || field === 'price') {
            updated.total = (updated.qty || 0) * (updated.price || 0);
          }
          // Auto-fill price from product when product is selected
          if (field === 'productItem' && value) {
            const selectedProduct = products.find((p: any) => 
              (p.nama || '') === value || (p.kode || '') === value
            );
            if (selectedProduct) {
              const hargaFromMaster = selectedProduct.hargaSales || selectedProduct.hargaFg || (selectedProduct as any).harga || 0;
              updated.price = Number(hargaFromMaster) || 0;
              updated.total = (updated.qty || 0) * updated.price;
            }
          }
          return updated;
        }
        return item;
      }),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer) {
      showAlert('Harap pilih customer', 'Warning');
      return;
    }
    if (!formData.items || formData.items.length === 0) {
      showAlert('Harap tambahkan minimal 1 product', 'Warning');
      return;
    }
    // Validate all items
    for (const item of formData.items) {
      if (!item.productItem || !item.qty || item.qty <= 0) {
        showAlert('Harap lengkapi semua field product (product, qty)', 'Warning');
        return;
      }
      if (!item.price || item.price <= 0) {
        showAlert('Harap isi harga untuk semua product', 'Warning');
        return;
      }
      // Validate that product exists in master data
      const selectedProduct = products.find((p: any) => 
        (p.nama || '') === item.productItem ||
        (p.kode || '') === item.productItem
      );
      if (!selectedProduct) {
        showAlert(`Product "${item.productItem}" tidak ditemukan di master data. Harap pilih product dari dropdown.`, 'Error');
        return;
      }
    }
    onSave(formData);
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
        <Card className="dialog-card">
          <h2>Create PTP (Permintaan Tanpa PO)</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
            <Input
              label="Request No (Optional - Auto generated jika kosong)"
              value={formData.requestNo}
              onChange={(val) => setFormData({ ...formData, requestNo: val })}
              placeholder="PTP-2025-000001"
            />
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Customer *</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={getCustomerInputDisplayValue()}
                  placeholder="Click to select customer..."
                  readOnly
                  onClick={() => setShowCustomerDialog(true)}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                  required
                />
                <Button
                  variant="secondary"
                  onClick={() => setShowCustomerDialog(true)}
                  style={{ fontSize: '12px', padding: '8px 16px' }}
                >
                  Select
                </Button>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: 500 }}>Products *</label>
                <Button variant="secondary" onClick={handleAddItem} style={{ fontSize: '12px', padding: '6px 12px' }}>
                  + Add Product
                </Button>
              </div>
              
              {(!formData.items || formData.items.length === 0) ? (
                <p style={{ color: 'var(--text-secondary)', padding: '20px', textAlign: 'center', fontSize: '13px' }}>
                  No products added. Click "+ Add Product" to add items.
                </p>
              ) : (
                <div style={{ 
                  overflowX: 'auto',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                }}>
                  {formData.items.map((item, index) => (
                    <div 
                      key={item.id} 
                      style={{ 
                        padding: '12px', 
                        borderBottom: index < formData.items.length - 1 ? '1px solid var(--border-color)' : 'none',
                        backgroundColor: 'var(--bg-secondary)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '13px' }}>Product {index + 1}</strong>
                        <Button 
                          variant="secondary" 
                          onClick={() => handleRemoveItem(item.id)} 
                          style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#f44336', color: 'white' }}
                        >
                          Remove
                        </Button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 100px', gap: '8px', marginBottom: '8px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>Product *</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              value={getProductInputDisplayValue(index, item)}
                              placeholder="-- Pilih Product --"
                              readOnly
                              onClick={() => {
                                setProductDialogSearch('');
                                setShowProductDialog(index);
                              }}
                              style={{
                                flex: 1,
                                padding: '8px 10px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                backgroundColor: 'var(--bg-tertiary)',
                                color: 'var(--text-primary)',
                                fontSize: '13px',
                                cursor: 'pointer',
                              }}
                            />
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setProductDialogSearch('');
                                setShowProductDialog(index);
                              }}
                              style={{ fontSize: '12px', padding: '8px 16px' }}
                            >
                              🔍
                            </Button>
                          </div>
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>Qty *</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={item.qty === 0 ? '' : item.qty.toString()}
                            onChange={(e) => {
                              const value = e.target.value.trim();
                              // Allow empty string for better UX
                              if (value === '') {
                                handleUpdateItem(item.id, 'qty', 0);
                                return;
                              }
                              // Only allow numbers
                              if (/^\d+$/.test(value)) {
                                const numValue = parseFloat(value);
                                if (!isNaN(numValue) && numValue >= 0) {
                                  handleUpdateItem(item.id, 'qty', numValue);
                                }
                              }
                            }}
                            onKeyDown={(e) => {
                              // Allow: backspace, delete, tab, escape, enter, and numbers
                              if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
                                  // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                                  (e.keyCode === 65 && e.ctrlKey === true) ||
                                  (e.keyCode === 67 && e.ctrlKey === true) ||
                                  (e.keyCode === 86 && e.ctrlKey === true) ||
                                  (e.keyCode === 88 && e.ctrlKey === true) ||
                                  // Allow: home, end, left, right
                                  (e.keyCode >= 35 && e.keyCode <= 39)) {
                                return;
                              }
                              // Ensure that it is a number and stop the keypress
                              if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                                e.preventDefault();
                              }
                            }}
                            onBlur={(e) => {
                              // If empty on blur, set to 0
                              if (e.target.value === '' || e.target.value === '0') {
                                handleUpdateItem(item.id, 'qty', 0);
                              }
                            }}
                            placeholder="0"
                            style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '13px' }}
                            required
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>Unit</label>
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => handleUpdateItem(item.id, 'unit', e.target.value)}
                            placeholder="PCS"
                            style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '13px' }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>Price *</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.price === 0 ? '' : item.price.toString()}
                            onChange={(e) => {
                              const value = e.target.value.trim().replace(/[^\d.]/g, '');
                              // Allow empty string for better UX
                              if (value === '') {
                                handleUpdateItem(item.id, 'price', 0);
                                return;
                              }
                              // Allow numbers and decimal
                              if (/^\d*\.?\d*$/.test(value)) {
                                const numValue = parseFloat(value);
                                if (!isNaN(numValue) && numValue >= 0) {
                                  handleUpdateItem(item.id, 'price', numValue);
                                }
                              }
                            }}
                            onKeyDown={(e) => {
                              // Allow: backspace, delete, tab, escape, enter, numbers, and decimal point
                              if ([8, 9, 27, 13, 46, 110, 190].indexOf(e.keyCode) !== -1 ||
                                  // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                                  (e.keyCode === 65 && e.ctrlKey === true) ||
                                  (e.keyCode === 67 && e.ctrlKey === true) ||
                                  (e.keyCode === 86 && e.ctrlKey === true) ||
                                  (e.keyCode === 88 && e.ctrlKey === true) ||
                                  // Allow: home, end, left, right
                                  (e.keyCode >= 35 && e.keyCode <= 39)) {
                                return;
                              }
                              // Ensure that it is a number and stop the keypress
                              if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                                e.preventDefault();
                              }
                            }}
                            onBlur={(e) => {
                              // If empty on blur, set to 0
                              if (e.target.value === '' || e.target.value === '0') {
                                handleUpdateItem(item.id, 'price', 0);
                              }
                            }}
                            placeholder="0"
                            style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '13px' }}
                            required
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>Total</label>
                          <input
                            type="text"
                            value={`Rp ${(item.total || 0).toLocaleString('id-ID')}`}
                            readOnly
                            style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px', cursor: 'not-allowed' }}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>Reason (Optional)</label>
                        <input
                          type="text"
                          value={item.reason || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'reason', e.target.value)}
                          placeholder="Alasan untuk product ini..."
                          style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '13px' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Reason/Alasan *</label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Alasan permintaan tanpa PO..."
                rows={4}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                required
              />
            </div>
            <Input
              label="Request Date"
              type="date"
              value={formData.requestDate}
              onChange={(val) => setFormData({ ...formData, requestDate: val })}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button variant="primary" type="submit">Create PTP</Button>
          </div>
        </form>
        </Card>
      </div>
      
      {/* Product Selection Dialog */}
      {showProductDialog !== null && (
        <div className="dialog-overlay" onClick={() => {
          setShowProductDialog(null);
          setProductDialogSearch('');
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <Card
              title="Select Product"
              className="dialog-card"
            >
              <div style={{ marginBottom: '16px' }}>
                <input
                  type="text"
                  value={productDialogSearch}
                  onChange={(e) => setProductDialogSearch(e.target.value)}
                  placeholder="Search by product code or name..."
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
                {filteredProductsForDialog.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No products found
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-tertiary)', zIndex: 10 }}>
                      <tr>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid var(--border)' }}>Code</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid var(--border)' }}>Name</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid var(--border)' }}>Unit</th>
                        <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid var(--border)' }}>Price</th>
                        <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid var(--border)' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProductsForDialog.map(prod => {
                        const price = prod.hargaSales || prod.hargaFg || (prod as any).harga || 0;
                        const productId = (prod.kode || prod.product_id || '').toString().trim();
                        const handleSelect = () => {
                          if (showProductDialog !== null) {
                            const index = showProductDialog;
                            const itemId = formData.items[index]?.id;
                            if (itemId) {
                              // Update product selection
                              handleUpdateItem(itemId, 'productItem', prod.nama || prod.kode);
                              // Update price from master product
                              const hargaFromMaster = prod.hargaSales || prod.hargaFg || (prod as any).harga || 0;
                              handleUpdateItem(itemId, 'price', Number(hargaFromMaster) || 0);
                              // Update unit
                              handleUpdateItem(itemId, 'unit', prod.satuan || 'PCS');
                              // Update input display value
                              setProductInputValue(prev => ({
                                ...prev,
                                [index]: `${prod.kode || prod.product_id} - ${prod.nama}`
                              }));
                            }
                            setShowProductDialog(null);
                            setProductDialogSearch('');
                          }
                        };
                        return (
                          <tr
                            key={prod.id || productId}
                            style={{
                              borderBottom: '1px solid var(--border)',
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            onClick={handleSelect}
                          >
                            <td style={{ padding: '12px' }}>{prod.kode || prod.product_id || '-'}</td>
                            <td style={{ padding: '12px' }}>{prod.nama || '-'}</td>
                            <td style={{ padding: '12px' }}>{prod.satuan || 'PCS'}</td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>
                              {price > 0 ? new Intl.NumberFormat('id-ID', { 
                                style: 'currency', 
                                currency: 'IDR',
                                minimumFractionDigits: 0 
                              }).format(price) : '-'}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <Button
                                variant="primary"
                                onClick={() => handleSelect()}
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
                )}
              </div>
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Showing {filteredProductsForDialog.length} of {productDialogSearch ? products.filter((p: any) => {
                    const query = productDialogSearch.toLowerCase();
                    const code = (p.kode || p.product_id || '').toLowerCase();
                    const name = (p.nama || '').toLowerCase();
                    return code.includes(query) || name.includes(query);
                  }).length : products.length} product{filteredProductsForDialog.length !== 1 ? 's' : ''}
                  {filteredProductsForDialog.length >= 200 && (
                    <span style={{ color: '#ff9800', marginLeft: '8px' }}>
                      (Limited to 200. Use search to narrow down)
                    </span>
                  )}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowProductDialog(null);
                    setProductDialogSearch('');
                  }}
                >
                  Close
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
      
      {/* Customer Selection Dialog */}
      {showCustomerDialog && (
        <div className="dialog-overlay" onClick={() => {
          setShowCustomerDialog(false);
          setCustomerDialogSearch('');
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <Card>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Select Customer
                </h3>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <input
                  type="text"
                  value={customerDialogSearch}
                  onChange={(e) => setCustomerDialogSearch(e.target.value)}
                  placeholder="Search by customer code or name..."
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div style={{
                maxHeight: '400px',
                overflowY: 'auto',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
              }}>
                {filteredCustomersForDialog.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No customers found
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Code</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Name</th>
                        <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomersForDialog.map(c => {
                        const handleSelect = () => {
                          setFormData({ ...formData, customer: c.nama });
                          setCustomerInputValue(`${c.kode || ''} - ${c.nama}`);
                          setShowCustomerDialog(false);
                          setCustomerDialogSearch('');
                        };
                        return (
                          <tr 
                            key={c.id || c.kode} 
                            style={{ 
                              borderBottom: '1px solid var(--border-color)',
                              cursor: 'pointer'
                            }}
                            onClick={handleSelect}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <td style={{ padding: '12px' }}>{c.kode || '-'}</td>
                            <td style={{ padding: '12px' }}>{c.nama || '-'}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <Button
                                variant="primary"
                                onClick={handleSelect}
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
                )}
              </div>
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Showing {filteredCustomersForDialog.length} of {customerDialogSearch ? customers.filter((c: any) => {
                    const query = customerDialogSearch.toLowerCase();
                    const code = (c.kode || '').toLowerCase();
                    const name = (c.nama || '').toLowerCase();
                    return code.includes(query) || name.includes(query);
                  }).length : customers.length} customer{filteredCustomersForDialog.length !== 1 ? 's' : ''}
                  {filteredCustomersForDialog.length >= 200 && (
                    <span style={{ color: '#ff9800', marginLeft: '8px' }}>
                      (Limited to 200. Use search to narrow down)
                    </span>
                  )}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowCustomerDialog(false);
                    setCustomerDialogSearch('');
                  }}
                >
                  Close
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
      
      {/* Custom Dialog */}
      {dialogState.show && (
        <div className="dialog-overlay" onClick={closeDialog} style={{ zIndex: 10001 }}>
          <div className="dialog-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                {dialogState.title}
              </h3>
            </div>
            <div style={{ marginBottom: '24px', fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
              {dialogState.message}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button variant="primary" onClick={closeDialog}>
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Match SO Dialog Component
const MatchSODialog = ({ ptp, salesOrders, onClose, onCreateSO, onLinkSO }: any) => {
  const [mode, setMode] = useState<'create' | 'link'>('link');
  const [soNo, setSoNo] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('TOP');
  const [topDays, setTopDays] = useState('30');
  
  // Custom Dialog state
  const [dialogState, setDialogState] = useState<{
    show: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    show: false,
    type: 'alert',
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
  
  const closeDialog = () => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(false);
    }
    setDialogState({
      show: false,
      type: 'alert',
      title: '',
      message: '',
    });
  };

  const handleLink = () => {
    if (!soNo) {
      showAlert('Pilih SO terlebih dahulu', 'Warning');
      return;
    }
    onLinkSO(soNo);
  };

  const handleCreate = () => {
    if (!soNo) {
      showAlert('Masukkan SO No terlebih dahulu', 'Warning');
      return;
    }
    onCreateSO(soNo, paymentTerms, parseInt(topDays) || 30);
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
        <Card className="dialog-card">
          <h2>Match SO - PTP {ptp.requestNo}</h2>
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => setMode('link')}
              style={{
                padding: '8px 16px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                backgroundColor: mode === 'link' ? 'var(--primary)' : 'var(--bg-tertiary)',
                color: mode === 'link' ? 'white' : 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              Link Existing SO
            </button>
            <button
              type="button"
              onClick={() => setMode('create')}
              style={{
                padding: '8px 16px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                backgroundColor: mode === 'create' ? 'var(--primary)' : 'var(--bg-tertiary)',
                color: mode === 'create' ? 'white' : 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              Create New SO
            </button>
          </div>

          {mode === 'link' ? (
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Pilih SO</label>
              <select
                value={soNo}
                onChange={(e) => setSoNo(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              >
                <option value="">-- Pilih SO --</option>
                {salesOrders.filter((so: any) => so.customer === ptp.customer).map((so: any) => (
                  <option key={so.id} value={so.soNo}>{so.soNo} - {so.customer} ({so.status})</option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={handleLink}>Link SO</Button>
              </div>
            </div>
          ) : (
            <div>
              <Input
                label="SO No *"
                value={soNo}
                onChange={setSoNo}
                placeholder="SO-2025-000001"
              />
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Payment Terms</label>
                <select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  <option value="TOP">TOP</option>
                  <option value="COD">COD</option>
                  <option value="CBD">CBD</option>
                </select>
              </div>
              {paymentTerms === 'TOP' && (
                <Input
                  label="TOP Days"
                  type="number"
                  value={topDays}
                  onChange={setTopDays}
                  placeholder="30"
                />
              )}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={handleCreate}>Create & Link SO</Button>
              </div>
            </div>
          )}
          </div>
        </Card>
      </div>
      
      {/* Custom Dialog */}
      {dialogState.show && (
        <div className="dialog-overlay" onClick={closeDialog} style={{ zIndex: 10001 }}>
          <div className="dialog-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                {dialogState.title}
              </h3>
            </div>
            <div style={{ marginBottom: '24px', fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
              {dialogState.message}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button variant="primary" onClick={closeDialog}>
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PPIC;
