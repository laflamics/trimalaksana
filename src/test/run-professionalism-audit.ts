/**
 * Run App Professionalism Audit
 * Execute comprehensive professionalism evaluation
 */

import { appProfessionalismAudit } from './app-professionalism-audit';

async function runProfessionalismAudit() {
  try {
    console.log('🚀 Starting App Professionalism Audit...');
    console.log('=====================================');
    
    await appProfessionalismAudit.runComprehensiveAudit();
    
    console.log('\n✅ Professionalism audit completed successfully!');
  } catch (error) {
    console.error('❌ Error running professionalism audit:', error);
    process.exit(1);
  }
}

// Run the audit
runProfessionalismAudit();