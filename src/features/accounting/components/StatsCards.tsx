import { Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency } from './constants';

interface StatsCardsProps {
  cashBalance: number;
  totalIncome: number;
  totalExpense: number;
}

export default function StatsCards({ cashBalance, totalIncome, totalExpense }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-linear-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-5 h-5 opacity-80" />
          <span className="text-sm font-medium opacity-90">Saldo en Caja</span>
        </div>
        <div className="text-3xl font-bold">{formatCurrency(cashBalance)}</div>
      </div>

      <div className="bg-white rounded-xl p-5 border border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <ArrowUpRight className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-medium text-slate-600">Ingresos</span>
        </div>
        <div className="text-2xl font-bold text-emerald-600">
          {formatCurrency(totalIncome)}
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 border border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <ArrowDownRight className="w-5 h-5 text-rose-600" />
          <span className="text-sm font-medium text-slate-600">Gastos</span>
        </div>
        <div className="text-2xl font-bold text-rose-600">
          {formatCurrency(totalExpense)}
        </div>
      </div>
    </div>
  );
}
