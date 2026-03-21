import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { SortField } from '../types/employees.types'

interface EmployeeFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  sort: { field: SortField; direction: 'asc' | 'desc' }
  onSortChange: (field: SortField) => void
}

function SortIcon({ field, sort, onSortChange }: { field: SortField; sort: { field: SortField; direction: 'asc' | 'desc' }; onSortChange: (field: SortField) => void }) {
  return (
    <button
      onClick={() => onSortChange(field)}
      title={`Ordenar por ${field === 'userId' ? 'email' : field === 'role' ? 'rol' : 'fecha'}`}
      className={`flex items-center px-3 py-1.5 rounded-lg text-xs transition-colors ${
        sort.field === field
          ? 'bg-(--brand-600) text-white'
          : 'bg-(--bg-tertiary) text-(--text-secondary) hover:bg-(--bg-secondary)'
      }`}
    >
      {field === 'userId' ? 'Email' : field === 'role' ? 'Rol' : 'Fecha'}
      {sort.field !== field ? (
        <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-30" />
      ) : sort.direction === 'asc' ? (
        <ArrowUp className="w-3 h-3 ml-1 inline text-(--brand-400)" />
      ) : (
        <ArrowDown className="w-3 h-3 ml-1 inline text-(--brand-400)" />
      )}
    </button>
  )
}

export default function EmployeeFilters({ searchQuery, onSearchChange, sort, onSortChange }: EmployeeFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted)" />
        <input
          type="text"
          placeholder="Buscar empleados..."
          title="Buscar por email de empleado"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
        />
      </div>
      <div className="flex gap-1">
        <SortIcon field="userId" sort={sort} onSortChange={onSortChange} />
        <SortIcon field="role" sort={sort} onSortChange={onSortChange} />
        <SortIcon field="createdAt" sort={sort} onSortChange={onSortChange} />
      </div>
    </div>
  )
}
