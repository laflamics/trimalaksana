# 📋 ANALISA SKENARIO LAPANGAN - Flow SO → PPIC → PO → Production → QC → DN

## 🎯 RINGKASAN
Dokumen ini menganalisa semua kemungkinan skenario yang bisa terjadi di lapangan dari flow lengkap: Sales Order → PPIC → Purchase Order → Production → QC → Delivery Note.

### Catatan Status
- Sales Order sekarang hanya punya status **OPEN** dan **CLOSE**.
- Opsi **DRAFT** dan **VOID** dihilangkan. Jika SO ingin dibatalkan sebelum dipakai, lakukan **delete** langsung.
- Setelah ada turunan (SPK/PO/Production), SO harus ditutup (CLOSE) via workflow normal.

---

## 📊 FLOW NORMAL (HAPPY PATH)

### ✅ Skenario 1: Flow Normal Lengkap
1. **SO** → OPEN (auto saat create) → CLOSE (setelah workflow selesai)
2. **PPIC** → Create SPK dari SO → Status OPEN
3. **PPIC** → Create PR untuk material yang kurang
4. **Purchasing** → Create PO dari PR → Status DRAFT → OPEN (Approved)
5. **Purchasing** → Create GRN dari PO → Material masuk inventory
6. **Production** → Start Production → Submit Result (qty < target)
7. **Production** → Submit Result lagi (qty = target) → Status CLOSE
8. **QC** → QC Check → Status PASS
9. **Delivery** → Create DN dari QC PASS → Status DELIVERED
10. **Invoice** → Create Invoice dari DN
11. **Payment** → Payment received

**Status Akhir:**
- SO: CLOSE
- SPK: CLOSE
- PO: CLOSE
- Production: CLOSE
- QC: CLOSE
- DN: DELIVERED

---

## ⚠️ SKENARIO YANG PERLU DITANGANI

### 🔴 KATEGORI 1: MULTIPLE ORDERS/PRODUCTS/MATERIALS

#### Skenario 1.1: Multiple SO dengan Product Sama
- **Kondisi:** Ada 2 SO berbeda dengan product yang sama
- **Masalah Potensial:**
  - Stock product (finished goods) harus cukup untuk semua SO
  - Material harus cukup untuk semua SPK
  - PR harus menghitung total kebutuhan semua SPK aktif
- **Status:** ✅ Sudah ditangani (perbaikan sebelumnya)

#### Skenario 1.2: Multiple SPK dengan Product Sama
- **Kondisi:** 1 SO punya multiple SPK dengan product yang sama
- **Masalah Potensial:**
  - Stock product harus cukup untuk semua SPK
  - Material harus cukup untuk semua SPK
  - Progress tracking per SPK harus benar
- **Status:** ✅ Sudah ditangani (perbaikan sebelumnya)

#### Skenario 1.3: Multiple Products dengan Material Sama
- **Kondisi:** 3 products berbeda menggunakan material yang sama
- **Masalah Potensial:**
  - Stock material harus cukup untuk semua products
  - PR harus menghitung total kebutuhan material dari semua products
  - Alokasi stock harus benar saat create PR
- **Status:** ✅ Sudah ditangani (perbaikan sebelumnya)

#### Skenario 1.4: Multiple PO dengan Material Sama
- **Kondisi:** Ada PO lain dengan product yang sama dan material sama
- **Masalah Potensial:**
  - Material hanya bisa handle 1 product, tapi ada PO lain
  - Stock check harus mempertimbangkan PO yang sudah dibuat tapi belum GRN
  - Material lain yang stock-nya ada tidak perlu PR
- **Status:** ✅ Sudah ditangani (perbaikan sebelumnya)

---

### 🔴 KATEGORI 2: STOCK & INVENTORY ISSUES

#### Skenario 2.1: Stock Product Cukup, Tidak Perlu Material
- **Kondisi:** Product (finished goods) sudah ada di inventory dengan stock cukup
- **Masalah Potensial:**
  - Sistem harus cek stock product sebelum create PR
  - Jika stock cukup, tidak perlu beli material
  - Tapi harus cek total kebutuhan semua SPK aktif
- **Status:** ✅ Sudah ditangani (perbaikan sebelumnya)

#### Skenario 2.2: Stock Material Cukup, Tanya Pakai Stock
- **Kondisi:** Ada material yang stock-nya cukup saat create PR
- **Masalah Potensial:**
  - Sistem harus tanya apakah mau pakai stock yang ada
  - Jika Ya, stock dialokasikan untuk SPK ini
  - Material lain yang kurang tetap dibuatkan PR
  - Stock yang sudah dialokasikan tidak bisa digunakan SPK lain
- **Status:** ✅ Sudah ditangani (perbaikan sebelumnya)

#### Skenario 2.3: Stock Material Tidak Cukup untuk Semua SPK
- **Kondisi:** Stock material hanya cukup untuk 1 SPK, tapi ada 3 SPK yang butuh
- **Masalah Potensial:**
  - Sistem harus hitung total kebutuhan semua SPK aktif
  - Jika stock tidak cukup, semua SPK harus buat PR
  - Tidak boleh ada SPK yang bilang "stock cukup" padahal tidak cukup untuk semua
- **Status:** ✅ Sudah ditangani (perbaikan sebelumnya)

#### Skenario 2.4: Stock Material Cukup Tapi Dialokasikan untuk SPK Lain
- **Kondisi:** Material sudah dialokasikan untuk SPK A, SPK B juga butuh material yang sama
- **Masalah Potensial:**
  - SPK B harus buat PR karena stock sudah dialokasikan
  - Sistem harus track material yang sudah dialokasikan (allocatedSPKs)
- **Status:** ✅ Sudah ditangani (perbaikan sebelumnya)

#### Skenario 2.5: Material Sudah Dialokasikan, Production Submit
- **Kondisi:** Material sudah dialokasikan saat create PR, kemudian production submit
- **Masalah Potensial:**
  - Tidak boleh double count material (outgoing sudah di-update saat alokasi)
  - Sistem harus cek allocatedSPKs sebelum update outgoing lagi
- **Status:** ✅ Sudah ditangani (perbaikan sebelumnya)

---

### 🔴 KATEGORI 3: PRODUCTION ISSUES

#### Skenario 3.1: Progress Melebihi Target
- **Kondisi:** User input qtyProduced yang membuat progress > target
- **Masalah Potensial:**
  - Progress tidak boleh melebihi target secara signifikan
  - Sistem harus validasi qtyProduced sebelum submit
  - Progress harus di-cap di target (dengan tolerance)
- **Status:** ✅ Sudah ditangani (perbaikan sebelumnya)

#### Skenario 3.2: Stock Material Tidak Cukup untuk Production
- **Kondisi:** User input qtyProduced, tapi stock material tidak cukup
- **Masalah Potensial:**
  - Sistem harus validasi stock material sebelum submit
  - Jika tidak cukup, submit harus dibatalkan
  - User harus tahu material mana yang kurang
- **Status:** ✅ Sudah ditangani (perbaikan sebelumnya)

#### Skenario 3.3: Partial Production (Multiple Submit)
- **Kondisi:** Production submit beberapa kali (partial)
- **Masalah Potensial:**
  - Progress harus di-akumulasi dengan benar (prevProgress + qtyProduced)
  - Material usage harus di-akumulasi dengan benar
  - Tidak boleh double count material (cek allocatedSPKs dan processedPOs)
- **Solusi:**
  - Progress di-akumulasi di `handleSaveProductionResult` (line 1679)
  - Material usage di-aggregate dari productionResults per SO
  - Anti-duplicate: cek allocatedSPKs dan processedPOs sebelum update outgoing
- **Status:** ✅ Sudah ditangani (anti-duplicate sudah ada di updateInventoryFromProduction)

#### Skenario 3.4: Production Submit dengan Material dari Stock
- **Kondisi:** Material sudah dialokasikan dari stock saat create PR
- **Masalah Potensial:**
  - Material usage harus dihitung dengan benar
  - Tidak boleh double count (outgoing sudah di-update saat alokasi)
- **Status:** ✅ Sudah ditangani (perbaikan sebelumnya)

---

### 🔴 KATEGORI 4: PO & GRN ISSUES

#### Skenario 4.1: PO Dibuat Tapi Belum GRN
- **Kondisi:** PO sudah dibuat tapi material belum diterima (belum GRN)
- **Masalah Potensial:**
  - Material belum tersedia untuk production
  - Stock check harus mempertimbangkan PO yang sudah dibuat tapi belum GRN
  - Production tidak bisa start sampai material diterima
- **Solusi:**
  - Di Production.tsx: cek `relatedPO` untuk set materialStatus ke 'PO_CREATED' (line 408-419)
  - Production hanya bisa start jika materialStatus = 'RECEIVED' atau 'STOCK_READY'
  - PO yang sudah dibuat tapi belum GRN tidak dihitung sebagai available stock
- **Status:** ✅ Sudah ditangani (materialStatus check di Production.tsx)

#### Skenario 4.2: GRN Partial (Qty Diterima < Qty PO)
- **Kondisi:** Material diterima sebagian (misal PO 1000, GRN 800)
- **Masalah Potensial:**
  - Inventory harus update dengan qty yang benar
  - PO status harus tetap OPEN sampai semua material diterima
  - Production bisa start dengan material yang sudah diterima
- **Solusi:**
  - Di `handleSaveReceipt`: cek total qtyReceived dari semua GRN untuk PO ini
  - Validasi qtyReceived tidak boleh melebihi remaining qty (item.qty - totalQtyReceived)
  - Inventory update dengan qty yang benar (anti-duplicate dengan processedGRNs)
- **Status:** ✅ Sudah ditangani (validasi di Purchasing.tsx line 444-461)

#### Skenario 4.3: Multiple GRN untuk 1 PO
- **Kondisi:** Material diterima beberapa kali untuk 1 PO
- **Masalah Potensial:**
  - Inventory harus update dengan benar (tidak double count)
  - PO harus close setelah semua material diterima
- **Solusi:**
  - Tracking total qtyReceived dari semua GRN untuk PO yang sama
  - Validasi qtyReceived tidak boleh melebihi remaining qty
  - Anti-duplicate di Inventory.tsx dengan processedGRNs array
- **Status:** ✅ Sudah ditangani (validasi + anti-duplicate di Purchasing.tsx dan Inventory.tsx)

#### Skenario 4.4: GRN untuk Multiple PO
- **Kondisi:** 1 GRN untuk multiple PO (material dari supplier yang sama)
- **Masalah Potensial:**
  - Inventory harus update dengan benar
  - PO tracking harus benar
- **Status:** ⚠️ Perlu dicek

---

### 🔴 KATEGORI 5: QC ISSUES

#### Skenario 5.1: QC FAIL
- **Kondisi:** Production result di-QC dan hasilnya FAIL
- **Masalah Potensial:**
  - Production harus bisa submit result lagi
  - Material yang sudah digunakan harus di-handle dengan benar
  - Progress harus di-reset atau di-adjust
- **Solusi:**
  - Di `handleSaveQCCheck`: jika QC FAIL, reset production status dari CLOSE ke OPEN
  - Reset schedule status juga ke OPEN
  - Production bisa submit result lagi untuk memperbaiki produk yang gagal QC
  - Material yang sudah digunakan tetap terpakai (tidak di-return)
- **Status:** ✅ Sudah ditangani (QC FAIL handling di QAQC.tsx line 130-163)

#### Skenario 5.2: QC PASS Partial
- **Kondisi:** Production result sebagian PASS, sebagian FAIL
- **Masalah Potensial:**
  - Delivery hanya untuk qty yang PASS
  - Production harus bisa submit result lagi untuk qty yang FAIL
- **Solusi:**
  - QC Result bisa PARTIAL dengan qtyPassed dan qtyFailed
  - Inventory update hanya untuk qty yang PASS
  - Production status di-reset ke OPEN untuk qty yang FAIL (bisa submit lagi)
  - Delivery hanya bisa dibuat dari qtyPassed
- **Status:** ✅ Sudah ditangani (QC PARTIAL handling di Packaging/QAQC.tsx line 166-211)

#### Skenario 5.3: QC PASS Tapi Qty < Target
- **Kondisi:** Production result PASS tapi qty < target
- **Masalah Potensial:**
  - Delivery hanya untuk qty yang PASS
  - Production harus bisa submit result lagi untuk sisa target
- **Solusi:**
  - Production bisa submit result lagi jika progress < target
  - Progress di-akumulasi dengan benar
  - Delivery hanya untuk qty yang sudah PASS QC
- **Status:** ✅ Sudah ditangani (partial production sudah ditangani di Skenario 3.3)

---

### 🔴 KATEGORI 6: DELIVERY ISSUES

#### Skenario 6.1: Partial Delivery
- **Kondisi:** Delivery sebagian (misal QC PASS 1000, delivery 800)
- **Masalah Potensial:**
  - Inventory finished goods harus update dengan benar
  - Delivery status harus track qty yang sudah dikirim
- **Solusi:**
  - Tracking total qty yang sudah di-deliver untuk QC ini
  - Validasi qty delivery tidak boleh melebihi remaining qty (availableQty - totalDelivered)
  - Available qty = qtyPassed dari QC (jika PARTIAL) atau qty total (jika PASS)
- **Status:** ✅ Sudah ditangani (partial delivery handling di DeliveryNote.tsx line 744-757)

#### Skenario 6.2: Multiple Delivery untuk 1 QC
- **Kondisi:** 1 QC result di-delivery beberapa kali
- **Masalah Potensial:**
  - Inventory tidak boleh double count
  - Delivery tracking harus benar
- **Solusi:**
  - Tracking total qty yang sudah di-deliver per SO dan product
  - Validasi qty delivery tidak boleh melebihi remaining qty
  - Inventory update dengan qty yang benar (tidak double count)
- **Status:** ✅ Sudah ditangani (tracking + validasi di DeliveryNote.tsx)

#### Skenario 6.3: Delivery Sebelum QC
- **Kondisi:** Delivery dibuat sebelum QC (tidak seharusnya)
- **Masalah Potensial:**
  - Sistem harus prevent delivery sebelum QC PASS
- **Solusi:**
  - Validasi di `handleSave`: cek QC status harus PASS/PARTIAL dan CLOSE
  - Jika QC belum PASS/PARTIAL atau belum CLOSE, delivery tidak bisa dibuat
- **Status:** ✅ Sudah ditangani (validasi di DeliveryNote.tsx line 730-742)

---

### 🔴 KATEGORI 7: CANCELLATION & VOID

#### Skenario 7.1: SO Dibatalkan (VOID)
- **Kondisi:** SO sudah OPEN tapi dibatalkan (VOID)
- **Masalah Potensial:**
  - SPK yang sudah dibuat harus di-handle
  - PO yang sudah dibuat harus di-handle
  - Material yang sudah dialokasikan harus di-release
- **Status:** ⚠️ Perlu dicek

#### Skenario 7.2: SPK Dibatalkan
- **Kondisi:** SPK sudah dibuat tapi dibatalkan
- **Masalah Potensial:**
  - Material yang sudah dialokasikan harus di-release
  - PO yang sudah dibuat harus di-handle
  - Production yang sudah start harus di-handle
- **Status:** ⚠️ Perlu dicek

#### Skenario 7.3: PO Dibatalkan
- **Kondisi:** PO sudah dibuat tapi dibatalkan
- **Masalah Potensial:**
  - PR harus di-update
  - Material yang sudah dialokasikan harus di-release
  - Production harus di-handle
- **Status:** ⚠️ Perlu dicek

#### Skenario 7.4: Penghapusan Flow VOID (SO → Delete)
- **Kondisi:** Flow lama pakai status DRAFT/VOID. Sekarang SO hanya OPEN/CLOSE, pembatalan dilakukan dengan delete.
- **Masalah Potensial:**
  - Pastikan UI/API tidak lagi menampilkan opsi VOID/DRAFT.
  - Jika SO sudah punya turunan (SPK/PO), harus dicegah delete atau dilakukan cleanup otomatis.
  - Audit trail: pastikan delete dicatat (log).
- **Status:** ⚠️ Perlu implementasi (harus ubah SO module + dependent module).

---

### 🔴 KATEGORI 8: DATA INCONSISTENCY

#### Skenario 8.1: Progress > Target
- **Kondisi:** Progress sudah melebihi target (dari bug sebelumnya)
- **Masalah Potensial:**
  - Sistem harus handle data yang sudah inconsistent
  - Validasi harus prevent ini terjadi lagi
- **Status:** ✅ Sudah ditangani (validasi + cap)

#### Skenario 8.2: Material Outgoing > Receive
- **Kondisi:** Material outgoing lebih besar dari receive (tidak mungkin)
- **Masalah Potensial:**
  - Sistem harus detect dan fix inconsistency
  - Validasi harus prevent ini terjadi
- **Status:** ⚠️ Perlu dicek

#### Skenario 8.3: Production CLOSE Tapi Inventory Belum Update
- **Kondisi:** Production sudah CLOSE tapi inventory belum ter-update
- **Masalah Potensial:**
  - Sistem harus auto-update atau ada fix function
- **Status:** ⚠️ Perlu dicek (ada handleFixInventory)

---

### 🔴 KATEGORI 9: EDGE CASES

#### Skenario 9.1: SPK Tanpa SO (PTP)
- **Kondisi:** SPK dibuat dari PTP (Permintaan Tanpa PO), bukan dari SO
- **Masalah Potensial:**
  - Flow harus tetap berjalan normal
  - Tracking harus benar
- **Status:** ⚠️ Perlu dicek

#### Skenario 9.2: Production Tanpa GRN (Pakai Stock)
- **Kondisi:** Production start tanpa GRN, pakai stock yang ada
- **Masalah Potensial:**
  - Material harus di-allocate dengan benar
  - Inventory harus update dengan benar
- **Status:** ✅ Sudah ditangani (alokasi stock)

#### Skenario 9.3: Multiple Production untuk 1 SPK
- **Kondisi:** 1 SPK punya multiple production records
- **Masalah Potensial:**
  - Progress harus di-aggregate dengan benar
  - Material usage harus di-aggregate dengan benar
- **Status:** ⚠️ Perlu dicek

#### Skenario 9.4: Material dari Multiple Sources
- **Kondisi:** Material berasal dari PO + Stock + Manual Entry
- **Masalah Potensial:**
  - Tracking harus benar
  - Inventory harus update dengan benar
- **Status:** ⚠️ Perlu dicek

---

## 📝 PRIORITAS PERBAIKAN

### 🔴 HIGH PRIORITY (Critical)
1. ✅ Multiple SPK/Products dengan Material Sama - **SUDAH DITANGANI**
2. ✅ Stock Material Alokasi - **SUDAH DITANGANI**
3. ✅ Progress Melebihi Target - **SUDAH DITANGANI**
4. ✅ PO Dibuat Tapi Belum GRN - **SUDAH DITANGANI**
5. ✅ QC FAIL Handling - **SUDAH DITANGANI**
6. ✅ Partial Delivery - **SUDAH DITANGANI**

### 🟡 MEDIUM PRIORITY (Important)
1. ✅ GRN Partial - **SUDAH DITANGANI**
2. ✅ Multiple GRN untuk 1 PO - **SUDAH DITANGANI**
3. ⚠️ SO/SPK/PO Cancellation - **PERLU DICEK**
4. ⚠️ Data Inconsistency Detection & Fix - **PERLU DICEK**

### 🟢 LOW PRIORITY (Nice to Have)
1. ⚠️ PTP Flow
2. ⚠️ Multiple Production untuk 1 SPK
3. ⚠️ Material dari Multiple Sources

---

## 🔍 AREA YANG PERLU DICEK LEBIH LANJUT

1. **PO & GRN Flow:**
   - Bagaimana handle PO yang sudah dibuat tapi belum GRN?
   - Bagaimana handle GRN partial?
   - Bagaimana handle multiple GRN untuk 1 PO?

2. **QC Flow:**
   - Bagaimana handle QC FAIL?
   - Bagaimana handle QC PASS partial?
   - Bagaimana handle production submit lagi setelah QC FAIL?

3. **Delivery Flow:**
   - Bagaimana handle partial delivery?
   - Bagaimana handle multiple delivery untuk 1 QC?
   - Bagaimana prevent delivery sebelum QC PASS?

4. **Cancellation Flow:**
   - Bagaimana handle SO/SPK/PO cancellation?
   - Bagaimana release material yang sudah dialokasikan?
   - Bagaimana handle production yang sudah start?

5. **Data Consistency:**
   - Bagaimana detect data inconsistency?
   - Bagaimana auto-fix data inconsistency?
   - Bagaimana prevent data inconsistency?

---

## ✅ YANG SUDAH DITANGANI

1. ✅ Multiple SPK/Products dengan Material Sama
2. ✅ Stock Material Alokasi saat Create PR
3. ✅ Stock Material Validasi saat Production Submit
4. ✅ Progress Melebihi Target (Validasi + Cap)
5. ✅ Material Double Count Prevention (allocatedSPKs)
6. ✅ Total Kebutuhan Material dari Semua SPK Aktif
7. ✅ Stock Product Check untuk Semua SPK Aktif
8. ✅ PO Dibuat Tapi Belum GRN (materialStatus check)
9. ✅ GRN Partial (validasi qtyReceived tidak melebihi remaining qty)
10. ✅ Multiple GRN untuk 1 PO (tracking total qtyReceived + anti-duplicate)
11. ✅ QC FAIL Handling (reset production status ke OPEN)
12. ✅ QC PASS Partial (qtyPassed dan qtyFailed handling)
13. ✅ Partial Delivery (tracking total qty delivered + validasi)
14. ✅ Multiple Delivery untuk 1 QC (tracking + validasi)
15. ✅ Delivery Sebelum QC (validasi QC status harus PASS/PARTIAL dan CLOSE)

---

## 📌 KESIMPULAN

**Yang Sudah Baik:**
- Stock management sudah cukup baik
- Material allocation sudah ditangani
- Progress validation sudah ditambahkan
- Multiple SPK/Products handling sudah ditangani

**Yang Perlu Diperbaiki:**
- SO/SPK/PO Cancellation flow handling
- Data consistency detection & fix
- GRN untuk Multiple PO (1 GRN untuk multiple PO)
- PTP Flow (SPK tanpa SO)
- Multiple Production untuk 1 SPK
- Material dari Multiple Sources

**Rekomendasi:**
1. Fokus ke HIGH PRIORITY items dulu
2. Test semua skenario yang sudah ditangani
3. Implement perbaikan untuk skenario yang belum ditangani
4. Buat comprehensive test cases untuk semua skenario

