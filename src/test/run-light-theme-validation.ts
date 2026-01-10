/**
 * Run Light Theme Validation Test
 * Execute comprehensive light theme compatibility test
 */

import { lightThemeValidationTest } from './light-theme-validation-test';

async function runLightThemeValidation() {
  try {
    console.log('🚀 Starting Light Theme Validation...');
    console.log('====================================');
    
    await lightThemeValidationTest.runValidation();
    
    console.log('\n✅ Light theme validation completed successfully!');
  } catch (error) {
    console.error('❌ Error running light theme validation:', error);
    process.exit(1);
  }
}

// Run the validation
runLightThemeValidation();