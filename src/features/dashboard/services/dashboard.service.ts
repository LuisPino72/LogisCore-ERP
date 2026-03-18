import { db, Product, Sale, Category } from '@/lib/db'
import { Result, Ok, Err, AppError } from '@/lib/types/result'
import { logger, logCategories } from '@/lib/logger'
import type { DashboardStats, DailySales, CategorySales, LowStockProduct, DashboardData, TopProduct, DashboardDateRange } from '../types/dashboard.types'
import { CATEGORY_COLORS } from '../types/dashboard.types'

function getTodayRange(): DashboardDateRange {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(today)
  end.setHours(23, 59, 59, 999)
  return { start: today, end }
}

function getYesterdayRange(): DashboardDateRange {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const endOfYesterday = new Date(yesterday)
  endOfYesterday.setHours(23, 59, 59, 999)
  return { start: yesterday, end: endOfYesterday }
}

function getCurrentMonthRange(): DashboardDateRange {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function getLastMonthRange(): DashboardDateRange {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const end = new Date(today.getFullYear(), today.getMonth(), 0)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export function getDefaultDashboardRange(): DashboardDateRange {
  return getCurrentMonthRange()
}

function filterSalesByDateRange(sales: Sale[], startDate: Date, endDate: Date): Sale[] {
  return sales.filter(s =>
    s.createdAt &&
    new Date(s.createdAt) >= startDate &&
    new Date(s.createdAt) <= endDate &&
    s.status === 'completed'
  )
}

function calculateSalesTotal(sales: Sale[]): number {
  return sales.reduce((sum, s) => sum + (s.total || 0), 0)
}

function getLowStockProducts(products: Product[]): Product[] {
  return products.filter(p => (p.stock || 0) <= 10 && p.isActive)
}

export async function getDashboardData(
  tenantSlug: string,
  dateRange?: DashboardDateRange
): Promise<Result<DashboardData, AppError>> {
  try {
    if (!tenantSlug) {
      return Err(new AppError('Tenant slug requerido', 'INVALID_TENANT', 400))
    }

    const range = dateRange || getDefaultDashboardRange()

    const [products, sales, categories] = await Promise.all([
      db.products.where('tenantId').equals(tenantSlug).toArray(),
      db.sales.where('tenantId').equals(tenantSlug).toArray(),
      db.categories.where('tenantId').equals(tenantSlug).toArray(),
    ])

    const todayRange = getTodayRange()
    const yesterdayRange = getYesterdayRange()
    const currentMonthRange = getCurrentMonthRange()
    const lastMonthRange = getLastMonthRange()

    const salesToday = calculateSalesTotal(
      filterSalesByDateRange(sales, todayRange.start, todayRange.end)
    )

    const salesYesterday = calculateSalesTotal(
      filterSalesByDateRange(sales, yesterdayRange.start, yesterdayRange.end)
    )

    const ordersThisMonth = filterSalesByDateRange(sales, currentMonthRange.start, currentMonthRange.end).length
    const ordersLastMonth = filterSalesByDateRange(sales, lastMonthRange.start, lastMonthRange.end).length

    const lastMonthRevenue = calculateSalesTotal(
      filterSalesByDateRange(sales, lastMonthRange.start, lastMonthRange.end)
    )

    const rangeSales = filterSalesByDateRange(sales, range.start, range.end)
    const rangeRevenue = calculateSalesTotal(rangeSales)

    const lowStock = getLowStockProducts(products)

    const stats: DashboardStats = {
      salesToday,
      salesYesterday,
      ordersThisMonth,
      ordersLastMonth,
      lowStockProducts: lowStock.length,
      monthlyRevenue: rangeRevenue,
      lastMonthRevenue,
    }

    const lowStockProducts: LowStockProduct[] = lowStock.map(p => ({
      ...p,
      categoryName: categories.find(c => c.id === p.categoryId)?.name || 'Sin categoría',
    })).slice(0, 10)

    const dailySales = calculateDailySalesForRange(sales, range.start, range.end)
    const categorySales = calculateCategorySales(products, categories, rangeSales)
    const topProducts = calculateTopProducts(products, categories, rangeSales)

    logger.info('Dashboard data loaded', { tenantSlug, stats, range })

    return Ok({ stats, dailySales, categorySales, lowStockProducts, topProducts })
  } catch (error) {
    logger.error('Error loading dashboard data', error instanceof Error ? error : undefined, { category: logCategories.UI })
    return Err(new AppError('Error al cargar datos del dashboard', 'DASHBOARD_ERROR', 500, { detail: error instanceof Error ? error.message : 'Unknown error' }))
  }
}

function calculateDailySalesForRange(sales: Sale[], startDate: Date, endDate: Date): DailySales[] {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const dailyData: DailySales[] = []

  const start = new Date(startDate)
  const end = new Date(endDate)
  const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const daysToShow = Math.min(7, dayCount)

  for (let i = daysToShow - 1; i >= 0; i--) {
    const date = new Date(end)
    date.setDate(date.getDate() - i)
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)

    const currentDaySales = calculateSalesTotal(
      filterSalesByDateRange(sales, dayStart, dayEnd)
    )

    dailyData.push({
      day: days[date.getDay()],
      current: currentDaySales,
      previous: 0,
    })
  }

  return dailyData
}

function calculateCategorySales(products: Product[], categories: Category[], sales: Sale[]): CategorySales[] {
  const categoryMap = new Map<string, number>()

  sales.forEach(sale => {
    sale.items.forEach(item => {
      const product = products.find(p => p.localId === item.productId)
      if (product) {
        const catId = product.categoryId
        const cat = categories.find(c => c.id === catId)
        const catName = cat?.name || 'Sin categoría'
        categoryMap.set(catName, (categoryMap.get(catName) || 0) + item.total)
      }
    })
  })

  return Array.from(categoryMap.entries())
    .map(([category, total]) => ({
      category,
      total,
      color: CATEGORY_COLORS[category] || '#64748b',
    }))
    .sort((a, b) => b.total - a.total)
}

function calculateTopProducts(products: Product[], categories: Category[], sales: Sale[]): TopProduct[] {
  const productMap = new Map<string, { quantity: number; total: number }>()

  sales.forEach(sale => {
    sale.items.forEach(item => {
      const current = productMap.get(item.productId) || { quantity: 0, total: 0 }
      productMap.set(item.productId, {
        quantity: current.quantity + item.quantity,
        total: current.total + item.total,
      })
    })
  })

  return Array.from(productMap.entries())
    .map(([productId, data]) => {
      const product = products.find(p => p.localId === productId)
      const category = product ? categories.find(c => c.id === product.categoryId) : null
      return {
        localId: productId,
        name: product?.name || 'Producto desconocido',
        quantity: data.quantity,
        total: data.total,
        categoryName: category?.name || 'Sin categoría',
      }
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
}

export function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}