# Inventory Receive Sources - Packaging Module

## Overview
Inventory receive (stock inflow) dapat dipicu dari berbagai sumber dalam Packaging module. Dokumen ini menjelaskan semua entry point yang menambah stock material dan product.

---

## 1. **MATERIAL RECEIVE** - Dari GRN (Goods Receipt Note)

### Source: `Purchasing.tsx` - GRN Receipt
**Trigger:** Saat GRN di-submit (material diterima dari supplier)

**Flow:**
```
PO (Purchase Order) 
  ↓
GRN (Goods Receipt Note) - Submit
  ↓
inventory.receive += qtyReceived
inventory.nextStock = stockPremonth + receive - outgoing + return
```

**Fields Updated:**
- `inventory.receive` - Ditambah dengan qty yang diterima
- `inventory.nextStock` - Recalculated
- `inventory.processedPOs` - Track PO yang sudah diproses (anti-duplicate)
- `inventory.allocatedSPKs` - Track SPK yang menerima material ini
- `inventory.sitePlan` - Site Plan dari GRN
- `inventory.price` - Updated dari PO price

**Anti-Duplicate Mechanism:**
- Track `processedPOs` array - jika PO sudah ada, skip update
- Prevent double counting dari GRN yang sama

**Key Code Location:**
```typescript
// src/pages/Packaging/Purchasing.tsx
// Function: handleReceiptSubmit()
// Line: ~1360-1450
```

---

## 2. **PRODUCT RECEIVE** - Dari Production Submit

### Source: `Production.tsx` - Production Result
**Trigger:** Saat Production di-submit (product selesai diproduksi)

**Flow:**
```
Production (OPEN)
  ↓
Submit Production Result
  ↓
inventory.receive += qtyProduced + surplusQty
inventory.nextStock = stockPremonth + receive - outgoing + return
```

**Fields Updated:**
- `inventory.receive` - Ditambah dengan qtyProduced + surplusQty
- `inventory.nextStock` - Recalculated
- `inventory.processedProductions` - Track production submission (anti-duplicate)
- `inventory.price` - Updated dari master product
- `inventory.sitePlan` - Site Plan dari production

**Anti-Duplicate Mechanism:**
- Track `processedProductions` array dengan key: `{productionNo}-{spkNo}-PRODUCT`
- Prevent double counting dari production submission yang sama

**Key Code Location:**
```typescript
// src/pages/Packaging/Production.tsx
// Function: updateInventoryFromProduction()
// Line: ~1955-2300
```

---

## 3. **PRODUCT OUTGOING** - Dari Delivery Note (Signed)

### Source: `DeliveryNote.tsx` - Delivery Note Upload
**Trigger:** Saat Delivery Note signed document di-upload

**Flow:**
```
Delivery Note (DRAFT)
  ↓
Upload Signed Document
  ↓
inventory.outgoing += qtyDelivered
inventory.onGoing -= qtyDelivered (production stock)
inventory.nextStock = stockPremonth + receive - outgoing + return
```

**Fields Updated:**
- `inventory.outgoing` - Ditambah dengan qty delivered
- `inventory.onGoing` / `inventory.on_going` - Dikurangi (production stock)
- `inventory.nextStock` - Recalculated
- `inventory.processedSPKs` - Track SPK yang sudah diproses (anti-duplicate)

**Anti-Duplicate Mechanism:**
- Track `processedSPKs` array dengan key: `DEL_{deliveryId}_{spkNo}`
- Support batch dengan SPK berbeda dalam delivery yang sama

**Key Code Location:**
```typescript
// src/pages/Packaging/DeliveryNote.tsx
// Function: updateInventoryFromDelivery()
// Line: ~2070-2310
```

---

## 4. **PRODUCT RETURN** - Dari Return Module

### Source: `Return.tsx` - Return Submit
**Trigger:** Saat Return di-submit (product dikembalikan)

**Flow:**
```
Return (DRAFT)
  ↓
Submit Return
  ↓
inventory.return += returnQty
inventory.nextStock = stockPremonth + receive - outgoing + return
```

**Fields Updated:**
- `inventory.return` - Ditambah dengan return qty
- `inventory.nextStock` - Recalculated

**Key Code Location:**
```typescript
// src/pages/Packaging/Return.tsx
// Function: handleSaveReturn()
// Line: ~250-330
```

---

## 5. **PRODUCT INITIAL STOCK** - Dari Sales Order

### Source: `SalesOrders.tsx` - SO Create
**Trigger:** Saat Sales Order dibuat dengan inventoryQty

**Flow:**
```
Sales Order (Create)
  ↓
Set inventoryQty per item
  ↓
inventory.stockPremonth += inventoryQty
inventory.nextStock = stockPremonth + receive - outgoing + return
```

**Fields Updated:**
- `inventory.stockPremonth` - Ditambah dengan inventoryQty
- `inventory.nextStock` - Recalculated

**Key Code Location:**
```typescript
// src/pages/Packaging/SalesOrders.tsx
// Function: handleSaveOrder()
// Line: ~1980-2030
```

---

## Summary Table

| Source | Type | Field Updated | Trigger | Anti-Duplicate |
|--------|------|---------------|---------|-----------------|
| GRN (Purchasing) | Material | `receive` | GRN Submit | `processedPOs` |
| Production | Product | `receive` | Production Submit | `processedProductions` |
| Delivery Note | Product | `outgoing` | Signed Upload | `processedSPKs` |
| Return | Product | `return` | Return Submit | None |
| Sales Order | Product | `stockPremonth` | SO Create | None |

---

## Inventory Formula

```
nextStock = stockPremonth + receive - outgoing + return
```

**Components:**
- `stockPremonth` - Initial stock dari SO
- `receive` - Stock masuk dari GRN (material) atau Production (product)
- `outgoing` - Stock keluar dari Delivery Note
- `return` - Stock kembali dari Return

---

## Important Notes

1. **Material vs Product:**
   - Material: Receive dari GRN (Purchasing)
   - Product: Receive dari Production, Outgoing dari Delivery

2. **Anti-Duplicate:**
   - Setiap source punya tracking mechanism sendiri
   - Prevent double counting dari submission yang sama

3. **Stock Calculation:**
   - Always recalculate `nextStock` setelah update
   - Formula: `stockPremonth + receive - outgoing + return`

4. **Site Plan:**
   - Tracked dari GRN dan Production
   - Untuk tracking lokasi stock (Site Plan 1 atau Site Plan 2)

5. **Price:**
   - Material: Dari PO price
   - Product: Dari master product (hargaSales > hargaFg > harga)
