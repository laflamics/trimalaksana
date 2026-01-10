export default async function handler(req, res) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Vercel Proxy] /api/storage/all - Method: ${req.method}, Since: ${req.query.since || 0}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const serverUrl = 'https://server-tljp.tail75a421.ts.net';
  const since = req.query.since || 0;
  
  try {
    console.log(`[${timestamp}] [Vercel Proxy] Fetching from: ${serverUrl}/api/storage/all?since=${since}`);
    const response = await fetch(`${serverUrl}/api/storage/all?since=${since}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`[${timestamp}] [Vercel Proxy] Server error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ error: 'Server error' });
    }
    
    const data = await response.json();
    const keysCount = Object.keys(data).length;
    console.log(`[${timestamp}] [Vercel Proxy] Success: ${keysCount} keys returned`);
    return res.json(data);
  } catch (error) {
    console.error(`[${timestamp}] [Vercel Proxy] Error:`, error.message);
    return res.status(500).json({ error: error.message });
  }
}
