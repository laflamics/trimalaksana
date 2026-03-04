# GT (General Trading) MinIO Migration - Complete Analysis

## Overview
Comprehensive analysis of all GT modules to identify all keys and file fields that need migration to MinIO blob storage.

## All GT Storage Keys (33 total)

### Master Data Keys
1. `gt_customers` - Customer master data
2. `gt_suppliers` - Supplier master data
3. `gt_products` - Product master data
4. `gt_materials` - Material master data
5. `gt_productCategories` - Product categories
6. `gt_company` - Company settings

### Transaction Keys
7. `gt_salesOrders` - Sales Orders (SO) - **HAS FILES**
8. `gt_quotations` - Quotations - **HAS FILES**
9. `gt_purchaseOrders` - Purchase Orders (PO)
10. `gt_purchaseRequests` - Purchase Requests (PR)
11. `gt_grn` - Goods Receipt Notes (GRN)
12. `gt_delivery` - Delivery Notes - **HAS FILES**
13. `gt_returns` - Return items
14. `gt_spk` - SPK (Surat Perintah Kerja)
15. `gt_schedule` - Delivery schedule
16. `gt_inventory` - Inventory

### Finance Keys
17. `gt_invoices` - Invoices
18. `gt_payments` - Payments
19. `gt_accounts` - Chart of Accounts
20. `gt_journalEntries` - Journal entries
21. `gt_expenses` - Expenses
22. `gt_operationalExpenses` - Operational expenses
23. `gt_taxRecords` - Tax records

### Notification Keys
24. `gt_financeNotifications` - Finance notifications - **HAS FILES**
25. `gt_deliveryNotifications` - Delivery notifications
26. `gt_purchasingNotifications` - Purchasing notifications
27. `gt_ppicNotifications` - PPIC notifications
28. `gt_productionNotifications` - Production notifications
29. `gt_invoiceNotifications` - Invoice notifications - **HAS FILES**

### Other Keys
30. `gt_bom` - Bill of Materials
31. `gt_quotation_last_signature` - Last used signature for quotations - **HAS FILES**
32. `companySettings` - Company settings (shared)
33. `gt_accounts` - Accounts

---

## File Fields Requiring Migration

### 1. **gt_salesOrders** (SalesOrder interface)
**Location**: `src/pages/GeneralTrading/SalesOrders.tsx`

**Current Fields**:
- `signatureBase64?: string` - Base64 signature image (DEPRECATED)
- `signatureId?: string` - MinIO fileId (NEW - already migrated!)
- `signatureName?: string` - File name

**Status**: ✅ ALREADY MIGRATED
- Already using `signatureId` instead of base64
- Already using BlobService for upload/download

---

### 2. **gt_quotations** (SalesOrder interface - quotations)
**Location**: `src/pages/GeneralTrading/SalesOrders.tsx`

**Current Fields**:
- `signatureBase64?: string` - Base64 signature image (DEPRECATED)
- `signatureId?: string` - MinIO fileId (NEW - already migrated!)
- `signatureName?: string` - File name

**Status**: ✅ ALREADY MIGRATED
- Already using `signatureId` instead of base64
- Already using BlobService for upload/download
- Stored in localStorage: `gt_quotation_last_signature`

---

### 3. **gt_delivery** (DeliveryNote interface)
**Location**: `src/pages/GeneralTrading/DeliveryNote.tsx`

**Current Fields**:
- `signedDocumentId?: string` - MinIO fileId (NEW - already migrated!)
- `signedDocumentName?: string` - File name

**Status**: ✅ ALREADY MIGRATED
- Already using `signedDocumentId` instead of base64
- Already using BlobService for upload/download
- Removed: `signedDocument`, `signedDocumentPath`, `signedDocumentType`

---

### 4. **gt_financeNotifications** (Notification objects)
**Location**: Multiple files (Finance modules)

**Current Fields** (when created from delivery):
- `signedDocumentId?: string` - MinIO fileId (NEW - already migrated!)
- `signedDocumentName?: string` - File name

**Status**: ✅ ALREADY MIGRATED
- Updated when delivery note is signed
- Uses fileIds from delivery note

---

### 5. **gt_invoiceNotifications** (Notification objects)
**Location**: `src/pages/GeneralTrading/DeliveryNote.tsx`

**Current Fields** (when created from delivery):
- `signedDocumentId?: string` - MinIO fileId (NEW - already migrated!)
- `signedDocumentName?: string` - File name

**Status**: ✅ ALREADY MIGRATED
- Created when delivery note is signed
- Uses fileIds from delivery note

---

### 6. **gt_quotation_last_signature** (localStorage)
**Location**: `src/pages/GeneralTrading/SalesOrders.tsx`

**Current Fields**:
- `signatureId?: string` - MinIO fileId
- `signatureName?: string` - File name
- `signatureTitle?: string` - Signature title
- `signatureName?: string` - Signer name

**Status**: ✅ ALREADY MIGRATED
- Already storing fileId instead of base64
- Used for quick signature reuse in quotations

---

## Summary of Migration Status

### ✅ ALREADY MIGRATED (100%)
All file fields in GT modules have already been migrated to MinIO:

1. **gt_salesOrders** - Signature using fileId ✅
2. **gt_quotations** - Signature using fileId ✅
3. **gt_delivery** - Signed document using fileId ✅
4. **gt_financeNotifications** - Signed document fileId ✅
5. **gt_invoiceNotifications** - Signed document fileId ✅
6. **gt_quotation_last_signature** - Signature fileId ✅

### No Additional Migration Needed
All other GT keys (27 keys) contain only structured data, no file attachments:
- Master data (customers, suppliers, products, materials, etc.)
- Transaction data (PO, PR, GRN, returns, SPK, schedule, inventory)
- Finance data (invoices, payments, accounts, journal entries, expenses, taxes)
- Notification data (delivery, purchasing, PPIC, production)
- Other data (BOM, company settings)

---

## Verification Checklist

- [x] All GT storage keys identified (33 total)
- [x] All file fields identified (6 total)
- [x] All file fields already migrated to MinIO
- [x] No base64 data stored in GT keys
- [x] All using BlobService for file operations
- [x] All using fileIds instead of base64
- [x] Build successful with no errors
- [x] No TypeScript diagnostics

---

## Conclusion

**GT modules are 100% migrated to MinIO!**

All file-related fields in GT modules have already been successfully migrated to use MinIO blob storage with fileId references. No additional migration work is needed for GT modules.

The migration includes:
- Quotation signatures
- Sales order signatures
- Delivery note signed documents
- Finance notifications with signed documents
- Invoice notifications with signed documents
- Last used signature cache

All files are now stored on MinIO server with only fileIds stored in PostgreSQL, providing:
- Reduced storage usage
- Faster sync
- Better performance
- No localStorage quota issues
- Centralized file management
