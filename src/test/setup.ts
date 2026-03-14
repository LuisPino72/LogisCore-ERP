import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.mock('dexie', () => {
  return {
    default: class Dexie {
      constructor() {}
      version() { return this; }
      stores() { return this; }
    },
  };
});

Object.defineProperty(window, 'crypto', {
  value: {
    randomUUID: () => Math.random().toString(36).substring(2, 15),
  },
});

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });
