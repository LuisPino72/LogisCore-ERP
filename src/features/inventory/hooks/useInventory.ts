import { useState, useCallback, useMemo } from 'react'
import { useTenantStore } from '@/store/useTenantStore'
import { useToast } from '@/providers/ToastProvider'
import * as productsService from '../services/products.service'
import * as categoriesService from '../services/categories.service'
import * as imagesService from '../services/images.service'
import type { Product, Category } from '@/lib/db'
import type { ProductFormData, StockFilter, StatusFilter, ViewMode } from '../types/inventory.types'
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
}

export interface UseInventoryReturn {
  products: Product[]
  categories: Category[]
  loading: boolean
  filters: UseInventoryFilters
  filteredProducts: Product[]
  form: ProductFormData
  imageFile: File | null
  imagePreview: string | null
  uploadingImage: boolean
  showModal: boolean
  showFilters: boolean
  editingId: string | null
  showNewCategory: boolean
  newCategoryName: string
  setSearch: (search: string) => void
  setSelectedCategory: (category: number | string) => void
  setViewMode: (mode: ViewMode) => void
  setStockFilter: (filter: StockFilter) => void
  setStatusFilter: (filter: StatusFilter) => void
  setPriceRange: (range: { min: string; max: string }) => void
  setForm: (update: ProductFormData | ((prev: ProductFormData) => ProductFormData)) => void
  setImageFile: (file: File | null) => void
  setImagePreview: (preview: string | null) => void
  setUploadingImage: (uploading: boolean) => void
  setShowModal: (show: boolean) => void
  setShowFilters: (show: boolean) => void
  setEditingId: (id: string | null) => void
  setShowNewCategory: (show: boolean) => void
  setNewCategoryName: (name: string) => void
  loadData: () => Promise<void>
  createProduct: (data: ProductFormData) => Promise<boolean>
  updateProduct: (localId: string, data: Partial<Product>) => Promise<boolean>
  deleteProduct: (localId: string) => Promise<boolean>
  createCategory: (name: string) => Promise<boolean>
  uploadImage: (file: File, productLocalId: string) => Promise<string | null>
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
  
  const [form, setForm] = useState<ProductFormData>(DEFAULT_PRODUCT_FORM)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

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
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                           p.sku.toLowerCase().includes(search.toLowerCase())
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
      
      return matchesSearch && matchesCategory && matchesStock && matchesStatus && matchesPrice
    })
  }, [products, search, selectedCategory, stockFilter, statusFilter, priceRange.min, priceRange.max])

  const hasActiveFilters = Boolean(selectedCategory || stockFilter !== 'all' || statusFilter !== 'all' || priceRange.min || priceRange.max)

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
    },
    filteredProducts,
    form,
    imageFile,
    imagePreview,
    uploadingImage,
    showModal,
    showFilters,
    editingId,
    showNewCategory,
    newCategoryName,
    setSearch,
    setSelectedCategory,
    setViewMode,
    setStockFilter,
    setStatusFilter,
    setPriceRange,
    setForm,
    setImageFile,
    setImagePreview,
    setUploadingImage,
    setShowModal,
    setShowFilters,
    setEditingId,
    setShowNewCategory,
    setNewCategoryName,
    loadData,
    createProduct,
    updateProduct,
    deleteProduct,
    createCategory,
    uploadImage,
    resetForm,
    getStockStatus,
    hasActiveFilters,
  }
}
