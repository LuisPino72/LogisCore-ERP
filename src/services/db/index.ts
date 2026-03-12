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

class LogisCoreDB extends Dexie {
  syncQueue!: Table<SyncQueueItem>;
  products!: Table<Product>;
  categories!: Table<Category>;
  settings!: Table<TenantSetting>;

  constructor() {
    super('LogisCoreERP');
    this.version(1).stores({
      syncQueue: '++id, localId, tableName, status, tenantId, createdAt',
      products: '++id, localId, tenantId, sku, categoryId',
      categories: '++id, localId, tenantId, name',
      settings: 'key, tenantId',
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
