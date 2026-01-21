/**
 * Script untuk membersihkan data user yang deleted
 * Hanya menyimpan user yang aktif dan tidak deleted
 */

const fs = require('fs');
const path = require('path');

// Path ke file userAccessControl.json
const userDataPath = path.join(__dirname, 'data/localStorage/userAccessControl.json');

try {
  // Baca file JSON
  const rawData = fs.readFileSync(userDataPath, 'utf8');
  const userData = JSON.parse(rawData);
  
  console.log('📊 Data sebelum pembersihan:');
  console.log(`Total users: ${userData.value.length}`);
  
  // Filter user yang aktif (tidak deleted)
  const activeUsers = userData.value.filter(user => {
    // Cek apakah user tidak deleted
    const isNotDeleted = !(
      user.deleted === true ||
      user.deleted === 'true' ||
      !!user.deletedAt ||
      !!user.deletedTimestamp
    );
    
    // Cek apakah user aktif
    const isActive = user.isActive === true;
    
    return isNotDeleted && isActive;
  });
  
  console.log('\n📊 Data setelah pembersihan:');
  console.log(`Active users: ${activeUsers.length}`);
  console.log(`Deleted users removed: ${userData.value.length - activeUsers.length}`);
  
  // Tampilkan daftar user aktif
  console.log('\n👥 User aktif:');
  activeUsers.forEach(user => {
    console.log(`- ${user.fullName} (${user.username}) - ${user.role} - ${user.businessUnits.join(', ')}`);
  });
  
  // Update data dengan user aktif saja
  const cleanedData = {
    ...userData,
    value: activeUsers,
    timestamp: Date.now(),
    _timestamp: Date.now()
  };
  
  // Backup file asli
  const backupPath = userDataPath + '.backup.' + Date.now();
  fs.copyFileSync(userDataPath, backupPath);
  console.log(`\n💾 Backup dibuat: ${backupPath}`);
  
  // Tulis data yang sudah dibersihkan
  fs.writeFileSync(userDataPath, JSON.stringify(cleanedData, null, 2));
  console.log(`\n✅ Data berhasil dibersihkan dan disimpan ke: ${userDataPath}`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
}