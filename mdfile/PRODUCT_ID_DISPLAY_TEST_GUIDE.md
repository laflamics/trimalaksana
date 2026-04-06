# Product ID Display - Test Guide

**Date**: March 6, 2026  
**Status**: Ready for Testing

---

## Quick Test Steps

### Test 1: Create Delivery Note with Pad Code (Default)

1. Go to **Packaging → Delivery Note**
2. Click **+ Create Delivery Note**
3. Select mode: **By SO** (or any mode)
4. Select a Sales Order
5. Leave **Product Code Display** as **"Pad Code (default...)"** ← Default
6. Click **Create**
7. Click **Generate SJ** on the created delivery note
8. Click **Print** or **View**
9. **Expected**: Product code column shows **Pad Code** (e.g., "PAD-001")

---

### Test 2: Create Delivery Note with Product ID

1. Go to **Packaging → Delivery Note**
2. Click **+ Create Delivery Note**
3. Select mode: **By SO** (or any mode)
4. Select a Sales Order
5. Change **Product Code Display** to **"Product ID / SKU ID"** ← Important!
6. Click **Create**
7. Click **Generate SJ** on the created delivery note
8. Click **Print** or **View**
9. **Expected**: Product code column shows **Product ID** (e.g., "PROD-123" or "SKU-456")

---

### Test 3: Verify Fallback Chain

**Scenario**: Product has no Product ID but has Code (kode)

1. Create a Delivery Note with **Product ID / SKU ID** selected
2. If the product has:
   - ❌ No `product_id`
   - ❌ No `id`
   - ✅ Has `kode` (Code)
3. **Expected**: Should display the `kode` value (fallback)

---

### Test 4: Edit Existing Delivery Note

1. Go to **Packaging → Delivery Note**
2. Find an existing delivery note
3. Click **⋮ (menu)** → **Edit**
4. Change **Product Code Display** option
5. Click **Save**
6. Click **Print** or **View**
7. **Expected**: Product code display should change according to selection

---

### Test 5: SJ Recap Template

1. Create multiple Delivery Notes
2. Go to **Delivery Note** → **SJ Recap** tab
3. Select multiple SJs to merge
4. Change **Product Code Display** option
5. Click **Create SJ Recap**
6. Click **Print** or **View**
7. **Expected**: Product code display should match the selected option

---

## What to Check

### ✅ Correct Behavior

- [ ] Pad Code option shows Pad Code values
- [ ] Product ID option shows Product ID values
- [ ] Fallback chain works (if primary code missing, shows fallback)
- [ ] Edit dialog preserves the selected option
- [ ] SJ Recap respects the selected option
- [ ] Both regular SJ and SJ Recap templates work
- [ ] Print preview shows correct codes
- [ ] PDF export shows correct codes

### ❌ Incorrect Behavior (Report if Found)

- [ ] Product ID option still shows Pad Code
- [ ] Pad Code option shows Product ID
- [ ] Selection not saved when editing
- [ ] SJ Recap ignores the selection
- [ ] Fallback chain doesn't work
- [ ] Print/PDF shows wrong codes

---

## Product Code Priority

### When "Pad Code" is selected:
```
1. Pad Code (padCode)
2. Code (kode)
3. KRT (kodeIpos)
4. SKU (sku)
5. ID (id)
6. Default Code
```

### When "Product ID / SKU ID" is selected:
```
1. Product ID (product_id)
2. ID (id)
3. Code (kode)
4. Pad Code (padCode)
5. KRT (kodeIpos)
6. SKU (sku)
7. Default Code
```

---

## Database Fields

The following fields are used:

| Field | Description | Example |
|-------|-------------|---------|
| `product_id` | Product ID from master | "PROD-123" |
| `id` | System ID | "SKU-456" |
| `kode` | Product Code | "CODE-789" |
| `padCode` | Pad Code | "PAD-001" |
| `kodeIpos` | KRT Code | "KRT-111" |
| `sku` | SKU | "SKU-222" |

---

## Files Modified

- `src/pdf/suratjalan-pdf-template.ts` - Fixed both `getProductCode()` functions
- `src/pdf/packaging-delivery-recap-templates.ts` - Already correct ✅

---

## Troubleshooting

### Issue: Still showing Pad Code when Product ID selected

**Solution**:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Refresh page (Ctrl+F5)
3. Create a new Delivery Note (don't edit old ones)
4. Verify the selection is saved in the form

### Issue: Product code shows as "-" or blank

**Solution**:
1. Check if product exists in master data
2. Verify product has at least one code field filled
3. Check fallback chain - should show something

### Issue: SJ Recap not respecting selection

**Solution**:
1. Verify `productCodeDisplay` is passed to recap template
2. Check if recap template is using the correct function
3. Try creating a new SJ Recap (don't edit old ones)

---

## Performance Notes

- No performance impact (same logic, just different priority)
- Caching not affected
- Database queries unchanged

---

## Rollback Plan

If issues found:
1. Revert `src/pdf/suratjalan-pdf-template.ts` to previous version
2. Default behavior (Pad Code) will be restored
3. No data loss

---

**Ready to Test**: ✅ Yes
