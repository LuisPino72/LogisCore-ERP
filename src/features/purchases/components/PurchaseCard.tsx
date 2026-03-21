import type { Purchase } from "@/lib/db";

interface PurchaseCardProps {
  purchase: Purchase;
  expanded: boolean;
  onToggleExpand: () => void;
}

export default function PurchaseCard({ purchase, expanded, onToggleExpand }: PurchaseCardProps) {
  return (
    <div className="bg-(--bg-secondary) border border-(--border-color) rounded-xl p-4 shadow-lg hover:shadow-xl transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-(--text-primary)">{purchase.supplier}</h3>
          <p className="text-xs text-(--text-muted) font-mono">{purchase.invoiceNumber}</p>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            purchase.status === "completed"
              ? "bg-green-500/10 text-green-400"
              : purchase.status === "pending"
                ? "bg-yellow-500/10 text-yellow-400"
                : "bg-red-500/10 text-red-400"
          }`}
        >
          {purchase.status === "completed"
            ? "Completado"
            : purchase.status === "pending"
              ? "Pendiente"
              : "Cancelado"}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm text-(--text-secondary) mb-3">
        <span>{purchase.createdAt.toLocaleDateString()}</span>
        <span>{purchase.items.length} items</span>
      </div>

      <div className="pt-3 border-t border-(--border-color) flex items-center justify-between">
        <span className="text-lg font-bold text-green-400">${purchase.total.toFixed(2)}</span>
        <button
          onClick={onToggleExpand}
          title={expanded ? "Ocultar detalles" : "Ver detalles de la compra"}
          className="text-(--brand-400) text-sm hover:underline"
        >
          {expanded ? "Ocultar" : "Ver detalles"}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-(--border-color)">
          {purchase.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm py-1">
              <span className="text-(--text-secondary)">{item.productName}</span>
              <span className="text-(--text-primary)">
                {item.quantity} x ${item.cost}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
