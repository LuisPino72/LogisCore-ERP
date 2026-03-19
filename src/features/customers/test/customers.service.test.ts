import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getCustomers, 
  getCustomer, 
  createCustomer, 
  updateCustomer, 
  deleteCustomer,
  validateRif,
  validateCustomerInput,
} from '../services/customers.service';
import { SyncEngine } from '@/lib/sync/SyncEngine';
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

vi.mock('@/lib/db', () => ({
  db: {
    customers: {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          filter: vi.fn().mockReturnValue({
            first: vi.fn(),
            toArray: vi.fn().mockResolvedValue([]),
          }),
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
      toArray: vi.fn().mockResolvedValue([]),
      add: vi.fn().mockResolvedValue(1),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    transaction: vi.fn((_mode, _tables, callback) => callback()),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
  logCategories: {
    SALES: 'sales',
    INVENTORY: 'inventory',
    AUTH: 'auth',
    SYNC: 'sync',
    DATABASE: 'database',
    UI: 'ui',
  },
}));

describe('Customers Service', () => {
  let mockDb: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const db = await import('@/lib/db');
    mockDb = db.db;
  });

  describe('validateRif', () => {
    it('should accept valid J RIF', () => {
      expect(validateRif('J-12345678-9')).toBe(true);
      expect(validateRif('J123456789')).toBe(true);
    });

    it('should accept valid V RIF', () => {
      expect(validateRif('V-12345678-9')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(validateRif('12345')).toBe(false);
      expect(validateRif('')).toBe(false);
    });
  });

  describe('validateCustomerInput', () => {
    it('should return empty errors for valid input', () => {
      const input = {
        nombreRazonSocial: 'Empresa Test C.A.',
        rifCedula: 'J-12345678-9',
      };
      const errors = validateCustomerInput(input);
      expect(errors).toHaveLength(0);
    });

    it('should return error for empty name', () => {
      const input = {
        nombreRazonSocial: '',
        rifCedula: 'J-12345678-9',
      };
      const errors = validateCustomerInput(input);
      expect(errors).toContain('El nombre o razón social es requerido');
    });

    it('should return error for invalid email', () => {
      const input = {
        nombreRazonSocial: 'Empresa Test',
        rifCedula: 'J-12345678-9',
        email: 'invalid-email',
      };
      const errors = validateCustomerInput(input);
      expect(errors).toContain('El formato del email no es válido');
    });
  });

  describe('getCustomers', () => {
    it('should return customers from Dexie', async () => {
      const mockCustomers = [
        { localId: 'cust-1', tenantId: 'test-tenant', nombreRazonSocial: 'Cliente 1' },
      ];
      mockDb.customers.where().equals().toArray.mockResolvedValue(mockCustomers);

      const result = await getCustomers();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual(mockCustomers);
      }
    });

    it('should return empty array when no customers', async () => {
      mockDb.customers.where().equals().toArray.mockResolvedValue([]);

      const result = await getCustomers();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual([]);
      }
    });
  });

  describe('getCustomer', () => {
    it('should return customer by localId', async () => {
      const mockCustomer = { localId: 'cust-1', tenantId: 'test-tenant', nombreRazonSocial: 'Cliente 1' };
      mockDb.customers.where().equals().filter().first.mockResolvedValue(mockCustomer);

      const result = await getCustomer('cust-1');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual(mockCustomer);
      }
    });

    it('should return error when customer not found', async () => {
      mockDb.customers.where().equals().filter().first.mockResolvedValue(null);

      const result = await getCustomer('non-existent');

      expect(isErr(result)).toBe(true);
    });
  });

  describe('createCustomer', () => {
    it('should create customer successfully', async () => {
      mockDb.customers.where().equals().filter().first.mockResolvedValue(null);
      mockDb.customers.add.mockResolvedValue('new-id');

      const input = {
        nombreRazonSocial: 'Nuevo Cliente',
        rifCedula: 'V-12345678-9',
      };

      const result = await createCustomer(input);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBeDefined();
      }
      expect(mockDb.customers.add).toHaveBeenCalled();
      expect(SyncEngine.addToQueue).toHaveBeenCalled();
    });

    it('should fail for duplicate RIF', async () => {
      mockDb.customers.where().equals().filter().first.mockResolvedValue({ localId: 'existing', rifCedula: 'V-12345678-9' });

      const input = {
        nombreRazonSocial: 'Nuevo Cliente',
        rifCedula: 'V-12345678-9',
      };

      const result = await createCustomer(input);

      expect(isErr(result)).toBe(true);
    });
  });

  describe('updateCustomer', () => {
    it('should update customer successfully', async () => {
      const existingCustomer = { 
        localId: 'cust-1', 
        tenantId: 'test-tenant', 
        nombreRazonSocial: 'Cliente Original',
        rifCedula: 'V-12345678-9',
      };
      mockDb.customers.where().equals().filter().first.mockResolvedValue(existingCustomer);
      mockDb.customers.put.mockResolvedValue(undefined);

      const result = await updateCustomer('cust-1', { nombreRazonSocial: 'Cliente Actualizado' });

      expect(isOk(result)).toBe(true);
      expect(mockDb.customers.put).toHaveBeenCalled();
    });

    it('should fail when customer not found', async () => {
      mockDb.customers.where().equals().filter().first.mockResolvedValue(null);

      const result = await updateCustomer('non-existent', { nombreRazonSocial: 'Test' });

      expect(isErr(result)).toBe(true);
    });
  });

  describe('deleteCustomer', () => {
    it('should deactivate customer (soft delete)', async () => {
      const existingCustomer = { 
        localId: 'cust-1', 
        tenantId: 'test-tenant', 
        isActive: true,
      };
      mockDb.customers.where().equals().filter().first.mockResolvedValue(existingCustomer);
      mockDb.customers.put.mockResolvedValue(undefined);

      const result = await deleteCustomer('cust-1');

      expect(isOk(result)).toBe(true);
      expect(mockDb.customers.put).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false })
      );
    });

    it('should fail when customer not found', async () => {
      mockDb.customers.where().equals().filter().first.mockResolvedValue(null);

      const result = await deleteCustomer('non-existent');

      expect(isErr(result)).toBe(true);
    });
  });
});
