import { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { Plus, Search, Edit2, Trash2, Package, X } from 'lucide-react';
import { useTenantStore } from '../../store/useTenantStore';
import { createProduct, updateProduct, deleteProduct } from '../../services/products.service';
import { db, Product } from '../../services/db';

export default function Inventory() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    price: 0,
    cost: 0,
    stock: 0,
    categoryId: 0,
    isActive: true,
  });

  const tenant = useTenantStore((state) => state.currentTenant);

  useEffect(() => {
    async function loadProducts() {
      if (!tenant?.slug) {
        setProducts([]);
        return;
      }
      try {
        const data = await db.products.where('tenantId').equals(tenant.slug).toArray();
        setProducts(data);
      } catch (error) {
        console.error('Error loading products:', error);
      }
    }
    loadProducts();
  }, [tenant?.slug]);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

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
      console.error('Error:', error);
    }
  };

  const handleEdit = (product: Product) => {
    setForm({
      name: product.name,
      sku: product.sku,
      price: product.price,
      cost: product.cost,
      stock: product.stock,
      categoryId: product.categoryId || 0,
      isActive: product.isActive,
    });
    setEditingId(product.localId);
    setShowModal(true);
  };

  const handleDelete = async (localId: string) => {
    if (confirm('¿Eliminar producto?')) {
      await deleteProduct(localId);
    }
  };

  const resetForm = () => {
    setForm({ name: '', sku: '', price: 0, cost: 0, stock: 0, categoryId: 0, isActive: true });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Inventario</h2>
          <p className="text-slate-400">Gestiona tus productos</p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>

      <Card>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Producto</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">SKU</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Precio</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Stock</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">Estado</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No hay productos</p>
                  </td>
                </tr>
              ) : (
                filteredProducts?.map((product) => (
                  <tr key={product.localId} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-white">{product.name}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-sm">{product.sku}</td>
                    <td className="py-3 px-4 text-right text-green-400">${product.price.toFixed(2)}</td>
                    <td className={`py-3 px-4 text-right ${product.stock <= 10 ? 'text-red-400' : 'text-white'}`}>
                      {product.stock}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                        {product.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(product)} className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4 text-slate-400" />
                        </button>
                        <button onClick={() => handleDelete(product.localId)} className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4 text-red-400" />
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white">
                {editingId ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-1 hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <Input
                label="Nombre"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="SKU"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  required
                />
                <Input
                  label="Categoría ID"
                  type="number"
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Precio"
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  required
                />
                <Input
                  label="Costo"
                  type="number"
                  step="0.01"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
                />
                <Input
                  label="Stock"
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm text-slate-300">Producto activo</label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingId ? 'Guardar Cambios' : 'Crear Producto'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
