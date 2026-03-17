import { describe, it, expect } from 'vitest';

interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  cost: number;
  total: number;
}

interface CreatePurchaseInput {
  supplier: string;
  invoiceNumber: string;
  items: PurchaseItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'completed' | 'cancelled';
}

describe('Purchase Validation', () => {
  const validatePurchaseInput = (data: CreatePurchaseInput): string[] => {
    const errors: string[] = [];
    
    if (!data.supplier?.trim()) {
      errors.push('El proveedor es requerido');
    }
    
    if (!data.invoiceNumber?.trim()) {
      errors.push('El número de factura es requerido');
    }
    
    if (!data.items || data.items.length === 0) {
      errors.push('La compra debe tener al menos un producto');
    }
    
    if (data.total < 0) {
      errors.push('El total no puede ser negativo');
    }
    
    if (!['pending', 'completed', 'cancelled'].includes(data.status)) {
      errors.push('Estado de compra inválido');
    }
    
    for (const item of data.items || []) {
      if (!item.productId) {
        errors.push('Producto inválido');
      }
      if (item.quantity <= 0) {
        errors.push('La cantidad debe ser mayor a 0');
      }
      if (item.cost < 0) {
        errors.push('El costo no puede ser negativo');
      }
    }
    
    return errors;
  };

  it('debe validar compra exitosa', () => {
    const input: CreatePurchaseInput = {
      supplier: 'Distribuidora ABC',
      invoiceNumber: 'FAC-001',
      items: [{ productId: '1', productName: 'Insumo', quantity: 10, cost: 50, total: 500 }],
      subtotal: 500,
      tax: 80,
      total: 580,
      status: 'pending',
    };
    
    const errors = validatePurchaseInput(input);
    expect(errors).toHaveLength(0);
  });

  it('debe rechazar proveedor vacío', () => {
    const input: CreatePurchaseInput = {
      supplier: '',
      invoiceNumber: 'FAC-001',
      items: [{ productId: '1', productName: 'P', quantity: 1, cost: 10, total: 10 }],
      subtotal: 10,
      tax: 0,
      total: 10,
      status: 'pending',
    };
    
    const errors = validatePurchaseInput(input);
    expect(errors).toContain('El proveedor es requerido');
  });

  it('debe rechazar factura vacía', () => {
    const input: CreatePurchaseInput = {
      supplier: 'Proveedor',
      invoiceNumber: '',
      items: [{ productId: '1', productName: 'P', quantity: 1, cost: 10, total: 10 }],
      subtotal: 10,
      tax: 0,
      total: 10,
      status: 'pending',
    };
    
    const errors = validatePurchaseInput(input);
    expect(errors).toContain('El número de factura es requerido');
  });
});
