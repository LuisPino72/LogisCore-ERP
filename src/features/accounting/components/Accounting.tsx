import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAccounting, AccountingTab } from '../hooks/useAccounting';
import StatsCards from './StatsCards';
import MovementFilters from './MovementFilters';
import MovementTable from './MovementTable';
import CategorySummary from './CategorySummary';
import BalanceCards from './BalanceCards';
import CreateMovementModal from './CreateMovementModal';

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

  const filteredMovements = getFilteredMovements();
  const categorySummary = getCategorySummary();

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

      <StatsCards
        cashBalance={cashBalance}
        totalIncome={stats?.totalIncome || 0}
        totalExpense={stats?.totalExpense || 0}
      />

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
            <MovementFilters
              type={filters.type}
              category={filters.category}
              search={filters.search}
              onTypeChange={(value) => setFilters({ ...filters, type: value as any })}
              onCategoryChange={(value) => setFilters({ ...filters, category: value as any })}
              onSearchChange={(value) => setFilters({ ...filters, search: value })}
            />

            <MovementTable
              movements={filteredMovements}
              isLoading={loading}
            />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Resumen por Categoría</h3>
            <CategorySummary items={categorySummary} />
          </div>
        )}

        {activeTab === 'balance' && (
          <div className="p-6">
            <BalanceCards
              stats={{
                totalIncome: stats?.totalIncome || 0,
                totalExpense: stats?.totalExpense || 0,
                netBalance: stats?.netBalance || 0,
              }}
            />
          </div>
        )}
      </div>

      <CreateMovementModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={createMovement}
      />
    </div>
  );
}
