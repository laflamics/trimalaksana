# Server Data Management

## Overview
Page baru untuk manage data yang tersimpan di server (PostgreSQL) melalui API.

## Lokasi
- **File**: `src/pages/Settings/ServerData.tsx`
- **Route**: `/packaging/settings/server-data`
- **Access**: Settings menu di Packaging module

## Fitur

### 1. View Storage Keys
- Menampilkan list semua storage keys yang ada di server
- Menampilkan jumlah items per key
- Menampilkan last updated timestamp
- Auto-refresh dengan tombol Refresh

### 2. View Data per Key
- Klik tombol "View" untuk melihat data dalam key tertentu
- Menampilkan data dalam format JSON
- Menampilkan jumlah total items

### 3. Delete Items
- **Delete Selected**: Hapus item yang dipilih dengan checkbox
- **Clear All**: Hapus semua data dalam key (kosongkan key)
- **Delete Key**: Hapus entire key dari server

### 4. Bulk Operations
- Select multiple items dengan checkbox
- Konfirmasi sebelum delete
- Real-time update setelah delete

## API Endpoints

### GET /api/storage
List semua storage keys dengan count dan last updated

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "key": "products",
        "count": 150,
        "updatedAt": "2024-02-16T10:30:00Z"
      }
    ],
    "total": 1
  }
}
```

### GET /api/storage/{key}
Get data untuk specific key

**Response:**
```json
{
  "success": true,
  "data": {
    "key": "products",
    "value": [...],
    "timestamp": 1708084200
  }
}
```

### POST /api/storage/{key}
Update/save data untuk specific key

**Request:**
```json
{
  "value": [...]
}
```

### DELETE /api/storage/{key}
Soft delete key (mark as deleted)

## Cara Menggunakan

1. **Buka Settings** → **Server Data**
2. **Lihat Storage Keys** yang tersedia
3. **Klik View** pada key yang ingin dilihat
4. **Pilih items** dengan checkbox
5. **Klik Delete Selected** atau **Clear All** atau **Delete Key**
6. **Konfirmasi** di dialog yang muncul

## Notes

- Data yang dihapus tidak bisa di-recover
- Semua operasi langsung ke server (PostgreSQL)
- Fallback ke localStorage jika server tidak available
- Timeout 10 detik untuk setiap request
