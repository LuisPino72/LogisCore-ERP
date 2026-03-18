import { describe, it, expect, vi } from 'vitest';
import type { Product } from '@/lib/db';
import type { CartItem } from '../types/pos.types';
import {
  filterProducts,
  addToCart,
  updateCartQuantity,
  removeFromCart,
  calculateCartTotals,
  prepareSaleItems,
  findProductBySku,
} from '../services/pos.service';

vi.mock('@/lib/db', () => ({
  db: {
    products: { where: vi.fn() },
    suspendedSales: { where: vi.fn() },
  },
}));

const createMockProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 1,
  localId: crypto.randomUUID(),
  tenantId: 'tenant-1',
  name: 'Test Product',
  sku: 'TEST001',
  price: 10,
  cost: 5,
  stock: 100,
  isActive: true,
  isFavorite: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('POS Service - filterProducts', () => {
  const mockProducts: Product[] = [
    createMockProduct({ localId: '1', name: 'Hamburguesa', sku: 'HAM001', price: 85, stock: 10, isFavorite: true, categoryId: 1 }),
    createMockProduct({ localId: '2', name: 'Papas', sku: 'PAP001', price: 35, stock: 5, categoryId: 2 }),
    createMockProduct({ localId: '3', name: 'Refresco', sku: 'REF001', price: 25, stock: 0, isFavorite: false, categoryId: 3 }),
    createMockProduct({ localId: '4', name: 'Combo', sku: 'COM001', price: 120, stock: 8, isActive: false, categoryId: 1 }),
  ];

  it('debe filtrar productos por búsqueda de nombre', () => {
    const result = filterProducts(mockProducts, 'hamburguesa', '', undefined, false);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Hamburguesa');
  });

  it('debe filtrar productos por búsqueda de SKU', () => {
    const result = filterProducts(mockProducts, 'PAP001', '', undefined, false);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Papas');
  });

  it('debe filtrar por categoría', () => {
    const result = filterProducts(mockProducts, '', 1, undefined, false);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Hamburguesa');
  });

  it('debe filtrar solo favoritos', () => {
    const result = filterProducts(mockProducts, '', '', undefined, true);
    expect(result).toHaveLength(1);
    expect(result[0].isFavorite).toBe(true);
  });

  it('debe excluir productos sin stock', () => {
    const result = filterProducts(mockProducts, '', '', undefined, false);
    const outOfStock = result.filter(p => p.stock === 0);
    expect(outOfStock).toHaveLength(0);
  });

  it('debe excluir productos inactivos', () => {
    const result = filterProducts(mockProducts, '', '', undefined, false);
    const inactive = result.filter(p => !p.isActive);
    expect(inactive).toHaveLength(0);
  });

  it('debe ordenar por nombre ascendente', () => {
    const products = [mockProducts[1], mockProducts[0]];
    const result = filterProducts(products, '', '', { field: 'name', direction: 'asc' }, false);
    expect(result[0].name).toBe('Hamburguesa');
    expect(result[1].name).toBe('Papas');
  });

  it('debe ordenar por precio descendente', () => {
    const products = [mockProducts[0], mockProducts[1]];
    const result = filterProducts(products, '', '', { field: 'price', direction: 'desc' }, false);
    expect(result[0].price).toBeGreaterThan(result[1].price);
  });
});

describe('POS Service - Cart Operations', () => {
  const createCartItem = (id: string, qty: number): CartItem => ({
    product: createMockProduct({ localId: id, price: 10 }),
    quantity: qty,
  });

  it('debe agregar producto nuevo al carrito', () => {
    const cart: CartItem[] = [];
    const product = createMockProduct({ localId: '1', price: 10 });
    const result = addToCart(cart, product);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(1);
  });

  it('debe incrementar cantidad si producto ya existe', () => {
    const cart = [createCartItem('1', 2)];
    const product = createMockProduct({ localId: '1', price: 10 });
    const result = addToCart(cart, product);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(3);
  });

  it('no debe agregar si stock es insuficiente', () => {
    const cart: CartItem[] = [{ product: createMockProduct({ localId: '1', price: 10, stock: 100 }), quantity: 100 }];
    const product = createMockProduct({ localId: '1', price: 10, stock: 100 });
    const result = addToCart(cart, product);
    expect(result[0].quantity).toBe(100);
  });

  it('debe actualizar cantidad correctamente', () => {
    const cart = [createCartItem('1', 5)];
    const result = updateCartQuantity(cart, '1', 3);
    expect(result[0].quantity).toBe(8);
  });

  it('debe decrementar cantidad', () => {
    const cart = [createCartItem('1', 5)];
    const result = updateCartQuantity(cart, '1', -2);
    expect(result[0].quantity).toBe(3);
  });

  it('debe remover item si cantidad llega a cero', () => {
    const cart = [createCartItem('1', 5)];
    const result = updateCartQuantity(cart, '1', -5);
    expect(result).toHaveLength(0);
  });

  it('debe remover producto del carrito', () => {
    const cart = [createCartItem('1', 5), createCartItem('2', 3)];
    const result = removeFromCart(cart, '1');
    expect(result).toHaveLength(1);
    expect(result[0].product.localId).toBe('2');
  });
});

describe('POS Service - calculateCartTotals', () => {
  it('debe calcular totales correctamente', () => {
    const cart: CartItem[] = [
      { product: createMockProduct({ localId: '1', price: 10 }), quantity: 2 },
      { product: createMockProduct({ localId: '2', price: 15 }), quantity: 3 },
    ];
    const result = calculateCartTotals(cart);
    expect(result.total).toBe(65);
    expect(result.count).toBe(5);
  });

  it('debe manejar carrito vacío', () => {
    const result = calculateCartTotals([]);
    expect(result.total).toBe(0);
    expect(result.count).toBe(0);
  });
});

describe('POS Service - prepareSaleItems', () => {
  it('debe convertir carrito a items de venta', () => {
    const cart: CartItem[] = [
      { product: createMockProduct({ localId: '1', name: 'Test', price: 100 }), quantity: 2 },
    ];
    const result = prepareSaleItems(cart);
    expect(result).toHaveLength(1);
    expect(result[0].productId).toBe('1');
    expect(result[0].quantity).toBe(2);
    expect(result[0].total).toBe(200);
  });
});

describe('POS Service - findProductBySku', () => {
  const products: Product[] = [
    createMockProduct({ localId: '1', sku: 'SKU001' }),
    createMockProduct({ localId: '2', sku: 'sku002' }),
  ];

  it('debe encontrar producto por SKU exacto', () => {
    const result = findProductBySku(products, 'SKU001');
    expect(result?.localId).toBe('1');
  });

  it('debe ser case-insensitive', () => {
    const result = findProductBySku(products, 'sku002');
    expect(result?.localId).toBe('2');
  });

  it('debe retornar undefined si no encuentra', () => {
    const result = findProductBySku(products, 'NOTFOUND');
    expect(result).toBeUndefined();
  });
});
