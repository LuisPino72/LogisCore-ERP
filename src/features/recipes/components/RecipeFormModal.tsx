import { useState, useCallback } from "react";
import Button from "@/common/Button";
import Input from "@/common/Input";
import { Plus, X } from "lucide-react";
import type { Recipe, Product } from "@/lib/db";

type RecipeForm = {
  name: string;
  description: string;
  productId: string;
  ingredients: { productId: string; quantity: number; unit: string }[];
  yield: number;
  isActive: boolean;
};

interface RecipeFormModalProps {
  isOpen: boolean;
  editingRecipe: Recipe | null;
  products: Product[];
  onClose: () => void;
  onCreate: (form: RecipeForm) => void;
  onUpdate: (form: RecipeForm) => void;
}

export default function RecipeFormModal({
  isOpen,
  editingRecipe,
  products,
  onClose,
  onCreate,
  onUpdate,
}: RecipeFormModalProps) {
  const [form, setForm] = useState<RecipeForm>({
    name: editingRecipe?.name || "",
    description: editingRecipe?.description || "",
    productId: editingRecipe?.productId || "",
    ingredients: editingRecipe?.ingredients || [],
    yield: editingRecipe?.yield || 1,
    isActive: editingRecipe?.isActive ?? true,
  });

  const addIngredient = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { productId: "", quantity: 0, unit: "kg" }],
    }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRecipe) {
      onUpdate(form);
    } else {
      onCreate(form);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color) sticky top-0 bg-(--bg-secondary)">
          <h3 className="text-lg font-semibold text-(--text-primary) flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-400" />
            {editingRecipe ? "Editar Receta" : "Nueva Receta"}
          </h3>
          <button onClick={onClose} title="Cerrar" aria-label="Cerrar" className="p-1.5 hover:bg-(--bg-tertiary) rounded-lg transition-colors">
            <X className="w-5 h-5 text-(--text-muted)" />
          </button>
        </div>
        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
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
                className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
              >
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
                    className="flex-1 px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
                  >
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
                    aria-label="Eliminar ingrediente"
                    className="p-2 text-red-400 hover:bg-(--bg-tertiary) rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-(--border-color)">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">{editingRecipe ? "Guardar Cambios" : "Crear Receta"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export type { RecipeForm };
