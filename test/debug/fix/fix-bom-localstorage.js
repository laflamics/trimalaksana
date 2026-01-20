#!/usr/bin/env node

/**
 * Fix BOM localStorage Issue
 * 
 * Script untuk memaksa populate localStorage dengan data BOM
 * Masalah: localStorage tidak ter-populate dengan data BOM dari file
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fix BOM localStorage Issue...\n');

// Read BOM data from file
const bomPath = path.join(__dirname, 'data/localStorage/bom.json');
if (!fs.existsSync(bomPath)) {
  console.log('❌ BOM file not found');
  process.exit(1);
}

const bomData = JSON.parse(fs.readFileSync(bomPath, 'utf8'));
const bomItems = bomData.value || [];

console.log('📊 BOM Data from file:');
console.log(`• Items: ${bomItems.length}`);
console.log(`• Structure: ${bomData.value ? 'Wrapped' : 'Direct'}`);

// Create localStorage-compatible data
const localStorageData = {
  value: bomItems,
  timestamp: Date.now(),
  _timestamp: Date.now(),
  lastUpdate: new Date().toISOString(),
  source: 'file-to-localStorage-fix',
  loadedFromFile: true,
  fileLoadedAt: new Date().toISOString()
};

console.log('✅ Created localStorage-compatible data structure');

// Generate HTML file to populate localStorage
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fix BOM localStorage</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .success { color: #4CAF50; }
        .error { color: #f44336; }
        .info { color: #2196F3; }
        .warning { color: #ff9800; }
        button {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px 5px;
        }
        button:hover { background: #45a049; }
        .secondary { background: #2196F3; }
        .secondary:hover { background: #1976D2; }
        pre {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Fix BOM localStorage Issue</h1>
        
        <div id="status">
            <p class="info">Ready to fix BOM localStorage issue...</p>
        </div>

        <div>
            <button onclick="fixLocalStorage()">Fix localStorage</button>
            <button onclick="testBOMData()" class="secondary">Test BOM Data</button>
            <button onclick="clearCache()" class="secondary">Clear Cache</button>
        </div>

        <div id="results" style="margin-top: 20px;"></div>
    </div>

    <script>
        const bomData = ${JSON.stringify(localStorageData, null, 2)};
        
        function log(message, type = 'info') {
            const results = document.getElementById('results');
            const className = type === 'success' ? 'success' : 
                            type === 'error' ? 'error' : 
                            type === 'warning' ? 'warning' : 'info';
            results.innerHTML += \`<p class="\${className}">\${message}</p>\`;
            console.log(message);
        }

        function fixLocalStorage() {
            document.getElementById('results').innerHTML = '';
            log('🔄 Fixing localStorage...', 'info');
            
            try {
                // Set BOM data to localStorage
                localStorage.setItem('bom', JSON.stringify(bomData));
                log('✅ BOM data saved to localStorage', 'success');
                
                // Verify the data
                const saved = localStorage.getItem('bom');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    const items = parsed.value || [];
                    log(\`✅ Verified: \${items.length} BOM items in localStorage\`, 'success');
                    
                    // Show first few items
                    if (items.length > 0) {
                        log(\`📋 First BOM item: \${items[0].product_id} → \${items[0].material_id}\`, 'info');
                    }
                } else {
                    log('❌ Failed to save to localStorage', 'error');
                }
                
                // Trigger storage event
                window.dispatchEvent(new CustomEvent('app-storage-changed', {
                    detail: { key: 'bom', value: bomData.value }
                }));
                log('✅ Storage change event dispatched', 'success');
                
                log('🎉 Fix completed! Now refresh your app and check BOM indicators.', 'success');
                
            } catch (error) {
                log(\`❌ Error: \${error.message}\`, 'error');
            }
        }

        function testBOMData() {
            document.getElementById('results').innerHTML = '';
            log('🧪 Testing BOM data...', 'info');
            
            // Test localStorage
            const bomFromStorage = localStorage.getItem('bom');
            if (bomFromStorage) {
                const parsed = JSON.parse(bomFromStorage);
                const items = parsed.value || [];
                log(\`✅ localStorage has \${items.length} BOM items\`, 'success');
                
                // Test extractStorageValue function
                const extractStorageValue = (data) => {
                    if (!data) return [];
                    if (Array.isArray(data)) return data;
                    if (data && typeof data === 'object' && 'value' in data) {
                        const extracted = data.value;
                        if (Array.isArray(extracted)) return extracted;
                        if (!extracted || (typeof extracted === 'object' && Object.keys(extracted).length === 0)) return [];
                    }
                    return [];
                };
                
                const extracted = extractStorageValue(parsed);
                log(\`✅ extractStorageValue returns \${extracted.length} items\`, 'success');
                
                // Test bomProductIdsSet creation
                const bomProductIdsSet = new Set();
                extracted.forEach(b => {
                    if (b && b.product_id) {
                        bomProductIdsSet.add(b.product_id.toLowerCase());
                    }
                });
                log(\`✅ bomProductIdsSet has \${bomProductIdsSet.size} unique product IDs\`, 'success');
                
                // Show some product IDs
                const ids = Array.from(bomProductIdsSet).slice(0, 5);
                log(\`📋 Sample product IDs: \${ids.join(', ')}\`, 'info');
                
            } else {
                log('❌ No BOM data in localStorage', 'error');
            }
        }

        function clearCache() {
            document.getElementById('results').innerHTML = '';
            log('🧹 Clearing cache...', 'info');
            
            // Clear localStorage BOM data
            localStorage.removeItem('bom');
            log('✅ Cleared BOM from localStorage', 'success');
            
            // Clear other cache
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => {
                        caches.delete(name);
                    });
                    log('✅ Cleared browser caches', 'success');
                });
            }
            
            log('🔄 Now run "Fix localStorage" again', 'warning');
        }

        // Auto-run on page load
        window.addEventListener('load', () => {
            log('📊 BOM data loaded from file: ' + bomData.value.length + ' items', 'info');
            log('🚀 Click "Fix localStorage" to populate localStorage with BOM data', 'info');
        });
    </script>
</body>
</html>`;

// Write HTML file
const htmlPath = path.join(__dirname, 'fix-bom-localstorage.html');
fs.writeFileSync(htmlPath, htmlContent);

console.log('✅ Created fix-bom-localstorage.html');
console.log('\n🚀 INSTRUCTIONS:');
console.log('1. 🌐 Open fix-bom-localstorage.html in your browser');
console.log('2. 🔧 Click "Fix localStorage" button');
console.log('3. 🧪 Click "Test BOM Data" to verify');
console.log('4. 🔄 Refresh your main application');
console.log('5. 📱 Navigate to Master > Products');
console.log('6. 👀 Check BOM column for green/orange dots');

console.log('\n💡 WHAT THIS DOES:');
console.log('• Loads BOM data from file into browser localStorage');
console.log('• Triggers storage change event to notify React');
console.log('• Provides testing tools to verify the fix');
console.log('• Simulates the same process as manual BOM edit');

console.log('\n🎯 EXPECTED RESULT:');
console.log('• localStorage will contain BOM data');
console.log('• React will detect the storage change');
console.log('• BOM indicators will appear immediately');
console.log('• 53 products should show green dots');

console.log('\n📁 Files created:');
console.log('• fix-bom-localstorage.html - Browser tool to fix localStorage');

console.log('\n✅ Fix tool ready!');