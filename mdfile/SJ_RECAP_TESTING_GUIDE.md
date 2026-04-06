# SJ Recap Product Code Display - Testing Guide

**Date**: February 2026  
**Component**: Packaging Delivery Note Module  
**Feature**: Product Code Display Selection

---

## Quick Test Steps

### Test 1: Create Delivery Note with Product Code Display

1. **Navigate to Packaging → Delivery Notes**
2. **Click "Create New"**
3. **Fill in form**:
   - SJ No: `SJ-TEST-001`
   - SO No: `SO-001`
   - Customer: `SANOH INDONESIA, PT`
   - Delivery Date: Today
   - **Product Code Display: Select "Product Code (SKU)"** ← IMPORTANT
   - Driver: `John Doe`
   - Vehicle No: `B-1234-ABC`

4. **Click Save**
5. **Verify**: Delivery note appears in list with status DRAFT

### Test 2: Generate SJ Recap PDF with Product Code

1. **Find the delivery note you just created**
2. **Click "PDF" button**
3. **Verify PDF opens in new window**
4. **Check PRODUCT CODE column**:
   - ✅ Should show: `KRT09916` (product code/SKU)
   - ❌ Should NOT show: `TR7` (pad code)
   - ❌ Should NOT show: `PL0023` (old pad code)

### Test 3: Test with Pad Code Display

1. **Edit the delivery note**
2. **Change "Product Code Display" to "Pad Code"**
3. **Click Save**
4. **Generate PDF again**
5. **Verify PRODUCT CODE column**:
   - ✅ Should show: `TR7` (pad code)
   - ❌ Should NOT show: `KRT09916` (product code)

### Test 4: Test All 4 Template Types

1. **In the PDF view, look for template selector** (if available)
2. **Test each template**:
   - Template 1: Standard Recap
   - Template 2: Recap dengan PO
   - Template 3: Recap dengan SJ List
   - Template 4: Recap Lengkap

3. **For each template**:
   - Verify PRODUCT CODE column displays correctly
   - Verify description column shows correct info (PO, SJ, or both)

---

## Expected Behavior

### When "Product Code (SKU)" is selected:
```
NO | PRODUCT CODE | ITEM                                    | QTY | UOM | DESCRIPTION
1  | KRT09916     | BOX 1050 X 260 X 115 SNI 03            | 100 | PCS | PO: SO-001
2  | KRT12737     | BOX 735 X 255 X 200 SNI 09             | 50  | PCS | PO: SO-001
```

### When "Pad Code" is selected:
```
NO | PRODUCT CODE | ITEM                                    | QTY | UOM | DESCRIPTION
1  | TR7          | BOX 1050 X 260 X 115 SNI 03            | 100 | PCS | PO: SO-001
2  | TR7          | BOX 735 X 255 X 200 SNI 09             | 50  | PCS | PO: SO-001
```

---

## Console Debugging

**Open Browser DevTools (F12) → Console tab**

### Expected Logs When Generating PDF:

```
[getProductCodeByMode] displayMode=productId, returning: KRT09916 from product: {
  id: "1771711159523-0-tlzym2450",
  kode: "KRT09916",
  product_id: "KRT09916",
  padCode: "TR7",
  nama: "BOX 1050 X 260 X 115 SNI 03",
  ...
}

[getItemsHtml] Called with displayMode: productId items count: 2
[getItemsHtml] Item 0: productCode="", product="BOX 1050 X 260 X 115 SNI 03"
[getItemsHtml] Item 0: productCode is empty or looks like name, searching master...
[getItemsHtml] Item 0: Found master product, productCode now="KRT09916"
[getItemsHtml] Item 1: productCode="", product="BOX 735 X 255 X 200 SNI 09"
[getItemsHtml] Item 1: productCode is empty or looks like name, searching master...
[getItemsHtml] Item 1: Found master product, productCode now="KRT12737"
```

### If Pad Code is selected:

```
[getProductCodeByMode] displayMode=padCode, returning: TR7 from product: {...}
[getItemsHtml] Called with displayMode: padCode items count: 2
[getItemsHtml] Item 0: Found master product, productCode now="TR7"
[getItemsHtml] Item 1: Found master product, productCode now="TR7"
```

---

## Troubleshooting

### Issue: PDF still shows pad code instead of product code

**Solution**:
1. Check browser console for errors
2. Verify `productCodeDisplay` is being passed to template
3. Check that master product has `product_id` and `kode` fields
4. Clear browser cache and reload

### Issue: Product code lookup fails

**Solution**:
1. Verify product name in delivery note matches master product name exactly
2. Check console logs for "Found master product" message
3. If not found, product code will be empty

### Issue: PDF doesn't open

**Solution**:
1. Check browser popup blocker settings
2. Try right-click → "Open in new tab"
3. Check browser console for JavaScript errors

---

## Data Validation

### Verify Storage

**Open Browser DevTools → Application → Local Storage**

Look for key: `delivery` (or `packaging_delivery`)

Expected structure:
```json
{
  "id": "DN-1234567890",
  "sjNo": "SJ-TEST-001",
  "soNo": "SO-001",
  "customer": "SANOH INDONESIA, PT",
  "productCodeDisplay": "productId",
  "items": [
    {
      "product": "BOX 1050 X 260 X 115 SNI 03",
      "productCode": "",
      "qty": 100,
      "unit": "PCS"
    }
  ],
  "status": "DRAFT",
  "createdAt": "2026-02-06T...",
  "updatedAt": "2026-02-06T..."
}
```

---

## Success Criteria

✅ **Test 1**: Delivery note created and saved  
✅ **Test 2**: PDF generated with correct product code (KRT09916, not TR7)  
✅ **Test 3**: Pad code option works correctly  
✅ **Test 4**: All 4 templates display product code correctly  
✅ **Console**: Logs show correct displayMode and product code lookup  
✅ **Storage**: `productCodeDisplay` field is stored in delivery note  

---

## Files to Check

1. **src/pages/Packaging/DeliveryNote.tsx**
   - Verify `productCodeDisplay` state is managed
   - Verify it's passed to template rendering

2. **src/pdf/packaging-delivery-recap-templates.ts**
   - Verify `getProductCodeByMode()` function
   - Verify all 4 template functions pass `displayMode`
   - Verify `getItemsHtml()` uses `displayMode`

3. **Browser Console**
   - Check for errors
   - Verify logging output

---

## Next Steps After Testing

1. ✅ Verify all tests pass
2. ✅ Check console logs for any errors
3. ✅ Test with multiple products
4. ✅ Test with different customers
5. ✅ Deploy to production
6. ✅ Monitor for any issues

---

**Ready to Test!** 🚀
