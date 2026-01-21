/**
 * Test App Auto-Update Mechanism
 * 
 * Test apakah auto-update bisa detect version baru dan download update
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

console.log('🧪 Testing App Auto-Update Mechanism...');
console.log('=' .repeat(60));

// Get current version from package.json
const packageJsonPath = path.join(__dirname, 'package.json');
let currentVersion = 'unknown';

if (fs.existsSync(packageJsonPath)) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    currentVersion = packageJson.version;
    console.log(`📦 Current app version: ${currentVersion}`);
  } catch (error) {
    console.log(`⚠️  Could not read package.json: ${error.message}`);
  }
} else {
  console.log(`⚠️  package.json not found`);
}

// Check build artifacts
console.log('\n🔍 Checking build artifacts:');

const releaseDir = path.join(__dirname, 'release-build');
if (fs.existsSync(releaseDir)) {
  const files = fs.readdirSync(releaseDir);
  const exeFiles = files.filter(f => f.endsWith('.exe') && !f.includes('blockmap'));
  const ymlFiles = files.filter(f => f.endsWith('.yml'));
  
  console.log(`✅ Release directory exists`);
  console.log(`   .exe files: ${exeFiles.length} (${exeFiles.join(', ')})`);
  console.log(`   .yml files: ${ymlFiles.length} (${ymlFiles.join(', ')})`);
  
  // Check latest.yml content
  const latestYmlPath = path.join(releaseDir, 'latest.yml');
  if (fs.existsSync(latestYmlPath)) {
    try {
      const content = fs.readFileSync(latestYmlPath, 'utf8');
      const versionMatch = content.match(/version:\s*(.+)/);
      const pathMatch = content.match(/path:\s*(.+)/);
      const sizeMatch = content.match(/size:\s*(\d+)/);
      
      if (versionMatch) {
        const ymlVersion = versionMatch[1].trim();
        console.log(`✅ latest.yml version: ${ymlVersion}`);
        
        if (ymlVersion !== currentVersion) {
          console.log(`⚠️  Version mismatch! package.json: ${currentVersion}, latest.yml: ${ymlVersion}`);
        } else {
          console.log(`✅ Version match between package.json and latest.yml`);
        }
      }
      
      if (pathMatch) {
        const installerPath = pathMatch[1].trim();
        const fullInstallerPath = path.join(releaseDir, installerPath);
        if (fs.existsSync(fullInstallerPath)) {
          const stats = fs.statSync(fullInstallerPath);
          const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
          console.log(`✅ Installer file exists: ${installerPath} (${sizeMB} MB)`);
          
          if (sizeMatch) {
            const ymlSize = parseInt(sizeMatch[1]);
            if (ymlSize === stats.size) {
              console.log(`✅ File size matches latest.yml`);
            } else {
              console.log(`⚠️  Size mismatch! File: ${stats.size}, yml: ${ymlSize}`);
            }
          }
        } else {
          console.log(`❌ Installer file not found: ${installerPath}`);
        }
      }
    } catch (error) {
      console.log(`❌ Error reading latest.yml: ${error.message}`);
    }
  } else {
    console.log(`❌ latest.yml not found`);
  }
} else {
  console.log(`⚠️  Release directory not found: ${releaseDir}`);
}

// Test update server connectivity
console.log('\n🌐 Testing update server connectivity:');

const testUpdateServer = (serverUrl) => {
  return new Promise((resolve) => {
    try {
      const url = new URL(serverUrl);
      const httpModule = url.protocol === 'https:' ? https : http;
      
      const req = httpModule.request({
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: '/api/updates/latest.yml',
        method: 'GET',
        timeout: 5000,
        rejectUnauthorized: false // For self-signed certificates
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log(`✅ Server accessible: ${serverUrl}`);
            console.log(`   Status: ${res.statusCode}`);
            
            // Parse server version
            const versionMatch = data.match(/version:\s*(.+)/);
            if (versionMatch) {
              const serverVersion = versionMatch[1].trim();
              console.log(`   Server version: ${serverVersion}`);
              
              if (serverVersion !== currentVersion) {
                console.log(`🎯 Update available! Current: ${currentVersion}, Server: ${serverVersion}`);
              } else {
                console.log(`✅ No update needed (versions match)`);
              }
            }
          } else {
            console.log(`⚠️  Server responded with status: ${res.statusCode}`);
          }
          resolve(true);
        });
      });
      
      req.on('error', (error) => {
        console.log(`❌ Cannot reach server: ${serverUrl} - ${error.message}`);
        resolve(false);
      });
      
      req.on('timeout', () => {
        console.log(`❌ Server timeout: ${serverUrl}`);
        req.destroy();
        resolve(false);
      });
      
      req.end();
    } catch (error) {
      console.log(`❌ Invalid server URL: ${serverUrl} - ${error.message}`);
      resolve(false);
    }
  });
};

// Test common server URLs
const testServers = async () => {
  const serverUrls = [
    'https://server-tljp.tail75a421.ts.net',
    'http://server-tljp.tail75a421.ts.net:8888',
    process.env.UPDATE_SERVER_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
  ].filter(Boolean);
  
  if (serverUrls.length === 0) {
    console.log(`⚠️  No server URLs to test`);
    return;
  }
  
  for (const serverUrl of serverUrls) {
    await testUpdateServer(serverUrl);
  }
};

// Check storage config for server URL
console.log('\n📁 Checking storage config for server URL:');

const storageConfigPaths = [
  'data/localStorage/storage_config.json',
  path.join(process.env.HOME || process.env.USERPROFILE || '', '.config', 'trima-laksana-erp', 'storage_config.json')
];

let foundServerUrl = null;

for (const configPath of storageConfigPaths) {
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(content);
      
      let serverUrl = null;
      if (config && typeof config === 'object') {
        if (config.value && config.value.serverUrl) {
          serverUrl = config.value.serverUrl;
        } else if (config.serverUrl) {
          serverUrl = config.serverUrl;
        }
      }
      
      if (serverUrl) {
        console.log(`✅ Found server URL in ${configPath}: ${serverUrl}`);
        foundServerUrl = serverUrl;
        break;
      }
    } catch (error) {
      console.log(`❌ Error reading ${configPath}: ${error.message}`);
    }
  }
}

if (!foundServerUrl) {
  console.log(`⚠️  No server URL found in storage config`);
}

// Run server tests
testServers().then(() => {
  console.log('\n📊 Test Summary:');
  console.log('✅ Auto-update test completed');
  console.log('\n💡 Troubleshooting steps if updates fail:');
  console.log('1. Ensure latest.yml exists and has correct version');
  console.log('2. Verify update server is accessible');
  console.log('3. Check version format matches semver (1.0.6-build.54)');
  console.log('4. Restart app to trigger update check');
  console.log('5. Check electron console for auto-update logs');
  
  console.log('\n🚀 To force update check in app:');
  console.log('- Open DevTools in electron app');
  console.log('- Run: window.electronAPI.checkForUpdates()');
  console.log('- Check console for update status');
}).catch(error => {
  console.error('❌ Test failed:', error.message);
});