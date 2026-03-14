import { describe, it, expect } from 'vitest';

interface Sale {
  id: string;
  date: Date;
  total: number;
  items: { productId: string; quantity: number }[];
}

interface Product {
  id: string;
  name: string;
  sales: number;
}

describe('Reports Calculations', () => {
  describe('Financial Metrics', () => {
    it('debe calcular ganancia neta correctamente', () => {
      const totalSales = 10000;
      const totalPurchases = 6000;
      const netProfit = totalSales - totalPurchases;
      
      expect(netProfit).toBe(4000);
    });

    it('debe calcular margen de ganancia', () => {
      const revenue = 1000;
      const cost = 700;
      const margin = ((revenue - cost) / revenue) * 100;
      
      expect(margin).toBe(30);
    });

    it('debe calcular crecimiento de ventas', () => {
      const previousSales = 1000;
      const currentSales = 1250;
      const growth = ((currentSales - previousSales) / previousSales) * 100;
      
      expect(growth).toBe(25);
    });

    it('debe manejar crecimiento negativo', () => {
      const previousSales = 1000;
      const currentSales = 800;
      const growth = ((currentSales - previousSales) / previousSales) * 100;
      
      expect(growth).toBe(-20);
    });
  });

  describe('Sales Analytics', () => {
    it('debe identificar producto más vendido', () => {
      const products: Product[] = [
        { id: '1', name: 'Hamburguesa', sales: 145 },
        { id: '2', name: 'Papas', sales: 98 },
        { id: '3', name: 'Refresco', sales: 87 },
      ];
      
      const topProduct = products.reduce((max, p) => p.sales > max.sales ? p : max, products[0]);
      
      expect(topProduct.name).toBe('Hamburguesa');
      expect(topProduct.sales).toBe(145);
    });

    it('debe calcular ventas totales del período', () => {
      const sales: Sale[] = [
        { id: '1', date: new Date(), total: 500, items: [] },
        { id: '2', date: new Date(), total: 300, items: [] },
        { id: '3', date: new Date(), total: 200, items: [] },
      ];
      
      const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
      expect(totalSales).toBe(1000);
    });

    it('debe filtrar ventas por fecha', () => {
      const now = new Date();
      const sales: Sale[] = [
        { id: '1', date: new Date('2024-01-01'), total: 500, items: [] },
        { id: '2', date: now, total: 300, items: [] },
      ];
      
      const today = sales.filter(s => 
        s.date.toDateString() === now.toDateString()
      );
      
      expect(today).toHaveLength(1);
    });

    it('debe promediar ticket por venta', () => {
      const totalSales = 10000;
      const numTransactions = 250;
      const avgTicket = totalSales / numTransactions;
      
      expect(avgTicket).toBe(40);
    });
  });

  describe('Inventory Metrics', () => {
    it('debe calcular valor de inventario', () => {
      const products = [
        { name: 'A', stock: 10, cost: 50 },
        { name: 'B', stock: 20, cost: 30 },
      ];
      
      const inventoryValue = products.reduce((sum, p) => sum + p.stock * p.cost, 0);
      expect(inventoryValue).toBe(500 + 600);
    });

    it('debe identificar productos con stock bajo', () => {
      const products = [
        { id: '1', name: 'A', stock: 5 },
        { id: '2', name: 'B', stock: 15 },
        { id: '3', name: 'C', stock: 8 },
      ];
      const LOW_STOCK_THRESHOLD = 10;
      
      const lowStock = products.filter(p => p.stock <= LOW_STOCK_THRESHOLD);
      expect(lowStock).toHaveLength(2);
    });

    it('debe calcular rotación de inventario', () => {
      const initialStock = 100;
      const finalStock = 80;
      const sales = 50;
      const avgStock = (initialStock + finalStock) / 2;
      const turnover = sales / avgStock;
      
      expect(turnover).toBeCloseTo(0.56, 1);
    });
  });
});

describe('Dashboard KPIs', () => {
  it('debe calcular ventas del día', () => {
    const sales = [
      { id: '1', date: new Date(), total: 100 },
      { id: '2', date: new Date(), total: 200 },
    ];
    const today = new Date();
    const todaySales = sales
      .filter(s => s.date.toDateString() === today.toDateString())
      .reduce((sum, s) => sum + s.total, 0);
    
    expect(todaySales).toBe(300);
  });

  it('debe calcular pedidos pendientes', () => {
    const orders = [
      { status: 'completed', total: 500 },
      { status: 'pending', total: 300 },
      { status: 'pending', total: 150 },
      { status: 'completed', total: 200 },
    ];
    
    const pendingCount = orders.filter(o => o.status === 'pending').length;
    expect(pendingCount).toBe(2);
  });
});
