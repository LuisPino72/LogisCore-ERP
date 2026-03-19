import { db, Movement, MovementType, MovementCategory, MovementPaymentMethod } from '@/lib/db';
import { SyncEngine } from '@/lib/sync/SyncEngine';
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

export interface CreateMovementInput {
  type: MovementType;
  category: MovementCategory;
  amount: number;
  currency?: string;
  paymentMethod?: MovementPaymentMethod;
  description?: string;
  referenceType?: string;
  referenceId?: string;
  status?: 'pending' | 'completed' | 'cancelled';
}

export function validateMovementInput(data: CreateMovementInput): string[] {
  const errors: string[] = [];

  if (!['income', 'expense', 'transfer'].includes(data.type)) {
    errors.push('Tipo de movimiento inválido');
  }

  if (!data.category) {
    errors.push('La categoría es requerida');
  }

  if (data.amount <= 0) {
    errors.push('El monto debe ser mayor a 0');
  }

  if (data.amount > 999999999) {
    errors.push('El monto excede el límite permitido');
  }

  return errors;
}

export async function getMovements(): Promise<Movement[]> {
  const tenantId = getCurrentTenantId();
  return db.movements.where('tenantId').equals(tenantId).toArray();
}

export async function getMovementById(localId: string): Promise<Result<Movement, AppError>> {
  try {
    const tenantId = getCurrentTenantId();
    const movement = await db.movements
      .where('localId')
      .equals(localId)
      .filter(m => m.tenantId === tenantId)
      .first();

    if (!movement) {
      return Err(new AppError('Movimiento no encontrado', 'NOT_FOUND', 404));
    }

    return Ok(movement);
  } catch (error) {
    logger.error('Error al obtener movimiento', error instanceof Error ? error : undefined, { category: logCategories.DATABASE });
    return Err(new AppError('Error al obtener movimiento', 'GET_MOVEMENT_ERROR', 500));
  }
}

export async function createMovement(data: CreateMovementInput): Promise<Result<string, AppError>> {
  try {
    const tenantId = getCurrentTenantId();
    const { currentTenant: _currentTenant } = useTenantStore.getState();

    const errors = validateMovementInput(data);
    if (errors.length > 0) {
      return Err(new ValidationError(errors.join(', ')));
    }

    const localId = crypto.randomUUID();
    const movement: Movement = {
      localId,
      tenantId,
      type: data.type,
      category: data.category,
      amount: data.amount,
      currency: data.currency || 'USD',
      paymentMethod: data.paymentMethod,
      description: data.description,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      status: data.status || 'completed',
      createdAt: new Date(),
    };

    await db.movements.add(movement);
    await SyncEngine.addToQueue('movements', 'create', movement as unknown as Record<string, unknown>, localId);

    logger.info('Movimiento creado', { movementId: localId, type: data.type, amount: data.amount, category: logCategories.DATABASE });

    return Ok(localId);
  } catch (error) {
    logger.error('Error al crear movimiento', error instanceof Error ? error : undefined, { category: logCategories.DATABASE });
    if (error instanceof AppError) {
      return Err(error);
    }
    return Err(new AppError('Error al crear movimiento', 'CREATE_MOVEMENT_ERROR', 500));
  }
}

export async function getMovementsByDateRange(startDate: Date, endDate: Date): Promise<Movement[]> {
  const tenantId = getCurrentTenantId();
  return db.movements
    .where('tenantId')
    .equals(tenantId)
    .filter(m => m.createdAt >= startDate && m.createdAt <= endDate)
    .toArray();
}

export async function getMovementsByCategory(category: MovementCategory): Promise<Movement[]> {
  const tenantId = getCurrentTenantId();
  return db.movements
    .where('tenantId')
    .equals(tenantId)
    .filter(m => m.category === category)
    .toArray();
}

export interface MovementStats {
  totalIncome: number;
  totalExpense: number;
  totalTransfer: number;
  netBalance: number;
  byCategory: Record<MovementCategory, number>;
  byPaymentMethod: Record<string, number>;
}

export async function getMovementStats(startDate?: Date, endDate?: Date): Promise<MovementStats> {
  const tenantId = getCurrentTenantId();
  
  let movements = await db.movements
    .where('tenantId')
    .equals(tenantId)
    .filter(m => m.status === 'completed')
    .toArray();

  if (startDate && endDate) {
    movements = movements.filter(m => m.createdAt >= startDate && m.createdAt <= endDate);
  }

  const stats: MovementStats = {
    totalIncome: 0,
    totalExpense: 0,
    totalTransfer: 0,
    netBalance: 0,
    byCategory: {
      sale: 0,
      purchase: 0,
      production: 0,
      refund: 0,
      adjustment: 0,
      salary: 0,
      rent: 0,
      utilities: 0,
      investment: 0,
      transfer: 0,
      other: 0,
    },
    byPaymentMethod: {
      cash: 0,
      card: 0,
      pago_movil: 0,
      bank_transfer: 0,
    },
  };

  movements.forEach(m => {
    if (m.type === 'income') {
      stats.totalIncome += m.amount;
    } else if (m.type === 'expense') {
      stats.totalExpense += m.amount;
    } else if (m.type === 'transfer') {
      stats.totalTransfer += m.amount;
    }

    stats.byCategory[m.category] = (stats.byCategory[m.category] || 0) + m.amount;

    if (m.paymentMethod) {
      stats.byPaymentMethod[m.paymentMethod] = (stats.byPaymentMethod[m.paymentMethod] || 0) + m.amount;
    }
  });

  stats.netBalance = stats.totalIncome - stats.totalExpense;

  return stats;
}

export async function getCashBalance(): Promise<number> {
  const tenantId = getCurrentTenantId();
  const movements = await db.movements
    .where('tenantId')
    .equals(tenantId)
    .filter(m => m.status === 'completed' && m.paymentMethod === 'cash')
    .toArray();

  return movements.reduce((acc, m) => {
    if (m.type === 'income') return acc + m.amount;
    if (m.type === 'expense') return acc - m.amount;
    return acc;
  }, 0);
}