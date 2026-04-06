/**
 * Vercel Blob Upload Endpoint
 * Handles file uploads to Vercel Blob Storage
 * 
 * Receives binary file data with headers
 * Filename and business passed in query params and headers
 */

import { put } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  console.log(`[Vercel Blob] 🔍 Handler called - Method: ${req.method}`);
  
  // Only allow POST
  if (req.method !== 'POST') {
    console.error(`[Vercel Blob] ❌ Invalid method: ${req.method}`);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get params from query string and headers
    const business = (req.query.business as string) || 'packaging';
    const fileName = (req.headers['x-file-name'] as string) || `upload-${Date.now()}`;
    const mimeType = (req.headers['content-type'] as string) || 'application/octet-stream';
    
    console.log(`[Vercel Blob] 📥 Received upload request`);
    console.log(`[Vercel Blob] Business: ${business}`);
    console.log(`[Vercel Blob] File Name: ${fileName}`);
    console.log(`[Vercel Blob] MIME Type: ${mimeType}`);
    console.log(`[Vercel Blob] Body type: ${typeof req.body}, is Buffer: ${Buffer.isBuffer(req.body)}`);

    // req.body should contain the binary file data
    let fileData = req.body;

    // Convert to buffer if needed
    if (typeof fileData === 'string') {
      console.log(`[Vercel Blob] Converting string body to buffer`);
      fileData = Buffer.from(fileData, 'binary');
    } else if (!Buffer.isBuffer(fileData)) {
      console.log(`[Vercel Blob] Converting ${typeof fileData} body to buffer`);
      if (fileData instanceof ArrayBuffer) {
        fileData = Buffer.from(fileData);
      } else {
        fileData = Buffer.from(String(fileData || ''));
      }
    }

    if (!fileData || fileData.length === 0) {
      console.error('[Vercel Blob] ❌ No file data provided');
      return res.status(400).json({ error: 'No file provided' });
    }

    const fileSize = fileData.length;
    console.log(`[Vercel Blob] 📤 File size: ${fileSize} bytes`);

    // Check for token
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      console.error('[Vercel Blob] ❌ BLOB_READ_WRITE_TOKEN not configured');
      return res.status(500).json({ error: 'Blob storage not configured' });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const blobFileName = `${business}/${timestamp}-${fileName}`;

    console.log(`[Vercel Blob] 🚀 Calling put() with filename: ${blobFileName}`);

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
      fileId: blob.url,
      fileName: fileName,
      fileSize: fileSize,
      mimeType: mimeType,
      url: blob.url,
    });
  } catch (error) {
    console.error(`[Vercel Blob] ❌ Handler error:`, error);
    console.error(`[Vercel Blob] Error type:`, error instanceof Error ? error.constructor.name : typeof error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Upload failed',
      details: error instanceof Error ? error.stack : String(error),
    });
  }
}
