import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/providers/ToastProvider';
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
  getCustomerCount,
} from '../services/customers.service';
import { getInvoicesByCustomer } from '@/features/invoicing/services/invoicing.service';
import type { Customer } from '@/lib/db';
import type { Invoice } from '@/lib/db';
import type { CreateCustomerInput, UpdateCustomerInput, CustomerFilters } from '../types/customers.types';

interface UseCustomersReturn {
  customers: Customer[];
  isLoading: boolean;
  error: string | null;
  totalCustomers: number;

  loadCustomers: (filters?: CustomerFilters) => Promise<void>;
  loadCustomer: (localId: string) => Promise<Customer | null>;
  addCustomer: (data: CreateCustomerInput) => Promise<string | null>;
  editCustomer: (localId: string, data: UpdateCustomerInput) => Promise<boolean>;
  removeCustomer: (localId: string) => Promise<boolean>;
  search: (query: string) => Promise<Customer[]>;
  refreshCount: () => Promise<void>;
  getCustomerHistory: (customerId: string) => Promise<Invoice[]>;
}

export function useCustomers(): UseCustomersReturn {
  const { showSuccess, showError } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCustomers, setTotalCustomers] = useState(0);

  const loadCustomers = useCallback(async (filters?: CustomerFilters): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getCustomers(filters);
      if (result.ok) {
        setCustomers(result.value);
      } else {
        setError(result.error.message);
        showError('Error al cargar clientes');
      }
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  const loadCustomer = useCallback(async (localId: string): Promise<Customer | null> => {
    setIsLoading(true);
    try {
      const result = await getCustomer(localId);
      if (result.ok) {
        return result.value;
      }
      showError('Cliente no encontrado');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  const refreshCount = useCallback(async (): Promise<void> => {
    const result = await getCustomerCount();
    if (result.ok) {
      setTotalCustomers(result.value);
    }
  }, []);

  const addCustomer = useCallback(async (data: CreateCustomerInput): Promise<string | null> => {
    setIsLoading(true);
    try {
      const result = await createCustomer(data);
      if (result.ok) {
        showSuccess('Cliente creado exitosamente');
        await loadCustomers();
        await refreshCount();
        return result.value;
      }
      showError(result.error.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [loadCustomers, refreshCount, showSuccess, showError]);

  const editCustomer = useCallback(async (localId: string, data: UpdateCustomerInput): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await updateCustomer(localId, data);
      if (result.ok) {
        showSuccess('Cliente actualizado');
        await loadCustomers();
        return true;
      }
      showError(result.error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadCustomers, showSuccess, showError]);

  const removeCustomer = useCallback(async (localId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await deleteCustomer(localId);
      if (result.ok) {
        showSuccess('Cliente eliminado');
        await loadCustomers();
        await refreshCount();
        return true;
      }
      showError(result.error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadCustomers, refreshCount, showSuccess, showError]);

  const search = useCallback(async (query: string): Promise<Customer[]> => {
    try {
      const result = await searchCustomers(query);
      if (result.ok) {
        return result.value;
      }
      return [];
    } catch {
      return [];
    }
  }, []);

  const getCustomerHistory = useCallback(async (customerId: string): Promise<Invoice[]> => {
    try {
      const result = await getInvoicesByCustomer(customerId);
      if (result.ok) {
        return result.value;
      }
      return [];
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    loadCustomers();
    refreshCount();
  }, [loadCustomers, refreshCount]);

  return {
    customers,
    isLoading,
    error,
    totalCustomers,
    loadCustomers,
    loadCustomer,
    addCustomer,
    editCustomer,
    removeCustomer,
    search,
    refreshCount,
    getCustomerHistory,
  };
}
