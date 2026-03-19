import { useState, useEffect, useCallback } from 'react';
import { Search, Building, Check } from 'lucide-react';
import { db, Customer } from '@/lib/db';
import { useTenantStore } from '@/store/useTenantStore';
import { DEFAULT_CUSTOMER } from '../types/invoicing.types';

interface CustomerSelectorProps {
  onSelect: (data: {
    useCatalog: boolean;
    customer?: Customer;
    manualData?: { nombre: string; rifCedula: string; direccion: string; telefono: string };
  }) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function CustomerSelector({ onSelect, onClose, isOpen }: CustomerSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [useCatalog, setUseCatalog] = useState(true);
  const [manualData, setManualData] = useState({
    nombre: '',
    rifCedula: '',
    direccion: '',
    telefono: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const { currentTenant } = useTenantStore.getState();

  const loadCustomers = useCallback(async () => {
    if (!currentTenant) return;
    
    setIsLoading(true);
    try {
      const query = db.customers
        .where('tenantId')
        .equals(currentTenant.slug)
        .filter((c) => c.isActive);

      const allCustomers = await query.toArray();

      if (searchQuery.trim()) {
        const search = searchQuery.toLowerCase();
        setCustomers(
          allCustomers.filter(
            (c) =>
              c.nombreRazonSocial.toLowerCase().includes(search) ||
              c.rifCedula.toLowerCase().includes(search)
          )
        );
      } else {
        setCustomers(allCustomers.slice(0, 10));
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant, searchQuery]);

  useEffect(() => {
    if (isOpen && useCatalog) {
      loadCustomers();
    }
  }, [isOpen, useCatalog, loadCustomers]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setUseCatalog(true);
  };

  const handleUseConsumidorFinal = () => {
    const consumidorFinal: Customer = {
      localId: 'consumidor-final',
      tenantId: currentTenant?.slug || '',
      nombreRazonSocial: DEFAULT_CUSTOMER.nombre,
      rifCedula: DEFAULT_CUSTOMER.rifCedula,
      isActive: true,
      createdAt: new Date(),
    } as Customer;
    setSelectedCustomer(consumidorFinal);
    setUseCatalog(true);
  };

  const handleConfirm = () => {
    if (useCatalog && selectedCustomer) {
      onSelect({
        useCatalog: true,
        customer: selectedCustomer,
      });
    } else if (!useCatalog) {
      if (!manualData.nombre.trim() || !manualData.rifCedula.trim()) {
        return;
      }
      onSelect({
        useCatalog: false,
        manualData,
      });
    }
    onClose();
  };

  const handleModeToggle = (mode: 'catalog' | 'manual') => {
    setUseCatalog(mode === 'catalog');
    if (mode === 'catalog') {
      setSelectedCustomer(null);
      loadCustomers();
    } else {
      setSelectedCustomer(null);
      setManualData({
        nombre: '',
        rifCedula: '',
        direccion: '',
        telefono: '',
      });
    }
  };

  const isValidRif = (rif: string) => {
    return /^[JGVEPG]-?\d{7,8}-?\d$/i.test(rif.replace(/\s/g, ''));
  };

  const isManualFormValid = manualData.nombre.trim() && isValidRif(manualData.rifCedula);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Building className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Datos del Cliente</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="sr-only">Cerrar</span>
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex border-b border-gray-200">
          <button
            onClick={() => handleModeToggle('catalog')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              useCatalog
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Catálogo
          </button>
          <button
            onClick={() => handleModeToggle('manual')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              !useCatalog
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Ingresar Manualmente
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {useCatalog ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o RIF..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <button
                onClick={handleUseConsumidorFinal}
                className={`w-full p-3 rounded-lg border transition-colors text-left ${
                  selectedCustomer?.localId === 'consumidor-final'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">CONSUMIDOR FINAL</p>
                    <p className="text-sm text-gray-500">V-00000000-0</p>
                  </div>
                  {selectedCustomer?.localId === 'consumidor-final' && (
                    <Check className="w-5 h-5 text-blue-600" />
                  )}
                </div>
              </button>

              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Cargando clientes...</div>
              ) : customers.length === 0 && searchQuery ? (
                <div className="text-center py-8 text-gray-500">
                  No se encontraron clientes
                </div>
              ) : (
                customers.map((customer) => (
                  <button
                    key={customer.localId}
                    onClick={() => handleSelectCustomer(customer)}
                    className={`w-full p-3 rounded-lg border transition-colors text-left ${
                      selectedCustomer?.localId === customer.localId
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{customer.nombreRazonSocial}</p>
                        <p className="text-sm text-gray-500">{customer.rifCedula}</p>
                        {customer.direccion && (
                          <p className="text-xs text-gray-400 mt-1 truncate">{customer.direccion}</p>
                        )}
                      </div>
                      {selectedCustomer?.localId === customer.localId && (
                        <Check className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre / Razón Social *
                </label>
                <input
                  type="text"
                  value={manualData.nombre}
                  onChange={(e) => setManualData({ ...manualData, nombre: e.target.value })}
                  placeholder="Nombre del cliente"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  RIF / Cédula * (formato: J-12345678-9)
                </label>
                <input
                  type="text"
                  value={manualData.rifCedula}
                  onChange={(e) => setManualData({ ...manualData, rifCedula: e.target.value })}
                  placeholder="V-12345678-9"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {manualData.rifCedula && !isValidRif(manualData.rifCedula) && (
                  <p className="text-xs text-red-500 mt-1">Formato de RIF/Cédula inválido</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección
                </label>
                <textarea
                  value={manualData.direccion}
                  onChange={(e) => setManualData({ ...manualData, direccion: e.target.value })}
                  placeholder="Dirección fiscal"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={manualData.telefono}
                  onChange={(e) => setManualData({ ...manualData, telefono: e.target.value })}
                  placeholder="0412-0000000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={
              useCatalog
                ? !selectedCustomer
                : !isManualFormValid
            }
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomerSelector;
