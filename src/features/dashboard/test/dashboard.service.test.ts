import { describe, it, expect, vi } from 'vitest';
import { getDashboardData } from '../services/dashboard.service';
import { isOk, isErr } from '@/lib/types/result';

vi.mock('@/lib/db', () => ({
  db: {
    products: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
    },
    sales: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
    },
    categories: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
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
  },
}));

describe('Dashboard Service', () => {
  describe('getDashboardData', () => {
    it('debe fallar si el tenantSlug está vacío', async () => {
      const result = await getDashboardData('');
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('INVALID_TENANT');
      }
    });

    it('debe retornar datos del dashboard correctamente', async () => {
      const mockDb = await import('@/lib/db');
      
      vi.mocked(mockDb.db.products.where).mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([
            { localId: 'p1', name: 'Product 1', stock: 15, price: 100, isActive: true },
          ]),
        }),
      } as any);

      vi.mocked(mockDb.db.sales.where).mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      vi.mocked(mockDb.db.categories.where).mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await getDashboardData('test-tenant');
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.stats).toBeDefined();
        expect(result.value.lowStockProducts).toBeDefined();
      }
    });
  });
});
