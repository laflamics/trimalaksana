/**
 * Script untuk menganalisis semua server paths dan API endpoints
 * yang digunakan di Packaging, General Trading, dan Trucking
 */

const fs = require('fs');
const path = require('path');

console.log('🌐 ANALYZING SERVER PATHS AND API ENDPOINTS\n');

// Function to find all files recursively
function findAllFiles(dir, extensions = ['.tsx', '.ts', '.js'], fileList = []) {
  if (!fs.existsSync(dir)) {
    return fileList;
  }
  
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findAllFiles(filePath, extensions, fileList);
    } else if (extensions.some(ext => file.endsWith(ext))) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Function to extract server paths from file content
function extractServerPaths(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    const serverPaths = [];

    // Patterns to look for server/API paths
    const patterns = [
      // API endpoints
      { name: 'API Endpoints', regex: /['"`](\/api\/[^'"`]+)['"`]/g },
      { name: 'Server URLs', regex: /['"`](https?:\/\/[^'"`]+)['"`]/g },
      { name: 'Fetch URLs', regex: /fetch\s*\(\s*['"`]([^'"`]+)['"`]/g },
      { name: 'Axios URLs', regex: /axios\.[get|post|put|delete]+\s*\(\s*['"`]([^'"`]+)['"`]/g },
      { name: 'Server Paths', regex: /['"`](\/server\/[^'"`]+)['"`]/g },
      { name: 'Data Paths', regex: /['"`](\/data\/[^'"`]+)['"`]/g },
      { name: 'Upload Paths', regex: /['"`](\/upload[^'"`]*)['"`]/g },
      { name: 'Download Paths', regex: /['"`](\/download[^'"`]*)['"`]/g },
      // Vercel proxy paths
      { name: 'Vercel Proxy', regex: /['"`](\/vercel-proxy[^'"`]*)['"`]/g },
      // Storage service paths
      { name: 'Storage Paths', regex: /storageService\.[get|set]+\s*\(\s*['"`]([^'"`]+)['"`]/g },
      // File system paths
      { name: 'File Paths', regex: /['"`]([^'"`]*\.(json|csv|xlsx|pdf|png|jpg|jpeg))['"`]/g }
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.regex.exec(content)) !== null) {
        if (match[1]) {
          serverPaths.push({
            type: pattern.name,
            path: match[1],
            file: fileName
          });
        }
      }
    });

    return serverPaths;
  } catch (error) {
    return [];
  }
}

// Function to analyze specific modules
function analyzeModuleServerPaths() {
  const modules = [
    { name: 'Packaging', dir: 'src/pages/Packaging' },
    { name: 'General Trading', dir: 'src/pages/GeneralTrading' },
    { name: 'Trucking', dir: 'src/pages/Trucking' },
    { name: 'Services', dir: 'src/services' },
    { name: 'Utils', dir: 'src/utils' }
  ];

  const allServerPaths = {};

  modules.forEach(module => {
    console.log(`🔍 Analyzing ${module.name} Module...\n`);
    
    if (!fs.existsSync(module.dir)) {
      console.log(`❌ Directory not found: ${module.dir}\n`);
      return;
    }

    const files = findAllFiles(module.dir);
    const modulePaths = [];

    files.forEach(filePath => {
      const serverPaths = extractServerPaths(filePath);
      modulePaths.push(...serverPaths);
    });

    // Group by type
    const groupedPaths = {};
    modulePaths.forEach(pathInfo => {
      if (!groupedPaths[pathInfo.type]) {
        groupedPaths[pathInfo.type] = [];
      }
      groupedPaths[pathInfo.type].push(pathInfo);
    });

    // Display results
    Object.entries(groupedPaths).forEach(([type, paths]) => {
      if (paths.length > 0) {
        console.log(`📊 ${type}:`);
        
        // Remove duplicates
        const uniquePaths = [...new Map(paths.map(p => [p.path, p])).values()];
        uniquePaths.sort((a, b) => a.path.localeCompare(b.path));
        
        uniquePaths.forEach(pathInfo => {
          console.log(`   🔗 ${pathInfo.path} - ${pathInfo.file}`);
        });
        console.log('');
      }
    });

    allServerPaths[module.name] = modulePaths;
    console.log(`Total paths found in ${module.name}: ${modulePaths.length}\n`);
  });

  return allServerPaths;
}

// Function to check vercel proxy configuration
function checkVercelProxyConfig() {
  console.log('🔧 VERCEL PROXY CONFIGURATION\n');
  
  const proxyFiles = [
    'vercel-proxy/vercel.json',
    'vercel.json',
    'src/vercel-proxy.config.js',
    'vercel-proxy-optimization.md'
  ];

  proxyFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      console.log(`📄 Found proxy config: ${filePath}`);
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Extract proxy routes
        const proxyRoutes = content.match(/['"`]\/[^'"`]*['"`]/g);
        if (proxyRoutes) {
          console.log('   🔗 Proxy routes:');
          [...new Set(proxyRoutes)].forEach(route => {
            const cleanRoute = route.replace(/['"`]/g, '');
            if (cleanRoute.startsWith('/')) {
              console.log(`      - ${cleanRoute}`);
            }
          });
        }
        
      } catch (error) {
        console.log(`   ❌ Error reading: ${error.message}`);
      }
      console.log('');
    }
  });
}

// Function to analyze data structure paths
function analyzeDataStructurePaths() {
  console.log('💾 DATA STRUCTURE PATHS\n');
  
  const dataDir = 'data';
  if (fs.existsSync(dataDir)) {
    const findDataFiles = (dir, prefix = '') => {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        const relativePath = prefix + file;
        
        if (stat.isDirectory()) {
          console.log(`📁 ${relativePath}/`);
          findDataFiles(filePath, relativePath + '/');
        } else {
          console.log(`📄 ${relativePath}`);
        }
      });
    };
    
    findDataFiles(dataDir);
  }
}

// Function to check server endpoints in specific files
function checkServerEndpoints() {
  console.log('\n🌐 SERVER ENDPOINTS ANALYSIS\n');
  
  const serverFiles = [
    'src/services/storage.ts',
    'src/services/gt-sync.ts',
    'src/services/packaging-sync.ts',
    'src/services/trucking-sync.ts'
  ];

  serverFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      console.log(`📄 ${filePath}:`);
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Look for server configurations
        const serverConfigs = [
          { name: 'Base URLs', regex: /baseURL\s*:\s*['"`]([^'"`]+)['"`]/g },
          { name: 'API URLs', regex: /apiUrl\s*:\s*['"`]([^'"`]+)['"`]/g },
          { name: 'Server URLs', regex: /serverUrl\s*:\s*['"`]([^'"`]+)['"`]/g },
          { name: 'Endpoints', regex: /endpoint\s*:\s*['"`]([^'"`]+)['"`]/g }
        ];

        serverConfigs.forEach(config => {
          let match;
          while ((match = config.regex.exec(content)) !== null) {
            console.log(`   ${config.name}: ${match[1]}`);
          }
        });
        
      } catch (error) {
        console.log(`   ❌ Error reading: ${error.message}`);
      }
      console.log('');
    }
  });
}

// Main execution
function main() {
  try {
    const allServerPaths = analyzeModuleServerPaths();
    checkVercelProxyConfig();
    analyzeDataStructurePaths();
    checkServerEndpoints();
    
    // Generate comprehensive summary
    console.log('\n📈 COMPREHENSIVE SERVER PATHS SUMMARY');
    console.log('='.repeat(80));
    
    let totalPaths = 0;
    Object.entries(allServerPaths).forEach(([moduleName, paths]) => {
      console.log(`${moduleName}: ${paths.length} server paths`);
      totalPaths += paths.length;
    });
    
    console.log(`\nTotal Server Paths Found: ${totalPaths}`);
    console.log('\n✅ Server paths analysis completed!');
    console.log('📝 This analysis shows all server-related paths and endpoints used in the application.');
    
  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
  }
}

// Run the analysis
main();