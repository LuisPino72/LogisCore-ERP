import { DollarSign } from 'lucide-react';
import { formatCurrency } from './constants';

interface BalanceStats {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
}

interface BalanceCardsProps {
  stats: BalanceStats;
}

export default function BalanceCards({ stats }: BalanceCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-emerald-50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-6 h-6 text-emerald-600" />
          <h3 className="text-lg font-semibold text-emerald-800">Balance Positivo</h3>
        </div>
        <p className="text-4xl font-bold text-emerald-700">
          {formatCurrency(stats.totalIncome)}
        </p>
        <p className="text-sm text-emerald-600 mt-2">Total de ingresos registrados</p>
      </div>

      <div className="bg-rose-50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-6 h-6 text-rose-600" />
          <h3 className="text-lg font-semibold text-rose-800">Balance Negativo</h3>
        </div>
        <p className="text-4xl font-bold text-rose-700">
          {formatCurrency(stats.totalExpense)}
        </p>
        <p className="text-sm text-rose-600 mt-2">Total de gastos registrados</p>
      </div>

      <div className="md:col-span-2 bg-slate-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Balance Neto</h3>
        <p className={`text-4xl font-bold ${
          stats.netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'
        }`}>
          {formatCurrency(stats.netBalance)}
        </p>
        <p className="text-sm text-slate-500 mt-2">
          Ingresos menos Gastos
        </p>
      </div>
    </div>
  );
}
