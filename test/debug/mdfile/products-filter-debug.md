# PRODUCTS FILTER DEBUG - SALES ORDER

## 🔍 DEBUG YANG DITAMBAHKAN

Saya sudah menambahkan debug logging untuk trace masalah kenapa products di Sales Order tidak sama dengan master products.

## 📊 DEBUG POINTS

### 1. **Business Context Check**
```typescript
// Component mount
const selectedBusiness = localStorage.getItem('selectedBusiness');
const businessContext = storageService.getBusinessContext();
console.log(`🔍 [SalesOrders] Selected business: ${selectedBusiness}`);
console.log(`🔍 [SalesOrders] Business context: ${businessContext}`);
```

### 2. **Product Loading Debug**
```typescript
// loadProducts function
const business = storageService.getBusinessContext();
console.log(`🔍 [ProductLoad] Business context: ${business}`);

const dataRaw = extractStorageValue(await storageService.get<Product[]>('products'));
console.log(`🔍 [ProductLoad] Raw data from storage: ${dataRaw?.length || 0} items`);

const data = filterActiveItems(dataRaw);
console.log(`🔍 [ProductLoad] After filtering deleted items: ${data?.length || 0} items`);
```

### 3. **Sync Process Debug**
```typescript
// checkAndSyncProducts function
console.log(`🔍 [ProductSync] Business context: ${storageService.getBusinessContext()}`);
console.log(`🔍 [ProductSync] Local storage key: ${localStorageKey}`);
console.log(`🔍 [ProductSync] Server key: ${serverKey}`);
console.log(`🔍 [ProductSync] Server URL: ${serverUrl}`);
console.log(`📊 [ProductSync] Server data items: ${Array.isArray(serverData.value) ? serverData.value.length : 'not array'}`);
```

## 🎯 KEMUNGKINAN MASALAH

### 1. **Business Context Filter**
```typescript
// src/services/storage.ts - isKeyForCurrentBusiness()
private isKeyForCurrentBusiness(key: string): boolean {
  const business = this.getBusinessContext();
  
  // Packaging: no prefix
  if (business === 'packaging') {
    // Only sync keys without prefix (packaging data)
    return !key.includes('/') || key.startsWith('storage_config');
  }
  
  // General Trading & Trucking: must have prefix
  const prefix = `${business}/`;
  return key.startsWith(prefix) || key.startsWith('storage_config');
}
```

**MASALAH POTENSIAL:**
- Jika `selectedBusiness` tidak di-set atau salah
- Jika business context tidak 'packaging'
- Key 'products' akan di-filter out untuk non-packaging business

### 2. **Storage Key Mapping**
```typescript
// getStorageKey function
private getStorageKey(key: string, forServer: boolean = false): string {
  const business = this.getBusinessContext();
  
  if (business === 'packaging') {
    return key; // 'products'
  }
  
  if (forServer) {
    return key; // Server stores normalized keys
  }
  
  return `${business}/${key}`; // 'general-trading/products'
}
```

**MASALAH POTENSIAL:**
- Local key: 'general-trading/products'
- Server key: 'products'
- Bisa mismatch antara local dan server

### 3. **Data Wrapping**
```typescript
// extractStorageValue function
export const extractStorageValue = (data: any): any[] => {
  if (!data) return [];
  // Handle wrapped object {value: ..., timestamp: ...}
  if (data && typeof data === 'object' && !Array.isArray(data) && 'value' in data) {
    const extracted = data.value;
    return Array.isArray(extracted) ? extracted : (extracted ? [] : []);
  }
  return Array.isArray(data) ? data : [];
};
```

**MASALAH POTENSIAL:**
- Data tidak ter-wrap dengan benar
- Timestamp metadata hilang
- Array conversion gagal

### 4. **Deleted Items Filter**
```typescript
// filterActiveItems function
export const filterActiveItems = <T extends Record<string, any>>(items: T[]): T[] => {
  if (!Array.isArray(items)) return [];
  
  return items.filter(item => {
    if (!item) return false;
    // Cek semua kemungkinan deleted flag
    return !(
      item.deleted === true ||
      item.deleted === 'true' ||
      !!item.deletedAt ||
      !!item.deletedTimestamp
    );
  });
};
```

**MASALAH POTENSIAL:**
- Terlalu banyak items ter-filter sebagai deleted
- Deleted flag tidak konsisten
- Filter terlalu agresif

## 🔧 CARA DEBUG

### 1. **Buka Console Browser**
- F12 → Console tab
- Refresh page atau buka Sales Order dialog
- Lihat log debug yang muncul

### 2. **Check Business Context**
```javascript
// Di console browser
localStorage.getItem('selectedBusiness')
storageService.getBusinessContext()
```

### 3. **Check Raw Products Data**
```javascript
// Di console browser
storageService.get('products').then(data => console.log('Raw products:', data))
localStorage.getItem('products') // atau localStorage.getItem('general-trading/products')
```

### 4. **Compare dengan Master Products**
- Buka Master Products page
- Lihat berapa jumlah products
- Compare dengan Sales Order products count

## 📋 LANGKAH TROUBLESHOOTING

### 1. **Cek Business Context**
- Pastikan `selectedBusiness` = 'packaging'
- Jika bukan, set manual: `localStorage.setItem('selectedBusiness', 'packaging')`

### 2. **Cek Storage Keys**
- Local key harus 'products' untuk packaging
- Server key harus 'products'
- Tidak boleh ada prefix untuk packaging

### 3. **Cek Data Format**
- Raw data harus array atau wrapped object
- Tidak boleh null/undefined
- Harus ada timestamp untuk sync

### 4. **Cek Filter**
- Pastikan tidak ada deleted flag yang salah
- Cek apakah ada items yang ter-mark deleted
- Validate filter logic

## 🎯 EXPECTED OUTPUT

Jika normal, console log harus menunjukkan:
```
🔍 [SalesOrders] Selected business: packaging
🔍 [SalesOrders] Business context: packaging
🔍 [ProductLoad] Business context: packaging
🔍 [ProductLoad] Raw data from storage: 50 items
🔍 [ProductLoad] After filtering deleted items: 45 items
```

Jika ada masalah, akan terlihat:
```
🔍 [SalesOrders] Selected business: null (atau general-trading)
🔍 [ProductLoad] Raw data from storage: 0 items
```

**SEKARANG BUKA SALES ORDER DAN CEK CONSOLE LOG! 🔍**