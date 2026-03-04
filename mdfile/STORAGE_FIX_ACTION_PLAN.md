# Storage Path Fix - Action Plan

## 🎯 Objective
Standardisasi semua storage path read/write di seluruh module untuk memastikan:
- ✅ Konsistensi prefix per business unit
- ✅ Semua akses melalui storageService
- ✅ Sync mechanism bekerja sempurna
- ✅ Backward compatibility terjaga

---

## 📋 PHASE 1: DECISION & PREPARATION (Week 1)

### Step 1.1: Decide Prefix Strategy ⏰ 1 day

**Option A: Semua Pakai Prefix (RECOMMENDED)**
```typescript
// Packaging
'packaging/salesOrders'
'packaging/delivery'
'packaging/invoices'

// General Trading  
'general-trading/gt_salesOrders'
'general-trading/gt_customers'

// Trucking
'trucking/trucking_suratJalan'
'trucking/trucking_routes'
```

**Pros**:
- ✅ Jelas business unit mana
- ✅ Mudah filter di localStorage
- ✅ Konsisten dengan GT & Trucking yang sudah ada
- ✅ Isolasi data antar business unit terjamin

**Cons**:
- ❌ Breaking change untuk Packaging existing users
- ❌ Perlu migration script

**Option B: Semua Tanpa Prefix**
```typescript
// Packaging
'salesOrders'
'delivery'

// General Trading
'gt_salesOrders'
'gt_customers'

// Trucking
'trucking_suratJalan'
'trucking_routes'
```

**Pros**:
- ✅ Backward compatible dengan Packaging
- ✅ Lebih pendek

**Cons**:
- ❌ Tidak jelas business unit mana
- ❌ Sulit filter di localStorage
- ❌ Breaking change untuk GT & Trucking

**RECOMMENDATION**: **Option A** - Semua pakai prefix

**Reason**:
1. GT & Trucking sudah pakai prefix (80%+ adoption)
2. Lebih maintainable long-term
3. Better isolation
4. Migration script bisa handle backward compatibility

---

### Step 1.2: Create Migration Script ⏰ 2 days

**File**: `scripts/migrate-storage-keys-to-prefix.js`

```javascript
/**
 * Migration Script: Add Prefix to All Storage Keys
 * 
 * This script migrates existing localStorage data to use consistent prefixes:
 * - Packaging: Add 'packaging/' prefix
 * - General Trading: Ensure 'general-trading/' prefix
 * - Trucking: Ensure 'trucking/' prefix
 */

const fs = require('fs');
const path = require('path');

// Define migrations
const MIGRATIONS = {
  packaging: [
    { from: 'salesOrders', to: 'packaging/salesOrders' },
    { from: 'delivery', to: 'packaging/delivery' },
    { from: 'invoices', to: 'packaging/invoices' },
    { from: 'products', to: 'packaging/products' },
    { from: 'customers', to: 'packaging/customers' },
    { from: 'suppliers', to: 'packaging/suppliers' },
    { from: 'inventory', to: 'packaging/inventory' },
    { from: 'materials', to: 'packaging/materials' },
    { from: 'bom', to: 'packaging/bom' },
    { from: 'production', to: 'packaging/production' },
    { from: 'spk', to: 'packaging/spk' },
    { from: 'qc', to: 'packaging/qc' },
    { from: 'grn', to: 'packaging/grn' },
    { from: 'grnPackaging', to: 'packaging/grnPackaging' },
    { from: 'purchaseOrders', to: 'packaging/purchaseOrders' },
    { from: 'purchaseRequests', to: 'packaging/purchaseRequests' },
    { from: 'quotations', to: 'packaging/quotations' },
    { from: 'schedule', to: 'packaging/schedule' },
    { from: 'payments', to: 'packaging/payments' },
    { from: 'expenses', to: 'packaging/expenses' },
    { from: 'operationalExpenses', to: 'packaging/operationalExpenses' },
    { from: 'journalEntries', to: 'packaging/journalEntries' },
    { from: 'taxRecords', to: 'packaging/taxRecords' },
    { from: 'returns', to: 'packaging/returns' },
    { from: 'accounts', to: 'packaging/accounts' },
    { from: 'staff', to: 'packaging/staff' },
    { from: 'attendance', to: 'packaging/attendance' },
    { from: 'activityLogs', to: 'packaging/activityLogs' },
    { from: 'productionNotifications', to: 'packaging/productionNotifications' },
    { from: 'deliveryNotifications', to: 'packaging/deliveryNotifications' },
    { from: 'invoiceNotifications', to: 'packaging/invoiceNotifications' },
    { from: 'financeNotifications', to: 'packaging/financeNotifications' },
    { from: 'userAccessControl', to: 'packaging/userAccessControl' },
    { from: 'packaging_userAccessControl', to: 'packaging/packaging_userAccessControl' },
    {