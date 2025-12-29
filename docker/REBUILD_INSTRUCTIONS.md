# Rebuild Docker Container

Jika endpoint `/api/storage/all` return 404, kemungkinan container Docker belum di-rebuild dengan versi terbaru.

## Langkah-langkah:

1. **Stop container yang sedang jalan:**
```powershell
cd "D:\Trimalaksana Apps 01.00\PT.Trima Laksana Jaya Pratama\docker"
docker-compose down
```

2. **Rebuild image dengan versi terbaru:**
```powershell
docker-compose build --no-cache
```

3. **Start container lagi:**
```powershell
docker-compose up -d
```

4. **Cek log untuk memastikan server jalan:**
```powershell
docker-compose logs -f
```

5. **Test endpoint:**
```powershell
curl http://localhost:8888/api/storage/all
```

Jika masih 404, cek apakah container benar-benar jalan:
```powershell
docker ps
```

Pastikan container `docker-storage-server-1` atau `storage-server` statusnya `Up`.

