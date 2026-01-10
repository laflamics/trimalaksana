import { useState, useEffect, useMemo, useRef } from 'react';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Input from '../../components/Input';
import NotificationBell from '../../components/NotificationBell';
import { storageService, extractStorageValue } from '../../services/storage';
import { deleteGTItem, reloadGTData, filterActiveItems } from '../../utils/gt-delete-helper';
import { generatePOHtml } from '../../pdf/po-pdf-template';
import { generatePOSheetHtml } from '../../pdf/po-sheet-template';
import { openPrintWindow, isMobile, isCapacitor, savePdfForMobile } from '../../utils/actions';
import { loadLogoAsBase64 } from '../../utils/logo-loader';
import * as XLSX from 'xlsx';
import { useDialog } from '../../hooks/useDialog';
import { createStyledWorksheet, setColumnWidths, ExcelColumn } from '../../utils/excel-helper';
import '../../styles/common.css';
import '../../styles/compact.css';
import './Purchasing.css';

interface PurchaseOrder {
  id: string;
  poNo: string;
  supplier: string;
  soNo: string;
  spkNo?: string;
  sourcePRId?: string;
  productItem: string;
  productId?: string;
  qty: number;
  price: number;
  total: number;
  discountPercent?: number; // Discount percentage
  paymentTerms: 'TOP' | 'COD' | 'CBD';
  topDays: number;
  status: 'DRAFT' | 'OPEN' | 'CLOSE';
  receiptDate: string;
  created: string;
  purchaseReason?: string;
  quality?: string;
  score?: string | number;
  keterangan?: string;
}

interface Supplier {
  id: string;
  kode: string;
  nama: string;
  alamat?: string;
  telepon?: string;
}

interface product {
  id: string;
  kode: string;
  product_id?: string;
  nama: string;
  priceMtr?: number;
  harga?: number;
  supplier?: string;
  unit?: string;
  deskripsi?: string;
}

interface PurchaseRequest {
  id: string;
  prNo: string;
  spkNo: string;
  soNo: string;
  customer: string;
  product: string;
  items: Array<{
    productId: string;
    productName: string;
    productKode: string;
    supplier: string;
    qty: number;
    unit: string;
    price: number;
    requiredQty: number;
    availableStock: number;
    shortageQty: number;
  }>;
  status: 'PENDING' | 'APPROVED' | 'PO_CREATED';
  created: string;
  createdBy: string;
}

// ActionMenu component untuk PO (dropdown 3 titik)
const POActionMenu = ({
  item,
  hasGRN,
  hasPendingFinance,
  onViewDetailPOSheet,
  onViewDetailPOFull,
  onEdit,
  onCreateGRN,
  onPrintPOFull,
  onPrintPOSheet,
  onUpdateStatus,
  onDelete,
}: {
  item: PurchaseOrder;
  hasGRN?: boolean;
  hasPendingFinance?: boolean;
  onViewDetailPOSheet?: () => void;
  onViewDetailPOFull?: () => void;
  onEdit?: () => void;
  onCreateGRN?: () => void;
  onPrintPOFull?: () => void;
  onPrintPOSheet?: () => void;
  onUpdateStatus?: () => void;
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
          {(onViewDetailPOSheet || onViewDetailPOFull) && (
            <>
              {onViewDetailPOSheet && (
                <button
                  onClick={() => { onViewDetailPOSheet(); setShowMenu(false); }}
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
                  👁️ View Detail PO Sheet
                </button>
              )}
              {onViewDetailPOFull && (
                <button
                  onClick={() => { onViewDetailPOFull(); setShowMenu(false); }}
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
                  👁️ View Detail PO
                </button>
              )}
            </>
          )}
          {onEdit && item.status !== 'CLOSE' && (
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
          {onCreateGRN && item.status === 'OPEN' && !hasGRN && (
            <button
              onClick={() => { onCreateGRN(); setShowMenu(false); }}
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
              ✅ Create GRN
            </button>
          )}
          {hasGRN && (
            <div style={{
              width: '100%',
              textAlign: 'left',
              padding: '6px 10px',
              fontSize: '10px',
              color: '#4CAF50',
              fontStyle: 'italic',
            }}>
              ✓ GRN Created
            </div>
          )}
          {(onPrintPOFull || onPrintPOSheet) && (
            <>
              {onPrintPOSheet && (
                <button
                  onClick={() => { onPrintPOSheet(); setShowMenu(false); }}
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
                  🖨️ Print PO Sheet
                </button>
              )}
              {onPrintPOFull && (
                <button
                  onClick={() => { onPrintPOFull(); setShowMenu(false); }}
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
                  🖨️ Print PO
                </button>
              )}
            </>
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
          {onDelete && item.status !== 'CLOSE' && (
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
          {hasPendingFinance && (
            <div style={{
              width: '100%',
              textAlign: 'left',
              padding: '6px 10px',
              fontSize: '10px',
              color: '#f6c343',
              fontStyle: 'italic',
              borderTop: '1px solid var(--border-color)',
              marginTop: '4px',
              paddingTop: '8px',
            }}>
              ⏳ Menunggu pembayaran supplier
            </div>
          )}
        </div>
      )}
    </>
  );
};

const Purchasing = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setproducts] = useState<product[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<PurchaseOrder | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'outstanding'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedPR, setSelectedPR] = useState<PurchaseRequest | null>(null);
  const [viewPdfData, setViewPdfData] = useState<{ html: string; poNo: string } | null>(null);
  const [selectedPOForReceipt, setSelectedPOForReceipt] = useState<PurchaseOrder | null>(null);
  const [grnList, setGrnList] = useState<any[]>([]);
  const [financeNotifications, setFinanceNotifications] = useState<any[]>([]);
  const [productInputValue, setproductInputValue] = useState('');
  const [supplierInputValue, setSupplierInputValue] = useState('');
  const [qtyInputValue, setQtyInputValue] = useState('');
  const [priceInputValue, setPriceInputValue] = useState('');
  const [formData, setFormData] = useState<Partial<PurchaseOrder>>({
    supplier: '',
    soNo: '',
    productItem: '',
    productId: '', // Tambahkan productId (SKU) ke formData
    qty: 0,
    price: 0,
    total: 0,
    discountPercent: 0,
    paymentTerms: 'TOP',
    topDays: 30,
    receiptDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    purchaseReason: '',
    quality: '',
    score: '',
    keterangan: '',
  });
  const [discountInputValue, setDiscountInputValue] = useState<string>('');
  
  // Custom Dialog - menggunakan hook terpusat
  const { showAlert, showConfirm, showPrompt, DialogComponent } = useDialog();

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

  useEffect(() => {
    const loadAll = async () => {
      // Load orders first (untuk enrich PO dengan spkNo)
      await loadOrders();
      // Then load PRs (untuk auto-update PR status berdasarkan PO yang sudah ada)
      await loadPurchaseRequests();
      // Load other data
      loadSuppliers();
      loadproducts();
      loadGRN();
    };
    loadAll();
    
    // Listen untuk storage changes (untuk refresh data ketika ada perubahan)
    const handleStorageChange = (e: CustomEvent) => {
      const key = e.detail?.key || '';
      if (key === 'gt_purchaseOrders' || key === 'gt_purchaseRequests' || key === 'gt_grn') {
        if (key === 'gt_grn') {
          loadGRN();
        } else {
          loadAll();
        }
      }
    };
    
    window.addEventListener('app-storage-changed', handleStorageChange as EventListener);
    
    return () => {
      window.removeEventListener('app-storage-changed', handleStorageChange as EventListener);
    };
  }, []);

  const loadGRN = async () => {
    try {
      const dataRaw = await storageService.get<any[]>('gt_grn');
      const data = extractStorageValue(dataRaw) || [];
      setGrnList(Array.isArray(data) ? data : []);
    } catch (error) {
      setGrnList([]);
    }
  };

  const loadSuppliers = async () => {
    const data = await storageService.get<Supplier[]>('gt_suppliers') || [];
    setSuppliers(data);
  };

  const loadproducts = async () => {
    console.log('[GT Purchasing] Loading products...');
    let data = await storageService.get<product[]>('gt_products') || [];
    console.log(`[GT Purchasing] Raw products from storage: ${data.length} items`);
    
    // If we have very few products, try force reload from file
    if (data.length <= 1) {
      console.log('[GT Purchasing] Few products detected, trying force reload from file...');
      const fileData = await storageService.forceReloadFromFile<product[]>('gt_products');
      if (fileData && Array.isArray(fileData) && fileData.length > data.length) {
        console.log(`[GT Purchasing] Force reload successful: ${fileData.length} products from file`);
        data = fileData;
      }
    }
    
    // Filter out deleted items menggunakan helper function
    const activeProducts = filterActiveItems(data);
    console.log(`[GT Purchasing] Active products after filtering: ${activeProducts.length} items`);
    setproducts(activeProducts);
  };

  const loadOrders = async () => {
    try {
      let [poDataRaw, financeNotifDataRaw, salesOrdersRaw] = await Promise.all([
        storageService.get<PurchaseOrder[]>('gt_purchaseOrders'),
        storageService.get<any[]>('gt_financeNotifications'),
        storageService.get<any[]>('gt_salesOrders'),
      ]);
      
      // Force reload sales orders if very few detected
      if (Array.isArray(salesOrdersRaw) && salesOrdersRaw.length <= 1) {
        console.log('[GT Purchasing] Few sales orders detected, trying force reload from file...');
        const fileData = await storageService.forceReloadFromFile<any[]>('gt_salesOrders');
        if (fileData && Array.isArray(fileData) && fileData.length > salesOrdersRaw.length) {
          console.log(`[GT Purchasing] Force reload successful: ${fileData.length} sales orders from file`);
          salesOrdersRaw = fileData;
        }
      }
      
      // Filter out deleted items menggunakan helper function
      let poData = filterActiveItems(Array.isArray(poDataRaw) ? poDataRaw : []);
      const financeNotifData = filterActiveItems(Array.isArray(financeNotifDataRaw) ? financeNotifDataRaw : []);
      const salesOrders = filterActiveItems(Array.isArray(salesOrdersRaw) ? salesOrdersRaw : []);
      
      // Enrich PO dengan spkNo dari SO jika belum ada
      let poDataUpdated = false;
      poData = poData.map((po: PurchaseOrder) => {
        if (!po.spkNo && po.soNo) {
          const so = salesOrders.find((s: any) => s.soNo === po.soNo);
          if (so && so.items && so.items.length > 0) {
            // Cari item yang match dengan product di PO
            const matchingItem = so.items.find((item: any) => 
              (item.productName || item.productKode || '').toString().trim().toLowerCase() === 
              (po.productItem || po.productId || '').toString().trim().toLowerCase()
            );
            if (matchingItem && matchingItem.spkNo) {
              poDataUpdated = true;
              return { ...po, spkNo: matchingItem.spkNo };
            } else if (so.items[0] && so.items[0].spkNo) {
              // Fallback: ambil spkNo dari item pertama
              poDataUpdated = true;
              return { ...po, spkNo: so.items[0].spkNo };
            }
          }
        }
        return po;
      });
      
      // Auto-reopen PO yang sudah CLOSE tapi masih ada outstanding qty
      const grnData = extractStorageValue(await storageService.get<any[]>('gt_grn')) || [];
      let poStatusUpdated = false;
      poData = poData.map((po: PurchaseOrder) => {
        if (po.status === 'CLOSE') {
          // Cek apakah masih ada outstanding qty
          const grnsForPO = grnData.filter((grn: any) => {
            const grnPO = (grn.poNo || '').toString().trim();
            const currentPO = (po.poNo || '').toString().trim();
            return grnPO === currentPO;
          });
          
          const totalReceived = grnsForPO.reduce((sum: number, grn: any) => {
            const qty = parseFloat(String(grn.qtyReceived || '0')) || 0;
            return sum + qty;
          }, 0);
          
          const poQty = parseFloat(String(po.qty || '0')) || 0;
          const remainingQty = poQty - totalReceived;
          
          // Jika masih ada outstanding qty, reopen ke OPEN
          if (remainingQty > 0 && poQty > 0) {
            poStatusUpdated = true;
            return { ...po, status: 'OPEN' as const };
          }
        }
        return po;
      });
      
      // Save updated PO data jika ada perubahan
      if (poDataUpdated || poStatusUpdated) {
        await storageService.set('gt_purchaseOrders', poData);
      }
      
      setOrders(poData);
      setFinanceNotifications(financeNotifData);
    } catch (error) {
      setOrders([]);
      setFinanceNotifications([]);
    }
  };

  const loadPurchaseRequests = async () => {
    const data = await storageService.get<PurchaseRequest[]>('gt_purchaseRequests') || [];
    const poData = await storageService.get<PurchaseOrder[]>('gt_purchaseOrders') || [];
    
    // Helper untuk normalize string (trim, lowercase)
    const normalize = (str: string | undefined | null): string => {
      return (str || '').toString().trim().toLowerCase();
    };
    
    // Auto-update PR status menjadi PO_CREATED jika sudah ada PO yang match
    let prDataUpdated = false;
    const updatedPRs = data.map((pr: PurchaseRequest) => {
      // Skip jika sudah PO_CREATED
      if (pr.status === 'PO_CREATED') return pr;
      
      // Cek apakah sudah ada PO untuk PR ini
      // IMPORTANT: Gunakan normalize yang sama seperti di pendingPRs untuk konsistensi
      const hasPO = poData.some((po: PurchaseOrder) => {
        // Match berdasarkan sourcePRId
        if (po.sourcePRId && normalize(po.sourcePRId) === normalize(pr.id)) {
          return true;
        }
        // Match berdasarkan spkNo (case-insensitive, trimmed)
        if (po.spkNo && pr.spkNo && normalize(po.spkNo) === normalize(pr.spkNo)) {
          return true;
        }
        // Match berdasarkan soNo + product (fallback)
        if (po.soNo && pr.soNo && normalize(po.soNo) === normalize(pr.soNo)) {
          const prProduct = (pr.product || (pr.items && pr.items.length > 0 ? pr.items[0].productName : '') || '').toString().trim().toLowerCase();
          const poProduct = (po.productItem || po.productId || '').toString().trim().toLowerCase();
          if (prProduct && poProduct && (prProduct === poProduct || prProduct.includes(poProduct) || poProduct.includes(prProduct))) {
            return true;
          } else if (!prProduct || !poProduct) {
            // Match jika salah satu product kosong
            return true;
          }
        }
        return false;
      });
      
      // Update status jika sudah ada PO
      if (hasPO && pr.status === 'PENDING') {
        prDataUpdated = true;
        return { ...pr, status: 'PO_CREATED' as const };
      }
      
      return pr;
    });
    
    // Save updated PR data jika ada perubahan
    if (prDataUpdated) {
      await storageService.set('gt_purchaseRequests', updatedPRs);
    }
    
    // Remove duplicates - keep only the first occurrence
    // IMPORTANT: Use normalize untuk konsistensi dengan pendingPRs
    // Cek berdasarkan: spkNo (prioritas), atau kombinasi soNo + customer jika spkNo tidak ada
    const seen = new Set<string>();
    const seenSoCustomer = new Set<string>(); // Track soNo+customer untuk detect duplicate dengan PR yang punya spkNo
    const unique = updatedPRs.filter(pr => {
      // Prioritas 1: spkNo (jika ada)
      if (pr.spkNo) {
        const spkKey = normalize(pr.spkNo);
        if (seen.has(spkKey)) {
          return false; // Duplicate
        }
        seen.add(spkKey);
        
        // Juga tambahkan kombinasi spkNo + soNo jika soNo ada
        if (pr.soNo) {
          const combinedKey = `${spkKey}|${normalize(pr.soNo)}`;
          seen.add(combinedKey);
          
          // Track soNo+customer untuk detect duplicate dengan PR tanpa spkNo
          if (pr.customer) {
            const soCustomerKey = `${normalize(pr.soNo)}|${normalize(pr.customer)}`;
            seenSoCustomer.add(soCustomerKey);
          }
        }
        return true;
      }
      
      // Prioritas 2: kombinasi soNo + customer (jika spkNo tidak ada)
      if (pr.soNo && pr.customer) {
        const soCustomerKey = `${normalize(pr.soNo)}|${normalize(pr.customer)}`;
        // Cek apakah sudah ada PR dengan spkNo yang punya soNo+customer yang sama
        if (seenSoCustomer.has(soCustomerKey)) {
          return false; // Duplicate - sudah ada PR dengan spkNo yang punya soNo+customer sama
        }
        if (seen.has(soCustomerKey)) {
          return false; // Duplicate
        }
        seen.add(soCustomerKey);
        seenSoCustomer.add(soCustomerKey);
        return true;
      }
      
      // Fallback: id (jika spkNo dan soNo tidak ada)
      const idKey = normalize(pr.id);
      if (seen.has(idKey)) {
        return false; // Duplicate
      }
      seen.add(idKey);
      return true;
    });
    
    // If duplicates were found, save cleaned data
    if (unique.length !== updatedPRs.length) {
      await storageService.set('gt_purchaseRequests', unique);
    }
    
    setPurchaseRequests(unique);
  };

  const getSupplierInputDisplayValue = () => {
    if (supplierInputValue !== undefined && supplierInputValue !== '') {
      return supplierInputValue;
    }
    if (formData.supplier) {
      const supplier = suppliers.find(s => s.nama === formData.supplier);
      if (supplier) {
        return `${supplier.kode} - ${supplier.nama}`;
      }
      return formData.supplier;
    }
    return '';
  };

  const handleSupplierInputChange = (text: string) => {
    setSupplierInputValue(text);
    if (!text) {
      setFormData({ ...formData, supplier: '' });
      return;
    }
    const normalized = text.toLowerCase();
    const matchedSupplier = suppliers.find(s => {
      const label = `${s.kode || ''}${s.kode ? ' - ' : ''}${s.nama || ''}`.toLowerCase();
      const code = (s.kode || '').toLowerCase();
      const name = (s.nama || '').toLowerCase();
      return label === normalized || code === normalized || name === normalized;
    });
    if (matchedSupplier) {
      setFormData({ ...formData, supplier: matchedSupplier.nama });
    } else {
      setFormData({ ...formData, supplier: text });
    }
  };

  const getproductInputDisplayValue = () => {
    if (productInputValue !== undefined && productInputValue !== '') {
      return productInputValue;
    }
    if (formData.productItem) {
      const product = products.find(m => m.nama === formData.productItem);
      if (product) {
        return `${product.product_id || product.kode} - ${product.nama}`;
      }
      return formData.productItem;
    }
    return '';
  };

  const handleproductInputChange = (text: string) => {
    setproductInputValue(text);
    if (!text) {
      setFormData({
        ...formData,
        productItem: '',
        price: 0,
        total: 0,
      });
      return;
    }
    const normalized = text.toLowerCase();
    const matchedproduct = products.find(m => {
      const label = `${m.product_id || m.kode || ''}${m.product_id || m.kode ? ' - ' : ''}${m.nama || ''}`.toLowerCase();
      const code = (m.product_id || m.kode || '').toLowerCase();
      const name = (m.nama || '').toLowerCase();
      return label === normalized || code === normalized || name === normalized;
    });
    if (matchedproduct) {
      const productPrice = matchedproduct.priceMtr || matchedproduct.harga || 0;
      const roundedPrice = Math.ceil(productPrice);
      const roundedTotal = Math.ceil((formData.qty || 0) * roundedPrice);
      // Untuk GT, SKU = codeItem = product_id atau kode (bukan product_id)
      const productId = (matchedproduct as any).product_id || matchedproduct.kode || matchedproduct.product_id || '';
      setFormData({
        ...formData,
        productItem: matchedproduct.nama,
        productId: productId, // Set productId (SKU = codeItem) saat product dipilih
        price: roundedPrice,
        total: roundedTotal,
      });
    } else {
      setFormData({
        ...formData,
        productItem: text,
        productId: '', // Clear productId jika tidak match
        price: 0,
        total: 0,
      });
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setproductInputValue('');
    setSupplierInputValue('');
    setQtyInputValue('');
    setPriceInputValue('');
    setFormData({
      supplier: '',
      soNo: '',
      productItem: '',
      productId: '', // Reset productId (SKU)
      qty: 0,
      price: 0,
      total: 0,
      paymentTerms: 'TOP',
      topDays: 30,
      receiptDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      quality: '',
      score: '',
      keterangan: '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.supplier || !formData.productItem || !formData.qty || formData.qty <= 0) {
      showAlert('Please fill all required fields (Supplier, product, Qty)', 'Validation Error');
      return;
    }
    if (!(formData.soNo && formData.soNo.trim()) && !(formData.purchaseReason && formData.purchaseReason.trim())) {
      showAlert('Isi "Reason pembelian" jika tidak link ke SO/SPK.', 'Validation Error');
      return;
    }
    try {
      if (editingItem) {
        // Update existing PO
        // Untuk GT, productItem = productItem (product name)
        const subtotal = Math.ceil((formData.qty || 0) * (formData.price || 0));
        const total = Math.ceil(subtotal * (1 - (formData.discountPercent || 0) / 100));
        const updatedPO: PurchaseOrder = {
          ...editingItem,
          supplier: formData.supplier || '',
          soNo: formData.soNo || '',
          purchaseReason: formData.purchaseReason || '',
          productItem: formData.productItem || '', // Backward compatibility
          productId: formData.productId || editingItem?.productId || '', // Pastikan productId (SKU) tersimpan
          qty: formData.qty || 0,
          price: Math.ceil(formData.price || 0),
          total,
          discountPercent: formData.discountPercent || 0,
          paymentTerms: formData.paymentTerms || 'TOP',
          topDays: (formData.paymentTerms === 'COD' || formData.paymentTerms === 'CBD') ? 0 : (formData.topDays || 30),
          receiptDate: formData.receiptDate || new Date().toISOString().split('T')[0],
          quality: formData.quality || '',
          score: formData.score || '',
          keterangan: formData.keterangan || '',
        };
        // Tambahkan productItem dan productName untuk GT
        (updatedPO as any).productItem = formData.productItem || '';
        (updatedPO as any).productName = formData.productItem || '';
        (updatedPO as any).productId = formData.productId || editingItem?.productId || '';
        const updated = orders.map(o => o.id === editingItem.id ? updatedPO : o);
        await storageService.set('gt_purchaseOrders', updated);
        setOrders(updated);
        showAlert(`PO updated: ${editingItem.poNo}`, 'Success');
      } else {
        // Create new PO with random number
        // Untuk GT, productItem = productItem (product name)
        const now = new Date();
        const year = String(now.getFullYear()).slice(-2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const randomCode = Math.random().toString(36).substr(2, 5).toUpperCase();
        const poNo = `PO-${year}${month}${day}-${randomCode}`;
        const subtotal = Math.ceil((formData.qty || 0) * (formData.price || 0));
        const total = Math.ceil(subtotal * (1 - (formData.discountPercent || 0) / 100));
        // Ambil spkNo dari formData atau dari SO jika soNo ada
        let spkNo = (formData as any).spkNo || '';
        if (!spkNo && formData.soNo) {
          // Coba ambil spkNo dari SO
          const salesOrders = await storageService.get<any[]>('gt_salesOrders') || [];
          const so = salesOrders.find((s: any) => s.soNo === formData.soNo);
          if (so && so.items && so.items.length > 0) {
            // Ambil spkNo dari item pertama yang match dengan product
            const matchingItem = so.items.find((item: any) => 
              (item.productName || item.productKode || '').toString().trim().toLowerCase() === 
              (formData.productItem || formData.productId || '').toString().trim().toLowerCase()
            );
            if (matchingItem && matchingItem.spkNo) {
              spkNo = matchingItem.spkNo;
            } else if (so.items[0] && so.items[0].spkNo) {
              // Fallback: ambil spkNo dari item pertama
              spkNo = so.items[0].spkNo;
            }
          }
        }
        
        const newPO: PurchaseOrder = {
          id: Date.now().toString(),
          poNo,
          supplier: formData.supplier || '',
          soNo: formData.soNo || '',
          spkNo: spkNo || undefined, // Pastikan spkNo disimpan jika ada
          purchaseReason: formData.purchaseReason || '',
          productItem: formData.productItem || '', // Backward compatibility
          productId: formData.productId || '', // Pastikan productId (SKU) tersimpan
          qty: formData.qty || 0,
          price: Math.ceil(formData.price || 0),
          total,
          discountPercent: formData.discountPercent || 0,
          paymentTerms: formData.paymentTerms || 'TOP',
          topDays: (formData.paymentTerms === 'COD' || formData.paymentTerms === 'CBD') ? 0 : (formData.topDays || 30),
          status: 'OPEN',
          receiptDate: formData.receiptDate || new Date().toISOString().split('T')[0],
          created: new Date().toISOString().split('T')[0],
          quality: formData.quality || '',
          score: formData.score || '',
          keterangan: formData.keterangan || '',
        };
        // Tambahkan productItem dan productName untuk GT
        (newPO as any).productItem = formData.productItem || '';
        (newPO as any).productName = formData.productItem || '';
        (newPO as any).productId = formData.productId || '';
        
        // Jika PO dibuat untuk SPK/SO yang ada di PR, update PR status
        // IMPORTANT: Gunakan normalize untuk matching (sama seperti di pendingPRs)
        if (formData.spkNo || formData.soNo) {
          // Helper untuk normalize string (trim, lowercase)
          const normalize = (str: string | undefined | null): string => {
            return (str || '').toString().trim().toLowerCase();
          };
          
          const relatedPR = purchaseRequests.find((pr: PurchaseRequest) => {
            if (pr.status !== 'PENDING') return false;
            // Match berdasarkan spkNo (prioritas) - gunakan normalize
            if (formData.spkNo && pr.spkNo && normalize(pr.spkNo) === normalize(formData.spkNo)) {
              return true;
            }
            // Match berdasarkan soNo (fallback) - gunakan normalize
            if (formData.soNo && pr.soNo && normalize(pr.soNo) === normalize(formData.soNo)) {
              return true;
            }
            return false;
          });
          if (relatedPR) {
            const updatedPRs = purchaseRequests.map((pr: PurchaseRequest) =>
              pr.id === relatedPR.id ? { ...pr, status: 'PO_CREATED' as const } : pr
            );
            await storageService.set('gt_purchaseRequests', updatedPRs);
            setPurchaseRequests(updatedPRs);
            // PR status updated to PO_CREATED
          }
        }
        
        const updated = [...orders, newPO];
        await storageService.set('gt_purchaseOrders', updated);
        setOrders(updated);
        
        // IMPORTANT: Refresh PR data untuk update status setelah PO dibuat
        await loadPurchaseRequests();
        
        showAlert(`PO created: ${poNo}`, 'Success');
      }
      setShowForm(false);
      setEditingItem(null);
      setproductInputValue('');
      setSupplierInputValue('');
      setQtyInputValue('');
      setPriceInputValue('');
      setFormData({
        supplier: '',
        soNo: '',
        productItem: '',
        qty: 0,
        price: 0,
        total: 0,
        discountPercent: 0,
        paymentTerms: 'TOP',
        topDays: 30,
        receiptDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        purchaseReason: '',
      });
      setDiscountInputValue('');
    } catch (error: any) {
      showAlert(`Error saving PO: ${error.message}`, 'Error');
    }
  };

  const generatePOHtmlContent = async (item: PurchaseOrder): Promise<string> => {
    // Load supplier data untuk mendapatkan alamat dan telepon
    const supplierData = suppliers.find(s => s.nama === item.supplier);
    const supplierName = item.supplier || '-';
    const supplierAddress = supplierData?.alamat || '-';
    const supplierPhone = supplierData?.telepon || '-';

    // Load product data untuk mendapatkan kode/description
    const productData = products.find(m => 
      m.nama === item.productItem || 
      (item.productId && (m.product_id || m.kode) === item.productId)
    );

    // Prepare enriched lines
    const enrichedLines = [{
      itemName: item.productItem || '-',
      itemSku: productData?.kode || productData?.product_id || '-',
      qty: item.qty || 0,
      price: item.price || 0,
      unit: productData?.unit || 'PCS',
      description: productData?.deskripsi || productData?.nama || item.productItem || '',
    }];

    // Calculate totals
    const total = item.total || 0;
    const includeTax = true; // Default include tax
    const ppn = includeTax ? Math.ceil(total * 0.11) : 0;
    const grandTotal = total + ppn;

    // Load company info from settings
    const companySettings = await storageService.get<{ companyName: string; address: string }>('companySettings');
    const company = {
      companyName: companySettings?.companyName || 'PT TRIMA LAKSANA JAYA PRATAMA',
      address: companySettings?.address || 'Jl. Raya Bekasi Km. 28, Cikarang, Bekasi 17530',
    };

    // Load logo menggunakan utility function dengan multiple fallback paths
    const logo = await loadLogoAsBase64();

    // Prepare detail object
    const detail = {
      poNo: item.poNo,
      createdAt: item.created,
      receiptDate: item.receiptDate,
      docs: {
        receiptDate: item.receiptDate,
        includeTax: includeTax,
      },
    };

    // Generate HTML using template
    return generatePOHtml({
      logo,
      company,
      detail,
      supplierName,
      supplierAddress,
      supplierPhone,
      enrichedLines,
      total,
      ppn,
      grandTotal,
      includeTaxFlag: includeTax,
    });
  };

  // Generate PO Sheet HTML (format baru sesuai requirement)
  const generatePOSheetHtmlContent = async (item: PurchaseOrder): Promise<string> => {
    // Format tanggal: DD/MM/YYYY
    const formatDate = (dateStr: string | undefined): string => {
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

    const poDate = formatDate(item.created || new Date().toISOString());
    const supplierName = item.supplier || '-';
    
    // Load supplier data untuk mendapatkan alamat
    const supplierData = suppliers.find(s => s.nama === item.supplier);
    const supplierAddress = supplierData?.alamat || '';

    // Get current user for PIC
    let pic = '-';
    try {
      const currentUserStr = localStorage.getItem('currentUser');
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        pic = currentUser.fullName || currentUser.username || '-';
      }
    } catch (e) {
      console.error('Error getting current user:', e);
    }

    // Load product data untuk mendapatkan kode/description
    const productData = products.find(m => 
      m.nama === item.productItem || 
      (item.productId && (m.product_id || m.kode) === item.productId)
    );

    // Prepare items array untuk table
    const items = [{
      no: 1,
      item: item.productItem || '-',
      quality: item.quality || productData?.deskripsi || '', // Gunakan quality dari PO, fallback ke deskripsi
      score: item.score !== undefined && item.score !== null ? item.score : '', // Gunakan score dari PO
      qty: item.qty || 0,
      unit: productData?.unit || 'PCS',
      price: item.price || 0,
      keterangan: item.keterangan || item.purchaseReason || productData?.deskripsi || '', // Gunakan keterangan dari PO, fallback ke purchaseReason
    }];

    // Load company info from settings
    const companySettings = await storageService.get<{ companyName: string; address: string }>('companySettings');
    const companyName = companySettings?.companyName || 'PT TRIMA LAKSANA JAYA PRATAMA';
    const companyAddress = companySettings?.address || 'Jl. Raya Bekasi Km. 28, Cikarang, Bekasi 17530';

    // Generate HTML using sheet template
    return generatePOSheetHtml({
      poNo: item.poNo,
      poDate,
      supplier: supplierName,
      supplierAddress,
      pic,
      status: item.status || 'DRAFT',
      items,
      companyName,
      companyAddress,
      page: 1,
      totalPages: 1,
    });
  };

  const handleViewDetailPOSheet = async (item: PurchaseOrder) => {
    try {
      // Gunakan template sheet baru (format sesuai requirement)
      const html = await generatePOSheetHtmlContent(item);
      setViewPdfData({ html, poNo: item.poNo });
    } catch (error: any) {
      showAlert(`Error generating PO Sheet preview: ${error.message}`, 'Error');
    }
  };

  const handleViewDetailPOFull = async (item: PurchaseOrder) => {
    try {
      // Gunakan template PO full lengkap
      const html = await generatePOHtmlContent(item);
      setViewPdfData({ html, poNo: item.poNo });
    } catch (error: any) {
      showAlert(`Error generating PO preview: ${error.message}`, 'Error');
    }
  };

  const handleSaveToPDF = async () => {
    if (!viewPdfData) return;

    try {
      const electronAPI = (window as any).electronAPI;
      const fileName = `${viewPdfData.poNo}.pdf`;

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
        // Mobile/Capacitor: Use Web Share API or print dialog
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
      showAlert(`Error: ${error.message || 'Unknown error'}`, 'Error');
    }
  };

  const handleEdit = (item: PurchaseOrder) => {
    if (item.status === 'CLOSE') {
      showAlert(`Cannot edit PO ${item.poNo}. CLOSE status cannot be edited.`, 'Cannot Edit');
      return;
    }
    setEditingItem(item);
    const supplier = suppliers.find(s => s.nama === item.supplier);
    if (supplier) {
      setSupplierInputValue(`${supplier.kode} - ${supplier.nama}`);
    } else {
      setSupplierInputValue(item.supplier);
    }
    const product = products.find(m => m.nama === item.productItem);
    if (product) {
      setproductInputValue(`${product.product_id || product.kode} - ${product.nama}`);
    } else {
      setproductInputValue(item.productItem);
    }
    setQtyInputValue('');
    setPriceInputValue('');
    setDiscountInputValue(item.discountPercent && item.discountPercent > 0 ? String(item.discountPercent) : '');
    setFormData({
      supplier: item.supplier,
      soNo: item.soNo,
      purchaseReason: item.purchaseReason || '',
      productItem: item.productItem,
      qty: item.qty,
      discountPercent: item.discountPercent || 0,
      price: item.price,
      total: item.total,
      paymentTerms: item.paymentTerms,
      topDays: item.topDays,
      receiptDate: item.receiptDate,
      quality: item.quality || '',
      score: item.score || '',
      keterangan: item.keterangan || '',
    });
    setShowForm(true);
  };

  const handleCreateGRN = (item: PurchaseOrder) => {
    // Allow create GRN jika masih ada outstanding qty, meskipun status CLOSE
    // Cek total qty yang sudah diterima
    const existingGRNs = grnList.filter((grn: any) => 
      (grn.poNo || '').toString().trim() === (item.poNo || '').toString().trim()
    );
    const totalReceived = existingGRNs.reduce((sum: number, grn: any) => sum + (grn.qtyReceived || 0), 0);
    const remainingQty = item.qty - totalReceived;
    
    if (remainingQty <= 0) {
      showAlert(`Cannot create GRN from PO: ${item.poNo}\n\nAll items have been received (${totalReceived}/${item.qty}).`, 'Cannot Create GRN');
      return;
    }
    
    setSelectedPOForReceipt(item);
  };

  const handleSaveReceipt = async (receiptData: { qtyReceived: number; receivedDate: string; notes?: string; suratJalan?: string; suratJalanName?: string; invoiceNo?: string; invoiceFile?: string; invoiceFileName?: string }) => {
    if (!selectedPOForReceipt) return;

    try {
      const item = selectedPOForReceipt;
      const qtyReceived = Math.ceil(receiptData.qtyReceived || item.qty);
      const receivedDate = receiptData.receivedDate || new Date().toISOString().split('T')[0];

      if (qtyReceived <= 0) {
        showAlert('Quantity received must be greater than 0', 'Validation Error');
        return;
      }

      // GRN Partial Handling: Cek total qtyReceived dari semua GRN untuk PO ini
      const grnPackagingRecords = extractStorageValue(await storageService.get<any[]>('gt_grn'));
      
      const existingGRNsForPO = grnPackagingRecords.filter((grn: any) => {
        const grnPO = (grn.poNo || '').toString().trim();
        const currentPO = (item.poNo || '').toString().trim();
        return grnPO === currentPO;
      });
      
      const totalQtyReceived = existingGRNsForPO.reduce((sum: number, grn: any) => sum + (grn.qtyReceived || 0), 0);
      const remainingQtyBeforeNewGRN = item.qty - totalQtyReceived;
      
      // Auto-fix: Jika total GRN melebihi PO qty (data corrupt), hapus GRN yang berlebihan
      if (totalQtyReceived > item.qty && existingGRNsForPO.length > 0) {
        
        // Tampilkan konfirmasi ke user
        const grnList = existingGRNsForPO.map(g => `• ${g.grnNo}: ${g.qtyReceived} (${g.receivedDate})`).join('\n');
        showConfirm(
          `⚠️ DETECTED DATA CORRUPTION!\n\n` +
          `PO: ${item.poNo}\n` +
          `PO Qty: ${item.qty}\n` +
          `Total GRN Qty: ${totalQtyReceived}\n\n` +
          `GRN Records Found (${existingGRNsForPO.length}):\n${grnList}\n\n` +
          `Hapus semua GRN untuk PO ini dan reset?\n` +
          `(Anda bisa create GRN baru setelah reset)`,
          async () => {
            // Hapus semua GRN untuk PO ini
            const cleanedGRNs = grnPackagingRecords.filter((grn: any) => {
              const grnPO = (grn.poNo || '').toString().trim();
              const currentPO = (item.poNo || '').toString().trim();
              return grnPO !== currentPO;
            });
            
            await storageService.set('gt_grn', cleanedGRNs);
            
            // Note: storageService.set() already triggers sync automatically, no need for manual sync
            
            showAlert(`✅ Berhasil hapus ${existingGRNsForPO.length} GRN corrupt untuk PO ${item.poNo}.\n\nData sudah di-sync ke server.\n\nSilakan create GRN baru.`, 'Success');
            setSelectedPOForReceipt(null);
            loadOrders();
          },
          () => {
            setSelectedPOForReceipt(null);
          },
          '🧹 Clean Up Corrupt GRN Data'
        );
        return;
      }

      // Validasi: qtyReceived tidak boleh melebihi remaining qty
      if (qtyReceived > remainingQtyBeforeNewGRN) {
        showAlert(
          `⚠️ Quantity received (${qtyReceived}) melebihi sisa yang belum diterima!\n\n` +
          `Qty Ordered: ${item.qty}\n` +
          `Total Sudah Diterima: ${totalQtyReceived}\n` +
          `Sisa: ${remainingQtyBeforeNewGRN}\n\n` +
          `Maksimal yang bisa diterima: ${remainingQtyBeforeNewGRN}`,
          'Validation Error'
        );
        return;
      }

      // Generate unique GRN number with random code
      const now = new Date();
      const year = String(now.getFullYear()).slice(-2);
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const randomCode = Math.random().toString(36).substr(2, 5).toUpperCase();
      const grnNo = `GRN-${year}${month}${day}-${randomCode}`;
      
      // Check duplicate GRN - hanya cek berdasarkan grnNo (karena grnNo sudah unique)
      // JANGAN cek berdasarkan poNo + qtyReceived + receivedDate karena user bisa membuat multiple GRN dengan qty yang sama pada tanggal yang sama untuk partial receipt
      const duplicateGRN = grnPackagingRecords.find((grn: any) => 
        grn.grnNo === grnNo
      );
      
      if (duplicateGRN) {
        showAlert(`⚠️ GRN duplicate terdeteksi!\n\nGRN ${duplicateGRN.grnNo} sudah ada.\n\nTidak bisa membuat GRN dengan nomor yang sama.`, 'Duplicate Detected');
        return;
      }
      
      // Untuk GT, simpan product name dan productId (SKU)
      const newGRN = {
        id: Date.now().toString(),
        grnNo: grnNo,
        poNo: item.poNo,
        soNo: item.soNo,
        spkNo: item.spkNo,
        supplier: item.supplier,
        productItem: item.productItem, // Backward compatibility
        productName: item.productItem, // GT: product name (alias untuk productItem)
        productId: item.productId || '',
        qtyOrdered: item.qty,
        qtyReceived: qtyReceived,
        status: 'OPEN', // GRN langsung OPEN setelah barang diterima
        receivedDate: receivedDate,
        notes: receiptData.notes || '',
        suratJalan: receiptData.suratJalan || '',
        suratJalanName: receiptData.suratJalanName || '',
        invoiceNo: receiptData.invoiceNo || '',
        invoiceFile: receiptData.invoiceFile || '',
        invoiceFileName: receiptData.invoiceFileName || '',
        created: new Date().toISOString(),
      };
      
      // IMPORTANT: Load dan save ke key yang SAMA!
      const currentGRN = extractStorageValue(await storageService.get<any[]>('gt_grn'));
      
      // Prevent duplicate before save - hanya cek berdasarkan grnNo (karena grnNo sudah unique dengan random code)
      // JANGAN cek berdasarkan poNo + qtyReceived + receivedDate karena user bisa membuat multiple GRN dengan qty yang sama pada tanggal yang sama untuk partial receipt
      const isDuplicate = currentGRN.some((grn: any) => 
        grn.grnNo === newGRN.grnNo
      );
      
      if (isDuplicate) {
        showAlert('⚠️ GRN duplicate terdeteksi! Tidak bisa save.\n\nKemungkinan double-click atau GRN dengan nomor yang sama sudah ada.', 'Error');
        return;
      }
      
      const updatedGRNs = Array.isArray(currentGRN) ? [...currentGRN, newGRN] : [newGRN];
      
      // Save GRN immediately untuk UI responsiveness
      await storageService.set('gt_grn', updatedGRNs);
      
      // Update grnList immediately untuk UI responsiveness
      setGrnList(Array.isArray(updatedGRNs) ? updatedGRNs : []);
      
      // Note: storageService.set() already triggers sync automatically, no need for manual sync
      
      // Update PO status: CLOSE hanya jika semua qty benar-benar sudah diterima (tidak ada outstanding)
      // IMPORTANT: Reload GRN data untuk memastikan kita menggunakan data terbaru setelah save
      const latestGRNs = extractStorageValue(await storageService.get<any[]>('gt_grn'));
      const latestGRNsForPO = latestGRNs.filter((grn: any) => {
        const grnPO = (grn.poNo || '').toString().trim();
        const currentPO = (item.poNo || '').toString().trim();
        return grnPO === currentPO;
      });
      
      const newTotalQtyReceived = latestGRNsForPO.reduce((sum: number, grn: any) => {
        const qty = parseFloat(String(grn.qtyReceived || '0')) || 0;
        return sum + qty;
      }, 0);
      
      const itemQty = parseFloat(String(item.qty || '0')) || 0;
      const remainingQty = itemQty - newTotalQtyReceived;
      
      // Hanya close jika remainingQty === 0 (tepat 0, semua sudah diterima) DAN itemQty > 0
      // JANGAN gunakan <= karena bisa terjadi rounding error atau data corrupt
      if (remainingQty === 0 && itemQty > 0 && newTotalQtyReceived > 0) {
        // Semua product sudah diterima, update PO status menjadi CLOSE
        const updatedOrders = orders.map((po: any) =>
          po.poNo === item.poNo ? { ...po, status: 'CLOSE' as const } : po
        );
        await storageService.set('gt_purchaseOrders', updatedOrders);
        setOrders(updatedOrders);
      } else if (remainingQty > 0) {
        // Masih ada outstanding qty, PASTIKAN status tetap OPEN (force update jika CLOSE)
        const updatedOrders = orders.map((po: any) => {
          if (po.poNo === item.poNo) {
            // Jika status CLOSE tapi masih ada outstanding, reopen ke OPEN
            if (po.status === 'CLOSE') {
              return { ...po, status: 'OPEN' as const };
            }
            // Jika sudah OPEN, tetap OPEN
            return po;
          }
          return po;
        });
        // Selalu update jika ada perubahan
        await storageService.set('gt_purchaseOrders', updatedOrders);
        setOrders(updatedOrders);
      }
      
      // NOTE: Delivery notification sekarang dibuat dari PPIC setelah delivery schedule dibuat
      // dengan validasi inventory stock. Tidak lagi dibuat dari GRN atau PO status.
      
      // Update inventory - product received (OTOMATIS MASUK KE INVENTORY dari GRN)
      const inventory = extractStorageValue(await storageService.get<any[]>('gt_inventory'));
      const productId = (item.productId || '').toString().trim(); // Di GT, productId = productId
      
      if (!productId) {
        showAlert('⚠️ Product ID tidak ditemukan. Inventory tidak dapat di-update.', 'Warning');
      } else {
        // Cari product di master untuk mendapatkan kode yang benar
        const products = extractStorageValue(await storageService.get<any[]>('gt_products'));
        const product = products.find((p: any) => 
          ((p.product_id || p.kode || '').toString().trim()) === productId
        );
        
        if (!product) {
          showAlert(`⚠️ Product tidak ditemukan di master data: ${productId}\n\nInventory tidak dapat di-update.`, 'Warning');
        } else {
          // Jika product adalah turunan, gunakan parent product code untuk inventory
          // Inventory selalu menggunakan parent product code untuk product turunan
          let codeItem = (product.product_id || product.kode || productId).toString().trim();
          
          if (product.isTurunan && product.parentProductId) {
            const parentProduct = products.find((p: any) => p.id === product.parentProductId);
            if (parentProduct && parentProduct.kode) {
              codeItem = parentProduct.kode;
              console.log(`[GRN Inventory] Product ${productId} adalah turunan, menggunakan parent code ${codeItem} untuk inventory`);
            }
          }
          
          // Cari existing inventory dengan codeItem (coba beberapa cara matching)
          let existingProduct = inventory.find((inv: any) => 
            (inv.codeItem || '').toString().trim() === codeItem
          );
          
          // Jika tidak ketemu, coba match dengan product_id atau kode (tapi tetap gunakan codeItem yang sudah di-resolve)
          // Note: codeItem sudah di-resolve ke parent jika turunan, jadi tidak perlu fallback ke productId asli
          if (!existingProduct) {
            // Fallback: coba match dengan codeItem yang sudah di-resolve (parent jika turunan)
            existingProduct = inventory.find((inv: any) => {
              const invCode = (inv.codeItem || '').toString().trim();
              return invCode === codeItem; // Gunakan codeItem yang sudah di-resolve
            });
          }
          
          // Get price dari PO (Purchase Order) - bukan dari master product
          // item.price sudah price per unit, bukan total!
          const pricePerUnit = item.price || 0;
          const grnNo = newGRN.grnNo || '';
          
          // ANTI-DUPLICATE: Cek apakah GRN number sudah pernah diproses untuk product ini
          let inventoryUpdateSkipped = false;
          if (existingProduct && grnNo) {
            const processedGRNs = existingProduct.processedGRNs || [];
            if (processedGRNs.includes(grnNo)) {
              console.warn(`⚠️ [GRN Inventory] GRN ${grnNo} sudah pernah diproses untuk product ${codeItem}. Skip update.`);
              showAlert(`⚠️ GRN ${grnNo} sudah pernah diproses untuk product ini.\n\nInventory tidak di-update untuk menghindari double counting.`, 'Warning');
              inventoryUpdateSkipped = true;
              // Jangan return, lanjutkan untuk membuat notifikasi delivery
            }
          }
          
          if (!inventoryUpdateSkipped) {
            if (existingProduct) {
              // Update existing inventory - tambah receive
            // Update price dengan price dari PO (jika ada)
            const oldReceive = existingProduct.receive || 0;
            const oldStockPremonth = existingProduct.stockPremonth || 0;
            const oldOutgoing = existingProduct.outgoing || 0;
            const newReceive = oldReceive + qtyReceived;
            // Rumus GT: premonth + received - outgoing = next stock
            const newNextStock = oldStockPremonth + newReceive - oldOutgoing;
            
            // Update price dengan price dari PO (jika PO punya price per unit)
            // pricePerUnit sudah price per unit dari PO, langsung pakai
            const updatedPrice = pricePerUnit > 0 ? pricePerUnit : (existingProduct.price || product.price || product.hargaSales || 0);
            
            // Tambahkan GRN number ke processedGRNs untuk anti-duplicate
            const processedGRNs = existingProduct.processedGRNs || [];
            if (grnNo && !processedGRNs.includes(grnNo)) {
              processedGRNs.push(grnNo);
            }
            
            const updatedInventory = inventory.map((inv: any) =>
              inv.id === existingProduct.id
                ? { 
                    ...inv, 
                    receive: newReceive, 
                    price: updatedPrice, // Update price dari PO
                    nextStock: newNextStock,
                    processedGRNs: processedGRNs, // Track GRN yang sudah diproses
                    lastUpdate: new Date().toISOString() 
                  }
                : inv
            );
            await storageService.set('gt_inventory', updatedInventory);
            showAlert(`✅ Inventory updated: ${item.productItem}\n\nStock: ${newNextStock} ${product.satuan || 'PCS'}\nPrice: Rp ${updatedPrice.toLocaleString('id-ID')}`, 'Success');
            } else {
              // Create new inventory entry for product
            // Price diambil dari PO, bukan dari master product
            const productPrice = pricePerUnit > 0 ? pricePerUnit : (product.price || product.hargaSales || 0);
            
            const newInventoryEntry = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              supplierName: item.supplier || '',
              codeItem: codeItem,
              description: product.nama || item.productItem,
              kategori: product.kategori || 'Product',
              satuan: product.satuan || 'PCS',
              price: productPrice, // Price dari PO
              stockPremonth: 0,
              receive: qtyReceived,
              outgoing: 0,
              return: 0,
              nextStock: 0 + qtyReceived - 0, // stockPremonth + receive - outgoing (rumus GT)
              processedGRNs: grnNo ? [grnNo] : [], // Track GRN yang sudah diproses
              lastUpdate: new Date().toISOString(),
            };
            inventory.push(newInventoryEntry);
            await storageService.set('gt_inventory', inventory);
            showAlert(`✅ New inventory entry created: ${item.productItem}\n\nStock: ${qtyReceived} ${product.satuan || 'PCS'}\nPrice: Rp ${productPrice.toLocaleString('id-ID')} (from PO)`, 'Success');
            }
          }
        }
      }
      
      // Auto-create journal entries untuk GRN (Debit Inventory, Credit AP) - non-blocking
      // Best practice: Journal entry dibuat saat barang diterima (GRN)
      // Jalankan di background untuk tidak block UI
      setTimeout(async () => {
        try {
          const journalEntries = await storageService.get<any[]>('gt_journalEntries') || [];
          const accounts = await storageService.get<any[]>('gt_accounts') || [];
          
          // Pastikan accounts ada
          if (accounts.length === 0) {
            const defaultAccounts = [
            { code: '1000', name: 'Cash', type: 'Asset', balance: 0 },
            { code: '1100', name: 'Accounts Receivable', type: 'Asset', balance: 0 },
            { code: '1200', name: 'Inventory', type: 'Asset', balance: 0 },
            { code: '1300', name: 'Fixed Assets', type: 'Asset', balance: 0 },
            { code: '2000', name: 'Accounts Payable', type: 'Liability', balance: 0 },
            { code: '2100', name: 'Accrued Expenses', type: 'Liability', balance: 0 },
            { code: '3000', name: 'Equity', type: 'Equity', balance: 0 },
            { code: '3100', name: 'Retained Earnings', type: 'Equity', balance: 0 },
            { code: '4000', name: 'Sales Revenue', type: 'Revenue', balance: 0 },
            { code: '4100', name: 'Other Income', type: 'Revenue', balance: 0 },
            { code: '5000', name: 'Cost of Goods Sold', type: 'Expense', balance: 0 },
            { code: '6000', name: 'Operating Expenses', type: 'Expense', balance: 0 },
            { code: '6100', name: 'Administrative Expenses', type: 'Expense', balance: 0 },
            { code: '6200', name: 'Financial Expenses', type: 'Expense', balance: 0 },
          ];
          await storageService.set('gt_accounts', defaultAccounts);
        }
        
        const entryDate = receivedDate;
        const poTotal = item.total || 0;
        
        // Cek apakah sudah ada journal entry untuk GRN ini (prevent duplicate)
        const journalEntriesArray = Array.isArray(journalEntries) ? journalEntries : [];
        const hasGRNEntry = journalEntriesArray.some((entry: any) =>
          entry && entry.reference === newGRN.grnNo &&
          (entry.account === '1200' || entry.account === '2000')
        );
        
        if (!hasGRNEntry && poTotal > 0) {
          const inventoryAccount = accounts.find((a: any) => a.code === '1200') || { code: '1200', name: 'Inventory' };
          const apAccount = accounts.find((a: any) => a.code === '2000') || { code: '2000', name: 'Accounts Payable' };
          
          // Debit Inventory, Credit AP
          const newEntries = [
            {
              entryDate,
              reference: newGRN.grnNo,
              account: '1200',
              accountName: inventoryAccount.name,
              debit: poTotal,
              credit: 0,
              description: `GRN ${newGRN.grnNo} - ${item.productItem || 'product'}`,
            },
            {
              entryDate,
              reference: newGRN.grnNo,
              account: '2000',
              accountName: apAccount.name,
              debit: 0,
              credit: poTotal,
              description: `GRN ${newGRN.grnNo} - ${item.supplier || 'Supplier'}`,
            },
          ];
          
          const baseLength = journalEntries.length;
          const entriesWithNo = newEntries.map((entry, idx) => ({
            ...entry,
            id: `${Date.now()}-grn-${idx + 1}`,
            no: baseLength + idx + 1,
          }));
          
          await storageService.set('gt_journalEntries', [...journalEntries, ...entriesWithNo]);
          console.log(`✅ Journal entries created for GRN ${newGRN.grnNo}: Inventory +${poTotal}, AP +${poTotal}`);
          }
        } catch (error: any) {
          console.error('Error creating journal entries for GRN:', error);
          // Jangan block proses, hanya log error (non-blocking)
        }
      }, 200);
      
      // PO tetap OPEN, akan di-close setelah payment di Finance
      // Tidak auto-close PO setelah GRN dibuat

      // Create notification untuk Finance - Supplier Payment (setelah GRN, ready untuk payment)
      try {
        const notifications = await storageService.get<any[]>('gt_financeNotifications') || [];
        // Check if notification already exists
        const existingPaymentNotif = notifications.find((n: any) => 
          n.poNo === item.poNo && n.type === 'SUPPLIER_PAYMENT' && n.grnNo === newGRN.grnNo
        );
        
        if (!existingPaymentNotif) {
          // Calculate total per GRN (partial receipt support)
          // Total = (qtyReceived * unitPrice) - discount
          const unitPrice = item.price || 0;
          const subtotal = Math.ceil(qtyReceived * unitPrice);
          const discountPercent = item.discountPercent || 0;
          const discountAmount = subtotal * discountPercent / 100;
          const grnTotal = Math.ceil(subtotal - discountAmount);
          
          const newNotification = {
            id: `payment-${Date.now()}-${item.poNo}-${newGRN.grnNo}`,
            type: 'SUPPLIER_PAYMENT',
            poNo: item.poNo,
            supplier: item.supplier,
            soNo: item.soNo || '',
            spkNo: item.spkNo || '',
            grnNo: newGRN.grnNo,
            productItem: item.productItem || '', // Backward compatibility
            productName: item.productItem || '', // GT: product name
            productId: item.productId || '', // GT: productId
            qty: qtyReceived, // Qty yang diterima di GRN ini
            total: grnTotal, // Total per GRN (bukan total PO)
            unitPrice: unitPrice, // Unit price untuk reference
            discountPercent: discountPercent, // Discount untuk reference
            receivedDate: receivedDate,
            suratJalan: receiptData.suratJalan || '',
            suratJalanName: receiptData.suratJalanName || '',
            invoiceNo: receiptData.invoiceNo || '',
            invoiceFile: receiptData.invoiceFile || '',
            invoiceFileName: receiptData.invoiceFileName || '',
            purchaseReason: item.purchaseReason || '',
            status: 'PENDING',
            created: new Date().toISOString(),
          };
          await storageService.set('gt_financeNotifications', [...notifications, newNotification]);
        }
      } catch (error: any) {
        // Error handling - silent fail untuk background operation
      }

      // Update Production notification - product sudah diterima
      const productionNotifications = extractStorageValue(await storageService.get<any[]>('gt_productionNotifications'));
      let notificationUpdated = false;
      const updatedProductionNotifications = productionNotifications.map((n: any) => {
        // Update notification jika SPK/SO sama dengan GRN ini
        // Match berdasarkan spkNo atau soNo
        const matchesSPK = item.spkNo && n.spkNo && (
          n.spkNo === item.spkNo || 
          n.spkNo.startsWith(item.spkNo.split('-')[0] + '-') ||
          item.spkNo.startsWith(n.spkNo.split('-')[0] + '-')
        );
        const matchesSO = item.soNo && n.soNo && n.soNo === item.soNo;
        
        if (matchesSPK || matchesSO) {
          notificationUpdated = true;
          return {
            ...n,
            productStatus: 'RECEIVED',
            status: 'READY_TO_PRODUCE',
            grnNo: newGRN.grnNo,
          };
        }
        return n;
      });
      
      // Jika tidak ada notification yang match, buat notification baru untuk Production
      if (!notificationUpdated && (item.spkNo || item.soNo)) {
        // Cari SPK data untuk mendapatkan info lengkap
        const spkData = extractStorageValue(await storageService.get<any[]>('spk'));
        const relatedSPK = spkData.find((s: any) => 
          (item.spkNo && s.spkNo === item.spkNo) || (item.soNo && s.soNo === item.soNo)
        );
        
        if (relatedSPK) {
          const newProductionNotification = {
            id: Date.now().toString(),
            type: 'PRODUCTION_SCHEDULE',
            spkNo: relatedSPK.spkNo || item.spkNo || '',
            soNo: relatedSPK.soNo || item.soNo || '',
            customer: relatedSPK.customer || '',
            product: relatedSPK.product || '',
            productId: relatedSPK.product_id || relatedSPK.kode || '',
            qty: relatedSPK.qty || 0,
            productStatus: 'RECEIVED',
            status: 'READY_TO_PRODUCE',
            grnNo: newGRN.grnNo,
            created: new Date().toISOString(),
          };
          updatedProductionNotifications.push(newProductionNotification);
          notificationUpdated = true;
        }
      }
      
      if (notificationUpdated) {
        await storageService.set('gt_productionNotifications', updatedProductionNotifications);
        console.log(`✅ Production notification updated: product RECEIVED, status READY_TO_PRODUCE for SPK/SO: ${item.spkNo || item.soNo}`);
      }
      
      // Update receipt date di PO
      const updatedOrders = orders.map((order) =>
        order.id === item.id
          ? {
              ...order,
              receiptDate: receivedDate,
              status: 'CLOSE' as const,
            }
          : order
      );
      await storageService.set('gt_purchaseOrders', updatedOrders);
      setOrders(updatedOrders);
      
      // NOTE: Delivery notification sekarang dibuat dari PPIC setelah delivery schedule dibuat
      // dengan validasi inventory stock. Tidak lagi dibuat dari GRN.
      
      // Reload orders untuk update UI
      await loadOrders();
      
      showAlert(`GRN created: ${newGRN.grnNo}\n\n✅ Inventory updated (+${qtyReceived})\n📧 Notification sent to Finance - Supplier Payment tab\n\n💡 Delivery notification akan dibuat dari PPIC setelah delivery schedule dibuat dengan validasi stock.`, 'Success');
      setSelectedPOForReceipt(null);
    } catch (error: any) {
      showAlert(`Error creating GRN: ${error.message}`, 'Error');
    }
  };

  const handlePrintPOFull = async (item: PurchaseOrder) => {
    try {
      const html = await generatePOHtmlContent(item);
      openPrintWindow(html);
    } catch (error: any) {
      showAlert(`Error generating PO PDF: ${error.message}`, 'Error');
    }
  };

  const handlePrintPOSheet = async (item: PurchaseOrder) => {
    try {
      const html = await generatePOSheetHtmlContent(item);
      openPrintWindow(html);
    } catch (error: any) {
      showAlert(`Error generating PO Sheet PDF: ${error.message}`, 'Error');
    }
  };

  const handleUpdateStatus = async (item: PurchaseOrder) => {
    showPrompt(
      `Update status for PO: ${item.poNo}\n\nCurrent: ${item.status}\n\nEnter new status (DRAFT/OPEN/CLOSE):`,
      item.status,
      async (newStatus) => {
        if (newStatus && newStatus !== item.status && ['DRAFT', 'OPEN', 'CLOSE'].includes(newStatus)) {
          try {
            const updated = orders.map(o =>
              o.id === item.id ? { ...o, status: newStatus as any } : o
            );
            await storageService.set('gt_purchaseOrders', updated);
            setOrders(updated);
            
            // NOTE: Delivery notification sekarang dibuat dari PPIC setelah delivery schedule dibuat
            // dengan validasi inventory stock. Tidak lagi dibuat dari PO status CLOSE.
        
            showAlert(`Status updated to: ${newStatus}`, 'Success');
          } catch (error: any) {
            showAlert(`Error updating status: ${error.message}`, 'Error');
          }
        } else {
          showAlert('Invalid status. Please enter DRAFT, OPEN, or CLOSE', 'Validation Error');
        }
      },
      () => {},
      'Update PO Status'
    );
  };

  // Sort orders by created date (terbaru di atas)
  const sortedOrders = useMemo(() => {
    // Ensure orders is always an array
    const ordersArray = Array.isArray(orders) ? orders : [];
    return [...ordersArray].sort((a, b) => {
      const dateA = new Date(a.created).getTime();
      const dateB = new Date(b.created).getTime();
      return dateB - dateA; // Descending (newest first)
    });
  }, [orders]);

  // Filter orders berdasarkan search query
  const filteredOrders = useMemo(() => {
    // Ensure sortedOrders is always an array
    let filtered = Array.isArray(sortedOrders) ? sortedOrders : [];
    
    // Tab filter - Outstanding tab hanya show status OPEN
    if (activeTab === 'outstanding') {
      filtered = filtered.filter(item => item.status === 'OPEN');
    }
    
    if (!searchQuery) return filtered;
    
    const query = searchQuery.toLowerCase();
    return filtered.filter((item: PurchaseOrder) => {
      return (
        (item.poNo || '').toLowerCase().includes(query) ||
        (item.supplier || '').toLowerCase().includes(query) ||
        (item.soNo || '').toLowerCase().includes(query) ||
        (item.productItem || '').toLowerCase().includes(query) ||
        (item.status || '').toLowerCase().includes(query)
      );
    });
  }, [sortedOrders, searchQuery, activeTab]);

  const handleExportExcel = async () => {
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
      
      // Load semua PO data (bukan hanya filtered)
      const allPOData = await storageService.get<PurchaseOrder[]>('purchaseOrders') || [];
      
      // Sheet 1: All Purchase Orders - Detail lengkap
      const poDataExport = allPOData.map((po: PurchaseOrder) => ({
        poNo: po.poNo,
        supplier: po.supplier,
        soNo: po.soNo || '',
        spkNo: po.spkNo || '',
        productItem: po.productItem,
        productId: po.productId || '',
        qty: po.qty,
        price: po.price,
        total: po.total,
        paymentTerms: po.paymentTerms,
        topDays: po.topDays,
        status: po.status,
        receiptDate: po.receiptDate,
        created: po.created,
        purchaseReason: po.purchaseReason || '',
      }));

      if (poDataExport.length > 0) {
        const poColumns: ExcelColumn[] = [
          { key: 'poNo', header: 'PO No', width: 20 },
          { key: 'supplier', header: 'Supplier', width: 30 },
          { key: 'soNo', header: 'SO No', width: 20 },
          { key: 'spkNo', header: 'SPK No', width: 20 },
          { key: 'productItem', header: 'Product', width: 40 },
          { key: 'productId', header: 'SKU', width: 20 },
          { key: 'qty', header: 'Qty', width: 12, format: 'number' },
          { key: 'price', header: 'Price', width: 18, format: 'currency' },
          { key: 'total', header: 'Total', width: 18, format: 'currency' },
          { key: 'paymentTerms', header: 'Payment Terms', width: 15 },
          { key: 'topDays', header: 'TOP Days', width: 12, format: 'number' },
          { key: 'status', header: 'Status', width: 12 },
          { key: 'receiptDate', header: 'Receipt Date', width: 18, format: 'date' },
          { key: 'created', header: 'Created Date', width: 18, format: 'date' },
          { key: 'purchaseReason', header: 'Purchase Reason', width: 40 },
        ];
        const wsPO = createStyledWorksheet(poDataExport, poColumns, 'Sheet 1 - Purchase Orders');
        setColumnWidths(wsPO, poColumns);
        const totalAmount = poDataExport.reduce((sum, po) => sum + (po.total || 0), 0);
        const totalQty = poDataExport.reduce((sum, po) => sum + (po.qty || 0), 0);
        addSummaryRow(wsPO, poColumns, {
          poNo: 'TOTAL',
          qty: totalQty,
          total: totalAmount,
        });
        XLSX.utils.book_append_sheet(wb, wsPO, 'Sheet 1 - Purchase Orders');
      }

      // Sheet 2: Outstanding PO (Status OPEN)
      const outstandingPO = allPOData.filter((po: PurchaseOrder) => po.status === 'OPEN');
      if (outstandingPO.length > 0) {
        const outstandingData = outstandingPO.map((po: PurchaseOrder) => ({
          poNo: po.poNo,
          supplier: po.supplier,
          soNo: po.soNo || '',
          spkNo: po.spkNo || '',
          productItem: po.productItem,
          qty: po.qty,
          price: po.price,
          total: po.total,
          paymentTerms: po.paymentTerms,
          receiptDate: po.receiptDate,
          created: po.created,
        }));

        const outstandingColumns: ExcelColumn[] = [
          { key: 'poNo', header: 'PO No', width: 20 },
          { key: 'supplier', header: 'Supplier', width: 30 },
          { key: 'soNo', header: 'SO No', width: 20 },
          { key: 'spkNo', header: 'SPK No', width: 20 },
          { key: 'productItem', header: 'Product', width: 40 },
          { key: 'qty', header: 'Qty', width: 12, format: 'number' },
          { key: 'price', header: 'Price', width: 18, format: 'currency' },
          { key: 'total', header: 'Total', width: 18, format: 'currency' },
          { key: 'paymentTerms', header: 'Payment Terms', width: 15 },
          { key: 'receiptDate', header: 'Receipt Date', width: 18, format: 'date' },
          { key: 'created', header: 'Created Date', width: 18, format: 'date' },
        ];
        const wsOutstanding = createStyledWorksheet(outstandingData, outstandingColumns, 'Sheet 2 - Outstanding');
        setColumnWidths(wsOutstanding, outstandingColumns);
        const totalOutstandingAmount = outstandingData.reduce((sum, o) => sum + (o.total || 0), 0);
        const totalOutstandingQty = outstandingData.reduce((sum, o) => sum + (o.qty || 0), 0);
        addSummaryRow(wsOutstanding, outstandingColumns, {
          poNo: 'TOTAL',
          qty: totalOutstandingQty,
          total: totalOutstandingAmount,
        });
        XLSX.utils.book_append_sheet(wb, wsOutstanding, 'Sheet 2 - Outstanding');
      }

      // Sheet 3: PO Summary by Supplier
      const supplierSummary: Record<string, any> = {};
      allPOData.forEach((po: PurchaseOrder) => {
        const supplier = po.supplier || 'Unknown';
        if (!supplierSummary[supplier]) {
          supplierSummary[supplier] = {
            supplier: supplier,
            poCount: 0,
            totalQty: 0,
            totalAmount: 0,
          };
        }
        supplierSummary[supplier].poCount++;
        supplierSummary[supplier].totalQty += po.qty || 0;
        supplierSummary[supplier].totalAmount += po.total || 0;
      });

      const supplierSummaryData = Object.values(supplierSummary);
      if (supplierSummaryData.length > 0) {
        const supplierColumns: ExcelColumn[] = [
          { key: 'supplier', header: 'Supplier', width: 30 },
          { key: 'poCount', header: 'PO Count', width: 12, format: 'number' },
          { key: 'totalQty', header: 'Total Qty', width: 15, format: 'number' },
          { key: 'totalAmount', header: 'Total Amount', width: 18, format: 'currency' },
        ];
        const wsSupplier = createStyledWorksheet(supplierSummaryData, supplierColumns, 'Sheet 3 - Supplier Summary');
        setColumnWidths(wsSupplier, supplierColumns);
        const grandTotalQty = supplierSummaryData.reduce((sum: number, s: any) => sum + (s.totalQty || 0), 0);
        const grandTotalAmount = supplierSummaryData.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0);
        addSummaryRow(wsSupplier, supplierColumns, {
          supplier: 'GRAND TOTAL',
          poCount: allPOData.length,
          totalQty: grandTotalQty,
          totalAmount: grandTotalAmount,
        });
        XLSX.utils.book_append_sheet(wb, wsSupplier, 'Sheet 3 - Supplier Summary');
      }

      if (wb.SheetNames.length === 0) {
        showAlert('No data available to export', 'Export Error');
        return;
      }

      const fileName = `Purchase_Orders_Complete_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Exported complete purchase orders data (${poDataExport.length} PO, ${outstandingPO.length} outstanding) to ${fileName}`, 'Export Success');
    } catch (error: any) {
      showAlert(`Error exporting to Excel: ${error.message}`, 'Export Error');
    }
  };

  // Get row color based on SO No (theme-aware selang-seling)
  const getRowColor = (soNo: string): string => {
    const uniqueSOs = Array.from(new Set(filteredOrders.map(o => o.soNo)));
    const soIndex = uniqueSOs.indexOf(soNo);
    const theme = document.documentElement.getAttribute('data-theme');
    // Light theme: subtle gray variations, Dark theme: darker variations
    const rowColors = theme === 'light' 
      ? ['#fafafa', '#f0f0f0'] 
      : ['#1b1b1b', '#2f2f2f']; // Solid colors with stronger contrast, no gradient
    return rowColors[soIndex % rowColors.length];
  };

  // Get button color based on PO No (theme-aware selang-seling)
  const getButtonColor = (poNo: string): { backgroundColor: string; color: string } => {
    const uniquePOs = Array.from(new Set(filteredOrders.map(o => o.poNo)));
    const poIndex = uniquePOs.indexOf(poNo);
    const theme = document.documentElement.getAttribute('data-theme');
    
    // Light theme: subtle colors, Dark theme: darker colors
    const buttonColors = theme === 'light' 
      ? [
          { backgroundColor: '#e3f2fd', color: '#1976d2' }, // Blue
          { backgroundColor: '#f3e5f5', color: '#7b1fa2' }, // Purple
          { backgroundColor: '#e8f5e9', color: '#388e3c' }, // Green
          { backgroundColor: '#fff3e0', color: '#f57c00' }, // Orange
        ]
      : [
          { backgroundColor: '#1e3a5f', color: '#90caf9' }, // Blue
          { backgroundColor: '#3d2a4a', color: '#ce93d8' }, // Purple
          { backgroundColor: '#2d4a2d', color: '#81c784' }, // Green
          { backgroundColor: '#4a3a2a', color: '#ffb74d' }, // Orange
        ];
    
    const index = poIndex >= 0 ? poIndex : 0;
    return buttonColors[index % buttonColors.length];
  };
  
  // Format date helper
  const formatDateSimple = (dateStr?: string) => {
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

  const columns = [
    { 
      key: 'poNo', 
      header: 'PO No',
      render: (item: PurchaseOrder) => (
        <strong style={{ color: '#2e7d32', fontSize: '13px' }}>{item.poNo}</strong>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: PurchaseOrder) => (
        <span className={`status-badge status-${item.status.toLowerCase()}`} style={{ fontSize: '11px' }}>
          {item.status}
        </span>
      ),
    },
    { 
      key: 'supplier', 
      header: 'Supplier',
      render: (item: PurchaseOrder) => (
        <span style={{ fontSize: '13px' }}>{item.supplier}</span>
      ),
    },
    { 
      key: 'soNo', 
      header: 'SO No',
      render: (item: PurchaseOrder) => (
        <span style={{ fontSize: '12px', color: '#2e7d32' }}>{item.soNo || '-'}</span>
      ),
    },
    { 
      key: 'productItem', 
      header: 'Product',
      render: (item: PurchaseOrder) => {
        // Cari dari PR jika ada sourcePRId dan productItem kosong
        let displayName = item.productItem || item.productId || '';
        if (!displayName && item.sourcePRId) {
          const pr = purchaseRequests.find((p: any) => p.id === item.sourcePRId);
          if (pr && pr.items && pr.items.length > 0) {
            // Cari item yang match dengan PO (berdasarkan qty atau price)
            const matchedItem = pr.items.find((itm: any) => 
              (itm.qty || itm.requiredQty || 0) === item.qty || 
              Math.abs((itm.price || 0) - (item.price || 0)) < 0.01
            ) || pr.items[0];
            // PR items bisa punya productName/productKode (dari PR lama) atau productName/productKode (dari SO baru)
            displayName = (matchedItem as any).productName || (matchedItem as any).productName || (matchedItem as any).productKode || (matchedItem as any).productKode || '';
          }
        }
        return (
          <span style={{ fontSize: '13px' }}>
            {displayName || '-'}
          </span>
        );
      },
    },
    {
      key: 'productId',
      header: 'SKU',
      render: (item: PurchaseOrder) => {
        // Untuk GT, productId = productId (SKU)
        let sku = (item as any).productId || item.productId || '';
        
        // Jika kosong, cari dari PR
        if (!sku && item.sourcePRId) {
          const pr = purchaseRequests.find((p: any) => p.id === item.sourcePRId);
          if (pr && pr.items && pr.items.length > 0) {
            const matchedItem = pr.items.find((itm: any) => 
              (itm.qty || itm.requiredQty || 0) === item.qty || 
              Math.abs((itm.price || 0) - (item.price || 0)) < 0.01
            ) || pr.items[0];
            sku = (matchedItem as any).productId || (matchedItem as any).productKode || (matchedItem as any).productId || (matchedItem as any).productKode || '';
          }
        }
        
        // Jika masih kosong, cari dari master products berdasarkan productItem
        if (!sku && item.productItem) {
          const product = products.find((m: any) => 
            (m.nama || '').toString().trim().toLowerCase() === (item.productItem || '').toString().trim().toLowerCase() ||
            (m.productItem || '').toString().trim().toLowerCase() === (item.productItem || '').toString().trim().toLowerCase()
          );
          if (product) {
            sku = (product as any).product_id || (product as any).kode || (product as any).product_id || '';
          }
        }
        
        return (
          <span style={{ fontSize: '12px', color: '#1976d2', fontWeight: '500', fontFamily: 'monospace' }}>
            {sku || '-'}
          </span>
        );
      },
    },
    { 
      key: 'qty', 
      header: 'Qty Order',
      render: (item: PurchaseOrder) => {
        const itemQty = parseFloat(String(item.qty || '0')) || 0;
        return (
          <span style={{ fontSize: '13px', textAlign: 'right', display: 'block' }}>
            {itemQty.toLocaleString('id-ID')}
          </span>
        );
      },
    },
    {
      key: 'qtyReceived',
      header: 'Qty Actual Receipt',
      render: (item: PurchaseOrder) => {
        // Cek total qty yang sudah diterima dari GRN
        const grnListArray = Array.isArray(grnList) ? grnList : [];
        const itemPoNo = (item.poNo || '').toString().trim();
        
        const existingGRNs = grnListArray.filter((grn: any) => {
          const grnPoNo = (grn.poNo || '').toString().trim();
          return grnPoNo === itemPoNo && grnPoNo !== '';
        });
        
        const totalReceived = existingGRNs.reduce((sum: number, grn: any) => {
          const qty = parseFloat(String(grn.qtyReceived || '0')) || 0;
          return sum + qty;
        }, 0);
        
        const itemQty = parseFloat(String(item.qty || '0')) || 0;
        const remainingQty = itemQty - totalReceived;
        
        // Hanya tampilkan "Complete" jika benar-benar ada GRN dan totalReceived >= itemQty
        if (totalReceived > 0 && remainingQty > 0) {
          // Partial receipt - tampilkan info outstanding
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '13px', textAlign: 'right', display: 'block', color: '#2e7d32' }}>
                {totalReceived.toLocaleString('id-ID')}
              </span>
              <span style={{ fontSize: '10px', color: '#ff9800', fontWeight: '600' }}>
                ⏳ {remainingQty} outstanding
              </span>
            </div>
          );
        } else if (totalReceived >= itemQty && itemQty > 0 && existingGRNs.length > 0) {
          // All received - hanya jika ada GRN yang valid
          return (
            <span style={{ fontSize: '13px', textAlign: 'right', display: 'block', color: '#4caf50' }}>
              {totalReceived.toLocaleString('id-ID')}
            </span>
          );
        }
        // Belum ada receipt - tampilkan 0
        return (
          <span style={{ fontSize: '13px', textAlign: 'right', display: 'block', color: 'var(--text-secondary)' }}>
            {totalReceived.toLocaleString('id-ID')}
          </span>
        );
      },
    },
    {
      key: 'price',
      header: 'Unit Price',
      render: (item: PurchaseOrder) => (
        <span style={{ fontSize: '12px', textAlign: 'right', display: 'block' }}>
          Rp {Math.ceil(item.price || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      render: (item: PurchaseOrder) => {
        // Hitung total berdasarkan qtyReceived jika sudah ada GRN, atau qty order jika belum
        const grnListArray = Array.isArray(grnList) ? grnList : [];
        const itemPoNo = (item.poNo || '').toString().trim();
        
        const existingGRNs = grnListArray.filter((grn: any) => {
          const grnPoNo = (grn.poNo || '').toString().trim();
          return grnPoNo === itemPoNo && grnPoNo !== '';
        });
        
        const totalReceived = existingGRNs.reduce((sum: number, grn: any) => {
          const qty = parseFloat(String(grn.qtyReceived || '0')) || 0;
          return sum + qty;
        }, 0);
        
        // Jika sudah ada GRN, gunakan qtyReceived untuk hitung total
        const qtyForTotal = totalReceived > 0 ? totalReceived : (item.qty || 0);
        const unitPrice = item.price || 0;
        const discountPercent = item.discountPercent || 0;
        const subtotal = Math.ceil(qtyForTotal * unitPrice);
        const calculatedTotal = Math.ceil(subtotal * (1 - discountPercent / 100));
        
        return (
          <strong style={{ fontSize: '13px', color: '#2e7d32', textAlign: 'right', display: 'block' }}>
            Rp {calculatedTotal.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
          </strong>
        );
      },
    },
    {
      key: 'paymentTerms',
      header: 'Payment Terms',
      render: (item: PurchaseOrder) => {
        if (item.paymentTerms === 'TOP') {
          const topDays = item.topDays || 0;
          return (
            <span style={{ fontSize: '12px' }}>
              TOP({topDays} hari)
            </span>
          );
        }
        return <span style={{ fontSize: '12px' }}>{item.paymentTerms}</span>;
      },
    },
    {
      key: 'purchaseReason',
      header: 'Reason',
      render: (item: PurchaseOrder) => (
        <span style={{ fontSize: '12px', color: item.purchaseReason ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          {item.purchaseReason || '-'}
        </span>
      ),
    },
    {
      key: 'receiptDate',
      header: 'Receipt Date',
      render: (item: PurchaseOrder) => (
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {formatDateSimple(item.receiptDate)}
        </span>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      render: (item: PurchaseOrder) => (
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {formatDateSimple(item.created)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: PurchaseOrder) => {
        const grnPackagingRecords = Array.isArray(grnList) ? grnList : [];
        const hasGRN = grnPackagingRecords.some((grn: any) => {
          const grnPO = (grn.poNo || '').toString().trim();
          const currentPO = (item.poNo || '').toString().trim();
          return grnPO === currentPO;
        });
        
        const financeNotificationsArray = Array.isArray(financeNotifications) ? financeNotifications : [];
        const hasPendingFinance = financeNotificationsArray.some((notif: any) => {
          const notifPO = (notif.poNo || '').toString().trim();
          const currentPO = (item.poNo || '').toString().trim();
          return notifPO === currentPO && notif.status === 'PENDING';
        });

        return (
          <POActionMenu
            item={item}
            hasGRN={hasGRN}
            hasPendingFinance={hasPendingFinance}
            onViewDetailPOSheet={() => handleViewDetailPOSheet(item)}
            onViewDetailPOFull={() => handleViewDetailPOFull(item)}
            onEdit={() => handleEdit(item)}
            onCreateGRN={() => handleCreateGRN(item)}
            onPrintPOFull={() => handlePrintPOFull(item)}
            onPrintPOSheet={() => handlePrintPOSheet(item)}
            onUpdateStatus={() => handleUpdateStatus(item)}
            onDelete={() => handleDeletePO(item)}
          />
        );
      },
    },
  ];

  // Filter PENDING PR and remove duplicates (by spkNo)
  // Also exclude PRs that already have PO created (by checking orders)
  const pendingPRs = useMemo(() => {
    // Helper untuk normalize string (trim, lowercase)
    const normalize = (str: string | undefined | null): string => {
      return (str || '').toString().trim().toLowerCase();
    };
    
    const pending = purchaseRequests.filter(pr => {
      // Skip jika status bukan PENDING
      if (pr.status !== 'PENDING') {
        return false;
      }
      
      // Cek apakah sudah ada PO untuk PR ini (berdasarkan sourcePRId, spkNo, atau soNo)
      const hasPO = orders.some((po: PurchaseOrder) => {
        // Match berdasarkan sourcePRId (jika PO dibuat dari PR)
        if (po.sourcePRId && normalize(po.sourcePRId) === normalize(pr.id)) {
          return true;
        }
        // Match berdasarkan spkNo (case-insensitive, trimmed)
        if (po.spkNo && pr.spkNo && normalize(po.spkNo) === normalize(pr.spkNo)) {
          return true;
        }
        // Match berdasarkan soNo (fallback, jika spkNo tidak match)
        if (po.soNo && pr.soNo && normalize(po.soNo) === normalize(pr.soNo)) {
          // Double check: pastikan product juga match (untuk menghindari false positive)
          const prProduct = (pr.product || (pr.items && pr.items.length > 0 ? pr.items[0].productName : '') || '').toString().trim().toLowerCase();
          const poProduct = (po.productItem || po.productId || '').toString().trim().toLowerCase();
          if (prProduct && poProduct && (prProduct === poProduct || prProduct.includes(poProduct) || poProduct.includes(prProduct))) {
            return true;
          } else if (!prProduct || !poProduct) {
            // Jika salah satu product kosong, tetap match berdasarkan soNo saja
            return true;
          }
        }
        return false;
      });
      
      // Hanya tampilkan jika belum ada PO
      return !hasPO;
    });
    
    // Remove duplicates - keep only the first occurrence
    // Cek berdasarkan: spkNo (prioritas), atau kombinasi soNo + customer jika spkNo tidak ada
    const seen = new Set<string>();
    const seenSoCustomer = new Set<string>(); // Track soNo+customer untuk detect duplicate dengan PR yang punya spkNo
    const unique = pending.filter(pr => {
      // Prioritas 1: spkNo (jika ada)
      if (pr.spkNo) {
        const spkKey = normalize(pr.spkNo);
        if (seen.has(spkKey)) {
          return false; // Duplicate
        }
        seen.add(spkKey);
        
        // Juga tambahkan kombinasi spkNo + soNo jika soNo ada
        if (pr.soNo) {
          const combinedKey = `${spkKey}|${normalize(pr.soNo)}`;
          seen.add(combinedKey);
          
          // Track soNo+customer untuk detect duplicate dengan PR tanpa spkNo
          if (pr.customer) {
            const soCustomerKey = `${normalize(pr.soNo)}|${normalize(pr.customer)}`;
            seenSoCustomer.add(soCustomerKey);
          }
        }
        return true;
      }
      
      // Prioritas 2: kombinasi soNo + customer (jika spkNo tidak ada)
      if (pr.soNo && pr.customer) {
        const soCustomerKey = `${normalize(pr.soNo)}|${normalize(pr.customer)}`;
        // Cek apakah sudah ada PR dengan spkNo yang punya soNo+customer yang sama
        if (seenSoCustomer.has(soCustomerKey)) {
          return false; // Duplicate - sudah ada PR dengan spkNo yang punya soNo+customer sama
        }
        if (seen.has(soCustomerKey)) {
          return false; // Duplicate
        }
        seen.add(soCustomerKey);
        seenSoCustomer.add(soCustomerKey);
        return true;
      }
      
      // Fallback: id (jika spkNo dan soNo tidak ada)
      const idKey = normalize(pr.id);
      if (seen.has(idKey)) {
        return false; // Duplicate
      }
      seen.add(idKey);
      return true;
    });
    
    return unique;
  }, [purchaseRequests, orders]);

  // Format notifications untuk NotificationBell
  const prNotifications = useMemo(() => {
    return pendingPRs.map((pr) => ({
      id: pr.id,
      title: `PR ${pr.prNo}`,
      message: `SPK: ${pr.spkNo} | SO: ${pr.soNo} | Customer: ${pr.customer} | ${pr.items.length} item(s)`,
      timestamp: pr.created,
      pr: pr,
    }));
  }, [pendingPRs]);

  // Handle create PO from PR
  const handleCreatePOFromPR = async (pr: PurchaseRequest) => {
    setSelectedPR(pr);
  };

  const handleApprovePR = async (pr: PurchaseRequest, selectedSuppliers: { [key: string]: string }, paymentTerms: string, topDays: number) => {
    try {
      const newPOs: PurchaseOrder[] = [];
      
      // Jika COD atau CBD, topDays harus 0
      const finalTopDays = (paymentTerms === 'COD' || paymentTerms === 'CBD') ? 0 : (topDays || 30);
      
      for (const item of pr.items) {
        // Normalize productId untuk handle berbagai format (backward compatibility)
        const itemAny = item as any;
        const productId = item.productId || itemAny.materialId || '';
        const productName = item.productName || itemAny.materialName || itemAny.product || productId || 'Unknown Product';
        const productKode = item.productKode || itemAny.materialKode || productId || '';
        
        const supplierName = selectedSuppliers[productId] || item.supplier;
        if (!supplierName) {
          const displayName = productName || productId || 'Unknown Product';
          showAlert(`Supplier belum dipilih untuk product: ${displayName}${productId ? ` (${productId})` : ''}`, 'Validation Error');
          return;
        }

        // Re-load price dari master product jika price = 0
        let itemPrice = item.price;
        if (!itemPrice || itemPrice === 0) {
          const product = products.find((m: any) => {
            const mId = (m.product_id || m.kode || '').toString().trim();
            const itemId = productId || productKode || '';
            return mId === itemId;
          });
          if (product) {
            itemPrice = product.priceMtr || product.harga || (product as any).hargaSales || 0;
          }
        }

        // Generate random PO number
        const now = new Date();
        const year = String(now.getFullYear()).slice(-2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const randomCode = Math.random().toString(36).substr(2, 5).toUpperCase();
        const poNo = `PO-${year}${month}${day}-${randomCode}`;
        
        // Get qty - prioritas: shortageQty > qty > calculated
        let finalQty = 0;
        if (item.shortageQty !== undefined && item.shortageQty !== null && item.shortageQty > 0) {
          finalQty = item.shortageQty;
        } else if (item.qty !== undefined && item.qty !== null && item.qty > 0) {
          finalQty = item.qty;
        } else {
          // Fallback: coba hitung dari requiredQty - availableStock
          const requiredQty = item.requiredQty || 0;
          const availableStock = item.availableStock || 0;
          finalQty = Math.max(0, requiredQty - availableStock);
        }
        
        if (finalQty <= 0) {
          showAlert(`Error: Qty untuk product ${productName} tidak valid (${finalQty}). Silakan cek data PR.`, 'Validation Error');
          return;
        }
        
        const newPO: PurchaseOrder = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          poNo,
          supplier: supplierName,
          soNo: pr.soNo,
          spkNo: pr.spkNo,
          sourcePRId: pr.id,
          purchaseReason: '',
          productItem: productName, // Backward compatibility
          productId: productId,
          qty: finalQty,
          price: Math.ceil(itemPrice),
          total: Math.ceil(finalQty * Math.ceil(itemPrice)),
          paymentTerms: paymentTerms as any,
          topDays: finalTopDays,
          status: 'OPEN',
          receiptDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          created: new Date().toISOString(),
        };
        // Tambahkan productItem dan productName untuk GT
        (newPO as any).productItem = productName;
        (newPO as any).productName = productName;
        (newPO as any).productId = productId;
        newPOs.push(newPO);
      }

      // Save POs
      const updatedOrders = [...orders, ...newPOs];
      await storageService.set('gt_purchaseOrders', updatedOrders);
      setOrders(updatedOrders);

      // Update PR status to PO_CREATED
      const updatedPRs = purchaseRequests.map(p => 
        p.id === pr.id ? { ...p, status: 'PO_CREATED' as const } : p
      );
      await storageService.set('gt_purchaseRequests', updatedPRs);
      setPurchaseRequests(updatedPRs);

      showAlert(`PO berhasil dibuat dari PR ${pr.prNo}!\n\n${newPOs.length} Purchase Order telah dibuat.`, 'Success');
      setSelectedPR(null);
      loadOrders();
      loadPurchaseRequests();
    } catch (error: any) {
      showAlert(`Error creating PO from PR: ${error.message}`, 'Error');
    }
  };

  const handleDeletePO = async (item: PurchaseOrder) => {
    if (!item || !item.poNo) {
      showAlert('PO tidak valid. Mohon coba lagi.', 'Error');
      return;
    }

    const poNo = item.poNo.toString().trim();
    // Defensive check: pastikan grnList dan financeNotifications adalah array
    const grnListArray = Array.isArray(grnList) ? grnList : [];
    const financeNotificationsArray = Array.isArray(financeNotifications) ? financeNotifications : [];
    
    const hasGRN = grnListArray.some((grn: any) => grn && (grn.poNo || '').toString().trim() === poNo);
    if (hasGRN) {
      showAlert(`Tidak bisa menghapus PO ${poNo}.\n\nGRN sudah dibuat untuk PO ini. Silakan hapus GRN terlebih dahulu jika ingin membatalkan PO.`, 'Cannot Delete');
      return;
    }

    const hasPendingFinance = financeNotificationsArray.some((notif: any) => {
      if (!notif) return false;
      const notifPo = (notif.poNo || '').toString().trim();
      const notifStatus = (notif.status || 'PENDING').toString().toUpperCase();
      return notifPo === poNo && notifStatus !== 'CLOSE';
    });
    if (hasPendingFinance) {
      showAlert(`Tidak bisa menghapus PO ${poNo}.\n\nFinance sudah menerima notifikasi pembayaran supplier untuk PO ini. Batalkan pembayaran terlebih dahulu.`, 'Cannot Delete');
      return;
    }

    showConfirm(
      `Hapus PO ${poNo}?\n\nTindakan ini akan:\n• Menghapus PO dari daftar\n• Menghapus notifikasi Finance terkait\n• Mengembalikan PR ke status APPROVED (jika ada)\n\nPastikan tidak ada proses lanjutan untuk PO ini.`,
      async () => {
        try {
          // 🚀 FIX: Pakai GT delete helper untuk konsistensi dan sync yang benar
          const deleteResult = await deleteGTItem('gt_purchaseOrders', item.id, 'id');
          
          if (!deleteResult.success) {
            showAlert(`❌ Error deleting PO ${item.poNo}: ${deleteResult.error || 'Unknown error'}`, 'Error');
            return;
          }
          
          // Reload data dengan helper (handle race condition)
          const updatedOrders = await reloadGTData('gt_purchaseOrders', setOrders);

          let updatedPRs = purchaseRequests;
          let prChanged = false;
          const normalizeId = (value: any) => (value || '').toString().trim();

          const revertPRStatus = (targetId: string) => {
            const stillHasPO = updatedOrders.some((po: any) => po && normalizeId(po.sourcePRId) === targetId);
            if (stillHasPO) return;
            updatedPRs = purchaseRequests.map(pr => {
              if (pr.id === targetId && pr.status === 'PO_CREATED') {
                prChanged = true;
                return { ...pr, status: 'APPROVED' as const };
              }
              return pr;
            });
          };

          if (item.sourcePRId) {
            revertPRStatus(normalizeId(item.sourcePRId));
          } else if (item.spkNo) {
            const candidate = purchaseRequests.find(pr => pr.spkNo === item.spkNo && pr.status === 'PO_CREATED');
            if (candidate) {
              const candidateId = candidate.id;
              const stillHasPO = updatedOrders.some((po: any) => {
                if (!po) return false;
                if (normalizeId(po.sourcePRId) === candidateId) return true;
                return (po.spkNo || '').toString().trim() === (item.spkNo || '').toString().trim();
              });
              if (!stillHasPO) {
                updatedPRs = purchaseRequests.map(pr => pr.id === candidateId ? { ...pr, status: 'APPROVED' as const } : pr);
                prChanged = true;
              }
            }
          }

          if (prChanged) {
            await storageService.set('gt_purchaseRequests', updatedPRs);
            setPurchaseRequests(updatedPRs);
          }

          const updatedFinanceNotif = financeNotifications.filter((notif: any) => (notif.poNo || '').toString().trim() !== poNo);
          if (updatedFinanceNotif.length !== financeNotifications.length) {
            await storageService.set('gt_financeNotifications', updatedFinanceNotif);
            setFinanceNotifications(updatedFinanceNotif);
          }

          showAlert(`PO ${poNo} berhasil dihapus dan PR terkait sudah dikembalikan ke status APPROVED.`, 'Success');
        } catch (error: any) {
          showAlert(`Error deleting PO: ${error.message}`, 'Error');
        }
      },
      undefined,
      'Confirm Delete'
    );
  };

  return (
    <div className="module-compact">
      <div className="page-header">
        <h1>Purchase Orders</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {pendingPRs.length > 0 && (
            <NotificationBell
              notifications={prNotifications}
              onNotificationClick={(notification) => {
                if (notification.pr) {
                  handleCreatePOFromPR(notification.pr);
                }
              }}
              icon="📋"
              emptyMessage="Tidak ada Purchase Request yang perlu diproses"
            />
          )}
          <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
          <Button onClick={handleCreate}>+ Create PO</Button>
        </div>
      </div>

      {showForm && (
        <Card title={editingItem ? `Edit Purchase Order - ${editingItem.poNo}` : "Create New Purchase Order"} className="mb-4">
          {editingItem && (
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
              <div><strong>PO No:</strong> {editingItem.poNo}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Status: {editingItem.status} | Created: {new Date(editingItem.created).toLocaleDateString('id-ID')}
              </div>
            </div>
          )}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Supplier *
            </label>
            <input
              type="text"
              list={`supplier-list-${editingItem?.id || 'new'}`}
              value={getSupplierInputDisplayValue()}
              onChange={(e) => {
                handleSupplierInputChange(e.target.value);
              }}
              onBlur={(e) => {
                const value = e.target.value;
                const matchedSupplier = suppliers.find(s => {
                  const label = `${s.kode || ''}${s.kode ? ' - ' : ''}${s.nama || ''}`;
                  return label === value;
                });
                if (matchedSupplier) {
                  setFormData({ ...formData, supplier: matchedSupplier.nama });
                }
              }}
              placeholder="-- Pilih Supplier --"
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
            <datalist id={`supplier-list-${editingItem?.id || 'new'}`}>
              {suppliers.map(s => (
                <option key={s.id} value={`${s.kode} - ${s.nama}`}>
                  {s.kode} - {s.nama}
                </option>
              ))}
            </datalist>
          </div>
          <Input
            label={editingItem ? "SO No (Linked - Cannot Edit)" : "SO No (Optional)"}
            value={formData.soNo || ''}
            onChange={(v) => setFormData({ ...formData, soNo: v })}
            disabled={!!editingItem}
          />
          <Input
            label="Reason Pembelian (jika tanpa SO/SPK)"
            value={formData.purchaseReason || ''}
            onChange={(v) => setFormData({ ...formData, purchaseReason: v })}
            placeholder="Contoh: Refill stock umum / sample R&D"
          />
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              product/Item *
            </label>
            <input
              type="text"
              list={`product-list-${editingItem?.id || 'new'}`}
              value={getproductInputDisplayValue()}
              onChange={(e) => {
                handleproductInputChange(e.target.value);
              }}
              onBlur={(e) => {
                const value = e.target.value;
                const matchedproduct = products.find(m => {
                  const label = `${m.product_id || m.kode || ''}${m.product_id || m.kode ? ' - ' : ''}${m.nama || ''}`;
                  return label === value;
                });
                if (matchedproduct) {
                  const productPrice = matchedproduct.priceMtr || matchedproduct.harga || 0;
                  const roundedPrice = Math.ceil(productPrice);
                  const roundedTotal = Math.ceil((formData.qty || 0) * roundedPrice);
                setFormData({
                  ...formData,
                    productItem: matchedproduct.nama,
                  price: roundedPrice,
                  total: roundedTotal,
                });
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
            <datalist id={`product-list-${editingItem?.id || 'new'}`}>
              {products.map(m => (
                <option key={m.id} value={`${m.product_id || m.kode} - ${m.nama}`}>
                  {m.product_id || m.kode} - {m.nama}
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
                const currentQty = formData.qty;
                // Jika value adalah 0, langsung clear
                if (currentQty === 0 || currentQty === null || currentQty === undefined || String(currentQty) === '0') {
                  setQtyInputValue('');
                  input.value = '';
                } else {
                  input.select();
                }
              }}
              onMouseDown={(e) => {
                const input = e.target as HTMLInputElement;
                const currentQty = formData.qty;
                // Clear jika value adalah 0 saat mouse down
                if (currentQty === 0 || currentQty === null || currentQty === undefined || String(currentQty) === '0') {
                  setQtyInputValue('');
                  input.value = '';
                }
              }}
              onChange={(e) => {
                let val = e.target.value;
                // Hapus semua karakter non-numeric kecuali titik dan koma
                val = val.replace(/[^\d.,]/g, '');
                const cleaned = removeLeadingZero(val);
                setQtyInputValue(cleaned);
                const qty = cleaned === '' ? 0 : Number(cleaned) || 0;
              const total = Math.ceil(qty * (formData.price || 0)); // Bulatkan ke atas
              setFormData({
                ...formData,
                qty,
                total,
              });
            }}
              onBlur={(e) => {
                const val = e.target.value;
                if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                  setFormData({
                    ...formData,
                    qty: 0,
                    total: 0,
                  });
                  setQtyInputValue('');
                } else {
                  const qty = Number(val);
                  const subtotal = Math.ceil(qty * (formData.price || 0));
                  const total = Math.ceil(subtotal * (1 - (formData.discountPercent || 0) / 100));
                  setFormData({
                    ...formData,
                    qty,
                    total,
                  });
                  setQtyInputValue('');
                }
              }}
              onKeyDown={(e) => {
                const input = e.target as HTMLInputElement;
                const currentVal = input.value;
                // Jika kosong atau "0" dan user ketik angka 1-9, langsung replace
                if ((currentVal === '' || currentVal === '0') && /^[1-9]$/.test(e.key)) {
                  e.preventDefault();
                  const newVal = e.key;
                  setQtyInputValue(newVal);
                  input.value = newVal;
                  const qty = Number(newVal);
                  const subtotal = Math.ceil(qty * (formData.price || 0));
                  const total = Math.ceil(subtotal * (1 - (formData.discountPercent || 0) / 100));
                  setFormData({
                    ...formData,
                    qty,
                    total,
                  });
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
              Price
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={priceInputValue !== undefined && priceInputValue !== '' ? priceInputValue : (formData.price !== undefined && formData.price !== null && formData.price !== 0 ? String(Math.ceil(formData.price)) : '')}
              onFocus={(e) => {
                const input = e.target as HTMLInputElement;
                const currentPrice = formData.price;
                // Jika value adalah 0, langsung clear
                if (currentPrice === 0 || currentPrice === null || currentPrice === undefined || String(currentPrice) === '0') {
                  setPriceInputValue('');
                  input.value = '';
                } else {
                  input.select();
                }
              }}
              onMouseDown={(e) => {
                const input = e.target as HTMLInputElement;
                const currentPrice = formData.price;
                // Clear jika value adalah 0 saat mouse down
                if (currentPrice === 0 || currentPrice === null || currentPrice === undefined || String(currentPrice) === '0') {
                  setPriceInputValue('');
                  input.value = '';
                }
              }}
              onChange={(e) => {
                let val = e.target.value;
                // Hapus semua karakter non-numeric kecuali titik dan koma
                val = val.replace(/[^\d.,]/g, '');
                const cleaned = removeLeadingZero(val);
                setPriceInputValue(cleaned);
                const price = cleaned === '' ? 0 : Math.ceil(Number(cleaned) || 0); // Bulatkan ke atas
                const subtotal = Math.ceil((formData.qty || 0) * price);
                const total = Math.ceil(subtotal * (1 - (formData.discountPercent || 0) / 100));
                setFormData({
                  ...formData,
                  price,
                  total,
                });
            }}
              onBlur={(e) => {
                const val = e.target.value;
                if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                  setFormData({
                    ...formData,
                    price: 0,
                    total: 0,
                  });
                  setPriceInputValue('');
                } else {
                  const price = Math.ceil(Number(val)); // Bulatkan ke atas
                  const subtotal = Math.ceil((formData.qty || 0) * price);
                  const total = Math.ceil(subtotal * (1 - (formData.discountPercent || 0) / 100));
                  setFormData({
                    ...formData,
                    price,
                    total,
                  });
                  setPriceInputValue('');
                }
              }}
              onKeyDown={(e) => {
                const input = e.target as HTMLInputElement;
                const currentVal = input.value;
                // Jika kosong atau "0" dan user ketik angka 1-9, langsung replace
                if ((currentVal === '' || currentVal === '0') && /^[1-9]$/.test(e.key)) {
                  e.preventDefault();
                  const newVal = e.key;
                  setPriceInputValue(newVal);
                  input.value = newVal;
                  const price = Math.ceil(Number(newVal));
                  const subtotal = Math.ceil((formData.qty || 0) * price);
                  const total = Math.ceil(subtotal * (1 - (formData.discountPercent || 0) / 100));
                  setFormData({
                    ...formData,
                    price,
                    total,
                  });
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
              Discount (%)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={discountInputValue !== '' ? discountInputValue : (formData.discountPercent !== undefined && formData.discountPercent !== null && formData.discountPercent !== 0 ? String(formData.discountPercent) : '')}
              onFocus={(e) => {
                const currentDiscount = formData.discountPercent;
                if (currentDiscount === 0 || currentDiscount === undefined || currentDiscount === null) {
                  setDiscountInputValue('');
                  e.target.value = '';
                } else {
                  setDiscountInputValue(String(currentDiscount));
                }
              }}
              onMouseDown={(e) => {
                const currentDiscount = formData.discountPercent;
                if (currentDiscount === 0 || currentDiscount === undefined || currentDiscount === null) {
                  setDiscountInputValue('');
                  (e.target as HTMLInputElement).value = '';
                }
              }}
              onChange={(e) => {
                const val = e.target.value;
                const cleaned = removeLeadingZero(val);
                setDiscountInputValue(cleaned);
                const discount = cleaned === '' ? 0 : Number(cleaned) || 0;
                const subtotal = Math.ceil((formData.qty || 0) * (formData.price || 0));
                const total = Math.ceil(subtotal * (1 - discount / 100));
                setFormData({ ...formData, discountPercent: discount, total });
              }}
              onBlur={(e) => {
                const val = e.target.value;
                if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                  const subtotal = Math.ceil((formData.qty || 0) * (formData.price || 0));
                  setFormData({ ...formData, discountPercent: 0, total: subtotal });
                  setDiscountInputValue('');
                  } else {
                    const numVal = Number(val);
                    if (numVal > 100) {
                      setFormData({ ...formData, discountPercent: 100, total: 0 });
                      setDiscountInputValue('100');
                    } else {
                      const subtotal = Math.ceil((formData.qty || 0) * (formData.price || 0));
                      const total = Math.ceil(subtotal * (1 - numVal / 100));
                      setFormData({ ...formData, discountPercent: numVal, total });
                      setDiscountInputValue('');
                    }
                  }
              }}
              onKeyDown={(e) => {
                const input = e.target as HTMLInputElement;
                const currentVal = input.value;
                if ((currentVal === '' || currentVal === '0') && /^[1-9]$/.test(e.key)) {
                  e.preventDefault();
                  const newVal = e.key;
                  setDiscountInputValue(newVal);
                  input.value = newVal;
                  const subtotal = Math.ceil((formData.qty || 0) * (formData.price || 0));
                  const total = Math.ceil(subtotal * (1 - Number(newVal) / 100));
                  setFormData({ ...formData, discountPercent: Number(newVal), total });
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>Sub Total:</span>
              <span style={{ color: 'var(--text-primary)' }}>
                Rp {Math.ceil((formData.qty || 0) * (formData.price || 0)).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
              </span>
            </div>
            {(formData.discountPercent || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                  Discount ({formData.discountPercent}%):
                </span>
                <span style={{ color: '#ff9800' }}>
                  - Rp {Math.ceil((formData.qty || 0) * (formData.price || 0) * (formData.discountPercent || 0) / 100).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '2px solid var(--border)', marginTop: '8px' }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>Total:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
                Rp {(formData.total || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Quality
            </label>
            <Input
              value={formData.quality || ''}
              onChange={(v) => setFormData({ ...formData, quality: v })}
              placeholder="Quality"
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Score
            </label>
            <Input
              value={formData.score !== undefined && formData.score !== null ? String(formData.score) : ''}
              onChange={(v) => setFormData({ ...formData, score: v === '' ? '' : (isNaN(Number(v)) ? v : Number(v)) })}
              placeholder="Score"
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Keterangan
            </label>
            <textarea
              value={formData.keterangan || ''}
              onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
              placeholder="Keterangan"
              rows={3}
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
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Payment Terms *
            </label>
            <select
              value={formData.paymentTerms || 'TOP'}
              onChange={(e) => {
                const newPaymentTerms = e.target.value as any;
                // Jika COD atau CBD, set topDays jadi 0
                const newTopDays = (newPaymentTerms === 'COD' || newPaymentTerms === 'CBD') ? 0 : (formData.topDays || 30);
                setFormData({ ...formData, paymentTerms: newPaymentTerms, topDays: newTopDays });
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
              <option value="TOP">TOP (Term of Payment)</option>
              <option value="COD">COD (Cash on Delivery)</option>
              <option value="CBD">CBD (Cash Before Delivery)</option>
            </select>
          </div>
          {formData.paymentTerms === 'TOP' && (
            <Input
              label="TOP Days"
              type="number"
              value={String(formData.topDays || 30)}
              onChange={(v) => setFormData({ ...formData, topDays: Number(v) })}
            />
          )}
          <Input
            label="Receipt Date (Tanggal Penerimaan)"
            type="date"
            value={formData.receiptDate || ''}
            onChange={(v) => setFormData({ ...formData, receiptDate: v })}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <Button onClick={() => { 
              setShowForm(false); 
              setEditingItem(null);
              setproductInputValue('');
              setSupplierInputValue('');
              setQtyInputValue('');
              setPriceInputValue('');
              setFormData({ 
                supplier: '', 
                soNo: '', 
                productItem: '', 
                qty: 0, 
                price: 0, 
                total: 0, 
                paymentTerms: 'TOP', 
                topDays: 30, 
                receiptDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                quality: '',
                score: '',
                keterangan: '',
              }); 
            }} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleSave} variant="primary">
              {editingItem ? 'Update PO' : 'Save PO'}
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div className="tab-container" style={{ marginBottom: 0, flex: '1 1 auto' }}>
            <button
              className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Purchase Orders
            </button>
            <button
              className={`tab-button ${activeTab === 'outstanding' ? 'active' : ''}`}
              onClick={() => setActiveTab('outstanding')}
            >
              Outstanding ({orders.filter(o => o.status === 'OPEN').length})
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button
              variant="secondary"
              onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              {viewMode === 'cards' ? '📋 Table' : '🃏 Cards'}
            </Button>
            <div style={{ flex: '0 0 280px', minWidth: '240px' }}>
              <Input
                label="Search"
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by PO No, Supplier, SO No..."
              />
            </div>
          </div>
        </div>
        <div className="tab-content">
          {viewMode === 'cards' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
              {filteredOrders.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  {activeTab === 'outstanding' ? 'No outstanding purchase orders' : (searchQuery ? "No PO data found matching your search" : "No PO data")}
                </div>
              ) : (
                filteredOrders.map((item: PurchaseOrder) => {
                  const grnListArray = Array.isArray(grnList) ? grnList : [];
                  const financeNotificationsArray = Array.isArray(financeNotifications) ? financeNotifications : [];
                  
                  const hasGRN = grnListArray.some((grn: any) => grn && grn.poNo === item.poNo);
                  const existingGRNs = grnListArray.filter((grn: any) => 
                    grn && (grn.poNo || '').toString().trim() === (item.poNo || '').toString().trim()
                  );
                  const totalReceived = existingGRNs.reduce((sum: number, grn: any) => sum + (grn.qtyReceived || 0), 0);
                  const remainingQty = item.qty - totalReceived;
                  const hasOutstandingQty = remainingQty > 0;
                  const buttonColors = getButtonColor(item.poNo || '');
                  const hasPendingFinance = financeNotificationsArray.some((notif: any) => {
                    if (!notif) return false;
                    const notifPo = (notif.poNo || '').toString().trim();
                    const currentPo = (item.poNo || '').toString().trim();
                    return (
                      notif.type === 'SUPPLIER_PAYMENT' &&
                      notifPo !== '' &&
                      notifPo === currentPo &&
                      (notif.status || 'PENDING').toUpperCase() !== 'CLOSE'
                    );
                  });
                  
                  return (
                    <Card key={item.id} style={{ padding: '12px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1' }}>
                          <span className={`status-badge status-${item.status?.toLowerCase() || 'open'}`} style={{ fontSize: '10px', padding: '2px 6px', flexShrink: 0 }}>
                            {item.status || 'OPEN'}
                          </span>
                          <div>
                            <strong style={{ color: '#2e7d32', fontSize: '13px' }}>{item.poNo}</strong>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {item.supplier}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ marginBottom: '8px', fontSize: '11px' }}>
                        <div><strong>SO:</strong> {item.soNo || '-'}</div>
                        <div><strong>Product:</strong> {item.productItem || '-'}</div>
                        <div><strong>SKU:</strong> {(item as any).productId || '-'}</div>
                        <div><strong>Qty:</strong> {item.qty} {totalReceived > 0 && (
                          <span style={{ color: remainingQty > 0 ? '#ff9800' : '#4caf50', fontSize: '10px' }}>
                            (✓ {totalReceived} / ⏳ {remainingQty})
                          </span>
                        )}</div>
                        <div><strong>Price:</strong> Rp {Math.ceil(item.price).toLocaleString('id-ID')}</div>
                        <div><strong>Total:</strong> Rp {Math.ceil(item.total).toLocaleString('id-ID')}</div>
                        <div><strong>Payment:</strong> {item.paymentTerms} {item.paymentTerms === 'TOP' && `(${item.topDays} days)`}</div>
                        <div><strong>Receipt Date:</strong> {new Date(item.receiptDate).toLocaleDateString('id-ID')}</div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)', justifyContent: 'flex-start' }}>
                        <Button
                          variant="secondary"
                          onClick={() => handleViewDetailPOSheet(item)}
                          style={{ fontSize: '10px', padding: '4px 8px', minHeight: '24px' }}
                        >
                          View
                        </Button>
                        {item.status !== 'CLOSE' && (
                          <Button
                            variant="secondary"
                            onClick={() => handleEdit(item)}
                            style={{ fontSize: '10px', padding: '4px 8px', minHeight: '24px' }}
                          >
                            Edit
                          </Button>
                        )}
                        {hasOutstandingQty && (
                          <Button
                            variant="secondary"
                            onClick={() => handleCreateGRN(item)}
                            style={{ fontSize: '10px', padding: '4px 8px', minHeight: '24px', backgroundColor: buttonColors.backgroundColor, color: buttonColors.color }}
                          >
                            {hasGRN ? `GRN (${remainingQty} left)` : 'GRN'}
                          </Button>
                        )}
                        {hasGRN && !hasOutstandingQty && (
                          <span style={{ fontSize: '10px', color: 'var(--success)', fontStyle: 'italic', padding: '4px 8px' }}>
                            Complete
                          </span>
                        )}
                        {hasPendingFinance && (
                          <span style={{ fontSize: '10px', color: '#ff9800', fontWeight: '600', padding: '4px 8px' }}>
                            💰 Payment Pending
                          </span>
                        )}
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          ) : (
            <div className="purchasing-table" style={{ overflowX: 'auto', margin: '-16px', padding: '16px', fontSize: '11px' }}>
              <Table 
                columns={columns} 
                data={filteredOrders}
                emptyMessage={activeTab === 'outstanding' ? 'No outstanding purchase orders' : (searchQuery ? "No PO data found matching your search" : "No PO data")}
                getRowStyle={(item: PurchaseOrder) => ({
                  backgroundColor: getRowColor(item.soNo),
                })}
              />
            </div>
          )}
        </div>
      </Card>

      {/* PR Approval Dialog */}
      {selectedPR && (
        <PRApprovalDialog
          pr={selectedPR}
          suppliers={suppliers}
          products={products}
          onClose={() => setSelectedPR(null)}
          onApprove={handleApprovePR}
          onSupplierCreated={async () => {
            // Reload suppliers setelah create supplier baru
            await loadSuppliers();
          }}
        />
      )}

      {/* Receipt/GRN Dialog */}
      {selectedPOForReceipt && (
        <ReceiptDialog
          po={selectedPOForReceipt}
          onClose={() => setSelectedPOForReceipt(null)}
          onSave={handleSaveReceipt}
        />
      )}

      {/* PDF Preview Dialog */}
      {viewPdfData && (
        <div className="dialog-overlay" onClick={() => setViewPdfData(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90%', width: '1200px', maxHeight: '90vh', overflow: 'auto' }}>
            <Card className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2>Preview PO - {viewPdfData.poNo}</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="primary" onClick={handleSaveToPDF}>
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
                  title="PO Preview"
                />
              </div>
            </Card>
          </div>
        </div>
      )}
      
      {/* Custom Dialog - menggunakan hook terpusat */}
      <DialogComponent />
    </div>
  );
};

// PR Approval Dialog Component
const PRApprovalDialog = ({ pr, suppliers, products, onClose, onApprove, onSupplierCreated }: any) => {
  const [selectedSuppliers, setSelectedSuppliers] = useState<{ [key: string]: string }>({});
  const [supplierInputValues, setSupplierInputValues] = useState<{ [key: string]: string }>({});
  const [paymentTerms, setPaymentTerms] = useState('TOP');
  const [topDays, setTopDays] = useState('30');
  const [editedItems, setEditedItems] = useState<{ [key: string]: { price?: number; requiredQty?: number; shortageQty?: number } }>({});
  const [showCreateSupplierDialog, setShowCreateSupplierDialog] = useState(false);
  const [creatingSupplierForProductId, setCreatingSupplierForProductId] = useState<string>('');
  const [newSupplierForm, setNewSupplierForm] = useState<{ kode: string; nama: string; alamat?: string; telepon?: string }>({
    kode: '',
    nama: '',
    alamat: '',
    telepon: '',
  });
  
  // Custom Dialog - menggunakan hook terpusat
  const { showAlert, DialogComponent: PRApprovalDialogComponent } = useDialog();
  
  // Re-load price dari master product jika price = 0
  const getproductPrice = (item: any) => {
    const productId = item.productId || item.materialId || '';
    // Jika ada edited price, gunakan yang di-edit
    if (editedItems[productId]?.price !== undefined) {
      return editedItems[productId].price || 0;
    }
    
    // Jika price sudah ada dan > 0, gunakan price yang ada
    if (item.price && item.price > 0) {
      return item.price;
    }
    
    // Jika price = 0, coba ambil dari master product
    const product = products?.find((m: any) => {
      const mId = (m.product_id || m.kode || '').toString().trim();
      const itemId = productId || (item.productKode || item.materialKode || '');
      return mId === itemId;
    });
    
    if (product) {
      // Prioritas: priceMtr > harga > hargaSales
      return product.priceMtr || product.harga || (product as any).hargaSales || 0;
    }
    
    return item.price || 0;
  };
  
  // Get required qty (bisa di-edit)
  const getRequiredQty = (item: any) => {
    const productId = item.productId || item.materialId || '';
    if (editedItems[productId]?.requiredQty !== undefined) {
      return editedItems[productId].requiredQty || 0;
    }
    // Fallback: jika requiredQty tidak ada, gunakan qty dari SPK atau item.qty
    return item.requiredQty || item.qty || 0;
  };
  
  // Get shortage qty (calculated from required - available)
  const getShortageQty = (item: any) => {
    const requiredQty = getRequiredQty(item);
    const availableStock = item.availableStock || 0;
    // Jika shortageQty sudah ada, gunakan itu (lebih akurat)
    if (item.shortageQty !== undefined && item.shortageQty !== null) {
      return item.shortageQty;
    }
    // Kalau tidak, hitung dari required - available
    return Math.max(0, requiredQty - availableStock);
  };
  
  // Update edited item
  const updateEditedItem = (productId: string, field: 'price' | 'requiredQty', value: number) => {
    setEditedItems(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value,
      }
    }));
  };

  const getSupplierInputDisplayValue = (productId: string) => {
    if (supplierInputValues[productId] !== undefined && supplierInputValues[productId] !== '') {
      return supplierInputValues[productId];
    }
    const supplierName = selectedSuppliers[productId];
    if (supplierName) {
      const supplier = suppliers?.find((s: any) => s.nama === supplierName);
      if (supplier) {
        return supplier.nama;
      }
      return supplierName;
    }
    return '';
  };

  const handleSupplierInputChange = (productId: string, text: string) => {
    setSupplierInputValues(prev => ({ ...prev, [productId]: text }));
    if (!text) {
      setSelectedSuppliers(prev => {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      });
      return;
    }
    const normalized = text.toLowerCase();
    const matchedSupplier = suppliers?.find((s: any) => {
      const name = (s.nama || '').toLowerCase();
      return name === normalized || name.includes(normalized);
    });
    if (matchedSupplier) {
      setSelectedSuppliers(prev => ({ ...prev, [productId]: matchedSupplier.nama }));
    }
  };

  // Use ref to track PR ID to prevent resetting user input when same PR is open
  const prIdRef = useRef<string>('');

  useEffect(() => {
    // Only initialize if this is a new PR (different PR ID)
    const currentPrId = pr?.id || pr?.prNo || '';
    if (prIdRef.current === currentPrId && currentPrId !== '') {
      return; // Skip if same PR is still open (user is typing)
    }

    // Mark this PR as initialized
    prIdRef.current = currentPrId;

    // Initialize selected suppliers from PR items (supplier dari master product)
    const initialSuppliers: { [key: string]: string } = {};
    const initialInputValues: { [key: string]: string } = {};
    pr.items.forEach((item: any) => {
      // Normalize productId untuk handle berbagai format
      const productId = item.productId || item.materialId || '';
      
      // Prioritas: supplier dari item > supplier dari master product
      let supplier = item.supplier;
      
      // Jika tidak ada supplier di item, cari dari master product
      if (!supplier) {
        const product = products?.find((m: any) => {
          const mId = (m.product_id || m.kode || '').toString().trim();
          const itemId = productId || (item.productKode || item.materialKode || '');
          return mId === itemId;
        });
        if (product && (product as any).supplier) {
          supplier = (product as any).supplier;
        }
      }
      
      if (supplier && productId) {
        initialSuppliers[productId] = supplier;
        const supplierObj = suppliers?.find((s: any) => s.nama === supplier);
        if (supplierObj) {
          initialInputValues[productId] = supplierObj.nama;
        } else {
          initialInputValues[productId] = supplier;
        }
      }
    });
    setSelectedSuppliers(initialSuppliers);
    setSupplierInputValues(initialInputValues);
  }, [pr?.id, pr?.prNo, products, suppliers]); // Only depend on PR ID, not entire pr object

  const handleApprove = () => {
    // Validate all suppliers selected
    for (const item of pr.items) {
      // Normalize productId untuk handle berbagai format
      const itemAny = item as any;
      const productId = item.productId || itemAny.materialId || '';
      const productName = item.productName || itemAny.materialName || itemAny.product || productId || 'Unknown Product';
      
      if (!selectedSuppliers[productId]) {
        const displayName = productName || productId || 'Unknown Product';
        showAlert(`Harap pilih supplier untuk product: ${displayName}${productId ? ` (${productId})` : ''}`, 'Validation Error');
        return;
      }
    }
    
    // Prepare items with edited values
    const updatedItems = pr.items.map((item: any) => {
      // Normalize productId untuk handle berbagai format
      const productId = item.productId || item.materialId || '';
      const edited = editedItems[productId] || {};
      
      // Get requiredQty - prioritas: edited > item.requiredQty > item.qty
      const requiredQty = edited.requiredQty !== undefined 
        ? edited.requiredQty 
        : (item.requiredQty !== undefined && item.requiredQty !== null 
            ? item.requiredQty 
            : (item.qty || 0));
      
      const availableStock = item.availableStock !== undefined && item.availableStock !== null 
        ? item.availableStock 
        : 0;
      
      // Calculate shortageQty - prioritas: item.shortageQty > calculated
      let shortageQty = item.shortageQty;
      if (shortageQty === undefined || shortageQty === null) {
        shortageQty = Math.max(0, requiredQty - availableStock);
      }
      
      // Ensure shortageQty > 0 untuk PO
      if (shortageQty <= 0 && requiredQty > 0) {
        shortageQty = requiredQty; // Fallback: gunakan requiredQty jika shortageQty <= 0
      }
      
      const price = edited.price !== undefined ? edited.price : getproductPrice(item);
      
      // Debug log
      console.log('[PRApprovalDialog] Updated item:', {
        productId,
        productName: item.productName || item.materialName,
        requiredQty,
        availableStock,
        shortageQty,
        itemQty: item.qty,
        price,
      });
      
      return {
        ...item,
        productId: productId, // Ensure normalized productId
        requiredQty: requiredQty,
        availableStock: availableStock,
        shortageQty: shortageQty,
        qty: shortageQty, // Update qty untuk PO - gunakan shortageQty
        price: price,
      };
    });
    
    onApprove({ ...pr, items: updatedItems }, selectedSuppliers, paymentTerms, parseInt(topDays) || 30);
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
        <Card className="dialog-card">
          <h2>Approve Purchase Request - {pr.prNo}</h2>
          <div style={{ marginTop: '20px' }}>
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
              <div><strong>SPK No:</strong> {pr.spkNo}</div>
              <div><strong>SO No:</strong> {pr.soNo}</div>
              <div><strong>Customer:</strong> {pr.customer}</div>
              <div><strong>Product:</strong> {pr.product}</div>
            </div>

            <h3 style={{ marginBottom: '12px' }}>product yang perlu dibeli:</h3>
            <div style={{ marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>product</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Required</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Available</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Shortage</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Price</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Supplier</th>
                  </tr>
                </thead>
                <tbody>
                  {pr.items.map((item: any, idx: number) => {
                    // Normalize productId untuk handle berbagai format
                    const productId = item.productId || item.materialId || '';
                    const productName = item.productName || item.materialName || item.product || '-';
                    const productKode = item.productKode || item.materialKode || productId || '-';
                    
                    const requiredQty = getRequiredQty(item);
                    const shortageQty = getShortageQty(item);
                    const productPrice = getproductPrice(item);
                    const total = Math.ceil(productPrice * Math.ceil(shortageQty));
                    
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '8px' }}>
                          <div><strong>{productName}</strong></div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{productKode}</div>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          <input
                            type="text"
                            value={requiredQty}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                updateEditedItem(productId, 'requiredQty', value === '' ? 0 : Number(value));
                              }
                            }}
                            onBlur={(e) => {
                              const value = e.target.value;
                              const numValue = value === '' ? 0 : Number(value);
                              if (isNaN(numValue) || numValue < 0) {
                                updateEditedItem(productId, 'requiredQty', item.requiredQty || item.qty || 0);
                              }
                            }}
                            style={{
                              width: '80px',
                              padding: '4px 6px',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              backgroundColor: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              textAlign: 'right',
                              fontSize: '13px',
                            }}
                          />
                          <span style={{ marginLeft: '4px' }}>{item.unit}</span>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: item.availableStock > 0 ? 'var(--success)' : 'var(--text-secondary)' }}>
                          {Math.ceil(item.availableStock)} {item.unit}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: 'var(--error)' }}>
                          <strong>{Math.ceil(shortageQty)} {item.unit}</strong>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          <input
                            type="text"
                            value={productPrice}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                updateEditedItem(productId, 'price', value === '' ? 0 : Number(value));
                              }
                            }}
                            onBlur={(e) => {
                              const value = e.target.value;
                              const numValue = value === '' ? 0 : Number(value);
                              if (isNaN(numValue) || numValue < 0) {
                                const defaultPrice = item.price || (products?.find((m: any) => {
                                  const mId = (m.product_id || m.kode || '').toString().trim();
                                  const itemId = productId || productKode || '';
                                  return mId === itemId;
                                })?.priceMtr || 0);
                                updateEditedItem(productId, 'price', defaultPrice);
                              }
                            }}
                            style={{
                              width: '100px',
                              padding: '4px 6px',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              backgroundColor: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              textAlign: 'right',
                              fontSize: '13px',
                            }}
                          />
                          <span style={{ marginLeft: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>/ {item.unit}</span>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          {total > 0 ? (
                            <strong>
                              Rp {total.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                            </strong>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Rp 0</span>
                          )}
                        </td>
                        <td style={{ padding: '8px' }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <input
                              type="text"
                              list={`supplier-list-pr-${productId}`}
                              value={getSupplierInputDisplayValue(productId)}
                              onChange={(e) => {
                                handleSupplierInputChange(productId, e.target.value);
                              }}
                              onBlur={(e) => {
                                const value = e.target.value;
                                const matchedSupplier = suppliers?.find((s: any) => s.nama === value);
                                if (matchedSupplier) {
                                  setSelectedSuppliers(prev => ({ ...prev, [productId]: matchedSupplier.nama }));
                                }
                              }}
                              placeholder="-- Pilih Supplier --"
                              style={{
                                flex: 1,
                                padding: '6px 8px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                backgroundColor: 'var(--bg-tertiary)',
                                color: 'var(--text-primary)',
                                fontSize: '12px',
                              }}
                            />
                            <datalist id={`supplier-list-pr-${productId}`}>
                              {suppliers?.map((s: any) => (
                                <option key={s.id} value={s.nama}>{s.nama}</option>
                              ))}
                            </datalist>
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setCreatingSupplierForProductId(productId);
                                setNewSupplierForm({ kode: '', nama: supplierInputValues[productId] || '', alamat: '', telepon: '' });
                                setShowCreateSupplierDialog(true);
                              }}
                              style={{ fontSize: '11px', padding: '6px 10px', whiteSpace: 'nowrap' }}
                            >
                              ➕ Create
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Payment Terms</label>
                <select
                  value={paymentTerms}
                  onChange={(e) => {
                    const newPaymentTerms = e.target.value;
                    setPaymentTerms(newPaymentTerms);
                    // Jika COD atau CBD, set topDays jadi 0
                    if (newPaymentTerms === 'COD' || newPaymentTerms === 'CBD') {
                      setTopDays('0');
                    } else if (newPaymentTerms === 'TOP' && topDays === '0') {
                      setTopDays('30');
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                  }}
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
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button variant="primary" onClick={handleApprove}>Approve & Create PO</Button>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Custom Dialog for PRApprovalDialog */}
      <PRApprovalDialogComponent />
      
      {/* Create Supplier Dialog */}
      {showCreateSupplierDialog && (
        <div className="dialog-overlay" onClick={() => setShowCreateSupplierDialog(false)} style={{ zIndex: 10002 }}>
          <div className="dialog-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
              Create New Supplier
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                  Supplier Code *
                </label>
                <input
                  type="text"
                  value={newSupplierForm.kode}
                  onChange={(e) => setNewSupplierForm({ ...newSupplierForm, kode: e.target.value })}
                  placeholder="Auto-generate jika kosong"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                  Supplier Name *
                </label>
                <input
                  type="text"
                  value={newSupplierForm.nama}
                  onChange={(e) => setNewSupplierForm({ ...newSupplierForm, nama: e.target.value })}
                  placeholder="Nama Supplier"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                  Address
                </label>
                <input
                  type="text"
                  value={newSupplierForm.alamat || ''}
                  onChange={(e) => setNewSupplierForm({ ...newSupplierForm, alamat: e.target.value })}
                  placeholder="Alamat Supplier"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                  Phone
                </label>
                <input
                  type="text"
                  value={newSupplierForm.telepon || ''}
                  onChange={(e) => setNewSupplierForm({ ...newSupplierForm, telepon: e.target.value })}
                  placeholder="Telepon Supplier"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px' }}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => {
                setShowCreateSupplierDialog(false);
                setCreatingSupplierForProductId('');
                setNewSupplierForm({ kode: '', nama: '', alamat: '', telepon: '' });
              }}>
                Cancel
              </Button>
              <Button variant="primary" onClick={async () => {
                if (!newSupplierForm.nama || newSupplierForm.nama.trim() === '') {
                  showAlert('Supplier Name harus diisi', 'Validation Error');
                  return;
                }
                
                try {
                  // Generate kode jika kosong
                  let supplierKode = newSupplierForm.kode.trim();
                  if (!supplierKode) {
                    // Generate kode dari nama (ambil 3-4 karakter pertama, uppercase)
                    const nameParts = newSupplierForm.nama.trim().split(' ').filter(p => p.length > 0);
                    if (nameParts.length > 0) {
                      supplierKode = nameParts.map(p => p.substring(0, 2).toUpperCase()).join('').substring(0, 6);
                    } else {
                      supplierKode = newSupplierForm.nama.trim().substring(0, 6).toUpperCase();
                    }
                    
                    // Pastikan kode unik
                    let finalKode = supplierKode;
                    let counter = 1;
                    while (suppliers?.some((s: any) => (s.kode || '').toString().trim() === finalKode)) {
                      finalKode = `${supplierKode}${counter}`;
                      counter++;
                    }
                    supplierKode = finalKode;
                  }
                  
                  // Cek apakah supplier dengan nama yang sama sudah ada
                  const existingSupplier = suppliers?.find((s: any) => 
                    (s.nama || '').toString().trim().toLowerCase() === newSupplierForm.nama.trim().toLowerCase()
                  );
                  
                  if (existingSupplier) {
                    showAlert(`Supplier dengan nama "${newSupplierForm.nama}" sudah ada!`, 'Validation Error');
                    return;
                  }
                  
                  // Create new supplier
                  const newSupplier: Supplier = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    kode: supplierKode,
                    nama: newSupplierForm.nama.trim(),
                    alamat: newSupplierForm.alamat?.trim() || '',
                    telepon: newSupplierForm.telepon?.trim() || '',
                  };
                  
                  // Save to storage
                  const currentSuppliers = await storageService.get<Supplier[]>('gt_suppliers') || [];
                  const updatedSuppliers = [...currentSuppliers, newSupplier];
                  await storageService.set('gt_suppliers', updatedSuppliers);
                  
                  // Update suppliers list dan pilih supplier baru
                  if (onSupplierCreated) {
                    await onSupplierCreated(newSupplier);
                  }
                  
                  // Auto-select supplier baru untuk product ini
                  if (creatingSupplierForProductId) {
                    setSelectedSuppliers(prev => ({ ...prev, [creatingSupplierForProductId]: newSupplier.nama }));
                    setSupplierInputValues(prev => ({ ...prev, [creatingSupplierForProductId]: newSupplier.nama }));
                  }
                  
                  // Close dialog
                  setShowCreateSupplierDialog(false);
                  setCreatingSupplierForProductId('');
                  setNewSupplierForm({ kode: '', nama: '', alamat: '', telepon: '' });
                  
                  showAlert(`Supplier "${newSupplier.nama}" berhasil dibuat dan dipilih!`, 'Success');
                } catch (error: any) {
                  showAlert(`Error creating supplier: ${error.message}`, 'Error');
                }
              }}>
                Create & Select
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Receipt/GRN Dialog Component
const ReceiptDialog = ({ po, onClose, onSave }: { po: PurchaseOrder; onClose: () => void; onSave: (data: { qtyReceived: number; receivedDate: string; notes?: string; suratJalan?: string; suratJalanName?: string; invoiceNo?: string; invoiceFile?: string; invoiceFileName?: string }) => void }) => {
  const [qtyReceived, setQtyReceived] = useState<string>('');
  const [receivedDate, setReceivedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [suratJalanFile, setSuratJalanFile] = useState<File | null>(null);
  const [invoiceNo, setInvoiceNo] = useState<string>('');
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [existingGRNs, setExistingGRNs] = useState<any[]>([]);
  const [totalReceived, setTotalReceived] = useState<number>(0);
  const [remainingQty, setRemainingQty] = useState<number>(po.qty);
  
  // Load existing GRNs untuk PO ini
  useEffect(() => {
    const loadGRNs = async () => {
      try {
        const grnData = await storageService.get<any[]>('gt_grn') || [];
        const grnsForPO = grnData.filter((grn: any) => 
          (grn.poNo || '').toString().trim() === (po.poNo || '').toString().trim()
        );
        setExistingGRNs(grnsForPO);
        const total = grnsForPO.reduce((sum: number, grn: any) => sum + (grn.qtyReceived || 0), 0);
        setTotalReceived(total);
        const remaining = po.qty - total;
        setRemainingQty(remaining);
        // Set default qtyReceived ke remaining qty jika masih ada
        if (remaining > 0) {
          setQtyReceived(remaining.toString());
        } else {
          setQtyReceived('0');
        }
      } catch (error) {
        console.error('Error loading GRNs:', error);
      }
    };
    loadGRNs();
  }, [po.poNo, po.qty]);
  
  // Custom Dialog state untuk ReceiptDialog
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSuratJalanFile(file);
    }
  };

  const handleInvoiceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInvoiceFile(file);
    }
  };

  const handleSubmit = () => {
    const qty = Number(qtyReceived);
    if (isNaN(qty) || qty <= 0) {
      showAlert('Quantity received must be greater than 0', 'Validation Error');
      return;
    }
    
    // Validasi: qtyReceived tidak boleh melebihi remaining qty dari PO
    if (qty > remainingQty) {
      showAlert(
        `⚠️ Quantity received (${qty}) melebihi sisa yang belum diterima!\n\n` +
        `Qty Ordered: ${po.qty} PCS\n` +
        `Total Sudah Diterima: ${totalReceived} PCS\n` +
        `Sisa: ${remainingQty} PCS\n\n` +
        `Maksimal yang bisa diterima: ${remainingQty} PCS`,
        'Validation Error'
      );
      return;
    }
    
    if (!receivedDate) {
      showAlert('Received date is required', 'Validation Error');
      return;
    }
    // Invoice number dan file adalah optional

    // Handle file uploads (surat jalan dan invoice)
    const handleFiles = () => {
      const filesToProcess: Array<{ file: File; type: 'suratJalan' | 'invoice' }> = [];
      if (suratJalanFile) filesToProcess.push({ file: suratJalanFile, type: 'suratJalan' });
      if (invoiceFile) filesToProcess.push({ file: invoiceFile, type: 'invoice' });

      if (filesToProcess.length === 0) {
        // No files, save directly (invoice dan surat jalan optional)
        onSave({ 
          qtyReceived: qty, 
          receivedDate, 
          notes,
          invoiceNo: invoiceNo || undefined
        });
        return;
      }

      // Process files sequentially
      let processedCount = 0;
      const results: { suratJalan?: string; suratJalanName?: string; invoiceFile?: string; invoiceFileName?: string } = {};

      filesToProcess.forEach(({ file, type }) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          if (type === 'suratJalan') {
            results.suratJalan = base64;
            results.suratJalanName = file.name;
          } else if (type === 'invoice') {
            results.invoiceFile = base64;
            results.invoiceFileName = file.name;
          }
          
          processedCount++;
          if (processedCount === filesToProcess.length) {
            // All files processed, save
            onSave({ 
              qtyReceived: qty, 
              receivedDate, 
              notes,
              suratJalan: results.suratJalan,
              suratJalanName: results.suratJalanName,
              invoiceNo: invoiceNo || undefined,
              invoiceFile: results.invoiceFile,
              invoiceFileName: results.invoiceFileName
            });
          }
        };
        reader.readAsDataURL(file);
      });
    };

    handleFiles();
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
        <Card className="dialog-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Create Receipt (GRN) - {po.poNo}</h2>
            <Button variant="secondary" onClick={onClose} style={{ padding: '6px 12px' }}>✕</Button>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                PO Information
              </label>
              <div style={{ 
                padding: '12px', 
                backgroundColor: 'var(--bg-secondary)', 
                borderRadius: '6px',
                fontSize: '13px',
                lineHeight: '1.6'
              }}>
                <div><strong>Supplier:</strong> {po.supplier}</div>
                <div><strong>Product:</strong> {po.productItem}</div>
                <div><strong>SKU:</strong> {po.productId || '-'}</div>
                <div><strong>Qty Ordered:</strong> {po.qty} PCS</div>
                {totalReceived > 0 && (
                  <div style={{ 
                    padding: '8px', 
                    backgroundColor: remainingQty > 0 ? 'rgba(255, 152, 0, 0.1)' : 'rgba(76, 175, 80, 0.1)',
                    borderRadius: '4px',
                    marginTop: '8px',
                    border: `1px solid ${remainingQty > 0 ? '#ff9800' : '#4caf50'}`
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: remainingQty > 0 ? '#ff9800' : '#4caf50' }}>
                      📦 Receipt Status
                    </div>
                    <div style={{ fontSize: '13px' }}>
                      <div>✓ <strong>Received:</strong> {totalReceived} PCS</div>
                      {remainingQty > 0 ? (
                        <div style={{ color: '#ff9800', fontWeight: '600', marginTop: '4px' }}>
                          ⏳ <strong>Outstanding:</strong> {remainingQty} PCS
                        </div>
                      ) : (
                        <div style={{ color: '#4caf50', fontWeight: '600', marginTop: '4px' }}>
                          ✓ <strong>Complete</strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div><strong>Unit Price:</strong> Rp {po.price.toLocaleString('id-ID')}</div>
                <div><strong>Sub Total:</strong> Rp {(po.qty * po.price).toLocaleString('id-ID')}</div>
                {(po.discountPercent || 0) > 0 && (
                  <>
                    <div style={{ color: '#ff9800' }}>
                      <strong>Discount ({po.discountPercent}%):</strong> - Rp {(po.qty * po.price * (po.discountPercent || 0) / 100).toLocaleString('id-ID')}
                    </div>
                  </>
                )}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '8px', fontWeight: 'bold' }}>
                  <strong>Total:</strong> Rp {po.total.toLocaleString('id-ID')}
                </div>
              </div>
            </div>
            
            {/* History GRN */}
            {existingGRNs.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  📋 GRN History ({existingGRNs.length} receipt{existingGRNs.length > 1 ? 's' : ''})
                </label>
                <div style={{ 
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '8px'
                }}>
                  {existingGRNs.map((grn: any, idx: number) => (
                    <div key={idx} style={{ 
                      padding: '8px', 
                      marginBottom: '4px',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong>{grn.grnNo || `GRN-${idx + 1}`}</strong>
                        </div>
                        <div style={{ color: '#4caf50', fontWeight: '600' }}>
                          {grn.qtyReceived || 0} PCS
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {grn.receivedDate || grn.created?.split('T')[0] || '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                Quantity Received *
                {remainingQty > 0 && (
                  <span style={{ fontSize: '12px', color: '#ff9800', marginLeft: '8px', fontWeight: '600' }}>
                    (Max: {remainingQty} PCS)
                  </span>
                )}
              </label>
              <input
                type="number"
                min="0"
                max={remainingQty}
                value={qtyReceived}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    setQtyReceived(value);
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  const numValue = value === '' ? 0 : Number(value);
                  if (isNaN(numValue) || numValue < 0) {
                    setQtyReceived(remainingQty > 0 ? remainingQty.toString() : '0');
                  } else if (numValue > remainingQty) {
                    // Auto-correct jika melebihi remaining qty
                    setQtyReceived(remainingQty.toString());
                    showAlert(
                      `⚠️ Quantity dibatasi ke maksimal ${remainingQty} PCS (sisa yang belum diterima dari PO)`,
                      'Info'
                    );
                  } else {
                    setQtyReceived(Math.ceil(numValue).toString());
                  }
                }}
                placeholder={remainingQty > 0 ? `Enter quantity (max: ${remainingQty} PCS)` : "All items already received"}
                disabled={remainingQty <= 0}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  backgroundColor: remainingQty <= 0 ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  opacity: remainingQty <= 0 ? 0.6 : 1,
                }}
              />
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {remainingQty > 0 ? (
                  <span style={{ color: '#ff9800' }}>
                    ⏳ Outstanding: <strong>{remainingQty} PCS</strong> belum diterima
                  </span>
                ) : (
                  <span style={{ color: '#4caf50' }}>
                    ✓ Semua barang sudah diterima ({totalReceived} PCS)
                  </span>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                Received Date *
              </label>
              <input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
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
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                Invoice Number (Optional)
              </label>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="Masukkan nomor invoice dari supplier"
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
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                Upload Invoice dari Supplier (Optional)
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleInvoiceFileChange}
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
              {invoiceFile && (
                <div style={{ fontSize: '12px', color: 'var(--success)', marginTop: '4px' }}>
                  Selected: {invoiceFile.name}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                Upload Surat Jalan (Optional)
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
              {suratJalanFile && (
                <div style={{ fontSize: '12px', color: 'var(--success)', marginTop: '4px' }}>
                  Selected: {suratJalanFile.name}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this receipt..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
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
              <Button variant="primary" onClick={handleSubmit}>
                Create GRN
              </Button>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Custom Dialog for Alert/Confirm/Prompt - Main Dialog */}
      {dialogState.show && (dialogState.type === 'alert' || dialogState.type === 'confirm') && (
        <div className="dialog-overlay" onClick={dialogState.type === 'alert' ? closeDialog : undefined} style={{ zIndex: 10001 }}>
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
                if (dialogState.type === 'alert') closeDialog();
              }}>
                {dialogState.type === 'alert' ? 'OK' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Custom Dialog for Prompt */}
      {dialogState.show && (dialogState.type as string) === 'prompt' && (() => {
        const promptState = dialogState as typeof dialogState & { inputValue?: string; inputPlaceholder?: string; onConfirm?: (value?: string) => void };
        return (
          <div className="dialog-overlay" onClick={undefined} style={{ zIndex: 10001 }}>
            <div className="dialog-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  {dialogState.title}
                </h3>
              </div>
              
              <div style={{ marginBottom: '24px', fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
                {dialogState.message}
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <Input
                  label=""
                  value={promptState.inputValue || ''}
                  onChange={(value) => setDialogState({ ...dialogState, inputValue: value } as typeof dialogState)}
                  placeholder={promptState.inputPlaceholder || 'Enter value...'}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={() => {
                  if (dialogState.onCancel) dialogState.onCancel();
                  closeDialog();
                }}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => {
                  if (promptState.onConfirm) {
                    promptState.onConfirm(promptState.inputValue);
                  }
                }}>
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

export default Purchasing;
