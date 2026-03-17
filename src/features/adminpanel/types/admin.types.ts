export interface TenantModules {
  sales?: boolean
  inventory?: boolean
  purchases?: boolean
  recipes?: boolean
  reports?: boolean
  dashboard?: boolean
  pos?: boolean
  employees?: boolean
  [key: string]: boolean | undefined
}

export interface TenantThemeConfig {
  themeColor: string
  mode: 'dark' | 'light'
  accentIntensity: 'subtle' | 'normal' | 'intense'
}

export interface TenantConfig {
  logoUrl?: string
  maxEmployees?: number
  themeConfig?: TenantThemeConfig
  ownerId?: string
}

export interface Tenant {
  id: string
  name: string
  slug: string
  modules: TenantModules
  config: TenantConfig
  created_at: string
}

export interface OwnerCredentials {
  email: string
  password: string
  confirmPassword: string
}

export type ViewMode = 'table' | 'grid' | 'expandable'

export const ALL_MODULES = [
  { id: 'sales', label: 'Ventas' },
  { id: 'inventory', label: 'Inventario' },
  { id: 'purchases', label: 'Compras' },
  { id: 'recipes', label: 'Recetas' },
  { id: 'pos', label: 'Punto de Venta' },
  { id: 'employees', label: 'Empleados' },
] as const

export const DEFAULT_THEME_CONFIG: TenantThemeConfig = {
  themeColor: '#ea580c',
  mode: 'dark',
  accentIntensity: 'normal',
}

export const DEFAULT_TENANT_CONFIG: TenantConfig = {
  maxEmployees: 3,
  themeConfig: DEFAULT_THEME_CONFIG,
}