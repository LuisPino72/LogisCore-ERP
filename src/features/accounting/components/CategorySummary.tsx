import { TrendingUp, TrendingDown } from 'lucide-react';
import { CATEGORIES, formatCurrency } from './constants';

interface CategorySummaryProps {
  items: { category: string; type: string; amount: number }[];
}

export default function CategorySummary({ items }: CategorySummaryProps) {
  if (items.length === 0) {
    return <p className="text-slate-400">No hay datos suficientes</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.category}
          className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
        >
          <div className="flex items-center gap-3">
            {item.type === 'income' ? (
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-rose-600" />
            )}
            <span className="font-medium text-slate-700">
              {CATEGORIES.find(c => c.value === item.category)?.label || item.category}
            </span>
          </div>
          <span className={`font-semibold ${
            item.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {formatCurrency(item.amount as number)}
          </span>
        </div>
      ))}
    </div>
  );
}
