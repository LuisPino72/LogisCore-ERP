import { useState, useCallback } from 'react'
import { useTenantStore } from '@/store/useTenantStore'
import { useToast } from '@/providers/ToastProvider'
import * as recipesService from '../services/recipes.service'
import type { CreateRecipeInput } from '../types/recipes.types'
import type { Recipe } from '@/lib/db'
import { isOk } from '@/lib/types/result'

export interface UseRecipesReturn {
  recipes: Recipe[]
  loading: boolean
  loadData: () => Promise<void>
  createRecipe: (data: CreateRecipeInput) => Promise<boolean>
  updateRecipe: (localId: string, data: Partial<CreateRecipeInput>) => Promise<boolean>
  deleteRecipe: (localId: string) => Promise<boolean>
  recordProduction: (localId: string, quantity: number) => Promise<boolean>
}

export function useRecipes(): UseRecipesReturn {
  const tenant = useTenantStore((state) => state.currentTenant)
  const { showError, showSuccess } = useToast()

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(async () => {
    if (!tenant?.slug) return
    setLoading(true)
    try {
      const data = await recipesService.getRecipes()
      setRecipes(data)
    } catch (_error) {
      showError('Error al cargar recetas')
    } finally {
      setLoading(false)
    }
  }, [tenant?.slug, showError])

  const createRecipe = useCallback(
    async (data: CreateRecipeInput): Promise<boolean> => {
      setLoading(true)
      const result = await recipesService.createRecipe(data)
      if (isOk(result)) {
        showSuccess('Receta creada correctamente')
        await loadData()
        setLoading(false)
        return true
      }
      showError(result.error.message)
      setLoading(false)
      return false
    },
    [loadData, showError, showSuccess],
  )

  const updateRecipe = useCallback(
    async (localId: string, data: Partial<CreateRecipeInput>): Promise<boolean> => {
      setLoading(true)
      const result = await recipesService.updateRecipe(localId, data)
      if (isOk(result)) {
        showSuccess('Receta actualizada correctamente')
        await loadData()
        setLoading(false)
        return true
      }
      showError(result.error.message)
      setLoading(false)
      return false
    },
    [loadData, showError, showSuccess],
  )

  const deleteRecipe = useCallback(
    async (localId: string): Promise<boolean> => {
      setLoading(true)
      const result = await recipesService.deleteRecipe(localId)
      if (isOk(result)) {
        showSuccess('Receta eliminada correctamente')
        await loadData()
        setLoading(false)
        return true
      }
      showError(result.error.message)
      setLoading(false)
      return false
    },
    [loadData, showError, showSuccess],
  )

  const recordProduction = useCallback(
    async (localId: string, quantity: number): Promise<boolean> => {
      setLoading(true)
      const result = await recipesService.produce(localId, quantity)
      if (isOk(result)) {
        showSuccess('Producción registrada correctamente')
        await loadData()
        setLoading(false)
        return true
      }
      showError(result.error.message)
      setLoading(false)
      return false
    },
    [loadData, showError, showSuccess],
  )

  return {
    recipes,
    loading,
    loadData,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    recordProduction,
  }
}