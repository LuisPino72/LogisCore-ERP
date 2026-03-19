import { useEffect, useCallback, useState, useMemo } from 'react';
import { useCustomers } from '../hooks/useCustomers';
import { useToast } from '@/providers/ToastProvider';
import Card from '@/common/Card';
import { TableSkeleton } from '@/common/Skeleton';
import { 
  Users, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  IdCard, 
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  ChevronDown,
  FileText,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { Customer, Invoice } from '@/lib/db';
import { formatRif } from '@/features/invoicing/services/invoicing.service';

type StatusFilter = 'all' | 'active' | 'inactive';

export default function CustomersList() {
  const {
    customers,
    isLoading,
    totalCustomers,
    loadCustomers,
    removeCustomer,
    getCustomerHistory,
  } = useCustomers();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerHistory, setCustomerHistory] = useState<Invoice[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const itemsPerPage = 15;

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch = 
        customer.nombreRazonSocial.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.rifCedula.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer.email && customer.email.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'active' && customer.isActive) ||
        (statusFilter === 'inactive' && !customer.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [customers, searchQuery, statusFilter]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredCustomers.length / itemsPerPage);
  }, [filteredCustomers.length]);

  const paginatedCustomers = useMemo(() => {
    return filteredCustomers.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredCustomers, currentPage]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const handleDelete = useCallback(async () => {
    if (!customerToDelete) return;

    const result = await removeCustomer(customerToDelete.localId);
    if (result) {
      setCustomerToDelete(null);
    }
  }, [customerToDelete, removeCustomer]);

  const handleEdit = useCallback((customer: Customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setEditingCustomer(null);
  }, []);

  const handleSelectCustomer = useCallback(async (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowHistory(false);
    setCustomerHistory([]);
  }, []);

  const handleToggleHistory = useCallback(async () => {
    if (showHistory) {
      setShowHistory(false);
      return;
    }

    if (!selectedCustomer) return;

    setShowHistory(true);
    if (customerHistory.length === 0) {
      setLoadingHistory(true);
      const history = await getCustomerHistory(selectedCustomer.localId);
      setCustomerHistory(history);
      setLoadingHistory(false);
    }
  }, [showHistory, selectedCustomer, customerHistory.length, getCustomerHistory]);

  const formatBs = (value: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2" title="Gestionar clientes registrados">
            <Users className="w-6 h-6" />
            Clientes
          </h2>
          <p className="text-slate-400">{totalCustomers} clientes registrados</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          title="Agregar un nuevo cliente"
          className="flex items-center gap-2 px-4 py-2.5 bg-(--brand-500) hover:bg-(--brand-400) text-white rounded-lg transition-colors shadow-lg shadow-(--brand-500)/20"
        >
          <Plus className="w-4 h-4" />
          Nuevo Cliente
        </button>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, RIF o email..."
              title="Buscar clientes por nombre, RIF o email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              title="Filtrar por estado del cliente"
              className="px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-(--brand-500) cursor-pointer"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </div>

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
              ) : paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                        <Users className="w-8 h-8 text-slate-600" />
                      </div>
                      <p className="text-white font-medium mb-1">
                        {searchQuery || statusFilter !== 'all' 
                          ? 'Sin resultados' 
                          : 'Sin clientes registrados'}
                      </p>
                      <p className="text-slate-500 text-sm">
                        {searchQuery || statusFilter !== 'all' 
                          ? 'Intenta con otros filtros' 
                          : 'Agrega clientes para comenzar a gestionar tu lista'}
                      </p>
                      {(searchQuery || statusFilter !== 'all') ? (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setStatusFilter('all');
                          }}
                          title="Limpiar búsqueda y filtros"
                          className="mt-4 text-(--brand-400) hover:text-(--brand-300) text-sm font-medium transition-colors"
                        >
                          Limpiar filtros
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowForm(true)}
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
              ) : (
                paginatedCustomers.map((customer) => (
                  <tr
                    key={customer.localId}
                    className="border-b border-(--border-color)/50 hover:bg-(--brand-500)/5 transition-colors group"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-slate-400" />
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
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {customer.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleSelectCustomer(customer)}
                          className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(customer)}
                          className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCustomerToDelete(customer)}
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-(--border-color)">
            <p className="text-sm text-slate-400">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredCustomers.length)} de {filteredCustomers.length}
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

      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color)">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-(--brand-400)" />
                Detalles del Cliente
              </h3>
              <button
                onClick={() => setSelectedCustomer(null)}
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
                  <h4 className="text-lg font-semibold text-white">{selectedCustomer.nombreRazonSocial}</h4>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      selectedCustomer.isActive
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {selectedCustomer.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <IdCard className="w-5 h-5 text-slate-500 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase">RIF/Cédula</p>
                    <p className="text-white font-mono">{formatRif(selectedCustomer.rifCedula)}</p>
                  </div>
                </div>

                {selectedCustomer.telefono && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-slate-500 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Teléfono</p>
                      <p className="text-white">{selectedCustomer.telefono}</p>
                    </div>
                  </div>
                )}

                {selectedCustomer.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-slate-500 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Email</p>
                      <p className="text-white">{selectedCustomer.email}</p>
                    </div>
                  </div>
                )}

                {selectedCustomer.direccion && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Dirección</p>
                      <p className="text-white">{selectedCustomer.direccion}</p>
                    </div>
                  </div>
                )}

                {selectedCustomer.notas && (
                  <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                    <div>
                      <p className="text-xs text-amber-500 uppercase font-medium">Notas</p>
                      <p className="text-slate-300 text-sm mt-1">{selectedCustomer.notas}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-(--border-color) pt-4 mt-4">
                <button
                  onClick={handleToggleHistory}
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
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showHistory ? 'rotate-180' : ''}`} 
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
                              {invoice.estatus === 'EMITIDA' ? (
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                              )}
                              <div>
                                <p className="text-white text-sm font-mono">{invoice.controlNumber}</p>
                                <p className="text-xs text-slate-500">
                                  {new Date(invoice.createdAt).toLocaleDateString('es-ES')}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-medium ${invoice.estatus === 'EMITIDA' ? 'text-green-400' : 'text-slate-500'}`}>
                                {formatBs(invoice.totalFinalBs)}
                              </p>
                              <p className="text-xs text-slate-500">
                                {invoice.estatus === 'EMITIDA' ? 'Emitida' : 'Anulada'}
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
                              Total acumulado: <span className="text-green-400 font-medium">{formatBs(customerHistory.filter(i => i.estatus === 'EMITIDA').reduce((sum, i) => sum + i.totalFinalBs, 0))}</span>
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
                  Creado: {new Date(selectedCustomer.createdAt).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-(--border-color) bg-slate-800/30">
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  handleEdit(selectedCustomer);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-(--brand-500) hover:bg-(--brand-400) text-white rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Editar
              </button>
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setCustomerToDelete(selectedCustomer);
                }}
                className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {customerToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">¿Eliminar cliente?</h3>
              <p className="text-slate-400">
                Estás a punto de eliminar a <strong className="text-white">{customerToDelete.nombreRazonSocial}</strong>. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex gap-3 p-4 border-t border-(--border-color)">
              <button
                onClick={() => setCustomerToDelete(null)}
                className="flex-1 px-4 py-2.5 text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <CustomerFormModal
          customer={editingCustomer}
          onClose={handleCloseForm}
          onSave={() => {
            handleCloseForm();
            loadCustomers();
          }}
        />
      )}
    </div>
  );
}

interface CustomerFormModalProps {
  customer: Customer | null;
  onClose: () => void;
  onSave: () => void;
}

function CustomerFormModal({ customer, onClose, onSave }: CustomerFormModalProps) {
  const { showSuccess, showError } = useToast();
  const { addCustomer, editCustomer } = useCustomers();

  const [form, setForm] = useState({
    nombreRazonSocial: customer?.nombreRazonSocial || '',
    rifCedula: customer?.rifCedula || '',
    direccion: customer?.direccion || '',
    telefono: customer?.telefono || '',
    email: customer?.email || '',
    notas: customer?.notas || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nombreRazonSocial.trim()) {
      showError('El nombre es requerido');
      return;
    }

    if (!form.rifCedula.trim()) {
      showError('El RIF/Cédula es requerido');
      return;
    }

    setSaving(true);
    try {
      if (customer) {
        const result = await editCustomer(customer.localId, form);
        if (result) {
          showSuccess('Cliente actualizado');
          onSave();
        }
      } else {
        const result = await addCustomer(form);
        if (result) {
          showSuccess('Cliente creado');
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
                  {customer ? 'Guardar Cambios' : 'Crear Cliente'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
