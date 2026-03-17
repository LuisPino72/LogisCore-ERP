import { db, Recipe, ProductionLog } from '@/lib/db';
import { SyncEngine } from '@/lib/sync/SyncEngine';
import { EventBus, Events } from '@/lib/events/EventBus';
import { useTenantStore } from '@/store/useTenantStore';
import { Ok, Err, Result, ValidationError, AppError, isOk } from '@/lib/types/result';
import { logger, logCategories } from '@/lib/logger';

function getCurrentTenantId(): string {
  const { currentTenant } = useTenantStore.getState();
  if (!currentTenant) {
    throw new AppError('No hay tenant activo', 'NO_TENANT', 400);
  }
  return currentTenant.slug;
}

export interface RecipeIngredient {
  productId: string;
  quantity: number;
  unit: string;
}

export interface CreateRecipeInput {
  name: string;
  description?: string;
  productId: string;
  ingredients: RecipeIngredient[];
  yield: number;
  isActive: boolean;
}

function validateRecipeInput(data: CreateRecipeInput): string[] {
  const errors: string[] = [];
  
  if (!data.name?.trim()) {
    errors.push('El nombre de la receta es requerido');
  }
  
  if (!data.productId) {
    errors.push('El producto resultado es requerido');
  }
  
  if (!data.ingredients || data.ingredients.length === 0) {
    errors.push('La receta debe tener al menos un ingrediente');
  }
  
  if (data.yield <= 0) {
    errors.push('El rendimiento debe ser mayor a 0');
  }
  
  for (const ing of data.ingredients || []) {
    if (!ing.productId) {
      errors.push('Ingrediente inválido');
    }
    if (ing.quantity <= 0) {
      errors.push('La cantidad del ingrediente debe ser mayor a 0');
    }
  }
  
  return errors;
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
      return Err(new AppError('Receta no encontrada', 'NOT_FOUND', 404));
    }
    
    return Ok(recipe);
  } catch (error) {
    logger.error('Error al obtener receta', error instanceof Error ? error : undefined, { category: logCategories.DATABASE });
    return Err(new AppError('Error al obtener receta', 'GET_RECIPE_ERROR', 500));
  }
}

export async function createRecipe(data: CreateRecipeInput): Promise<Result<string, AppError>> {
  try {
    const tenantId = getCurrentTenantId();
    
    const errors = validateRecipeInput(data);
    if (errors.length > 0) {
      return Err(new ValidationError(errors.join(', ')));
    }
    
    const localId = crypto.randomUUID();
    const recipe: Recipe = {
      localId,
      tenantId,
      name: data.name,
      description: data.description,
      productId: data.productId,
      ingredients: data.ingredients,
      yield: data.yield,
      isActive: data.isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.recipes.add(recipe);
    await SyncEngine.addToQueue('recipes', 'create', recipe as unknown as Record<string, unknown>, localId);
    
    logger.info('Receta creada', { recipeId: localId, name: data.name, category: logCategories.DATABASE });
    
    return Ok(localId);
  } catch (error) {
    logger.error('Error al crear receta', error instanceof Error ? error : undefined, { category: logCategories.DATABASE });
    if (error instanceof AppError) {
      return Err(error);
    }
    return Err(new AppError('Error al crear receta', 'CREATE_RECIPE_ERROR', 500));
  }
}

export async function updateRecipe(localId: string, data: Partial<Recipe>): Promise<Result<void, AppError>> {
  try {
    const recipeResult = await getRecipeById(localId);
    
    if (!isOk(recipeResult)) {
      return Err(recipeResult.error);
    }
    
    const recipe = recipeResult.value;
    const updated = { ...recipe, ...data, updatedAt: new Date() };
    
    await db.recipes.put(updated);
    await SyncEngine.addToQueue('recipes', 'update', updated as unknown as Record<string, unknown>, localId);
    
    logger.info('Receta actualizada', { recipeId: localId, category: logCategories.DATABASE });
    
    return Ok(undefined);
  } catch (error) {
    logger.error('Error al actualizar receta', error instanceof Error ? error : undefined, { category: logCategories.DATABASE });
    if (error instanceof AppError) {
      return Err(error);
    }
    return Err(new AppError('Error al actualizar receta', 'UPDATE_RECIPE_ERROR', 500));
  }
}

export async function deleteRecipe(localId: string): Promise<Result<void, AppError>> {
  try {
    const recipeResult = await getRecipeById(localId);
    
    if (!isOk(recipeResult)) {
      return Err(recipeResult.error);
    }

    await db.recipes.where('localId').equals(localId).delete();
    await SyncEngine.addToQueue('recipes', 'delete', { localId }, localId);
    
    logger.info('Receta eliminada', { recipeId: localId, category: logCategories.DATABASE });
    
    return Ok(undefined);
  } catch (error) {
    logger.error('Error al eliminar receta', error instanceof Error ? error : undefined, { category: logCategories.DATABASE });
    if (error instanceof AppError) {
      return Err(error);
    }
    return Err(new AppError('Error al eliminar receta', 'DELETE_RECIPE_ERROR', 500));
  }
}

export async function canProduce(recipe: Recipe, quantity: number): Promise<Result<{ canProduce: boolean; insufficientIngredients: string[] }, AppError>> {
  const tenantId = getCurrentTenantId();
  const products = await db.products.where('tenantId').equals(tenantId).toArray();
  
  const insufficient: string[] = [];
  
  for (const ing of recipe.ingredients) {
    const product = products.find(p => p.localId === ing.productId);
    const required = ing.quantity * quantity / recipe.yield;
    
    if (!product || product.stock < required) {
      insufficient.push(ing.productId);
    }
  }
  
  return Ok({
    canProduce: insufficient.length === 0,
    insufficientIngredients: insufficient,
  });
}

export async function produce(localId: string, quantity: number): Promise<Result<void, AppError>> {
  try {
    const recipeResult = await getRecipeById(localId);
    
    if (!isOk(recipeResult)) {
      return Err(recipeResult.error);
    }
    
    const recipe = recipeResult.value;
    const canProduceResult = await canProduce(recipe, quantity);
    
    if (!isOk(canProduceResult) || !canProduceResult.value.canProduce) {
      return Err(new ValidationError('Stock insuficiente para producir'));
    }
    
    const ingredientsUsed: { productId: string; quantity: number }[] = [];
    
    await db.transaction('rw', db.products, db.productionLogs, async () => {
      for (const ing of recipe.ingredients) {
        const usedQuantity = (ing.quantity * quantity) / recipe.yield;
        
        const product = await db.products
          .where('localId')
          .equals(ing.productId)
          .filter(p => p.tenantId === getCurrentTenantId())
          .first();
        
        if (!product || product.stock < usedQuantity) {
          throw new ValidationError(`Stock insuficiente para ${ing.productId}`);
        }
        
        await db.products.put({
          ...product,
          stock: product.stock - usedQuantity,
          updatedAt: new Date(),
        });
        
        ingredientsUsed.push({ productId: ing.productId, quantity: usedQuantity });
      }
      
      const productionLog: ProductionLog = {
        localId: crypto.randomUUID(),
        tenantId: getCurrentTenantId(),
        recipeId: localId,
        quantity,
        ingredientsUsed,
        createdAt: new Date(),
      };
      
      await db.productionLogs.add(productionLog);
      await SyncEngine.addToQueue('production_logs', 'create', productionLog as unknown as Record<string, unknown>, productionLog.localId);
    });
    
    logger.info('Producción registrada', { 
      recipeId: localId, 
      quantity, 
      category: logCategories.DATABASE 
    });
    
    EventBus.emit(Events.INVENTORY_UPDATED, { action: 'produce', recipe, quantity });
    
    return Ok(undefined);
  } catch (error) {
    logger.error('Error al producir', error instanceof Error ? error : undefined, { category: logCategories.DATABASE });
    if (error instanceof AppError) {
      return Err(error);
    }
    return Err(new AppError('Error al producir', 'PRODUCE_ERROR', 500));
  }
}
