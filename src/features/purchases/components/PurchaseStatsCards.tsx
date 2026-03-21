import Card from "@/common/Card";
import { Check, Truck, Package } from "lucide-react";

interface PurchaseStats {
  totalCompleted: number;
  totalPending: number;
  countCompleted: number;
  countPending: number;
  avgPurchase: number;
}

interface PurchaseStatsCardsProps {
  stats: PurchaseStats | null;
}

export default function PurchaseStatsCards({ stats }: PurchaseStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">Total Completado</p>
            <p className="text-2xl font-bold text-green-400">
              ${stats?.totalCompleted.toFixed(2) || "0.00"}
            </p>
            <p className="text-xs text-(--text-muted)">
              {stats?.countCompleted || 0} compras
            </p>
          </div>
          <div className="p-3 bg-green-500/20 rounded-lg">
            <Check className="w-6 h-6 text-green-400" />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">Pendiente</p>
            <p className="text-2xl font-bold text-yellow-400">
              ${stats?.totalPending.toFixed(2) || "0.00"}
            </p>
            <p className="text-xs text-(--text-muted)">
              {stats?.countPending || 0} compras
            </p>
          </div>
          <div className="p-3 bg-yellow-500/20 rounded-lg">
            <Truck className="w-6 h-6 text-yellow-400" />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">Total Compras</p>
            <p className="text-2xl font-bold text-(--text-primary)">
              ${((stats?.totalCompleted || 0) + (stats?.totalPending || 0)).toFixed(2)}
            </p>
            <p className="text-xs text-(--text-muted)">
              Promedio: ${stats?.avgPurchase.toFixed(2) || "0.00"}
            </p>
          </div>
          <div className="p-3 bg-(--brand-500)/20 rounded-lg">
            <Package className="w-6 h-6 text-(--brand-400)" />
          </div>
        </div>
      </Card>
    </div>
  );
}
