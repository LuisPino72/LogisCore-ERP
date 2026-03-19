import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MovementType, MovementCategory } from '@/lib/db';
import { 
  getMovements, 
  getMovementById, 
  createMovement, 
  validateMovementInput,
  getMovementStats,
  getCashBalance,
  type CreateMovementInput,
} from '../services/movements.service';
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
    movements: {
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
    },
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

describe('Accounting Service - Movements', () => {
  let mockDb: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const db = await import('@/lib/db');
    mockDb = db.db;
  });

  describe('validateMovementInput', () => {
    it('should return no errors for valid input', () => {
      const input: CreateMovementInput = {
        type: 'income',
        category: 'sale',
        amount: 100,
      };
      const errors = validateMovementInput(input);
      expect(errors).toHaveLength(0);
    });

    it('should return error for invalid type', () => {
      const input = {
        type: 'invalid' as MovementType,
        category: 'sale' as MovementCategory,
        amount: 100,
      };
      const errors = validateMovementInput(input);
      expect(errors).toContain('Tipo de movimiento inválido');
    });

    it('should return error for missing category', () => {
      const input = {
        type: 'income' as MovementType,
        category: '' as MovementCategory,
        amount: 100,
      };
      const errors = validateMovementInput(input);
      expect(errors).toContain('La categoría es requerida');
    });

    it('should return error for zero amount', () => {
      const input: CreateMovementInput = {
        type: 'income',
        category: 'sale',
        amount: 0,
      };
      const errors = validateMovementInput(input);
      expect(errors).toContain('El monto debe ser mayor a 0');
    });

    it('should return error for negative amount', () => {
      const input: CreateMovementInput = {
        type: 'expense',
        category: 'purchase',
        amount: -50,
      };
      const errors = validateMovementInput(input);
      expect(errors).toContain('El monto debe ser mayor a 0');
    });

    it('should return error for amount exceeding limit', () => {
      const input: CreateMovementInput = {
        type: 'income',
        category: 'sale',
        amount: 1000000000,
      };
      const errors = validateMovementInput(input);
      expect(errors).toContain('El monto excede el límite permitido');
    });

    it('should accept expense type', () => {
      const input: CreateMovementInput = {
        type: 'expense',
        category: 'purchase',
        amount: 50,
      };
      const errors = validateMovementInput(input);
      expect(errors).toHaveLength(0);
    });

    it('should accept transfer type', () => {
      const input: CreateMovementInput = {
        type: 'transfer',
        category: 'transfer',
        amount: 100,
      };
      const errors = validateMovementInput(input);
      expect(errors).toHaveLength(0);
    });
  });

  describe('getMovements', () => {
    it('should return movements from Dexie', async () => {
      const mockMovements = [
        { localId: 'mov-1', tenantId: 'test-tenant', type: 'income', category: 'sale', amount: 100 },
        { localId: 'mov-2', tenantId: 'test-tenant', type: 'expense', category: 'purchase', amount: 50 },
      ];
      mockDb.movements.where().equals().toArray.mockResolvedValue(mockMovements);

      const result = await getMovements();

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no movements', async () => {
      mockDb.movements.where().equals().toArray.mockResolvedValue([]);

      const result = await getMovements();

      expect(result).toHaveLength(0);
    });
  });

  describe('getMovementById', () => {
    it('should return movement by localId', async () => {
      const mockMovement = { 
        localId: 'mov-1', 
        tenantId: 'test-tenant', 
        type: 'income', 
        category: 'sale', 
        amount: 100 
      };
      mockDb.movements.where().equals().filter().first.mockResolvedValue(mockMovement);

      const result = await getMovementById('mov-1');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.localId).toBe('mov-1');
      }
    });

    it('should return error when movement not found', async () => {
      mockDb.movements.where().equals().filter().first.mockResolvedValue(null);

      const result = await getMovementById('non-existent');

      expect(isErr(result)).toBe(true);
    });
  });

  describe('createMovement', () => {
    it('should create movement successfully', async () => {
      mockDb.movements.add.mockResolvedValue('new-id');

      const input: CreateMovementInput = {
        type: 'income',
        category: 'sale',
        amount: 100,
        description: 'Test sale',
        paymentMethod: 'cash',
      };

      const result = await createMovement(input);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBeDefined();
      }
      expect(mockDb.movements.add).toHaveBeenCalled();
      expect(SyncEngine.addToQueue).toHaveBeenCalled();
    });

    it('should fail for invalid input', async () => {
      const input: CreateMovementInput = {
        type: 'income',
        category: 'sale',
        amount: 0,
      };

      const result = await createMovement(input);

      expect(isErr(result)).toBe(true);
    });

    it('should use default status completed', async () => {
      mockDb.movements.add.mockResolvedValue('new-id');

      const input: CreateMovementInput = {
        type: 'expense',
        category: 'purchase',
        amount: 50,
      };

      const result = await createMovement(input);

      expect(isOk(result)).toBe(true);
    });

    it('should accept pending status', async () => {
      mockDb.movements.add.mockResolvedValue('new-id');

      const input: CreateMovementInput = {
        type: 'expense',
        category: 'rent',
        amount: 500,
        status: 'pending',
      };

      const result = await createMovement(input);

      expect(isOk(result)).toBe(true);
    });
  });

  describe('getMovementStats', () => {
    it('should return stats structure with correct initial values', async () => {
      mockDb.movements.where().equals().filter().toArray.mockResolvedValue([]);

      const stats = await getMovementStats();

      expect(stats.totalIncome).toBe(0);
      expect(stats.totalExpense).toBe(0);
      expect(stats.totalTransfer).toBe(0);
      expect(stats.netBalance).toBe(0);
      expect(stats.byCategory).toBeDefined();
      expect(stats.byPaymentMethod).toBeDefined();
    });
  });

  describe('getCashBalance', () => {
    it('should return 0 for no cash movements', async () => {
      mockDb.movements.where().equals().filter().toArray.mockResolvedValue([]);

      const balance = await getCashBalance();

      expect(balance).toBe(0);
    });
  });
});
