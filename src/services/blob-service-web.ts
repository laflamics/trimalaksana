/**
 * Blob Service - Web Mode (Vercel Blob)
 * 
 * Handles file uploads to Vercel Blob Storage
 * Used only in web app (dist)
 * 
 * Key fix: Use FormData instead of ArrayBuffer
 * Vercel endpoint properly parses FormData
 */

export interface BlobUploadResult {
  success: boolean;
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  storage: 'vercel';
}

export class BlobServiceWeb {
  /**
   * Upload to Vercel Blob (web only)
   * 
   * FIX: Use FormData to properly send file to Vercel endpoint
   * Vercel's req.body parser handles FormData correctly
   */
  static async uploadFile(
    file: File,
    business: 'packaging' | 'trucking' | 'general-trading' = 'packaging'
  ): Promise<BlobUploadResult> {
    try {
      console.log(`[BlobServiceWeb] 📤 Uploading: ${file.name} (${file.size} bytes) to ${business}`);
      
      // Create FormData with file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('business', business);
      formData.append('fileName', file.name);
      formData.append('mimeType', file.type || 'application/octet-stream');
      
      // Build upload URL
      const uploadUrl = `${window.location.origin}/api/blob/upload-vercel`;
      console.log(`[BlobServiceWeb] 🔗 Upload URL: ${uploadUrl}`);
      
      // Upload with FormData
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData, // ← FormData, not ArrayBuffer
        // Don't set Content-Type header - browser will set it with boundary
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[BlobServiceWeb] ❌ Upload failed: ${response.status}`, errorText);
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`[BlobServiceWeb] 📋 Response:`, result);
      
      // Handle both response formats:
      // Format 1 (new): { fileId, fileName, fileSize, mimeType, url }
      // Format 2 (legacy/noxtiz): { id, path, url, size, type }
      
      // Use full URL as fileId for consistency
      const fileUrl = result.url;
      
      if (!fileUrl) {
        throw new Error(`Invalid response from Vercel Blob: ${JSON.stringify(result)}`);
      }
      
      console.log(`[BlobServiceWeb] ✅ Upload successful: ${fileUrl}`);
      
      return {
        success: true,
        fileId: fileUrl, // Store full URL as fileId
        fileName: result.fileName || file.name,
        fileSize: result.fileSize || result.size || file.size,
        mimeType: result.mimeType || result.type || file.type || 'application/octet-stream',
        url: fileUrl,
        storage: 'vercel',
      };
    } catch (error) {
      console.error(`[BlobServiceWeb] ❌ Upload failed:`, error);
      console.error(`[BlobServiceWeb] Error details:`, {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : 'No stack'
      });
      throw error;
    }
  }

  /**
   * Get download URL for Vercel Blob
   * fileId is the full URL from response (result.url)
   */
  static getDownloadUrl(fileId: string): string {
    // fileId should be the full URL from Vercel Blob response
    if (fileId.startsWith('http')) {
      console.log(`[BlobServiceWeb] 🔗 Using Vercel Blob URL: ${fileId}`);
      return fileId;
    }
    
    // If not a full URL, it's a path - use as-is
    // This handles both formats from response
    console.log(`[BlobServiceWeb] 🔗 Using URL: ${fileId}`);
    return fileId;
  }

  /**
   * Delete file - web mode doesn't support deletion
   * Vercel Blob deletion requires admin token
   */
  static async deleteFile(fileId: string): Promise<void> {
    console.warn(`[BlobServiceWeb] ⚠️ File deletion not supported in web mode: ${fileId}`);
    // In web mode, we can't delete from Vercel Blob
    // Just log and continue - file stays in Vercel
  }

  /**
   * Validate file before upload
   */
  static validateFile(
    file: File,
    maxSizeMB: number = 50,
    allowedTypes: string[] = ['image/*', 'application/pdf']
  ): { valid: boolean; error?: string } {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `File size exceeds ${maxSizeMB}MB limit`
      };
    }

    const isAllowed = allowedTypes.some(type => {
      if (type === 'image/*') {
        return file.type.startsWith('image/');
      }
      return file.type === type;
    });

    if (!isAllowed) {
      return {
        valid: false,
        error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Convert file to data URL (for preview)
   */
  static async fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Download file
   */
  static async downloadFile(fileId: string, fileName: string): Promise<void> {
    try {
      console.log(`[BlobServiceWeb] ⬇️ Downloading: ${fileId}`);
      const url = this.getDownloadUrl(fileId);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log(`[BlobServiceWeb] ✅ Download started: ${fileId}`);
    } catch (error) {
      console.error(`[BlobServiceWeb] ❌ Download failed:`, error);
      throw error;
    }
  }

  /**
   * Open file in new tab
   */
  static openFile(fileId: string): void {
    try {
      const url = this.getDownloadUrl(fileId);
      window.open(url, '_blank');
    } catch (error) {
      console.error(`[BlobServiceWeb] ❌ Open file failed:`, error);
      throw error;
    }
  }

  /**
   * Get embed URL for PDF preview
   */
  static getEmbedUrl(fileId: string): string {
    const downloadUrl = this.getDownloadUrl(fileId);
    return `https://docs.google.com/gview?url=${encodeURIComponent(downloadUrl)}&embedded=true`;
  }

  /**
   * Get preview URL for images
   */
  static getPreviewUrl(fileId: string, mimeType: string): string {
    if (mimeType.startsWith('image/')) {
      return this.getDownloadUrl(fileId);
    }
    if (mimeType === 'application/pdf') {
      return this.getEmbedUrl(fileId);
    }
    return this.getDownloadUrl(fileId);
  }
}

export default BlobServiceWeb;
