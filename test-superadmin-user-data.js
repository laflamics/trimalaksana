/**
 * Test SuperAdmin User Data Loading
 * 
 * Test apakah SuperAdmin bisa baca data user control dari semua sources
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing SuperAdmin User Data Loading...');
console.log('=' .repeat(60));

// Check data files
const dataFiles = [
  'data/localStorage/userAccessControl.json',
  'data/localStorage/packaging_userAccessControl.json', 
  'data/localStorage/general-trading/userAccessControl.json',
  'data/localStorage/trucking/trucking_userAccessControl.json'
];

console.log('\n📁 Checking data files:');
dataFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const data = JSON.parse(content);
      
      let users = [];
      if (Array.isArray(data)) {
        users = data;
      } else if (data && typeof data === 'object' && 'value' in data && Array.isArray(data.value)) {
        users = data.value;
      }
      
      const activeUsers = users.filter(user => 
        user && !user.deleted && user.isActive !== false
      );
      
      console.log(`✅ ${file}: ${users.length} total, ${activeUsers.length} active users`);
      
      if (activeUsers.length > 0) {
        console.log(`   Sample users: ${activeUsers.slice(0, 3).map(u => u.fullName || u.username).join(', ')}`);
      }
    } catch (error) {
      console.log(`❌ ${file}: Error reading - ${error.message}`);
    }
  } else {
    console.log(`⚠️  ${file}: File not found`);
  }
});

// Simulate SuperAdmin logic
console.log('\n🔍 Simulating SuperAdmin user loading logic:');

try {
  const allSources = [];
  
  dataFiles.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const data = JSON.parse(content);
        
        let users = [];
        if (Array.isArray(data)) {
          users = data;
        } else if (data && typeof data === 'object' && 'value' in data && Array.isArray(data.value)) {
          users = data.value;
        }
        
        allSources.push(...users);
        console.log(`📦 Loaded ${users.length} users from ${file}`);
      } catch (error) {
        console.log(`❌ Error loading ${file}: ${error.message}`);
      }
    }
  });
  
  // Merge and deduplicate by ID
  const mergedUsers = new Map();
  
  allSources.forEach(user => {
    if (user && user.id) {
      const existing = mergedUsers.get(user.id);
      if (!existing) {
        mergedUsers.set(user.id, user);
      } else {
        // Keep the one with latest updatedAt
        const existingTime = new Date(existing.updatedAt || 0).getTime();
        const newTime = new Date(user.updatedAt || 0).getTime();
        if (newTime > existingTime) {
          mergedUsers.set(user.id, user);
        }
      }
    }
  });
  
  const totalUsers = Array.from(mergedUsers.values());
  const activeUsers = totalUsers.filter(user => 
    user && !user.deleted && !user.deletedAt && user.isActive !== false
  );
  
  console.log(`\n📊 Merge Results:`);
  console.log(`✅ Total unique users: ${totalUsers.length}`);
  console.log(`✅ Active users: ${activeUsers.length}`);
  console.log(`✅ Deleted/inactive users: ${totalUsers.length - activeUsers.length}`);
  
  if (activeUsers.length > 0) {
    console.log(`\n👥 Active Users:`);
    activeUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.fullName || user.username} (${user.id})`);
      if (user.businessUnits && user.businessUnits.length > 0) {
        console.log(`   Business Units: ${user.businessUnits.join(', ')}`);
      }
    });
  } else {
    console.log(`\n⚠️  No active users found!`);
    console.log(`\nDebugging info:`);
    console.log(`- Total sources checked: ${dataFiles.length}`);
    console.log(`- Total raw users loaded: ${allSources.length}`);
    console.log(`- Total unique users after merge: ${totalUsers.length}`);
    
    if (totalUsers.length > 0) {
      console.log(`\nSample user data:`);
      const sampleUser = totalUsers[0];
      console.log(JSON.stringify(sampleUser, null, 2));
    }
  }
  
  console.log(`\n🎯 SuperAdmin should now show ${activeUsers.length} users in the filter dropdown`);
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}

console.log('\n✅ Test completed successfully!');
console.log('\n💡 Next steps:');
console.log('1. Restart the app to apply SuperAdmin changes');
console.log('2. Go to SuperAdmin → Users tab');
console.log('3. Check if users appear in the filter dropdown');
console.log('4. Check browser console for "[SuperAdmin] Loaded X users" messages');