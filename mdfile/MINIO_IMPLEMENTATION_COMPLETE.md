# MinIO Implementation - Backend Complete ✅

## 🎯 What's Done

### 1. **Backend Setup** ✅
- ✅ Added `minio` and `uuid` to docker/package.json
- ✅ Updated docker/server.js with:
  - MinIO client initialization
  - Multer for file upload handling
  - Bucket initialization on startup
  - 5 new blob endpoints

### 2. **New Blob Endpoints** ✅
```
POST   /api/blob/upload              - Upload file to MinIO
GET    /api/blob/download/:business/:fileId - Download file
DELETE /api/blob/delete/:business/:fileId   - Delete file
GET    /api/blob/list/:business      - List files in bucket
GET    /api/blob/metadata/:fileId    - Get file metadata
```

### 3. **Database** ✅
- ✅ `blob_storage_metadata` table already exists in init-db.sql
- Tracks: file_id, file_name, file_size, mime_type, bucket_name, object_key, uploaded_at

### 4. **API Client** ✅
- ✅ Updated src/services/api-client.ts with proper blob methods
- ✅ Created src/services/blob-service.ts - helper service for frontend

### 5. **Blob Service Features** ✅
- uploadFile() - Upload with validation
- getDownloadUrl() - Get MinIO URL
- deleteFile() - Delete from MinIO
- getMetadata() - Get file info
- listFiles() - List all files
- fileToDataUrl() - Preview before upload
- validateFile() - Validate before upload
- downloadFile() - Download to local
- openFile() - Open in new tab

---

## 📋 Frontend Migration - TODO

### Pages to Update (10 total)

#### 1. **src/pages/Master/Products.tsx**
- [ ] Replace `handleImageUpload()` to use BlobService
- [ ] Store `productImage` as fileId instead of base64
- [ ] Update image display to use MinIO URL

#### 2. **src/pages/Finance/Finance.tsx**
- [ ] Replace `handleFileChange()` for payment proof
- [ ] Update `handleViewSuratJalan()` to use MinIO URL
- [ ] Store fileIds instead of base64

#### 3. **src/pages/Finance/Accounting.tsx**
- [ ] Replace `handleFileChange()` for payment proof
- [ ] Update payment proof display
- [ ] Store fileIds instead of base64

#### 4. **src/pages/GeneralTrading/SalesOrders.tsx**
- [ ] Replace signature upload to use BlobService
- [ ] Store signature as fileId
- [ ] Update signature display

#### 5. **src/pages/GeneralTrading/Purchasing.tsx**
- [ ] Replace `handleInvoiceFileChange()` to use BlobService
- [ ] Replace `handleFileChange()` for surat jalan
- [ ] Store invoiceFile and suratJalan as fileIds
- [ ] Update file display logic

#### 6. **src/pages/GeneralTrading/DeliveryNote.tsx**
- [ ] Replace `handleUploadSignedDocument()` to use BlobService
- [ ] Store signedDocument as fileId
- [ ] Update document display

#### 7. **src/pages/Packaging/QAQC.tsx**
- [ ] Replace `handleFileChange()` for multiple QC files
- [ ] Store qcFiles as array of fileIds
- [ ] Update file display for multiple files

#### 8. **src/pages/Packaging/Purchasing.tsx**
- [ ] Replace `handleInvoiceFileChange()` to use BlobService
- [ ] Replace `handleFileChange()` for surat jalan
- [ ] Store invoiceFile and suratJalan as fileIds
- [ ] Update file display logic

#### 9. **src/pages/Master/Inventory.tsx**
- [ ] Replace `handleFileChange()` for stock documentation
- [ ] Store stockDocumentation as fileId
- [ ] Update document display

#### 10. **src/pages/Settings/TestAutomation.tsx**
- [ ] Update test to use BlobService instead of base64

---

## 🔄 Migration Pattern

### Before (Base64):
```typescript
const handleImageUpload = async (file: File) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target?.result as string;
    setFormData({ ...formData, productImage: base64 });
  };
  reader.readAsDataURL(file);
};
```

### After (MinIO):
```typescript
import BlobService from '../../services/blob-service';

const handleImageUpload = async (file: File) => {
  try {
    const validation = BlobService.validateFile(file);
    if (!validation.valid) {
      showAlert(validation.error, 'Error');
      return;
    }
    
    const result = await BlobService.uploadFile(file, 'packaging');
    setFormData({ ...formData, productImage: result.fileId });
    showAlert('Image uploaded successfully', 'Success');
  } catch (error: any) {
    showAlert(`Upload failed: ${error.message}`, 'Error');
  }
};
```

### Display Before (Base64):
```typescript
<img src={productImage} alt="Product" />
```

### Display After (MinIO):
```typescript
<img src={BlobService.getDownloadUrl(productImage, 'packaging')} alt="Product" />
```

---

## 🚀 Next Steps

1. **Test Backend**
   - Run docker-compose up
   - Check health endpoint: http://localhost:9999/health
   - Verify MinIO console: http://localhost:9001

2. **Migrate Frontend** (one page at a time)
   - Start with Products.tsx (simplest - single image)
   - Then Finance pages
   - Then Purchasing pages
   - Then QAQC (most complex - multiple files)

3. **Data Migration**
   - Create migration script to convert existing base64 to MinIO
   - Or keep base64 as fallback for old data

4. **Testing**
   - Test upload/download for each page
   - Test cross-device sync
   - Test file deletion
   - Test file listing

---

## 📊 File Upload Locations Summary

| Page | Field | Type | Count |
|------|-------|------|-------|
| Products | productImage | Image | 1 |
| Finance | paymentProof | Image/PDF | 1 |
| Accounting | paymentProof | Image/PDF | 1 |
| SalesOrders | signature | Image | 1 |
| GT Purchasing | invoiceFile, suratJalan | Image/PDF | 2 |
| DeliveryNote | signedDocument | Image/PDF | 1 |
| QAQC | qcFiles | Image/PDF | Multiple |
| Pkg Purchasing | invoiceFile, suratJalan | Image/PDF | 2 |
| Inventory | stockDocumentation | Image/PDF | 1 |
| TestAutomation | testFiles | Various | Multiple |

**Total: 13 file fields across 10 pages**

---

## 🔧 Configuration

### MinIO Credentials (from docker-compose.yml)
- Endpoint: http://minio:9000
- Access Key: minioadmin
- Secret Key: minioadmin123
- Buckets: packaging, general-trading, trucking

### API Endpoints
- Upload: POST /api/blob/upload?business=packaging
- Download: GET /api/blob/download/packaging/:fileId
- Delete: DELETE /api/blob/delete/packaging/:fileId
- List: GET /api/blob/list/packaging

---

## ✅ Checklist for Frontend Migration

- [ ] Update Products.tsx
- [ ] Update Finance.tsx
- [ ] Update Accounting.tsx
- [ ] Update SalesOrders.tsx
- [ ] Update GT Purchasing.tsx
- [ ] Update DeliveryNote.tsx
- [ ] Update QAQC.tsx
- [ ] Update Pkg Purchasing.tsx
- [ ] Update Inventory.tsx
- [ ] Update TestAutomation.tsx
- [ ] Test all uploads
- [ ] Test all downloads
- [ ] Test file deletion
- [ ] Test cross-device sync
- [ ] Create data migration script

