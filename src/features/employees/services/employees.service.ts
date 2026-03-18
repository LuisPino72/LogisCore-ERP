import { db, Employee } from '@/lib/db';
import { SyncEngine } from '@/lib/sync/SyncEngine';
import { supabase } from '@/lib/supabase';
import { useTenantStore } from '@/store/useTenantStore';
import { Ok, Err, Result, AppError, ValidationError } from '@/lib/types/result';
import { logger, logCategories } from '@/lib/logger';
import type { EmployeePermissions } from '../types/employees.types';
import { DEFAULT_EMPLOYEE_PERMISSIONS } from '../types/employees.types';
import type { SortConfig } from '../types/employees.types';

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

export async function createEmployee(
  email: string,
  password: string,
  permissions: EmployeePermissions = DEFAULT_EMPLOYEE_PERMISSIONS
): Promise<Result<string, AppError>> {
  try {
    const { currentTenant } = useTenantStore.getState();
    if (!currentTenant) {
      return Err(new AppError('No hay tenant activo', 'NO_TENANT', 400));
    }

    if (!email || !email.includes('@')) {
      return Err(new ValidationError('Email inválido'));
    }

    if (!password || password.length < 6) {
      return Err(new ValidationError('La contraseña debe tener al menos 6 caracteres'));
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      logger.error('Error creating auth user', authError, { category: logCategories.AUTH });
      return Err(new AppError(`Error al crear usuario: ${authError.message}`, 'CREATE_AUTH_ERROR', 500));
    }

    if (!authData.user) {
      return Err(new AppError('No se pudo crear el usuario', 'CREATE_AUTH_ERROR', 500));
    }

    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        tenant_id: currentTenant.id,
        role: 'employee',
        permissions: permissions,
      });

    if (roleError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      logger.error('Error creating user role', roleError, { category: logCategories.AUTH });
      return Err(new AppError(`Error al asignar rol: ${roleError.message}`, 'CREATE_ROLE_ERROR', 500));
    }

    const localId = crypto.randomUUID();
    const tenantId = currentTenant.slug;
    const employee: Employee = {
      localId,
      tenantId,
      userId: authData.user.id,
      role: 'employee',
      permissions,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.employees.add(employee);
    await SyncEngine.addToQueue('employees', 'create', employee as unknown as Record<string, unknown>, localId);

    logger.info('Employee created', { userId: authData.user.id, email, category: logCategories.AUTH });
    return Ok(localId);
  } catch (error) {
    logger.error('Error creating employee', error instanceof Error ? error : undefined, { category: logCategories.AUTH });
    if (error instanceof AppError) {
      return Err(error);
    }
    return Err(new AppError('Error al crear empleado', 'CREATE_EMPLOYEE_ERROR', 500));
  }
}

export async function updateEmployeePermissions(
  localId: string,
  permissions: EmployeePermissions
): Promise<Result<void, AppError>> {
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

    const { error: supabaseError } = await supabase
      .from('user_roles')
      .update({ permissions })
      .eq('user_id', employee.userId);

    if (supabaseError) {
      logger.error('Error updating employee permissions in Supabase', supabaseError, { category: logCategories.AUTH });
      return Err(new AppError('Error al actualizar permisos en servidor', 'UPDATE_PERMISSIONS_ERROR', 500));
    }

    const updated = { ...employee, permissions, updatedAt: new Date() };
    await db.employees.put(updated);
    await SyncEngine.addToQueue('employees', 'update', updated as unknown as Record<string, unknown>, localId);

    logger.info('Employee permissions updated', { localId, category: logCategories.AUTH });
    return Ok(undefined);
  } catch (error) {
    logger.error('Error updating employee', error instanceof Error ? error : undefined, { category: logCategories.AUTH });
    if (error instanceof AppError) {
      return Err(error);
    }
    return Err(new AppError('Error al actualizar empleado', 'UPDATE_EMPLOYEE_ERROR', 500));
  }
}

export async function deleteEmployee(localId: string): Promise<Result<void, AppError>> {
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

    const { error: supabaseError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', employee.userId);

    if (supabaseError) {
      logger.error('Error deleting employee from Supabase', supabaseError, { category: logCategories.AUTH });
      return Err(new AppError('Error al eliminar empleado del servidor', 'DELETE_EMPLOYEE_ERROR', 500));
    }

    await db.employees.where('localId').equals(localId).delete();
    await SyncEngine.addToQueue('employees', 'delete', { localId }, localId);

    logger.info('Employee deleted', { localId, userId: employee.userId, category: logCategories.AUTH });
    return Ok(undefined);
  } catch (error) {
    logger.error('Error deleting employee', error instanceof Error ? error : undefined, { category: logCategories.AUTH });
    if (error instanceof AppError) {
      return Err(error);
    }
    return Err(new AppError('Error al eliminar empleado', 'DELETE_EMPLOYEE_ERROR', 500));
  }
}

export interface FilterOptions {
  search?: string
  sort?: SortConfig
  page?: number
  pageSize?: number
}

export async function filterEmployees(options: FilterOptions = {}): Promise<{
  employees: Employee[]
  total: number
}> {
  const tenantId = getCurrentTenantId();
  const { search = '', sort, page = 1, pageSize = 10 } = options;

  let employees = await db.employees.where('tenantId').equals(tenantId).toArray();

  if (search) {
    const searchLower = search.toLowerCase();
    employees = employees.filter(e =>
      e.userId?.toLowerCase().includes(searchLower) ||
      e.role?.toLowerCase().includes(searchLower)
    );
  }

  if (sort) {
    employees.sort((a, b) => {
      let comparison = 0;
      switch (sort.field) {
        case 'userId':
          comparison = (a.userId || '').localeCompare(b.userId || '');
          break;
        case 'role':
          comparison = (a.role || '').localeCompare(b.role || '');
          break;
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
      }
      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }

  const total = employees.length;
  const startIndex = (page - 1) * pageSize;
  const paginatedEmployees = employees.slice(startIndex, startIndex + pageSize);

  return { employees: paginatedEmployees, total };
}
