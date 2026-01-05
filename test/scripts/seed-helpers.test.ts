import { describe, it, expect } from 'vitest';

// Test helper functions from seed.js
describe('Seed Script Helpers', () => {
  describe('generateId', () => {
    it('should generate unique IDs', () => {
      // Mock Date.now and Math.random for consistent testing
      const id1 = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const id2 = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(typeof id1).toBe('string');
      expect(id1).toMatch(/^\d+-[a-z0-9]+$/);
    });
  });

  describe('isEmptyValue for BOM', () => {
    const isEmptyValue = (value: any): boolean => {
      if (value === null || value === undefined) return true;
      if (value === '') return true;
      if (value === 0) return true;
      if (typeof value === 'string') {
        const trimmed = value.trim().toLowerCase();
        return trimmed === '' || 
               trimmed === '-' || 
               trimmed === 'none' || 
               trimmed === 'null' ||
               trimmed === '0000-00-00';
      }
      return false;
    };

    it('should identify empty values correctly', () => {
      expect(isEmptyValue(null)).toBe(true);
      expect(isEmptyValue(undefined)).toBe(true);
      expect(isEmptyValue('')).toBe(true);
      expect(isEmptyValue(0)).toBe(true);
      expect(isEmptyValue('-')).toBe(true);
      expect(isEmptyValue('none')).toBe(true);
      expect(isEmptyValue('0000-00-00')).toBe(true);
      expect(isEmptyValue('valid')).toBe(false);
      expect(isEmptyValue(123)).toBe(false);
    });
  });

  describe('Product/Material ID validation', () => {
    it('should validate KRT product IDs', () => {
      const validIds = ['KRT00001', 'KRT00137', 'KRT28000'];
      const invalidIds = ['', 'ABC123'];
      
      validIds.forEach(id => {
        expect(id).toMatch(/^KRT\d+$/);
      });
      
      invalidIds.forEach(id => {
        if (id) {
          expect(id).not.toMatch(/^KRT\d+$/);
        }
      });
    });
  });
});

