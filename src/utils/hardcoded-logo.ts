/**
 * Hardcoded Logo Base64
 * Logo di-hardcode sebagai base64 string untuk memastikan logo tidak hilang saat build/render
 * Logo ini adalah noxtiz.png yang sudah di-convert ke base64
 */

// Placeholder logo (simple blue square dengan text "LOGO")
// Ini akan di-replace dengan logo asli yang sudah di-convert ke base64
export const HARDCODED_LOGO_BASE64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzAwN2JmZiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI4IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmb250LWZhbWlseT0iQXJpYWwiPkxPR088L3RleHQ+PC9zdmc+';

/**
 * Get hardcoded logo
 * Fallback ke placeholder jika tidak ada logo yang di-hardcode
 */
export function getHardcodedLogo(): string {
  return HARDCODED_LOGO_BASE64;
}

/**
 * Ensure logo is base64 string
 * Jika logo sudah base64, return as-is
 * Jika tidak, gunakan hardcoded logo
 */
export function ensureLogoIsBase64(logo?: string): string {
  if (logo && logo.startsWith('data:')) {
    return logo;
  }
  return HARDCODED_LOGO_BASE64;
}
