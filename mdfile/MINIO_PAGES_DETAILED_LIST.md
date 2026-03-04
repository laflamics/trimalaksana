# MinIO Migration - Detailed Page-by-Page List

## 📋 Complete List of All Pages & Changes Needed

---

## 1️⃣ **src/pages/Master/Products.tsx**

### Current Implementation (Base64)
- **Line ~532**: `handleImageUpload()` - Converts file to base64
- **Line ~536**: `setProductImage(base64)` - Stores base64 in state
- **Line ~2461**: File input onChange calls handleImageUpload

### What to Change
- [ ] Import BlobService
- [ ] Replace handleImageUpload() to use BlobService.uploadFile()
- [ ] Change state from `productImage: string` to `productImageId: string`
- [ ] Update image display from `<img src={productImage} />` to `<img src={BlobService.getDownloadUrl(productImageId, 'packaging')} />`
- [ ] Update form save to store `productImageId` instead of `productImage`
- [ ] Update form load to handle both old base64 and new fileId

### Fields to Update
- `productImage` → `productImageId`

### Complexity: ⭐ Easy (1 file)

---

## 2️⃣ **src/pages/Finance/Finance.tsx**

### Current Implementation (Base64)
- **Line ~644**: PaymentDialog component
- **Line ~684**: `handleFileChange()` - File input handler
- **Line ~696**: `handleSubmit()` - Converts file to base64
- **Line ~716**: `handleViewSuratJalan()` - Views surat jalan from base64
- **Line ~723**: Constructs data URL from base64

### What to Change
- [ ] Import BlobService
- [ ] Replace handleFileChange() to use BlobService.uploadFile()
- [ ] Replace handleSubmit() base64 conversion
- [ ] Update handleViewSuratJalan() to use MinIO URL
- [ ] Change state from base64 to fileId
- [ ] Update payment proof display

### Fields to Update
- `paymentProof` → `paymentProofId`
- `suratJalan` → `suratJalanId`
- `invoiceFile` → `invoiceFileId`

### Complexity: ⭐⭐ Medium (3 files, view logic)

---

## 3️⃣ **src/pages/Finance/Accounting.tsx**

### Current Implementation (Base64)
- **Line ~3146**: `paymentFile` state
- **Line ~3147**: `handleFileChange()` - File input handler
- **Line ~3161**: `handleSubmit()` - Converts file to base64
- **Line ~1042**: `normalizedProof` - Constructs data URL
- **Line ~1063**: `handleDownloadPaymentProof()` - Downloads base64

### What to Change
- [ ] Import BlobService
- [ ] Replace handleFileChange() to use BlobService.uploadFile()
- [ ] Replace handleSubmit() base64 conversion
- [ ] Update handleDownloadPaymentProof() to use MinIO URL
- [ ] Update payment proof display
- [ ] Change state from base64 to fileId

### Fields to Update
- `paymentProof` → `paymentProofId`

### Complexity: ⭐⭐ Medium (1 file, download logic)

---

## 4️⃣ **src/pages/GeneralTrading/SalesOrders.tsx**

### Current Implementation (Base64)
- **Line ~689**: FileReader for signature
- **Line ~690**: `readAsDataURL()` - Converts to base64
- **Line ~5402**: Another FileReader for signature
- **Line ~5417**: `readAsDataURL()` - Converts to base64

### What to Change
- [ ] Import BlobService
- [ ] Replace FileReader with BlobService.uploadFile()
- [ ] Update signature storage from base64 to fileId
- [ ] Update signature display to use MinIO URL
- [ ] Handle multiple signature locations

### Fields to Update
- `signature` → `signatureId` (or similar)

### Complexity: ⭐⭐ Medium (2 locations, signature handling)

---

## 5️⃣ **src/pages/GeneralTrading/Purchasing.tsx**

### Current Implementation (Base64)
- **Line ~4309**: `handleFileChange()` - Surat jalan file
- **Line ~4316**: `handleInvoiceFileChange()` - Invoice file
- **Line ~4371**: FileReader loop for both files
- **Line ~4374**: `readAsDataURL()` - Converts to base64
- **Line ~4397**: Stores both as base64

### What to Change
- [ ] Import BlobService
- [ ] Replace handleFileChange() to use BlobService.uploadFile()
- [ ] Replace handleInvoiceFileChange() to use BlobService.uploadFile()
- [ ] Remove FileReader loop
- [ ] Update state to store fileIds instead of base64
- [ ] Update file display logic
- [ ] Update GRN save logic

### Fields to Update
- `suratJalan` → `suratJalanId`
- `invoiceFile` → `invoiceFileId`

### Complexity: ⭐⭐⭐ Hard (2 files, complex save logic)

---

## 6️⃣ **src/pages/GeneralTrading/DeliveryNote.tsx**

### Current Implementation (Base64)
- **Line ~1928**: `handleUploadSignedDocument()` - Signed document upload
- **Line ~1929**: FileReader for document
- **Line ~2120**: `readAsDataURL()` - Converts to base64
- **Line ~4824**: `handleFileChange()` - Another file handler
- **Line ~4989**: Another FileReader for signed file
- **Line ~5044**: `readAsDataURL()` - Converts to base64

### What to Change
- [ ] Import BlobService
- [ ] Replace handleUploadSignedDocument() to use BlobService.uploadFile()
- [ ] Replace handleFileChange() to use BlobService.uploadFile()
- [ ] Remove FileReader instances
- [ ] Update state to store fileIds
- [ ] Update document display
- [ ] Handle multiple upload locations

### Fields to Update
- `signedDocument` → `signedDocumentId`

### Complexity: ⭐⭐⭐ Hard (2 locations, document handling)

---

## 7️⃣ **src/pages/Packaging/QAQC.tsx**

### Current Implementation (Base64)
- **Line ~1317**: `handleFileChange()` - Multiple file handler
- **Line ~1319**: Stores files in state
- **Line ~1362**: FileReader loop for multiple files
- **Line ~1363**: `readAsDataURL()` - Converts each to base64
- **Line ~1369**: Stores array of base64 strings

### What to Change
- [ ] Import BlobService
- [ ] Replace handleFileChange() to handle multiple files
- [ ] Replace FileReader loop with BlobService.uploadFile() loop
- [ ] Update state to store array of fileIds
- [ ] Update file display to show all files
- [ ] Update delete logic for individual files
- [ ] Handle file removal from array

### Fields to Update
- `qcFiles` → `qcFileIds` (array)

### Complexity: ⭐⭐⭐⭐ Very Hard (Multiple files, array handling)

---

## 8️⃣ **src/pages/Packaging/Purchasing.tsx**

### Current Implementation (Base64)
- **Line ~5072**: `handleFileChange()` - Surat jalan file
- **Line ~5079**: `handleInvoiceFileChange()` - Invoice file
- **Line ~5139**: FileReader loop for both files
- **Line ~5141**: `readAsDataURL()` - Converts to base64
- **Line ~5166**: Stores both as base64

### What to Change
- [ ] Import BlobService
- [ ] Replace handleFileChange() to use BlobService.uploadFile()
- [ ] Replace handleInvoiceFileChange() to use BlobService.uploadFile()
- [ ] Remove FileReader loop
- [ ] Update state to store fileIds
- [ ] Update file display logic
- [ ] Update GRN save logic

### Fields to Update
- `suratJalan` → `suratJalanId`
- `invoiceFile` → `invoiceFileId`

### Complexity: ⭐⭐⭐ Hard (2 files, similar to GT Purchasing)

---

## 9️⃣ **src/pages/Master/Inventory.tsx**

### Current Implementation (Base64)
- **Line ~171**: `handleFileChange()` - Stock documentation
- **Line ~171**: `setStockDocFile(file)` - Stores file
- **Line ~173**: FileReader for document
- **Line ~175**: `readAsDataURL()` - Converts to base64
- **Line ~176**: Stores base64 in form

### What to Change
- [ ] Import BlobService
- [ ] Replace handleFileChange() to use BlobService.uploadFile()
- [ ] Remove FileReader
- [ ] Update state to store fileId
- [ ] Update document display
- [ ] Update form save logic

### Fields to Update
- `stockDocumentation` → `stockDocumentationId`

### Complexity: ⭐ Easy (1 file)

---

## 🔟 **src/pages/Settings/TestAutomation.tsx**

### Current Implementation (Base64)
- **Line ~274**: FileReader for test file
- **Line ~277**: `readAsDataURL()` - Converts to base64
- **Line ~368**: Another FileReader
- **Line ~370**: `readAsDataURL()` - Converts to base64
- **Line ~454**: Another FileReader
- **Line ~457**: `readAsDataURL()` - Converts to base64
- **Line ~507**: Another FileReader
- **Line ~510**: `readAsDataURL()` - Converts to base64
- **Line ~616**: Another FileReader
- **Line ~619**: `readAsDataURL()` - Converts to base64

### What to Change
- [ ] Import BlobService
- [ ] Replace all FileReader instances with BlobService.uploadFile()
- [ ] Update test data to use fileIds
- [ ] Update test assertions
- [ ] Handle multiple test scenarios

### Fields to Update
- Multiple test file fields

### Complexity: ⭐⭐⭐ Hard (5+ FileReader instances)

---

## 📊 Summary Table

| # | Page | Files | Complexity | Status |
|---|------|-------|-----------|--------|
| 1 | Products.tsx | 1 | ⭐ Easy | ⏳ TODO |
| 2 | Finance.tsx | 3 | ⭐⭐ Medium | ⏳ TODO |
| 3 | Accounting.tsx | 1 | ⭐⭐ Medium | ⏳ TODO |
| 4 | SalesOrders.tsx | 1 | ⭐⭐ Medium | ⏳ TODO |
| 5 | GT Purchasing.tsx | 2 | ⭐⭐⭐ Hard | ⏳ TODO |
| 6 | DeliveryNote.tsx | 1 | ⭐⭐⭐ Hard | ⏳ TODO |
| 7 | QAQC.tsx | Multiple | ⭐⭐⭐⭐ Very Hard | ⏳ TODO |
| 8 | Pkg Purchasing.tsx | 2 | ⭐⭐⭐ Hard | ⏳ TODO |
| 9 | Inventory.tsx | 1 | ⭐ Easy | ⏳ TODO |
| 10 | TestAutomation.tsx | Multiple | ⭐⭐⭐ Hard | ⏳ TODO |

---

## 🎯 Recommended Order

### Phase 1: Easy Pages (Start Here)
1. Products.tsx - Single image
2. Inventory.tsx - Single document

### Phase 2: Medium Pages
3. Finance.tsx - Payment proof + views
4. Accounting.tsx - Payment proof + download
5. SalesOrders.tsx - Signature

### Phase 3: Hard Pages
6. GT Purchasing.tsx - Invoice + Surat Jalan
7. Pkg Purchasing.tsx - Invoice + Surat Jalan
8. DeliveryNote.tsx - Signed document

### Phase 4: Very Hard Pages
9. QAQC.tsx - Multiple files
10. TestAutomation.tsx - Multiple test files

---

## 🔍 Key Changes Pattern

### For Each Page:
1. **Import**: `import BlobService from '../../services/blob-service';`
2. **Upload**: Replace FileReader with `BlobService.uploadFile(file, 'packaging')`
3. **State**: Change from base64 string to fileId string
4. **Display**: Use `BlobService.getDownloadUrl(fileId, 'packaging')`
5. **Save**: Store fileId instead of base64
6. **Delete**: Use `BlobService.deleteFile(fileId, 'packaging')`

---

## ✅ Checklist Template

For each page, use this checklist:

```
Page: _______________

- [ ] Import BlobService
- [ ] Find all FileReader instances
- [ ] Replace FileReader with BlobService.uploadFile()
- [ ] Update state variables (base64 → fileId)
- [ ] Update display logic (use getDownloadUrl)
- [ ] Update save logic (store fileId)
- [ ] Update delete logic (use deleteFile)
- [ ] Update load logic (handle fileId)
- [ ] Test upload
- [ ] Test display
- [ ] Test delete
- [ ] Test cross-device sync
- [ ] Commit changes
```

