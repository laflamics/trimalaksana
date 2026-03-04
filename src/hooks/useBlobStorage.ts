import { useState, useCallback } from 'react';

export type BusinessType = 'packaging' | 'trucking' | 'general-trading';

export interface FileReference {
  fileId: string;
  fileName: string;
  originalName: string;
  size: number;
  mimeType: string;
  business: BusinessType;
  uploadedAt: string;
  downloadUrl: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UseBlobStorageOptions {
  serverUrl?: string;
  business?: BusinessType;
}

/**
 * Hook untuk handle blob storage operations
 * 
 * Usage:
 * ```
 * const { upload, download, list, delete: deleteFile, uploading, error } = useBlobStorage({ business: 'packaging' });
 * 
 * // Upload
 * const fileRef = await upload(file);
 * 
 * // Download
 * const blob = await download(fileRef.fileId);
 * 
 * // List
 * const files = await list();
 * 
 * // Delete
 * await deleteFile(fileRef.fileId);
 * ```
 */
export const useBlobStorage = (options: UseBlobStorageOptions = {}) => {
  const serverUrl = options.serverUrl || 'https://server-tljp.tail75a421.ts.net:8888';
  const defaultBusiness = options.business || 'packaging';

  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  /**
   * Upload file to blob storage
   */
  const upload = useCallback(
    async (file: File, business: BusinessType = defaultBusiness): Promise<FileReference> => {
      setUploading(true);
      setError(null);
      setProgress(null);

      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[useBlobStorage] Attempt ${attempt}/${maxRetries}: Uploading file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
          console.log(`[useBlobStorage] Server URL: ${serverUrl}`);
          console.log(`[useBlobStorage] Business: ${business}`);
          
          const formData = new FormData();
          formData.append('file', file);

          const uploadUrl = `${serverUrl}/api/blob/upload?business=${business}`;
          console.log(`[useBlobStorage] Upload URL: ${uploadUrl}`);

          // Create abort controller with 60 second timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000);

          console.log(`[useBlobStorage] Sending fetch request...`);
          const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          console.log(`[useBlobStorage] ✅ Got response, status: ${response.status} ${response.statusText}`);

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[useBlobStorage] Error response:`, errorText);
            throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
          }

          const data = await response.json();
          console.log(`[useBlobStorage] Response data:`, data);

          if (!data.success) {
            throw new Error(data.error || 'Upload failed - server returned success: false');
          }

          console.log(`[useBlobStorage] ✅ Upload successful, fileId: ${data.fileId}`);
          setUploading(false);
          setProgress(null);
          return data as FileReference;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error('Unknown error');
          const message = lastError.message;
          console.error(`[useBlobStorage] ❌ Attempt ${attempt} error:`, message);
          
          // Check if error is retryable
          const isRetryable = message.includes('AbortError') || 
                             message.includes('timeout') || 
                             message.includes('Failed to fetch') ||
                             message.includes('NetworkError');
          
          if (isRetryable && attempt < maxRetries) {
            console.log(`[useBlobStorage] ⏳ Retrying in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          
          // Better error messages
          if (message.includes('AbortError')) {
            const finalMsg = 'Upload timeout - server tidak respond. Pastikan server running dan network stabil!';
            console.error(`[useBlobStorage] ${finalMsg}`);
            setError(finalMsg);
            setUploading(false);
            setProgress(null);
            throw new Error(finalMsg);
          }
          
          setError(message);
          // Don't throw yet, try next attempt if retryable
          if (!isRetryable || attempt === maxRetries) {
            setUploading(false);
            setProgress(null);
            throw lastError;
          }
        }
      }

      // All retries failed
      const finalMsg = `Upload failed after ${maxRetries} attempts: ${lastError?.message}`;
      console.error(`[useBlobStorage] ${finalMsg}`);
      setError(finalMsg);
      setUploading(false);
      setProgress(null);
      throw lastError || new Error(finalMsg);
    },
    [serverUrl, defaultBusiness]
  );

  /**
   * Download file from blob storage
   */
  const download = useCallback(
    async (fileId: string, business: BusinessType = defaultBusiness): Promise<Blob> => {
      setDownloading(true);
      setError(null);

      try {
        const response = await fetch(
          `${serverUrl}/api/blob/download/${business}/${fileId}`
        );

        if (!response.ok) {
          throw new Error(`Download failed: ${response.statusText}`);
        }

        return await response.blob();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      } finally {
        setDownloading(false);
      }
    },
    [serverUrl, defaultBusiness]
  );

  /**
   * Download and trigger browser download
   */
  const downloadFile = useCallback(
    async (fileId: string, fileName: string, business: BusinessType = defaultBusiness) => {
      try {
        const blob = await download(fileId, business);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Download error:', err);
        throw err;
      }
    },
    [download]
  );

  /**
   * List all files in a business folder
   */
  const list = useCallback(
    async (business: BusinessType = defaultBusiness) => {
      setError(null);

      try {
        const response = await fetch(`${serverUrl}/api/blob/list/${business}`);

        if (!response.ok) {
          throw new Error(`List failed: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'List failed');
        }

        return data.files || [];
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      }
    },
    [serverUrl, defaultBusiness]
  );

  /**
   * Delete file from blob storage
   */
  const deleteFile = useCallback(
    async (fileId: string, business: BusinessType = defaultBusiness): Promise<void> => {
      setError(null);

      try {
        const response = await fetch(
          `${serverUrl}/api/blob/delete/${business}/${fileId}`,
          { method: 'DELETE' }
        );

        if (!response.ok) {
          throw new Error(`Delete failed: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Delete failed');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      }
    },
    [serverUrl, defaultBusiness]
  );

  /**
   * Get download URL for a file
   */
  const getDownloadUrl = useCallback(
    (fileId: string, business: BusinessType = defaultBusiness): string => {
      return `${serverUrl}/api/blob/download/${business}/${fileId}`;
    },
    [serverUrl, defaultBusiness]
  );

  return {
    upload,
    download,
    downloadFile,
    list,
    delete: deleteFile,
    getDownloadUrl,
    uploading,
    downloading,
    error,
    progress,
  };
};

/**
 * Hook untuk handle multiple file uploads
 */
export const useBlobStorageMultiple = (options: UseBlobStorageOptions = {}) => {
  const blobStorage = useBlobStorage(options);
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, UploadProgress>>(new Map());

  const uploadMultiple = useCallback(
    async (files: File[], business?: BusinessType): Promise<FileReference[]> => {
      const results: FileReference[] = [];
      const errors: Error[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          setUploadingFiles((prev) => {
            const newMap = new Map(prev);
            newMap.set(file.name, { loaded: 0, total: file.size, percentage: 0 });
            return newMap;
          });

          const fileRef = await blobStorage.upload(file, business);
          results.push(fileRef);

          setUploadingFiles((prev) => {
            const newMap = new Map(prev);
            newMap.set(file.name, { loaded: file.size, total: file.size, percentage: 100 });
            return newMap;
          });
        } catch (err) {
          errors.push(err instanceof Error ? err : new Error('Unknown error'));
        }
      }

      if (errors.length > 0) {
        throw new Error(`${errors.length} file(s) failed to upload`);
      }

      return results;
    },
    [blobStorage]
  );

  return {
    ...blobStorage,
    uploadMultiple,
    uploadingFiles,
  };
};
