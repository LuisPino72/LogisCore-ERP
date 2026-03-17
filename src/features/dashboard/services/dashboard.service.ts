import { db, Product, Sale, Category } from '@/lib/db';
import { logger, logCategories } from '@/lib/logger';

export interface DashboardStats {
  salesToday: number;
  salesYesterday: number;
  ordersThisMonth: number;
  ordersLastMonth: number;
  lowStockProducts: number;
  monthlyRevenue: number;
  lastMonthRevenue: number;
}

export interface DailySales {
  day: string;
  current: number;
  previous: number;
}

export interface CategorySales {
  category: string;
  total: number;
  color: string;
}

export interface LowStockProduct extends Product {
  categoryName: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  "General": "#6366f1",
  "Bebidas": "#22c55e",
  "Comida": "#f59e0b",
  "Insumos": "#ec4899",
  "Sin categoría": "#64748b",
};

function getDateRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const firstOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

  return { today, yesterday, firstOfMonth, firstOfLastMonth, lastOfLastMonth };
}

function filterSalesByDateRange(sales: Sale[], startDate: Date, endDate: Date): Sale[] {
  return sales.filter(s =>
    s.createdAt &&
    new Date(s.createdAt) >= startDate &&
    new Date(s.createdAt) <= endDate &&
    s.status === "completed"
  );
}

function calculateSalesTotal(sales: Sale[]): number {
  return sales.reduce((sum, s) => sum + (s.total || 0), 0);
}

function getLowStockProducts(products: Product[]): Product[] {
  return products.filter(p => (p.stock || 0) <= 10 && p.isActive);
}

export async function getDashboardData(tenantSlug: string): Promise<{
  stats: DashboardStats;
  dailySales: DailySales[];
  categorySales: CategorySales[];
  lowStockProducts: LowStockProduct[];
}> {
  try {
    const { today, yesterday, firstOfMonth, firstOfLastMonth, lastOfLastMonth } = getDateRange();

    const [products, sales, categories] = await Promise.all([
      db.products.where("tenantId").equals(tenantSlug).toArray(),
      db.sales.where("tenantId").equals(tenantSlug).toArray(),
      db.categories.where("tenantId").equals(tenantSlug).toArray(),
    ]);

    const completedSales = sales.filter(s => s.status === "completed");

    const salesToday = calculateSalesTotal(
      filterSalesByDateRange(sales, today, new Date(today.getTime() + 86400000))
    );

    const salesYesterday = calculateSalesTotal(
      filterSalesByDateRange(sales, yesterday, today)
    );

    const ordersThisMonth = filterSalesByDateRange(sales, firstOfMonth, new Date()).length;
    const ordersLastMonth = filterSalesByDateRange(sales, firstOfLastMonth, lastOfLastMonth).length;

    const monthlyRevenue = calculateSalesTotal(
      filterSalesByDateRange(sales, firstOfMonth, new Date())
    );

    const lastMonthRevenue = calculateSalesTotal(
      filterSalesByDateRange(sales, firstOfLastMonth, lastOfLastMonth)
    );

    const lowStock = getLowStockProducts(products);

    const stats: DashboardStats = {
      salesToday,
      salesYesterday,
      ordersThisMonth,
      ordersLastMonth,
      lowStockProducts: lowStock.length,
      monthlyRevenue,
      lastMonthRevenue,
    };

    const lowStockProducts: LowStockProduct[] = lowStock.map(p => ({
      ...p,
      categoryName: categories.find(c => c.id === p.categoryId)?.name || "Sin categoría",
    })).slice(0, 10);

    const dailySales = calculateDailySales(sales, today);
    const categorySales = calculateCategorySales(products, categories, completedSales);

    return { stats, dailySales, categorySales, lowStockProducts };
  } catch (error) {
    logger.error("Error loading dashboard data", error instanceof Error ? error : undefined, { category: logCategories.UI });
    return {
      stats: {
        salesToday: 0,
        salesYesterday: 0,
        ordersThisMonth: 0,
        ordersLastMonth: 0,
        lowStockProducts: 0,
        monthlyRevenue: 0,
        lastMonthRevenue: 0,
      },
      dailySales: [],
      categorySales: [],
      lowStockProducts: [],
    };
  }
}

function calculateDailySales(sales: Sale[], today: Date): DailySales[] {
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const dailyData: DailySales[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const prevDate = new Date(dayStart);
    prevDate.setDate(prevDate.getDate() - 7);
    const prevDayStart = new Date(prevDate);
    prevDayStart.setHours(0, 0, 0, 0);
    const prevDayEnd = new Date(prevDate);
    prevDayEnd.setHours(23, 59, 59, 999);

    const currentDaySales = calculateSalesTotal(
      filterSalesByDateRange(sales, dayStart, dayEnd)
    );

    const previousDaySales = calculateSalesTotal(
      filterSalesByDateRange(sales, prevDayStart, prevDayEnd)
    );

    dailyData.push({
      day: days[date.getDay()],
      current: currentDaySales,
      previous: previousDaySales,
    });
  }

  return dailyData;
}

function calculateCategorySales(products: Product[], categories: Category[], sales: Sale[]): CategorySales[] {
  const categoryMap = new Map<string, number>();

  sales.forEach(sale => {
    sale.items.forEach(item => {
      const product = products.find(p => p.localId === item.productId);
      if (product) {
        const catId = product.categoryId;
        const cat = categories.find(c => c.id === catId);
        const catName = cat?.name || "Sin categoría";
        categoryMap.set(catName, (categoryMap.get(catName) || 0) + item.total);
      }
    });
  });

  return Array.from(categoryMap.entries())
    .map(([category, total]) => ({
      category,
      total,
      color: CATEGORY_COLORS[category] || "#64748b",
    }))
    .sort((a, b) => b.total - a.total);
}

export function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
