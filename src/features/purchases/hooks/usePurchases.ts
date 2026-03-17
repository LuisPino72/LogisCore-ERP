import { useState, useCallback } from 'react'
import { useTenantStore } from '@/store/useTenantStore'
import { useToast } from '@/providers/ToastProvider'
import * as purchasesService from '../services/purchases.service'
import * as suppliersService from '../services/suppliers.service'
import type { CreatePurchaseInput } from '../types/purchases.types'
import type { Purchase, Supplier } from '@/lib/db'
import { isOk } from '@/lib/types/result'

export interface UsePurchasesReturn {
  purchases: Purchase[]
  suppliers: Supplier[]
  loading: boolean
  loadData: () => Promise<void>
  createPurchase: (data: CreatePurchaseInput) => Promise<boolean>
  updatePurchaseStatus: (localId: string, status: 'pending' | 'completed' | 'cancelled') => Promise<boolean>
  createSupplier: (data: Omit<Supplier, 'id' | 'localId' | 'tenantId' | 'createdAt' | 'updatedAt' | 'syncedAt'>) => Promise<boolean>
}

export function usePurchases(): UsePurchasesReturn {
  const tenant = useTenantStore((state) => state.currentTenant)
  const { showError, showSuccess } = useToast()

  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(async () => {
    if (!tenant?.slug) return
    setLoading(true)
    try {
      const [purchasesData, suppliersData] = await Promise.all([
        purchasesService.getPurchases(),
        suppliersService.getSuppliers(),
      ])
      setPurchases(purchasesData)
      setSuppliers(suppliersData)
    } catch (_error) {
      showError('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [tenant?.slug, showError])

  const createPurchase = useCallback(
    async (data: CreatePurchaseInput): Promise<boolean> => {
      setLoading(true)
      const result = await purchasesService.createPurchase(data)
      if (isOk(result)) {
        showSuccess('Compra registrada correctamente')
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

  return {
    purchases,
    suppliers,
    loading,
    loadData,
    createPurchase,
    updatePurchaseStatus,
    createSupplier,
  }
}