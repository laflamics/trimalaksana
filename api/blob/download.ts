/**
 * Blob Download Proxy Endpoint
 * Handles downloads from MinIO for web app
 * (Vercel Blob URLs are returned directly, no proxy needed)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { business, fileId } = req.query;

    if (!business || !fileId) {
      return res.status(400).json({ error: 'Missing business or fileId' });
    }

    console.log(`[Blob Download] 📥 Downloading: ${fileId} from ${business}`);

    // If fileId is a full URL (from Vercel Blob), redirect to it
    if (typeof fileId === 'string' && fileId.startsWith('http')) {
      console.log(`[Blob Download] 🔗 Redirecting to Vercel Blob URL`);
      return res.redirect(307, fileId);
    }

    // Otherwise, fetch from MinIO via Tailscale
    const minioUrl = `http://server-tljp.tail75a421.ts.net:9999/api/blob/download/${business}/${fileId}`;
    console.log(`[Blob Download] 🔗 Fetching from MinIO: ${minioUrl}`);

    const response = await fetch(minioUrl);

    if (!response.ok) {
      console.error(`[Blob Download] ❌ MinIO error: ${response.status}`);
      return res.status(response.status).json({ error: 'Download failed from MinIO' });
    }

    // Get content type from MinIO response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');

    // Set response headers
    res.setHeader('Content-Type', contentType);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    // Stream the file
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));

    console.log(`[Blob Download] ✅ Download successful: ${fileId}`);
  } catch (error) {
    console.error(`[Blob Download] ❌ Error:`, error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Download failed',
    });
  }
}
