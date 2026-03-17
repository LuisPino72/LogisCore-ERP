import { useState, useCallback } from 'react'
import { useTenantStore } from '@/store/useTenantStore'
import { useToast } from '@/providers/ToastProvider'
import * as reportsService from '../services/reports.service'
import type { DateRange, Stats, TopProduct } from '../types/reports.types'
import type { Sale } from '@/lib/db'

export interface UseReportsReturn {
  stats: Stats
  recentSales: Sale[]
  topProducts: TopProduct[]
  dateRange: DateRange
  loading: boolean
  loadReports: (range: DateRange) => Promise<void>
  setDateRange: (range: DateRange) => void
}

export function useReports(): UseReportsReturn {
  const tenant = useTenantStore((state) => state.currentTenant)
  const { showError } = useToast()

  const [stats, setStats] = useState<Stats>({
    totalSales: 0,
    totalPurchases: 0,
    totalProducts: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    cashPayments: 0,
    cardPayments: 0,
  })
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [dateRange, setDateRange] = useState<DateRange>('month')
  const [loading, setLoading] = useState(false)

  const loadReports = useCallback(
    async (range: DateRange) => {
      if (!tenant?.slug) return
      setLoading(true)
      try {
        const data = await reportsService.getReportsData(tenant.slug, range)
        setStats(data.stats)
        setRecentSales(data.recentSales)
        setTopProducts(data.topProducts)
      } catch (_error) {
        showError('Error al cargar reportes')
      } finally {
        setLoading(false)
      }
    },
    [tenant?.slug, showError],
  )

  return {
    stats,
    recentSales,
    topProducts,
    dateRange,
    loading,
    loadReports,
    setDateRange,
  }
}