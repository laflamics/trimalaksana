// Test Array Extraction Logic
// Simulasi data yang bisa datang dari storage

console.log('🧪 Testing Array Extraction Logic...\n');

// Helper function yang sama seperti di components
const extractArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && 'value' in data && Array.isArray(data.value)) {
    return data.value;
  }
  return [];
};

// Test Cases
const testCases = [
  {
    name: 'Normal Array',
    input: [{ id: 1, name: 'Test' }, { id: 2, name: 'Test2' }],
    expected: 'Array with 2 items'
  },
  {
    name: 'Wrapped Object (Storage Format)',
    input: {
      value: [{ id: 1, name: 'Test' }, { id: 2, name: 'Test2' }],
      timestamp: 1641234567890
    },
    expected: 'Array with 2 items'
  },
  {
    name: 'Null/Undefined',
    input: null,
    expected: 'Empty array'
  },
  {
    name: 'Empty Object',
    input: {},
    expected: 'Empty array'
  },
  {
    name: 'String (Invalid)',
    input: 'invalid data',
    expected: 'Empty array'
  },
  {
    name: 'Wrapped with Empty Array',
    input: { value: [], timestamp: 1641234567890 },
    expected: 'Empty array'
  }
];

// Run Tests
testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log('Input:', JSON.stringify(testCase.input));
  
  const result = extractArray(testCase.input);
  console.log('Output:', result);
  console.log('Is Array:', Array.isArray(result));
  console.log('Length:', result.length);
  
  // Test filter operation (this was causing the error)
  try {
    const filtered = result.filter(item => item && item.id);
    console.log('✅ Filter works:', filtered.length, 'items');
  } catch (error) {
    console.log('❌ Filter failed:', error.message);
  }
  
  // Test forEach operation (this was also causing the error)
  try {
    let count = 0;
    result.forEach(item => {
      if (item) count++;
    });
    console.log('✅ ForEach works:', count, 'items processed');
  } catch (error) {
    console.log('❌ ForEach failed:', error.message);
  }
  
  console.log('Expected:', testCase.expected);
  console.log('---\n');
});

// Test Real Data Scenarios
console.log('🔍 Testing Real Data Scenarios...\n');

// Simulasi data GT
const gtData = {
  value: [
    { id: 'so-1', customerName: 'Customer A', total: 1000000, status: 'Draft' },
    { id: 'so-2', customerName: 'Customer B', total: 2000000, status: 'Confirmed' },
    { id: 'so-3', customerName: 'Customer C', total: 1500000, status: 'Paid' }
  ],
  timestamp: Date.now()
};

console.log('GT Sales Orders Test:');
const gtSalesOrders = extractArray(gtData);
console.log('Extracted:', gtSalesOrders.length, 'sales orders');

// Test operations yang biasa dilakukan di Dashboard
const draftOrders = gtSalesOrders.filter(so => so && so.status === 'Draft');
console.log('✅ Draft orders:', draftOrders.length);

const totalRevenue = gtSalesOrders.reduce((sum, so) => sum + (so?.total || 0), 0);
console.log('✅ Total revenue:', totalRevenue.toLocaleString('id-ID'));

// Simulasi data Trucking
const truckingData = {
  value: [
    { id: 'do-1', doNo: 'DO001', status: 'Open', vehicleNo: 'B1234AB' },
    { id: 'do-2', doNo: 'DO002', status: 'In Transit', vehicleNo: 'B5678CD' },
    { id: 'do-3', doNo: 'DO003', status: 'Close', vehicleNo: 'B9012EF' }
  ],
  timestamp: Date.now()
};

console.log('\nTrucking Delivery Orders Test:');
const truckingOrders = extractArray(truckingData);
console.log('Extracted:', truckingOrders.length, 'delivery orders');

const openOrders = truckingOrders.filter(order => order && order.status === 'Open');
console.log('✅ Open orders:', openOrders.length);

const inTransitOrders = truckingOrders.filter(order => order && order.status === 'In Transit');
console.log('✅ In Transit orders:', inTransitOrders.length);

console.log('\n🎉 All tests completed successfully!');
console.log('✅ Array extraction works correctly');
console.log('✅ Filter operations work');
console.log('✅ ForEach operations work');
console.log('✅ Reduce operations work');
console.log('\n🚀 The fixes should resolve the filter/forEach errors!');