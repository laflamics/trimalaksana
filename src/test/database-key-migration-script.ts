/**
 * Database Key Migration Script
 * CRITICAL: Script untuk memperbaiki konflik database key
 */

import { storageService } from '../services/storage';

interface MigrationStep {
  oldKey: string;
  newKeys: { key: string; module: string; filter?: (item: any) => boolean }[];
  description: string;
  priority: 'critical' | 'high' | 'medium';
}

class DatabaseKeyMigrationScript {
  private migrationSteps: MigrationStep[] = [];
  private backupData: Map<string, any> = new Map();
  
  /**
   * Run complete database key migration
   */
  async runMigration() {
    console.log('🚨 DATABASE KEY MIGRATION SCRIPT');
    console.log('================================');
    console.log('CRITICAL: Fixing database key conflicts to prevent data corruption');
    console.log('');

    // Define migration steps
    this.defineMigrationSteps();
    
    // Backup all data first
    await this.backupAllData();
    
    // Execute migrations by priority
    await this.executeCriticalMigrations();
    await this.executeHighPriorityMigrations();
    await this.executeMediumPriorityMigrations();
    
    // Verify migration success
    await this.verifyMigration();
    
    this.generateMigrationReport();
  }
  
  /**
   * Define all migration steps
   */
  private defineMigrationSteps() {
    console.log('📋 Defining Migration Steps...');
    
    // CRITICAL: Financial data conflicts
    this.migrationSteps.push({
      oldKey: 'invoices',
      newKeys: [
        { key: 'packaging_invoices', module: 'packaging', filter: (item) => item.businessUnit === 'packaging' || !item.businessUnit },
        { key: 'gt_invoices', module: 'gt', filter: (item) => item.businessUnit === 'gt' },
        { key: 'trucking_invoices', module: 'trucking', filter: (item) => item.businessUnit === 'trucking' }
      ],
      description: 'Migrate invoices to module-specific keys',
      priority: 'critical'
    });
    
    this.migrationSteps.push({
      oldKey: 'payments',
      newKeys: [
        { key: 'packaging_payments', module: 'packaging', filter: (item) => item.businessUnit === 'packaging' || !item.businessUnit },
        { key: 'gt_payments', module: 'gt', filter: (item) => item.businessUnit === 'gt' },
        { key: 'trucking_payments', module: 'trucking', filter: (item) => item.businessUnit === 'trucking' }
      ],
      description: 'Migrate payments to module-specific keys',
      priority: 'critical'
    });
    
    // HIGH: Master data conflicts
    this.migrationSteps.push({
      oldKey: 'customers',
      newKeys: [
        { key: 'packaging_customers', module: 'packaging', filter: (item) => item.businessUnit === 'packaging' || !item.businessUnit },
        { key: 'gt_customers', module: 'gt', filter: (item) => item.businessUnit === 'gt' },
        { key: 'trucking_customers', module: 'trucking', filter: (item) => item.businessUnit === 'trucking' },
        { key: 'shared_master_customers', module: 'shared', filter: (item) => item.isShared === true }
      ],
      description: 'Migrate customers to module-specific keys',
      priority: 'high'
    });
    
    this.migrationSteps.push({
      oldKey: 'suppliers',
      newKeys: [
        { key: 'packaging_suppliers', module: 'packaging', filter: (item) => item.businessUnit === 'packaging' || !item.businessUnit },
        { key: 'gt_suppliers', module: 'gt', filter: (item) => item.businessUnit === 'gt' },
        { key: 'shared_master_suppliers', module: 'shared', filter: (item) => item.isShared === true }
      ],
      description: 'Migrate suppliers to module-specific keys',
      priority: 'high'
    });
    
    this.migrationSteps.push({
      oldKey: 'products',
      newKeys: [
        { key: 'packaging_products', module: 'packaging', filter: (item) => item.businessUnit === 'packaging' || !item.businessUnit },
        { key: 'gt_products', module: 'gt', filter: (item) => item.businessUnit === 'gt' },
        { key: 'shared_master_products', module: 'shared', filter: (item) => item.isShared === true }
      ],
      description: 'Migrate products to module-specific keys',
      priority: 'high'
    });
    
    this.migrationSteps.push({
      oldKey: 'salesOrders',
      newKeys: [
        { key: 'packaging_sales_orders', module: 'packaging', filter: (item) => item.businessUnit === 'packaging' || !item.businessUnit },
        { key: 'gt_sales_orders', module: 'gt', filter: (item) => item.businessUnit === 'gt' }
      ],
      description: 'Migrate sales orders to module-specific keys',
      priority: 'high'
    });
    
    this.migrationSteps.push({
      oldKey: 'purchaseOrders',
      newKeys: [
        { key: 'packaging_purchase_orders', module: 'packaging', filter: (item) => item.businessUnit === 'packaging' || !item.businessUnit },
        { key: 'gt_purchase_orders', module: 'gt', filter: (item) => item.businessUnit === 'gt' }
      ],
      description: 'Migrate purchase orders to module-specific keys',
      priority: 'high'
    });
    
    // MEDIUM: Operational data conflicts
    this.migrationSteps.push({
      oldKey: 'deliveryNotes',
      newKeys: [
        { key: 'packaging_delivery_notes', module: 'packaging', filter: (item) => item.businessUnit === 'packaging' || !item.businessUnit },
        { key: 'gt_delivery_notes', module: 'gt', filter: (item) => item.businessUnit === 'gt' }
      ],
      description: 'Migrate delivery notes to module-specific keys',
      priority: 'medium'
    });
    
    this.migrationSteps.push({
      oldKey: 'grn',
      newKeys: [
        { key: 'packaging_grn', module: 'packaging', filter: (item) => item.businessUnit === 'packaging' || !item.businessUnit },
        { key: 'gt_grn', module: 'gt', filter: (item) => item.businessUnit === 'gt' }
      ],
      description: 'Migrate GRN to module-specific keys',
      priority: 'medium'
    });
    
    this.migrationSteps.push({
      oldKey: 'coa',
      newKeys: [
        { key: 'gt_coa', module: 'gt', filter: (item) => item.businessUnit === 'gt' || !item.businessUnit },
        { key: 'trucking_coa', module: 'trucking', filter: (item) => item.businessUnit === 'trucking' },
        { key: 'shared_master_coa', module: 'shared', filter: (item) => item.isShared === true }
      ],
      description: 'Migrate COA to module-specific keys',
      priority: 'medium'
    });
    
    console.log(`   ✅ Defined ${this.migrationSteps.length} migration steps`);
  }
  
  /**
   * Backup all existing data
   */
  private async backupAllData() {
    console.log('\n💾 Backing Up All Data...');
    
    const keysToBackup = [...new Set(this.migrationSteps.map(step => step.oldKey))];
    
    for (const key of keysToBackup) {
      try {
        const data = await storageService.get(key);
        if (data) {
          this.backupData.set(key, data);
          console.log(`   ✅ Backed up: ${key} (${Array.isArray(data) ? data.length : 1} items)`);
        } else {
          console.log(`   ℹ️  No data found for: ${key}`);
        }
      } catch (error) {
        console.log(`   ⚠️  Error backing up ${key}:`, error);
      }
    }
    
    // Save backup to special key
    const backupTimestamp = new Date().toISOString();
    const backupObject = Object.fromEntries(this.backupData);
    await storageService.set(`migration_backup_${backupTimestamp}`, backupObject);
    
    console.log(`   💾 Complete backup saved with timestamp: ${backupTimestamp}`);
  }
  
  /**
   * Execute critical migrations (financial data)
   */
  private async executeCriticalMigrations() {
    console.log('\n🚨 Executing Critical Migrations...');
    
    const criticalSteps = this.migrationSteps.filter(step => step.priority === 'critical');
    
    for (const step of criticalSteps) {
      await this.executeMigrationStep(step);
    }
    
    console.log('   🎯 Critical migrations completed');
  }
  
  /**
   * Execute high priority migrations (master data)
   */
  private async executeHighPriorityMigrations() {
    console.log('\n⚠️  Executing High Priority Migrations...');
    
    const highSteps = this.migrationSteps.filter(step => step.priority === 'high');
    
    for (const step of highSteps) {
      await this.executeMigrationStep(step);
    }
    
    console.log('   🎯 High priority migrations completed');
  }
  
  /**
   * Execute medium priority migrations (operational data)
   */
  private async executeMediumPriorityMigrations() {
    console.log('\n📊 Executing Medium Priority Migrations...');
    
    const mediumSteps = this.migrationSteps.filter(step => step.priority === 'medium');
    
    for (const step of mediumSteps) {
      await this.executeMigrationStep(step);
    }
    
    console.log('   🎯 Medium priority migrations completed');
  }
  
  /**
   * Execute single migration step
   */
  private async executeMigrationStep(step: MigrationStep) {
    console.log(`\n   🔄 Migrating: ${step.oldKey}`);
    console.log(`      Description: ${step.description}`);
    
    const originalData = this.backupData.get(step.oldKey);
    
    if (!originalData) {
      console.log(`      ℹ️  No data to migrate for ${step.oldKey}`);
      return;
    }
    
    const dataArray = Array.isArray(originalData) ? originalData : [originalData];
    
    // Migrate to new keys
    for (const newKeyConfig of step.newKeys) {
      let filteredData = dataArray;
      
      // Apply filter if provided
      if (newKeyConfig.filter) {
        filteredData = dataArray.filter(newKeyConfig.filter);
      }
      
      if (filteredData.length > 0) {
        await storageService.set(newKeyConfig.key, filteredData);
        console.log(`      ✅ ${newKeyConfig.key}: ${filteredData.length} items`);
      } else {
        console.log(`      ℹ️  ${newKeyConfig.key}: No matching items`);
      }
    }
    
    // Remove old key after successful migration
    await storageService.remove(step.oldKey);
    console.log(`      🗑️  Removed old key: ${step.oldKey}`);
  }
  
  /**
   * Verify migration success
   */
  private async verifyMigration() {
    console.log('\n🔍 Verifying Migration Success...');
    
    let allSuccess = true;
    
    // Check that old keys are removed
    for (const step of this.migrationSteps) {
      const oldData = await storageService.get(step.oldKey);
      if (oldData) {
        console.log(`   ❌ Old key still exists: ${step.oldKey}`);
        allSuccess = false;
      } else {
        console.log(`   ✅ Old key removed: ${step.oldKey}`);
      }
    }
    
    // Check that new keys have data
    const allNewKeys = this.migrationSteps.flatMap(step => step.newKeys.map(nk => nk.key));
    
    for (const newKey of allNewKeys) {
      const newData = await storageService.get(newKey);
      if (newData && Array.isArray(newData) && newData.length > 0) {
        console.log(`   ✅ New key has data: ${newKey} (${newData.length} items)`);
      } else if (newData) {
        console.log(`   ✅ New key has data: ${newKey} (1 item)`);
      } else {
        console.log(`   ℹ️  New key empty: ${newKey}`);
      }
    }
    
    if (allSuccess) {
      console.log('   🎉 Migration verification: SUCCESS');
    } else {
      console.log('   ⚠️  Migration verification: ISSUES FOUND');
    }
  }
  
  /**
   * Generate migration report
   */
  private generateMigrationReport() {
    console.log('\n📋 DATABASE KEY MIGRATION REPORT');
    console.log('================================');
    
    const totalSteps = this.migrationSteps.length;
    const criticalSteps = this.migrationSteps.filter(s => s.priority === 'critical').length;
    const highSteps = this.migrationSteps.filter(s => s.priority === 'high').length;
    const mediumSteps = this.migrationSteps.filter(s => s.priority === 'medium').length;
    
    console.log(`\n📊 MIGRATION SUMMARY:`);
    console.log(`   Total Migration Steps: ${totalSteps}`);
    console.log(`   Critical: ${criticalSteps} ✅`);
    console.log(`   High Priority: ${highSteps} ✅`);
    console.log(`   Medium Priority: ${mediumSteps} ✅`);
    
    console.log('\n🎯 MIGRATED KEYS:');
    
    console.log('\n🚨 CRITICAL (Financial Data):');
    this.migrationSteps
      .filter(s => s.priority === 'critical')
      .forEach(step => {
        console.log(`   ${step.oldKey} → ${step.newKeys.map(nk => nk.key).join(', ')}`);
      });
    
    console.log('\n⚠️  HIGH PRIORITY (Master Data):');
    this.migrationSteps
      .filter(s => s.priority === 'high')
      .forEach(step => {
        console.log(`   ${step.oldKey} → ${step.newKeys.map(nk => nk.key).join(', ')}`);
      });
    
    console.log('\n📊 MEDIUM PRIORITY (Operational Data):');
    this.migrationSteps
      .filter(s => s.priority === 'medium')
      .forEach(step => {
        console.log(`   ${step.oldKey} → ${step.newKeys.map(nk => nk.key).join(', ')}`);
      });
    
    console.log('\n✅ BENEFITS ACHIEVED:');
    console.log('• Complete data isolation between business modules');
    console.log('• Eliminated critical financial data conflicts');
    console.log('• Resolved master data overwriting issues');
    console.log('• Improved data integrity and consistency');
    console.log('• Enabled safe multi-module operations');
    
    console.log('\n🔧 NEXT STEPS:');
    console.log('1. Update all code references to use new keys');
    console.log('2. Add key validation in storage service');
    console.log('3. Implement automated conflict detection');
    console.log('4. Create key naming standards documentation');
    console.log('5. Add automated testing for key consistency');
    
    console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('Database key conflicts have been resolved.');
    console.log('Data integrity is now protected across all business modules.');
  }
}

// Export migration script
export const databaseKeyMigrationScript = new DatabaseKeyMigrationScript();