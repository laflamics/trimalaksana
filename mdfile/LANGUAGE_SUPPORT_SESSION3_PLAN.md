# Language Support - Session 3 Plan

**Target**: General Trading & Trucking Modules  
**Estimated Modules**: 30-35  
**Pattern**: Same as Packaging (use `useLanguage` hook + useMemo for columns)

---

## 📋 General Trading Modules (Estimated 15-20)

### Workflow Modules (6)
1. `src/pages/GeneralTrading/SalesOrders.tsx`
2. `src/pages/GeneralTrading/Purchasing.tsx`
3. `src/pages/GeneralTrading/DeliveryNote.tsx`
4. `src/pages/GeneralTrading/PPIC.tsx` (if exists)
5. `src/pages/GeneralTrading/Return.tsx` (if exists)
6. Other workflow modules

### Finance Modules (9-14)
1. `src/pages/GeneralTrading/Finance/Accounting.tsx`
2. `src/pages/GeneralTrading/Finance/Invoices.tsx`
3. `src/pages/GeneralTrading/Finance/Payments.tsx`
4. `src/pages/GeneralTrading/Finance/AccountsReceivable.tsx`
5. `src/pages/GeneralTrading/Finance/AccountsPayable.tsx`
6. `src/pages/GeneralTrading/Finance/TaxManagement.tsx`
7. `src/pages/GeneralTrading/Finance/FinancialReports.tsx`
8. `src/pages/GeneralTrading/Finance/AllReportsFinance.tsx`
9. `src/pages/GeneralTrading/Finance/OperationalExpenses.tsx`
10. `src/pages/GeneralTrading/Finance/CostAnalysis.tsx`
11. `src/pages/GeneralTrading/Finance/GeneralLedger.tsx`
12. Other finance modules

---

## 📋 Trucking Modules (Estimated 10-15)

### Workflow Modules (3-5)
1. `src/pages/Trucking/Shipments/DeliveryNote.tsx`
2. `src/pages/Trucking/Shipments/SuratJalan.tsx` (if exists)
3. `src/pages/Trucking/Vehicles.tsx` (if exists)
4. `src/pages/Trucking/Drivers.tsx` (if exists)
5. Other workflow modules

### Finance Modules (7-10)
1. `src/pages/Trucking/Finance/Accounting.tsx`
2. `src/pages/Trucking/Finance/Invoices.tsx`
3. `src/pages/Trucking/Finance/Payments.tsx`
4. `src/pages/Trucking/Finance/AccountsReceivable.tsx`
5. `src/pages/Trucking/Finance/AccountsPayable.tsx`
6. `src/pages/Trucking/Finance/TaxManagement.tsx`
7. `src/pages/Trucking/Finance/FinancialReports.tsx`
8. Other finance modules

---

## 🔧 Implementation Steps

For each module:

1. **Add Import**
   ```typescript
   import { useLanguage } from '../../hooks/useLanguage';
   ```

2. **Add Hook Call**
   ```typescript
   const { t } = useLanguage();
   ```

3. **Wrap Columns in useMemo** (if module has columns)
   ```typescript
   const columns = useMemo(() => [
     { key: 'name', header: t('common.name') || 'Name', ... }
   ], [t]);
   ```

4. **Translate Buttons & Labels**
   ```typescript
   <Button>{t('common.save') || 'Save'}</Button>
   ```

---

## 📊 Batch Processing Strategy

**Recommended Approach**:
1. List all modules in each directory
2. Process workflow modules first (6-8 modules)
3. Process finance modules (20-25 modules)
4. Verify with getDiagnostics
5. Test language switching

**Time Estimate**: 2-3 hours for all modules

---

## ✅ Verification Checklist

After completing each module:
- [ ] useLanguage hook imported
- [ ] `const { t } = useLanguage();` added
- [ ] Columns wrapped in useMemo (if applicable)
- [ ] Column headers translated
- [ ] Action buttons translated
- [ ] No TypeScript errors
- [ ] Fallback text provided

---

## 🎯 Success Criteria

- ✅ All General Trading modules have language support
- ✅ All Trucking modules have language support
- ✅ Language switching works across all modules
- ✅ No TypeScript errors
- ✅ All translations display correctly
- ✅ Fallback text prevents UI breakage

---

## 📝 Notes

- Use same translation keys as Packaging (already defined in `src/services/language.ts`)
- Add new keys to language service if needed
- Test language switching in Settings
- Verify sidebar menu updates correctly
- Check that all columns re-render when language changes

---

## 🚀 Ready to Start?

1. First, list all modules in General Trading directory
2. Then list all modules in Trucking directory
3. Process in batches (5-10 modules at a time)
4. Verify after each batch
5. Create summary when complete

---

**Session 3 Target**: 100% Language Support for All Modules ✅
