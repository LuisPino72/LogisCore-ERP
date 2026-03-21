import { History, Package, X } from "lucide-react";
import type { Recipe, ProductionLog } from "@/lib/db";

interface ProductionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  productionLogs: ProductionLog[];
  recipes: Recipe[];
}

export default function ProductionHistoryModal({
  isOpen,
  onClose,
  productionLogs,
  recipes,
}: ProductionHistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl w-full max-w-2xl shadow-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color)">
          <h3 className="text-lg font-semibold text-(--text-primary) flex items-center gap-2">
            <History className="w-5 h-5 text-(--brand-400)" />
            Historial de Producción
          </h3>
          <button onClick={onClose} title="Cerrar" aria-label="Cerrar" className="p-1.5 hover:bg-(--bg-tertiary) rounded-lg transition-colors">
            <X className="w-5 h-5 text-(--text-muted)" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {productionLogs.length === 0 ? (
            <div className="text-center text-(--text-muted) py-8">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay historial de producción</p>
            </div>
          ) : (
            <div className="space-y-3">
              {productionLogs.map((log) => {
                const recipe = recipes.find((r) => r.localId === log.recipeId);
                return (
                  <div key={log.localId} className="bg-(--bg-tertiary) p-4 rounded-lg border border-(--border-color)">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-(--text-primary) font-medium">{recipe?.name || "Receta eliminada"}</span>
                      <span className="text-green-400 font-bold">+{log.quantity} unidades</span>
                    </div>
                    <p className="text-xs text-(--text-muted)">{log.createdAt.toLocaleString()}</p>
                    <div className="mt-2 text-xs text-(--text-secondary)">
                      {log.ingredientsUsed.length} ingredientes usados
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
