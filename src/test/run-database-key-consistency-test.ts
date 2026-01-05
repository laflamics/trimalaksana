/**
 * Run Database Key Consistency Test
 * Execute comprehensive database key consistency analysis
 */

import { databaseKeyConsistencyTest } from './database-key-consistency-test';

async function runDatabaseKeyConsistencyTest() {
  try {
    console.log('🚀 Starting Database Key Consistency Test...');
    console.log('============================================');
    
    await databaseKeyConsistencyTest.runConsistencyTest();
    
    console.log('\n✅ Database key consistency test completed successfully!');
  } catch (error) {
    console.error('❌ Error running database key consistency test:', error);
    process.exit(1);
  }
}

// Run the test
runDatabaseKeyConsistencyTest();