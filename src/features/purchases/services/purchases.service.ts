import { db, Purchase } from '@/lib/db';
import { SyncEngine } from '@/lib/sync/SyncEngine';
import { useTenantStore } from '@/store/useTenantStore';
import { Ok, Err, Result, ValidationError, AppError } from '@/lib/types/result';
import { logger, logCategories } from '@/lib/logger';
import type { SortConfig, DateRange, PurchaseStatus, PurchaseStats } from '../types/purchases.types';

function getCurrentTenantId(): string {
  const { currentTenant } = useTenantStore.getState();
  if (!currentTenant) {
    throw new AppError('No hay tenant activo', 'NO_TENANT', 400);
  }
  return currentTenant.slug;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  cost: number;
  total: number;
}

export interface CreatePurchaseInput {
  supplier: string;
  invoiceNumber: string;
  items: PurchaseItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'completed' | 'cancelled';
}

function validatePurchaseInput(data: CreatePurchaseInput): string[] {
  const errors: string[] = [];
  
  if (!data.supplier?.trim()) {
    errors.push('El proveedor es requerido');
  }
  
  if (!data.invoiceNumber?.trim()) {
    errors.push('El número de factura es requerido');
  }
  
  if (!data.items || data.items.length === 0) {
    errors.push('La compra debe tener al menos un producto');
  }
  
  if (data.total < 0) {
    errors.push('El total no puede ser negativo');
  }
  
  if (!['pending', 'completed', 'cancelled'].includes(data.status)) {
    errors.push('Estado de compra inválido');
  }
  
  for (const item of data.items || []) {
    if (!item.productId) {
      errors.push('Producto inválido');
    }
    if (item.quantity <= 0) {
      errors.push('La cantidad debe ser mayor a 0');
    }
    if (item.cost < 0) {
      errors.push('El costo no puede ser negativo');
    }
  }
  
  return errors;
}

export async function getPurchases(): Promise<Purchase[]> {
  const tenantId = getCurrentTenantId();
  return db.purchases.where('tenantId').equals(tenantId).toArray();
}

export async function getPurchaseById(localId: string): Promise<Result<Purchase, AppError>> {
  try {
    const tenantId = getCurrentTenantId();
    const purchase = await db.purchases
      .where('localId')
      .equals(localId)
      .filter(p => p.tenantId === tenantId)
      .first();
    
    if (!purchase) {
      return Err(new AppError('Compra no encontrada', 'NOT_FOUND', 404));
    }
    
    return Ok(purchase);
  } catch (error) {
    logger.error('Error al obtener compra', error instanceof Error ? error : undefined, { category: logCategories.DATABASE });
    return Err(new AppError('Error al obtener compra', 'GET_PURCHASE_ERROR', 500));
  }
}

export async function createPurchase(data: CreatePurchaseInput): Promise<Result<string, AppError>> {
  try {
    const tenantId = getCurrentTenantId();
    
    const errors = validatePurchaseInput(data);
    if (errors.length > 0) {
      return Err(new ValidationError(errors.join(', ')));
    }
    
    const localId = crypto.randomUUID();
    const purchase: Purchase = {
      localId,
      tenantId,
      supplier: data.supplier,
      invoiceNumber: data.invoiceNumber,
      items: data.items,
      subtotal: data.subtotal,
      tax: data.tax,
      total: data.total,
      status: data.status,
      createdAt: new Date(),
    };

    await db.purchases.add(purchase);
    await SyncEngine.addToQueue('purchases', 'create', purchase as unknown as Record<string, unknown>, localId);
    
    logger.info('Compra creada', { purchaseId: localId, supplier: data.supplier, category: logCategories.DATABASE });
    
    return Ok(localId);
  } catch (error) {
    logger.error('Error al crear compra', error instanceof Error ? error : undefined, { category: logCategories.DATABASE });
    if (error instanceof AppError) {
      return Err(error);
    }
    return Err(new AppError('Error al crear compra', 'CREATE_PURCHASE_ERROR', 500));
  }
}

export async function updatePurchaseStatus(localId: string, status: 'pending' | 'completed' | 'cancelled'): Promise<Result<void, AppError>> {
  try {
    const tenantId = getCurrentTenantId();
    const purchase = await db.purchases
      .where('localId')
      .equals(localId)
      .filter(p => p.tenantId === tenantId)
      .first();
    
    if (!purchase) {
      return Err(new AppError('Compra no encontrada', 'NOT_FOUND', 404));
    }
    
    const updated = { ...purchase, status };
    await db.purchases.put(updated);
    await SyncEngine.addToQueue('purchases', 'update', updated as unknown as Record<string, unknown>, localId);
    
    logger.info('Estado de compra actualizado', { purchaseId: localId, status, category: logCategories.DATABASE });
    
    return Ok(undefined);
  } catch (error) {
    logger.error('Error al actualizar compra', error instanceof Error ? error : undefined, { category: logCategories.DATABASE });
    if (error instanceof AppError) {
      return Err(error);
    }
    return Err(new AppError('Error al actualizar compra', 'UPDATE_PURCHASE_ERROR', 500));
  }
}

export async function getPendingPurchases(): Promise<Purchase[]> {
  const tenantId = getCurrentTenantId();
  return db.purchases
    .where('tenantId')
    .equals(tenantId)
    .filter(p => p.status === 'pending')
    .toArray();
}

export interface FilterOptions {
  search?: string
  status?: PurchaseStatus | 'all'
  dateRange?: DateRange
  sort?: SortConfig
  page?: number
  pageSize?: number
}

export async function filterPurchases(options: FilterOptions = {}): Promise<{
  purchases: Purchase[]
  total: number
  stats: PurchaseStats
}> {
  const tenantId = getCurrentTenantId();
  const { search = '', status = 'all', dateRange, sort, page = 1, pageSize = 20 } = options;

  let purchases = await db.purchases
    .where('tenantId')
    .equals(tenantId)
    .toArray();

  if (search) {
    const searchLower = search.toLowerCase();
    purchases = purchases.filter(p =>
      p.supplier.toLowerCase().includes(searchLower) ||
      p.invoiceNumber.toLowerCase().includes(searchLower)
    );
  }

  if (status !== 'all') {
    purchases = purchases.filter(p => p.status === status);
  }

  if (dateRange?.start) {
    purchases = purchases.filter(p => p.createdAt >= dateRange.start!);
  }
  if (dateRange?.end) {
    purchases = purchases.filter(p => p.createdAt <= dateRange.end!);
  }

  const stats: PurchaseStats = {
    totalCompleted: purchases.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.total, 0),
    totalPending: purchases.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.total, 0),
    totalCancelled: purchases.filter(p => p.status === 'cancelled').reduce((sum, p) => sum + p.total, 0),
    countCompleted: purchases.filter(p => p.status === 'completed').length,
    countPending: purchases.filter(p => p.status === 'pending').length,
    countCancelled: purchases.filter(p => p.status === 'cancelled').length,
    avgPurchase: purchases.length > 0 ? purchases.reduce((sum, p) => sum + p.total, 0) / purchases.length : 0,
  };

  if (sort) {
    purchases.sort((a, b) => {
      let comparison = 0;
      switch (sort.field) {
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'supplier':
          comparison = a.supplier.localeCompare(b.supplier);
          break;
        case 'invoiceNumber':
          comparison = a.invoiceNumber.localeCompare(b.invoiceNumber);
          break;
        case 'total':
          comparison = a.total - b.total;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sort.direction === 'asc' ? comparison : -comparison;
    });
  } else {
    purchases.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  const total = purchases.length;
  const startIndex = (page - 1) * pageSize;
  const paginatedPurchases = purchases.slice(startIndex, startIndex + pageSize);

  return { purchases: paginatedPurchases, total, stats };
}

export function exportPurchasesToCSV(purchases: Purchase[]): string {
  const headers = ['Fecha', 'Proveedor', 'Factura', 'Items', 'Subtotal', 'Total', 'Estado'];
  const rows = purchases.map(p => [
    p.createdAt.toLocaleDateString(),
    p.supplier,
    p.invoiceNumber,
    p.items.length.toString(),
    p.subtotal.toFixed(2),
    p.total.toFixed(2),
    p.status === 'completed' ? 'Completado' : p.status === 'pending' ? 'Pendiente' : 'Cancelado',
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  return csvContent;
}
