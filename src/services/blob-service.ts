/**
 * Blob Service - Hybrid Storage (Smart Wrapper)
 * 
 * Architecture:
 * - Web app: Uses BlobServiceWeb (Vercel Blob)
 * - Electron app: Uses BlobServiceElectron (MinIO)
 * - Smart detection for optimal storage backend
 * 
 * This file is a wrapper that delegates to the appropriate service
 * based on the runtime environment
 */

import BlobServiceWeb from './blob-service-web';
import BlobServiceElectron from './blob-service-electron';

export interface BlobUploadResult {
  success: boolean;
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  storage: 'vercel' | 'minio';
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

export class BlobService {
  /**
   * Detect if running in Electron app
   * CRITICAL: Check for Electron-specific APIs that don't exist in browser
   */
  private static isElectronApp(): boolean {
    try {
      // Check 1: window.electron.ipcRenderer (preload script injection)
      if ((window as any).electron?.ipcRenderer) {
        console.log('[BlobService] ✅ Detected Electron via ipcRenderer');
        return true;
      }
      
      // Check 2: process.type === 'renderer' AND process.versions.electron
      if (typeof (window as any).process !== 'undefined') {
        const proc = (window as any).process;
        if (proc.type === 'renderer' && proc.versions?.electron) {
          console.log('[BlobService] ✅ Detected Electron via process.type');
          return true;
        }
      }
      
      // Check 3: __dirname or __filename (Electron/Node.js globals)
      if (typeof (window as any).__dirname !== 'undefined' || typeof (window as any).__filename !== 'undefined') {
        console.log('[BlobService] ✅ Detected Electron via __dirname/__filename');
        return true;
      }
      
      // Check 4: file:// protocol (Electron loads from file system)
      if (window.location.protocol === 'file:') {
        console.log('[BlobService] ✅ Detected Electron via file:// protocol');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[BlobService] Error detecting Electron:', error);
      return false;
    }
  }

  /**
   * Detect if running in Capacitor app
   */
  private static isCapacitorApp(): boolean {
    try {
      return !!(window as any).Capacitor && 
             typeof (window as any).Capacitor.isNativePlatform === 'function' &&
             (window as any).Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  }

  /**
   * Get appropriate service based on runtime
   */
  private static getService() {
    if (this.isElectronApp()) {
      console.log('[BlobService] 🔗 Using BlobServiceElectron (MinIO)');
      return BlobServiceElectron;
    }
    console.log('[BlobService] 🔗 Using BlobServiceWeb (Vercel Blob)');
    return BlobServiceWeb;
  }

  /**
   * Upload file - delegates to appropriate service
   */
  static async uploadFile(
    file: File,
    business: 'packaging' | 'trucking' | 'general-trading' = 'packaging'
  ): Promise<BlobUploadResult> {
    const service = this.getService();
    return service.uploadFile(file, business);
  }

  /**
   * Get download URL - delegates to appropriate service
   */
  static getDownloadUrl(
    fileId: string,
    business: 'packaging' | 'trucking' | 'general-trading' = 'packaging'
  ): string {
    const service = this.getService();
    if (this.isElectronApp()) {
      return BlobServiceElectron.getDownloadUrl(fileId, business);
    }
    return BlobServiceWeb.getDownloadUrl(fileId);
  }

  /**
   * Delete file - delegates to appropriate service
   */
  static async deleteFile(
    fileId: string,
    business: 'packaging' | 'trucking' | 'general-trading' = 'packaging'
  ): Promise<void> {
    const service = this.getService();
    if (this.isElectronApp()) {
      return BlobServiceElectron.deleteFile(fileId, business);
    }
    return BlobServiceWeb.deleteFile(fileId);
  }

  /**
   * Get file metadata - delegates to appropriate service
   */
  static async getMetadata(fileId: string): Promise<BlobMetadata> {
    if (this.isElectronApp()) {
      return BlobServiceElectron.getMetadata(fileId);
    }
    throw new Error('Metadata retrieval not supported in web mode');
  }

  /**
   * List files - delegates to appropriate service
   */
  static async listFiles(
    business: 'packaging' | 'trucking' | 'general-trading' = 'packaging'
  ): Promise<BlobMetadata[]> {
    if (this.isElectronApp()) {
      return BlobServiceElectron.listFiles(business);
    }
    throw new Error('File listing not supported in web mode');
  }

  /**
   * Convert file to data URL
   */
  static async fileToDataUrl(file: File): Promise<string> {
    const service = this.getService();
    if (this.isElectronApp()) {
      return BlobServiceElectron.fileToDataUrl(file);
    }
    return BlobServiceWeb.fileToDataUrl(file);
  }

  /**
   * Validate file before upload
   */
  static validateFile(
    file: File,
    maxSizeMB: number = 50,
    allowedTypes: string[] = ['image/*', 'application/pdf']
  ): { valid: boolean; error?: string } {
    const service = this.getService();
    if (this.isElectronApp()) {
      return BlobServiceElectron.validateFile(file, maxSizeMB, allowedTypes);
    }
    return BlobServiceWeb.validateFile(file, maxSizeMB, allowedTypes);
  }

  /**
   * Download file
   */
  static async downloadFile(
    fileId: string,
    fileName: string,
    business: 'packaging' | 'trucking' | 'general-trading' = 'packaging'
  ): Promise<void> {
    if (this.isElectronApp()) {
      return BlobServiceElectron.downloadFile(fileId, fileName, business);
    }
    return BlobServiceWeb.downloadFile(fileId, fileName);
  }

  /**
   * Open file in new tab
   */
  static openFile(
    fileId: string,
    business: 'packaging' | 'trucking' | 'general-trading' = 'packaging'
  ): void {
    if (this.isElectronApp()) {
      return BlobServiceElectron.openFile(fileId, business);
    }
    return BlobServiceWeb.openFile(fileId);
  }

  /**
   * Get embed URL for PDF preview
   */
  static getEmbedUrl(
    fileId: string,
    business: 'packaging' | 'trucking' | 'general-trading' = 'packaging'
  ): string {
    if (this.isElectronApp()) {
      return BlobServiceElectron.getEmbedUrl(fileId, business);
    }
    return BlobServiceWeb.getEmbedUrl(fileId);
  }

  /**
   * Get preview URL for images
   */
  static getPreviewUrl(
    fileId: string,
    mimeType: string,
    business: 'packaging' | 'trucking' | 'general-trading' = 'packaging'
  ): string {
    if (this.isElectronApp()) {
      return BlobServiceElectron.getPreviewUrl(fileId, mimeType, business);
    }
    return BlobServiceWeb.getPreviewUrl(fileId, mimeType);
  }
}

export default BlobService;
