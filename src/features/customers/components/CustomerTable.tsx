import { Users, Plus, Phone, Mail, Eye, Edit2, Trash2 } from "lucide-react";
import { TableSkeleton } from "@/common/Skeleton";
import { formatRif } from "@/features/invoicing/services/invoicing.service";
import type { Customer } from "@/lib/db";

interface CustomerTableProps {
  customers: Customer[];
  isLoading: boolean;
  searchQuery: string;
  statusFilter: "all" | "active" | "inactive";
  onClearFilters: () => void;
  onAddFirst: () => void;
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

function EmptyState({
  hasFilters,
  onClearFilters,
  onAddFirst,
}: {
  hasFilters: boolean;
  onClearFilters: () => void;
  onAddFirst: () => void;
}) {
  return (
    <tr>
      <td colSpan={5} className="py-16 text-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-slate-600" />
          </div>
          <p className="text-white font-medium mb-1">
            {hasFilters ? "Sin resultados" : "Sin clientes registrados"}
          </p>
          <p className="text-slate-500 text-sm">
            {hasFilters ? "Intenta con otros filtros" : "Agrega clientes para comenzar a gestionar tu lista"}
          </p>
          {hasFilters ? (
            <button
              onClick={onClearFilters}
              title="Limpiar búsqueda y filtros"
              className="mt-4 text-(--brand-400) hover:text-(--brand-300) text-sm font-medium transition-colors"
            >
              Limpiar filtros
            </button>
          ) : (
            <button
              onClick={onAddFirst}
              title="Agregar el primer cliente"
              className="mt-4 text-(--brand-400) hover:text-(--brand-300) text-sm font-medium flex items-center gap-1 mx-auto transition-colors"
            >
              <Plus className="w-4 h-4" />
              Agregar primer cliente
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function CustomerTable({
  customers,
  isLoading,
  searchQuery,
  statusFilter,
  onClearFilters,
  onAddFirst,
  onView,
  onEdit,
  onDelete,
}: CustomerTableProps) {
  const hasFilters = !!(searchQuery || statusFilter !== "all");

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-(--border-color)">
            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cliente
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              RIF/Cédula
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Contacto
            </th>
            <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Estado
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : customers.length === 0 ? (
            <EmptyState
              hasFilters={hasFilters}
              onClearFilters={onClearFilters}
              onAddFirst={onAddFirst}
            />
          ) : (
            customers.map((customer) => (
              <tr
                key={customer.localId}
                className="border-b border-(--border-color)/50 hover:bg-(--brand-500)/5 transition-colors group"
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{customer.nombreRazonSocial}</p>
                      {customer.direccion && (
                        <p className="text-xs text-slate-500 truncate max-w-[200px]">{customer.direccion}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="text-slate-400 font-mono text-sm">
                    {formatRif(customer.rifCedula)}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="space-y-1">
                    {customer.telefono && (
                      <p className="text-sm text-slate-400 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        {customer.telefono}
                      </p>
                    )}
                    {customer.email && (
                      <p className="text-sm text-slate-400 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" />
                        {customer.email}
                      </p>
                    )}
                    {!customer.telefono && !customer.email && (
                      <span className="text-xs text-slate-600">Sin contacto</span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4 text-center">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      customer.isActive
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}
                  >
                    {customer.isActive ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onView(customer)}
                      className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                      title="Ver detalles"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEdit(customer)}
                      className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(customer)}
                      className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
