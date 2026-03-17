import type { Product } from '@/lib/db'

export interface DashboardStats {
  salesToday: number
  salesYesterday: number
  ordersThisMonth: number
  ordersLastMonth: number
  lowStockProducts: number
  monthlyRevenue: number
  lastMonthRevenue: number
}

export interface DailySales {
  day: string
  current: number
  previous: number
}

export interface CategorySales {
  category: string
  total: number
  color: string
}

export interface LowStockProduct extends Product {
  categoryName: string
}

export interface DashboardData {
  stats: DashboardStats
  dailySales: DailySales[]
  categorySales: CategorySales[]
  lowStockProducts: LowStockProduct[]
}

export interface ExchangeRateInfo {
  rate: number
  updatedAt: Date
  source: 'api' | 'manual'
}

export type TabType = 'resumen' | 'ventas' | 'categorias' | 'inventario'

export const CATEGORY_COLORS: Record<string, string> = {
  'General': '#6366f1',
  'Bebidas': '#22c55e',
  'Comida': '#f59e0b',
  'Insumos': '#ec4899',
  'Sin categoría': '#64748b',
}