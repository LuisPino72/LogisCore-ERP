import Button from "@/common/Button";
import { X, Play, Trash2, Clock } from "lucide-react";
import type { SuspendedSale } from "@/lib/db";

interface SuspendedSalesModalProps {
  isOpen: boolean;
  sales: SuspendedSale[];
  onClose: () => void;
  onResume: (sale: SuspendedSale) => void;
  onDelete: (localId: string) => void;
}

export default function SuspendedSalesModal({
  isOpen,
  sales,
  onClose,
  onResume,
  onDelete,
}: SuspendedSalesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-(--bg-primary) border border-(--border-color) rounded-2xl w-full max-w-lg shadow-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color)">
          <h3 className="text-lg font-semibold text-(--text-primary) flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Ventas Suspendidas
          </h3>
          <button
            onClick={onClose}
            title="Cerrar"
            className="p-1 hover:bg-(--bg-tertiary) rounded"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5 text-(--text-muted)" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {sales.length === 0 ? (
            <div className="text-center text-(--text-muted) py-8">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay ventas suspendidas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sales.map((sale) => (
                <div
                  key={sale.localId}
                  className="flex items-center justify-between bg-(--bg-tertiary) p-4 rounded-lg border border-(--border-color)"
                >
                  <div className="flex-1">
                    <p className="text-(--text-primary) font-medium">{sale.cart.length} productos</p>
                    <p className="text-xs text-(--text-muted)">{sale.createdAt.toLocaleString()}</p>
                    {sale.note && <p className="text-xs text-(--text-secondary) mt-1">Nota: {sale.note}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onResume(sale)}
                      title="Restaurar esta venta al carrito"
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Restaurar
                    </Button>
                    <button
                      onClick={() => onDelete(sale.localId)}
                      title="Eliminar venta suspendida"
                      aria-label="Eliminar venta suspendida"
                      className="p-2 hover:bg-red-500/20 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
