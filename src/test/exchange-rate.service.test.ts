import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatBs, shouldUpdateRate } from '../features/exchange-rate/services/exchangeRate.service';

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

vi.mock('@/lib/db', () => ({
  db: {
    settings: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      first: vi.fn(),
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
}));

vi.mock('@/lib/events/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
  },
  Events: {
    EXCHANGE_RATE_UPDATED: 'exchange.rate.updated',
  },
}));

describe('Exchange Rate Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatBs', () => {
    it('debe formatear un número correctamente en formato venezolano', () => {
      const result = formatBs(1000);
      expect(result).toContain('Bs');
      expect(result).toMatch(/\d{1,3}(\.\d{3})*,\d{2}/);
    });

    it('debe formatear números decimales correctamente', () => {
      const result = formatBs(1234.56);
      expect(result).toContain('1.234,56');
    });

    it('debe formatear cero correctamente', () => {
      const result = formatBs(0);
      expect(result).toContain('0');
    });

    it('debe formatear números grandes correctamente', () => {
      const result = formatBs(1000000);
      expect(result).toContain('1.000.000');
    });
  });

  describe('shouldUpdateRate', () => {
    it('debe retornar true si lastUpdated es null', () => {
      const result = shouldUpdateRate(null);
      expect(result).toBe(true);
    });

    it('debe retornar true si han pasado más de 12 horas', () => {
      const lastUpdated = new Date(Date.now() - (13 * 60 * 60 * 1000));
      const result = shouldUpdateRate(lastUpdated);
      expect(result).toBe(true);
    });

    it('debe retornar false si han pasado menos de 12 horas', () => {
      const lastUpdated = new Date(Date.now() - (6 * 60 * 60 * 1000));
      const result = shouldUpdateRate(lastUpdated);
      expect(result).toBe(false);
    });

    it('debe retornar true si han pasado más de 12 horas', () => {
      const lastUpdated = new Date(Date.now() - (13 * 60 * 60 * 1000));
      const result = shouldUpdateRate(lastUpdated);
      expect(result).toBe(true);
    });
  });
});
