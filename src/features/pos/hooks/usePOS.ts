import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTenantStore } from '@/store/useTenantStore'
import { useToast } from '@/providers/ToastProvider'
import * as posService from '../services/pos.service'
import * as salesService from '@/features/sales/services/sales.service'
import * as productsService from '@/features/inventory/services/products.service'
import * as exchangeRateService from '@/features/exchange-rate/services/exchangeRate.service'
import type { CartItem, SaleItem } from '../types/pos.types'
import { isOk } from '@/lib/types/result'
import type { Product, Category } from '@/lib/db'

export interface UsePOSReturn {
  products: Product[]
  categories: Category[]
  cart: CartItem[]
  search: string
  selectedCategory: number | string
  paymentMethod: 'cash' | 'card' | 'pago_movil'
  showCheckout: boolean
  exchangeRate: number
  filteredProducts: Product[]
  cartTotal: number
  cartCount: number
  loading: boolean
  setSearch: (value: string) => void
  setSelectedCategory: (value: number | string) => void
  setPaymentMethod: (value: 'cash' | 'card' | 'pago_movil') => void
  setShowCheckout: (value: boolean) => void
  addToCart: (product: Product) => void
  updateQuantity: (localId: string, delta: number) => void
  updateWeight: (localId: string, grams: number) => void
  selectSample: (localId: string, sampleId: string) => void
  getSaleType: (categoryId?: number) => 'unit' | 'weight' | 'sample'
  removeFromCart: (localId: string) => void
  toggleFavorite: (product: Product) => Promise<void>
  handleCheckout: () => Promise<void>
  loadData: () => Promise<void>
}

export function usePOS(): UsePOSReturn {
  const tenant = useTenantStore((state) => state.currentTenant)
  const { showError, showSuccess } = useToast()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | string>('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'pago_movil'>('cash')
  const [showCheckout, setShowCheckout] = useState(false)
  const [exchangeRate, setExchangeRate] = useState(0)
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(async () => {
    if (!tenant?.slug) return
    setLoading(true)
    const data = await posService.loadPOSData(tenant.slug)
    setProducts(data.products)
    setCategories(data.categories)
    setLoading(false)
  }, [tenant?.slug])

  useEffect(() => {
    const loadExchangeRate = async () => {
      const result = await exchangeRateService.getExchangeRate()
      if (isOk(result)) {
        setExchangeRate(result.value?.rate || 0)
      }
    }
    loadExchangeRate()
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredProducts = useMemo(
    () => posService.filterProducts(products, search, selectedCategory),
    [products, search, selectedCategory]
  )

  const { total: cartTotal, count: cartCount } = useMemo(
    () => posService.calculateCartTotals(cart),
    [cart]
  )

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => posService.addToCart(prev, product))
  }, [])

  const updateQuantity = useCallback((localId: string, delta: number) => {
    setCart((prev) => posService.updateCartQuantity(prev, localId, delta))
  }, [])

  const removeFromCart = useCallback((localId: string) => {
    setCart((prev) => posService.removeFromCart(prev, localId))
  }, [])

  const toggleFavorite = useCallback(
    async (product: Product) => {
      const newFavorite = !product.isFavorite
      await productsService.updateProduct(product.localId, { isFavorite: newFavorite })
      setProducts((prev) =>
        prev.map((p) => (p.localId === product.localId ? { ...p, isFavorite: newFavorite } : p))
      )
    },
    []
  )

  const updateWeight = useCallback((localId: string, grams: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.localId === localId
          ? { ...item, quantity: grams, unit: 'g' as const }
          : item
      )
    )
  }, [])

  const selectSample = useCallback((localId: string, sampleId: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.localId !== localId) return item
        const sample = item.product.samples?.find((s) => s.id === sampleId)
        return {
          ...item,
          quantity: sample?.quantity || 1,
          unit: 'unit' as const,
          selectedSampleId: sampleId,
        }
      })
    )
  }, [])

  const getSaleType = useCallback(
    (categoryId?: number): 'unit' | 'weight' | 'sample' => {
      if (!categoryId) return 'unit'
      const category = categories.find((c) => c.id === categoryId)
      return category?.saleType || 'unit'
    },
    [categories]
  )

  const handleCheckout = useCallback(async () => {
    if (!tenant) return
    setLoading(true)

    const saleItems: SaleItem[] = posService.prepareSaleItems(cart)
    const saleResult = await salesService.createSale({
      items: saleItems,
      subtotal: cartTotal,
      tax: 0,
      total: cartTotal,
      paymentMethod,
      exchangeRate: exchangeRate > 0 ? exchangeRate : undefined,
      exchangeRateSource: exchangeRate > 0 ? 'api' : undefined,
    })

    if (!isOk(saleResult)) {
      showError(saleResult.error.message)
      setLoading(false)
      return
    }

    setCart([])
    setShowCheckout(false)
    showSuccess('Venta registrada exitosamente!')
    await loadData()
    setLoading(false)
  }, [tenant, cart, cartTotal, paymentMethod, exchangeRate, showError, showSuccess, loadData])

  return {
    products,
    categories,
    cart,
    search,
    selectedCategory,
    paymentMethod,
    showCheckout,
    exchangeRate,
    filteredProducts,
    cartTotal,
    cartCount,
    loading,
    setSearch,
    setSelectedCategory,
    setPaymentMethod,
    setShowCheckout,
    addToCart,
    updateQuantity,
    updateWeight,
    selectSample,
    getSaleType,
    removeFromCart,
    toggleFavorite,
    handleCheckout,
    loadData,
  }
}