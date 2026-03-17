import { db, Category } from '@/lib/db';
import { SyncEngine } from '@/lib/sync/SyncEngine';
import { useTenantStore } from '@/store/useTenantStore';
import { Ok, Err, Result, NotFoundError, ValidationError, AppError } from '@/lib/types/result';

function getCurrentTenantId(): string {
  const { currentTenant } = useTenantStore.getState();
  if (!currentTenant) {
    throw new AppError('No hay tenant activo', 'NO_TENANT', 400);
  }
  return currentTenant.slug;
}

export async function getCategories(): Promise<Category[]> {
  const tenantId = getCurrentTenantId();
  return db.categories.where('tenantId').equals(tenantId).toArray();
}

export async function createCategory(data: Omit<Category, 'id' | 'localId' | 'tenantId' | 'createdAt' | 'syncedAt'>): Promise<Result<string, AppError>> {
  try {
    const tenantId = getCurrentTenantId();

    if (!data.name?.trim()) {
      return Err(new ValidationError('El nombre de la categoría es requerido'));
    }

    const localId = crypto.randomUUID();
    const category: Category = {
      ...data,
      localId,
      tenantId,
      createdAt: new Date(),
    };

    await db.categories.add(category);
    await SyncEngine.addToQueue('categories', 'create', category as unknown as Record<string, unknown>, localId);
    
    return Ok(localId);
  } catch (error) {
    if (error instanceof AppError) return Err(error);
    return Err(new AppError('Error al crear categoría', 'CREATE_CATEGORY_ERROR', 500));
  }
}

export async function updateCategory(localId: string, data: Partial<Category>): Promise<Result<void, AppError>> {
  try {
    const tenantId = getCurrentTenantId();
    const category = await db.categories
      .where('localId')
      .equals(localId)
      .filter(c => c.tenantId === tenantId)
      .first();

    if (!category) {
      return Err(new NotFoundError('Categoría', localId));
    }

    const updated = { ...category, ...data };
    await db.categories.put(updated);
    await SyncEngine.addToQueue('categories', 'update', updated as unknown as Record<string, unknown>, localId);
    
    return Ok(undefined);
  } catch (error) {
    if (error instanceof AppError) return Err(error);
    return Err(new AppError('Error al actualizar categoría', 'UPDATE_CATEGORY_ERROR', 500));
  }
}

export async function deleteCategory(localId: string): Promise<Result<void, AppError>> {
  try {
    const tenantId = getCurrentTenantId();
    const category = await db.categories
      .where('localId')
      .equals(localId)
      .filter(c => c.tenantId === tenantId)
      .first();

    if (!category) {
      return Err(new NotFoundError('Categoría', localId));
    }

    // Verificar si hay productos usando esta categoría antes de eliminar
    // Note: p.categoryId in Dexie is currently a number (internal id), but in Supabase it's UUID.
    // This is a potential issue. Let's assume we use internal IDs for local filtering for now.
    const productsInCat = await db.products.where('categoryId').equals(category.id!).count();
    if (productsInCat > 0) {
      return Err(new ValidationError('No se puede eliminar una categoría que tiene productos asociados'));
    }

    await db.categories.where('localId').equals(localId).delete();
    await SyncEngine.addToQueue('categories', 'delete', { localId }, localId);
    
    return Ok(undefined);
  } catch (error) {
    if (error instanceof AppError) return Err(error);
    return Err(new AppError('Error al eliminar categoría', 'DELETE_CATEGORY_ERROR', 500));
  }
}
