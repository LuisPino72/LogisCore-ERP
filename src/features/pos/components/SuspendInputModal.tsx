import Button from "@/common/Button";
import { X, Pause } from "lucide-react";

interface SuspendInputModalProps {
  isOpen: boolean;
  note: string;
  onClose: () => void;
  onNoteChange: (note: string) => void;
  onSuspend: () => void;
}

export default function SuspendInputModal({
  isOpen,
  note,
  onClose,
  onNoteChange,
  onSuspend,
}: SuspendInputModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-(--bg-primary) border border-(--border-color) rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color)">
          <h3 className="text-lg font-semibold text-(--text-primary) flex items-center gap-2">
            <Pause className="w-5 h-5" />
            Suspender Venta
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-(--bg-tertiary) rounded"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5 text-(--text-muted)" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-(--text-secondary) mb-1.5">
              Nota (opcional)
            </label>
            <textarea
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Ej: Cliente vuelve en 30 minutos..."
              title="Agregar una nota para identificar esta venta"
              rows={3}
              className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500) resize-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={onSuspend}>Suspender</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
