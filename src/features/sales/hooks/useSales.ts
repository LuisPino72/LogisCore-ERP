import { useState, useCallback, useMemo } from 'react'
import { useTenantStore } from '@/store/useTenantStore'
import { useToast } from '@/providers/ToastProvider'
import { Sale } from '@/lib/db'
import * as salesService from '../services/sales.service'
import type { CreateSaleInput } from '../types/sales.types'
import { isOk } from '@/lib/types/result'

export type SortField = 'localId' | 'createdAt' | 'total' | 'paymentMethod' | 'status'
export type SortDirection = 'asc' | 'desc'

export interface SalesFilters {
  search: string
  dateRange: 'today' | 'week' | 'month' | 'custom' | 'all'
  customStartDate?: Date
  customEndDate?: Date
  paymentFilter: 'all' | 'cash' | 'card' | 'pago_movil'
  statusFilter: 'all' | 'completed' | 'cancelled' | 'pending'
  sort: { field: SortField; direction: SortDirection }
}

export interface UseSalesReturn {
  sales: Sale[]
  loading: boolean
  filters: SalesFilters
  filteredSales: Sale[]
  paginatedSales: Sale[]
  currentPage: number
  totalPages: number
  stats: {
    totalRevenue: number
    totalTransactions: number
    avgOrder: number
    cashTotal: number
    cardTotal: number
    pagoMovilTotal: number
  }
  setSearch: (search: string) => void
  setDateRange: (range: SalesFilters['dateRange']) => void
  setCustomDateRange: (start: Date, end: Date) => void
  setPaymentFilter: (filter: SalesFilters['paymentFilter']) => void
  setStatusFilter: (status: 'all' | 'completed' | 'cancelled' | 'pending') => void
  setSort: (sort: { field: SortField; direction: SortDirection }) => void
  setCurrentPage: (page: number) => void
  loadSales: () => Promise<void>
  createSale: (data: CreateSaleInput) => Promise<boolean>
  cancelSale: (localId: string) => Promise<boolean>
  exportCSV: () => void
}

export function useSales(): UseSalesReturn {
  const tenant = useTenantStore((state) => state.currentTenant)
  const { showError, showSuccess } = useToast()

  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(false)
  
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState<SalesFilters['dateRange']>('month')
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>()
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>()
  const [paymentFilter, setPaymentFilter] = useState<SalesFilters['paymentFilter']>('all')
  const [statusFilter, setStatusFilter] = useState<SalesFilters['statusFilter']>('all')
  const [sort, setSort] = useState({ field: 'createdAt' as SortField, direction: 'desc' as SortDirection })
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 25

  const loadSales = useCallback(async () => {
    if (!tenant?.slug) return
    setLoading(true)
    try {
      const data = await salesService.getSales()
      setSales(data)
    } catch (_error) {
      showError('Error al cargar ventas')
    } finally {
      setLoading(false)
    }
  }, [tenant?.slug, showError])

  const filteredSales = useMemo(() => {
    const now = new Date()
    let startDate: Date | null = null
    let endDate: Date | null = null

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0))
        endDate = new Date(now.setHours(23, 59, 59, 999))
        break
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7))
        break
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1))
        break
      case 'custom':
        startDate = customStartDate ? new Date(customStartDate.setHours(0, 0, 0, 0)) : null
        endDate = customEndDate ? new Date(customEndDate.setHours(23, 59, 59, 999)) : null
        break
      case 'all':
      default:
        startDate = null
    }

    let filtered = sales.filter((s) => {
      if (startDate && s.createdAt < startDate) return false
      if (endDate && s.createdAt > endDate) return false
      return true
    })

    if (paymentFilter !== 'all') {
      filtered = filtered.filter((s) => s.paymentMethod === paymentFilter)
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((s) => s.status === statusFilter)
    }

    if (search) {
      filtered = filtered.filter(
        (s) =>
          s.localId.toLowerCase().includes(search.toLowerCase()) ||
          s.items.some((item) =>
            item.productName.toLowerCase().includes(search.toLowerCase()),
          ),
      )
    }

    filtered = [...filtered].sort((a, b) => {
      let comparison = 0
      const sortField = sort.field
      const sortDir = sort.direction

      if (sortField === 'localId') comparison = a.localId.localeCompare(b.localId)
      else if (sortField === 'createdAt') comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      else if (sortField === 'total') comparison = a.total - b.total
      else if (sortField === 'paymentMethod') comparison = a.paymentMethod.localeCompare(b.paymentMethod)
      else if (sortField === 'status') comparison = a.status.localeCompare(b.status)

      return sortDir === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [sales, dateRange, customStartDate, customEndDate, paymentFilter, statusFilter, search, sort])

  const totalPages = Math.ceil(filteredSales.length / ITEMS_PER_PAGE)

  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredSales.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredSales, currentPage])

  const stats = useMemo(() => {
    const completed = filteredSales.filter((s) => s.status === 'completed')
    const totalRevenue = completed.reduce((sum, s) => sum + s.total, 0)
    const cashTotal = completed.filter((s) => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.total, 0)
    const cardTotal = completed.filter((s) => s.paymentMethod === 'card').reduce((sum, s) => sum + s.total, 0)
    const pagoMovilTotal = completed.filter((s) => s.paymentMethod === 'pago_movil').reduce((sum, s) => sum + s.total, 0)
    const avgOrder = completed.length > 0 ? totalRevenue / completed.length : 0

    return {
      totalRevenue,
      totalTransactions: completed.length,
      avgOrder,
      cashTotal,
      cardTotal,
      pagoMovilTotal,
    }
  }, [filteredSales])

  const setCustomDateRange = useCallback((start: Date, end: Date) => {
    setCustomStartDate(start)
    setCustomEndDate(end)
    setDateRange('custom')
  }, [])

  const createSale = useCallback(
    async (data: CreateSaleInput): Promise<boolean> => {
      setLoading(true)
      const result = await salesService.createSale(data)
      if (isOk(result)) {
        showSuccess('Venta registrada correctamente')
        await loadSales()
        setLoading(false)
        return true
      }
      showError(result.error.message)
      setLoading(false)
      return false
    },
    [loadSales, showError, showSuccess],
  )

  const cancelSale = useCallback(
    async (localId: string): Promise<boolean> => {
      setLoading(true)
      const result = await salesService.cancelSale(localId)
      if (isOk(result)) {
        showSuccess('Venta cancelada correctamente')
        await loadSales()
        setLoading(false)
        return true
      }
      showError(result.error.message)
      setLoading(false)
      return false
    },
    [loadSales, showError, showSuccess],
  )

  const exportCSV = useCallback(() => {
    const csvContent = [
      ['ID', 'Fecha', 'Items', 'Subtotal', 'Impuesto', 'Total', 'Método', 'Estado', 'Tasa BCV'].join(','),
      ...filteredSales.map(s => [
        s.localId,
        new Date(s.createdAt).toISOString(),
        s.items.length,
        s.subtotal.toFixed(2),
        s.tax.toFixed(2),
        s.total.toFixed(2),
        s.paymentMethod,
        s.status,
        s.exchangeRate || '',
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `ventas_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    showSuccess('Ventas exportadas correctamente')
  }, [filteredSales, showSuccess])

  return {
    sales,
    loading,
    filters: {
      search,
      dateRange,
      customStartDate,
      customEndDate,
      paymentFilter,
      statusFilter,
      sort,
    },
    filteredSales,
    paginatedSales,
    currentPage,
    totalPages,
    stats,
    setSearch,
    setDateRange,
    setCustomDateRange,
    setPaymentFilter,
    setStatusFilter,
    setSort,
    setCurrentPage,
    loadSales,
    createSale,
    cancelSale,
    exportCSV,
  }
}