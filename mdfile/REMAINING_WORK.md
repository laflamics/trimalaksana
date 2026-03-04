# Remaining Work - Storage Keys Centralization

**Status**: 71% Complete (5 of 7 phases done)

---

## Phase 6: Update Settings Pages (4 files)

### Files to Update:
1. `src/pages/Settings/UserControl.tsx`
   - Keys: `userAccessControl`, `packaging_userAccessControl`, `userControlPin`, `staff`
   - Action: Add StorageKeys import, replace 4 keys

2. `src/pages/Settings/Settings.tsx`
   - Keys: `companySettings`, `fingerprintConfig`
   - Action: Add StorageKeys import, replace 2 keys

3. `src/pages/Settings/DBActivity.tsx`
   - Keys: `activityLogs` + multiple others
   - Action: Add StorageKeys import, replace all keys

4. `src/pages/Settings/Report.tsx`
   - Keys: Multiple for report generation
   - Action: Add StorageKeys import, replace all keys

**Estimated Time**: 1 hour

---

## Phase 7: Final Testing & Validation

### 7.1 Unit Tests
- [ ] Verify StorageKeys constant exists
- [ ] Test all keys are defined
- [ ] Test no typos in key values
- **Time**: 30 mins

### 7.2 Integration Tests
- [ ] Test Master data CRUD (Products, Customers, Suppliers)
- [ ] Test Operational flow (SO → SPK → Production → QC → Delivery → Invoice)
- [ ] Test Finance operations (Payments, Expenses, Journal Entries)
- [ ] Test Settings (User control, Company settings)
- **Time**: 2 hours

### 7.3 Sync Tests
- [ ] Test data sync to server
- [ ] Test data sync from server
- [ ] Test cross-device sync
- [ ] Test WebSocket real-time updates
- **Time**: 1 hour

### 7.4 Code Review
- [ ] Search for remaining hardcoded strings: `grep -r "'products'" src/`
- [ ] Search for remaining hardcoded strings: `grep -r "'salesOrders'" src/`
- [ ] Search for remaining hardcoded strings: `grep -r "'delivery'" src/`
- [ ] Verify NO hardcoded keys remain in Packaging module
- **Time**: 30 mins

**Total Phase 7 Time**: 4 hours

---

## Quick Commands for Phase 6

```bash
# UserControl.tsx
sed -i "s/storageService\.set('userAccessControl'/storageService.set(StorageKeys.PACKAGING.USER_ACCESS_CONTROL/g" src/pages/Settings/UserControl.tsx
sed -i "s/storageService\.set('packaging_userAccessControl'/storageService.set(StorageKeys.PACKAGING.PACKAGING_USER_ACCESS_CONTROL/g" src/pages/Settings/UserControl.tsx
sed -i "s/storageService\.set('userControlPin'/storageService.set(StorageKeys.PACKAGING.USER_CONTROL_PIN/g" src/pages/Settings/UserControl.tsx
sed -i "s/storageService\.set('staff'/storageService.set(StorageKeys.PACKAGING.STAFF/g" src/pages/Settings/UserControl.tsx

# Settings.tsx
sed -i "s/storageService\.set('companySettings'/storageService.set(StorageKeys.PACKAGING.COMPANY_SETTINGS/g" src/pages/Settings/Settings.tsx
sed -i "s/storageService\.set('fingerprintConfig'/storageService.set(StorageKeys.PACKAGING.FINGERPRINT_CONFIG/g" src/pages/Settings/Settings.tsx

# TaxManagement.tsx
sed -i "s/storageService\.set('taxRecords'/storageService.set(StorageKeys.PACKAGING.TAX_RECORDS/g" src/pages/Settings/TaxManagement.tsx
```

---

## Code Review Commands

```bash
# Search for remaining hardcoded keys
grep -r "'products'" src/pages/ --include="*.tsx" | grep -v "StorageKeys"
grep -r "'salesOrders'" src/pages/ --include="*.tsx" | grep -v "StorageKeys"
grep -r "'delivery'" src/pages/ --include="*.tsx" | grep -v "StorageKeys"
grep -r "'invoices'" src/pages/ --include="*.tsx" | grep -v "StorageKeys"
grep -r "'customers'" src/pages/ --include="*.tsx" | grep -v "StorageKeys"
grep -r "'suppliers'" src/pages/ --include="*.tsx" | grep -v "StorageKeys"
grep -r "'inventory'" src/pages/ --include="*.tsx" | grep -v "StorageKeys"
grep -r "'production'" src/pages/ --include="*.tsx" | grep -v "StorageKeys"
grep -r "'qc'" src/pages/ --include="*.tsx" | grep -v "StorageKeys"
grep -r "'spk'" src/pages/ --include="*.tsx" | grep -v "StorageKeys"
```

---

## After Completion

Once Phase 6-7 are complete:

1. **Commit Changes**
   ```bash
   git add -A
   git commit -m "feat: centralize all storage keys using StorageKeys constant"
   ```

2. **Begin PostgreSQL + MinIO Migration**
   - Reference: `POSTGRESQL_MINIO_MIGRATION_PLAN.md`
   - Create Go API Server
   - Set up PostgreSQL database
   - Configure MinIO buckets
   - Implement dual-write period

3. **Update Documentation**
   - Update README with new storage architecture
   - Document StorageKeys usage
   - Create migration guide for developers

---

## Estimated Total Time Remaining

- Phase 6: 1 hour
- Phase 7: 4 hours
- **Total**: 5 hours

**Overall Project**: ~10 hours total (5 hours completed, 5 hours remaining)

---

**Last Updated**: February 9, 2026
