const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const RELEASE_DIR = path.join(__dirname, '..', 'release-build');

// Helper untuk get upload server URL (pakai Vercel proxy)
function getUploadServerUrl() {
  // Cek environment variable untuk Vercel URL
  const vercelUrl = process.env.VERCEL_URL || process.env.UPDATE_SERVER_VERCEL_URL;
  
  if (vercelUrl) {
    // Pakai Vercel URL langsung (sudah include https://)
    const url = vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
    return url;
  }
  
  // Fallback: pakai server lama (untuk backward compatibility)
  const serverUrl = getServerUrl();
  try {
    const url = new URL(serverUrl);
    // Override port ke 8888 untuk upload (HTTP server)
    return `http://${url.hostname}:8888`;
  } catch {
    // Fallback ke default Tailscale URL dengan port 8888
    return 'http://server-tljp.tail75a421.ts.net:8888';
  }
}

// Helper untuk test connection ke server
function testConnection(serverUrl) {
  return new Promise((resolve) => {
    const url = new URL(serverUrl);
    const httpModule = url.protocol === 'https:' ? https : http;
    const isDirectIP = /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname);
    
    // Test dengan root endpoint yang pasti ada
    const testReq = httpModule.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: '/', // Root endpoint pasti ada
      method: 'GET',
      timeout: 2000, // 2 detik timeout untuk test (lebih cepat)
      rejectUnauthorized: !isDirectIP
    }, (res) => {
      // Any response means server is reachable
      resolve(true);
    });
    
    testReq.on('error', (err) => {
      // ETIMEDOUT, ECONNREFUSED, etc. berarti tidak bisa connect
      resolve(false);
    });
    
    testReq.on('timeout', () => {
      testReq.destroy();
      resolve(false); // Timeout
    });
    
    testReq.end();
  });
}

// Helper untuk extract server URL dari storage_config.json (untuk storage sync)
function getServerUrl() {
  // Cek beberapa lokasi untuk storage_config.json
  const possibleConfigPaths = [
    path.join(__dirname, '..', 'data', 'localStorage', 'storage_config.json'),
    path.join(process.env.HOME || process.env.USERPROFILE || '', '.config', 'trima-laksana-erp', 'storage_config.json'),
    path.join(process.env.APPDATA || '', 'trima-laksana-erp', 'storage_config.json')
  ];
  
  for (const configPath of possibleConfigPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent);
        
        // Extract serverUrl (handle both wrapped and direct format)
        let serverUrl = null;
        if (config && typeof config === 'object') {
          if (config.value && config.value.serverUrl) {
            serverUrl = config.value.serverUrl;
          } else if (config.serverUrl) {
            serverUrl = config.serverUrl;
          }
        }
        
        if (serverUrl) {
          // Normalize URL: trim, ensure protocol
          serverUrl = serverUrl.trim();
          if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
            // Auto-detect protocol based on Tailscale
            const isTailscale = serverUrl.includes('.ts.net');
            serverUrl = isTailscale ? `https://${serverUrl}` : `http://${serverUrl}`;
          }
          return serverUrl;
        }
      }
    } catch (error) {
      // Continue ke path berikutnya
    }
  }
  
  // Default: pakai Tailscale server
  return process.env.SERVER_URL || process.env.UPDATE_SERVER_URL || 'https://server-tljp.tail75a421.ts.net';
}

// Upload file via HTTP POST (seperti data sync)
function uploadFile(filePath, serverUrl) {
  return new Promise((resolve, reject) => {
    // Validasi file
    if (!fs.existsSync(filePath)) {
      reject(new Error(`File tidak ditemukan: ${filePath}`));
      return;
    }
    
    const fileName = path.basename(filePath);
    const fileStats = fs.statSync(filePath);
    const fileSizeMB = (fileStats.size / 1024 / 1024).toFixed(2);
    
    console.error(`  📄 File: ${fileName} (${fileSizeMB} MB)`);
    
    // Baca file dengan error handling
    let fileBuffer;
    try {
      fileBuffer = fs.readFileSync(filePath);
    } catch (error) {
      reject(new Error(`Failed to read file: ${error.message}`));
      return;
    }
    
    // Validasi file size
    if (fileBuffer.length === 0) {
      reject(new Error(`File kosong: ${filePath}`));
      return;
    }
    
    // Pakai raw binary upload (LEBIH CEPAT - tanpa base64 overhead)
    console.error(`  📤 Uploading raw binary (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)...`);
    
    // Parse URL - support IP langsung atau domain
    let url;
    try {
      url = new URL(serverUrl);
    } catch (error) {
      // Fallback: tambah protocol jika belum ada (default HTTP untuk IP langsung)
      const urlWithProtocol = serverUrl.startsWith('http') ? serverUrl : `http://${serverUrl}`;
      try {
        url = new URL(urlWithProtocol);
      } catch (e) {
        reject(new Error(`Invalid server URL: ${serverUrl} - ${e.message}`));
        return;
      }
    }
    
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    const isTailscale = url.hostname.includes('.ts.net');
    const isDirectIP = /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname); // Check if it's direct IP
    
    // Untuk direct IP, default port 8888 (sesuai server)
    // Tailscale funnel biasanya tidak perlu port, default 443 untuk HTTPS
    // Kalau ada port di URL, pakai itu. Kalau tidak, pakai default
    let port = url.port;
    if (!port) {
      if (isDirectIP) {
        port = 8888; // Default port untuk direct IP upload server
      } else {
        port = isHttps ? 443 : 80;
      }
    } else {
      port = parseInt(port, 10);
    }
    
    const startTime = Date.now();
    const connectStartTime = Date.now();
    
    console.error(`  🌐 Connecting to ${url.hostname}:${port}...`);
    
    const options = {
      hostname: url.hostname,
      port: port,
      path: `/api/updates/upload-binary?filename=${encodeURIComponent(fileName)}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileBuffer.length,
        'X-Filename': fileName,
        'Connection': 'keep-alive' // Keep connection alive untuk lebih cepat
      },
      // Untuk Tailscale, skip certificate verification (direct IP pakai HTTP jadi tidak perlu)
      rejectUnauthorized: !isTailscale,
      // Timeout untuk file besar: 10 menit (lebih cepat, kalau timeout berarti server bermasalah)
      timeout: 10 * 60 * 1000,
      // Optimize untuk Tailscale
      agent: isTailscale ? new (isHttps ? https : http).Agent({
        keepAlive: true,
        keepAliveMsecs: 1000,
        maxSockets: 1,
        maxFreeSockets: 1
      }) : undefined
    };
    
    const req = httpModule.request(options, (res) => {
      const connectTime = ((Date.now() - connectStartTime) / 1000).toFixed(2);
      console.error(`  ✅ Connected in ${connectTime}s`);
      
      let data = '';
      let receivedBytes = 0;
      
      res.on('data', (chunk) => {
        data += chunk;
        receivedBytes += chunk.length;
      });
      
      res.on('end', () => {
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.error(`  ⏱️  Response received in ${elapsedTime}s`);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const result = JSON.parse(data);
            if (!result.success) {
              const errorMsg = `Server returned success=false: ${result.error || 'Unknown error'}`;
              console.error(`  ❌ ${errorMsg}`);
              
              // Tidak perlu retry - langsung reject
              
              reject(new Error(errorMsg));
              return;
            }
            if (result.size !== fileBuffer.length) {
              console.error(`  ⚠️  Size mismatch! Sent: ${fileBuffer.length}, Server: ${result.size}`);
            }
            console.error(`  ✅ Upload successful!`);
            resolve(result);
          } catch (error) {
            console.error(`  ❌ Invalid JSON response: ${error.message}`);
            console.error(`  📄 Response: ${data.substring(0, 500)}`);
            reject(new Error(`Invalid JSON response: ${error.message}`));
          }
        } else {
          // Log response body untuk debug
          const errorMsg = `HTTP ${res.statusCode}: ${data.substring(0, 500)}`;
          console.error(`  ❌ ${errorMsg}`);
          console.error(`  📄 Full response: ${data}`);
          
          // Tidak perlu retry - langsung reject
          
          reject(new Error(errorMsg));
        }
      });
    });
    
    req.on('error', (error) => {
      const connectTime = ((Date.now() - connectStartTime) / 1000).toFixed(2);
      
      console.error(`  ❌ Connection error after ${connectTime}s: ${error.message} (code: ${error.code})`);
      
      reject(new Error(`Upload failed: ${error.message} (code: ${error.code})`));
    });
    
    // Track connection time
    req.on('socket', (socket) => {
      socket.on('connect', () => {
        const connectTime = ((Date.now() - connectStartTime) / 1000).toFixed(2);
        console.error(`  ✅ Socket connected in ${connectTime}s`);
      });
    });
    
    req.on('timeout', () => {
      console.error(`  ❌ Request timeout`);
      req.destroy();
      reject(new Error('Upload timeout - file mungkin terlalu besar atau koneksi lambat'));
    });
    
    try {
      // Progress indicator sederhana - hanya 1 bar, update setiap 5 detik
      const uploadStartTime = Date.now();
      let progressInterval;
      let isUploading = true;
      
      // Update progress setiap 5 detik (tidak spam)
      const updateProgress = () => {
        if (!isUploading) return;
        
        const elapsed = (Date.now() - uploadStartTime) / 1000;
        const totalMB = (fileBuffer.length / 1024 / 1024).toFixed(2);
        
        // Simple indicator - hanya show elapsed time dan total size
        process.stderr.write(`\r  📤 Uploading... (${totalMB} MB, ${elapsed.toFixed(0)}s)`);
      };
      
      // Start progress indicator - update setiap 5 detik
      progressInterval = setInterval(updateProgress, 5000);
      
      // Write data dalam chunks kecil untuk avoid socket closed error
      const chunkSize = 2 * 1024 * 1024; // 2MB chunks
      let offset = 0;
      
      const writeNextChunk = () => {
        if (offset >= fileBuffer.length) {
          isUploading = false;
          clearInterval(progressInterval);
          process.stderr.write(`\r  ✅ Upload complete! (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)\n`);
          req.end();
          return;
        }
        
        const chunk = fileBuffer.slice(offset, Math.min(offset + chunkSize, fileBuffer.length));
          const canContinue = req.write(chunk, (error) => {
          if (error) {
            isUploading = false;
            clearInterval(progressInterval);
            process.stderr.write('\n');
            
            console.error(`  ❌ Failed to send data: ${error.message}`);
            
            reject(new Error(`Failed to send data: ${error.message}`));
            return;
          }
          
          offset += chunk.length;
        });
        
        if (!canContinue) {
          // Wait for drain event
          req.once('drain', writeNextChunk);
        } else {
          // Continue immediately
          setImmediate(writeNextChunk);
        }
      };
      
      // Start writing chunks
      writeNextChunk();
      
    } catch (error) {
      req.destroy();
      console.error(`  ❌ Failed to send request: ${error.message}`);
      reject(new Error(`Failed to send request: ${error.message}`));
    }
  });
}

// Upload file via SCP/rsync (lebih cepat untuk file besar)
async function uploadFileViaSCP(filePath, fileName) {
  const serverHost = process.env.UPDATE_SERVER_HOST || 'server-tljp.tail75a421.ts.net';
  const serverUser = process.env.UPDATE_SERVER_USER || 'sepuloh';
  const serverPath = process.env.UPDATE_SERVER_PATH || 'D:/trimalaksana/apps/PT.Trima Laksana Jaya Pratama/docker/data/update';
  
  const fileSize = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
  
  console.error(`  📤 Uploading via SCP: ${fileName} (${fileSize} MB)...`);
  console.error(`  🌐 Target: ${serverUser}@${serverHost}:${serverPath}`);
  
  // Cek apakah rsync tersedia
  let useRsync = false;
  try {
    await execAsync('which rsync', { timeout: 2000 });
    useRsync = true;
  } catch {
    // rsync tidak ada, pakai scp
  }
  
  if (useRsync) {
    try {
      // Pakai rsync dengan progress untuk lebih cepat dan bisa resume
      // Untuk Windows path dengan spasi, pakai format: "D:/path with spaces/"
      const rsyncCmd = `rsync -avzP "${filePath}" "${serverUser}@${serverHost}:${serverPath}/"`;
      
      console.error(`  🔄 Running rsync...`);
      const { stdout, stderr } = await execAsync(rsyncCmd, {
        maxBuffer: 10 * 1024 * 1024,
        timeout: 600000
      });
      
      if (stderr && !stderr.includes('sending incremental file list') && !stderr.includes('total size') && !stderr.includes('speedup')) {
        console.error(`  ⚠️  rsync warning: ${stderr}`);
      }
      
      console.error(`  ✅ Upload successful via rsync!`);
      return { success: true, fileName, size: fs.statSync(filePath).size };
    } catch (error) {
      console.error(`  ⚠️  rsync failed, fallback ke scp...`);
      useRsync = false;
    }
  }
  
  // Pakai scp (default atau fallback)
  try {
    // Untuk Windows path dengan spasi di scp, format: "D:/path with spaces/"
    // scp handle quotes dengan baik untuk Windows path
    const scpCmd = `scp "${filePath}" "${serverUser}@${serverHost}:${serverPath}/"`;
    
    console.error(`  🔄 Running scp...`);
    await execAsync(scpCmd, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 600000
    });
    console.error(`  ✅ Upload successful via SCP!`);
    return { success: true, fileName, size: fs.statSync(filePath).size };
  } catch (scpError) {
    console.error(`  ❌ SCP upload failed: ${scpError.message}`);
    if (scpError.stderr) {
      console.error(`  ❌ Error details: ${scpError.stderr.substring(0, 500)}`);
    }
    throw scpError;
  }
}

async function uploadFiles() {
  try {
    // Cek apakah pakai SCP method
    const uploadMethod = process.env.UPDATE_SERVER_METHOD || 'http';
    
    if (uploadMethod === 'scp') {
      console.error(`🚀 Using SCP/rsync upload method (faster for large files)`);
      
      // Check release directory
      if (!fs.existsSync(RELEASE_DIR)) {
        console.error(`❌ Release directory tidak ditemukan: ${RELEASE_DIR}`);
        process.exit(1);
      }
      
      // List files yang perlu di-upload
      const files = fs.readdirSync(RELEASE_DIR);
      let filesToUpload = [];
      
      const allExeFiles = files.filter(f => f.endsWith('.exe'));
      const allAppImageFiles = files.filter(f => f.endsWith('.AppImage'));
      if (allExeFiles.length > 0) {
        console.error(`🔍 Found ${allExeFiles.length} .exe files: ${allExeFiles.join(', ')}`);
      }
      if (allAppImageFiles.length > 0) {
        console.error(`🔍 Found ${allAppImageFiles.length} .AppImage files: ${allAppImageFiles.join(', ')}`);
      }
      
      // 🚀 Handle Windows build: Hanya upload 1 file .exe dan 1 file latest.yml
      const latestYmlPath = path.join(RELEASE_DIR, 'latest.yml');
      if (fs.existsSync(latestYmlPath)) {
        const latestYmlContent = fs.readFileSync(latestYmlPath, 'utf8');
        const exeMatch = latestYmlContent.match(/path:\s*(.+\.exe)/);
        if (exeMatch) {
          const exeFileName = exeMatch[1].trim();
          const exePath = path.join(RELEASE_DIR, exeFileName);
          if (fs.existsSync(exePath)) {
            filesToUpload.push({ path: exePath, name: exeFileName });
            console.error(`✅ Found .exe file: ${exeFileName}`);
          }
        }
        filesToUpload.push({ path: latestYmlPath, name: 'latest.yml' });
        // Skip patch files dan blockmap - hanya upload main installer dan yaml
      }
      
      // Handle Linux build (latest-linux.yml)
      const latestLinuxYmlPath = path.join(RELEASE_DIR, 'latest-linux.yml');
      if (fs.existsSync(latestLinuxYmlPath)) {
        const latestLinuxYmlContent = fs.readFileSync(latestLinuxYmlPath, 'utf8');
        const appImageMatch = latestLinuxYmlContent.match(/path:\s*(.+\.AppImage)/);
        if (appImageMatch) {
          const appImageFileName = appImageMatch[1].trim();
          const appImagePath = path.join(RELEASE_DIR, appImageFileName);
          if (fs.existsSync(appImagePath)) {
            filesToUpload.push({ path: appImagePath, name: appImageFileName });
            console.error(`✅ Found .AppImage file: ${appImageFileName}`);
          }
        } else {
          // Fallback: cari semua .AppImage files
          const appImageFiles = files.filter(f => f.endsWith('.AppImage') && !f.includes('unpacked'));
          if (appImageFiles.length > 0) {
            appImageFiles.forEach(appImageFile => {
              filesToUpload.push({ path: path.join(RELEASE_DIR, appImageFile), name: appImageFile });
            });
          }
        }
        filesToUpload.push({ path: latestLinuxYmlPath, name: 'latest-linux.yml' });
      }
      
      // 🚀 Fallback: jika tidak ada latest.yml atau latest-linux.yml, cari file langsung
      // Hanya ambil 1 file .exe atau 1 file .AppImage (skip patch, blockmap)
      if (filesToUpload.length === 0) {
        // Cari .exe files (hanya main installer, skip patch)
        const exeFiles = files.filter(f => 
          f.endsWith('.exe') && 
          !f.includes('blockmap') && 
          !f.endsWith('.exe.patch') &&
          !f.includes('unpacked')
        );
        if (exeFiles.length > 0) {
          // Hanya ambil yang pertama (main installer)
          const mainExe = exeFiles[0];
          filesToUpload.push({ path: path.join(RELEASE_DIR, mainExe), name: mainExe });
          console.error(`✅ Found main .exe file: ${mainExe}`);
        }
        // Cari .AppImage files (hanya 1 file)
        const appImageFiles = files.filter(f => f.endsWith('.AppImage') && !f.includes('unpacked'));
        if (appImageFiles.length > 0) {
          // Hanya ambil yang pertama
          const mainAppImage = appImageFiles[0];
          filesToUpload.push({ path: path.join(RELEASE_DIR, mainAppImage), name: mainAppImage });
          console.error(`✅ Found main .AppImage file: ${mainAppImage}`);
        }
      }
      
      if (filesToUpload.length === 0) {
        console.error(`❌ Tidak ada file yang perlu di-upload`);
        process.exit(1);
      }
      
      console.error(`📦 Akan upload ${filesToUpload.length} file via SCP: ${filesToUpload.map(f => f.name).join(', ')}`);
      
      // Upload semua file via SCP
      let successCount = 0;
      let failCount = 0;
      
      for (const file of filesToUpload) {
        try {
          await uploadFileViaSCP(file.path, file.name);
          successCount++;
        } catch (error) {
          console.error(`❌ Error uploading ${file.name}: ${error.message}`);
          failCount++;
        }
      }
      
      if (failCount > 0) {
        console.error(`❌ Upload gagal! ${failCount} dari ${filesToUpload.length} file gagal.`);
        process.exit(1);
      } else {
        console.error(`✅ Upload berhasil! ${successCount} file ter-upload via SCP/rsync.`);
      }
      
      return; // Exit early untuk SCP method
    }
    
    // HTTP upload method (existing code)
    // Cek apakah skip upload (untuk build cepat)
    if (process.env.SKIP_UPLOAD === 'true' || process.env.SKIP_UPDATE_UPLOAD === 'true') {
      console.error(`⏭️  Skipping upload (SKIP_UPLOAD=true)`);
      return;
    }
    
    // Coba pakai IP langsung dulu, fallback ke Tailscale jika tidak bisa
    let serverUrl = getUploadServerUrl();
    console.error(`🌐 Testing connection to ${serverUrl}...`);
    
    // Test connection dulu (timeout 3 detik - lebih cepat)
    const canConnect = await testConnection(serverUrl);
    
    if (!canConnect) {
      console.error(`⚠️  Server tidak bisa diakses, skip upload untuk mempercepat build...`);
      console.error(`💡 Untuk upload manual, set VERCEL_URL atau UPDATE_SERVER_VERCEL_URL`);
      return; // Skip upload kalau server tidak accessible
    } else {
      console.error(`✅ Server accessible, using: ${serverUrl}`);
    }
    
    // Check release directory
    if (!fs.existsSync(RELEASE_DIR)) {
      console.error(`❌ Release directory tidak ditemukan: ${RELEASE_DIR}`);
      process.exit(1);
    }
  
  // List files yang perlu di-upload
  // Upload file Windows: .exe, latest.yml, .exe.patch (blockmap tidak perlu)
  // Upload file Linux: .AppImage, latest-linux.yml
  const files = fs.readdirSync(RELEASE_DIR);
  let filesToUpload = [];
  
  // Debug: log semua file yang ada di release-build
  const allExeFiles = files.filter(f => f.endsWith('.exe'));
  const allAppImageFiles = files.filter(f => f.endsWith('.AppImage'));
  if (allExeFiles.length > 0) {
    console.error(`🔍 Found ${allExeFiles.length} .exe files: ${allExeFiles.join(', ')}`);
  }
  if (allAppImageFiles.length > 0) {
    console.error(`🔍 Found ${allAppImageFiles.length} .AppImage files: ${allAppImageFiles.join(', ')}`);
  }
  
  const latestYmlPath = path.join(RELEASE_DIR, 'latest.yml');
  if (fs.existsSync(latestYmlPath)) {
    // Kalau ada latest.yml, berarti build Windows - upload file yang disebutkan di sana
    try {
      const ymlContent = fs.readFileSync(latestYmlPath, 'utf8');
      
      // Parse file URLs dari latest.yml - coba berbagai format
      // Format 1: "- url: filename.exe" atau "-url: filename.exe"
      // Format 2: "url: filename.exe" (tanpa dash)
      // Format 3: "path: filename.exe"
      const urlPatterns = [
        /-+\s*url:\s*([^\s\n]+)/g,
        /url:\s*([^\s\n]+)/g,
        /path:\s*([^\s\n]+)/g
      ];
      
      const foundFiles = new Set();
      
      for (const pattern of urlPatterns) {
        const matches = ymlContent.matchAll(pattern);
        for (const match of matches) {
          const fileName = match[1].trim();
          if (fileName && (fileName.endsWith('.exe') || fileName.endsWith('.exe.patch'))) {
            foundFiles.add(fileName);
          }
        }
      }
      
      // Tambahkan file yang ditemukan dari YAML jika file ada
      foundFiles.forEach(fileName => {
        const filePath = path.join(RELEASE_DIR, fileName);
        if (fs.existsSync(filePath)) {
          filesToUpload.push(fileName);
        }
      });
      
      // SELALU cari file .exe langsung di release-build (backup jika parsing gagal)
      // Lebih fleksibel: cari semua .exe yang bukan blockmap atau patch
      const exeFiles = files.filter(f => 
        f.endsWith('.exe') && 
        !f.includes('blockmap') && 
        !f.endsWith('.exe.patch') &&
        !f.includes('unpacked') // Exclude unpacked folders
      );
      
      // Tambahkan .exe yang belum ada di filesToUpload
      exeFiles.forEach(exeFile => {
        if (!filesToUpload.includes(exeFile)) {
          filesToUpload.push(exeFile);
          console.error(`✅ Found .exe file: ${exeFile}`);
        }
      });
      
      // 🚀 Hanya upload main installer .exe dan latest.yml
      // Skip patch files dan blockmap (user minta hanya 1 file .exe dan 1 file .yaml)
      
      // Selalu include latest.yml di akhir
      filesToUpload.push('latest.yml');
    } catch (error) {
      // Fallback: cari file Windows secara langsung (lebih fleksibel)
      filesToUpload = files.filter(f => {
        if (f === 'latest.yml') return true;
        if (f.endsWith('.exe') && !f.includes('blockmap') && !f.endsWith('.exe.patch') && !f.includes('unpacked')) return true;
        if (f.endsWith('.exe.patch')) return true;
        if (f.endsWith('.blockmap')) return true;
        return false;
      });
      console.error(`⚠️  Using fallback filter, found ${filesToUpload.length} files`);
    }
  }
  
  // Handle Linux build (latest-linux.yml dan AppImage)
  const latestLinuxYmlPath = path.join(RELEASE_DIR, 'latest-linux.yml');
  if (fs.existsSync(latestLinuxYmlPath)) {
    try {
      const ymlContent = fs.readFileSync(latestLinuxYmlPath, 'utf8');
      
      // Parse file URLs dari latest-linux.yml
      const urlPatterns = [
        /-+\s*url:\s*([^\s\n]+)/g,
        /url:\s*([^\s\n]+)/g,
        /path:\s*([^\s\n]+)/g
      ];
      
      const foundFiles = new Set();
      
      for (const pattern of urlPatterns) {
        const matches = ymlContent.matchAll(pattern);
        for (const match of matches) {
          const fileName = match[1].trim();
          if (fileName && fileName.endsWith('.AppImage')) {
            foundFiles.add(fileName);
          }
        }
      }
      
      // Tambahkan file yang ditemukan dari YAML jika file ada
      foundFiles.forEach(fileName => {
        const filePath = path.join(RELEASE_DIR, fileName);
        if (fs.existsSync(filePath)) {
          filesToUpload.push(fileName);
          console.error(`✅ Found .AppImage file: ${fileName}`);
        }
      });
      
      // SELALU cari file .AppImage langsung di release-build (backup jika parsing gagal)
      const appImageFiles = files.filter(f => 
        f.endsWith('.AppImage') && 
        !f.includes('unpacked')
      );
      
      // Tambahkan .AppImage yang belum ada di filesToUpload
      appImageFiles.forEach(appImageFile => {
        if (!filesToUpload.includes(appImageFile)) {
          filesToUpload.push(appImageFile);
          console.error(`✅ Found .AppImage file: ${appImageFile}`);
        }
      });
      
      // Selalu include latest-linux.yml
      filesToUpload.push('latest-linux.yml');
    } catch (error) {
      // Fallback: cari file AppImage secara langsung
      const appImageFiles = files.filter(f => 
        f.endsWith('.AppImage') && !f.includes('unpacked')
      );
      if (appImageFiles.length > 0) {
        appImageFiles.forEach(appImageFile => {
          filesToUpload.push(appImageFile);
        });
        filesToUpload.push('latest-linux.yml');
        console.error(`⚠️  Using fallback filter for Linux, found ${appImageFiles.length} AppImage files`);
      }
    }
  }
  
  // Jika tidak ada latest.yml atau latest-linux.yml, exit
  if (filesToUpload.length === 0 && !fs.existsSync(latestYmlPath) && !fs.existsSync(latestLinuxYmlPath)) {
    console.error(`⚠️  Tidak ada latest.yml atau latest-linux.yml ditemukan`);
    process.exit(0);
  }
  
  // 🚀 Filter ulang: Hanya upload main installer dan yaml (skip patch, blockmap)
  // User minta hanya 1 file .exe dan 1 file .yaml untuk Windows
  // User minta hanya 1 file untuk Android
  filesToUpload = filesToUpload.filter(f => {
    if (f === 'latest.yml' || f === 'latest-linux.yml' || f === 'latest-android.yml') return true;
    if (f.endsWith('.exe') && !f.includes('blockmap') && !f.endsWith('.exe.patch') && !f.includes('unpacked')) return true;
    if (f.endsWith('.AppImage') && !f.includes('unpacked')) return true;
    if (f.endsWith('.apk') && !f.includes('unaligned')) return true;
    // Skip patch files, blockmap, dan file lainnya
    return false;
  });
  
  // Hapus duplikat
  filesToUpload = [...new Set(filesToUpload)];
  
  // Validasi: pastikan semua file ada sebelum upload
  filesToUpload = filesToUpload.filter(f => {
    const filePath = path.join(RELEASE_DIR, f);
    if (!fs.existsSync(filePath)) {
      console.error(`⚠️  File tidak ditemukan, skip: ${f}`);
      return false;
    }
    return true;
  });
  
  if (filesToUpload.length === 0) {
    console.error(`❌ Tidak ada file yang perlu di-upload!`);
    console.error(`📁 Files di ${RELEASE_DIR}:`, files.join(', '));
    process.exit(0);
  }
  
  // Log file yang akan di-upload
  console.error(`📦 Akan upload ${filesToUpload.length} file: ${filesToUpload.join(', ')}`);
  
  let totalSize = 0;
  filesToUpload.forEach(f => {
    const filePath = path.join(RELEASE_DIR, f);
    const stats = fs.statSync(filePath);
    totalSize += stats.size;
  });
  
  // Upload files via HTTP POST (simple seperti data sync)
  let successCount = 0;
  let failCount = 0;
  
  for (const file of filesToUpload) {
    const srcPath = path.join(RELEASE_DIR, file);
    if (!fs.existsSync(srcPath)) {
      console.error(`❌ File tidak ditemukan: ${file}`);
      failCount++;
      continue;
    }
    
    const fileStats = fs.statSync(srcPath);
    
    try {
      console.error(`📤 Uploading ${file} (${(fileStats.size / 1024 / 1024).toFixed(2)} MB)...`);
      const result = await uploadFile(srcPath, serverUrl);
      if (result && result.success && result.size === fileStats.size) {
        successCount++;
        console.error(`✅ Success: ${file}`);
      } else {
        failCount++;
        if (result && result.size !== fileStats.size) {
          console.error(`⚠️  Size mismatch! Local: ${fileStats.size}, Server: ${result.size || 'unknown'}`);
        } else {
          console.error(`❌ Upload failed: ${file} - ${result?.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      failCount++;
      console.error(`❌ Error uploading ${file}: ${error.message}`);
      if (error.stack) {
        console.error(`   Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
      }
    }
  }
  
  if (failCount > 0) {
    console.error(`❌ Upload gagal! ${failCount} dari ${filesToUpload.length} file gagal.`);
    process.exit(1);
  } else {
    console.error(`✅ Upload berhasil! ${successCount} file ter-upload ke server.`);
  }
  } catch (error) {
    console.error(`❌ Fatal error in uploadFiles: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    process.exit(1);
  }
}

uploadFiles().catch(error => {
  console.error('❌ Fatal error:', error.message);
  console.error('   Stack:', error.stack);
  process.exit(1);
});
