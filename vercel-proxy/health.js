export default async function handler(req, res) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Vercel Proxy] /health - Method: ${req.method}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const serverUrl = 'https://server-tljp.tail75a421.ts.net';
  
  try {
    const response = await fetch(`${serverUrl}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`[${timestamp}] [Vercel Proxy] Health check error: ${response.status}`);
      return res.status(response.status).json({ error: 'Server error' });
    }
    
    const data = await response.json();
    console.log(`[${timestamp}] [Vercel Proxy] Health check success`);
    return res.json(data);
  } catch (error) {
    console.error(`[${timestamp}] [Vercel Proxy] Health check error:`, error.message);
    return res.status(500).json({ error: error.message });
  }
}
