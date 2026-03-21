import { User, Edit2, Trash2 } from "lucide-react";
import type { Supplier } from "@/lib/db";

interface SupplierTableProps {
  suppliers: Supplier[];
  onEdit: (supplier: Supplier) => void;
  onDelete: (localId: string) => void;
}

export default function SupplierTable({ suppliers, onEdit, onDelete }: SupplierTableProps) {
  if (suppliers.length === 0) {
    return (
      <div className="py-12 text-center text-(--text-muted)">
        <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No hay proveedores registrados</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-(--border-color)">
            <th className="text-left py-3 px-4 text-xs font-semibold text-(--text-muted) uppercase">Nombre</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-(--text-muted) uppercase">Teléfono</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-(--text-muted) uppercase">Notas</th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-(--text-muted) uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((supplier) => (
            <tr
              key={supplier.localId}
              className="border-b border-(--border-color) hover:bg-(--brand-500)/5"
            >
              <td className="py-4 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-(--bg-tertiary) rounded-lg flex items-center justify-center border border-(--border-color)">
                    <User className="w-5 h-5 text-(--text-muted)" />
                  </div>
                  <span className="font-medium text-(--text-primary)">{supplier.name}</span>
                </div>
              </td>
              <td className="py-4 px-4 text-(--text-secondary)">{supplier.phone || "-"}</td>
              <td className="py-4 px-4 text-(--text-muted) max-w-xs truncate">
                {supplier.notes || "-"}
              </td>
              <td className="py-4 px-4 text-right">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onEdit(supplier)}
                    title="Editar proveedor"
                    className="p-2 hover:bg-(--bg-tertiary) rounded-lg text-(--text-muted) hover:text-(--text-primary) transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(supplier.localId)}
                    title="Eliminar proveedor"
                    className="p-2 hover:bg-red-500/10 rounded-lg text-(--text-muted) hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
