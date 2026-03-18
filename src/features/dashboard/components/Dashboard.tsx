import { useState, useMemo } from 'react'
import { useTenantStore } from '@/store/useTenantStore'
import { useDashboard } from '../hooks/useDashboard'
import { formatBs } from '../../exchange-rate/services/exchangeRate.service'
import Button from '@/common/Button'
import {
  DollarSign,
  ShoppingBag,
  PackageX,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  LayoutDashboard,
  BarChart3,
  PieChart,
  Package,
  Loader2,
  RefreshCw,
  X,
  Calendar,
  Trophy,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import type { TabType } from '../types/dashboard.types'
import { calculateTrend } from '../services/dashboard.service'

const quickRanges = [
  { label: 'Hoy', days: 0 },
  { label: 'Esta semana', days: 7 },
  { label: 'Este mes', days: 30 },
  { label: 'Últimos 3 meses', days: 90 },
]

export type Module = 'dashboard' | 'sales' | 'inventory' | 'pos' | 'recipes' | 'reports' | 'purchases' | 'employees'

interface DashboardProps {
  isLoadingData?: boolean
  onNavigate?: (module: Module) => void
}

export default function Dashboard({ isLoadingData: _isLoadingData, onNavigate }: DashboardProps) {
  const tenant = useTenantStore((state) => state.currentTenant)
  const [activeTab, setActiveTab] = useState<TabType>('resumen')
  const [showManualRateModal, setShowManualRateModal] = useState(false)
  const [manualRateInput, setManualRateInput] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showLowStockModal, setShowLowStockModal] = useState(false)
  const [lowStockPage, setLowStockPage] = useState(1)
  const ITEMS_PER_PAGE = 5

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

  const totalLowStockPages = Math.ceil(lowStockProducts.length / ITEMS_PER_PAGE)
  const paginatedLowStock = lowStockProducts.slice(
    (lowStockPage - 1) * ITEMS_PER_PAGE,
    lowStockPage * ITEMS_PER_PAGE
  )

  const handleSaveManualRateClick = async () => {
    await handleSaveManualRate(manualRateInput)
    setShowManualRateModal(false)
    setManualRateInput('')
  }

  const handleQuickRange = (days: number) => {
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    const start = new Date()
    start.setDate(start.getDate() - days)
    start.setHours(0, 0, 0, 0)
    setDateRange({ start, end })
    setShowDatePicker(false)
  }

  const formatDateInput = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const handleDateInputChange = (field: 'start' | 'end', value: string) => {
    const newDate = new Date(value)
    newDate.setHours(23, 59, 59, 999)
    setDateRange({
      ...dateRange,
      [field]: newDate,
    })
  }

  const salesTrend = useMemo(() => calculateTrend(stats.salesToday, stats.salesYesterday), [stats.salesToday, stats.salesYesterday])
  const revenueTrend = useMemo(() => calculateTrend(stats.monthlyRevenue, stats.lastMonthRevenue), [stats.monthlyRevenue, stats.lastMonthRevenue])
  const maxDailySale = useMemo(() => Math.max(...dailySales.map(d => Math.max(d.current, d.previous)), 1), [dailySales])
  const maxCategorySale = useMemo(() => Math.max(...categorySales.map(c => c.total), 1), [categorySales])

  const tabs = [
    { id: 'resumen' as TabType, label: 'Resumen', icon: LayoutDashboard },
    { id: 'ventas' as TabType, label: 'Ventas', icon: BarChart3 },
    { id: 'categorias' as TabType, label: 'Categorías', icon: PieChart },
    { id: 'inventario' as TabType, label: 'Inventario', icon: Package },
  ]

  const colorClasses: Record<string, { icon: string; text: string }> = {
    blue: { icon: 'bg-blue-500/20', text: 'text-blue-400' },
    green: { icon: 'bg-green-500/20', text: 'text-green-400' },
    amber: { icon: 'bg-amber-500/20', text: 'text-amber-400' },
    red: { icon: 'bg-red-500/20', text: 'text-red-400' },
  }

  const getCurrentGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  const formatDate = () => new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  const TrendIndicator = ({ value }: { value: number }) => value === 0 ? null : (
    <div className={`flex items-center gap-1 text-xs font-medium ${value > 0 ? 'text-green-400' : 'text-red-400'}`}>
      {value > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(value).toFixed(1)}%
    </div>
  )

  const renderKPI = (
    label: string,
    value: string,
    Icon: React.ElementType,
    color: string,
    trend: number | null,
    onClick?: () => void
  ) => (
    <div
      className={`bg-(--bg-secondary) border border-(--border-color) rounded-xl p-5 shadow-lg hover:shadow-xl hover:border-(--brand-500)/30 transition-all ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${colorClasses[color].icon}`}>
          <Icon className={`w-5 h-5 ${colorClasses[color].text}`} />
        </div>
        {trend !== null && <TrendIndicator value={trend} />}
        {onClick && <ExternalLink className="w-4 h-4 text-(--text-muted) opacity-0 group-hover:opacity-100" />}
      </div>
      <p className="text-(--text-secondary) text-sm mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-2xl font-bold text-(--text-primary)">{value}</p>
        {onClick && <ExternalLink className="w-4 h-4 text-(--text-muted)" />}
      </div>
    </div>
  )

  const renderTopProducts = () => (
    <div className="bg-(--bg-secondary) border border-(--border-color) rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-400" />
        Top 5 Productos
      </h3>
      {topProducts.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Trophy className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No hay ventas en este período</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topProducts.map((product, index) => (
            <div key={product.localId} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                index === 0 ? 'bg-amber-500/20 text-amber-400' :
                index === 1 ? 'bg-slate-400/20 text-slate-300' :
                index === 2 ? 'bg-orange-700/20 text-orange-400' :
                'bg-slate-700 text-slate-500'
              }`}>
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{product.name}</p>
                <p className="text-xs text-slate-500">{product.categoryName}</p>
              </div>
              <div className="text-right">
                <p className="text-green-400 font-medium">${product.total.toFixed(2)}</p>
                <p className="text-xs text-slate-500">{product.quantity} uni.</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderSalesChart = () => (
    <div className="bg-(--bg-secondary) border border-(--border-color) rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-6">Ventas del Período</h3>
      <div className="flex items-end justify-between gap-2 h-64">
        {dailySales.map((day, index) => {
          const currentHeight = maxDailySale > 0 ? (day.current / maxDailySale) * 100 : 0
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex items-end justify-center h-48">
                <div className="w-full bg-green-500/60 rounded-t hover:bg-green-400 transition-colors relative group" style={{ height: `${currentHeight}%` }}>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    ${day.current.toFixed(2)}
                  </div>
                </div>
              </div>
              <span className="text-xs text-slate-500">{day.day}</span>
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderCategoryChart = () => (
    <div className="bg-(--bg-secondary) border border-(--border-color) rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-6">Ventas por Categoría</h3>
      {categorySales.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <PieChart className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay datos de ventas por categoría</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categorySales.map((cat, index) => {
            const percentage = maxCategorySale > 0 ? (cat.total / maxCategorySale) * 100 : 0
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{cat.category}</span>
                  <span className="text-green-400 font-medium">${cat.total.toFixed(2)}</span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: cat.color }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  const renderLowStockList = () => (
    <div className="bg-(--bg-secondary) border border-(--border-color) rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Productos con Stock Bajo</h3>
      {lowStockProducts.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <PackageX className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay productos con stock bajo</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {lowStockProducts.map((product) => (
            <div key={product.localId} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{product.name}</p>
                <p className="text-xs text-slate-500">{product.categoryName}</p>
              </div>
              <div className={`text-right px-3 py-1 rounded-full text-sm font-bold ${product.stock === 0 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {product.stock} uni.
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderResumen = () => (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2">
        {renderSalesChart()}
      </div>
      {renderTopProducts()}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-(--text-primary) mb-1">{getCurrentGreeting()} 👋</h2>
            <p className="text-(--text-secondary)">Bienvenido a <span className="text-(--brand-400) font-medium">{tenant?.name}</span></p>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-(--text-secondary) capitalize">{formatDate()}</p>
            {exchangeRate && (
              <button
                onClick={() => setShowManualRateModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-sm text-blue-400 transition-colors"
              >
                <DollarSign className="w-4 h-4" />
                <span className="font-medium">{formatBs(exchangeRate.rate)}</span>
                <RefreshCw className={`w-3 h-3 ${isUpdatingRate ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex items-center gap-2 px-4 py-2 bg-(--bg-secondary) border border-(--border-color) rounded-lg text-(--text-primary) hover:border-(--brand-500)/50 transition-colors"
          >
            <Calendar className="w-4 h-4 text-(--text-secondary)" />
            <span className="text-sm">
              {formatDateInput(dateRange.start)} - {formatDateInput(dateRange.end)}
            </span>
          </button>
          {showDatePicker && (
            <div className="absolute top-full left-0 mt-2 bg-(--bg-secondary) border border-(--border-color) rounded-xl p-4 shadow-xl z-20 min-w-72">
              <div className="flex gap-2 mb-4">
                {quickRanges.map((range) => (
                  <button
                    key={range.label}
                    onClick={() => handleQuickRange(range.days)}
                    className="px-3 py-1.5 text-xs bg-(--bg-tertiary) hover:bg-(--brand-500)/20 hover:text-(--brand-400) rounded-lg transition-colors"
                  >
                    {range.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-(--text-secondary) mb-1">Desde</label>
                  <input
                    type="date"
                    value={formatDateInput(dateRange.start)}
                    onChange={(e) => handleDateInputChange('start', e.target.value)}
                    className="w-full px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-(--text-secondary) mb-1">Hasta</label>
                  <input
                    type="date"
                    value={formatDateInput(dateRange.end)}
                    onChange={(e) => handleDateInputChange('end', e.target.value)}
                    className="w-full px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderKPI('Ventas Hoy', `$${stats.salesToday.toFixed(2)}`, DollarSign, 'blue', salesTrend, () => onNavigate?.('sales'))}
        {renderKPI('Órdenes del Mes', stats.ordersThisMonth.toString(), ShoppingBag, 'amber', null, () => onNavigate?.('purchases'))}
        {renderKPI('Stock Bajo', stats.lowStockProducts.toString(), PackageX, stats.lowStockProducts > 0 ? 'red' : 'green', null, stats.lowStockProducts > 0 ? () => setShowLowStockModal(true) : undefined)}
        {renderKPI('Ingresos del Período', `$${stats.monthlyRevenue.toFixed(2)}`, TrendingUp, 'green', revenueTrend)}
      </div>

      <div className="bg-(--bg-secondary) border border-(--border-color) rounded-xl overflow-hidden">
        <div className="flex border-b border-slate-700/50 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all whitespace-nowrap ${isActive ? 'text-(--brand-400) border-b-2 border-(--brand-500) bg-(--brand-500)/5' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
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
              {activeTab === 'resumen' && renderResumen()}
              {activeTab === 'ventas' && renderSalesChart()}
              {activeTab === 'categorias' && renderCategoryChart()}
              {activeTab === 'inventario' && renderLowStockList()}
            </>
          )}
        </div>
      </div>

      {showManualRateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color)">
              <h3 className="text-lg font-semibold text-(--text-primary)">Configurar Tasa BCV</h3>
              <button onClick={() => setShowManualRateModal(false)} className="p-1.5 hover:bg-(--bg-tertiary) rounded-lg transition-colors">
                <X className="w-5 h-5 text-(--text-muted)" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-400">Ingrese la tasa del dólar manualmente.</p>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Tasa (Bs por USD)</label>
                <input
                  type="text" inputMode="decimal" value={manualRateInput} onChange={(e) => setManualRateInput(e.target.value)}
                  placeholder="Ej: 36.50"
                  className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
                />
              </div>
              <Button onClick={handleSaveManualRateClick} className="w-full py-2.5">Guardar Tasa</Button>
            </div>
          </div>
        </div>
      )}

      {showLowStockModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color)">
              <h3 className="text-lg font-semibold text-(--text-primary) flex items-center gap-2">
                <PackageX className="w-5 h-5 text-amber-400" />
                Productos con Stock Bajo
              </h3>
              <button onClick={() => { setShowLowStockModal(false); setLowStockPage(1) }} className="p-1.5 hover:bg-(--bg-tertiary) rounded-lg transition-colors">
                <X className="w-5 h-5 text-(--text-muted)" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-(--text-secondary) mb-4">
                Mostrando {((lowStockPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(lowStockPage * ITEMS_PER_PAGE, lowStockProducts.length)} de {lowStockProducts.length} productos
              </p>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {paginatedLowStock.map((product) => (
                  <div key={product.localId} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{product.name}</p>
                      <p className="text-xs text-slate-500">{product.categoryName}</p>
                    </div>
                    <div className={`text-right px-3 py-1 rounded-full text-sm font-bold ${product.stock === 0 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {product.stock} uni.
                    </div>
                  </div>
                ))}
              </div>
              {totalLowStockPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-(--border-color)">
                  <button
                    onClick={() => setLowStockPage(p => Math.max(1, p - 1))}
                    disabled={lowStockPage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 bg-(--bg-tertiary) hover:bg-(--brand-500)/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-(--text-primary)"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>
                  <span className="text-sm text-(--text-secondary)">
                    {lowStockPage} / {totalLowStockPages}
                  </span>
                  <button
                    onClick={() => setLowStockPage(p => Math.min(totalLowStockPages, p + 1))}
                    disabled={lowStockPage === totalLowStockPages}
                    className="flex items-center gap-1 px-3 py-1.5 bg-(--bg-tertiary) hover:bg-(--brand-500)/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-(--text-primary)"
                  >
                    Siguiente
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-(--border-color)">
              <Button onClick={() => onNavigate?.('inventory')} className="w-full">
                Ver Inventario Completo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}