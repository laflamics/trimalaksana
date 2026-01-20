# PACKAGING MODULE KEY GENERATION & DATABASE PATH ANALYSIS

## HASIL TEST: APAKAH KEY WRITE KE PATH YANG SAMA ATAU BERBEDA?

**JAWABAN: WRITE KE BEBERAPA PATH BERBEDA BERDASARKAN BUSINESS CONTEXT DAN KEY TYPE**

## 1. KEY GENERATION PATTERNS

### A. Packaging Keys (dari packaging-sync.ts)
```javascript
// Format: {prefix}-{timestamp}-{random}
qc-1736424000000-abc123def
notif-1736424000000-xyz789ghi
device-1736424000000-mno456pqr
```

### B. Sync Operation Keys
```javascript
// Format: {key}_{timestamp}_{random}
salesOrders_1736424000000_abc123def
production_1736424000000_xyz789ghi
```

## 2. CLIENT-SIDE STORAGE KEY MAPPING

### A. Packaging Business (Default)
```
products -> Local: "products", Server: "products"
salesOrders -> Local: "salesOrders", Server: "salesOrders"  
production -> Local: "production", Server: "production"
qc -> Local: "qc", Server: "qc"
deliveryNotes -> Local: "deliveryNotes", Server: "deliveryNotes"
invoices -> Local: "invoices", Server: "invoices"
```

### B. General Trading Business
```
products -> Local: "general-trading/products", Server: "products"
salesOrders -> Local: "general-trading/salesOrders", Server: "salesOrders"
production -> Local: "general-trading/production", Server: "production"
```

### C. Trucking Business
```
products -> Local: "trucking/products", Server: "products"
salesOrders -> Local: "trucking/salesOrders", Server: "salesOrders"
```

## 3. SERVER FILE PATH MAPPING

### A. Packaging Keys → `docker/data/localStorage/packaging/`
```
products -> docker/data/localStorage/packaging/products.json
bom -> docker/data/localStorage/packaging/bom.json
materials -> docker/data/localStorage/packaging/materials.json
salesOrders -> docker/data/localStorage/packaging/salesOrders.json
spk -> docker/data/localStorage/packaging/spk.json
production -> docker/data/localStorage/packaging/production.json
qc -> docker/data/localStorage/packaging/qc.json
deliveryNotes -> docker/data/localStorage/packaging/deliveryNotes.json
invoices -> docker/data/localStorage/packaging/invoices.json
inventory -> docker/data/localStorage/packaging/inventory.json
customers -> docker/data/localStorage/packaging/customers.json
suppliers -> docker/data/localStorage/packaging/suppliers.json
journalEntries -> docker/data/localStorage/packaging/journalEntries.json
accounts -> docker/data/localStorage/packaging/accounts.json
companySettings -> docker/data/localStorage/packaging/companySettings.json
```

### B. General Trading Keys → `docker/data/localStorage/general-trading/`
```
gt_products -> docker/data/localStorage/general-trading/gt_products.json
gt_customers -> docker/data/localStorage/general-trading/gt_customers.json
gt_inventory -> docker/data/localStorage/general-trading/gt_inventory.json
```

### C. Trucking Keys → `docker/data/localStorage/trucking/`
```
trucking_orders -> docker/data/localStorage/trucking/trucking_orders.json
trucking_drivers -> docker/data/localStorage/trucking/trucking_drivers.json
```

### D. Keys dengan Prefix → Sesuai prefix
```
packaging/products -> docker/data/localStorage/packaging/products.json
general-trading/gt_products -> docker/data/localStorage/general-trading/gt_products.json
```

### E. Other Keys → `docker/data/`
```
storage_config -> docker/data/storage_config.json
user_settings -> docker/data/user_settings.json
```

## 4. PATH DISTRIBUTION ANALYSIS

```
docker/data/localStorage/packaging: 15+ files (semua packaging keys)
docker/data/localStorage/general-trading: 3+ files (gt_* keys)
docker/data/localStorage/trucking: 2+ files (trucking_* keys)
docker/data: 2+ files (config & other keys)
```

## 5. KESIMPULAN

### ✅ PACKAGING MODULE WRITE KE BEBERAPA PATH BERBEDA:

1. **Path Utama**: `docker/data/localStorage/packaging/` - untuk semua packaging keys
2. **Path GT**: `docker/data/localStorage/general-trading/` - untuk GT keys (gt_*)
3. **Path Trucking**: `docker/data/localStorage/trucking/` - untuk trucking keys
4. **Path Config**: `docker/data/` - untuk config dan system keys

### 🔍 DETAIL PENTING:

1. **Business Context Separation**: Setiap business type (packaging, general-trading, trucking) punya folder terpisah
2. **Key Normalization**: Client-side pakai prefix untuk local storage, tapi server-side normalize jadi key biasa
3. **Backward Compatibility**: Packaging keys tetap pakai nama asli tanpa prefix
4. **Conflict Resolution**: Pakai device ID + timestamp untuk resolve conflicts antar device
5. **Tombstone Pattern**: Deleted items tidak dihapus permanent, tapi di-mark sebagai deleted

### 🚨 POTENSI MASALAH:

1. **Cross-Business Conflicts**: Jika ada key yang sama di business berbeda, bisa conflict di server
2. **Path Complexity**: Logic path determination cukup complex, bisa error jika ada edge case
3. **Sync Complexity**: Harus handle normalization key saat sync antara client-server

### 📋 REKOMENDASI:

1. **Monitor Path Usage**: Pastikan semua keys write ke path yang benar
2. **Test Cross-Business**: Test scenario dimana ada key sama di business berbeda
3. **Validate Sync**: Pastikan sync process handle key normalization dengan benar
4. **Error Handling**: Tambah error handling untuk edge cases di path determination