import { useState, useCallback } from 'react'
import { useTenantStore } from '@/store/useTenantStore'
import { useToast } from '@/providers/ToastProvider'
import * as salesService from '../services/sales.service'
import type { CreateSaleInput } from '../types/sales.types'
import type { Sale } from '@/lib/db'
import { isOk } from '@/lib/types/result'

export interface UseSalesReturn {
  sales: Sale[]
  loading: boolean
  loadSales: () => Promise<void>
  createSale: (data: CreateSaleInput) => Promise<boolean>
  cancelSale: (localId: string) => Promise<boolean>
}

export function useSales(): UseSalesReturn {
  const tenant = useTenantStore((state) => state.currentTenant)
  const { showError, showSuccess } = useToast()

  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(false)

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

  return {
    sales,
    loading,
    loadSales,
    createSale,
    cancelSale,
  }
}