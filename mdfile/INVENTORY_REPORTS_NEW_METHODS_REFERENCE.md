# Inventory Reports - New Methods Quick Reference

**Date**: February 25, 2026  
**Added**: 9 new inventory report methods  
**Files**: report-service.ts, report-template-engine.ts

---

## 🆕 New Report Methods

### 1. Fast Moving Items Report
```typescript
// Service Method
async generateInventoryFastMovingReport(): Promise<void>

// Template Method
inventoryFastMovingReport(data: any[]): any

// Purpose
Identify items dengan turnover tinggi (banyak keluar)

// Data Fields
- kode: Product code
- nama: Product name
- stok: Current stock
- outgoing: Quantity sold/used
- harga: Unit price
- nilaiKeluar: Value of outgoing (outgoing * harga)

// Sorting
By outgoing quantity (descending - highest first)

// Use Case
- Inventory management
- Reorder planning
- Popular items analysis
```

### 2. Slow Moving Items Report
```typescript
// Service Method
async generateInventorySlowMovingReport(): Promise<void>

// Template Method
inventorySlowMovingReport(data: any[]): any

// Purpose
Identify items dengan turnover rendah (sedikit keluar)

// Data Fields
- kode: Product code
- nama: Product name
- stok: Current stock
- outgoing: Quantity sold/used
- harga: Unit price
- nilaiStok: Stock value (stok * harga)

// Sorting
By outgoing quantity (ascending - lowest first)

// Use Case
- Dead stock identification
- Clearance planning
- Inventory optimization
```

### 3. Stock by Selling Price Report
```typescript
// Service Method
async generateInventoryBySellingPriceReport(): Promise<void>

// Template Method
inventoryBySellingPriceReport(data: any[]): any

// Purpose
Analyze inventory grouped by selling price (hargaFG)

// Data Fields
- kode: Product code
- nama: Product name
- stok: Current stock
- hargaJual: Selling price (hargaFG)
- nilaiJual: Total selling value (stok * hargaJual)

// Sorting
By selling price (descending - highest price first)

// Use Case
- Revenue analysis
- Pricing strategy
- High-value item tracking
```

### 4. Stock Card Report (Kartu Stok)
```typescript
// Service Method
async generateInventoryStockCardReport(): Promise<void>

// Template Method
inventoryStockCardReport(data: any[]): any

// Purpose
Detailed stock movement history for all items

// Data Fields
- kode: Product code
- nama: Product name
- satuan: Unit of measurement
- stokAwal: Opening stock
- masuk: Inbound quantity
- keluar: Outbound quantity
- stokAkhir: Closing stock
- harga: Unit price
- nilaiAwal: Opening value
- nilaiMasuk: Inbound value
- nilaiKeluar: Outbound value
- nilaiAkhir: Closing value

// Use Case
- Audit trail
- Reconciliation
- Stock verification
- Financial reporting
```

### 5. Stock Card Per Item Report (Kartu Stok Per Item)
```typescript
// Service Method
async generateInventoryStockCardPerItemReport(): Promise<void>

// Template Method
inventoryStockCardPerItemReport(data: any[]): any

// Purpose
Stock card with P1 and P2 breakdown for detailed analysis

// Data Fields
- kode: Product code
- nama: Product name
- satuan: Unit of measurement
- stockP1: Stock period 1
- stockP2: Stock period 2
- stockAwal: Opening stock (P1 + P2)
- masuk: Inbound quantity
- keluar: Outbound quantity
- stokAkhir: Closing stock
- harga: Unit price

// Use Case
- Period-based analysis
- Detailed inventory tracking
- Multi-period comparison
```

### 6. Stock Per Warehouse Detailed Report
```typescript
// Service Method
async generateInventoryStockPerWarehouseDetailedReport(): Promise<void>

// Template Method
inventoryStockPerWarehouseDetailedReport(groupedByWarehouse: Record<string, any[]>): any

// Purpose
Detailed breakdown of stock by warehouse with P1/P2

// Data Fields
- gudang: Warehouse name
- kode: Product code
- nama: Product name
- satuan: Unit of measurement
- stockP1: Stock period 1
- stockP2: Stock period 2
- stokAkhir: Closing stock
- harga: Unit price
- nilaiStok: Stock value

// Grouping
By warehouse (each warehouse as separate section)

// Use Case
- Warehouse management
- Distribution planning
- Multi-location inventory
```

### 7. Stock Chart Per Warehouse Report
```typescript
// Service Method
async generateInventoryStockChartPerWarehouseReport(): Promise<void>

// Template Method
inventoryStockChartPerWarehouseReport(data: any[]): any

// Purpose
Warehouse statistics for visualization and analysis

// Data Fields
- warehouse: Warehouse name
- totalItems: Number of items in warehouse
- totalStok: Total quantity in stock
- totalNilai: Total value of stock

// Use Case
- Dashboard visualization
- Warehouse performance analysis
- Capacity planning
- Comparative analysis
```

---

## 🔄 Price Logic Applied

All new reports use correct price based on kategori:

```typescript
const kategori = (inv.kategori || product?.kategori || '').toLowerCase().trim();
let harga = Number(inv.price || 0);

if (kategori === 'product') {
  // For products, use hargaFG (selling price)
  harga = Number(product?.hargaFG || product?.harga || inv.price || 0);
} else {
  // For materials, use hargaBeli (cost price)
  harga = Number(product?.hargaBeli || inv.price || 0);
}
```

---

## 📊 Report Comparison

| Report | Type | Sorting | Key Metric | Color |
|--------|------|---------|-----------|-------|
| Fast Moving | Movement | Outgoing ↓ | Turnover | Red |
| Slow Moving | Movement | Outgoing ↑ | Stagnation | Orange |
| Selling Price | Analysis | Price ↓ | Revenue | Blue |
| Stock Card | Detail | - | Movement | Green |
| Stock Card/Item | Detail | - | Period | Green |
| Warehouse Detail | Location | Warehouse | Distribution | Green |
| Warehouse Chart | Summary | - | Totals | Blue |

---

## 🧪 Testing Data Requirements

To test these reports, you need:

1. **Inventory Data** with:
   - codeItem, description, kategori
   - stockP1, stockP2, nextStock
   - receive, outgoing, return
   - warehouse/gudang field
   - price field

2. **Products Data** with:
   - kode, nama, kategori
   - hargaBeli (for materials)
   - hargaFG (for products)
   - satuan

3. **Sample Data**:
   - At least 10-20 items
   - Mix of materials and products
   - Multiple warehouses
   - Various stock levels

---

## 🚀 Usage Example

```typescript
// In your React component or page
import { reportService } from '@/services/report-service';

// Generate Fast Moving Report
await reportService.generateInventoryFastMovingReport();

// Generate Slow Moving Report
await reportService.generateInventorySlowMovingReport();

// Generate Stock Card
await reportService.generateInventoryStockCardReport();

// Generate Warehouse Chart
await reportService.generateInventoryStockChartPerWarehouseReport();
```

---

## 📋 Implementation Checklist

- [x] Service methods created
- [x] Template methods created
- [x] Price logic implemented
- [x] Data mapping verified
- [x] TypeScript compilation successful
- [ ] Test with real data
- [ ] Verify Excel output
- [ ] User documentation
- [ ] Production deployment

---

## 🔗 Related Files

- `src/services/report-service.ts` - Report generation logic
- `src/services/report-template-engine.ts` - Excel templates
- `src/utils/excel-formatter.ts` - Excel export utility
- `src/pages/Master/Inventory.tsx` - Inventory data source

---

## 📞 Support

For issues or questions:
1. Check data structure in Inventory.tsx
2. Verify PostgreSQL connection
3. Check browser console for errors
4. Review report service logs

---

**Status**: ✅ Ready for Testing  
**Last Updated**: February 25, 2026

