import { db, Sale } from '@/lib/db';

export type DateRange = "today" | "week" | "month" | "all" | "custom";

export interface CustomDateRange {
  start: Date | null
  end: Date | null
}

export interface Stats {
  totalSales: number;
  totalPurchases: number;
  totalProducts: number;
  totalOrders: number;
  avgOrderValue: number;
  cashPayments: number;
  cardPayments: number;
  pagoMovilPayments: number;
  totalProfit: number;
  productsLowStock: number;
}

export interface TopProduct {
  name: string;
  sales: number;
  revenue: number;
  profit?: number;
}

export interface DailySales {
  date: string;
  total: number;
  count: number;
}

export interface CategorySales {
  category: string;
  total: number;
  percentage: number;
}

function getStartDate(dateRange: DateRange, customRange?: CustomDateRange): Date | null {
  const now = new Date();
  switch (dateRange) {
    case "today":
      return new Date(now.setHours(0, 0, 0, 0));
    case "week":
      return new Date(now.setDate(now.getDate() - 7));
    case "month":
      return new Date(now.setMonth(now.getMonth() - 1));
    case "all":
      return null;
    case "custom":
      return customRange?.start || null;
    default:
      return null;
  }
}

function getEndDate(dateRange: DateRange, customRange?: CustomDateRange): Date | null {
  if (dateRange === "custom") {
    return customRange?.end || null;
  }
  return null;
}

function filterByDateRange<T extends { createdAt?: Date; status: string }>(
  items: T[],
  startDate: Date | null,
  endDate: Date | null
): T[] {
  return items.filter(item => {
    if (item.status !== "completed") return false;
    if (!startDate && !endDate) return true;
    if (startDate && item.createdAt && item.createdAt < startDate) return false;
    if (endDate && item.createdAt && item.createdAt > endDate) return false;
    return true;
  });
}

function calculateTotal(items: { total: number }[]): number {
  return items.reduce((sum, item) => sum + (item.total || 0), 0);
}

export async function getReportsData(
  tenantSlug: string, 
  dateRange: DateRange,
  customRange?: CustomDateRange
): Promise<{
  stats: Stats;
  recentSales: Sale[];
  topProducts: TopProduct[];
  dailySales: DailySales[];
  lowStockProducts: { name: string; stock: number }[];
}> {
  const startDate = getStartDate(dateRange, customRange);
  const endDate = getEndDate(dateRange, customRange);

  const [sales, purchases, products] = await Promise.all([
    db.sales.where("tenantId").equals(tenantSlug).toArray(),
    db.purchases.where("tenantId").equals(tenantSlug).toArray(),
    db.products.where("tenantId").equals(tenantSlug).toArray(),
  ]);

  const filteredSales = filterByDateRange(sales, startDate, endDate);
  const filteredPurchases = filterByDateRange(purchases, startDate, endDate);

  const totalSales = calculateTotal(filteredSales);
  const totalPurchases = calculateTotal(filteredPurchases);

  const cashPayments = calculateTotal(filteredSales.filter(s => s.paymentMethod === "cash"));
  const cardPayments = calculateTotal(filteredSales.filter(s => s.paymentMethod === "card"));
  const pagoMovilPayments = calculateTotal(filteredSales.filter(s => s.paymentMethod === "pago_movil"));

  const totalProfit = totalSales - totalPurchases;
  const productsLowStock = products.filter(p => p.stock <= 5).length;

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
    .slice(0, 10);

  const dailySalesMap: Record<string, { total: number; count: number }> = {};
  filteredSales.forEach(sale => {
    const dateKey = sale.createdAt.toISOString().split('T')[0];
    if (!dailySalesMap[dateKey]) {
      dailySalesMap[dateKey] = { total: 0, count: 0 };
    }
    dailySalesMap[dateKey].total += sale.total;
    dailySalesMap[dateKey].count += 1;
  });

  const dailySales: DailySales[] = Object.entries(dailySalesMap)
    .map(([date, data]) => ({ date, total: data.total, count: data.count }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);

  const recentSales = sales
    .filter(s => s.status === "completed")
    .slice(-10)
    .reverse();

  const lowStockProducts = products
    .filter(p => p.stock <= 10)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 10)
    .map(p => ({ name: p.name, stock: p.stock }));

  return {
    stats: {
      totalSales,
      totalPurchases,
      totalProducts: products.length,
      totalOrders: filteredSales.length,
      avgOrderValue: filteredSales.length > 0 ? totalSales / filteredSales.length : 0,
      cashPayments,
      cardPayments,
      pagoMovilPayments,
      totalProfit,
      productsLowStock,
    },
    recentSales,
    topProducts,
    dailySales,
    lowStockProducts,
  };
}

export function exportReportsToCSV(
  stats: Stats,
  recentSales: Sale[],
  topProducts: TopProduct[],
  dateRange: string
): string {
  const lines: string[] = [];
  
  lines.push(`"Reporte de Ventas - ${dateRange}"`);
  lines.push("");
  
  lines.push("RESUMEN");
  lines.push(`"Ventas Totales","$${stats.totalSales.toFixed(2)}"`);
  lines.push(`"Total Órdenes","${stats.totalOrders}"`);
  lines.push(`"Ticket Promedio","$${stats.avgOrderValue.toFixed(2)}"`);
  lines.push(`"Ganancia Neta","$${stats.totalProfit.toFixed(2)}"`);
  lines.push(`"Pago en Efectivo","$${stats.cashPayments.toFixed(2)}"`);
  lines.push(`"Pago con Tarjeta","$${stats.cardPayments.toFixed(2)}"`);
  lines.push(`"Pago Móvil","$${stats.pagoMovilPayments.toFixed(2)}"`);
  lines.push("");
  
  lines.push("ÚLTIMAS VENTAS");
  lines.push("Fecha,Items,Total,Método");
  recentSales.forEach(sale => {
    const date = new Date(sale.createdAt).toLocaleDateString();
    const method = sale.paymentMethod === 'cash' ? 'Efectivo' : sale.paymentMethod === 'card' ? 'Tarjeta' : 'Pago Móvil';
    lines.push(`"${date}","${sale.items.length}","$${sale.total.toFixed(2)}","${method}"`);
  });
  lines.push("");
  
  lines.push("PRODUCTOS MÁS VENDIDOS");
  lines.push("Producto,Cantidad,Ingresos");
  topProducts.forEach(p => {
    lines.push(`"${p.name}","${p.sales}","$${p.revenue.toFixed(2)}"`);
  });
  
  return lines.join('\n');
}
