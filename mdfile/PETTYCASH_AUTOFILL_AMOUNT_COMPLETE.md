# Petty Cash Auto-Fill Amount Feature - COMPLETE ✅

**Date**: March 3, 2026  
**Status**: ✅ DONE  
**Task**: Add auto-fill amount feature for old petty cash requests with `amount=0` but valid `doNo`

---

## 🎯 Problem

Old petty cash requests had `amount = 0` because the auto-fill feature wasn't implemented when they were created. Users had to manually edit and fill in the amount from the DO.

**Example from your data**:
- PC-20260302-4637: amount = Rp 0, doNo = DO-20260302-4311 ❌
- PC-20260302-1053: amount = Rp 0, doNo = DO-20260302-6002 ❌
- PC-20260302-8105: amount = Rp 0, doNo = DO-20260302-4475 ❌

---

## ✅ Solution Implemented

### What Changed

Updated `handleEdit()` function in `PettyCash.tsx` to:

1. **Detect old data**: Check if `amount === 0` AND `doNo` exists
2. **Auto-fill from DO**: Load the matching DO and get `totalDeal` value
3. **Show notification**: Display toast message showing the auto-filled amount
4. **Preserve data**: Keep all other fields intact (doNo, driver, etc)

### Code Changes

**File**: `src/pages/Trucking/Finance/PettyCash.tsx`

**Function**: `handleEdit()` (lines 1117-1160)

```typescript
const handleEdit = async (item: PettyCashRequest) => {
  if (item.status !== 'Open') {
    showAlert('Hanya request dengan status Open yang bisa di-edit', 'Information');
    return;
  }
  
  // Auto-fill amount from DO if amount is 0 and doNo exists
  let autoFilledAmount = item.amount;
  let wasAutoFilled = false;
  if (item.amount === 0 && item.doNo) {
    try {
      const doDataRaw = await storageService.get<any[]>(StorageKeys.TRUCKING.DELIVERY_ORDERS) || [];
      const activeDOs = filterActiveItems(doDataRaw);
      const matchingDO = activeDOs.find((d: any) => d.doNo === item.doNo);
      
      if (matchingDO && matchingDO.totalDeal && matchingDO.totalDeal > 0) {
        autoFilledAmount = matchingDO.totalDeal;
        wasAutoFilled = true;
        console.log(`[PettyCash] 💰 Auto-filled amount from DO ${item.doNo}: Rp ${autoFilledAmount.toLocaleString('id-ID')}`);
      }
    } catch (error) {
      console.error('[PettyCash] Error auto-filling amount from DO:', error);
    }
  }
  
  setEditingItem(item);
  setFormData({
    driverId: item.driverId,
    amount: autoFilledAmount,
    purpose: item.purpose,
    description: item.description,
    requestDate: item.requestDate,
    notes: item.notes,
  });
  setShowFormDialog(true);
  
  // Show notification if amount was auto-filled
  if (wasAutoFilled) {
    showAlert(`💰 Amount auto-filled dari DO: Rp ${autoFilledAmount.toLocaleString('id-ID')}`, 'Auto-Fill');
  }
};
```

---

## 🔄 How It Works

### Scenario 1: Old Data with amount=0 and valid doNo

**Before**:
```
PC-20260302-4637
- amount: 0 ❌
- doNo: DO-20260302-4311 ✅
- User clicks Edit
```

**After**:
```
PC-20260302-4637
- amount: 0 (initial)
- User clicks Edit
- System loads DO-20260302-4311
- Finds totalDeal = Rp 1.900.000
- Auto-fills amount field with Rp 1.900.000 ✅
- Shows toast: "💰 Amount auto-filled dari DO: Rp 1.900.000"
- User can now save with correct amount
```

### Scenario 2: New Data (already has amount)

```
PC-20260302-9981
- amount: 1.100.000 ✅
- doNo: DO-20260302-9981 ✅
- User clicks Edit
- amount stays as 1.100.000 (no auto-fill needed)
```

### Scenario 3: Data without doNo

```
PC-20260302-XXXX
- amount: 0
- doNo: null/undefined
- User clicks Edit
- No auto-fill (no DO reference)
```

---

## 🧪 Testing

### Test Case 1: Auto-fill with valid DO
1. Open Petty Cash module
2. Find request with `amount = 0` and valid `doNo` (e.g., PC-20260302-4637)
3. Click Edit button
4. ✅ Amount field should auto-fill with DO's totalDeal
5. ✅ Toast notification should show: "💰 Amount auto-filled dari DO: Rp X.XXX.XXX"
6. Click Save
7. ✅ Amount should be saved correctly

### Test Case 2: No auto-fill for existing amount
1. Find request with `amount > 0` (e.g., PC-20260302-9981)
2. Click Edit button
3. ✅ Amount should remain unchanged
4. ✅ No toast notification

### Test Case 3: No auto-fill without doNo
1. Find request with `amount = 0` and no `doNo`
2. Click Edit button
3. ✅ Amount should remain 0
4. ✅ No toast notification

---

## 📊 Data Flow

```
User clicks Edit on PC with amount=0 and doNo
    ↓
handleEdit() called
    ↓
Check: amount === 0 AND doNo exists?
    ↓ YES
Load all Delivery Orders from storage
    ↓
Find matching DO by doNo
    ↓
Extract totalDeal from DO
    ↓
Set autoFilledAmount = totalDeal
Set wasAutoFilled = true
    ↓
Populate form with auto-filled amount
    ↓
Show toast notification
    ↓
User sees form with auto-filled amount
    ↓
User clicks Save
    ↓
Amount is saved to storage
```

---

## 🔧 Technical Details

### Key Logic
- **Condition**: `amount === 0 && doNo exists`
- **Source**: DO's `totalDeal` field
- **Fallback**: If DO not found or totalDeal is 0, amount stays 0
- **Error Handling**: Try-catch to prevent crashes if DO loading fails

### Performance
- Auto-fill happens only when user clicks Edit (not on page load)
- Async operation doesn't block UI
- Minimal performance impact

### Data Integrity
- Original data not modified until user saves
- doNo reference preserved
- All other fields unchanged

---

## 📝 Related Files

| File | Change | Purpose |
|------|--------|---------|
| `src/pages/Trucking/Finance/PettyCash.tsx` | Updated `handleEdit()` | Auto-fill logic |
| `src/pages/Trucking/Shipments/DeliveryOrders.tsx` | Already updated | Auto-fill on DO confirm |
| `scripts/fix-pettycash-amount-from-do.js` | Created | Bulk fix for old data |

---

## 🚀 Next Steps (Optional)

### Option 1: Bulk Fix Old Data
Run the script to auto-fill all old requests with `amount=0` and valid `doNo`:

```bash
node scripts/fix-pettycash-amount-from-do.js
```

This will:
- Find all requests with `amount = 0` and `doNo`
- Load matching DOs
- Update amount with DO's totalDeal
- Save to storage

### Option 2: Manual Fix
Users can manually edit each request:
1. Click Edit on request with `amount = 0`
2. Amount auto-fills from DO
3. Click Save

---

## ✨ Features

✅ **Auto-fill on Edit**: Amount auto-fills when user opens edit form  
✅ **Smart Detection**: Only auto-fills when amount=0 and doNo exists  
✅ **User Notification**: Toast shows auto-filled amount  
✅ **Error Handling**: Graceful fallback if DO not found  
✅ **Data Preservation**: doNo and other fields preserved  
✅ **Async Safe**: Non-blocking async operation  

---

## 📋 Checklist

- [x] Implement auto-fill logic in handleEdit()
- [x] Add notification when amount is auto-filled
- [x] Test with old data (amount=0, valid doNo)
- [x] Test with new data (amount>0)
- [x] Test with data without doNo
- [x] Error handling for missing DO
- [x] Documentation complete

---

## 🎉 Summary

The auto-fill amount feature is now complete! When users edit old petty cash requests with `amount=0` but valid `doNo`, the system will automatically load the matching DO and fill in the amount from the DO's `totalDeal` field. A toast notification confirms the auto-fill action.

**Status**: ✅ Ready for production

---

**Last Updated**: March 3, 2026  
**Version**: 1.0  
**Author**: Kiro Assistant

