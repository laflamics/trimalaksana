/// <reference types="vite/client" />

interface Window {
  electronAPI?: {
    platform: string;
    readJsonFile: (filePath: string) => Promise<any>;
    readDataFiles: () => Promise<any>;
    readBundleData: () => Promise<any>;
    exportLocalStorage: (data: Record<string, any>) => Promise<any>;
    saveStorage: (key: string, value: any) => Promise<any>;
    loadStorage: (key: string) => Promise<any>;
    loadAllStorage: () => Promise<any>;
    deleteStorage: (key: string) => Promise<any>;
    savePdf: (htmlContent: string, defaultFileName: string) => Promise<any>;
    focusMainWindow: () => Promise<any>;
    // Update API
    checkForUpdates?: () => Promise<any>;
    downloadUpdate?: () => Promise<any>;
    installUpdate?: () => Promise<any>;
    getAppVersion?: () => Promise<string>;
    onUpdateStatus?: (callback: (status: any) => void) => void;
    onUpdateProgress?: (callback: (progress: any) => void) => void;
  };
}

