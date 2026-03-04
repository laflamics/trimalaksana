/**
 * Cleanup script to remove old SCHEDULE_CREATED notifications
 * These were created by the old trigger that has been removed
 * Keep only DELIVERY_SCHEDULE notifications (new trigger)
 */

const fs = require('fs');
const path = require('path');

const notificationsPath = path.join(__dirname, '../data/localStorage/deliveryNotifications.json');

try {
  // Read current notifications
  const data = JSON.parse(fs.readFileSync(notificationsPath, 'utf8'));
  const notifications = data.value || [];

  console.log(`Total notifications before cleanup: ${notifications.length}`);

  // Filter to keep only DELIVERY_SCHEDULE type (new trigger)
  const cleaned = notifications.filter((n) => n.type === 'DELIVERY_SCHEDULE');

  console.log(`Notifications removed: ${notifications.length - cleaned.length}`);
  console.log(`Notifications kept: ${cleaned.length}`);

  // Show what's being removed
  const removed = notifications.filter((n) => n.type !== 'DELIVERY_SCHEDULE');
  if (removed.length > 0) {
    console.log('\nRemoved notifications:');
    removed.forEach((n) => {
      console.log(`  - ${n.spkNo} (${n.soNo}) - ${n.type}`);
    });
  }

  // Show what's being kept
  if (cleaned.length > 0) {
    console.log('\nKept notifications:');
    cleaned.forEach((n) => {
      console.log(`  - ${n.spkNo} (${n.soNo}) - ${n.type}`);
    });
  }

  // Write cleaned data
  const cleanedData = {
    value: cleaned,
    timestamp: Date.now(),
    _timestamp: Date.now(),
  };

  fs.writeFileSync(notificationsPath, JSON.stringify(cleanedData, null, 2));
  console.log('\n✓ Cleanup complete!');
} catch (error) {
  console.error('Error during cleanup:', error.message);
  process.exit(1);
}
