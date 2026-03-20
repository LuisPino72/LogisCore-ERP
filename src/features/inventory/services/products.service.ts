import { db, Product } from '@/lib/db';
import { SyncEngine } from '@/lib/sync/SyncEngine';
import { EventBus, Events } from '@/lib/events/EventBus';
import { useTenantStore } from '@/store/useTenantStore';
import { Ok, Err, Result, NotFoundError, ValidationError, AppError } from '@/lib/types/result';
import { logger, logCategories } from '@/lib/logger';

/**
 * Obtiene el slug del tenant activo desde el store.
 * @throws {AppError} Si no hay tenant activo
 */
function getCurrentTenantSlug(): string {
  const { currentTenant } = useTenantStore.getState();
  if (!currentTenant) {
    throw new AppError('No hay tenant activo', 'NO_TENANT', 400);
  }
  return currentTenant.slug;
}

/**
 * Obtiene el ID (UUID) del tenant activo desde el store.
 * @throws {AppError} Si no hay tenant activo
 */
function getCurrentTenantId(): string {
  const { currentTenant } = useTenantStore.getState();
  if (!currentTenant) {
    throw new AppError('No hay tenant activo', 'NO_TENANT', 400);
  }
  return currentTenant.id;
}

/**
 * Obtiene todos los productos del tenant activo.
 * @returns Lista de productos ordenados por nombre
 */
export async function getProducts(): Promise<Product[]> {
  const tenantSlug = getCurrentTenantSlug();
  return db.products.where('tenantId').equals(tenantSlug).toArray();
}

/**
 * Obtiene un producto por su localId.
 * @param localId - ID único del producto
 * @returns Result con el producto o error si no se encuentra
 */
export async function getProductById(localId: string): Promise<Result<Product, AppError>> {
  try {
    const tenantSlug = getCurrentTenantSlug();
    const product = await db.products
      .where('localId')
      .equals(localId)
      .filter(p => p.tenantId === tenantSlug)
      .first();
    
    if (!product) {
      return Err(new NotFoundError('Producto', localId));
    }
    
    return Ok(product);
  } catch (_error) {
    return Err(new AppError('Error al obtener producto', 'GET_PRODUCT_ERROR', 500, { localId }));
  }
}

/**
 * Crea un nuevo producto.
 * @param data - Datos del producto sin campos generados automáticamente
 * @returns Result con el localId del producto creado o error de validación
 */
export async function createProduct(data: Omit<Product, 'id' | 'localId' | 'tenantId' | 'createdAt' | 'updatedAt' | 'syncedAt'>): Promise<Result<string, AppError>> {
  try {
    const tenantId = getCurrentTenantId();

    if (!data.name?.trim()) {
      return Err(new ValidationError('El nombre del producto es requerido'));
    }
    if (!data.sku?.trim()) {
      return Err(new ValidationError('El SKU del producto es requerido'));
    }
    if (data.price === undefined || data.price < 0) {
      return Err(new ValidationError('El precio debe ser mayor o igual a 0'));
    }
    if (data.stock !== undefined && data.stock < 0) {
      return Err(new ValidationError('El stock no puede ser negativo'));
    }

    const localId = crypto.randomUUID();
    const product: Product = {
      ...data,
      localId,
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.products.add(product);
    await SyncEngine.addToQueue('products', 'create', product as unknown as Record<string, unknown>, localId);
    
    EventBus.emit(Events.INVENTORY_UPDATED, { action: 'create', product });
    
    return Ok(localId);
  } catch (error) {
    if (error instanceof AppError) {
      return Err(error);
    }
    logger.error('Error al crear producto', error as Error, { category: logCategories.INVENTORY });
    return Err(new AppError('Error al crear producto', 'CREATE_PRODUCT_ERROR', 500));
  }
}

export async function updateProduct(localId: string, data: Partial<Product>): Promise<Result<void, AppError>> {
  try {
    const productResult = await getProductById(localId);
    
    if (!productResult.ok) {
      return Err(productResult.error);
    }
    
    const product = productResult.value;
    const updated = { ...product, ...data, updatedAt: new Date() };
    
    await db.products.put(updated);
    await SyncEngine.addToQueue('products', 'update', updated as unknown as Record<string, unknown>, localId);
    
    EventBus.emit(Events.INVENTORY_UPDATED, { action: 'update', product: updated });
    
    return Ok(undefined);
  } catch (error) {
    if (error instanceof AppError) {
      return Err(error);
    }
    logger.error('Error al actualizar producto', error as Error, { category: logCategories.INVENTORY });
    return Err(new AppError('Error al actualizar producto', 'UPDATE_PRODUCT_ERROR', 500));
  }
}

export async function deleteProduct(localId: string): Promise<Result<void, AppError>> {
  try {
    const productResult = await getProductById(localId);
    
    if (!productResult.ok) {
      return Err(productResult.error);
    }

    await db.products.where('localId').equals(localId).delete();
    await SyncEngine.addToQueue('products', 'delete', { localId }, localId);
    
    EventBus.emit(Events.INVENTORY_UPDATED, { action: 'delete', localId });
    
    return Ok(undefined);
  } catch (error) {
    if (error instanceof AppError) {
      return Err(error);
    }
    logger.error('Error al eliminar producto', error as Error, { category: logCategories.INVENTORY });
    return Err(new AppError('Error al eliminar producto', 'DELETE_PRODUCT_ERROR', 500));
  }
}

export async function updateStock(localId: string, quantity: number): Promise<Result<void, AppError>> {
  try {
    const productResult = await getProductById(localId);
    
    if (!productResult.ok) {
      return Err(productResult.error);
    }
    
    const product = productResult.value;
    const newStock = product.stock + quantity;
    
    if (newStock < 0) {
      return Err(new ValidationError('Stock insuficiente'));
    }

    const updateResult = await updateProduct(localId, { stock: newStock });
    
    if (!updateResult.ok) {
      return Err(updateResult.error);
    }
    
    if (newStock <= 10) {
      EventBus.emit(Events.STOCK_LOW, { product: { ...product, stock: newStock }, stock: newStock });
    }
    
    return Ok(undefined);
  } catch (error) {
    if (error instanceof AppError) {
      return Err(error);
    }
    logger.error('Error al actualizar stock', error as Error, { category: logCategories.INVENTORY });
    return Err(new AppError('Error al actualizar stock', 'UPDATE_STOCK_ERROR', 500));
  }
}
