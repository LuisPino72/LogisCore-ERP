import { useState } from 'react';
import { X } from 'lucide-react';
import { CATEGORIES, PAYMENT_METHODS } from './constants';
import type { MovementType, MovementCategory, MovementPaymentMethod } from '@/lib/db';

interface CreateMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (movement: {
    type: MovementType;
    category: MovementCategory;
    amount: number;
    paymentMethod: MovementPaymentMethod;
    description: string;
  }) => Promise<string | null>;
}

export default function CreateMovementModal({ isOpen, onClose, onCreate }: CreateMovementModalProps) {
  const [form, setForm] = useState({
    type: 'expense' as MovementType,
    category: 'other' as MovementCategory,
    amount: '',
    paymentMethod: 'cash' as MovementPaymentMethod,
    description: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) {
      return;
    }

    await onCreate({
      type: form.type,
      category: form.category,
      amount: parseFloat(form.amount),
      paymentMethod: form.paymentMethod,
      description: form.description,
    });

    setForm({
      type: 'expense',
      category: 'other',
      amount: '',
      paymentMethod: 'cash',
      description: '',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-800">Nuevo Movimiento</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'income' })}
                title="Marcar como ingreso"
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                  form.type === 'income'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                Ingreso
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'expense' })}
                title="Marcar como gasto"
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                  form.type === 'expense'
                    ? 'border-rose-500 bg-rose-50 text-rose-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                Gasto
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as MovementCategory })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monto</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Método de Pago</label>
            <select
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as MovementPaymentMethod })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            >
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm.value} value={pm.value}>{pm.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción (opcional)</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              placeholder="Descripción del movimiento"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.amount || parseFloat(form.amount) <= 0}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Crear
          </button>
        </div>
      </div>
    </div>
  );
}
