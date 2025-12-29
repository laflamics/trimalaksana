import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  showNotification,
  handleEdit,
  handleDelete,
  handleImportExcel,
  handlePrint,
  handleUpdateStatus,
} from '../../src/utils/actions';

describe('Actions Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('showNotification', () => {
    it('should log success notification', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      showNotification('Test message', 'success');
      
      expect(consoleSpy).toHaveBeenCalledWith('[SUCCESS] Test message');
      expect(global.alert).toHaveBeenCalledWith('Test message');
    });

    it('should log error notification', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      showNotification('Error message', 'error');
      
      expect(consoleSpy).toHaveBeenCalledWith('[ERROR] Error message');
      expect(global.alert).toHaveBeenCalledWith('Error message');
    });

    it('should log info notification by default', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      showNotification('Info message');
      
      expect(consoleSpy).toHaveBeenCalledWith('[INFO] Info message');
      expect(global.alert).toHaveBeenCalledWith('Info message');
    });
  });

  describe('handleEdit', () => {
    it('should set editing item and show form', () => {
      const setEditingItem = vi.fn();
      const setShowForm = vi.fn();
      const item = { id: 1, name: 'Test' };
      
      handleEdit(item, setEditingItem, setShowForm);
      
      expect(setEditingItem).toHaveBeenCalledWith(item);
      expect(setShowForm).toHaveBeenCalledWith(true);
    });
  });

  describe('handleDelete', () => {
    it('should delete item when confirmed', async () => {
      const items = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];
      const setItems = vi.fn();
      const storageService = {
        set: vi.fn().mockResolvedValue(undefined),
      };
      
      global.confirm = vi.fn(() => true);
      
      await handleDelete(
        items[0],
        items,
        setItems,
        'test_key',
        storageService,
        'item'
      );
      
      expect(storageService.set).toHaveBeenCalledWith('test_key', [items[1]]);
      expect(setItems).toHaveBeenCalledWith([items[1]]);
    });

    it('should not delete when cancelled', async () => {
      const items = [{ id: 1, name: 'Item 1' }];
      const setItems = vi.fn();
      const storageService = {
        set: vi.fn(),
      };
      
      global.confirm = vi.fn(() => false);
      
      await handleDelete(
        items[0],
        items,
        setItems,
        'test_key',
        storageService,
        'item'
      );
      
      expect(storageService.set).not.toHaveBeenCalled();
      expect(setItems).not.toHaveBeenCalled();
    });
  });

  describe('handleImportExcel', () => {
    it('should create file input element', () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      const clickSpy = vi.fn();
      
      createElementSpy.mockReturnValue({
        type: '',
        accept: '',
        click: clickSpy,
        onchange: null,
      } as any);
      
      handleImportExcel();
      
      expect(createElementSpy).toHaveBeenCalledWith('input');
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('handlePrint', () => {
    it('should open print window', () => {
      const mockWindow = {
        document: {
          write: vi.fn(),
          close: vi.fn(),
        },
        print: vi.fn(),
      };
      
      global.window.open = vi.fn(() => mockWindow as any);
      
      handlePrint({ data: 'test' }, 'Test Document');
      
      expect(global.window.open).toHaveBeenCalledWith('', '_blank');
      expect(mockWindow.document.write).toHaveBeenCalled();
      expect(mockWindow.document.close).toHaveBeenCalled();
      expect(mockWindow.print).toHaveBeenCalled();
    });
  });

  describe('handleUpdateStatus', () => {
    it('should update item status', async () => {
      const items = [
        { id: 1, name: 'Item 1', status: 'pending' },
        { id: 2, name: 'Item 2', status: 'pending' },
      ];
      const setItems = vi.fn();
      const storageService = {
        set: vi.fn().mockResolvedValue(undefined),
      };
      
      await handleUpdateStatus(
        items[0],
        'completed',
        items,
        setItems,
        'test_key',
        storageService
      );
      
      const updatedItem = {
        ...items[0],
        status: 'completed',
        updatedAt: expect.any(String),
      };
      
      expect(storageService.set).toHaveBeenCalledWith(
        'test_key',
        expect.arrayContaining([updatedItem, items[1]])
      );
      expect(setItems).toHaveBeenCalled();
    });
  });
});

