# Packaging Module - Storage Keys Centralization Checklist

**Target**: Hapus SEMUA hardcoded storage keys dari Packaging module, centralize di `storage.ts`

**Status**: 🔴 NOT STARTED

---

## 📋 Phase 1: Create Storage Keys Registry

### ✅ Step 1.1: Define StorageKeys constant in storage.ts
**Status**: ✅ COMPLETED

- [x] Create `StorageKeys` object with all Packaging keys
- [x] Add TypeScript types for autocomplete
- [x] Export for use in modules
- [x] Create test file to verify keys

**File**: `src/services/storage.ts` (Lines 13-173)
**Test**: `src/services/storage-keys.test.ts`

**What was added**:
- `StorageKeys` constant object with 3 modules (Packaging, General Trading, Trucking)
- TypeScript types: `PackagingKey`, `GeneralTradingKey`, `TruckingKey`, `SharedKey`, `AnyStorageKey`
- Total keys defined: ~150 keys
- All keys use `as const` for immutability and type safety

**Usage example**:
```typescript
import { StorageKeys } from '@/services/storage';

// ✅ Type-safe with autocomplete
const products = await storageService.get(StorageKeys.PACKAGING.PRODUCTS);
const orders = await storageService.get(StorageKeys.PACKAGING.SALES_ORDERS);
```

**Estimated time**: 15 mins ✅ DONE

---

## 📋 Phase 2: Update Services & Utils (Critical Infrastructure)

### ✅ Step 2.1: src/services/workflow-state-machine.ts
**Status**: ✅ COMPLETED

**Hardcoded keys found & replaced**:
- Line 365-372: `getStorageKey()` method - ✅ Updated to use StorageKeys
- Line 520: `'spk'` → `StorageKeys.PACKAGING.SPK`
- Line 531: `'production'` → `StorageKeys.PACKAGING.PRODUCTION`
- Line 542: `'qc'` → `StorageKeys.PACKAGING.QC`
- Line 553: `'grn'` → `StorageKeys.PACKAGING.GRN`

**Changes made**:
- [x] Import `StorageKeys` from storage
- [x] Replace all hardcoded strings with constants (5 locations)
- [x] Update `getStorageKey()` to use StorageKeys constants

**Estimated time**: 15 mins ✅ DONE

---

### ✅ Step 2.2: src/services/websocket-client.ts
**Status**: ✅ COMPLETED

**Hardcoded keys found & replaced**:
- Line 154: Array of large keys for timeout logic

**Changes made**:
- [x] Import `StorageKeys` from storage
- [x] Replace hardcoded array with StorageKeys constants (7 keys)

**Estimated time**: 10 mins ✅ DONE

---

### ✅ Step 2.3: src/services/material-allocator.ts
**Status**: ✅ COMPLETED

**Hardcoded keys found & replaced**:
- Line 59: `'material_reservations'` → `StorageKeys.SHARED.MATERIAL_RESERVATIONS`
- Line 75: `'material_reservations'` → `StorageKeys.SHARED.MATERIAL_RESERVATIONS`
- Line 142: `'inventory'` → `StorageKeys.PACKAGING.INVENTORY`

**Changes made**:
- [x] Import `StorageKeys` from storage
- [x] Replace all hardcoded strings with constants (3 locations)

**Estimated time**: 10 mins ✅ DONE

---

### ✅ Step 2.4: src/services/optimistic-operations.ts
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- Line 46: `'grn'`
- Line 58: `'inventory'`
- Line 92-95: Multiple keys in Promise.all
- Line 135: `'production'`
- Line 163: `'qc'`
- Line 187-190: Multiple keys
- Line 228: `'salesOrders'`
- Line 243: `'spk'`
- Line 280-281: Multiple keys

**Action**:
- [ ] Import `StorageKeys`
- [ ] Replace ALL hardcoded strings (10+ locations)

**Estimated time**: 20 mins

---

### ✅ Step 2.5: src/utils/product-lookup-helper.ts
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- Line 11: `'products'` (conditional)

**Action**:
- [ ] Import `StorageKeys`
- [ ] Replace with constant

**Estimated time**: 5 mins

---

### ✅ Step 2.6: src/utils/packaging-delete-helper.ts
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- Multiple locations (need to check for storageKey parameter usage)

**Action**:
- [ ] Review all function calls
- [ ] Ensure callers use StorageKeys constants

**Estimated time**: 15 mins

---

### ✅ Step 2.7: src/hooks/usePackagingData.ts
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- Line 288: `'salesOrders'`
- Line 292: `'spk'`
- Line 296: `'purchaseOrders'`
- Line 300: `'grn'`
- Line 304: `'production'`
- Line 308: `'qc'`
- Line 312: `'delivery'`
- Line 316: `'invoices'`
- Line 377: `'salesOrders'` (conditional)

**Action**:
- [ ] Import `StorageKeys`
- [ ] Replace ALL hardcoded strings in hook functions

**Estimated time**: 20 mins

---

### ✅ Step 2.8: src/hooks/useBusinessActivityReport.ts
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- Line 49-55: Multiple `storageService.get()` calls

**Action**:
- [ ] Import `StorageKeys`
- [ ] Replace all 7 hardcoded keys

**Estimated time**: 10 mins

---

## 📋 Phase 3: Update Master Data Pages

### ✅ Step 3.1: src/pages/Master/Products.tsx
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- `'products'` - multiple locations
- `'inventory'` - multiple locations

**Action**:
- [ ] Import `StorageKeys`
- [ ] Find & replace all `'products'` → `StorageKeys.PACKAGING.PRODUCTS`
- [ ] Find & replace all `'inventory'` → `StorageKeys.PACKAGING.INVENTORY`
- [ ] Test product CRUD operations

**Estimated time**: 15 mins

---

### ✅ Step 3.2: src/pages/Master/Customers.tsx
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- `'customers'` - multiple locations

**Action**:
- [ ] Import `StorageKeys`
- [ ] Replace all `'customers'` → `StorageKeys.PACKAGING.CUSTOMERS`
- [ ] Test customer CRUD operations

**Estimated time**: 10 mins

---

### ✅ Step 3.3: src/pages/Master/Suppliers.tsx
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- `'suppliers'` - multiple locations

**Action**:
- [ ] Import `StorageKeys`
- [ ] Replace all `'suppliers'` → `StorageKeys.PACKAGING.SUPPLIERS`
- [ ] Test supplier CRUD operations

**Estimated time**: 10 mins

---

### ✅ Step 3.4: src/pages/Master/Materials.tsx
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- `'materials'` - multiple locations

**Action**:
- [ ] Import `StorageKeys`
- [ ] Replace all `'materials'` → `StorageKeys.PACKAGING.MATERIALS`
- [ ] Test material CRUD operations

**Estimated time**: 10 mins

---

### ✅ Step 3.5: src/pages/Master/Inventory.tsx
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- `'inventory'` - multiple locations

**Action**:
- [ ] Import `StorageKeys`
- [ ] Replace all `'inventory'` → `StorageKeys.PACKAGING.INVENTORY`
- [ ] Test inventory operations

**Estimated time**: 10 mins

---

### ✅ Step 3.6: src/pages/Master/BOM.tsx
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- `'bom'` - multiple locations
- `'products'` - for product lookup
- `'materials'` - for material lookup

**Action**:
- [ ] Import `StorageKeys`
- [ ] Replace all keys with constants
- [ ] Test BOM CRUD operations

**Estimated time**: 15 mins

---

## 📋 Phase 4: Update Operational Pages

### ✅ Step 4.1: src/pages/Packaging/SalesOrders.tsx
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- `'salesOrders'` - Lines: 1931, 1961, 2913, 3462, 3480, 3829
- `'quotations'` - Lines: 1673, 1722
- `'products'` - Lines: 1892, 6179
- `'customers'` - multiple locations
- `'inventory'` - Lines: 2020

**Action**:
- [ ] Import `StorageKeys`
- [ ] Replace `'salesOrders'` → `StorageKeys.PACKAGING.SALES_ORDERS` (6 locations)
- [ ] Replace `'quotations'` → `StorageKeys.PACKAGING.QUOTATIONS` (2 locations)
- [ ] Replace `'products'` → `StorageKeys.PACKAGING.PRODUCTS` (2 locations)
- [ ] Replace `'customers'` → `StorageKeys.PACKAGING.CUSTOMERS`
- [ ] Replace `'inventory'` → `StorageKeys.PACKAGING.INVENTORY`
- [ ] Test SO creation, edit, confirm
- [ ] Test quotation creation

**Estimated time**: 30 mins

---

### ✅ Step 4.2: src/pages/Packaging/DeliveryNote.tsx
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- `'delivery'` - multiple locations
- `'salesOrders'` - multiple locations
- `'invoices'` - multiple locations
- `'customers'` - multiple locations
- `'products'` - multiple locations
- `'deliveryNotifications'` - multiple locations
- Line 3639: Direct localStorage access `'schedule'` ⚠️ CRITICAL

**Action**:
- [ ] Import `StorageKeys`
- [ ] Replace all `'delivery'` → `StorageKeys.PACKAGING.DELIVERY`
- [ ] Replace all `'salesOrders'` → `StorageKeys.PACKAGING.SALES_ORDERS`
- [ ] Replace all `'invoices'` → `StorageKeys.PACKAGING.INVOICES`
- [ ] Replace all `'customers'` → `StorageKeys.PACKAGING.CUSTOMERS`
- [ ] Replace all `'products'` → `StorageKeys.PACKAGING.PRODUCTS`
- [ ] Replace all `'deliveryNotifications'` → `StorageKeys.PACKAGING.DELIVERY_NOTIFICATIONS`
- [ ] FIX: Line 3639 - Replace direct localStorage with storageService
- [ ] Test delivery note creation
- [ ] Test PDF generation

**Estimated time**: 40 mins

---

### ✅ Step 4.3: src/pages/Packaging/Production.tsx
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- `'production'` - Lines: 267, 1824, 2489, 3713
- `'spk'` - multiple locations
- `'schedule'` - Lines: 1449, 2532
- `'qc'` - Lines: 2694, 2699
- `'inventory'` - Lines: 2221, 2399
- `'productionNotifications'` - Lines: 925, 2551, 2583, 3721, 3766

**Action**:
- [ ] Import `StorageKeys`
- [ ] Replace all keys with constants (15+ locations)
- [ ] Test production flow
- [ ] Test SPK creation
- [ ] Test inventory updates

**Estimated time**: 35 mins

---

### ✅ Step 4.4: src/pages/Packaging/Purchasing.tsx
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- `'purchaseOrders'` - Lines: 735, 803, 1300
- `'purchaseRequests'` - Lines: 837
- `'grn'` - multiple locations
- `'grnPackaging'` - Lines: 1188, 1286
- `'inventory'` - Lines: 1392
- `'suppliers'` - multiple locations

**Action**:
- [ ] Import `StorageKeys`
- [ ] Replace all keys with constants
- [ ] Test PO creation
- [ ] Test GRN creation
- [ ] Test inventory updates

**Estimated time**: 30 mins

---

### ✅ Step 4.5: src/pages/Packaging/PPIC.tsx
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- Line 672-675: Direct localStorage access ⚠️ CRITICAL
- `'salesOrders'` - multiple locations
- `'spk'` - multiple locations
- `'production'` - multiple locations
- `'schedule'` - multiple locations
- `'customers'` - multiple locations
- `'products'` - multiple locations

**Action**:
- [ ] Import `StorageKeys`
- [ ] FIX: Lines 672-675 - Replace direct localStorage with storageService
- [ ] Replace all keys with constants
- [ ] Test PPIC dashboard
- [ ] Test notifications

**Estimated time**: 25 mins

---

### ✅ Step 4.6: src/pages/Packaging/QAQC.tsx
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- `'qc'` - Lines: 480, 563
- `'production'` - Lines: 493, 534
- `'schedule'` - Lines: 503, 544
- `'spk'` - Lines: 593

**Action**:
- [ ] Import `StorageKeys`
- [ ] Replace all keys with constants (7 locations)
- [ ] Test QC operations
- [ ] Test status updates

**Estimated time**: 20 mins

---

### ✅ Step 4.7: src/pages/Packaging/Return.tsx
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- `'returns'` - Line: 244
- `'inventory'` - Lines: 273, 299

**Action**:
- [ ] Import `StorageKeys`
- [ ] Replace all keys with constants (3 locations)
- [ ] Test return creation
- [ ] Test inventory updates

**Estimated time**: 15 mins

---

## 📋 Phase 5: Update Finance Pages

### ✅ Step 5.1: src/pages/Finance/Invoices.tsx
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- `'invoices'` - multiple locations
- `'delivery'` - multiple locations
- `'salesOrders'` - multiple locations
- `'invoiceNotifications'` - multiple locations

**Action**:
- [ ] Import `StorageKeys`
- [ ] Replace all keys with constants
- [ ] Test invoice creation
- [ ] Test invoice edit

**Estimated time**: 25 mins

---

### ✅ Step 5.2: src/pages/Finance/Payments.tsx
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- `'payments'` - multiple locations
- `'invoices'` - multiple locations
- `'accounts'` - multiple locations
- `'journalEntries'` - multiple locations

**Action**:
- [ ] Import `StorageKeys`
- [ ] Replace all keys with constants
- [ ] Test payment recording

**Estimated time**: 20 mins

---

### ✅ Step 5.3: src/pages/Finance/Expenses.tsx
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- `'expenses'` - multiple locations

**Action**:
- [ ] Import `StorageKeys`
- [ ] Replace all keys with constants
- [ ] Test expense recording

**Estimated time**: 15 mins

---

### ✅ Step 5.4: src/pages/Finance/OperationalExpenses.tsx
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- `'operationalExpenses'` - multiple locations
- `'accounts'` - multiple locations
- `'journalEntries'` - multiple locations

**Action**:
- [ ] Import `StorageKeys`
- [ ] Replace all keys with constants
- [ ] Test operational expense recording

**Estimated time**: 20 mins

---

### ✅ Step 5.5: src/pages/Finance/Accounting.tsx
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- `'journalEntries'` - multiple locations
- `'accounts'` - multiple locations

**Action**:
- [ ] Import `StorageKeys`
- [ ] Replace all keys with constants
- [ ] Test journal entry creation

**Estimated time**: 20 mins

---

### ✅ Step 5.6: src/pages/Finance/COA.tsx
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- `'accounts'` - multiple locations

**Action**:
- [ ] Import `StorageKeys`
- [ ] Replace all keys with constants
- [ ] Test COA management

**Estimated time**: 15 mins

---

### ✅ Step 5.7: src/pages/Finance/TaxManagement.tsx
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- `'taxRecords'` - multiple locations

**Action**:
- [ ] Import `StorageKeys`
- [ ] Replace all keys with constants
- [ ] Test tax recording

**Estimated time**: 15 mins

---

### ✅ Step 5.8: src/pages/Finance/AccountsReceivable.tsx
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- `'payments'` - multiple locations
- `'invoices'` - multiple locations

**Action**:
- [ ] Import `StorageKeys`
- [ ] Replace all keys with constants
- [ ] Test AR operations

**Estimated time**: 15 mins

---

## 📋 Phase 6: Update Settings Pages

### ✅ Step 6.1: src/pages/Settings/UserControl.tsx
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- `'userAccessControl'` - multiple locations
- `'packaging_userAccessControl'` - multiple locations
- `'userControlPin'` - multiple locations
- `'staff'` - multiple locations

**Action**:
- [ ] Import `StorageKeys`
- [ ] Replace all keys with constants
- [ ] Test user management

**Estimated time**: 20 mins

---

### ✅ Step 6.2: src/pages/Settings/Settings.tsx
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- `'companySettings'` - multiple locations
- `'fingerprintConfig'` - multiple locations

**Action**:
- [ ] Import `StorageKeys`
- [ ] Replace all keys with constants
- [ ] Test settings save

**Estimated time**: 15 mins

---

### ✅ Step 6.3: src/pages/Settings/DBActivity.tsx
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- `'activityLogs'` - multiple locations
- Multiple other keys for data management

**Action**:
- [ ] Import `StorageKeys`
- [ ] Replace all keys with constants
- [ ] Test activity log viewing

**Estimated time**: 20 mins

---

### ✅ Step 6.4: src/pages/Settings/Report.tsx
**Status**: ⬜ NOT STARTED

**Hardcoded keys found**:
- Multiple keys for report generation

**Action**:
- [ ] Import `StorageKeys`
- [ ] Replace all keys with constants
- [ ] Test report generation

**Estimated time**: 15 mins

---

## 📋 Phase 7: Final Testing & Validation

### ✅ Step 7.1: Unit Tests
- [ ] Test StorageKeys constant exists
- [ ] Test all keys are defined
- [ ] Test no typos in key values

**Estimated time**: 30 mins

---

### ✅ Step 7.2: Integration Tests
- [ ] Test Master data CRUD (Products, Customers, Suppliers)
- [ ] Test Operational flow (SO → SPK → Production → QC → Delivery → Invoice)
- [ ] Test Finance operations (Payments, Expenses, Journal Entries)
- [ ] Test Settings (User control, Company settings)

**Estimated time**: 2 hours

---

### ✅ Step 7.3: Sync Tests
- [ ] Test data sync to server
- [ ] Test data sync from server
- [ ] Test cross-device sync
- [ ] Test WebSocket real-time updates

**Estimated time**: 1 hour

---

### ✅ Step 7.4: Code Review
- [ ] Search for remaining hardcoded strings: `grep -r "'products'" src/`
- [ ] Search for remaining hardcoded strings: `grep -r "'salesOrders'" src/`
- [ ] Search for remaining hardcoded strings: `grep -r "'delivery'" src/`
- [ ] Verify NO hardcoded keys remain in Packaging module

**Estimated time**: 30 mins

---

## 📊 Summary

**Total Files to Update**: 40+ files
**Total Keys to Replace**: 200+ occurrences
**Estimated Total Time**: 12-15 hours
**Risk Level**: Medium

**Critical Files** (need extra care):
- ⚠️ `src/pages/Packaging/DeliveryNote.tsx` - Direct localStorage access
- ⚠️ `src/pages/Packaging/PPIC.tsx` - Direct localStorage access
- ⚠️ `src/services/optimistic-operations.ts` - Many keys
- ⚠️ `src/hooks/usePackagingData.ts` - Core hook

**Benefits After Completion**:
- ✅ Type safety & autocomplete
- ✅ No typos possible
- ✅ Easy refactoring
- ✅ Single source of truth
- ✅ Better maintainability

---

**Next Action**: Start with Phase 1 - Create StorageKeys constant
