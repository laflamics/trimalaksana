const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔍 Mencari uninstaller...\n');

// Method 1: Cari di Start Menu
const startMenuPaths = [
  path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'PT.Trima Laksana Jaya Pratama'),
  path.join(process.env.PROGRAMDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'PT.Trima Laksana Jaya Pratama'),
];

let found = false;

for (const startMenuPath of startMenuPaths) {
  if (fs.existsSync(startMenuPath)) {
    const files = fs.readdirSync(startMenuPath);
    const uninstaller = files.find(f => f.toLowerCase().includes('uninstall'));
    
    if (uninstaller) {
      const uninstallerPath = path.join(startMenuPath, uninstaller);
      console.log(`✓ Ditemukan di Start Menu: ${uninstallerPath}`);
      console.log(`\n🚀 Membuka uninstaller...\n`);
      
      try {
        execSync(`"${uninstallerPath}"`, { stdio: 'inherit' });
        found = true;
        break;
      } catch (error) {
        console.log('⚠ Error membuka uninstaller:', error.message);
      }
    }
  }
}

// Method 2: Cari di Registry (Windows)
if (!found) {
  try {
    console.log('🔍 Mencari di Registry Windows...\n');
    const registryPath = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall';
    const output = execSync(`reg query "${registryPath}" /s /f "PT.Trima Laksana Jaya Pratama"`, { encoding: 'utf8' });
    
    if (output.includes('PT.Trima Laksana Jaya Pratama')) {
      // Extract UninstallString from registry
      const uninstallMatch = output.match(/UninstallString\s+REG_SZ\s+(.+)/);
      if (uninstallMatch) {
        const uninstallPath = uninstallMatch[1].trim();
        console.log(`✓ Ditemukan di Registry: ${uninstallPath}`);
        console.log(`\n🚀 Membuka uninstaller...\n`);
        
        try {
          execSync(`"${uninstallPath}"`, { stdio: 'inherit' });
          found = true;
        } catch (error) {
          console.log('⚠ Error membuka uninstaller:', error.message);
        }
      }
    }
  } catch (error) {
    // Registry query failed, continue
  }
}

// Method 3: Cari di Program Files
if (!found) {
  const programFilesPaths = [
    path.join(process.env.PROGRAMFILES, 'PT.Trima Laksana Jaya Pratama'),
    path.join(process.env['PROGRAMFILES(X86)'] || '', 'PT.Trima Laksana Jaya Pratama'),
    path.join(process.env.LOCALAPPDATA, 'Programs', 'PT.Trima Laksana Jaya Pratama'),
  ];

  for (const programPath of programFilesPaths) {
    if (fs.existsSync(programPath)) {
      const files = fs.readdirSync(programPath);
      const uninstaller = files.find(f => f.toLowerCase().includes('uninstall') && f.endsWith('.exe'));
      
      if (uninstaller) {
        const uninstallerPath = path.join(programPath, uninstaller);
        console.log(`✓ Ditemukan di: ${uninstallerPath}`);
        console.log(`\n🚀 Membuka uninstaller...\n`);
        
        try {
          execSync(`"${uninstallerPath}"`, { stdio: 'inherit' });
          found = true;
          break;
        } catch (error) {
          console.log('⚠ Error membuka uninstaller:', error.message);
        }
      }
    }
  }
}

if (!found) {
  console.log('❌ Uninstaller tidak ditemukan.');
  console.log('\n💡 Tips:');
  console.log('  1. Buka Control Panel > Programs > Uninstall a program');
  console.log('  2. Cari "PT.Trima Laksana Jaya Pratama" dan klik Uninstall');
  console.log('  3. Atau buka Start Menu > Programs > PT.Trima Laksana Jaya Pratama');
}

