const fs = require('fs').promises;
const path = require('path');

async function main() {
  try {
    const dataDir = path.join(__dirname, '..', 'data');
    const localPath = path.join(dataDir, 'localStorage', 'bom.json');
    const fallbackPath = path.join(dataDir, 'bom.json');

    console.log('[sync_bom] Reading local BOM from:', localPath);
    const localRaw = await fs.readFile(localPath, 'utf-8');

    // Validate JSON
    let parsed;
    try {
      parsed = JSON.parse(localRaw);
      if (!Array.isArray(parsed)) {
        console.warn('[sync_bom] Warning: local BOM is not an array. Still syncing as-is.');
      } else {
        console.log(`[sync_bom] Local BOM contains ${parsed.length} items`);
      }
    } catch (e) {
      console.error('[sync_bom] Error parsing local BOM JSON. Aborting sync.', e.message);
      process.exit(1);
    }

    console.log('[sync_bom] Writing BOM to fallback file:', fallbackPath);
    await fs.writeFile(fallbackPath, localRaw, 'utf-8');

    console.log('✅ [sync_bom] Synced BOM from data/localStorage/bom.json -> data/bom.json');
  } catch (err) {
    console.error('❌ [sync_bom] Failed to sync BOM:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}


