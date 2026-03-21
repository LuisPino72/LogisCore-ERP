import { Search, Star, Pause } from "lucide-react";
import type { Category } from "@/lib/db";
import type { SortField } from "../types/pos.types";

interface ProductFiltersProps {
  search: string;
  selectedCategory: number | string;
  sort: { field: SortField; direction: "asc" | "desc" };
  showFavoritesOnly: boolean;
  suspendedCount: number;
  categories: Category[];
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: number | string) => void;
  onSort: (field: SortField) => void;
  onToggleFavorites: () => void;
  onOpenSuspended: () => void;
}

export default function ProductFilters({
  search,
  selectedCategory,
  sort,
  showFavoritesOnly,
  suspendedCount,
  categories,
  onSearchChange,
  onCategoryChange,
  onSort,
  onToggleFavorites,
  onOpenSuspended,
}: ProductFiltersProps) {
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sort.field !== field) return <span className="w-3 h-3 ml-1 inline opacity-30">↕</span>;
    return sort.direction === "asc" ? (
      <span className="w-3 h-3 ml-1 inline text-(--brand-400)">↑</span>
    ) : (
      <span className="w-3 h-3 ml-1 inline text-(--brand-400)">↓</span>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-(--text-muted)" />
          <input
            type="text"
            placeholder="Buscar producto o escanear SKU..."
            title="Buscar productos por nombre o escanear código SKU"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          title="Filtrar productos por categoría"
          className="px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) appearance-none focus:outline-none focus:ring-2 focus:ring-(--brand-500) cursor-pointer min-w-[180px]"
        >
          <option value="">Todas las categorías</option>
          {categories.map((cat) => (
            <option key={cat.localId} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => onSort("name")}
          title="Ordenar por nombre"
          className={`flex items-center px-3 py-1.5 rounded-lg text-xs transition-colors ${
            sort.field === "name"
              ? "bg-(--brand-600) text-white"
              : "bg-(--bg-tertiary) text-(--text-secondary) hover:bg-(--bg-secondary)"
          }`}
        >
          Nombre <SortIcon field="name" />
        </button>
        <button
          onClick={() => onSort("price")}
          title="Ordenar por precio"
          className={`flex items-center px-3 py-1.5 rounded-lg text-xs transition-colors ${
            sort.field === "price"
              ? "bg-(--brand-600) text-white"
              : "bg-(--bg-tertiary) text-(--text-secondary) hover:bg-(--bg-secondary)"
          }`}
        >
          Precio <SortIcon field="price" />
        </button>
        <button
          onClick={() => onSort("stock")}
          title="Ordenar por stock"
          className={`flex items-center px-3 py-1.5 rounded-lg text-xs transition-colors ${
            sort.field === "stock"
              ? "bg-(--brand-600) text-white"
              : "bg-(--bg-tertiary) text-(--text-secondary) hover:bg-(--bg-secondary)"
          }`}
        >
          Stock <SortIcon field="stock" />
        </button>
        <div className="w-px h-6 bg-(--border-color) mx-1" />
        <button
          onClick={onToggleFavorites}
          title={showFavoritesOnly ? "Mostrar todos los productos" : "Mostrar solo favoritos"}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
            showFavoritesOnly
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              : "bg-(--bg-tertiary) text-(--text-secondary) hover:bg-(--bg-secondary)"
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${showFavoritesOnly ? "fill-current" : ""}`} />
          Favoritos
        </button>
        <div className="flex-1" />
        <button
          onClick={onOpenSuspended}
          title="Ver ventas suspendidas"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-(--bg-tertiary) text-(--text-secondary) hover:bg-(--bg-secondary) transition-colors"
        >
          <Pause className="w-3.5 h-3.5" />
          Suspendidas ({suspendedCount})
        </button>
      </div>
    </div>
  );
}
