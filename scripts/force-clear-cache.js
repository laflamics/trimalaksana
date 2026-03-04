(async () => {
  console.log('🔄 Force clearing cache and reloading from server...');
  
  // Clear all trucking related localStorage
  const keys = Object.keys(localStorage);
  const truckingKeys = keys.filter(k => k.includes('trucking'));
  
  console.log(`📦 Found ${truckingKeys.length} trucking keys in localStorage`);
  
  truckingKeys.forEach(key => {
    console.log(`   🗑️  Removing: ${key}`);
    localStorage.removeItem(key);
  });
  
  console.log('✅ Cache cleared!');
  console.log('🔄 Reloading page in 1 second...');
  
  setTimeout(() => {
    location.reload();
  }, 1000);
})();
