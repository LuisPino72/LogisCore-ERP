import { db, Purchase } from '@/lib/db';
import { SyncEngine } from '@/lib/sync/SyncEngine';
import { useTenantStore } from '@/store/useTenantStore';
import { Ok, Err, Result, ValidationError, AppError } from '@/lib/types/result';
import { logger, logCategories } from '@/lib/logger';

function getCurrentTenantId(): string {
  const { currentTenant } = useTenantStore.getState();
  if (!currentTenant) {
    throw new AppError('No hay tenant activo', 'NO_TENANT', 400);
  }
  return currentTenant.slug;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  cost: number;
  total: number;
}

export interface CreatePurchaseInput {
  supplier: string;
  invoiceNumber: string;
  items: PurchaseItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'completed' | 'cancelled';
}

function validatePurchaseInput(data: CreatePurchaseInput): string[] {
  const errors: string[] = [];
  
  if (!data.supplier?.trim()) {
    errors.push('El proveedor es requerido');
  }
  
  if (!data.invoiceNumber?.trim()) {
    errors.push('El número de factura es requerido');
  }
  
  if (!data.items || data.items.length === 0) {
    errors.push('La compra debe tener al menos un producto');
  }
  
  if (data.total < 0) {
    errors.push('El total no puede ser negativo');
  }
  
  if (!['pending', 'completed', 'cancelled'].includes(data.status)) {
    errors.push('Estado de compra inválido');
  }
  
  for (const item of data.items || []) {
    if (!item.productId) {
      errors.push('Producto inválido');
    }
    if (item.quantity <= 0) {
      errors.push('La cantidad debe ser mayor a 0');
    }
    if (item.cost < 0) {
      errors.push('El costo no puede ser negativo');
    }
  }
  
  return errors;
}

export async function getPurchases(): Promise<Purchase[]> {
  const tenantId = getCurrentTenantId();
  return db.purchases.where('tenantId').equals(tenantId).toArray();
}

export async function getPurchaseById(localId: string): Promise<Result<Purchase, AppError>> {
  try {
    const tenantId = getCurrentTenantId();
    const purchase = await db.purchases
      .where('localId')
      .equals(localId)
      .filter(p => p.tenantId === tenantId)
      .first();
    
    if (!purchase) {
      return Err(new AppError('Compra no encontrada', 'NOT_FOUND', 404));
    }
    
    return Ok(purchase);
  } catch (error) {
    logger.error('Error al obtener compra', error instanceof Error ? error : undefined, { category: logCategories.DATABASE });
    return Err(new AppError('Error al obtener compra', 'GET_PURCHASE_ERROR', 500));
  }
}

export async function createPurchase(data: CreatePurchaseInput): Promise<Result<string, AppError>> {
  try {
    const tenantId = getCurrentTenantId();
    
    const errors = validatePurchaseInput(data);
    if (errors.length > 0) {
      return Err(new ValidationError(errors.join(', ')));
    }
    
    const localId = crypto.randomUUID();
    const purchase: Purchase = {
      localId,
      tenantId,
      supplier: data.supplier,
      invoiceNumber: data.invoiceNumber,
      items: data.items,
      subtotal: data.subtotal,
      tax: data.tax,
      total: data.total,
      status: data.status,
      createdAt: new Date(),
    };

    await db.purchases.add(purchase);
    await SyncEngine.addToQueue('purchases', 'create', purchase as unknown as Record<string, unknown>, localId);
    
    logger.info('Compra creada', { purchaseId: localId, supplier: data.supplier, category: logCategories.DATABASE });
    
    return Ok(localId);
  } catch (error) {
    logger.error('Error al crear compra', error instanceof Error ? error : undefined, { category: logCategories.DATABASE });
    if (error instanceof AppError) {
      return Err(error);
    }
    return Err(new AppError('Error al crear compra', 'CREATE_PURCHASE_ERROR', 500));
  }
}

export async function updatePurchaseStatus(localId: string, status: 'pending' | 'completed' | 'cancelled'): Promise<Result<void, AppError>> {
  try {
    const tenantId = getCurrentTenantId();
    const purchase = await db.purchases
      .where('localId')
      .equals(localId)
      .filter(p => p.tenantId === tenantId)
      .first();
    
    if (!purchase) {
      return Err(new AppError('Compra no encontrada', 'NOT_FOUND', 404));
    }
    
    const updated = { ...purchase, status };
    await db.purchases.put(updated);
    await SyncEngine.addToQueue('purchases', 'update', updated as unknown as Record<string, unknown>, localId);
    
    logger.info('Estado de compra actualizado', { purchaseId: localId, status, category: logCategories.DATABASE });
    
    return Ok(undefined);
  } catch (error) {
    logger.error('Error al actualizar compra', error instanceof Error ? error : undefined, { category: logCategories.DATABASE });
    if (error instanceof AppError) {
      return Err(error);
    }
    return Err(new AppError('Error al actualizar compra', 'UPDATE_PURCHASE_ERROR', 500));
  }
}

export async function getPendingPurchases(): Promise<Purchase[]> {
  const tenantId = getCurrentTenantId();
  return db.purchases
    .where('tenantId')
    .equals(tenantId)
    .filter(p => p.status === 'pending')
    .toArray();
}
