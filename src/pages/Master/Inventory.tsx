import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { storageService, extractStorageValue, StorageKeys } from '../../services/storage';
import { filterActiveItems } from '../../utils/data-persistence-helper';
import { getCurrentUser } from '../../utils/access-control-helper';
import { logCreate } from '../../utils/activity-logger';
import { useDialog } from '../../hooks/useDialog';
import { useToast } from '../../hooks/useToast';
import { useLanguage } from '../../hooks/useLanguage';
import BlobService from '../../services/blob-service';
import '../../styles/common.css';
import '../../styles/toast.css';
import './Inventory.css';
import './Master.css';

interface InventoryItem {
  id: string;
  supplierName: string;
  codeItem: string;
  item_code?: string; // New standardized field
  type?: 'material' | 'product' | 'unknown'; // New standardized field
  kodeIpos?: string; // Kode Ipos untuk material
  description: string;
  kategori: string;
  satuan: string;
  price: number;
  stockP1?: number; // Stock-P1(Premonth)
  stockP2?: number; // Stock-P2(Premonth)a
  stockPremonth: number; // Fallback untuk backward compatibility
  receive: number;
  outgoing: number;
  return: number;
  nextStock: number; // Calculated: stockPremonth + receive - outgoing + return
  lastUpdate?: string;
  anomaly?: string;
  anomalyDetail?: string;
  padCode?: string; // PAD Code untuk product (diambil dari master product)
  stockDocumentationId?: string; // MinIO fileId untuk dokumentasi stock (optional)
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
  const { t } = useLanguage();
  const { showToast, ToastContainer } = useToast();
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'material' | 'product'>('material');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [showAddInventoryDialog, setShowAddInventoryDialog] = useState(false);
  const [showEditInventoryDialog, setShowEditInventoryDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [addInventoryForm, setAddInventoryForm] = useState({
    selectedMaterialId: '',
    supplierName: '',
    codeItem: '',
    description: '',
    kategori: '',
    satuan: 'PCS',
    price: '',
    stockPremonth: '',
    stockDocumentationId: '',
  });
  const [editInventoryForm, setEditInventoryForm] = useState({
    supplierName: '',
    codeItem: '',
    kodeIpos: '',
    description: '',
    kategori: '',
    satuan: 'PCS',
    price: '',
    stockP1: '',
    stockP2: '',
    stockDocumentationId: '',
  });
  const [materials, setMaterials] = useState<Material[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockDocFile, setStockDocFile] = useState<File | null>(null);
  const [previewDocumentationId, setPreviewDocumentationId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const { showAlert } = useDialog();
  const [receiptData, setReceiptData] = useState<{
    stockOpname: Array<{ date: string; qty: number; source: string }>;
    purchasing: Array<{ date: string; qty: number; grnNo: string; poNo: string; supplier: string }>;
  }>({ stockOpname: [], purchasing: [] });

  // Helper function untuk get item code (support backward compatibility)
  const getItemCode = (item: InventoryItem): string => {
    return (item.item_code || item.codeItem || '').toString().trim();
  };

  // Helper function untuk get item type
  const getItemType = (item: InventoryItem): 'material' | 'product' | 'unknown' => {
    return item.type || 'unknown';
  };

  useEffect(() => {
    loadInventory();
    loadMaterials();
    loadProducts();
    loadSuppliers();
  }, []);

  const loadMaterials = async () => {
    try {
      const data = extractStorageValue(await storageService.get<Material[]>('materials')) || [];
      setMaterials(data);
    } catch (error) {
      // Silent fail
    }
  };

  const loadProducts = async () => {
    try {
      const data = extractStorageValue(await storageService.get<any[]>(StorageKeys.PACKAGING.PRODUCTS)) || [];
      setProducts(data);
    } catch (error) {
      // Silent fail
    }
  };

  const loadSuppliers = async () => {
    try {
      const data = extractStorageValue(await storageService.get<Supplier[]>('suppliers')) || [];
      setSuppliers(data);
    } catch (error) {
      // Silent fail
    }
  };

  const handleMaterialSelect = (itemId: string) => {
    if (addInventoryForm.kategori === 'Material') {
      const selectedMaterial = materials.find(m => m.id === itemId);
      if (selectedMaterial) {
        setAddInventoryForm({
          ...addInventoryForm,
          selectedMaterialId: itemId,
          codeItem: selectedMaterial.kode || '',
          description: selectedMaterial.nama || '',
          kategori: selectedMaterial.kategori || 'Material',
          satuan: selectedMaterial.satuan || 'PCS',
          price: String(selectedMaterial.harga || selectedMaterial.priceMtr || 0),
          supplierName: selectedMaterial.supplier || '',
        });
      }
    } else if (addInventoryForm.kategori === 'Product') {
      const selectedProduct = products.find(p => p.id === itemId);
      if (selectedProduct) {
        setAddInventoryForm({
          ...addInventoryForm,
          selectedMaterialId: itemId,
          codeItem: selectedProduct.product_id || selectedProduct.kode || '',
          description: selectedProduct.productName || selectedProduct.nama || '',
          kategori: 'Product',
          satuan: selectedProduct.satuan || selectedProduct.unit || 'PCS',
          price: String(selectedProduct.price || selectedProduct.hargaSales || 0),
          supplierName: selectedProduct.customer || '',
        });
      }
    }
  };

  const handleStockDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit file size to 5MB
    if (file.size > 5 * 1024 * 1024) {
      showAlert('File terlalu besar. Maksimal 5MB.', 'Error');
      return;
    }

    try {
      // Validate file
      const validation = BlobService.validateFile(file, 5, ['image/*', 'application/pdf']);
      if (!validation.valid) {
        showAlert(validation.error || 'Invalid file', 'Error');
        return;
      }

      // Upload to MinIO
      const result = await BlobService.uploadFile(file, 'packaging');
      setStockDocFile(file);
      setAddInventoryForm({ ...addInventoryForm, stockDocumentationId: result.fileId });
      showAlert('Stock documentation uploaded successfully', 'Success');
    } catch (error: any) {
      showAlert(`Error uploading file: ${error.message}`, 'Error');
    }
  };

  const handleAddInventory = async () => {
    if (!addInventoryForm.kategori) {
      showAlert('Pilih tipe item (Material atau Product).', 'Validation Error');
      return;
    }

    if (!addInventoryForm.codeItem.trim() || !addInventoryForm.description.trim()) {
      showAlert('Code Item dan Description wajib diisi.', 'Validation Error');
      return;
    }

    if (addInventoryForm.stockPremonth === '') {
      showAlert('Stock Premonth wajib diisi.', 'Validation Error');
      return;
    }

    setLoading(true);
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
        kategori: addInventoryForm.kategori,
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
        stockDocumentationId: addInventoryForm.stockDocumentationId || undefined,
        processedPOs: [],
        processedSPKs: [],
        processedGRNs: [],
      };

      const updatedInventory = [...existingInventory, newInventoryItem];
      await storageService.set(StorageKeys.PACKAGING.INVENTORY, updatedInventory);
      await logCreate('INVENTORY', newInventoryItem.id, '/packaging/master/inventory', {
        codeItem: newInventoryItem.codeItem,
        description: newInventoryItem.description,
        initialStock: newInventoryItem.stockPremonth,
        supplier: newInventoryItem.supplierName,
      });

      showToast('Inventory item added successfully', 'success');
      setAddInventoryForm({
        selectedMaterialId: '',
        supplierName: '',
        codeItem: '',
        description: '',
        kategori: '',
        satuan: 'PCS',
        price: '',
        stockPremonth: '',
        stockDocumentationId: '',
      });
      setStockDocFile(null);
      setShowAddInventoryDialog(false);
      loadInventory(); // Reload to show new item
    } catch (err: any) {
      showToast(`Failed to add inventory: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditInventory = (item: InventoryItem) => {
    setEditingItem(item);
    setEditInventoryForm({
      supplierName: item.supplierName || '',
      codeItem: item.codeItem || '',
      kodeIpos: item.kodeIpos || '',
      description: item.description || '',
      kategori: item.kategori || '',
      satuan: item.satuan || 'PCS',
      price: String(item.price || 0),
      stockP1: String(item.stockP1 || 0),
      stockP2: String(item.stockP2 || 0),
      stockDocumentationId: item.stockDocumentationId || '',
    });
    setShowEditInventoryDialog(true);
  };

  const handleSaveEditInventory = async () => {
    if (!editInventoryForm.codeItem.trim() || !editInventoryForm.description.trim()) {
      showAlert('Code Item dan Description wajib diisi.', 'Validation Error');
      return;
    }

    setLoading(true);
    try {
      const existingInventory = extractStorageValue(await storageService.get<InventoryItem[]>('inventory'));
      
      const updatedInventory = existingInventory.map((item: InventoryItem) => {
        if (item.id === editingItem?.id) {
          const stockP1 = parseFloat(editInventoryForm.stockP1) || 0;
          const stockP2 = parseFloat(editInventoryForm.stockP2) || 0;
          const stockPremonth = stockP1 + stockP2;
          
          return {
            ...item,
            supplierName: editInventoryForm.supplierName.trim(),
            codeItem: editInventoryForm.codeItem.trim(),
            kodeIpos: editInventoryForm.kodeIpos.trim() || undefined,
            description: editInventoryForm.description.trim(),
            kategori: editInventoryForm.kategori || item.kategori,
            satuan: editInventoryForm.satuan.trim() || 'PCS',
            price: parseFloat(editInventoryForm.price) || 0,
            stockP1: stockP1,
            stockP2: stockP2,
            stockPremonth: stockPremonth,
            nextStock: stockPremonth + (item.receive || 0) - (item.outgoing || 0) + (item.return || 0),
            lastUpdate: new Date().toISOString(),
            stockDocumentationId: editInventoryForm.stockDocumentationId || item.stockDocumentationId,
          };
        }
        return item;
      });

      await storageService.set(StorageKeys.PACKAGING.INVENTORY, updatedInventory);
      
      showToast('Inventory item updated successfully', 'success');
      setShowEditInventoryDialog(false);
      setEditingItem(null);
      setEditInventoryForm({
        supplierName: '',
        codeItem: '',
        kodeIpos: '',
        description: '',
        kategori: '',
        satuan: 'PCS',
        price: '',
        stockP1: '',
        stockP2: '',
        stockDocumentationId: '',
      });
      loadInventory(); // Reload to show updated item
    } catch (err: any) {
      showToast(`Failed to update inventory: ${err.message}`, 'error');
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
      // Refresh jika inventory, materials, atau products data berubah
      if (key === 'inventory' || key === 'packaging/inventory' || key === 'materials' || key === StorageKeys.PACKAGING.PRODUCTS) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          if (key === 'materials') {
            loadMaterials();
          } else if (key === StorageKeys.PACKAGING.PRODUCTS) {
            loadProducts();
          } else {
            loadInventory();
          }
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
      
      // If empty, just set empty array
      if (data.length === 0) {
        setInventory([]);
        return;
      }
      
      // Calculate nextStock for each item
      // IMPORTANT: Allow negative stock (minus) - no longer limiting outgoing to maxOutgoing
      const calculatedData = data.map(item => {
        const stockPremonth = item.stockPremonth || 0;
        const receiveQty = item.receive || 0;
        const outgoingQty = item.outgoing || 0;
        const returnQty = item.return || 0;
        // Calculate nextStock allowing negative values
        const nextStock = stockPremonth + receiveQty - outgoingQty + returnQty;
        return {
          ...item,
          outgoing: outgoingQty,
          nextStock: nextStock,
          anomaly: item.anomaly,
          anomalyDetail: item.anomalyDetail,
        };
      });
      setInventory(calculatedData);
    } catch (error: any) {
      showToast(`Failed to load inventory: ${error.message || 'Unknown error'}. Try refreshing the page or importing data again.`, 'error');
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  const categorizeInventory = useMemo(() => {
    // IMPORTANT: Filter berdasarkan kategori dengan exact match untuk mencegah tercampur
    const materialItems = inventory.filter(item => {
      const kategori = (item.kategori || '').toLowerCase().trim();
      return kategori === 'material';
    });
    const productItems = inventory.filter(item => {
      const kategori = (item.kategori || '').toLowerCase().trim();
      return kategori === 'product';
    });

    // Debug: Log untuk troubleshooting
    const uncategorized = inventory.filter(item => {
      const kategori = (item.kategori || '').toLowerCase().trim();
      return kategori !== 'material' && kategori !== 'product';
    });
    
    return { materialItems, productItems };
  }, [inventory]);

  // Filter inventory based on search query + active tab, sorted by nextStock descending
  const filteredInventory = useMemo(() => {
    const baseData = activeTab === 'product' ? categorizeInventory.productItems : categorizeInventory.materialItems;
    let filtered = baseData;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = baseData.filter(item =>
        (item.codeItem || '').toLowerCase().includes(query) ||
        (item.description || '').toLowerCase().includes(query) ||
        (item.supplierName || '').toLowerCase().includes(query)
      );
    }
    
    // Sort by nextStock in descending order (highest stock first)
    return filtered.sort((a, b) => (b.nextStock || 0) - (a.nextStock || 0));
  }, [categorizeInventory, activeTab, searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInventory = filteredInventory.slice(startIndex, endIndex);

  // Handle Manual Reset
  const handleResetData = async () => {
    try {
      setLoading(true);
      await storageService.set(StorageKeys.PACKAGING.INVENTORY, []);
      setInventory([]);
      showToast('Inventory data reset successfully. Please import new data from Excel.', 'success');
    } catch (error: any) {
      showToast(`Failed to reset data: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Download Template Excel
  const handleDownloadTemplate = () => {
    try {
      // Template untuk Material dengan header sesuai format user
      const templateData = activeTab === 'material' ? [
        { 
          'Supplier Name': 'PT. CAKRAWALA MEGA INDAH', 
          'Kode Item': 'MTRL-00026',
          'Kode Ipos': 'KRT01758',
          'Description': 'SHEET 244 X 122 CM K125/M125X3/K125 CB/F SCOORE 60.5+61.5',
          'Kategori': 'Material', 
          'Satuan': 'Pcs', 
          'Harga': '17692', 
          'Stock-P1(Premonth)': '0',
          'Stock-P2(Premonth)': '186',
          'Receive': '0', 
          'Outgoing': '0', 
          'Return': '0',
          'Next Stock': '186',
          'Last Update': new Date().toISOString().split('T')[0]
        },
        { 
          'Supplier Name': 'PT. CAKRAWALA MEGA INDAH', 
          'Kode Item': 'MTRL-00036',
          'Kode Ipos': 'LKR00007',
          'Description': 'SHEET 156 X 63,3 CM K200/M125X3/K150 CB/F SCOORE 23.3+32+8 CM',
          'Kategori': 'Material', 
          'Satuan': 'Pcs', 
          'Harga': '7228', 
          'Stock-P1(Premonth)': '412',
          'Stock-P2(Premonth)': '0',
          'Receive': '0', 
          'Outgoing': '0', 
          'Return': '0',
          'Next Stock': '412',
          'Last Update': new Date().toISOString().split('T')[0]
        },
      ] : [
        // Template untuk Product dengan header sesuai format user
        { 
          'Customer': 'PT. CAC PUTRA PERKASA', 
          'Code Item': 'FG-CAC-00003',
          'Kode Ipos': 'KRT01724',
          'Description': 'CARTON BOX 720X275X160 (BOLONG SAMPING)',
          'Kategori': 'Product', 
          'Satuan': 'Pcs', 
          'Harga': '16000', 
          'Stock P1': '30',
          'Stock P2': '0',
          'Receive': '0', 
          'Outgoing': '0', 
          'Return': '0',
          'Next Stock': '30',
          'Last Update': new Date().toISOString().split('T')[0]
        },
        { 
          'Customer': 'PT. CAC PUTRA PERKASA', 
          'Code Item': 'FG-CAC-00005',
          'Kode Ipos': 'KRT00142',
          'Description': 'CARTON BOX 620X263X205 MM',
          'Kategori': 'Product', 
          'Satuan': 'Pcs', 
          'Harga': '15900', 
          'Stock P1': '100',
          'Stock P2': '0',
          'Receive': '0', 
          'Outgoing': '0', 
          'Return': '0',
          'Next Stock': '100',
          'Last Update': new Date().toISOString().split('T')[0]
        },
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      
      const fileName = `Inventory_${activeTab === 'material' ? 'Material' : 'Product'}_Template.xlsx`;
      XLSX.writeFile(wb, fileName);
      showToast('Template downloaded! Please fill in the data according to the format and import again.', 'success');
    } catch (error: any) {
      showToast(`Error downloading template: ${error.message}`, 'error');
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
          showToast('File Excel kosong atau tidak ada data yang bisa diimport.');
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
            if (found) {
              const value = String(row[found] || '').trim();
              if (value) return value;
            }
          }
          return '';
        };
        

        const newItems: InventoryItem[] = [];
        const errors: string[] = [];

        // IMPORTANT: Set kategori berdasarkan activeTab untuk memastikan filtering benar
        const defaultCategory = activeTab === 'product' ? 'Product' : 'Material';

        jsonData.forEach((row, index) => {
          try {
            // Mapping untuk Material (format baru)
            // NOTE: kategori tidak dibaca dari Excel, akan di-force sesuai activeTab
            let supplierName, codeItem, kodeIpos, description, satuan, priceStr, stockP1Str, stockP2Str, receiveStr, outgoingStr, returnStr, nextStockStr, lastUpdateStr;
            
            if (activeTab === 'material') {
              // Format untuk Material - support berbagai variasi header (case-insensitive)
              // Prioritize exact match first, then variations
              supplierName = mapColumn(row, ['Supplier Name', 'SUPPLIER NAME', 'Supplier Name', 'SUPPLIER', 'supplier_name', 'supplier name']);
              codeItem = mapColumn(row, ['Kode Item', 'CODE ITEM', 'CODE item', 'CODE', 'Code Item', 'code_item', 'Kode', 'kode item', 'code item']);
              kodeIpos = mapColumn(row, ['Kode Ipos', 'KODE IPOS', 'Kode IPOS', 'code_ipos', 'IPOS', 'kode ipos', 'code ipos', 'Kode IPOS']);
              description = mapColumn(row, ['Description', 'DESCRIPTION/NAMA ITEM', 'DESCRIPTION/Nama Item', 'DESCRIPTION', 'Description', 'Nama Item', 'nama', 'Nama']);
              
              // kategori tidak dibaca dari Excel, akan di-force sesuai activeTab
              satuan = mapColumn(row, ['Satuan', 'SATUAN/UOM', 'SATUAN', 'Satuan', 'UOM', 'Unit', 'unit']);
              priceStr = mapColumn(row, ['Harga', 'PRICE', 'Price', 'price', 'HARGA']);
              stockP1Str = mapColumn(row, ['Stock-P1(Premonth)', 'Stock-P1(PREMONTH)', 'STOCK-P1(PREMONTH)', 'Stock P1', 'STOCK P1', 'Stock-P1', 'STOCK-P1']);
              stockP2Str = mapColumn(row, ['Stock-P2(Premonth)', 'Stock-P2(PREMONTH)', 'STOCK-P2(PREMONTH)', 'Stock P2', 'STOCK P2', 'Stock-P2', 'STOCK-P2']);
              // STOCK/PREMONTH = P1 + P2 (calculated), tidak perlu dibaca dari Excel
              receiveStr = mapColumn(row, ['Receive', 'RECEIVE (DARI PO/GRN)', 'RECEIVE', 'receive', 'penerimaan', 'Penerimaan']);
              outgoingStr = mapColumn(row, ['Outgoing', 'OUTGOING (UNTUK PRODUKSI)', 'OUTGOING', 'Outgoing', 'outgoing', 'keluar', 'Keluar']);
              returnStr = mapColumn(row, ['Return', 'RETURN', 'return']);
              nextStockStr = mapColumn(row, ['Next Stock', 'NEXT STOCK', 'next_stock', 'NextStock']);
              lastUpdateStr = mapColumn(row, ['Last Update', 'LAST UPDATE', 'last_update', 'LastUpdate']);
            } else {
              // Format untuk Product sesuai header user
              // Support new format: Pad Code, Product_id, Date, Nama Item, Kategori, Harga Satuan, STOCK AWAL, Receive
              const padCode = mapColumn(row, ['Pad Code', 'PAD CODE', 'PadCode', 'pad_code', 'PAD', 'pad']);
              const productId = mapColumn(row, ['Product_id', 'PRODUCT_ID', 'Product ID', 'product_id', 'Product Code', 'product_code']);
              const dateStr = mapColumn(row, ['Date', 'DATE', 'Tanggal', 'TANGGAL', 'date']);
              
              // Try new format first, fallback to old format
              supplierName = mapColumn(row, ['Customer', 'CUSTOMER', 'Supplier Name', 'SUPPLIER NAME', 'SUPPLIER', 'supplier_name', 'customer']);
              codeItem = productId || padCode || mapColumn(row, ['Code Item', 'CODE ITEM', 'CODE item', 'CODE', 'Code Item', 'code_item', 'Kode', 'code item']);
              kodeIpos = mapColumn(row, ['Kode Ipos', 'KODE IPOS', 'Kode IPOS', 'code_ipos', 'IPOS', 'kode ipos', 'code ipos']);
              description = mapColumn(row, ['Nama Item', 'NAMA ITEM', 'Description', 'DESCRIPTION', 'DESCRIPTION/Nama Item', 'Nama Item', 'Description', 'nama', 'Nama']);
              // kategori tidak dibaca dari Excel, akan di-force sesuai activeTab
              satuan = mapColumn(row, ['Satuan', 'SATUAN', 'Satuan', 'UOM', 'Unit', 'unit']);
              priceStr = mapColumn(row, ['Harga Satuan', 'HARGA SATUAN', 'Harga', 'PRICE', 'Price', 'price', 'HARGA']);
              stockP1Str = mapColumn(row, ['STOCK AWAL', 'STOCK AWAL', 'Stock Awal', 'Stock P1', 'STOCK P1', 'Stock-P1', 'STOCK-P1', 'Stock-P1(Premonth)', 'STOCK-P1(PREMONTH)']);
              stockP2Str = mapColumn(row, ['Stock P2', 'STOCK P2', 'Stock-P2', 'STOCK-P2', 'Stock-P2(Premonth)', 'STOCK-P2(PREMONTH)']);
              // stockStr tidak digunakan untuk Product, karena P1 + P2
              receiveStr = mapColumn(row, ['Receive', 'RECEIVE', 'receive', 'penerimaan', 'Penerimaan']);
              outgoingStr = mapColumn(row, ['Outgoing', 'OUTGOING', 'outgoing', 'keluar', 'Keluar']);
              returnStr = mapColumn(row, ['Return', 'RETURN', 'return']);
              nextStockStr = mapColumn(row, ['Next Stock', 'NEXT STOCK', 'next_stock', 'NextStock']);
              lastUpdateStr = dateStr || mapColumn(row, ['Last Update', 'LAST UPDATE', 'last_update', 'LastUpdate']);
            }

            // Skip empty rows
            if (!codeItem && !description) {
              return;
            }

            // Parse price (handle "Rp 17.692" format)
            let price = 0;
            if (priceStr) {
              const cleanedPrice = priceStr.replace(/[Rp\s.,]/g, '').replace(/\./g, '');
              price = parseFloat(cleanedPrice) || 0;
            }
            
            const stockP1 = parseFloat(stockP1Str || '0') || 0;
            const stockP2 = parseFloat(stockP2Str || '0') || 0;
            // STOCK/PREMONTH = P1 + P2 (calculated) untuk Material dan Product
            const stockPremonth = stockP1 + stockP2;
            const receive = parseFloat(receiveStr || '0') || 0;
            const outgoing = parseFloat(outgoingStr || '0') || 0;
            const returnQty = parseFloat(returnStr || '0') || 0;
            const nextStock = nextStockStr ? parseFloat(nextStockStr) : (stockPremonth + receive - outgoing + returnQty);
            const lastUpdate = lastUpdateStr || new Date().toISOString();

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
                codeItem: codeItem || existing.codeItem,
                kodeIpos: kodeIpos || existing.kodeIpos || undefined,
                description: description || existing.description,
                // IMPORTANT: Force kategori sesuai activeTab untuk mencegah tercampur Material dan Product
                kategori: defaultCategory,
                satuan: satuan || existing.satuan,
                price: price || existing.price,
                // Stock P1 dan P2 untuk Material dan Product
                stockP1: stockP1 !== undefined && stockP1 !== null ? stockP1 : (existing.stockP1 || 0),
                stockP2: stockP2 !== undefined && stockP2 !== null ? stockP2 : (existing.stockP2 || 0),
                stockPremonth: stockPremonth || existing.stockPremonth,
                receive: receive || existing.receive,
                outgoing: outgoing || existing.outgoing,
                return: returnQty || existing.return,
                nextStock,
                lastUpdate: lastUpdate || existing.lastUpdate || new Date().toISOString(),
              });
            } else {
              // Create new item
              newItems.push({
                id: Date.now().toString() + index,
                supplierName: supplierName || '',
                codeItem: codeItem || '',
                kodeIpos: kodeIpos || undefined,
                description: description || '',
                // IMPORTANT: Force kategori sesuai activeTab untuk mencegah tercampur
                kategori: defaultCategory,
                satuan: satuan || 'PCS',
                price,
                // Stock P1 dan P2 untuk Material dan Product (sama seperti Material)
                stockP1: stockP1 || 0,
                stockP2: stockP2 || 0,
                stockPremonth,
                receive,
                outgoing,
                return: returnQty,
                nextStock,
                lastUpdate: lastUpdate || new Date().toISOString(),
              });
            }
          } catch (error: any) {
            errors.push(`Row ${index + 2}: ${error.message}`);
          }
        });

        if (newItems.length === 0) {
          showToast('Tidak ada data valid yang ditemukan di file Excel. Pastikan format kolom sesuai.');
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

        // Save to storage
        await storageService.set(StorageKeys.PACKAGING.INVENTORY, deduplicated);
        setInventory(deduplicated);
        
        let successMsg = `Successfully imported ${newItems.length} items`;
        if (errors.length > 0) {
          successMsg += `. ${errors.length} rows had errors: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}`;
        }
        showToast(successMsg, 'success');
      } catch (error: any) {
        showToast(`Failed to import Excel: ${error.message}. Make sure the file is a valid Excel file (.xlsx or .xls).`, 'error');
      } finally {
        setImportLoading(false);
      }
    };
    input.click();
  };

  const handleExportExcel = () => {
    try {
      const dataToExport = filteredInventory.map(item => {
        // Helper function to safely format date
        const formatDateForExport = (dateStr: string | undefined): string => {
          if (!dateStr) return '';
          try {
            const date = new Date(dateStr);
            // Check if date is valid
            if (isNaN(date.getTime())) return '';
            return date.toISOString().split('T')[0];
          } catch {
            return '';
          }
        };

        if (activeTab === 'material') {
          // Format untuk Material sesuai header user
          const stockP1 = item.stockP1 || 0;
          const stockP2 = item.stockP2 || 0;
          const stockPremonth = stockP1 + stockP2; // Calculate dari P1 + P2
          
          return {
            'SUPPLIER NAME': item.supplierName || '',
            'CODE ITEM': item.codeItem || '',
            'KODE IPOS': item.kodeIpos || '',
            'DESCRIPTION/NAMA ITEM': item.description || '',
            'PAD CODE': item.padCode || '-',
            'KATEGORI': item.kategori || '',
            'SATUAN/UOM': item.satuan || '',
            'PRICE': `Rp ${(item.price || 0).toLocaleString('id-ID')}`,
            'STOCK P1': stockP1,
            'STOCK P2': stockP2,
            'STOCK/PREMONTH': stockPremonth,
            'RECEIVE (DARI PO/GRN)': item.receive || 0,
            'OUTGOING (UNTUK PRODUKSI)': item.outgoing || 0,
            'WARNING': item.anomaly ? '⚠️ ' + item.anomaly : '-',
            'RETURN': item.return || 0,
            'NEXT STOCK': item.nextStock || 0,
          };
        } else {
          // Format untuk Product sesuai header user
          const stockP1 = item.stockP1 || 0;
          const stockP2 = item.stockP2 || 0;
          
          return {
            'Customer': item.supplierName || '',
            'Code Item': item.codeItem || '',
            'Kode Ipos': item.kodeIpos || '',
            'Description': item.description || '',
            'Kategori': item.kategori || '',
            'Satuan': item.satuan || '',
            'Harga': item.price || 0,
            'Stock P1': stockP1,
            'Stock P2': stockP2,
            'Receive': item.receive || 0,
            'Outgoing': item.outgoing || 0,
            'Return': item.return || 0,
            'Next Stock': item.nextStock || 0,
            'Last Update': formatDateForExport(item.lastUpdate),
          };
        }
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, activeTab === 'product' ? 'Products Inventory' : 'Materials Inventory');
      
      const fileName = `Inventory_${activeTab === 'product' ? 'Products' : 'Materials'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showToast(`Successfully exported ${dataToExport.length} ${activeTab === 'product' ? 'products' : 'materials'} to ${fileName}`, 'success');
    } catch (error: any) {
      showToast(`Failed to export to Excel: ${error.message}`, 'error');
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
            return;
          }

          // Update receive dengan qtyReceived dari GRN (bulatkan qty, tidak pakai decimal)
          const qtyRounded = Math.round(grn.qtyReceived || 0);
          item.receive = (item.receive || 0) + qtyRounded;
          item.processedGRNs.push(grnNo);
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
            return; // Skip kalau production result ini sudah diproses untuk materialId ini
          }

          // Update outgoing (bulatkan qty, tidak pakai decimal) - jumlahkan jika materialId sama
          const qtyRounded = Math.round(qtyUsed);
          const oldOutgoing = item.outgoing || 0;
          item.outgoing = oldOutgoing + qtyRounded;
          
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
            return; // Skip kalau delivery item ini sudah diproses
          }

          // Update outgoing (bulatkan qty, tidak pakai decimal) - jumlahkan jika productId sama
          const qty = parseFloat(item.qty) || 0;
          const qtyRounded = Math.round(qty);
          const oldOutgoing = inventoryItem.outgoing || 0;
          inventoryItem.outgoing = oldOutgoing + qtyRounded;
          
          
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
        // IMPORTANT: Allow negative stock (minus) - no longer limiting outgoing
        const nextStock = stockPremonth + receiveQty - outgoingQty + returnQty;

        return {
          ...item,
          outgoing: outgoingQty,
          nextStock: nextStock,
          anomaly: item.anomaly,
          anomalyDetail: item.anomalyDetail,
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
      

      // Save dan update state
      await storageService.set(StorageKeys.PACKAGING.INVENTORY, deduplicated);
      setInventory(deduplicated);
      
      let message = `Inventory recalculated successfully from source data! Total items: ${recalculatedInventory.length}`;
      if (outgoingFixCount > 0) {
        message += `. ${outgoingFixCount} items had outgoing > available stock and were automatically corrected.`;
      }
      showToast(message, 'success');
    } catch (error: any) {
      showToast(`Failed to recalculate inventory: ${error.message}`, 'error');
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
      setReceiptData({ stockOpname: [], purchasing: [] });
    }
  };

  const columns = useMemo(() => [
    { 
      key: 'supplierName', 
      header: activeTab === 'material' ? t('master.supplierName') || 'SUPPLIER NAME' : t('master.customerName') || 'Customer',
    },
    { key: 'codeItem', header: t('master.code') || 'CODE ITEM' },
    {
      key: 'kodeIpos',
      header: 'KODE IPOS',
      hidden: true,
      render: (item: InventoryItem) => item.kodeIpos || '-',
    },
    { key: 'description', header: t('common.description') || 'DESCRIPTION/NAMA ITEM' },
    { 
      key: 'padCode', 
      header: 'PAD CODE',
      render: (item: InventoryItem) => item.padCode || '-',
    },
    { key: 'kategori', header: t('master.category') || 'KATEGORI' },
    { key: 'satuan', header: t('master.unit') || 'SATUAN/UOM' },
    {
      key: 'price',
      header: t('master.price') || 'PRICE',
      render: (item: InventoryItem) => `Rp ${(item.price || 0).toLocaleString('id-ID')}`,
    },
    // Hide STOCK/Premonth di UI untuk Material dan Product (karena calculated dari P1 + P2)
    // Tidak perlu show stockPremonth karena sudah dihitung dari P1 + P2
    // Show Stock P1 dan Stock P2 untuk Material
    ...(activeTab === 'material' ? [
      {
        key: 'stockP1',
        header: 'STOCK P1',
        render: (item: InventoryItem) => (item.stockP1 || 0).toLocaleString('id-ID'),
      },
      {
        key: 'stockP2',
        header: 'STOCK P2',
        render: (item: InventoryItem) => (item.stockP2 || 0).toLocaleString('id-ID'),
      },
    ] : [
      // Show Stock P1 dan Stock P2 untuk Product
      {
        key: 'stockP1',
        header: 'Stock P1',
        render: (item: InventoryItem) => (item.stockP1 || 0).toLocaleString('id-ID'),
      },
      {
        key: 'stockP2',
        header: 'Stock P2',
        render: (item: InventoryItem) => (item.stockP2 || 0).toLocaleString('id-ID'),
      },
    ]),
    {
      key: 'receive',
      header: activeTab === 'material' 
        ? 'RECEIVE (DARI PO/GRN)' 
        : 'Receive (dari QC PASS)',
      render: (item: InventoryItem) => (item.receive || 0).toLocaleString('id-ID'),
    },
    {
      key: 'outgoing',
      header: activeTab === 'material' 
        ? 'OUTGOING (UNTUK PRODUKSI)' 
        : 'Outgoing (untuk Delivery)',
      render: (item: InventoryItem) => (item.outgoing || 0).toLocaleString('id-ID'),
    },
    {
      key: 'anomaly',
      header: t('common.warning') || 'WARNING',
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
      header: t('common.return') || 'RETURN',
      render: (item: InventoryItem) => (item.return || 0).toLocaleString('id-ID'),
    },
    {
      key: 'nextStock',
      header: t('common.total') || 'NEXT STOCK',
      render: (item: InventoryItem) => {
        // Gunakan P1 + P2 sebagai stockPremonth untuk Material dan Product
        const stockPremonth = (item.stockP1 || 0) + (item.stockP2 || 0);
        const nextStock = stockPremonth + (item.receive || 0) - (item.outgoing || 0) + (item.return || 0);
        return (
          <span style={{ fontWeight: 'bold', color: nextStock < 0 ? '#f44336' : 'var(--text-primary)' }}>
            {nextStock.toLocaleString('id-ID')}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: t('common.actions') || 'ACTIONS',
      render: (item: InventoryItem) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          {item.stockDocumentationId && (
            <Button
              variant="secondary"
              onClick={() => setPreviewDocumentationId(item.stockDocumentationId || null)}
              style={{ fontSize: '11px', padding: '4px 8px', minHeight: '28px' }}
            >
              👁️ View
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => handleEditInventory(item)}
            style={{ fontSize: '11px', padding: '4px 8px', minHeight: '28px' }}
          >
            ✏️ Edit
          </Button>
        </div>
      ),
    },
  ], [t, activeTab]);

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
            ➕ Tambah Inventory
          </Button>
          <Button
            variant="primary"
            onClick={handleImportExcel}
            disabled={importLoading}
            style={{ fontSize: '14px', padding: '8px 16px' }}
          >
            {importLoading ? 'Mengimpor...' : '📤 Import Stock Opname'}
          </Button>
        </div>
      </div>

      {/* Inventory Table */}
      <Card>
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="tab-container" style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              className={`tab-button ${activeTab === 'material' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('material');
                setCurrentPage(1);
              }}
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
              onClick={() => {
                setActiveTab('product');
                setCurrentPage(1);
              }}
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
              🏭 Produk ({categorizeInventory.productItems.length})
            </button>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
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
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading inventory...
          </div>
        ) : filteredInventory.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            {searchQuery ? 'No items match your search.' : 'No inventory data. Click "Import Stock Opname" to import from Excel.'}
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={paginatedInventory}
              showPagination={false}
              emptyMessage="No inventory data"
              onRowClick={handleRowClick}
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
                  {searchQuery && ` (filtered from ${
                    activeTab === 'product'
                      ? categorizeInventory.productItems.length
                      : categorizeInventory.materialItems.length
                  } total)`}
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
          </>
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
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)' }}>
                ➕ Tambah Inventory
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
              {/* Type Toggle: Material or Product */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
                  Tipe Item *
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setAddInventoryForm({
                        ...addInventoryForm,
                        selectedMaterialId: '',
                        supplierName: '',
                        codeItem: '',
                        description: '',
                        kategori: 'Material',
                      });
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '6px',
                      border: addInventoryForm.kategori === 'Material' ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                      backgroundColor: addInventoryForm.kategori === 'Material' ? 'var(--accent-color)' : 'var(--bg-input)',
                      color: addInventoryForm.kategori === 'Material' ? 'white' : 'var(--text-primary)',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                    }}
                  >
                    📦 Material
                  </button>
                  <button
                    onClick={() => {
                      setAddInventoryForm({
                        ...addInventoryForm,
                        selectedMaterialId: '',
                        supplierName: '',
                        codeItem: '',
                        description: '',
                        kategori: 'Product',
                      });
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '6px',
                      border: addInventoryForm.kategori === 'Product' ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                      backgroundColor: addInventoryForm.kategori === 'Product' ? 'var(--accent-color)' : 'var(--bg-input)',
                      color: addInventoryForm.kategori === 'Product' ? 'white' : 'var(--text-primary)',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                    }}
                  >
                    📦 Product
                  </button>
                </div>
              </div>

              {/* Search/Filter for Material or Product */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
                  Cari {addInventoryForm.kategori} (Optional)
                </label>
                <Input
                  placeholder={`Cari ${addInventoryForm.kategori} berdasarkan kode atau nama...`}
                  value={addInventoryForm.selectedMaterialId}
                  onChange={(value) => setAddInventoryForm({ ...addInventoryForm, selectedMaterialId: value })}
                />
                <div style={{ 
                  marginTop: '8px', 
                  maxHeight: '150px', 
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-input)',
                }}>
                  {(addInventoryForm.kategori === 'Material' ? materials : products).filter(m => 
                    !addInventoryForm.selectedMaterialId || 
                    (m.kode || m.product_id || '').toLowerCase().includes(addInventoryForm.selectedMaterialId.toLowerCase()) ||
                    (m.nama || m.productName || '').toLowerCase().includes(addInventoryForm.selectedMaterialId.toLowerCase())
                  ).slice(0, 10).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleMaterialSelect(item.id)}
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-secondary)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      <strong>{item.kode || item.product_id}</strong> - {item.nama || item.productName}
                    </div>
                  ))}
                  {(addInventoryForm.kategori === 'Material' ? materials : products).filter(m => 
                    !addInventoryForm.selectedMaterialId || 
                    (m.kode || m.product_id || '').toLowerCase().includes(addInventoryForm.selectedMaterialId.toLowerCase()) ||
                    (m.nama || m.productName || '').toLowerCase().includes(addInventoryForm.selectedMaterialId.toLowerCase())
                  ).length === 0 && (
                    <div style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      Tidak ada {addInventoryForm.kategori} yang cocok
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Pilih dari list untuk auto-fill data (atau isi manual)
                </p>
              </div>

              <Input
                label="Supplier Name / Customer"
                value={addInventoryForm.supplierName}
                onChange={(value) => setAddInventoryForm({ ...addInventoryForm, supplierName: value })}
                placeholder={addInventoryForm.kategori === 'Material' ? 'Nama supplier' : 'Nama customer'}
              />
              <Input
                label="Code Item *"
                value={addInventoryForm.codeItem}
                onChange={(value) => setAddInventoryForm({ ...addInventoryForm, codeItem: value })}
                placeholder={addInventoryForm.kategori === 'Material' ? 'MTRL-00001' : 'FG-00001'}
              />
              <Input
                label="Description *"
                value={addInventoryForm.description}
                onChange={(value) => setAddInventoryForm({ ...addInventoryForm, description: value })}
                placeholder="Deskripsi item"
              />
              <Input
                label="Satuan"
                value={addInventoryForm.satuan}
                onChange={(value) => setAddInventoryForm({ ...addInventoryForm, satuan: value })}
                placeholder="PCS"
              />
              <Input
                label="Price"
                type="number"
                value={addInventoryForm.price}
                onChange={(value) => setAddInventoryForm({ ...addInventoryForm, price: value })}
                placeholder="Harga satuan"
              />
              <Input
                label="Stock Premonth *"
                type="number"
                value={addInventoryForm.stockPremonth}
                onChange={(value) => setAddInventoryForm({ ...addInventoryForm, stockPremonth: value })}
                placeholder="Masukkan stock awal (bisa negatif)"
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
                      stockDocumentationId: '',
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

      {/* Edit Inventory Dialog */}
      {showEditInventoryDialog && editingItem && (
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
          onClick={() => setShowEditInventoryDialog(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                ✏️ Edit Inventory - {editingItem.codeItem}
              </h2>
              <button
                onClick={() => setShowEditInventoryDialog(false)}
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
              <Input
                label={activeTab === 'material' ? 'Supplier Name' : 'Customer'}
                value={editInventoryForm.supplierName}
                onChange={(v) => setEditInventoryForm({ ...editInventoryForm, supplierName: v })}
                placeholder="Enter supplier/customer name"
              />

              <Input
                label="Code Item *"
                value={editInventoryForm.codeItem}
                onChange={(v) => setEditInventoryForm({ ...editInventoryForm, codeItem: v })}
                placeholder="Enter code item"
              />

              <Input
                label="Description *"
                value={editInventoryForm.description}
                onChange={(v) => setEditInventoryForm({ ...editInventoryForm, description: v })}
                placeholder="Enter description"
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Input
                  label="Satuan/UOM"
                  value={editInventoryForm.satuan}
                  onChange={(v) => setEditInventoryForm({ ...editInventoryForm, satuan: v })}
                  placeholder="PCS"
                />

                <Input
                  label="Price"
                  type="number"
                  value={editInventoryForm.price}
                  onChange={(v) => setEditInventoryForm({ ...editInventoryForm, price: v })}
                  placeholder="0"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Input
                  label="Stock P1"
                  type="number"
                  value={editInventoryForm.stockP1}
                  onChange={(v) => setEditInventoryForm({ ...editInventoryForm, stockP1: v })}
                  placeholder="0"
                />

                <Input
                  label="Stock P2"
                  type="number"
                  value={editInventoryForm.stockP2}
                  onChange={(v) => setEditInventoryForm({ ...editInventoryForm, stockP2: v })}
                  placeholder="0"
                />
              </div>

              <div style={{ 
                padding: '12px', 
                backgroundColor: 'var(--bg-secondary)', 
                borderRadius: '6px',
                fontSize: '14px'
              }}>
                <strong>Total Stock Premonth:</strong> {
                  (parseFloat(editInventoryForm.stockP1) || 0) + (parseFloat(editInventoryForm.stockP2) || 0)
                } {editInventoryForm.satuan}
              </div>

              <div style={{ 
                padding: '12px', 
                backgroundColor: 'var(--warning-bg, #fff3cd)', 
                borderRadius: '6px',
                fontSize: '13px',
                color: 'var(--warning-text, #856404)'
              }}>
                ⚠️ <strong>Note:</strong> Editing stock values will affect inventory calculations. 
                Receive, Outgoing, and Return values are preserved.
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button 
                variant="secondary" 
                onClick={() => setShowEditInventoryDialog(false)}
                disabled={loading}
              >
                Batal
              </Button>
              <Button 
                variant="primary" 
                onClick={handleSaveEditInventory}
                disabled={loading}
              >
                {loading ? 'Menyimpan...' : '💾 Simpan Perubahan'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Documentation Preview Modal */}
      {previewDocumentationId && (
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
          }}
          onClick={() => setPreviewDocumentationId(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '8px',
              padding: '20px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Stock Documentation</h2>
              <button
                onClick={() => setPreviewDocumentationId(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <img
                src={BlobService.getDownloadUrl(previewDocumentationId, 'packaging')}
                alt="Stock Documentation"
                style={{
                  maxWidth: '100%',
                  maxHeight: '400px',
                  borderRadius: '6px',
                  objectFit: 'contain',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button
                variant="secondary"
                onClick={() => BlobService.downloadFile(previewDocumentationId, 'packaging')}
              >
                ⬇️ Download
              </Button>
              <Button
                variant="secondary"
                onClick={() => setPreviewDocumentationId(null)}
              >
                Tutup
              </Button>
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

