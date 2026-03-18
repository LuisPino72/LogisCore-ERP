import { useState, useCallback, useMemo } from 'react'
import { useTenantStore } from '@/store/useTenantStore'
import { useToast } from '@/providers/ToastProvider'
import * as productsService from '../services/products.service'
import * as categoriesService from '../services/categories.service'
import * as imagesService from '../services/images.service'
import type { Product, Category } from '@/lib/db'
import type { ProductFormData, StockFilter, StatusFilter, ViewMode, SortConfig, CategoryFormData } from '../types/inventory.types'
import { DEFAULT_PRODUCT_FORM } from '../types/inventory.types'
import { isOk } from '@/lib/types/result'
import { EventBus, Events } from '@/lib/events/EventBus'

export interface UseInventoryFilters {
  search: string
  selectedCategory: number | string
  viewMode: ViewMode
  stockFilter: StockFilter
  statusFilter: StatusFilter
  priceRange: { min: string; max: string }
  sort: SortConfig
  showFavoritesOnly: boolean
  barcodeScan: string
}

export interface UseInventoryReturn {
  products: Product[]
  categories: Category[]
  loading: boolean
  filters: UseInventoryFilters
  filteredProducts: Product[]
  paginatedProducts: Product[]
  currentPage: number
  totalPages: number
  selectedProducts: string[]
  form: ProductFormData
  imageFile: File | null
  imagePreview: string | null
  uploadingImage: boolean
  showModal: boolean
  showFilters: boolean
  editingId: string | null
  showNewCategory: boolean
  newCategoryName: string
  showCategoryModal: boolean
  editingCategory: Category | null
  showBarcodeScanner: boolean
  setSearch: (search: string) => void
  setSelectedCategory: (category: number | string) => void
  setViewMode: (mode: ViewMode) => void
  setStockFilter: (filter: StockFilter) => void
  setStatusFilter: (filter: StatusFilter) => void
  setPriceRange: (range: { min: string; max: string }) => void
  setSort: (config: SortConfig | ((prev: SortConfig) => SortConfig)) => void
  setShowFavoritesOnly: (show: boolean) => void
  setBarcodeScan: (code: string) => void
  setForm: (update: ProductFormData | ((prev: ProductFormData) => ProductFormData)) => void
  setImageFile: (file: File | null) => void
  setImagePreview: (preview: string | null) => void
  setUploadingImage: (uploading: boolean) => void
  setShowModal: (show: boolean) => void
  setShowFilters: (show: boolean) => void
  setEditingId: (id: string | null) => void
  setShowNewCategory: (show: boolean) => void
  setNewCategoryName: (name: string) => void
  setShowCategoryModal: (show: boolean) => void
  setEditingCategory: (category: Category | null) => void
  setShowBarcodeScanner: (show: boolean) => void
  setCurrentPage: (page: number) => void
  toggleProductSelection: (localId: string) => void
  selectAllProducts: () => void
  clearSelection: () => void
  loadData: () => Promise<void>
  createProduct: (data: ProductFormData) => Promise<boolean>
  updateProduct: (localId: string, data: Partial<Product>) => Promise<boolean>
  deleteProduct: (localId: string) => Promise<boolean>
  deleteSelectedProducts: () => Promise<boolean>
  createCategory: (name: string) => Promise<boolean>
  updateCategory: (localId: string, data: CategoryFormData) => Promise<boolean>
  deleteCategory: (localId: string) => Promise<boolean>
  uploadImage: (file: File, productLocalId: string) => Promise<string | null>
  exportProducts: (format: 'csv' | 'pdf') => void
  resetForm: () => void
  getStockStatus: (stock: number) => { label: string; color: string; icon: unknown }
  hasActiveFilters: boolean
}

export function useInventory(): UseInventoryReturn {
  const tenant = useTenantStore((state) => state.currentTenant)
  const { showError, showSuccess } = useToast()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | string>('')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [sort, setSort] = useState<SortConfig>({ field: 'name', direction: 'asc' })
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [barcodeScan, setBarcodeScan] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const ITEMS_PER_PAGE = 20
  
  const [form, setForm] = useState<ProductFormData>(DEFAULT_PRODUCT_FORM)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)

  const loadData = useCallback(async () => {
    if (!tenant?.slug) return
    setLoading(true)
    try {
      const [prodData, catData] = await Promise.all([
        productsService.getProducts(),
        categoriesService.getCategories(),
      ])
      setProducts(prodData)
      setCategories(catData)
    } catch (_error) {
      showError('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [tenant?.slug, showError])

  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                           p.sku.toLowerCase().includes(search.toLowerCase()) ||
                           (barcodeScan && p.sku.toLowerCase().includes(barcodeScan.toLowerCase()))
      const matchesCategory = !selectedCategory || p.categoryId === Number(selectedCategory)
      
      let matchesStock = true
      if (stockFilter === 'in_stock') matchesStock = p.stock > 10
      else if (stockFilter === 'low_stock') matchesStock = p.stock > 0 && p.stock <= 10
      else if (stockFilter === 'out_of_stock') matchesStock = p.stock === 0
      
      let matchesStatus = true
      if (statusFilter === 'active') matchesStatus = p.isActive
      else if (statusFilter === 'inactive') matchesStatus = !p.isActive
      
      let matchesPrice = true
      if (priceRange.min) matchesPrice = p.price >= Number(priceRange.min)
      if (priceRange.max) matchesPrice = matchesPrice && p.price <= Number(priceRange.max)

      const matchesFavorites = !showFavoritesOnly || p.isFavorite
      
      return matchesSearch && matchesCategory && matchesStock && matchesStatus && matchesPrice && matchesFavorites
    })

    result = [...result].sort((a, b) => {
      let comparison = 0
      const sortField = sort.field
      const sortDir = sort.direction
      if (sortField === 'name') comparison = a.name.localeCompare(b.name)
      else if (sortField === 'price') comparison = a.price - b.price
      else if (sortField === 'stock') comparison = a.stock - b.stock
      else if (sortField === 'sku') comparison = a.sku.localeCompare(b.sku)
      return sortDir === 'asc' ? comparison : -comparison
    })

    return result
  }, [products, search, selectedCategory, stockFilter, statusFilter, priceRange.min, priceRange.max, showFavoritesOnly, sort, barcodeScan])

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
  
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredProducts, currentPage])

  const hasActiveFilters = Boolean(selectedCategory || stockFilter !== 'all' || statusFilter !== 'all' || priceRange.min || priceRange.max || showFavoritesOnly || barcodeScan)

  const toggleProductSelection = useCallback((localId: string) => {
    setSelectedProducts(prev => 
      prev.includes(localId) 
        ? prev.filter(id => id !== localId)
        : [...prev, localId]
    )
  }, [])

  const selectAllProducts = useCallback(() => {
    setSelectedProducts(filteredProducts.map(p => p.localId))
  }, [filteredProducts])

  const clearSelection = useCallback(() => {
    setSelectedProducts([])
  }, [])

  const deleteSelectedProducts = useCallback(async () => {
    if (selectedProducts.length === 0) return false
    setLoading(true)
    let successCount = 0
    for (const localId of selectedProducts) {
      const result = await productsService.deleteProduct(localId)
      if (isOk(result)) successCount++
    }
    showSuccess(`Se eliminaron ${successCount} productos`)
    setSelectedProducts([])
    await loadData()
    EventBus.emit(Events.INVENTORY_UPDATED, { action: 'delete' })
    setLoading(false)
    return successCount > 0
  }, [selectedProducts, loadData, showSuccess])

  const updateCategory = useCallback(
    async (localId: string, data: { name: string }): Promise<boolean> => {
      setLoading(true)
      const result = await categoriesService.updateCategory(localId, data)
      if (isOk(result)) {
        showSuccess('Categoría actualizada correctamente')
        await loadData()
        setLoading(false)
        return true
      }
      showError(result.error.message)
      setLoading(false)
      return false
    },
    [loadData, showError, showSuccess]
  )

  const deleteCategory = useCallback(
    async (localId: string): Promise<boolean> => {
      setLoading(true)
      const result = await categoriesService.deleteCategory(localId)
      if (isOk(result)) {
        showSuccess('Categoría eliminada correctamente')
        await loadData()
        setLoading(false)
        return true
      }
      showError(result.error.message)
      setLoading(false)
      return false
    },
    [loadData, showError, showSuccess]
  )

  const exportProducts = useCallback((format: 'csv' | 'pdf') => {
    const csvContent = [
      ['Nombre', 'SKU', 'Categoría', 'Precio', 'Stock', 'Estado'].join(','),
      ...filteredProducts.map(p => [
        `"${p.name}"`,
        p.sku,
        categories.find(c => c.id === p.categoryId)?.name || 'Sin Categoría',
        p.price,
        p.stock,
        p.isActive ? 'Activo' : 'Inactivo'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    const ext = format === 'pdf' ? 'csv' : 'csv'
    link.download = `inventario_${new Date().toISOString().split('T')[0]}.${ext}`
    link.click()
    showSuccess('Inventario exportado correctamente')
  }, [filteredProducts, categories, showSuccess])

  const resetForm = useCallback(() => {
    setForm(DEFAULT_PRODUCT_FORM)
    setImageFile(null)
    setImagePreview(null)
    setEditingId(null)
    setShowNewCategory(false)
    setNewCategoryName('')
  }, [])

  const getStockStatus = useCallback((stock: number) => {
    if (stock === 0) return { label: 'Sin Stock', color: 'text-red-400 bg-red-500/10', icon: null }
    if (stock <= 10) return { label: 'Stock Bajo', color: 'text-amber-400 bg-amber-500/10', icon: null }
    return { label: 'En Stock', color: 'text-green-400 bg-green-500/10', icon: null }
  }, [])

  const createProduct = useCallback(
    async (data: ProductFormData): Promise<boolean> => {
      setLoading(true)
      const productData = {
        name: data.name,
        sku: data.sku,
        price: parseFloat(data.price) || 0,
        cost: parseFloat(data.cost) || 0,
        stock: parseInt(data.stock) || 0,
        categoryId: data.categoryId,
        imageUrl: data.imageUrl,
        isFavorite: data.isFavorite,
        isActive: data.isActive,
      }
      const result = await productsService.createProduct(productData)
      if (isOk(result)) {
        showSuccess('Producto creado correctamente')
        await loadData()
        EventBus.emit(Events.INVENTORY_UPDATED, { action: 'create' })
        setLoading(false)
        return true
      }
      showError(result.error.message)
      setLoading(false)
      return false
    },
    [loadData, showError, showSuccess]
  )

  const updateProduct = useCallback(
    async (localId: string, data: Partial<Product>): Promise<boolean> => {
      setLoading(true)
      const result = await productsService.updateProduct(localId, data)
      if (isOk(result)) {
        showSuccess('Producto actualizado correctamente')
        await loadData()
        EventBus.emit(Events.INVENTORY_UPDATED, { action: 'update' })
        setLoading(false)
        return true
      }
      showError(result.error.message)
      setLoading(false)
      return false
    },
    [loadData, showError, showSuccess]
  )

  const deleteProduct = useCallback(
    async (localId: string): Promise<boolean> => {
      setLoading(true)
      const result = await productsService.deleteProduct(localId)
      if (isOk(result)) {
        showSuccess('Producto eliminado correctamente')
        await loadData()
        EventBus.emit(Events.INVENTORY_UPDATED, { action: 'delete' })
        setLoading(false)
        return true
      }
      showError(result.error.message)
      setLoading(false)
      return false
    },
    [loadData, showError, showSuccess]
  )

  const createCategory = useCallback(
    async (name: string): Promise<boolean> => {
      setLoading(true)
      const result = await categoriesService.createCategory({ name })
      if (isOk(result)) {
        showSuccess('Categoría creada correctamente')
        await loadData()
        setLoading(false)
        return true
      }
      showError(result.error.message)
      setLoading(false)
      return false
    },
    [loadData, showError, showSuccess]
  )

  const uploadImage = useCallback(
    async (file: File, productLocalId: string): Promise<string | null> => {
      const result = await imagesService.uploadProductImage(file, productLocalId)
      if (isOk(result)) {
        return result.value
      }
      showError(result.error.message)
      return null
    },
    [showError]
  )

  return {
    products,
    categories,
    loading,
    filters: {
      search,
      selectedCategory,
      viewMode,
      stockFilter,
      statusFilter,
      priceRange,
      sort,
      showFavoritesOnly,
      barcodeScan,
    },
    filteredProducts,
    paginatedProducts,
    currentPage,
    totalPages,
    selectedProducts,
    form,
    imageFile,
    imagePreview,
    uploadingImage,
    showModal,
    showFilters,
    editingId,
    showNewCategory,
    newCategoryName,
    showCategoryModal,
    editingCategory,
    showBarcodeScanner,
    setSearch,
    setSelectedCategory,
    setViewMode,
    setStockFilter,
    setStatusFilter,
    setPriceRange,
    setSort,
    setShowFavoritesOnly,
    setBarcodeScan,
    setForm,
    setImageFile,
    setImagePreview,
    setUploadingImage,
    setShowModal,
    setShowFilters,
    setEditingId,
    setShowNewCategory,
    setNewCategoryName,
    setShowCategoryModal,
    setEditingCategory,
    setShowBarcodeScanner,
    setCurrentPage,
    toggleProductSelection,
    selectAllProducts,
    clearSelection,
    loadData,
    createProduct,
    updateProduct,
    deleteProduct,
    deleteSelectedProducts,
    createCategory,
    updateCategory,
    deleteCategory,
    uploadImage,
    exportProducts,
    resetForm,
    getStockStatus,
    hasActiveFilters,
  }
}
