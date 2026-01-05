import { describe, it, expect } from 'vitest';

// Helper functions from HRD.tsx
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
           trimmed === '0000-00-00' ||
           trimmed === 'n/a' ||
           trimmed === 'na';
  }
  return false;
};

const shouldHideColumn = (key: string, data: any[]): boolean => {
  if (data.length === 0) return false;
  if (key === 'actions') return false;
  
  const emptyCount = data.filter(item => {
    const value = item[key];
    return isEmptyValue(value);
  }).length;
  
  const emptyPercentage = (emptyCount / data.length) * 100;
  return emptyPercentage > 50;
};

describe('HRD Helper Functions', () => {
  describe('isEmptyValue', () => {
    it('should return true for null', () => {
      expect(isEmptyValue(null)).toBe(true);
    });

    it('should return true for undefined', () => {
      expect(isEmptyValue(undefined)).toBe(true);
    });

    it('should return true for empty string', () => {
      expect(isEmptyValue('')).toBe(true);
    });

    it('should return true for zero', () => {
      expect(isEmptyValue(0)).toBe(true);
    });

    it('should return true for dash', () => {
      expect(isEmptyValue('-')).toBe(true);
    });

    it('should return true for "none"', () => {
      expect(isEmptyValue('none')).toBe(true);
      expect(isEmptyValue('None')).toBe(true);
      expect(isEmptyValue('NONE')).toBe(true);
    });

    it('should return true for "0000-00-00"', () => {
      expect(isEmptyValue('0000-00-00')).toBe(true);
    });

    it('should return true for "n/a"', () => {
      expect(isEmptyValue('n/a')).toBe(true);
      expect(isEmptyValue('N/A')).toBe(true);
    });

    it('should return false for valid values', () => {
      expect(isEmptyValue('valid text')).toBe(false);
      expect(isEmptyValue(123)).toBe(false);
      expect(isEmptyValue('2024-01-01')).toBe(false);
      expect(isEmptyValue('PT. ABC')).toBe(false);
    });

    it('should handle whitespace', () => {
      expect(isEmptyValue('   ')).toBe(true);
      expect(isEmptyValue('  -  ')).toBe(true);
    });
  });

  describe('shouldHideColumn', () => {
    it('should not hide actions column', () => {
      const data = [{ actions: 'test' }];
      expect(shouldHideColumn('actions', data)).toBe(false);
    });

    it('should not hide column with empty data', () => {
      expect(shouldHideColumn('test', [])).toBe(false);
    });

    it('should hide column with >50% empty values', () => {
      const data = [
        { test: '-' },
        { test: 'none' },
        { test: '' },
        { test: 'valid' },
      ];
      expect(shouldHideColumn('test', data)).toBe(true);
    });

    it('should not hide column with <=50% empty values', () => {
      const data = [
        { test: 'valid1' },
        { test: 'valid2' },
        { test: '-' },
        { test: 'valid3' },
      ];
      expect(shouldHideColumn('test', data)).toBe(false);
    });

    it('should hide column with all empty values', () => {
      const data = [
        { test: '-' },
        { test: 'none' },
        { test: '' },
        { test: '0000-00-00' },
      ];
      expect(shouldHideColumn('test', data)).toBe(true);
    });

    it('should not hide column with all valid values', () => {
      const data = [
        { test: 'value1' },
        { test: 'value2' },
        { test: 'value3' },
      ];
      expect(shouldHideColumn('test', data)).toBe(false);
    });
  });
});

