import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Input from '../../components/Input';
import DateRangeFilter from '../../components/DateRangeFilter';
import { storageService, extractStorageValue, StorageKeys } from '../../services/storage';
import { filterActiveItems } from '../../utils/data-persistence-helper';
import { deletePackagingItem, reloadPackagingData } from '../../utils/packaging-delete-helper';
import { openPrintWindow, focusAppWindow } from '../../utils/actions';
import { debounce } from '../../utils/debounce';
import * as XLSX from 'xlsx';
import { createStyledWorksheet, setColumnWidths, ExcelColumn } from '../../utils/excel-helper';
import { useDialog } from '../../hooks/useDialog';
import { useToast } from '../../hooks/useToast';
import { useLanguage } from '../../hooks/useLanguage';
import { logCreate, logUpdate, logDelete } from '../../utils/activity-logger';
import { generateQuotationHtml } from '../../pdf/quotation-pdf-template';
import '../../styles/common.css';
import '../../styles/compact.css';

interface SOItem {
  id: string;
  productId: string;
  productKode: string;
  productName: string;
  qty: number;
  unit: string;
  price: number;
  total: number;
  specNote?: string;
  padCode?: string; // PAD Code untuk product
  inventoryQty?: number; // Inventory quantity yang akan masuk ke premonth stock
  discountPercent?: number; // Diskon per item (0-100)
  bom?: Array<{
    materialId: string;
    materialName: string;
    unit: string;
    qty: number;
    ratio: number;
    pricePerUnit?: number;
  }>;
}

interface SalesOrder {
  id: string;
  soNo: string; // Nomor PO dari Customer (untuk SO) atau Quotation No (untuk Quotation)
  customer: string;
  customerKode?: string;
  paymentTerms: 'TOP' | 'COD' | 'CBD';
  topDays?: number;
  status: 'OPEN' | 'CLOSE';
  created: string;
  globalSpecNote?: string;
  items: SOItem[];
  bomSnapshot?: any; // Snapshot BOM untuk historical record
  category?: 'packaging';
  confirmed?: boolean; // Flag untuk SO yang sudah dikonfirmasi ke PPIC
  confirmedAt?: string; // Timestamp saat dikonfirmasi
  confirmedBy?: string; // User yang mengkonfirmasi
  discountPercent?: number; // Discount percentage untuk quotation
  signatureBase64?: string; // Base64 signature image untuk quotation
  signatureName?: string; // Nama penandatangan
  signatureTitle?: string; // Jabatan/title penandatangan
  matchedSoNo?: string; // SO No yang di-match dengan quotation (jika sudah di-match)
  lastUpdate?: string; // Last update timestamp
  timestamp?: number; // Timestamp untuk sync ke server
  _timestamp?: number; // Alternative timestamp field untuk sync
  
  // 🔑 NEW: Historical data keys (for import)
  invoiceNos?: string[]; // Multiple invoices per SO
  deliveryNos?: string[]; // Multiple deliveries per SO
  taxInvoiceNo?: string; // Tax invoice number
  isHistoricalData?: boolean; // Flag untuk data historical
  importedAt?: string; // Timestamp saat di-import
  importSource?: string; // Source file (e.g., "packaging_master.csv")
  financialSummary?: {
    subtotal: number;
    tax: number;
    grandTotal: number;
    discount?: number;
  };
}

interface Customer {
  id: string;
  kode: string;
  nama: string;
}

interface Product {
  id: string;
  kode: string;
  product_id?: string;
  nama: string;
  satuan: string;
  hargaFg?: number;
  hargaSales?: number;
  padCode?: string; // PAD Code untuk product
  kodeIpos?: string; // Kode Ipos untuk product (khusus packaging)
  kategori?: string; // Kategori product
  customer?: string; // Customer untuk product
  lastUpdate?: string; // Last update timestamp
  userUpdate?: string; // User yang update
  ipAddress?: string; // IP address
}

interface Material {
  id: string;
  kode: string;
  material_id?: string;
  nama: string;
  priceMtr?: number;
  harga?: number;
  satuan?: string;
  unit?: string;
}

// ActionMenu component untuk dropdown 3 titik
const SOActionMenu = ({
  onEdit,
  onDelete,
  onConfirm,
  status,
  ppicNotified,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  onConfirm?: () => void;
  status?: 'OPEN' | 'CLOSE';
  ppicNotified?: boolean;
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
        const menuHeight = 200; // Estimated menu height
        const spaceBelow = window.innerHeight - buttonRect.bottom;
        const spaceAbove = buttonRect.top;
        const gap = 0; // No gap for tight positioning

        // If not enough space below but enough space above, position above
        if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
          setMenuPosition({
            top: buttonRect.top - menuHeight - gap,
            right: window.innerWidth - buttonRect.right,
          });
        } else {
          // Default: position below with small gap
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
          {/* View button hidden - only show Edit, Confirm, Delete */}
          {onEdit && status === 'OPEN' && (
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
          {onConfirm && status === 'OPEN' && (
            <button
              onClick={() => { onConfirm(); setShowMenu(false); }}
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
              ✅ Confirm
            </button>
          )}
          {onDelete && status === 'OPEN' && (
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

const SalesOrders = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [quotations, setQuotations] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [bomData, setBomData] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);
  const [showBOMPreview, setShowBOMPreview] = useState(false);
  const [showQuotationPreview, setShowQuotationPreview] = useState(false);
  const [quotationPreviewData, setQuotationPreviewData] = useState<SalesOrder | null>(null);
  const [quotationPreviewHtml, setQuotationPreviewHtml] = useState<string>('');

  // Filter & Search
  const [activeTab, setActiveTab] = useState<'all' | 'outstanding' | 'quotation'>('all');
  const [orderViewMode, setOrderViewMode] = useState<'cards' | 'table'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Form state
  const [formData, setFormData] = useState<Partial<SalesOrder>>({
    soNo: '',
    customer: '',
    customerKode: '',
    paymentTerms: 'TOP',
    topDays: 30,
    items: [],
    globalSpecNote: '',
    category: 'packaging',
    created: '', // Add created date field
  });

  // Quotation form state (untuk tab Quotation)
  const [quotationFormData, setQuotationFormData] = useState<Partial<SalesOrder>>({
    soNo: '',
    customer: '',
    customerKode: '',
    paymentTerms: 'TOP',
    topDays: 30,
    items: [],
    globalSpecNote: '',
    category: 'packaging',
    discountPercent: 0,
    signatureBase64: '',
    signatureName: '',
    signatureTitle: '',
  });

  // Autocomplete state
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isSelectingCustomer, setIsSelectingCustomer] = useState(false);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [customerDialogSearch, setCustomerDialogSearch] = useState('');
  const [productInputValue, setProductInputValue] = useState<{ [key: number]: string }>({});
  // TODO: Implement product search functionality in form
  const [productSearch, setProductSearch] = useState<{ [key: number]: string }>({});
  const [showProductDialog, setShowProductDialog] = useState<number | null>(null);
  const [productDialogSearch, setProductDialogSearch] = useState('');
  const [qtyInputValue, setQtyInputValue] = useState<{ [key: number]: string }>({});
  const [priceInputValue, setPriceInputValue] = useState<{ [key: number]: string }>({});

  // Force re-render key untuk input fields
  const [formKey, setFormKey] = useState(0);

  // Hidden popup untuk trigger re-render saat edit
  const [showHiddenPopup, setShowHiddenPopup] = useState(false);

  // Custom Dialog - menggunakan hook terpusat
  const { showConfirm, closeDialog, DialogComponent } = useDialog();
  const { showToast, ToastContainer } = useToast();

  // Prevent infinite loop on storage changes
  const isProcessingProductsRef = useRef(false);

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

  // Quotation autocomplete state
  const [quotationCustomerSearch, setQuotationCustomerSearch] = useState('');
  const [quotationProductSearch, setQuotationProductSearch] = useState<{ [key: number]: string }>({});
  const [showQuotationCustomerDropdown, setShowQuotationCustomerDropdown] = useState(false);
  const [showQuotationProductDialog, setShowQuotationProductDialog] = useState<number | null>(null);
  const [quotationProductDialogSearch, setQuotationProductDialogSearch] = useState('');
  const [showQuotationFormDialog, setShowQuotationFormDialog] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<SalesOrder | null>(null);
  const [quotationQtyInputValue, setQuotationQtyInputValue] = useState<{ [key: number]: string }>({});
  const [quotationPriceInputValue, setQuotationPriceInputValue] = useState<{ [key: number]: string }>({});
  const [quotationItemDiscountInputValue, setQuotationItemDiscountInputValue] = useState<{ [key: number]: string }>({});
  const [quotationDiscountInputValue, setQuotationDiscountInputValue] = useState<string>('');

  // Permissions (simplified - bisa di-extend dengan user management)

  // ⚡ PERFORMANCE: Create debounced handlers for form input
  const debouncedUpdateItem = useCallback(
    debounce((index: number, field: keyof SOItem, value: any) => {
      handleUpdateItem(index, field, value);
    }, 300),
    []
  );

  // Simple product loading - SAME AS PRODUCTION.TSX
  const loadProducts = async () => {
    const dataRaw = extractStorageValue(await storageService.get<Product[]>('products'));
    const data = filterActiveItems(dataRaw);

    // Ensure padCode is always present (even if empty string) for all products
    const productsWithPadCode = data.map((p, idx) => ({
      ...p,
      no: idx + 1,
      padCode: p.padCode !== undefined ? p.padCode : '' // Ensure padCode always exists
    }));

    setProducts(productsWithPadCode);
  };

  useEffect(() => {
    // ⚡ PERFORMANCE: Priority 1 - Load essential data first
    loadOrders();
    loadCustomers(); // Small dataset, OK to load all
    
    // ⚡ PERFORMANCE: Priority 2 - Load in background (1 second delay)
    const timer1 = setTimeout(() => {
      loadProducts();
      loadBOM();
    }, 1000);
    
    // ⚡ PERFORMANCE: Priority 3 - Load on demand (not loaded initially)
    // loadMaterials() - only when needed
    // loadDeliveries() - only when needed
    // loadQuotations() - only when needed
    
    return () => {
      clearTimeout(timer1);
    };
  }, []);

  // Listen for storage changes to auto-reload products (SAME AS MASTER PRODUCTS)
  useEffect(() => {
    const handleStorageChange = (event: CustomEvent) => {
      // Prevent infinite loop - skip if already processing
      if (isProcessingProductsRef.current) return;
      
      const { key } = event.detail || {};

      // Reload products if products data changed
      if (key === StorageKeys.PACKAGING.PRODUCTS || key === 'products') {
        isProcessingProductsRef.current = true;
        loadProducts().finally(() => {
          isProcessingProductsRef.current = false;
        });
      }
    };

    // Listen for storage change events
    window.addEventListener('app-storage-changed', handleStorageChange as EventListener);

    return () => {
      window.removeEventListener('app-storage-changed', handleStorageChange as EventListener);
    };
  }, []);

  // Load default signature (TTD Pak Ali) dari public folder
  const loadDefaultSignature = async (): Promise<{ signatureBase64: string; signatureName: string; signatureTitle: string } | null> => {
    const DEFAULT_SIGNATURE_NAME = 'M. Ali Audah';
    const DEFAULT_SIGNATURE_TITLE = 'Direktur';

    try {
      const electronAPI = (window as any).electronAPI;

      // Coba load dari Electron API dulu
      if (electronAPI && electronAPI.getResourceBase64) {
        try {
          const base64Ttd = await electronAPI.getResourceBase64('ttdPakAli.png');
          if (base64Ttd && base64Ttd.startsWith('data:')) {
            return {
              signatureBase64: base64Ttd,
              signatureName: DEFAULT_SIGNATURE_NAME,
              signatureTitle: DEFAULT_SIGNATURE_TITLE,
            };
          }
        } catch (error) {
          // Continue to fallback
        }
      }

      // Fallback: coba load dari berbagai path (prioritaskan public folder)
      const ttdPaths = [
        '/ttdPakAli.png',           // Public folder (prioritas tertinggi)
        './ttdPakAli.png',          // Relative path
        '/data/ttdPakAli.png',      // Data folder
        './data/ttdPakAli.png',     // Data folder relative
        '../data/ttdPakAli.png',    // Data folder parent
        'data/ttdPakAli.png',       // Data folder direct
      ];

      for (const ttdPath of ttdPaths) {
        try {
          const response = await fetch(ttdPath, {
            method: 'GET',
            cache: 'no-cache',
          });

          if (response.ok) {
            const blob = await response.blob();
            if (blob.type.startsWith('image/')) {
              const base64Ttd = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                  const result = reader.result as string;
                  if (result && result.startsWith('data:')) {
                    resolve(result);
                  } else {
                    reject(new Error('Invalid base64 result'));
                  }
                };
                reader.onerror = () => reject(new Error('FileReader error'));
                reader.readAsDataURL(blob);
              });

              return {
                signatureBase64: base64Ttd,
                signatureName: DEFAULT_SIGNATURE_NAME,
                signatureTitle: DEFAULT_SIGNATURE_TITLE,
              };
            }
          }
        } catch (error) {
          // Continue to next path
          continue;
        }
      }
    } catch (error) {
      // Silent fail
    }

    return null;
  };

  // Auto-generate quotation no dan load default signature saat dialog dibuka
  useEffect(() => {
    if (showQuotationFormDialog && !editingQuotation) {
      const autoNo = generateQuotationNo(quotations);
      setQuotationFormData(prev => ({ ...prev, soNo: autoNo }));

      // Load default signature jika belum ada
      loadDefaultSignature().then(defaultSig => {
        if (defaultSig) {
          setQuotationFormData(prev => ({
            ...prev,
            signatureBase64: prev.signatureBase64 || defaultSig.signatureBase64,
            signatureName: prev.signatureName || defaultSig.signatureName,
            signatureTitle: prev.signatureTitle || defaultSig.signatureTitle,
          }));
        }
      });
    } else if (!showQuotationFormDialog) {
      // Reset form saat dialog ditutup
      setQuotationFormData({
        soNo: '',
        customer: '',
        customerKode: '',
        paymentTerms: 'TOP',
        topDays: 30,
        items: [],
        globalSpecNote: '',
        category: 'packaging',
        discountPercent: 0,
        signatureBase64: '',
        signatureName: '',
        signatureTitle: '',
      });
      setEditingQuotation(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showQuotationFormDialog, editingQuotation]);

  useEffect(() => {
    if (showForm) {
      // CLEAR FOCUS AGRESIF dari semua input di luar dialog sebelum buka dialog
      const clearAllFocus = () => {
        // Clear activeElement
        if (document.activeElement && document.activeElement instanceof HTMLElement) {
          const activeEl = document.activeElement;
          if (!activeEl.closest('.dialog-card') && !activeEl.closest('.dialog-overlay')) {
            activeEl.blur();
          }
        }

        // Clear focus dari semua input/textarea/select di luar dialog
        const allInputs = document.querySelectorAll('input, textarea, select, [contenteditable="true"]');
        allInputs.forEach((input: Element) => {
          if (input instanceof HTMLElement) {
            if (!input.closest('.dialog-card') && !input.closest('.dialog-overlay')) {
              if (document.activeElement === input) {
                input.blur();
              }
            }
          }
        });
      };

      // Clear focus multiple times
      clearAllFocus();
      setTimeout(clearAllFocus, 50);
      setTimeout(clearAllFocus, 100);

      focusAppWindow();

      // REMOVE event listener global saat dialog terbuka (double check)
      if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
        (window as any).setDialogOpen(true);
      }

      // Enable semua input di dalam dialog
      const enableDialogInputs = () => {
        const dialogInputs = document.querySelectorAll('.dialog-card input, .dialog-card textarea, .dialog-card select');
        dialogInputs.forEach((input: Element) => {
          if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement) {
            input.removeAttribute('readonly');
            input.removeAttribute('disabled');
            (input as any).readOnly = false;
            (input as any).disabled = false;
          }
        });
      };

      // Enable inputs multiple times
      enableDialogInputs();
      const enableInterval = setInterval(enableDialogInputs, 200);

      // Force focus ke input pertama setelah dialog dibuka dengan delay untuk memastikan focus sudah clear
      setTimeout(() => {
        // Triple check - clear focus lagi
        clearAllFocus();

        // Enable inputs lagi
        enableDialogInputs();

        const firstInput = document.querySelector('.dialog-card input[type="text"], .dialog-card input[type="number"]') as HTMLInputElement;
        if (firstInput) {
          // Enable input dulu
          firstInput.removeAttribute('readonly');
          firstInput.removeAttribute('disabled');
          (firstInput as any).readOnly = false;
          (firstInput as any).disabled = false;

          // Clear focus dulu, baru focus
          firstInput.blur();
          setTimeout(() => {
            firstInput.focus();
            firstInput.click();
          }, 50);
        }
      }, 300);

      return () => {
        clearInterval(enableInterval);

        // ADD kembali event listener global saat dialog ditutup
        if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
          (window as any).setDialogOpen(false);
        }

        // Clear focus saat dialog ditutup
        if (document.activeElement && document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      };
    } else {
      // ADD kembali event listener global saat dialog ditutup
      if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
        (window as any).setDialogOpen(false);
      }

      // Clear focus saat dialog ditutup
      if (document.activeElement && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  }, [showForm, formKey]);

  // Handle hidden popup - clear saat user klik atau tekan tab
  useEffect(() => {
    if (!showHiddenPopup) return;

    const handleClick = () => {
      // Clear popup saat user klik di mana saja
      setShowHiddenPopup(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Clear popup saat user tekan Tab atau Escape
      if (e.key === 'Tab' || e.key === 'Escape') {
        setShowHiddenPopup(false);
      }
    };

    // Delay sedikit untuk memastikan popup sudah render dan trigger focus
    const timeout = setTimeout(() => {
      // Auto clear setelah 100ms untuk memastikan re-render sudah terjadi
      setTimeout(() => {
        setShowHiddenPopup(false);
      }, 100);
    }, 10);

    // Add event listeners
    document.addEventListener('click', handleClick, { once: true, capture: true });
    document.addEventListener('keydown', handleKeyDown, { once: true, capture: true });

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('click', handleClick, { capture: true });
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [showHiddenPopup]);

  const loadOrders = async () => {
    const data = await storageService.get<SalesOrder[]>('salesOrders') || [];
    // ENHANCED: Filter out deleted items for display (but keep them in storage for tombstone)
    const activeOrders = filterActiveItems(data);

    // Load products to update padCode (don't rely on state)
    const currentProducts = await storageService.get<Product[]>('products') || [];

    // Update padCode from master product for all items and ensure all items have IDs
    const ordersWithUpdatedPadCode = activeOrders.map(order => {
      if (!order.items || order.items.length === 0) return order;

      const updatedItems = order.items.map((item, idx) => {
        // Ensure item has a unique ID
        const itemWithId = {
          ...item,
          id: item.id || `${order.id}-item-${idx}-${Date.now()}`
        };

        if (item.productId || item.productKode) {
          const productId = item.productId || item.productKode;
          const masterProduct = currentProducts.find(p =>
            (p.product_id || p.kode) === productId
          );
          if (masterProduct && masterProduct.padCode) {
            return { ...itemWithId, padCode: masterProduct.padCode };
          } else if (!item.padCode) {
            return { ...itemWithId, padCode: '' };
          }
        }
        return itemWithId;
      });

      return { ...order, items: updatedItems };
    });

    setOrders(ordersWithUpdatedPadCode);

  };

  const loadQuotations = async () => {
    const dataRaw = await storageService.get<SalesOrder[]>('quotations') || [];

    // CRITICAL: Extract arrays from storage wrapper if needed
    const extractArray = (data: any): SalesOrder[] => {
      if (!data) return [];
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object' && 'value' in data && Array.isArray(data.value)) {
        return data.value;
      }
      return [];
    };

    const data = extractArray(dataRaw);

    // CRITICAL: Filter deleted items using helper function
    const activeQuotations = filterActiveItems(data);

    setQuotations(activeQuotations);
  };

  const getProductInputDisplayValue = (index: number, item?: SOItem) => {
    if (productInputValue[index] !== undefined) {
      return productInputValue[index];
    }
    if (item?.productName) {
      return item.productKode ? `${item.productKode} - ${item.productName}` : item.productName;
    }
    return '';
  };

  const loadCustomers = async () => {
    const dataRaw = await storageService.get<Customer[]>('customers') || [];

    // CRITICAL: Extract arrays from storage wrapper if needed
    const extractArray = (data: any): Customer[] => {
      if (!data) return [];
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object' && 'value' in data && Array.isArray(data.value)) {
        return data.value;
      }
      return [];
    };

    const data = extractArray(dataRaw);

    // CRITICAL: Filter deleted items using helper function
    const activeCustomers = filterActiveItems(data);
    setCustomers(activeCustomers);
  };

  const loadMaterials = async () => {
    const dataRaw = await storageService.get<Material[]>('materials') || [];

    // CRITICAL: Extract arrays from storage wrapper if needed
    const extractArray = (data: any): Material[] => {
      if (!data) return [];
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object' && 'value' in data && Array.isArray(data.value)) {
        return data.value;
      }
      return [];
    };

    const data = extractArray(dataRaw);

    // CRITICAL: Filter deleted items using helper function
    const activeMaterials = filterActiveItems(data);
    setMaterials(activeMaterials);
  };

  const loadDeliveries = async () => {
    const data = await storageService.get<any[]>('delivery') || [];
    setDeliveries(data);
  };

  const loadBOM = async () => {
    const dataRaw = await storageService.get<any[]>('bom') || [];

    console.log('[SalesOrders] 🔄 Loading BOM data...');
    console.log('[SalesOrders] 📊 BOM raw data:', {
      rawLength: dataRaw ? (Array.isArray(dataRaw) ? dataRaw.length : Object.keys(dataRaw).length) : 0,
      isArray: Array.isArray(dataRaw),
      hasValue: dataRaw && typeof dataRaw === 'object' && 'value' in dataRaw
    });

    // CRITICAL: Extract arrays from storage wrapper if needed
    const extractArray = (data: any): any[] => {
      if (!data) return [];
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object' && 'value' in data && Array.isArray(data.value)) {
        return data.value;
      }
      return [];
    };

    const data = extractArray(dataRaw);

    console.log('[SalesOrders] 📊 BOM extracted data:', {
      extractedLength: data.length,
      sample: data.slice(0, 3)
    });

    // CRITICAL: Filter deleted items using helper function
    const activeBOM = filterActiveItems(data);
    setBomData(activeBOM);

    console.log('[SalesOrders] 💾 BOM data set:', {
      activeLength: activeBOM.length,
      sampleIds: activeBOM.slice(0, 5).map(b => b.product_id)
    });
  };


  // Filtered customers for autocomplete
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    const query = customerSearch.toLowerCase();
    return customers
      .filter(c =>
        c.nama.toLowerCase().includes(query) ||
        c.kode.toLowerCase().includes(query)
      );
  }, [customerSearch, customers]);

  // Filtered customers for dialog
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

  // Optimized BOM lookup - create Set for O(1) lookup
  const bomProductIds = useMemo(() => {
    const ids = new Set<string>();
    bomData.forEach(b => {
      const bomProductId = String(b.product_id || b.kode || '').trim().toLowerCase();
      if (bomProductId) {
        ids.add(bomProductId);
        // Cross-reference: Tambahkan juga kode/kodeIpos/product_id/padCode dari produk yang match
        const matchingProduct = products.find(p => {
          if (!p) return false;
          const pKode = String(p.kode || '').trim().toLowerCase();
          const pKodeIpos = String(p.kodeIpos || '').trim().toLowerCase();
          const pProductId = String(p.product_id || '').trim().toLowerCase();
          const pPadCode = String(p.padCode || '').trim().toLowerCase();

          return (pKode && pKode === bomProductId) ||
            (pKodeIpos && pKodeIpos === bomProductId) ||
            (pProductId && pProductId === bomProductId) ||
            (pPadCode && pPadCode === bomProductId);
        });

        if (matchingProduct) {
          const pKode = String(matchingProduct.kode || '').trim().toLowerCase();
          const pKodeIpos = String(matchingProduct.kodeIpos || '').trim().toLowerCase();
          const pProductId = String(matchingProduct.product_id || '').trim().toLowerCase();
          const pPadCode = String(matchingProduct.padCode || '').trim().toLowerCase();

          if (pKode) ids.add(pKode);
          if (pKodeIpos) ids.add(pKodeIpos);
          if (pProductId) ids.add(pProductId);
          if (pPadCode) ids.add(pPadCode);
        }
      }
    });

    console.log('[SalesOrders] ✅ bomProductIds created:', {
      size: ids.size,
      bomDataLength: bomData.length,
      bomDataSample: bomData.slice(0, 3),
      ids: Array.from(ids).slice(0, 10)
    });
    return ids;
  }, [bomData, products]);

  // TODO: Use this function to show BOM indicator in product lists
  // Check if product has BOM (optimized)
  const hasBOM = (product: Product): boolean => {
    const productId = (product.product_id || product.kode || '').toString().trim();
    const result = bomProductIds.has(productId.toLowerCase());

    // Debug log untuk products dengan BOM yang mungkin
    if (product.kode === 'KRT04173' || product.kode === 'KRT04072' || product.kode === '321') {
      console.log('[SalesOrders] 🔍 hasBOM check:', {
        productName: product.nama,
        productKode: product.kode,
        productProductId: product.product_id,
        checkingId: productId,
        checkingIdLower: productId.toLowerCase(),
        bomSetSize: bomProductIds.size,
        bomSetIds: Array.from(bomProductIds).slice(0, 10),
        hasBOM: result
      });
    }

    return result;
  };

  // Filtered customers for quotation autocomplete
  const filteredQuotationCustomers = useMemo(() => {
    // CRITICAL: Ensure customers is always an array
    const customersArray = Array.isArray(customers) ? customers : [];

    if (!quotationCustomerSearch) return customersArray;
    const query = quotationCustomerSearch.toLowerCase();
    return customersArray
      .filter(c => {
        if (!c) return false;
        return c.nama.toLowerCase().includes(query) ||
          c.kode.toLowerCase().includes(query);
      });
  }, [quotationCustomerSearch, customers]);

  // Filtered products for quotation autocomplete
  const getQuotationProductInputDisplayValue = (index: number, item?: SOItem) => {
    if (quotationProductSearch[index] !== undefined && quotationProductSearch[index] !== '') {
      return quotationProductSearch[index];
    }
    if (item?.productName) {
      return item.productKode ? `${item.productKode} - ${item.productName}` : item.productName;
    }
    return '';
  };

  // TODO: Remove this - replaced with getFilteredQuotationProducts
  /*
  const filteredProductsForQuotationDialog = useMemo(() => {
    let filtered = products;
    if (quotationProductDialogSearch) {
      const query = quotationProductDialogSearch.toLowerCase();
      filtered = products.filter(p => {
        const code = (p.kode || p.product_id || '').toLowerCase();
        const name = (p.nama || '').toLowerCase();
        const label = `${code}${code ? ' - ' : ''}${name}`.toLowerCase();
        return code.includes(query) || name.includes(query) || label.includes(query);
      });
    }
    // Limit to 200 items for performance (user can search to narrow down)
    return filtered.slice(0, 200);
  }, [quotationProductDialogSearch, products]);
  */

  const getFilteredQuotationProducts = useMemo(() => {
    return (lineIndex: number) => {
      // CRITICAL: Ensure products is always an array
      const productsArray = Array.isArray(products) ? products : [];

      // CRITICAL: Gunakan quotationProductDialogSearch untuk filter di dialog
      // Jika dialog terbuka, gunakan search dari dialog, jika tidak gunakan dari autocomplete
      const search = showQuotationProductDialog !== null
        ? quotationProductDialogSearch
        : (quotationProductSearch && quotationProductSearch[lineIndex]) || '';

      if (!search) {
        // Limit to 200 items for performance jika tidak ada search
        return productsArray.slice(0, 200);
      }

      const query = search.toLowerCase();
      const filtered = productsArray
        .filter(p => {
          if (!p) return false;
          const code = (p.kode || p.product_id || '').toLowerCase();
          const name = (p.nama || '').toLowerCase();
          const productId = (p.product_id || '').toLowerCase();
          const customer = (p.customer || '').toLowerCase();
          const label = `${code}${code ? ' - ' : ''}${name}`.toLowerCase();

          return code.includes(query) ||
            name.includes(query) ||
            productId.includes(query) ||
            customer.includes(query) ||
            label.includes(query);
        });

      // Limit to 200 items for performance (user can search to narrow down)
      return filtered.slice(0, 200);
    };
  }, [quotationProductSearch, quotationProductDialogSearch, showQuotationProductDialog, products]);

  // Add item line
  const handleAddItem = () => {
    const newItem: SOItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      productId: '',
      productKode: '',
      productName: '',
      qty: 0,
      unit: 'PCS',
      price: 0,
      total: 0,
      specNote: '',
      padCode: '',
      inventoryQty: 0,
    };
    setFormData(prev => {
      const nextIndex = (prev.items || []).length;
      setProductInputValue(prevInputs => ({ ...prevInputs, [nextIndex]: '' }));
      return {
        ...prev,
        items: [...(prev.items || []), newItem],
      };
    });
  };

  // Remove item line
  const handleRemoveItem = (index: number) => {
    const newItems = (formData.items || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, items: newItems }));
    setProductInputValue(prevInputs => {
      const updated = { ...prevInputs };
      delete updated[index];
      // Reindex remaining items
      const reindexed: { [key: number]: string } = {};
      newItems.forEach((_, idx) => {
        if (updated[idx] !== undefined) {
          reindexed[idx] = updated[idx];
        } else if (updated[idx + 1] !== undefined) {
          reindexed[idx] = updated[idx + 1];
        }
      });
      return reindexed;
    });
    setProductSearch(prev => {
      const updated = { ...prev };
      delete updated[index];
      // Reindex remaining items
      const reindexed: { [key: number]: string } = {};
      newItems.forEach((_, idx) => {
        if (updated[idx] !== undefined) {
          reindexed[idx] = updated[idx];
        } else if (updated[idx + 1] !== undefined) {
          reindexed[idx] = updated[idx + 1];
        }
      });
      return reindexed;
    });
    if (showProductDialog === index) {
      setShowProductDialog(null);
      setProductDialogSearch('');
    }
    setQtyInputValue(prevInputs => {
      const updated = { ...prevInputs };
      delete updated[index];
      // Reindex remaining items
      const reindexed: { [key: number]: string } = {};
      newItems.forEach((_, idx) => {
        if (updated[idx] !== undefined) {
          reindexed[idx] = updated[idx];
        } else if (updated[idx + 1] !== undefined) {
          reindexed[idx] = updated[idx + 1];
        }
      });
      return reindexed;
    });
    setPriceInputValue(prevInputs => {
      const updated = { ...prevInputs };
      delete updated[index];
      // Reindex remaining items
      const reindexed: { [key: number]: string } = {};
      newItems.forEach((_, idx) => {
        if (updated[idx] !== undefined) {
          reindexed[idx] = updated[idx];
        } else if (updated[idx + 1] !== undefined) {
          reindexed[idx] = updated[idx + 1];
        }
      });
      return reindexed;
    });
  };

  // Update item
  const handleUpdateItem = (index: number, field: keyof SOItem, value: any) => {
    const newItems = [...(formData.items || [])];
    const item = { ...newItems[index] };

    if (field === 'productId' || field === 'productKode' || field === 'productName') {
      if (!value) {
        item.productId = '';
        item.productKode = '';
        item.productName = '';
        item.unit = 'PCS';
        item.price = 0;
        item.total = 0;
        item.bom = [];
        setProductInputValue(prev => ({ ...prev, [index]: '' }));
      } else {
        const product = products.find(p => {
          if (!p) return false;
          const pId = String(p.product_id || p.kode || p.id || '').trim();
          const pName = String(p.nama || '').trim();
          const pIdOnly = String(p.id || '').trim();
          const pKodeIpos = String(p.kodeIpos || '').trim();
          const pPadCode = String(p.padCode || '').trim();
          const searchValue = String(value || '').trim();
          const searchValueLower = searchValue.toLowerCase();

          // Match by product_id/kode/id, or by name, or by id field
          // CRITICAL: Juga match jika kodeIpos produk ini sama dengan kode produk lain (cross-reference)
          return (pId && (pId === searchValue || pId.toLowerCase() === searchValueLower)) ||
            (pKodeIpos && (pKodeIpos === searchValue || pKodeIpos.toLowerCase() === searchValueLower)) ||
            (pPadCode && (pPadCode === searchValue || pPadCode.toLowerCase() === searchValueLower)) ||
            (pName && pName.toLowerCase() === searchValueLower) ||
            (pIdOnly && pIdOnly === searchValue) ||
            // Cross-reference: Jika kodeIpos produk ini sama dengan searchValue, atau sebaliknya
            (pKodeIpos && products.some(otherP => {
              const otherKode = String(otherP.kode || '').trim().toLowerCase();
              return otherKode === searchValueLower && otherKode === pKodeIpos.toLowerCase();
            })) ||
            (pId && products.some(otherP => {
              const otherKodeIpos = String(otherP.kodeIpos || '').trim().toLowerCase();
              return otherKodeIpos === searchValueLower && otherKodeIpos === pId.toLowerCase();
            }));
        });
        if (product) {
          // Gunakan product_id atau kode, jika keduanya kosong gunakan id sebagai fallback
          const productIdValue = String(product.product_id || product.kode || product.id || '').trim();
          // Jika masih kosong, gunakan nama sebagai last resort (untuk validasi)
          if (!productIdValue && product.nama) {
            item.productId = product.nama;
            item.productKode = product.nama;
          } else {
            item.productId = productIdValue;
            item.productKode = productIdValue;
          }
          item.productName = product.nama || '';
          item.unit = product.satuan || 'PCS';
          const hargaFromMaster = product.hargaSales || product.hargaFg || (product as any).harga || 0;
          item.price = Number(hargaFromMaster) || 0;
          item.total = (item.qty || 0) * item.price;
          // Auto-fill padCode dari master product
          item.padCode = product.padCode || '';

          // Load BOM dengan matching yang konsisten
          // Pastikan selalu set BOM, meskipun kosong
          const bomDataArray = Array.isArray(bomData) ? bomData : [];
          const productBOM = bomDataArray.filter(b => {
            if (!b) return false;
            const bomProductId = String(b.product_id || b.kode || '').trim().toLowerCase();
            const itemProductId = String(item.productId || '').trim().toLowerCase();

            // Direct match
            if (bomProductId && itemProductId && bomProductId === itemProductId) {
              return true;
            }

            // Cross-reference: Cari produk yang punya kode/kodeIpos/product_id/padCode sama dengan bomProductId
            const matchingProduct = products.find(p => {
              if (!p) return false;
              const pKode = String(p.kode || '').trim().toLowerCase();
              const pKodeIpos = String(p.kodeIpos || '').trim().toLowerCase();
              const pProductId = String(p.product_id || '').trim().toLowerCase();
              const pPadCode = String(p.padCode || '').trim().toLowerCase();

              return (pKode && pKode === bomProductId) ||
                (pKodeIpos && pKodeIpos === bomProductId) ||
                (pProductId && pProductId === bomProductId) ||
                (pPadCode && pPadCode === bomProductId);
            });

            // Jika ada produk yang match dengan bomProductId, cek apakah produk itu match dengan itemProductId
            if (matchingProduct) {
              const pKode = String(matchingProduct.kode || '').trim().toLowerCase();
              const pKodeIpos = String(matchingProduct.kodeIpos || '').trim().toLowerCase();
              const pProductId = String(matchingProduct.product_id || '').trim().toLowerCase();
              const pPadCode = String(matchingProduct.padCode || '').trim().toLowerCase();

              return (pKode && pKode === itemProductId) ||
                (pKodeIpos && pKodeIpos === itemProductId) ||
                (pProductId && pProductId === itemProductId) ||
                (pPadCode && pPadCode === itemProductId);
            }

            return false;
          }).map(bom => {
            const bomMaterialId = String(bom.material_id || '').trim();
            const materialsArray = Array.isArray(materials) ? materials : [];
            const material = materialsArray.find(m => {
              const mId = String(m.material_id || m.kode || '').trim();
              return mId === bomMaterialId && mId !== '';
            });
            return {
              materialName: (material?.nama || bom.material_id || bomMaterialId || '').toString(),
              materialId: bomMaterialId,
              unit: material?.satuan || 'PCS',
              qty: (item.qty || 0) * (bom.ratio || 1),
              ratio: bom.ratio || 1,
              pricePerUnit: material?.priceMtr || material?.harga || 0,
            };
          });
          // Selalu set BOM, meskipun array kosong (untuk product tanpa BOM)
          item.bom = productBOM || [];
          const label = `${product.product_id || product.kode || product.id || ''}${(product.product_id || product.kode || product.id) ? ' - ' : ''}${product.nama || ''}`;
          setProductInputValue(prev => ({ ...prev, [index]: label.trim() }));
        } else {
          // Convert ke string untuk konsistensi
          const productIdValue = String(value || '').trim();
          // Hanya set jika value tidak kosong
          if (productIdValue) {
            item.productId = productIdValue;
            item.productKode = productIdValue;
            item.productName = String(value || '');
          }
          // Set BOM kosong untuk product yang tidak ditemukan
          item.bom = [];
          setProductInputValue(prev => ({ ...prev, [index]: value || '' }));
        }
      }
      newItems[index] = item;
      setFormData(prev => ({ ...prev, items: newItems }));
      return;
    } else if (field === 'qty') {
      // Convert ke number - jangan biarkan string kosong
      if (value === '' || value === null || value === undefined) {
        item.qty = 0;
      } else {
        const numValue = Number(value);
        item.qty = isNaN(numValue) ? 0 : numValue;
      }
      const qtyNum = item.qty || 0;
      const priceNum = typeof item.price === 'string' ? 0 : (item.price || 0);
      item.total = qtyNum * priceNum;
      // Update BOM qty
      if (item.bom) {
        item.bom = item.bom.map(b => ({
          ...b,
          qty: qtyNum * b.ratio,
        }));
      }
    } else if (field === 'price') {
      // Convert ke number - jangan biarkan string kosong
      if (value === '' || value === null || value === undefined) {
        item.price = 0;
      } else {
        const numValue = Number(value);
        item.price = isNaN(numValue) ? 0 : numValue;
      }
      const qtyNum = item.qty || 0;
      const priceNum = item.price || 0;
      item.total = qtyNum * priceNum;
    } else {
      (item as any)[field] = value;
    }

    // CRITICAL: Ensure item always has a unique ID before saving
    if (!item.id) {
      item.id = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    newItems[index] = item;
    // Force state update dengan spread operator baru
    setFormData(prev => ({ ...prev, items: [...newItems] }));
  };

  // TODO: Implement product input change handler in form
  const handleProductInputChange = (index: number, text: string) => {
    setProductInputValue(prev => ({ ...prev, [index]: text }));
    if (!text) {
      handleUpdateItem(index, 'productId', '');
      return;
    }
    const normalized = text.toLowerCase();
    const matchedProduct = products.find(prod => {
      const label = `${prod.product_id || prod.kode || ''}${prod.product_id || prod.kode ? ' - ' : ''}${prod.nama || ''}`.toLowerCase();
      const code = (prod.product_id || prod.kode || '').toLowerCase();
      const kodeIpos = (prod.kodeIpos || '').toLowerCase();
      const padCode = (prod.padCode || '').toLowerCase();
      const name = (prod.nama || '').toLowerCase();

      // Direct match
      if (label === normalized || code === normalized || kodeIpos === normalized || padCode === normalized || name === normalized) {
        return true;
      }

      // Cross-reference: Jika kodeIpos produk ini sama dengan kode produk lain yang match dengan search
      if (kodeIpos && products.some(otherP => {
        const otherKode = (otherP.kode || otherP.product_id || '').toLowerCase();
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
      // Convert ke string untuk konsistensi
      const productIdValue = String(matchedProduct.product_id || matchedProduct.kode || '').trim();
      handleUpdateItem(index, 'productId', productIdValue);
    } else {
      handleUpdateItem(index, 'productName', text);
    }
  };

  // Generate Quotation No dengan format: 00001/QUO/TLJP/XII/2025
  const generateQuotationNo = (existingQuotations: SalesOrder[]): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12

    // Konversi bulan ke romawi
    const romanMonths: { [key: number]: string } = {
      1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI',
      7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII'
    };
    const monthRoman = romanMonths[month] || 'I';

    // Filter quotations di bulan dan tahun yang sama
    const sameMonthYearQuotations = existingQuotations.filter(q => {
      if (!q.created) return false;
      const qDate = new Date(q.created);
      return qDate.getFullYear() === year && qDate.getMonth() + 1 === month;
    });

    // Extract nomor urut dari quotations yang sudah ada untuk menghindari duplikat
    const pattern = /^(\d{5})\/QUO\/TLJP\//;
    const existingNumbers = sameMonthYearQuotations
      .map(q => {
        const match = q.soNo.match(pattern);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => n > 0);

    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    const paddedNumber = String(nextNumber).padStart(5, '0');

    return `${paddedNumber}/QUO/TLJP/${monthRoman}/${year}`;
  };

  // Quotation form handlers
  const handleQuotationAddItem = () => {
    const newItem: SOItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      productId: '',
      productKode: '',
      productName: '',
      qty: 0,
      unit: 'PCS',
      price: 0,
      total: 0,
      specNote: '',
      discountPercent: 0,
    };
    setQuotationFormData({
      ...quotationFormData,
      items: [...(quotationFormData.items || []), newItem],
    });
    setQuotationProductSearch({ ...quotationProductSearch, [(quotationFormData.items || []).length]: '' });
  };

  const handleQuotationRemoveItem = (index: number) => {
    const newItems = (quotationFormData.items || []).filter((_, i) => i !== index);
    setQuotationFormData({ ...quotationFormData, items: newItems });
    const newProductSearch = { ...quotationProductSearch };
    delete newProductSearch[index];
    const reindexed: { [key: number]: string } = {};
    newItems.forEach((_, i) => {
      if (newProductSearch[i + 1]) reindexed[i] = newProductSearch[i + 1];
    });
    setQuotationProductSearch(reindexed);
    // Reset input values untuk index yang dihapus
    setQuotationQtyInputValue(prev => {
      const newVal = { ...prev };
      delete newVal[index];
      // Shift index untuk items setelah yang dihapus
      const shifted: { [key: number]: string } = {};
      Object.keys(newVal).forEach(k => {
        const key = Number(k);
        if (key > index) {
          shifted[key - 1] = newVal[key];
        } else if (key < index) {
          shifted[key] = newVal[key];
        }
      });
      return shifted;
    });
    setQuotationPriceInputValue(prev => {
      const newVal = { ...prev };
      delete newVal[index];
      // Shift index untuk items setelah yang dihapus
      const shifted: { [key: number]: string } = {};
      Object.keys(newVal).forEach(k => {
        const key = Number(k);
        if (key > index) {
          shifted[key - 1] = newVal[key];
        } else if (key < index) {
          shifted[key] = newVal[key];
        }
      });
      return shifted;
    });
    setQuotationItemDiscountInputValue(prev => {
      const newVal = { ...prev };
      delete newVal[index];
      // Shift index untuk items setelah yang dihapus
      const shifted: { [key: number]: string } = {};
      Object.keys(newVal).forEach(k => {
        const key = Number(k);
        if (key > index) {
          shifted[key - 1] = newVal[key];
        } else if (key < index) {
          shifted[key] = newVal[key];
        }
      });
      return shifted;
    });
  };

  const handleQuotationUpdateItem = (index: number, field: keyof SOItem, value: any) => {
    setQuotationFormData(prev => {
      const newItems = [...(prev.items || [])];
      const item = { ...newItems[index] };

      if (field === 'productId' || field === 'productKode' || field === 'productName') {
        if (!value) {
          item.productId = '';
          item.productKode = '';
          item.productName = '';
          item.unit = 'PCS';
          item.price = 0;
          item.total = 0;
          setQuotationProductSearch(prevSearch => ({ ...prevSearch, [index]: '' }));
        } else {
          // Sama seperti handleUpdateItem di SO - improved matching
          const product = products.find(p => {
            if (!p) return false;
            const pId = String(p.product_id || p.kode || p.id || '').trim();
            const pName = String(p.nama || '').trim();
            const pIdOnly = String(p.id || '').trim();
            const searchValue = String(value || '').trim();
            // Match by product_id/kode/id, or by name, or by id field
            return (pId && (pId === searchValue || pId.toLowerCase() === searchValue.toLowerCase())) ||
              (pName && pName.toLowerCase() === searchValue.toLowerCase()) ||
              (pIdOnly && pIdOnly === searchValue);
          });
          if (product) {
            // Gunakan product_id atau kode, jika keduanya kosong gunakan id sebagai fallback
            const productIdValue = String(product.product_id || product.kode || product.id || '').trim();
            // Jika masih kosong, gunakan nama sebagai last resort (untuk validasi)
            if (!productIdValue && product.nama) {
              item.productId = product.nama;
              item.productKode = product.nama;
            } else {
              item.productId = productIdValue;
              item.productKode = productIdValue;
            }
            item.productName = product.nama || '';
            item.unit = product.satuan || 'PCS';
            const hargaFromMaster = product.hargaSales || product.hargaFg || (product as any).harga || 0;
            item.price = Number(hargaFromMaster) || 0;
            // Hitung total dengan discount per item
            const qtyNum = item.qty || 0;
            const priceNum = item.price || 0;
            const discountPercent = item.discountPercent || 0;
            const subtotal = qtyNum * priceNum;
            item.total = subtotal * (1 - discountPercent / 100);
            // Update quotationProductSearch untuk display - sama seperti SO
            const label = `${product.product_id || product.kode || product.id || ''}${(product.product_id || product.kode || product.id) ? ' - ' : ''}${product.nama || ''}`;
            setQuotationProductSearch(prevSearch => ({ ...prevSearch, [index]: label.trim() }));
          } else {
            // Convert ke string untuk konsistensi
            const productIdValue = String(value || '').trim();
            // Hanya set jika value tidak kosong
            if (productIdValue) {
              item.productId = productIdValue;
              item.productKode = productIdValue;
              item.productName = String(value || '');
            }
            // Set default values jika product tidak ditemukan
            item.unit = item.unit || 'PCS';
            item.price = item.price || 0;
            item.total = item.total || 0;
            setQuotationProductSearch(prevSearch => ({ ...prevSearch, [index]: '' }));
          }
        }
        newItems[index] = item;
        return { ...prev, items: newItems };
      } else if (field === 'qty') {
        // Biarkan string kosong tetap string kosong (akan di-handle di onBlur)
        if (value === '' || value === null || value === undefined) {
          item.qty = '' as any;
        } else {
          item.qty = Number(value) || 0;
        }
        // Hitung total dengan discount per item
        const qtyNum = item.qty || 0;
        const priceNum = item.price || 0;
        const discountPercent = item.discountPercent || 0;
        const subtotal = qtyNum * priceNum;
        item.total = subtotal * (1 - discountPercent / 100);
        newItems[index] = item;
        return { ...prev, items: newItems };
      } else if (field === 'price') {
        // Biarkan string kosong tetap string kosong (akan di-handle di onBlur)
        if (value === '' || value === null || value === undefined) {
          item.price = '' as any;
        } else {
          item.price = Number(value) || 0;
        }
        // Hitung total dengan discount per item
        const qtyNum = item.qty || 0;
        const priceNum = item.price || 0;
        const discountPercent = item.discountPercent || 0;
        const subtotal = qtyNum * priceNum;
        item.total = subtotal * (1 - discountPercent / 100);
        newItems[index] = item;
        return { ...prev, items: newItems };
      } else if (field === 'discountPercent') {
        // Update discount per item
        if (value === '' || value === null || value === undefined) {
          item.discountPercent = 0;
        } else {
          const discountNum = Number(value) || 0;
          item.discountPercent = Math.max(0, Math.min(100, discountNum)); // Clamp 0-100
        }
        // Recalculate total dengan discount
        const qtyNum = item.qty || 0;
        const priceNum = item.price || 0;
        const discountPercent = item.discountPercent || 0;
        const subtotal = qtyNum * priceNum;
        item.total = subtotal * (1 - discountPercent / 100);
        newItems[index] = item;
        return { ...prev, items: newItems };
      } else {
        (item as any)[field] = value;
        newItems[index] = item;
        return { ...prev, items: newItems };
      }
    });
  };

  const handleGenerateQuotationFromForm = async () => {
    if (!quotationFormData.customer) {
      showToast('Please select customer', 'error');
      return;
    }
    if (!quotationFormData.items || quotationFormData.items.length === 0) {
      showToast('Please add at least one product', 'error');
      return;
    }
    // Validate items: productId harus ada, qty harus > 0
    const invalidQuotationItems: Array<{ index: number; reason: string }> = [];
    quotationFormData.items.forEach((item, index) => {
      const productId = item.productId;
      const productIdEmpty = !productId || productId === '' || (typeof productId === 'string' && productId.trim() === '');
      const qtyNum = item.qty || 0;
      const qtyInvalid = qtyNum <= 0;

      if (productIdEmpty && qtyInvalid) {
        invalidQuotationItems.push({ index: index + 1, reason: `Item ${index + 1}: Product belum dipilih dan Qty harus > 0` });
      } else if (productIdEmpty) {
        invalidQuotationItems.push({ index: index + 1, reason: `Item ${index + 1}: Product belum dipilih` });
      } else if (qtyInvalid) {
        invalidQuotationItems.push({ index: index + 1, reason: `Item ${index + 1}: Qty harus > 0 (saat ini: ${qtyNum})` });
      }
    });

    if (invalidQuotationItems.length > 0) {
      const errorMsg = invalidQuotationItems.length === 1
        ? invalidQuotationItems[0].reason
        : `Terdapat ${invalidQuotationItems.length} item yang belum lengkap:\n${invalidQuotationItems.map(i => `- ${i.reason}`).join('\n')}`;
      showToast(errorMsg, 'error');
      return;
    }

    // Validasi: semua item harus ada di master products
    const invalidItems = quotationFormData.items.filter(item => {
      if (!item.productId) return false; // Skip jika kosong (sudah di-validasi di atas)
      const product = products.find(p =>
        (p.product_id || p.kode) === item.productId ||
        p.nama === item.productName
      );
      return !product;
    });

    if (invalidItems.length > 0) {
      const invalidNames = invalidItems.map(item => item.productName || item.productId).join(', ');
      showToast(`Item berikut tidak tersedia di master products: ${invalidNames}. Silakan hapus atau ganti dengan product yang valid.`, 'error');
      return;
    }

    try {
      const quotationsArray = Array.isArray(quotations) ? quotations : [];

      if (editingQuotation) {
        // Update existing quotation
        const updated = quotationsArray.map(q =>
          q.id === editingQuotation.id
            ? {
              ...q,
              customer: quotationFormData.customer || '',
              customerKode: quotationFormData.customerKode || '',
              paymentTerms: quotationFormData.paymentTerms || 'TOP',
              topDays: quotationFormData.topDays,
              items: quotationFormData.items || [],
              globalSpecNote: quotationFormData.globalSpecNote,
              category: 'packaging' as const,
              discountPercent: quotationFormData.discountPercent || 0,
              signatureBase64: quotationFormData.signatureBase64,
              signatureName: quotationFormData.signatureName,
              signatureTitle: quotationFormData.signatureTitle,
            }
            : q
        );
        await storageService.set(StorageKeys.PACKAGING.QUOTATIONS, updated);
        setQuotations(updated);
        showToast(`Quotation ${editingQuotation.soNo} updated successfully`, 'success');
      } else {
        // Create new quotation - selalu auto generate quotation no dengan format baru
        const quotationNo = generateQuotationNo(quotations);

        // CRITICAL: Load default signature jika user tidak isi
        let finalSignatureBase64 = quotationFormData.signatureBase64 || '';
        let finalSignatureName = quotationFormData.signatureName || '';
        let finalSignatureTitle = quotationFormData.signatureTitle || '';

        if (!finalSignatureBase64 || !finalSignatureName) {
          const defaultSig = await loadDefaultSignature();
          if (defaultSig) {
            finalSignatureBase64 = finalSignatureBase64 || defaultSig.signatureBase64;
            finalSignatureName = finalSignatureName || defaultSig.signatureName;
            finalSignatureTitle = finalSignatureTitle || defaultSig.signatureTitle;
          }
        }

        // Generate quotation data
        const quotationData: SalesOrder = {
          id: Date.now().toString(),
          soNo: quotationNo,
          customer: quotationFormData.customer || '',
          customerKode: quotationFormData.customerKode || '',
          paymentTerms: quotationFormData.paymentTerms || 'TOP',
          topDays: quotationFormData.topDays,
          status: 'OPEN', // Quotation langsung OPEN saat dibuat
          created: new Date().toISOString(),
          items: quotationFormData.items || [],
          globalSpecNote: quotationFormData.globalSpecNote,
          category: 'packaging',
          discountPercent: quotationFormData.discountPercent || 0,
          signatureBase64: finalSignatureBase64,
          signatureName: finalSignatureName,
          signatureTitle: finalSignatureTitle,
        };

        // Check duplicate quotation no
        const existingQuotation = quotationsArray.find(q => q.soNo.trim().toUpperCase() === quotationNo.trim().toUpperCase());
        if (existingQuotation) {
          showToast(`Quotation No "${quotationNo}" sudah ada! Gunakan nomor yang berbeda.`, 'error');
          return;
        }

        // Save to quotations storage (terpisah dari SO)
        const updated = [...quotationsArray, quotationData];
        await storageService.set(StorageKeys.PACKAGING.QUOTATIONS, updated);
        setQuotations(updated);
        showToast(`Quotation ${quotationNo} created successfully`, 'success');
      }

      // Reset form dan tutup dialog
      setQuotationFormData({
        soNo: '',
        customer: '',
        customerKode: '',
        paymentTerms: 'TOP',
        topDays: 30,
        items: [],
        globalSpecNote: '',
        category: 'packaging',
        discountPercent: 0,
        signatureBase64: '',
        signatureName: '',
        signatureTitle: '',
      });
      setEditingQuotation(null);
      setQuotationCustomerSearch('');
      setQuotationProductSearch({});
      setQuotationQtyInputValue({});
      setQuotationPriceInputValue({});
      setQuotationItemDiscountInputValue({});
      setQuotationDiscountInputValue('');
      setShowQuotationFormDialog(false);
    } catch (error) {
      showToast('Failed to save quotation. Please try again.', 'error');
    }
  };

  // Generate BOM Preview (Aggregate)
  const generateBOMPreview = () => {
    const aggregatedBOM: { [key: string]: any } = {};

    (formData.items || []).forEach(item => {
      if (item.bom) {
        item.bom.forEach(bomItem => {
          const key = bomItem.materialId;
          if (aggregatedBOM[key]) {
            aggregatedBOM[key].qty += bomItem.qty;
            aggregatedBOM[key].totalPrice = aggregatedBOM[key].qty * (bomItem.pricePerUnit || 0);
          } else {
            aggregatedBOM[key] = {
              materialId: bomItem.materialId,
              materialName: bomItem.materialName,
              unit: bomItem.unit,
              qty: bomItem.qty,
              ratio: bomItem.ratio,
              pricePerUnit: bomItem.pricePerUnit || 0,
              totalPrice: bomItem.qty * (bomItem.pricePerUnit || 0),
            };
          }
        });
      }
    });

    return Object.values(aggregatedBOM);
  };

  // Handle Create
  const handleCreate = () => {
    setEditingOrder(null);
    setFormData({
      soNo: '',
      customer: '',
      customerKode: '',
      paymentTerms: 'TOP',
      topDays: 30,
      items: [],
      globalSpecNote: '',
      category: 'packaging',
      created: new Date().toISOString(),
    });
    setCustomerSearch('');
    setShowForm(true);
    setFormKey(prev => prev + 1); // Force re-render input fields
    setProductInputValue({});
    setProductSearch({});
    setShowProductDialog(null);
    setProductDialogSearch('');
  };

  // Handle Save
  const handleSave = async () => {
    if (!formData.soNo || !formData.soNo.trim()) {
      showToast('SO No wajib diisi! Masukkan nomor PO dari customer.', 'error');
      return;
    }
    if (!formData.customer) {
      showToast('Please select customer', 'error');
      return;
    }
    if (!formData.items || formData.items.length === 0) {
      showToast('Please add at least one product', 'error');
      return;
    }
    // Validate items: productId harus ada, qty harus > 0
    const invalidItems: Array<{ index: number; reason: string }> = [];
    formData.items.forEach((item, index) => {
      // Check productId - harus ada dan tidak kosong (bisa string atau number, termasuk 0)
      const productId = item.productId;
      const productIdEmpty = productId === undefined || productId === null || productId === '' || (typeof productId === 'string' && productId.trim() === '');
      // Handle qty - sekarang selalu number
      const qtyNum = item.qty || 0;
      const qtyInvalid = qtyNum <= 0;

      if (productIdEmpty && qtyInvalid) {
        invalidItems.push({ index: index + 1, reason: `Item ${index + 1}: Product belum dipilih dan Qty harus > 0` });
      } else if (productIdEmpty) {
        invalidItems.push({ index: index + 1, reason: `Item ${index + 1}: Product belum dipilih` });
      } else if (qtyInvalid) {
        invalidItems.push({ index: index + 1, reason: `Item ${index + 1}: Qty harus > 0 (saat ini: ${qtyNum})` });
      }
    });

    if (invalidItems.length > 0) {
      const errorMsg = invalidItems.length === 1
        ? invalidItems[0].reason
        : `Terdapat ${invalidItems.length} item yang belum lengkap:\n${invalidItems.map(i => `- ${i.reason}`).join('\n')}`;
      showToast(errorMsg, 'error');
      return;
    }

    try {
      // Check duplicate SO No (only for new orders)
      if (!editingOrder) {
        const ordersArray = Array.isArray(orders) ? orders : [];
        const existingSO = ordersArray.find(o => o.soNo.trim().toUpperCase() === formData.soNo?.trim().toUpperCase());
        if (existingSO) {
          showToast(`SO No "${formData.soNo}" sudah ada! Gunakan nomor PO customer yang berbeda.`, 'error');
          return;
        }
      }

      // Generate BOM snapshot
      const bomSnapshot = generateBOMPreview();

      // Update master product jika padCode di SO berbeda dengan master product
      const updatedProducts = [...products];
      let productsUpdated = false;

      (formData.items || []).forEach(item => {
        if (item.productId || item.productKode) {
          const productId = item.productId || item.productKode;
          const masterProductIndex = updatedProducts.findIndex(p =>
            (p.product_id || p.kode) === productId
          );

          if (masterProductIndex >= 0) {
            const masterProduct = updatedProducts[masterProductIndex];
            // Jika padCode di SO berbeda dengan master product, update master product
            if (item.padCode && item.padCode.trim() && item.padCode !== (masterProduct.padCode || '')) {
              updatedProducts[masterProductIndex] = {
                ...masterProduct,
                padCode: item.padCode.trim(),
                lastUpdate: new Date().toISOString(),
                userUpdate: 'System',
                ipAddress: '127.0.0.1',
              };
              productsUpdated = true;
            }
          }
        }
      });

      // Save updated products jika ada perubahan
      if (productsUpdated) {
        await storageService.set(StorageKeys.PACKAGING.PRODUCTS, updatedProducts);
        // Update local products state untuk UI
        setProducts(updatedProducts);
      }

      // Ensure padCode is updated from master product before save (untuk items yang belum punya padCode)
      const itemsWithPadCode = (formData.items || []).map(item => {
        if (item.productId || item.productKode) {
          const productId = item.productId || item.productKode;
          const masterProduct = updatedProducts.find(p =>
            (p.product_id || p.kode) === productId
          );
          // Gunakan padCode dari item jika ada, kalau tidak gunakan dari master product
          if (masterProduct && !item.padCode) {
            return { ...item, padCode: masterProduct.padCode || '' };
          }
        }
        return item;
      });

      const formDataWithPadCode = {
        ...formData,
        items: itemsWithPadCode,
      };

      if (editingOrder) {
        const ordersArray = Array.isArray(orders) ? orders : [];
        const updated = ordersArray.map(o =>
          o.id === editingOrder.id
            ? {
              ...formDataWithPadCode,
              id: editingOrder.id,
              soNo: formDataWithPadCode.soNo || editingOrder.soNo, // Allow edit SO No
              created: formDataWithPadCode.created || editingOrder.created, // Use edited created date
              bomSnapshot,
              status: editingOrder.status, // Keep status unless explicitly changed
            } as SalesOrder
            : o
        );
        
        // ⚡ OPTIMISTIC UPDATE: Update UI immediately
        setOrders(updated);
        showToast(`SO ${formDataWithPadCode.soNo || 'N/A'} updated successfully`, 'success');
        
        // 🔄 BACKGROUND: Save to storage (don't wait)
        storageService.set(StorageKeys.PACKAGING.SALES_ORDERS, updated).catch(err => {
          console.error('Failed to save SO:', err);
          showToast('Failed to save SO to storage', 'error');
        });
        
        // 📝 BACKGROUND: Log activity (don't wait)
        logUpdate('SALES_ORDER', editingOrder.id, '/packaging/sales-orders', {
          soNo: formDataWithPadCode.soNo || editingOrder.soNo,
          customer: formDataWithPadCode.customer,
          itemCount: itemsWithPadCode.length,
        }).catch(() => {
          // Silent fail
        });
      } else {
        const newOrder: SalesOrder = {
          id: Date.now().toString(),
          soNo: (formDataWithPadCode.soNo || '').trim(),
          customer: formDataWithPadCode.customer || '',
          customerKode: formDataWithPadCode.customerKode || '',
          paymentTerms: formDataWithPadCode.paymentTerms || 'TOP',
          topDays: formDataWithPadCode.topDays,
          status: 'OPEN', // Auto OPEN saat SO dibuat (PO customer masuk)
          created: formDataWithPadCode.created || new Date().toISOString(),
          items: itemsWithPadCode,
          globalSpecNote: formDataWithPadCode.globalSpecNote,
          category: formDataWithPadCode.category || 'packaging',
          bomSnapshot,
        };
        const ordersArray = Array.isArray(orders) ? orders : [];
        const updated = [...ordersArray, newOrder];
        
        // ⚡ OPTIMISTIC UPDATE: Update UI immediately
        setOrders(updated);
        showToast(`SO ${newOrder.soNo} created successfully`, 'success');
        
        // 🔄 BACKGROUND: Save to storage (don't wait)
        storageService.set(StorageKeys.PACKAGING.SALES_ORDERS, updated).catch(err => {
          console.error('Failed to save SO:', err);
          showToast('Failed to save SO to storage', 'error');
        });
        
        // 📝 BACKGROUND: Log activity (don't wait)
        logCreate('SALES_ORDER', newOrder.id, '/packaging/sales-orders', {
          soNo: newOrder.soNo,
          customer: newOrder.customer,
          itemCount: itemsWithPadCode.length,
          status: newOrder.status,
        }).catch(() => {
          // Silent fail
        });

        // ⚡ BACKGROUND: Update inventory if needed (don't wait)
        (async () => {
          if (formData.items && formData.items.length > 0) {
            const inventoryData = await storageService.get<any[]>('inventory') || [];
            const updatedInventory = [...inventoryData];

            formData.items.forEach((item: SOItem) => {
              if (item.inventoryQty && item.inventoryQty > 0 && item.productId) {
                const productId = item.productId.toLowerCase();
                const inventoryItem = updatedInventory.find(inv =>
                  (inv.item_code || inv.codeItem || '').toLowerCase() === productId
                );

                if (inventoryItem) {
                  inventoryItem.stockPremonth = (inventoryItem.stockPremonth || 0) + item.inventoryQty;
                  inventoryItem.lastUpdate = new Date().toISOString();
                } else {
                  const product = products.find(p =>
                    ((p.product_id || p.kode) || '').toLowerCase() === productId
                  );
                  if (product) {
                    updatedInventory.push({
                      id: Date.now().toString() + productId,
                      supplierName: formData.customer || '',
                      codeItem: item.productId,
                      description: item.productName || product.nama || '',
                      kategori: product.kategori || 'Product',
                      satuan: item.unit || product.satuan || 'PCS',
                      price: item.price || product.hargaFg || product.hargaSales || 0,
                      padCode: item.padCode || product.padCode || '',
                      stockPremonth: item.inventoryQty,
                      receive: 0,
                      outgoing: 0,
                      return: 0,
                      nextStock: item.inventoryQty,
                      lastUpdate: new Date().toISOString(),
                    });
                  }
                }
              }
            });

            if (updatedInventory.length !== inventoryData.length ||
              formData.items.some(item => item.inventoryQty && item.inventoryQty > 0)) {
              await storageService.set(StorageKeys.PACKAGING.INVENTORY, updatedInventory);
            }
          }
        })().catch(err => console.error('Inventory update failed:', err));
      }
      
      // ⚡ OPTIMISTIC CLOSE: Close form immediately (don't wait for background tasks)
      setShowForm(false);
      setEditingOrder(null);
      setFormData({ soNo: '', customer: '', customerKode: '', paymentTerms: 'TOP', topDays: 30, items: [], globalSpecNote: '', category: 'packaging', created: '' });
      setCustomerSearch('');
      setProductInputValue({});
      setProductSearch({});
      setShowProductDialog(null);
      setProductDialogSearch('');
      setQtyInputValue({});
      setPriceInputValue({});
    } catch (error: any) {
      showToast(`Error saving SO: ${error.message}`, 'error');
    }
  };

  // Status otomatis: OPEN (saat SO dibuat), OPEN → CLOSE (saat invoice dibayar)
  // Tidak ada manual update status

  // Handle Edit
  const handleEdit = async (item: SalesOrder) => {
    // Bisa edit jika status OPEN (untuk sync dengan PO customer)
    // Tidak bisa edit jika sudah CLOSE
    if (item.status === 'CLOSE') {
      showToast(`Cannot edit SO ${item.soNo}. SO with status ${item.status} cannot be edited.`, 'error');
      return;
    }

    // SET DIALOG OPEN - untuk disable global event listener
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(true);
    }

    // CLEAR FOCUS dari semua input di luar dialog sebelum buka form
    const clearAllFocus = () => {
      // Clear activeElement
      if (document.activeElement && document.activeElement instanceof HTMLElement) {
        const activeEl = document.activeElement;
        if (!activeEl.closest('.dialog-card') && !activeEl.closest('.dialog-overlay')) {
          activeEl.blur();
        }
      }

      // Clear focus dari semua input/textarea/select di luar dialog
      const allInputs = document.querySelectorAll('input, textarea, select, [contenteditable="true"]');
      allInputs.forEach((input: Element) => {
        if (input instanceof HTMLElement) {
          if (!input.closest('.dialog-card') && !input.closest('.dialog-overlay')) {
            if (document.activeElement === input) {
              input.blur();
            }
          }
        }
      });
    };

    // Clear focus sebelum buka form
    clearAllFocus();
    await new Promise(resolve => setTimeout(resolve, 50));

    setEditingOrder(item);
    setFormKey(prev => prev + 1); // Force re-render input fields

    // Reload BOM for items if not already loaded, and update padCode from master product
    const itemsWithBOM = await Promise.all((item.items || []).map(async (itm) => {
      // Update padCode from master product if productId exists
      if (itm.productId || itm.productKode) {
        const productId = (itm.productId || itm.productKode || '').toString().trim();
        const masterProduct = products.find(p => {
          const pId = (p.product_id || p.kode || '').toString().trim();
          return pId === productId && pId !== '';
        });
        if (masterProduct && masterProduct.padCode) {
          itm.padCode = masterProduct.padCode;
        } else if (!itm.padCode) {
          itm.padCode = '';
        }
      }

      if (itm.bom && itm.bom.length > 0) {
        return itm; // BOM already exists
      }

      // Load BOM for this product
      const productId = (itm.productId || itm.productKode || '').toString().trim();
      const productBOM = bomData.filter(b => {
        const bomProductId = String(b.product_id || b.kode || '').trim().toLowerCase();
        const searchProductId = String(productId || '').trim().toLowerCase();

        if (!bomProductId || !searchProductId) return false;

        // Direct match
        if (bomProductId === searchProductId) return true;

        // Cross-reference: Cari produk yang punya kode/kodeIpos/product_id/padCode sama dengan bomProductId
        const matchingProduct = products.find(p => {
          if (!p) return false;
          const pKode = String(p.kode || '').trim().toLowerCase();
          const pKodeIpos = String(p.kodeIpos || '').trim().toLowerCase();
          const pProductId = String(p.product_id || '').trim().toLowerCase();
          const pPadCode = String(p.padCode || '').trim().toLowerCase();

          return (pKode && pKode === bomProductId) ||
            (pKodeIpos && pKodeIpos === bomProductId) ||
            (pProductId && pProductId === bomProductId) ||
            (pPadCode && pPadCode === bomProductId);
        });

        // Jika ada produk yang match dengan bomProductId, cek apakah produk itu match dengan searchProductId
        if (matchingProduct) {
          const pKode = String(matchingProduct.kode || '').trim().toLowerCase();
          const pKodeIpos = String(matchingProduct.kodeIpos || '').trim().toLowerCase();
          const pProductId = String(matchingProduct.product_id || '').trim().toLowerCase();
          const pPadCode = String(matchingProduct.padCode || '').trim().toLowerCase();

          return (pKode && pKode === searchProductId) ||
            (pKodeIpos && pKodeIpos === searchProductId) ||
            (pProductId && pProductId === searchProductId) ||
            (pPadCode && pPadCode === searchProductId);
        }

        return false;
      });

      if (productBOM.length > 0) {
        const bomItems = productBOM.map(bom => {
          const material = materials.find(m => {
            const mId = (m.material_id || m.kode || '').toString().trim();
            const bomId = (bom.material_id || '').toString().trim();
            return mId === bomId && mId !== '';
          });
          return {
            materialId: bom.material_id,
            materialName: material?.nama || bom.material_id || '',
            unit: material?.satuan || 'PCS',
            qty: (itm.qty || 0) * (bom.ratio || 1),
            ratio: bom.ratio || 1,
            pricePerUnit: material?.priceMtr || material?.harga || 0,
          };
        });
        return { ...itm, bom: bomItems };
      }

      return itm;
    }));

    setFormData({
      soNo: item.soNo,
      customer: item.customer,
      customerKode: item.customerKode,
      paymentTerms: item.paymentTerms,
      topDays: item.topDays,
      items: itemsWithBOM,
      globalSpecNote: item.globalSpecNote,
      category: item.category,
      created: item.created, // Include created date for editing
    });
    setCustomerSearch(item.customer);
    const inputMap: { [key: number]: string } = {};
    itemsWithBOM.forEach((itm, idx) => {
      if (itm.productName) {
        inputMap[idx] = itm.productKode ? `${itm.productKode} - ${itm.productName}` : itm.productName;
      }
    });
    setProductInputValue(inputMap);
    setProductSearch(inputMap); // Set productSearch sama dengan inputMap
    setShowProductDialog(null);
    setProductDialogSearch('');
    setShowForm(true);
    setFormKey(prev => prev + 1); // Force re-render input fields
  };

  // Handle Delete
  const handleDelete = async (item: SalesOrder) => {
    try {
      // Cek apakah SO sudah punya turunan (SPK/PO/Production)
      const spkData = await storageService.get<any[]>('spk') || [];
      const poData = await storageService.get<any[]>('purchaseOrders') || [];
      const productionData = await storageService.get<any[]>('production') || [];
      const prData = await storageService.get<any[]>('purchaseRequests') || [];

      // Ensure all data are arrays before using .some()
      const spkList = Array.isArray(spkData) ? spkData : [];
      const poList = Array.isArray(poData) ? poData : [];
      const productionList = Array.isArray(productionData) ? productionData : [];
      const prList = Array.isArray(prData) ? prData : [];

      const hasSPK = spkList.some((spk: any) => spk && spk.soNo === item.soNo);
      const hasPO = poList.some((po: any) => po && po.soNo === item.soNo);
      const hasProduction = productionList.some((prod: any) => prod && prod.soNo === item.soNo);
      const hasPR = prList.some((pr: any) => pr && pr.soNo === item.soNo);

      if (hasSPK || hasPO || hasProduction || hasPR) {
        const relatedItems: string[] = [];
        if (hasSPK) relatedItems.push('SPK');
        if (hasPO) relatedItems.push('PO');
        if (hasProduction) relatedItems.push('Production');
        if (hasPR) relatedItems.push('PR');

        showToast(
          `Tidak bisa menghapus SO ${item.soNo}!\n\nSO ini sudah memiliki turunan:\n${relatedItems.map(i => `• ${i}`).join('\n')}\n\nJika ingin membatalkan, tutup SO melalui workflow normal (CLOSE).`,
          'error'
        );
        return;
      }

      // Cek apakah SO sudah CLOSE
      if (item.status === 'CLOSE') {
        showToast(`Tidak bisa menghapus SO ${item.soNo} yang sudah CLOSE.`, 'error');
        return;
      }

      showConfirm(
        `Hapus SO: ${item.soNo}?\n\n⚠️ Data akan dihapus dengan aman (tombstone pattern) untuk mencegah auto-sync mengembalikan data.\n\nTindakan ini tidak bisa dibatalkan.`,
        async () => {
          try {
            // Validate item.id exists
            if (!item.id) {
              showToast(`Error: SO ${item.soNo} tidak memiliki ID`, 'error');
              return;
            }

            // Close dialog IMMEDIATELY to prevent re-renders
            closeDialog();

            // Show loading toast
            showToast(`Deleting SO ${item.soNo}...`, 'info');

            // 🚀 FIX: Pakai packaging delete helper untuk konsistensi dan sync yang benar
            const deleteResult = await deletePackagingItem('salesOrders', item.id, 'id');

            if (deleteResult.success) {
              // Log activity
              try {
                await logDelete('SALES_ORDER', item.id, '/packaging/sales-orders', {
                  soNo: item.soNo,
                  customer: item.customer,
                });
              } catch (logError) {
              }

              // Reload data dengan helper (handle race condition)
              await reloadPackagingData('salesOrders', setOrders);

              showToast(`SO ${item.soNo} deleted successfully`, 'success');
            } else {
              showToast(`Error deleting SO ${item.soNo}: ${deleteResult.error || 'Unknown error'}`, 'error');
            }
          } catch (error: any) {
            showToast(`Error deleting SO: ${error.message}`, 'error');
          }
        },
        () => {
          closeDialog();
        },
        'Delete Confirmation'
      );
    } catch (error: any) {
      showToast(`Error: ${error.message}`, 'error');
    }
  };


  // TODO: Implement quotation generation from SO
  // Handle Generate Quotation
  const handleGenerateQuotation = (item: SalesOrder) => {
    if (!item.items || item.items.length === 0) {
      showToast(`SO ${item.soNo} has no items. Please add items first.`, 'error');
      return;
    }
    setQuotationPreviewData(item);
    setShowQuotationPreview(true);
  };

  // Handle View Quotation
  const handleViewQuotation = async (quotation: SalesOrder) => {
    setQuotationPreviewData(quotation);
    const html = await generateQuotationHtmlFromSO(quotation);
    setQuotationPreviewHtml(html);
    setShowQuotationPreview(true);
  };

  // Handle Edit Quotation
  const handleEditQuotation = (quotation: SalesOrder) => {
    setEditingQuotation(quotation);
    setQuotationFormData({
      soNo: quotation.soNo,
      customer: quotation.customer,
      customerKode: quotation.customerKode,
      paymentTerms: quotation.paymentTerms,
      topDays: quotation.topDays,
      items: quotation.items ? [...quotation.items] : [],
      globalSpecNote: quotation.globalSpecNote || '',
      category: 'packaging',
      discountPercent: quotation.discountPercent || 0,
      signatureBase64: quotation.signatureBase64 || '',
      signatureName: quotation.signatureName || '',
      signatureTitle: quotation.signatureTitle || '',
    });
    setQuotationCustomerSearch(quotation.customer || '');
    setQuotationProductSearch({});
    setQuotationQtyInputValue({});
    setQuotationPriceInputValue({});
    setQuotationItemDiscountInputValue({});
    setQuotationDiscountInputValue(quotation.discountPercent ? String(quotation.discountPercent) : '');
    setShowQuotationFormDialog(true);
  };

  // Handle Delete Quotation
  const handleDeleteQuotation = async (quotation: SalesOrder) => {
    try {
      // Validate item.id exists
      if (!quotation.id) {
        showToast(`Error: Quotation ${quotation.soNo} tidak memiliki ID`, 'error');
        return;
      }

      // Cek apakah quotation sudah di-convert ke SO
      if (quotation.matchedSoNo) {
        showToast(
          `Tidak bisa menghapus Quotation ${quotation.soNo}!\n\nQuotation ini sudah di-convert ke Sales Order: ${quotation.matchedSoNo}\n\nJika ingin membatalkan, hapus Sales Order terkait terlebih dahulu.`,
          'error'
        );
        return;
      }

      showConfirm(
        `Hapus Quotation: ${quotation.soNo}?\n\nCustomer: ${quotation.customer}\n\n⚠️ Data akan dihapus dengan aman (tombstone pattern) untuk mencegah auto-sync mengembalikan data.\n\nTindakan ini tidak bisa dibatalkan.`,
        async () => {
          try {
            // Close dialog IMMEDIATELY to prevent re-renders
            closeDialog();

            // Show loading toast
            showToast(`Deleting Quotation ${quotation.soNo}...`, 'info');

            // 🚀 FIX: Pakai packaging delete helper untuk konsistensi dan sync yang benar
            const deleteResult = await deletePackagingItem('quotations', quotation.id, 'id');

            if (deleteResult.success) {
              // Log activity
              try {
                await logDelete('QUOTATION', quotation.id, '/packaging/sales-orders', {
                  soNo: quotation.soNo,
                  customer: quotation.customer,
                });
              } catch (logError) {
              }

              // Reload quotations dengan helper (handle race condition)
              await reloadPackagingData('quotations', setQuotations);

              showToast(`Quotation ${quotation.soNo} deleted successfully`, 'success');
            } else {
              showToast(`Error deleting Quotation ${quotation.soNo}: ${deleteResult.error || 'Unknown error'}`, 'error');
            }
          } catch (error: any) {
            showToast(`Error deleting Quotation: ${error.message}`, 'error');
          }
        },
        () => {
          // Quotation delete cancelled
        },
        'Delete Confirmation'
      );
    } catch (error: any) {
      showToast(`Error: ${error.message}`, 'error');
    }
  };

  // Helper: Load logo dari public folder
  const loadLogoBase64 = async (): Promise<string> => {
    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI && electronAPI.getResourceBase64) {
        try {
          const base64Logo = await electronAPI.getResourceBase64('noxtiz.png');
          if (base64Logo && base64Logo.startsWith('data:')) {
            return base64Logo;
          }
        } catch (error) {
          // Continue to fallback
        }
      }

      // Fallback: fetch dari public folder
      const logoPaths = ['/noxtiz.png', './noxtiz.png', '/public/noxtiz.png'];
      for (const logoPath of logoPaths) {
        try {
          const response = await fetch(logoPath, { cache: 'no-cache' });
          if (response.ok) {
            const blob = await response.blob();
            return await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                resolve(result.startsWith('data:') ? result : `data:image/png;base64,${result}`);
              };
              reader.onerror = () => reject(new Error('FileReader error'));
              reader.readAsDataURL(blob);
            });
          }
        } catch (error) {
          continue;
        }
      }
    } catch (error) {
      // Silent fail
    }
    return '';
  };

  // Generate quotation HTML using template
  const generateQuotationHtmlFromSO = async (item: SalesOrder): Promise<string> => {
    const logoBase64 = await loadLogoBase64();

    const qData = {
      quoteNo: item.soNo,
      quoteDate: item.created,
      customerName: item.customer,
      customerAddress: '',
      attnTo: '-',
      contact: '-',
      items: item.items?.map((i, idx) => ({
        no: idx + 1,
        description: i.productName,
        qty: i.qty,
        uom: i.unit,
        unitPrice: i.price,
        amount: i.total,
      })) || [],
      discountPercent: 0,
      remarks: item.globalSpecNote ? [item.globalSpecNote] : [],
    };

    const company = {
      companyName: 'PT. TRIMA LAKSANA JAYA PRATAMA',
      address: 'Jl. Raya Cikarang Cibarusah Km. 10',
      phone: '021 8982 3556',
      picPurchasingName: 'M. ALAUDDIN',
    };

    return generateQuotationHtml({
      logoBase64,
      company,
      qData,
      so: { soNo: item.soNo },
    });
  };

  // Print Quotation using template
  const handlePrintQuotation = async (item: SalesOrder) => {
    if (!item.items || item.items.length === 0) return;
    
    // Gunakan HTML yang sudah di-generate untuk preview
    let html = quotationPreviewHtml;
    
    // Jika belum ada, generate sekarang
    if (!html) {
      html = await generateQuotationHtmlFromSO(item);
    }
    
    openPrintWindow(html);
  };

  // Save Quotation to PDF
  const handleSaveQuotationPDF = async (item: SalesOrder) => {
    if (!item.items || item.items.length === 0) return;

    try {
      // Gunakan HTML yang sudah di-generate untuk preview
      let html = quotationPreviewHtml;
      
      // Jika belum ada, generate sekarang
      if (!html) {
        html = await generateQuotationHtmlFromSO(item);
      }

      // Use html2pdf library if available, otherwise use print dialog
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => {
        const element = document.createElement('div');
        element.innerHTML = html;

        const opt = {
          margin: 5,
          filename: `Quotation-${item.soNo}.pdf`,
          image: { type: 'png', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
        };

        (window as any).html2pdf().set(opt).from(element).save();
      };
      document.head.appendChild(script);
    } catch (error) {
      console.error('Error saving PDF:', error);
      showToast('Failed to save PDF. Please try again.', 'error');
    }
  };

  // Filter and sort orders (terbaru di atas)
  const filteredOrders = useMemo(() => {
    // Tab quotation tidak perlu filter orders (untuk create form)
    if (activeTab === 'quotation') {
      return [];
    }

    // Ensure orders is always an array
    let filtered = Array.isArray(orders) ? orders : [];

    // Tab filter - Outstanding tab hanya show status OPEN (strict filter)
    if (activeTab === 'outstanding') {
      filtered = filtered.filter(order => order.status === 'OPEN');
    } else {
      // Status filter hanya berlaku untuk tab "All Orders"
      if (statusFilter !== 'all') {
        filtered = filtered.filter(order => order.status === statusFilter);
      }
    }

    // Date filter
    if (dateFrom) {
      filtered = filtered.filter(order => order.created >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter(order => order.created <= dateTo);
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        order.soNo.toLowerCase().includes(query) ||
        order.customer.toLowerCase().includes(query) ||
        (order.customerKode || '').toLowerCase().includes(query)
      );
    }

    // Sort: Terbaru di atas, CLOSE di bawah
    // Ensure filtered is still an array before sorting
    if (!Array.isArray(filtered)) {
      return [];
    }
    return filtered.sort((a, b) => {
      // Priority 1: CLOSE status di bawah, yang lain di atas
      const statusOrder: Record<string, number> = { 'CLOSE': 1, 'OPEN': 0, 'DRAFT': 0, 'CONFIRMED': 0 };
      const statusDiff = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
      if (statusDiff !== 0) return statusDiff;

      // Priority 2: Yang paling baru di atas (berdasarkan created date)
      const dateA = new Date(a.created).getTime();
      const dateB = new Date(b.created).getTime();
      return dateB - dateA; // Descending (newest first)
    });
  }, [orders, activeTab, statusFilter, dateFrom, dateTo, searchQuery]);

  // Paginated orders for card and table view
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateFrom, dateTo, activeTab]);

  const filteredQuotations = useMemo(() => {
    let filtered = Array.isArray(quotations) ? quotations : [];

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(quotation =>
        quotation.soNo.toLowerCase().includes(query) ||
        quotation.customer.toLowerCase().includes(query) ||
        (quotation.customerKode || '').toLowerCase().includes(query)
      );
    }

    // Sort by created date (terbaru di atas)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.created).getTime();
      const dateB = new Date(b.created).getTime();
      return dateB - dateA; // Descending (newest first)
    });
  }, [quotations, searchQuery]);

  // Import Excel untuk Sales Orders
  const handleImportExcel = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
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
          showToast('Excel file is empty or has no data', 'error');
          return;
        }

        // Log headers for debugging
        if (jsonData.length > 0) {
          console.log('Excel headers found:', Object.keys(jsonData[0]));
        }

        // Helper untuk map column (case-insensitive, handles extra whitespace/invisible chars)
        const mapColumn = (row: any, possibleNames: string[]): string => {
          const keys = Object.keys(row);
          // Normalize keys: strip all non-printable chars and trim
          const normalizedKeys = keys.map(k => ({ original: k, normalized: k.replace(/[^\x20-\x7E]/g, '').toLowerCase().trim() }));
          for (const name of possibleNames) {
            const target = name.replace(/[^\x20-\x7E]/g, '').toLowerCase().trim();
            const found = normalizedKeys.find(k => k.normalized === target);
            if (found && row[found.original] !== undefined && row[found.original] !== '') {
              return String(row[found.original]).trim();
            }
          }
          return '';
        };

        // Helper untuk parse harga dari format "Rp 105,400"
        const parsePrice = (priceStr: string): number => {
          if (!priceStr) return 0;
          // Remove "Rp", spaces, and commas
          const cleaned = priceStr.toString().replace(/Rp\s*/gi, '').replace(/,/g, '').replace(/\s/g, '').trim();
          return parseFloat(cleaned) || 0;
        };

        // Helper untuk parse date dari format "02-Jan-26" atau "02-Jan-2026"
        const parseDate = (dateStr: string): string => {
          if (!dateStr) {
            console.log('Date parsing: empty date, using current time');
            return new Date().toISOString();
          }
          try {
            console.log('Date parsing: input =', dateStr);

            // Excel sometimes converts dates to serial numbers or ISO strings
            // Check if it's already an ISO string
            if (dateStr.includes('T') && dateStr.includes('Z')) {
              console.log('Date parsing: already ISO format =', dateStr);
              return dateStr;
            }

            // Try format "02-Jan-26" or "02-Jan-2026" FIRST (before serial number check)
            const parts = dateStr.split('-');
            if (parts.length === 3) {
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const monthIdx = monthNames.findIndex(m => m.toLowerCase() === parts[1].toLowerCase());
              if (monthIdx !== -1) {
                const day = parseInt(parts[0], 10);
                let year = parseInt(parts[2], 10);
                if (year < 100) year += 2000;
                const parsed = new Date(year, monthIdx, day);
                if (!isNaN(parsed.getTime())) {
                  console.log('Date parsing: DD-Mon-YY format success =', parsed.toISOString());
                  return parsed.toISOString();
                }
              }
            }

            // Check if it's an Excel serial number (must be > 1000 to avoid false positives like day numbers)
            const serialNumber = parseFloat(dateStr);
            if (!isNaN(serialNumber) && serialNumber > 1000 && serialNumber < 100000) {
              // Excel epoch is 1899-12-30 (accounts for Excel's fake 1900 leap year bug)
              const date = new Date(Date.UTC(1899, 11, 30) + serialNumber * 86400000);
              if (!isNaN(date.getTime())) {
                console.log('Date parsing: Excel serial number success =', date.toISOString());
                return date.toISOString();
              }
            }

            // Try native Date.parse as fallback
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              console.log('Date parsing: native Date.parse() success =', date.toISOString());
              return date.toISOString();
            }
          } catch (e) {
            console.log('Date parsing: error =', e);
          }
          console.log('Date parsing: failed, using current time');
          return new Date().toISOString();
        };

        // Group data by No So
        const ordersMap = new Map<string, any[]>();
        const errors: string[] = [];

        jsonData.forEach((row, index) => {
          try {
            console.log(`Row ${index + 2}:`, row);
            const noSo = mapColumn(row, ['No So', 'NO SO', 'No SO', 'no so', 'SO No', 'SO NO', 'soNo', 'so_no']);
            const customerCode = mapColumn(row, ['Customer Code', 'CUSTOMER CODE', 'Customer Code', 'customer code', 'customerCode']);
            const customer = mapColumn(row, ['CUSTOMER', 'Customer', 'customer']);
            const kodeItem = mapColumn(row, ['Kd. Item', 'KD. ITEM', 'Kd Item', 'kd item', 'Kode Item', 'KODE ITEM', 'kode item', 'Code', 'CODE', 'code', 'Kode', 'kode']);
            const namaItem = mapColumn(row, ['Nama Item', 'NAMA ITEM', 'nama item', 'NamaItem', 'namaitem', 'Product Name', 'product name', 'Item Name', 'item name']);
            const padCode = mapColumn(row, ['Pad Code', 'PAD CODE', 'Pad Code', 'pad code', 'padCode']);
            const jml = parseFloat(mapColumn(row, ['Jml', 'JML', 'Jumlah', 'jumlah', 'Qty', 'qty', 'Quantity', 'quantity'])) || 0;
            const hargaStr = mapColumn(row, ['Harga', 'HARGA', 'Price', 'price', 'Harga Satuan', 'harga satuan']);
            const totalStr = mapColumn(row, ['Total', 'TOTAL', 'total']);
            const createDateStr = mapColumn(row, ['Created Date', 'Create Date', 'CREATE DATE', 'Create Date', 'create date', 'Date', 'date', 'Created', 'created']);

            console.log(`Row ${index + 2} - createDateStr:`, createDateStr);

            if (!noSo || !customer || !namaItem) {
              errors.push(`Row ${index + 2}: Missing required fields (No So, Customer, or Nama Item)`);
              return;
            }

            if (jml <= 0) {
              errors.push(`Row ${index + 2}: Jml must be greater than 0`);
              return;
            }

            const harga = parsePrice(hargaStr || totalStr);
            const total = parsePrice(totalStr || '0');
            const calculatedPrice = total > 0 && jml > 0 ? total / jml : harga;

            if (!ordersMap.has(noSo)) {
              ordersMap.set(noSo, []);
            }

            ordersMap.get(noSo)!.push({
              customerCode,
              customer,
              kodeItem,
              namaItem,
              padCode,
              jml,
              harga: calculatedPrice,
              total: total || (calculatedPrice * jml),
              createDate: parseDate(createDateStr),
            });
          } catch (error: any) {
            errors.push(`Row ${index + 2}: ${error.message}`);
          }
        });

        if (ordersMap.size === 0) {
          showToast('No valid data found in Excel file', 'error');
          return;
        }

        // Convert to Sales Orders
        const newOrders: SalesOrder[] = [];
        ordersMap.forEach((items, noSo) => {
          try {
            const firstItem = items[0];
            const createDate = parseDate(firstItem.createDate);

            // Find customer - exact match first, then partial/fuzzy, then fallback to raw name
            const customerData = customers.find(c =>
              c.nama.toLowerCase().trim() === firstItem.customer.toLowerCase().trim() ||
              (firstItem.customerCode && c.kode.toLowerCase().trim() === firstItem.customerCode.toLowerCase().trim())
            ) || customers.find(c =>
              c.nama.toLowerCase().includes(firstItem.customer.toLowerCase().trim()) ||
              firstItem.customer.toLowerCase().includes(c.nama.toLowerCase().trim())
            );

            // Use fallback if not found - don't skip the SO
            const resolvedCustomer = customerData
              ? { nama: customerData.nama, kode: customerData.kode }
              : { nama: firstItem.customer, kode: firstItem.customerCode || '' };

            if (!customerData) {
              console.warn(`SO ${noSo}: Customer "${firstItem.customer}" not in master, importing anyway`);
              errors.push(`SO ${noSo}: Customer "${firstItem.customer}" not in master (imported with raw name)`);
            }

            // Convert items
            const soItems: SOItem[] = items.map((item, idx) => {
              // Find product by kodeIpos, padCode, kode, atau nama (prioritas: kodeIpos > padCode > kode > nama)
              let product = products.find(p => {
                const pKodeIpos = (p.kodeIpos || '').toLowerCase().trim();
                const pPadCode = (p.padCode || '').toLowerCase().trim();
                const pKode = (p.kode || '').toLowerCase().trim();
                const pProductId = ((p.product_id || '')).toLowerCase().trim();
                const itemKode = (item.kodeItem || '').toLowerCase().trim();
                return (pKodeIpos && pKodeIpos === itemKode) ||
                  (pPadCode && pPadCode === itemKode) ||
                  (pKode && pKode === itemKode) ||
                  (pProductId && pProductId === itemKode);
              });

              // If not found by code, try by nama
              if (!product) {
                product = products.find(p =>
                  (p.nama && p.nama.toLowerCase().trim() === item.namaItem.toLowerCase().trim())
                );
              }

              // Determine productId dan productKode untuk BOM lookup
              const productId = product ? (product.product_id || product.kode || product.kodeIpos || product.padCode || '') : item.kodeItem || '';
              const productKode = product ? (product.kode || product.product_id || product.kodeIpos || product.padCode || '') : item.kodeItem || '';
              const productName = item.namaItem;

              // Load BOM dari master berdasarkan product_id/kode/kodeIpos/padCode
              // BOM di master disimpan dengan product_id atau kode, tapi bisa di-link dengan kodeIpos/padCode juga
              const bomDataArray = Array.isArray(bomData) ? bomData : [];
              const productBOM = bomDataArray.filter(b => {
                if (!b) return false;
                // BOM di master punya product_id atau kode
                const bomProductId = String(b.product_id || b.kode || '').trim().toLowerCase();

                if (!bomProductId) return false;

                // Match dengan berbagai identifier dari product
                if (product) {
                  const pProductId = String(product.product_id || '').trim().toLowerCase();
                  const pKode = String(product.kode || '').trim().toLowerCase();
                  const pKodeIpos = String(product.kodeIpos || '').trim().toLowerCase();
                  const pPadCode = String(product.padCode || '').trim().toLowerCase();

                  // Match jika BOM product_id/kode sama dengan product.product_id/kode/kodeIpos/padCode
                  return (pProductId && bomProductId === pProductId) ||
                    (pKode && bomProductId === pKode) ||
                    (pKodeIpos && bomProductId === pKodeIpos) ||
                    (pPadCode && bomProductId === pPadCode);
                }

                // Jika product tidak ditemukan, match dengan productId/productKode dari item
                const itemProductId = String(productId || '').trim().toLowerCase();
                const itemProductKode = String(productKode || '').trim().toLowerCase();
                return (itemProductId && bomProductId === itemProductId) ||
                  (itemProductKode && bomProductId === itemProductKode);
              }).map(bom => {
                const bomMaterialId = String(bom.material_id || '').trim();
                const materialsArray = Array.isArray(materials) ? materials : [];
                const material = materialsArray.find(m => {
                  const mId = String(m.material_id || m.kode || '').trim();
                  return mId === bomMaterialId && mId !== '';
                });
                return {
                  materialId: bomMaterialId,
                  materialName: (material?.nama || bom.material_id || bomMaterialId || '').toString(),
                  unit: material?.satuan || 'PCS',
                  qty: item.jml * (bom.ratio || 1),
                  ratio: bom.ratio || 1,
                };
              });

              return {
                id: `${Date.now()}-${idx}`,
                productId: productId,
                productKode: productKode,
                productName: productName,
                qty: item.jml,
                unit: product?.satuan || 'PCS',
                price: item.harga,
                total: item.total || (item.harga * item.jml),
                padCode: item.padCode || product?.padCode || '',
                inventoryQty: 0,
                bom: productBOM || [], // Auto-link BOM dari master
              };
            });

            // Check if SO already exists
            const existingOrder = orders.find(o => o.soNo.toLowerCase().trim() === noSo.toLowerCase().trim());
            if (existingOrder) {
              errors.push(`SO ${noSo}: Already exists, skipping...`);
              return;
            }

            const now = new Date();
            const timestamp = now.getTime();
            newOrders.push({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              soNo: noSo,
              customer: resolvedCustomer.nama,
              customerKode: resolvedCustomer.kode,
              paymentTerms: 'TOP',
              topDays: 30,
              status: 'OPEN',
              created: createDate,
              items: soItems,
              globalSpecNote: '',
              category: 'packaging',
              lastUpdate: now.toISOString(),
              timestamp: timestamp,
              _timestamp: timestamp,
            });
          } catch (error: any) {
            errors.push(`SO ${noSo}: ${error.message}`);
          }
        });

        if (newOrders.length === 0) {
          showToast(`No valid orders to import. Errors: ${errors.slice(0, 5).join('; ')}${errors.length > 5 ? '...' : ''}`, 'error');
          return;
        }

        showConfirm(
          `Import ${newOrders.length} Sales Order(s) from Excel?${errors.length > 0 ? `\n\n${errors.length} errors occurred.` : ''}`,
          async () => {
            // 🚀 FIX: Load current data dari storage (termasuk deleted items untuk merge)
            const currentData = await storageService.get<SalesOrder[]>('salesOrders') || [];
            const currentDataArray = Array.isArray(currentData) ? currentData : [];
            const activeCurrentData = filterActiveItems(currentDataArray);

            // Merge dengan data baru
            const allOrders = [...activeCurrentData, ...newOrders];
            await storageService.set(StorageKeys.PACKAGING.SALES_ORDERS, allOrders);

            // Update state dengan data yang sudah di-filter
            const activeOrders = filterActiveItems(allOrders);
            setOrders(activeOrders);

            // Log activity
            newOrders.forEach(order => {
              logCreate('Sales Order', order.soNo, `Imported from Excel: ${order.soNo}`);
            });

            showToast(`Successfully imported ${newOrders.length} Sales Order(s)${errors.length > 0 ? `. ${errors.length} errors occurred.` : ''}`, 'success');
            loadOrders();
          },
          undefined,
          'Confirm Import'
        );
      } catch (error: any) {
        showToast(`Error importing Excel: ${error.message}\n\nMake sure the file is a valid Excel file (.xlsx or .xls)`, 'error');
      }
    };
    input.click();
  };

  // Import Historical Data dari CSV
  const handleImportHistoricalData = async () => {
    try {
      showConfirm(
        '📦 Import Historical Data?\n\nThis will import data from packaging_master.csv:\n• Sales Orders (CLOSE, confirmed)\n• Invoices (OPEN, awaiting payment)\n• Deliveries\n• Tax Records\n\nExisting data will not be affected (duplicates will be skipped).\n\nContinue?',
        async () => {
          try {
            // Show loading
            showToast('Importing historical data...', 'info');
            
            // Check if electronAPI is available
            const electronAPI = (window as any).electronAPI;
            
            if (electronAPI && electronAPI.runImportScript) {
              // Run import script via Electron
              const result = await electronAPI.runImportScript('import-packaging-historical-data.js');
              
              if (result.success) {
                // Reload data
                await loadOrders();
                
                const summary = result.summary;
                showToast(
                  `Import Complete! Created: ${summary.created.salesOrders} SO, ${summary.created.deliveries} Deliveries, ${summary.created.invoices} Invoices`,
                  'success'
                );
              } else {
                showToast(`Import Failed: ${result.error}`, 'error');
              }
            } else {
              // Fallback: Manual instruction
              showToast(
                'Manual Import Required: Run "node scripts/import-packaging-historical-data.js" in terminal',
                'info'
              );
            }
          } catch (error: any) {
            showToast(`Error during import: ${error.message}`, 'error');
          }
        },
        undefined,
        'Confirm Import'
      );
    } catch (error: any) {
      showToast(`Error: ${error.message}`, 'error');
    }
  };

  // ✅ NEW: Import Payment Data
  const handleImportPaymentData = async () => {
    try {
      showConfirm(
        '💳 Import Payment Data?\n\nThis will update invoices with payment information:\n• Mark invoices as CLOSE (paid)\n• Set paid amounts\n• Add payment notes\n\nContinue?',
        async () => {
          try {
            // Show loading
            showToast('Importing payment data...', 'info');
            
            // Check if electronAPI is available
            const electronAPI = (window as any).electronAPI;
            
            if (electronAPI && electronAPI.runImportScript) {
              // Run import script via Electron
              const result = await electronAPI.runImportScript('import-payment-data.js');
              
              if (result.success) {
                // Reload data
                await loadOrders();
                
                const summary = result.summary;
                showToast(
                  `Payment Import Complete! Updated ${summary.invoicesUpdated} invoices`,
                  'success'
                );
              } else {
                showToast(`Import Failed: ${result.error}`, 'error');
              }
            } else {
              // Fallback: Manual instruction
              showToast(
                'Manual Import Required: Run "node scripts/import-payment-data.js" in terminal',
                'info'
              );
            }
          } catch (error: any) {
            showToast(`Error during import: ${error.message}`, 'error');
          }
        },
        undefined,
        'Confirm Import'
      );
    } catch (error: any) {
      showToast(`Error: ${error.message}`, 'error');
    }
  };

  const handleExportExcel = async () => {
    try {
      const wb = XLSX.utils.book_new();

      // Load data dari storage
      const ordersArray = Array.isArray(orders) ? orders : [];
      const deliveryArray = Array.isArray(deliveries) ? deliveries : [];
      const inventoryData = extractStorageValue(await storageService.get<any[]>('inventory')) || [];
      const customersData = extractStorageValue(await storageService.get<Customer[]>('customers')) || [];

      // Build lookup maps
      const deliveryMap = new Map<string, any[]>(); // SO No -> Delivery Notes
      deliveryArray.forEach((dn: any) => {
        if (dn.soNo) {
          if (!deliveryMap.has(dn.soNo)) {
            deliveryMap.set(dn.soNo, []);
          }
          deliveryMap.get(dn.soNo)!.push(dn);
        }
      });

      const inventoryMap = new Map<string, any>(); // Product Code -> Inventory Item
      inventoryData.forEach((inv: any) => {
        // Try multiple field names for product code
        const code = inv.codeItem || inv.productCode || inv.item_code || inv.kodeIpos;
        if (code) {
          inventoryMap.set(code, inv);
        }
      });

      const customerMap = new Map<string, Customer>(); // Customer Code -> Customer
      customersData.forEach((cust: Customer) => {
        if (cust.kode) {
          customerMap.set(cust.kode, cust);
        }
      });

      // Generate report data: 1 row per SO item
      const reportData: any[] = [];
      let rowNo = 1;

      ordersArray.forEach((order: SalesOrder) => {
        // Get delivery notes for this SO
        const deliveryNotesForSO = deliveryMap.get(order.soNo) || [];
        
        // Calculate total delivered qty per product
        const deliveredQtyMap = new Map<string, number>();
        deliveryNotesForSO.forEach((dn: any) => {
          if (dn.items && Array.isArray(dn.items)) {
            dn.items.forEach((item: any) => {
              const productCode = item.productCode || item.product;
              const currentQty = deliveredQtyMap.get(productCode) || 0;
              deliveredQtyMap.set(productCode, currentQty + (item.qty || 0));
            });
          }
        });

        // Process each item in SO
        order.items.forEach((item: SOItem) => {
          const productCode = item.productKode;
          const inventory = inventoryMap.get(productCode);
          const customer = customerMap.get(order.customerKode || '');
          
          // Calculate inventory flow
          // Stock awal = jumlahin semua stock yang ada (stockPremonth + stockP1 + stockP2 + receive)
          const stockAwal = (inventory?.stockPremonth || 0) + 
                           (inventory?.stockP1 || 0) + 
                           (inventory?.stockP2 || 0) + 
                           (inventory?.receive || 0);
          const produksi = 0; // Produksi kosong karena sudah termasuk di stock awal
          const delivery = deliveredQtyMap.get(productCode) || 0;
          const remainPO = item.qty - delivery;
          const nextStock = (stockAwal - delivery) || 0; // Next stock = stock awal - delivery
          
          // Calculate financial
          const totalTagihan = item.total || (item.qty * item.price);
          const totalRpRemain = remainPO * item.price;

          reportData.push({
            no: rowNo++,
            kodePel: order.customerKode || '',
            kdItem: productCode,
            date: order.created ? order.created.split('T')[0] : '',
            noTransaksi: order.soNo,
            customer: order.customer,
            namaItem: item.productName,
            jml: item.qty,
            harga: item.price,
            total: totalTagihan,
            stockAwal: stockAwal,
            produksi: produksi,
            delivery: delivery,
            remainPO: remainPO,
            nextStock: nextStock,
            totalTagihan: totalTagihan,
            totalRpRemain: totalRpRemain,
          });
        });
      });

      // Define columns sesuai format yang diminta
      const columns: ExcelColumn[] = [
        { key: 'no', header: 'NO', width: 8, format: 'number' },
        { key: 'kodePel', header: 'KODE PEL.', width: 15 },
        { key: 'kdItem', header: 'KD. ITEM', width: 15 },
        { key: 'date', header: 'DATE', width: 12 },
        { key: 'noTransaksi', header: 'NO TRANSAKSI', width: 20 },
        { key: 'customer', header: 'CUSTOMER', width: 35 },
        { key: 'namaItem', header: 'NAMA ITEM', width: 50 },
        { key: 'jml', header: 'JML', width: 12, format: 'number' },
        { key: 'harga', header: 'HARGA', width: 15, format: 'currency' },
        { key: 'total', header: 'TOTAL', width: 15, format: 'currency' },
        { key: 'stockAwal', header: 'STOCK AWAL', width: 15, format: 'number' },
        { key: 'produksi', header: 'PRODUKSI', width: 15, format: 'number' },
        { key: 'delivery', header: 'DELIVERY', width: 15, format: 'number' },
        { key: 'remainPO', header: 'REMAIN PO', width: 15, format: 'number' },
        { key: 'nextStock', header: 'NEXT STOCK', width: 15, format: 'number' },
        { key: 'totalTagihan', header: 'TOTAL TAGIHAN', width: 18, format: 'currency' },
        { key: 'totalRpRemain', header: 'TOTAL RP. REMAIN', width: 18, format: 'currency' },
      ];

      // Create worksheet
      const ws = createStyledWorksheet(reportData, columns, 'Sales Report');
      setColumnWidths(ws, columns);

      // Add summary row
      if (reportData.length > 0) {
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        const summaryRowIdx = range.e.r + 2;
        const emptyRowIdx = range.e.r + 1;

        // Empty row
        const emptyCell = XLSX.utils.encode_cell({ r: emptyRowIdx, c: 0 });
        ws[emptyCell] = { t: 's', v: '' };

        // Summary row - TOTAL
        const summaryCell = XLSX.utils.encode_cell({ r: summaryRowIdx, c: 0 });
        ws[summaryCell] = { t: 's', v: 'TOTAL' };

        // Sum columns
        const jmlIdx = columns.findIndex(c => c.key === 'jml');
        const deliveryIdx = columns.findIndex(c => c.key === 'delivery');
        const remainPOIdx = columns.findIndex(c => c.key === 'remainPO');
        const totalTagihanIdx = columns.findIndex(c => c.key === 'totalTagihan');
        const totalRpRemainIdx = columns.findIndex(c => c.key === 'totalRpRemain');

        const totalJml = reportData.reduce((sum, row) => sum + (row.jml || 0), 0);
        const totalDelivery = reportData.reduce((sum, row) => sum + (row.delivery || 0), 0);
        const totalRemainPO = reportData.reduce((sum, row) => sum + (row.remainPO || 0), 0);
        const totalTagihan = reportData.reduce((sum, row) => sum + (row.totalTagihan || 0), 0);
        const totalRpRemain = reportData.reduce((sum, row) => sum + (row.totalRpRemain || 0), 0);

        // Set summary values
        if (jmlIdx >= 0) {
          const cell = XLSX.utils.encode_cell({ r: summaryRowIdx, c: jmlIdx });
          ws[cell] = { t: 'n', v: totalJml };
        }
        if (deliveryIdx >= 0) {
          const cell = XLSX.utils.encode_cell({ r: summaryRowIdx, c: deliveryIdx });
          ws[cell] = { t: 'n', v: totalDelivery };
        }
        if (remainPOIdx >= 0) {
          const cell = XLSX.utils.encode_cell({ r: summaryRowIdx, c: remainPOIdx });
          ws[cell] = { t: 'n', v: totalRemainPO };
        }
        if (totalTagihanIdx >= 0) {
          const cell = XLSX.utils.encode_cell({ r: summaryRowIdx, c: totalTagihanIdx });
          ws[cell] = { t: 'n', v: totalTagihan, z: '#,##0' };
        }
        if (totalRpRemainIdx >= 0) {
          const cell = XLSX.utils.encode_cell({ r: summaryRowIdx, c: totalRpRemainIdx });
          ws[cell] = { t: 'n', v: totalRpRemain, z: '#,##0' };
        }

        ws['!ref'] = XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: summaryRowIdx, c: range.e.c },
        });
      }

      XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');

      const fileName = `Sales Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showToast(`Exported Sales Report (${reportData.length} items) to ${fileName}`, 'success');
    } catch (error: any) {
      showToast(`Error exporting to Excel: ${error.message}`, 'error');
      console.error('Export error:', error);
    }
  };

  // Get row color based on SO No (dark theme selang-seling)
  const getRowColor = (soNo: string): string => {
    // Warna selang-seling row: di dark mode lebih terang, di light mode lebih kalem
    const uniqueSOs = Array.from(new Set(filteredOrders.map(o => o.soNo)));
    const soIndex = uniqueSOs.indexOf(soNo);
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';

    const rowColors = theme === 'light'
      ? [
        '#ffffff', // putih
        '#f5f5f5', // abu muda
      ]
      : [
        'rgba(33, 150, 243, 0.25)', // Blue
        'rgba(76, 175, 80, 0.25)',  // Green
      ];

    const index = soIndex >= 0 ? soIndex : 0;
    return rowColors[index % rowColors.length];
  };

  // Helper function to get product price satuan (tidak mengubah total)
  const getProductPriceSatuan = (productItem: SOItem): number => {
    // Jika harga satuan sudah ada dan > 0, gunakan harga yang ada
    if (productItem.price && productItem.price > 0) {
      return productItem.price;
    }

    // Jika total ada dan qty > 0, hitung harga satuan dari total / qty
    if (productItem.total && productItem.total > 0 && productItem.qty && productItem.qty > 0) {
      return productItem.total / productItem.qty;
    }

    // Jika tidak ada, cari dari master product
    const product = products.find(p =>
      (p.product_id || p.kode) === (productItem.productId || productItem.productKode)
    );

    if (product) {
      return Number(product.hargaSales || product.hargaFg || (product as any).harga || 0);
    }

    return 0;
  };

  const renderOrderItemsHeader = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '2fr 140px 105px 140px 90px',
      gap: '6px',
      width: '100%',
      fontSize: '11px',
      fontWeight: 600,
      textTransform: 'uppercase',
      color: 'var(--text-secondary)',
    }}>
      <div>Product</div>
      <div style={{ textAlign: 'center' }}>Qty</div>
      <div style={{ textAlign: 'left' }}>Harga</div>
      <div style={{ textAlign: 'left' }}>Total</div>
      <div style={{ textAlign: 'left' }}>Actions</div>
    </div>
  );

  const renderOrderItemsGrid = (order: SalesOrder) => {
    if (!order.items || order.items.length === 0) {
      return (
        <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          No items found for this SO.
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {order.items.map((product: SOItem, idx: number) => (
          <div
            key={product.id || idx}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 70px 90px 110px auto',
              gap: '8px',
              alignItems: 'center',
              padding: '6px 8px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '4px',
              fontSize: '13px',
              borderLeft: '3px solid var(--primary)',
            }}
          >
            <div style={{ fontWeight: 'bold' }}>
              <div>{product.productName}</div>
              {(() => {
                const info = getRemainingInfo(product.productName || '', order.soNo || '', product.productKode || product.productId || '');
                if (!info) return null;
                return (
                  <div style={{ marginTop: '2px' }}>
                    <span
                      title={`Total Delivered: ${info.delivered}`}
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
                      Remain: {info.remaining} {product.unit}
                    </span>
                  </div>
                );
              })()}
            </div>
            <div style={{ textAlign: 'center', fontWeight: 600 }}>
              <strong style={{ fontSize: '13px' }}>
                {Number(product.qty || 0).toLocaleString('id-ID')} {(product.unit || 'PCS').toUpperCase()}
              </strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>
                Rp {Math.ceil(getProductPriceSatuan(product) || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <strong style={{ fontSize: '13px', color: '#2e7d32' }}>
                Rp {Math.ceil(product.total || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
              </strong>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '3px',
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
              }}
            >
              <Button
                variant="secondary"
                onClick={() => handleCekBOMPerProduct(order, product)}
                style={{ fontSize: '10px', padding: '2px 5px', minWidth: 'auto', borderWidth: '0.5px' }}
              >
                BOM
              </Button>
              {order.status === 'OPEN' && (
                <>
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      const newSpecNote = prompt(
                        `Edit Spec Note untuk ${product.productName}:`,
                        product.specNote && !product.specNote.includes('Auto-generated') ? product.specNote : ''
                      );
                      if (newSpecNote !== null) {
                        const updatedItems = order.items!.map((it: SOItem) =>
                          it.id === product.id ? { ...it, specNote: newSpecNote } : it
                        );
                        const ordersArray = Array.isArray(orders) ? orders : [];
                        const updatedOrders = ordersArray.map(o =>
                          o.id === order.id ? { ...o, items: updatedItems } : o
                        );
                        await storageService.set(StorageKeys.PACKAGING.SALES_ORDERS, updatedOrders);
                        setOrders(updatedOrders);
                      }
                    }}
                    style={{ fontSize: '10px', padding: '2px 5px', minWidth: 'auto', borderWidth: '0.5px' }}
                  >
                    Note
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      showConfirm(
                        `Hapus product ${product.productName} dari SO?`,
                        async () => {
                          const updatedItems = order.items!.filter((it: SOItem) => it.id !== product.id);
                          const updatedOrders = orders.map(o =>
                            o.id === order.id ? { ...o, items: updatedItems } : o
                          );
                          await storageService.set(StorageKeys.PACKAGING.SALES_ORDERS, updatedOrders);
                          setOrders(updatedOrders);
                          closeDialog();
                        },
                        () => closeDialog(),
                        'Delete Product'
                      );
                    }}
                    style={{ fontSize: '10px', padding: '2px 5px', minWidth: 'auto', borderWidth: '0.5px' }}
                  >
                    Del
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // TODO: Implement view toggle between cards and table
  const renderOrderViewToggle = () => (
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
        const isActive = orderViewMode === mode;
        const isLight = theme === 'light';

        const activeBg = isLight ? '#000' : '#fff';
        const inactiveBg = 'transparent';
        const activeColor = isLight ? '#fff' : '#000';
        const inactiveColor = isLight ? '#000' : '#fff';

        return (
          <button
            key={mode}
            type="button"
            onClick={() => setOrderViewMode(mode)}
            style={{
              padding: '6px 14px',
              border: 'none',
              backgroundColor: isActive ? activeBg : inactiveBg,
              color: isActive ? activeColor : inactiveColor,
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s ease, color 0.2s ease',
            }}
          >
            {mode === 'cards' ? 'Cards' : 'Table'}
          </button>
        );
      })}
    </div>
  );

  const renderOrderCardView = (ordersList: SalesOrder[], emptyMessage: string) => {
    if (!ordersList || ordersList.length === 0) {
      return (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          {emptyMessage}
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {ordersList.map((order, idx) => {
          const accentColor = getRowColor(order.soNo);
          const { date, time } = formatDateSimple(order.created);
          const totalQty = (order.items || []).reduce((sum, product) => sum + (Number(product.qty) || 0), 0);
          const totalValue = (order.items || []).reduce((sum, product) => {
            const explicitTotal = Number(product.total);
            if (explicitTotal && !Number.isNaN(explicitTotal)) {
              return sum + explicitTotal;
            }
            const qty = Number(product.qty) || 0;
            const unitPrice = getProductPriceSatuan(product) || 0;
            return sum + qty * unitPrice;
          }, 0);

          // Warna selang-seling untuk SO card - sync sama getRowColor biar ga tabrakan di light mode
          const theme = document.documentElement.getAttribute('data-theme') || 'dark';
          const cardBgColors = theme === 'light'
            ? [
              '#f0f7ff',
              '#f0fff4',
              '#fff5f0',
              '#f5f0ff',
              '#fffef0',
            ]
            : [
              'rgba(33, 150, 243, 0.25)',
              'rgba(76, 175, 80, 0.25)',
              'rgba(255, 152, 0, 0.25)',
              'rgba(156, 39, 176, 0.25)',
              'rgba(96, 125, 139, 0.25)',
            ];
          const cardBgColor = cardBgColors[idx % cardBgColors.length];

          return (
            <div key={order.id} style={{ backgroundColor: cardBgColor, borderRadius: '8px', padding: '1px' }}>
              <Card
                style={{
                  borderLeft: `4px solid ${accentColor}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ minWidth: '150px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '2px' }}>SO No</div>
                    <div style={{ fontSize: '16px', fontWeight: 600 }}>{order.soNo || '-'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{order.customer || '-'}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className={`status-badge status-${order.status.toLowerCase()}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                        {order.status}
                      </span>
                      {order.confirmed && (
                        <span className="status-badge status-success" style={{ fontSize: '10px', padding: '2px 6px' }}>
                          PPIC Confirmed
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Payment:&nbsp;
                      <strong>{order.paymentTerms}</strong>
                      {order.paymentTerms === 'TOP' && order.topDays ? ` (${order.topDays}d)` : ''}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Created:&nbsp;
                      <strong>{date}</strong>
                      {time && ` · ${time}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '140px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Items:&nbsp;
                      <strong>{(order.items || []).length}</strong>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Qty:&nbsp;
                      <strong>{totalQty.toLocaleString('id-ID')}</strong>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Value:&nbsp;
                      <strong>Rp {Math.round(totalValue).toLocaleString('id-ID')}</strong>
                    </div>
                  </div>
                </div>

                {order.globalSpecNote && (
                  <div style={{ marginTop: '8px', padding: '6px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <strong>Global Spec Note:</strong> {order.globalSpecNote}
                  </div>
                )}

                <div style={{ marginTop: '10px' }}>
                  <div style={{ marginBottom: '4px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Items</div>
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px', backgroundColor: 'var(--bg-primary)' }}>
                    {renderOrderItemsHeader()}
                    <div style={{ marginTop: '6px' }}>
                      {renderOrderItemsGrid(order)}
                    </div>
                  </div>
                </div>

                {order.status === 'OPEN' && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <Button variant="secondary" onClick={() => handleEdit(order)} style={{ fontSize: '11px', padding: '4px 10px' }}>
                      Edit
                    </Button>
                    {!order.confirmed && (
                      <Button variant="primary" onClick={() => handleConfirm(order)} style={{ fontSize: '11px', padding: '4px 10px' }}>
                        Confirm
                      </Button>
                    )}
                    <Button variant="danger" onClick={() => handleDelete(order)} style={{ fontSize: '11px', padding: '4px 10px' }}>
                      Delete
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          );
        })}
      </div>
    );
  };

  // Handle Cek BOM per product
  const handleCekBOMPerProduct = async (_item: SalesOrder, product: SOItem) => {
    try {
      const latestMaterials = await storageService.get<Material[]>('materials') || [];
      const latestBomData = await storageService.get<any[]>('bom') || [];

      const productId = (product.productId || product.productKode || '').toString().trim();
      const hasBOM = latestBomData.some(b => {
        const bomProductId = (b.product_id || b.kode || '').toString().trim();
        return bomProductId === productId;
      });

      if (!hasBOM) {
        showToast(`BOM belum dikonfigurasi untuk ${product.productName}. Silakan tambahkan BOM di Master Products terlebih dahulu.`, 'warning');
        return;
      }

      const productBOM = latestBomData.filter(b => {
        const bomProductId = (b.product_id || b.kode || '').toString().trim();
        return bomProductId === productId;
      });

      const bomItems: any[] = [];
      productBOM.forEach(bom => {
        const materialId = (bom.material_id || '').toString().trim();
        const material = latestMaterials.find(m =>
          ((m.material_id || m.kode || '').toString().trim()) === materialId
        );

        const qty = (product.qty || 0) * (bom.ratio || 1);

        bomItems.push({
          materialId: materialId,
          materialName: material?.nama || materialId,
          unit: material?.satuan || 'PCS',
          qty: qty,
          ratio: bom.ratio || 1,
        });
      });

      const bomText = bomItems.map(b =>
        `• ${b.materialName} (${b.materialId})\n  Qty: ${b.qty} ${b.unit} (Ratio: ${b.ratio})`
      ).join('\n\n');

      showToast(`BOM tersedia untuk ${product.productName}`, 'success');
    } catch (error: any) {
      showToast(`Error loading BOM: ${error.message}`, 'error');
    }
  };

  // Optimized map to store total delivered qty for each (SO, Product) pair
  const itemDeliveredTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    const validDeliveries = Array.isArray(deliveries) ? deliveries.filter(d => d && d.status !== 'CANCELLED' && !d.deleted) : [];

    validDeliveries.forEach(delivery => {
      const deliveryItems = delivery.items || [];
      deliveryItems.forEach((item: any) => {
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
    const matchedSO = orders.find(
      so => (so.soNo || '').toString().trim() === trimmedSoNo
    );
    if (!matchedSO || !matchedSO.items) return null;

    const soItem = matchedSO.items.find((item: any) => {
      const soProductName = (item.productName || item.product || '')
        .toString()
        .trim()
        .toLowerCase();
      const targetProductName = productName
        .toString()
        .trim()
        .toLowerCase();

      const soProductCode = (item.productId || item.productKode || item.itemSku || '')
        .toString()
        .trim()
        .toLowerCase();
      const targetProductCode = (productCode || '')
        .toString()
        .trim()
        .toLowerCase();

      return (
        (targetProductName && soProductName === targetProductName) ||
        (targetProductCode && soProductCode === targetProductCode)
      );
    });

    if (!soItem) return null;

    const orderQty = Number(soItem.qty || 0);
    const delivered =
      itemDeliveredTotals[
      `${trimmedSoNo}|${(soItem.productName || '').toString().trim()}`
      ] || 0;

    const remaining = Math.max(0, orderQty - delivered);

    // 🔴 HIDE kalau QT == remaining (belum ada delivery sama sekali)
    if (orderQty === remaining) return null;

    return {
      orderQty,
      delivered,
      remaining
    };
  }, [orders, itemDeliveredTotals]);


  // Handle Confirm SO (kirim ke PPIC)
  const handleConfirm = async (item: SalesOrder) => {
    if (item.status === 'CLOSE') {
      showToast(`Cannot confirm SO ${item.soNo}. SO dengan status CLOSE tidak bisa dikonfirmasi.`, 'error');
      return;
    }

    showConfirm(
      `Confirm SO ${item.soNo}?\n\nSO akan dikirim ke PPIC untuk diproses (buat SPK).`,
      async () => {
        try {
          // Update SO status menjadi CONFIRMED atau tambahkan flag confirmed
          const ordersArray = Array.isArray(orders) ? orders : [];
          const updatedOrders = ordersArray.map(o => {
            if (o.id === item.id) {
              return {
                ...o,
                status: 'OPEN' as any, // Atau bisa buat status CONFIRMED
                confirmed: true,
                confirmedAt: new Date().toISOString(),
                confirmedBy: 'Sales',
              };
            }
            return o;
          });

          await storageService.set(StorageKeys.PACKAGING.SALES_ORDERS, updatedOrders);
          setOrders(updatedOrders);
          closeDialog();
          showToast(`SO ${item.soNo} telah dikonfirmasi dan dikirim ke PPIC untuk diproses.`, 'success');
        } catch (error: any) {
          showToast(`Error confirming SO: ${error.message}`, 'error');
        }
      },
      () => closeDialog(),
      'Confirm SO'
    );
  };


  // Format date sederhana - format: dd/mm/yyyy hh:mm:ss
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

  // Flatten SO data untuk table view (Excel-like) - setiap item jadi row terpisah
  const flattenedSOData = useMemo(() => {
    if (orderViewMode !== 'table') return [];

    const flattened: any[] = [];
    paginatedOrders.forEach((order: SalesOrder) => {
      if (!order.items || order.items.length === 0) {
        // Jika tidak ada items, tetap tampilkan SO sebagai 1 row
        flattened.push({
          id: order.id,
          soNo: order.soNo,
          customer: order.customer,
          paymentTerms: order.paymentTerms,
          topDays: order.topDays,
          status: order.status,
          created: order.created,
          confirmed: order.confirmed,
          productCode: '-',
          productName: '-',
          padCode: '-',
          qty: 0,
          unit: '-',
          price: 0,
          total: 0,
          _order: order, // Keep reference untuk actions
        });
      } else {
        // Flatten setiap item menjadi row terpisah
        order.items.forEach((item: SOItem, idx: number) => {
          flattened.push({
            id: `${order.id}-item-${item.id || idx}`,
            soNo: order.soNo,
            customer: order.customer,
            paymentTerms: order.paymentTerms,
            topDays: order.topDays,
            status: order.status,
            created: order.created,
            confirmed: order.confirmed,
            productCode: item.productKode || item.productId || '-',
            productName: item.productName || '-',
            padCode: item.padCode || '-',
            qty: item.qty || 0,
            unit: item.unit || 'PCS',
            price: item.price || 0,
            total: item.total || 0,
            specNote: item.specNote,
            _order: order, // Keep reference untuk actions
          });
        });
      }
    });
    return flattened;
  }, [paginatedOrders, orderViewMode]);

  const columns = useMemo(() => [
    {
      key: 'soNo',
      header: t('salesOrder.number') || 'SO No',
      render: (item: any) => (
        <strong style={{ color: '#2e7d32', fontSize: '13px' }}>{item.soNo}</strong>
      ),
    },
    {
      key: 'status',
      header: t('common.status') || 'Status',
      render: (item: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span className={`status-badge status-${item.status?.toLowerCase()}`} style={{ fontSize: '11px' }}>
            {item.status}
          </span>
          {item.confirmed && (
            <span className="status-badge status-success" style={{ fontSize: '10px', padding: '2px 6px' }}>
              PPIC Confirmed
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'customer',
      header: t('master.customerName') || 'Customer',
      render: (item: any) => {
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        const color = theme === 'light' ? '#000000' : '#ffffff';
        return (
          <span style={{ fontSize: '13px', color }}>{item.customer}</span>
        );
      },
    },
    {
      key: 'productCode',
      header: t('master.productCode') || 'Product Code',
      render: (item: any) => (
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.productCode}</span>
      ),
    },
    {
      key: 'productName',
      header: t('master.productName') || 'Product',
      render: (item: any) => (
        <span style={{ fontSize: '13px' }}>{item.productName}</span>
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
      header: t('common.quantity') || 'Qty',
      render: (item: any) => (
        <span style={{ fontSize: '13px', textAlign: 'right', display: 'block' }}>
          {Number(item.qty || 0).toLocaleString('id-ID')} {item.unit}
        </span>
      ),
    },
    {
      key: 'remaining',
      header: 'Remaining',
      render: (item: any) => {
        const info = getRemainingInfo(item.productName || item.product || '', item.soNo || '', item.productCode || '');
        if (!info) return <span style={{ color: 'var(--text-secondary)' }}>-</span>;
        return (
          <span
            title={`Total Delivered: ${info.delivered}`}
            style={{
              padding: '2px 6px',
              backgroundColor: info.remaining === 0 ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)',
              color: info.remaining === 0 ? '#4caf50' : '#ff9800',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              border: `1px solid ${info.remaining === 0 ? '#4caf50' : '#ff9800'}`,
              textAlign: 'center',
              display: 'block',
              width: 'fit-content',
              margin: '0 auto'
            }}
          >
            {info.remaining.toLocaleString('id-ID')} {item.unit || 'PCS'}
          </span>
        );
      }
    },
    {
      key: 'price',
      header: t('common.price') || 'Unit Price',
      render: (item: any) => (
        <span style={{ fontSize: '12px', textAlign: 'right', display: 'block' }}>
          Rp {Math.ceil(item.price || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
        </span>
      ),
    },
    {
      key: 'total',
      header: t('common.total') || 'Total',
      render: (item: any) => (
        <strong style={{ fontSize: '13px', color: '#2e7d32', textAlign: 'right', display: 'block' }}>
          Rp {Math.ceil(item.total || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
        </strong>
      ),
    },
    {
      key: 'paymentTerms',
      header: 'Payment Terms',
      render: (item: any) => (
        <span style={{ fontSize: '12px' }}>
          {item.paymentTerms}
          {item.paymentTerms === 'TOP' && item.topDays && ` (${item.topDays}d)`}
        </span>
      ),
    },
    {
      key: 'created',
      header: t('common.createdAt') || 'Created',
      render: (item: any) => {
        const { date } = formatDateSimple(item.created);
        return (
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {date}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: t('common.actions') || 'Actions',
      render: (item: any) => {
        const order = item._order;
        if (!order) return null;
        return (
          <SOActionMenu
            onEdit={() => handleEdit(order)}
            onDelete={() => handleDelete(order)}
            onConfirm={() => handleConfirm(order)}
            status={order.status}
            ppicNotified={order.ppicNotified}
          />
        );
      },
    },
  ], [t]);

  const orderEmptyMessage = activeTab === 'outstanding' ? 'No outstanding orders' : 'No orders found';

  // Columns khusus untuk Quotation table
  const quotationColumns = useMemo(() => [
    {
      key: 'soNo',
      header: 'Quotation No',
      render: (item: SalesOrder) => (
        <strong style={{ color: '#2e7d32', fontSize: '14px' }}>{item.soNo}</strong>
      ),
    },
    {
      key: 'customer',
      header: t('master.customerName') || 'Customer',
      render: (item: SalesOrder) => {
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        const color = theme === 'light' ? '#000000' : '#ffffff';
        return (
          <span style={{ color }}>{item.customer}</span>
        );
      },
    },
    {
      key: 'paymentTerms',
      header: 'Payment Terms',
      render: (item: SalesOrder) => (
        <span>
          {item.paymentTerms}
          {item.paymentTerms === 'TOP' && item.topDays && ` (${item.topDays} days)`}
        </span>
      ),
    },
    {
      key: 'matchedSoNo',
      header: 'Matched SO',
      render: (item: SalesOrder) => (
        <span style={{ color: item.matchedSoNo ? '#4caf50' : 'var(--text-secondary)' }}>
          {item.matchedSoNo || '-'}
        </span>
      ),
    },
    {
      key: 'created',
      header: t('common.createdAt') || 'Created',
      render: (item: SalesOrder) => {
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
      header: t('common.actions') || 'Actions',
      render: (item: SalesOrder) => (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={() => handleViewQuotation(item)} style={{ fontSize: '11px', padding: '4px 8px' }}>
            {t('common.view') || 'View'}
          </Button>
          <Button variant="secondary" onClick={() => handleEditQuotation(item)} style={{ fontSize: '11px', padding: '4px 8px' }}>
            {t('common.edit') || 'Edit'}
          </Button>
          <Button variant="danger" onClick={() => handleDeleteQuotation(item)} style={{ fontSize: '11px', padding: '4px 8px' }}>
            {t('common.delete') || 'Delete'}
          </Button>
        </div>
      ),
    },
  ], [t]);

  return (
    <div className="module-compact">


      {/* Create/Edit Form Dialog */}
      {showForm && (
        <div className="dialog-overlay" onClick={() => {
          setShowForm(false);
          setEditingOrder(null);
          setFormData({ soNo: '', customer: '', customerKode: '', paymentTerms: 'TOP', topDays: 30, items: [], globalSpecNote: '', category: 'packaging', created: '' });
          setCustomerSearch('');
          setProductInputValue({});
          setShowBOMPreview(false);
        }} style={{ zIndex: 10000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1200px', width: '95%', maxHeight: '90vh', overflowY: 'auto', zIndex: 10001, borderRadius: '10px' }}>
            <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '14px 18px', borderRadius: '10px 10px 0 0', color: 'white' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                {editingOrder ? `✏️ Edit SO: ${editingOrder.soNo}` : '➕ Create New Sales Order'}
              </h2>
            </div>

            <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '0 0 10px 10px' }}>
              <Input
                label="SO No * (Nomor PO dari Customer)"
                value={formData.soNo || ''}
                onChange={(v) => setFormData(prev => ({ ...prev, soNo: v }))}
                placeholder="Masukkan nomor PO dari customer..."
              />

              <Input
                label="Created Date *"
                type="datetime-local"
                value={formData.created ? new Date(formData.created).toISOString().slice(0, 16) : ''}
                onChange={(v) => {
                  const dateValue = v ? new Date(v).toISOString() : new Date().toISOString();
                  setFormData(prev => ({ ...prev, created: dateValue }));
                }}
              />

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Customer *
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={() => { }}
                    placeholder="Click to select customer..."
                    readOnly
                    onClick={() => setShowCustomerDialog(true)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  />
                  <Button
                    variant="secondary"
                    onClick={() => setShowCustomerDialog(true)}
                    style={{ fontSize: '12px', padding: '8px 16px' }}
                  >
                    Select
                  </Button>
                </div>
                {formData.customer && (
                  <p style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Selected: {formData.customerKode} - {formData.customer}
                  </p>
                )}
              </div>

              {/* Items Table */}
              <div style={{ marginTop: '24px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>Products</h3>
                  <Button variant="primary" onClick={handleAddItem} style={{ fontSize: '12px', padding: '6px 12px' }}>
                    + Add Product
                  </Button>
                </div>

                {(!formData.items || formData.items.length === 0) ? (
                  <p style={{ color: 'var(--text-secondary)', padding: '20px', textAlign: 'center' }}>
                    No products added. Click "+ Add Product" to add items.
                  </p>
                ) : (
                  <div style={{
                    overflowX: 'auto',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border)' }}>
                          <th style={{ padding: '8px', textAlign: 'left', backgroundColor: 'var(--bg-tertiary)' }}>Product</th>
                          <th style={{ padding: '8px', textAlign: 'left', backgroundColor: 'var(--bg-tertiary)' }}>Pad Code</th>
                          <th style={{ padding: '8px', textAlign: 'left', backgroundColor: 'var(--bg-tertiary)' }}>Qty</th>
                          <th style={{ padding: '8px', textAlign: 'left', backgroundColor: 'var(--bg-tertiary)' }}>Unit</th>
                          <th style={{ padding: '8px', textAlign: 'left', backgroundColor: 'var(--bg-tertiary)' }}>Price</th>
                          <th style={{ padding: '8px', textAlign: 'left', backgroundColor: 'var(--bg-tertiary)' }}>Total</th>
                          <th style={{ padding: '8px', textAlign: 'left', backgroundColor: 'var(--bg-tertiary)' }}>Inventory</th>
                          <th style={{ padding: '8px', textAlign: 'left', backgroundColor: 'var(--bg-tertiary)' }}>Spec Note</th>
                          <th style={{ padding: '8px', textAlign: 'center', backgroundColor: 'var(--bg-tertiary)' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(formData.items || []).map((item, index) => (
                          <tr
                            key={item.id}
                            style={{ borderBottom: '1px solid var(--border)' }}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <td style={{ padding: '8px' }}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input
                                  type="text"
                                  value={getProductInputDisplayValue(index, item)}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setProductInputValue(prev => ({ ...prev, [index]: value }));
                                    setProductSearch(prev => ({ ...prev, [index]: value })); // Store search state
                                    handleProductInputChange(index, value);
                                  }}
                                  onFocus={() => {
                                    // Clear input value saat focus untuk allow user typing
                                    setProductInputValue(prev => ({ ...prev, [index]: '' }));
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                  placeholder="Type product name or code..."
                                  style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    border: '1px solid var(--border)',
                                    borderRadius: '4px',
                                    backgroundColor: 'var(--bg-primary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                  }}
                                />
                                <Button
                                  variant="secondary"
                                  onClick={() => {
                                    setProductDialogSearch('');
                                    setShowProductDialog(index);
                                  }}
                                  style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap' }}
                                >
                                  Select
                                </Button>
                                {item.productId && (
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                      navigate('/packaging/master/inventory', {
                                        state: { highlightProduct: item.productId }
                                      });
                                    }}
                                    style={{ fontSize: '11px', padding: '4px 8px', whiteSpace: 'nowrap' }}
                                    title="Buka Inventory untuk product ini"
                                  >
                                    📊
                                  </button>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '8px' }}>
                              <input
                                key={`padCode-${item.id}`}
                                type="text"
                                value={item.padCode || ''}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleUpdateItem(index, 'padCode', e.target.value);
                                }}
                                onBlur={(e) => {
                                  e.stopPropagation();
                                  handleUpdateItem(index, 'padCode', e.target.value);
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                placeholder="Pad Code"
                                style={{
                                  width: '100px',
                                  padding: '6px 8px',
                                  border: '1px solid var(--border)',
                                  borderRadius: '4px',
                                  backgroundColor: 'var(--bg-primary)',
                                  color: 'var(--text-primary)',
                                  fontSize: '13px',
                                }}
                              />
                            </td>
                            <td style={{ padding: '8px' }}>
                              <input
                                key={`qty-${item.id}`}
                                type="text"
                                inputMode="decimal"
                                value={qtyInputValue[index] !== undefined ? qtyInputValue[index] : (item.qty !== undefined && item.qty !== null && item.qty !== 0 ? String(item.qty) : '')}
                                onFocus={(e) => {
                                  e.stopPropagation();
                                  const input = e.target as HTMLInputElement;
                                  const currentQty = item.qty;
                                  // Jika value adalah 0, langsung clear
                                  if (currentQty === 0 || currentQty === null || currentQty === undefined || String(currentQty) === '0') {
                                    setQtyInputValue(prev => ({ ...prev, [index]: '' }));
                                    input.value = '';
                                  } else {
                                    input.select();
                                  }
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  const input = e.target as HTMLInputElement;
                                  const currentQty = item.qty;
                                  // Clear jika value adalah 0 saat mouse down
                                  if (currentQty === 0 || currentQty === null || currentQty === undefined || String(currentQty) === '0') {
                                    setQtyInputValue(prev => ({ ...prev, [index]: '' }));
                                    input.value = '';
                                  }
                                }}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  let val = e.target.value;
                                  // Hapus semua karakter non-numeric kecuali titik dan koma
                                  val = val.replace(/[^\d.,]/g, '');
                                  const cleaned = removeLeadingZero(val);
                                  // ⚡ Update local state immediately for UI feedback - NO DEBOUNCE
                                  setQtyInputValue(prev => ({ ...prev, [index]: cleaned }));
                                }}
                                onBlur={(e) => {
                                  e.stopPropagation();
                                  const val = e.target.value;
                                  if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                                    handleUpdateItem(index, 'qty', 0);
                                    setQtyInputValue(prev => {
                                      const newVal = { ...prev };
                                      delete newVal[index];
                                      return newVal;
                                    });
                                  } else {
                                    handleUpdateItem(index, 'qty', Number(val));
                                    setQtyInputValue(prev => {
                                      const newVal = { ...prev };
                                      delete newVal[index];
                                      return newVal;
                                    });
                                  }
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                onKeyDown={(e) => {
                                  e.stopPropagation();
                                  const input = e.target as HTMLInputElement;
                                  const currentVal = input.value;
                                  // Jika kosong atau "0" dan user ketik angka 1-9, langsung replace
                                  if ((currentVal === '' || currentVal === '0') && /^[1-9]$/.test(e.key)) {
                                    e.preventDefault();
                                    const newVal = e.key;
                                    setQtyInputValue(prev => ({ ...prev, [index]: newVal }));
                                    input.value = newVal;
                                    handleUpdateItem(index, 'qty', newVal);
                                  }
                                }}
                                placeholder="0"
                                style={{
                                  width: '80px',
                                  padding: '6px 8px',
                                  border: '1px solid var(--border)',
                                  borderRadius: '4px',
                                  backgroundColor: 'var(--bg-primary)',
                                  color: 'var(--text-primary)',
                                  fontSize: '13px',
                                }}
                              />
                            </td>
                            <td style={{ padding: '8px' }}>
                              <input
                                key={`unit-${item.id}`}
                                type="text"
                                value={item.unit || 'PCS'}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  (e.target as HTMLInputElement).focus();
                                }}
                                onBeforeInput={(e) => {
                                  e.stopPropagation();
                                }}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleUpdateItem(index, 'unit', e.target.value);
                                }}
                                onInput={(e) => {
                                  e.stopPropagation();
                                  handleUpdateItem(index, 'unit', (e.target as HTMLInputElement).value);
                                }}
                                onBlur={(e) => {
                                  e.stopPropagation();
                                  handleUpdateItem(index, 'unit', e.target.value);
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                onKeyDown={(e) => {
                                  e.stopPropagation();
                                }}
                                style={{
                                  width: '80px',
                                  padding: '6px 8px',
                                  border: '1px solid var(--border)',
                                  borderRadius: '4px',
                                  backgroundColor: 'var(--bg-primary)',
                                  color: 'var(--text-primary)',
                                  fontSize: '13px',
                                }}
                              />
                            </td>
                            <td style={{ padding: '8px' }}>
                              <input
                                key={`price-${item.id}`}
                                type="text"
                                inputMode="decimal"
                                value={priceInputValue[index] !== undefined ? priceInputValue[index] : (item.price && item.price > 0 ? String(item.price) : '')}
                                onFocus={(e) => {
                                  e.stopPropagation();
                                  const input = e.target as HTMLInputElement;
                                  input.select();
                                }}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  let val = e.target.value;
                                  val = val.replace(/[^\d.,]/g, '');
                                  const cleaned = removeLeadingZero(val);
                                  setPriceInputValue(prev => ({ ...prev, [index]: cleaned }));
                                  handleUpdateItem(index, 'price', cleaned === '' ? 0 : Number(cleaned));
                                }}
                                onBlur={(e) => {
                                  e.stopPropagation();
                                  const val = e.target.value;
                                  const numVal = val === '' ? 0 : Number(val);
                                  if (isNaN(numVal) || numVal < 0) {
                                    handleUpdateItem(index, 'price', 0);
                                  } else {
                                    handleUpdateItem(index, 'price', numVal);
                                  }
                                  setPriceInputValue(prev => {
                                    const newVal = { ...prev };
                                    delete newVal[index];
                                    return newVal;
                                  });
                                }}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="0"
                                style={{
                                  width: '120px',
                                  padding: '6px 8px',
                                  border: '1px solid var(--border)',
                                  borderRadius: '4px',
                                  backgroundColor: 'var(--bg-primary)',
                                  color: 'var(--text-primary)',
                                  fontSize: '13px',
                                }}
                              />
                            </td>
                            <td style={{ padding: '8px', fontWeight: 'bold' }}>
                              Rp {item.total.toLocaleString('id-ID')}
                            </td>
                            <td style={{ padding: '8px' }}>
                              <input
                                key={`inventoryQty-${item.id}`}
                                type="text"
                                inputMode="decimal"
                                value={item.inventoryQty !== undefined && item.inventoryQty !== null && item.inventoryQty !== 0 ? String(item.inventoryQty) : ''}
                                onFocus={(e) => {
                                  e.stopPropagation();
                                  const input = e.target as HTMLInputElement;
                                  const currentQty = item.inventoryQty;
                                  if (currentQty === 0 || currentQty === null || currentQty === undefined || String(currentQty) === '0') {
                                    input.value = '';
                                  } else {
                                    input.select();
                                  }
                                }}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  let val = e.target.value;
                                  val = val.replace(/[^\d.,]/g, '');
                                  const cleaned = removeLeadingZero(val);
                                  handleUpdateItem(index, 'inventoryQty', cleaned === '' ? '' : cleaned);
                                }}
                                onBlur={(e) => {
                                  e.stopPropagation();
                                  const val = e.target.value;
                                  if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                                    handleUpdateItem(index, 'inventoryQty', 0);
                                  } else {
                                    handleUpdateItem(index, 'inventoryQty', Number(val));
                                  }
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                placeholder="0"
                                title="Inventory quantity yang akan masuk ke premonth stock"
                                style={{
                                  width: '80px',
                                  padding: '6px 8px',
                                  border: '1px solid var(--border)',
                                  borderRadius: '4px',
                                  backgroundColor: 'var(--bg-primary)',
                                  color: 'var(--text-primary)',
                                  fontSize: '13px',
                                }}
                              />
                            </td>
                            <td style={{ padding: '8px' }}>
                              <input
                                key={`specNote-${item.id}`}
                                type="text"
                                value={item.specNote || ''}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  (e.target as HTMLInputElement).focus();
                                }}
                                onBeforeInput={(e) => {
                                  e.stopPropagation();
                                }}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleUpdateItem(index, 'specNote', e.target.value);
                                }}
                                onInput={(e) => {
                                  e.stopPropagation();
                                  handleUpdateItem(index, 'specNote', (e.target as HTMLInputElement).value);
                                }}
                                onBlur={(e) => {
                                  e.stopPropagation();
                                  handleUpdateItem(index, 'specNote', e.target.value);
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                onKeyDown={(e) => {
                                  e.stopPropagation();
                                }}
                                placeholder="Spec note..."
                                style={{
                                  width: '150px',
                                  padding: '6px 8px',
                                  border: '1px solid var(--border)',
                                  borderRadius: '4px',
                                  backgroundColor: 'var(--bg-primary)',
                                  color: 'var(--text-primary)',
                                  fontSize: '13px',
                                }}
                              />
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <Button
                                variant="danger"
                                onClick={() => handleRemoveItem(index)}
                                style={{ fontSize: '11px', padding: '4px 8px' }}
                              >
                                Remove
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 'bold' }}>
                          <td colSpan={5} style={{ padding: '8px', textAlign: 'right' }}>Total:</td>
                          <td style={{ padding: '8px' }}>
                            Rp {((formData.items || []).reduce((sum, i) => sum + i.total, 0)).toLocaleString('id-ID')}
                          </td>
                          <td colSpan={3}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                    Payment Terms *
                  </label>
                  <select
                    value={formData.paymentTerms || 'TOP'}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value as any }))}
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
                    <option value="TOP">TOP (Term of Payment)</option>
                    <option value="COD">COD (Cash on Delivery)</option>
                    <option value="CBD">CBD (Cash Before Delivery)</option>
                  </select>
                </div>
                {formData.paymentTerms === 'TOP' && (
                  <Input
                    label="TOP Days *"
                    type="number"
                    value={String(formData.topDays || 30)}
                    onChange={(v) => {
                      const cleaned = removeLeadingZero(v);
                      setFormData(prev => ({ ...prev, topDays: Number(cleaned) || 30 }));
                    }}
                  />
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Category
                </label>
                <select
                  value={formData.category || 'packaging'}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
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
                  <option value="packaging">Packaging</option>
                </select>
              </div>

              <Input
                label="Global Spec Note (Optional)"
                value={formData.globalSpecNote || ''}
                onChange={(v) => setFormData(prev => ({ ...prev, globalSpecNote: v }))}
                placeholder="Global specification note for all products..."
              />

              {/* BOM Preview */}
              {formData.items && formData.items.length > 0 && (
                <div style={{ marginTop: '24px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>BOM Preview (Aggregated)</h3>
                    <Button
                      variant="secondary"
                      onClick={() => setShowBOMPreview(!showBOMPreview)}
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      {showBOMPreview ? 'Hide' : 'Show'} BOM
                    </Button>
                  </div>

                  {showBOMPreview && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '4px',
                      border: '1px solid var(--border)'
                    }}>
                      {generateBOMPreview().length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                          No BOM data available. Please ensure products have BOM configured.
                        </p>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)' }}>
                              <th style={{ padding: '6px', textAlign: 'left' }}>Material</th>
                              <th style={{ padding: '6px', textAlign: 'left' }}>Unit</th>
                              <th style={{ padding: '6px', textAlign: 'right' }}>Qty</th>
                              <th style={{ padding: '6px', textAlign: 'right' }}>Price/Unit</th>
                              <th style={{ padding: '6px', textAlign: 'right' }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {generateBOMPreview().map((bom, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '6px' }}>{bom.materialName}</td>
                                <td style={{ padding: '6px' }}>{bom.unit}</td>
                                <td style={{ padding: '6px', textAlign: 'right' }}>{bom.qty.toLocaleString('id-ID')}</td>
                                <td style={{ padding: '6px', textAlign: 'right' }}>Rp {(bom.pricePerUnit || 0).toLocaleString('id-ID')}</td>
                                <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>
                                  Rp {(bom.totalPrice || 0).toLocaleString('id-ID')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                <Button
                  onClick={() => {
                    setShowForm(false);
                    setEditingOrder(null);
                    setFormData({ soNo: '', customer: '', customerKode: '', paymentTerms: 'TOP', topDays: 30, items: [], globalSpecNote: '', category: 'packaging', created: '' });
                    setCustomerSearch('');
                    setProductInputValue({});
                    setShowBOMPreview(false);
                  }}
                  variant="secondary"
                  style={{ minWidth: '80px', padding: '6px 12px', fontSize: '12px' }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} variant="primary" style={{ minWidth: '80px', padding: '6px 12px', fontSize: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  {editingOrder ? 'Update SO' : 'Save SO'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quotation Preview Dialog */}
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
                        <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid var(--border)', width: '60px' }}>BOM</th>
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
                        const prodHasBOM = bomProductIds.has(productId.toLowerCase());
                        const handleSelect = () => {
                          if (showProductDialog !== null) {
                            const index = showProductDialog;
                            
                            // Directly set product data without searching again
                            const newItems = [...(formData.items || [])];
                            const item = { ...newItems[index] };
                            
                            // Set product info
                            const productIdValue = String(prod.product_id || prod.kode || prod.id || '').trim();
                            item.productId = productIdValue || prod.nama || '';
                            item.productKode = productIdValue || prod.nama || '';
                            item.productName = prod.nama || '';
                            item.unit = prod.satuan || 'PCS';
                            item.price = prod.hargaSales || prod.hargaFg || (prod as any).harga || 0;
                            item.total = (item.qty || 0) * item.price;
                            item.padCode = prod.padCode || '';
                            
                            // Load BOM
                            const bomDataArray = Array.isArray(bomData) ? bomData : [];
                            const productBOM = bomDataArray.filter(b => {
                              if (!b) return false;
                              const bomProductId = String(b.product_id || b.kode || '').trim().toLowerCase();
                              const itemProductId = String(item.productId || '').trim().toLowerCase();
                              return bomProductId && itemProductId && bomProductId === itemProductId;
                            }).map(bom => {
                              const bomMaterialId = String(bom.material_id || '').trim();
                              const materialsArray = Array.isArray(materials) ? materials : [];
                              const material = materialsArray.find(m => {
                                const mId = String(m.material_id || m.kode || '').trim();
                                return mId === bomMaterialId && mId !== '';
                              });
                              return {
                                materialName: (material?.nama || bom.material_id || bomMaterialId || '').toString(),
                                materialId: bomMaterialId,
                                unit: material?.satuan || 'PCS',
                                qty: (item.qty || 0) * (bom.ratio || 1),
                                ratio: bom.ratio || 1,
                                pricePerUnit: material?.priceMtr || material?.harga || 0,
                              };
                            });
                            item.bom = productBOM || [];
                            
                            newItems[index] = item;
                            setFormData(prev => ({ ...prev, items: newItems }));
                            
                            // Clear productInputValue agar display value ter-update
                            setProductInputValue(prev => {
                              const updated = { ...prev };
                              delete updated[index];
                              return updated;
                            });
                            
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
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <div
                                style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  backgroundColor: prodHasBOM ? '#388e3c' : '#ff9800',
                                  display: 'inline-block',
                                  margin: '0 auto',
                                }}
                                title={prodHasBOM ? 'Memiliki BOM' : 'Tidak memiliki BOM'}
                              />
                            </td>
                            <td style={{ padding: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>{prod.kode || prod.product_id || '-'}</span>
                                {hasBOM(prod) && (
                                  <span style={{
                                    backgroundColor: 'var(--primary-color)',
                                    color: 'white',
                                    fontSize: '10px',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontWeight: 'bold'
                                  }}>
                                    BOM
                                  </span>
                                )}
                              </div>
                            </td>
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
                  Showing {filteredProductsForDialog.length} of {productDialogSearch ? products.filter(p => {
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
            <Card
              title="Select Customer"
              className="dialog-card"
            >
              <div style={{ marginBottom: '16px' }}>
                <input
                  type="text"
                  value={customerDialogSearch}
                  onChange={(e) => setCustomerDialogSearch(e.target.value)}
                  placeholder="Search by customer code or name..."
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
                {filteredCustomersForDialog.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No customers found
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-tertiary)', zIndex: 10 }}>
                      <tr>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid var(--border)' }}>Code</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid var(--border)' }}>Name</th>
                        <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid var(--border)' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomersForDialog.map(c => {
                        const handleSelect = () => {
                          setCustomerSearch(c.nama);
                          setFormData(prev => ({
                            ...prev,
                            customer: c.nama,
                            customerKode: c.kode,
                          }));
                          setShowCustomerDialog(false);
                          setCustomerDialogSearch('');
                        };
                        return (
                          <tr
                            key={c.id}
                            style={{
                              borderBottom: '1px solid var(--border)',
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            onClick={handleSelect}
                          >
                            <td style={{ padding: '12px' }}>{c.kode || '-'}</td>
                            <td style={{ padding: '12px' }}>{c.nama || '-'}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <Button
                                variant="primary"
                                onClick={(e) => {
                                  e?.stopPropagation?.();
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
                )}
              </div>
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Showing {filteredCustomersForDialog.length} of {customerDialogSearch ? customers.filter(c => {
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

      {showQuotationPreview && quotationPreviewData && quotationPreviewHtml && (
        <div className="dialog-overlay" onClick={() => setShowQuotationPreview(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '95%', maxHeight: '95vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <Card
              title={`Quotation Preview - ${quotationPreviewData.soNo}`}
              className="dialog-card"
              style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
            >
              {/* HTML Preview using iframe */}
              <div style={{ flex: 1, marginBottom: '16px', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                <iframe
                  srcDoc={quotationPreviewHtml}
                  style={{
                    width: '100%',
                    height: '600px',
                    border: 'none',
                    borderRadius: '4px',
                  }}
                  title="Quotation Preview"
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={() => setShowQuotationPreview(false)}>
                  Close
                </Button>
                <Button variant="secondary" onClick={() => {
                  handleSaveQuotationPDF(quotationPreviewData);
                  setShowQuotationPreview(false);
                }}>
                  💾 Save to PDF
                </Button>
                <Button variant="primary" onClick={() => {
                  handlePrintQuotation(quotationPreviewData);
                  setShowQuotationPreview(false);
                }}>
                  🖨️ Print
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Orders Table / Quotation Tab */}
      <Card style={{ position: orderViewMode === 'cards' ? 'sticky' : 'relative', top: orderViewMode === 'cards' ? 0 : 'auto', zIndex: orderViewMode === 'cards' ? 100 : 'auto', marginBottom: orderViewMode === 'cards' ? '12px' : '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h1 style={{ margin: 0 }}>Sales Orders</h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
            <Button variant="secondary" onClick={handleImportExcel}>📤 Import Excel</Button>
            <Button onClick={handleCreate}>+ Create SO</Button>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          <div className="tab-container" style={{ marginBottom: 0, flex: '1 1 auto' }}>
            <button
              className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('all');
              }}
            >
              All Orders
            </button>
            <button
              className={`tab-button ${activeTab === 'outstanding' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('outstanding');
                setStatusFilter('all'); // Reset status filter saat switch ke Outstanding
              }}
            >
              Outstanding ({(Array.isArray(orders) ? orders : []).filter(o => o.status === 'OPEN').length})
            </button>
            <button
              className={`tab-button ${activeTab === 'quotation' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('quotation');
              }}
            >
              Quotation
            </button>
          </div>

          {/* Filter & Search - Compact di dalam card */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap', flex: '0 0 auto' }}>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by SO No, Customer..."
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
            <div style={{ minWidth: '120px' }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                disabled={activeTab === 'outstanding'}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  backgroundColor: activeTab === 'outstanding' ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                  color: activeTab === 'outstanding' ? 'var(--text-secondary)' : 'var(--text-primary)',
                  fontSize: '13px',
                  cursor: activeTab === 'outstanding' ? 'not-allowed' : 'pointer',
                  opacity: activeTab === 'outstanding' ? 0.6 : 1,
                }}
              >
                <option value="all">All Status</option>
                <option value="OPEN">OPEN</option>
                <option value="CLOSE">CLOSE</option>
              </select>
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
            {activeTab !== 'quotation' && (
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
                  const isActive = orderViewMode === mode;
                  const isLight = theme === 'light';

                  const activeBg = isLight ? '#000' : '#fff';
                  const inactiveBg = 'transparent';
                  const activeColor = isLight ? '#fff' : '#000';
                  const inactiveColor = isLight ? '#000' : '#fff';

                  return (
                    <button
                      key={mode}
                      onClick={() => setOrderViewMode(mode)}
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
        </div>
      </Card>

      <div className="tab-content">
        {activeTab === 'quotation' ? (
          /* Quotation Table List */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>Quotations</h2>
              <Button variant="primary" onClick={() => setShowQuotationFormDialog(true)}>
                + Create Quotation
              </Button>
            </div>
            <Table
              columns={quotationColumns}
              data={filteredQuotations}
              showPagination={false}
              onRowClick={(_item: SalesOrder) => {
                // Optional: Show detail on row click
              }}
              getRowStyle={(item: SalesOrder) => ({
                backgroundColor: getRowColor(item.soNo),
              })}
              emptyMessage="No quotations found. Click '+ Create Quotation' to create a new quotation."
            />
          </div>
        ) : (
          <>
            {orderViewMode === 'cards'
              ? renderOrderCardView(paginatedOrders, orderEmptyMessage)
              : (
                <Table
                  columns={columns}
                  data={flattenedSOData}
                  showPagination={false}
                  onRowClick={(_item: any) => {
                    // Optional: Show detail on row click
                  }}
                  getRowStyle={(item: any) => ({
                    backgroundColor: getRowColor(item.soNo),
                  })}
                  emptyMessage={orderEmptyMessage}
                />
              )
            }
            
            {/* Pagination Controls */}
            {filteredOrders.length > itemsPerPage && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                marginTop: '24px',
                padding: '16px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '8px',
              }}>
                <Button
                  variant="secondary"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  ← Previous
                </Button>
                
                <div style={{
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      style={{
                        padding: '6px 10px',
                        border: page === currentPage ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                        backgroundColor: page === currentPage ? 'var(--primary)' : 'var(--bg-primary)',
                        color: page === currentPage ? '#fff' : 'var(--text-primary)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: page === currentPage ? '600' : '400',
                      }}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                
                <Button
                  variant="secondary"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  Next →
                </Button>
                
                <div style={{
                  marginLeft: '12px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  fontWeight: '500',
                }}>
                  Page {currentPage} of {totalPages} ({filteredOrders.length} total)
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Hidden Popup untuk trigger re-render saat edit */}
      {showHiddenPopup && (
        <div
          style={{
            position: 'fixed',
            top: '-9999px',
            left: '-9999px',
            width: '1px',
            height: '1px',
            opacity: 0,
            pointerEvents: 'none',
            zIndex: -1,
          }}
          onClick={() => setShowHiddenPopup(false)}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              setShowHiddenPopup(false);
            }
          }}
        >
          <input
            type="text"
            autoFocus
            style={{ width: '1px', height: '1px', opacity: 0 }}
            onFocus={() => {
              // Force focus ke form setelah popup muncul
              setTimeout(() => {
                const firstInput = document.querySelector('input[type="text"], input[type="number"]') as HTMLInputElement;
                if (firstInput) {
                  firstInput.focus();
                }
              }, 50);
            }}
          />
        </div>
      )}

      {/* Quotation Form Dialog */}
      {showQuotationFormDialog && (
        <div className="dialog-overlay" onClick={() => setShowQuotationFormDialog(false)} style={{ zIndex: 10000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', width: '95%', maxHeight: '95vh', overflowY: 'auto', zIndex: 10001 }}>
            <Card
              title={editingQuotation ? `Edit Quotation - ${editingQuotation.soNo}` : "Create Quotation"}
              className="dialog-card"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Input
                  label="Quotation No"
                  value={quotationFormData.soNo || ''}
                  onChange={(v) => setQuotationFormData({ ...quotationFormData, soNo: v })}
                  placeholder={editingQuotation ? "Quotation No" : "Auto-generated: 00001/QUO/TLJP/XII/2025"}
                  disabled={true}
                />

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                    Customer * (Type to search)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={quotationCustomerSearch}
                      onChange={(e) => {
                        setQuotationCustomerSearch(e.target.value);
                        setShowQuotationCustomerDropdown(true);
                        const customer = customers.find(c =>
                          (c.nama || '').toLowerCase() === e.target.value.toLowerCase() ||
                          (c.kode || '').toLowerCase() === e.target.value.toLowerCase()
                        );
                        if (customer) {
                          setQuotationFormData({
                            ...quotationFormData,
                            customer: customer.nama,
                            customerKode: customer.kode,
                          });
                        }
                      }}
                      onFocus={() => setShowQuotationCustomerDropdown(true)}
                      onBlur={() => setTimeout(() => setShowQuotationCustomerDropdown(false), 200)}
                      placeholder="Type customer name or code..."
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
                    {showQuotationCustomerDropdown && filteredQuotationCustomers.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        marginTop: '4px',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        zIndex: 1001,
                      }}>
                        {filteredQuotationCustomers.map(c => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setQuotationCustomerSearch(c.nama);
                              setQuotationFormData({
                                ...quotationFormData,
                                customer: c.nama,
                                customerKode: c.kode,
                              });
                              setShowQuotationCustomerDropdown(false);
                            }}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--border)',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            {c.kode} - {c.nama}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {quotationFormData.customer && (
                    <p style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Selected: {quotationFormData.customerKode} - {quotationFormData.customer}
                    </p>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                      Payment Terms *
                    </label>
                    <select
                      value={quotationFormData.paymentTerms || 'TOP'}
                      onChange={(e) => setQuotationFormData({ ...quotationFormData, paymentTerms: e.target.value as any })}
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
                      <option value="TOP">TOP (Term of Payment)</option>
                      <option value="COD">COD (Cash on Delivery)</option>
                      <option value="CBD">CBD (Cash Before Delivery)</option>
                    </select>
                  </div>
                  {quotationFormData.paymentTerms === 'TOP' && (
                    <Input
                      label="TOP Days *"
                      type="number"
                      value={String(quotationFormData.topDays || 30)}
                      onChange={(v) => setQuotationFormData({ ...quotationFormData, topDays: Number(v) })}
                    />
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                      Discount (%) (Optional)
                    </label>
                    <input
                      type="text"
                      value={quotationDiscountInputValue !== '' ? quotationDiscountInputValue : (quotationFormData.discountPercent !== undefined && quotationFormData.discountPercent !== null && quotationFormData.discountPercent !== 0 ? String(quotationFormData.discountPercent) : '')}
                      onFocus={(e) => {
                        const input = e.target as HTMLInputElement;
                        const currentDiscount = quotationFormData.discountPercent;
                        if (currentDiscount === 0 || currentDiscount === null || currentDiscount === undefined || String(currentDiscount) === '0') {
                          setQuotationDiscountInputValue('');
                          input.value = '';
                        }
                      }}
                      onMouseDown={(e) => {
                        const input = e.target as HTMLInputElement;
                        const currentDiscount = quotationFormData.discountPercent;
                        if (currentDiscount === 0 || currentDiscount === null || currentDiscount === undefined || String(currentDiscount) === '0') {
                          setQuotationDiscountInputValue('');
                          input.value = '';
                        }
                      }}
                      onChange={(e) => {
                        let val = e.target.value;
                        val = val.replace(/[^\d.,]/g, '');
                        const cleaned = removeLeadingZero(val);
                        setQuotationDiscountInputValue(cleaned);
                        setQuotationFormData({ ...quotationFormData, discountPercent: cleaned === '' ? 0 : Number(cleaned) || 0 });
                      }}
                      onBlur={(e) => {
                        const val = e.target.value;
                        if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                          setQuotationFormData({ ...quotationFormData, discountPercent: 0 });
                          setQuotationDiscountInputValue('');
                        } else {
                          const numVal = Number(val);
                          if (numVal > 100) {
                            setQuotationFormData({ ...quotationFormData, discountPercent: 100 });
                            setQuotationDiscountInputValue('100');
                          } else {
                            setQuotationFormData({ ...quotationFormData, discountPercent: numVal });
                            setQuotationDiscountInputValue('');
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        const input = e.target as HTMLInputElement;
                        const currentVal = input.value;
                        if ((currentVal === '' || currentVal === '0') && /^[1-9]$/.test(e.key)) {
                          e.preventDefault();
                          const newVal = e.key;
                          setQuotationDiscountInputValue(newVal);
                          setQuotationFormData({ ...quotationFormData, discountPercent: Number(newVal) });
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
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                      Global Spec Note (Optional)
                    </label>
                    <textarea
                      value={quotationFormData.globalSpecNote || ''}
                      onChange={(e) => setQuotationFormData({ ...quotationFormData, globalSpecNote: e.target.value })}
                      placeholder="Global specification note for all products... (Multi-line supported)"
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                </div>

                {/* Signature Section */}
                <div style={{ marginTop: '24px', marginBottom: '16px', padding: '16px', border: '1px solid var(--border)', borderRadius: '4px' }}>
                  <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>Signature (TTD Owner/PIC)</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                        Upload Signature Image
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setQuotationFormData({
                                ...quotationFormData,
                                signatureBase64: reader.result as string,
                              });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          backgroundColor: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          fontSize: '14px',
                        }}
                      />
                      {quotationFormData.signatureBase64 && (
                        <div style={{ marginTop: '8px' }}>
                          <img
                            src={quotationFormData.signatureBase64}
                            alt="Signature preview"
                            style={{ maxWidth: '200px', maxHeight: '100px', border: '1px solid var(--border)', borderRadius: '4px' }}
                          />
                        </div>
                      )}
                    </div>
                    <Input
                      label="Signature Name"
                      value={quotationFormData.signatureName || ''}
                      onChange={(v) => setQuotationFormData({ ...quotationFormData, signatureName: v })}
                      placeholder="Nama penandatangan..."
                    />
                    <Input
                      label="Signature Title"
                      value={quotationFormData.signatureTitle || ''}
                      onChange={(v) => setQuotationFormData({ ...quotationFormData, signatureTitle: v })}
                      placeholder="Jabatan/title..."
                    />
                  </div>
                </div>

                {/* Products Table */}
                <div style={{ marginTop: '24px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>Products</h3>
                    <Button variant="primary" onClick={handleQuotationAddItem} style={{ fontSize: '12px', padding: '6px 12px' }}>
                      + Add Product
                    </Button>
                  </div>

                  {(!quotationFormData.items || quotationFormData.items.length === 0) ? (
                    <p style={{ color: 'var(--text-secondary)', padding: '20px', textAlign: 'center' }}>
                      No products added. Click "+ Add Product" to add items.
                    </p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border)' }}>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Product</th>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Qty</th>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Unit</th>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Price</th>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Total</th>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Spec Note</th>
                            <th style={{ padding: '8px', textAlign: 'center' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(quotationFormData.items || []).map((item, index) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '8px' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <input
                                    type="text"
                                    readOnly
                                    value={getQuotationProductInputDisplayValue(index, item)}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setQuotationProductDialogSearch('');
                                      setShowQuotationProductDialog(index);
                                    }}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }}
                                    placeholder="Click to select product..."
                                    style={{
                                      flex: 1,
                                      padding: '8px 12px',
                                      border: '1px solid var(--border)',
                                      borderRadius: '4px',
                                      backgroundColor: 'var(--bg-primary)',
                                      color: 'var(--text-primary)',
                                      fontSize: '14px',
                                      cursor: 'pointer',
                                    }}
                                  />
                                  <Button
                                    variant="secondary"
                                    onClick={(e) => {
                                      if (e) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                      }
                                      setQuotationProductDialogSearch('');
                                      setShowQuotationProductDialog(index);
                                    }}
                                    style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap', zIndex: 10002 }}
                                  >
                                    Select
                                  </Button>
                                </div>
                              </td>
                              <td style={{ padding: '8px' }}>
                                <input
                                  type="text"
                                  value={quotationQtyInputValue[index] !== undefined ? quotationQtyInputValue[index] : (item.qty !== undefined && item.qty !== null && item.qty !== 0 ? String(item.qty) : '')}
                                  onFocus={(e) => {
                                    e.stopPropagation();
                                    const input = e.target as HTMLInputElement;
                                    const currentQty = item.qty;
                                    if (currentQty === 0 || currentQty === null || currentQty === undefined || String(currentQty) === '0') {
                                      setQuotationQtyInputValue(prev => ({ ...prev, [index]: '' }));
                                      input.value = '';
                                    }
                                  }}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    const input = e.target as HTMLInputElement;
                                    const currentQty = item.qty;
                                    if (currentQty === 0 || currentQty === null || currentQty === undefined || String(currentQty) === '0') {
                                      setQuotationQtyInputValue(prev => ({ ...prev, [index]: '' }));
                                      input.value = '';
                                    }
                                  }}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    let val = e.target.value;
                                    val = val.replace(/[^\d.,]/g, '');
                                    const cleaned = removeLeadingZero(val);
                                    setQuotationQtyInputValue(prev => ({ ...prev, [index]: cleaned }));
                                    handleQuotationUpdateItem(index, 'qty', cleaned === '' ? '' : cleaned);
                                  }}
                                  onBlur={(e) => {
                                    e.stopPropagation();
                                    const val = e.target.value;
                                    if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                                      handleQuotationUpdateItem(index, 'qty', 0);
                                      setQuotationQtyInputValue(prev => {
                                        const newVal = { ...prev };
                                        delete newVal[index];
                                        return newVal;
                                      });
                                    } else {
                                      handleQuotationUpdateItem(index, 'qty', Number(val));
                                      setQuotationQtyInputValue(prev => {
                                        const newVal = { ...prev };
                                        delete newVal[index];
                                        return newVal;
                                      });
                                    }
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                  onKeyDown={(e) => {
                                    e.stopPropagation();
                                    const input = e.target as HTMLInputElement;
                                    const currentVal = input.value;
                                    if ((currentVal === '' || currentVal === '0') && /^[1-9]$/.test(e.key)) {
                                      e.preventDefault();
                                      const newVal = e.key;
                                      setQuotationQtyInputValue(prev => ({ ...prev, [index]: newVal }));
                                      handleQuotationUpdateItem(index, 'qty', newVal);
                                    }
                                  }}
                                  style={{
                                    width: '80px',
                                    padding: '6px 8px',
                                    border: '1px solid var(--border)',
                                    borderRadius: '4px',
                                    backgroundColor: 'var(--bg-primary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                  }}
                                />
                              </td>
                              <td style={{ padding: '8px' }}>
                                <input
                                  type="text"
                                  value={item.unit || 'PCS'}
                                  onChange={(e) => handleQuotationUpdateItem(index, 'unit', e.target.value)}
                                  style={{
                                    width: '80px',
                                    padding: '6px 8px',
                                    border: '1px solid var(--border)',
                                    borderRadius: '4px',
                                    backgroundColor: 'var(--bg-primary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                  }}
                                />
                              </td>
                              <td style={{ padding: '8px' }}>
                                <input
                                  type="text"
                                  value={quotationPriceInputValue[index] !== undefined ? quotationPriceInputValue[index] : (item.price && item.price > 0 ? String(item.price) : '')}
                                  onFocus={(e) => {
                                    e.stopPropagation();
                                    const input = e.target as HTMLInputElement;
                                    input.select();
                                  }}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    let val = e.target.value;
                                    val = val.replace(/[^\d.,]/g, '');
                                    const cleaned = removeLeadingZero(val);
                                    setQuotationPriceInputValue(prev => ({ ...prev, [index]: cleaned }));
                                    handleQuotationUpdateItem(index, 'price', cleaned === '' ? 0 : Number(cleaned));
                                  }}
                                  onBlur={(e) => {
                                    e.stopPropagation();
                                    const val = e.target.value;
                                    const numVal = val === '' ? 0 : Number(val);
                                    if (isNaN(numVal) || numVal < 0) {
                                      handleQuotationUpdateItem(index, 'price', 0);
                                    } else {
                                      handleQuotationUpdateItem(index, 'price', numVal);
                                    }
                                    setQuotationPriceInputValue(prev => {
                                      const newVal = { ...prev };
                                      delete newVal[index];
                                      return newVal;
                                    });
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    width: '120px',
                                    padding: '6px 8px',
                                    border: '1px solid var(--border)',
                                    borderRadius: '4px',
                                    backgroundColor: 'var(--bg-primary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                  }}
                                />
                              </td>
                              <td style={{ padding: '8px', fontWeight: 'bold' }}>
                                Rp {item.total.toLocaleString('id-ID')}
                              </td>
                              <td style={{ padding: '8px' }}>
                                <input
                                  type="text"
                                  value={item.specNote || ''}
                                  onChange={(e) => handleQuotationUpdateItem(index, 'specNote', e.target.value)}
                                  placeholder="Spec note..."
                                  style={{
                                    width: '150px',
                                    padding: '6px 8px',
                                    border: '1px solid var(--border)',
                                    borderRadius: '4px',
                                    backgroundColor: 'var(--bg-primary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                  }}
                                />
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                <Button
                                  variant="danger"
                                  onClick={() => handleQuotationRemoveItem(index)}
                                  style={{ fontSize: '11px', padding: '4px 8px' }}
                                >
                                  Remove
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={3} style={{ padding: '8px', textAlign: 'right' }}>Sub Total:</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>
                              Rp {((quotationFormData.items || []).reduce((sum, i) => sum + i.total, 0)).toLocaleString('id-ID')}
                            </td>
                            <td colSpan={2}></td>
                          </tr>
                          {(quotationFormData.discountPercent || 0) > 0 && (
                            <tr>
                              <td colSpan={3} style={{ padding: '8px', textAlign: 'right' }}>
                                Discount ({quotationFormData.discountPercent}%):
                              </td>
                              <td style={{ padding: '8px', textAlign: 'right', color: '#ff9800' }}>
                                - Rp {((quotationFormData.items || []).reduce((sum, i) => sum + i.total, 0) * (quotationFormData.discountPercent || 0) / 100).toLocaleString('id-ID')}
                              </td>
                              <td colSpan={2}></td>
                            </tr>
                          )}
                          <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 'bold' }}>
                            <td colSpan={3} style={{ padding: '8px', textAlign: 'right' }}>Total:</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>
                              Rp {(((quotationFormData.items || []).reduce((sum, i) => sum + i.total, 0)) * (1 - (quotationFormData.discountPercent || 0) / 100)).toLocaleString('id-ID')}
                            </td>
                            <td colSpan={2}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowQuotationFormDialog(false);
                      setQuotationFormData({
                        soNo: '',
                        customer: '',
                        customerKode: '',
                        paymentTerms: 'TOP',
                        topDays: 30,
                        items: [],
                        globalSpecNote: '',
                        category: 'packaging',
                        discountPercent: 0,
                        signatureBase64: '',
                        signatureName: '',
                        signatureTitle: '',
                      });
                      setQuotationCustomerSearch('');
                      setQuotationProductSearch({});
                      setQuotationQtyInputValue({});
                      setQuotationPriceInputValue({});
                      setQuotationItemDiscountInputValue({});
                      setQuotationDiscountInputValue('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuotationFormData({
                        soNo: '',
                        customer: '',
                        customerKode: '',
                        paymentTerms: 'TOP',
                        topDays: 30,
                        items: [],
                        globalSpecNote: '',
                        category: 'packaging',
                        discountPercent: 0,
                        signatureBase64: '',
                        signatureName: '',
                        signatureTitle: '',
                      });
                      setQuotationCustomerSearch('');
                      setQuotationProductSearch({});
                      setQuotationQtyInputValue({});
                      setQuotationPriceInputValue({});
                      setQuotationItemDiscountInputValue({});
                      setQuotationDiscountInputValue('');
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleGenerateQuotationFromForm}
                  >
                    {editingQuotation ? 'Update Quotation' : 'Generate Quotation'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Product Dialog untuk Quotation */}
      {showQuotationProductDialog !== null && (
        <div className="dialog-overlay" onClick={() => setShowQuotationProductDialog(null)} style={{ zIndex: 10000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%', maxHeight: '80vh', overflowY: 'auto', zIndex: 10001 }}>
            <Card
              title="Select Product"
              className="dialog-card"
            >
              <div style={{ marginBottom: '16px' }}>
                <Input
                  label="Search Product"
                  value={quotationProductDialogSearch}
                  onChange={setQuotationProductDialogSearch}
                  placeholder="Search by product code or name..."
                />
                {quotationProductDialogSearch && (
                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '12px' }}>
                    <p style={{ margin: 0, marginBottom: '8px' }}>Product not found?</p>
                    <Button
                      variant="primary"
                      onClick={async () => {
                        // Create new product dengan nama dari search
                        const newProduct = {
                          id: Date.now().toString(),
                          no: products.length + 1,
                          kode: `PRD-${String(products.length + 1).padStart(3, '0')}`,
                          nama: quotationProductDialogSearch,
                          satuan: 'PCS',
                          kategori: '',
                          hargaFg: 0,
                          stockAman: 0,
                          stockMinimum: 0,
                          lastUpdate: new Date().toISOString(),
                          userUpdate: 'System',
                          ipAddress: '127.0.0.1',
                        };
                        // Save ke products
                        const updatedProducts = [...products, newProduct];
                        await storageService.set(StorageKeys.PACKAGING.PRODUCTS, updatedProducts);
                        setProducts(updatedProducts);
                        // Langsung select product ini
                        if (showQuotationProductDialog !== null) {
                          handleQuotationUpdateItem(showQuotationProductDialog, 'productId', newProduct.kode);
                        }
                        setShowQuotationProductDialog(null);
                        setQuotationProductDialogSearch('');
                      }}
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      + Create "{quotationProductDialogSearch}"
                    </Button>
                  </div>
                )}
              </div>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <Table
                  columns={[
                    { key: 'kode', header: 'Code', render: (p: Product) => p.kode || p.product_id },
                    { key: 'nama', header: 'Name', render: (p: Product) => p.nama },
                    { key: 'satuan', header: 'Unit', render: (p: Product) => p.satuan || 'PCS' },
                    { key: 'hargaFg', header: 'Price', render: (p: Product) => `Rp ${(p.hargaFg || 0).toLocaleString('id-ID')}` },
                    {
                      key: 'actions',
                      header: 'Actions',
                      render: (prod: Product) => (
                        <Button
                          variant="primary"
                          onClick={() => {
                            if (showQuotationProductDialog !== null) {
                              handleQuotationUpdateItem(showQuotationProductDialog, 'productId', prod.kode || prod.product_id);
                            }
                            setShowQuotationProductDialog(null);
                            setQuotationProductDialogSearch('');
                          }}
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                        >
                          Select
                        </Button>
                      ),
                    },
                  ]}
                  data={showQuotationProductDialog !== null ? getFilteredQuotationProducts(showQuotationProductDialog) : []}
                  emptyMessage="No products found"
                />
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Custom Dialog - menggunakan hook terpusat */}
      <DialogComponent />
      <ToastContainer />
    </div>
  );
};

// CSS Animation for spinner
const spinnerStyle = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

// Inject CSS if not already present
if (typeof document !== 'undefined' && !document.getElementById('product-sync-spinner-style')) {
  const style = document.createElement('style');
  style.id = 'product-sync-spinner-style';
  style.textContent = spinnerStyle;
  document.head.appendChild(style);
}

export default SalesOrders;