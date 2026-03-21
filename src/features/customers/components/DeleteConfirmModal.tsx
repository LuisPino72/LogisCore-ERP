import { Trash2 } from "lucide-react";
import type { Customer } from "@/lib/db";

interface DeleteConfirmModalProps {
  customer: Customer | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmModal({ customer, onClose, onConfirm }: DeleteConfirmModalProps) {
  if (!customer) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">¿Eliminar cliente?</h3>
          <p className="text-slate-400">
            Estás a punto de eliminar a <strong className="text-white">{customer.nombreRazonSocial}</strong>. Esta acción no se puede deshacer.
          </p>
        </div>
        <div className="flex gap-3 p-4 border-t border-(--border-color)">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
