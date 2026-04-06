import React, { useState, useEffect, useMemo, useRef } from 'react';      
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Input from '../../components/Input';
import DateRangeFilter from '../../components/DateRangeFilter';
import NotificationBell from '../../components/NotificationBell';
import { storageService, extractStorageValue, StorageKeys } from '../../services/storage';
import { filterActiveItems } from '../../utils/data-persistence-helper';
import { deletePackagingItem, deletePackagingItems, reloadPackagingData } from '../../utils/packaging-delete-helper';
import { generatePOHtml } from '../../pdf/po-pdf-template';
import { generatePOSheetHtml } from '../../pdf/po-sheet-template';
import { generatePRHtml } from '../../pdf/pr-pdf-template';
import { openPrintWindow, isMobile, isCapacitor, savePdfForMobile } from '../../utils/actions';
import { loadLogoAsBase64 } from '../../utils/logo-loader';
import { useDialog } from '../../hooks/useDialog';
import { toast } from '../../utils/toast-helper';
import { useLanguage } from '../../hooks/useLanguage';
import BlobService from '../../services/blob-service';
import * as XLSX from 'xlsx';
import { createStyledWorksheet, setColumnWidths, ExcelColumn } from '../../utils/excel-helper';
import { logCreate, logUpdate, logDelete } from '../../utils/activity-logger';
import '../../styles/common.css';
import '../../styles/compact.css';

interface PurchaseOrder {
  id: string;
  poNo: string;
  supplier: string;
  soNo: string;
  spkNo?: string;
  sourcePRId?: string;
  materialItem: string;
  material_id?: string;
  materialId?: string; // Deprecated - use material_id
  qty: number;
  price: number;
  total: number;
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

interface Material {
  satuan: string | undefined;
  id: string;
  kode: string;
  material_id?: string;
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
    material_id: string;
    materialId?: string; // Deprecated - use material_id
    materialName: string;
    materialKode: string;
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
                  👁️ View Detail PR
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
  const { t } = useLanguage();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<PurchaseOrder | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<PurchaseOrder>>({});
  const [editSupplierInputValue, setEditSupplierInputValue] = useState('');
  const [editMaterialInputValue, setEditMaterialInputValue] = useState('');
  const [editQtyInputValue, setEditQtyInputValue] = useState('');
  const [editPriceInputValue, setEditPriceInputValue] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'outstanding'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedPR, setSelectedPR] = useState<PurchaseRequest | null>(null);
  const [viewPdfData, setViewPdfData] = useState<{ html: string; poNo: string } | null>(null);
  const [viewPRPdfData, setViewPRPdfData] = useState<{ html: string; prNo: string } | null>(null);
  const [selectedPOForReceipt, setSelectedPOForReceipt] = useState<PurchaseOrder | null>(null);
  const [showMergePODialog, setShowMergePODialog] = useState(false);
  const [selectedPOsForMerge, setSelectedPOsForMerge] = useState<string[]>([]);
  const [grnList, setGrnList] = useState<any[]>([]);
  const [financeNotifications, setFinanceNotifications] = useState<any[]>([]);
  const [spkData, setSpkData] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50); // 50 items per page untuk performa optimal
  const [tableCurrentPage, setTableCurrentPage] = useState(1);
  const [materialInputValue, setMaterialInputValue] = useState('');
  const [supplierInputValue, setSupplierInputValue] = useState('');
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [supplierDialogSearch, setSupplierDialogSearch] = useState('');
  const [showMaterialDialog, setShowMaterialDialog] = useState(false);
  const [materialDialogSearch, setMaterialDialogSearch] = useState('');
  const [qtyInputValue, setQtyInputValue] = useState('');
  const [priceInputValue, setPriceInputValue] = useState('');
  const [formData, setFormData] = useState<Partial<PurchaseOrder>>({
    supplier: '',
    soNo: '',
    materialItem: '',
    qty: 0,
    price: 0,
    total: 0,
    paymentTerms: 'TOP',
    topDays: 30,
    receiptDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    purchaseReason: '',
    quality: '',
    score: '',
    keterangan: '',
  });
  
  // Custom Dialog - menggunakan hook terpusat
  const { showAlert, showConfirm, closeDialog, DialogComponent } = useDialog();
  
  // Ref untuk track if GRN save is in progress (prevent race condition)
  const grnSavingRef = useRef<boolean>(false);

  // Filtered suppliers for dialog
  const filteredSuppliersForDialog = useMemo(() => {
    // CRITICAL: Ensure suppliers is always an array
    const suppliersArray = Array.isArray(suppliers) ? suppliers : [];
    
    let filtered = suppliersArray;
    if (supplierDialogSearch) {
      const query = supplierDialogSearch.toLowerCase();
      filtered = suppliersArray.filter(s => {
        if (!s) return false;
        const code = (s.kode || '').toLowerCase();
        const name = (s.nama || '').toLowerCase();
        return code.includes(query) || name.includes(query);
      });
    }
    // Limit to 200 items for performance
    return filtered.slice(0, 200);
  }, [supplierDialogSearch, suppliers]);

  // Filtered materials for dialog
  const filteredMaterialsForDialog = useMemo(() => {
    // CRITICAL: Ensure materials is always an array
    const materialsArray = Array.isArray(materials) ? materials : [];
    
    let filtered = materialsArray;
    if (materialDialogSearch) {
      const query = materialDialogSearch.toLowerCase();
      filtered = materialsArray.filter(m => {
        if (!m) return false;
        const code = (m.material_id || m.kode || '').toLowerCase();
        const name = (m.nama || '').toLowerCase();
        return code.includes(query) || name.includes(query);
      });
    }
    // Limit to 200 items for performance
    return filtered.slice(0, 200);
  }, [materialDialogSearch, materials]);

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

  // Helper function untuk get material_id (support backward compatibility)
  const getMaterialId = (item: any): string => {
    return (item.material_id || item.materialId || '').toString().trim();
  };

  // Helper function untuk find material by ID (support backward compatibility)
  const findMaterialById = (materialId: string): Material | undefined => {
    if (!materialId) return undefined;
    return materials.find(m => 
      (m.material_id || m.kode || '').toString().trim() === materialId
    );
  };

  useEffect(() => {
    loadOrders();
    loadSuppliers();
    loadMaterials();
    loadPurchaseRequests();
    loadGRN();
    loadSPKData();
  }, []);
  
  const loadSPKData = async () => {
    try {
      const dataRaw = await storageService.get<any[]>('spk');
      const data = Array.isArray(dataRaw) ? dataRaw : [];
      setSpkData(data);
    } catch (error) {
      setSpkData([]);
    }
  };

  const loadGRN = async () => {
    try {
      const dataRaw = await storageService.get<any[]>('grn');
      const data = Array.isArray(dataRaw) ? dataRaw : [];
      setGrnList(data);
    } catch (error) {
      setGrnList([]);
    }
  };

  const loadSuppliers = async () => {
    const data = await storageService.get<Supplier[]>('suppliers') || [];
    // CRITICAL: Filter deleted items using helper function
    const activeSuppliers = filterActiveItems(data);
    setSuppliers(activeSuppliers);
  };

  const loadMaterials = async () => {
    const data = await storageService.get<Material[]>('materials') || [];
    // CRITICAL: Filter deleted items using helper function
    const activeMaterials = filterActiveItems(data);
    setMaterials(activeMaterials);
  };

  const loadOrders = async () => {
    try {
      const [poDataRaw, financeNotifDataRaw] = await Promise.all([
        storageService.get<PurchaseOrder[]>('purchaseOrders'),
        storageService.get<any[]>('financeNotifications'),
      ]);
      const poData = Array.isArray(poDataRaw) ? poDataRaw : [];
      const financeNotifData = Array.isArray(financeNotifDataRaw) ? financeNotifDataRaw : [];
      
      // Filter out deleted items (tombstone pattern) - prevent deleted PO from showing
      const activePOs = filterActiveItems(poData);
      
      setOrders(activePOs);
      setFinanceNotifications(financeNotifData);
    } catch (error) {
      setOrders([]);
      setFinanceNotifications([]);
    }
  };

  const loadPurchaseRequests = async () => {
    let data = await storageService.get<PurchaseRequest[]>('purchaseRequests') || [];
    // Ensure data is always an array
    data = Array.isArray(data) ? data : [];
    setPurchaseRequests(data);
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

  const getMaterialInputDisplayValue = () => {
    if (materialInputValue !== undefined && materialInputValue !== '') {
      return materialInputValue;
    }
    if (formData.materialItem) {
      const material = materials.find(m => m.nama === formData.materialItem);
      if (material) {
        return `${material.material_id || material.kode} - ${material.nama}`;
      }
      return formData.materialItem;
    }
    return '';
  };

  const handleMaterialInputChange = (text: string) => {
    setMaterialInputValue(text);
    if (!text) {
      setFormData({
        ...formData,
        materialItem: '',
        price: 0,
        total: 0,
      });
      return;
    }
    const normalized = text.toLowerCase();
    const matchedMaterial = materials.find(m => {
      const label = `${m.material_id || m.kode || ''}${m.material_id || m.kode ? ' - ' : ''}${m.nama || ''}`.toLowerCase();
      const code = (m.material_id || m.kode || '').toLowerCase();
      const name = (m.nama || '').toLowerCase();
      return label === normalized || code === normalized || name === normalized;
    });
    if (matchedMaterial) {
      const materialPrice = matchedMaterial.priceMtr || matchedMaterial.harga || 0;
      const roundedPrice = Math.ceil(materialPrice);
      const roundedTotal = Math.ceil((formData.qty || 0) * roundedPrice);
      setFormData({
        ...formData,
        materialItem: matchedMaterial.nama,
        price: roundedPrice,
        total: roundedTotal,
      });
    } else {
      setFormData({
        ...formData,
        materialItem: text,
        price: 0,
        total: 0,
      });
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setMaterialInputValue('');
    setSupplierInputValue('');
    setQtyInputValue('');
    setPriceInputValue('');
    setFormData({
      supplier: '',
      soNo: '',
      materialItem: '',
      qty: 0,
      price: 0,
      total: 0,
      paymentTerms: 'TOP',
      topDays: 30,
      receiptDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    setShowForm(true);
  };

  const handleSaveEdit = async () => {
    if (!editFormData.supplier || !editFormData.materialItem || !editFormData.qty || editFormData.qty <= 0) {
      toast.warning('Please fill all required fields (Supplier, Material, Qty)', { duration: 2000 });
      return;
    }
    if (!(editFormData.soNo && editFormData.soNo.trim()) && !(editFormData.purchaseReason && editFormData.purchaseReason.trim())) {
      toast.warning('Isi "Reason pembelian" jika tidak link ke SO/SPK.', { duration: 2000 });
      return;
    }
    try {
      if (!editingItem) return;
      // Update existing PO
      const updatedPO: PurchaseOrder = {
        ...editingItem,
        supplier: editFormData.supplier || '',
        soNo: editFormData.soNo || '',
        purchaseReason: editFormData.purchaseReason || '',
        materialItem: editFormData.materialItem || '',
        qty: editFormData.qty || 0,
        price: Math.ceil(editFormData.price || 0),
        total: Math.ceil((editFormData.qty || 0) * (editFormData.price || 0)),
        paymentTerms: editFormData.paymentTerms || 'TOP',
        topDays: (editFormData.paymentTerms === 'COD' || editFormData.paymentTerms === 'CBD') ? 0 : (editFormData.topDays || 30),
        receiptDate: editFormData.receiptDate || new Date().toISOString().split('T')[0],
        quality: editFormData.quality || '',
        score: editFormData.score || '',
        keterangan: editFormData.keterangan || '',
      };
      const ordersArray = Array.isArray(orders) ? orders : [];
      const updated = ordersArray.map(o => o.id === editingItem.id ? updatedPO : o);
      await storageService.set(StorageKeys.PACKAGING.PURCHASE_ORDERS, updated);
      setOrders(updated);
      // Log activity
      try {
        await logUpdate('PURCHASE_ORDER', editingItem.id, '/packaging/purchasing', {
          poNo: editingItem.poNo,
          supplier: updatedPO.supplier,
          materialItem: updatedPO.materialItem,
          qty: updatedPO.qty,
        });
      } catch (logError) {
        // Silent fail
      }
      toast.success(`PO updated: ${editingItem.poNo}`);
      setShowForm(false);
      setEditingItem(null);
      setEditFormData({});
      setEditSupplierInputValue('');
      setEditMaterialInputValue('');
      setEditQtyInputValue('');
      setEditPriceInputValue('');
    } catch (error: any) {
      toast.error(`Error saving PO: ${error.message}`);
    }
  };

  const handleSave = async () => {
    if (!formData.supplier || !formData.materialItem || !formData.qty || formData.qty <= 0) {
      toast.warning('Please fill all required fields (Supplier, Material, Qty)', { duration: 2000 });
      return;
    }
    if (!(formData.soNo && formData.soNo.trim()) && !(formData.purchaseReason && formData.purchaseReason.trim())) {
      toast.warning('Isi "Reason pembelian" jika tidak link ke SO/SPK.', { duration: 2000 });
      return;
    }
    try {
      if (editingItem) {
        // Should not happen - edit should use handleSaveEdit
        return;
      } else {
        // Create new PO with random number
        const now = new Date();
        const year = String(now.getFullYear()).slice(-2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const randomCode = Math.random().toString(36).substr(2, 5).toUpperCase();
        const poNo = `PO-${year}${month}${day}-${randomCode}`;
        const newPO: PurchaseOrder = {
          id: Date.now().toString(),
          poNo,
          supplier: formData.supplier || '',
          soNo: formData.soNo || '',
          purchaseReason: formData.purchaseReason || '',
          materialItem: formData.materialItem || '',
          qty: formData.qty || 0,
          price: Math.ceil(formData.price || 0),
          total: Math.ceil((formData.qty || 0) * (formData.price || 0)),
          paymentTerms: formData.paymentTerms || 'TOP',
          topDays: (formData.paymentTerms === 'COD' || formData.paymentTerms === 'CBD') ? 0 : (formData.topDays || 30),
          status: 'OPEN',
          receiptDate: formData.receiptDate || new Date().toISOString().split('T')[0],
          created: new Date().toISOString().split('T')[0],
          quality: formData.quality || '',
          score: formData.score || '',
          keterangan: formData.keterangan || '',
        };
        const ordersArray = Array.isArray(orders) ? orders : [];
        const updated = [...ordersArray, newPO];
        await storageService.set(StorageKeys.PACKAGING.PURCHASE_ORDERS, updated);
        setOrders(updated);
        
        // Log activity
        try {
          await logCreate('PURCHASE_ORDER', newPO.id, '/packaging/purchasing', {
            poNo: newPO.poNo,
            supplier: newPO.supplier,
            materialItem: newPO.materialItem,
            qty: newPO.qty,
            soNo: newPO.soNo,
            spkNo: newPO.spkNo,
          });
        } catch (logError) {
          // Silent fail
        }
        
        // Update PR status jika PO dibuat manual dengan spkNo yang match
        // IMPORTANT: Hanya update berdasarkan spkNo, BUKAN soNo (karena 1 SO bisa punya banyak SPK dengan PR berbeda)
        if (newPO.spkNo) {
          const prArray = Array.isArray(purchaseRequests) ? purchaseRequests : [];
          const normalize = (str: string) => (str || '').toString().trim().toLowerCase();
          
          const updatedPRs = prArray.map(pr => {
            // Match berdasarkan spkNo saja (tidak boleh match berdasarkan soNo karena terlalu luas)
            if (newPO.spkNo && normalize(pr.spkNo || '') === normalize(newPO.spkNo) && pr.status === 'PENDING') {
              return { ...pr, status: 'PO_CREATED' as const };
            }
            return pr;
          });
          
          // Check if any PR was updated
          const hasUpdatedPR = (Array.isArray(updatedPRs) && updatedPRs.some((pr, idx) => pr.status === 'PO_CREATED' && prArray[idx].status === 'PENDING')) || false;
          if (hasUpdatedPR) {
            await storageService.set(StorageKeys.PACKAGING.PURCHASE_REQUESTS, updatedPRs);
            setPurchaseRequests(updatedPRs);
          }
        }
        
        toast.success(`PO created: ${poNo}`);
      }
      setShowForm(false);
      setMaterialInputValue('');
      setSupplierInputValue('');
      setQtyInputValue('');
      setPriceInputValue('');
      setFormData({
        supplier: '',
        soNo: '',
        materialItem: '',
        qty: 0,
        price: 0,
        total: 0,
        paymentTerms: 'TOP',
        topDays: 30,
        receiptDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        purchaseReason: '',
      });
    } catch (error: any) {
      toast.error(`Error saving PO: ${error.message}`);
    }
  };

  const generatePOHtmlContent = async (item: PurchaseOrder): Promise<string> => {
    // Load supplier data untuk mendapatkan alamat dan telepon
    const supplierData = suppliers.find(s => s.nama === item.supplier);
    const supplierName = item.supplier || '-';
    const supplierAddress = supplierData?.alamat || '-';
    const supplierPhone = supplierData?.telepon || '-';

    // Load material data untuk mendapatkan kode/description
    const materialData = materials.find(m => 
      m.nama === item.materialItem || 
      (item.materialId && (m.material_id || m.kode) === item.materialId)
    );

    // Prepare enriched lines
    const enrichedLines = [{
      itemName: item.materialItem || '-',
      itemSku: materialData?.kode || materialData?.material_id || '-',
      qty: item.qty || 0,
      price: item.price || 0,
      unit: materialData?.unit || 'PCS',
      description: materialData?.deskripsi || materialData?.nama || item.materialItem || '',
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

    // Logo menggunakan logo-loader utility untuk kompatibilitas development, production, dan Electron
    // Support noxtiz.png, noxtiz.ico, dan Logo.gif
    let logo = await loadLogoAsBase64();

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
    }

    // Load material data untuk mendapatkan kode/description
    const materialData = materials.find(m => 
      m.nama === item.materialItem || 
      (item.materialId && (m.material_id || m.kode) === item.materialId)
    );

    // Prepare items array untuk table
    const items = [{
      no: 1,
      item: item.materialItem || '-',
      quality: item.quality || materialData?.deskripsi || '', // Gunakan quality dari PO, fallback ke deskripsi
      score: item.score !== undefined && item.score !== null ? item.score : '', // Gunakan score dari PO
      qty: item.qty || 0,
      unit: materialData?.unit || 'PCS',
      price: item.price || 0,
      keterangan: item.keterangan || item.purchaseReason || materialData?.deskripsi || '', // Gunakan keterangan dari PO, fallback ke purchaseReason
    }];

    // Load company info from settings
    const companySettings = await storageService.get<{ companyName: string; address: string }>('companySettings');
    const companyName = companySettings?.companyName || 'PT TRIMA LAKSANA JAYA PRATAMA';
    const companyAddress = companySettings?.address || 'Jl. Raya Bekasi Km. 28, Cikarang, Bekasi 17530';

    // Logo menggunakan logo-loader utility
    let logo = await loadLogoAsBase64();

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
      logo: logo,
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
      toast.error(`Error generating PO Sheet preview: ${error.message}`);
    }
  };

  const handleViewDetailPOFull = async (item: PurchaseOrder) => {
    try {
      // Gunakan template PO full lengkap
      const html = await generatePOHtmlContent(item);
      setViewPdfData({ html, poNo: item.poNo });
    } catch (error: any) {
      toast.error(`Error generating PO preview: ${error.message}`);
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
          toast.success(`PDF saved successfully to:\n${result.path}`);
          setViewPdfData(null);
        } else if (!result.canceled) {
          toast.error(`Error saving PDF: ${result.error || 'Unknown error'}`);
        }
        // If canceled, do nothing (user closed dialog)
      } else if (isMobile() || isCapacitor()) {
        // Mobile/Capacitor: Use Web Share API or print dialog
        await savePdfForMobile(
          viewPdfData.html,
          fileName,
          (message) => {
            toast.success(message);
            setViewPdfData(null); // Close view setelah save
          },
          (message) => toast.error(message)
        );
      } else {
        // Browser: Open print dialog, user can select "Save as PDF"
        openPrintWindow(viewPdfData.html);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message || 'Unknown error'}`);
    }
  };

  const handleEdit = (item: PurchaseOrder) => {
    if (item.status === 'CLOSE') {
      toast.warning(`Cannot edit PO ${item.poNo}. CLOSE status cannot be edited.`);
      return;
    }
    setEditingItem(item);
    const supplier = suppliers.find(s => s.nama === item.supplier);
    if (supplier) {
      setEditSupplierInputValue(`${supplier.kode} - ${supplier.nama}`);
    } else {
      setEditSupplierInputValue(item.supplier);
    }
    const material = materials.find(m => m.nama === item.materialItem);
    if (material) {
      setEditMaterialInputValue(`${material.material_id || material.kode} - ${material.nama}`);
    } else {
      setEditMaterialInputValue(item.materialItem);
    }
    setEditQtyInputValue('');
    setEditPriceInputValue('');
    setEditFormData({
      supplier: item.supplier,
      soNo: item.soNo,
      purchaseReason: item.purchaseReason || '',
      materialItem: item.materialItem,
      qty: item.qty,
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
    setEditingItem(item);
  };

  const handleCreateGRN = async (item: PurchaseOrder) => {
    if (item.status !== 'OPEN') {
      toast.warning(`Cannot create GRN from PO: ${item.poNo}\n\nPO must be OPEN (approved) first.`);
      return;
    }
    
    // Pre-load GRN data sebelum dialog dibuka untuk performa lebih cepat
    try {
      const grnData = await storageService.get<any[]>('grnPackaging') || [];
      const grnDataArray = Array.isArray(grnData) ? grnData : [];
      const grnsForPO = grnDataArray.filter((grn: any) => 
        (grn.poNo || '').toString().trim() === (item.poNo || '').toString().trim()
      );
      const totalReceived = grnsForPO.reduce((sum: number, grn: any) => sum + (grn.qtyReceived || 0), 0);
      
      // Set PO dengan pre-loaded data
      setSelectedPOForReceipt({
        ...item,
        _preloadedGRNData: {
          totalReceived,
          grnsForPO,
        }
      } as any);
    } catch (error) {
      // Jika error, tetap buka dialog tanpa pre-loaded data
      setSelectedPOForReceipt(item);
    }
  };

  const handleSaveReceipt = async (receiptData: {
    qtyReceived: number; receivedDate: string; notes?: string; suratJalan?: string; suratJalanId?: string; suratJalanName?: string; invoiceNo?: string; invoiceFile?: string; invoiceFileId?: string; invoiceFileName?: string; sitePlan?: string 
}) => {
    // CRITICAL: Prevent race condition - if already saving, return immediately
    if (grnSavingRef.current) {
      console.warn('[GRN] Save already in progress, ignoring duplicate request');
      return;
    }
    
    if (!selectedPOForReceipt) return;

    try {
      // Mark as saving
      grnSavingRef.current = true;
      
      // IMPORTANT: Validate PO is not deleted (tombstone protection)
      if ((selectedPOForReceipt as any).deleted === true || (selectedPOForReceipt as any).deletedAt) {
        toast.error('PO ini sudah dihapus. Tidak bisa membuat GRN untuk PO yang sudah dihapus.');
        grnSavingRef.current = false;
        return;
      }
      
      const item = selectedPOForReceipt;
      const qtyReceived = Math.ceil(receiptData.qtyReceived || item.qty);
      const receivedDate = receiptData.receivedDate || new Date().toISOString().split('T')[0];

      if (qtyReceived <= 0) {
        toast.warning('Quantity received must be greater than 0');
        grnSavingRef.current = false;
        return;
      }

      // GRN Partial Handling: Cek total qtyReceived dari semua GRN untuk PO ini
      const grnPackagingRecords = extractStorageValue(await storageService.get<any[]>('grnPackaging'));
      
      const existingGRNsForPO = grnPackagingRecords.filter((grn: any) => {
        const grnPO = (grn.poNo || '').toString().trim();
        const currentPO = (item.poNo || '').toString().trim();
        const match = grnPO === currentPO;
        return match;
      });
      
      const totalQtyReceived = existingGRNsForPO.reduce((sum: number, grn: any) => sum + (grn.qtyReceived || 0), 0);
      const remainingQty = item.qty - totalQtyReceived;
      
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
            
            await storageService.set(StorageKeys.PACKAGING.GRN_PACKAGING, cleanedGRNs);
            
            // Force sync to server immediately
            if ((storageService as any).syncToServer) {
              await (storageService as any).syncToServer();
            }
            
            toast.success(`✅ Berhasil hapus ${existingGRNsForPO.length} GRN corrupt untuk PO ${item.poNo}.\n\nData sudah di-sync ke server.\n\nSilakan create GRN baru.`);
            setSelectedPOForReceipt(null);
            loadOrders();
          },
          () => {
            setSelectedPOForReceipt(null);
            grnSavingRef.current = false;
          },
          '🧹 Clean Up Corrupt GRN Data'
        );
        grnSavingRef.current = false;
        return;
      }

      // Validasi: qtyReceived tidak boleh melebihi remaining qty + 10% toleransi
      const maxAllowedQty = item.qty * 1.1; // 10% toleransi dari qty ordered
      const maxAllowedWithExisting = maxAllowedQty - totalQtyReceived;
      
      if (qtyReceived > maxAllowedWithExisting) {
        const maxTotal = Math.ceil(maxAllowedQty);
        toast.warning(
          `⚠️ Quantity received (${qtyReceived}) melebihi batas maksimal!\n\n` +
          `Qty Ordered: ${item.qty}\n` +
          `Total Sudah Diterima: ${totalQtyReceived}\n` +
          `Maksimal Total (dengan toleransi 10%): ${maxTotal}\n` +
          `Maksimal yang bisa diterima sekarang: ${Math.ceil(maxAllowedWithExisting)}`
        );
        grnSavingRef.current = false;
        return;
      }

      // Generate unique GRN number with random code
      const now = new Date();
      const year = String(now.getFullYear()).slice(-2);
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const randomCode = Math.random().toString(36).substr(2, 5).toUpperCase();
      const grnNo = `GRN-${year}${month}${day}-${randomCode}`;
      
      // Check duplicate GRN untuk prevent save duplicate
      const duplicateGRN = grnPackagingRecords.find((grn: any) => 
        grn.grnNo === grnNo || 
        (grn.poNo === item.poNo && grn.qtyReceived === qtyReceived && grn.receivedDate === receivedDate)
      );
      
      if (duplicateGRN) {
        toast.warning(`⚠️ GRN duplicate terdeteksi!\n\nGRN ${duplicateGRN.grnNo} dengan qty ${duplicateGRN.qtyReceived} untuk PO ${item.poNo} sudah ada.\n\nTidak bisa membuat GRN duplicate.`);
        grnSavingRef.current = false;
        return;
      }
      
      const newGRN = {
        id: Date.now().toString(),
        grnNo: grnNo,
        poNo: item.poNo,
        soNo: item.soNo,
        spkNo: item.spkNo,
        supplier: item.supplier,
        materialItem: item.materialItem,
        material_id: getMaterialId(item),
        materialId: getMaterialId(item), // Backward compatibility
        qtyOrdered: item.qty,
        qtyReceived: qtyReceived,
        status: 'OPEN', // GRN langsung OPEN setelah barang diterima
        receivedDate: receivedDate,
        notes: receiptData.notes || '',
        suratJalanId: receiptData.suratJalanId || '',
        suratJalanName: receiptData.suratJalanName || '',
        invoiceNo: receiptData.invoiceNo || '',
        invoiceFileId: receiptData.invoiceFileId || '',
        invoiceFileName: receiptData.invoiceFileName || '',
        sitePlan: receiptData.sitePlan || 'Site Plan 1',
        created: new Date().toISOString(),
      };
      
      // IMPORTANT: Load dan save ke key yang SAMA!
      const currentGRN = extractStorageValue(await storageService.get<any[]>('grnPackaging')) || [];
      const currentGRNArray = Array.isArray(currentGRN) ? currentGRN : [];
      
      // Prevent duplicate before save
      const isDuplicate = (Array.isArray(currentGRNArray) && currentGRNArray.some((grn: any) => 
        grn.grnNo === newGRN.grnNo || 
        (grn.poNo === newGRN.poNo && 
         grn.qtyReceived === newGRN.qtyReceived && 
         grn.receivedDate === newGRN.receivedDate &&
         Math.abs(new Date(grn.created).getTime() - new Date(newGRN.created).getTime()) < 5000) // 5 sec threshold
      )) || false;
      
      if (isDuplicate) {
        toast.warning('⚠️ GRN duplicate terdeteksi! Tidak bisa save.\n\nKemungkinan double-click atau data sudah ada.');
        grnSavingRef.current = false;
        return;
      }
      
      const updatedGRNs = Array.isArray(currentGRNArray) ? [...currentGRNArray, newGRN] : [newGRN];
      // Save GRN dengan immediateSync untuk pastikan langsung sync ke server
      await storageService.set(StorageKeys.PACKAGING.GRN_PACKAGING, updatedGRNs, true); // immediateSync = true untuk pastikan langsung sync ke server
      
      setGrnList(Array.isArray(updatedGRNs) ? updatedGRNs : []);
      
      // Update PO status: CLOSE jika total qtyReceived >= qtyOrdered
      const updatedGRNsForPO = [...existingGRNsForPO, newGRN];
      const newTotalQtyReceived = updatedGRNsForPO.reduce((sum: number, grn: any) => sum + (grn.qtyReceived || 0), 0);
      
      if (newTotalQtyReceived >= item.qty) {
        // Semua material sudah diterima, update PO status menjadi CLOSE
        const ordersArray = Array.isArray(orders) ? orders : [];
        const updatedOrders = ordersArray.map((po: any) =>
          po.poNo === item.poNo ? { ...po, status: 'CLOSE' as const } : po
        );
        await storageService.set(StorageKeys.PACKAGING.PURCHASE_ORDERS, updatedOrders);
        setOrders(updatedOrders);
      }
      
      // Update inventory - material received (OTOMATIS MASUK KE INVENTORY)
      const inventory = extractStorageValue(await storageService.get<any[]>('inventory'));
      const materialId = getMaterialId(item);
      
      if (!materialId) {
        toast.warning('⚠️ Material ID tidak ditemukan. Inventory tidak dapat di-update.');
      } else {
        // Cari material di master untuk mendapatkan kode yang benar
        const materials = extractStorageValue(await storageService.get<any[]>('materials')) || [];
        const material = findMaterialById(materialId);
        
        if (!material) {
          toast.warning(`⚠️ Material tidak ditemukan di master data: ${materialId}\n\nInventory tidak dapat di-update.`);
        } else {
          // Gunakan material_id atau kode dari master sebagai codeItem
          const codeItem = (material.material_id || material.kode || materialId).toString().trim();
          
          // Cari existing inventory dengan codeItem (coba beberapa cara matching)
          const inventoryArray = Array.isArray(inventory) ? inventory : [];
          let existingMaterial = inventoryArray.find((inv: any) => 
            (inv.item_code || inv.codeItem || '').toString().trim() === codeItem
          );
          
          // Jika tidak ketemu, coba match dengan material_id atau kode
          if (!existingMaterial) {
            existingMaterial = inventoryArray.find((inv: any) => {
              const invCode = (inv.item_code || inv.codeItem || '').toString().trim();
              return invCode === materialId || 
                     (material.material_id && invCode === material.material_id.toString().trim()) ||
                     (material.kode && invCode === material.kode.toString().trim());
            });
          }
          
          // Get price dari PO (Purchase Order) - bukan dari master material
          // item.price sudah price per unit, bukan total!
          const pricePerUnit = item.price || 0;
          const poNo = item.poNo || '';
          
          // ANTI-DUPLICATE: Cek apakah PO number sudah pernah diproses untuk material ini
          if (existingMaterial && poNo) {
            const processedPOs = existingMaterial.processedPOs || [];
            if (processedPOs.includes(poNo)) {
              toast.warning(`⚠️ PO ${poNo} sudah pernah diproses untuk material ini.\n\nInventory tidak di-update untuk menghindari double counting.`);
              return;
            }
          }
          
          if (existingMaterial) {
            // Update existing inventory - tambah stock
            // Update price dengan price dari PO (jika ada)
            const oldReceive = existingMaterial.receive || 0;
            const oldStockPremonth = existingMaterial.stockPremonth || 0;
            const oldOutgoing = existingMaterial.outgoing || 0;
            const oldReturn = existingMaterial.return || 0;
            const newReceive = oldReceive + qtyReceived;
            const newNextStock = oldStockPremonth + newReceive - oldOutgoing + oldReturn;
            
            // Update price dengan price dari PO (jika PO punya price per unit)
            // pricePerUnit sudah price per unit dari PO, langsung pakai
            const updatedPrice = pricePerUnit > 0 ? pricePerUnit : (existingMaterial.price || material.priceMtr || material.harga || 0);
            
            // Tambahkan PO number ke processedPOs untuk anti-duplicate
            const processedPOs = existingMaterial.processedPOs || [];
            if (poNo && !processedPOs.includes(poNo)) {
              processedPOs.push(poNo);
            }
            
            // IMPORTANT: Track SPK yang menerima material dari GRN ini (untuk material allocation)
            // Material dari GRN untuk 1 SPK tidak boleh digunakan oleh SPK lain
            const spkNo = (item.spkNo || '').toString().trim();
            const allocatedSPKs = existingMaterial.allocatedSPKs || [];
            if (spkNo && !allocatedSPKs.includes(spkNo)) {
              allocatedSPKs.push(spkNo);
            }
            
            const updatedInventory = inventory.map((inv: any) =>
              inv.id === existingMaterial.id
                ? { 
                    ...inv, 
                    receive: newReceive, 
                    price: updatedPrice, // Update price dari PO
                    nextStock: newNextStock,
                    processedPOs: processedPOs, // Track PO yang sudah diproses
                    allocatedSPKs: allocatedSPKs, // Track SPK yang menerima material dari GRN
                    sitePlan: receiptData.sitePlan || 'Site Plan 1', // Site Plan dari GRN
                    lastUpdate: new Date().toISOString() 
                  }
                : inv
            );
            await storageService.set(StorageKeys.PACKAGING.INVENTORY, updatedInventory);
            toast.success(`✅ Inventory updated: ${item.materialItem}\n\nStock: ${newNextStock} ${material.satuan || 'PCS'}\nPrice: Rp ${updatedPrice.toLocaleString('id-ID')}`);
          } else {
            // Create new inventory entry for material
            // Price diambil dari PO, bukan dari master material
            const materialPrice = pricePerUnit > 0 ? pricePerUnit : (material.priceMtr || material.harga || 0);
            // IMPORTANT: Track SPK yang menerima material dari GRN ini (untuk material allocation)
            // Jika tidak ada SPK (PO tanpa SO), allocatedSPKs tetap empty array (material bisa digunakan untuk SPK manapun)
            const spkNo = (item.spkNo || '').toString().trim();
            const allocatedSPKs = spkNo ? [spkNo] : [];
            
            const newInventoryEntry = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              supplierName: item.supplier || '',
              codeItem: codeItem,
              description: material.nama || item.materialItem,
              kategori: 'Material',
              satuan: material.satuan || 'PCS',
              price: materialPrice, // Price dari PO
              stockPremonth: 0,
              receive: qtyReceived,
              outgoing: 0,
              return: 0,
              nextStock: 0 + qtyReceived - 0 + 0, // stockPremonth + receive - outgoing + return
              processedPOs: poNo ? [poNo] : [], // Track PO yang sudah diproses
              allocatedSPKs: allocatedSPKs, // Track SPK yang menerima material (empty jika PO tanpa SO)
              sitePlan: receiptData.sitePlan || 'Site Plan 1', // Site Plan dari GRN
              lastUpdate: new Date().toISOString(),
            };
            inventory.push(newInventoryEntry);
            await storageService.set(StorageKeys.PACKAGING.INVENTORY, inventory);
            toast.success(`✅ New inventory entry created: ${item.materialItem}\n\nStock: ${qtyReceived} ${material.satuan || 'PCS'}\nPrice: Rp ${materialPrice.toLocaleString('id-ID')} (from PO)`);
          }
        }
      }
      
      // Auto-create journal entries untuk GRN (Debit Inventory, Credit AP)
      // Best practice: Journal entry dibuat saat barang diterima (GRN)
      try {
        const journalEntries = await storageService.get<any[]>('journalEntries') || [];
        const accounts = await storageService.get<any[]>('accounts') || [];
        
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
          await storageService.set(StorageKeys.PACKAGING.ACCOUNTS, defaultAccounts);
        }
        
        const entryDate = receivedDate;
        const poTotal = item.total || 0;
        
        // Cek apakah sudah ada journal entry untuk GRN ini (prevent duplicate)
        const hasGRNEntry = (Array.isArray(journalEntries) && journalEntries.some((entry: any) =>
          entry.reference === newGRN.grnNo &&
          (entry.account === '1200' || entry.account === '2000')
        )) || false;
        
        if (!hasGRNEntry && poTotal > 0) {
          const accountsArray = Array.isArray(accounts) ? accounts : [];
          const inventoryAccount = accountsArray.find((a: any) => a.code === '1200') || { code: '1200', name: 'Inventory' };
          const apAccount = accountsArray.find((a: any) => a.code === '2000') || { code: '2000', name: 'Accounts Payable' };
          
          // Debit Inventory, Credit AP
          const newEntries = [
            {
              entryDate,
              reference: newGRN.grnNo,
              account: '1200',
              accountName: inventoryAccount.name,
              debit: poTotal,
              credit: 0,
              description: `GRN ${newGRN.grnNo} - ${item.materialItem || 'Material'}`,
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
          
          await storageService.set(StorageKeys.PACKAGING.JOURNAL_ENTRIES, [...journalEntries, ...entriesWithNo]);
        }
      } catch (error: any) {
        // Jangan block proses, hanya log error (non-blocking)
      }
      
      // PO tetap OPEN, akan di-close setelah payment di Finance
      // Tidak auto-close PO setelah GRN dibuat

      // Create notification untuk Finance - Supplier Payment
      const notifications = extractStorageValue(await storageService.get<any[]>('financeNotifications')) || [];
      const notificationsArray = Array.isArray(notifications) ? notifications : [];
      
      // IMPORTANT: Cek duplikasi notification sebelum create (cek berdasarkan PO dan GRN)
      const existingNotification = notificationsArray.find((notif: any) => {
        const notifPONo = (notif.poNo || '').toString().trim();
        const notifGRNNo = (notif.grnNo || '').toString().trim();
        const currentPONo = (item.poNo || '').toString().trim();
        const currentGRNNo = (newGRN.grnNo || '').toString().trim();
        
        // Match jika PO sama DAN GRN sama (atau GRN kosong di existing tapi PO sama)
        return (
          notifPONo === currentPONo && 
          (notifGRNNo === currentGRNNo || (!notifGRNNo && currentGRNNo) || (notifGRNNo && !currentGRNNo))
        ) && notif.type === 'SUPPLIER_PAYMENT';
      });
      
      if (existingNotification) {
        // Update existing notification dengan data terbaru jika perlu
        const updatedNotifications = notificationsArray.map((notif: any) => {
          if (notif.id === existingNotification.id) {
            // Update dengan data terbaru (GRN, qty, dll)
            return {
              ...notif,
              grnNo: newGRN.grnNo,
              qty: qtyReceived,
              materialItem: item.materialItem || notif.materialItem,
              receivedDate: receivedDate,
              suratJalanId: receiptData.suratJalanId || notif.suratJalanId || '',
              suratJalanName: receiptData.suratJalanName || notif.suratJalanName || '',
              invoiceNo: receiptData.invoiceNo || notif.invoiceNo || '',
              invoiceFileId: receiptData.invoiceFileId || notif.invoiceFileId || '',
              invoiceFileName: receiptData.invoiceFileName || notif.invoiceFileName || '',
            };
          }
          return notif;
        });
        await storageService.set(StorageKeys.PACKAGING.FINANCE_NOTIFICATIONS, updatedNotifications);
      } else {
        // Buat notification baru jika belum ada
        const newNotification = {
          id: Date.now().toString(),
          type: 'SUPPLIER_PAYMENT',
          poNo: item.poNo,
          supplier: item.supplier,
          soNo: item.soNo,
          spkNo: item.spkNo,
          grnNo: newGRN.grnNo,
          materialItem: item.materialItem,
          qty: qtyReceived,
          total: item.total,
          receivedDate: receivedDate,
          suratJalanId: receiptData.suratJalanId || '',
          suratJalanName: receiptData.suratJalanName || '',
          invoiceNo: receiptData.invoiceNo || '',
          invoiceFileId: receiptData.invoiceFileId || '',
          invoiceFileName: receiptData.invoiceFileName || '',
          purchaseReason: item.purchaseReason || '',
          status: 'PENDING',
          created: new Date().toISOString(),
        };
        await storageService.set(StorageKeys.PACKAGING.FINANCE_NOTIFICATIONS, [...notifications, newNotification]);
      }

      // Update Production notification - material sudah diterima
      // IMPORTANT: Filter deleted notifications untuk prevent data resurrection
      const productionNotificationsRaw = extractStorageValue(await storageService.get<any[]>('productionNotifications'));
      const productionNotifications = filterActiveItems(productionNotificationsRaw);
      
      // Helper function untuk normalize SPK number (remove batch suffix untuk matching)
      const normalizeSPK = (spk: string) => {
        if (!spk) return '';
        // Remove batch suffix seperti -A, -B, dll
        return spk.replace(/-[A-Z]$/, '').trim();
      };
      
      // Helper untuk enrich notifikasi dengan material requirements
      const enrichNotificationWithMaterials = async (notif: any) => {
        // Jika sudah ada materialRequirements, skip
        if (notif.materialRequirements && Array.isArray(notif.materialRequirements) && notif.materialRequirements.length > 0) {
          return notif;
        }
        
        const normalizeKey = (value: any) => (value ?? '').toString().trim().toLowerCase();
        const toNumber = (value: any) => {
          if (typeof value === 'number' && !Number.isNaN(value)) return value;
          const parsed = parseFloat(value);
          return Number.isNaN(parsed) ? 0 : parsed;
        };
        
        // Load BOM dan materials
        const bomList = extractStorageValue(await storageService.get<any[]>('bom')) || [];
        const materialsList = extractStorageValue(await storageService.get<any[]>('materials')) || [];
        
        const bomListArray = Array.isArray(bomList) ? bomList : [];
        const materialsListArray = Array.isArray(materialsList) ? materialsList : [];
        
        const productKey = normalizeKey(notif.productId || notif.product || notif.productCode);
        if (!productKey) return notif;
        
        const bomForProduct = bomListArray.filter((bom: any) => {
          const bomProductKey = normalizeKey(bom.product_id || bom.kode);
          return bomProductKey === productKey;
        });
        
        if (bomForProduct.length === 0) return notif;
        
        const qtyNeeded = toNumber(notif.qty || notif.target || notif.targetQty);
        if (qtyNeeded <= 0) return notif;
        
        // Build material requirements dari BOM
        const materialRequirements: any[] = [];
        bomForProduct.forEach((bom: any) => {
          const materialKey = normalizeKey(bom.material_id || bom.kode || bom.materialId);
          if (!materialKey) return;
          
          const ratio = toNumber(bom.ratio || 1) || 1;
          const requiredQty = Math.max(Math.ceil(qtyNeeded * ratio), 0);
          if (requiredQty === 0) return;
          
          // Cari material name dari materials list
          const material = materialsListArray.find((m: any) => 
            normalizeKey(m.material_id || m.kode) === materialKey
          );
          
          materialRequirements.push({
            materialId: materialKey,
            materialName: material?.nama || material?.name || material?.material_name || bom.material_name || materialKey,
            materialCode: material?.kode || material?.material_id || materialKey,
            ratio: ratio,
            requiredQty: requiredQty,
            unit: material?.satuan || material?.unit || bom.unit || 'PCS',
          });
        });
        
        return {
          ...notif,
          materialRequirements: materialRequirements,
        };
      };
      
      let notificationUpdated = false;
      const updatedProductionNotifications = await Promise.all(productionNotifications.map(async (n: any) => {
        // Update notification jika SPK sama dengan GRN ini
        // IMPORTANT: Hanya match berdasarkan SPK, JANGAN match berdasarkan SO saja!
        // Karena 1 SO bisa punya multiple SPK dengan material berbeda
        const grnSPK = (item.spkNo || '').toString().trim();
        const notifSPK = (n.spkNo || '').toString().trim();
        
        // Match SPK: exact match atau match setelah normalize (remove batch suffix)
        // Tapi HARUS ada SPK di kedua sisi, tidak boleh match hanya karena SO sama
        const matchesSPK = grnSPK && notifSPK && (
          grnSPK === notifSPK || // Exact match
          normalizeSPK(grnSPK) === normalizeSPK(notifSPK) || // Same base (e.g., SPK-251211-IJ423-A vs SPK-251211-IJ423-B)
          grnSPK.startsWith(normalizeSPK(notifSPK) + '-') || // GRN SPK adalah batch dari notification SPK
          notifSPK.startsWith(normalizeSPK(grnSPK) + '-') // Notification SPK adalah batch dari GRN SPK
        );
        
        // JANGAN match berdasarkan SO saja! Ini terlalu luas dan bisa update notification yang salah
        // const matchesSO = grnSO && notifSO && grnSO === notifSO; // ❌ REMOVED
        
        if (matchesSPK) {
          notificationUpdated = true;
          
          // Enrich dengan material requirements jika belum ada
          const enrichedNotif = await enrichNotificationWithMaterials({
            ...n,
            materialStatus: 'RECEIVED',
            status: 'READY_TO_PRODUCE',
            grnNo: newGRN.grnNo,
            lastUpdate: new Date().toISOString(),
          });
          
          return enrichedNotif;
        }
        
        // Enrich notifikasi yang tidak match juga (untuk notifikasi lain yang mungkin belum punya material requirements)
        return await enrichNotificationWithMaterials(n);
      }));
      
      // Jika tidak ada notification yang match, buat notification baru untuk Production
      // IMPORTANT: Hanya create jika ada SPK, JANGAN create hanya berdasarkan SO!
      // IMPORTANT: Pastikan tidak ada duplikasi - cek dulu apakah notification sudah ada
      if (!notificationUpdated && item.spkNo) {
        // Cek apakah notification sudah ada untuk SPK ini (untuk avoid double notification)
        const grnSPKNormalized = normalizeSPK(item.spkNo || '');
        const prodNotifArray = Array.isArray(updatedProductionNotifications) ? updatedProductionNotifications : [];
        const existingNotif = prodNotifArray.find((n: any) => {
          const notifSPK = (n.spkNo || '').toString().trim();
          if (!notifSPK) return false;
          return (
            notifSPK === item.spkNo || 
            normalizeSPK(notifSPK) === grnSPKNormalized ||
            notifSPK.startsWith(grnSPKNormalized + '-') ||
            (grnSPKNormalized && notifSPK.startsWith(grnSPKNormalized))
          );
        });
        
        if (existingNotif) {
          notificationUpdated = true; // Mark as updated untuk skip create
        }
      }
      
      if (!notificationUpdated && item.spkNo) {
        // Cari SPK data untuk mendapatkan info lengkap
        const spkData = extractStorageValue(await storageService.get<any[]>('spk')) || [];
        const spkDataArray = Array.isArray(spkData) ? spkData : [];
        
        // Cari SPK dengan matching yang lebih fleksibel (handle batch suffix)
        const grnSPKNormalized = normalizeSPK(item.spkNo || '');
        const relatedSPK = spkDataArray.find((s: any) => {
          const sSPK = (s.spkNo || '').toString().trim();
          
          // Match SPK: exact atau normalized (batch dari SPK yang sama)
          const spkMatch = item.spkNo && sSPK && (
            sSPK === item.spkNo || 
            normalizeSPK(sSPK) === grnSPKNormalized ||
            sSPK.startsWith(grnSPKNormalized + '-') ||
            (grnSPKNormalized && sSPK.startsWith(grnSPKNormalized))
          );
          
          // JANGAN match berdasarkan SO saja! Hanya match berdasarkan SPK
          return spkMatch;
        });
        
        if (relatedSPK) {
          // Enrich dengan material requirements dari BOM
          const normalizeKey = (value: any) => (value ?? '').toString().trim().toLowerCase();
          const toNumber = (value: any) => {
            if (typeof value === 'number' && !Number.isNaN(value)) return value;
            const parsed = parseFloat(value);
            return Number.isNaN(parsed) ? 0 : parsed;
          };
          
          // Load BOM dan materials untuk enrich material requirements
          const bomList = extractStorageValue(await storageService.get<any[]>('bom')) || [];
          const materialsList = extractStorageValue(await storageService.get<any[]>('materials')) || [];
          
          const bomListArray = Array.isArray(bomList) ? bomList : [];
          const materialsListArray = Array.isArray(materialsList) ? materialsList : [];
          
          const productKey = normalizeKey(relatedSPK.kode || relatedSPK.product_id || '');
          const qtyNeeded = toNumber(relatedSPK.qty || 0);
          
          // Build material requirements dari BOM
          const materialRequirements: any[] = [];
          if (productKey && qtyNeeded > 0) {
            const bomForProduct = bomListArray.filter((bom: any) => {
              const bomProductKey = normalizeKey(bom.product_id || bom.kode);
              return bomProductKey === productKey;
            });
            
            bomForProduct.forEach((bom: any) => {
              const materialKey = normalizeKey(bom.material_id || bom.kode || bom.materialId);
              if (!materialKey) return;
              
              const ratio = toNumber(bom.ratio || 1) || 1;
              const requiredQty = Math.max(Math.ceil(qtyNeeded * ratio), 0);
              if (requiredQty === 0) return;
              
              // Cari material name dari materials list
              const material = materialsListArray.find((m: any) => 
                normalizeKey(m.material_id || m.kode) === materialKey
              );
              
              materialRequirements.push({
                materialId: materialKey,
                materialName: material?.nama || material?.name || material?.material_name || bom.material_name || materialKey,
                materialCode: material?.kode || material?.material_id || materialKey,
                ratio: ratio,
                requiredQty: requiredQty,
                unit: material?.satuan || material?.unit || bom.unit || 'PCS',
              });
            });
          }
          
          const newProductionNotification = {
            id: Date.now().toString(),
            type: 'PRODUCTION_SCHEDULE',
            spkNo: relatedSPK.spkNo || item.spkNo || '',
            soNo: relatedSPK.soNo || item.soNo || '',
            customer: relatedSPK.customer || '',
            product: relatedSPK.product || '',
            productId: relatedSPK.kode || relatedSPK.product_id || '',
            qty: relatedSPK.qty || 0,
            materialStatus: 'RECEIVED',
            status: 'READY_TO_PRODUCE',
            grnNo: newGRN.grnNo,
            materialRequirements: materialRequirements, // Tambahkan material requirements
            created: new Date().toISOString(),
          };
          updatedProductionNotifications.push(newProductionNotification);
          notificationUpdated = true;
        }
      }
      
      if (notificationUpdated) {
        await storageService.set(StorageKeys.PACKAGING.PRODUCTION_NOTIFICATIONS, updatedProductionNotifications);
      }
      
      // Update receipt date di PO
      const ordersArray = Array.isArray(orders) ? orders : [];
      const updatedOrders = ordersArray.map((order) =>
        order.id === item.id
          ? {
              ...order,
              receiptDate: receivedDate,
              status: 'CLOSE' as const,
            }
          : order
      );
      await storageService.set(StorageKeys.PACKAGING.PURCHASE_ORDERS, updatedOrders);
      setOrders(updatedOrders);
      
      // Reload orders untuk update UI
      await loadOrders();
      
      toast.success(`GRN created: ${newGRN.grnNo}\n\n✅ Inventory updated (+${qtyReceived})\n📧 Notification sent to Finance - Supplier Payment tab\n📧 Production notification updated - Material received\n\n✅ Production dapat dimulai sekarang!`);
      setSelectedPOForReceipt(null);
    } catch (error: any) {
      toast.error(`Error creating GRN: ${error.message}`);
    } finally {
      // CRITICAL: Always reset saving flag to allow future saves
      grnSavingRef.current = false;
    }
  };

  const handlePrintPOFull = async (item: PurchaseOrder) => {
    try {
      const html = await generatePOHtmlContent(item);
      openPrintWindow(html);
    } catch (error: any) {
      toast.error(`Error generating PO PDF: ${error.message}`);
    }
  };

  const handlePrintPOSheet = async (item: PurchaseOrder) => {
    try {
      const html = await generatePOSheetHtmlContent(item);
      openPrintWindow(html);
    } catch (error: any) {
      toast.error(`Error generating PO Sheet PDF: ${error.message}`);
    }
  };

  const handleUpdateStatus = async (item: PurchaseOrder) => {
    const newStatus = prompt(`Update status for PO: ${item.poNo}\n\nCurrent: ${item.status}\n\nEnter new status (DRAFT/OPEN/CLOSE):`, item.status);
    if (newStatus && newStatus !== item.status && ['DRAFT', 'OPEN', 'CLOSE'].includes(newStatus)) {
      try {
        const ordersArray = Array.isArray(orders) ? orders : [];
        const updated = ordersArray.map(o =>
          o.id === item.id ? { ...o, status: newStatus as any } : o
        );
        await storageService.set(StorageKeys.PACKAGING.PURCHASE_ORDERS, updated);
        setOrders(updated);
        toast.success(`Status updated to: ${newStatus}`);
      } catch (error: any) {
        toast.error(`Error updating status: ${error.message}`);
      }
    }
  };

  // Sort orders: Terbaru di atas, CLOSE di bawah
  const sortedOrders = useMemo(() => {
    // Ensure orders is always an array
    const ordersArray = Array.isArray(orders) ? orders : [];
    return [...ordersArray].sort((a, b) => {
      // Priority 1: CLOSE status di bawah, yang lain di atas
      const statusOrder: Record<string, number> = { 'CLOSE': 1, 'OPEN': 0, 'DRAFT': 0, 'CONFIRMED': 0 };
      const statusDiff = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
      if (statusDiff !== 0) return statusDiff;
      
      // Priority 2: Yang paling baru di atas (berdasarkan created date)
      const dateA = new Date(a.created).getTime();
      const dateB = new Date(b.created).getTime();
      return dateB - dateA; // Descending (newest first)
    });
  }, [orders]);

  // Filter orders berdasarkan search query dan date range
  const filteredOrders = useMemo(() => {
    let filtered = sortedOrders;
    
    // Tab filter - Outstanding tab hanya show status OPEN
    if (activeTab === 'outstanding') {
      filtered = filtered.filter(item => item.status === 'OPEN');
    }
    
    // Date filter
    if (dateFrom) {
      filtered = filtered.filter(order => order.created >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter(order => order.created <= dateTo);
    }
    
    if (!searchQuery) return filtered;
    
    const query = searchQuery.toLowerCase();
    return filtered.filter((item: PurchaseOrder) => {
      return (
        (item.poNo || '').toLowerCase().includes(query) ||
        (item.supplier || '').toLowerCase().includes(query) ||
        (item.soNo || '').toLowerCase().includes(query) ||
        (item.spkNo || '').toLowerCase().includes(query) ||
        (item.materialItem || '').toLowerCase().includes(query) ||
        (item.status || '').toLowerCase().includes(query)
      );
    });
  }, [sortedOrders, searchQuery, activeTab, dateFrom, dateTo]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    setTableCurrentPage(1);
  }, [searchQuery, activeTab, viewMode, dateFrom, dateTo]);

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
        materialItem: po.materialItem,
        materialId: po.materialId || '',
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
          { key: 'materialItem', header: 'Material Item', width: 40 },
          { key: 'materialId', header: 'Material ID', width: 20 },
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
          materialItem: po.materialItem,
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
          { key: 'materialItem', header: 'Material Item', width: 40 },
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
        toast.warning('No data available to export');
        return;
      }

      const fileName = `Purchase_Orders_Complete_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(`✅ Exported complete purchase orders data (${poDataExport.length} PO, ${outstandingPO.length} outstanding) to ${fileName}`);
    } catch (error: any) {
      toast.error(`Error exporting to Excel: ${error.message}`);
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

  const columns = useMemo(() => [
    { 
      key: 'poNo', 
      header: t('common.code') || 'PO No',
      render: (item: PurchaseOrder) => (
        <strong style={{ color: '#2e7d32', fontSize: '13px' }}>{item.poNo}</strong>
      ),
    },
    { 
      key: 'supplier', 
      header: t('master.supplierName') || 'Supplier',
      render: (item: PurchaseOrder) => (
        <span style={{ fontSize: '13px' }}>{item.supplier}</span>
      ),
    },
    { 
      key: 'soNo', 
      header: t('salesOrder.number') || 'SO No',
      render: (item: PurchaseOrder) => (
        <span style={{ fontSize: '12px', color: '#2e7d32' }}>{item.soNo || '-'}</span>
      ),
    },
    { 
      key: 'spkNo', 
      header: 'SPK No',
      render: (item: PurchaseOrder) => {
        const spkNo = item.spkNo || '';
        if (!spkNo) return <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>-</span>;
        return (
          <strong style={{ fontSize: '12px', color: '#1976d2' }}>{spkNo}</strong>
        );
      },
    },
    {
      key: 'status',
      header: t('common.status') || 'Status',
      render: (item: PurchaseOrder) => (
        <span className={`status-badge status-${item.status.toLowerCase()}`} style={{ fontSize: '11px' }}>
          {item.status}
        </span>
      ),
    },
    {
      key: 'receiptDate',
      header: t('common.date') || 'Receipt Date',
      render: (item: PurchaseOrder) => (
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {formatDateSimple(item.receiptDate)}
        </span>
      ),
    },
    {
      key: 'materialItem',
      header: t('master.materialName') || 'Material/Item',
      render: (item: PurchaseOrder) => (
        <span style={{ fontSize: '13px' }}>{item.materialItem}</span>
      ),
    },
    {
      key: 'qty',
      header: t('common.quantity') || 'Qty Order',
      render: (item: PurchaseOrder) => (
        <span style={{ fontSize: '13px', textAlign: 'right', display: 'block' }}>
          {Number(item.qty || 0).toLocaleString('id-ID')}
        </span>
      ),
    },
    {
      key: 'qtyReceived',
      header: 'Qty Actual Receipt',
      render: (item: PurchaseOrder) => {
        const grnPackagingRecords = Array.isArray(grnList) ? grnList : [];
        const grnsForPO = grnPackagingRecords.filter((grn: any) => {
          const grnPO = (grn.poNo || '').toString().trim();
          const currentPO = (item.poNo || '').toString().trim();
          return grnPO === currentPO;
        });
        const totalReceived = grnsForPO.reduce((sum: number, grn: any) => sum + (Number(grn.qtyReceived) || 0), 0);
        return (
          <span style={{ fontSize: '13px', textAlign: 'right', display: 'block', color: totalReceived > 0 ? '#2e7d32' : 'var(--text-secondary)' }}>
            {totalReceived.toLocaleString('id-ID')}
          </span>
        );
      },
    },
    {
      key: 'price',
      header: t('common.price') || 'Unit Price',
      render: (item: PurchaseOrder) => (
        <span style={{ fontSize: '12px', textAlign: 'right', display: 'block' }}>
          Rp {Math.ceil(item.price || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
        </span>
      ),
    },
    {
      key: 'total',
      header: t('common.total') || 'Total',
      render: (item: PurchaseOrder) => {
        // Hitung total berdasarkan qtyReceived jika sudah ada GRN, atau qty order jika belum
        const grnPackagingRecords = Array.isArray(grnList) ? grnList : [];
        const grnsForPO = grnPackagingRecords.filter((grn: any) => {
          const grnPO = (grn.poNo || '').toString().trim();
          const currentPO = (item.poNo || '').toString().trim();
          return grnPO === currentPO;
        });
        const totalReceived = grnsForPO.reduce((sum: number, grn: any) => sum + (Number(grn.qtyReceived) || 0), 0);
        
        // Jika sudah ada GRN, gunakan qtyReceived untuk hitung total
        const qtyForTotal = totalReceived > 0 ? totalReceived : (item.qty || 0);
        const unitPrice = item.price || 0;
        const calculatedTotal = Math.ceil(qtyForTotal * unitPrice);
        
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
      key: 'invoiceNo',
      header: 'Invoice No',
      render: (item: PurchaseOrder) => {
        const grnPackagingRecords = Array.isArray(grnList) ? grnList : [];
        const grnsForPO = grnPackagingRecords.filter((grn: any) => {
          const grnPO = (grn.poNo || '').toString().trim();
          const currentPO = (item.poNo || '').toString().trim();
          return grnPO === currentPO;
        });
        
        if (grnsForPO.length === 0) {
          return <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>-</span>;
        }
        
        // Collect all invoice numbers from GRNs
        const invoiceNumbers = grnsForPO
          .map((grn: any) => grn.invoiceNo)
          .filter((inv: string) => inv && inv.trim());
        
        if (invoiceNumbers.length === 0) {
          return <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>-</span>;
        }
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {invoiceNumbers.map((invNo: string, idx: number) => (
              <span key={idx} style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '500' }}>
                {invNo}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'uploadedFiles',
      header: 'Uploaded Files',
      render: (item: PurchaseOrder) => {
        const grnPackagingRecords = Array.isArray(grnList) ? grnList : [];
        const grnsForPO = grnPackagingRecords.filter((grn: any) => {
          const grnPO = (grn.poNo || '').toString().trim();
          const currentPO = (item.poNo || '').toString().trim();
          return grnPO === currentPO;
        });
        
        if (grnsForPO.length === 0) {
          return <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>-</span>;
        }
        
        // Collect all uploaded files from GRNs
        const uploadedFiles: Array<{ type: string; name: string; data: string }> = [];
        grnsForPO.forEach((grn: any) => {
          if (grn.suratJalan && grn.suratJalanName) {
            uploadedFiles.push({ type: 'SJ', name: grn.suratJalanName, data: grn.suratJalan });
          }
          if (grn.invoiceFile && grn.invoiceFileName) {
            uploadedFiles.push({ type: 'INV', name: grn.invoiceFileName, data: grn.invoiceFile });
          }
        });
        
        if (uploadedFiles.length === 0) {
          return <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No files</span>;
        }
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {uploadedFiles.map((file, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ 
                  fontSize: '10px', 
                  padding: '2px 6px', 
                  borderRadius: '3px',
                  backgroundColor: file.type === 'SJ' ? '#e3f2fd' : '#fff3e0',
                  color: file.type === 'SJ' ? '#1976d2' : '#f57c00',
                  fontWeight: '600'
                }}>
                  {file.type}
                </span>
                <a
                  href={file.data}
                  download={file.name}
                  style={{ 
                    fontSize: '11px', 
                    color: '#1976d2',
                    textDecoration: 'none',
                    maxWidth: '150px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={file.name}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  📎 {file.name}
                </a>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      key: 'created',
      header: t('common.createdAt') || 'Created',
      render: (item: PurchaseOrder) => (
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {formatDateSimple(item.created)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions') || 'Actions',
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
  ], [t]);

  // Filter PENDING PR (exclude yang sudah punya PO)
  const pendingPRs = useMemo(() => {
    // Ensure purchaseRequests is always an array
    const prArray = Array.isArray(purchaseRequests) ? purchaseRequests : [];
    const ordersArray = Array.isArray(orders) ? orders : [];
    
    // Helper function untuk normalize string (trim, lowercase)
    const normalize = (str: string) => (str || '').toString().trim().toLowerCase();
    
    // Filter PR yang status PENDING dan belum punya PO
    return prArray.filter(pr => {
      // Skip jika status bukan PENDING
      if (pr.status !== 'PENDING') return false;
      
      // Cek apakah sudah ada PO untuk PR ini
      // Match berdasarkan sourcePRId (jika PO dibuat dari PR)
      const hasPOBySourcePRId = ordersArray.some(po => {
        const poSourcePRId = normalize(po.sourcePRId || '');
        const prId = normalize(pr.id || '');
        return poSourcePRId && prId && poSourcePRId === prId;
      });
      
      if (hasPOBySourcePRId) {
        return false;
      }
      
      // Match berdasarkan spkNo (jika PO dibuat manual dengan spkNo yang sama)
      // IMPORTANT: Cek per SPK, bukan per SO (karena 1 SO bisa punya banyak SPK dengan PR berbeda)
      const hasPOBySpkNo = ordersArray.some(po => {
        const poSpkNo = normalize(po.spkNo || '');
        const prSpkNo = normalize(pr.spkNo || '');
        return poSpkNo && prSpkNo && poSpkNo === prSpkNo;
      });
      
      if (hasPOBySpkNo) {
        return false;
      }
      
      // NOTE: TIDAK boleh filter berdasarkan soNo karena terlalu luas!
      // 1 SO bisa punya banyak SPK dengan PR berbeda, jadi jika ada PO untuk 1 SPK,
      // PR untuk SPK lain dengan SO yang sama tidak boleh di-exclude
      // Filter berdasarkan soNo dihapus untuk mencegah PR hilang salah
      
      // PR masih pending dan belum punya PO
      return true;
    });
  }, [purchaseRequests, orders]);

  // Transform pendingPRs into notification format
  const prNotifications = useMemo(() => {
    return pendingPRs.map((pr) => ({
      id: pr.id,
      title: `Purchase Request ${pr.prNo}`,
      message: `SPK: ${pr.spkNo} | SO: ${pr.soNo} | Customer: ${pr.customer}`,
      timestamp: pr.created,
      pr: pr,
    }));
  }, [pendingPRs]);

  // Handle create PO from PR
  const handleCreatePOFromPR = async (pr: PurchaseRequest) => {
    setSelectedPR(pr);
  };

  const generatePRHtmlContent = async (pr: PurchaseRequest) => {
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

  const handleViewPR = async (pr: PurchaseRequest) => {
    try {
      const html = await generatePRHtmlContent(pr);
      setViewPRPdfData({ html, prNo: pr.prNo });
    } catch (error: any) {
      toast.error(`Error generating PR preview: ${error.message}`);
    }
  };

  const handleSavePRToPDF = async () => {
    if (!viewPRPdfData) return;

    try {
      const electronAPI = (window as any).electronAPI;
      const fileName = `${viewPRPdfData.prNo}.pdf`;

      // Check if Electron API is available (for file picker)
      if (electronAPI && typeof electronAPI.savePdf === 'function') {
        // Electron: Use file picker to select save location, then convert HTML to PDF and save
        const result = await electronAPI.savePdf(viewPRPdfData.html, fileName);
        if (result.success) {
          toast.success(`PDF saved successfully to:\n${result.path}`);
          setViewPRPdfData(null);
        } else if (!result.canceled) {
          toast.error(`Error saving PDF: ${result.error || 'Unknown error'}`);
        }
        // If canceled, do nothing (user closed dialog)
      } else {
        // Browser: Open print dialog, user can select "Save as PDF"
        openPrintWindow(viewPRPdfData.html);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message || 'Unknown error'}`);
    }
  };

  const handleApprovePR = async (pr: PurchaseRequest, selectedSuppliers: { [key: string]: string }, paymentTerms: string, topDays: number) => {
    try {
      const newPOs: PurchaseOrder[] = [];
      
      // Jika COD atau CBD, topDays harus 0
      const finalTopDays = (paymentTerms === 'COD' || paymentTerms === 'CBD') ? 0 : (topDays || 30);
      
      for (const item of pr.items) {
        const materialId = getMaterialId(item);
        const supplierName = selectedSuppliers[materialId] || item.supplier;
        if (!supplierName) {
          toast.warning(`Supplier belum dipilih untuk material: ${item.materialName}`);
          return;
        }

        // Re-load price dari master material jika price = 0
        let itemPrice = item.price;
        if (!itemPrice || itemPrice === 0) {
          const material = findMaterialById(getMaterialId(item));
          if (material) {
            itemPrice = material.priceMtr || material.harga || (material as any).hargaSales || 0;
          }
        }

        // Generate random PO number
        const now = new Date();
        const year = String(now.getFullYear()).slice(-2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const randomCode = Math.random().toString(36).substr(2, 5).toUpperCase();
        const poNo = `PO-${year}${month}${day}-${randomCode}`;
        const newPO: PurchaseOrder = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          poNo,
          supplier: supplierName,
          soNo: pr.soNo,
          spkNo: pr.spkNo,
          sourcePRId: pr.id,
          purchaseReason: '',
          materialItem: item.materialName,
          material_id: getMaterialId(item),
          materialId: getMaterialId(item), // Backward compatibility
          qty: item.qty,
          price: Math.ceil(itemPrice),
          total: Math.ceil(item.qty * Math.ceil(itemPrice)),
          paymentTerms: paymentTerms as any,
          topDays: finalTopDays,
          status: 'OPEN',
          receiptDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          created: new Date().toISOString(),
        };
        newPOs.push(newPO);
      }

      // Save POs
      const ordersArray = Array.isArray(orders) ? orders : [];
      const updatedOrders = [...ordersArray, ...newPOs];
      await storageService.set(StorageKeys.PACKAGING.PURCHASE_ORDERS, updatedOrders);
      setOrders(updatedOrders);

      // Update PR status to PO_CREATED
      const prArray = Array.isArray(purchaseRequests) ? purchaseRequests : [];
      const updatedPRs = prArray.map(p => 
        p.id === pr.id ? { ...p, status: 'PO_CREATED' as const } : p
      );
      await storageService.set(StorageKeys.PACKAGING.PURCHASE_REQUESTS, updatedPRs);
      setPurchaseRequests(updatedPRs);

      // Show success toast (non-blocking, auto-dismiss)
      toast.success(`✅ ${newPOs.length} PO created from PR ${pr.prNo}`, { duration: 3000 });
      
      // Close dialog and reload orders
      setSelectedPR(null);
      loadOrders();
      // NOTE: Don't call loadPurchaseRequests() - it causes message loop!
      // PR state already updated above, no need to reload
    } catch (error: any) {
      toast.error(`Error creating PO from PR: ${error.message}`, { duration: 3000 });
    }
  };

  // Merge PO: Validasi apakah PO yang sudah ada bisa di-merge (material sama dan supplier sama)
  const validateMergeablePOs = (poIds: string[]): { valid: boolean; error?: string; mergeableGroups?: any[] } => {
    if (poIds.length < 2) {
      return { valid: false, error: 'Minimal pilih 2 PO untuk di-merge' };
    }

    const selectedPOs = orders.filter(po => poIds.includes(po.id));
    
    // Filter hanya PO dengan status OPEN (yang belum CLOSE)
    const openPOs = selectedPOs.filter(po => po.status === 'OPEN');
    if (openPOs.length < 2) {
      return { valid: false, error: 'Minimal 2 PO dengan status OPEN untuk di-merge' };
    }

    // Helper untuk normalize material ID
    const normalizeMaterialId = (id: string | undefined): string => {
      return (id || '').toString().trim().toLowerCase();
    };

    // Helper untuk normalize supplier
    const normalizeSupplier = (supplier: string | undefined): string => {
      return (supplier || '').toString().trim().toLowerCase();
    };

    // Group PO berdasarkan materialId dan supplier
    const groups: { [key: string]: PurchaseOrder[] } = {};
    
    openPOs.forEach(po => {
      const materialId = normalizeMaterialId(po.materialId);
      const supplier = normalizeSupplier(po.supplier);
      const key = `${materialId}_${supplier}`;
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(po);
    });

    // Cek apakah ada group yang bisa di-merge (minimal 2 PO)
    const mergeableGroups: any[] = [];
    Object.entries(groups).forEach(([key, pos]) => {
      if (pos.length >= 2) {
        const [materialId, supplier] = key.split('_');
        const material = materials.find(m => 
          normalizeMaterialId(m.material_id || m.kode) === materialId
        );
        
        mergeableGroups.push({
          key,
          materialId: pos[0].materialId,
          materialName: pos[0].materialItem || material?.nama || materialId,
          supplier: pos[0].supplier,
          pos: pos.map(po => ({
            id: po.id,
            poNo: po.poNo,
            spkNo: po.spkNo,
            soNo: po.soNo,
            qty: po.qty,
            price: po.price,
            total: po.total,
          })),
          totalQty: pos.reduce((sum, po) => sum + (po.qty || 0), 0),
          totalAmount: pos.reduce((sum, po) => sum + (po.total || 0), 0),
          avgPrice: pos.reduce((sum, po) => sum + (po.price || 0), 0) / pos.length,
        });
      }
    });

    if (mergeableGroups.length === 0) {
      return { 
        valid: false, 
        error: 'Tidak ada PO yang bisa di-merge. Pastikan PO memiliki material dan supplier yang sama, dan status OPEN.' 
      };
    }

    return { valid: true, mergeableGroups };
  };

  // Handle merge PO dari multiple PO yang sudah ada
  const handleMergePO = async () => {
    try {
      if (selectedPOsForMerge.length < 2) {
        toast.warning('Minimal pilih 2 PO untuk di-merge');
        return;
      }

      const validation = validateMergeablePOs(selectedPOsForMerge);
      if (!validation.valid) {
        toast.warning(validation.error || 'Validasi merge gagal');
        return;
      }

      if (!validation.mergeableGroups || validation.mergeableGroups.length === 0) {
        toast.warning('Tidak ada PO yang bisa di-merge');
        return;
      }

      // Untuk setiap group yang bisa di-merge, buat 1 PO baru dan hapus PO lama
      const newPOs: PurchaseOrder[] = [];
      const poIdsToDelete: string[] = [];

      for (const group of validation.mergeableGroups) {
        // Generate PO number baru
        const now = new Date();
        const year = String(now.getFullYear()).slice(-2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const randomCode = Math.random().toString(36).substr(2, 5).toUpperCase();
        const poNo = `PO-${year}${month}${day}-${randomCode}`;

        // Get first PO for reference data
        const firstPO = orders.find(po => po.id === group.pos[0].id);
        if (!firstPO) continue;

        // Calculate average price
        const finalPrice = Math.ceil(group.avgPrice);

        // Combine SPK numbers
        const combinedSpkNo = group.pos
          .map((p: any) => p.spkNo)
          .filter((spk: string) => spk)
          .join(', ');

        // Combine SO numbers
        const combinedSoNo = Array.from(new Set(group.pos.map((p: any) => p.soNo).filter((so: string) => so))).join(', ');

        const mergedPO: PurchaseOrder = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          poNo,
          supplier: group.supplier,
          soNo: combinedSoNo || firstPO.soNo,
          spkNo: combinedSpkNo || firstPO.spkNo,
          sourcePRId: firstPO.sourcePRId, // Keep original PR ID if exists
          purchaseReason: `Merged from ${group.pos.length} POs: ${group.pos.map((p: any) => p.poNo).join(', ')}`,
          materialItem: group.materialName,
          materialId: group.materialId,
          qty: group.totalQty,
          price: finalPrice,
          total: group.totalAmount,
          paymentTerms: firstPO.paymentTerms,
          topDays: firstPO.topDays,
          status: 'OPEN',
          receiptDate: firstPO.receiptDate,
          created: new Date().toISOString(),
        };

        newPOs.push(mergedPO);
        
        // Mark PO untuk dihapus
        group.pos.forEach((po: any) => {
          if (!poIdsToDelete.includes(po.id)) {
            poIdsToDelete.push(po.id);
          }
        });
      }

      if (newPOs.length === 0) {
        toast.error('Tidak ada PO yang berhasil dibuat');
        return;
      }

      // Delete PO lama menggunakan tombstone pattern (prevent data resurrection)
      const deleteResults = await deletePackagingItems('purchaseOrders', poIdsToDelete, 'id');
      
      if (deleteResults.failed > 0) {
        showAlert(`Warning: ${deleteResults.failed} PO gagal dihapus. ${deleteResults.success} PO berhasil dihapus.`, 'Warning');
      }
      
      // Tambahkan PO baru (setelah tombstone deletion)
      const currentOrders = await storageService.get<PurchaseOrder[]>('purchaseOrders') || [];
      const activeOrders = filterActiveItems(currentOrders);
      const updatedOrders = [...activeOrders, ...newPOs];
      
      await storageService.set(StorageKeys.PACKAGING.PURCHASE_ORDERS, updatedOrders);
      
      // Update state dengan filtered active items (exclude tombstones)
      setOrders(filterActiveItems(updatedOrders));

      showAlert(
        `PO berhasil di-merge!\n\n${newPOs.length} Purchase Order baru telah dibuat dari ${poIdsToDelete.length} PO yang di-merge.`,
        'Success'
      );

      // Reset and close
      setSelectedPOsForMerge([]);
      setShowMergePODialog(false);
      loadOrders();
    } catch (error: any) {
      showAlert(`Error merging PO: ${error.message}`, 'Error');
    }
  };

  const handleDeletePO = async (item: PurchaseOrder) => {
    try {
      if (!item || !item.poNo) {
        showAlert('PO tidak valid. Mohon coba lagi.', 'Error');
        return;
      }
      
      // Validate item.id exists
      if (!item.id) {
        showAlert(`❌ Error: PO ${item.poNo} tidak memiliki ID. Tidak bisa dihapus.`, 'Error');
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
        `Hapus PO ${poNo}?\n\n⚠️ Data akan dihapus dengan aman (tombstone pattern) untuk mencegah auto-sync mengembalikan data.\n\nTindakan ini akan:\n• Menghapus PO dari daftar\n• Menghapus notifikasi Finance terkait\n• Mengembalikan PR ke status APPROVED (jika ada)\n\nPastikan tidak ada proses lanjutan untuk PO ini.`,
        async () => {
          try {
            // 🚀 FIX: Pakai packaging delete helper untuk konsistensi dan sync yang benar
            const deleteResult = await deletePackagingItem('purchaseOrders', item.id, 'id');
            
            if (!deleteResult.success) {
              showAlert(`❌ Error deleting PO ${poNo}: ${deleteResult.error || 'Unknown error'}`, 'Error');
              return;
            }
            
            // Reload orders dengan helper (handle race condition)
            await reloadPackagingData('purchaseOrders', setOrders);

          // Ensure purchaseRequests is always an array
          const prArray = Array.isArray(purchaseRequests) ? purchaseRequests : [];
          let updatedPRs = prArray;
          let prChanged = false;
          const normalizeId = (value: any) => (value || '').toString().trim();

          const revertPRStatus = (targetId: string) => {
            // Check against active orders (after tombstone deletion)
            const currentOrders = filterActiveItems(orders);
            const stillHasPO = currentOrders.some((po: PurchaseOrder) => normalizeId(po.sourcePRId) === targetId);
            if (stillHasPO) return;
            updatedPRs = prArray.map(pr => {
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
            const candidate = prArray.find(pr => pr.spkNo === item.spkNo && pr.status === 'PO_CREATED');
            if (candidate) {
              const candidateId = candidate.id;
              const currentOrders = filterActiveItems(orders);
              const stillHasPO = currentOrders.some((po: PurchaseOrder) => {
                if (normalizeId(po.sourcePRId) === candidateId) return true;
                return (po.spkNo || '').toString().trim() === (item.spkNo || '').toString().trim();
              });
              if (!stillHasPO) {
                updatedPRs = prArray.map(pr => pr.id === candidateId ? { ...pr, status: 'APPROVED' as const } : pr);
                prChanged = true;
              }
            }
          }

          if (prChanged) {
            await storageService.set(StorageKeys.PACKAGING.PURCHASE_REQUESTS, updatedPRs);
            setPurchaseRequests(updatedPRs);
          }

          const updatedFinanceNotif = financeNotifications.filter((notif: any) => (notif.poNo || '').toString().trim() !== poNo);
          if (updatedFinanceNotif.length !== financeNotifications.length) {
            await storageService.set(StorageKeys.PACKAGING.FINANCE_NOTIFICATIONS, updatedFinanceNotif);
            setFinanceNotifications(updatedFinanceNotif);
          }

            showAlert(`✅ PO ${poNo} berhasil dihapus dengan aman.\n\n🛡️ Data dilindungi dari auto-sync restoration.\n\nPR terkait sudah dikembalikan ke status APPROVED.`, 'Success');
          } catch (error: any) {
            showAlert(`❌ Error deleting PO: ${error.message}`, 'Error');
          }
        },
        () => {
        },
        'Safe Delete Confirmation'
      );
    } catch (error: any) {
      showAlert(`❌ Error: ${error.message}`, 'Error');
    }
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
          <Button variant="secondary" onClick={() => setShowMergePODialog(true)}>🔀 Merge PO</Button>
          <Button onClick={handleCreate}>+ Create PO</Button>
        </div>
      </div>

      {showForm && !editingItem && (
        <div className="dialog-overlay" onClick={() => {
          setShowForm(false);
          setFormData({
            supplier: '',
            soNo: '',
            materialItem: '',
            qty: 0,
            price: 0,
            total: 0,
            paymentTerms: 'TOP',
            topDays: 30,
            receiptDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          });
          setSupplierInputValue('');
          setMaterialInputValue('');
          setQtyInputValue('');
          setPriceInputValue('');
        }} style={{ zIndex: 10000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', width: '95%', maxHeight: '90vh', overflowY: 'auto', zIndex: 10001, borderRadius: '10px' }}>
            <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '14px 18px', borderRadius: '10px 10px 0 0', color: 'white' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                ➕ Create New Purchase Order
              </h2>
            </div>

            <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '0 0 10px 10px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Supplier *
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={getSupplierInputDisplayValue()}
                    onChange={(e) => {
                      handleSupplierInputChange(e.target.value);
                    }}
                    placeholder="-- Pilih Supplier --"
                    readOnly
                    onClick={() => setShowSupplierDialog(true)}
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
                    onClick={() => setShowSupplierDialog(true)}
                    style={{ fontSize: '12px', padding: '8px 16px' }}
                  >
                    Select
                  </Button>
                </div>
              </div>

              <Input
                label="SO No (Optional)"
                value={formData.soNo || ''}
                onChange={(v) => setFormData({ ...formData, soNo: v })}
              />

              <Input
                label="Reason Pembelian (jika tanpa SO/SPK)"
                value={formData.purchaseReason || ''}
                onChange={(v) => setFormData({ ...formData, purchaseReason: v })}
                placeholder="Contoh: Refill stock umum / sample R&D"
              />

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Material/Item *
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={getMaterialInputDisplayValue()}
                    placeholder="-- Pilih Material --"
                    readOnly
                    onClick={() => {
                      setMaterialDialogSearch('');
                      setShowMaterialDialog(true);
                    }}
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
                      setMaterialDialogSearch('');
                      setShowMaterialDialog(true);
                    }}
                    style={{ fontSize: '12px', padding: '8px 16px' }}
                  >
                    🔍
                  </Button>
                </div>
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
                    if (currentQty === 0 || currentQty === null || currentQty === undefined || String(currentQty) === '0') {
                      setQtyInputValue('');
                      input.value = '';
                    } else {
                      input.select();
                    }
                  }}
                  onChange={(e) => {
                    let val = e.target.value;
                    val = val.replace(/[^\d.,]/g, '');
                    const cleaned = removeLeadingZero(val);
                    setQtyInputValue(cleaned);
                    const qty = cleaned === '' ? 0 : Number(cleaned) || 0;
                    const total = Math.ceil(qty * (formData.price || 0));
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
                      const total = Math.ceil(qty * (formData.price || 0));
                      setFormData({
                        ...formData,
                        qty,
                        total,
                      });
                      setQtyInputValue('');
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
                    if (currentPrice === 0 || currentPrice === null || currentPrice === undefined || String(currentPrice) === '0') {
                      setPriceInputValue('');
                      input.value = '';
                    } else {
                      input.select();
                    }
                  }}
                  onChange={(e) => {
                    let val = e.target.value;
                    val = val.replace(/[^\d.,]/g, '');
                    const cleaned = removeLeadingZero(val);
                    setPriceInputValue(cleaned);
                    const price = cleaned === '' ? 0 : Math.ceil(Number(cleaned) || 0);
                    const total = Math.ceil((formData.qty || 0) * price);
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
                      const price = Math.ceil(Number(val));
                      const total = Math.ceil((formData.qty || 0) * price);
                      setFormData({
                        ...formData,
                        price,
                        total,
                      });
                      setPriceInputValue('');
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
                  Total: Rp {Math.ceil((formData.qty || 0) * (formData.price || 0)).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                </label>
              </div>

              <Input
                label="Quality"
                value={formData.quality || ''}
                onChange={(v) => setFormData({ ...formData, quality: v })}
                placeholder="Quality"
              />

              <Input
                label="Score"
                value={formData.score !== undefined && formData.score !== null ? String(formData.score) : ''}
                onChange={(v) => setFormData({ ...formData, score: v === '' ? '' : (isNaN(Number(v)) ? v : Number(v)) })}
                placeholder="Score"
              />

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

              <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <Button 
                  onClick={() => { 
                    setShowForm(false); 
                    setMaterialInputValue('');
                    setSupplierInputValue('');
                    setQtyInputValue('');
                    setPriceInputValue('');
                    setFormData({ 
                      supplier: '', 
                      soNo: '', 
                      materialItem: '', 
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
                  }} 
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} variant="primary">
                  Save PO
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Card style={{ position: 'sticky', top: 0, zIndex: 100, marginBottom: '16px' }}>
        <div className="tab-container">
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
            Outstanding ({(Array.isArray(orders) ? orders : []).filter(o => o.status === 'OPEN').length})
          </button>
        </div>
        <div className="tab-content">
          <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px', minWidth: '200px' }}>
              <Input
                label="Search & Filter"
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by PO No, Supplier, SO No, SPK No, Material, Status..."
              />
            </div>
            <div style={{ flex: '1 1 400px', minWidth: '300px' }}>
              <DateRangeFilter
                onDateChange={(from, to) => {
                  setDateFrom(from);
                  setDateTo(to);
                }}
                defaultFrom={dateFrom}
                defaultTo={dateTo}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Button
                variant={viewMode === 'table' ? 'primary' : 'secondary'}
                onClick={() => setViewMode('table')}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                📊 Table
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'primary' : 'secondary'}
                onClick={() => setViewMode('cards')}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                🃏 Cards
              </Button>
            </div>
          </div>
          {viewMode === 'table' ? (
          <>
          <Table 
            columns={columns} 
            data={filteredOrders.slice((tableCurrentPage - 1) * itemsPerPage, tableCurrentPage * itemsPerPage)}
            emptyMessage={activeTab === 'outstanding' ? 'No outstanding purchase orders' : (searchQuery ? "No PO data found matching your search" : "No PO data")}
            getRowStyle={(item: PurchaseOrder) => ({
              backgroundColor: getRowColor(item.soNo),
            })}
          />
          
          {/* Pagination Controls untuk Table View */}
          {filteredOrders.length > itemsPerPage && (
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
                onClick={() => setTableCurrentPage(Math.max(1, tableCurrentPage - 1))}
                disabled={tableCurrentPage === 1}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                ← Previous
              </Button>
              
              {(() => {
                const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
                const pages: (number | string)[] = [];
                if (totalPages <= 5) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                  pages.push(1);
                  if (tableCurrentPage > 3) pages.push('...');
                  
                  const startPage = Math.max(2, tableCurrentPage - 1);
                  const endPage = Math.min(totalPages - 1, tableCurrentPage + 1);
                  
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(i);
                  }
                  
                  if (tableCurrentPage < totalPages - 2) pages.push('...');
                  pages.push(totalPages);
                }
                
                return pages.map((page, idx) => (
                  <button
                    key={idx}
                    onClick={() => typeof page === 'number' && setTableCurrentPage(page)}
                    disabled={page === '...'}
                    style={{
                      padding: '6px 10px',
                      border: page === tableCurrentPage ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                      backgroundColor: page === tableCurrentPage ? 'var(--primary-color)' : 'var(--bg-primary)',
                      color: page === tableCurrentPage ? '#fff' : 'var(--text-primary)',
                      borderRadius: '4px',
                      cursor: page === '...' ? 'default' : 'pointer',
                      fontSize: '12px',
                      fontWeight: page === tableCurrentPage ? '600' : '400',
                      opacity: page === '...' ? 0.5 : 1,
                    }}
                  >
                    {page}
                  </button>
                ));
              })()}
              
              <Button
                variant="secondary"
                onClick={() => setTableCurrentPage(Math.min(Math.ceil(filteredOrders.length / itemsPerPage), tableCurrentPage + 1))}
                disabled={tableCurrentPage >= Math.ceil(filteredOrders.length / itemsPerPage)}
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
            Page {tableCurrentPage} of {Math.ceil(filteredOrders.length / itemsPerPage)} ({filteredOrders.length} total)
          </div>
          </>
          ) : (
          <>
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {filteredOrders.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px', 
                color: 'var(--text-secondary)' 
              }}>
                {activeTab === 'outstanding' ? 'No outstanding purchase orders' : (searchQuery ? "No PO data found matching your search" : "No PO data")}
              </div>
            ) : (
              (() => {
                // Pagination untuk card view
                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
                
                return paginatedOrders.map((item: PurchaseOrder, idx: number) => {
                const relatedSPKs = spkData.filter((spk: any) => 
                  (spk.soNo || '').toString().trim() === (item.soNo || '').toString().trim()
                );
                const hasGRN = (Array.isArray(grnList) && grnList.some((grn: any) => grn && grn.poNo === item.poNo)) || false;
                const hasPendingFinance = (Array.isArray(financeNotifications) && financeNotifications.some((notif: any) => {
                  if (!notif) return false;
                  const notifPo = (notif.poNo || '').toString().trim();
                  const currentPo = (item.poNo || '').toString().trim();
                  return (
                    notif.type === 'SUPPLIER_PAYMENT' &&
                    notifPo !== '' &&
                    notifPo === currentPo &&
                    (notif.status || 'PENDING').toUpperCase() !== 'CLOSE'
                  );
                })) || false;
                
                // Warna selang-seling untuk PO card - lebih jelas perbedaannya
                const cardBgColors = [
                  'var(--bg-primary)', // Default
                  'rgba(33, 150, 243, 0.25)', // Light blue - lebih jelas
                  'rgba(76, 175, 80, 0.25)', // Light green - lebih jelas
                  'rgba(255, 152, 0, 0.25)', // Light orange - lebih jelas
                  'rgba(156, 39, 176, 0.25)', // Light purple - lebih jelas
                ];
                const cardBgColor = cardBgColors[idx % cardBgColors.length];
                
                return (
                  <div
                    key={item.id}
                    style={{
                      backgroundColor: cardBgColor,
                      borderRadius: '8px',
                      padding: '1px',
                    }}
                  >
                    <Card>
                      {/* PO Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>PO No</div>
                          <div style={{ fontSize: '20px', fontWeight: 600 }}>{item.poNo}</div>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.supplier}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span className={`status-badge status-${item.status.toLowerCase()}`} style={{ fontSize: '12px' }}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    
                      {/* Material Info - Compact */}
                      <div style={{ 
                        padding: '6px',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '4px',
                        fontSize: '10px',
                        border: '1px solid var(--border-color)',
                        marginTop: '8px',
                      }}>
                        <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Material</div>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-primary)', wordBreak: 'break-word', lineHeight: '1.3', marginBottom: '4px' }}>
                          {item.materialItem}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', fontSize: '9px', color: 'var(--text-secondary)' }}>
                          <div><strong>Qty:</strong> {item.qty}</div>
                          <div><strong>Price:</strong> Rp {Math.ceil(item.price).toLocaleString('id-ID')}</div>
                          <div><strong>Total:</strong> Rp {Math.ceil(item.total).toLocaleString('id-ID')}</div>
                        </div>
                        {item.purchaseReason && (
                          <div style={{ marginTop: '4px', fontSize: '9px', color: 'var(--text-secondary)', wordBreak: 'break-word' }}>
                            <strong>Reason:</strong> {item.purchaseReason}
                          </div>
                        )}
                      </div>
                      
                      {/* Related SPKs - Compact */}
                      {relatedSPKs.length > 0 && (
                        <div style={{ 
                          padding: '6px',
                          backgroundColor: 'var(--bg-secondary)',
                          borderRadius: '4px',
                          fontSize: '10px',
                          border: '1px solid var(--border-color)',
                          marginTop: '8px',
                        }}>
                          <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            Related SPKs ({relatedSPKs.length})
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {relatedSPKs.slice(0, 3).map((spk: any, spkIdx: number) => (
                              <div key={spk.id || spkIdx} style={{ 
                                padding: '3px 6px',
                                backgroundColor: 'var(--bg-primary)',
                                borderRadius: '4px',
                                border: '1px solid var(--border-color)',
                                fontSize: '9px',
                              }}>
                                <div style={{ fontWeight: 'bold', color: '#1976d2' }}>{spk.spkNo}</div>
                                <div style={{ fontSize: '8px', color: 'var(--text-secondary)' }}>{spk.product}</div>
                              </div>
                            ))}
                            {relatedSPKs.length > 3 && (
                              <div style={{ 
                                padding: '3px 6px',
                                fontSize: '9px',
                                color: 'var(--text-secondary)',
                                alignSelf: 'center',
                              }}>
                                +{relatedSPKs.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Invoice Numbers - Compact */}
                      {(() => {
                        const grnPackagingRecords = Array.isArray(grnList) ? grnList : [];
                        const grnsForPO = grnPackagingRecords.filter((grn: any) => {
                          const grnPO = (grn.poNo || '').toString().trim();
                          const currentPO = (item.poNo || '').toString().trim();
                          return grnPO === currentPO;
                        });
                        
                        // Collect all invoice numbers from GRNs
                        const invoiceNumbers = grnsForPO
                          .map((grn: any) => grn.invoiceNo)
                          .filter((inv: string) => inv && inv.trim());
                        
                        if (invoiceNumbers.length === 0) return null;
                        
                        return (
                          <div style={{ 
                            padding: '6px',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: '4px',
                            fontSize: '10px',
                            border: '1px solid var(--border-color)',
                            marginTop: '8px',
                          }}>
                            <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600' }}>
                              🧾 Invoice Number(s)
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {invoiceNumbers.map((invNo: string, idx: number) => (
                                <span key={idx} style={{ 
                                  fontSize: '11px', 
                                  padding: '3px 8px', 
                                  borderRadius: '4px',
                                  backgroundColor: 'var(--bg-primary)',
                                  color: 'var(--text-primary)',
                                  fontWeight: '600',
                                  border: '1px solid var(--border-color)'
                                }}>
                                  {invNo}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* Uploaded Files - Compact */}
                      {(() => {
                        const grnPackagingRecords = Array.isArray(grnList) ? grnList : [];
                        const grnsForPO = grnPackagingRecords.filter((grn: any) => {
                          const grnPO = (grn.poNo || '').toString().trim();
                          const currentPO = (item.poNo || '').toString().trim();
                          return grnPO === currentPO;
                        });
                        
                        // Collect all uploaded files from GRNs
                        const uploadedFiles: Array<{ type: string; name: string; data: string; invoiceNo?: string }> = [];
                        grnsForPO.forEach((grn: any) => {
                          if (grn.suratJalan && grn.suratJalanName) {
                            uploadedFiles.push({ type: 'SJ', name: grn.suratJalanName, data: grn.suratJalan });
                          }
                          if (grn.invoiceFile && grn.invoiceFileName) {
                            uploadedFiles.push({ 
                              type: 'INV', 
                              name: grn.invoiceFileName, 
                              data: grn.invoiceFile,
                              invoiceNo: grn.invoiceNo || undefined
                            });
                          }
                        });
                        
                        if (uploadedFiles.length === 0) return null;
                        
                        return (
                          <div style={{ 
                            padding: '6px',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: '4px',
                            fontSize: '10px',
                            border: '1px solid var(--border-color)',
                            marginTop: '8px',
                          }}>
                            <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600' }}>
                              📎 Uploaded Files ({uploadedFiles.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {uploadedFiles.map((file, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{ 
                                    fontSize: '9px', 
                                    padding: '2px 6px', 
                                    borderRadius: '3px',
                                    backgroundColor: file.type === 'SJ' ? '#e3f2fd' : '#fff3e0',
                                    color: file.type === 'SJ' ? '#1976d2' : '#f57c00',
                                    fontWeight: '700',
                                    minWidth: '30px',
                                    textAlign: 'center'
                                  }}>
                                    {file.type}
                                  </span>
                                  <a
                                    href={file.data}
                                    download={file.name}
                                    style={{ 
                                      fontSize: '10px', 
                                      color: '#1976d2',
                                      textDecoration: 'none',
                                      flex: 1,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      fontWeight: '500'
                                    }}
                                    title={file.name}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                    }}
                                  >
                                    {file.name}
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* Payment Info - Compact */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        fontSize: '9px',
                        color: 'var(--text-secondary)',
                        paddingTop: '6px',
                        borderTop: '1px solid var(--border-color)',
                        marginTop: '8px',
                      }}>
                        <div>
                          <strong>Payment:</strong> {item.paymentTerms}
                          {item.paymentTerms !== 'COD' && item.paymentTerms !== 'CBD' && item.topDays > 0 && (
                            <span> ({item.topDays} days)</span>
                          )}
                        </div>
                        {item.receiptDate && (
                          <div>
                            <strong>Received:</strong> {new Date(item.receiptDate).toLocaleDateString('id-ID')}
                          </div>
                        )}
                      </div>
                      
                      {/* Actions - Compact */}
                      <div style={{ 
                        display: 'flex',
                        gap: '4px',
                        flexWrap: 'wrap',
                        marginTop: '8px',
                      }}>
                        <Button 
                          variant="secondary" 
                          onClick={() => handleViewDetailPOSheet(item)} 
                          style={{ fontSize: '10px', padding: '4px 8px', minHeight: '24px' }}
                        >
                          View
                        </Button>
                        <Button 
                          variant="secondary" 
                          onClick={() => handleEdit(item)} 
                          style={{ fontSize: '10px', padding: '4px 8px', minHeight: '24px' }}
                        >
                          Edit
                        </Button>
                        {!hasGRN && item.status === 'OPEN' && (
                          <Button 
                            variant="primary" 
                            onClick={() => handleCreateGRN(item)} 
                            style={{ fontSize: '10px', padding: '4px 8px', minHeight: '24px' }}
                          >
                            Create GRN
                          </Button>
                        )}
                        {hasGRN && (
                          <Button 
                            variant="success" 
                            disabled
                            style={{ fontSize: '10px', padding: '4px 8px', minHeight: '24px', opacity: 0.7 }}
                          >
                            GRN✓
                          </Button>
                        )}
                        {hasPendingFinance && (
                          <Button 
                            variant="secondary" 
                            disabled
                            style={{ 
                              fontSize: '10px', 
                              padding: '4px 8px', 
                              minHeight: '24px', 
                              opacity: 0.7,
                              backgroundColor: 'var(--warning)',
                              color: '#fff'
                            }}
                          >
                            Finance
                          </Button>
                        )}
                      </div>
                    </Card>
                  </div>
                );
              })
              })()
            )}
          </div>
          
          {/* Pagination Controls untuk Card View */}
          {viewMode === 'cards' && filteredOrders.length > itemsPerPage && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '12px',
              marginTop: '20px',
              padding: '16px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)'
            }}>
              <Button
                variant="secondary"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                ← Prev
              </Button>
              
              <div style={{ 
                display: 'flex', 
                gap: '4px', 
                alignItems: 'center',
                flexWrap: 'wrap',
                justifyContent: 'center',
                maxWidth: '600px'
              }}>
                {(() => {
                  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
                  const pages: (number | string)[] = [];
                  
                  // Always show first page
                  pages.push(1);
                  
                  // Show ellipsis if needed
                  if (currentPage > 4) {
                    pages.push('...');
                  }
                  
                  // Show pages around current
                  const startPage = Math.max(2, currentPage - 1);
                  const endPage = Math.min(totalPages - 1, currentPage + 1);
                  
                  for (let i = startPage; i <= endPage; i++) {
                    if (i !== 1 && i !== totalPages) {
                      pages.push(i);
                    }
                  }
                  
                  // Show ellipsis if needed
                  if (currentPage < totalPages - 3) {
                    pages.push('...');
                  }
                  
                  // Always show last page
                  if (totalPages > 1) {
                    pages.push(totalPages);
                  }
                  
                  // Remove duplicates
                  const uniquePages = Array.from(new Set(pages));
                  
                  return uniquePages.map((page, idx) => {
                    if (page === '...') {
                      return (
                        <span key={`ellipsis-${idx}`} style={{ color: 'var(--text-secondary)', padding: '0 4px' }}>
                          ...
                        </span>
                      );
                    }
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'primary' : 'secondary'}
                        onClick={() => setCurrentPage(page as number)}
                        style={{ 
                          fontSize: '11px', 
                          padding: '4px 8px',
                          minWidth: '32px'
                        }}
                      >
                        {page}
                      </Button>
                    );
                  });
                })()}
              </div>
              
              <div style={{ 
                fontSize: '12px', 
                color: 'var(--text-secondary)',
                padding: '0 8px'
              }}>
                Page {currentPage} of {Math.ceil(filteredOrders.length / itemsPerPage)} 
                ({filteredOrders.length} total)
              </div>
              
              <Button
                variant="secondary"
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredOrders.length / itemsPerPage), prev + 1))}
                disabled={currentPage >= Math.ceil(filteredOrders.length / itemsPerPage)}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                Next →
              </Button>
          </div>
          )}
          </>
          )}
        </div>
      </Card>

      {/* PR Approval Dialog */}
      {selectedPR && (
        <PRApprovalDialog
          pr={selectedPR}
          suppliers={suppliers}
          materials={materials}
          onClose={() => setSelectedPR(null)}
          onApprove={handleApprovePR}
          onViewPR={handleViewPR}
        />
      )}

      {/* Merge PO Dialog */}
      {showMergePODialog && (
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
          zIndex: 10000,
        }} onClick={() => setShowMergePODialog(false)}>
          <Card 
            title="Merge Purchase Order" 
            style={{ 
              width: '90%', 
              maxWidth: '800px', 
              maxHeight: '90vh',
              overflow: 'auto',
              zIndex: 10001,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              Pilih PO yang sudah ada untuk di-merge menjadi 1 PO. PO hanya bisa di-merge jika memiliki material dan supplier yang sama, dan status OPEN.
            </div>

            <div style={{ marginBottom: '16px', maxHeight: '400px', overflowY: 'auto' }}>
              {(() => {
                // Filter PO yang bisa di-merge (status OPEN)
                const mergeablePOs = orders.filter(po => po.status === 'OPEN');
                
                if (mergeablePOs.length === 0) {
                  return (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Tidak ada PO dengan status OPEN yang bisa di-merge
                    </div>
                  );
                }

                return (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                        <th style={{ padding: '8px', textAlign: 'left', width: '40px' }}>
                          <input
                            type="checkbox"
                            checked={selectedPOsForMerge.length === mergeablePOs.length && mergeablePOs.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPOsForMerge(mergeablePOs.map(po => po.id));
                              } else {
                                setSelectedPOsForMerge([]);
                              }
                            }}
                          />
                        </th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>PO No</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>SPK No</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Material</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Supplier</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Qty</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Price</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mergeablePOs.map((po) => {
                        const isSelected = selectedPOsForMerge.includes(po.id);
                        return (
                          <tr 
                            key={po.id}
                            style={{ 
                              borderBottom: '1px solid var(--border-color)',
                              backgroundColor: isSelected ? 'var(--bg-hover)' : 'transparent',
                              cursor: 'pointer',
                            }}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedPOsForMerge(selectedPOsForMerge.filter(id => id !== po.id));
                              } else {
                                setSelectedPOsForMerge([...selectedPOsForMerge, po.id]);
                              }
                            }}
                          >
                            <td style={{ padding: '8px' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  if (e.target.checked) {
                                    setSelectedPOsForMerge([...selectedPOsForMerge, po.id]);
                                  } else {
                                    setSelectedPOsForMerge(selectedPOsForMerge.filter(id => id !== po.id));
                                  }
                                }}
                              />
                            </td>
                            <td style={{ padding: '8px' }}>{po.poNo}</td>
                            <td style={{ padding: '8px' }}>{po.spkNo || '-'}</td>
                            <td style={{ padding: '8px' }}>{po.materialItem}</td>
                            <td style={{ padding: '8px' }}>{po.supplier}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{po.qty}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>
                              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(po.price)}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>
                              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(po.total)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            {selectedPOsForMerge.length > 0 && (
              <div style={{ 
                marginBottom: '16px', 
                padding: '12px', 
                backgroundColor: 'var(--bg-secondary)', 
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                  Preview Merge ({selectedPOsForMerge.length} PO selected):
                </div>
                {(() => {
                  const validation = validateMergeablePOs(selectedPOsForMerge);
                  if (!validation.valid) {
                    return (
                      <div style={{ color: 'var(--error)', fontSize: '14px' }}>
                        ⚠️ {validation.error}
                      </div>
                    );
                  }
                  if (validation.mergeableGroups) {
                    return (
                      <div>
                        {validation.mergeableGroups.map((group: any, idx: number) => (
                          <div key={idx} style={{ marginBottom: '8px', fontSize: '14px' }}>
                            <div style={{ fontWeight: '500' }}>
                              Group {idx + 1}: {group.materialName} - {group.supplier}
                            </div>
                            <div style={{ marginLeft: '16px', color: 'var(--text-secondary)' }}>
                              {group.pos.length} PO → Total Qty: {group.totalQty} → 
                              Total: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(group.totalAmount)}
                            </div>
                            <div style={{ marginLeft: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                              PO yang akan dihapus: {group.pos.map((p: any) => p.poNo).join(', ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button 
                variant="secondary" 
                onClick={() => {
                  setShowMergePODialog(false);
                  setSelectedPOsForMerge([]);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleMergePO}
                disabled={selectedPOsForMerge.length < 2}
              >
                Merge PO ({selectedPOsForMerge.length} selected)
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Receipt/GRN Dialog */}
      {selectedPOForReceipt && (
        <ReceiptDialog
          po={selectedPOForReceipt}
          onClose={() => setSelectedPOForReceipt(null)}
          onSave={handleSaveReceipt}
        />
      )}

      {/* PDF Preview Dialog untuk PO */}
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

      {/* Edit PO Dialog - Using same form as Create */}
      {showForm && editingItem && (
        <div className="dialog-overlay" onClick={() => {
          setShowForm(false);
          setEditingItem(null);
          setEditFormData({});
          setEditSupplierInputValue('');
          setEditMaterialInputValue('');
          setEditQtyInputValue('');
          setEditPriceInputValue('');
        }} style={{ zIndex: 10000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', width: '95%', maxHeight: '90vh', overflowY: 'auto', zIndex: 10001, borderRadius: '10px' }}>
            <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '14px 18px', borderRadius: '10px 10px 0 0', color: 'white' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                ✏️ Edit Purchase Order: {editingItem.poNo}
              </h2>
            </div>

            <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '0 0 10px 10px' }}>
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
                <div><strong>PO No:</strong> {editingItem.poNo}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Status: {editingItem.status} | Created: {new Date(editingItem.created).toLocaleDateString('id-ID')}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Supplier *
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={editSupplierInputValue || (editFormData.supplier ? `${suppliers.find(s => s.nama === editFormData.supplier)?.kode || ''} - ${editFormData.supplier}` : '')}
                    onChange={(e) => {
                      setEditSupplierInputValue(e.target.value);
                      const normalized = e.target.value.toLowerCase();
                      const matched = suppliers.find(s => {
                        const label = `${s.kode || ''}${s.kode ? ' - ' : ''}${s.nama || ''}`.toLowerCase();
                        return label === normalized || (s.kode || '').toLowerCase() === normalized || (s.nama || '').toLowerCase() === normalized;
                      });
                      if (matched) {
                        setEditFormData({ ...editFormData, supplier: matched.nama });
                      }
                    }}
                    placeholder="-- Pilih Supplier --"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>

              <Input
                label="SO No (Linked - Cannot Edit)"
                value={editFormData.soNo || ''}
                onChange={(v) => setEditFormData({ ...editFormData, soNo: v })}
                disabled={true}
              />

              <Input
                label="Reason Pembelian (jika tanpa SO/SPK)"
                value={editFormData.purchaseReason || ''}
                onChange={(v) => setEditFormData({ ...editFormData, purchaseReason: v })}
                placeholder="Contoh: Refill stock umum / sample R&D"
              />

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Material/Item *
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={editMaterialInputValue || (editFormData.materialItem ? `${materials.find(m => m.nama === editFormData.materialItem)?.material_id || materials.find(m => m.nama === editFormData.materialItem)?.kode || ''} - ${editFormData.materialItem}` : '')}
                    onChange={(e) => {
                      setEditMaterialInputValue(e.target.value);
                      const normalized = e.target.value.toLowerCase();
                      const matched = materials.find(m => {
                        const label = `${m.material_id || m.kode || ''}${m.material_id || m.kode ? ' - ' : ''}${m.nama || ''}`.toLowerCase();
                        return label === normalized || (m.material_id || m.kode || '').toLowerCase() === normalized || (m.nama || '').toLowerCase() === normalized;
                      });
                      if (matched) {
                        const materialPrice = matched.priceMtr || matched.harga || 0;
                        const roundedPrice = Math.ceil(materialPrice);
                        const roundedTotal = Math.ceil((editFormData.qty || 0) * roundedPrice);
                        setEditFormData({
                          ...editFormData,
                          materialItem: matched.nama,
                          price: roundedPrice,
                          total: roundedTotal,
                        });
                      }
                    }}
                    placeholder="-- Pilih Material --"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Qty *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={editQtyInputValue !== undefined && editQtyInputValue !== '' ? editQtyInputValue : (editFormData.qty !== undefined && editFormData.qty !== null && editFormData.qty !== 0 ? String(editFormData.qty) : '')}
                  onChange={(e) => {
                    let val = e.target.value;
                    val = val.replace(/[^\d.,]/g, '');
                    const cleaned = removeLeadingZero(val);
                    setEditQtyInputValue(cleaned);
                    const qty = cleaned === '' ? 0 : Number(cleaned) || 0;
                    const total = Math.ceil(qty * (editFormData.price || 0));
                    setEditFormData({
                      ...editFormData,
                      qty,
                      total,
                    });
                  }}
                  onBlur={(e) => {
                    const val = e.target.value;
                    if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                      setEditFormData({
                        ...editFormData,
                        qty: 0,
                        total: 0,
                      });
                      setEditQtyInputValue('');
                    } else {
                      const qty = Number(val);
                      const total = Math.ceil(qty * (editFormData.price || 0));
                      setEditFormData({
                        ...editFormData,
                        qty,
                        total,
                      });
                      setEditQtyInputValue('');
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
                  value={editPriceInputValue !== undefined && editPriceInputValue !== '' ? editPriceInputValue : (editFormData.price !== undefined && editFormData.price !== null && editFormData.price !== 0 ? String(Math.ceil(editFormData.price)) : '')}
                  onChange={(e) => {
                    let val = e.target.value;
                    val = val.replace(/[^\d.,]/g, '');
                    const cleaned = removeLeadingZero(val);
                    setEditPriceInputValue(cleaned);
                    const price = cleaned === '' ? 0 : Math.ceil(Number(cleaned) || 0);
                    const total = Math.ceil((editFormData.qty || 0) * price);
                    setEditFormData({
                      ...editFormData,
                      price,
                      total,
                    });
                  }}
                  onBlur={(e) => {
                    const val = e.target.value;
                    if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                      setEditFormData({
                        ...editFormData,
                        price: 0,
                        total: 0,
                      });
                      setEditPriceInputValue('');
                    } else {
                      const price = Math.ceil(Number(val));
                      const total = Math.ceil((editFormData.qty || 0) * price);
                      setEditFormData({
                        ...editFormData,
                        price,
                        total,
                      });
                      setEditPriceInputValue('');
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
                  Total: Rp {Math.ceil((editFormData.qty || 0) * (editFormData.price || 0)).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                </label>
              </div>

              <Input
                label="Quality"
                value={editFormData.quality || ''}
                onChange={(v) => setEditFormData({ ...editFormData, quality: v })}
                placeholder="Quality"
              />

              <Input
                label="Score"
                value={editFormData.score !== undefined && editFormData.score !== null ? String(editFormData.score) : ''}
                onChange={(v) => setEditFormData({ ...editFormData, score: v === '' ? '' : (isNaN(Number(v)) ? v : Number(v)) })}
                placeholder="Score"
              />

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Keterangan
                </label>
                <textarea
                  value={editFormData.keterangan || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, keterangan: e.target.value })}
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
                  value={editFormData.paymentTerms || 'TOP'}
                  onChange={(e) => {
                    const newPaymentTerms = e.target.value as any;
                    const newTopDays = (newPaymentTerms === 'COD' || newPaymentTerms === 'CBD') ? 0 : (editFormData.topDays || 30);
                    setEditFormData({ ...editFormData, paymentTerms: newPaymentTerms, topDays: newTopDays });
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

              {editFormData.paymentTerms === 'TOP' && (
                <Input
                  label="TOP Days"
                  type="number"
                  value={String(editFormData.topDays || 30)}
                  onChange={(v) => setEditFormData({ ...editFormData, topDays: Number(v) })}
                />
              )}

              <Input
                label="Receipt Date (Tanggal Penerimaan)"
                type="date"
                value={editFormData.receiptDate || ''}
                onChange={(v) => setEditFormData({ ...editFormData, receiptDate: v })}
              />

              <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <Button 
                  onClick={() => { 
                    setShowForm(false); 
                    setEditingItem(null);
                    setEditFormData({});
                    setEditSupplierInputValue('');
                    setEditMaterialInputValue('');
                    setEditQtyInputValue('');
                    setEditPriceInputValue('');
                  }} 
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} variant="primary">
                  Update PO
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Dialog untuk PR */}
      {viewPRPdfData && (
        <div className="dialog-overlay" onClick={() => setViewPRPdfData(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90%', width: '1200px', maxHeight: '90vh', overflow: 'auto' }}>
            <Card className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2>Preview PR - {viewPRPdfData.prNo}</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="primary" onClick={handleSavePRToPDF}>
                    💾 Save to PDF
                  </Button>
                  <Button variant="secondary" onClick={() => {
                    setViewPRPdfData(null);
                    closeDialog();
                  }}>
                    Close
                  </Button>
                </div>
              </div>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                <iframe
                  srcDoc={viewPRPdfData.html}
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
      
      {/* Supplier Selection Dialog */}
      {showSupplierDialog && (
        <div className="dialog-overlay" onClick={() => {
          setShowSupplierDialog(false);
          setSupplierDialogSearch('');
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <Card
              title="Select Supplier"
              className="dialog-card"
            >
              <div style={{ marginBottom: '16px' }}>
                <input
                  type="text"
                  value={supplierDialogSearch}
                  onChange={(e) => setSupplierDialogSearch(e.target.value)}
                  placeholder="Search by supplier code or name..."
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
                {filteredSuppliersForDialog.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No suppliers found
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-tertiary)', zIndex: 10 }}>
                      <tr>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid var(--border)' }}>Code</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid var(--border)' }}>Name</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid var(--border)' }}>Address</th>
                        <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid var(--border)' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSuppliersForDialog.map(supplier => {
                        const handleSelect = () => {
                          setFormData({ ...formData, supplier: supplier.nama });
                          setSupplierInputValue(`${supplier.kode} - ${supplier.nama}`);
                          setShowSupplierDialog(false);
                          setSupplierDialogSearch('');
                        };
                        return (
                          <tr
                            key={supplier.id || supplier.kode}
                            style={{
                              borderBottom: '1px solid var(--border)',
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            onClick={handleSelect}
                          >
                            <td style={{ padding: '12px' }}>{supplier.kode || '-'}</td>
                            <td style={{ padding: '12px' }}>{supplier.nama || '-'}</td>
                            <td style={{ padding: '12px' }}>{supplier.alamat || '-'}</td>
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
                  Showing {filteredSuppliersForDialog.length} of {supplierDialogSearch ? suppliers.filter(s => {
                    const query = supplierDialogSearch.toLowerCase();
                    const code = (s.kode || '').toLowerCase();
                    const name = (s.nama || '').toLowerCase();
                    return code.includes(query) || name.includes(query);
                  }).length : suppliers.length} supplier{filteredSuppliersForDialog.length !== 1 ? 's' : ''}
                  {filteredSuppliersForDialog.length >= 200 && (
                    <span style={{ color: '#ff9800', marginLeft: '8px' }}>
                      (Limited to 200. Use search to narrow down)
                    </span>
                  )}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowSupplierDialog(false);
                    setSupplierDialogSearch('');
                  }}
                >
                  Close
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Material Selection Dialog */}
      {showMaterialDialog && (
        <div className="dialog-overlay" onClick={() => {
          setShowMaterialDialog(false);
          setMaterialDialogSearch('');
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <Card
              title="Select Material"
              className="dialog-card"
            >
              <div style={{ marginBottom: '16px' }}>
                <input
                  type="text"
                  value={materialDialogSearch}
                  onChange={(e) => setMaterialDialogSearch(e.target.value)}
                  placeholder="Search by material code or name..."
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
                {filteredMaterialsForDialog.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No materials found
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
                      {filteredMaterialsForDialog.map(material => {
                        const price = material.priceMtr || material.harga || 0;
                        const handleSelect = () => {
                          const materialPrice = material.priceMtr || material.harga || 0;
                          const roundedPrice = Math.ceil(materialPrice);
                          const roundedTotal = Math.ceil((formData.qty || 0) * roundedPrice);
                          setFormData({
                            ...formData,
                            materialItem: material.nama,
                            price: roundedPrice,
                            total: roundedTotal,
                          });
                          setMaterialInputValue(`${material.material_id || material.kode} - ${material.nama}`);
                          setShowMaterialDialog(false);
                          setMaterialDialogSearch('');
                        };
                        return (
                          <tr
                            key={material.id || material.kode}
                            style={{
                              borderBottom: '1px solid var(--border)',
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            onClick={handleSelect}
                          >
                            <td style={{ padding: '12px' }}>{material.material_id || material.kode || '-'}</td>
                            <td style={{ padding: '12px' }}>{material.nama || '-'}</td>
                            <td style={{ padding: '12px' }}>{material.unit || material.satuan || 'PCS'}</td>
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
                  Showing {filteredMaterialsForDialog.length} of {materialDialogSearch ? materials.filter(m => {
                    const query = materialDialogSearch.toLowerCase();
                    const code = (m.material_id || m.kode || '').toLowerCase();
                    const name = (m.nama || '').toLowerCase();
                    return code.includes(query) || name.includes(query);
                  }).length : materials.length} material{filteredMaterialsForDialog.length !== 1 ? 's' : ''}
                  {filteredMaterialsForDialog.length >= 200 && (
                    <span style={{ color: '#ff9800', marginLeft: '8px' }}>
                      (Limited to 200. Use search to narrow down)
                    </span>
                  )}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowMaterialDialog(false);
                    setMaterialDialogSearch('');
                  }}
                >
                  Close
                </Button>
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
const PRApprovalDialog = ({ pr, suppliers, materials, onClose, onApprove, onViewPR }: any) => {
  const [selectedSuppliers, setSelectedSuppliers] = useState<{ [key: string]: string }>({});
  const [supplierInputValues, setSupplierInputValues] = useState<{ [key: string]: string }>({});
  const [paymentTerms, setPaymentTerms] = useState('TOP');
  const [topDays, setTopDays] = useState('30');
  const [editedItems, setEditedItems] = useState<{ [key: string]: { price?: number; requiredQty?: number; shortageQty?: number } }>({});
  
  // Custom Dialog state untuk PRApprovalDialog
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
  
  // Re-load price dari master material jika price = 0
  const getMaterialPrice = (item: any) => {
    // Jika ada edited price, gunakan yang di-edit
    if (editedItems[item.materialId]?.price !== undefined) {
      return editedItems[item.materialId].price || 0;
    }
    
    // Jika price sudah ada dan > 0, gunakan price yang ada
    if (item.price && item.price > 0) {
      return item.price;
    }
    
    // Jika price = 0, coba ambil dari master material
    const material = materials?.find((m: any) => 
      (m.material_id || m.kode || '').toString().trim() === (item.materialId || item.materialKode || '').toString().trim()
    );
    
    if (material) {
      // Prioritas: priceMtr > harga > hargaSales
      return material.priceMtr || material.harga || (material as any).hargaSales || 0;
    }
    
    return item.price || 0;
  };
  
  // Get required qty (bisa di-edit)
  const getRequiredQty = (item: any) => {
    if (editedItems[item.materialId]?.requiredQty !== undefined) {
      return editedItems[item.materialId].requiredQty || 0;
    }
    return item.requiredQty || 0;
  };
  
  // Get shortage qty (calculated from required - available)
  const getShortageQty = (item: any) => {
    const requiredQty = getRequiredQty(item);
    const availableStock = item.availableStock || 0;
    return Math.max(0, requiredQty - availableStock);
  };
  
  // Update edited item
  const updateEditedItem = (materialId: string, field: 'price' | 'requiredQty', value: number) => {
    setEditedItems(prev => ({
      ...prev,
      [materialId]: {
        ...prev[materialId],
        [field]: value,
      }
    }));
  };

  const getSupplierInputDisplayValue = (materialId: string) => {
    if (supplierInputValues[materialId] !== undefined && supplierInputValues[materialId] !== '') {
      return supplierInputValues[materialId];
    }
    const supplierName = selectedSuppliers[materialId];
    if (supplierName) {
      const supplier = suppliers?.find((s: any) => s.nama === supplierName);
      if (supplier) {
        return supplier.nama;
      }
      return supplierName;
    }
    return '';
  };

  const handleSupplierInputChange = (materialId: string, text: string) => {
    setSupplierInputValues(prev => ({ ...prev, [materialId]: text }));
    if (!text) {
      setSelectedSuppliers(prev => {
        const updated = { ...prev };
        delete updated[materialId];
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
      setSelectedSuppliers(prev => ({ ...prev, [materialId]: matchedSupplier.nama }));
    }
  };

  useEffect(() => {
    // Initialize selected suppliers from PR items (supplier dari master material)
    const initialSuppliers: { [key: string]: string } = {};
    const initialInputValues: { [key: string]: string } = {};
    pr.items.forEach((item: any) => {
      // Prioritas: supplier dari item > supplier dari master material
      let supplier = item.supplier;
      
      // Jika tidak ada supplier di item, cari dari master material
      if (!supplier) {
        const material = materials?.find((m: any) => 
          (m.material_id || m.kode || '').toString().trim() === (item.materialId || item.materialKode || '').toString().trim()
        );
        if (material && material.supplier) {
          supplier = material.supplier;
        }
      }
      
      if (supplier) {
        initialSuppliers[item.materialId] = supplier;
        initialInputValues[item.materialId] = supplier;
      }
    });
    setSelectedSuppliers(initialSuppliers);
    setSupplierInputValues(initialInputValues);
  }, [pr, materials]);

  const handleApprove = () => {
    // Validate all suppliers selected
    for (const item of pr.items) {
      if (!selectedSuppliers[item.materialId]) {
        showAlert(`Harap pilih supplier untuk material: ${item.materialName}`, 'Validation Error');
        return;
      }
    }
    
    // Prepare items with edited values
    const updatedItems = pr.items.map((item: any) => {
      const edited = editedItems[item.materialId] || {};
      const requiredQty = edited.requiredQty !== undefined ? edited.requiredQty : item.requiredQty;
      const availableStock = item.availableStock || 0;
      const shortageQty = Math.max(0, requiredQty - availableStock);
      const price = edited.price !== undefined ? edited.price : getMaterialPrice(item);
      
      return {
        ...item,
        requiredQty: requiredQty,
        shortageQty: shortageQty,
        qty: shortageQty, // Update qty untuk PO
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

            <h3 style={{ marginBottom: '12px' }}>Material yang perlu dibeli:</h3>
            <div style={{ marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Material</th>
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
                    const requiredQty = getRequiredQty(item);
                    const shortageQty = getShortageQty(item);
                    const materialPrice = getMaterialPrice(item);
                    const total = Math.ceil(materialPrice * Math.ceil(shortageQty));
                    
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '8px' }}>
                          <div><strong>{item.materialName}</strong></div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{item.materialKode}</div>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          <input
                            type="text"
                            value={requiredQty}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                updateEditedItem(item.materialId, 'requiredQty', value === '' ? 0 : Number(value));
                              }
                            }}
                            onBlur={(e) => {
                              const value = e.target.value;
                              const numValue = value === '' ? 0 : Number(value);
                              if (isNaN(numValue) || numValue < 0) {
                                updateEditedItem(item.materialId, 'requiredQty', item.requiredQty || 0);
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
                            value={materialPrice}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                updateEditedItem(item.materialId, 'price', value === '' ? 0 : Number(value));
                              }
                            }}
                            onBlur={(e) => {
                              const value = e.target.value;
                              const numValue = value === '' ? 0 : Number(value);
                              if (isNaN(numValue) || numValue < 0) {
                                const defaultPrice = item.price || (materials?.find((m: any) => 
                                  (m.material_id || m.kode || '').toString().trim() === (item.materialId || item.materialKode || '').toString().trim()
                                )?.priceMtr || 0);
                                updateEditedItem(item.materialId, 'price', defaultPrice);
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
                          <input
                            type="text"
                            list={`supplier-list-pr-${item.materialId}`}
                            value={getSupplierInputDisplayValue(item.materialId)}
                            onChange={(e) => {
                              handleSupplierInputChange(item.materialId, e.target.value);
                            }}
                            onBlur={(e) => {
                              const value = e.target.value;
                              const matchedSupplier = suppliers?.find((s: any) => s.nama === value);
                              if (matchedSupplier) {
                                setSelectedSuppliers(prev => ({ ...prev, [item.materialId]: matchedSupplier.nama }));
                              }
                            }}
                            placeholder="-- Pilih Supplier --"
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              backgroundColor: 'var(--bg-tertiary)',
                              color: 'var(--text-primary)',
                              fontSize: '12px',
                            }}
                          />
                          <datalist id={`supplier-list-pr-${item.materialId}`}>
                            {suppliers?.map((s: any) => (
                              <option key={s.id} value={s.nama}>{s.nama}</option>
                            ))}
                          </datalist>
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
              {onViewPR && (
                <Button variant="secondary" onClick={() => onViewPR(pr)}>
                  👁️ View PR
                </Button>
              )}
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button variant="primary" onClick={handleApprove}>Approve & Create PO</Button>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Custom Dialog for PRApprovalDialog */}
      {dialogState.show && (
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
    </div>
  );
};

// Receipt/GRN Dialog Component - OPTIMIZED dengan pre-loaded data dan memoization
const ReceiptDialog = React.memo(({ po, onClose, onSave }: { po: PurchaseOrder & { _preloadedGRNData?: { totalReceived: number; grnsForPO: any[] } }; onClose: () => void; onSave: (data: { qtyReceived: number; receivedDate: string; notes?: string; suratJalanId?: string; suratJalanName?: string; invoiceNo?: string; invoiceFileId?: string; invoiceFileName?: string; sitePlan?: string }) => void }) => {
  // Use pre-loaded data jika ada, jika tidak baru load
  const preloadedData = (po as any)._preloadedGRNData;
  const initialTotalReceived = preloadedData?.totalReceived || 0;
  
  const [qtyReceived, setQtyReceived] = useState<string>('');
  const [receivedDate, setReceivedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [sitePlan, setSitePlan] = useState<string>('Site Plan 1');
  const [suratJalanFile, setSuratJalanFile] = useState<File | null>(null);
  const [invoiceNo, setInvoiceNo] = useState<string>('');
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [totalReceived, setTotalReceived] = useState<number>(initialTotalReceived);
  const [maxAllowedQty, setMaxAllowedQty] = useState<number>(() => {
    // Calculate immediately from pre-loaded data
    if (preloadedData) {
      const maxTotal = Math.ceil(po.qty * 1.1);
      return Math.max(0, maxTotal - preloadedData.totalReceived);
    }
    return po.qty;
  });
  const [isLoading, setIsLoading] = useState<boolean>(!preloadedData);
  const [isSaving, setIsSaving] = useState<boolean>(false); // Track saving state to prevent double-click
  
  // Custom Dialog - menggunakan hook terpusat
  const { showAlert, DialogComponent: ReceiptDialogComponent } = useDialog();
  
  // Calculate values from pre-loaded data immediately (synchronous)
  useEffect(() => {
    if (preloadedData) {
      const total = preloadedData.totalReceived;
      setTotalReceived(total);
      
      // Calculate max allowed with 10% tolerance
      const maxTotal = Math.ceil(po.qty * 1.1);
      const maxRemaining = maxTotal - total;
      setMaxAllowedQty(maxRemaining > 0 ? maxRemaining : 0);
      
      // Set default qtyReceived ke remaining qty jika masih ada
      const remaining = po.qty - total;
      if (remaining > 0) {
        setQtyReceived(remaining.toString());
      } else if (maxRemaining > 0) {
        setQtyReceived(maxRemaining.toString());
      } else {
        setQtyReceived('0');
      }
      setIsLoading(false);
    }
  }, [preloadedData, po.qty]);
  
  // Load existing GRNs hanya jika tidak ada pre-loaded data
  useEffect(() => {
    if (preloadedData) return; // Skip jika sudah ada pre-loaded data
    
    let isMounted = true;
    const loadGRNs = async () => {
      try {
        const grnData = await storageService.get<any[]>('grnPackaging') || [];
        const grnsForPO = grnData.filter((grn: any) => 
          (grn.poNo || '').toString().trim() === (po.poNo || '').toString().trim()
        );
        const total = grnsForPO.reduce((sum: number, grn: any) => sum + (grn.qtyReceived || 0), 0);
        
        if (!isMounted) return;
        
        setTotalReceived(total);
        
        // Calculate max allowed with 10% tolerance
        const maxTotal = Math.ceil(po.qty * 1.1);
        const maxRemaining = maxTotal - total;
        setMaxAllowedQty(maxRemaining > 0 ? maxRemaining : 0);
        
        // Set default qtyReceived ke remaining qty jika masih ada
        const remaining = po.qty - total;
        if (remaining > 0) {
          setQtyReceived(remaining.toString());
        } else if (maxRemaining > 0) {
          setQtyReceived(maxRemaining.toString());
        } else {
          setQtyReceived('0');
        }
        setIsLoading(false);
      } catch (error) {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadGRNs();
    
    return () => {
      isMounted = false;
    };
  }, [po.poNo, po.qty, preloadedData]);

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
    // Prevent double-click/multiple submissions
    if (isSaving) {
      return;
    }
    
    const qty = Number(qtyReceived);
    if (isNaN(qty) || qty <= 0) {
      showAlert('Quantity received must be greater than 0', 'Validation Error');
      return;
    }
    
    // Validasi dengan toleransi 10%
    const maxAllowedTotal = Math.ceil(po.qty * 1.1);
    const newTotal = totalReceived + qty;
    if (newTotal > maxAllowedTotal) {
      showAlert(
        `⚠️ Quantity received melebihi batas maksimal!\n\n` +
        `Qty Ordered: ${po.qty}\n` +
        `Total Sudah Diterima: ${totalReceived}\n` +
        `Qty Baru: ${qty}\n` +
        `Total Baru: ${newTotal}\n` +
        `Maksimal Total (dengan toleransi 10%): ${maxAllowedTotal}\n` +
        `Maksimal yang bisa diterima sekarang: ${maxAllowedQty}`,
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
    const handleFiles = async () => {
      try {
        setIsSaving(true); // Set saving state
        
        const filesToProcess: Array<{ file: File; type: 'suratJalan' | 'invoice' }> = [];
        if (suratJalanFile) filesToProcess.push({ file: suratJalanFile, type: 'suratJalan' });
        if (invoiceFile) filesToProcess.push({ file: invoiceFile, type: 'invoice' });

        if (filesToProcess.length === 0) {
          // No files, save directly
          onSave({ 
            qtyReceived: qty, 
            receivedDate, 
            notes,
            invoiceNo: invoiceNo || undefined,
            sitePlan: sitePlan || 'Site Plan 1'
          });
          return;
        }

        // Process files with BlobService
        const results: { suratJalanId?: string; suratJalanName?: string; invoiceFileId?: string; invoiceFileName?: string } = {};

        try {
          for (const { file, type } of filesToProcess) {
            const uploadResult = await BlobService.uploadFile(file, 'packaging');
            if (type === 'suratJalan') {
              results.suratJalanId = uploadResult.fileId;
              results.suratJalanName = file.name;
            } else if (type === 'invoice') {
              results.invoiceFileId = uploadResult.fileId;
              results.invoiceFileName = file.name;
            }
          }

          // All files processed, save
          onSave({ 
            qtyReceived: qty, 
            receivedDate, 
            notes,
            suratJalanId: results.suratJalanId,
            suratJalanName: results.suratJalanName,
            invoiceNo: invoiceNo || undefined,
            invoiceFileId: results.invoiceFileId,
            invoiceFileName: results.invoiceFileName,
            sitePlan: sitePlan || 'Site Plan 1'
          });
        } catch (error: any) {
          showAlert(`Error uploading files: ${error.message}`, 'Error');
          setIsSaving(false); // Reset saving state on error
        }
      } catch (error: any) {
        showAlert(`Error: ${error.message}`, 'Error');
        setIsSaving(false); // Reset saving state on error
      }
    };

    handleFiles();
  };

  // Show loading state hanya jika benar-benar loading (tidak ada pre-loaded data)
  if (isLoading && !preloadedData) {
    return (
      <div className="dialog-overlay" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
          <Card className="dialog-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>Create Receipt (GRN) - {po.poNo}</h2>
              <Button variant="secondary" onClick={onClose} style={{ padding: '6px 12px' }}>✕</Button>
            </div>
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading...
            </div>
          </Card>
        </div>
      </div>
    );
  }

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
                <div><strong>Material:</strong> {po.materialItem}</div>
                <div><strong>Material ID:</strong> {po.materialId || '-'}</div>
                <div><strong>Qty Ordered:</strong> {po.qty} PCS</div>
                <div><strong>Unit Price:</strong> Rp {po.price.toLocaleString('id-ID')}</div>
                <div><strong>Total:</strong> Rp {po.total.toLocaleString('id-ID')}</div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                Quantity Received *
              </label>
              <input
                type="text"
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
                    setQtyReceived(po.qty.toString());
                  } else {
                    setQtyReceived(Math.ceil(numValue).toString());
                  }
                }}
                placeholder="Enter quantity received"
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
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Ordered: {po.qty} PCS
                {totalReceived > 0 && (
                  <span> | Already Received: {totalReceived} PCS</span>
                )}
                <br />
                <span style={{ color: 'var(--primary-color)', fontWeight: '500' }}>
                  Max Allowed (with 10% tolerance): {Math.ceil(po.qty * 1.1)} PCS
                  {totalReceived > 0 && (
                    <span> | Remaining: {maxAllowedQty} PCS</span>
                  )}
                </span>
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
              <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
              <Button 
                variant="primary" 
                onClick={handleSubmit}
                disabled={isSaving}
                style={{ opacity: isSaving ? 0.6 : 1, cursor: isSaving ? 'not-allowed' : 'pointer' }}
              >
                {isSaving ? '⏳ Creating GRN...' : 'Create GRN'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Custom Dialog for ReceiptDialog */}
      <ReceiptDialogComponent />
    </div>
  );
}, (prevProps, nextProps) => {
  // Memo comparison - hanya re-render jika PO berubah
  return prevProps.po.id === nextProps.po.id && 
         prevProps.po.poNo === nextProps.po.poNo &&
         prevProps.po.qty === nextProps.po.qty;
});

// Edit PO Dialog Component
const EditPODialog = ({
  po,
  suppliers,
  materials,
  formData,
  setFormData,
  supplierInputValue,
  setSupplierInputValue,
  materialInputValue,
  setMaterialInputValue,
  qtyInputValue,
  setQtyInputValue,
  priceInputValue,
  setPriceInputValue,
  onClose,
  onSave,
  removeLeadingZero,
}: {
  po: PurchaseOrder;
  suppliers: Supplier[];
  materials: Material[];
  formData: Partial<PurchaseOrder>;
  setFormData: (data: Partial<PurchaseOrder>) => void;
  supplierInputValue: string;
  setSupplierInputValue: (value: string) => void;
  materialInputValue: string;
  setMaterialInputValue: (value: string) => void;
  qtyInputValue: string;
  setQtyInputValue: (value: string) => void;
  priceInputValue: string;
  setPriceInputValue: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  removeLeadingZero: (value: string) => string;
}) => {
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

  const getMaterialInputDisplayValue = () => {
    if (materialInputValue !== undefined && materialInputValue !== '') {
      return materialInputValue;
    }
    if (formData.materialItem) {
      const material = materials.find(m => m.nama === formData.materialItem);
      if (material) {
        return `${material.material_id || material.kode} - ${material.nama}`;
      }
      return formData.materialItem;
    }
    return '';
  };

  const handleMaterialInputChange = (text: string) => {
    setMaterialInputValue(text);
    if (!text) {
      setFormData({
        ...formData,
        materialItem: '',
        price: 0,
        total: 0,
      });
      return;
    }
    const normalized = text.toLowerCase();
    const matchedMaterial = materials.find(m => {
      const label = `${m.material_id || m.kode || ''}${m.material_id || m.kode ? ' - ' : ''}${m.nama || ''}`.toLowerCase();
      const code = (m.material_id || m.kode || '').toLowerCase();
      const name = (m.nama || '').toLowerCase();
      return label === normalized || code === normalized || name === normalized;
    });
    if (matchedMaterial) {
      const materialPrice = matchedMaterial.priceMtr || matchedMaterial.harga || 0;
      const roundedPrice = Math.ceil(materialPrice);
      const roundedTotal = Math.ceil((formData.qty || 0) * roundedPrice);
      setFormData({
        ...formData,
        materialItem: matchedMaterial.nama,
        price: roundedPrice,
        total: roundedTotal,
      });
    } else {
      setFormData({
        ...formData,
        materialItem: text,
        price: 0,
        total: 0,
      });
    }
  };

  function setShowSupplierDialog(arg0: boolean): void {
    throw new Error('Function not implemented.');
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
        <Card className="dialog-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Edit Purchase Order - {po.poNo}</h2>
            <Button variant="secondary" onClick={onClose} style={{ padding: '6px 12px' }}>✕</Button>
          </div>

          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
            <div><strong>PO No:</strong> {po.poNo}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Status: {po.status} | Created: {new Date(po.created).toLocaleDateString('id-ID')}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Supplier *
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={getSupplierInputDisplayValue()}
                onChange={() => {}}
                placeholder="-- Pilih Supplier --"
                readOnly
                onClick={() => setShowSupplierDialog(true)}
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
                onClick={() => setShowSupplierDialog(true)}
                style={{ fontSize: '12px', padding: '8px 16px' }}
              >
                Select
              </Button>
            </div>
          </div>
          <Input
            label="SO No (Linked - Cannot Edit)"
            value={formData.soNo || ''}
            onChange={(v) => setFormData({ ...formData, soNo: v })}
            disabled={true}
          />
          <Input
            label="Reason Pembelian (jika tanpa SO/SPK)"
            value={formData.purchaseReason || ''}
            onChange={(v) => setFormData({ ...formData, purchaseReason: v })}
            placeholder="Contoh: Refill stock umum / sample R&D"
          />
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Material/Item *
            </label>
            <input
              type="text"
              list={`material-list-edit-${po.id}`}
              value={getMaterialInputDisplayValue()}
              onChange={(e) => {
                handleMaterialInputChange(e.target.value);
              }}
              onBlur={(e) => {
                const value = e.target.value;
                const matchedMaterial = materials.find(m => {
                  const label = `${m.material_id || m.kode || ''}${m.material_id || m.kode ? ' - ' : ''}${m.nama || ''}`;
                  return label === value;
                });
                if (matchedMaterial) {
                  const materialPrice = matchedMaterial.priceMtr || matchedMaterial.harga || 0;
                  const roundedPrice = Math.ceil(materialPrice);
                  const roundedTotal = Math.ceil((formData.qty || 0) * roundedPrice);
                  setFormData({
                    ...formData,
                    materialItem: matchedMaterial.nama,
                    price: roundedPrice,
                    total: roundedTotal,
                  });
                }
              }}
              placeholder="-- Pilih Material --"
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
            <datalist id={`material-list-edit-${po.id}`}>
              {materials.map(m => (
                <option key={m.id} value={`${m.material_id || m.kode} - ${m.nama}`}>
                  {m.material_id || m.kode} - {m.nama}
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
                const qty = cleaned === '' ? 0 : Number(cleaned) || 0;
                const total = Math.ceil(qty * (formData.price || 0));
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
                  const total = Math.ceil(qty * (formData.price || 0));
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
                if ((currentVal === '' || currentVal === '0') && /^[1-9]$/.test(e.key)) {
                  e.preventDefault();
                  const newVal = e.key;
                  setQtyInputValue(newVal);
                  input.value = newVal;
                  const qty = Number(newVal);
                  const total = Math.ceil(qty * (formData.price || 0));
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
                if (currentPrice === 0 || currentPrice === null || currentPrice === undefined || String(currentPrice) === '0') {
                  setPriceInputValue('');
                  input.value = '';
                }
              }}
              onChange={(e) => {
                let val = e.target.value;
                val = val.replace(/[^\d.,]/g, '');
                const cleaned = removeLeadingZero(val);
                setPriceInputValue(cleaned);
                const price = cleaned === '' ? 0 : Math.ceil(Number(cleaned) || 0);
                const total = Math.ceil((formData.qty || 0) * price);
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
                  const price = Math.ceil(Number(val));
                  const total = Math.ceil((formData.qty || 0) * price);
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
                if ((currentVal === '' || currentVal === '0') && /^[1-9]$/.test(e.key)) {
                  e.preventDefault();
                  const newVal = e.key;
                  setPriceInputValue(newVal);
                  input.value = newVal;
                  const price = Math.ceil(Number(newVal));
                  const total = Math.ceil((formData.qty || 0) * price);
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
              Total: Rp {Math.ceil((formData.qty || 0) * (formData.price || 0)).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
            </label>
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
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
            <Button onClick={onClose} variant="secondary">
              Cancel
            </Button>
            <Button onClick={onSave} variant="primary">
              Update PO
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Purchasing;

