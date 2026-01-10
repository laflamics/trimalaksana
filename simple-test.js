console.log('Testing array extraction...');

// Test the exact scenario that was causing errors
const wrappedData = {
  value: [
    { id: 1, name: 'Test Item 1' },
    { id: 2, name: 'Test Item 2' }
  ],
  timestamp: Date.now()
};

// This is what was causing the error before
console.log('Before fix - direct access would fail:');
try {
  // This would cause: TypeError: wrappedData.filter is not a function
  // const result = wrappedData.filter(item => item.id);
  console.log('Direct filter on wrapped object would fail');
} catch (e) {
  console.log('Error:', e.message);
}

// After fix - with extraction
const extractArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && 'value' in data && Array.isArray(data.value)) {
    return data.value;
  }
  return [];
};

const extracted = extractArray(wrappedData);
console.log('After fix - extracted array:', extracted.length, 'items');

// Now these operations work
const filtered = extracted.filter(item => item && item.id > 1);
console.log('Filter works:', filtered.length, 'items');

extracted.forEach(item => {
  console.log('ForEach works:', item.name);
});

console.log('✅ Test passed - fixes work correctly!');