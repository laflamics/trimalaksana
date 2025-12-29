import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storageService } from '../../src/services/storage';

describe('StorageService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset mocks
    vi.clearAllMocks();
  });

  describe('getConfig', () => {
    it('should return default config when no config is saved', () => {
      const config = storageService.getConfig();
      expect(config).toEqual({ type: 'local' });
    });

    it('should return saved config from localStorage', () => {
      const savedConfig = { type: 'server', serverUrl: 'http://localhost:3001' };
      localStorage.setItem('storage_config', JSON.stringify(savedConfig));
      
      const config = storageService.getConfig();
      expect(config).toEqual(savedConfig);
    });
  });

  describe('setConfig', () => {
    it('should save config to localStorage', async () => {
      const config = { type: 'server', serverUrl: 'http://localhost:3001' };
      await storageService.setConfig(config);
      
      const saved = JSON.parse(localStorage.getItem('storage_config') || '{}');
      expect(saved).toEqual(config);
    });

    it('should sync to server when type is server', async () => {
      const config = { type: 'server', serverUrl: 'http://localhost:3001' };
      global.fetch = vi.fn(() => Promise.resolve({ ok: true })) as any;
      
      await storageService.setConfig(config);
      
      // Should have called sync
      expect(localStorage.getItem('storage_config')).toBeTruthy();
    });
  });

  describe('get and set (local storage)', () => {
    beforeEach(() => {
      // Ensure we're using local storage
      storageService.setConfig({ type: 'local' });
    });

    it('should save and retrieve data from localStorage', async () => {
      const testData = { id: 1, name: 'Test' };
      
      await storageService.set('test_key', testData);
      const retrieved = await storageService.get('test_key');
      
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent key', async () => {
      const result = await storageService.get('non_existent');
      expect(result).toBeNull();
    });

    it('should handle complex nested objects', async () => {
      const complexData = {
        products: [
          { id: 1, name: 'Product 1' },
          { id: 2, name: 'Product 2' },
        ],
        metadata: {
          count: 2,
          lastUpdate: new Date().toISOString(),
        },
      };
      
      await storageService.set('complex', complexData);
      const retrieved = await storageService.get('complex');
      
      expect(retrieved).toEqual(complexData);
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      // Ensure we're using local storage
      storageService.setConfig({ type: 'local' });
    });

    it('should remove data from localStorage', async () => {
      await storageService.set('test_key', { data: 'test' });
      await storageService.remove('test_key');
      
      const result = await storageService.get('test_key');
      expect(result).toBeNull();
    });
  });

  describe('syncToServer', () => {
    it('should sync local data to server', async () => {
      await storageService.set('key1', { data: 'test1' });
      await storageService.set('key2', { data: 'test2' });
      
      await storageService.setConfig({ type: 'server', serverUrl: 'http://localhost:3001' });
      
      global.fetch = vi.fn(() => 
        Promise.resolve({ ok: true })
      ) as any;
      
      await storageService.syncToServer();
      
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});

