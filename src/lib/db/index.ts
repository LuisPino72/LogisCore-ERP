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
  createdAt: Date;
  syncedAt?: Date;
}

export interface Purchase {
  id?: number;
  localId: string;
  tenantId: string;
  supplier: string;
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
  note?: string;
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

  constructor() {
    super('LogisCoreERP');
    this.version(7).stores({
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
    });
  }
}

export const db = new LogisCoreDB();

export async function initializeCatalogs(_tenantId: string): Promise<void> {
  // Categorías por defecto desactivadas - cada empresa crea las suyas
}
