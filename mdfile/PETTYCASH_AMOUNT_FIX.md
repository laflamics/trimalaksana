# Petty Cash Amount Fix - Old Data

**Issue**: Data petty cash yang sudah masuk punya `amount = 0` karena belum ada auto-fill dari DO

**Solution**: Ada 2 cara untuk fix

---

## 🔧 Opsi 1: Manual Fix (Recommended untuk sedikit data)

1. Buka Petty Cash module
2. Cari request dengan `amount = 0` dan punya `doNo`
3. Edit → Isi amount manual (atau lihat di DO)
4. Save → `doNo` akan ter-preserve

**Keuntungan**: 
- Simple, langsung
- User bisa verify data saat edit

**Kerugian**:
- Manual, butuh waktu jika banyak data

---

## 🔧 Opsi 2: Bulk Fix via Script (Recommended untuk banyak data)

Script akan auto-fill `amount` dari DO `totalDeal` untuk semua requests dengan `amount = 0` dan punya `doNo`.

### Cara Pakai

```bash
# Run script
node scripts/fix-pettycash-amount-from-do.js
```

### Apa yang dilakukan script

1. Baca semua Petty Cash Requests
2. Baca semua Delivery Orders
3. Untuk setiap request dengan `amount = 0` dan `doNo`:
   - Cari matching DO berdasarkan `doNo`
   - Ambil `totalDeal` dari DO
   - Update `amount` di request
4. Save hasil ke storage

### Output

```
🔧 Starting Petty Cash Amount Fix...

📊 Found 50 Petty Cash Requests
📊 Found 100 Delivery Orders

🔍 Found 15 requests with amount=0 and doNo

✅ PC-20260302-0001: DO-20260302-0001 → amount = Rp 1.900.000
✅ PC-20260302-0002: DO-20260302-0002 → amount = Rp 2.500.000
...

📈 Fixed 15 requests

✅ Petty Cash Amount Fix Complete!

📝 Summary:
   - Total requests: 50
   - Requests with amount=0: 15
   - Fixed: 15
   - Failed: 0
```

---

## 📋 Checklist

- [ ] Backup data sebelum run script
- [ ] Run script: `node scripts/fix-pettycash-amount-from-do.js`
- [ ] Verify hasil di Petty Cash module
- [ ] Test edit & save untuk pastikan `doNo` ter-preserve

---

## 🎯 Setelah Fix

**Old Data**: `amount = 0` → **Fixed**: `amount = totalDeal dari DO`

**New Data** (setelah fix di code):
- Confirm DO → Auto-fill `amount` dari `totalDeal` ✅
- Edit amount → `doNo` ter-preserve ✅

---

## 📝 Notes

- Script hanya fix requests dengan `amount = 0` dan `doNo`
- Requests tanpa `doNo` tidak di-touch
- Requests dengan `amount > 0` tidak di-touch
- Jika DO tidak ditemukan, request tidak di-update

