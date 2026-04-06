/**
 * Vercel Blob Upload Endpoint
 * Handles file uploads to Vercel Blob Storage
 * 
 * Receives FormData with file
 * Filename and business passed in query params
 * 
 * FIX: Use simple approach without busboy - Vercel handles multipart parsing
 */

import { put } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get params from query string
    const business = (req.query.business as string) || 'packaging';
    
    console.log(`[Vercel Blob] 📥 Received upload request for business: ${business}`);
    console.log(`[Vercel Blob] Content-Type: ${req.headers['content-type']}`);
    console.log(`[Vercel Blob] Body type:`, typeof req.body, Array.isArray(req.body) ? 'array' : 'not array');

    // req.body should be the file buffer when sent as FormData
    // Vercel automatically parses multipart/form-data
    let fileData = req.body;
    let fileName = `upload-${Date.now()}`;
    let mimeType = 'application/octet-stream';

    // If body is a string, convert to buffer
    if (typeof fileData === 'string') {
      fileData = Buffer.from(fileData, 'utf-8');
    }

    // If body is not a buffer, try to convert
    if (!Buffer.isBuffer(fileData)) {
      console.log(`[Vercel Blob] Converting body to buffer:`, typeof fileData);
      if (fileData && typeof fileData === 'object') {
        // Try to extract file from parsed FormData object
        // Vercel might parse it as an object with file properties
        fileData = Buffer.from(JSON.stringify(fileData));
      } else {
        fileData = Buffer.from(String(fileData || ''));
      }
    }

    if (!fileData || fileData.length === 0) {
      console.error('[Vercel Blob] ❌ No file data provided');
      return res.status(400).json({ error: 'No file provided' });
    }

    const fileSize = fileData.length;
    console.log(`[Vercel Blob] 📤 Uploading: ${fileName} (${fileSize} bytes) to ${business}`);

    // Check for token
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      console.error('[Vercel Blob] ❌ BLOB_READ_WRITE_TOKEN not configured');
      return res.status(500).json({ error: 'Blob storage not configured' });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const blobFileName = `${business}/${timestamp}-${fileName}`;

    // Upload to Vercel Blob
    const blob = await put(blobFileName, fileData, {
      access: 'public',
      token: token,
      contentType: mimeType,
    });

    console.log(`[Vercel Blob] ✅ Upload successful: ${blob.url}`);

    // Return response
    res.status(200).json({
      success: true,
      fileId: blob.url, // Full URL from Vercel Blob
      fileName: fileName,
      fileSize: fileSize,
      mimeType: mimeType,
      url: blob.url,
    });
  } catch (error) {
    console.error(`[Vercel Blob] ❌ Handler error:`, error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Upload failed',
      details: error instanceof Error ? error.stack : 'No details',
    });
  }
}
