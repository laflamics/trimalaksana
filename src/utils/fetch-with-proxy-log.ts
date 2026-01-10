/**
 * Wrapper untuk fetch ke Vercel proxy
 * TIDAK ada logging di sini - logging hanya di storage.set() dan storage.removeItem()
 * untuk operasi yang benar-benar mengubah data (user actions)
 */
export async function fetchWithProxyLog(
  url: string | URL | Request,
  options?: RequestInit
): Promise<Response> {
  // Langsung fetch tanpa logging
  // Logging hanya dilakukan di storage.set() dan storage.removeItem() saat user benar-benar ubah data
    return fetch(url, options);
}
