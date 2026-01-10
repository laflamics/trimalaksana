/**
 * Helper function untuk load data GT dari localStorage langsung
 * Sama seperti DB Activity - baca local dulu, lebih cepat dan data terbaru
 */
export const loadGTDataFromLocalStorage = async <T>(
  key: string,
  fallbackToStorageService: () => Promise<T[]>
): Promise<T[]> => {
  // Try multiple key formats
  const possibleKeys = [
    `general-trading/${key}`, // With business prefix
    key, // Direct key
  ];
  
  for (const storageKey of possibleKeys) {
    const valueStr = localStorage.getItem(storageKey);
    if (valueStr) {
      try {
        const parsed = JSON.parse(valueStr);
        const extracted = Array.isArray(parsed?.value) ? parsed.value : (Array.isArray(parsed) ? parsed : []);
        if (extracted.length > 0) {
          console.log(`[GT Storage] Loaded ${key} from localStorage key: ${storageKey} (${extracted.length} items)`);
          return extracted as T[];
        }
      } catch (e) {
        console.warn(`[GT Storage] Error parsing localStorage key ${storageKey}:`, e);
      }
    }
  }
  
  // If still empty, try storageService as fallback
  console.log(`[GT Storage] localStorage empty for ${key}, trying storageService...`);
  const storageData = await fallbackToStorageService();
  const data = Array.isArray(storageData) ? storageData : [];
  console.log(`[GT Storage] Loaded ${key} from storageService: ${data.length} items`);
  return data;
};

