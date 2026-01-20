# Android Sync Test Checklist

## ✅ Perbaikan yang Sudah Diterapkan

### 1. Android-Compatible Timeout Helper
- **File**: `src/services/storage.ts`
- **Perbaikan**: Menambahkan `createTimeoutSignal()` helper function
- **Masalah**: `AbortSignal.timeout()` mungkin tidak tersedia di Android WebView lama
- **Solusi**: Fallback ke `AbortController` + `setTimeout` jika `AbortSignal.timeout()` tidak tersedia

### 2. ImmediateSync Usage (Fungsi Kritis)
Semua fungsi kritis sudah menggunakan `immediateSync = true`:

#### Packaging Module:
- ✅ Create PTP: `storageService.set('ptp', [...], true)`
- ✅ Update PTP (link SO, close, auto-fulfill): `storageService.set('ptp', [...], true)`
- ✅ Create SPK dari SO: Sudah ada di PPIC
- ✅ Confirm SO: Sudah ada di SalesOrders

#### General Trading Module:
- ✅ Create SPK: `storageService.set('gt_spk', [...], true)`
- ✅ Create PR: `storageService.set('gt_purchaseRequests', [...], true)`
- ✅ Confirm SO: `storageService.set('gt_salesOrders', [...], true)`
- ✅ Create Schedule: `storageService.set('gt_schedule', [...], true)`
- ✅ Upload Signed Document: `storageService.set('gt_delivery', [...], true)`
- ✅ Create Invoice Notification: `storageService.set('gt_invoiceNotifications', [...], true)`
- ✅ Close Payment Notification: `storageService.set('gt_financeNotifications', [...], true)`
- ✅ Clear DB Activity: `storageService.set(key, [], true)` sebelum `remove()`

## 🧪 Test Checklist untuk Android Build

### A. Network & Sync Tests

#### 1. Basic Sync Test
- [ ] **Test 1.1**: Create SO di device A, cek muncul di device B (Android)
- [ ] **Test 1.2**: Confirm SO di device A, cek notifikasi muncul di device B (Android)
- [ ] **Test 1.3**: Create SPK di device A, cek muncul di device B (Android)
- [ ] **Test 1.4**: Create PTP di device A, cek muncul di device B (Android)

#### 2. Critical Operations Test
- [ ] **Test 2.1**: Upload signed document (SJ) di device A, cek bisa dibaca di device B (Android)
- [ ] **Test 2.2**: Close payment notification di device A, cek hilang di device B (Android)
- [ ] **Test 2.3**: Delete data di DB Activity di device A, cek tidak muncul lagi di device B (Android)
- [ ] **Test 2.4**: Create invoice notification di device A, cek muncul di device B (Android)

#### 3. Network Timeout Test
- [ ] **Test 3.1**: Test dengan network lambat (simulasi 3G)
- [ ] **Test 3.2**: Test dengan network terputus sementara (airplane mode on/off)
- [ ] **Test 3.3**: Test dengan server tidak tersedia (cek retry mechanism)
- [ ] **Test 3.4**: Test dengan timeout (pastikan tidak crash, hanya log warning)

#### 4. Concurrent Operations Test
- [ ] **Test 4.1**: Create multiple SO secara bersamaan di device A dan B
- [ ] **Test 4.2**: Update same SO di device A dan B secara bersamaan (conflict resolution)
- [ ] **Test 4.3**: Delete item di device A sementara device B sedang update item yang sama

### B. File Handling Tests (Android)

#### 5. File Upload/Download Test
- [ ] **Test 5.1**: Upload PDF signed document di Android, cek bisa dibaca di desktop
- [ ] **Test 5.2**: Upload image signature di Android, cek bisa dibaca di desktop
- [ ] **Test 5.3**: Download signed document di Android (cek file path handling)
- [ ] **Test 5.4**: Test dengan file besar (>5MB) - pastikan fallback ke base64 jika Electron API tidak tersedia

### C. Storage & Persistence Tests

#### 6. LocalStorage Test
- [ ] **Test 6.1**: Close app di Android, buka lagi - cek data masih ada
- [ ] **Test 6.2**: Clear app data di Android, buka lagi - cek sync dari server
- [ ] **Test 6.3**: Test dengan storage quota penuh (cek error handling)

#### 7. Event Listener Test
- [ ] **Test 7.1**: Update data di device A, cek UI update otomatis di device B (Android)
- [ ] **Test 7.2**: Test `app-storage-changed` event di Android
- [ ] **Test 7.3**: Test debounce mechanism (pastikan tidak terlalu banyak request)

### D. UI & Performance Tests

#### 8. UI Responsiveness Test
- [ ] **Test 8.1**: Test dengan banyak data (1000+ items) - cek tidak lag
- [ ] **Test 8.2**: Test scroll performance di card view dengan banyak data
- [ ] **Test 8.3**: Test filter/search performance dengan banyak data

#### 9. Error Handling Test
- [ ] **Test 9.1**: Test dengan invalid server URL
- [ ] **Test 9.2**: Test dengan server return error (400, 500, etc)
- [ ] **Test 9.3**: Test dengan malformed data dari server
- [ ] **Test 9.4**: Test dengan network timeout - pastikan tidak crash

### E. Business Logic Tests

#### 10. Packaging Module Test
- [ ] **Test 10.1**: Create SO → Confirm → Create SPK → Create PTP → Close PTP (full flow)
- [ ] **Test 10.2**: Test product master linkage di PTP (price, UOM)
- [ ] **Test 10.3**: Test quotation dengan default signature
- [ ] **Test 10.4**: Test customer/supplier dropdown filter di master data

#### 11. General Trading Module Test
- [ ] **Test 11.1**: Create SO → Confirm → Create SPK → Create PR → Create Delivery → Upload Signed Document (full flow)
- [ ] **Test 11.2**: Test payment notification cleanup setelah confirm
- [ ] **Test 11.3**: Test invoice notification creation setelah upload signed document

## 🔍 Debugging Tips untuk Android

### 1. Enable Debug Logs
```typescript
// Di storage.ts, set DEBUG = true
private DEBUG = true;
```

### 2. Check Console Logs
- Buka Chrome DevTools via `chrome://inspect` untuk Android WebView
- Cek network tab untuk melihat API calls
- Cek console untuk error messages

### 3. Common Issues & Solutions

#### Issue: Data tidak sync ke server
- **Cek**: Apakah `storage_config` di localStorage sudah set ke `server` mode?
- **Cek**: Apakah `serverUrl` sudah benar?
- **Cek**: Apakah network connection aktif?
- **Cek**: Apakah `immediateSync = true` sudah digunakan?

#### Issue: Timeout errors
- **Cek**: Apakah `createTimeoutSignal()` sudah digunakan (bukan `AbortSignal.timeout()` langsung)?
- **Cek**: Apakah timeout value terlalu kecil untuk network lambat?
- **Cek**: Apakah retry mechanism bekerja?

#### Issue: File tidak bisa di-load
- **Cek**: Apakah file disimpan sebagai path (Electron) atau base64 (mobile)?
- **Cek**: Apakah `isMobile()` atau `isCapacitor()` check sudah benar?
- **Cek**: Apakah fallback ke base64 sudah bekerja?

## 📝 Notes

- Semua fungsi kritis sudah menggunakan `immediateSync = true`
- Timeout helper sudah kompatibel dengan Android WebView
- File handling sudah ada fallback untuk mobile
- Retry mechanism sudah ada untuk network errors
- Event listeners sudah ada untuk real-time UI updates

## ⚠️ Known Limitations

1. **File Paths**: Android tidak punya Electron API, jadi file paths akan berbeda. PDF besar akan disimpan sebagai base64 jika < 5MB.
2. **Network Timeout**: Android mungkin punya network yang lebih lambat, timeout value bisa disesuaikan jika perlu.
3. **Storage Quota**: Android WebView punya storage quota limit, pastikan tidak terlalu banyak data di localStorage.
