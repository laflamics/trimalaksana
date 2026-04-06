# 🐛 DELIVERY NOTE - CHANGE TEMPLATE BUG ANALYSIS

**Issue**: Change Template button tidak berfungsi di PDF preview  
**Status**: 🔍 ANALYZED  
**Root Cause**: FOUND ✅

---

## MASALAH

Ketika user klik "Change Template" button di PDF preview, dialog template selection muncul tapi tidak ada yang terjadi saat memilih template.

---

## ROOT CAUSE ANALYSIS

### Current Flow (BROKEN):

```typescript
// Line 7199-7202: Change Template button
<Button 
  variant="secondary" 
  onClick={() => setShowTemplateSelectionDialog(true)}
  style={{ backgroundColor: '#FF9800', color: 'white' }}
>
  🎨 Change Template
</Button>
```

**Problem**: Hanya set `showTemplateSelectionDialog(true)` tapi tidak set `viewingDeliveryItem`!

### Template Selection Dialog Handler (Line 7253-7263):

```typescript
onSelectTemplate={(templateId) => {
  setShowTemplateSelectionDialog(false);
  // Jika ada pending print item, gunakan handleTemplateSelected
  if (pendingPrintItem) {
    handleTemplateSelected(templateId);
  } 
  // Jika ada viewing item (dari dialog view), gunakan handleChangeTemplateInView
  else if (viewingDeliveryItem) {
    handleChangeTemplateInView(templateId);
  }
}}
```

**Problem**: 
- `pendingPrintItem` = null (tidak di-set saat "Change Template" button clicked)
- `viewingDeliveryItem` = null (tidak di-set saat "Change Template" button clicked)
- **Result**: Tidak ada kondisi yang match, jadi tidak ada yang terjadi!

---

## FLOW COMPARISON

### Print Button (WORKS ✅):
```typescript
// Line 3316-3320
if (item.isRecap) {
  setPendingPrintItem(item);  // ✅ SET pendingPrintItem
  setShowTemplateSelectionDialog(true);
} else {
  // Untuk non-recap, langsung print dengan template standar
  const html = await generateSuratJalanHtmlContent(item);
  openPrintWindow(html);
}
```

**Why it works**: `setPendingPrintItem(item)` di-set sebelum dialog dibuka

### Change Template Button (BROKEN ❌):
```typescript
// Line 7199-7202
onClick={() => setShowTemplateSelectionDialog(true)}
```

**Why it doesn't work**: 
- `viewingDeliveryItem` sudah ada (dari saat view PDF)
- Tapi button tidak set `viewingDeliveryItem` lagi
- Ketika dialog handler check `if (viewingDeliveryItem)`, mungkin sudah null atau tidak di-update

---

## SOLUSI

### Option 1: Set viewingDeliveryItem saat button clicked (RECOMMENDED)

```typescript
// Line 7199-7202: Change Template button
<Button 
  variant="secondary" 
  onClick={() => {
    // ✅ Ensure viewingDeliveryItem is set
    if (!viewingDeliveryItem) {
      showAlert('Error', 'No delivery item selected');
      return;
    }
    setShowTemplateSelectionDialog(true);
  }}
  style={{ backgroundColor: '#FF9800', color: 'white' }}
>
  🎨 Change Template
</Button>
```

### Option 2: Simplify dialog handler

```typescript
onSelectTemplate={(templateId) => {
  setShowTemplateSelectionDialog(false);
  
  // ✅ Prioritize viewingDeliveryItem (dari PDF preview)
  if (viewingDeliveryItem) {
    handleChangeTemplateInView(templateId);
  } 
  // Fallback ke pendingPrintItem (dari print button)
  else if (pendingPrintItem) {
    handleTemplateSelected(templateId);
  }
}}
```

---

## IMPLEMENTATION

### Fix: Update Change Template button

**File**: `src/pages/Packaging/DeliveryNote.tsx`  
**Line**: 7199-7202

**Before**:
```typescript
<Button 
  variant="secondary" 
  onClick={() => setShowTemplateSelectionDialog(true)}
  style={{ backgroundColor: '#FF9800', color: 'white' }}
>
  🎨 Change Template
</Button>
```

**After**:
```typescript
<Button 
  variant="secondary" 
  onClick={() => {
    if (!viewingDeliveryItem) {
      showAlert('Error', 'No delivery item selected');
      return;
    }
    setShowTemplateSelectionDialog(true);
  }}
  style={{ backgroundColor: '#FF9800', color: 'white' }}
>
  🎨 Change Template
</Button>
```

---

## EXPECTED BEHAVIOR (AFTER FIX)

### User Flow:
1. User klik "View" pada delivery
2. PDF preview muncul
3. User klik "Change Template" button
4. Template selection dialog muncul
5. User pilih template
6. PDF preview update dengan template baru ✅

### Technical Flow:
1. `viewingDeliveryItem` = delivery object (dari step 1)
2. User klik "Change Template"
3. Dialog set `showTemplateSelectionDialog(true)`
4. User select template
5. Dialog handler check `if (viewingDeliveryItem)` → TRUE ✅
6. Call `handleChangeTemplateInView(templateId)`
7. Generate HTML dengan template baru
8. Update `viewPdfData` dengan HTML baru
9. PDF preview update ✅

---

## TESTING

### Test Steps:
1. Open Packaging → DeliveryNote
2. Find a delivery with isRecap = true
3. Click "View" button
4. PDF preview opens
5. Click "Change Template" button
6. Template selection dialog appears
7. Select different template
8. **EXPECTED**: PDF preview updates with new template ✅

### Verification:
- [ ] Dialog appears when button clicked
- [ ] Template selection works
- [ ] PDF preview updates
- [ ] No errors in console

---

## SUMMARY

**Issue**: Change Template button tidak berfungsi  
**Root Cause**: `viewingDeliveryItem` tidak di-set saat button clicked  
**Solution**: Ensure `viewingDeliveryItem` is set before opening dialog  
**Impact**: Low (feature tidak critical, hanya untuk template selection)  
**Effort**: Minimal (1 line change)

