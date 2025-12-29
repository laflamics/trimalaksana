import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  readJsonFile: (filePath: string) => ipcRenderer.invoke('read-json-file', filePath),
  readDataFiles: () => ipcRenderer.invoke('read-data-files'),
  readBundleData: () => ipcRenderer.invoke('read-bundle-data'),
  exportLocalStorage: (data: Record<string, any>) => ipcRenderer.invoke('export-localstorage', data),
  // New file-based storage API
  saveStorage: (key: string, value: any) => ipcRenderer.invoke('save-storage', key, value),
  loadStorage: (key: string) => ipcRenderer.invoke('load-storage', key),
  loadAllStorage: () => ipcRenderer.invoke('load-all-storage'),
  deleteStorage: (key: string) => ipcRenderer.invoke('delete-storage', key),
  // Save PDF with file picker
  savePdf: (htmlContent: string, defaultFileName: string) => ipcRenderer.invoke('save-pdf', htmlContent, defaultFileName),
  focusMainWindow: () => ipcRenderer.invoke('focus-main-window'),
  // Update API
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onUpdateStatus: (callback: (status: any) => void) => {
    ipcRenderer.on('update-status', (_, status) => callback(status));
  },
  onUpdateProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('update-progress', (_, progress) => callback(progress));
  },
  // Get resource path for icons/images
  getResourcePath: (fileName: string) => ipcRenderer.invoke('get-resource-path', fileName),
  // Get resource as base64 (untuk icon/images yang perlu di-load di Electron)
  getResourceBase64: (fileName: string) => ipcRenderer.invoke('get-resource-base64', fileName),
  // Save uploaded file (PDF/image) to file system
  saveUploadedFile: (fileData: string, fileName: string, fileType: 'pdf' | 'image') => ipcRenderer.invoke('save-uploaded-file', fileData, fileName, fileType),
  // Load uploaded file from file system
  loadUploadedFile: (filePath: string) => ipcRenderer.invoke('load-uploaded-file', filePath),
  // Open PDF viewer in new window
  openPdfViewer: (fileData: string, fileName: string) => ipcRenderer.invoke('open-pdf-viewer', fileData, fileName),
});

