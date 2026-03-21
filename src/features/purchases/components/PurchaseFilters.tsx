import Button from "@/common/Button";
import { Search, Calendar, Download } from "lucide-react";
import type { PurchaseStatus } from "../types/purchases.types";

const DATE_PRESETS = [
  { label: "Hoy", days: 0 },
  { label: "Esta semana", days: 7 },
  { label: "Este mes", days: 30 },
  { label: "Últimos 3 meses", days: 90 },
];

interface PurchaseFiltersProps {
  search: string;
  status: PurchaseStatus | "all";
  dateRange: { start: Date | null; end: Date | null };
  showDatePicker: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (status: PurchaseStatus | "all") => void;
  onDatePreset: (days: number) => void;
  onClearDateFilter: () => void;
  onToggleDatePicker: () => void;
  onExport: () => void;
}

export default function PurchaseFilters({
  search,
  status,
  dateRange,
  showDatePicker,
  onSearchChange,
  onStatusChange,
  onDatePreset,
  onClearDateFilter,
  onToggleDatePicker,
  onExport,
}: PurchaseFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-(--text-muted)" />
        <input
          type="text"
          placeholder="Buscar compras..."
          title="Buscar por proveedor o número de factura"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
        />
      </div>

      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value as PurchaseStatus | "all")}
        title="Filtrar por estado"
        className="px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
      >
        <option value="all">Todos los estados</option>
        <option value="completed">Completado</option>
        <option value="pending">Pendiente</option>
        <option value="cancelled">Cancelado</option>
      </select>

      <div className="relative">
        <button
          onClick={onToggleDatePicker}
          title="Filtrar por rango de fechas"
          className="flex items-center gap-2 px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) hover:bg-(--bg-secondary) transition-colors"
        >
          <Calendar className="w-4 h-4" />
          {dateRange.start || dateRange.end
            ? `${dateRange.start?.toLocaleDateString() || ""} - ${dateRange.end?.toLocaleDateString() || ""}`
            : "Filtrar por fecha"}
        </button>
        {showDatePicker && (
          <div className="absolute top-full mt-2 right-0 bg-(--bg-secondary) border border-(--border-color) rounded-lg shadow-xl z-20 p-3 min-w-[200px]">
            <div className="space-y-1">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => onDatePreset(preset.days)}
                  className="w-full text-left px-3 py-2 text-sm text-(--text-secondary) hover:bg-(--bg-tertiary) rounded-lg transition-colors"
                >
                  {preset.label}
                </button>
              ))}
              <button
                onClick={onClearDateFilter}
                className="w-full text-left px-3 py-2 text-sm text-(--text-secondary) hover:bg-(--bg-tertiary) rounded-lg transition-colors"
              >
                Limpiar filtro
              </button>
            </div>
          </div>
        )}
      </div>

      <Button variant="secondary" onClick={onExport} title="Exportar compras a CSV">
        <Download className="w-4 h-4 mr-2" />
        Exportar
      </Button>
    </div>
  );
}
