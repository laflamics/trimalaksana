/**
 * Helper function untuk load data GT dari storageService (PostgreSQL)
 * Direct fetch tanpa localStorage wait untuk avoid looping
 */
export const loadGTDataFromLocalStorage = async <T>(
  key: string,
  fallbackToStorageService: () => Promise<T[]>
): Promise<T[]> => {
  // Direct fetch dari storageService (PostgreSQL)
  const storageData = await fallbackToStorageService();
  const data = Array.isArray(storageData) ? storageData : [];
  return data;
};

