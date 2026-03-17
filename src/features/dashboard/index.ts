export { default as Dashboard } from './components/Dashboard'
export { useDashboard } from './hooks/useDashboard'
export type { 
  DashboardStats, 
  DailySales, 
  CategorySales, 
  LowStockProduct,
  DashboardData,
  ExchangeRateInfo,
  TabType
} from './types/dashboard.types'
export { calculateTrend } from './services/dashboard.service'