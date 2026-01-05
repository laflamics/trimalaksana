import { test, expect } from '@playwright/test';

/**
 * AI-POWERED E2E TEST SUITE
 * 
 * Test ini menggunakan semantic selectors dan auto-exploration
 * untuk secara otomatis test semua flow di UI tanpa hardcode selector.
 * 
 * Approach:
 * 1. Auto-detect semua buttons, forms, dan interactive elements
 * 2. Test semua possible flows secara systematic
 * 3. Detect errors dan broken functionality
 * 4. Generate report dengan semua findings
 */

test.describe('AI-Powered Comprehensive UI Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.business-selector', { timeout: 10000 });
    
    // Select Packaging
    const packagingCard = page.locator('.business-card').filter({ hasText: 'Packaging' });
    await packagingCard.click();
    await page.waitForURL('**/packaging/**', { timeout: 10000 });
  });

  /**
   * Auto-detect dan test semua buttons di halaman
   */
  async function testAllButtons(page: any, moduleName: string) {
    const results = {
      module: moduleName,
      buttons: [] as any[],
      errors: [] as string[]
    };

    // Find all buttons
    const buttons = await page.locator('button, [role="button"], a[href]').all();
    
    for (const button of buttons) {
      try {
        const text = await button.textContent();
        const isVisible = await button.isVisible();
        const isEnabled = await button.isEnabled();
        
        if (isVisible && isEnabled && text && text.trim().length > 0) {
          const buttonInfo = {
            text: text.trim(),
            visible: isVisible,
            enabled: isEnabled,
            clickable: false,
            error: null as string | null
          };

          // Try to click (with timeout)
          try {
            await button.click({ timeout: 2000 });
            buttonInfo.clickable = true;
            await page.waitForTimeout(500); // Wait for action to complete
          } catch (error: any) {
            buttonInfo.clickable = false;
            buttonInfo.error = error.message;
            results.errors.push(`Button "${text.trim()}" error: ${error.message}`);
          }

          results.buttons.push(buttonInfo);
        }
      } catch (error: any) {
        results.errors.push(`Error testing button: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Auto-detect dan test semua form fields
   */
  async function testAllFormFields(page: any, moduleName: string) {
    const results = {
      module: moduleName,
      fields: [] as any[],
      errors: [] as string[]
    };

    // Find all inputs, selects, textareas
    const fields = await page.locator('input, select, textarea').all();
    
    for (const field of fields) {
      try {
        const tagName = await field.evaluate((el: any) => el.tagName.toLowerCase());
        const type = await field.getAttribute('type') || tagName;
        const placeholder = await field.getAttribute('placeholder') || '';
        const label = await field.getAttribute('aria-label') || '';
        const isVisible = await field.isVisible();
        const isEnabled = await field.isEnabled();

        if (isVisible) {
          const fieldInfo = {
            type,
            placeholder,
            label,
            visible: isVisible,
            enabled: isEnabled,
            fillable: false,
            error: null as string | null
          };

          // Try to fill (if enabled)
          if (isEnabled) {
            try {
              if (tagName === 'input' && type !== 'file') {
                await field.fill('TEST_VALUE');
                fieldInfo.fillable = true;
              } else if (tagName === 'select') {
                const options = await field.locator('option').all();
                if (options.length > 1) {
                  await field.selectOption({ index: 1 });
                  fieldInfo.fillable = true;
                }
              } else if (tagName === 'textarea') {
                await field.fill('TEST_TEXT');
                fieldInfo.fillable = true;
              }
            } catch (error: any) {
              fieldInfo.fillable = false;
              fieldInfo.error = error.message;
              results.errors.push(`Field "${placeholder || label}" error: ${error.message}`);
            }
          }

          results.fields.push(fieldInfo);
        }
      } catch (error: any) {
        results.errors.push(`Error testing field: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Test complete flow untuk module tertentu
   */
  async function testModuleFlow(page: any, moduleName: string, route: string) {
    console.log(`\n🔍 Testing module: ${moduleName}`);
    
    // Navigate to module
    await page.click(`text=${moduleName}`);
    await page.waitForURL(`**${route}**`, { timeout: 10000 });
    await page.waitForTimeout(1000); // Wait for page to fully load

    const results = {
      module: moduleName,
      route,
      buttons: await testAllButtons(page, moduleName),
      formFields: await testAllFormFields(page, moduleName),
      navigation: {
        success: true,
        error: null as string | null
      }
    };

    // Test navigation
    try {
      await expect(page).toHaveURL(new RegExp(route));
    } catch (error: any) {
      results.navigation.success = false;
      results.navigation.error = error.message;
    }

    return results;
  }

  test('Auto-explore all modules and test all UI elements', async ({ page }) => {
    const allResults: any[] = [];

    // List semua modules yang perlu di-test
    const modules = [
      { name: 'Sales Orders', route: '/packaging/sales-orders' },
      { name: 'PPIC', route: '/packaging/ppic' },
      { name: 'Purchasing', route: '/packaging/purchasing' },
      { name: 'Production', route: '/packaging/production' },
      { name: 'QA/QC', route: '/packaging/qa-qc' },
      { name: 'Delivery Note', route: '/packaging/delivery-note' },
      { name: 'Accounting', route: '/packaging/finance/accounting' },
      { name: 'Payments', route: '/packaging/finance/payments' },
      { name: 'General Ledger', route: '/packaging/finance/ledger' },
      { name: 'Products', route: '/packaging/master/products' },
      { name: 'Materials', route: '/packaging/master/materials' },
      { name: 'Customers', route: '/packaging/master/customers' },
      { name: 'Suppliers', route: '/packaging/master/suppliers' },
    ];

    // Test setiap module
    for (const module of modules) {
      try {
        const result = await testModuleFlow(page, module.name, module.route);
        allResults.push(result);
        
        // Log summary
        console.log(`✅ ${module.name}:`);
        console.log(`   - Buttons found: ${result.buttons.buttons.length}`);
        console.log(`   - Buttons with errors: ${result.buttons.errors.length}`);
        console.log(`   - Form fields found: ${result.formFields.fields.length}`);
        console.log(`   - Fields with errors: ${result.formFields.errors.length}`);
        
        // Navigate back to dashboard untuk reset
        await page.click('text=Dashboard');
        await page.waitForTimeout(500);
      } catch (error: any) {
        console.error(`❌ Error testing ${module.name}:`, error.message);
        allResults.push({
          module: module.name,
          error: error.message
        });
      }
    }

    // Generate summary report
    console.log('\n📊 TEST SUMMARY:');
    console.log('='.repeat(50));
    
    let totalButtons = 0;
    let totalButtonErrors = 0;
    let totalFields = 0;
    let totalFieldErrors = 0;
    let modulesWithErrors = 0;

    allResults.forEach(result => {
      if (result.buttons) {
        totalButtons += result.buttons.buttons.length;
        totalButtonErrors += result.buttons.errors.length;
      }
      if (result.formFields) {
        totalFields += result.formFields.fields.length;
        totalFieldErrors += result.formFields.errors.length;
      }
      if (result.error || (result.buttons && result.buttons.errors.length > 0) || 
          (result.formFields && result.formFields.errors.length > 0)) {
        modulesWithErrors++;
      }
    });

    console.log(`Total Modules Tested: ${allResults.length}`);
    console.log(`Total Buttons Found: ${totalButtons}`);
    console.log(`Buttons with Errors: ${totalButtonErrors}`);
    console.log(`Total Form Fields Found: ${totalFields}`);
    console.log(`Fields with Errors: ${totalFieldErrors}`);
    console.log(`Modules with Errors: ${modulesWithErrors}`);
    console.log('='.repeat(50));

    // Save detailed results to file (optional)
    // This would require Node.js fs module, but we can log it for now
    
    // Assertions - fail test if too many errors
    expect(totalButtonErrors).toBeLessThan(totalButtons * 0.1); // Less than 10% error rate
    expect(totalFieldErrors).toBeLessThan(totalFields * 0.1);
  });

  /**
   * Test specific flow: Create SO → Confirm → Complete workflow
   */
  test('Auto-detect and test Sales Order creation flow', async ({ page }) => {
    await page.click('text=Sales Orders');
    await page.waitForURL('**/packaging/sales-orders', { timeout: 10000 });

    // Auto-detect "Create" button
    const createButtons = page.locator('button').filter({ hasText: /create|add|new/i });
    const createButton = createButtons.first();
    
    if (await createButton.count() > 0) {
      await createButton.click();
      await page.waitForTimeout(1000);

      // Auto-detect all form fields
      const inputs = await page.locator('input[type="text"], input[type="number"], input:not([type])').all();
      const selects = await page.locator('select').all();
      
      console.log(`Found ${inputs.length} inputs and ${selects.length} selects`);

      // Try to fill first text input (usually SO No)
      if (inputs.length > 0) {
        const firstInput = inputs[0];
        const placeholder = await firstInput.getAttribute('placeholder') || '';
        
        if (placeholder.toLowerCase().includes('so') || placeholder.toLowerCase().includes('no')) {
          await firstInput.fill(`SO-AUTO-${Date.now()}`);
          console.log('✅ Filled SO No field');
        }
      }

      // Try to fill customer field (usually second input)
      if (inputs.length > 1) {
        const customerInput = inputs[1];
        await customerInput.fill('Test');
        await page.waitForTimeout(500);
        
        // Try to click dropdown if appears
        const dropdown = page.locator('div[style*="position: absolute"]').first();
        if (await dropdown.isVisible()) {
          await dropdown.locator('div').first().click();
          console.log('✅ Selected customer from dropdown');
        }
      }

      // Auto-detect and fill select fields
      for (const select of selects) {
        const options = await select.locator('option').count();
        if (options > 1) {
          await select.selectOption({ index: 1 }); // Select second option
          console.log('✅ Selected option in dropdown');
        }
      }

      // Auto-detect Save button
      const saveButtons = page.locator('button').filter({ hasText: /save|submit|create/i });
      if (await saveButtons.count() > 0) {
        const saveButton = saveButtons.first();
        await saveButton.click();
        await page.waitForTimeout(2000);
        console.log('✅ Clicked Save button');
        
        // Verify form closed or data saved
        const formStillOpen = await page.locator('input[placeholder*="SO"]').or(
          page.locator('input[placeholder*="nomor PO"]')
        ).isVisible().catch(() => false);
        
        expect(formStillOpen).toBeFalsy(); // Form should close after save
      }
    }
  });

  /**
   * Test all navigation links
   */
  test('Auto-test all navigation links', async ({ page }) => {
    const navLinks = await page.locator('nav a, aside a, [role="navigation"] a').all();
    const results: any[] = [];

    for (const link of navLinks) {
      try {
        const href = await link.getAttribute('href');
        const text = await link.textContent();
        const isVisible = await link.isVisible();

        if (isVisible && href && text) {
          const result = {
            text: text.trim(),
            href,
            clickable: false,
            error: null as string | null
          };

          try {
            await link.click();
            await page.waitForTimeout(1000);
            result.clickable = true;
            
            // Verify navigation worked
            const currentUrl = page.url();
            if (href.startsWith('#') || currentUrl.includes(href.replace('#', ''))) {
              console.log(`✅ Navigation to "${text.trim()}" successful`);
            }
          } catch (error: any) {
            result.clickable = false;
            result.error = error.message;
            console.error(`❌ Navigation to "${text.trim()}" failed:`, error.message);
          }

          results.push(result);
        }
      } catch (error: any) {
        console.error('Error testing nav link:', error);
      }
    }

    console.log(`\n📊 Navigation Test Results: ${results.length} links tested`);
    const failedLinks = results.filter(r => !r.clickable);
    if (failedLinks.length > 0) {
      console.log(`❌ Failed links: ${failedLinks.length}`);
      failedLinks.forEach(link => {
        console.log(`   - ${link.text}: ${link.error}`);
      });
    }

    expect(failedLinks.length).toBeLessThan(results.length * 0.2); // Less than 20% failure rate
  });
});

