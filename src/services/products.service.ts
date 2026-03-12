import { db, Product } from './db';
import { SyncEngine } from './sync/SyncEngine';
import { EventBus, Events } from './events/EventBus';
import { useTenantStore } from '../store/useTenantStore';

export async function getProducts(): Promise<Product[]> {
  const { currentTenant } = useTenantStore.getState();
  if (!currentTenant) return [];
  
  return db.products.where('tenantId').equals(currentTenant.slug).toArray();
}

export async function getProductById(localId: string): Promise<Product | undefined> {
  return db.products.where('localId').equals(localId).first();
}

export async function createProduct(data: Omit<Product, 'id' | 'localId' | 'createdAt' | 'updatedAt' | 'syncedAt'>): Promise<string> {
  const { currentTenant } = useTenantStore.getState();
  if (!currentTenant) throw new Error('No hay tenant activo');

  const localId = crypto.randomUUID();
  const product: Product = {
    ...data,
    localId,
    tenantId: currentTenant.slug,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.products.add(product);
  await SyncEngine.addToQueue('products', 'create', product as unknown as Record<string, unknown>, localId);
  
  EventBus.emit(Events.INVENTORY_UPDATED, { action: 'create', product });
  
  return localId;
}

export async function updateProduct(localId: string, data: Partial<Product>): Promise<void> {
  const product = await getProductById(localId);
  if (!product) throw new Error('Producto no encontrado');

  const updated = { ...product, ...data, updatedAt: new Date() };
  await db.products.put(updated);
  await SyncEngine.addToQueue('products', 'update', updated as unknown as Record<string, unknown>, localId);
  
  EventBus.emit(Events.INVENTORY_UPDATED, { action: 'update', product: updated });
}

export async function deleteProduct(localId: string): Promise<void> {
  await db.products.delete(localId);
  await SyncEngine.addToQueue('products', 'delete', { localId }, localId);
  
  EventBus.emit(Events.INVENTORY_UPDATED, { action: 'delete', localId });
}

export async function updateStock(localId: string, quantity: number): Promise<void> {
  const product = await getProductById(localId);
  if (!product) throw new Error('Producto no encontrado');

  const newStock = product.stock + quantity;
  
  if (newStock < 0) {
    throw new Error('Stock insuficiente');
  }

  await updateProduct(localId, { stock: newStock });

  if (newStock <= 10) {
    EventBus.emit(Events.STOCK_LOW, { product, stock: newStock });
  }
}
