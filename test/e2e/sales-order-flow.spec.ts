import { test, expect } from '@playwright/test';

test.describe('Sales Order E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('/');
    
    // Wait for business selector to load
    await page.waitForSelector('.business-selector', { timeout: 10000 });
    
    // Select Packaging business
    const packagingCard = page.locator('.business-card').filter({ hasText: 'Packaging' });
    await packagingCard.click();
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/packaging/dashboard', { timeout: 10000 });
    
    // Navigate to Sales Orders
    await page.click('text=Sales Orders');
    await page.waitForURL('**/packaging/sales-orders', { timeout: 10000 });
  });

  test('Complete SO flow from creation to CLOSE status', async ({ page }) => {
    // Step 1: Create New SO
    await page.click('button:has-text("+ Create SO")');
    
    // Wait for form to appear
    await page.waitForSelector('input[placeholder*="Masukkan nomor PO"]', { timeout: 5000 });
    
    // Fill SO No
    const soNo = `SO-TEST-${Date.now()}`;
    await page.fill('input[placeholder*="Masukkan nomor PO"]', soNo);
    
    // Fill Customer (type to search)
    const customerInput = page.locator('input[placeholder*="Type customer name"]');
    await customerInput.fill('Test');
    await page.waitForTimeout(500); // Wait for dropdown
    
    // Select first customer from dropdown
    const customerDropdown = page.locator('div[style*="position: absolute"]').first();
    if (await customerDropdown.isVisible()) {
      await customerDropdown.locator('div').first().click();
    } else {
      // Fallback: type full customer name if dropdown doesn't appear
      await customerInput.fill('Test Customer');
    }
    
    // Set Payment Terms - use more specific selector
    const paymentTermsSelect = page.locator('label:has-text("Payment Terms")').locator('..').locator('select').first();
    await paymentTermsSelect.waitFor({ state: 'visible' });
    await paymentTermsSelect.selectOption({ value: 'TOP' });
    
    // Set TOP Days - find input near "TOP Days" label
    const topDaysInput = page.locator('label:has-text("TOP Days")').locator('..').locator('input[type="number"]').first();
    await topDaysInput.waitFor({ state: 'visible' });
    await topDaysInput.fill('30');
    
    // Add Product Item
    await page.click('button:has-text("+ Add Product")');
    await page.waitForTimeout(500);
    
    // Fill product (type to search)
    const productInputs = page.locator('input[placeholder*="Type product"]');
    if (await productInputs.count() > 0) {
      await productInputs.first().fill('Test');
      await page.waitForTimeout(500);
      
      // Select first product from dropdown
      const productDropdown = page.locator('div[style*="position: absolute"]').last();
      if (await productDropdown.isVisible()) {
        await productDropdown.locator('div').first().click();
      }
    }
    
    // Fill quantity
    const qtyInputs = page.locator('input[type="number"]').filter({ hasText: /Qty/i });
    if (await qtyInputs.count() > 0) {
      await qtyInputs.first().fill('10');
    }
    
    // Save SO
    await page.click('button:has-text("Save SO")');
    
    // Wait for form to close and SO to appear in table
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Verify SO created with DRAFT status
    const soRow = page.locator('table tr').filter({ hasText: soNo }).first();
    await expect(soRow).toBeVisible();
    await expect(soRow).toContainText('DRAFT');
    
    // Step 2: Edit SO to OPEN status
    await soRow.locator('button:has-text("Edit")').click();
    await page.waitForSelector('input[placeholder*="Masukkan nomor PO"]', { timeout: 5000 });
    
    // Change status to OPEN (if there's a status selector in edit form)
    // Or just save to keep it DRAFT, then manually change status
    
    // Save changes
    await page.click('button:has-text("Save SO")');
    await page.waitForTimeout(1000);
    
    // Step 3: Change status to OPEN
    const editButton = page.locator('table tr').filter({ hasText: soNo }).locator('button:has-text("Edit")');
    if (await editButton.count() > 0) {
      await editButton.click();
      await page.waitForTimeout(500);
    }
    
    // Look for status change button or dropdown
    // This depends on your UI - might need to click "Confirm" or "Open" button
    const openButton = page.locator('button:has-text("Open")').or(
      page.locator('button:has-text("Confirm")')
    );
    
    if (await openButton.count() > 0) {
      await openButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Verify status changed to OPEN
    const updatedRow = page.locator('table tr').filter({ hasText: soNo }).first();
    await expect(updatedRow).toContainText('OPEN');
    
    // Step 4: Change status to CLOSE
    // This might require going through PPIC -> Production -> QA/QC -> Delivery flow
    // For now, let's try to find a "Close" button or status change option
    
    const closeButton = page.locator('button:has-text("Close")').or(
      page.locator('button:has-text("CLOSE")')
    );
    
    if (await closeButton.count() > 0) {
      await closeButton.click();
      
      // Handle confirmation dialog if any
      page.on('dialog', async dialog => {
        if (dialog.type() === 'confirm') {
          await dialog.accept();
        }
      });
      
      await page.waitForTimeout(1000);
    }
    
    // Verify final status is CLOSE
    const finalRow = page.locator('table tr').filter({ hasText: soNo }).first();
    await expect(finalRow).toContainText('CLOSE');
    
    console.log(`✅ SO Flow completed: ${soNo} - Status: CLOSE`);
  });

  test('Create SO with multiple items', async ({ page }) => {
    await page.click('button:has-text("+ Create SO")');
    await page.waitForSelector('input[placeholder*="Masukkan nomor PO"]', { timeout: 5000 });
    
    const soNo = `SO-MULTI-${Date.now()}`;
    await page.fill('input[placeholder*="Masukkan nomor PO"]', soNo);
    
    // Fill customer
    const customerInput = page.locator('input[placeholder*="Type customer name"]');
    await customerInput.fill('Test');
    await page.waitForTimeout(500);
    
    const customerDropdown = page.locator('div[style*="position: absolute"]').first();
    if (await customerDropdown.isVisible()) {
      await customerDropdown.locator('div').first().click();
    }
    
    // Set Payment Terms
    const paymentTermsSelect = page.locator('label:has-text("Payment Terms")').locator('..').locator('select').first();
    await paymentTermsSelect.waitFor({ state: 'visible' });
    await paymentTermsSelect.selectOption({ value: 'TOP' });
    
    // Set TOP Days
    const topDaysInput = page.locator('label:has-text("TOP Days")').locator('..').locator('input[type="number"]').first();
    await topDaysInput.waitFor({ state: 'visible' });
    await topDaysInput.fill('30');
    
    // Add first item
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
      
      const qtyInputs = page.locator('input[type="number"]');
      if (await qtyInputs.count() > 0) {
        await qtyInputs.first().fill('5');
      }
    }
    
    // Add second item
    await page.click('button:has-text("+ Add Product")');
    await page.waitForTimeout(500);
    
    if (await productInputs.count() > 1) {
      await productInputs.nth(1).fill('Test');
      await page.waitForTimeout(500);
      
      const productDropdown2 = page.locator('div[style*="position: absolute"]').last();
      if (await productDropdown2.isVisible()) {
        await productDropdown2.locator('div').first().click();
      }
      
      const qtyInputs2 = page.locator('input[type="number"]');
      if (await qtyInputs2.count() > 1) {
        await qtyInputs2.nth(1).fill('3');
      }
    }
    
    // Save
    await page.click('button:has-text("Save SO")');
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Verify SO created
    const soRow = page.locator('table tr').filter({ hasText: soNo }).first();
    await expect(soRow).toBeVisible();
  });
});

