import { useState } from "react";
import { Ban, AlertTriangle, Loader2 } from "lucide-react";
import type { Invoice } from "../types/invoicing.types";

interface CancelInvoiceModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function CancelInvoiceModal({ invoice, onClose, onConfirm }: CancelInvoiceModalProps) {
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  if (!invoice) return null;

  const handleConfirm = async () => {
    if (!cancelReason.trim()) return;
    setCancelling(true);
    try {
      await onConfirm();
      setCancelReason("");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
              <Ban className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Anular Factura</h3>
              <p className="text-sm text-slate-400 font-mono">{invoice.controlNumber}</p>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-amber-400 font-medium">Acción irreversible</p>
                <p className="text-slate-400 mt-1">
                  La factura será marcada como anulada y no podrá ser utilizada. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-400 mb-1.5">
              Motivo de anulación *
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ej: Error en datos del cliente, mercancía devuelta, etc."
              rows={3}
              className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              required
            />
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t border-(--border-color) bg-slate-800/30">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!cancelReason.trim() || cancelling}
            className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {cancelling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Ban className="w-4 h-4" />
                Anular Factura
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
