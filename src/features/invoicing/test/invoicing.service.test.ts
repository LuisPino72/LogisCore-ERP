import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getTaxpayerInfo,
  saveTaxpayerInfo,
  getInvoiceSettings,
  saveInvoiceSettings,
  getNextInvoiceNumber,
  validateInvoiceInput,
  calculateTotals,
  formatRif,
} from '../services/invoicing.service';
import { IGTF_PERCENTAGE } from '../types/invoicing.types';
import { isOk } from '@/lib/types/result';

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
    taxpayerInfo: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      first: vi.fn(),
      add: vi.fn().mockResolvedValue(1),
      put: vi.fn().mockResolvedValue(undefined),
    },
    invoiceSettings: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      first: vi.fn(),
      add: vi.fn().mockResolvedValue(1),
      put: vi.fn().mockResolvedValue(undefined),
    },
    invoices: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
      add: vi.fn().mockResolvedValue(1),
      filter: vi.fn().mockReturnThis(),
      first: vi.fn(),
      put: vi.fn().mockResolvedValue(undefined),
    },
    transaction: vi.fn((_mode, _tables, callback) => callback()),
  },
}));

vi.mock('@/features/exchange-rate/services/exchangeRate.service', () => ({
  getExchangeRate: vi.fn().mockResolvedValue({ 
    ok: true, 
    value: { rate: 36.50, updatedAt: new Date(), source: 'api' } 
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
  logCategories: {
    SYNC: 'SYNC',
    AUTH: 'AUTH',
    INVENTORY: 'INVENTORY',
    SALES: 'SALES',
    DATABASE: 'DATABASE',
    UI: 'UI',
    ACCOUNTING: 'ACCOUNTING',
    INVOICING: 'INVOICING',
  },
}));

describe('Invoicing Service', () => {
  let mockDb: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const db = await import('@/lib/db');
    mockDb = db.db;
  });

  describe('getTaxpayerInfo', () => {
    it('should return taxpayer info when exists', async () => {
      const mockInfo = {
        localId: 'tax-1',
        tenantId: 'test-tenant',
        rif: 'J-12345678-9',
        razonSocial: 'Empresa Test C.A.',
        direccionFiscal: 'Caracas, Venezuela',
      };
      mockDb.taxpayerInfo.first.mockResolvedValue(mockInfo);

      const result = await getTaxpayerInfo();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual(mockInfo);
      }
    });

    it('should return null when no taxpayer info', async () => {
      mockDb.taxpayerInfo.first.mockResolvedValue(null);

      const result = await getTaxpayerInfo();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe('saveTaxpayerInfo', () => {
    it('should create new taxpayer info', async () => {
      mockDb.taxpayerInfo.first.mockResolvedValue(null);
      mockDb.taxpayerInfo.add.mockResolvedValue(1);

      const input = {
        localId: 'new-tax-1',
        tenantId: 'test-tenant',
        rif: 'J-12345678-9',
        razonSocial: 'Nueva Empresa C.A.',
        direccionFiscal: 'Caracas',
        numeroProvidencia: 'SENIAT-0071',
      };

      const result = await saveTaxpayerInfo(input);

      expect(isOk(result)).toBe(true);
      expect(mockDb.taxpayerInfo.add).toHaveBeenCalled();
    });

    it('should update existing taxpayer info', async () => {
      const existing = {
        localId: 'existing-tax',
        tenantId: 'test-tenant',
        rif: 'J-11111111-1',
        razonSocial: 'Vieja Empresa',
        direccionFiscal: 'Anterior',
        numeroProvidencia: 'SENIAT-0001',
      };
      mockDb.taxpayerInfo.first.mockResolvedValue(existing);
      mockDb.taxpayerInfo.put.mockResolvedValue(undefined);

      const input = {
        localId: 'existing-tax',
        tenantId: 'test-tenant',
        rif: 'J-22222222-2',
        razonSocial: 'Empresa Actualizada',
        direccionFiscal: 'Nueva Dirección',
        numeroProvidencia: 'SENIAT-0071',
      };

      const result = await saveTaxpayerInfo(input);

      expect(isOk(result)).toBe(true);
      expect(mockDb.taxpayerInfo.put).toHaveBeenCalled();
    });
  });

  describe('getInvoiceSettings', () => {
    it('should return settings when exists', async () => {
      const mockSettings = {
        localId: 'settings-1',
        tenantId: 'test-tenant',
        sequentialType: 'daily',
        lastInvoiceNumber: 100,
        lastControlPrefix: '26',
        igtfEnabled: true,
        igtfPercentage: IGTF_PERCENTAGE,
      };
      mockDb.invoiceSettings.first.mockResolvedValue(mockSettings);

      const result = await getInvoiceSettings();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual(mockSettings);
      }
    });

    it('should return null when no settings', async () => {
      mockDb.invoiceSettings.first.mockResolvedValue(null);

      const result = await getInvoiceSettings();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe('saveInvoiceSettings', () => {
    it('should create new settings', async () => {
      mockDb.invoiceSettings.first.mockResolvedValue(null);
      mockDb.invoiceSettings.add.mockResolvedValue(1);

      const result = await saveInvoiceSettings({
        sequentialType: 'monthly',
        igtfEnabled: true,
      });

      expect(isOk(result)).toBe(true);
      expect(mockDb.invoiceSettings.add).toHaveBeenCalled();
    });

    it('should update existing settings', async () => {
      const existing = {
        localId: 'existing-settings',
        tenantId: 'test-tenant',
        sequentialType: 'daily',
        lastInvoiceNumber: 50,
        igtfEnabled: false,
        igtfPercentage: 3,
      };
      mockDb.invoiceSettings.first.mockResolvedValue(existing);
      mockDb.invoiceSettings.put.mockResolvedValue(undefined);

      const result = await saveInvoiceSettings({
        sequentialType: 'global',
        igtfEnabled: true,
      });

      expect(isOk(result)).toBe(true);
      expect(mockDb.invoiceSettings.put).toHaveBeenCalled();
    });
  });

  describe('getNextInvoiceNumber', () => {
    it('should generate first invoice number when no settings', async () => {
      mockDb.invoiceSettings.first.mockResolvedValue(null);

      const result = await getNextInvoiceNumber();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.invoiceNumber).toBe('000001');
      }
    });

    it('should increment invoice number for daily sequential', async () => {
      const today = new Date().toISOString().split('T')[0];
      const existing = {
        localId: 'settings-1',
        tenantId: 'test-tenant',
        sequentialType: 'daily',
        lastInvoiceNumber: 5,
        lastInvoiceDate: today,
        lastControlPrefix: today.slice(-2),
        igtfEnabled: true,
        igtfPercentage: 3,
      };
      mockDb.invoiceSettings.first.mockResolvedValue(existing);

      const result = await getNextInvoiceNumber();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.invoiceNumber).toBe('000006');
      }
    });

    it('should reset to 1 for new day in daily sequential', async () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const existing = {
        localId: 'settings-1',
        tenantId: 'test-tenant',
        sequentialType: 'daily',
        lastInvoiceNumber: 999,
        lastInvoiceDate: yesterday,
        lastControlPrefix: yesterday.slice(-2),
        igtfEnabled: true,
        igtfPercentage: 3,
      };
      mockDb.invoiceSettings.first.mockResolvedValue(existing);

      const result = await getNextInvoiceNumber();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.invoiceNumber).toBe('000001');
      }
    });
  });

  describe('validateInvoiceInput', () => {
    it('should return empty errors for valid input', () => {
      const input = {
        clienteNombre: 'Juan Pérez',
        clienteRifCedula: 'V-12345678-9',
        items: [
          {
            codigo: 'PROD-001',
            descripcion: 'Producto Test',
            cantidad: 1,
            precioUnitarioUsd: 10.00,
          },
        ],
      };

      const errors = validateInvoiceInput(input);
      expect(errors).toHaveLength(0);
    });

    it('should return error for empty client name', () => {
      const input = {
        clienteNombre: '',
        clienteRifCedula: 'V-12345678-9',
        items: [{ codigo: '1', descripcion: 'Test', cantidad: 1, precioUnitarioUsd: 10 }],
      };

      const errors = validateInvoiceInput(input);
      expect(errors).toContain('El nombre del cliente es requerido');
    });

    it('should return error for invalid RIF format', () => {
      const input = {
        clienteNombre: 'Juan Pérez',
        clienteRifCedula: '12345',
        items: [{ codigo: '1', descripcion: 'Test', cantidad: 1, precioUnitarioUsd: 10 }],
      };

      const errors = validateInvoiceInput(input);
      expect(errors).toContain('El formato del RIF/Cédula no es válido');
    });

    it('should return error for empty items', () => {
      const input = {
        clienteNombre: 'Juan Pérez',
        clienteRifCedula: 'V-12345678-9',
        items: [],
      };

      const errors = validateInvoiceInput(input);
      expect(errors).toContain('La factura debe tener al menos un producto');
    });

    it('should return error for zero quantity', () => {
      const input = {
        clienteNombre: 'Juan Pérez',
        clienteRifCedula: 'V-12345678-9',
        items: [{ codigo: '1', descripcion: 'Test', cantidad: 0, precioUnitarioUsd: 10 }],
      };

      const errors = validateInvoiceInput(input);
      expect(errors).toContain('La cantidad debe ser mayor a 0');
    });
  });

  describe('calculateTotals', () => {
    it('should calculate correct totals with IVA and IGTF', () => {
      const items = [
        {
          codigo: 'PROD-001',
          descripcion: 'Producto Test',
          cantidad: 2,
          unidad: 'UND',
          precioUnitarioUsd: 10.00,
          tasaBcvItem: 36.50,
          alicuotaIva: 16 as 0 | 8 | 16,
          exento: false,
          totalBs: 730.00,
        },
      ];

      const totals = calculateTotals(items as any, 36.50, true, IGTF_PERCENTAGE);

      expect(totals.subtotalUsd).toBe(20.00);
      expect(totals.baseImponibleBs).toBe(730.00);
      expect(totals.montoIvaBs).toBe(116.80);
      expect(totals.totalBs).toBe(846.80);
      expect(totals.aplicaIgtf).toBe(true);
      expect(totals.montoIgtfBs).toBeCloseTo(25.40, 1);
    });

    it('should handle exento items correctly', () => {
      const items = [
        {
          codigo: 'PROD-001',
          descripcion: 'Producto Exento',
          cantidad: 1,
          unidad: 'UND',
          precioUnitarioUsd: 100.00,
          tasaBcvItem: 36.50,
          alicuotaIva: 0 as 0 | 8 | 16,
          exento: true,
          totalBs: 3650.00,
        },
      ];

      const totals = calculateTotals(items as any, 36.50, false, IGTF_PERCENTAGE);

      expect(totals.baseImponibleBs).toBe(0);
      expect(totals.montoIvaBs).toBe(0);
      expect(totals.montoExentoBs).toBe(3650.00);
      expect(totals.totalBs).toBe(3650.00);
    });

    it('should not apply IGTF when disabled', () => {
      const items = [
        {
          codigo: 'PROD-001',
          descripcion: 'Producto',
          cantidad: 1,
          unidad: 'UND',
          precioUnitarioUsd: 100.00,
          tasaBcvItem: 36.50,
          alicuotaIva: 16 as 0 | 8 | 16,
          exento: false,
          totalBs: 3650.00,
        },
      ];

      const totals = calculateTotals(items as any, 36.50, false, IGTF_PERCENTAGE);

      expect(totals.aplicaIgtf).toBe(false);
      expect(totals.montoIgtfBs).toBe(0);
    });
  });

  describe('formatRif', () => {
    it('should format RIF with hyphens', () => {
      expect(formatRif('J123456789')).toBe('J-12345678-9');
    });

    it('should return uppercase', () => {
      expect(formatRif('j-12345678-9')).toBe('J-12345678-9');
    });

    it('should not modify already formatted RIF', () => {
      expect(formatRif('J-12345678-9')).toBe('J-12345678-9');
    });
  });
});
