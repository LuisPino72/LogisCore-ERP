import { CATEGORIES } from './constants';

interface MovementFiltersProps {
  type: string;
  category: string;
  search: string;
  onTypeChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSearchChange: (value: string) => void;
}

export default function MovementFilters({
  type,
  category,
  search,
  onTypeChange,
  onCategoryChange,
  onSearchChange,
}: MovementFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <select
        value={type}
        onChange={(e) => onTypeChange(e.target.value)}
        title="Filtrar por tipo de movimiento"
        className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
      >
        <option value="all">Todos los tipos</option>
        <option value="income">Ingreso</option>
        <option value="expense">Gasto</option>
        <option value="transfer">Transferencia</option>
      </select>

      <select
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
        title="Filtrar por categoría"
        className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
      >
        <option value="all">Todas las categorías</option>
        {CATEGORIES.map((cat) => (
          <option key={cat.value} value={cat.value}>{cat.label}</option>
        ))}
      </select>

      <input
        type="text"
        placeholder="Buscar..."
        title="Buscar movimientos"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="px-3 py-2 border border-slate-200 rounded-lg text-sm flex-1 min-w-[200px]"
      />
    </div>
  );
}
