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

export type SortField = 'name' | 'createdAt' | 'yield'
export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  field: SortField
  direction: SortDirection
}

export interface RecipeFilters {
  search: string
  status: 'all' | 'active' | 'inactive'
}