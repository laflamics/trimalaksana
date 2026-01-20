/**
 * Debug script untuk check data yang dikirim ke PDF template
 * Membantu debug kenapa schedule di PDF masih salah
 */

console.log('🔍 Debug PDF Schedule Data...\n');

// Simulate data yang seharusnya dikirim dari Production.tsx
const mockScheduleData = {
  scheduleStartDate: '2025-12-31T00:00:00.000Z', // 31/12/2025
  scheduleEndDate: '2026-01-07T00:00:00.000Z',   // 07/01/2026
};

const mockItem = {
  scheduleStartDate: '2025-12-31T00:00:00.000Z',
  scheduleEndDate: '2026-01-07T00:00:00.000Z',
};

const mockEffectiveSpk = {
  scheduleStartDate: '2025-12-31T00:00:00.000Z',
  scheduleEndDate: '2026-01-07T00:00:00.000Z',
};

// Simulate WO object creation logic dari Production.tsx
const woDocsData = {
  scheduleDate: mockScheduleData?.scheduleStartDate || mockItem.scheduleStartDate || mockEffectiveSpk.scheduleStartDate || null,
  scheduleEndDate: mockScheduleData?.scheduleEndDate || mockItem.scheduleEndDate || mockEffectiveSpk.scheduleEndDate || null,
};

console.log('📊 Mock Schedule Data:');
console.log('- scheduleStartDate:', mockScheduleData.scheduleStartDate);
console.log('- scheduleEndDate:', mockScheduleData.scheduleEndDate);

console.log('\n📋 WO Docs Data (yang dikirim ke PDF):');
console.log('- scheduleDate:', woDocsData.scheduleDate);
console.log('- scheduleEndDate:', woDocsData.scheduleEndDate);

// Simulate PDF template logic
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const scheduleDate = woDocsData.scheduleDate ? new Date(woDocsData.scheduleDate) : null;
const scheduleEndDate = woDocsData.scheduleEndDate ? new Date(woDocsData.scheduleEndDate) : null;
const startDate = scheduleDate ? formatDate(scheduleDate) : 'NO_DATE';
const endDate = scheduleEndDate ? formatDate(scheduleEndDate) : '';

console.log('\n🎯 PDF Template Processing:');
console.log('- scheduleDate object:', scheduleDate);
console.log('- scheduleEndDate object:', scheduleEndDate);
console.log('- startDate formatted:', startDate);
console.log('- endDate formatted:', endDate);

console.log('\n📄 Expected PDF Display:');
console.log(`📅 Schedule: ${startDate}${endDate ? ` - ${endDate}` : ''}`);

console.log('\n✅ Debug completed!');

// Check for potential issues
if (!woDocsData.scheduleEndDate) {
  console.log('\n⚠️  WARNING: scheduleEndDate is null/undefined!');
  console.log('   This means the schedule data is not being passed correctly from PPIC.');
}

if (startDate === endDate) {
  console.log('\n⚠️  WARNING: Start and end dates are the same!');
  console.log('   This might indicate the old +1 day logic is still being used.');
}