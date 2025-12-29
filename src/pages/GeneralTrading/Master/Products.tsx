import { useState, useEffect, useCallback } from 'react';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { storageService } from '../../../services/storage';
import { useDialog } from '../../../hooks/useDialog';
import * as XLSX from 'xlsx';
import '../../../styles/common.css';
import '../../../styles/compact.css';

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
  harga?: number; // Harga beli
  hargaSales?: number; // Harga jual
  hargaFg?: number; // Harga jual (alias untuk hargaSales)
  parentProductId?: string; // ID product parent (untuk product turunan)
  isTurunan?: boolean; // Flag apakah ini product turunan
}

interface Customer {
  id: string;
  kode: string;
  nama: string;
}

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  // Custom Dialog - menggunakan hook terpusat
  const { showAlert, showConfirm, closeDialog, DialogComponent } = useDialog();


  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [customerInputValue, setCustomerInputValue] = useState('');
  const [stockAmanInputValue, setStockAmanInputValue] = useState('');
  const [stockMinimumInputValue, setStockMinimumInputValue] = useState('');
  const [hargaBeliInputValue, setHargaBeliInputValue] = useState('');
  const [hargaJualInputValue, setHargaJualInputValue] = useState('');
  
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
    satuan: '',
    stockAman: 0,
    stockMinimum: 0,
    kategori: '',
    customer: '',
    harga: 0, // Harga beli
    hargaSales: 0, // Harga jual
    hargaFg: 0, // Alias untuk hargaSales (backward compatibility)
  });

  const loadProducts = useCallback(async () => {
    const data = await storageService.get<Product[]>('gt_products') || [];
    setProducts(data.map((p, idx) => ({ ...p, no: idx + 1 })));
  }, []);

  const loadCustomers = useCallback(async () => {
    const data = await storageService.get<Customer[]>('gt_customers') || [];
    setCustomers(data);
  }, []);

  useEffect(() => {
    loadProducts();
    loadCustomers();
  }, [loadProducts, loadCustomers]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Debounce untuk mencegah multiple calls
    let timeoutId: NodeJS.Timeout | null = null;

    const handleStorageChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ key?: string }>;
      const changedKey = customEvent.detail?.key || '';
      const normalizedKey = changedKey.split('/').pop();

      if (normalizedKey === 'gt_products') {
        // Debounce: hanya reload setelah 100ms tanpa event baru
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          loadProducts();
        }, 100);
      }
    };

    window.addEventListener('app-storage-changed', handleStorageChange as EventListener, { passive: true });
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener('app-storage-changed', handleStorageChange as EventListener);
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



  // Helper function to check if product has complete price (harga beli AND harga jual)
  const hasCompletePrice = (product: Product): boolean => {
    const hasHargaBeli = !!(product.harga && product.harga > 0);
    const hasHargaJual = !!(product.hargaSales || product.hargaFg) && 
                         ((product.hargaSales || product.hargaFg || 0) > 0);
    return hasHargaBeli && hasHargaJual;
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
        (product.customer || product.supplier || '').toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      // Priority sorting:
      // 1. Products with complete price (harga beli AND harga jual) - HIGHEST PRIORITY
      // 2. Products with customer + price
      // 3. Products with customer only
      // 4. Products with price only
      // 5. Everything else
      
      const aHasCompletePrice = hasCompletePrice(a);
      const bHasCompletePrice = hasCompletePrice(b);
      const aHasCustomerPrice = hasCustomerAndPrice(a);
      const bHasCustomerPrice = hasCustomerAndPrice(b);
      
      // Calculate priority score (higher = better)
      const getPriority = (hasCompletePrice: boolean, hasCustomerPrice: boolean): number => {
        if (hasCompletePrice) return 3; // Highest priority - complete price
        if (hasCustomerPrice) return 2; // Second priority - customer + price
        return 0; // Lowest priority
      };
      
      const aPriority = getPriority(aHasCompletePrice, aHasCustomerPrice);
      const bPriority = getPriority(bHasCompletePrice, bHasCustomerPrice);
      
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

  // Auto generate kode product: PRD-001, PRD-002, dst
  // Untuk product turunan: PRD-003-T1, PRD-003-T2, dst (berdasarkan parent code)
  const generateProductCode = (existingProducts: Product[], isTurunan: boolean = false, parentProductId?: string): string => {
    const prefix = 'PRD';
    
    if (isTurunan && parentProductId) {
      // Generate code untuk product turunan: PRD-XXX-T1, PRD-XXX-T2, dst
      const parentProduct = existingProducts.find(p => p.id === parentProductId);
      if (parentProduct && parentProduct.kode) {
        // Extract base code dari parent (misalnya PRD-003 -> base: PRD-003)
        const parentCode = parentProduct.kode;
        
        // Cari semua turunan dari parent yang sama
        const turunanProducts = existingProducts.filter(p => 
          p.parentProductId === parentProductId && p.isTurunan
        );
        
        // Cari pattern PRD-XXX-TN (contoh: PRD-003-T1, PRD-003-T2)
        const turunanNumbers: number[] = [];
        turunanProducts.forEach(p => {
          if (p.kode) {
            // Pattern: PRD-003-T1, PRD-003-T2
            // Escape special regex characters dari parentCode
            const escapedParentCode = parentCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(`^${escapedParentCode}-T(\\d+)$`);
            const match = p.kode.match(pattern);
            if (match) {
              turunanNumbers.push(parseInt(match[1], 10));
            }
          }
        });
        
        // Generate next turunan number
        const nextTurunanNum = turunanNumbers.length > 0 ? Math.max(...turunanNumbers) + 1 : 1;
        return `${parentCode}-T${nextTurunanNum}`;
      }
    }
    
    // Generate code normal untuk product biasa
    const existingCodes = existingProducts
      .map(p => p.kode)
      .filter(k => k && k.startsWith(prefix))
      .map(k => {
        // Match pattern PRD-XXX (bukan turunan)
        const match = k.match(/^PRD-(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      });
    
    const maxNum = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;
    const nextNum = maxNum + 1;
    return `${prefix}-${String(nextNum).padStart(3, '0')}`;
  };

  const handleSave = async () => {
    try {

      // Validasi required fields
      if (!formData.nama || formData.nama.trim() === '') {
        showAlert('Nama product wajib diisi!', 'Validation Error');
        return;
      }

      if (editingItem) {
        // Edit mode: validasi code harus unique (kecuali code sendiri)
        const inputKode = formData.kode?.trim() || '';
        if (inputKode) {
          const duplicateCode = products.find(p => 
            p.id !== editingItem.id && 
            p.kode && 
            p.kode.toLowerCase() === inputKode.toLowerCase()
          );
          if (duplicateCode) {
            showAlert(`Kode "${inputKode}" sudah digunakan oleh product lain (${duplicateCode.nama})!`, 'Validation Error');
            return;
          }
        }

        const updated = products.map(p =>
          p.id === editingItem.id
            ? { 
                ...formData, 
                id: editingItem.id, 
                no: editingItem.no, 
                lastUpdate: new Date().toISOString(), 
                userUpdate: 'System', 
                ipAddress: '127.0.0.1',
                timestamp: Date.now(),
                _timestamp: Date.now()
              } as Product
            : p
        );
        await storageService.set('gt_products', updated);
        setProducts(updated.map((p, idx) => ({ ...p, no: idx + 1 })));
      } else {
        // Create mode: auto generate kode jika kosong, atau validasi jika diisi manual
        let finalKode = formData.kode?.trim() || '';
        
        if (!finalKode || finalKode === '') {
          // Auto generate berdasarkan apakah turunan atau tidak
          finalKode = generateProductCode(products, formData.isTurunan || false, formData.parentProductId);
        } else {
          // Validasi code harus unique
          const duplicateCode = products.find(p => 
            p.kode && p.kode.toLowerCase() === finalKode.toLowerCase()
          );
          if (duplicateCode) {
            showAlert(`Kode "${finalKode}" sudah digunakan oleh product lain (${duplicateCode.nama})! Silakan gunakan kode lain atau biarkan kosong untuk auto-generate.`, 'Validation Error');
            return;
          }
        }
        
        const newProduct: Product = {
          id: Date.now().toString(),
          no: products.length + 1,
          lastUpdate: new Date().toISOString(),
          userUpdate: 'System',
          ipAddress: '127.0.0.1',
          timestamp: Date.now(),
          _timestamp: Date.now(),
          ...formData,
          kode: finalKode,
        } as Product;
        const updated = [...products, newProduct];
        await storageService.set('gt_products', updated);
        setProducts(updated.map((p, idx) => ({ ...p, no: idx + 1 })));
      }
      
      // Close form dan reset state
      setShowForm(false);
      setEditingItem(null);
      setCustomerInputValue('');
      setStockAmanInputValue('');
      setStockMinimumInputValue('');
      setHargaBeliInputValue('');
      setHargaJualInputValue('');
      setFormData({ kode: '', nama: '', satuan: '', stockAman: 0, stockMinimum: 0, kategori: '', customer: '', harga: 0, hargaSales: 0, hargaFg: 0 });
      
      // Jangan show alert setelah save - biarkan user lihat perubahan di table
      // Notifikasi hanya muncul jika ada error
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
    setHargaBeliInputValue('');
    setHargaJualInputValue('');
    setFormData({
      ...item,
      customer: item.customer || item.supplier || '', // Use customer if available, fallback to supplier
      harga: item.harga || 0,
      hargaSales: item.hargaSales || item.hargaFg || 0,
      hargaFg: item.hargaSales || item.hargaFg || 0, // Backward compatibility
      parentProductId: item.parentProductId,
      isTurunan: item.isTurunan || false,
    });
    setShowForm(true);
  };

  const handleDelete = async (item: Product) => {
    // Cek apakah ada product turunan yang menggunakan product ini sebagai parent
    const turunanProducts = products.filter(p => p.parentProductId === item.id);
    if (turunanProducts.length > 0) {
      showAlert(`Cannot delete product "${item.nama}" because it has ${turunanProducts.length} turunan product(s). Please delete the turunan products first.`, 'Error');
      return;
    }
    
    showConfirm(
      `Are you sure you want to delete product "${item.nama}"? This action cannot be undone.`,
      async () => {
        try {
          const updated = products.filter(p => p.id !== item.id);
          await storageService.set('gt_products', updated);
          setProducts(updated.map((p, idx) => ({ ...p, no: idx + 1 })));
          showAlert(`Product "${item.nama}" deleted successfully`, 'Success');
        } catch (error: any) {
          showAlert(`Error deleting product: ${error.message}`, 'Error');
        }
      },
      undefined,
      'Confirm Delete'
    );
  };

  const handleCreateTurunan = (parentProduct: Product) => {
    // Set form data dengan data dari parent product
    setEditingItem(null);
    setCustomerInputValue('');
    setStockAmanInputValue('');
    setStockMinimumInputValue('');
    setHargaBeliInputValue('');
    setHargaJualInputValue('');
    
    // Set form dengan data parent, tapi kosongkan kode dan nama (user harus input sendiri)
    setFormData({
      kode: '',
      nama: '',
      satuan: parentProduct.satuan || '',
      stockAman: parentProduct.stockAman || 0,
      stockMinimum: parentProduct.stockMinimum || 0,
      kategori: parentProduct.kategori || '',
      customer: '',
      harga: parentProduct.harga || 0,
      hargaSales: parentProduct.hargaSales || parentProduct.hargaFg || 0,
      hargaFg: parentProduct.hargaSales || parentProduct.hargaFg || 0,
      parentProductId: parentProduct.id,
      isTurunan: true,
    });
    setShowForm(true);
  };

  // Download Template Excel
  const handleDownloadTemplate = () => {
    try {
      const templateData = [
        { 'Kode': 'PRD-001', 'Nama': 'Product Example 1', 'Satuan': 'PCS', 'Kategori': 'Product', 'Customer': 'Customer A', 'Stock Aman': '100', 'Stock Minimum': '50', 'Harga FG': '50000' },
        { 'Kode': 'PRD-002', 'Nama': 'Product Example 2', 'Satuan': 'BOX', 'Kategori': 'Product', 'Customer': 'Customer B', 'Stock Aman': '200', 'Stock Minimum': '100', 'Harga FG': '75000' },
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
    const exampleHeaders = ['Kode', 'Nama', 'Satuan', 'Kategori', 'Customer', 'Stock Aman', 'Stock Minimum', 'Harga FG'];
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
          showAlert('Excel file is empty or has no data', 'Information');
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
          showAlert('No valid data found in Excel file', 'Information');
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

          await storageService.set('gt_products', renumbered);
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


  const columns = [
    { 
      key: 'no', 
      header: 'No',
      render: (item: Product) => {
        const index = paginatedProducts.findIndex(p => p.id === item.id);
        return index >= 0 ? startIndex + index + 1 : '';
      },
    },
    { key: 'kode', header: 'Kode (SKU/ID)' },
    { 
      key: 'nama', 
      header: 'Nama',
      render: (item: Product) => (
        <span 
          style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--primary)' }}
          onClick={() => setSelectedProductForDetail(item)}
          title="Klik untuk lihat detail product"
        >
          {item.nama}
        </span>
      ),
    },
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
      key: 'parentProduct',
      header: 'Parent Product',
      render: (item: Product) => {
        if (!item.isTurunan || !item.parentProductId) return '-';
        const parentProduct = products.find(p => p.id === item.parentProductId);
        return parentProduct ? `${parentProduct.kode} - ${parentProduct.nama}` : '-';
      },
    },
    { 
      key: 'lastUpdate', 
      header: 'Last Update',
      render: (item: Product) => formatDateTime(item.lastUpdate)
    },
    { key: 'userUpdate', header: 'User Update' },
    { 
      key: 'harga', 
      header: 'Harga Beli',
      render: (item: Product) => {
        const harga = item.harga || 0;
        return harga > 0 ? new Intl.NumberFormat('id-ID', { 
          style: 'currency', 
          currency: 'IDR',
          minimumFractionDigits: 0 
        }).format(harga) : '-';
      },
    },
    { 
      key: 'hargaSales', 
      header: 'Harga Jual',
      render: (item: Product) => {
        const harga = item.hargaSales || item.hargaFg || 0;
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
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {!item.isTurunan && (
            <Button variant="secondary" onClick={() => handleCreateTurunan(item)} style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#17a2b8', color: 'white', border: 'none' }}>
              Buat Turunan
            </Button>
          )}
          <Button variant="secondary" onClick={() => handleEdit(item)}>Edit</Button>
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
              setHargaBeliInputValue('');
              setHargaJualInputValue('');
              setFormData({ kode: '', nama: '', satuan: '', stockAman: 0, stockMinimum: 0, kategori: '', customer: '', harga: 0, hargaSales: 0, hargaFg: 0 });
              setEditingItem(null);
            }
            setShowForm(!showForm);
          }}>
            {showForm ? 'Cancel' : '+ Add Product'}
            </Button>
          </div>
        </div>


      {showForm && (
        <Card title={editingItem ? "Edit Product" : (formData.isTurunan ? "Add Product Turunan" : "Add New Product")} className="mb-4">
          {formData.isTurunan && formData.parentProductId && (
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px', color: 'var(--text-primary)' }}>
                Parent Product:
          </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {(() => {
                  const parentProduct = products.find(p => p.id === formData.parentProductId);
                  return parentProduct ? `${parentProduct.kode} - ${parentProduct.nama}` : '-';
                })()}
          </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', fontStyle: 'italic' }}>
                Note: Product turunan akan menggunakan inventory dari parent product. Hanya kode dan nama yang berbeda.
          </div>
        </div>
          )}
              <Input
            label="Kode (Auto-generated)"
            value={formData.kode || ''}
            onChange={(v) => setFormData({ ...formData, kode: v })}
            placeholder={editingItem ? "Edit kode" : (formData.isTurunan ? "Masukkan kode untuk product turunan" : "Auto-generated jika kosong")}
            disabled={!editingItem} // Disabled saat create, bisa edit saat edit
              />
              <Input
            label="Nama"
            value={formData.nama || ''}
            onChange={(v) => setFormData({ ...formData, nama: v })}
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
              Harga Beli
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={hargaBeliInputValue !== undefined && hargaBeliInputValue !== '' ? hargaBeliInputValue : (formData.harga ? String(formData.harga || 0) : '')}
              onFocus={(e) => {
                const input = e.target as HTMLInputElement;
                const currentVal = formData.harga || 0;
                if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                  setHargaBeliInputValue('');
                  input.value = '';
                } else {
                  input.select();
                }
              }}
              onMouseDown={(e) => {
                const input = e.target as HTMLInputElement;
                const currentVal = formData.harga || 0;
                if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                  setHargaBeliInputValue('');
                  input.value = '';
                }
              }}
              onChange={(e) => {
                let val = e.target.value;
                val = val.replace(/[^\d.,]/g, '');
                const cleaned = removeLeadingZero(val);
                setHargaBeliInputValue(cleaned);
                setFormData({ ...formData, harga: cleaned === '' ? 0 : Number(cleaned) || 0 });
              }}
              onBlur={(e) => {
                const val = e.target.value;
                if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                  setFormData({ ...formData, harga: 0 });
                  setHargaBeliInputValue('');
                } else {
                  setFormData({ ...formData, harga: Number(val) });
                  setHargaBeliInputValue('');
                }
              }}
              onKeyDown={(e) => {
                const input = e.target as HTMLInputElement;
                const currentVal = input.value;
                if ((currentVal === '' || currentVal === '0') && /^[1-9]$/.test(e.key)) {
                  e.preventDefault();
                  const newVal = e.key;
                  setHargaBeliInputValue(newVal);
                  input.value = newVal;
                  setFormData({ ...formData, harga: Number(newVal) });
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
              Harga Jual
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={hargaJualInputValue !== undefined && hargaJualInputValue !== '' ? hargaJualInputValue : (formData.hargaSales || formData.hargaFg ? String(formData.hargaSales || formData.hargaFg || 0) : '')}
              onFocus={(e) => {
                const input = e.target as HTMLInputElement;
                const currentVal = formData.hargaSales || formData.hargaFg || 0;
                if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                  setHargaJualInputValue('');
                  input.value = '';
                } else {
                  input.select();
                }
              }}
              onMouseDown={(e) => {
                const input = e.target as HTMLInputElement;
                const currentVal = formData.hargaSales || formData.hargaFg || 0;
                if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                  setHargaJualInputValue('');
                  input.value = '';
                }
              }}
              onChange={(e) => {
                let val = e.target.value;
                val = val.replace(/[^\d.,]/g, '');
                const cleaned = removeLeadingZero(val);
                setHargaJualInputValue(cleaned);
                const hargaJual = cleaned === '' ? 0 : Number(cleaned) || 0;
                setFormData({ ...formData, hargaSales: hargaJual, hargaFg: hargaJual });
              }}
              onBlur={(e) => {
                const val = e.target.value;
                if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                  setFormData({ ...formData, hargaSales: 0, hargaFg: 0 });
                  setHargaJualInputValue('');
                } else {
                  const hargaJual = Number(val);
                  setFormData({ ...formData, hargaSales: hargaJual, hargaFg: hargaJual });
                  setHargaJualInputValue('');
                }
              }}
              onKeyDown={(e) => {
                const input = e.target as HTMLInputElement;
                const currentVal = input.value;
                if ((currentVal === '' || currentVal === '0') && /^[1-9]$/.test(e.key)) {
                  e.preventDefault();
                  const newVal = e.key;
                  setHargaJualInputValue(newVal);
                  input.value = newVal;
                  const hargaJual = Number(newVal);
                  setFormData({ ...formData, hargaSales: hargaJual, hargaFg: hargaJual });
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
            <Button onClick={() => { setShowForm(false); setEditingItem(null); setCustomerInputValue(''); setStockAmanInputValue(''); setStockMinimumInputValue(''); setHargaBeliInputValue(''); setHargaJualInputValue(''); setFormData({ kode: '', nama: '', satuan: '', stockAman: 0, stockMinimum: 0, kategori: '', customer: '', harga: 0, hargaSales: 0, hargaFg: 0 }); }} variant="secondary">
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
        
        {/* Product Detail Dialog */}
        {selectedProductForDetail && (
        <div 
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
              zIndex: 10000,
          }}
            onClick={() => setSelectedProductForDetail(null)}
        >
            <Card 
              title={`Detail Product: ${selectedProductForDetail.nama}`}
              style={{ 
                maxWidth: '600px', 
                width: '90%', 
                maxHeight: '80vh', 
                overflow: 'auto',
                backgroundColor: 'var(--bg-primary)',
              }}
            onClick={(e) => e.stopPropagation()} 
            >
              <div style={{ padding: '16px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <strong>Kode:</strong> {selectedProductForDetail.kode}
              </div>
                <div style={{ marginBottom: '16px' }}>
                  <strong>Nama:</strong> {selectedProductForDetail.nama}
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <strong>Satuan:</strong> {selectedProductForDetail.satuan || '-'}
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <strong>Kategori:</strong> {selectedProductForDetail.kategori || '-'}
                </div>
                
                {selectedProductForDetail.isTurunan && selectedProductForDetail.parentProductId ? (
                  <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
                    <strong style={{ color: 'var(--primary)' }}>📦 Product Turunan</strong>
                    <div style={{ marginTop: '8px' }}>
                      <strong>Parent Product:</strong>
                      {(() => {
                        const parentProduct = products.find(p => p.id === selectedProductForDetail.parentProductId);
                        return parentProduct ? (
                          <div style={{ marginLeft: '16px', marginTop: '4px' }}>
                            <div>• Kode: {parentProduct.kode}</div>
                            <div>• Nama: {parentProduct.nama}</div>
                          </div>
                        ) : '-';
                      })()}
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
                    <strong style={{ color: 'var(--success)' }}>📦 Product Parent</strong>
                    <div style={{ marginTop: '8px' }}>
                      <strong>Product Turunan:</strong>
                      {(() => {
                        const turunanProducts = products.filter(p => p.parentProductId === selectedProductForDetail.id && p.isTurunan);
                        if (turunanProducts.length === 0) {
                          return <div style={{ marginLeft: '16px', marginTop: '4px' }}>-</div>;
                    }
                        return (
                          <div style={{ marginLeft: '16px', marginTop: '4px' }}>
                            {turunanProducts.map((turunan, idx) => (
                              <div key={idx} style={{ marginBottom: '4px' }}>
                                • {turunan.kode} - {turunan.nama}
              </div>
                            ))}
                          </div>
                        );
                      })()}
          </div>
        </div>
      )}
                
                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                  <Button onClick={() => setSelectedProductForDetail(null)}>Tutup</Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </Card>
      {/* Custom Dialog - menggunakan hook terpusat */}
      <DialogComponent />


    </div>
  );
};

export default Products;
