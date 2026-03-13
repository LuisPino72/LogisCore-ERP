import { useState, useEffect } from 'react';
import { useTenantStore } from '../../store/useTenantStore';
import { db, Sale } from '../../services/db';
import Card from '../ui/Card';
import { 
  TrendingUp, DollarSign, ShoppingCart, Package,
  BarChart3, ShoppingBag, CreditCard, Banknote, PackageX
} from 'lucide-react';

type DateRange = 'today' | 'week' | 'month' | 'all';

interface Stats {
  totalSales: number;
  totalPurchases: number;
  totalProducts: number;
  totalOrders: number;
  avgOrderValue: number;
  cashPayments: number;
  cardPayments: number;
}

export default function Reports() {
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [stats, setStats] = useState<Stats>({
    totalSales: 0,
    totalPurchases: 0,
    totalProducts: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    cashPayments: 0,
    cardPayments: 0,
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

      const now = new Date();
      let startDate: Date | null = null;

      switch (dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'all':
        default:
          startDate = null;
      }

      const filteredSales = sales.filter(s => {
        if (s.status !== 'completed') return false;
        if (!startDate) return true;
        return s.createdAt >= startDate;
      });

      const filteredPurchases = purchases.filter(p => {
        if (p.status !== 'completed') return false;
        if (!startDate) return true;
        return p.createdAt >= startDate;
      });

      const totalSales = filteredSales.reduce((sum, s) => sum + s.total, 0);
      const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.total, 0);
      const cashPayments = filteredSales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.total, 0);
      const cardPayments = filteredSales.filter(s => s.paymentMethod === 'card').reduce((sum, s) => sum + s.total, 0);

      const productSales: Record<string, { name: string; sales: number; revenue: number }> = {};
      filteredSales.forEach(sale => {
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
        .slice(0, 8);

      setStats({
        totalSales,
        totalPurchases,
        totalProducts: products.length,
        totalOrders: filteredSales.length,
        avgOrderValue: filteredSales.length > 0 ? totalSales / filteredSales.length : 0,
        cashPayments,
        cardPayments,
      });
      setRecentSales(sales.filter(s => s.status === 'completed').slice(-10).reverse());
      setTopProducts(top);
    }
    loadData();
  }, [tenant?.slug, dateRange]);

  if (!tenant) return null;

  const kpis = [
    {
      label: 'Ventas Totales',
      value: `$${stats.totalSales.toFixed(2)}`,
      icon: DollarSign,
      color: 'green',
    },
    {
      label: 'Órdenes',
      value: stats.totalOrders.toString(),
      icon: ShoppingBag,
      color: 'blue',
    },
    {
      label: 'Ticket Promedio',
      value: `$${stats.avgOrderValue.toFixed(2)}`,
      icon: TrendingUp,
      color: 'purple',
    },
    {
      label: 'Ganancia Neta',
      value: `$${(stats.totalSales - stats.totalPurchases).toFixed(2)}`,
      icon: TrendingUp,
      color: stats.totalSales - stats.totalPurchases >= 0 ? 'green' : 'red',
    },
  ];

  const colorClasses: Record<string, string> = {
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Reportes
          </h2>
          <p className="text-slate-400">Análisis de tu negocio</p>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1">
          {(['today', 'week', 'month', 'all'] as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateRange === range
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {range === 'today' ? 'Hoy' : range === 'week' ? '7D' : range === 'month' ? '30D' : 'Todo'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <Card key={index}>
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${colorClasses[kpi.color]}`}>
                <kpi.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{kpi.label}</p>
            <p className="text-2xl font-bold text-white">{kpi.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Ventas por Método de Pago</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <Banknote className="w-5 h-5 text-green-400" />
                  </div>
                  <span className="text-slate-400">Efectivo</span>
                </div>
                <span className="text-white font-bold">${stats.cashPayments.toFixed(2)}</span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: stats.totalSales > 0 ? `${(stats.cashPayments / stats.totalSales) * 100}%` : '0%' }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-slate-400">Tarjeta</span>
                </div>
                <span className="text-white font-bold">${stats.cardPayments.toFixed(2)}</span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: stats.totalSales > 0 ? `${(stats.cardPayments / stats.totalSales) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Productos</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-500" />
                <span className="text-slate-400">Total</span>
              </div>
              <span className="text-white font-bold">{stats.totalProducts}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PackageX className="w-4 h-4 text-red-400" />
                <span className="text-slate-400">Sin Stock</span>
              </div>
              <span className="text-red-400 font-bold">0</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-400" />
                <span className="text-slate-400">Compras</span>
              </div>
              <span className="text-white font-bold">${stats.totalPurchases.toFixed(2)}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Últimas Ventas</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase">Fecha</th>
                  <th className="text-center py-3 px-2 text-xs font-semibold text-slate-500 uppercase">Items</th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-slate-500 uppercase">Total</th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-slate-500 uppercase">Método</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No hay ventas</p>
                    </td>
                  </tr>
                ) : (
                  recentSales.map((sale) => (
                    <tr key={sale.localId} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="py-3 px-2 text-white text-sm">
                        {new Date(sale.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-2 text-center text-slate-300 text-sm">{sale.items.length}</td>
                      <td className="py-3 px-2 text-right text-green-400 font-medium text-sm">${sale.total.toFixed(2)}</td>
                      <td className="py-3 px-2 text-right">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          sale.paymentMethod === 'cash' 
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {sale.paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Productos más vendidos</h3>
          </div>
          <div className="space-y-3">
            {topProducts.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Sin datos</p>
              </div>
            ) : (
              topProducts.map((product, index) => (
                <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                    index === 1 ? 'bg-slate-300/20 text-slate-300' :
                    index === 2 ? 'bg-amber-600/20 text-amber-500' :
                    'bg-slate-800 text-slate-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{product.name}</p>
                    <p className="text-xs text-slate-500">{product.sales} ventas</p>
                  </div>
                  <p className="text-green-400 font-bold">${product.revenue.toFixed(2)}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
