const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Android APK output directory
const ANDROID_APK_DIR = path.join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'release');

// Helper untuk get upload server URL (pakai port 8888)
function getUploadServerUrl() {
  const serverUrl = getServerUrl();
  try {
    const url = new URL(serverUrl);
    return `http://${url.hostname}:8888`;
  } catch {
    return 'http://server-tljp.tail75a421.ts.net:8888';
  }
}

// Helper untuk extract server URL dari storage_config.json
function getServerUrl() {
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
        
        let serverUrl = null;
        if (config && typeof config === 'object') {
          if (config.serverUrl) {
            serverUrl = config.serverUrl;
          } else if (config.server && config.server.url) {
            serverUrl = config.server.url;
          }
        }
        
        if (serverUrl) {
          return serverUrl;
        }
      }
    } catch (error) {
      // Continue to next path
    }
  }
  
  // Default fallback
  return 'https://server-tljp.tail75a421.ts.net';
}

// Upload file via HTTP
async function uploadFile(filePath, serverUrl) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      reject(new Error(`File tidak ditemukan: ${filePath}`));
      return;
    }
    
    const fileName = path.basename(filePath);
    const fileStats = fs.statSync(filePath);
    const fileSizeMB = (fileStats.size / 1024 / 1024).toFixed(2);
    
    console.error(`  📄 File: ${fileName} (${fileSizeMB} MB)`);
    console.error(`  📤 Uploading raw binary (${fileSizeMB} MB)...`);
    
    const fileBuffer = fs.readFileSync(filePath);
    const url = new URL(serverUrl);
    const httpModule = url.protocol === 'https:' ? https : http;
    const isTailscale = url.hostname.includes('.ts.net');
    
    const startTime = Date.now();
    const connectStartTime = Date.now();
    
    console.error(`  🌐 Connecting to ${url.hostname}:${url.port || (url.protocol === 'https:' ? 443 : 80)}...`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: `/api/updates/upload-binary?filename=${encodeURIComponent(fileName)}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileBuffer.length,
        'X-Filename': fileName,
        'Connection': 'keep-alive'
      },
      rejectUnauthorized: !isTailscale,
      timeout: 30 * 60 * 1000,
      agent: isTailscale ? new (httpModule === https ? https : http).Agent({
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
          const errorMsg = `HTTP ${res.statusCode}: ${data.substring(0, 500)}`;
          console.error(`  ❌ ${errorMsg}`);
          console.error(`  📄 Full response: ${data}`);
          reject(new Error(errorMsg));
        }
      });
    });
    
    req.on('error', (error) => {
      const connectTime = ((Date.now() - connectStartTime) / 1000).toFixed(2);
      console.error(`  ❌ Connection error after ${connectTime}s: ${error.message} (code: ${error.code})`);
      reject(new Error(`Upload failed: ${error.message} (code: ${error.code})`));
    });
    
    req.on('socket', (socket) => {
      socket.on('connect', () => {
        const connectTime = ((Date.now() - connectStartTime) / 1000).toFixed(2);
        console.error(`  ✅ Socket connected in ${connectTime}s`);
      });
    });
    
    // Write file buffer directly
    try {
      req.write(fileBuffer);
      req.end();
      
      const uploadTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error(`  ✅ Upload complete! (${fileSizeMB} MB)`);
    } catch (error) {
      req.destroy();
      console.error(`  ❌ Failed to send request: ${error.message}`);
      reject(new Error(`Failed to send request: ${error.message}`));
    }
  });
}

async function uploadAndroidAPK() {
  try {
    const serverUrl = getUploadServerUrl();
    console.error(`🌐 Upload Server URL: ${serverUrl}`);
    
    // Check Android APK directory
    if (!fs.existsSync(ANDROID_APK_DIR)) {
      console.error(`❌ Android APK directory tidak ditemukan: ${ANDROID_APK_DIR}`);
      process.exit(1);
    }
    
    // Find APK file
    const files = fs.readdirSync(ANDROID_APK_DIR);
    const apkFiles = files.filter(f => f.endsWith('.apk') && !f.includes('unaligned'));
    
    if (apkFiles.length === 0) {
      console.error(`❌ Tidak ada APK file ditemukan di ${ANDROID_APK_DIR}`);
      console.error(`   Available files: ${files.join(', ') || 'none'}`);
      process.exit(1);
    }
    
    // Upload APK (biasanya hanya 1 file release APK)
    const apkFile = apkFiles[0]; // Ambil yang pertama (biasanya app-release.apk)
    const apkPath = path.join(ANDROID_APK_DIR, apkFile);
    
    console.error(`📦 Found APK: ${apkFile}`);
    console.error(`📤 Uploading ${apkFile}...`);
    
    try {
      await uploadFile(apkPath, serverUrl);
      console.error(`✅ Upload berhasil! APK ter-upload ke server.`);
    } catch (error) {
      console.error(`❌ Error uploading ${apkFile}: ${error.message}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run upload
uploadAndroidAPK();
