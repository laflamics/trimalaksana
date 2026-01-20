// Simple test to check if the sync methods are available
console.log('Testing sync methods...');

// Mock browser environment
global.window = {
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {}
};

global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  length: 0,
  key: () => null
};

try {
  // Test if we can require the storage service
  console.log('Requiring storage service...');
  const storageModule = require('./src/services/storage.ts');
  console.log('Storage module keys:', Object.keys(storageModule));
  
  if (storageModule.storageService) {
    const service = storageModule.storageService;
    console.log('Storage service methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(service)));
    
    // Check specific methods
    console.log('onSyncStatusChange:', typeof service.onSyncStatusChange);
    console.log('getSyncStatus:', typeof service.getSyncStatus);
  }
} catch (error) {
  console.error('Error:', error.message);
}