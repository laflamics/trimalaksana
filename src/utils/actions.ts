// Utility functions for common actions across modules
import { useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Browser } from '@capacitor/browser';

// Platform detection utility
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).electronAPI;
};

export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  // Check if running in Capacitor (mobile)
  const capacitor = (window as any).Capacitor;
  if (capacitor) return true;
  // Fallback: check user agent
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const isCapacitor = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).Capacitor;
};

export const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  // Simple notification - can be enhanced with toast library
  console.log(`[${type.toUpperCase()}] ${message}`);
  // TODO: Implement toast notification UI
  // Note: alert() removed - use custom dialog in components instead
};

export const handleEdit = (item: any, setEditingItem: (item: any) => void, setShowForm: (show: boolean) => void) => {
  setEditingItem(item);
  setShowForm(true);
};

export const handleDelete = async (
  item: any,
  items: any[],
  setItems: (items: any[]) => void,
  storageKey: string,
  storageService: any,
  itemName: string = 'item',
  showConfirm: (message: string, onConfirm: () => void, onCancel?: () => void, title?: string) => void
) => {
  showConfirm(
    `Are you sure you want to delete this ${itemName}? This action cannot be undone.`,
    async () => {
      try {
        const updated = items.filter(i => i.id !== item.id);
        await storageService.set(storageKey, updated);
        setItems(updated);
        showNotification(`${itemName} deleted successfully`, 'success');
      } catch (error: any) {
        showNotification(`Failed to delete ${itemName}: ${error.message}`, 'error');
      }
    },
    undefined,
    'Confirm Delete'
  );
};

export const handleImportExcel = () => {
  // Custom Dialog state
  const [dialogState, setDialogState] = useState<{
    show: boolean;
    type: 'alert' | 'confirm' | null;
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    show: false,
    type: null,
    title: '',
    message: '',
  });

  // Helper functions untuk dialog
  const showAlert = (message: string, title: string = 'Information') => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(true);
    }
    setDialogState({
      show: true,
      type: 'alert',
      title,
      message,
    });
  };

  const showConfirm = (message: string, onConfirm: () => void, onCancel?: () => void, title: string = 'Confirmation') => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(true);
    }
    setDialogState({
      show: true,
      type: 'confirm',
      title,
      message,
      onConfirm,
      onCancel,
    });
  };

  const closeDialog = () => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(false);
    }
    setDialogState({
      show: false,
      type: null,
      title: '',
      message: '',
    });
  };

  // Create file input
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx,.xls,.csv';
  input.onchange = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      showNotification(`Importing ${file.name}...`, 'info');
      // TODO: Implement Excel import logic
      // This would require xlsx library in frontend or IPC call to main process
    }
  };
  input.click();
};

export const focusAppWindow = () => {
  if (typeof window === 'undefined') return;
  try {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.focusMainWindow) {
      electronAPI.focusMainWindow();
    } else {
      window.focus();
    }
  } catch (error) {
    console.warn('Unable to focus main window:', error);
  }
};

interface PrintWindowOptions {
  autoPrint?: boolean;
  fallbackTimeoutMs?: number;
  onClose?: () => void;
  onBlocked?: (message: string) => void;
  blockedMessage?: string;
}

export const openPrintWindow = (
  htmlContent: string,
  options: PrintWindowOptions = {}
) => {
  if (typeof window === 'undefined') {
    console.warn('openPrintWindow called outside browser context');
    return null;
  }

  const {
    autoPrint = true,
    fallbackTimeoutMs = 30 * 1000,
    onClose,
    onBlocked,
    blockedMessage = 'Popup diblokir browser. Tolong izinkan popup untuk preview.',
  } = options;

  // Untuk mode preview tanpa auto print, tetap pakai window baru supaya user bisa baca dengan nyaman.
  if (!autoPrint) {
    const previewWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!previewWindow) {
      if (onBlocked) {
        onBlocked(blockedMessage);
      } else {
        // Note: alert() removed - use custom dialog in components instead
        console.warn(blockedMessage);
      }
      return null;
    }
    previewWindow.document.open();
    previewWindow.document.write(htmlContent);
    previewWindow.document.close();
    return previewWindow;
  }

  // Mode autoPrint: pakai hidden iframe supaya gak nge-lock focus di Electron.
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.setAttribute('sandbox', 'allow-modals allow-same-origin');
  document.body.appendChild(iframe);

  let fallbackTimer: number | null = null;
  let afterPrintHandler: (() => void) | null = null;
  let cleaned = false;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;

    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }

    if (afterPrintHandler && iframe.contentWindow) {
      try {
        iframe.contentWindow.removeEventListener('afterprint', afterPrintHandler);
      } catch (error) {
        console.warn('Gagal remove afterprint handler', error);
      }
      afterPrintHandler = null;
    }

    try {
      iframe.remove();
    } catch (error) {
      console.warn('Gagal hapus iframe print', error);
    }

    try {
      window.focus();
    } catch (error) {
      console.warn('Gagal balikin fokus ke window utama', error);
    }

    onClose?.();
  };

  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      throw new Error('Tidak bisa akses dokumen iframe');
    }
    doc.open();
    doc.write(htmlContent);
    doc.close();
  } catch (error) {
    console.error('Gagal nulis konten print', error);
    cleanup();
    return null;
  }

  const triggerPrint = () => {
    const targetWindow = iframe.contentWindow;
    if (!targetWindow) {
      cleanup();
      return;
    }

    afterPrintHandler = () => cleanup();
    try {
      targetWindow.addEventListener('afterprint', afterPrintHandler);
    } catch {
      (targetWindow as any).onafterprint = afterPrintHandler;
    }

    fallbackTimer = window.setTimeout(() => {
      cleanup();
    }, fallbackTimeoutMs);

    try {
      targetWindow.focus();
      targetWindow.print();
    } catch (error) {
      console.error('Gagal nge-trigger print dialog', error);
      cleanup();
      return;
    }

    // Beberapa environment (Electron) nggak pernah nembak afterprint, jadi kasih fallback cepat.
    window.setTimeout(() => {
      cleanup();
    }, 1500);
  };

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (doc?.readyState === 'complete') {
    setTimeout(triggerPrint, 0);
  } else {
    iframe.onload = () => triggerPrint();
  }

  return iframe;
};

export const handlePrint = (data: any, title: string = 'Document') => {
  const html = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      </body>
    </html>
  `;
  openPrintWindow(html);
};

export const handleUpdateStatus = async (
  item: any,
  newStatus: string,
  items: any[],
  setItems: (items: any[]) => void,
  storageKey: string,
  storageService: any
) => {
  try {
    const updated = items.map(i =>
      i.id === item.id ? { ...i, status: newStatus, updatedAt: new Date().toISOString() } : i
    );
    await storageService.set(storageKey, updated);
    setItems(updated);
    showNotification(`Status updated to ${newStatus}`, 'success');
  } catch (error: any) {
    showNotification(`Failed to update status: ${error.message}`, 'error');
  }
};

// Helper function untuk save/share PDF di mobile
// Helper untuk check mobile update dari server
export const checkMobileUpdate = async (
  currentVersion: string,
  storageService: any
): Promise<{ available: boolean; version: string | null; message: string }> => {
  try {
    const config = storageService.getConfig();
    const serverUrl = config.serverUrl || 'server-tljp.tail75a421.ts.net';
    // Use https for Tailscale funnel, http for others
    const isTailscaleFunnel = serverUrl.includes('.ts.net') || serverUrl.includes('tailscale') || serverUrl.includes('tail');
    const protocol = isTailscaleFunnel ? 'https' : 'http';
    const baseUrl = serverUrl.startsWith('http') ? serverUrl : `${protocol}://${serverUrl}`;
    const baseUrlClean = baseUrl.replace(/:\d+$/, '');
    
    const updateUrl = `${baseUrlClean}/api/updates/latest.yml`;
    const response = await fetch(updateUrl);
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    
    const ymlContent = await response.text();
    const versionMatch = ymlContent.match(/version:\s*(.+)/);
    const serverVersion = versionMatch ? versionMatch[1].trim() : null;
    
    if (!serverVersion) {
      throw new Error('Version not found in update info');
    }
    
    // Compare versions (simple string comparison)
    if (serverVersion !== currentVersion) {
      return {
        available: true,
        version: serverVersion,
        message: `Update available: v${serverVersion}`
      };
    }
    
    return {
      available: false,
      version: serverVersion,
      message: 'You are using the latest version'
    };
  } catch (error: any) {
    return {
      available: false,
      version: null,
      message: `Failed to check for updates: ${error.message}`
    };
  }
};

// Helper untuk download mobile APK dengan progress tracking dan save ke Downloads folder
export const downloadMobileAPK = async (
  serverUrl: string,
  apkFile: string,
  onProgress?: (percent: number, message: string) => void
): Promise<{ filePath: string; fileUri: string }> => {
  try {
    onProgress?.(5, 'Connecting to server...');
    
    const apkUrl = `${serverUrl}/api/updates/${apkFile}`;
    const response = await fetch(apkUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download APK: ${response.status} ${response.statusText}`);
    }
    
    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
    onProgress?.(10, `Downloading ${apkFile} (${(contentLength / 1024 / 1024).toFixed(2)} MB)...`);
    
    // Mobile: Save langsung ke Downloads folder menggunakan Capacitor Filesystem
    if (isCapacitor()) {
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to read response stream');
      }
      
      // Stream langsung ke file (tidak load semua ke memory)
      const chunks: Uint8Array[] = [];
      let receivedLength = 0;
      const chunkSize = 1024 * 64; // 64KB chunks untuk optimasi
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunks.push(value);
        receivedLength += value.length;
        
        // Update progress (10% to 85% for download)
        if (contentLength > 0) {
          const downloadPercent = Math.round((receivedLength / contentLength) * 75); // 75% of total (10% to 85%)
          const totalPercent = 10 + downloadPercent;
          onProgress?.(totalPercent, `Downloading... ${totalPercent}% (${(receivedLength / 1024 / 1024).toFixed(2)} MB / ${(contentLength / 1024 / 1024).toFixed(2)} MB)`);
        } else {
          onProgress?.(50, `Downloading... ${(receivedLength / 1024 / 1024).toFixed(2)} MB`);
        }
      }
      
      onProgress?.(85, 'Saving APK to Downloads folder...');
      
      // Convert chunks ke base64 untuk Filesystem API
      const allChunks = new Uint8Array(receivedLength);
      let offset = 0;
      for (const chunk of chunks) {
        allChunks.set(chunk, offset);
        offset += chunk.length;
      }
      
      // Convert to base64
      const base64Data = btoa(String.fromCharCode(...allChunks));
      
      // Save ke Downloads folder
      const downloadsPath = `Download/${apkFile}`;
      const result = await Filesystem.writeFile({
        path: downloadsPath,
        data: base64Data,
        directory: Directory.ExternalStorage,
        recursive: true
      });
      
      onProgress?.(95, 'APK saved successfully');
      
      // Get file URI untuk trigger install
      const fileUri = result.uri;
      
      onProgress?.(98, 'Opening install dialog...');
      
      // Trigger install intent untuk Android
      try {
        // Method 1: Try Share plugin untuk trigger install (akan muncul dialog install)
        await Share.share({
          title: 'Install APK',
          text: `Install ${apkFile}`,
          url: fileUri,
          dialogTitle: 'Install APK'
        });
      } catch (shareError) {
        // Method 2: Fallback - Try Browser.open dengan file:// URI
        try {
          await Browser.open({ url: fileUri });
        } catch (browserError) {
          // Method 3: Fallback - Open Downloads folder di file manager
          try {
            // Try to open Downloads folder
            const downloadsUri = 'content://com.android.externalstorage.documents/document/primary%3ADownload';
            await Browser.open({ url: downloadsUri });
          } catch (fmError) {
            // If all fail, user can manually open Downloads folder
          }
        }
      }
      
      onProgress?.(100, 'Download complete');
      
      return {
        filePath: downloadsPath,
        fileUri: fileUri
      };
    }
    
    // Desktop/Web: Fallback ke method lama
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to read response stream');
    }
    
    const chunks: Uint8Array[] = [];
    let receivedLength = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      chunks.push(value);
      receivedLength += value.length;
      
      if (contentLength > 0) {
        const downloadPercent = Math.round((receivedLength / contentLength) * 75);
        const totalPercent = 10 + downloadPercent;
        onProgress?.(totalPercent, `Downloading... ${totalPercent}% (${(receivedLength / 1024 / 1024).toFixed(2)} MB / ${(contentLength / 1024 / 1024).toFixed(2)} MB)`);
      } else {
        onProgress?.(50, `Downloading... ${(receivedLength / 1024 / 1024).toFixed(2)} MB`);
      }
    }
    
    onProgress?.(95, 'Preparing APK file...');
    
    const blob = new Blob(chunks as BlobPart[], { type: 'application/vnd.android.package-archive' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = apkFile;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
    onProgress?.(100, 'Download complete');
    
    return {
      filePath: apkFile,
      fileUri: url
    };
  } catch (error: any) {
    throw error;
  }
};

// Helper untuk get APK filename dari latest-android.yml atau latest.yml
export const getAPKFileName = async (serverUrl: string): Promise<string> => {
  // Cek latest-android.yml dulu (untuk mobile)
  try {
    const androidUpdateUrl = `${serverUrl}/api/updates/latest-android.yml`;
    const androidResponse = await fetch(androidUpdateUrl);
    
    if (androidResponse.ok) {
      const ymlContent = await androidResponse.text();
      
      // Parse APK filename from YAML
      const apkMatch = ymlContent.match(/url:\s*([^\n]+\.apk)/);
      if (apkMatch) {
        return apkMatch[1].trim();
      }
      
      // Fallback: try to find any .apk file
      const filesMatch = ymlContent.match(/- url:\s*([^\n]+)/g);
      if (filesMatch) {
        for (const match of filesMatch) {
          if (match.includes('.apk')) {
            return match.replace(/- url:\s*/, '').trim();
          }
        }
      }
    }
  } catch (error) {
    // Fallback ke latest.yml jika latest-android.yml tidak ada
  }
  
  // Fallback: cek latest.yml (untuk kompatibilitas)
  const updateUrl = `${serverUrl}/api/updates/latest.yml`;
  const response = await fetch(updateUrl);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch update info: ${response.status}`);
  }
  
  const ymlContent = await response.text();
  
  // Parse APK filename from YAML
  const apkMatch = ymlContent.match(/url:\s*([^\n]+\.apk)/);
  if (apkMatch) {
    return apkMatch[1].trim();
  }
  
  // Fallback: try to find any .apk file
  const filesMatch = ymlContent.match(/- url:\s*([^\n]+)/g);
  if (filesMatch) {
    for (const match of filesMatch) {
      if (match.includes('.apk')) {
        return match.replace(/- url:\s*/, '').trim();
      }
    }
  }
  
  throw new Error('APK file not found in update info');
};

export const savePdfForMobile = async (
  htmlContent: string,
  fileName: string,
  onSuccess?: (message: string) => void,
  onError?: (message: string) => void
): Promise<void> => {
  try {
    if (isMobile() || isCapacitor()) {
      // Mobile: Save HTML file ke Documents folder di HP
      // User bisa buka file tersebut dan print sendiri
      
      const htmlFileName = fileName.endsWith('.pdf') ? fileName.replace('.pdf', '.html') : `${fileName}.html`;
      
      // Buat HTML lengkap dengan print styling
      const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileName}</title>
  <style>
    @page {
      size: A4;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      background: #fff;
    }
    body {
      font-family: Arial, sans-serif;
    }
    @media print {
      @page {
        size: A4;
        margin: 10mm;
      }
      body {
        margin: 0;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;
      
      try {
        // Convert HTML ke base64
        const base64Data = btoa(unescape(encodeURIComponent(fullHtml)));
        
        // Buat temporary file di Documents folder dulu
        const tempPath = `temp_${Date.now()}_${htmlFileName}`;
        await Filesystem.writeFile({
          path: tempPath,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true
        });
        
        // Baca file untuk share
        const fileData = await Filesystem.readFile({
          path: tempPath,
          directory: Directory.Documents
        });
        
        // Convert base64 ke blob untuk share
        const byteCharacters = atob(fileData.data as string);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'text/html' });
        const file = new File([blob], htmlFileName, { type: 'text/html' });
        
        // Trigger share - user akan pilih lokasi save
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: fileName,
            text: 'Simpan dokumen HTML'
          });
          
          // Cleanup temp file setelah share
          try {
            await Filesystem.deleteFile({
              path: tempPath,
              directory: Directory.Documents
            });
          } catch (e) {
            // Ignore cleanup error
          }
          
          onSuccess?.('File berhasil di-save. View akan ditutup.');
        } else {
          // Fallback: save ke Documents folder
          const result = await Filesystem.writeFile({
            path: htmlFileName,
            data: base64Data,
            directory: Directory.Documents,
            recursive: true
          });
          
          // Cleanup temp file
          try {
            await Filesystem.deleteFile({
              path: tempPath,
              directory: Directory.Documents
            });
          } catch (e) {
            // Ignore cleanup error
          }
          
          onSuccess?.(`File HTML berhasil disimpan ke:\n${result.uri}\n\nView akan ditutup.`);
        }
      } catch (fsError: any) {
        // Jika Filesystem gagal, coba share langsung via Web Share API
        try {
          const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
          const file = new File([blob], htmlFileName, { type: 'text/html' });
          
          if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: fileName,
              text: 'Simpan dokumen HTML'
            });
            onSuccess?.('File berhasil di-save. View akan ditutup.');
          } else {
            // Fallback: download via blob
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = htmlFileName;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }, 1000);
            onSuccess?.('File HTML ter-download. View akan ditutup.');
          }
        } catch (downloadError: any) {
          onError?.(`Gagal save file: ${fsError.message || downloadError.message}`);
        }
      }
    } else {
      // Desktop browser: Download sebagai HTML
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      onSuccess?.('PDF berhasil di-download');
    }
  } catch (error: any) {
    onError?.(`Gagal save PDF: ${error.message}`);
  }
};
