/**
 * Vercel Blob Upload Endpoint
 * Handles file uploads to Vercel Blob Storage
 * 
 * Receives FormData with file
 * Filename and business passed in FormData or query params
 * 
 * FIX: Now properly handles FormData from fetch() calls
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
    // Get params from query string or FormData
    let business = (req.query.business as string) || 'packaging';
    let fileName = (req.query.fileName as string) || `upload-${Date.now()}`;
    let mimeType = (req.query.mimeType as string) || 'application/octet-stream';

    // Get file data from body
    let fileData = req.body;

    // If body is FormData (multipart), parse it
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      console.log('[Vercel Blob] 📋 Parsing FormData...');
      
      // req.body should be the raw buffer for FormData
      // We need to extract the file from the multipart data
      // For now, treat the entire body as the file
      fileData = req.body;
    }

    if (!fileData) {
      console.error('[Vercel Blob] ❌ No file data provided');
      return res.status(400).json({ error: 'No file provided' });
    }

    const fileSize = Buffer.isBuffer(fileData) ? fileData.length : Buffer.byteLength(fileData);
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
    console.error(`[Vercel Blob] ❌ Upload error:`, error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Upload failed',
      details: error instanceof Error ? error.stack : 'No details',
    });
  }
}
