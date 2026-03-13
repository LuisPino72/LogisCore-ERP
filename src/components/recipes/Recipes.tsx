import { useState, useEffect } from 'react';
import { db, Product, Recipe, ProductionLog } from '../../services/db';
import { useTenantStore } from '../../store/useTenantStore';
import { SyncEngine } from '../../services/sync/SyncEngine';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { ChefHat, Plus, Play, X, Search, Package, Scale, PackageX, Check } from 'lucide-react';

type RecipeForm = Omit<Recipe, 'id' | 'localId' | 'tenantId' | 'createdAt' | 'updatedAt' | 'syncedAt'>;

export default function Recipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<RecipeForm>({ name: '', description: '', productId: '', ingredients: [], yield: 1, isActive: true });
  const [produceQty, setProduceQty] = useState(1);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const tenant = useTenantStore((state) => state.currentTenant);

  useEffect(() => {
    async function loadData() {
      if (!tenant?.slug) return;
      const [prods, recs] = await Promise.all([
        db.products.where('tenantId').equals(tenant.slug).toArray(),
        db.recipes.where('tenantId').equals(tenant.slug).toArray(),
      ]);
      setProducts(prods);
      setRecipes(recs);
    }
    loadData();
  }, [tenant?.slug]);

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = !search || 
      recipe.name.toLowerCase().includes(search.toLowerCase()) ||
      recipe.description?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && recipe.isActive) ||
      (filterStatus === 'inactive' && !recipe.isActive);
    return matchesSearch && matchesStatus;
  });

  const handleCreateRecipe = async () => {
    if (!tenant?.slug || !form.name || !form.productId) return;
    
    const newRecipe: Recipe = {
      localId: crypto.randomUUID(),
      tenantId: tenant.slug,
      name: form.name,
      description: form.description,
      productId: form.productId,
      ingredients: form.ingredients.map(ing => ({
        productId: ing.productId,
        quantity: ing.quantity,
        unit: 'kg',
      })),
      yield: form.yield,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.recipes.add(newRecipe);
    await SyncEngine.addToQueue('recipes', 'create', newRecipe as unknown as Record<string, unknown>, newRecipe.localId);
    setRecipes([...recipes, newRecipe]);
    setShowModal(false);
    setForm({ name: '', description: '', productId: '', ingredients: [], yield: 1, isActive: true });
  };

  const handleProduce = async () => {
    if (!tenant?.slug || !selectedRecipe) return;

    const ingredientsUsed = selectedRecipe.ingredients.map(ing => ({
      productId: ing.productId,
      quantity: ing.quantity * produceQty,
    }));

    const log: ProductionLog = {
      localId: crypto.randomUUID(),
      tenantId: tenant.slug,
      recipeId: selectedRecipe.localId,
      quantity: produceQty,
      ingredientsUsed,
      createdAt: new Date(),
    };

    await db.productionLogs.add(log);
    await SyncEngine.addToQueue('productionLogs', 'create', log as unknown as Record<string, unknown>, log.localId);

    for (const ing of ingredientsUsed) {
      const product = products.find(p => p.localId === ing.productId);
      if (product) {
        await db.products.update(product.localId, { 
          stock: product.stock - ing.quantity,
          updatedAt: new Date(),
        });
      }
    }

    const productResult = products.find(p => p.localId === selectedRecipe.productId);
    if (productResult) {
      await db.products.update(productResult.localId, {
        stock: productResult.stock + produceQty,
        updatedAt: new Date(),
      });
    }

    alert(`Producción completada: ${produceQty} unidades de ${selectedRecipe.name}`);
    setSelectedRecipe(null);
    setProduceQty(1);
  };

  const addIngredient = () => {
    setForm({ ...form, ingredients: [...form.ingredients, { productId: '', quantity: 0, unit: 'kg' }] });
  };

  const getIngredientStock = (productId: string) => {
    const product = products.find(p => p.localId === productId);
    return product?.stock || 0;
  };

  const canProduce = (recipe: Recipe, qty: number) => {
    return recipe.ingredients.every(ing => {
      const stock = getIngredientStock(ing.productId);
      return stock >= ing.quantity * qty;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ChefHat className="w-6 h-6" />
            Recetas
          </h2>
          <p className="text-(--text-secondary)">{filteredRecipes.length} recetas</p>
        </div>
        <Button onClick={() => { setForm({ name: '', description: '', productId: '', ingredients: [], yield: 1, isActive: true }); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Receta
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-(--text-muted)" />
          <input
            type="text"
            placeholder="Buscar recetas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-(--brand-500) cursor-pointer"
        >
          <option value="all">Todas</option>
          <option value="active">Activas</option>
          <option value="inactive">Inactivas</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRecipes.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">
            <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No hay recetas</p>
          </div>
        ) : (
          filteredRecipes.map((recipe) => {
            const resultProduct = products.find(p => p.localId === recipe.productId);
            const canProd = canProduce(recipe, 1);
            return (
              <Card key={recipe.localId} className="hover:border-(--brand-500) transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-(--bg-tertiary) rounded-xl flex items-center justify-center">
                      <ChefHat className="w-6 h-6 text-(--text-muted)" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-(--text-primary)">{recipe.name}</h3>
                      <p className="text-xs text-(--text-muted)">{resultProduct?.name || 'Sin producto'}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    recipe.isActive 
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                      : 'bg-slate-700 text-slate-400 border border-slate-600'
                  }`}>
                    {recipe.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                
                {recipe.description && (
                  <p className="text-sm text-(--text-secondary) mb-4 line-clamp-2">{recipe.description}</p>
                )}
                
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-xs text-(--text-muted) mb-2">
                    <Scale className="w-3.5 h-3.5" />
                    <span>Ingredientes ({recipe.ingredients.length})</span>
                  </div>
                  <div className="space-y-1.5 bg-(--bg-primary)/50 p-2 rounded-lg">
                    {recipe.ingredients.slice(0, 3).map((ing, i) => {
                      const prod = products.find(p => p.localId === ing.productId);
                      const stock = getIngredientStock(ing.productId);
                      const needed = ing.quantity;
                      const hasEnough = stock >= needed;
                      return (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-(--text-secondary) truncate">{prod?.name || 'Producto'}</span>
                          <div className="flex items-center gap-1.5">
                            <span className={hasEnough ? 'text-(--text-muted)' : 'text-red-400'}>
                              {stock}/{needed}
                            </span>
                            {!hasEnough && <PackageX className="w-3 h-3 text-red-400" />}
                          </div>
                        </div>
                      );
                    })}
                    {recipe.ingredients.length > 3 && (
                      <p className="text-xs text-slate-500 text-center pt-1">
                        +{recipe.ingredients.length - 3} más
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-(--border-color)">
                  <div className="flex items-center gap-1.5 text-xs text-(--text-muted)">
                    <Package className="w-3.5 h-3.5" />
                    <span>Rinde: {recipe.yield}</span>
                  </div>
                  <Button 
                    variant={canProd ? 'primary' : 'secondary'} 
                    size="sm" 
                    onClick={() => setSelectedRecipe(recipe)}
                    disabled={!canProd}
                  >
                    <Play className="w-3.5 h-3.5 mr-1.5" />
                    Producir
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {selectedRecipe && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color)">
              <h3 className="text-lg font-semibold text-(--text-primary) flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-(--brand-400)" />
                Producir: {selectedRecipe.name}
              </h3>
              <button onClick={() => setSelectedRecipe(null)} className="p-1.5 hover:bg-(--bg-tertiary) rounded-lg transition-colors">
                <X className="w-5 h-5 text-(--text-muted)" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <Input
                label="Cantidad a producir"
                type="number"
                min={1}
                value={produceQty}
                onChange={(e) => setProduceQty(Math.max(1, Number(e.target.value)))}
              />
              
              <div className="bg-(--bg-primary)/50 p-4 rounded-xl border border-(--border-color)">
                <div className="flex items-center gap-2 text-sm text-(--text-secondary) mb-3">
                  <Package className="w-4 h-4" />
                  <span>Materiales necesarios:</span>
                </div>
                <div className="space-y-2">
                  {selectedRecipe.ingredients.map((ing, i) => {
                    const prod = products.find(p => p.localId === ing.productId);
                    const stock = getIngredientStock(ing.productId);
                    const needed = ing.quantity * produceQty;
                    const hasEnough = stock >= needed;
                    return (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-slate-300 text-sm">{prod?.name || 'Producto'}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${hasEnough ? 'text-green-400' : 'text-red-400'}`}>
                            {stock} → -{needed}
                          </span>
                          {hasEnough ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <PackageX className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-(--text-secondary)">Producción resultante:</span>
                <span className="text-green-400 font-bold">+{produceQty * selectedRecipe.yield} unidades</span>
              </div>

              <Button 
                className="w-full py-3" 
                onClick={handleProduce}
                disabled={!canProduce(selectedRecipe, produceQty)}
              >
                <Play className="w-4 h-4 mr-2" />
                Iniciar Producción
              </Button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color) sticky top-0 bg-(--bg-secondary)">
              <h3 className="text-lg font-semibold text-(--text-primary) flex items-center gap-2">
                <Plus className="w-5 h-5 text-green-400" />
                Nueva Receta
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-(--bg-tertiary) rounded-lg transition-colors">
                <X className="w-5 h-5 text-(--text-muted)" />
              </button>
            </div>
            <form className="p-6 space-y-4" onSubmit={(e) => { e.preventDefault(); handleCreateRecipe(); }}>
              <Input
                label="Nombre de la receta"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: Hamburguesa Especial"
                required
              />
              <Input
                label="Descripción"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descripción opcional"
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Producto resultado</label>
                  <select
                    value={form.productId}
                    onChange={(e) => setForm({ ...form, productId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
                  >
                    <option value="">Seleccionar producto</option>
                    {products.map((p) => (
                      <option key={p.localId} value={p.localId}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Rendimiento (unidades)"
                  type="number"
                  min={1}
                  value={form.yield}
                  onChange={(e) => setForm({ ...form, yield: Number(e.target.value) })}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-300">Ingredientes</label>
                  <Button type="button" size="sm" variant="secondary" onClick={addIngredient}>
                    <Plus className="w-3 h-3 mr-1" /> Agregar
                  </Button>
                </div>
                <div className="space-y-2">
                  {form.ingredients.map((ing, i) => (
                    <div key={i} className="flex gap-2 items-center">
                        <select
                          value={ing.productId}
                          onChange={(e) => {
                            const newIngs = [...form.ingredients];
                            newIngs[i].productId = e.target.value;
                            setForm({ ...form, ingredients: newIngs });
                          }}
                          className="flex-1 px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
                        >
                          <option value="">Producto</option>
                          {products.map((p) => (
                            <option key={p.localId} value={p.localId}>{p.name}</option>
                          ))}
                        </select>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={ing.quantity}
                        onChange={(e) => {
                          const newIngs = [...form.ingredients];
                          newIngs[i].quantity = Number(e.target.value);
                          setForm({ ...form, ingredients: newIngs });
                        }}
                        className="w-24"
                        placeholder="Cant"
                      />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, ingredients: form.ingredients.filter((_, idx) => idx !== i) })}
                        className="p-2 text-red-400 hover:bg-(--bg-tertiary) rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-(--border-color)">
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
