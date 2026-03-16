import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button, Input, Card } from '@/common';
import { useToast } from '@/providers/ToastProvider';
import { Plus, Search, Edit2, Trash2, Package, X, Cloud, CloudOff, LayoutGrid, List, Filter, PackageX, AlertTriangle, Image as ImageIcon, Loader2, Star } from 'lucide-react';
import { useTenantStore } from '@/store/useTenantStore';
import { createProduct, updateProduct, deleteProduct, getProducts } from '../services/products.service';
import { getCategories, createCategory } from '../services/categories.service';
import { uploadProductImage } from '../services/images.service';
import { Product, Category } from '@/lib/db';
import { EventBus, Events } from '@/lib/events/EventBus';
import { isOk } from '@/types/result';
import { logger, logCategories } from '@/lib/logger';

type ViewMode = 'table' | 'grid';
type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
type StatusFilter = 'all' | 'active' | 'inactive';

export default function Inventory() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [form, setForm] = useState({
    name: '',
    sku: '',
    price: '0',
    cost: '0',
    stock: '0',
    categoryId: undefined as number | undefined,
    imageUrl: undefined as string | undefined,
    isFavorite: false,
    isActive: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const tenant = useTenantStore((state) => state.currentTenant);
  const { showError, showSuccess } = useToast();

  const loadData = useCallback(async () => {
    if (!tenant?.slug) return;
    setLoading(true);
    try {
      const [prodData, catData] = await Promise.all([
        getProducts(),
        getCategories()
      ]);
      setProducts(prodData);
      setCategories(catData);
    } catch (error) {
      showError('Error al cargar datos del inventario');
      logger.error('Error loading inventory data', error instanceof Error ? error : undefined, { category: logCategories.INVENTORY });
    } finally {
      setLoading(false);
    }
  }, [tenant?.slug, showError]);

  useEffect(() => {
    loadData();
    const unsubscribeInv = EventBus.on(Events.INVENTORY_UPDATED, loadData);
    const unsubscribeSync = EventBus.on(Events.SYNC_STATUS_CHANGED, loadData);
    return () => {
      unsubscribeInv();
      unsubscribeSync();
    };
  }, [loadData]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                           p.sku.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !selectedCategory || p.categoryId === Number(selectedCategory);
      
      let matchesStock = true;
      if (stockFilter === 'in_stock') matchesStock = p.stock > 10;
      else if (stockFilter === 'low_stock') matchesStock = p.stock > 0 && p.stock <= 10;
      else if (stockFilter === 'out_of_stock') matchesStock = p.stock === 0;
      
      let matchesStatus = true;
      if (statusFilter === 'active') matchesStatus = p.isActive;
      else if (statusFilter === 'inactive') matchesStatus = !p.isActive;
      
      let matchesPrice = true;
      if (priceRange.min) matchesPrice = p.price >= Number(priceRange.min);
      if (priceRange.max) matchesPrice = matchesPrice && p.price <= Number(priceRange.max);
      
      return matchesSearch && matchesCategory && matchesStock && matchesStatus && matchesPrice;
    });
  }, [products, search, selectedCategory, stockFilter, statusFilter, priceRange.min, priceRange.max]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let imageUrl = form.imageUrl;
      
      if (imageFile) {
        setUploadingImage(true);
        const tempId = editingId || crypto.randomUUID();
        const uploadResult = await uploadProductImage(imageFile, tempId);
        setUploadingImage(false);
        
        if (!isOk(uploadResult)) {
          showError(uploadResult.error.message);
          return;
        }
        imageUrl = uploadResult.value;
      }

      const productData = {
        name: form.name,
        sku: form.sku,
        price: Number(form.price) || 0,
        cost: Number(form.cost) || 0,
        stock: Number(form.stock) || 0,
        categoryId: form.categoryId,
        imageUrl,
        isFavorite: form.isFavorite,
        isActive: form.isActive,
      };

      if (editingId) {
        const result = await updateProduct(editingId, productData);
        if (!isOk(result)) {
          showError(result.error.message);
          return;
        }
        showSuccess('Producto actualizado correctamente');
      } else {
        const result = await createProduct(productData);
        if (!isOk(result)) {
          showError(result.error.message);
          return;
        }
        showSuccess('Producto creado correctamente');
      }
      setShowModal(false);
      resetForm();
    } catch (_error) {
      showError('Error al guardar producto');
    }
  };

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
    });
    setImagePreview(product.imageUrl || null);
    setEditingId(product.localId);
    setShowModal(true);
  }, []);

  const handleDelete = useCallback(async (localId: string) => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      const result = await deleteProduct(localId);
      if (!isOk(result)) {
        showError(result.error.message);
        return;
      }
      showSuccess('Producto eliminado correctamente');
    }
  }, [showError, showSuccess]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      showError('El nombre de la categoría es requerido');
      return;
    }
    
    const result = await createCategory({ name: newCategoryName.trim(), description: '' });
    if (!isOk(result)) {
      showError(result.error.message);
      return;
    }
    
    showSuccess('Categoría creada correctamente');
    const catData = await getCategories();
    setCategories(catData);
    setShowNewCategory(false);
    setNewCategoryName('');
  };

  const resetForm = useCallback(() => {
    setForm({ name: '', sku: '', price: '0', cost: '0', stock: '0', categoryId: undefined, imageUrl: undefined, isFavorite: false, isActive: true });
    setImageFile(null);
    setImagePreview(null);
    setEditingId(null);
    setShowNewCategory(false);
    setNewCategoryName('');
  }, []);

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Sin Stock', color: 'text-red-400 bg-red-500/10', icon: PackageX };
    if (stock <= 10) return { label: 'Stock Bajo', color: 'text-amber-400 bg-amber-500/10', icon: AlertTriangle };
    return { label: 'En Stock', color: 'text-green-400 bg-green-500/10', icon: Package };
  };

  const hasActiveFilters = selectedCategory || stockFilter !== 'all' || statusFilter !== 'all' || priceRange.min || priceRange.max;

  const renderProductCard = (product: Product) => {
    const stockStatus = getStockStatus(product.stock);
    const StockIcon = stockStatus.icon;
    const category = categories.find(c => c.id === product.categoryId);
    
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
            <button onClick={() => handleEdit(product)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => handleDelete(product.localId)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-all">
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
              <StockIcon className="w-3 h-3" />
              <span className="text-xs font-medium">{product.stock}</span>
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
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Inventario</h2>
          <p className="text-slate-400">{filteredProducts.length} productos</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-(--bg-tertiary)/50 rounded-lg p-1 border border-(--border-color)">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'table' ? 'bg-(--brand-600) text-white' : 'text-slate-400 hover:text-white'}`}
              title="Vista Tabla"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-(--brand-600) text-white' : 'text-slate-400 hover:text-white'}`}
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

      <Card>
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o SKU..."
                value={search}
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
                <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide">Categoría</label>
                <select 
                  className="w-full px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">Todas</option>
                  {categories.map(cat => (
                    <option key={cat.localId} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide">Stock</label>
                <select 
                  className="w-full px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value as StockFilter)}
                >
                  <option value="all">Todos</option>
                  <option value="in_stock">En Stock (&gt;10)</option>
                  <option value="low_stock">Stock Bajo (1-10)</option>
                  <option value="out_of_stock">Sin Stock</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide">Estado</label>
                <select 
                  className="w-full px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                >
                  <option value="all">Todos</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide">Rango Precio</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                    className="w-full px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                    className="w-full px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {viewMode === 'grid' ? (
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
              filteredProducts.map(renderProductCard)
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Producto</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Categoría</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Precio</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sync</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
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
                  filteredProducts.map((product) => {
                    const stockStatus = getStockStatus(product.stock);
                    const StockIcon = stockStatus.icon;
                    return (
                      <tr key={product.localId} className="border-b border-(--border-color) hover:bg-(--brand-500)/5 transition-colors group">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                              {product.imageUrl ? (
                                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-5 h-5 text-slate-500" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-white">{product.name}</div>
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
                            <StockIcon className="w-3 h-3" />
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
                            <button onClick={() => handleEdit(product)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(product.localId)} className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
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
                  <div className="flex-shrink-0">
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
                              const file = e.target.files?.[0];
                              if (file) {
                                setImageFile(file);
                                setImagePreview(URL.createObjectURL(file));
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
                    type="number"
                    step="0.01"
                    value={form.cost}
                    placeholder="0"
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    onFocus={(e) => e.target.select()}
                  />
                  <Input
                    label="Stock Inicial"
                    type="number"
                    value={form.stock}
                    placeholder="0"
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    onFocus={(e) => e.target.select()}
                    required
                  />
                </div>

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
    </div>
  );
}
