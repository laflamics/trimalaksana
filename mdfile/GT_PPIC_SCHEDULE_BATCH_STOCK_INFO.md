# GT PPIC - Schedule Batch Stock Information Enhancement

## Problem
Saat Create schedule jadi 2 (atau lebih) batch, user tidak tau kapan barang ready untuk setiap batch.

## Root Cause
1. Multiple batch creation tanpa stock availability info per batch
2. Tidak ada validasi stock per batch saat create
3. Missing link antara batch dengan PR/PO status
4. Tidak ada estimated ready date untuk batch yang stock-nya belum cukup

## Solution Design

### 1. Stock Check per Batch (Real-time)
Saat user input qty untuk batch, langsung cek:
- Available stock saat ini
- Apakah stock cukup untuk batch ini
- Jika tidak cukup, berapa shortage-nya
- Apakah ada PR/PO yang sedang berjalan

### 2. Batch Stock Status Indicator
Setiap batch harus punya indicator:
- ✅ **Stock Ready** - Stock cukup, bisa langsung deliver
- ⏳ **Waiting Stock** - Stock tidak cukup, ada PR/PO berjalan
- ❌ **No Stock** - Stock tidak cukup, belum ada PR/PO
- 📦 **Partial Stock** - Stock cukup untuk sebagian qty

### 3. Estimated Ready Date
Untuk batch yang stock-nya belum ready:
- Tampilkan estimated ready date dari PO delivery date
- Jika belum ada PO, tampilkan "Need to create PR/PO"
- Link ke PR/PO terkait untuk tracking

### 4. Smart Batch Suggestion
Saat user mau split batch, sistem suggest:
- Batch 1: Qty sesuai available stock (ready now)
- Batch 2: Qty sisanya (estimated ready: [PO date])

### 5. Visual Feedback
Di batch list, tampilkan:
```
Batch A: 100 PCS - 15/03/2026
  ✅ Stock Ready (100 available)
  
Batch B: 50 PCS - 20/03/2026
  ⏳ Waiting Stock (0 available, PO#12345 ETA: 18/03/2026)
  
Batch C: 30 PCS - 25/03/2026
  ❌ No Stock (Need PR/PO)
```

## Implementation Plan

### Phase 1: Stock Check Function
- Add `checkStockForBatch()` function
- Real-time stock validation saat input qty
- Show warning jika stock tidak cukup

### Phase 2: Batch Status
- Add `stockStatus` field ke DeliveryBatch interface
- Calculate status based on available stock
- Display status indicator di batch list

### Phase 3: PR/PO Integration
- Link batch dengan PR/PO
- Show PO delivery date sebagai estimated ready
- Add quick link ke PR/PO detail

### Phase 4: Smart Suggestions
- Auto-suggest batch split based on stock
- Pre-fill qty dengan available stock
- Suggest delivery dates based on PO ETA

## Benefits
1. User langsung tau batch mana yang bisa deliver
2. Tidak ada confusion tentang kapan barang ready
3. Better planning untuk delivery schedule
4. Reduce error karena promise delivery tanpa stock

## Files to Modify
- `src/components/DeliveryScheduleDialog.tsx` - Add stock check & status
- `src/pages/GeneralTrading/PPIC.tsx` - Add stock validation logic
- `src/types/schedule.ts` - Add stockStatus to DeliveryBatch interface
