const { execSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// Warna untuk output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`🧪 ${description}`, 'bright');
  log(`${'='.repeat(60)}`, 'cyan');
  
  try {
    execSync(command, { 
      stdio: 'inherit', 
      cwd: rootDir,
      env: { ...process.env, FORCE_COLOR: '1' }
    });
    log(`\n✅ ${description} - PASSED`, 'green');
    return true;
  } catch (error) {
    log(`\n❌ ${description} - FAILED`, 'red');
    return false;
  }
}

// Menu utama
function showMenu() {
  log('\n' + '='.repeat(60), 'cyan');
  log('🧪 TEST RUNNER MENU', 'bright');
  log('='.repeat(60), 'cyan');
  log('1. Run all unit tests (vitest)', 'yellow');
  log('2. Run all E2E tests (playwright)', 'yellow');
  log('3. Run all integration tests', 'yellow');
  log('4. Run all tests (unit + integration)', 'yellow');
  log('5. Run tests with coverage', 'yellow');
  log('6. Run specific test file', 'yellow');
  log('0. Exit', 'yellow');
  log('='.repeat(60), 'cyan');
}

function runAllUnitTests() {
  return runCommand('npx vitest run', 'Running Unit Tests');
}

function runAllE2ETests() {
  return runCommand('npx playwright test', 'Running E2E Tests');
}

function runAllIntegrationTests() {
  const integrationTests = [
    'test/integration/complete-flow-ui.test.tsx',
    'test/integration/full-workflow-ui.test.tsx',
    'test/integration/ui-flow.test.tsx',
    'test/integration/workflow.test.ts',
    'test/integration/print-pdf.test.ts',
  ];
  
  let allPassed = true;
  integrationTests.forEach(testFile => {
    const passed = runCommand(
      `npx vitest run ${testFile}`,
      `Running ${path.basename(testFile)}`
    );
    if (!passed) allPassed = false;
  });
  
  return allPassed;
}

function runAllTests() {
  log('\n🚀 Running all tests...', 'bright');
  const unitPassed = runAllUnitTests();
  const integrationPassed = runAllIntegrationTests();
  
  if (unitPassed && integrationPassed) {
    log('\n✨ All tests passed!', 'green');
    return true;
  } else {
    log('\n⚠️  Some tests failed', 'red');
    return false;
  }
}

function runTestsWithCoverage() {
  return runCommand('npx vitest run --coverage', 'Running Tests with Coverage');
}

function runSpecificTest() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('\n📝 Enter test file path (e.g., test/services/storage.test.ts): ', (answer) => {
    if (answer.trim()) {
      runCommand(`npx vitest run ${answer.trim()}`, `Running ${answer.trim()}`);
    }
    rl.close();
  });
}

// Main execution
const args = process.argv.slice(2);

if (args.length > 0) {
  // Run dari command line dengan argumen
  const option = args[0];
  
  switch(option) {
    case 'unit':
      process.exit(runAllUnitTests() ? 0 : 1);
      break;
    case 'e2e':
      process.exit(runAllE2ETests() ? 0 : 1);
      break;
    case 'integration':
      process.exit(runAllIntegrationTests() ? 0 : 1);
      break;
    case 'all':
      process.exit(runAllTests() ? 0 : 1);
      break;
    case 'coverage':
      process.exit(runTestsWithCoverage() ? 0 : 1);
      break;
    default:
      log(`Unknown option: ${option}`, 'red');
      log('Usage: node scripts/run-tests.js [unit|e2e|integration|all|coverage]', 'yellow');
      process.exit(1);
  }
} else {
  // Interactive mode
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  function askQuestion() {
    showMenu();
    rl.question('\n👉 Pilih opsi (0-6): ', (answer) => {
      switch(answer.trim()) {
        case '1':
          runAllUnitTests();
          askQuestion();
          break;
        case '2':
          runAllE2ETests();
          askQuestion();
          break;
        case '3':
          runAllIntegrationTests();
          askQuestion();
          break;
        case '4':
          runAllTests();
          askQuestion();
          break;
        case '5':
          runTestsWithCoverage();
          askQuestion();
          break;
        case '6':
          runSpecificTest();
          setTimeout(() => askQuestion(), 1000);
          break;
        case '0':
          log('\n👋 Bye!', 'cyan');
          rl.close();
          process.exit(0);
          break;
        default:
          log('\n❌ Invalid option!', 'red');
          askQuestion();
      }
    });
  }
  
  askQuestion();
}
