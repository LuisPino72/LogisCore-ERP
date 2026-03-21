import { ChefHat } from "lucide-react";
import RecipeCard from "./RecipeCard";
import type { Recipe, Product } from "@/lib/db";

interface RecipeGridProps {
  recipes: Recipe[];
  products: Product[];
  onEdit: (recipe: Recipe) => void;
  onDelete: (localId: string) => void;
  onProduce: (recipe: Recipe) => void;
}

export default function RecipeGrid({ recipes, products, onEdit, onDelete, onProduce }: RecipeGridProps) {
  if (recipes.length === 0) {
    return (
      <div className="col-span-full py-12 text-center text-slate-500">
        <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No hay recetas</p>
      </div>
    );
  }

  return (
    <>
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.localId}
          recipe={recipe}
          products={products}
          onEdit={onEdit}
          onDelete={onDelete}
          onProduce={onProduce}
        />
      ))}
    </>
  );
}
