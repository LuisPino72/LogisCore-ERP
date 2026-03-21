import { useEffect, useCallback, useState } from 'react'
import { Button, Card, ConfirmationModal } from '@/common'
import { Plus, Package, AlertTriangle, Trash2 } from 'lucide-react'
import { useInventory } from '../hooks/useInventory'
import { EventBus, Events } from '@/lib/events/EventBus'
import { logger, logCategories } from '@/lib/logger'
import type { Product, Category } from '@/lib/db'
import type { SortConfig } from '../types/inventory.types'
import type { SaleType } from '../types/inventory.types'
import { useTenantStore } from '@/store/useTenantStore'
import * as productsService from '../services/products.service'

import ProductCard from './ProductCard'
import ProductTable from './ProductTable'
import ProductFilters from './ProductFilters'
import BarcodeScanner from './BarcodeScanner'
import Toolbar from './Toolbar'
import ProductModal from './ProductModal'
import CategoryModal from './CategoryModal'
import CategoryDeleteConfirm from './CategoryDeleteConfirm'

export default function Inventory() {
  const role = useTenantStore((state) => state.role)
  const {
    categories,
    loading,
    filters,
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
    deleteWarnings,
    showDeleteWarningModal,
    pendingDeleteIds,
    setDeleteWarnings,
    setShowDeleteWarningModal,
    setPendingDeleteIds,
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
  } = useInventory()

  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, message: '', onConfirm: () => {} })
  const [isDeleting, setIsDeleting] = useState(false)

  const handleProceedDelete = useCallback(async () => {
    setIsDeleting(true)
    for (const localId of pendingDeleteIds) {
      await productsService.hardDeleteProduct(localId)
    }
    setIsDeleting(false)
    setShowDeleteWarningModal(false)
    setDeleteWarnings([])
    setPendingDeleteIds([])
    clearSelection()
    await loadData()
    EventBus.emit(Events.INVENTORY_UPDATED, { action: 'delete' })
  }, [pendingDeleteIds, loadData, clearSelection, setShowDeleteWarningModal, setDeleteWarnings, setPendingDeleteIds])

  const handleSoftDelete = useCallback(async () => {
    setIsDeleting(true)
    for (const localId of pendingDeleteIds) {
      await productsService.softDeleteProduct(localId)
    }
    setIsDeleting(false)
    setShowDeleteWarningModal(false)
    setDeleteWarnings([])
    setPendingDeleteIds([])
    clearSelection()
    await loadData()
    EventBus.emit(Events.INVENTORY_UPDATED, { action: 'soft_delete' })
  }, [pendingDeleteIds, loadData, clearSelection, setShowDeleteWarningModal, setDeleteWarnings, setPendingDeleteIds])

  const handleCancelDelete = useCallback(() => {
    setShowDeleteWarningModal(false)
    setDeleteWarnings([])
    setPendingDeleteIds([])
    clearSelection()
  }, [clearSelection, setShowDeleteWarningModal, setDeleteWarnings, setPendingDeleteIds])

  useEffect(() => {
    loadData()
    const unsubscribeInv = EventBus.on(Events.INVENTORY_UPDATED, loadData)
    const unsubscribeSync = EventBus.on(Events.SYNC_STATUS_CHANGED, loadData)
    return () => {
      unsubscribeInv()
      unsubscribeSync()
    }
  }, [loadData])

  useEffect(() => {
    if (filters.barcodeScan && paginatedProducts.length === 1) {
      const product = paginatedProducts[0]
      handleEdit(product)
      setBarcodeScan('')
    }
  }, [filters.barcodeScan, paginatedProducts])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      let imageUrl = form.imageUrl
      
      if (imageFile) {
        setUploadingImage(true)
        const tempId = editingId || crypto.randomUUID()
        const uploadResult = await uploadImage(imageFile, tempId)
        setUploadingImage(false)
        
        if (!uploadResult) {
          return
        }
        imageUrl = uploadResult
      }

      const productData = { ...form, imageUrl }

      if (editingId) {
        const success = await updateProduct(editingId, {
          name: productData.name,
          sku: productData.sku,
          price: Number(productData.price) || 0,
          cost: Number(productData.cost) || 0,
          stock: Number(productData.stock) || 0,
          categoryId: productData.categoryId,
          imageUrl,
          isFavorite: productData.isFavorite,
          isActive: productData.isActive,
          pricePerKg: productData.pricePerKg ? Number(productData.pricePerKg) : undefined,
          samples: productData.samples,
        })
        if (success) {
          setShowModal(false)
          resetForm()
        }
      } else {
        const success = await createProduct(productData)
        if (success) {
          setShowModal(false)
          resetForm()
        }
      }
    } catch (error) {
      logger.error('Error saving product', error instanceof Error ? error : undefined, { category: logCategories.INVENTORY })
    }
  }, [form, imageFile, editingId, uploadImage, updateProduct, createProduct, setShowModal, setUploadingImage, resetForm])

  const handleEdit = useCallback((product: Product) => {
    setForm({
      name: product.name,
      sku: product.sku,
      price: product.price ? String(product.price) : '0',
      cost: product.cost ? String(product.cost) : '0',
      stock: product.stock ? String(product.stock) : '0',
      categoryId: product.categoryId,
      imageUrl: product.imageUrl,
      isFavorite: product.isFavorite || false,
      isActive: product.isActive,
      pricePerKg: product.pricePerKg ? String(product.pricePerKg) : undefined,
      samples: product.samples,
    })
    setImagePreview(product.imageUrl || null)
    setEditingId(product.localId)
    setShowModal(true)
  }, [setForm, setImagePreview, setEditingId, setShowModal])

  const handleDelete = useCallback(async (localId: string) => {
    const success = await deleteProduct(localId)
    if (success) {
      // El hook maneja el modal de advertencia internamente
    }
  }, [deleteProduct])

  const handleDeleteSelected = useCallback(async () => {
    if (selectedProducts.length === 0) return
    const success = await deleteSelectedProducts()
    if (success) {
      clearSelection()
    }
  }, [selectedProducts.length, deleteSelectedProducts, clearSelection])

  const handleDeleteCategory = useCallback((localId: string) => {
    setCategoryToDelete(localId)
  }, [])

  const confirmDeleteCategory = useCallback(async () => {
    if (categoryToDelete) {
      await deleteCategory(categoryToDelete)
      setCategoryToDelete(null)
    }
  }, [categoryToDelete, deleteCategory])

  const handleCreateCategory = useCallback(async (name: string, saleType?: SaleType) => {
    await createCategory(name, saleType)
  }, [createCategory])

  const handleUpdateCategory = useCallback(async (localId: string, data: { name: string; saleType: SaleType }) => {
    await updateCategory(localId, data)
  }, [updateCategory])

  return (
    <div className="space-y-6">
      <Toolbar
        productCount={filteredProducts.length}
        selectedCount={selectedProducts.length}
        viewMode={filters.viewMode}
        showFavoritesOnly={filters.showFavoritesOnly}
        showBarcodeScanner={showBarcodeScanner}
        onNewProduct={() => { resetForm(); setShowModal(true); }}
        onToggleFavorites={() => setShowFavoritesOnly(!filters.showFavoritesOnly)}
        onSelectAll={selectAllProducts}
        onClearSelection={clearSelection}
        onDeleteSelected={handleDeleteSelected}
        onToggleBarcodeScanner={() => setShowBarcodeScanner(!showBarcodeScanner)}
        onExport={() => exportProducts('csv')}
        onOpenCategoryModal={() => setShowCategoryModal(true)}
        onSetViewMode={setViewMode}
      />

      {showBarcodeScanner && (
        <BarcodeScanner
          value={filters.barcodeScan}
          onChange={setBarcodeScan}
          resultCount={paginatedProducts.length}
        />
      )}

      <Card>
        <ProductFilters
          categories={categories}
          search={filters.search}
          selectedCategory={filters.selectedCategory}
          stockFilter={filters.stockFilter}
          statusFilter={filters.statusFilter}
          priceRange={filters.priceRange}
          showFilters={showFilters}
          hasActiveFilters={hasActiveFilters}
          onSearchChange={setSearch}
          onCategoryChange={setSelectedCategory}
          onStockFilterChange={setStockFilter}
          onStatusFilterChange={setStatusFilter}
          onPriceRangeChange={setPriceRange}
          onToggleFilters={() => setShowFilters(!showFilters)}
        />

        {filters.viewMode === 'grid' ? (
          <GridView
            products={paginatedProducts}
            categories={categories}
            loading={loading}
            currentPage={currentPage}
            totalPages={totalPages}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPageChange={setCurrentPage}
            onNewProduct={() => { resetForm(); setShowModal(true); }}
            getStockStatus={getStockStatus}
          />
        ) : (
          <TableView
            products={paginatedProducts}
            categories={categories}
            loading={loading}
            currentPage={currentPage}
            totalPages={totalPages}
            filteredCount={filteredProducts.length}
            selectedProducts={selectedProducts}
            sort={filters.sort as any}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPageChange={setCurrentPage}
            onSort={setSort as any}
            onToggleSelection={toggleProductSelection}
            getStockStatus={getStockStatus}
          />
        )}
      </Card>

      <ProductModal
        isOpen={showModal}
        editingId={editingId}
        categories={categories}
        form={form}
        imagePreview={imagePreview}
        uploadingImage={uploadingImage}
        showNewCategory={showNewCategory}
        newCategoryName={newCategoryName}
        onClose={() => setShowModal(false)}
        onResetForm={resetForm}
        onFormChange={setForm}
        onImageFileChange={(file) => setImageFile(file)}
        onImagePreviewChange={setImagePreview}
        onShowNewCategory={setShowNewCategory}
        onNewCategoryNameChange={setNewCategoryName}
        onCreateCategory={handleCreateCategory}
        onSubmit={handleSubmit}
      />

      <CategoryModal
        isOpen={showCategoryModal}
        categories={categories}
        editingCategory={editingCategory}
        onClose={() => setShowCategoryModal(false)}
        onCreateCategory={handleCreateCategory}
        onUpdateCategory={handleUpdateCategory}
        onDeleteCategory={handleDeleteCategory}
        onSetEditingCategory={setEditingCategory}
      />

      <CategoryDeleteConfirm
        isOpen={!!categoryToDelete}
        category={categoryToDelete ? categories.find(c => c.localId === categoryToDelete) || null : null}
        onConfirm={confirmDeleteCategory}
        onCancel={() => setCategoryToDelete(null)}
      />

      <ConfirmationModal
        isOpen={confirmDelete.isOpen}
        message={confirmDelete.message}
        onConfirm={confirmDelete.onConfirm}
        onCancel={() => setConfirmDelete(prev => ({ ...prev, isOpen: false }))}
      />

      {showDeleteWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCancelDelete} />
          <div className="relative bg-(--bg-secondary) border border-(--border-color) rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-(--text-primary)">
                  Eliminando {pendingDeleteIds.length === 1 ? '1 producto' : `${pendingDeleteIds.length} productos`}
                </h3>
                <p className="text-sm text-(--text-muted)">
                  Este producto tiene referencias en otras áreas
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
              {deleteWarnings.map((warning, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    warning.severity === 'block'
                      ? 'bg-red-500/10 border border-red-500/20'
                      : 'bg-amber-500/10 border border-amber-500/20'
                  }`}
                >
                  {warning.severity === 'block' ? (
                    <Trash2 className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <span className={`text-sm ${
                    warning.severity === 'block' ? 'text-red-300' : 'text-amber-300'
                  }`}>
                    {warning.message}
                  </span>
                </div>
              ))}
            </div>

            {deleteWarnings.some(w => w.severity === 'block') && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-300 text-sm font-medium">
                  ⚠️ Este producto está bloqueado para eliminación. Use "Desactivar" en su lugar.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={handleCancelDelete}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={handleSoftDelete}
                disabled={isDeleting}
              >
                Desactivar
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={handleProceedDelete}
                disabled={
                  isDeleting ||
                  deleteWarnings.some(w => w.severity === 'block') ||
                  role !== 'owner'
                }
                title={role !== 'owner' ? 'Solo el dueño puede eliminar permanentemente' : ''}
              >
                {isDeleting ? 'Eliminando...' : role === 'owner' ? 'Eliminar' : 'Solo dueño'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface GridViewProps {
  products: Product[]
  categories: Category[]
  loading: boolean
  currentPage: number
  totalPages: number
  onEdit: (p: Product) => void
  onDelete: (id: string) => void
  onPageChange: (page: number) => void
  onNewProduct: () => void
  getStockStatus: (stock: number) => { label: string; color: string }
}

function GridView({ products, categories, loading, currentPage, totalPages, onEdit, onDelete, onPageChange, onNewProduct, getStockStatus }: GridViewProps) {
  if (loading) {
    return <div className="py-10 text-center text-slate-500">Cargando productos...</div>
  }
  
  if (products.length === 0) {
    return (
      <div className="py-12 text-center">
        <Package className="w-12 h-12 mx-auto mb-3 text-slate-600" />
        <p className="text-lg text-slate-400">No hay productos que coincidan</p>
        <Button onClick={onNewProduct} className="mt-4">
          <Plus className="w-4 h-4 mr-2" />
          Crear Primer Producto
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((product) => (
          <ProductCard
            key={product.localId}
            product={product}
            category={categories.find(c => c.id === product.categoryId)}
            stockStatus={getStockStatus(product.stock)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center mt-4">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
        </div>
      )}
    </>
  )
}

interface TableViewProps {
  products: Product[]
  categories: Category[]
  loading: boolean
  currentPage: number
  totalPages: number
  filteredCount: number
  selectedProducts: string[]
  sort: SortConfig
  onEdit: (p: Product) => void
  onDelete: (id: string) => void
  onPageChange: (page: number) => void
  onSort: (sort: SortConfig) => void
  onToggleSelection: (id: string) => void
  getStockStatus: (stock: number) => { label: string; color: string }
}

function TableView({ products, categories, loading, currentPage, totalPages, filteredCount, selectedProducts, sort, onEdit, onDelete, onPageChange, onSort, onToggleSelection, getStockStatus }: TableViewProps) {
  return (
    <>
      <ProductTable
        products={products}
        categories={categories}
        selectedProducts={selectedProducts}
        sort={sort}
        loading={loading}
        onSort={onSort}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleSelection={onToggleSelection}
        getStockStatus={getStockStatus}
      />
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-4 px-2 border-t border-(--border-color)">
          <span className="text-sm text-slate-400">
            Mostrando {((currentPage - 1) * 20) + 1}-{Math.min(currentPage * 20, filteredCount)} de {filteredCount}
          </span>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
        </div>
      )}
    </>
  )
}

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="flex items-center gap-1 px-3 py-1.5 bg-(--bg-tertiary) hover:bg-(--brand-500)/20 disabled:opacity-50 rounded-lg text-sm"
      >
        Anterior
      </button>
      <span className="text-sm text-(--text-secondary) px-4">
        {currentPage} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="flex items-center gap-1 px-3 py-1.5 bg-(--bg-tertiary) hover:bg-(--brand-500)/20 disabled:opacity-50 rounded-lg text-sm"
      >
        Siguiente
      </button>
    </div>
  )
}
