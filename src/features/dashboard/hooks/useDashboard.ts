import { useState, useEffect, useCallback } from 'react'
import { useTenantStore } from '@/store/useTenantStore'
import { useToast } from '@/providers/ToastProvider'
import { EventBus, Events } from '@/lib/events/EventBus'
import * as dashboardService from '../services/dashboard.service'
import { getExchangeRate, updateExchangeRate as updateRateService, formatBs } from '../../exchange-rate/services/exchangeRate.service'
import type { DashboardStats, DailySales, CategorySales, LowStockProduct, ExchangeRateInfo, TopProduct, DashboardDateRange } from '../types/dashboard.types'
import { getDefaultDashboardRange } from '../services/dashboard.service'
import { isOk } from '@/lib/types/result'

export interface UseDashboardReturn {
  stats: DashboardStats
  dailySales: DailySales[]
  categorySales: CategorySales[]
  lowStockProducts: LowStockProduct[]
  topProducts: TopProduct[]
  loading: boolean
  exchangeRate: ExchangeRateInfo | null
  isUpdatingRate: boolean
  dateRange: DashboardDateRange
  loadData: () => Promise<void>
  handleUpdateRate: () => Promise<void>
  handleSaveManualRate: (rate: string) => Promise<void>
  setDateRange: (range: DashboardDateRange) => void
}

export function useDashboard(): UseDashboardReturn {
  const tenant = useTenantStore((state) => state.currentTenant)
  const { showError, showSuccess } = useToast()

  const [loading, setLoading] = useState(true)
  const [exchangeRate, setExchangeRate] = useState<ExchangeRateInfo | null>(null)
  const [isUpdatingRate, setIsUpdatingRate] = useState(false)
  const [dateRange, setDateRangeState] = useState<DashboardDateRange>(getDefaultDashboardRange)

  const [stats, setStats] = useState<DashboardStats>({
    salesToday: 0,
    salesYesterday: 0,
    ordersThisMonth: 0,
    ordersLastMonth: 0,
    lowStockProducts: 0,
    monthlyRevenue: 0,
    lastMonthRevenue: 0,
  })
  const [dailySales, setDailySales] = useState<DailySales[]>([])
  const [categorySales, setCategorySales] = useState<CategorySales[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])

  const loadData = useCallback(async () => {
    if (!tenant?.slug) return
    setLoading(true)

    const result = await dashboardService.getDashboardData(tenant.slug, dateRange)
    if (isOk(result)) {
      setStats(result.value.stats)
      setDailySales(result.value.dailySales)
      setCategorySales(result.value.categorySales)
      setLowStockProducts(result.value.lowStockProducts)
      setTopProducts(result.value.topProducts)
    } else {
      showError(result.error.message)
    }

    setLoading(false)
  }, [tenant?.slug, showError, dateRange])

  const handleUpdateRate = useCallback(async () => {
    setIsUpdatingRate(true)
    try {
      const result = await updateRateService()
      if (result.success && result.rate) {
        setExchangeRate({ rate: result.rate, updatedAt: new Date(), source: 'api' })
        showSuccess(`Tasa actualizada: ${formatBs(result.rate)}`)
      } else {
        showError(result.error || 'Error al actualizar tasa')
      }
    } catch {
      showError('Error al actualizar tasa')
    } finally {
      setIsUpdatingRate(false)
    }
  }, [showError, showSuccess])

  const handleSaveManualRate = useCallback(
    async (rateInput: string) => {
      const rate = parseFloat(rateInput.replace(',', '.'))
      if (isNaN(rate) || rate <= 0) {
        showError('Ingrese una tasa válida')
        return
      }
      const result = await updateRateService(rate)
      if (result.success && result.rate) {
        setExchangeRate({ rate: result.rate, updatedAt: new Date(), source: 'manual' })
        showSuccess(`Tasa configurada: ${formatBs(result.rate)}`)
      } else {
        showError(result.error || 'Error al guardar tasa')
      }
    },
    [showError, showSuccess],
  )

  const setDateRange = useCallback((range: DashboardDateRange) => {
    setDateRangeState(range)
  }, [])

  useEffect(() => {
    const loadExchangeRate = async () => {
      const result = await getExchangeRate()
      if (isOk(result) && result.value) {
        setExchangeRate({
          rate: result.value.rate,
          updatedAt: result.value.updatedAt,
          source: result.value.source,
        })
      }
    }
    loadExchangeRate()
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const handleInventoryUpdate = () => {
      loadData()
    }
    EventBus.on(Events.INVENTORY_UPDATED, handleInventoryUpdate)
    return () => {
      EventBus.off(Events.INVENTORY_UPDATED, handleInventoryUpdate)
    }
  }, [loadData])

  return {
    stats,
    dailySales,
    categorySales,
    lowStockProducts,
    topProducts,
    loading,
    exchangeRate,
    isUpdatingRate,
    dateRange,
    loadData,
    handleUpdateRate,
    handleSaveManualRate,
    setDateRange,
  }
}