/**
 * Script untuk list semua path/route di Packaging, General Trading, dan Trucking
 * Tidak akan edit apapun, hanya membaca dan menganalisis
 */

const fs = require('fs');
const path = require('path');

console.log('📋 Listing All Module Paths - Packaging, General Trading, Trucking\n');

// Function to find all React component files
function findComponentFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findComponentFiles(filePath, fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Function to extract routes from component files
function extractRoutesFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const routes = [];
    
    // Look for route patterns
    const routePatterns = [
      /path:\s*['"`]([^'"`]+)['"`]/g,
      /to=['"`]([^'"`]+)['"`]/g,
      /href=['"`]([^'"`]+)['"`]/g,
      /navigate\(['"`]([^'"`]+)['"`]\)/g,
      /\/[a-zA-Z0-9\-_\/]+/g
    ];
    
    routePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1] && match[1].startsWith('/')) {
          routes.push(match[1]);
        }
      }
    });
    
    return [...new Set(routes)]; // Remove duplicates
  } catch (error) {
    return [];
  }
}

// Main analysis function
function analyzeModulePaths() {
  const modules = {
    'Packaging': 'src/pages/Packaging',
    'GeneralTrading': 'src/pages/GeneralTrading', 
    'Trucking': 'src/pages/Trucking'
  };
  
  const allPaths = {};
  
  Object.entries(modules).forEach(([moduleName, moduleDir]) => {
    console.log(`🔍 Analyzing ${moduleName} Module...\n`);
    
    if (!fs.existsSync(moduleDir)) {
      console.log(`❌ Directory not found: ${moduleDir}\n`);
      return;
    }
    
    // Get all component files
    const componentFiles = findComponentFiles(moduleDir);
    console.log(`📁 Found ${componentFiles.length} component files in ${moduleName}:`);
    
    const modulePaths = [];
    
    componentFiles.forEach(filePath => {
      const relativePath = filePath.replace('src/pages/', '');
      const componentName = path.basename(filePath, path.extname(filePath));
      
      console.log(`   📄 ${relativePath}`);
      
      // Try to infer route from file structure
      const routePath = '/' + relativePath
        .replace(/\.tsx?$/, '')
        .replace(/\\/g, '/')
        .toLowerCase();
      
      modulePaths.push({
        component: componentName,
        file: relativePath,
        inferredRoute: routePath
      });
      
      // Extract routes from file content
      const extractedRoutes = extractRoutesFromFile(filePath);
      if (extractedRoutes.length > 0) {
        console.log(`      🔗 Routes found: ${extractedRoutes.join(', ')}`);
      }
    });
    
    allPaths[moduleName] = modulePaths;
    console.log('');
  });
  
  return allPaths;
}

// Function to analyze routing configuration
function analyzeRoutingConfig() {
  console.log('🔧 Analyzing Routing Configuration...\n');
  
  const routingFiles = [
    'src/App.tsx',
    'src/router.tsx',
    'src/routes.tsx',
    'src/components/Router.tsx',
    'src/components/Navigation.tsx',
    'src/components/Sidebar.tsx'
  ];
  
  routingFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      console.log(`📄 Found routing file: ${filePath}`);
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Look for route definitions
        const routeMatches = content.match(/path:\s*['"`]([^'"`]+)['"`]/g);
        if (routeMatches) {
          console.log(`   🔗 Routes defined:`);
          routeMatches.forEach(match => {
            const route = match.match(/['"`]([^'"`]+)['"`]/)[1];
            console.log(`      - ${route}`);
          });
        }
        
        // Look for navigation links
        const navMatches = content.match(/to=['"`]([^'"`]+)['"`]/g);
        if (navMatches) {
          console.log(`   🧭 Navigation links:`);
          navMatches.forEach(match => {
            const link = match.match(/['"`]([^'"`]+)['"`]/)[1];
            console.log(`      - ${link}`);
          });
        }
        
      } catch (error) {
        console.log(`   ❌ Error reading file: ${error.message}`);
      }
      console.log('');
    }
  });
}

// Function to generate comprehensive path list
function generatePathList(allPaths) {
  console.log('📊 COMPREHENSIVE PATH LIST\n');
  console.log('=' .repeat(80));
  
  Object.entries(allPaths).forEach(([moduleName, paths]) => {
    console.log(`\n🏢 ${moduleName.toUpperCase()} MODULE`);
    console.log('-'.repeat(40));
    
    paths.forEach((pathInfo, index) => {
      console.log(`${index + 1}. ${pathInfo.component}`);
      console.log(`   📁 File: ${pathInfo.file}`);
      console.log(`   🔗 Inferred Route: ${pathInfo.inferredRoute}`);
      console.log('');
    });
  });
  
  // Generate summary
  console.log('\n📈 SUMMARY');
  console.log('=' .repeat(80));
  
  Object.entries(allPaths).forEach(([moduleName, paths]) => {
    console.log(`${moduleName}: ${paths.length} components`);
  });
  
  const totalComponents = Object.values(allPaths).reduce((sum, paths) => sum + paths.length, 0);
  console.log(`\nTotal Components: ${totalComponents}`);
}

// Main execution
function main() {
  try {
    const allPaths = analyzeModulePaths();
    analyzeRoutingConfig();
    generatePathList(allPaths);
    
    console.log('\n✅ Analysis completed successfully!');
    console.log('📝 This list shows all component files and their inferred routes.');
    console.log('🔍 Check the routing configuration files for actual route definitions.');
    
  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
  }
}

// Run the analysis
main();