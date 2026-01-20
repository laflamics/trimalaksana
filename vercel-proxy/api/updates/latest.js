export default async function handler(req, res) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Vercel Proxy] /api/updates/latest - Method: ${req.method}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const serverUrl = 'https://server-tljp.tail75a421.ts.net';
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const response = await fetch(`${serverUrl}/api/updates/latest`, {
      method: 'GET',
      headers: {
        'Accept': 'text/yaml',
      },
    });
    
    if (!response.ok) {
      console.error(`[${timestamp}] [Vercel Proxy] latest error: ${response.status}`);
      return res.status(response.status).json({ error: 'Server error' });
    }
    
    const text = await response.text();
    console.log(`[${timestamp}] [Vercel Proxy] latest fetched successfully (${text.length} bytes)`);
    res.setHeader('Content-Type', 'text/yaml');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.send(text);
  } catch (error) {
    console.error(`[${timestamp}] [Vercel Proxy] latest error:`, error.message);
    return res.status(500).json({ error: error.message });
  }
}
