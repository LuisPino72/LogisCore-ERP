import { ShoppingBag, Package, Banknote, CreditCard, Check, X, Clock, Eye, Ban } from "lucide-react";
import type { Sale } from "@/lib/db";
import { formatBs } from "@/features/exchange-rate/services/exchangeRate.service";
import SalesPagination from "./SalesPagination";

interface SalesTableProps {
  sales: Sale[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  filteredCount: number;
  cancellingId: string | null;
  onViewDetails: (sale: Sale) => void;
  onCancelSale: (localId: string) => void;
  onPageChange: (page: number) => void;
}

export default function SalesTable({
  sales,
  loading,
  currentPage,
  totalPages,
  filteredCount,
  cancellingId,
  onViewDetails,
  onCancelSale,
  onPageChange,
}: SalesTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-(--brand-500) border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-slate-400">Cargando ventas...</span>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-(--border-color)">
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase">ID</th>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase">Fecha</th>
              <th className="text-center py-3 px-4 text-xs font-semibold uppercase">Items</th>
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase">Total</th>
              <th className="text-center py-3 px-4 text-xs font-semibold uppercase">Método</th>
              <th className="text-center py-3 px-4 text-xs font-semibold uppercase">Estado</th>
              <th className="text-right py-3 px-4 text-xs font-semibold uppercase">Acción</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-(--text-muted)">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay ventas</p>
                </td>
              </tr>
            ) : (
              sales.map((sale) => (
                <tr
                  key={sale.localId}
                  className="border-b border-(--border-color)/50 hover:bg-(--bg-tertiary) transition-colors"
                >
                  <td className="py-4 px-4">
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
                      <span className="text-(--text-secondary) text-sm">{sale.items.length}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-green-400 font-bold text-lg">${sale.total.toFixed(2)}</span>
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
                      }`}
                    >
                      {sale.paymentMethod === "cash" ? (
                        <>
                          <Banknote className="w-3.5 h-3.5" /> Efectivo
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-3.5 h-3.5" />{" "}
                          {sale.paymentMethod === "pago_movil" ? "Pago Móvil" : "Tarjeta"}
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
                          onClick={() => onCancelSale(sale.localId)}
                          disabled={cancellingId === sale.localId}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Cancelar venta"
                        >
                          {cancellingId === sale.localId ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Ban className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => onViewDetails(sale)}
                        title="Ver detalles de la venta"
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
        <SalesPagination
          currentPage={currentPage}
          totalPages={totalPages}
          filteredCount={filteredCount}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
}
