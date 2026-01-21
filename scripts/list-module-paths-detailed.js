/**
 * Script untuk list semua path di Packaging, General Trading, dan Trucking
 * Fokus pada path read dan write - tidak akan edit apapun
 */

const fs = require('fs');
const path = require('path');

console.log('📋 DETAILED MODULE PATHS ANALYSIS\n');
console.log('🔍 Analyzing Packaging, General Trading, and Trucking modules...\n');

// Function to recursively find all files
function findAllFiles(dir, extensions = ['.tsx', '.ts'], fileList = []) {
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

// Function to analyze file structure
function analyzeModuleStructure() {
  const modules = {
    'PACKAGING': {
      dir: 'src/pages/Packaging',
      color: '📦'
    },
    'GENERAL TRADING': {
      dir: 'src/pages/GeneralTrading',
      color: '🏪'
    },
    'TRUCKING': {
      dir: 'src/pages/Trucking',
      color: '🚛'
    }
  };

  Object.entries(modules).forEach(([moduleName, config]) => {
    console.log(`${config.color} ${moduleName} MODULE`);
    console.log('='.repeat(60));
    
    if (!fs.existsSync(config.dir)) {
      console.log(`❌ Directory not found: ${config.dir}\n`);
      return;
    }

    // Get directory structure
    const files = findAllFiles(config.dir);
    
    if (files.length === 0) {
      console.log('📁 No TypeScript/React files found\n');
      return;
    }

    // Group files by subdirectory
    const filesByDir = {};
    files.forEach(filePath => {
      const relativePath = path.relative(config.dir, filePath);
      const dirName = path.dirname(relativePath);
      const fileName = path.basename(relativePath);
      
      if (!filesByDir[dirName]) {
        filesByDir[dirName] = [];
      }
      filesByDir[dirName].push({
        name: fileName,
        fullPath: filePath,
        relativePath: relativePath
      });
    });

    // Display organized structure
    Object.entries(filesByDir).forEach(([dirName, dirFiles]) => {
      if (dirName === '.') {
        console.log('📁 Root Files:');
      } else {
        console.log(`📁 ${dirName}/:`);
      }
      
      dirFiles.forEach((file, index) => {
        const isLast = index === dirFiles.length - 1;
        const prefix = isLast ? '└── ' : '├── ';
        console.log(`   ${prefix}📄 ${file.name}`);
        
        // Infer route path
        const routePath = '/' + file.relativePath
          .replace(/\.tsx?$/, '')
          .replace(/\\/g, '/')
          .toLowerCase();
        
        console.log(`       🔗 Route: ${routePath}`);
        console.log(`       📂 Path: ${file.relativePath}`);
      });
      console.log('');
    });

    console.log(`📊 Total files in ${moduleName}: ${files.length}\n`);
  });
}

// Function to analyze routing patterns
function analyzeRoutingPatterns() {
  console.log('🔧 ROUTING PATTERNS ANALYSIS');
  console.log('='.repeat(60));
  
  const routingFiles = [
    'src/App.tsx',
    'src/router.tsx', 
    'src/routes.tsx',
    'src/components/Router.tsx',
    'src/components/Navigation.tsx',
    'src/components/Sidebar.tsx',
    'src/components/Layout.tsx'
  ];

  routingFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      console.log(`\n📄 ${filePath}:`);
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Extract route patterns
        const patterns = [
          { name: 'Route Definitions', regex: /path:\s*['"`]([^'"`]+)['"`]/g },
          { name: 'Navigation Links', regex: /to=['"`]([^'"`]+)['"`]/g },
          { name: 'Href Links', regex: /href=['"`]([^'"`]+)['"`]/g },
          { name: 'Navigate Calls', regex: /navigate\(['"`]([^'"`]+)['"`]\)/g }
        ];

        patterns.forEach(pattern => {
          const matches = [];
          let match;
          while ((match = pattern.regex.exec(content)) !== null) {
            if (match[1] && (match[1].startsWith('/') || match[1].includes('packaging') || match[1].includes('trucking') || match[1].includes('trading'))) {
              matches.push(match[1]);
            }
          }
          
          if (matches.length > 0) {
            console.log(`   🔗 ${pattern.name}:`);
            [...new Set(matches)].forEach(route => {
              console.log(`      - ${route}`);
            });
          }
        });
        
      } catch (error) {
        console.log(`   ❌ Error reading: ${error.message}`);
      }
    }
  });
}

// Function to analyze data paths (read/write operations)
function analyzeDataPaths() {
  console.log('\n💾 DATA PATHS ANALYSIS (Read/Write Operations)');
  console.log('='.repeat(60));
  
  const moduleFiles = [
    ...findAllFiles('src/pages/Packaging'),
    ...findAllFiles('src/pages/GeneralTrading'),
    ...findAllFiles('src/pages/Trucking'),
    ...findAllFiles('src/services')
  ];

  const dataOperations = {
    'Storage Keys': [],
    'File Paths': [],
    'API Endpoints': []
  };

  moduleFiles.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileName = path.basename(filePath);
      
      // Extract storage keys
      const storageMatches = content.match(/storageService\.(get|set)\s*\(\s*['"`]([^'"`]+)['"`]/g);
      if (storageMatches) {
        storageMatches.forEach(match => {
          const keyMatch = match.match(/['"`]([^'"`]+)['"`]/);
          if (keyMatch) {
            dataOperations['Storage Keys'].push({
              key: keyMatch[1],
              file: fileName,
              operation: match.includes('.get') ? 'READ' : 'WRITE'
            });
          }
        });
      }

      // Extract file paths
      const fileMatches = content.match(/['"`]([^'"`]*\.(json|csv|xlsx|pdf))['"`]/g);
      if (fileMatches) {
        fileMatches.forEach(match => {
          const pathMatch = match.match(/['"`]([^'"`]+)['"`]/);
          if (pathMatch) {
            dataOperations['File Paths'].push({
              path: pathMatch[1],
              file: fileName
            });
          }
        });
      }

      // Extract API endpoints
      const apiMatches = content.match(/['"`](\/api\/[^'"`]+)['"`]/g);
      if (apiMatches) {
        apiMatches.forEach(match => {
          const endpointMatch = match.match(/['"`]([^'"`]+)['"`]/);
          if (endpointMatch) {
            dataOperations['API Endpoints'].push({
              endpoint: endpointMatch[1],
              file: fileName
            });
          }
        });
      }
      
    } catch (error) {
      // Skip files that can't be read
    }
  });

  // Display data operations
  Object.entries(dataOperations).forEach(([category, items]) => {
    if (items.length > 0) {
      console.log(`\n📊 ${category}:`);
      
      // Remove duplicates and sort
      const uniqueItems = [...new Map(items.map(item => [JSON.stringify(item), item])).values()];
      uniqueItems.sort((a, b) => (a.key || a.path || a.endpoint).localeCompare(b.key || b.path || b.endpoint));
      
      uniqueItems.forEach(item => {
        if (item.key) {
          console.log(`   🔑 ${item.key} (${item.operation}) - ${item.file}`);
        } else if (item.path) {
          console.log(`   📁 ${item.path} - ${item.file}`);
        } else if (item.endpoint) {
          console.log(`   🌐 ${item.endpoint} - ${item.file}`);
        }
      });
    }
  });
}

// Function to generate summary
function generateSummary() {
  console.log('\n📈 SUMMARY');
  console.log('='.repeat(60));
  
  const modules = ['src/pages/Packaging', 'src/pages/GeneralTrading', 'src/pages/Trucking'];
  
  modules.forEach(moduleDir => {
    const moduleName = path.basename(moduleDir);
    const files = findAllFiles(moduleDir);
    console.log(`${moduleName}: ${files.length} components`);
  });
  
  const totalFiles = modules.reduce((sum, dir) => sum + findAllFiles(dir).length, 0);
  console.log(`\nTotal Components: ${totalFiles}`);
  
  console.log('\n✅ Analysis completed - no files were modified');
  console.log('📋 This report shows all paths and data operations in the three modules');
}

// Main execution
function main() {
  try {
    analyzeModuleStructure();
    analyzeRoutingPatterns();
    analyzeDataPaths();
    generateSummary();
    
  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
  }
}

// Run the analysis
main();