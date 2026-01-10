export default async function handler(req, res) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Vercel Proxy] /api/storage/upload-file - Method: ${req.method}`);
  
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
    const fileName = req.body?.fileName || 'unknown';
    const fileSize = JSON.stringify(req.body).length;
    console.log(`[${timestamp}] [Vercel Proxy] Uploading file: ${fileName} (${(fileSize / 1024).toFixed(2)} KB)`);
    
    const response = await fetch(`${serverUrl}/api/storage/upload-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });
    
    if (!response.ok) {
      console.error(`[${timestamp}] [Vercel Proxy] Upload error: ${response.status}`);
      return res.status(response.status).json({ error: 'Server error' });
    }
    
    const data = await response.json();
    console.log(`[${timestamp}] [Vercel Proxy] Upload success: ${fileName}`);
    return res.json(data);
  } catch (error) {
    console.error(`[${timestamp}] [Vercel Proxy] Upload error:`, error.message);
    return res.status(500).json({ error: error.message });
  }
}
