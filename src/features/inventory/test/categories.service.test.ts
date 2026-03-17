import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCategory, updateCategory, deleteCategory } from '../services/categories.service';
import { db } from '@/lib/db';
import { isOk } from '@/lib/types/result';

// Mocking dependencies
vi.mock('@/store/useTenantStore', () => ({
  useTenantStore: {
    getState: vi.fn(() => ({
      currentTenant: { slug: 'test-tenant' },
    })),
  },
}));

vi.mock('@/lib/sync/SyncEngine', () => ({
  SyncEngine: {
    addToQueue: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock Dexie
vi.mock('@/lib/db', () => ({
  db: {
    categories: {
      add: vi.fn().mockResolvedValue(1),
      put: vi.fn().mockResolvedValue(1),
      delete: vi.fn().mockResolvedValue(undefined),
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      first: vi.fn(),
      toArray: vi.fn().mockResolvedValue([]),
    },
    products: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      count: vi.fn().mockResolvedValue(0),
    }
  },
}));

describe('Categories Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCategory', () => {
    it('debe crear una categoría válida', async () => {
      const data = { name: 'Electrónica', description: 'Gadgets' };
      const result = await createCategory(data);
      
      expect(isOk(result)).toBe(true);
      expect(db.categories.add).toHaveBeenCalled();
    });

    it('debe fallar si el nombre está vacío', async () => {
      const data = { name: '', description: 'Gadgets' };
      const result = await createCategory(data);
      
      expect(isOk(result)).toBe(false);
      if (!isOk(result)) {
        expect(result.error.message).toContain('nombre');
      }
    });
  });

  describe('updateCategory', () => {
    it('debe actualizar una categoría existente', async () => {
      const localId = 'cat-123';
      (db.categories as any).first.mockResolvedValue({ localId, tenantId: 'test-tenant', name: 'Original' });
      
      const result = await updateCategory(localId, { name: 'Actualizado' });
      
      expect(isOk(result)).toBe(true);
      expect(db.categories.put).toHaveBeenCalled();
    });

    it('debe fallar si la categoría no existe', async () => {
      (db.categories as any).first.mockResolvedValue(null);
      const result = await updateCategory('non-existent', { name: 'Test' });
      
      expect(isOk(result)).toBe(false);
    });
  });

  describe('deleteCategory', () => {
    it('debe eliminar una categoría sin productos', async () => {
      const localId = 'cat-123';
      (db.categories as any).first.mockResolvedValue({ id: 1, localId, tenantId: 'test-tenant' });
      
      const result = await deleteCategory(localId);
      
      expect(isOk(result)).toBe(true);
      expect(db.categories.delete).toHaveBeenCalled();
    });

    it('debe fallar si la categoría tiene productos', async () => {
      const localId = 'cat-123';
      (db.categories as any).first.mockResolvedValue({ id: 1, localId, tenantId: 'test-tenant' });
      (db.products.count as any).mockResolvedValue(5);
      
      const result = await deleteCategory(localId);
      
      expect(isOk(result)).toBe(false);
      if (!isOk(result)) {
        expect(result.error.message).toContain('productos asociados');
      }
    });
  });
});
