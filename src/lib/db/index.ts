import Dexie, { Table } from 'dexie';

export type SaleType = 'unit' | 'weight' | 'sample';

export interface Sample {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface SyncQueueItem {
  id?: number;
  tableName: string;
  operation: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  localId: string;
  tenantId: string;
  tenantUuid?: string;
  status: 'pending' | 'syncing' | 'failed' | 'conflict' | 'synced';
  errorMessage?: string;
  createdAt: Date;
  syncedAt?: Date;
  retryCount: number;
}

export interface Product {
  id?: number;
  localId: string;
  tenantId: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  categoryId?: number;
  imageUrl?: string;
  isFavorite?: boolean;
  isActive: boolean;
  pricePerKg?: number;
  samples?: Sample[];
  createdAt: Date;
  updatedAt: Date;
  syncedAt?: Date;
}

export interface Category {
  id?: number;
  localId: string;
  tenantId: string;
  name: string;
  description?: string;
  saleType: SaleType;
  createdAt: Date;
  syncedAt?: Date;
}

export interface TenantSetting {
  key: string;
  value: unknown;
  tenantId: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: 'kg' | 'g' | 'unit' | 'carton' | 'half';
  unitPrice: number;
  total: number;
}

export interface Sale {
  id?: number;
  localId: string;
  tenantId: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  total: number;
  exchangeRate: number;
  exchangeRateSource: 'api' | 'manual';
  paymentMethod: 'cash' | 'card' | 'pago_movil';
  status: 'completed' | 'cancelled' | 'refunded';
  customerId?: string;
  createdAt: Date;
  syncedAt?: Date;
}

export interface Purchase {
  id?: number;
  localId: string;
  tenantId: string;
  supplier: string;
  supplierId?: string;
  invoiceNumber: string;
  items: { productId: string; productName: string; quantity: number; cost: number; total: number }[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: Date;
  syncedAt?: Date;
}

export interface Recipe {
  id?: number;
  localId: string;
  tenantId: string;
  name: string;
  description?: string;
  productId: string;
  ingredients: { productId: string; quantity: number; unit: string }[];
  yield: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  syncedAt?: Date;
}

export interface ProductionLog {
  id?: number;
  localId: string;
  tenantId: string;
  recipeId: string;
  quantity: number;
  ingredientsUsed: { productId: string; quantity: number }[];
  createdAt: Date;
  syncedAt?: Date;
}

export interface Supplier {
  id?: number;
  localId: string;
  tenantId: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  syncedAt?: Date;
}

export interface Employee {
  id?: number;
  localId: string;
  tenantId: string;
  userId: string;
  role: string;
  permissions: Record<string, unknown>;
  createdAt: Date;
  updatedAt?: Date;
  syncedAt?: Date;
}

export interface SuspendedSale {
  id?: number;
  localId: string;
  tenantId: string;
  cart: { productId: string; productName: string; quantity: number; unit: 'kg' | 'g' | 'unit' | 'carton' | 'half'; unitPrice: number; total: number; productSnapshot: Product }[];
  createdAt: Date;
  updatedAt: Date;
  note?: string;
}

export interface TaxpayerInfo {
  id?: number;
  localId: string;
  tenantId: string;
  rif: string;
  razonSocial: string;
  direccionFiscal: string;
  numeroProvidencia: string;
  logoUrl?: string;
  syncedAt?: Date;
}

export interface Customer {
  id?: number;
  localId: string;
  tenantId: string;
  nombreRazonSocial: string;
  rifCedula: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  notas?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
  syncedAt?: Date;
}

export interface InvoiceSettings {
  id?: number;
  localId: string;
  tenantId: string;
  sequentialType: 'daily' | 'monthly' | 'global';
  lastInvoiceDate?: string;
  lastInvoiceNumber: number;
  lastControlPrefix: string;
  igtfEnabled: boolean;
  igtfPercentage: number;
  syncedAt?: Date;
}

export interface InvoiceItem {
  codigo: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  precioUnitarioUsd: number;
  tasaBcvItem: number;
  alicuotaIva: 0 | 8 | 16;
  exento: boolean;
  totalBs: number;
}

export interface Invoice {
  id?: number;
  localId: string;
  tenantId: string;
  invoiceNumber: string;
  controlNumber: string;
  tipoDocumento: 'FACTURA' | 'NOTA_CREDITO' | 'NOTA_DEBITO';
  estatus: 'EMITIDA' | 'ANULADA';
  emisorRif: string;
  emisorRazonSocial: string;
  emisorDireccion: string;
  emisorNumeroProvidencia?: string;
  customerId?: string;
  clienteNombre: string;
  clienteRifCedula: string;
  clienteDireccion?: string;
  clienteTelefono?: string;
  subtotalUsd: number;
  tasaBcv: number;
  baseImponibleBs: number;
  montoIvaBs: number;
  montoExentoBs: number;
  totalBs: number;
  aplicaIgtf: boolean;
  montoIgtfBs?: number;
  totalFinalBs: number;
  saleId?: string;
  createdBy?: string;
  createdAt: Date;
  annulledAt?: Date;
  annulledBy?: string;
  annulledReason?: string;
  hashSeguridad?: string;
  syncedAt?: Date;
  items: InvoiceItem[];
}

export type MovementType = 'income' | 'expense' | 'transfer';
export type MovementCategory = 
  | 'sale' 
  | 'purchase' 
  | 'production' 
  | 'refund' 
  | 'adjustment' 
  | 'salary' 
  | 'rent' 
  | 'utilities' 
  | 'investment' 
  | 'transfer'
  | 'other';
export type MovementStatus = 'pending' | 'completed' | 'cancelled';
export type MovementPaymentMethod = 'cash' | 'card' | 'pago_movil' | 'bank_transfer';

export interface Movement {
  id?: number;
  localId: string;
  tenantId: string;
  type: MovementType;
  category: MovementCategory;
  referenceType?: string;
  referenceId?: string;
  amount: number;
  currency: string;
  paymentMethod?: MovementPaymentMethod;
  description?: string;
  status: MovementStatus;
  createdAt: Date;
  syncedAt?: Date;
}

class LogisCoreDB extends Dexie {
  syncQueue!: Table<SyncQueueItem>;
  products!: Table<Product>;
  categories!: Table<Category>;
  settings!: Table<TenantSetting>;
  sales!: Table<Sale>;
  employees!: Table<Employee>;
  purchases!: Table<Purchase>;
  recipes!: Table<Recipe>;
  productionLogs!: Table<ProductionLog>;
  suppliers!: Table<Supplier>;
  suspendedSales!: Table<SuspendedSale>;
  taxpayerInfo!: Table<TaxpayerInfo>;
  customers!: Table<Customer>;
  invoiceSettings!: Table<InvoiceSettings>;
  invoices!: Table<Invoice>;
  movements!: Table<Movement>;

  constructor() {
    super('LogisCoreERP');
    this.version(10).stores({
      syncQueue: '++id, localId, tableName, status, tenantId, createdAt',
      products: '++id, localId, tenantId, sku, categoryId, isActive, name',
      categories: '++id, localId, tenantId, name, saleType',
      settings: '[tenantId+key]',
      sales: '++id, localId, tenantId, status, createdAt, paymentMethod',
      purchases: '++id, localId, tenantId, status, createdAt, supplier',
      recipes: '++id, localId, tenantId, isActive, productId',
      productionLogs: '++id, localId, tenantId, recipeId, createdAt',
      suppliers: '++id, localId, tenantId, name, isActive',
      employees: '++id, localId, tenantId, role',
      suspendedSales: '++id, localId, tenantId, createdAt',
      taxpayerInfo: '++id, localId, tenantId',
      customers: '++id, localId, tenantId, rifCedula, isActive',
      invoiceSettings: '++id, localId, tenantId',
      invoices: '++id, localId, tenantId, customerId, invoiceNumber, controlNumber, estatus, createdAt, saleId',
      movements: '++id, localId, tenantId, type, category, status, createdAt',
    });
  }
}

export const db = new LogisCoreDB();

export async function initializeCatalogs(_tenantId: string): Promise<void> {
  // Categorías por defecto desactivadas - cada empresa crea las suyas
}
