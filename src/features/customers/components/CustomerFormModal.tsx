import { useState } from "react";
import { useToast } from "@/providers/ToastProvider";
import { useCustomers } from "../hooks/useCustomers";
import { Plus, X, Edit2, Loader2 } from "lucide-react";
import type { Customer } from "@/lib/db";

interface CustomerFormModalProps {
  customer: Customer | null;
  onClose: () => void;
  onSave: () => void;
}

export default function CustomerFormModal({ customer, onClose, onSave }: CustomerFormModalProps) {
  const { showSuccess, showError } = useToast();
  const { addCustomer, editCustomer } = useCustomers();

  const [form, setForm] = useState({
    nombreRazonSocial: customer?.nombreRazonSocial || "",
    rifCedula: customer?.rifCedula || "",
    direccion: customer?.direccion || "",
    telefono: customer?.telefono || "",
    email: customer?.email || "",
    notas: customer?.notas || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nombreRazonSocial.trim()) {
      showError("El nombre es requerido");
      return;
    }

    if (!form.rifCedula.trim()) {
      showError("El RIF/Cédula es requerido");
      return;
    }

    setSaving(true);
    try {
      if (customer) {
        const result = await editCustomer(customer.localId, form);
        if (result) {
          showSuccess("Cliente actualizado");
          onSave();
        }
      } else {
        const result = await addCustomer(form);
        if (result) {
          showSuccess("Cliente creado");
          onSave();
        }
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color)">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            {customer ? (
              <>
                <Edit2 className="w-5 h-5 text-(--brand-400)" />
                Editar Cliente
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 text-green-400" />
                Nuevo Cliente
              </>
            )}
          </h3>
          <button
            onClick={onClose}
            title="Cerrar"
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">
              Nombre o Razón Social *
            </label>
            <input
              type="text"
              title="Nombre o razón social del cliente"
              value={form.nombreRazonSocial}
              onChange={(e) => setForm({ ...form, nombreRazonSocial: e.target.value })}
              placeholder="Ej: Distribuidora ABC, C.A."
              className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">
              RIF / Cédula *
            </label>
            <input
              type="text"
              title="RIF o cédula de identidad del cliente"
              value={form.rifCedula}
              onChange={(e) => setForm({ ...form, rifCedula: e.target.value.toUpperCase() })}
              placeholder="Ej: J-12345678-9"
              className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500) font-mono"
              required
            />
            <p className="text-xs text-slate-500 mt-1">Formato: J/G/V/E/P + número + dígito verificador</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">
              Teléfono
            </label>
            <input
              type="tel"
              title="Número de teléfono de contacto"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              placeholder="Ej: 0412-1234567"
              className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">
              Email
            </label>
            <input
              type="email"
              title="Correo electrónico de contacto"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Ej: contacto@empresa.com"
              className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">
              Dirección
            </label>
            <textarea
              title="Dirección fiscal o de entrega"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              placeholder="Ej: Av. Libertador, Edif. Centro Comercial, Piso 3, Of. 5"
              rows={2}
              className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500) resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">
              Notas
            </label>
            <textarea
              title="Notas o recordatorios sobre el cliente"
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              placeholder="Recordatorios sobre este cliente..."
              rows={2}
              className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500) resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-(--brand-500) hover:bg-(--brand-400) text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  {customer ? "Guardar Cambios" : "Crear Cliente"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
