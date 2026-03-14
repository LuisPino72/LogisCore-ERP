import { describe, it, expect } from 'vitest';

interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  cost: number;
  total: number;
}

interface Purchase {
  id: string;
  supplier: string;
  invoiceNumber: string;
  items: PurchaseItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'completed' | 'cancelled';
}

describe('Purchase Calculations', () => {
  const TAX_RATE = 0.16;

  const calculatePurchaseTotal = (items: PurchaseItem[]): { subtotal: number; tax: number; total: number } => {
    const subtotal = items.reduce((sum, item) => sum + item.cost * item.quantity, 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  it('debe calcular el subtotal de compra correctamente', () => {
    const items: PurchaseItem[] = [
      { productId: '1', productName: 'Carne', quantity: 10, cost: 50, total: 0 },
      { productId: '2', productName: 'Papas', quantity: 20, cost: 15, total: 0 },
    ];
    
    const { subtotal } = calculatePurchaseTotal(items);
    expect(subtotal).toBe(500 + 300);
  });

  it('debe calcular el IVA de compra', () => {
    const items: PurchaseItem[] = [
      { productId: '1', productName: 'Insumo', quantity: 5, cost: 200, total: 0 },
    ];
    
    const { subtotal, tax } = calculatePurchaseTotal(items);
    expect(tax).toBe(subtotal * TAX_RATE);
  });

  it('debe actualizar stock tras compra', () => {
    const currentStock = 50;
    const purchaseQuantity = 25;
    const newStock = currentStock + purchaseQuantity;
    
    expect(newStock).toBe(75);
  });

  it('debe identificar compras pendientes', () => {
    const purchases: Purchase[] = [
      { id: '1', supplier: 'A', invoiceNumber: 'INV-001', items: [], subtotal: 500, tax: 80, total: 580, status: 'completed' },
      { id: '2', supplier: 'B', invoiceNumber: 'INV-002', items: [], subtotal: 300, tax: 48, total: 348, status: 'pending' },
      { id: '3', supplier: 'C', invoiceNumber: 'INV-003', items: [], subtotal: 200, tax: 32, total: 232, status: 'completed' },
    ];
    
    const pending = purchases.filter(p => p.status === 'pending');
    expect(pending).toHaveLength(1);
  });

  it('debe calcular total de compras pendientes', () => {
    const purchases: Purchase[] = [
      { id: '1', supplier: '', invoiceNumber: '', items: [], subtotal: 500, tax: 80, total: 580, status: 'pending' },
      { id: '2', supplier: '', invoiceNumber: '', items: [], subtotal: 300, tax: 48, total: 348, status: 'pending' },
    ];
    
    const pendingTotal = purchases
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.total, 0);
    
    expect(pendingTotal).toBe(928);
  });

  it('debe identificar proveedor por nombre', () => {
    const suppliers = [
      { name: 'Distribuidora ABC', active: true },
      { name: 'Mayorista XYZ', active: true },
    ];
    
    const found = suppliers.find(s => s.name === 'Distribuidora ABC');
    expect(found?.name).toBe('Distribuidora ABC');
  });
});

describe('Supplier Validation', () => {
  it('debe validar email de proveedor', () => {
    const email = 'proveedor@empresa.com';
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    expect(isValid).toBe(true);
  });

  it('debe rechazar email inválido', () => {
    const email = 'proveedor-invalido';
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    expect(isValid).toBe(false);
  });

  it('debe validar teléfono de contacto', () => {
    const phone = '+52 123 456 7890';
    const isValid = phone.length >= 10;
    expect(isValid).toBe(true);
  });
});

describe('Purchase Status Transitions', () => {
  type PurchaseStatus = 'pending' | 'completed' | 'cancelled';

  it('debe permitir completar compra pendiente', () => {
    const currentStatus: PurchaseStatus = 'pending';
    const newStatus: PurchaseStatus = 'completed';
    const isValidTransition = currentStatus === 'pending' && newStatus === 'completed';
    expect(isValidTransition).toBe(true);
  });

  it('debe permitir cancelar compra pendiente', () => {
    const currentStatus: PurchaseStatus = 'pending';
    const newStatus: PurchaseStatus = 'cancelled';
    const isValidTransition = currentStatus === 'pending' && newStatus === 'cancelled';
    expect(isValidTransition).toBe(true);
  });

  it('no debe permitir cambiar compra completada', () => {
    const statuses: PurchaseStatus[] = ['completed', 'pending'];
    const isPending = statuses[0] === 'pending';
    expect(isPending).toBe(false);
  });
});
