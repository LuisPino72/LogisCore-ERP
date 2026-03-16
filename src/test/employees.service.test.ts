import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEmployees, addEmployee } from '../features/employees/services/employees.service';
import { isOk, isErr } from '@/types/result';

vi.mock('@/store/useTenantStore', () => ({
  useTenantStore: {
    getState: vi.fn(() => ({
      currentTenant: { id: 'uuid-tenant-123', slug: 'test-tenant' },
    })),
  },
}));

vi.mock('@/lib/sync/SyncEngine', () => ({
  SyncEngine: {
    addToQueue: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    })),
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    employees: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
      add: vi.fn().mockResolvedValue(1),
      bulkAdd: vi.fn().mockResolvedValue(undefined),
      bulkPut: vi.fn().mockResolvedValue(undefined),
      filter: vi.fn().mockReturnThis(),
      first: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

describe('Employees Service', () => {
  let mockDb: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const db = await import('@/lib/db');
    mockDb = db.db;
  });

  describe('getEmployees', () => {
    it('debe obtener la lista de empleados desde Dexie', async () => {
      const mockEmployees = [
        { localId: 'emp-1', tenantId: 'test-tenant', userId: 'user-1', role: 'employee' }
      ];
      mockDb.employees.toArray.mockResolvedValue(mockEmployees);

      const result = await getEmployees();
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual(mockEmployees);
      }
    });

    it('debe retornar array vacío si no hay empleados', async () => {
      mockDb.employees.toArray.mockResolvedValue([]);

      const result = await getEmployees();
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual([]);
      }
    });
  });

  describe('addEmployee', () => {
    it('debe agregar un empleado correctamente', async () => {
      const result = await addEmployee('user-123', 'employee', { canSale: true });
      
      expect(isOk(result)).toBe(true);
      expect(mockDb.employees.add).toHaveBeenCalled();
    });

    it('debe fallar si falta userId', async () => {
      const result = await addEmployee('', 'employee');
      
      expect(isErr(result)).toBe(true);
    });
  });
});
