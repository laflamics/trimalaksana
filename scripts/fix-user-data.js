// Simple script to clean user data
console.log('Starting user data cleanup...');

// Read the current data
const fs = require('fs');
const userData = JSON.parse(fs.readFileSync('./data/localStorage/userAccessControl.json', 'utf8'));

console.log('Total users before cleanup:', userData.value.length);

// Filter active users only (not deleted)
const activeUsers = userData.value.filter(user => {
  return user.isActive === true && !user.deleted && !user.deletedAt && !user.deletedTimestamp;
});

console.log('Active users after cleanup:', activeUsers.length);
console.log('Users removed:', userData.value.length - activeUsers.length);

// Show active users
console.log('\nActive users:');
activeUsers.forEach(user => {
  console.log(`- ${user.fullName} (${user.username}) - ${user.role}`);
});

// Update the data
userData.value = activeUsers;
userData.timestamp = Date.now();
userData._timestamp = Date.now();

// Save cleaned data
fs.writeFileSync('./data/localStorage/userAccessControl.json', JSON.stringify(userData, null, 2));
console.log('\n✅ Data cleaned and saved!');