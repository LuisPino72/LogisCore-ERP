export interface TenantModules {
  sales?: boolean
  inventory?: boolean
  purchases?: boolean
  recipes?: boolean
  reports?: boolean
  dashboard?: boolean
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
  { id: 'customers', label: 'Clientes' },
  { id: 'invoicing', label: 'Facturación' },
] as const

export const DEFAULT_THEME_CONFIG: TenantThemeConfig = {
  themeColor: '#ea580c',
}

export interface SystemMetrics {
  totalTenants: number
  activeTenants: number
  totalUsers: number
  recentActivity: ActivityLog[]
}

export interface ActivityLog {
  id: string
  tenant_id: string
  tenant_name: string
  action: 'create' | 'update' | 'delete' | 'login' | 'logout'
  target: 'tenant' | 'user' | 'config'
  description: string
  created_at: string
  user_id?: string
  user_email?: string
}

export interface DashboardStats {
  tenants: {
    total: number
    active: number
    inactive: number
  }
  users: {
    total: number
    owners: number
    employees: number
  }
  activity: {
    today: number
    thisWeek: number
    thisMonth: number
  }
}

export const DEFAULT_TENANT_CONFIG: TenantConfig = {
  maxEmployees: 3,
  themeConfig: DEFAULT_THEME_CONFIG,
}