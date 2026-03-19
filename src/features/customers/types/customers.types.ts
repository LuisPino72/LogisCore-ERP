import type { Customer } from '@/lib/db';

export type { Customer };

export interface CreateCustomerInput {
  nombreRazonSocial: string;
  rifCedula: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  notas?: string;
}

export interface UpdateCustomerInput {
  nombreRazonSocial?: string;
  rifCedula?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  notas?: string;
  isActive?: boolean;
}

export interface CustomerFilters {
  search?: string;
  isActive?: boolean;
}

export const DEFAULT_CUSTOMER = {
  nombre: 'CONSUMIDOR FINAL',
  rifCedula: 'V-00000000-0',
  direccion: '',
  telefono: '',
} as const;
