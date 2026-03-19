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

  const TrendIndicator = ({ value, size = 'sm' }: { value: number; size?: 'sm' | 'lg' }) => value === 0 ? null : (
    <div className={`flex items-center gap-1 ${size === 'lg' ? 'text-sm' : 'text-xs'} font-medium ${value > 0 ? 'text-green-400' : 'text-red-400'}`}>
      {value > 0 ? <ArrowUpRight className={size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} /> : <ArrowDownRight className={size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} />}
      {Math.abs(value).toFixed(1)}%
    </div>
  )

  const renderMiniSparkline = (current: number, previous: number, color: string) => {
    const maxVal = Math.max(current, previous, 1)
    const currentHeight = (current / maxVal) * 24
    const previousHeight = (previous / maxVal) * 24
    return (
      <div className="flex items-end gap-0.5 h-6 w-12">
        <div className="w-1 bg-slate-700 rounded-t" style={{ height: '100%' }} />
        <div className="w-1 bg-slate-600 rounded-t" style={{ height: `${previousHeight}px`, marginTop: `${24 - previousHeight}px` }} />
        <div className="w-1 rounded-t" style={{ height: `${currentHeight}px`, marginTop: `${24 - currentHeight}px`, backgroundColor: color }} />
      </div>
    )
  }

  const renderKPI = (
    label: string,
    value: string,
    Icon: React.ElementType,
    color: string,
    trend: number | null,
    comparison?: { value: number; label: string },
    onClick?: () => void,
    tooltip?: string
  ) => (
    <div
      title={tooltip}
      className={`bg-(--bg-secondary) border border-(--border-color) rounded-xl p-5 shadow-lg hover:shadow-xl hover:border-(--brand-500)/30 transition-all ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${colorClasses[color].icon}`}>
          <Icon className={`w-5 h-5 ${colorClasses[color].text}`} />
        </div>
        {renderMiniSparkline(
          comparison ? stats.salesToday : 1,
          comparison ? stats.salesYesterday : 1,
          colorClasses[color].text.replace('text-', '')
        )}
      </div>
      <p className="text-(--text-secondary) text-sm mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-bold text-(--text-primary)">{value}</p>
        {trend !== null && <TrendIndicator value={trend} />}
      </div>
      {comparison && (
        <p className="text-xs text-slate-500 mt-1">
          Ayer: ${comparison.value.toFixed(2)}
        </p>
      )}
    </div>
  )

  const renderTopProducts = () => (
    <div className="bg-(--bg-secondary) border border-(--border-color) rounded-xl p-5">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2" title="Productos más vendidos en el período">
        <Trophy className="w-5 h-5 text-amber-400" />
        Top 5 Productos
      </h3>
      {topProducts.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Trophy className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No hay ventas en este período</p>
        </div>
      ) : (
        <div className="space-y-2">
          {topProducts.map((product, index) => (
            <div key={product.localId} className="group flex items-center gap-3 p-3 bg-(--bg-tertiary)/50 hover:bg-(--bg-tertiary) rounded-lg transition-colors">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                index === 0 ? 'bg-amber-500/20 text-amber-400' :
                index === 1 ? 'bg-slate-400/20 text-slate-300' :
                index === 2 ? 'bg-orange-700/20 text-orange-400' :
                'bg-slate-700/50 text-slate-500'
              }`}>
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">{product.name}</p>
                <p className="text-xs text-slate-500">{product.categoryName}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-green-400 font-semibold text-sm">${product.total.toFixed(2)}</p>
                <p className="text-[10px] text-slate-500">{product.quantity} uni.</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderSalesChart = () => (
    <div className="bg-(--bg-secondary) border border-(--border-color) rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white" title="Comparación de ventas entre período actual y anterior">Ventas del Período</h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-green-500" />
            <span className="text-slate-400">Período actual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-slate-600" />
            <span className="text-slate-400">Período anterior</span>
          </div>
        </div>
      </div>
      <div className="flex items-end justify-between gap-2 h-64">
        {dailySales.map((day, index) => {
          const currentHeight = maxDailySale > 0 ? (day.current / maxDailySale) * 100 : 0
          const previousHeight = maxDailySale > 0 ? (day.previous / maxDailySale) * 100 : 0
          const isPositive = day.current >= day.previous
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex items-end justify-center h-48 relative">
                {previousHeight > 0 && (
                  <div 
                    className="absolute bottom-0 w-4 bg-slate-700/60 rounded-t-sm" 
                    style={{ height: `${previousHeight}%` }} 
                  />
                )}
                <div className="w-4 bg-green-500/60 rounded-t hover:bg-green-400 transition-colors relative group z-10" style={{ height: `${currentHeight}%` }}>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                    <span className={isPositive ? 'text-green-400' : 'text-red-400'}>
                      ${day.current.toFixed(2)}
                    </span>
                    <span className="text-slate-400 block text-center text-[10px]">
                      vs ${day.previous.toFixed(2)}
                    </span>
                  </div>
                  <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-[6px] border-l-transparent border-r-transparent ${isPositive ? 'border-b-green-400' : 'border-b-red-400'}`} />
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
      <h3 className="text-lg font-semibold text-white mb-6" title="Porcentaje de ventas por cada categoría de producto">Ventas por Categoría</h3>
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
    <div className="bg-(--bg-secondary) border border-(--border-color) rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <PackageX className="w-5 h-5 text-amber-400" />
          Stock Bajo
        </h3>
        {stats.lowStockProducts > 0 && (
          <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full">
            {stats.lowStockProducts} productos
          </span>
        )}
      </div>
      {lowStockProducts.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <PackageX className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay productos con stock bajo</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {paginatedLowStock.map((product) => (
            <div key={product.localId} className="flex items-center gap-3 p-3 bg-(--bg-tertiary)/50 hover:bg-(--bg-tertiary) rounded-lg transition-colors">
              <div className={`w-1 h-10 rounded-full ${product.stock === 0 ? 'bg-red-500' : 'bg-amber-500'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">{product.name}</p>
                <p className="text-xs text-slate-500">{product.categoryName}</p>
              </div>
              <div className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-bold ${
                product.stock === 0 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
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
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-(--text-primary) mb-1">{getCurrentGreeting()} 👋</h2>
            <p className="text-(--text-secondary)">Bienvenido a <span className="text-(--brand-400) font-medium">{tenant?.name}</span></p>
            <p className="text-sm text-slate-500 mt-1 capitalize">{formatDate()}</p>
          </div>
          {exchangeRate && (
            <button
              onClick={() => setShowManualRateModal(true)}
              title="Cambiar tasa de dólar manualmente"
              className="group flex items-center gap-4 px-5 py-3 bg-linear-to-r from-blue-500/10 to-blue-600/5 hover:from-blue-500/20 hover:to-blue-600/10 border border-blue-500/30 hover:border-blue-500/50 rounded-xl transition-all"
            >
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-black uppercase tracking-wider">Tasa BCV</p>
                  <p className="text-xl font-bold text-black">{formatBs(exchangeRate.rate)}</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1 pl-3 border-l border-blue-500/20">
                <RefreshCw className={`w-4 h-4 text-blue-400/50 ${isUpdatingRate ? 'animate-spin' : ''}`} />
                <span className="text-[10px] text-blue-400/50 capitalize">{exchangeRate.source}</span>
              </div>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            title="Filtrar por rango de fechas"
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
                    title={`Ver datos de ${range.label.toLowerCase()}`}
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
        {renderKPI('Ventas Hoy', `$${stats.salesToday.toFixed(2)}`, DollarSign, 'blue', salesTrend, { value: stats.salesYesterday, label: 'Ayer' }, () => onNavigate?.('sales'), 'Ventas del día vs día anterior - Clic para ver detalle')}
        {renderKPI('Órdenes del Mes', stats.ordersThisMonth.toString(), ShoppingBag, 'amber', null, undefined, undefined, 'Total de órdenes de compra registradas este mes')}
        {renderKPI('Stock Bajo', stats.lowStockProducts.toString(), PackageX, stats.lowStockProducts > 0 ? 'red' : 'green', null, undefined, stats.lowStockProducts > 0 ? () => setShowLowStockModal(true) : undefined, 'Productos por debajo del stock mínimo - Clic para ver lista')}
        {renderKPI('Ingresos del Período', `$${stats.monthlyRevenue.toFixed(2)}`, TrendingUp, 'green', revenueTrend, undefined, undefined, 'Total de ingresos en el período seleccionado')}
      </div>

      <div className="bg-(--bg-secondary) border border-(--border-color) rounded-xl overflow-hidden">
        <div className="flex border-b border-slate-700/50 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            const tabDescriptions: Record<string, string> = {
              resumen: 'Vista general de métricas principales',
              ventas: 'Gráfico de ventas del período seleccionado',
              categorias: 'Distribución de ventas por categoría',
              inventario: 'Productos con stock bajo o agotado',
            }
            return (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)}
                title={tabDescriptions[tab.id]}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all whitespace-nowrap ${isActive ? 'text-(--brand-400) border-b-2 border-(--brand-500) bg-(--brand-500)/5' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
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
                    title="Página anterior"
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
                    title="Página siguiente"
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