import { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { Plus, Search, Edit2, Trash2, Package, X, Cloud, CloudOff } from 'lucide-react';
import { useTenantStore } from '../../store/useTenantStore';
import { createProduct, updateProduct, deleteProduct, getProducts } from '../../services/products.service';
import { db, Product, Category } from '../../services/db';
import { EventBus, Events } from '../../services/events/EventBus';

export default function Inventory() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | string>('');
  const [form, setForm] = useState({
    name: '',
    sku: '',
    price: 0,
    cost: 0,
    stock: 0,
    categoryId: undefined as number | undefined,
    isActive: true,
  });

  const tenant = useTenantStore((state) => state.currentTenant);

  const loadData = async () => {
    if (!tenant?.slug) return;
    setLoading(true);
    try {
      const prodData = await getProducts();
      const catData = await db.categories.where('tenantId').equals(tenant.slug).toArray();
      setProducts(prodData);
      setCategories(catData);
    } catch (error) {
      console.error('Error loading inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Suscribirse a cambios en el inventario o sincronización
    const unsubscribeInv = EventBus.on(Events.INVENTORY_UPDATED, loadData);
    const unsubscribeSync = EventBus.on(Events.SYNC_STATUS_CHANGED, loadData);

    return () => {
      unsubscribeInv();
      unsubscribeSync();
    };
  }, [tenant?.slug]);

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                         p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || p.categoryId === Number(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateProduct(editingId, form);
      } else {
        await createProduct(form as any);
      }
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const handleEdit = (product: Product) => {
    setForm({
      name: product.name,
      sku: product.sku,
      price: product.price,
      cost: product.cost,
      stock: product.stock,
      categoryId: product.categoryId,
      isActive: product.isActive,
    });
    setEditingId(product.localId);
    setShowModal(true);
  };

  const handleDelete = async (localId: string) => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      await deleteProduct(localId);
    }
  };

  const resetForm = () => {
    setForm({ name: '', sku: '', price: 0, cost: 0, stock: 0, categoryId: undefined, isActive: true });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Inventario</h2>
          <p className="text-slate-400">Control de stock y productos</p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans"
            />
          </div>
          <select 
            className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[200px]"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categories.map(cat => (
              <option key={cat.localId} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

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
                filteredProducts.map((product) => (
                  <tr key={product.localId} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group">
                    <td className="py-4 px-4">
                      <div className="font-medium text-white">{product.name}</div>
                      {!product.isActive && <span className="text-[10px] text-red-500 font-bold uppercase">Inactivo</span>}
                    </td>
                    <td className="py-4 px-4 text-slate-400 font-mono text-sm">{product.sku}</td>
                    <td className="py-4 px-4 text-slate-400">
                      {categories.find(c => c.id === product.categoryId)?.name || 'Sin Categoría'}
                    </td>
                    <td className="py-4 px-4 text-right text-green-400 font-medium">
                      ${product.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`py-4 px-4 text-right font-bold ${product.stock <= 10 ? 'text-red-400 animate-pulse' : 'text-slate-200'}`}>
                      {product.stock}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {product.syncedAt ? (
                        <div title="Sincronizado">
                          <Cloud className="w-4 h-4 text-blue-500 mx-auto" />
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden ring-1 ring-white/10">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-800/50 border-b border-slate-700/50">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {editingId ? <Edit2 className="w-5 h-5 text-blue-400" /> : <Plus className="w-5 h-5 text-green-400" />}
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
                <Input
                  label="Nombre del Producto"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Hamburguesa Especial"
                  required
                />
                
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
                    <select 
                      value={form.categoryId || ''}
                      onChange={(e) => setForm({ ...form, categoryId: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar Categoría</option>
                      {categories.map(cat => (
                        <option key={cat.localId} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Input
                    label="Precio Venta"
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    required
                  />
                  <Input
                    label="Costo Unitario"
                    type="number"
                    step="0.01"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
                  />
                  <Input
                    label="Stock Inicial"
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-5 h-5 rounded-md bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500/20"
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
                <Button type="submit" className="px-8 shadow-lg shadow-blue-500/20">
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
