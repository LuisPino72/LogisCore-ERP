import { useState, useCallback } from "react";
import Card from "@/common/Card";
import Button from "@/common/Button";
import { ChefHat, Edit2, Trash2, Scale, Package, Eye, EyeOff, Play, PackageX } from "lucide-react";
import type { Recipe, Product } from "@/lib/db";

interface RecipeCardProps {
  recipe: Recipe;
  products: Product[];
  onEdit: (recipe: Recipe) => void;
  onDelete: (localId: string) => void;
  onProduce: (recipe: Recipe) => void;
}

export default function RecipeCard({ recipe, products, onEdit, onDelete, onProduce }: RecipeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const getRecipeName = (productId: string) => {
    return products.find((p) => p.localId === productId)?.name || "Sin producto";
  };

  const getIngredientStock = (productId: string) => {
    const product = products.find((p) => p.localId === productId);
    return product?.stock || 0;
  };

  const canProduce = (qty: number) => {
    return recipe.ingredients.every((ing) => {
      const stock = getIngredientStock(ing.productId);
      const needed = (ing.quantity * qty) / recipe.yield;
      return stock >= needed;
    });
  };

  return (
    <Card className="hover:border-(--brand-500) transition-all">
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
          }`}
        >
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
          onClick={toggleExpanded}
          title={isExpanded ? "Ocultar ingredientes" : "Ver ingredientes"}
          className="flex items-center gap-2 text-xs text-(--text-muted) mb-2 hover:text-(--text-secondary)"
        >
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
            onClick={() => onEdit(recipe)}
            title="Editar receta"
            aria-label="Editar receta"
            className="p-1.5 hover:bg-(--bg-tertiary) rounded-lg text-(--text-muted) hover:text-(--text-primary)"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(recipe.localId)}
            title="Eliminar receta"
            aria-label="Eliminar receta"
            className="p-1.5 hover:bg-red-500/20 rounded-lg text-(--text-muted) hover:text-red-400"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <Button
            variant={canProduce(1) ? "primary" : "secondary"}
            size="sm"
            onClick={() => onProduce(recipe)}
            disabled={!canProduce(1)}
            title={canProduce(1) ? "Iniciar producción" : "Sin stock suficiente"}
          >
            <Play className="w-3.5 h-3.5 mr-1" />
            Producir
          </Button>
        </div>
      </div>
    </Card>
  );
}
