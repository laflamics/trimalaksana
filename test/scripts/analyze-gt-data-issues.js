/**
 * Analyze GT data for non-array and undefined issues
 */

const fs = require('fs');

console.log('🔍 ANALYZING GT DATA ISSUES\n');

function analyzeGTDataFiles() {
  console.log('📊 CHECKING GT DATA FILES FOR ISSUES\n');
  
  // GT data files to check
  const gtFiles = [
    'gt_products',
    'gt_customers', 
    'gt_suppliers',
    'gt_salesOrders',
    'gt_purchaseOrders',
    'gt_invoices',
    'gt_payments'
  ];
  
  const issues = [];
  
  for (const file of gtFiles) {
    console.log(`🔍 Checking ${file}...`);
    
    // Check root level file
    const rootPath = `data/localStorage/${file}.json`;
    if (fs.existsSync(rootPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(rootPath, 'utf8'));
        const analysis = analyzeDataStructure(data, `${file} (root)`);
        if (analysis.issues.length > 0) {
          issues.push(...analysis.issues);
        }
        console.log(`   📁 Root: ${analysis.summary}`);
      } catch (error) {
        const issue = `❌ ${file} (root): Parse error - ${error.message}`;
        issues.push(issue);
        console.log(`   ${issue}`);
      }
    } else {
      console.log(`   ⚠️  Root: File not found`);
    }
    
    // Check general-trading folder file
    const gtPath = `data/localStorage/general-trading/${file}.json`;
    if (fs.existsSync(gtPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(gtPath, 'utf8'));
        const analysis = analyzeDataStructure(data, `${file} (gt folder)`);
        if (analysis.issues.length > 0) {
          issues.push(...analysis.issues);
        }
        console.log(`   📂 GT folder: ${analysis.summary}`);
      } catch (error) {
        const issue = `❌ ${file} (gt folder): Parse error - ${error.message}`;
        issues.push(issue);
        console.log(`   ${issue}`);
      }
    } else {
      console.log(`   ⚠️  GT folder: File not found`);
    }
    
    console.log('');
  }
  
  return issues;
}

function analyzeDataStructure(data, fileName) {
  const issues = [];
  let summary = '';
  
  // Check if data is null or undefined
  if (data === null) {
    issues.push(`❌ ${fileName}: Data is null`);
    return { issues, summary: 'NULL DATA' };
  }
  
  if (data === undefined) {
    issues.push(`❌ ${fileName}: Data is undefined`);
    return { issues, summary: 'UNDEFINED DATA' };
  }
  
  // Check data structure
  if (typeof data !== 'object') {
    issues.push(`❌ ${fileName}: Data is not an object (${typeof data})`);
    return { issues, summary: `INVALID TYPE: ${typeof data}` };
  }
  
  // Check for wrapped data structure {value: [...], timestamp: ...}
  if ('value' in data) {
    const value = data.value;
    const timestamp = data.timestamp || data._timestamp;
    
    if (value === null) {
      issues.push(`❌ ${fileName}: Wrapped data has null value`);
      summary = 'WRAPPED NULL';
    } else if (value === undefined) {
      issues.push(`❌ ${fileName}: Wrapped data has undefined value`);
      summary = 'WRAPPED UNDEFINED';
    } else if (Array.isArray(value)) {
      summary = `WRAPPED ARRAY: ${value.length} items`;
      
      // Check for undefined items in array
      const undefinedItems = value.filter(item => item === undefined || item === null);
      if (undefinedItems.length > 0) {
        issues.push(`❌ ${fileName}: Array contains ${undefinedItems.length} undefined/null items`);
      }
      
      // Check for malformed items
      const malformedItems = value.filter(item => 
        item && typeof item === 'object' && Object.keys(item).length === 0
      );
      if (malformedItems.length > 0) {
        issues.push(`❌ ${fileName}: Array contains ${malformedItems.length} empty objects`);
      }
      
    } else if (typeof value === 'object') {
      summary = `WRAPPED OBJECT: ${Object.keys(value).length} keys`;
      issues.push(`⚠️  ${fileName}: Expected array but got object in wrapped data`);
    } else {
      summary = `WRAPPED ${typeof value.toUpperCase()}`;
      issues.push(`⚠️  ${fileName}: Expected array but got ${typeof value} in wrapped data`);
    }
    
    if (!timestamp) {
      issues.push(`⚠️  ${fileName}: Missing timestamp in wrapped data`);
    }
    
  } else if (Array.isArray(data)) {
    summary = `DIRECT ARRAY: ${data.length} items`;
    
    // Check for undefined items in array
    const undefinedItems = data.filter(item => item === undefined || item === null);
    if (undefinedItems.length > 0) {
      issues.push(`❌ ${fileName}: Array contains ${undefinedItems.length} undefined/null items`);
    }
    
    // Check for malformed items
    const malformedItems = data.filter(item => 
      item && typeof item === 'object' && Object.keys(item).length === 0
    );
    if (malformedItems.length > 0) {
      issues.push(`❌ ${fileName}: Array contains ${malformedItems.length} empty objects`);
    }
    
  } else {
    summary = `DIRECT OBJECT: ${Object.keys(data).length} keys`;
    issues.push(`⚠️  ${fileName}: Expected wrapped data or array but got direct object`);
  }
  
  return { issues, summary };
}

function checkSpecificGTFiles() {
  console.log('🎯 DETAILED CHECK OF SPECIFIC GT FILES\n');
  
  // Check specific files that commonly have issues
  const specificFiles = [
    'data/localStorage/gt_salesOrders.json',
    'data/localStorage/general-trading/gt_salesOrders.json',
    'data/localStorage/gt_products.json',
    'data/localStorage/general-trading/gt_products.json'
  ];
  
  for (const filePath of specificFiles) {
    if (fs.existsSync(filePath)) {
      console.log(`📄 Analyzing ${filePath}:`);
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        console.log(`   📊 File size: ${content.length} bytes`);
        console.log(`   🔍 Data type: ${typeof data}`);
        
        if (data && typeof data === 'object') {
          console.log(`   🗝️  Keys: ${Object.keys(data).join(', ')}`);
          
          if ('value' in data) {
            const value = data.value;
            console.log(`   📦 Value type: ${typeof value}`);
            
            if (Array.isArray(value)) {
              console.log(`   📋 Array length: ${value.length}`);
              
              if (value.length > 0) {
                const firstItem = value[0];
                console.log(`   🔍 First item type: ${typeof firstItem}`);
                if (firstItem && typeof firstItem === 'object') {
                  console.log(`   🗝️  First item keys: ${Object.keys(firstItem).join(', ')}`);
                }
              }
              
              // Check for problematic items
              const nullItems = value.filter(item => item === null).length;
              const undefinedItems = value.filter(item => item === undefined).length;
              const emptyObjects = value.filter(item => 
                item && typeof item === 'object' && Object.keys(item).length === 0
              ).length;
              
              if (nullItems > 0) console.log(`   ❌ Null items: ${nullItems}`);
              if (undefinedItems > 0) console.log(`   ❌ Undefined items: ${undefinedItems}`);
              if (emptyObjects > 0) console.log(`   ❌ Empty objects: ${emptyObjects}`);
              
            } else if (value === null) {
              console.log(`   ❌ Value is NULL`);
            } else if (value === undefined) {
              console.log(`   ❌ Value is UNDEFINED`);
            } else {
              console.log(`   ⚠️  Value is not an array: ${typeof value}`);
            }
          }
          
          if ('timestamp' in data || '_timestamp' in data) {
            const ts = data.timestamp || data._timestamp;
            console.log(`   ⏰ Timestamp: ${ts} (${new Date(ts).toISOString()})`);
          } else {
            console.log(`   ⚠️  No timestamp found`);
          }
        }
        
      } catch (error) {
        console.log(`   ❌ Parse error: ${error.message}`);
      }
      
      console.log('');
    } else {
      console.log(`📄 ${filePath}: File not found\n`);
    }
  }
}

// Main execution
console.log('🔍 GT DATA ANALYSIS STARTING');
console.log('='.repeat(50));

const issues = analyzeGTDataFiles();
checkSpecificGTFiles();

console.log('📋 SUMMARY OF ISSUES FOUND:');
console.log('='.repeat(30));

if (issues.length === 0) {
  console.log('✅ No critical issues found');
} else {
  issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue}`);
  });
}

console.log(`\n📊 Total issues found: ${issues.length}`);
console.log('\n🎯 NEXT: Review issues and create fix script if needed');