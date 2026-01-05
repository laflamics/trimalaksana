/**
 * Run Database Key Migration
 * CRITICAL: Execute database key migration to fix conflicts
 */

import { databaseKeyMigrationScript } from './database-key-migration-script';

async function runDatabaseKeyMigration() {
  try {
    console.log('🚨 CRITICAL: Starting Database Key Migration...');
    console.log('==============================================');
    console.log('This will fix critical database key conflicts');
    console.log('');
    
    await databaseKeyMigrationScript.runMigration();
    
    console.log('\n✅ Database key migration completed successfully!');
    console.log('🎯 All conflicts resolved - data integrity restored');
  } catch (error) {
    console.error('❌ CRITICAL ERROR during database key migration:', error);
    console.error('🚨 Manual intervention required!');
    process.exit(1);
  }
}

// Run the migration
runDatabaseKeyMigration();