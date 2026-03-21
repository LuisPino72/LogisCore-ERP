import { useState, useMemo } from 'react'
import { useTenantStore } from '@/store/useTenantStore'
import { useDashboard } from '../hooks/useDashboard'
import {
  DollarSign,
  ShoppingBag,
  PackageX,
  TrendingUp,
  LayoutDashboard,
  BarChart3,
  PieChart,
  Package,
  Loader2,
} from 'lucide-react'
import type { TabType } from '../types/dashboard.types'
import { calculateTrend } from '../services/dashboard.service'
import { KPICard } from './KPICard'
import { SalesChart } from './SalesChart'
import { CategoryChart } from './CategoryChart'
import { TopProducts } from './TopProducts'
import { LowStockList } from './LowStockList'
import { DashboardHeader } from './DashboardHeader'
import { ManualRateModal } from './ManualRateModal'
import { LowStockModal } from './LowStockModal'

const tabs = [
  { id: 'resumen' as TabType, label: 'Resumen', icon: LayoutDashboard },
  { id: 'ventas' as TabType, label: 'Ventas', icon: BarChart3 },
  { id: 'categorias' as TabType, label: 'Categorías', icon: PieChart },
  { id: 'inventario' as TabType, label: 'Inventario', icon: Package },
]

export default function Dashboard({ isLoadingData: _isLoadingData, onNavigate }: { isLoadingData?: boolean; onNavigate?: (module: 'dashboard' | 'sales' | 'inventory' | 'pos' | 'recipes' | 'reports' | 'purchases' | 'employees') => void }) {
  const tenant = useTenantStore((state) => state.currentTenant)
  const [activeTab, setActiveTab] = useState<TabType>('resumen')
  const [showManualRateModal, setShowManualRateModal] = useState(false)
  const [manualRateInput, setManualRateInput] = useState('')
  const [showLowStockModal, setShowLowStockModal] = useState(false)

  const {
    stats,
    dailySales,
    categorySales,
    lowStockProducts,
    topProducts,
    loading,
    exchangeRate,
    isUpdatingRate,
    dateRange,
    handleSaveManualRate,
    setDateRange,
  } = useDashboard()

  const salesTrend = useMemo(
    () => calculateTrend(stats.salesToday, stats.salesYesterday),
    [stats.salesToday, stats.salesYesterday]
  )
  const revenueTrend = useMemo(
    () => calculateTrend(stats.monthlyRevenue, stats.lastMonthRevenue),
    [stats.monthlyRevenue, stats.lastMonthRevenue]
  )
  const maxDailySale = useMemo(
    () => Math.max(...dailySales.map((d) => Math.max(d.current, d.previous)), 1),
    [dailySales]
  )
  const maxCategorySale = useMemo(
    () => Math.max(...categorySales.map((c) => c.total), 1),
    [categorySales]
  )

  const handleSaveManualRateClick = async () => {
    await handleSaveManualRate(manualRateInput)
    setShowManualRateModal(false)
    setManualRateInput('')
  }

  const tabDescriptions: Record<string, string> = {
    resumen: 'Vista general de métricas principales',
    ventas: 'Gráfico de ventas del período seleccionado',
    categorias: 'Distribución de ventas por categoría',
    inventario: 'Productos con stock bajo o agotado',
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        tenantName={tenant?.name}
        exchangeRate={exchangeRate}
        isUpdatingRate={isUpdatingRate}
        dateRange={dateRange}
        onSetDateRange={setDateRange}
        onOpenRateModal={() => setShowManualRateModal(true)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Ventas Hoy"
          value={`$${stats.salesToday.toFixed(2)}`}
          icon={DollarSign}
          color="blue"
          trend={salesTrend}
          comparison={{ value: stats.salesYesterday, label: 'Ayer' }}
          sparkCurrent={stats.salesToday}
          sparkPrevious={stats.salesYesterday}
          onClick={() => onNavigate?.('sales')}
          tooltip="Ventas del día vs día anterior - Clic para ver detalle"
        />
        <KPICard
          label="Órdenes del Mes"
          value={stats.ordersThisMonth.toString()}
          icon={ShoppingBag}
          color="amber"
          trend={null}
          tooltip="Total de órdenes de compra registradas este mes"
        />
        <KPICard
          label="Stock Bajo"
          value={stats.lowStockProducts.toString()}
          icon={PackageX}
          color={stats.lowStockProducts > 0 ? 'red' : 'green'}
          trend={null}
          onClick={stats.lowStockProducts > 0 ? () => setShowLowStockModal(true) : undefined}
          tooltip="Productos por debajo del stock mínimo - Clic para ver lista"
        />
        <KPICard
          label="Ingresos del Período"
          value={`$${stats.monthlyRevenue.toFixed(2)}`}
          icon={TrendingUp}
          color="green"
          trend={revenueTrend}
          tooltip="Total de ingresos en el período seleccionado"
        />
      </div>

      <div className="bg-(--bg-secondary) border border-(--border-color) rounded-xl overflow-hidden">
        <div className="flex border-b border-slate-700/50 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={tabDescriptions[tab.id]}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'text-(--brand-400) border-b-2 border-(--brand-500) bg-(--brand-500)/5'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-(--brand-400) animate-spin" />
              <span className="ml-3 text-slate-400">Cargando datos...</span>
            </div>
          ) : (
            <>
              {activeTab === 'resumen' && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <div className="xl:col-span-2">
                    <SalesChart dailySales={dailySales} maxDailySale={maxDailySale} />
                  </div>
                  <TopProducts products={topProducts} />
                </div>
              )}
              {activeTab === 'ventas' && (
                <SalesChart dailySales={dailySales} maxDailySale={maxDailySale} />
              )}
              {activeTab === 'categorias' && (
                <CategoryChart categorySales={categorySales} maxCategorySale={maxCategorySale} />
              )}
              {activeTab === 'inventario' && (
                <LowStockList products={lowStockProducts} lowStockCount={stats.lowStockProducts} />
              )}
            </>
          )}
        </div>
      </div>

      <ManualRateModal
        isOpen={showManualRateModal}
        value={manualRateInput}
        onChange={setManualRateInput}
        onSave={handleSaveManualRateClick}
        onClose={() => setShowManualRateModal(false)}
      />

      <LowStockModal
        isOpen={showLowStockModal}
        products={lowStockProducts}
        onClose={() => setShowLowStockModal(false)}
        onNavigate={() => onNavigate?.('inventory')}
      />
    </div>
  )
}
