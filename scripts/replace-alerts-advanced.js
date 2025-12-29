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

// Function untuk detect signature showAlert
function getShowAlertSignature(content) {
  // Cek apakah ada showAlert dengan signature (title, message)
  const titleFirstPattern = /showAlert\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/;
  const titleFirstMatch = content.match(titleFirstPattern);
  if (titleFirstMatch) {
    const firstParam = titleFirstMatch[1];
    if (['Error', 'Success', 'Warning', 'Information', 'Validation', 'Confirm'].includes(firstParam)) {
      return 'title-first'; // (title, message)
    }
  }
  return 'message-first'; // (message, title)
}

// Function untuk generate custom dialog setup code
function generateDialogSetup() {
  return `
  // Custom Dialog state
  const [dialogState, setDialogState] = useState<{
    show: boolean;
    type: 'alert' | 'confirm' | null;
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    show: false,
    type: null,
    title: '',
    message: '',
  });

  // Helper functions untuk dialog
  const showAlert = (message: string, title: string = 'Information') => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(true);
    }
    setDialogState({
      show: true,
      type: 'alert',
      title,
      message,
    });
  };

  const showConfirm = (message: string, onConfirm: () => void, onCancel?: () => void, title: string = 'Confirmation') => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(true);
    }
    setDialogState({
      show: true,
      type: 'confirm',
      title,
      message,
      onConfirm,
      onCancel,
    });
  };

  const closeDialog = () => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(false);
    }
    setDialogState({
      show: false,
      type: null,
      title: '',
      message: '',
    });
  };
`;
}

// Function untuk generate dialog component JSX
function generateDialogComponent() {
  return `
      {/* Custom Dialog */}
      {dialogState.show && (
        <div className="dialog-overlay" onClick={closeDialog}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <Card className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2>{dialogState.title}</h2>
                <Button variant="secondary" onClick={closeDialog} style={{ padding: '6px 12px' }}>✕</Button>
              </div>
              <p style={{ marginBottom: '20px', whiteSpace: 'pre-wrap' }}>{dialogState.message}</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                {dialogState.type === 'confirm' && (
                  <Button variant="secondary" onClick={closeDialog}>Cancel</Button>
                )}
                <Button
                  variant="primary"
                  onClick={() => {
                    if (dialogState.onConfirm) dialogState.onConfirm();
                    closeDialog();
                  }}
                >
                  {dialogState.type === 'confirm' ? 'Confirm' : 'OK'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
`;
}

// Function untuk cek apakah sudah import useState
function hasUseStateImport(content) {
  return content.includes("import") && content.includes("useState");
}

// Function untuk cek apakah sudah import Card dan Button
function hasRequiredImports(content) {
  const hasCard = content.includes("import") && (content.includes("Card") || content.includes("from '../../components/Card") || content.includes("from '../../../components/Card"));
  const hasButton = content.includes("import") && (content.includes("Button") || content.includes("from '../../components/Button") || content.includes("from '../../../components/Button"));
  return { hasCard, hasButton };
}

// Function untuk add imports jika belum ada
function addImports(content, filePath) {
  let newContent = content;
  
  // Detect import depth (berapa level dari src/)
  const relativePath = path.relative(path.join(__dirname, '..', 'src'), filePath);
  const depth = relativePath.split(path.sep).length - 1;
  const importPrefix = '../'.repeat(depth) || './';
  
  // Check existing imports
  const { hasCard, hasButton } = hasRequiredImports(content);
  
  // Find first import line
  const importMatch = content.match(/^import\s+.*from\s+['"]([^'"]+)['"];?/m);
  let importInsertionPoint = 0;
  
  if (importMatch) {
    importInsertionPoint = content.indexOf(importMatch[0]);
    const firstImportEnd = content.indexOf('\n', importInsertionPoint);
    importInsertionPoint = firstImportEnd + 1;
  }
  
  // Add Card import if needed
  if (!hasCard) {
    const cardImport = `import Card from '${importPrefix}components/Card';\n`;
    newContent = newContent.slice(0, importInsertionPoint) + cardImport + newContent.slice(importInsertionPoint);
    importInsertionPoint += cardImport.length;
  }
  
  // Add Button import if needed
  if (!hasButton) {
    const buttonImport = `import Button from '${importPrefix}components/Button';\n`;
    newContent = newContent.slice(0, importInsertionPoint) + buttonImport + newContent.slice(importInsertionPoint);
  }
  
  return newContent;
}

// Function untuk add useState to imports
function addUseStateImport(content) {
  // Check if useState already imported
  if (content.includes('useState')) {
    return content;
  }
  
  // Find React import
  const reactImportMatch = content.match(/^import\s+React(?:\s*,\s*\{([^}]+)\})?\s+from\s+['"]react['"];?/m);
  if (reactImportMatch) {
    const existingImports = reactImportMatch[1] || '';
    if (!existingImports.includes('useState')) {
      const newImports = existingImports ? `${existingImports}, useState` : 'useState';
      return content.replace(reactImportMatch[0], `import React, { ${newImports} } from 'react';`);
    }
  } else {
    // No React import, add it
    const firstLine = content.indexOf('\n');
    return content.slice(0, firstLine + 1) + "import { useState } from 'react';\n" + content.slice(firstLine + 1);
  }
  
  return content;
}

// Function untuk insert dialog setup setelah state declarations
function insertDialogSetup(content) {
  // Find first useState declaration
  const useStateMatch = content.match(/(const\s+\[[^\]]+\]\s*=\s*useState\([^)]*\)[^;]*;)/);
  if (!useStateMatch) {
    // No useState found, add after component declaration
    const componentMatch = content.match(/(const\s+\w+\s*=\s*\(\)\s*=>\s*\{)/);
    if (componentMatch) {
      const insertPoint = content.indexOf('{', componentMatch.index) + 1;
      return content.slice(0, insertPoint) + generateDialogSetup() + content.slice(insertPoint);
    }
    return content;
  }
  
  // Find end of last useState before first function/useEffect
  let insertPoint = content.lastIndexOf('useState', useStateMatch.index + useStateMatch[0].length);
  insertPoint = content.indexOf(';', insertPoint) + 1;
  
  // Find next non-state line (function, useEffect, etc)
  const nextFunctionMatch = content.slice(insertPoint).match(/\n\s*(const\s+\w+|useEffect|useMemo|const\s+\[)/);
  if (nextFunctionMatch) {
    insertPoint = insertPoint + nextFunctionMatch.index;
  } else {
    // Insert before first return or useEffect
    const returnMatch = content.slice(insertPoint).match(/\n\s*(return|useEffect)/);
    if (returnMatch) {
      insertPoint = insertPoint + returnMatch.index;
    }
  }
  
  return content.slice(0, insertPoint) + generateDialogSetup() + content.slice(insertPoint);
}

// Function untuk insert dialog component sebelum closing return
function insertDialogComponent(content) {
  // Find last </div> before closing component
  const closingDivMatch = content.match(/(\s*<\/div>\s*\);\s*\};\s*export\s+default)/);
  if (closingDivMatch) {
    const insertPoint = closingDivMatch.index;
    return content.slice(0, insertPoint) + generateDialogComponent() + content.slice(insertPoint);
  }
  
  // Fallback: find export default
  const exportMatch = content.match(/(\s*\);\s*\};\s*export\s+default)/);
  if (exportMatch) {
    const insertPoint = exportMatch.index;
    return content.slice(0, insertPoint) + generateDialogComponent() + content.slice(insertPoint);
  }
  
  return content;
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
        
        if (showAlertSignature === 'title-first') {
          return `showAlert('${title}', '${message.replace(/'/g, "\\'")}')`;
        } else {
          return `showAlert('${message.replace(/'/g, "\\'")}', '${title}')`;
        }
      }
    },
    // alert(`message`)
    {
      regex: /alert\s*\(\s*`([^`]+)`\s*\)/g,
      replacement: (match, message) => {
        changes++;
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
        
        if (showAlertSignature === 'title-first') {
          return `showAlert('${title}', \`${message}\`)`;
        } else {
          return `showAlert(\`${message}\`, '${title}')`;
        }
      }
    },
    // window.alert('message')
    {
      regex: /window\.alert\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      replacement: (match, message) => {
        changes++;
        let title = 'Information';
        if (message.includes('✅') || message.includes('Success') || message.includes('berhasil')) {
          title = 'Success';
        } else if (message.includes('⚠️') || message.includes('Warning') || message.includes('Peringatan')) {
          title = 'Warning';
        } else if (message.includes('Error') || message.includes('error') || message.includes('Gagal')) {
          title = 'Error';
        }
        
        if (showAlertSignature === 'title-first') {
          return `showAlert('${title}', '${message.replace(/'/g, "\\'")}')`;
        } else {
          return `showAlert('${message.replace(/'/g, "\\'")}', '${title}')`;
        }
      }
    },
    // window.alert(`message`)
    {
      regex: /window\.alert\s*\(\s*`([^`]+)`\s*\)/g,
      replacement: (match, message) => {
        changes++;
        let title = 'Information';
        if (message.includes('✅') || message.includes('Success') || message.includes('berhasil')) {
          title = 'Success';
        } else if (message.includes('⚠️') || message.includes('Warning') || message.includes('Peringatan')) {
          title = 'Warning';
        } else if (message.includes('Error') || message.includes('error') || message.includes('Gagal')) {
          title = 'Error';
        }
        
        if (showAlertSignature === 'title-first') {
          return `showAlert('${title}', \`${message}\`)`;
        } else {
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

// Function untuk replace confirm() dengan showConfirm() - versi lebih advanced
function replaceConfirms(content, showAlertSignature) {
  let newContent = content;
  let changes = 0;

  // Pattern 1: if (!confirm(...)) { return; }
  const ifConfirmPattern = /if\s*\(\s*!confirm\s*\(\s*([^)]+)\s*\)\s*\)\s*\{[^}]*return;[^}]*\}/g;
  
  newContent = newContent.replace(ifConfirmPattern, (match, message) => {
    changes++;
    // Extract message
    let cleanMessage = message.trim();
    // Remove quotes if present
    cleanMessage = cleanMessage.replace(/^['"`]|['"`]$/g, '');
    
    // Find the code block after this if statement
    const afterMatch = content.slice(content.indexOf(match) + match.length);
    const nextBlockMatch = afterMatch.match(/^\s*(\w+[^}]*\{[^}]*\})/s);
    
    if (nextBlockMatch) {
      // Extract the code that should run on confirm
      const confirmCode = nextBlockMatch[1];
      // Replace with showConfirm
      return `showConfirm(\n      ${cleanMessage},\n      () => {\n        ${confirmCode}\n      },\n      undefined,\n      'Confirm'\n    );`;
    }
    
    // Fallback: just replace with showConfirm placeholder
    return `/* TODO: Replace dengan showConfirm - Original: ${match} */`;
  });

  // Pattern 2: Standalone confirm() - skip untuk sekarang karena kompleks
  // User perlu manual fix untuk case ini

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
  let totalDialogSetupsAdded = 0;
  const filesNeedingManualFix = [];

  files.forEach((filePath) => {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Skip jika tidak ada alert atau confirm
      if (!content.includes('alert(') && !content.includes('confirm(') && !content.includes('window.alert')) {
        return;
      }

      let needsDialogSetup = false;
      let hasDialog = hasCustomDialogSetup(content);
      
      if (!hasDialog) {
        needsDialogSetup = true;
        // Add imports
        content = addUseStateImport(content);
        content = addImports(content, filePath);
        // Add dialog setup
        content = insertDialogSetup(content);
        // Add dialog component
        content = insertDialogComponent(content);
        totalDialogSetupsAdded++;
        hasDialog = true;
      }

      // Detect showAlert signature
      const signature = getShowAlertSignature(content);
      
      // Replace alerts
      const { newContent: contentAfterAlerts, changes: alertChanges } = replaceAlerts(content, signature);
      
      // Replace confirms
      const { newContent: finalContent, changes: confirmChanges } = replaceConfirms(contentAfterAlerts, signature);

      if (alertChanges > 0 || confirmChanges > 0 || needsDialogSetup) {
        fs.writeFileSync(filePath, finalContent, 'utf8');
        totalFilesChanged++;
        totalAlertsReplaced += alertChanges;
        totalConfirmsReplaced += confirmChanges;
        const relativePath = path.relative(srcDir, filePath);
        console.log(`✅ ${relativePath}: ${alertChanges} alert(s), ${confirmChanges} confirm(s)${needsDialogSetup ? ', dialog setup added' : ''}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
      filesNeedingManualFix.push({
        file: filePath,
        reason: error.message
      });
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`   Files changed: ${totalFilesChanged}`);
  console.log(`   Alerts replaced: ${totalAlertsReplaced}`);
  console.log(`   Confirms replaced: ${totalConfirmsReplaced}`);
  console.log(`   Dialog setups added: ${totalDialogSetupsAdded}`);
  
  if (filesNeedingManualFix.length > 0) {
    console.log(`\n⚠️  Files needing manual review:`);
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
  console.log(`\n⚠️  Note: Some confirm() replacements may need manual review.`);
  console.log(`   Please check files with "TODO: Replace dengan showConfirm" comments.`);
}

main();

