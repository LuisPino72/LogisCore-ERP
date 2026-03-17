export type DateRange = 'today' | 'week' | 'month' | 'all'

export interface Stats {
  totalSales: number
  totalPurchases: number
  totalProducts: number
  totalOrders: number
  avgOrderValue: number
  cashPayments: number
  cardPayments: number
}

export interface TopProduct {
  name: string
  sales: number
  revenue: number
}

export interface ReportsData {
  stats: Stats
  topProducts: TopProduct[]
}

export type ReportType = 'sales' | 'inventory' | 'financial' | 'production'