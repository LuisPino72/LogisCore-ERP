import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface TenantModules {
  sales?: boolean
  inventory?: boolean
  purchases?: boolean
  recipes?: boolean
  reports?: boolean
  pos?: boolean
  employees?: boolean
  customers?: boolean
  invoicing?: boolean
  [key: string]: boolean | undefined
}

export interface TenantThemeConfig {
  themeColor: string
  themeColorSecondary?: string
}

export interface TenantConfig {
  id: string
  name: string
  slug: string
  modules: TenantModules
  themeConfig?: TenantThemeConfig
  config?: Record<string, unknown>
}

interface TenantState {
  currentTenant: TenantConfig | null
  role: 'super_admin' | 'owner' | 'employee' | null
  permissions: Record<string, unknown>
  isImpersonating: boolean
  setTenant: (tenant: TenantConfig | null) => void
  setRole: (role: 'super_admin' | 'owner' | 'employee' | null, permissions?: Record<string, unknown>) => void
  startImpersonation: (tenant: TenantConfig) => void
  stopImpersonation: () => void
  clear: () => void
}

/**
 * Store de Zustand para gestionar el contexto del tenant actual y el rol del usuario.
 * Se utiliza en toda la app para filtrar la UI y servicios por cliente.
 */
export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      currentTenant: null,
      role: null,
      permissions: {},
      isImpersonating: false,
      setTenant: (tenant) => set({ currentTenant: tenant }),
      setRole: (role, permissions = {}) => set({ role, permissions }),
      startImpersonation: (tenant) => set({ currentTenant: tenant, isImpersonating: true }),
      stopImpersonation: () => set({ currentTenant: null, isImpersonating: false }),
      clear: () => set({ currentTenant: null, role: null, permissions: {}, isImpersonating: false }),
    }),
    {
      name: 'logiscore-tenant-storage',
    }
  )
)
