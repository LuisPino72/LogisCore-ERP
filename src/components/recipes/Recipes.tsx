import { useState, useEffect } from 'react';
import { db, Product } from '../../services/db';
import { useTenantStore } from '../../store/useTenantStore';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { ChefHat, Plus, Play, X } from 'lucide-react';

interface Recipe {
  id?: number;
  localId: string;
  tenantId: string;
  name: string;
  description?: string;
  productId: string;
  ingredients: { productId: string; productName: string; quantity: number }[];
  isActive: boolean;
}

export default function Recipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', productId: '', ingredients: [] as { productId: string; quantity: number }[] });
  const [produceQty, setProduceQty] = useState(1);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const tenant = useTenantStore((state) => state.currentTenant);

  useEffect(() => {
    async function loadData() {
      if (!tenant?.slug) return;
      const prods = await db.products.where('tenantId').equals(tenant.slug).toArray();
      setProducts(prods);
      setRecipes([
        { localId: '1', tenantId: tenant.slug, name: 'Hamburguesa Clásica', description: 'Hamburguesa con queso', productId: '1', ingredients: [{ productId: '1', productName: 'Carne', quantity: 0.2 }], isActive: true },
        { localId: '2', tenantId: tenant.slug, name: 'Papas Fritas', description: 'Papas medianas', productId: '2', ingredients: [{ productId: '2', productName: 'Papa', quantity: 0.3 }], isActive: true },
      ]);
    }
    loadData();
  }, [tenant?.slug]);

  const handleProduce = async () => {
    alert(`Producción iniciada: ${produceQty} unidades de ${selectedRecipe?.name}`);
    setSelectedRecipe(null);
    setProduceQty(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ChefHat className="w-6 h-6" />
            Recetas
          </h2>
          <p className="text-slate-400">Gestión de producción</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Receta
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recipes.map((recipe) => (
          <Card key={recipe.localId} className="hover:border-blue-500 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-white">{recipe.name}</h3>
                <p className="text-sm text-slate-400">{recipe.description}</p>
              </div>
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                Activa
              </span>
            </div>
            <div className="mb-4">
              <p className="text-xs text-slate-500 mb-2">Ingredientes:</p>
              <div className="space-y-1">
                {recipe.ingredients.map((ing, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-300">{ing.productName}</span>
                    <span className="text-slate-400">{ing.quantity} {ing.productId === '1' ? 'kg' : 'kg'}</span>
                  </div>
                ))}
              </div>
            </div>
            <Button variant="secondary" className="w-full" onClick={() => setSelectedRecipe(recipe)}>
              <Play className="w-4 h-4 mr-2" />
              Producir
            </Button>
          </Card>
        ))}
      </div>

      {selectedRecipe && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white">Producir: {selectedRecipe.name}</h3>
              <button onClick={() => setSelectedRecipe(null)} className="p-1 hover:bg-slate-700 rounded">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <Input
                label="Cantidad a producir"
                type="number"
                min={1}
                value={produceQty}
                onChange={(e) => setProduceQty(Number(e.target.value))}
              />
              <div className="bg-slate-800 p-4 rounded-lg">
                <p className="text-sm text-slate-400 mb-2">Materiales necesarios:</p>
                {selectedRecipe.ingredients.map((ing, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-300">{ing.productName}</span>
                    <span className="text-slate-400">{(ing.quantity * produceQty).toFixed(2)} kg</span>
                  </div>
                ))}
              </div>
              <Button className="w-full" onClick={handleProduce}>
                Iniciar Producción
              </Button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white">Nueva Receta</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-700 rounded">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form className="p-6 space-y-4">
              <Input
                label="Nombre de la receta"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: Hamburguesa Especial"
              />
              <Input
                label="Descripción"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descripción opcional"
              />
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Producto resultado</label>
                <select
                  value={form.productId}
                  onChange={(e) => setForm({ ...form, productId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="">Seleccionar producto</option>
                  {products.map((p) => (
                    <option key={p.localId} value={p.localId}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Crear Receta
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
