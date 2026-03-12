import { useState, useEffect } from 'react';
import { db, Product } from '../../services/db';
import { useTenantStore } from '../../store/useTenantStore';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { ShoppingBasket, Plus, Truck, Package, X, Check } from 'lucide-react';

interface Purchase {
  id?: number;
  localId: string;
  tenantId: string;
  supplier: string;
  invoiceNumber: string;
  items: { productId: string; productName: string; quantity: number; cost: number }[];
  total: number;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: Date;
}

export default function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    supplier: '',
    invoiceNumber: '',
    items: [] as { productId: string; productName: string; quantity: number; cost: number }[],
  });
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ productId: '', quantity: 1, cost: 0 });
  const tenant = useTenantStore((state) => state.currentTenant);

  useEffect(() => {
    async function loadData() {
      if (!tenant?.slug) return;
      const prods = await db.products.where('tenantId').equals(tenant.slug).toArray();
      setProducts(prods);
      setPurchases([
        { localId: '1', tenantId: tenant.slug, supplier: 'Distribuidora ABC', invoiceNumber: 'FACT-001', items: [{ productId: '1', productName: 'Carne', quantity: 10, cost: 50 }], total: 500, status: 'completed', createdAt: new Date() },
        { localId: '2', tenantId: tenant.slug, supplier: 'Proveedor XYZ', invoiceNumber: 'FACT-002', items: [{ productId: '2', productName: 'Papas', quantity: 20, cost: 15 }], total: 300, status: 'pending', createdAt: new Date() },
      ]);
    }
    loadData();
  }, [tenant?.slug]);

  const addItem = () => {
    const product = products.find(p => p.localId === newItem.productId);
    if (!product) return;
    
    setForm({
      ...form,
      items: [...form.items, { productId: product.localId, productName: product.name, quantity: newItem.quantity, cost: newItem.cost }],
    });
    setNewItem({ productId: '', quantity: 1, cost: 0 });
    setShowAddItem(false);
  };

  const removeItem = (index: number) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  };

  const handleSubmit = async () => {
    const total = form.items.reduce((sum, item) => sum + (item.quantity * item.cost), 0);
    const newPurchase: Purchase = {
      localId: crypto.randomUUID(),
      tenantId: tenant!.slug,
      supplier: form.supplier,
      invoiceNumber: form.invoiceNumber,
      items: form.items,
      total,
      status: 'completed',
      createdAt: new Date(),
    };
    
    for (const item of form.items) {
      const product = products.find(p => p.localId === item.productId);
      if (product) {
        await db.products.update(product.localId, { stock: product.stock + item.quantity });
      }
    }
    
    setPurchases([newPurchase, ...purchases]);
    setShowModal(false);
    setForm({ supplier: '', invoiceNumber: '', items: [] });
    alert('Compra registrada y stock actualizado');
  };

  const totalPending = purchases.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.total, 0);
  const totalCompleted = purchases.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingBasket className="w-6 h-6" />
            Compras
          </h2>
          <p className="text-slate-400">Gestión de proveedores y abastecimiento</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Compra
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Completado</p>
              <p className="text-2xl font-bold text-green-400">${totalCompleted.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg">
              <Check className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Pendiente</p>
              <p className="text-2xl font-bold text-yellow-400">${totalPending.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <Truck className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Compras</p>
              <p className="text-2xl font-bold text-white">{(totalCompleted + totalPending).toFixed(2)}</p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Package className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </Card>
      </div>

      <Card title="Historial de Compras">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Fecha</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Proveedor</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Factura</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">Items</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Total</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">Estado</th>
              </tr>
            </thead>
            <tbody>
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    <ShoppingBasket className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No hay compras registradas</p>
                  </td>
                </tr>
              ) : (
                purchases.map((purchase) => (
                  <tr key={purchase.localId} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-white">{purchase.createdAt.toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-slate-300">{purchase.supplier}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-sm">{purchase.invoiceNumber}</td>
                    <td className="py-3 px-4 text-center text-slate-300">{purchase.items.length}</td>
                    <td className="py-3 px-4 text-right text-green-400">${purchase.total.toFixed(2)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        purchase.status === 'completed' ? 'bg-green-500/20 text-green-400' : 
                        purchase.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {purchase.status === 'completed' ? 'Completado' : purchase.status === 'pending' ? 'Pendiente' : 'Cancelado'}
                      </span>
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
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-slate-900">
              <h3 className="text-lg font-semibold text-white">Nueva Compra</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-700 rounded">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <Input
                label="Proveedor"
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                placeholder="Nombre del proveedor"
              />
              <Input
                label="Número de Factura"
                value={form.invoiceNumber}
                onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                placeholder="FACT-001"
              />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-300">Items</label>
                  <Button size="sm" variant="secondary" onClick={() => setShowAddItem(true)}>
                    <Plus className="w-3 h-3 mr-1" />
                    Agregar
                  </Button>
                </div>
                <div className="space-y-2">
                  {form.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between bg-slate-800 p-3 rounded-lg">
                      <div>
                        <p className="text-white">{item.productName}</p>
                        <p className="text-sm text-slate-400">{item.quantity} x ${item.cost}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-400">${(item.quantity * item.cost).toFixed(2)}</span>
                        <button onClick={() => removeItem(index)} className="p-1 hover:bg-slate-700 rounded">
                          <X className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {showAddItem && (
                <div className="bg-slate-800 p-4 rounded-lg space-y-3">
                  <select
                    value={newItem.productId}
                    onChange={(e) => setNewItem({ ...newItem, productId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="">Seleccionar producto</option>
                    {products.map((p) => (
                      <option key={p.localId} value={p.localId}>{p.name}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      label="Cantidad"
                      min={1}
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                    />
                    <Input
                      type="number"
                      label="Costo unitario"
                      step="0.01"
                      value={newItem.cost}
                      onChange={(e) => setNewItem({ ...newItem, cost: Number(e.target.value) })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addItem}>Agregar</Button>
                    <Button size="sm" variant="secondary" onClick={() => setShowAddItem(false)}>Cancelar</Button>
                  </div>
                </div>
              )}

              <div className="border-t border-slate-700 pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-white">Total</span>
                  <span className="text-green-400">
                    ${form.items.reduce((sum, item) => sum + (item.quantity * item.cost), 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <Button className="w-full" onClick={handleSubmit} disabled={!form.supplier || form.items.length === 0}>
                Registrar Compra
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
