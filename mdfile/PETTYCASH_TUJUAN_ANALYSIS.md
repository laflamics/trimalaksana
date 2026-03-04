# Petty Cash Tujuan Field Analysis

**Issue**: Tujuan field menampilkan `3767` (customer code) padahal seharusnya destination/route name

**Data dari output**:
```
Customer: PRAYITNO
Tujuan: 3767  ← SALAH! Ini customer code, bukan destination
Unit: TLJP
Uraian: B 9619 FXWPC-20260302-1826
```

---

## 🔍 Root Cause Analysis

### Current Logic (PettyCash.tsx line 1677)
```typescript
tujuan = doItem.routeName || extractTujuanFromPurpose(req.purpose || '', req.description || '') || '';
```

### Flow
1. **Try 1**: `doItem.routeName` 
   - Jika ada DO, ambil routeName dari DO
   - Seharusnya berisi destination (e.g., "Jakarta", "Surabaya")
   - **Status**: Mungkin kosong/undefined

2. **Try 2**: `extractTujuanFromPurpose(purpose, description)`
   - Extract dari purpose/description dengan regex pattern
   - **Status**: Return `3767` (salah!)

3. **Fallback**: `''` (empty string)

### extractTujuanFromPurpose Logic
```typescript
const extractTujuanFromPurpose = (purpose: string, description: string): string => {
  // Pattern 1: "... - [Tujuan]" (last dash-separated value)
  const purposeMatch = purpose.match(/-\s*([^-]+)$/);
  if (purposeMatch) {
    return purposeMatch[1].trim();  // ← Ini yang return 3767!
  }
  
  // Pattern 2: "Route: [value]"
  const routeMatch = description.match(/Route:\s*([^\n]+)/i);
  if (routeMatch) {
    return routeMatch[1].trim();
  }
  
  // Pattern 3: "A - B" format
  const dashMatch = purpose.match(/([A-Za-z\s]+)\s*-\s*([A-Za-z\s]+)$/);
  if (dashMatch && dashMatch[2]) {
    return dashMatch[2].trim();
  }
  
  return '';
};
```

**Masalah**: Pattern 1 match `purpose` yang berakhir dengan `- 3767`, jadi return `3767`.

---

## 📊 Kemungkinan Format Purpose/Description

Dari data yang ada, `purpose` atau `description` mungkin:

```
Format 1: "Uang jalan untuk DO DO-20260302-1826 - 3767"
          ↑ Match pattern 1 → return "3767"

Format 2: "Uang jalan untuk DO DO-20260302-1826 - PRAYITNO - 3767"
          ↑ Match pattern 1 → return "3767"

Format 3: "Uang jalan untuk DO DO-20260302-1826 - Jakarta - Surabaya"
          ↑ Match pattern 1 → return "Surabaya" ✓ (correct)
```

**Kesimpulan**: Data yang dikirim punya format `"... - [CustomerCode]"` bukan `"... - [Destination]"`.

---

## ❌ Masalah

1. **Data Format Salah**: Purpose/description berisi customer code, bukan destination
2. **Extract Logic Terlalu Permisif**: Regex match apapun yang ada di akhir setelah dash
3. **Tidak Ada Validation**: Tidak check apakah hasil extract adalah valid destination

---

## ✅ Solusi

### Option 1: Fix Data Format (Recommended)
Pastikan `purpose` atau `description` berisi destination, bukan customer code:

```
BEFORE: "Uang jalan untuk DO DO-20260302-1826 - 3767"
AFTER:  "Uang jalan untuk DO DO-20260302-1826 - Jakarta"
```

### Option 2: Improve Extract Logic
Tambah validation untuk check apakah hasil extract adalah valid destination:

```typescript
const extractTujuanFromPurpose = (purpose: string, description: string): string => {
  // Pattern 1: "... - [Tujuan]"
  const purposeMatch = purpose.match(/-\s*([^-]+)$/);
  if (purposeMatch) {
    const extracted = purposeMatch[1].trim();
    // Validate: bukan angka (customer code)
    if (!/^\d+$/.test(extracted)) {
      return extracted;
    }
  }
  
  // ... rest of logic
};
```

### Option 3: Use DO Data Directly
Jika ada DO, gunakan `doItem.routeName` atau `doItem.destination`:

```typescript
// Pastikan DO punya field destination
tujuan = doItem.destination || doItem.routeName || '';
```

---

## 🎯 Recommended Fix

1. **Check DO structure**: Pastikan DeliveryOrder punya field `destination`
2. **Update logic**: 
   ```typescript
   tujuan = doItem.destination || doItem.routeName || extractTujuanFromPurpose(...) || '';
   ```
3. **Improve extract function**: Tambah validation untuk skip numeric values
4. **Test data**: Pastikan purpose/description punya format yang benar

---

## 📝 Action Items

- [ ] Check actual `purpose` dan `description` value di database
- [ ] Verify DeliveryOrder structure (apakah ada `destination` field?)
- [ ] Update `extractTujuanFromPurpose()` dengan validation
- [ ] Test dengan data yang benar
- [ ] Update data format jika perlu

