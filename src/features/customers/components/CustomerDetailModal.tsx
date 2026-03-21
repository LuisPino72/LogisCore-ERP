import { 
  User, X, IdCard, Phone, Mail, MapPin, 
  FileText, ChevronDown, Loader2, CheckCircle2, XCircle, Edit2, Trash2
} from "lucide-react";
import { formatRif } from "@/features/invoicing/services/invoicing.service";
import type { Customer, Invoice } from "@/lib/db";

interface CustomerDetailModalProps {
  customer: Customer;
  customerHistory: Invoice[];
  loadingHistory: boolean;
  showHistory: boolean;
  onClose: () => void;
  onToggleHistory: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function formatBs(value: number) {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "VES",
    minimumFractionDigits: 2,
  }).format(value);
}

export default function CustomerDetailModal({
  customer,
  customerHistory,
  loadingHistory,
  showHistory,
  onClose,
  onToggleHistory,
  onEdit,
  onDelete,
}: CustomerDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color)">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-(--brand-400)" />
            Detalles del Cliente
          </h3>
          <button
            onClick={onClose}
            title="Cerrar"
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-(--border-color)">
            <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center">
              <User className="w-7 h-7 text-slate-400" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white">{customer.nombreRazonSocial}</h4>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  customer.isActive
                    ? "bg-green-500/10 text-green-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                {customer.isActive ? "Activo" : "Inactivo"}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <IdCard className="w-5 h-5 text-slate-500 shrink-0" />
              <div>
                <p className="text-xs text-slate-500 uppercase">RIF/Cédula</p>
                <p className="text-white font-mono">{formatRif(customer.rifCedula)}</p>
              </div>
            </div>

            {customer.telefono && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-slate-500 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 uppercase">Teléfono</p>
                  <p className="text-white">{customer.telefono}</p>
                </div>
              </div>
            )}

            {customer.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-slate-500 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 uppercase">Email</p>
                  <p className="text-white">{customer.email}</p>
                </div>
              </div>
            )}

            {customer.direccion && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500 uppercase">Dirección</p>
                  <p className="text-white">{customer.direccion}</p>
                </div>
              </div>
            )}

            {customer.notas && (
              <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                <div>
                  <p className="text-xs text-amber-500 uppercase font-medium">Notas</p>
                  <p className="text-slate-300 text-sm mt-1">{customer.notas}</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-(--border-color) pt-4 mt-4">
            <button
              onClick={onToggleHistory}
              title={showHistory ? "Ocultar historial de facturas" : "Ver historial de facturas"}
              className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-(--brand-400)" />
                <span className="text-white font-medium text-sm">Historial de Facturas</span>
                {customerHistory.length > 0 && (
                  <span className="text-xs text-slate-500">({customerHistory.length})</span>
                )}
              </div>
              <ChevronDown 
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showHistory ? "rotate-180" : ""}`} 
              />
            </button>

            {showHistory && (
              <div className="mt-3 space-y-2">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 text-(--brand-400) animate-spin" />
                    <span className="ml-2 text-sm text-slate-400">Cargando historial...</span>
                  </div>
                ) : customerHistory.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-sm">
                    Este cliente no tiene facturas registradas
                  </div>
                ) : (
                  <>
                    {customerHistory.slice(0, 10).map((invoice) => (
                      <div
                        key={invoice.localId}
                        className="flex items-center justify-between p-3 bg-slate-800/30 hover:bg-slate-800/50 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {invoice.estatus === "EMITIDA" ? (
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400" />
                          )}
                          <div>
                            <p className="text-white text-sm font-mono">{invoice.controlNumber}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(invoice.createdAt).toLocaleDateString("es-ES")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium ${invoice.estatus === "EMITIDA" ? "text-green-400" : "text-slate-500"}`}>
                            {formatBs(invoice.totalFinalBs)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {invoice.estatus === "EMITIDA" ? "Emitida" : "Anulada"}
                          </p>
                        </div>
                      </div>
                    ))}
                    {customerHistory.length > 10 && (
                      <p className="text-center text-xs text-slate-500 py-2">
                        +{customerHistory.length - 10} facturas más
                      </p>
                    )}
                    {customerHistory.length > 0 && (
                      <div className="pt-2 border-t border-slate-700/50">
                        <p className="text-sm text-slate-400">
                          Total acumulado: <span className="text-green-400 font-medium">{formatBs(customerHistory.filter(i => i.estatus === "EMITIDA").reduce((sum, i) => sum + i.totalFinalBs, 0))}</span>
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-(--border-color)">
            <p className="text-xs text-slate-500">
              Creado: {new Date(customer.createdAt).toLocaleDateString("es-ES", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-(--border-color) bg-slate-800/30">
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-(--brand-500) hover:bg-(--brand-400) text-white rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Editar
          </button>
          <button
            onClick={onDelete}
            className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
