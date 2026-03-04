# 📊 Inventory Stock Reduction - Complete Scan

## Summary
Ditemukan **3 tempat utama** dimana inventory stock dikurangi (outgoing ditambah):

---

## 1️⃣ **PPIC.tsx** - Allocate Material untuk SPK
**File:** `src/pages/Packaging/PPIC.tsx`

### Location: Line 5659-5670
**Function:** Deallocate material ketika SPK di-cancel atau di-reject

```javascript
// Line 5659-5670
const oldOutgoing = inventoryItem.outgoing || 0;
const newOutgoing = Math.max(0, oldOutgoing - requiredQty);  // KURANGI outgoing

inventoryItem.outgoing = newOutgoing;
inventoryItem.allocatedSPKs = inventoryItem.allocatedSPKs.filter((id: string) => id !== spkNo);
inventoryItem.nextStock =
  (inventoryItem.stockPremonth || 0) +
  (inventoryItem.receive || 0) -
  newOutgoing +  // Recalculate dengan outgoing yang baru
  (inventoryItem.return || 0);
inventoryItem.lastUpdate = new Date().toISOString();
```

**Kapan terjadi:**
- Saat user deallocate material dari SPK
- Saat SPK di-cancel atau di-reject

**Apa yang dikurangi:**
- `outgoing` dikurangi (material dikembalikan ke available stock)

---

## 2️⃣ **Production.tsx** - Material Digunakan saat Production Submit
**File:** `src/pages/Packaging/Production.tsx`

### Location A: Line 2115-2140 (updateInventoryFromProduction)
**Function:** Kurangi material inventory saat production result di-submit

```javascript
// Line 2115-2140
// Update inventory for MATERIAL - TAMBAHKAN OUTGOING
const oldOutgoing = existingMaterialInventory.outgoing || 0;
const newOutgoing = oldOutgoing + materialUsed;  // TAMBAHKAN outgoing (material digunakan)

existingMaterialInventory.outgoing = newOutgoing;

// Recalculate nextStock: stockPremonth + receive - outgoing + return
existingMaterialInventory.nextStock =
  (existingMaterialInventory.stockPremonth || 0) +
  (existingMaterialInventory.receive || 0) -
  newOutgoing +
  (existingMaterialInventory.return || 0);
```

**Kapan terjadi:**
- Saat user submit production result (qtyProduced)
- Material yang digunakan untuk produksi dikurangi dari inventory

**Apa yang dikurangi:**
- `outgoing` ditambah (material keluar dari inventory)
- `nextStock` berkurang (karena outgoing bertambah)

### Location B: Line 2438-2450 (handleFixInventory)
**Function:** Fix inventory untuk production yang sudah CLOSE tapi outgoing belum ter-update

```javascript
// Line 2438-2450
if (currentOutgoing < expectedOutgoing - tolerance) {
  const oldOutgoing = currentOutgoing;
  const newOutgoing = expectedOutgoing;  // SET ke expected value
  inventoryItem.outgoing = newOutgoing;

  inventoryItem.nextStock =
    (inventoryItem.stockPremonth || 0) +
    (inventoryItem.receive || 0) -
    newOutgoing +
    (inventoryItem.return || 0);
}
```

**Kapan terjadi:**
- Saat user click "Fix Inventory" untuk production yang sudah CLOSE
- Untuk fix outgoing yang belum ter-update dengan benar

---

## 3️⃣ **DeliveryNote.tsx** - Product Dikirim (Outgoing)
**File:** `src/pages/Packaging/DeliveryNote.tsx`

### Location: Line 2240-2276 (setOnGoingFromDelivery)
**Function:** Kurangi product inventory saat delivery note dibuat (signed document di-upload)

```javascript
// Line 2240-2276
// Update existing product inventory - TAMBAHKAN OUTGOING dan KURANGI ON GOING
const oldOutgoing = existingProductInventory.outgoing || 0;
const oldOnGoing = existingProductInventory.onGoing || existingProductInventory.on_going || 0;
const newOutgoing = oldOutgoing + qtyDelivered;  // TAMBAHKAN outgoing (product dikirim)
const newOnGoing = Math.max(0, oldOnGoing - qtyDelivered);  // KURANGI onGoing

existingProductInventory.outgoing = newOutgoing;
existingProductInventory.onGoing = newOnGoing;  // Update on going (production stock)

// Recalculate nextStock
existingProductInventory.nextStock =
  (existingProductInventory.stockPremonth || 0) +
  (existingProductInventory.receive || 0) -
  newOutgoing +
  (existingProductInventory.return || 0);
```

**Kapan terjadi:**
- Saat delivery note dibuat (signed document di-upload)
- Product yang dikirim dikurangi dari inventory

**Apa yang dikurangi:**
- `outgoing` ditambah (product keluar dari inventory)
- `onGoing` dikurangi (production stock yang siap kirim berkurang)
- `nextStock` berkurang (karena outgoing bertambah)

**Called from:**
- Line 2526: `setOnGoingFromDelivery(newDelivery)` - saat create delivery note
- Line 2649: `setOnGoingFromDelivery(newDelivery)` - saat upload signed document
- Line 4141: `setOnGoingFromDelivery(newDelivery)` - saat create dari notification
- Line 5926, 5987, 6054, 6098: Multiple places saat create dari SJ/PO/SO

---

## 📋 Summary Table

| Module | File | Line | Action | What Reduced | When |
|--------|------|------|--------|--------------|------|
| PPIC | PPIC.tsx | 5659-5670 | Deallocate | `outgoing` ↓ | SPK cancelled/rejected |
| Production | Production.tsx | 2115-2140 | Material used | `outgoing` ↑ | Production submitted |
| Production | Production.tsx | 2438-2450 | Fix inventory | `outgoing` = expected | Fix inventory clicked |
| DeliveryNote | DeliveryNote.tsx | 2240-2276 | Product shipped | `outgoing` ↑, `onGoing` ↓ | Delivery note created |

---

## 🔍 Key Points

### Material Flow:
1. **Material masuk inventory** → `receive` bertambah (dari GRN/Purchasing)
2. **Material dialokasikan ke SPK** → `outgoing` bertambah (di PPIC)
3. **Material digunakan di Production** → `outgoing` bertambah (di Production)
4. **Material tidak digunakan** → `outgoing` berkurang (deallocate di PPIC)

### Product Flow:
1. **Product diproduksi** → `receive` bertambah (dari Production)
2. **Product siap kirim** → `onGoing` bertambah (production stock)
3. **Product dikirim** → `outgoing` bertambah, `onGoing` berkurang (di DeliveryNote)

### Stock Calculation:
```
nextStock = stockPremonth + receive - outgoing + return
```

---

## ⚠️ Critical Issues Found

### Issue 1: Data Extraction Bug (FIXED)
**File:** `src/pages/Packaging/Production.tsx` Line 5238-5251
- Data tidak di-extract sebelum `Array.isArray()` check
- Wrapped objects `{ value: [...] }` menjadi empty array
- Stock tidak ter-update tapi tidak ada error

**Status:** ✅ FIXED - Added `extractStorageValue()` before `Array.isArray()`

### Issue 2: Missing Material Validation (FIXED)
**File:** `src/pages/Packaging/Production.tsx` Line 5318-5327
- Kalau material tidak ada di inventory, submit tetap berhasil
- Stock tidak ter-update karena data kosong

**Status:** ✅ FIXED - Added clear error message dan block submit

---

## 🎯 Recommendations

1. **Add logging** di setiap tempat stock dikurangi untuk audit trail
2. **Add validation** sebelum reduce stock (pastikan data valid)
3. **Add transaction** untuk prevent partial updates
4. **Monitor** nextStock calculation untuk detect anomalies
