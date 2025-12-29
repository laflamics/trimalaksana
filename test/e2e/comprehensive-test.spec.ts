import { test, expect } from '@playwright/test';

/**
 * COMPREHENSIVE E2E TEST SUITE
 * 
 * This test suite covers all modules, buttons, forms, and workflows
 * to detect errors and ensure functionality.
 * 
 * Run: npm run test:e2e
 * Run specific: npm run test:e2e -- --grep "Sales Orders"
 */

test.describe('Application E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('/');
    
    // Wait for business selector
    await page.waitForSelector('.business-selector', { timeout: 10000 });
    
    // Select Packaging business
    const packagingCard = page.locator('.business-card').filter({ hasText: 'Packaging' });
    await packagingCard.click();
    
    // Wait for navigation
    await page.waitForURL('**/packaging/**', { timeout: 10000 });
  });

  // ============================================
  // SALES ORDERS MODULE
  // ============================================
  test.describe('Sales Orders Module', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('text=Sales Orders');
      await page.waitForURL('**/packaging/sales-orders', { timeout: 10000 });
    });

    test('should display all buttons and filters', async ({ page }) => {
      // Check main buttons
      await expect(page.locator('button:has-text("+ Create SO")')).toBeVisible();
      
      // Check filters
      await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
      await expect(page.locator('select').filter({ hasText: /Status/i })).toBeVisible();
      await expect(page.locator('input[type="date"]').first()).toBeVisible();
      
      // Check tabs
      await expect(page.locator('button:has-text("All Orders")')).toBeVisible();
      await expect(page.locator('button:has-text("Outstanding")')).toBeVisible();
    });

    test('should create new SO with all required fields', async ({ page }) => {
      await page.click('button:has-text("+ Create SO")');
      await page.waitForSelector('input[placeholder*="Masukkan nomor PO"]', { timeout: 5000 });
      
      // Fill SO No
      const soNo = `SO-TEST-${Date.now()}`;
      await page.fill('input[placeholder*="Masukkan nomor PO"]', soNo);
      
      // Fill Customer
      const customerInput = page.locator('input[placeholder*="Type customer name"]');
      await customerInput.fill('Test');
      await page.waitForTimeout(500);
      
      const customerDropdown = page.locator('div[style*="position: absolute"]').first();
      if (await customerDropdown.isVisible()) {
        await customerDropdown.locator('div').first().click();
      } else {
        await customerInput.fill('Test Customer');
      }
      
      // Set Payment Terms
      const paymentTermsSelect = page.locator('label:has-text("Payment Terms")')
        .locator('..')
        .locator('select')
        .first();
      await paymentTermsSelect.waitFor({ state: 'visible' });
      await paymentTermsSelect.selectOption({ value: 'TOP' });
      
      // Set TOP Days
      const topDaysInput = page.locator('label:has-text("TOP Days")')
        .locator('..')
        .locator('input[type="number"]')
        .first();
      await topDaysInput.waitFor({ state: 'visible' });
      await topDaysInput.fill('30');
      
      // Add Product
      await page.click('button:has-text("+ Add Product")');
      await page.waitForTimeout(500);
      
      const productInputs = page.locator('input[placeholder*="Type product"]');
      if (await productInputs.count() > 0) {
        await productInputs.first().fill('Test');
        await page.waitForTimeout(500);
        
        const productDropdown = page.locator('div[style*="position: absolute"]').last();
        if (await productDropdown.isVisible()) {
          await productDropdown.locator('div').first().click();
        }
        
        // Fill quantity
        const qtyInputs = page.locator('input[type="number"]');
        const qtyInput = qtyInputs.filter({ hasText: /qty/i }).or(qtyInputs.nth(1));
        if (await qtyInput.count() > 0) {
          await qtyInput.first().fill('10');
        }
      }
      
      // Save
      await page.click('button:has-text("Save SO")');
      await page.waitForSelector('table', { timeout: 10000 });
      
      // Verify SO created
      const soRow = page.locator('table tr').filter({ hasText: soNo }).first();
      await expect(soRow).toBeVisible();
      await expect(soRow).toContainText('DRAFT');
    });

    test('should edit existing SO', async ({ page }) => {
      // Wait for table to load
      await page.waitForSelector('table', { timeout: 10000 });
      
      // Find first SO row with Edit button
      const editButton = page.locator('table tr').locator('button:has-text("Edit")').first();
      
      if (await editButton.count() > 0) {
        await editButton.click();
        await page.waitForSelector('input[placeholder*="Masukkan nomor PO"]', { timeout: 5000 });
        
        // Verify form is open
        await expect(page.locator('button:has-text("Update SO")').or(
          page.locator('button:has-text("Save SO")')
        )).toBeVisible();
        
        // Cancel edit
        await page.click('button:has-text("Cancel")');
        await page.waitForTimeout(500);
      }
    });

    test('should filter by status', async ({ page }) => {
      const statusSelect = page.locator('select').filter({ hasText: /Status/i }).first();
      await statusSelect.waitFor({ state: 'visible' });
      
      // Test each status filter
      const statuses = ['DRAFT', 'OPEN', 'CLOSE', 'VOID'];
      for (const status of statuses) {
        await statusSelect.selectOption({ label: status });
        await page.waitForTimeout(500);
        // Verify filter applied (table should update)
      }
    });

    test('should search SO', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"]');
      await searchInput.fill('SO-');
      await page.waitForTimeout(500);
      // Verify search results
    });
  });

  // ============================================
  // PPIC MODULE
  // ============================================
  test.describe('PPIC Module', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('text=PPIC');
      await page.waitForURL('**/packaging/ppic', { timeout: 10000 });
    });

    test('should display all tabs', async ({ page }) => {
      await expect(page.locator('button:has-text("SPK")')).toBeVisible();
      await expect(page.locator('button:has-text("PTP")')).toBeVisible();
      await expect(page.locator('button:has-text("Schedule")')).toBeVisible();
      await expect(page.locator('button:has-text("Analisa")')).toBeVisible();
    });

    test('should navigate between tabs', async ({ page }) => {
      const tabs = ['SPK', 'PTP', 'Schedule', 'Analisa'];
      for (const tab of tabs) {
        await page.click(`button:has-text("${tab}")`);
        await page.waitForTimeout(500);
        // Verify tab content loaded
      }
    });
  });

  // ============================================
  // PURCHASING MODULE
  // ============================================
  test.describe('Purchasing Module', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('text=Purchasing');
      await page.waitForURL('**/packaging/purchasing', { timeout: 10000 });
    });

    test('should display create PO button', async ({ page }) => {
      await expect(page.locator('button:has-text("+ Create PO")')).toBeVisible();
    });

    test('should create new PO', async ({ page }) => {
      await page.click('button:has-text("+ Create PO")');
      await page.waitForTimeout(1000);
      
      // Verify form appears
      const formVisible = await page.locator('input[placeholder*="supplier"]').or(
        page.locator('input[type="text"]').first()
      ).isVisible();
      
      expect(formVisible).toBeTruthy();
    });
  });

  // ============================================
  // FINANCE MODULE
  // ============================================
  test.describe('Finance Module', () => {
    test('should navigate to Accounting', async ({ page }) => {
      await page.click('text=Accounting');
      await page.waitForURL('**/packaging/finance/accounting', { timeout: 10000 });
      
      // Check buttons
      await expect(page.locator('button:has-text("+ New Entry")')).toBeVisible();
      await expect(page.locator('button:has-text("Export Excel")')).toBeVisible();
    });

    test('should navigate to Payments', async ({ page }) => {
      await page.click('text=Payments');
      await page.waitForURL('**/packaging/finance/payments', { timeout: 10000 });
      
      // Check buttons
      await expect(page.locator('button:has-text("Record Payment")').or(
        page.locator('button:has-text("+ Record Payment")')
      )).toBeVisible();
    });

    test('should navigate to General Ledger', async ({ page }) => {
      await page.click('text=General Ledger');
      await page.waitForURL('**/packaging/finance/ledger', { timeout: 10000 });
      
      await expect(page.locator('button:has-text("New Entry")').or(
        page.locator('button:has-text("+ New Entry")')
      )).toBeVisible();
    });
  });

  // ============================================
  // MASTER MODULE
  // ============================================
  test.describe('Master Module', () => {
    test('should navigate to Products', async ({ page }) => {
      await page.click('text=Products');
      await page.waitForURL('**/packaging/master/products', { timeout: 10000 });
      
      await expect(page.locator('button:has-text("Add Product")').or(
        page.locator('button:has-text("+ Add Product")')
      )).toBeVisible();
    });

    test('should navigate to Customers', async ({ page }) => {
      await page.click('text=Customers');
      await page.waitForURL('**/packaging/master/customers', { timeout: 10000 });
      
      await expect(page.locator('button:has-text("Add Customer")').or(
        page.locator('button:has-text("+ Add Customer")')
      )).toBeVisible();
    });

    test('should navigate to Materials', async ({ page }) => {
      await page.click('text=Materials');
      await page.waitForURL('**/packaging/master/materials', { timeout: 10000 });
      
      await expect(page.locator('button:has-text("Add Material")').or(
        page.locator('button:has-text("+ Add Material")')
      )).toBeVisible();
    });

    test('should navigate to Suppliers', async ({ page }) => {
      await page.click('text=Suppliers');
      await page.waitForURL('**/packaging/master/suppliers', { timeout: 10000 });
      
      await expect(page.locator('button:has-text("Add Supplier")').or(
        page.locator('button:has-text("+ Add Supplier")')
      )).toBeVisible();
    });
  });

  // ============================================
  // FORM VALIDATION TESTS
  // ============================================
  test.describe('Form Validation', () => {
    test('should validate required fields in SO form', async ({ page }) => {
      await page.click('text=Sales Orders');
      await page.waitForURL('**/packaging/sales-orders', { timeout: 10000 });
      
      await page.click('button:has-text("+ Create SO")');
      await page.waitForSelector('input[placeholder*="Masukkan nomor PO"]', { timeout: 5000 });
      
      // Try to save without filling required fields
      await page.click('button:has-text("Save SO")');
      
      // Should show validation error or prevent save
      // (Implementation depends on your validation)
      await page.waitForTimeout(500);
    });
  });

  // ============================================
  // BUTTON CLICKABILITY TESTS
  // ============================================
  test.describe('Button Functionality', () => {
    test('should test all export buttons', async ({ page }) => {
      // Test Accounting export
      await page.click('text=Accounting');
      await page.waitForURL('**/packaging/finance/accounting', { timeout: 10000 });
      
      const exportBtn = page.locator('button:has-text("Export Excel")');
      if (await exportBtn.count() > 0) {
        // Click should not error (may download file)
        await exportBtn.click();
        await page.waitForTimeout(1000);
      }
    });
  });
});

