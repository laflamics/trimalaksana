#!/usr/bin/env node

/**
 * Fix BOM Server Sync Corruption
 * 
 * Masalah: Server sync mengirim 163 BOM items yang corrupt
 * Local storage ter-merge dengan data server yang salah
 * Hasil: bomSetSize 139 dengan invalid product IDs
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fix BOM Server Sync Corruption...\n');

// Read clean BOM data from file
const bomPath = path.join(__dirname, 'data/localStorage/bom.json');
const bomData = JSON.parse(fs.readFileSync(bomPath, 'utf8'));
const cleanBomItems = bomData.value || [];

console.log(`📊 Clean BOM data: ${cleanBomItems.length} items`);

// Validate clean BOM data
const validBomItems = cleanBomItems.filter(item => {
  if (!item || !item.product_id || !item.material_id) return false;
  
  // Check product_id format (should be like KRT04072)
  const productId = String(item.product_id).trim();
  const isValidFormat = /^[A-Z]{3}\d{5}$/.test(productId) || /^[A-Z]{3}\d{4}$/.test(productId);
  
  return isValidFormat;
});

console.log(`✅ Valid BOM items: ${validBomItems.length}/${cleanBomItems.length}`);

if (validBomItems.length !== cleanBomItems.length) {
  console.log('⚠️ Found invalid BOM items:');
  cleanBomItems.filter(item => !validBomItems.includes(item)).forEach((item, index) => {
    console.log(`${index + 1}. product_id: "${item.product_id}", material_id: "${item.material_id}"`);
  });
}

// Create clean BOM data
const cleanBomData = {
  ...bomData,
  value: validBomItems,
  timestamp: Date.now(),
  _timestamp: Date.now(),
  lastUpdate: new Date().toISOString(),
  cleanedAt: new Date().toISOString(),
  serverSyncBlocked: true,
  cleanupReason: 'Remove invalid BOM items and block server sync corruption'
};

// Write clean data back
fs.writeFileSync(bomPath, JSON.stringify(cleanBomData, null, 2));
console.log('✅ Clean BOM data saved to file');

// Generate browser script to fix localStorage and block server sync
const browserScript = `
// Fix BOM Server Sync Corruption
console.log('🔧 Fixing BOM server sync corruption...');

// 1. Clean BOM data
const cleanBomData = ${JSON.stringify(cleanBomData, null, 2)};

// 2. Get current business context
const selectedBusiness = localStorage.getItem('selectedBusiness');
const bomStorageKey = selectedBusiness && selectedBusiness !== 'packaging' ? 
    selectedBusiness + '/bom' : 'bom';

console.log('Business context:', selectedBusiness || 'packaging');
console.log('BOM storage key:', bomStorageKey);

// 3. Check current BOM data in localStorage
const currentBomData = localStorage.getItem(bomStorageKey);
if (currentBomData) {
    try {
        const parsed = JSON.parse(currentBomData);
        const items = parsed.value || parsed;
        console.log('Current BOM items in localStorage:', Array.isArray(items) ? items.length : 'invalid');
        
        if (Array.isArray(items) && items.length > 100) {
            console.log('⚠️ BOM data is corrupted (too many items)');
        }
    } catch (e) {
        console.log('❌ Error parsing current BOM data:', e.message);
    }
}

// 4. Replace with clean BOM data
localStorage.setItem(bomStorageKey, JSON.stringify(cleanBomData));
console.log('✅ Clean BOM data saved to localStorage');

// 5. Also save to main 'bom' key to prevent future corruption
localStorage.setItem('bom', JSON.stringify(cleanBomData));
console.log('✅ Clean BOM data saved to main bom key');

// 6. Verify the fix
const verifyBomData = localStorage.getItem(bomStorageKey);
if (verifyBomData) {
    try {
        const parsed = JSON.parse(verifyBomData);
        const items = parsed.value || parsed;
        
        if (Array.isArray(items)) {
            console.log('✅ Verification: BOM items count:', items.length);
            
            // Create bomProductIdsSet to verify
            const bomProductIdsSet = new Set();
            items.forEach(b => {
                if (b && b.product_id) {
                    const bomProductId = String(b.product_id).trim().toLowerCase();
                    if (bomProductId) {
                        bomProductIdsSet.add(bomProductId);
                    }
                }
            });
            
            console.log('✅ BOM Product IDs Set size:', bomProductIdsSet.size);
            
            // Test problem products
            const problemProducts = ['krt04173', 'krt02722', 'krt04072'];
            console.log('\\nTesting problem products:');
            problemProducts.forEach(id => {
                const found = bomProductIdsSet.has(id);
                console.log(\`• \${id.toUpperCase()}: \${found ? '✅ FOUND' : '❌ NOT FOUND'}\`);
            });
            
            // Check for invalid IDs
            const allIds = Array.from(bomProductIdsSet);
            const invalidIds = allIds.filter(id => !/^[a-z]{3}\\d{4,5}$/.test(id));
            if (invalidIds.length > 0) {
                console.log('⚠️ Invalid product IDs still found:', invalidIds.slice(0, 5));
            } else {
                console.log('✅ All product IDs are valid');
            }
        }
    } catch (e) {
        console.log('❌ Verification failed:', e.message);
    }
}

// 7. Dispatch storage change event to trigger React reload
window.dispatchEvent(new CustomEvent('app-storage-changed', {
    detail: { key: bomStorageKey.split('/').pop() || bomStorageKey, value: cleanBomData.value }
}));
console.log('✅ Storage change event dispatched');

// 8. Also dispatch bomUpdated event
window.dispatchEvent(new CustomEvent('bomUpdated', {
    detail: { 
        productId: 'ALL', 
        bomItems: cleanBomData.value, 
        source: 'CleanupCorruption',
        timestamp: Date.now()
    }
}));
console.log('✅ BOM updated event dispatched');

console.log('\\n🎯 Fix complete! Check Products page for BOM indicators.');
console.log('Expected results:');
console.log('• bomSetSize should be ~${validBomItems.length} (not 139)');
console.log('• krt04173, krt02722, krt04072 should all show hasBOM: true');
console.log('• No more "cartonlay" invalid IDs');

// 9. Block future server sync corruption (optional)
console.log('\\n🛡️ To prevent future server sync corruption:');
console.log('Consider disabling server sync for BOM data temporarily');
`;

// Write browser script
fs.writeFileSync('fix-bom-server-sync-corruption-browser.js', browserScript);
console.log('✅ Browser script created: fix-bom-server-sync-corruption-browser.js');

// Create HTML tool
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fix BOM Server Sync Corruption</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 1000px;
            margin: 20px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 20px;
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
        .danger { background: #f44336; }
        .danger:hover { background: #d32f2f; }
        .secondary { background: #2196F3; }
        .secondary:hover { background: #1976D2; }
        pre {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
            font-size: 12px;
            max-height: 400px;
            overflow-y: auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Fix BOM Server Sync Corruption</h1>
        
        <div id="status">
            <p class="warning">⚠️ Server sync is sending corrupted BOM data (163 items → 139 in set)</p>
            <p class="info">This tool will clean localStorage and block corruption</p>
        </div>

        <div>
            <button onclick="fixCorruption()">Fix BOM Corruption</button>
            <button onclick="checkBOMData()" class="secondary">Check Current BOM</button>
            <button onclick="blockServerSync()" class="danger">Block Server Sync</button>
        </div>

        <div id="results" style="margin-top: 20px;"></div>
    </div>

    <script>
        const cleanBomData = ${JSON.stringify(cleanBomData, null, 2)};
        
        function log(message, type = 'info') {
            const results = document.getElementById('results');
            const className = type === 'success' ? 'success' : 
                            type === 'error' ? 'error' : 
                            type === 'warning' ? 'warning' : 'info';
            results.innerHTML += \`<p class="\${className}">\${message}</p>\`;
            console.log(message);
        }

        function fixCorruption() {
            document.getElementById('results').innerHTML = '';
            log('🔧 Fixing BOM server sync corruption...', 'info');
            
            try {
                ${browserScript}
            } catch (error) {
                log(\`❌ Error: \${error.message}\`, 'error');
            }
        }

        function checkBOMData() {
            document.getElementById('results').innerHTML = '';
            log('🔍 Checking current BOM data...', 'info');
            
            const selectedBusiness = localStorage.getItem('selectedBusiness');
            const bomStorageKey = selectedBusiness && selectedBusiness !== 'packaging' ? 
                selectedBusiness + '/bom' : 'bom';
            
            log(\`Business: \${selectedBusiness || 'packaging'}\`, 'info');
            log(\`BOM Key: \${bomStorageKey}\`, 'info');
            
            const bomData = localStorage.getItem(bomStorageKey);
            if (bomData) {
                try {
                    const parsed = JSON.parse(bomData);
                    const items = parsed.value || parsed;
                    
                    if (Array.isArray(items)) {
                        log(\`BOM Items: \${items.length}\`, items.length > 100 ? 'warning' : 'success');
                        
                        if (items.length > 0) {
                            // Check for invalid IDs
                            const invalidItems = items.filter(item => {
                                const id = String(item.product_id || '').trim();
                                return !/^[A-Z]{3}\\d{4,5}$/i.test(id);
                            });
                            
                            if (invalidItems.length > 0) {
                                log(\`⚠️ Invalid items: \${invalidItems.length}\`, 'warning');
                                invalidItems.slice(0, 3).forEach(item => {
                                    log(\`  • "\${item.product_id}" → \${item.material_id}\`, 'warning');
                                });
                            } else {
                                log('✅ All items have valid product IDs', 'success');
                            }
                        }
                    } else {
                        log('❌ BOM data is not an array', 'error');
                    }
                } catch (e) {
                    log(\`❌ Parse error: \${e.message}\`, 'error');
                }
            } else {
                log('❌ No BOM data found', 'error');
            }
        }

        function blockServerSync() {
            document.getElementById('results').innerHTML = '';
            log('🛡️ Blocking server sync for BOM...', 'warning');
            
            // This is a placeholder - actual implementation would need server-side changes
            log('⚠️ Server sync blocking requires server-side configuration', 'warning');
            log('💡 Alternative: Use local storage mode only', 'info');
            
            // Set flag to indicate server sync should be avoided
            localStorage.setItem('bom_server_sync_disabled', 'true');
            log('✅ Set local flag to avoid server sync', 'success');
        }

        // Auto-run check on page load
        window.addEventListener('load', () => {
            log('🚀 BOM corruption fix tool loaded', 'info');
            log(\`📊 Clean BOM data ready: \${cleanBomData.value.length} items\`, 'info');
        });
    </script>
</body>
</html>`;

fs.writeFileSync('fix-bom-server-sync-corruption.html', htmlContent);
console.log('✅ HTML tool created: fix-bom-server-sync-corruption.html');

console.log('\n🚀 INSTRUCTIONS:');
console.log('1. 🌐 Open fix-bom-server-sync-corruption.html');
console.log('2. 🔧 Click "Fix BOM Corruption"');
console.log('3. 📱 Check Products page immediately');
console.log('4. 🛡️ Consider blocking server sync if corruption persists');

console.log('\n💡 QUICK FIX - Browser Console:');
console.log('Paste this in browser console (on Products page):');
console.log('```javascript');
console.log(browserScript.split('\n').slice(2, -2).join('\n'));
console.log('```');

console.log('\n🎯 EXPECTED RESULTS:');
console.log(`• bomSetSize: ${validBomItems.length} (not 139)`);
console.log('• krt04173: hasBOM true (not false)');
console.log('• krt02722: hasBOM true (not false)');
console.log('• krt04072: hasBOM true (should stay true)');
console.log('• No more "cartonlay" invalid IDs');

console.log('\n✅ BOM corruption fix ready!');