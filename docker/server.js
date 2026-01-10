const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 8888;
const DATA_DIR = path.join(__dirname, 'data');
const ROOT_DIR = path.join(__dirname, '..');
const UPDATES_DIR = path.join(__dirname, 'updates'); // Directory untuk update files
const UPLOADS_DIR = path.join(__dirname, 'uploads'); // Directory untuk uploaded files (PDF, images, etc.)

// Helper function untuk menentukan file path berdasarkan key
// Packaging keys → data/localStorage/packaging/{key}.json
// GT keys → data/localStorage/general-trading/{key}.json
// Trucking keys → data/localStorage/trucking/{key}.json
// Other keys → data/{key}.json
function getFilePath(key) {
  // Packaging keys (products, bom, materials, customers, suppliers, dll)
  const packagingKeys = ['products', 'bom', 'materials', 'customers', 'suppliers', 'staff', 
    'spk', 'schedule', 'production', 'qc', 'productionResults', 'ptp',
    'purchaseRequests', 'purchaseOrders', 'grn', 'grnPackaging', 'inventory',
    'salesOrders', 'delivery', 'deliveryNotes',
    'productionNotifications', 'deliveryNotifications', 'invoiceNotifications', 'financeNotifications',
    'payments', 'journalEntries', 'accounts', 'invoices', 'expenses',
    'audit', 'outbox', 'companySettings'];
  
  // Jika key sudah punya prefix packaging/, gunakan langsung
  if (key.startsWith('packaging/')) {
    const actualKey = key.replace('packaging/', '');
    return path.join(DATA_DIR, 'localStorage', 'packaging', `${actualKey}.json`);
  }
  
  // Jika key adalah packaging key tanpa prefix
  if (packagingKeys.includes(key)) {
    return path.join(DATA_DIR, 'localStorage', 'packaging', `${key}.json`);
  }
  
  // GT keys (gt_*)
  if (key.startsWith('gt_')) {
    return path.join(DATA_DIR, 'localStorage', 'general-trading', `${key}.json`);
  }
  
  // Trucking keys (trucking_*)
  if (key.startsWith('trucking_')) {
    return path.join(DATA_DIR, 'localStorage', 'trucking', `${key}.json`);
  }
  
  // Default: root data/
  return path.join(DATA_DIR, `${key}.json`);
}

// Ensure data directory exists
fs.mkdir(DATA_DIR, { recursive: true }).catch(console.error);

// Ensure updates directory exists
fs.mkdir(UPDATES_DIR, { recursive: true }).catch(console.error);

// Ensure uploads directory exists
fs.mkdir(UPLOADS_DIR, { recursive: true }).catch(console.error);

app.use(cors());

// Increase body size limit BEFORE other middleware
// Must be set before express.json() middleware
app.use(express.json({ 
  limit: '100mb', // Increase to 100MB for large data sync
  parameterLimit: 50000 
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '100mb',
  parameterLimit: 50000 
}));

// Root endpoint (for testing)
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Storage server is running',
    endpoints: {
      health: '/health',
      getStorage: '/api/storage/:key',
      setStorage: '/api/storage/:key',
      deleteStorage: '/api/storage/:key',
      sync: '/api/storage/sync',
      all: '/api/storage/all',
      seed: '/api/seed'
    }
  });
});

// Get all storage with timestamps (with optional since parameter for incremental sync)
// IMPORTANT: didefinisikan SEBELUM route '/api/storage/:key' supaya
// '/api/storage/all' TIDAK ketangkep sebagai ':key' = 'all'
app.get('/api/storage/all', async (req, res) => {
  try {
    console.log(`[Server] GET /api/storage/all - since: ${req.query.since || 0}`);
    const since = req.query.since ? parseInt(req.query.since) : 0;
    
    // Check if DATA_DIR exists
    try {
      await fs.access(DATA_DIR);
    } catch {
      console.warn(`[Server] DATA_DIR does not exist: ${DATA_DIR}, creating...`);
      await fs.mkdir(DATA_DIR, { recursive: true });
    }
    
    const data = {};
    const timestamps = {};
    
    // Read from localStorage subdirectories first (packaging, general-trading, trucking)
    const localStorageDir = path.join(DATA_DIR, 'localStorage');
    const readDirRecursive = async (dir, prefix = '') => {
      try {
        const files = await fs.readdir(dir, { withFileTypes: true });
        for (const file of files) {
          const fullPath = path.join(dir, file.name);
          if (file.isDirectory()) {
            const subPrefix = prefix ? `${prefix}/${file.name}` : file.name;
            await readDirRecursive(fullPath, subPrefix);
          } else if (file.name.endsWith('.json')) {
            const key = prefix ? `${prefix}/${file.name.replace('.json', '')}` : file.name.replace('.json', '');
            // Normalize key: packaging/products -> products
            const normalizedKey = key.replace(/^(packaging|general-trading|trucking)\//, '');
            
            try {
              const filePath = fullPath;
              const content = await fs.readFile(filePath, 'utf8');
              const parsed = JSON.parse(content);
              
              let fileTimestamp = 0;
              let fileValue;
              
              if (parsed && typeof parsed === 'object' && parsed.value !== undefined) {
                fileValue = parsed.value;
                fileTimestamp = parsed.timestamp || parsed._timestamp || 0;
              } else if (parsed && typeof parsed === 'object' && (parsed.timestamp || parsed._timestamp)) {
                fileValue = parsed;
                fileTimestamp = parsed.timestamp || parsed._timestamp || 0;
              } else {
                fileValue = parsed;
                fileTimestamp = 0;
              }
              
              if (fileTimestamp > since || since === 0) {
                if (!data[normalizedKey] || fileTimestamp > (timestamps[normalizedKey] || 0)) {
                  data[normalizedKey] = fileValue;
                  timestamps[normalizedKey] = fileTimestamp;
                }
              }
            } catch (error) {
              console.warn(`[Server] Skipping invalid JSON file: ${fullPath}`, error.message);
            }
          }
        }
      } catch (error) {
        // Directory doesn't exist, skip
      }
    };
    
    // Read from localStorage subdirectories first (priority)
    try {
      await fs.access(localStorageDir);
      await readDirRecursive(localStorageDir);
    } catch {
      // localStorage directory doesn't exist, that's okay
    }
    
    // Also read from root data/ for backward compatibility (but don't override localStorage)
    try {
      const files = await fs.readdir(DATA_DIR);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const key = file.replace('.json', '');
          // Skip if already loaded from localStorage
          if (data[key]) continue;
          
          try {
            const filePath = path.join(DATA_DIR, file);
            const content = await fs.readFile(filePath, 'utf8');
            const parsed = JSON.parse(content);
            
            let fileTimestamp = 0;
            let fileValue;
            
            if (parsed && typeof parsed === 'object' && parsed.value !== undefined) {
              fileValue = parsed.value;
              fileTimestamp = parsed.timestamp || parsed._timestamp || 0;
            } else if (parsed && typeof parsed === 'object' && (parsed.timestamp || parsed._timestamp)) {
              fileValue = parsed;
              fileTimestamp = parsed.timestamp || parsed._timestamp || 0;
            } else {
              fileValue = parsed;
              fileTimestamp = 0;
            }
            
            if (fileTimestamp > since || since === 0) {
              data[key] = fileValue;
              timestamps[key] = fileTimestamp;
            }
          } catch (error) {
            console.warn(`[Server] Skipping invalid JSON file: ${file}`, error.message);
          }
        }
      }
    } catch (error) {
      // Root directory read failed, that's okay
    }
    
    console.log(`[Server] Returning ${Object.keys(data).length} keys from /api/storage/all`);
    res.json({ data, timestamps, serverTime: Date.now() });
  } catch (error) {
    console.error(`[Server] Error in /api/storage/all:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get storage value with timestamp (single key)
// CRITICAL: Handle keys with slashes like "packaging/companySettings"
// Express :key doesn't match slashes, so we need to extract from path
// IMPORTANT: This route must be AFTER /api/storage/all, /api/storage/sync, etc.
app.get('/api/storage/*', async (req, res) => {
  try {
    // Extract key from path (everything after /api/storage/)
    const key = req.path.replace('/api/storage/', '');
    
    // Skip special routes (should be handled by specific routes above)
    const specialRoutes = ['all', 'sync', 'upload-file', 'list-files'];
    if (specialRoutes.includes(key)) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    // Decode URL encoded key (from Vercel proxy)
    const decodedKey = decodeURIComponent(key);
    console.log(`[Server] GET /api/storage/${decodedKey} (from path: ${req.path})`);
    const filePath = getFilePath(decodedKey);
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
    
    // Try to read from new path first
    let data;
    try {
      data = await fs.readFile(filePath, 'utf8');
      console.log(`[Server] ✅ Read file from ${filePath}`);
    } catch (error) {
      console.log(`[Server] File not found at ${filePath}, trying legacy path...`);
      // If file doesn't exist in new path, try legacy path (backward compatibility)
      if (decodedKey.startsWith('packaging/')) {
        const legacyKey = decodedKey.replace('packaging/', '');
        const legacyPath = path.join(DATA_DIR, `${legacyKey}.json`);
        try {
          data = await fs.readFile(legacyPath, 'utf8');
          console.log(`[Server] ✅ Found legacy file at ${legacyPath}, migrating...`);
          // Copy to new location for migration
          const dir = path.dirname(filePath);
          await fs.mkdir(dir, { recursive: true });
          await fs.writeFile(filePath, data);
          console.log(`[Server] ✅ Migrated ${legacyKey} from legacy path to ${filePath}`);
        } catch (legacyError) {
          console.log(`[Server] Legacy file also not found, returning empty`);
          // File doesn't exist, return empty object/array instead of 404
          return res.json({ value: {}, timestamp: 0 });
        }
      } else {
        // File doesn't exist, return empty instead of 404
        return res.json({ value: {}, timestamp: 0 });
      }
    }
    
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch (parseError) {
      return res.json({ value: data, timestamp: 0 });
    }
    
    // Return with timestamp if available
    if (parsed && typeof parsed === 'object' && parsed.value !== undefined) {
      res.json({ 
        value: parsed.value,
        timestamp: parsed.timestamp || parsed._timestamp || 0
      });
    } else if (parsed && typeof parsed === 'object' && (parsed.timestamp || parsed._timestamp)) {
      res.json({ 
        value: parsed,
        timestamp: parsed.timestamp || parsed._timestamp 
      });
    } else {
      res.json({ value: parsed, timestamp: 0 });
    }
  } catch (error) {
    console.error(`[Server] ❌ Error in GET /api/storage/*:`, error);
    console.error(`[Server] Request path: ${req.path}`);
    // Return empty instead of 404 to avoid breaking client
    res.json({ value: {}, timestamp: 0 });
  }
});

// Set storage value with timestamp
// CRITICAL: Handle keys with slashes like "packaging/companySettings"
// Express :key doesn't match slashes, so we need to extract from path
// IMPORTANT: This route must be AFTER /api/storage/sync, /api/storage/upload-file, etc.
app.post('/api/storage/*', async (req, res) => {
  const startTime = Date.now();
  try {
    // Extract key from path (everything after /api/storage/)
    const key = req.path.replace('/api/storage/', '');
    
    // Skip special routes (should be handled by specific routes above)
    const specialRoutes = ['sync', 'upload-file'];
    if (specialRoutes.includes(key)) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    // Decode URL encoded key (from Vercel proxy)
    const decodedKey = decodeURIComponent(key);
    console.log(`[Server] ========================================`);
    console.log(`[Server] POST /api/storage/${decodedKey} (from path: ${req.path}) - received data`);
    console.log(`[Server] Request body keys:`, Object.keys(req.body || {}));
    
    const filePath = getFilePath(decodedKey);
    console.log(`[Server] File path determined: ${filePath}`);
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    try {
      await fs.access(dir);
      console.log(`[Server] Directory exists: ${dir}`);
    } catch (dirError) {
      console.log(`[Server] Creating directory: ${dir}`);
      try {
        await fs.mkdir(dir, { recursive: true });
        console.log(`[Server] ✅ Directory created: ${dir}`);
      } catch (mkdirError) {
        console.error(`[Server] ❌ Failed to create directory ${dir}:`, mkdirError);
        return res.status(500).json({ error: `Failed to create directory: ${mkdirError.message}` });
      }
    }
    
    const newValue = req.body.value;
    const newTimestamp = req.body.timestamp || Date.now();
    
    console.log(`[Server] Saving ${decodedKey}: value type=${typeof newValue}, isArray=${Array.isArray(newValue)}, timestamp=${newTimestamp}`);
    
    // Try to read existing data for merge
    let existingData = null;
    let existingTimestamp = 0;
    try {
      const existingContent = await fs.readFile(filePath, 'utf8');
      let existing;
      try {
        existing = JSON.parse(existingContent);
      } catch (parseError) {
        existing = existingContent;
      }
      
      if (existing && typeof existing === 'object' && existing.value !== undefined) {
        existingData = existing.value;
        existingTimestamp = existing.timestamp || existing._timestamp || 0;
      } else if (existing && typeof existing === 'object' && (existing.timestamp || existing._timestamp)) {
        existingData = existing;
        existingTimestamp = existing.timestamp || existing._timestamp || 0;
      } else {
        existingData = existing;
        existingTimestamp = 0;
      }
    } catch (readError) {
      // File doesn't exist, use new data
      console.log(`[Server] File doesn't exist yet, will create new: ${filePath}`);
    }
    
    // Last-write-wins: use newer data
    let finalValue = newValue;
    let finalTimestamp = newTimestamp;
    
    if (existingData && existingTimestamp > newTimestamp) {
      finalValue = mergeData(existingData, newValue, existingTimestamp, newTimestamp);
      finalTimestamp = existingTimestamp;
    } else {
      if (existingData) {
        finalValue = mergeData(newValue, existingData, newTimestamp, existingTimestamp);
      }
      finalTimestamp = newTimestamp;
    }
    
    // Save with timestamp
    const dataToSave = {
      value: finalValue,
      timestamp: finalTimestamp,
      _timestamp: finalTimestamp,
    };
    
    try {
      await fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2));
      const elapsedTime = Date.now() - startTime;
      console.log(`[Server] ✅ Saved ${decodedKey} to ${filePath} (${Array.isArray(finalValue) ? finalValue.length : 'object'} items, timestamp: ${finalTimestamp})`);
      console.log(`[Server] Request completed in ${elapsedTime}ms`);
      console.log(`[Server] ========================================`);
      
      res.json({ success: true, timestamp: finalTimestamp });
    } catch (writeError) {
      const elapsedTime = Date.now() - startTime;
      console.error(`[Server] ❌ Failed to write file ${filePath}:`, writeError);
      console.error(`[Server] Write error details:`, {
        code: writeError.code,
        message: writeError.message,
        stack: writeError.stack,
        filePath: filePath,
        dir: path.dirname(filePath)
      });
      console.log(`[Server] Request failed in ${elapsedTime}ms`);
      console.log(`[Server] ========================================`);
      
      // CRITICAL: Always return 500, never 404 for POST
      return res.status(500).json({ 
        error: `Failed to write file: ${writeError.message}`,
        code: writeError.code || 'UNKNOWN',
        path: filePath
      });
    }
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    console.error(`[Server] ❌ Error saving:`, error);
    console.error(`[Server] Error details:`, {
      code: error.code,
      message: error.message,
      stack: error.stack,
      path: req.path
    });
    console.log(`[Server] Request failed in ${elapsedTime}ms`);
    console.log(`[Server] ========================================`);
    
    // CRITICAL: Always return 500, never 404 for POST
    res.status(500).json({ 
      error: error.message || 'Server error',
      code: error.code || 'UNKNOWN'
    });
  }
});

// Helper function to merge data intelligently
function mergeData(newerData, olderData, newerTimestamp, olderTimestamp) {
  // If both are arrays, merge arrays (avoid duplicates)
  if (Array.isArray(newerData) && Array.isArray(olderData)) {
    const merged = [...newerData];
    const newerIds = new Set(newerData.map((item, idx) => item.id || item._id || idx));
    olderData.forEach((item, idx) => {
      const id = item.id || item._id || idx;
      if (!newerIds.has(id)) {
        merged.push(item);
      }
    });
    return merged;
  }
  
  // If both are objects, merge objects (newer wins for conflicts)
  if (typeof newerData === 'object' && newerData !== null && 
      typeof olderData === 'object' && olderData !== null &&
      !Array.isArray(newerData) && !Array.isArray(olderData)) {
    return {
      ...olderData,
      ...newerData,
    };
  }
  
  // Otherwise, newer wins
  return newerData;
}

// Upload file (PDF, images, etc.) - convert base64 to file
app.post('/api/storage/upload-file', async (req, res) => {
  try {
    console.log(`[Server] 📤 POST /api/storage/upload-file - received request`);
    const { base64Data, fileName, fileType } = req.body;
    
    if (!base64Data || !fileName) {
      console.error(`[Server] ❌ Missing required fields: base64Data=${!!base64Data}, fileName=${!!fileName}`);
      return res.status(400).json({ error: 'base64Data and fileName are required' });
    }
    
    // Ensure UPLOADS_DIR exists
    try {
      await fs.access(UPLOADS_DIR);
    } catch {
      console.log(`[Server] 📁 Creating UPLOADS_DIR: ${UPLOADS_DIR}`);
      await fs.mkdir(UPLOADS_DIR, { recursive: true });
    }
    
    // Extract base64 data (remove data URL prefix if present)
    let base64Content = base64Data;
    if (base64Content.includes(',')) {
      base64Content = base64Content.split(',')[1];
    }
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Content, 'base64');
    console.log(`[Server] 📦 File data: ${fileName}, size: ${buffer.length} bytes, type: ${fileType || 'unknown'}`);
    
    // Generate unique filename to avoid conflicts
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueFileName = `${timestamp}_${sanitizedFileName}`;
    const filePath = path.join(UPLOADS_DIR, uniqueFileName);
    
    console.log(`[Server] 💾 Saving file to: ${filePath}`);
    
    // Save file
    await fs.writeFile(filePath, buffer);
    
    // Verify file was saved
    const stats = await fs.stat(filePath);
    console.log(`[Server] ✅ File saved successfully: ${uniqueFileName} (${stats.size} bytes)`);
    
    // Return file path relative to server root (for download)
    const relativePath = `uploads/${uniqueFileName}`;
    
    res.json({ 
      success: true, 
      filePath: relativePath,
      fileName: uniqueFileName,
      size: buffer.length
    });
  } catch (error) {
    console.error(`[Server] ❌ Error uploading file:`, error);
    console.error(`[Server] Error stack:`, error.stack);
    res.status(500).json({ error: error.message });
  }
});

// List files in uploads directory (for debugging)
app.get('/api/storage/list-files', async (req, res) => {
  try {
    // Ensure UPLOADS_DIR exists
    try {
      await fs.access(UPLOADS_DIR);
    } catch {
      await fs.mkdir(UPLOADS_DIR, { recursive: true });
    }
    
    const files = await fs.readdir(UPLOADS_DIR);
    const fileDetails = await Promise.all(files.map(async (file) => {
      try {
        const filePath = path.join(UPLOADS_DIR, file);
        const stats = await fs.stat(filePath);
        return {
          fileName: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
        };
      } catch {
        return { fileName: file, error: 'Cannot read file stats' };
      }
    }));
    
    res.json({ 
      success: true, 
      uploadsDir: UPLOADS_DIR,
      count: fileDetails.length,
      files: fileDetails 
    });
  } catch (error) {
    console.error(`[Server] ❌ Error listing files:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Download file from uploads directory
app.get('/api/storage/file/:fileName', async (req, res) => {
  try {
    const fileName = req.params.fileName;
    const filePath = path.join(UPLOADS_DIR, fileName);
    
    console.log(`[Server] 📥 Download request: ${fileName}`);
    console.log(`[Server] 📁 File path: ${filePath}`);
    
    // Check if file exists
    try {
      await fs.access(filePath);
      const stats = await fs.stat(filePath);
      console.log(`[Server] ✅ File exists: ${fileName} (${stats.size} bytes)`);
    } catch {
      console.error(`[Server] ❌ File not found: ${filePath}`);
      return res.status(404).json({ error: 'File not found', path: filePath });
    }
    
    // Determine content type based on file extension
    const ext = path.extname(fileName).toLowerCase();
    const contentTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
    };
    const contentType = contentTypes[ext] || 'application/octet-stream';
    
    // Read and send file
    const fileBuffer = await fs.readFile(filePath);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(fileBuffer);
    console.log(`[Server] ✅ File sent: ${fileName}`);
  } catch (error) {
    console.error(`[Server] ❌ Error downloading file:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Delete storage value
// CRITICAL: Handle keys with slashes like "packaging/companySettings"
// Express :key doesn't match slashes, so we need to extract from path
app.delete('/api/storage/*', async (req, res) => {
  try {
    // Extract key from path (everything after /api/storage/)
    const key = req.path.replace('/api/storage/', '');
    // Decode URL encoded key (from Vercel proxy)
    const decodedKey = decodeURIComponent(key);
    console.log(`[Server] DELETE /api/storage/${decodedKey} (from path: ${req.path})`);
    const filePath = getFilePath(decodedKey);
    await fs.unlink(filePath);
    console.log(`[Server] ✅ Deleted ${decodedKey} from ${filePath}`);
    res.json({ success: true });
  } catch (error) {
    console.error(`[Server] ❌ Error deleting:`, error);
    // Return success even if file doesn't exist (idempotent)
    res.json({ success: true, message: 'File not found or already deleted' });
  }
});

// Sync all data with merge and conflict resolution
app.post('/api/storage/sync', async (req, res) => {
  try {
    const clientData = req.body.data || req.body;
    const clientTimestamp = req.body.timestamp || Date.now();
    
    console.log(`[Server] POST /api/storage/sync - received ${Object.keys(clientData).length} keys`);
    
    // Ensure DATA_DIR exists
    try {
      await fs.access(DATA_DIR);
    } catch {
      console.warn(`[Server] DATA_DIR does not exist: ${DATA_DIR}, creating...`);
      await fs.mkdir(DATA_DIR, { recursive: true });
    }
    
    const mergedData = {};
    let conflicts = 0;
    
    for (const [key, clientValue] of Object.entries(clientData)) {
      const filePath = getFilePath(key);
      
      // Ensure directory exists
      const dir = path.dirname(filePath);
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
      }
      
      // Try to read existing server data
      let serverData = null;
      let serverTimestamp = 0;
      try {
        const existingContent = await fs.readFile(filePath, 'utf8');
        let existing;
        try {
          existing = JSON.parse(existingContent);
        } catch (parseError) {
          existing = existingContent;
        }
        
        if (existing && typeof existing === 'object' && existing.value !== undefined) {
          serverData = existing.value;
          serverTimestamp = existing.timestamp || existing._timestamp || 0;
        } else if (existing && typeof existing === 'object' && (existing.timestamp || existing._timestamp)) {
          serverData = existing;
          serverTimestamp = existing.timestamp || existing._timestamp || 0;
        } else {
          serverData = existing;
          serverTimestamp = 0;
        }
      } catch {
        // File doesn't exist
      }
      
      // Last-write-wins with merge
      let finalValue = clientValue;
      let finalTimestamp = clientTimestamp;
      
      if (serverData) {
        if (serverTimestamp > clientTimestamp) {
          finalValue = mergeData(serverData, clientValue, serverTimestamp, clientTimestamp);
          finalTimestamp = serverTimestamp;
          conflicts++;
        } else {
          finalValue = mergeData(clientValue, serverData, clientTimestamp, serverTimestamp);
          finalTimestamp = clientTimestamp;
        }
      }
      
      // Save merged data
      const dataToSave = {
        value: finalValue,
        timestamp: finalTimestamp,
        _timestamp: finalTimestamp,
      };
      
      await fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2));
      mergedData[key] = dataToSave;
    }
    
    const mergedCount = Object.keys(mergedData).length;
    console.log(`[Server] ✅ Synced ${mergedCount} keys (${conflicts} conflicts)`);
    
    res.json({ 
      success: true, 
      merged: mergedCount,
      conflicts 
    });
  } catch (error) {
    console.error(`[Server] ❌ Error in /api/storage/sync:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Seed database
app.post('/api/seed', async (req, res) => {
  try {
    console.log('Starting seed process...');
    
    // Run seed script
    const seedScriptPath = path.join(ROOT_DIR, 'scripts', 'seed.js');
    
    // Check if script exists
    try {
      await fs.access(seedScriptPath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Seed script not found. Make sure scripts/seed.js exists.',
      });
    }

    console.log('Running seed script:', seedScriptPath);
    
    const { stdout, stderr } = await execAsync(`node "${seedScriptPath}"`, {
      cwd: ROOT_DIR,
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      env: { ...process.env, SERVER_URL: `http://localhost:${PORT}` },
    });

    if (stderr && !stderr.includes('warning') && !stderr.includes('deprecated')) {
      console.error('Seed stderr:', stderr);
    }

    console.log('Seed completed:', stdout);

    // Get seed results
    const result = {
      success: true,
      message: 'Seed completed successfully',
      output: stdout,
    };

    res.json(result);
  } catch (error) {
    console.error('[Server] Seed error:', error);
    console.error('[Server] Error details:', {
      message: error.message,
      code: error.code,
      stdout: error.stdout,
      stderr: error.stderr,
    });
    res.status(500).json({ 
      success: false,
      error: error.message || 'Unknown error',
      output: error.stdout || error.stderr || '',
    });
  }
});

// Seed GT database (General Trading - no BOM)
app.post('/api/seedgt', async (req, res) => {
  try {
    console.log('Starting GT seed process...');
    
    // Run seedgt script
    const seedGTScriptPath = path.join(ROOT_DIR, 'scripts', 'seedgt.js');
    
    // Check if script exists
    try {
      await fs.access(seedGTScriptPath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'GT Seed script not found. Make sure scripts/seedgt.js exists.',
      });
    }

    console.log('Running GT seed script:', seedGTScriptPath);
    
    const { stdout, stderr } = await execAsync(`node "${seedGTScriptPath}"`, {
      cwd: ROOT_DIR,
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      env: { ...process.env, SERVER_URL: `http://localhost:${PORT}` },
    });

    if (stderr && !stderr.includes('warning') && !stderr.includes('deprecated') && !stderr.includes('bom')) {
      console.error('GT Seed stderr:', stderr);
    }

    console.log('GT Seed completed:', stdout);

    // Get seed results
    const result = {
      success: true,
      message: 'GT Seed completed successfully',
      output: stdout,
    };

    res.json(result);
  } catch (error) {
    console.error('GT Seed error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Unknown error',
      output: error.stdout || error.stderr || '',
    });
  }
});

// ============================================
// AUTO-UPDATE ENDPOINTS
// ============================================
// IMPORTANT: Place specific routes BEFORE static file serving to avoid conflicts

// Endpoint to get latest version info (with .yml extension)
// MUST be placed BEFORE /api/updates/latest to handle .yml correctly
app.get('/api/updates/latest.yml', async (req, res) => {
  try {
    console.log(`[Server] ========================================`);
    console.log(`[Server] GET /api/updates/latest.yml requested`);
    console.log(`[Server] __dirname: ${__dirname}`);
    console.log(`[Server] UPDATES_DIR: ${UPDATES_DIR}`);
    
    const latestYmlPath = path.join(UPDATES_DIR, 'latest.yml');
    console.log(`[Server] Looking for latest.yml at: ${latestYmlPath}`);
    
    try {
      // Check if file exists
      const stats = await fs.stat(latestYmlPath);
      console.log(`[Server] ✅ File exists! Size: ${stats.size} bytes, Modified: ${stats.mtime}`);
      
      const ymlContent = await fs.readFile(latestYmlPath, 'utf8');
      console.log(`[Server] ✅ Read latest.yml, content length: ${ymlContent.length} bytes`);
      console.log(`[Server] First 200 chars: ${ymlContent.substring(0, 200)}`);
      
      res.setHeader('Content-Type', 'text/yaml');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-cache');
      res.send(ymlContent);
      console.log(`[Server] ✅ Sent latest.yml to client`);
    } catch (error) {
      // If latest.yml doesn't exist, return 404
      console.error(`[Server] ❌ Error accessing latest.yml:`, error);
      console.error(`[Server] Error code: ${error.code}, message: ${error.message}`);
      console.error(`[Server] UPDATES_DIR: ${UPDATES_DIR}`);
      console.error(`[Server] Full path: ${latestYmlPath}`);
      
      // Try to list files in UPDATES_DIR for debugging
      try {
        const files = await fs.readdir(UPDATES_DIR);
        console.error(`[Server] Files in UPDATES_DIR (${files.length} files):`, files);
      } catch (dirError) {
        console.error(`[Server] Cannot read UPDATES_DIR:`, dirError.message);
      }
      
      // Try to check if UPDATES_DIR exists
      try {
        const dirStats = await fs.stat(UPDATES_DIR);
        console.error(`[Server] UPDATES_DIR exists, isDirectory: ${dirStats.isDirectory()}`);
      } catch (dirError) {
        console.error(`[Server] UPDATES_DIR does not exist!`);
      }
      
      res.status(404).json({ 
        error: 'No updates available',
        message: `latest.yml not found at ${latestYmlPath}. Upload update files to ${UPDATES_DIR} directory.`,
        path: latestYmlPath,
        updatesDir: UPDATES_DIR
      });
    }
    console.log(`[Server] ========================================`);
  } catch (error) {
    console.error(`[Server] ❌ Error in /api/updates/latest.yml:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to get latest version info (without .yml extension)
app.get('/api/updates/latest', async (req, res) => {
  try {
    console.log(`[Server] GET /api/updates/latest requested`);
    const latestYmlPath = path.join(UPDATES_DIR, 'latest.yml');
    console.log(`[Server] Looking for latest.yml at: ${latestYmlPath}`);
    
    try {
      // Check if file exists
      await fs.access(latestYmlPath);
      const ymlContent = await fs.readFile(latestYmlPath, 'utf8');
      console.log(`[Server] ✅ Found latest.yml, size: ${ymlContent.length} bytes`);
      
      res.setHeader('Content-Type', 'text/yaml');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(ymlContent);
    } catch (error) {
      // If latest.yml doesn't exist, return 404
      console.warn(`[Server] ❌ latest.yml not found at ${latestYmlPath}:`, error.message);
      console.warn(`[Server] UPDATES_DIR: ${UPDATES_DIR}`);
      
      // Try to list files in UPDATES_DIR for debugging
      try {
        const files = await fs.readdir(UPDATES_DIR);
        console.log(`[Server] Files in UPDATES_DIR:`, files);
      } catch (dirError) {
        console.error(`[Server] Cannot read UPDATES_DIR:`, dirError.message);
      }
      
      res.status(404).json({ 
        error: 'No updates available',
        message: `latest.yml not found at ${latestYmlPath}. Upload update files to ${UPDATES_DIR} directory.`
      });
    }
  } catch (error) {
    console.error(`[Server] Error in /api/updates/latest:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Serve update files (latest.yml, installer.exe, etc.) as static files
// Place AFTER API endpoints to avoid conflicts
app.use('/updates', express.static(UPDATES_DIR, {
  setHeaders: (res, filePath) => {
    // Set proper content type for YAML files
    if (filePath.endsWith('.yml') || filePath.endsWith('.yaml')) {
      res.setHeader('Content-Type', 'text/yaml');
    }
    // Allow CORS for update files
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// Health check - include update info
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    endpoints: {
      health: '/health',
      getStorage: '/api/storage/:key',
      setStorage: '/api/storage/:key',
      deleteStorage: '/api/storage/:key',
      sync: '/api/storage/sync',
      all: '/api/storage/all',
      seed: '/api/seed',
      seedGT: '/api/seedgt',
      updates: '/api/updates/latest',
      updatesFiles: '/updates/*'
    }
  });
});

// Ensure DATA_DIR exists before starting server
fs.mkdir(DATA_DIR, { recursive: true })
  .then(() => {
    console.log(`[Server] ✅ DATA_DIR created/verified: ${DATA_DIR}`);
    return fs.access(DATA_DIR);
  })
  .then(() => {
    console.log(`[Server] ✅ DATA_DIR is accessible`);
  })
  .catch((error) => {
    console.error(`[Server] ❌ Error creating/accessing DATA_DIR: ${DATA_DIR}`, error);
  });

// Check UPDATES_DIR and latest.yml before starting server
fs.mkdir(UPDATES_DIR, { recursive: true })
  .then(() => {
    console.log(`[Server] ✅ UPDATES_DIR created/verified: ${UPDATES_DIR}`);
    return fs.readdir(UPDATES_DIR);
  })
  .then((files) => {
    const hasLatestYml = files.includes('latest.yml');
    if (hasLatestYml) {
      console.log(`[Server] ✅ latest.yml found in UPDATES_DIR`);
    } else {
      console.warn(`[Server] ⚠️ latest.yml NOT found in UPDATES_DIR`);
      console.warn(`[Server] ⚠️ Files in UPDATES_DIR:`, files.length > 0 ? files.join(', ') : '(empty)');
      console.warn(`[Server] ⚠️ To enable auto-updates, copy latest.yml and installer files to: ${UPDATES_DIR}`);
    }
  })
  .catch((error) => {
    console.error(`[Server] ❌ Error checking UPDATES_DIR: ${UPDATES_DIR}`, error);
  })
  .finally(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] ========================================`);
      console.log(`[Server] Storage server running on port ${PORT}`);
      console.log(`[Server] DATA_DIR: ${DATA_DIR}`);
      console.log(`[Server] ROOT_DIR: ${ROOT_DIR}`);
      console.log(`[Server] Update files directory: ${UPDATES_DIR}`);
      console.log(`[Server] Update endpoint: http://localhost:${PORT}/api/updates/latest`);
      console.log(`[Server] Update endpoint (with .yml): http://localhost:${PORT}/api/updates/latest.yml`);
      console.log(`[Server] ========================================`);
    });
  });
