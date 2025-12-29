const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('dist') && !file.includes('build') && !file.includes('.git')) {
        arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

const srcDir = path.join(__dirname, '..', 'src');
const files = getAllFiles(srcDir);

console.log('🔍 Searching for showConfirm without quotes/backticks...\n');

const issues = [];

files.forEach((filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, idx) => {
      // Check for showConfirm( followed by "Are you" or other text without quotes
      if (line.includes('showConfirm')) {
        // Check if the line has showConfirm( but the next part doesn't start with quote/backtick
        const showConfirmMatch = line.match(/showConfirm\s*\(/);
        if (showConfirmMatch) {
          const afterShowConfirm = line.substring(showConfirmMatch.index + showConfirmMatch[0].length).trim();
          // Check if it starts with a letter (not quote/backtick)
          if (afterShowConfirm && /^[A-Za-z]/.test(afterShowConfirm) && !afterShowConfirm.match(/^[`'"]/)) {
            const relativePath = path.relative(srcDir, filePath);
            issues.push({
              file: relativePath,
              line: idx + 1,
              content: line.trim()
            });
          }
        }
      }
    });
  } catch (error) {
    // Skip errors
  }
});

if (issues.length > 0) {
  console.log(`❌ Found ${issues.length} issues:\n`);
  issues.forEach(({ file, line, content }) => {
    console.log(`  ${file}:${line}`);
    console.log(`    ${content.substring(0, 100)}...\n`);
  });
} else {
  console.log('✅ No issues found!');
}

process.exit(issues.length > 0 ? 1 : 0);
