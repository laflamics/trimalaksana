/**
 * Fix Petty Cash Amount from Delivery Order
 * 
 * Script untuk auto-fill amount dari DO untuk semua existing petty cash requests
 * yang amount = 0 dan punya doNo reference
 * 
 * Usage: node scripts/fix-pettycash-amount-from-do.js
 */

const fs = require('fs');
const path = require('path');

// Simulate storage keys
const STORAGE_KEYS = {
  TRUCKING: {
    PETTY_CASH_REQUESTS: 'trucking_pettyCashRequests',
    DELIVERY_ORDERS: 'trucking_deliveryOrders',
  }
};

// Read from localStorage simulation or JSON files
function readStorageData(key) {
  try {
    // Try reading from localStorage simulation files
    const filePath = path.join(__dirname, `../localStorage-simulation-${key}.json`);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error reading ${key}:`, error.message);
  }
  return [];
}

function writeStorageData(key, data) {
  try {
    const filePath = path.join(__dirname, `../localStorage-simulation-${key}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✅ Saved ${key}`);
  } catch (error) {
    console.error(`Error writing ${key}:`, error.message);
  }
}

async function fixPettyCashAmount() {
  console.log('🔧 Starting Petty Cash Amount Fix...\n');

  try {
    // Read data
    const pettyCashRequests = readStorageData(STORAGE_KEYS.TRUCKING.PETTY_CASH_REQUESTS);
    const deliveryOrders = readStorageData(STORAGE_KEYS.TRUCKING.DELIVERY_ORDERS);

    console.log(`📊 Found ${pettyCashRequests.length} Petty Cash Requests`);
    console.log(`📊 Found ${deliveryOrders.length} Delivery Orders\n`);

    if (!Array.isArray(pettyCashRequests) || pettyCashRequests.length === 0) {
      console.log('❌ No petty cash requests found');
      return;
    }

    // Find requests with amount = 0 and doNo
    const requestsToFix = pettyCashRequests.filter(req => 
      req.amount === 0 && req.doNo
    );

    console.log(`🔍 Found ${requestsToFix.length} requests with amount=0 and doNo\n`);

    if (requestsToFix.length === 0) {
      console.log('✅ No requests to fix');
      return;
    }

    // Fix each request
    let fixedCount = 0;
    const updatedRequests = pettyCashRequests.map(req => {
      if (req.amount === 0 && req.doNo) {
        // Find matching DO
        const doItem = deliveryOrders.find(d => d.doNo === req.doNo);
        
        if (doItem && doItem.totalDeal) {
          console.log(`✅ ${req.requestNo}: ${req.doNo} → amount = Rp ${doItem.totalDeal.toLocaleString('id-ID')}`);
          fixedCount++;
          return {
            ...req,
            amount: doItem.totalDeal,
          };
        } else {
          console.log(`⚠️ ${req.requestNo}: ${req.doNo} → DO not found or no totalDeal`);
          return req;
        }
      }
      return req;
    });

    console.log(`\n📈 Fixed ${fixedCount} requests\n`);

    // Save updated data
    writeStorageData(STORAGE_KEYS.TRUCKING.PETTY_CASH_REQUESTS, updatedRequests);

    console.log('✅ Petty Cash Amount Fix Complete!');
    console.log(`\n📝 Summary:`);
    console.log(`   - Total requests: ${pettyCashRequests.length}`);
    console.log(`   - Requests with amount=0: ${requestsToFix.length}`);
    console.log(`   - Fixed: ${fixedCount}`);
    console.log(`   - Failed: ${requestsToFix.length - fixedCount}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run
fixPettyCashAmount();
