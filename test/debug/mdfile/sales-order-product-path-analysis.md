# SALES ORDER - PRODUCT SELECTION PATH ANALYSIS

## HASIL TRACE: PATH DATA PRODUCTS SAAT CREATE SALES ORDER

### 🔍 FLOW LENGKAP:

## 1. INITIAL DATA LOADING

### A. Component Mount (useEffect)
```typescript
// src/pages/Packaging/SalesOrders.tsx line 383-391
useEffect(() => {
  loadOrders();
  loadQuotations();
  loadCustomers();
  loadProducts();      // ← INI YANG LOAD PRODUCTS
  loadMaterials();
  loadBOM();
}, []);
```

### B. loadProducts Function
```typescript
// src/pages/Packaging/SalesOrders.tsx line 618-623
const loadProducts = async () => {
  const dataRaw = await storageService.get<Product[]>('products') || [];
  // Filter out deleted items menggunakan helper function
  const data = filterActiveItems(dataRaw);
  setProducts(data);
};
```

## 2. STORAGE SERVICE PATH

### A. storageService.get('products')
```typescript
// src/services/storage.ts line 77-89
private getStorageKey(key: string, forServer: boolean = false): string {
  const business = this.getBusinessContext();
  // Packaging tetap pakai key asli untuk backward compatibility
  if (business === 'packaging') {
    return key;  // ← 'products' tetap jadi 'products'
  }
  // General Trading dan Trucking pakai prefix
  return `${business}/${key}`;
}
```

### B. Data Source Priority
```typescript
// src/services/storage.ts line 275-390
async get<T>(key: string, retryCount: number = 0): Promise<T | null> {
  const storageKey = this.getStorageKey(key); // 'products'
  
  if (config.type === 'local') {
    // 1. Try file-based storage first (Electron)
    if (electronAPI && electronAPI.loadStorage) {
      const result = await electronAPI.loadStorage(storageKey);
      // Path: app-data/storage/products.json
    }
    
    // 2. Fallback to localStorage
    const value = localStorage.getItem(storageKey);
    // Key: 'products'
  } else {
    // Server storage
    const serverKey = this.getStorageKey(key, true); // 'products'
    // URL: http://server:8888/api/storage/products
  }
}
```

## 3. SERVER-SIDE PATH (Jika Mode Server)

### A. Server Endpoint
```
GET http://localhost:8888/api/storage/products
```

### B. Server File Path (docker/server.js)
```javascript
// docker/server.js line 22-45
function getFilePath(key) {
  const packagingKeys = ['products', 'bom', 'materials', ...];
  
  // 'products' adalah packaging key
  if (packagingKeys.includes(key)) {
    return path.join(DATA_DIR, 'localStorage', 'packaging', `${key}.json`);
    // Result: docker/data/localStorage/packaging/products.json
  }
}
```

## 4. PRODUCT SELECTION DIALOG

### A. Dialog Trigger
```typescript
// src/pages/Packaging/SalesOrders.tsx line 3099
onClick={() => {
  setProductDialogSearch('');
  setShowProductDialog(index);  // Show dialog for item index
}}
```

### B. Filtered Products for Dialog
```typescript
// src/pages/Packaging/SalesOrders.tsx line 665-677
const filteredProductsForDialog = useMemo(() => {
  let filtered = products;  // ← Data dari loadProducts()
  if (productDialogSearch) {
    const query = productDialogSearch.toLowerCase();
    filtered = products.filter(p => {
      const code = (p.product_id || p.kode || '').toLowerCase();
      const name = (p.nama || '').toLowerCase();
      return code.includes(query) || name.includes(query);
    });
  }
  return filtered.slice(0, 200); // Limit 200 for performance
}, [productDialogSearch, products]);
```

### C. Product Selection
```typescript
// src/pages/Packaging/SalesOrders.tsx line 3681-3700
const handleSelect = () => {
  if (showProductDialog !== null) {
    const index = showProductDialog;
    const productIdToSet = String(prod.product_id || prod.kode || '').trim();
    if (productIdToSet) {
      handleUpdateItem(index, 'productId', productIdToSet);
    }
    // Also update padCode from master product
    if (prod.padCode) {
      // Update padCode di form item
    }
    setShowProductDialog(null);
  }
};
```

## 5. COMPLETE PATH SUMMARY

### 📂 LOCAL MODE (Default):
```
1. Component Mount
   ↓
2. loadProducts()
   ↓
3. storageService.get('products')
   ↓
4. getStorageKey('products') → 'products'
   ↓
5. Try Electron File Storage:
   app-data/storage/products.json
   ↓
6. Fallback localStorage:
   key: 'products'
   ↓
7. filterActiveItems() → Remove deleted
   ↓
8. setProducts(data) → State update
   ↓
9. Dialog shows filteredProductsForDialog
   ↓
10. User selects → handleUpdateItem()
```

### 🌐 SERVER MODE:
```
1. Component Mount
   ↓
2. loadProducts()
   ↓
3. storageService.get('products')
   ↓
4. getStorageKey('products', true) → 'products'
   ↓
5. Fetch: GET /api/storage/products
   ↓
6. Server getFilePath('products')
   ↓
7. File: docker/data/localStorage/packaging/products.json
   ↓
8. Response → Client
   ↓
9. filterActiveItems() → Remove deleted
   ↓
10. setProducts(data) → State update
   ↓
11. Dialog shows filteredProductsForDialog
   ↓
12. User selects → handleUpdateItem()
```

## 6. KEY FINDINGS

### ✅ PACKAGING BUSINESS:
- **Key**: `'products'` (no prefix)
- **Local File**: `app-data/storage/products.json`
- **Server File**: `docker/data/localStorage/packaging/products.json`
- **localStorage Key**: `'products'`

### ✅ GENERAL TRADING BUSINESS:
- **Key**: `'general-trading/products'` (local), `'products'` (server)
- **Local File**: `app-data/storage/general-trading/products.json`
- **Server File**: `docker/data/localStorage/packaging/products.json` (same as packaging!)
- **localStorage Key**: `'general-trading/products'`

### ⚠️ POTENSI MASALAH:
1. **Shared Server Storage**: GT dan Packaging share same server file untuk products
2. **Business Separation**: Hanya di client-side (localStorage), server-side merged
3. **Data Conflicts**: Bisa terjadi conflict jika GT dan Packaging punya product dengan ID sama

### 🎯 KESIMPULAN:
**Saat create Sales Order di Packaging, product data ditarik dari:**
- **Path Utama**: `docker/data/localStorage/packaging/products.json` (server mode)
- **Path Fallback**: `localStorage['products']` atau `app-data/storage/products.json` (local mode)
- **Business Context**: Packaging (no prefix)
- **Filter**: Active items only (deleted items filtered out)