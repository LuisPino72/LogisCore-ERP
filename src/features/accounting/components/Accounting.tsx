import { useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  TrendingUp, 
  TrendingDown,
  Wallet,
  DollarSign,
} from 'lucide-react';
import { useAccounting, AccountingTab } from '../hooks/useAccounting';
import type { MovementType, MovementCategory, MovementPaymentMethod } from '@/lib/db';

const CATEGORIES: { value: MovementCategory; label: string }[] = [
  { value: 'sale', label: 'Venta' },
  { value: 'purchase', label: 'Compra' },
  { value: 'production', label: 'Producción' },
  { value: 'refund', label: 'Reembolso' },
  { value: 'adjustment', label: 'Ajuste' },
  { value: 'salary', label: 'Salario' },
  { value: 'rent', label: 'Alquiler' },
  { value: 'utilities', label: 'Servicios' },
  { value: 'investment', label: 'Inversión' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'other', label: 'Otro' },
];

const PAYMENT_METHODS: { value: MovementPaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'pago_movil', label: 'Pago Móvil' },
  { value: 'bank_transfer', label: 'Transferencia' },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export default function Accounting() {
  const {
    activeTab,
    setActiveTab,
    stats,
    cashBalance,
    loading,
    filters,
    setFilters,
    createMovement,
    getFilteredMovements,
    getCategorySummary,
  } = useAccounting();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMovement, setNewMovement] = useState({
    type: 'expense' as MovementType,
    category: 'other' as MovementCategory,
    amount: '',
    paymentMethod: 'cash' as MovementPaymentMethod,
    description: '',
  });

  const filteredMovements = getFilteredMovements();
  const categorySummary = getCategorySummary();

  const handleCreateMovement = async () => {
    if (!newMovement.amount || parseFloat(newMovement.amount) <= 0) {
      return;
    }

    await createMovement({
      type: newMovement.type,
      category: newMovement.category,
      amount: parseFloat(newMovement.amount),
      paymentMethod: newMovement.paymentMethod,
      description: newMovement.description,
    });

    setShowCreateModal(false);
    setNewMovement({
      type: 'expense',
      category: 'other',
      amount: '',
      paymentMethod: 'cash',
      description: '',
    });
  };

  const tabs: { id: AccountingTab; label: string }[] = [
    { id: 'movements', label: 'Movimientos' },
    { id: 'reports', label: 'Reportes' },
    { id: 'balance', label: 'Balance' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-800" title="Gestionar movimientos de caja y banco">Caja / Banco</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          title="Registrar nuevo movimiento"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Movimiento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white">
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
            {formatCurrency(stats?.totalIncome || 0)}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownRight className="w-5 h-5 text-rose-600" />
            <span className="text-sm font-medium text-slate-600">Gastos</span>
          </div>
          <div className="text-2xl font-bold text-rose-600">
            {formatCurrency(stats?.totalExpense || 0)}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="border-b border-slate-200 px-4">
          <div className="flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.id === 'movements' ? 'Ver todos los movimientos' : tab.id === 'reports' ? 'Ver reportes' : 'Ver balance'}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
          </div>
        </div>

        {activeTab === 'movements' && (
          <div className="p-4">
            <div className="flex flex-wrap gap-3 mb-4">
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value as any })}
                title="Filtrar por tipo de movimiento"
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="all">Todos los tipos</option>
                <option value="income">Ingreso</option>
                <option value="expense">Gasto</option>
                <option value="transfer">Transferencia</option>
              </select>

              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value as any })}
                title="Filtrar por categoría"
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="all">Todas las categorías</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Buscar..."
                title="Buscar movimientos"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm flex-1 min-w-[200px]"
              />
            </div>

            {loading ? (
              <div className="text-center py-8 text-slate-400">Cargando...</div>
            ) : filteredMovements.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No hay movimientos registrados
              </div>
            ) : (
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
                    {filteredMovements.map((movement) => (
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
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Resumen por Categoría</h3>
            <div className="space-y-3">
              {categorySummary.length === 0 ? (
                <p className="text-slate-400">No hay datos suficientes</p>
              ) : (
                categorySummary.map((item) => (
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
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'balance' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-emerald-50 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-6 h-6 text-emerald-600" />
                  <h3 className="text-lg font-semibold text-emerald-800">Balance Positivo</h3>
                </div>
                <p className="text-4xl font-bold text-emerald-700">
                  {formatCurrency(stats?.totalIncome || 0)}
                </p>
                <p className="text-sm text-emerald-600 mt-2">Total de ingresos registrados</p>
              </div>

              <div className="bg-rose-50 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-6 h-6 text-rose-600" />
                  <h3 className="text-lg font-semibold text-rose-800">Balance Negativo</h3>
                </div>
                <p className="text-4xl font-bold text-rose-700">
                  {formatCurrency(stats?.totalExpense || 0)}
                </p>
                <p className="text-sm text-rose-600 mt-2">Total de gastos registrados</p>
              </div>

              <div className="md:col-span-2 bg-slate-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Balance Neto</h3>
                <p className={`text-4xl font-bold ${
                  (stats?.netBalance || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {formatCurrency(stats?.netBalance || 0)}
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  Ingresos menos Gastos
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Nuevo Movimiento</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewMovement({ ...newMovement, type: 'income' })}
                    title="Marcar como ingreso"
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                      newMovement.type === 'income'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Ingreso
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewMovement({ ...newMovement, type: 'expense' })}
                    title="Marcar como gasto"
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                      newMovement.type === 'expense'
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
                  value={newMovement.category}
                  onChange={(e) => setNewMovement({ ...newMovement, category: e.target.value as MovementCategory })}
                  title="Seleccionar categoría"
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
                  value={newMovement.amount}
                  onChange={(e) => setNewMovement({ ...newMovement, amount: e.target.value })}
                  title="Ingrese el monto del movimiento"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Método de Pago</label>
                <select
                  value={newMovement.paymentMethod}
                  onChange={(e) => setNewMovement({ ...newMovement, paymentMethod: e.target.value as MovementPaymentMethod })}
                  title="Seleccionar método de pago"
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
                  value={newMovement.description}
                  onChange={(e) => setNewMovement({ ...newMovement, description: e.target.value })}
                  title="Descripción del movimiento"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  placeholder="Descripción del movimiento"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateMovement}
                disabled={!newMovement.amount || parseFloat(newMovement.amount) <= 0}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}