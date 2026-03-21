import { Search, Filter } from 'lucide-react'
import type { Category } from '@/lib/db'
import type { StockFilter, StatusFilter } from '../types/inventory.types'

interface ProductFiltersProps {
  categories: Category[]
  search: string
  selectedCategory: string | number
  stockFilter: StockFilter
  statusFilter: StatusFilter
  priceRange: { min: string; max: string }
  showFilters: boolean
  hasActiveFilters: boolean
  onSearchChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onStockFilterChange: (value: StockFilter) => void
  onStatusFilterChange: (value: StatusFilter) => void
  onPriceRangeChange: (range: { min: string; max: string }) => void
  onToggleFilters: () => void
}

export default function ProductFilters({
  categories,
  search,
  selectedCategory,
  stockFilter,
  statusFilter,
  priceRange,
  showFilters,
  hasActiveFilters,
  onSearchChange,
  onCategoryChange,
  onStockFilterChange,
  onStatusFilterChange,
  onPriceRangeChange,
  onToggleFilters,
}: ProductFiltersProps) {
  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o SKU..."
            title="Busca productos por nombre o código SKU"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500) transition-all font-sans"
          />
        </div>
        <button
          onClick={onToggleFilters}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${hasActiveFilters ? 'bg-(--brand-500)/10 border-(--brand-500)/50 text-(--brand-400)' : 'bg-(--bg-tertiary) border-(--border-color) text-(--text-secondary) hover:text-(--text-primary)'}`}
        >
          <Filter className="w-4 h-4" />
          Filtros
          {hasActiveFilters && <span className="w-2 h-2 bg-(--brand-400) rounded-full" />}
        </button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-950/50 rounded-xl border border-slate-800">
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" title="Filtra productos por categoría">Categoría</label>
            <select 
              className="w-full px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
            >
              <option value="">Todas</option>
              {categories.map(cat => (
                <option key={cat.localId} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" title="Filtra productos según nivel de stock">Stock</label>
            <select 
              className="w-full px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
              value={stockFilter}
              onChange={(e) => onStockFilterChange(e.target.value as StockFilter)}
            >
              <option value="all">Todos</option>
              <option value="in_stock">En Stock (&gt;10)</option>
              <option value="low_stock">Stock Bajo (1-10)</option>
              <option value="out_of_stock">Sin Stock</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" title="Filtra por estado del producto">Estado</label>
            <select 
              className="w-full px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" title="Filtra productos dentro de un rango de precio">Rango Precio</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={priceRange.min}
                onChange={(e) => onPriceRangeChange({ ...priceRange, min: e.target.value })}
                className="w-full px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
              />
              <input
                type="number"
                placeholder="Max"
                value={priceRange.max}
                onChange={(e) => onPriceRangeChange({ ...priceRange, max: e.target.value })}
                className="w-full px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
