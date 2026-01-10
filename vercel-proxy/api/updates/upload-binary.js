export default async function handler(req, res) {
  const timestamp = new Date().toISOString();
  const fileName = req.headers['x-filename'] || req.query.filename || 'uploaded-file.exe';
  const fileSize = parseInt(req.headers['content-length'] || '0', 10);
  console.log(`[${timestamp}] [Vercel Proxy] /api/updates/upload-binary - Method: ${req.method}, File: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
  
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
    // Forward raw binary to server
    const response = await fetch(`${serverUrl}/api/updates/upload-binary?filename=${encodeURIComponent(fileName)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': req.headers['content-length'] || '0',
        'X-Filename': fileName,
      },
      body: req.body,
    });
    
    if (!response.ok) {
      console.error(`[${timestamp}] [Vercel Proxy] Binary upload error: ${response.status}`);
      return res.status(response.status).json({ error: 'Server error' });
    }
    
    const data = await response.json();
    console.log(`[${timestamp}] [Vercel Proxy] Binary upload success: ${fileName}`);
    return res.json(data);
  } catch (error) {
    console.error(`[${timestamp}] [Vercel Proxy] Binary upload error:`, error.message);
    return res.status(500).json({ error: error.message });
  }
}
