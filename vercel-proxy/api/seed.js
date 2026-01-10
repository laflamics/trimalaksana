export default async function handler(req, res) {
  const timestamp = new Date().toISOString();
  const { type } = req.query;
  const endpoint = type === 'gt' || type === 'seedgt' ? '/api/seedgt' : 
                   type === 'trucking' || type === 'seedtrucking' ? '/api/seedtrucking' : '/api/seed';
  console.log(`[${timestamp}] [Vercel Proxy] /api/seed${type ? `?type=${type}` : ''} - Method: ${req.method}, Endpoint: ${endpoint}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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
    const response = await fetch(`${serverUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });
    
    if (!response.ok) {
      console.error(`[${timestamp}] [Vercel Proxy] Seed error: ${response.status}`);
      return res.status(response.status).json({ error: 'Server error' });
    }
    
    const data = await response.json();
    console.log(`[${timestamp}] [Vercel Proxy] Seed success: ${endpoint}`);
    return res.json(data);
  } catch (error) {
    console.error(`[${timestamp}] [Vercel Proxy] Seed error:`, error.message);
    return res.status(500).json({ error: error.message });
  }
}
