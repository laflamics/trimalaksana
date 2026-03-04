# Image Preview Fix - Content-Disposition Issue

## Problem
Images were downloading instead of previewing in the modal because the server was sending `Content-Disposition: attachment` header.

## Root Cause
MinIO object storage was including Content-Disposition metadata in the response. The server wasn't explicitly removing it.

## Solution Applied

### 1. Updated `docker/server.js` (Line 352-362)
Added explicit header removal:
```javascript
// Set headers for preview (not download)
res.setHeader('Content-Type', metadata.mime_type);
res.setHeader('Content-Length', metadata.file_size);
res.setHeader('Cache-Control', 'public, max-age=3600');

// CRITICAL: Remove Content-Disposition to allow browser preview
// MinIO might set this, so we explicitly remove it
res.removeHeader('Content-Disposition');
```

### 2. Created `docker/rebuild-server-now.bat`
Script to force rebuild the Docker container with the updated server.js

## Steps to Apply Fix (On PC Utama)

1. **Run the rebuild script:**
   ```bash
   cd D:\trimalaksanaapps\possgresql\docker
   .\rebuild-server-now.bat
   ```

2. **Wait for containers to restart** (about 10-15 seconds)

3. **Verify the fix:**
   - Check the script output for "Content-Type: image/png" WITHOUT "Content-Disposition"
   - Or manually test: `curl -I http://localhost:9999/api/blob/download/packaging/90c0cf4d-a93a-4e91-b11e-3695f1e592e9`

## Steps to Test (On Dev Laptop)

1. **Hard refresh browser:** `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)

2. **Go to Products page**

3. **Upload an image** - it should now:
   - ✅ Upload successfully
   - ✅ Show in the preview modal (not download)
   - ✅ Display inline in the modal

## How It Works

- **Before:** Browser received `Content-Disposition: attachment` → forced download
- **After:** Browser receives only `Content-Type: image/png` → renders inline in modal

The modal uses:
```javascript
<img src={BlobService.getDownloadUrl(previewImageId, 'packaging')} />
```

Which now displays the image instead of triggering a download.

## Files Modified
- `docker/server.js` - Added `res.removeHeader('Content-Disposition')`
- `docker/rebuild-server-now.bat` - Created rebuild script

## Status
✅ Frontend code is ready (Products.tsx has preview modal)
✅ BlobService is configured correctly
✅ CSP headers allow HTTP images
⏳ Waiting for server rebuild on PC Utama
