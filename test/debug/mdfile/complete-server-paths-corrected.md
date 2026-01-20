# Complete Server Paths Analysis - CORRECTED VERSION

## 🌐 SERVER API ENDPOINTS STRUCTURE

### Base Server Configuration
- **Base URL**: `{serverUrl}/api/storage/{business}/{key}`
- **Business Types**: `packaging`, `general-trading`, `trucking`
- **Protocol**: HTTPS for Vercel/Tailscale, HTTP for others

---

## 📦 PACKAGING MODULE SERVER PATHS

### Storage API Endpoints (`/api/storage/packaging/`)
- `/api/storage/packaging/salesOrders`
- `/api/storage/packaging/purchaseOrders`
- `/api/storage/packaging/production`
- `/api/storage/packaging/deliveryNotes`
- `/api/storage/packaging/deliveryNotifications`
- `/api/storage/packaging/productionNotifications`
- `/api/storage/packaging/spk`
- `/api/storage/packaging/qc`
- `/api/storage/packaging/grn`
- `/api/storage/packaging/inventory`
- `/api/storage/packaging/materials`
- `/api/storage/packaging/bom`
- `/api/storage/packaging/schedule`
- `/api/storage/packaging/returns`
- `/api/storage/packaging/quotations`
- `/api/storage/packaging/customers`
- `/api/storage/packaging/suppliers`
- `/api/storage/packaging/products`
- `/api/storage/packaging/accounts`
- `/api/storage/packaging/journalEntries`
- `/api/storage/packaging/payments`
- `/api/storage/packaging/invoices`
- `/api/storage/packaging/taxRecords`
- `/api/storage/packaging/userAccessControl`

---

## 🏪 GENERAL TRADING MODULE SERVER PATHS

### Storage API Endpoints (`/api/storage/general-trading/`)
- `/api/storage/general-trading/gt_salesOrders`
- `/api/storage/general-trading/gt_customers`
- `/api/storage/general-trading/gt_products`
- `/api/storage/general-trading/gt_suppliers`
- `/api/storage/general-trading/gt_inventory`
- `/api/storage/general-trading/gt_purchaseOrders`
- `/api/storage/general-trading/gt_delivery`
- `/api/storage/general-trading/gt_deliveryNotifications`
- `/api/storage/general-trading/gt_ppicNotifications`
- `/api/storage/general-trading/gt_spk`
- `/api/storage/general-trading/gt_quotations`
- `/api/storage/general-trading/gt_invoiceNotifications`
- `/api/storage/general-trading/gt_financeNotifications`
- `/api/storage/general-trading/gt_paymentNotifications`
- `/api/storage/general-trading/gt_accounts`
- `/api/storage/general-trading/gt_journalEntries`
- `/api/storage/general-trading/gt_payments`
- `/api/storage/general-trading/gt_invoices`
- `/api/storage/general-trading/gt_taxRecords`
- `/api/storage/general-trading/userAccessControl`

---

## 🚛 TRUCKING MODULE SERVER PATHS

### Storage API Endpoints (`/api/storage/trucking/`)
- `/api/storage/trucking/trucking_delivery_orders`
- `/api/storage/trucking/trucking_customers`
- `/api/storage/trucking/trucking_vehicles`
- `/api/storage/trucking/trucking_drivers`
- `/api/storage/trucking/trucking_routes`
- `/api/storage/trucking/trucking_suratJalan`
- `/api/storage/trucking/trucking_suratJalanNotifications`
- `/api/storage/trucking/trucking_unitNotifications`
- `/api/storage/trucking/trucking_unitSchedules`
- `/api/storage/trucking/trucking_accounts`
- `/api/storage/trucking/trucking_journalEntries`
- `/api/storage/trucking/trucking_payments`
- `/api/storage/trucking/trucking_invoices`
- `/api/storage/trucking/trucking_invoiceNotifications`
- `/api/storage/trucking/trucking_bills`
- `/api/storage/trucking/trucking_expenses`
- `/api/storage/trucking/trucking_pettyCash`
- `/api/storage/trucking/trucking_pettycash_requests`
- `/api/storage/trucking/trucking_pettycash_memos`
- `/api/storage/trucking/trucking_pettyCashNotifications`
- `/api/storage/trucking/trucking_taxRecords`
- `/api/storage/trucking/trucking_auditLogs`
- `/api/storage/trucking/trucking_userAccessControl`

---

## 🔧 SHARED/SYSTEM SERVER PATHS

### Storage API Endpoints (Business-agnostic)
- `/api/storage/packaging/activityLogs`
- `/api/storage/packaging/userAccessControl`
- `/api/storage/packaging/companySettings`
- `/api/storage/packaging/staff`
- `/api/storage/packaging/audit`
- `/api/storage/packaging/fingerprintConfig`
- `/api/storage/packaging/attendance`

### Other API Endpoints
- `/api/updates/latest.yml` - Desktop app updates
- `/api/updates/latest-android.yml` - Mobile app updates  
- `/api/updates/{apkFile}` - APK download
- `/api/fingerprint/attendance` - Fingerprint device integration

---

## 📁 LOCAL FILE SYSTEM PATHS

### Data Storage Structure
```
data/
├── localStorage/
│   ├── packaging/           # Packaging business data
│   ├── general-trading/     # GT business data  
│   ├── trucking/           # Trucking business data
│   └── *.json              # Shared/root data files
├── gt.json/                # GT specific data
├── uploads/                # File uploads
└── trimafolder/           # Temporary files
```

### Business-Specific Local Paths
- **Packaging**: `data/localStorage/packaging/{key}.json`
- **General Trading**: `data/localStorage/general-trading/{key}.json`
- **Trucking**: `data/localStorage/trucking/{key}.json`

---

## 🔄 SYNC MECHANISM

### Server Path Resolution Logic
```typescript
// From storage.ts
if (business === 'packaging') {
  serverPath = `packaging/${key}`;
} else if (business === 'general-trading') {
  serverPath = `general-trading/${key}`;
} else if (business === 'trucking') {
  serverPath = `trucking/${key}`;
}

// Final API endpoint
const apiEndpoint = `${serverUrl}/api/storage/${encodeURIComponent(serverPath)}`;
```

### Cross-Device Sync
- **Read**: Local first, sync from server in background
- **Write**: Local immediately, sync to server asynchronously
- **Conflict Resolution**: Server wins, local data updated

---

## 📊 SUMMARY STATISTICS

| Module | Storage Keys | API Endpoints | Local Files |
|--------|-------------|---------------|-------------|
| **Packaging** | 25+ | 25+ | 25+ |
| **General Trading** | 20+ | 20+ | 20+ |
| **Trucking** | 23+ | 23+ | 23+ |
| **Shared** | 8+ | 8+ | 8+ |

**Total Server Paths: 76+ API endpoints**

---

## 🎯 KEY DIFFERENCES FROM PREVIOUS ANALYSIS

1. **Server Paths**: Added actual API storage endpoints structure
2. **Business Context**: Proper business-specific path mapping
3. **Storage Keys**: Complete list of actual storage keys used
4. **Sync Logic**: Detailed server path resolution mechanism
5. **File Structure**: Accurate local storage organization

This corrected analysis shows the **actual server paths** used by the application, not just the component file structure.