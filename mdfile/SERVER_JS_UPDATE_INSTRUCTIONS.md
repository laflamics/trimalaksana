# Update docker/server.js di PC Utama

## Yang Perlu Diubah

Di `D:\trimalaksanaapps\possgresql\docker\server.js`, cari bagian ini:

### 1. Tambah logging di MinIO Client Setup (setelah line 26)

**Cari:**
```javascript
const minioClient = new MinioClient({
  endPoint: minioHost,
  port: parseInt(minioPort) || 9000,
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
});
```

**Ganti dengan:**
```javascript
console.log(`[MinIO] Connecting to: ${minioHost}:${minioPort}`);

const minioClient = new MinioClient({
  endPoint: minioHost,
  port: parseInt(minioPort) || 9000,
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
});

console.log(`[MinIO] Client initialized with endPoint: ${minioHost}, port: ${minioPort}`);
```

### 2. Update initializeMinIO function (cari function ini)

**Cari:**
```javascript
async function initializeMinIO() {
  const buckets = ['packaging', 'general-trading', 'trucking'];
  
  for (const bucket of buckets) {
    try {
      const exists = await minioClient.bucketExists(bucket);
      if (!exists) {
        await minioClient.makeBucket(bucket, 'us-east-1');
        console.log(`[MinIO] ✅ Created bucket: ${bucket}`);
      } else {
        console.log(`[MinIO] ✓ Bucket exists: ${bucket}`);
      }
    } catch (error) {
      console.error(`[MinIO] ❌ Error initializing bucket ${bucket}:`, error.message);
    }
  }
}
```

**Ganti dengan:**
```javascript
async function initializeMinIO() {
  const buckets = ['packaging', 'general-trading', 'trucking'];
  
  try {
    // Test MinIO connection first
    console.log(`[MinIO] Testing connection to ${minioHost}:${minioPort}...`);
    await minioClient.listBuckets();
    console.log(`[MinIO] ✅ Connection successful`);
  } catch (error) {
    console.error(`[MinIO] ❌ Connection failed:`, error.message);
    console.error(`[MinIO] Endpoint: ${minioHost}:${minioPort}`);
    return;
  }
  
  for (const bucket of buckets) {
    try {
      const exists = await minioClient.bucketExists(bucket);
      if (!exists) {
        await minioClient.makeBucket(bucket, 'us-east-1');
        console.log(`[MinIO] ✅ Created bucket: ${bucket}`);
      } else {
        console.log(`[MinIO] ✓ Bucket exists: ${bucket}`);
      }
    } catch (error) {
      console.error(`[MinIO] ❌ Error initializing bucket ${bucket}:`, error.message);
    }
  }
}
```

## Setelah Update

1. Restart Docker:
```powershell
cd D:\trimalaksanaapps\possgresql\docker
docker-compose down
docker-compose up -d
```

2. Check logs:
```powershell
docker logs docker-storage-server-1 --tail 30
```

Harus lihat:
```
[MinIO] Connecting to: minio:9000
[MinIO] Client initialized with endPoint: minio, port: 9000
[MinIO] Testing connection to minio:9000...
[MinIO] ✅ Connection successful
[MinIO] ✅ Created bucket: packaging
[MinIO] ✅ Created bucket: general-trading
[MinIO] ✅ Created bucket: trucking
[Server] 🚀 Storage server running on port 8888
```

3. Test health:
```powershell
curl http://localhost:9999/health
```

Harus return 200 OK dengan status "ok"

## Setelah Itu

Balik ke laptop dev dan coba upload file lagi di Products page.
