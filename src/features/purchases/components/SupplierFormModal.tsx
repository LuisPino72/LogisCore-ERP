import Button from "@/common/Button";
import Input from "@/common/Input";
import { X } from "lucide-react";
import type { Supplier } from "@/lib/db";

interface SupplierFormData {
  name: string;
  phone: string;
  notes: string;
}

interface SupplierFormModalProps {
  isOpen: boolean;
  editingSupplier: Supplier | null;
  form: SupplierFormData;
  onClose: () => void;
  onFormChange: (form: SupplierFormData) => void;
  onSubmit: () => void;
}

export default function SupplierFormModal({
  isOpen,
  editingSupplier,
  form,
  onClose,
  onFormChange,
  onSubmit,
}: SupplierFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color)">
          <h3 className="text-lg font-semibold text-(--text-primary)">
            {editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
          </h3>
          <button onClick={onClose} title="Cerrar" className="p-1 hover:bg-(--bg-tertiary) rounded">
            <X className="w-5 h-5 text-(--text-muted)" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <Input
            label="Nombre del Proveedor"
            value={form.name}
            onChange={(e) => onFormChange({ ...form, name: e.target.value })}
            placeholder="Ej: Distribuidora ABC"
            required
          />

          <Input
            label="Teléfono"
            value={form.phone}
            onChange={(e) => onFormChange({ ...form, phone: e.target.value })}
            placeholder="+54 9 11 1234 5678"
          />

          <div>
            <label className="block text-sm font-medium text-(--text-secondary) mb-1.5">Notas</label>
            <textarea
              value={form.notes}
              onChange={(e) => onFormChange({ ...form, notes: e.target.value })}
              placeholder="Notas adicionales..."
              rows={3}
              className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500) resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-(--border-color)">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={onSubmit} disabled={!form.name}>
              {editingSupplier ? "Guardar Cambios" : "Crear Proveedor"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
