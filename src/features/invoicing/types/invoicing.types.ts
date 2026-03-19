import type { Invoice, InvoiceItem, TaxpayerInfo, Customer, InvoiceSettings } from '@/lib/db';

export type { Invoice, InvoiceItem, TaxpayerInfo, Customer, InvoiceSettings };

export type TipoDocumento = 'FACTURA' | 'NOTA_CREDITO' | 'NOTA_DEBITO';
export type EstatusDocumento = 'EMITIDA' | 'ANULADA';
export type SequentialType = 'daily' | 'monthly' | 'global';
export type AlicuotaIva = 0 | 8 | 16;

export interface CreateInvoiceInput {
  tipoDocumento?: TipoDocumento;
  clienteNombre: string;
  clienteRifCedula: string;
  clienteDireccion?: string;
  clienteTelefono?: string;
  customerId?: string;
  items: CreateInvoiceItemInput[];
  saleId?: string;
}

export interface CreateInvoiceItemInput {
  codigo: string;
  descripcion: string;
  cantidad: number;
  unidad?: string;
  precioUnitarioUsd: number;
  alicuotaIva?: AlicuotaIva;
  exento?: boolean;
}

export interface InvoiceTotals {
  subtotalUsd: number;
  tasaBcv: number;
  baseImponibleBs: number;
  montoIvaBs: number;
  montoExentoBs: number;
  totalBs: number;
  aplicaIgtf: boolean;
  montoIgtfBs: number;
  totalFinalBs: number;
}

export interface CustomerSelectorData {
  useCatalog: boolean;
  selectedCustomer?: Customer;
  manualData?: {
    nombre: string;
    rifCedula: string;
    direccion?: string;
    telefono?: string;
  };
}

export interface InvoicePreviewData {
  invoice: Invoice;
  taxpayerInfo: TaxpayerInfo;
  totals: InvoiceTotals;
}

export interface AnnulInvoiceInput {
  reason: string;
}

export interface InvoiceFilters {
  estatus?: EstatusDocumento;
  tipoDocumento?: TipoDocumento;
  fechaDesde?: Date;
  fechaHasta?: Date;
  cliente?: string;
  invoiceNumber?: string;
}

export interface NumerationResult {
  invoiceNumber: string;
  controlNumber: string;
}

export const DEFAULT_CUSTOMER = {
  nombre: 'CONSUMIDOR FINAL',
  rifCedula: 'V-00000000-0',
  direccion: '',
  telefono: '',
};

export const IVA_PERCENTAGES = {
  GENERAL: 16,
  REDUCIDA: 8,
  EXENTO: 0,
} as const;

export const IGTF_PERCENTAGE = 3;

export const PROVIDENCIA_LEYENDA = {
  '0071': 'Providencia Administrativa N° 0071 del 14 de febrero de 2006, que establece las normas que regulan la emisión de documentos de validación fiscal en formato libre.',
  '0102': 'Providencia Administrativa N° 0102 del 15 de diciembre de 2022, que establece los requisitos para la emisión de documentos de validación fiscal.',
} as const;
