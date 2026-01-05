import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock Electron API
Object.defineProperty(window, 'electronAPI', {
  value: {
    loadStorage: vi.fn().mockResolvedValue({ success: false, data: null }),
    saveStorage: vi.fn().mockResolvedValue({ success: false }),
    deleteStorage: vi.fn().mockResolvedValue({ success: false }),
    readDataFiles: vi.fn().mockResolvedValue({}),
  },
  writable: true,
});

// Mock fetch
global.fetch = vi.fn();

// Mock alert
global.alert = vi.fn();

// Mock confirm
global.confirm = vi.fn(() => true);

// Mock window.open
global.window.open = vi.fn();

