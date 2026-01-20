#!/usr/bin/env node

/**
 * Force React Re-render
 * 
 * Script untuk memaksa React re-render dan memastikan BOM state ter-update
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Force React Re-render...\n');

// Read current BOM data
const bomPath = path.join(__dirname, 'data/localStorage/bom.json');
const bomData = JSON.parse(fs.readFileSync(bomPath, 'utf8'));

// Force update BOM data with new timestamp to trigger React re-render
const updatedBomData = {
  ...bomData,
  timestamp: Date.now(),
  _timestamp: Date.now(),
  lastUpdate: new Date().toISOString(),
  forceRerender: true,
  rerenderTrigger: Math.random().toString(36).substr(2, 9),
  debugInfo: {
    itemCount: bomData.value ? bomData.value.length : 0,
    uniqueProductIds: bomData.value ? new Set(bomData.value.map(b => b.product_id)).size : 0,
    timestamp: new Date().toISOString()
  }
};

// Update each BOM item to ensure fresh data
if (bomData.value && Array.isArray(bomData.value)) {
  updatedBomData.value = bomData.value.map(item => ({
    ...item,
    lastUpdated: new Date().toISOString(),
    forceRerender: true
  }));
}

// Write back to file
fs.writeFileSync(bomPath, JSON.stringify(updatedBomData, null, 2));
console.log('✅ BOM data updated with force re-render trigger');

// Also update products data to trigger reload
const productsPath = path.join(__dirname, 'data/localStorage/products.json');
if (fs.existsSync(productsPath)) {
  const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
  const updatedProductsData = {
    ...productsData,
    timestamp: Date.now(),
    _timestamp: Date.now(),
    lastUpdate: new Date().toISOString(),
    bomReloadTrigger: true,
    rerenderTrigger: Math.random().toString(36).substr(2, 9)
  };
  
  fs.writeFileSync(productsPath, JSON.stringify(updatedProductsData, null, 2));
  console.log('✅ Products data updated to trigger reload');
}

// Create browser script to force localStorage update and React re-render
const browserScript = `
// Force React Re-render Script
// Copy and paste this in browser console while on Products page

console.log('🔄 Force React Re-render...');

// 1. Update BOM data in localStorage with fresh timestamp
const bomData = ${JSON.stringify(updatedBomData, null, 2)};
localStorage.setItem('bom', JSON.stringify(bomData));
console.log('✅ BOM data updated in localStorage');

// 2. Dispatch storage change event to trigger React reload
window.dispatchEvent(new CustomEvent('app-storage-changed', {
  detail: { key: 'bom', value: bomData.value }
}));
console.log('✅ Storage change event dispatched');

// 3. Also dispatch bomUpdated event
window.dispatchEvent(new CustomEvent('bomUpdated', {
  detail: { 
    productId: 'ALL', 
    bomItems: bomData.value, 
    source: 'ForceRerender',
    timestamp: Date.now()
  }
}));
console.log('✅ BOM updated event dispatched');

// 4. Force page refresh if events don't work
setTimeout(() => {
  console.log('🔄 If BOM indicators still not showing, refreshing page...');
  // Uncomment next line to force page refresh
  // window.location.reload();
}, 2000);

console.log('🎯 Check BOM column now - should show green/orange dots');
console.log('📊 Expected: ${updatedBomData.debugInfo.uniqueProductIds} products with green dots');
`;

// Write browser script to file
fs.writeFileSync('force-react-rerender-browser.js', browserScript);
console.log('✅ Browser script created: force-react-rerender-browser.js');

// Generate HTML test page
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Force React Re-render</title>
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
        <h1>🔄 Force React Re-render</h1>
        
        <div id="status">
            <p class="info">Ready to force React re-render for BOM indicators...</p>
        </div>

        <div>
            <button onclick="forceRerender()">Force Re-render</button>
            <button onclick="testBOMData()" class="secondary">Test BOM Data</button>
            <button onclick="refreshPage()" class="secondary">Refresh Page</button>
        </div>

        <div id="results" style="margin-top: 20px;"></div>
    </div>

    <script>
        const bomData = ${JSON.stringify(updatedBomData, null, 2)};
        
        function log(message, type = 'info') {
            const results = document.getElementById('results');
            const className = type === 'success' ? 'success' : 
                            type === 'error' ? 'error' : 
                            type === 'warning' ? 'warning' : 'info';
            results.innerHTML += \`<p class="\${className}">\${message}</p>\`;
            console.log(message);
        }

        function forceRerender() {
            document.getElementById('results').innerHTML = '';
            log('🔄 Forcing React re-render...', 'info');
            
            try {
                // Update localStorage
                localStorage.setItem('bom', JSON.stringify(bomData));
                log('✅ BOM data updated in localStorage', 'success');
                
                // Dispatch events
                window.dispatchEvent(new CustomEvent('app-storage-changed', {
                    detail: { key: 'bom', value: bomData.value }
                }));
                log('✅ Storage change event dispatched', 'success');
                
                window.dispatchEvent(new CustomEvent('bomUpdated', {
                    detail: { 
                        productId: 'ALL', 
                        bomItems: bomData.value, 
                        source: 'ForceRerender',
                        timestamp: Date.now()
                    }
                }));
                log('✅ BOM updated event dispatched', 'success');
                
                log('🎯 Check your Products page now - BOM indicators should appear!', 'success');
                log(\`📊 Expected: \${bomData.debugInfo.uniqueProductIds} products with green dots\`, 'info');
                
            } catch (error) {
                log(\`❌ Error: \${error.message}\`, 'error');
            }
        }

        function testBOMData() {
            document.getElementById('results').innerHTML = '';
            log('🧪 Testing BOM data...', 'info');
            
            const bomFromStorage = localStorage.getItem('bom');
            if (bomFromStorage) {
                const parsed = JSON.parse(bomFromStorage);
                const items = parsed.value || [];
                log(\`✅ BOM data found: \${items.length} items\`, 'success');
                
                if (items.length > 0) {
                    log(\`📋 Sample BOM: \${items[0].product_id} → \${items[0].material_id}\`, 'info');
                }
            } else {
                log('❌ No BOM data in localStorage', 'error');
            }
        }

        function refreshPage() {
            log('🔄 Refreshing page...', 'info');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }

        // Auto-run on page load
        window.addEventListener('load', () => {
            log('🚀 Force re-render tool loaded', 'info');
            log(\`📊 BOM data ready: \${bomData.debugInfo.itemCount} items\`, 'info');
        });
    </script>
</body>
</html>`;

fs.writeFileSync('force-react-rerender.html', htmlContent);
console.log('✅ HTML tool created: force-react-rerender.html');

console.log('\n🚀 INSTRUCTIONS:');
console.log('1. 🌐 Open your React app (Products page)');
console.log('2. 🔧 Open force-react-rerender.html in another tab');
console.log('3. 🔄 Click "Force Re-render" button');
console.log('4. 🔄 Switch back to Products page and check BOM column');
console.log('5. 🔍 If still not working, open DevTools and check console logs');

console.log('\n💡 ALTERNATIVE:');
console.log('Copy and paste this in browser console (on Products page):');
console.log('```javascript');
console.log(browserScript.split('\n').slice(3, -3).join('\n'));
console.log('```');

console.log('\n🎯 EXPECTED RESULT:');
console.log(`• ${updatedBomData.debugInfo.uniqueProductIds} products should show green dots`);
console.log('• Console should show [Products] debug logs');
console.log('• BOM column should appear with indicators');

console.log('\n✅ Force re-render tools ready!');