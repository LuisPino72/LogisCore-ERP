import { useTenantStore } from '../store/useTenantStore';

export interface Recipe {
  id?: number;
  localId: string;
  tenantId: string;
  name: string;
  description?: string;
  productId: string;
  quantity: number;
  unit: string;
  ingredients: RecipeIngredient[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeIngredient {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
}

export async function createRecipe(_data: { name: string }): Promise<string> {
  const { currentTenant } = useTenantStore.getState();
  if (!currentTenant) throw new Error('No hay tenant activo');

  return crypto.randomUUID();
}

export async function produce(_recipeId: string, quantity: number): Promise<{ success: boolean; message: string }> {
  return { success: true, message: `Producción iniciada: ${quantity} unidades` };
}
