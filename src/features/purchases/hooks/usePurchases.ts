import { useState, useCallback, useMemo } from 'react'
import { useTenantStore } from '@/store/useTenantStore'
import { useToast } from '@/providers/ToastProvider'
import * as purchasesService from '../services/purchases.service'
import * as suppliersService from '../services/suppliers.service'
import type { CreatePurchaseInput } from '../services/purchases.service'
import type { Purchase, Supplier, Product } from '@/lib/db'
import { isOk } from '@/lib/types/result'
import type { SortConfig, DateRange, PurchaseStatus, PurchaseStats } from '../types/purchases.types'
import { db } from '@/lib/db'

export interface UsePurchasesReturn {
  purchases: Purchase[]
  suppliers: Supplier[]
  products: Product[]
  loading: boolean
  stats: PurchaseStats | null
  total: number
  currentPage: number
  totalPages: number
  sort: SortConfig
  filters: {
    search: string
    status: PurchaseStatus | 'all'
    dateRange: DateRange
  }
  loadData: () => Promise<void>
  createPurchase: (data: CreatePurchaseInput) => Promise<boolean>
  updatePurchaseStatus: (localId: string, status: 'pending' | 'completed' | 'cancelled') => Promise<boolean>
  createSupplier: (data: Omit<Supplier, 'id' | 'localId' | 'tenantId' | 'createdAt' | 'updatedAt' | 'syncedAt'>) => Promise<boolean>
  updateSupplier: (localId: string, data: Partial<Supplier>) => Promise<boolean>
  deleteSupplier: (localId: string) => Promise<boolean>
  setSort: (sort: SortConfig) => void
  setPage: (page: number) => void
  setFilters: (filters: Partial<{ search: string; status: PurchaseStatus | 'all'; dateRange: DateRange }>) => void
  exportCSV: () => void
}

const PAGE_SIZE = 20

export function usePurchases(): UsePurchasesReturn {
  const tenant = useTenantStore((state) => state.currentTenant)
  const { showError, showSuccess } = useToast()

  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<PurchaseStats | null>(null)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [sort, setSort] = useState<SortConfig>({ field: 'createdAt', direction: 'desc' })
  const [filters, setFilters] = useState({
    search: '',
    status: 'all' as PurchaseStatus | 'all',
    dateRange: { start: null, end: null } as DateRange,
  })

  const totalPages = useMemo(() => Math.ceil(total / PAGE_SIZE), [total])

  const loadData = useCallback(async () => {
    if (!tenant?.slug) return
    setLoading(true)
    try {
      const [productsData, suppliersData] = await Promise.all([
        db.products.where('tenantId').equals(tenant.slug).toArray(),
        suppliersService.getSuppliers(),
      ])
      setProducts(productsData)
      setSuppliers(suppliersData.filter((s) => s.isActive))

      const result = await purchasesService.filterPurchases({
        search: filters.search,
        status: filters.status,
        dateRange: filters.dateRange.start || filters.dateRange.end ? filters.dateRange : undefined,
        sort,
        page: currentPage,
        pageSize: PAGE_SIZE,
      })

      setPurchases(result.purchases)
      setTotal(result.total)
      setStats(result.stats)
    } catch (_error) {
      showError('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [tenant?.slug, filters, sort, currentPage, showError])

  const handleSetSort = useCallback((newSort: SortConfig) => {
    setSort(newSort)
    setCurrentPage(1)
  }, [])

  const handleSetPage = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  const handleSetFilters = useCallback((newFilters: Partial<{ search: string; status: PurchaseStatus | 'all'; dateRange: DateRange }>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setCurrentPage(1)
  }, [])

  const createPurchase = useCallback(
    async (data: CreatePurchaseInput): Promise<boolean> => {
      setLoading(true)
      const result = await purchasesService.createPurchase(data)
      if (isOk(result)) {
        showSuccess('Compra registrada correctamente')
        
        if (data.status === 'completed') {
          for (const item of data.items) {
            const product = products.find((p) => p.localId === item.productId)
            if (product) {
              await db.products.update(product.localId, {
                stock: product.stock + item.quantity,
                updatedAt: new Date(),
              })
            }
          }
        }
        
        await loadData()
        setLoading(false)
        return true
      }
      showError(result.error.message)
      setLoading(false)
      return false
    },
    [loadData, showError, showSuccess, products],
  )

  const updatePurchaseStatus = useCallback(
    async (localId: string, status: 'pending' | 'completed' | 'cancelled'): Promise<boolean> => {
      setLoading(true)
      const result = await purchasesService.updatePurchaseStatus(localId, status)
      if (isOk(result)) {
        showSuccess('Estado de compra actualizado')
        await loadData()
        setLoading(false)
        return true
      }
      showError(result.error.message)
      setLoading(false)
      return false
    },
    [loadData, showError, showSuccess],
  )

  const createSupplier = useCallback(
    async (data: Omit<Supplier, 'id' | 'localId' | 'tenantId' | 'createdAt' | 'updatedAt' | 'syncedAt'>): Promise<boolean> => {
      setLoading(true)
      const result = await suppliersService.createSupplier(data)
      if (isOk(result)) {
        showSuccess('Proveedor creado correctamente')
        await loadData()
        setLoading(false)
        return true
      }
      showError(result.error.message)
      setLoading(false)
      return false
    },
    [loadData, showError, showSuccess],
  )

  const updateSupplier = useCallback(
    async (localId: string, data: Partial<Supplier>): Promise<boolean> => {
      setLoading(true)
      const result = await suppliersService.updateSupplier(localId, data)
      if (isOk(result)) {
        showSuccess('Proveedor actualizado correctamente')
        await loadData()
        setLoading(false)
        return true
      }
      showError(result.error.message)
      setLoading(false)
      return false
    },
    [loadData, showError, showSuccess],
  )

  const deleteSupplier = useCallback(
    async (localId: string): Promise<boolean> => {
      setLoading(true)
      const result = await suppliersService.deleteSupplier(localId)
      if (isOk(result)) {
        showSuccess('Proveedor eliminado correctamente')
        await loadData()
        setLoading(false)
        return true
      }
      showError(result.error.message)
      setLoading(false)
      return false
    },
    [loadData, showError, showSuccess],
  )

  const exportCSV = useCallback(() => {
    const csv = purchasesService.exportPurchasesToCSV(purchases)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `compras_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    showSuccess('CSV exportado correctamente')
  }, [purchases, showSuccess])

  return {
    purchases,
    suppliers,
    products,
    loading,
    stats,
    total,
    currentPage,
    totalPages,
    sort,
    filters,
    loadData,
    createPurchase,
    updatePurchaseStatus,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    setSort: handleSetSort,
    setPage: handleSetPage,
    setFilters: handleSetFilters,
    exportCSV,
  }
}
