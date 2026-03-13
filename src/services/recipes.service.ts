import { useTenantStore } from '../store/useTenantStore';
import { db, Recipe } from './db';
import { SyncEngine } from './sync/SyncEngine';
import { EventBus, Events } from './events/EventBus';
import { Ok, Err, Result, NotFoundError, ValidationError, AppError } from '../types/result';

function getCurrentTenantId(): string {
  const { currentTenant } = useTenantStore.getState();
  if (!currentTenant) {
    throw new AppError('No hay tenant activo', 'NO_TENANT', 400);
  }
  return currentTenant.slug;
}

export async function getRecipes(): Promise<Recipe[]> {
  const tenantId = getCurrentTenantId();
  return db.recipes.where('tenantId').equals(tenantId).toArray();
}

export async function getRecipeById(localId: string): Promise<Result<Recipe, AppError>> {
  try {
    const tenantId = getCurrentTenantId();
    const recipe = await db.recipes
      .where('localId')
      .equals(localId)
      .filter(r => r.tenantId === tenantId)
      .first();
    
    if (!recipe) {
      return Err(new NotFoundError('Receta', localId));
    }
    
    return Ok(recipe);
  } catch (error) {
    return Err(new AppError('Error al obtener receta', 'GET_RECIPE_ERROR', 500, { localId }));
  }
}

export async function createRecipe(data: Omit<Recipe, 'id' | 'localId' | 'createdAt' | 'updatedAt' | 'syncedAt'>): Promise<Result<string, AppError>> {
  try {
    const tenantId = getCurrentTenantId();

    if (!data.name?.trim()) {
      return Err(new ValidationError('El nombre de la receta es requerido'));
    }
    if (!data.productId) {
      return Err(new ValidationError('El producto asociado es requerido'));
    }

    const localId = crypto.randomUUID();
    const recipe: Recipe = {
      ...data,
      localId,
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.recipes.add(recipe);
    await SyncEngine.addToQueue('recipes', 'create', recipe as unknown as Record<string, unknown>, localId);
    
    EventBus.emit(Events.INVENTORY_UPDATED, { action: 'create', recipe });
    
    return Ok(localId);
  } catch (error) {
    if (error instanceof AppError) {
      return Err(error);
    }
    return Err(new AppError('Error al crear receta', 'CREATE_RECIPE_ERROR', 500));
  }
}

export async function updateRecipe(localId: string, data: Partial<Recipe>): Promise<Result<void, AppError>> {
  try {
    const recipeResult = await getRecipeById(localId);
    
    if (!recipeResult.ok) {
      return Err(recipeResult.error);
    }
    
    const recipe = recipeResult.value;
    const updated = { ...recipe, ...data, updatedAt: new Date() };
    
    await db.recipes.put(updated);
    await SyncEngine.addToQueue('recipes', 'update', updated as unknown as Record<string, unknown>, localId);
    
    EventBus.emit(Events.INVENTORY_UPDATED, { action: 'update', recipe: updated });
    
    return Ok(undefined);
  } catch (error) {
    if (error instanceof AppError) {
      return Err(error);
    }
    return Err(new AppError('Error al actualizar receta', 'UPDATE_RECIPE_ERROR', 500));
  }
}

export async function deleteRecipe(localId: string): Promise<Result<void, AppError>> {
  try {
    const recipeResult = await getRecipeById(localId);
    
    if (!recipeResult.ok) {
      return Err(recipeResult.error);
    }

    await db.recipes.delete(localId);
    await SyncEngine.addToQueue('recipes', 'delete', { localId }, localId);
    
    EventBus.emit(Events.INVENTORY_UPDATED, { action: 'delete', localId });
    
    return Ok(undefined);
  } catch (error) {
    if (error instanceof AppError) {
      return Err(error);
    }
    return Err(new AppError('Error al eliminar receta', 'DELETE_RECIPE_ERROR', 500));
  }
}

export async function produce(recipeId: string, quantity: number): Promise<Result<{ success: boolean; message: string }, AppError>> {
  try {
    const recipeResult = await getRecipeById(recipeId);
    
    if (!recipeResult.ok) {
      return Err(recipeResult.error);
    }
    
    if (quantity <= 0) {
      return Err(new ValidationError('La cantidad debe ser mayor a 0'));
    }

    const recipe = recipeResult.value;
    
    const productionLog = {
      localId: crypto.randomUUID(),
      tenantId: recipe.tenantId,
      recipeId: recipe.localId,
      quantity,
      ingredientsUsed: recipe.ingredients.map(ing => ({
        productId: ing.productId,
        quantity: ing.quantity * quantity
      })),
      createdAt: new Date(),
    };

    for (const ingredient of productionLog.ingredientsUsed) {
      const product = await db.products
        .where('localId')
        .equals(ingredient.productId)
        .first();
      
      if (!product) {
        return Err(new ValidationError(`Producto no encontrado: ${ingredient.productId}`));
      }
      
      const newStock = product.stock - ingredient.quantity;
      if (newStock < 0) {
        return Err(new ValidationError(`Stock insuficiente para ${product.name}`));
      }
      
      await db.products.update(product.localId, { stock: newStock, updatedAt: new Date() });
    }

    EventBus.emit(Events.INVENTORY_UPDATED, { action: 'produce', recipe, quantity });
    
    return Ok({ success: true, message: `Producción iniciada: ${quantity} unidades de ${recipe.name}` });
  } catch (error) {
    if (error instanceof AppError) {
      return Err(error);
    }
    return Err(new AppError('Error al iniciar producción', 'PRODUCE_ERROR', 500));
  }
}
