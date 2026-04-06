import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Input from '../../components/Input';
import BOMDialog from '../../components/BOMDialog';
import { storageService, extractStorageValue, StorageKeys } from '../../services/storage';
import { filterActiveItems } from '../../utils/data-persistence-helper';
import { useDialog } from '../../hooks/useDialog';
import { useToast } from '../../hooks/useToast';
import { useLanguage } from '../../hooks/useLanguage';
import BlobService from '../../services/blob-service';
import * as XLSX from 'xlsx';
import '../../styles/common.css';
import '../../styles/toast.css';
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
  hargaBeli?: number; // Harga Beli (Purchase Price)
  bom?: any[];
  padCode?: string; // PAD Code untuk product
  kodeIpos?: string; // Kode Ipos untuk product (khusus packaging)
  productImageId?: string; // MinIO fileId (not base64)
}

interface Customer {
  id: string;
  kode: string;
  nama: string;
}

const Products = () => {
  const { t } = useLanguage();
  const { showToast, ToastContainer } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [bomData, setBomData] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [editingBOM, setEditingBOM] = useState<Product | null>(null);
  const isSavingBOMRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [customerInputValue, setCustomerInputValue] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [previewImageId, setPreviewImageId] = useState<string | null>(null);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [previewPdfId, setPreviewPdfId] = useState<string | null>(null);

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
    kategori: 'Product',
    customer: '',
    hargaFg: 0,
    hargaBeli: 0,
  });

  const loadProducts = useCallback(async () => {
    const dataRaw = extractStorageValue(await storageService.get<Product[]>('products'));
    // Filter out deleted items menggunakan helper function
    const data = filterActiveItems(dataRaw);
    const bom = extractStorageValue(await storageService.get<any[]>('bom'));
    
    // Update bomData (simple update, no comparison needed for now)
    setBomData(bom);
    
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

  // Optimize: Create Set untuk fast BOM lookup (O(1) instead of O(n))
  const bomProductIdsSet = useMemo(() => {
    const bomDataArray = Array.isArray(bomData) ? bomData : [];
    const ids = new Set<string>();
    
    bomDataArray.forEach(b => {
      const bomProductId = String(b.product_id || '').trim().toLowerCase();
      if (bomProductId) {
        ids.add(bomProductId);
      }
    });
    
    return ids;
  }, [bomData]);

  // Optimize: Memoized hasBOM function dengan Set lookup (O(1))
  const hasBOM = useCallback((product: Product): boolean => {
    const productId = (product.product_id || '').toString().trim().toLowerCase();
    return bomProductIdsSet.has(productId);
  }, [bomProductIdsSet]);

  // Filter products based on search query - MEMOIZED untuk performance
  const filteredProducts = useMemo(() => {
    const productsArray = Array.isArray(products) ? products : [];
    
    // Filter first
    const filtered = productsArray.filter(product => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase().trim();
      
      return (
        (product.kode || '').toLowerCase().includes(query) ||
        (product.product_id || '').toLowerCase().includes(query) ||
        (product.nama || '').toLowerCase().includes(query) ||
        (product.kategori || '').toLowerCase().includes(query) ||
        (product.customer || product.supplier || '').toLowerCase().includes(query) ||
        (product.padCode || '').toLowerCase().includes(query) ||
        (product.kodeIpos || '').toLowerCase().includes(query)
      );
    });
    
    // Sort: Products with BOM first, then by kode
    return filtered.sort((a, b) => {
      const aHasBOM = hasBOM(a);
      const bHasBOM = hasBOM(b);
      
      // Products with BOM come first
      if (aHasBOM && !bHasBOM) return -1;
      if (!aHasBOM && bHasBOM) return 1;
      
      // Same BOM status, sort by kode
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

  // Handle product image upload
  const handleImageUpload = async (file: File) => {
    try {
      // Validate file - allow images and PDFs
      const validation = BlobService.validateFile(file, 50, ['image/*', 'application/pdf']);
      if (!validation.valid) {
        showAlert(validation.error || 'Invalid file', 'Error');
        return;
      }

      // Upload to MinIO
      const result = await BlobService.uploadFile(file, 'packaging');
      
      // Store only fileId (not base64)
      setProductImage(result.fileId);
      setFormData({ ...formData, productImageId: result.fileId });
      showToast('File uploaded', 'success');
    } catch (error: any) {
      showAlert(`Error uploading file: ${error.message}`, 'Error');
    }
  };

  const handleImageRemove = async () => {
    // Optimistic delete - remove UI immediately
    const fileIdToDelete = productImage;
    setProductImage(null);
    setFormData({ ...formData, productImageId: undefined });
    
    // Delete from server in background (don't wait)
    if (fileIdToDelete) {
      BlobService.deleteFile(fileIdToDelete, 'packaging').catch(() => {
        // Ignore background delete errors
      });
    }
  };

  const handleSave = async () => {
    try {
      const padCodeValue = (formData.padCode || '').trim();
      const kodeIposValue = (formData.kodeIpos || '').trim();
      
      if (editingItem) {
        const updated = products.map(p => {
          if (p.id === editingItem.id) {
            const newKode = formData.kode !== undefined && formData.kode !== null ? String(formData.kode).trim() : (p.kode || '');
            
            const updatedProduct: Product = {
              id: editingItem.id,
              no: editingItem.no,
              kode: newKode,
              nama: formData.nama !== undefined && formData.nama !== null ? String(formData.nama).trim() : (p.nama || ''),
              padCode: padCodeValue,
              kodeIpos: kodeIposValue,
              satuan: formData.satuan !== undefined && formData.satuan !== null ? String(formData.satuan).trim() : (p.satuan || ''),
              stockAman: formData.stockAman !== undefined ? Number(formData.stockAman) : (p.stockAman || 0),
              stockMinimum: formData.stockMinimum !== undefined ? Number(formData.stockMinimum) : (p.stockMinimum || 0),
              kategori: formData.kategori !== undefined && formData.kategori !== null ? String(formData.kategori).trim() : (p.kategori || ''),
              customer: formData.customer !== undefined && formData.customer !== null ? String(formData.customer).trim() : (p.customer || ''),
              supplier: formData.supplier !== undefined && formData.supplier !== null ? String(formData.supplier).trim() : (p.supplier || ''),
              hargaFg: formData.hargaFg !== undefined ? Number(formData.hargaFg) : (p.hargaFg || 0),
              hargaBeli: formData.hargaBeli !== undefined ? Number(formData.hargaBeli) : (p.hargaBeli || 0),
              harga: formData.harga !== undefined ? Number(formData.harga) : (p.harga || 0),
              bom: formData.bom !== undefined ? formData.bom : (p.bom || []),
              productImageId: formData.productImageId || p.productImageId,
              product_id: newKode || p.product_id,
              lastUpdate: new Date().toISOString(), 
              userUpdate: 'System', 
              ipAddress: '127.0.0.1' 
            };
            return updatedProduct;
          }
          return p;
        });
        
        await storageService.set(StorageKeys.PACKAGING.PRODUCTS, updated);
        setProducts(updated.map((p, idx) => ({ ...p, no: idx + 1 })));
        showToast(`Product "${formData.nama}" updated`, 'success');
      } else {
        // Simple: gunakan apa yang user input, tanpa generate logic
        const newProduct: Product = {
          id: Date.now().toString(),
          no: 1,
          kode: (formData.kode || '').trim(),
          nama: formData.nama || '',
          padCode: padCodeValue,
          kodeIpos: kodeIposValue,
          satuan: formData.satuan || '',
          stockAman: formData.stockAman || 0,
          stockMinimum: formData.stockMinimum || 0,
          kategori: formData.kategori || 'Product',
          customer: formData.customer || '',
          supplier: formData.supplier,
          hargaFg: formData.hargaFg || 0,
          hargaBeli: formData.hargaBeli || 0,
          harga: formData.harga,
          bom: formData.bom,
          productImageId: formData.productImageId,
          product_id: (formData.kode || '').trim() || undefined,
          lastUpdate: new Date().toISOString(),
          userUpdate: 'System',
          ipAddress: '127.0.0.1',
        } as Product;
        // Add new product at the beginning (index 0)
        const updated = [newProduct, ...products];
        await storageService.set(StorageKeys.PACKAGING.PRODUCTS, updated);
        setProducts(updated.map((p, idx) => ({ ...p, no: idx + 1 })));
        showToast(`Product "${formData.nama}" created`, 'success');
      }
      setShowForm(false);
      setEditingItem(null);
      setCustomerInputValue('');
      setFormData({ kode: '', nama: '', padCode: '', kodeIpos: '', satuan: '', stockAman: 0, stockMinimum: 0, kategori: 'Product', customer: '', hargaFg: 0, hargaBeli: 0 });
    } catch (error: any) {
      showAlert(`❌ Error saving product: ${error.message}`, 'Error');
    }
  };

  const resetFormState = () => {
    setShowForm(false);
    setEditingItem(null);
    setCustomerInputValue('');
    setProductImage(null);
    setFormData({ kode: '', nama: '', padCode: '', satuan: '', stockAman: 0, stockMinimum: 0, kategori: 'Product', customer: '', hargaFg: 0, hargaBeli: 0 });
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
    setProductImage(item.productImageId || null);
    setFormData({
      ...item,
      customer: item.customer || item.supplier || '',
      padCode: item.padCode || '',
      productImageId: item.productImageId,
    });
    setShowForm(true);
  };

  const handleDelete = async (item: Product) => {
    try {
      // Validate item.id exists
      if (!item.id) {
        showAlert(`❌ Error: Product "${item.nama}" tidak memiliki ID. Tidak bisa dihapus.`, 'Error');
        return;
      }
      
      showConfirm(
        `Delete Product: ${item.nama}?

This action cannot be undone.`,
        async () => {
          try {
            // Delete langsung dari array
            const updatedProducts = products.filter(p => p.id !== item.id);
            
            // Save ke storage
            await storageService.set(StorageKeys.PACKAGING.PRODUCTS, updatedProducts);
            
            // Update state dengan re-numbering
            setProducts(updatedProducts.map((p, idx) => ({ ...p, no: idx + 1 })));
            showToast(`Product "${item.nama}" deleted`, 'success');
          } catch (error: any) {
            showAlert(`❌ Error deleting product: ${error.message}`, 'Error');
          }
        },
        () => {
          // Delete cancelled
        },
        'Delete Confirmation'
      );
    } catch (error: any) {
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
              showAlert('No duplicates found. Data is clean!', 'Info');
              return;
            }

            // Re-number products
            const renumbered = deduplicated.map((p, idx) => ({ ...p, no: idx + 1 }));

            // Save to storage
            await storageService.set(StorageKeys.PACKAGING.PRODUCTS, renumbered);
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
          input.accept = '.xlsx,.xls,.ods,.csv';
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
            const userUpdate = mapColumn(row, ['User Update', 'USER UPDATE', 'Updated By', 'updated_by']);
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

          // Extract BOM data dari products dan merge dengan existing BOM
          const existingBOM = extractStorageValue(await storageService.get<any[]>('bom')) || [];
          const bomMap = new Map<string, any>();
          
          // Build map dari existing BOM untuk deduplication
          existingBOM.forEach(bom => {
            const key = `${(bom.product_id || '').toLowerCase()}:${(bom.material_id || '').toLowerCase()}`;
            bomMap.set(key, bom);
          });
          
          // Extract BOM dari imported products
          const newBOMItems: any[] = [];
          renumbered.forEach(product => {
            if (product.bom && Array.isArray(product.bom) && product.bom.length > 0) {
              const productId = (product.kode || product.product_id || '').toString().trim();
              product.bom.forEach((bomItem: any) => {
                const materialId = (bomItem.material_id || bomItem.materialId || '').toString().trim();
                if (materialId && productId) {
                  const key = `${productId.toLowerCase()}:${materialId.toLowerCase()}`;
                  
                  // Hanya add jika belum ada di map (deduplication)
                  if (!bomMap.has(key)) {
                    const newBOM = {
                      id: `bom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                      product_id: productId,
                      material_id: materialId,
                      material_name: bomItem.material_name || '',
                      ratio: bomItem.ratio || 1,
                      lastUpdate: new Date().toISOString(),
                    };
                    newBOMItems.push(newBOM);
                    bomMap.set(key, newBOM);
                  }
                }
              });
            }
          });
          
          // Merge BOM: existing + new
          const mergedBOM = Array.from(bomMap.values());
          
          // Save dengan async untuk non-blocking
          await storageService.set(StorageKeys.PACKAGING.PRODUCTS, renumbered);
          
          // Save BOM jika ada yang baru
          if (newBOMItems.length > 0) {
            await storageService.set(StorageKeys.PACKAGING.BOM, mergedBOM);
          }
          
          // Update state di next tick untuk avoid blocking
          setTimeout(() => {
            setProducts(renumbered);
            setBomData(mergedBOM);
          }, 0);

          // Sync ke server di background (non-blocking)
          const syncToServer = async () => {
            try {
              const storageConfig = JSON.parse(localStorage.getItem(StorageKeys.SHARED.STORAGE_CONFIG) || '{"type":"local"}');
              if (storageConfig.type === 'server' && storageConfig.serverUrl) {
                await storageService.syncToServer();
              }
            } catch (syncError) {
              // Ignore sync error - tidak block import
            }
          };
          syncToServer().catch(() => {}); // Fire and forget

          if (errors.length > 0) {
            showAlert(`⚠️ Imported ${newProducts.length} products with ${errors.length} errors`, 'Info');
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
        // Jika product_id kosong, gunakan kode atau padCode yang ada
        productId = (currentEditingBOM.kode || currentEditingBOM.padCode || currentEditingBOM.product_id || '').trim();
        
        if (!productId) {
          showAlert('Product ID tidak ditemukan. Silakan isi kode product terlebih dahulu.', 'Error');
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
      await storageService.set(StorageKeys.PACKAGING.BOM, updatedBOM);
      // storageService.set() akan trigger 'app-storage-changed' event
      // Event listener akan skip reload karena isSavingBOMRef.current = true
      
      // Close dialog setelah save
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
      showAlert(`Error saving BOM: ${error.message}`, 'Error');
      setEditingBOM(null);
      isSavingBOMRef.current = false;
    }
  }, [showAlert, loadProducts, products]);

  const columns = useMemo(() => [
    { 
      key: 'bomIndicator', 
      header: 'BOM',
      width: '50px',
      render: (item: Product) => {
        const hasBom = hasBOM(item);
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
      header: t('common.number') || 'No.',
      width: '50px',
      hidden: true,
      render: (item: Product) => item.no,
    },
    { key: 'product_id', header: t('master.productCode') || 'Kode (SKU/ID)', width: '120px' },
    { key: 'nama', header: t('master.productName') || 'Nama', width: '200px' },
    { key: 'padCode', header: 'Pad Code', width: '100px' },
    { key: 'satuan', header: t('master.unit') || 'Satuan (Unit)', width: '80px' },
    { key: 'kategori', header: t('master.category') || 'Kategori', width: '100px' },
    { 
      key: 'customer', 
      header: t('master.customerName') || 'Customer',
      width: '120px',
      render: (item: Product) => {
        return item.customer || item.supplier || '-';
      },
    },
    { 
      key: 'lastUpdate', 
      header: t('common.updatedAt') || 'Last Update',
      width: '160px',
      render: (item: Product) => formatDateTime(item.lastUpdate)
    },
    { key: 'userUpdate', header: t('common.updatedBy') || 'User Update', width: '100px' },
    { 
      key: 'hargaFg', 
      header: t('master.price') || 'Harga Satuan',
      width: '130px',
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
      key: 'hargaBeli', 
      header: 'Harga Beli',
      width: '130px',
      render: (item: Product) => {
        const hargaBeli = item.hargaBeli || 0;
        return hargaBeli > 0 ? new Intl.NumberFormat('id-ID', { 
          style: 'currency', 
          currency: 'IDR',
          minimumFractionDigits: 0 
        }).format(hargaBeli) : '-';
      },
    },
    {
      key: 'actions',
      header: t('common.actions') || 'Actions',
      width: '280px',
      render: (item: Product) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          {item.productImageId && (
            <Button 
              variant="secondary" 
              onClick={async () => {
                // Try to get metadata to determine file type
                try {
                  const metadata = await BlobService.getMetadata(item.productImageId!);
                  if (metadata.mime_type === 'application/pdf') {
                    setPreviewPdfId(item.productImageId!);
                  } else {
                    setPreviewImageId(item.productImageId!);
                  }
                } catch (error) {
                  // Fallback: assume it's an image
                  setPreviewImageId(item.productImageId!);
                }
              }}
              style={{ fontSize: '12px', padding: '4px 8px' }}
            >
              📷 View
            </Button>
          )}
          <Button variant="secondary" onClick={() => handleEdit(item)}>{t('common.edit') || 'Edit'}</Button>
          <Button variant="primary" onClick={() => handleEditBOM(item)}>Edit BOM</Button>
          <Button variant="danger" onClick={() => handleDelete(item)}>{t('common.delete') || 'Delete'}</Button>
        </div>
      ),
    },
  ], [t, hasBOM, formatDateTime]);

  return (
    <div className="master-compact">
      <div className="page-header">
        <h1>{t('master.products') || 'Master Produk'}</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={handleCleanupDuplicates}>🧹 Clean Duplicates</Button>
          <Button variant="secondary" onClick={handleExportExcel}>📥 Export</Button>
          <Button variant="secondary" onClick={handleDownloadTemplate}>📋 Template</Button>
          <Button variant="primary" onClick={handleImportExcel}>📤 Import</Button>
          <Button onClick={() => { 
              setCustomerInputValue('');
              setFormData({ kode: '', nama: '', padCode: '', kodeIpos: '', satuan: '', stockAman: 0, stockMinimum: 0, kategori: 'Product', customer: '', hargaFg: 0 });
              setEditingItem(null);
            setShowForm(true);
          }}>
            + Add Product
          </Button>
        </div>
      </div>


      {showForm && (
        <div className="dialog-overlay" onClick={() => resetFormState()} style={{ zIndex: 10000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px', width: '90%', maxHeight: '90vh', overflowY: 'auto', zIndex: 10001, borderRadius: '10px' }}>
            <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '14px 18px', borderRadius: '10px 10px 0 0', color: 'white' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                {editingItem ? '✏️ Edit Product' : '➕ Add Product'}
              </h2>
            </div>

            <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '0 0 10px 10px' }}>
              {/* Basic Information Section */}
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '8px' }}>📋 Basic</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <Input label="Code" value={formData.kode || ''} onChange={(v) => setFormData({ ...formData, kode: v })} placeholder="SKU" />
                  <Input label="Name" value={formData.nama || ''} onChange={(v) => setFormData({ ...formData, nama: v })} placeholder="Product name" />
                  <Input label="Pad Code" value={formData.padCode || ''} onChange={(v) => setFormData({ ...formData, padCode: v })} placeholder="PAD" />
                  <Input label="Unit" value={formData.satuan || ''} onChange={(v) => setFormData({ ...formData, satuan: v })} placeholder="PCS/KG" />
                </div>
              </div>

              {/* Stock Information Section */}
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '8px' }}>📦 Stock</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <Input label="Safe" type="number" value={String(formData.stockAman || 0)} onChange={(v) => setFormData({ ...formData, stockAman: parseInt(v) || 0 })} placeholder="0" />
                  <Input label="Minimum" type="number" value={String(formData.stockMinimum || 0)} onChange={(v) => setFormData({ ...formData, stockMinimum: parseInt(v) || 0 })} placeholder="0" />
                  <Input label="Category" value={formData.kategori || 'Product'} onChange={(v) => setFormData({ ...formData, kategori: v })} placeholder="Product" />
                </div>
              </div>

              {/* Customer & Pricing Section */}
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '8px' }}>💰 Pricing</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', marginBottom: '4px', color: 'var(--text-primary)', fontWeight: '500', fontSize: '12px' }}>Customer</label>
                    <input
                      type="text"
                      value={getCustomerInputDisplayValue()}
                      onChange={(e) => handleCustomerInputChange(e.target.value)}
                      onFocus={() => setShowCustomerDropdown(true)}
                      onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                      placeholder="Search..."
                      style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border)', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '12px', transition: 'all 0.2s' }}
                    />
                    {showCustomerDropdown && filteredCustomers.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 10002, maxHeight: '180px', overflowY: 'auto', marginTop: '2px' }}>
                        {filteredCustomers.map(c => (
                          <div key={c.id} onClick={() => { const label = `${c.kode || ''}${c.kode ? ' - ' : ''}${c.nama || ''}`; setCustomerInputValue(label); setCustomerSearch(''); setFormData({ ...formData, customer: c.nama, padCode: c.kode }); setShowCustomerDropdown(false); }} style={{ padding: '6px 8px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '11px', transition: 'background 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--hover-bg)'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                            <div style={{ fontWeight: '500' }}>{c.kode}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{c.nama}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Input label="Price (FG)" type="number" value={String(formData.hargaFg || 0)} onChange={(v) => setFormData({ ...formData, hargaFg: parseInt(v) || 0 })} placeholder="0" />
                  <Input label="Cost" type="number" value={String(formData.hargaBeli || 0)} onChange={(v) => setFormData({ ...formData, hargaBeli: parseInt(v) || 0 })} placeholder="0" />
                </div>
              </div>

              {/* Product Photo Section */}
              <div style={{ marginBottom: '12px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '8px' }}>📸 Photo</h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    {productImage && (
                      <div style={{ marginBottom: '6px', position: 'relative', display: 'inline-block' }}>
                        <img src={BlobService.getDownloadUrl(productImage, 'packaging')} alt="Product" style={{ maxWidth: '100px', maxHeight: '100px', borderRadius: '6px', border: '1px solid var(--border)' }} />
                        <Button variant="danger" onClick={handleImageRemove} style={{ position: 'absolute', top: '2px', right: '2px', padding: '2px 4px', fontSize: '10px' }}>✕</Button>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file); }}
                      style={{ display: 'none' }}
                      id="product-image-input"
                    />
                    <label htmlFor="product-image-input" style={{ display: 'inline-block', padding: '6px 12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', fontSize: '12px', transition: 'transform 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}>
                      📤 Choose
                    </label>
                    <p style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', margin: '4px 0 0 0' }}>Max 2MB</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                <Button onClick={resetFormState} variant="secondary" style={{ minWidth: '80px', padding: '6px 12px', fontSize: '12px' }}>
                  Cancel
                </Button>
                <Button onClick={handleSave} variant="primary" style={{ minWidth: '80px', padding: '6px 12px', fontSize: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  {editingItem ? 'Update' : 'Save'}
                </Button>
              </div>
            </div>
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
        <Table columns={columns} data={paginatedProducts} showPagination={false} emptyMessage={searchQuery ? "Tidak ada produk yang cocok dengan pencarian" : "Tidak ada data produk"} />
        
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

      {/* Image Preview Modal */}
      {previewImageId && (
        <div className="dialog-overlay" onClick={() => setPreviewImageId(null)} style={{ zIndex: 10000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', zIndex: 10001 }}>
            <Card title="Product Image Preview" className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <img 
                  src={BlobService.getDownloadUrl(previewImageId, 'packaging')} 
                  alt="Product preview"
                  style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '4px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
                <Button onClick={() => setPreviewImageId(null)} variant="secondary">
                  Close
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {previewPdfId && (
        <div className="dialog-overlay" onClick={() => setPreviewPdfId(null)} style={{ zIndex: 10000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%', zIndex: 10001 }}>
            <Card title="PDF File" className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '64px' }}>📄</div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '16px', fontWeight: 'bold' }}>PDF Ready to Download</p>
                  <p style={{ fontSize: '12px', color: '#666' }}>Click the button below to download and view</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
                <Button onClick={() => BlobService.downloadFile(previewPdfId, 'document.pdf', 'packaging')} variant="primary">
                  📥 Download PDF
                </Button>
                <Button onClick={() => setPreviewPdfId(null)} variant="secondary">
                  Close
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Custom Dialog - menggunakan hook terpusat */}
      <DialogComponent />
      
      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
};

export default Products;
