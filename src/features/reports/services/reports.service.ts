import { db, Sale } from '@/lib/db';

export type DateRange = "today" | "week" | "month" | "all";

export interface Stats {
  totalSales: number;
  totalPurchases: number;
  totalProducts: number;
  totalOrders: number;
  avgOrderValue: number;
  cashPayments: number;
  cardPayments: number;
}

export interface TopProduct {
  name: string;
  sales: number;
  revenue: number;
}

function getStartDate(dateRange: DateRange): Date | null {
  const now = new Date();
  switch (dateRange) {
    case "today":
      return new Date(now.setHours(0, 0, 0, 0));
    case "week":
      return new Date(now.setDate(now.getDate() - 7));
    case "month":
      return new Date(now.setMonth(now.getMonth() - 1));
    case "all":
    default:
      return null;
  }
}

function filterByDateRange<T extends { createdAt?: Date; status: string }>(
  items: T[],
  startDate: Date | null
): T[] {
  return items.filter(item => {
    if (item.status !== "completed") return false;
    if (!startDate) return true;
    return item.createdAt && item.createdAt >= startDate;
  });
}

function calculateTotal(items: { total: number }[]): number {
  return items.reduce((sum, item) => sum + (item.total || 0), 0);
}

export async function getReportsData(tenantSlug: string, dateRange: DateRange): Promise<{
  stats: Stats;
  recentSales: Sale[];
  topProducts: TopProduct[];
}> {
  const startDate = getStartDate(dateRange);

  const [sales, purchases, products] = await Promise.all([
    db.sales.where("tenantId").equals(tenantSlug).toArray(),
    db.purchases.where("tenantId").equals(tenantSlug).toArray(),
    db.products.where("tenantId").equals(tenantSlug).toArray(),
  ]);

  const filteredSales = filterByDateRange(sales, startDate);
  const filteredPurchases = filterByDateRange(purchases, startDate);

  const totalSales = calculateTotal(filteredSales);
  const totalPurchases = calculateTotal(filteredPurchases);

  const cashPayments = calculateTotal(filteredSales.filter(s => s.paymentMethod === "cash"));
  const cardPayments = calculateTotal(filteredSales.filter(s => s.paymentMethod === "card"));

  const productSales: Record<string, TopProduct> = {};
  filteredSales.forEach(sale => {
    sale.items.forEach(item => {
      if (!productSales[item.productId]) {
        productSales[item.productId] = { name: item.productName, sales: 0, revenue: 0 };
      }
      productSales[item.productId].sales += item.quantity;
      productSales[item.productId].revenue += item.total;
    });
  });

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const recentSales = sales
    .filter(s => s.status === "completed")
    .slice(-10)
    .reverse();

  return {
    stats: {
      totalSales,
      totalPurchases,
      totalProducts: products.length,
      totalOrders: filteredSales.length,
      avgOrderValue: filteredSales.length > 0 ? totalSales / filteredSales.length : 0,
      cashPayments,
      cardPayments,
    },
    recentSales,
    topProducts,
  };
}
