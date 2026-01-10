import { useState, useEffect, useMemo, useRef } from 'react';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Input from '../../components/Input';
import ScheduleTable from '../../components/ScheduleTable';
import NotificationBell from '../../components/NotificationBell';
import { storageService, extractStorageValue } from '../../services/storage';
import { safeDeleteItem, filterActiveItems } from '../../utils/data-persistence-helper';
import { generateSuratJalanHtml, generateGTDeliveryNoteHtml } from '../../pdf/suratjalan-pdf-template';
import { openPrintWindow, isMobile, isCapacitor, savePdfForMobile } from '../../utils/actions';
import { useDialog } from '../../hooks/useDialog';
import { loadLogoAsBase64 } from '../../utils/logo-loader';
import { PageSizeDialog, PageSize } from '../../components/PageSizeDialog';
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
  soNo?: string; // SO number for this item
}

export interface DeliveryNote {
  id: string;
  sjNo?: string;
  soNo: string;
  customer: string;
  customerAddress?: string; // Customer address untuk template Surat Jalan
  customerPIC?: string; // PIC (Person In Charge) customer untuk template Surat Jalan (muncul di bawah alamat customer)
  customerPhone?: string; // Customer phone untuk template Surat Jalan
  picProgram?: string; // PIC Program untuk Template 2 (GT Delivery Note) - terpisah dari customerPIC
  product?: string; // Deprecated - use items instead
  qty?: number; // Deprecated - use items instead
  items?: DeliveryNoteItem[]; // Array of products for this delivery (required for new format)
  status: 'DRAFT' | 'OPEN' | 'CLOSE';
  signedDocument?: string; // Base64 untuk image, atau file:// path untuk PDF
  signedDocumentPath?: string; // Path ke file PDF di file system
  signedDocumentName?: string;
  signedDocumentType?: 'pdf' | 'image'; // Tipe file: pdf atau image
  receivedDate?: string;
  driver?: string;
  vehicleNo?: string;
  spkNo?: string; // Deprecated - use items instead
  deliveryDate?: string; // Delivery date from schedule
  productCodeDisplay?: 'padCode' | 'productId'; // Pilihan untuk menampilkan Pad Code atau Product ID di template SJ (default: 'padCode')
  specNote?: string; // Keterangan untuk template Surat Jalan (akan muncul di bagian Keterangan)
  // Signature fields untuk Template 2 (GT Delivery Note)
  senderName?: string; // Sender name untuk signature
  senderTitle?: string; // Sender title untuk signature
  senderDate?: string; // Sender date untuk signature
  receiverName?: string; // Receiver name untuk signature
  receiverTitle?: string; // Receiver title untuk signature
  receiverDate?: string; // Receiver date untuk signature
}

// ActionMenu component untuk Delivery Note (dropdown 3 titik)
const DeliveryActionMenu = ({
  item,
  onGenerateSJ,
  onViewDetail,
  onEdit,
  onPrint,
  onUploadSignedDocument,
  onViewSignedDocument,
  onDownloadSignedDocument,
}: {
  item: DeliveryNote;
  onGenerateSJ?: () => void;
  onViewDetail?: () => void;
  onEdit?: () => void;
  onPrint?: () => void;
  onUploadSignedDocument?: () => void;
  onViewSignedDocument?: () => void;
  onDownloadSignedDocument?: () => void;
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
        const menuHeight = 300; // Estimated menu height (more items in delivery menu)
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
          {!item.sjNo && onGenerateSJ && (
            <button
              onClick={() => { onGenerateSJ(); setShowMenu(false); }}
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
              Generate SJ
            </button>
          )}
          {item.sjNo && onViewDetail && (
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
          {item.sjNo && onEdit && (
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
          {item.sjNo && onPrint && (
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
          {item.sjNo && item.status === 'OPEN' && !item.signedDocument && onUploadSignedDocument && (
            <button
              onClick={() => { onUploadSignedDocument(); setShowMenu(false); }}
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
              📎 Upload Signed
            </button>
          )}
          {item.signedDocument && onViewSignedDocument && (
            <button
              onClick={() => { onViewSignedDocument(); setShowMenu(false); }}
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
              👁️ View Signed SJ
            </button>
          )}
          {item.signedDocument && onDownloadSignedDocument && (
            <button
              onClick={() => { onDownloadSignedDocument(); setShowMenu(false); }}
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
              ⬇️ Download Signed SJ
            </button>
          )}
        </div>
      )}
    </>
  );
};

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

const DeliveryNote = () => {
  const [deliveries, setDeliveries] = useState<DeliveryNote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'delivery' | 'schedule' | 'outstanding'>('delivery');
  
  // Format notifications untuk NotificationBell
  const deliveryNotifications = useMemo(() => {
    return notifications.map((notif: any) => {
      // Hitung total qty dari items jika ada
      let totalQty = notif.qty || 0;
      if (notif.items && Array.isArray(notif.items) && notif.items.length > 0) {
        totalQty = notif.items.reduce((sum: number, item: any) => {
          return sum + (item.remainingQty || item.qty || 0);
        }, 0);
      }
      
      return {
        id: notif.id,
        title: notif.soNo ? `SO ${notif.soNo}` : (notif.poNo ? `PO ${notif.poNo}` : 'Delivery'),
        message: notif.spkNos && notif.spkNos.length > 0 
          ? `SPK: ${notif.spkNos.join(', ')} | Qty: ${totalQty} PCS`
          : (notif.spkNo 
            ? `SPK: ${notif.spkNo} | Qty: ${totalQty} PCS`
            : (notif.poNo ? `PO: ${notif.poNo} | GRN: ${notif.grnNo || 'N/A'}` : `Qty: ${totalQty} PCS`)),
        timestamp: notif.created || notif.timestamp,
        notif: notif, // Keep original data
      };
    });
  }, [notifications]);
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [spkData, setSpkData] = useState<any[]>([]);
  const loadingNotificationsRef = useRef(false); // Ref untuk prevent concurrent calls
  
  // Load SPK data untuk validasi notification
  useEffect(() => {
    const loadSPKData = async () => {
      try {
        const data = await storageService.get<any[]>('gt_spk') || [];
        setSpkData(extractStorageValue(data));
      } catch (error) {
        console.error('Error loading SPK data:', error);
      }
    };
    loadSPKData();
  }, []);
  const [showForm, setShowForm] = useState(false);
  const [showCreateDeliveryNoteDialog, setShowCreateDeliveryNoteDialog] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryNote | null>(null);
  const [viewPdfData, setViewPdfData] = useState<{ html: string; sjNo: string; templateType?: string } | null>(null);
  const [templateType, setTemplateType] = useState<'template1' | 'template2'>('template1');
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [deliveryViewMode, setDeliveryViewMode] = useState<'cards' | 'table'>('cards');
  const [customerInputValue, setCustomerInputValue] = useState('');
  const [soInputValue, setSoInputValue] = useState('');
  const [formData, setFormData] = useState<Partial<DeliveryNote>>({
    soNo: '',
    customer: '',
    product: '',
    qty: 0,
    driver: '',
    vehicleNo: '',
    deliveryDate: '',
    items: [],
  });
  const [selectedSoProducts, setSelectedSoProducts] = useState<Array<{productName: string; productKode?: string; qty: number}>>([]);
  const [selectedItemsForDelivery, setSelectedItemsForDelivery] = useState<{ [key: string]: { product: string; productKode?: string; qty: number; soQty: number; soNo: string } }>({});
  const [showPageSizeDialog, setShowPageSizeDialog] = useState(false);
  // Custom Dialog - menggunakan hook terpusat
  const { showAlert: showAlertBase, showConfirm: showConfirmBase, closeDialog, DialogComponent } = useDialog();
  
  // Wrapper untuk kompatibilitas dengan urutan parameter yang berbeda
  const showAlert = (title: string, message: string) => {
    showAlertBase(message, title);
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    showConfirmBase(message, onConfirm, undefined, title);
  };

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    
    const loadAllData = async () => {
      if (!isMounted) return;
      await loadDeliveries();
      await loadCustomers();
      await loadProducts();
      await loadSalesOrders();
      await loadNotifications();
      await loadScheduleData();
    };
    
    loadAllData();
    
    // Refresh setiap 10 detik untuk cek notifikasi baru (diperlambat untuk mengurangi re-render)
    const interval = setInterval(() => {
      if (!isMounted) return;
      // Debounce: hanya load jika tidak ada timeout yang sedang berjalan
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(async () => {
        if (isMounted) {
          await loadDeliveries();
          await loadNotifications();
          await loadScheduleData();
        }
      }, 500); // Debounce 500ms
    }, 10000); // Interval 10 detik (diperlambat dari 5 detik)
    
    return () => {
      isMounted = false;
      clearInterval(interval);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const loadScheduleData = async () => {
    // Load schedule data dari gt_schedule untuk ditampilkan di tab Schedule
    const scheduleListRaw = await storageService.get<any[]>('gt_schedule') || [];
    // Filter out deleted items menggunakan helper function
    const activeScheduleList = filterActiveItems(scheduleListRaw);
    setScheduleData((prev: any[]) => {
      // Optimize: hanya update jika data benar-benar berubah
      if (JSON.stringify(prev) === JSON.stringify(activeScheduleList)) {
        return prev;
      }
      return activeScheduleList;
    });
    
    // Load SPK data untuk enrich schedule
    const spkListRaw = await storageService.get<any[]>('gt_spk') || [];
    // Filter out deleted items menggunakan helper function
    const activeSpkList = filterActiveItems(spkListRaw);
    setSpkData((prev: any[]) => {
      // Optimize: hanya update jika data benar-benar berubah
      if (JSON.stringify(prev) === JSON.stringify(activeSpkList)) {
        return prev;
      }
      return activeSpkList;
    });
  };

  const loadCustomers = async () => {
    const dataRaw = await storageService.get<Customer[]>('gt_customers') || [];
    // Filter out deleted items menggunakan helper function
    const activeCustomers = filterActiveItems(dataRaw);
    setCustomers(activeCustomers);
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
      setFormData({ ...formData, soNo: '', customer: '', product: '', qty: 0, items: [] });
      setCustomerInputValue('');
      setSelectedSoProducts([]);
      setSelectedItemsForDelivery({});
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
      // Load products dari SO
      const soProducts = matchedSo.items?.map((item: any) => ({
        productName: item.productName || item.itemSku || '',
        productKode: item.productKode || item.itemSku || '',
        qty: typeof item.qty === 'string' ? parseFloat(item.qty) || 0 : (item.qty || 0),
      })) || [];
      
      setSelectedSoProducts(soProducts);
      
      // Reset selected items untuk SO baru
      setSelectedItemsForDelivery({});
      
      setFormData({
        ...formData,
        soNo: matchedSo.soNo,
        customer: matchedSo.customer || '',
        product: '',
        qty: 0,
        items: [],
      });
      if (matchedSo.customer) {
        const customer = customers.find(c => c.nama === matchedSo.customer);
        if (customer) {
          setCustomerInputValue(`${customer.kode} - ${customer.nama}`);
        } else {
          setCustomerInputValue(matchedSo.customer);
        }
      }
    } else {
      setFormData({ ...formData, soNo: text, product: '', qty: 0, items: [] });
      setSelectedSoProducts([]);
      setSelectedItemsForDelivery({});
    }
  };

  const loadProducts = async () => {
    const dataRaw = await storageService.get<any[]>('gt_products') || [];
    // Filter out deleted items menggunakan helper function
    const activeProducts = filterActiveItems(dataRaw);
    setProducts(activeProducts);
  };

  const loadSalesOrders = async () => {
    const dataRaw = await storageService.get<SalesOrder[]>('gt_salesOrders') || [];
    // Filter out deleted items menggunakan helper function
    const activeSalesOrders = filterActiveItems(dataRaw);
    // Filter by status
    setSalesOrders(activeSalesOrders.filter(so => so.status === 'OPEN' || so.status === 'CLOSE'));
  };

  // Helper function untuk match SPK (handle batch format dan SJ suffix) - harus di scope component agar bisa diakses semua function
  // IMPORTANT: SPK dengan suffix -SJ{number} harus exact match (tidak bisa match dengan SPK tanpa suffix atau dengan suffix berbeda)
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

  const loadDeliveries = async () => {
    const dataRaw = await storageService.get<DeliveryNote[]>('gt_delivery') || [];
    // Filter out deleted items menggunakan helper function
    const activeData = filterActiveItems(dataRaw);
    setDeliveries((prev: DeliveryNote[]) => {
      // Optimize: hanya update jika data benar-benar berubah
      if (JSON.stringify(prev) === JSON.stringify(activeData)) {
        return prev;
      }
      return activeData;
    });
  };

  const loadNotifications = async () => {
    // Prevent concurrent calls
    if (loadingNotificationsRef.current) {
      return;
    }
    
    loadingNotificationsRef.current = true;
    
    try {
      // GT: Load notifications dari Sales Orders (untuk outstanding delivery)
      // IMPORTANT: Hanya load dari gt_deliveryNotifications (GT), jangan dari deliveryNotifications (packaging)
      const deliveryNotificationsRaw = await storageService.get<any[]>('gt_deliveryNotifications') || [];
    
    // Load SPK data untuk validasi notification dari PPIC
    const currentSpkDataRaw = await storageService.get<any[]>('gt_spk') || [];
    // Filter out deleted items menggunakan helper function
    const currentSpkData = filterActiveItems(currentSpkDataRaw);
    
    // Filter: Hanya tampilkan notifikasi yang valid untuk GT
    // IMPORTANT: Notification dari PPIC (READY_TO_DELIVER dengan spkNo) harus tetap ditampilkan meskipun SO tidak ada
    // IMPORTANT: Notifikasi dari SO yang di-generate (status READY_TO_SHIP tanpa type) juga harus ditampilkan
    const deliveryNotifications = deliveryNotificationsRaw.filter((n: any) => {
      // PRIORITAS 0: Notifikasi dari SO yang di-generate (status READY_TO_SHIP tanpa type) - langsung tampilkan jika SO ada
      if (!n.type && n.status === 'READY_TO_SHIP' && n.soNo) {
        const soExistsInGT = salesOrders.some((so: any) => 
          (so.soNo || '').toString().trim() === (n.soNo || '').toString().trim()
        );
        if (soExistsInGT) {
          return true; // SO ada di GT, tampilkan
        }
        return false; // SO tidak ada di GT, skip
      }
      
      // PRIORITAS 1: Jika notification punya spkNo, cek apakah SPK ada di GT (untuk notification dari PPIC)
      // IMPORTANT: Untuk READY_TO_DELIVER dengan spkNo, selalu tampilkan karena ini dari PPIC GT
      if (n.spkNo && n.type === 'READY_TO_DELIVER') {
        // Untuk READY_TO_DELIVER dengan spkNo, selalu tampilkan (dari PPIC GT)
        // Cek apakah SPK ada di GT untuk validasi
        const spkExistsInGT = currentSpkData.some((spk: any) => {
          const spkNo1 = (spk.spkNo || '').toString().trim();
          const spkNo2 = (n.spkNo || '').toString().trim();
          if (spkNo1 === spkNo2) return true;
          // Handle batch format (SPK/251217/ABC-A vs SPK/251217/ABC)
          const base1 = spkNo1.split('-').slice(0, 2).join('-');
          const base2 = spkNo2.split('-').slice(0, 2).join('-');
          return base1 === base2;
        });
        
        // Jika SPK ada di GT, pasti valid - tampilkan
        if (spkExistsInGT) {
          return true;
        }
        // Jika SPK tidak ditemukan tapi ini READY_TO_DELIVER dengan spkNo, tetap tampilkan (mungkin SPK belum di-load atau format berbeda)
        // Tapi lebih baik tampilkan karena ini dari PPIC GT
        return true;
      }
      
      // PRIORITAS 2: Jika notification punya spkNo (bukan READY_TO_DELIVER), cek apakah SPK ada di GT
      if (n.spkNo) {
        const spkExistsInGT = currentSpkData.some((spk: any) => {
          const spkNo1 = (spk.spkNo || '').toString().trim();
          const spkNo2 = (n.spkNo || '').toString().trim();
          if (spkNo1 === spkNo2) return true;
          // Handle batch format (SPK/251217/ABC-A vs SPK/251217/ABC)
          const base1 = spkNo1.split('-').slice(0, 2).join('-');
          const base2 = spkNo2.split('-').slice(0, 2).join('-');
          return base1 === base2;
        });
        
        if (spkExistsInGT) {
          // SPK ada di GT, ini notification valid dari PPIC - tetap tampilkan
          return true;
        }
      }
      
      // PRIORITAS 3: Jika notification punya SO, cek apakah SO ada di GT
      if (n.soNo) {
        const soExistsInGT = salesOrders.some((so: any) => 
          (so.soNo || '').toString().trim() === (n.soNo || '').toString().trim()
        );
        if (!soExistsInGT) {
          // SO tidak ada di GT dan tidak punya SPK yang valid, berarti ini notifikasi dari packaging - skip
          return false;
        }
        return true;
      }
      
      // Notification tanpa SO dan tanpa SPK - hanya tampilkan jika type READY_TO_DELIVER (dari GRN untuk stock)
      if (!n.soNo && !n.spkNo && n.type === 'READY_TO_DELIVER') {
        return true; // Stock notification dari GRN
      }
      
      // Default: tampilkan jika tidak ada kriteria untuk filter out
      return true;
    });
    
    // Load deliveries untuk cek apakah sudah dibuat
    const currentDeliveriesRaw = await storageService.get<any[]>('gt_delivery') || [];
    // Filter out deleted items menggunakan helper function
    const currentDeliveries = filterActiveItems(currentDeliveriesRaw);
    
    // Note: matchSPK helper function sudah didefinisikan di component scope (line ~280)

    // GT: Load notifications from PPIC (DELIVERY_SCHEDULE) and Purchasing (READY_TO_DELIVER)
    const readyToDeliverNotifications = deliveryNotifications.filter((n: any) => 
      n.type === 'READY_TO_DELIVER' && (n.status || 'PENDING') === 'PENDING'
    );
    
    // GT: Generate notifications dari SO yang outstanding (belum di-deliver semua)
    // Cek setiap SO yang OPEN dan hitung sisa qty yang belum di-deliver
    // IMPORTANT: Gunakan Set untuk prevent duplikat
    const soNotificationIds = new Set<string>();
    const soNotifications: any[] = [];
    
    // Load existing notifications untuk cek apakah sudah ada READY_TO_DELIVER dari PPIC
    const existingNotificationsForCheck = deliveryNotifications.filter((n: any) => 
      n.type !== 'DELIVERY_SCHEDULE'
    );
    
    salesOrders.forEach((so: any) => {
      if (so.status !== 'OPEN') return;
      
      // Prevent duplikat berdasarkan soNo
      const notificationId = `so-${so.id || so.soNo}`;
      if (soNotificationIds.has(notificationId)) {
        return; // Skip jika sudah ada
      }
      soNotificationIds.add(notificationId);
      
      // IMPORTANT: Jangan generate notifikasi dari SO jika sudah ada READY_TO_DELIVER dari PPIC untuk SO ini
      // Karena notifikasi dari PPIC lebih akurat (sudah ada SPK dan schedule)
      const hasPPICNotification = existingNotificationsForCheck.some((n: any) => 
        n.type === 'READY_TO_DELIVER' && n.soNo === so.soNo && n.spkNo
      );
      
      if (hasPPICNotification) {
        return; // Skip karena sudah ada notifikasi dari PPIC
      }
      
      // Hitung total qty yang sudah di-deliver untuk SO ini
      const soDeliveries = currentDeliveries.filter((d: any) => d.soNo === so.soNo);
      const deliveredQtyByProduct: { [key: string]: number } = {};
      
      soDeliveries.forEach((d: any) => {
        if (d.items && Array.isArray(d.items)) {
          d.items.forEach((item: any) => {
            const productKey = item.product || item.productName || '';
            if (productKey) {
              deliveredQtyByProduct[productKey] = (deliveredQtyByProduct[productKey] || 0) + (item.qty || 0);
            }
          });
        }
      });
      
      // Cek apakah ada item yang belum di-deliver semua
      const hasOutstanding = (so.items || []).some((item: any) => {
        const productKey = item.productName || item.productKode || '';
        const soQty = typeof item.qty === 'string' ? parseFloat(item.qty) || 0 : (item.qty || 0);
        const deliveredQty = deliveredQtyByProduct[productKey] || 0;
        return soQty > deliveredQty;
      });
      
      // Check if there's a READY_TO_DELIVER notification for this SO
      const hasReadyNotification = readyToDeliverNotifications.some((n: any) => n.soNo === so.soNo);
      
      // Hitung items yang outstanding
      const outstandingItems = (so.items || []).map((item: any) => {
        const productKey = item.productName || item.productKode || '';
        const soQty = typeof item.qty === 'string' ? parseFloat(item.qty) || 0 : (item.qty || 0);
        const deliveredQty = deliveredQtyByProduct[productKey] || 0;
        return {
          product: productKey,
          qty: soQty,
          deliveredQty: deliveredQty,
          remainingQty: soQty - deliveredQty,
        };
      }).filter((item: any) => item.remainingQty > 0);
      
      // IMPORTANT: Jangan generate notifikasi jika tidak ada outstanding items atau sudah ada notifikasi dari PPIC
      if (outstandingItems.length === 0) {
        return; // Skip jika tidak ada outstanding items
      }
      
      if (hasOutstanding || hasReadyNotification) {
        soNotifications.push({
          id: notificationId,
          soNo: so.soNo,
          customer: so.customer,
          status: hasReadyNotification ? 'READY_TO_DELIVER' : 'READY_TO_SHIP', // Prioritize READY_TO_DELIVER from Purchasing
          items: outstandingItems, // Gunakan outstandingItems yang sudah di-filter
        });
      }
    });
    
    // Merge dengan existing notifications (jika ada) - termasuk dari PPIC
    // NOTE: PPIC membuat notification dengan type 'READY_TO_DELIVER' (bukan 'DELIVERY_SCHEDULE')
    // Filter untuk DELIVERY_SCHEDULE hanya untuk backward compatibility
    const ppicNotifications = deliveryNotifications.filter((n: any) => 
      n.type === 'DELIVERY_SCHEDULE' && (
        (n.status || 'PENDING') === 'PENDING' || 
        n.status === 'READY_TO_SHIP' || 
        n.status === 'PENDING_STOCK'
      )
    );
    
    // Include semua notification yang bukan DELIVERY_SCHEDULE (termasuk READY_TO_DELIVER dari PPIC)
    // IMPORTANT: Jangan ubah status notifikasi yang sudah ada dari PPIC, hanya untuk notifikasi baru dari SO
    const existingNotifications = deliveryNotifications.filter((n: any) => 
      n.type !== 'DELIVERY_SCHEDULE'
    );
    
    // Untuk notifikasi dari SO, cek apakah sudah di-deliver
    const processedSONotifications = soNotifications.map((notif: any) => {
      // Cek apakah delivery sudah dibuat untuk semua item
      const existingDelivery = currentDeliveries.find((d: any) => d.soNo === notif.soNo);
      
      if (existingDelivery) {
        // Cek apakah semua item sudah di-deliver
        const allDelivered = (notif.items || []).every((item: any) => item.remainingQty <= 0);
        if (allDelivered) {
          return {
            ...notif,
            status: 'DELIVERY_CREATED',
          };
        }
      }
      
      return notif;
    });
    
    // Merge semua notifications - existing dari PPIC + processed dari SO
    // IMPORTANT: Existing notifications dari PPIC tidak diubah statusnya, hanya yang dari SO
    // IMPORTANT: Deduplicate berdasarkan id untuk prevent duplikat
    const allNotifications = [...ppicNotifications, ...existingNotifications, ...processedSONotifications];
    const notificationIds = new Set<string>();
    const updatedNotifications = allNotifications.filter((n: any) => {
      const nId = n.id || `${n.soNo}-${n.spkNo || 'no-spk'}-${n.status || 'no-status'}`;
      if (notificationIds.has(nId)) {
        return false; // Skip duplikat
      }
      notificationIds.add(nId);
      return true;
    });
    
    
    // Update notification status: Set READY_TO_SHIP untuk notifikasi dari PPIC (READY_TO_DELIVER)
    // Sama seperti Packaging: Update status berdasarkan kondisi, tapi untuk GT tidak ada production/QC
    const updatedNotificationsWithStatus = updatedNotifications.map((notif: any) => {
      // Helper function untuk cek delivery
      const checkDelivery = (n: any) => {
        const spkList = n.spkNos || (n.spkNo ? [n.spkNo] : []);
        // Filter active deliveries menggunakan helper function
        const activeDeliveries = filterActiveItems(currentDeliveries);
        return activeDeliveries.find((d: any) => {
          if (d.items && Array.isArray(d.items) && d.items.length > 0) {
            return spkList.some((spk: string) => {
              return d.items.some((item: any) => matchSPK(item.spkNo, spk));
            });
          }
          if (d.spkNo) {
            return spkList.some((spk: string) => matchSPK(d.spkNo, spk));
          }
          return false;
        });
      };
      
      // Jika notification dari PPIC dengan type READY_TO_DELIVER, update status ke READY_TO_SHIP
      if (notif.type === 'READY_TO_DELIVER' && (notif.status === 'PENDING' || notif.status === 'PROCESSED')) {
        const existingDelivery = checkDelivery(notif);
        
        if (existingDelivery) {
          return {
            ...notif,
            status: 'DELIVERY_CREATED',
          };
        }
        
        // Update ke READY_TO_SHIP (siap untuk delivery)
        return {
          ...notif,
          status: 'READY_TO_SHIP',
        };
      }
      
      // Jika sudah READY_TO_SHIP, keep status (jangan ubah) - sama seperti Packaging
      if (notif.status === 'READY_TO_SHIP') {
        const existingDelivery = checkDelivery(notif);
        
        if (existingDelivery) {
          return {
            ...notif,
            status: 'DELIVERY_CREATED',
          };
        }
        
        // Keep READY_TO_SHIP (sama seperti Packaging)
        return notif;
      }
      
      return notif;
    });
    
    // Auto-cleanup: Sama seperti Packaging - sederhana
    // Filter out deleted notifications menggunakan helper function
    const activeNotifications = filterActiveItems(updatedNotificationsWithStatus);
    const cleanedNotifications = activeNotifications.filter((n: any) => {
      // Filter out DELIVERY_CREATED notifications
      if (n.status === 'DELIVERY_CREATED') {
        return false;
      }
      
      // IMPORTANT: Keep READY_TO_SHIP selalu (sama seperti Packaging)
      if (n.status === 'READY_TO_SHIP') {
        return true;
      }
      
      // IMPORTANT: Jika notification punya sjGroupId, SELALU keep notification
      // Karena setiap sjGroupId = 1 delivery terpisah (beda batch/ tanggal)
      const notifSjGroupId = n.sjGroupId || (n.deliveryBatches && n.deliveryBatches[0]?.sjGroupId) || null;
      if (notifSjGroupId) {
        // Hanya hapus jika status DELIVERY_CREATED
        if (n.status === 'DELIVERY_CREATED') {
          return false;
        }
        return true; // Keep notification yang punya sjGroupId
      }
      
      // Default: keep notification
      return true;
    });
    
    // Update notifications di storage (cleanup yang sudah tidak relevan)
    // IMPORTANT: Hanya update jika benar-benar ada perubahan untuk mencegah infinite loop
    const cleanedCount = cleanedNotifications.length;
    const originalCount = deliveryNotifications.length;
    const hasChanges = cleanedCount !== originalCount || 
      cleanedNotifications.some((n: any, idx: number) => {
        const original = deliveryNotifications[idx];
        return !original || JSON.stringify(n) !== JSON.stringify(original);
      });
    
    if (hasChanges) {
      // Non-blocking update untuk mencegah blocking UI dan infinite loop
      setTimeout(async () => {
        await storageService.set('gt_deliveryNotifications', cleanedNotifications);
      }, 1000); // Debounce 1 detik untuk mencegah update terlalu sering
    }
    
    // Filter notifications yang siap untuk dikirim - SAMA SEPERTI PACKAGING (sederhana)
    const readyNotifications = cleanedNotifications.filter((n: any) => 
      n.status === 'READY_TO_SHIP'
    );
    
    
    // Group notifications berdasarkan sjGroupId dari schedule
    const groupedNotifications = await groupNotificationsByDelivery(readyNotifications);
    
    // Hanya update state jika benar-benar ada perubahan untuk mencegah re-render loop
    setNotifications((prev: any[]) => {
      if (JSON.stringify(prev) === JSON.stringify(groupedNotifications)) {
        return prev; // No change, return previous state
      }
      return groupedNotifications;
    });
    } finally {
      loadingNotificationsRef.current = false;
    }
  };

  // Group notifications berdasarkan sjGroupId dari schedule
  // IMPORTANT: SPK itu 1 product 1, jadi tidak boleh gabung quantity karena beda produk
  const groupNotificationsByDelivery = async (notifications: any[]) => {
    // Load schedule untuk mendapatkan sjGroupId
    const scheduleList = await storageService.get<any[]>('gt_schedule') || [];
    
    // Note: matchSPK helper function sudah didefinisikan di component scope
    
    // Enrich setiap notification dengan sjGroupId dari schedule
    const enrichedNotifications = notifications.map((notif: any) => {
      const spkList = notif.spkNos || (notif.spkNo ? [notif.spkNo] : []);
      
      // Cari schedule yang match dengan SPK dari notification
      const relatedSchedule = scheduleList.find((s: any) => {
        if (!s.spkNo) return false;
        return spkList.some((spk: string) => matchSPK(s.spkNo, spk));
      });
      
      // Ambil sjGroupId dari deliveryBatches di schedule
      let sjGroupId: string | null = null;
      if (relatedSchedule && relatedSchedule.deliveryBatches && relatedSchedule.deliveryBatches.length > 0) {
        // Cari batch yang match dengan SPK atau ambil batch pertama
        const matchingBatch = relatedSchedule.deliveryBatches.find((db: any) => {
          // Jika batch punya spkNo, match dengan SPK dari notification
          if (db.spkNo) {
            return spkList.some((spk: string) => matchSPK(db.spkNo, spk));
          }
          // Jika tidak ada spkNo di batch, gunakan batch pertama dari schedule yang match
          return true;
        });
        
        if (matchingBatch && matchingBatch.sjGroupId) {
          sjGroupId = matchingBatch.sjGroupId;
        } else if (relatedSchedule.deliveryBatches[0]?.sjGroupId) {
          sjGroupId = relatedSchedule.deliveryBatches[0].sjGroupId;
        }
      }
      
      return {
        ...notif,
        sjGroupId, // Tambahkan sjGroupId ke notification
      };
    });
    
    // Group berdasarkan sjGroupId (jika ada)
    const groups: { [key: string]: any[] } = {};
    const ungrouped: any[] = [];
    
    enrichedNotifications.forEach((notif: any) => {
      if (notif.sjGroupId) {
        // Group berdasarkan sjGroupId
        if (!groups[notif.sjGroupId]) {
          groups[notif.sjGroupId] = [];
        }
        groups[notif.sjGroupId].push(notif);
      } else {
        // Tidak punya sjGroupId, tidak digroup (single notification)
        ungrouped.push(notif);
      }
    });
    
    // Convert groups to array of grouped notifications
    const groupedResults: any[] = [];
    
    // Process grouped notifications (yang punya sjGroupId)
    // IMPORTANT: Untuk GT, jika 1 SO dengan beberapa batch, bisa digroup untuk create 1 SJ
    // Tapi setiap batch dengan sjGroupId berbeda tetap muncul sebagai notifikasi terpisah
    Object.entries(groups).forEach(([sjGroupId, group]) => {
      // Cek apakah semua notification dalam group punya SO yang sama
      const firstNotif = group[0];
      const allSameSO = group.every((n: any) => n.soNo === firstNotif.soNo);
      
      if (group.length === 1) {
        // Single notification dalam group, return as is (tapi tetap punya sjGroupId)
        groupedResults.push(group[0]);
      } else if (allSameSO) {
        // Multiple notifications dengan sjGroupId yang sama DAN SO yang sama - bisa digroup untuk create 1 SJ
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
        
        // Collect semua deliveryBatches dari group untuk create 1 SJ
        const allDeliveryBatches: any[] = [];
        group.forEach((n: any) => {
          if (n.deliveryBatches && Array.isArray(n.deliveryBatches)) {
            allDeliveryBatches.push(...n.deliveryBatches);
          }
        });
        
        // IMPORTANT: Jangan gabung quantity! Setiap SPK punya 1 product dengan quantity sendiri
        // totalQty hanya untuk display, tapi items tetap terpisah per SPK
        groupedResults.push({
          ...firstNotif,
          id: `grouped-${sjGroupId}-${firstNotif.id}`,
          isGrouped: true,
          sjGroupId, // Simpan sjGroupId untuk reference
          groupedNotifications: group, // Store all notifications in this group (setiap notification = 1 SPK = 1 product)
          totalQty: group.reduce((sum: number, n: any) => sum + (n.qty || 0), 0), // Total untuk display saja
          deliveryBatches: allDeliveryBatches.length > 0 ? allDeliveryBatches : (groupDeliveryDate ? [{ deliveryDate: groupDeliveryDate, sjGroupId }] : []),
        });
      } else {
        // SO berbeda, jangan digroup - return sebagai notifikasi terpisah
        group.forEach((n: any) => {
          groupedResults.push(n);
        });
      }
    });
    
    // Add ungrouped notifications (yang tidak punya sjGroupId)
    groupedResults.push(...ungrouped);
    
    return groupedResults;
  };

  // Update inventory saat delivery note dibuat - TAMBAHKAN OUTGOING untuk product
  const updateInventoryFromDelivery = async (delivery: DeliveryNote) => {
    try {
      const inventory = await storageService.get<any[]>('gt_inventory') || [];
      const productsList = await storageService.get<any[]>('gt_products') || [];
      
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
        const qtyDelivered = item.qty || 0;

        if (!productName || qtyDelivered <= 0) {
          continue;
        }

        // Find product dari master untuk mendapatkan product_id/kode
        const product = productsList.find((p: any) => {
          const pName = (p.nama || '').toLowerCase().trim();
          const pCode = ((p.product_id || p.kode) || '').toString().toLowerCase().trim();
          const itemName = productName.toLowerCase().trim();
          return pName === itemName || pCode === itemName;
        });

        if (!product) {
          showAlert('Product Not Found', `⚠️ Product "${productName}" tidak ditemukan di master data. Inventory tidak di-update untuk product ini.`);
          continue;
        }

        let productCode = (product.product_id || product.kode || '').toString().trim();
        
        // Jika product adalah turunan, gunakan parent product ID untuk inventory
        if (product.isTurunan && product.parentProductId) {
          const parentProduct = productsList.find((p: any) => p.id === product.parentProductId);
          if (parentProduct) {
            productCode = (parentProduct.product_id || parentProduct.kode || '').toString().trim();
          }
        }
        
        // Find product inventory - coba match dengan berbagai cara (gunakan parent product code jika turunan)
        let existingProductInventory = inventory.find((inv: any) => {
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

        // ANTI-DUPLICATE: Cek di inventory apakah delivery ini sudah pernah diproses untuk product ini
        // Key tracking: delivery.id + productId (GT tidak ada SPK)
        const deliveryKey = `DEL_${delivery.id}_${productCode}`;
        if (existingProductInventory) {
          const processedDeliveries = existingProductInventory.processedDeliveries || [];
          if (processedDeliveries.includes(deliveryKey)) {
            continue; // Skip product ini, lanjut ke product berikutnya
          }
        }

        if (existingProductInventory) {
          // Update existing product inventory - TAMBAHKAN OUTGOING
          const oldOutgoing = existingProductInventory.outgoing || 0;
          const newOutgoing = oldOutgoing + qtyDelivered;
          
          // Tambahkan delivery key ke processedDeliveries untuk anti-duplicate (OUTGOING tracking)
          const processedDeliveries = existingProductInventory.processedDeliveries || [];
          if (!processedDeliveries.includes(deliveryKey)) {
            processedDeliveries.push(deliveryKey);
          }
          
          existingProductInventory.outgoing = newOutgoing;
          existingProductInventory.processedDeliveries = processedDeliveries; // Track delivery yang sudah diproses (untuk OUTGOING)
          // Recalculate nextStock: stockPremonth + receive - outgoing (rumus GT)
          existingProductInventory.nextStock =
            (existingProductInventory.stockPremonth || 0) +
            (existingProductInventory.receive || 0) -
            newOutgoing;
          existingProductInventory.lastUpdate = new Date().toISOString();
        } else {
          // Create new product inventory entry dengan outgoing (jika product belum ada di inventory)
          const newInventoryEntry = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            supplierName: delivery.customer || '',
            codeItem: productCode,
            description: productName,
            kategori: product.kategori || 'Product',
            satuan: product.satuan || 'PCS',
            price: product.hargaFg || product.hargaSales || 0,
            stockPremonth: 0,
            receive: 0,
            outgoing: qtyDelivered,
            return: 0,
            nextStock: 0 + 0 - qtyDelivered, // stockPremonth + receive - outgoing (rumus GT)
            processedDeliveries: [deliveryKey], // Track delivery yang sudah diproses (untuk OUTGOING)
            lastUpdate: new Date().toISOString(),
          };
          inventory.push(newInventoryEntry);
        }
      }

      // Save updated inventory
      await storageService.set('gt_inventory', inventory);
    } catch (error: any) {
      console.error('❌ [Delivery Inventory] Error updating inventory from delivery:', error);
      showAlert('Error', `Error updating inventory: ${error.message}`);
      throw error;
    }
  };

  // Transform scheduleData ke format ScheduleTable (sama seperti PPIC, tapi hanya untuk view)
  const transformedScheduleData = useMemo(() => {
    const result: any[] = [];
    
    scheduleData.forEach((schedule: any) => {
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

  const handleEdit = (item: DeliveryNote) => {
    setSelectedDelivery(item);
    setSoInputValue(item.soNo || '');
    setCustomerInputValue(item.customer || '');
    
    // Load products dari SO jika ada
    const so = salesOrders.find(s => s.soNo === item.soNo);
    if (so && so.items) {
      const soProducts = so.items.map((soItem: any) => ({
        productName: soItem.productName || soItem.itemSku || '',
        productKode: soItem.productKode || soItem.itemSku || '',
        qty: typeof soItem.qty === 'string' ? parseFloat(soItem.qty) || 0 : (soItem.qty || 0),
      }));
      setSelectedSoProducts(soProducts);
      
      // Set selected items untuk edit
      const selectedItems: { [key: string]: { product: string; productKode?: string; qty: number; soQty: number; soNo: string } } = {};
      if (item.items && item.items.length > 0) {
        item.items.forEach((deliveryItem) => {
          const soItem = so.items?.find((si: any) => 
            si.productName === deliveryItem.product || 
            si.productKode === deliveryItem.product
          );
          if (soItem) {
            const itemKey = `${item.soNo}-${deliveryItem.product}`;
            selectedItems[itemKey] = {
              product: deliveryItem.product,
              productKode: (soItem as any).productKode || (soItem as any).itemSku || '',
              qty: deliveryItem.qty || 0,
              soQty: typeof soItem.qty === 'string' ? parseFloat(soItem.qty) || 0 : (soItem.qty || 0),
              soNo: item.soNo || '',
            };
          }
        });
      }
      setSelectedItemsForDelivery(selectedItems);
    } else {
      setSelectedSoProducts([]);
      setSelectedItemsForDelivery({});
    }
    
    setFormData({
      soNo: item.soNo || '',
      customer: item.customer || '',
      product: '',
      qty: 0,
      driver: item.driver || '',
      vehicleNo: item.vehicleNo || '',
      deliveryDate: item.deliveryDate ? item.deliveryDate.split('T')[0] : '',
      items: item.items && item.items.length > 0 ? item.items : (item.product ? [{
        product: item.product,
        qty: item.qty || 0,
        unit: 'PCS',
      }] : []),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    // Validasi: Harus ada SO, Customer, dan minimal 1 item yang dipilih
    if (!formData.soNo || !formData.customer) {
      showAlert('Validation Error', 'Please fill all required fields (SO No, Customer)');
      return;
    }
    
    // Validasi: Harus ada minimal 1 item yang dipilih
    const selectedItems = Object.values(selectedItemsForDelivery);
    if (selectedItems.length === 0) {
      showAlert('Validation Error', 'Pilih minimal 1 product dari SO');
      return;
    }
    
    // Validasi: Semua item yang dipilih harus punya qty > 0
    const invalidItems = selectedItems.filter(item => !item.qty || item.qty <= 0);
    if (invalidItems.length > 0) {
      showAlert('Validation Error', 'Semua product yang dipilih harus punya quantity > 0');
      return;
    }
    
    try {
      // GT: Cek qty dari SO langsung (tidak perlu QC/Production)
      const so = salesOrders.find((s: any) => s.soNo === formData.soNo);
      if (!so) {
        showAlert('SO Not Found', `Sales Order ${formData.soNo} tidak ditemukan.`);
        return;
      }
      
      // Validasi qty untuk setiap item yang dipilih
      const validationErrors: string[] = [];
      for (const selectedItem of selectedItems) {
        const soItem = so.items?.find((item: any) => 
          item.productName === selectedItem.product || 
          item.productKode === selectedItem.product ||
          item.productKode === selectedItem.productKode
        );
        
        if (!soItem) {
          validationErrors.push(`Product ${selectedItem.product} tidak ditemukan di SO ${formData.soNo}`);
          continue;
        }
        
        // Cek total qty yang sudah di-deliver
        const existingDeliveries = deliveries.filter((d: any) => 
          d.soNo === formData.soNo && d.items?.some((item: any) => item.product === selectedItem.product)
        );
        const totalDelivered = existingDeliveries.reduce((sum: number, d: any) => {
          const item = d.items?.find((item: any) => item.product === selectedItem.product);
          return sum + (item?.qty || 0);
        }, 0);
        
        const soQty = typeof soItem.qty === 'string' ? parseFloat(soItem.qty) || 0 : (soItem.qty || 0);
        const remainingQty = soQty - totalDelivered;
        
        // Validasi: qty delivery tidak boleh melebihi remaining qty dari SO
        if (selectedItem.qty > remainingQty) {
          validationErrors.push(
            `⚠️ ${selectedItem.product}: Quantity delivery (${selectedItem.qty}) melebihi sisa yang belum dikirim!\n` +
            `Qty di SO: ${soQty} PCS | Total Sudah Dikirim: ${totalDelivered} PCS | Sisa: ${remainingQty} PCS`
          );
        }
      }
      
      if (validationErrors.length > 0) {
        showAlert('Validation Error', validationErrors.join('\n\n'));
        return;
      }
      
      // Generate random SJ number
      const now = new Date();
      const year = String(now.getFullYear()).slice(-2);
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const randomCode = Math.random().toString(36).substr(2, 5).toUpperCase();
      const sjNo = `SJ-${year}${month}${day}-${randomCode}`;
      
      // Build items array dari selectedItemsForDelivery
      const deliveryItems: DeliveryNoteItem[] = selectedItems.map((item) => ({
        product: item.product,
        qty: item.qty,
        unit: 'PCS',
      }));
      
      const newDelivery: DeliveryNote = {
        id: Date.now().toString(),
        sjNo,
        soNo: formData.soNo || '',
        customer: formData.customer || '',
        items: deliveryItems,
        status: 'OPEN' as const, // GT: Delivery langsung OPEN setelah dibuat dari SO
        driver: formData.driver || '',
        vehicleNo: formData.vehicleNo || '',
        deliveryDate: formData.deliveryDate || undefined,
      };
      const updated = [...deliveries, newDelivery];
      await storageService.set('gt_delivery', updated);
      setDeliveries(updated);

      // Update inventory - TAMBAHKAN OUTGOING untuk product yang dikirim
      try {
        await updateInventoryFromDelivery(newDelivery);
      } catch (error: any) {
        // Jangan block proses, tapi log error
      }

      setShowForm(false);
      setCustomerInputValue('');
      setSoInputValue('');
      setSelectedItemsForDelivery({});
      setFormData({ soNo: '', customer: '', product: '', qty: 0, driver: '', vehicleNo: '', deliveryDate: '', items: [] });
      showAlert('Success', `✅ Delivery Note created: ${sjNo}\n\nFrom SO: ${formData.soNo}\nItems: ${deliveryItems.length} product(s)\nTotal Qty: ${deliveryItems.reduce((sum, item) => sum + item.qty, 0)} PCS\n✅ Inventory updated (outgoing)`);
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
          const updated = deliveries.map(d =>
            d.id === item.id ? { ...d, sjNo: sjNo, status: 'OPEN' as const } : d
          );
          await storageService.set('gt_delivery', updated);
          setDeliveries(updated);
          showAlert('Success', 'Surat Jalan generated');
        } catch (error: any) {
          showAlert('Error', `Error generating SJ: ${error.message}`);
        }
      }
    );
  };

  const handleEditSJ = (item: DeliveryNote) => {
    handleEdit(item);
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
        // Untuk image, buka di new window
        const newWindow = window.open();
        if (!newWindow) {
          showAlert('Error', 'Popup blocked. Please allow popups to view document.');
          return;
        }
        newWindow.document.write(`
          <html>
            <head>
              <title>${item.signedDocumentName || 'Signed Document'}</title>
              <style>
                body { 
                  margin: 0; 
                  padding: 20px; 
                  display: flex; 
                  justify-content: center; 
                  align-items: center; 
                  min-height: 100vh;
                  background: #f5f5f5;
                }
                img { 
                  max-width: 100%; 
                  max-height: 100vh; 
                  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                }
              </style>
            </head>
            <body>
            <img src="${signedDocument}" alt="${item.signedDocumentName || 'Signed Document'}" 
                 onerror="this.parentElement.innerHTML='<div style=\\'padding:20px;text-align:center;\\'><p>Error loading image</p><p>Document length: ${signedDocument.length} chars</p></div>';" />
            </body>
          </html>
        `);
        newWindow.document.close();
      }
    } catch (error: any) {
      showAlert('Error', `Error viewing document: ${error.message}`);
    }
  };

  const handleDownloadSignedDocument = async (item: DeliveryNote) => {
    if (!item.signedDocument && !item.signedDocumentPath) {
      showAlert('Error', 'No signed document available');
      return;
    }

    try {
      // Priority 1: Load dari local file system jika ada
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
            const errorMessage = fileError.message || String(fileError);
            if (errorMessage.includes('No handler registered') || 
                errorMessage.includes('handler registered') ||
                errorMessage.includes('Error invoking remote method')) {
              throw new Error('⚠️ Handler Electron belum terdaftar.\n\nSilakan:\n1. Tutup aplikasi Electron (tutup semua window)\n2. Buka kembali aplikasi Electron dari shortcut/start menu\n3. Tunggu aplikasi selesai loading\n4. Coba upload PDF lagi\n\nJika masih error, hubungi administrator.');
            }
            throw new Error(`❌ Gagal menyimpan PDF ke file system.\n\nError: ${errorMessage}\n\nSilakan:\n1. Restart aplikasi Electron\n2. Pastikan folder data/uploads bisa diakses\n3. Coba upload lagi`);
          }
        } else {
          // Image: Simpan sebagai base64 (biasanya lebih kecil)
          signedDocument = base64;
          signedDocumentPath = undefined;
        }
        
        // Update delivery dengan signed document dan status CLOSE
        const updated = deliveries.map(d =>
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
        
        // Save ke local storage
        try {
          await storageService.set('gt_delivery', updated);
        } catch (storageError: any) {
          // Jika save ke storage gagal karena quota, coba handle khusus
          if (storageError.message?.includes('quota') || storageError.message?.includes('exceeded')) {
            // Jika PDF sudah disimpan di file system, kita bisa skip signedDocument di storage
            if (signedDocumentPath) {
              // Simpan tanpa signedDocument (hanya path)
              const updatedWithoutBase64 = deliveries.map(d =>
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
              await storageService.set('gt_delivery', updatedWithoutBase64);
              setDeliveries(updatedWithoutBase64);
              showAlert('Success', `✅ Signed document uploaded successfully!\n\nFile: ${file.name}\n\nTombol "View Signed Doc" sekarang tersedia di action menu.`);
              return; // Exit early
            } else {
              throw new Error('Storage quota exceeded. Silakan hapus beberapa data lama atau hubungi administrator.');
            }
          }
          throw storageError; // Re-throw error lainnya
        }
        
        setDeliveries(updated);

        // Cari PO yang terkait dengan SO ini untuk supplier payment
        const purchaseOrders = await storageService.get<any[]>('gt_purchaseOrders') || [];
        const relatedPOs = purchaseOrders.filter((po: any) => po.soNo === item.soNo && po.status === 'CLOSE');

        // Create notification untuk Finance - Supplier Payment untuk setiap PO terkait
        // IMPORTANT: Hanya pakai gt_financeNotifications (GT), jangan load dari financeNotifications (packaging)
        // NOTE: Notification untuk supplier payment seharusnya sudah dibuat saat GRN dibuat di Purchasing
        // Jadi di sini kita hanya update notification yang sudah ada dengan signed document, bukan create baru
        const financeNotifications = await storageService.get<any[]>('gt_financeNotifications') || [];
        
        // Update existing notifications dengan signed document (jangan create baru)
        // Notification untuk supplier payment seharusnya sudah dibuat saat GRN dibuat di Purchasing
        const updatedFinanceNotifications = financeNotifications.map((notif: any) => {
          if (relatedPOs.some((po: any) => po.poNo === notif.poNo) && notif.type === 'SUPPLIER_PAYMENT' && notif.status === 'PENDING') {
            return {
              ...notif,
              sjNo: item.sjNo,
              signedDocument: base64,
              signedDocumentName: file.name,
            };
          }
          return notif;
        });
        
        // Hanya update jika ada perubahan
        if (JSON.stringify(updatedFinanceNotifications) !== JSON.stringify(financeNotifications)) {
          await storageService.set('gt_financeNotifications', updatedFinanceNotifications);
        }

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
        const salesOrders = await storageService.get<any[]>('gt_salesOrders') || [];
        const so = salesOrders.find((s: any) => s.soNo === item.soNo);
        const poCustomerNo = so?.poCustomerNo || so?.soNo || '-';

        // Create notification untuk Invoice module (setelah surat jalan ditandatangani)
        const invoiceNotifications = await storageService.get<any[]>('gt_invoiceNotifications') || [];
        // Check if notification already exists
        const existingInvoiceNotif = invoiceNotifications.find((n: any) => 
          n.sjNo === item.sjNo && n.type === 'CUSTOMER_INVOICE'
        );
        
        if (!existingInvoiceNotif) {
          const newInvoiceNotification = {
            id: `invoice-${Date.now()}-${item.sjNo}`,
            type: 'CUSTOMER_INVOICE',
            sjNo: item.sjNo,
            soNo: item.soNo,
            poCustomerNo: poCustomerNo,
            spkNos: spkNosFromSJ, // Hanya SPK dari items di SJ, bukan semua SPK dari SO
            customer: item.customer,
            customerKode: so?.customerKode || '',
            items: itemsInSJ, // Items sesuai dengan SJ
            totalQty: itemsInSJ.reduce((sum: number, itm: any) => sum + (itm.qty || 0), 0),
            signedDocument: base64,
            signedDocumentName: file.name,
            status: 'PENDING',
            created: new Date().toISOString(),
          };
          await storageService.set('gt_invoiceNotifications', [...invoiceNotifications, newInvoiceNotification]);
        }

        // Check if any notifications were updated
        const hasUpdatedNotifications = JSON.stringify(updatedFinanceNotifications) !== JSON.stringify(financeNotifications);

        let alertMsg = `✅ Surat Jalan (yang sudah di TTD) uploaded: ${file.name}\n\n✅ Status updated to CLOSE`;
        if (hasUpdatedNotifications) {
          alertMsg += `\n📧 Updated supplier payment notifications with signed document`;
        }
        alertMsg += `\n📧 Notification sent to Accounting - Customer Invoice tab`;
        showAlert('Success', alertMsg);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      showAlert('Error', `Error uploading document: ${error.message}`);
    }
  };


  const generateSuratJalanHtmlContent = async (item: DeliveryNote, template: 'template1' | 'template2' = 'template1'): Promise<string> => {
    // Load customer data untuk mendapatkan alamat, PIC, dan telepon
    // Prioritaskan data dari delivery note, fallback ke customer data
    const customerData = customers.find(c => c.nama === item.customer);
    const customerName = item.customer || '-';
    const customerPIC = item.customerPIC || customerData?.kontak || '-';
    const customerPhone = item.customerPhone || customerData?.telepon || '-';
    const customerAddress = item.customerAddress || customerData?.alamat || '-';

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

    // Load logo menggunakan utility function dengan multiple fallback paths
    const logo = await loadLogoAsBase64();

    // Prepare item object untuk template
    // IMPORTANT: Jangan gunakan qtyProduced (total) untuk baris pertama
    // Gunakan soLines[0].qty untuk baris pertama, dan soLines.slice(1) untuk extra rows
    const suratJalanItem = {
      soNo: item.soNo || '',
      customer: customerName,
      customerPIC,
      customerPhone,
      customerAddress,
      picProgram: item.picProgram, // PIC Program untuk Template 2
      product: item.items && item.items.length > 0 ? item.items[0].product : (item.product || ''),
      qtyProduced: soLines.length > 0 ? String(soLines[0].qty || 0) : String(qtyProduced), // Gunakan qty dari soLines[0], bukan total
      specNote,
      soLines, // Semua items dengan qty masing-masing
      // Signature fields untuk Template 2
      senderName: item.senderName,
      senderTitle: item.senderTitle,
      senderDate: item.senderDate,
      receiverName: item.receiverName,
      receiverTitle: item.receiverTitle,
      receiverDate: item.receiverDate,
    };

    // Prepare SJ data
    const sjData = {
      sjNo: item.sjNo || '',
      sjDate: item.deliveryDate || new Date().toISOString(),
      driver: item.driver || '',
      vehicleNo: item.vehicleNo || '',
    };

    // Generate HTML using template berdasarkan pilihan
    if (template === 'template2') {
      return generateGTDeliveryNoteHtml({
        logo,
        company,
        item: suratJalanItem,
        sjData,
        products,
      });
    }
    
    // Default: template1
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
      const html = await generateSuratJalanHtmlContent(item, templateType);
      setViewPdfData({ html, sjNo: item.sjNo || '', templateType });
    } catch (error: any) {
      showAlert('Error', `Error generating Surat Jalan preview: ${error.message}`);
    }
  };

  const handleTemplateChange = async (newTemplate: 'template1' | 'template2') => {
    setTemplateType(newTemplate);
    if (viewPdfData) {
      // Reload dengan template baru
      const currentDelivery = deliveries.find(d => d.sjNo === viewPdfData.sjNo);
      if (currentDelivery) {
        try {
          const html = await generateSuratJalanHtmlContent(currentDelivery, newTemplate);
          setViewPdfData({ html, sjNo: viewPdfData.sjNo, templateType: newTemplate });
        } catch (error: any) {
          showAlert('Error', `Error generating Surat Jalan preview: ${error.message}`);
        }
      }
    }
  };

  const handleSaveToPDF = async (pageSize: PageSize = 'A5') => {
    if (!viewPdfData) return;

    try {
      const electronAPI = (window as any).electronAPI;
      const fileName = `${viewPdfData.sjNo}.pdf`;

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
        closeDialog();
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
      const html = await generateSuratJalanHtmlContent(item);
      openPrintWindow(html);
    } catch (error: any) {
      showAlert('Error', `Error generating print preview: ${error.message}`);
    }
  };

  // Helper function untuk mendapatkan product name dari berbagai sumber
  const getProductName = async (n: any): Promise<string> => {
    // Prioritas 1: dari notification langsung
    if (n.product && n.product.trim() !== '') {
      return n.product;
    }
    
    // Prioritas 2: dari productId (cari di master products)
    if (n.productId) {
      const products = await storageService.get<any[]>('gt_products') || [];
      const product = products.find((p: any) => 
        (p.product_id || p.kode || '').toString().trim().toLowerCase() === 
        (n.productId || '').toString().trim().toLowerCase()
      );
      if (product) {
        return product.nama || product.productName || product.itemName || '';
      }
    }
    
    // Prioritas 3: dari GRN
    if (n.grnNo) {
      const grnList = await storageService.get<any[]>('gt_grn') || [];
      const grn = grnList.find((g: any) => g.grnNo === n.grnNo);
      // Format baru: productItem, format lama: materialItem (backward compatibility)
      if (grn && (grn.productItem || grn.materialItem)) {
        return grn.productItem || grn.materialItem;
      }
    }
    
    // Prioritas 4: dari PO
    if (n.poNo) {
      const poList = await storageService.get<any[]>('gt_purchaseOrders') || [];
      const po = poList.find((p: any) => p.poNo === n.poNo);
      // Format baru: productItem, format lama: materialItem (backward compatibility)
      if (po && (po.productItem || po.materialItem)) {
        return po.productItem || po.materialItem;
      }
    }
    
    // Fallback terakhir
    return 'Unknown Product';
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
                const base1 = spk.split('-').slice(0, 2).join('-');
                const base2 = db.spkNo.split('-').slice(0, 2).join('-');
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
                  const base1 = p.spkNo.split('-').slice(0, 2).join('-');
                  const base2 = db.spkNo.split('-').slice(0, 2).join('-');
                  return base1 === base2 || db.spkNo === p.spkNo;
                }
                return false;
              });
              if (matchingBatch && matchingBatch.qty) {
                pQty = matchingBatch.qty;
              }
            }
            confirmMsg += `- ${p.product} - ${pQty} PCS (SPK: ${p.spkNo})\n`;
          });
        } else {
          confirmMsg += `- ${n.product} - ${productQty} PCS (SPK: ${spkList[0] || n.spkNo})\n`;
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
          
          confirmMsg += `- ${p.product} - ${productQty} PCS (SPK: ${p.spkNo})\n`;
        });
      } else {
        // Ambil quantity dari deliveryBatches jika ada, atau dari items jika notifikasi dari SO
        let productQty = notif.qty || 0;
        if (notif.deliveryBatches && Array.isArray(notif.deliveryBatches) && notif.deliveryBatches.length > 0) {
          productQty = notif.deliveryBatches[0].qty || productQty;
        } else if (notif.items && Array.isArray(notif.items) && notif.items.length > 0) {
          // Jika notifikasi dari SO (punya items), hitung total dari remainingQty
          productQty = notif.items.reduce((sum: number, item: any) => {
            return sum + (item.remainingQty || item.qty || 0);
          }, 0);
        }
        
        // Untuk notifikasi dari SO yang tidak punya SPK, tampilkan "N/A" atau cari SPK dari SO
        let spkDisplay = notif.spkNo || (notif.spkNos && notif.spkNos.length > 0 ? notif.spkNos.join(', ') : 'N/A');
        if (spkDisplay === 'N/A' && notif.soNo) {
          // Coba cari SPK dari SO jika tidak ada di notifikasi
          const relatedSO = salesOrders.find((so: any) => so.soNo === notif.soNo);
          if (relatedSO && relatedSO.items && relatedSO.items.length > 0) {
            // Cari SPK dari SPK data berdasarkan SO dan product
            const spkFromData = spkData.find((s: any) => {
              if (s.soNo !== notif.soNo) return false;
              if (notif.product && s.product) {
                return s.product.toLowerCase().includes(notif.product.toLowerCase()) || 
                       notif.product.toLowerCase().includes(s.product.toLowerCase());
              }
              return false;
            });
            if (spkFromData && spkFromData.spkNo) {
              spkDisplay = spkFromData.spkNo;
            }
          }
        }
        
        const productDisplay = notif.product || (notif.items && notif.items.length > 0 
          ? `${notif.items.length} product(s)` 
          : 'Multiple Products');
        
        confirmMsg += `SPK: ${spkDisplay}\nSO No: ${notif.soNo}\nCustomer: ${notif.customer}\nProduct: ${productDisplay}\nQty: ${productQty} PCS`;
      }
    }
    
    showConfirm(
      'Create Delivery Note',
      confirmMsg,
      async () => {
        try {
          // IMPORTANT: GT (General Trading) tidak perlu QC validation
          // Karena GT tidak ada production process, langsung dari GRN ke delivery
          // QC hanya untuk Packaging yang punya production process
          // Skip QC validation untuk GT
          // VALIDASI STOCK: Cek inventory stock sebelum create Delivery Note
          const inventoryData = extractStorageValue(await storageService.get<any[]>('gt_inventory')) || [];
          const stockIssues: string[] = [];
          
          // Collect semua products yang akan di-deliver untuk validasi
          const productsToCheck: { productId: string; productName: string; requiredQty: number; spkNo: string }[] = [];
          
          // Process notifications untuk collect products
          for (const n of notificationsToProcess) {
            // Handle grouped notification atau single notification
            if (n.products && Array.isArray(n.products) && n.products.length > 0) {
              // New format dengan products array
              n.products.forEach((p: any) => {
                const productId = (p.productId || '').toString().trim();
                let productQty = p.qty || 0;
                
                // Ambil qty dari deliveryBatches jika ada
                if (notif.deliveryBatches && Array.isArray(notif.deliveryBatches)) {
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
                  }
                }
                
                if (productId && productQty > 0) {
                  productsToCheck.push({
                    productId,
                    productName: p.product || '',
                    requiredQty: productQty,
                    spkNo: p.spkNo || '',
                  });
                }
              });
            } else {
              // Old format - single product
              const productId = (n.productId || '').toString().trim();
              let productQty = n.qty || 0;
              
              // Ambil qty dari deliveryBatches jika ada
              if (notif.deliveryBatches && Array.isArray(notif.deliveryBatches) && notif.deliveryBatches.length > 0) {
                productQty = notif.deliveryBatches[0].qty || productQty;
              }
              
              if (productId && productQty > 0) {
                productsToCheck.push({
                  productId,
                  productName: n.product || '',
                  requiredQty: productQty,
                  spkNo: n.spkNo || '',
                });
              }
            }
          }
          
          // Load products untuk cek apakah turunan
          const productsData = extractStorageValue(await storageService.get<any[]>('gt_products')) || [];
          
          // Helper function untuk mendapatkan inventory product code (parent jika turunan)
          const getInventoryProductCodeForValidation = (productId: string): string => {
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
          
          // Validasi stock untuk setiap product
          for (const product of productsToCheck) {
            // Get inventory product code (parent jika turunan)
            const inventoryProductCode = getInventoryProductCodeForValidation(product.productId);
            
            const inventoryItem = inventoryData.find((inv: any) => {
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
            
            // Build stock issue message dengan info parent jika turunan
            const productInfo = productsData.find((p: any) => {
              const pId = (p.product_id || p.kode || '').toString().trim();
              return pId === product.productId;
            });
            const isTurunan = productInfo && productInfo.isTurunan;
            const parentInfo = isTurunan && productInfo?.parentProductId 
              ? productsData.find((p: any) => p.id === productInfo.parentProductId)
              : null;
            
            const stockMessage = isTurunan && parentInfo
              ? `${product.productName || product.productId} (Turunan dari: ${parentInfo.nama} [${parentInfo.kode}]) (SPK: ${product.spkNo}) - Required: ${product.requiredQty}, Available: ${availableStock}`
              : `${product.productName || product.productId} (SPK: ${product.spkNo}) - Required: ${product.requiredQty}, Available: ${availableStock}`;
            
            if (availableStock < product.requiredQty) {
              stockIssues.push(stockMessage);
            }
          }
          
          // Block jika ada stock issue
          if (stockIssues.length > 0) {
            showAlert(
              `⚠️ Tidak bisa membuat Delivery Note karena stock tidak cukup:\n\n${stockIssues.join('\n')}\n\nSilakan cek inventory terlebih dahulu atau tunggu stock tersedia.`,
              'Stock Validation Failed'
            );
            return; // Stop proses, tidak create delivery note
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
            const scheduleList = await storageService.get<any[]>('gt_schedule') || [];
            const firstNotif = notificationsToProcess[0];
            const firstSPKList = firstNotif?.spkNos || (firstNotif?.spkNo ? [firstNotif.spkNo] : []);
            
            if (firstSPKList.length > 0) {
              const relatedSchedule = scheduleList.find((s: any) => {
                if (!s.spkNo) return false;
                return firstSPKList.some((spk: string) => {
                  if (s.spkNo === spk) return true;
                  const baseSPK = spk.split('-').slice(0, 2).join('-');
                  return s.spkNo && s.spkNo.startsWith(baseSPK);
                });
              });
              
              if (relatedSchedule && relatedSchedule.deliveryBatches && relatedSchedule.deliveryBatches.length > 0) {
                deliveryDate = relatedSchedule.deliveryBatches[0].deliveryDate;
              }
            }
          }
          
          // Create Delivery Note with multiple items
          // IMPORTANT: Handle grouped notification dengan benar - ambil semua SPK dan products
          const deliveryItems: DeliveryNoteItem[] = [];
          const seenSPKs = new Set<string>(); // Track SPK yang sudah ditambahkan untuk prevent duplikasi
          
          // Helper function untuk add item dengan deduplication
          const addDeliveryItem = (item: DeliveryNoteItem) => {
            const spkKey = (item.spkNo || '').toString().trim();
            if (spkKey && !seenSPKs.has(spkKey)) {
              seenSPKs.add(spkKey);
              deliveryItems.push(item);
            } else if (spkKey && seenSPKs.has(spkKey)) {
              // Skip duplicate
            } else {
              // Jika tidak ada SPK, tetap tambahkan (untuk backward compatibility)
              deliveryItems.push(item);
            }
          };
          
          // PRIORITAS 1: Jika punya groupedNotifications, ambil quantity dari schedule berdasarkan sjGroupId
          // IMPORTANT: SPK itu 1 product 1, jadi setiap SPK punya quantity sendiri dari schedule
          if (notif.groupedNotifications && Array.isArray(notif.groupedNotifications) && notif.groupedNotifications.length > 0) {
            
            // Load schedule untuk mendapatkan quantity yang tepat dari deliveryBatches
            const scheduleList = await storageService.get<any[]>('gt_schedule') || [];
            
            // Process grouped notifications dengan async
            for (const n of notif.groupedNotifications) {
              // Setiap groupedNotification = 1 SPK = 1 product
              const spkList = n.spkNos || (n.spkNo ? [n.spkNo] : []);
              const productName = await getProductName(n);
              
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
                    return hasMatchingGroup;
                  });
                  
                  if (matchingBatch) {
                    batchQty = matchingBatch.qty || 0;
                  }
                }
                
                // Fallback: ambil batch pertama dari schedule yang match (jika tidak ada sjGroupId match)
                if (batchQty === 0) {
                  const firstBatch = relatedSchedule.deliveryBatches[0];
                  batchQty = firstBatch?.qty || 0;
                }
              }
              
              // Fallback: ambil dari notification qty jika tidak ada dari schedule
              if (batchQty === 0) {
                batchQty = n.qty || 0;
              }
              
              // IMPORTANT: Setiap SPK = 1 item dengan quantity sendiri (tidak digabung)
              addDeliveryItem({
                spkNo: spkList[0] || n.spkNo,
                product: productName,
                qty: batchQty,
                unit: 'PCS',
              });
            }
          }
          // PRIORITAS 2: Jika punya products array, gunakan itu dengan matching dari deliveryBatches
          // Hanya eksekusi jika groupedNotifications tidak ada atau kosong
          else if (notif.products && Array.isArray(notif.products) && notif.products.length > 0 && 
                   (!notif.groupedNotifications || !Array.isArray(notif.groupedNotifications) || notif.groupedNotifications.length === 0)) {
            // New format: products array dengan spkNo, product, productId
            
            notif.products.forEach((p: any, productIdx: number) => {
              let batchQty = 0;
              
              // Cari qty dari deliveryBatches berdasarkan productId atau spkNo
              // IMPORTANT: deliveryBatches adalah array dari semua batches dalam group
              // Setiap batch punya productId, qty, dan mungkin spkNo
              if (notif.deliveryBatches && Array.isArray(notif.deliveryBatches) && notif.deliveryBatches.length > 0) {
                // Prioritas 1: match berdasarkan productId (exact match, case-insensitive)
                let matchingBatch = notif.deliveryBatches.find((db: any) => {
                  if (p.productId && db.productId) {
                    const pId = String(p.productId).trim().toLowerCase();
                    const dbId = String(db.productId).trim().toLowerCase();
                    return pId === dbId;
                  }
                  return false;
                });
                
                // Prioritas 2: match berdasarkan spkNo (jika productId tidak match)
                if (!matchingBatch && p.spkNo) {
                  matchingBatch = notif.deliveryBatches.find((db: any) => {
                    // Cek apakah batch punya spkNo atau bisa di-match dari items
                    if (db.spkNo && p.spkNo) {
                      return String(db.spkNo).trim() === String(p.spkNo).trim();
                    }
                    return false;
                  });
                }
                
                if (matchingBatch) {
                  batchQty = matchingBatch.qty || 0;
                } else {
                  // Fallback: match berdasarkan index (asumsi urutan sama)
                  if (productIdx < notif.deliveryBatches.length) {
                    batchQty = notif.deliveryBatches[productIdx].qty || 0;
                  }
                }
              }
              
              // Fallback terakhir: bagi qty total dengan jumlah products (HARUS DIHINDARI)
              if (batchQty === 0) {
                const totalQty = notif.qty || 0;
                batchQty = notif.products.length > 0 ? Math.round(totalQty / notif.products.length) : totalQty;
              }
              
              addDeliveryItem({
                spkNo: p.spkNo,
                product: p.product,
                qty: batchQty,
                unit: 'PCS',
              });
            });
          } else if (notif.isGrouped && notif.groupedNotifications && 
                     (!notif.products || !Array.isArray(notif.products) || notif.products.length === 0)) {
            // Untuk grouped notification, ambil dari groupedNotifications
            for (const n of notif.groupedNotifications) {
              // Handle new format dengan products array atau old format
              if (n.products && Array.isArray(n.products)) {
                // New format: products array dengan spkNo, product, productId
                n.products.forEach((p: any, productIdx: number) => {
                  let batchQty = 0;
                  
                  // Cari qty dari notif.deliveryBatches (grouped notification level)
                  if (notif.deliveryBatches && Array.isArray(notif.deliveryBatches) && notif.deliveryBatches.length > 0) {
                    // Prioritas 1: match berdasarkan productId (exact match)
                    const matchingBatch = notif.deliveryBatches.find((db: any) => {
                      if (p.productId && db.productId) {
                        const pId = String(p.productId).trim().toLowerCase();
                        const dbId = String(db.productId).trim().toLowerCase();
                        return pId === dbId;
                      }
                      return false;
                    });
                    
                    if (matchingBatch) {
                      batchQty = matchingBatch.qty || 0;
                    } else {
                      // Fallback: match berdasarkan index (asumsi urutan sama)
                      if (productIdx < notif.deliveryBatches.length) {
                        batchQty = notif.deliveryBatches[productIdx].qty || 0;
                      }
                    }
                  }
                  
                  // Fallback: ambil dari n.deliveryBatches (notification level)
                  if (batchQty === 0 && n.deliveryBatches && Array.isArray(n.deliveryBatches) && n.deliveryBatches.length > 0) {
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
                    } else {
                      // Fallback: match berdasarkan index
                      if (productIdx < n.deliveryBatches.length) {
                        batchQty = n.deliveryBatches[productIdx].qty || 0;
                      }
                    }
                  }
                  
                  // Fallback terakhir: bagi qty total dengan jumlah products
                  if (batchQty === 0) {
                    const totalQty = n.qty || notif.qty || 0;
                    batchQty = n.products.length > 0 ? Math.round(totalQty / n.products.length) : totalQty;
                  }
                  
                  addDeliveryItem({
                    spkNo: p.spkNo,
                    product: p.product,
                    qty: batchQty,
                    unit: 'PCS',
                  });
                });
              } else {
                // Old format: single spkNo dan product
                const spkList = n.spkNos || (n.spkNo ? [n.spkNo] : []);
                const productName = await getProductName(n);
                const qty = n.qty || 0;
                
                // Jika ada multiple SPK, buat item per SPK
                if (spkList.length > 0) {
                  spkList.forEach((spk: string) => {
                    // Cari qty dari deliveryBatches untuk SPK ini
                    let batchQty = 0;
                    
                    // Coba ambil dari notif.deliveryBatches (grouped notification level)
                    if (notif.deliveryBatches && Array.isArray(notif.deliveryBatches)) {
                      const matchingBatch = notif.deliveryBatches.find((db: any) => 
                        db.spkNo === spk
                      );
                      batchQty = matchingBatch?.qty || 0;
                    }
                    
                    // Fallback: ambil dari n.deliveryBatches (notification level)
                    if (batchQty === 0 && n.deliveryBatches && Array.isArray(n.deliveryBatches)) {
                      const matchingBatch = n.deliveryBatches.find((db: any) => 
                        db.spkNo === spk
                      );
                      batchQty = matchingBatch?.qty || 0;
                    }
                    
                    // Fallback terakhir: bagi qty total dengan jumlah SPK
                    if (batchQty === 0) {
                      batchQty = spkList.length > 1 ? (qty / spkList.length) : qty;
                    }
                    
                    addDeliveryItem({
                      spkNo: spk,
                      product: productName,
                      qty: batchQty,
                      unit: 'PCS',
                    });
                  });
                } else {
                  // Fallback: single item
                  addDeliveryItem({
                    spkNo: n.spkNo,
                    product: productName,
                    qty: qty,
                    unit: 'PCS',
                  });
                }
              }
            }
          } else {
            // Untuk single notification (tidak grouped)
            const n = notif;
            // Handle new format dengan products array atau old format
            if (n.products && Array.isArray(n.products) && n.products.length > 0) {
              // New format: products array dengan spkNo, product, productId
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
                  } else {
                    // Fallback: match berdasarkan index (asumsi urutan sama)
                    if (productIdx < n.deliveryBatches.length) {
                      batchQty = n.deliveryBatches[productIdx].qty || 0;
                    }
                  }
                }
                
                // Fallback: bagi qty total dengan jumlah products
                if (batchQty === 0) {
                  const totalQty = n.qty || 0;
                  batchQty = n.products.length > 0 ? Math.round(totalQty / n.products.length) : totalQty;
                }
                
                addDeliveryItem({
                  spkNo: p.spkNo,
                  product: p.product,
                  qty: batchQty,
                  unit: 'PCS',
                });
              });
            } else {
              // Old format: single spkNo dan product atau spkNos array
              const spkList = n.spkNos || (n.spkNo ? [n.spkNo] : []);
              
              const productName = await getProductName(n);
              const qty = n.qty || 0;
              
              // Jika ada multiple SPK, buat item per SPK
              if (spkList.length > 0) {
                spkList.forEach((spk: string, spkIdx: number) => {
                  // Cari qty dari deliveryBatches untuk SPK ini
                  let batchQty = 0;
                  
                  if (n.deliveryBatches && Array.isArray(n.deliveryBatches)) {
                    const matchingBatch = n.deliveryBatches.find((db: any, batchIdx: number) => {
                      if (db.spkNo === spk) {
                        return true;
                      }
                      // Fallback: match berdasarkan index
                      return batchIdx === spkIdx;
                    });
                    batchQty = matchingBatch?.qty || 0;
                  }
                  
                  // Fallback: bagi qty total dengan jumlah SPK
                  if (batchQty === 0) {
                    batchQty = spkList.length > 1 ? (qty / spkList.length) : qty;
                  }
                  
                  addDeliveryItem({
                    spkNo: spk,
                    product: productName,
                    qty: batchQty,
                    unit: 'PCS',
                  });
                });
              } else {
                // Fallback: single item
                addDeliveryItem({
                  spkNo: n.spkNo,
                  product: productName,
                  qty: qty,
                  unit: 'PCS',
                });
              }
            }
          }
          
          // IMPORTANT: Pastikan semua items dibuat dengan benar
          // Jika deliveryItems kosong, coba buat dari notif.products atau notif.spkNos
          if (deliveryItems.length === 0) {
            if (notif.products && Array.isArray(notif.products)) {
              notif.products.forEach((p: any) => {
                addDeliveryItem({
                  spkNo: p.spkNo,
                  product: p.product,
                  qty: notif.qty || 0, // Fallback: gunakan total qty jika tidak ada batch
                  unit: 'PCS',
                });
              });
            } else if (notif.spkNos && Array.isArray(notif.spkNos)) {
              const qtyPerSPK = notif.spkNos.length > 0 ? ((notif.qty || 0) / notif.spkNos.length) : (notif.qty || 0);
              const productName = await getProductName(notif);
              notif.spkNos.forEach((spk: string) => {
                addDeliveryItem({
                  spkNo: spk,
                  product: productName,
                  qty: qtyPerSPK,
                  unit: 'PCS',
                });
              });
            } else if (notif.items && Array.isArray(notif.items) && notif.items.length > 0) {
              // Handle notifikasi dari SO yang punya items array
              notif.items.forEach((item: any) => {
                const remainingQty = item.remainingQty || item.qty || 0;
                if (remainingQty > 0) {
                  // Cari SPK dari SPK data berdasarkan SO dan product
                  let spkNo = item.spkNo;
                  if (!spkNo && notif.soNo) {
                    const relatedSPK = spkData.find((s: any) => {
                      if (s.soNo !== notif.soNo) return false;
                      if (item.product && s.product) {
                        return s.product.toLowerCase().includes(item.product.toLowerCase()) || 
                               item.product.toLowerCase().includes(s.product.toLowerCase());
                      }
                      return false;
                    });
                    if (relatedSPK && relatedSPK.spkNo) {
                      spkNo = relatedSPK.spkNo;
                    }
                  }
                  
                  addDeliveryItem({
                    spkNo: spkNo || '',
                    product: item.product || '',
                    qty: remainingQty,
                    unit: item.unit || 'PCS',
                  });
                }
              });
            } else {
              // Fallback terakhir: single item
              const productName = await getProductName(notif);
              // Cari SPK dari SPK data jika tidak ada di notifikasi
              let spkNo = notif.spkNo;
              if (!spkNo && notif.soNo) {
                const relatedSPK = spkData.find((s: any) => {
                  if (s.soNo !== notif.soNo) return false;
                  if (notif.product && s.product) {
                    return s.product.toLowerCase().includes(notif.product.toLowerCase()) || 
                           notif.product.toLowerCase().includes(s.product.toLowerCase());
                  }
                  return false;
                });
                if (relatedSPK && relatedSPK.spkNo) {
                  spkNo = relatedSPK.spkNo;
                }
              }
              
              // Hitung qty dari items jika ada
              let qty = notif.qty || 0;
              if (notif.items && Array.isArray(notif.items) && notif.items.length > 0) {
                qty = notif.items.reduce((sum: number, item: any) => {
                  return sum + (item.remainingQty || item.qty || 0);
                }, 0);
              }
              
              addDeliveryItem({
                spkNo: spkNo || '',
                product: productName,
                qty: qty,
                unit: 'PCS',
              });
            }
          }
          
          // Final deduplication: remove duplicate items berdasarkan SPK
          const finalDeliveryItems: DeliveryNoteItem[] = [];
          const finalSeenSPKs = new Set<string>();
          for (const item of deliveryItems) {
            const spkKey = (item.spkNo || '').toString().trim();
            if (spkKey && !finalSeenSPKs.has(spkKey)) {
              finalSeenSPKs.add(spkKey);
              finalDeliveryItems.push(item);
            } else if (!spkKey) {
              // Jika tidak ada SPK, tetap tambahkan (untuk backward compatibility)
              finalDeliveryItems.push(item);
            }
          }
          
          // Replace deliveryItems dengan finalDeliveryItems yang sudah di-deduplicate
          deliveryItems.length = 0;
          deliveryItems.push(...finalDeliveryItems);
          
          
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
          
          const updated = [...deliveries, newDelivery];
          await storageService.set('gt_delivery', updated);
          setDeliveries(updated);

          // Update inventory - TAMBAHKAN OUTGOING untuk product yang dikirim
          try {
            await updateInventoryFromDelivery(newDelivery);
          } catch (error: any) {
            console.error('❌ Error updating inventory from delivery note:', error);
            // Jangan block proses, tapi log error
          }

          // Update notification status for all processed notifications
          // IMPORTANT: Hanya update gt_deliveryNotifications (GT), jangan load dari deliveryNotifications (packaging)
          const deliveryNotifications = await storageService.get<any[]>('gt_deliveryNotifications') || [];
          const notificationIds = notificationsToProcess.map((n: any) => n.id);
          const updatedNotifications = deliveryNotifications.map((n: any) =>
            notificationIds.includes(n.id) ? { ...n, status: 'DELIVERY_CREATED' } : n
          );
          await storageService.set('gt_deliveryNotifications', updatedNotifications);
          
          // Send notification to Accounting for invoice creation (saat delivery dibuat, belum ada signed doc)
          // Notifikasi ini akan di-update saat signed doc di-upload
          try {
            const invoiceNotifications = await storageService.get<any[]>('gt_invoiceNotifications') || [];
            const existingInvoiceNotif = invoiceNotifications.find((n: any) => 
              n.sjNo === sjNo && n.type === 'CUSTOMER_INVOICE'
            );
            
            if (!existingInvoiceNotif) {
              // Get SO info
              const salesOrders = await storageService.get<any[]>('gt_salesOrders') || [];
              const so = salesOrders.find((s: any) => s.soNo === notif.soNo);
              const poCustomerNo = so?.poCustomerNo || so?.soNo || '-';
              
              // Get SPK numbers from delivery items
              const spkNosFromSJ = deliveryItems
                .map((item: any) => item.spkNo)
                .filter((spk: string) => spk && spk.trim() !== '');
              
              const newInvoiceNotification = {
                id: `invoice-${Date.now()}-${sjNo}`,
                type: 'CUSTOMER_INVOICE',
                sjNo: sjNo,
                soNo: notif.soNo,
                poCustomerNo: poCustomerNo,
                spkNos: spkNosFromSJ,
                customer: notif.customer,
                customerKode: so?.customerKode || '',
                items: deliveryItems.map((item: any) => ({
                  product: item.product || '',
                  productId: item.productId || '',
                  productKode: item.productKode || '',
                  qty: item.qty || 0,
                  unit: item.unit || 'PCS',
                })),
                totalQty: deliveryItems.reduce((sum: number, item: any) => sum + (item.qty || 0), 0),
                status: 'PENDING',
                created: new Date().toISOString(),
              };
              await storageService.set('gt_invoiceNotifications', [...invoiceNotifications, newInvoiceNotification]);
            }
          } catch (error: any) {
            console.error('❌ Error creating invoice notification:', error);
          }

          const itemCount = deliveryItems.length;
          const totalQty = deliveryItems.reduce((sum, item) => sum + (item.qty || 0), 0);
          showAlert('Success', `✅ Delivery Note created: ${sjNo}\n\n${itemCount} product(s):\n${deliveryItems.map((item, idx) => `  ${idx + 1}. ${item.product} - ${item.qty} PCS (SPK: ${item.spkNo})`).join('\n')}\n\nTotal Qty: ${totalQty} PCS\n✅ Inventory updated (outgoing)`);
          
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
    const newStatus = prompt(`Update status for SJ: ${item.sjNo}\n\nCurrent: ${item.status}\n\nEnter new status (DRAFT/OPEN/CLOSE):`, item.status);
    if (newStatus && newStatus !== item.status && ['DRAFT', 'OPEN', 'CLOSE'].includes(newStatus)) {
      // Jika mau close, wajib upload signed document
      if (newStatus === 'CLOSE' && !item.signedDocument) {
        showAlert('Validation Error', '⚠️ Cannot close Delivery Note without signed document!\n\nPlease upload signed document (Surat Jalan yang sudah di TTD) first.');
        return;
      }

      try {
        const updated = deliveries.map(d =>
          d.id === item.id ? { ...d, status: newStatus as any } : d
        );
        await storageService.set('gt_delivery', updated);
        setDeliveries(updated);
        
        // Jika status diubah jadi CLOSE dan sudah ada signed document, pastikan invoice notification sudah ada
        if (newStatus === 'CLOSE' && item.signedDocument) {
          try {
            const invoiceNotifications = await storageService.get<any[]>('gt_invoiceNotifications') || [];
            const existingInvoiceNotif = invoiceNotifications.find((n: any) => 
              n.sjNo === item.sjNo && n.type === 'CUSTOMER_INVOICE'
            );
            
            if (!existingInvoiceNotif) {
              // Get SO info
              const salesOrders = await storageService.get<any[]>('gt_salesOrders') || [];
              const so = salesOrders.find((s: any) => s.soNo === item.soNo);
              const poCustomerNo = so?.poCustomerNo || so?.soNo || '-';
              
              // Get SPK numbers from delivery items
              const spkNosFromSJ = (item.items || [])
                .map((deliveryItem: any) => deliveryItem.spkNo)
                .filter((spk: string) => spk && spk.trim() !== '');
              
              const newInvoiceNotification = {
                id: `invoice-${Date.now()}-${item.sjNo}`,
                type: 'CUSTOMER_INVOICE',
                sjNo: item.sjNo,
                soNo: item.soNo,
                poCustomerNo: poCustomerNo,
                spkNos: spkNosFromSJ,
                customer: item.customer,
                customerKode: so?.customerKode || '',
                items: (item.items || []).map((deliveryItem: any) => ({
                  product: deliveryItem.product || '',
                  productId: deliveryItem.productId || '',
                  productKode: deliveryItem.productKode || '',
                  qty: deliveryItem.qty || 0,
                  unit: deliveryItem.unit || 'PCS',
                })),
                totalQty: (item.items || []).reduce((sum: number, deliveryItem: any) => sum + (deliveryItem.qty || 0), 0),
                signedDocument: item.signedDocument,
                signedDocumentName: item.signedDocumentName,
                status: 'PENDING',
                created: new Date().toISOString(),
              };
              await storageService.set('gt_invoiceNotifications', [...invoiceNotifications, newInvoiceNotification]);
              showAlert('Success', `✅ Status updated to: ${newStatus}\n\n📧 Notification sent to Accounting - Customer Invoice tab`);
            } else {
              showAlert('Success', `✅ Status updated to: ${newStatus}`);
            }
          } catch (error: any) {
            console.error('❌ Error creating invoice notification:', error);
            showAlert('Success', `✅ Status updated to: ${newStatus}`);
          }
        } else {
          showAlert('Success', `✅ Status updated to: ${newStatus}`);
        }
      } catch (error: any) {
        showAlert('Error', `Error updating status: ${error.message}`);
      }
    }
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

  const renderDeliveryActions = (item: DeliveryNote, options?: { allowWrap?: boolean }) => (
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
          {item.status === 'OPEN' && !item.signedDocument && (
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
          {item.signedDocument && (
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
        return (
          (delivery.sjNo || '').toLowerCase().includes(query) ||
          (delivery.soNo || '').toLowerCase().includes(query) ||
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
      const key = `${delivery.soNo || 'NO_SO'}|${delivery.customer || '-'}`;
      if (!groups[key]) {
        groups[key] = {
          soNo: delivery.soNo || '-',
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

  // Get row color based on SO No (dark theme selang-seling)
  const getRowColor = (soNo: string): string => {
    const uniqueSOs = Array.from(new Set(filteredDeliveries.map(d => d.soNo)));
    const soIndex = uniqueSOs.indexOf(soNo);
    const rowColors = ['#1b1b1b', '#2f2f2f'];
    const index = soIndex >= 0 ? soIndex : 0;
    return rowColors[index % rowColors.length];
  };

  // Flatten delivery data untuk table view (Excel-like) - setiap item jadi row terpisah
  const flattenedDeliveryData = useMemo(() => {
    if (deliveryViewMode !== 'table') return [];
    
    const flattened: any[] = [];
    filteredDeliveries.forEach((delivery: DeliveryNote) => {
      if (!delivery.items || delivery.items.length === 0) {
        // Jika tidak ada items, tetap tampilkan delivery sebagai 1 row
        flattened.push({
          id: delivery.id,
          sjNo: delivery.sjNo || '-',
          soNo: delivery.soNo,
          customer: delivery.customer,
          product: delivery.product || '-',
          qty: delivery.qty || 0,
          unit: 'PCS',
          status: delivery.status,
          deliveryDate: delivery.deliveryDate || '-',
          driver: delivery.driver || '-',
          vehicleNo: delivery.vehicleNo || '-',
          _delivery: delivery, // Keep reference untuk actions
          _sortKey: delivery.id || delivery.sjNo || '', // Untuk sorting berdasarkan ID (terbaru = ID lebih besar)
        });
      } else {
        // Flatten setiap item menjadi row terpisah
        delivery.items.forEach((item: DeliveryNoteItem, idx: number) => {
        flattened.push({
          id: `${delivery.id}-item-${idx}`,
          sjNo: delivery.sjNo || '-',
          soNo: delivery.soNo,
          customer: delivery.customer,
          product: item.product || '-',
          qty: item.qty || 0,
          unit: item.unit || 'PCS',
          status: delivery.status,
          deliveryDate: delivery.deliveryDate || '-',
          driver: delivery.driver || '-',
          vehicleNo: delivery.vehicleNo || '-',
          _delivery: delivery, // Keep reference untuk actions
          _sortKey: delivery.id || delivery.sjNo || '', // Untuk sorting berdasarkan ID (terbaru = ID lebih besar)
        });
        });
      }
    });
    
    // Sort: terbaru paling atas
    // Priority: 1) deliveryDate (jika ada), 2) sjNo (jika ada), 3) ID (timestamp)
    flattened.sort((a, b) => {
      const deliveryA = a._delivery as DeliveryNote;
      const deliveryB = b._delivery as DeliveryNote;
      
      // Priority 1: deliveryDate (jika ada)
      if (deliveryA.deliveryDate && deliveryB.deliveryDate) {
        const dateA = new Date(deliveryA.deliveryDate).getTime();
        const dateB = new Date(deliveryB.deliveryDate).getTime();
        if (dateA !== dateB) {
          return dateB - dateA; // Descending: terbaru di atas
        }
      } else if (deliveryA.deliveryDate && !deliveryB.deliveryDate) {
        return -1; // A lebih baru
      } else if (!deliveryA.deliveryDate && deliveryB.deliveryDate) {
        return 1; // B lebih baru
      }
      
      // Priority 2: sjNo (jika ada, lebih baru = lebih besar)
      if (deliveryA.sjNo && deliveryB.sjNo) {
        // Extract date dari SJ No (format: SJ-251224-XXXXX)
        const sjDateA = deliveryA.sjNo.match(/SJ-(\d{6})/);
        const sjDateB = deliveryB.sjNo.match(/SJ-(\d{6})/);
        if (sjDateA && sjDateB) {
          const dateA = parseInt(sjDateA[1]); // YYMMDD
          const dateB = parseInt(sjDateB[1]); // YYMMDD
          if (dateA !== dateB) {
            return dateB - dateA; // Descending: terbaru di atas
          }
        }
        // Jika date sama, compare full SJ No
        if (deliveryA.sjNo !== deliveryB.sjNo) {
          return deliveryB.sjNo.localeCompare(deliveryA.sjNo); // Descending
        }
      } else if (deliveryA.sjNo && !deliveryB.sjNo) {
        return -1; // A lebih baru
      } else if (!deliveryA.sjNo && deliveryB.sjNo) {
        return 1; // B lebih baru
      }
      
      // Priority 3: ID (timestamp, lebih besar = lebih baru)
      const idA = parseInt(a._sortKey) || 0;
      const idB = parseInt(b._sortKey) || 0;
      return idB - idA; // Descending: terbaru di atas
    });
    
    return flattened;
  }, [filteredDeliveries, deliveryViewMode]);

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
      
      // Sheet 1: All Delivery Notes - Detail lengkap
      const allDeliveryData: any[] = [];
      deliveries.forEach((delivery: DeliveryNote) => {
        if (delivery.items && delivery.items.length > 0) {
          delivery.items.forEach((item, idx) => {
            allDeliveryData.push({
              sjNo: delivery.sjNo || '',
              soNo: delivery.soNo,
              customer: delivery.customer,
              spkNo: delivery.spkNo || '',
              driver: delivery.driver || '',
              vehicleNo: delivery.vehicleNo || '',
              itemNo: idx + 1,
              product: item.product || delivery.product || '',
              qty: typeof item.qty === 'string' ? parseFloat(item.qty) : (item.qty || 0),
              unit: item.unit || 'PCS',
              status: delivery.status,
              deliveryDate: delivery.deliveryDate || '',
              signedDocument: delivery.signedDocument ? 'Yes' : 'No',
              signedDocumentName: delivery.signedDocumentName || '',
            });
          });
        } else {
          allDeliveryData.push({
            sjNo: delivery.sjNo || '',
            soNo: delivery.soNo,
            customer: delivery.customer,
            spkNo: delivery.spkNo || '',
            driver: delivery.driver || '',
            vehicleNo: delivery.vehicleNo || '',
            itemNo: 1,
            product: delivery.product || '',
            qty: delivery.qty || 0,
            unit: 'PCS',
            status: delivery.status,
            deliveryDate: delivery.deliveryDate || '',
            signedDocument: delivery.signedDocument ? 'Yes' : 'No',
            signedDocumentName: delivery.signedDocumentName || '',
          });
        }
      });

      if (allDeliveryData.length > 0) {
        const deliveryColumns: ExcelColumn[] = [
          { key: 'sjNo', header: 'SJ No', width: 20 },
          { key: 'soNo', header: 'SO No', width: 20 },
          { key: 'spkNo', header: 'SPK No', width: 20 },
          { key: 'customer', header: 'Customer', width: 30 },
          { key: 'driver', header: 'Driver', width: 20 },
          { key: 'vehicleNo', header: 'Vehicle No', width: 15 },
          { key: 'itemNo', header: 'Item No', width: 10, format: 'number' },
          { key: 'product', header: 'Product', width: 40 },
          { key: 'qty', header: 'Qty', width: 12, format: 'number' },
          { key: 'unit', header: 'Unit', width: 10 },
          { key: 'status', header: 'Status', width: 15 },
          { key: 'deliveryDate', header: 'Delivery Date', width: 18, format: 'date' },
          { key: 'created', header: 'Created Date', width: 18, format: 'date' },
          { key: 'signedDocument', header: 'Signed Document', width: 15 },
          { key: 'signedDocumentName', header: 'Document Name', width: 30 },
        ];
        const wsDelivery = createStyledWorksheet(allDeliveryData, deliveryColumns, 'Sheet 1 - Delivery');
        setColumnWidths(wsDelivery, deliveryColumns);
        const totalQty = allDeliveryData.reduce((sum, d) => sum + (d.qty || 0), 0);
        addSummaryRow(wsDelivery, deliveryColumns, {
          sjNo: 'TOTAL',
          qty: totalQty,
        });
        XLSX.utils.book_append_sheet(wb, wsDelivery, 'Sheet 1 - Delivery');
      }

      // Sheet 2: Schedule Data
      if (scheduleData.length > 0) {
        const scheduleDataExport = scheduleData.map((schedule: any) => ({
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
      const outstandingDeliveries = deliveries.filter((d: DeliveryNote) => d.status === 'OPEN');
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
        showAlert('No data available to export', 'Information');
        return;
      }

      const fileName = `Delivery_Notes_Complete_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Exported complete delivery data (${allDeliveryData.length} items, ${scheduleData.length} schedule, ${outstandingData.length} outstanding) to ${fileName}`, 'Success');
    } catch (error: any) {
      showAlert(`Error exporting to Excel: ${error.message}`, 'Error');
    }
  };

  // Columns untuk table view (Excel-like) - menggunakan flattened data
  const tableColumns = [
    { 
      key: 'sjNo', 
      header: 'SJ No',
      render: (item: any) => (
        <strong style={{ color: '#2e7d32', fontSize: '13px' }}>{item.sjNo}</strong>
      ),
    },
    { 
      key: 'soNo', 
      header: 'SO No',
      render: (item: any) => (
        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{item.soNo}</span>
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
      key: 'deliveryDate',
      header: 'Delivery Date',
      render: (item: any) => (
        <span style={{ fontSize: '12px' }}>{formatDateSimple(item.deliveryDate)}</span>
      ),
    },
    {
      key: 'driver',
      header: 'Driver',
      render: (item: any) => (
        <span style={{ fontSize: '12px' }}>{item.driver || '-'}</span>
      ),
    },
    {
      key: 'vehicleNo',
      header: 'Vehicle No',
      render: (item: any) => (
        <span style={{ fontSize: '12px' }}>{item.vehicleNo || '-'}</span>
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
      key: 'actions',
      header: 'Actions',
      render: (item: any) => {
        const delivery = item._delivery;
        // Ensure file input exists for upload functionality
        if (!fileInputRefs.current[delivery.id] && delivery.sjNo && delivery.status === 'OPEN' && !delivery.signedDocument) {
          // Create a temporary input element if needed (will be handled by cards view)
        }
        return (
          <>
            {delivery.sjNo && delivery.status === 'OPEN' && !delivery.signedDocument && (
              <input
                ref={(el) => {
                  if (el) fileInputRefs.current[delivery.id] = el;
                }}
                type="file"
                accept="image/*,.pdf"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleUploadSignedDocument(delivery, file);
                    if (e.target) {
                      e.target.value = '';
                    }
                  }
                }}
              />
            )}
            <DeliveryActionMenu
              item={delivery}
              onGenerateSJ={!delivery.sjNo ? () => handleGenerateSJ(delivery) : undefined}
              onViewDetail={delivery.sjNo ? () => handleViewDetail(delivery) : undefined}
              onEdit={delivery.sjNo ? () => handleEditSJ(delivery) : undefined}
              onPrint={delivery.sjNo ? () => handlePrint(delivery) : undefined}
              onUploadSignedDocument={delivery.sjNo && delivery.status === 'OPEN' && !delivery.signedDocument ? () => {
                const input = fileInputRefs.current[delivery.id];
                if (input) {
                  input.click();
                }
              } : undefined}
              onViewSignedDocument={delivery.signedDocument ? () => handleViewSignedDocument(delivery) : undefined}
              onDownloadSignedDocument={delivery.signedDocument ? () => handleDownloadSignedDocument(delivery) : undefined}
            />
          </>
        );
      },
    },
  ];

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

      {/* Notifications - HIDDEN, menggunakan NotificationBell di header */}

      {showForm && (
        <Card title={selectedDelivery ? "Edit Delivery Note" : "Create New Delivery Note"} className="mb-4">
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
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                Products * (dari SO) - Pilih beberapa item
              </label>
              {selectedSoProducts.length > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    const allSelected: { [key: string]: { product: string; productKode?: string; qty: number; soQty: number; soNo: string } } = {};
                    selectedSoProducts.forEach((prod) => {
                      const itemKey = `${formData.soNo}-${prod.productName}`;
                      // Cek qty yang sudah di-deliver
                      const existingDeliveries = deliveries.filter((d: any) => 
                        d.soNo === formData.soNo && d.items?.some((item: any) => item.product === prod.productName)
                      );
                      const totalDelivered = existingDeliveries.reduce((sum: number, d: any) => {
                        const item = d.items?.find((item: any) => item.product === prod.productName);
                        return sum + (item?.qty || 0);
                      }, 0);
                      const remainingQty = prod.qty - totalDelivered;
                      if (remainingQty > 0) {
                        allSelected[itemKey] = {
                          product: prod.productName,
                          productKode: prod.productKode,
                          qty: remainingQty,
                          soQty: prod.qty,
                          soNo: formData.soNo || '',
                        };
                      }
                    });
                    setSelectedItemsForDelivery(allSelected);
                  }}
                  style={{ fontSize: '12px', padding: '4px 8px' }}
                >
                  Select All (Remaining)
                </Button>
              )}
            </div>
            {selectedSoProducts.length > 0 ? (
              <div style={{
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '12px',
                maxHeight: '300px',
                overflowY: 'auto',
                backgroundColor: 'var(--bg-primary)',
              }}>
                {selectedSoProducts.map((prod, idx) => {
                  const itemKey = `${formData.soNo}-${prod.productName}`;
                  const isSelected = selectedItemsForDelivery[itemKey] !== undefined;
                  const selectedItem = selectedItemsForDelivery[itemKey];
                  
                  // Cek qty yang sudah di-deliver
                  const existingDeliveries = deliveries.filter((d: any) => 
                    d.soNo === formData.soNo && d.items?.some((item: any) => item.product === prod.productName)
                  );
                  const totalDelivered = existingDeliveries.reduce((sum: number, d: any) => {
                    const item = d.items?.find((item: any) => item.product === prod.productName);
                    return sum + (item?.qty || 0);
                  }, 0);
                  const remainingQty = prod.qty - totalDelivered;
                  
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '8px',
                        marginBottom: '8px',
                        border: isSelected ? '2px solid var(--accent-color)' : '1px solid var(--border)',
                        borderRadius: '4px',
                        backgroundColor: isSelected ? 'var(--bg-secondary)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItemsForDelivery({
                              ...selectedItemsForDelivery,
                              [itemKey]: {
                                product: prod.productName,
                                productKode: prod.productKode,
                                qty: remainingQty,
                                soQty: prod.qty,
                                soNo: formData.soNo || '',
                              },
                            });
                          } else {
                            const newSelected = { ...selectedItemsForDelivery };
                            delete newSelected[itemKey];
                            setSelectedItemsForDelivery(newSelected);
                          }
                        }}
                        style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500', marginBottom: '4px', color: 'var(--text-primary)' }}>
                          {prod.productName} {prod.productKode ? `(${prod.productKode})` : ''}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Qty SO: {prod.qty} PCS | Delivered: {totalDelivered} PCS | Remaining: {remainingQty} PCS
                        </div>
                      </div>
                      {isSelected && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <label style={{ fontSize: '12px', color: 'var(--text-primary)' }}>Qty:</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={selectedItem?.qty || remainingQty}
                            onChange={(e) => {
                              let val = e.target.value;
                              val = val.replace(/[^\d.,]/g, '');
                              const cleaned = removeLeadingZero(val);
                              const numVal = cleaned === '' ? 0 : Number(cleaned) || 0;
                              const finalQty = Math.min(numVal, remainingQty); // Tidak boleh melebihi remaining
                              setSelectedItemsForDelivery({
                                ...selectedItemsForDelivery,
                                [itemKey]: {
                                  ...selectedItem!,
                                  qty: finalQty,
                                },
                              });
                            }}
                            onBlur={(e) => {
                              const val = e.target.value;
                              if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                                setSelectedItemsForDelivery({
                                  ...selectedItemsForDelivery,
                                  [itemKey]: {
                                    ...selectedItem!,
                                    qty: remainingQty,
                                  },
                                });
                              } else {
                                const numVal = Number(val);
                                const finalQty = Math.min(numVal, remainingQty);
                                setSelectedItemsForDelivery({
                                  ...selectedItemsForDelivery,
                                  [itemKey]: {
                                    ...selectedItem!,
                                    qty: finalQty,
                                  },
                                });
                              }
                            }}
                            placeholder="0"
                            style={{
                              width: '80px',
                              padding: '4px 8px',
                              border: '1px solid var(--border)',
                              borderRadius: '4px',
                              backgroundColor: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              fontSize: '12px',
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                {selectedSoProducts.length === 0 && (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Pilih SO terlebih dahulu untuk load products
                  </div>
                )}
              </div>
            ) : (
              <Input
                value={formData.product || ''}
                onChange={(v) => setFormData({ ...formData, product: v })}
                placeholder="Pilih SO terlebih dahulu untuk load products"
                disabled={!formData.soNo}
              />
            )}
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Driver
            </label>
            <Input
              value={formData.driver || ''}
              onChange={(v) => setFormData({ ...formData, driver: v })}
              placeholder="Nama Driver"
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Vehicle No
            </label>
            <Input
              value={formData.vehicleNo || ''}
              onChange={(v) => setFormData({ ...formData, vehicleNo: v })}
              placeholder="Nomor Kendaraan"
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Delivery Date
            </label>
            <input
              type="date"
              value={formData.deliveryDate || ''}
              onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
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
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <Button onClick={() => { 
              setShowForm(false); 
              setCustomerInputValue(''); 
              setSoInputValue(''); 
              setSelectedDelivery(null);
              setSelectedSoProducts([]);
              setSelectedItemsForDelivery({});
              setFormData({ soNo: '', customer: '', product: '', qty: 0, driver: '', vehicleNo: '', deliveryDate: '', items: [] }); 
            }} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleSave} variant="primary">
              {selectedDelivery ? 'Update Delivery Note' : 'Save Delivery Note'}
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
            Outstanding ({deliveries.filter(d => d.status === 'OPEN').length})
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
                    {groupedDeliveries.map(group => {
                      const latestLabel = group.latestTimestamp
                        ? formatDateSimple(new Date(group.latestTimestamp).toISOString())
                        : '-';
                      return (
                        <Card key={`${group.soNo}-${group.customer}-${group.latestTimestamp}`}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                            <div>
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
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>SO {delivery.soNo}</div>
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
                                    delivery.items.map((itm, idx) => (
                                      <div key={`${delivery.id}-item-${idx}`}>• {itm.product} ({itm.qty} {itm.unit || 'PCS'})</div>
                                    ))
                                  ) : (
                                    <div>• {delivery.product || '-'} ({delivery.qty || 0} PCS)</div>
                                  )}
                                </div>
                                <div style={{ marginTop: '4px' }}>
                                  {renderDeliveryActions(delivery, { allowWrap: true })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {searchQuery ? 'No deliveries found matching your search' : 'No deliveries'}
                  </div>
                )
              ) : (
                <Table 
                  columns={tableColumns} 
                  data={flattenedDeliveryData} 
                  emptyMessage={searchQuery ? "No deliveries found matching your search" : "No deliveries"}
                  getRowStyle={(item: any) => ({
                    backgroundColor: getRowColor(item.soNo),
                  })}
                />
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
              <Table 
                columns={tableColumns} 
                data={flattenedDeliveryData} 
                emptyMessage="No outstanding deliveries"
                getRowStyle={(item: any) => ({
                  backgroundColor: getRowColor(item.soNo),
                })}
              />
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
      {/* Create Delivery Note Dialog */}
      {showCreateDeliveryNoteDialog && (
        <CreateDeliveryNoteDialog
          deliveries={deliveries}
          salesOrders={salesOrders}
          customers={customers}
          products={products}
          onClose={() => setShowCreateDeliveryNoteDialog(false)}
          onCreate={async (data) => {
            try {
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
                soNo: data.soNo || '',
                customer: data.customer || '',
                customerAddress: data.customerAddress,
                customerPIC: data.customerPIC,
                customerPhone: data.customerPhone,
                picProgram: data.picProgram,
                items: data.items || [],
                status: 'OPEN' as const,
                driver: data.driver || '',
                vehicleNo: data.vehicleNo || '',
                deliveryDate: data.deliveryDate || undefined,
                productCodeDisplay: data.productCodeDisplay,
                specNote: data.specNote,
                senderName: data.senderName,
                senderTitle: data.senderTitle,
                senderDate: data.senderDate,
                receiverName: data.receiverName,
                receiverTitle: data.receiverTitle,
                receiverDate: data.receiverDate,
              };
              
              const updated = [...deliveries, newDelivery];
              await storageService.set('gt_delivery', updated);
              setDeliveries(updated);
              
              // Update inventory - TAMBAHKAN OUTGOING untuk product yang dikirim
              try {
                await updateInventoryFromDelivery(newDelivery);
              } catch (error: any) {
                // Jangan block proses, tapi log error
              }
              
              setShowCreateDeliveryNoteDialog(false);
              showAlert('Success', `✅ Delivery Note created: ${sjNo}\n\nFrom SO: ${data.soNo}\nItems: ${data.items?.length || 0} product(s)\nTotal Qty: ${data.items?.reduce((sum: number, item: any) => sum + (item.qty || 0), 0) || 0} PCS\n✅ Inventory updated (outgoing)`);
            } catch (error: any) {
              showAlert('Error', `Error creating Delivery Note: ${error.message}`);
            }
          }}
        />
      )}

      {selectedDelivery && (
        <EditSJDialog
          delivery={selectedDelivery}
          onClose={() => setSelectedDelivery(null)}
          onSave={async (updatedData) => {
            const updated = deliveries.map(d =>
              d.id === selectedDelivery.id ? { ...d, ...updatedData } : d
            );
            await storageService.set('gt_delivery', updated);
            setDeliveries(updated);
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
          onClick={() => setViewPdfData(null)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90%', width: '1200px', maxHeight: '90vh', overflow: 'auto' }}>
            <Card className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2>Preview Surat Jalan - {viewPdfData.sjNo}</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="primary" onClick={handleShowPageSizeDialog}>
                    💾 Save to PDF
                  </Button>
                  <Button variant="secondary" onClick={() => setViewPdfData(null)}>
                    ✕ Close
                  </Button>
                </div>
              </div>
              
              {/* Template Selection */}
              <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  📄 Pilih Template Surat Jalan
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => handleTemplateChange('template1')}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      border: `2px solid ${templateType === 'template1' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                      borderRadius: '6px',
                      backgroundColor: templateType === 'template1' ? 'var(--primary-color)' : 'var(--bg-primary)',
                      color: templateType === 'template1' ? '#fff' : 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: templateType === 'template1' ? '600' : '400',
                      transition: 'all 0.2s',
                    }}
                  >
                    Template 1 (Default)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTemplateChange('template2')}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      border: `2px solid ${templateType === 'template2' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                      borderRadius: '6px',
                      backgroundColor: templateType === 'template2' ? 'var(--primary-color)' : 'var(--bg-primary)',
                      color: templateType === 'template2' ? '#fff' : 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: templateType === 'template2' ? '600' : '400',
                      transition: 'all 0.2s',
                    }}
                  >
                    Template 2 (Delivery Note)
                  </button>
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
    </div>
  );
};

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
  const [customerAddress, setCustomerAddress] = useState(delivery.customerAddress || '');
  const [customerPIC, setCustomerPIC] = useState(delivery.customerPIC || '');
  const [customerPhone, setCustomerPhone] = useState(delivery.customerPhone || '');
  const [picProgram, setPicProgram] = useState(delivery.picProgram || '');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [soNo, setSoNo] = useState(delivery.soNo || '');
  const [productCodeDisplay, setProductCodeDisplay] = useState<'padCode' | 'productId'>(delivery.productCodeDisplay || 'padCode');
  const [specNote, setSpecNote] = useState(delivery.specNote || '');
  const [items, setItems] = useState<DeliveryNoteItem[]>(delivery.items && delivery.items.length > 0 ? delivery.items : (delivery.product ? [{ product: delivery.product, qty: delivery.qty || 0, unit: 'PCS', spkNo: delivery.spkNo, soNo: delivery.soNo }] : []));
  // Signature fields untuk Template 2
  const [senderName, setSenderName] = useState(delivery.senderName || '');
  const [senderTitle, setSenderTitle] = useState(delivery.senderTitle || '');
  const [senderDate, setSenderDate] = useState(delivery.senderDate ? delivery.senderDate.split('T')[0] : '');
  const [receiverName, setReceiverName] = useState(delivery.receiverName || '');
  const [receiverTitle, setReceiverTitle] = useState(delivery.receiverTitle || '');
  const [receiverDate, setReceiverDate] = useState(delivery.receiverDate ? delivery.receiverDate.split('T')[0] : '');
  const [signedFile, setSignedFile] = useState<File | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState<{ [key: number]: string }>({});
  const [showProductDropdown, setShowProductDropdown] = useState<{ [key: number]: boolean }>({});
  
  useEffect(() => {
    const loadData = async () => {
      const productsData = await storageService.get<any[]>('gt_products') || [];
      const customersData = await storageService.get<Customer[]>('gt_customers') || [];
      setProducts(productsData);
      setCustomers(customersData);
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
    setItems([...items, { product: '', qty: 0, unit: 'PCS', spkNo: '', soNo: soNo }]);
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

  // Get filtered products for search
  const getFilteredProducts = (index: number) => {
    const search = productSearch[index] || '';
    if (!search) return products.slice(0, 10);
    
    const searchLower = search.toLowerCase();
    return products.filter((p: any) => {
      const name = (p.nama || '').toLowerCase();
      const code = (p.kode || p.product_id || '').toLowerCase();
      return name.includes(searchLower) || code.includes(searchLower);
    }).slice(0, 10);
  };

  const handleItemChange = (index: number, field: keyof DeliveryNoteItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  // Handle product selection
  const handleSelectProduct = (index: number, product: any) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      product: product.nama || '',
      productCode: product.kode || product.product_id || '',
      unit: product.unit || 'PCS',
    };
    setItems(updated);
    // Clear search and close dropdown
    setProductSearch({ ...productSearch, [index]: '' });
    setShowProductDropdown({ ...showProductDropdown, [index]: false });
  };

  // Handle manual product input
  const handleManualProductInput = (index: number, value: string) => {
    const updated = [...items];
    const productMatch = products.find((p: any) => 
      p.nama?.toLowerCase() === value.toLowerCase() || 
      p.kode?.toLowerCase() === value.toLowerCase()
    );
    updated[index] = {
      ...updated[index],
      product: value,
      productCode: productMatch?.kode || productMatch?.product_id || updated[index].productCode,
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
      setCustomerAddress('');
      setCustomerPIC('');
      setCustomerPhone('');
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
      setCustomerAddress(matchedCustomer.alamat || '');
      setCustomerPIC(matchedCustomer.kontak || '');
      setCustomerPhone(matchedCustomer.telepon || '');
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
    setCustomerAddress(selectedCustomer.alamat || '');
    setCustomerPIC(selectedCustomer.kontak || '');
    setCustomerPhone(selectedCustomer.telepon || '');
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
      customerAddress: customerAddress || undefined,
      customerPIC: customerPIC || undefined,
      customerPhone: customerPhone || undefined,
      picProgram: picProgram || undefined,
      soNo,
      productCodeDisplay: productCodeDisplay,
      specNote: specNote || undefined,
      items: items.length > 0 ? items : undefined,
      // Signature fields untuk Template 2
      senderName: senderName || undefined,
      senderTitle: senderTitle || undefined,
      senderDate: senderDate ? new Date(senderDate).toISOString() : undefined,
      receiverName: receiverName || undefined,
      receiverTitle: receiverTitle || undefined,
      receiverDate: receiverDate ? new Date(receiverDate).toISOString() : undefined,
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
                signedDocumentType = 'pdf';
                signedDocument = undefined; // Clear base64 untuk PDF
              } else {
                showAlert('Error', `Failed to save PDF: ${result.error || 'Unknown error'}`);
                return;
              }
            } catch (error: any) {
              showAlert('Error', `Error saving PDF: ${error.message || 'Unknown error'}`);
              return;
            }
          } else {
            // Browser mode: coba simpan sebagai base64 jika kecil
            const base64Size = base64.length;
            if (base64Size > 5000000) { // 5MB limit
              showAlert('Error', 'PDF terlalu besar (' + 
                Math.round(base64Size / 1024 / 1024) + 'MB\n\nMaksimal ukuran: 5MB\n\nSilakan gunakan file PDF yang lebih kecil atau gunakan aplikasi desktop.');
              return;
            }
            signedDocument = base64;
            signedDocumentType = 'pdf';
            signedDocumentPath = undefined;
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
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
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
              Customer Address
            </label>
            <textarea
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="Enter customer address"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                minHeight: '80px',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                PIC (Person In Charge)
              </label>
              <Input
                value={customerPIC}
                onChange={setCustomerPIC}
                placeholder="Enter PIC name"
              />
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                PIC akan ditampilkan di template Surat Jalan
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                Customer Phone
              </label>
              <Input
                value={customerPhone}
                onChange={setCustomerPhone}
                placeholder="Enter customer phone"
              />
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Phone akan ditampilkan di template Surat Jalan
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              PIC Program (Template 2 - GT Delivery Note)
            </label>
            <Input
              value={picProgram}
              onChange={setPicProgram}
              placeholder="Enter PIC Program name"
            />
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              PIC Program akan ditampilkan di bagian "PIC Program" pada Template 2 (GT Delivery Note). Bisa berbeda dari PIC di bawah alamat customer.
            </div>
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
                        Product
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
                        placeholder="Type to search product or enter manually"
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
                          {getFilteredProducts(idx).map((p: any) => (
                            <div
                              key={p.id || p.nama}
                              onClick={() => handleSelectProduct(idx, p)}
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
                              <div style={{ fontWeight: 500 }}>{p.nama || 'Unknown'}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                Code: {p.kode || p.product_id || '-'}
                              </div>
                            </div>
                          ))}
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

          {/* Signature Section untuk Template 2 (GT Delivery Note) */}
          <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
              📝 Signature Section (Template 2 - GT Delivery Note)
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Sender */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>Sender:</div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>Name</label>
                  <Input
                    value={senderName}
                    onChange={setSenderName}
                    placeholder="Sender name"
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>Title</label>
                  <Input
                    value={senderTitle}
                    onChange={setSenderTitle}
                    placeholder="Sender title"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>Date</label>
                  <input
                    type="date"
                    value={senderDate}
                    onChange={(e) => setSenderDate(e.target.value)}
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
              </div>

              {/* Receiver */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>Receiver:</div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>Name</label>
                  <Input
                    value={receiverName}
                    onChange={setReceiverName}
                    placeholder="Receiver name"
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>Title</label>
                  <Input
                    value={receiverTitle}
                    onChange={setReceiverTitle}
                    placeholder="Receiver title"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>Date</label>
                  <input
                    type="date"
                    value={receiverDate}
                    onChange={(e) => setReceiverDate(e.target.value)}
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
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              Field ini akan ditampilkan di bagian signature pada Template 2 (GT Delivery Note)
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
  salesOrders,
  customers,
  products,
  onClose,
  onCreate
}: {
  deliveries: DeliveryNote[];
  salesOrders: SalesOrder[];
  customers: Customer[];
  products: any[];
  onClose: () => void;
  onCreate: (data: {
    soNo?: string;
    customer?: string;
    customerAddress?: string;
    customerPIC?: string;
    customerPhone?: string;
    picProgram?: string;
    items?: DeliveryNoteItem[];
    driver?: string;
    vehicleNo?: string;
    deliveryDate?: string;
    productCodeDisplay?: 'padCode' | 'productId';
    specNote?: string;
    senderName?: string;
    senderTitle?: string;
    senderDate?: string;
    receiverName?: string;
    receiverTitle?: string;
    receiverDate?: string;
  }) => Promise<void>;
}) => {
  const { showAlert: showAlertBase } = useDialog();
  const showAlert = (title: string, message: string) => {
    showAlertBase(message, title);
  };

  const [soNo, setSoNo] = useState('');
  const [customer, setCustomer] = useState('');
  const [customerInputValue, setCustomerInputValue] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPIC, setCustomerPIC] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [picProgram, setPicProgram] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [driver, setDriver] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [productCodeDisplay, setProductCodeDisplay] = useState<'padCode' | 'productId'>('padCode');
  const [specNote, setSpecNote] = useState('');
  const [items, setItems] = useState<DeliveryNoteItem[]>([{ product: '', qty: 0, unit: 'PCS', spkNo: '', soNo: '' }]);
  // Signature fields untuk Template 2
  const [senderName, setSenderName] = useState('');
  const [senderTitle, setSenderTitle] = useState('');
  const [senderDate, setSenderDate] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverTitle, setReceiverTitle] = useState('');
  const [receiverDate, setReceiverDate] = useState('');
  const [productSearch, setProductSearch] = useState<{ [key: number]: string }>({});
  const [showProductDropdown, setShowProductDropdown] = useState<{ [key: number]: boolean }>({});

  // Handle customer input change
  const handleCustomerInputChange = (text: string) => {
    setCustomerInputValue(text);
    setShowCustomerDropdown(true);
    if (!text) {
      setCustomer('');
      setCustomerAddress('');
      setCustomerPIC('');
      setCustomerPhone('');
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
      setCustomerAddress(matchedCustomer.alamat || '');
      setCustomerPIC(matchedCustomer.kontak || '');
      setCustomerPhone(matchedCustomer.telepon || '');
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
    setCustomerAddress(selectedCustomer.alamat || '');
    setCustomerPIC(selectedCustomer.kontak || '');
    setCustomerPhone(selectedCustomer.telepon || '');
    setCustomerInputValue(`${selectedCustomer.kode || ''}${selectedCustomer.kode ? ' - ' : ''}${selectedCustomer.nama}`);
    setShowCustomerDropdown(false);
  };

  // Handle SO selection - auto-populate customer and items
  const handleSOChange = (soNoValue: string) => {
    setSoNo(soNoValue);
    const so = salesOrders.find(s => s.soNo === soNoValue);
    if (so) {
      setCustomer(so.customer || '');
      setCustomerInputValue(so.customer || '');
      // Load customer data
      const customerData = customers.find(c => c.nama === so.customer);
      if (customerData) {
        setCustomerAddress(customerData.alamat || '');
        setCustomerPIC(customerData.kontak || '');
        setCustomerPhone(customerData.telepon || '');
      }
      // Auto-populate items from SO
      if (so.items && so.items.length > 0) {
        const soItems: DeliveryNoteItem[] = so.items.map((item: any) => ({
          product: item.productName || item.product || '',
          productCode: item.itemSku || item.sku || '',
          qty: Number(item.qty || 0),
          unit: 'PCS',
          spkNo: item.spkNo || '',
          soNo: soNoValue,
        }));
        setItems(soItems.length > 0 ? soItems : [{ product: '', qty: 0, unit: 'PCS', spkNo: '', soNo: soNoValue }]);
      }
    }
  };

  const handleAddItem = () => {
    setItems([...items, { product: '', qty: 0, unit: 'PCS', spkNo: '', soNo: soNo }]);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, idx) => idx !== index);
    setItems(updated);
    const newSearch = { ...productSearch };
    delete newSearch[index];
    setProductSearch(newSearch);
    const newDropdown = { ...showProductDropdown };
    delete newDropdown[index];
    setShowProductDropdown(newDropdown);
  };

  const getFilteredProducts = (index: number) => {
    const search = productSearch[index] || '';
    if (!search) return products.slice(0, 10);
    const searchLower = search.toLowerCase();
    return products.filter((p: any) => {
      const name = (p.nama || '').toLowerCase();
      const code = (p.kode || p.product_id || '').toLowerCase();
      return name.includes(searchLower) || code.includes(searchLower);
    }).slice(0, 10);
  };

  const handleItemChange = (index: number, field: keyof DeliveryNoteItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSelectProduct = (index: number, product: any) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      product: product.nama || product.name || '',
      productCode: product.kode || product.sku || product.product_id || '',
      unit: 'PCS',
    };
    setItems(updated);
    setProductSearch({ ...productSearch, [index]: product.nama || product.name || '' });
    setShowProductDropdown({ ...showProductDropdown, [index]: false });
  };

  const handleManualProductInput = (index: number, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], product: value };
    setItems(updated);
  };

  const handleSave = async () => {
    if (!customer) {
      showAlert('Error', 'Customer is required');
      return;
    }
    if (items.length === 0 || items.every(item => !item.product || item.qty === 0)) {
      showAlert('Error', 'At least one item with product and quantity is required');
      return;
    }

    try {
      await onCreate({
        soNo,
        customer,
        customerAddress: customerAddress || undefined,
        customerPIC: customerPIC || undefined,
        customerPhone: customerPhone || undefined,
        picProgram: picProgram || undefined,
        items: items.filter(item => item.product && item.qty > 0),
        driver: driver || undefined,
        vehicleNo: vehicleNo || undefined,
        deliveryDate: deliveryDate || undefined,
        productCodeDisplay,
        specNote: specNote || undefined,
        senderName: senderName || undefined,
        senderTitle: senderTitle || undefined,
        senderDate: senderDate || undefined,
        receiverName: receiverName || undefined,
        receiverTitle: receiverTitle || undefined,
        receiverDate: receiverDate || undefined,
      });
    } catch (error: any) {
      showAlert('Error', `Error creating delivery note: ${error.message}`);
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose} style={{ zIndex: 10001 }}>
      <div className="dialog-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
        <Card title="Create Delivery Note">
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              SO No
            </label>
            <input
              type="text"
              list="so-list-create"
              value={soNo}
              onChange={(e) => handleSOChange(e.target.value)}
              placeholder="Select or enter SO number"
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
            <datalist id="so-list-create">
              {salesOrders.map((so: any) => (
                <option key={so.id || so.soNo} value={so.soNo} />
              ))}
            </datalist>
          </div>

          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Customer *
            </label>
            <input
              type="text"
              list={`customer-list-create`}
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
            <datalist id={`customer-list-create`}>
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
              Customer Address
            </label>
            <textarea
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="Enter customer address"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                minHeight: '80px',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                PIC (Person In Charge)
              </label>
              <Input
                value={customerPIC}
                onChange={setCustomerPIC}
                placeholder="Enter PIC name"
              />
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                PIC akan ditampilkan di template Surat Jalan
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                Customer Phone
              </label>
              <Input
                value={customerPhone}
                onChange={setCustomerPhone}
                placeholder="Enter customer phone"
              />
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Phone akan ditampilkan di template Surat Jalan
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              PIC Program (Template 2 - GT Delivery Note)
            </label>
            <Input
              value={picProgram}
              onChange={setPicProgram}
              placeholder="Enter PIC Program name"
            />
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              PIC Program akan ditampilkan di bagian "PIC Program" pada Template 2 (GT Delivery Note). Bisa berbeda dari PIC di bawah alamat customer.
            </div>
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
                Items *
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
                        Product
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
                        placeholder="Type to search product or enter manually"
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
                          {getFilteredProducts(idx).map((p: any) => (
                            <div
                              key={p.id || p.nama}
                              onClick={() => handleSelectProduct(idx, p)}
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
                              <div style={{ fontWeight: 500 }}>{p.nama || 'Unknown'}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                Code: {p.kode || p.product_id || '-'}
                              </div>
                            </div>
                          ))}
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

          {/* Signature Section untuk Template 2 (GT Delivery Note) */}
          <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
              📝 Signature Section (Template 2 - GT Delivery Note)
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Sender */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>Sender:</div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>Name</label>
                  <Input
                    value={senderName}
                    onChange={setSenderName}
                    placeholder="Sender name"
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>Title</label>
                  <Input
                    value={senderTitle}
                    onChange={setSenderTitle}
                    placeholder="Sender title"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>Date</label>
                  <input
                    type="date"
                    value={senderDate}
                    onChange={(e) => setSenderDate(e.target.value)}
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
              </div>

              {/* Receiver */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>Receiver:</div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>Name</label>
                  <Input
                    value={receiverName}
                    onChange={setReceiverName}
                    placeholder="Receiver name"
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>Title</label>
                  <Input
                    value={receiverTitle}
                    onChange={setReceiverTitle}
                    placeholder="Receiver title"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>Date</label>
                  <input
                    type="date"
                    value={receiverDate}
                    onChange={(e) => setReceiverDate(e.target.value)}
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
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              Field ini akan ditampilkan di bagian signature pada Template 2 (GT Delivery Note)
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>
              Create Delivery Note
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DeliveryNote;
