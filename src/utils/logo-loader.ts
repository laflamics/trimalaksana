/**
 * Logo Loader Utility
 * Helper function untuk load logo dengan multiple fallback paths
 * untuk kompatibilitas antara development, production, dan Electron app
 */

const DEFAULT_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwN2JmZiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxPR088L3RleHQ+PC9zdmc+';

/**
 * Load logo dengan multiple fallback paths
 * Mencoba berbagai path untuk kompatibilitas development, production, dan Electron
 */
export async function loadLogoAsBase64(): Promise<string> {
  // List of possible logo paths (dalam urutan prioritas)
  const logoPaths = [
    '/noxtiz.png',           // Primary: noxtiz.png di public folder
    '/noxtiz.ico',           // Fallback 1: noxtiz.ico di public folder
    '/Logo.gif',             // Fallback 2: Logo.gif di public folder
    './noxtiz.png',          // Fallback 3: Relative path
    './noxtiz.ico',          // Fallback 4: Relative path
    './Logo.gif',            // Fallback 5: Relative path
    'public/noxtiz.png',     // Fallback 6: Explicit public path
    'public/noxtiz.ico',     // Fallback 7: Explicit public path
    'public/Logo.gif',       // Fallback 8: Explicit public path
  ];

  // 🚀 OPTIMASI: Di Electron, gunakan getResourceBase64 untuk mendapatkan base64 langsung
  // Ini lebih reliable daripada menggunakan file:// path
  const electronAPI = (window as any).electronAPI;
  if (electronAPI && electronAPI.getResourceBase64) {
    try {
      // Coba noxtiz.png dulu, lalu noxtiz.ico sebagai base64
      const base64Png = await electronAPI.getResourceBase64('noxtiz.png');
      if (base64Png && base64Png.startsWith('data:')) {
        return base64Png; // Return langsung jika berhasil
      }
      const base64Ico = await electronAPI.getResourceBase64('noxtiz.ico');
      if (base64Ico && base64Ico.startsWith('data:')) {
        return base64Ico; // Return langsung jika berhasil
      }
    } catch (error) {
      // Silent fail - akan gunakan fallback paths
    }
  }
  
  // Fallback: coba getResourcePath (tapi skip jika file://)
  if (electronAPI && electronAPI.getResourcePath) {
    try {
      // Coba noxtiz.png dulu, lalu noxtiz.ico
      const resourcePathPng = await electronAPI.getResourcePath('noxtiz.png');
      if (resourcePathPng && !resourcePathPng.startsWith('file://') && !resourcePathPng.match(/^[A-Z]:\\/) && !resourcePathPng.match(/^[A-Z]:\//)) {
        logoPaths.unshift(resourcePathPng); // Prioritas tertinggi untuk Electron (hanya jika path valid)
      }
      const resourcePathIco = await electronAPI.getResourcePath('noxtiz.ico');
      if (resourcePathIco && !resourcePathIco.startsWith('file://') && !resourcePathIco.match(/^[A-Z]:\\/) && !resourcePathIco.match(/^[A-Z]:\//)) {
        logoPaths.unshift(resourcePathIco); // Prioritas tertinggi untuk Electron (hanya jika path valid)
      }
    } catch (error) {
      // Silent fail - akan gunakan fallback paths
    }
  }

  // Coba setiap path secara berurutan
  for (const logoPath of logoPaths) {
    try {
      // Skip jika path adalah file:// atau absolute Windows path (E:/, C:/, etc)
      if (logoPath.startsWith('file://') || logoPath.match(/^[A-Z]:\\/) || logoPath.match(/^[A-Z]:\//)) {
        continue;
      }
      
      // Add timeout untuk prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
      
      const response = await fetch(logoPath, {
        method: 'GET',
        cache: 'no-cache', // Hindari cache issues
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const blob = await response.blob();
        
        // Validasi bahwa ini adalah image
        if (!blob.type.startsWith('image/')) {
          // Silent fail - skip logging untuk prevent noise
          continue;
        }

        // Convert ke base64
        const base64Logo = await new Promise<string>((resolve, reject) => {
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

        // Silent success - skip logging untuk prevent noise
        return base64Logo;
      }
      // Silent fail - skip logging untuk prevent noise
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

  // Jika semua path gagal, return placeholder (silent - tidak log error)
  return DEFAULT_PLACEHOLDER;
}

/**
 * Load logo dengan caching (optional)
 * Cache logo di memory untuk performa lebih baik
 */
let cachedLogo: string | null = null;

export async function loadLogoAsBase64Cached(forceReload: boolean = false): Promise<string> {
  if (cachedLogo && !forceReload) {
    return cachedLogo;
  }

  cachedLogo = await loadLogoAsBase64();
  return cachedLogo;
}

/**
 * Clear logo cache
 */
export function clearLogoCache(): void {
  cachedLogo = null;
}

