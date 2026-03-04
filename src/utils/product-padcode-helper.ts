/**
 * Helper untuk auto-link padCode product ke kode customer
 * Jika padCode kosong, ambil dari kode customer berdasarkan nama customer
 */

interface Product {
  id: string;
  kode: string;
  nama: string;
  padCode?: string;
  customer?: string;
  supplier?: string;
  [key: string]: any;
}

interface Customer {
  id: string;
  kode: string;
  nama: string;
}

/**
 * Auto-fill padCode dari customer kode jika padCode kosong
 * @param product - Product yang akan di-update
 * @param customers - List semua customers
 * @returns Product dengan padCode yang sudah di-fill
 */
export function autofillPadCodeFromCustomer(product: Product, customers: Customer[]): Product {
  // Jika padCode sudah ada, jangan ubah
  if (product.padCode && product.padCode.trim()) {
    return product;
  }

  // Ambil nama customer dari product
  const customerName = (product.customer || product.supplier || '').trim();
  
  if (!customerName) {
    // Tidak ada customer, return as-is
    return product;
  }

  // Cari customer berdasarkan nama
  const customer = customers.find(c => 
    c.nama && c.nama.toLowerCase() === customerName.toLowerCase()
  );

  if (!customer || !customer.kode) {
    // Customer tidak ditemukan atau tidak punya kode
    return product;
  }

  // Return product dengan padCode yang sudah di-fill dari customer kode
  return {
    ...product,
    padCode: customer.kode.trim(),
  };
}

/**
 * Batch auto-fill padCode untuk multiple products
 * @param products - List products
 * @param customers - List customers
 * @returns List products dengan padCode yang sudah di-fill
 */
export function autofillPadCodesForProducts(
  products: Product[],
  customers: Customer[]
): Product[] {
  return products.map(product => autofillPadCodeFromCustomer(product, customers));
}

/**
 * Validate padCode - check apakah padCode valid (ada di customer master)
 * @param padCode - PadCode yang akan di-validate
 * @param customers - List customers
 * @returns true jika valid, false jika tidak
 */
export function validatePadCode(padCode: string, customers: Customer[]): boolean {
  if (!padCode || !padCode.trim()) {
    return true; // Empty padCode is valid (optional field)
  }

  const trimmedPadCode = padCode.trim();
  return customers.some(c => c.kode && c.kode.trim() === trimmedPadCode);
}

/**
 * Get customer kode dari product (untuk display)
 * @param product - Product
 * @param customers - List customers
 * @returns Customer kode atau empty string
 */
export function getCustomerKodeFromProduct(product: Product, customers: Customer[]): string {
  const customerName = (product.customer || product.supplier || '').trim();
  
  if (!customerName) {
    return '';
  }

  const customer = customers.find(c => 
    c.nama && c.nama.toLowerCase() === customerName.toLowerCase()
  );

  return customer?.kode || '';
}

/**
 * Sync padCode untuk product yang sudah ada
 * Jika padCode kosong, isi dari customer kode
 * @param product - Product yang akan di-sync
 * @param customers - List customers
 * @returns true jika ada perubahan, false jika tidak
 */
export function syncPadCodeIfEmpty(product: Product, customers: Customer[]): { updated: Product; changed: boolean } {
  const originalPadCode = product.padCode || '';
  const updated = autofillPadCodeFromCustomer(product, customers);
  const changed = originalPadCode !== (updated.padCode || '');

  return { updated, changed };
}
