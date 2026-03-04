# MinIO Quick Reference - Frontend Implementation

## 🚀 Quick Start

### Import BlobService
```typescript
import BlobService from '../../services/blob-service';
```

### Upload File
```typescript
const handleFileUpload = async (file: File) => {
  try {
    // Validate
    const validation = BlobService.validateFile(file, 50, ['image/*', 'application/pdf']);
    if (!validation.valid) {
      showAlert(validation.error, 'Error');
      return;
    }
    
    // Upload
    const result = await BlobService.uploadFile(file, 'packaging');
    
    // Store fileId (not base64)
    setFormData({ ...formData, documentId: result.fileId });
    showAlert('File uploaded successfully', 'Success');
  } catch (error: any) {
    showAlert(`Upload failed: ${error.message}`, 'Error');
  }
};
```

### Display File
```typescript
// For images
<img src={BlobService.getDownloadUrl(documentId, 'packaging')} alt="Document" />

// For PDFs
<iframe src={BlobService.getDownloadUrl(documentId, 'packaging')} />

// For download button
<Button onClick={() => BlobService.downloadFile(documentId, 'document.pdf', 'packaging')}>
  Download
</Button>

// For view button
<Button onClick={() => BlobService.openFile(documentId, 'packaging')}>
  View
</Button>
```

### Delete File
```typescript
const handleDeleteFile = async (fileId: string) => {
  try {
    await BlobService.deleteFile(fileId, 'packaging');
    setFormData({ ...formData, documentId: null });
    showAlert('File deleted successfully', 'Success');
  } catch (error: any) {
    showAlert(`Delete failed: ${error.message}`, 'Error');
  }
};
```

### List Files
```typescript
const loadFiles = async () => {
  try {
    const files = await BlobService.listFiles('packaging');
    console.log('Files:', files);
  } catch (error: any) {
    showAlert(`Failed to load files: ${error.message}`, 'Error');
  }
};
```

---

## 📝 Common Patterns

### Pattern 1: Single File Upload (Products, Finance, etc.)
```typescript
// State
const [documentId, setDocumentId] = useState<string | null>(null);

// Upload handler
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  try {
    const result = await BlobService.uploadFile(file, 'packaging');
    setDocumentId(result.fileId);
  } catch (error: any) {
    showAlert(`Upload failed: ${error.message}`, 'Error');
  }
};

// Display
<img src={BlobService.getDownloadUrl(documentId, 'packaging')} />

// Save to DB
await storageService.set('products', {
  ...product,
  imageId: documentId  // Store fileId, not base64
});
```

### Pattern 2: Multiple File Upload (QAQC)
```typescript
// State
const [fileIds, setFileIds] = useState<string[]>([]);

// Upload handler
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  
  try {
    const uploadedIds: string[] = [];
    for (const file of files) {
      const result = await BlobService.uploadFile(file, 'packaging');
      uploadedIds.push(result.fileId);
    }
    setFileIds([...fileIds, ...uploadedIds]);
  } catch (error: any) {
    showAlert(`Upload failed: ${error.message}`, 'Error');
  }
};

// Display
{fileIds.map(fileId => (
  <img key={fileId} src={BlobService.getDownloadUrl(fileId, 'packaging')} />
))}

// Save to DB
await storageService.set('qcFiles', {
  ...qcData,
  fileIds: fileIds  // Store array of fileIds
});
```

### Pattern 3: File with Preview
```typescript
// State
const [file, setFile] = useState<File | null>(null);
const [preview, setPreview] = useState<string | null>(null);
const [fileId, setFileId] = useState<string | null>(null);

// Handle file selection
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const selectedFile = e.target.files?.[0];
  if (!selectedFile) return;
  
  setFile(selectedFile);
  
  // Show preview
  const dataUrl = await BlobService.fileToDataUrl(selectedFile);
  setPreview(dataUrl);
};

// Upload on save
const handleSave = async () => {
  if (!file) return;
  
  try {
    const result = await BlobService.uploadFile(file, 'packaging');
    setFileId(result.fileId);
    setFile(null);
    setPreview(null);
  } catch (error: any) {
    showAlert(`Upload failed: ${error.message}`, 'Error');
  }
};

// Display
{preview && <img src={preview} alt="Preview" />}
{fileId && <img src={BlobService.getDownloadUrl(fileId, 'packaging')} alt="Uploaded" />}
```

---

## 🎯 Business Context

Use correct business context when uploading:
- `'packaging'` - Packaging module
- `'general-trading'` - General Trading module
- `'trucking'` - Trucking module

```typescript
// Packaging
await BlobService.uploadFile(file, 'packaging');

// General Trading
await BlobService.uploadFile(file, 'general-trading');

// Trucking
await BlobService.uploadFile(file, 'trucking');
```

---

## 🔍 File Validation

```typescript
// Default validation (50MB, images and PDFs)
const validation = BlobService.validateFile(file);

// Custom validation
const validation = BlobService.validateFile(
  file,
  100,  // Max 100MB
  ['image/jpeg', 'image/png', 'application/pdf']  // Only these types
);

if (!validation.valid) {
  console.error(validation.error);
}
```

---

## 📊 Data Structure Changes

### Before (Base64)
```typescript
interface Product {
  id: string;
  name: string;
  productImage: string;  // Base64 string (large!)
}
```

### After (MinIO)
```typescript
interface Product {
  id: string;
  name: string;
  productImageId: string;  // FileId (small!)
}

// Display
<img src={BlobService.getDownloadUrl(product.productImageId, 'packaging')} />
```

---

## 🐛 Error Handling

```typescript
try {
  const result = await BlobService.uploadFile(file, 'packaging');
} catch (error: any) {
  if (error.message.includes('exceeds')) {
    // File too large
    showAlert('File is too large', 'Error');
  } else if (error.message.includes('not allowed')) {
    // Invalid file type
    showAlert('Invalid file type', 'Error');
  } else {
    // Network or server error
    showAlert(`Upload failed: ${error.message}`, 'Error');
  }
}
```

---

## 🔗 API Endpoints

```
POST   /api/blob/upload?business=packaging
       Body: FormData with 'file' field
       Response: { fileId, fileName, fileSize, mimeType, url }

GET    /api/blob/download/packaging/:fileId
       Returns: File blob

DELETE /api/blob/delete/packaging/:fileId
       Response: { success: true }

GET    /api/blob/list/packaging
       Response: { files: [...], count: N }

GET    /api/blob/metadata/:fileId
       Response: { file_id, file_name, file_size, ... }
```

---

## 📋 Checklist for Each Page

- [ ] Import BlobService
- [ ] Replace FileReader with BlobService.uploadFile()
- [ ] Change state from base64 to fileId
- [ ] Update display to use BlobService.getDownloadUrl()
- [ ] Update save logic to store fileId instead of base64
- [ ] Update delete logic to use BlobService.deleteFile()
- [ ] Test upload
- [ ] Test display
- [ ] Test delete
- [ ] Test cross-device sync

