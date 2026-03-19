import { useEffect, useCallback, useState } from 'react'
import { Button, Input, Card } from '@/common'
import { Plus, Search, Edit2, Trash2, Package, X, Cloud, CloudOff, LayoutGrid, List, Filter, Image as ImageIcon, Loader2, Star, Download, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Barcode, Trash, CheckSquare, Square, FolderEdit, RotateCcw } from 'lucide-react'
import { useInventory } from '../hooks/useInventory'
import { EventBus, Events } from '@/lib/events/EventBus'
import { logger, logCategories } from '@/lib/logger'
import type { Product, Category } from '@/lib/db'
import type { StockFilter, StatusFilter, SaleType } from '../types/inventory.types'

export default function Inventory() {
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

  const [newCategoryForm, setNewCategoryForm] = useState({ name: '', saleType: 'unit' as SaleType })
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.barcodeScan, paginatedProducts]) // handleEdit and setBarcodeScan are stable

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

      const productData = {
        ...form,
        imageUrl,
      }

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
    const confirmed = window.confirm('¿Estás seguro de eliminar este producto?');
    if (confirmed) {
      await deleteProduct(localId)
    }
  }, [deleteProduct])

  const handleCreateCategory = useCallback(async () => {
    if (!newCategoryName.trim()) return
    await createCategory(newCategoryName.trim())
    setShowNewCategory(false)
    setNewCategoryName('')
  }, [newCategoryName, createCategory, setShowNewCategory, setNewCategoryName])

  const renderProductCard = (product: Product) => {
    const stockStatus = getStockStatus(product.stock)
    const category = categories.find(c => c.id === product.categoryId)
    
    return (
      <div key={product.localId} className="bg-(--bg-secondary) border border-(--border-color) rounded-xl p-4 shadow-lg hover:shadow-xl transition-all">
        <div className="flex items-start justify-between mb-3">
          <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <Package className="w-6 h-6 text-slate-500" />
            )}
          </div>
          <div className="flex gap-1">
            <button onClick={() => handleEdit(product)} title="Editar producto" className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => handleDelete(product.localId)} title="Eliminar producto" className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-all">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <h3 className="font-semibold text-white mb-1 truncate">{product.name}</h3>
        <p className="text-xs text-slate-500 font-mono mb-3">{product.sku}</p>
        
        <div className="flex flex-wrap gap-1.5 mb-3">
          {category && (
            <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] rounded uppercase">
              {category.name}
            </span>
          )}
          {!product.isActive && (
            <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] rounded uppercase font-medium">
              Inactivo
            </span>
          )}
        </div>
        
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Precio</p>
            <p className="text-lg font-bold text-green-400">${product.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${stockStatus.color}`}>
              <span className="text-xs font-medium">{stockStatus.label}</span>
              <span className="text-xs font-bold">{product.stock}</span>
            </div>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
          {product.syncedAt ? (
            <div className="flex items-center gap-1 text-(--brand-400) text-xs">
              <Cloud className="w-3 h-3" />
              Sincronizado
            </div>
          ) : (
            <div className="flex items-center gap-1 text-amber-400 text-xs">
              <CloudOff className="w-3 h-3" />
              Pendiente
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white" title="Gestiona tu inventario de productos">Inventario</h2>
          <p className="text-slate-400">{filteredProducts.length} productos {selectedProducts.length > 0 && `(${selectedProducts.length} seleccionados)`}</p>
        </div>
        <div className="flex items-center gap-2">
              {selectedProducts.length > 0 && (
                <div className="flex items-center gap-2 pr-4 border-r border-(--border-color)">
                  <span className="text-sm text-slate-400">{selectedProducts.length} seleccionados</span>
                  <button
                    onClick={() => {
                      const confirmed = window.confirm(`¿Eliminar ${selectedProducts.length} productos?`);
                      if (confirmed) {
                        deleteSelectedProducts()
                      }
                    }}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                <Trash className="w-4 h-4" />
                Eliminar
              </button>
              <button onClick={clearSelection} title="Limpiar selección" className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <button
            onClick={() => setShowFavoritesOnly(!filters.showFavoritesOnly)}
            className={`p-2 rounded-lg border transition-all ${filters.showFavoritesOnly ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-(--bg-tertiary) border-(--border-color) text-slate-400 hover:text-white'}`}
            title="Solo favoritos"
          >
            <Star className="w-4 h-4" />
          </button>
          <button
            onClick={() => selectAllProducts()}
            className="p-2 rounded-lg border bg-(--bg-tertiary) border-(--border-color) text-slate-400 hover:text-white transition-all"
            title="Seleccionar todos"
          >
            <CheckSquare className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowBarcodeScanner(!showBarcodeScanner)}
            className={`p-2 rounded-lg border transition-all ${showBarcodeScanner ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-(--bg-tertiary) border-(--border-color) text-slate-400 hover:text-white'}`}
            title="Escanear código de barras"
          >
            <Barcode className="w-4 h-4" />
          </button>
          <button
            onClick={() => exportProducts('csv')}
            className="p-2 rounded-lg border bg-(--bg-tertiary) border-(--border-color) text-slate-400 hover:text-white transition-all"
            title="Exportar CSV"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="p-2 rounded-lg border bg-(--bg-tertiary) border-(--border-color) text-slate-400 hover:text-white transition-all"
            title="Gestionar categorías"
          >
            <FolderEdit className="w-4 h-4" />
          </button>
          <div className="flex items-center bg-(--bg-tertiary)/50 rounded-lg p-1 border border-(--border-color)">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-colors ${filters.viewMode === 'table' ? 'bg-(--brand-600) text-white' : 'text-slate-400 hover:text-white'}`}
              title="Vista Tabla"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${filters.viewMode === 'grid' ? 'bg-(--brand-600) text-white' : 'text-slate-400 hover:text-white'}`}
              title="Vista Grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      {showBarcodeScanner && (
        <div className="bg-(--bg-secondary) border border-(--border-color) rounded-xl p-4">
          <div className="flex items-center gap-4">
            <Barcode className="w-6 h-6 text-blue-400" />
            <input
              type="text"
              placeholder="Escanee o ingrese el código de barras/SKU..."
              value={filters.barcodeScan}
              onChange={(e) => setBarcodeScan(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button onClick={() => setBarcodeScan('')} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
          {filters.barcodeScan && paginatedProducts.length > 1 && (
            <p className="text-sm text-amber-400 mt-2">Se encontraron {paginatedProducts.length} productos. Refine la búsqueda.</p>
          )}
        </div>
      )}

      <Card>
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o SKU..."
                title="Busca productos por nombre o código SKU"
                value={filters.search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500) transition-all font-sans"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${hasActiveFilters ? 'bg-(--brand-500)/10 border-(--brand-500)/50 text-(--brand-400)' : 'bg-(--bg-tertiary) border-(--border-color) text-(--text-secondary) hover:text-(--text-primary)'}`}
            >
              <Filter className="w-4 h-4" />
              Filtros
              {hasActiveFilters && <span className="w-2 h-2 bg-(--brand-400) rounded-full" />}
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-950/50 rounded-xl border border-slate-800">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" title="Filtra productos por categoría">Categoría</label>
                <select 
                  className="w-full px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
                  value={filters.selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">Todas</option>
                  {categories.map(cat => (
                    <option key={cat.localId} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" title="Filtra productos según nivel de stock">Stock</label>
                <select 
                  className="w-full px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
                  value={filters.stockFilter}
                  onChange={(e) => setStockFilter(e.target.value as StockFilter)}
                >
                  <option value="all">Todos</option>
                  <option value="in_stock">En Stock (&gt;10)</option>
                  <option value="low_stock">Stock Bajo (1-10)</option>
                  <option value="out_of_stock">Sin Stock</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" title="Filtra por estado del producto">Estado</label>
                <select 
                  className="w-full px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
                  value={filters.statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                >
                  <option value="all">Todos</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" title="Filtra productos dentro de un rango de precio">Rango Precio</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.priceRange.min}
                    onChange={(e) => setPriceRange({ ...filters.priceRange, min: e.target.value })}
                    className="w-full px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.priceRange.max}
                    onChange={(e) => setPriceRange({ ...filters.priceRange, max: e.target.value })}
                    className="w-full px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {filters.viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {loading ? (
              <div className="col-span-full py-10 text-center text-slate-500">Cargando productos...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full py-12 text-center">
                <Package className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p className="text-lg text-slate-400">No hay productos que coincidan</p>
                <Button onClick={() => { resetForm(); setShowModal(true); }} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primer Producto
                </Button>
              </div>
            ) : (
              <>
                {paginatedProducts.map(renderProductCard)}
                <div className="col-span-full flex justify-center mt-4">
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    title="Página anterior"
                    className="p-2 hover:bg-slate-700 rounded-lg disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-slate-400">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    title="Página siguiente"
                    className="p-2 hover:bg-slate-700 rounded-lg disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider">
                      <button onClick={() => setSort({ field: 'name', direction: filters.sort.direction === 'asc' ? 'desc' : 'asc' })} className="flex items-center gap-1">
                        Producto
                        {filters.sort.field === 'name' && (filters.sort.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </button>
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider">
                      <button onClick={() => setSort({ field: 'sku', direction: filters.sort.direction === 'asc' ? 'desc' : 'asc' })} className="flex items-center gap-1">
                        SKU
                        {filters.sort.field === 'sku' && (filters.sort.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider">Categoría</th>
                    <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider">
                      <button onClick={() => setSort({ field: 'price', direction: filters.sort.direction === 'asc' ? 'desc' : 'asc' })} className="flex items-center gap-1">
                        Precio
                        {filters.sort.field === 'price' && (filters.sort.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </button>
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider">
                      <button onClick={() => setSort({ field: 'stock', direction: filters.sort.direction === 'asc' ? 'desc' : 'asc' })} className="flex items-center gap-1">
                        Stock
                        {filters.sort.field === 'stock' && (filters.sort.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </button>
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider">Sync</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="py-10 text-center text-slate-500">Cargando productos...</td></tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-lg">No hay productos que coincidan</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((product) => {
                      const stockStatus = getStockStatus(product.stock)
                      return (
                        <tr key={product.localId} className="border-b border-(--border-color) hover:bg-(--brand-500)/5 transition-colors group">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <button onClick={() => toggleProductSelection(product.localId)} className="text-slate-400 hover:text-white">
                                {selectedProducts.includes(product.localId) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                              </button>
                              <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                                {product.imageUrl ? (
                                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Package className="w-5 h-5 text-slate-500" />
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-white flex items-center gap-2">
                                  {product.name}
                                  {product.isFavorite && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                                </div>
                                {!product.isActive && <span className="text-[10px] text-red-500 font-bold uppercase">Inactivo</span>}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-slate-400 font-mono text-sm">{product.sku}</td>
                          <td className="py-4 px-4 text-slate-400">
                            {categories.find(c => c.id === product.categoryId)?.name || 'Sin Categoría'}
                          </td>
                          <td className="py-4 px-4 text-right text-green-400 font-medium">
                            ${product.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${stockStatus.color}`}>
                              <span className="font-bold">{product.stock}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            {product.syncedAt ? (
                              <div title="Sincronizado">
                                <Cloud className="w-4 h-4 text-(--brand-500) mx-auto" />
                              </div>
                            ) : (
                              <div title="Pendiente de sincronizar">
                                <CloudOff className="w-4 h-4 text-amber-500 mx-auto" />
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleEdit(product)} title="Editar producto" className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(product.localId)} title="Eliminar producto" className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-all">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between py-4 px-2 border-t border-(--border-color)">
                <span className="text-sm text-slate-400">
                  Mostrando {((currentPage - 1) * 20) + 1}-{Math.min(currentPage * 20, filteredProducts.length)} de {filteredProducts.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    title="Página anterior"
                    className="flex items-center gap-1 px-3 py-1.5 bg-(--bg-tertiary) hover:bg-(--brand-500)/20 disabled:opacity-50 rounded-lg text-sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>
                  <span className="text-sm text-(--text-secondary) px-4">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    title="Página siguiente"
                    className="flex items-center gap-1 px-3 py-1.5 bg-(--bg-tertiary) hover:bg-(--brand-500)/20 disabled:opacity-50 rounded-lg text-sm"
                  >
                    Siguiente
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-(--bg-primary) border border-(--border-color) rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden ring-1 ring-white/10">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-800/50 border-b border-slate-700/50">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {editingId ? <Edit2 className="w-5 h-5 text-(--brand-400)" /> : <Plus className="w-5 h-5 text-green-400" />}
                {editingId ? 'Editar Producto' : 'Crear Nuevo Producto'}
              </h3>
              <button 
                onClick={() => { setShowModal(false); resetForm(); }}
                className="p-2 hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="shrink-0">
                    <label className="text-sm font-medium text-slate-400 mb-2 block">Imagen</label>
                    <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-700 bg-slate-800/50 flex items-center justify-center overflow-hidden relative group">
                      {imagePreview ? (
                        <>
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => { setImageFile(null); setImagePreview(null); }}
                            className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-6 h-6 text-white" />
                          </button>
                        </>
                      ) : (
                        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-700/30 transition-colors">
                          {uploadingImage ? (
                            <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
                          ) : (
                            <>
                              <ImageIcon className="w-8 h-8 text-slate-500 mb-1" />
                              <span className="text-[10px] text-slate-500">Subir</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                setImageFile(file)
                                setImagePreview(URL.createObjectURL(file))
                              }
                            }}
                            disabled={uploadingImage}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                  <Input
                    label="Nombre del Producto"
                    title="Nombre visible del producto"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ej: Hamburguesa Especial"
                    required
                  />
                </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="SKU / Código"
                    title="Código único de identificación del producto"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    placeholder="Ene-001"
                    required
                  />
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-400">Categoría</label>
                    {showNewCategory ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Nueva categoría..."
                          className="flex-1 px-4 py-2.5 bg-(--bg-primary) border border-(--border-color) rounded-lg text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleCreateCategory}
                          className="px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowNewCategory(false); setNewCategoryName(''); }}
                          className="px-3 py-2 bg-slate-700 text-slate-400 rounded-lg hover:bg-slate-600 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <select 
                          value={form.categoryId || ''}
                          onChange={(e) => setForm({ ...form, categoryId: e.target.value ? Number(e.target.value) : undefined })}
                          className="flex-1 px-4 py-2.5 bg-(--bg-primary) border border-(--border-color) rounded-lg text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
                        >
                          <option value="">Seleccionar Categoría</option>
                          {categories.map(cat => (
                            <option key={cat.localId} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowNewCategory(true)}
                          className="px-3 py-2 bg-(--brand-500)/20 text-(--brand-400) rounded-lg hover:bg-(--brand-500)/30 transition-colors"
                          title="Crear nueva categoría"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Input
                    label="Precio Venta"
                    title="Precio al que se venderá el producto"
                    type="number"
                    step="0.01"
                    value={form.price}
                    placeholder="0"
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    onFocus={(e) => e.target.select()}
                    required
                  />
                  <Input
                    label="Costo Unitario"
                    title="Costo de adquisición del producto"
                    type="number"
                    step="0.01"
                    value={form.cost}
                    placeholder="0"
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    onFocus={(e) => e.target.select()}
                  />
                  <Input
                    label="Stock Inicial"
                    title="Cantidad inicial en inventario"
                    type="number"
                    value={form.stock}
                    placeholder="0"
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    onFocus={(e) => e.target.select()}
                    required
                  />
                </div>

                {(() => {
                  const selectedCategory = categories.find(c => c.id === form.categoryId);
                  const saleType = selectedCategory?.saleType || 'unit';
                  
                  if (saleType === 'weight') {
                    return (
                      <Input
                        label="Precio por Kilogramo"
                        type="number"
                        step="0.01"
                        value={form.pricePerKg || ''}
                        placeholder="0.00"
                        onChange={(e) => setForm({ ...form, pricePerKg: e.target.value })}
                        onFocus={(e) => e.target.select()}
                      />
                    );
                  }
                  
                  if (saleType === 'sample') {
                    return (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">Muestras de Venta</label>
                        <div className="space-y-2">
                          {(form.samples || []).map((sample, index) => (
                            <div key={index} className="flex gap-2 items-center">
                              <input
                                type="text"
                                value={sample.name}
                                onChange={(e) => {
                                  const newSamples = [...(form.samples || [])];
                                  newSamples[index] = { ...sample, name: e.target.value };
                                  setForm({ ...form, samples: newSamples });
                                }}
                                placeholder="Nombre (ej: Cartón)"
                                className="flex-1 px-3 py-2 bg-(--bg-primary) border border-(--border-color) rounded-lg text-(--text-primary)"
                              />
                              <input
                                type="number"
                                value={sample.quantity}
                                onChange={(e) => {
                                  const newSamples = [...(form.samples || [])];
                                  newSamples[index] = { ...sample, quantity: parseFloat(e.target.value) || 0 };
                                  setForm({ ...form, samples: newSamples });
                                }}
                                placeholder="Cant"
                                className="w-20 px-3 py-2 bg-(--bg-primary) border border-(--border-color) rounded-lg text-(--text-primary)"
                              />
                              <input
                                type="number"
                                step="0.01"
                                value={sample.price}
                                onChange={(e) => {
                                  const newSamples = [...(form.samples || [])];
                                  newSamples[index] = { ...sample, price: parseFloat(e.target.value) || 0 };
                                  setForm({ ...form, samples: newSamples });
                                }}
                                placeholder="Precio"
                                className="w-24 px-3 py-2 bg-(--bg-primary) border border-(--border-color) rounded-lg text-(--text-primary)"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newSamples = (form.samples || []).filter((_, i) => i !== index);
                                  setForm({ ...form, samples: newSamples });
                                }}
                                className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const newSamples = [...(form.samples || []), { id: crypto.randomUUID(), name: '', quantity: 1, price: 0 }];
                              setForm({ ...form, samples: newSamples });
                            }}
                            className="text-sm text-(--brand-400) hover:text-(--brand-300)"
                          >
                            + Agregar muestra
                          </button>
                        </div>
                      </div>
                    );
                  }
                  
                  return null;
                })()}

                <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
                  <input
                    type="checkbox"
                    id="isFavorite"
                    checked={form.isFavorite}
                    onChange={(e) => setForm({ ...form, isFavorite: e.target.checked })}
                    className="w-5 h-5 rounded-md bg-(--bg-primary) border-(--border-color) text-amber-500 focus:ring-(--brand-500)/20"
                  />
                  <div className="flex flex-col">
                    <label htmlFor="isFavorite" className="text-sm font-semibold text-white flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-400" />
                      Producto Favorito
                    </label>
                    <span className="text-xs text-slate-500">Aparece primero en el POS</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-5 h-5 rounded-md bg-(--bg-primary) border-(--border-color) text-blue-600 focus:ring-(--brand-500)/20"
                  />
                  <div className="flex flex-col">
                    <label htmlFor="isActive" className="text-sm font-semibold text-white">Producto Activo</label>
                    <span className="text-xs text-slate-500">Visible en el punto de venta</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Descartar
                </button>
                <Button type="submit" className="px-8 shadow-lg shadow-(--brand-500)/20">
                  {editingId ? 'Actualizar Producto' : 'Crear Producto'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-(--bg-primary) border border-(--border-color) rounded-2xl w-full max-w-md shadow-2xl overflow-hidden ring-1 ring-white/10">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-800/50 border-b border-slate-700/50">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FolderEdit className="w-5 h-5 text-(--brand-400)" />
                Gestionar Categorías
              </h3>
              <button onClick={() => { setShowCategoryModal(false); setEditingCategory(null); }} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
                <X className="w-5 h-5 text-black" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nueva categoría..."
                    value={newCategoryForm.name}
                    onChange={(e) => setNewCategoryForm({ name: e.target.value, saleType: newCategoryForm.saleType })}
                    className="flex-1 px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted)"
                  />
                  <button
                    onClick={async () => {
                      if (newCategoryForm.name.trim()) {
                        await createCategory(newCategoryForm.name.trim(), newCategoryForm.saleType)
                        setNewCategoryForm({ name: '', saleType: 'unit' })
                      }
                    }}
                    className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <select
                  value={newCategoryForm.saleType}
                  onChange={(e) => setNewCategoryForm({ ...newCategoryForm, saleType: e.target.value as SaleType })}
                  className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary)"
                >
                  <option value="unit">Venta Unitaria</option>
                  <option value="weight">Venta por Peso (kg)</option>
                  <option value="sample">Venta por Muestra</option>
                </select>
              </div>
              <div className="space-y-2">
                {categories.map(cat => (
                  <div key={cat.localId} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <span className="text-white">{cat.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingCategory(cat)
                          setNewCategoryForm({ name: cat.name, saleType: cat.saleType || 'unit' })
                        }}
                        title="Editar categoría"
                        className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCategoryToDelete(cat)}
                        title="Eliminar categoría"
                        className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {categories.length === 0 && (
                  <p className="text-center text-slate-500 py-4">No hay categorías</p>
                )}
              </div>
            </div>
            {editingCategory && (
              <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-800/30 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCategoryForm.name}
                    onChange={(e) => setNewCategoryForm({ name: e.target.value, saleType: newCategoryForm.saleType })}
                    className="flex-1 px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary)"
                  />
                  <Button
                    onClick={async () => {
                      if (newCategoryForm.name.trim() && editingCategory) {
                        await updateCategory(editingCategory.localId, { name: newCategoryForm.name.trim(), saleType: newCategoryForm.saleType })
                        setEditingCategory(null)
                      setNewCategoryForm({ name: '', saleType: 'unit' })
                      }
                    }}
                  >
                    Guardar
                  </Button>
                  <button
                    onClick={() => { setEditingCategory(null); setNewCategoryForm({ name: '', saleType: 'unit' }); }}
                    className="px-3 py-2 text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
                <select
                  value={newCategoryForm.saleType}
                  onChange={(e) => setNewCategoryForm({ ...newCategoryForm, saleType: e.target.value as SaleType })}
                  className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary)"
                >
                  <option value="unit">Venta Unitaria</option>
                  <option value="weight">Venta por Peso (kg)</option>
                  <option value="sample">Venta por Muestra</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {categoryToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-(--bg-primary) border border-red-500/30 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Eliminar Categoría</h3>
              <p className="text-slate-400 mb-6">
                ¿Eliminar "<span className="text-white">{categoryToDelete.name}</span>"? Los productos sin categoría se mantendrán.
              </p>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setCategoryToDelete(null)} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={async () => {
                    await deleteCategory(categoryToDelete.localId)
                    setCategoryToDelete(null)
                  }}
                  className="flex-1 bg-red-500 hover:bg-red-600"
                >
                  Eliminar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
