/**
 * Storage Server - PostgreSQL + MinIO Mode
 * Reads/writes data to PostgreSQL
 * Files stored in MinIO object storage
 */

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const { Client: MinioClient } = require('minio');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8888;

// ============================================
// MinIO Client Setup
// ============================================
const minioEndpoint = (process.env.MINIO_ENDPOINT || 'minio:9000').replace(/^https?:\/\//, '');
const [minioHost, minioPort] = minioEndpoint.includes(':') 
  ? minioEndpoint.split(':') 
  : [minioEndpoint, '9000'];

console.log(`[MinIO] Connecting to: ${minioHost}:${minioPort}`);

const minioClient = new MinioClient({
  endPoint: minioHost,
  port: parseInt(minioPort) || 9000,
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
});

console.log(`[MinIO] Client initialized with endPoint: ${minioHost}, port: ${minioPort}`);

// Multer setup for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// ============================================
// PostgreSQL Connection Pool
// ============================================
let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      user: process.env.DB_USER || 'trimalaksana',
      password: process.env.DB_PASSWORD || 'trimalaksana123',
      host: process.env.DB_HOST || 'postgres',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'trimalaksana_db',
    });

    pool.on('error', (err) => {
      console.error('[PostgreSQL] Unexpected error on idle client', err);
    });
  }
  return pool;
}

// ============================================
// Middleware
// ============================================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(express.json({ limit: '100mb', parameterLimit: 50000 }));
app.use(express.urlencoded({ extended: true, limit: '100mb', parameterLimit: 50000 }));

// ============================================
// Health Check
// ============================================
app.get('/health', async (req, res) => {
  try {
    const pgResult = await getPool().query('SELECT NOW()');
    
    // Check MinIO health
    let minioStatus = 'disconnected';
    try {
      await minioClient.listBuckets();
      minioStatus = 'connected';
    } catch (error) {
      console.error('[MinIO] Health check failed:', error.message);
    }
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: pgResult ? 'connected' : 'disconnected',
      minio: minioStatus,
      mode: 'PostgreSQL + MinIO',
      endpoints: {
        health: '/health',
        getStorage: '/api/storage/:key',
        setStorage: '/api/storage/:key',
        deleteStorage: '/api/storage/:key',
        all: '/api/storage/all',
        blobUpload: '/api/blob/upload',
        blobDownload: '/api/blob/download/:business/:fileId',
        blobDelete: '/api/blob/delete/:business/:fileId',
        blobList: '/api/blob/list/:business'
      }
    });
  } catch (error) {
    console.error('[Server] Health check error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ============================================
// Initialize MinIO Buckets
// ============================================
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

// Initialize MinIO on startup
initializeMinIO().catch(err => console.error('[MinIO] Initialization error:', err));

// ============================================
// Root endpoint
// ============================================
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Storage server is running (PostgreSQL mode)',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// GET - Retrieve from PostgreSQL
// ============================================
app.get('/api/storage/*', async (req, res) => {
  try {
    const key = req.path.replace('/api/storage/', '');
    const decodedKey = decodeURIComponent(key);
    
    console.log(`[Server] GET /api/storage/${decodedKey}`);
    
    const result = await getPool().query(
      'SELECT value, timestamp FROM storage WHERE key = $1',
      [decodedKey]
    );
    
    if (result.rows.length === 0) {
      console.log(`[Server] Key not found: ${decodedKey}`);
      return res.json({ value: {}, timestamp: 0 });
    }
    
    const row = result.rows[0];
    console.log(`[Server] ✅ Retrieved ${decodedKey} from PostgreSQL`);
    
    res.json({
      value: row.value,
      timestamp: row.timestamp || 0
    });
  } catch (error) {
    console.error(`[Server] ❌ GET error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// POST - Save to PostgreSQL
// ============================================
app.post('/api/storage/*', async (req, res) => {
  try {
    const key = req.path.replace('/api/storage/', '');
    const decodedKey = decodeURIComponent(key);
    const value = req.body.value;
    const timestamp = req.body.timestamp || Date.now();
    
    console.log(`[Server] 📤 POST /api/storage/${decodedKey}`);
    console.log(`[Server] 📊 Value type: ${typeof value}, isArray: ${Array.isArray(value)}, size: ${Array.isArray(value) ? value.length : 'N/A'}`);
    
    await getPool().query(
      `INSERT INTO storage (key, value, timestamp) 
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET 
         value = $2, 
         timestamp = $3,
         updated_at = CURRENT_TIMESTAMP`,
      [decodedKey, JSON.stringify(value), timestamp]
    );
    
    console.log(`[Server] ✅ Saved ${decodedKey} to PostgreSQL (${Array.isArray(value) ? value.length : 1} items)`);
    
    res.json({ success: true, timestamp: timestamp });
  } catch (error) {
    console.error(`[Server] ❌ POST error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DELETE - Remove from PostgreSQL
// ============================================
app.delete('/api/storage/*', async (req, res) => {
  try {
    const key = req.path.replace('/api/storage/', '');
    const decodedKey = decodeURIComponent(key);
    
    console.log(`[Server] DELETE /api/storage/${decodedKey}`);
    
    await getPool().query('DELETE FROM storage WHERE key = $1', [decodedKey]);
    
    console.log(`[Server] ✅ Deleted ${decodedKey} from PostgreSQL`);
    
    res.json({ success: true });
  } catch (error) {
    console.error(`[Server] ❌ DELETE error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET ALL - Retrieve all from PostgreSQL
// ============================================
app.get('/api/storage/all', async (req, res) => {
  try {
    console.log(`[Server] GET /api/storage/all`);
    
    const result = await getPool().query('SELECT key, value, timestamp FROM storage');
    
    const data = {};
    const timestamps = {};
    
    result.rows.forEach(row => {
      data[row.key] = row.value;
      timestamps[row.key] = row.timestamp || 0;
    });
    
    console.log(`[Server] ✅ Retrieved ${result.rows.length} keys from PostgreSQL`);
    
    res.json({ data, timestamps, serverTime: Date.now() });
  } catch (error) {
    console.error(`[Server] ❌ GET ALL error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BLOB ENDPOINTS - MinIO File Storage
// ============================================

// POST - Upload file to MinIO
app.post('/api/blob/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const business = req.query.business || 'packaging';
    const fileId = uuidv4();
    const fileName = req.file.originalname;
    const mimeType = req.file.mimetype;
    const fileSize = req.file.size;
    const objectKey = `${business}/${fileId}/${fileName}`;

    console.log(`[MinIO] 📤 Uploading file: ${fileName} (${fileSize} bytes) to ${business}`);

    // Upload to MinIO
    await minioClient.putObject(
      business,
      objectKey,
      req.file.buffer,
      fileSize,
      { 'Content-Type': mimeType }
    );

    // Save metadata to PostgreSQL
    await getPool().query(
      `INSERT INTO blob_storage_metadata 
       (file_id, file_name, file_size, mime_type, bucket_name, object_key, module, entity_type, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [fileId, fileName, fileSize, mimeType, business, objectKey, business, 'file']
    );

    console.log(`[MinIO] ✅ File uploaded: ${fileId}`);

    res.json({
      success: true,
      fileId,
      fileName,
      fileSize,
      mimeType,
      url: `/api/blob/download/${business}/${fileId}`
    });
  } catch (error) {
    console.error(`[MinIO] ❌ Upload error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Download file from MinIO
app.get('/api/blob/download/:business/:fileId', async (req, res) => {
  try {
    const { business, fileId } = req.params;

    console.log(`[MinIO] 📥 Downloading file: ${fileId} from ${business}`);

    // Get metadata
    const metaResult = await getPool().query(
      'SELECT * FROM blob_storage_metadata WHERE file_id = $1 AND deleted_at IS NULL',
      [fileId]
    );

    if (metaResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const metadata = metaResult.rows[0];
    const objectKey = metadata.object_key;

    // Download from MinIO
    const dataStream = await minioClient.getObject(business, objectKey);

    // Set headers for preview (not download)
    res.setHeader('Content-Type', metadata.mime_type);
    res.setHeader('Content-Length', metadata.file_size);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    // CRITICAL: Remove Content-Disposition to allow browser preview
    // MinIO might set this, so we explicitly remove it
    res.removeHeader('Content-Disposition');

    dataStream.pipe(res);

    console.log(`[MinIO] ✅ File downloaded: ${fileId}`);
  } catch (error) {
    console.error(`[MinIO] ❌ Download error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE - Delete file from MinIO
app.delete('/api/blob/delete/:business/:fileId', async (req, res) => {
  try {
    const { business, fileId } = req.params;

    console.log(`[MinIO] 🗑️ Deleting file: ${fileId} from ${business}`);

    // Get metadata
    const metaResult = await getPool().query(
      'SELECT * FROM blob_storage_metadata WHERE file_id = $1 AND deleted_at IS NULL',
      [fileId]
    );

    if (metaResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const metadata = metaResult.rows[0];
    const objectKey = metadata.object_key;

    // Delete from MinIO
    await minioClient.removeObject(business, objectKey);

    // Mark as deleted in PostgreSQL (soft delete)
    await getPool().query(
      'UPDATE blob_storage_metadata SET deleted_at = NOW() WHERE file_id = $1',
      [fileId]
    );

    console.log(`[MinIO] ✅ File deleted: ${fileId}`);

    res.json({ success: true });
  } catch (error) {
    console.error(`[MinIO] ❌ Delete error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// GET - List files in business bucket
app.get('/api/blob/list/:business', async (req, res) => {
  try {
    const { business } = req.params;

    console.log(`[MinIO] 📋 Listing files in ${business}`);

    // Get metadata from PostgreSQL
    const result = await getPool().query(
      `SELECT file_id, file_name, file_size, mime_type, uploaded_at 
       FROM blob_storage_metadata 
       WHERE bucket_name = $1 AND deleted_at IS NULL
       ORDER BY uploaded_at DESC`,
      [business]
    );

    console.log(`[MinIO] ✅ Listed ${result.rows.length} files from ${business}`);

    res.json({
      business,
      files: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error(`[MinIO] ❌ List error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Get file metadata
app.get('/api/blob/metadata/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    const result = await getPool().query(
      'SELECT * FROM blob_storage_metadata WHERE file_id = $1 AND deleted_at IS NULL',
      [fileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(`[MinIO] ❌ Metadata error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
  console.log(`[Server] 🚀 Storage server running on port ${PORT}`);
  console.log(`[Server] 📊 Mode: PostgreSQL + MinIO`);
  console.log(`[Server] 🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`[Server] 📁 MinIO Console: http://localhost:9001`);
});
