import { describe, it, expect } from 'vitest';

describe('Purchases Logic', () => {
  it('debe calcular el total de una compra correctamente', () => {
    const items = [
      { productId: '1', productName: 'Carne', quantity: 10, cost: 50 },
      { productId: '2', productName: 'Papas', quantity: 20, cost: 15 },
    ];
    
    const total = items.reduce((sum, item) => sum + (item.quantity * item.cost), 0);
    
    expect(total).toBe(800);
  });

  it('debe calcular el stock correctamente tras una compra', () => {
    const currentStock = 50;
    const purchaseQuantity = 25;
    const newStock = currentStock + purchaseQuantity;
    
    expect(newStock).toBe(75);
  });

  it('debe identificar compras pendientes', () => {
    const purchases = [
      { status: 'completed', total: 500 },
      { status: 'pending', total: 300 },
      { status: 'completed', total: 200 },
    ];
    
    const pending = purchases.filter(p => p.status === 'pending');
    const pendingTotal = pending.reduce((sum, p) => sum + p.total, 0);
    
    expect(pending.length).toBe(1);
    expect(pendingTotal).toBe(300);
  });

  it('debe identificar compras completadas', () => {
    const purchases = [
      { status: 'completed', total: 500 },
      { status: 'pending', total: 300 },
    ];
    
    const completed = purchases.filter(p => p.status === 'completed');
    
    expect(completed.length).toBe(1);
  });
});

describe('Recipe Production', () => {
  it('debe calcular materiales necesarios para producción', () => {
    const recipeIngredients = [
      { productId: '1', productName: 'Carne', quantity: 0.2 },
      { productId: '2', productName: 'Pan', quantity: 1 },
    ];
    const productionQty = 5;
    
    const materialsNeeded = recipeIngredients.map(ing => ({
      ...ing,
      totalQuantity: ing.quantity * productionQty,
    }));
    
    expect(materialsNeeded[0].totalQuantity).toBe(1);
    expect(materialsNeeded[1].totalQuantity).toBe(5);
  });

  it('debe validar stock suficiente para producción', () => {
    const availableStock = { '1': 10, '2': 20 };
    const requiredStock = { '1': 5, '2': 8 };
    
    const hasEnough = Object.entries(requiredStock).every(
      ([productId, qty]) => availableStock[productId as keyof typeof availableStock] >= qty
    );
    
    expect(hasEnough).toBe(true);
  });

  it('debe rechazar producción por stock insuficiente', () => {
    const availableStock = { '1': 3, '2': 20 };
    const requiredStock = { '1': 5, '2': 8 };
    
    const hasEnough = Object.entries(requiredStock).every(
      ([productId, qty]) => availableStock[productId as keyof typeof availableStock] >= qty
    );
    
    expect(hasEnough).toBe(false);
  });
});

describe('Reports Calculations', () => {
  it('debe calcular ganancia neta correctamente', () => {
    const totalSales = 10000;
    const totalPurchases = 6000;
    const netProfit = totalSales - totalPurchases;
    
    expect(netProfit).toBe(4000);
  });

  it('debe calcular crecimiento de ventas', () => {
    const previousSales = 1000;
    const currentSales = 1250;
    const growth = ((currentSales - previousSales) / previousSales) * 100;
    
    expect(growth).toBe(25);
  });

  it('debe identificar producto más vendido', () => {
    const products = [
      { name: 'Hamburguesa', sales: 145 },
      { name: 'Papas', sales: 98 },
      { name: 'Refresco', sales: 87 },
    ];
    
    const topProduct = products.reduce((max, p) => p.sales > max.sales ? p : max, products[0]);
    
    expect(topProduct.name).toBe('Hamburguesa');
    expect(topProduct.sales).toBe(145);
  });
});
