# Invoice Price Fix - Complete

**Status**: ✅ FIXED  
**Date**: March 6, 2026  
**Issue**: Invoice kosong (tidak ada harga) padahal DO punya totalDeal

---

## Root Cause Analysis

### Masalah
Invoice yang dibuat dari Surat Jalan (SJ) menampilkan kosong (harga = 0) padahal:
- DO memiliki `totalDeal: 3645000`
- SJ memiliki items dengan qty

### Penyebab
Invoice Notification dibuat dengan data **MINIMAL** saat upload signed document di Delivery Note:

```javascript
// ❌ BEFORE - Data tidak lengkap
const newNotif = {
  id: Date.now().toString(),
  type: 'CUSTOMER_INVOICE',
  dnNo: item.dnNo,
  doNo: item.doNo,
  status: 'PENDING',
  createdAt: new Date().toISOString(),
};
```

Notification tidak punya:
- `sjNo` ← **CRITICAL!** Dibutuhkan untuk load SJ
- `customerName`
- `items`
- `totalDeal` ← **CRITICAL!** Dibutuhkan untuk hitung harga per unit

Saat membuat invoice, code mencari notification berdasarkan `sjNo`, tapi notification tidak punya `sjNo`, jadi tidak ketemu. Akibatnya, harga tidak bisa dihitung.

---

## Solution Implemented

### 1. Enrich Invoice Notification (DeliveryNote.tsx)

**File**: `src/pages/Trucking/Shipments/DeliveryNote.tsx` (line 1128)

```typescript
// ✅ AFTER - Data lengkap
const newNotif = {
  id: Date.now().toString(),
  type: 'CUSTOMER_INVOICE',
  dnNo: item.dnNo,
  doNo: item.doNo,
  sjNo: relatedSJ?.sjNo || '',                    // ✅ Add sjNo
  customerName: relatedDO?.customerName || '',    // ✅ Add customer name
  customerAddress: relatedDO?.customerAddress || '', // ✅ Add address
  items: relatedSJ?.items || [],                  // ✅ Add items dari SJ
  totalDeal: relatedDO?.totalDeal || 0,          // ✅ Add totalDeal dari DO
  status: 'PENDING',
  createdAt: new Date().toISOString(),
};
```

**Perubahan**:
- Load SJ berdasarkan `dnNo` untuk mendapatkan `sjNo` dan `items`
- Load DO berdasarkan `doNo` untuk mendapatkan `totalDeal` dan customer info
- Simpan semua data ke notification

### 2. Update Invoice Creation Logic (invoices.tsx)

**File**: `src/pages/Trucking/Finance/invoices.tsx` (line 229)

**Perubahan 1**: Cari notification dengan multiple keys
```typescript
// ❌ BEFORE
const notif = invoiceNotificationsArray.find((n: any) => n.sjNo === item.sjNo);

// ✅ AFTER
const notif = invoiceNotificationsArray.find((n: any) => 
  n.sjNo === item.sjNo || n.dnNo === item.dnNo || n.doNo === item.doNo
);
```

**Perubahan 2**: Cari SJ dengan fallback ke dnNo
```typescript
// ❌ BEFORE
const sj = suratJalanList.find((s: any) => s.sjNo === item.sjNo);

// ✅ AFTER
let sj = suratJalanList.find((s: any) => s.sjNo === item.sjNo);
if (!sj && (item.dnNo || notif?.dnNo)) {
  sj = suratJalanList.find((s: any) => s.dnNo === (item.dnNo || notif?.dnNo));
}
```

**Perubahan 3**: Prioritas totalDeal dari notification
```typescript
// ❌ BEFORE
const totalDeal = relatedDO?.totalDeal || 0;

// ✅ AFTER
const totalDeal = notif?.totalDeal || relatedDO?.totalDeal || 0;
```

### 3. Fix Typo
```typescript
// ❌ BEFORE
const relatedDO = doList.find((doItem: any) => doItem.dcontohoNo === sj.doNo);

// ✅ AFTER
const relatedDO = doList.find((doItem: any) => doItem.doNo === sj.doNo);
```

---

## Data Flow After Fix

```
1. Upload Signed Document di Delivery Note
   ↓
2. Create Invoice Notification dengan data LENGKAP:
   - sjNo, dnNo, doNo
   - customerName, customerAddress
   - items (dari SJ)
   - totalDeal (dari DO)
   ↓
3. User klik "Create Invoice" di Invoice Notifications
   ↓
4. Load notification dengan data lengkap
   ↓
5. Hitung harga per unit:
   pricePerUnit = totalDeal / totalQty
   ↓
6. Invoice dibuat dengan harga yang benar ✅
```

---

## Testing Checklist

- [ ] Upload signed document di Delivery Note
- [ ] Cek Invoice Notifications - harus punya `sjNo`, `totalDeal`, `items`
- [ ] Klik "Create Invoice"
- [ ] Cek invoice - harus punya harga (tidak kosong)
- [ ] Cek subtotal = qty × price
- [ ] Cek total = subtotal - discount + tax + biayaLain

---

## Console Logs untuk Debug

Saat membuat invoice, lihat console untuk debug:

```
[Invoice] Creating invoice for SJ: SJ-20260306-1234, DO: DO-20260302-5852
[Invoice] Related DO found: { doNo: "DO-20260302-5852", totalDeal: 3645000, ... }
[Invoice] totalDeal from notification or DO: 3645000
[Invoice] Notification data: { sjNo: "SJ-20260306-1234", totalDeal: 3645000, items: [...], ... }
[Invoice] Total Qty from SJ items: 1
[Invoice] Item: JASA ANGKUTAN, Qty: 1, Price per unit: 3645000
```

---

## Files Modified

1. **src/pages/Trucking/Shipments/DeliveryNote.tsx**
   - Line 1128: Enrich invoice notification dengan data lengkap

2. **src/pages/Trucking/Finance/invoices.tsx**
   - Line 229: Update handleCreateInvoice untuk handle notification dengan data lengkap
   - Line 233: Cari notification dengan multiple keys (sjNo, dnNo, doNo)
   - Line 244: Cari SJ dengan fallback ke dnNo
   - Line 274: Prioritas totalDeal dari notification

---

## Impact

✅ **Invoice sekarang punya harga yang benar**
✅ **Notification punya data lengkap untuk reference**
✅ **Fallback logic untuk handle edge cases**
✅ **Better logging untuk debug**

---

## Additional Fix - Manual Invoice Creation Dialog

### Masalah Kedua
Di dialog "Create Invoice From Delivery Order", harga juga kosong (Rp 0) saat memilih DO.

### Penyebab
Saat menghitung `pricePerUnit` untuk multiple DO:
```javascript
// ❌ BEFORE - Salah
const totalQty = items.reduce(...); // Qty dari DO saat ini saja
const pricePerUnit = totalDeal / totalQty; // totalDeal dari semua DO, tapi totalQty dari DO saat ini
```

Ini menyebabkan perhitungan tidak konsisten.

### Fix Applied
```javascript
// ✅ AFTER - Benar
let totalQtyAllDOs = 0;
selectedDOItems.forEach((doItem) => {
  totalQtyAllDOs += items.reduce(...); // Qty dari SEMUA DO
});

const pricePerUnit = totalDeal / totalQtyAllDOs; // Konsisten!
```

**File**: `src/pages/Trucking/Finance/invoices.tsx` (line 2475)

---

## Next Steps

1. Test dengan data existing
2. Jika ada invoice lama yang kosong, bisa di-recreate
3. Monitor console logs untuk memastikan data flow benar
4. Test dengan multiple DO selection

---

**Dibuat**: March 6, 2026  
**Status**: ✅ Ready for Testing
