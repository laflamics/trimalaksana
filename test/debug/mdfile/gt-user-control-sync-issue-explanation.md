# GT User Control Cross-Device Sync Issue - Root Cause Analysis

## 🔍 MASALAH UTAMA

GT User Control kosong di device lain karena **file GT-specific userAccessControl.json memiliki struktur data yang salah**.

## 📊 KONDISI SAAT INI

### File Utama (`data/localStorage/userAccessControl.json`)
```json
{
  "value": [
    { "id": "usr-xxx", "fullName": "AGUNG", "businessUnits": ["general-trading"] },
    { "id": "usr-yyy", "fullName": "ALI", "businessUnits": ["packaging", "general-trading"] },
    // ... 25+ users total
  ],
  "timestamp": 1768037184783
}
```
✅ **STATUS**: BAIK - Ada 25+ users, beberapa untuk GT

### File GT (`data/localStorage/general-trading/userAccessControl.json`)
```json
{
  "value": {},
  "timestamp": 0,
  "_timestamp": 0
}
```
❌ **STATUS**: RUSAK - `value` adalah object kosong `{}` bukan array `[]`

## 🔄 BAGAIMANA SYNC SEHARUSNYA BEKERJA

### 1. Storage Key Strategy
- GT User Control menggunakan key `'userAccessControl'` (tanpa prefix)
- Storage service menambahkan business context: `general-trading/userAccessControl`
- File disimpan di: `data/localStorage/general-trading/userAccessControl.json`

### 2. Data Flow Normal
```
Device A (GT) → Create User → Save to 'userAccessControl' 
                                ↓
                    File: general-trading/userAccessControl.json
                                ↓
Device B (GT) → Load 'userAccessControl' → Read from same file → Show users
```

### 3. Data Structure Expected
```json
{
  "value": [
    { "id": "usr-1", "fullName": "User1", "businessUnits": ["general-trading"] },
    { "id": "usr-2", "fullName": "User2", "businessUnits": ["packaging"] }
  ],
  "timestamp": 1768037184783
}
```

## 🚨 ROOT CAUSE ANALYSIS

### Primary Issue: **CORRUPTED GT FILE STRUCTURE**
- File GT memiliki `"value": {}` (object) bukan `"value": []` (array)
- GT User Control expect array, dapat object → crash/empty
- Timestamp = 0 menunjukkan file tidak pernah di-sync dengan benar

### Secondary Issues:

1. **SYNC SERVICE TIDAK INCLUDE USER CONTROL**
   - GT Sync service (`src/services/gt-sync.ts`) tidak handle `userAccessControl`
   - Hanya handle data operasional (sales orders, products, dll)
   - User control data tidak ter-sync antar device

2. **STORAGE SERVICE BUSINESS CONTEXT**
   - Storage service menambahkan prefix business context
   - GT: `general-trading/userAccessControl`
   - Packaging: `userAccessControl` (no prefix)
   - Trucking: `trucking/userAccessControl`

3. **MIGRATION LOGIC ISSUE**
   - GT User Control ada logic merge dari old keys
   - Tapi jika GT file corrupt, merge logic gagal
   - Fallback ke empty array

## 💊 SOLUSI LENGKAP

### 1. IMMEDIATE FIX - Perbaiki File GT
```bash
# Copy data dari main file ke GT file dengan struktur yang benar
cp data/localStorage/userAccessControl.json data/localStorage/general-trading/userAccessControl.json
```

### 2. LONG-TERM FIX - Update Sync Service
```typescript
// Tambahkan userAccessControl ke GT sync service
const syncKeys = [
  'gt_salesOrders',
  'gt_products', 
  'gt_customers',
  'userAccessControl', // ← ADD THIS
  // ... other keys
];
```

### 3. PREVENTION - Add Validation
```typescript
// Di storage service, validate structure
if (key === 'userAccessControl' && data.value && !Array.isArray(data.value)) {
  console.warn('Invalid userAccessControl structure, fixing...');
  data.value = [];
}
```

## 🎯 KENAPA TERJADI?

1. **Initial Setup**: File GT dibuat dengan struktur salah (object bukan array)
2. **No Validation**: Storage service tidak validate struktur data
3. **Sync Gap**: User control tidak included dalam sync mechanism
4. **Silent Failure**: GT User Control tidak error, hanya tampil kosong

## 🔧 QUICK FIX COMMAND

```bash
# Backup current GT file
cp data/localStorage/general-trading/userAccessControl.json data/localStorage/general-trading/userAccessControl.json.backup

# Copy main file to GT location
cp data/localStorage/userAccessControl.json data/localStorage/general-trading/userAccessControl.json

# Verify fix
echo "GT file should now have proper user data"
```

## ✅ VERIFICATION STEPS

1. Check GT file has proper array structure
2. Test GT User Control on different devices
3. Verify users appear correctly
4. Test create/edit functionality
5. Confirm cross-device sync works

---

**KESIMPULAN**: Masalah utama adalah file GT memiliki `value: {}` bukan `value: []`. Fix dengan copy data dari main file ke GT file, lalu update sync service untuk include user control data.