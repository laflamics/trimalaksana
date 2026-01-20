export default async function handler(req, res) {
  const timestamp = new Date().toISOString();
  const { path } = req.query;
  const filePath = Array.isArray(path) ? path.join('/') : path;
  console.log(`[${timestamp}] [Vercel Proxy] /api/updates/${filePath} - Method: ${req.method}`);
  
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
    const response = await fetch(`${serverUrl}/api/updates/${filePath}`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      console.error(`[${timestamp}] [Vercel Proxy] Update file error: ${response.status}`);
      return res.status(response.status).json({ error: 'Server error' });
    }
    
    // Stream file response
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const fileSize = (buffer.byteLength / 1024 / 1024).toFixed(2);
    console.log(`[${timestamp}] [Vercel Proxy] Update file downloaded: ${filePath} (${fileSize} MB)`);
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.send(Buffer.from(buffer));
  } catch (error) {
    console.error(`[${timestamp}] [Vercel Proxy] Update file error:`, error.message);
    return res.status(500).json({ error: error.message });
  }
}
