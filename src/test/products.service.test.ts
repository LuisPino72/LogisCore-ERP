import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  createProduct, 
  updateProduct, 
  deleteProduct, 
  updateStock, 
  getProductById 
} from '../features/inventory/services/products.service';
import { isOk, isErr } from '@/types/result';

vi.mock('@/store/useTenantStore', () => ({
  useTenantStore: {
    getState: vi.fn(() => ({
      currentTenant: { slug: 'test-tenant', id: 'uuid-123' },
    })),
  },
}));

vi.mock('@/lib/sync/SyncEngine', () => ({
  SyncEngine: {
    addToQueue: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/events/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
  },
  Events: {
    INVENTORY_UPDATED: 'inventory.updated',
    STOCK_LOW: 'stock.low',
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    products: {
      add: vi.fn().mockResolvedValue(1),
      put: vi.fn().mockResolvedValue(1),
      delete: vi.fn().mockResolvedValue(undefined),
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      first: vi.fn(),
      toArray: vi.fn().mockResolvedValue([]),
    },
  },
}));

describe('Products Service', () => {
  let mockDb: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const db = await import('@/lib/db');
    mockDb = db.db;
  });

  describe('createProduct', () => {
    it('debe crear un producto válido', async () => {
      const data = {
        name: 'Test Product',
        sku: 'SKU-001',
        price: 100,
        cost: 50,
        stock: 10,
        categoryId: 1,
        isActive: true,
      };
      
      const result = await createProduct(data);
      
      expect(isOk(result)).toBe(true);
      expect(mockDb.products.add).toHaveBeenCalled();
    });

    it('debe fallar si el nombre está vacío', async () => {
      const data = { name: '', sku: 'SKU-001', price: 100, cost: 50, stock: 0, isActive: true };
      
      const result = await createProduct(data);
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('nombre');
      }
    });

    it('debe fallar si el nombre es solo espacios', async () => {
      const data = { name: '   ', sku: 'SKU-001', price: 100, cost: 50, stock: 0, isActive: true };
      
      const result = await createProduct(data);
      
      expect(isErr(result)).toBe(true);
    });

    it('debe fallar si el SKU está vacío', async () => {
      const data = { name: 'Product', sku: '', price: 100, cost: 50, stock: 0, isActive: true };
      
      const result = await createProduct(data);
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('SKU');
      }
    });

    it('debe fallar si el precio es negativo', async () => {
      const data = { name: 'Product', sku: 'SKU-001', price: -10, cost: 50, stock: 0, isActive: true };
      
      const result = await createProduct(data);
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('precio');
      }
    });

    it('debe fallar si el stock inicial es negativo', async () => {
      const data = { name: 'Product', sku: 'SKU-001', price: 100, cost: 50, stock: -5, isActive: true };
      
      const result = await createProduct(data);
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('stock');
      }
    });

    it('debe permitir stock cero', async () => {
      const data = { name: 'Product', sku: 'SKU-001', price: 100, cost: 50, stock: 0, isActive: true };
      
      const result = await createProduct(data);
      
      expect(isOk(result)).toBe(true);
    });

    it('debe permitir precio cero', async () => {
      const data = { name: 'Product', sku: 'SKU-001', price: 0, cost: 0, stock: 10, isActive: true };
      
      const result = await createProduct(data);
      
      expect(isOk(result)).toBe(true);
    });
  });

  describe('getProductById', () => {
    it('debe obtener un producto por localId', async () => {
      const product = { localId: 'prod-123', tenantId: 'test-tenant', name: 'Test' };
      mockDb.products.first.mockResolvedValue(product);
      
      const result = await getProductById('prod-123');
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.name).toBe('Test');
      }
    });

    it('debe fallar si el producto no existe', async () => {
      mockDb.products.first.mockResolvedValue(null);
      
      const result = await getProductById('non-existent');
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });

  describe('updateProduct', () => {
    it('debe actualizar un producto existente', async () => {
      const product = { localId: 'prod-123', tenantId: 'test-tenant', name: 'Original', price: 100 };
      mockDb.products.first.mockResolvedValue(product);
      
      const result = await updateProduct('prod-123', { name: 'Updated', price: 150 });
      
      expect(isOk(result)).toBe(true);
      expect(mockDb.products.put).toHaveBeenCalled();
    });

    it('debe fallar si el producto no existe', async () => {
      mockDb.products.first.mockResolvedValue(null);
      
      const result = await updateProduct('non-existent', { name: 'Test' });
      
      expect(isErr(result)).toBe(true);
    });

    it('debe mantener datos originales al actualizar parcialmente', async () => {
      const product = { localId: 'prod-123', tenantId: 'test-tenant', name: 'Original', price: 100, sku: 'SKU-001' };
      mockDb.products.first.mockResolvedValue(product);
      
      const result = await updateProduct('prod-123', { price: 200 });
      
      expect(isOk(result)).toBe(true);
      const putCall = mockDb.products.put.mock.calls[0][0];
      expect(putCall.name).toBe('Original');
      expect(putCall.sku).toBe('SKU-001');
    });
  });

  describe('deleteProduct', () => {
    it('debe eliminar un producto existente', async () => {
      const product = { id: 1, localId: 'prod-123', tenantId: 'test-tenant' };
      mockDb.products.first.mockResolvedValue(product);
      
      const result = await deleteProduct('prod-123');
      
      expect(isOk(result)).toBe(true);
      expect(mockDb.products.delete).toHaveBeenCalled();
    });

    it('debe fallar si el producto no existe', async () => {
      mockDb.products.first.mockResolvedValue(null);
      
      const result = await deleteProduct('non-existent');
      
      expect(isErr(result)).toBe(true);
    });
  });

  describe('updateStock', () => {
    it('debe incrementar el stock correctamente', async () => {
      const product = { localId: 'prod-123', tenantId: 'test-tenant', name: 'Test', stock: 10 };
      mockDb.products.first.mockResolvedValue(product);
      
      const result = await updateStock('prod-123', 5);
      
      expect(isOk(result)).toBe(true);
      const putCall = mockDb.products.put.mock.calls[0][0];
      expect(putCall.stock).toBe(15);
    });

    it('debe decrementar el stock correctamente', async () => {
      const product = { localId: 'prod-123', tenantId: 'test-tenant', name: 'Test', stock: 10 };
      mockDb.products.first.mockResolvedValue(product);
      
      const result = await updateStock('prod-123', -3);
      
      expect(isOk(result)).toBe(true);
      const putCall = mockDb.products.put.mock.calls[0][0];
      expect(putCall.stock).toBe(7);
    });

    it('debe fallar si el stock resulta negativo', async () => {
      const product = { localId: 'prod-123', tenantId: 'test-tenant', name: 'Test', stock: 5 };
      mockDb.products.first.mockResolvedValue(product);
      
      const result = await updateStock('prod-123', -10);
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('insuficiente');
      }
    });

    it('debe fallar si el producto no existe', async () => {
      mockDb.products.first.mockResolvedValue(null);
      
      const result = await updateStock('non-existent', 5);
      
      expect(isErr(result)).toBe(true);
    });

    it('debe emitir evento STOCK_LOW cuando stock <= 10', async () => {
      const product = { localId: 'prod-123', tenantId: 'test-tenant', name: 'Test', stock: 10 };
      mockDb.products.first.mockResolvedValue(product);
      
      await updateStock('prod-123', 0);
      
      const { EventBus } = await import('@/lib/events/EventBus');
      expect(EventBus.emit).toHaveBeenCalledWith(
        'stock.low',
        expect.any(Object)
      );
    });

    it('no debe emitir STOCK_LOW si stock > 10', async () => {
      const product = { localId: 'prod-123', tenantId: 'test-tenant', name: 'Test', stock: 20 };
      mockDb.products.first.mockResolvedValue(product);
      
      await updateStock('prod-123', -5);
      
      const { EventBus } = await import('@/lib/events/EventBus');
      expect(EventBus.emit).not.toHaveBeenCalledWith(
        'stock.low',
        expect.any(Object)
      );
    });
  });
});
