# ANALISA MASALAH: GT PPIC SO HILANG SETELAH CREATE SPK

## 🔍 FLOW YANG TERJADI

### 1. User Confirm SO di SalesOrders
- `handleConfirmSO()` dipanggil
- Update SO dengan flag `ppicNotified: true`
- Save ke storage: `await storageService.set('gt_salesOrders', updated)`
- Update state: `setOrders(updated)`
- ✅ SO muncul di PPIC table list (confirmedSOsPending)

### 2. User Create SPK dari SO
- `handleCreateSPKFromSO()` dipanggil
- Line 1032: `setSpkData(updatedSPKs)` - update state langsung
- Line 1035: `await storageService.set('gt_spk', updatedSPKs)` - save ke storage
- ✅ SPK berhasil dibuat

### 3. Event Listener Trigger loadData()
- `storageService.set('gt_spk', ...)` trigger event `app-storage-changed` dengan key `general-trading/gt_spk`
- Event listener (line 332-358) detect perubahan `gt_spk`
- Event listener trigger `loadData()` setelah 300ms debounce
- ⚠️ **MASALAH MULAI DI SINI**

### 4. loadData() Reload Data
- Line 394: `const spkRaw = loadFromLocalStorage('gt_spk')` - reload SPK dari localStorage
- Line 398: `let salesOrdersDataRaw = loadFromLocalStorage('gt_salesOrders')` - reload SO dari localStorage
- Line 453: `let salesOrdersData = filterActiveItems(...)` - filter SO
- Line 459-480: Preserve flag logic - merge `ppicNotified` dari state yang sudah ada
- Line 483: `setSalesOrders(salesOrdersData)` - update state
- Line 520: `setSpkData(filterActiveItems(spk))` - update SPK state

### 5. confirmedSOsPending Recalculate
- Line 283-291: `confirmedSOsPending` di-calculate ulang
- Filter: `if (!so || !so.ppicNotified) return false;` - cek flag
- Filter: `const hasSPK = safeSpkData.some((spk: any) => spk && spk.soNo === so.soNo);` - cek SPK
- Return: `return !hasSPK;` - return true jika belum ada SPK

## 🐛 KEMUNGKINAN MASALAH

### Masalah 1: Race Condition di localStorage
- Setelah `storageService.set('gt_spk', updatedSPKs)`, localStorage mungkin belum ter-update
- Event listener trigger `loadData()` terlalu cepat (300ms debounce)
- `loadFromLocalStorage('gt_spk')` mungkin masih return data lama (belum ada SPK baru)
- Hasil: `hasSPK` masih `false`, SO masih muncul di `confirmedSOsPending`

### Masalah 2: Preserve Flag Logic Tidak Cukup
- Preserve flag logic hanya preserve `ppicNotified` flag
- Tapi tidak preserve `spkData` state
- Setelah `loadData()` reload `spkData` dari localStorage, mungkin SPK baru belum ada
- Hasil: `hasSPK` masih `false`, SO masih muncul di `confirmedSOsPending`

### Masalah 3: Event Listener Trigger Multiple Times
- `storageService.set('gt_spk', ...)` trigger event
- Event listener trigger `loadData()`
- `loadData()` mungkin trigger event lagi (jika ada perubahan lain)
- Hasil: Loop render, SO hilang dan muncul lagi

### Masalah 4: Timing Issue
- `setSpkData(updatedSPKs)` update state langsung
- Tapi `loadData()` reload dari localStorage yang mungkin belum ter-update
- Hasil: State dan localStorage tidak sync

## 🔧 SOLUSI YANG SUDAH DICOBA

1. ✅ Preserve flag logic - preserve `ppicNotified` flag saat reload
2. ✅ Guard untuk prevent loop - tambah `isLoading` flag
3. ❌ Masih belum fix - masalah masih terjadi

## 💡 SOLUSI YANG PERLU DICOBA

### Solusi 1: Jangan Trigger loadData() Setelah Create SPK
- Setelah create SPK, jangan trigger event listener
- Atau skip event listener jika perubahan berasal dari component yang sama
- Contoh: Tambah flag `skipReload` di event detail

### Solusi 2: Preserve SPK Data Juga
- Saat `loadData()` reload, preserve SPK data dari state yang sudah ada
- Sama seperti preserve flag logic untuk SO
- Pastikan SPK baru tidak hilang saat reload

### Solusi 3: Gunakan State yang Sudah Update
- Jangan reload `spkData` dari localStorage setelah create SPK
- Gunakan state yang sudah di-update (`setSpkData(updatedSPKs)`)
- Hanya reload jika benar-benar perlu (misalnya dari device lain)

### Solusi 4: Delay Event Listener
- Tambah delay lebih lama (misalnya 500ms atau 1000ms)
- Atau skip event listener untuk perubahan lokal (hanya listen perubahan dari device lain)

## 📊 PERBANDINGAN DENGAN PACKAGING

### Packaging:
- Line 8715: `await storageService.set('spk', updatedSPKs)` - save ke storage
- Tidak ada `setSpkData` setelah save (mungkin di tempat lain)
- Event listener trigger `loadData()` juga
- Tapi tidak ada masalah yang sama

### Perbedaan:
- Packaging mungkin tidak trigger event listener untuk perubahan lokal
- Atau Packaging handle preserve flag dengan cara yang berbeda
- Atau Packaging tidak reload `spkData` dari localStorage setelah create SPK

## 🎯 REKOMENDASI

1. **Cek apakah Packaging juga punya masalah yang sama**
2. **Cek apakah event listener perlu di-trigger untuk perubahan lokal**
3. **Cek apakah preserve SPK data juga perlu dilakukan**
4. **Cek apakah timing issue bisa di-fix dengan delay atau skip logic**
