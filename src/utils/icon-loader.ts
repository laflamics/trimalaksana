/**
 * Icon Loader Utility
 * Helper function untuk mendapatkan path icon yang benar
 * untuk kompatibilitas antara development, production, dan Electron app
 */

/**
 * Get icon path yang kompatibel dengan Electron dan browser
 */
export function getIconPath(iconName: string = 'noxtiz.ico'): string {
  // Untuk browser, gunakan path relatif dari public folder
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    // Di Electron app, coba gunakan path yang benar
    // Di production Electron, public folder ada di dist/renderer/
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      // Development: gunakan path dari public folder
      return `/${iconName}`;
    } else {
      // Production: coba beberapa path
      // Di Electron packaged app, public folder biasanya di resources
      return `./${iconName}`;
    }
  }
  
  // Default: gunakan path dari public folder
  return `/${iconName}`;
}

/**
 * Get icon path dengan fallback untuk Electron
 */
export async function getIconPathAsync(iconName: string = 'noxtiz.ico'): Promise<string> {
  const electronAPI = (window as any).electronAPI;
  
  if (electronAPI) {
    // Di Electron app, coba beberapa path
    const paths = [
      `./${iconName}`,           // Relative path (production)
      `/${iconName}`,            // Public folder path
      `../${iconName}`,          // Parent directory
      `../../${iconName}`,       // Two levels up
    ];
    
    // Coba setiap path
    for (const iconPath of paths) {
      try {
        // Test jika path valid dengan membuat image element
        const img = new Image();
        img.src = iconPath;
        
        // Return path yang pertama kali berhasil
        return iconPath;
      } catch (error) {
        continue;
      }
    }
  }
  
  // Default: gunakan path dari public folder
  return `/${iconName}`;
}

/**
 * Load icon sebagai base64 untuk kompatibilitas maksimal
 */
export async function loadIconAsBase64(iconName: string = 'noxtiz.ico'): Promise<string | null> {
  const electronAPI = (window as any).electronAPI;
  
  // 🚀 OPTIMASI: Di Electron, gunakan getResourceBase64 untuk mendapatkan base64 langsung
  // Ini lebih reliable daripada menggunakan file:// path
  if (electronAPI && electronAPI.getResourceBase64) {
    try {
      const base64Icon = await electronAPI.getResourceBase64(iconName);
      if (base64Icon && base64Icon.startsWith('data:')) {
        return base64Icon;
      }
    } catch (error) {
      // Silent fail - akan gunakan fallback paths
    }
  }
  
  const paths: string[] = [];
  
  // Tambahkan fallback paths (prioritas: relative paths dari public folder)
  paths.push(
    `/${iconName}`,              // Public folder (browser & dev) - PRIORITAS TERTINGGI
    `./${iconName}`,             // Relative path (Electron production)
  );
  
  // Coba setiap path
  for (const iconPath of paths) {
    try {
      // Skip jika path adalah file:// atau absolute Windows path (E:/, C:/, etc)
      if (iconPath.startsWith('file://') || iconPath.match(/^[A-Z]:\\/) || iconPath.match(/^[A-Z]:\//)) {
        continue;
      }
      
      // Add timeout untuk prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
      
      const response = await fetch(iconPath, {
        method: 'GET',
        cache: 'no-cache',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const blob = await response.blob();
        
        if (!blob.type.startsWith('image/')) {
          continue;
        }
        
        // Convert ke base64
        const base64Icon = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            if (result && result.startsWith('data:')) {
              resolve(result);
            } else {
              reject(new Error('Invalid base64 result'));
            }
          };
          reader.onerror = () => reject(new Error('FileReader error'));
          reader.readAsDataURL(blob);
        });
        
        return base64Icon;
      }
    } catch (error: any) {
      // Silent fail - skip error logging untuk prevent noise
      // Skip jika error adalah AbortError (timeout) atau network error
      if (error.name === 'AbortError' || error.name === 'TypeError') {
        continue;
      }
      // Continue to next path
      continue;
    }
  }
  
  return null;
}

