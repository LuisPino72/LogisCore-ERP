import { useState, useEffect, useCallback, useMemo } from "react";
import { Product, Recipe, ProductionLog, db } from "../../../lib/db";
import { useTenantStore } from "../../../store/useTenantStore";
import { useToast } from "../../../providers/ToastProvider";
import { filterRecipes, getProductionHistory, createRecipe, updateRecipe, deleteRecipe, produce } from "../services/recipes.service";
import { isOk } from "@/lib/types/result";
import Card from "../../../common/Card";
import Button from "../../../common/Button";
import Input from "../../../common/Input";
import {
  ChefHat,
  Plus,
  Play,
  X,
  Search,
  Package,
  Scale,
  PackageX,
  Check,
  Edit2,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  History,
  Eye,
  EyeOff,
} from "lucide-react";
import type { SortField } from "../types/recipes.types";

type FilterStatus = "all" | "active" | "inactive";

type RecipeForm = {
  name: string;
  description: string;
  productId: string;
  ingredients: { productId: string; quantity: number; unit: string }[];
  yield: number;
  isActive: boolean;
};

const PAGE_SIZE = 12;

export default function Recipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [sort, setSort] = useState<{ field: SortField; direction: "asc" | "desc" }>({ field: "name", direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [expandedRecipes, setExpandedRecipes] = useState<Set<string>>(new Set());
  const { showSuccess } = useToast();
  const tenant = useTenantStore((state) => state.currentTenant);

  const [form, setForm] = useState<RecipeForm>({
    name: "",
    description: "",
    productId: "",
    ingredients: [],
    yield: 1,
    isActive: true,
  });

  const [produceQty, setProduceQty] = useState(1);

  const loadData = useCallback(async () => {
    if (!tenant?.slug) return;
    const [prods] = await Promise.all([
      db.products.where("tenantId").equals(tenant.slug).toArray(),
    ]);
    setProducts(prods);
  }, [tenant?.slug]);

  const loadRecipes = useCallback(async () => {
    if (!tenant?.slug) return;
    const result = await filterRecipes({
      search,
      status: filterStatus,
      sort,
      page: currentPage,
      pageSize: PAGE_SIZE,
    });
    setRecipes(result.recipes);
    setTotal(result.total);
  }, [tenant?.slug, search, filterStatus, sort, currentPage]);

  const loadHistory = useCallback(async () => {
    const logs = await getProductionHistory();
    setProductionLogs(logs);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const totalPages = useMemo(() => Math.ceil(total / PAGE_SIZE), [total]);

  const getIngredientStock = useCallback(
    (productId: string) => {
      const product = products.find((p) => p.localId === productId);
      return product?.stock || 0;
    },
    [products]
  );

  const canProduce = useCallback(
    (recipe: Recipe, qty: number) => {
      return recipe.ingredients.every((ing) => {
        const stock = getIngredientStock(ing.productId);
        const needed = (ing.quantity * qty) / recipe.yield;
        return stock >= needed;
      });
    },
    [getIngredientStock]
  );

  const handleSort = useCallback(
    (field: SortField) => {
      setSort((prev) => ({
        field,
        direction: prev.field === field && prev.direction === "desc" ? "asc" : "desc",
      }));
      setCurrentPage(1);
    },
    []
  );

  const handleCreateRecipe = useCallback(async () => {
    if (!form.name || !form.productId) return;

    const result = await createRecipe({
      name: form.name,
      description: form.description || undefined,
      productId: form.productId,
      ingredients: form.ingredients,
      yield: form.yield,
      isActive: form.isActive,
    });

    if (!isOk(result)) {
      return;
    }

    showSuccess("Receta creada correctamente");
    setShowModal(false);
    setForm({
      name: "",
      description: "",
      productId: "",
      ingredients: [],
      yield: 1,
      isActive: true,
    });
    loadRecipes();
  }, [form, showSuccess, loadRecipes]);

  const handleUpdateRecipe = useCallback(async () => {
    if (!editingRecipe || !form.name || !form.productId) return;

    const result = await updateRecipe(editingRecipe.localId, {
      name: form.name,
      description: form.description || undefined,
      productId: form.productId,
      ingredients: form.ingredients,
      yield: form.yield,
      isActive: form.isActive,
    });

    if (!isOk(result)) {
      return;
    }

    showSuccess("Receta actualizada correctamente");
    setShowModal(false);
    setEditingRecipe(null);
    setForm({
      name: "",
      description: "",
      productId: "",
      ingredients: [],
      yield: 1,
      isActive: true,
    });
    loadRecipes();
  }, [editingRecipe, form, showSuccess, loadRecipes]);

  const handleDeleteRecipe = useCallback(
    async (localId: string) => {
      const confirmed = window.confirm("¿Estás seguro de eliminar esta receta?");
      if (confirmed) {
        const result = await deleteRecipe(localId);
        if (!isOk(result)) {
          return;
        }
        showSuccess("Receta eliminada");
        loadRecipes();
      }
    },
    [showSuccess, loadRecipes]
  );

  const handleProduce = useCallback(async () => {
    if (!selectedRecipe) return;

    const result = await produce(selectedRecipe.localId, produceQty);

    if (!isOk(result)) {
      return;
    }

    showSuccess(
      `Producción completada: ${produceQty} unidades de ${selectedRecipe.name}`
    );
    setSelectedRecipe(null);
    setProduceQty(1);
    loadRecipes();
    loadData();
  }, [selectedRecipe, produceQty, showSuccess, loadRecipes, loadData]);

  const addIngredient = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { productId: "", quantity: 0, unit: "kg" }],
    }));
  }, []);

  const openEditModal = useCallback((recipe: Recipe) => {
    setEditingRecipe(recipe);
    setForm({
      name: recipe.name,
      description: recipe.description || "",
      productId: recipe.productId,
      ingredients: recipe.ingredients,
      yield: recipe.yield,
      isActive: recipe.isActive,
    });
    setShowModal(true);
  }, []);

  const toggleRecipeExpanded = useCallback((localId: string) => {
    setExpandedRecipes((prev) => {
      const next = new Set(prev);
      if (next.has(localId)) {
        next.delete(localId);
      } else {
        next.add(localId);
      }
      return next;
    });
  }, []);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sort.field !== field)
      return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-30" />;
    return sort.direction === "asc" ? (
      <ArrowUp className="w-3 h-3 ml-1 inline text-(--brand-400)" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 inline text-(--brand-400)" />
    );
  };

  const getRecipeName = (productId: string) => {
    return products.find((p) => p.localId === productId)?.name || "Sin producto";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2" title="Gestionar recetas de producción">
            <ChefHat className="w-6 h-6" />
            Recetas
          </h2>
          <p className="text-(--text-secondary)">{total} recetas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { loadHistory(); setShowHistoryModal(true); }} title="Ver historial de producción">
            <History className="w-4 h-4 mr-2" />
            Historial
          </Button>
          <Button
            onClick={() => {
              setEditingRecipe(null);
              setForm({
                name: "",
                description: "",
                productId: "",
                ingredients: [],
                yield: 1,
                isActive: true,
              });
              setShowModal(true);
            }}
            title="Crear nueva receta">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Receta
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-(--text-muted)" />
          <input
            type="text"
            placeholder="Buscar recetas..."
            title="Buscar recetas por nombre"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value as FilterStatus); setCurrentPage(1); }}
          title="Filtrar por estado"
          className="px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-(--brand-500) cursor-pointer">
          <option value="all">Todas</option>
          <option value="active">Activas</option>
          <option value="inactive">Inactivas</option>
        </select>
        <div className="flex gap-1">
          <button onClick={() => handleSort("name")} title="Ordenar por nombre" className={`flex items-center px-3 py-1.5 rounded-lg text-xs transition-colors ${sort.field === "name" ? "bg-(--brand-600) text-white" : "bg-(--bg-tertiary) text-(--text-secondary) hover:bg-(--bg-secondary)"}`}>
            Nombre <SortIcon field="name" />
          </button>
          <button onClick={() => handleSort("createdAt")} title="Ordenar por fecha" className={`flex items-center px-3 py-1.5 rounded-lg text-xs transition-colors ${sort.field === "createdAt" ? "bg-(--brand-600) text-white" : "bg-(--bg-tertiary) text-(--text-secondary) hover:bg-(--bg-secondary)"}`}>
            Fecha <SortIcon field="createdAt" />
          </button>
          <button onClick={() => handleSort("yield")} title="Ordenar por rendimiento" className={`flex items-center px-3 py-1.5 rounded-lg text-xs transition-colors ${sort.field === "yield" ? "bg-(--brand-600) text-white" : "bg-(--bg-tertiary) text-(--text-secondary) hover:bg-(--bg-secondary)"}`}>
            Rinde <SortIcon field="yield" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recipes.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">
            <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No hay recetas</p>
          </div>
        ) : (
          recipes.map((recipe) => {
            const canProd = canProduce(recipe, 1);
            const isExpanded = expandedRecipes.has(recipe.localId);
            return (
              <Card key={recipe.localId} className="hover:border-(--brand-500) transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-(--bg-tertiary) rounded-xl flex items-center justify-center">
                      <ChefHat className="w-6 h-6 text-(--text-muted)" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-(--text-primary)">
                        {recipe.name}
                      </h3>
                      <p className="text-xs text-(--text-muted)">
                        {getRecipeName(recipe.productId)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      recipe.isActive
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : "bg-slate-700 text-slate-400 border border-slate-600"
                    }`}>
                    {recipe.isActive ? "Activa" : "Inactiva"}
                  </span>
                </div>

                {recipe.description && (
                  <p className="text-sm text-(--text-secondary) mb-4 line-clamp-2">
                    {recipe.description}
                  </p>
                )}

                <div className="mb-4">
                  <button
                    onClick={() => toggleRecipeExpanded(recipe.localId)}
                    title={isExpanded ? "Ocultar ingredientes" : "Ver ingredientes"}
                    className="flex items-center gap-2 text-xs text-(--text-muted) mb-2 hover:text-(--text-secondary)">
                    <Scale className="w-3.5 h-3.5" />
                    <span>Ingredientes ({recipe.ingredients.length})</span>
                    {isExpanded ? <EyeOff className="w-3 h-3 ml-1" /> : <Eye className="w-3 h-3 ml-1" />}
                  </button>
                  {isExpanded && (
                    <div className="space-y-1.5 bg-(--bg-primary)/50 p-2 rounded-lg">
                      {recipe.ingredients.map((ing, i) => {
                        const stock = getIngredientStock(ing.productId);
                        const needed = ing.quantity;
                        const hasEnough = stock >= needed;
                        return (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-(--text-secondary) truncate">
                              {getRecipeName(ing.productId)}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className={hasEnough ? "text-(--text-muted)" : "text-red-400"}>
                                {stock}/{needed}
                              </span>
                              {!hasEnough && <PackageX className="w-3 h-3 text-red-400" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-(--border-color)">
                  <div className="flex items-center gap-1.5 text-xs text-(--text-muted)">
                    <Package className="w-3.5 h-3.5" />
                    <span>Rinde: {recipe.yield}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(recipe)}
                      title="Editar receta"
                      className="p-1.5 hover:bg-(--bg-tertiary) rounded-lg text-(--text-muted) hover:text-(--text-primary)">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteRecipe(recipe.localId)}
                      title="Eliminar receta"
                      className="p-1.5 hover:bg-red-500/20 rounded-lg text-(--text-muted) hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <Button
                      variant={canProd ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => setSelectedRecipe(recipe)}
                      disabled={!canProd}
                      title={canProd ? "Iniciar producción" : "Sin stock suficiente"}>
                      <Play className="w-3.5 h-3.5 mr-1" />
                      Producir
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-(--border-color)">
          <span className="text-sm text-(--text-muted)">
            Mostrando {((currentPage - 1) * PAGE_SIZE) + 1} - {Math.min(currentPage * PAGE_SIZE, total)} de {total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              title="Página anterior"
              className="p-2 rounded-lg hover:bg-(--bg-tertiary) disabled:opacity-50 disabled:cursor-not-allowed">
              <ChevronLeft className="w-5 h-5 text-(--text-secondary)" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    currentPage === pageNum
                      ? "bg-(--brand-600) text-white"
                      : "hover:bg-(--bg-tertiary) text-(--text-secondary)"
                  }`}>
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              title="Página siguiente"
              className="p-2 rounded-lg hover:bg-(--bg-tertiary) disabled:opacity-50 disabled:cursor-not-allowed">
              <ChevronRight className="w-5 h-5 text-(--text-secondary)" />
            </button>
          </div>
        </div>
      )}

      {selectedRecipe && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color)">
              <h3 className="text-lg font-semibold text-(--text-primary) flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-(--brand-400)" />
                Producir: {selectedRecipe.name}
              </h3>
              <button onClick={() => setSelectedRecipe(null)} title="Cerrar" className="p-1.5 hover:bg-(--bg-tertiary) rounded-lg transition-colors">
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
                    const stock = getIngredientStock(ing.productId);
                    const needed = (ing.quantity * produceQty) / selectedRecipe.yield;
                    const hasEnough = stock >= needed;
                    return (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-slate-300 text-sm">
                          {getRecipeName(ing.productId)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${hasEnough ? "text-green-400" : "text-red-400"}`}>
                            {stock} → -{needed}
                          </span>
                          {hasEnough ? <Check className="w-4 h-4 text-green-400" /> : <PackageX className="w-4 h-4 text-red-400" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-(--text-secondary)">Producción resultante:</span>
                <span className="text-green-400 font-bold">
                  +{produceQty * selectedRecipe.yield} unidades
                </span>
              </div>

              <Button
                className="w-full py-3"
                onClick={handleProduce}
                disabled={!canProduce(selectedRecipe, produceQty)}>
                <Play className="w-4 h-4 mr-2" />
                Iniciar Producción
              </Button>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl w-full max-w-2xl shadow-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color)">
              <h3 className="text-lg font-semibold text-(--text-primary) flex items-center gap-2">
                <History className="w-5 h-5 text-(--brand-400)" />
                Historial de Producción
              </h3>
              <button onClick={() => setShowHistoryModal(false)} title="Cerrar" className="p-1.5 hover:bg-(--bg-tertiary) rounded-lg transition-colors">
                <X className="w-5 h-5 text-(--text-muted)" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {productionLogs.length === 0 ? (
                <div className="text-center text-(--text-muted) py-8">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay historial de producción</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {productionLogs.map((log) => {
                    const recipe = recipes.find((r) => r.localId === log.recipeId);
                    return (
                      <div key={log.localId} className="bg-(--bg-tertiary) p-4 rounded-lg border border-(--border-color)">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-(--text-primary) font-medium">{recipe?.name || "Receta eliminada"}</span>
                          <span className="text-green-400 font-bold">+{log.quantity} unidades</span>
                        </div>
                        <p className="text-xs text-(--text-muted)">{log.createdAt.toLocaleString()}</p>
                        <div className="mt-2 text-xs text-(--text-secondary)">
                          {log.ingredientsUsed.length} ingredientes usados
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
                {editingRecipe ? "Editar Receta" : "Nueva Receta"}
              </h3>
              <button onClick={() => { setShowModal(false); setEditingRecipe(null); }} title="Cerrar" className="p-1.5 hover:bg-(--bg-tertiary) rounded-lg transition-colors">
                <X className="w-5 h-5 text-(--text-muted)" />
              </button>
            </div>
            <form className="p-6 space-y-4" onSubmit={(e) => { 
              e.preventDefault(); 
              if (editingRecipe) {
                handleUpdateRecipe();
              } else {
                handleCreateRecipe();
              }
            }}>
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
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">
                    Producto resultado
                  </label>
                  <select
                    value={form.productId}
                    onChange={(e) => setForm({ ...form, productId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-(--brand-500)">
                    <option value="">Seleccionar producto</option>
                    {products.map((p) => (
                      <option key={p.localId} value={p.localId}>
                        {p.name}
                      </option>
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
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-(--border-color) bg-(--bg-tertiary)"
                />
                <label htmlFor="isActive" className="text-sm text-(--text-secondary)">
                  Receta activa
                </label>
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
                        className="flex-1 px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-500)">
                        <option value="">Producto</option>
                        {products.map((p) => (
                          <option key={p.localId} value={p.localId}>
                            {p.name}
                          </option>
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
                        title="Eliminar ingrediente"
                        className="p-2 text-red-400 hover:bg-(--bg-tertiary) rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-(--border-color)">
                <Button type="button" variant="secondary" onClick={() => { setShowModal(false); setEditingRecipe(null); }}>
                  Cancelar
                </Button>
                <Button type="submit">{editingRecipe ? "Guardar Cambios" : "Crear Receta"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
