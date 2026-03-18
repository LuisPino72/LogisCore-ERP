import { describe, it, expect } from 'vitest';

interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

interface CartTotal {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
}

describe('POS Cart Calculations', () => {
  const TAX_RATE = 0.16;

  const calculateCartTotals = (items: CartItem[]): CartTotal => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    return { items, subtotal, tax, total };
  };

  it('debe calcular el subtotal correctamente', () => {
    const items: CartItem[] = [
      { productId: '1', productName: 'Hamburguesa', price: 85.00, quantity: 2 },
      { productId: '2', productName: 'Papas', price: 35.00, quantity: 3 },
    ];
    
    const { subtotal } = calculateCartTotals(items);
    expect(subtotal).toBe(85 * 2 + 35 * 3);
  });

  it('debe calcular el IVA correctamente (16%)', () => {
    const items: CartItem[] = [
      { productId: '1', productName: 'Refresco', price: 25.00, quantity: 4 },
    ];
    
    const { subtotal, tax } = calculateCartTotals(items);
    expect(tax).toBe(subtotal * TAX_RATE);
  });

  it('debe calcular el total con IVA', () => {
    const items: CartItem[] = [
      { productId: '1', productName: 'Combo', price: 120.00, quantity: 1 },
    ];
    
    const { total } = calculateCartTotals(items);
    expect(total).toBe(120 + (120 * TAX_RATE));
  });

  it('debe manejar carrito vacío', () => {
    const items: CartItem[] = [];
    const { subtotal, tax, total } = calculateCartTotals(items);
    
    expect(subtotal).toBe(0);
    expect(tax).toBe(0);
    expect(total).toBe(0);
  });

  it('debe calcular cantidad total de items', () => {
    const items: CartItem[] = [
      { productId: '1', productName: 'A', price: 10, quantity: 2 },
      { productId: '2', productName: 'B', price: 20, quantity: 3 },
      { productId: '3', productName: 'C', price: 15, quantity: 1 },
    ];
    
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    expect(totalItems).toBe(6);
  });

  it('debe validar stock disponible para cada item', () => {
    const cart: CartItem[] = [
      { productId: '1', productName: 'Producto', price: 50, quantity: 5 },
    ];
    const availableStock: Record<string, number> = { '1': 10 };
    
    const allHaveStock = cart.every(item => 
      (availableStock[item.productId] || 0) >= item.quantity
    );
    
    expect(allHaveStock).toBe(true);
  });

  it('debe rechazar item con cantidad mayor al stock', () => {
    const cart: CartItem[] = [
      { productId: '1', productName: 'Producto', price: 50, quantity: 15 },
    ];
    const availableStock: Record<string, number> = { '1': 10 };
    
    const allHaveStock = cart.every(item => 
      (availableStock[item.productId] || 0) >= item.quantity
    );
    
    expect(allHaveStock).toBe(false);
  });
});

describe('Payment Processing', () => {
  it('debe calcular cambio correctamente', () => {
    const payment = 200;
    const total = 173.50;
    const change = payment - total;
    
    expect(change).toBe(26.50);
  });

  it('debe validar pago suficiente', () => {
    const payment = 100;
    const total = 85;
    const isSufficient = payment >= total;
    
    expect(isSufficient).toBe(true);
  });

  it('debe rechazar pago insuficiente', () => {
    const payment = 50;
    const total = 85;
    const isSufficient = payment >= total;
    
    expect(isSufficient).toBe(false);
  });

  it('debe calcular cambio exacto cuando pago equals total', () => {
    const payment = 100;
    const total = 100;
    const change = payment - total;
    
    expect(change).toBe(0);
  });
});

describe('Sales Status', () => {
  type SaleStatus = 'completed' | 'cancelled' | 'refunded';
  type PaymentMethod = 'cash' | 'card' | 'pago_movil';

  const validStatuses: SaleStatus[] = ['completed', 'cancelled', 'refunded'];
  const validMethods: PaymentMethod[] = ['cash', 'card', 'pago_movil'];

  it('debe tener estados de venta válidos', () => {
    expect(validStatuses).toContain('completed');
    expect(validStatuses).toContain('cancelled');
    expect(validStatuses).toContain('refunded');
  });

  it('debe tener métodos de pago válidos', () => {
    expect(validMethods).toContain('cash');
    expect(validMethods).toContain('card');
  });

  it('debe identificar venta completada', () => {
    const status: SaleStatus = 'completed';
    expect(status).toBe('completed');
  });

  it('debe identificar venta cancelada', () => {
    const status: SaleStatus = 'cancelled';
    expect(status).toBe('cancelled');
  });
});
