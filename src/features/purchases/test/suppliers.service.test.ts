import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupplier, updateSupplier, deleteSupplier } from '../services/suppliers.service';
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
    suppliers: {
      add: vi.fn().mockResolvedValue(1),
      put: vi.fn().mockResolvedValue(1),
      delete: vi.fn().mockResolvedValue(undefined),
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      first: vi.fn(),
      toArray: vi.fn().mockResolvedValue([]),
    },
    purchases: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      count: vi.fn().mockResolvedValue(0),
    }
  },
}));

describe('Suppliers Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSupplier', () => {
    it('debe crear un proveedor válido', async () => {
      const data = { name: 'Proveedor S.A.', contactName: 'Juan Perez' };
      const result = await createSupplier(data as any);
      
      expect(isOk(result)).toBe(true);
      expect(db.suppliers.add).toHaveBeenCalled();
    });

    it('debe fallar si el nombre está vacío', async () => {
      const data = { name: '', contactName: 'Juan Perez' };
      const result = await createSupplier(data as any);
      
      expect(isOk(result)).toBe(false);
    });
  });

  describe('updateSupplier', () => {
    it('debe actualizar un proveedor existente', async () => {
      const localId = 'sup-123';
      (db.suppliers as any).first.mockResolvedValue({ localId, tenantId: 'test-tenant', name: 'Original' });
      
      const result = await updateSupplier(localId, { name: 'Nuevo Nombre' });
      
      expect(isOk(result)).toBe(true);
      expect(db.suppliers.put).toHaveBeenCalled();
    });
  });

  describe('deleteSupplier', () => {
    it('debe eliminar un proveedor sin historial', async () => {
      const localId = 'sup-123';
      (db.suppliers as any).first.mockResolvedValue({ id: 1, localId, tenantId: 'test-tenant', name: 'Test' });
      
      const result = await deleteSupplier(localId);
      
      expect(isOk(result)).toBe(true);
      expect(db.suppliers.delete).toHaveBeenCalled();
    });

    it('debe fallar si el proveedor tiene compras registradas', async () => {
      const localId = 'sup-123';
      (db.suppliers as any).first.mockResolvedValue({ id: 1, localId, tenantId: 'test-tenant', name: 'Test' });
      (db.purchases.count as any).mockResolvedValue(1);
      
      const result = await deleteSupplier(localId);
      
      expect(isOk(result)).toBe(false);
      if (!isOk(result)) {
        expect(result.error.message).toContain('historial de compras');
      }
    });
  });
});
