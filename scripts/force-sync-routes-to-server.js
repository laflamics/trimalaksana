/**
 * Force sync all local Routes data to server
 * This fixes the mismatch: Local 398 items vs Server 2 items
 */

const SERVER_URL = 'http://192.168.100.3:3001';

async function forceSyncRoutesToServer() {
  console.log('🔄 Force syncing Routes to server...\n');

  try {
    // 1. Read local Routes data
    const localData = localStorage.getItem('trucking_routes');
    if (!localData) {
      console.log('❌ No local Routes data found');
      return;
    }

    const parsed = JSON.parse(localData);
    const routes = Array.isArray(parsed) ? parsed : (parsed.value || []);
    
    console.log(`📊 Local Routes: ${routes.length} items`);

    // 2. Get server data
    const serverResponse = await fetch(`${SERVER_URL}/api/data/trucking/trucking_routes`);
    const serverData = await serverResponse.json();
    const serverRoutes = Array.isArray(serverData) ? serverData : (serverData.value || []);
    
    console.log(`📊 Server Routes: ${serverRoutes.length} items`);

    // 3. Upload local data to server
    console.log('\n📤 Uploading local Routes to server...');
    const uploadResponse = await fetch(`${SERVER_URL}/api/data/trucking/trucking_routes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(routes),
    });

    if (!uploadResponse.ok) {
      throw new Error(`Server returned ${uploadResponse.status}: ${uploadResponse.statusText}`);
    }

    const result = await uploadResponse.json();
    console.log('✅ Upload successful:', result);

    // 4. Verify sync
    console.log('\n🔍 Verifying sync...');
    const verifyResponse = await fetch(`${SERVER_URL}/api/data/trucking/trucking_routes`);
    const verifyData = await verifyResponse.json();
    const verifyRoutes = Array.isArray(verifyData) ? verifyData : (verifyData.value || []);
    
    console.log(`📊 Server Routes after sync: ${verifyRoutes.length} items`);

    if (verifyRoutes.length === routes.length) {
      console.log('\n✅ SUCCESS! Routes synced correctly');
      console.log(`   Local: ${routes.length} items`);
      console.log(`   Server: ${verifyRoutes.length} items`);
    } else {
      console.log('\n⚠️ WARNING: Counts still mismatch');
      console.log(`   Local: ${routes.length} items`);
      console.log(`   Server: ${verifyRoutes.length} items`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the sync
forceSyncRoutesToServer();
