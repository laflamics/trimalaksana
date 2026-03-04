# MinIO Implementation Plan - Complete List

## 📋 Summary
Migrate all base64 file uploads to MinIO object storage across the entire application.

---

## 🔍 Files with Upload/View Functionality Found

### 1. **src/pages/Master/Products.tsx**
- **Upload**: Product image (handleImageUpload)
- **Storage**: productImage field (base64)
- **Type**: Image
- **Action**: Migrate to MinIO, store URL in DB

### 2. **src/pages/Finance/Finance.tsx**
- **Upload**: Payment proof (handleFileChange)
- **View**: Surat Jalan, Invoice File (handleViewSuratJalan)
- **Storage**: paymentProof, suratJalan, invoiceFile (base64)
- **Type**: Image/PDF
- **Action**: Migrate to MinIO, store URLs in DB

### 3. **src/pages/Finance/Accounting.tsx**
- **Upload**: Payment proof (handleFileChange)
- **View**: Payment proof, Surat Jalan
- **Storage**: paymentProof (base64)
- **Type**: Image/PDF
- **Action**: Migrate to MinIO, store URLs in DB

### 4. **src/pages/GeneralTrading/SalesOrders.tsx**
- **Upload**: Signature/TTD (handleFileChange)
- **Storage**: Signature as base64
- **Type**: Image
- **Action**: Migrate to MinIO, store URL in DB

### 5. **src/pages/GeneralTrading/Purchasing.tsx**
- **Upload**: Invoice file, Surat Jalan (handleInvoiceFileChange, handleFileChange)
- **Storage**: invoiceFile, suratJalan (base64)
- **Type**: Image/PDF
- **Action**: Migrate to MinIO, store URLs in DB

### 6. **src/pages/GeneralTrading/DeliveryNote.tsx**
- **Upload**: Signed document (handleUploadSignedDocument, handleFileChange)
- **Storage**: signedDocument (base64)
- **Type**: Image/PDF
- **Action**: Migrate to MinIO, store URLs in DB

### 7. **src/pages/Packaging/QAQC.tsx**
- **Upload**: QC files (handleFileChange) - MULTIPLE FILES
- **Storage**: qcFiles (base64 array)
- **Type**: Image/PDF
- **Action**: Migrate to MinIO, store URLs array in DB

### 8. **src/pages/Packaging/Purchasing.tsx**
- **Upload**: Invoice file, Surat Jalan (handleInvoiceFileChange, handleFileChange)
- **Storage**: invoiceFile, suratJalan (base64)
- **Type**: Image/PDF
- **Action**: Migrate to MinIO, store URLs in DB

### 9. **src/pages/Master/Inventory.tsx**
- **Upload**: Stock documentation (handleFileChange)
- **Storage**: stockDocumentation (base64)
- **Type**: Image/PDF
- **Action**: Migrate to MinIO, store URL in DB

### 10. **src/pages/Settings/TestAutomation.tsx**
- **Upload**: Dummy files for testing
- **Storage**: fileBase64
- **Type**: Test data
- **Action**: Update test to use MinIO

---

## 🛠️ Implementation Tasks

### Phase 1: Backend Setup
- [ ] Add minio SDK to docker/package.json
- [ ] Implement blob endpoints in docker/server.js
- [ ] Create file_metadata table in PostgreSQL
- [ ] Add MinIO bucket initialization

### Phase 2: API Client Update
- [ ] Update src/services/api-client.ts blob methods
- [ ] Add proper error handling
- [ ] Add file metadata tracking

### Phase 3: Frontend Migration (Per Page)
- [ ] Products.tsx - Product image
- [ ] Finance.tsx - Payment proof
- [ ] Accounting.tsx - Payment proof
- [ ] SalesOrders.tsx - Signature
- [ ] Purchasing.tsx (GT) - Invoice, Surat Jalan
- [ ] DeliveryNote.tsx - Signed document
- [ ] QAQC.tsx - QC files (multiple)
- [ ] Purchasing.tsx (Packaging) - Invoice, Surat Jalan
- [ ] Inventory.tsx - Stock documentation
- [ ] TestAutomation.tsx - Test files

### Phase 4: Database Schema
- [ ] Add file_metadata table
- [ ] Add file_url columns to relevant tables
- [ ] Migration script for existing base64 data

### Phase 5: Testing
- [ ] Test upload functionality
- [ ] Test download/view functionality
- [ ] Test delete functionality
- [ ] Test cross-device sync

---

## 📊 File Categories

### Product Images (1 file)
- Products.tsx

### Payment Proofs (2 files)
- Finance.tsx
- Accounting.tsx

### Signatures/TTD (1 file)
- SalesOrders.tsx

### Invoice & Surat Jalan (3 files)
- GeneralTrading/Purchasing.tsx
- Packaging/Purchasing.tsx
- Finance.tsx (view only)

### Delivery Documents (1 file)
- DeliveryNote.tsx

### QC Files (1 file - multiple uploads)
- QAQC.tsx

### Stock Documentation (1 file)
- Inventory.tsx

### Test Files (1 file)
- TestAutomation.tsx

---

## 🎯 Total Scope
- **10 Pages** with file handling
- **12 Upload Functions** to migrate
- **Multiple View Functions** to update
- **Estimated 50+ locations** to update in code

