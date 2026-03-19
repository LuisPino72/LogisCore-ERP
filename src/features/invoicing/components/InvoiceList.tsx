import { useEffect, useCallback, useState, useMemo, lazy, Suspense } from 'react';
import { useInvoicing } from '../hooks/useInvoicing';
import Card from '@/common/Card';
import { TableSkeleton } from '@/common/Skeleton';
import { 
  FileText, 
  Search, 
  Eye, 
  Ban, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Filter,
  X,
  Settings,
  User,
  AlertTriangle,
} from 'lucide-react';
import type { Invoice } from '../types/invoicing.types';
import { formatBs } from '@/features/exchange-rate/services/exchangeRate.service';
import { formatRif } from '../services/invoicing.service';

const InvoicePreview = lazy(() => import('./InvoicePreview'));

type StatusFilter = 'all' | 'EMITIDA' | 'ANULADA';
type DocTypeFilter = 'all' | 'FACTURA' | 'NOTA_DEBITO' | 'NOTA_CREDITO';

interface InvoiceListProps {
  onOpenSettings?: () => void;
}

export default function InvoiceList({ onOpenSettings }: InvoiceListProps) {
  const {
    isLoading,
    taxpayerInfo,
    invoices,
    loadInvoices,
    loadInvoice,
    cancelInvoice,
    isEnabled,
    checkEnabled,
  } = useInvoicing();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [docTypeFilter, setDocTypeFilter] = useState<DocTypeFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceToCancel, setInvoiceToCancel] = useState<Invoice | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState<{ desde?: Date; hasta?: Date }>({});
  const itemsPerPage = 15;

  useEffect(() => {
    checkEnabled();
    loadInvoices();
  }, [checkEnabled, loadInvoices]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesSearch = 
        !searchQuery ||
        invoice.invoiceNumber.includes(searchQuery) ||
        invoice.clienteNombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.clienteRifCedula.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || invoice.estatus === statusFilter;
      const matchesType = docTypeFilter === 'all' || invoice.tipoDocumento === docTypeFilter;

      const invoiceDate = new Date(invoice.createdAt);
      const matchesDate = 
        (!dateRange.desde || invoiceDate >= dateRange.desde) &&
        (!dateRange.hasta || invoiceDate <= dateRange.hasta);

      return matchesSearch && matchesStatus && matchesType && matchesDate;
    });
  }, [invoices, searchQuery, statusFilter, docTypeFilter, dateRange]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredInvoices.length / itemsPerPage);
  }, [filteredInvoices.length]);

  const paginatedInvoices = useMemo(() => {
    return filteredInvoices.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredInvoices, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, docTypeFilter, dateRange]);

  const handleViewInvoice = useCallback(async (invoice: Invoice) => {
    await loadInvoice(invoice.localId);
    setSelectedInvoice(invoice);
  }, [loadInvoice]);

  const handleCancel = useCallback(async () => {
    if (!invoiceToCancel || !cancelReason.trim()) return;

    setCancelling(true);
    try {
      const success = await cancelInvoice(invoiceToCancel.localId, cancelReason);
      if (success) {
        setInvoiceToCancel(null);
        setCancelReason('');
      }
    } finally {
      setCancelling(false);
    }
  }, [invoiceToCancel, cancelReason, cancelInvoice]);

  const getDocTypeLabel = (tipo: string) => {
    switch (tipo) {
      case 'FACTURA': return 'Factura';
      case 'NOTA_DEBITO': return 'Nota Débito';
      case 'NOTA_CREDITO': return 'Nota Crédito';
      default: return tipo;
    }
  };

  const getDocTypeColor = (tipo: string) => {
    switch (tipo) {
      case 'FACTURA': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'NOTA_DEBITO': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'NOTA_CREDITO': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  if (!isEnabled) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2" title="Gestionar facturas y documentos fiscales">
              <FileText className="w-6 h-6" />
              Facturación
            </h2>
            <p className="text-slate-400">Gestión de facturas digitales</p>
          </div>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              title="Configurar datos fiscales"
              className="flex items-center gap-2 px-4 py-2.5 bg-(--brand-500) hover:bg-(--brand-400) text-white rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configurar
            </button>
          )}
        </div>

        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-10 h-10 text-amber-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Módulo de Facturación No Configurado
            </h3>
            <p className="text-slate-400 max-w-md mb-6">
              Para comenzar a generar facturas digitales válidas, necesitas configurar primero 
              los datos fiscales de tu empresa según la normativa SENIAT.
            </p>
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="flex items-center gap-2 px-6 py-3 bg-(--brand-500) hover:bg-(--brand-400) text-white rounded-lg transition-colors shadow-lg shadow-(--brand-500)/20"
              >
                <Settings className="w-5 h-5" />
                Configurar Datos Fiscales
              </button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2" title="Gestionar facturas y documentos fiscales">
            <FileText className="w-6 h-6" />
            Facturación
          </h2>
          <p className="text-slate-400">{filteredInvoices.length} documentos</p>
        </div>
        <div className="flex items-center gap-2">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              title="Configurar datos fiscales"
              className="flex items-center gap-2 px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configuración
            </button>
          )}
        </div>
      </div>

      <div className="bg-(--bg-secondary) border border-(--border-color) rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por número, cliente o RIF..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="px-3 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
              >
                <option value="all">Todos</option>
                <option value="EMITIDA">Emitidas</option>
                <option value="ANULADA">Anuladas</option>
              </select>
            </div>
            
            <select
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value as DocTypeFilter)}
              className="px-3 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
            >
              <option value="all">Todos los tipos</option>
              <option value="FACTURA">Facturas</option>
              <option value="NOTA_DEBITO">Notas Débito</option>
              <option value="NOTA_CREDITO">Notas Crédito</option>
            </select>

            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors ${
                dateRange.desde || dateRange.hasta
                  ? 'bg-(--brand-500)/10 border-(--brand-500)/50 text-(--brand-400)'
                  : 'bg-(--bg-tertiary) border-(--border-color) text-slate-400'
              }`}
            >
              <Calendar className="w-4 h-4" />
              {(dateRange.desde || dateRange.hasta) ? 'Fecha activa' : 'Fecha'}
            </button>

            {(dateRange.desde || dateRange.hasta) && (
              <button
                onClick={() => setDateRange({})}
                className="px-3 py-2.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {showDatePicker && (
          <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="flex items-end gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Desde</label>
                <input
                  type="date"
                  value={dateRange.desde ? dateRange.desde.toISOString().split('T')[0] : ''}
                  onChange={(e) => setDateRange({ ...dateRange, desde: e.target.value ? new Date(e.target.value) : undefined })}
                  className="px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Hasta</label>
                <input
                  type="date"
                  value={dateRange.hasta ? dateRange.hasta.toISOString().split('T')[0] : ''}
                  onChange={(e) => setDateRange({ ...dateRange, hasta: e.target.value ? new Date(e.target.value) : undefined })}
                  className="px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm"
                />
              </div>
              <button
                onClick={() => setShowDatePicker(false)}
                className="px-4 py-2 bg-(--brand-500) hover:bg-(--brand-400) text-white rounded-lg text-sm transition-colors"
              >
                Aplicar
              </button>
            </div>
          </div>
        )}
      </div>

      <Card>
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
              ) : paginatedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8 text-slate-600" />
                      </div>
                      <p className="text-white font-medium mb-1">
                        {searchQuery || statusFilter !== 'all' || docTypeFilter !== 'all' || dateRange.desde || dateRange.hasta
                          ? 'Sin resultados' 
                          : 'Sin facturas registradas'}
                      </p>
                      <p className="text-slate-500 text-sm">
                        {searchQuery || statusFilter !== 'all' || docTypeFilter !== 'all' || dateRange.desde || dateRange.hasta
                          ? 'Intenta con otros filtros' 
                          : 'Las facturas aparecerán aquí cuando las generes'}
                      </p>
                      {(searchQuery || statusFilter !== 'all' || docTypeFilter !== 'all' || dateRange.desde || dateRange.hasta) && (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setStatusFilter('all');
                            setDocTypeFilter('all');
                            setDateRange({});
                          }}
                          className="mt-4 text-(--brand-400) hover:text-(--brand-300) text-sm font-medium transition-colors"
                        >
                          Limpiar filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((invoice) => (
                  <tr
                    key={invoice.localId}
                    className={`border-b border-(--border-color)/50 hover:bg-(--brand-500)/5 transition-colors group ${
                      invoice.estatus === 'ANULADA' ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-white font-medium">
                          {invoice.controlNumber}
                        </span>
                        {invoice.estatus === 'ANULADA' && (
                          <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded uppercase font-bold">
                            ANULADA
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-slate-400 text-sm">
                        {new Date(invoice.createdAt).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
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
                        invoice.estatus === 'EMITIDA'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {invoice.estatus === 'EMITIDA' ? 'Emitida' : 'Anulada'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleViewInvoice(invoice)}
                          className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                          title="Ver factura"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {invoice.estatus === 'EMITIDA' && (
                          <button
                            onClick={() => setInvoiceToCancel(invoice)}
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-(--border-color)">
            <p className="text-sm text-slate-400">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredInvoices.length)} de {filteredInvoices.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                title="Página anterior"
                className="p-2 hover:bg-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-400">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                title="Página siguiente"
                className="p-2 hover:bg-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {selectedInvoice && taxpayerInfo && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl p-8">
              <Loader2 className="w-8 h-8 text-(--brand-400) animate-spin mx-auto" />
              <p className="text-slate-400 mt-2 text-center">Cargando factura...</p>
            </div>
          </div>
        }>
          <InvoicePreview
            invoice={selectedInvoice}
            taxpayerInfo={taxpayerInfo}
            isOpen={true}
            onClose={() => {
              setSelectedInvoice(null);
            }}
          />
        </Suspense>
      )}

      {invoiceToCancel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
                  <Ban className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Anular Factura</h3>
                  <p className="text-sm text-slate-400 font-mono">{invoiceToCancel.controlNumber}</p>
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
                onClick={() => {
                  setInvoiceToCancel(null);
                  setCancelReason('');
                }}
                className="flex-1 px-4 py-2.5 text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCancel}
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
      )}
    </div>
  );
}
