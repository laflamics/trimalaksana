# Storage Keys Centralization Plan

**Goal**: Centralize semua storage keys di `storage.ts`, hapus hardcoded strings di modules

**Strategy**: Create `StorageKeys` constant object, modules hanya reference entity name

---

## 🎯 Phase 1: Create Storage Keys Registry

### Step 1.1: Define Storage Keys in storage.ts

```typescript
// src/services/storage.ts

export const StorageKeys = {
  // Packaging Module
  PACKAGING: {
    // Master Data
    PRODUCTS: 'products',
    CUSTOMERS: 'customers',
    SUPPLIERS: 'suppliers',
    MATERIALS: 'materials',
    BOM: 'bom',
    STAFF: 'staff',
    
    // Operational
    SALES_ORDERS: 'salesOrders',
    QUOTATIONS: 'quotations',
    DELIVERY: 'delivery',
    INVOICES: 'invoices',
    PURCHASE_ORDERS: 'purchaseOrders',
    PURCHASE_REQUESTS: 'purchaseRequests',
    GRN: 'grn',
    GRN_PACKAGING: 'grnPackaging',
    SPK: 'spk',
    PRODUCTION: 'production',
    SCHEDULE: 'schedule',
    QC: 'qc',
    RETURNS: 'returns',
    
    // Inventory
    INVENTORY: 'inventory',
    
    // Finance
    PAYMENTS: 'payments',
    EXPENSES: 'expenses',
    OPERATIONAL_EXPENSES: 'operationalExpenses',
    JOURNAL_ENTRIES: 'journalEntries',
    TAX_RECORDS: 'taxRecords',
    ACCOUNTS: 'accounts',
    
    // Notifications
    PRODUCTION_NOTIFICATIONS: 'productionNotifications',
    DELIVERY_NOTIFICATIONS: 'deliveryNotifications',
    INVOICE_NOTIFICATIONS: 'invoiceNotifications',
    FINANCE_NOTIFICATIONS: 'financeNotifications',
    
    // Settings
    USER_ACCESS_CONTROL: 'userAccessControl',
    PACKAGING_USER_ACCESS_CONTROL: 'packaging_userAccessControl',
    USER_CONTROL_PIN: 'userControlPin',
    COMPANY_SETTINGS: 'companySettings',
    FINGERPRINT_CONFIG: 'fingerprintConfig',
    ACTIVITY_LOGS: 'activityLogs',
    ATTENDANCE: 'attendance',
  },
  
  // General Trading Module
  GENERAL_TRADING: {
    // Master Data
    PRODUCTS: 'gt_products',
    CUSTOMERS: 'gt_customers',
    SUPPLIERS: 'gt_suppliers',
    
    // Operational
    SALES_ORDERS: 'gt_salesOrders',
    QUOTATIONS: 'gt_quotations',
    DELIVERY: 'gt_delivery',
    INVOICES: 'gt_invoices',
    PURCHASE_ORDERS: 'gt_purchaseOrders',
    PURCHASE_REQUESTS: 'gt_purchaseRequests',
    GRN: 'gt_grn',
    
    // Inventory
    INVENTORY: 'gt_inventory',
    
    // Finance
    PAYMENTS: 'gt_payments',
    EXPENSES: 'gt_expenses',
    OPERATIONAL_EXPENSES: 'gt_operationalExpenses',
    JOURNAL_ENTRIES: 'gt_journalEntries',
    TAX_RECORDS: 'gt_taxRecords',
    ACCOUNTS: 'gt_accounts',
    
    // Notifications
    PRODUCTION_NOTIFICATIONS: 'gt_productionNotifications',
    DELIVERY_NOTIFICATIONS: 'gt_deliveryNotifications',
    INVOICE_NOTIFICATIONS: 'gt_invoiceNotifications',
    FINANCE_NOTIFICATIONS: 'gt_financeNotifications',
    
    // Settings
    USER_ACCESS_CONTROL: 'gt_userAccessControl',
    COMPANY_SETTINGS: 'gt_companySettings',
    ACTIVITY_LOGS: 'gt_activityLogs',
  },
  
  // Trucking Module
  TRUCKING: {
    // Master Data
    CUSTOMERS: 'trucking_customers',
    VEHICLES: 'trucking_vehicles',
    DRIVERS: 'trucking_drivers',
    ROUTES: 'trucking_routes',
    PRODUCTS: 'trucking_products',
    SUPPLIERS: 'trucking_suppliers',
    
    // Operational
    SURAT_JALAN: 'trucking_suratJalan',
    DELIVERY_ORDERS: 'trucking_delivery_orders',
    UNIT_SCHEDULES: 'trucking_unitSchedules',
    ROUTE_PLANS: 'trucking_route_plans',
    PETTY_CASH_REQUESTS: 'trucking_pettycash_requests',
    
    // Finance
    INVOICES: 'trucking_invoices',
    PAYMENTS: 'trucking_payments',
    EXPENSES: 'trucking_expenses',
    OPERATIONAL_EXPENSES: 'trucking_operationalExpenses',
    JOURNAL_ENTRIES: 'trucking_journalEntries',
    TAX_RECORDS: 'trucking_taxRecords',
    ACCOUNTS: 'trucking_accounts',
    
    // Notifications
    SURAT_JALAN_NOTIFICATIONS: 'trucking_suratJalanNotifications',
    FINANCE_NOTIFICATIONS: 'trucking_financeNotifications',
    UNIT_NOTIFICATIONS: 'trucking_unitNotifications',
    PETTY_CASH_NOTIFICATIONS: 'trucking_pettyCashNotifications',
    
    // Settings
    USER_ACCESS_CONTROL: 'trucking_userAccessControl',
    COMPANY_SETTINGS: 'trucking_companySettings',
    ACTIVITY_LOGS: 'trucking_activityLogs',
    SETTINGS: 'trucking_settings',
  },
  
  // Shared Keys
  SHARED: {
    SELECTED_BUSINESS: 'selectedBusiness',
    CURRENT_USER: 'currentUser',
    STORAGE_CONFIG: 'storage_config',
    WEBSOCKET_URL: 'websocket_url',
    WEBSOCKET_ENABLED: 'websocket_enabled',
    SERVER_URL: 'server_url',
    THEME: 'theme',
  }
} as const;

// Type helper untuk autocomplete
export type PackagingKey = typeof StorageKeys.PACKAGING[keyof typeof StorageKeys.PACKAGING];
export type GeneralTradingKey = typeof StorageKeys.GENERAL_TRADING[keyof typeof StorageKeys.GENERAL_TRADING];
export type TruckingKey = typeof StorageKeys.TRUCKING[keyof typeof StorageKeys.TRUCKING];
export type SharedKey = typeof StorageKeys.SHARED[keyof typeof StorageKeys.SHARED];
export type AnyStorageKey = PackagingKey | GeneralTradingKey | TruckingKey | SharedKey;
```

---

## 🎯 Phase 2: Update Storage Service Methods

### Step 2.1: Add Helper Methods

```typescript
// src/services/storage.ts

class StorageService {
  // ... existing code ...
  
  // Helper: Get key by business context
  getKey(entityName: string): string {
    const business = this.getBusinessContext();
    
    switch(business) {
      case 'packaging':
        return StorageKeys.PACKAGING[entityName] || entityName;
      case 'general-trading':
        return StorageKeys.GENERAL_TRADING[entityName] || entityName;
      case 'trucking':
        return StorageKeys.TRUCKING[entityName] || entityName;
      default:
        return entityName;
    }
  }
  
  // Typed get methods
  async getPackaging<T>(key: PackagingKey): Promise<T | null> {
    return this.get<T>(key);
  }
  
  async getGeneralTrading<T>(key: GeneralTradingKey): Promise<T | null> {
    return this.get<T>(key);
  }
  
  async getTrucking<T>(key: TruckingKey): Promise<T | null> {
    return this.get<T>(key);
  }
}
```

---

## 🎯 Phase 3: Migration Strategy (All Modules)

### Packaging Module Files to Update:

**Master Data Pages** (6 files):
- `src/pages/Master/Products.tsx`
- `src/pages/Master/Customers.tsx`
- `src/pages/Master/Suppliers.tsx`
- `src/pages/Master/Materials.tsx`
- `src/pages/Master/Inventory.tsx`
- `src/pages/Master/BOM.tsx`

**Operational Pages** (8 files):
- `src/pages/Packaging/SalesOrders.tsx`
- `src/pages/Packaging/DeliveryNote.tsx`
- `src/pages/Packaging/Purchasing.tsx`
- `src/pages/Packaging/Production.tsx`
- `src/pages/Packaging/PPIC.tsx`
- `src/pages/Packaging/QAQC.tsx`
- `src/pages/Packaging/Return.tsx`
- `src/pages/Packaging/Schedule.tsx`

**Finance Pages** (8 files):
- `src/pages/Finance/Invoices.tsx`
- `src/pages/Finance/Payments.tsx`
- `src/pages/Finance/Expenses.tsx`
- `src/pages/Finance/OperationalExpenses.tsx`
- `src/pages/Finance/Accounting.tsx`
- `src/pages/Finance/COA.tsx`
- `src/pages/Finance/TaxManagement.tsx`
- `src/pages/Finance/AccountsReceivable.tsx`

**Settings Pages** (4 files):
- `src/pages/Settings/UserControl.tsx`
- `src/pages/Settings/Settings.tsx`
- `src/pages/Settings/DBActivity.tsx`
- `src/pages/Settings/Report.tsx`

**Utils** (3 files):
- `src/utils/packaging-delete-helper.ts`
- `src/utils/real-time-sync-helper.ts`
- `src/utils/excel-helper.ts`

---

## 🎯 Phase 4: Example Migration (Step by Step)

### Before (Products.tsx):
```typescript
// ❌ OLD - Hardcoded string
const products = await storageService.get('products');
await storageService.set('products', updatedProducts);
```

### After (Products.tsx):
```typescript
// ✅ NEW - Use constant
import { StorageKeys } from '@/services/storage';

const products = await storageService.get(StorageKeys.PACKAGING.PRODUCTS);
await storageService.set(StorageKeys.PACKAGING.PRODUCTS, updatedProducts);
```

### Before (SalesOrders.tsx):
```typescript
// ❌ OLD - Multiple hardcoded strings
const orders = await storageService.get('salesOrders');
const customers = await storageService.get('customers');
const products = await storageService.get('products');
const inventory = await storageService.get('inventory');

await storageService.set('salesOrders', updatedOrders);
await storageService.set('inventory', updatedInventory);
```

### After (SalesOrders.tsx):
```typescript
// ✅ NEW - Use constants
import { StorageKeys } from '@/services/storage';

const { SALES_ORDERS, CUSTOMERS, PRODUCTS, INVENTORY } = StorageKeys.PACKAGING;

const orders = await storageService.get(SALES_ORDERS);
const customers = await storageService.get(CUSTOMERS);
const products = await storageService.get(PRODUCTS);
const inventory = await storageService.get(INVENTORY);

await storageService.set(SALES_ORDERS, updatedOrders);
await storageService.set(INVENTORY, updatedInventory);
```

---

## 🎯 Phase 5: Detailed File-by-File Plan

### PACKAGING MODULE

#### 1. Master/Products.tsx
**Keys to replace**:
- `'products'` → `StorageKeys.PACKAGING.PRODUCTS`
- `'inventory'` → `StorageKeys.PACKAGING.INVENTORY`

**Lines**: ~1723, 1892, 6179

**Estimated time**: 10 mins

---

#### 2. Packaging/SalesOrders.tsx
**Keys to replace**:
- `'salesOrders'` → `StorageKeys.PACKAGING.SALES_ORDERS`
- `'quotations'` → `StorageKeys.PACKAGING.QUOTATIONS`
- `'products'` → `StorageKeys.PACKAGING.PRODUCTS`
- `'customers'` → `StorageKeys.PACKAGING.CUSTOMERS`
- `'inventory'` → `StorageKeys.PACKAGING.INVENTORY`

**Lines**: ~1673, 1722, 1892, 1931, 1961, 2020, 2913, 3462, 3480, 3829, 6179

**Estimated time**: 20 mins

---

#### 3. Packaging/DeliveryNote.tsx
**Keys to replace**:
- `'delivery'` → `StorageKeys.PACKAGING.DELIVERY`
- `'salesOrders'` → `StorageKeys.PACKAGING.SALES_ORDERS`
- `'invoices'` → `StorageKeys.PACKAGING.INVOICES`
- `'customers'` → `StorageKeys.PACKAGING.CUSTOMERS`
- `'products'` → `StorageKeys.PACKAGING.PRODUCTS`
- `'deliveryNotifications'` → `StorageKeys.PACKAGING.DELIVERY_NOTIFICATIONS`

**Lines**: Multiple (large file)

**Estimated time**: 30 mins

---

#### 4. Packaging/Production.tsx
**Keys to replace**:
- `'production'` → `StorageKeys.PACKAGING.PRODUCTION`
- `'spk'` → `StorageKeys.PACKAGING.SPK`
- `'schedule'` → `StorageKeys.PACKAGING.SCHEDULE`
- `'qc'` → `StorageKeys.PACKAGING.QC`
- `'inventory'` → `StorageKeys.PACKAGING.INVENTORY`
- `'productionNotifications'` → `StorageKeys.PACKAGING.PRODUCTION_NOTIFICATIONS`

**Lines**: ~267, 925, 1449, 1824, 2221, 2399, 2489, 2515, 2532, 2551, 2583, 2694, 2699, 3713, 3721, 3766

**Estimated time**: 25 mins

---

#### 5. Packaging/Purchasing.tsx
**Keys to replace**:
- `'purchaseOrders'` → `StorageKeys.PACKAGING.PURCHASE_ORDERS`
- `'purchaseRequests'` → `StorageKeys.PACKAGING.PURCHASE_REQUESTS`
- `'grn'` → `StorageKeys.PACKAGING.GRN`
- `'grnPackaging'` → `StorageKeys.PACKAGING.GRN_PACKAGING`
- `'inventory'` → `StorageKeys.PACKAGING.INVENTORY`
- `'suppliers'` → `StorageKeys.PACKAGING.SUPPLIERS`

**Lines**: ~735, 803, 837, 1188, 1286, 1300, 1392

**Estimated time**: 20 mins

---

#### 6. Packaging/PPIC.tsx
**Keys to replace**:
- `'salesOrders'` → `StorageKeys.PACKAGING.SALES_ORDERS`
- `'spk'` → `StorageKeys.PACKAGING.SPK`
- `'production'` → `StorageKeys.PACKAGING.PRODUCTION`
- `'schedule'` → `StorageKeys.PACKAGING.SCHEDULE`
- `'customers'` → `StorageKeys.PACKAGING.CUSTOMERS`
- `'products'` → `StorageKeys.PACKAGING.PRODUCTS`

**Lines**: ~672, 675 (direct localStorage access - needs fix)

**Estimated time**: 15 mins

---

#### 7. Packaging/QAQC.tsx
**Keys to replace**:
- `'qc'` → `StorageKeys.PACKAGING.QC`
- `'production'` → `StorageKeys.PACKAGING.PRODUCTION`
- `'schedule'` → `StorageKeys.PACKAGING.SCHEDULE`
- `'spk'` → `StorageKeys.PACKAGING.SPK`

**Lines**: ~480, 493, 503, 534, 544, 563, 593

**Estimated time**: 15 mins

---

#### 8. Packaging/Return.tsx
**Keys to replace**:
- `'returns'` → `StorageKeys.PACKAGING.RETURNS`
- `'inventory'` → `StorageKeys.PACKAGING.INVENTORY`

**Lines**: ~244, 273, 299

**Estimated time**: 10 mins

---

#### 9. Finance/Invoices.tsx
**Keys to replace**:
- `'invoices'` → `StorageKeys.PACKAGING.INVOICES`
- `'delivery'` → `StorageKeys.PACKAGING.DELIVERY`
- `'salesOrders'` → `StorageKeys.PACKAGING.SALES_ORDERS`
- `'invoiceNotifications'` → `StorageKeys.PACKAGING.INVOICE_NOTIFICATIONS`

**Estimated time**: 20 mins

---

#### 10. Finance/Payments.tsx
**Keys to replace**:
- `'payments'` → `StorageKeys.PACKAGING.PAYMENTS`
- `'invoices'` → `StorageKeys.PACKAGING.INVOICES`
- `'accounts'` → `StorageKeys.PACKAGING.ACCOUNTS`
- `'journalEntries'` → `StorageKeys.PACKAGING.JOURNAL_ENTRIES`

**Estimated time**: 15 mins

---

### GENERAL TRADING MODULE

#### 11. GeneralTrading/SalesOrders.tsx
**Keys to replace**:
- `'gt_salesOrders'` → `StorageKeys.GENERAL_TRADING.SALES_ORDERS`
- `'gt_quotations'` → `StorageKeys.GENERAL_TRADING.QUOTATIONS`
- `'gt_products'` → `StorageKeys.GENERAL_TRADING.PRODUCTS`
- `'gt_customers'` → `StorageKeys.GENERAL_TRADING.CUSTOMERS`

**Lines**: ~545, 1588, 1625, 2123, 2163, 2172, 2249, 2281, 2510, 3012, 3024

**Estimated time**: 20 mins

---

#### 12. GeneralTrading/Purchasing.tsx
**Keys to replace**:
- `'gt_purchaseOrders'` → `StorageKeys.GENERAL_TRADING.PURCHASE_ORDERS`
- `'gt_purchaseRequests'` → `StorageKeys.GENERAL_TRADING.PURCHASE_REQUESTS`
- `'gt_grn'` → `StorageKeys.GENERAL_TRADING.GRN`
- `'gt_inventory'` → `StorageKeys.GENERAL_TRADING.INVENTORY`
- `'gt_suppliers'` → `StorageKeys.GENERAL_TRADING.SUPPLIERS`

**Lines**: ~646, 743, 800, 958, 1044, 1051, 1385, 1474, 1503, 1519, 1619, 1643, 1676, 1722, 1781, 1846, 1860, 1904, 2689, 2696, 2798, 2804, 2849, 2860, 4199

**Estimated time**: 30 mins

---

#### 13. GeneralTrading/PPIC.tsx
**Keys to replace**:
- `'gt_salesOrders'` → `StorageKeys.GENERAL_TRADING.SALES_ORDERS`
- `'gt_customers'` → `StorageKeys.GENERAL_TRADING.CUSTOMERS`
- `'gt_products'` → `StorageKeys.GENERAL_TRADING.PRODUCTS`

**Lines**: ~418, 421, 453, 465, 485, 497 (direct localStorage - needs fix)

**Estimated time**: 15 mins

---

### TRUCKING MODULE

#### 14. Trucking/Shipments/DeliveryNote.tsx
**Keys to replace**:
- `'trucking_suratJalan'` → `StorageKeys.TRUCKING.SURAT_JALAN`
- `'trucking_customers'` → `StorageKeys.TRUCKING.CUSTOMERS`
- `'trucking_vehicles'` → `StorageKeys.TRUCKING.VEHICLES`
- `'trucking_drivers'` → `StorageKeys.TRUCKING.DRIVERS`

**Estimated time**: 20 mins

---

#### 15. Trucking/Shipments/DeliveryOrders.tsx
**Keys to replace**:
- `'trucking_delivery_orders'` → `StorageKeys.TRUCKING.DELIVERY_ORDERS`
- `'trucking_customers'` → `StorageKeys.TRUCKING.CUSTOMERS`
- `'trucking_pettycash_requests'` → `StorageKeys.TRUCKING.PETTY_CASH_REQUESTS`

**Lines**: ~296, 328, 454, 512, 558, 806, 1282-1285

**Estimated time**: 20 mins

---

## 🎯 Phase 6: Testing Strategy

### Step 6.1: Unit Tests
```typescript
// src/services/storage.test.ts

describe('StorageKeys', () => {
  it('should have all packaging keys', () => {
    expect(StorageKeys.PACKAGING.PRODUCTS).toBe('products');
    expect(StorageKeys.PACKAGING.SALES_ORDERS).toBe('salesOrders');
  });
  
  it('should have all GT keys', () => {
    expect(StorageKeys.GENERAL_TRADING.PRODUCTS).toBe('gt_products');
    expect(StorageKeys.GENERAL_TRADING.SALES_ORDERS).toBe('gt_salesOrders');
  });
  
  it('should have all Trucking keys', () => {
    expect(StorageKeys.TRUCKING.SURAT_JALAN).toBe('trucking_suratJalan');
  });
});
```

### Step 6.2: Integration Tests
- Test each module dapat load data dengan keys baru
- Test sync mechanism masih jalan
- Test cross-device sync

---

## 🎯 Phase 7: Rollout Plan

### Week 1: Setup & Packaging Master
- Day 1: Create StorageKeys constant
- Day 2: Update Master data pages (Products, Customers, Suppliers)
- Day 3: Test master data pages
- Day 4: Update Inventory & Materials
- Day 5: Test & fix issues

### Week 2: Packaging Operational
- Day 1: Update SalesOrders
- Day 2: Update DeliveryNote
- Day 3: Update Production & PPIC
- Day 4: Update Purchasing & QAQC
- Day 5: Test & fix issues

### Week 3: Packaging Finance & Settings
- Day 1: Update Finance pages (Invoices, Payments)
- Day 2: Update Finance pages (Expenses, Accounting)
- Day 3: Update Settings pages
- Day 4: Update Utils & Helpers
- Day 5: Full Packaging module test

### Week 4: General Trading
- Day 1-2: Update GT operational pages
- Day 3: Update GT finance pages
- Day 4: Update GT settings
- Day 5: Full GT module test

### Week 5: Trucking
- Day 1-2: Update Trucking operational pages
- Day 3: Update Trucking finance pages
- Day 4: Update Trucking settings
- Day 5: Full Trucking module test

### Week 6: Final Testing & Deployment
- Day 1-2: Integration testing all modules
- Day 3: Performance testing
- Day 4: User acceptance testing
- Day 5: Production deployment

---

## 📊 Summary

**Total Files to Update**: ~80 files
**Total Keys to Replace**: ~150 keys
**Estimated Total Time**: 30-40 hours
**Risk Level**: Medium (need careful testing)

**Benefits**:
- ✅ Type safety (autocomplete)
- ✅ No typos
- ✅ Easy refactoring
- ✅ Single source of truth
- ✅ Better maintainability

**Next Steps**:
1. Review & approve plan
2. Create StorageKeys constant
3. Start with Packaging Master pages
4. Test thoroughly before moving to next phase
