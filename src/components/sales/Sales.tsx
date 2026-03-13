import { useState, useEffect } from 'react';
import { useTenantStore } from '../../store/useTenantStore';
import { db, Sale } from '../../services/db';
import Card from '../ui/Card';
import { 
  ShoppingBag, Search, DollarSign, CreditCard, Banknote, 
  Package, Clock, Check, X, Eye, TrendingUp, Receipt
} from 'lucide-react';

type DateRange = 'today' | 'week' | 'month' | 'all';
type PaymentFilter = 'all' | 'cash' | 'card';

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const tenant = useTenantStore((state) => state.currentTenant);

  useEffect(() => {
    async function loadData() {
      if (!tenant?.slug) return;
      const salesData = await db.sales
        .where('tenantId')
        .equals(tenant.slug)
        .reverse()
        .sortBy('createdAt');
      setSales(salesData);
    }
    loadData();
  }, [tenant?.slug]);

  useEffect(() => {
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

    let filtered = sales.filter(s => {
      if (!startDate) return true;
      return s.createdAt >= startDate;
    });

    if (paymentFilter !== 'all') {
      filtered = filtered.filter(s => s.paymentMethod === paymentFilter);
    }

    if (search) {
      filtered = filtered.filter(s => 
        s.localId.toLowerCase().includes(search.toLowerCase()) ||
        s.items.some(item => item.productName.toLowerCase().includes(search.toLowerCase()))
      );
    }

    setFilteredSales(filtered);
  }, [sales, dateRange, paymentFilter, search]);

  const totalRevenue = filteredSales
    .filter(s => s.status === 'completed')
    .reduce((sum, s) => sum + s.total, 0);

  const cashTotal = filteredSales
    .filter(s => s.status === 'completed' && s.paymentMethod === 'cash')
    .reduce((sum, s) => sum + s.total, 0);

  const cardTotal = filteredSales
    .filter(s => s.status === 'completed' && s.paymentMethod === 'card')
    .reduce((sum, s) => sum + s.total, 0);

  const avgOrder = filteredSales.length > 0 
    ? totalRevenue / filteredSales.filter(s => s.status === 'completed').length 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-6 h-6" />
            Ventas
          </h2>
          <p className="text-slate-400">{filteredSales.length} transacciones</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-xs text-slate-500 uppercase">Ingresos</span>
          </div>
          <p className="text-2xl font-bold text-white">${totalRevenue.toFixed(2)}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Receipt className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-xs text-slate-500 uppercase">Transacciones</span>
          </div>
          <p className="text-2xl font-bold text-white">{filteredSales.length}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-xs text-slate-500 uppercase">Ticket Promedio</span>
          </div>
          <p className="text-2xl font-bold text-white">${avgOrder.toFixed(2)}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Banknote className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-xs text-slate-500 uppercase">Efectivo</span>
          </div>
          <p className="text-2xl font-bold text-white">${cashTotal.toFixed(2)}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <CreditCard className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-xs text-slate-500 uppercase">Tarjeta</span>
          </div>
          <p className="text-2xl font-bold text-white">${cardTotal.toFixed(2)}</p>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar ventas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as DateRange)}
          className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="today">Hoy</option>
          <option value="week">Últimos 7 días</option>
          <option value="month">Último mes</option>
          <option value="all">Todo</option>
        </select>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
          className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="all">Todos los métodos</option>
          <option value="cash">Efectivo</option>
          <option value="card">Tarjeta</option>
        </select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">ID</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Fecha</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Items</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Total</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Método</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No hay ventas</p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.localId} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-4 px-4">
                      <span className="text-slate-400 font-mono text-xs">{sale.localId.slice(0, 8)}...</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-white text-sm">
                        {new Date(sale.createdAt).toLocaleDateString('es-ES', { 
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                        })}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-800 rounded-lg">
                        <Package className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-300 text-sm">{sale.items.length}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-green-400 font-bold text-lg">${sale.total.toFixed(2)}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                        sale.paymentMethod === 'cash'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {sale.paymentMethod === 'cash' ? (
                          <><Banknote className="w-3.5 h-3.5" /> Efectivo</>
                        ) : (
                          <><CreditCard className="w-3.5 h-3.5" /> Tarjeta</>
                        )}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {sale.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-full border border-green-500/20">
                          <Check className="w-3 h-3" /> Completada
                        </span>
                      ) : sale.status === 'cancelled' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded-full border border-red-500/20">
                          <X className="w-3 h-3" /> Cancelada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-400 text-xs rounded-full border border-amber-500/20">
                          <Clock className="w-3 h-3" /> Pendiente
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => setSelectedSale(sale)}
                        className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-400" />
                Detalle de Venta
              </h3>
              <button 
                onClick={() => setSelectedSale(null)} 
                className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <p className="text-xs text-slate-500 uppercase">ID</p>
                  <p className="text-white font-mono text-sm">{selectedSale.localId}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase">Fecha</p>
                  <p className="text-white text-sm">
                    {new Date(selectedSale.createdAt).toLocaleDateString('es-ES', {
                      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 uppercase mb-3">Items</p>
                <div className="space-y-2 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                  {selectedSale.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                          <Package className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-white text-sm">{item.productName}</p>
                          <p className="text-xs text-slate-500">{item.quantity} x ${item.unitPrice.toFixed(2)}</p>
                        </div>
                      </div>
                      <span className="text-green-400 font-medium">${item.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-2">
                <div className="flex justify-between text-slate-400 text-sm">
                  <span>Subtotal</span>
                  <span>${selectedSale.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-sm">
                  <span>Impuesto</span>
                  <span>${selectedSale.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-white">Total</span>
                  <span className="text-green-400">${selectedSale.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Método de pago</span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
                    selectedSale.paymentMethod === 'cash'
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}>
                    {selectedSale.paymentMethod === 'cash' ? <Banknote className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                    {selectedSale.paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
