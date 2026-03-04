import { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { storageService, extractStorageValue, StorageKeys } from '../../../services/storage';
import { filterActiveItems } from '../../../utils/data-persistence-helper';
import { useLanguage } from '../../../hooks/useLanguage';
import '../../../styles/common.css';
import '../../../styles/compact.css';
import './Inventory.css';

interface InventoryItem {
  id: string;
  supplierName: string;
  codeItem: string;
  description: string;
  kategori: string;
  satuan: string;
  price: number; // Harga jual
  hargaBeli?: number; // Harga beli (optional for backward compatibility)
  stockPremonth: number;
  receive: number;
  outgoing: number;
  return: number;
  nextStock: number; // Calculated: stockPremonth + receive - outgoing + return
  lastUpdate?: string;
  anomaly?: string;
  anomalyDetail?: string;
  // Tracking untuk anti-duplicate
  processedGRNs?: string[]; // GRN numbers yang sudah diproses (RECEIVE dari GRN)
  processedDeliveries?: string[]; // Delivery numbers yang sudah diproses (OUTGOING dari Delivery Note)
}

const Inventory = () => {
  const { t } = useLanguage();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  // Structure: Record<productId, string | { image: string, deleted?: boolean, deletedAt?: string, deletedTimestamp?: number }>
  const [productImages, setProductImages] = useState<Record<string, string | { image: string; deleted?: boolean; deletedAt?: string; deletedTimestamp?: number }>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [selectedInventoryForDetail, setSelectedInventoryForDetail] = useState<InventoryItem | null>(null);
  const [editingInventory, setEditingInventory] = useState<InventoryItem | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<InventoryItem>>({});

  useEffect(() => {
    loadInventory();
    loadProducts();
  }, []);

  // Enable semua input di dalam dialog saat dialog terbuka
  useEffect(() => {
    if (editingInventory) {
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
      
      // Enable inputs multiple times untuk memastikan
      enableDialogInputs();
      setTimeout(enableDialogInputs, 50);
      setTimeout(enableDialogInputs, 100);
      setTimeout(enableDialogInputs, 200);
    }
  }, [editingInventory]);

  // Helper to get image data (handle both old format string and new format object)
  const getImageData = (imageEntry: string | { image: string; deleted?: boolean; deletedAt?: string; deletedTimestamp?: number } | undefined): string | null => {
    if (!imageEntry) return null;
    if (typeof imageEntry === 'string') return imageEntry; // Old format (backward compatibility)
    if (imageEntry.deleted) return null; // Tombstone - image deleted
    return imageEntry.image || null;
  };

  // Helper to check if image is deleted
  const isImageDeleted = (imageEntry: string | { image: string; deleted?: boolean; deletedAt?: string; deletedTimestamp?: number } | undefined): boolean => {
    if (!imageEntry) return false;
    if (typeof imageEntry === 'string') return false; // Old format - not deleted
    return imageEntry.deleted === true;
  };
  
  const loadProducts = async () => {
    try {
      const dataRaw = extractStorageValue(await storageService.get<any[]>(StorageKeys.GENERAL_TRADING.PRODUCTS)) || [];
      // Filter out deleted items menggunakan helper function
      const activeProducts = filterActiveItems(dataRaw);
      setProducts(activeProducts);
      
      // Load product images (support both old format string and new format object with tombstone)
      const imagesDataRaw = await storageService.get<Record<string, string | { image: string; deleted?: boolean; deletedAt?: string; deletedTimestamp?: number }>>(StorageKeys.GENERAL_TRADING.PRODUCT_IMAGES) || {};
      
      // Filter out deleted images (tombstone) for display
      const activeImages: Record<string, string | { image: string; deleted?: boolean; deletedAt?: string; deletedTimestamp?: number }> = {};
      Object.keys(imagesDataRaw).forEach(productId => {
        const imageEntry = imagesDataRaw[productId];
        if (!isImageDeleted(imageEntry)) {
          activeImages[productId] = imageEntry;
        }
      });
      
      setProductImages(activeImages);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  // Add event listener untuk auto-refresh ketika data berubah (dengan debounce)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Debounce untuk mencegah multiple calls
    let timeoutId: NodeJS.Timeout | null = null;

    const handleStorageChange = (e: CustomEvent) => {
      const key = e.detail?.key || '';
      // Hanya refresh jika inventory data berubah
      if (key === StorageKeys.GENERAL_TRADING.INVENTORY || key === 'general-trading/' + StorageKeys.GENERAL_TRADING.INVENTORY) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          console.log(`[Inventory GT] Storage changed for ${key}, reloading...`);
          loadInventory();
        }, 500); // Debounce 500ms
      }
    };

    window.addEventListener('app-storage-changed', handleStorageChange as EventListener, { passive: true });
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener('app-storage-changed', handleStorageChange as EventListener);
    };
  }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load langsung dari localStorage (sama seperti DB Activity) untuk memastikan data terbaca
      let data: InventoryItem[] = [];
      
      // Try multiple key formats (sama seperti DB Activity)
      const possibleKeys = [
        'general-trading/' + StorageKeys.GENERAL_TRADING.INVENTORY, // With business prefix
        StorageKeys.GENERAL_TRADING.INVENTORY, // Direct key
      ];
      
      for (const storageKey of possibleKeys) {
        const valueStr = localStorage.getItem(storageKey);
        if (valueStr) {
          try {
            const parsed = JSON.parse(valueStr);
            const extracted = Array.isArray(parsed?.value) ? parsed.value : (Array.isArray(parsed) ? parsed : []);
            if (extracted.length > 0) {
              data = extracted;
              console.log(`[Inventory] Loaded from localStorage key: ${storageKey} (${data.length} items)`);
              break; // Found data, use this
            }
          } catch (e) {
            console.warn(`[Inventory] Error parsing localStorage key ${storageKey}:`, e);
          }
        }
      }
      
      // If still empty, try storageService as fallback
      if (data.length === 0) {
        console.log('[Inventory] localStorage empty, trying storageService...');
        const rawData = await storageService.get<InventoryItem[]>(StorageKeys.GENERAL_TRADING.INVENTORY);
        data = extractStorageValue(rawData) || [];
        console.log(`[Inventory] Loaded from storageService: ${data.length} items`);
      }
      
      // Filter out deleted items menggunakan helper function
      const activeData = filterActiveItems(data);
      
      // Debug logging
      console.log('[Inventory] Final data count:', activeData.length, `(filtered from ${data.length} total)`);
      
      // If empty, just set empty array
      if (activeData.length === 0) {
        console.warn('[Inventory] No inventory data found. Make sure to run seed script: node scripts/seedgt.js');
        setInventory([]);
        return;
      }
      
      // Calculate nextStock for each item (premonth + received - outgoing)
      const calculatedData = activeData.map(item => {
        const stockPremonth = item.stockPremonth || 0;
        const receiveQty = item.receive || 0;
        const outgoingQty = item.outgoing || 0;
        const returnQty = item.return || 0;
        const maxOutgoing = stockPremonth + receiveQty + returnQty;
        const adjustedOutgoing = Math.min(outgoingQty, maxOutgoing);
        const hasAnomaly = outgoingQty > maxOutgoing;
        return {
          ...item,
          outgoing: adjustedOutgoing,
          nextStock: stockPremonth + receiveQty - adjustedOutgoing,
          anomaly: hasAnomaly ? 'OUTGOING_GT_RECEIVE' : item.anomaly,
          anomalyDetail: hasAnomaly
            ? `Outgoing ${outgoingQty} melebihi stock tersedia (${maxOutgoing}). Auto-adjust saat load.`
            : item.anomalyDetail,
        };
      });
      setInventory(calculatedData);
    } catch (error: any) {
      console.error('Error loading inventory:', error);
      setError(`Gagal memuat data inventory: ${error.message || 'Unknown error'}. Coba refresh halaman atau import data ulang.`);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter inventory based on search query (GT: semua adalah product, tidak ada product)
  const filteredInventory = useMemo(() => {
    // Filter out items with empty codeItem or description
    const validData = inventory.filter(item => {
      const codeItem = (item.codeItem || '').toString().trim();
      const description = (item.description || '').toString().trim();
      return codeItem !== '' && description !== '';
    });
    
    if (!searchQuery) return validData;
    const query = (searchQuery || '').toString().toLowerCase();
    return validData.filter(item => {
      const codeItem = (item.codeItem || '').toString().toLowerCase();
      const description = (item.description || '').toString().toLowerCase();
      const supplierName = (item.supplierName || '').toString().toLowerCase();
      return codeItem.includes(query) || description.includes(query) || supplierName.includes(query);
    });
  }, [inventory, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInventory = filteredInventory.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Handle Manual Reset
  const handleResetData = async () => {
    try {
      setLoading(true);
      await storageService.set(StorageKeys.GENERAL_TRADING.INVENTORY, []);
      setInventory([]);
      setSuccessMessage('✅ Data inventory berhasil direset. Silakan import data baru dari Excel.');
      setError('');
    } catch (error: any) {
      setError(`Gagal reset data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Download Template Excel
  const handleDownloadTemplate = () => {
    try {
      const templateData = [
        { 'SUPPLIER NAME': 'PT Supplier Example', 'CODE item': 'ITEM-001', 'DESCRIPTION': 'Product Example 1', 'Kategori': 'Product', 'Satuan': 'PCS', 'PRICE': '50000', 'STOCK/Premonth': '100', 'receive': '0', 'Outgoing': '0', 'Return': '0' },
        { 'SUPPLIER NAME': 'PT Supplier Example', 'CODE item': 'ITEM-002', 'DESCRIPTION': 'Product Example 2', 'Kategori': 'Product', 'Satuan': 'BOX', 'PRICE': '75000', 'STOCK/Premonth': '200', 'receive': '0', 'Outgoing': '0', 'Return': '0' },
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      
      const fileName = `Inventory_Template.xlsx`;
      XLSX.writeFile(wb, fileName);
      setSuccessMessage('✅ Template downloaded! Silakan isi data sesuai format dan import kembali.');
      setError('');
    } catch (error: any) {
      setError(`Error downloading template: ${error.message}`);
    }
  };

  // Handle Excel Import
  const handleImportExcel = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.ods,.csv';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        setImportLoading(true);
        
        // Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        
        // Use xlsx library - supports .xlsx, .xls, .ods, .csv
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        if (jsonData.length === 0) {
          setError('File Excel kosong atau tidak ada data yang bisa diimport.');
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

        const newItems: InventoryItem[] = [];
        const errors: string[] = [];

        const defaultCategory = 'Product';

        jsonData.forEach((row, index) => {
          try {
            const supplierName = mapColumn(row, ['SUPPLIER NAME', 'SUPPLIER', 'Supplier Name', 'supplier_name']);
            const codeItem = mapColumn(row, ['CODE item', 'CODE', 'Code Item', 'code_item', 'Kode']);
            const description = mapColumn(row, ['DESCRIPTION', 'DESCRIPTION/Nama Item', 'Nama Item', 'Description', 'nama', 'Nama']);
            const kategori = mapColumn(row, ['Kategori', 'KATEGORI', 'Category', 'category']);
            const satuan = mapColumn(row, ['Satuan', 'SATUAN', 'UOM', 'Satuan/UOM', 'Unit', 'unit']);
            const priceStr = mapColumn(row, ['PRICE', 'Price', 'price', 'Harga', 'HARGA']);
            const stockStr = mapColumn(row, ['STOCK/Premonth', 'STOCK', 'Stock', 'Premonth', 'STOCK/PREMONTH', 'Stock/Premonth']);
            const receiveStr = mapColumn(row, ['receive', 'Receive', 'RECEIVE', 'penerimaan', 'Penerimaan']);
            const outgoingStr = mapColumn(row, ['Outgoing', 'OUTGOING', 'outgoing', 'keluar', 'Keluar']);
            const returnStr = mapColumn(row, ['Return', 'RETURN', 'return']);

            // Skip empty rows
            if (!codeItem && !description) {
              return;
            }

            const price = parseFloat(priceStr) || 0;
            const stockPremonth = parseFloat(stockStr) || 0;
            const receive = parseFloat(receiveStr) || 0;
            const outgoing = parseFloat(outgoingStr) || 0;
            const returnQty = parseFloat(returnStr) || 0;
            const nextStock = stockPremonth + receive - outgoing + returnQty;

            // Check if item already exists (by codeItem)
            const existingIndex = inventory.findIndex(item => {
              const existingCode = (item.codeItem || '').toString().trim().toLowerCase();
              const newCode = (codeItem || '').toString().trim().toLowerCase();
              return existingCode === newCode && existingCode !== '';
            });

            if (existingIndex >= 0) {
              // Update existing item
              const existing = inventory[existingIndex];
              newItems.push({
                ...existing,
                supplierName: supplierName || existing.supplierName,
                description: description || existing.description,
                kategori: kategori || existing.kategori || defaultCategory,
                satuan: satuan || existing.satuan,
                price: price || existing.price,
                stockPremonth: stockPremonth || existing.stockPremonth,
                receive: receive || existing.receive,
                outgoing: outgoing || existing.outgoing,
                return: returnQty || existing.return,
                nextStock,
                lastUpdate: new Date().toISOString(),
              });
            } else {
              // Create new item
              newItems.push({
                id: Date.now().toString() + index,
                supplierName: supplierName || '',
                codeItem: codeItem || '',
                description: description || '',
                kategori: kategori || defaultCategory,
                satuan: satuan || 'PCS',
                price,
                stockPremonth,
                receive,
                outgoing,
                return: returnQty,
                nextStock,
                lastUpdate: new Date().toISOString(),
              });
            }
          } catch (error: any) {
            errors.push(`Row ${index + 2}: ${error.message}`);
          }
        });

        if (newItems.length === 0) {
          setError('Tidak ada data valid yang ditemukan di file Excel. Pastikan format kolom sesuai.');
          return;
        }

        // Merge with existing inventory (update existing, add new)
        const existingMap = new Map<string, InventoryItem>();
        inventory.forEach(item => {
          const key = (item.codeItem || '').toString().trim().toLowerCase();
          if (key !== '') {
            existingMap.set(key, item);
          }
        });
        const merged: InventoryItem[] = [];

        newItems.forEach(newItem => {
          const key = (newItem.codeItem || '').toString().trim().toLowerCase();
          if (existingMap.has(key)) {
            // Update existing
            merged.push(newItem);
            existingMap.delete(key);
          } else {
            // Add new
            merged.push(newItem);
          }
        });

        // Add remaining existing items that weren't updated
        existingMap.forEach(item => merged.push(item));

        // Save to storage
        await storageService.set(StorageKeys.GENERAL_TRADING.INVENTORY, merged);
        setInventory(merged);
        
        let successMsg = `✅ Berhasil import ${newItems.length} item`;
        if (errors.length > 0) {
          successMsg += `. Ada ${errors.length} baris yang error: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}`;
        }
        setSuccessMessage(successMsg);
        setError('');
      } catch (error: any) {
        setError(`Gagal import Excel: ${error.message}. Pastikan file adalah Excel yang valid (.xlsx atau .xls).`);
      } finally {
        setImportLoading(false);
      }
    };
    input.click();
  };

  const handleExportExcel = () => {
    try {
      const dataToExport = filteredInventory.map(item => ({
        'Supplier Name': item.supplierName || '',
        'Code Item': item.codeItem || '',
        'Description': item.description || '',
        'Kategori': item.kategori || '',
        'Satuan': item.satuan || '',
        'Price': item.price || 0,
        'Stock Premonth': item.stockPremonth || 0,
        'Receive': item.receive || 0,
        'Outgoing': item.outgoing || 0,
        'Return': item.return || 0,
        'Next Stock': item.nextStock || 0,
        'Last Update': item.lastUpdate ? new Date(item.lastUpdate).toLocaleString('id-ID') : '',
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(wb, ws, 'Products Inventory');
      
      const fileName = `Inventory_Products_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      setSuccessMessage(`✅ Berhasil export ${dataToExport.length} products ke ${fileName}`);
      setError('');
    } catch (error: any) {
      setError(`Gagal export ke Excel: ${error.message}`);
    }
  };

  const recalculateInventory = async () => {
    try {
      setLoading(true);
      
      // Load semua data source (GT: hanya product, tidak ada product)
      const [existingInventory, purchaseOrders, deliveryData, productsData, salesOrdersData, grnData, purchaseRequests] = await Promise.all([
        storageService.get<InventoryItem[]>(StorageKeys.GENERAL_TRADING.INVENTORY),
        storageService.get<any[]>(StorageKeys.GENERAL_TRADING.PURCHASE_ORDERS),
        storageService.get<any[]>(StorageKeys.GENERAL_TRADING.DELIVERY),
        storageService.get<any[]>(StorageKeys.GENERAL_TRADING.PRODUCTS),
        storageService.get<any[]>(StorageKeys.GENERAL_TRADING.SALES_ORDERS),
        storageService.get<any[]>(StorageKeys.GENERAL_TRADING.GRN),
        storageService.get<any[]>(StorageKeys.GENERAL_TRADING.PURCHASE_REQUESTS),
      ]);

      // Extract and ensure arrays (null safety)
      const safeInventory = extractStorageValue(existingInventory);
      const safePOs = extractStorageValue(purchaseOrders);
      const safeDelivery = extractStorageValue(deliveryData);
      const safeProducts = extractStorageValue(productsData);
      const safeSalesOrders = extractStorageValue(salesOrdersData);
      const safeGRN = extractStorageValue(grnData);
      const safePRs = extractStorageValue(purchaseRequests);

      // Create maps untuk lookup
      const productsMap = new Map(safeProducts.map((p: any) => [p.product_id || p.kode, p]));
      
      // Map untuk price produk dari salesOrders (ambil dari items di setiap SO)
      const productPriceMap = new Map<string, number>();
      safeSalesOrders.forEach((so: any) => {
        if (so.items && Array.isArray(so.items)) {
          so.items.forEach((item: any) => {
            // Cek semua kemungkinan field untuk productId
            const productId = item.productId || item.productKode || item.product_id;
            if (productId && item.price && item.price > 0) {
              // Ambil price terakhir jika ada multiple SO dengan product yang sama
              const key = String(productId).toLowerCase().trim();
              productPriceMap.set(key, item.price);
            }
          });
        }
      });

      // Initialize inventory map dari existing (preserve stockPremonth, price, hargaBeli, dll)
      const inventoryMap = new Map<string, InventoryItem>();
      safeInventory.forEach(item => {
        const key = (item.codeItem || '').toString().trim().toLowerCase();
        // Update price dari salesOrders jika ada, preserve yang lain
        const priceFromSO = productPriceMap.get(key);
        const finalPrice = priceFromSO !== undefined ? priceFromSO : item.price;
        
        // Update harga beli dari product master jika belum ada
        let hargaBeli = item.hargaBeli || 0;
        if (!hargaBeli || hargaBeli === 0) {
          const product = safeProducts.find((p: any) => 
            ((p.product_id || p.kode || '').toString().trim().toLowerCase() === key)
          );
          if (product) {
            hargaBeli = product.harga || product.hargaBeli || 0;
          }
        }
        
        inventoryMap.set(key, {
          ...item,
          price: finalPrice,
          hargaBeli: hargaBeli, // Preserve atau update harga beli dari product master
          receive: 0,
          outgoing: 0,
          return: 0,
          processedGRNs: [],
        });
      });

      // Map PO untuk lookup
      const poMap = new Map(safePOs.map((po: any) => [po.poNo, po]));

      // Map PR untuk lookup (jika PO dibuat dari PR)
      const prMap = new Map(safePRs.map((pr: any) => [pr.id, pr]));

      // Helper function untuk mencari productId dari PO atau GRN
      const findProductIdFromPO = (po: any): string => {
        // Cek productId dulu (format baru)
        if (po.productId) {
          return po.productId.toString().trim();
        }
        
        // Backward compatibility: cek materialId (format lama)
        if (po.materialId) {
          return po.materialId.toString().trim();
        }
        
        // Cari dari productItem (nama product)
        if (po.productItem) {
          const itemName = po.productItem.toString().trim();
          const foundProduct = safeProducts.find((p: any) => {
            const productName = (p.nama || p.productName || '').toString().trim();
            const productCode = (p.product_id || p.kode || '').toString().trim();
            return productName === itemName || 
                   productName.toLowerCase() === itemName.toLowerCase() ||
                   productCode === itemName ||
                   productCode.toLowerCase() === itemName.toLowerCase();
          });
          if (foundProduct) {
            return (foundProduct.product_id || foundProduct.kode || '').toString().trim();
          }
        }
        
        // Jika PO dibuat dari PR, cari dari PR items
        if (po.sourcePRId) {
          const pr = prMap.get(po.sourcePRId);
          if (pr && pr.items && Array.isArray(pr.items) && pr.items.length > 0) {
            // Ambil productId dari item pertama di PR
            const prItem = pr.items[0];
            if (prItem.productId || prItem.productKode) {
              return (prItem.productId || prItem.productKode || '').toString().trim();
            }
          }
        }
        
        // Jika PO punya soNo, cari dari SO items
        if (po.soNo) {
          const so = safeSalesOrders.find((s: any) => s.soNo === po.soNo);
          if (so && so.items && Array.isArray(so.items)) {
            // Coba match berdasarkan price atau qty
            const matchedItem = so.items.find((item: any) => 
              Math.abs((item.price || 0) - (po.price || 0)) < 0.01 || 
              (item.qty || 0) === (po.qty || 0)
            );
            if (matchedItem) {
              const productId = matchedItem.productId || matchedItem.productKode || matchedItem.product_id;
              if (productId) {
                return productId.toString().trim();
              }
            }
          }
        }
        
        return '';
      };

      // 1. PRODUCT RECEIVE: dari GRN (semua GRN, otomatis masuk ke receive)
      safeGRN.forEach((grn: any) => {
        const grnNo = grn.grnNo;
        const poNo = grn.poNo;
        if (!grnNo || !poNo) return;

        // Cari PO untuk ambil productId
        const po = poMap.get(poNo);
        if (!po) {
          console.warn(`⚠️ [GRN Inventory] PO ${poNo} tidak ditemukan untuk GRN ${grnNo}. Skip.`);
          return;
        }

        // Cari productId dari GRN atau PO (format baru)
        let productId = grn.productId || findProductIdFromPO(po);
        
        // Backward compatibility: cek materialId dari GRN (format lama)
        if (!productId && grn.materialId) {
          productId = grn.materialId.toString().trim();
        }
        
        // Jika masih kosong, cari dari productItem di GRN (format baru)
        if (!productId && (grn.productItem || grn.productName)) {
          const itemName = (grn.productItem || grn.productName || '').toString().trim();
          const foundProduct = safeProducts.find((p: any) => {
            const productName = (p.nama || p.productName || '').toString().trim();
            const productCode = (p.product_id || p.kode || '').toString().trim();
            return productName === itemName || 
                   productName.toLowerCase() === itemName.toLowerCase() ||
                   productCode === itemName ||
                   productCode.toLowerCase() === itemName.toLowerCase();
          });
          if (foundProduct) {
            productId = (foundProduct.product_id || foundProduct.kode || '').toString().trim();
          }
        }

        if (!productId) {
          console.warn(`⚠️ [GRN Inventory] Product ID tidak ditemukan untuk GRN ${grnNo} (PO: ${poNo}, productItem: ${po.productItem || grn.productItem || 'N/A'}). Skip.`);
          return;
        }

        // Cek apakah product adalah turunan, jika ya gunakan parent product ID untuk inventory
        let originalProductId = (productId || '').toString().trim();
        let inventoryProductId = originalProductId;
        const product = safeProducts.find((p: any) => 
          (p.product_id || p.kode || '').toString().trim().toLowerCase() === originalProductId.toLowerCase()
        );
        
        if (product && product.isTurunan && product.parentProductId) {
          const parentProduct = safeProducts.find((p: any) => p.id === product.parentProductId);
          if (parentProduct) {
            inventoryProductId = (parentProduct.product_id || parentProduct.kode || '').toString().trim();
            console.log(`[GRN Inventory] Product turunan detected: ${product.nama} (${originalProductId}) -> Using parent: ${parentProduct.nama} (${inventoryProductId})`);
          }
        }
        
        const key = (inventoryProductId || '').toString().trim().toLowerCase();
        let item = inventoryMap.get(key);

        // Ambil price dari PO atau product master (gunakan product asli untuk price, bukan parent)
        const priceFromPO = parseFloat(po.price) || 0;
        const productForPrice = productsMap.get(originalProductId);
        const priceFromProduct = productForPrice ? (productForPrice.price || productForPrice.hargaSales || 0) : 0;
        const finalPrice = priceFromPO > 0 ? priceFromPO : priceFromProduct;
        
        // Ambil harga beli dari product master (prioritas: harga > hargaBeli > 0)
        const hargaBeliFromProduct = productForPrice ? (productForPrice.harga || productForPrice.hargaBeli || 0) : 0;
        const hargaBeliFromPO = parseFloat(po.hargaBeli || po.harga || 0) || 0;
        const finalHargaBeli = hargaBeliFromPO > 0 ? hargaBeliFromPO : hargaBeliFromProduct;

        if (!item) {
          if (!product) {
            console.warn(`⚠️ [GRN Inventory] Product tidak ditemukan di master: ${originalProductId}`);
            return;
          }

          // Gunakan parent product untuk inventory jika turunan
          const inventoryProduct = product && product.isTurunan && product.parentProductId
            ? safeProducts.find((p: any) => p.id === product.parentProductId)
            : product;
          
          // Ambil harga beli dari parent product jika turunan
          const parentProductForHargaBeli = inventoryProduct && inventoryProduct !== product
            ? safeProducts.find((p: any) => (p.product_id || p.kode || '').toString().trim().toLowerCase() === (inventoryProduct.product_id || inventoryProduct.kode || '').toString().trim().toLowerCase())
            : null;
          const hargaBeliFromParent = parentProductForHargaBeli ? (parentProductForHargaBeli.harga || parentProductForHargaBeli.hargaBeli || 0) : 0;
          const finalHargaBeliForItem = hargaBeliFromPO > 0 ? hargaBeliFromPO : (hargaBeliFromParent > 0 ? hargaBeliFromParent : hargaBeliFromProduct);
          
          item = {
            id: Date.now().toString() + key,
            supplierName: grn.supplier || po.supplier || (inventoryProduct?.supplier || ''),
            codeItem: inventoryProductId, // Gunakan parent product ID jika turunan
            description: grn.productItem || grn.productName || grn.materialItem || po.productItem || po.materialItem || (inventoryProduct?.nama || ''),
            kategori: inventoryProduct?.kategori || 'Product',
            satuan: inventoryProduct?.satuan || inventoryProduct?.unit || 'PCS',
            price: finalPrice,
            hargaBeli: finalHargaBeliForItem, // Set harga beli dari product master atau PO
            stockPremonth: 0,
            receive: 0,
            outgoing: 0,
            return: 0,
            nextStock: 0,
            processedGRNs: [],
            processedDeliveries: [],
          };
          inventoryMap.set(key, item);
        } else {
          // Update price dari PO jika ada (ambil yang terbaru)
          if (priceFromPO > 0) {
            item.price = priceFromPO;
          }
          // Update harga beli dari PO atau product master jika belum ada
          if (!item.hargaBeli || item.hargaBeli === 0) {
            item.hargaBeli = finalHargaBeli;
          } else if (hargaBeliFromPO > 0) {
            // Update dengan harga beli dari PO jika ada (ambil yang terbaru)
            item.hargaBeli = hargaBeliFromPO;
          }
        }

        // Anti-duplicate: cek apakah GRN ini sudah diproses
        if (!item.processedGRNs) item.processedGRNs = [];
        if (item.processedGRNs.includes(grnNo)) {
          console.log(`⏭️  [GRN Inventory] GRN ${grnNo} sudah pernah diproses untuk product ${originalProductId}. Skip.`);
          return;
        }

        // Update receive dengan qtyReceived dari GRN (bulatkan qty, tidak pakai decimal)
        const qtyRounded = Math.round(grn.qtyReceived || grn.qty || 0);
        item.receive = (item.receive || 0) + qtyRounded;
        item.processedGRNs.push(grnNo);
        
        console.log(`✅ [GRN Inventory] Product inventory updated (RECEIVE from GRN ${grnNo}):`);
        console.log(`   Product: ${grn.productItem || grn.productName || grn.materialItem || po.productItem || po.materialItem || 'N/A'} (${originalProductId})`);
        console.log(`   PO: ${poNo} | GRN: ${grnNo}`);
        console.log(`   Receive: +${qtyRounded} | Price: ${finalPrice}`);
      });

      // 1B. PRODUCT RECEIVE: dari PO yang CLOSE tapi belum ada GRN (fallback)
      // Ini untuk case dimana PO sudah CLOSE tapi GRN belum dibuat atau tidak lengkap
      safePOs
        .filter((po: any) => po.status === 'CLOSE' && po.receiptDate)
        .forEach((po: any) => {
          const poNo = po.poNo;
          if (!poNo) return;

          // Cek apakah sudah ada GRN untuk PO ini
          const hasGRN = safeGRN.some((grn: any) => grn.poNo === poNo);
          if (hasGRN) {
            // Sudah diproses dari GRN, skip
            return;
          }

          // Cari productId dari PO
          const productId = findProductIdFromPO(po);
          if (!productId) {
            console.warn(`⚠️ [PO Inventory] Product ID tidak ditemukan untuk PO ${poNo} (productItem: ${po.productItem || po.materialItem || 'N/A'}). Skip.`);
            return;
          }

          // Cek apakah product adalah turunan, jika ya gunakan parent product ID untuk inventory
          let originalProductId = (productId || '').toString().trim();
          let inventoryProductId = originalProductId;
          const product = safeProducts.find((p: any) => 
            (p.product_id || p.kode || '').toString().trim().toLowerCase() === originalProductId.toLowerCase()
          );
          
          if (product && product.isTurunan && product.parentProductId) {
            const parentProduct = safeProducts.find((p: any) => p.id === product.parentProductId);
            if (parentProduct) {
              inventoryProductId = (parentProduct.product_id || parentProduct.kode || '').toString().trim();
              console.log(`[PO Inventory] Product turunan detected: ${product.nama} (${originalProductId}) -> Using parent: ${parentProduct.nama} (${inventoryProductId})`);
            }
          }
          
          const key = (inventoryProductId || '').toString().trim().toLowerCase();
          let item = inventoryMap.get(key);

          // Ambil price dari PO atau product master (gunakan product asli untuk price, bukan parent)
          const priceFromPO = parseFloat(po.price) || 0;
          const productForPrice = productsMap.get(originalProductId);
          const priceFromProduct = productForPrice ? (productForPrice.price || productForPrice.hargaSales || 0) : 0;
          const finalPrice = priceFromPO > 0 ? priceFromPO : priceFromProduct;
          
          // Ambil harga beli dari product master (prioritas: harga > hargaBeli > 0)
          const hargaBeliFromProduct = productForPrice ? (productForPrice.harga || productForPrice.hargaBeli || 0) : 0;
          const hargaBeliFromPO = parseFloat(po.hargaBeli || po.harga || 0) || 0;
          const finalHargaBeli = hargaBeliFromPO > 0 ? hargaBeliFromPO : hargaBeliFromProduct;

          if (!item) {
            if (!product) {
              console.warn(`⚠️ [PO Inventory] Product tidak ditemukan di master: ${originalProductId}`);
              return;
            }

            // Gunakan parent product untuk inventory jika turunan
            const inventoryProduct = product && product.isTurunan && product.parentProductId
              ? safeProducts.find((p: any) => p.id === product.parentProductId)
              : product;
            
            // Ambil harga beli dari parent product jika turunan
            const parentProductForHargaBeli = inventoryProduct && inventoryProduct !== product
              ? safeProducts.find((p: any) => (p.product_id || p.kode || '').toString().trim().toLowerCase() === (inventoryProduct.product_id || inventoryProduct.kode || '').toString().trim().toLowerCase())
              : null;
            const hargaBeliFromParent = parentProductForHargaBeli ? (parentProductForHargaBeli.harga || parentProductForHargaBeli.hargaBeli || 0) : 0;
            const finalHargaBeliForItem = hargaBeliFromPO > 0 ? hargaBeliFromPO : (hargaBeliFromParent > 0 ? hargaBeliFromParent : hargaBeliFromProduct);
            
            item = {
              id: Date.now().toString() + key,
              supplierName: po.supplier || (inventoryProduct?.supplier || ''),
              codeItem: inventoryProductId, // Gunakan parent product ID jika turunan
              description: po.productItem || po.materialItem || (inventoryProduct?.nama || ''),
              kategori: inventoryProduct?.kategori || 'Product',
              satuan: inventoryProduct?.satuan || inventoryProduct?.unit || 'PCS',
              price: finalPrice,
              hargaBeli: finalHargaBeliForItem, // Set harga beli dari product master atau PO
              stockPremonth: 0,
              receive: 0,
              outgoing: 0,
              return: 0,
              nextStock: 0,
              processedGRNs: [],
              processedDeliveries: [],
            };
            inventoryMap.set(key, item);
          } else {
            // Update price dari PO jika ada
            if (priceFromPO > 0) {
              item.price = priceFromPO;
            }
            // Update harga beli dari PO atau product master jika belum ada
            if (!item.hargaBeli || item.hargaBeli === 0) {
              item.hargaBeli = finalHargaBeli;
            } else if (hargaBeliFromPO > 0) {
              // Update dengan harga beli dari PO jika ada (ambil yang terbaru)
              item.hargaBeli = hargaBeliFromPO;
            }
          }

          // Anti-duplicate: cek apakah PO ini sudah diproses (via processedGRNs dengan key PO)
          if (!item.processedGRNs) item.processedGRNs = [];
          const poKey = `PO_${poNo}`;
          if (item.processedGRNs.includes(poKey)) {
            console.log(`⏭️  [PO Inventory] PO ${poNo} sudah pernah diproses untuk product ${originalProductId}. Skip.`);
            return;
          }

          // Update receive dengan qty dari PO (bulatkan qty)
          const qtyRounded = Math.round(po.qty || 0);
          item.receive = (item.receive || 0) + qtyRounded;
          item.processedGRNs.push(poKey);
          
          console.log(`✅ [PO Inventory] Product inventory updated (RECEIVE from PO ${poNo} - CLOSE tanpa GRN):`);
          console.log(`   Product: ${po.productItem || product?.nama || 'N/A'} (${originalProductId})`);
          console.log(`   PO: ${poNo}`);
          console.log(`   Receive: +${qtyRounded} | Price: ${finalPrice}`);
        });

      // 2. PRODUCT OUTGOING: dari Delivery Note (barang keluar)
      safeDelivery.forEach((delivery: any) => {
        if (!delivery.items || !Array.isArray(delivery.items)) return;
        if (!delivery.id) return; // Pastikan delivery punya ID untuk tracking

        delivery.items.forEach((item: any) => {
          // Di GT, item bisa punya productId atau productKode langsung (tidak perlu SPK)
          const productId = item.productId || item.productKode || '';
          if (!productId) return;

          // Cek apakah product adalah turunan, jika ya gunakan parent product ID untuk inventory
          let originalProductId = (productId || '').toString().trim();
          let inventoryProductId = originalProductId;
          const productFromList = safeProducts.find((p: any) => 
            (p.product_id || p.kode || '').toString().trim().toLowerCase() === originalProductId.toLowerCase()
          );
          
          if (productFromList && productFromList.isTurunan && productFromList.parentProductId) {
            const parentProduct = safeProducts.find((p: any) => p.id === productFromList.parentProductId);
            if (parentProduct) {
              inventoryProductId = (parentProduct.product_id || parentProduct.kode || '').toString().trim();
              console.log(`[Delivery Inventory] Product turunan detected: ${productFromList.nama} (${originalProductId}) -> Using parent: ${parentProduct.nama} (${inventoryProductId})`);
            }
          }
          
          const key = (inventoryProductId || '').toString().trim().toLowerCase();
          let inventoryItem = inventoryMap.get(key);
          
          // Ambil price dari salesOrders atau product master (gunakan product asli untuk price, bukan parent)
          const priceFromSO = productPriceMap.get(key);
          const productForPrice = productsMap.get(originalProductId);
          const priceFromProduct = productForPrice ? (productForPrice.price || productForPrice.hargaSales || 0) : 0;
          const finalPrice = priceFromSO !== undefined ? priceFromSO : priceFromProduct;
          
          // Ambil harga beli dari product master (prioritas: harga > hargaBeli > 0)
          const hargaBeliFromProduct = productForPrice ? (productForPrice.harga || productForPrice.hargaBeli || 0) : 0;
          
          if (!inventoryItem) {
            // Gunakan parent product untuk inventory jika turunan
            const inventoryProduct = productFromList && productFromList.isTurunan && productFromList.parentProductId
              ? safeProducts.find((p: any) => p.id === productFromList.parentProductId)
              : productFromList;
            
            if (!inventoryProduct) {
              console.warn(`⚠️ [Delivery Inventory] Product tidak ditemukan di master: ${originalProductId}`);
              return;
            }
            
            // Ambil harga beli dari parent product jika turunan
            const parentProductForHargaBeli = inventoryProduct && inventoryProduct !== productFromList
              ? safeProducts.find((p: any) => (p.product_id || p.kode || '').toString().trim().toLowerCase() === (inventoryProduct.product_id || inventoryProduct.kode || '').toString().trim().toLowerCase())
              : null;
            const hargaBeliFromParent = parentProductForHargaBeli ? (parentProductForHargaBeli.harga || parentProductForHargaBeli.hargaBeli || 0) : 0;
            const finalHargaBeliForItem = hargaBeliFromParent > 0 ? hargaBeliFromParent : hargaBeliFromProduct;
            
            inventoryItem = {
              id: Date.now().toString() + key,
              supplierName: delivery.customer || inventoryProduct.customer || '',
              codeItem: inventoryProductId, // Gunakan parent product ID jika turunan
              description: item.product || item.productName || inventoryProduct.nama || '',
              kategori: inventoryProduct.kategori || 'Product',
              satuan: item.unit || inventoryProduct.satuan || inventoryProduct.unit || 'PCS',
              price: finalPrice,
              hargaBeli: finalHargaBeliForItem, // Set harga beli dari product master
              stockPremonth: 0,
              receive: 0,
              outgoing: 0,
              return: 0,
              nextStock: 0,
              processedGRNs: [],
              processedDeliveries: [],
            };
            inventoryMap.set(key, inventoryItem);
          } else {
            // Update price dari salesOrders jika ada
            if (priceFromSO !== undefined) {
              inventoryItem.price = priceFromSO;
            }
            // Update harga beli dari product master jika belum ada
            if (!inventoryItem.hargaBeli || inventoryItem.hargaBeli === 0) {
              inventoryItem.hargaBeli = hargaBeliFromProduct;
            }
          }

          // Anti-duplicate: gunakan delivery.id + productId untuk tracking
          if (!inventoryItem.processedDeliveries) inventoryItem.processedDeliveries = [];
          const deliveryKey = `DEL_${delivery.id}_${originalProductId}`;
          if (inventoryItem.processedDeliveries.includes(deliveryKey)) {
            console.log(`⏭️  Skipping duplicate: Delivery ${delivery.id}, Product ${originalProductId}`);
            return; // Skip kalau delivery item ini sudah diproses
          }

          // Update outgoing (bulatkan qty, tidak pakai decimal)
          const qty = parseFloat(item.qty) || 0;
          const qtyRounded = Math.round(qty);
          const oldOutgoing = inventoryItem.outgoing || 0;
          inventoryItem.outgoing = oldOutgoing + qtyRounded;
          
          console.log(`📤 Outgoing updated: Product ${originalProductId}, +${qtyRounded} (from Delivery ${delivery.id}), Total: ${inventoryItem.outgoing}`);
          
          // Mark delivery item ini sudah diproses
          inventoryItem.processedDeliveries.push(deliveryKey);
        });
      });

      let outgoingFixCount = 0;
      const recalculatedInventory = Array.from(inventoryMap.values()).map(item => {
        const stockPremonth = item.stockPremonth || 0;
        const receiveQty = item.receive || 0;
        const outgoingQty = item.outgoing || 0;
        const maxOutgoing = stockPremonth + receiveQty; // Rumus: premonth + received
        let adjustedOutgoing = outgoingQty;
        let anomaly: string | undefined = item.anomaly;
        let anomalyDetail: string | undefined = item.anomalyDetail;

        if (outgoingQty > maxOutgoing) {
          outgoingFixCount += 1;
          adjustedOutgoing = maxOutgoing;
          anomaly = 'OUTGOING_GT_RECEIVE';
          anomalyDetail = `Outgoing ${outgoingQty} > tersedia ${maxOutgoing}. Sistem auto-adjust ketika recalculation.`;
        }

        // Rumus: premonth + received - outgoing = next stock
        return {
          ...item,
          outgoing: adjustedOutgoing,
          nextStock: stockPremonth + receiveQty - adjustedOutgoing,
          anomaly,
          anomalyDetail,
          lastUpdate: new Date().toISOString(),
        };
      });

      // Save dan update state
      await storageService.set(StorageKeys.GENERAL_TRADING.INVENTORY, recalculatedInventory);
      setInventory(recalculatedInventory);
      
      let message = `✅ Inventory berhasil di-recalculate dari source data! Total items: ${recalculatedInventory.length}`;
      if (outgoingFixCount > 0) {
        message += `. ⚠️ ${outgoingFixCount} item memiliki outgoing > stok tersedia dan sudah otomatis dikoreksi.`;
      }
      setSuccessMessage(message);
      setError('');
    } catch (error: any) {
      setError(`Gagal recalculate inventory: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await recalculateInventory();
  };

  const columns = [
    { 
      key: 'supplierName', 
      header: 'Supplier Name',
    },
    {
      key: 'image',
      header: 'Foto',
      render: (item: InventoryItem) => {
        // Find product by codeItem to get productId
        const product = products.find((p: any) => {
          const pCode = (p.product_id || p.kode || '').toString().trim();
          return pCode === (item.codeItem || '').toString().trim();
        });
        
        if (!product) {
          return (
            <div style={{
              width: '50px',
              height: '50px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '4px',
              border: '1px dashed var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              fontSize: '10px',
              textAlign: 'center',
              padding: '4px'
            }}>
              No Image
            </div>
          );
        }
        
        const imageEntry = productImages[product.id];
        const imageData = getImageData(imageEntry);
        if (imageData) {
          return (
            <img 
              src={imageData} 
              alt={item.description}
              style={{
                width: '50px',
                height: '50px',
                objectFit: 'cover',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                cursor: 'pointer'
              }}
              onClick={() => console.log('Image clicked:', item.description || item.codeItem || 'Product Image')}
            />
          );
        }
        return (
          <div style={{
            width: '50px',
            height: '50px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '4px',
            border: '1px dashed var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            fontSize: '10px',
            textAlign: 'center',
            padding: '4px'
          }}>
            No Image
          </div>
        );
      },
    },
    {
      key: 'codeItem',
      header: 'CODE item',
      render: (item: InventoryItem) => (
        <span 
          style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--primary)' }}
          onClick={() => setSelectedInventoryForDetail(item)}
          title="Klik untuk lihat detail inventory"
        >
          {item.codeItem}
        </span>
      ),
    },
    { key: 'description', header: 'DESCRIPTION/Nama Item' },
    { key: 'kategori', header: 'Kategori' },
    { key: 'satuan', header: 'Satuan/UOM' },
    {
      key: 'hargaBeli',
      header: 'Harga Beli',
      render: (item: InventoryItem) => {
        const hargaBeli = item.hargaBeli || 0;
        return hargaBeli > 0 ? `Rp ${hargaBeli.toLocaleString('id-ID')}` : '-';
      },
    },
    {
      key: 'price',
      header: 'Harga Jual',
      render: (item: InventoryItem) => {
        const hargaJual = item.price || 0;
        return hargaJual > 0 ? `Rp ${hargaJual.toLocaleString('id-ID')}` : '-';
      },
    },
    {
      key: 'stockPremonth',
      header: 'STOCK/Premonth',
      render: (item: InventoryItem) => (item.stockPremonth || 0).toLocaleString('id-ID'),
    },
    {
      key: 'receive',
      header: 'Receive (dari GRN)',
      render: (item: InventoryItem) => (item.receive || 0).toLocaleString('id-ID'),
    },
    {
      key: 'outgoing',
      header: 'Outgoing (untuk Delivery)',
      render: (item: InventoryItem) => (item.outgoing || 0).toLocaleString('id-ID'),
    },
    {
      key: 'anomaly',
      header: 'Warning',
      render: (item: InventoryItem) => {
        if (!item.anomaly) return '-';
        return (
          <span style={{ color: '#f44336', fontWeight: 600 }}>
            ⚠️ {item.anomaly === 'OUTGOING_GT_RECEIVE' ? 'Outgoing > Stock' : item.anomaly}
          </span>
        );
      },
    },
    {
      key: 'return',
      header: 'Return',
      render: (item: InventoryItem) => (item.return || 0).toLocaleString('id-ID'),
    },
    {
      key: 'nextStock',
      header: 'Next Stock',
      render: (item: InventoryItem) => {
        // Rumus: premonth + received - outgoing = next stock
        const nextStock = (item.stockPremonth || 0) + (item.receive || 0) - (item.outgoing || 0);
        return (
          <span style={{ fontWeight: 'bold', color: nextStock < 0 ? '#f44336' : 'var(--text-primary)' }}>
            {nextStock.toLocaleString('id-ID')}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: InventoryItem) => (
        <InventoryActionMenu
          item={item}
          onEdit={() => {
            setEditingInventory(item);
            setEditFormData({
              supplierName: item.supplierName || '',
              description: item.description || '',
              kategori: item.kategori || '',
              satuan: item.satuan || 'PCS',
              hargaBeli: item.hargaBeli || 0,
              price: item.price || 0,
              stockPremonth: item.stockPremonth || 0,
            });
          }}
        />
      ),
    },
  ];

  // Action Menu Component
  const InventoryActionMenu = ({ item, onEdit }: { item: InventoryItem; onEdit: () => void }) => {
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
        <div ref={buttonRef}
          onClick={() => setShowMenu(!showMenu)}
          style={{
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '4px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            color: 'var(--text-secondary)',
            userSelect: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          ⋯
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
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              zIndex: 1000,
              minWidth: '150px',
              padding: '4px',
            }}
          >
            <button
              onClick={() => { onEdit(); setShowMenu(false); }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '13px',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              ✏️ Edit
            </button>
          </div>
        )}
      </>
    );
  };

  const handleSaveEdit = async () => {
    if (!editingInventory) return;
    
    try {
      setLoading(true);
      setError('');
      
      const updatedInventory = inventory.map(item => 
        item.id === editingInventory.id
          ? {
              ...item,
              ...editFormData,
              nextStock: (editFormData.stockPremonth || item.stockPremonth || 0) + 
                         (item.receive || 0) - 
                         (item.outgoing || 0) + 
                         (item.return || 0),
              lastUpdate: new Date().toISOString(),
            }
          : item
      );
      
      await storageService.set(StorageKeys.GENERAL_TRADING.INVENTORY, updatedInventory);
      setInventory(updatedInventory);
      setEditingInventory(null);
      setEditFormData({});
      setSuccessMessage('✅ Inventory berhasil di-update!');
    } catch (error: any) {
      setError(`Gagal update inventory: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="master-compact">
      <div className="page-header">
    <div>
          <h1 style={{ marginBottom: '8px' }}>Inventory</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            onClick={handleRefresh}
            disabled={loading}
            style={{ fontSize: '14px', padding: '8px 16px' }}
          >
            {loading ? 'Loading...' : '🔄 Refresh'}
          </Button>
          <Button
            variant="secondary"
            onClick={handleExportExcel}
            style={{ fontSize: '14px', padding: '8px 16px' }}
          >
            📥 Export Excel
          </Button>
          <Button
            variant="secondary"
            onClick={handleDownloadTemplate}
            style={{ fontSize: '14px', padding: '8px 16px' }}
          >
            📋 Download Template
          </Button>
          <Button
            variant="primary"
            onClick={handleImportExcel}
            disabled={importLoading}
            style={{ fontSize: '14px', padding: '8px 16px' }}
          >
            {importLoading ? 'Importing...' : '📤 Import Stock Opname'}
          </Button>
          </div>
        </div>

      {/* Inventory Table */}
      <Card>
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Kode Item, Nama Item, or Supplier Name..."
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
        {error && (
          <div style={{ 
            padding: '16px', 
            marginBottom: '16px', 
            backgroundColor: '#fee', 
            border: '1px solid #fcc', 
            borderRadius: '6px',
            color: '#c33'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <strong>⚠️ Error:</strong> {error}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {error.includes('corrupt') || error.includes('invalid') ? (
                  <button 
                    onClick={handleResetData}
                    disabled={loading}
                    style={{ 
                      padding: '6px 12px', 
                      backgroundColor: '#c33', 
                      border: 'none',
                      borderRadius: '4px',
                      color: 'white',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    🔄 Reset Data
                  </button>
                ) : null}
                <button 
                  onClick={() => setError('')}
                  style={{ 
                    padding: '6px 12px', 
                    backgroundColor: 'transparent', 
                    border: '1px solid #c33',
                    borderRadius: '4px',
                    color: '#c33',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
        {successMessage && (
          <div style={{ 
            padding: '16px', 
            marginBottom: '16px', 
            backgroundColor: '#efe', 
            border: '1px solid #cfc', 
            borderRadius: '6px',
            color: '#363'
          }}>
            <strong>✅ Sukses:</strong> {successMessage}
            <button 
              onClick={() => setSuccessMessage('')}
              style={{ 
                marginLeft: '12px', 
                padding: '4px 8px', 
                backgroundColor: 'transparent', 
                border: '1px solid #363',
                borderRadius: '4px',
                color: '#363',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Tutup
            </button>
          </div>
        )}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading inventory...
            </div>
        ) : filteredInventory.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            {error ? 'Tidak ada data yang bisa ditampilkan karena terjadi error.' : searchQuery ? 'No items found matching your search.' : 'No inventory data. Click "Import Stock Opname" to import from Excel.'}
            </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={paginatedInventory}
              emptyMessage="No inventory data available"
            />
            
            {/* Pagination Controls */}
            {(totalPages > 1 || filteredInventory.length > 0) && (
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
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredInventory.length)} of {filteredInventory.length} items
                  {searchQuery && ` (filtered from ${inventory.length} total)`}
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
          </>
        )}
        
        {/* Inventory Detail Dialog */}
        {selectedInventoryForDetail && (
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
            onClick={() => setSelectedInventoryForDetail(null)}
          >
            <Card 
              title={`Detail Inventory: ${selectedInventoryForDetail.description}`}
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
                  <strong>Code Item:</strong> {selectedInventoryForDetail.codeItem}
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <strong>Description:</strong> {selectedInventoryForDetail.description}
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <strong>Supplier:</strong> {selectedInventoryForDetail.supplierName || '-'}
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <strong>Kategori:</strong> {selectedInventoryForDetail.kategori || '-'}
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <strong>Satuan:</strong> {selectedInventoryForDetail.satuan || '-'}
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <strong>Price:</strong> Rp {selectedInventoryForDetail.price?.toLocaleString('id-ID') || '0'}
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <strong>Stock Premonth:</strong> {selectedInventoryForDetail.stockPremonth || 0} {selectedInventoryForDetail.satuan || 'PCS'}
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <strong>Receive:</strong> {selectedInventoryForDetail.receive || 0} {selectedInventoryForDetail.satuan || 'PCS'}
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <strong>Outgoing:</strong> {selectedInventoryForDetail.outgoing || 0} {selectedInventoryForDetail.satuan || 'PCS'}
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <strong>Return:</strong> {selectedInventoryForDetail.return || 0} {selectedInventoryForDetail.satuan || 'PCS'}
                </div>
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
                  <strong>Next Stock:</strong> <span style={{ fontSize: '18px', color: 'var(--primary)', fontWeight: 'bold' }}>{selectedInventoryForDetail.nextStock || 0} {selectedInventoryForDetail.satuan || 'PCS'}</span>
                </div>
                
                {/* Info Product Turunan */}
                {(() => {
                  const product = products.find((p: any) => {
                    const pCode = (p.product_id || p.kode || '').toString().trim();
                    return pCode === (selectedInventoryForDetail.codeItem || '').toString().trim();
                  });
                  
                  if (product && product.isTurunan && product.parentProductId) {
                    const parentProduct = products.find((p: any) => p.id === product.parentProductId);
                    return (
                      <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fff3cd', borderRadius: '6px', border: '1px solid #ffc107' }}>
                        <strong style={{ color: '#856404' }}>⚠️ Product Turunan</strong>
                        <div style={{ marginTop: '8px' }}>
                          <strong>Product ini adalah turunan dari:</strong>
                          {parentProduct ? (
                            <div style={{ marginLeft: '16px', marginTop: '4px' }}>
                              <div>• Kode: {parentProduct.kode}</div>
                              <div>• Nama: {parentProduct.nama}</div>
                              <div style={{ marginTop: '8px', fontSize: '12px', color: '#856404' }}>
                                💡 Stok inventory menggunakan parent product code ({parentProduct.kode})
                              </div>
                            </div>
                          ) : '-'}
                        </div>
                      </div>
                    );
                  }
                  
                  // Cek apakah ada product turunan yang menggunakan inventory ini
                  const turunanProducts = products.filter((p: any) => {
                    if (!p.isTurunan || !p.parentProductId) return false;
                    const parentProduct = products.find((pp: any) => pp.id === p.parentProductId);
                    if (!parentProduct) return false;
                    const parentCode = (parentProduct.product_id || parentProduct.kode || '').toString().trim();
                    return parentCode === (selectedInventoryForDetail.codeItem || '').toString().trim();
                  });
                  
                  if (turunanProducts.length > 0) {
                    return (
                      <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#d1ecf1', borderRadius: '6px', border: '1px solid #0c5460' }}>
                        <strong style={{ color: '#0c5460' }}>📦 Product Parent</strong>
                        <div style={{ marginTop: '8px' }}>
                          <strong>Product Turunan yang menggunakan stok ini:</strong>
                          <div style={{ marginLeft: '16px', marginTop: '4px' }}>
                            {turunanProducts.map((turunan, idx) => (
                              <div key={idx} style={{ marginBottom: '4px' }}>
                                • {turunan.kode} - {turunan.nama}
                              </div>
                            ))}
                          </div>
                          <div style={{ marginTop: '8px', fontSize: '12px', color: '#0c5460' }}>
                            💡 Semua product turunan menggunakan stok dari parent product ini
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  return null;
                })()}
                
                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                  <Button onClick={() => setSelectedInventoryForDetail(null)}>Tutup</Button>
                </div>
              </div>
            </Card>
          </div>
        )}
        
        {filteredInventory.length > 0 && (
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
              <strong>Total Items:</strong> {filteredInventory.length} item(s)
            </p>
          </div>
        )}
      </Card>
      
      {/* Edit Inventory Dialog */}
      {editingInventory && (
        <div 
          className="dialog-overlay"
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
          onClick={() => {
            setEditingInventory(null);
            setEditFormData({});
          }}
        >
          <Card 
            className="dialog-card"
            title={`Edit Inventory: ${editingInventory.codeItem}`}
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
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Supplier Name
                </label>
                <Input
                  type="text"
                  value={editFormData.supplierName || ''}
                  onChange={(v) => setEditFormData({ ...editFormData, supplierName: v })}
                  placeholder="Supplier Name"
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Description
                </label>
                <Input
                  type="text"
                  value={editFormData.description || ''}
                  onChange={(v) => setEditFormData({ ...editFormData, description: v })}
                  placeholder="Description"
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Kategori
                </label>
                <Input
                  type="text"
                  value={editFormData.kategori || ''}
                  onChange={(v) => setEditFormData({ ...editFormData, kategori: v })}
                  placeholder="Kategori"
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Satuan/UOM
                </label>
                <Input
                  type="text"
                  value={editFormData.satuan || ''}
                  onChange={(v) => setEditFormData({ ...editFormData, satuan: v })}
                  placeholder="Satuan"
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Harga Beli
                </label>
                <Input
                  type="number"
                  value={String(editFormData.hargaBeli || 0)}
                  onChange={(v) => setEditFormData({ ...editFormData, hargaBeli: parseFloat(v) || 0 })}
                  placeholder="Harga Beli"
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Harga Jual
                </label>
                <Input
                  type="number"
                  value={String(editFormData.price || 0)}
                  onChange={(v) => setEditFormData({ ...editFormData, price: parseFloat(v) || 0 })}
                  placeholder="Harga Jual"
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Stock Premonth
                </label>
                <Input
                  type="number"
                  value={String(editFormData.stockPremonth || 0)}
                  onChange={(v) => setEditFormData({ ...editFormData, stockPremonth: parseFloat(v) || 0 })}
                  placeholder="Stock Premonth"
                />
              </div>
              
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    setEditingInventory(null);
                    setEditFormData({});
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleSaveEdit}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Inventory;

