import Card from "@/common/Card";
import { TrendingUp } from "lucide-react";

interface DailyStatsCardProps {
  totalAmount: number;
  transactionCount: number;
}

export default function DailyStatsCard({ totalAmount, transactionCount }: DailyStatsCardProps) {
  return (
    <Card className="bg-linear-to-br from-green-900/30 to-green-800/20 border-green-500/30">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-x uppercase tracking-wide">Hoy</p>
          <p className="text-xl font-bold">${totalAmount.toFixed(2) || "0.00"}</p>
          <p className="text-xs">{transactionCount || 0} ventas</p>
        </div>
        <div className="p-2 bg-green-500/20 rounded-lg">
          <TrendingUp className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}
