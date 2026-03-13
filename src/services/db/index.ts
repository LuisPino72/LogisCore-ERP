import Dexie, { Table } from 'dexie';

export interface SyncQueueItem {
  id?: number;
  tableName: string;
  operation: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  localId: string;
  tenantId: string;
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
  isActive: boolean;
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
  createdAt: Date;
  syncedAt?: Date;
}

export interface TenantSetting {
  key: string;
  value: unknown;
  tenantId: string;
}

export interface Sale {
  id?: number;
  localId: string;
  tenantId: string;
  items: { productId: string; productName: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card';
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

class LogisCoreDB extends Dexie {
  syncQueue!: Table<SyncQueueItem>;
  products!: Table<Product>;
  categories!: Table<Category>;
  settings!: Table<TenantSetting>;
  sales!: Table<Sale>;
  purchases!: Table<Purchase>;
  recipes!: Table<Recipe>;
  productionLogs!: Table<ProductionLog>;
  suppliers!: Table<Supplier>;

  constructor() {
    super('LogisCoreERP');
    this.version(4).stores({
      syncQueue: '++id, localId, tableName, status, tenantId, createdAt',
      products: '++id, localId, tenantId, sku, categoryId, isActive',
      categories: '++id, localId, tenantId, name',
      settings: 'key, tenantId',
      sales: '++id, localId, tenantId, status, createdAt',
      purchases: '++id, localId, tenantId, status, createdAt',
      recipes: '++id, localId, tenantId, isActive',
      productionLogs: '++id, localId, tenantId, recipeId, createdAt',
      suppliers: '++id, localId, tenantId, name, isActive',
    });
  }
}

export const db = new LogisCoreDB();

export async function initializeCatalogs(tenantId: string): Promise<void> {
  const categoryCount = await db.categories.where({ tenantId }).count();
  
  if (categoryCount === 0) {
    const defaultCategories = [
      { name: 'General', description: 'Categoría general', tenantId },
      { name: 'Bebidas', description: 'Bebidas y líquidos', tenantId },
      { name: 'Comida', description: 'Alimentos preparados', tenantId },
      { name: 'Insumos', description: 'Materiales e insumos', tenantId },
    ];

    for (const cat of defaultCategories) {
      await db.categories.add({
        ...cat,
        localId: crypto.randomUUID(),
        createdAt: new Date(),
      });
    }
  }
}
