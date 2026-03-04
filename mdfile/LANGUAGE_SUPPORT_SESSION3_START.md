# Language Support - Session 3 START ✅

**Date**: February 22, 2026  
**Status**: ✅ SESSION 3 READY TO BEGIN  
**Modules to Implement**: 25 (12 General Trading + 13 Trucking)

---

## 📊 SESSION 3 OVERVIEW

### What We're Doing
Applying the same language support pattern from Packaging to:
- **General Trading**: 12 modules (5 workflow + 7 finance)
- **Trucking**: 13 modules (2 workflow + 11 finance)

### Implementation Pattern (Copy from Packaging)
```typescript
// 1. Import hook
import { useLanguage } from '../../hooks/useLanguage';

// 2. Call hook
const { t } = useLanguage();

// 3. Wrap columns in useMemo
const columns = useMemo(() => [
  { key: 'name', header: t('common.name') || 'Name' }
], [t]);
```

### Time Estimate
- **General Trading**: 35-45 minutes (12 modules)
- **Trucking**: 35-45 minutes (13 modules)
- **Total**: 70-90 minutes

---

## 📋 GENERAL TRADING MODULES (12)

### Workflow (5 modules)
```
src/pages/GeneralTrading/
├── SalesOrders.tsx          ⏳ TODO
├── Purchasing.tsx           ⏳ TODO
├── DeliveryNote.tsx         ⏳ TODO
├── PPIC.tsx                 ⏳ TODO
└── Return.tsx               ⏳ TODO
```

### Finance (7 modules)
```
src/pages/GeneralTrading/Finance/
├── Invoices.tsx             ⏳ TODO
├── Payments.tsx             ⏳ TODO
├── AccountsReceivable.tsx   ⏳ TODO
├── AccountsPayable.tsx      ⏳ TODO
├── TaxManagement.tsx        ⏳ TODO
├── FinancialReports.tsx     ⏳ TODO
└── AllReportsFinance.tsx    ⏳ TODO
```

---

## 📋 TRUCKING MODULES (13)

### Workflow (2 modules)
```
src/pages/Trucking/Shipments/
├── DeliveryNote.tsx         ⏳ TODO
└── DeliveryOrders.tsx       ⏳ TODO
```

### Finance (11 modules)
```
src/pages/Trucking/Finance/
├── Invoices.tsx             ⏳ TODO
├── Payments.tsx             ⏳ TODO
├── AccountsReceivable.tsx   ⏳ TODO
├── AccountsPayable.tsx      ⏳ TODO
├── TaxManagement.tsx        ⏳ TODO
├── FinancialReports.tsx     ⏳ TODO
├── AllReportsFinance.tsx    ⏳ TODO
├── OperationalExpenses.tsx  ⏳ TODO
├── CostAnalysis.tsx         ⏳ TODO
├── PettyCash.tsx            ⏳ TODO
└── COA.tsx                  ⏳ TODO
```

---

## 🎯 QUICK START GUIDE

### Step 1: Open First Module
```
src/pages/GeneralTrading/SalesOrders.tsx
```

### Step 2: Add Import
```typescript
import { useLanguage } from '../../hooks/useLanguage';
```

### Step 3: Add Hook Call
```typescript
const { t } = useLanguage();
```

### Step 4: Wrap Columns in useMemo
```typescript
const columns = useMemo(() => [
  { key: 'no', header: t('common.number') || 'No' },
  { key: 'soNo', header: t('salesOrder.number') || 'Order Number' },
  { key: 'customer', header: t('master.customerName') || 'Customer' },
  { key: 'status', header: t('common.status') || 'Status' },
  // ... more columns
], [t]);
```

### Step 5: Test
- Open Settings
- Switch language to Indonesian
- Verify columns display in Indonesian
- Switch to English
- Verify columns display in English

### Step 6: Move to Next Module
Repeat for all 25 modules

---

## 📚 REFERENCE MODULES (Copy Pattern From)

### Best Examples from Packaging:
1. **SalesOrders.tsx** - Has columns in useMemo
2. **Production.tsx** - Has columns in useMemo
3. **DeliveryNote.tsx** - Has columns in useMemo
4. **Finance/Accounting.tsx** - Has columns in useMemo
5. **Finance/Payments.tsx** - Has columns in useMemo

**Location**: `src/pages/Packaging/`

---

## 🔑 TRANSLATION KEYS AVAILABLE

All these keys are ready to use in `src/services/language.ts`:

### Common (50+ keys)
- common.number, common.name, common.code, common.status
- common.save, common.cancel, common.delete, common.edit
- common.date, common.time, common.amount, common.price
- common.quantity, common.unit, common.actions, common.total
- (and 30+ more)

### Finance (25+ keys)
- finance.invoices, finance.payments, finance.accountsReceivable
- finance.accountsPayable, finance.taxManagement, finance.reports
- finance.invoice, finance.invoiceNumber, finance.invoiceDate
- finance.dueDate, finance.amount, finance.paid, finance.outstanding
- (and 10+ more)

### Sales Order (20+ keys)
- salesOrder.title, salesOrder.number, salesOrder.date
- salesOrder.customer, salesOrder.status, salesOrder.total
- (and 15+ more)

### Master Data (20+ keys)
- master.productCode, master.productName, master.customerName
- master.supplierName, master.category, master.unit
- (and 15+ more)

---

## ✅ CHECKLIST FOR EACH MODULE

For every module you implement:

- [ ] Import `useLanguage` hook
- [ ] Call `const { t } = useLanguage();`
- [ ] Wrap columns in `useMemo` with `[t]` dependency
- [ ] All column headers use `t()` function
- [ ] All translation calls have fallback text
- [ ] No TypeScript errors
- [ ] Test language switching works
- [ ] Verify columns update when language changes
- [ ] Mark as ✅ DONE in TODO list

---

## 📊 PROGRESS TRACKING

### General Trading: 0/12 (0%)
```
SalesOrders.tsx           ⏳ TODO
Purchasing.tsx            ⏳ TODO
DeliveryNote.tsx          ⏳ TODO
PPIC.tsx                  ⏳ TODO
Return.tsx                ⏳ TODO
Invoices.tsx              ⏳ TODO
Payments.tsx              ⏳ TODO
AccountsReceivable.tsx    ⏳ TODO
AccountsPayable.tsx       ⏳ TODO
TaxManagement.tsx         ⏳ TODO
FinancialReports.tsx      ⏳ TODO
AllReportsFinance.tsx     ⏳ TODO
```

### Trucking: 0/13 (0%)
```
DeliveryNote.tsx          ⏳ TODO
DeliveryOrders.tsx        ⏳ TODO
Invoices.tsx              ⏳ TODO
Payments.tsx              ⏳ TODO
AccountsReceivable.tsx    ⏳ TODO
AccountsPayable.tsx       ⏳ TODO
TaxManagement.tsx         ⏳ TODO
FinancialReports.tsx      ⏳ TODO
AllReportsFinance.tsx     ⏳ TODO
OperationalExpenses.tsx   ⏳ TODO
CostAnalysis.tsx          ⏳ TODO
PettyCash.tsx             ⏳ TODO
COA.tsx                   ⏳ TODO
```

### Total: 0/25 (0%)

---

## 🚀 RECOMMENDED IMPLEMENTATION ORDER

### Phase 1: General Trading Workflow (5 modules) - 15-20 min
1. SalesOrders.tsx
2. Purchasing.tsx
3. DeliveryNote.tsx
4. PPIC.tsx
5. Return.tsx

### Phase 2: General Trading Finance (7 modules) - 20-25 min
1. Invoices.tsx
2. Payments.tsx
3. AccountsReceivable.tsx
4. AccountsPayable.tsx
5. TaxManagement.tsx
6. FinancialReports.tsx
7. AllReportsFinance.tsx

### Phase 3: Trucking Workflow (2 modules) - 5-10 min
1. Shipments/DeliveryNote.tsx
2. Shipments/DeliveryOrders.tsx

### Phase 4: Trucking Finance (11 modules) - 30-40 min
1. Finance/Invoices.tsx
2. Finance/Payments.tsx
3. Finance/AccountsReceivable.tsx
4. Finance/AccountsPayable.tsx
5. Finance/TaxManagement.tsx
6. Finance/FinancialReports.tsx
7. Finance/AllReportsFinance.tsx
8. Finance/OperationalExpenses.tsx
9. Finance/CostAnalysis.tsx
10. Finance/PettyCash.tsx
11. Finance/COA.tsx

---

## 💡 TIPS & TRICKS

### Tip 1: Use Find & Replace
- Find: `const { t } = useLanguage();` (from Packaging module)
- Copy entire hook call and useMemo pattern
- Paste into new module
- Adjust column keys as needed

### Tip 2: Batch Similar Modules
- Do all Finance modules together (they have similar structure)
- Do all Workflow modules together (they have similar structure)

### Tip 3: Test Frequently
- After every 3-4 modules, test language switching
- Verify localStorage is working
- Check for any TypeScript errors

### Tip 4: Use Packaging as Template
- Keep Packaging modules open as reference
- Copy the exact pattern
- Don't deviate from the pattern

---

## ⚠️ COMMON MISTAKES TO AVOID

❌ **DON'T**: Use global provider (each module imports individually)
✅ **DO**: Import hook in each module

❌ **DON'T**: Forget [t] dependency in useMemo
✅ **DO**: Always include [t] in dependency array

❌ **DON'T**: Skip fallback text
✅ **DO**: Always provide fallback text: `t('key') || 'Fallback'`

❌ **DON'T**: Forget to wrap columns in useMemo
✅ **DO**: Wrap columns in useMemo with [t] dependency

❌ **DON'T**: Use non-existent translation keys
✅ **DO**: Use keys that exist in language.ts

---

## 📞 NEED HELP?

### Reference Files
- `src/pages/Packaging/SalesOrders.tsx` - Best example
- `src/pages/Packaging/Production.tsx` - Good example
- `src/pages/Packaging/Finance/Accounting.tsx` - Finance example

### Check These Files
- `src/services/language.ts` - All translation keys
- `src/hooks/useLanguage.ts` - Hook implementation
- `src/pages/Settings/Settings.tsx` - Language selection UI

---

## 🎯 SUCCESS CRITERIA

Session 3 is complete when:
- ✅ All 12 General Trading modules have useLanguage
- ✅ All 13 Trucking modules have useLanguage
- ✅ All modules use translation function correctly
- ✅ All columns wrapped in useMemo with [t] dependency
- ✅ Language switching works for all modules
- ✅ No TypeScript errors
- ✅ No duplicate translation keys
- ✅ All modules tested

---

## 📝 DETAILED TODO LIST

See: `mdfile/LANGUAGE_SUPPORT_SESSION3_TODO.md`

For detailed checklist of all 25 modules with specific tasks.

---

## 🎉 LET'S START!

**Ready to begin Session 3?**

1. Open `src/pages/GeneralTrading/SalesOrders.tsx`
2. Follow the implementation pattern
3. Test language switching
4. Move to next module
5. Repeat for all 25 modules

**Estimated Time**: 70-90 minutes

**Target**: Complete all 25 modules in this session

---

**Status**: ✅ READY TO START  
**Date**: February 22, 2026  
**Session**: 3 of 3  
**Modules**: 25 (12 GT + 13 Trucking)

