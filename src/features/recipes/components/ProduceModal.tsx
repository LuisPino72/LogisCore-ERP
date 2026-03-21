import { useState, useCallback } from "react";
import Button from "@/common/Button";
import Input from "@/common/Input";
import { ChefHat, X, Package, Check, PackageX, Play } from "lucide-react";
import type { Recipe, Product } from "@/lib/db";

interface ProduceModalProps {
  recipe: Recipe;
  products: Product[];
  onClose: () => void;
  onProduce: (quantity: number) => void;
}

export default function ProduceModal({ recipe, products, onClose, onProduce }: ProduceModalProps) {
  const [produceQty, setProduceQty] = useState(1);

  const getRecipeName = (productId: string) => {
    return products.find((p) => p.localId === productId)?.name || "Sin producto";
  };

  const getIngredientStock = (productId: string) => {
    const product = products.find((p) => p.localId === productId);
    return product?.stock || 0;
  };

  const canProduce = useCallback((qty: number) => {
    return recipe.ingredients.every((ing) => {
      const stock = getIngredientStock(ing.productId);
      const needed = (ing.quantity * qty) / recipe.yield;
      return stock >= needed;
    });
  }, [recipe, products]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color)">
          <h3 className="text-lg font-semibold text-(--text-primary) flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-(--brand-400)" />
            Producir: {recipe.name}
          </h3>
          <button onClick={onClose} title="Cerrar" aria-label="Cerrar" className="p-1.5 hover:bg-(--bg-tertiary) rounded-lg transition-colors">
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
              {recipe.ingredients.map((ing, i) => {
                const stock = getIngredientStock(ing.productId);
                const needed = (ing.quantity * produceQty) / recipe.yield;
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
              +{produceQty * recipe.yield} unidades
            </span>
          </div>

          <Button
            className="w-full py-3"
            onClick={() => onProduce(produceQty)}
            disabled={!canProduce(produceQty)}
          >
            <Play className="w-4 h-4 mr-2" />
            Iniciar Producción
          </Button>
        </div>
      </div>
    </div>
  );
}
