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
  accounting?: boolean
  [key: string]: boolean | undefined
}

export const ALWAYS_ENABLED_MODULES = ['dashboard', 'reports', 'exchange-rate'] as const;
export type AlwaysEnabledModule = typeof ALWAYS_ENABLED_MODULES[number];

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

const MODULE_DEPENDENCIES: Record<string, string[]> = {
  pos: ['inventory'],
  invoicing: ['customers'],
  recipes: ['inventory'],
  purchases: ['inventory'],
};

export function isModuleEnabled(moduleId: string, tenant: TenantConfig | null): boolean {
  if (ALWAYS_ENABLED_MODULES.includes(moduleId as AlwaysEnabledModule)) {
    return true;
  }
  if (!tenant?.modules) return false;
  return tenant.modules[moduleId] === true;
}

export function checkModuleDependencies(moduleId: string, tenant: TenantConfig | null): { 
  enabled: boolean; 
  missingDependencies: string[] 
} {
  const enabled = isModuleEnabled(moduleId, tenant);
  const dependencies = MODULE_DEPENDENCIES[moduleId] || [];
  const missingDependencies = dependencies.filter(dep => !isModuleEnabled(dep, tenant));
  
  return {
    enabled,
    missingDependencies,
  };
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
