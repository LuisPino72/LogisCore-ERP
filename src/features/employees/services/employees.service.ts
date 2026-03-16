import { db, Employee } from '@/lib/db';
import { SyncEngine } from '@/lib/sync/SyncEngine';
import { supabase } from '@/lib/supabase';
import { useTenantStore } from '@/store/useTenantStore';
import { Ok, Err, Result, AppError, ValidationError } from '@/types/result';
import { logger, logCategories } from '@/lib/logger';

function getCurrentTenantId(): string {
  const { currentTenant } = useTenantStore.getState();
  if (!currentTenant) {
    throw new AppError('No hay tenant activo', 'NO_TENANT', 400);
  }
  return currentTenant.slug;
}

export async function getEmployees(): Promise<Result<Employee[], AppError>> {
  try {
    const tenantId = getCurrentTenantId();
    const employees = await db.employees.where('tenantId').equals(tenantId).toArray();
    return Ok(employees);
  } catch (error) {
    logger.error('Error al obtener empleados', error instanceof Error ? error : undefined, { category: logCategories.AUTH });
    return Err(new AppError('Error al obtener empleados', 'GET_EMPLOYEES_ERROR', 500));
  }
}

export async function syncEmployees(): Promise<Result<number, AppError>> {
  try {
    const { currentTenant } = useTenantStore.getState();
    if (!currentTenant) {
      return Err(new AppError('No hay tenant activo', 'NO_TENANT', 400));
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select('user_id, role, permissions, created_at')
      .eq('tenant_id', currentTenant.id)
      .eq('role', 'employee');

    if (error) throw error;

    const tenantId = currentTenant.slug;
    const existingEmployees = await db.employees.where('tenantId').equals(tenantId).toArray();
    const existingUserIds = new Set(existingEmployees.map(e => e.userId));

    const newEmployees: Employee[] = [];
    const updates: Employee[] = [];

    for (const emp of data || []) {
      const employeeData: Employee = {
        localId: crypto.randomUUID(),
        tenantId,
        userId: emp.user_id,
        role: emp.role,
        permissions: emp.permissions || {},
        createdAt: new Date(emp.created_at || new Date()),
        updatedAt: new Date(),
      };

      if (existingUserIds.has(emp.user_id)) {
        const existing = existingEmployees.find(e => e.userId === emp.user_id);
        if (existing) {
          updates.push({ ...employeeData, id: existing.id });
        }
      } else {
        newEmployees.push(employeeData);
      }
    }

    if (newEmployees.length > 0) {
      await db.employees.bulkAdd(newEmployees);
    }
    if (updates.length > 0) {
      await db.employees.bulkPut(updates);
    }

    const totalSynced = newEmployees.length + updates.length;
    logger.info('Employees synced', { count: totalSynced, category: logCategories.AUTH });
    return Ok(totalSynced);
  } catch (error) {
    logger.error('Error syncing employees', error instanceof Error ? error : undefined, { category: logCategories.AUTH });
    return Err(new AppError('Error al sincronizar empleados', 'SYNC_EMPLOYEES_ERROR', 500));
  }
}

export async function addEmployee(userId: string, role: string, permissions: Record<string, unknown> = {}): Promise<Result<string, AppError>> {
  try {
    const tenantId = getCurrentTenantId();

    if (!userId || !role) {
      return Err(new ValidationError('userId y role son requeridos'));
    }

    const localId = crypto.randomUUID();
    const employee: Employee = {
      localId,
      tenantId,
      userId,
      role,
      permissions,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.employees.add(employee);
    await SyncEngine.addToQueue('employees', 'create', employee as unknown as Record<string, unknown>, localId);

    logger.info('Employee added', { userId, role, category: logCategories.AUTH });
    return Ok(localId);
  } catch (error) {
    logger.error('Error adding employee', error instanceof Error ? error : undefined, { category: logCategories.AUTH });
    return Err(new AppError('Error al agregar empleado', 'ADD_EMPLOYEE_ERROR', 500));
  }
}

export async function removeEmployee(localId: string): Promise<Result<void, AppError>> {
  try {
    const tenantId = getCurrentTenantId();
    
    const employee = await db.employees
      .where('localId')
      .equals(localId)
      .filter(e => e.tenantId === tenantId)
      .first();

    if (!employee) {
      return Err(new AppError('Empleado no encontrado', 'NOT_FOUND', 404));
    }

    await db.employees.where('localId').equals(localId).delete();
    await SyncEngine.addToQueue('employees', 'delete', { localId }, localId);

    logger.info('Employee removed', { localId, category: logCategories.AUTH });
    return Ok(undefined);
  } catch (error) {
    logger.error('Error removing employee', error instanceof Error ? error : undefined, { category: logCategories.AUTH });
    return Err(new AppError('Error al eliminar empleado', 'REMOVE_EMPLOYEE_ERROR', 500));
  }
}
