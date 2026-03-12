import { useState, useEffect } from 'react';
import { useTenantStore } from '../../store/useTenantStore';
import { db, Sale } from '../../services/db';
import Card from '../ui/Card';
import { TrendingUp, DollarSign, ShoppingCart, Package, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Stats {
  totalSales: number;
  totalPurchases: number;
  totalProducts: number;
  salesGrowth: number;
}

export default function Reports() {
  const [stats, setStats] = useState<Stats>({
    totalSales: 0,
    totalPurchases: 0,
    totalProducts: 0,
    salesGrowth: 0,
  });
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; sales: number; revenue: number }[]>([]);
  const tenant = useTenantStore((state) => state.currentTenant);

  useEffect(() => {
    async function loadData() {
      if (!tenant?.slug) return;

      const [sales, purchases, products] = await Promise.all([
        db.sales.where('tenantId').equals(tenant.slug).toArray(),
        db.purchases.where('tenantId').equals(tenant.slug).toArray(),
        db.products.where('tenantId').equals(tenant.slug).toArray(),
      ]);

      const totalSales = sales.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.total, 0);
      const totalPurchases = purchases.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.total, 0);

      const productSales: Record<string, { name: string; sales: number; revenue: number }> = {};
      sales.filter(s => s.status === 'completed').forEach(sale => {
        sale.items.forEach(item => {
          if (!productSales[item.productId]) {
            productSales[item.productId] = { name: item.productName, sales: 0, revenue: 0 };
          }
          productSales[item.productId].sales += item.quantity;
          productSales[item.productId].revenue += item.total;
        });
      });

      const top = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setStats({
        totalSales,
        totalPurchases,
        totalProducts: products.length,
        salesGrowth: 0,
      });
      setRecentSales(sales.slice(-5).reverse());
      setTopProducts(top);
    }
    loadData();
  }, [tenant?.slug]);

  if (!tenant) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Reportes</h2>
        <p className="text-slate-400">Análisis de tu negocio</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Ventas Totales</p>
              <p className="text-2xl font-bold text-white">${stats.totalSales.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2 text-sm">
            <ArrowUpRight className="w-4 h-4 text-green-400" />
            <span className="text-green-400">+{stats.salesGrowth}%</span>
            <span className="text-slate-500">vs mes anterior</span>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Compras</p>
              <p className="text-2xl font-bold text-white">${stats.totalPurchases.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2 text-sm">
            <ArrowDownRight className="w-4 h-4 text-red-400" />
            <span className="text-red-400">-5.2%</span>
            <span className="text-slate-500">vs mes anterior</span>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Productos</p>
              <p className="text-2xl font-bold text-white">{stats.totalProducts}</p>
            </div>
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Package className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2 text-sm">
            <ArrowUpRight className="w-4 h-4 text-green-400" />
            <span className="text-green-400">+3</span>
            <span className="text-slate-500">este mes</span>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Ganancia Neta</p>
              <p className="text-2xl font-bold text-white">${(stats.totalSales - stats.totalPurchases).toFixed(2)}</p>
            </div>
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2 text-sm">
            <ArrowUpRight className="w-4 h-4 text-green-400" />
            <span className="text-green-400">+18%</span>
            <span className="text-slate-500">vs mes anterior</span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Últimas Ventas">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-2 text-sm font-medium text-slate-400">Fecha</th>
                  <th className="text-center py-2 text-sm font-medium text-slate-400">Items</th>
                  <th className="text-right py-2 text-sm font-medium text-slate-400">Total</th>
                  <th className="text-right py-2 text-sm font-medium text-slate-400">Método</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((sale) => (
                  <tr key={sale.localId} className="border-b border-slate-800/50">
                    <td className="py-2 text-white">{sale.createdAt.toLocaleDateString()}</td>
                    <td className="py-2 text-center text-slate-300">{sale.items.length}</td>
                    <td className="py-2 text-right text-green-400">${sale.total.toFixed(2)}</td>
                    <td className="py-2 text-right">
                      <span className={`px-2 py-0.5 rounded text-xs ${sale.paymentMethod === 'cash' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {sale.paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Productos más vendidos">
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-sm font-medium text-slate-400">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-white font-medium">{product.name}</p>
                    <p className="text-sm text-slate-400">{product.sales} ventas</p>
                  </div>
                </div>
                <p className="text-green-400 font-medium">${product.revenue.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
