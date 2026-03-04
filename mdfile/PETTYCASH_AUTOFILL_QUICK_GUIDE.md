# Petty Cash Auto-Fill Amount - Quick Guide

**Status**: ✅ LIVE  
**Feature**: Auto-fill amount from DO when editing old petty cash requests

---

## 🎯 What It Does

When you edit a petty cash request that has:
- `amount = 0` (empty)
- `doNo` = valid delivery order number

The system automatically fills in the amount from the DO's `totalDeal` field.

---

## 📱 How to Use

### Step 1: Open Petty Cash Module
Go to **Trucking** → **Finance** → **Petty Cash**

### Step 2: Find Old Request with amount=0
Look for requests like:
- PC-20260302-4637: amount = Rp 0, doNo = DO-20260302-4311
- PC-20260302-1053: amount = Rp 0, doNo = DO-20260302-6002

### Step 3: Click Edit
Click the **⋮** (three dots) menu → **✏️ Edit**

### Step 4: See Auto-Filled Amount
- Form opens
- Amount field automatically shows the DO's totalDeal
- Toast notification: "💰 Amount auto-filled dari DO: Rp X.XXX.XXX"

### Step 5: Save
Click **Save** button to save the request with the auto-filled amount

---

## ✨ Examples

### Example 1: PC-20260302-4637
```
Before Edit:
- amount: Rp 0 ❌
- doNo: DO-20260302-4311

After Click Edit:
- amount: Rp 1.900.000 ✅ (auto-filled from DO)
- Toast: "💰 Amount auto-filled dari DO: Rp 1.900.000"

After Save:
- amount: Rp 1.900.000 ✅ (saved)
```

### Example 2: PC-20260302-9981
```
Before Edit:
- amount: Rp 1.100.000 ✅ (already has amount)
- doNo: DO-20260302-9981

After Click Edit:
- amount: Rp 1.100.000 ✅ (no change, already filled)
- No toast (no auto-fill needed)
```

---

## 🔍 When Auto-Fill Happens

✅ **Auto-fill WILL happen when**:
- amount = 0
- doNo exists and is valid
- Matching DO found in system
- DO has totalDeal > 0

❌ **Auto-fill WON'T happen when**:
- amount > 0 (already filled)
- doNo is empty/null
- Matching DO not found
- DO's totalDeal = 0

---

## 💡 Tips

1. **Check Console**: Open browser DevTools (F12) → Console to see auto-fill logs
   - Look for: `[PettyCash] 💰 Auto-filled amount from DO`

2. **Verify DO**: If amount doesn't auto-fill, check if:
   - DO number is correct
   - DO exists in system
   - DO has totalDeal value

3. **Manual Entry**: If auto-fill doesn't work, you can still manually enter the amount

---

## 🐛 Troubleshooting

### Amount not auto-filling?

**Check 1**: Is the amount currently 0?
- If amount > 0, no auto-fill happens
- This is by design (don't overwrite existing data)

**Check 2**: Does the request have a doNo?
- If doNo is empty, no auto-fill possible
- Check the "DO No" column

**Check 3**: Does the DO exist?
- Go to Delivery Orders module
- Search for the doNo
- If not found, auto-fill can't work

**Check 4**: Does the DO have totalDeal?
- Open the DO
- Check if totalDeal field has a value > 0
- If totalDeal = 0, auto-fill won't happen

### Still not working?

1. Refresh the page (F5)
2. Check browser console for errors
3. Contact support with:
   - Request number (e.g., PC-20260302-4637)
   - DO number (e.g., DO-20260302-4311)
   - Screenshot of the issue

---

## 📊 Data Examples

### Requests that WILL auto-fill
| Request No | Amount | DO No | Status | Will Auto-Fill? |
|-----------|--------|-------|--------|-----------------|
| PC-20260302-4637 | 0 | DO-20260302-4311 | Open | ✅ YES |
| PC-20260302-1053 | 0 | DO-20260302-6002 | Open | ✅ YES |
| PC-20260302-8105 | 0 | DO-20260302-4475 | Open | ✅ YES |

### Requests that WON'T auto-fill
| Request No | Amount | DO No | Status | Will Auto-Fill? |
|-----------|--------|-------|--------|-----------------|
| PC-20260302-9981 | 1.100.000 | DO-20260302-9981 | Open | ❌ NO (already filled) |
| PC-20260302-0300 | 1.200.000 | DO-20260302-7861 | Open | ❌ NO (already filled) |
| PC-20260302-XXXX | 0 | (empty) | Open | ❌ NO (no DO) |

---

## 🎓 How It Works (Technical)

1. User clicks Edit on a petty cash request
2. System checks: `amount === 0 AND doNo exists?`
3. If YES:
   - Load all Delivery Orders from storage
   - Find matching DO by doNo
   - Extract `totalDeal` from DO
   - Set form amount = totalDeal
   - Show toast notification
4. If NO:
   - Load form with current amount
   - No auto-fill
5. User can now edit and save

---

## 📞 Support

**Issue**: Auto-fill not working  
**Solution**: See Troubleshooting section above

**Issue**: Amount auto-filled incorrectly  
**Solution**: Check DO's totalDeal value, or manually correct the amount

**Issue**: Other questions  
**Contact**: support@trimalaksana.com

---

**Last Updated**: March 3, 2026  
**Version**: 1.0

