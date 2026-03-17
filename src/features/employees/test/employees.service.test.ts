import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEmployees, createEmployee, deleteEmployee } from '../services/employees.service';
import { DEFAULT_EMPLOYEE_PERMISSIONS } from '../types/employees.types';
import { isOk, isErr } from '@/lib/types/result';

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
    auth: {
      signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
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
      put: vi.fn().mockResolvedValue(undefined),
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

  describe('createEmployee', () => {
    it('debe crear un empleado correctamente', async () => {
      const result = await createEmployee('test@test.com', 'password123', DEFAULT_EMPLOYEE_PERMISSIONS);
      
      expect(isOk(result)).toBe(true);
      expect(mockDb.employees.add).toHaveBeenCalled();
    });

    it('debe fallar si el email es inválido', async () => {
      const result = await createEmployee('', 'password123', DEFAULT_EMPLOYEE_PERMISSIONS);
      
      expect(isErr(result)).toBe(true);
    });

    it('debe fallar si la contraseña es muy corta', async () => {
      const result = await createEmployee('test@test.com', '123', DEFAULT_EMPLOYEE_PERMISSIONS);
      
      expect(isErr(result)).toBe(true);
    });
  });

  describe('deleteEmployee', () => {
    it('debe fallar si el empleado no existe', async () => {
      mockDb.employees.first.mockResolvedValue(null);
      
      const result = await deleteEmployee('non-existent');
      
      expect(isErr(result)).toBe(true);
    });
  });
});
