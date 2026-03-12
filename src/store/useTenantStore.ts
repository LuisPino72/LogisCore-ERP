import { create } from 'zustand'

interface TenantConfig {
  name: string
  slug: string
  modules: {
    sales: boolean
    inventory: boolean
    purchases: boolean
    recipes: boolean
  }
}

interface TenantState {
  currentTenant: TenantConfig | null
  role: 'super_admin' | 'owner' | 'employee' | null
  setTenant: (tenant: TenantConfig | null) => void
  setRole: (role: 'super_admin' | 'owner' | 'employee' | null) => void
  clear: () => void
}

/**
 * Store de Zustand para gestionar el contexto del tenant actual y el rol del usuario.
 * Se utiliza en toda la app para filtrar la UI y servicios por cliente.
 */
export const useTenantStore = create<TenantState>((set) => ({
  currentTenant: null,
  role: null,
  setTenant: (tenant) => set({ currentTenant: tenant }),
  setRole: (role) => set({ role }),
  clear: () => set({ currentTenant: null, role: null }),
}))
