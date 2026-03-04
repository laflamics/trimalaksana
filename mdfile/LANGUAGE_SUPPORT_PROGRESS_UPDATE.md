# Language Support Progress - General Trading Module

**Last Updated**: February 22, 2026  
**Overall Status**: 🟡 IN PROGRESS (Phase 2 of 4)

---

## Completion Status

### Phase 1: Settings & Layout ✅ COMPLETE
- ✅ GT Settings page - Language selection UI added
- ✅ GT Layout sidebar - Menu items translated with `t()` calls
- ✅ Language service - Translation keys added for GT module

### Phase 2: Master Data Table Headers ⏳ IN PROGRESS
- ⏳ Products.tsx - Table headers need `t()` calls
- ⏳ Customers.tsx - Table headers need `t()` calls
- ⏳ Suppliers.tsx - Table headers need `t()` calls
- ⏳ Inventory.tsx - Table headers need `t()` calls

### Phase 3: Main Modules Table Headers ⏳ PENDING
- ⏳ SalesOrders.tsx - Table headers need `t()` calls
- ⏳ Purchasing.tsx - Table headers need `t()` calls
- ⏳ DeliveryNote.tsx - Table headers need `t()` calls
- ⏳ PPIC.tsx - Table headers need `t()` calls

### Phase 4: Finance Modules Table Headers ⏳ PENDING
- ⏳ Invoices.tsx - Table headers need `t()` calls
- ⏳ AccountsReceivable.tsx - Table headers need `t()` calls
- ⏳ AccountsPayable.tsx - Table headers need `t()` calls
- ⏳ TaxManagement.tsx - Table headers need `t()` calls
- ⏳ Payments.tsx - Table headers need `t()` calls
- ⏳ AllReportsFinance.tsx - Table headers need `t()` calls

---

## What's Working Now

### ✅ Language Selection
- User can select Indonesian or English in GT Settings
- Language preference persists in localStorage
- Changes apply immediately across the app

### ✅ Sidebar Menu Translation
- All GT sidebar menu items translate based on selected language
- Menu updates in real-time when language changes
- Fallback values ensure UI never breaks

### ✅ Translation Keys
- 50+ translation keys available in language service
- Both Indonesian and English translations provided
- Easy to add new keys as needed

---

## Example: How Language Works

### In GT Layout (Sidebar)
```typescript
const { t } = useLanguage();

const menuItems = useMemo(() => [
  {
    title: t('master.title') || 'MASTER',  // Translates to "Data Master" (ID) or "Master Data" (EN)
    items: [
      { title: t('master.products') || 'Products', ... },  // Translates to "Produk" (ID) or "Products" (EN)
    ]
  }
], [t]);
```

### In GT Settings
```typescript
const { t } = useLanguage();

<div>
  <label>
    <input 
      type="radio" 
      value="id" 
      checked={language === 'id'}
      onChange={() => setLanguage('id')}
    />
    Bahasa Indonesia
  </label>
  <label>
    <input 
      type="radio" 
      value="en"
      checked={language === 'en'}
      onChange={() => setLanguage('en')}
    />
    English
  </label>
</div>
```

---

## Next Action Items

### Immediate (Phase 2)
1. Add `const { t } = useLanguage();` to Master Data files
2. Replace table column headers with `t()` calls
3. Add missing translation keys to language service

### Files to Update Next
```
src/pages/GeneralTrading/Master/Products.tsx
src/pages/GeneralTrading/Master/Customers.tsx
src/pages/GeneralTrading/Master/Suppliers.tsx
src/pages/Master/Inventory.tsx
```

### Pattern to Follow
```typescript
// Before
const columns = [
  { key: 'code', header: 'Product Code' },
  { key: 'name', header: 'Product Name' },
  { key: 'price', header: 'Price' },
];

// After
const { t } = useLanguage();
const columns = [
  { key: 'code', header: t('master.productCode') || 'Product Code' },
  { key: 'name', header: t('master.productName') || 'Product Name' },
  { key: 'price', header: t('master.price') || 'Price' },
];
```

---

## Translation Keys Reference

### Master Data Keys
```
master.title = "Data Master" (ID) / "Master Data" (EN)
master.products = "Produk" (ID) / "Products" (EN)
master.customers = "Pelanggan" (ID) / "Customers" (EN)
master.suppliers = "Pemasok" (ID) / "Suppliers" (EN)
master.inventory = "Inventaris" (ID) / "Inventory" (EN)
master.productCode = "Kode Produk" (ID) / "Product Code" (EN)
master.productName = "Nama Produk" (ID) / "Product Name" (EN)
master.category = "Kategori" (ID) / "Category" (EN)
master.unit = "Satuan" (ID) / "Unit" (EN)
master.price = "Harga" (ID) / "Price" (EN)
master.cost = "Biaya" (ID) / "Cost" (EN)
master.stock = "Stok" (ID) / "Stock" (EN)
```

### Finance Keys
```
finance.title = "Keuangan" (ID) / "Finance" (EN)
finance.invoices = "Faktur" (ID) / "Invoices" (EN)
finance.payments = "Pembayaran" (ID) / "Payments" (EN)
finance.accountsReceivable = "Piutang Usaha" (ID) / "Accounts Receivable" (EN)
finance.accountsPayable = "Utang Usaha" (ID) / "Accounts Payable" (EN)
finance.taxManagement = "Manajemen Pajak" (ID) / "Tax Management" (EN)
finance.reports = "Laporan" (ID) / "Reports" (EN)
```

### Common Keys
```
common.status = "Status" (both)
common.action = "Aksi" (ID) / "Action" (EN)
common.save = "Simpan" (ID) / "Save" (EN)
common.cancel = "Batal" (ID) / "Cancel" (EN)
common.delete = "Hapus" (ID) / "Delete" (EN)
common.edit = "Edit" (both)
common.add = "Tambah" (ID) / "Add" (EN)
```

---

## Summary

✅ **Phase 1 Complete**: Settings and Layout sidebar fully translated  
🟡 **Phase 2 In Progress**: Master Data table headers need translation  
⏳ **Phase 3 Pending**: Main modules table headers  
⏳ **Phase 4 Pending**: Finance modules table headers  

**Current Focus**: Master Data table headers (Products, Customers, Suppliers, Inventory)

