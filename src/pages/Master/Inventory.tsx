import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { storageService, extractStorageValue } from '../../services/storage';
import { filterActiveItems } from '../../utils/data-persistence-helper';
import { getCurrentUser } from '../../utils/access-control-helper';
import { logCreate } from '../../utils/activity-logger';
import { useDialog } from '../../hooks/useDialog';
import '../../styles/common.css';
import './Inventory.css';
import './Master.css';

interface InventoryItem {
  id: string;
  supplierName: string;
  codeItem: string;
  description: string;
  kategori: string;
  satuan: string;
  price: number;
  stockPremonth: number;
  receive: number;
  outgoing: number;
  return: number;
  nextStock: number; // Calculated: stockPremonth + receive - outgoing + return
  lastUpdate?: string;
  anomaly?: string;
  anomalyDetail?: string;
  padCode?: string; // PAD Code untuk product (diambil dari master product)
  stockDocumentation?: string; // Base64 atau path untuk dokumentasi stock (optional)
  // Tracking untuk anti-duplicate
  processedPOs?: string[]; // PO numbers yang sudah diproses (untuk material: RECEIVE dari GRN dan OUTGOING dari Production)
  processedSPKs?: string[]; // SPK numbers yang sudah diproses (untuk product: RECEIVE dari QC PASS dan OUTGOING dari Delivery)
  processedGRNs?: string[]; // GRN numbers yang sudah diproses (untuk material: RECEIVE dari GRN dengan soNo kosong - PO tanpa SO)
}

interface Material {
  id: string;
  kode: string;
  nama: string;
  satuan: string;
  kategori: string;
  supplier: string;
  harga?: number;
  priceMtr?: number;
}

interface Supplier {
  id: string;
  kode: string;
  nama: string;
}

const Inventory = () => {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'material' | 'product'>('material');
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [showAddInventoryDialog, setShowAddInventoryDialog] = useState(false);
  const [addInventoryForm, setAddInventoryForm] = useState({
    selectedMaterialId: '',
    supplierName: '',
    codeItem: '',
    description: '',
    kategori: '',
    satuan: 'PCS',
    price: '',
    stockPremonth: '',
    stockDocumentation: '',
  });
  const [materials, setMaterials] = useState<Material[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockDocFile, setStockDocFile] = useState<File | null>(null);
  const { showAlert } = useDialog();
  const [receiptData, setReceiptData] = useState<{
    stockOpname: Array<{ date: string; qty: number; source: string }>;
    purchasing: Array<{ date: string; qty: number; grnNo: string; poNo: string; supplier: string }>;
  }>({ stockOpname: [], purchasing: [] });

  useEffect(() => {
    loadInventory();
    loadMaterials();
    loadSuppliers();
  }, []);

  const loadMaterials = async () => {
    try {
      const data = extractStorageValue(await storageService.get<Material[]>('materials')) || [];
      setMaterials(data);
    } catch (error) {
      console.error('Error loading materials:', error);
    }
  };

  const loadSuppliers = async () => {
    try {
      const data = extractStorageValue(await storageService.get<Supplier[]>('suppliers')) || [];
      setSuppliers(data);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const handleMaterialSelect = (materialId: string) => {
    const selectedMaterial = materials.find(m => m.id === materialId);
    if (selectedMaterial) {
      // Auto-fill dari master material
      setAddInventoryForm({
        ...addInventoryForm,
        selectedMaterialId: materialId,
        codeItem: selectedMaterial.kode || '',
        description: selectedMaterial.nama || '',
        kategori: selectedMaterial.kategori || '',
        satuan: selectedMaterial.satuan || 'PCS',
        price: String(selectedMaterial.harga || selectedMaterial.priceMtr || 0),
        supplierName: selectedMaterial.supplier || '',
      });
    }
  };

  const handleStockDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit file size to 5MB
    if (file.size > 5 * 1024 * 1024) {
      showAlert('File terlalu besar. Maksimal 5MB.', 'Error');
      return;
    }

    setStockDocFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setAddInventoryForm({ ...addInventoryForm, stockDocumentation: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleAddInventory = async () => {
    if (!addInventoryForm.codeItem.trim() || !addInventoryForm.description.trim()) {
      showAlert('Code Item dan Description wajib diisi.', 'Validation Error');
      return;
    }

    if (!addInventoryForm.stockPremonth || parseFloat(addInventoryForm.stockPremonth) < 0) {
      showAlert('Stock Premonth wajib diisi dan harus >= 0.', 'Validation Error');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const existingInventory = extractStorageValue(await storageService.get<InventoryItem[]>('inventory'));
      const currentUser = getCurrentUser();
      const userIdentifier = currentUser ? `${currentUser.fullName} (@${currentUser.username})` : 'System';

      // Check for duplicate codeItem
      const isDuplicate = existingInventory.some(item => 
        item.codeItem.toLowerCase() === addInventoryForm.codeItem.trim().toLowerCase()
      );

      if (isDuplicate) {
        showAlert('Item dengan Code Item ini sudah ada.', 'Duplicate Entry');
        setLoading(false);
        return;
      }

      const newInventoryItem: InventoryItem = {
        id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        supplierName: addInventoryForm.supplierName.trim(),
        codeItem: addInventoryForm.codeItem.trim(),
        description: addInventoryForm.description.trim(),
        kategori: addInventoryForm.kategori || (activeTab === 'product' ? 'Product' : 'Material'),
        satuan: addInventoryForm.satuan.trim() || 'PCS',
        price: parseFloat(addInventoryForm.price) || 0,
        stockPremonth: parseFloat(addInventoryForm.stockPremonth) || 0,
        receive: 0,
        outgoing: 0,
        return: 0,
        nextStock: parseFloat(addInventoryForm.stockPremonth) || 0,
        lastUpdate: new Date().toISOString(),
        anomaly: '',
        anomalyDetail: '',
        stockDocumentation: addInventoryForm.stockDocumentation || undefined,
        processedPOs: [],
        processedSPKs: [],
        processedGRNs: [],
      };

      const updatedInventory = [...existingInventory, newInventoryItem];
      await storageService.set('inventory', updatedInventory);
      await logCreate('INVENTORY', newInventoryItem.id, '/packaging/master/inventory', {
        codeItem: newInventoryItem.codeItem,
        description: newInventoryItem.description,
        initialStock: newInventoryItem.stockPremonth,
        supplier: newInventoryItem.supplierName,
      });

      setSuccessMessage('✅ Inventory item added successfully!');
      setAddInventoryForm({
        selectedMaterialId: '',
        supplierName: '',
        codeItem: '',
        description: '',
        kategori: '',
        satuan: 'PCS',
        price: '',
        stockPremonth: '',
        stockDocumentation: '',
      });
      setStockDocFile(null);
      setShowAddInventoryDialog(false);
      loadInventory(); // Reload to show new item
    } catch (err: any) {
      setError(`Failed to add inventory: ${err.message}`);
    } finally {
      setLoading(false);
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
      if (key === 'inventory' || key === 'packaging/inventory') {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          console.log(`[Inventory] Storage changed for ${key}, reloading...`);
          loadInventory();
        }, 500); // Debounce 500ms
      }
    };

    window.addEventListener('app-storage-changed', handleStorageChange as EventListener);
    
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
      const rawData = await storageService.get<InventoryItem[]>('inventory');
      
      // Extract and validate data using global helper
      let data = extractStorageValue(rawData);
      
      // Filter out deleted items menggunakan helper function
      data = filterActiveItems(data);
      
      // IMPORTANT: Deduplicate berdasarkan codeItem (unique identifier)
      // Mencegah duplicate data dari sync atau multiple loads
      const seen = new Map<string, InventoryItem>();
      data.forEach((item: InventoryItem) => {
        const key = item.codeItem || item.id || '';
        if (key) {
          // Keep the latest version (by id or lastUpdate)
          const existing = seen.get(key);
          if (!existing || 
              (item.lastUpdate && existing.lastUpdate && item.lastUpdate > existing.lastUpdate) ||
              (item.id && existing.id && item.id > existing.id)) {
            seen.set(key, item);
          }
        }
      });
      data = Array.from(seen.values());
      
      console.log(`[Inventory] Loaded ${data.length} items (after deduplication)`);
      
      // If empty, just set empty array
      if (data.length === 0) {
        setInventory([]);
        return;
      }
      
      // Calculate nextStock for each item
      const calculatedData = data.map(item => {
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
          nextStock: stockPremonth + receiveQty - adjustedOutgoing + returnQty,
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

  const categorizeInventory = useMemo(() => {
    const isProduct = (item: InventoryItem) => {
      const kategori = (item.kategori || '').toLowerCase().trim();
      if (!kategori) return false;
      // Cek berbagai variasi kategori product
      return kategori === 'product' || 
             kategori === 'produk' ||
             kategori.includes('product') || 
             kategori.includes('finished') || 
             kategori.includes('fg') ||
             kategori.includes('finished goods');
    };
    const materialItems = inventory.filter(item => !isProduct(item));
    const productItems = inventory.filter(item => isProduct(item));
    return { materialItems, productItems };
  }, [inventory]);

  // Filter inventory based on search query + active tab
  const filteredInventory = useMemo(() => {
    const baseData = activeTab === 'product' ? categorizeInventory.productItems : categorizeInventory.materialItems;
    if (!searchQuery) return baseData;
    const query = searchQuery.toLowerCase();
    return baseData.filter(item =>
      (item.codeItem || '').toLowerCase().includes(query) ||
      (item.description || '').toLowerCase().includes(query) ||
      (item.supplierName || '').toLowerCase().includes(query)
    );
  }, [categorizeInventory, activeTab, searchQuery]);

  // Handle Manual Reset
  const handleResetData = async () => {
    try {
      setLoading(true);
      await storageService.set('inventory', []);
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
    input.accept = '.xlsx,.xls';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        setImportLoading(true);
        
        // Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        
        // Use xlsx library
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

        const defaultCategory = activeTab === 'product' ? 'Product' : 'Material';

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
            const existingIndex = inventory.findIndex(item => 
              item.codeItem.toLowerCase() === codeItem.toLowerCase()
            );

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
        const existingMap = new Map(inventory.map(item => [item.codeItem.toLowerCase(), item]));
        const merged: InventoryItem[] = [];

        newItems.forEach(newItem => {
          const key = newItem.codeItem.toLowerCase();
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

        // IMPORTANT: Deduplicate sebelum save (berdasarkan codeItem)
        const deduplicatedMap = new Map<string, InventoryItem>();
        merged.forEach((item: InventoryItem) => {
          const key = (item.codeItem || item.id || '').toLowerCase();
          if (key) {
            const existing = deduplicatedMap.get(key);
            if (!existing || 
                (item.lastUpdate && existing.lastUpdate && item.lastUpdate > existing.lastUpdate) ||
                (item.id && existing.id && item.id > existing.id)) {
              deduplicatedMap.set(key, item);
            }
          }
        });
        const deduplicated = Array.from(deduplicatedMap.values());
        
        console.log(`[Inventory] Imported ${newItems.length} items, total ${deduplicated.length} items (after deduplication)`);

        // Save to storage
        await storageService.set('inventory', deduplicated);
        setInventory(deduplicated);
        
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
      XLSX.utils.book_append_sheet(wb, ws, activeTab === 'product' ? 'Products Inventory' : 'Materials Inventory');
      
      const fileName = `Inventory_${activeTab === 'product' ? 'Products' : 'Materials'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      setSuccessMessage(`✅ Berhasil export ${dataToExport.length} ${activeTab === 'product' ? 'products' : 'materials'} ke ${fileName}`);
      setError('');
    } catch (error: any) {
      setError(`Gagal export ke Excel: ${error.message}`);
    }
  };

  const recalculateInventory = async () => {
    try {
      setLoading(true);
      
      // Load semua data source
      const [existingInventory, purchaseOrders, productionResults, qcData, deliveryData, materialsData, productsData, spkData, salesOrdersData, grnData] = await Promise.all([
        storageService.get<InventoryItem[]>('inventory'),
        storageService.get<any[]>('purchaseOrders'),
        storageService.get<any[]>('productionResults'),
        storageService.get<any[]>('qc'),
        storageService.get<any[]>('delivery'),
        storageService.get<any[]>('materials'),
        storageService.get<any[]>('products'),
        storageService.get<any[]>('spk'),
        storageService.get<any[]>('salesOrders'),
        storageService.get<any[]>('grn'),
      ]);

      // Extract and ensure arrays (null safety)
      const safeInventory = extractStorageValue(existingInventory);
      const safePOs = extractStorageValue(purchaseOrders);
      const safeProductionResults = extractStorageValue(productionResults);
      const safeQC = extractStorageValue(qcData);
      const safeDelivery = extractStorageValue(deliveryData);
      const safeMaterials = extractStorageValue(materialsData);
      const safeProducts = extractStorageValue(productsData);
      const safeSPK = extractStorageValue(spkData);
      const safeSalesOrders = extractStorageValue(salesOrdersData);
      const safeGRN = extractStorageValue(grnData);

      // Create maps untuk lookup
      const materialsMap = new Map(safeMaterials.map((m: any) => [m.material_id || m.kode, m]));
      const productsMap = new Map(safeProducts.map((p: any) => [p.product_id || p.kode, p]));
      const spkMap = new Map(safeSPK.map((s: any) => [s.spkNo, s]));
      
      // Map untuk price material dari purchaseOrders (ambil yang terbaru berdasarkan created date)
      const materialPriceMap = new Map<string, number>();
      safePOs
        .filter((po: any) => po.materialId && po.price)
        .sort((a: any, b: any) => {
          // Sort by created date descending (terbaru dulu)
          const dateA = new Date(a.created || 0).getTime();
          const dateB = new Date(b.created || 0).getTime();
          return dateB - dateA;
        })
        .forEach((po: any) => {
          const materialId = (po.materialId || '').toString().trim().toLowerCase();
          // Ambil price dari PO terbaru untuk setiap materialId
          if (!materialPriceMap.has(materialId)) {
            materialPriceMap.set(materialId, parseFloat(po.price) || 0);
          }
        });
      
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

      // Initialize inventory map dari existing (preserve stockPremonth, price, dll)
      const inventoryMap = new Map<string, InventoryItem>();
      safeInventory.forEach(item => {
        const key = item.codeItem.toLowerCase();
        // Update price dari salesOrders jika ada, preserve yang lain
        const priceFromSO = productPriceMap.get(key);
        const finalPrice = priceFromSO !== undefined ? priceFromSO : item.price;
        
        // Update padCode dari product jika ada
        const product = productsMap.get(item.codeItem);
        const padCode = product?.padCode || item.padCode || '';
        
        inventoryMap.set(key, {
          ...item,
          price: finalPrice,
          padCode: padCode,
          receive: 0,
          outgoing: 0,
          return: 0,
          processedPOs: [],
          processedSPKs: [],
          processedGRNs: [],
        });
      });

      // 1. MATERIAL RECEIVE: dari PO yang CLOSE dan ada receiptDate
      safePOs
        .filter((po: any) => po.status === 'CLOSE' && po.receiptDate)
        .forEach((po: any) => {
          const materialId = po.materialId;
          const poNo = po.poNo;
          if (!materialId || !poNo) return;

          const key = (materialId || '').toString().trim().toLowerCase();
          const originalMaterialId = (materialId || '').toString().trim();
          let item = inventoryMap.get(key);
          
          // Ambil price dari purchaseOrders (prioritas utama)
          const priceFromPO = materialPriceMap.get(key) || parseFloat(po.price) || 0;
          
          if (!item) {
            const material = materialsMap.get(originalMaterialId);
            if (!material) return;
            
            item = {
              id: Date.now().toString() + key,
              supplierName: po.supplier || material.supplier || '',
              codeItem: originalMaterialId,
              description: po.materialItem || material.nama || '',
              kategori: material.kategori || 'Material',
              satuan: material.satuan || 'PCS',
              price: priceFromPO || material.priceMtr || 0, // Prioritas: price dari PO
              stockPremonth: 0,
              receive: 0,
              outgoing: 0,
              return: 0,
              nextStock: 0,
              processedPOs: [],
              processedSPKs: [],
              processedGRNs: [],
            };
            inventoryMap.set(key, item);
          } else {
            // Update price dari purchaseOrders jika ada (ambil yang terbaru)
            if (priceFromPO > 0) {
              item.price = priceFromPO;
            }
          }

          // Anti-duplicate: cek apakah PO ini sudah diproses
          if (!item.processedPOs) item.processedPOs = [];
          if (item.processedPOs.includes(poNo)) return;

          // Update receive (bulatkan qty, tidak pakai decimal)
          const qtyRounded = Math.round(po.qty || 0);
          item.receive = (item.receive || 0) + qtyRounded;
          item.processedPOs.push(poNo);
        });

      // 1B. MATERIAL RECEIVE: dari GRN dengan soNo kosong (PO tanpa SO) - KHUSUS
      // Map PO untuk lookup price dan materialId
      const poMap = new Map(safePOs.map((po: any) => [po.poNo, po]));
      
      safeGRN
        .filter((grn: any) => !grn.soNo || grn.soNo === '') // Hanya GRN dengan soNo kosong
        .forEach((grn: any) => {
          const grnNo = grn.grnNo;
          const poNo = grn.poNo;
          if (!grnNo || !poNo) return;

          // Cari PO untuk ambil price dan materialId
          const po = poMap.get(poNo);
          if (!po) return;

          // Cari materialId dari GRN atau PO atau materialItem
          let materialId = grn.materialId || po.materialId || '';
          
          // Jika materialId masih kosong, cari dari materialItem
          if (!materialId && grn.materialItem) {
            const foundMaterial = safeMaterials.find((m: any) => {
              const materialName = (m.nama || '').toString().trim();
              const itemName = (grn.materialItem || '').toString().trim();
              return materialName === itemName || materialName.toLowerCase() === itemName.toLowerCase();
            });
            if (foundMaterial) {
              materialId = (foundMaterial.material_id || foundMaterial.kode || '').toString().trim();
            }
          }

          if (!materialId) {
            console.warn(`⚠️ [GRN Inventory] Material ID tidak ditemukan untuk GRN ${grnNo}. Skip.`);
            return;
          }

          const key = materialId.toString().trim().toLowerCase();
          const originalMaterialId = materialId.toString().trim();
          let item = inventoryMap.get(key);

          // Ambil price dari PO (prioritas utama) - price dari PO sudah per unit
          const priceFromPO = parseFloat(po.price) || 0;
          const pricePerUnit = priceFromPO; // Price dari PO sudah per unit

          if (!item) {
            const material = materialsMap.get(originalMaterialId);
            if (!material) {
              console.warn(`⚠️ [GRN Inventory] Material tidak ditemukan di master: ${originalMaterialId}`);
              return;
            }

            item = {
              id: Date.now().toString() + key,
              supplierName: grn.supplier || po.supplier || material.supplier || '',
              codeItem: originalMaterialId,
              description: grn.materialItem || po.materialItem || material.nama || '',
              kategori: material.kategori || 'Material',
              satuan: material.satuan || 'PCS',
              price: pricePerUnit > 0 ? pricePerUnit : (material.priceMtr || material.harga || 0), // Prioritas: price dari PO
              stockPremonth: 0,
              receive: 0,
              outgoing: 0,
              return: 0,
              nextStock: 0,
              processedPOs: [],
              processedSPKs: [],
              processedGRNs: [], // Track GRN yang sudah diproses
            };
            inventoryMap.set(key, item);
          } else {
            // Update price dari PO jika ada (ambil yang terbaru)
            if (pricePerUnit > 0) {
              item.price = pricePerUnit;
            }
          }

          // Anti-duplicate: cek apakah GRN ini sudah diproses
          if (!item.processedGRNs) item.processedGRNs = [];
          if (item.processedGRNs.includes(grnNo)) {
            console.log(`⏭️  [GRN Inventory] GRN ${grnNo} sudah pernah diproses untuk material ${originalMaterialId}. Skip.`);
            return;
          }

          // Update receive dengan qtyReceived dari GRN (bulatkan qty, tidak pakai decimal)
          const qtyRounded = Math.round(grn.qtyReceived || 0);
          item.receive = (item.receive || 0) + qtyRounded;
          item.processedGRNs.push(grnNo);
          
          console.log(`✅ [GRN Inventory] Material inventory updated (RECEIVE from GRN ${grnNo} - PO tanpa SO):`);
          console.log(`   Material: ${grn.materialItem} (${originalMaterialId})`);
          console.log(`   PO: ${poNo} | GRN: ${grnNo}`);
          console.log(`   Receive: +${qtyRounded} | Price: ${pricePerUnit} (from PO)`);
        });

      // 2. MATERIAL OUTGOING: dari productionResults (materials array dengan qtyUsed)
      // Key: materialId (case-insensitive untuk matching, tapi codeItem tetap original case)
      // Setiap production result (id berbeda) dihitung terpisah, gunakan result.id untuk anti-duplicate
      safeProductionResults.forEach((result: any) => {
        if (!result.materials || !Array.isArray(result.materials)) return;
        if (!result.id) return;

        result.materials.forEach((material: any) => {
          const materialId = material.materialId;
          if (!materialId) return;

          const qtyUsed = parseFloat(material.qtyUsed) || 0;
          if (qtyUsed <= 0) return;

          // Key untuk inventory map: materialId lowercase (untuk case-insensitive matching)
          // codeItem tetap pakai original materialId untuk display
          const key = (materialId || '').toString().trim().toLowerCase();
          const originalMaterialId = (materialId || '').toString().trim();
          
          let item = inventoryMap.get(key);
          
          if (!item) {
            // Cari material data - coba match dengan case-insensitive
            let materialData = materialsMap.get(originalMaterialId);
            if (!materialData) {
              // Fallback: cari dengan case-insensitive
              for (const [matId, matData] of materialsMap.entries()) {
                if (matId.toString().trim().toLowerCase() === key) {
                  materialData = matData;
                  break;
                }
              }
            }
            
            if (!materialData) {
              console.warn(`⚠️ Material not found in master data: ${originalMaterialId}`);
              return;
            }
            
            // Ambil price dari purchaseOrders (prioritas utama)
            const priceFromPO = materialPriceMap.get(key) || 0;
            
            item = {
              id: Date.now().toString() + key,
              supplierName: materialData.supplier || '',
              codeItem: originalMaterialId, // Pakai original case untuk display
              description: material.materialName || materialData.nama || '',
              kategori: materialData.kategori || 'Material',
              satuan: material.unit || materialData.satuan || 'PCS',
              price: priceFromPO || materialData.priceMtr || 0, // Prioritas: price dari PO
              stockPremonth: 0,
              receive: 0,
              outgoing: 0,
              return: 0,
              nextStock: 0,
              processedPOs: [],
              processedSPKs: [],
              processedGRNs: [],
            };
            inventoryMap.set(key, item);
          } else {
            // Update price dari purchaseOrders jika ada (ambil yang terbaru)
            const priceFromPO = materialPriceMap.get(key);
            if (priceFromPO !== undefined && priceFromPO > 0) {
              item.price = priceFromPO;
            }
          }

          // Setiap production result (id berbeda) dihitung terpisah
          // Gunakan production result ID + materialId sebagai key untuk anti-duplicate
          // Setiap result.id hanya dihitung sekali per materialId
          if (!item.processedPOs) item.processedPOs = [];
          const resultKey = `PR_${result.id}_${originalMaterialId}`;
          if (item.processedPOs.includes(resultKey)) {
            console.log(`⏭️  Skipping duplicate: Production Result ${result.id}, Material ${originalMaterialId}`);
            return; // Skip kalau production result ini sudah diproses untuk materialId ini
          }

          // Update outgoing (bulatkan qty, tidak pakai decimal) - jumlahkan jika materialId sama
          const qtyRounded = Math.round(qtyUsed);
          const oldOutgoing = item.outgoing || 0;
          item.outgoing = oldOutgoing + qtyRounded;
          
          console.log(`📤 Outgoing updated: Material ${originalMaterialId}, +${qtyRounded} (from PR ${result.id}), Total: ${item.outgoing}`);
          
          // Mark production result ini sudah diproses untuk materialId ini
          item.processedPOs.push(resultKey);
        });
      });

      // 3. PRODUCT RECEIVE: dari QC PASS (status CLOSE dan qcResult PASS)
      safeQC
        .filter((qc: any) => qc.status === 'CLOSE' && qc.qcResult === 'PASS')
        .forEach((qc: any) => {
          const spkNo = qc.spkNo;
          if (!spkNo) return;

          // Cari SPK untuk dapat product_id
          const spk = spkMap.get(spkNo);
          if (!spk) return;
          
          const productId = spk.product_id;
          if (!productId) return;

          const key = productId.toLowerCase();
          let item = inventoryMap.get(key);
          
          // Ambil price dari salesOrders, fallback ke product data
          const priceFromSO = productPriceMap.get(productId.toLowerCase());
          
          if (!item) {
            const product = productsMap.get(productId);
            if (!product) return;
            
            const finalPrice = priceFromSO || product.price || product.hargaSales || 0;
            
            item = {
              id: Date.now().toString() + key,
              supplierName: qc.customer || product.customer || '',
              codeItem: productId,
              description: qc.product || product.productName || product.nama || '',
              kategori: product.kategori || 'Product',
              satuan: product.satuan || product.unit || 'PCS',
              price: finalPrice,
              padCode: product.padCode || '', // Ambil padCode dari master product
              stockPremonth: 0,
              receive: 0,
              outgoing: 0,
              return: 0,
              nextStock: 0,
              processedPOs: [],
              processedSPKs: [],
              processedGRNs: [],
            };
            inventoryMap.set(key, item);
          } else {
            // Update price dari salesOrders jika ada
            if (priceFromSO !== undefined) {
              item.price = priceFromSO;
            }
            // Update padCode dari product jika ada
            const product = productsMap.get(productId);
            if (product && product.padCode) {
              item.padCode = product.padCode;
            }
          }

          // Anti-duplicate: cek apakah SPK ini sudah diproses
          if (!item.processedSPKs) item.processedSPKs = [];
          if (item.processedSPKs.includes(spkNo)) return;

          // Update receive (gunakan qty dari QC, bukan total)
          const qtyPassed = qc.qty || 0;
          item.receive = (item.receive || 0) + qtyPassed;
          item.processedSPKs.push(spkNo);
        });

      // 4. PRODUCT OUTGOING: dari delivery items (per SPK dan qty)
      safeDelivery.forEach((delivery: any) => {
        if (!delivery.items || !Array.isArray(delivery.items)) return;
        if (!delivery.id) return; // Pastikan delivery punya ID untuk tracking

        delivery.items.forEach((item: any) => {
          const spkNo = item.spkNo;
          if (!spkNo) return;

          // Cari SPK untuk dapat product_id
          const spk = spkMap.get(spkNo);
          if (!spk) return;
          
          const productId = spk.product_id;
          if (!productId) return;

          const key = productId.toLowerCase();
          const originalProductId = productId; // Simpan original untuk display
          let inventoryItem = inventoryMap.get(key);
          
          // Ambil price dari salesOrders, fallback ke product data
          const priceFromSO = productPriceMap.get(productId.toLowerCase());
          
          if (!inventoryItem) {
            const product = productsMap.get(productId);
            if (!product) return;
            
            const finalPrice = priceFromSO || product.price || product.hargaSales || 0;
            
            inventoryItem = {
              id: Date.now().toString() + key,
              supplierName: delivery.customer || product.customer || '',
              codeItem: originalProductId, // Gunakan original productId untuk display
              description: item.product || product.productName || product.nama || '',
              kategori: product.kategori || 'Product',
              satuan: item.unit || product.satuan || product.unit || 'PCS',
              price: finalPrice,
              padCode: product.padCode || '', // Ambil padCode dari master product
              stockPremonth: 0,
              receive: 0,
              outgoing: 0,
              return: 0,
              nextStock: 0,
              processedPOs: [],
              processedSPKs: [],
              processedGRNs: [],
            };
            inventoryMap.set(key, inventoryItem);
          } else {
            // Update price dari salesOrders jika ada
            if (priceFromSO !== undefined) {
              inventoryItem.price = priceFromSO;
            }
            // Update padCode dari product jika ada
            const product = productsMap.get(productId);
            if (product && product.padCode) {
              inventoryItem.padCode = product.padCode;
            }
          }

          // Anti-duplicate: gunakan delivery.id + spkNo untuk tracking
          // Setiap delivery item dihitung terpisah, bahkan jika spkNo sama
          if (!inventoryItem.processedSPKs) inventoryItem.processedSPKs = [];
          const deliveryKey = `DEL_${delivery.id}_${spkNo}`;
          if (inventoryItem.processedSPKs.includes(deliveryKey)) {
            console.log(`⏭️  Skipping duplicate: Delivery ${delivery.id}, SPK ${spkNo}`);
            return; // Skip kalau delivery item ini sudah diproses
          }

          // Update outgoing (bulatkan qty, tidak pakai decimal) - jumlahkan jika productId sama
          const qty = parseFloat(item.qty) || 0;
          const qtyRounded = Math.round(qty);
          const oldOutgoing = inventoryItem.outgoing || 0;
          inventoryItem.outgoing = oldOutgoing + qtyRounded;
          
          console.log(`📤 Outgoing updated: Product ${originalProductId}, +${qtyRounded} (from Delivery ${delivery.id}, SPK ${spkNo}), Total: ${inventoryItem.outgoing}`);
          
          // Mark delivery item ini sudah diproses
          inventoryItem.processedSPKs.push(deliveryKey);
        });
      });

      let outgoingFixCount = 0;
      const recalculatedInventory = Array.from(inventoryMap.values()).map(item => {
        const stockPremonth = item.stockPremonth || 0;
        const receiveQty = item.receive || 0;
        const outgoingQty = item.outgoing || 0;
        const returnQty = item.return || 0;
        const maxOutgoing = stockPremonth + receiveQty + returnQty;
        let adjustedOutgoing = outgoingQty;
        let anomaly: string | undefined = item.anomaly;
        let anomalyDetail: string | undefined = item.anomalyDetail;

        if (outgoingQty > maxOutgoing) {
          outgoingFixCount += 1;
          adjustedOutgoing = maxOutgoing;
          anomaly = 'OUTGOING_GT_RECEIVE';
          anomalyDetail = `Outgoing ${outgoingQty} > tersedia ${maxOutgoing}. Sistem auto-adjust ketika recalculation.`;
        }

        return {
          ...item,
          outgoing: adjustedOutgoing,
          nextStock: stockPremonth + receiveQty - adjustedOutgoing + returnQty,
          anomaly,
          anomalyDetail,
          lastUpdate: new Date().toISOString(),
        };
      });

      // IMPORTANT: Deduplicate sebelum save (berdasarkan codeItem)
      const deduplicatedMap = new Map<string, InventoryItem>();
      recalculatedInventory.forEach((item: InventoryItem) => {
        const key = (item.codeItem || item.id || '').toLowerCase();
        if (key) {
          const existing = deduplicatedMap.get(key);
          if (!existing || 
              (item.lastUpdate && existing.lastUpdate && item.lastUpdate > existing.lastUpdate) ||
              (item.id && existing.id && item.id > existing.id)) {
            deduplicatedMap.set(key, item);
          }
        }
      });
      const deduplicated = Array.from(deduplicatedMap.values());
      
      console.log(`[Inventory] Recalculated ${deduplicated.length} items (after deduplication)`);

      // Save dan update state
      await storageService.set('inventory', deduplicated);
      setInventory(deduplicated);
      
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

  const handleRowClick = async (item: InventoryItem) => {
    setSelectedItem(item);
    setShowReceiptDialog(true);
    
    // Load receipt data
    try {
      // 1. Stock Opname: dari inventory lastUpdate (jika ada stockPremonth > 0)
      const stockOpnameReceipts: Array<{ date: string; qty: number; source: string }> = [];
      if (item.stockPremonth && item.stockPremonth > 0 && item.lastUpdate) {
        stockOpnameReceipts.push({
          date: item.lastUpdate.split('T')[0],
          qty: item.stockPremonth,
          source: 'Stock Opname',
        });
      }

      // 2. Purchasing: dari GRN data
      const grnData = extractStorageValue(await storageService.get<any[]>('grnPackaging'));
      const purchasingReceipts: Array<{ date: string; qty: number; grnNo: string; poNo: string; supplier: string }> = [];
      
      // Cari GRN yang sesuai dengan codeItem (materialId, productId, atau materialItem/productItem)
      const itemCode = (item.codeItem || '').toString().trim().toLowerCase();
      const itemDescription = (item.description || '').toString().trim().toLowerCase();
      
      const matchingGRNs = grnData.filter((grn: any) => {
        const grnMaterialId = (grn.materialId || '').toString().trim().toLowerCase();
        const grnProductId = (grn.productId || '').toString().trim().toLowerCase();
        const grnMaterialItem = (grn.materialItem || '').toString().trim().toLowerCase();
        const grnProductItem = (grn.productItem || grn.productName || '').toString().trim().toLowerCase();
        
        // Match by ID atau nama item
        return grnMaterialId === itemCode || 
               grnProductId === itemCode ||
               grnMaterialItem === itemCode ||
               grnProductItem === itemCode ||
               grnMaterialItem === itemDescription ||
               grnProductItem === itemDescription;
      });

      matchingGRNs.forEach((grn: any) => {
        if (grn.receivedDate) {
          purchasingReceipts.push({
            date: grn.receivedDate,
            qty: grn.qtyReceived || 0,
            grnNo: grn.grnNo || '-',
            poNo: grn.poNo || '-',
            supplier: grn.supplier || '-',
          });
        }
      });

      // Sort by date (newest first)
      stockOpnameReceipts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      purchasingReceipts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setReceiptData({
        stockOpname: stockOpnameReceipts,
        purchasing: purchasingReceipts,
      });
    } catch (error: any) {
      console.error('Error loading receipt data:', error);
      setReceiptData({ stockOpname: [], purchasing: [] });
    }
  };

  const columns = [
    { 
      key: 'supplierName', 
      header: activeTab === 'material' ? 'Supplier Name' : 'Customer Name',
    },
    { key: 'codeItem', header: 'CODE item' },
    { key: 'description', header: 'DESCRIPTION/Nama Item' },
    { 
      key: 'padCode', 
      header: 'Pad Code',
      render: (item: InventoryItem) => item.padCode || '-',
    },
    { key: 'kategori', header: 'Kategori' },
    { key: 'satuan', header: 'Satuan/UOM' },
    {
      key: 'price',
      header: 'PRICE',
      render: (item: InventoryItem) => `Rp ${(item.price || 0).toLocaleString('id-ID')}`,
    },
    {
      key: 'stockPremonth',
      header: 'STOCK/Premonth',
      render: (item: InventoryItem) => (item.stockPremonth || 0).toLocaleString('id-ID'),
    },
    {
      key: 'receive',
      header: activeTab === 'material' 
        ? 'Receive (dari PO/GRN)' 
        : 'Receive (dari QC PASS)',
      render: (item: InventoryItem) => (item.receive || 0).toLocaleString('id-ID'),
    },
    {
      key: 'outgoing',
      header: activeTab === 'material' 
        ? 'Outgoing (untuk Produksi)' 
        : 'Outgoing (untuk Delivery)',
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
        const nextStock = (item.stockPremonth || 0) + (item.receive || 0) - (item.outgoing || 0) + (item.return || 0);
        return (
          <span style={{ fontWeight: 'bold', color: nextStock < 0 ? '#f44336' : 'var(--text-primary)' }}>
            {nextStock.toLocaleString('id-ID')}
          </span>
        );
      },
    },
  ];

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
            variant="primary"
            onClick={() => setShowAddInventoryDialog(true)}
            style={{ fontSize: '14px', padding: '8px 16px', backgroundColor: 'var(--accent-color)', color: 'white' }}
          >
            ➕ Add Inventory
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
          <div className="tab-container" style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              className={`tab-button ${activeTab === 'material' ? 'active' : ''}`}
              onClick={() => setActiveTab('material')}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: activeTab === 'material' ? '600' : '400',
                backgroundColor: activeTab === 'material' ? 'var(--primary-color)' : 'transparent',
                color: activeTab === 'material' 
                  ? (document.documentElement.getAttribute('data-theme') === 'light' ? '#1a1a1a' : '#fff')
                  : 'var(--text-primary)',
                border: `1px solid ${activeTab === 'material' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              📦 Material ({categorizeInventory.materialItems.length})
            </button>
            <button
              className={`tab-button ${activeTab === 'product' ? 'active' : ''}`}
              onClick={() => setActiveTab('product')}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: activeTab === 'product' ? '600' : '400',
                backgroundColor: activeTab === 'product' ? 'var(--primary-color)' : 'transparent',
                color: activeTab === 'product' 
                  ? (document.documentElement.getAttribute('data-theme') === 'light' ? '#1a1a1a' : '#fff')
                  : 'var(--text-primary)',
                border: `1px solid ${activeTab === 'product' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              🏭 Product ({categorizeInventory.productItems.length})
            </button>
          </div>
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
          <Table
            columns={columns}
            data={filteredInventory}
            emptyMessage="No inventory data available"
            onRowClick={handleRowClick}
          />
        )}
        {filteredInventory.length > 0 && (
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
              <strong>Total Items:</strong> {filteredInventory.length} item(s)
              {searchQuery
                ? ` (filtered from ${
                    activeTab === 'product'
                      ? categorizeInventory.productItems.length
                      : categorizeInventory.materialItems.length
                  } total ${activeTab === 'product' ? 'products' : 'materials'})`
                : ''}
            </p>
          </div>
        )}
      </Card>

      {/* Receipt Info Dialog */}
      {showReceiptDialog && selectedItem && (
        <ReceiptInfoDialog
          item={selectedItem}
          receiptData={receiptData}
          onClose={() => {
            setShowReceiptDialog(false);
            setSelectedItem(null);
            setReceiptData({ stockOpname: [], purchasing: [] });
          }}
        />
      )}

      {/* Add Inventory Dialog */}
      {showAddInventoryDialog && (
        <div
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
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setShowAddInventoryDialog(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                ➕ Add Inventory
              </h2>
              <button
                onClick={() => setShowAddInventoryDialog(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
                  Pilih Material *
                </label>
                <select
                  value={addInventoryForm.selectedMaterialId}
                  onChange={(e) => handleMaterialSelect(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                >
                  <option value="">-- Pilih Material --</option>
                  {materials.map((material) => (
                    <option key={material.id} value={material.id}>
                      {material.kode} - {material.nama}
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Pilih material untuk auto-fill data supplier, harga, dll
                </p>
              </div>

              <Input
                label="Supplier Name"
                value={addInventoryForm.supplierName}
                onChange={(value) => setAddInventoryForm({ ...addInventoryForm, supplierName: value })}
                placeholder="Otomatis dari material (bisa diubah)"
                disabled={!!addInventoryForm.selectedMaterialId}
              />
              <Input
                label="Code Item *"
                value={addInventoryForm.codeItem}
                onChange={(value) => setAddInventoryForm({ ...addInventoryForm, codeItem: value })}
                placeholder="Otomatis dari material (bisa diubah)"
                required
                disabled={!!addInventoryForm.selectedMaterialId}
              />
              <Input
                label="Description *"
                value={addInventoryForm.description}
                onChange={(value) => setAddInventoryForm({ ...addInventoryForm, description: value })}
                placeholder="Otomatis dari material (bisa diubah)"
                required
                disabled={!!addInventoryForm.selectedMaterialId}
              />
              <Input
                label="Kategori"
                value={addInventoryForm.kategori}
                onChange={(value) => setAddInventoryForm({ ...addInventoryForm, kategori: value })}
                placeholder={activeTab === 'product' ? 'Product' : 'Material'}
                disabled={!!addInventoryForm.selectedMaterialId}
              />
              <Input
                label="Satuan"
                value={addInventoryForm.satuan}
                onChange={(value) => setAddInventoryForm({ ...addInventoryForm, satuan: value })}
                placeholder="PCS"
                disabled={!!addInventoryForm.selectedMaterialId}
              />
              <Input
                label="Price"
                type="number"
                value={addInventoryForm.price}
                onChange={(value) => setAddInventoryForm({ ...addInventoryForm, price: value })}
                placeholder="Otomatis dari material (bisa diubah)"
                disabled={!!addInventoryForm.selectedMaterialId}
              />
              <Input
                label="Stock Premonth *"
                type="number"
                value={addInventoryForm.stockPremonth}
                onChange={(value) => setAddInventoryForm({ ...addInventoryForm, stockPremonth: value })}
                placeholder="Masukkan stock awal"
                required
              />

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
                  Upload Dokumentasi Stock (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleStockDocUpload}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
                {stockDocFile && (
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    File: {stockDocFile.name} ({(stockDocFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Upload foto atau dokumen sebagai bukti stock (maks 5MB)
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowAddInventoryDialog(false);
                    setAddInventoryForm({
                      selectedMaterialId: '',
                      supplierName: '',
                      codeItem: '',
                      description: '',
                      kategori: '',
                      satuan: 'PCS',
                      price: '',
                      stockPremonth: '',
                      stockDocumentation: '',
                    });
                    setStockDocFile(null);
                  }}
                >
                  Batal
                </Button>
                <Button
                  variant="primary"
                  onClick={handleAddInventory}
                  disabled={loading}
                >
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Receipt Info Dialog Component
const ReceiptInfoDialog = ({ 
  item, 
  receiptData, 
  onClose 
}: { 
  item: InventoryItem; 
  receiptData: {
    stockOpname: Array<{ date: string; qty: number; source: string }>;
    purchasing: Array<{ date: string; qty: number; grnNo: string; poNo: string; supplier: string }>;
  };
  onClose: () => void;
}) => {
  const allReceipts = [
    ...receiptData.stockOpname.map(r => ({ ...r, type: 'Stock Opname' as const })),
    ...receiptData.purchasing.map(r => ({ ...r, type: 'Purchasing' as const })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div
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
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '800px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
            📋 Info Receipt - {item.description || item.codeItem}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '0',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '14px' }}>
            <div><strong>Code Item:</strong> {item.codeItem}</div>
            <div><strong>Kategori:</strong> {item.kategori}</div>
            <div><strong>Satuan:</strong> {item.satuan}</div>
            <div><strong>Supplier:</strong> {item.supplierName || '-'}</div>
          </div>
        </div>

        {allReceipts.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Tidak ada data receipt untuk item ini.
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
                📦 Stock Opname ({receiptData.stockOpname.length})
              </h3>
              {receiptData.stockOpname.length === 0 ? (
                <div style={{ padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Tidak ada data stock opname
                </div>
              ) : (
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Tanggal</th>
                        <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>Qty</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receiptData.stockOpname.map((receipt, idx) => (
                        <tr key={idx} style={{ borderBottom: idx < receiptData.stockOpname.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                          <td style={{ padding: '10px' }}>{new Date(receipt.date).toLocaleDateString('id-ID')}</td>
                          <td style={{ padding: '10px', textAlign: 'right', fontWeight: '600' }}>{receipt.qty.toLocaleString('id-ID')} {item.satuan}</td>
                          <td style={{ padding: '10px' }}>{receipt.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
                🛒 Purchasing / GRN ({receiptData.purchasing.length})
              </h3>
              {receiptData.purchasing.length === 0 ? (
                <div style={{ padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Tidak ada data purchasing/GRN
                </div>
              ) : (
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Tanggal</th>
                        <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>Qty</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>GRN No</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>PO No</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Supplier</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receiptData.purchasing.map((receipt, idx) => (
                        <tr key={idx} style={{ borderBottom: idx < receiptData.purchasing.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                          <td style={{ padding: '10px' }}>{new Date(receipt.date).toLocaleDateString('id-ID')}</td>
                          <td style={{ padding: '10px', textAlign: 'right', fontWeight: '600' }}>{receipt.qty.toLocaleString('id-ID')} {item.satuan}</td>
                          <td style={{ padding: '10px' }}>{receipt.grnNo}</td>
                          <td style={{ padding: '10px' }}>{receipt.poNo}</td>
                          <td style={{ padding: '10px' }}>{receipt.supplier}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ marginTop: '20px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Total Receipt:</div>
              <div style={{ fontSize: '16px' }}>
                <strong>Stock Opname:</strong> {receiptData.stockOpname.reduce((sum, r) => sum + r.qty, 0).toLocaleString('id-ID')} {item.satuan}
                <br />
                <strong>Purchasing:</strong> {receiptData.purchasing.reduce((sum, r) => sum + r.qty, 0).toLocaleString('id-ID')} {item.satuan}
                <br />
                <strong>Total:</strong> {(receiptData.stockOpname.reduce((sum, r) => sum + r.qty, 0) + receiptData.purchasing.reduce((sum, r) => sum + r.qty, 0)).toLocaleString('id-ID')} {item.satuan}
              </div>
            </div>
          </>
        )}

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Inventory;

