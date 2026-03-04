# Next Actions - MinIO Migration

**Current Status**: 3/10 pages migrated (30%)  
**Build Status**: ✅ Successful  
**Last Updated**: February 10, 2026

---

## Immediate Actions (Today)

### 1. Restart Electron App
```bash
# Kill old Electron process
# Then run:
npm run dev
```

**Why**: Build changes require full app restart to take effect

### 2. Test Inventory Stock Documentation
- Navigate to: Packaging → Master → Inventory
- Click "Add Inventory" button
- Upload a stock documentation file (image or PDF)
- Click "View" button to preview
- Click "Download" to download file
- Verify file displays correctly

### 3. Test Accounting Payment Proof
- Navigate to: Finance → Accounting
- Find an invoice with status "OPEN"
- Click "⋮" menu → "Upload Bukti Transfer"
- Upload payment proof (image or PDF)
- Verify invoice status changes to "CLOSE"
- Click "⋮" menu → "View Bukti Transfer"
- Verify file displays/downloads correctly

### 4. Verify Cross-Device Sync
- Upload file on one device
- Check if it appears on other devices
- Verify file can be downloaded on other devices

---

## Next Session: Finance/Finance.tsx (Medium Complexity)

**Complexity**: ⭐⭐ Medium (3 files)  
**Files to Update**:
- Payment proof
- Surat Jalan (2 locations)

**Estimated Time**: 30-45 minutes

### Steps:
1. Read Finance/Finance.tsx to understand current implementation
2. Find all FileReader instances
3. Replace with BlobService.uploadFile()
4. Update state variables (base64 → fileId)
5. Update display logic
6. Test upload/view/download
7. Build and test in Electron

---

## Session After: GeneralTrading/SalesOrders.tsx (Medium Complexity)

**Complexity**: ⭐⭐ Medium (2 locations)  
**Files to Update**:
- Signature upload (2 locations)

**Estimated Time**: 30-45 minutes

### Steps:
1. Find all signature upload handlers
2. Replace FileReader with BlobService.uploadFile()
3. Update state to store fileIds
4. Update signature display logic
5. Test both upload locations
6. Build and test in Electron

---

## Future Sessions: Remaining Pages

### Session 4: Settings/TestAutomation.tsx (Hard)
- 5+ FileReader instances
- Multiple test scenarios
- Estimated: 45-60 minutes

### Session 5: GeneralTrading/Purchasing.tsx (Hard)
- Invoice + Surat Jalan (2 files)
- Complex save logic
- Estimated: 45-60 minutes

### Session 6: Packaging/Purchasing.tsx (Hard)
- Similar to GT Purchasing
- Estimated: 45-60 minutes

### Session 7: GeneralTrading/DeliveryNote.tsx (Hard)
- Signed document (2 locations)
- Estimated: 45-60 minutes

### Session 8: Packaging/QAQC.tsx (Very Hard)
- Multiple QC files (array handling)
- Most complex migration
- Estimated: 60-90 minutes

---

## Important Reminders

### ✅ DO:
- Always validate files before upload (size, type)
- Store only fileIds, never base64
- Use BlobService for all blob operations
- Test upload/view/download for each page
- Build after each change
- Restart Electron app after build

### ❌ DON'T:
- Store base64 in localStorage or database
- Call ApiClient directly from pages
- Forget to update form state references
- Skip file validation
- Forget to handle errors gracefully

---

## Build & Test Workflow

```bash
# 1. Make code changes
# 2. Build
npm run build

# 3. If build successful, restart Electron
# Kill old process, then:
npm run dev

# 4. Test in Electron app
# 5. Verify cross-device sync
# 6. Commit changes
```

---

## Reference Files

**For Implementation**:
- `src/pages/Master/Products.tsx` - Reference implementation
- `src/services/blob-service.ts` - All blob operations
- `src/services/api-client.ts` - API calls

**For Checklist**:
- `MINIO_PAGES_DETAILED_LIST.md` - Complete page list with line numbers

**For Progress**:
- `MINIO_MIGRATION_PROGRESS_UPDATE.md` - Current status
- `MINIO_MIGRATION_INVENTORY_COMPLETE.md` - Inventory details
- `MINIO_MIGRATION_ACCOUNTING_COMPLETE.md` - Accounting details

---

## Quick Reference: Migration Pattern

```typescript
// 1. Import
import BlobService from '../../services/blob-service';

// 2. Upload
const result = await BlobService.uploadFile(file, 'packaging');
setForm({ ...form, documentationId: result.fileId });

// 3. Display
<img src={BlobService.getDownloadUrl(documentationId, 'packaging')} />

// 4. Download
BlobService.downloadFile(documentationId, 'packaging')

// 5. Delete (optimistic)
setForm({ ...form, documentationId: null });
BlobService.deleteFile(documentationId, 'packaging').catch(...)
```

---

## Progress Tracking

| # | Page | Status | Date |
|---|------|--------|------|
| 1 | Products.tsx | ✅ Complete | Feb 10 |
| 2 | Inventory.tsx | ✅ Complete | Feb 10 |
| 3 | Accounting.tsx | ✅ Complete | Feb 10 |
| 4 | Finance.tsx | ⏳ TODO | - |
| 5 | SalesOrders.tsx | ⏳ TODO | - |
| 6 | TestAutomation.tsx | ⏳ TODO | - |
| 7 | GT Purchasing.tsx | ⏳ TODO | - |
| 8 | Pkg Purchasing.tsx | ⏳ TODO | - |
| 9 | DeliveryNote.tsx | ⏳ TODO | - |
| 10 | QAQC.tsx | ⏳ TODO | - |

---

## Questions?

Refer to:
1. `MINIO_PAGES_DETAILED_LIST.md` - Exact line numbers for each page
2. `src/pages/Master/Products.tsx` - Reference implementation
3. `src/services/blob-service.ts` - Available methods

---

## Success Criteria

✅ All 10 pages migrated to MinIO  
✅ No base64 stored in localStorage or database  
✅ All file operations use BlobService  
✅ Cross-device sync works correctly  
✅ Build is clean with no errors  
✅ All pages tested in Electron app  

---

**Current Progress**: 30% Complete (3/10 pages)  
**Estimated Total Time**: 6-8 hours  
**Estimated Remaining Time**: 4-5 hours
