export default async function handler(req, res) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Vercel Proxy] /api/storage/sync - Method: ${req.method}`);
  
  // Set CORS headers - support all common HTTP methods
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const serverUrl = 'https://server-tljp.tail75a421.ts.net';
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const bodySize = JSON.stringify(req.body).length;
    const keysCount = req.body?.data ? Object.keys(req.body.data).length : 0;
    console.log(`[${timestamp}] [Vercel Proxy] Syncing ${keysCount} keys (${(bodySize / 1024).toFixed(2)} KB)`);
    
    const response = await fetch(`${serverUrl}/api/storage/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });
    
    if (!response.ok) {
      console.error(`[${timestamp}] [Vercel Proxy] Sync error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ error: 'Server error' });
    }
    
    const data = await response.json();
    console.log(`[${timestamp}] [Vercel Proxy] Sync success: ${keysCount} keys synced`);
    return res.json(data);
  } catch (error) {
    console.error(`[${timestamp}] [Vercel Proxy] Sync error:`, error.message);
    return res.status(500).json({ error: error.message });
  }
}
