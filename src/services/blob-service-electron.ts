/**
 * Blob Service - Electron Mode (MinIO)
 * 
 * Handles file uploads to MinIO via Tailscale
 * Used only in Electron app
 * 
 * MinIO is accessed via internal Tailscale network
 * No SSL issues, direct HTTP connection
 */

import { apiClient } from './api-client';

export interface BlobUploadResult {
  success: boolean;
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  storage: 'minio';
}

export interface BlobMetadata {
  file_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  bucket_name: string;
  object_key: string;
  uploaded_at: string;
}

export class BlobServiceElectron {
  /**
   * Upload to MinIO (Electron only)
   * 
   * Uses apiClient which handles Tailscale connection
   * MinIO is accessed via internal network, no SSL issues
   */
  static async uploadFile(
    file: File,
    business: 'packaging' | 'trucking' | 'general-trading' = 'packaging'
  ): Promise<BlobUploadResult> {
    try {
      console.log(`[BlobServiceElectron] 📤 Uploading: ${file.name} (${file.size} bytes) to ${business}`);
      
      const result = await apiClient.uploadBlob(file, business);
      
      console.log(`[BlobServiceElectron] ✅ Upload successful: ${result.fileId}`);
      
      return {
        success: true,
        fileId: result.fileId,
        fileName: result.fileName,
        fileSize: result.fileSize,
        mimeType: result.mimeType,
        url: result.url,
        storage: 'minio',
      };
    } catch (error) {
      console.error(`[BlobServiceElectron] ❌ Upload failed:`, error);
      console.error(`[BlobServiceElectron] Error details:`, {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : 'No stack'
      });
      throw error;
    }
  }

  /**
   * Get download URL for MinIO
   * Uses Tailscale internal network
   */
  static getDownloadUrl(
    fileId: string,
    business: 'packaging' | 'trucking' | 'general-trading' = 'packaging'
  ): string {
    // MinIO via Tailscale (internal network, HTTP)
    const minioUrl = `http://server-tljp.tail75a421.ts.net:9999/api/blob/download/${business}/${fileId}`;
    console.log(`[BlobServiceElectron] 🔗 Using MinIO URL: ${minioUrl}`);
    return minioUrl;
  }

  /**
   * Delete file from MinIO
   */
  static async deleteFile(
    fileId: string,
    business: 'packaging' | 'trucking' | 'general-trading' = 'packaging'
  ): Promise<void> {
    try {
      console.log(`[BlobServiceElectron] 🗑️ Deleting: ${fileId}`);
      await apiClient.deleteBlob(business, fileId);
      console.log(`[BlobServiceElectron] ✅ Delete successful: ${fileId}`);
    } catch (error: any) {
      // Ignore 404 errors
      if (error.message?.includes('404') || error.message?.includes('Not Found')) {
        console.log(`[BlobServiceElectron] ⚠️ File already deleted or not found: ${fileId}`);
        return;
      }
      console.error(`[BlobServiceElectron] ❌ Delete failed:`, error);
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  static async getMetadata(fileId: string): Promise<BlobMetadata> {
    try {
      console.log(`[BlobServiceElectron] 📋 Getting metadata: ${fileId}`);
      const metadata = await apiClient.getBlobMetadata(fileId);
      console.log(`[BlobServiceElectron] ✅ Metadata retrieved: ${fileId}`);
      return metadata;
    } catch (error) {
      console.error(`[BlobServiceElectron] ❌ Metadata retrieval failed:`, error);
      throw error;
    }
  }

  /**
   * List files in business bucket
   */
  static async listFiles(
    business: 'packaging' | 'trucking' | 'general-trading' = 'packaging'
  ): Promise<BlobMetadata[]> {
    try {
      console.log(`[BlobServiceElectron] 📋 Listing files in ${business}`);
      const result = await apiClient.listBlobs(business);
      console.log(`[BlobServiceElectron] ✅ Listed ${result.count} files`);
      return result.files;
    } catch (error) {
      console.error(`[BlobServiceElectron] ❌ List failed:`, error);
      throw error;
    }
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
  static async downloadFile(
    fileId: string,
    fileName: string,
    business: 'packaging' | 'trucking' | 'general-trading' = 'packaging'
  ): Promise<void> {
    try {
      console.log(`[BlobServiceElectron] ⬇️ Downloading: ${fileId}`);
      const url = this.getDownloadUrl(fileId, business);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log(`[BlobServiceElectron] ✅ Download started: ${fileId}`);
    } catch (error) {
      console.error(`[BlobServiceElectron] ❌ Download failed:`, error);
      throw error;
    }
  }

  /**
   * Open file in new tab
   */
  static openFile(
    fileId: string,
    business: 'packaging' | 'trucking' | 'general-trading' = 'packaging'
  ): void {
    try {
      const url = this.getDownloadUrl(fileId, business);
      window.open(url, '_blank');
    } catch (error) {
      console.error(`[BlobServiceElectron] ❌ Open file failed:`, error);
      throw error;
    }
  }

  /**
   * Get embed URL for PDF preview
   */
  static getEmbedUrl(
    fileId: string,
    business: 'packaging' | 'trucking' | 'general-trading' = 'packaging'
  ): string {
    const downloadUrl = this.getDownloadUrl(fileId, business);
    return `https://docs.google.com/gview?url=${encodeURIComponent(downloadUrl)}&embedded=true`;
  }

  /**
   * Get preview URL for images
   */
  static getPreviewUrl(
    fileId: string,
    mimeType: string,
    business: 'packaging' | 'trucking' | 'general-trading' = 'packaging'
  ): string {
    if (mimeType.startsWith('image/')) {
      return this.getDownloadUrl(fileId, business);
    }
    if (mimeType === 'application/pdf') {
      return this.getEmbedUrl(fileId, business);
    }
    return this.getDownloadUrl(fileId, business);
  }
}

export default BlobServiceElectron;
