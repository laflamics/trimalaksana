import { app, BrowserWindow, ipcMain, dialog, session, Certificate, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as http from 'http';
import * as fs from 'fs';
import { pathToFileURL } from 'url';

// Disable certificate verification for Tailscale funnel (self-signed certificates)
// This is safe because Tailscale funnel uses its own certificate chain
// Must be called BEFORE app is ready
// Note: This will suppress certificate errors but Chromium may still log warnings
app.commandLine.appendSwitch('ignore-certificate-errors');

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  console.log('Creating BrowserWindow...');
  console.log('__dirname:', __dirname);
  console.log('process.resourcesPath:', process.resourcesPath);
  console.log('app.isPackaged:', app.isPackaged);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  
  const preloadPath = path.join(__dirname, 'preload.js');
  console.log('preload path:', preloadPath);
  console.log('preload exists:', fs.existsSync(preloadPath));
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      // Allow insecure content for Tailscale funnel
      webSecurity: true, // Keep webSecurity enabled but handle cert errors
    },
    title: 'PT.Trima Laksana Jaya Pratama',
    titleBarStyle: 'default',
    backgroundColor: '#0a0a0a',
    show: true,
    icon: path.join(__dirname, '..', 'public', 'noxtiz.ico'), // Set app icon
  });

  // Handle certificate errors for Tailscale funnel
  mainWindow.webContents.on('certificate-error', (event, url, error, certificate, callback) => {
    // Allow certificate errors for Tailscale funnel (.ts.net domains)
    if (url.includes('.ts.net') || url.includes('tailscale') || url.includes('tail')) {
      console.log(`[Certificate] Allowing certificate error for Tailscale: ${url}`);
      event.preventDefault();
      callback(true); // Allow the certificate
    } else {
      // For other domains, use default behavior
      callback(false);
    }
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const viteDevServer = 'http://localhost:3000';
  
  if (isDev) {
    // Try to load from dev server, fallback to production build if not available
    console.log('Attempting to load from Vite dev server:', viteDevServer);
    
    // Check if dev server is running
    const checkDevServer = (): Promise<boolean> => {
      return new Promise((resolve) => {
        const req = http.get(viteDevServer, { timeout: 1000 }, (res) => {
          resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
      });
    };
    
    checkDevServer().then((serverAvailable) => {
      if (!mainWindow) return;
      
      if (serverAvailable) {
        console.log('Vite dev server available, loading from:', viteDevServer);
        mainWindow.loadURL(viteDevServer);
        mainWindow.webContents.once('did-finish-load', () => {
          console.log('URL loaded successfully');
          mainWindow?.webContents.openDevTools();
        });
        mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
          console.error('Failed to load URL:', errorCode, errorDescription);
          console.log('Falling back to production build...');
          if (mainWindow) {
            mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
          }
        });
      } else {
        console.log('Vite dev server not available, loading production build...');
        mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
      }
    });
  } else {
    // In production, main.js is in dist/, so renderer is at dist/renderer/
    console.log('Loading production build...');
    console.log('__dirname:', __dirname);
    const rendererPath = path.join(__dirname, 'renderer/index.html');
    console.log('Renderer path:', rendererPath);
    
    // Check if file exists
    if (fs.existsSync(rendererPath)) {
      console.log('Renderer file exists, loading...');
      mainWindow.loadFile(rendererPath).catch((error) => {
        console.error('Failed to load renderer:', error);
        mainWindow?.webContents.send('error', { message: 'Failed to load application', error: error.message });
      });
    } else {
      console.error('Renderer file not found at:', rendererPath);
      // Try alternative path
      const altPath = path.join(process.resourcesPath, 'app.asar', 'dist', 'renderer', 'index.html');
      console.log('Trying alternative path:', altPath);
      if (fs.existsSync(altPath)) {
        mainWindow.loadFile(altPath).catch((error) => {
          console.error('Failed to load from alternative path:', error);
        });
      } else {
        console.error('Renderer file not found in alternative path either');
        mainWindow?.webContents.send('error', { message: 'Application files not found' });
      }
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  mainWindow.on('ready-to-show', () => {
    console.log('Window ready to show');
    mainWindow?.show();
  });
  
  // Error handling
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', {
      errorCode,
      errorDescription,
      validatedURL,
      __dirname,
      isPackaged: app.isPackaged,
      resourcesPath: process.resourcesPath
    });
  });
  
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Render process gone:', details);
  });
  
  mainWindow.webContents.on('unresponsive', () => {
    console.error('Window unresponsive');
  });
  
  mainWindow.webContents.on('crashed', (event, killed) => {
    console.error('Window crashed, killed:', killed);
  });
}

// IPC Handlers
ipcMain.handle('read-json-file', async (event, filePath: string) => {
  try {
    const data = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading JSON file:', error);
    return null;
  }
});

// Get resource path for icons/images
ipcMain.handle('get-resource-path', async (event, fileName: string) => {
  try {
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    
    if (isDev) {
      // Development: public folder ada di project root
      const publicPath = path.join(__dirname, '..', 'public', fileName);
      if (fs.existsSync(publicPath)) {
        return pathToFileURL(publicPath).href;
      }
    } else {
      // Production: coba beberapa lokasi
      const paths = [
        path.join(__dirname, '..', 'renderer', fileName), // dist/renderer/
        path.join(__dirname, '..', 'public', fileName),  // dist/public/
        path.join(process.resourcesPath || app.getAppPath(), 'public', fileName), // resources/public/
        path.join(app.getAppPath(), 'public', fileName),  // app path/public/
      ];
      
      for (const resourcePath of paths) {
        if (fs.existsSync(resourcePath)) {
          return pathToFileURL(resourcePath).href;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting resource path:', error);
    return null;
  }
});

// Get resource as base64 (untuk icon/images yang perlu di-load di Electron)
ipcMain.handle('get-resource-base64', async (event, fileName: string) => {
  try {
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    let filePath: string | null = null;
    
    if (isDev) {
      // Development: public folder ada di project root
      const publicPath = path.join(__dirname, '..', 'public', fileName);
      if (fs.existsSync(publicPath)) {
        filePath = publicPath;
      }
    } else {
      // Production: coba beberapa lokasi
      const paths = [
        path.join(__dirname, '..', 'renderer', fileName), // dist/renderer/
        path.join(__dirname, '..', 'public', fileName),  // dist/public/
        path.join(process.resourcesPath || app.getAppPath(), 'public', fileName), // resources/public/
        path.join(app.getAppPath(), 'public', fileName),  // app path/public/
      ];
      
      for (const resourcePath of paths) {
        if (fs.existsSync(resourcePath)) {
          filePath = resourcePath;
          break;
        }
      }
    }
    
    if (filePath && fs.existsSync(filePath)) {
      // Read file as buffer dan convert ke base64
      const fileBuffer = await fs.promises.readFile(filePath);
      const base64 = fileBuffer.toString('base64');
      
      // Determine MIME type dari extension
      const ext = path.extname(fileName).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.ico': 'image/x-icon',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
      };
      const mimeType = mimeTypes[ext] || 'image/png';
      
      return `data:${mimeType};base64,${base64}`;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting resource as base64:', error);
    return null;
  }
});

// Read data bundle (for Seed 2)
ipcMain.handle('read-bundle-data', async () => {
  try {
    // Get bundle data directory
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    let bundleDir: string;
    
    if (isDev) {
      // Development: data-bundle folder is at project root
      bundleDir = path.join(__dirname, '..', 'data-bundle');
    } else {
      // Production: bundle data is in resources/data (from extraResources)
      bundleDir = path.join(process.resourcesPath || app.getAppPath(), 'data');
    }
    
    console.log('Reading bundle data from:', bundleDir);
    
    // Check if directory exists
    try {
      await fs.promises.access(bundleDir);
    } catch {
      console.warn(`Bundle directory not found at ${bundleDir}, trying alternative path...`);
      // Fallback to app path
      bundleDir = path.join(app.getAppPath(), 'data');
      try {
        await fs.promises.access(bundleDir);
      } catch {
        console.error('Bundle directory not found in any location');
        return {};
      }
    }
    
    // Read localStorage folder from bundle
    const localStorageDir = path.join(bundleDir, 'localStorage');
    const data: Record<string, any> = {};
    
    // Helper function to read directory recursively
    const readDirRecursive = async (dir: string, baseKey: string = ''): Promise<void> => {
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const key = baseKey ? `${baseKey}/${entry.name}` : entry.name;
          
          if (entry.isDirectory()) {
            await readDirRecursive(fullPath, key);
          } else if (entry.isFile() && entry.name.endsWith('.json')) {
            try {
              const content = await fs.promises.readFile(fullPath, 'utf8');
              const dataKey = key.replace('.json', '');
              data[dataKey] = JSON.parse(content);
              console.log(`✓ Loaded ${dataKey} from bundle: ${fullPath}`);
            } catch (error) {
              console.error(`Error reading ${entry.name}:`, error);
            }
          }
        }
      } catch (error) {
        console.warn(`Cannot read directory ${dir}:`, error);
      }
    };
    
    try {
      await fs.promises.access(localStorageDir);
      await readDirRecursive(localStorageDir);
    } catch {
      console.warn('localStorage folder not found in bundle, trying root bundle folder...');
      // Try root bundle folder
      const files = await fs.promises.readdir(bundleDir, { withFileTypes: true });
      const jsonFiles = files.filter(f => 
        f.isFile() && f.name.endsWith('.json')
      );
      
      for (const file of jsonFiles) {
        const key = file.name.replace('.json', '');
        const filePath = path.join(bundleDir, file.name);
        try {
          const content = await fs.promises.readFile(filePath, 'utf8');
          data[key] = JSON.parse(content);
          console.log(`✓ Loaded ${key} from bundle: ${filePath}`);
        } catch (error) {
          console.error(`Error reading ${file.name}:`, error);
        }
      }
    }
    
    console.log(`✅ Loaded ${Object.keys(data).length} data files from bundle`);
    return data;
  } catch (error) {
    console.error('Error reading bundle data:', error);
    return {};
  }
});

ipcMain.handle('read-data-files', async () => {
  try {
    // Get data directory - handle both dev and production (packaged) paths
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    let dataDir: string;
    
    if (isDev) {
      // Development: data folder is at project root
      dataDir = path.join(__dirname, '..', 'data');
    } else {
      // Production: data folder is in resources (electron-builder puts it there via extraResources)
      // Try resources/data first, fallback to app.getAppPath()/data
      dataDir = path.join(process.resourcesPath || app.getAppPath(), 'data');
    }
    
    console.log('Reading data files from:', dataDir);
    
    // Check if directory exists
    try {
      await fs.promises.access(dataDir);
    } catch {
      console.warn(`Data directory not found at ${dataDir}, trying alternative path...`);
      // Fallback to app path
      dataDir = path.join(app.getAppPath(), 'data');
      try {
        await fs.promises.access(dataDir);
      } catch {
        console.error('Data directory not found in any location');
        return {};
      }
    }
    
    // PRIORITY: Read root data/ folder FIRST (for gt_customers.json, gt_suppliers.json, etc.)
    // Then read localStorage folder (for existing data)
    const localStorageDir = path.join(dataDir, 'localStorage');
    const data: Record<string, any> = {};
    
    // Helper function to read directory recursively
    const readDirRecursive = async (dir: string, baseKey: string = ''): Promise<void> => {
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const key = baseKey ? `${baseKey}/${entry.name}` : entry.name;
          
          if (entry.isDirectory()) {
            await readDirRecursive(fullPath, key);
          } else if (entry.isFile() && entry.name.endsWith('.json')) {
            try {
              const content = await fs.promises.readFile(fullPath, 'utf8');
              const dataKey = key.replace('.json', '');
              // Only add if not already exists (root data/ folder has priority)
              if (!data[dataKey]) {
              data[dataKey] = JSON.parse(content);
              console.log(`✓ Loaded ${dataKey} from ${fullPath}`);
              } else {
                console.log(`⚠ Skipped ${dataKey} from ${fullPath} (already loaded from root data/)`);
              }
            } catch (error) {
              console.error(`Error reading ${entry.name}:`, error);
            }
          }
        }
      } catch (error) {
        // Directory doesn't exist or can't be read
        console.warn(`Cannot read directory ${dir}:`, error);
      }
    };
    
    // STEP 1: Read root data/ folder FIRST (priority for gt_customers.json, gt_suppliers.json)
    try {
      const files = await fs.promises.readdir(dataDir, { withFileTypes: true });
      const jsonFiles = files.filter(f => 
        f.isFile() && f.name.endsWith('.json')
      );
      
      for (const file of jsonFiles) {
        const key = file.name.replace('.json', '');
        const filePath = path.join(dataDir, file.name);
        try {
          const content = await fs.promises.readFile(filePath, 'utf8');
          data[key] = JSON.parse(content);
          console.log(`✓ Loaded ${key} from ${filePath} (ROOT - priority)`);
        } catch (error) {
          console.error(`Error reading ${file.name}:`, error);
        }
      }
    } catch (error) {
      console.warn('Cannot read root data folder:', error);
    }
    
    // STEP 2: Read localStorage folder (for existing data, but don't override root data/)
    try {
      await fs.promises.access(localStorageDir);
      await readDirRecursive(localStorageDir);
    } catch {
      // localStorage folder doesn't exist, that's okay
      console.log('localStorage folder not found, skipping...');
    }
    
    console.log(`✅ Loaded ${Object.keys(data).length} data files for seeding`);
    return data;
  } catch (error) {
    console.error('Error reading data files:', error);
    return {};
  }
});

// Save data to JSON file in data/ folder
ipcMain.handle('save-storage', async (event, key: string, value: any) => {
  try {
    // Skip BOM for GT (General Trading doesn't use BOM)
    if (key === 'bom' || key === 'gt_bom') {
      return { success: true, path: '', skipped: true };
    }
    
    // Determine directory based on key prefix
    let dataDir: string;
    if (key.startsWith('gt_')) {
      // GT data goes to general-trading subdirectory
      dataDir = path.join(__dirname, '..', 'data', 'localStorage', 'general-trading');
    } else {
      // Regular data goes to localStorage root
      dataDir = path.join(__dirname, '..', 'data', 'localStorage');
    }
    
    // Ensure directory exists (check if it's a file first)
    try {
      const stats = await fs.promises.stat(dataDir);
      if (!stats.isDirectory()) {
        // If it's a file, remove it and create directory
        console.warn(`Path ${dataDir} exists as file, removing and creating directory...`);
        await fs.promises.unlink(dataDir);
        await fs.promises.mkdir(dataDir, { recursive: true });
      }
    } catch {
      // Directory doesn't exist, create it
      await fs.promises.mkdir(dataDir, { recursive: true });
    }
    
    const filePath = path.join(dataDir, `${key}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
    
    return { success: true, path: filePath };
  } catch (error: any) {
    console.error(`Error saving ${key}:`, error);
    // If ENOTDIR error, try to fix the path issue
    if (error.code === 'ENOTDIR') {
      console.error(`ENOTDIR error for ${key}: Path conflict detected. Please check data/localStorage structure.`);
    }
    return { success: false, error: error.message };
  }
});

// Load data from JSON file in data/ folder
ipcMain.handle('load-storage', async (event, key: string) => {
  try {
    // Get data directory - handle both dev and production (packaged) paths
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    let dataDir: string;
    
    if (isDev) {
      // Development: data folder is at project root
      dataDir = path.join(__dirname, '..', 'data');
    } else {
      // Production: data folder is in resources (electron-builder puts it there via extraResources)
      // Try resources/data first, fallback to app.getAppPath()/data
      dataDir = path.join(process.resourcesPath || app.getAppPath(), 'data');
    }
    
    const filePath = path.join(dataDir, 'localStorage', `${key}.json`);
    
    // Check if file exists
    try {
      await fs.promises.access(filePath);
    } catch {
      // File doesn't exist, return null
      console.log(`[load-storage] File not found: ${filePath}`);
      return { success: true, data: null };
    }
    
    // Retry logic for file reading (handle file locks)
    let content: string;
    let retries = 3;
    let lastError: any = null;
    
    while (retries > 0) {
      try {
        content = await fs.promises.readFile(filePath, 'utf8');
        break; // Success, exit retry loop
      } catch (readError: any) {
        lastError = readError;
        if (readError.code === 'EBUSY' || readError.code === 'EAGAIN' || readError.message?.includes('locked')) {
          retries--;
          if (retries > 0) {
            const delay = 100 * (4 - retries); // 100ms, 200ms, 300ms
            console.log(`[load-storage] File locked for ${key}, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        throw readError; // Re-throw if not a lock error
      }
    }
    
    if (!content!) {
      throw lastError || new Error('Failed to read file after retries');
    }
    
    // Parse JSON with error handling
    let parsed: any;
    try {
      parsed = JSON.parse(content);
      // Handle wrapped format {value: [...]}
      if (parsed && typeof parsed === 'object' && parsed.value !== undefined) {
        parsed = parsed.value;
      }
    } catch (parseError: any) {
      console.error(`[load-storage] JSON parse error for ${key}:`, parseError);
      // Try to recover by reading file again (might be corrupted)
      try {
        content = await fs.promises.readFile(filePath, 'utf8');
        parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object' && parsed.value !== undefined) {
          parsed = parsed.value;
        }
      } catch (recoveryError) {
        console.error(`[load-storage] Recovery failed for ${key}:`, recoveryError);
        return { success: false, error: `JSON parse error: ${parseError.message}` };
      }
    }
    
    console.log(`[load-storage] Loaded ${key}: ${Array.isArray(parsed) ? parsed.length : 'object'} items from ${filePath}`);
    return { success: true, data: parsed };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return null (this is normal, don't log as error)
      return { success: true, data: null };
    }
    console.error(`[load-storage] Error loading ${key}:`, error);
    return { success: false, error: error.message };
  }
});

// Load all storage files
ipcMain.handle('load-all-storage', async () => {
  try {
    const dataDir = path.join(__dirname, '..', 'data', 'localStorage');
    await fs.promises.mkdir(dataDir, { recursive: true });
    
    const files = await fs.promises.readdir(dataDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const data: Record<string, any> = {};
    for (const file of jsonFiles) {
      const key = file.replace('.json', '');
      const filePath = path.join(dataDir, file);
      try {
        const content = await fs.promises.readFile(filePath, 'utf8');
        try {
          data[key] = JSON.parse(content);
        } catch (parseError: any) {
          console.error(`[WATCH] Error reading ${file}:`, parseError);
          // Try to fix corrupted JSON by removing trailing content after valid JSON
          try {
            // Find the last valid closing brace/bracket
            let lastValidIndex = content.lastIndexOf('}');
            if (lastValidIndex === -1) {
              lastValidIndex = content.lastIndexOf(']');
            }
            if (lastValidIndex > 0) {
              const cleanedContent = content.substring(0, lastValidIndex + 1);
              // Try to parse cleaned content
              const parsed = JSON.parse(cleanedContent);
              // If successful, save the cleaned version
              await fs.promises.writeFile(filePath, JSON.stringify(parsed, null, 2), 'utf8');
              console.log(`[WATCH] Fixed corrupted JSON in ${file}`);
              data[key] = parsed;
            } else {
              console.error(`[WATCH] Cannot fix ${file}: no valid JSON structure found`);
            }
          } catch (fixError) {
            console.error(`[WATCH] Failed to fix ${file}:`, fixError);
          }
        }
      } catch (error) {
        console.error(`[WATCH] Error reading file ${file}:`, error);
      }
    }
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Error loading all storage:', error);
    return { success: false, error: error.message };
  }
});

// Delete storage file
ipcMain.handle('delete-storage', async (event, key: string) => {
  try {
    const filePath = path.join(__dirname, '..', 'data', 'localStorage', `${key}.json`);
    await fs.promises.unlink(filePath);
    return { success: true };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return { success: true }; // File doesn't exist, consider it deleted
    }
    console.error(`Error deleting ${key}:`, error);
    return { success: false, error: error.message };
  }
});

// Save uploaded file (PDF/image) to file system and return path
ipcMain.handle('save-uploaded-file', async (event, fileData: string, fileName: string, fileType: 'pdf' | 'image') => {
  try {
    // Create uploads directory
    const uploadsDir = path.join(__dirname, '..', 'data', 'uploads');
    await fs.promises.mkdir(uploadsDir, { recursive: true });
    
    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileExtension = fileType === 'pdf' ? '.pdf' : (fileName.toLowerCase().endsWith('.png') ? '.png' : '.jpg');
    const uniqueFileName = `${timestamp}_${sanitizedFileName}${fileExtension}`;
    const filePath = path.join(uploadsDir, uniqueFileName);
    
    // Extract base64 data if it's a data URL
    let base64Data = fileData;
    if (fileData.includes(',')) {
      base64Data = fileData.split(',')[1];
    }
    
    // Convert base64 to buffer and save
    const buffer = Buffer.from(base64Data, 'base64');
    await fs.promises.writeFile(filePath, buffer);
    
    // Return relative path (will be used as reference)
    const relativePath = `uploads/${uniqueFileName}`;
    console.log(`[save-uploaded-file] Saved ${fileType} file: ${relativePath}`);
    
    return { success: true, path: relativePath, fullPath: filePath };
  } catch (error: any) {
    console.error(`[save-uploaded-file] Error saving file:`, error);
    return { success: false, error: error.message };
  }
});

// Load uploaded file from file system
ipcMain.handle('load-uploaded-file', async (event, filePath: string) => {
  try {
    // filePath is relative path like "uploads/filename.pdf"
    const fullPath = path.join(__dirname, '..', 'data', filePath);
    
    if (!fs.existsSync(fullPath)) {
      return { success: false, error: 'File not found' };
    }
    
    const buffer = await fs.promises.readFile(fullPath);
    const base64 = buffer.toString('base64');
    
    // Determine MIME type from extension
    const ext = path.extname(fullPath).toLowerCase();
    let mimeType = 'image/jpeg';
    if (ext === '.pdf') {
      mimeType = 'application/pdf';
    } else if (ext === '.png') {
      mimeType = 'image/png';
    }
    
    const dataUrl = `data:${mimeType};base64,${base64}`;
    
    return { success: true, data: dataUrl };
  } catch (error: any) {
    console.error(`[load-uploaded-file] Error loading file:`, error);
    return { success: false, error: error.message };
  }
});

// Open PDF viewer - buka dengan aplikasi default sistem (lebih reliable)
ipcMain.handle('open-pdf-viewer', async (event, fileData: string, fileName: string) => {
  try {
    // Extract base64 data
    const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Create temporary PDF file
    const tempDir = require('os').tmpdir();
    const sanitizedFileName = (fileName || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
    const tempPdfPath = path.join(tempDir, `pdf-viewer-${Date.now()}-${sanitizedFileName}.pdf`);
    
    // Write PDF file
    await fs.promises.writeFile(tempPdfPath, buffer);
    
    // Buka PDF dengan aplikasi default sistem (Adobe Reader, browser default, dll)
    // Ini lebih reliable karena tidak bergantung pada PDF viewer di Electron
    await shell.openPath(tempPdfPath);
    
    // Cleanup temp file setelah beberapa detik (memberi waktu untuk aplikasi membuka file)
    setTimeout(() => {
      try {
        if (fs.existsSync(tempPdfPath)) {
          // Coba hapus, jika gagal (masih digunakan), coba lagi nanti
          try {
            fs.unlinkSync(tempPdfPath);
          } catch (e) {
            // File masih digunakan, coba lagi setelah 30 detik
            setTimeout(() => {
              try {
                if (fs.existsSync(tempPdfPath)) {
                  fs.unlinkSync(tempPdfPath);
                }
              } catch (e2) {
                // Ignore - file mungkin masih digunakan oleh aplikasi PDF viewer
              }
            }, 30000);
          }
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    }, 2000);
    
    return { success: true };
  } catch (error: any) {
    console.error(`[open-pdf-viewer] Error opening PDF viewer:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('focus-main-window', async () => {
  try {
    if (!mainWindow) {
      return { success: false, error: 'Main window not available' };
    }

    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    mainWindow.show();

    const wasAlwaysOnTop = mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(true);
    mainWindow.focus();

    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setAlwaysOnTop(wasAlwaysOnTop);
      }
    }, 500);

    return { success: true };
  } catch (error: any) {
    console.error('Error focusing main window:', error);
    return { success: false, error: error.message };
  }
});

// Save PDF file with file picker
ipcMain.handle('save-pdf', async (event, htmlContent: string, defaultFileName: string, pageSize: string = 'A4') => {
  let pdfWindow: BrowserWindow | null = null;
  let tempHtmlPath: string | undefined = undefined;
  try {
    if (!mainWindow) {
      return { success: false, error: 'Main window not available' };
    }

    console.log('Starting PDF save process...');

    // Show save dialog first
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save PDF',
      defaultPath: defaultFileName.endsWith('.pdf') ? defaultFileName : defaultFileName.replace(/\.(html|htm)$/i, '.pdf'),
      filters: [
        { name: 'PDF Files', extensions: ['pdf'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true };
    }

    console.log('Save dialog confirmed, file path:', result.filePath);

    // Create temporary HTML file to avoid data URL length issues
    const tempDir = require('os').tmpdir();
    tempHtmlPath = path.join(tempDir, `pdf-temp-${Date.now()}.html`);
    await fs.promises.writeFile(tempHtmlPath, htmlContent, 'utf8');
    console.log('[WATCH] Temporary HTML file created:', tempHtmlPath);

    // Create a hidden BrowserWindow to render HTML and convert to PDF
    pdfWindow = new BrowserWindow({
      show: false,
      width: 1200,
      height: 1600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Load HTML content from temporary file
    console.log('[WATCH] Loading HTML content from file into hidden window...');
    
    // Wait for content to fully load and render
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log('[WATCH] Timeout reached, but continuing anyway...');
        resolve(); // Continue even if timeout
      }, 15000); // 15 second timeout

      let resolved = false;
      const doResolve = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        // Additional wait for images/styles to render
        setTimeout(() => {
          console.log('[WATCH] Content ready, proceeding to PDF generation...');
          resolve();
        }, 2000); // Wait time for rendering
      };

      // Try multiple events to catch when content is ready
      pdfWindow!.webContents.once('did-finish-load', () => {
        console.log('[WATCH] did-finish-load event fired');
        doResolve();
      });

      pdfWindow!.webContents.once('dom-ready', () => {
        console.log('[WATCH] dom-ready event fired');
        // Wait a bit more for styles/images
        setTimeout(() => doResolve(), 1000);
      });

      pdfWindow!.webContents.once('did-fail-load', (event, errorCode, errorDescription) => {
        console.log('[WATCH] did-fail-load event fired:', errorCode, errorDescription);
        clearTimeout(timeout);
        reject(new Error(`Failed to load content: ${errorDescription}`));
      });

      // Start loading from file
      if (!tempHtmlPath) {
        clearTimeout(timeout);
        reject(new Error('Temporary file path not available'));
        return;
      }
      // Use pathToFileURL to properly convert path to file:// URL
      const fileUrl = pathToFileURL(tempHtmlPath).href;
      console.log('[WATCH] Loading file URL:', fileUrl);
      pdfWindow!.loadURL(fileUrl).catch((err) => {
        console.log('[WATCH] loadURL error:', err);
        clearTimeout(timeout);
        reject(new Error(`Failed to load file: ${err.message}`));
      });
    });

    console.log('Content loaded, generating PDF...');

    // Map page size to Electron format
    // Supported: A4, A5, Letter, Legal, Tabloid, Ledger
    const validPageSizes = ['A4', 'A5', 'Letter', 'Legal', 'Tabloid', 'Ledger'];
    const selectedPageSize = validPageSizes.includes(pageSize) ? pageSize : 'A4';
    
    console.log(`Generating PDF with page size: ${selectedPageSize}`);

    // Generate PDF with selected page size
    const pdfData = await pdfWindow.webContents.printToPDF({
      pageSize: selectedPageSize as any,
      margins: {
        top: 0.4,
        bottom: 0.4,
        left: 0.2,
        right: 0.2,
      },
      printBackground: true,
      displayHeaderFooter: false,
    });

    console.log('PDF generated, saving to file...');

    // Close the hidden window
    pdfWindow.destroy();
    pdfWindow = null;

    // Save PDF file
    await fs.promises.writeFile(result.filePath, pdfData);
    console.log('PDF saved successfully to:', result.filePath);

    // Clean up temporary HTML file
    try {
      await fs.promises.unlink(tempHtmlPath);
      console.log('[WATCH] Temporary HTML file deleted');
    } catch (cleanupError) {
      console.warn('[WATCH] Failed to delete temporary file:', cleanupError);
    }

    return { success: true, path: result.filePath };
  } catch (error: any) {
    console.error('Error saving PDF:', error);
    if (pdfWindow) {
      pdfWindow.destroy();
    }
    // Clean up temporary HTML file on error
    try {
      if (typeof tempHtmlPath !== 'undefined') {
        await fs.promises.unlink(tempHtmlPath);
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    return { success: false, error: error.message || 'Unknown error' };
  }
});

// Export localStorage data to JSON files
ipcMain.handle('export-localstorage', async (event, data: Record<string, any>) => {
  try {
    const dataDir = path.join(__dirname, '..', 'data', 'localStorage');
    await fs.promises.mkdir(dataDir, { recursive: true });
    
    let exported = 0;
    const errors: string[] = [];
    
    for (const [key, value] of Object.entries(data)) {
      try {
        const filePath = path.join(dataDir, `${key}.json`);
        await fs.promises.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
        exported++;
        console.log(`✓ Exported ${key} to: ${filePath}`);
      } catch (error: any) {
        const errorMsg = `Failed to export ${key}: ${error.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
    
    return { 
      success: true, 
      exported, 
      errors: errors.length > 0 ? errors : undefined 
    };
  } catch (error: any) {
    console.error('Export error:', error);
    return { success: false, error: error.message };
  }
});

// Auto-updater configuration
autoUpdater.autoDownload = false; // Manual download
autoUpdater.autoInstallOnAppQuit = true; // Auto install on quit

// Set update server URL (only in production)
// Note: Don't set in development to avoid certificate errors
// Server URL akan di-set saat check-for-updates dipanggil (dari storage config)
if (app.isPackaged) {
  // Default server URL (akan di-override saat check-for-updates dengan server dari config)
  const defaultServerUrl = process.env.UPDATE_SERVER_URL || 
    process.env.SERVER_URL || 
    'https://server-tljp.tail75a421.ts.net';
  
  // Remove port from Tailscale URLs
  const cleanUrl = defaultServerUrl.replace(/:\d+$/, '');
  const isTailscale = cleanUrl.includes('.ts.net');
  const protocol = isTailscale ? 'https' : 'http';
  const baseUrl = cleanUrl.startsWith('http') ? cleanUrl : `${protocol}://${cleanUrl}`;
  
  // electron-updater will append /latest.yml to the feed URL
  // So we set it to /api/updates/ (without latest) so it becomes /api/updates/latest.yml
  const feedUrl = `${baseUrl}/api/updates/`;
  // Set feed URL with provider: generic
  // IMPORTANT: Set channel to 'latest' to avoid looking for app-update.yml locally
  // Note: URL ini akan di-update saat check-for-updates dengan server dari storage config
  autoUpdater.setFeedURL({ 
    provider: 'generic',
    url: feedUrl,
    channel: 'latest'
  });
  console.log(`[Auto-Updater] Initial update server: ${feedUrl}`);
  console.log(`[Auto-Updater] Will use server from storage config when checking for updates`);
  console.log(`[Auto-Updater] Certificate verification disabled for Tailscale funnel`);
  
  // Suppress local app-update.yml errors (file is on server, not local)
  autoUpdater.on('error', (error) => {
    if (error.message && (error.message.includes('app-update.yml') || error.message.includes('ENOENT'))) {
      console.log('[Auto-Updater] Ignoring local app-update.yml error (file is on server, this is normal)');
      return; // Suppress this error - it's expected behavior
    }
    // Log other errors normally
    console.error('[Auto-Updater] Error:', error);
  });
} else {
  // In development, don't set update server to avoid certificate errors
  console.log(`[Auto-Updater] Skipped in development mode`);
}

// Update event handlers
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
  if (mainWindow) {
    mainWindow.webContents.send('update-status', { status: 'checking', message: 'Checking for updates...' });
  }
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-status', { 
      status: 'available', 
      version: info.version,
      message: `Update available: v${info.version}` 
    });
  }
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available');
  if (mainWindow) {
    mainWindow.webContents.send('update-status', { 
      status: 'not-available', 
      message: 'You are using the latest version' 
    });
  }
});

autoUpdater.on('error', (err) => {
  // Suppress app-update.yml ENOENT errors (file is on server, not local - this is normal)
  if (err.message && (err.message.includes('app-update.yml') || err.message.includes('ENOENT'))) {
    console.log('[Auto-Updater] Ignoring app-update.yml local file error (file is on server, this is normal)');
    return; // Don't send error to UI - this is expected behavior
  }
  
  console.error('Error in auto-updater:', err);
  if (mainWindow) {
    mainWindow.webContents.send('update-status', { 
      status: 'error', 
      message: `Update error: ${err.message}` 
    });
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-progress', {
      percent: progressObj.percent,
      transferred: progressObj.transferred,
      total: progressObj.total
    });
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-status', { 
      status: 'downloaded', 
      version: info.version,
      message: 'Update downloaded. Restart to install.' 
    });
  }
});

// Helper function to get server URL from storage config
async function getServerUrlFromConfig(): Promise<string | null> {
  try {
    // Get data directory
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    const dataDir = isDev 
      ? path.join(__dirname, '..', 'data')
      : path.join(process.resourcesPath || app.getAppPath(), 'data');
    
    const configPath = path.join(dataDir, 'localStorage', 'storage_config.json');
    
    try {
      const configContent = await fs.promises.readFile(configPath, 'utf8');
      const config = JSON.parse(configContent);
      
      // Extract serverUrl from config (handle both wrapped and direct format)
      let serverUrl = null;
      if (config && typeof config === 'object') {
        if (config.value && config.value.serverUrl) {
          serverUrl = config.value.serverUrl;
        } else if (config.serverUrl) {
          serverUrl = config.serverUrl;
        }
      }
      
      if (serverUrl) {
        console.log(`[Auto-Updater] Found server URL from config: ${serverUrl}`);
        return serverUrl;
      }
    } catch (error: any) {
      // Config file doesn't exist or invalid, use default
      console.log(`[Auto-Updater] Config file not found or invalid, using default server URL`);
    }
  } catch (error: any) {
    console.log(`[Auto-Updater] Error reading config: ${error.message}`);
  }
  
  return null;
}

// IPC handlers for update
ipcMain.handle('check-for-updates', async () => {
  try {
    if (!app.isPackaged) {
      return { success: false, message: 'Updates only available in production' };
    }
    
    // Try to get server URL from storage config first, then fallback to env/default
    let updateServerUrl = await getServerUrlFromConfig();
    
    if (!updateServerUrl) {
      updateServerUrl = process.env.UPDATE_SERVER_URL || 
        process.env.SERVER_URL || 
        'https://server-tljp.tail75a421.ts.net';
    }
    
    // Normalize URL: remove port, handle protocol
    let cleanUrl = updateServerUrl.replace(/:\d+$/, '').replace(/^https?:\/\//, '');
    const isTailscale = cleanUrl.includes('.ts.net');
    const protocol = isTailscale ? 'https' : 'http';
    const baseUrl = `${protocol}://${cleanUrl}`;
    
    // electron-updater akan append /latest.yml ke feed URL
    // Jadi kita set ke /api/updates/ supaya jadi /api/updates/latest.yml
    const feedUrl = `${baseUrl}/api/updates/`;
    
    // Re-set feed URL to ensure it's correct
    autoUpdater.setFeedURL({ 
      provider: 'generic',
      url: feedUrl,
      channel: 'latest'
    });
    
    console.log(`[Auto-Updater] Checking for updates from: ${feedUrl}latest.yml`);
    
    // Check for updates
    const result = await autoUpdater.checkForUpdates();
    console.log(`[Auto-Updater] Check result:`, result);
    
    return { success: true, message: 'Checking for updates...' };
  } catch (error: any) {
    console.error('Error checking for updates:', error);
    // Ignore ENOENT errors for app-update.yml (it's normal, file is on server)
    if (error.message && (error.message.includes('app-update.yml') || error.message.includes('ENOENT'))) {
      console.log('[Auto-Updater] Ignoring app-update.yml local file error (file is on server, this is normal)');
      // Error handler sudah suppress error ini, jadi kita anggap success
      // electron-updater akan tetap check dari server meskipun ada error ini
      return { success: true, message: 'Checking for updates from server...' };
    }
    return { success: false, message: error.message };
  }
});

ipcMain.handle('download-update', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true, message: 'Downloading update...' };
  } catch (error: any) {
    console.error('Error downloading update:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('install-update', async () => {
  try {
    autoUpdater.quitAndInstall(false, true);
    return { success: true, message: 'Installing update...' };
  } catch (error: any) {
    console.error('Error installing update:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

app.whenReady().then(async () => {
  console.log('Electron app ready, creating window...');
  
  // Install React DevTools extension (only in development)
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    try {
      const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer');
      await installExtension(REACT_DEVELOPER_TOOLS)
        .then((name: string) => console.log(`✓ Installed React DevTools: ${name}`))
        .catch((err: Error) => console.log('⚠ Could not install React DevTools:', err.message));
    } catch (error: any) {
      console.log('⚠ Could not load electron-devtools-installer:', error?.message || error);
    }
  }
  
  // Handle certificate verification at session level (for all requests)
  // This suppresses certificate errors for Tailscale funnel
  session.defaultSession.setCertificateVerifyProc((request, callback) => {
    const { hostname } = request;
    // Allow certificate errors for Tailscale funnel (.ts.net domains)
    if (hostname.includes('.ts.net') || hostname.includes('tailscale') || hostname.includes('tail')) {
      // Suppress error logging for Tailscale - just allow it silently
      callback(0); // 0 = success, allow the certificate
    } else {
      // For other domains, use default verification
      callback(-2); // -2 = use default verification
    }
  });
  
  // Suppress console errors for certificate verification (Chromium internal logging)
  // This filters out the cert_verify_proc_builtin.cc errors that appear before our handler
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  console.error = (...args: any[]) => {
    const message = args.join(' ');
    // Filter out certificate verification errors for Tailscale
    if (message.includes('CertVerifyProcBuiltin') || 
        message.includes('cert_verify_proc') ||
        (message.includes('Certificate') && message.includes('.ts.net')) ||
        (message.includes('ERROR: No matching issuer found') && message.includes('.ts.net'))) {
      // Suppress this error - it's expected for Tailscale funnel
      return;
    }
    originalConsoleError.apply(console, args);
  };
  
  console.warn = (...args: any[]) => {
    const message = args.join(' ');
    // Filter out certificate warnings for Tailscale
    if (message.includes('CertVerifyProcBuiltin') || 
        message.includes('cert_verify_proc') ||
        (message.includes('Certificate') && message.includes('.ts.net'))) {
      // Suppress this warning - it's expected for Tailscale funnel
      return;
    }
    originalConsoleWarn.apply(console, args);
  };
  
  createWindow();
  console.log('Window created');

  // Check for updates after 5 seconds (only in production)
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(err => {
        console.log('Auto-update check failed (may not be configured):', err.message);
      });
    }, 5000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch((error) => {
  console.error('Error starting app:', error);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Auto-close saat ada installer yang jalan (untuk update)
// Check setiap 1 detik apakah ada installer NSIS yang running
if (app.isPackaged) {
  setInterval(() => {
    const { exec } = require('child_process');
    // Check apakah ada installer NSIS yang running
    exec('tasklist /FI "IMAGENAME eq *Setup*.exe" /FO CSV | findstr /I "PT.Trima Laksana Jaya Pratama"', (error: any, stdout: string) => {
      if (!error && stdout.includes('Setup')) {
        console.log('Installer detected, closing application automatically...');
        app.quit();
      }
    });
  }, 1000);
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

