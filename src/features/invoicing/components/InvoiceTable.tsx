import { FileText, Eye, Ban, User } from "lucide-react";
import { TableSkeleton } from "@/common/Skeleton";
import { formatBs } from "@/features/exchange-rate/services/exchangeRate.service";
import { formatRif } from "../services/invoicing.service";
import type { Invoice } from "../types/invoicing.types";

type StatusFilter = "all" | "EMITIDA" | "ANULADA";
type DocTypeFilter = "all" | "FACTURA" | "NOTA_DEBITO" | "NOTA_CREDITO";

interface DateRange {
  desde?: Date;
  hasta?: Date;
}

interface InvoiceTableProps {
  invoices: Invoice[];
  isLoading: boolean;
  searchQuery: string;
  statusFilter: StatusFilter;
  docTypeFilter: DocTypeFilter;
  dateRange: DateRange;
  onClearFilters: () => void;
  onView: (invoice: Invoice) => void;
  onCancel: (invoice: Invoice) => void;
}

function getDocTypeLabel(tipo: string) {
  switch (tipo) {
    case "FACTURA": return "Factura";
    case "NOTA_DEBITO": return "Nota Débito";
    case "NOTA_CREDITO": return "Nota Crédito";
    default: return tipo;
  }
}

function getDocTypeColor(tipo: string) {
  switch (tipo) {
    case "FACTURA": return "bg-green-500/10 text-green-400 border-green-500/20";
    case "NOTA_DEBITO": return "bg-red-500/10 text-red-400 border-red-500/20";
    case "NOTA_CREDITO": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  }
}

function EmptyState({
  hasFilters,
  onClearFilters,
}: {
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  return (
    <tr>
      <td colSpan={7} className="py-16 text-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-slate-600" />
          </div>
          <p className="text-white font-medium mb-1">
            {hasFilters ? "Sin resultados" : "Sin facturas registradas"}
          </p>
          <p className="text-slate-500 text-sm">
            {hasFilters ? "Intenta con otros filtros" : "Las facturas aparecerán aquí cuando las generes"}
          </p>
          {hasFilters && (
            <button
              onClick={onClearFilters}
              className="mt-4 text-(--brand-400) hover:text-(--brand-300) text-sm font-medium transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function InvoiceTable({
  invoices,
  isLoading,
  searchQuery,
  statusFilter,
  docTypeFilter,
  dateRange,
  onClearFilters,
  onView,
  onCancel,
}: InvoiceTableProps) {
  const hasFilters = !!(searchQuery || statusFilter !== "all" || docTypeFilter !== "all" || dateRange.desde || dateRange.hasta);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-(--border-color)">
            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Número
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Fecha
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cliente
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total
            </th>
            <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tipo
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
            <TableSkeleton rows={5} cols={7} />
          ) : invoices.length === 0 ? (
            <EmptyState hasFilters={hasFilters} onClearFilters={onClearFilters} />
          ) : (
            invoices.map((invoice) => (
              <tr
                key={invoice.localId}
                className={`border-b border-(--border-color)/50 hover:bg-(--brand-500)/5 transition-colors group ${
                  invoice.estatus === "ANULADA" ? "opacity-50" : ""
                }`}
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-white font-medium">
                      {invoice.controlNumber}
                    </span>
                    {invoice.estatus === "ANULADA" && (
                      <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded uppercase font-bold">
                        ANULADA
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="text-slate-400 text-sm">
                    {new Date(invoice.createdAt).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="text-white text-sm">{invoice.clienteNombre}</p>
                      <p className="text-xs text-slate-500 font-mono">
                        {formatRif(invoice.clienteRifCedula)}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <p className="text-green-400 font-bold">
                    {formatBs(invoice.totalFinalBs)}
                  </p>
                  <p className="text-xs text-slate-500">
                    ${invoice.subtotalUsd.toFixed(2)}
                  </p>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getDocTypeColor(invoice.tipoDocumento)}`}>
                    {getDocTypeLabel(invoice.tipoDocumento)}
                  </span>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    invoice.estatus === "EMITIDA"
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}>
                    {invoice.estatus === "EMITIDA" ? "Emitida" : "Anulada"}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onView(invoice)}
                      className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                      title="Ver factura"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {invoice.estatus === "EMITIDA" && (
                      <button
                        onClick={() => onCancel(invoice)}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                        title="Anular factura"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
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
