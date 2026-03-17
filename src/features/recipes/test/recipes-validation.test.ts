import { describe, it, expect } from 'vitest';

interface RecipeIngredient {
  productId: string;
  quantity: number;
  unit: string;
}

interface CreateRecipeInput {
  name: string;
  description?: string;
  productId: string;
  ingredients: RecipeIngredient[];
  yield: number;
  isActive: boolean;
}

describe('Recipe Validation', () => {
  const validateRecipeInput = (data: CreateRecipeInput): string[] => {
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
  };

  it('debe validar receta exitosa', () => {
    const input: CreateRecipeInput = {
      name: 'Hamburguesa Especial',
      description: 'Deliciosa hamburguesa',
      productId: 'prod-hamb',
      ingredients: [
        { productId: '1', quantity: 0.2, unit: 'kg' },
        { productId: '2', quantity: 1, unit: 'pieza' },
      ],
      yield: 1,
      isActive: true,
    };
    
    const errors = validateRecipeInput(input);
    expect(errors).toHaveLength(0);
  });

  it('debe rechazar nombre vacío', () => {
    const input: CreateRecipeInput = {
      name: '',
      productId: 'prod-1',
      ingredients: [{ productId: '1', quantity: 1, unit: 'kg' }],
      yield: 1,
      isActive: true,
    };
    
    const errors = validateRecipeInput(input);
    expect(errors).toContain('El nombre de la receta es requerido');
  });

  it('debe rechazar sin ingredientes', () => {
    const input: CreateRecipeInput = {
      name: 'Receta',
      productId: 'prod-1',
      ingredients: [],
      yield: 1,
      isActive: true,
    };
    
    const errors = validateRecipeInput(input);
    expect(errors).toContain('La receta debe tener al menos un ingrediente');
  });

  it('debe rechazar rendimiento cero', () => {
    const input: CreateRecipeInput = {
      name: 'Receta',
      productId: 'prod-1',
      ingredients: [{ productId: '1', quantity: 1, unit: 'kg' }],
      yield: 0,
      isActive: true,
    };
    
    const errors = validateRecipeInput(input);
    expect(errors).toContain('El rendimiento debe ser mayor a 0');
  });
});
