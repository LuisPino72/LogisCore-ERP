import Card from "@/common/Card";
import { DollarSign, Receipt, TrendingUp, Banknote, CreditCard, Smartphone } from "lucide-react";

interface SalesStats {
  totalRevenue: number;
  totalTransactions: number;
  avgOrder: number;
  cashTotal: number;
  cardTotal: number;
  pagoMovilTotal: number;
}

interface SalesStatsGridProps {
  stats: SalesStats;
}

export default function SalesStatsGrid({ stats }: SalesStatsGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
      <Card title="Total de ingresos">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <span className="text-xs text-(--text-muted) uppercase">Ingresos</span>
        </div>
        <p className="text-2xl font-bold text-(--text-primary)">
          ${stats.totalRevenue.toFixed(2)}
        </p>
      </Card>

      <Card title="Número de transacciones">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-(--brand-500)/10 rounded-lg">
            <Receipt className="w-5 h-5 text-(--brand-400)" />
          </div>
          <span className="text-xs text-(--text-muted) uppercase">Tratos</span>
        </div>
        <p className="text-2xl font-bold text-(--text-primary)">
          {stats.totalTransactions}
        </p>
      </Card>

      <Card title="Promedio por venta">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <span className="text-xs text-(--text-muted) uppercase">Ticket Promedio</span>
        </div>
        <p className="text-2xl font-bold text-(--text-primary)">
          ${stats.avgOrder.toFixed(2)}
        </p>
      </Card>

      <Card title="Total en efectivo">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <Banknote className="w-5 h-5 text-amber-400" />
          </div>
          <span className="text-xs text-(--text-muted) uppercase">Efectivo</span>
        </div>
        <p className="text-2xl font-bold text-(--text-primary)">
          ${stats.cashTotal.toFixed(2)}
        </p>
      </Card>

      <Card title="Total con tarjeta">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <CreditCard className="w-5 h-5 text-indigo-400" />
          </div>
          <span className="text-xs text-(--text-muted) uppercase">Tarjeta</span>
        </div>
        <p className="text-2xl font-bold text-(--text-primary)">
          ${stats.cardTotal.toFixed(2)}
        </p>
      </Card>

      <Card title="Total con pago móvil">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Smartphone className="w-5 h-5 text-purple-400" />
          </div>
          <span className="text-xs text-(--text-muted) uppercase">Pago Móvil</span>
        </div>
        <p className="text-2xl font-bold text-(--text-primary)">
          ${stats.pagoMovilTotal.toFixed(2)}
        </p>
      </Card>
    </div>
  );
}
