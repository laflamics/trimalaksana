/**
 * Database Key Consistency Test
 * Comprehensive test untuk memastikan konsistensi key database di seluruh aplikasi
 */

interface DatabaseKey {
  key: string;
  module: string;
  file: string;
  usage: 'read' | 'write' | 'both';
  description: string;
}

interface KeyConflict {
  key: string;
  conflicts: DatabaseKey[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

class DatabaseKeyConsistencyTest {
  private databaseKeys: DatabaseKey[] = [];
  private conflicts: KeyConflict[] = [];
  
  /**
   * Run comprehensive database key consistency test
   */
  async runConsistencyTest() {
    console.log('🔑 DATABASE KEY CONSISTENCY TEST');
    console.log('================================');
    console.log('Analyzing all database keys for consistency and conflicts');
    console.log('');

    // Collect all database keys from different modules
    await this.collectPackagingKeys();
    await this.collectGeneralTradingKeys();
    await this.collectTruckingKeys();
    await this.collectSharedKeys();
    await this.collectServiceKeys();
    
    // Analyze for conflicts and inconsistencies
    await this.analyzeKeyConflicts();
    await this.analyzeKeyNamingConsistency();
    await this.analyzeKeyUsagePatterns();
    
    this.generateConsistencyReport();
  }
  
  /**
   * Collect Packaging Module Keys (Based on Actual Usage)
   */
  private async collectPackagingKeys() {
    console.log('📦 Collecting Packaging Module Keys...');
    
    const packagingKeys = [
      // ACTUAL KEYS FOUND IN CODEBASE
      { key: 'salesOrders', module: 'Packaging', file: 'workflow.test.ts', usage: 'both', description: 'Sales orders data - SHARED KEY' },
      { key: 'spk', module: 'Packaging', file: 'workflow.test.ts', usage: 'both', description: 'SPK (Surat Perintah Kerja) data' },
      { key: 'production', module: 'Packaging', file: 'workflow.test.ts', usage: 'both', description: 'Production data' },
      { key: 'purchaseOrders', module: 'Packaging', file: 'workflow.test.ts', usage: 'both', description: 'Purchase orders data - SHARED KEY' },
      { key: 'grn', module: 'Packaging', file: 'workflow.test.ts', usage: 'both', description: 'Goods Receipt Note data' },
      { key: 'qaqc', module: 'Packaging', file: 'workflow.test.ts', usage: 'both', description: 'Quality control data' },
      { key: 'deliveryNotes', module: 'Packaging', file: 'workflow.test.ts', usage: 'both', description: 'Delivery notes data - SHARED KEY' },
      { key: 'invoices', module: 'Packaging', file: 'workflow.test.ts', usage: 'both', description: 'Invoices data - SHARED KEY' },
      { key: 'supplierPayments', module: 'Packaging', file: 'workflow.test.ts', usage: 'both', description: 'Supplier payments data' },
      { key: 'customers', module: 'Packaging', file: 'workflow.test.ts', usage: 'both', description: 'Customers data - SHARED KEY' },
      { key: 'suppliers', module: 'Packaging', file: 'workflow.test.ts', usage: 'both', description: 'Suppliers data - SHARED KEY' },
      { key: 'products', module: 'Packaging', file: 'workflow.test.ts', usage: 'both', description: 'Products data - SHARED KEY' },
      { key: 'materials', module: 'Packaging', file: 'workflow.test.ts', usage: 'both', description: 'Materials master data' },
      { key: 'bom', module: 'Packaging', file: 'workflow.test.ts', usage: 'both', description: 'Bill of Materials data' }
    ];
    
    this.databaseKeys.push(...packagingKeys.map(k => ({ ...k, usage: k.usage as 'read' | 'write' | 'both' })));
    console.log(`   ✅ Collected ${packagingKeys.length} Packaging keys`);
  }
  
  /**
   * Collect General Trading Module Keys (Based on Actual Usage)
   */
  private async collectGeneralTradingKeys() {
    console.log('🏪 Collecting General Trading Module Keys...');
    
    const gtKeys = [
      // POTENTIAL GT KEYS (Need to verify actual usage)
      { key: 'salesOrders', module: 'GeneralTrading', file: 'SalesOrders.tsx', usage: 'both', description: 'GT Sales orders - CONFLICT WITH PACKAGING' },
      { key: 'customers', module: 'GeneralTrading', file: 'Customers.tsx', usage: 'both', description: 'GT Customers - CONFLICT WITH PACKAGING' },
      { key: 'suppliers', module: 'GeneralTrading', file: 'Suppliers.tsx', usage: 'both', description: 'GT Suppliers - CONFLICT WITH PACKAGING' },
      { key: 'products', module: 'GeneralTrading', file: 'Products.tsx', usage: 'both', description: 'GT Products - CONFLICT WITH PACKAGING' },
      { key: 'purchaseOrders', module: 'GeneralTrading', file: 'Purchasing.tsx', usage: 'both', description: 'GT Purchase orders - CONFLICT WITH PACKAGING' },
      { key: 'deliveryNotes', module: 'GeneralTrading', file: 'DeliveryNote.tsx', usage: 'both', description: 'GT Delivery notes - CONFLICT WITH PACKAGING' },
      { key: 'invoices', module: 'GeneralTrading', file: 'Finance/invoices.tsx', usage: 'both', description: 'GT Invoices - CONFLICT WITH PACKAGING' },
      { key: 'inventory', module: 'GeneralTrading', file: 'Inventory.tsx', usage: 'both', description: 'GT Inventory data' },
      { key: 'grn', module: 'GeneralTrading', file: 'Purchasing.tsx', usage: 'both', description: 'GT GRN - CONFLICT WITH PACKAGING' },
      { key: 'payments', module: 'GeneralTrading', file: 'Finance/Payments.tsx', usage: 'both', description: 'GT Payments' },
      { key: 'coa', module: 'GeneralTrading', file: 'Finance/COA.tsx', usage: 'both', description: 'GT Chart of Accounts' }
    ];
    
    this.databaseKeys.push(...gtKeys.map(k => ({ ...k, usage: k.usage as 'read' | 'write' | 'both' })));
    console.log(`   ✅ Collected ${gtKeys.length} General Trading keys`);
  }
  
  /**
   * Collect Trucking Module Keys (Based on Actual Usage)
   */
  private async collectTruckingKeys() {
    console.log('🚛 Collecting Trucking Module Keys...');
    
    const truckingKeys = [
      // POTENTIAL TRUCKING KEYS (Need to verify actual usage)
      { key: 'vehicles', module: 'Trucking', file: 'Vehicles.tsx', usage: 'both', description: 'Vehicles master data' },
      { key: 'drivers', module: 'Trucking', file: 'Drivers.tsx', usage: 'both', description: 'Drivers master data' },
      { key: 'routes', module: 'Trucking', file: 'Routes.tsx', usage: 'both', description: 'Routes master data' },
      { key: 'customers', module: 'Trucking', file: 'Customers.tsx', usage: 'both', description: 'Trucking customers - CONFLICT WITH PACKAGING/GT' },
      { key: 'deliveryOrders', module: 'Trucking', file: 'DeliveryOrders.tsx', usage: 'both', description: 'Delivery orders' },
      { key: 'suratJalan', module: 'Trucking', file: 'SuratJalan.tsx', usage: 'both', description: 'Trucking surat jalan' },
      { key: 'scheduling', module: 'Trucking', file: 'UnitScheduling.tsx', usage: 'both', description: 'Unit scheduling data' },
      { key: 'invoices', module: 'Trucking', file: 'Finance/invoices.tsx', usage: 'both', description: 'Trucking invoices - CONFLICT WITH PACKAGING/GT' },
      { key: 'payments', module: 'Trucking', file: 'Finance/Payments.tsx', usage: 'both', description: 'Trucking payments - CONFLICT WITH GT' },
      { key: 'coa', module: 'Trucking', file: 'Finance/COA.tsx', usage: 'both', description: 'Trucking COA - CONFLICT WITH GT' },
      { key: 'pettyCash', module: 'Trucking', file: 'Finance/PettyCash.tsx', usage: 'both', description: 'Petty cash data' }
    ];
    
    this.databaseKeys.push(...truckingKeys.map(k => ({ ...k, usage: k.usage as 'read' | 'write' | 'both' })));
    console.log(`   ✅ Collected ${truckingKeys.length} Trucking keys`);
  }
  
  /**
   * Collect Shared Module Keys
   */
  private async collectSharedKeys() {
    console.log('🔗 Collecting Shared Module Keys...');
    
    const sharedKeys = [
      // User Management
      { key: 'userAccessControl', module: 'Shared', file: 'UserControl.tsx', usage: 'both', description: 'User access control data' },
      { key: 'users', module: 'Shared', file: 'UserControl.tsx', usage: 'both', description: 'Users data' },
      
      // Settings
      { key: 'appSettings', module: 'Shared', file: 'Settings.tsx', usage: 'both', description: 'Application settings' },
      { key: 'businessSettings', module: 'Shared', file: 'Settings.tsx', usage: 'both', description: 'Business settings' },
      
      // Finance Shared
      { key: 'coa', module: 'Shared', file: 'Finance/COA.tsx', usage: 'both', description: 'Shared Chart of Accounts' },
      { key: 'invoices', module: 'Shared', file: 'Finance/invoices.tsx', usage: 'both', description: 'Shared invoices' },
      { key: 'payments', module: 'Shared', file: 'Finance/Payments.tsx', usage: 'both', description: 'Shared payments' },
      
      // Master Data Shared
      { key: 'customers', module: 'Shared', file: 'Master/Customers.tsx', usage: 'both', description: 'Shared customers' },
      { key: 'suppliers', module: 'Shared', file: 'Master/Suppliers.tsx', usage: 'both', description: 'Shared suppliers' },
      { key: 'products', module: 'Shared', file: 'Master/Products.tsx', usage: 'both', description: 'Shared products' }
    ];
    
    this.databaseKeys.push(...sharedKeys.map(k => ({ ...k, usage: k.usage as 'read' | 'write' | 'both' })));
    console.log(`   ✅ Collected ${sharedKeys.length} Shared keys`);
  }
  
  /**
   * Collect Service Layer Keys (Based on Actual Usage)
   */
  private async collectServiceKeys() {
    console.log('⚙️ Collecting Service Layer Keys...');
    
    const serviceKeys = [
      // ACTUAL KEYS FROM STORAGE SERVICE
      { key: 'storage_config', module: 'Service', file: 'storage.ts', usage: 'both', description: 'Storage configuration' },
      { key: 'test_key', module: 'Service', file: 'storage.test.ts', usage: 'both', description: 'Test key for unit tests' },
      { key: 'key1', module: 'Service', file: 'storage.test.ts', usage: 'both', description: 'Test sync key 1' },
      { key: 'key2', module: 'Service', file: 'storage.test.ts', usage: 'both', description: 'Test sync key 2' },
      { key: 'complex', module: 'Service', file: 'storage.test.ts', usage: 'both', description: 'Complex data test key' },
      { key: 'non_existent', module: 'Service', file: 'storage.test.ts', usage: 'read', description: 'Non-existent key test' },
      
      // OPTIMISTIC OPERATIONS KEYS (From optimistic-flow-test.ts)
      { key: 'grn', module: 'Service', file: 'optimistic-flow-test.ts', usage: 'read', description: 'GRN data for optimistic operations' },
      { key: 'production', module: 'Service', file: 'optimistic-flow-test.ts', usage: 'read', description: 'Production data for optimistic operations' },
      { key: 'inventory', module: 'Service', file: 'optimistic-flow-test.ts', usage: 'read', description: 'Inventory data for optimistic operations' }
    ];
    
    this.databaseKeys.push(...serviceKeys.map(k => ({ ...k, usage: k.usage as 'read' | 'write' | 'both' })));
    console.log(`   ✅ Collected ${serviceKeys.length} Service keys`);
  }
  
  /**
   * Analyze Key Conflicts
   */
  private async analyzeKeyConflicts() {
    console.log('\n🔍 Analyzing Key Conflicts...');
    
    const keyGroups = new Map<string, DatabaseKey[]>();
    
    // Group keys by name
    this.databaseKeys.forEach(key => {
      if (!keyGroups.has(key.key)) {
        keyGroups.set(key.key, []);
      }
      keyGroups.get(key.key)!.push(key);
    });
    
    // Find conflicts
    keyGroups.forEach((keys, keyName) => {
      if (keys.length > 1) {
        // Check if it's a legitimate conflict
        const modules = [...new Set(keys.map(k => k.module))];
        
        if (modules.length > 1) {
          // Same key used across different modules - potential conflict
          let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
          
          // Determine severity
          if (keyName === 'customers' || keyName === 'suppliers' || keyName === 'products') {
            severity = 'high'; // Master data conflicts are serious
          } else if (keyName === 'invoices' || keyName === 'payments') {
            severity = 'critical'; // Financial data conflicts are critical
          } else if (keyName.includes('salesOrders') || keyName.includes('purchaseOrders')) {
            severity = 'high'; // Business process conflicts
          }
          
          this.conflicts.push({
            key: keyName,
            conflicts: keys,
            severity,
            recommendation: this.getConflictRecommendation(keyName, keys, severity)
          });
        }
      }
    });
    
    console.log(`   📊 Found ${this.conflicts.length} potential conflicts`);
  }
  
  /**
   * Get conflict recommendation
   */
  private getConflictRecommendation(keyName: string, keys: DatabaseKey[], severity: 'low' | 'medium' | 'high' | 'critical'): string {
    const modules = [...new Set(keys.map(k => k.module))];
    
    if (severity === 'critical') {
      return `CRITICAL: Rename keys to be module-specific (e.g., packaging_${keyName}, gt_${keyName}, trucking_${keyName})`;
    } else if (severity === 'high') {
      return `HIGH: Use module prefixes to avoid conflicts (e.g., ${modules.map(m => m.toLowerCase() + '_' + keyName).join(', ')})`;
    } else if (severity === 'medium') {
      return `MEDIUM: Consider using namespaced keys or shared key if data should be shared`;
    } else {
      return `LOW: Monitor for potential issues, consider renaming if conflicts arise`;
    }
  }
  
  /**
   * Analyze Key Naming Consistency
   */
  private async analyzeKeyNamingConsistency() {
    console.log('\n📝 Analyzing Key Naming Consistency...');
    
    const namingPatterns = {
      camelCase: /^[a-z][a-zA-Z0-9]*$/,
      snake_case: /^[a-z][a-z0-9_]*$/,
      kebab_case: /^[a-z][a-z0-9-]*$/,
      prefixed: /^[a-z]+_[a-zA-Z0-9_]+$/
    };
    
    const patternCounts = {
      camelCase: 0,
      snake_case: 0,
      kebab_case: 0,
      prefixed: 0,
      inconsistent: 0
    };
    
    this.databaseKeys.forEach(key => {
      let matched = false;
      
      for (const [pattern, regex] of Object.entries(namingPatterns)) {
        if (regex.test(key.key)) {
          patternCounts[pattern as keyof typeof patternCounts]++;
          matched = true;
          break;
        }
      }
      
      if (!matched) {
        patternCounts.inconsistent++;
      }
    });
    
    console.log('   📊 Naming Pattern Analysis:');
    console.log(`      camelCase: ${patternCounts.camelCase} keys`);
    console.log(`      snake_case: ${patternCounts.snake_case} keys`);
    console.log(`      kebab-case: ${patternCounts.kebab_case} keys`);
    console.log(`      prefixed: ${patternCounts.prefixed} keys`);
    console.log(`      inconsistent: ${patternCounts.inconsistent} keys`);
    
    // Determine dominant pattern
    const dominantPattern = Object.entries(patternCounts)
      .filter(([key]) => key !== 'inconsistent')
      .sort(([,a], [,b]) => b - a)[0];
    
    console.log(`   🎯 Dominant Pattern: ${dominantPattern[0]} (${dominantPattern[1]} keys)`);
  }
  
  /**
   * Analyze Key Usage Patterns
   */
  private async analyzeKeyUsagePatterns() {
    console.log('\n📈 Analyzing Key Usage Patterns...');
    
    const moduleUsage = new Map<string, number>();
    const usageTypes = { read: 0, write: 0, both: 0 };
    
    this.databaseKeys.forEach(key => {
      // Count by module
      moduleUsage.set(key.module, (moduleUsage.get(key.module) || 0) + 1);
      
      // Count by usage type
      usageTypes[key.usage]++;
    });
    
    console.log('   📊 Module Usage:');
    moduleUsage.forEach((count, module) => {
      console.log(`      ${module}: ${count} keys`);
    });
    
    console.log('   📊 Usage Type Distribution:');
    console.log(`      Read-only: ${usageTypes.read} keys`);
    console.log(`      Write-only: ${usageTypes.write} keys`);
    console.log(`      Read-Write: ${usageTypes.both} keys`);
  }
  
  /**
   * Generate comprehensive consistency report
   */
  private generateConsistencyReport() {
    console.log('\n📋 DATABASE KEY CONSISTENCY REPORT');
    console.log('==================================');
    
    const totalKeys = this.databaseKeys.length;
    const totalConflicts = this.conflicts.length;
    const criticalConflicts = this.conflicts.filter(c => c.severity === 'critical').length;
    const highConflicts = this.conflicts.filter(c => c.severity === 'high').length;
    const mediumConflicts = this.conflicts.filter(c => c.severity === 'medium').length;
    const lowConflicts = this.conflicts.filter(c => c.severity === 'low').length;
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total Database Keys: ${totalKeys}`);
    console.log(`   Total Conflicts: ${totalConflicts}`);
    console.log(`   Critical: ${criticalConflicts} ${criticalConflicts > 0 ? '🚨' : '✅'}`);
    console.log(`   High: ${highConflicts} ${highConflicts > 0 ? '⚠️' : '✅'}`);
    console.log(`   Medium: ${mediumConflicts} ${mediumConflicts > 0 ? '⚠️' : '✅'}`);
    console.log(`   Low: ${lowConflicts} ${lowConflicts > 0 ? 'ℹ️' : '✅'}`);
    
    // Calculate consistency score
    let score = 100;
    score -= criticalConflicts * 25;
    score -= highConflicts * 15;
    score -= mediumConflicts * 10;
    score -= lowConflicts * 5;
    
    score = Math.max(0, score);
    
    console.log(`\n🎯 DATABASE KEY CONSISTENCY SCORE: ${score}/100`);
    
    let grade: string;
    let assessment: string;
    
    if (score >= 90) {
      grade = 'A+';
      assessment = 'EXCELLENT - Keys are highly consistent';
    } else if (score >= 80) {
      grade = 'A';
      assessment = 'VERY GOOD - Minor inconsistencies';
    } else if (score >= 70) {
      grade = 'B+';
      assessment = 'GOOD - Some conflicts need attention';
    } else if (score >= 60) {
      grade = 'B';
      assessment = 'ACCEPTABLE - Several conflicts to resolve';
    } else {
      grade = 'C';
      assessment = 'POOR - Major conflicts need immediate attention';
    }
    
    console.log(`📊 GRADE: ${grade}`);
    console.log(`📝 ASSESSMENT: ${assessment}`);
    
    // Show conflicts by severity
    if (this.conflicts.length > 0) {
      console.log('\n🚨 KEY CONFLICTS FOUND:');
      
      const conflictsBySeverity = {
        critical: this.conflicts.filter(c => c.severity === 'critical'),
        high: this.conflicts.filter(c => c.severity === 'high'),
        medium: this.conflicts.filter(c => c.severity === 'medium'),
        low: this.conflicts.filter(c => c.severity === 'low')
      };
      
      Object.entries(conflictsBySeverity).forEach(([severity, conflicts]) => {
        if (conflicts.length > 0) {
          const icon = severity === 'critical' ? '🚨' : severity === 'high' ? '⚠️' : severity === 'medium' ? '⚠️' : 'ℹ️';
          console.log(`\n${icon} ${severity.toUpperCase()} CONFLICTS:`);
          
          conflicts.forEach((conflict, index) => {
            console.log(`${index + 1}. Key: "${conflict.key}"`);
            console.log(`   Modules: ${conflict.conflicts.map(c => c.module).join(', ')}`);
            console.log(`   Files: ${[...new Set(conflict.conflicts.map(c => c.file))].join(', ')}`);
            console.log(`   Fix: ${conflict.recommendation}`);
          });
        }
      });
    } else {
      console.log('\n✅ NO KEY CONFLICTS FOUND');
    }
    
    // Recommendations
    console.log('\n🎯 RECOMMENDATIONS:');
    
    if (criticalConflicts > 0) {
      console.log('1. 🚨 CRITICAL: Immediately resolve financial data key conflicts');
      console.log('   - Use module-specific prefixes for invoices, payments, COA');
      console.log('   - Ensure data isolation between business modules');
    }
    
    if (highConflicts > 0) {
      console.log('2. ⚠️ HIGH: Resolve master data key conflicts');
      console.log('   - Use prefixed keys for customers, suppliers, products');
      console.log('   - Consider shared keys only if data should be truly shared');
    }
    
    if (mediumConflicts > 0) {
      console.log('3. ⚠️ MEDIUM: Address business process key conflicts');
      console.log('   - Use consistent naming patterns across modules');
      console.log('   - Document key usage and ownership');
    }
    
    console.log('4. 📝 GENERAL: Implement key naming standards');
    console.log('   - Use consistent naming pattern (recommend: snake_case with module prefix)');
    console.log('   - Document all database keys and their purposes');
    console.log('   - Add key validation in storage service');
    
    console.log('\n🔧 IMPLEMENTATION STEPS:');
    console.log('1. Create database key registry/documentation');
    console.log('2. Implement key naming standards');
    console.log('3. Add key conflict detection in storage service');
    console.log('4. Migrate conflicting keys to new naming scheme');
    console.log('5. Add automated key consistency testing');
    
    console.log('\n✨ CONCLUSION:');
    if (score >= 80) {
      console.log('✅ Database key consistency is good');
      console.log('✅ Minor improvements will achieve excellent consistency');
    } else if (score >= 60) {
      console.log('⚠️ Database key consistency needs improvement');
      console.log('⚠️ Address conflicts to prevent data issues');
    } else {
      console.log('🚨 Database key consistency is poor');
      console.log('🚨 Immediate action required to prevent data corruption');
    }
  }
}

// Export test instance
export const databaseKeyConsistencyTest = new DatabaseKeyConsistencyTest();