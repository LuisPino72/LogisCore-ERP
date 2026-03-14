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

describe('Purchase Validation', () => {
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

describe('Recipe Validation', () => {
  interface RecipeIngredient {
    productId: string;
    quantity: number;
    unit: string;
  }

  interface CreateRecipeInput {
    name: string;
    description?: string;
    productId: string;
    ingredients: RecipeIngredient[];
    yield: number;
    isActive: boolean;
  }

  const validateRecipeInput = (data: CreateRecipeInput): string[] => {
    const errors: string[] = [];
    
    if (!data.name?.trim()) {
      errors.push('El nombre de la receta es requerido');
    }
    
    if (!data.productId) {
      errors.push('El producto resultado es requerido');
    }
    
    if (!data.ingredients || data.ingredients.length === 0) {
      errors.push('La receta debe tener al menos un ingrediente');
    }
    
    if (data.yield <= 0) {
      errors.push('El rendimiento debe ser mayor a 0');
    }
    
    for (const ing of data.ingredients || []) {
      if (!ing.productId) {
        errors.push('Ingrediente inválido');
      }
      if (ing.quantity <= 0) {
        errors.push('La cantidad del ingrediente debe ser mayor a 0');
      }
    }
    
    return errors;
  };

  it('debe validar receta exitosa', () => {
    const input: CreateRecipeInput = {
      name: 'Hamburguesa Especial',
      description: 'Deliciosa hamburguesa',
      productId: 'prod-hamb',
      ingredients: [
        { productId: '1', quantity: 0.2, unit: 'kg' },
        { productId: '2', quantity: 1, unit: 'pieza' },
      ],
      yield: 1,
      isActive: true,
    };
    
    const errors = validateRecipeInput(input);
    expect(errors).toHaveLength(0);
  });

  it('debe rechazar nombre vacío', () => {
    const input: CreateRecipeInput = {
      name: '',
      productId: 'prod-1',
      ingredients: [{ productId: '1', quantity: 1, unit: 'kg' }],
      yield: 1,
      isActive: true,
    };
    
    const errors = validateRecipeInput(input);
    expect(errors).toContain('El nombre de la receta es requerido');
  });

  it('debe rechazar sin ingredientes', () => {
    const input: CreateRecipeInput = {
      name: 'Receta',
      productId: 'prod-1',
      ingredients: [],
      yield: 1,
      isActive: true,
    };
    
    const errors = validateRecipeInput(input);
    expect(errors).toContain('La receta debe tener al menos un ingrediente');
  });

  it('debe rechazar rendimiento cero', () => {
    const input: CreateRecipeInput = {
      name: 'Receta',
      productId: 'prod-1',
      ingredients: [{ productId: '1', quantity: 1, unit: 'kg' }],
      yield: 0,
      isActive: true,
    };
    
    const errors = validateRecipeInput(input);
    expect(errors).toContain('El rendimiento debe ser mayor a 0');
  });
});
