import { useState, useEffect, useMemo } from "react";
import { useTenantStore } from "@/store/useTenantStore";
import { getReportsData, DateRange, CustomDateRange, Stats, TopProduct, DailySales, exportReportsToCSV } from "../services/reports.service";
import { Sale } from "@/lib/db";
import { useToast } from "@/providers/ToastProvider";
import Card from "@/common/Card";
import Button from "@/common/Button";
import { TrendingUp, DollarSign, ShoppingCart, Package, BarChart3, ShoppingBag, CreditCard, Banknote, PackageX, Smartphone, Download, TrendingDown, AlertTriangle } from "lucide-react";

const DATE_PRESETS = [
  { label: "Hoy", value: "today" as DateRange },
  { label: "7D", value: "week" as DateRange },
  { label: "30D", value: "month" as DateRange },
  { label: "Todo", value: "all" as DateRange },
  { label: "Personalizado", value: "custom" as DateRange },
];

export default function Reports() {
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [customRange, setCustomRange] = useState<CustomDateRange>({ start: null, end: null });
  const [stats, setStats] = useState<Stats>({ 
    totalSales: 0, 
    totalPurchases: 0, 
    totalProducts: 0, 
    totalOrders: 0, 
    avgOrderValue: 0, 
    cashPayments: 0, 
    cardPayments: 0,
    pagoMovilPayments: 0,
    totalProfit: 0,
    productsLowStock: 0,
  });
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<{ name: string; stock: number }[]>([]);
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const tenant = useTenantStore((state) => state.currentTenant);
  const { showSuccess } = useToast();

  useEffect(() => {
    if (!tenant?.slug) return;
    getReportsData(tenant.slug, dateRange, dateRange === "custom" ? customRange : undefined).then(data => {
      setStats(data.stats);
      setRecentSales(data.recentSales);
      setTopProducts(data.topProducts);
      setDailySales(data.dailySales);
      setLowStockProducts(data.lowStockProducts);
    });
  }, [tenant?.slug, dateRange, customRange]);

  const handleExportCSV = () => {
    const csv = exportReportsToCSV(stats, recentSales, topProducts, getDateRangeLabel());
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showSuccess('Reporte exportado correctamente');
  };

  const handleCustomDate = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setCustomRange({ start, end });
  };

  const getDateRangeLabel = () => {
    if (dateRange === "custom" && customRange.start && customRange.end) {
      return `${customRange.start.toLocaleDateString()} - ${customRange.end.toLocaleDateString()}`;
    }
    return DATE_PRESETS.find(d => d.value === dateRange)?.label || dateRange;
  };

  const maxDaily = useMemo(() => Math.max(...dailySales.map(d => d.total), 1), [dailySales]);

  const kpis = [
    { label: "Ventas Totales", value: `$${stats.totalSales.toFixed(2)}`, icon: DollarSign, color: "green" },
    { label: "Órdenes", value: stats.totalOrders.toString(), icon: ShoppingBag, color: "blue" },
    { label: "Ticket Promedio", value: `$${stats.avgOrderValue.toFixed(2)}`, icon: TrendingUp, color: "purple" },
    { label: "Ganancia Neta", value: `$${stats.totalProfit.toFixed(2)}`, icon: stats.totalProfit >= 0 ? TrendingUp : TrendingDown, color: stats.totalProfit >= 0 ? "green" : "red" },
  ];

  const colorClasses: Record<string, string> = {
    green: "bg-green-500/10 text-green-400 border-green-500/20",
    blue: "bg-(--brand-500)/10 text-(--brand-400) border-(--brand-500)/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  const getPaymentWidth = (value: number) => stats.totalSales > 0 ? `${(value / stats.totalSales) * 100}%` : "0%";

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "cash": return "Efectivo";
      case "card": return "Tarjeta";
      case "pago_movil": return "Pago Móvil";
      default: return method;
    }
  };

  if (!tenant) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-(--text-primary) flex items-center gap-2" title="Reportes y análisis del negocio"><BarChart3 className="w-6 h-6" />Reportes</h2>
          <p className="text-(--text-secondary)">Análisis de tu negocio</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="flex items-center gap-2 bg-(--bg-secondary) border border-(--border-color) rounded-xl p-1">
              {DATE_PRESETS.map((range) => (
                <button 
                  key={range.value} 
                  onClick={() => { setDateRange(range.value); }}
                  title={`Ver reporte de ${range.label.toLowerCase()}`}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${dateRange === range.value ? "bg-(--brand-600) text-white" : "text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-tertiary)"}`}>
                  {range.label}
                </button>
              ))}
            </div>
            {dateRange === "custom" && (
              <div className="absolute top-full mt-2 right-0 bg-(--bg-secondary) border border-(--border-color) rounded-lg shadow-xl z-20 p-3 min-w-[200px]">
                <div className="space-y-1">
                  <button onClick={() => handleCustomDate(0)} title="Ver reporte de hoy" className="w-full text-left px-3 py-2 text-sm text-(--text-secondary) hover:bg-(--bg-tertiary) rounded-lg">Hoy</button>
                  <button onClick={() => handleCustomDate(7)} title="Ver reporte de los últimos 7 días" className="w-full text-left px-3 py-2 text-sm text-(--text-secondary) hover:bg-(--bg-tertiary) rounded-lg">Últimos 7 días</button>
                  <button onClick={() => handleCustomDate(30)} title="Ver reporte de los últimos 30 días" className="w-full text-left px-3 py-2 text-sm text-(--text-secondary) hover:bg-(--bg-tertiary) rounded-lg">Últimos 30 días</button>
                  <button onClick={() => handleCustomDate(90)} title="Ver reporte de los últimos 3 meses" className="w-full text-left px-3 py-2 text-sm text-(--text-secondary) hover:bg-(--bg-tertiary) rounded-lg">Últimos 3 meses</button>
                  <button onClick={() => handleCustomDate(365)} title="Ver reporte del último año" className="w-full text-left px-3 py-2 text-sm text-(--text-secondary) hover:bg-(--bg-tertiary) rounded-lg">Último año</button>
                </div>
              </div>
            )}
          </div>
          <Button variant="secondary" onClick={handleExportCSV} title="Exportar reporte a CSV">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <Card key={index}>
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${colorClasses[kpi.color]}`}><kpi.icon className="w-5 h-5" /></div>
            </div>
            <p className="text-xs uppercase tracking-wide mb-1">{kpi.label}</p>
            <p className="text-2xl font-bold text-(--text-primary)">{kpi.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-4">Tendencia de Ventas</h3>
          {dailySales.length > 0 ? (
            <div className="flex items-end gap-1 h-40">
              {dailySales.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    className="w-full bg-(--brand-500) rounded-t hover:bg-(--brand-400) transition-colors relative group"
                    style={{ height: `${(day.total / maxDaily) * 100}%`, minHeight: day.total > 0 ? '4px' : '0' }}
                  >
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                      ${day.total.toFixed(2)}
                    </div>
                  </div>
                  <span className="text-[10px]">
                    {new Date(day.date).getDate()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center">
              <BarChart3 className="w-10 h-10 opacity-50 mr-2" />
              Sin datos en este período
            </div>
          )}
        </Card>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Productos</h3>
              {stats.productsLowStock > 0 && (
                <button 
                  onClick={() => setShowLowStockModal(true)}
                  title="Ver productos con stock bajo"
                  className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
                >
                  <AlertTriangle className="w-3 h-3" />
                  {stats.productsLowStock} bajo stock
                </button>
              )}
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Package className="w-4 h-4 " /><span className="text-(--text-secondary)">Total</span></div><span className="text-(--text-primary) font-bold">{stats.totalProducts}</span></div>
            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><PackageX className="w-4 h-4 text-red-400" /><span className="text-(--text-secondary)">Sin Stock</span></div><span className="text-red-400 font-bold">{stats.productsLowStock}</span></div>
            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-(--brand-400)" /><span className="text-(--text-secondary)">Compras</span></div><span className="text-(--text-primary) font-bold">${stats.totalPurchases.toFixed(2)}</span></div>
            <div className="flex items-center justify-between border-t border-(--border-color) pt-3"><div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-400" /><span className="text-(--text-secondary)">Ganancia</span></div><span className={`font-bold ${stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>${stats.totalProfit.toFixed(2)}</span></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-4">Ventas por Método de Pago</h3>
          <div className="space-y-4">
            {[
              { key: "cash", value: stats.cashPayments, icon: Banknote, color: "green" },
              { key: "card", value: stats.cardPayments, icon: CreditCard, color: "blue" },
              { key: "pago_movil", value: stats.pagoMovilPayments, icon: Smartphone, color: "purple" },
            ].map((method) => (
              <div key={method.key}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 ${method.color === 'green' ? 'bg-green-500/10' : method.color === 'blue' ? 'bg-(--brand-500)/10' : 'bg-purple-500/10'} rounded-lg flex items-center justify-center`}>
                      <method.icon className={`w-5 h-5 ${method.color === 'green' ? 'text-green-400' : method.color === 'blue' ? 'text-(--brand-400)' : 'text-purple-400'}`} />
                    </div>
                    <span className="text-(--text-secondary)">{getPaymentMethodLabel(method.key)}</span>
                  </div>
                  <span className="text-(--text-primary) font-bold">${method.value.toFixed(2)}</span>
                </div>
                <div className="h-3 bg-(--bg-tertiary) rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${method.color === 'green' ? 'bg-green-500' : method.color === 'blue' ? 'bg-(--brand-500)' : 'bg-purple-500'}`} 
                    style={{ width: getPaymentWidth(method.value) }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4">Productos más vendidos</h3>
          <div className="space-y-3">
            {topProducts.length === 0 ? (
              <div className="py-8 text-center text-slate-500"><Package className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>Sin datos</p></div>
            ) : (
              topProducts.slice(0, 5).map((product, index) => (
                <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-(--bg-tertiary) transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' : index === 1 ? 'bg-slate-300/20 text-slate-300' : index === 2 ? 'bg-amber-600/20 text-amber-500' : 'bg-slate-800 text-slate-500'}`}>{index + 1}</div>
                  <div className="flex-1 min-w-0"><p className="text-white font-medium truncate">{product.name}</p><p className="text-xs text-slate-500">{product.sales} ventas</p></div>
                  <p className="text-green-400 font-bold">${product.revenue.toFixed(2)}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="text-lg font-semibold text-white mb-4">Últimas Ventas</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-(--border-color)">
                <th className="text-left py-3 px-2 text-xs font-semibold uppercase">Fecha</th>
                <th className="text-center py-3 px-2 text-xs font-semibold uppercase">Items</th>
                <th className="text-right py-3 px-2 text-xs font-semibold uppercase">Total</th>
                <th className="text-right py-3 px-2 text-xs font-semibold uppercase">Método</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-slate-500"><ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>No hay ventas</p></td></tr>
              ) : (
                recentSales.map((sale) => (
                  <tr key={sale.localId} className="border-b border-(--border-color)/50 hover:bg-(--bg-tertiary)">
                    <td className="py-3 px-2 text-white text-sm">{new Date(sale.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="py-3 px-2 text-center text-slate-300 text-sm">{sale.items.length}</td>
                    <td className="py-3 px-2 text-right text-green-400 font-medium text-sm">${sale.total.toFixed(2)}</td>
                    <td className="py-3 px-2 text-right">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        sale.paymentMethod === "cash" ? "bg-green-500/10 text-green-400 border border-green-500/20" : 
                        sale.paymentMethod === "card" ? "bg-(--brand-500)/10 text-(--brand-400) border border-(--brand-500)/20" :
                        "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                      }`}>
                        {getPaymentMethodLabel(sale.paymentMethod)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showLowStockModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl w-full max-w-lg shadow-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color)">
              <h3 className="text-lg font-semibold text-(--text-primary) flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Productos bajo stock
              </h3>
              <button onClick={() => setShowLowStockModal(false)} title="Cerrar" className="p-1 hover:bg-(--bg-tertiary) rounded">
                <PackageX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {lowStockProducts.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay productos bajo stock</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lowStockProducts.map((product, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-(--bg-tertiary) p-4 rounded-lg border border-(--border-color)">
                      <span className="text-(--text-primary) font-medium">{product.name}</span>
                      <span className={`font-bold ${product.stock === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                        {product.stock} unidades
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
