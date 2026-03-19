import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/providers/ToastProvider';
import { isInvoicingEnabled, createInvoice, getInvoice, getTaxpayerInfo } from '../services/invoicing.service';
import type { Invoice, TaxpayerInfo, CreateInvoiceItemInput } from '../types/invoicing.types';
import type { CartItem } from '@/features/pos/services/pos.service';
import { prepareSaleItems, type SaleItem } from '@/features/pos/services/pos.service';

interface PendingData {
  cart: CartItem[];
  saleId: string;
}

interface UseInvoicingForPOSReturn {
  isEnabled: boolean;
  isLoading: boolean;
  showCustomerSelector: boolean;
  showInvoicePreview: boolean;
  invoice: Invoice | null;
  taxpayerInfo: TaxpayerInfo | null;

  init: () => Promise<void>;
  openCustomerSelector: () => void;
  closeCustomerSelector: () => void;
  onCustomerSelected: (data: {
    useCatalog: boolean;
    customer?: { localId: string; nombreRazonSocial: string; rifCedula: string; direccion?: string; telefono?: string };
    manualData?: { nombre: string; rifCedula: string; direccion?: string; telefono?: string };
  }) => Promise<void>;
  closeInvoicePreview: () => void;
  reloadInvoice: (localId: string) => Promise<void>;
  prepareAndOpen: (cart: CartItem[], saleId: string) => void;
}

export function useInvoicingForPOS(): UseInvoicingForPOSReturn {
  const { showSuccess, showError } = useToast();
  
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [taxpayerInfo, setTaxpayerInfo] = useState<TaxpayerInfo | null>(null);
  
  const pendingDataRef = useRef<PendingData | null>(null);

  const init = useCallback(async (): Promise<void> => {
    const enabled = await isInvoicingEnabled();
    setIsEnabled(enabled);
    
    if (enabled) {
      const taxpayerResult = await getTaxpayerInfo();
      if (taxpayerResult.ok && taxpayerResult.value) {
        setTaxpayerInfo(taxpayerResult.value);
      }
    }
  }, []);

  const prepareAndOpen = useCallback((cart: CartItem[], saleId: string) => {
    if (!isEnabled) return;
    pendingDataRef.current = { cart, saleId };
    setShowCustomerSelector(true);
  }, [isEnabled]);

  const openCustomerSelector = useCallback(() => {
    if (!isEnabled) return;
    setShowCustomerSelector(true);
  }, [isEnabled]);

  const closeCustomerSelector = useCallback(() => {
    setShowCustomerSelector(false);
  }, []);

  const onCustomerSelected = useCallback(async (data: {
    useCatalog: boolean;
    customer?: { localId: string; nombreRazonSocial: string; rifCedula: string; direccion?: string; telefono?: string };
    manualData?: { nombre: string; rifCedula: string; direccion?: string; telefono?: string };
  }) => {
    if (!data.customer && !data.manualData) return;
    if (!pendingDataRef.current) return;

    const { cart, saleId } = pendingDataRef.current;

    setShowCustomerSelector(false);
    setIsLoading(true);

    try {
      const customerData = data.useCatalog && data.customer
        ? data.customer
        : data.manualData!;

      const customerId = data.useCatalog && data.customer ? data.customer.localId : undefined;
      
      const saleItems: SaleItem[] = prepareSaleItems(cart);
      
      const invoiceItems: CreateInvoiceItemInput[] = saleItems.map((item) => ({
        codigo: item.productId,
        descripcion: item.productName,
        cantidad: item.quantity,
        unidad: item.unit,
        precioUnitarioUsd: item.unitPrice,
        alicuotaIva: 16,
        exento: false,
      }));

      const clienteNombre = 'nombreRazonSocial' in customerData 
        ? customerData.nombreRazonSocial 
        : (customerData as { nombre?: string }).nombre || '';

      const result = await createInvoice({
        tipoDocumento: 'FACTURA',
        clienteNombre,
        clienteRifCedula: customerData.rifCedula,
        clienteDireccion: customerData.direccion,
        clienteTelefono: customerData.telefono,
        customerId,
        items: invoiceItems,
        saleId,
      });

      if (result.ok) {
        const invoiceResult = await getInvoice(result.value);
        if (invoiceResult.ok) {
          setInvoice(invoiceResult.value);
          setShowInvoicePreview(true);
          showSuccess('Factura generada correctamente');
        }
      } else {
        showError('Error al generar factura: ' + (result.error.message || 'Error desconocido'));
      }
    } finally {
      setIsLoading(false);
      pendingDataRef.current = null;
    }
  }, [showSuccess, showError]);

  const closeInvoicePreview = useCallback(() => {
    setShowInvoicePreview(false);
    setInvoice(null);
  }, []);

  const reloadInvoice = useCallback(async (localId: string) => {
    setIsLoading(true);
    try {
      const result = await getInvoice(localId);
      if (result.ok) {
        setInvoice(result.value);
        setShowInvoicePreview(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  return {
    isEnabled,
    isLoading,
    showCustomerSelector,
    showInvoicePreview,
    invoice,
    taxpayerInfo,
    init,
    openCustomerSelector,
    closeCustomerSelector,
    onCustomerSelected,
    closeInvoicePreview,
    reloadInvoice,
    prepareAndOpen,
  };
}
