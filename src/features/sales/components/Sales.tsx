import { useState, useEffect, useCallback } from "react";
import { Sale } from "../../../lib/db";
import { formatBs } from "../../exchange-rate/services/exchangeRate.service";
import Card from "../../../common/Card";
import { useSales } from "../hooks/useSales";
import {
  ShoppingBag,
  Search,
  DollarSign,
  CreditCard,
  Banknote,
  Package,
  Clock,
  Check,
  X,
  Eye,
  TrendingUp,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Ban,
  Loader2,
  Download,
  Smartphone,
  Calendar,
} from "lucide-react";

type PaymentFilter = "all" | "cash" | "card" | "pago_movil";

export default function Sales() {
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const {
    loading,
    filters,
    filteredSales,
    paginatedSales,
    currentPage,
    totalPages,
    stats,
    setSearch,
    setDateRange,
    setCustomDateRange,
    setPaymentFilter,
    setStatusFilter,
    setCurrentPage,
    loadSales,
    cancelSale,
    exportCSV,
  } = useSales()

  useEffect(() => {
    loadSales()
  }, [loadSales])

  const handleCancelSale = useCallback(async (localId: string) => {
    if (!confirm("¿Estás seguro de cancelar esta venta?")) return
    
    setCancellingId(localId)
    try {
      await cancelSale(localId)
    } catch {
      // Error already handled in hook
    } finally {
      setCancellingId(null)
    }
  }, [cancelSale])

  const handleCustomDateApply = useCallback(() => {
    if (customStart && customEnd) {
      setCustomDateRange(new Date(customStart), new Date(customEnd))
      setShowDatePicker(false)
    }
  }, [customStart, customEnd, setCustomDateRange])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-(--text-primary) flex items-center gap-2">
            <ShoppingBag className="w-6 h-6" />
            Ventas
          </h2>
          <p className="text-(--text-secondary)">
            {filteredSales.length} transacciones
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-secondary) hover:text-white hover:bg-(--brand-500)/20 transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-xs text-(--text-muted) uppercase">
              Ingresos
            </span>
          </div>
          <p className="text-2xl font-bold text-(--text-primary)">
            ${stats.totalRevenue.toFixed(2)}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-(--brand-500)/10 rounded-lg">
              <Receipt className="w-5 h-5 text-(--brand-400)" />
            </div>
            <span className="text-xs text-(--text-muted) uppercase">
              Transacciones
            </span>
          </div>
          <p className="text-2xl font-bold text-(--text-primary)">
            {stats.totalTransactions}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-xs text-(--text-muted) uppercase">
              Ticket Promedio
            </span>
          </div>
          <p className="text-2xl font-bold text-(--text-primary)">
            ${stats.avgOrder.toFixed(2)}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Banknote className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-xs text-(--text-muted) uppercase">
              Efectivo
            </span>
          </div>
          <p className="text-2xl font-bold text-(--text-primary)">
            ${stats.cashTotal.toFixed(2)}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <CreditCard className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-xs text-(--text-muted) uppercase">
              Tarjeta
            </span>
          </div>
          <p className="text-2xl font-bold text-(--text-primary)">
            ${stats.cardTotal.toFixed(2)}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Smartphone className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-xs text-(--text-muted) uppercase">
              Pago Móvil
            </span>
          </div>
          <p className="text-2xl font-bold text-(--text-primary)">
            ${stats.pagoMovilTotal.toFixed(2)}
          </p>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-(--text-muted)" />
          <input
            type="text"
            placeholder="Buscar ventas..."
            value={filters.search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${filters.dateRange === 'custom' ? 'bg-(--brand-500)/10 border-(--brand-500)/50 text-(--brand-400)' : 'bg-(--bg-tertiary) border border-(--border-color) text-(--text-secondary)'}`}
          >
            <Calendar className="w-4 h-4" />
            {filters.dateRange === 'custom' ? 'Personalizado' : 
              filters.dateRange === 'today' ? 'Hoy' :
              filters.dateRange === 'week' ? '7 días' :
              filters.dateRange === 'month' ? '30 días' : 'Todo'}
          </button>
          {showDatePicker && (
            <div className="absolute top-full right-0 mt-2 bg-(--bg-secondary) border border-(--border-color) rounded-xl p-4 shadow-xl z-20">
              <div className="flex gap-2 mb-3">
                <button onClick={() => { setDateRange('today'); setShowDatePicker(false) }} className="px-3 py-1.5 text-xs bg-(--bg-tertiary) hover:bg-(--brand-500)/20 rounded-lg">Hoy</button>
                <button onClick={() => { setDateRange('week'); setShowDatePicker(false) }} className="px-3 py-1.5 text-xs bg-(--bg-tertiary) hover:bg-(--brand-500)/20 rounded-lg">7 días</button>
                <button onClick={() => { setDateRange('month'); setShowDatePicker(false) }} className="px-3 py-1.5 text-xs bg-(--bg-tertiary) hover:bg-(--brand-500)/20 rounded-lg">30 días</button>
                <button onClick={() => { setDateRange('all'); setShowDatePicker(false) }} className="px-3 py-1.5 text-xs bg-(--bg-tertiary) hover:bg-(--brand-500)/20 rounded-lg">Todo</button>
              </div>
              <div className="flex gap-2">
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm" />
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm" />
              </div>
              <button onClick={handleCustomDateApply} className="w-full mt-3 py-2 bg-(--brand-500) hover:bg-(--brand-400) text-white rounded-lg text-sm">Aplicar</button>
            </div>
          )}
        </div>
        <select
          value={filters.paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
          className="px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-(--brand-500) cursor-pointer">
          <option value="all">Todos los métodos</option>
          <option value="cash">Efectivo</option>
          <option value="card">Tarjeta</option>
          <option value="pago_movil">Pago Móvil</option>
        </select>
        <select
          value={filters.statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-(--brand-500) cursor-pointer">
          <option value="all">Todos los estados</option>
          <option value="completed">Completadas</option>
          <option value="cancelled">Canceladas</option>
          <option value="pending">Pendientes</option>
        </select>
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-(--brand-400) animate-spin" />
            <span className="ml-3 text-slate-400">Cargando ventas...</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-(--border-color)">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-(--text-muted) uppercase">
                      ID
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-(--text-muted) uppercase">
                      Fecha
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-(--text-muted) uppercase">
                      Items
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-(--text-muted) uppercase">
                      Total
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-(--text-muted) uppercase">
                      Método
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-(--text-muted) uppercase">
                      Estado
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-(--text-muted) uppercase">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSales.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-12 text-center text-(--text-muted)">
                        <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No hay ventas</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedSales.map((sale) => (
                      <tr
                        key={sale.localId}
                        className="border-b border-(--border-color)/50 hover:bg-(--bg-tertiary)">
                        <td className="py-4 px-4 text-right">
                          <span className="text-(--text-muted) font-mono text-xs">
                            {sale.localId.slice(0, 8)}...
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-(--text-primary) text-sm">
                            {new Date(sale.createdAt).toLocaleDateString("es-ES", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-(--bg-tertiary) rounded-lg border border-(--border-color)">
                            <Package className="w-3.5 h-3.5 text-(--text-muted)" />
                            <span className="text-(--text-secondary) text-sm">
                              {sale.items.length}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-green-400 font-bold text-lg">
                            ${sale.total.toFixed(2)}
                          </span>
                          {sale.exchangeRate && sale.exchangeRate > 0 && (
                            <span className="block text-xs text-blue-400">
                              {formatBs(sale.total * sale.exchangeRate)}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                              sale.paymentMethod === "cash"
                                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                : "bg-(--brand-500)/10 text-(--brand-400) border border-(--brand-500)/20"
                            }`}>
                            {sale.paymentMethod === "cash" ? (
                              <>
                                <Banknote className="w-3.5 h-3.5" /> Efectivo
                              </>
                            ) : (
                              <>
                                <CreditCard className="w-3.5 h-3.5" /> Tarjeta
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {sale.status === "completed" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-full border border-green-500/20">
                              <Check className="w-3 h-3" /> Completada
                            </span>
                          ) : sale.status === "cancelled" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded-full border border-red-500/20">
                              <X className="w-3 h-3" /> Cancelada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-400 text-xs rounded-full border border-amber-500/20">
                              <Clock className="w-3 h-3" /> Pendiente
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {sale.status === "completed" && (
                              <button
                                onClick={() => handleCancelSale(sale.localId)}
                                disabled={cancellingId === sale.localId}
                                className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
                                title="Cancelar venta"
                              >
                                {cancellingId === sale.localId ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Ban className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedSale(sale)}
                              className="p-2 hover:bg-(--bg-tertiary) rounded-lg text-(--text-secondary) hover:text-(--text-primary) transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-(--border-color)">
                <p className="text-sm text-(--text-muted)">
                  Mostrando {((currentPage - 1) * 25) + 1}-{Math.min(currentPage * 25, filteredSales.length)} de {filteredSales.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 hover:bg-(--bg-tertiary) rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-(--text-secondary)" />
                  </button>
                  <span className="text-sm text-(--text-secondary)">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 hover:bg-(--bg-tertiary) rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-(--text-secondary)" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {selectedSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color)">
              <h3 className="text-lg font-semibold text-(--text-primary) flex items-center gap-2">
                <Receipt className="w-5 h-5 text-(--brand-400)" />
                Detalle de Venta
              </h3>
              <button
                onClick={() => setSelectedSale(null)}
                className="p-1.5 hover:bg-(--bg-tertiary) rounded-lg transition-colors">
                <X className="w-5 h-5 text-(--text-muted)" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-(--border-color)">
                <div>
                  <p className="text-xs text-(--text-muted) uppercase">ID</p>
                  <p className="text-(--text-primary) font-mono text-sm">
                    {selectedSale.localId}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-(--text-muted) uppercase">Fecha</p>
                  <p className="text-(--text-primary) text-sm">
                    {new Date(selectedSale.createdAt).toLocaleDateString(
                      "es-ES",
                      {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-(--text-muted) uppercase mb-3">
                  Items
                </p>
                <div className="space-y-2 bg-(--bg-primary)/50 p-3 rounded-xl border border-(--border-color)">
                  {selectedSale.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-(--bg-tertiary) rounded-lg flex items-center justify-center">
                          <Package className="w-4 h-4 text-(--text-muted)" />
                        </div>
                        <div>
                          <p className="text-(--text-primary) text-sm">
                            {item.productName}
                          </p>
                          <p className="text-xs text-(--text-secondary)">
                            {item.quantity} x ${item.unitPrice.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <span className="text-green-400 font-medium">
                        ${item.total.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-(--border-color) space-y-2">
                <div className="flex justify-between text-(--text-secondary) text-sm">
                  <span>Subtotal</span>
                  <span>${selectedSale.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-(--text-secondary) text-sm">
                  <span>Impuesto</span>
                  <span>${selectedSale.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-(--text-primary)">Total</span>
                  <span className="text-green-400">
                    ${selectedSale.total.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-(--border-color)">
                <div className="flex items-center justify-between">
                  <span className="text-(--text-secondary) text-sm">
                    Método de pago
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
                      selectedSale.paymentMethod === "cash"
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : "bg-(--brand-500)/10 text-(--brand-400) border border-(--brand-500)/20"
                    }`}>
                    {selectedSale.paymentMethod === "cash" ? (
                      <Banknote className="w-4 h-4" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                    {selectedSale.paymentMethod === "cash"
                      ? "Efectivo"
                      : "Tarjeta"}
                  </span>
                </div>
              </div>

              {selectedSale.exchangeRate && selectedSale.exchangeRate > 0 && (
                <div className="pt-4 border-t border-(--border-color)">
                  <div className="flex items-center justify-between">
                    <span className="text-(--text-secondary) text-sm">
                      Tasa BCV
                    </span>
                    <div className="text-right">
                      <span className="text-blue-400 font-medium">
                        {formatBs(selectedSale.exchangeRate)}
                      </span>
                      <span className="block text-xs text-slate-500">
                        Total: {formatBs(selectedSale.total * selectedSale.exchangeRate)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
