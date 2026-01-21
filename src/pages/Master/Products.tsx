import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Input from '../../components/Input';
import BOMDialog from '../../components/BOMDialog';
import { storageService, extractStorageValue } from '../../services/storage';
import { filterActiveItems } from '../../utils/data-persistence-helper';
import { deletePackagingItem, reloadPackagingData } from '../../utils/packaging-delete-helper';
import { useDialog } from '../../hooks/useDialog';
import * as XLSX from 'xlsx';
import '../../styles/common.css';
import './Master.css';

interface Product {
  id: string;
  no: number;
  kode: string;
  product_id?: string;
  nama: string;
  satuan: string;
  stockAman: number;
  stockMinimum: number;
  kategori: string;
  customer?: string;
  supplier?: string; // Keep for backward compatibility
  lastUpdate: string;
  userUpdate: string;
  ipAddress?: string;
  harga?: number;
  hargaFg?: number;
  bom?: any[];
  padCode?: string; // PAD Code untuk product
  kodeIpos?: string; // Kode Ipos untuk product (khusus packaging)
}

interface Customer {
  id: string;
  kode: string;
  nama: string;
}

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [bomData, setBomData] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [editingBOM, setEditingBOM] = useState<Product | null>(null);
  const isSavingBOMRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [customerInputValue, setCustomerInputValue] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [stockAmanInputValue, setStockAmanInputValue] = useState('');
  const [stockMinimumInputValue, setStockMinimumInputValue] = useState('');
  const [priceInputValue, setPriceInputValue] = useState('');

  // Custom Dialog - menggunakan hook terpusat
  const { showAlert, showConfirm, closeDialog, DialogComponent } = useDialog();
  
  // Format date function - format: dd/mm/yyyy hh:mm:ss
  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch {
      return '-';
    }
  };
  const [formData, setFormData] = useState<Partial<Product>>({
    kode: '',
    nama: '',
    padCode: '',
    kodeIpos: '',
    satuan: '',
    stockAman: 0,
    stockMinimum: 0,
    kategori: '',
    customer: '',
    hargaFg: 0,
  });

  const loadProducts = useCallback(async () => {
    console.log('[Products] 🔄 Loading products and BOM data...');
    const dataRaw = extractStorageValue(await storageService.get<Product[]>('products'));
    // Filter out deleted items menggunakan helper function
    const data = filterActiveItems(dataRaw);
    const bom = extractStorageValue(await storageService.get<any[]>('bom'));
    
    console.log('[Products] 📊 Loaded data:', {
      products: data.length,
      bom: bom ? bom.length : 0,
      bomSample: bom ? bom.slice(0, 3) : []
    });
    
    // Update bomData (simple update, no comparison needed for now)
    setBomData(bom);
    console.log('[Products] 💾 BOM data set to state:', {
      bomCount: bom.length,
      firstFewIds: bom.slice(0, 5).map(b => b.product_id)
    });
    
    // Ensure padCode and kode are always present for all products
    const productsWithPadCode = data.map((p, idx) => ({ 
      ...p, 
      no: idx + 1,
      padCode: p.padCode !== undefined ? p.padCode : '', // Ensure padCode always exists
      // Ensure kode is always present - use product_id if kode is empty
      kode: p.kode || p.product_id || ''
    }));
    
    // Update products
    setProducts(productsWithPadCode);
  }, []);

  const loadCustomers = useCallback(async () => {
    const data = await storageService.get<Customer[]>('customers') || [];
    // CRITICAL: Filter deleted items using helper function
    const activeCustomers = filterActiveItems(data);
    setCustomers(activeCustomers);
  }, []);

  useEffect(() => {
    loadProducts();
    loadCustomers();
  }, [loadProducts, loadCustomers]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ key?: string }>;
      const changedKey = customEvent.detail?.key || '';
      const normalizedKey = changedKey.split('/').pop();

      // Skip reload jika sedang save BOM (akan reload manual setelah save)
      if ((normalizedKey === 'bom' || normalizedKey === 'products') && !isSavingBOMRef.current) {
        loadProducts();
      }
    };

    // Listen for BOM updates from other modules (e.g., PPIC)
    // Jangan reload jika source adalah 'MasterProducts' atau sedang save BOM
    const handleBOMUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ productId: string; bomItems: any[]; source: string }>;
      const source = customEvent.detail?.source || 'unknown';
      
      // Skip reload jika event berasal dari module ini sendiri atau sedang save BOM
      if (source === 'MasterProducts' || isSavingBOMRef.current) {
        return;
      }
      
      // Reload products to sync BOM changes dari module lain
      loadProducts();
    };

    window.addEventListener('app-storage-changed', handleStorageChange as EventListener);
    window.addEventListener('bomUpdated', handleBOMUpdate as EventListener);
    
    return () => {
      window.removeEventListener('app-storage-changed', handleStorageChange as EventListener);
      window.removeEventListener('bomUpdated', handleBOMUpdate as EventListener);
    };
  }, [loadProducts]);

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
    if (formData.customer || formData.supplier) {
      const customer = customers.find(c => c.nama === (formData.customer || formData.supplier));
      if (customer) {
        return `${customer.kode} - ${customer.nama}`;
      }
      return formData.customer || formData.supplier || '';
    }
    return '';
  };

  // Filtered customers untuk dropdown
  const filteredCustomers = useMemo(() => {
    const customersArray = Array.isArray(customers) ? customers : [];
    if (!customerSearch) return customersArray.slice(0, 200); // Limit untuk performance
    const query = customerSearch.toLowerCase();
    return customersArray
      .filter(c => {
        if (!c) return false;
        const code = (c.kode || '').toLowerCase();
        const name = (c.nama || '').toLowerCase();
        return code.includes(query) || name.includes(query);
      })
      .slice(0, 200); // Limit untuk performance
  }, [customerSearch, customers]);

  const handleCustomerInputChange = (text: string) => {
    setCustomerInputValue(text);
    setCustomerSearch(text);
    setShowCustomerDropdown(true);
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

  // Helper function untuk generate product_id dengan pattern FG-{customer code}-{sequence}
  const generateProductId = useCallback((customerName: string): string => {
    // Cari customer berdasarkan nama
    const customer = customers.find(c => c.nama === customerName);
    let customerCode = 'GEN'; // Default jika customer tidak ditemukan
    
    if (customer && customer.kode) {
      // Ambil 3-4 karakter pertama dari kode customer, uppercase
      customerCode = customer.kode.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (customerCode.length < 3) {
        // Jika kurang dari 3 karakter, ambil dari nama customer
        const nameParts = customer.nama.split(' ').filter(p => p.length > 0);
        if (nameParts.length > 0) {
          customerCode = nameParts.map(p => p[0]).join('').substring(0, 3).toUpperCase();
        }
      }
    } else if (customerName) {
      // Jika customer ada tapi tidak ada di master, ambil inisial dari nama
      const nameParts = customerName.split(' ').filter(p => p.length > 0);
      if (nameParts.length > 0) {
        customerCode = nameParts.map(p => p[0]).join('').substring(0, 3).toUpperCase();
      }
    }
    
    // Cari sequence number terakhir untuk customer ini (semua product_id)
    const existingProducts = products.filter(p => {
      const pid = (p.product_id || '').toString().trim();
      // Sekarang mencocokkan semua product_id yang mengandung customerCode
      return pid.includes(customerCode);
    });
    
    // Extract sequence numbers dari semua format product_id
    const sequences = existingProducts
      .map(p => {
        const pid = (p.product_id || '').toString().trim();
        // Match angka di akhir product_id (bukan hanya FG pattern)
        const match = pid.match(/(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => !isNaN(n) && n > 0);
    
    // Get next sequence number
    const nextSequence = sequences.length > 0 ? Math.max(...sequences) + 1 : 1;
    
    // Format: {customerCode}{sequence} - Bebas tanpa pattern FG
    return `${customerCode}${String(nextSequence).padStart(3, '0')}`;
  }, [customers, products]);

  // Optimize: Create Set untuk fast BOM lookup (O(1) instead of O(n) dengan .some())
  const bomProductIdsSet = useMemo(() => {
    console.log('[Products] 🔄 Creating bomProductIdsSet from bomData:', bomData.length);
    const bomDataArray = Array.isArray(bomData) ? bomData : [];
    const ids = new Set<string>();
    
    bomDataArray.forEach(b => {
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
          // Tambahkan semua ID dari produk yang match
          if (matchingProduct.kode) ids.add(String(matchingProduct.kode).trim().toLowerCase());
          if (matchingProduct.kodeIpos) ids.add(String(matchingProduct.kodeIpos).trim().toLowerCase());
          if (matchingProduct.product_id) ids.add(String(matchingProduct.product_id).trim().toLowerCase());
          if (matchingProduct.padCode) ids.add(String(matchingProduct.padCode).trim().toLowerCase());
        }
      }
    });
    
    console.log('[Products] ✅ bomProductIdsSet created:', {
      size: ids.size,
      bomDataLength: bomDataArray.length,
      bomDataSample: bomDataArray.slice(0, 3),
      ids: Array.from(ids).slice(0, 10)
    });
    return ids;
  }, [bomData, products]);

  // Helper function to normalize product ID for BOM matching
  const normalizeProductIdForBOM = useCallback((id: string): string => {
    if (!id) return '';
    
    let normalized = String(id).trim().toLowerCase();
    
    // Remove FG- prefix if exists
    if (normalized.startsWith('fg-')) {
      normalized = normalized.substring(3);
    }
    
    // Remove customer code suffix (everything after last -)
    // But keep KRT-style codes intact
    if (normalized.includes('-') && !normalized.match(/^[a-z]{3}-?\d{4,5}$/)) {
      const parts = normalized.split('-');
      // If it looks like customer-product format, take the last part
      if (parts.length > 1 && parts[parts.length - 1].match(/^[a-z]{3}\d{4,5}$/)) {
        normalized = parts[parts.length - 1];
      }
      // If it looks like product-customer format, take the first part  
      else if (parts.length > 1 && parts[0].match(/^[a-z]{3}\d{4,5}$/)) {
        normalized = parts[0];
      }
    }
    
    // Remove any remaining dashes for KRT codes
    if (normalized.match(/^[a-z]{3}-\d{4,5}$/)) {
      normalized = normalized.replace('-', '');
    }
    
    return normalized;
  }, []);

  // Optimize: Memoized hasBOM function dengan Set lookup (O(1) instead of O(n))
  const hasBOM = useCallback((product: Product): boolean => {
    const productId = (product.kode || product.product_id || '').toString().trim();
    const result = bomProductIdsSet.has(productId.toLowerCase());
    
    // Debug log untuk first few products
    if (product.no <= 5) {
      console.log('[Products] 🔍 hasBOM check:', {
        productName: product.nama,
        productKode: product.kode,
        productProductId: product.product_id,
        checkingId: productId,
        checkingIdLower: productId.toLowerCase(),
        bomSetSize: bomProductIdsSet.size,
        bomSetIds: Array.from(bomProductIdsSet).slice(0, 10),
        hasBOM: result
      });
    }
    
    return result;
  }, [bomProductIdsSet]);

  // Helper function to check if product has customer and price
  const hasCustomerAndPrice = (product: Product): boolean => {
    const hasCustomer = !!(product.customer || product.supplier);
    const hasPrice = !!(product.hargaFg || product.harga) && 
                     ((product.hargaFg || product.harga || 0) > 0);
    return hasCustomer && hasPrice;
  };

  // Filter products based on search query - MEMOIZED untuk performance
  const filteredProducts = useMemo(() => {
    const productsArray = Array.isArray(products) ? products : [];
    
    // Build lookup maps untuk cross-reference kodeIpos dengan kode
    const productsByKode = new Map<string, Product[]>();
    const productsByKodeIpos = new Map<string, Product[]>();
    
    productsArray.forEach(product => {
      const kode = (product.kode || '').trim().toLowerCase();
      const kodeIpos = (product.kodeIpos || '').trim().toLowerCase();
      
      if (kode) {
        if (!productsByKode.has(kode)) {
          productsByKode.set(kode, []);
        }
        productsByKode.get(kode)!.push(product);
      }
      
      if (kodeIpos) {
        if (!productsByKodeIpos.has(kodeIpos)) {
          productsByKodeIpos.set(kodeIpos, []);
        }
        productsByKodeIpos.get(kodeIpos)!.push(product);
      }
    });
    
    // Filter first
    const filtered = productsArray.filter(product => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase().trim();
      
      // Direct match
      const directMatch = (
        (product.kode || '').toLowerCase().includes(query) ||
        (product.product_id || '').toLowerCase().includes(query) ||
        (product.nama || '').toLowerCase().includes(query) ||
        (product.kategori || '').toLowerCase().includes(query) ||
        (product.customer || product.supplier || '').toLowerCase().includes(query) ||
        (product.padCode || '').toLowerCase().includes(query) ||
        (product.kodeIpos || '').toLowerCase().includes(query)
      );
      
      if (directMatch) return true;
      
      // Cross-reference: Jika query sama dengan kodeIpos produk ini, cari produk lain yang punya kode sama dengan kodeIpos ini
      const productKodeIpos = (product.kodeIpos || '').trim().toLowerCase();
      if (productKodeIpos && productKodeIpos === query) {
        // Cari produk lain yang punya kode sama dengan kodeIpos produk ini
        const relatedProducts = productsByKode.get(productKodeIpos) || [];
        if (relatedProducts.length > 0) {
          return true; // Include produk ini karena kodeIpos-nya match dengan kode produk lain
        }
      }
      
      // Cross-reference: Jika query sama dengan kode produk ini, cari produk lain yang punya kodeIpos sama dengan kode ini
      const productKode = (product.kode || '').trim().toLowerCase();
      if (productKode && productKode === query) {
        // Cari produk lain yang punya kodeIpos sama dengan kode produk ini
        const relatedProducts = productsByKodeIpos.get(productKode) || [];
        if (relatedProducts.length > 0) {
          return true; // Include produk ini karena kode-nya match dengan kodeIpos produk lain
        }
      }
      
      return false;
    });
    
    // Then sort dengan optimized BOM check
    return filtered.sort((a, b) => {
      // Priority sorting:
      // 1. Products with padCode (highest priority - muncul paling atas)
      // 2. Products with customer + price + BOM
      // 3. Products with customer + price (no BOM)
      // 4. Products with BOM only (no customer/price)
      // 5. Everything else
      
      const aHasPadCode = !!(a.padCode && a.padCode.trim());
      const bHasPadCode = !!(b.padCode && b.padCode.trim());
      
      // Priority 1: padCode (highest)
      if (aHasPadCode && !bHasPadCode) return -1;
      if (!aHasPadCode && bHasPadCode) return 1;
      
      // Jika sama-sama punya padCode atau sama-sama tidak punya, lanjut ke priority berikutnya
      const aHasCustomerPrice = hasCustomerAndPrice(a);
      const bHasCustomerPrice = hasCustomerAndPrice(b);
      const aHasBOM = hasBOM(a);
      const bHasBOM = hasBOM(b);
      
      // Calculate priority score (higher = better)
      const getPriority = (hasCustomerPrice: boolean, hasBOM: boolean): number => {
        if (hasCustomerPrice && hasBOM) return 3;
        if (hasCustomerPrice) return 2;
        if (hasBOM) return 1;
        return 0;
      };
      
      const aPriority = getPriority(aHasCustomerPrice, aHasBOM);
      const bPriority = getPriority(bHasCustomerPrice, bHasBOM);
      
      // Sort by priority (descending)
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // Same priority, sort by kode
      return (a.kode || '').localeCompare(b.kode || '');
    });
  }, [products, searchQuery, hasBOM]);

  // Pagination - MEMOIZED untuk performance
  const totalPages = useMemo(() => Math.ceil(filteredProducts.length / itemsPerPage), [filteredProducts.length, itemsPerPage]);
  const startIndex = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage, itemsPerPage]);
  const endIndex = useMemo(() => startIndex + itemsPerPage, [startIndex, itemsPerPage]);
  const paginatedProducts = useMemo(() => filteredProducts.slice(startIndex, endIndex), [filteredProducts, startIndex, endIndex]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSave = async () => {
    try {
      // Extract padCode and kodeIpos explicitly to ensure it's not lost
      const padCodeValue = (formData.padCode || '').trim();
      const kodeIposValue = (formData.kodeIpos || '').trim();
      
      if (editingItem) {
        const updated = products.map(p => {
          if (p.id === editingItem.id) {
            // Auto-generate product_id jika kosong
            let productId = p.product_id;
            if (!productId || productId.trim() === '') {
              const customerName = (formData.customer || p.customer || '').trim();
              if (customerName) {
                productId = generateProductId(customerName);
              }
            }
            
            // Create new object with all fields explicitly set
            const updatedProduct: Product = {
              id: editingItem.id,
              no: editingItem.no,
              kode: productId || (p.kode || ''),
              nama: formData.nama !== undefined && formData.nama !== null ? String(formData.nama).trim() : (p.nama || ''),
              padCode: padCodeValue, // Always set padCode explicitly
              kodeIpos: kodeIposValue, // Always set kodeIpos explicitly
              satuan: formData.satuan !== undefined && formData.satuan !== null ? String(formData.satuan).trim() : (p.satuan || ''),
              stockAman: formData.stockAman !== undefined ? Number(formData.stockAman) : (p.stockAman || 0),
              stockMinimum: formData.stockMinimum !== undefined ? Number(formData.stockMinimum) : (p.stockMinimum || 0),
              kategori: formData.kategori !== undefined && formData.kategori !== null ? String(formData.kategori).trim() : (p.kategori || ''),
              customer: formData.customer !== undefined && formData.customer !== null ? String(formData.customer).trim() : (p.customer || ''),
              supplier: formData.supplier !== undefined && formData.supplier !== null ? String(formData.supplier).trim() : (p.supplier || ''),
              hargaFg: formData.hargaFg !== undefined ? Number(formData.hargaFg) : (p.hargaFg || 0),
              harga: formData.harga !== undefined ? Number(formData.harga) : (p.harga || 0),
              bom: formData.bom !== undefined ? formData.bom : (p.bom || []),
              product_id: productId,
              lastUpdate: new Date().toISOString(), 
              userUpdate: 'System', 
              ipAddress: '127.0.0.1' 
            };
            return updatedProduct;
          }
          return p;
        });
        
        await storageService.set('products', updated);
        setProducts(updated.map((p, idx) => ({ ...p, no: idx + 1 })));
      } else {
        // Auto-generate product_id untuk product baru jika kosong
        let productId = '';
        const customerName = (formData.customer || '').trim();
        if (customerName) {
          productId = generateProductId(customerName);
        }
        
        const newProduct: Product = {
          id: Date.now().toString(),
          no: products.length + 1,
          kode: productId || '',
          nama: formData.nama || '',
          padCode: padCodeValue, // Explicitly set padCode
          kodeIpos: kodeIposValue, // Explicitly set kodeIpos
          satuan: formData.satuan || '',
          stockAman: formData.stockAman || 0,
          stockMinimum: formData.stockMinimum || 0,
          kategori: formData.kategori || '',
          customer: formData.customer || '',
          supplier: formData.supplier,
          hargaFg: formData.hargaFg || 0,
          harga: formData.harga,
          bom: formData.bom,
          product_id: productId || undefined,
          lastUpdate: new Date().toISOString(),
          userUpdate: 'System',
          ipAddress: '127.0.0.1',
        } as Product;
        const updated = [...products, newProduct];
        await storageService.set('products', updated);
        setProducts(updated.map((p, idx) => ({ ...p, no: idx + 1 })));
      }
      setShowForm(false);
      setEditingItem(null);
      setCustomerInputValue('');
      setStockAmanInputValue('');
      setStockMinimumInputValue('');
      setPriceInputValue('');
      setFormData({ kode: '', nama: '', padCode: '', kodeIpos: '', satuan: '', stockAman: 0, stockMinimum: 0, kategori: '', customer: '', hargaFg: 0 });
    } catch (error: any) {
      showAlert(`Error saving product: ${error.message}`, 'Error');
    }
  };

  const handleEdit = (item: Product) => {
    setEditingItem(item);
    const customerName = item.customer || item.supplier || '';
    const customer = customers.find(c => c.nama === customerName);
    if (customer) {
      setCustomerInputValue(`${customer.kode} - ${customer.nama}`);
    } else {
      setCustomerInputValue(customerName);
    }
    setStockAmanInputValue('');
    setStockMinimumInputValue('');
    setPriceInputValue('');
    setFormData({
      ...item,
      customer: item.customer || item.supplier || '', // Use customer if available, fallback to supplier
      padCode: item.padCode || '', // Ensure padCode is included
    });
    setShowForm(true);
  };

  const handleDelete = async (item: Product) => {
    try {
      // Validate item.id exists
      if (!item.id) {
        console.error('[Products] Item missing ID:', item);
        showAlert(`❌ Error: Product "${item.nama}" tidak memiliki ID. Tidak bisa dihapus.`, 'Error');
        return;
      }
      
      showConfirm(
        `Hapus Product: ${item.nama}?

⚠️ Data akan dihapus dengan aman (tombstone pattern) untuk mencegah auto-sync mengembalikan data.

Tindakan ini tidak bisa dibatalkan.`,
        async () => {
          try {
            // 🚀 FIX: Pakai packaging delete helper untuk konsistensi dan sync yang benar
            const deleteResult = await deletePackagingItem('products', item.id, 'id');
            
            if (deleteResult.success) {
              // Reload data dengan helper (handle race condition) - sama seperti SalesOrders
              await reloadPackagingData('products', setProducts);
              
              // Re-number products setelah reload
              const currentProducts = await storageService.get<Product[]>('products') || [];
              const activeProducts = filterActiveItems(currentProducts);
              setProducts(activeProducts.map((p, idx) => ({ ...p, no: idx + 1 })));
              
              showAlert(`✅ Product "${item.nama}" berhasil dihapus dengan aman.\n\n🛡️ Data dilindungi dari auto-sync restoration.`, 'Success');
            } else {
              console.error('[Products] Delete failed:', deleteResult.error);
              showAlert(`❌ Error deleting product "${item.nama}": ${deleteResult.error || 'Unknown error'}`, 'Error');
            }
          } catch (error: any) {
            console.error('[Products] Error in delete:', error);
            showAlert(`❌ Error deleting product: ${error.message}`, 'Error');
          }
        },
        () => {
          // Delete cancelled
        },
        'Safe Delete Confirmation'
      );
    } catch (error: any) {
      console.error('[Products] Error in handleDelete:', error);
      showAlert(`❌ Error: ${error.message}`, 'Error');
    }
  };

  // Cleanup Duplicates
  const handleCleanupDuplicates = async () => {
    try {
      const currentProducts = Array.isArray(products) ? products : [];
      
      if (currentProducts.length === 0) {
        showAlert('Tidak ada data produk untuk dibersihkan', 'Info');
        return;
      }

      showConfirm(
        `🧹 Bersihkan Data Duplikat?

Fungsi ini akan:
- Deteksi duplikat berdasarkan Kode, Kode Ipos, Pad Code, atau Nama
- Merge duplikat (ambil yang lebih lengkap/baru)
- Simpan data yang sudah dibersihkan

Total produk saat ini: ${currentProducts.length}

Lanjutkan?`,
        async () => {
          try {
            const deduplicatedMap = new Map<string, Product>();
            const duplicatesFound: string[] = [];
            
            // Helper untuk normalize nama (untuk similarity check) - lebih toleran
            const normalizeName = (name: string): string => {
              return name.toLowerCase().trim()
                .replace(/[""]/g, '"')
                .replace(/['']/g, "'")
                .replace(/\s*inch\s*/gi, '"') // Normalize "inch" jadi "
                .replace(/\s*in\s*/gi, '"') // Normalize "in" jadi "
                .replace(/\s*([*xX\/-])\s*/g, '$1') // Hapus spasi sekitar simbol
                .replace(/\s*(["\'])\s*/g, '$1') // Hapus spasi setelah quote
                .replace(/\s*(["\'])\s*/g, '$1') // Hapus spasi sebelum quote
                .replace(/(\d+)\s*(pcs|pc|unit|units)/gi, '$1$2') // Hapus spasi antara angka dan unit
                .replace(/\s+/g, ' ') // Normalize semua spasi jadi satu
                .trim();
            };

            // Helper untuk cek nama mirip - lebih toleran
            const isSimilarName = (name1: string, name2: string): boolean => {
              const n1 = normalizeName(name1);
              const n2 = normalizeName(name2);
              if (n1 === n2) return true;
              
              const longer = n1.length > n2.length ? n1 : n2;
              const shorter = n1.length > n2.length ? n2 : n1;
              
              // Cek substring match (lebih toleran)
              if (longer.includes(shorter)) {
                return shorter.length >= longer.length * 0.6; // Turunkan threshold jadi 60%
              }
              
              // Cek similarity dengan menghitung karakter yang sama
              let matches = 0;
              const minLen = Math.min(n1.length, n2.length);
              for (let i = 0; i < minLen; i++) {
                if (n1[i] === n2[i]) matches++;
              }
              // Turunkan threshold jadi 75% untuk lebih toleran
              return matches >= minLen * 0.75;
            };

            // Build lookup maps untuk cross-reference
            const productsByKode = new Map<string, Product>();
            const productsByKodeIpos = new Map<string, Product>();
            const productsByPadCode = new Map<string, Product>();
            const productsByNama = new Map<string, Product[]>();
            
            currentProducts.forEach(p => {
              const kode = (p.kode || '').trim().toLowerCase();
              const kodeIpos = (p.kodeIpos || '').trim().toLowerCase();
              const padCode = (p.padCode || '').trim().toLowerCase();
              const nama = normalizeName(p.nama || '');
              
              if (kode) productsByKode.set(kode, p);
              if (kodeIpos) productsByKodeIpos.set(kodeIpos, p);
              if (padCode) productsByPadCode.set(padCode, p);
              if (nama) {
                if (!productsByNama.has(nama)) {
                  productsByNama.set(nama, []);
                }
                productsByNama.get(nama)!.push(p);
              }
            });

            // Group products yang harus di-merge (cross-reference kode, kodeIpos, dan nama mirip)
            // OPTIMIZED: Hindari nested loop O(n²), gunakan lookup map yang sudah ada
            const productGroups = new Map<string, Product[]>();
            const processedIds = new Set<string>();
            
            currentProducts.forEach((product, index) => {
              const productId = product.id || `unknown-${index}`;
              if (processedIds.has(productId)) return;
              
              const kode = (product.kode || '').trim().toLowerCase();
              const kodeIpos = (product.kodeIpos || '').trim().toLowerCase();
              const padCode = (product.padCode || '').trim().toLowerCase();
              const nama = normalizeName(product.nama || '');
              const productHarga = product.hargaFg || product.harga || 0;
              
              // Cari group key - bisa dari kode, kodeIpos, atau cross-reference
              let groupKey = '';
              
              // Prioritas 1: Cross-reference - Jika kode produk ini sama dengan kodeIpos produk lain
              if (kode && productsByKodeIpos.has(kode)) {
                groupKey = `kode:${kode}`;
              }
              
              // Prioritas 2: Cross-reference - Jika kodeIpos produk ini sama dengan kode produk lain
              if (!groupKey && kodeIpos && productsByKode.has(kodeIpos)) {
                const relatedProduct = productsByKode.get(kodeIpos)!;
                const relatedKode = (relatedProduct.kode || '').trim().toLowerCase();
                if (relatedKode) {
                  groupKey = `kode:${relatedKode}`;
                } else {
                  groupKey = `kodeIpos:${kodeIpos}`;
                }
              }
              
              // Prioritas 3: Jika punya kode, gunakan kode sebagai group key
              if (!groupKey && kode) {
                groupKey = `kode:${kode}`;
              }
              
              // Prioritas 4: Jika punya kodeIpos, cek apakah ada produk lain dengan kode yang sama
              if (!groupKey && kodeIpos) {
                if (productsByKode.has(kodeIpos)) {
                  groupKey = `kode:${kodeIpos}`;
                } else {
                  groupKey = `kodeIpos:${kodeIpos}`;
                }
              }
              
              // Prioritas 5: Gunakan padCode sebagai key
              if (!groupKey && padCode) {
                groupKey = `padCode:${padCode}`;
              }
              
              // Prioritas 6: Cek nama exact match dengan produk lain
              if (!groupKey && nama) {
                if (productsByNama.has(nama)) {
                  const sameNameProducts = productsByNama.get(nama)!;
                  const matched = sameNameProducts.find(p => {
                    if (p.id === productId) return false;
                    const pHarga = p.hargaFg || p.harga || 0;
                    return (productHarga === 0 || pHarga === 0 || Math.abs(productHarga - pHarga) < 0.01);
                  });
                  
                  if (matched) {
                    const matchedKode = (matched.kode || '').trim().toLowerCase();
                    if (matchedKode) {
                      groupKey = `kode:${matchedKode}`;
                    } else {
                      groupKey = `nama:${nama}`;
                    }
                  }
                }
              }
              
              // Prioritas 7: Similarity check untuk produk yang saling melengkapi (hanya jika belum ada groupKey)
              // OPTIMIZED: Cek similarity hanya untuk produk dalam productsByNama, bukan semua produk
              if (!groupKey && nama) {
                // Cek similarity dengan produk lain yang sudah di-group berdasarkan nama
                for (const [otherNama, otherProducts] of productsByNama.entries()) {
                  if (otherNama === nama) continue; // Skip exact match (sudah dicek di prioritas 6)
                  
                  if (isSimilarName(nama, otherNama)) {
                    // Cari produk yang bisa merge (harga sama atau salah satu kosong, dan saling melengkapi)
                    const matched = otherProducts.find(p => {
                      if (p.id === productId) return false;
                      const pHarga = p.hargaFg || p.harga || 0;
                      if (productHarga > 0 && pHarga > 0 && Math.abs(productHarga - pHarga) >= 0.01) {
                        return false; // Harga berbeda, skip
                      }
                      
                      const pKodeIpos = (p.kodeIpos || '').trim().toLowerCase();
                      // CRITICAL: Jika salah satu punya kodeIpos dan yang lain tidak, mereka HARUS merge
                      return (kodeIpos && !pKodeIpos) || (!kodeIpos && pKodeIpos);
                    });
                    
                    if (matched) {
                      const matchedKode = (matched.kode || '').trim().toLowerCase();
                      if (matchedKode) {
                        groupKey = `kode:${matchedKode}`;
                      } else {
                        groupKey = `similar:${nama}`;
                      }
                      break;
                    }
                  }
                }
              }
              
              // Fallback: Gunakan id
              if (!groupKey) {
                groupKey = `id:${productId}`;
              }

              if (groupKey) {
                if (!productGroups.has(groupKey)) {
                  productGroups.set(groupKey, []);
                }
                productGroups.get(groupKey)!.push(product);
                processedIds.add(productId);
              }
            });

            // Merge products dalam setiap group
            productGroups.forEach((groupProducts, groupKey) => {
              if (groupProducts.length === 1) {
                deduplicatedMap.set(groupKey, groupProducts[0]);
                return;
              }

              // Duplikat ditemukan - merge dengan memilih yang lebih lengkap
              duplicatesFound.push(`${groupProducts[0].kode || groupProducts[0].nama || 'Unknown'} (${groupKey})`);
              
              // Score setiap produk dalam group
              const scoredProducts = groupProducts.map(product => {
                const score = 
                  ((product.hargaFg || product.harga || 0) > 0 ? 100 : 0) +
                  (product.padCode && product.padCode.trim() ? 50 : 0) +
                  (product.kodeIpos && product.kodeIpos.trim() ? 30 : 0) +
                  (product.nama || '').trim().length;
                
                return { score, product };
              });
              
              // Sort by score (desc), then by lastUpdate (desc)
              scoredProducts.sort((a, b) => {
                if (a.score !== b.score) return b.score - a.score;
                const aUpdate = a.product.lastUpdate || '';
                const bUpdate = b.product.lastUpdate || '';
                return bUpdate.localeCompare(aUpdate);
              });
              
              // Ambil yang terbaik dan merge SEMUA data dari yang lain (saling melengkapi)
              const bestProduct = scoredProducts[0].product;
              
              // Merge semua field - ambil yang lebih lengkap dari semua produk dalam group
              const mergedProduct: Product = {
                ...bestProduct,
                // Keep kode dari yang terbaik (atau yang punya kode lebih lengkap)
                kode: bestProduct.kode || groupProducts.find(p => p.kode)?.kode || '',
                // Merge kodeIpos - ambil yang ada (saling melengkapi)
                kodeIpos: bestProduct.kodeIpos || groupProducts.find(p => p.kodeIpos && p.kodeIpos.trim())?.kodeIpos || '',
                // Merge padCode - ambil yang ada (saling melengkapi)
                padCode: bestProduct.padCode || groupProducts.find(p => p.padCode && p.padCode.trim())?.padCode || '',
                // Merge harga - ambil yang lebih besar (atau yang ada jika yang lain 0)
                hargaFg: Math.max(...groupProducts.map(p => p.hargaFg || p.harga || 0)),
                // Merge nama yang lebih lengkap
                nama: groupProducts.reduce((longest, p) => 
                  (p.nama || '').trim().length > (longest.nama || '').trim().length ? p : longest
                ).nama,
                // Merge customer jika ada
                customer: bestProduct.customer || groupProducts.find(p => p.customer)?.customer || '',
                // Merge kategori jika ada
                kategori: bestProduct.kategori || groupProducts.find(p => p.kategori)?.kategori || '',
                // Merge satuan jika ada
                satuan: bestProduct.satuan || groupProducts.find(p => p.satuan)?.satuan || '',
              };
              
              deduplicatedMap.set(groupKey, mergedProduct);
            });

            const deduplicated = Array.from(deduplicatedMap.values());
            const removedCount = currentProducts.length - deduplicated.length;
            
            if (removedCount === 0) {
              showAlert('✅ Tidak ada duplikat ditemukan. Data sudah bersih!', 'Success');
              return;
            }

            // Re-number products
            const renumbered = deduplicated.map((p, idx) => ({ ...p, no: idx + 1 }));

            // Save to storage
            await storageService.set('products', renumbered);
            setProducts(renumbered);

            const duplicateList = duplicatesFound.slice(0, 10).join('\n');
            const moreText = duplicatesFound.length > 10 ? `\n... dan ${duplicatesFound.length - 10} duplikat lainnya` : '';
            
            showAlert(
              `✅ Data duplikat berhasil dibersihkan!\n\n` +
              `📊 Statistik:\n` +
              `- Sebelum: ${currentProducts.length} produk\n` +
              `- Sesudah: ${renumbered.length} produk\n` +
              `- Dihapus: ${removedCount} duplikat\n\n` +
              `Duplikat yang ditemukan:\n${duplicateList}${moreText}`,
              'Success'
            );
          } catch (error: any) {
            showAlert(`❌ Error membersihkan duplikat: ${error.message}`, 'Error');
          }
        },
        () => {
          // Cancelled
        },
        'Cleanup Duplicates Confirmation'
      );
    } catch (error: any) {
      showAlert(`❌ Error: ${error.message}`, 'Error');
    }
  };

  // Download Template Excel
  const handleDownloadTemplate = () => {
    try {
      const templateData = [
        { 
          'product_id': 'PRD-001', 
          'Nama': 'Product Example 1', 
          'Pad Code': 'PAD001', 
          'Kode Ipos': 'KRT00123', 
          'Satuan': 'PCS', 
          'Kategori': 'Product', 
          'Customer': 'Customer A', 
          'Stock Aman': '100', 
          'Stock Minimum': '50', 
          'Harga FG': '50000' 
        },
        { 
          'product_id': 'PRD-002', 
          'Nama': 'Product Example 2', 
          'Pad Code': 'PAD002', 
          'Kode Ipos': 'KRT00456', 
          'Satuan': 'BOX', 
          'Kategori': 'Product', 
          'Customer': 'Customer B', 
          'Stock Aman': '200', 
          'Stock Minimum': '100', 
          'Harga FG': '75000' 
        },
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      
      const fileName = `Products_Template.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Template downloaded! Silakan isi data sesuai format dan import kembali.`, 'Success');
    } catch (error: any) {
      showAlert(`Error downloading template: ${error.message}`, 'Error');
    }
  };

  const handleImportExcel = () => {
    // Show preview dialog dengan contoh header sebelum browse file
    const exampleHeaders = ['No', 'KODE (SKU/ID)', 'Nama', 'Pad Code', 'Kode Ipos', 'Satuan', 'Kategori', 'Customer', 'Stock Aman', 'Stock Minimum', 'Harga FG', 'Last Update', 'User Update', 'Price Satuan', 'BOM Kode', 'Material Kode', 'Nama Material', 'Ratio'];
    const exampleData = [
      { 'No': '1', 'KODE (SKU/ID)': 'PRD-001', 'Nama': 'Product Example 1', 'Pad Code': 'PAD001', 'Kode Ipos': 'KRT00123', 'Satuan': 'PCS', 'Kategori': 'Product', 'Customer': 'Customer A', 'Stock Aman': '100', 'Stock Minimum': '50', 'Harga FG': '50000', 'Last Update': '01/01/2026 10:00:00', 'User Update': 'System', 'Price Satuan': 'Rp 50.000', 'BOM Kode': 'MTRL-00001', 'Material Kode': 'MTRL-00001', 'Nama Material': 'Material 1', 'Ratio': '1' },
      { 'No': '2', 'KODE (SKU/ID)': 'PRD-002', 'Nama': 'Product Example 2', 'Pad Code': 'PAD002', 'Kode Ipos': 'KRT00456', 'Satuan': 'BOX', 'Kategori': 'Product', 'Customer': 'Customer B', 'Stock Aman': '200', 'Stock Minimum': '100', 'Harga FG': '75000', 'Last Update': '01/01/2026 10:00:00', 'User Update': 'System', 'Price Satuan': 'Rp 75.000', 'BOM Kode': 'MTRL-00002', 'Material Kode': 'MTRL-00002', 'Nama Material': 'Material 2', 'Ratio': '0.5' },
    ];
    
    const showPreviewDialog = () => {
      showConfirm(
        `📋 Format Excel untuk Import Products

Pastikan file Excel Anda memiliki header berikut:

${exampleHeaders.join(' | ')}

Contoh data:
${exampleData.map((row, idx) => `${idx + 1}. ${exampleHeaders.map(h => String(row[h as keyof typeof row] || '')).join(' | ')}`).join('\\n')}
')}

⚠️ Catatan:
- Header harus ada di baris pertama
- Kode dan Nama wajib diisi
- Header bisa menggunakan variasi: Kode/Code/SKU, Nama/Name, Satuan/Unit/UOM, dll

Klik "Download Template" untuk mendapatkan file Excel template, atau "Lanjutkan" untuk memilih file Excel yang sudah Anda siapkan.`,
        () => {
          closeDialog();
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.xlsx,.xls,.csv';
          input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        // Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (jsonData.length === 0) {
          showAlert('Excel file is empty or has no data', 'Error');
          return;
        }

        // Auto-map columns (case-insensitive, handle whitespace)
        const mapColumn = (row: any, possibleNames: string[]): string => {
          // Normalize key: trim, lowercase, replace multiple spaces with single space
          const normalizeKey = (key: string) => key.trim().toLowerCase().replace(/\s+/g, ' ');
          
          for (const name of possibleNames) {
            const normalizedName = normalizeKey(name);
            const keys = Object.keys(row);
            const found = keys.find(k => normalizeKey(k) === normalizedName);
            if (found !== undefined) {
              // Return value even if it's 0 or empty string (valid values)
              const value = String(row[found] || '').trim();
              return value;
            }
          }
          return '';
        };

        const errors: string[] = [];
        const newProductsMap = new Map<string, Product>(); // Untuk deduplication di tahap parsing

        jsonData.forEach((row, index) => {
          try {
            const kode = mapColumn(row, ['KODE (SKU/ID)', 'KODE', 'Kode', 'Code', 'CODE', 'SKU', 'sku', 'Product Code', 'product_code']);
            const nama = mapColumn(row, ['Nama', 'NAMA', 'Name', 'NAME', 'Product Name', 'product_name']);
            const padCode = mapColumn(row, ['Pad Code', 'PAD CODE', 'PadCode', 'pad_code', 'PAD', 'pad']);
            const kodeIpos = mapColumn(row, ['Kode Ipos', 'KODE IPOS', 'Kode IPOS', 'code_ipos', 'IPOS', 'kode ipos', 'code ipos']);
            const satuan = mapColumn(row, ['Satuan', 'SATUAN', 'Unit', 'UNIT', 'UOM', 'uom']);
            const kategori = mapColumn(row, ['Kategori', 'KATEGORI', 'Category', 'CATEGORY']);
            const customer = mapColumn(row, ['Customer', 'CUSTOMER', 'Customer Name', 'customer_name']);
            const stockAmanStr = mapColumn(row, ['Stock Aman', 'STOCK AMAN', 'Safe Stock', 'safe_stock']);
            const stockMinimumStr = mapColumn(row, ['Stock Minimum', 'STOCK MINIMUM', 'Min Stock', 'min_stock']);
            const hargaFgStr = mapColumn(row, ['Harga FG', 'HARGA FG', 'Price', 'PRICE', 'Selling Price', 'selling_price']);
            const lastUpdate = mapColumn(row, ['Last Update', 'LAST UPDATE', 'Update Date', 'update_date']);
            const userUpdate = mapColumn(row, ['User Update', 'USER UPDATE', 'Updated By', 'updated_by']);
            const priceSatuanStr = mapColumn(row, ['Price Satuan', 'PRICE SATUAN', 'Price', 'price']);
            const bomKode = mapColumn(row, ['BOM Kode', 'BOM KODE', 'BOM', 'bom']);
            const materialKode = mapColumn(row, ['Material Kode', 'MATERIAL KODE', 'Material', 'material']);
            const namaMaterial = mapColumn(row, ['Nama Material', 'NAMA MATERIAL', 'Material Name', 'material_name']);
            const ratio = mapColumn(row, ['Ratio', 'RATIO', 'Ratio Value', 'ratio_value']);

            // Skip empty rows
            if (!kode && !nama) {
              return;
            }

            // Hanya nama yang wajib, kode bisa kosong dan akan di-generate
            if (!nama) {
              errors.push(`Row ${index + 2}: Nama is required`);
              return;
            }

            // Helper function untuk normalize nama (hapus spasi berlebih, normalize karakter)
            const normalizeName = (name: string): string => {
              return name
                .toLowerCase()
                .trim()
                // Normalize spasi: hapus spasi berlebih, normalize spasi di sekitar karakter khusus
                .replace(/\s+/g, ' ') // Multiple spaces jadi satu
                .replace(/\s*([*xX])\s*/g, '$1') // Normalize 370*370*430 atau 370X370X430
                .replace(/\s*([\/])\s*/g, '$1') // Normalize spasi di sekitar /
                .replace(/\s*([-])\s*/g, '$1') // Normalize spasi di sekitar -
                .trim();
            };

            // Helper function untuk cek nama mirip (yang pendek merge ke yang lengkap)
            const isSimilarName = (name1: string, name2: string): boolean => {
              const n1 = normalizeName(name1);
              const n2 = normalizeName(name2);
              
              if (n1 === n2) return true;
              
              // Cek apakah yang satu adalah substring dari yang lain (minimal 70% match)
              const longer = n1.length > n2.length ? n1 : n2;
              const shorter = n1.length > n2.length ? n2 : n1;
              
              // Exact substring match
              if (longer.includes(shorter)) {
                return shorter.length >= longer.length * 0.7;
              }
              
              // Cek similarity dengan menghitung karakter yang sama
              let matches = 0;
              const minLen = Math.min(n1.length, n2.length);
              for (let i = 0; i < minLen; i++) {
                if (n1[i] === n2[i]) matches++;
              }
              
              // Minimal 85% karakter sama untuk dianggap mirip
              return matches >= minLen * 0.85;
            };

            // Helper function untuk cek harga sama (dengan toleransi kecil)
            // Jika salah satu harga kosong, tetap bisa merge (anggap harga sama)
            const isSamePrice = (price1: number, price2: number): boolean => {
              if (price1 === 0 && price2 === 0) return true;
              // Jika salah satu kosong, anggap sama (bisa merge)
              if (price1 === 0 || price2 === 0) return true;
              const diff = Math.abs(price1 - price2);
              return diff < 0.01; // Toleransi 0.01 untuk floating point
            };

            const hargaFg = parseFloat(hargaFgStr) || 0;

            // Parse Price Satuan (remove Rp and format)
            let priceSatuan = hargaFg; // Default to hargaFg
            if (priceSatuanStr) {
              const cleanPrice = priceSatuanStr.replace(/[Rp\s.]/g, '').replace(',', '.');
              priceSatuan = parseFloat(cleanPrice) || hargaFg;
            }

            // Parse BOM data
            const bomItems: any[] = [];
            if (bomKode && materialKode && namaMaterial && ratio) {
              const bomKodes = bomKode.split(';').map(k => k.trim()).filter(k => k);
              const materialKodes = materialKode.split(';').map(k => k.trim()).filter(k => k);
              const namaMaterials = namaMaterial.split(';').map(n => n.trim()).filter(n => n);
              const ratios = ratio.split(';').map(r => r.trim()).filter(r => r);
              
              // Create BOM items (use the shortest length to avoid index errors)
              const maxLength = Math.min(bomKodes.length, materialKodes.length, namaMaterials.length, ratios.length);
              for (let i = 0; i < maxLength; i++) {
                bomItems.push({
                  material_id: materialKodes[i] || bomKodes[i],
                  material_name: namaMaterials[i],
                  ratio: parseFloat(ratios[i]) || 1,
                });
              }
            }

            // Check if product already exists dengan prioritas:
            // 1. Kode (exact match)
            // 2. KodeIpos (exact match)
            // 3. PadCode (exact match)
            // 4. Nama mirip + harga sama (yang pendek merge ke yang lengkap)
            let existingIndex = -1;
            let existingProduct: Product | null = null;

            // Prioritas 1: Cek berdasarkan kode
            if (kode && kode.trim()) {
              const found = products.find(p => {
                const pKode = (p.kode || '').trim();
                return pKode && pKode.toLowerCase() === kode.trim().toLowerCase();
              });
              if (found) {
                existingIndex = products.indexOf(found);
                existingProduct = found;
              }
            }

            // Prioritas 2: Cek berdasarkan kodeIpos
            if (existingIndex < 0 && kodeIpos && kodeIpos.trim()) {
              const found = products.find(p => {
                const pKodeIpos = (p.kodeIpos || '').trim();
                return pKodeIpos && pKodeIpos.toLowerCase() === kodeIpos.trim().toLowerCase();
              });
              if (found) {
                existingIndex = products.indexOf(found);
                existingProduct = found;
              }
            }

            // Prioritas 3: Cek berdasarkan padCode
            if (existingIndex < 0 && padCode && padCode.trim()) {
              const found = products.find(p => {
                const pPadCode = (p.padCode || '').trim();
                return pPadCode && pPadCode.toLowerCase() === padCode.trim().toLowerCase();
              });
              if (found) {
                existingIndex = products.indexOf(found);
                existingProduct = found;
              }
            }

            // Prioritas 4: Cek berdasarkan nama mirip + harga sama (atau salah satu kosong)
            if (existingIndex < 0) {
              const found = products.find(p => {
                const pNama = (p.nama || '').trim();
                
                // Cek nama mirip
                if (!isSimilarName(pNama, nama)) return false;
                
                // Cek harga sama (atau salah satu kosong)
                const pHargaFg = p.hargaFg || 0;
                if (!isSamePrice(pHargaFg, hargaFg)) return false;
                
                // Pastikan yang lebih lengkap yang jadi target merge
                // (yang pendek merge ke yang lengkap)
                return pNama.length >= nama.length;
              });
              if (found) {
                existingIndex = products.indexOf(found);
                existingProduct = found;
              }
            }

            // Fallback: Cek exact match nama (untuk backward compatibility)
            if (existingIndex < 0) {
              const found = products.find(p => {
                const pNama = (p.nama || '').toLowerCase().trim();
                return pNama === nama.toLowerCase().trim();
              });
              if (found) {
                existingIndex = products.indexOf(found);
                existingProduct = found;
              }
            }

            // Auto-generate kode jika kosong (prioritas: kodeIpos > padCode > nama)
            // Tapi jika existing product punya kode, keep kode existing
            let finalKode = kode;
            if (existingProduct) {
              // Jika existing product punya kode, keep kode existing
              finalKode = existingProduct.kode || kode || '';
            }
            
            // Jika masih kosong, generate
            if (!finalKode || finalKode.trim() === '') {
              if (kodeIpos && kodeIpos.trim()) {
                finalKode = kodeIpos.trim();
              } else if (padCode && padCode.trim()) {
                finalKode = padCode.trim();
              } else {
                // Generate dari nama (ambil 10 karakter pertama, uppercase, hapus spasi)
                finalKode = nama.trim().substring(0, 10).toUpperCase().replace(/\s+/g, '-');
                // Tambahkan timestamp untuk uniqueness
                finalKode = `${finalKode}-${Date.now().toString().slice(-6)}`;
              }
            }

            const stockAman = parseFloat(stockAmanStr) || 0;
            const stockMinimum = parseFloat(stockMinimumStr) || 0;

            // Generate key untuk deduplication di tahap parsing
            let dedupKey = '';
            if (kode && kode.trim()) {
              dedupKey = `kode:${kode.trim().toLowerCase()}`;
            } else if (kodeIpos && kodeIpos.trim()) {
              dedupKey = `kodeIpos:${kodeIpos.trim().toLowerCase()}`;
            } else if (padCode && padCode.trim()) {
              dedupKey = `padCode:${padCode.trim().toLowerCase()}`;
            } else {
              dedupKey = `nama:${nama.trim().toLowerCase()}`;
            }

            if (existingProduct) {
              // Merge/Update existing product
              // Gunakan nama yang lebih lengkap (yang lebih panjang)
              const existingNama = (existingProduct.nama || '').trim();
              const importNama = nama.trim();
              const finalNama = existingNama.length >= importNama.length ? existingNama : importNama;

              const mergedProduct: Product = {
                ...existingProduct,
                // Keep kode existing jika di import kosong, atau update jika ada
                kode: kode && kode.trim() ? kode.trim() : (existingProduct.kode || finalKode),
                nama: finalNama, // Gunakan nama yang lebih lengkap
                // Update padCode jika di import ada, atau keep existing
                padCode: padCode && padCode.trim() ? padCode.trim() : (existingProduct.padCode || ''),
                // Update kodeIpos jika di import ada, atau keep existing
                kodeIpos: kodeIpos && kodeIpos.trim() ? kodeIpos.trim() : (existingProduct.kodeIpos || ''),
                // Update field lainnya jika ada di import, atau keep existing
                satuan: satuan && satuan.trim() ? satuan.trim() : (existingProduct.satuan || 'PCS'),
                kategori: kategori && kategori.trim() ? kategori.trim() : (existingProduct.kategori || ''),
                customer: customer && customer.trim() ? customer.trim() : (existingProduct.customer || ''),
                stockAman: stockAman > 0 ? stockAman : (existingProduct.stockAman || 0),
                stockMinimum: stockMinimum > 0 ? stockMinimum : (existingProduct.stockMinimum || 0),
                hargaFg: hargaFg > 0 ? hargaFg : (existingProduct.hargaFg || 0),
                bom: bomItems.length > 0 ? bomItems : (existingProduct.bom || []),
                product_id: kode && kode.trim() ? kode.trim() : (existingProduct.product_id || finalKode),
                lastUpdate: new Date().toISOString(),
                userUpdate: userUpdate && userUpdate.trim() ? userUpdate.trim() : 'System',
                ipAddress: '127.0.0.1',
              };

              // Update di map jika sudah ada, atau add baru
              if (dedupKey) {
                const existingInMap = newProductsMap.get(dedupKey);
                if (existingInMap) {
                  // Merge dengan yang sudah ada di map (pilih yang lebih lengkap)
                  const existingNamaInMap = (existingInMap.nama || '').trim();
                  if (finalNama.length > existingNamaInMap.length) {
                    newProductsMap.set(dedupKey, mergedProduct);
                  }
                } else {
                  newProductsMap.set(dedupKey, mergedProduct);
                }
              }
            } else {
              // Create new product
              // Generate unique ID dengan timestamp + index + random untuk avoid duplicates
              const uniqueId = `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
              const newProduct: Product = {
                id: uniqueId,
                no: products.length + newProductsMap.size + 1,
                kode: finalKode, // Gunakan finalKode (bisa dari auto-generate)
                nama,
                padCode: padCode || '',
                kodeIpos: kodeIpos || '',
                satuan: satuan || 'PCS',
                kategori: kategori || '',
                customer: customer || '',
                stockAman,
                stockMinimum,
                hargaFg,
                bom: bomItems,
                product_id: finalKode, // Gunakan finalKode untuk product_id juga
                lastUpdate: new Date().toISOString(),
                userUpdate: userUpdate && userUpdate.trim() ? userUpdate.trim() : 'System',
                ipAddress: '127.0.0.1',
              } as Product;

              // Cek apakah sudah ada di map (duplikat di Excel)
              if (dedupKey && newProductsMap.has(dedupKey)) {
                // Merge dengan yang sudah ada (pilih yang lebih lengkap)
                const existingInMap = newProductsMap.get(dedupKey)!;
                const existingNamaInMap = (existingInMap.nama || '').trim();
                if (nama.trim().length > existingNamaInMap.length) {
                  newProductsMap.set(dedupKey, newProduct);
                }
              } else {
                newProductsMap.set(dedupKey, newProduct);
              }
            }
          } catch (error: any) {
            const errorMsg = error?.message || 'Unknown error';
            const rowData = Object.keys(row).slice(0, 3).map(k => `${k}:${row[k]}`).join(', ');
            errors.push(`Row ${index + 2}: ${errorMsg}${rowData ? ` (${rowData}...)` : ''}`);
          }
        });

        // Convert map ke array (sudah deduplicated)
        const newProducts = Array.from(newProductsMap.values());

        if (newProducts.length === 0) {
          const availableKeys = jsonData.length > 0 ? Object.keys(jsonData[0]).join(', ') : 'none';
          showAlert(`❌ Tidak ada data valid yang ditemukan di file Excel.

Total rows: ${jsonData.length}
Available columns: ${availableKeys}

Pastikan:
- Ada kolom "Nama" atau "Name"
- Data tidak kosong semua
- Format file benar`, 'Error');
          return;
        }

        const importProducts = async () => {
          // Show loading indicator
          showAlert('⏳ Memproses import... Harap tunggu.', 'Info');
          
          // Helper function untuk normalize nama (hapus spasi berlebih, normalize karakter)
          const normalizeName = (name: string): string => {
            return name
              .toLowerCase()
              .trim()
              // Normalize spasi: hapus spasi berlebih, normalize spasi di sekitar karakter khusus
              .replace(/\s+/g, ' ') // Multiple spaces jadi satu
              .replace(/\s*([*xX])\s*/g, '$1') // Normalize 370*370*430 atau 370X370X430
              .replace(/\s*([\/])\s*/g, '$1') // Normalize spasi di sekitar /
              .replace(/\s*([-])\s*/g, '$1') // Normalize spasi di sekitar -
              .trim();
          };

          // Helper function untuk cek nama mirip (yang pendek merge ke yang lengkap)
          const isSimilarName = (name1: string, name2: string): boolean => {
            const n1 = normalizeName(name1);
            const n2 = normalizeName(name2);
            
            if (n1 === n2) return true;
            
            // Cek apakah yang satu adalah substring dari yang lain (minimal 70% match)
            const longer = n1.length > n2.length ? n1 : n2;
            const shorter = n1.length > n2.length ? n2 : n1;
            
            // Exact substring match
            if (longer.includes(shorter)) {
              return shorter.length >= longer.length * 0.7;
            }
            
            // Cek similarity dengan menghitung karakter yang sama
            let matches = 0;
            const minLen = Math.min(n1.length, n2.length);
            for (let i = 0; i < minLen; i++) {
              if (n1[i] === n2[i]) matches++;
            }
            
            // Minimal 85% karakter sama untuk dianggap mirip
            return matches >= minLen * 0.85;
          };

          // Helper function untuk cek harga sama (dengan toleransi kecil)
          // Jika salah satu harga kosong, tetap bisa merge (anggap harga sama)
          const isSamePrice = (price1: number, price2: number): boolean => {
            if (price1 === 0 && price2 === 0) return true;
            // Jika salah satu kosong, anggap sama (bisa merge)
            if (price1 === 0 || price2 === 0) return true;
            const diff = Math.abs(price1 - price2);
            return diff < 0.01;
          };

          // OPTIMIZE: Buat Map untuk fast lookup (O(1) instead of O(n))
          const productsByKode = new Map<string, { index: number; product: Product }>();
          const productsByKodeIpos = new Map<string, { index: number; product: Product }>();
          const productsByPadCode = new Map<string, { index: number; product: Product }>();
          const productsByNama = new Map<string, { index: number; product: Product }>();
          
          products.forEach((p, idx) => {
            const kode = (p.kode || '').trim().toLowerCase();
            const kodeIpos = (p.kodeIpos || '').trim().toLowerCase();
            const padCode = (p.padCode || '').trim().toLowerCase();
            const nama = (p.nama || '').trim().toLowerCase();
            
            if (kode) productsByKode.set(kode, { index: idx, product: p });
            if (kodeIpos) productsByKodeIpos.set(kodeIpos, { index: idx, product: p });
            if (padCode) productsByPadCode.set(padCode, { index: idx, product: p });
            if (nama) productsByNama.set(nama, { index: idx, product: p });
          });

          // Merge with existing products (update existing, add new) - OPTIMIZED dengan Map lookup
          const updatedProducts = [...products];
          newProducts.forEach(newProduct => {
            let existingIndex = -1;
            let existing: Product | null = null;

            // Prioritas 1: Cek berdasarkan kode (O(1) lookup)
            if (newProduct.kode && newProduct.kode.trim()) {
              const kodeKey = newProduct.kode.trim().toLowerCase();
              const found = productsByKode.get(kodeKey);
              if (found) {
                existingIndex = found.index;
                existing = found.product;
              }
            }

            // Prioritas 2: Cek berdasarkan kodeIpos (O(1) lookup)
            if (existingIndex < 0 && newProduct.kodeIpos && newProduct.kodeIpos.trim()) {
              const kodeIposKey = newProduct.kodeIpos.trim().toLowerCase();
              const found = productsByKodeIpos.get(kodeIposKey);
              if (found) {
                existingIndex = found.index;
                existing = found.product;
              }
            }

            // Prioritas 3: Cek berdasarkan padCode (O(1) lookup)
            if (existingIndex < 0 && newProduct.padCode && newProduct.padCode.trim()) {
              const padCodeKey = newProduct.padCode.trim().toLowerCase();
              const found = productsByPadCode.get(padCodeKey);
              if (found) {
                existingIndex = found.index;
                existing = found.product;
              }
            }

            // Prioritas 4: Cek berdasarkan nama mirip + harga sama (skip untuk performance, hanya exact match)
            // Skip similarity check untuk performance - hanya exact match
            if (existingIndex < 0 && newProduct.nama && newProduct.nama.trim()) {
              const namaKey = newProduct.nama.trim().toLowerCase();
              const found = productsByNama.get(namaKey);
              if (found) {
                // Cek harga sama
                const pHargaFg = found.product.hargaFg || 0;
                const newHargaFg = newProduct.hargaFg || 0;
                if (isSamePrice(pHargaFg, newHargaFg)) {
                  existingIndex = found.index;
                  existing = found.product;
                }
              }
            }

            if (existingIndex >= 0 && existing) {
              // Merge: update existing dengan data dari import
              // Gunakan nama yang lebih lengkap
              const existingNama = (existing.nama || '').trim();
              const newNama = (newProduct.nama || '').trim();
              const finalNama = existingNama.length >= newNama.length ? existingNama : newNama;

              updatedProducts[existingIndex] = {
                ...existing,
                ...newProduct,
                // Keep id dan no dari existing
                id: existing.id,
                no: existing.no,
                // Gunakan nama yang lebih lengkap
                nama: finalNama,
              };
            } else {
              updatedProducts.push(newProduct);
            }
          });

          // OPTIMIZE: Final deduplication dengan single pass (lebih cepat)
          const deduplicatedMap = new Map<string, Product>();
          
          // Single pass deduplication
          for (const product of updatedProducts) {
            let key = '';
            
            // Prioritas 1: Gunakan kode sebagai key
            if (product.kode && product.kode.trim()) {
              key = `kode:${product.kode.trim().toLowerCase()}`;
            }
            // Prioritas 2: Gunakan kodeIpos sebagai key
            else if (product.kodeIpos && product.kodeIpos.trim()) {
              key = `kodeIpos:${product.kodeIpos.trim().toLowerCase()}`;
            }
            // Prioritas 3: Gunakan padCode sebagai key
            else if (product.padCode && product.padCode.trim()) {
              key = `padCode:${product.padCode.trim().toLowerCase()}`;
            }
            // Prioritas 4: Gunakan nama sebagai key
            else if (product.nama && product.nama.trim()) {
              key = `nama:${product.nama.trim().toLowerCase()}`;
            }
            // Fallback: Gunakan id
            else {
              key = `id:${product.id || Date.now().toString()}`;
            }

            if (key) {
              const existing = deduplicatedMap.get(key);
              if (!existing) {
                deduplicatedMap.set(key, product);
              } else {
                // Jika ada duplikat, pilih yang lebih lengkap (nama lebih panjang, atau lastUpdate lebih baru)
                const existingNama = (existing.nama || '').trim();
                const newNama = (product.nama || '').trim();
                const existingLastUpdate = existing.lastUpdate || '';
                const newLastUpdate = product.lastUpdate || '';
                
                // Pilih yang lebih lengkap atau lebih baru
                if (newNama.length > existingNama.length || 
                    (newNama.length === existingNama.length && newLastUpdate > existingLastUpdate)) {
                  deduplicatedMap.set(key, product);
                }
              }
            }
          }

          const deduplicated = Array.from(deduplicatedMap.values());

          // Re-number products
          const renumbered = deduplicated.map((p, idx) => ({ ...p, no: idx + 1 }));

          // Save dengan async untuk non-blocking
          await storageService.set('products', renumbered);
          
          // Update state di next tick untuk avoid blocking
          setTimeout(() => {
            setProducts(renumbered);
          }, 0);

          // Sync ke server di background (non-blocking)
          const syncToServer = async () => {
            try {
              const storageConfig = JSON.parse(localStorage.getItem('storage_config') || '{"type":"local"}');
              if (storageConfig.type === 'server' && storageConfig.serverUrl) {
                await storageService.syncToServer();
              }
            } catch (syncError) {
              // Ignore sync error - tidak block import
            }
          };
          syncToServer().catch(() => {}); // Fire and forget

          if (errors.length > 0) {
            showAlert(`✅ Imported ${newProducts.length} products
📊 Total: ${renumbered.length} products

⚠️ ${errors.length} errors occurred:
${errors.slice(0, 5).join('\\n')}
')}`, 'Import Completed');
          } else {
            showAlert(`✅ Successfully imported ${newProducts.length} products\n📊 Total: ${renumbered.length} products`, 'Success');
          }
        };

        showConfirm(
          `Import ${newProducts.length} products from Excel?${errors.length > 0 ? `\n\n${errors.length} errors occurred.` : ''}`,
          importProducts,
          undefined,
          'Confirm Import'
        );
      } catch (error: any) {
        const errorMessage = error?.message || 'Unknown error';
        const errorStack = error?.stack ? `\n\nStack: ${error.stack.split('\n').slice(0, 3).join('\n')}` : '';
        showAlert(`❌ Error importing Excel: ${errorMessage}${errorStack}\n\nPastikan:\n- File adalah format Excel yang valid (.xlsx atau .xls)\n- File tidak sedang dibuka di aplikasi lain\n- File tidak corrupt`, 'Error');
      }
          };
          input.click();
        },
        () => closeDialog(),
        'Format Excel Preview'
      );
    };
    
    showPreviewDialog();
  };

  const handleExportExcel = async () => {
    try {
      // Load materials from storage
      const materialsData = await storageService.get<any[]>('materials') || [];
      const materialMap = new Map<string, any>();
      materialsData.forEach(material => {
        if (material.material_id) {
          materialMap.set(material.material_id, material);
        }
      });
      
      // Build lookup maps for BOM
      const bomMap = new Map<string, any[]>();
      
      // Group BOM by product_id
      bomData.forEach(bom => {
        if (bom.product_id) {
          if (!bomMap.has(bom.product_id)) {
            bomMap.set(bom.product_id, []);
          }
          bomMap.get(bom.product_id)!.push(bom);
        }
      });
      
      const dataToExport = filteredProducts.map(product => {
        // Ensure kode uses product_id if available
        const kodeValue = product.kode || product.product_id || '';
        
        // Get BOM info for this product - check both inline BOM and external BOM
        let productBom: any[] = [];
        
        // First check inline BOM (from product.bom)
        if (product.bom && Array.isArray(product.bom) && product.bom.length > 0) {
          productBom = product.bom;
        }
        // Then check external BOM from bomMap
        else {
          productBom = bomMap.get(kodeValue) || [];
        }
        
        // Create separate BOM columns
        const bomKode = productBom.length > 0 ? productBom.map(bom => bom.material_id).join('; ') : '';
        const materialKode = productBom.length > 0 ? productBom.map(bom => bom.material_id).join('; ') : '';
        const namaMaterial = productBom.length > 0 ? productBom.map(bom => {
          const material = materialMap.get(bom.material_id);
          return material ? material.nama : bom.material_id;
        }).join('; ') : '';
        const ratio = productBom.length > 0 ? productBom.map(bom => bom.ratio).join('; ') : '';
        
        return {
        'No': product.no,
        'KODE (SKU/ID)': kodeValue,
        'Nama': product.nama,
        'Pad Code': product.padCode || '',
        'Kode Ipos': product.kodeIpos || '',
        'Satuan': product.satuan,
        'Kategori': product.kategori,
        'Customer': product.customer || '',
        'Stock Aman': product.stockAman || 0,
        'Stock Minimum': product.stockMinimum || 0,
        'Harga FG': product.hargaFg || 0,
        'Last Update': formatDateTime(product.lastUpdate),
        'User Update': product.userUpdate || 'System',
        'Price Satuan': product.hargaFg ? `Rp ${product.hargaFg.toLocaleString('id-ID')}` : 'Rp 0',
        'BOM Kode': bomKode,
        'Material Kode': materialKode,
        'Nama Material': namaMaterial,
        'Ratio': ratio,
        };
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Products');
      
      const fileName = `Products_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Exported ${dataToExport.length} products to ${fileName}`, 'Success');
    } catch (error: any) {
      showAlert(`Error exporting to Excel: ${error.message}`, 'Error');
    }
  };

  const handleEditBOM = (item: Product) => {
    setEditingBOM(item);
  };

  const handleSaveBOM = useCallback(async (bomItems: any[]) => {
    // Get editingBOM dari closure, bukan dari dependency
    const currentEditingBOM = editingBOM;
    if (!currentEditingBOM) return;

    isSavingBOMRef.current = true;
    try {
      // Load existing BOM
      const existingBOM = extractStorageValue(await storageService.get<any[]>('bom'));
      let productId = (currentEditingBOM.product_id || currentEditingBOM.padCode || currentEditingBOM.kode || '').toString().trim();

      // Auto-generate product_id jika kosong
      if (!productId) {
        const customerName = (currentEditingBOM.customer || '').trim();
        if (customerName) {
          productId = generateProductId(customerName);
          
          // Update product dengan product_id yang baru di-generate
          const updatedProducts = products.map(p => 
            p.id === currentEditingBOM.id
              ? { ...p, product_id: productId }
              : p
          );
          await storageService.set('products', updatedProducts);
          setProducts(updatedProducts.map((p, idx) => ({ ...p, no: idx + 1 })));
        } else {
          showAlert('Product ID tidak ditemukan dan customer tidak ada. Tidak bisa menyimpan BOM.', 'Error');
          setEditingBOM(null);
          isSavingBOMRef.current = false;
          return;
        }
      }

      // Remove old BOM items for this product (hapus semua yang product_id sama)
      // CRITICAL: Juga hapus BOM yang product_id match dengan kode/kodeIpos/padCode produk ini
      const productIdLower = productId.toLowerCase();
      const filteredBOM = existingBOM.filter(b => {
        if (!b) return true;
        const bomProductId = String(b.product_id || b.padCode || b.kode || '').trim().toLowerCase();
        
        // Direct match
        if (bomProductId === productIdLower) return false;
        
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
        
        // Jika ada produk yang match dengan bomProductId, cek apakah produk itu sama dengan produk yang sedang di-edit
        if (matchingProduct) {
          const pKode = String(matchingProduct.kode || '').trim().toLowerCase();
          const pKodeIpos = String(matchingProduct.kodeIpos || '').trim().toLowerCase();
          const pProductId = String(matchingProduct.product_id || '').trim().toLowerCase();
          const pPadCode = String(matchingProduct.padCode || '').trim().toLowerCase();
          
          // Cek apakah produk ini sama dengan produk yang sedang di-edit
          const editingProductKode = String(currentEditingBOM.kode || '').trim().toLowerCase();
          const editingProductKodeIpos = String(currentEditingBOM.kodeIpos || '').trim().toLowerCase();
          const editingProductId = String(currentEditingBOM.product_id || '').trim().toLowerCase();
          const editingProductPadCode = String(currentEditingBOM.padCode || '').trim().toLowerCase();
          
          if ((pKode && (pKode === editingProductKode || pKode === productIdLower)) ||
              (pKodeIpos && (pKodeIpos === editingProductKodeIpos || pKodeIpos === productIdLower)) ||
              (pProductId && (pProductId === editingProductId || pProductId === productIdLower)) ||
              (pPadCode && (pPadCode === editingProductPadCode || pPadCode === productIdLower))) {
            return false; // Hapus BOM ini karena match dengan produk yang sedang di-edit
          }
        }
        
        return true; // Keep BOM ini
      });

      // Add new BOM items - format sesuai sheet: product_id, material_id, ratio
      // Jangan duplicate material_id di BOM yang sama
      const materialIdSet = new Set<string>();
      const newBOMItems = bomItems
        .filter(item => {
          // Support both camelCase (dari BOMDialog) dan snake_case (backward compatibility)
          const materialId = (item.materialId || item.material_id || '').toString().trim();
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
          product_id: productId,  // Tetap snake_case di storage untuk backward compatibility
          material_id: (item.materialId || item.material_id || '').toString().trim(),  // Support both camelCase dan snake_case
          ratio: item.ratio || 1,
          created: item.id ? undefined : new Date().toISOString(),
        }));

      // Save to storage
      // IMPORTANT: BOM harus selalu di-sync dengan timestamp baru
      // storageService.set() akan handle timestamp, tapi kita pastikan data benar-benar berubah
      const updatedBOM = [...filteredBOM, ...newBOMItems];
      await storageService.set('bom', updatedBOM);
      // storageService.set() akan trigger 'app-storage-changed' event
      // Event listener akan skip reload karena isSavingBOMRef.current = true

      // Tampilkan pesan sukses dengan format sama seperti PPIC (sebelum close dialog)
      const successMessage = `BOM berhasil disimpan untuk product: ${currentEditingBOM.nama || productId}\n\n(${newBOMItems.length} material)`;
      showAlert(successMessage, 'Success');
      
      // Close dialog setelah alert ditampilkan
      setEditingBOM(null);
      
      // Reload data untuk update tampilan (setelah dialog ditutup)
      setTimeout(async () => {
        // Set flag false sebelum reload untuk allow reload
        isSavingBOMRef.current = false;
        await loadProducts();
        
        // Broadcast event untuk sync ke PPIC dan module lain (setelah reload)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('bomUpdated', { 
            detail: { productId, bomItems: newBOMItems, source: 'MasterProducts' } 
          }));
        }
      }, 200);
    } catch (error: any) {
      console.error('Error saving BOM:', error);
      showAlert(`Error saving BOM: ${error.message}`, 'Error');
      setEditingBOM(null);
      isSavingBOMRef.current = false;
    }
  }, [showAlert, loadProducts, products, generateProductId]);

  const columns = [
    { 
      key: 'bomIndicator', 
      header: 'BOM',
      render: (item: Product) => {
        const hasBom = hasBOM(item);
        
        // Debug log for first few items
        if (item.no <= 3) {
          console.log('[Products] 🎨 Rendering BOM indicator:', {
            productName: item.nama,
            productId: item.product_id || item.padCode || item.kode,
            hasBom: hasBom,
            color: hasBom ? '#388e3c' : '#ff9800'
          });
        }
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: hasBom ? '#388e3c' : '#ff9800',
                display: 'inline-block',
              }}
              title={hasBom ? 'Memiliki BOM' : 'Tidak memiliki BOM'}
            />
          </div>
        );
      },
    },
    { 
      key: 'no', 
      header: 'No',
      render: (item: Product) => {
        const index = paginatedProducts.findIndex(p => p.id === item.id);
        return index >= 0 ? startIndex + index + 1 : '';
      },
    },
    { key: 'product_id', header: 'Kode (SKU/ID)' },
    { key: 'nama', header: 'Nama' },
    { key: 'padCode', header: 'Pad Code' },
    // Hidden: Kode Ipos column
    // { 
    //   key: 'kodeIpos', 
    //   header: 'Kode Ipos',
    //   render: (item: Product) => item.kodeIpos || '-',
    // },
    { key: 'satuan', header: 'Satuan (Unit)' },
    { key: 'kategori', header: 'Kategori' },
    { 
      key: 'customer', 
      header: 'Customer',
      render: (item: Product) => {
        return item.customer || item.supplier || '-';
      },
    },
    { 
      key: 'lastUpdate', 
      header: 'Last Update',
      render: (item: Product) => formatDateTime(item.lastUpdate)
    },
    { key: 'userUpdate', header: 'User Update' },
    { 
      key: 'hargaFg', 
      header: 'Price Satuan',
      render: (item: Product) => {
        const harga = item.hargaFg || item.harga || 0;
        return harga > 0 ? new Intl.NumberFormat('id-ID', { 
          style: 'currency', 
          currency: 'IDR',
          minimumFractionDigits: 0 
        }).format(harga) : '-';
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Product) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={() => handleEdit(item)}>Edit</Button>
          <Button variant="primary" onClick={() => handleEditBOM(item)}>Edit BOM</Button>
          <Button 
            variant="secondary" 
            onClick={() => navigate('/packaging/master/inventory', { 
              state: { highlightProduct: item.product_id || item.kode } 
            })}
            style={{ fontSize: '12px', padding: '4px 8px' }}
          >
            📊 Inventory
          </Button>
          <Button variant="danger" onClick={() => handleDelete(item)}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="master-compact">
      <div className="page-header">
        <h1>Master Products</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={handleCleanupDuplicates}>🧹 Cleanup Duplicates</Button>
          <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
          <Button variant="secondary" onClick={handleDownloadTemplate}>📋 Download Template</Button>
          <Button variant="primary" onClick={handleImportExcel}>📤 Import Excel</Button>
          <Button onClick={() => { 
              setCustomerInputValue('');
              setStockAmanInputValue('');
              setStockMinimumInputValue('');
              setPriceInputValue('');
              setFormData({ kode: '', nama: '', padCode: '', kodeIpos: '', satuan: '', stockAman: 0, stockMinimum: 0, kategori: '', customer: '', hargaFg: 0 });
              setEditingItem(null);
            setShowForm(true);
          }}>
            + Add Product
          </Button>
        </div>
      </div>


      {showForm && (
        <div className="dialog-overlay" onClick={() => { setShowForm(false); setEditingItem(null); setCustomerInputValue(''); setStockAmanInputValue(''); setStockMinimumInputValue(''); setPriceInputValue(''); setFormData({ kode: '', nama: '', padCode: '', satuan: '', stockAman: 0, stockMinimum: 0, kategori: '', customer: '', hargaFg: 0 }); }} style={{ zIndex: 10000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto', zIndex: 10001 }}>
            <Card title={editingItem ? "Edit Product" : "Add New Product"} className="dialog-card">
          <Input
            label="Kode (SKU/ID)"
            value={formData.kode || ''}
            onChange={(v) => setFormData({ ...formData, kode: v })}
          />
          <Input
            label="Nama"
            value={formData.nama || ''}
            onChange={(v) => setFormData({ ...formData, nama: v })}
          />
          <Input
            label="Pad Code"
            value={formData.padCode || ''}
            onChange={(v) => setFormData({ ...formData, padCode: v })}
          />
          {/* Hidden: Kode Ipos input */}
          {/* <Input
            label="Kode Ipos"
            value={formData.kodeIpos || ''}
            onChange={(v) => setFormData({ ...formData, kodeIpos: v })}
          /> */}
          <Input
            label="Satuan (Unit)"
            value={formData.satuan || ''}
            onChange={(v) => setFormData({ ...formData, satuan: v })}
          />
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Stock Aman
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={stockAmanInputValue !== undefined && stockAmanInputValue !== '' ? stockAmanInputValue : (formData.stockAman !== undefined && formData.stockAman !== null && formData.stockAman !== 0 ? String(formData.stockAman) : '')}
              onFocus={(e) => {
                const input = e.target as HTMLInputElement;
                const currentVal = formData.stockAman;
                if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                  setStockAmanInputValue('');
                  input.value = '';
                } else {
                  input.select();
                }
              }}
              onMouseDown={(e) => {
                const input = e.target as HTMLInputElement;
                const currentVal = formData.stockAman;
                if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                  setStockAmanInputValue('');
                  input.value = '';
                }
              }}
              onChange={(e) => {
                let val = e.target.value;
                val = val.replace(/[^\d.,]/g, '');
                const cleaned = removeLeadingZero(val);
                setStockAmanInputValue(cleaned);
                setFormData({ ...formData, stockAman: cleaned === '' ? 0 : Number(cleaned) || 0 });
              }}
              onBlur={(e) => {
                const val = e.target.value;
                if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                  setFormData({ ...formData, stockAman: 0 });
                  setStockAmanInputValue('');
                } else {
                  setFormData({ ...formData, stockAman: Number(val) });
                  setStockAmanInputValue('');
                }
              }}
              onKeyDown={(e) => {
                const input = e.target as HTMLInputElement;
                const currentVal = input.value;
                if ((currentVal === '' || currentVal === '0') && /^[1-9]$/.test(e.key)) {
                  e.preventDefault();
                  const newVal = e.key;
                  setStockAmanInputValue(newVal);
                  input.value = newVal;
                  setFormData({ ...formData, stockAman: Number(newVal) });
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
              Stock Minimum
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={stockMinimumInputValue !== undefined && stockMinimumInputValue !== '' ? stockMinimumInputValue : (formData.stockMinimum !== undefined && formData.stockMinimum !== null && formData.stockMinimum !== 0 ? String(formData.stockMinimum) : '')}
              onFocus={(e) => {
                const input = e.target as HTMLInputElement;
                const currentVal = formData.stockMinimum;
                if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                  setStockMinimumInputValue('');
                  input.value = '';
                } else {
                  input.select();
                }
              }}
              onMouseDown={(e) => {
                const input = e.target as HTMLInputElement;
                const currentVal = formData.stockMinimum;
                if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                  setStockMinimumInputValue('');
                  input.value = '';
                }
              }}
              onChange={(e) => {
                let val = e.target.value;
                val = val.replace(/[^\d.,]/g, '');
                const cleaned = removeLeadingZero(val);
                setStockMinimumInputValue(cleaned);
                setFormData({ ...formData, stockMinimum: cleaned === '' ? 0 : Number(cleaned) || 0 });
              }}
              onBlur={(e) => {
                const val = e.target.value;
                if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                  setFormData({ ...formData, stockMinimum: 0 });
                  setStockMinimumInputValue('');
                } else {
                  setFormData({ ...formData, stockMinimum: Number(val) });
                  setStockMinimumInputValue('');
                }
              }}
              onKeyDown={(e) => {
                const input = e.target as HTMLInputElement;
                const currentVal = input.value;
                if ((currentVal === '' || currentVal === '0') && /^[1-9]$/.test(e.key)) {
                  e.preventDefault();
                  const newVal = e.key;
                  setStockMinimumInputValue(newVal);
                  input.value = newVal;
                  setFormData({ ...formData, stockMinimum: Number(newVal) });
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
          <Input
            label="Kategori"
            value={formData.kategori || ''}
            onChange={(v) => setFormData({ ...formData, kategori: v })}
          />
          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Customer
            </label>
            <input
              type="text"
              value={getCustomerInputDisplayValue()}
              onChange={(e) => {
                handleCustomerInputChange(e.target.value);
              }}
              onFocus={() => setShowCustomerDropdown(true)}
              onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
              placeholder="Type to search customer..."
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
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  zIndex: 10002,
                  maxHeight: '300px',
                  overflowY: 'auto',
                  marginTop: '4px',
                }}
              >
                {filteredCustomers.map(c => (
                  <div
                    key={c.id}
                    onClick={() => {
                      const label = `${c.kode || ''}${c.kode ? ' - ' : ''}${c.nama || ''}`;
                      setCustomerInputValue(label);
                      setCustomerSearch('');
                      setFormData({ ...formData, customer: c.nama });
                      setShowCustomerDropdown(false);
                    }}
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                      fontSize: '13px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ fontWeight: '500' }}>{c.kode || ''}{c.kode ? ' - ' : ''}{c.nama || ''}</div>
                  </div>
              ))}
              </div>
            )}
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Price Satuan
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={priceInputValue !== undefined && priceInputValue !== '' ? priceInputValue : (formData.hargaFg || formData.harga ? String(formData.hargaFg || formData.harga || 0) : '')}
              onFocus={(e) => {
                const input = e.target as HTMLInputElement;
                const currentVal = formData.hargaFg || formData.harga || 0;
                if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                  setPriceInputValue('');
                  input.value = '';
                } else {
                  input.select();
                }
              }}
              onMouseDown={(e) => {
                const input = e.target as HTMLInputElement;
                const currentVal = formData.hargaFg || formData.harga || 0;
                if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                  setPriceInputValue('');
                  input.value = '';
                }
              }}
              onChange={(e) => {
                let val = e.target.value;
                val = val.replace(/[^\d.,]/g, '');
                const cleaned = removeLeadingZero(val);
                setPriceInputValue(cleaned);
                setFormData({ ...formData, hargaFg: cleaned === '' ? 0 : Number(cleaned) || 0 });
              }}
              onBlur={(e) => {
                const val = e.target.value;
                if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                  setFormData({ ...formData, hargaFg: 0 });
                  setPriceInputValue('');
                } else {
                  setFormData({ ...formData, hargaFg: Number(val) });
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
                  setFormData({ ...formData, hargaFg: Number(newVal) });
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
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
            <Button onClick={() => { setShowForm(false); setEditingItem(null); setCustomerInputValue(''); setStockAmanInputValue(''); setStockMinimumInputValue(''); setPriceInputValue(''); setFormData({ kode: '', nama: '', padCode: '', satuan: '', stockAman: 0, stockMinimum: 0, kategori: '', customer: '', hargaFg: 0 }); }} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleSave} variant="primary">
              {editingItem ? 'Update Product' : 'Save Product'}
            </Button>
          </div>
        </Card>
          </div>
        </div>
      )}

      <Card>
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Kode, Nama, Kategori, Customer..."
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
        <Table columns={columns} data={paginatedProducts} emptyMessage={searchQuery ? "No products found matching your search" : "No products data"} />
        
        {/* Pagination Controls */}
        {(totalPages > 1 || filteredProducts.length > 0) && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            gap: '8px', 
            marginTop: '20px',
            padding: '16px',
            borderTop: '1px solid var(--border)'
          }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} products
              {searchQuery && ` (filtered from ${products.length} total)`}
            </div>
            {totalPages > 1 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '8px'
            }}>
            <Button 
              variant="secondary" 
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              First
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div style={{ 
              display: 'flex', 
              gap: '4px',
              alignItems: 'center'
            }}>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'primary' : 'secondary'}
                    onClick={() => setCurrentPage(pageNum)}
                    style={{ minWidth: '40px', padding: '6px 12px' }}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button 
              variant="secondary" 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Last
            </Button>
            <div style={{ marginLeft: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              Page {currentPage} of {totalPages}
            </div>
            </div>
            )}
          </div>
        )}
      </Card>

      {editingBOM && (
        <BOMDialog
          productId={editingBOM.product_id || editingBOM.padCode || editingBOM.kode || ''}
          productName={editingBOM.nama}
          productKode={editingBOM.kode || editingBOM.product_id || editingBOM.padCode || ''}
          onClose={() => setEditingBOM(null)}
          onSave={handleSaveBOM}
        />
      )}

      {/* Custom Dialog - menggunakan hook terpusat */}
      <DialogComponent />
    </div>
  );
};

export default Products;
