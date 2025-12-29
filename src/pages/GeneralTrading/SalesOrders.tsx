import { useState, useEffect, useMemo, useRef } from 'react';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { storageService } from '../../services/storage';
import { openPrintWindow, focusAppWindow } from '../../utils/actions';
import * as XLSX from 'xlsx';
import { createStyledWorksheet, setColumnWidths, ExcelColumn } from '../../utils/excel-helper';
import { loadLogoAsBase64 } from '../../utils/logo-loader';
import { useDialog } from '../../hooks/useDialog';
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
  discountPercent?: number; // Diskon per item (0-100)
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
  discountPercent?: number; // Discount percentage untuk quotation
  signatureBase64?: string; // Base64 signature image untuk quotation
  signatureName?: string; // Nama penandatangan
  signatureTitle?: string; // Jabatan/title penandatangan
  matchedSoNo?: string; // SO No yang di-match dengan quotation (jika sudah di-match)
  ppicNotified?: boolean; // Flag apakah sudah dikirim notifikasi ke PPIC
  ppicNotifiedAt?: string; // Timestamp kapan notifikasi dikirim ke PPIC
}

interface Customer {
  id: string;
  kode: string;
  nama: string;
  alamat?: string;
  telepon?: string;
  hp?: string;
  kontak?: string;
}

interface Product {
  id: string;
  kode: string;
  product_id?: string;
  nama: string;
  satuan: string;
  hargaFg?: number;
  hargaSales?: number;
}

// ActionMenu component untuk dropdown 3 titik
const SOActionMenu = ({
  onView,
  onEdit,
  onDelete,
  onConfirm,
  onViewQuotation,
  onEditQuotation,
  onMatchSO,
  onCreateSO,
  onNote,
  status,
  ppicNotified,
  matchedSoNo,
}: {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onConfirm?: () => void;
  onViewQuotation?: () => void;
  onEditQuotation?: () => void;
  onMatchSO?: () => void;
  onCreateSO?: () => void;
  onNote?: () => void;
  status?: 'OPEN' | 'CLOSE';
  ppicNotified?: boolean;
  matchedSoNo?: string;
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
        const menuHeight = 300; // Estimated menu height (more items in SO menu)
        const menuWidth = 200; // Estimated menu width
        const spaceBelow = window.innerHeight - buttonRect.bottom;
        const spaceAbove = buttonRect.top;
        const gap = 0; // No gap for tight positioning
        
        let top: number;
        let right: number;
        
        // Vertical positioning: default di bawah, hanya pindah ke atas jika benar-benar perlu
        if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
          // Tidak cukup ruang di bawah TAPI cukup ruang di atas, posisikan di atas
          top = buttonRect.top - menuHeight - gap;
        } else {
          // Default: selalu posisikan di bawah
          top = buttonRect.bottom + gap;
        }
        
        // Horizontal positioning: align dengan left edge button (menggunakan right untuk consistency)
        right = window.innerWidth - buttonRect.left;
        
        // Handle horizontal overflow - jika menu kepotong di kanan, pindah ke kiri button
        const spaceOnRight = window.innerWidth - buttonRect.right;
        const spaceOnLeft = buttonRect.left;
        
        if (spaceOnRight < menuWidth && spaceOnLeft >= menuWidth) {
          // Menu akan kepotong di kanan, pindah ke kiri button
          right = window.innerWidth - buttonRect.right;
        } else if (spaceOnRight < menuWidth && spaceOnLeft < menuWidth) {
          // Tidak cukup ruang di kedua sisi, pilih yang lebih besar
          if (spaceOnRight >= spaceOnLeft) {
            right = window.innerWidth - buttonRect.left;
          } else {
            right = window.innerWidth - buttonRect.right;
          }
        }
        
        setMenuPosition({ top, right });
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
              👁️ View SO
            </button>
          )}
          {onViewQuotation && (
            <button
              onClick={() => { onViewQuotation(); setShowMenu(false); }}
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
              👁️ View Quotation
            </button>
          )}
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
          {onEditQuotation && (
            <button
              onClick={() => { onEditQuotation(); setShowMenu(false); }}
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
              ✏️ Edit Quotation
            </button>
          )}
          {onConfirm && status === 'OPEN' && !ppicNotified && (
            <button
              onClick={() => { onConfirm(); setShowMenu(false); }}
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
                fontWeight: '600',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              ✓ Confirm SO
            </button>
          )}
          {onMatchSO && !matchedSoNo && (
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
          {onCreateSO && !matchedSoNo && (
            <button
              onClick={() => { onCreateSO(); setShowMenu(false); }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '6px 10px',
                border: 'none',
                background: 'transparent',
                color: 'var(--primary)',
                cursor: 'pointer',
                fontSize: '11px',
                borderRadius: '4px',
                fontWeight: '600',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              ➕ Create SO
            </button>
          )}
          {onNote && status === 'OPEN' && (
            <button
              onClick={() => { onNote(); setShowMenu(false); }}
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
              📝 Note
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
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [quotations, setQuotations] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);
  const [showQuotationPreview, setShowQuotationPreview] = useState(false);
  const [quotationPreviewData, setQuotationPreviewData] = useState<SalesOrder | null>(null);
  const [showMatchSODialog, setShowMatchSODialog] = useState<SalesOrder | null>(null);
  const [viewPdfData, setViewPdfData] = useState<{ html: string; soNo: string } | null>(null);
  const [viewQuotationPdfData, setViewQuotationPdfData] = useState<{ html: string; quoteNo: string } | null>(null);
  
  // Filter & Search
  const [activeTab, setActiveTab] = useState<'all' | 'outstanding' | 'quotation'>('all');
  const [orderViewMode, setOrderViewMode] = useState<'cards' | 'table'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Form state
  const [formData, setFormData] = useState<Partial<SalesOrder>>({
    soNo: '',
    customer: '',
    customerKode: '',
    paymentTerms: 'TOP',
    topDays: 30,
    items: [],
    globalSpecNote: '',
    discountPercent: 0,
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
    discountPercent: 0,
    signatureBase64: '',
    signatureName: '',
    signatureTitle: '',
  });
  
  // Autocomplete state
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [productInputValue, setProductInputValue] = useState<{ [key: number]: string }>({});
  const [,setProductSearch] = useState<{ [key: number]: string }>({});
  const [showProductDialog, setShowProductDialog] = useState<number | null>(null);
  const [productDialogSearch, setProductDialogSearch] = useState('');
  const [qtyInputValue, setQtyInputValue] = useState<{ [key: number]: string }>({});
  const [priceInputValue, setPriceInputValue] = useState<{ [key: number]: string }>({});
  const [soDiscountInputValue, setSoDiscountInputValue] = useState<string>('');
  
  // Force re-render key untuk input fields
  const [formKey, setFormKey] = useState(0);
  
  // Hidden popup untuk trigger re-render saat edit
  const [showHiddenPopup, setShowHiddenPopup] = useState(false);
  
  // Custom Dialog - menggunakan hook terpusat
  const { showAlert, showConfirm, closeDialog, DialogComponent } = useDialog();

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
  const [showCreateProductDialog, setShowCreateProductDialog] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    kode: '',
    nama: '',
    satuan: 'PCS',
    kategori: '',
    hargaFg: 0,
  });
  const [newProductPriceInput, setNewProductPriceInput] = useState('');

  // Auto generate kode product: PRD-001, PRD-002, dst
  const generateProductCode = (existingProducts: any[]): string => {
    const prefix = 'PRD';
    const existingCodes = existingProducts
      .map(p => p.kode)
      .filter(k => k && k.startsWith(prefix))
      .map(k => {
        const match = k.match(/^PRD-(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      });
    
    const maxNum = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;
    const nextNum = maxNum + 1;
    return `${prefix}-${String(nextNum).padStart(3, '0')}`;
  };

  // Handle Create Product dari Quotation
  const handleCreateProductFromQuotation = async () => {
    if (!newProductForm.nama || newProductForm.nama.trim() === '') {
      showAlert('Product name is required', 'Validation Error');
      return;
    }

    try {
      // Auto generate kode jika kosong
      const autoKode = generateProductCode(products);
      
      const newProduct = {
        id: Date.now().toString(),
        no: products.length + 1,
        kode: autoKode,
        nama: newProductForm.nama.trim(),
        satuan: newProductForm.satuan || 'PCS',
        kategori: newProductForm.kategori || '',
        hargaFg: newProductForm.hargaFg || 0,
        stockAman: 0,
        stockMinimum: 0,
        lastUpdate: new Date().toISOString(),
        userUpdate: 'System',
        ipAddress: '127.0.0.1',
      };

      // Save ke gt_products
      const updatedProducts = [...products, newProduct];
      await storageService.set('gt_products', updatedProducts);
      setProducts(updatedProducts);

      // Langsung select product ini ke quotation item
      if (showQuotationProductDialog !== null) {
        const itemIndex = showQuotationProductDialog;
        // Update quotation item dengan product baru
        handleQuotationUpdateItem(itemIndex, 'productId', autoKode);
        // Update product search display
        const label = `${autoKode} - ${newProductForm.nama.trim()}`;
        setQuotationProductSearch(prev => ({ ...prev, [itemIndex]: label }));
      }

      // Reset form dan tutup dialog
      setNewProductForm({
        kode: '',
        nama: '',
        satuan: 'PCS',
        kategori: '',
        hargaFg: 0,
      });
      setNewProductPriceInput('');
      setShowCreateProductDialog(false);
      setShowQuotationProductDialog(null);
      setQuotationProductDialogSearch('');

      showAlert(`Product "${newProductForm.nama}" created successfully and added to quotation`, 'Success');
    } catch (error: any) {
      console.error('Error creating product:', error);
      showAlert(`Error creating product: ${error.message}`, 'Error');
    }
  };
  const [showQuotationFormDialog, setShowQuotationFormDialog] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<SalesOrder | null>(null);
  const [quotationQtyInputValue, setQuotationQtyInputValue] = useState<{ [key: number]: string }>({});
  const [quotationPriceInputValue, setQuotationPriceInputValue] = useState<{ [key: number]: string }>({});
  const [quotationItemDiscountInputValue, setQuotationItemDiscountInputValue] = useState<{ [key: number]: string }>({});
  const [quotationDiscountInputValue, setQuotationDiscountInputValue] = useState<string>('');

  // Permissions (simplified - bisa di-extend dengan user management)

  useEffect(() => {
    loadOrders();
    loadQuotations();
    loadCustomers();
    loadProducts();
  }, []);

  // Auto-generate quotation no saat form dibuka (hanya untuk create baru, bukan edit)
  useEffect(() => {
    if (showQuotationFormDialog && !editingQuotation) {
      // Selalu generate nomor baru setiap kali form dibuka untuk create baru
      const autoNo = generateQuotationNo(quotations);
      setQuotationFormData(prev => ({ ...prev, soNo: autoNo }));
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
    const data = await storageService.get<SalesOrder[]>('gt_salesOrders') || [];
    // Filter hanya SO (bukan quotation - quotation punya soNo yang link ke SO atau null)
    // Quotation disimpan terpisah di gt_quotations
    setOrders(data);
  };

  const loadQuotations = async () => {
    const data = await storageService.get<SalesOrder[]>('gt_quotations') || [];
    setQuotations(data);
  };

  // Generate nomor Quotation dengan format: 00001/QUO/TLJP/XII/2025 (nomor random)
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
    
    // Generate nomor random 5 digit (00001-99999)
    // Cek duplikat dan generate ulang jika sudah ada
    let randomNum: number;
    let attempts = 0;
    do {
      randomNum = Math.floor(Math.random() * 99999) + 1; // 1-99999
      attempts++;
      if (attempts > 100) {
        // Fallback ke timestamp jika terlalu banyak duplikat
        randomNum = parseInt(Date.now().toString().slice(-5), 10) || Math.floor(Math.random() * 99999) + 1;
        break;
      }
    } while (existingNumbers.includes(randomNum));
    
    return `${String(randomNum).padStart(5, '0')}/QUO/TLJP/${monthRoman}/${year}`;
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

  const getQuotationProductInputDisplayValue = (index: number, item?: SOItem) => {
    if (quotationProductSearch[index] !== undefined && quotationProductSearch[index] !== '') {
      return quotationProductSearch[index];
    }
    if (item?.productName) {
      return item.productKode ? `${item.productKode} - ${item.productName}` : item.productName;
    }
    return '';
  };

  const loadCustomers = async () => {
    const data = await storageService.get<Customer[]>('gt_customers') || [];
    setCustomers(data);
  };

  const loadProducts = async () => {
    const data = await storageService.get<Product[]>('gt_products') || [];
    setProducts(data);
  };

  // Filtered customers for autocomplete
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    const query = customerSearch.toLowerCase();
    return customers
      .filter(c => 
        (c.nama || '').toLowerCase().includes(query) || 
        (c.kode || '').toLowerCase().includes(query)
      );
  }, [customerSearch, customers]);

  // Filtered products for dialog with limit for performance
  const filteredProductsForDialog = useMemo(() => {
    let filtered = products;
    if (productDialogSearch) {
      const query = productDialogSearch.toLowerCase();
      filtered = products.filter(p => {
        const code = (p.product_id || p.kode || '').toLowerCase();
        const name = (p.nama || '').toLowerCase();
        const label = `${code}${code ? ' - ' : ''}${name}`.toLowerCase();
        return code.includes(query) || name.includes(query) || label.includes(query);
      });
    }
    // Limit to 200 items for performance (user can search to narrow down)
    return filtered.slice(0, 200);
  }, [productDialogSearch, products]);

  const filteredProductsForQuotationDialog = useMemo(() => {
    let filtered = products;
    if (quotationProductDialogSearch) {
      const query = quotationProductDialogSearch.toLowerCase();
      filtered = products.filter(p => {
        const code = (p.product_id || p.kode || '').toLowerCase();
        const name = (p.nama || '').toLowerCase();
        const label = `${code}${code ? ' - ' : ''}${name}`.toLowerCase();
        return code.includes(query) || name.includes(query) || label.includes(query);
      });
    }
    // Limit to 200 items for performance (user can search to narrow down)
    return filtered.slice(0, 200);
  }, [quotationProductDialogSearch, products]);


  // Filtered customers for quotation autocomplete
  const filteredQuotationCustomers = useMemo(() => {
    if (!quotationCustomerSearch) return customers;
    const query = quotationCustomerSearch.toLowerCase();
    return customers
      .filter(c => 
        (c.nama || '').toLowerCase().includes(query) || 
        (c.kode || '').toLowerCase().includes(query)
      );
  }, [quotationCustomerSearch, customers]);

  // Filtered products for quotation autocomplete
  const getFilteredQuotationProducts = useMemo(() => {
    return (lineIndex: number) => {
      const search = (quotationProductSearch && quotationProductSearch[lineIndex]) || '';
      if (!search) return products;
      const query = search.toLowerCase();
      return products
        .filter(p => 
          (p.nama || '').toLowerCase().includes(query) ||
          (p.kode || '').toLowerCase().includes(query) ||
          (p.product_id || '').toLowerCase().includes(query)
        );
    };
  }, [quotationProductSearch, products]);

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
        setProductInputValue(prev => ({ ...prev, [index]: '' }));
      } else {
        const product = products.find(p => 
          (p.product_id || p.kode) === value || p.nama === value
        );
        if (product) {
          item.productId = product.product_id || product.kode;
          item.productKode = product.product_id || product.kode;
          item.productName = product.nama;
          item.unit = product.satuan || 'PCS';
          const hargaFromMaster = product.hargaSales || product.hargaFg || (product as any).harga || 0;
          item.price = Number(hargaFromMaster) || 0;
          item.total = (item.qty || 0) * item.price;
          const label = `${product.product_id || product.kode || ''}${product.product_id || product.kode ? ' - ' : ''}${product.nama || ''}`;
          setProductInputValue(prev => ({ ...prev, [index]: label.trim() }));
        } else {
          item.productId = value;
          item.productKode = value;
          item.productName = value;
          setProductInputValue(prev => ({ ...prev, [index]: value || '' }));
        }
      }
      newItems[index] = item;
      setFormData(prev => ({ ...prev, items: newItems }));
      return;
    } else if (field === 'qty') {
      // Biarkan string kosong tetap string kosong (akan di-handle di onBlur)
      if (value === '' || value === null || value === undefined) {
        item.qty = '' as any;
      } else {
        const numValue = Number(value);
        item.qty = isNaN(numValue) ? 0 : numValue;
      }
      const qtyNum = typeof item.qty === 'string' ? 0 : (item.qty || 0);
      const priceNum = typeof item.price === 'string' ? 0 : (item.price || 0);
      item.total = qtyNum * priceNum;
    } else if (field === 'price') {
      // Biarkan string kosong tetap string kosong (akan di-handle di onBlur)
      if (value === '' || value === null || value === undefined) {
        item.price = '' as any;
      } else {
        const numValue = Number(value);
        item.price = isNaN(numValue) ? 0 : numValue;
      }
      const qtyNum = typeof item.qty === 'string' ? 0 : (item.qty || 0);
      const priceNum = typeof item.price === 'string' ? 0 : (item.price || 0);
      item.total = qtyNum * priceNum;
    } else {
      (item as any)[field] = value;
    }
    
    newItems[index] = item;
    // Force state update dengan spread operator baru
    setFormData(prev => ({ ...prev, items: [...newItems] }));
  };

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
      const name = (prod.nama || '').toLowerCase();
      return label === normalized || code === normalized || name === normalized;
    });
    if (matchedProduct) {
      handleUpdateItem(index, 'productId', matchedProduct.product_id || matchedProduct.kode);
    } else {
      handleUpdateItem(index, 'productName', text);
    }
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
          // Sama seperti handleUpdateItem di SO
          const product = products.find(p => 
            (p.product_id || p.kode) === value || p.nama === value
          );
          if (product) {
            item.productId = product.product_id || product.kode;
            item.productKode = product.product_id || product.kode;
            item.productName = product.nama;
            item.unit = product.satuan || 'PCS';
            const hargaFromMaster = product.hargaSales || product.hargaFg || (product as any).harga || 0;
            item.price = Number(hargaFromMaster) || 0;
            // Hitung total dengan discount per item
            const qtyNum = typeof item.qty === 'string' ? 0 : (item.qty || 0);
            const priceNum = item.price || 0;
            const discountPercent = item.discountPercent || 0;
            const subtotal = qtyNum * priceNum;
            item.total = subtotal * (1 - discountPercent / 100);
            // Update quotationProductSearch untuk display - sama seperti SO
            const label = `${product.product_id || product.kode || ''}${product.product_id || product.kode ? ' - ' : ''}${product.nama || ''}`;
            setQuotationProductSearch(prevSearch => ({ ...prevSearch, [index]: label.trim() }));
          } else {
            // Validasi: tidak bisa tambah item yang tidak tersedia di master products
            showAlert(`Product "${value}" tidak tersedia di master products. Silakan pilih product yang ada di master.`, 'Validation Error');
            // Reset ke kosong
            item.productId = '';
            item.productKode = '';
            item.productName = '';
            item.unit = 'PCS';
            item.price = 0;
            item.total = 0;
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
        const qtyNum = typeof item.qty === 'string' ? 0 : (item.qty || 0);
        const priceNum = typeof item.price === 'string' ? 0 : (item.price || 0);
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
        const qtyNum = typeof item.qty === 'string' ? 0 : (item.qty || 0);
        const priceNum = typeof item.price === 'string' ? 0 : (item.price || 0);
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
        const qtyNum = typeof item.qty === 'string' ? 0 : (item.qty || 0);
        const priceNum = typeof item.price === 'string' ? 0 : (item.price || 0);
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
      discountPercent: quotation.discountPercent || 0,
      signatureBase64: quotation.signatureBase64 || '',
      signatureName: quotation.signatureName || '',
      signatureTitle: quotation.signatureTitle || '',
    });
    setQuotationCustomerSearch(quotation.customer || '');
    setQuotationProductSearch({});
    setQuotationQtyInputValue({});
    setQuotationPriceInputValue({});
    setQuotationDiscountInputValue(quotation.discountPercent ? String(quotation.discountPercent) : '');
    setShowQuotationFormDialog(true);
  };

  const handleGenerateQuotationFromForm = async () => {
    if (!quotationFormData.customer) {
      showAlert('Please select customer', 'Validation Error');
      return;
    }
    if (!quotationFormData.items || quotationFormData.items.length === 0) {
      showAlert('Please add at least one product', 'Validation Error');
      return;
    }
    if (quotationFormData.items.some(item => !item.productId || item.qty <= 0)) {
      showAlert('Please fill all product fields and ensure qty > 0', 'Validation Error');
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
      showAlert(`Item berikut tidak tersedia di master products: ${invalidNames}. Silakan hapus atau ganti dengan product yang valid.`, 'Validation Error');
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
                discountPercent: quotationFormData.discountPercent || 0,
                signatureBase64: quotationFormData.signatureBase64,
                signatureName: quotationFormData.signatureName,
                signatureTitle: quotationFormData.signatureTitle,
              }
            : q
        );
        await storageService.set('gt_quotations', updated);
        setQuotations(updated);
        showAlert(`Quotation ${editingQuotation.soNo} updated successfully`, 'Success');
      } else {
        // Create new quotation - selalu auto generate quotation no dengan format baru
        const quotationNo = generateQuotationNo(quotations);
        
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
          discountPercent: quotationFormData.discountPercent || 0,
          signatureBase64: quotationFormData.signatureBase64,
          signatureName: quotationFormData.signatureName,
          signatureTitle: quotationFormData.signatureTitle,
        };
        
        // Check duplicate quotation no
        const existingQuotation = quotationsArray.find(q => q.soNo.trim().toUpperCase() === quotationNo.trim().toUpperCase());
        if (existingQuotation) {
          showAlert(`Quotation No "${quotationNo}" sudah ada! Gunakan nomor yang berbeda.`, 'Validation Error');
          return;
        }
        
        // Save to quotations storage (terpisah dari SO)
        const updated = [...quotationsArray, quotationData];
        await storageService.set('gt_quotations', updated);
        setQuotations(updated);
        showAlert(`Quotation ${quotationNo} created successfully`, 'Success');
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
      console.error('Error saving quotation:', error);
      showAlert('Failed to save quotation. Please try again.', 'Error');
    }
  };

  // Handle View Quotation - Generate PDF menggunakan template
  const handleViewQuotation = async (quotation: SalesOrder) => {
    try {
      // Load logo sebagai base64
      const logoBase64 = await loadLogoAsBase64();
      
      // Load company data dari storage
      const companyData = await storageService.get<any>('gt_company') || {};
      const company = {
        companyName: companyData.companyName || 'PT. TRIMA LAKSANA JAYA PRATAMA',
        address: companyData.address || 'Jl. Raya Cikarang Cibarusah Km. 10',
        phone: companyData.phone || '021 8982 3556',
        picPurchasingName: companyData.picPurchasingName || companyData.directorName || 'M. ALAUDDIN',
      };
      
      // Load customer data untuk address
      const customer = customers.find(c => c.nama === quotation.customer || c.kode === quotation.customerKode);
      const customerAddress = customer?.alamat || '';
      
      // Format items untuk template
      const items = (quotation.items || []).map((item, idx) => ({
        no: idx + 1,
        description: item.productName || '',
        qty: item.qty || 0,
        uom: item.unit || 'Pcs',
        unitPrice: item.price || 0,
        amount: item.total || 0,
      }));
      
      // Format quotation data untuk template
      const qData = {
        quoteNo: quotation.soNo || '',
        quoteDate: quotation.created || new Date().toISOString(),
        customerName: quotation.customer || '',
        customerAddress: customerAddress,
        attnTo: quotation.customer || '-',
        contact: customer?.telepon || customer?.hp || '-',
        items: items,
        discountPercent: quotation.discountPercent || 0,
        remarks: quotation.globalSpecNote ? [quotation.globalSpecNote] : [],
      };
      
      // Generate HTML menggunakan template
      // Include signature jika ada
      const html = generateQuotationHtml({
        logoBase64,
        company: {
          ...company,
          picPurchasingName: quotation.signatureName || company.picPurchasingName,
        },
        qData: {
          ...qData,
          // Signature akan di-handle di template jika ada
        },
        so: quotation.matchedSoNo ? { soNo: quotation.matchedSoNo } : null,
      });
      
      // Jika ada signature, inject ke HTML
      let finalHtml = html;
      if (quotation.signatureBase64) {
        // Replace signature box di template dengan signature yang di-upload
        // Signature image di atas garis, nama dan title di bawah garis
        const signatureHtml = `<div class="signature-box">
            <img src="${quotation.signatureBase64}" alt="Signature" class="signature-image" />
            <div class="signature-line">
              <div class="signature-name">${quotation.signatureName || company.picPurchasingName}</div>
              <div class="signature-title">${quotation.signatureTitle || 'Direktur Utama'}</div>
            </div>
          </div>`;
        // Replace dengan regex yang lebih spesifik
        finalHtml = html.replace(
          /<div class="signature-box">[\s\S]*?<\/div>/,
          signatureHtml
        );
      }
      
      // Set state untuk dialog preview (tidak langsung print)
      setViewQuotationPdfData({ html: finalHtml, quoteNo: quotation.soNo || '' });
    } catch (error) {
      console.error('Error generating quotation PDF:', error);
      showAlert('Failed to generate quotation PDF. Please try again.', 'Error');
    }
  };

  // Handle View SO - Generate PDF dan tampilkan di dialog (tidak langsung print)
  const handleViewSO = async (order: SalesOrder) => {
    try {
      // Load logo sebagai base64
      const logoBase64 = await loadLogoAsBase64();
      
      // Load company data dari storage
      const companyData = await storageService.get<any>('gt_company') || {};
      const companyName = companyData.companyName || 'PT. TRIMA LAKSANA JAYA PRATAMA';
      const companyAddress = companyData.address || 'Jl. Raya Cikarang Cibarusah Km. 10';
      const companyPhone = companyData.phone || '021 8982 3556';
      
      // Load customer data untuk address
      const customer = customers.find(c => c.nama === order.customer || c.kode === order.customerKode);
      const customerAddress = customer?.alamat || '';
      
      // Format date
      const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        try {
          const d = new Date(dateStr);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}/${month}/${year}`;
        } catch {
          return dateStr;
        }
      };
      
      const soDate = formatDate(order.created || new Date().toISOString());
      
      // Calculate totals
      const subtotal = (order.items || []).reduce((sum, item) => sum + (item.total || 0), 0);
      const discount = subtotal * (order.discountPercent || 0) / 100;
      const total = subtotal - discount;
      
      // Generate HTML untuk SO
      const html = `<!doctype html>
<html>
<head>
  <meta charset='utf-8'>
  <title>Sales Order ${order.soNo}</title>
  <style>
    @page { 
      size: A4 portrait; 
      margin: 15mm 25mm; 
    }
    * { 
      box-sizing: border-box; 
    }
    body { 
      font-family: Arial, sans-serif; 
      font-size: 13px; 
      margin: 0; 
      padding: 0 20px; 
      color: #000; 
    }
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start; 
      margin-bottom: 20px; 
      border-bottom: 2px solid #000; 
      padding-bottom: 12px; 
    }
    .header-left { 
      flex: 1; 
      padding-right: 20px; 
      max-width: 60%; 
    }
    .company-name { 
      font-weight: bold; 
      font-size: 18px; 
      margin-bottom: 8px; 
    }
    .company-address { 
      font-size: 12px; 
      line-height: 1.6; 
      margin-bottom: 2px; 
    }
    .header-right { 
      text-align: right; 
      position: relative; 
      flex-shrink: 0; 
      padding-left: 20px; 
    }
    .logo { 
      width: 90px; 
      height: auto; 
      margin-bottom: 12px; 
    }
    .so-info { 
      text-align: right; 
      font-size: 12px; 
      margin-top: 8px; 
      line-height: 1.8; 
    }
    .so-info-label { 
      font-weight: bold; 
    }
    .item-table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 18px 0; 
      font-size: 12px; 
    }
    .item-table thead tr { 
      background-color: #000; 
      color: #fff; 
    }
    .item-table th { 
      padding: 10px 6px; 
      text-align: left; 
      font-weight: bold; 
      font-size: 12px; 
    }
    .item-table th:nth-child(3), 
    .item-table th:nth-child(4), 
    .item-table th:nth-child(5), 
    .item-table th:nth-child(6) { 
      text-align: right; 
    }
    .item-table td { 
      padding: 6px 6px; 
      border-bottom: 1px solid #ddd; 
      font-size: 12px; 
    }
    .item-table tbody tr:nth-child(even) { 
      background-color: #f5f5f5; 
    }
    .item-table td:nth-child(3), 
    .item-table td:nth-child(4), 
    .item-table td:nth-child(5), 
    .item-table td:nth-child(6) { 
      text-align: right; 
    }
    .summary-section { 
      margin-top: 18px; 
      display: flex; 
      justify-content: flex-end; 
    }
    .summary-table { 
      border-collapse: collapse; 
      font-size: 12px; 
      width: 280px; 
    }
    .summary-table td { 
      padding: 6px 10px; 
      text-align: right; 
    }
    .summary-table td:first-child { 
      text-align: left; 
      font-weight: bold; 
    }
    .summary-table .total-row { 
      font-weight: bold; 
      border-top: 1px solid #000; 
    }
    .remarks-section { 
      margin-top: 25px; 
      font-size: 12px; 
    }
    .remarks-label { 
      font-weight: bold; 
      margin-bottom: 8px; 
    }
    .customer-section {
      margin-top: 20px;
      margin-bottom: 15px;
    }
    .customer-name {
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 5px;
    }
    .customer-address {
      font-size: 12px;
      line-height: 1.6;
      margin-bottom: 2px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="company-name">${companyName}</div>
      <div class="company-address">${companyAddress}</div>
      <div class="company-address" style="margin-top: 5px;">Tel: ${companyPhone}</div>
    </div>
    <div class="header-right">
      <img src="${logoBase64}" class="logo" alt="Logo" />
      <div class="so-info">
        <div><span class="so-info-label">SO No:</span> ${order.soNo}</div>
        <div><span class="so-info-label">Date:</span> ${soDate}</div>
        <div><span class="so-info-label">Status:</span> ${order.status}</div>
      </div>
    </div>
  </div>

  <div class="customer-section">
    <div class="customer-name">${order.customer || ''}</div>
    ${customerAddress ? `<div class="customer-address">${customerAddress}</div>` : ''}
  </div>

  <div style="margin-bottom: 15px; font-size: 12px;">
    <div><strong>Payment Terms:</strong> ${order.paymentTerms}${order.paymentTerms === 'TOP' && order.topDays ? ` (${order.topDays} days)` : ''}</div>
  </div>

  <table class="item-table">
    <thead>
      <tr>
        <th style="width: 5%;">NO</th>
        <th style="width: 45%;">DESCRIPTION</th>
        <th style="width: 10%;">QTY</th>
        <th style="width: 10%;">UNIT</th>
        <th style="width: 15%;">UNIT PRICE</th>
        <th style="width: 15%;">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${(order.items || []).map((item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${item.productName || ''}${item.specNote ? `<br/><small>${item.specNote}</small>` : ''}</td>
          <td>${Number(item.qty || 0).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}</td>
          <td>${item.unit || 'Pcs'}</td>
          <td>Rp ${Number(item.price || 0).toLocaleString('id-ID')}</td>
          <td>Rp ${Number(item.total || 0).toLocaleString('id-ID')}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="summary-section">
    <table class="summary-table">
      <tr>
        <td>Sub Total:</td>
        <td>Rp ${subtotal.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
      ${order.discountPercent && order.discountPercent > 0 ? `
      <tr>
        <td>Discount (${order.discountPercent}%):</td>
        <td>Rp ${discount.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
      ` : ''}
      <tr class="total-row">
        <td>Total:</td>
        <td>Rp ${total.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    </table>
  </div>

  ${order.globalSpecNote ? `
  <div class="remarks-section">
    <div class="remarks-label">Remarks:</div>
    <div>${order.globalSpecNote}</div>
  </div>
  ` : ''}
</body>
</html>`;
      
      setViewPdfData({ html, soNo: order.soNo });
    } catch (error) {
      console.error('Error generating SO PDF:', error);
      showAlert('Failed to generate SO PDF. Please try again.', 'Error');
    }
  };

  // Handle Save Quotation to PDF
  const handleSaveQuotationToPDF = async () => {
    if (!viewQuotationPdfData) return;

    try {
      const electronAPI = (window as any).electronAPI;
      const fileName = `${viewQuotationPdfData.quoteNo}.pdf`;

      // Check if Electron API is available (for file picker)
      if (electronAPI && typeof electronAPI.savePdf === 'function') {
        // Electron: Use file picker to select save location, then convert HTML to PDF and save
        const result = await electronAPI.savePdf(viewQuotationPdfData.html, fileName);
        if (result.success) {
          showAlert(`PDF saved successfully to:\n${result.path}`, 'Success');
          setViewQuotationPdfData(null);
        } else if (!result.canceled) {
          showAlert(`Error saving PDF: ${result.error || 'Unknown error'}`, 'Error');
        }
        // If canceled, do nothing (user closed dialog)
      } else {
        // Browser: Open print dialog, user can select "Save as PDF"
        openPrintWindow(viewQuotationPdfData.html);
      }
    } catch (error: any) {
      console.error('Error saving PDF:', error);
      showAlert(`Error: ${error.message || 'Unknown error'}`, 'Error');
    }
  };

  // Handle Save SO to PDF
  const handleSaveSOToPDF = async () => {
    if (!viewPdfData) return;

    try {
      const electronAPI = (window as any).electronAPI;
      const fileName = `${viewPdfData.soNo}.pdf`;

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
      } else {
        // Browser: Open print dialog, user can select "Save as PDF"
        openPrintWindow(viewPdfData.html);
      }
    } catch (error: any) {
      console.error('Error saving PDF:', error);
      showAlert(`Error: ${error.message || 'Unknown error'}`, 'Error');
    }
  };

  // Handle Match SO dengan Quotation
  const handleMatchSO = async (quotation: SalesOrder, soNo: string) => {
    try {
      const so = orders.find(o => o.soNo.trim().toUpperCase() === soNo.trim().toUpperCase());
      if (!so) {
        showAlert(`SO No "${soNo}" tidak ditemukan!`, 'Validation Error');
        return;
      }

      // Update quotation dengan matchedSoNo
      const updatedQuotations = quotations.map(q => 
        q.id === quotation.id 
          ? { ...q, matchedSoNo: soNo }
          : q
      );
      await storageService.set('gt_quotations', updatedQuotations);
      setQuotations(updatedQuotations);
      setShowMatchSODialog(null);
      showAlert(`Quotation ${quotation.soNo} berhasil di-match dengan SO ${soNo}`, 'Success');
    } catch (error) {
      console.error('Error matching SO:', error);
      showAlert('Failed to match SO. Please try again.', 'Error');
    }
  };

  // Handle Create SO dari Quotation
  const handleCreateSOFromQuotation = async (quotation: SalesOrder) => {
    try {
      // Generate SO No baru (bisa pakai quotation no atau generate baru)
      const soNo = quotation.matchedSoNo || quotation.soNo.replace('QUO-', 'SO-') || `SO-${Date.now()}`;
      
      // Check duplicate SO No
      const ordersArray = Array.isArray(orders) ? orders : [];
      const existingSO = ordersArray.find(o => o.soNo.trim().toUpperCase() === soNo.trim().toUpperCase());
      if (existingSO) {
        showAlert(`SO No "${soNo}" sudah ada!`, 'Validation Error');
        return;
      }

      // Create SO dari quotation
      const newSO: SalesOrder = {
        id: Date.now().toString(),
        soNo: soNo,
        customer: quotation.customer,
        customerKode: quotation.customerKode,
        paymentTerms: quotation.paymentTerms,
        topDays: quotation.topDays,
        status: 'OPEN',
        created: new Date().toISOString(),
        items: quotation.items || [],
        globalSpecNote: quotation.globalSpecNote,
      };

      // Save SO
      const updatedOrders = [...ordersArray, newSO];
      await storageService.set('gt_salesOrders', updatedOrders);
      setOrders(updatedOrders);

      // Update quotation dengan matchedSoNo
      const updatedQuotations = quotations.map(q => 
        q.id === quotation.id 
          ? { ...q, matchedSoNo: soNo }
          : q
      );
      await storageService.set('gt_quotations', updatedQuotations);
      setQuotations(updatedQuotations);

      showAlert(`SO ${soNo} berhasil dibuat dari Quotation ${quotation.soNo}`, 'Success');
    } catch (error) {
      console.error('Error creating SO from quotation:', error);
      showAlert('Failed to create SO. Please try again.', 'Error');
    }
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
      showAlert('SO No wajib diisi! Masukkan nomor PO dari customer.', 'Validation Error');
      return;
    }
    if (!formData.customer) {
      showAlert('Please select customer', 'Validation Error');
      return;
    }
    if (!formData.items || formData.items.length === 0) {
      showAlert('Please add at least one product', 'Validation Error');
      return;
    }
    if (formData.items.some(item => !item.productId || item.qty <= 0)) {
      showAlert('Please fill all product fields and ensure qty > 0', 'Validation Error');
      return;
    }
    
    try {
      // Check duplicate SO No (only for new orders)
      if (!editingOrder) {
        const ordersArray = Array.isArray(orders) ? orders : [];
        const existingSO = ordersArray.find(o => o.soNo.trim().toUpperCase() === formData.soNo?.trim().toUpperCase());
        if (existingSO) {
          showAlert(`SO No "${formData.soNo}" sudah ada! Gunakan nomor PO customer yang berbeda.`, 'Validation Error');
          return;
        }
      }
      
      if (editingOrder) {
        const ordersArray = Array.isArray(orders) ? orders : [];
        const updated = ordersArray.map(o =>
          o.id === editingOrder.id
            ? {
                ...formData,
                id: editingOrder.id,
                soNo: formData.soNo || editingOrder.soNo, // Allow edit SO No
                created: editingOrder.created,
                status: editingOrder.status, // Keep status unless explicitly changed
                lastUpdate: new Date().toISOString(),
                timestamp: Date.now(),
                _timestamp: Date.now()
              } as SalesOrder
            : o
        );
        await storageService.set('gt_salesOrders', updated);
        setOrders(updated);
        showAlert(`SO ${formData.soNo} updated successfully`, 'Success');
      } else {
        const newOrder: SalesOrder = {
          id: Date.now().toString(),
          soNo: formData.soNo.trim(),
          customer: formData.customer || '',
          customerKode: formData.customerKode || '',
          paymentTerms: formData.paymentTerms || 'TOP',
          topDays: formData.topDays,
          status: 'OPEN', // Auto OPEN saat SO dibuat (PO customer masuk)
          created: new Date().toISOString(),
          lastUpdate: new Date().toISOString(),
          timestamp: Date.now(),
          _timestamp: Date.now(),
          items: formData.items || [],
          globalSpecNote: formData.globalSpecNote,
          discountPercent: formData.discountPercent || 0,
        };
        const ordersArray = Array.isArray(orders) ? orders : [];
        const updated = [...ordersArray, newOrder];
        await storageService.set('gt_salesOrders', updated);
        setOrders(updated);
        
        // Send notification to PPIC to create SPK
        try {
          const ppicNotifications = await storageService.get<any[]>('gt_ppicNotifications') || [];
          const existingNotif = ppicNotifications.find((n: any) => n.soNo === newOrder.soNo);
          
          if (!existingNotif) {
            const newPPICNotification = {
              id: `ppic-${Date.now()}-${newOrder.soNo}`,
              type: 'SO_CREATED',
              soNo: newOrder.soNo,
              customer: newOrder.customer || '',
              customerKode: newOrder.customerKode || '',
              items: newOrder.items.map((item: any) => ({
                product: item.productName || '',
                productId: item.productId || item.productKode || '',
                productKode: item.productKode || '',
                qty: item.qty || 0,
                unit: item.unit || 'PCS',
              })),
              status: 'PENDING',
              created: new Date().toISOString(),
            };
            await storageService.set('gt_ppicNotifications', [...ppicNotifications, newPPICNotification]);
            console.log(`✅ [SO] Created PPIC notification for SO ${newOrder.soNo}`);
            showAlert(`SO ${formData.soNo} created successfully.\n\n📧 Notification sent to PPIC to create SPK.`, 'Success');
          } else {
            showAlert(`SO ${formData.soNo} created successfully`, 'Success');
          }
        } catch (error: any) {
          console.error('Error creating PPIC notification:', error);
          showAlert(`SO ${formData.soNo} created successfully`, 'Success');
        }
      }
      setShowForm(false);
      setEditingOrder(null);
      setFormData({ soNo: '', customer: '', customerKode: '', paymentTerms: 'TOP', topDays: 30, items: [], globalSpecNote: '', discountPercent: 0 });
      setCustomerSearch('');
      setProductInputValue({});
      setProductSearch({});
      setShowProductDialog(null);
      setProductDialogSearch('');
      setQtyInputValue({});
      setPriceInputValue({});
      setSoDiscountInputValue('');
    } catch (error: any) {
      showAlert(`Error saving SO: ${error.message}`, 'Error');
    }
  };

  // Status otomatis: OPEN (saat SO dibuat), OPEN → CLOSE (saat invoice dibayar)
  // Tidak ada manual update status

  // Handle Edit
  const handleEdit = async (item: SalesOrder) => {
    // Bisa edit jika status OPEN (untuk sync dengan PO customer)
    // Tidak bisa edit jika sudah CLOSE
    if (item.status === 'CLOSE') {
      showAlert(`Cannot edit SO ${item.soNo}. SO with status ${item.status} cannot be edited.`, 'Cannot Edit');
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
    
    setFormData({
      soNo: item.soNo,
      customer: item.customer,
      customerKode: item.customerKode,
      paymentTerms: item.paymentTerms,
      topDays: item.topDays,
      items: item.items || [],
      globalSpecNote: item.globalSpecNote,
      discountPercent: item.discountPercent || 0,
    });
    setCustomerSearch(item.customer);
    setSoDiscountInputValue(item.discountPercent && item.discountPercent > 0 ? String(item.discountPercent) : '');
    const inputMap: { [key: number]: string } = {};
    (item.items || []).forEach((itm, idx) => {
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
    // Cek apakah SO sudah punya turunan (PO/Delivery)
    const poList = await storageService.get<any[]>('gt_purchaseOrders') || [];
    const deliveryList = await storageService.get<any[]>('gt_delivery') || [];
    const prList = await storageService.get<any[]>('gt_purchaseRequests') || [];
    
    const hasPO = poList.some((po: any) => po.soNo === item.soNo);
    const hasDelivery = deliveryList.some((del: any) => del.soNo === item.soNo);
    const hasPR = prList.some((pr: any) => pr.soNo === item.soNo);
    
    if (hasPO || hasDelivery || hasPR) {
      const relatedItems: string[] = [];
      if (hasPO) relatedItems.push('PO');
      if (hasDelivery) relatedItems.push('Delivery Note');
      if (hasPR) relatedItems.push('PR');
      
      showAlert(
        `Tidak bisa menghapus SO ${item.soNo}!\n\nSO ini sudah memiliki turunan:\n${relatedItems.map(i => `• ${i}`).join('\n')}\n\nJika ingin membatalkan, tutup SO melalui workflow normal (CLOSE).`,
        'Cannot Delete'
      );
      return;
    }
    
    // Cek apakah SO sudah CLOSE
    if (item.status === 'CLOSE') {
      showAlert(`Tidak bisa menghapus SO ${item.soNo} yang sudah CLOSE.`, 'Cannot Delete');
      return;
    }
    
    showConfirm(
      `Hapus SO: ${item.soNo}?\n\nTindakan ini tidak bisa dibatalkan.`,
      async () => {
        try {
          const ordersArray = Array.isArray(orders) ? orders : [];
          const updated = ordersArray.filter(o => o.id !== item.id);
          // Save dengan timestamp terbaru untuk ensure last write wins saat sync
          await storageService.set('gt_salesOrders', updated);
          setOrders(updated);
          closeDialog();
          showAlert(`SO ${item.soNo} berhasil dihapus.`, 'Success');
        } catch (error: any) {
          showAlert(`Error deleting SO: ${error.message}`, 'Error');
        }
      },
      () => closeDialog(),
      'Delete Confirmation'
    );
  };

  // Handle Confirm SO - Trigger notification to PPIC
  const handleConfirmSO = async (item: SalesOrder) => {
    if (!item.items || item.items.length === 0) {
      showAlert(`SO ${item.soNo} tidak memiliki items. Silakan tambahkan items terlebih dahulu.`, 'Validation Error');
      return;
    }

    try {
      // Cek apakah sudah ada notifikasi untuk SO ini
      const ppicNotifications = await storageService.get<any[]>('gt_ppicNotifications') || [];
      const existingNotif = ppicNotifications.find((n: any) => n.soNo === item.soNo && n.type === 'SO_CREATED');
      
      if (existingNotif) {
        showAlert(`SO ${item.soNo} sudah pernah dikirim notifikasi ke PPIC.\n\nNotifikasi ID: ${existingNotif.id}\nStatus: ${existingNotif.status}`, 'Already Notified');
        return;
      }

      // Kirim notifikasi ke PPIC
      const newPPICNotification = {
        id: `ppic-${Date.now()}-${item.soNo}`,
        type: 'SO_CREATED',
        soNo: item.soNo,
        customer: item.customer || '',
        customerKode: item.customerKode || '',
        items: item.items.map((item: any) => ({
          product: item.productName || '',
          productId: item.productId || item.productKode || '',
          productKode: item.productKode || '',
          qty: item.qty || 0,
          unit: item.unit || 'PCS',
        })),
        status: 'PENDING',
        created: new Date().toISOString(),
      };
      
      await storageService.set('gt_ppicNotifications', [...ppicNotifications, newPPICNotification]);
      console.log(`✅ [SO] Saved PPIC notification:`, newPPICNotification);
      console.log(`✅ [SO] Total PPIC notifications now:`, [...ppicNotifications, newPPICNotification].length);
      
      // Update SO dengan flag ppicNotified
      const ordersArray = Array.isArray(orders) ? orders : [];
      const updated = ordersArray.map(o => 
        o.id === item.id 
          ? { ...o, ppicNotified: true, ppicNotifiedAt: new Date().toISOString() }
          : o
      );
      await storageService.set('gt_salesOrders', updated);
      setOrders(updated);
      
      console.log(`✅ [SO] Confirmed and sent PPIC notification for SO ${item.soNo}`);
      showAlert(`SO ${item.soNo} berhasil di-confirm!\n\n📧 Notifikasi telah dikirim ke PPIC untuk membuat SPK.`, 'Success');
    } catch (error: any) {
      console.error('Error confirming SO:', error);
      showAlert(`Error confirming SO: ${error.message}`, 'Error');
    }
  };

  // Handle Generate Quotation
  const handleGenerateQuotation = (item: SalesOrder) => {
    if (!item.items || item.items.length === 0) {
      showAlert(`SO ${item.soNo} has no items. Please add items first.`, 'Validation Error');
      return;
    }
    setQuotationPreviewData(item);
    setShowQuotationPreview(true);
  };

  // Print Quotation
  const handlePrintQuotation = (item: SalesOrder) => {
    if (!item.items || item.items.length === 0) return;
    
    const total = item.items.reduce((sum, i) => sum + i.total, 0);
    const html = `
        <html>
          <head>
            <title>Quotation ${item.soNo}</title>
            <style>
              body { font-family: Arial; padding: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .total { text-align: right; font-weight: bold; margin-top: 20px; }
              .header { margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>QUOTATION</h1>
              <p><strong>SO No (PO Customer):</strong> ${item.soNo}</p>
              <p><strong>Customer:</strong> ${item.customer}</p>
              <p><strong>Payment Terms:</strong> ${item.paymentTerms}${item.paymentTerms === 'TOP' && item.topDays ? ` (${item.topDays} days)` : ''}</p>
              <p><strong>Date:</strong> ${formatDateSimple(item.created).full}</p>
              ${item.globalSpecNote ? `<p><strong>Spec Note:</strong> ${item.globalSpecNote}</p>` : ''}
            </div>
            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Price</th>
                  <th>Total</th>
                  ${item.items.some(i => i.specNote) ? '<th>Spec Note</th>' : ''}
                </tr>
              </thead>
              <tbody>
                ${item.items.map((i, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${i.productName}</td>
                    <td>${i.qty}</td>
                    <td>${i.unit}</td>
                    <td>Rp ${i.price.toLocaleString('id-ID')}</td>
                    <td>Rp ${i.total.toLocaleString('id-ID')}</td>
                    ${i.specNote ? `<td>${i.specNote}</td>` : ''}
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="total">
              <p><strong>Total: Rp ${total.toLocaleString('id-ID')}</strong></p>
            </div>
          </body>
        </html>
    `;
    openPrintWindow(html);
  };

  // Filter and sort orders (terbaru di atas) - HANYA SO, BUKAN QUOTATION
  const filteredOrders = useMemo(() => {
    // Tab quotation akan menampilkan quotations terpisah (pakai filteredQuotations)
    if (activeTab === 'quotation') {
      return [];
    }
    
    // Ensure orders is always an array
    // Filter hanya SO (bukan quotation - quotation disimpan terpisah di gt_quotations)
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
    
    // Sort by created date (terbaru di atas)
    // Ensure filtered is still an array before sorting
    if (!Array.isArray(filtered)) {
      return [];
    }
    return filtered.sort((a, b) => {
      const dateA = new Date(a.created).getTime();
      const dateB = new Date(b.created).getTime();
      return dateB - dateA; // Descending (newest first)
    });
  }, [orders, activeTab, statusFilter, dateFrom, dateTo, searchQuery]);

  // Filtered quotations untuk tab Quotation
  const filteredQuotations = useMemo(() => {
    let filtered = Array.isArray(quotations) ? quotations : [];
    
    // Search query untuk quotations
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
      
      // Sheet 1: All Orders - Summary
      const ordersArray = Array.isArray(orders) ? orders : [];
      const allOrders = [...ordersArray].sort((a, b) => {
        const dateA = new Date(a.created).getTime();
        const dateB = new Date(b.created).getTime();
        return dateB - dateA;
      });
      
      const allOrdersData = allOrders.map(order => {
        const totalAmount = order.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return {
          soNo: order.soNo,
          customer: order.customer,
          customerCode: order.customerKode || '',
          paymentTerms: order.paymentTerms,
          topDays: order.topDays || 0,
          status: order.status,
          createdDate: order.created,
          totalItems: order.items.length,
          totalAmount: totalAmount,
          globalSpecNote: order.globalSpecNote || '',
        };
      });

      const allOrdersColumns: ExcelColumn[] = [
        { key: 'soNo', header: 'SO No', width: 20 },
        { key: 'customer', header: 'Customer', width: 30 },
        { key: 'customerCode', header: 'Customer Code', width: 15 },
        { key: 'paymentTerms', header: 'Payment Terms', width: 15 },
        { key: 'topDays', header: 'TOP Days', width: 12, format: 'number' },
        { key: 'status', header: 'Status', width: 12 },
        { key: 'createdDate', header: 'Created Date', width: 18, format: 'date' },
        { key: 'totalItems', header: 'Total Items', width: 12, format: 'number' },
        { key: 'totalAmount', header: 'Total Amount', width: 18, format: 'currency' },
        { key: 'globalSpecNote', header: 'Global Spec Note', width: 50 },
      ];

      const wsAllOrders = createStyledWorksheet(allOrdersData, allOrdersColumns, 'Sheet 1 - All Orders');
      setColumnWidths(wsAllOrders, allOrdersColumns);
      const totalAllAmount = allOrdersData.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      addSummaryRow(wsAllOrders, allOrdersColumns, {
        soNo: 'TOTAL',
        totalItems: allOrdersData.length,
        totalAmount: totalAllAmount,
      });
      XLSX.utils.book_append_sheet(wb, wsAllOrders, 'Sheet 1 - All Orders');
      
      // Sheet 2: Outstanding Orders (Status OPEN)
      const outstandingOrders = allOrders.filter(o => o.status === 'OPEN');
      const outstandingData = outstandingOrders.map(order => {
        const totalAmount = order.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return {
          soNo: order.soNo,
          customer: order.customer,
          customerCode: order.customerKode || '',
          paymentTerms: order.paymentTerms,
          topDays: order.topDays || 0,
          createdDate: order.created,
          totalItems: order.items.length,
          totalAmount: totalAmount,
          globalSpecNote: order.globalSpecNote || '',
        };
      });

      if (outstandingData.length > 0) {
        const outstandingColumns: ExcelColumn[] = [
          { key: 'soNo', header: 'SO No', width: 20 },
          { key: 'customer', header: 'Customer', width: 30 },
          { key: 'customerCode', header: 'Customer Code', width: 15 },
          { key: 'paymentTerms', header: 'Payment Terms', width: 15 },
          { key: 'topDays', header: 'TOP Days', width: 12, format: 'number' },
          { key: 'confirmed', header: 'Confirmed', width: 12 },
          { key: 'createdDate', header: 'Created Date', width: 18, format: 'date' },
          { key: 'totalItems', header: 'Total Items', width: 12, format: 'number' },
          { key: 'totalAmount', header: 'Total Amount', width: 18, format: 'currency' },
          { key: 'globalSpecNote', header: 'Global Spec Note', width: 50 },
        ];
        const wsOutstanding = createStyledWorksheet(outstandingData, outstandingColumns, 'Sheet 2 - Outstanding');
        setColumnWidths(wsOutstanding, outstandingColumns);
        const totalOutstandingAmount = outstandingData.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        addSummaryRow(wsOutstanding, outstandingColumns, {
          soNo: 'TOTAL',
          totalItems: outstandingData.length,
          totalAmount: totalOutstandingAmount,
        });
        XLSX.utils.book_append_sheet(wb, wsOutstanding, 'Sheet 2 - Outstanding');
      }
      
      // Sheet 3: Order Items Detail
      const itemsDetail: any[] = [];
      allOrders.forEach(order => {
        order.items.forEach((item, idx) => {
          itemsDetail.push({
            soNo: order.soNo,
            customer: order.customer,
            status: order.status,
            itemNo: idx + 1,
            productCode: item.productKode,
            productName: item.productName,
            qty: item.qty,
            unit: item.unit,
            price: item.price,
            total: item.total,
            specNote: item.specNote || '',
          });
        });
      });
      
      if (itemsDetail.length > 0) {
        const itemsColumns: ExcelColumn[] = [
          { key: 'soNo', header: 'SO No', width: 20 },
          { key: 'customer', header: 'Customer', width: 30 },
          { key: 'status', header: 'Status', width: 12 },
          { key: 'itemNo', header: 'Item No', width: 10, format: 'number' },
          { key: 'productCode', header: 'Product Code', width: 20 },
          { key: 'productName', header: 'Product Name', width: 40 },
          { key: 'qty', header: 'Qty', width: 12, format: 'number' },
          { key: 'unit', header: 'Unit', width: 10 },
          { key: 'price', header: 'Price', width: 18, format: 'currency' },
          { key: 'total', header: 'Total', width: 18, format: 'currency' },
          { key: 'specNote', header: 'Spec Note', width: 40 },
        ];
        const wsItems = createStyledWorksheet(itemsDetail, itemsColumns, 'Sheet 3 - Order Items');
        setColumnWidths(wsItems, itemsColumns);
        const itemsTotal = itemsDetail.reduce((sum, i) => sum + (i.total || 0), 0);
        const itemsTotalQty = itemsDetail.reduce((sum, i) => sum + (i.qty || 0), 0);
        addSummaryRow(wsItems, itemsColumns, {
          soNo: 'TOTAL',
          itemNo: itemsDetail.length,
          qty: itemsTotalQty,
          total: itemsTotal,
        });
        XLSX.utils.book_append_sheet(wb, wsItems, 'Sheet 3 - Order Items');
      }
      
      // Sheet 4: BOM Detail

      
      
      
      const fileName = `Sales_Orders_Complete_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Exported complete sales orders data (${allOrdersData.length} orders, ${itemsDetail.length} items) to ${fileName}`, 'Success');
    } catch (error: any) {
      showAlert(`Error exporting to Excel: ${error.message}`, 'Error');
    }
  };

  // Get row color based on SO No (dark theme selang-seling)
  const getRowColor = (soNo: string): string => {
    const uniqueSOs = Array.from(new Set(filteredOrders.map(o => o.soNo)));
    const soIndex = uniqueSOs.indexOf(soNo);
    const rowColors = ['#1b1b1b', '#2f2f2f'];
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
      gridTemplateColumns: '2fr 70px 90px 110px auto',
      gap: '8px',
      width: '100%',
      fontSize: '11px',
      fontWeight: 600,
      textTransform: 'uppercase',
      color: 'var(--text-secondary)',
      padding: '6px 8px',
    }}>
      <div>Product</div>
      <div style={{ textAlign: 'center' }}>Qty</div>
      <div style={{ textAlign: 'right' }}>Harga</div>
      <div style={{ textAlign: 'right' }}>Total</div>
      <div style={{ textAlign: 'right' }}>Actions</div>
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
              {product.productName}
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
                justifyContent: 'flex-end',
                alignItems: 'center',
              }}
            >
              {order.status === 'OPEN' && (
                <SOActionMenu
                  onNote={() => {
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
                      storageService.set('gt_salesOrders', updatedOrders);
                      setOrders(updatedOrders);
                    }
                  }}
                  onDelete={() => {
                    showConfirm(
                      `Hapus product ${product.productName} dari SO?`,
                      async () => {
                        const updatedItems = order.items!.filter((it: SOItem) => it.id !== product.id);
                        const updatedOrders = orders.map(o =>
                          o.id === order.id ? { ...o, items: updatedItems } : o
                        );
                        await storageService.set('gt_salesOrders', updatedOrders);
                        setOrders(updatedOrders);
                        closeDialog();
                      },
                      () => closeDialog(),
                      'Delete Product'
                    );
                  }}
                  status={order.status}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Flatten SO data untuk table view (Excel-like) - setiap item jadi row terpisah
  const flattenedSOData = useMemo(() => {
    if (orderViewMode !== 'table') return [];
    
    const flattened: any[] = [];
    filteredOrders.forEach((order: SalesOrder) => {
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
          productCode: '-',
          productName: '-',
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
            productCode: item.productKode || item.productId || '-',
            productName: item.productName || '-',
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
  }, [filteredOrders, orderViewMode]);

  const renderOrderViewToggle = () => (
    <div
      style={{
        display: 'inline-flex',
        borderRadius: '999px',
        overflow: 'hidden',
        border: '1px solid',
        // Samain behavior sama toggle di Packaging: border solid, hitam di light, putih di dark
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
        {ordersList.map((order) => {
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

          return (
            <Card
              key={order.id}
              style={{
                borderLeft: `4px solid ${accentColor}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ minWidth: '200px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>SO No</div>
                  <div style={{ fontSize: '20px', fontWeight: 600 }}>{order.soNo || '-'}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{order.customer || '-'}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '200px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className={`status-badge status-${order.status.toLowerCase()}`} style={{ fontSize: '11px' }}>
                      {order.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Payment:&nbsp;
                    <strong>{order.paymentTerms}</strong>
                    {order.paymentTerms === 'TOP' && order.topDays ? ` (${order.topDays} days)` : ''}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Created:&nbsp;
                    <strong>{date}</strong>
                    {time && ` · ${time}`}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Total Items:&nbsp;
                    <strong>{(order.items || []).length}</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Total Qty:&nbsp;
                    <strong>{totalQty.toLocaleString('id-ID')}</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Total Value:&nbsp;
                    <strong>Rp {Math.round(totalValue).toLocaleString('id-ID')}</strong>
                  </div>
                </div>
              </div>

              {order.globalSpecNote && (
                <div style={{ marginTop: '12px', padding: '10px', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <strong>Global Spec Note:</strong> {order.globalSpecNote}
                </div>
              )}

              <div style={{ marginTop: '16px' }}>
                <div style={{ marginBottom: '6px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Items</div>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', backgroundColor: 'var(--bg-primary)' }}>
                  {renderOrderItemsHeader()}
                  <div style={{ marginTop: '8px' }}>
                    {renderOrderItemsGrid(order)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: '16px' }}>
                <Button variant="secondary" onClick={() => handleViewSO(order)} style={{ fontSize: '12px', padding: '6px 12px' }}>
                  View SO
                </Button>
                {order.status === 'OPEN' && !order.ppicNotified && (
                  <Button 
                    variant="primary" 
                    onClick={() => handleConfirmSO(order)} 
                    style={{ 
                      fontSize: '12px', 
                      padding: '6px 12px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none'
                    }}
                  >
                    ✓ Confirm SO
                  </Button>
                )}
                {order.status === 'OPEN' && order.ppicNotified && (
                  <div style={{ 
                    fontSize: '11px', 
                    padding: '6px 12px', 
                    backgroundColor: '#e8f5e9', 
                    color: '#2e7d32',
                    borderRadius: '4px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    ✓ Confirmed
                  </div>
                )}
                {order.status === 'OPEN' && (
                  <>
                    <Button variant="secondary" onClick={() => handleEdit(order)} style={{ fontSize: '12px', padding: '6px 12px' }}>
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => handleDelete(order)} style={{ fontSize: '12px', padding: '6px 12px' }}>
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>
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

  // Columns untuk table view (Excel-like) - menggunakan flattened data
  const tableColumns = [
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
      key: 'productCode',
      header: 'Product Code',
      render: (item: any) => (
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.productCode}</span>
      ),
    },
    {
      key: 'productName',
      header: 'Product',
      render: (item: any) => (
        <span style={{ fontSize: '13px' }}>{item.productName}</span>
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
      key: 'price',
      header: 'Unit Price',
      render: (item: any) => (
        <span style={{ fontSize: '12px', textAlign: 'right', display: 'block' }}>
          Rp {Math.ceil(item.price || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      render: (item: any) => (
        <span style={{ fontSize: '13px', textAlign: 'right', display: 'block', fontWeight: '500' }}>
          Rp {Math.ceil(item.total || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
        </span>
      ),
    },
    {
      key: 'paymentTerms',
      header: 'Payment Terms',
      render: (item: any) => (
        <span style={{ fontSize: '12px' }}>
          {item.paymentTerms}
          {item.paymentTerms === 'TOP' && item.topDays && ` (${item.topDays} days)`}
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
      key: 'created', 
      header: 'Created',
      render: (item: any) => {
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
      render: (item: any) => (
        <SOActionMenu
          onView={() => handleViewSO(item._order)}
          onEdit={() => handleEdit(item._order)}
          onDelete={() => handleDelete(item._order)}
          onConfirm={() => handleConfirmSO(item._order)}
          status={item.status}
          ppicNotified={item._order?.ppicNotified}
        />
      ),
    },
  ];

  const columns = [
    { 
      key: 'soNo', 
      header: 'SO No (PO Customer)',
      render: (item: SalesOrder) => (
        <strong style={{ color: '#2e7d32', fontSize: '14px' }}>{item.soNo}</strong>
      ),
    },
    { 
      key: 'customer', 
      header: 'Customer',
      render: (item: SalesOrder) => (
        <span style={{ color: '#ffffff' }}>{item.customer}</span>
      ),
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
      key: 'status',
      header: 'Status',
      render: (item: SalesOrder) => (
        <span className={`status-badge status-${item.status.toLowerCase()}`}>
          {item.status}
        </span>
      ),
    },
    { 
      key: 'created', 
      header: 'Created',
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
      header: 'Actions',
      render: (item: SalesOrder) => (
        <SOActionMenu
          onView={() => handleViewSO(item)}
          onEdit={() => handleEdit(item)}
          onDelete={() => handleDelete(item)}
          onConfirm={() => handleConfirmSO(item)}
          status={item.status}
          ppicNotified={item.ppicNotified}
        />
      ),
    },
    {
      key: 'items',
      header: renderOrderItemsHeader(),
      render: (item: SalesOrder) => renderOrderItemsGrid(item),
    },
  ];

  const orderEmptyMessage = activeTab === 'outstanding' ? 'No outstanding orders' : 'No orders found';

  // Columns khusus untuk Quotation table
  const quotationColumns = [
    { 
      key: 'soNo', 
      header: 'Quotation No',
      render: (item: SalesOrder) => (
        <strong style={{ color: '#2e7d32', fontSize: '14px' }}>{item.soNo}</strong>
      ),
    },
    { 
      key: 'customer', 
      header: 'Customer',
      render: (item: SalesOrder) => (
        <span style={{ color: '#ffffff' }}>{item.customer}</span>
      ),
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
      header: 'Created',
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
      header: 'Actions',
      render: (item: SalesOrder) => (
        <SOActionMenu
          onViewQuotation={() => handleViewQuotation(item)}
          onEditQuotation={() => handleEditQuotation(item)}
          onMatchSO={() => setShowMatchSODialog(item)}
          onCreateSO={() => handleCreateSOFromQuotation(item)}
          matchedSoNo={item.matchedSoNo}
        />
      ),
    },
  ];

  return (
    <div className="module-compact">
      <div className="page-header">
        <h1>Sales Orders</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
        </div>
        <Button onClick={handleCreate}>+ Create SO</Button>
      </div>


      {/* Create/Edit Form Dialog */}
      {showForm && (
        <div className="dialog-overlay" onClick={() => {
          setShowForm(false);
          setEditingOrder(null);
          setFormData({ soNo: '', customer: '', customerKode: '', paymentTerms: 'TOP', topDays: 30, items: [], globalSpecNote: '', discountPercent: 0 });
          setCustomerSearch('');
          setProductInputValue({});
          setSoDiscountInputValue('');
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1200px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <Card 
              title={editingOrder ? `Edit SO: ${editingOrder.soNo}` : 'Create New Sales Order'} 
              className="dialog-card"
            >
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    setShowForm(false);
                    setEditingOrder(null);
                    setFormData({ soNo: '', customer: '', customerKode: '', paymentTerms: 'TOP', topDays: 30, items: [], globalSpecNote: '', discountPercent: 0 });
                    setCustomerSearch('');
                    setProductInputValue({});
                    setSoDiscountInputValue('');
                  }}
                  style={{ fontSize: '14px', padding: '6px 12px' }}
                >
                  ✕ Close
                </Button>
              </div>
          <Input
            label="SO No * (Nomor PO dari Customer)"
            value={formData.soNo || ''}
            onChange={(v) => setFormData(prev => ({ ...prev, soNo: v }))}
            placeholder="Masukkan nomor PO dari customer..."
          />
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Customer * (Type to search)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                key={`customer-${formKey}`}
                type="text"
                value={customerSearch}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  // Force focus immediately
                  (e.target as HTMLInputElement).focus();
                }}
                onBeforeInput={(e) => {
                  e.stopPropagation();
                }}
                onChange={(e) => {
                  e.stopPropagation();
                  const searchValue = e.target.value;
                  setCustomerSearch(searchValue);
                  setShowCustomerDropdown(true);
                  const customer = customers.find(c => 
                    (c.nama || '').toLowerCase() === searchValue.toLowerCase() ||
                    (c.kode || '').toLowerCase() === searchValue.toLowerCase()
                  );
                  if (customer) {
                    setFormData(prev => ({
                      ...prev,
                      customer: customer.nama,
                      customerKode: customer.kode,
                    }));
                  } else {
                    setFormData(prev => ({
                      ...prev,
                      customer: searchValue,
                      customerKode: '',
                    }));
                  }
                }}
                onInput={(e) => {
                  e.stopPropagation();
                  const searchValue = (e.target as HTMLInputElement).value;
                  setCustomerSearch(searchValue);
                  setShowCustomerDropdown(true);
                  const customer = customers.find(c => 
                    (c.nama || '').toLowerCase() === searchValue.toLowerCase() ||
                    (c.kode || '').toLowerCase() === searchValue.toLowerCase()
                  );
                  if (customer) {
                    setFormData(prev => ({
                      ...prev,
                      customer: customer.nama,
                      customerKode: customer.kode,
                    }));
                  } else {
                    setFormData(prev => ({
                      ...prev,
                      customer: searchValue,
                      customerKode: '',
                    }));
                  }
                }}
                onFocus={(e) => {
                  e.stopPropagation();
                  if (!customerSearch && formData.customer) {
                    // Set display value with format: "KODE - NAMA"
                    const displayValue = formData.customerKode 
                      ? `${formData.customerKode} - ${formData.customer}`
                      : formData.customer;
                    setCustomerSearch(displayValue);
                  }
                  setShowCustomerDropdown(true);
                }}
                onBlur={(e) => {
                  e.stopPropagation();
                  // Don't update if clicking on dropdown item
                  const relatedTarget = e.relatedTarget as HTMLElement;
                  if (relatedTarget && relatedTarget.closest('[data-customer-dropdown]')) {
                    return;
                  }
                  setCustomerSearch(e.target.value);
                  setTimeout(() => setShowCustomerDropdown(false), 200);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
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
              {showCustomerDropdown && filteredCustomers.length > 0 && (
                <div 
                  data-customer-dropdown
                  style={{
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
                  {filteredCustomers.map(c => (
                    <div
                      key={c.id}
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent input blur
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const customerName = c.nama || '';
                        const customerCode = c.kode || '';
                        const displayValue = customerCode ? `${customerCode} - ${customerName}` : customerName;
                        setCustomerSearch(displayValue);
                        setFormData(prev => ({
                          ...prev,
                          customer: customerName,
                          customerKode: customerCode,
                        }));
                        setShowCustomerDropdown(false);
                        // Force focus back to input
                        setTimeout(() => {
                          const input = document.querySelector(`input[key="customer-${formKey}"]`) as HTMLInputElement;
                          if (input) {
                            input.focus();
                            input.blur();
                          }
                        }, 100);
                      }}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {c.kode ? `${c.kode} - ${c.nama || ''}` : (c.nama || '')}
                    </div>
                  ))}
                </div>
              )}
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
                      <th style={{ padding: '8px', textAlign: 'left', backgroundColor: 'var(--bg-tertiary)' }}>Qty</th>
                      <th style={{ padding: '8px', textAlign: 'left', backgroundColor: 'var(--bg-tertiary)' }}>Unit</th>
                      <th style={{ padding: '8px', textAlign: 'left', backgroundColor: 'var(--bg-tertiary)' }}>Price</th>
                      <th style={{ padding: '8px', textAlign: 'left', backgroundColor: 'var(--bg-tertiary)' }}>Total</th>
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
                              readOnly
                              value={getProductInputDisplayValue(index, item)}
                              onClick={(e) => {
                                e.stopPropagation();
                                setProductDialogSearch('');
                                setShowProductDialog(index);
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
                              onClick={() => {
                                setProductDialogSearch('');
                                setShowProductDialog(index);
                              }}
                              style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap' }}
                            >
                              Select
                            </Button>
                          </div>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input
                            key={`qty-${item.id}-${formKey}`}
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
                              setQtyInputValue(prev => ({ ...prev, [index]: cleaned }));
                              handleUpdateItem(index, 'qty', cleaned === '' ? '' : cleaned);
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
                            key={`unit-${item.id}-${formKey}`}
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
                            key={`price-${item.id}-${formKey}`}
                            type="text"
                            inputMode="decimal"
                            value={priceInputValue[index] !== undefined ? priceInputValue[index] : (item.price !== undefined && item.price !== null && item.price !== 0 ? String(item.price) : '')}
                            onFocus={(e) => {
                              e.stopPropagation();
                              const input = e.target as HTMLInputElement;
                              const currentPrice = item.price;
                              // Jika value adalah 0, langsung clear
                              if (currentPrice === 0 || currentPrice === null || currentPrice === undefined || String(currentPrice) === '0') {
                                setPriceInputValue(prev => ({ ...prev, [index]: '' }));
                                input.value = '';
                              } else {
                                input.select();
                              }
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const input = e.target as HTMLInputElement;
                              const currentPrice = item.price;
                              // Clear jika value adalah 0 saat mouse down
                              if (currentPrice === 0 || currentPrice === null || currentPrice === undefined || String(currentPrice) === '0') {
                                setPriceInputValue(prev => ({ ...prev, [index]: '' }));
                                input.value = '';
                              }
                            }}
                            onChange={(e) => {
                              e.stopPropagation();
                              let val = e.target.value;
                              // Hapus semua karakter non-numeric kecuali titik dan koma
                              val = val.replace(/[^\d.,]/g, '');
                              const cleaned = removeLeadingZero(val);
                              setPriceInputValue(prev => ({ ...prev, [index]: cleaned }));
                              handleUpdateItem(index, 'price', cleaned === '' ? '' : cleaned);
                            }}
                            onBlur={(e) => {
                              e.stopPropagation();
                              const val = e.target.value;
                              if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                                handleUpdateItem(index, 'price', 0);
                                setPriceInputValue(prev => {
                                  const newVal = { ...prev };
                                  delete newVal[index];
                                  return newVal;
                                });
                              } else {
                                handleUpdateItem(index, 'price', Number(val));
                                setPriceInputValue(prev => {
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
                                setPriceInputValue(prev => ({ ...prev, [index]: newVal }));
                                input.value = newVal;
                                handleUpdateItem(index, 'price', newVal);
                              }
                            }}
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
                            key={`specNote-${item.id}-${formKey}`}
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
                    <tr>
                      <td colSpan={4} style={{ padding: '8px', textAlign: 'right' }}>Sub Total:</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        Rp {((formData.items || []).reduce((sum, i) => sum + i.total, 0)).toLocaleString('id-ID')}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                    {(formData.discountPercent || 0) > 0 && (
                      <tr>
                        <td colSpan={4} style={{ padding: '8px', textAlign: 'right' }}>
                          Discount ({formData.discountPercent}%):
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#ff9800' }}>
                          - Rp {((formData.items || []).reduce((sum, i) => sum + i.total, 0) * (formData.discountPercent || 0) / 100).toLocaleString('id-ID')}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    )}
                    <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 'bold' }}>
                      <td colSpan={4} style={{ padding: '8px', textAlign: 'right' }}>Total:</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        Rp {(((formData.items || []).reduce((sum, i) => sum + i.total, 0)) * (1 - (formData.discountPercent || 0) / 100)).toLocaleString('id-ID')}
                      </td>
                      <td colSpan={2}></td>
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
              Discount (%)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={soDiscountInputValue !== '' ? soDiscountInputValue : (formData.discountPercent !== undefined && formData.discountPercent !== null && formData.discountPercent !== 0 ? String(formData.discountPercent) : '')}
              onFocus={(e) => {
                e.stopPropagation();
                const currentDiscount = formData.discountPercent;
                if (currentDiscount === 0 || currentDiscount === undefined || currentDiscount === null) {
                  setSoDiscountInputValue('');
                  e.target.value = '';
                } else {
                  setSoDiscountInputValue(String(currentDiscount));
                }
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                const currentDiscount = formData.discountPercent;
                if (currentDiscount === 0 || currentDiscount === undefined || currentDiscount === null) {
                  setSoDiscountInputValue('');
                  (e.target as HTMLInputElement).value = '';
                }
              }}
              onChange={(e) => {
                e.stopPropagation();
                const val = e.target.value;
                const cleaned = removeLeadingZero(val);
                setSoDiscountInputValue(cleaned);
                setFormData({ ...formData, discountPercent: cleaned === '' ? 0 : Number(cleaned) || 0 });
              }}
              onBlur={(e) => {
                e.stopPropagation();
                const val = e.target.value;
                if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                  setFormData({ ...formData, discountPercent: 0 });
                  setSoDiscountInputValue('');
                } else {
                  const numVal = Number(val);
                  if (numVal > 100) {
                    setFormData({ ...formData, discountPercent: 100 });
                    setSoDiscountInputValue('100');
                  } else {
                    setFormData({ ...formData, discountPercent: numVal });
                    setSoDiscountInputValue('');
                  }
                }
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
                const input = e.target as HTMLInputElement;
                const currentVal = input.value;
                // Jika kosong atau "0" dan user ketik angka 1-9, langsung replace
                if ((currentVal === '' || currentVal === '0') && /^[1-9]$/.test(e.key)) {
                  e.preventDefault();
                  const newVal = e.key;
                  setSoDiscountInputValue(newVal);
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

          <div style={{ marginBottom: '16px' }}>
            <Input
              label="Global Spec Note (Optional)"
              value={formData.globalSpecNote || ''}
              onChange={(v) => setFormData(prev => ({ ...prev, globalSpecNote: v }))}
              placeholder="Global specification note for all products..."
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <Button
              onClick={() => {
                setShowForm(false);
                setEditingOrder(null);
                setFormData({ soNo: '', customer: '', customerKode: '', paymentTerms: 'TOP', topDays: 30, items: [], globalSpecNote: '', discountPercent: 0 });
                setCustomerSearch('');
                setProductInputValue({});
                setSoDiscountInputValue('');
              }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} variant="primary">
              {editingOrder ? 'Update SO' : 'Save SO'}
            </Button>
          </div>
            </Card>
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
                        const productId = (prod.product_id || prod.kode || '').toString().trim();
                        const handleSelect = () => {
                          if (showProductDialog !== null) {
                            handleUpdateItem(showProductDialog, 'productId', prod.product_id || prod.kode);
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
                            <td style={{ padding: '12px' }}>{prod.product_id || prod.kode || '-'}</td>
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
                    const code = (p.product_id || p.kode || '').toLowerCase();
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

      {/* Quotation Product Selection Dialog */}
      {showQuotationProductDialog !== null && (
        <div className="dialog-overlay" onClick={() => {
          setShowQuotationProductDialog(null);
          setQuotationProductDialogSearch('');
        }} style={{ zIndex: 10001 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '90%', maxHeight: '90vh', overflowY: 'auto', zIndex: 10002 }}>
            <Card
              title="Select Product"
              className="dialog-card"
            >
              <div style={{ marginBottom: '16px' }}>
                <input
                  type="text"
                  value={quotationProductDialogSearch}
                  onChange={(e) => setQuotationProductDialogSearch(e.target.value)}
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
                {filteredProductsForQuotationDialog.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <div style={{ marginBottom: '16px' }}>No products found</div>
                    {quotationProductDialogSearch && (
                      <Button
                        variant="primary"
                        onClick={() => {
                          setNewProductForm({
                            kode: '',
                            nama: quotationProductDialogSearch,
                            satuan: 'PCS',
                            kategori: '',
                            hargaFg: 0,
                          });
                          setNewProductPriceInput('');
                          setShowCreateProductDialog(true);
                        }}
                      >
                        + Create "{quotationProductDialogSearch}"
                      </Button>
                    )}
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
                      {filteredProductsForQuotationDialog.map(prod => {
                        const price = prod.hargaSales || prod.hargaFg || (prod as any).harga || 0;
                        const productId = (prod.product_id || prod.kode || '').toString().trim();
                        const handleSelect = () => {
                          if (showQuotationProductDialog !== null) {
                            // Sama seperti di SO dialog
                            handleQuotationUpdateItem(showQuotationProductDialog, 'productId', prod.product_id || prod.kode);
                            setShowQuotationProductDialog(null);
                            setQuotationProductDialogSearch('');
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
                            <td style={{ padding: '12px' }}>{prod.product_id || prod.kode || '-'}</td>
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
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Showing {filteredProductsForQuotationDialog.length} of {quotationProductDialogSearch ? products.filter(p => {
                    const query = quotationProductDialogSearch.toLowerCase();
                    const code = (p.product_id || p.kode || '').toLowerCase();
                    const name = (p.nama || '').toLowerCase();
                    return code.includes(query) || name.includes(query);
                  }).length : products.length} product{filteredProductsForQuotationDialog.length !== 1 ? 's' : ''}
                  {filteredProductsForQuotationDialog.length >= 200 && (
                    <span style={{ color: '#ff9800', marginLeft: '8px' }}>
                      (Limited to 200. Use search to narrow down)
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setNewProductForm({
                        kode: '',
                        nama: quotationProductDialogSearch || '',
                        satuan: 'PCS',
                        kategori: '',
                        hargaFg: 0,
                      });
                      setNewProductPriceInput('');
                      setShowCreateProductDialog(true);
                    }}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    + Create New Product
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowQuotationProductDialog(null);
                      setQuotationProductDialogSearch('');
                    }}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Create Product Dialog dari Quotation */}
      {showCreateProductDialog && (
        <div className="dialog-overlay" onClick={() => setShowCreateProductDialog(false)} style={{ zIndex: 10003 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%', zIndex: 10004 }}>
            <Card
              title="Create New Product"
              className="dialog-card"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Input
                  label="Product Name *"
                  value={newProductForm.nama}
                  onChange={(v) => setNewProductForm({ ...newProductForm, nama: v })}
                  placeholder="Enter product name"
                />
                <Input
                  label="Unit"
                  value={newProductForm.satuan}
                  onChange={(v) => setNewProductForm({ ...newProductForm, satuan: v })}
                  placeholder="PCS"
                />
                <Input
                  label="Category"
                  value={newProductForm.kategori}
                  onChange={(v) => setNewProductForm({ ...newProductForm, kategori: v })}
                  placeholder="Product category"
                />
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                    Price Satuan
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={newProductPriceInput !== '' ? newProductPriceInput : (newProductForm.hargaFg ? String(newProductForm.hargaFg) : '')}
                    onFocus={(e) => {
                      const input = e.target as HTMLInputElement;
                      const currentVal = newProductForm.hargaFg || 0;
                      if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                        setNewProductPriceInput('');
                        input.value = '';
                      } else {
                        input.select();
                      }
                    }}
                    onChange={(e) => {
                      let val = e.target.value;
                      val = val.replace(/[^\d.,]/g, '');
                      const cleaned = removeLeadingZero(val);
                      setNewProductPriceInput(cleaned);
                      setNewProductForm({ ...newProductForm, hargaFg: cleaned === '' ? 0 : Number(cleaned) || 0 });
                    }}
                    onBlur={(e) => {
                      const val = e.target.value;
                      if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                        setNewProductForm({ ...newProductForm, hargaFg: 0 });
                        setNewProductPriceInput('');
                      } else {
                        setNewProductForm({ ...newProductForm, hargaFg: Number(val) });
                        setNewProductPriceInput('');
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
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowCreateProductDialog(false);
                      setNewProductForm({
                        kode: '',
                        nama: '',
                        satuan: 'PCS',
                        kategori: '',
                        hargaFg: 0,
                      });
                      setNewProductPriceInput('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleCreateProductFromQuotation}
                  >
                    Create & Add to Quotation
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {showQuotationPreview && quotationPreviewData && (
        <div className="dialog-overlay" onClick={() => setShowQuotationPreview(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <Card
              title={`Quotation Preview - ${quotationPreviewData.soNo}`}
              className="dialog-card"
          >
            <div style={{ marginBottom: '16px' }}>
              <p><strong>SO No (PO Customer):</strong> {quotationPreviewData.soNo}</p>
              <p><strong>Customer:</strong> {quotationPreviewData.customer}</p>
              <p><strong>Payment Terms:</strong> {quotationPreviewData.paymentTerms}{quotationPreviewData.paymentTerms === 'TOP' && quotationPreviewData.topDays ? ` (${quotationPreviewData.topDays} days)` : ''}</p>
              <p><strong>Date:</strong> {formatDateSimple(quotationPreviewData.created).full}</p>
              {quotationPreviewData.globalSpecNote && (
                <p><strong>Spec Note:</strong> {quotationPreviewData.globalSpecNote}</p>
              )}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Product</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Qty</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Unit</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Price</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {quotationPreviewData.items?.map((i, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px' }}>{i.productName}</td>
                    <td style={{ padding: '8px' }}>{i.qty}</td>
                    <td style={{ padding: '8px' }}>{i.unit}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>Rp {i.price.toLocaleString('id-ID')}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>Rp {i.total.toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 'bold' }}>
                  <td colSpan={4} style={{ padding: '8px', textAlign: 'right' }}>Total:</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    Rp {(quotationPreviewData.items?.reduce((sum, i) => sum + i.total, 0) || 0).toLocaleString('id-ID')}
                  </td>
                </tr>
              </tfoot>
            </table>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setShowQuotationPreview(false)}>
                Close
              </Button>
              <Button variant="primary" onClick={() => {
                handlePrintQuotation(quotationPreviewData);
                setShowQuotationPreview(false);
              }}>
                Print/Download PDF
              </Button>
            </div>
            </Card>
          </div>
        </div>
      )}

      {/* Match SO Dialog */}
      {showMatchSODialog && (
        <div className="dialog-overlay" onClick={() => setShowMatchSODialog(null)} style={{ zIndex: 10000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <Card
              title={`Match SO - Quotation ${showMatchSODialog.soNo}`}
              className="dialog-card"
            >
              <div style={{ marginBottom: '16px' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Pilih SO yang ingin di-match dengan quotation ini.
                </p>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  SO No
                </label>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleMatchSO(showMatchSODialog, e.target.value);
                    }
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
                  <option value="">-- Pilih SO --</option>
                  {orders.filter(o => o.status === 'OPEN').map(so => (
                    <option key={so.id} value={so.soNo}>
                      {so.soNo} - {so.customer}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={() => setShowMatchSODialog(null)}>
                  Cancel
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Orders Table / Quotation Tab */}
      <Card>
        <div className="tab-container">
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
        <div style={{ marginBottom: '12px', marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
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
          <div style={{ minWidth: '130px' }}>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="Date From"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'inherit',
              }}
            />
          </div>
          <div style={{ minWidth: '130px' }}>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="Date To"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'inherit',
              }}
            />
          </div>
          {activeTab !== 'quotation' && (
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <button
                onClick={() => setOrderViewMode('table')}
                style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: orderViewMode === 'table' ? '600' : '400',
                  backgroundColor: orderViewMode === 'table' ? 'var(--primary-color)' : 'transparent',
                  color: orderViewMode === 'table' 
                    ? (document.documentElement.getAttribute('data-theme') === 'light' ? '#1a1a1a' : '#fff')
                    : 'var(--text-primary)',
                  border: `1px solid ${orderViewMode === 'table' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                📊 Table
              </button>
              <button
                onClick={() => setOrderViewMode('cards')}
                style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: orderViewMode === 'cards' ? '600' : '400',
                  backgroundColor: orderViewMode === 'cards' ? 'var(--primary-color)' : 'transparent',
                  color: orderViewMode === 'cards' 
                    ? (document.documentElement.getAttribute('data-theme') === 'light' ? '#1a1a1a' : '#fff')
                    : 'var(--text-primary)',
                  border: `1px solid ${orderViewMode === 'cards' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                🃏 Cards
              </button>
            </div>
          )}
        </div>
        
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
              {filteredQuotations.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>
                  No quotations found. Click "+ Create Quotation" to create a new quotation.
                </p>
              ) : (
                <Table
                  columns={quotationColumns}
                  data={filteredQuotations}
                  onRowClick={(_item: SalesOrder) => {
                    // Optional: Show detail on row click
                  }}
                  getRowStyle={(item: SalesOrder) => ({
                    backgroundColor: getRowColor(item.soNo),
                  })}
                  emptyMessage="No quotations found"
                />
              )}
            </div>
          ) : (
            orderViewMode === 'cards'
              ? renderOrderCardView(filteredOrders, orderEmptyMessage)
              : (
                <Table
                  columns={tableColumns}
                  data={flattenedSOData}
                  onRowClick={(_item: any) => {
                    // Optional: Show detail on row click
                  }}
                  getRowStyle={(item: any) => ({
                    backgroundColor: getRowColor(item.soNo),
                  })}
                  emptyMessage={orderEmptyMessage}
                />
              )
          )}
        </div>
      </Card>

      {/* View Quotation PDF Dialog */}
      {viewQuotationPdfData && (
        <div 
          className="dialog-overlay" 
          onClick={() => setViewQuotationPdfData(null)}
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: '90%', 
              width: '1200px', 
              maxHeight: '90vh', 
              overflow: 'auto',
              zIndex: 10001
            }}
          >
            <Card className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2>Preview Quotation - {viewQuotationPdfData.quoteNo}</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="primary" onClick={handleSaveQuotationToPDF}>
                    💾 Save to PDF
                  </Button>
                  <Button variant="secondary" onClick={() => setViewQuotationPdfData(null)}>
                    Close
                  </Button>
                </div>
              </div>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                <iframe
                  srcDoc={viewQuotationPdfData.html}
                  style={{
                    width: '100%',
                    height: '70vh',
                    border: 'none',
                    backgroundColor: '#fff',
                  }}
                  title="Quotation Preview"
                />
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* View SO PDF Dialog */}
      {viewPdfData && (
        <div 
          className="dialog-overlay" 
          onClick={() => setViewPdfData(null)}
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: '90%', 
              width: '1200px', 
              maxHeight: '90vh', 
              overflow: 'auto',
              zIndex: 10001
            }}
          >
            <Card className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2>Preview SO - {viewPdfData.soNo}</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="primary" onClick={handleSaveSOToPDF}>
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
                  title="SO Preview"
                />
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Quotation Form Dialog */}
      {showQuotationFormDialog && (
        <div className="dialog-overlay" onClick={() => setShowQuotationFormDialog(false)} style={{ zIndex: 10000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1200px', width: '90%', maxHeight: '90vh', overflowY: 'auto', zIndex: 10001 }}>
            <Card
              title={editingQuotation ? `Edit Quotation - ${editingQuotation.soNo}` : "Create Quotation"}
              className="dialog-card"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                        // Jika value adalah 0, langsung clear
                        if (currentDiscount === 0 || currentDiscount === null || currentDiscount === undefined || String(currentDiscount) === '0') {
                          setQuotationDiscountInputValue('');
                          input.value = '';
                        }
                      }}
                      onMouseDown={(e) => {
                        const input = e.target as HTMLInputElement;
                        const currentDiscount = quotationFormData.discountPercent;
                        // Clear jika value adalah 0 saat mouse down
                        if (currentDiscount === 0 || currentDiscount === null || currentDiscount === undefined || String(currentDiscount) === '0') {
                          setQuotationDiscountInputValue('');
                          input.value = '';
                        }
                      }}
                      onChange={(e) => {
                        let val = e.target.value;
                        // Hapus semua karakter non-numeric kecuali titik dan koma
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
                        // Jika kosong atau "0" dan user ketik angka 1-9, langsung replace
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
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border)' }}>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Product</th>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Qty</th>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Unit</th>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Price</th>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Discount %</th>
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
                                    // Jika value adalah 0, langsung clear
                                    if (currentQty === 0 || currentQty === null || currentQty === undefined || String(currentQty) === '0') {
                                      setQuotationQtyInputValue(prev => ({ ...prev, [index]: '' }));
                                      input.value = '';
                                    }
                                  }}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    const input = e.target as HTMLInputElement;
                                    const currentQty = item.qty;
                                    // Clear jika value adalah 0 saat mouse down
                                    if (currentQty === 0 || currentQty === null || currentQty === undefined || String(currentQty) === '0') {
                                      setQuotationQtyInputValue(prev => ({ ...prev, [index]: '' }));
                                      input.value = '';
                                    }
                                  }}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    let val = e.target.value;
                                    // Hapus semua karakter non-numeric kecuali titik dan koma
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
                                    // Jika kosong atau "0" dan user ketik angka 1-9, langsung replace
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
                                  value={quotationPriceInputValue[index] !== undefined ? quotationPriceInputValue[index] : (item.price !== undefined && item.price !== null && item.price !== 0 ? String(item.price) : '')}
                                  onFocus={(e) => {
                                    e.stopPropagation();
                                    const input = e.target as HTMLInputElement;
                                    const currentPrice = item.price;
                                    // Jika value adalah 0, langsung clear
                                    if (currentPrice === 0 || currentPrice === null || currentPrice === undefined || String(currentPrice) === '0') {
                                      setQuotationPriceInputValue(prev => ({ ...prev, [index]: '' }));
                                      input.value = '';
                                    }
                                  }}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    const input = e.target as HTMLInputElement;
                                    const currentPrice = item.price;
                                    // Clear jika value adalah 0 saat mouse down
                                    if (currentPrice === 0 || currentPrice === null || currentPrice === undefined || String(currentPrice) === '0') {
                                      setQuotationPriceInputValue(prev => ({ ...prev, [index]: '' }));
                                      input.value = '';
                                    }
                                  }}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    let val = e.target.value;
                                    // Hapus semua karakter non-numeric kecuali titik dan koma
                                    val = val.replace(/[^\d.,]/g, '');
                                    const cleaned = removeLeadingZero(val);
                                    setQuotationPriceInputValue(prev => ({ ...prev, [index]: cleaned }));
                                    handleQuotationUpdateItem(index, 'price', cleaned === '' ? '' : cleaned);
                                  }}
                                  onBlur={(e) => {
                                    e.stopPropagation();
                                    const val = e.target.value;
                                    if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                                      handleQuotationUpdateItem(index, 'price', 0);
                                      setQuotationPriceInputValue(prev => {
                                        const newVal = { ...prev };
                                        delete newVal[index];
                                        return newVal;
                                      });
                                    } else {
                                      handleQuotationUpdateItem(index, 'price', Number(val));
                                      setQuotationPriceInputValue(prev => {
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
                                      setQuotationPriceInputValue(prev => ({ ...prev, [index]: newVal }));
                                      handleQuotationUpdateItem(index, 'price', newVal);
                                    }
                                  }}
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
                              <td style={{ padding: '8px' }}>
                                <input
                                  type="text"
                                  value={quotationItemDiscountInputValue[index] !== undefined ? quotationItemDiscountInputValue[index] : (item.discountPercent !== undefined && item.discountPercent !== null && item.discountPercent !== 0 ? String(item.discountPercent) : '')}
                                  onFocus={(e) => {
                                    e.stopPropagation();
                                    const input = e.target as HTMLInputElement;
                                    const currentDiscount = item.discountPercent || 0;
                                    if (currentDiscount === 0 || currentDiscount === null || currentDiscount === undefined || String(currentDiscount) === '0') {
                                      setQuotationItemDiscountInputValue(prev => ({ ...prev, [index]: '' }));
                                      input.value = '';
                                    }
                                  }}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    let val = e.target.value;
                                    val = val.replace(/[^\d.,]/g, '');
                                    const cleaned = removeLeadingZero(val);
                                    setQuotationItemDiscountInputValue(prev => ({ ...prev, [index]: cleaned }));
                                    handleQuotationUpdateItem(index, 'discountPercent', cleaned === '' ? '' : cleaned);
                                  }}
                                  onBlur={(e) => {
                                    e.stopPropagation();
                                    const val = e.target.value;
                                    if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                                      handleQuotationUpdateItem(index, 'discountPercent', 0);
                                      setQuotationItemDiscountInputValue(prev => {
                                        const newVal = { ...prev };
                                        delete newVal[index];
                                        return newVal;
                                      });
                                    } else {
                                      const numVal = Number(val);
                                      const clampedVal = Math.max(0, Math.min(100, numVal));
                                      handleQuotationUpdateItem(index, 'discountPercent', clampedVal);
                                      setQuotationItemDiscountInputValue(prev => {
                                        const newVal = { ...prev };
                                        delete newVal[index];
                                        return newVal;
                                      });
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
                            <td colSpan={4} style={{ padding: '8px', textAlign: 'right' }}>Sub Total:</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>
                              Rp {((quotationFormData.items || []).reduce((sum, i) => sum + i.total, 0)).toLocaleString('id-ID')}
                            </td>
                            <td colSpan={2}></td>
                          </tr>
                          {(quotationFormData.discountPercent || 0) > 0 && (
                            <tr>
                              <td colSpan={4} style={{ padding: '8px', textAlign: 'right' }}>
                                Discount ({quotationFormData.discountPercent}%):
                              </td>
                              <td style={{ padding: '8px', textAlign: 'right', color: '#ff9800' }}>
                                - Rp {((quotationFormData.items || []).reduce((sum, i) => sum + i.total, 0) * (quotationFormData.discountPercent || 0) / 100).toLocaleString('id-ID')}
                              </td>
                              <td colSpan={2}></td>
                            </tr>
                          )}
                          <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 'bold' }}>
                            <td colSpan={4} style={{ padding: '8px', textAlign: 'right' }}>Total:</td>
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
                        discountPercent: 0,
                        signatureBase64: '',
                        signatureName: '',
                        signatureTitle: '',
                      });
                      setQuotationCustomerSearch('');
                      setQuotationProductSearch({});
                      setQuotationQtyInputValue({});
                      setQuotationPriceInputValue({});
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
                        discountPercent: 0,
                        signatureBase64: '',
                        signatureName: '',
                        signatureTitle: '',
                      });
                      setQuotationCustomerSearch('');
                      setQuotationProductSearch({});
                      setQuotationQtyInputValue({});
                      setQuotationPriceInputValue({});
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

      {/* Custom Dialog - menggunakan hook terpusat */}
      <DialogComponent />
    </div>
  );
};

export default SalesOrders;




