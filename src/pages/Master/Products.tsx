import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Input from '../../components/Input';
import BOMDialog from '../../components/BOMDialog';
import { storageService, extractStorageValue } from '../../services/storage';
import { safeDeleteItem, filterActiveItems } from '../../utils/data-persistence-helper';
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
    satuan: '',
    stockAman: 0,
    stockMinimum: 0,
    kategori: '',
    customer: '',
    hargaFg: 0,
  });

  const loadProducts = useCallback(async () => {
    const dataRaw = extractStorageValue(await storageService.get<Product[]>('products'));
    // Filter out deleted items menggunakan helper function
    const data = filterActiveItems(dataRaw);
    const bom = extractStorageValue(await storageService.get<any[]>('bom'));
    
    // Update bomData (simple update, no comparison needed for now)
    setBomData(bom);
    
    // Ensure padCode is always present (even if empty string) for all products
    const productsWithPadCode = data.map((p, idx) => ({ 
      ...p, 
      no: idx + 1,
      padCode: p.padCode !== undefined ? p.padCode : '' // Ensure padCode always exists
    }));
    
    // Update products
    setProducts(productsWithPadCode);
  }, []);

  const loadCustomers = useCallback(async () => {
    const data = await storageService.get<Customer[]>('customers') || [];
    setCustomers(data);
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
      
      console.log(`[Master Products] BOM updated from ${source}:`, customEvent.detail);
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
    
    // Cari sequence number terakhir untuk customer ini
    const existingProducts = products.filter(p => {
      const pid = (p.product_id || '').toString().trim();
      return pid.startsWith(`FG-${customerCode}-`);
    });
    
    // Extract sequence numbers
    const sequences = existingProducts
      .map(p => {
        const pid = (p.product_id || '').toString().trim();
        const match = pid.match(/FG-[A-Z0-9]+-(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => !isNaN(n) && n > 0);
    
    // Get next sequence number
    const nextSequence = sequences.length > 0 ? Math.max(...sequences) + 1 : 1;
    
    // Format: FG-{customerCode}-{5 digit sequence}
    return `FG-${customerCode}-${String(nextSequence).padStart(5, '0')}`;
  }, [customers, products]);

  const hasBOM = (product: Product): boolean => {
    const productId = (product.product_id || product.padCode || product.kode || '').toString().trim();
    if (!productId) return false;
    return bomData.some(b => {
      // Fallback: product_id -> padCode -> kode
      const bomProductId = (b.product_id || b.padCode || b.kode || '').toString().trim();
      return bomProductId === productId;
    });
  };

  // Helper function to check if product has customer and price
  const hasCustomerAndPrice = (product: Product): boolean => {
    const hasCustomer = !!(product.customer || product.supplier);
    const hasPrice = !!(product.hargaFg || product.harga) && 
                     ((product.hargaFg || product.harga || 0) > 0);
    return hasCustomer && hasPrice;
  };

  // Filter products based on search query
  // Ensure products is always an array
  const productsArray = Array.isArray(products) ? products : [];
  const filteredProducts = productsArray
    .filter(product => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        (product.kode || '').toLowerCase().includes(query) ||
        (product.product_id || '').toLowerCase().includes(query) ||
        (product.nama || '').toLowerCase().includes(query) ||
        (product.kategori || '').toLowerCase().includes(query) ||
        (product.customer || product.supplier || '').toLowerCase().includes(query) ||
        (product.padCode || '').toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
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

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSave = async () => {
    try {
      // Extract padCode explicitly to ensure it's not lost
      const padCodeValue = (formData.padCode || '').trim();
      
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
              kode: formData.kode !== undefined && formData.kode !== null ? String(formData.kode).trim() : (p.kode || ''),
              nama: formData.nama !== undefined && formData.nama !== null ? String(formData.nama).trim() : (p.nama || ''),
              padCode: padCodeValue, // Always set padCode explicitly
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
          kode: formData.kode || '',
          nama: formData.nama || '',
          padCode: padCodeValue, // Explicitly set padCode
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
      setFormData({ kode: '', nama: '', padCode: '', satuan: '', stockAman: 0, stockMinimum: 0, kategori: '', customer: '', hargaFg: 0 });
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
    showConfirm(
      `Are you sure you want to delete product "${item.nama}"? This action cannot be undone.`,
      async () => {
        try {
          // Pakai helper function untuk safe delete (tombstone pattern)
          const success = await safeDeleteItem('products', item.id, 'id');
          
          if (success) {
            // Reload data dengan filter active items
            const dataRaw = extractStorageValue(await storageService.get<Product[]>('products'));
            const data = filterActiveItems(dataRaw);
            setProducts(data.map((p, idx) => ({ ...p, no: idx + 1 })));
            showAlert(`Product "${item.nama}" deleted successfully`, 'Success');
          } else {
            showAlert(`Error deleting product. Silakan coba lagi.`, 'Error');
          }
        } catch (error: any) {
          showAlert(`Error deleting product: ${error.message}`, 'Error');
        }
      },
      undefined,
      'Confirm Delete'
    );
  };

  // Download Template Excel
  const handleDownloadTemplate = () => {
    try {
      const templateData = [
        { 'Kode': 'PRD-001', 'Nama': 'Product Example 1', 'Pad Code': 'PAD001', 'Satuan': 'PCS', 'Kategori': 'Product', 'Customer': 'Customer A', 'Stock Aman': '100', 'Stock Minimum': '50', 'Harga FG': '50000' },
        { 'Kode': 'PRD-002', 'Nama': 'Product Example 2', 'Pad Code': 'PAD002', 'Satuan': 'BOX', 'Kategori': 'Product', 'Customer': 'Customer B', 'Stock Aman': '200', 'Stock Minimum': '100', 'Harga FG': '75000' },
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
    const exampleHeaders = ['Kode', 'Nama', 'Pad Code', 'Satuan', 'Kategori', 'Customer', 'Stock Aman', 'Stock Minimum', 'Harga FG'];
    const exampleData = [
      { 'Kode': 'PRD-001', 'Nama': 'Product Example 1', 'Satuan': 'PCS', 'Kategori': 'Product', 'Customer': 'Customer A', 'Stock Aman': '100', 'Stock Minimum': '50', 'Harga FG': '50000' },
      { 'Kode': 'PRD-002', 'Nama': 'Product Example 2', 'Satuan': 'BOX', 'Kategori': 'Product', 'Customer': 'Customer B', 'Stock Aman': '200', 'Stock Minimum': '100', 'Harga FG': '75000' },
    ];
    
    const showPreviewDialog = () => {
      showConfirm(
        `📋 Format Excel untuk Import Products\n\nPastikan file Excel Anda memiliki header berikut:\n\n${exampleHeaders.join(' | ')}\n\nContoh data:\n${exampleData.map((row, idx) => `${idx + 1}. ${exampleHeaders.map(h => String(row[h as keyof typeof row] || '')).join(' | ')}`).join('\n')}\n\n⚠️ Catatan:\n- Header harus ada di baris pertama\n- Kode dan Nama wajib diisi\n- Header bisa menggunakan variasi: Kode/Code/SKU, Nama/Name, Satuan/Unit/UOM, dll\n\nKlik "Download Template" untuk mendapatkan file Excel template, atau "Lanjutkan" untuk memilih file Excel yang sudah Anda siapkan.`,
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

        // Auto-map columns (case-insensitive)
        const mapColumn = (row: any, possibleNames: string[]): string => {
          for (const name of possibleNames) {
            const keys = Object.keys(row);
            const found = keys.find(k => k.toLowerCase() === name.toLowerCase());
            if (found && row[found]) return String(row[found]).trim();
          }
          return '';
        };

        const newProducts: Product[] = [];
        const errors: string[] = [];

        jsonData.forEach((row, index) => {
          try {
            const kode = mapColumn(row, ['Kode', 'KODE', 'Code', 'CODE', 'SKU', 'sku', 'Product Code', 'product_code']);
            const nama = mapColumn(row, ['Nama', 'NAMA', 'Name', 'NAME', 'Product Name', 'product_name']);
            const padCode = mapColumn(row, ['Pad Code', 'PAD CODE', 'PadCode', 'pad_code', 'PAD', 'pad']);
            const satuan = mapColumn(row, ['Satuan', 'SATUAN', 'Unit', 'UNIT', 'UOM', 'uom']);
            const kategori = mapColumn(row, ['Kategori', 'KATEGORI', 'Category', 'CATEGORY']);
            const customer = mapColumn(row, ['Customer', 'CUSTOMER', 'Customer Name', 'customer_name']);
            const stockAmanStr = mapColumn(row, ['Stock Aman', 'STOCK AMAN', 'Safe Stock', 'safe_stock']);
            const stockMinimumStr = mapColumn(row, ['Stock Minimum', 'STOCK MINIMUM', 'Min Stock', 'min_stock']);
            const hargaFgStr = mapColumn(row, ['Harga FG', 'HARGA FG', 'Price', 'PRICE', 'Selling Price', 'selling_price']);

            // Skip empty rows
            if (!kode && !nama) {
              return;
            }

            if (!kode || !nama) {
              errors.push(`Row ${index + 2}: Kode and Nama are required`);
              return;
            }

            // Check if product already exists (by kode)
            const existingIndex = products.findIndex(p => 
              p.kode.toLowerCase() === kode.toLowerCase()
            );

            const stockAman = parseFloat(stockAmanStr) || 0;
            const stockMinimum = parseFloat(stockMinimumStr) || 0;
            const hargaFg = parseFloat(hargaFgStr) || 0;

            if (existingIndex >= 0) {
              // Update existing product
              const existing = products[existingIndex];
              newProducts.push({
                ...existing,
                kode,
                nama,
                padCode: padCode || existing.padCode || '',
                satuan: satuan || existing.satuan || 'PCS',
                kategori: kategori || existing.kategori || '',
                customer: customer || existing.customer || '',
                stockAman,
                stockMinimum,
                hargaFg,
                lastUpdate: new Date().toISOString(),
                userUpdate: 'System',
                ipAddress: '127.0.0.1',
              });
            } else {
              // Create new product
              newProducts.push({
                id: Date.now().toString() + index,
                no: products.length + newProducts.length + 1,
                kode,
                nama,
                padCode: padCode || '',
                satuan: satuan || 'PCS',
                kategori: kategori || '',
                customer: customer || '',
                stockAman,
                stockMinimum,
                hargaFg,
                lastUpdate: new Date().toISOString(),
                userUpdate: 'System',
                ipAddress: '127.0.0.1',
              } as Product);
            }
          } catch (error: any) {
            errors.push(`Row ${index + 2}: ${error.message}`);
          }
        });

        if (newProducts.length === 0) {
          showAlert('No valid data found in Excel file', 'Error');
          return;
        }

        const importProducts = async () => {
          // Merge with existing products (update existing, add new)
          const updatedProducts = [...products];
          newProducts.forEach(newProduct => {
            const existingIndex = updatedProducts.findIndex(p => p.kode.toLowerCase() === newProduct.kode.toLowerCase());
            if (existingIndex >= 0) {
              updatedProducts[existingIndex] = newProduct;
            } else {
              updatedProducts.push(newProduct);
            }
          });

          // Re-number products
          const renumbered = updatedProducts.map((p, idx) => ({ ...p, no: idx + 1 }));

          await storageService.set('products', renumbered);
          setProducts(renumbered);

          if (errors.length > 0) {
            showAlert(`Imported ${newProducts.length} products, but ${errors.length} errors occurred.\n\nFirst few errors:\n${errors.slice(0, 5).join('\n')}`, 'Import Completed');
          } else {
            showAlert(`✅ Successfully imported ${newProducts.length} products`, 'Success');
          }
        };

        showConfirm(
          `Import ${newProducts.length} products from Excel?${errors.length > 0 ? `\n\n${errors.length} errors occurred.` : ''}`,
          importProducts,
          undefined,
          'Confirm Import'
        );
      } catch (error: any) {
        showAlert(`Error importing Excel: ${error.message}\n\nMake sure the file is a valid Excel file (.xlsx or .xls)`, 'Error');
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

  const handleExportExcel = () => {
    try {
      const dataToExport = filteredProducts.map(product => ({
        'No': product.no,
        'Kode': product.kode,
        'Nama': product.nama,
        'Pad Code': product.padCode || '',
        'Satuan': product.satuan,
        'Kategori': product.kategori,
        'Customer': product.customer || '',
        'Stock Aman': product.stockAman || 0,
        'Stock Minimum': product.stockMinimum || 0,
        'Harga FG': product.hargaFg || 0,
        'Last Update': product.lastUpdate ? new Date(product.lastUpdate).toLocaleString('id-ID') : '',
      }));

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
      const filteredBOM = existingBOM.filter(b => {
        // Fallback: product_id -> padCode -> kode
        const bomProductId = (b.product_id || b.padCode || b.kode || '').toString().trim();
        return bomProductId !== productId;
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
    { key: 'kode', header: 'Kode (SKU/ID)' },
    { key: 'nama', header: 'Nama' },
    { key: 'padCode', header: 'Pad Code' },
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
          <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
          <Button variant="secondary" onClick={handleDownloadTemplate}>📋 Download Template</Button>
          <Button variant="primary" onClick={handleImportExcel}>📤 Import Excel</Button>
          <Button onClick={() => { 
            if (showForm) {
              setCustomerInputValue('');
              setStockAmanInputValue('');
              setStockMinimumInputValue('');
              setPriceInputValue('');
              setFormData({ kode: '', nama: '', padCode: '', satuan: '', stockAman: 0, stockMinimum: 0, kategori: '', customer: '', hargaFg: 0 });
              setEditingItem(null);
            }
            setShowForm(!showForm);
          }}>
            {showForm ? 'Cancel' : '+ Add Product'}
          </Button>
        </div>
      </div>


      {showForm && (
        <Card title={editingItem ? "Edit Product" : "Add New Product"} className="mb-4">
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
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Customer
            </label>
            <input
              type="text"
              list={`customer-list-${editingItem?.id || 'new'}`}
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
            <datalist id={`customer-list-${editingItem?.id || 'new'}`}>
              {customers.map(c => (
                <option key={c.id} value={`${c.kode} - ${c.nama}`}>
                  {c.kode} - {c.nama}
                </option>
              ))}
            </datalist>
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
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <Button onClick={() => { setShowForm(false); setEditingItem(null); setCustomerInputValue(''); setStockAmanInputValue(''); setStockMinimumInputValue(''); setPriceInputValue(''); setFormData({ kode: '', nama: '', satuan: '', stockAman: 0, stockMinimum: 0, kategori: '', customer: '', hargaFg: 0 }); }} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleSave} variant="primary">
              {editingItem ? 'Update Product' : 'Save Product'}
            </Button>
          </div>
        </Card>
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
