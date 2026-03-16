import { useState, useEffect, useMemo, useCallback } from "react";
import { useTenantStore } from "../../../store/useTenantStore";
import { db, Product } from "../../../lib/db";
import { logger, logCategories } from "../../../lib/logger";
import { EventBus, Events } from "../../../lib/events/EventBus";
import { getExchangeRate, updateExchangeRate, formatBs } from "../../exchange-rate/services/exchangeRate.service";
import { isOk } from "../../../types/result";
import { useToast } from "../../../providers/ToastProvider";
import Button from "../../../common/Button";
import {
  DollarSign,
  ShoppingBag,
  PackageX,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  LayoutDashboard,
  BarChart3,
  PieChart,
  Package,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";

type TabType = "resumen" | "ventas" | "categorias" | "inventario";

interface DashboardStats {
  salesToday: number;
  salesYesterday: number;
  ordersThisMonth: number;
  ordersLastMonth: number;
  lowStockProducts: number;
  monthlyRevenue: number;
  lastMonthRevenue: number;
}

interface DailySales {
  day: string;
  current: number;
  previous: number;
}

interface CategorySales {
  category: string;
  total: number;
  color: string;
}

export default function Dashboard({ isLoadingData = false }: { isLoadingData?: boolean }) {
  const tenant = useTenantStore((state) => state.currentTenant);
  const { showError, showSuccess } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("resumen");
  const [loading, setLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState<{ rate: number; updatedAt: Date; source: string } | null>(null);
  const [isUpdatingRate, setIsUpdatingRate] = useState(false);
  const [showManualRateModal, setShowManualRateModal] = useState(false);
  const [manualRateInput, setManualRateInput] = useState("");
  const [stats, setStats] = useState<DashboardStats>({
    salesToday: 0,
    salesYesterday: 0,
    ordersThisMonth: 0,
    ordersLastMonth: 0,
    lowStockProducts: 0,
    monthlyRevenue: 0,
    lastMonthRevenue: 0,
  });
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySales[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<(Product & { categoryName: string })[]>([]);

  const loadData = useCallback(async () => {
    if (!tenant?.id) return;
    
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const firstOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      
      const [products, sales, cats] = await Promise.all([
        db.products.where("tenantId").equals(tenant.slug).toArray(),
        db.sales.where("tenantId").equals(tenant.slug).toArray(),
        db.categories.where("tenantId").equals(tenant.slug).toArray(),
      ]);
      
      const salesToday = sales
        .filter(s => s.createdAt && new Date(s.createdAt) >= today && s.status === "completed")
        .reduce((sum, s) => sum + (s.total || 0), 0);
      
      const salesYesterday = sales
        .filter(s => s.createdAt && new Date(s.createdAt) >= yesterday && new Date(s.createdAt) < today && s.status === "completed")
        .reduce((sum, s) => sum + (s.total || 0), 0);
      
      const ordersThisMonth = sales
        .filter(s => s.createdAt && new Date(s.createdAt) >= firstOfMonth && s.status === "completed")
        .length;
      
      const ordersLastMonth = sales
        .filter(s => s.createdAt && new Date(s.createdAt) >= firstOfLastMonth && new Date(s.createdAt) <= lastOfLastMonth && s.status === "completed")
        .length;
      
      const lowStock = products.filter(p => (p.stock || 0) <= 10 && p.isActive);
      
      const monthlyRevenue = sales
        .filter(s => s.createdAt && new Date(s.createdAt) >= firstOfMonth && s.status === "completed")
        .reduce((sum, s) => sum + (s.total || 0), 0);
      
      const lastMonthRevenue = sales
        .filter(s => s.createdAt && new Date(s.createdAt) >= firstOfLastMonth && new Date(s.createdAt) <= lastOfLastMonth && s.status === "completed")
        .reduce((sum, s) => sum + (s.total || 0), 0);
      
      setStats({
        salesToday,
        salesYesterday,
        ordersThisMonth,
        ordersLastMonth,
        lowStockProducts: lowStock.length,
        monthlyRevenue,
        lastMonthRevenue,
      });
      
      setLowStockProducts(
        lowStock.map(p => ({
          ...p,
          categoryName: cats.find(c => c.id === p.categoryId)?.name || "Sin categoría",
        })).slice(0, 10)
      );
      
      const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      const dailyData: DailySales[] = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        
        const prevDate = new Date(dayStart);
        prevDate.setDate(prevDate.getDate() - 7);
        const prevDayStart = new Date(prevDate);
        prevDayStart.setHours(0, 0, 0, 0);
        const prevDayEnd = new Date(prevDate);
        prevDayEnd.setHours(23, 59, 59, 999);
        
        const currentDaySales = sales
          .filter(s => s.createdAt && new Date(s.createdAt) >= dayStart && new Date(s.createdAt) <= dayEnd && s.status === "completed")
          .reduce((sum, s) => sum + (s.total || 0), 0);
        
        const previousDaySales = sales
          .filter(s => s.createdAt && new Date(s.createdAt) >= prevDayStart && new Date(s.createdAt) <= prevDayEnd && s.status === "completed")
          .reduce((sum, s) => sum + (s.total || 0), 0);
        
        dailyData.push({
          day: days[date.getDay()],
          current: currentDaySales,
          previous: previousDaySales,
        });
      }
      
      setDailySales(dailyData);
      
      const categoryMap = new Map<string, number>();
      const categoryColors: Record<string, string> = {
        "General": "#6366f1",
        "Bebidas": "#22c55e", 
        "Comida": "#f59e0b",
        "Insumos": "#ec4899",
        "Sin categoría": "#64748b",
      };
      
      sales
        .filter(s => s.status === "completed")
        .forEach(sale => {
          sale.items.forEach(item => {
            const product = products.find(p => p.localId === item.productId);
            if (product) {
              const catId = product.categoryId;
              const cat = cats.find(c => c.id === catId);
              const catName = cat?.name || "Sin categoría";
              categoryMap.set(catName, (categoryMap.get(catName) || 0) + item.total);
            }
          });
        });
      
      const catSales: CategorySales[] = Array.from(categoryMap.entries())
        .map(([category, total]) => ({
          category,
          total,
          color: categoryColors[category] || "#64748b",
        }))
        .sort((a, b) => b.total - a.total);
      
      setCategorySales(catSales);
      
    } catch (_error) {
      logger.error("Error loading dashboard data", _error instanceof Error ? _error : undefined, { category: logCategories.UI });
    } finally {
      setLoading(false);
    }
  }, [tenant?.slug]);

  const handleUpdateRate = async () => {
    setIsUpdatingRate(true);
    try {
      const result = await updateExchangeRate();
      if (result.success && result.rate) {
        setExchangeRate({ rate: result.rate, updatedAt: new Date(), source: result.rate ? 'api' : 'manual' });
        showSuccess(`Tasa actualizada: ${formatBs(result.rate)}`);
      } else {
        setShowManualRateModal(true);
        showError(result.error || 'Error al actualizar tasa');
      }
    } catch (_error) {
      setShowManualRateModal(true);
      showError('Error al actualizar tasa');
    } finally {
      setIsUpdatingRate(false);
    }
  };

  const handleSaveManualRate = async () => {
    const rate = parseFloat(manualRateInput.replace(',', '.'));
    if (isNaN(rate) || rate <= 0) {
      showError('Ingrese una tasa válida');
      return;
    }
    
    const result = await updateExchangeRate(rate);
    if (result.success && result.rate) {
      setExchangeRate({ rate: result.rate, updatedAt: new Date(), source: 'manual' });
      showSuccess(`Tasa configurada: ${formatBs(result.rate)}`);
      setShowManualRateModal(false);
      setManualRateInput("");
    } else {
      showError(result.error || 'Error al guardar tasa');
    }
  };

  useEffect(() => {
    const loadExchangeRate = async () => {
      const result = await getExchangeRate();
      if (isOk(result) && result.value) {
        setExchangeRate({ rate: result.value.rate, updatedAt: result.value.updatedAt, source: result.value.source });
      } else {
        handleUpdateRate();
      }
    };
    loadExchangeRate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isLoadingData) return;
    loadData();
  }, [loadData, isLoadingData]);

  useEffect(() => {
    const handleSaleCompleted = () => {
      loadData();
    };

    EventBus.on(Events.SALE_COMPLETED, handleSaleCompleted);
    EventBus.on(Events.SALE_CANCELLED, handleSaleCompleted);

    return () => {
      EventBus.off(Events.SALE_COMPLETED, handleSaleCompleted);
      EventBus.off(Events.SALE_CANCELLED, handleSaleCompleted);
    };
  }, [loadData]);

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const salesTrend = useMemo(() => 
    calculateTrend(stats.salesToday, stats.salesYesterday), 
    [stats.salesToday, stats.salesYesterday]
  );

  const revenueTrend = useMemo(() => 
    calculateTrend(stats.monthlyRevenue, stats.lastMonthRevenue), 
    [stats.monthlyRevenue, stats.lastMonthRevenue]
  );

  const maxDailySale = useMemo(() => 
    Math.max(...dailySales.map(d => Math.max(d.current, d.previous)), 1),
    [dailySales]
  );

  const maxCategorySale = useMemo(() => 
    Math.max(...categorySales.map(c => c.total), 1),
    [categorySales]
  );

  const tabs = [
    { id: "resumen" as TabType, label: "Resumen", icon: LayoutDashboard },
    { id: "ventas" as TabType, label: "Ventas", icon: BarChart3 },
    { id: "categorias" as TabType, label: "Categorías", icon: PieChart },
    { id: "inventario" as TabType, label: "Inventario", icon: Package },
  ];

  const colorClasses: Record<string, { icon: string; text: string; border: string }> = {
    blue: { icon: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/20" },
    green: { icon: "bg-green-500/20", text: "text-green-400", border: "border-green-500/20" },
    amber: { icon: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/20" },
    red: { icon: "bg-red-500/20", text: "text-red-400", border: "border-red-500/20" },
  };

  const getCurrentGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  const formatDate = () => {
    return new Date().toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const TrendIndicator = ({ value }: { value: number }) => {
    if (value === 0) return null;
    return (
      <div className={`flex items-center gap-1 text-xs font-medium ${value > 0 ? "text-green-400" : "text-red-400"}`}>
        {value > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {Math.abs(value).toFixed(1)}%
      </div>
    );
  };

  const renderKPI = (label: string, value: string, Icon: React.ElementType, color: string, trend: number | null) => {
    const colors = colorClasses[color];
    return (
      <div className="bg-(--bg-secondary) border border-(--border-color) rounded-xl p-5 shadow-lg hover:shadow-xl hover:border-(--brand-500)/30 transition-all">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2.5 rounded-lg ${colors.icon}`}>
            <Icon className={`w-5 h-5 ${colors.text}`} />
          </div>
          {trend !== null && <TrendIndicator value={trend} />}
        </div>
        <p className="text-(--text-secondary) text-sm mb-1">{label}</p>
        <p className="text-2xl font-bold text-(--text-primary)">{value}</p>
      </div>
    );
  };

  const renderSalesChart = () => (
    <div className="bg-(--bg-secondary) border border-(--border-color) rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-6">Ventas de la Semana</h3>
      <div className="flex items-end justify-between gap-2 h-64">
        {dailySales.map((day, index) => {
          const currentHeight = (day.current / maxDailySale) * 100;
          const previousHeight = (day.previous / maxDailySale) * 100;
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex items-end justify-center gap-1 h-48">
                <div 
                  className="w-3/5 bg-green-500/60 rounded-t hover:bg-green-400 transition-colors relative group"
                  style={{ height: `${currentHeight}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    ${day.current.toFixed(2)}
                  </div>
                </div>
                <div 
                  className="w-2/5 bg-slate-600/50 rounded-t"
                  style={{ height: `${previousHeight}%` }}
                />
              </div>
              <span className="text-xs text-slate-500">{day.day}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-6 mt-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500/60 rounded" />
          <span className="text-slate-400">Esta semana</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-slate-600/50 rounded" />
          <span className="text-slate-400">Semana anterior</span>
        </div>
      </div>
    </div>
  );

  const renderCategoryChart = () => (
    <div className="bg-(--bg-secondary) border border-(--border-color) rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-6">Ventas por Categoría</h3>
      {categorySales.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <PieChart className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay datos de ventas por categoría</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categorySales.map((cat, index) => {
            const percentage = (cat.total / maxCategorySale) * 100;
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{cat.category}</span>
                  <span className="text-green-400 font-medium">${cat.total.toFixed(2)}</span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderLowStockList = () => (
    <div className="bg-(--bg-secondary) border border-(--border-color) rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Productos con Stock Bajo</h3>
      {lowStockProducts.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <PackageX className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay productos con stock bajo</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {lowStockProducts.map((product) => (
            <div 
              key={product.localId}
              className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
            >
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{product.name}</p>
                <p className="text-xs text-slate-500">{product.categoryName}</p>
              </div>
              <div className={`text-right px-3 py-1 rounded-full text-sm font-bold ${
                product.stock === 0 
                  ? "bg-red-500/20 text-red-400" 
                  : "bg-amber-500/20 text-amber-400"
              }`}>
                {product.stock} uni.
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderResumen = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {renderSalesChart()}
      {renderCategoryChart()}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-(--text-primary) mb-1">
              {getCurrentGreeting()} 👋
            </h2>
            <p className="text-(--text-secondary)">
              Bienvenido a{" "}
              <span className="text-(--brand-400) font-medium">
                {tenant?.name}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-(--text-secondary) capitalize">
              {formatDate()}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderKPI("Ventas Hoy", `$${stats.salesToday.toFixed(2)}`, DollarSign, "blue", salesTrend)}
        {renderKPI("Órdenes del Mes", stats.ordersThisMonth.toString(), ShoppingBag, "amber", null)}
        {renderKPI("Stock Bajo", stats.lowStockProducts.toString(), PackageX, stats.lowStockProducts > 0 ? "red" : "green", null)}
        {renderKPI("Ingresos del Mes", `$${stats.monthlyRevenue.toFixed(2)}`, TrendingUp, "green", revenueTrend)}
      </div>

      {exchangeRate && (
        <div className="bg-linear-to-r from-blue-900/50 to-indigo-900/50 border border-blue-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-blue-300/70">Tasa BCV (Dólar)</p>
                <p className="text-2xl font-bold text-white">{formatBs(exchangeRate.rate)}</p>
                <p className="text-xs text-slate-400">
                  Actualizado: {exchangeRate.updatedAt.toLocaleString('es-VE')} • {exchangeRate.source === 'api' ? 'Automático' : 'Manual'}
                </p>
              </div>
            </div>
            <button
              onClick={handleUpdateRate}
              disabled={isUpdatingRate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isUpdatingRate ? 'animate-spin' : ''}`} />
              {isUpdatingRate ? 'Actualizando...' : 'Actualizar'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-(--bg-secondary) border border-(--border-color) rounded-xl overflow-hidden">
        <div className="flex border-b border-slate-700/50 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "text-(--brand-400) border-b-2 border-(--brand-500) bg-(--brand-500)/5"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-(--brand-400) animate-spin" />
              <span className="ml-3 text-slate-400">Cargando datos...</span>
            </div>
          ) : (
            <>
              {activeTab === "resumen" && renderResumen()}
              {activeTab === "ventas" && renderSalesChart()}
              {activeTab === "categorias" && renderCategoryChart()}
              {activeTab === "inventario" && renderLowStockList()}
            </>
          )}
        </div>
      </div>

      {showManualRateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color)">
              <h3 className="text-lg font-semibold text-(--text-primary)">
                Configurar Tasa BCV
              </h3>
              <button
                onClick={() => setShowManualRateModal(false)}
                className="p-1.5 hover:bg-(--bg-tertiary) rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-(--text-muted)" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-400">
                La API no está disponible. Ingrese la tasa del dólar manualmente.
              </p>
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Tasa (Bs por USD)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={manualRateInput}
                  onChange={(e) => setManualRateInput(e.target.value)}
                  placeholder="Ej: 36.50"
                  className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
                />
              </div>
              <Button
                onClick={handleSaveManualRate}
                className="w-full py-2.5"
              >
                Guardar Tasa
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
