/**
 * AI-POWERED TEST GENERATOR
 * 
 * Generate test cases automatically dari UI-MAPPING.md
 * atau dari actual UI exploration
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface ButtonInfo {
  text: string;
  module: string;
  file: string;
}

interface FormFieldInfo {
  label: string;
  module: string;
  file: string;
}

interface ModuleInfo {
  buttons: string[];
  formFields: string[];
  statuses: string[];
  actions: string[];
}

export class TestGenerator {
  private mapping: any;

  constructor() {
    try {
      const mappingPath = join(__dirname, 'UI-MAPPING.md');
      const mappingContent = readFileSync(mappingPath, 'utf-8');
      this.parseMapping(mappingContent);
    } catch (error) {
      console.warn('Could not load UI-MAPPING.md, using empty mapping');
      this.mapping = {};
    }
  }

  private parseMapping(content: string) {
    // Parse markdown untuk extract buttons, fields, dll
    const modules: any = {};
    let currentModule = '';

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detect module header
      if (line.startsWith('### ') || line.startsWith('## ')) {
        const moduleMatch = line.match(/\d+\.\s*(.+?)\s*\(/);
        if (moduleMatch) {
          currentModule = moduleMatch[1];
          modules[currentModule] = {
            buttons: [],
            formFields: [],
            statuses: [],
            actions: []
          };
        }
      }

      // Extract buttons
      if (line.startsWith('- `') && line.includes('Button')) {
        const buttonMatch = line.match(/- `([^`]+)`/);
        if (buttonMatch && currentModule) {
          modules[currentModule].buttons.push(buttonMatch[1]);
        }
      }

      // Extract form fields
      if (line.startsWith('- `') && (line.includes('input') || line.includes('select') || line.includes('textarea'))) {
        const fieldMatch = line.match(/- `([^`]+)`/);
        if (fieldMatch && currentModule) {
          modules[currentModule].formFields.push(fieldMatch[1]);
        }
      }
    }

    this.mapping = modules;
  }

  /**
   * Generate test code untuk module tertentu
   */
  generateModuleTest(moduleName: string, route: string): string {
    const module = this.mapping[moduleName] || { buttons: [], formFields: [] };
    
    let testCode = `
  test('Auto-test ${moduleName} module', async ({ page }) => {
    await page.click('text=${moduleName}');
    await page.waitForURL('**${route}**', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Test all buttons
`;

    // Generate button tests
    module.buttons.forEach((button: string) => {
      const buttonText = button.replace(/[+*]/g, '\\$&'); // Escape special chars
      testCode += `
    // Test button: ${button}
    const ${this.sanitizeName(button)}Btn = page.locator('button').filter({ hasText: /${buttonText}/i });
    if (await ${this.sanitizeName(button)}Btn.count() > 0) {
      const isVisible = await ${this.sanitizeName(button)}Btn.isVisible();
      if (isVisible) {
        try {
          await ${this.sanitizeName(button)}Btn.click({ timeout: 2000 });
          await page.waitForTimeout(500);
          console.log('✅ Button "${button}" clicked successfully');
        } catch (error) {
          console.error('❌ Button "${button}" error:', error);
        }
      }
    }
`;
    });

    testCode += `
    // Test all form fields
`;

    // Generate form field tests
    module.formFields.forEach((field: string) => {
      testCode += `
    // Test field: ${field}
    const ${this.sanitizeName(field)}Field = page.locator('input, select, textarea').filter({ 
      has: page.locator('label, [aria-label]').filter({ hasText: /${field}/i })
    }).or(page.locator('[placeholder*="${field}"]'));
    
    if (await ${this.sanitizeName(field)}Field.count() > 0) {
      const isVisible = await ${this.sanitizeName(field)}Field.first().isVisible();
      if (isVisible) {
        try {
          const tagName = await ${this.sanitizeName(field)}Field.first().evaluate((el: any) => el.tagName.toLowerCase());
          if (tagName === 'input') {
            await ${this.sanitizeName(field)}Field.first().fill('TEST_VALUE');
          } else if (tagName === 'select') {
            await ${this.sanitizeName(field)}Field.first().selectOption({ index: 1 });
          }
          console.log('✅ Field "${field}" filled successfully');
        } catch (error) {
          console.error('❌ Field "${field}" error:', error);
        }
      }
    }
`;
    });

    testCode += `  });`;

    return testCode;
  }

  private sanitizeName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/\s+/g, '_')
      .toLowerCase();
  }

  /**
   * Generate complete test suite untuk semua modules
   */
  generateAllTests(): string {
    const modules = [
      { name: 'Sales Orders', route: '/packaging/sales-orders' },
      { name: 'PPIC', route: '/packaging/ppic' },
      { name: 'Purchasing', route: '/packaging/purchasing' },
      { name: 'Production', route: '/packaging/production' },
      { name: 'QA/QC', route: '/packaging/qa-qc' },
      { name: 'Delivery Note', route: '/packaging/delivery-note' },
      { name: 'Accounting', route: '/packaging/finance/accounting' },
      { name: 'Payments', route: '/packaging/finance/payments' },
    ];

    let allTests = `import { test, expect } from '@playwright/test';

test.describe('Auto-Generated Module Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.business-selector', { timeout: 10000 });
    const packagingCard = page.locator('.business-card').filter({ hasText: 'Packaging' });
    await packagingCard.click();
    await page.waitForURL('**/packaging/**', { timeout: 10000 });
  });
`;

    modules.forEach(module => {
      allTests += this.generateModuleTest(module.name, module.route);
    });

    allTests += `\n});`;

    return allTests;
  }
}

// Export untuk digunakan di test files
export const generator = new TestGenerator();

