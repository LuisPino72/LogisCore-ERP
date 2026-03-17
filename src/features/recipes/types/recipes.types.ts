export interface RecipeIngredient {
  productId: string
  quantity: number
  unit: string
}

export interface CreateRecipeInput {
  name: string
  description?: string
  productId: string
  ingredients: RecipeIngredient[]
  yield: number
  isActive: boolean
}

export interface ProductionInput {
  recipeId: string
  quantity: number
  notes?: string
}

export type RecipeStatus = 'draft' | 'active' | 'inactive'