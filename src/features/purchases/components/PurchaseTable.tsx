import { Truck, ChevronLeft, ChevronRight } from "lucide-react";
import type { Purchase } from "@/lib/db";
import type { SortField } from "../types/purchases.types";

interface PurchaseTableProps {
  purchases: Purchase[];
  sort: { field: SortField; direction: "asc" | "desc" };
  expandedPurchase: string | null;
  currentPage: number;
  totalPages: number;
  total: number;
  onSort: (field: SortField) => void;
  onToggleExpand: (localId: string) => void;
  onPageChange: (page: number) => void;
}



export default function PurchaseTable({
  purchases,
  expandedPurchase,
  currentPage,
  totalPages,
  total,
  onSort,
  onToggleExpand,
  onPageChange,
}: PurchaseTableProps) {
  if (purchases.length === 0) {
    return (
      <div className="py-12 text-center text-(--text-muted)">
        <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No hay compras registradas</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-(--border-color)">
              <th
                className="text-left py-3 px-4 text-xs font-semibold uppercase cursor-pointer hover:text-(--text-primary)"
                onClick={() => onSort("createdAt")}
              >
                Fecha <span className="ml-1 inline opacity-30">↕</span>
              </th>
              <th
                className="text-left py-3 px-4 text-xs font-semibold uppercase cursor-pointer hover:text-(--text-primary)"
                onClick={() => onSort("supplier")}
              >
                Proveedor <span className="ml-1 inline opacity-30">↕</span>
              </th>
              <th
                className="text-left py-3 px-4 text-xs font-semibold uppercase cursor-pointer hover:text-(--text-primary)"
                onClick={() => onSort("invoiceNumber")}
              >
                Factura <span className="ml-1 inline opacity-30">↕</span>
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold uppercase">Items</th>
              <th
                className="text-right py-3 px-4 text-xs font-semibold uppercase cursor-pointer hover:text-(--text-primary)"
                onClick={() => onSort("total")}
              >
                Total <span className="ml-1 inline opacity-30">↕</span>
              </th>
              <th
                className="text-center py-3 px-4 text-xs font-semibold uppercase cursor-pointer hover:text-(--text-primary)"
                onClick={() => onSort("status")}
              >
                Estado <span className="ml-1 inline opacity-30">↕</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((purchase) => (
              <>
                <tr
                  key={purchase.localId}
                  className="border-b border-(--border-color) hover:bg-(--brand-500)/5 cursor-pointer"
                  onClick={() => onToggleExpand(purchase.localId)}
                >
                  <td className="py-3 px-4 text-(--text-primary)">
                    {purchase.createdAt.toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-(--text-secondary)">{purchase.supplier}</td>
                  <td className="py-3 px-4 text-(--text-muted) font-mono text-sm">
                    {purchase.invoiceNumber}
                  </td>
                  <td className="py-3 px-4 text-center text-(--text-secondary)">
                    {purchase.items.length}
                  </td>
                  <td className="py-3 px-4 text-right text-green-400 font-medium">
                    ${purchase.total.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        purchase.status === "completed"
                          ? "bg-green-500/20 text-green-400"
                          : purchase.status === "pending"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {purchase.status === "completed"
                        ? "Completado"
                        : purchase.status === "pending"
                          ? "Pendiente"
                          : "Cancelado"}
                    </span>
                  </td>
                </tr>
                {expandedPurchase === purchase.localId && (
                  <tr key={`${purchase.localId}-details`} className="bg-(--bg-primary)/50">
                    <td colSpan={6} className="py-4 px-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {purchase.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between bg-(--bg-tertiary)/50 p-2 rounded-lg"
                          >
                            <span className="text-(--text-secondary) text-sm">{item.productName}</span>
                            <span className="text-(--text-primary) font-medium">
                              {item.quantity} x ${item.cost}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-(--border-color)">
          <span className="text-sm text-(--text-muted)">
            Mostrando {((currentPage - 1) * 20) + 1} - {Math.min(currentPage * 20, total)} de {total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              title="Página anterior"
              className="p-2 rounded-lg hover:bg-(--bg-tertiary) disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5 text-(--text-secondary)" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    currentPage === pageNum
                      ? "bg-(--brand-600) text-white"
                      : "hover:bg-(--bg-tertiary) text-(--text-secondary)"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              title="Página siguiente"
              className="p-2 rounded-lg hover:bg-(--bg-tertiary) disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5 text-(--text-secondary)" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
