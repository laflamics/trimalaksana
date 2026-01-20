#!/usr/bin/env node

/**
 * Script to force refresh BOM cache by triggering storage events
 */

const fs = require('fs');
const path = require('path');

async function forceRefreshBOMCache() {
    try {
        console.log('🔄 FORCING BOM CACHE REFRESH');
        console.log('============================');
        
        // Read current BOM data
        const bomPath = path.join(__dirname, '../data/localStorage/bom.json');
        const bomData = JSON.parse(fs.readFileSync(bomPath, 'utf8'));
        
        console.log(`📊 Current BOM items: ${bomData.value.length}`);
        
        // Add a small modification to force timestamp update
        const updatedBOM = {
            ...bomData,
            timestamp: Date.now(),
            _timestamp: Date.now()
        };
        
        // Write back to trigger storage change event
        fs.writeFileSync(bomPath, JSON.stringify(updatedBOM, null, 2));
        
        console.log('✅ BOM cache refresh triggered');
        console.log('   - Updated timestamp to force reload');
        console.log('   - Storage change event should trigger UI refresh');
        
        console.log('\n🔧 MANUAL REFRESH STEPS:');
        console.log('1. Refresh your browser tab (F5 or Ctrl+R)');
        console.log('2. Or navigate away and back to the Products page');
        console.log('3. The BOM indicators should now show correctly');
        
        // Also create a small test file to verify the fix worked
        const testResult = {
            timestamp: new Date().toISOString(),
            bomItemCount: bomData.value.length,
            status: 'Cache refresh triggered',
            nextSteps: 'Refresh browser to see updated BOM indicators'
        };
        
        fs.writeFileSync(
            path.join(__dirname, '../data/localStorage/bom-refresh-log.json'),
            JSON.stringify(testResult, null, 2)
        );
        
        console.log('\n📝 Created refresh log at: data/localStorage/bom-refresh-log.json');
        
    } catch (error) {
        console.error('❌ Failed to refresh BOM cache:', error.message);
    }
}

// Run the refresh
if (require.main === module) {
    forceRefreshBOMCache();
}