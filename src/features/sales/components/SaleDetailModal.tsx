import { X, Package, Receipt, Banknote, CreditCard } from "lucide-react";
import type { Sale } from "@/lib/db";
import { formatBs } from "@/features/exchange-rate/services/exchangeRate.service";

interface SaleDetailModalProps {
  sale: Sale;
  onClose: () => void;
}

export default function SaleDetailModal({ sale, onClose }: SaleDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color)">
          <h3 className="text-lg font-semibold text-(--text-primary) flex items-center gap-2">
            <Receipt className="w-5 h-5 text-(--brand-400)" />
            Detalle de Venta
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-(--bg-tertiary) rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-(--text-muted)" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-(--border-color)">
            <div>
              <p className="text-xs text-(--text-muted) uppercase">ID</p>
              <p className="text-(--text-primary) font-mono text-sm">{sale.localId}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-(--text-muted) uppercase">Fecha</p>
              <p className="text-(--text-primary) text-sm">
                {new Date(sale.createdAt).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs text-(--text-muted) uppercase mb-3">Items</p>
            <div className="space-y-2 bg-(--bg-primary)/50 p-3 rounded-xl border border-(--border-color)">
              {sale.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-(--bg-tertiary) rounded-lg flex items-center justify-center">
                      <Package className="w-4 h-4 text-(--text-muted)" />
                    </div>
                    <div>
                      <p className="text-(--text-primary) text-sm">{item.productName}</p>
                      <p className="text-xs text-(--text-secondary)">
                        {item.quantity} x ${item.unitPrice.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <span className="text-green-400 font-medium">${item.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-(--border-color) space-y-2">
            <div className="flex justify-between text-(--text-secondary) text-sm">
              <span>Subtotal</span>
              <span>${sale.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-(--text-secondary) text-sm">
              <span>Impuesto</span>
              <span>${sale.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span className="text-(--text-primary)">Total</span>
              <span className="text-green-400">${sale.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-(--border-color)">
            <div className="flex items-center justify-between">
              <span className="text-(--text-secondary) text-sm">Método de pago</span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
                  sale.paymentMethod === "cash"
                    ? "bg-green-500/10 text-green-400 border border-green-500/20"
                    : "bg-(--brand-500)/10 text-(--brand-400) border border-(--brand-500)/20"
                }`}
              >
                {sale.paymentMethod === "cash" ? (
                  <Banknote className="w-4 h-4" />
                ) : (
                  <CreditCard className="w-4 h-4" />
                )}
                {sale.paymentMethod === "cash"
                  ? "Efectivo"
                  : sale.paymentMethod === "pago_movil"
                    ? "Pago Móvil"
                    : "Tarjeta"}
              </span>
            </div>
          </div>

          {sale.exchangeRate && sale.exchangeRate > 0 && (
            <div className="pt-4 border-t border-(--border-color)">
              <div className="flex items-center justify-between">
                <span className="text-(--text-secondary) text-sm">Tasa BCV</span>
                <div className="text-right">
                  <span className="text-blue-400 font-medium">{formatBs(sale.exchangeRate)}</span>
                  <span className="block text-xs text-slate-500">
                    Total: {formatBs(sale.total * sale.exchangeRate)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
