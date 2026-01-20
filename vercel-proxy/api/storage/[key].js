export default async function handler(req, res) {
  const timestamp = new Date().toISOString();
  const { key } = req.query;
  const method = req.method;
  console.log(`[${timestamp}] [Vercel Proxy] /api/storage/${key} - Method: ${method}`);
  
  // Set CORS headers - support all common HTTP methods
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const serverUrl = 'https://server-tljp.tail75a421.ts.net';
  
  // Handle file download route
  if (key && key.startsWith('file/')) {
    const fileName = key.replace('file/', '');
    try {
      console.log(`[${timestamp}] [Vercel Proxy] Downloading file: ${fileName}`);
      const response = await fetch(`${serverUrl}/api/storage/file/${fileName}`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        console.error(`[${timestamp}] [Vercel Proxy] File download error: ${response.status}`);
        return res.status(response.status).json({ error: 'Server error' });
      }
      
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const fileSize = (buffer.byteLength / 1024).toFixed(2);
      console.log(`[${timestamp}] [Vercel Proxy] File downloaded: ${fileName} (${fileSize} KB)`);
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', response.headers.get('content-disposition') || `attachment; filename="${fileName}"`);
      return res.send(Buffer.from(buffer));
    } catch (error) {
      console.error(`[${timestamp}] [Vercel Proxy] File download error:`, error.message);
      return res.status(500).json({ error: error.message });
    }
  }
  
  // Handle special operations (FLUSHALL, etc.)
  if (key === 'FLUSHALL' || key === 'flushall') {
    if (method === 'POST' || method === 'DELETE') {
      try {
        console.log(`[${timestamp}] [Vercel Proxy] FLUSHALL operation requested`);
        const response = await fetch(`${serverUrl}/api/storage/FLUSHALL`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(req.body || {}),
        });
        
        if (!response.ok) {
          return res.status(response.status).json({ error: 'Server error' });
        }
        
        const data = await response.json();
        console.log(`[${timestamp}] [Vercel Proxy] FLUSHALL success`);
        return res.json(data);
      } catch (error) {
        console.error(`[${timestamp}] [Vercel Proxy] FLUSHALL error:`, error.message);
        return res.status(500).json({ error: error.message });
      }
    } else {
      return res.status(405).json({ error: 'FLUSHALL only supports POST/DELETE' });
    }
  }
  
  // Handle regular storage key operations
  try {
    // CRITICAL FIX: Encode key dengan / menjadi URL encoded untuk Express route
    // Express :key tidak match jika ada / di dalamnya, jadi perlu encode
    const encodedKey = encodeURIComponent(key);
    
    let response;
    
    if (method === 'GET') {
      console.log(`[${timestamp}] [Vercel Proxy] GET storage key: ${key} (encoded: ${encodedKey})`);
      response = await fetch(`${serverUrl}/api/storage/${encodedKey}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
    } else if (method === 'POST' || method === 'PUT') {
      // Handle both POST and PUT as POST to backend server
      const bodySize = JSON.stringify(req.body).length;
      console.log(`[${timestamp}] [Vercel Proxy] ${method} storage key: ${key} (encoded: ${encodedKey}, ${(bodySize / 1024).toFixed(2)} KB)`);
      response = await fetch(`${serverUrl}/api/storage/${encodedKey}`, {
        method: 'POST', // Backend server uses POST for create/update
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      });
    } else if (method === 'PATCH') {
      // Handle PATCH for partial updates
      const bodySize = JSON.stringify(req.body).length;
      console.log(`[${timestamp}] [Vercel Proxy] PATCH storage key: ${key} (encoded: ${encodedKey}, ${(bodySize / 1024).toFixed(2)} KB)`);
      response = await fetch(`${serverUrl}/api/storage/${encodedKey}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      });
    } else if (method === 'DELETE') {
      console.log(`[${timestamp}] [Vercel Proxy] DELETE storage key: ${key} (encoded: ${encodedKey})`);
      response = await fetch(`${serverUrl}/api/storage/${encodedKey}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
        },
      });
    } else {
      return res.status(405).json({ error: `Method ${method} not allowed. Supported: GET, POST, PUT, PATCH, DELETE` });
    }
    
    if (!response.ok) {
      console.error(`[${timestamp}] [Vercel Proxy] Storage operation error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ error: 'Server error' });
    }
    
    const data = await response.json();
    console.log(`[${timestamp}] [Vercel Proxy] Storage operation success: ${key}`);
    return res.json(data);
  } catch (error) {
    console.error(`[${timestamp}] [Vercel Proxy] Storage operation error:`, error.message);
    return res.status(500).json({ error: error.message });
  }
}
