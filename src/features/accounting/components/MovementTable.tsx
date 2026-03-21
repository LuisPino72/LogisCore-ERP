import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { CATEGORIES, PAYMENT_METHODS, formatDate, formatCurrency } from './constants';
import type { Movement } from '@/lib/db';

interface MovementTableProps {
  movements: Movement[];
  isLoading: boolean;
}

export default function MovementTable({ movements, isLoading }: MovementTableProps) {
  if (isLoading) {
    return <div className="text-center py-8 text-slate-400">Cargando...</div>;
  }

  if (movements.length === 0) {
    return <div className="text-center py-8 text-slate-400">No hay movimientos registrados</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-sm text-slate-500 border-b border-slate-100">
            <th className="pb-3 px-2 font-medium">Fecha</th>
            <th className="pb-3 px-2 font-medium">Tipo</th>
            <th className="pb-3 px-2 font-medium">Categoría</th>
            <th className="pb-3 px-2 font-medium">Descripción</th>
            <th className="pb-3 px-2 font-medium">Método</th>
            <th className="pb-3 px-2 font-medium text-right">Monto</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((movement) => (
            <tr
              key={movement.localId}
              className="border-b border-slate-50 hover:bg-slate-50"
            >
              <td className="py-3 px-2 text-sm text-slate-600">
                {formatDate(movement.createdAt)}
              </td>
              <td className="py-3 px-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    movement.type === 'income'
                      ? 'bg-emerald-50 text-emerald-700'
                      : movement.type === 'expense'
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {movement.type === 'income' ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : movement.type === 'expense' ? (
                    <ArrowDownRight className="w-3 h-3" />
                  ) : null}
                  {movement.type === 'income' ? 'Ingreso' : movement.type === 'expense' ? 'Gasto' : 'Transferencia'}
                </span>
              </td>
              <td className="py-3 px-2 text-sm text-slate-600">
                {CATEGORIES.find(c => c.value === movement.category)?.label || movement.category}
              </td>
              <td className="py-3 px-2 text-sm text-slate-600">
                {movement.description || '-'}
              </td>
              <td className="py-3 px-2 text-sm text-slate-500">
                {movement.paymentMethod ? 
                  PAYMENT_METHODS.find(p => p.value === movement.paymentMethod)?.label || movement.paymentMethod 
                  : '-'}
              </td>
              <td className={`py-3 px-2 text-sm font-medium text-right ${
                movement.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {movement.type === 'income' ? '+' : '-'}
                {formatCurrency(movement.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
