# Storage Keys Centralization - TO-DO List

## 📊 Current Situation

**Hardcoded Storage Keys**: 253 instances across all modules
- GT modules: ~90 instances
- Trucking modules: ~80 instances
- Packaging modules: ~30 instances
- Shared/Other: ~3 instances

**Should be using**: StorageKeys constants (centralized)
**Currently using**: ~50 instances
**Hardcoded**: ~203 instances (80%)

---

## 🎯 Goal

**Centralize all storage key usage** to use StorageKeys constants and helper functions instead of hardcoded strings.

**Benefits**:
- ✅ Type safety
- ✅ No typos
- ✅ Easy refactoring
- ✅ Consistency
- ✅ Maintainability
- ✅ Self-documenting

---

## 📋 Phase 1: Complete StorageKeys Constant (1-2 hours)

### Task 1.1: Add Missing GT Keys
**File**: `src/services/storage.ts`

**Add to GENERAL_TRADING object**:
```typescript
SPK: 'gt_spk',
BOM: 'gt_bom',
MATERIALS: 'gt_materials',
PRODUCT_CATEGORIES: 'gt_productCategories',
QUOTATION_LAST_SIGNATURE: 'gt_quotation_last_signature',
PURCHASING_NOTIFICATIONS: 'gt_purchasingNotifications',
PPIC_NOTIFICATIONS: 'gt_ppicNotifications',
```

**Checklist**:
- [ ] Add SPK key
- [ ] Add BOM key
- [ ] Add MATERIALS key
- [ ] Add PRODUCT_CATEGORIES key
- [ ] Add QUOTATION_LAST_SIGNATURE key
- [ ] Add PURCHASING_NOTIFICATIONS key
- [ ] Add PPIC_NOTIFICATIONS key
- [ ] Test StorageKeys.GENERAL_TRADING access
- [ ] Verify TypeScript compilation

### Task 1.2: Add Missing Trucking Keys
**File**: `src/services/storage.ts`

**Add to TRUCKING object**:
```typescript
ROUTE_PLANS: 'trucking_route_plans',
UNIT_SCHEDULES: 'trucking_unitSchedules',
AUDIT_LOGS: 'trucking_auditLogs',
```

**Checklist**:
- [ ] Add ROUTE_PLANS key
- [ ] Add UNIT_SCHEDULES key
- [ ] Add AUDIT_LOGS key
- [ ] Test StorageKeys.TRUCKING access
- [ ] Verify TypeScript compilation

### Task 1.3: Update Type Definitions
**File**: `src/services/storage.ts`

**Checklist**:
- [ ] Update GeneralTradingKey type
- [ ] Update TruckingKey type (if exists)
- [ ] Verify all keys are typed
- [ ] Test type checking

---

## 📋 Phase 2: Create Storage Helper Functions (2-3 hours)

### Task 2.1: Create storage-operations-helper.ts
**File**: `src/utils/storage-operations-helper.ts`

**Functions to implement**:
```typescript
// Load data from storage
export async function loadFromStorage<T>(
  key: string,
  defaultValue?: T
): Promise<T | null>

// Save data to storage
export async function saveToStorage<T>(
  key: string,
  data: T,
  immediateSync?: boolean
): Promise<void>

// Update data in storage (with callback)
export async function updateInStorage<T>(
  key: string,
  updateFn: (data: T[]) => T[]
): Promise<void>

// Delete item from storage
export async function deleteFromStorage(
  key: string,
  itemId: string | number
): Promise<void>

// Batch delete items
export async function deleteMultipleFromStorage(
  key: string,
  itemIds: (string | number)[]
): Promise<void>

// Get item count
export async function getItemCount(key: string): Promise<number>

// Clear entire storage key
export async function clearStorage(key: string): Promise<void>
```

**Checklist**:
- [ ] Create file
- [ ] Implement loadFromStorage
- [ ] Implement saveToStorage
- [ ] Implement updateInStorage
- [ ] Implement deleteFromStorage
- [ ] Implement deleteMultipleFromStorage
- [ ] Implement getItemCount
- [ ] Implement clearStorage
- [ ] Add error handling
- [ ] Add logging
- [ ] Add JSDoc comments
- [ ] Test all functions

---

## 📋 Phase 3: Create Notification Helper (2-3 hours)

### Task 3.1: Create notification-helper.ts
**File**: `src/utils/notification-helper.ts`

**Functions to implement**:
```typescript
// Create notification
export async function createNotification(
  business: BusinessType,
  notificationType: string,
  data: any
): Promise<void>

// Update notification
export async function updateNotification(
  business: BusinessType,
  notificationId: string,
  updates: any
): Promise<void>

// Delete notification
export async function deleteNotification(
  business: BusinessType,
  notificationId: string
): Promise<void>

// Get notifications by type
export async function getNotificationsByType(
  business: BusinessType,
  type: string
): Promise<any[]>

// Clear all notifications
export async function clearAllNotifications(
  business: BusinessType
): Promise<void>

// Get notification count
export async function getNotificationCount(
  business: BusinessType
): Promise<number>
```

**Checklist**:
- [ ] Create file
- [ ] Implement createNotification
- [ ] Implement updateNotification
- [ ] Implement deleteNotification
- [ ] Implement getNotificationsByType
- [ ] Implement clearAllNotifications
- [ ] Implement getNotificationCount
- [ ] Add validation
- [ ] Add error handling
- [ ] Add logging
- [ ] Add JSDoc comments
- [ ] Test all functions

---

## 📋 Phase 4: Create Finance Helper (2-3 hours)

### Task 4.1: Create finance-operations-helper.ts
**File**: `src/utils/finance-operations-helper.ts`

**Functions to implement**:
```typescript
// Save account
export async function saveAccount(
  business: BusinessType,
  account: any
): Promise<void>

// Save payment
export async function savePayment(
  business: BusinessType,
  payment: any
): Promise<void>

// Save expense
export async function saveExpense(
  business: BusinessType,
  expense: any
): Promise<void>

// Save journal entry
export async function saveJournalEntry(
  business: BusinessType,
  entry: any
): Promise<void>

// Get accounts
export async function getAccounts(
  business: BusinessType
): Promise<any[]>

// Get payments
export async function getPayments(
  business: BusinessType
): Promise<any[]>

// Get expenses
export async function getExpenses(
  business: BusinessType
): Promise<any[]>

// Get journal entries
export async function getJournalEntries(
  business: BusinessType
): Promise<any[]>
```

**Checklist**:
- [ ] Create file
- [ ] Implement saveAccount
- [ ] Implement savePayment
- [ ] Implement saveExpense
- [ ] Implement saveJournalEntry
- [ ] Implement getAccounts
- [ ] Implement getPayments
- [ ] Implement getExpenses
- [ ] Implement getJournalEntries
- [ ] Add validation
- [ ] Add error handling
- [ ] Add logging
- [ ] Add JSDoc comments
- [ ] Test all functions

---

## 📋 Phase 5: Migrate All Modules (8-12 hours)

### Task 5.1: Migrate GT Modules (~4 hours)

**Files to migrate** (in order of priority):
1. [ ] `src/pages/GeneralTrading/SalesOrders.tsx` (9 instances)
2. [ ] `src/pages/GeneralTrading/Purchasing.tsx` (9 instances)
3. [ ] `src/pages/GeneralTrading/PPIC.tsx` (8 instances)
4. [ ] `src/pages/GeneralTrading/DeliveryNote.tsx` (7 instances)
5. [ ] `src/pages/GeneralTrading/Finance/Accounting.tsx` (6 instances)
6. [ ] `src/pages/GeneralTrading/Finance/Finance.tsx` (5 instances)
7. [ ] Other GT modules (remaining instances)

**For each file**:
- [ ] Replace hardcoded keys with StorageKeys constants
- [ ] Use helper functions where applicable
- [ ] Test functionality
- [ ] Verify no regressions
- [ ] Check TypeScript compilation

### Task 5.2: Migrate Trucking Modules (~3 hours)

**Files to migrate** (in order of priority):
1. [ ] `src/pages/Trucking/Shipments/DeliveryOrders.tsx` (8 instances)
2. [ ] `src/pages/Trucking/Shipments/DeliveryNote.tsx` (7 instances)
3. [ ] `src/pages/Trucking/Finance/Payments.tsx` (5 instances)
4. [ ] `src/pages/Trucking/Finance/Invoices.tsx` (5 instances)
5. [ ] Other Trucking modules (remaining instances)

**For each file**:
- [ ] Replace hardcoded keys with StorageKeys constants
- [ ] Use helper functions where applicable
- [ ] Test functionality
- [ ] Verify no regressions
- [ ] Check TypeScript compilation

### Task 5.3: Migrate Packaging Modules (~2 hours)

**Files to migrate**:
1. [ ] `src/pages/Packaging/Finance/Accounting.tsx` (6 instances)
2. [ ] `src/pages/Packaging/Finance/Finance.tsx` (5 instances)
3. [ ] Other Packaging modules (remaining instances)

**For each file**:
- [ ] Replace hardcoded keys with StorageKeys constants
- [ ] Use helper functions where applicable
- [ ] Test functionality
- [ ] Verify no regressions
- [ ] Check TypeScript compilation

### Task 5.4: Migrate Shared/Other (~1 hour)

**Files to migrate**:
1. [ ] `src/pages/SuperAdmin/SuperAdmin.tsx` (3 instances)
2. [ ] Other shared modules

**For each file**:
- [ ] Replace hardcoded keys with StorageKeys constants
- [ ] Use helper functions where applicable
- [ ] Test functionality
- [ ] Verify no regressions
- [ ] Check TypeScript compilation

---

## 🧪 Testing Checklist

### Unit Tests
- [ ] Test storage-operations-helper functions
- [ ] Test notification-helper functions
- [ ] Test finance-operations-helper functions
- [ ] Test StorageKeys constants

### Integration Tests
- [ ] Test GT modules with new keys
- [ ] Test Trucking modules with new keys
- [ ] Test Packaging modules with new keys
- [ ] Test cross-module operations

### Regression Tests
- [ ] Test all CRUD operations
- [ ] Test notifications
- [ ] Test sync
- [ ] Test error handling
- [ ] Test performance

### Manual Tests
- [ ] Create new records
- [ ] Update records
- [ ] Delete records
- [ ] Verify data persistence
- [ ] Verify cross-device sync

---

## 📊 Progress Tracking

### Phase 1: StorageKeys Completion
- **Status**: ⏳ Not Started
- **Effort**: 1-2 hours
- **Completion**: 0%

### Phase 2: Storage Helper
- **Status**: ⏳ Not Started
- **Effort**: 2-3 hours
- **Completion**: 0%

### Phase 3: Notification Helper
- **Status**: ⏳ Not Started
- **Effort**: 2-3 hours
- **Completion**: 0%

### Phase 4: Finance Helper
- **Status**: ⏳ Not Started
- **Effort**: 2-3 hours
- **Completion**: 0%

### Phase 5: Module Migration
- **Status**: ⏳ Not Started
- **Effort**: 8-12 hours
- **Completion**: 0%

### **Total Progress**: 0% (0/5 phases)

---

## 🎯 Success Criteria

### Code Quality
- [ ] 0 hardcoded storage keys
- [ ] 100% using StorageKeys constants
- [ ] 100% using helper functions where applicable
- [ ] All TypeScript compilation successful
- [ ] No linting errors

### Functionality
- [ ] All CRUD operations work
- [ ] All notifications work
- [ ] All sync operations work
- [ ] No regressions
- [ ] All tests pass

### Documentation
- [ ] StorageKeys documented
- [ ] Helper functions documented
- [ ] Migration guide created
- [ ] Code comments added
- [ ] JSDoc comments added

---

## 📝 Notes

### Important Considerations
1. **Backward Compatibility**: Ensure old code still works during migration
2. **Testing**: Test thoroughly after each phase
3. **Performance**: Monitor performance during migration
4. **Error Handling**: Add proper error handling in helpers
5. **Logging**: Add logging for debugging

### Potential Issues
1. **Type Safety**: May need to update type definitions
2. **Imports**: Need to import StorageKeys in all modules
3. **Testing**: Need to update tests to use new helpers
4. **Documentation**: Need to update documentation

### Rollback Plan
1. Keep old code in version control
2. Can revert if issues occur
3. No data loss (all data in storage)
4. Easy to rollback individual modules

---

## 🚀 Next Steps

1. **Review** this TO-DO list
2. **Prioritize** phases based on impact
3. **Start** with Phase 1 (StorageKeys completion)
4. **Test** after each phase
5. **Document** progress
6. **Deploy** when complete

---

## 📞 Questions?

### Common Questions

**Q: Why centralize storage keys?**
A: To improve code quality, maintainability, and consistency. Reduces errors and makes refactoring easier.

**Q: How long will this take?**
A: 15-24 hours (2-3 days) depending on testing thoroughness.

**Q: Will this break anything?**
A: No, if done carefully. All operations remain the same, just using constants instead of hardcoded strings.

**Q: Can we do this incrementally?**
A: Yes! Each phase can be done independently. Start with Phase 1, then move to others.

**Q: What if we find issues?**
A: Easy to rollback. All data is safe in storage. Can revert individual modules if needed.

---

**Status**: Ready to Start
**Estimated Duration**: 15-24 hours (2-3 days)
**Priority**: High (Improves code quality significantly)
**Recommendation**: Start with Phase 1 this week
