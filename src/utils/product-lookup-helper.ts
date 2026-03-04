import { storageService, extractStorageValue, StorageKeys } from '../services/storage';

let cachedProducts: any[] = [];
let cachedGtProducts: any[] = [];

/**
 * Load products from storage (cache untuk performance)
 */
export const loadProductsCache = async (business: 'packaging' | 'gt' = 'gt') => {
  try {
    const key = business === 'gt' ? StorageKeys.GENERAL_TRADING.PRODUCTS : StorageKeys.PACKAGING.PRODUCTS;
    const productsRaw = await storageService.get<any[]>(key);
    const productsData = extractStorageValue(productsRaw);
    const products = Array.isArray(productsData) ? productsData : [];
    
    if (business === 'gt') {
      cachedGtProducts = products;
    } else {
      cachedProducts = products;
    }
    
    return products;
  } catch (error) {
    console.error(`Error loading ${business} products:`, error);
    return [];
  }
};

/**
 * Get product name by code/kode
 * Supports: kode, product_id, sku, id
 */
export const getProductNameByCode = (code: string, business: 'packaging' | 'gt' = 'gt'): string => {
  if (!code) return '';
  
  const products = business === 'gt' ? cachedGtProducts : cachedProducts;
  
  if (products.length === 0) return code;
  
  const product = products.find(p => 
    p.kode === code || 
    p.product_id === code || 
    p.sku === code || 
    p.id === code
  );
  
  return product?.nama || product?.name || code;
};

/**
 * Get product price by code/kode
 */
export const getProductPriceByCode = (code: string, business: 'packaging' | 'gt' = 'gt'): number => {
  if (!code) return 0;
  
  const products = business === 'gt' ? cachedGtProducts : cachedProducts;
  
  if (products.length === 0) return 0;
  
  const product = products.find(p => 
    p.kode === code || 
    p.product_id === code || 
    p.sku === code || 
    p.id === code
  );
  
  return product?.harga || product?.hargaSales || product?.price || 0;
};

/**
 * Get full product data by code/kode
 */
export const getProductByCode = (code: string, business: 'packaging' | 'gt' = 'gt'): any => {
  if (!code) return null;
  
  const products = business === 'gt' ? cachedGtProducts : cachedProducts;
  
  if (products.length === 0) return null;
  
  return products.find(p => 
    p.kode === code || 
    p.product_id === code || 
    p.sku === code || 
    p.id === code
  ) || null;
};

/**
 * Search products by name or code
 */
export const searchProducts = (query: string, business: 'packaging' | 'gt' = 'gt'): any[] => {
  if (!query) return [];
  
  const products = business === 'gt' ? cachedGtProducts : cachedProducts;
  const lowerQuery = query.toLowerCase();
  
  return products.filter(p =>
    p.nama?.toLowerCase().includes(lowerQuery) ||
    p.name?.toLowerCase().includes(lowerQuery) ||
    p.kode?.toLowerCase().includes(lowerQuery) ||
    p.product_id?.toLowerCase().includes(lowerQuery) ||
    p.sku?.toLowerCase().includes(lowerQuery)
  );
};

/**
 * Get all products
 */
export const getAllProducts = (business: 'packaging' | 'gt' = 'gt'): any[] => {
  return business === 'gt' ? cachedGtProducts : cachedProducts;
};
