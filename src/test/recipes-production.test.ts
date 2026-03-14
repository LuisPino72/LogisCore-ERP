import { describe, it, expect } from 'vitest';

interface RecipeIngredient {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
}

interface Recipe {
  id: string;
  name: string;
  productId: string;
  ingredients: RecipeIngredient[];
  yield: number;
  isActive: boolean;
}

interface ProductionLog {
  id: string;
  recipeId: string;
  quantity: number;
  ingredientsUsed: { productId: string; quantity: number }[];
}

describe('Recipe Calculations', () => {
  it('debe calcular materiales necesarios para producción', () => {
    const ingredients: RecipeIngredient[] = [
      { productId: '1', productName: 'Carne', quantity: 0.2, unit: 'kg' },
      { productId: '2', productName: 'Pan', quantity: 1, unit: 'pieza' },
      { productId: '3', productName: 'Queso', quantity: 0.05, unit: 'kg' },
    ];
    const productionQty = 5;
    
    const materialsNeeded = ingredients.map(ing => ({
      ...ing,
      totalQuantity: ing.quantity * productionQty,
    }));
    
    expect(materialsNeeded[0].totalQuantity).toBe(1);
    expect(materialsNeeded[1].totalQuantity).toBe(5);
    expect(materialsNeeded[2].totalQuantity).toBe(0.25);
  });

  it('debe validar stock suficiente para producción', () => {
    const availableStock: Record<string, number> = { '1': 10, '2': 20, '3': 5 };
    const requiredStock: Record<string, number> = { '1': 5, '2': 8, '3': 2 };
    
    const hasEnough = Object.entries(requiredStock).every(
      ([productId, qty]) => availableStock[productId] >= qty
    );
    
    expect(hasEnough).toBe(true);
  });

  it('debe rechazar producción por stock insuficiente', () => {
    const availableStock: Record<string, number> = { '1': 3, '2': 20, '3': 5 };
    const requiredStock: Record<string, number> = { '1': 5, '2': 8, '3': 2 };
    
    const hasEnough = Object.entries(requiredStock).every(
      ([productId, qty]) => availableStock[productId] >= qty
    );
    
    expect(hasEnough).toBe(false);
  });

  it('debe identificar qué ingrediente falta', () => {
    const availableStock: Record<string, number> = { '1': 2, '2': 20 };
    const requiredStock: Record<string, number> = { '1': 5, '2': 8, '3': 3 };
    
    const missing = Object.entries(requiredStock)
      .filter(([productId, qty]) => (availableStock[productId] || 0) < qty)
      .map(([productId]) => productId);
    
    expect(missing).toContain('1');
    expect(missing).toContain('3');
  });
});

describe('Production Execution', () => {
  it('debe registrar producción correctamente', () => {
    const recipe: Recipe = {
      id: 'recipe-1',
      name: 'Hamburguesa Especial',
      productId: 'prod-hamb',
      ingredients: [
        { productId: '1', productName: 'Carne', quantity: 0.2, unit: 'kg' },
      ],
      yield: 1,
      isActive: true,
    };
    const productionQty = 10;
    
    const log: ProductionLog = {
      id: 'log-1',
      recipeId: recipe.id,
      quantity: productionQty,
      ingredientsUsed: recipe.ingredients.map(ing => ({
        productId: ing.productId,
        quantity: ing.quantity * productionQty,
      })),
    };
    
    expect(log.quantity).toBe(10);
    expect(log.ingredientsUsed[0].quantity).toBe(2);
  });

  it('debe descontar stock tras producción', () => {
    const stock: Record<string, number> = { '1': 50, '2': 100 };
    const used: { productId: string; quantity: number }[] = [
      { productId: '1', quantity: 5 },
      { productId: '2', quantity: 10 },
    ];
    
    used.forEach(item => {
      stock[item.productId] -= item.quantity;
    });
    
    expect(stock['1']).toBe(45);
    expect(stock['2']).toBe(90);
  });

  it('debe calcular rendimiento por unidad', () => {
    const totalIngredients = 15;
    const yield_ = 10;
    const costPerUnit = totalIngredients / yield_;
    
    expect(costPerUnit).toBe(1.5);
  });
});

describe('Recipe Status', () => {
  it('debe identificar recetas activas', () => {
    const recipes: Recipe[] = [
      { id: '1', name: 'Receta A', productId: 'p1', ingredients: [], yield: 1, isActive: true },
      { id: '2', name: 'Receta B', productId: 'p2', ingredients: [], yield: 1, isActive: false },
    ];
    
    const active = recipes.filter(r => r.isActive);
    expect(active).toHaveLength(1);
  });

  it('debe validar que la receta tenga ingredientes', () => {
    const recipe: Recipe = {
      id: '1',
      name: 'Receta',
      productId: 'p1',
      ingredients: [],
      yield: 1,
      isActive: true,
    };
    
    const hasIngredients = recipe.ingredients.length > 0;
    expect(hasIngredients).toBe(false);
  });
});
