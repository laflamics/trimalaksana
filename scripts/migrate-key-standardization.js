#!/usr/bin/env node

/**
 * Data Migration Script: Standardize Key Naming Convention
 * 
 * Changes:
 * 1. Normalize SPK bomOverride keys (e.g., "MTRL-00003" → "mtrl00003")
 * 2. Standardize Purchasing materialId → material_id
 * 3. Standardize Inventory codeItem → item_code + add type field
 * 4. Ensure all material_id and product_id are consistent
 */

const fs = require('fs');
const path = require('path');

// Utility: Normalize key (lowercase, remove dash)
const normalizeKey = (str) => {
  if (!str) return '';
  return String(str).toLowerCase().replace(/[-_\s]/g, '');
};

// Utility: Load JSON file
const loadJson = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
    return null;
  }
};

// Utility: Save JSON file
const saveJson = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✓ Saved: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error saving ${filePath}:`, error.message);
    return false;
  }
};

// Migration 1: Normalize SPK bomOverride keys
const migrateSPK = (spkData) => {
  if (!spkData || !spkData.value || !Array.isArray(spkData.value)) {
    console.log('⚠️  SPK data invalid or empty');
    return spkData;
  }

  let changed = 0;
  const migrated = spkData.value.map((spk) => {
    if (!spk.bomOverride || typeof spk.bomOverride !== 'object') {
      return spk;
    }

    const newBomOverride = {};
    let hasChanges = false;

    for (const [key, value] of Object.entries(spk.bomOverride)) {
      const normalizedKey = normalizeKey(key);
      if (normalizedKey !== key) {
        hasChanges = true;
        changed++;
      }
      newBomOverride[normalizedKey] = value;
    }

    if (hasChanges) {
      return { ...spk, bomOverride: newBomOverride };
    }
    return spk;
  });

  console.log(`✓ SPK: Normalized ${changed} bomOverride keys`);
  return { ...spkData, value: migrated };
};

// Migration 2: Standardize Purchasing materialId → material_id
const migratePurchaseOrders = (poData) => {
  if (!poData || !poData.value || !Array.isArray(poData.value)) {
    console.log('⚠️  Purchase Orders data invalid or empty');
    return poData;
  }

  let changed = 0;
  const migrated = poData.value.map((po) => {
    if (po.materialId && !po.material_id) {
      changed++;
      return {
        ...po,
        material_id: po.materialId,
        // Keep materialId for backward compatibility
      };
    }
    return po;
  });

  console.log(`✓ Purchase Orders: Added material_id to ${changed} items`);
  return { ...poData, value: migrated };
};

// Migration 3: Standardize Inventory codeItem → item_code + add type
const migrateInventory = (inventoryData) => {
  if (!inventoryData || !inventoryData.value || !Array.isArray(inventoryData.value)) {
    console.log('⚠️  Inventory data invalid or empty');
    return inventoryData;
  }

  let changed = 0;
  const migrated = inventoryData.value.map((item) => {
    let hasChanges = false;
    const updated = { ...item };

    // Add item_code if not exists
    if (!updated.item_code && updated.codeItem) {
      updated.item_code = updated.codeItem;
      hasChanges = true;
    }

    // Add type field if not exists
    if (!updated.type) {
      // Determine type based on kategori
      const kategori = (updated.kategori || '').toLowerCase().trim();
      let type = 'unknown';

      if (kategori === 'material') {
        type = 'material';
      } else if (kategori === 'product' || kategori === 'produk' || kategori === 'finish good' || kategori === 'fg') {
        type = 'product';
      } else if (updated.codeItem && updated.codeItem.startsWith('MTRL-')) {
        type = 'material';
      } else if (updated.codeItem && (updated.codeItem.startsWith('KRT') || updated.codeItem.startsWith('FG-'))) {
        type = 'product';
      }

      updated.type = type;
      hasChanges = true;
    }

    // Standardize kategori
    if (updated.kategori) {
      const kategori = (updated.kategori || '').toLowerCase().trim();
      if (kategori === 'produk' || kategori === 'finish good' || kategori === 'fg') {
        updated.kategori = 'Product';
        hasChanges = true;
      } else if (kategori === 'material') {
        updated.kategori = 'Material';
        hasChanges = true;
      }
    }

    if (hasChanges) {
      changed++;
    }

    return updated;
  });

  console.log(`✓ Inventory: Updated ${changed} items (added item_code and type)`);
  return { ...inventoryData, value: migrated };
};

// Migration 4: Ensure Purchase Requests have material_id
const migratePurchaseRequests = (prData) => {
  if (!prData || !prData.value || !Array.isArray(prData.value)) {
    console.log('⚠️  Purchase Requests data invalid or empty');
    return prData;
  }

  let changed = 0;
  const migrated = prData.value.map((pr) => {
    if (!pr.items || !Array.isArray(pr.items)) {
      return pr;
    }

    const updatedItems = pr.items.map((item) => {
      if (item.materialId && !item.material_id) {
        changed++;
        return {
          ...item,
          material_id: item.materialId,
        };
      }
      return item;
    });

    return { ...pr, items: updatedItems };
  });

  console.log(`✓ Purchase Requests: Added material_id to ${changed} items`);
  return { ...prData, value: migrated };
};

// Main migration function
const runMigration = () => {
  console.log('\n========================================');
  console.log('  KEY STANDARDIZATION MIGRATION');
  console.log('========================================\n');

  const dataDir = path.join(__dirname, '../data/localStorage');

  // Check if data directory exists
  if (!fs.existsSync(dataDir)) {
    console.error(`❌ Data directory not found: ${dataDir}`);
    process.exit(1);
  }

  // Migrate SPK
  console.log('\n1. Migrating SPK...');
  const spkPath = path.join(dataDir, 'spk.json');
  if (fs.existsSync(spkPath)) {
    const spkData = loadJson(spkPath);
    if (spkData) {
      const migratedSpk = migrateSPK(spkData);
      saveJson(spkPath, migratedSpk);
    }
  } else {
    console.log('⚠️  SPK file not found');
  }

  // Migrate Purchase Orders
  console.log('\n2. Migrating Purchase Orders...');
  const poPath = path.join(dataDir, 'purchaseOrders.json');
  if (fs.existsSync(poPath)) {
    const poData = loadJson(poPath);
    if (poData) {
      const migratedPo = migratePurchaseOrders(poData);
      saveJson(poPath, migratedPo);
    }
  } else {
    console.log('⚠️  Purchase Orders file not found');
  }

  // Migrate Purchase Requests
  console.log('\n3. Migrating Purchase Requests...');
  const prPath = path.join(dataDir, 'purchaseRequests.json');
  if (fs.existsSync(prPath)) {
    const prData = loadJson(prPath);
    if (prData) {
      const migratedPr = migratePurchaseRequests(prData);
      saveJson(prPath, migratedPr);
    }
  } else {
    console.log('⚠️  Purchase Requests file not found');
  }

  // Migrate Inventory
  console.log('\n4. Migrating Inventory...');
  const inventoryPath = path.join(dataDir, 'inventory.json');
  if (fs.existsSync(inventoryPath)) {
    const inventoryData = loadJson(inventoryPath);
    if (inventoryData) {
      const migratedInventory = migrateInventory(inventoryData);
      saveJson(inventoryPath, migratedInventory);
    }
  } else {
    console.log('⚠️  Inventory file not found');
  }

  console.log('\n========================================');
  console.log('  ✓ MIGRATION COMPLETED');
  console.log('========================================\n');
};

// Run migration
runMigration();
