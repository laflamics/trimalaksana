# Import JSON to PostgreSQL - Complete Guide

**Date**: February 2026  
**Status**: ✅ Ready to Import

---

## 📊 Data Summary

### Files Location
```
scripts/master/packaging/
```

### Packaging Module
- ✅ `salesOrders.json` - 33 sales orders
- ✅ `invoices.json` - 71 invoices
- ✅ `deliveryNotes.json` - 125 delivery notes
- **Storage Key**: `packaging_salesOrders`, `packaging_invoices`, `packaging_deliveryNotes`

### General Trading Module
- ✅ `gt_salesOrders.json` - 47 sales orders
- ✅ `gt_invoices.json` - 59 invoices
- ✅ `gt_deliveryNotes.json` - 56 delivery notes
- **Storage Key**: `gt_salesOrders`, `gt_invoices`, `gt_deliveryNotes`

### Trucking Module
- ✅ `trucking_invoices.json` - 23 invoices
- ✅ `trucking_deliveryNotes.json` - 31 delivery notes
- ✅ `trucking_deliveryOrders.json` - 23 delivery orders
- **Storage Key**: `trucking_invoices`, `trucking_deliveryNotes`, `trucking_deliveryOrders`

---

## 🚀 Import Command

```bash
node scripts/import-all-json-to-postgres.js http://100.81.50.37:9999
```

### What It Does
1. Reads all JSON files from `scripts/master/packaging/`
2. Wraps data in `{ value: [...] }` format
3. Sends to PostgreSQL via `/api/storage/{storageKey}` endpoint
4. Reports success/failure for each file

### Expected Output
```
🚀 Starting import to: http://100.81.50.37:9999
📁 Reading from: scripts/master/packaging/

📦 Packaging Module
   ✅ Sales Orders: 33 items imported
   ✅ Invoices: 71 items imported
   ✅ Delivery Notes: 125 items imported

🏪 General Trading Module
   ✅ Sales Orders: 47 items imported
   ✅ Invoices: 59 items imported
   ✅ Delivery Notes: 56 items imported

🚚 Trucking Module
   ✅ Invoices: 23 items imported
   ✅ Delivery Notes: 31 items imported
   ✅ Delivery Orders: 23 items imported

✅ All imports completed! Total items: 468
```

---

## 📝 Data Filtering

All data has been filtered to exclude entries from **February 1-9, 2026** (already existing in database).

**Date Range**: February 10, 2026 onwards

---

## 🔍 Data Structure

### Packaging Sales Orders
```json
{
  "id": "so-xxx",
  "soNo": "PO_NUMBER",
  "customer": "CUSTOMER_NAME",
  "status": "OPEN",
  "created": "2026-02-XX",
  "items": [...]
}
```

### General Trading Invoices
```json
{
  "id": "inv_xxx",
  "invoiceNo": "INV_NUMBER",
  "soNo": "SO_NUMBER",
  "customer": "CUSTOMER_NAME",
  "status": "OPEN",
  "created": "2026-02-XX",
  "items": [...]
}
```

### Trucking Delivery Orders
```json
{
  "id": "do_xxx",
  "doNo": "DO_NUMBER",
  "customerName": "CUSTOMER_NAME",
  "status": "Close",
  "items": [...]
}
```

---

## ✅ Pre-Import Checklist

- [ ] PostgreSQL server is running at `http://100.81.50.37:9999`
- [ ] All JSON files exist in `scripts/master/packaging/`
- [ ] Network connection to server is stable
- [ ] No duplicate data in database (Feb 1-9 already filtered out)

---

## 🛠️ Troubleshooting

### Connection Error
```
❌ API Error: connect ECONNREFUSED
```
**Solution**: Check if PostgreSQL server is running at the correct URL

### Timeout Error
```
❌ API Error: timeout of 60000ms exceeded
```
**Solution**: Increase timeout or check server performance

### Data Format Error
```
❌ API Error: Invalid data format
```
**Solution**: Verify JSON files are valid and properly formatted

---

## 📞 Support

For issues or questions, check:
1. PostgreSQL server logs
2. API endpoint response
3. JSON file structure

---

**Last Updated**: February 2026  
**Version**: 1.0  
**Status**: ✅ Ready for Production
