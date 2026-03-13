import { useState, useEffect } from "react";
import { useTenantStore } from "../../../store/useTenantStore";
import { db } from "../../../services/db";
import {
  DollarSign,
  ShoppingBag,
  PackageX,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

export default function Dashboard() {
  const tenant = useTenantStore((state) => state.currentTenant);
  const [stats, setStats] = useState({
    salesToday: 0,
    activeOrders: 0,
    lowStockProducts: 0,
    monthlyRevenue: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const products = await db.products.toArray();
      const sales = await db.sales.toArray();

      const salesToday = sales
        .filter(
          (s) =>
            s.createdAt &&
            new Date(s.createdAt) >= today &&
            s.status === "completed",
        )
        .reduce((sum, s) => sum + (s.total || 0), 0);

      const activeOrders = sales.filter((s) => s.status === "completed").length;

      const lowStock = products.filter((p) => (p.stock || 0) <= 5).length;

      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthlyRevenue = sales
        .filter((s) => s.createdAt && new Date(s.createdAt) >= firstOfMonth)
        .reduce((sum, s) => sum + (s.total || 0), 0);

      setStats({
        salesToday,
        activeOrders,
        lowStockProducts: lowStock,
        monthlyRevenue,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const kpis = [
    {
      label: "Ventas Hoy",
      value: `$${stats.salesToday.toFixed(2)}`,
      icon: DollarSign,
      color: "blue",
      trend: null,
    },
    {
      label: "Órdenes Activas",
      value: stats.activeOrders.toString(),
      icon: ShoppingBag,
      color: "amber",
      trend: null,
    },
    {
      label: "Stock Bajo",
      value: stats.lowStockProducts.toString(),
      icon: PackageX,
      color: stats.lowStockProducts > 0 ? "red" : "green",
      trend: null,
    },
    {
      label: "Ingresos del Mes",
      value: `$${stats.monthlyRevenue.toFixed(2)}`,
      icon: TrendingUp,
      color: "green",
      trend: null,
    },
  ];

  const colorClasses: Record<
    string,
    { bg: string; text: string; icon: string; border: string }
  > = {
    blue: {
      bg: "bg-[var(--brand-500)]/10",
      text: "text-[var(--brand-400)]",
      icon: "bg-[var(--brand-500)]/20",
      border: "border-[var(--brand-500)]/20",
    },
    green: {
      bg: "bg-green-500/10",
      text: "text-green-400",
      icon: "bg-green-500/20",
      border: "border-green-500/20",
    },
    amber: {
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      icon: "bg-amber-500/20",
      border: "border-amber-500/20",
    },
    red: {
      bg: "bg-red-500/10",
      text: "text-red-400",
      icon: "bg-red-500/20",
      border: "border-red-500/20",
    },
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
            <p className="text-xs text-(--text-muted)">
              {tenant?.config?.logoUrl
                ? "Logo configurado"
                : "Sin logo personalizado"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => {
          const colors = colorClasses[kpi.color];
          return (
            <div
              key={index}
              className="bg-(--bg-secondary) border border-(--border-color) rounded-xl p-5 shadow-lg hover:shadow-xl hover:border-(--brand-500)/30 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-lg ${colors.icon}`}>
                  <kpi.icon className={`w-5 h-5 ${colors.text}`} />
                </div>
                {kpi.trend && (
                  <div
                    className={`flex items-center gap-1 text-xs font-medium ${
                      kpi.trend > 0 ? "text-green-400" : "text-red-400"
                    }`}>
                    {kpi.trend > 0 ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {Math.abs(kpi.trend)}%
                  </div>
                )}
              </div>
              <p className="text-(--text-secondary) text-sm mb-1">
                {kpi.label}
              </p>
              <p className="text-2xl font-bold text-(--text-primary)">
                {kpi.value}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
