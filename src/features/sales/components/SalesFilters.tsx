import { Search, Calendar } from "lucide-react";

type DateRange = "all" | "today" | "week" | "month" | "custom";
type PaymentFilter = "all" | "cash" | "card" | "pago_movil";
type StatusFilter = "all" | "completed" | "cancelled" | "pending";

interface SalesFiltersProps {
  search: string;
  dateRange: DateRange;
  paymentFilter: PaymentFilter;
  statusFilter: StatusFilter;
  showDatePicker: boolean;
  customStart: string;
  customEnd: string;
  onSearchChange: (value: string) => void;
  onDateRangeChange: (range: DateRange) => void;
  onCustomDateApply: () => void;
  onCustomStartChange: (value: string) => void;
  onCustomEndChange: (value: string) => void;
  onToggleDatePicker: () => void;
  onPaymentFilterChange: (filter: PaymentFilter) => void;
  onStatusFilterChange: (filter: StatusFilter) => void;
}

const dateRangeLabels: Record<DateRange, string> = {
  all: "Todo",
  today: "Hoy",
  week: "7 días",
  month: "30 días",
  custom: "Personalizado",
};

export default function SalesFilters({
  search,
  dateRange,
  paymentFilter,
  statusFilter,
  showDatePicker,
  customStart,
  customEnd,
  onSearchChange,
  onDateRangeChange,
  onCustomDateApply,
  onCustomStartChange,
  onCustomEndChange,
  onToggleDatePicker,
  onPaymentFilterChange,
  onStatusFilterChange,
}: SalesFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-(--text-muted)" />
        <input
          type="text"
          placeholder="Buscar ventas..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
        />
      </div>

      <div className="relative">
        <button
          onClick={onToggleDatePicker}
          title="Filtrar ventas por rango de fechas"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
            dateRange === "custom"
              ? "bg-(--brand-500)/10 border-(--brand-500)/50 text-(--brand-400)"
              : "bg-(--bg-tertiary) border border-(--border-color) text-(--text-secondary)"
          }`}
        >
          <Calendar className="w-4 h-4" />
          {dateRangeLabels[dateRange]}
        </button>

        {showDatePicker && (
          <div className="absolute top-full right-0 mt-2 bg-(--bg-secondary) border border-(--border-color) rounded-xl p-4 shadow-xl z-20 min-w-[280px]">
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                onClick={() => {
                  onDateRangeChange("today");
                  onToggleDatePicker();
                }}
                className="px-3 py-1.5 text-xs bg-(--bg-tertiary) hover:bg-(--brand-500)/20 rounded-lg"
              >
                Hoy
              </button>
              <button
                onClick={() => {
                  onDateRangeChange("week");
                  onToggleDatePicker();
                }}
                className="px-3 py-1.5 text-xs bg-(--bg-tertiary) hover:bg-(--brand-500)/20 rounded-lg"
              >
                7 días
              </button>
              <button
                onClick={() => {
                  onDateRangeChange("month");
                  onToggleDatePicker();
                }}
                className="px-3 py-1.5 text-xs bg-(--bg-tertiary) hover:bg-(--brand-500)/20 rounded-lg"
              >
                30 días
              </button>
              <button
                onClick={() => {
                  onDateRangeChange("all");
                  onToggleDatePicker();
                }}
                className="px-3 py-1.5 text-xs bg-(--bg-tertiary) hover:bg-(--brand-500)/20 rounded-lg"
              >
                Todo
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => onCustomStartChange(e.target.value)}
                className="flex-1 px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm"
              />
              <input
                type="date"
                value={customEnd}
                onChange={(e) => onCustomEndChange(e.target.value)}
                className="flex-1 px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm"
              />
            </div>
            <button
              onClick={onCustomDateApply}
              disabled={!customStart || !customEnd}
              className="w-full mt-3 py-2 bg-(--brand-500) hover:bg-(--brand-400) disabled:opacity-50 text-white rounded-lg text-sm"
            >
              Aplicar
            </button>
          </div>
        )}
      </div>

      <select
        value={paymentFilter}
        onChange={(e) => onPaymentFilterChange(e.target.value as PaymentFilter)}
        title="Filtrar por método de pago"
        className="px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-(--brand-500) cursor-pointer"
      >
        <option value="all">Todos los métodos</option>
        <option value="cash">Efectivo</option>
        <option value="card">Tarjeta</option>
        <option value="pago_movil">Pago Móvil</option>
      </select>

      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
        title="Filtrar por estado de venta"
        className="px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-(--brand-500) cursor-pointer"
      >
        <option value="all">Todos los estados</option>
        <option value="completed">Completadas</option>
        <option value="cancelled">Canceladas</option>
        <option value="pending">Pendientes</option>
      </select>
    </div>
  );
}
