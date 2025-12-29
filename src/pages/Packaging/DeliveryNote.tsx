import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Input from '../../components/Input';
import ScheduleTable from '../../components/ScheduleTable';
import NotificationBell from '../../components/NotificationBell';
import { storageService } from '../../services/storage';
import { safeDeleteItem, filterActiveItems } from '../../utils/data-persistence-helper';
import { generateSuratJalanHtml } from '../../pdf/suratjalan-pdf-template';
import { openPrintWindow } from '../../utils/actions';
import { useDialog } from '../../hooks/useDialog';
import { loadLogoAsBase64 } from '../../utils/logo-loader';
import * as XLSX from 'xlsx';
import { createStyledWorksheet, setColumnWidths, ExcelColumn } from '../../utils/excel-helper';
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
  deleted?: boolean; // Tombstone flag for soft delete
  deletedAt?: string; // Timestamp when deleted
  // Timestamp fields untuk sync dan tracking
  created?: string; // ISO date string untuk creation timestamp
  lastUpdate?: string; // ISO date string untuk last update timestamp
  timestamp?: number; // Unix timestamp (milliseconds) untuk sync
  _timestamp?: number; // Backward compatibility timestamp
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
  const [deliveries, setDeliveries] = useState<DeliveryNote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'delivery' | 'schedule' | 'outstanding'>('delivery');
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [spkData, setSpkData] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showCreateDeliveryNoteDialog, setShowCreateDeliveryNoteDialog] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryNote | null>(null);
  const [viewPdfData, setViewPdfData] = useState<{ html: string; sjNo: string } | null>(null);
  const [signatureViewer, setSignatureViewer] = useState<{ 
    data: string; 
    fileName: string; 
    isPDF: boolean;
    blobUrl?: string;
  } | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [deliveryViewMode, setDeliveryViewMode] = useState<'cards' | 'table'>('cards');
  const [customerInputValue, setCustomerInputValue] = useState('');
  const [soInputValue, setSoInputValue] = useState('');
  const [productInputValue, setProductInputValue] = useState('');
  const [qtyInputValue, setQtyInputValue] = useState('');
  const [selectedSOs, setSelectedSOs] = useState<string[]>([]); // For multiple SO selection
  const [enableMultiSO, setEnableMultiSO] = useState(false); // Toggle for multi-SO mode
  const [selectedProducts, setSelectedProducts] = useState<Array<{productId: string; productName: string; productCode: string; qty: number; unit: string}>>([]); // Selected products from SO
  const [soProducts, setSoProducts] = useState<Array<{productId: string; productName: string; productCode: string; qty: number; unit: string}>>([]); // Products from selected SO
  const [formData, setFormData] = useState<Partial<DeliveryNote>>({
    soNo: '',
    customer: '',
    product: '',
    qty: 0,
  });
  // Custom Dialog - menggunakan hook terpusat
  const { showAlert: showAlertBase, showConfirm: showConfirmBase, showPrompt: showPromptBase, closeDialog, DialogComponent } = useDialog();
  
  // Wrapper untuk kompatibilitas dengan urutan parameter yang berbeda
  const showAlert = (title: string, message: string) => {
    showAlertBase(message, title);
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    showConfirmBase(message, onConfirm, undefined, title);
  };

  const showPrompt = (title: string, message: string, defaultValue: string, onConfirm: (value: string) => void, placeholder?: string) => {
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

  useEffect(() => {
    loadDeliveries();
    loadCustomers();
    loadProducts();
    loadSalesOrders();
    loadNotifications();
    loadScheduleData();
    
    // Event-based updates: lebih efisien daripada polling
    let debounceTimer: NodeJS.Timeout | null = null;
    
    const handleStorageChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ key?: string }>;
      const key = customEvent.detail?.key || '';
      
      // Hanya reload jika ada perubahan di data yang relevan
      if (
        key === 'delivery' ||
        key === 'deliveryNotes' ||
        key === 'salesOrders' ||
        key === 'schedule' ||
        key === 'productionNotifications' ||
        key === 'deliveryNotifications'
      ) {
        // Debounce: tunggu 300ms sebelum reload
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(() => {
          if (key === 'delivery' || key === 'deliveryNotes') {
            loadDeliveries();
          }
          if (key === 'salesOrders') {
            loadSalesOrders();
          }
          if (key === 'schedule') {
            loadScheduleData();
          }
          if (key === 'productionNotifications' || key === 'deliveryNotifications') {
            loadNotifications();
          }
          debounceTimer = null;
        }, 300);
      }
    };
    
    // Fallback polling: hanya jika event listener tidak tersedia atau untuk safety net
    // Interval lebih panjang (15 detik) sebagai backup
    const fallbackInterval = setInterval(() => {
      loadDeliveries();
      loadNotifications();
      loadScheduleData();
    }, 15000); // Increased to 15 seconds as fallback
    
    if (typeof window !== 'undefined') {
      window.addEventListener('app-storage-changed', handleStorageChange as EventListener);
    }
    
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('app-storage-changed', handleStorageChange as EventListener);
      }
      clearInterval(fallbackInterval);
    };
  }, []);

  const loadScheduleData = async () => {
    let schedule = await storageService.get<any[]>('schedule') || [];
    // Ensure schedule is always an array
    schedule = Array.isArray(schedule) ? schedule : [];
    let spk = await storageService.get<any[]>('spk') || [];
    // Ensure spk is always an array
    spk = Array.isArray(spk) ? spk : [];
    
    // 🚀 OPTIMASI: Hanya update state jika benar-benar ada perubahan
    setScheduleData((prev: any[]) => {
      if (JSON.stringify(prev) === JSON.stringify(schedule)) {
        return prev;
      }
      return schedule;
    });
    
    setSpkData((prev: any[]) => {
      if (JSON.stringify(prev) === JSON.stringify(spk)) {
        return prev;
      }
      return spk;
    });
  };

  const loadCustomers = async () => {
    const data = await storageService.get<Customer[]>('customers') || [];
    // 🚀 OPTIMASI: Hanya update state jika benar-benar ada perubahan
    setCustomers((prev: Customer[]) => {
      if (JSON.stringify(prev) === JSON.stringify(data)) {
        return prev; // No change, return previous state
      }
      return data;
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
        // Auto-select all products by default
        setSelectedProducts(soProductsList);
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
      const name = (p.nama || '').toLowerCase();
      return label === normalized || code === normalized || name === normalized;
    });
    if (matchedProduct) {
      setFormData({ ...formData, product: matchedProduct.nama });
    } else {
      setFormData({ ...formData, product: text });
    }
  };

  const loadProducts = async () => {
    const data = await storageService.get<any[]>('products') || [];
    // 🚀 OPTIMASI: Hanya update state jika benar-benar ada perubahan
    setProducts((prev: any[]) => {
      if (JSON.stringify(prev) === JSON.stringify(data)) {
        return prev; // No change, return previous state
      }
      return data;
    });
  };

  const loadSalesOrders = async () => {
    let data = await storageService.get<SalesOrder[]>('salesOrders') || [];
    // Ensure data is always an array
    data = Array.isArray(data) ? data : [];
    const filteredData = data.filter(so => so.status === 'OPEN' || so.status === 'CLOSE');
    // 🚀 OPTIMASI: Hanya update state jika benar-benar ada perubahan
    setSalesOrders((prev: SalesOrder[]) => {
      if (JSON.stringify(prev) === JSON.stringify(filteredData)) {
        return prev; // No change, return previous state
      }
      return filteredData;
    });
  };

  const loadDeliveries = async () => {
    const data = await storageService.get<DeliveryNote[]>('delivery') || [];
    // ENHANCED: Use helper to filter out deleted items (tombstone pattern)
    const activeDeliveries = filterActiveItems(data);
    
    // Log tombstone info for debugging
    const deletedCount = data.length - activeDeliveries.length;
    if (deletedCount > 0) {
      console.log(`[DeliveryNote] Loaded ${activeDeliveries.length} active deliveries, ${deletedCount} tombstones hidden`);
    }
    
    // 🚀 OPTIMASI: Hanya update state jika benar-benar ada perubahan
    setDeliveries((prev: DeliveryNote[]) => {
      if (JSON.stringify(prev) === JSON.stringify(activeDeliveries)) {
        return prev; // No change, return previous state
      }
      return activeDeliveries;
    });
  };

  const loadNotifications = async () => {
    // Load notifications dari PPIC (delivery schedule)
    let deliveryNotifications = await storageService.get<any[]>('deliveryNotifications') || [];
    // Ensure deliveryNotifications is always an array
    deliveryNotifications = Array.isArray(deliveryNotifications) ? deliveryNotifications : [];
    
    // Filter out deleted notifications (tombstone pattern)
    const initialCount = deliveryNotifications.length;
    deliveryNotifications = deliveryNotifications.filter((n: any) => {
      const isDeleted = n.deleted === true || n.deleted === 'true' || n.deletedAt;
      if (isDeleted) {
      }
      return !isDeleted;
    });
    
    if (initialCount > deliveryNotifications.length) {
    }
    
    // 🚀 OPTIMASI: Hanya update state jika benar-benar ada perubahan
    setNotifications((prev: any[]) => {
      if (JSON.stringify(prev) === JSON.stringify(deliveryNotifications)) {
        return prev; // No change, return previous state
      }
      return deliveryNotifications;
    });
    // 🚀 OPTIMASI: Comment out heavy logging untuk performa
    // console.log('🔍 [Delivery Note] Loaded notifications from storage:', deliveryNotifications.length, deliveryNotifications.map((n: any) => ({
    //   id: n.id,
    //   spkNo: n.spkNo,
    //   spkNos: n.spkNos,
    //   status: n.status,
    //   stockFulfilled: n.stockFulfilled,
    //   product: n.product,
    //   sjGroupId: n.sjGroupId || 'null',
    //   deliveryBatches: n.deliveryBatches?.map((db: any) => ({ sjGroupId: db.sjGroupId, deliveryDate: db.deliveryDate })) || [],
    // })));
    
    // Log semua SPK yang ada di notifications untuk debugging
    // const allSpks = deliveryNotifications.flatMap((n: any) => {
    //   const spks = [];
    //   if (n.spkNo) spks.push(n.spkNo);
    //   if (n.spkNos && Array.isArray(n.spkNos)) spks.push(...n.spkNos);
    //   return spks;
    // });
    // console.log('🔍 [Delivery Note] All SPKs in notifications:', allSpks);
    
    // Load schedule data untuk enrich deliveryBatches jika belum ada
    let scheduleList = await storageService.get<any[]>('schedule') || [];
    // Ensure scheduleList is always an array
    scheduleList = Array.isArray(scheduleList) ? scheduleList : [];
    
    // Load deliveries untuk cek apakah sudah dibuat
    let currentDeliveries = await storageService.get<any[]>('delivery') || [];
    // Ensure currentDeliveries is always an array
    currentDeliveries = Array.isArray(currentDeliveries) ? currentDeliveries : [];
    // Filter out deleted deliveries
    currentDeliveries = currentDeliveries.filter((d: any) => {
      const isDeleted = d.deleted === true || d.deleted === 'true' || d.deletedAt;
      if (isDeleted) {
      }
      return !isDeleted;
    });
    
    // Load inventory dan SPK data untuk cek stockFulfilled (harus di-load sebelum production & QC check)
    let inventoryData = await storageService.get<any[]>('inventory') || [];
    inventoryData = Array.isArray(inventoryData) ? inventoryData : [];
    let spkData = await storageService.get<any[]>('spk') || [];
    spkData = Array.isArray(spkData) ? spkData : [];
    
    // Cek status production dan QC untuk setiap notification
    let productionList = await storageService.get<any[]>('production') || [];
    // Ensure productionList is always an array
    productionList = Array.isArray(productionList) ? productionList : [];
    let qcList = await storageService.get<any[]>('qc') || [];
    // Ensure qcList is always an array
    qcList = Array.isArray(qcList) ? qcList : [];
    
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
              const invCode = (inv.codeItem || '').toString().trim();
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
      const spkList = n.spkNos || (n.spkNo ? [n.spkNo] : []);
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
    
    // Cek apakah ada perubahan yang perlu disimpan
    const hasChanges = JSON.stringify(cleanedNotifications) !== JSON.stringify(currentStorageNotifications);
    
    if (hasChanges) {
      // 🚀 OPTIMASI: Kurangi console.log untuk performa
      // console.log(`💾 [Storage] Saving notifications to storage:`);
      // console.log(`  Current in storage: ${currentStorageCount} notifications`);
      // console.log(`  After cleanup: ${cleanedNotifications.length} notifications`);
      // console.log(`  Cleaning ${currentStorageCount} → ${cleanedNotifications.length} notifications`);
      // cleanedNotifications.forEach((n: any, idx: number) => {
      //   console.log(`    [${idx}] SPK: ${n.spkNo}, sjGroupId: ${n.sjGroupId || 'null'}, status: ${n.status}, id: ${n.id}`);
      // });
      
      // IMPORTANT: Pastikan semua notifications penting (READY_TO_SHIP, WAITING_PRODUCTION, WAITING_QC) tersimpan
      const importantNotifications = cleanedNotifications.filter((n: any) => 
        n.status === 'READY_TO_SHIP' || n.status === 'WAITING_PRODUCTION' || n.status === 'WAITING_QC'
      );
      
      await storageService.set('deliveryNotifications', cleanedNotifications);
      
      // Verify setelah save
      const verifyNotifications = await storageService.get<any[]>('deliveryNotifications') || [];
      // console.log(`✅ [Storage] Verified after save: ${verifyNotifications.length} notifications in storage`);
      if (verifyNotifications.length !== cleanedNotifications.length) {
        console.error(`❌ [Storage] MISMATCH! Expected ${cleanedNotifications.length} but got ${verifyNotifications.length} notifications in storage!`);
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
    const readyNotifications = cleanedNotifications.filter((n: any) => 
      n.status === 'READY_TO_SHIP'
    );
    
    // IMPORTANT: JANGAN deduplicate berdasarkan SPK saja!
    // Notifications dengan SPK yang sama tapi sjGroupId berbeda harus tetap dipertahankan
    // Karena setiap sjGroupId = 1 delivery note terpisah
    // Deduplicate hanya jika SPK SAMA DAN sjGroupId SAMA (true duplicate)
    
    const deduplicatedNotifications = readyNotifications.reduce((acc: any[], notif: any, currentIndex: number) => {
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
    
    // 🚀 OPTIMASI: Hanya update state jika benar-benar ada perubahan untuk mencegah re-render loop
    setNotifications((prev: any[]) => {
      if (JSON.stringify(prev) === JSON.stringify(groupedNotifications)) {
        return prev; // No change, return previous state
      }
      return groupedNotifications;
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
    
    // DEBUG: Log ungrouped notifications juga
    if (ungrouped.length > 0) {
      console.log('🔍 [Delivery Note] Ungrouped notifications (no sjGroupId):', ungrouped.map((n: any) => ({
        id: n.id,
        spkNo: n.spkNo,
        sjGroupId: n.sjGroupId || 'null',
      })));
    }
    
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
    
    groupedResults.push(...enrichedUngrouped);
    
    // IMPORTANT: Setiap entry di groupedResults = 1 notifikasi terpisah
    // Jika ada 2 sjGroupId berbeda, akan ada 2 notifikasi terpisah
    return groupedResults;
  };

  // Update inventory saat delivery note dibuat - TAMBAHKAN OUTGOING untuk product
  const updateInventoryFromDelivery = async (delivery: DeliveryNote) => {
    try {
      console.log('🔍 [Delivery Inventory] Starting update for delivery:', delivery.sjNo, delivery);
      
      const inventory = await storageService.get<any[]>('inventory') || [];
      const productsList = await storageService.get<any[]>('products') || [];
      
      console.log(`🔍 [Delivery Inventory] Loaded ${inventory.length} inventory items, ${productsList.length} products`);
      
      // Process items (new format) atau single product (old format)
      const itemsToProcess = delivery.items && delivery.items.length > 0
        ? delivery.items
        : delivery.product
          ? [{ product: delivery.product, qty: delivery.qty || 0 }]
          : [];

      console.log(`🔍 [Delivery Inventory] Items to process:`, itemsToProcess);

      if (itemsToProcess.length === 0) {
        console.warn('⚠️ [Delivery Inventory] No items to process in delivery note');
        return;
      }

      for (const item of itemsToProcess) {
        const productName = item.product || '';
        const qtyDelivered = item.qty || 0;
        const fromInventory = item.fromInventory === true; // Explicit check untuk boolean

        console.log(`🔍 [Delivery Inventory] Processing: ${productName}, Qty: ${qtyDelivered}, From Inventory: ${fromInventory}`);

        if (!productName || qtyDelivered <= 0) {
          console.warn(`⚠️ [Delivery Inventory] Skip: invalid product name or qty (${productName}, ${qtyDelivered})`);
          continue;
        }

        // IMPORTANT: Setiap SJ yang sudah di-upload signed document WAJIB memotong inventory
        // Tidak peduli apakah manual input atau tidak, tetap update inventory (outgoing dan onGoing)
        // Jika manual input, tetap update inventory untuk tracking
        if (!fromInventory) {
          console.log(`ℹ️ [Delivery Inventory] Product "${productName}" adalah manual input, tapi tetap update inventory karena SJ sudah di-upload.`);
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
          console.warn(`⚠️ [Delivery Inventory] Product not found in master: "${productName}". Akan menggunakan productName sebagai codeItem.`);
          // Gunakan productName sebagai codeItem jika tidak ditemukan di master
          productCode = productName.trim();
        } else {
          productCode = (product.product_id || product.kode || '').toString().trim();
        }
        console.log(`🔍 [Delivery Inventory] ${product ? `Found product: ${product.nama}` : 'Product not in master'} (Code: ${productCode})`);
        
        // Find product inventory - prioritas: gunakan inventoryId jika ada (dari selection)
        let existingProductInventory: any = null;
        
        if (item.inventoryId) {
          // Jika ada inventoryId, langsung gunakan itu (lebih akurat)
          existingProductInventory = inventory.find((inv: any) => inv.id === item.inventoryId);
          if (existingProductInventory) {
            console.log(`✅ [Delivery Inventory] Found inventory by ID: ${item.inventoryId}`);
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
        // Key tracking: SPK number (bukan delivery number), karena product berasal dari SPK
        // SPK bisa dari item level atau delivery level (fallback)
        const spkNo = item.spkNo || delivery.spkNo || '';
        if (existingProductInventory && spkNo) {
          const processedSPKs = existingProductInventory.processedSPKs || [];
          if (processedSPKs.includes(spkNo)) {
            console.warn(`⚠️ [Delivery Inventory] SPK ${spkNo} sudah pernah diproses untuk product ${productCode} (OUTGOING). Skip update.`);
            continue; // Skip product ini, lanjut ke product berikutnya
          }
        }

        if (existingProductInventory) {
          // Update existing product inventory - TAMBAHKAN OUTGOING dan KURANGI ON GOING (production stock)
          const oldOutgoing = existingProductInventory.outgoing || 0;
          const oldReceive = existingProductInventory.receive || 0;
          const oldStock = existingProductInventory.nextStock || 0;
          const oldOnGoing = existingProductInventory.onGoing || existingProductInventory.on_going || existingProductInventory.productionStock || 0;
          const newOutgoing = oldOutgoing + qtyDelivered;
          
          // IMPORTANT: Kurangi on going (production stock) saat delivery dibuat
          // On going = stock yang sedang dalam proses produksi atau sudah selesai produksi tapi belum dikirim
          const newOnGoing = Math.max(0, oldOnGoing - qtyDelivered);
          
          // Tambahkan SPK number ke processedSPKs untuk anti-duplicate (OUTGOING tracking)
          // Note: processedSPKs juga dipakai untuk RECEIVE, jadi kita track keduanya
          const processedSPKs = existingProductInventory.processedSPKs || [];
          if (spkNo && !processedSPKs.includes(spkNo)) {
            processedSPKs.push(spkNo);
          }
          
          existingProductInventory.outgoing = newOutgoing;
          existingProductInventory.onGoing = newOnGoing; // Update on going (production stock)
          existingProductInventory.on_going = newOnGoing; // Backward compatibility
          existingProductInventory.productionStock = newOnGoing; // Alternative field name
          existingProductInventory.processedSPKs = processedSPKs; // Track SPK yang sudah diproses (untuk OUTGOING)
          // Recalculate nextStock: stockPremonth + receive - outgoing + return
          existingProductInventory.nextStock =
            (existingProductInventory.stockPremonth || 0) +
            (existingProductInventory.receive || 0) -
            newOutgoing +
            (existingProductInventory.return || 0);
          existingProductInventory.lastUpdate = new Date().toISOString();
          console.log(`✅ [Delivery Inventory] Product inventory updated (OUTGOING from SPK ${spkNo}):`);
          console.log(`   Product: ${productName} (${productCode})`);
          console.log(`   SPK: ${spkNo} (key tracking untuk OUTGOING)`);
          console.log(`   Outgoing: ${oldOutgoing} → ${newOutgoing} (+${qtyDelivered})`);
          console.log(`   On Going (Production Stock): ${oldOnGoing} → ${newOnGoing} (-${qtyDelivered})`);
          console.log(`   Receive: ${oldReceive}`);
          console.log(`   NextStock: ${oldStock} → ${existingProductInventory.nextStock}`);
        } else {
          // Create new product inventory entry dengan outgoing (jika product belum ada di inventory)
          console.warn(`⚠️ [Delivery Inventory] Product inventory not found: ${productName} (${productCode}). Creating new entry.`);
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
            onGoing: 0, // On going (production stock) = 0 karena baru dibuat (belum ada production sebelumnya)
            on_going: 0, // Backward compatibility
            productionStock: 0, // Alternative field name
            nextStock: 0 + 0 - qtyDelivered + 0, // stockPremonth + receive - outgoing + return
            processedSPKs: spkNo ? [spkNo] : [], // Track SPK yang sudah diproses (untuk OUTGOING)
            lastUpdate: new Date().toISOString(),
          };
          inventory.push(newInventoryEntry);
          console.log(`✅ [Delivery Inventory] New product inventory created (OUTGOING from SPK ${spkNo}):`);
          console.log(`   Product: ${productName} (${productCode})`);
          console.log(`   SPK: ${spkNo} (key tracking untuk OUTGOING)`);
          console.log(`   Outgoing: ${qtyDelivered}`);
          console.log(`   On Going: 0 (new entry)`);
          console.log(`   NextStock: ${0 - qtyDelivered}`);
        }
      }

      // Save updated inventory
      await storageService.set('inventory', inventory);
      console.log('✅ [Delivery Inventory] Inventory saved successfully');
    } catch (error: any) {
      console.error('❌ [Delivery Inventory] Error updating inventory from delivery:', error);
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
        const qcList = await storageService.get<any[]>('qc') || [];
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
        await storageService.set('delivery', updated);
        // Filter out deleted items for local state
        const activeDeliveries = updated.filter(d => !d.deleted);
        setDeliveries(activeDeliveries);

        // IMPORTANT: Inventory update hanya dilakukan setelah upload SJ (di handleUploadSignedDocument)
        // Jangan update inventory saat create delivery note

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
          const deliveriesArray = Array.isArray(deliveries) ? deliveries : [];
          const existingDeliveries = deliveriesArray.filter((d: any) => 
            d.soNo === formData.soNo && 
            d.items?.some((di: any) => di.product === selectedProd.productName)
          );
          const totalDelivered = existingDeliveries.reduce((sum: number, d: any) => {
            const deliveryItem = d.items?.find((di: any) => di.product === selectedProd.productName);
            return sum + (deliveryItem?.qty || 0);
          }, 0);
          
          const remainingQty = selectedProd.qty - totalDelivered;
          if (remainingQty <= 0) {
            continue; // Skip if already fully delivered
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
            qty: remainingQty,
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
      await storageService.set('delivery', updated);
      // Filter out deleted items for local state
      const activeDeliveries = updated.filter(d => !d.deleted);
      setDeliveries(activeDeliveries);

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
          await storageService.set('delivery', updated);
          // Filter out deleted items for local state
          const activeDeliveries = updated.filter(d => !d.deleted);
          setDeliveries(activeDeliveries);
          showAlert('Success', 'Surat Jalan generated');
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
            console.error('Error loading file from file system:', loadError);
            showAlert('Error', `Gagal memuat file: ${loadError.message}`);
            return;
          }
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
          // PDF: Simpan sebagai file dan simpan path-nya saja
          const electronAPI = (window as any).electronAPI;
          
          // Cek apakah Electron API tersedia
          if (!electronAPI) {
            throw new Error('⚠️ Electron API tidak tersedia.\n\nPastikan aplikasi berjalan di Electron app, bukan di browser.\n\nJika sudah di Electron, silakan:\n1. Tutup aplikasi Electron\n2. Buka kembali aplikasi Electron\n3. Coba upload lagi');
          }
          
          if (typeof electronAPI.saveUploadedFile !== 'function') {
            throw new Error('⚠️ Fungsi saveUploadedFile tidak tersedia.\n\nSilakan:\n1. Tutup aplikasi Electron\n2. Buka kembali aplikasi Electron\n3. Coba upload lagi');
          }
          
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
            console.error('Error saving PDF to file system:', fileError);
            
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
          await storageService.set('delivery', updated);
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
              await storageService.set('delivery', updatedWithoutBase64);
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
        const deliverySjNo = uploadedDelivery?.sjNo;
        const deliveryItems = uploadedDelivery?.items || [];
        const deliverySpkNos = deliveryItems.map((item: any) => item.spkNo).filter(Boolean);
        
        // Cari notification yang match dengan delivery note ini
        // Match berdasarkan SPK yang ada di delivery items
        const updatedNotifications = deliveryNotifications.map((n: any) => {
          const notifSpkNo = n.spkNo || (n.spkNos && n.spkNos.length > 0 ? n.spkNos[0] : null);
          const notifSjGroupId = n.sjGroupId || (n.deliveryBatches && n.deliveryBatches[0]?.sjGroupId) || null;
          
          // Match jika SPK ada di delivery items
          const spkMatches = deliverySpkNos.some((deliverySpk: string) => {
            if (!deliverySpk || !notifSpkNo) return false;
            const normalize = (spk: string) => String(spk).trim().toLowerCase().replace(/-/g, '/');
            return normalize(deliverySpk) === normalize(notifSpkNo);
          });
          
          // Jika SPK match, mark notification sebagai DELIVERY_CREATED dan deleted
          if (spkMatches && n.status !== 'DELIVERY_CREATED' && !n.deleted) {
            console.log(`  ✅ Marking notification ${n.id} (SPK: ${notifSpkNo}, sjGroupId: ${notifSjGroupId || 'null'}) as deleted (SJ ${deliverySjNo} completed with signed document)`);
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
        await storageService.set('deliveryNotifications', updatedNotifications);
        console.log(`💾 [SJ Upload] Updated notifications: ${deliveryNotifications.length} → ${updatedNotifications.length} (removed ${deliveryNotifications.length - updatedNotifications.length} completed notifications)`);
        
        // Sync ke server di background (non-blocking, tidak throw error jika gagal)
        setTimeout(() => {
          storageService.syncToServer().catch(() => {
            // Silent fail - sync akan dicoba lagi oleh auto-sync
            // Tidak perlu log error karena auto-sync akan handle retry
          });
        }, 100);

        // IMPORTANT: Update inventory HANYA setelah upload SJ (signed document)
        // Potong onGoing dan tambah outgoing
        try {
          const updatedDelivery = updated.find(d => d.id === item.id);
          if (updatedDelivery) {
            await updateInventoryFromDelivery(updatedDelivery);
          }
        } catch (error: any) {
          console.error('❌ Error updating inventory from delivery note:', error);
          // Jangan block proses, tapi log error
        }

        // IMPORTANT: Finance notification (SUPPLIER_PAYMENT) hanya dibuat saat GRN dibuat di Purchasing module
        // Upload signed document di Delivery Note hanya untuk membuat invoice notification, bukan payment notification

        // Create notification untuk Accounting - Customer Invoice
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

        const invoiceNotifications = await storageService.get<any[]>('invoiceNotifications') || [];
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
        await storageService.set('invoiceNotifications', [...invoiceNotifications, newInvoiceNotification]);

        let alertMsg = `✅ Surat Jalan (yang sudah di TTD) uploaded: ${file.name}\n\n✅ Status updated to CLOSE\n✅ Inventory updated (onGoing reduced, outgoing increased)\n📧 Notification sent to Accounting - Customer Invoice tab`;
        showAlert('Success', alertMsg);
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
    return generateSuratJalanHtml({
      logo,
      company,
      item: suratJalanItem,
      sjData,
      products,
    });
  };

  const handleViewDetail = async (item: DeliveryNote) => {
    try {
      const html = await generateSuratJalanHtmlContent(item);
      setViewPdfData({ html, sjNo: item.sjNo || '' });
    } catch (error: any) {
      showAlert('Error', `Error generating Surat Jalan preview: ${error.message}`);
    }
  };

  const handleSaveToPDF = async () => {
    if (!viewPdfData) return;

    try {
      const electronAPI = (window as any).electronAPI;
      const fileName = `${viewPdfData.sjNo}.pdf`;

      // Check if Electron API is available (for file picker)
      if (electronAPI && typeof electronAPI.savePdf === 'function') {
        // Electron: Use file picker to select save location, then convert HTML to PDF and save
        const result = await electronAPI.savePdf(viewPdfData.html, fileName);
        if (result.success) {
          showAlert('Success', `PDF saved successfully to:\n${result.path}`);
          setViewPdfData(null);
          closeDialog();
        } else if (!result.canceled) {
          showAlert('Error', `Error saving PDF: ${result.error || 'Unknown error'}`);
        }
        // If canceled, do nothing (user closed dialog)
      } else {
        // Browser: Open print dialog, user can select "Save as PDF"
        openPrintWindow(viewPdfData.html);
      }
    } catch (error: any) {
      showAlert('Error', `Error saving PDF: ${error.message}`);
    }
  };

  const handlePrint = async (item: DeliveryNote) => {
    try {
      const html = await generateSuratJalanHtmlContent(item);
      openPrintWindow(html);
    } catch (error: any) {
      showAlert('Error', `Error generating print preview: ${error.message}`);
    }
  };

  const handleCreateFromNotification = async (notif: any) => {
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
        const spkList = n.spkNos || (n.spkNo ? [n.spkNo] : []);
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
          // Validate QC for all notifications
          const qcList = await storageService.get<any[]>('qc') || [];
          const invalidQCs: string[] = [];
          
          // Helper function untuk match SPK (digunakan untuk QC dan Schedule validation)
          const matchSPK = (spk1: string, spk2: string): boolean => {
            if (!spk1 || !spk2) return false;
            const normalize = (spk: string) => String(spk).trim().toLowerCase().replace(/-/g, '/');
            return normalize(spk1) === normalize(spk2);
          };

          for (const n of notificationsToProcess) {
            // Handle new format dengan spkNos array atau old format dengan spkNo single
            const spkList = n.spkNos || (n.spkNo ? [n.spkNo] : []);
            
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
          console.log('[DeliveryNote] ⚠️ Schedule validation SKIPPED for Packaging - all SPKs accepted');

          // Validate inventory stock - cek apakah barang sudah ada di inventory (onGoing stock)
          const inventory = await storageService.get<any[]>('inventory') || [];
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
          
          // DEBUG: Log notification untuk validasi
          console.log('🔍 [Delivery Note] Validating inventory for notification:', {
            id: notif.id,
            isGrouped: notif.isGrouped,
            spkNo: notif.spkNo,
            product: notif.product,
            productId: notif.productId,
            qty: notif.qty,
            hasDeliveryBatches: !!notif.deliveryBatches,
            hasGroupedNotifications: !!notif.groupedNotifications,
          });
          
          // Load SPK data untuk mendapatkan quantity yang tepat
          const spkListData = await storageService.get<any[]>('spk') || [];
          
          // Load schedule untuk ambil quantity (optional, tidak untuk validasi)
          const scheduleList = (() => {
            try {
              let valueStr = localStorage.getItem('schedule');
              if (!valueStr) {
                valueStr = localStorage.getItem('packaging/schedule');
              }
              if (valueStr) {
                const parsed = JSON.parse(valueStr);
                const extracted = parsed.value !== undefined ? parsed.value : parsed;
                return Array.isArray(extracted) ? extracted : [];
              }
            } catch (e) {
              console.warn('[DeliveryNote] Error loading schedule from localStorage:', e);
            }
            return [];
          })();
          
          // Collect dari groupedNotifications atau dari notification langsung
          if (notif.groupedNotifications && Array.isArray(notif.groupedNotifications) && notif.groupedNotifications.length > 0) {
            // Untuk groupedNotifications, ambil quantity dari notification/SPK langsung (schedule hanya optional)
            notif.groupedNotifications.forEach((n: any) => {
              const spkList = n.spkNos || (n.spkNo ? [n.spkNo] : []);
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
              
              if (productName && batchQty > 0) {
                spksToValidate.push({ spkNo, product: productName, productCode: productId, productId, qty: batchQty });
              }
            });
          } else {
            // Single notification - collect dari notification atau deliveryBatches
            if (notif.products && Array.isArray(notif.products) && notif.products.length > 0) {
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
                console.log('⚠️ [Delivery Note] No SPK found for validation, skipping');
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
          
          // DEBUG: Log SPKs to validate
          console.log('🔍 [Delivery Note] SPKs to validate:', spksToValidate);
          
          // Validate setiap SPK (per SPK, bukan per product)
          // IMPORTANT: Cek current stock (nextStock atau receive), bukan onGoing
          // onGoing hanya dipotong setelah upload SJ
          for (const spkItem of spksToValidate) {
            console.log(`🔍 [Delivery Note] Validating SPK: ${spkItem.spkNo}, Product: ${spkItem.product} (Code: ${spkItem.productCode}), Required: ${spkItem.qty}`);
            
            const invItem = findInventoryByProduct(spkItem.productCode, spkItem.product);
            
            if (!invItem) {
              console.log(`❌ [Delivery Note] Product not found in inventory: ${spkItem.product} (Code: ${spkItem.productCode}) for SPK ${spkItem.spkNo}`);
              insufficientStock.push({
                product: `${spkItem.product} (SPK: ${spkItem.spkNo})`,
                required: spkItem.qty,
                available: 0,
              });
              continue;
            }
            
            console.log(`✅ [Delivery Note] Product found in inventory:`, {
              codeItem: invItem.codeItem,
              description: invItem.description,
              receive: invItem.receive,
              onGoing: invItem.onGoing || invItem.on_going || invItem.productionStock,
              nextStock: invItem.nextStock,
            });
            
            // Cek available stock untuk product yang sudah selesai produksi dan QC PASS
            // Untuk product yang sudah selesai produksi, bisa ada di:
            // 1. receive (barang yang sudah diterima dari production/QC)
            // 2. onGoing (production stock yang sudah selesai tapi belum dikirim)
            // 3. nextStock (current stock setelah semua transaksi)
            const getAvailableStock = (item: any): number => {
              if (!item) return 0;
              
              // Untuk product yang sudah selesai produksi dan QC PASS:
              // - receive = barang yang sudah diterima dari production/QC
              // - onGoing = production stock yang sudah selesai tapi belum dikirim
              // - nextStock = stock setelah semua transaksi
              
              // Prioritas: cek receive + onGoing (untuk product yang sudah selesai produksi)
              const receive = item.receive || 0;
              const onGoing = item.onGoing || item.on_going || item.productionStock || 0;
              
              // Available stock = receive + onGoing (untuk product yang sudah selesai produksi)
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
            console.log(`📊 [Delivery Note] Available stock: ${availableStock}, Required: ${spkItem.qty} for SPK ${spkItem.spkNo}`);
            
            // Cek apakah product ada di inventory dengan stock yang cukup
            // Untuk product yang sudah selesai produksi dan QC PASS, seharusnya sudah ada di inventory
            if (availableStock < spkItem.qty) {
              console.log(`❌ [Delivery Note] Insufficient stock: ${spkItem.product} (SPK: ${spkItem.spkNo}) - Required: ${spkItem.qty}, Available: ${availableStock}`);
              insufficientStock.push({
                product: `${spkItem.product} (SPK: ${spkItem.spkNo})`,
                required: spkItem.qty,
                available: availableStock,
              });
            } else {
              console.log(`✅ [Delivery Note] Stock sufficient: ${spkItem.product} (SPK: ${spkItem.spkNo}) - Required: ${spkItem.qty}, Available: ${availableStock}`);
            }
          }
          
          // DEBUG: Log validation result
          console.log('🔍 [Delivery Note] Validation result:', {
            spksToValidateCount: spksToValidate.length,
            insufficientStockCount: insufficientStock.length,
            insufficientStock,
          });
          
          if (insufficientStock.length > 0) {
            const errorMsg = insufficientStock.map(item => 
              `- ${item.product}: Required ${item.required} PCS, Available ${item.available} PCS`
            ).join('\n');
            
            showAlert(
              'Insufficient Inventory Stock',
              `Cannot create Delivery Note\n\nProducts tidak tersedia atau stock tidak cukup:\n\n${errorMsg}\n\nPlease ensure:\n1. Production is CLOSE\n2. QC is PASS and CLOSE\n3. Inventory is updated after QC PASS\n\nIf QC PASS is already done, please check if inventory was updated correctly.`
            );
            return;
          }

          // Get delivery date - prioritize from grouped notification, then from first notification, then from schedule
          let deliveryDate = null;
          if (notif.isGrouped) {
            // For grouped, get from notif.deliveryBatches (already set in grouping)
            deliveryDate = notif.deliveryBatches && notif.deliveryBatches.length > 0
              ? notif.deliveryBatches[0].deliveryDate
              : null;
            // Fallback: try from first grouped notification
            if (!deliveryDate && notificationsToProcess[0].deliveryBatches && notificationsToProcess[0].deliveryBatches.length > 0) {
              deliveryDate = notificationsToProcess[0].deliveryBatches[0].deliveryDate;
            }
          } else {
            // For single notification, get from deliveryBatches
            deliveryDate = notif.deliveryBatches && notif.deliveryBatches.length > 0
              ? notif.deliveryBatches[0].deliveryDate
              : null;
          }
          
          // Fallback: Try to get from schedule data if not found in notification
          if (!deliveryDate) {
            const scheduleList = await storageService.get<any[]>('schedule') || [];
            const firstNotif = notificationsToProcess[0];
            const firstSPKList = firstNotif?.spkNos || (firstNotif?.spkNo ? [firstNotif.spkNo] : []);
            
            if (firstSPKList.length > 0) {
              const relatedSchedule = scheduleList.find((s: any) => {
                if (!s.spkNo) return false;
                return firstSPKList.some((spk: string) => {
                  if (s.spkNo === spk) return true;
                  // Support both formats: old (strip) and new (slash)
                  const normalizeSPK = (s: string) => s.replace(/-/g, '/');
                  const baseSPK = normalizeSPK(spk).split('/').slice(0, 2).join('/');
                  return s.spkNo && s.spkNo.startsWith(baseSPK);
                });
              });
              
              if (relatedSchedule && relatedSchedule.deliveryBatches && relatedSchedule.deliveryBatches.length > 0) {
                deliveryDate = relatedSchedule.deliveryBatches[0].deliveryDate;
              }
            }
          }
          
          console.log('Delivery Date:', deliveryDate, 'from notification:', notif);

          // Create Delivery Note with multiple items
          // IMPORTANT: Handle grouped notification dengan benar - ambil semua SPK dan products
          const deliveryItems: DeliveryNoteItem[] = [];
          
          console.log('🔍 [Delivery Note] Creating items from notification:', notif);
          console.log('   isGrouped:', notif.isGrouped);
          console.log('   products:', notif.products);
          console.log('   deliveryBatches:', notif.deliveryBatches);
          console.log('   groupedNotifications:', notif.groupedNotifications);
          
          // PRIORITAS 1: Jika punya groupedNotifications, ambil quantity dari schedule berdasarkan sjGroupId
          // IMPORTANT: SPK itu 1 product 1, jadi setiap SPK punya quantity sendiri dari schedule
          // IMPORTANT: Items harus diambil dari SPK data, bukan dari SO
          if (notif.groupedNotifications && Array.isArray(notif.groupedNotifications) && notif.groupedNotifications.length > 0) {
            console.log('   ✅ Using groupedNotifications, count:', notif.groupedNotifications.length);
            console.log('   📦 sjGroupId:', notif.sjGroupId);
            
            // Load schedule dan SPK data untuk mendapatkan data yang tepat
            const scheduleList = await storageService.get<any[]>('schedule') || [];
            const spkListData = await storageService.get<any[]>('spk') || [];
            
            notif.groupedNotifications.forEach((n: any) => {
              // Setiap groupedNotification = 1 SPK = 1 product
              const spkList = n.spkNos || (n.spkNo ? [n.spkNo] : []);
              const spkNo = spkList[0] || n.spkNo;
              
              // IMPORTANT: Ambil data dari SPK, bukan dari notification
              const spkData = spkListData.find((s: any) => {
                if (!s.spkNo) return false;
                return spkList.some((spk: string) => matchSPK(s.spkNo, spk));
              });
              
              // Ambil product name dan code dari SPK data
              const productName = spkData?.product || n.product || 'Unknown Product';
              const productId = spkData?.product_id || spkData?.kode || n.productId || '';
              
              // Cari schedule yang match dengan SPK ini
              const relatedSchedule = scheduleList.find((s: any) => {
                if (!s.spkNo) return false;
                return spkList.some((spk: string) => matchSPK(s.spkNo, spk));
              });
              
              // Ambil quantity dari deliveryBatches di schedule yang sesuai dengan sjGroupId
              let batchQty = 0;
              if (relatedSchedule && relatedSchedule.deliveryBatches && relatedSchedule.deliveryBatches.length > 0) {
                // Jika ada sjGroupId, cari batch dengan sjGroupId yang sama
                if (notif.sjGroupId) {
                  const matchingBatch = relatedSchedule.deliveryBatches.find((db: any) => {
                    // Match berdasarkan sjGroupId dan SPK
                    const hasMatchingGroup = db.sjGroupId === notif.sjGroupId;
                    // Pastikan batch ini untuk SPK yang benar (jika batch punya spkNo)
                    if (db.spkNo) {
                      return hasMatchingGroup && spkList.some((spk: string) => matchSPK(db.spkNo, spk));
                    }
                    // Match berdasarkan productId jika tidak ada spkNo
                    if (db.productId && productId) {
                      return hasMatchingGroup && String(db.productId).trim().toLowerCase() === String(productId).trim().toLowerCase();
                    }
                    return hasMatchingGroup;
                  });
                  
                  if (matchingBatch) {
                    batchQty = matchingBatch.qty || 0;
                    console.log(`   ✅ Found batch with sjGroupId ${notif.sjGroupId} for SPK ${spkNo}: qty = ${batchQty}`);
                  }
                }
                
                // Fallback: ambil batch pertama dari schedule yang match (jika tidak ada sjGroupId match)
                if (batchQty === 0) {
                  // Cari batch yang match dengan SPK atau productId
                  const matchingBatch = relatedSchedule.deliveryBatches.find((db: any) => {
                    if (db.spkNo) {
                      return spkList.some((spk: string) => matchSPK(db.spkNo, spk));
                    }
                    if (db.productId && productId) {
                      return String(db.productId).trim().toLowerCase() === String(productId).trim().toLowerCase();
                    }
                    return false;
                  });
                  
                  if (matchingBatch) {
                    batchQty = matchingBatch.qty || 0;
                  } else {
                    const firstBatch = relatedSchedule.deliveryBatches[0];
                    batchQty = firstBatch?.qty || 0;
                  }
                  console.log(`   ⚠️ Using batch from schedule for SPK ${spkNo}: qty = ${batchQty}`);
                }
              }
              
              // Fallback: ambil dari SPK qty jika tidak ada dari schedule
              if (batchQty === 0) {
                batchQty = spkData?.qty || n.qty || 0;
                console.log(`   ⚠️ Using SPK qty for SPK ${spkNo}: qty = ${batchQty}`);
              }
              
              // IMPORTANT: Setiap SPK = 1 item dengan quantity sendiri (tidak digabung)
              // Find product code from products list (untuk productCode)
              const productData = products.find((p: any) => 
                p.nama === productName || 
                p.product_id === productId ||
                p.kode === productId
              );
              
              deliveryItems.push({
                spkNo: spkNo,
                product: productName, // Dari SPK data
                productCode: productData?.kode || productId || '', // Dari SPK atau products list
                qty: batchQty, // Dari schedule deliveryBatches
                unit: 'PCS',
                soNo: spkData?.soNo || n.soNo || notif.soNo || '', // Dari SPK data
                fromInventory: true, // IMPORTANT: Dari SO/SPK berarti dari inventory (production stock)
              });
              console.log(`   ✅ Added from groupedNotification (SPK-based): ${productName} (SPK: ${spkNo}) - Qty: ${batchQty} from schedule`);
            });
          }
          // PRIORITAS 2: Jika punya products array, gunakan itu dengan matching dari deliveryBatches
          // IMPORTANT: Items harus diambil dari SPK data, bukan dari SO
          else if (notif.products && Array.isArray(notif.products) && notif.products.length > 0) {
            // New format: products array dengan spkNo, product, productId
            console.log('   ✅ Using products array, count:', notif.products.length);
            console.log('   📦 deliveryBatches:', JSON.stringify(notif.deliveryBatches, null, 2));
            
            // Load SPK data untuk mendapatkan data yang tepat
            const spkListData = await storageService.get<any[]>('spk') || [];
            const scheduleList = await storageService.get<any[]>('schedule') || [];
            
            notif.products.forEach((p: any, productIdx: number) => {
              const spkNo = p.spkNo || '';
              
              // IMPORTANT: Ambil data dari SPK, bukan dari notification
              const spkData = spkListData.find((s: any) => {
                if (!s.spkNo) return false;
                return matchSPK(s.spkNo, spkNo);
              });
              
              // Ambil product name dan code dari SPK data
              const productName = spkData?.product || p.product || 'Unknown Product';
              const productId = spkData?.product_id || spkData?.kode || p.productId || '';
              
              // Cari schedule yang match dengan SPK ini
              const relatedSchedule = scheduleList.find((s: any) => {
                if (!s.spkNo) return false;
                return matchSPK(s.spkNo, spkNo);
              });
              
              let batchQty = 0;
              
              // Prioritas 1: Ambil dari schedule deliveryBatches
              if (relatedSchedule && relatedSchedule.deliveryBatches && relatedSchedule.deliveryBatches.length > 0) {
                // Match berdasarkan spkNo atau productId
                const matchingBatch = relatedSchedule.deliveryBatches.find((db: any) => {
                  if (db.spkNo) {
                    return matchSPK(db.spkNo, spkNo);
                  }
                  if (db.productId && productId) {
                    return String(db.productId).trim().toLowerCase() === String(productId).trim().toLowerCase();
                  }
                  return false;
                });
                
                if (matchingBatch) {
                  batchQty = matchingBatch.qty || 0;
                  console.log(`   ✅ Found batch from schedule for SPK ${spkNo}: qty = ${batchQty}`);
                }
              }
              
              // Prioritas 2: Cari dari notif.deliveryBatches
              if (batchQty === 0 && notif.deliveryBatches && Array.isArray(notif.deliveryBatches) && notif.deliveryBatches.length > 0) {
                // Match berdasarkan productId atau spkNo
                let matchingBatch = notif.deliveryBatches.find((db: any) => {
                  if (db.productId && productId) {
                    const pId = String(productId).trim().toLowerCase();
                    const dbId = String(db.productId).trim().toLowerCase();
                    return pId === dbId;
                  }
                  if (db.spkNo && spkNo) {
                    return matchSPK(db.spkNo, spkNo);
                  }
                  return false;
                });
                
                if (matchingBatch) {
                  batchQty = matchingBatch.qty || 0;
                  console.log(`   ✅ Found batch from notification for SPK ${spkNo}: qty = ${batchQty}`);
                } else {
                  // Fallback: match berdasarkan index (asumsi urutan sama)
                  if (productIdx < notif.deliveryBatches.length) {
                    batchQty = notif.deliveryBatches[productIdx].qty || 0;
                    console.log(`   ⚠️ Using index fallback for SPK ${spkNo} (idx: ${productIdx}): qty = ${batchQty}`);
                  }
                }
              }
              
              // Fallback: ambil dari SPK qty jika tidak ada dari schedule
              if (batchQty === 0) {
                batchQty = spkData?.qty || p.qty || 0;
                console.log(`   ⚠️ Using SPK qty for SPK ${spkNo}: qty = ${batchQty}`);
              }
              
              // Find product code from products list (untuk productCode)
              const productData = products.find((prod: any) => 
                prod.nama === productName || 
                prod.product_id === productId ||
                prod.kode === productId
              );
              
              deliveryItems.push({
                spkNo: spkNo,
                product: productName, // Dari SPK data
                productCode: productData?.kode || productId || '', // Dari SPK atau products list
                qty: batchQty, // Dari schedule deliveryBatches
                unit: 'PCS',
                soNo: spkData?.soNo || notif.soNo || '', // Dari SPK data
                fromInventory: true, // IMPORTANT: Dari SO/SPK berarti dari inventory (production stock)
              });
              console.log(`   ✅ Added from products array (SPK-based): ${productName} (SPK: ${spkNo}) - Qty: ${batchQty}`);
            });
          } else if (notif.isGrouped && notif.groupedNotifications) {
            // Untuk grouped notification, ambil dari groupedNotifications
            // IMPORTANT: Setiap notification dalam group = 1 SPK dengan 1 product (format baru)
            console.log('   Using groupedNotifications, count:', notif.groupedNotifications.length);
            
            // Load SPK dan schedule data sekali untuk semua notifications dalam group
            const spkListData = await storageService.get<any[]>('spk') || [];
            const scheduleListData = await storageService.get<any[]>('schedule') || [];
            
            notif.groupedNotifications.forEach((n: any) => {
              // Format baru: setiap notification punya spkNo (single) dan product
              const spkNo = n.spkNo || (n.spkNos && n.spkNos.length > 0 ? n.spkNos[0] : null);
              const productName = n.product || 'Unknown Product';
              const productId = n.productId || '';
              
              if (!spkNo) {
                console.warn(`   ⚠️ Notification dalam group tidak punya SPK, skip`);
                return;
              }
              
              // Cari SPK data untuk mendapatkan product info
              const spkData = spkListData.find((s: any) => matchSPK(s.spkNo, spkNo));
              
              // Cari qty dari schedule deliveryBatches (prioritas tertinggi)
              let batchQty = 0;
              
              // Prioritas 1: Cari dari schedule berdasarkan SPK dan sjGroupId
              if (notif.sjGroupId) {
                const relatedSchedule = scheduleListData.find((s: any) => {
                  if (!s.spkNo) return false;
                  return matchSPK(s.spkNo, spkNo);
                });
                
                if (relatedSchedule && relatedSchedule.deliveryBatches && relatedSchedule.deliveryBatches.length > 0) {
                  // Cari batch yang match dengan SPK dan sjGroupId
                  const matchingBatch = relatedSchedule.deliveryBatches.find((db: any) => {
                    if (db.sjGroupId !== notif.sjGroupId) return false;
                    if (db.spkNo) {
                      return matchSPK(db.spkNo, spkNo);
                    }
                    return true; // Jika tidak ada spkNo di batch, gunakan batch pertama dengan sjGroupId yang sama
                  });
                  
                  if (matchingBatch) {
                    batchQty = matchingBatch.qty || 0;
                    console.log(`   ✅ Found batch from schedule for SPK ${spkNo} (sjGroupId: ${notif.sjGroupId}): qty = ${batchQty}`);
                  }
                }
              }
              
              // Prioritas 2: Cari dari n.deliveryBatches (notification level)
              if (batchQty === 0 && n.deliveryBatches && Array.isArray(n.deliveryBatches) && n.deliveryBatches.length > 0) {
                const matchingBatch = n.deliveryBatches.find((db: any) => {
                  if (db.spkNo) {
                    return matchSPK(db.spkNo, spkNo);
                  }
                  return true; // Gunakan batch pertama jika tidak ada spkNo
                });
                
                if (matchingBatch) {
                  batchQty = matchingBatch.qty || 0;
                  console.log(`   ✅ Found batch from notification for SPK ${spkNo}: qty = ${batchQty}`);
                } else {
                  // Fallback: gunakan batch pertama
                  batchQty = n.deliveryBatches[0].qty || 0;
                }
              }
              
              // Prioritas 3: Cari dari notif.deliveryBatches (grouped notification level)
              if (batchQty === 0 && notif.deliveryBatches && Array.isArray(notif.deliveryBatches) && notif.deliveryBatches.length > 0) {
                const matchingBatch = notif.deliveryBatches.find((db: any) => {
                  if (db.spkNo) {
                    return matchSPK(db.spkNo, spkNo);
                  }
                  if (db.productId && productId) {
                    return String(db.productId).trim().toLowerCase() === String(productId).trim().toLowerCase();
                  }
                  return false;
                });
                
                if (matchingBatch) {
                  batchQty = matchingBatch.qty || 0;
                  console.log(`   ✅ Found batch from grouped notification for SPK ${spkNo}: qty = ${batchQty}`);
                }
              }
              
              // Fallback: ambil dari notification qty
              if (batchQty === 0) {
                batchQty = n.qty || 0;
                console.log(`   ⚠️ Using notification qty for SPK ${spkNo}: qty = ${batchQty}`);
              }
              
              // Find product code from products list
              const productData = products.find((prod: any) => 
                prod.nama === productName || 
                prod.product_id === productId ||
                prod.kode === productId
              );
              
              deliveryItems.push({
                spkNo: spkNo,
                product: productName,
                productCode: productData?.kode || productId || '',
                qty: batchQty,
                unit: 'PCS',
                soNo: spkData?.soNo || n.soNo || notif.soNo || '',
                fromInventory: true, // IMPORTANT: Dari SO/SPK berarti dari inventory (production stock)
              });
              console.log(`   ✅ Added from grouped notification (SPK-based): ${productName} (SPK: ${spkNo}) - Qty: ${batchQty}`);
            });
          } else {
            // Untuk single notification (tidak grouped)
            const n = notif;
            console.log('   ⚠️ Single notification, checking products array...');
            // Handle new format dengan products array atau old format
            if (n.products && Array.isArray(n.products) && n.products.length > 0) {
              // New format: products array dengan spkNo, product, productId
              console.log('   ✅ Single notification has products array, count:', n.products.length);
              n.products.forEach((p: any, productIdx: number) => {
                // Cari qty dari deliveryBatches untuk product ini
                let batchQty = 0;
                
                if (n.deliveryBatches && Array.isArray(n.deliveryBatches) && n.deliveryBatches.length > 0) {
                  // Prioritas 1: match berdasarkan productId (exact match)
                  const matchingBatch = n.deliveryBatches.find((db: any) => {
                    if (p.productId && db.productId) {
                      const pId = String(p.productId).trim().toLowerCase();
                      const dbId = String(db.productId).trim().toLowerCase();
                      return pId === dbId;
                    }
                    return false;
                  });
                  
                  if (matchingBatch) {
                    batchQty = matchingBatch.qty || 0;
                    console.log(`   ✅ Found batch for product ${p.product} (productId: ${p.productId}): qty = ${batchQty}`);
                  } else {
                    // Fallback: match berdasarkan index (asumsi urutan sama)
                    if (productIdx < n.deliveryBatches.length) {
                      batchQty = n.deliveryBatches[productIdx].qty || 0;
                      console.log(`   ⚠️ Using index fallback for product ${p.product} (idx: ${productIdx}): qty = ${batchQty}`);
                    }
                  }
                }
                
                // Fallback: bagi qty total dengan jumlah products
                if (batchQty === 0) {
                  const totalQty = n.qty || 0;
                  batchQty = n.products.length > 0 ? Math.round(totalQty / n.products.length) : totalQty;
                  console.log(`   ⚠️ Using qty division fallback for product ${p.product}: qty = ${batchQty} (total: ${totalQty} / ${n.products.length})`);
                }
                
                deliveryItems.push({
                  spkNo: p.spkNo,
                  product: p.product,
                  qty: batchQty,
                  unit: 'PCS',
                  fromInventory: true, // IMPORTANT: Dari SO/SPK berarti dari inventory (production stock)
                });
              });
            } else {
              // Old format: single spkNo dan product atau spkNos array
              const spkList = n.spkNos || (n.spkNo ? [n.spkNo] : []);
              const productName = n.product || 'Unknown Product';
              const qty = n.qty || 0;
              
              // Jika ada multiple SPK, buat item per SPK
              if (spkList.length > 0) {
                spkList.forEach((spk: string, spkIdx: number) => {
                  // Cari qty dari deliveryBatches untuk SPK ini
                  let batchQty = 0;
                  
                  if (n.deliveryBatches && Array.isArray(n.deliveryBatches)) {
                    // Cari batch yang match dengan SPK ini (gunakan matchSPK untuk handle batch format)
                    const matchingBatch = n.deliveryBatches.find((db: any) => {
                      if (db.spkNo) {
                        return matchSPK(db.spkNo, spk);
                      }
                      // Fallback: match berdasarkan index
                      return true;
                    });
                    if (matchingBatch && matchingBatch.qty) {
                      batchQty = matchingBatch.qty;
                    } else if (spkIdx < n.deliveryBatches.length) {
                      // Fallback: ambil berdasarkan index
                      batchQty = n.deliveryBatches[spkIdx].qty || 0;
                    }
                  }
                  
                  // Fallback: bagi qty total dengan jumlah SPK (HARUS DIHINDARI, seharusnya sudah ada di deliveryBatches)
                  if (batchQty === 0) {
                    batchQty = spkList.length > 1 ? (qty / spkList.length) : qty;
                    console.warn(`   ⚠️ Using qty division fallback for SPK ${spk}: qty = ${batchQty} (total: ${qty} / ${spkList.length})`);
                  }
                  
                  deliveryItems.push({
                    spkNo: spk,
                    product: productName,
                    qty: batchQty,
                    unit: 'PCS',
                    fromInventory: true, // IMPORTANT: Dari SO/SPK berarti dari inventory (production stock)
                  });
                });
              } else {
                // Single SPK - ambil qty dari deliveryBatches yang match dengan SPK ini
                let batchQty = qty;
                
                if (n.deliveryBatches && Array.isArray(n.deliveryBatches) && n.deliveryBatches.length > 0) {
                  if (n.spkNo) {
                    // Cari batch yang match dengan SPK ini
                    const matchingBatch = n.deliveryBatches.find((db: any) => {
                      if (db.spkNo) {
                        return matchSPK(db.spkNo, n.spkNo);
                      }
                      return true; // Jika batch tidak punya spkNo, gunakan batch pertama
                    });
                    if (matchingBatch && matchingBatch.qty) {
                      batchQty = matchingBatch.qty;
                      console.log(`   ✅ Found batch for SPK ${n.spkNo}: qty = ${batchQty}`);
                    } else {
                      // Fallback: ambil batch pertama
                      batchQty = n.deliveryBatches[0].qty || batchQty;
                      console.log(`   ⚠️ Using first batch for SPK ${n.spkNo}: qty = ${batchQty}`);
                    }
                  } else {
                    // Jika tidak ada SPK, ambil batch pertama
                    batchQty = n.deliveryBatches[0].qty || batchQty;
                  }
                }
                
                deliveryItems.push({
                  spkNo: n.spkNo,
                  product: productName,
                  qty: batchQty, // Dari deliveryBatches yang match dengan SPK
                  unit: 'PCS',
                  fromInventory: true, // IMPORTANT: Dari SO/SPK berarti dari inventory (production stock)
                });
                console.log(`   ✅ Added single item (SPK-based): ${productName} (SPK: ${n.spkNo}) - Qty: ${batchQty}`);
              }
            }
          }
          
          // IMPORTANT: Pastikan semua items dibuat dengan benar
          // Jika deliveryItems kosong, coba buat dari notif.products atau notif.spkNos
          if (deliveryItems.length === 0) {
            console.warn('⚠️ [Delivery Note] deliveryItems kosong, coba buat dari notif.products atau notif.spkNos');
            if (notif.products && Array.isArray(notif.products)) {
              notif.products.forEach((p: any) => {
                deliveryItems.push({
                  spkNo: p.spkNo,
                  product: p.product,
                  qty: notif.qty || 0, // Fallback: gunakan total qty jika tidak ada batch
                  unit: 'PCS',
                  fromInventory: true, // IMPORTANT: Dari SO/SPK berarti dari inventory (production stock)
                });
              });
            } else if (notif.spkNos && Array.isArray(notif.spkNos)) {
              const qtyPerSPK = notif.spkNos.length > 0 ? ((notif.qty || 0) / notif.spkNos.length) : (notif.qty || 0);
              notif.spkNos.forEach((spk: string) => {
                deliveryItems.push({
                  spkNo: spk,
                  product: notif.product || 'Unknown Product',
                  qty: qtyPerSPK,
                  unit: 'PCS',
                  fromInventory: true, // IMPORTANT: Dari SO/SPK berarti dari inventory (production stock)
                });
              });
            } else {
              // Fallback terakhir: single item
              deliveryItems.push({
                spkNo: notif.spkNo,
                product: notif.product || 'Unknown Product',
                qty: notif.qty || 0,
                unit: 'PCS',
                fromInventory: true, // IMPORTANT: Dari SO/SPK berarti dari inventory (production stock)
              });
            }
          }
          
          console.log('✅ [Delivery Note] Created deliveryItems:', deliveryItems);
          console.log('   Total items:', deliveryItems.length);
          deliveryItems.forEach((item, idx) => {
            console.log(`   Item ${idx + 1}: ${item.product} (SPK: ${item.spkNo}) - Qty: ${item.qty}`);
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
            soNo: notif.soNo,
            customer: notif.customer,
            items: deliveryItems, // Items dengan semua SPK dan products
            status: 'OPEN' as const,
            deliveryDate: deliveryDate || undefined,
          };
          
          // Load all deliveries from storage (including deleted ones)
          const allDeliveries = await storageService.get<DeliveryNote[]>('delivery') || [];
          const updated = [...allDeliveries, newDelivery];
          await storageService.set('delivery', updated);
          // Filter out deleted items for local state
          const activeDeliveries = updated.filter(d => !d.deleted);
          setDeliveries(activeDeliveries);

          // IMPORTANT: Inventory update hanya dilakukan setelah upload SJ (di handleUploadSignedDocument)
          // Jangan update inventory saat create delivery note

          // IMPORTANT: Jangan hapus notification saat create delivery note
          // Notification hanya akan dihapus setelah signed document di-upload (SJ sudah jadi)
          // Ini memastikan jika delivery note belum upload signed doc, notification tetap ada
          console.log(`💾 [Delivery Create] Created delivery note ${sjNo} from ${notificationsToProcess.length} notification(s)`);
          console.log(`  Notifications will be removed only after signed document is uploaded (SJ is complete)`);
          console.log(`  Processing notifications:`, notificationsToProcess.map((n: any) => ({
            id: n.id,
            spkNo: n.spkNo,
            sjGroupId: n.sjGroupId || 'null',
          })));

          const itemCount = deliveryItems.length;
          const totalQty = deliveryItems.reduce((sum, item) => sum + (item.qty || 0), 0);
          showAlert('Success', `✅ Delivery Note created: ${sjNo}\n\n${itemCount} product(s):\n${deliveryItems.map((item, idx) => `  ${idx + 1}. ${item.product} - ${item.qty} PCS (SPK: ${item.spkNo})`).join('\n')}\n\nTotal Qty: ${totalQty} PCS\n\n📝 Please upload signed document to update inventory.`);
          
          // Reload deliveries dan notifications untuk update UI
          await loadDeliveries();
          await loadNotifications();
        } catch (error: any) {
          showAlert('Error', `Error creating Delivery Note: ${error.message}`);
        }
      }
    );
  };

  const handleUpdateStatus = async (item: DeliveryNote) => {
    showPrompt(
      'Update Status',
      `Update status for SJ: ${item.sjNo}\n\nCurrent: ${item.status}\n\nEnter new status (DRAFT/OPEN/CLOSE):`,
      item.status || '',
      async (newStatus: string) => {
        if (newStatus && newStatus !== item.status && ['DRAFT', 'OPEN', 'CLOSE'].includes(newStatus.toUpperCase())) {
          const normalizedStatus = newStatus.toUpperCase();
          // Jika mau close, wajib upload signed document
          if (normalizedStatus === 'CLOSE' && !item.signedDocument && !item.signedDocumentPath) {
            showAlert('Validation Error', '⚠️ Cannot close Delivery Note without signed document!\n\nPlease upload signed document (Surat Jalan yang sudah di TTD) first.');
            return;
          }

          try {
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
            await storageService.set('delivery', updated);
            // Filter out deleted items for local state
            const activeDeliveries = updated.filter(d => !d.deleted);
            setDeliveries(activeDeliveries);
            showAlert('Success', `✅ Status updated to: ${normalizedStatus}`);
          } catch (error: any) {
            showAlert('Error', `Error updating status: ${error.message}`);
          }
        } else if (newStatus && newStatus !== item.status) {
          showAlert('Validation Error', 'Invalid status! Please enter DRAFT, OPEN, or CLOSE.');
        }
      },
      'DRAFT/OPEN/CLOSE'
    );
  };

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
    showConfirm(
      'Delete Delivery Note',
      `Are you sure you want to delete delivery note ${item.sjNo || item.id}?\n\n⚠️ Data akan dihapus dengan aman (tombstone pattern) untuk mencegah auto-sync mengembalikan data.\n\nThis action cannot be undone.`,
      async () => {
        try {
          // ENHANCED: Use safe deletion with tombstone pattern
          const success = await safeDeleteItem('delivery', item.id, 'id');
          
          if (success) {
            // Refresh data to show updated list (without deleted items)
            await loadDeliveries();
            
            showAlert('Success', `✅ Delivery Note ${item.sjNo || item.id} berhasil dihapus dengan aman.\n\n🛡️ Data dilindungi dari auto-sync restoration.`);
            
            console.log(`[DeliveryNote] Safely deleted DN ${item.sjNo || item.id} (ID: ${item.id}) using tombstone pattern`);
          } else {
            showAlert('Error', `❌ Error deleting delivery note ${item.sjNo || item.id}. Please try again.`);
          }
        } catch (error: any) {
          console.error('[DeliveryNote] Error in safe delete:', error);
          showAlert('Error', `❌ Error deleting delivery note: ${error.message}`);
        }
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
    
    // Tab filter - Outstanding tab hanya show status OPEN
    if (activeTab === 'outstanding') {
      filtered = filtered.filter(delivery => delivery.status === 'OPEN');
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
  }, [deliveries, searchQuery, activeTab]);

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
      // Use soNos if available (multi-SO), otherwise use soNo
      const soNos = delivery.soNos && delivery.soNos.length > 0 ? delivery.soNos : [delivery.soNo || 'NO_SO'];
      const soNosKey = soNos.sort().join(',');
      const key = `${soNosKey}|${delivery.customer || '-'}`;
      if (!groups[key]) {
        groups[key] = {
          soNo: soNos.length > 1 ? soNos.join(', ') : (delivery.soNo || '-'),
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

  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Ensure scheduleData is always an array (declare at function start for scope)
      const scheduleArray = Array.isArray(scheduleData) ? scheduleData : [];
      
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
      
      // Sheet 1: All Delivery Notes - Format: NO | PRODUCT CODE | ITEM | QTY | UOM | DESCRIPTION (SO-xxx)
      const allDeliveryData: any[] = [];
      let globalItemNo = 0;
      deliveries.forEach((delivery: DeliveryNote) => {
        if (delivery.items && delivery.items.length > 0) {
          delivery.items.forEach((item) => {
            globalItemNo++;
            const itemSoNo = item.soNo || delivery.soNo || (delivery.soNos && delivery.soNos.length > 0 ? delivery.soNos[0] : '');
            const description = itemSoNo ? `(${itemSoNo})` : '';
            
            allDeliveryData.push({
              no: globalItemNo,
              productCode: item.productCode || '',
              item: item.product || delivery.product || '',
              qty: typeof item.qty === 'string' ? parseFloat(item.qty) : (item.qty || 0),
              uom: item.unit || 'PCS',
              description: description,
              // Additional fields for reference
              sjNo: delivery.sjNo || '',
              soNo: delivery.soNos && delivery.soNos.length > 1 ? delivery.soNos.join(', ') : delivery.soNo,
              customer: delivery.customer,
              spkNo: item.spkNo || delivery.spkNo || '',
              driver: delivery.driver || '',
              vehicleNo: delivery.vehicleNo || '',
              status: delivery.status,
              deliveryDate: delivery.deliveryDate || '',
              signedDocument: delivery.signedDocument ? 'Yes' : 'No',
              signedDocumentName: delivery.signedDocumentName || '',
            });
          });
        } else {
          globalItemNo++;
          const description = delivery.soNo ? `(${delivery.soNo})` : (delivery.soNos && delivery.soNos.length > 0 ? `(${delivery.soNos.join(', ')})` : '');
          
          allDeliveryData.push({
            no: globalItemNo,
            productCode: '',
            item: delivery.product || '',
            qty: delivery.qty || 0,
            uom: 'PCS',
            description: description,
            // Additional fields for reference
            sjNo: delivery.sjNo || '',
            soNo: delivery.soNos && delivery.soNos.length > 1 ? delivery.soNos.join(', ') : delivery.soNo,
            customer: delivery.customer,
            spkNo: delivery.spkNo || '',
            driver: delivery.driver || '',
            vehicleNo: delivery.vehicleNo || '',
            status: delivery.status,
            deliveryDate: delivery.deliveryDate || '',
            signedDocument: delivery.signedDocument ? 'Yes' : 'No',
            signedDocumentName: delivery.signedDocumentName || '',
          });
        }
      });

      if (allDeliveryData.length > 0) {
        const deliveryColumns: ExcelColumn[] = [
          { key: 'no', header: 'NO', width: 8, format: 'number' },
          { key: 'productCode', header: 'PRODUCT CODE', width: 20 },
          { key: 'item', header: 'ITEM', width: 40 },
          { key: 'qty', header: 'QTY', width: 12, format: 'number' },
          { key: 'uom', header: 'UOM', width: 10 },
          { key: 'description', header: 'DESCRIPTION', width: 25 },
          // Additional columns for reference
          { key: 'sjNo', header: 'SJ No', width: 20 },
          { key: 'soNo', header: 'SO No', width: 20 },
          { key: 'customer', header: 'Customer', width: 30 },
          { key: 'spkNo', header: 'SPK No', width: 20 },
          { key: 'driver', header: 'Driver', width: 20 },
          { key: 'vehicleNo', header: 'Vehicle No', width: 15 },
          { key: 'status', header: 'Status', width: 15 },
          { key: 'deliveryDate', header: 'Delivery Date', width: 18, format: 'date' },
          { key: 'signedDocument', header: 'Signed Document', width: 15 },
          { key: 'signedDocumentName', header: 'Document Name', width: 30 },
        ];
        const wsDelivery = createStyledWorksheet(allDeliveryData, deliveryColumns, 'Sheet 1 - Delivery');
        setColumnWidths(wsDelivery, deliveryColumns);
        const totalQty = allDeliveryData.reduce((sum, d) => sum + (d.qty || 0), 0);
        addSummaryRow(wsDelivery, deliveryColumns, {
          no: 'TOTAL',
          qty: totalQty,
        });
        XLSX.utils.book_append_sheet(wb, wsDelivery, 'Sheet 1 - Delivery');
      }

      // Sheet 2: Schedule Data
      if (scheduleArray.length > 0) {
        const scheduleDataExport = scheduleArray.map((schedule: any) => ({
          scheduleDate: schedule.scheduleDate || '',
          scheduleEndDate: schedule.scheduleEndDate || '',
          deliveryDate: schedule.deliveryDate || '',
          soNo: schedule.soNo || '',
          spkNo: schedule.spkNo || '',
          customer: schedule.customer || '',
          productCode: schedule.productCode || '',
          productName: schedule.productName || '',
          qty: schedule.qty || 0,
          unit: schedule.unit || '',
          progress: schedule.progress || 0,
          status: schedule.status || '',
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
          { key: 'status', header: 'Status', width: 15 },
        ];
        const wsSchedule = createStyledWorksheet(scheduleDataExport, scheduleColumns, 'Sheet 2 - Schedule');
        setColumnWidths(wsSchedule, scheduleColumns);
        const totalScheduleQty = scheduleDataExport.reduce((sum, s) => sum + (s.qty || 0), 0);
        addSummaryRow(wsSchedule, scheduleColumns, {
          scheduleDate: 'TOTAL',
          qty: totalScheduleQty,
        });
        XLSX.utils.book_append_sheet(wb, wsSchedule, 'Sheet 2 - Schedule');
      }

      // Sheet 3: Outstanding (Delivery dengan status OPEN)
      const deliveriesArray = Array.isArray(deliveries) ? deliveries : [];
      const outstandingDeliveries = deliveriesArray.filter((d: DeliveryNote) => d.status === 'OPEN');
      const outstandingData: any[] = [];
      outstandingDeliveries.forEach((delivery: DeliveryNote) => {
        if (delivery.items && delivery.items.length > 0) {
          delivery.items.forEach((item, idx) => {
            outstandingData.push({
              sjNo: delivery.sjNo || '',
              soNo: delivery.soNo,
              customer: delivery.customer,
              spkNo: delivery.spkNo || '',
              itemNo: idx + 1,
              product: item.product || delivery.product || '',
              qty: typeof item.qty === 'string' ? parseFloat(item.qty) : (item.qty || 0),
              unit: item.unit || 'PCS',
              deliveryDate: delivery.deliveryDate || '',
            });
          });
        } else {
          outstandingData.push({
            sjNo: delivery.sjNo || '',
            soNo: delivery.soNo,
            customer: delivery.customer,
            spkNo: delivery.spkNo || '',
            itemNo: 1,
            product: delivery.product || '',
            qty: delivery.qty || 0,
            unit: 'PCS',
            deliveryDate: delivery.deliveryDate || '',
          });
        }
      });

      if (outstandingData.length > 0) {
        const outstandingColumns: ExcelColumn[] = [
          { key: 'sjNo', header: 'SJ No', width: 20 },
          { key: 'soNo', header: 'SO No', width: 20 },
          { key: 'spkNo', header: 'SPK No', width: 20 },
          { key: 'customer', header: 'Customer', width: 30 },
          { key: 'itemNo', header: 'Item No', width: 10, format: 'number' },
          { key: 'product', header: 'Product', width: 40 },
          { key: 'qty', header: 'Qty', width: 12, format: 'number' },
          { key: 'unit', header: 'Unit', width: 10 },
          { key: 'deliveryDate', header: 'Delivery Date', width: 18, format: 'date' },
          { key: 'created', header: 'Created Date', width: 18, format: 'date' },
        ];
        const wsOutstanding = createStyledWorksheet(outstandingData, outstandingColumns, 'Sheet 3 - Outstanding');
        setColumnWidths(wsOutstanding, outstandingColumns);
        const totalOutstandingQty = outstandingData.reduce((sum, o) => sum + (o.qty || 0), 0);
        addSummaryRow(wsOutstanding, outstandingColumns, {
          sjNo: 'TOTAL',
          qty: totalOutstandingQty,
        });
        XLSX.utils.book_append_sheet(wb, wsOutstanding, 'Sheet 3 - Outstanding');
      }

      if (wb.SheetNames.length === 0) {
        showAlert('Error', 'No data available to export');
        return;
      }

      const fileName = `Delivery_Notes_Complete_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      // scheduleArray already declared above at function start
      showAlert('Success', `✅ Exported complete delivery data (${allDeliveryData.length} items, ${scheduleArray.length} schedule, ${outstandingData.length} outstanding) to ${fileName}`);
    } catch (error: any) {
      showAlert('Error', `Error exporting to Excel: ${error.message}`);
    }
  };

  const columns = [
    { key: 'sjNo', header: 'SJ No (Surat Jalan No)' },
    { key: 'soNo', header: 'SO No' },
    { key: 'customer', header: 'Customer' },
    {
      key: 'product',
      header: 'Product(s)',
      render: (item: DeliveryNote) => {
        if (item.items && Array.isArray(item.items) && item.items.length > 0) {
          const items = item.items;
          return (
            <div>
              {items.map((itm: any, idx: number) => (
                <div key={idx} style={{ marginBottom: idx < items.length - 1 ? '4px' : '0' }}>
                  {itm.product} ({itm.qty} {itm.unit || 'PCS'})
                </div>
              ))}
            </div>
          );
        }
        // Fallback untuk old format
        return <div>{item.product || '-'} ({item.qty || 0} PCS)</div>;
      },
    },
    {
      key: 'qty',
      header: 'Total Qty',
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
      header: 'Tanggal Kirim',
      render: (item: DeliveryNote) => (
        <div>{formatDateSimple(item.deliveryDate)}</div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: DeliveryNote) => (
        <span className={`status-badge status-${item.status.toLowerCase()}`}>
          {item.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: DeliveryNote) => renderDeliveryActions(item),
    },
  ];

  // Format notifications untuk NotificationBell
  // IMPORTANT: Tampilkan SPK dengan suffix -SJ{number} dengan jelas untuk menunjukkan batch delivery
  const deliveryNotifications = useMemo(() => {
    return notifications.map((notif: any) => {
      // Ambil SPK number (dengan suffix -SJ{number} jika ada)
      const spkNo = notif.spkNo || (notif.spkNos && notif.spkNos.length > 0 ? notif.spkNos[0] : 'N/A');
      
      // Cek apakah SPK punya suffix -SJ{number}
      const hasSjSuffix = /-SJ\d+$/.test(spkNo);
      
      // Ambil sjGroupId untuk display
      const sjGroupId = notif.sjGroupId || (notif.deliveryBatches && notif.deliveryBatches[0]?.sjGroupId) || null;
      const sjDisplay = sjGroupId ? sjGroupId.replace('sj-group-', 'SJ-') : '';
      
      // Format message dengan SPK dan batch info
      let message = `SPK: ${spkNo}`;
      if (hasSjSuffix) {
        // Jika sudah punya suffix -SJ{number}, tampilkan dengan jelas
        const sjMatch = spkNo.match(/-SJ(\d+)$/);
        const sjNumber = sjMatch ? sjMatch[1] : '';
        message = `SPK: ${spkNo} (Batch ${sjNumber})`;
      } else if (sjDisplay) {
        // Jika belum punya suffix tapi punya sjGroupId, tambahkan info batch
        message = `SPK: ${spkNo} | ${sjDisplay}`;
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

  return (
    <div className="module-compact">
      <div className="page-header">
        <h1>WH/Delivery (Surat Jalan)</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {notifications.length > 0 && (
            <NotificationBell
              notifications={deliveryNotifications}
              onNotificationClick={(notification) => {
                if (notification.notif) {
                  handleCreateFromNotification(notification.notif);
                }
              }}
              icon="📧"
              emptyMessage="Tidak ada notifikasi delivery"
            />
          )}
          <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
          <Button onClick={handleCreate}>+ Create Delivery Note</Button>
        </div>
      </div>

      {showCreateDeliveryNoteDialog && (
        <CreateDeliveryNoteDialog
          deliveries={deliveries}
          onClose={() => setShowCreateDeliveryNoteDialog(false)}
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
                  created: new Date().toISOString(),
                  lastUpdate: new Date().toISOString(),
                  timestamp: Date.now(),
                  _timestamp: Date.now(),
                };
                
                const allDeliveries = await storageService.get<DeliveryNote[]>('delivery') || [];
                const updated = [...allDeliveries, newDelivery];
                await storageService.set('delivery', updated);
                const activeDeliveries = updated.filter(d => !d.deleted);
                setDeliveries(activeDeliveries);
                
                showAlert('Success', `Delivery Note ${sjNo} berhasil dibuat dari ${data.sjNos.length} SJ`);
              } else if (data.poNos && data.poNos.length > 0) {
                // Create SJ dari PO yang dipilih
                const poData = await storageService.get<any[]>('purchaseOrders') || [];
                const selectedPOItems = poData.filter((po: any) => data.poNos!.includes(po.poNo));
                
                // Ambil SO dari PO
                const soData = await storageService.get<any[]>('salesOrders') || [];
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
                  created: new Date().toISOString(),
                  lastUpdate: new Date().toISOString(),
                  timestamp: Date.now(),
                  _timestamp: Date.now(),
                };
                
                const allDeliveries = await storageService.get<DeliveryNote[]>('delivery') || [];
                const updated = [...allDeliveries, newDelivery];
                await storageService.set('delivery', updated);
                const activeDeliveries = updated.filter(d => !d.deleted);
                setDeliveries(activeDeliveries);
                
                showAlert('Success', `Delivery Note ${sjNo} berhasil dibuat dari ${data.poNos.length} PO`);
              } else if (data.soNos && data.soNos.length > 0) {
                // Create SJ dari SO yang dipilih
                const soData = await storageService.get<any[]>('salesOrders') || [];
                const selectedSOItems = soData.filter((so: any) => data.soNos!.includes(so.soNo));
                
                const allItems: DeliveryNoteItem[] = [];
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
                  created: new Date().toISOString(),
                  lastUpdate: new Date().toISOString(),
                  timestamp: Date.now(),
                  _timestamp: Date.now(),
                };
                
                const allDeliveries = await storageService.get<DeliveryNote[]>('delivery') || [];
                const updated = [...allDeliveries, newDelivery];
                await storageService.set('delivery', updated);
                const activeDeliveries = updated.filter(d => !d.deleted);
                setDeliveries(activeDeliveries);
                
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
                  created: new Date().toISOString(),
                  lastUpdate: new Date().toISOString(),
                  timestamp: Date.now(),
                  _timestamp: Date.now(),
                };
                
                const allDeliveries = await storageService.get<DeliveryNote[]>('delivery') || [];
                const updated = [...allDeliveries, newDelivery];
                await storageService.set('delivery', updated);
                const activeDeliveries = updated.filter(d => !d.deleted);
                setDeliveries(activeDeliveries);
                
                showAlert('Success', `Delivery Note ${sjNo} berhasil dibuat`);
              }
              
              await loadDeliveries();
              setShowCreateDeliveryNoteDialog(false);
            } catch (error: any) {
              console.error('Error creating delivery note:', error);
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
                      style={{ marginTop: '8px', fontSize: '11px', padding: '5px 10px' }}
                    >
                      🚚 Create Delivery Note
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
                        marginBottom: '4px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProducts([...selectedProducts, prod]);
                          } else {
                            setSelectedProducts(selectedProducts.filter(sp => 
                              !(sp.productId === prod.productId && sp.productName === prod.productName)
                            ));
                          }
                        }}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1, color: 'var(--text-primary)' }}>
                        <div style={{ fontWeight: isSelected ? '600' : '400' }}>
                          {prod.productCode ? `[${prod.productCode}] ` : ''}{prod.productName}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Qty: {prod.qty} {prod.unit}
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

      <Card>
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
        </div>

        <div className="tab-content">
          {activeTab === 'delivery' && (
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
                                      {delivery.soNos && Array.isArray(delivery.soNos) && delivery.soNos.length > 1 ? (
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
                ) : (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {searchQuery ? 'No deliveries found matching your search' : 'No deliveries'}
                  </div>
                )
              ) : (
                <Table columns={columns} data={filteredDeliveries} emptyMessage={searchQuery ? "No deliveries found matching your search" : "No deliveries"} />
              )}
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
              <Table columns={columns} data={filteredDeliveries} emptyMessage="No outstanding deliveries" />
            </>
          )}
          {activeTab === 'schedule' && (
            <ScheduleTable
              data={transformedScheduleData}
              onScheduleClick={handleScheduleClick}
            />
          )}
        </div>
      </Card>

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
            await storageService.set('delivery', updated);
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
                  <Button variant="primary" onClick={handleSaveToPDF}>
                    💾 Save to PDF
                  </Button>
                  <Button variant="secondary" onClick={() => {
                    setViewPdfData(null);
                    closeDialog();
                  }}>
                    ✕ Close
                  </Button>
                </div>
              </div>
              <iframe
                srcDoc={viewPdfData.html}
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
      setProducts(productsData);
      setCustomers(customersData);
      setInventory(inventoryData);
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
          // PDF: Simpan sebagai file dan simpan path-nya saja
          const electronAPI = (window as any).electronAPI;
          if (electronAPI && typeof electronAPI.saveUploadedFile === 'function') {
            try {
              const result = await electronAPI.saveUploadedFile(base64, signedFile.name, 'pdf');
              if (result.success) {
                signedDocumentPath = result.path;
                // Simpan path sebagai reference, bukan base64
                signedDocument = `file://${result.path}`;
                signedDocumentType = 'pdf';
                console.log(`[EditSJ] PDF saved to file system: ${result.path}`);
              } else {
                throw new Error(result.error || 'Failed to save PDF file');
              }
            } catch (fileError: any) {
              console.error('Error saving PDF to file system:', fileError);
              // Fallback: coba simpan sebagai base64 jika file system gagal (untuk file kecil)
              if (base64.length < 5000000) { // 5MB limit
                signedDocument = base64;
                signedDocumentType = 'pdf';
                signedDocumentPath = undefined;
                console.warn('[EditSJ] Fallback: Saving PDF as base64 (file system failed)');
              } else {
                showAlert('Error', `PDF terlalu besar untuk disimpan. Error: ${fileError.message}`);
                return;
              }
            }
          } else {
            // Browser mode: coba simpan sebagai base64 jika kecil
            if (base64.length < 5000000) { // 5MB limit
              signedDocument = base64;
              signedDocumentType = 'pdf';
              signedDocumentPath = undefined;
              console.warn('[EditSJ] Browser mode: Saving PDF as base64 (may exceed quota)');
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
  onCreate
}: {
  deliveries: DeliveryNote[];
  onClose: () => void;
  onCreate: (data: { poNos?: string[]; soNos?: string[]; sjNos?: string[]; manualData?: any }) => Promise<void>;
}) => {
  const [purchaseOrderList, setPurchaseOrderList] = useState<any[]>([]);
  const [salesOrderList, setSalesOrderList] = useState<any[]>([]);
  const [deliveryNoteList, setDeliveryNoteList] = useState<any[]>([]);
  const [selectedPOs, setSelectedPOs] = useState<string[]>([]);
  const [selectedSOs, setSelectedSOs] = useState<string[]>([]);
  const [selectedSJs, setSelectedSJs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'po' | 'so' | 'sj' | 'manual'>('po');
  
  // Auto-populated data dari PO yang dipilih
  const [autoPOCustomer, setAutoPOCustomer] = useState('');
  const [autoPOItems, setAutoPOItems] = useState<Array<{ product: string; productCode?: string; qty: number; unit?: string; spkNo?: string; soNo?: string }>>([]);
  
  // Auto-populated data dari SO yang dipilih
  const [autoSOCustomer, setAutoSOCustomer] = useState('');
  const [autoSOItems, setAutoSOItems] = useState<Array<{ product: string; productCode?: string; qty: number; unit?: string; spkNo?: string; soNo?: string }>>([]);
  
  // Auto-populated data dari SJ yang dipilih
  const [autoSJCustomer, setAutoSJCustomer] = useState('');
  const [autoSJItems, setAutoSJItems] = useState<Array<{ product: string; productCode?: string; qty: number; unit?: string; spkNo?: string; soNo?: string }>>([]);
  
  // Manual input fields
  const [manualCustomer, setManualCustomer] = useState('');
  const [manualItems, setManualItems] = useState<Array<{ product: string; productCode?: string; qty: number; unit?: string; spkNo?: string }>>([{ product: '', productCode: '', qty: 1, unit: 'PCS' }]);
  const [deliveryDate, setDeliveryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  
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
      } catch (error: any) {
        console.error('Error loading data:', error);
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
        const selectedSOItems = soData.filter((so: any) => selectedSOs.includes(so.soNo));
        
        if (selectedSOItems.length > 0) {
          const firstSO = selectedSOItems[0];
          setAutoSOCustomer(firstSO.customer || '');
          
          const allItems: Array<{ product: string; productCode?: string; qty: number; unit?: string; spkNo?: string; soNo?: string }> = [];
          
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
  
  const handleCreate = async () => {
    if (mode === 'po') {
      if (selectedPOs.length === 0) {
        alert('Pilih minimal 1 Purchase Order');
        return;
      }
      if (!autoPOCustomer || autoPOItems.length === 0) {
        alert('Tunggu data dimuat dari PO yang dipilih');
        return;
      }
      await onCreate({ 
        poNos: selectedPOs,
        manualData: {
          customer: autoPOCustomer,
          items: autoPOItems,
          deliveryDate,
        }
      });
    } else if (mode === 'so') {
      if (selectedSOs.length === 0) {
        alert('Pilih minimal 1 Sales Order');
        return;
      }
      if (!autoSOCustomer || autoSOItems.length === 0) {
        alert('Tunggu data dimuat dari SO yang dipilih');
        return;
      }
      await onCreate({ 
        soNos: selectedSOs,
        manualData: {
          customer: autoSOCustomer,
          items: autoSOItems,
          deliveryDate,
        }
      });
    } else {
      if (!manualCustomer || manualItems.length === 0 || manualItems.some(item => !item.product || item.qty <= 0)) {
        alert('Isi customer dan minimal 1 item dengan product dan qty > 0');
        return;
      }
      await onCreate({ 
        manualData: {
          customer: manualCustomer,
          items: manualItems,
          deliveryDate,
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
                  Pilih Purchase Order
                </label>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '4px', padding: '8px' }}>
                  {purchaseOrderList.map((po: any) => (
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
                  Pilih Sales Order
                </label>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '4px', padding: '8px' }}>
                  {salesOrderList.map((so: any) => (
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
                  {salesOrderList.length === 0 && (
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
                    <strong>Items:</strong>
                    <div style={{ marginTop: '4px' }}>
                      {autoSOItems.map((item, idx) => (
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
          
          {mode === 'sj' && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Pilih Surat Jalan
                </label>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '4px', padding: '8px' }}>
                  {deliveryNoteList.map((sj: any) => (
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
                  {deliveryNoteList.length === 0 && (
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

export default DeliveryNote;
