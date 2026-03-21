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
