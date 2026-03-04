# 🚀 Quick Reference - Packaging Sales Order Export

**Status**: ✅ READY TO USE  
**Location**: Settings → Full Reports → Custom/Khusus → Packaging Sales Order Export

---

## 📊 Report Overview

**Nama**: Packaging Sales Order Export  
**Kategori**: Custom/Khusus  
**Deskripsi**: Export data penjualan packaging dengan inventory flow dan financial summary  
**Kolom**: 17 kolom  
**Format Output**: Excel (.xlsx)

---

## 🎯 Fitur Utama

✅ **Inventory Flow Tracking**
- Stock Awal (Beginning Stock)
- Delivery (Pengiriman)
- Remain PO (Sisa PO)
- Next Stock (Stock Berikutnya)

✅ **Financial Summary**
- Total Tagihan (Invoice Total)
- Total RP Remain (Sisa Rupiah)
- Unit Price & Total per Item

✅ **Data Integration**
- Sales Orders
- Delivery Notes
- Inventory Data
- Customer Information

✅ **Professional Formatting**
- Header dengan background color
- Alternate row coloring
- Freeze pane
- Currency & number formatting
- Summary row dengan totals

---

## 📋 Kolom Export

| # | Kolom | Tipe | Contoh |
|---|-------|------|--------|
| 1 | NO | Number | 1, 2, 3... |
| 2 | KODE PEL. | Text | CUST001 |
| 3 | KD. ITEM | Text | PROD001 |
| 4 | DATE | Date | 2026-02-28 |
| 5 | NO TRANSAKSI | Text | SO-2026-001 |
| 6 | CUSTOMER | Text | PT. ABC |
| 7 | NAMA ITEM | Text | Product Name |
| 8 | JML | Number | 100 |
| 9 | HARGA | Currency | 50,000 |
| 10 | TOTAL | Currency | 5,000,000 |
| 11 | STOCK AWAL | Number | 500 |
| 12 | PRODUKSI | Number | 0 |
| 13 | DELIVERY | Number | 100 |
| 14 | REMAIN PO | Number | 0 |
| 15 | NEXT STOCK | Number | 400 |
| 16 | TOTAL TAGIHAN | Currency | 5,000,000 |
| 17 | TOTAL RP. REMAIN | Currency | 0 |

---

## 🔄 Cara Menggunakan

### Step 1: Buka Full Reports
```
Settings → Full Reports
```

### Step 2: Pilih Custom Category
```
Klik "Custom/Khusus" di sidebar
```

### Step 3: Pilih Report
```
Klik "Packaging Sales Order Export"
```

### Step 4: Set Date Range
```
Start Date: 2026-02-01
End Date: 2026-02-28
```

### Step 5: Preview Data
```
Klik "Preview" untuk lihat data
```

### Step 6: Export to Excel
```
Klik "Export" untuk download file
```

### Step 7: File Output
```
Packaging_Sales_Order_Export_2026-02-28.xlsx
```

---

## 💡 Tips & Tricks

### Tip 1: Filter by Date Range
- Gunakan date range untuk filter data
- Lebih cepat untuk large dataset
- Contoh: Monthly export

### Tip 2: Check Preview First
- Selalu preview sebelum export
- Pastikan data sesuai ekspektasi
- Cek jumlah rows

### Tip 3: Use Excel Features
- Gunakan Excel filter untuk analisis
- Sort by customer atau product
- Create pivot table untuk summary

### Tip 4: Automate Export
- Export setiap bulan untuk tracking
- Save file dengan naming convention
- Archive untuk historical data

---

## 🔍 Data Interpretation

### Stock Awal (Beginning Stock)
**Rumus**: `stockPremonth + stockP1 + stockP2 + receive`

**Arti**: Total stock yang tersedia di awal periode

**Contoh**: 
- Stock Premonth: 200
- Stock P1: 100
- Stock P2: 150
- Receive: 50
- **Stock Awal: 500**

### Delivery (Pengiriman)
**Arti**: Jumlah yang sudah dikirim ke customer

**Contoh**: 100 unit sudah dikirim

### Remain PO (Sisa PO)
**Rumus**: `qty_ordered - delivery`

**Arti**: Jumlah yang belum dikirim

**Contoh**: 
- Qty Ordered: 100
- Delivery: 100
- **Remain PO: 0** (sudah selesai)

### Next Stock (Stock Berikutnya)
**Rumus**: `stockAwal - delivery`

**Arti**: Stock yang tersisa setelah delivery

**Contoh**:
- Stock Awal: 500
- Delivery: 100
- **Next Stock: 400**

### Total Tagihan (Invoice Total)
**Rumus**: `qty * price`

**Arti**: Total nilai penjualan per item

**Contoh**:
- Qty: 100
- Price: 50,000
- **Total Tagihan: 5,000,000**

### Total RP Remain (Sisa Rupiah)
**Rumus**: `remainPO * price`

**Arti**: Nilai rupiah yang belum dikirim

**Contoh**:
- Remain PO: 0
- Price: 50,000
- **Total RP Remain: 0** (sudah selesai)

---

## 📊 Summary Row

Baris terakhir menampilkan **TOTAL** untuk kolom:
- JML (Total Quantity)
- DELIVERY (Total Delivered)
- REMAIN PO (Total Remaining)
- TOTAL TAGIHAN (Total Invoice)
- TOTAL RP. REMAIN (Total Remaining Amount)

**Contoh**:
```
TOTAL | | | | | | | 1000 | | | | 500 | 500 | 50,000,000 | 25,000,000
```

---

## ⚙️ Configuration

### Server Mode Required
- Report memerlukan server mode aktif
- Pastikan server URL sudah dikonfigurasi
- Settings → Server Data

### Date Range
- Default: Current month
- Flexible: Bisa set custom range
- Format: YYYY-MM-DD

### Export Format
- Format: Excel (.xlsx)
- Filename: `Packaging_Sales_Order_Export_YYYY-MM-DD.xlsx`
- Location: Downloads folder

---

## 🐛 Troubleshooting

### Problem: Report tidak muncul
**Solution**: 
1. Refresh browser
2. Clear cache
3. Check console untuk error

### Problem: Preview kosong
**Solution**:
1. Check date range
2. Verify Sales Orders data exists
3. Check server connection

### Problem: Export gagal
**Solution**:
1. Pastikan server mode aktif
2. Check server URL
3. Verify data integrity

### Problem: Kolom tidak sesuai
**Solution**:
1. Refresh page
2. Check browser compatibility
3. Try different browser

---

## 📈 Performance

### Typical Export Time
- 100 rows: < 1 detik
- 1,000 rows: 1-2 detik
- 10,000 rows: 5-10 detik

### Optimization Tips
- Gunakan date range filter
- Export monthly bukan yearly
- Close other applications
- Use modern browser

---

## 🎓 Related Documentation

- **SALES_ORDER_EXPORT_ANALYSIS.md** - Detailed analysis
- **CUSTOM_PACKAGING_SALES_EXPORT_INTEGRATION.md** - Integration details
- **DEVELOPMENT_GUIDELINES.md** - Development reference

---

## ✅ Checklist

Sebelum export, pastikan:
- [ ] Date range sudah set
- [ ] Preview data sudah dicek
- [ ] Server mode aktif
- [ ] Internet connection stabil
- [ ] Disk space cukup untuk file

---

## 📞 Support

**Jika ada masalah**:
1. Check troubleshooting section
2. Review related documentation
3. Contact IT support

---

**Last Updated**: Februari 2026  
**Version**: 1.0  
**Status**: ✅ READY TO USE

