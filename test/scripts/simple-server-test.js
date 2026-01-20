/**
 * Simple server connectivity test
 */

console.log('🧪 TESTING VERCEL PROXY SERVER\n');

async function testServer() {
  const serverUrl = 'https://vercel-proxy-blond-nine.vercel.app';
  
  console.log('Testing server connectivity...');
  
  try {
    // Test basic connectivity
    const response = await fetch(`${serverUrl}/api/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.text();
      console.log(`Response data: ${data}`);
    } else {
      console.log(`Server error: ${response.status} ${response.statusText}`);
    }
    
  } catch (error) {
    console.log(`Connection error: ${error.message}`);
  }
}

testServer().catch(console.error);