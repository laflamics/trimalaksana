# Lokasi Data Storage

## Setelah Klik "Seed Database" di UI

**Lokasi:** `d:\trimalaksana2\data\localStorage\`

**File yang akan dibuat:**
- `staff.json`
- `customers.json`
- `suppliers.json`
- `products.json` (jika ada)
- dll

## Cara Cek

1. **Via File Explorer:**
   - Buka folder: `d:\trimalaksana2\data\`
   - Cari folder `localStorage\`
   - File JSON akan ada di sana

2. **Via Terminal:**
   ```bash
   node scripts/check-storage-location.js
   ```

3. **Via DevTools:**
   - Buka Electron app
   - Tekan `Ctrl+Shift+I`
   - Lihat Console untuk log: `✓ Saved staff to: ...`

## Catatan

- Folder `data/localStorage/` akan dibuat **otomatis** saat pertama kali klik "Seed Database"
- Jika folder belum ada, berarti:
  1. Belum klik "Seed Database" di UI, atau
  2. Ada error saat save (cek Console di DevTools)

## Troubleshooting

Jika folder tidak muncul:
1. Buka DevTools (Ctrl+Shift+I)
2. Cek Console untuk error messages
3. Pastikan Electron app sudah rebuild (`npm run build:main`)
4. Restart Electron app
5. Coba klik "Seed Database" lagi

