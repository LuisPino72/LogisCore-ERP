import { useState, useEffect, useCallback, useMemo } from "react";
import { useTenantStore } from "@/store/useTenantStore";
import { useToast } from "@/providers/ToastProvider";
import { filterRecipes, getProductionHistory, createRecipe, updateRecipe, deleteRecipe, produce } from "@/features/recipes/services/recipes.service";
import { isOk } from "@/lib/types/result";
import Button from "@/common/Button";
import { ConfirmationModal } from "@/common/ConfirmationModal";
import { ChefHat, Plus, History } from "lucide-react";
import type { SortField } from "@/features/recipes/types/recipes.types";
import type { Recipe, Product, ProductionLog } from "@/lib/db";
import { db } from "@/lib/db";
import RecipeFilters from "./RecipeFilters";
import RecipeGrid from "./RecipeGrid";
import RecipePagination from "./RecipePagination";
import ProduceModal from "./ProduceModal";
import ProductionHistoryModal from "./ProductionHistoryModal";
import RecipeFormModal from "./RecipeFormModal";
import type { RecipeForm } from "./RecipeFormModal";

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
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; localId: string | null }>({ isOpen: false, localId: null });
  const { showSuccess } = useToast();
  const tenant = useTenantStore((state) => state.currentTenant);

  const loadData = useCallback(async () => {
    if (!tenant?.slug) return;
    const prods = await db.products.where("tenantId").equals(tenant.slug).toArray();
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

  const handleSort = useCallback((field: SortField) => {
    setSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === "desc" ? "asc" : "desc",
    }));
    setCurrentPage(1);
  }, []);

  const handleCreateRecipe = useCallback(async (form: RecipeForm) => {
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
    loadRecipes();
  }, [showSuccess, loadRecipes]);

  const handleUpdateRecipe = useCallback(async (form: RecipeForm) => {
    if (!editingRecipe) return;

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
    loadRecipes();
  }, [editingRecipe, showSuccess, loadRecipes]);

  const handleDeleteRecipe = useCallback((localId: string) => {
    setConfirmDelete({ isOpen: true, localId });
  }, []);

  const confirmDeleteRecipe = useCallback(async () => {
    if (!confirmDelete.localId) return;
    const result = await deleteRecipe(confirmDelete.localId);
    if (isOk(result)) {
      showSuccess("Receta eliminada");
      loadRecipes();
    }
    setConfirmDelete({ isOpen: false, localId: null });
  }, [confirmDelete.localId, showSuccess, loadRecipes]);

  const handleProduce = useCallback(async (quantity: number) => {
    if (!selectedRecipe) return;

    const result = await produce(selectedRecipe.localId, quantity);

    if (!isOk(result)) {
      return;
    }

    showSuccess(
      `Producción completada: ${quantity} unidades de ${selectedRecipe.name}`
    );
    setSelectedRecipe(null);
    loadRecipes();
    loadData();
  }, [selectedRecipe, showSuccess, loadRecipes, loadData]);

  const openEditModal = useCallback((recipe: Recipe) => {
    setEditingRecipe(recipe);
    setShowModal(true);
  }, []);

  const openCreateModal = useCallback(() => {
    setEditingRecipe(null);
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingRecipe(null);
  }, []);

  const openHistory = useCallback(() => {
    loadHistory();
    setShowHistoryModal(true);
  }, [loadHistory]);

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
          <Button variant="secondary" onClick={openHistory} title="Ver historial de producción">
            <History className="w-4 h-4 mr-2" />
            Historial
          </Button>
          <Button onClick={openCreateModal} title="Crear nueva receta">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Receta
          </Button>
        </div>
      </div>

      <RecipeFilters
        search={search}
        onSearchChange={(value) => { setSearch(value); setCurrentPage(1); }}
        filterStatus={filterStatus}
        onFilterStatusChange={(value) => { setFilterStatus(value); setCurrentPage(1); }}
        sort={sort}
        onSortChange={handleSort}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <RecipeGrid
          recipes={recipes}
          products={products}
          onEdit={openEditModal}
          onDelete={handleDeleteRecipe}
          onProduce={setSelectedRecipe}
        />
      </div>

      <RecipePagination
        currentPage={currentPage}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
      />

      {selectedRecipe && (
        <ProduceModal
          recipe={selectedRecipe}
          products={products}
          onClose={() => setSelectedRecipe(null)}
          onProduce={handleProduce}
        />
      )}

      <ProductionHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        productionLogs={productionLogs}
        recipes={recipes}
      />

      <RecipeFormModal
        isOpen={showModal}
        editingRecipe={editingRecipe}
        products={products}
        onClose={closeModal}
        onCreate={handleCreateRecipe}
        onUpdate={handleUpdateRecipe}
      />

      <ConfirmationModal
        isOpen={confirmDelete.isOpen}
        message="¿Estás seguro de eliminar esta receta? Esta acción no se puede deshacer."
        title="Eliminar Receta"
        confirmText="Eliminar"
        onConfirm={confirmDeleteRecipe}
        onCancel={() => setConfirmDelete({ isOpen: false, localId: null })}
      />
    </div>
  );
}
