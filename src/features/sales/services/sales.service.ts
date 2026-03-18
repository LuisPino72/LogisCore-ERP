import { db, Sale } from '@/lib/db';
import { SyncEngine } from '@/lib/sync/SyncEngine';
import { EventBus, Events } from '@/lib/events/EventBus';
import { useTenantStore } from '@/store/useTenantStore';
import { Ok, Err, Result, ValidationError, AppError } from '@/lib/types/result';
import { logger, logCategories } from '@/lib/logger';

function getCurrentTenantId(): string {
  const { currentTenant } = useTenantStore.getState();
  if (!currentTenant) {
    throw new AppError('No hay tenant activo', 'NO_TENANT', 400);
  }
  return currentTenant.slug;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface CreateSaleInput {
  items: SaleItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'pago_movil';
  exchangeRate?: number;
  exchangeRateSource?: 'api' | 'manual';
}

function validateSaleInput(data: CreateSaleInput): string[] {
  const errors: string[] = [];
  
  if (!data.items || data.items.length === 0) {
    errors.push('La venta debe tener al menos un producto');
  }
  
  if (data.total < 0) {
    errors.push('El total no puede ser negativo');
  }
  
  if (!['cash', 'card', 'pago_movil'].includes(data.paymentMethod)) {
    errors.push('Método de pago inválido');
  }
  
  for (const item of data.items || []) {
    if (!item.productId) {
      errors.push('Producto inválido');
    }
    if (item.quantity <= 0) {
      errors.push('La cantidad debe ser mayor a 0');
    }
    if (item.unitPrice < 0) {
      errors.push('El precio no puede ser negativo');
    }
  }
  
  return errors;
}

export async function getSales(): Promise<Sale[]> {
  const tenantId = getCurrentTenantId();
  return db.sales.where('tenantId').equals(tenantId).toArray();
}

export async function getSaleById(localId: string): Promise<Result<Sale, AppError>> {
  try {
    const tenantId = getCurrentTenantId();
    const sale = await db.sales
      .where('localId')
      .equals(localId)
      .filter(s => s.tenantId === tenantId)
      .first();
    
    if (!sale) {
      return Err(new AppError('Venta no encontrada', 'NOT_FOUND', 404));
    }
    
    return Ok(sale);
  } catch (error) {
    logger.error('Error al obtener venta', error instanceof Error ? error : undefined, { category: logCategories.SALES });
    return Err(new AppError('Error al obtener venta', 'GET_SALE_ERROR', 500));
  }
}

export async function createSale(data: CreateSaleInput): Promise<Result<string, AppError>> {
  try {
    const tenantId = getCurrentTenantId();
    
    const errors = validateSaleInput(data);
    if (errors.length > 0) {
      return Err(new ValidationError(errors.join(', ')));
    }
    
    const localId = crypto.randomUUID();
    const sale: Sale = {
      localId,
      tenantId,
      items: data.items,
      subtotal: data.subtotal,
      tax: data.tax,
      total: data.total,
      paymentMethod: data.paymentMethod,
      status: 'completed',
      createdAt: new Date(),
      exchangeRate: data.exchangeRate || 0,
      exchangeRateSource: data.exchangeRateSource || 'manual',
    };

    await db.transaction('rw', db.sales, db.products, async () => {
      for (const item of data.items) {
        const product = await db.products
          .where('localId')
          .equals(item.productId)
          .filter(p => p.tenantId === tenantId)
          .first();
        
        if (!product) {
          throw new AppError(`Producto no encontrado: ${item.productName}`, 'PRODUCT_NOT_FOUND', 404);
        }
        
        if (product.stock < item.quantity) {
          throw new ValidationError(`Stock insuficiente para ${item.productName}. Disponible: ${product.stock}`);
        }
        
        await db.products.put({
          ...product,
          stock: product.stock - item.quantity,
          updatedAt: new Date(),
        });
      }
      
      await db.sales.add(sale);
    });
    
    await SyncEngine.addToQueue('sales', 'create', sale as unknown as Record<string, unknown>, localId);
    
    EventBus.emit(Events.SALE_COMPLETED, { sale });
    logger.info('Venta creada', { saleId: localId, total: data.total, category: logCategories.SALES });
    
    return Ok(localId);
  } catch (error) {
    logger.error('Error al crear venta', error instanceof Error ? error : undefined, { category: logCategories.SALES });
    if (error instanceof AppError) {
      return Err(error);
    }
    return Err(new AppError('Error al crear venta', 'CREATE_SALE_ERROR', 500));
  }
}

export async function cancelSale(localId: string): Promise<Result<void, AppError>> {
  try {
    const tenantId = getCurrentTenantId();
    const sale = await db.sales
      .where('localId')
      .equals(localId)
      .filter(s => s.tenantId === tenantId)
      .first();
    
    if (!sale) {
      return Err(new AppError('Venta no encontrada', 'NOT_FOUND', 404));
    }
    
    if (sale.status === 'cancelled') {
      return Err(new ValidationError('La venta ya está cancelada'));
    }
    
    const updated = { ...sale, status: 'cancelled' as const };
    await db.sales.put(updated);
    await SyncEngine.addToQueue('sales', 'update', updated as unknown as Record<string, unknown>, localId);
    
    EventBus.emit(Events.SALE_CANCELLED, { sale: updated });
    logger.info('Venta cancelada', { saleId: localId, category: logCategories.SALES });
    
    return Ok(undefined);
  } catch (error) {
    logger.error('Error al cancelar venta', error instanceof Error ? error : undefined, { category: logCategories.SALES });
    if (error instanceof AppError) {
      return Err(error);
    }
    return Err(new AppError('Error al cancelar venta', 'CANCEL_SALE_ERROR', 500));
  }
}

export async function getSalesByDateRange(startDate: Date, endDate: Date): Promise<Sale[]> {
  const tenantId = getCurrentTenantId();
  return db.sales
    .where('tenantId')
    .equals(tenantId)
    .filter(s => s.createdAt >= startDate && s.createdAt <= endDate)
    .toArray();
}

export async function getSalesStats(): Promise<{
  totalSales: number;
  totalRevenue: number;
  completedCount: number;
  cancelledCount: number;
}> {
  const tenantId = getCurrentTenantId();
  const sales = await db.sales.where('tenantId').equals(tenantId).toArray();
  
  return {
    totalSales: sales.length,
    totalRevenue: sales.reduce((sum, s) => sum + (s.status === 'completed' ? s.total : 0), 0),
    completedCount: sales.filter(s => s.status === 'completed').length,
    cancelledCount: sales.filter(s => s.status === 'cancelled').length,
  };
}

export async function getDailyStats(): Promise<{
  totalSales: number;
  totalAmount: number;
  transactionCount: number;
  averageTicket: number;
  paymentMethodBreakdown: {
    cash: number;
    card: number;
    pago_movil: number;
  };
}> {
  const tenantId = getCurrentTenantId();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const sales = await db.sales
    .where('tenantId')
    .equals(tenantId)
    .filter(s => s.createdAt >= today && s.createdAt < tomorrow && s.status === 'completed')
    .toArray();
  
  const totalAmount = sales.reduce((sum, s) => sum + s.total, 0);
  const transactionCount = sales.length;
  
  return {
    totalSales: transactionCount,
    totalAmount,
    transactionCount,
    averageTicket: transactionCount > 0 ? totalAmount / transactionCount : 0,
    paymentMethodBreakdown: {
      cash: sales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.total, 0),
      card: sales.filter(s => s.paymentMethod === 'card').reduce((sum, s) => sum + s.total, 0),
      pago_movil: sales.filter(s => s.paymentMethod === 'pago_movil').reduce((sum, s) => sum + s.total, 0),
    },
  };
}
