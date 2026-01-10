const fs = require('fs');
const path = require('path');

// Function untuk scan semua file .tsx dan .ts
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      // Skip node_modules dan build folders
      if (!file.includes('node_modules') && !file.includes('dist') && !file.includes('build') && !file.includes('.git')) {
        arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

// Function untuk cek apakah file sudah punya custom dialog setup
function hasCustomDialogSetup(content) {
  return content.includes('showAlert') || content.includes('showConfirm') || content.includes('dialogState');
}

// Function untuk cek signature showAlert (ada 2 variasi: (message, title) atau (title, message))
function getShowAlertSignature(content) {
  // Cek apakah ada showAlert dengan signature (title, message)
  const titleFirstPattern = /showAlert\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/;
  const titleFirstMatch = content.match(titleFirstPattern);
  if (titleFirstMatch) {
    // Cek apakah parameter pertama adalah title (biasanya 'Error', 'Success', dll)
    const firstParam = titleFirstMatch[1];
    if (['Error', 'Success', 'Warning', 'Information', 'Validation', 'Confirm'].includes(firstParam)) {
      return 'title-first'; // (title, message)
    }
  }
  
  // Default: (message, title)
  return 'message-first';
}

// Function untuk replace alert() dengan showAlert()
function replaceAlerts(content, showAlertSignature) {
  let newContent = content;
  let changes = 0;

  // Pattern untuk alert() dengan berbagai variasi
  const patterns = [
    // alert('message')
    {
      regex: /alert\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      replacement: (match, message) => {
        changes++;
        if (showAlertSignature === 'title-first') {
          // Cek apakah message mengandung emoji atau kata kunci untuk determine title
          let title = 'Information';
          if (message.includes('✅') || message.includes('Success') || message.includes('berhasil')) {
            title = 'Success';
          } else if (message.includes('⚠️') || message.includes('Warning') || message.includes('Peringatan')) {
            title = 'Warning';
          } else if (message.includes('Error') || message.includes('error') || message.includes('Gagal')) {
            title = 'Error';
          } else if (message.includes('Validation') || message.includes('validation')) {
            title = 'Validation Error';
          }
          return `showAlert('${title}', '${message.replace(/'/g, "\\'")}')`;
        } else {
          // message-first: showAlert(message, title)
          let title = 'Information';
          if (message.includes('✅') || message.includes('Success') || message.includes('berhasil')) {
            title = 'Success';
          } else if (message.includes('⚠️') || message.includes('Warning') || message.includes('Peringatan')) {
            title = 'Warning';
          } else if (message.includes('Error') || message.includes('error') || message.includes('Gagal')) {
            title = 'Error';
          } else if (message.includes('Validation') || message.includes('validation')) {
            title = 'Validation Error';
          }
          return `showAlert('${message.replace(/'/g, "\\'")}', '${title}')`;
        }
      }
    },
    // alert(`message`)
    {
      regex: /alert\s*\(\s*`([^`]+)`\s*\)/g,
      replacement: (match, message) => {
        changes++;
        if (showAlertSignature === 'title-first') {
          let title = 'Information';
          if (message.includes('✅') || message.includes('Success') || message.includes('berhasil')) {
            title = 'Success';
          } else if (message.includes('⚠️') || message.includes('Warning') || message.includes('Peringatan')) {
            title = 'Warning';
          } else if (message.includes('Error') || message.includes('error') || message.includes('Gagal')) {
            title = 'Error';
          } else if (message.includes('Validation') || message.includes('validation')) {
            title = 'Validation Error';
          }
          return `showAlert('${title}', \`${message}\`)`;
        } else {
          let title = 'Information';
          if (message.includes('✅') || message.includes('Success') || message.includes('berhasil')) {
            title = 'Success';
          } else if (message.includes('⚠️') || message.includes('Warning') || message.includes('Peringatan')) {
            title = 'Warning';
          } else if (message.includes('Error') || message.includes('error') || message.includes('Gagal')) {
            title = 'Error';
          } else if (message.includes('Validation') || message.includes('validation')) {
            title = 'Validation Error';
          }
          return `showAlert(\`${message}\`, '${title}')`;
        }
      }
    },
    // window.alert('message')
    {
      regex: /window\.alert\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      replacement: (match, message) => {
        changes++;
        if (showAlertSignature === 'title-first') {
          let title = 'Information';
          if (message.includes('✅') || message.includes('Success') || message.includes('berhasil')) {
            title = 'Success';
          } else if (message.includes('⚠️') || message.includes('Warning') || message.includes('Peringatan')) {
            title = 'Warning';
          } else if (message.includes('Error') || message.includes('error') || message.includes('Gagal')) {
            title = 'Error';
          }
          return `showAlert('${title}', '${message.replace(/'/g, "\\'")}')`;
        } else {
          let title = 'Information';
          if (message.includes('✅') || message.includes('Success') || message.includes('berhasil')) {
            title = 'Success';
          } else if (message.includes('⚠️') || message.includes('Warning') || message.includes('Peringatan')) {
            title = 'Warning';
          } else if (message.includes('Error') || message.includes('error') || message.includes('Gagal')) {
            title = 'Error';
          }
          return `showAlert('${message.replace(/'/g, "\\'")}', '${title}')`;
        }
      }
    },
    // window.alert(`message`)
    {
      regex: /window\.alert\s*\(\s*`([^`]+)`\s*\)/g,
      replacement: (match, message) => {
        changes++;
        if (showAlertSignature === 'title-first') {
          let title = 'Information';
          if (message.includes('✅') || message.includes('Success') || message.includes('berhasil')) {
            title = 'Success';
          } else if (message.includes('⚠️') || message.includes('Warning') || message.includes('Peringatan')) {
            title = 'Warning';
          } else if (message.includes('Error') || message.includes('error') || message.includes('Gagal')) {
            title = 'Error';
          }
          return `showAlert('${title}', \`${message}\`)`;
        } else {
          let title = 'Information';
          if (message.includes('✅') || message.includes('Success') || message.includes('berhasil')) {
            title = 'Success';
          } else if (message.includes('⚠️') || message.includes('Warning') || message.includes('Peringatan')) {
            title = 'Warning';
          } else if (message.includes('Error') || message.includes('error') || message.includes('Gagal')) {
            title = 'Error';
          }
          return `showAlert(\`${message}\`, '${title}')`;
        }
      }
    },
  ];

  // Replace semua patterns
  patterns.forEach(({ regex, replacement }) => {
    newContent = newContent.replace(regex, replacement);
  });

  return { newContent, changes };
}

// Function untuk replace confirm() dengan showConfirm()
function replaceConfirms(content, showAlertSignature) {
  let newContent = content;
  let changes = 0;

  // Pattern untuk confirm() - ini lebih kompleks karena perlu extract callback
  // Kita akan handle pattern sederhana dulu: if (!confirm(...)) { return; }
  const confirmPattern = /if\s*\(\s*!confirm\s*\(\s*([^)]+)\s*\)\s*\)\s*\{[^}]*return;[^}]*\}/g;
  
  newContent = newContent.replace(confirmPattern, (match, message) => {
    changes++;
    // Extract message (bisa string atau template literal)
    let cleanMessage = message.trim();
    
    // Untuk pattern ini, kita perlu manual fix karena kompleks
    // Tapi kita bisa replace dengan comment yang jelas
    return `/* TODO: Replace dengan showConfirm - ${match} */`;
  });

  // Juga handle confirm() standalone
  const standaloneConfirmPattern = /confirm\s*\(\s*([^)]+)\s*\)/g;
  newContent = newContent.replace(standaloneConfirmPattern, (match, message) => {
    if (!match.includes('showConfirm')) { // Skip jika sudah di dalam showConfirm
      changes++;
      return `/* TODO: Replace dengan showConfirm - ${match} */`;
    }
    return match;
  });

  return { newContent, changes };
}

// Main function
function main() {
  const srcDir = path.join(__dirname, '..', 'src');
  const files = getAllFiles(srcDir);
  
  console.log(`📁 Found ${files.length} files to process...\n`);

  let totalFilesChanged = 0;
  let totalAlertsReplaced = 0;
  let totalConfirmsReplaced = 0;
  const filesNeedingManualFix = [];

  files.forEach((filePath) => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Skip jika tidak ada alert atau confirm
      if (!content.includes('alert(') && !content.includes('confirm(') && !content.includes('window.alert')) {
        return;
      }

      // Cek apakah file sudah punya custom dialog setup
      const hasDialog = hasCustomDialogSetup(content);
      if (!hasDialog) {
        filesNeedingManualFix.push({
          file: filePath,
          reason: 'No custom dialog setup found'
        });
        return;
      }

      // Detect showAlert signature
      const signature = getShowAlertSignature(content);
      
      // Replace alerts
      const { newContent: contentAfterAlerts, changes: alertChanges } = replaceAlerts(content, signature);
      
      // Replace confirms (lebih kompleks, perlu manual review)
      const { newContent: finalContent, changes: confirmChanges } = replaceConfirms(contentAfterAlerts, signature);

      if (alertChanges > 0 || confirmChanges > 0) {
        fs.writeFileSync(filePath, finalContent, 'utf8');
        totalFilesChanged++;
        totalAlertsReplaced += alertChanges;
        totalConfirmsReplaced += confirmChanges;
        console.log(`✅ ${path.relative(srcDir, filePath)}: ${alertChanges} alert(s), ${confirmChanges} confirm(s)`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`   Files changed: ${totalFilesChanged}`);
  console.log(`   Alerts replaced: ${totalAlertsReplaced}`);
  console.log(`   Confirms replaced: ${totalConfirmsReplaced}`);
  
  if (filesNeedingManualFix.length > 0) {
    console.log(`\n⚠️  Files needing manual fix (no custom dialog setup):`);
    filesNeedingManualFix.forEach(({ file, reason }) => {
      try {
        const relativePath = path.relative(srcDir, file.file || file);
        console.log(`   - ${relativePath}: ${reason}`);
      } catch (e) {
        console.log(`   - ${file.file || file}: ${reason}`);
      }
    });
  }
  
  console.log(`\n✅ Done!`);
}

main();

