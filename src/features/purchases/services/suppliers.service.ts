import { db, Supplier } from '@/lib/db';
import { SyncEngine } from '@/lib/sync/SyncEngine';
import { useTenantStore } from '@/store/useTenantStore';
import { Ok, Err, Result, NotFoundError, ValidationError, AppError } from '@/lib/types/result';
import { logger, logCategories } from '@/lib/logger';

function getCurrentTenantId(): string {
  const { currentTenant } = useTenantStore.getState();
  if (!currentTenant) {
    throw new AppError('No hay tenant activo', 'NO_TENANT', 400);
  }
  return currentTenant.slug;
}

export async function getSuppliers(): Promise<Supplier[]> {
  try {
    const tenantId = getCurrentTenantId();
    return db.suppliers.where('tenantId').equals(tenantId).toArray();
  } catch (_error) {
    return [];
  }
}

export async function createSupplier(data: Omit<Supplier, 'id' | 'localId' | 'tenantId' | 'createdAt' | 'updatedAt' | 'syncedAt'>): Promise<Result<string, AppError>> {
  try {
    const tenantId = getCurrentTenantId();

    if (!data.name?.trim()) {
      return Err(new ValidationError('El nombre del proveedor es requerido'));
    }

    const localId = crypto.randomUUID();
    const supplier: Supplier = {
      ...data,
      localId,
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: data.isActive ?? true,
    };

    await db.suppliers.add(supplier);
    await SyncEngine.addToQueue('suppliers', 'create', supplier as unknown as Record<string, unknown>, localId);
    
    logger.info('Proveedor creado', { supplierName: data.name, category: logCategories.DATABASE });
    
    return Ok(localId);
  } catch (error) {
    logger.error('Error al crear proveedor', error instanceof Error ? error : undefined, { category: logCategories.DATABASE });
    if (error instanceof AppError) return Err(error);
    return Err(new AppError('Error al crear proveedor', 'CREATE_SUPPLIER_ERROR', 500));
  }
}

export async function updateSupplier(localId: string, data: Partial<Supplier>): Promise<Result<void, AppError>> {
  try {
    const tenantId = getCurrentTenantId();
    const supplier = await db.suppliers
      .where('localId')
      .equals(localId)
      .filter(s => s.tenantId === tenantId)
      .first();

    if (!supplier) {
      return Err(new NotFoundError('Proveedor', localId));
    }

    const updated = { ...supplier, ...data, updatedAt: new Date() };
    await db.suppliers.put(updated);
    await SyncEngine.addToQueue('suppliers', 'update', updated as unknown as Record<string, unknown>, localId);
    
    return Ok(undefined);
  } catch (error) {
    if (error instanceof AppError) return Err(error);
    logger.error('Error al actualizar proveedor', error as Error, { category: logCategories.DATABASE });
    return Err(new AppError('Error al actualizar proveedor', 'UPDATE_SUPPLIER_ERROR', 500));
  }
}

export async function deleteSupplier(localId: string): Promise<Result<void, AppError>> {
  try {
    const tenantId = getCurrentTenantId();
    const supplier = await db.suppliers
      .where('localId')
      .equals(localId)
      .filter(s => s.tenantId === tenantId)
      .first();

    if (!supplier) {
      return Err(new NotFoundError('Proveedor', localId));
    }

    // Opcional: Verificar si hay compras asociadas
    const purchasesCount = await db.purchases.where('supplier').equals(supplier.name).count();
    if (purchasesCount > 0) {
      return Err(new ValidationError('No se puede eliminar un proveedor con historial de compras. Considere desactivarlo.'));
    }

    await db.suppliers.where('localId').equals(localId).delete();
    await SyncEngine.addToQueue('suppliers', 'delete', { localId }, localId);
    
    return Ok(undefined);
  } catch (error) {
    if (error instanceof AppError) return Err(error);
    logger.error('Error al eliminar proveedor', error as Error, { category: logCategories.DATABASE });
    return Err(new AppError('Error al eliminar proveedor', 'DELETE_SUPPLIER_ERROR', 500));
  }
}
