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
const UPDATES_DIR = path.join(DATA_DIR, 'update'); // Simpan update files di data/update/
const UPLOADS_DIR = path.join(__dirname, 'uploads'); // Directory untuk uploaded files (PDF, images, etc.)

// Ensure data directory exists
fs.mkdir(DATA_DIR, { recursive: true }).catch(console.error);

// Ensure update directory exists
fs.mkdir(UPDATES_DIR, { recursive: true }).catch(console.error);

// Ensure uploads directory exists
fs.mkdir(UPLOADS_DIR, { recursive: true }).catch(console.error);

app.use(cors());

// Error handler untuk body parser (untuk catch request yang terlalu besar)
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    console.error(`[Server] ❌ Body parser error: ${error.message}`);
    return res.status(400).json({ error: 'Request body too large or invalid. Max size: 100MB' });
  }
  next();
});

// Increase body size limit BEFORE other middleware
// Must be set before express.json() middleware
// Limit besar untuk upload installer .exe (bisa sampai 500MB+)
// Skip express.json() untuk upload-binary route (pakai express.raw() di route handler)
app.use((req, res, next) => {
  if (req.path === '/api/updates/upload-binary') {
    return next(); // Skip JSON parsing untuk upload-binary
  }
  express.json({ 
    limit: '1gb',
    parameterLimit: 50000 
  })(req, res, next);
});
app.use(express.urlencoded({ 
  extended: true, 
  limit: '1gb', // Increase to 1GB for large installer files
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
  const startTime = Date.now();
  try {
    console.log(`[Server] GET /api/storage/all - since: ${req.query.since || 0}`);
    const since = req.query.since ? parseInt(req.query.since) : 0; // Get only data changed since this timestamp
    
    // Check if DATA_DIR exists
    try {
      await fs.access(DATA_DIR);
    } catch {
      console.warn(`[Server] DATA_DIR does not exist: ${DATA_DIR}, creating...`);
      await fs.mkdir(DATA_DIR, { recursive: true });
    }
    
    const files = await fs.readdir(DATA_DIR);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    console.log(`[Server] Found ${jsonFiles.length} JSON files to process`);
    
    const data = {};
    const timestamps = {};
    
    // OPTIMIZED: Read files in parallel instead of sequential
    const filePromises = jsonFiles.map(async (file) => {
      const key = file.replace('.json', '');
      try {
        const filePath = path.join(DATA_DIR, file);
        const content = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(content);
        
        // Extract value and timestamp
        // Handle both wrapped format {value, timestamp} and direct values
        let fileTimestamp = 0;
        let fileValue;
        
        if (parsed && typeof parsed === 'object' && parsed.value !== undefined) {
          fileValue = parsed.value;
          fileTimestamp = parsed.timestamp || parsed._timestamp || 0;
        } else if (parsed && typeof parsed === 'object' && (parsed.timestamp || parsed._timestamp)) {
          fileValue = parsed;
          fileTimestamp = parsed.timestamp || parsed._timestamp || 0;
        } else {
          // Direct value (string, number, etc.)
          fileValue = parsed;
          fileTimestamp = 0;
        }
        
        // Only include if changed since 'since' timestamp (incremental sync)
        if (fileTimestamp > since || since === 0) {
          return { key, value: fileValue, timestamp: fileTimestamp };
        }
        return null;
      } catch (error) {
        // Skip invalid JSON files
        console.warn(`[Server] Skipping invalid JSON file: ${file}`, error.message);
        return null;
      }
    });
    
    // Wait for all files to be read in parallel
    const results = await Promise.all(filePromises);
    
    // Process results
    for (const result of results) {
      if (result) {
        data[result.key] = result.value;
        timestamps[result.key] = result.timestamp;
      }
    }
    
    const elapsedTime = Date.now() - startTime;
    console.log(`[Server] ✅ Returning ${Object.keys(data).length} keys from /api/storage/all (took ${elapsedTime}ms)`);
    res.json({ data, timestamps, serverTime: Date.now() });
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    console.error(`[Server] ❌ Error in /api/storage/all (took ${elapsedTime}ms):`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get storage value with timestamp (single key)
app.get('/api/storage/:key', async (req, res) => {
  try {
    const filePath = path.join(DATA_DIR, `${req.params.key}.json`);
    const data = await fs.readFile(filePath, 'utf8');
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch (parseError) {
      // If not valid JSON, treat as string
      return res.json({ value: data, timestamp: 0 });
    }
    
    // Return with timestamp if available
    // Handle both wrapped format {value, timestamp} and direct values
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
      // Direct value (string, number, etc.) or backward compatibility
      res.json({ value: parsed, timestamp: 0 });
    }
  } catch (error) {
    res.status(404).json({ error: 'Not found' });
  }
});

// Set storage value with timestamp
app.post('/api/storage/:key', async (req, res) => {
  try {
    const key = req.params.key;
    console.log(`[Server] POST /api/storage/${key} - received data`);
    
    // Ensure DATA_DIR exists
    try {
      await fs.access(DATA_DIR);
    } catch {
      console.warn(`[Server] DATA_DIR does not exist: ${DATA_DIR}, creating...`);
      await fs.mkdir(DATA_DIR, { recursive: true });
    }
    
    const filePath = path.join(DATA_DIR, `${key}.json`);
    const newValue = req.body.value;
    const newTimestamp = req.body.timestamp || Date.now();
    
    console.log(`[Server] Saving ${key}: value type=${typeof newValue}, isArray=${Array.isArray(newValue)}, timestamp=${newTimestamp}`);
    
    // Try to read existing data for merge
    let existingData = null;
    let existingTimestamp = 0;
    try {
      const existingContent = await fs.readFile(filePath, 'utf8');
      let existing;
      try {
        existing = JSON.parse(existingContent);
      } catch (parseError) {
        // If not valid JSON, treat as string
        existing = existingContent;
      }
      
      // Handle both wrapped format {value, timestamp} and direct values
      if (existing && typeof existing === 'object' && existing.value !== undefined) {
        existingData = existing.value;
        existingTimestamp = existing.timestamp || existing._timestamp || 0;
      } else if (existing && typeof existing === 'object' && (existing.timestamp || existing._timestamp)) {
        existingData = existing;
        existingTimestamp = existing.timestamp || existing._timestamp || 0;
      } else {
        // Direct value (string, number, etc.)
        existingData = existing;
        existingTimestamp = 0;
      }
    } catch {
      // File doesn't exist, use new data
    }
    
    // Last-write-wins: use newer data
    let finalValue = newValue;
    let finalTimestamp = newTimestamp;
    
    if (existingData && existingTimestamp > newTimestamp) {
      // Server has newer data, but merge if possible
      finalValue = mergeData(existingData, newValue, existingTimestamp, newTimestamp);
      finalTimestamp = existingTimestamp;
    } else {
      // New data is newer or equal, merge with existing if possible
      if (existingData) {
        finalValue = mergeData(newValue, existingData, newTimestamp, existingTimestamp);
      }
      finalTimestamp = newTimestamp;
    }
    
    // Save with timestamp
    const dataToSave = {
      value: finalValue,
      timestamp: finalTimestamp,
      _timestamp: finalTimestamp, // Backward compatibility
    };
    
    await fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2));
    
    console.log(`[Server] ✅ Saved ${key} to ${filePath} (${Array.isArray(finalValue) ? finalValue.length : 'object'} items, timestamp: ${finalTimestamp})`);
    
    res.json({ success: true, timestamp: finalTimestamp });
  } catch (error) {
    console.error(`[Server] ❌ Error saving ${req.params.key}:`, error);
    res.status(500).json({ error: error.message });
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
app.delete('/api/storage/:key', async (req, res) => {
  try {
    const filePath = path.join(DATA_DIR, `${req.params.key}.json`);
    await fs.unlink(filePath);
    res.json({ success: true });
  } catch (error) {
    res.status(404).json({ error: 'Not found' });
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
      const filePath = path.join(DATA_DIR, `${key}.json`);
      
      // Try to read existing server data
      let serverData = null;
      let serverTimestamp = 0;
      try {
        const existingContent = await fs.readFile(filePath, 'utf8');
        let existing;
        try {
          existing = JSON.parse(existingContent);
        } catch (parseError) {
          // If not valid JSON, treat as string
          existing = existingContent;
        }
        
        // Handle both wrapped format {value, timestamp} and direct values
        if (existing && typeof existing === 'object' && existing.value !== undefined) {
          serverData = existing.value;
          serverTimestamp = existing.timestamp || existing._timestamp || 0;
        } else if (existing && typeof existing === 'object' && (existing.timestamp || existing._timestamp)) {
          serverData = existing;
          serverTimestamp = existing.timestamp || existing._timestamp || 0;
        } else {
          // Direct value (string, number, etc.)
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
          // Server is newer, but merge client changes
          finalValue = mergeData(serverData, clientValue, serverTimestamp, clientTimestamp);
          finalTimestamp = serverTimestamp;
          conflicts++;
        } else {
          // Client is newer or equal, merge server data
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

// Seed Trucking database
app.post('/api/seedtrucking', async (req, res) => {
  try {
    console.log('Starting Trucking seed process...');
    
    // Run seedtrucking script
    const seedTruckingScriptPath = path.join(ROOT_DIR, 'scripts', 'seedtrucking.js');
    
    // Check if script exists
    try {
      await fs.access(seedTruckingScriptPath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Trucking Seed script not found. Make sure scripts/seedtrucking.js exists.',
      });
    }

    console.log('Running Trucking seed script:', seedTruckingScriptPath);
    
    const { stdout, stderr } = await execAsync(`node "${seedTruckingScriptPath}"`, {
      cwd: ROOT_DIR,
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      env: { ...process.env, SERVER_URL: `http://localhost:${PORT}` },
    });

    if (stderr && !stderr.includes('warning') && !stderr.includes('deprecated')) {
      console.error('Trucking Seed stderr:', stderr);
    }

    console.log('Trucking Seed completed:', stdout);

    // Get seed results
    const result = {
      success: true,
      message: 'Trucking Seed completed successfully',
      output: stdout,
    };

    res.json(result);
  } catch (error) {
    console.error('Trucking Seed error:', error);
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

// Upload update files dengan raw binary (LEBIH CEPAT - tanpa base64 overhead)
// express.raw() middleware harus di route handler untuk override express.json() global
app.post('/api/updates/upload-binary', express.raw({ 
  limit: '1gb', 
  type: 'application/octet-stream' 
}), async (req, res) => {
  // Set timeout untuk endpoint ini (60 menit untuk upload file besar)
  req.setTimeout(60 * 60 * 1000);
  res.setTimeout(60 * 60 * 1000);
  
  try {
    const fileName = req.headers['x-filename'] || req.query.filename || 'uploaded-file.exe';
    
    console.error(`[Server] 📤 Upload request: filename=${fileName}, body length=${req.body ? req.body.length : 0}, query=${JSON.stringify(req.query)}`);
    
    // Cek apakah body adalah Buffer (dari express.raw())
    if (!req.body || !Buffer.isBuffer(req.body) || req.body.length === 0) {
      console.error(`[Server] ❌ Invalid body: body=${req.body}, body type=${typeof req.body}, isBuffer=${Buffer.isBuffer(req.body)}, length=${req.body ? req.body.length : 0}`);
      return res.status(400).json({ 
        error: 'Request body is empty or invalid', 
        bodyLength: req.body ? req.body.length : 0, 
        bodyType: typeof req.body,
        isBuffer: Buffer.isBuffer(req.body)
      });
    }
    
    // Ensure UPDATES_DIR exists
    try {
      await fs.access(UPDATES_DIR);
    } catch {
      await fs.mkdir(UPDATES_DIR, { recursive: true });
    }
    
    // Save file langsung dari raw binary (SANGAT CEPAT)
    const filePath = path.join(UPDATES_DIR, fileName);
    
    try {
      await fs.writeFile(filePath, req.body);
      const stats = await fs.stat(filePath);
      
      if (stats.size !== req.body.length) {
        return res.status(500).json({ 
          error: 'File write verification failed: size mismatch',
          written: req.body.length,
          read: stats.size
        });
      }
      
      res.json({ 
        success: true, 
        fileName: fileName,
        size: stats.size,
        path: path.resolve(filePath)
      });
    } catch (writeError) {
      console.error(`[Server] ❌ Write error: ${writeError.message}`);
      return res.status(500).json({ 
        error: `Failed to write file: ${writeError.message}`
      });
    }
  } catch (error) {
    console.error(`[Server] ❌ Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Upload update files (latest.yml, installer.exe, etc.) - simple HTTP POST seperti data sync (LEGACY - pakai base64)
app.post('/api/updates/upload', async (req, res) => {
  // Set timeout untuk endpoint ini (60 menit untuk upload file besar)
  req.setTimeout(60 * 60 * 1000);
  res.setTimeout(60 * 60 * 1000);
  
  try {
    // Check if body exists
    if (!req.body) {
      console.error(`[Server] ❌ Request body is missing`);
      return res.status(400).json({ error: 'Request body is missing' });
    }
    
    const { base64Data, fileName } = req.body;
    
    if (!base64Data || !fileName) {
      return res.status(400).json({ error: 'base64Data and fileName are required' });
    }
    
    if (typeof base64Data !== 'string' || base64Data.length === 0) {
      console.error(`[Server] ❌ Invalid base64Data: type=${typeof base64Data}, length=${base64Data?.length || 0}`);
      return res.status(400).json({ error: 'base64Data must be a non-empty string' });
    }
    
    // Ensure UPDATES_DIR exists
    try {
      await fs.access(UPDATES_DIR);
    } catch {
      await fs.mkdir(UPDATES_DIR, { recursive: true });
    }
    
    // Extract base64 data (remove data URL prefix if present)
    let base64Content = base64Data;
    if (base64Content.includes(',')) {
      base64Content = base64Content.split(',')[1];
    }
    
    // Convert base64 to buffer (optimize untuk file besar)
    let buffer;
    try {
      // Pakai Buffer.from langsung - lebih cepat untuk file besar
      buffer = Buffer.from(base64Content, 'base64');
    } catch (error) {
      console.error(`[Server] ❌ Base64 decode error: ${error.message}`);
      return res.status(400).json({ error: `Invalid base64 data: ${error.message}` });
    }
    
    if (buffer.length === 0) {
      console.error(`[Server] ❌ Decoded buffer is empty`);
      return res.status(400).json({ error: 'Decoded file is empty' });
    }
    
    // Save file dengan writeFile langsung (lebih cepat dari streaming untuk file besar)
    const filePath = path.join(UPDATES_DIR, fileName);
    
    try {
      // Write langsung tanpa verify dulu (lebih cepat)
      await fs.writeFile(filePath, buffer);
      
      // Verify setelah write (lebih cepat)
      const verifyStats = await fs.stat(filePath);
      if (verifyStats.size !== buffer.length) {
        console.error(`[Server] ❌ Size mismatch! Written: ${buffer.length}, Read: ${verifyStats.size}, file: ${fileName}`);
        return res.status(500).json({ 
          error: 'File write verification failed: size mismatch',
          written: buffer.length,
          read: verifyStats.size
        });
      }
    } catch (writeError) {
      console.error(`[Server] ❌ Write error: ${writeError.message}, path: ${filePath}`);
      return res.status(500).json({ 
        error: `Failed to write file: ${writeError.message}`,
        path: filePath
      });
    }
    
    const absolutePath = path.resolve(filePath);
    
    res.json({ 
      success: true, 
      fileName: fileName,
      size: verifyStats.size,
      path: absolutePath,
      message: `File saved to: ${absolutePath}`
    });
  } catch (error) {
    console.error(`[Server] ❌ Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to get latest version info (with .yml extension)
// MUST be placed BEFORE /api/updates/latest to handle .yml correctly
app.get('/api/updates/latest.yml', async (req, res) => {
  try {
    const latestYmlPath = path.join(UPDATES_DIR, 'latest.yml');
    
    try {
      // Check if file exists
      await fs.stat(latestYmlPath);
      
      const ymlContent = await fs.readFile(latestYmlPath, 'utf8');
      
      res.setHeader('Content-Type', 'text/yaml');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-cache');
      res.send(ymlContent);
    } catch (error) {
      // If latest.yml doesn't exist, return 404
  
      
      // Try to list files in UPDATES_DIR for debugging
      try {
        await fs.readdir(UPDATES_DIR);
      } catch (dirError) {
        console.error(`[Server] Cannot read UPDATES_DIR:`, dirError.message);
      }
      
      // Try to check if UPDATES_DIR exists
      try {
        await fs.stat(UPDATES_DIR);
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
  } catch (error) {
    console.error(`[Server] ❌ Error in /api/updates/latest.yml:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to get latest version info (without .yml extension)
app.get('/api/updates/latest', async (req, res) => {
  try {
    const latestYmlPath = path.join(UPDATES_DIR, 'latest.yml');
    
    try {
      // Check if file exists
      await fs.access(latestYmlPath);
      const ymlContent = await fs.readFile(latestYmlPath, 'utf8');
      
      res.setHeader('Content-Type', 'text/yaml');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(ymlContent);
    } catch (error) {
      // If latest.yml doesn't exist, return 404
      
      // Try to list files in UPDATES_DIR for debugging
      try {
        await fs.readdir(UPDATES_DIR);
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
// IMPORTANT: Serve from /api/updates/ path (not /updates/) to match electron-updater feed URL
// Place AFTER API endpoints to avoid conflicts
app.use('/api/updates', express.static(UPDATES_DIR, {
  setHeaders: (res, filePath) => {
    // Set proper content type for YAML files
    if (filePath.endsWith('.yml') || filePath.endsWith('.yaml')) {
      res.setHeader('Content-Type', 'text/yaml');
    }
    // Set proper content type for executable files
    if (filePath.endsWith('.exe')) {
      res.setHeader('Content-Type', 'application/octet-stream');
    }
    // Allow CORS for update files
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Disable caching for update files
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
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
      seedTrucking: '/api/seedtrucking',
      updates: '/api/updates/latest',
      updatesFiles: '/updates/*'
    }
  });
});

// Ensure DATA_DIR exists before starting server
fs.mkdir(DATA_DIR, { recursive: true })
  .then(() => {
    return fs.access(DATA_DIR);
  })
  .catch((error) => {
    console.error(`[Server] ❌ Error creating/accessing DATA_DIR: ${DATA_DIR}`, error);
  });

// Check UPDATES_DIR and latest.yml before starting server
fs.mkdir(UPDATES_DIR, { recursive: true })
  .then(() => {
    return fs.readdir(UPDATES_DIR);
  })
  .catch((error) => {
    console.error(`[Server] ❌ Error checking UPDATES_DIR: ${UPDATES_DIR}`, error);
  })
  .finally(() => {
    const server = app.listen(PORT, '0.0.0.0', () => {
    });
    
    // Set server timeout untuk upload file besar (60 menit)
    server.timeout = 60 * 60 * 1000; // 60 menit
    server.keepAliveTimeout = 60 * 60 * 1000; // 60 menit
    server.headersTimeout = 60 * 60 * 1000; // 60 menit
  });

