# LOCAL vs SERVER STORAGE SYNC ANALYSIS

## JAWABAN: APAKAH LOCAL STORAGE SINKRON DENGAN SERVER?

**✅ YA, MEREKA SINKRON - TAPI DENGAN STRATEGI HYBRID**

## 1. MEKANISME SYNC LENGKAP

### A. Storage Mode Configuration
```typescript
// src/services/storage.ts
interface StorageConfig {
  type: 'local' | 'server';  // Mode storage
  serverUrl?: string;        // URL server jika mode server
}
```

### B. Hybrid Strategy (Server Mode)
```typescript
// Saat mode 'server', tetap pakai local storage sebagai cache
// Server storage = Local cache + Server sync
async get<T>(key: string): Promise<T | null> {
  if (config.type === 'local') {
    // Pure local - no sync
    return localStorage.getItem(key);
  } else {
    // HYBRID: Local first + Background sync
    // STEP 1: Load from local storage first (instant response)
    const localValue = localStorage.getItem(storageKey);
    
    // STEP 2: Return local value immediately
    if (localValue !== null) {
      // STEP 3: Sync from server in background (don't wait)
      this.syncFromServerBackground(key, serverKey, storageKey, localValue, localTimestamp);
      return localValue;  // ← INSTANT RESPONSE
    }
    
    // STEP 4: If no local data, sync from server in background
    this.syncFromServerBackground(key, serverKey, storageKey, null, 0);
    return null; // Return null immediately, sync will update localStorage
  }
}
```

## 2. AUTO-SYNC MECHANISM

### A. Auto-Sync Configuration
```typescript
// Default: sync setiap 5 menit
private autoSyncIntervalMs = 300000; // 5 minutes

// Bidirectional sync
setInterval(() => {
  this.syncToServer();    // Push local → server
  this.syncFromServer();  // Pull server → local
}, this.autoSyncIntervalMs);
```

### B. Sync Triggers
1. **Initial Setup**: Saat switch ke server mode
2. **Periodic Sync**: Setiap 5 menit (configurable)
3. **Background Sync**: Saat get() data yang tidak ada di local
4. **Manual Sync**: Saat user trigger sync

### C. Sync Direction
```
LOCAL STORAGE ←→ SERVER STORAGE
     ↑              ↓
   Push           Pull
(syncToServer) (syncFromServer)
```

## 3. INCREMENTAL SYNC STRATEGY

### A. Timestamp-Based Sync
```typescript
// Track last sync timestamp
private getLastSyncTimestamp(): number {
  const saved = localStorage.getItem('last_sync_timestamp');
  return saved ? parseInt(saved, 10) : 0;
}

// Incremental sync: only sync data changed since last sync
const sinceParam = lastSyncTimestamp > 0 ? `?since=${lastSyncTimestamp}` : '';
const url = `${config.serverUrl}/api/storage/all${sinceParam}`;
```

### B. Conflict Resolution
```typescript
// Last-Write-Wins strategy
if (serverTimestamp > localTimestamp) {
  // Server data is newer, update local
  localStorage.setItem(key, JSON.stringify(serverData));
} else if (localTimestamp > serverTimestamp) {
  // Local data is newer, push to server
  await fetch(`${serverUrl}/api/storage/${key}`, {
    method: 'POST',
    body: JSON.stringify(localData)
  });
}
```

## 4. BUSINESS CONTEXT HANDLING

### A. Key Normalization
```typescript
// Client-side: business prefix untuk organization
getStorageKey(key: string, forServer: boolean = false): string {
  const business = this.getBusinessContext(); // 'packaging', 'general-trading', 'trucking'
  
  if (business === 'packaging') {
    return key; // 'products'
  }
  
  if (forServer) {
    return key; // Server stores normalized keys
  }
  
  return `${business}/${key}`; // 'general-trading/products'
}
```

### B. Server-Side Path Mapping
```javascript
// docker/server.js - getFilePath()
function getFilePath(key) {
  // Packaging keys → docker/data/localStorage/packaging/
  if (packagingKeys.includes(key)) {
    return `docker/data/localStorage/packaging/${key}.json`;
  }
  
  // GT keys → docker/data/localStorage/general-trading/
  if (key.startsWith('gt_')) {
    return `docker/data/localStorage/general-trading/${key}.json`;
  }
  
  // Trucking keys → docker/data/localStorage/trucking/
  if (key.startsWith('trucking_')) {
    return `docker/data/localStorage/trucking/${key}.json`;
  }
}
```

## 5. SYNC FLOW UNTUK PRODUCTS DATA

### A. Packaging Business - Products Sync
```
1. User buka Sales Order
   ↓
2. loadProducts() calls storageService.get('products')
   ↓
3. getStorageKey('products') → 'products' (no prefix)
   ↓
4. Check localStorage['products'] first
   ↓
5. If found: return immediately + background sync
   ↓
6. Background sync:
   - syncFromServer() calls GET /api/storage/all?since=timestamp
   - Server reads docker/data/localStorage/packaging/products.json
   - Compare timestamps
   - Update localStorage if server newer
   ↓
7. Auto-sync every 5 minutes:
   - syncToServer(): Push local changes → server
   - syncFromServer(): Pull server changes → local
```

### B. Data Consistency Check
```typescript
// Filter by business context
private isKeyForCurrentBusiness(key: string): boolean {
  const business = this.getBusinessContext();
  
  if (business === 'packaging') {
    // Only sync keys without prefix (packaging data)
    return !key.includes('/') || key.startsWith('storage_config');
  }
  
  // GT & Trucking: must have prefix
  const prefix = `${business}/`;
  return key.startsWith(prefix) || key.startsWith('storage_config');
}
```

## 6. KESIMPULAN SYNC STATUS

### ✅ **SINKRON PENUH** - Dengan Catatan:

1. **Mode Local**: 
   - ❌ NO SYNC - Pure local storage
   - Path: `localStorage['products']` atau `app-data/storage/products.json`

2. **Mode Server**:
   - ✅ FULL SYNC - Bidirectional sync
   - Local: `localStorage['products']` (cache)
   - Server: `docker/data/localStorage/packaging/products.json`
   - Sync: Every 5 minutes + background sync

### 🔄 **SYNC CHARACTERISTICS**:

1. **Instant Response**: Local data returned immediately
2. **Background Sync**: Server sync tidak blocking UI
3. **Incremental**: Hanya sync data yang berubah
4. **Conflict Resolution**: Last-write-wins dengan timestamp
5. **Business Separation**: Setiap business context punya namespace terpisah
6. **Fault Tolerance**: Jika server down, tetap pakai local cache

### ⚠️ **POTENSI ISSUES**:

1. **Network Dependency**: Sync gagal jika network bermasalah
2. **Timestamp Conflicts**: Bisa terjadi jika system clock tidak sync
3. **Business Context Mixing**: GT dan Packaging bisa share server files
4. **Cache Staleness**: Local cache bisa outdated jika sync gagal

### 📊 **UNTUK PRODUCTS SPECIFICALLY**:

- **Local Storage Key**: `'products'` (packaging) atau `'general-trading/products'` (GT)
- **Server File Path**: `docker/data/localStorage/packaging/products.json` (both!)
- **Sync Frequency**: Every 5 minutes + on-demand
- **Consistency**: ✅ Eventually consistent (within 5 minutes)
- **Performance**: ✅ Instant load (local cache) + background sync

**JADI JAWABANNYA: YA, LOCAL DAN SERVER SINKRON - tapi local sebagai cache dengan background sync untuk performance optimal.**