import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import type { SortField } from "@/features/recipes/types/recipes.types";

type FilterStatus = "all" | "active" | "inactive";

interface RecipeFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  filterStatus: FilterStatus;
  onFilterStatusChange: (value: FilterStatus) => void;
  sort: { field: SortField; direction: "asc" | "desc" };
  onSortChange: (field: SortField) => void;
}

function SortIcon({ field, sort, onSortChange }: { field: SortField; sort: { field: SortField; direction: "asc" | "desc" }; onSortChange: (field: SortField) => void }) {
  return (
    <button
      onClick={() => onSortChange(field)}
      title={`Ordenar por ${field === "name" ? "nombre" : field === "createdAt" ? "fecha" : "rendimiento"}`}
      className={`flex items-center px-3 py-1.5 rounded-lg text-xs transition-colors ${
        sort.field === field
          ? "bg-(--brand-600) text-white"
          : "bg-(--bg-tertiary) text-(--text-secondary) hover:bg-(--bg-secondary)"
      }`}
    >
      {field === "name" ? "Nombre" : field === "createdAt" ? "Fecha" : "Rinde"}
      {sort.field !== field ? (
        <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-30" />
      ) : sort.direction === "asc" ? (
        <ArrowUp className="w-3 h-3 ml-1 inline text-(--brand-400)" />
      ) : (
        <ArrowDown className="w-3 h-3 ml-1 inline text-(--brand-400)" />
      )}
    </button>
  );
}

export default function RecipeFilters({
  search,
  onSearchChange,
  filterStatus,
  onFilterStatusChange,
  sort,
  onSortChange,
}: RecipeFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-(--text-muted)" />
        <input
          type="text"
          placeholder="Buscar recetas..."
          title="Buscar recetas por nombre"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
        />
      </div>
      <select
        value={filterStatus}
        onChange={(e) => onFilterStatusChange(e.target.value as FilterStatus)}
        title="Filtrar por estado"
        className="px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-(--brand-500) cursor-pointer"
      >
        <option value="all">Todas</option>
        <option value="active">Activas</option>
        <option value="inactive">Inactivas</option>
      </select>
      <div className="flex gap-1">
        <SortIcon field="name" sort={sort} onSortChange={onSortChange} />
        <SortIcon field="createdAt" sort={sort} onSortChange={onSortChange} />
        <SortIcon field="yield" sort={sort} onSortChange={onSortChange} />
      </div>
    </div>
  );
}
