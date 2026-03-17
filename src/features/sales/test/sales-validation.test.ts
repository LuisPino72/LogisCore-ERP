import { describe, it, expect } from 'vitest';

interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface CreateSaleInput {
  items: SaleItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card';
}

describe('Sales Validation', () => {
  const validateSaleInput = (data: CreateSaleInput): string[] => {
    const errors: string[] = [];
    
    if (!data.items || data.items.length === 0) {
      errors.push('La venta debe tener al menos un producto');
    }
    
    if (data.total < 0) {
      errors.push('El total no puede ser negativo');
    }
    
    if (!['cash', 'card'].includes(data.paymentMethod)) {
      errors.push('Método de pago inválido');
    }
    
    for (const item of data.items || []) {
      if (!item.productId) {
        errors.push('Producto inválido');
      }
      if (item.quantity <= 0) {
        errors.push('La cantidad debe ser mayor a 0');
      }
      if (item.unitPrice < 0) {
        errors.push('El precio no puede ser negativo');
      }
    }
    
    return errors;
  };

  it('debe validar venta exitosa', () => {
    const input: CreateSaleInput = {
      items: [
        { productId: '1', productName: 'Product', quantity: 2, unitPrice: 50, total: 100 }
      ],
      subtotal: 100,
      tax: 16,
      total: 116,
      paymentMethod: 'cash',
    };
    
    const errors = validateSaleInput(input);
    expect(errors).toHaveLength(0);
  });

  it('debe rechazar venta sin productos', () => {
    const input: CreateSaleInput = {
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      paymentMethod: 'cash',
    };
    
    const errors = validateSaleInput(input);
    expect(errors).toContain('La venta debe tener al menos un producto');
  });

  it('debe rechazar total negativo', () => {
    const input: CreateSaleInput = {
      items: [{ productId: '1', productName: 'P', quantity: 1, unitPrice: 10, total: 10 }],
      subtotal: 10,
      tax: 0,
      total: -5,
      paymentMethod: 'cash',
    };
    
    const errors = validateSaleInput(input);
    expect(errors).toContain('El total no puede ser negativo');
  });

  it('debe rechazar método de pago inválido', () => {
    const input: CreateSaleInput = {
      items: [{ productId: '1', productName: 'P', quantity: 1, unitPrice: 10, total: 10 }],
      subtotal: 10,
      tax: 0,
      total: 10,
      paymentMethod: 'bitcoin' as 'cash',
    };
    
    const errors = validateSaleInput(input);
    expect(errors).toContain('Método de pago inválido');
  });

  it('debe rechazar cantidad cero', () => {
    const input: CreateSaleInput = {
      items: [{ productId: '1', productName: 'P', quantity: 0, unitPrice: 10, total: 0 }],
      subtotal: 0,
      tax: 0,
      total: 0,
      paymentMethod: 'cash',
    };
    
    const errors = validateSaleInput(input);
    expect(errors).toContain('La cantidad debe ser mayor a 0');
  });

  it('debe rechazar precio negativo', () => {
    const input: CreateSaleInput = {
      items: [{ productId: '1', productName: 'P', quantity: 1, unitPrice: -10, total: -10 }],
      subtotal: -10,
      tax: 0,
      total: -10,
      paymentMethod: 'cash',
    };
    
    const errors = validateSaleInput(input);
    expect(errors).toContain('El precio no puede ser negativo');
  });
});
