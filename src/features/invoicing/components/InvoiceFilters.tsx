import { useState } from "react";
import { Search, Filter, Calendar, X } from "lucide-react";

type StatusFilter = "all" | "EMITIDA" | "ANULADA";
type DocTypeFilter = "all" | "FACTURA" | "NOTA_DEBITO" | "NOTA_CREDITO";

interface DateRange {
  desde?: Date;
  hasta?: Date;
}

interface InvoiceFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  docTypeFilter: DocTypeFilter;
  onDocTypeFilterChange: (value: DocTypeFilter) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onClearFilters: () => void;
}

export default function InvoiceFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  docTypeFilter,
  onDocTypeFilterChange,
  dateRange,
  onDateRangeChange,
  onClearFilters,
}: InvoiceFiltersProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const hasFilters = searchQuery || statusFilter !== "all" || docTypeFilter !== "all" || dateRange.desde || dateRange.hasta;

  return (
    <div className="bg-(--bg-secondary) border border-(--border-color) rounded-xl p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por número, cliente o RIF..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
              className="px-3 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
            >
              <option value="all">Todos</option>
              <option value="EMITIDA">Emitidas</option>
              <option value="ANULADA">Anuladas</option>
            </select>
          </div>
          
          <select
            value={docTypeFilter}
            onChange={(e) => onDocTypeFilterChange(e.target.value as DocTypeFilter)}
            className="px-3 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
          >
            <option value="all">Todos los tipos</option>
            <option value="FACTURA">Facturas</option>
            <option value="NOTA_DEBITO">Notas Débito</option>
            <option value="NOTA_CREDITO">Notas Crédito</option>
          </select>

          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors ${
              dateRange.desde || dateRange.hasta
                ? "bg-(--brand-500)/10 border-(--brand-500)/50 text-(--brand-400)"
                : "bg-(--bg-tertiary) border-(--border-color) text-slate-400"
            }`}
          >
            <Calendar className="w-4 h-4" />
            {(dateRange.desde || dateRange.hasta) ? "Fecha activa" : "Fecha"}
          </button>

          {hasFilters && (
            <button
              onClick={onClearFilters}
              className="px-3 py-2.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {showDatePicker && (
        <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
          <div className="flex items-end gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Desde</label>
              <input
                type="date"
                value={dateRange.desde ? dateRange.desde.toISOString().split("T")[0] : ""}
                onChange={(e) => onDateRangeChange({ ...dateRange, desde: e.target.value ? new Date(e.target.value) : undefined })}
                className="px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Hasta</label>
              <input
                type="date"
                value={dateRange.hasta ? dateRange.hasta.toISOString().split("T")[0] : ""}
                onChange={(e) => onDateRangeChange({ ...dateRange, hasta: e.target.value ? new Date(e.target.value) : undefined })}
                className="px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm"
              />
            </div>
            <button
              onClick={() => setShowDatePicker(false)}
              className="px-4 py-2 bg-(--brand-500) hover:bg-(--brand-400) text-white rounded-lg text-sm transition-colors"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
