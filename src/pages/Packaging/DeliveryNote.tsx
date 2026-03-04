import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Input from '../../components/Input';
import DateRangeFilter from '../../components/DateRangeFilter';
import ScheduleTable from '../../components/ScheduleTable';
import NotificationBell from '../../components/NotificationBell';
import { storageService, extractStorageValue, StorageKeys } from '../../services/storage';
import { filterActiveItems } from '../../utils/data-persistence-helper';
import { deletePackagingItem, reloadPackagingData } from '../../utils/packaging-delete-helper';
import { generateSuratJalanHtml, generateSuratJalanRecapHtml } from '../../pdf/suratjalan-pdf-template';
import { generatePackagingRecapHtmlByTemplate, PACKAGING_RECAP_TEMPLATES } from '../../pdf/packaging-delivery-recap-templates';
import { openPrintWindow, isMobile, isCapacitor, savePdfForMobile } from '../../utils/actions';
import { TemplateSelectionDialog } from '../../components/TemplateSelectionDialog';
import { useDialog } from '../../hooks/useDialog';
import { useLanguage } from '../../hooks/useLanguage';
import { useBlobStorage } from '../../hooks/useBlobStorage';
import { loadLogoAsBase64 } from '../../utils/logo-loader';
import { PageSizeDialog, PageSize } from '../../components/PageSizeDialog';
import * as XLSX from 'xlsx';
import { createStyledWorksheet, setColumnWidths, ExcelColumn } from '../../utils/excel-helper';
import { logCreate, logUpdate, logDelete } from '../../utils/activity-logger';
import { loadProductsCache, getProductNameByCode, getProductByCode } from '../../utils/product-lookup-helper';
import '../../styles/common.css';
import '../../styles/compact.css';

interface DeliveryNoteItem {
  spkNo?: string;
  product: string;
  productCode?: string; // Product code/kode
  qty: number;
  unit?: string;
  soNo?: string; // SO number for this item (for multi-SO grouping)
  fromInventory?: boolean; // Flag: true jika product dipilih dari inventory, false jika manual input
  inventoryId?: string; // ID dari inventory item (untuk tracking)
}

interface DeliveryNote {
  id: string;
  sjNo?: string;
  soNo: string; // Single SO (for backward compatibility)
  soNos?: string[]; // Multiple SO numbers (for grouping multiple SOs from same customer)
  customer: string;
  product?: string; // Deprecated - use items instead
  qty?: number; // Deprecated - use items instead
  items?: DeliveryNoteItem[]; // Array of products for this delivery (required for new format)
  status: 'DRAFT' | 'OPEN' | 'CLOSE';
  // 🆕 BLOB STORAGE FIELDS (NEW)
  fileId?: string;           // File ID from blob storage
  fileName?: string;         // Original file name
  fileSize?: number;         // File size in bytes
  mimeType?: string;         // MIME type (application/pdf, image/jpeg, etc)
  uploadedAt?: string;       // ISO date string
  downloadUrl?: string;      // Download URL from server
  // 🔴 DEPRECATED - kept for backward compatibility
  signedDocument?: string; // Base64 (untuk image) atau file://path (untuk PDF yang disimpan sebagai file)
  signedDocumentPath?: string; // Path file untuk PDF yang disimpan di file system (hanya untuk PDF)
  serverSignedDocumentPath?: string; // Path file di server (setelah di-upload ke server)
  serverSignedDocumentName?: string; // Nama file di server
  signedDocumentType?: 'pdf' | 'image'; // Tipe file: pdf atau image
  signedDocumentName?: string;
  receivedDate?: string;
  driver?: string;
  vehicleNo?: string;
  spkNo?: string; // Deprecated - use items instead
  deliveryDate?: string; // Delivery date from schedule
  productCodeDisplay?: 'padCode' | 'productId'; // Pilihan untuk menampilkan Pad Code atau Product ID di template SJ (default: 'padCode')
  specNote?: string; // Keterangan untuk template Surat Jalan (akan muncul di bagian Keterangan)
  deleted?: boolean; // Tombstone flag for soft delete
  deletedAt?: string; // Timestamp when deleted
  // Timestamp fields untuk sync dan tracking
  created?: string; // ISO date string untuk creation timestamp
  lastUpdate?: string; // ISO date string untuk last update timestamp
  timestamp?: number; // Unix timestamp (milliseconds) untuk sync
  _timestamp?: number; // Backward compatibility timestamp
  // SJ Recap fields
  isRecap?: boolean; // Flag untuk menandai ini adalah SJ Recap
  poNos?: string[]; // Array of PO numbers untuk SJ Recap
  mergedSjNos?: string[]; // Array of SJ numbers yang di-merge menjadi SJ Recap ini
  // Processing flags
  processedOutgoing?: boolean; // Flag untuk menandai outgoing sudah di-set (prevent duplicate)
}

interface Customer {
  id: string;
  kode: string;
  nama: string;
  kontak?: string; // PIC Name
  telepon?: string;
  alamat?: string;
}

interface SalesOrder {
  id: string;
  soNo: string;
  customer: string;
  status: string;
  items?: Array<{
    itemSku?: string;
    qty?: string | number;
  }>;
  specNote?: string;
  globalSpecNote?: string;
}

// Delivery Action Menu component untuk dropdown 3 titik
const DeliveryActionMenu: React.FC<{
  item: DeliveryNote;
  onGenerateSJ?: () => void;
  onViewDetail?: () => void;
  onEditSJ?: () => void;
  onPrint?: () => void;
  onDelete?: () => void;
  onUploadSignedDoc?: () => void;
  onViewSignedDoc?: () => void;
  onDownloadSignedDoc?: () => void;
  onUpdateStatus?: () => void;
  fileInputRef?: React.RefObject<HTMLInputElement>;
}> = ({
  item,
  onGenerateSJ,
  onViewDetail,
  onEditSJ,
  onPrint,
  onDelete,
  onUploadSignedDoc,
  onViewSignedDoc,
  onDownloadSignedDoc,
  onUpdateStatus,
  fileInputRef,
}) => {
    const [showMenu, setShowMenu] = React.useState<boolean>(false);
    const [menuPosition, setMenuPosition] = React.useState<{ top: number; right: number }>({ top: 0, right: 0 });
    const menuRef = React.useRef<HTMLDivElement>(null);
    const buttonRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
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

    React.useEffect(() => {
      if (showMenu && buttonRef.current) {
        // Use requestAnimationFrame to ensure menu is rendered before calculating position
        requestAnimationFrame(() => {
          if (!buttonRef.current) return;
          const buttonRect = buttonRef.current.getBoundingClientRect();
          const menuHeight = 300; // Estimated menu height (more items in delivery menu)
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
              minWidth: '180px',
              padding: '4px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {!item.sjNo && onGenerateSJ && (
              <button
                onClick={() => { onGenerateSJ(); setShowMenu(false); }}
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
                ✨ Generate SJ
              </button>
            )}
            {item.sjNo && (
              <>
                {onViewDetail && (
                  <button
                    onClick={() => { onViewDetail(); setShowMenu(false); }}
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
                {onEditSJ && (
                  <button
                    onClick={() => { onEditSJ(); setShowMenu(false); }}
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
                {onPrint && (
                  <button
                    onClick={() => { onPrint(); setShowMenu(false); }}
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
                    🖨️ Print
                  </button>
                )}
                {item.status === 'OPEN' && !item.signedDocument && !item.signedDocumentPath && onUploadSignedDoc && (
                  <button
                    onClick={() => {
                      setShowMenu(false); // Tutup menu dulu
                      // Trigger file input hanya sekali
                      if (fileInputRef?.current) {
                        fileInputRef.current.click();
                      } else {
                        // Fallback: panggil callback dari parent jika ref tidak ada
                        onUploadSignedDoc();
                      }
                    }}
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
                    📎 Upload Signed Doc
                  </button>
                )}
                {(item.signedDocument || item.signedDocumentPath) && onViewSignedDoc && (
                  <button
                    onClick={() => { onViewSignedDoc(); setShowMenu(false); }}
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
                    📄 View Signed Doc
                  </button>
                )}
                {(item.signedDocument || item.signedDocumentPath) && onDownloadSignedDoc && (
                  <button
                    onClick={() => { onDownloadSignedDoc(); setShowMenu(false); }}
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
                    ⬇️ Download Signed Doc
                  </button>
                )}
                {onUpdateStatus && (
                  <button
                    onClick={() => { onUpdateStatus(); setShowMenu(false); }}
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
                    🔄 Update Status
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
                      color: '#f44336',
                      cursor: 'pointer',
                      fontSize: '11px',
                      borderRadius: '4px',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(244, 67, 54, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    🗑️ Delete
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </>
    );
  };

const DeliveryNote = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [deliveries, setDeliveries] = useState<DeliveryNote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'delivery' | 'schedule' | 'outstanding' | 'recap'>('delivery');
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [spkData, setSpkData] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showCreateDeliveryNoteDialog, setShowCreateDeliveryNoteDialog] = useState(false);
  const [initialDialogMode, setInitialDialogMode] = useState<'po' | 'so' | 'sj' | 'manual'>('po');
  const [initialSelectedSJs, setInitialSelectedSJs] = useState<string[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryNote | null>(null);
  const [showCreateSJRecapDialog, setShowCreateSJRecapDialog] = useState(false);
  const [viewPdfData, setViewPdfData] = useState<{ html: string; sjNo: string; sjDate?: string } | null>(null);
  const [viewingDeliveryItem, setViewingDeliveryItem] = useState<DeliveryNote | null>(null);
  const [showPageSizeDialog, setShowPageSizeDialog] = useState(false);
  const [showTemplateSelectionDialog, setShowTemplateSelectionDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<number>(1);
  const [pendingPrintItem, setPendingPrintItem] = useState<DeliveryNote | null>(null);
  const [signatureViewer, setSignatureViewer] = useState<{
    data: string;
    fileName: string;
    isPDF: boolean;
    blobUrl?: string;
  } | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deliveryViewMode, setDeliveryViewMode] = useState<'cards' | 'table'>('table');
  const [deliveryCurrentPage, setDeliveryCurrentPage] = useState(1);
  const [outstandingDeliveryPage, setOutstandingDeliveryPage] = useState(1);
  const itemsPerPage = 20;
  const [customerInputValue, setCustomerInputValue] = useState('');
  const [soInputValue, setSoInputValue] = useState('');
  const [productInputValue, setProductInputValue] = useState('');
  const [qtyInputValue, setQtyInputValue] = useState('');
  const [selectedSOs, setSelectedSOs] = useState<string[]>([]); // For multiple SO selection
  const [enableMultiSO, setEnableMultiSO] = useState(false); // Toggle for multi-SO mode
  const [selectedProducts, setSelectedProducts] = useState<Array<{ productId: string; productName: string; productCode: string; qty: number; unit: string }>>([]); // Selected products from SO
  const [soProducts, setSoProducts] = useState<Array<{ productId: string; productName: string; productCode: string; qty: number; unit: string }>>([]); // Products from selected SO
  const [formData, setFormData] = useState<Partial<DeliveryNote>>({
    soNo: '',
    customer: '',
    product: '',
    qty: 0,
  });
  // Custom Dialog - menggunakan hook terpusat
  const { showAlert: showAlertBase, showConfirm: showConfirmBase, showPrompt: showPromptBase, closeDialog, DialogComponent } = useDialog();

  // Guard untuk prevent dialog spam
  const dialogGuardRef = useRef<{ lastCall: number; callCount: number }>({ lastCall: 0, callCount: 0 });

  // Wrapper untuk kompatibilitas dengan urutan parameter yang berbeda
  const showAlert = (title: string, message: string) => {
    // Prevent spam: max 1 call per 1000ms, max 2 calls total
    const now = Date.now();
    if (now - dialogGuardRef.current.lastCall < 1000) {
      dialogGuardRef.current.callCount++;
      if (dialogGuardRef.current.callCount >= 2) {
        return; // Skip jika terlalu banyak calls
      }
    } else {
      dialogGuardRef.current.callCount = 0;
    }
    dialogGuardRef.current.lastCall = now;
    showAlertBase(message, title);
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
    // Prevent spam: max 1 call per 1000ms, max 2 calls total
    const now = Date.now();
    if (now - dialogGuardRef.current.lastCall < 1000) {
      dialogGuardRef.current.callCount++;
      if (dialogGuardRef.current.callCount >= 2) {
        return; // Skip jika terlalu banyak calls
      }
    } else {
      dialogGuardRef.current.callCount = 0;
    }
    dialogGuardRef.current.lastCall = now;
    showConfirmBase(message, onConfirm, onCancel, title);
  };

  const showPrompt = (title: string, message: string, defaultValue: string, onConfirm: (value: string) => void, placeholder?: string) => {
    // Prevent spam: max 1 call per 1000ms, max 2 calls total
    const now = Date.now();
    if (now - dialogGuardRef.current.lastCall < 1000) {
      dialogGuardRef.current.callCount++;
      if (dialogGuardRef.current.callCount >= 2) {
        return; // Skip jika terlalu banyak calls
      }
    } else {
      dialogGuardRef.current.callCount = 0;
    }
    dialogGuardRef.current.lastCall = now;
    showPromptBase(message, defaultValue, onConfirm, undefined, title, placeholder || '');
  };

  // Cleanup blob URL saat komponen unmount (meskipun sekarang tidak digunakan)
  useEffect(() => {
    return () => {
      if (signatureViewer?.blobUrl) {
        URL.revokeObjectURL(signatureViewer.blobUrl);
      }
    };
  }, [signatureViewer?.blobUrl]);

  // Guard untuk prevent storage event loops
  const processingStorageEventRef = useRef(false);
  // Debounce ref untuk loadNotifications
  const loadNotificationsDebounceRef = useRef<NodeJS.Timeout | null>(null);
  // Guard untuk prevent recursive calls di loadNotifications
  const loadingNotificationsRef = useRef(false);
  // Flag untuk prevent storage event trigger saat save dari loadNotifications
  const isSavingNotificationsRef = useRef(false);
  // Ref untuk fallback interval
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Last load time untuk throttle
  const lastLoadNotificationsTimeRef = useRef<number>(0);
  // Guard untuk prevent interval multiple creation
  const intervalCreatedRef = useRef(false);
  // Debounce timer untuk storage events
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Storage event guard
  const storageEventGuardRef = useRef<{ lastKey: string; lastTime: number; callCount: number }>({
    lastKey: '',
    lastTime: 0,
    callCount: 0
  });

  useEffect(() => {
    loadDeliveries();
    loadCustomers();
    loadProducts();
    loadSalesOrders();
    loadNotifications();
    loadScheduleData();

    // Event-based updates: lebih efisien daripada polling
    // CRITICAL: Move refs outside useEffect to prevent recreation on every render

    const handleStorageChange = (e: Event) => {
      // Prevent recursive calls
      if (processingStorageEventRef.current) {
        return;
      }

      const customEvent = e as CustomEvent<{ key?: string }>;
      const key = customEvent.detail?.key || '';

      // Prevent spam: max 1 call per key per 1 second
      const now = Date.now();
      if (storageEventGuardRef.current.lastKey === key &&
        now - storageEventGuardRef.current.lastTime < 1000) {
        storageEventGuardRef.current.callCount++;
        if (storageEventGuardRef.current.callCount > 5) {
          return; // Skip jika terlalu banyak calls untuk key yang sama
        }
      } else {
        storageEventGuardRef.current.callCount = 0;
        storageEventGuardRef.current.lastKey = key;
      }
      storageEventGuardRef.current.lastTime = now;

      // Hanya reload jika ada perubahan di data yang relevan
      if (
        key === 'delivery' ||
        key === 'salesOrders' ||
        key === 'schedule' ||
        key === 'productionNotifications' ||
        key === 'deliveryNotifications'
      ) {
        // Skip jika sedang save dari loadNotifications sendiri (prevent loop)
        if (key === 'deliveryNotifications' && isSavingNotificationsRef.current) {
          return;
        }

        // Debounce: tunggu 1000ms sebelum reload (increased untuk prevent spam)
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          processingStorageEventRef.current = true;
          try {
            if (key === 'delivery') {
              loadDeliveries();
            } else if (key === 'salesOrders') {
              loadSalesOrders();
            } else if (key === 'schedule') {
              loadScheduleData();
            } else if (key === 'productionNotifications' || key === 'deliveryNotifications') {
              // Throttle: minimal 3 detik antara calls untuk notifications
              const now = Date.now();
              if (now - lastLoadNotificationsTimeRef.current < 3000) {
                return;
              }
              // Debounce loadNotifications untuk prevent loops
              if (loadNotificationsDebounceRef.current) {
                clearTimeout(loadNotificationsDebounceRef.current);
              }
              loadNotificationsDebounceRef.current = setTimeout(() => {
                lastLoadNotificationsTimeRef.current = Date.now();
                loadNotifications();
                loadNotificationsDebounceRef.current = null;
              }, 1500); // 1.5 second debounce
            }
          } finally {
            // Reset guard after a short delay to allow processing
            setTimeout(() => {
              processingStorageEventRef.current = false;
            }, 200);
          }
          debounceTimerRef.current = null;
        }, 1000); // Increased debounce time to 1 second
      }
    };

    // Fallback polling: hanya jika event listener tidak tersedia atau untuk safety net
    // CRITICAL: Hanya create interval jika belum ada (prevent multiple intervals)
    if (!intervalCreatedRef.current && !fallbackIntervalRef.current) {
      intervalCreatedRef.current = true;
      fallbackIntervalRef.current = setInterval(() => {
        loadDeliveries();
        loadNotifications();
        loadScheduleData();
      }, 60000); // Increased to 60 seconds to reduce load
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('app-storage-changed', handleStorageChange as EventListener);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (loadNotificationsDebounceRef.current) {
        clearTimeout(loadNotificationsDebounceRef.current);
        loadNotificationsDebounceRef.current = null;
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('app-storage-changed', handleStorageChange as EventListener);
      }
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
      intervalCreatedRef.current = false;
      loadingNotificationsRef.current = false; // Reset guard on unmount
      isSavingNotificationsRef.current = false;
      processingStorageEventRef.current = false;
      storageEventGuardRef.current = { lastKey: '', lastTime: 0, callCount: 0 };
    };
  }, []);

  const loadScheduleData = async () => {
    let schedule = await storageService.get<any[]>('schedule') || [];
    // Ensure schedule is always an array
    schedule = Array.isArray(schedule) ? schedule : [];
    let spk = await storageService.get<any[]>('spk') || [];
    // Ensure spk is always an array
    spk = Array.isArray(spk) ? spk : [];

    // 🚀 OPTIMASI: Shallow comparison instead of JSON.stringify (much faster)
    setScheduleData((prev: any[]) => {
      if (prev.length !== schedule.length) {
        return schedule;
      }
      if (prev.length === 0) {
        return prev; // Both empty, no change
      }
      // Quick check: compare first and last items
      const prevFirst = prev[0];
      const newFirst = schedule[0];
      const prevLast = prev[prev.length - 1];
      const newLast = schedule[schedule.length - 1];
      if (prevFirst?.id === newFirst?.id && prevLast?.id === newLast?.id) {
        return prev; // Likely same data
      }
      return schedule;
    });

    // 🚀 OPTIMASI: Shallow comparison instead of JSON.stringify (much faster)
    setSpkData((prev: any[]) => {
      if (prev.length !== spk.length) {
        return spk;
      }
      if (prev.length === 0) {
        return prev; // Both empty, no change
      }
      // Quick check: compare first and last items
      const prevFirst = prev[0];
      const newFirst = spk[0];
      const prevLast = prev[prev.length - 1];
      const newLast = spk[spk.length - 1];
      if (prevFirst?.spkNo === newFirst?.spkNo && prevLast?.spkNo === newLast?.spkNo) {
        return prev; // Likely same data
      }
      return spk;
    });
  };

  const loadCustomers = async () => {
    const data = await storageService.get<Customer[]>('customers') || [];
    // CRITICAL: Filter deleted items using helper function
    const activeCustomers = filterActiveItems(data);
    // 🚀 OPTIMASI: Shallow comparison instead of JSON.stringify (much faster)
    setCustomers((prev: Customer[]) => {
      if (prev.length !== activeCustomers.length) {
        return activeCustomers;
      }
      if (prev.length === 0) {
        return prev; // Both empty, no change
      }
      // Quick check: compare first and last items
      const prevFirst = prev[0];
      const newFirst = activeCustomers[0];
      const prevLast = prev[prev.length - 1];
      const newLast = activeCustomers[activeCustomers.length - 1];
      if (prevFirst?.id === newFirst?.id && prevLast?.id === newLast?.id) {
        return prev; // Likely same data
      }
      return activeCustomers;
    });
  };

  // Helper function untuk remove leading zero dari input angka
  const removeLeadingZero = (value: string): string => {
    if (!value) return value;
    // Jika hanya "0", "0.", atau "0," biarkan
    if (value === '0' || value === '0.' || value === '0,') {
      return value;
    }
    // Hapus semua leading zero kecuali untuk "0." atau "0,"
    if (value.startsWith('0') && value.length > 1) {
      // Jika dimulai dengan "0." atau "0," biarkan
      if (value.startsWith('0.') || value.startsWith('0,')) {
        return value;
      }
      // Hapus semua leading zero
      const cleaned = value.replace(/^0+/, '');
      return cleaned || '0';
    }
    return value;
  };

  const getCustomerInputDisplayValue = () => {
    if (customerInputValue !== undefined && customerInputValue !== '') {
      return customerInputValue;
    }
    if (formData.customer) {
      const customer = customers.find(c => c.nama === formData.customer);
      if (customer) {
        return `${customer.kode} - ${customer.nama}`;
      }
      return formData.customer;
    }
    return '';
  };

  const handleCustomerInputChange = (text: string) => {
    setCustomerInputValue(text);
    if (!text) {
      setFormData({ ...formData, customer: '' });
      return;
    }
    const normalized = text.toLowerCase();
    const matchedCustomer = customers.find(c => {
      const label = `${c.kode || ''}${c.kode ? ' - ' : ''}${c.nama || ''}`.toLowerCase();
      const code = (c.kode || '').toLowerCase();
      const name = (c.nama || '').toLowerCase();
      return label === normalized || code === normalized || name === normalized;
    });
    if (matchedCustomer) {
      setFormData({ ...formData, customer: matchedCustomer.nama });
    } else {
      setFormData({ ...formData, customer: text });
    }
  };

  const getSoInputDisplayValue = () => {
    if (soInputValue !== undefined && soInputValue !== '') {
      return soInputValue;
    }
    if (formData.soNo) {
      const so = salesOrders.find(s => s.soNo === formData.soNo);
      if (so) {
        return `${so.soNo} - ${so.customer}`;
      }
      return formData.soNo;
    }
    return '';
    return '';
  };

  // Helper to calculate remaining qty (Component Scope)
  const calculateRemainingQty = (soNo: string, productName: string, originalQty: number) => {
    const deliveriesArray = Array.isArray(deliveries) ? deliveries : [];
    const existingDeliveries = deliveriesArray.filter((d: any) =>
      (d.soNo === soNo || (d.soNos && d.soNos.includes(soNo))) &&
      d.items?.some((di: any) => di.product === productName)
    );
    const totalDelivered = existingDeliveries.reduce((sum: number, d: any) => {
      const deliveryItem = d.items?.find((di: any) => di.product === productName);
      return sum + (deliveryItem?.qty || 0);
    }, 0);
    return Math.max(0, originalQty - totalDelivered);
  };

  const handleSoInputChange = (text: string) => {
    setSoInputValue(text);
    if (!text) {
      setFormData({ ...formData, soNo: '', customer: '' });
      setCustomerInputValue('');
      setSoProducts([]);
      setSelectedProducts([]);
      return;
    }



    const normalized = text.toLowerCase();
    const matchedSo = salesOrders.find(s => {
      const label = `${s.soNo || ''}${s.soNo ? ' - ' : ''}${s.customer || ''}`.toLowerCase();
      const soNo = (s.soNo || '').toLowerCase();
      const customer = (s.customer || '').toLowerCase();
      return label === normalized || soNo === normalized || customer === normalized;
    });
    if (matchedSo) {
      setFormData({
        ...formData,
        soNo: matchedSo.soNo,
        customer: matchedSo.customer || '',
      });
      if (matchedSo.customer) {
        const customer = customers.find(c => c.nama === matchedSo.customer);
        if (customer) {
          setCustomerInputValue(`${customer.kode} - ${customer.nama}`);
        } else {
          setCustomerInputValue(matchedSo.customer);
        }
      }

      // Load products from SO
      if (matchedSo.items && Array.isArray(matchedSo.items) && matchedSo.items.length > 0) {
        const soProductsList = matchedSo.items.map((item: any) => {
          // Find product code from products list
          const productData = products.find((p: any) =>
            p.nama === (item.productName || item.product) ||
            p.kode === item.productCode ||
            p.product_id === item.productId ||
            p.sku === item.itemSku
          );

          return {
            productId: item.productId || productData?.product_id || productData?.id || '',
            productName: item.productName || item.product || 'Unknown',
            productCode: productData?.kode || item.productCode || item.itemSku || '',
            qty: typeof item.qty === 'string' ? parseFloat(item.qty) : (item.qty || 0),
            unit: item.unit || 'PCS',
          };
        });
        setSoProducts(soProductsList);

        // Auto-select all products by default, but with calculated remaining qty
        const initialSelected = soProductsList.map(p => ({
          ...p,
          qty: calculateRemainingQty(matchedSo.soNo, p.productName, p.qty)
        })).filter(p => p.qty > 0); // Only auto-select items with remaining qty > 0

        setSelectedProducts(initialSelected);
      } else {
        setSoProducts([]);
        setSelectedProducts([]);
      }
    } else {
      setFormData({ ...formData, soNo: text });
      setSoProducts([]);
      setSelectedProducts([]);
    }
  };

  const getProductInputDisplayValue = () => {
    if (productInputValue !== undefined && productInputValue !== '') {
      return productInputValue;
    }
    if (formData.product) {
      const product = products.find(p => p.nama === formData.product || p.kode === formData.product);
      if (product) {
        return `${product.kode || ''}${product.kode ? ' - ' : ''}${product.nama || ''}`;
      }
      return formData.product;
    }
    return '';
  };

  const handleProductInputChange = (text: string) => {
    setProductInputValue(text);
    if (!text) {
      setFormData({ ...formData, product: '' });
      return;
    }
    const normalized = text.toLowerCase();
    const matchedProduct = products.find(p => {
      const label = `${p.kode || ''}${p.kode ? ' - ' : ''}${p.nama || ''}`.toLowerCase();
      const code = (p.kode || '').toLowerCase();
      const kodeIpos = (p.kodeIpos || '').toLowerCase();
      const padCode = (p.padCode || '').toLowerCase();
      const name = (p.nama || '').toLowerCase();

      // Direct match
      if (label === normalized || code === normalized || kodeIpos === normalized || padCode === normalized || name === normalized) {
        return true;
      }

      // Cross-reference: Jika kodeIpos produk ini sama dengan kode produk lain yang match dengan search
      if (kodeIpos && products.some(otherP => {
        const otherKode = (otherP.kode || '').toLowerCase();
        return otherKode === normalized && otherKode === kodeIpos;
      })) {
        return true;
      }

      // Cross-reference: Jika kode produk ini sama dengan kodeIpos produk lain yang match dengan search
      if (code && products.some(otherP => {
        const otherKodeIpos = (otherP.kodeIpos || '').toLowerCase();
        return otherKodeIpos === normalized && otherKodeIpos === code;
      })) {
        return true;
      }

      return false;
    });
    if (matchedProduct) {
      setFormData({ ...formData, product: matchedProduct.nama });
    } else {
      setFormData({ ...formData, product: text });
    }
  };

  const loadProducts = async () => {
    const data = await storageService.get<any[]>('products') || [];
    // 🚀 OPTIMASI: Shallow comparison instead of JSON.stringify (much faster)
    setProducts((prev: any[]) => {
      if (prev.length !== data.length) {
        return data;
      }
      if (prev.length === 0) {
        return prev; // Both empty, no change
      }
      // Quick check: compare first and last items
      const prevFirst = prev[0];
      const newFirst = data[0];
      const prevLast = prev[prev.length - 1];
      const newLast = data[data.length - 1];
      if (prevFirst?.id === newFirst?.id && prevLast?.id === newLast?.id) {
        return prev; // Likely same data
      }
      return data;
    });
  };

  const loadSalesOrders = async () => {
    let data = await storageService.get<SalesOrder[]>('salesOrders') || [];
    // Ensure data is always an array
    data = Array.isArray(data) ? data : [];
    const filteredData = data.filter(so => so.status === 'OPEN' || so.status === 'CLOSE');
    // 🚀 OPTIMASI: Shallow comparison instead of JSON.stringify (much faster)
    setSalesOrders((prev: SalesOrder[]) => {
      if (prev.length !== filteredData.length) {
        return filteredData;
      }
      if (prev.length === 0) {
        return prev; // Both empty, no change
      }
      // Quick check: compare first and last items
      const prevFirst = prev[0];
      const newFirst = filteredData[0];
      const prevLast = prev[prev.length - 1];
      const newLast = filteredData[filteredData.length - 1];
      if (prevFirst?.soNo === newFirst?.soNo && prevLast?.soNo === newLast?.soNo) {
        return prev; // Likely same data
      }
      return filteredData;
    });
  };

  const loadDeliveries = async () => {
    let data = await storageService.get<DeliveryNote[]>('delivery') || [];
    
    // If data is empty, wait for background server sync with polling
    if (!data || data.length === 0) {
      let attempts = 0;
      const maxAttempts = 10; // 10 * 500ms = 5 seconds max
      
      while ((!data || data.length === 0) && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms between checks
        data = await storageService.get<DeliveryNote[]>('delivery') || [];
        attempts++;
      }
    }
    
    // ENHANCED: Use helper to filter out deleted items (tombstone pattern)
    const activeDeliveries = filterActiveItems(data);

    // Log tombstone info for debugging
    const deletedCount = data.length - activeDeliveries.length;
    if (deletedCount > 0) {
      // Removed console.log for performance
    }

    // 🚀 OPTIMASI: Shallow comparison instead of JSON.stringify (much faster)
    setDeliveries((prev: DeliveryNote[]) => {
      if (prev.length !== activeDeliveries.length) {
        return activeDeliveries;
      }
      if (prev.length === 0) {
        return prev; // Both empty, no change
      }
      // Quick check: compare first and last items
      const prevFirst = prev[0];
      const newFirst = activeDeliveries[0];
      const prevLast = prev[prev.length - 1];
      const newLast = activeDeliveries[activeDeliveries.length - 1];
      if (prevFirst?.id === newFirst?.id && prevLast?.id === newLast?.id) {
        return prev; // Likely same data
      }
      return activeDeliveries;
    });
  };

  // Group notifications berdasarkan sjGroupId dari schedule
  // IMPORTANT: Setiap notification sekarang per SPK (bukan per group)
  // Grouping hanya untuk display, tapi setiap notification tetap represent 1 SPK
  const groupNotificationsByDelivery = async (notifications: any[]) => {
    // Load schedule untuk mendapatkan sjGroupId
    const scheduleList = await storageService.get<any[]>('schedule') || [];

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
      // IMPORTANT: Match batch suffix (SPK/251212/NY530-A vs SPK/251212/NY530)
      // Tapi JANGAN match base SPK saja (SPK/251212/NY530 vs SPK/251212/UTCCE)
      // Split menjadi parts
      const parts1 = normalized1.split('/');
      const parts2 = normalized2.split('/');

      // Harus punya minimal 3 parts untuk match (SPK/251212/XXX)
      if (parts1.length < 3 || parts2.length < 3) {
        // Jika kurang dari 3 parts, hanya exact match
        return normalized1 === normalized2;
      }

      // Match jika 3 parts pertama sama (SPK/251212/XXX)
      // Ini untuk handle batch suffix seperti SPK/251212/NY530-A vs SPK/251212/NY530
      const base1 = parts1.slice(0, 3).join('/'); // SPK/251212/NY530
      const base2 = parts2.slice(0, 3).join('/'); // SPK/251212/NY530

      if (base1 === base2) {
        // Base sama, ini batch dari SPK yang sama
        return true;
      }

      // Jangan match jika base berbeda (SPK/251212/NY530 vs SPK/251212/UTCCE)
      return false;
    };

    // Enrich setiap notification dengan sjGroupId dari schedule
    // IMPORTANT: Setiap notification sekarang punya spkNo (single), bukan spkNos (array)
    const enrichedNotifications = notifications.map((notif: any) => {
      // Handle format: spkNo (single SPK per notification) atau spkNos (old format)
      const spkNo = notif.spkNo || (notif.spkNos && notif.spkNos.length > 0 ? notif.spkNos[0] : null);

      if (!spkNo) {
        return {
          ...notif,
          sjGroupId: null,
        };
      }

      // PRIORITAS 1: Gunakan sjGroupId yang sudah ada di notification (dari PPIC)
      let sjGroupId: string | null = notif.sjGroupId || null;

      // PRIORITAS 2: Jika tidak ada di notification, ambil dari deliveryBatches di notification
      if (!sjGroupId && notif.deliveryBatches && Array.isArray(notif.deliveryBatches) && notif.deliveryBatches.length > 0) {
        const batchWithGroup = notif.deliveryBatches.find((db: any) => db.sjGroupId);
        if (batchWithGroup && batchWithGroup.sjGroupId) {
          sjGroupId = batchWithGroup.sjGroupId;
        }
      }

      // PRIORITAS 3: Fallback ke schedule (jika masih belum ada)
      if (!sjGroupId) {
        // Cari schedule yang match dengan SPK dari notification
        const relatedSchedule = scheduleList.find((s: any) => {
          if (!s.spkNo) return false;
          return matchSPK(s.spkNo, spkNo);
        });

        // Ambil sjGroupId dari deliveryBatches di schedule
        if (relatedSchedule && relatedSchedule.deliveryBatches && relatedSchedule.deliveryBatches.length > 0) {
          // Cari batch yang match dengan SPK ini
          const matchingBatch = relatedSchedule.deliveryBatches.find((db: any) => {
            // Jika batch punya spkNo, match dengan SPK dari notification
            if (db.spkNo) {
              return matchSPK(db.spkNo, spkNo);
            }
            // Jika tidak ada spkNo di batch, cek apakah batch punya sjGroupId
            return db.sjGroupId;
          });

          if (matchingBatch && matchingBatch.sjGroupId) {
            sjGroupId = matchingBatch.sjGroupId;
          } else if (relatedSchedule.deliveryBatches[0]?.sjGroupId) {
            sjGroupId = relatedSchedule.deliveryBatches[0].sjGroupId;
          }
        }
      }

      // Enrich delivery date dari schedule berdasarkan sjGroupId atau SPK
      let deliveryDate: string | null = null;
      let enrichedDeliveryBatches = notif.deliveryBatches || [];

      // Jika punya sjGroupId, cari batch dengan sjGroupId yang sama di schedule
      if (sjGroupId) {
        const scheduleWithGroup = scheduleList.find((s: any) => {
          return s.deliveryBatches?.some((db: any) => db.sjGroupId === sjGroupId);
        });

        if (scheduleWithGroup && scheduleWithGroup.deliveryBatches) {
          const matchingBatch = scheduleWithGroup.deliveryBatches.find((db: any) => db.sjGroupId === sjGroupId);
          if (matchingBatch && matchingBatch.deliveryDate) {
            deliveryDate = matchingBatch.deliveryDate;
            enrichedDeliveryBatches = [{ deliveryDate, sjGroupId, qty: matchingBatch.qty }];
          }
        }
      }

      // Fallback: jika tidak ada sjGroupId atau tidak ditemukan, cari dari schedule berdasarkan SPK
      if (!deliveryDate) {
        const relatedSchedule = scheduleList.find((s: any) => {
          if (!s.spkNo) return false;
          return matchSPK(s.spkNo, spkNo);
        });

        if (relatedSchedule && relatedSchedule.deliveryBatches && relatedSchedule.deliveryBatches.length > 0) {
          // Ambil batch pertama yang match dengan SPK atau batch pertama
          const matchingBatch = relatedSchedule.deliveryBatches.find((db: any) => {
            if (db.spkNo) {
              return matchSPK(db.spkNo, spkNo);
            }
            return true;
          });

          if (matchingBatch && matchingBatch.deliveryDate) {
            deliveryDate = matchingBatch.deliveryDate;
            enrichedDeliveryBatches = [{
              deliveryDate,
              sjGroupId: matchingBatch.sjGroupId || sjGroupId,
              qty: matchingBatch.qty
            }];
          } else if (relatedSchedule.deliveryBatches[0]?.deliveryDate) {
            deliveryDate = relatedSchedule.deliveryBatches[0].deliveryDate;
            enrichedDeliveryBatches = [{
              deliveryDate,
              sjGroupId: relatedSchedule.deliveryBatches[0].sjGroupId || sjGroupId,
              qty: relatedSchedule.deliveryBatches[0].qty
            }];
          }
        }
      }

      // Jika masih belum ada delivery date, gunakan yang ada di notification
      if (!deliveryDate && notif.deliveryBatches && notif.deliveryBatches.length > 0) {
        enrichedDeliveryBatches = notif.deliveryBatches;
      }

      return {
        ...notif,
        spkNo: spkNo, // Ensure single SPK format
        sjGroupId, // Tambahkan sjGroupId ke notification
        deliveryBatches: enrichedDeliveryBatches, // Enrich deliveryBatches dari schedule
      };
    });

    // Group berdasarkan sjGroupId (jika ada)
    // IMPORTANT: Setiap sjGroupId yang berbeda harus jadi notifikasi terpisah
    const groups: { [key: string]: any[] } = {};
    const ungrouped: any[] = [];

    enrichedNotifications.forEach((notif: any) => {
      if (notif.sjGroupId) {
        // Group berdasarkan sjGroupId
        // IMPORTANT: Setiap sjGroupId yang berbeda akan jadi group terpisah
        if (!groups[notif.sjGroupId]) {
          groups[notif.sjGroupId] = [];
        }
        groups[notif.sjGroupId].push(notif);
      } else {
        // Tidak punya sjGroupId, tidak digroup (single notification)
        ungrouped.push(notif);
      }
    });

    // Removed console.log for performance

    // Convert groups to array of grouped notifications
    const groupedResults: any[] = [];

    // Process grouped notifications (yang punya sjGroupId)
    // IMPORTANT: Setiap entry di groups = 1 notifikasi terpisah (bukan digabung semua)
    Object.entries(groups).forEach(([sjGroupId, group]) => {
      if (group.length === 1) {
        // Single notification dalam group
        // IMPORTANT: Enrich delivery date dari schedule berdasarkan sjGroupId
        const singleNotif = group[0];
        let deliveryDate: string | null = null;

        // Cari schedule yang punya batch dengan sjGroupId ini
        const scheduleWithGroup = scheduleList.find((s: any) => {
          return s.deliveryBatches?.some((db: any) => db.sjGroupId === sjGroupId);
        });

        if (scheduleWithGroup && scheduleWithGroup.deliveryBatches) {
          const matchingBatch = scheduleWithGroup.deliveryBatches.find((db: any) => db.sjGroupId === sjGroupId);
          if (matchingBatch && matchingBatch.deliveryDate) {
            deliveryDate = matchingBatch.deliveryDate;
          }
        }

        // Fallback: ambil dari notification deliveryBatches
        if (!deliveryDate && singleNotif.deliveryBatches && singleNotif.deliveryBatches.length > 0) {
          const matchingBatch = singleNotif.deliveryBatches.find((db: any) => db.sjGroupId === sjGroupId);
          if (matchingBatch && matchingBatch.deliveryDate) {
            deliveryDate = matchingBatch.deliveryDate;
          } else {
            deliveryDate = singleNotif.deliveryBatches[0].deliveryDate;
          }
        }

        // Update notification dengan delivery date yang benar
        groupedResults.push({
          ...singleNotif,
          deliveryBatches: deliveryDate ? [{ deliveryDate, sjGroupId }] : (singleNotif.deliveryBatches || []),
        });
      } else {
        // Multiple notifications dengan sjGroupId yang sama - create grouped notification
        const firstNotif = group[0];

        // Get delivery date dari batch pertama yang punya sjGroupId ini
        let groupDeliveryDate: string | null = null;
        const scheduleWithGroup = scheduleList.find((s: any) => {
          return s.deliveryBatches?.some((db: any) => db.sjGroupId === sjGroupId);
        });

        if (scheduleWithGroup && scheduleWithGroup.deliveryBatches) {
          const matchingBatch = scheduleWithGroup.deliveryBatches.find((db: any) => db.sjGroupId === sjGroupId);
          if (matchingBatch && matchingBatch.deliveryDate) {
            groupDeliveryDate = matchingBatch.deliveryDate;
          }
        }

        // Fallback: ambil dari firstNotif
        if (!groupDeliveryDate && firstNotif.deliveryBatches && firstNotif.deliveryBatches.length > 0) {
          groupDeliveryDate = firstNotif.deliveryBatches[0].deliveryDate;
        }

        // IMPORTANT: Jangan gabung quantity! Setiap SPK punya 1 product dengan quantity sendiri
        // totalQty hanya untuk display, tapi items tetap terpisah per SPK
        groupedResults.push({
          ...firstNotif,
          id: `grouped-${sjGroupId}-${firstNotif.id}`,
          isGrouped: true,
          sjGroupId, // Simpan sjGroupId untuk reference
          groupedNotifications: group, // Store all notifications in this group (setiap notification = 1 SPK = 1 product)
          totalQty: group.reduce((sum: number, n: any) => sum + (n.qty || 0), 0), // Total untuk display saja
          deliveryBatches: groupDeliveryDate ? [{ deliveryDate: groupDeliveryDate, sjGroupId }] : [],
        });
      }
    });

    // Add ungrouped notifications (yang tidak punya sjGroupId)
    // IMPORTANT: Enrich delivery date dari schedule untuk ungrouped notifications juga
    const enrichedUngrouped = ungrouped.map((notif: any) => {
      const spkNo = notif.spkNo || (notif.spkNos && notif.spkNos.length > 0 ? notif.spkNos[0] : null);
      if (!spkNo) return notif;

      // Cari schedule yang match dengan SPK ini
      const relatedSchedule = scheduleList.find((s: any) => {
        if (!s.spkNo) return false;
        return matchSPK(s.spkNo, spkNo);
      });

      // Ambil delivery date dari schedule
      let deliveryDate: string | null = null;
      if (relatedSchedule && relatedSchedule.deliveryBatches && relatedSchedule.deliveryBatches.length > 0) {
        // Ambil batch pertama yang match dengan SPK atau batch pertama
        const matchingBatch = relatedSchedule.deliveryBatches.find((db: any) => {
          if (db.spkNo) {
            return matchSPK(db.spkNo, spkNo);
          }
          return true; // Ambil batch pertama jika tidak ada spkNo
        });

        if (matchingBatch && matchingBatch.deliveryDate) {
          deliveryDate = matchingBatch.deliveryDate;
        } else if (relatedSchedule.deliveryBatches[0]?.deliveryDate) {
          deliveryDate = relatedSchedule.deliveryBatches[0].deliveryDate;
        }
      }

      // Update notification dengan delivery date dari schedule jika belum ada
      if (deliveryDate && (!notif.deliveryBatches || notif.deliveryBatches.length === 0)) {
        return {
          ...notif,
          deliveryBatches: [{ deliveryDate }],
        };
      }

      return notif;
    });

    return [...groupedResults, ...enrichedUngrouped];
  };

  const loadNotifications = async () => {
    // Prevent recursive calls
    if (loadingNotificationsRef.current) {
      return;
    }

    // Throttle: minimal 2 detik antara calls
    const now = Date.now();
    if (now - lastLoadNotificationsTimeRef.current < 2000) {
      return;
    }
    lastLoadNotificationsTimeRef.current = now;

    loadingNotificationsRef.current = true;

    try {
      // Load existing notifications from storage only
      // Do NOT generate notifications from schedule data
      let scheduleList = await storageService.get<any[]>('schedule') || [];
      let storedNotifications = await storageService.get<any[]>('deliveryNotifications') || [];
      
      // If notifications are empty, wait for background server sync
      if (!storedNotifications || storedNotifications.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5 seconds for server sync
        storedNotifications = await storageService.get<any[]>('deliveryNotifications') || [];
      }
      
      console.log('[DeliveryNote] Loaded stored notifications:', storedNotifications.length, storedNotifications.map((n: any) => ({ spkNo: n.spkNo, status: n.status })));

      // Use stored notifications directly (no generation from schedule)
      const deliveryNotifications = storedNotifications;

      // 🚀 OPTIMASI: Batch load semua data sekaligus untuk reduce storage calls
      const [currentDeliveries, inventoryData, productionList, qcList] = await Promise.all([
        storageService.get<any[]>('delivery').then(data => {
          const deliveries = Array.isArray(data) ? data : [];
          return deliveries.filter((d: any) => {
            const isDeleted = d.deleted === true || d.deleted === 'true' || d.deletedAt;
            return !isDeleted;
          });
        }),
        storageService.get<any[]>('inventory').then(data => Array.isArray(data) ? data : []),
        storageService.get<any[]>('production').then(data => Array.isArray(data) ? data : []),
        storageService.get<any[]>('qc').then(data => Array.isArray(data) ? data : [])
      ]);

      // Helper function untuk match SPK (handle batch format dan SJ suffix)
      // IMPORTANT: Match harus exact atau dengan batch suffix, TIDAK berdasarkan base SPK saja
      // Contoh: SPK/251212/NY530 tidak match dengan SPK/251212/UTCCE (berbeda SPK)
      // Tapi SPK/251212/NY530 match dengan SPK/251212/NY530-A (batch dari SPK yang sama)
      // IMPORTANT: SPK dengan suffix -SJ{number} adalah SPK berbeda (tidak match dengan SPK tanpa suffix atau dengan suffix berbeda)
      // Contoh: SPK/251212/NY530-SJ1 tidak match dengan SPK/251212/NY530-SJ2 (beda SJ group)
      const matchSPK = (spk1: string, spk2: string): boolean => {
        if (!spk1 || !spk2) return false;
        if (spk1 === spk2) return true;

        // IMPORTANT: SPK dengan suffix -SJ{number} harus exact match (tidak bisa match dengan SPK tanpa suffix atau dengan suffix berbeda)
        // Cek apakah salah satu atau kedua SPK punya suffix -SJ{number}
        const hasSjSuffix1 = /-SJ\d+$/.test(spk1);
        const hasSjSuffix2 = /-SJ\d+$/.test(spk2);

        if (hasSjSuffix1 || hasSjSuffix2) {
          // Jika salah satu punya suffix -SJ{number}, harus exact match
          // Ini untuk memastikan SPK dengan SJ berbeda tidak dianggap sama
          return spk1 === spk2;
        }

        // Support both formats: old format (strip) and new format (slash)
        const normalize = (spk: string) => {
          // Convert to slash format for comparison
          return spk.replace(/-/g, '/');
        };
        const normalized1 = normalize(spk1);
        const normalized2 = normalize(spk2);
        if (normalized1 === normalized2) return true;

        // IMPORTANT: Match batch suffix (SPK/251212/NY530-A vs SPK/251212/NY530)
        // Tapi JANGAN match base SPK saja (SPK/251212/NY530 vs SPK/251212/UTCCE)
        // Split menjadi parts
        const parts1 = normalized1.split('/');
        const parts2 = normalized2.split('/');

        // Harus punya minimal 3 parts untuk match (SPK/251212/XXX)
        if (parts1.length < 3 || parts2.length < 3) {
          // Jika kurang dari 3 parts, hanya exact match
          return normalized1 === normalized2;
        }

        // Match jika 3 parts pertama sama (SPK/251212/XXX)
        // Ini untuk handle batch suffix seperti SPK/251212/NY530-A vs SPK/251212/NY530
        const base1 = parts1.slice(0, 3).join('/'); // SPK/251212/NY530
        const base2 = parts2.slice(0, 3).join('/'); // SPK/251212/NY530

        if (base1 === base2) {
          // Base sama, ini batch dari SPK yang sama
          return true;
        }

        // Jangan match jika base berbeda (SPK/251212/NY530 vs SPK/251212/UTCCE)
        return false;
      };

      // Update notification status berdasarkan production dan QC, dan enrich deliveryBatches dari schedule
      // IMPORTANT: Setiap notification sekarang per SPK (bukan per group)
      const updatedNotifications = deliveryNotifications.map((notif: any) => {
        // Enrich/update deliveryBatches dari schedule (selalu ambil yang terbaru dari schedule)
        // Handle format: spkNo (single SPK per notification) atau spkNos (old format, convert)
        const spkNo = notif.spkNo || (notif.spkNos && notif.spkNos.length > 0 ? notif.spkNos[0] : null);

        if (!spkNo) {
          return {
            ...notif,
            status: 'WAITING_PRODUCTION', // No SPK found
          };
        }

        // Convert old format (spkNos array) ke new format (spkNo single)
        if (notif.spkNos && notif.spkNos.length > 0 && !notif.spkNo) {
          notif.spkNo = notif.spkNos[0]; // Use first SPK
        }

        const relatedSchedule = scheduleList.find((s: any) => {
          if (!s.spkNo) return false;
          return matchSPK(s.spkNo, spkNo);
        });

        // Update deliveryBatches dari schedule jika ada (prioritize schedule data)
        // IMPORTANT: Ambil batch yang sesuai dengan sjGroupId notification, bukan batch pertama
        if (relatedSchedule && relatedSchedule.deliveryBatches && relatedSchedule.deliveryBatches.length > 0) {
          const notifSjGroupId = notif.sjGroupId || (notif.deliveryBatches && notif.deliveryBatches[0]?.sjGroupId) || null;

          // Jika notification punya sjGroupId, cari batch dengan sjGroupId yang sama
          let matchingBatch = null;
          if (notifSjGroupId) {
            matchingBatch = relatedSchedule.deliveryBatches.find((db: any) => {
              return db.sjGroupId === notifSjGroupId;
            });
          }

          // Jika tidak ditemukan berdasarkan sjGroupId, cari berdasarkan SPK
          if (!matchingBatch) {
            matchingBatch = relatedSchedule.deliveryBatches.find((db: any) => {
              if (db.spkNo) {
                return matchSPK(db.spkNo, spkNo);
              }
              return false;
            });
          }

          // Fallback: ambil batch pertama jika tidak ada yang match
          if (matchingBatch) {
            notif.deliveryBatches = [matchingBatch];
          } else {
            notif.deliveryBatches = [relatedSchedule.deliveryBatches[0]];
          }
        }

        return notif;
      }).map((notif: any) => {
        // Handle format: spkNo (single SPK per notification)
        const spkNo = notif.spkNo || (notif.spkNos && notif.spkNos.length > 0 ? notif.spkNos[0] : null);

        // 🚀 OPTIMASI: Comment out untuk performa
        // console.log(`🔍 [Update Status] Processing notification: SPK ${spkNo}, StockFulfilled: ${notif.stockFulfilled}, Current Status: ${notif.status}, ID: ${notif.id}`);

        if (!spkNo) {
          return {
            ...notif,
            status: 'WAITING_PRODUCTION', // No SPK found
          };
        }

        // IMPORTANT: Cek stock di inventory jika stockFulfilled undefined atau false
        // Ini untuk handle case dimana notification dibuat sebelum stockFulfilled di-set
        let isStockFulfilled = notif.stockFulfilled === true;
        if (!isStockFulfilled) {
          // Cek SPK data untuk stockFulfilled flag
          const relatedSPK = spkData.find((s: any) => {
            const sSpkNo = (s.spkNo || '').toString().trim();
            return matchSPK(sSpkNo, spkNo);
          });

          if (relatedSPK && relatedSPK.stockFulfilled === true) {
            isStockFulfilled = true;
            // console.log(`✅ [Update Status] SPK ${spkNo} - Found stockFulfilled flag in SPK data`);
          } else {
            // Cek inventory langsung
            const spkProductId = (relatedSPK?.product_id || relatedSPK?.productId || relatedSPK?.kode || notif.productId || '').toString().trim();
            if (spkProductId) {
              const inventoryItem = inventoryData.find((inv: any) => {
                const invCode = (inv.item_code || inv.codeItem || '').toString().trim();
                return invCode === spkProductId;
              });

              if (inventoryItem) {
                const spkQty = parseFloat(relatedSPK?.qty || notif.qty || '0') || 0;
                const availableStock = inventoryItem.nextStock !== undefined
                  ? (inventoryItem.nextStock || 0)
                  : (
                    (inventoryItem.stockPremonth || 0) +
                    (inventoryItem.receive || 0) -
                    (inventoryItem.outgoing || 0) +
                    (inventoryItem.return || 0)
                  );

                if (availableStock > 0 && availableStock >= spkQty) {
                  isStockFulfilled = true;
                }
              }
            }
          }
        }

        // IMPORTANT: Jika notification sudah punya status READY_TO_SHIP, jangan ubah statusnya
        // Kecuali jika benar-benar sudah ada delivery yang belum dihapus
        if (notif.status === 'READY_TO_SHIP') {
          // Cek apakah delivery sudah dibuat (hanya yang belum dihapus)
          const existingDelivery = currentDeliveries.find((d: any) => {
            // Skip delivery yang sudah dihapus (cek berbagai format)
            if (d.deleted === true || d.deleted === 'true' || d.deletedAt) {
              return false;
            }

            if (d.items && Array.isArray(d.items) && d.items.length > 0) {
              const found = d.items.some((item: any) => matchSPK(item.spkNo, spkNo));
              if (found) {
              }
              return found;
            }
            if (d.spkNo) {
              const found = matchSPK(d.spkNo, spkNo);
              if (found) {
              }
              return found;
            }
            return false;
          });

          if (existingDelivery) {
            return {
              ...notif,
              status: 'DELIVERY_CREATED',
            };
          }

          // Jika belum ada delivery, keep status READY_TO_SHIP (jangan ubah)
          // console.log(`✅ [READY_TO_SHIP] SPK ${spkNo} - Keeping READY_TO_SHIP (no active delivery yet), StockFulfilled: ${notif.stockFulfilled}, Total deliveries checked: ${currentDeliveries.length}, Active deliveries: ${currentDeliveries.filter((d: any) => !d.deleted).length}`);
          return notif; // Return notification tanpa perubahan
        }

        // IMPORTANT: Skip production dan QC check jika stockFulfilled (stock ready, langsung dari inventory)
        // Gunakan isStockFulfilled yang sudah dicek di atas
        if (isStockFulfilled) {

          // Cek apakah delivery sudah dibuat (cek berdasarkan SPK saja, bukan SO)
          // Hanya cek delivery yang belum dihapus
          const existingDelivery = currentDeliveries.find((d: any) => {
            // Skip delivery yang sudah dihapus
            if (d.deleted === true) return false;

            // Cek di items delivery
            if (d.items && Array.isArray(d.items) && d.items.length > 0) {
              const found = d.items.some((item: any) => {
                const match = matchSPK(item.spkNo, spkNo);
                if (match) {
                }
                return match;
              });
              return found;
            }
            // Fallback untuk old format
            if (d.spkNo) {
              const match = matchSPK(d.spkNo, spkNo);
              if (match) {
              }
              return match;
            }
            return false;
          });

          if (existingDelivery) {
            return {
              ...notif,
              status: 'DELIVERY_CREATED', // Delivery sudah dibuat
            };
          }

          // Stock fulfilled = langsung ready untuk delivery (skip production & QC)
          return {
            ...notif,
            stockFulfilled: true, // Update flag untuk konsistensi
            status: 'READY_TO_SHIP', // Siap untuk dikirim (Stock ready, skip production & QC)
          };
        }

        // Normal flow: Cek production dan QC untuk SPK yang perlu produksi
        // Cek apakah SPK sudah production CLOSE
        const relatedProductions = productionList.filter((p: any) => matchSPK(p.spkNo, spkNo));
        const productionClosed = relatedProductions.some((p: any) => p.status === 'CLOSE');

        if (!productionClosed) {
          // console.log(`⏳ [Normal Flow] SPK ${spkNo} - Waiting for production CLOSE (found ${relatedProductions.length} production record(s))`);
          return {
            ...notif,
            status: 'WAITING_PRODUCTION', // Masih menunggu production selesai untuk SPK ini
          };
        }

        // Cek apakah SPK sudah QC PASS dan CLOSE
        const relatedQCs = qcList.filter((q: any) => {
          const matchesSO = q.soNo === notif.soNo;
          const matchesSPK = q.spkNo && matchSPK(q.spkNo, spkNo);
          return matchesSO || matchesSPK;
        });
        const qcPassed = relatedQCs.some((q: any) => q.qcResult === 'PASS' && q.status === 'CLOSE');

        if (!qcPassed) {
          return {
            ...notif,
            status: 'WAITING_QC', // Production selesai, menunggu QC PASS untuk SPK ini
          };
        }

        // Cek apakah delivery sudah dibuat (cek berdasarkan SPK saja, bukan SO)
        // Hanya cek delivery yang belum dihapus
        const existingDelivery = currentDeliveries.find((d: any) => {
          // Skip delivery yang sudah dihapus
          if (d.deleted === true) return false;

          // Cek apakah SPK sudah ada di items delivery
          if (d.items && Array.isArray(d.items) && d.items.length > 0) {
            return d.items.some((item: any) => matchSPK(item.spkNo, spkNo));
          }
          // Fallback untuk old format
          if (d.spkNo) {
            return matchSPK(d.spkNo, spkNo);
          }
          return false;
        });

        if (existingDelivery) {
          return {
            ...notif,
            status: 'DELIVERY_CREATED', // Delivery sudah dibuat
          };
        }

        return {
          ...notif,
          status: 'READY_TO_SHIP', // Siap untuk dikirim (Semua Production CLOSE + Semua QC PASS)
        };
      });

      // Auto-cleanup: Hapus notifications yang sudah tidak relevan (delivery sudah dibuat)
      const cleanedNotifications = updatedNotifications.filter((n: any) => {
        // IMPORTANT: Filter out deleted notifications first (tombstone pattern)
        if (n.deleted === true || n.deleted === 'true' || n.deletedAt) {
          return false;
        }

        // IMPORTANT: Keep notification dengan status 'Open' (dari PPIC schedule creation)
        // Ini adalah notifikasi baru dari PPIC yang belum diproses - JANGAN FILTER!
        if (n.status === 'Open') {
          console.log(`✅ [Cleanup] Keeping Open notification: SPK ${n.spkNo}`);
          return true; // Keep notification yang baru dari PPIC
        }

        // IMPORTANT: Filter out DELIVERY_CREATED notifications (backward compatibility)
        // Notifikasi yang sudah dibuat delivery note harus dihapus
        if (n.status === 'DELIVERY_CREATED') {
          // console.log(`🗑️ [Cleanup] Filtering out DELIVERY_CREATED notification: SPK ${n.spkNo}, sjGroupId: ${n.sjGroupId || 'null'}`);
          return false;
        }

        // IMPORTANT: Jangan hapus jika status masih READY_TO_SHIP (masih perlu dibuat delivery)
        // Baik stockFulfilled true maupun undefined, selama READY_TO_SHIP, keep notification
        if (n.status === 'READY_TO_SHIP') {
          // console.log(`🔍 [Cleanup] Keeping READY_TO_SHIP notification: SPK ${n.spkNo}, sjGroupId: ${n.sjGroupId || 'null'}, StockFulfilled: ${n.stockFulfilled}`);
          return true; // Keep notification yang masih ready
        }

        // IMPORTANT: Jangan hapus notification yang masih WAITING_PRODUCTION atau WAITING_QC
        // Karena notification ini masih perlu ditampilkan dan akan diupdate menjadi READY_TO_SHIP nanti
        // Bahkan jika sudah ada delivery untuk SPK yang sama, karena mungkin delivery tersebut untuk sjGroupId berbeda
        // Setiap sjGroupId = 1 delivery note terpisah, jadi notification dengan sjGroupId berbeda harus tetap ada
        if (n.status === 'WAITING_PRODUCTION' || n.status === 'WAITING_QC') {
          // console.log(`🔍 [Cleanup] Keeping ${n.status} notification: SPK ${n.spkNo}, sjGroupId: ${n.sjGroupId || 'null'}, StockFulfilled: ${n.stockFulfilled}`);
          return true; // Keep notification yang masih waiting
        }

        // Untuk notification dengan status READY_TO_SHIP, cek apakah delivery sudah dibuat DAN sudah upload signed document
        // IMPORTANT: Hanya hapus jika notification sudah di-mark sebagai DELIVERY_CREATED atau deleted
        // Jangan hapus berdasarkan delivery saja karena delivery note belum jadi SJ jika belum upload signed document
        // Setiap batch = 1 notification terpisah dengan sjGroupId berbeda
        // Ensure spkList is always an array
        let spkList: string[] = [];
        if (Array.isArray(n.spkNos)) {
          spkList = n.spkNos;
        } else if (n.spkNo) {
          spkList = [n.spkNo];
        }
        
        const notifSjGroupId = n.sjGroupId || (n.deliveryBatches && n.deliveryBatches[0]?.sjGroupId) || null;

        // IMPORTANT: Jika notification punya sjGroupId, SELALU keep notification
        // Karena setiap sjGroupId = 1 delivery terpisah (beda batch/ tanggal)
        // Hanya hapus jika notification sudah di-mark sebagai DELIVERY_CREATED atau deleted
        // (yang berarti signed document sudah di-upload, SJ sudah jadi)
        if (notifSjGroupId) {
          // Cek apakah notification sudah di-mark sebagai deleted atau DELIVERY_CREATED
          // Jika sudah, hapus. Jika belum, keep (masih perlu dibuat delivery atau belum upload signed doc)
          if (n.deleted === true || n.status === 'DELIVERY_CREATED') {
            return false; // Hapus notification yang sudah jadi SJ (signed document sudah di-upload)
          }
          return true; // Keep notification yang punya sjGroupId dan belum jadi SJ
        }

        // Hanya untuk notification tanpa sjGroupId (old format), cek apakah delivery sudah dibuat DAN sudah upload signed document
        // Tapi tetap prioritaskan status DELIVERY_CREATED atau deleted
        if (n.deleted === true || n.status === 'DELIVERY_CREATED') {
          return false; // Hapus notification yang sudah jadi SJ (signed document sudah di-upload)
        }

        // Untuk old format tanpa sjGroupId, cek apakah delivery sudah dibuat DAN sudah upload signed document
        // IMPORTANT: Jangan hapus jika delivery belum upload signed document (belum jadi SJ)
        const existingDelivery = currentDeliveries.find((d: any) => {
          // Skip delivery yang sudah dihapus
          if (d.deleted === true) return false;

          // IMPORTANT: Hanya match jika delivery sudah upload signed document (sudah jadi SJ)
          if (!d.signedDocument && !d.signedDocumentPath) {
            return false; // Delivery belum upload signed doc, belum jadi SJ, jangan match
          }

          if (d.items && Array.isArray(d.items) && d.items.length > 0) {
            // Cek apakah semua SPK sudah ada di delivery
            return spkList.every((spk: string) => {
              return d.items.some((item: any) => matchSPK(item.spkNo, spk));
            });
          }
          // Fallback untuk old format
          if (d.spkNo) {
            return spkList.some((spk: string) => matchSPK(d.spkNo, spk));
          }
          return false;
        });

        if (existingDelivery) {
          // Hanya hapus jika delivery sudah dibuat DAN sudah upload signed document (sudah jadi SJ)
          return false;
        }

        return true; // Keep notification yang belum jadi SJ (belum upload signed document)
      });

      // 🚀 OPTIMASI: Comment out heavy logging untuk performa
      // console.log(`🔍 [Delivery Note] After cleanup: ${cleanedNotifications.length} notifications`, cleanedNotifications.map((n: any) => ({
      //   spkNo: n.spkNo,
      //   status: n.status,
      //   stockFulfilled: n.stockFulfilled,
      //   sjGroupId: n.sjGroupId || 'null',
      // })));

      // Update notifications di storage (cleanup yang sudah tidak relevan)
      // IMPORTANT: Selalu simpan update status dan cleanup, karena cleanup logic sudah memastikan notifications penting tidak dihapus
      // IMPORTANT: Load fresh dari storage sebelum save untuk avoid race condition
      const currentStorageNotifications = await storageService.get<any[]>('deliveryNotifications') || [];
      const currentStorageCount = currentStorageNotifications.length;

      // 🚀 OPTIMASI: Shallow comparison instead of JSON.stringify (much faster)
      // Cek apakah ada perubahan yang perlu disimpan
      const hasChanges = (() => {
        if (cleanedNotifications.length !== currentStorageNotifications.length) {
          return true;
        }
        // Quick check: compare IDs of first and last items
        if (cleanedNotifications.length === 0) {
          return false;
        }
        const cleanedIds = new Set(cleanedNotifications.map((n: any) => n.id));
        const currentIds = new Set(currentStorageNotifications.map((n: any) => n.id));
        if (cleanedIds.size !== currentIds.size) {
          return true;
        }
        // Check if all IDs match
        for (const id of cleanedIds) {
          if (!currentIds.has(id)) {
            return true;
          }
        }
        // If IDs match, check status of first few items as quick check
        const checkCount = Math.min(5, cleanedNotifications.length);
        for (let i = 0; i < checkCount; i++) {
          const cleaned = cleanedNotifications[i];
          const current = currentStorageNotifications.find((n: any) => n.id === cleaned.id);
          if (!current || cleaned.status !== current.status) {
            return true;
          }
        }
        return false;
      })();

      if (hasChanges) {
        // Set flag untuk prevent storage event trigger loop
        isSavingNotificationsRef.current = true;

        try {
          await storageService.set(StorageKeys.PACKAGING.DELIVERY_NOTIFICATIONS, cleanedNotifications);
        } finally {
          // Reset flag setelah delay untuk allow processing
          setTimeout(() => {
            isSavingNotificationsRef.current = false;
          }, 500);
        }

        // Verify setelah save
        const verifyNotifications = await storageService.get<any[]>('deliveryNotifications') || [];
        // console.log(`✅ [Storage] Verified after save: ${verifyNotifications.length} notifications in storage`);
        if (verifyNotifications.length !== cleanedNotifications.length) {
          // Removed console.error for performance
          // verifyNotifications.forEach((n: any, idx: number) => {
          //   console.log(`    [${idx}] SPK: ${n.spkNo}, sjGroupId: ${n.sjGroupId || 'null'}, status: ${n.status}, id: ${n.id}`);
          // });
        } else {
          // verifyNotifications.forEach((n: any, idx: number) => {
          //   console.log(`    [${idx}] SPK: ${n.spkNo}, sjGroupId: ${n.sjGroupId || 'null'}, status: ${n.status}, id: ${n.id}`);
          // });
        }

        const removedCount = currentStorageCount - cleanedNotifications.length;
        if (removedCount > 0) {
          // console.log(`✅ [Cleanup] Updated storage: ${currentStorageCount} → ${cleanedNotifications.length} notifications (removed ${removedCount} obsolete)`);
        } else {
          // console.log(`✅ [Cleanup] Updated storage: ${currentStorageCount} → ${cleanedNotifications.length} notifications (status updates)`);
        }
      } else {
      }

      // Debug: Log semua cleaned notifications
      // console.log('🔍 [Delivery Note] All cleaned notifications:', cleanedNotifications.map((n: any) => ({
      //   spkNo: n.spkNo,
      //   status: n.status,
      //   stockFulfilled: n.stockFulfilled,
      //   product: n.product,
      //   sjGroupId: n.sjGroupId || 'null',
      // );

      // Filter notifications yang siap untuk dikirim
      // IMPORTANT: Include semua notifications yang belum dihapus, bukan hanya READY_TO_SHIP
      // Karena notifications dengan status WAITING_PRODUCTION, WAITING_QC, atau Open juga perlu ditampilkan
      const readyNotifications = cleanedNotifications.filter((n: any) => {
        // Keep semua notifications yang belum dihapus dan belum DELIVERY_CREATED
        // (cleanup logic sudah filter out yang tidak perlu)
        return n.status !== 'DELIVERY_CREATED' && !n.deleted;
      });

      console.log('[DeliveryNote] After cleanup:', cleanedNotifications.length, cleanedNotifications.map((n: any) => ({ spkNo: n.spkNo, status: n.status })));
      console.log('[DeliveryNote] Ready for display:', readyNotifications.length, readyNotifications.map((n: any) => ({ spkNo: n.spkNo, status: n.status })));

      // IMPORTANT: JANGAN deduplicate berdasarkan SPK saja!
      // Notifications dengan SPK yang sama tapi sjGroupId berbeda harus tetap dipertahankan
      // Karena setiap sjGroupId = 1 delivery note terpisah
      // Deduplicate hanya jika SPK SAMA DAN sjGroupId SAMA (true duplicate)

      const deduplicatedNotifications = readyNotifications.reduce((acc: any[], notif: any) => {
        const spkNo = notif.spkNo || (notif.spkNos && notif.spkNos.length > 0 ? notif.spkNos[0] : null);
        if (!spkNo) {
          acc.push(notif);
          return acc;
        }

        // Ambil sjGroupId dari notification (normalize null/undefined/empty string menjadi null)
        const notifSjGroupId = notif.sjGroupId || (notif.deliveryBatches && notif.deliveryBatches[0]?.sjGroupId) || null;
        const normalizedNotifSjGroupId = (notifSjGroupId === undefined || notifSjGroupId === null || notifSjGroupId === '') ? null : String(notifSjGroupId).trim();

        // Cek apakah sudah ada notification dengan SPK yang sama DAN sjGroupId yang sama
        const existingIndex = acc.findIndex((n: any) => {
          const existingSpkNo = n.spkNo || (n.spkNos && n.spkNos.length > 0 ? n.spkNos[0] : null);
          if (!existingSpkNo) return false;

          const existingSjGroupId = n.sjGroupId || (n.deliveryBatches && n.deliveryBatches[0]?.sjGroupId) || null;
          const normalizedExistingSjGroupId = (existingSjGroupId === undefined || existingSjGroupId === null || existingSjGroupId === '') ? null : String(existingSjGroupId).trim();

          // Match jika SPK sama DAN sjGroupId sama (atau keduanya null)
          const spkMatches = matchSPK(existingSpkNo, spkNo);
          const sjGroupMatches = normalizedExistingSjGroupId === normalizedNotifSjGroupId;

          return spkMatches && sjGroupMatches;
        });

        if (existingIndex >= 0) {
          // True duplicate ditemukan (SPK sama DAN sjGroupId sama), keep yang lebih baru (atau yang punya deliveryBatches lebih lengkap)
          const existing = acc[existingIndex];

          if (notif.deliveryBatches && Array.isArray(notif.deliveryBatches) && notif.deliveryBatches.length > 0) {
            if (!existing.deliveryBatches || !Array.isArray(existing.deliveryBatches) || existing.deliveryBatches.length === 0) {
              // Replace dengan yang punya deliveryBatches lebih lengkap
              acc[existingIndex] = notif;
            }
          }
          // Jika kedua-duanya punya deliveryBatches, keep yang lebih baru (created timestamp)
          else if (existing.deliveryBatches && Array.isArray(existing.deliveryBatches) && existing.deliveryBatches.length > 0) {
            // Keep existing (yang sudah ada)
          } else {
            // Kedua-duanya tidak punya deliveryBatches, keep yang lebih baru
            const existingCreated = existing.created ? new Date(existing.created).getTime() : 0;
            const notifCreated = notif.created ? new Date(notif.created).getTime() : 0;
            if (notifCreated > existingCreated) {
              acc[existingIndex] = notif;
            }
          }
        } else {
          // Tidak ada duplicate (SPK berbeda atau sjGroupId berbeda), tambahkan
          // console.log(`  ✅ [${currentIndex}] No duplicate found, adding notification: SPK ${spkNo}, sjGroupId ${normalizedNotifSjGroupId || 'null'}`);
          acc.push(notif);
        }

        return acc;
      }, []);


      // Group notifications berdasarkan sjGroupId dari schedule
      const groupedNotifications = await groupNotificationsByDelivery(deduplicatedNotifications);

      console.log('[DeliveryNote] After grouping:', groupedNotifications.length, groupedNotifications.map((n: any) => ({ spkNo: n.spkNo, status: n.status })));

      // 🚀 OPTIMASI: Shallow comparison instead of JSON.stringify (much faster)
      // Hanya update state jika benar-benar ada perubahan untuk mencegah re-render loop
      setNotifications((prev: any[]) => {
        // Quick check: length
        if (prev.length !== groupedNotifications.length) {
          return groupedNotifications;
        }
        // If same length, check if arrays are actually different
        if (prev.length === 0 && groupedNotifications.length === 0) {
          return prev; // Both empty, no change
        }
        // Compare first and last items as quick check
        const prevFirst = prev[0];
        const newFirst = groupedNotifications[0];
        const prevLast = prev[prev.length - 1];
        const newLast = groupedNotifications[groupedNotifications.length - 1];

        if (prevFirst?.id === newFirst?.id && prevLast?.id === newLast?.id) {
          // Likely same data, but do a more thorough check for critical fields
          const prevIds = new Set(prev.map((n: any) => n.id));
          const newIds = new Set(groupedNotifications.map((n: any) => n.id));
          if (prevIds.size === newIds.size && [...prevIds].every(id => newIds.has(id))) {
            return prev; // Same IDs, likely no change
          }
        }
        return groupedNotifications;
      });
    } catch (error: any) {
      // Error handling - silent fail untuk prevent spam
    } finally {
      loadingNotificationsRef.current = false; // Reset guard
    }
  };

  // Set outgoing when delivery note is created (before signed document upload)
  const setOutgoingFromDelivery = async (delivery: DeliveryNote) => {
    try {
      // CRITICAL: Check if delivery already processed (prevent duplicate outgoing updates)
      const allDeliveries = await storageService.get<DeliveryNote[]>('delivery') || [];
      const existingDelivery = allDeliveries.find((d: any) => d.id === delivery.id);
      
      if (existingDelivery?.processedOutgoing === true) {
        console.log('[DeliveryNote] ⚠️ Delivery already processed for outgoing:', delivery.id);
        return;
      }
      
      const inventory = await storageService.get<any[]>('inventory') || [];
      const productsList = await storageService.get<any[]>('products') || [];

      // Process items (new format) atau single product (old format)
      const itemsToProcess = delivery.items && delivery.items.length > 0
        ? delivery.items
        : delivery.product
          ? [{ product: delivery.product, qty: delivery.qty || 0 }]
          : [];

      if (itemsToProcess.length === 0) {
        return;
      }

      for (const item of itemsToProcess) {
        const productName = item.product || '';
        const qtyDelivery = item.qty || 0;

        if (!productName || qtyDelivery <= 0) {
          continue;
        }

        // Find product dari master untuk mendapatkan product_id/kode
        const product = productsList.find((p: any) => {
          const pName = (p.nama || '').toLowerCase().trim();
          const pCode = ((p.product_id || p.kode) || '').toString().toLowerCase().trim();
          const itemName = productName.toLowerCase().trim();
          return pName === itemName || pCode === itemName;
        });

        let productCode: string;
        if (!product) {
          productCode = productName.trim();
        } else {
          productCode = (product.product_id || product.kode || '').toString().trim();
        }

        // Find product inventory
        let existingProductInventory: any = null;

        if (item.inventoryId) {
          existingProductInventory = inventory.find((inv: any) => inv.id === item.inventoryId);
        }

        // Fallback: coba match dengan berbagai cara
        if (!existingProductInventory) {
          existingProductInventory = inventory.find((inv: any) => {
            const invCode = (inv.codeItem || '').toString().trim().toLowerCase();
            const invDesc = (inv.description || '').toLowerCase().trim();
            const searchCode = productCode.toLowerCase();
            const searchName = productName.toLowerCase().trim();
            return invCode === searchCode || invDesc === searchName;
          });

          if (!existingProductInventory) {
            existingProductInventory = inventory.find((inv: any) => {
              const invDesc = (inv.description || '').toLowerCase().trim();
              return invDesc === productName.toLowerCase().trim();
            });
          }
        }

        // ANTI-DUPLICATE: Cek apakah delivery ini sudah pernah diproses
        const deliveryKey = `DELIVERY_${delivery.id}`;

        if (existingProductInventory) {
          const processedDeliveries = existingProductInventory.processedDeliveries || [];
          if (processedDeliveries.includes(deliveryKey)) {
            continue; // Skip jika sudah diproses
          }

          // SET OUTGOING saat delivery note dibuat
          // outgoing = stock yang sedang dikirim (sudah dibuat SJ tapi belum diterima customer)
          const oldOutgoing = existingProductInventory.outgoing || 0;
          const newOutgoing = oldOutgoing + qtyDelivery;

          // Track delivery yang sudah diproses
          processedDeliveries.push(deliveryKey);

          existingProductInventory.outgoing = newOutgoing;
          existingProductInventory.processedDeliveries = processedDeliveries;
          existingProductInventory.lastUpdate = new Date().toISOString();
        } else {
          // Create new product inventory entry dengan outgoing
          const newInventoryEntry = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            supplierName: delivery.customer || '',
            codeItem: productCode,
            description: productName,
            kategori: product?.kategori || 'Product',
            satuan: product?.satuan || 'PCS',
            price: product?.hargaFg || product?.hargaSales || 0,
            stockPremonth: 0,
            receive: 0,
            outgoing: qtyDelivery, // SET outgoing saat delivery dibuat
            return: 0,
            onGoing: 0,
            on_going: 0,
            productionStock: 0,
            nextStock: 0,
            processedDeliveries: [deliveryKey],
            processedSPKs: [],
            lastUpdate: new Date().toISOString(),
          };
          inventory.push(newInventoryEntry);
        }
      }

      // Save updated inventory
      await storageService.set(StorageKeys.PACKAGING.INVENTORY, inventory);
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[DeliveryNote] Error setting onGoing:', error);
      }
      // Don't throw - let delivery note creation continue even if inventory update fails
    }
  };

  // Update inventory saat delivery note dibuat - TAMBAHKAN OUTGOING untuk product
  const updateInventoryFromDelivery = async (delivery: DeliveryNote) => {
    try {
      // Removed console.log for performance
      const inventory = await storageService.get<any[]>('inventory') || [];
      const productsList = await storageService.get<any[]>('products') || [];

      // Process items (new format) atau single product (old format)
      const itemsToProcess = delivery.items && delivery.items.length > 0
        ? delivery.items
        : delivery.product
          ? [{ product: delivery.product, qty: delivery.qty || 0 }]
          : [];

      // Removed console.log for performance

      if (itemsToProcess.length === 0) {
        // Removed console.warn for performance
        return;
      }

      for (const item of itemsToProcess) {
        const productName = item.product || '';
        const qtyDelivered = item.qty || 0;
        const fromInventory = item.fromInventory === true; // Explicit check untuk boolean

        // Removed console.log for performance

        if (!productName || qtyDelivered <= 0) {
          // Removed console.warn for performance
          continue;
        }

        // IMPORTANT: Setiap SJ yang sudah di-upload signed document WAJIB memotong inventory
        // Tidak peduli apakah manual input atau tidak, tetap update inventory (outgoing dan onGoing)
        // Jika manual input, tetap update inventory untuk tracking
        if (!fromInventory) {
          // Removed console.log for performance
        }

        // Find product dari master untuk mendapatkan product_id/kode
        // IMPORTANT: Setiap SJ yang sudah di-upload WAJIB update inventory, meskipun product tidak ditemukan di master
        // Jika tidak ditemukan, gunakan productName sebagai codeItem
        const product = productsList.find((p: any) => {
          const pName = (p.nama || '').toLowerCase().trim();
          const pCode = ((p.product_id || p.kode) || '').toString().toLowerCase().trim();
          const itemName = productName.toLowerCase().trim();
          return pName === itemName || pCode === itemName;
        });

        let productCode: string;
        if (!product) {
          // Removed console.warn for performance
          // Gunakan productName sebagai codeItem jika tidak ditemukan di master
          productCode = productName.trim();
        } else {
          productCode = (product.product_id || product.kode || '').toString().trim();
        }
        // Removed console.log for performance

        // Find product inventory - prioritas: gunakan inventoryId jika ada (dari selection)
        let existingProductInventory: any = null;

        if (item.inventoryId) {
          // Jika ada inventoryId, langsung gunakan itu (lebih akurat)
          existingProductInventory = inventory.find((inv: any) => inv.id === item.inventoryId);
          if (existingProductInventory) {
            // Removed console.log for performance
          }
        }

        // Fallback: coba match dengan berbagai cara
        if (!existingProductInventory) {
          existingProductInventory = inventory.find((inv: any) => {
            const invCode = (inv.codeItem || '').toString().trim().toLowerCase();
            const invDesc = (inv.description || '').toLowerCase().trim();
            const searchCode = productCode.toLowerCase();
            const searchName = productName.toLowerCase().trim();
            return invCode === searchCode || invDesc === searchName;
          });

          if (!existingProductInventory) {
            // Coba cari dengan nama product juga
            existingProductInventory = inventory.find((inv: any) => {
              const invDesc = (inv.description || '').toLowerCase().trim();
              return invDesc === productName.toLowerCase().trim();
            });
          }
        }

        // ANTI-DUPLICATE: Cek di inventory apakah SPK number sudah pernah diproses untuk product ini
        // SIMPLE: Gunakan SPK + delivery ID untuk unique tracking
        const spkNo = item.spkNo || delivery.spkNo || '';
        const deliverySpkKey = delivery.id && spkNo ? `DEL_${delivery.id}_${spkNo}` : spkNo;

        if (existingProductInventory) {
          // Update existing product inventory - TAMBAHKAN OUTGOING dan KURANGI ON GOING (production stock)
          const oldOutgoing = existingProductInventory.outgoing || 0;
          const oldOnGoing = existingProductInventory.onGoing || existingProductInventory.on_going || existingProductInventory.productionStock || 0;
          const newOutgoing = oldOutgoing + qtyDelivered;
          const newOnGoing = Math.max(0, oldOnGoing - qtyDelivered);

          // Track SPK untuk anti-duplicate
          const processedSPKs = existingProductInventory.processedSPKs || [];
          if (deliverySpkKey && !processedSPKs.includes(deliverySpkKey)) {
            processedSPKs.push(deliverySpkKey);
          }

          existingProductInventory.outgoing = newOutgoing;
          existingProductInventory.onGoing = newOnGoing;
          existingProductInventory.on_going = newOnGoing;
          existingProductInventory.productionStock = newOnGoing;
          existingProductInventory.processedSPKs = processedSPKs;
          existingProductInventory.nextStock =
            (existingProductInventory.stockPremonth || 0) +
            (existingProductInventory.receive || 0) -
            newOutgoing +
            (existingProductInventory.return || 0);
          existingProductInventory.lastUpdate = new Date().toISOString();
        } else {
          // Create new product inventory entry dengan outgoing
          const newInventoryEntry = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            supplierName: delivery.customer || '',
            codeItem: productCode,
            description: productName,
            kategori: product?.kategori || 'Product',
            satuan: product?.satuan || 'PCS',
            price: product?.hargaFg || product?.hargaSales || 0,
            stockPremonth: 0,
            receive: 0,
            outgoing: qtyDelivered,
            return: 0,
            onGoing: 0,
            on_going: 0,
            productionStock: 0,
            nextStock: 0 + 0 - qtyDelivered + 0,
            processedSPKs: deliverySpkKey ? [deliverySpkKey] : (spkNo ? [spkNo] : []),
            lastUpdate: new Date().toISOString(),
          };
          inventory.push(newInventoryEntry);
        }
      }

      // Save updated inventory
      await storageService.set(StorageKeys.PACKAGING.INVENTORY, inventory);
      // Removed console.log for performance
    } catch (error: any) {
      // Only log errors in development
      if (process.env.NODE_ENV === 'development') {
        // Removed console.error for performance
      }
      showAlert('Error', `Error updating inventory: ${error.message}`);
      throw error;
    }
  };

  // Transform scheduleData ke format ScheduleTable (sama seperti PPIC, tapi hanya untuk view)
  const transformedScheduleData = useMemo(() => {
    const result: any[] = [];

    // Ensure scheduleData is always an array
    const scheduleArray = Array.isArray(scheduleData) ? scheduleData : [];
    scheduleArray.forEach((schedule: any) => {
      // Find SPK berdasarkan spkNo atau soNo
      let spk = schedule.spkNo ? spkData.find((s: any) => s.spkNo === schedule.spkNo) : null;

      if (!spk && schedule.soNo) {
        const matchingSPKs = spkData.filter((s: any) => s.soNo === schedule.soNo);
        if (matchingSPKs.length > 0) {
          spk = matchingSPKs[0];
        }
      }

      if (!spk) return;

      // Cek apakah schedule ini punya batch
      const hasBatches = schedule.batches && schedule.batches.length > 0;

      if (hasBatches) {
        schedule.batches.forEach((batch: any) => {
          const deliveryBatch = schedule.deliveryBatches?.find((db: any) =>
            db.batchNo === batch.batchNo || (db.qty === batch.qty && !schedule.deliveryBatches?.find((d: any) => d.batchNo === batch.batchNo))
          );

          result.push({
            id: `${schedule.id}-batch-${batch.batchNo || batch.id}`,
            spkNo: schedule.spkNo || spk.spkNo,
            soNo: schedule.soNo || spk.soNo,
            customer: spk.customer || '',
            poCustomer: schedule.soNo || spk.soNo,
            code: spk.product_id || spk.kode || '',
            item: spk.product || '',
            quantity: batch.qty || 0,
            unit: 'PCS',
            scheduleDate: batch.scheduleStartDate || schedule.scheduleStartDate || '',
            scheduleStartDate: batch.scheduleStartDate || schedule.scheduleStartDate,
            scheduleEndDate: batch.scheduleEndDate || schedule.scheduleEndDate,
            scheduleDeliveryDate: deliveryBatch?.deliveryDate,
            status: spk.status || 'DRAFT',
            target: batch.qty || spk.qty || 0,
            progress: 0,
            remaining: batch.qty || spk.qty || 0,
            keterangan: batch.batchName || `Batch ${batch.batchNo || ''}`,
          });
        });
      } else {
        const deliveryBatch = schedule.deliveryBatches?.[0];

        result.push({
          id: schedule.id,
          spkNo: schedule.spkNo || spk.spkNo,
          soNo: schedule.soNo || spk.soNo,
          customer: spk.customer || '',
          poCustomer: schedule.soNo || spk.soNo,
          code: spk.product_id || spk.kode || '',
          item: spk.product || '',
          quantity: spk.qty || 0,
          unit: 'PCS',
          scheduleDate: schedule.scheduleStartDate || '',
          scheduleStartDate: schedule.scheduleStartDate,
          scheduleEndDate: schedule.scheduleEndDate,
          scheduleDeliveryDate: deliveryBatch?.deliveryDate,
          status: spk.status || 'DRAFT',
          target: spk.qty || 0,
          progress: schedule.progress || 0,
          remaining: (spk.qty || 0) - (schedule.progress || 0),
        });
      }
    });

    return result;
  }, [scheduleData, spkData]);

  const handleScheduleClick = (item: any) => {
    // Di Delivery Note, hanya view saja - tidak bisa edit
    // Bisa buka print/save to PDF
    showAlert('Schedule View Only', `SPK: ${item.spkNo}\nSO: ${item.soNo}\nProduct: ${item.item}\nQty: ${item.quantity} PCS\n\nUse "Save to PDF" button in Schedule Table to export.`);
  };

  const handleCreate = () => {
    setShowCreateDeliveryNoteDialog(true);
  };

  const handleSave = async () => {
    // Multi-SO mode: validate selected SOs
    if (enableMultiSO) {
      if (!formData.customer || selectedSOs.length === 0) {
        showAlert('Validation Error', 'Please select customer and at least one SO No');
        return;
      }

      // Validate all selected SOs have QC PASS/CLOSE
      try {
        const qcList = extractStorageValue(await storageService.get<any[]>('qc')) || [];
        const invalidSOs: string[] = [];

        for (const soNo of selectedSOs) {
          const qc = qcList.find((q: any) =>
            q.soNo === soNo &&
            (q.qcResult === 'PASS' || q.qcResult === 'PARTIAL') &&
            q.status === 'CLOSE'
          );
          if (!qc) {
            invalidSOs.push(soNo);
          }
        }

        // Packaging: skip QC blocking untuk multi-SO, lanjut ke proses normal

        // Collect all items from all selected SOs
        const allItems: DeliveryNoteItem[] = [];
        const soData = await storageService.get<any[]>('salesOrders') || [];
        const scheduleData = await storageService.get<any[]>('schedule') || [];

        for (const soNo of selectedSOs) {
          const so = soData.find((s: any) => s.soNo === soNo);
          if (so && so.items && Array.isArray(so.items)) {
            for (const item of so.items) {
              // Find QC for this SO and product
              const qc = qcList.find((q: any) =>
                q.soNo === soNo &&
                (q.qcResult === 'PASS' || q.qcResult === 'PARTIAL') &&
                q.status === 'CLOSE'
              );

              if (qc) {
                // Check if already delivered
                const deliveriesArray = Array.isArray(deliveries) ? deliveries : [];
                const existingDeliveries = deliveriesArray.filter((d: any) =>
                  (d.soNo === soNo || (d.soNos && d.soNos.includes(soNo))) &&
                  d.items?.some((di: any) => di.product === item.productName || di.product === item.product)
                );
                const totalDelivered = existingDeliveries.reduce((sum: number, d: any) => {
                  const deliveryItem = d.items?.find((di: any) => di.product === item.productName || di.product === item.product);
                  return sum + (deliveryItem?.qty || 0);
                }, 0);

                const availableQty = qc.qtyPassed || qc.qty || 0;
                const remainingQty = availableQty - totalDelivered;

                if (remainingQty > 0) {
                  // Find SPK for this SO and product
                  const scheduleArray = Array.isArray(scheduleData) ? scheduleData : [];
                  const spk = scheduleArray.find((s: any) =>
                    s.soNo === soNo &&
                    (s.product === item.productName || s.product === item.product || s.item === item.productName)
                  );

                  // Find product code from products list
                  const productData = products.find((p: any) =>
                    p.nama === (item.productName || item.product) ||
                    p.kode === item.productCode ||
                    p.product_id === item.productId
                  );

                  allItems.push({
                    spkNo: spk?.spkNo || '',
                    product: item.productName || item.product || 'Unknown',
                    productCode: productData?.kode || item.productCode || item.productSku || '',
                    qty: remainingQty,
                    unit: item.unit || 'PCS',
                    soNo: soNo, // Save SO number for this item
                  });
                }
              }
            }
          }
        }

        if (allItems.length === 0) {
          showAlert('Validation Error', 'No items available to deliver from selected SOs. All items may have been delivered already.');
          return;
        }

        // Generate random SJ number
        const now = new Date();
        const year = String(now.getFullYear()).slice(-2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const randomCode = Math.random().toString(36).substr(2, 5).toUpperCase();
        const sjNo = `SJ-${year}${month}${day}-${randomCode}`;
        const newDelivery: DeliveryNote = {
          id: Date.now().toString(),
          sjNo,
          soNo: selectedSOs[0] || '', // First SO for backward compatibility
          soNos: selectedSOs, // Multiple SOs
          customer: formData.customer || '',
          items: allItems,
          status: 'OPEN' as const,
          created: new Date().toISOString(),
          lastUpdate: new Date().toISOString(),
          timestamp: Date.now(),
          _timestamp: Date.now(),
        };

        // Load all deliveries from storage (including deleted ones)
        const allDeliveries = await storageService.get<DeliveryNote[]>('delivery') || [];
        const updated = [...allDeliveries, newDelivery];
        await storageService.set(StorageKeys.PACKAGING.DELIVERY, updated);
        // Filter out deleted items for local state
        const activeDeliveries = updated.filter(d => !d.deleted);
        setDeliveries(activeDeliveries);

        // IMPORTANT: SET OUTGOING saat delivery note dibuat (sebelum upload signed document)
        // outgoing = stock yang sedang dikirim (sudah dibuat SJ tapi belum diterima customer)
        await setOutgoingFromDelivery(newDelivery);

        setShowForm(false);
        setCustomerInputValue('');
        setSelectedSOs([]);
        setEnableMultiSO(false);
        setFormData({ soNo: '', customer: '', product: '', qty: 0 });
        showAlert('Success', `✅ Delivery Note created: ${sjNo}\n\nSO: ${selectedSOs.join(', ')}\nItems: ${allItems.length}\n\n📝 Please upload signed document to update inventory.`);
        return;
      } catch (error: any) {
        showAlert('Error', `Error creating Delivery Note: ${error.message}`);
        return;
      }
    }

    // Single SO mode - handle selected products from checklist or manual input
    if (!formData.soNo || !formData.customer) {
      showAlert('Validation Error', 'Please fill all required fields (SO No, Customer)');
      return;
    }

    try {
      // If products are selected from SO checklist, use those
      let deliveryItems: DeliveryNoteItem[] = [];
      if (selectedProducts.length > 0) {
        // Packaging: skip QC validation, hanya cek already delivered via existing deliveries
        const scheduleData = await storageService.get<any[]>('schedule') || [];

        for (const selectedProd of selectedProducts) {
          // Check if already delivered

          const deliveryQty = selectedProd.qty;
          if (deliveryQty <= 0) {
            continue; // Skip if invalid qty
          }

          // Find SPK for this SO and product
          const scheduleArray = Array.isArray(scheduleData) ? scheduleData : [];
          const spk = scheduleArray.find((s: any) =>
            s.soNo === formData.soNo &&
            (s.product === selectedProd.productName || s.item === selectedProd.productName)
          );

          deliveryItems.push({
            spkNo: spk?.spkNo || '',
            product: selectedProd.productName,
            productCode: selectedProd.productCode,
            qty: deliveryQty,
            unit: selectedProd.unit,
            fromInventory: true, // IMPORTANT: Dari SO/SPK berarti dari inventory (production stock)
            soNo: formData.soNo,
          });
        }

        if (deliveryItems.length === 0) {
          showAlert('Validation Error', 'No products available to deliver. All products may have been delivered already.');
          return;
        }
      } else {
        // Fallback to manual input (backward compatibility)
        if (!formData.product || !formData.qty || formData.qty <= 0) {
          showAlert('Validation Error', 'Please select products from SO or fill Product and Qty manually');
          return;
        }

        // Packaging: skip QC validation, hanya lakukan partial delivery handling terhadap SO
        const deliveriesArray = Array.isArray(deliveries) ? deliveries : [];
        const existingDeliveries = deliveriesArray.filter((d: any) =>
          d.soNo === formData.soNo && d.items?.some((item: any) => item.product === formData.product)
        );
        const totalDelivered = existingDeliveries.reduce((sum: number, d: any) => {
          const item = d.items?.find((item: any) => item.product === formData.product);
          return sum + (item?.qty || 0);
        }, 0);

        const remainingQty = (formData.qty || 0) - totalDelivered;

        if (remainingQty <= 0) {
          showAlert(
            'Validation Error',
            'No remaining quantity to deliver for this product (already fully delivered).'
          );
          return;
        }

        deliveryItems = [{
          product: formData.product || '',
          qty: remainingQty,
          unit: 'PCS',
          soNo: formData.soNo,
        }];
      }

      // Generate random SJ number
      const now = new Date();
      const year = String(now.getFullYear()).slice(-2);
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const randomCode = Math.random().toString(36).substr(2, 5).toUpperCase();
      const sjNo = `SJ-${year}${month}${day}-${randomCode}`;
      const newDelivery: DeliveryNote = {
        id: Date.now().toString(),
        sjNo,
        soNo: formData.soNo || '',
        customer: formData.customer || '',
        items: deliveryItems,
        status: 'OPEN' as const,
        created: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
        timestamp: Date.now(),
        _timestamp: Date.now(),
      };

      // Load all deliveries from storage (including deleted ones)
      const allDeliveries = await storageService.get<DeliveryNote[]>('delivery') || [];
      const updated = [...allDeliveries, newDelivery];
      await storageService.set(StorageKeys.PACKAGING.DELIVERY, updated);
      // Filter out deleted items for local state
      const activeDeliveries = updated.filter(d => !d.deleted);
      setDeliveries(activeDeliveries);

      // IMPORTANT: SET OUTGOING saat delivery note dibuat (sebelum upload signed document)
      // outgoing = stock yang sedang dikirim (sudah dibuat SJ tapi belum diterima customer)
      await setOutgoingFromDelivery(newDelivery);

      // Log activity
      try {
        await logCreate('DELIVERY_NOTE', newDelivery.id, '/packaging/delivery-note', {
          sjNo: newDelivery.sjNo,
          soNo: newDelivery.soNo,
          customer: newDelivery.customer,
          itemCount: deliveryItems.length,
        });
      } catch (logError) {
        // Silent fail
      }

      // IMPORTANT: Inventory update hanya dilakukan setelah upload SJ (di handleUploadSignedDocument)
      // Jangan update inventory saat create delivery note

      setShowForm(false);
      setCustomerInputValue('');
      setSoInputValue('');
      setQtyInputValue('');
      setSelectedProducts([]);
      setSoProducts([]);
      setFormData({ soNo: '', customer: '', product: '', qty: 0 });
      const itemCount = deliveryItems.length;
      const totalQty = deliveryItems.reduce((sum, item) => sum + (item.qty || 0), 0);
      showAlert('Success', `✅ Delivery Note created: ${sjNo}\n\nItems: ${itemCount} product(s)\nTotal Qty: ${totalQty} PCS\n✅ Inventory updated (outgoing)`);
    } catch (error: any) {
      showAlert('Error', `Error creating Delivery Note: ${error.message}`);
    }
  };

  const handleGenerateSJ = async (item: DeliveryNote) => {
    showConfirm(
      'Generate Surat Jalan',
      `Generate Surat Jalan for SO: ${item.soNo}?`,
      async () => {
        try {
          // Generate random SJ number
          const now = new Date();
          const year = String(now.getFullYear()).slice(-2);
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const randomCode = Math.random().toString(36).substr(2, 5).toUpperCase();
          const sjNo = `SJ-${year}${month}${day}-${randomCode}`;
          // Load all deliveries from storage (including deleted ones)
          const allDeliveries = await storageService.get<DeliveryNote[]>('delivery') || [];
          const updated = allDeliveries.map(d =>
            d.id === item.id ? {
              ...d,
              sjNo: sjNo,
              status: 'OPEN' as const,
              lastUpdate: new Date().toISOString(),
              timestamp: Date.now(),
              _timestamp: Date.now(),
            } : d
          );
          await storageService.set(StorageKeys.PACKAGING.DELIVERY, updated);
          // Filter out deleted items for local state
          const activeDeliveries = updated.filter(d => !d.deleted);
          setDeliveries(activeDeliveries);
          
          // 🔴 CRITICAL FIX: Update inventory IMMEDIATELY when SJ is created (not when signed doc uploaded)
          // This reduces product stock from inventory as soon as SJ is generated
          const updatedItem = updated.find(d => d.id === item.id);
          if (updatedItem) {
            try {
              await updateInventoryFromDelivery(updatedItem);
              showAlert('Success', `✅ Surat Jalan generated: ${sjNo}\n✅ Inventory updated (product stock reduced)`);
            } catch (inventoryError: any) {
              // Log error but don't block SJ creation
              showAlert('Warning', `✅ Surat Jalan generated: ${sjNo}\n⚠️ Inventory update failed: ${inventoryError.message}`);
            }
          } else {
            showAlert('Success', 'Surat Jalan generated');
          }
        } catch (error: any) {
          showAlert('Error', `Error generating SJ: ${error.message}`);
        }
      }
    );
  };

  const handleEditSJ = (item: DeliveryNote) => {
    setSelectedDelivery(item);
  };

  const handleViewSignedDocument = async (item: DeliveryNote) => {
    if (!item.signedDocument && !item.signedDocumentPath) {
      showAlert('Error', 'No signed document available');
      return;
    }

    try {
      const fileName = item.signedDocumentName || '';
      let signedDocument = item.signedDocument || '';

      // Jika file disimpan sebagai path (PDF yang besar), load dari file system
      if (item.signedDocumentPath) {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI && typeof electronAPI.loadUploadedFile === 'function') {
          try {
            const result = await electronAPI.loadUploadedFile(item.signedDocumentPath);
            if (result && result.success) {
              signedDocument = result.data || '';
            } else {
              throw new Error(result?.error || 'Failed to load file from file system');
            }
          } catch (loadError: any) {
            showAlert('Error', `Gagal memuat file: ${loadError.message}`);
            return;
          }
        } else if (isMobile() || isCapacitor()) {
          // Di mobile, file yang disimpan sebagai path tidak bisa di-load
          // Tapi seharusnya di mobile file disimpan sebagai base64, jadi ini tidak seharusnya terjadi
          showAlert('Error', 'File disimpan sebagai file system path, tetapi tidak bisa diakses di mobile.\n\nFile ini mungkin dibuat di aplikasi desktop. Silakan buka di aplikasi desktop untuk melihat file.');
          return;
        } else {
          showAlert('Error', 'File disimpan sebagai file system, tetapi Electron API tidak tersedia.');
          return;
        }
      }

      if (!signedDocument) {
        showAlert('Error', 'No document data available');
        return;
      }

      // Deteksi tipe file
      const isPDF = fileName.toLowerCase().endsWith('.pdf') ||
        signedDocument.startsWith('data:application/pdf') ||
        item.signedDocumentType === 'pdf' ||
        (signedDocument.length > 100 && signedDocument.substring(0, 100).includes('JVBERi0')); // PDF magic bytes

      // Normalize data URI format
      if (!signedDocument.startsWith('data:')) {
        // Assume it's base64, need to determine MIME type
        if (isPDF) {
          signedDocument = `data:application/pdf;base64,${signedDocument}`;
        } else {
          // Assume image
          signedDocument = `data:image/jpeg;base64,${signedDocument}`;
        }
      }

      // Untuk PDF, langsung download saja (lebih reliable)
      if (isPDF) {
        // Langsung trigger download
        handleDownloadSignedDocument(item);
        return;
      } else {
        // Untuk image, gunakan modal viewer
        setSignatureViewer({
          data: signedDocument,
          fileName: fileName || 'Signed Document',
          isPDF: isPDF,
          blobUrl: undefined
        });
      }
    } catch (error: any) {
      showAlert('Error', `Error viewing document: ${error.message}`);
    }
  };

  const closeSignatureViewer = () => {
    // Cleanup blob URL jika ada (meskipun sekarang tidak digunakan)
    if (signatureViewer?.blobUrl) {
      URL.revokeObjectURL(signatureViewer.blobUrl);
    }
    setSignatureViewer(null);
  };

  const handleDownloadSignedDocument = async (item: DeliveryNote) => {
    if (!item.signedDocument && !item.signedDocumentPath && !item.serverSignedDocumentPath) {
      showAlert('Error', 'No signed document available');
      return;
    }

    try {
      // Priority 1: Download dari server jika ada (file PDF langsung, bukan base64)
      if (item.serverSignedDocumentPath) {
        const config = storageService.getConfig();
        if (config.serverUrl) {
          const serverFileName = item.serverSignedDocumentName || item.serverSignedDocumentPath.split('/').pop() || 'document.pdf';
          const downloadUrl = `${config.serverUrl}/api/storage/file/${serverFileName}`;

          // Download langsung dari server sebagai file PDF
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = item.signedDocumentName || `SJ-${item.sjNo}-signed.pdf`;
          link.target = '_blank'; // Open in new tab as fallback
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          return;
        }
      }

      // Priority 2: Load dari local file system jika ada
      let signedDocument = item.signedDocument || '';

      if (item.signedDocumentPath) {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI && typeof electronAPI.loadUploadedFile === 'function') {
          try {
            const result = await electronAPI.loadUploadedFile(item.signedDocumentPath);
            if (result && result.success) {
              signedDocument = result.data || '';
            } else {
              throw new Error(result?.error || 'Failed to load file from file system');
            }
          } catch (loadError: any) {
            showAlert('Error', `Gagal memuat file: ${loadError.message}`);
            return;
          }
        } else if (isMobile() || isCapacitor()) {
          // Di mobile, file yang disimpan sebagai path tidak bisa di-load
          showAlert('Error', 'File disimpan sebagai file system path, tetapi tidak bisa diakses di mobile.\n\nFile ini mungkin dibuat di aplikasi desktop. Silakan buka di aplikasi desktop untuk download file.');
          return;
        } else {
          showAlert('Error', 'File disimpan sebagai file system, tetapi Electron API tidak tersedia.');
          return;
        }
      }

      if (!signedDocument) {
        showAlert('Error', 'No document data available');
        return;
      }

      // Deteksi tipe file
      const isPDF = item.signedDocumentName?.toLowerCase().endsWith('.pdf') ||
        signedDocument.startsWith('data:application/pdf') ||
        item.signedDocumentType === 'pdf';

      // Extract base64 data (remove data URL prefix jika ada)
      let base64Data = signedDocument;
      let mimeType = 'image/png';

      if (base64Data && base64Data.includes(',')) {
        // Ada data URL prefix (data:image/png;base64,... atau data:application/pdf;base64,...)
        const parts = base64Data.split(',');
        base64Data = parts[1] || '';
        const mimeMatch = parts[0].match(/data:([^;]+)/);
        if (mimeMatch) {
          mimeType = mimeMatch[1];
        }
      }

      if (!base64Data) {
        showAlert('Error', 'No document data available');
        return;
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

      // Determine file extension
      let extension = 'png';
      if (isPDF || mimeType.includes('pdf')) {
        extension = 'pdf';
      } else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
        extension = 'jpg';
      } else if (mimeType.includes('png')) {
        extension = 'png';
      }

      link.download = item.signedDocumentName || `SJ-${item.sjNo}-signed.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      showAlert('Error', `Error downloading document: ${error.message}`);
    }
  };

  const handleUploadSignedDocument = async (item: DeliveryNote, file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;

        // Deteksi tipe file
        const isPDF = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
        const fileType: 'pdf' | 'image' = isPDF ? 'pdf' : 'image';

        // Untuk PDF, simpan sebagai file di file system (karena terlalu besar untuk localStorage)
        // Untuk image, tetap simpan sebagai base64 (lebih kecil)
        let signedDocument: string;
        let signedDocumentPath: string | undefined;

        if (isPDF) {
          // PDF: Simpan sebagai file di Electron, atau base64 di mobile jika kecil
          const electronAPI = (window as any).electronAPI;

          // Cek apakah Electron API tersedia
          if (electronAPI && typeof electronAPI.saveUploadedFile === 'function') {
            // Electron: Simpan sebagai file di file system
            try {
              const result = await electronAPI.saveUploadedFile(base64, file.name, 'pdf');
              if (result && result.success) {
                signedDocumentPath = result.path;
                // Simpan path sebagai reference, bukan base64
                signedDocument = `file://${result.path}`;
              } else {
                throw new Error(result?.error || 'Failed to save PDF file');
              }
            } catch (fileError: any) {
              // Cek apakah error karena handler tidak terdaftar
              const errorMessage = fileError.message || String(fileError);
              if (errorMessage.includes('No handler registered') ||
                errorMessage.includes('handler registered') ||
                errorMessage.includes('Error invoking remote method')) {
                throw new Error('⚠️ Handler Electron belum terdaftar.\n\nSilakan:\n1. Tutup aplikasi Electron (tutup semua window)\n2. Buka kembali aplikasi Electron dari shortcut/start menu\n3. Tunggu aplikasi selesai loading\n4. Coba upload PDF lagi\n\nJika masih error, hubungi administrator.');
              }

              // Jangan fallback ke base64 untuk PDF - langsung error atau retry
              // PDF harus disimpan di file system, tidak boleh di localStorage
              throw new Error(`❌ Gagal menyimpan PDF ke file system.\n\nError: ${errorMessage}\n\nSilakan:\n1. Restart aplikasi Electron\n2. Pastikan folder data/uploads bisa diakses\n3. Coba upload lagi`);
            }
          } else if (isMobile() || isCapacitor()) {
            // Mobile/Capacitor: Simpan sebagai base64 jika file kecil (< 5MB)
            // Untuk file besar, show error
            const base64Size = base64.length;
            const maxSize = 5 * 1024 * 1024; // 5MB

            if (base64Size < maxSize) {
              // File kecil, simpan sebagai base64
              signedDocument = base64;
              signedDocumentPath = undefined;
            } else {
              throw new Error('⚠️ File PDF terlalu besar untuk disimpan di mobile.\n\nUkuran file: ' +
                Math.round(base64Size / 1024 / 1024) + 'MB\n\nMaksimal ukuran: 5MB\n\nSilakan gunakan file PDF yang lebih kecil atau gunakan aplikasi desktop.');
            }
          } else {
            // Browser mode: coba simpan sebagai base64 jika kecil
            const base64Size = base64.length;
            const maxSize = 5 * 1024 * 1024; // 5MB

            if (base64Size < maxSize) {
              signedDocument = base64;
              signedDocumentPath = undefined;
            } else {
              throw new Error('⚠️ File PDF terlalu besar untuk disimpan di browser.\n\nUkuran file: ' +
                Math.round(base64Size / 1024 / 1024) + 'MB\n\nMaksimal ukuran: 5MB\n\nSilakan gunakan aplikasi Electron desktop untuk file besar.');
            }
          }
        } else {
          // Image: Simpan sebagai base64 (biasanya lebih kecil)
          signedDocument = base64;
          signedDocumentPath = undefined;
        }

        // Update delivery dengan signed document dan status CLOSE
        // Load all deliveries from storage (including deleted ones)
        const allDeliveries = await storageService.get<DeliveryNote[]>('delivery') || [];
        const updated = allDeliveries.map(d =>
          d.id === item.id
            ? {
              ...d,
              // Jika PDF sudah disimpan di file system, jangan simpan base64 di storage
              signedDocument: signedDocumentPath ? undefined : signedDocument,
              signedDocumentPath: signedDocumentPath, // Simpan path untuk PDF
              signedDocumentName: file.name,
              signedDocumentType: fileType, // Simpan tipe file
              status: 'CLOSE' as const,
              receivedDate: new Date().toISOString().split('T')[0],
            }
            : d
        );

        // Save ke local storage dulu (tidak blocking)
        // Sync ke server akan dilakukan di background oleh auto-sync
        try {
          await storageService.set(StorageKeys.PACKAGING.DELIVERY, updated);
        } catch (storageError: any) {
          // Jika save ke storage gagal karena quota, coba handle khusus
          if (storageError.message?.includes('quota') || storageError.message?.includes('exceeded')) {
            // Jika PDF sudah disimpan di file system, kita bisa skip signedDocument di storage
            if (signedDocumentPath) {
              // Simpan tanpa signedDocument (hanya path)
              const updatedWithoutBase64 = allDeliveries.map(d =>
                d.id === item.id
                  ? {
                    ...d,
                    signedDocument: undefined, // Hapus base64 jika ada
                    signedDocumentPath: signedDocumentPath,
                    signedDocumentName: file.name,
                    signedDocumentType: fileType,
                    status: 'CLOSE' as const,
                    receivedDate: new Date().toISOString().split('T')[0],
                  }
                  : d
              );
              await storageService.set(StorageKeys.PACKAGING.DELIVERY, updatedWithoutBase64);
              // Update local state
              const activeDeliveries = updatedWithoutBase64.filter(d => !d.deleted);
              setDeliveries(activeDeliveries);
              return; // Exit early
            } else {
              throw new Error('Storage quota exceeded. Silakan hapus beberapa data lama atau hubungi administrator.');
            }
          }
          throw storageError; // Re-throw error lainnya
        }

        // Update local state langsung (tidak perlu tunggu sync)
        const activeDeliveries = updated.filter(d => !d.deleted);
        setDeliveries(activeDeliveries);

        // Pastikan updated item ada di activeDeliveries dengan signedDocumentPath
        const uploadedDelivery = activeDeliveries.find(d => d.id === item.id);
        if (uploadedDelivery && (uploadedDelivery.signedDocument || uploadedDelivery.signedDocumentPath)) {
          showAlert('Success', `✅ Signed document uploaded successfully!\n\nFile: ${file.name}\n\nTombol "View Signed Doc" sekarang tersedia di action menu.`);
        }

        // IMPORTANT: Hapus notification HANYA setelah signed document di-upload (SJ sudah jadi)
        // Cari notification yang terkait dengan delivery note ini berdasarkan SPK
        const deliveryNotifications = await storageService.get<any[]>('deliveryNotifications') || [];
        const deliveryItems = uploadedDelivery?.items || [];
        const deliverySpkNos = deliveryItems.map((item: any) => item.spkNo).filter(Boolean);

        // Cari notification yang match dengan delivery note ini
        // Match berdasarkan SPK yang ada di delivery items
        const updatedNotifications = deliveryNotifications.map((n: any) => {
          const notifSpkNo = n.spkNo || (n.spkNos && n.spkNos.length > 0 ? n.spkNos[0] : null);

          // Match jika SPK ada di delivery items
          const spkMatches = deliverySpkNos.some((deliverySpk: string) => {
            if (!deliverySpk || !notifSpkNo) return false;
            const normalize = (spk: string) => String(spk).trim().toLowerCase().replace(/-/g, '/');
            return normalize(deliverySpk) === normalize(notifSpkNo);
          });

          // Jika SPK match, mark notification sebagai DELIVERY_CREATED dan deleted
          if (spkMatches && n.status !== 'DELIVERY_CREATED' && !n.deleted) {
            // Removed console.log for performance
            // console.log(`  ✅ Marking notification ${n.id} (SPK: ${notifSpkNo}, sjGroupId: ${notifSjGroupId || 'null'}) as deleted (SJ ${deliverySjNo} completed with signed document)`);
            return {
              ...n,
              status: 'DELIVERY_CREATED',
              deleted: true,
              deletedAt: new Date().toISOString()
            };
          }
          return n;
        });

        // Save updated notifications
        // Set flag untuk prevent storage event trigger loop
        isSavingNotificationsRef.current = true;
        try {
          await storageService.set(StorageKeys.PACKAGING.DELIVERY_NOTIFICATIONS, updatedNotifications);
        } finally {
          // Reset flag setelah delay untuk allow processing
          setTimeout(() => {
            isSavingNotificationsRef.current = false;
          }, 500);
        }

        // Sync ke server di background (non-blocking, tidak throw error jika gagal)
        setTimeout(() => {
          storageService.syncToServer().catch(() => {
            // Silent fail - sync akan dicoba lagi oleh auto-sync
            // Tidak perlu log error karena auto-sync akan handle retry
          });
        }, 100);

        // IMPORTANT: Update inventory HANYA setelah upload SJ (signed document)
        // IMPORTANT: Inventory sudah di-update saat SJ di-create (di handleGenerateSJ)
        // Upload signed document hanya untuk dokumentasi, tidak perlu update inventory lagi
        // Jangan update inventory di sini untuk avoid double counting

        // IMPORTANT: Finance notification (SUPPLIER_PAYMENT) hanya dibuat saat GRN dibuat di Purchasing module
        // Upload signed document di Delivery Note hanya untuk membuat invoice notification, bukan payment notification

        // IMPORTANT: SJ Recap tidak trigger invoice notification
        // Invoice punya cara sendiri untuk merge data dari SJ
        // SJ Recap hanya untuk merge print, tidak mempengaruhi invoice flow
        let alertMsg = `✅ Surat Jalan (yang sudah di TTD) uploaded: ${file.name}\n\n✅ Status updated to CLOSE`;

        // 🚀 FIX: Defer invoice notification creation to avoid flicker
        // Show alert immediately, then create notification in background
        showAlert('Success', alertMsg);

        // Create invoice notification in background (non-blocking)
        if (!item.isRecap) {
          // Defer to next tick to avoid blocking the alert display
          setTimeout(async () => {
            try {
              // Create notification untuk Accounting - Customer Invoice (HANYA untuk non-Recap SJ)
              // IMPORTANT: Ambil SPK hanya dari items di SJ, bukan semua SPK dari SO
              // Setiap SJ punya items sendiri, jadi SPK juga harus sesuai dengan items di SJ tersebut
              const itemsInSJ = item.items && Array.isArray(item.items) && item.items.length > 0
                ? item.items
                : (item.product ? [{ product: item.product, qty: item.qty || 0, unit: 'PCS', spkNo: item.spkNo }] : []);

              // Ambil SPK hanya dari items di SJ
              const spkNosFromSJ = itemsInSJ
                .map((itm: any) => itm.spkNo)
                .filter((spk: string) => spk) // Filter yang ada spkNo
                .join(', ');

              // Cari SO untuk mendapatkan PO Customer No
              const salesOrders = await storageService.get<any[]>('salesOrders') || [];
              const so = salesOrders.find((s: any) => s.soNo === item.soNo);
              const poCustomerNo = so?.poCustomerNo || so?.soNo || '-';

              // 🚀 FIX: Use extractStorageValue like Purchasing does for GRN → Payment
              const allInvoiceNotificationsRaw = await storageService.get<any[]>('invoiceNotifications') || [];
              const allInvoiceNotifications = extractStorageValue(allInvoiceNotificationsRaw);
              
              const newInvoiceNotification = {
                id: `${Date.now()}-${item.sjNo}`,
                type: 'CUSTOMER_INVOICE',
                sjNo: item.sjNo,
                soNo: item.soNo,
                poCustomerNo: poCustomerNo,
                spkNos: spkNosFromSJ, // Hanya SPK dari items di SJ, bukan semua SPK dari SO
                customer: item.customer,
                items: itemsInSJ, // Items sesuai dengan SJ
                totalQty: itemsInSJ.reduce((sum: number, itm: any) => sum + (itm.qty || 0), 0),
                status: 'PENDING',
                created: new Date().toISOString(),
              };

              // Update notifications - hanya invoice notification (finance notification dibuat saat GRN di Purchasing)
              await storageService.set(StorageKeys.PACKAGING.INVOICE_NOTIFICATIONS, [...allInvoiceNotifications, newInvoiceNotification]);
            } catch (error) {
              console.error('[DeliveryNote] Error creating invoice notification:', error);
            }
          }, 0);
        }
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      showAlert('Error', `Error uploading document: ${error.message}`);
    }
  };


  const generateSuratJalanHtmlContent = async (item: DeliveryNote): Promise<string> => {
    // Load customer data untuk mendapatkan alamat, PIC, dan telepon
    const customerData = customers.find(c => c.nama === item.customer);
    const customerName = item.customer || '-';
    const customerPIC = customerData?.kontak || '-';
    const customerPhone = customerData?.telepon || '-';
    const customerAddress = customerData?.alamat || '-';

    // Load SO data untuk mendapatkan specNote dan items
    const soData = salesOrders.find(so => so.soNo === item.soNo);
    const specNote = soData?.globalSpecNote || soData?.specNote || '';

    // Prepare SO lines dari delivery items
    // Ambil nama item dari SPK no dan Product di delivery items
    const soLines: Array<{ itemSku?: string; qty?: string | number; spkNo?: string; productName?: string }> = [];
    if (item.items && Array.isArray(item.items) && item.items.length > 0) {
      item.items.forEach((itm: any) => {
        // Cari product dari master berdasarkan nama product
        const productData = products.find((p: any) =>
          p.nama === itm.product ||
          p.sku === itm.product ||
          p.id === itm.product ||
          (p.kode && p.kode === itm.product)
        );
        const itemSku = productData?.sku || productData?.kode || productData?.id || itm.product || '';
        // Ambil nama item dari product di delivery items
        const productName = itm.product || '';
        soLines.push({
          itemSku,
          qty: itm.qty || 0,
          spkNo: itm.spkNo || '',
          productName: productName,
        });
      });
    } else {
      // Fallback untuk old format
      const productData = products.find((p: any) =>
        p.nama === item.product ||
        p.sku === item.product ||
        p.id === item.product
      );
      const itemSku = productData?.sku || productData?.kode || productData?.id || item.product || '';
      soLines.push({
        itemSku,
        qty: item.qty || 0,
        productName: item.product || '',
      });
    }

    // Get main product qty (total dari semua items atau fallback ke qty)
    const qtyProduced = item.items && Array.isArray(item.items) && item.items.length > 0
      ? item.items.reduce((sum: number, itm: any) => sum + (itm.qty || 0), 0)
      : (item.qty || 0);

    // Load company info from settings
    const companySettings = await storageService.get<{ companyName: string; address: string }>('companySettings');
    const company = {
      companyName: companySettings?.companyName || 'PT TRIMA LAKSANA JAYA PRATAMA',
      address: companySettings?.address || 'Jl. Raya Bekasi Km. 28, Cikarang, Bekasi 17530',
    };

    // Logo menggunakan logo-loader utility untuk kompatibilitas development, production, dan Electron
    // Support noxtiz.png, noxtiz.ico, dan Logo.gif
    let logo = await loadLogoAsBase64();

    // Prepare item object untuk template
    // IMPORTANT: Jangan gunakan qtyProduced (total) untuk baris pertama
    // Gunakan soLines[0].qty untuk baris pertama, dan soLines.slice(1) untuk extra rows
    const suratJalanItem = {
      soNo: item.soNo || '',
      soNos: item.soNos || [], // Pass soNos untuk SJ Recap
      customer: customerName,
      customerPIC,
      customerPhone,
      customerAddress,
      product: item.items && item.items.length > 0 ? item.items[0].product : (item.product || ''),
      qtyProduced: soLines.length > 0 ? String(soLines[0].qty || 0) : String(qtyProduced), // Gunakan qty dari soLines[0], bukan total
      specNote,
      soLines, // Semua items dengan qty masing-masing
      items: item.items || [], // Pass items array untuk keterangan
    };

    // Prepare SJ data
    const sjData = {
      sjNo: item.sjNo || '',
      sjDate: item.deliveryDate || new Date().toISOString(),
      driver: item.driver || '',
      vehicleNo: item.vehicleNo || '',
    };

    // Generate HTML using template
    // Pass productCodeDisplay dari delivery note ke template
    const itemWithDisplay = {
      ...suratJalanItem,
      productCodeDisplay: item.productCodeDisplay || 'padCode',
    };

    // Use recap template if this is a recap SJ
    if (item.isRecap) {
      return generateSuratJalanRecapHtml({
        logo,
        company,
        item: itemWithDisplay,
        sjData,
        products,
      });
    }

    return generateSuratJalanHtml({
      logo,
      company,
      item: itemWithDisplay,
      sjData,
      products,
    });
  };

  const handleViewDetail = async (item: DeliveryNote) => {
    try {
      const html = await generateSuratJalanHtmlContent(item);
      setViewingDeliveryItem(item);
      setViewPdfData({ html, sjNo: item.sjNo || '', sjDate: item.deliveryDate });
    } catch (error: any) {
      showAlert('Error', `Error generating Surat Jalan preview: ${error.message}`);
    }
  };

  const handleSaveToPDF = async (pageSize: PageSize = 'A5') => {
    if (!viewPdfData) return;

    try {
      const electronAPI = (window as any).electronAPI;
      
      // Format filename: sj_SJ123_02092026.pdf
      let fileName = `${viewPdfData.sjNo}.pdf`;
      if (viewPdfData.sjDate) {
        try {
          const date = new Date(viewPdfData.sjDate);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          const dateStr = `${day}${month}${year}`;
          fileName = `sj_${viewPdfData.sjNo}_${dateStr}.pdf`;
        } catch (e) {
          // Fallback to simple format if date parsing fails
          fileName = `sj_${viewPdfData.sjNo}.pdf`;
        }
      } else {
        fileName = `sj_${viewPdfData.sjNo}.pdf`;
      }

      // Check if Electron API is available (for file picker)
      if (electronAPI && typeof electronAPI.savePdf === 'function') {
        // Electron: Use file picker to select save location, then convert HTML to PDF and save
        const result = await electronAPI.savePdf(viewPdfData.html, fileName, pageSize);
        if (result.success) {
          showAlert('Success', `PDF saved successfully to:\n${result.path}`);
          setViewPdfData(null);
          closeDialog();
        } else if (!result.canceled) {
          showAlert('Error', `Error saving PDF: ${result.error || 'Unknown error'}`);
        }
        // If canceled, do nothing (user closed dialog)
      } else if (isMobile() || isCapacitor()) {
        // Mobile/Capacitor: Use Web Share API or print dialog
        await savePdfForMobile(
          viewPdfData.html,
          fileName,
          (message) => {
            showAlert('Success', message);
            setViewPdfData(null); // Close view setelah save
            closeDialog();
          },
          (message) => showAlert('Error', message)
        );
      } else {
        // Browser: Open print dialog, user can select "Save as PDF"
        openPrintWindow(viewPdfData.html);
      }
    } catch (error: any) {
      showAlert('Error', `Error saving PDF: ${error.message}`);
    }
  };

  const handleShowPageSizeDialog = () => {
    setShowPageSizeDialog(true);
  };

  const handlePrint = async (item: DeliveryNote) => {
    try {
      // Jika ini adalah recap SJ, tampilkan template selection dialog
      if (item.isRecap) {
        setPendingPrintItem(item);
        setShowTemplateSelectionDialog(true);
      } else {
        // Untuk non-recap, langsung print dengan template standar
        const html = await generateSuratJalanHtmlContent(item);
        openPrintWindow(html);
      }
    } catch (error: any) {
      showAlert('Error', `Error generating print preview: ${error.message}`);
    }
  };

  const handleTemplateSelected = async (templateId: number) => {
    if (!pendingPrintItem) return;
    
    try {
      setSelectedTemplate(templateId);
      
      // Untuk recap SJ, gunakan template selection
      if (pendingPrintItem.isRecap) {
        const html = await generateSuratJalanHtmlContentWithTemplate(pendingPrintItem, templateId);
        openPrintWindow(html);
      } else {
        const html = await generateSuratJalanHtmlContent(pendingPrintItem);
        openPrintWindow(html);
      }
      
      setPendingPrintItem(null);
    } catch (error: any) {
      showAlert('Error', `Error generating print preview: ${error.message}`);
    }
  };

  const handleChangeTemplateInView = async (templateId: number) => {
    if (!viewingDeliveryItem) return;
    
    try {
      setSelectedTemplate(templateId);
      
      // Jika recap SJ, gunakan template selection
      if (viewingDeliveryItem.isRecap) {
        const html = await generateSuratJalanHtmlContentWithTemplate(viewingDeliveryItem, templateId);
        setViewPdfData({ html, sjNo: viewingDeliveryItem.sjNo || '', sjDate: viewingDeliveryItem.deliveryDate });
      } else {
        const html = await generateSuratJalanHtmlContent(viewingDeliveryItem);
        setViewPdfData({ html, sjNo: viewingDeliveryItem.sjNo || '', sjDate: viewingDeliveryItem.deliveryDate });
      }
    } catch (error: any) {
      showAlert('Error', `Error changing template: ${error.message}`);
    }
  };

  const generateSuratJalanHtmlContentWithTemplate = async (item: DeliveryNote, templateId: number): Promise<string> => {
    // Load customer data untuk mendapatkan alamat, PIC, dan telepon
    const customerData = customers.find(c => c.nama === item.customer);
    const customerName = item.customer || '-';
    const customerPIC = customerData?.kontak || '-';
    const customerPhone = customerData?.telepon || '-';
    const customerAddress = customerData?.alamat || '-';

    // Load SO data untuk mendapatkan specNote dan items
    const soData = salesOrders.find(so => so.soNo === item.soNo);
    const specNote = soData?.globalSpecNote || soData?.specNote || '';

    // Prepare SO lines dari delivery items
    const soLines: Array<{ itemSku?: string; qty?: string | number; spkNo?: string; productName?: string }> = [];
    if (item.items && Array.isArray(item.items) && item.items.length > 0) {
      item.items.forEach((itm: any) => {
        const productData = products.find((p: any) =>
          p.nama === itm.product ||
          p.sku === itm.product ||
          p.id === itm.product ||
          (p.kode && p.kode === itm.product)
        );
        const itemSku = productData?.sku || productData?.kode || productData?.id || itm.product || '';
        const productName = itm.product || '';
        soLines.push({
          itemSku,
          qty: itm.qty || 0,
          spkNo: itm.spkNo || '',
          productName: productName,
        });
      });
    } else {
      const productData = products.find((p: any) =>
        p.nama === item.product ||
        p.sku === item.product ||
        p.id === item.product
      );
      const itemSku = productData?.sku || productData?.kode || productData?.id || item.product || '';
      soLines.push({
        itemSku,
        qty: item.qty || 0,
        productName: item.product || '',
      });
    }

    const qtyProduced = item.items && Array.isArray(item.items) && item.items.length > 0
      ? item.items.reduce((sum: number, itm: any) => sum + (itm.qty || 0), 0)
      : (item.qty || 0);

    const companySettings = await storageService.get<{ companyName: string; address: string }>('companySettings');
    const company = {
      companyName: companySettings?.companyName || 'PT TRIMA LAKSANA JAYA PRATAMA',
      address: companySettings?.address || 'Jl. Raya Bekasi Km. 28, Cikarang, Bekasi 17530',
    };

    let logo = await loadLogoAsBase64();

    const suratJalanItem = {
      soNo: item.soNo || '',
      soNos: item.soNos || [],
      customer: customerName,
      customerPIC,
      customerPhone,
      customerAddress,
      product: item.items && item.items.length > 0 ? item.items[0].product : (item.product || ''),
      qtyProduced: soLines.length > 0 ? String(soLines[0].qty || 0) : String(qtyProduced),
      specNote,
      soLines,
      items: item.items || [],
      sjList: (item as any).mergedSjNos || [], // Pass merged SJ numbers untuk template
    };

    const sjData = {
      sjNo: item.sjNo || '',
      sjDate: item.deliveryDate || new Date().toISOString(),
      driver: item.driver || '',
      vehicleNo: item.vehicleNo || '',
    };

    const itemWithDisplay = {
      ...suratJalanItem,
      productCodeDisplay: item.productCodeDisplay || 'padCode',
    };

    // Gunakan template selection untuk recap SJ
    return generatePackagingRecapHtmlByTemplate(templateId, {
      logo,
      company,
      item: itemWithDisplay,
      sjData,
      products,
    });
  };

  const [isProcessingNotification, setIsProcessingNotification] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState<string | null>(null);
  const [isLoadingNotificationData, setIsLoadingNotificationData] = useState(false);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);

  const handleCreateFromNotification = async (notif: any) => {
    console.log('[DeliveryNote] handleCreateFromNotification called with:', notif);
    
    // CRITICAL: Check if notification already processed (prevent duplicate processing)
    if (notif.processed === true || notif.processedAt) {
      console.log('⚠️ [Delivery Note] Notification already processed:', notif.id);
      return;
    }
    
    // IMPORTANT: Prevent multiple calls untuk notification yang sama
    const notifId = notif.id || `${notif.soNo}-${notif.spkNo || notif.spkNos?.join('-') || 'unknown'}`;
    console.log('[DeliveryNote] notifId:', notifId, 'isProcessingNotification:', isProcessingNotification);
    
    if (isProcessingNotification === notifId) {
      console.log('⚠️ [Delivery Note] Already processing notification:', notifId);
      return;
    }
    
    // 🚀 INSTANT: Set processing state IMMEDIATELY (before any async operations)
    // This prevents user from clicking again
    setIsProcessingNotification(notifId);
    setIsLoadingNotificationData(true);
    
    // 🚀 INSTANT: Clear notification from storage IMMEDIATELY (before confirmation dialog)
    // This prevents user from seeing and clicking the same notification again
    try {
      const allNotifications = await storageService.get<any[]>('deliveryNotifications') || [];
      const updatedNotifications = allNotifications.filter((n: any) => n.id !== notif.id);
      await storageService.set(StorageKeys.PACKAGING.DELIVERY_NOTIFICATIONS, updatedNotifications);
      console.log('[DeliveryNote] ✅ Notification cleared immediately:', notifId);
      
      // 🚀 INSTANT: Update local state to remove notification from UI
      setNotifications((prev: any[]) => prev.filter((n: any) => n.id !== notif.id));
      console.log('[DeliveryNote] ✅ Notification removed from UI state');
    } catch (error) {
      console.error('[DeliveryNote] Error clearing notification:', error);
    }

    // 🚀 INSTANT UI FEEDBACK: Set state immediately to show dialog
    // This makes the UI responsive like Purchasing module
    setSelectedDelivery(null); // Reset any previous selection
    setIsProcessingAction(notifId); // Mark as processing

    // Handle grouped notifications
    const notificationsToProcess = notif.isGrouped && notif.groupedNotifications
      ? notif.groupedNotifications
      : [notif];

    // Build confirmation message - Tampilkan quantity per product dari deliveryBatches
    let confirmMsg = `Create Delivery Note?\n\n`;
    if (notif.isGrouped) {
      confirmMsg += `Customer: ${notif.customer}\nSO No: ${notif.soNo}\n\n`;
      confirmMsg += `Products (${notificationsToProcess.length} items):\n`;
      notificationsToProcess.forEach((n: any) => {
        // Ensure spkList is always an array
        let spkList: string[] = [];
        if (Array.isArray(n.spkNos)) {
          spkList = n.spkNos;
        } else if (n.spkNo) {
          spkList = [n.spkNo];
        }
        
        let productQty = n.qty || 0;

        // Ambil quantity dari deliveryBatches yang sesuai dengan SPK ini
        if (notif.deliveryBatches && Array.isArray(notif.deliveryBatches) && notif.deliveryBatches.length > 0) {
          const matchingBatch = notif.deliveryBatches.find((db: any) => {
            // Match by productId jika ada
            if (n.productId && db.productId) {
              return String(n.productId).trim().toLowerCase() === String(db.productId).trim().toLowerCase();
            }
            // Match by spkNo
            if (db.spkNo && spkList.length > 0) {
              return spkList.some((spk: string) => {
                // Support both formats: old (strip) and new (slash)
                const normalizeSPK = (s: string) => s.replace(/-/g, '/');
                const base1 = normalizeSPK(spk).split('/').slice(0, 2).join('/');
                const base2 = normalizeSPK(db.spkNo).split('/').slice(0, 2).join('/');
                return base1 === base2 || db.spkNo === spk;
              });
            }
            return false;
          });

          if (matchingBatch && matchingBatch.qty) {
            productQty = matchingBatch.qty;
          }
        }

        // Handle new format dengan products array atau old format
        if (n.products && Array.isArray(n.products)) {
          n.products.forEach((p: any) => {
            // Cari quantity untuk product ini dari deliveryBatches
            let pQty = productQty;
            if (notif.deliveryBatches && Array.isArray(notif.deliveryBatches)) {
              const matchingBatch = notif.deliveryBatches.find((db: any) => {
                if (p.productId && db.productId) {
                  return String(p.productId).trim().toLowerCase() === String(db.productId).trim().toLowerCase();
                }
                if (db.spkNo && p.spkNo) {
                  // Support both formats: old (strip) and new (slash)
                  const normalizeSPK = (s: string) => s.replace(/-/g, '/');
                  const base1 = normalizeSPK(p.spkNo).split('/').slice(0, 2).join('/');
                  const base2 = normalizeSPK(db.spkNo).split('/').slice(0, 2).join('/');
                  return base1 === base2 || db.spkNo === p.spkNo;
                }
                return false;
              });
              if (matchingBatch && matchingBatch.qty) {
                pQty = matchingBatch.qty;
              }
            }
            // Tampilkan SPK dengan suffix -SJ{number} jika ada
            const spkDisplay = p.spkNo || 'N/A';
            const hasSjSuffix = /-SJ\d+$/.test(spkDisplay);
            const spkDisplayFormatted = hasSjSuffix ? `${spkDisplay} (Batch ${spkDisplay.match(/-SJ(\d+)$/)?.[1] || ''})` : spkDisplay;
            confirmMsg += `- ${p.product} - ${pQty} PCS (SPK: ${spkDisplayFormatted})\n`;
          });
        } else {
          // Tampilkan SPK dengan suffix -SJ{number} jika ada
          const spkNo = spkList[0] || n.spkNo || 'N/A';
          const hasSjSuffix = /-SJ\d+$/.test(spkNo);
          const spkDisplayFormatted = hasSjSuffix ? `${spkNo} (Batch ${spkNo.match(/-SJ(\d+)$/)?.[1] || ''})` : spkNo;
          confirmMsg += `- ${n.product} - ${productQty} PCS (SPK: ${spkDisplayFormatted})\n`;
        }
      });
    } else {
      // Handle new format dengan products array atau old format
      if (notif.products && Array.isArray(notif.products) && notif.products.length > 0) {
        confirmMsg += `SO No: ${notif.soNo}\nCustomer: ${notif.customer}\n\nProducts:\n`;
        notif.products.forEach((p: any) => {
          // Ambil quantity dari deliveryBatches untuk product ini
          let productQty = 0;
          if (notif.deliveryBatches && Array.isArray(notif.deliveryBatches) && notif.deliveryBatches.length > 0) {
            const matchingBatch = notif.deliveryBatches.find((db: any) => {
              if (p.productId && db.productId) {
                return String(p.productId).trim().toLowerCase() === String(db.productId).trim().toLowerCase();
              }
              if (db.spkNo && p.spkNo) {
                const base1 = p.spkNo.split('-').slice(0, 2).join('-');
                const base2 = db.spkNo.split('-').slice(0, 2).join('-');
                return base1 === base2 || db.spkNo === p.spkNo;
              }
              return false;
            });
            if (matchingBatch && matchingBatch.qty) {
              productQty = matchingBatch.qty;
            } else if (notif.deliveryBatches.length === 1) {
              productQty = notif.deliveryBatches[0].qty || 0;
            }
          }

          // Fallback
          if (productQty === 0) {
            productQty = notif.qty ? Math.round(notif.qty / notif.products.length) : 0;
          }

          // Tampilkan SPK dengan suffix -SJ{number} jika ada
          const spkDisplay = p.spkNo || 'N/A';
          const hasSjSuffix = /-SJ\d+$/.test(spkDisplay);
          const spkDisplayFormatted = hasSjSuffix ? `${spkDisplay} (Batch ${spkDisplay.match(/-SJ(\d+)$/)?.[1] || ''})` : spkDisplay;
          confirmMsg += `- ${p.product} - ${productQty} PCS (SPK: ${spkDisplayFormatted})\n`;
        });
      } else {
        // IMPORTANT: Ambil quantity dari deliveryBatches yang match dengan SPK ini, bukan batch pertama
        let productQty = notif.qty || 0;
        if (notif.deliveryBatches && Array.isArray(notif.deliveryBatches) && notif.deliveryBatches.length > 0) {
          if (notif.spkNo) {
            // Cari batch yang match dengan SPK ini
            const matchingBatch = notif.deliveryBatches.find((db: any) => {
              if (db.spkNo) {
                // Support both formats: old (strip) and new (slash)
                const normalizeSPK = (s: string) => s.replace(/-/g, '/');
                const base1 = normalizeSPK(db.spkNo).split('/').slice(0, 2).join('/');
                const base2 = normalizeSPK(notif.spkNo).split('/').slice(0, 2).join('/');
                return base1 === base2 || db.spkNo === notif.spkNo;
              }
              return true; // Jika batch tidak punya spkNo, gunakan batch pertama
            });
            if (matchingBatch && matchingBatch.qty) {
              productQty = matchingBatch.qty;
            } else {
              // Fallback: ambil batch pertama
              productQty = notif.deliveryBatches[0].qty || productQty;
            }
          } else {
            // Jika tidak ada SPK, ambil batch pertama
            productQty = notif.deliveryBatches[0].qty || productQty;
          }
        }

        // Tampilkan SPK dengan suffix -SJ{number} jika ada
        const spkNo = notif.spkNo || (notif.spkNos && notif.spkNos.length > 0 ? notif.spkNos[0] : 'N/A');
        const hasSjSuffix = /-SJ\d+$/.test(spkNo);
        const sjGroupId = notif.sjGroupId || (notif.deliveryBatches && notif.deliveryBatches[0]?.sjGroupId) || null;
        const sjDisplay = sjGroupId ? sjGroupId.replace('sj-group-', 'SJ-') : '';

        let spkDisplayFormatted = spkNo;
        if (hasSjSuffix) {
          const sjMatch = spkNo.match(/-SJ(\d+)$/);
          const sjNumber = sjMatch ? sjMatch[1] : '';
          spkDisplayFormatted = `${spkNo} (Batch ${sjNumber})`;
        } else if (sjDisplay) {
          spkDisplayFormatted = `${spkNo} | ${sjDisplay}`;
        }

        confirmMsg += `SPK: ${spkDisplayFormatted}\nSO No: ${notif.soNo}\nCustomer: ${notif.customer}\nProduct: ${notif.product || 'Multiple Products'}\nQty: ${productQty} PCS`;
      }
    }

    showConfirm(
      'Create Delivery Note',
      confirmMsg,
      async () => {
        try {
          // 🚀 FIX: Show loading overlay immediately when user clicks confirm
          setShowLoadingOverlay(true);
          
          // Loading state sudah di-set di awal, tapi set lagi untuk safety
          setIsLoadingNotificationData(true);
          console.log('[DeliveryNote] Starting delivery note creation...');
          
          // Show loading message
          console.log('[DeliveryNote] ⏳ Processing notification, please wait...');
          
          // Validate QC for all notifications
          const qcList = extractStorageValue(await storageService.get<any[]>('qc')) || [];
          const invalidQCs: string[] = [];

          // Helper function untuk match SPK (digunakan untuk QC dan Schedule validation)
          const matchSPK = (spk1: string, spk2: string): boolean => {
            if (!spk1 || !spk2) return false;
            const normalize = (spk: string) => String(spk).trim().toLowerCase().replace(/-/g, '/');
            return normalize(spk1) === normalize(spk2);
          };

          for (const n of notificationsToProcess) {
            // Handle new format dengan spkNos array atau old format dengan spkNo single
            // Ensure spkList is always an array
            let spkList: string[] = [];
            if (Array.isArray(n.spkNos)) {
              spkList = n.spkNos;
            } else if (n.spkNo) {
              spkList = [n.spkNo];
            }

            // Cek apakah semua SPK sudah QC PASS
            const allQCPassed = spkList.every((spk: string) => {
              return qcList.some((q: any) => {
                const matchesSO = q.soNo === n.soNo;
                const matchesSPK = q.spkNo && matchSPK(q.spkNo, spk);
                return (matchesSO || matchesSPK) && q.qcResult === 'PASS' && q.status === 'CLOSE';
              });
            });

            if (!allQCPassed) {
              // Add SPK yang belum QC atau product name
              if (n.products && Array.isArray(n.products)) {
                n.products.forEach((p: any) => {
                  invalidQCs.push(`${p.product} (${p.spkNo})`);
                });
              } else {
                invalidQCs.push(n.spkNo || n.product || 'Unknown');
              }
            }
          }

          // NOTE (Packaging): QC tidak menjadi syarat untuk create Delivery Note.
          // Kita biarkan flow lanjut ke validasi inventory saja.
          // if (invalidQCs.length > 0) {
          //   showAlert('QC Required', `Cannot create Delivery Note\n\nQC must be PASS and CLOSE first for:\n${invalidQCs.join('\n')}\n\nPlease complete QC check first.`);
          //   return;
          // }

          // NOTE (Packaging): Schedule delivery validation DISABLED - semua SPK bisa langsung dibuat Delivery Note
          // Tidak perlu cek schedule, langsung lanjut ke inventory check
          // Removed console.log for performance
          // console.log('[DeliveryNote] ⚠️ Schedule validation SKIPPED for Packaging - all SPKs accepted');

          // Validate inventory stock - cek apakah barang sudah ada di inventory (onGoing stock)
          const inventory = extractStorageValue(await storageService.get<any[]>('inventory')) || [];
          console.log('[DeliveryNote] Inventory loaded:', inventory.length, 'items');
          const insufficientStock: Array<{ product: string; required: number; available: number }> = [];

          // Helper function untuk normalize product key (untuk matching)
          const normalizeProductKey = (key: string): string => {
            if (!key) return '';
            return String(key).trim().toLowerCase().replace(/\s+/g, '');
          };

          // Helper function untuk find inventory item by product code/name
          const findInventoryByProduct = (productCode?: string, productName?: string): any => {
            if (!productCode && !productName) return null;

            return inventory.find((inv: any) => {
              const invCode = normalizeProductKey(inv.codeItem || '');
              const invName = normalizeProductKey(inv.description || '');
              const prodCode = productCode ? normalizeProductKey(productCode) : '';
              const prodName = productName ? normalizeProductKey(productName) : '';

              return (prodCode && invCode === prodCode) || (prodName && invName === prodName);
            });
          };

          // Collect semua SPK yang akan di-deliver untuk validasi
          // IMPORTANT: Validasi per SPK (bukan per product), karena 1 SPK = 1 product
          // IMPORTANT: Gunakan quantity yang sama dengan yang akan digunakan saat create delivery items
          const spksToValidate: Array<{ spkNo: string; product: string; productCode?: string; productId?: string; qty: number }> = [];

          // Removed console.log for performance

          // Load SPK data untuk mendapatkan quantity yang tepat
          const spkListData = extractStorageValue(await storageService.get<any[]>('spk')) || [];
          console.log('[DeliveryNote] SPK data loaded:', spkListData.length, 'items');

          // Load schedule untuk ambil quantity (optional, tidak untuk validasi)
          const scheduleList = await (async () => {
            try {
              const data = await storageService.get<any[]>(StorageKeys.PACKAGING.SCHEDULE);
              // Extract value dari storage - jika data adalah object dengan value property, ambil value-nya
              const extracted = (data && typeof data === 'object' && 'value' in data) ? (data as any).value : data;
              return Array.isArray(extracted) ? extracted : [];
            } catch (e) {
              // Removed console.warn for performance
            }
            return [];
          })();

          // Collect dari groupedNotifications atau dari notification langsung
          if (notif.groupedNotifications && Array.isArray(notif.groupedNotifications) && notif.groupedNotifications.length > 0) {
            // Untuk groupedNotifications, ambil quantity dari notification/SPK langsung (schedule hanya optional)
            notif.groupedNotifications.forEach((n: any) => {
              // Ensure spkList is always an array
              let spkList: string[] = [];
              if (Array.isArray(n.spkNos)) {
                spkList = n.spkNos;
              } else if (n.spkNo) {
                spkList = [n.spkNo];
              }
              
              const spkNo = spkList[0] || n.spkNo;

              if (!spkNo) return; // Skip jika tidak ada SPK

              // Ambil data dari SPK
              const spkData = spkListData.find((s: any) => {
                if (!s.spkNo) return false;
                return spkList.some((spk: string) => matchSPK(s.spkNo, spk));
              });

              const productName = spkData?.product || n.product || '';
              const productId = spkData?.product_id || spkData?.kode || n.productId || '';

              // Cari schedule yang match dengan SPK ini (optional, untuk ambil quantity dari batch jika ada)
              const relatedSchedule = scheduleList.find((s: any) => {
                if (!s.spkNo) return false;
                return spkList.some((spk: string) => matchSPK(s.spkNo, spk));
              });

              // Ambil quantity dari deliveryBatches di schedule yang sesuai dengan sjGroupId (optional)
              let batchQty = 0;
              if (relatedSchedule && relatedSchedule.deliveryBatches && relatedSchedule.deliveryBatches.length > 0) {
                if (notif.sjGroupId) {
                  const matchingBatch = relatedSchedule.deliveryBatches.find((db: any) => {
                    const hasMatchingGroup = db.sjGroupId === notif.sjGroupId;
                    if (db.spkNo) {
                      return hasMatchingGroup && spkList.some((spk: string) => matchSPK(db.spkNo, spk));
                    }
                    return hasMatchingGroup;
                  });
                  if (matchingBatch && matchingBatch.qty) {
                    batchQty = matchingBatch.qty;
                  }
                } else {
                  // Jika tidak ada sjGroupId, ambil batch pertama yang match SPK
                  const matchingBatch = relatedSchedule.deliveryBatches.find((db: any) => {
                    if (db.spkNo) {
                      return spkList.some((spk: string) => matchSPK(db.spkNo, spk));
                    }
                    return true;
                  });
                  if (matchingBatch && matchingBatch.qty) {
                    batchQty = matchingBatch.qty;
                  }
                }
              }

              // Fallback ke qty dari notification/SPK jika tidak ada dari schedule
              if (batchQty === 0) {
                batchQty = spkData?.qty || n.qty || 0;
              }

              console.log('[DeliveryNote] Grouped SPK validation:', { spkNo, productName, batchQty, spkData, n });
              if (productName && batchQty > 0) {
                spksToValidate.push({ spkNo, product: productName, productCode: productId, productId, qty: batchQty });
              }
            });
          } else {
            // Single notification - collect dari notification atau deliveryBatches
            if (notif.products && Array.isArray(notif.products) && notif.products.length > 0) {
              console.log('[DeliveryNote] Processing products array:', notif.products);
              notif.products.forEach((p: any) => {
                const spkNo = p.spkNo || '';
                if (!spkNo) return; // Skip jika tidak ada SPK

                // Ambil data dari SPK
                const spkData = spkListData.find((s: any) => {
                  if (!s.spkNo) return false;
                  return matchSPK(s.spkNo, spkNo);
                });

                const productName = spkData?.product || p.product || '';
                const productCode = p.productId || p.productCode || spkData?.product_id || spkData?.kode || '';
                let qty = p.qty || 0;

                // Ambil qty dari deliveryBatches jika ada (per SPK)
                if (notif.deliveryBatches && Array.isArray(notif.deliveryBatches) && notif.deliveryBatches.length > 0) {
                  const matchingBatch = notif.deliveryBatches.find((db: any) => {
                    if (db.spkNo) {
                      return matchSPK(db.spkNo, spkNo);
                    }
                    if (p.productId && db.productId) {
                      return String(p.productId).trim().toLowerCase() === String(db.productId).trim().toLowerCase();
                    }
                    return false;
                  });
                  if (matchingBatch && matchingBatch.qty) {
                    qty = matchingBatch.qty;
                  }
                }

                console.log('[DeliveryNote] Product validation:', { spkNo, productName, qty, p, matchingBatch: notif.deliveryBatches?.find((db: any) => {
                  if (db.spkNo) return matchSPK(db.spkNo, spkNo);
                  if (p.productId && db.productId) {
                    return String(p.productId).trim().toLowerCase() === String(db.productId).trim().toLowerCase();
                  }
                  return false;
                }) });

                if (productName && qty > 0) {
                  spksToValidate.push({ spkNo, product: productName, productCode, productId: productCode, qty });
                }
              });
            } else {
              // Old format - single product
              // IMPORTANT: Ambil qty dari deliveryBatches per SPK, bukan total qty
              const productName = notif.product || '';
              const productCode = notif.productId || notif.productCode || '';
              const spkNo = notif.spkNo || (notif.spkNos && notif.spkNos.length > 0 ? notif.spkNos[0] : null);

              if (!spkNo) {
                // Jika tidak ada SPK, skip validasi (tidak bisa validate tanpa SPK)
                // Removed console.log for performance
                return;
              }


              let qty = 0;

              // PRIORITAS: Ambil qty dari deliveryBatches yang match dengan SPK ini
              if (notif.deliveryBatches && Array.isArray(notif.deliveryBatches) && notif.deliveryBatches.length > 0) {
                // Cari batch yang match dengan SPK ini
                const matchingBatch = notif.deliveryBatches.find((db: any) => {
                  if (db.spkNo) {
                    return matchSPK(db.spkNo, spkNo);
                  }
                  return true; // Jika batch tidak punya spkNo, gunakan batch pertama
                });
                if (matchingBatch && matchingBatch.qty) {
                  qty = matchingBatch.qty;
                } else {
                  // Fallback: ambil batch pertama
                  qty = notif.deliveryBatches[0].qty || 0;
                }
              } else {
                // Fallback: gunakan qty dari notification atau SPK
                const spkData = spkListData.find((s: any) => {
                  if (!s.spkNo) return false;
                  return matchSPK(s.spkNo, spkNo);
                });
                qty = spkData?.qty || notif.qty || 0;
              }

              if (productName && qty > 0) {
                spksToValidate.push({ spkNo, product: productName, productCode, productId: productCode, qty });
              }
            }
          }

          // Removed console.log for performance

          // Validate setiap SPK (per SPK, bukan per product)
          // IMPORTANT: Cek current stock (nextStock atau receive), bukan onGoing
          // onGoing hanya dipotong setelah upload SJ
          console.log('[DeliveryNote] spksToValidate:', spksToValidate);
          for (const spkItem of spksToValidate) {
            // Removed console.log for performance

            const invItem = findInventoryByProduct(spkItem.productCode, spkItem.product);

            if (!invItem) {
              // Removed console.log for performance
              insufficientStock.push({
                product: `${spkItem.product} (SPK: ${spkItem.spkNo})`,
                required: spkItem.qty,
                available: 0,
              });
              continue;
            }

            // Removed console.log for performance

            // Cek available stock untuk product yang dikirim (sudah dibuat SJ tapi belum diterima customer) dan QC PASS
            // Untuk product yang dikirim (sudah dibuat SJ tapi belum diterima customer), bisa ada di:
            // 1. receive (barang yang sudah diterima dari production/QC)
            // 2. onGoing (production stock yang sudah selesai tapi belum dikirim)
            // 3. nextStock (current stock setelah semua transaksi)
            const getAvailableStock = (item: any): number => {
              if (!item) return 0;

              // Untuk product yang dikirim (sudah dibuat SJ tapi belum diterima customer) dan QC PASS:
              // - receive = barang yang sudah diterima dari production/QC
              // - onGoing = production stock yang sudah selesai tapi belum dikirim
              // - nextStock = stock setelah semua transaksi

              // Prioritas: cek receive + onGoing (untuk product yang dikirim (sudah dibuat SJ tapi belum diterima customer))
              const receive = item.receive || 0;
              const onGoing = item.onGoing || item.on_going || item.productionStock || 0;

              // Available stock = receive + onGoing (untuk product yang dikirim (sudah dibuat SJ tapi belum diterima customer))
              // Atau bisa juga cek nextStock jika sudah ada outgoing
              const availableFromProduction = receive + onGoing;

              // Jika nextStock lebih besar, gunakan nextStock (untuk konsistensi)
              let nextStock = 0;
              if (typeof item.nextStock === 'number') {
                nextStock = item.nextStock;
              } else {
                const parsedNextStock = parseFloat(item.nextStock);
                if (!Number.isNaN(parsedNextStock)) {
                  nextStock = parsedNextStock;
                } else {
                  // Calculate dari komponen
                  nextStock = (
                    (item.stockPremonth || 0) +
                    receive -
                    (item.outgoing || 0) +
                    (item.return || 0)
                  );
                }
              }

              // Gunakan yang lebih besar antara availableFromProduction dan nextStock
              // Karena untuk product yang baru selesai produksi, receive + onGoing lebih akurat
              return Math.max(availableFromProduction, nextStock);
            };

            const availableStock = getAvailableStock(invItem);
            // Removed console.log for performance

            // Cek apakah product ada di inventory dengan stock yang cukup
            // Untuk product yang dikirim (sudah dibuat SJ tapi belum diterima customer) dan QC PASS, seharusnya sudah ada di inventory
            if (availableStock < spkItem.qty) {
              // Removed console.log for performance
              insufficientStock.push({
                product: `${spkItem.product} (SPK: ${spkItem.spkNo})`,
                required: spkItem.qty,
                available: availableStock,
              });
            } else {
              // Removed console.log for performance
            }
          }

          // Removed console.log for performance

          if (insufficientStock.length > 0) {
            console.log('[DeliveryNote] Insufficient stock found:', insufficientStock);
            const errorMsg = insufficientStock.map(item =>
              `- ${item.product}: Required ${item.required} PCS, Available ${item.available} PCS`
            ).join('\n');

            showAlert(
              'Insufficient Inventory Stock',
              `Cannot create Delivery Note\n\nProducts tidak tersedia atau stock tidak cukup:\n\n${errorMsg}\n\nPlease ensure:\n1. Production is CLOSE\n2. QC is PASS and CLOSE\n3. Inventory is updated after QC PASS\n\nIf QC PASS is already done, please check if inventory was updated correctly.`
            );
            return;
          }

          console.log('[DeliveryNote] Inventory validation passed! Proceeding to create SJ directly...');

          // Generate random SJ number
          const now = new Date();
          const year = String(now.getFullYear()).slice(-2);
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const randomCode = Math.random().toString(36).substr(2, 5).toUpperCase();
          const sjNo = `SJ-${year}${month}${day}-${randomCode}`;

          // Create delivery items from notification
          const deliveryItems: DeliveryNoteItem[] = [];
          
          // Extract data dari deliveryBatches (yang sudah dibawa dari reminder)
          const spkNo = notif.spkNo || (notif.spkNos && notif.spkNos.length > 0 ? notif.spkNos[0] : '');
          const productName = notif.product || notif.products?.[0]?.product || '';
          const productCode = notif.deliveryBatches?.[0]?.productId || notif.products?.[0]?.productId || '';
          const qty = notif.deliveryBatches?.[0]?.qty || notif.qty || 0;

          console.log('[DeliveryNote] Creating SJ with data:', { spkNo, productName, productCode, qty, notif });

          if (spkNo && productName && qty > 0) {
            deliveryItems.push({
              spkNo: spkNo,
              product: productName,
              productCode: productCode,
              qty: qty,
              unit: 'PCS',
              soNo: notif.soNo || '',
              fromInventory: true,
            });
            console.log('[DeliveryNote] Delivery item added:', deliveryItems[0]);
          } else {
            console.log('[DeliveryNote] ⚠️ Delivery item NOT added - condition failed:', { spkNo: !!spkNo, productName: !!productName, qty: qty > 0 });
          }

          // Create SJ directly
          const newDelivery: DeliveryNote = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            sjNo,
            soNo: notif.soNo || '',
            soNos: [notif.soNo || ''],
            customer: notif.customer || '',
            items: deliveryItems,
            status: 'OPEN' as const,
            deliveryDate: notif.deliveryBatches?.[0]?.deliveryDate || new Date().toISOString(),
            created: new Date().toISOString(),
            lastUpdate: new Date().toISOString(),
            timestamp: Date.now(),
            _timestamp: Date.now(),
          };

          // Save SJ
          const allDeliveries = await storageService.get<DeliveryNote[]>('delivery') || [];
          
          // CRITICAL: Check if delivery with same SPK already exists (prevent duplicate)
          const existingDelivery = allDeliveries.find((d: any) => {
            if (d.items && Array.isArray(d.items)) {
              return d.items.some((item: any) => {
                const normalize = (s: string) => String(s).trim().toLowerCase().replace(/-/g, '/');
                return normalize(item.spkNo) === normalize(spkNo);
              });
            }
            return false;
          });
          
          if (existingDelivery) {
            console.log('[DeliveryNote] ⚠️ Delivery already exists for SPK:', spkNo, 'SJ No:', existingDelivery.sjNo);
            showAlert('Already Created', `Delivery Note untuk SPK ini sudah dibuat!\n\nSJ No: ${existingDelivery.sjNo}`);
            setIsProcessingNotification(null);
            setIsLoadingNotificationData(false);
            return;
          }

          // IMPORTANT: SET OUTGOING saat delivery note dibuat (sebelum upload signed document)
          // outgoing = stock yang sedang dikirim (sudah dibuat SJ tapi belum diterima customer)
          await setOutgoingFromDelivery(newDelivery);
          
          // Mark delivery as processed for outgoing BEFORE saving
          newDelivery.processedOutgoing = true;
          
          const updated = [...allDeliveries, newDelivery];
          await storageService.set(StorageKeys.PACKAGING.DELIVERY, updated);

          // Delete notification setelah SJ berhasil dibuat
          const allNotifications = await storageService.get<any[]>('deliveryNotifications') || [];
          
          // CRITICAL: Notification sudah di-clear di awal, jadi tidak perlu delete lagi
          // Tapi verify untuk safety
          const notificationExists = allNotifications.some((n: any) => n.id === notif.id);
          if (notificationExists) {
            console.log('[DeliveryNote] ⚠️ Notification still exists, deleting now:', notif.id);
            const updatedNotifications = allNotifications.filter((n: any) => n.id !== notif.id);
            await storageService.set(StorageKeys.PACKAGING.DELIVERY_NOTIFICATIONS, updatedNotifications);
          } else {
            console.log('[DeliveryNote] ✅ Notification already cleared:', notif.id);
          }

          console.log('[DeliveryNote] SJ created successfully:', sjNo);
          showAlert('Success', `✅ Surat Jalan berhasil dibuat!\n\nSJ No: ${sjNo}`);
          setIsProcessingNotification(null);
          setIsLoadingNotificationData(false);
          
          // 🚀 FIX: Hide loading overlay after success
          setShowLoadingOverlay(false);
          
          // 🚀 FIX: Update local state directly instead of calling loadDataPartial
          // This avoids double re-render from both local state update and storage event listener
          const activeDeliveries = updated.filter(d => !d.deleted);
          setDeliveries(activeDeliveries);
          // Removed console.log for performance
          // console.log('[DeliveryNote] ⚠️ Schedule validation SKIPPED for Packaging - all SPKs accepted');

        } catch (error: any) {
          console.error('[DeliveryNote] Error in handleCreateFromNotification:', error);
          console.error('[DeliveryNote] Error stack:', error.stack);
          showAlert('Error', `Error preparing form: ${error.message}`);
          setIsProcessingNotification(null);
          setIsLoadingNotificationData(false);
        } finally {
          // Reset loading state
          setIsLoadingNotificationData(false);
        }
      },
      () => {
        // IMPORTANT: Reset processing flag jika user cancel
        setIsProcessingNotification(null);
        setIsLoadingNotificationData(false);
      }
    );
  };

  const handleUpdateStatus = useCallback(async (item: DeliveryNote) => {
    // IMPORTANT: Prevent multiple calls
    const actionId = `update-status-${item.id}`;
    if (isProcessingAction === actionId) {
      return;
    }
    setIsProcessingAction(actionId);

    showPrompt(
      'Update Status',
      `Update status for SJ: ${item.sjNo}\n\nCurrent: ${item.status}\n\nEnter new status (DRAFT/OPEN/CLOSE):`,
      item.status || '',
      async (newStatus: string) => {
        // Reset flag di awal callback (jika user cancel, flag akan tetap di-reset)
        const resetFlag = () => setIsProcessingAction(null);
        try {
          if (newStatus && newStatus !== item.status && ['DRAFT', 'OPEN', 'CLOSE'].includes(newStatus.toUpperCase())) {
            const normalizedStatus = newStatus.toUpperCase();
            // Jika mau close, wajib upload signed document
            if (normalizedStatus === 'CLOSE' && !item.signedDocument && !item.signedDocumentPath) {
              showAlert('Validation Error', '⚠️ Cannot close Delivery Note without signed document!\n\nPlease upload signed document (Surat Jalan yang sudah di TTD) first.');
              resetFlag();
              return;
            }
            // Load all deliveries from storage (including deleted ones)
            const allDeliveries = await storageService.get<DeliveryNote[]>('delivery') || [];
            const updated = allDeliveries.map(d =>
              d.id === item.id ? {
                ...d,
                status: normalizedStatus as any,
                lastUpdate: new Date().toISOString(),
                timestamp: Date.now(),
                _timestamp: Date.now(),
              } : d
            );
            await storageService.set(StorageKeys.PACKAGING.DELIVERY, updated);
            // Filter out deleted items for local state
            const activeDeliveries = updated.filter(d => !d.deleted);
            setDeliveries(activeDeliveries);
            showAlert('Success', `✅ Status updated to: ${normalizedStatus}`);
          } else if (newStatus && newStatus !== item.status) {
            showAlert('Validation Error', 'Invalid status! Please enter DRAFT, OPEN, or CLOSE.');
          }
        } catch (error: any) {
          showAlert('Error', `Error updating status: ${error.message}`);
        } finally {
          setIsProcessingAction(null);
        }
      },
      'DRAFT/OPEN/CLOSE'
    );
  }, [showPrompt, showAlert, setDeliveries, setIsProcessingAction]);

  const formatDateSimple = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '-';
    }
  };

  const getDeliveryTotalQty = (delivery: DeliveryNote) => {
    if (delivery.items && Array.isArray(delivery.items) && delivery.items.length > 0) {
      return delivery.items.reduce((sum: number, itm: any) => sum + (Number(itm.qty) || 0), 0);
    }
    return Number(delivery.qty) || 0;
  };

  const handleDelete = async (item: DeliveryNote) => {
    // IMPORTANT: Prevent multiple calls
    const actionId = `delete-${item.id}`;
    if (isProcessingAction === actionId) {
      return;
    }
    setIsProcessingAction(actionId);

    showConfirm(
      'Delete Delivery Note',
      `Are you sure you want to delete delivery note ${item.sjNo || item.id}?\n\n⚠️ Data akan dihapus dengan aman (tombstone pattern) untuk mencegah auto-sync mengembalikan data.\n\nThis action cannot be undone.`,
      async () => {
        try {
          // 🚀 FIX: Pakai packaging delete helper untuk konsistensi dan sync yang benar
          const deleteResult = await deletePackagingItem('delivery', item.id, 'id');

          if (deleteResult.success) {
            // Refresh data dengan helper (handle race condition)
            await loadDeliveries();

            showAlert('Success', `✅ Delivery Note ${item.sjNo || item.id} berhasil dihapus dengan aman.\n\n🛡️ Data dilindungi dari auto-sync restoration.`);
          } else {
            showAlert('Error', `❌ Error deleting delivery note ${item.sjNo || item.id}: ${deleteResult.error || 'Unknown error'}`);
          }
        } catch (error: any) {
          // Removed console.error for performance
          showAlert('Error', `❌ Error deleting delivery note: ${error.message}`);
        } finally {
          setIsProcessingAction(null);
        }
      },
      () => {
        // Reset flag jika user cancel
        setIsProcessingAction(null);
      }
    );
  };

  // Render actions untuk card view (tombol-tombol seperti sebelumnya)
  const renderCardViewActions = (item: DeliveryNote, options?: { allowWrap?: boolean }) => (
    <div
      style={{
        display: 'flex',
        gap: '4px',
        flexWrap: options?.allowWrap ? 'wrap' : 'nowrap',
        alignItems: 'center',
      }}
    >
      {!item.sjNo && (
        <Button
          variant="primary"
          onClick={() => handleGenerateSJ(item)}
          style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#4CAF50', color: 'white' }}
        >
          Generate SJ
        </Button>
      )}
      {item.sjNo && (
        <>
          <Button
            variant="secondary"
            onClick={() => handleViewDetail(item)}
            style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#2196F3', color: 'white' }}
          >
            View
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleEditSJ(item)}
            style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#FF9800', color: 'white' }}
          >
            Edit
          </Button>
          <Button
            variant="secondary"
            onClick={() => handlePrint(item)}
            style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#9C27B0', color: 'white' }}
          >
            Print
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleDelete(item)}
            style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#f44336', color: 'white' }}
          >
            Delete
          </Button>
          {item.status === 'OPEN' && !item.signedDocument && !item.signedDocumentPath && (
            <>
              <input
                ref={(el) => {
                  if (el) fileInputRefs.current[item.id] = el;
                }}
                type="file"
                accept="image/*,.pdf"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleUploadSignedDocument(item, file);
                    if (e.target) {
                      e.target.value = '';
                    }
                  }
                }}
              />
              <Button
                variant="secondary"
                onClick={() => {
                  const input = fileInputRefs.current[item.id];
                  if (input) {
                    input.click();
                  }
                }}
                style={{
                  cursor: 'pointer',
                  fontSize: '11px',
                  padding: '4px 8px',
                  backgroundColor: '#F44336',
                  color: 'white'
                }}
              >
                📎 Upload
              </Button>
            </>
          )}
          {(item.signedDocument || item.signedDocumentPath) && (
            <>
              <div title={`View signed document: ${item.signedDocumentName || 'Signed SJ'}`}>
                <Button
                  variant="secondary"
                  onClick={() => handleViewSignedDocument(item)}
                  style={{
                    cursor: 'pointer',
                    fontSize: '11px',
                    padding: '4px 8px',
                    backgroundColor: '#4CAF50',
                    color: 'white'
                  }}
                >
                  👁️ View SJ TTD
                </Button>
              </div>
              <div title={`Download signed document: ${item.signedDocumentName || 'Signed SJ'}`}>
                <Button
                  variant="secondary"
                  onClick={() => handleDownloadSignedDocument(item)}
                  style={{
                    cursor: 'pointer',
                    fontSize: '11px',
                    padding: '4px 8px',
                    backgroundColor: '#2196F3',
                    color: 'white'
                  }}
                >
                  ⬇️ Download
                </Button>
              </div>
            </>
          )}
        </>
      )}
      <Button
        variant="secondary"
        onClick={() => handleUpdateStatus(item)}
        style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#607D8B', color: 'white' }}
      >
        Status
      </Button>
    </div>
  );

  // Render actions untuk table view (menu dropdown) atau card view (tombol-tombol)
  const renderDeliveryActions = (item: DeliveryNote, options?: { allowWrap?: boolean }) => {
    // Jika table view, pakai menu dropdown
    if (deliveryViewMode === 'table') {
      // File input untuk upload signed document (harus tetap ada di render untuk ref)
      const fileInput = item.status === 'OPEN' && !item.signedDocument ? (
        <input
          key={`file-input-${item.id}`}
          ref={(el) => {
            if (el) fileInputRefs.current[item.id] = el;
          }}
          type="file"
          accept="image/*,.pdf"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleUploadSignedDocument(item, file);
              if (e.target) {
                e.target.value = '';
              }
            }
          }}
        />
      ) : null;

      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {fileInput}
          <DeliveryActionMenu
            item={item}
            onGenerateSJ={!item.sjNo ? () => handleGenerateSJ(item) : undefined}
            onViewDetail={item.sjNo ? () => handleViewDetail(item) : undefined}
            onEditSJ={item.sjNo ? () => handleEditSJ(item) : undefined}
            onPrint={item.sjNo ? () => handlePrint(item) : undefined}
            onDelete={item.sjNo ? () => handleDelete(item) : undefined}
            onUploadSignedDoc={item.status === 'OPEN' && !item.signedDocument && !item.signedDocumentPath ? () => {
              const input = fileInputRefs.current[item.id];
              if (input) {
                input.click();
              }
            } : undefined}
            onViewSignedDoc={(item.signedDocument || item.signedDocumentPath) ? () => handleViewSignedDocument(item) : undefined}
            onDownloadSignedDoc={(item.signedDocument || item.signedDocumentPath) ? () => handleDownloadSignedDocument(item) : undefined}
            onUpdateStatus={() => handleUpdateStatus(item)}
            fileInputRef={item.status === 'OPEN' && !item.signedDocument && !item.signedDocumentPath && fileInputRefs.current[item.id] ? { current: fileInputRefs.current[item.id] } as React.RefObject<HTMLInputElement> : undefined}
          />
        </div>
      );
    }

    // Jika card view, pakai tombol-tombol seperti sebelumnya
    return renderCardViewActions(item, options);
  };

  const filteredDeliveries = useMemo(() => {
    // Ensure deliveries is always an array
    let filtered = Array.isArray(deliveries) ? deliveries : [];

    // IMPORTANT: Tab Delivery Note tidak show SJ yang sudah di-merge (deleted)
    // SJ yang di-merge hanya muncul di tab Recap sebagai bagian dari SJ Recap
    if (activeTab === 'delivery') {
      // Filter out deleted items (SJ yang sudah di-merge ke Recap)
      filtered = filtered.filter(delivery => !delivery.deleted);
    }

    // Tab filter - Outstanding tab hanya show status OPEN, Recap tab show semua (termasuk SJ Recap)
    if (activeTab === 'outstanding') {
      filtered = filtered.filter(delivery => delivery.status === 'OPEN' && !delivery.deleted);
    } else if (activeTab === 'recap') {
      // Recap tab: show SJ Recap dan SJ yang CLOSE tapi belum di-merge
      // SJ yang sudah di-merge (deleted) tidak muncul di tab Delivery Note, tapi muncul di Recap sebagai bagian dari SJ Recap
      // Cari semua SJ Recap untuk cek mergedSjNos
      const allRecaps = filtered.filter(d => d.isRecap);
      const allMergedSjNos = new Set<string>();
      allRecaps.forEach(recap => {
        if (recap.mergedSjNos && Array.isArray(recap.mergedSjNos)) {
          recap.mergedSjNos.forEach(sjNo => allMergedSjNos.add(sjNo));
        }
      });

      filtered = filtered.filter(delivery => {
        // Show SJ Recap
        if (delivery.isRecap) return true;
        // Show SJ yang CLOSE dan belum di-merge (tidak ada di mergedSjNos dari SJ Recap manapun)
        if (delivery.status === 'CLOSE' && !delivery.deleted) {
          const sjNo = delivery.sjNo || '';
          return !allMergedSjNos.has(sjNo); // Hanya show yang belum di-merge
        }
        return false;
      });
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(delivery => {
        if (!delivery) return false;
        const soNosStr = delivery.soNos ? delivery.soNos.join(', ') : '';
        return (
          (delivery.sjNo || '').toLowerCase().includes(query) ||
          (delivery.soNo || '').toLowerCase().includes(query) ||
          soNosStr.toLowerCase().includes(query) ||
          (delivery.customer || '').toLowerCase().includes(query) ||
          (delivery.product || '').toLowerCase().includes(query) ||
          (delivery.status || '').toLowerCase().includes(query) ||
          (delivery.driver || '').toLowerCase().includes(query) ||
          (delivery.vehicleNo || '').toLowerCase().includes(query) ||
          (delivery.spkNo || '').toLowerCase().includes(query) ||
          (delivery.items?.some(item => (item.product || '').toLowerCase().includes(query)) || false)
        );
      });
    }

    // Apply date filter
    if (dateFrom || dateTo) {
      filtered = filtered.filter(delivery => {
        // Get delivery date - prioritize deliveryDate field, then fallback to created/lastUpdate
        let deliveryDate: Date;
        
        // Try to get delivery date from deliveryDate field first (scheduled delivery date)
        if (delivery.deliveryDate) {
          deliveryDate = new Date(delivery.deliveryDate);
        } else if (delivery.created) {
          deliveryDate = new Date(delivery.created);
        } else if (delivery.lastUpdate) {
          deliveryDate = new Date(delivery.lastUpdate);
        } else if (delivery.timestamp) {
          deliveryDate = new Date(delivery.timestamp);
        } else {
          // Fallback: use current date if no date field found
          deliveryDate = new Date();
        }
        
        // Ensure we're comparing dates at midnight to avoid time zone issues
        const deliveryDateOnly = new Date(deliveryDate.getFullYear(), deliveryDate.getMonth(), deliveryDate.getDate());
        const fromDateOnly = dateFrom ? new Date(new Date(dateFrom).getFullYear(), new Date(dateFrom).getMonth(), new Date(dateFrom).getDate()) : null;
        const toDateOnly = dateTo ? new Date(new Date(dateTo).getFullYear(), new Date(dateTo).getMonth(), new Date(dateTo).getDate()) : null;
        
        const matchesDateFrom = !fromDateOnly || deliveryDateOnly >= fromDateOnly;
        const matchesDateTo = !toDateOnly || deliveryDateOnly <= toDateOnly;
        return matchesDateFrom && matchesDateTo;
      });
    }

    // Sort: Yang paling baru di atas, terutama yang masih OPEN
    // Ensure filtered is still an array before sorting
    if (!Array.isArray(filtered)) {
      return [];
    }
    return filtered.sort((a, b) => {
      // Priority 1: OPEN status di atas CLOSE/DRAFT
      const statusOrder: Record<string, number> = { 'OPEN': 0, 'DRAFT': 1, 'CLOSE': 2 };
      const statusDiff = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
      if (statusDiff !== 0) return statusDiff;

      // Priority 2: Yang paling baru di atas (berdasarkan id yang menggunakan Date.now())
      const idA = parseInt(a.id) || 0;
      const idB = parseInt(b.id) || 0;
      return idB - idA; // Descending (newest first)
    });
  }, [deliveries, searchQuery, activeTab, dateFrom, dateTo]);

  const groupedDeliveries = useMemo(() => {
    const groups: Record<string, {
      soNo: string;
      customer: string;
      deliveries: DeliveryNote[];
      statusSummary: Record<string, number>;
      totalQty: number;
      latestTimestamp: number;
    }> = {};

    filteredDeliveries.forEach((delivery) => {
      if (!delivery) return;
      // IMPORTANT: Skip deleted items (SJ yang sudah di-merge ke Recap)
      // Tab Delivery Note tidak show SJ yang sudah di-merge
      if (delivery.deleted) return;
      // Use soNos if available (multi-SO), otherwise use soNo
      // Untuk SJ Recap, selalu gunakan soNos jika ada
      const soNos = (delivery.isRecap && delivery.soNos && delivery.soNos.length > 0)
        ? delivery.soNos
        : (delivery.soNos && delivery.soNos.length > 0 ? delivery.soNos : [delivery.soNo || 'NO_SO']);
      const soNosKey = soNos.sort().join(',');
      const key = `${soNosKey}|${delivery.customer || '-'}`;
      if (!groups[key]) {
        groups[key] = {
          soNo: (delivery.isRecap && soNos.length > 0) ? soNos.join(', ') : (soNos.length > 1 ? soNos.join(', ') : (delivery.soNo || '-')),
          customer: delivery.customer || '-',
          deliveries: [],
          statusSummary: { DRAFT: 0, OPEN: 0, CLOSE: 0 },
          totalQty: 0,
          latestTimestamp: 0,
        };
      }

      const group = groups[key];
      group.deliveries.push(delivery);
      group.statusSummary[delivery.status] = (group.statusSummary[delivery.status] || 0) + 1;
      group.totalQty += getDeliveryTotalQty(delivery);
      const deliveryTimestamp = delivery.deliveryDate ? new Date(delivery.deliveryDate).getTime() : 0;
      const idTimestamp = parseInt(delivery.id) || 0;
      group.latestTimestamp = Math.max(group.latestTimestamp, deliveryTimestamp, idTimestamp);
    });

    return Object.values(groups).sort((a, b) => {
      const aHasOpen = (a.statusSummary.OPEN || 0) > 0;
      const bHasOpen = (b.statusSummary.OPEN || 0) > 0;
      if (aHasOpen !== bHasOpen) {
        return aHasOpen ? -1 : 1;
      }
      return (b.latestTimestamp || 0) - (a.latestTimestamp || 0);
    });
  }, [filteredDeliveries]);

  // Optimized map to store total delivered qty for each (SO, Product) pair
  const itemDeliveredTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    const validDeliveries = Array.isArray(deliveries) ? deliveries.filter(d => d && !d.deleted) : [];

    validDeliveries.forEach(delivery => {
      const deliveryItems = delivery.items || [];
      deliveryItems.forEach(item => {
        const soNo = (item.soNo || delivery.soNo || (delivery.soNos && delivery.soNos[0]) || 'NO_SO').toString().trim();
        const productName = (item.product || '').toString().trim();
        const key = `${soNo}|${productName}`;
        totals[key] = (totals[key] || 0) + (Number(item.qty) || 0);
      });
    });

    return totals;
  }, [deliveries]);

  // Helper to get remaining quantity information
  const getRemainingInfo = useCallback((productName: string, soNo: string, productCode?: string) => {
    if (!soNo || soNo === 'NO_SO') return null;

    const trimmedSoNo = soNo.toString().trim();
    const matchedSO = salesOrders.find(so => (so.soNo || '').toString().trim() === trimmedSoNo);
    if (!matchedSO || !matchedSO.items) return null;

    const soItem = matchedSO.items.find((item: any) => {
      const soProductName = (item.productName || item.product || '').toString().trim().toLowerCase();
      const targetProductName = productName.toString().trim().toLowerCase();

      const soProductCode = (item.product_id || item.productKode || item.itemSku || '').toString().trim().toLowerCase();
      const targetProductCode = (productCode || '').toString().trim().toLowerCase();

      return (targetProductName && soProductName === targetProductName) ||
        (targetProductCode && soProductCode === targetProductCode);
    });

    if (!soItem) return null;

    const orderQty = Number(soItem.qty || 0);
    const delivered = itemDeliveredTotals[`${trimmedSoNo}|${productName.trim()}`] || 0;
    const remaining = Math.max(0, orderQty - delivered);

    return {
      orderQty,
      delivered,
      remaining
    };
  }, [salesOrders, itemDeliveredTotals]);

  const handleExportExcel = async () => {
    try {
      // Dynamic import for ExcelJS (browser environment)
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      
      // 🆕 SINGLE SHEET FORMAT - Clear, detailed, and comprehensive
      const deliveriesArray = Array.isArray(deliveries) ? deliveries : [];

      
      // Build comprehensive delivery data - 1 row per item
      const exportData: any[] = [];
      let rowNo = 0;

      
      deliveriesArray.forEach((delivery: DeliveryNote) => {
        if (delivery.items && delivery.items.length > 0) {
          // Multi-item delivery
          delivery.items.forEach((item) => {
            rowNo++;
            const itemSoNo = item.soNo || delivery.soNo || (delivery.soNos && delivery.soNos.length > 0 ? delivery.soNos.join(', ') : '');
            
            exportData.push({
              no: rowNo,
              sjNo: delivery.sjNo || '',
              deliveryDate: delivery.deliveryDate || '',
              soNo: itemSoNo,
              customer: delivery.customer || '',
              productCode: item.productCode || '',
              productName: item.product || '',
              qty: typeof item.qty === 'string' ? parseFloat(item.qty) : (item.qty || 0),
              unit: item.unit || 'PCS',
              spkNo: item.spkNo || delivery.spkNo || '',
              driver: delivery.driver || '',
              vehicleNo: delivery.vehicleNo || '',
              status: delivery.status || '',
              signedDoc: (delivery.signedDocument || delivery.signedDocumentPath || delivery.fileId) ? 'Yes' : 'No',
              receivedDate: delivery.receivedDate || '',
            });
          });
        } else {
          // Single item delivery (legacy format)
          rowNo++;
          const soNo = delivery.soNos && delivery.soNos.length > 1 ? delivery.soNos.join(', ') : delivery.soNo;
          
          exportData.push({
            no: rowNo,
            sjNo: delivery.sjNo || '',
            deliveryDate: delivery.deliveryDate || '',
            soNo: soNo || '',
            customer: delivery.customer || '',
            productCode: '',
            productName: delivery.product || '',
            qty: delivery.qty || 0,
            unit: 'PCS',
            spkNo: delivery.spkNo || '',
            driver: delivery.driver || '',
            vehicleNo: delivery.vehicleNo || '',
            status: delivery.status || '',
            signedDoc: (delivery.signedDocument || delivery.signedDocumentPath || delivery.fileId) ? 'Yes' : 'No',
            receivedDate: delivery.receivedDate || '',
          });
        }
      });

      // Define columns with uppercase headers
      const columns: ExcelColumn[] = [
        { key: 'no', header: 'NO', width: 8 },
        { key: 'sjNo', header: 'SJ NO', width: 18 },
        { key: 'deliveryDate', header: 'DELIVERY DATE', width: 16 },
        { key: 'soNo', header: 'SO NO', width: 20 },
        { key: 'customer', header: 'CUSTOMER', width: 30 },
        { key: 'productCode', header: 'PRODUCT CODE', width: 18 },
        { key: 'productName', header: 'PRODUCT NAME', width: 40 },
        { key: 'qty', header: 'QTY', width: 12 },
        { key: 'unit', header: 'UNIT', width: 10 },
        { key: 'spkNo', header: 'SPK NO', width: 18 },
        { key: 'driver', header: 'DRIVER', width: 20 },
        { key: 'vehicleNo', header: 'VEHICLE NO', width: 15 },
        { key: 'status', header: 'STATUS', width: 12 },
        { key: 'signedDoc', header: 'SIGNED DOC', width: 12 },
        { key: 'receivedDate', header: 'RECEIVED DATE', width: 16 },
      ];

      // Create worksheet
      const ws = workbook.addWorksheet('Delivery Notes');
      
      // Add header row with styling
      const headerRow = ws.addRow(columns.map(col => col.header));
      headerRow.height = 20;
      headerRow.eachCell((cell: any) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF366092' } // Dark blue
        };
        cell.font = {
          bold: true,
          color: { argb: 'FFFFFFFF' }, // White text
          size: 11
        };
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } },
        };
      });

      // Set column widths
      columns.forEach((col, idx) => {
        ws.columns[idx].width = col.width || 15;
      });

      // Add data rows with alternating colors per SO
      let currentSoNo: any = null;
      let colorIndex = 0;
      
      exportData.forEach((row, rowIndex) => {
        // Change color when SO changes
        if (row.soNo !== currentSoNo) {
          currentSoNo = row.soNo;
          colorIndex = (colorIndex + 1) % 2;
        }

        const rowData = columns.map(col => {
          let value = row[col.key];
          
          // Format dates
          if ((col.key === 'deliveryDate' || col.key === 'receivedDate') && value) {
            try {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                return date.toLocaleDateString('id-ID', { 
                  year: 'numeric', 
                  month: '2-digit', 
                  day: '2-digit' 
                });
              }
            } catch (e) {
              // Return as-is if date parsing fails
            }
          }
          
          return value !== undefined && value !== null ? value : '';
        });

        const excelRow = ws.addRow(rowData);
        
        // Alternating row colors per SO group
        const bgColor = colorIndex === 0 ? 'FFFFFFFF' : 'FFF0F8FF'; // White or light blue
        
        excelRow.eachCell((cell: any, colNumber: number) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: bgColor }
          };
          
          // Alignment based on column type
          const colKey = columns[colNumber - 1]?.key;
          if (colKey === 'no' || colKey === 'qty') {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
          }
          
          // Borders for all cells
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } },
          };
          
          // Thicker bottom border between SO groups
          if (rowIndex === exportData.length - 1 || exportData[rowIndex + 1]?.soNo !== row.soNo) {
            cell.border.bottom = { style: 'medium', color: { argb: 'FF000000' } };
          }
        });
      });

      // Add summary row
      const totalQty = exportData.reduce((sum, d) => sum + (d.qty || 0), 0);
      const summaryRow = ws.addRow([
        'TOTAL',
        '',
        '',
        '',
        '',
        '',
        '',
        totalQty,
        '',
        '',
        '',
        '',
        '',
        '',
        ''
      ]);
      
      summaryRow.height = 22;
      summaryRow.eachCell((cell: any) => {
        cell.font = { bold: true, size: 11 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFD966' } // Light yellow
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF000000' } },
          bottom: { style: 'medium', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } },
        };
      });

      // Freeze header row
      ws.views = [{ state: 'frozen', ySplit: 1 }];

      // Save file for browser (use buffer and blob, not writeFile)
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      // Create download link
      const fileName = `Delivery_Notes_${new Date().toISOString().split('T')[0]}.xlsx`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showAlert('Success', `✅ Exported ${exportData.length} delivery items to ${fileName}`);

    } catch (error: any) {
      showAlert('Error', `Error exporting to Excel: ${error.message}`);
    }
  };

  const handleImportDeliveryCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (jsonData.length === 0) {
          showAlert('Error', 'CSV file is empty or has no data');
          return;
        }

        // Helper untuk map column (case-insensitive)
        const mapColumn = (row: any, possibleNames: string[]): string => {
          for (const name of possibleNames) {
            const keys = Object.keys(row);
            const found = keys.find(k => k.toLowerCase().trim() === name.toLowerCase().trim());
            if (found && row[found]) return String(row[found]).trim();
          }
          return '';
        };

        // Helper untuk parse quantity (remove spaces and commas)
        const parseQty = (qtyStr: string): number => {
          if (!qtyStr) return 0;
          const cleaned = qtyStr.toString().replace(/,/g, '').replace(/\s/g, '').trim();
          return parseFloat(cleaned) || 0;
        };

        // Helper untuk parse date
        const parseDate = (dateStr: string): string => {
          if (!dateStr) return new Date().toISOString();
          try {
            if (dateStr.includes('T') && dateStr.includes('Z')) {
              return dateStr;
            }
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              return date.toISOString();
            }
            // Try format "02-Jan-26"
            const parts = dateStr.split('-');
            if (parts.length === 3) {
              const day = parseInt(parts[0], 10);
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const month = monthNames.indexOf(parts[1]) + 1;
              let year = parseInt(parts[2], 10);
              if (year < 100) year += 2000;
              const date = new Date(year, month - 1, day);
              if (!isNaN(date.getTime())) {
                return date.toISOString();
              }
            }
          } catch (e) {
            console.log('Date parsing error:', e);
          }
          return new Date().toISOString();
        };

        // Process delivery data
        const errors: string[] = [];
        const createdDeliveries: DeliveryNote[] = [];
        const createdInvoices: any[] = [];
        const confirmedSONos = new Set<string>(); // Track SO numbers to confirm
        let successCount = 0;

        // Get existing data
        const existingSalesOrders = await storageService.get<SalesOrder[]>('salesOrders') || [];
        const existingInvoices = await storageService.get<any[]>('invoices') || [];
        const existingDeliveries = await storageService.get<DeliveryNote[]>('delivery') || [];

        // Process each row
        for (let index = 0; index < jsonData.length; index++) {
          const row = jsonData[index];
          try {
            const soNo = mapColumn(row, ['So No', 'SO No', 'SO NO', 'soNo', 'so_no']);
            const customer = mapColumn(row, ['CUSTOMER', 'Customer', 'customer']);
            const namaItem = mapColumn(row, ['Nama Item', 'NAMA ITEM', 'nama item']);
            const productId = mapColumn(row, ['Product_id', 'PRODUCT_ID', 'product_id', 'ProductId']);
            const padCode = mapColumn(row, ['Pad Code', 'PAD CODE', 'pad code', 'padCode']);
            const jml = parseQty(mapColumn(row, ['Jml', 'JML', 'Jumlah', 'jumlah', 'Qty', 'qty']));
            const delivery = parseQty(mapColumn(row, ['DELIVERY', 'Delivery', 'delivery']));
            const dateStr = mapColumn(row, ['Date', 'DATE', 'date']);

            // Skip if no delivery data
            if (!delivery || delivery === 0) {
              continue; // Skip rows with no delivery
            }

            if (!soNo || !customer || !namaItem) {
              errors.push(`Row ${index + 2}: Missing required fields (So No, Customer, or Nama Item)`);
              continue;
            }

            // Find matching SO
            const matchingSO = existingSalesOrders.find(so => so.soNo === soNo);
            if (!matchingSO) {
              errors.push(`Row ${index + 2}: SO ${soNo} not found in system`);
              continue;
            }

            // Track SO for confirmation
            confirmedSONos.add(soNo);

            // Create Delivery Note (Surat Jalan) with CLOSE status
            const deliveryId = `DN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const sjNo = `SJ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            const deliveryNote: DeliveryNote = {
              id: deliveryId,
              sjNo: sjNo,
              soNo: soNo,
              customer: customer,
              status: 'CLOSE', // Auto-set to CLOSE since delivery data exists
              items: [{
                product: namaItem,
                productCode: productId || padCode,
                qty: delivery, // Use delivered qty
                unit: 'PCS',
                soNo: soNo,
              }],
              deliveryDate: parseDate(dateStr),
              created: new Date().toISOString(),
              lastUpdate: new Date().toISOString(),
              timestamp: Date.now(),
            };

            createdDeliveries.push(deliveryNote);

            // Auto-create Invoice
            const invoiceId = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const invoice: any = {
              id: invoiceId,
              invoiceNo: `INV-${Date.now()}`,
              soNo: soNo,
              sjNo: sjNo,
              customer: customer,
              items: [{
                product: namaItem,
                productCode: productId || padCode,
                qty: delivery, // Invoice for delivered qty only
                unit: 'PCS',
                price: 0, // Will be filled from SO if available
              }],
              status: 'OPEN',
              totalAmount: 0,
              created: new Date().toISOString(),
              lastUpdate: new Date().toISOString(),
              timestamp: Date.now(),
            };

            createdInvoices.push(invoice);
            successCount++;

          } catch (error: any) {
            errors.push(`Row ${index + 2}: ${error.message}`);
          }
        }

        if (successCount === 0) {
          showAlert('Error', 'No valid delivery data found to import');
          return;
        }

        // Save to storage
        const allDeliveries = [...existingDeliveries, ...createdDeliveries];
        const allInvoices = [...existingInvoices, ...createdInvoices];

        // Auto-confirm matching SO
        const updatedSalesOrders = existingSalesOrders.map((so: SalesOrder) => {
          if (confirmedSONos.has(so.soNo)) {
            return {
              ...so,
              status: 'CONFIRMED', // Auto-confirm
              lastUpdate: new Date().toISOString(),
              timestamp: Date.now(),
            };
          }
          return so;
        });

        await storageService.set(StorageKeys.PACKAGING.DELIVERY, allDeliveries);
        await storageService.set(StorageKeys.PACKAGING.INVOICES, allInvoices);
        await storageService.set(StorageKeys.PACKAGING.SALES_ORDERS, updatedSalesOrders);

        // Log activity
        logCreate('delivery', `import-${Date.now()}`, 'delivery', {
          count: successCount,
          fileName: file.name,
          confirmedSOs: Array.from(confirmedSONos).length,
        });

        // Reload data
        loadDeliveries();


        // Show result
        let message = `✅ Successfully imported ${successCount} delivery notes and created ${successCount} invoices\n✅ Auto-confirmed ${Array.from(confirmedSONos).length} Sales Orders`;
        if (errors.length > 0) {
          message += `\n\n⚠️ ${errors.length} rows skipped:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... and ${errors.length - 5} more` : ''}`;
        }
        showAlert('Success', message);

      } catch (error: any) {
        showAlert('Error', `Error importing CSV: ${error.message}`);
      }
    };
    input.click();
  };

  const handleSJReminder = async (notification: any) => {
    const spkNo = notification.notif?.spkNo || notification.spkNo || 'N/A';
    const customer = notification.notif?.customer || notification.customer || 'N/A';
    const product = notification.notif?.product || notification.product || 'N/A';
    const qty = notification.notif?.qty || notification.qty || 0;
    
    // Check if reminder already sent
    if (notification.reminderSent) {
      showAlert(
        `✅ Reminder schedule delivery sudah di kirim\n\nSPK: ${spkNo}`,
        'Information'
      );
      return;
    }
    
    showConfirm(
      'Mark reminder as sent?',
      `SPK: ${spkNo}\nCustomer: ${customer}\nProduct: ${product}\nQty: ${qty} PCS`,
      async () => {
        try {
          // Get existing notifications
          const existingNotifications = await storageService.get<any[]>('deliveryNotifications') || [];
          
          // Update the notification to mark reminder as sent
          const updatedNotifications = existingNotifications.map((n: any) => {
            const notifSpkNo = (n.spkNo || '').toString().trim();
            const currentSpkNo = (spkNo || '').toString().trim();
            if (notifSpkNo === currentSpkNo) {
              return { ...n, reminderSent: true };
            }
            return n;
          });
          
          await storageService.set(StorageKeys.PACKAGING.DELIVERY_NOTIFICATIONS, updatedNotifications);
          
          showAlert(
            `✅ Reminder schedule delivery sudah di kirim\n\nSPK: ${spkNo}`,
            'Success'
          );
          
          // Reload notifications
          loadNotifications();
        } catch (error: any) {
          showAlert(`Error: ${error.message}`, 'Error');
        }
      }
    );
  };

  // State untuk track expanded items di table view
  const [expandedDeliveryIds, setExpandedDeliveryIds] = useState<Set<string>>(new Set());

  const toggleExpandDelivery = (deliveryId: string) => {
    const newExpanded = new Set(expandedDeliveryIds);
    if (newExpanded.has(deliveryId)) {
      newExpanded.delete(deliveryId);
    } else {
      newExpanded.add(deliveryId);
    }
    setExpandedDeliveryIds(newExpanded);
  };

  const columns = useMemo(() => [
    {
      key: 'sjNo',
      header: 'SJ No (Surat Jalan No)',
      render: (item: DeliveryNote) => {
        if (item.isRecap) {
          return <span style={{ fontWeight: 600, color: '#9C27B0' }}>{item.sjNo} (RECAP)</span>;
        }
        return item.sjNo || '-';
      }
    },
    {
      key: 'soNo',
      header: t('salesOrder.number') || 'SO No',
      render: (item: DeliveryNote) => {
        if (item.isRecap) {
          if (item.soNos && item.soNos.length > 0) {
            return <span>SO: {item.soNos.join(', ')}</span>;
          } else if (item.soNo) {
            return <span>SO: {item.soNo}</span>;
          } else if (item.mergedSjNos && item.mergedSjNos.length > 0) {
            return <span>Merged from: {item.mergedSjNos.join(', ')}</span>;
          }
        }
        return item.soNo || '-';
      }
    },
    { key: 'customer', header: t('master.customerName') || 'Customer' },
    {
      key: 'product',
      header: t('master.productName') || 'Product(s)',
      render: (item: DeliveryNote) => {
        if (item.items && Array.isArray(item.items) && item.items.length > 0) {
          const items = item.items;
          const isExpanded = expandedDeliveryIds.has(item.id);
          const showExpandButton = items.length > 1;

          return (
            <div>
              {/* First item - always shown */}
              {items.length > 0 && (
                <div style={{ marginBottom: items.length > 1 ? '6px' : '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                    {showExpandButton && (
                      <button
                        onClick={() => toggleExpandDelivery(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0 4px',
                          fontSize: '14px',
                          color: 'var(--primary-color)',
                          fontWeight: 'bold',
                          minWidth: '20px',
                          textAlign: 'center',
                        }}
                        title={isExpanded ? 'Hide items' : 'Show all items'}
                      >
                        {isExpanded ? '▼' : '▶'}
                      </button>
                    )}
                    {!showExpandButton && <span style={{ minWidth: '20px' }}></span>}
                    <strong>{items[0].product}</strong> ({items[0].qty} {items[0].unit || 'PCS'})
                    {(() => {
                      const info = getRemainingInfo(items[0].product || '', item.soNo || (item.soNos && item.soNos[0]) || '', items[0].productCode || '');
                      if (!info) return null;
                      return (
                        <span
                          title={`Order: ${info.orderQty}, Total Delivered: ${info.delivered}`}
                          style={{
                            padding: '1px 4px',
                            backgroundColor: info.remaining === 0 ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                            color: info.remaining === 0 ? '#4caf50' : '#ff9800',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 600,
                            border: `1px solid ${info.remaining === 0 ? '#4caf50' : '#ff9800'}`,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Remain: {info.remaining}
                        </span>
                      );
                    })()}
                  </div>
                  {(() => {
                    const productCode = items[0].productCode || '';
                    const masterProduct = products.find(p =>
                      (p.product_id || p.kode) === productCode
                    );
                    const padCode = masterProduct?.padCode || '';
                    return padCode && <span style={{ fontSize: '11px', color: 'var(--primary)', display: 'block', marginTop: '2px', marginLeft: '24px' }}>PAD: {padCode}</span>;
                  })()}
                </div>
              )}

              {/* Additional items - shown when expanded */}
              {isExpanded && items.length > 1 && (
                <div style={{ marginTop: '8px', paddingLeft: '8px', borderLeft: '2px solid var(--border-color)' }}>
                  {items.slice(1).map((itm: any, idx: number) => {
                    const productCode = itm.productCode || '';
                    const masterProduct = products.find(p =>
                      (p.product_id || p.kode) === productCode
                    );
                    const padCode = masterProduct?.padCode || '';
                    return (
                      <div key={idx} style={{ marginBottom: idx < items.length - 2 ? '6px' : '0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                          <span style={{ minWidth: '20px' }}></span>
                          <strong>{itm.product}</strong> ({itm.qty} {itm.unit || 'PCS'})
                          {(() => {
                            const info = getRemainingInfo(itm.product || '', item.soNo || (item.soNos && item.soNos[0]) || '', itm.productCode || '');
                            if (!info) return null;
                            return (
                              <span
                                title={`Order: ${info.orderQty}, Total Delivered: ${info.delivered}`}
                                style={{
                                  padding: '1px 4px',
                                  backgroundColor: info.remaining === 0 ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                                  color: info.remaining === 0 ? '#4caf50' : '#ff9800',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  border: `1px solid ${info.remaining === 0 ? '#4caf50' : '#ff9800'}`,
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                Remain: {info.remaining}
                              </span>
                            );
                          })()}
                        </div>
                        {padCode && <span style={{ fontSize: '11px', color: 'var(--primary)', display: 'block', marginTop: '2px', marginLeft: '24px' }}>PAD: {padCode}</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Show count badge when collapsed */}
              {!isExpanded && items.length > 1 && (
                <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '24px' }}>
                  +{items.length - 1} more item{items.length - 1 > 1 ? 's' : ''}
                </div>
              )}
            </div>
          );
        }
        // Fallback untuk old format
        return <div>{item.product || '-'} ({item.qty || 0} PCS)</div>;
      },
    },
    {
      key: 'padCode',
      header: 'Pad Code',
      render: (item: DeliveryNote) => {
        if (item.items && Array.isArray(item.items) && item.items.length > 0) {
          const padCodes = item.items.map((itm: any) => {
            const productId = itm.productCode || itm.productId || '';
            const masterProduct = products.find(p =>
              (p.product_id || p.kode) === productId
            );
            return masterProduct?.padCode || '';
          }).filter((code: string) => code);

          if (padCodes.length === 0) return <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>-</span>;
          return (
            <div>
              {padCodes.map((code: string, idx: number) => (
                <div key={idx} style={{ fontSize: '12px', color: 'var(--primary)' }}>
                  {code}
                </div>
              ))}
            </div>
          );
        }
        return <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>-</span>;
      },
    },
    {
      key: 'qty',
      header: t('common.quantity') || 'Total Qty',
      render: (item: DeliveryNote) => {
        if (item.items && Array.isArray(item.items) && item.items.length > 0) {
          const totalQty = item.items.reduce((sum: number, itm: any) => sum + (itm.qty || 0), 0);
          return <div>{totalQty} PCS</div>;
        }
        return <div>{item.qty || 0} PCS</div>;
      },
    },
    {
      key: 'deliveryDate',
      header: t('common.date') || 'Tanggal Kirim',
      render: (item: DeliveryNote) => (
        <div>{formatDateSimple(item.deliveryDate)}</div>
      ),
    },
    {
      key: 'status',
      header: t('common.status') || 'Status',
      render: (item: DeliveryNote) => (
        <span className={`status-badge status-${item.status.toLowerCase()}`}>
          {item.status}
        </span>
      ),
    },
    {
      key: 'created',
      header: t('common.createdAt') || 'Created',
      render: (item: DeliveryNote) => {
        const createdDate = item.created || '';
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
              <div style={{ fontWeight: '500' }}>{`${day}/${month}/${year}`}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{`${hours}:${minutes}:${seconds}`}</div>
            </div>
          );
        } catch {
          return <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>-</span>;
        }
      },
    },
    {
      key: 'actions',
      header: t('common.actions') || 'Actions',
      render: (item: DeliveryNote) => renderDeliveryActions(item),
    },
  ], [t]);

  // Format notifications untuk NotificationBell
  const deliveryNotifications = useMemo(() => {
    return notifications
      .map((notif: any) => {
        // Ambil SPK number (dengan suffix -SJ{number} jika ada)
        const spkNo = notif.spkNo || (notif.spkNos && notif.spkNos.length > 0 ? notif.spkNos[0] : 'N/A');

        // Cek apakah SPK punya suffix -SJ{number}
        const hasSjSuffix = /-SJ\d+$/.test(spkNo);

        // Ambil sjGroupId untuk display
        const sjGroupId = notif.sjGroupId || (notif.deliveryBatches && notif.deliveryBatches[0]?.sjGroupId) || null;
        const sjDisplay = sjGroupId ? sjGroupId.replace('sj-group-', 'SJ-') : '';

        // Format message dengan SPK, customer, dan batch info
        let message = `${notif.customer || 'N/A'} | SPK: ${spkNo}`;
        if (hasSjSuffix) {
          // Jika sudah punya suffix -SJ{number}, tampilkan dengan jelas
          const sjMatch = spkNo.match(/-SJ(\d+)$/);
          const sjNumber = sjMatch ? sjMatch[1] : '';
          message = `${notif.customer || 'N/A'} | SPK: ${spkNo} (Batch ${sjNumber})`;
        } else if (sjDisplay) {
          // Jika belum punya suffix tapi punya sjGroupId, tambahkan info batch
          message = `${notif.customer || 'N/A'} | SPK: ${spkNo} | ${sjDisplay}`;
        }
        message += ` | ${notif.qty || 0} PCS`;

        return {
          id: notif.id,
          title: `SO ${notif.soNo || 'N/A'}`,
          message: message,
          notif: notif,
        };
      });
  }, [notifications]);

  // Paginated delivery data (using grouped data for card view)
  const paginatedGroupedDeliveries = useMemo(() => {
    const startIndex = (deliveryCurrentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return groupedDeliveries.slice(startIndex, endIndex);
  }, [groupedDeliveries, deliveryCurrentPage, itemsPerPage]);

  const deliveryTotalPages = Math.ceil(groupedDeliveries.length / itemsPerPage);

  // Outstanding delivery data (filtered for OPEN status)
  const outstandingDeliveries = useMemo(() => {
    return filteredDeliveries.filter((item: any) => item.status === 'OPEN');
  }, [filteredDeliveries]);

  const paginatedOutstandingDeliveries = useMemo(() => {
    const startIndex = (outstandingDeliveryPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return outstandingDeliveries.slice(startIndex, endIndex);
  }, [outstandingDeliveries, outstandingDeliveryPage, itemsPerPage]);

  const outstandingDeliveryTotalPages = Math.ceil(outstandingDeliveries.length / itemsPerPage);

  // Reset pagination when tab or search changes
  useEffect(() => {
    setDeliveryCurrentPage(1);
    setOutstandingDeliveryPage(1);
  }, [activeTab, searchQuery]);

  return (
    <div className="module-compact">
      {/* 🚀 FIX: Loading overlay when creating delivery from notification */}
      {showLoadingOverlay && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
              animation: 'spin 1s linear infinite',
            }}>⏳</div>
            <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>Creating Delivery Note...</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Please wait while we process your request</div>
          </div>
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
      
      <div className="page-header">
        <h1>WH/Delivery (Surat Jalan)</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {notifications.length > 0 && (
            <NotificationBell
              notifications={deliveryNotifications}
              onNotificationClick={(notification) => {
                console.log('[DeliveryNote] Notification clicked:', notification);
                if (notification.notif) {
                  console.log('[DeliveryNote] Calling handleCreateFromNotification with:', notification.notif);
                  handleCreateFromNotification(notification.notif);
                } else {
                  console.log('[DeliveryNote] ⚠️ notification.notif is missing!');
                }
              }}
              onSJReminder={(notification) => handleSJReminder(notification)}
              icon="📧"
              emptyMessage="Tidak ada notifikasi delivery"
            />
          )}
          <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
          <Button variant="secondary" onClick={handleImportDeliveryCSV}>📤 Import Delivery CSV</Button>
          <Button onClick={handleCreate}>+ Create Delivery Note</Button>
        </div>
      </div>

      {showCreateSJRecapDialog && (
        <CreateSJRecapDialog
          deliveries={deliveries}
          onClose={() => setShowCreateSJRecapDialog(false)}
          onCreate={async (data: { sjNos: string[]; soNos: string[]; customer: string; deliveryDate: string; specNote?: string }) => {
            try {
              // Generate SJ Recap number
              const now = new Date();
              const year = String(now.getFullYear()).slice(-2);
              const month = String(now.getMonth() + 1).padStart(2, '0');
              const day = String(now.getDate()).padStart(2, '0');
              const randomCode = Math.random().toString(36).substr(2, 5).toUpperCase();
              const sjNo = `SJ-${year}${month}${day}-${randomCode}`;

              // Load all deliveries untuk merge items
              const allDeliveries = await storageService.get<DeliveryNote[]>('delivery') || [];
              const selectedDeliveries = allDeliveries.filter(d => data.sjNos.includes(d.sjNo || ''));

              // Merge items dari semua SJ yang dipilih
              const mergedItems: DeliveryNoteItem[] = [];
              selectedDeliveries.forEach(delivery => {
                if (delivery.items && delivery.items.length > 0) {
                  delivery.items.forEach(item => {
                    // Cari item yang sama (berdasarkan product dan productCode tanpa description)
                    const baseProductCode = item.productCode?.replace(/\s*\([^)]*\)/g, '').trim() || '';
                    const existingItem = mergedItems.find(i => {
                      const iBaseCode = i.productCode?.replace(/\s*\([^)]*\)/g, '').trim() || '';
                      return i.product === item.product &&
                        iBaseCode === baseProductCode &&
                        i.unit === item.unit;
                    });

                    if (existingItem) {
                      // Jika item sudah ada, tambahkan qty dan update description dengan SJ number
                      existingItem.qty += item.qty;
                      // Extract existing SJ numbers dari description
                      const existingSJs: string[] = existingItem.productCode?.match(/\(([^)]+)\)/g) || [];
                      const sjNoToAdd = `(${delivery.sjNo})`;
                      if (!existingSJs.includes(sjNoToAdd)) {
                        existingSJs.push(sjNoToAdd);
                      }
                      // Rebuild productCode dengan base code + semua SJ numbers
                      const baseCode = existingItem.productCode?.replace(/\s*\([^)]*\)/g, '').trim() || '';
                      existingItem.productCode = baseCode ? `${baseCode} ${existingSJs.join(' ')}` : existingSJs.join(' ');
                    } else {
                      // Item baru, tambahkan dengan description SJ
                      const baseCode = baseProductCode;
                      const sjDesc = `(${delivery.sjNo})`;
                      mergedItems.push({
                        ...item,
                        productCode: baseCode ? `${baseCode} ${sjDesc}` : sjDesc,
                      });
                    }
                  });
                }
              });

              // Buat SJ Recap baru
              // IMPORTANT: SJ Recap status tetap CLOSE (tidak mengubah status SJ yang di-merge)
              // SJ Recap hanya untuk merge print, tidak mempengaruhi status atau trigger invoice
              const newRecap: DeliveryNote = {
                id: Date.now().toString(),
                sjNo: sjNo,
                soNo: data.soNos && data.soNos.length > 0 ? data.soNos[0] : (selectedDeliveries[0]?.soNo || ''),
                soNos: data.soNos && Array.isArray(data.soNos) && data.soNos.length > 0 ? data.soNos : undefined,
                customer: data.customer,
                items: mergedItems,
                status: 'CLOSE', // Status tetap CLOSE (tidak mengubah status SJ yang di-merge)
                deliveryDate: data.deliveryDate,
                specNote: data.specNote || '',
                isRecap: true,
                mergedSjNos: data.sjNos,
                created: new Date().toISOString(),
                lastUpdate: new Date().toISOString(),
                timestamp: Date.now(),
                _timestamp: Date.now(),
              };

              // IMPORTANT: Soft delete SJ yang di-merge (hanya untuk tab Recap)
              // SJ yang di-merge tidak muncul di tab Delivery Note, hanya muncul di tab Recap sebagai bagian dari SJ Recap
              const updatedDeliveries = allDeliveries.map(d => {
                if (data.sjNos.includes(d.sjNo || '')) {
                  return {
                    ...d,
                    deleted: true,
                    deletedAt: new Date().toISOString(),
                    lastUpdate: new Date().toISOString(),
                    timestamp: Date.now(),
                    _timestamp: Date.now(),
                  };
                }
                return d;
              });

              // Tambahkan SJ Recap baru
              updatedDeliveries.push(newRecap);

              await storageService.set(StorageKeys.PACKAGING.DELIVERY, updatedDeliveries);

              // IMPORTANT: Reload deliveries untuk memastikan filterActiveItems bekerja dengan benar
              // Ini memastikan SJ yang di-merge (deleted) tidak muncul di tab Delivery Note
              await loadDeliveries();
              setShowCreateSJRecapDialog(false);
              showAlert('Success', `✅ SJ Recap created: ${sjNo}\n\nMerged ${data.sjNos.length} SJ(s)`);
            } catch (error: any) {
              showAlert('Error', `Error creating SJ Recap: ${error.message}`);
            }
          }}
        />
      )}

      {showCreateDeliveryNoteDialog && (
        <CreateDeliveryNoteDialog
          deliveries={deliveries}
          initialMode={initialDialogMode}
          initialSelectedSJs={initialSelectedSJs}
          onClose={() => {
            setShowCreateDeliveryNoteDialog(false);
            setInitialDialogMode('po');
            setInitialSelectedSJs([]);
          }}
          onCreate={async (data: { poNos?: string[]; soNos?: string[]; sjNos?: string[]; manualData?: any }) => {
            try {
              if (data.sjNos && data.sjNos.length > 0) {
                // Create SJ dari SJ yang dipilih (merge/duplicate)
                const sjData = await storageService.get<any[]>('delivery') || [];
                const selectedSJItems = sjData.filter((sj: any) => data.sjNos!.includes(sj.sjNo));

                // Gabungkan semua items dari semua SJ yang dipilih
                const allItems: DeliveryNoteItem[] = [];
                const soNos: string[] = [];

                selectedSJItems.forEach((sj: any) => {
                  if (sj.soNo && !soNos.includes(sj.soNo)) {
                    soNos.push(sj.soNo);
                  }
                  if (sj.soNos && Array.isArray(sj.soNos)) {
                    sj.soNos.forEach((so: string) => {
                      if (!soNos.includes(so)) {
                        soNos.push(so);
                      }
                    });
                  }

                  const items = sj.items || [];
                  items.forEach((item: any) => {
                    allItems.push({
                      product: item.product || '',
                      productCode: item.productCode || '',
                      qty: Number(item.qty || 0),
                      unit: item.unit || 'PCS',
                      spkNo: item.spkNo || '',
                      soNo: item.soNo || sj.soNo || '',
                    });
                  });
                });

                const now = new Date();
                const year = String(now.getFullYear()).slice(-2);
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const randomCode = Math.random().toString(36).substr(2, 5).toUpperCase();
                const sjNo = `SJ-${year}${month}${day}-${randomCode}`;

                const newDelivery: DeliveryNote = {
                  id: Date.now().toString(),
                  sjNo,
                  soNo: soNos[0] || '',
                  soNos: soNos.length > 1 ? soNos : undefined,
                  customer: data.manualData.customer || '',
                  items: allItems,
                  status: 'OPEN' as const,
                  deliveryDate: data.manualData.deliveryDate || undefined,
                  productCodeDisplay: data.manualData.productCodeDisplay || 'padCode',
                  specNote: data.manualData.specNote || undefined,
                  created: new Date().toISOString(),
                  lastUpdate: new Date().toISOString(),
                  timestamp: Date.now(),
                  _timestamp: Date.now(),
                };

                const allDeliveries = await storageService.get<DeliveryNote[]>('delivery') || [];
                const updated = [...allDeliveries, newDelivery];
                await storageService.set(StorageKeys.PACKAGING.DELIVERY, updated);
                const activeDeliveries = updated.filter(d => !d.deleted);
                setDeliveries(activeDeliveries);

                // IMPORTANT: SET OUTGOING saat delivery note dibuat (sebelum upload signed document)
                // outgoing = stock yang sedang untuk dikirim (dikirim (sudah dibuat SJ tapi belum diterima customer))
                await setOutgoingFromDelivery(newDelivery);

                showAlert('Success', `Delivery Note ${sjNo} berhasil dibuat dari ${data.sjNos.length} SJ`);
              } else if (data.poNos && data.poNos.length > 0) {
                // Create SJ dari PO yang dipilih
                const poData = await storageService.get<any[]>('purchaseOrders') || [];
                const selectedPOItems = poData.filter((po: any) => data.poNos!.includes(po.poNo));

                // Ambil SO dari PO
                const soNos: string[] = [];
                const allItems: DeliveryNoteItem[] = [];

                selectedPOItems.forEach((po: any) => {
                  if (po.soNo && !soNos.includes(po.soNo)) {
                    soNos.push(po.soNo);
                  }

                  // Buat item dari PO
                  allItems.push({
                    product: po.materialItem || '',
                    productCode: '',
                    qty: po.qty || 0,
                    unit: 'PCS',
                    spkNo: po.spkNo || '',
                    soNo: po.soNo || '',
                  });
                });

                // Generate random SJ number
                const now = new Date();
                const year = String(now.getFullYear()).slice(-2);
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const randomCode = Math.random().toString(36).substr(2, 5).toUpperCase();
                const sjNo = `SJ-${year}${month}${day}-${randomCode}`;

                const newDelivery: DeliveryNote = {
                  id: Date.now().toString(),
                  sjNo,
                  soNo: soNos[0] || '', // Backward compatibility
                  soNos: soNos.length > 1 ? soNos : undefined, // Multiple SO
                  customer: data.manualData.customer || '',
                  items: allItems,
                  status: 'OPEN' as const,
                  deliveryDate: data.manualData.deliveryDate || undefined,
                  productCodeDisplay: data.manualData.productCodeDisplay || 'padCode',
                  specNote: data.manualData.specNote || undefined,
                  created: new Date().toISOString(),
                  lastUpdate: new Date().toISOString(),
                  timestamp: Date.now(),
                  _timestamp: Date.now(),
                };

                const allDeliveries = await storageService.get<DeliveryNote[]>('delivery') || [];
                const updated = [...allDeliveries, newDelivery];
                await storageService.set(StorageKeys.PACKAGING.DELIVERY, updated);
                const activeDeliveries = updated.filter(d => !d.deleted);
                setDeliveries(activeDeliveries);

                // IMPORTANT: SET OUTGOING saat delivery note dibuat (sebelum upload signed document)
                // outgoing = stock yang sedang untuk dikirim (dikirim (sudah dibuat SJ tapi belum diterima customer))
                await setOutgoingFromDelivery(newDelivery);

                showAlert('Success', `Delivery Note ${sjNo} berhasil dibuat dari ${data.poNos.length} PO`);
              } else if (data.soNos && data.soNos.length > 0) {
                // Create SJ dari SO yang dipilih
                const soData = await storageService.get<any[]>('salesOrders') || [];
                const selectedSOItems = soData.filter((so: any) => data.soNos!.includes(so.soNo));

                // Use items from manualData if available (contains edited quantities)
                const allItems: DeliveryNoteItem[] = (data.manualData?.items || []).map((item: any) => ({
                  product: item.product || '',
                  productCode: item.productCode || '',
                  qty: Number(item.qty || 0),
                  unit: item.unit || 'PCS',
                  spkNo: item.spkNo || '',
                  soNo: item.soNo || '',
                }));

                // Fallback if no items in manualData (should not happen given dialog validation)
                if (allItems.length === 0) {
                  selectedSOItems.forEach((so: any) => {
                    const items = so.items || [];
                    items.forEach((item: any) => {
                      allItems.push({
                        product: item.productName || item.product || '',
                        productCode: item.productId || item.productKode || '',
                        qty: Number(item.qty || 0),
                        unit: item.unit || 'PCS',
                        spkNo: item.spkNo || '',
                        soNo: so.soNo,
                      });
                    });
                  });
                }

                const now = new Date();
                const year = String(now.getFullYear()).slice(-2);
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const randomCode = Math.random().toString(36).substr(2, 5).toUpperCase();
                const sjNo = `SJ-${year}${month}${day}-${randomCode}`;

                const newDelivery: DeliveryNote = {
                  id: Date.now().toString(),
                  sjNo,
                  soNo: data.soNos[0] || '',
                  soNos: data.soNos.length > 1 ? data.soNos : undefined,
                  customer: data.manualData.customer || '',
                  items: allItems,
                  status: 'OPEN' as const,
                  deliveryDate: data.manualData.deliveryDate || undefined,
                  productCodeDisplay: data.manualData.productCodeDisplay || 'padCode',
                  specNote: data.manualData.specNote || undefined,
                  created: new Date().toISOString(),
                  lastUpdate: new Date().toISOString(),
                  timestamp: Date.now(),
                  _timestamp: Date.now(),
                };

                const allDeliveries = await storageService.get<DeliveryNote[]>('delivery') || [];
                const updated = [...allDeliveries, newDelivery];
                await storageService.set(StorageKeys.PACKAGING.DELIVERY, updated);
                const activeDeliveries = updated.filter(d => !d.deleted);
                setDeliveries(activeDeliveries);

                // IMPORTANT: SET OUTGOING saat delivery note dibuat (sebelum upload signed document)
                // outgoing = stock yang sedang untuk dikirim (dikirim (sudah dibuat SJ tapi belum diterima customer))
                await setOutgoingFromDelivery(newDelivery);

                showAlert('Success', `Delivery Note ${sjNo} berhasil dibuat dari ${data.soNos.length} SO`);
              } else if (data.manualData) {
                // Create manual SJ
                const now = new Date();
                const year = String(now.getFullYear()).slice(-2);
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const randomCode = Math.random().toString(36).substr(2, 5).toUpperCase();
                const sjNo = `SJ-${year}${month}${day}-${randomCode}`;

                const items: DeliveryNoteItem[] = data.manualData.items.map((item: any) => ({
                  product: item.product || '',
                  productCode: item.productCode || '',
                  qty: item.qty || 0,
                  unit: item.unit || 'PCS',
                  spkNo: item.spkNo || '',
                }));

                const newDelivery: DeliveryNote = {
                  id: Date.now().toString(),
                  sjNo,
                  soNo: '',
                  customer: data.manualData.customer || '',
                  items,
                  status: 'OPEN' as const,
                  deliveryDate: data.manualData.deliveryDate || undefined,
                  productCodeDisplay: data.manualData.productCodeDisplay || 'padCode',
                  specNote: data.manualData.specNote || undefined,
                  created: new Date().toISOString(),
                  lastUpdate: new Date().toISOString(),
                  timestamp: Date.now(),
                  _timestamp: Date.now(),
                };

                const allDeliveries = await storageService.get<DeliveryNote[]>('delivery') || [];
                const updated = [...allDeliveries, newDelivery];
                await storageService.set(StorageKeys.PACKAGING.DELIVERY, updated);
                const activeDeliveries = updated.filter(d => !d.deleted);
                setDeliveries(activeDeliveries);

                // IMPORTANT: SET OUTGOING saat delivery note dibuat (sebelum upload signed document)
                // outgoing = stock yang sedang untuk dikirim (dikirim (sudah dibuat SJ tapi belum diterima customer))
                await setOutgoingFromDelivery(newDelivery);

                showAlert('Success', `Delivery Note ${sjNo} berhasil dibuat`);
              }

              await loadDeliveries();
              setShowCreateDeliveryNoteDialog(false);
            } catch (error: any) {
              // Removed console.error for performance
              showAlert('Error', `Gagal membuat Delivery Note: ${error.message || 'Unknown error'}`);
            }
          }}
        />
      )}

      {/* Notifications dari PPIC (Delivery Schedule) - HIDDEN, menggunakan NotificationBell di header */}
      {false && notifications.length > 0 && (
        <Card className="mb-4">
          <div style={{
            padding: '12px',
            backgroundColor: document.documentElement.getAttribute('data-theme') === 'light' ? '#4caf50' : '#2e7d32',
            borderRadius: '8px',
            color: document.documentElement.getAttribute('data-theme') === 'light' ? '#1a1a1a' : '#ffffff'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: false ? '10px' : 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                  📧 Ready to Ship ({notifications.length})
                </h3>
                <div style={{ fontSize: '13px', opacity: 0.9 }}>Production selesai & QC PASS</div>
              </div>
            </div>
            {false && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {notifications.map((notif: any) => {
                  // Helper untuk match SPK
                  const matchSPK = (spk1: string, spk2: string): boolean => {
                    if (!spk1 || !spk2) return false;
                    if (spk1 === spk2) return true;
                    const base1 = spk1.split('-').slice(0, 2).join('-');
                    const base2 = spk2.split('-').slice(0, 2).join('-');
                    return base1 === base2;
                  };

                  // Helper untuk mendapatkan qty per SPK dari schedule
                  const getQtyFromSchedule = (spkNo: string): number => {
                    if (!spkNo) return notif.qty || 0;

                    // IMPORTANT: Gunakan scheduleData state yang sudah ter-load
                    // Cari schedule yang match dengan SPK ini
                    const relatedSchedule = scheduleData.find((s: any) => {
                      if (!s.spkNo) return false;
                      return matchSPK(s.spkNo, spkNo);
                    });

                    if (relatedSchedule && relatedSchedule.deliveryBatches && Array.isArray(relatedSchedule.deliveryBatches) && relatedSchedule.deliveryBatches.length > 0) {
                      // Cari batch yang match dengan SPK ini (exact match atau batch format)
                      const matchingBatch = relatedSchedule.deliveryBatches.find((db: any) => {
                        if (db.spkNo) {
                          // Exact match atau batch format match
                          return matchSPK(db.spkNo, spkNo) || db.spkNo === spkNo;
                        }
                        return false; // Jangan gunakan batch tanpa spkNo
                      });

                      if (matchingBatch && matchingBatch.qty) {
                        return matchingBatch.qty;
                      }

                      // Fallback: jika tidak ada exact match, coba cari batch pertama yang match base SPK
                      // Support both formats: old (strip) and new (slash)
                      const normalizeSPK = (s: string) => s.replace(/-/g, '/');
                      const baseSpk = normalizeSPK(spkNo).split('/').slice(0, 2).join('/');
                      const baseMatchBatch = relatedSchedule.deliveryBatches.find((db: any) => {
                        if (db.spkNo) {
                          const dbBaseSpk = normalizeSPK(db.spkNo).split('/').slice(0, 2).join('/');
                          return dbBaseSpk === baseSpk;
                        }
                        return false;
                      });

                      if (baseMatchBatch && baseMatchBatch.qty) {
                        return baseMatchBatch.qty;
                      }
                    }

                    // Fallback: cek dari notification deliveryBatches
                    if (notif.deliveryBatches && Array.isArray(notif.deliveryBatches) && notif.deliveryBatches.length > 0) {
                      const matchingBatch = notif.deliveryBatches.find((db: any) => {
                        if (db.spkNo) {
                          return matchSPK(db.spkNo, spkNo) || db.spkNo === spkNo;
                        }
                        return false;
                      });
                      if (matchingBatch && matchingBatch.qty) {
                        return matchingBatch.qty;
                      }
                    }

                    // Fallback terakhir: gunakan qty dari notification
                    return notif.qty || 0;
                  };

                  return (
                    <div key={notif.id} style={{
                      flex: '0 1 260px',
                      minWidth: '220px',
                      maxWidth: '320px',
                      padding: '10px',
                      backgroundColor: 'rgba(255,255,255,0.12)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                        {notif.soNo && `SO ${notif.soNo}`}
                        {notif.soNo && (notif.spkNo || (notif.spkNos && notif.spkNos.length > 0)) && ' | '}
                        {notif.spkNo ? `SPK ${notif.spkNo}` : (notif.spkNos && notif.spkNos.length > 0 ? `SPK ${notif.spkNos.join(', ')}` : '')}
                        {!notif.soNo && !notif.spkNo && (!notif.spkNos || notif.spkNos.length === 0) && 'SPK N/A'}
                      </div>
                      <div>Customer: {notif.customer}</div>
                      {notif.isGrouped ? (
                        <>
                          <div style={{ marginTop: '6px', padding: '6px', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: '4px' }}>
                            <strong>Products ({notif.groupedNotifications.length})</strong>
                            {notif.groupedNotifications.map((n: any, idx: number) => {
                              // IMPORTANT: Ambil qty dari schedule (SO -> SPK -> deliveryBatches) per SPK
                              const spkNo = n.spkNo || (n.spkNos && n.spkNos.length > 0 ? n.spkNos[0] : null);
                              const productQty = getQtyFromSchedule(spkNo);

                              return (
                                <div key={idx} style={{ marginTop: '3px', fontSize: '11px' }}>
                                  • {n.product} - {productQty} PCS (SPK {spkNo})
                                </div>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Single notification - ambil qty dari deliveryBatches per SPK */}
                          {notif.spkNo ? (
                            <>
                              {notif.soNo && <div>SO: {notif.soNo}</div>}
                              <div>SPK: {notif.spkNo}</div>
                              <div>Product: {notif.product || 'N/A'}</div>
                              {(() => {
                                // IMPORTANT: Ambil qty dari schedule (SO -> SPK -> deliveryBatches), bukan dari notification
                                const productQty = getQtyFromSchedule(notif.spkNo);
                                return (
                                  <div>Qty: {productQty} PCS</div>
                                );
                              })()}
                              {notif.deliveryBatches && notif.deliveryBatches.length > 0 && notif.deliveryBatches[0].deliveryDate && (
                                <div>Delivery: {new Date(notif.deliveryBatches[0].deliveryDate).toLocaleDateString('id-ID')}</div>
                              )}
                            </>
                          ) : notif.spkNos && Array.isArray(notif.spkNos) && notif.spkNos.length > 0 ? (
                            <>
                              <div>SPK: {notif.spkNos.join(', ')}</div>
                              {notif.products && Array.isArray(notif.products) ? (
                                <>
                                  <div style={{ marginTop: '4px' }}>Products:</div>
                                  {notif.products.map((p: any, idx: number) => {
                                    // IMPORTANT: Ambil qty dari schedule (SO -> SPK -> deliveryBatches) per SPK
                                    const productQty = getQtyFromSchedule(p.spkNo);

                                    return (
                                      <div key={idx} style={{ fontSize: '11px', marginLeft: '8px' }}>
                                        - {p.product} (SPK: {p.spkNo}) - {productQty} PCS
                                      </div>
                                    );
                                  })}
                                </>
                              ) : (
                                <>
                                  <div>Product: Multiple Products</div>
                                  <div style={{ marginTop: '4px' }}>Qty: {notif.qty} PCS</div>
                                </>
                              )}
                            </>
                          ) : (
                            <>
                              <div>SPK: {notif.spkNo || 'N/A'}</div>
                              <div>Product: {notif.product || 'N/A'}</div>
                              {/* IMPORTANT: Ambil qty dari schedule (SO -> SPK -> deliveryBatches), bukan dari notification */}
                              {(() => {
                                const productQty = getQtyFromSchedule(notif.spkNo);
                                return <div>Qty: {productQty} PCS</div>;
                              })()}
                            </>
                          )}
                        </>
                      )}
                      {notif.deliveryBatches && notif.deliveryBatches.length > 0 && (
                        <div style={{ marginTop: '6px', fontSize: '11px', opacity: 0.9 }}>
                          Delivery: {notif.deliveryBatches[0].deliveryDate ? new Date(notif.deliveryBatches[0].deliveryDate).toLocaleDateString('id-ID') : '-'}
                        </div>
                      )}
                      <Button
                        variant="primary"
                        onClick={() => handleCreateFromNotification(notif)}
                        disabled={isLoadingNotificationData || isProcessingNotification === (notif.id || `${notif.soNo}-${notif.spkNo || notif.spkNos?.join('-') || 'unknown'}`)}
                        style={{ marginTop: '8px', fontSize: '11px', padding: '5px 10px' }}
                      >
                        {isLoadingNotificationData || isProcessingNotification === (notif.id || `${notif.soNo}-${notif.spkNo || notif.spkNos?.join('-') || 'unknown'}`) ? '⏳ Loading...' : '🚚 Create Delivery Note'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      )}

      {showForm && (
        <Card title="Create New Delivery Note" className="mb-4">
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enableMultiSO}
                onChange={(e) => {
                  setEnableMultiSO(e.target.checked);
                  if (!e.target.checked) {
                    setSelectedSOs([]);
                  }
                }}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                Gabungkan beberapa SO menjadi 1 SJ (untuk customer yang sama)
              </span>
            </label>
          </div>

          {!enableMultiSO ? (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                SO No *
              </label>
              <input
                type="text"
                list="so-list-new"
                value={getSoInputDisplayValue()}
                onChange={(e) => {
                  handleSoInputChange(e.target.value);
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  const matchedSo = salesOrders.find(s => {
                    const label = `${s.soNo || ''}${s.soNo ? ' - ' : ''}${s.customer || ''}`;
                    return label === value;
                  });
                  if (matchedSo) {
                    setFormData({
                      ...formData,
                      soNo: matchedSo.soNo,
                      customer: matchedSo.customer || '',
                    });
                    if (matchedSo.customer) {
                      const customer = customers.find(c => c.nama === matchedSo.customer);
                      if (customer) {
                        setCustomerInputValue(`${customer.kode} - ${customer.nama}`);
                      } else {
                        setCustomerInputValue(matchedSo.customer);
                      }
                    }

                    // Load products from SO
                    if (matchedSo.items && Array.isArray(matchedSo.items) && matchedSo.items.length > 0) {
                      const soProductsList = matchedSo.items.map((item: any) => {
                        // Find product code from products list
                        const productData = products.find((p: any) =>
                          p.nama === (item.productName || item.product) ||
                          p.kode === item.productCode ||
                          p.product_id === item.productId ||
                          p.sku === item.itemSku
                        );

                        return {
                          productId: item.productId || productData?.product_id || productData?.id || '',
                          productName: item.productName || item.product || 'Unknown',
                          productCode: productData?.kode || item.productCode || item.itemSku || '',
                          qty: typeof item.qty === 'string' ? parseFloat(item.qty) : (item.qty || 0),
                          unit: item.unit || 'PCS',
                        };
                      });
                      setSoProducts(soProductsList);
                      // Auto-select all products by default
                      setSelectedProducts(soProductsList);
                    } else {
                      setSoProducts([]);
                      setSelectedProducts([]);
                    }
                  }
                }}
                placeholder="-- Pilih SO No --"
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
              <datalist id="so-list-new">
                {salesOrders.map(so => (
                  <option key={so.id} value={`${so.soNo} - ${so.customer}`}>
                    {so.soNo} - {so.customer}
                  </option>
                ))}
              </datalist>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Customer *
                </label>
                <input
                  type="text"
                  list="customer-list-multi"
                  value={customerInputValue}
                  onChange={(e) => {
                    setCustomerInputValue(e.target.value);
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    const matchedCustomer = customers.find(c => {
                      const label = `${c.kode || ''}${c.kode ? ' - ' : ''}${c.nama || ''}`;
                      return label === value;
                    });
                    if (matchedCustomer) {
                      setFormData({ ...formData, customer: matchedCustomer.nama });
                      setSelectedSOs([]); // Reset selected SOs when customer changes
                    }
                  }}
                  placeholder="-- Pilih Customer --"
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
                <datalist id="customer-list-multi">
                  {customers.map(c => (
                    <option key={c.id} value={`${c.kode} - ${c.nama}`}>
                      {c.kode} - {c.nama}
                    </option>
                  ))}
                </datalist>
              </div>

              {formData.customer && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                    Pilih SO No (bisa pilih beberapa) *
                  </label>
                  <div style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    padding: '8px',
                    backgroundColor: 'var(--bg-primary)'
                  }}>
                    {salesOrders
                      .filter(so => so.customer === formData.customer && (so.status === 'OPEN' || so.status === 'CLOSE'))
                      .map(so => (
                        <label
                          key={so.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            backgroundColor: selectedSOs.includes(so.soNo) ? 'var(--bg-tertiary)' : 'transparent'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedSOs.includes(so.soNo)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSOs([...selectedSOs, so.soNo]);
                              } else {
                                setSelectedSOs(selectedSOs.filter(s => s !== so.soNo));
                              }
                            }}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <span style={{ color: 'var(--text-primary)' }}>
                            {so.soNo} - {so.status}
                          </span>
                        </label>
                      ))}
                    {salesOrders.filter(so => so.customer === formData.customer && (so.status === 'OPEN' || so.status === 'CLOSE')).length === 0 && (
                      <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Tidak ada SO untuk customer ini
                      </div>
                    )}
                  </div>
                  {selectedSOs.length > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Terpilih: {selectedSOs.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {!enableMultiSO && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Customer *
                </label>
                <input
                  type="text"
                  list="customer-list-new"
                  value={getCustomerInputDisplayValue()}
                  onChange={(e) => {
                    handleCustomerInputChange(e.target.value);
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    const matchedCustomer = customers.find(c => {
                      const label = `${c.kode || ''}${c.kode ? ' - ' : ''}${c.nama || ''}`;
                      return label === value;
                    });
                    if (matchedCustomer) {
                      setFormData({ ...formData, customer: matchedCustomer.nama });
                    }
                  }}
                  placeholder="-- Pilih Customer --"
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
                <datalist id="customer-list-new">
                  {customers.map(c => (
                    <option key={c.id} value={`${c.kode} - ${c.nama}`}>
                      {c.kode} - {c.nama}
                    </option>
                  ))}
                </datalist>
              </div>
              {formData.soNo && soProducts.length > 0 ? (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                    Product * (Pilih dari SO)
                  </label>
                  <div style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    padding: '8px',
                    backgroundColor: 'var(--bg-primary)'
                  }}>
                    {soProducts.map((prod, idx) => {
                      const isSelected = selectedProducts.some(sp =>
                        sp.productId === prod.productId && sp.productName === prod.productName
                      );
                      return (
                        <label
                          key={`${prod.productId}-${idx}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            backgroundColor: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                            marginBottom: '4px',
                            border: isSelected ? '1px solid var(--primary)' : '1px solid transparent'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                // Calculate remaining qty when selecting
                                const remaining = calculateRemainingQty(formData.soNo || '', prod.productName, prod.qty);
                                setSelectedProducts([...selectedProducts, { ...prod, qty: remaining }]);
                              } else {
                                setSelectedProducts(selectedProducts.filter(sp =>
                                  !(sp.productId === prod.productId && sp.productName === prod.productName)
                                ));
                              }
                            }}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: isSelected ? '4px' : '0' }}
                          />
                          <div style={{ flex: 1, color: 'var(--text-primary)' }}>
                            <div style={{ fontWeight: isSelected ? '600' : '400', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{prod.productCode ? `[${prod.productCode}] ` : ''}{prod.productName}</span>

                              {/* Input Qty Manual */}
                              {isSelected && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.preventDefault()}>
                                  <span style={{ fontSize: '12px', fontWeight: 'normal' }}>Qty:</span>
                                  <input
                                    type="number"
                                    value={selectedProducts.find(sp => sp.productId === prod.productId && sp.productName === prod.productName)?.qty || 0}
                                    onChange={(e) => {
                                      const newQty = parseFloat(e.target.value) || 0;
                                      setSelectedProducts(selectedProducts.map(sp =>
                                        (sp.productId === prod.productId && sp.productName === prod.productName)
                                          ? { ...sp, qty: newQty }
                                          : sp
                                      ));
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      width: '80px',
                                      padding: '4px',
                                      borderRadius: '4px',
                                      border: '1px solid var(--border)',
                                      fontSize: '13px'
                                    }}
                                  />
                                  <span style={{ fontSize: '12px', fontWeight: 'normal' }}>{prod.unit}</span>
                                </div>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              Total SO: {prod.qty} {prod.unit}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {selectedProducts.length > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Terpilih: {selectedProducts.length} product(s)
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                      Product *
                    </label>
                    <input
                      type="text"
                      list="product-list-new"
                      value={getProductInputDisplayValue()}
                      onChange={(e) => {
                        handleProductInputChange(e.target.value);
                      }}
                      onBlur={(e) => {
                        const value = e.target.value;
                        const matchedProduct = products.find(p => {
                          const label = `${p.kode || ''}${p.kode ? ' - ' : ''}${p.nama || ''}`;
                          return label === value;
                        });
                        if (matchedProduct) {
                          setFormData({ ...formData, product: matchedProduct.nama });
                        }
                      }}
                      placeholder="-- Pilih Product --"
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
                    <datalist id="product-list-new">
                      {products.map(p => (
                        <option key={p.id || p.product_id} value={`${p.kode || ''}${p.kode ? ' - ' : ''}${p.nama || ''}`}>
                          {p.kode || ''} {p.kode ? '- ' : ''}{p.nama || ''}
                        </option>
                      ))}
                    </datalist>
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                      Qty *
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={qtyInputValue !== undefined && qtyInputValue !== '' ? qtyInputValue : (formData.qty !== undefined && formData.qty !== null && formData.qty !== 0 ? String(formData.qty) : '')}
                      onFocus={(e) => {
                        const input = e.target as HTMLInputElement;
                        const currentQty = formData.qty || 0;
                        if (currentQty === 0 || currentQty === null || currentQty === undefined || String(currentQty) === '0') {
                          setQtyInputValue('');
                          input.value = '';
                        } else {
                          input.select();
                        }
                      }}
                      onMouseDown={(e) => {
                        const input = e.target as HTMLInputElement;
                        const currentQty = formData.qty || 0;
                        if (currentQty === 0 || currentQty === null || currentQty === undefined || String(currentQty) === '0') {
                          setQtyInputValue('');
                          input.value = '';
                        }
                      }}
                      onChange={(e) => {
                        let val = e.target.value;
                        val = val.replace(/[^\d.,]/g, '');
                        const cleaned = removeLeadingZero(val);
                        setQtyInputValue(cleaned);
                        setFormData({ ...formData, qty: cleaned === '' ? 0 : Number(cleaned) || 0 });
                      }}
                      onBlur={(e) => {
                        const val = e.target.value;
                        if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                          setFormData({ ...formData, qty: 0 });
                          setQtyInputValue('');
                        } else {
                          setFormData({ ...formData, qty: Number(val) });
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
                          setFormData({ ...formData, qty: Number(newVal) });
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
                </>
              )}
            </>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <Button onClick={() => {
              setShowForm(false);
              setCustomerInputValue('');
              setSoInputValue('');
              setProductInputValue('');
              setQtyInputValue('');
              setSelectedSOs([]);
              setEnableMultiSO(false);
              setFormData({ soNo: '', customer: '', product: '', qty: 0 });
            }} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleSave} variant="primary">
              Save Delivery Note
            </Button>
          </div>
        </Card>
      )}

      {/* Header Card - Sticky */}
      <Card style={{ position: deliveryViewMode === 'cards' ? 'sticky' : 'relative', top: deliveryViewMode === 'cards' ? 0 : 'auto', zIndex: deliveryViewMode === 'cards' ? 100 : 'auto', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h1 style={{ margin: 0 }}>Delivery Note (Surat Jalan)</h1>
          <Button onClick={() => setShowCreateDeliveryNoteDialog(true)}>+ Create Delivery Note</Button>
        </div>
        <div className="tab-container">
          <button
            className={`tab-button ${activeTab === 'delivery' ? 'active' : ''}`}
            onClick={() => setActiveTab('delivery')}
          >
            Delivery Note
          </button>
          <button
            className={`tab-button ${activeTab === 'outstanding' ? 'active' : ''}`}
            onClick={() => setActiveTab('outstanding')}
          >
            Outstanding ({(Array.isArray(deliveries) ? deliveries : []).filter(d => d.status === 'OPEN').length})
          </button>
          <button
            className={`tab-button ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            Schedule
          </button>
          <button
            className={`tab-button ${activeTab === 'recap' ? 'active' : ''}`}
            onClick={() => setActiveTab('recap')}
          >
            Recap ({(Array.isArray(deliveries) ? deliveries : []).filter(d => d.status === 'CLOSE').length})
          </button>
        </div>

        {/* Filter & Search - Inside sticky Card */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'flex-start',
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border-color)',
        }}>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by SJ No, SO No, Customer, Product..."
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'inherit',
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '400px' }}>
            <DateRangeFilter
              onDateChange={(from, to) => {
                setDateFrom(from);
                setDateTo(to);
              }}
              defaultFrom={dateFrom}
              defaultTo={dateTo}
            />
          </div>
          <div style={{
            display: 'inline-flex',
            borderRadius: '999px',
            overflow: 'hidden',
            border: '1px solid',
            borderColor: (document.documentElement.getAttribute('data-theme') || 'dark') === 'light' ? '#000' : '#fff',
          }}>
            {(['cards', 'table'] as const).map(mode => {
              const theme = document.documentElement.getAttribute('data-theme') || 'dark';
              const isActive = deliveryViewMode === mode;
              const isLight = theme === 'light';

              const activeBg = isLight ? '#000' : '#fff';
              const inactiveBg = 'transparent';
              const activeColor = isLight ? '#fff' : '#000';
              const inactiveColor = isLight ? '#000' : '#fff';

              return (
                <button
                  key={mode}
                  onClick={() => setDeliveryViewMode(mode)}
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
        </div>
      </Card>

      {/* Content Area - Below sticky header */}
      <div className="tab-content">
          {activeTab === 'delivery' && (
            <>
              {deliveryViewMode === 'cards' ? (
                groupedDeliveries.length > 0 ? (
                  <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {paginatedGroupedDeliveries.map((group, idx) => {
                      const latestLabel = group.latestTimestamp
                        ? formatDateSimple(new Date(group.latestTimestamp).toISOString())
                        : '-';

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
                        <div key={`${group.soNo}-${group.customer}-${group.latestTimestamp}`} style={{ backgroundColor: cardBgColor, borderRadius: '8px', padding: '1px' }}>
                          <Card>
                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-start' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>SO No</div>
                                <div style={{ fontSize: '20px', fontWeight: 600 }}>{group.soNo}</div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{group.customer}</div>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                {['OPEN', 'DRAFT', 'CLOSE'].map(status => (
                                  group.statusSummary[status] ? (
                                    <span key={status} className={`status-badge status-${status.toLowerCase()}`} style={{ fontSize: '12px' }}>
                                      {status}: {group.statusSummary[status]}
                                    </span>
                                  ) : null
                                ))}
                              </div>
                            </div>
                            <div style={{ marginTop: '12px', display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-secondary)' }}>
                              <div><strong>{group.deliveries.length}</strong> SJ</div>
                              <div><strong>{group.totalQty}</strong> PCS total</div>
                              <div>Last update: {latestLabel}</div>
                            </div>
                            <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                              {group.deliveries.map((delivery) => (
                                <div
                                  key={delivery.id}
                                  style={{
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '10px',
                                    padding: '12px',
                                    background: 'var(--bg-primary)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                    <div>
                                      <div style={{ fontSize: '14px', fontWeight: 600 }}>
                                        {delivery.sjNo || 'Belum Generate SJ'}
                                      </div>
                                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        SO{' '}
                                        {delivery.isRecap && delivery.soNos && Array.isArray(delivery.soNos) && delivery.soNos.length > 0 ? (
                                          // Untuk SJ Recap, selalu tampilkan semua SO
                                          delivery.soNos.map((soNo, idx) => (
                                            <span key={idx}>
                                              <a
                                                href="#"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  // Navigate to Sales Orders module with SO number in state
                                                  navigate('/packaging/sales-orders', { state: { highlightSO: soNo } });
                                                }}
                                                style={{ color: '#2196F3', textDecoration: 'underline', cursor: 'pointer' }}
                                              >
                                                {soNo}
                                              </a>
                                              {delivery.soNos && idx < delivery.soNos.length - 1 ? ', ' : ''}
                                            </span>
                                          ))
                                        ) : delivery.soNos && Array.isArray(delivery.soNos) && delivery.soNos.length > 1 ? (
                                          // Untuk non-Recap dengan multiple SO
                                          delivery.soNos.map((soNo, idx) => (
                                            <span key={idx}>
                                              <a
                                                href="#"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  // Navigate to Sales Orders module with SO number in state
                                                  navigate('/packaging/sales-orders', { state: { highlightSO: soNo } });
                                                }}
                                                style={{ color: '#2196F3', textDecoration: 'underline', cursor: 'pointer' }}
                                              >
                                                {soNo}
                                              </a>
                                              {delivery.soNos && idx < delivery.soNos.length - 1 ? ', ' : ''}
                                            </span>
                                          ))
                                        ) : (
                                          <a
                                            href="#"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              // Navigate to Sales Orders module with SO number in state
                                              navigate('/packaging/sales-orders', { state: { highlightSO: delivery.soNo } });
                                            }}
                                            style={{ color: '#2196F3', textDecoration: 'underline', cursor: 'pointer' }}
                                          >
                                            {delivery.soNo}
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                    <span className={`status-badge status-${delivery.status.toLowerCase()}`}>
                                      {delivery.status}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div>Delivery: {formatDateSimple(delivery.deliveryDate)}</div>
                                    <div>Driver: {delivery.driver || '-'}</div>
                                    <div>Vehicle: {delivery.vehicleNo || '-'}</div>
                                  </div>
                                  <div style={{ fontSize: '12px', background: 'var(--bg-tertiary)', padding: '8px', borderRadius: '6px' }}>
                                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>Items</div>
                                    {delivery.items && delivery.items.length > 0 ? (
                                      delivery.items.map((itm, idx) => {
                                        const itemSoNo = itm.soNo || delivery.soNo || (delivery.soNos && delivery.soNos.length > 0 ? delivery.soNos[0] : '');
                                        const productCode = itm.productCode || '';
                                        return (
                                          <div key={`${delivery.id}-item-${idx}`} style={{ marginBottom: '2px' }}>
                                            {idx + 1}. [
                                            {productCode ? (
                                              <a
                                                href="#"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  // Navigate to Inventory module with product code in state
                                                  navigate('/packaging/master/inventory', { state: { highlightProduct: productCode } });
                                                }}
                                                style={{ color: '#2196F3', textDecoration: 'underline', cursor: 'pointer' }}
                                              >
                                                {productCode}
                                              </a>
                                            ) : (
                                              '-'
                                            )}
                                            ]{' '}
                                            {itm.product ? (
                                              <a
                                                href="#"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  // Navigate to Inventory module with product name in state
                                                  navigate('/packaging/master/inventory', { state: { highlightProduct: productCode || itm.product } });
                                                }}
                                                style={{ color: '#2196F3', textDecoration: 'underline', cursor: 'pointer' }}
                                              >
                                                {itm.product}
                                              </a>
                                            ) : (
                                              'Unknown Product'
                                            )}{' '}
                                            - {itm.qty} {itm.unit || 'PCS'}{' '}
                                            {(() => {
                                              const info = getRemainingInfo(itm.product || '', itemSoNo || '', productCode || '');
                                              if (!info) return null;
                                              return (
                                                <span
                                                  title={`Order: ${info.orderQty}, Total Delivered: ${info.delivered}`}
                                                  style={{
                                                    marginLeft: '8px',
                                                    padding: '1px 6px',
                                                    backgroundColor: info.remaining === 0 ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                                                    color: info.remaining === 0 ? '#4caf50' : '#ff9800',
                                                    borderRadius: '4px',
                                                    fontSize: '10px',
                                                    fontWeight: 600,
                                                    border: `1px solid ${info.remaining === 0 ? '#4caf50' : '#ff9800'}`,
                                                    whiteSpace: 'nowrap',
                                                    display: 'inline-block'
                                                  }}
                                                >
                                                  Remain: {info.remaining}
                                                </span>
                                              );
                                            })()}
                                            {itemSoNo ? (
                                              <span>
                                                (
                                                <a
                                                  href="#"
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    // Navigate to Sales Orders module with SO number in state
                                                    navigate('/packaging/sales-orders', { state: { highlightSO: itemSoNo } });
                                                  }}
                                                  style={{ color: '#2196F3', textDecoration: 'underline', cursor: 'pointer' }}
                                                >
                                                  {itemSoNo}
                                                </a>
                                                )
                                              </span>
                                            ) : (
                                              ''
                                            )}
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <div>
                                        1. {delivery.product || 'Unknown Product'} - {delivery.qty || 0} PCS{' '}
                                        {delivery.soNo ? (
                                          <span>
                                            (
                                            <a
                                              href="#"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                // Navigate to Sales Orders module with SO number in state
                                                navigate('/packaging/sales-orders', { state: { highlightSO: delivery.soNo } });
                                              }}
                                              style={{ color: '#2196F3', textDecoration: 'underline', cursor: 'pointer' }}
                                            >
                                              {delivery.soNo}
                                            </a>
                                            )
                                          </span>
                                        ) : (
                                          ''
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div style={{ marginTop: '4px' }}>
                                    {renderDeliveryActions(delivery, { allowWrap: true })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Pagination Controls for Delivery Card View */}
                  {groupedDeliveries.length > itemsPerPage && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '16px',
                      flexWrap: 'wrap',
                    }}>
                      <Button
                        variant="secondary"
                        onClick={() => setDeliveryCurrentPage(Math.max(1, deliveryCurrentPage - 1))}
                        disabled={deliveryCurrentPage === 1}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        ← Previous
                      </Button>
                      
                      {(() => {
                        const totalPages = Math.ceil(groupedDeliveries.length / itemsPerPage);
                        const pages: (number | string)[] = [];
                        if (totalPages <= 5) {
                          for (let i = 1; i <= totalPages; i++) pages.push(i);
                        } else {
                          pages.push(1);
                          if (deliveryCurrentPage > 3) pages.push('...');
                          
                          const startPage = Math.max(2, deliveryCurrentPage - 1);
                          const endPage = Math.min(totalPages - 1, deliveryCurrentPage + 1);
                          
                          for (let i = startPage; i <= endPage; i++) {
                            pages.push(i);
                          }
                          
                          if (deliveryCurrentPage < totalPages - 2) pages.push('...');
                          pages.push(totalPages);
                        }
                        
                        return pages.map((page, idx) => (
                          <button
                            key={idx}
                            onClick={() => typeof page === 'number' && setDeliveryCurrentPage(page)}
                            disabled={page === '...'}
                            style={{
                              padding: '6px 10px',
                              border: page === deliveryCurrentPage ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                              backgroundColor: page === deliveryCurrentPage ? 'var(--primary-color)' : 'var(--bg-primary)',
                              color: page === deliveryCurrentPage ? '#fff' : 'var(--text-primary)',
                              borderRadius: '4px',
                              cursor: page === '...' ? 'default' : 'pointer',
                              fontSize: '12px',
                              fontWeight: page === deliveryCurrentPage ? '600' : '400',
                              opacity: page === '...' ? 0.5 : 1,
                            }}
                          >
                            {page}
                          </button>
                        ));
                      })()}
                      
                      <Button
                        variant="secondary"
                        onClick={() => setDeliveryCurrentPage(Math.min(Math.ceil(groupedDeliveries.length / itemsPerPage), deliveryCurrentPage + 1))}
                        disabled={deliveryCurrentPage >= Math.ceil(groupedDeliveries.length / itemsPerPage)}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Next →
                      </Button>
                    </div>
                  )}
                  
                  <div style={{
                    textAlign: 'center',
                    marginTop: '8px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                  }}>
                    Page {deliveryCurrentPage} of {Math.ceil(groupedDeliveries.length / itemsPerPage)} ({groupedDeliveries.length} total)
                  </div>
                  </>
                ) : (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {searchQuery ? 'No deliveries found matching your search' : 'No deliveries'}
                  </div>
                )
              ) : (
                <Table columns={columns} data={filteredDeliveries.slice((deliveryCurrentPage - 1) * itemsPerPage, deliveryCurrentPage * itemsPerPage)} showPagination={false} emptyMessage={searchQuery ? "No deliveries found matching your search" : "No deliveries"} />
              )}
              
              {/* Pagination Controls for Delivery */}
              {filteredDeliveries.length > itemsPerPage && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '16px',
                  flexWrap: 'wrap',
                }}>
                  <Button
                    variant="secondary"
                    onClick={() => setDeliveryCurrentPage(Math.max(1, deliveryCurrentPage - 1))}
                    disabled={deliveryCurrentPage === 1}
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    ← Previous
                  </Button>
                  
                  {(() => {
                    const totalPages = Math.ceil(filteredDeliveries.length / itemsPerPage);
                    const pages: (number | string)[] = [];
                    if (totalPages <= 5) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (deliveryCurrentPage > 3) pages.push('...');
                      
                      const startPage = Math.max(2, deliveryCurrentPage - 1);
                      const endPage = Math.min(totalPages - 1, deliveryCurrentPage + 1);
                      
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(i);
                      }
                      
                      if (deliveryCurrentPage < totalPages - 2) pages.push('...');
                      pages.push(totalPages);
                    }
                    
                    return pages.map((page, idx) => (
                      <button
                        key={idx}
                        onClick={() => typeof page === 'number' && setDeliveryCurrentPage(page)}
                        disabled={page === '...'}
                        style={{
                          padding: '6px 10px',
                          border: page === deliveryCurrentPage ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                          backgroundColor: page === deliveryCurrentPage ? 'var(--primary-color)' : 'var(--bg-primary)',
                          color: page === deliveryCurrentPage ? '#fff' : 'var(--text-primary)',
                          borderRadius: '4px',
                          cursor: page === '...' ? 'default' : 'pointer',
                          fontSize: '12px',
                          fontWeight: page === deliveryCurrentPage ? '600' : '400',
                          opacity: page === '...' ? 0.5 : 1,
                        }}
                      >
                        {page}
                      </button>
                    ));
                  })()}
                  
                  <Button
                    variant="secondary"
                    onClick={() => setDeliveryCurrentPage(Math.min(Math.ceil(filteredDeliveries.length / itemsPerPage), deliveryCurrentPage + 1))}
                    disabled={deliveryCurrentPage >= Math.ceil(filteredDeliveries.length / itemsPerPage)}
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    Next →
                  </Button>
                </div>
              )}
              
              <div style={{
                textAlign: 'center',
                marginTop: '8px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
              }}>
                Page {deliveryCurrentPage} of {Math.ceil(filteredDeliveries.length / itemsPerPage)} ({filteredDeliveries.length} total)
              </div>
            </>
          )}
          {activeTab === 'outstanding' && (
            <>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by SJ No, SO No, Customer, Product, Status, Driver, Vehicle No, SPK No..."
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
              <Table columns={columns} data={filteredDeliveries} showPagination={false} emptyMessage="No outstanding deliveries" />
            </>
          )}
          {activeTab === 'schedule' && (
            <ScheduleTable
              data={transformedScheduleData}
              onScheduleClick={handleScheduleClick}
            />
          )}
          {activeTab === 'recap' && (
            <>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by SJ No, SO No, Customer, Product, Status, Driver, Vehicle No, SPK No..."
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
                <Button
                  variant="primary"
                  onClick={() => setShowCreateSJRecapDialog(true)}
                  style={{ backgroundColor: '#9C27B0', color: 'white' }}
                >
                  + Create SJ Recap
                </Button>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setDeliveryViewMode('cards')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: deliveryViewMode === 'cards' ? 'var(--accent-color)' : 'transparent',
                      color: deliveryViewMode === 'cards' ? '#fff' : 'var(--text-secondary)',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Card View
                  </button>
                  <button
                    onClick={() => setDeliveryViewMode('table')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: deliveryViewMode === 'table' ? 'var(--accent-color)' : 'transparent',
                      color: deliveryViewMode === 'table' ? '#fff' : 'var(--text-secondary)',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Table View
                  </button>
                </div>
              </div>
              {deliveryViewMode === 'cards' ? (
                groupedDeliveries.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {groupedDeliveries.map((group, idx) => {
                      const latestLabel = group.latestTimestamp
                        ? formatDateSimple(new Date(group.latestTimestamp).toISOString())
                        : '-';

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
                        <div key={`${group.soNo}-${group.customer}-${group.latestTimestamp}`} style={{ backgroundColor: cardBgColor, borderRadius: '8px', padding: '1px' }}>
                          <Card>
                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-start' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>SO No</div>
                                <div style={{ fontSize: '20px', fontWeight: 600 }}>{group.soNo}</div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{group.customer}</div>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                {['OPEN', 'DRAFT', 'CLOSE'].map(status => (
                                  group.statusSummary[status] ? (
                                    <span key={status} className={`status-badge status-${status.toLowerCase()}`} style={{ fontSize: '12px' }}>
                                      {status}: {group.statusSummary[status]}
                                    </span>
                                  ) : null
                                ))}
                              </div>
                            </div>
                            <div style={{ marginTop: '12px', display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-secondary)' }}>
                              <div><strong>{group.deliveries.length}</strong> SJ</div>
                              <div><strong>{group.totalQty}</strong> PCS total</div>
                              <div>Last update: {latestLabel}</div>
                            </div>
                            <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                              {group.deliveries.map((delivery) => (
                                <div
                                  key={delivery.id}
                                  style={{
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '10px',
                                    padding: '12px',
                                    background: 'var(--bg-primary)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                    <div>
                                      <div style={{ fontSize: '14px', fontWeight: 600 }}>
                                        {delivery.sjNo || 'Belum Generate SJ'}
                                      </div>
                                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        SO{' '}
                                        {delivery.isRecap && delivery.soNos && Array.isArray(delivery.soNos) && delivery.soNos.length > 0 ? (
                                          // Untuk SJ Recap, selalu tampilkan semua SO
                                          delivery.soNos.map((soNo, idx) => (
                                            <span key={idx}>
                                              <a
                                                href="#"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  navigate('/packaging/sales-orders', { state: { highlightSO: soNo } });
                                                }}
                                                style={{ color: '#2196F3', textDecoration: 'underline', cursor: 'pointer' }}
                                              >
                                                {soNo}
                                              </a>
                                              {delivery.soNos && idx < delivery.soNos.length - 1 ? ', ' : ''}
                                            </span>
                                          ))
                                        ) : delivery.soNos && Array.isArray(delivery.soNos) && delivery.soNos.length > 1 ? (
                                          // Untuk non-Recap dengan multiple SO
                                          delivery.soNos.map((soNo, idx) => (
                                            <span key={idx}>
                                              <a
                                                href="#"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  navigate('/packaging/sales-orders', { state: { highlightSO: soNo } });
                                                }}
                                                style={{ color: '#2196F3', textDecoration: 'underline', cursor: 'pointer' }}
                                              >
                                                {soNo}
                                              </a>
                                              {delivery.soNos && idx < delivery.soNos.length - 1 ? ', ' : ''}
                                            </span>
                                          ))
                                        ) : (
                                          <a
                                            href="#"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              navigate('/packaging/sales-orders', { state: { highlightSO: delivery.soNo } });
                                            }}
                                            style={{ color: '#2196F3', textDecoration: 'underline', cursor: 'pointer' }}
                                          >
                                            {delivery.soNo}
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                    <span className={`status-badge status-${delivery.status.toLowerCase()}`}>
                                      {delivery.status}
                                    </span>
                                  </div>

                                  {delivery.items && delivery.items.length > 0 && (
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                      <div style={{ marginBottom: '4px', fontWeight: 500 }}>Items:</div>
                                      {delivery.items.slice(0, 3).map((item, itemIdx) => (
                                        <div key={itemIdx} style={{ marginLeft: '8px', marginBottom: '2px' }}>
                                          • {item.product} - {item.qty} {item.unit || 'PCS'}
                                          {item.spkNo && ` (SPK: ${item.spkNo})`}
                                        </div>
                                      ))}
                                      {delivery.items.length > 3 && (
                                        <div style={{ marginLeft: '8px', fontStyle: 'italic' }}>
                                          + {delivery.items.length - 3} item lainnya
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {delivery.driver && (
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                      Driver: {delivery.driver}
                                    </div>
                                  )}

                                  {delivery.vehicleNo && (
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                      Kendaraan: {delivery.vehicleNo}
                                    </div>
                                  )}

                                  {delivery.deliveryDate && (
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                      Delivery Date: {formatDateSimple(delivery.deliveryDate)}
                                    </div>
                                  )}

                                  <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {renderDeliveryActions(delivery, { allowWrap: true })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    Tidak ada SJ yang sudah CLOSE
                  </div>
                )
              ) : (
                <Table columns={columns} data={filteredDeliveries} showPagination={false} emptyMessage="No closed deliveries" />
              )}
            </>
          )}
        </div>

      {/* Edit SJ Dialog */}
      {/* Edit SJ Dialog */}
      {selectedDelivery && (
        <EditSJDialog
          delivery={selectedDelivery}
          onClose={() => setSelectedDelivery(null)}
          onSave={async (updatedData) => {
            // Load all deliveries from storage (including deleted ones)
            const allDeliveries = await storageService.get<DeliveryNote[]>('delivery') || [];
            const updated = allDeliveries.map(d =>
              d.id === selectedDelivery.id ? {
                ...d,
                ...updatedData,
                // Ensure timestamp selalu ter-update
                lastUpdate: new Date().toISOString(),
                timestamp: Date.now(),
                _timestamp: Date.now(),
              } : d
            );
            await storageService.set(StorageKeys.PACKAGING.DELIVERY, updated);
            // Filter out deleted items for local state
            const activeDeliveries = updated.filter(d => !d.deleted);
            setDeliveries(activeDeliveries);
            setSelectedDelivery(null);
            showAlert('Success', '✅ Surat Jalan updated');
          }}
        />
      )}

      {/* PDF Preview Dialog */}
      {viewPdfData && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000,
          }}
          onClick={() => {
            setViewPdfData(null);
            closeDialog();
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90%', width: '1200px', maxHeight: '90vh', overflow: 'auto' }}>
            <Card className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2>Preview Surat Jalan - {viewPdfData.sjNo}</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button 
                    variant="secondary" 
                    onClick={() => setShowTemplateSelectionDialog(true)}
                    style={{ backgroundColor: '#FF9800', color: 'white' }}
                  >
                    🎨 Change Template
                  </Button>
                  <Button variant="primary" onClick={handleShowPageSizeDialog}>
                    💾 Save to PDF
                  </Button>
                  <Button variant="secondary" onClick={() => {
                    setViewPdfData(null);
                    setViewingDeliveryItem(null);
                    closeDialog();
                  }}>
                    ✕ Close
                  </Button>
                </div>
              </div>
              <iframe
                srcDoc={viewPdfData.html}
                sandbox="allow-same-origin"
                style={{
                  width: '100%',
                  height: '70vh',
                  border: 'none',
                  backgroundColor: '#fff',
                }}
                title="PDF Preview"
              />
            </Card>
          </div>
        </div>
      )}

      {/* Custom Dialog - menggunakan hook terpusat */}
      <DialogComponent />
      {showPageSizeDialog && (
        <PageSizeDialog
          defaultSize="A5"
          onConfirm={(size) => {
            setShowPageSizeDialog(false);
            handleSaveToPDF(size);
          }}
          onCancel={() => setShowPageSizeDialog(false)}
        />
      )}

      {/* Template Selection Dialog untuk Recap SJ */}
      <TemplateSelectionDialog
        isOpen={showTemplateSelectionDialog}
        onClose={() => {
          setShowTemplateSelectionDialog(false);
          setPendingPrintItem(null);
        }}
        onSelectTemplate={(templateId) => {
          setShowTemplateSelectionDialog(false);
          // Jika ada pending print item, gunakan handleTemplateSelected
          if (pendingPrintItem) {
            handleTemplateSelected(templateId);
          } 
          // Jika ada viewing item (dari dialog view), gunakan handleChangeTemplateInView
          else if (viewingDeliveryItem) {
            handleChangeTemplateInView(templateId);
          }
        }}
        templates={PACKAGING_RECAP_TEMPLATES}
      />

      {/* Custom Signature Viewer Modal */}
      {signatureViewer && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 10001,
            display: 'flex',
            flexDirection: 'column',
            backdropFilter: 'blur(8px)',
          }}
          onClick={closeSignatureViewer}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 24px',
              backgroundColor: 'rgba(30, 30, 30, 0.95)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backdropFilter: 'blur(10px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
              }}>
                📄
              </div>
              <div>
                <h3 style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#fff',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}>
                  {signatureViewer.fileName}
                </h3>
                <div style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  marginTop: '2px',
                }}>
                  {signatureViewer.isPDF ? 'PDF Document' : 'Image Document'}
                </div>
              </div>
            </div>
            <button
              onClick={closeSignatureViewer}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontSize: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              ✕
            </button>
          </div>

          {/* Content Area */}
          <div
            style={{
              flex: 1,
              padding: '20px',
              overflow: 'auto',
              display: 'flex',
              justifyContent: 'center',
              alignItems: signatureViewer.isPDF ? 'flex-start' : 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {signatureViewer.isPDF ? (
              <div style={{
                width: '100%',
                height: '100%',
                maxWidth: '1200px',
                backgroundColor: '#1a1a1a',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              }}>
                <object
                  data={signatureViewer.data}
                  type="application/pdf"
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    display: 'block',
                  }}
                  title={signatureViewer.fileName}
                >
                  <embed
                    src={signatureViewer.data}
                    type="application/pdf"
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                    }}
                  />
                </object>
              </div>
            ) : (
              <div style={{
                maxWidth: '90%',
                maxHeight: '90%',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                backgroundColor: '#1a1a1a',
                padding: '20px',
              }}>
                <img
                  src={signatureViewer.data}
                  alt={signatureViewer.fileName}
                  style={{
                    maxWidth: '100%',
                    maxHeight: 'calc(100vh - 200px)',
                    display: 'block',
                    margin: '0 auto',
                    borderRadius: '8px',
                  }}
                />
              </div>
            )}
          </div>

          {/* Footer dengan controls */}
          <div
            style={{
              padding: '16px 24px',
              backgroundColor: 'rgba(30, 30, 30, 0.95)',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              backdropFilter: 'blur(10px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeSignatureViewer}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
              }}
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Edit SJ Dialog Component
const EditSJDialog = ({ delivery, onClose, onSave }: { delivery: DeliveryNote; onClose: () => void; onSave: (data: Partial<DeliveryNote>) => void }) => {
  const { showAlert: showAlertBase } = useDialog();
  const showAlert = (title: string, message: string) => {
    showAlertBase(message, title);
  };

  const [driver, setDriver] = useState(delivery.driver || '');
  const [vehicleNo, setVehicleNo] = useState(delivery.vehicleNo || '');
  const [deliveryDate, setDeliveryDate] = useState(delivery.deliveryDate ? delivery.deliveryDate.split('T')[0] : '');
  const [customer, setCustomer] = useState(delivery.customer || '');
  const [customerInputValue, setCustomerInputValue] = useState(delivery.customer || '');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [soNo, setSoNo] = useState(delivery.soNo || '');
  const [productCodeDisplay, setProductCodeDisplay] = useState<'padCode' | 'productId'>(delivery.productCodeDisplay || 'padCode');
  const [specNote, setSpecNote] = useState(delivery.specNote || '');
  const [items, setItems] = useState<DeliveryNoteItem[]>(delivery.items && delivery.items.length > 0 ? delivery.items : (delivery.product ? [{ product: delivery.product, qty: delivery.qty || 0, unit: 'PCS', spkNo: delivery.spkNo, soNo: delivery.soNo }] : []));
  const [signedFile, setSignedFile] = useState<File | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState<{ [key: number]: string }>({});
  const [showProductDropdown, setShowProductDropdown] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    const loadData = async () => {
      const productsData = await storageService.get<any[]>('products') || [];
      const customersData = await storageService.get<any[]>('customers') || [];
      const inventoryData = await storageService.get<any[]>('inventory') || [];
      
      // If data is empty, wait a bit for background server sync to complete
      if (productsData.length === 0 || customersData.length === 0 || inventoryData.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5 seconds for server sync
        
        // Try fetching again after sync
        const productsDataRetry = await storageService.get<any[]>('products') || [];
        const customersDataRetry = await storageService.get<any[]>('customers') || [];
        const inventoryDataRetry = await storageService.get<any[]>('inventory') || [];
        
        setProducts(productsDataRetry);
        setCustomers(customersDataRetry);
        setInventory(inventoryDataRetry);
      } else {
        setProducts(productsData);
        setCustomers(customersData);
        setInventory(inventoryData);
      }
    };
    loadData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSignedFile(file);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { product: '', qty: 0, unit: 'PCS', spkNo: '', soNo: soNo, fromInventory: false }]);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, idx) => idx !== index);
    setItems(updated);
    // Cleanup search state
    const newSearch = { ...productSearch };
    delete newSearch[index];
    setProductSearch(newSearch);
    const newDropdown = { ...showProductDropdown };
    delete newDropdown[index];
    setShowProductDropdown(newDropdown);
  };

  // Get available products from inventory (ongoing > 0)
  const getAvailableProducts = () => {
    return inventory.filter((inv: any) => {
      const onGoing = inv.onGoing || inv.on_going || inv.productionStock || 0;
      return onGoing > 0;
    });
  };

  // Get filtered products for search
  const getFilteredProducts = (index: number) => {
    const search = productSearch[index] || '';
    if (!search) return getAvailableProducts();

    const searchLower = search.toLowerCase();
    return getAvailableProducts().filter((inv: any) => {
      const desc = (inv.description || '').toLowerCase();
      const code = (inv.codeItem || '').toLowerCase();
      return desc.includes(searchLower) || code.includes(searchLower);
    });
  };

  const handleItemChange = (index: number, field: keyof DeliveryNoteItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-fill product name when productCode is entered
    if (field === 'productCode' && value) {
      const productName = getProductNameByCode(value, 'packaging');
      if (productName !== value) {
        // Found in master data
        updated[index].product = productName;
      }
    }
    
    setItems(updated);
  };

  // Handle product selection from inventory
  const handleSelectProductFromInventory = (index: number, invItem: any) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      product: invItem.description || '',
      productCode: invItem.codeItem || '',
      fromInventory: true,
      inventoryId: invItem.id,
      unit: invItem.satuan || 'PCS',
    };
    setItems(updated);
    // Clear search and close dropdown
    setProductSearch({ ...productSearch, [index]: '' });
    setShowProductDropdown({ ...showProductDropdown, [index]: false });
  };

  // Handle manual product input
  const handleManualProductInput = (index: number, value: string) => {
    const updated = [...items];
    // Check if product exists in products list for validation
    const productMatch = products.find((p: any) =>
      p.nama?.toLowerCase() === value.toLowerCase() ||
      p.kode?.toLowerCase() === value.toLowerCase()
    );
    updated[index] = {
      ...updated[index],
      product: value,
      productCode: productMatch?.kode || updated[index].productCode,
      fromInventory: false, // Manual input, tidak dari inventory
      inventoryId: undefined, // Clear inventory ID
    };
    setItems(updated);
    setProductSearch({ ...productSearch, [index]: value });
  };

  // Handle customer input change with autocomplete
  const handleCustomerInputChange = (text: string) => {
    setCustomerInputValue(text);
    setShowCustomerDropdown(true);
    if (!text) {
      setCustomer('');
      return;
    }
    const normalized = text.toLowerCase();
    const matchedCustomer = customers.find(c => {
      const label = `${c.kode || ''}${c.kode ? ' - ' : ''}${c.nama || ''}`.toLowerCase();
      const code = (c.kode || '').toLowerCase();
      const name = (c.nama || '').toLowerCase();
      return label === normalized || code === normalized || name === normalized;
    });
    if (matchedCustomer) {
      setCustomer(matchedCustomer.nama);
    } else {
      setCustomer(text);
    }
  };

  // Get filtered customers for autocomplete
  const getFilteredCustomers = () => {
    if (!customerInputValue) return customers.slice(0, 10);
    const searchLower = customerInputValue.toLowerCase();
    return customers.filter(c => {
      const label = `${c.kode || ''}${c.kode ? ' - ' : ''}${c.nama || ''}`.toLowerCase();
      const code = (c.kode || '').toLowerCase();
      const name = (c.nama || '').toLowerCase();
      return label.includes(searchLower) || code.includes(searchLower) || name.includes(searchLower);
    }).slice(0, 10);
  };

  // Handle customer selection from dropdown
  const handleSelectCustomer = (selectedCustomer: any) => {
    setCustomer(selectedCustomer.nama);
    setCustomerInputValue(`${selectedCustomer.kode || ''}${selectedCustomer.kode ? ' - ' : ''}${selectedCustomer.nama}`);
    setShowCustomerDropdown(false);
  };

  const handleSave = async () => {
    let signedDocument = delivery.signedDocument;
    let signedDocumentName = delivery.signedDocumentName;
    let signedDocumentPath: string | undefined = delivery.signedDocumentPath;
    let signedDocumentType: 'pdf' | 'image' | undefined = delivery.signedDocumentType;

    const updateData: Partial<DeliveryNote> = {
      driver,
      vehicleNo,
      deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : undefined,
      customer,
      soNo,
      productCodeDisplay: productCodeDisplay,
      specNote: specNote || undefined,
      items: items.length > 0 ? items : undefined,
      // Update deprecated fields for backward compatibility
      product: items.length > 0 ? items[0].product : delivery.product,
      qty: items.length > 0 ? items.reduce((sum, item) => sum + (item.qty || 0), 0) : delivery.qty,
    };

    if (signedFile) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;

        // Deteksi tipe file
        const isPDF = signedFile.name.toLowerCase().endsWith('.pdf') || signedFile.type === 'application/pdf';

        // Untuk PDF, simpan sebagai file di file system (karena terlalu besar untuk localStorage)
        // Untuk image, tetap simpan sebagai base64 (lebih kecil)
        if (isPDF) {
          // PDF: Simpan sebagai file di Electron, atau base64 di mobile jika kecil
          const electronAPI = (window as any).electronAPI;
          if (electronAPI && typeof electronAPI.saveUploadedFile === 'function') {
            try {
              const result = await electronAPI.saveUploadedFile(base64, signedFile.name, 'pdf');
              if (result.success) {
                signedDocumentPath = result.path;
                // Simpan path sebagai reference, bukan base64
                signedDocument = `file://${result.path}`;
                signedDocumentType = 'pdf';
              } else {
                throw new Error(result.error || 'Failed to save PDF file');
              }
            } catch (fileError: any) {
              // Fallback: coba simpan sebagai base64 jika file system gagal (untuk file kecil)
              if (base64.length < 5000000) { // 5MB limit
                signedDocument = base64;
                signedDocumentType = 'pdf';
                signedDocumentPath = undefined;
              } else {
                showAlert('Error', `PDF terlalu besar untuk disimpan. Error: ${fileError.message}`);
                return;
              }
            }
          } else if (isMobile() || isCapacitor()) {
            // Mobile/Capacitor: Simpan sebagai base64 jika file kecil (< 5MB)
            const base64Size = base64.length;
            const maxSize = 5 * 1024 * 1024; // 5MB

            if (base64Size < maxSize) {
              signedDocument = base64;
              signedDocumentType = 'pdf';
              signedDocumentPath = undefined;
            } else {
              showAlert('Error', '⚠️ File PDF terlalu besar untuk disimpan di mobile.\n\nUkuran file: ' +
                Math.round(base64Size / 1024 / 1024) + 'MB\n\nMaksimal ukuran: 5MB\n\nSilakan gunakan file PDF yang lebih kecil atau gunakan aplikasi desktop.');
              return;
            }
          } else {
            // Browser mode: coba simpan sebagai base64 jika kecil
            if (base64.length < 5000000) { // 5MB limit
              signedDocument = base64;
              signedDocumentType = 'pdf';
              signedDocumentPath = undefined;
            } else {
              showAlert('Error', 'PDF terlalu besar untuk disimpan di browser mode. Silakan gunakan Electron app.');
              return;
            }
          }
        } else {
          // Image: Simpan sebagai base64 (biasanya lebih kecil)
          signedDocument = base64;
          signedDocumentType = 'image';
          signedDocumentPath = undefined;
        }

        signedDocumentName = signedFile.name;
        onSave({
          ...updateData,
          signedDocument,
          signedDocumentName,
          signedDocumentPath,
          signedDocumentType,
        });
      };
      reader.readAsDataURL(signedFile);
    } else {
      onSave(updateData);
    }
  };

  return (
    <div className="dialog-overlay" onClick={() => { onClose(); }}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
        <Card className="dialog-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Edit Surat Jalan - {delivery.sjNo}</h2>
            <Button variant="secondary" onClick={() => { onClose(); }} style={{ padding: '6px 12px' }}>✕</Button>
          </div>

          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Customer
            </label>
            <input
              type="text"
              list={`customer-list-edit-${delivery.id}`}
              value={customerInputValue}
              onChange={(e) => handleCustomerInputChange(e.target.value)}
              onFocus={() => setShowCustomerDropdown(true)}
              onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
              placeholder="Type to search customer or enter manually"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
              }}
            />
            <datalist id={`customer-list-edit-${delivery.id}`}>
              {customers.map((c: any) => (
                <option key={c.id || c.nama} value={`${c.kode || ''}${c.kode ? ' - ' : ''}${c.nama || ''}`} />
              ))}
            </datalist>
            {showCustomerDropdown && getFilteredCustomers().length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  marginTop: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                {getFilteredCustomers().map((c: any) => (
                  <div
                    key={c.id || c.nama}
                    onClick={() => handleSelectCustomer(c)}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-color)',
                      fontSize: '13px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                    }}
                  >
                    <div style={{ fontWeight: '500' }}>{c.nama}</div>
                    {c.kode && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Code: {c.kode}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              SO No
            </label>
            <Input
              value={soNo}
              onChange={setSoNo}
              placeholder="Enter SO number"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Product Code Display (Template SJ)
            </label>
            <select
              value={productCodeDisplay}
              onChange={(e) => setProductCodeDisplay(e.target.value as 'padCode' | 'productId')}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
              }}
            >
              <option value="padCode">Pad Code (default, fallback ke Product ID jika tidak ada)</option>
              <option value="productId">Product ID / SKU ID</option>
            </select>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Pilihan ini menentukan kode yang ditampilkan di kolom "PRODUCT CODE" pada template Surat Jalan
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Driver
            </label>
            <Input
              value={driver}
              onChange={setDriver}
              placeholder="Enter driver name"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Vehicle No
            </label>
            <Input
              value={vehicleNo}
              onChange={setVehicleNo}
              placeholder="Enter vehicle number"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Tanggal Kirim (Delivery Date)
            </label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500' }}>
                Items
              </label>
              <Button variant="secondary" onClick={handleAddItem} style={{ fontSize: '12px', padding: '4px 8px' }}>
                + Add Item
              </Button>
            </div>
            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px' }}>
              {items.map((item, idx) => (
                <div key={idx} style={{ marginBottom: '12px', padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong>Item {idx + 1}</strong>
                    <Button variant="secondary" onClick={() => handleRemoveItem(idx)} style={{ fontSize: '11px', padding: '2px 6px', backgroundColor: '#f44336', color: 'white' }}>
                      Remove
                    </Button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ position: 'relative' }}>
                      <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>
                        Product {item.fromInventory ? '📦' : '✏️'}
                        {item.fromInventory && <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginLeft: '4px' }}>(from inventory)</span>}
                      </label>
                      <input
                        type="text"
                        value={productSearch[idx] !== undefined ? productSearch[idx] : (item.product || '')}
                        onChange={(e) => {
                          const value = e.target.value;
                          setProductSearch({ ...productSearch, [idx]: value });
                          setShowProductDropdown({ ...showProductDropdown, [idx]: true });
                          handleManualProductInput(idx, value);
                        }}
                        onFocus={() => setShowProductDropdown({ ...showProductDropdown, [idx]: true })}
                        onBlur={() => setTimeout(() => setShowProductDropdown({ ...showProductDropdown, [idx]: false }), 200)}
                        placeholder="Type to search inventory or enter manually"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          backgroundColor: 'var(--bg-tertiary)',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
                        }}
                      />
                      {showProductDropdown[idx] && getFilteredProducts(idx).length > 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            backgroundColor: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            zIndex: 1000,
                            marginTop: '4px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                          }}
                        >
                          {getFilteredProducts(idx).map((invItem: any) => {
                            const onGoing = invItem.onGoing || invItem.on_going || invItem.productionStock || 0;
                            return (
                              <div
                                key={invItem.id}
                                onClick={() => handleSelectProductFromInventory(idx, invItem)}
                                style={{
                                  padding: '8px 12px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid var(--border-color)',
                                  fontSize: '12px',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                                }}
                              >
                                <div style={{ fontWeight: 500 }}>{invItem.description || 'Unknown'}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                  Code: {invItem.codeItem || '-'} | On Going: {onGoing} {invItem.satuan || 'PCS'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Product Code</label>
                      <Input
                        value={item.productCode || ''}
                        onChange={(value) => handleItemChange(idx, 'productCode', value)}
                        placeholder="Product code"
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Qty</label>
                      <Input
                        value={String(item.qty || 0)}
                        onChange={(value) => handleItemChange(idx, 'qty', parseFloat(value) || 0)}
                        placeholder="Quantity"
                        type="number"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Unit</label>
                      <Input
                        value={item.unit || 'PCS'}
                        onChange={(value) => handleItemChange(idx, 'unit', value)}
                        placeholder="Unit"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>SPK No</label>
                      <Input
                        value={item.spkNo || ''}
                        onChange={(value) => handleItemChange(idx, 'spkNo', value)}
                        placeholder="SPK number"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                  No items. Click "Add Item" to add items.
                </div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Keterangan (akan muncul di template SJ)
            </label>
            <textarea
              value={specNote}
              onChange={(e) => setSpecNote(e.target.value)}
              placeholder="Masukkan keterangan untuk Surat Jalan (No. SJ, Detail Product, dll)"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                minHeight: '100px',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Keterangan ini akan ditampilkan di bagian "Keterangan" pada template Surat Jalan
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Upload Signed Document
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
              }}
            />
            {delivery.signedDocumentName && !signedFile && (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Current: {delivery.signedDocumentName}
              </div>
            )}
            {signedFile && (
              <div style={{ fontSize: '12px', color: 'var(--success)', marginTop: '4px' }}>
                Selected: {signedFile.name}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => { onClose(); }}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

// Create Delivery Note Dialog Component
const CreateDeliveryNoteDialog = ({
  deliveries,
  onClose,
  onCreate,
  initialMode = 'po',
  initialSelectedSJs = []
}: {
  deliveries: DeliveryNote[];
  onClose: () => void;
  onCreate: (data: { poNos?: string[]; soNos?: string[]; sjNos?: string[]; manualData?: any }) => Promise<void>;
  initialMode?: 'po' | 'so' | 'sj' | 'manual';
  initialSelectedSJs?: string[];
}) => {
  const { showAlert: showAlertBase } = useDialog();
  const showAlert = (title: string, message: string) => {
    showAlertBase(message, title);
  };

  const [purchaseOrderList, setPurchaseOrderList] = useState<any[]>([]);
  const [salesOrderList, setSalesOrderList] = useState<any[]>([]);
  const [deliveryNoteList, setDeliveryNoteList] = useState<any[]>([]);
  const [selectedPOs, setSelectedPOs] = useState<string[]>([]);
  const [selectedSOs, setSelectedSOs] = useState<string[]>([]);
  const [selectedSJs, setSelectedSJs] = useState<string[]>(initialSelectedSJs);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'po' | 'so' | 'sj' | 'manual' | 'remaining'>(initialMode as any);
  
  // State untuk remaining SO
  const [remainingSOs, setRemainingSOs] = useState<Array<{ soNo: string; customer: string; items: Array<{ product: string; productCode?: string; orderQty: number; deliveredQty: number; remainingQty: number; unit?: string; spkNo?: string }> }>>([]);
  const [selectedRemainingSOs, setSelectedRemainingSOs] = useState<string[]>([]);
  const [autoRemainingCustomer, setAutoRemainingCustomer] = useState('');
  const [autoRemainingItems, setAutoRemainingItems] = useState<Array<{ product: string; productCode?: string; qty: number; unit?: string; spkNo?: string; soNo?: string }>>([]);

  // Auto-populated data dari PO yang dipilih
  const [autoPOCustomer, setAutoPOCustomer] = useState('');
  const [autoPOItems, setAutoPOItems] = useState<Array<{ product: string; productCode?: string; qty: number; unit?: string; spkNo?: string; soNo?: string }>>([]);

  // Auto-populated data dari SO yang dipilih
  const [autoSOCustomer, setAutoSOCustomer] = useState('');
  const [autoSOItems, setAutoSOItems] = useState<Array<{ product: string; productCode?: string; qty: number; unit?: string; spkNo?: string; soNo?: string; orderQty?: number; deliveredQty?: number; remainingQty?: number; deliveryQty?: number }>>([]);

  // Auto-populated data dari SJ yang dipilih
  const [autoSJCustomer, setAutoSJCustomer] = useState('');
  const [autoSJItems, setAutoSJItems] = useState<Array<{ product: string; productCode?: string; qty: number; unit?: string; spkNo?: string; soNo?: string }>>([]);

  // Manual input fields
  const [manualCustomer, setManualCustomer] = useState('');
  const [manualItems, setManualItems] = useState<Array<{ product: string; productCode?: string; qty: number; unit?: string; spkNo?: string }>>([{ product: '', productCode: '', qty: 1, unit: 'PCS' }]);
  const [deliveryDate, setDeliveryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [productCodeDisplay, setProductCodeDisplay] = useState<'padCode' | 'productId'>('padCode');
  const [specNote, setSpecNote] = useState('');

  // Search/Filter state untuk masing-masing mode
  const [poSearchQuery, setPoSearchQuery] = useState('');
  const [soSearchQuery, setSoSearchQuery] = useState('');
  const [remainingSearchQuery, setRemainingSearchQuery] = useState('');
  const [sjSearchQuery, setSjSearchQuery] = useState('');

  const [customersList, setCustomersList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);

  // Filtered lists untuk masing-masing mode
  const filteredPOs = useMemo(() => {
    if (!poSearchQuery) return purchaseOrderList;
    const query = poSearchQuery.toLowerCase();
    return purchaseOrderList.filter((po: any) =>
      po.poNo?.toLowerCase().includes(query) ||
      po.supplier?.toLowerCase().includes(query) ||
      po.materialItem?.toLowerCase().includes(query)
    );
  }, [purchaseOrderList, poSearchQuery]);

  const filteredSOs = useMemo(() => {
    if (!soSearchQuery) return salesOrderList;
    const query = soSearchQuery.toLowerCase();
    return salesOrderList.filter((so: any) =>
      so.soNo?.toLowerCase().includes(query) ||
      so.customer?.toLowerCase().includes(query) ||
      so.customerKode?.toLowerCase().includes(query)
    );
  }, [salesOrderList, soSearchQuery]);

  const filteredRemainingSOs = useMemo(() => {
    if (!remainingSearchQuery) return remainingSOs;
    const query = remainingSearchQuery.toLowerCase();
    return remainingSOs.filter((so: any) =>
      so.soNo?.toLowerCase().includes(query) ||
      so.customer?.toLowerCase().includes(query)
    );
  }, [remainingSOs, remainingSearchQuery]);

  const filteredSJs = useMemo(() => {
    if (!sjSearchQuery) return deliveryNoteList;
    const query = sjSearchQuery.toLowerCase();
    return deliveryNoteList.filter((sj: any) =>
      sj.sjNo?.toLowerCase().includes(query) ||
      sj.customer?.toLowerCase().includes(query) ||
      sj.soNo?.toLowerCase().includes(query)
    );
  }, [deliveryNoteList, sjSearchQuery]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [poData, soData, sjData, custData, prodData] = await Promise.all([
          storageService.get<any[]>('purchaseOrders') || [],
          storageService.get<any[]>('salesOrders') || [],
          storageService.get<any[]>('delivery') || [],
          storageService.get<any[]>('customers') || [],
          storageService.get<any[]>('products') || [],
        ]);

        // Ensure all data is arrays
        const poDataArray = Array.isArray(poData) ? poData : [];
        const soDataArray = Array.isArray(soData) ? soData : [];
        const sjDataArray = Array.isArray(sjData) ? sjData : [];
        const custDataArray = Array.isArray(custData) ? custData : [];
        const prodDataArray = Array.isArray(prodData) ? prodData : [];

        // If data is empty, wait for background server sync
        if (poDataArray.length === 0 || soDataArray.length === 0 || sjDataArray.length === 0 || custDataArray.length === 0 || prodDataArray.length === 0) {
          await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5 seconds for server sync
          
          // Retry fetching after sync
          const [poDataRetry, soDataRetry, sjDataRetry, custDataRetry, prodDataRetry] = await Promise.all([
            storageService.get<any[]>('purchaseOrders') || [],
            storageService.get<any[]>('salesOrders') || [],
            storageService.get<any[]>('delivery') || [],
            storageService.get<any[]>('customers') || [],
            storageService.get<any[]>('products') || [],
          ]);
          
          // Use retry data if available, otherwise use original
          const finalPoData = (Array.isArray(poDataRetry) && poDataRetry.length > 0) ? poDataRetry : poDataArray;
          const finalSoData = (Array.isArray(soDataRetry) && soDataRetry.length > 0) ? soDataRetry : soDataArray;
          const finalSjData = (Array.isArray(sjDataRetry) && sjDataRetry.length > 0) ? sjDataRetry : sjDataArray;
          const finalCustData = (Array.isArray(custDataRetry) && custDataRetry.length > 0) ? custDataRetry : custDataArray;
          const finalProdData = (Array.isArray(prodDataRetry) && prodDataRetry.length > 0) ? prodDataRetry : prodDataArray;

          // Filter PO yang belum ada SJ (belum di-deliver)
          const activePOs = (finalPoData || []).filter((po: any) => {
            if (po?.deleted === true || po?.deleted === 'true' || po?.deletedAt) {
              return false;
            }
            // Filter: belum ada SJ untuk PO ini
            const hasSJ = deliveries.some((del: any) => {
              // Cek apakah ada SJ yang terkait dengan PO ini (melalui SO)
              return del.soNo === po.soNo || (del.soNos && del.soNos.includes(po.soNo));
            });
            return !hasSJ && po.status === 'OPEN';
          });

          // Filter SO yang belum ada SJ
          const activeSOs = (finalSoData || []).filter((so: any) => {
            if (so?.deleted === true || so?.deleted === 'true' || so?.deletedAt) {
              return false;
            }
            const hasSJ = deliveries.some((del: any) => del.soNo === so.soNo || (del.soNos && del.soNos.includes(so.soNo)));
            return !hasSJ && so.status === 'OPEN';
          });

          // Filter SJ yang aktif (belum di-delete dan status bukan CLOSE)
          const activeSJs = (finalSjData || []).filter((sj: any) => {
            if (sj?.deleted === true || sj?.deleted === 'true' || sj?.deletedAt) {
              return false;
            }
            return sj.sjNo && sj.status !== 'CLOSE';
          });

          setPurchaseOrderList(activePOs);
          setSalesOrderList(activeSOs);
          setDeliveryNoteList(activeSJs);
          setCustomersList(finalCustData || []);
          setProductsList(finalProdData || []);
        } else {
          // Filter PO yang belum ada SJ (belum di-deliver)
          const activePOs = (poData || []).filter((po: any) => {
            if (po?.deleted === true || po?.deleted === 'true' || po?.deletedAt) {
              return false;
            }
            // Filter: belum ada SJ untuk PO ini
            const hasSJ = deliveries.some((del: any) => {
              // Cek apakah ada SJ yang terkait dengan PO ini (melalui SO)
              return del.soNo === po.soNo || (del.soNos && del.soNos.includes(po.soNo));
            });
            return !hasSJ && po.status === 'OPEN';
          });

          // Filter SO yang belum ada SJ
          const activeSOs = (soData || []).filter((so: any) => {
            if (so?.deleted === true || so?.deleted === 'true' || so?.deletedAt) {
              return false;
            }
            const hasSJ = deliveries.some((del: any) => del.soNo === so.soNo || (del.soNos && del.soNos.includes(so.soNo)));
            return !hasSJ && so.status === 'OPEN';
          });

          // Filter SJ yang aktif (belum di-delete dan status bukan CLOSE)
          const activeSJs = (sjData || []).filter((sj: any) => {
            if (sj?.deleted === true || sj?.deleted === 'true' || sj?.deletedAt) {
              return false;
            }
            return sj.sjNo && sj.status !== 'CLOSE';
          });

          setPurchaseOrderList(activePOs);
          setSalesOrderList(activeSOs);
          setDeliveryNoteList(activeSJs);
          setCustomersList(custData || []);
          setProductsList(prodData || []);
        }
      } catch (error: any) {
        // Removed console.error for performance
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [deliveries]);

  // Auto-populate data ketika PO dipilih
  useEffect(() => {
    if (selectedPOs.length > 0 && mode === 'po') {
      const loadPOData = async () => {
        const poData = await storageService.get<any[]>('purchaseOrders') || [];
        const selectedPOItems = poData.filter((po: any) => selectedPOs.includes(po.poNo));

        if (selectedPOItems.length > 0) {
          // Ambil customer dari SO yang terkait dengan PO pertama
          const firstPO = selectedPOItems[0];
          const soData = await storageService.get<any[]>('salesOrders') || [];
          const relatedSO = soData.find((so: any) => so.soNo === firstPO.soNo);

          if (relatedSO) {
            setAutoPOCustomer(relatedSO.customer || '');
          }

          // Gabungkan semua items dari semua PO yang dipilih
          const allItems: Array<{ product: string; productCode?: string; qty: number; unit?: string; spkNo?: string; soNo?: string }> = [];

          selectedPOItems.forEach((po: any) => {
            // Ambil materialItem dari PO sebagai product
            const product = po.materialItem || '';
            const qty = po.qty || 0;
            const soNo = po.soNo || '';
            const spkNo = po.spkNo || '';

            // Cari product code dari products list
            const productData = productsList.find((p: any) =>
              (p.nama || '').toString().trim().toLowerCase() === product.toString().trim().toLowerCase() ||
              (p.kode || '').toString().trim().toLowerCase() === product.toString().trim().toLowerCase()
            );
            const productCode = productData?.kode || productData?.product_id || '';

            allItems.push({
              product,
              productCode,
              qty,
              unit: 'PCS',
              spkNo,
              soNo,
            });
          });

          setAutoPOItems(allItems);
        }
      };
      loadPOData();
    }
  }, [selectedPOs, mode, productsList]);

  // Auto-populate data ketika SO dipilih
  useEffect(() => {
    if (selectedSOs.length > 0 && mode === 'so') {
      const loadSOData = async () => {
        const soData = await storageService.get<any[]>('salesOrders') || [];
        const existingDeliveries = await storageService.get<any[]>('delivery') || [];
        const selectedSOItems = soData.filter((so: any) => selectedSOs.includes(so.soNo));

        if (selectedSOItems.length > 0) {
          const firstSO = selectedSOItems[0];
          setAutoSOCustomer(firstSO.customer || '');

          const allItems: Array<{
            product: string;
            productCode?: string;
            qty: number; // This will now be the default delivery qty (remaining)
            unit?: string;
            spkNo?: string;
            soNo?: string;
            // Tracking info
            orderQty?: number;
            deliveredQty?: number;
            remainingQty?: number;
            deliveryQty?: number;
          }> = [];

          selectedSOItems.forEach((so: any) => {
            const items = so.items || [];
            items.forEach((item: any) => {
              const orderQty = Number(item.qty || 0);

              // Calculate already delivered qty for this specific item in this SO
              // We match by SO No and Product Name/Code
              const itemDeliveredQty = existingDeliveries
                .filter((d: any) =>
                  d.status !== 'CANCELLED' &&
                  (d.soNo === so.soNo || d.soNos?.includes(so.soNo))
                )
                .reduce((total: number, delivery: any) => {
                  const deliveryItems = delivery.items || [];
                  const matchingItems = deliveryItems.filter((di: any) =>
                    (di.product === item.productName || di.product === item.product) &&
                    (di.spkNo === item.spkNo || !item.spkNo) // Optional SPK match
                  );
                  return total + matchingItems.reduce((sum: number, i: any) => sum + (Number(i.qty) || 0), 0);
                }, 0);

              const remaining = Math.max(0, orderQty - itemDeliveredQty);

              // Only add if there is remaining qty or if we want to show completed items too
              if (remaining > 0) {
                allItems.push({
                  product: item.productName || item.product || '',
                  productCode: item.productId || item.productKode || '',
                  qty: remaining, // Default to remaining
                  unit: item.unit || 'PCS',
                  spkNo: item.spkNo || '',
                  soNo: so.soNo,
                  orderQty: orderQty,
                  deliveredQty: itemDeliveredQty,
                  remainingQty: remaining,
                  deliveryQty: remaining // Default edit value
                });
              }
            });
          });

          setAutoSOItems(allItems);
        }
      };
      loadSOData();
    }
  }, [selectedSOs, mode]);

  // Auto-populate data ketika SJ dipilih
  useEffect(() => {
    if (selectedSJs.length > 0 && mode === 'sj') {
      const loadSJData = async () => {
        const sjData = await storageService.get<any[]>('delivery') || [];
        const selectedSJItems = sjData.filter((sj: any) => selectedSJs.includes(sj.sjNo));

        if (selectedSJItems.length > 0) {
          const firstSJ = selectedSJItems[0];
          setAutoSJCustomer(firstSJ.customer || '');

          const allItems: Array<{ product: string; productCode?: string; qty: number; unit?: string; spkNo?: string; soNo?: string }> = [];

          selectedSJItems.forEach((sj: any) => {
            const items = sj.items || [];
            items.forEach((item: any) => {
              allItems.push({
                product: item.product || '',
                productCode: item.productCode || '',
                qty: Number(item.qty || 0),
                unit: item.unit || 'PCS',
                spkNo: item.spkNo || '',
                soNo: item.soNo || sj.soNo || '',
              });
            });
          });

          setAutoSJItems(allItems);
        }
      };
      loadSJData();
    }
  }, [selectedSJs, mode]);

  // Load remaining SO data ketika dialog dibuka
  useEffect(() => {
    const loadRemainingSOData = async () => {
      try {
        let soData = await storageService.get<any[]>('salesOrders') || [];
        let deliveryData = await storageService.get<any[]>('delivery') || [];
        
        // If data is empty, wait for background server sync
        if ((!soData || soData.length === 0) || (!deliveryData || deliveryData.length === 0)) {
          await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5 seconds for server sync
          soData = await storageService.get<any[]>('salesOrders') || [];
          deliveryData = await storageService.get<any[]>('delivery') || [];
        }
        
        // Build delivery map untuk quick lookup: soNo -> productCode -> deliveredQty
        const deliveryMap: Record<string, Record<string, number>> = {};
        deliveryData.forEach((dn: any) => {
          if (dn.deleted || !dn.soNo) return;
          if (!deliveryMap[dn.soNo]) {
            deliveryMap[dn.soNo] = {};
          }
          const dnItems = dn.items || [];
          dnItems.forEach((dnItem: any) => {
            const key = dnItem.productCode || dnItem.product || '';
            if (key) {
              deliveryMap[dn.soNo][key] = (deliveryMap[dn.soNo][key] || 0) + Number(dnItem.qty || 0);
            }
          });
        });
        
        // Hitung remaining qty untuk setiap SO
        const remainingSOList: Array<{ soNo: string; customer: string; items: Array<{ product: string; productCode?: string; orderQty: number; deliveredQty: number; remainingQty: number; unit?: string; spkNo?: string }> }> = [];
        
        soData.forEach((so: any) => {
          if (!so.soNo || so.deleted) return;
          
          const soItems = so.items || [];
          const remainingItems: Array<{ product: string; productCode?: string; orderQty: number; deliveredQty: number; remainingQty: number; unit?: string; spkNo?: string }> = [];
          
          soItems.forEach((soItem: any) => {
            const productCode = soItem.itemSku || soItem.productCode || soItem.productId || '';
            const orderQty = Number(soItem.qty || 0);
            
            // Get delivered qty from delivery map
            const deliveredQty = deliveryMap[so.soNo]?.[productCode] || 0;
            const remainingQty = Math.max(0, orderQty - deliveredQty);
            
            if (remainingQty > 0) {
              remainingItems.push({
                product: soItem.productName || soItem.product || soItem.itemName || '',
                productCode: productCode,
                orderQty: orderQty,
                deliveredQty: deliveredQty,
                remainingQty: remainingQty,
                unit: soItem.unit || 'PCS',
                spkNo: soItem.spkNo || '',
              });
            }
          });
          
          if (remainingItems.length > 0) {
            remainingSOList.push({
              soNo: so.soNo,
              customer: so.customer || '',
              items: remainingItems,
            });
          }
        });
        
        setRemainingSOs(remainingSOList);
      } catch (error) {
        console.error('Error loading remaining SO data:', error);
      }
    };
    
    loadRemainingSOData();
  }, []);

  // Auto-populate data ketika remaining SO dipilih
  useEffect(() => {
    if (selectedRemainingSOs.length > 0 && mode === 'remaining') {
      const selectedRemaining = remainingSOs.filter(so => selectedRemainingSOs.includes(so.soNo));
      
      if (selectedRemaining.length > 0) {
        const firstSO = selectedRemaining[0];
        setAutoRemainingCustomer(firstSO.customer);
        
        const allItems: Array<{ product: string; productCode?: string; qty: number; unit?: string; spkNo?: string; soNo?: string }> = [];
        
        selectedRemaining.forEach((so: any) => {
          so.items.forEach((item: any) => {
            allItems.push({
              product: item.product,
              productCode: item.productCode,
              qty: item.remainingQty,
              unit: item.unit,
              spkNo: item.spkNo,
              soNo: so.soNo,
            });
          });
        });
        
        setAutoRemainingItems(allItems);
      }
    }
  }, [selectedRemainingSOs, mode, remainingSOs]);

  const handleCreate = async () => {
    if (mode === 'po') {
      if (selectedPOs.length === 0) {
        showAlert('Validation Error', '⚠️ Pilih minimal 1 Purchase Order');
        return;
      }
      if (!autoPOCustomer || autoPOItems.length === 0) {
        showAlert('Loading', '⏳ Tunggu data dimuat dari PO yang dipilih');
        return;
      }
      await onCreate({
        poNos: selectedPOs,
        manualData: {
          customer: autoPOCustomer,
          items: autoPOItems,
          deliveryDate,
          productCodeDisplay: productCodeDisplay,
          specNote: specNote || undefined,
        }
      });
    } else if (mode === 'so') {
      if (selectedSOs.length === 0) {
        showAlert('Validation Error', '⚠️ Pilih minimal 1 Sales Order');
        return;
      }
      if (!autoSOCustomer || autoSOItems.length === 0) {
        showAlert('Loading', '⏳ Tunggu data dimuat dari SO yang dipilih');
        return;
      }
      await onCreate({
        soNos: selectedSOs,
        manualData: {
          customer: autoSOCustomer,
          items: autoSOItems,
          deliveryDate,
          productCodeDisplay: productCodeDisplay,
          specNote: specNote || undefined,
        }
      });
    } else if (mode === 'remaining') {
      if (selectedRemainingSOs.length === 0) {
        showAlert('Validation Error', '⚠️ Pilih minimal 1 Sales Order dengan remaining qty');
        return;
      }
      if (!autoRemainingCustomer || autoRemainingItems.length === 0) {
        showAlert('Loading', '⏳ Tunggu data dimuat dari SO yang dipilih');
        return;
      }
      await onCreate({
        soNos: selectedRemainingSOs,
        manualData: {
          customer: autoRemainingCustomer,
          items: autoRemainingItems,
          deliveryDate,
          productCodeDisplay: productCodeDisplay,
          specNote: specNote || undefined,
        }
      });
    } else if (mode === 'sj') {
      if (selectedSJs.length === 0) {
        showAlert('Validation Error', '⚠️ Pilih minimal 1 Surat Jalan');
        return;
      }
      if (!autoSJCustomer || autoSJItems.length === 0) {
        showAlert('Loading', '⏳ Tunggu data dimuat dari SJ yang dipilih');
        return;
      }
      await onCreate({
        sjNos: selectedSJs,
        manualData: {
          customer: autoSJCustomer,
          items: autoSJItems,
          deliveryDate,
          productCodeDisplay: productCodeDisplay,
          specNote: specNote || undefined,
        }
      });
    } else {
      if (!manualCustomer || manualItems.length === 0 || manualItems.some(item => !item.product || item.qty <= 0)) {
        showAlert('Validation Error', '⚠️ Isi customer dan minimal 1 item dengan product dan qty > 0');
        return;
      }
      await onCreate({
        manualData: {
          customer: manualCustomer,
          items: manualItems,
          deliveryDate,
          productCodeDisplay: productCodeDisplay,
          specNote: specNote || undefined,
        }
      });
    }
  };

  if (loading) {
    return (
      <div className="dialog-overlay" onClick={onClose} style={{ zIndex: 10001 }}>
        <div className="dialog-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
          <Card title="Create Delivery Note">
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="dialog-overlay" onClick={onClose} style={{ zIndex: 10001 }}>
      <div className="dialog-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
        <Card title="Create Delivery Note">
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              Mode
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Button
                variant={mode === 'po' ? 'primary' : 'secondary'}
                onClick={() => setMode('po')}
                style={{ flex: 1, minWidth: '100px' }}
              >
                By PO
              </Button>
              <Button
                variant={mode === 'so' ? 'primary' : 'secondary'}
                onClick={() => setMode('so')}
                style={{ flex: 1, minWidth: '100px' }}
              >
                By SO
              </Button>
              <Button
                variant={mode === 'sj' ? 'primary' : 'secondary'}
                onClick={() => setMode('sj')}
                style={{ flex: 1, minWidth: '100px' }}
              >
                By SJ
              </Button>
              <Button
                variant={mode === 'remaining' ? 'primary' : 'secondary'}
                onClick={() => setMode('remaining')}
                style={{ flex: 1, minWidth: '100px' }}
              >
                By Remaining
              </Button>
              <Button
                variant={mode === 'manual' ? 'primary' : 'secondary'}
                onClick={() => setMode('manual')}
                style={{ flex: 1, minWidth: '100px' }}
              >
                Manual
              </Button>
            </div>
          </div>

          {mode === 'po' && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Search Purchase Order
                </label>
                <input
                  type="text"
                  value={poSearchQuery}
                  onChange={(e) => setPoSearchQuery(e.target.value)}
                  placeholder="Search by PO No, Supplier, Material..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    marginBottom: '12px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Pilih Purchase Order ({filteredPOs.length})
                </label>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '4px', padding: '8px' }}>
                  {filteredPOs.map((po: any) => (
                    <div key={po.poNo} style={{ marginBottom: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedPOs.includes(po.poNo)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPOs([...selectedPOs, po.poNo]);
                            } else {
                              setSelectedPOs(selectedPOs.filter(p => p !== po.poNo));
                            }
                          }}
                          style={{ marginRight: '8px' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div><strong>{po.poNo}</strong> - {po.supplier}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {po.materialItem} - Qty: {po.qty} | SO: {po.soNo || '-'}
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                  {purchaseOrderList.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                      Tidak ada PO yang tersedia
                    </div>
                  )}
                </div>
              </div>

              {autoPOCustomer && (
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
                  <div><strong>Customer:</strong> {autoPOCustomer}</div>
                  <div style={{ marginTop: '8px' }}>
                    <strong>Items:</strong>
                    <div style={{ marginTop: '4px' }}>
                      {autoPOItems.map((item, idx) => (
                        <div key={idx} style={{ fontSize: '12px', marginTop: '4px' }}>
                          {item.product} - Qty: {item.qty} {item.unit || 'PCS'} {item.spkNo ? `| SPK: ${item.spkNo}` : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {mode === 'so' && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Search Sales Order
                </label>
                <input
                  type="text"
                  value={soSearchQuery}
                  onChange={(e) => setSoSearchQuery(e.target.value)}
                  placeholder="Search by SO No, Customer, Kode..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    marginBottom: '12px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Pilih Sales Order ({filteredSOs.length})
                </label>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '4px', padding: '8px' }}>
                  {filteredSOs.map((so: any) => (
                    <div key={so.soNo} style={{ marginBottom: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedSOs.includes(so.soNo)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSOs([...selectedSOs, so.soNo]);
                            } else {
                              setSelectedSOs(selectedSOs.filter(s => s !== so.soNo));
                            }
                          }}
                          style={{ marginRight: '8px' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div><strong>{so.soNo}</strong> - {so.customer}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Items: {so.items?.length || 0}
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                  {filteredSOs.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                      Tidak ada SO yang tersedia
                    </div>
                  )}
                </div>
              </div>

              {autoSOCustomer && (
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
                  <div><strong>Customer:</strong> {autoSOCustomer}</div>
                  <div style={{ marginTop: '8px' }}>
                    <strong>Items & Quantities:</strong>
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {autoSOItems.map((item, idx) => (
                        <div key={idx} style={{
                          padding: '8px',
                          backgroundColor: 'var(--bg-tertiary)',
                          borderRadius: '4px',
                          border: '1px solid var(--border)'
                        }}>
                          <div style={{ fontWeight: 500, fontSize: '13px', marginBottom: '6px' }}>
                            {item.product}
                            {item.spkNo && <span style={{ color: 'var(--text-secondary)', marginLeft: '6px', fontSize: '12px' }}>({item.spkNo})</span>}
                            <span style={{ float: 'right', fontSize: '11px', color: 'var(--text-secondary)' }}>{item.unit}</span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.5fr', gap: '8px', fontSize: '12px', alignItems: 'end' }}>
                            <div style={{ color: 'var(--text-secondary)' }}>
                              Order<br />
                              <strong style={{ color: 'var(--text-primary)' }}>{item.orderQty}</strong>
                            </div>
                            <div style={{ color: 'var(--text-secondary)' }}>
                              Sent<br />
                              <strong style={{ color: 'var(--success)' }}>{item.deliveredQty}</strong>
                            </div>
                            <div style={{ color: 'var(--text-secondary)' }}>
                              Remain<br />
                              <strong style={{ color: item.remainingQty === 0 ? 'var(--success)' : 'var(--warning)' }}>{item.remainingQty}</strong>
                            </div>
                            <div>
                              <span style={{ fontWeight: 600, color: 'var(--primary)' }}>Send Now</span>
                              <input
                                type="number"
                                value={item.qty}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  const newItems = [...autoSOItems];
                                  newItems[idx].qty = val;
                                  setAutoSOItems(newItems);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '4px 8px',
                                  marginTop: '2px',
                                  border: '1px solid var(--primary)',
                                  borderRadius: '4px',
                                  fontWeight: 'bold'
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {mode === 'sj' && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Search Surat Jalan
                </label>
                <input
                  type="text"
                  value={sjSearchQuery}
                  onChange={(e) => setSjSearchQuery(e.target.value)}
                  placeholder="Search by SJ No, Customer, SO No..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    marginBottom: '12px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Pilih Surat Jalan ({filteredSJs.length})
                </label>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '4px', padding: '8px' }}>
                  {filteredSJs.map((sj: any) => (
                    <div key={sj.sjNo} style={{ marginBottom: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedSJs.includes(sj.sjNo)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSJs([...selectedSJs, sj.sjNo]);
                            } else {
                              setSelectedSJs(selectedSJs.filter(s => s !== sj.sjNo));
                            }
                          }}
                          style={{ marginRight: '8px' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div><strong>{sj.sjNo}</strong> - {sj.customer}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            SO: {sj.soNo || '-'} | Items: {sj.items?.length || 0}
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                  {filteredSJs.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                      Tidak ada SJ yang tersedia
                    </div>
                  )}
                </div>
              </div>

              {autoSJCustomer && (
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
                  <div><strong>Customer:</strong> {autoSJCustomer}</div>
                  <div style={{ marginTop: '8px' }}>
                    <strong>Items:</strong>
                    <div style={{ marginTop: '4px' }}>
                      {autoSJItems.map((item, idx) => (
                        <div key={idx} style={{ fontSize: '12px', marginTop: '4px' }}>
                          {item.product} - Qty: {item.qty} {item.unit || 'PCS'} {item.spkNo ? `| SPK: ${item.spkNo}` : ''} {item.soNo ? `| SO: ${item.soNo}` : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {mode === 'remaining' && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Search Sales Order
                </label>
                <input
                  type="text"
                  value={remainingSearchQuery}
                  onChange={(e) => setRemainingSearchQuery(e.target.value)}
                  placeholder="Search by SO No, Customer..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    marginBottom: '12px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Pilih Sales Order dengan Remaining Qty ({filteredRemainingSOs.length})
                </label>
                <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '4px', padding: '8px' }}>
                  {filteredRemainingSOs.map((so: any) => (
                    <div key={so.soNo} style={{ marginBottom: '12px', padding: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
                      <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer', marginBottom: '8px' }}>
                        <input
                          type="checkbox"
                          checked={selectedRemainingSOs.includes(so.soNo)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRemainingSOs([...selectedRemainingSOs, so.soNo]);
                            } else {
                              setSelectedRemainingSOs(selectedRemainingSOs.filter(s => s !== so.soNo));
                            }
                          }}
                          style={{ marginRight: '8px', marginTop: '2px' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div><strong>{so.soNo}</strong> - {so.customer}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Items dengan remaining qty:
                          </div>
                          <div style={{ marginTop: '6px', paddingLeft: '8px', borderLeft: '2px solid var(--border)' }}>
                            {so.items.map((item: any, idx: number) => (
                              <div key={idx} style={{ fontSize: '11px', marginTop: '4px', color: 'var(--text-secondary)' }}>
                                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{item.product}</span>
                                {item.productCode && <span style={{ marginLeft: '6px' }}>({item.productCode})</span>}
                                <span style={{ float: 'right', color: 'var(--warning)' }}>
                                  Remain: <strong>{item.remainingQty}</strong> {item.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                  {filteredRemainingSOs.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                      Tidak ada SO dengan remaining qty
                    </div>
                  )}
                </div>
              </div>

              {autoRemainingCustomer && (
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
                  <div><strong>Customer:</strong> {autoRemainingCustomer}</div>
                  <div style={{ marginTop: '8px' }}>
                    <strong>Items & Remaining Quantities:</strong>
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {autoRemainingItems.map((item, idx) => (
                        <div key={idx} style={{
                          padding: '8px',
                          backgroundColor: 'var(--bg-tertiary)',
                          borderRadius: '4px',
                          border: '1px solid var(--border)'
                        }}>
                          <div style={{ fontWeight: 500, fontSize: '13px', marginBottom: '6px' }}>
                            {item.product}
                            {item.spkNo && <span style={{ color: 'var(--text-secondary)', marginLeft: '6px', fontSize: '12px' }}>({item.spkNo})</span>}
                            <span style={{ float: 'right', fontSize: '11px', color: 'var(--text-secondary)' }}>{item.unit}</span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '8px', fontSize: '12px', alignItems: 'end' }}>
                            <div style={{ color: 'var(--text-secondary)' }}>
                              Remaining<br />
                              <strong style={{ color: 'var(--warning)' }}>{item.qty}</strong>
                            </div>
                            <div>
                              <span style={{ fontWeight: 600, color: 'var(--primary)' }}>Send Now</span>
                              <input
                                type="number"
                                value={item.qty}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  const newItems = [...autoRemainingItems];
                                  newItems[idx].qty = val;
                                  setAutoRemainingItems(newItems);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '4px 8px',
                                  marginTop: '2px',
                                  border: '1px solid var(--primary)',
                                  borderRadius: '4px',
                                  fontWeight: 'bold'
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {mode === 'manual' && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Customer
                </label>
                <input
                  type="text"
                  list="customer-list"
                  value={manualCustomer}
                  onChange={(e) => setManualCustomer(e.target.value)}
                  placeholder="Pilih atau ketik customer"
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
                <datalist id="customer-list">
                  {customersList.map((cust: any) => (
                    <option key={cust.id} value={cust.nama} />
                  ))}
                </datalist>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500' }}>Items</label>
                  <Button
                    variant="secondary"
                    onClick={() => setManualItems([...manualItems, { product: '', productCode: '', qty: 1, unit: 'PCS' }])}
                    style={{ fontSize: '12px', padding: '4px 8px' }}
                  >
                    + Add Item
                  </Button>
                </div>
                {manualItems.map((item, idx) => (
                  <div key={idx} style={{ marginBottom: '12px', padding: '12px', border: '1px solid var(--border)', borderRadius: '4px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <div>
                        <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Product</label>
                        <input
                          type="text"
                          value={item.product}
                          onChange={(e) => {
                            const newItems = [...manualItems];
                            newItems[idx].product = e.target.value;
                            setManualItems(newItems);
                          }}
                          placeholder="Product name"
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            fontSize: '13px',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Qty</label>
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => {
                            const newItems = [...manualItems];
                            newItems[idx].qty = Number(e.target.value) || 0;
                            setManualItems(newItems);
                          }}
                          placeholder="Qty"
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            fontSize: '13px',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Unit</label>
                        <input
                          type="text"
                          value={item.unit || 'PCS'}
                          onChange={(e) => {
                            const newItems = [...manualItems];
                            newItems[idx].unit = e.target.value;
                            setManualItems(newItems);
                          }}
                          placeholder="Unit"
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            fontSize: '13px',
                          }}
                        />
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const newItems = manualItems.filter((_, i) => i !== idx);
                        setManualItems(newItems);
                      }}
                      style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#f44336', color: 'white' }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              Keterangan (akan muncul di template SJ)
            </label>
            <textarea
              value={specNote}
              onChange={(e) => setSpecNote(e.target.value)}
              placeholder="Masukkan keterangan untuk Surat Jalan (No. SJ, Detail Product, dll)"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                minHeight: '100px',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Keterangan ini akan ditampilkan di bagian "Keterangan" pada template Surat Jalan
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              Product Code Display (Template SJ)
            </label>
            <select
              value={productCodeDisplay}
              onChange={(e) => setProductCodeDisplay(e.target.value as 'padCode' | 'productId')}
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
              <option value="padCode">Pad Code (default, fallback ke Product ID jika tidak ada)</option>
              <option value="productId">Product ID / SKU ID</option>
            </select>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Pilihan ini menentukan kode yang ditampilkan di kolom "PRODUCT CODE" pada template Surat Jalan
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              Delivery Date
            </label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
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

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate}>Create Delivery Note</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

// Create SJ Recap Dialog Component
const CreateSJRecapDialog: React.FC<{
  deliveries: DeliveryNote[];
  onClose: () => void;
  onCreate: (data: { sjNos: string[]; soNos: string[]; customer: string; deliveryDate: string; specNote?: string }) => void;
}> = ({ deliveries, onClose, onCreate }) => {
  const { showAlert: showAlertBase } = useDialog();
  const showAlert = (title: string, message: string) => {
    showAlertBase(message, title);
  };

  const [selectedSONos, setSelectedSONos] = useState<string[]>([]);
  const [selectedSJs, setSelectedSJs] = useState<string[]>([]);
  const [customer, setCustomer] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [specNote, setSpecNote] = useState('');
  const [sjList, setSjList] = useState<DeliveryNote[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [searchSO, setSearchSO] = useState('');

  useEffect(() => {
    const loadData = async () => {
      let soData = await storageService.get<SalesOrder[]>('salesOrders') || [];
      
      // If data is empty, wait for background server sync
      if (!soData || soData.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5 seconds for server sync
        soData = await storageService.get<SalesOrder[]>('salesOrders') || [];
      }
      
      setSalesOrders(soData);

      // Filter SJ yang sudah CLOSE dan belum di-merge
      const closedSJs = deliveries.filter(d =>
        d.status === 'CLOSE' &&
        d.sjNo &&
        !d.isRecap &&
        !d.deleted
      );
      setSjList(closedSJs);
    };
    loadData();
  }, [deliveries]);

  // Auto-filter SJ dan set customer ketika SO dipilih
  useEffect(() => {
    if (selectedSONos.length > 0) {
      // Filter SJ berdasarkan SO yang dipilih
      const filteredSJs = sjList.filter(sj => {
        const sjSoNo = sj.soNo || '';
        const sjSoNos = sj.soNos || [];
        return selectedSONos.includes(sjSoNo) ||
          sjSoNos.some(so => selectedSONos.includes(so));
      });

      // Auto-select semua SJ yang match dengan SO yang dipilih
      const sjNosToSelect = filteredSJs.map(sj => sj.sjNo || '').filter(Boolean);
      setSelectedSJs(sjNosToSelect);

      // Auto-set customer dari SO pertama yang dipilih
      const firstSO = salesOrders.find(so => selectedSONos.includes(so.soNo));
      if (firstSO?.customer) {
        setCustomer(firstSO.customer);
      }
    } else {
      setSelectedSJs([]);
      setCustomer('');
    }
  }, [selectedSONos, sjList, salesOrders]);

  const handleCreate = () => {
    if (selectedSONos.length === 0) {
      showAlert('Validation Error', 'Please select at least one SO');
      return;
    }
    if (selectedSJs.length === 0) {
      showAlert('Validation Error', 'No CLOSE SJ found for selected SO(s)');
      return;
    }
    if (!customer) {
      showAlert('Validation Error', 'Customer not found for selected SO(s)');
      return;
    }
    if (!deliveryDate) {
      showAlert('Validation Error', 'Please select delivery date');
      return;
    }
    onCreate({
      sjNos: selectedSJs,
      soNos: selectedSONos,
      customer,
      deliveryDate,
      specNote,
    });
  };

  const filteredSOs = useMemo(() => {
    if (!searchSO) return salesOrders;
    const query = searchSO.toLowerCase();
    return salesOrders.filter(so =>
      (so.soNo || '').toLowerCase().includes(query) ||
      (so.customer || '').toLowerCase().includes(query)
    );
  }, [salesOrders, searchSO]);

  // Get SJs untuk SO yang dipilih
  const soBasedSJs = useMemo(() => {
    if (selectedSONos.length === 0) return [];
    return sjList.filter(sj => {
      const sjSoNo = sj.soNo || '';
      const sjSoNos = sj.soNos || [];
      return selectedSONos.includes(sjSoNo) ||
        sjSoNos.some(so => selectedSONos.includes(so));
    });
  }, [sjList, selectedSONos]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '90%',
          width: '1000px',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <Card>
          <h2 style={{ marginBottom: '20px' }}>Create SJ Recap</h2>

          {/* SO Selection */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              Select SO Number(s) *
            </label>
            <input
              type="text"
              value={searchSO}
              onChange={(e) => setSearchSO(e.target.value)}
              placeholder="Search SO..."
              style={{
                width: '100%',
                padding: '8px 12px',
                marginBottom: '8px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
              }}
            />
            <div style={{
              maxHeight: '200px',
              overflowY: 'auto',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '8px'
            }}>
              {filteredSOs.length > 0 ? (
                filteredSOs.map(so => (
                  <label key={so.id} style={{ display: 'flex', alignItems: 'center', padding: '4px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedSONos.includes(so.soNo)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSONos([...selectedSONos, so.soNo]);
                        } else {
                          setSelectedSONos(selectedSONos.filter(s => s !== so.soNo));
                        }
                      }}
                      style={{ marginRight: '8px' }}
                    />
                    <span>{so.soNo} - {so.customer}</span>
                  </label>
                ))
              ) : (
                <div style={{ padding: '8px', color: 'var(--text-secondary)' }}>No SO found</div>
              )}
            </div>
          </div>

          {/* Auto-selected SJs Info */}
          {selectedSONos.length > 0 && (
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }}>
              <div style={{ fontWeight: 600, marginBottom: '8px' }}>
                Selected SO: {selectedSONos.join(', ')}
              </div>
              {customer && (
                <div style={{ marginBottom: '8px', fontSize: '13px' }}>
                  Customer: <strong>{customer}</strong>
                </div>
              )}
              {soBasedSJs.length > 0 ? (
                <div style={{ fontSize: '13px' }}>
                  Found <strong>{soBasedSJs.length}</strong> CLOSE SJ(s) from selected SO(s):
                  <div style={{ marginTop: '4px', marginLeft: '8px', fontSize: '12px' }}>
                    {soBasedSJs.map(sj => (
                      <div key={sj.id}>• {sj.sjNo} ({sj.items?.length || 0} items)</div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: '#f44336' }}>
                  ⚠️ No CLOSE SJ found for selected SO(s)
                </div>
              )}
            </div>
          )}

          {/* Delivery Date */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              Delivery Date *
            </label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Spec Note */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              Keterangan
            </label>
            <textarea
              value={specNote}
              onChange={(e) => setSpecNote(e.target.value)}
              placeholder="Keterangan (optional)"
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate}>Create SJ Recap</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DeliveryNote;

