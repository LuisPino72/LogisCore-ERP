import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/providers/ToastProvider';
import {
  createInvoice,
  getInvoice,
  getInvoices,
  annulInvoice,
  getTaxpayerInfo,
  saveTaxpayerInfo,
  getInvoiceSettings,
  saveInvoiceSettings,
  isInvoicingEnabled,
  calculateTotals,
} from '../services/invoicing.service';
import type { Invoice, TaxpayerInfo, InvoiceSettings, InvoiceFilters, InvoiceTotals } from '../types/invoicing.types';
import type { CreateInvoiceInput, CreateInvoiceItemInput } from '../types/invoicing.types';
import { getExchangeRate } from '@/features/exchange-rate/services/exchangeRate.service';

interface UseInvoicingReturn {
  isEnabled: boolean;
  isLoading: boolean;
  taxpayerInfo: TaxpayerInfo | null;
  invoiceSettings: InvoiceSettings | null;
  invoices: Invoice[];
  selectedInvoice: Invoice | null;

  checkEnabled: () => Promise<boolean>;
  loadTaxpayerInfo: () => Promise<void>;
  saveTaxpayer: (data: Omit<TaxpayerInfo, 'id' | 'syncedAt'>) => Promise<boolean>;
  loadSettings: () => Promise<void>;
  updateSettings: (data: Partial<InvoiceSettings>) => Promise<boolean>;
  generateInvoice: (input: CreateInvoiceInput) => Promise<string | null>;
  loadInvoice: (localId: string) => Promise<Invoice | null>;
  loadInvoices: (filters?: InvoiceFilters) => Promise<void>;
  cancelInvoice: (localId: string, reason: string) => Promise<boolean>;
  calculatePreviewTotals: (items: CreateInvoiceItemInput[]) => Promise<InvoiceTotals | null>;
}

export function useInvoicing(): UseInvoicingReturn {
  const { showSuccess, showError } = useToast();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [taxpayerInfo, setTaxpayerInfo] = useState<TaxpayerInfo | null>(null);
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const loadInvoicesRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const checkEnabled = useCallback(async (): Promise<boolean> => {
    const enabled = await isInvoicingEnabled();
    setIsEnabled(enabled);
    return enabled;
  }, []);

  const loadTaxpayerInfo = useCallback(async (): Promise<void> => {
    const result = await getTaxpayerInfo();
    if (result.ok) {
      setTaxpayerInfo(result.value);
    }
  }, []);

  const saveTaxpayer = useCallback(async (data: Omit<TaxpayerInfo, 'id' | 'syncedAt'>): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await saveTaxpayerInfo(data);
      if (result.ok) {
        await loadTaxpayerInfo();
        await checkEnabled();
        showSuccess('Datos fiscales guardados correctamente');
        return true;
      }
      showError('Error al guardar: ' + (result.error.message || 'Error desconocido'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadTaxpayerInfo, checkEnabled, showSuccess, showError]);

  const loadSettings = useCallback(async (): Promise<void> => {
    const result = await getInvoiceSettings();
    if (result.ok) {
      setInvoiceSettings(result.value);
    }
  }, []);

  const updateSettings = useCallback(async (data: Partial<InvoiceSettings>): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await saveInvoiceSettings(data);
      if (result.ok) {
        await loadSettings();
        showSuccess('Configuración guardada');
        return true;
      }
      showError('Error al guardar configuración');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadSettings, showSuccess, showError]);

  const generateInvoice = useCallback(async (input: CreateInvoiceInput): Promise<string | null> => {
    setIsLoading(true);
    try {
      const result = await createInvoice(input);
      if (result.ok) {
        showSuccess('Factura generada correctamente');
        loadInvoicesRef.current?.();
        return result.value;
      }
      showError('Error: ' + (result.error.message || 'No se pudo crear la factura'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [showSuccess, showError]);

  const loadInvoice = useCallback(async (localId: string): Promise<Invoice | null> => {
    setIsLoading(true);
    try {
      const result = await getInvoice(localId);
      if (result.ok) {
        setSelectedInvoice(result.value);
        return result.value;
      }
      showError('Factura no encontrada');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  const loadInvoices = useCallback(async (filters?: InvoiceFilters): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await getInvoices(filters);
      if (result.ok) {
        setInvoices(result.value);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancelInvoice = useCallback(async (localId: string, reason: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await annulInvoice(localId, reason);
      if (result.ok) {
        showSuccess('Factura anulada');
        loadInvoicesRef.current?.();
        return true;
      }
      showError('Error: ' + (result.error.message || 'No se pudo anular'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [showSuccess, showError]);

  const calculatePreviewTotals = useCallback(async (items: CreateInvoiceItemInput[]): Promise<InvoiceTotals | null> => {
    try {
      const exchangeRateResult = await getExchangeRate();
      const tasaBcv = exchangeRateResult.ok && exchangeRateResult.value ? exchangeRateResult.value.rate : 36.5;
      
      const settings = invoiceSettings || { igtfEnabled: true, igtfPercentage: 3 };
      
      const transformedItems = items.map((item) => ({
        codigo: item.codigo || '',
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        unidad: item.unidad || 'UND',
        precioUnitarioUsd: item.precioUnitarioUsd,
        tasaBcvItem: tasaBcv,
        alicuotaIva: item.alicuotaIva || 16,
        exento: item.exento || false,
        totalBs: 0,
      }));

      return calculateTotals(transformedItems, tasaBcv, settings.igtfEnabled, settings.igtfPercentage);
    } catch {
      return null;
    }
  }, [invoiceSettings]);

  loadInvoicesRef.current = loadInvoices;

  useEffect(() => {
    checkEnabled();
    loadTaxpayerInfo();
    loadSettings();
  }, [checkEnabled, loadTaxpayerInfo, loadSettings]);

  return {
    isEnabled,
    isLoading,
    taxpayerInfo,
    invoiceSettings,
    invoices,
    selectedInvoice,
    checkEnabled,
    loadTaxpayerInfo,
    saveTaxpayer,
    loadSettings,
    updateSettings,
    generateInvoice,
    loadInvoice,
    loadInvoices,
    cancelInvoice,
    calculatePreviewTotals,
  };
}
