import { supabase } from '@/services/supabase';
import { useTenantStore } from '@/store/useTenantStore';
import { Ok, Err, Result, AppError } from '@/types/result';
import { logger, logCategories } from '@/lib/logger';

export interface Employee {
  user_id: string;
  role: string;
  permissions: Record<string, unknown>;
  created_at?: string;
}

export async function getEmployees(): Promise<Result<Employee[], AppError>> {
  try {
    const { currentTenant } = useTenantStore.getState();
    if (!currentTenant) return Err(new AppError('No hay tenant activo', 'NO_TENANT', 400));

    const { data, error } = await supabase
      .from('user_roles')
      .select('user_id, role, permissions, created_at')
      .eq('tenant_id', currentTenant.id)
      .eq('role', 'employee');

    if (error) throw error;
    return Ok(data || []);
  } catch (error) {
    logger.error('Error al obtener empleados', error instanceof Error ? error : undefined, { category: logCategories.AUTH });
    return Err(new AppError('Error al obtener empleados', 'GET_EMPLOYEES_ERROR', 500));
  }
}
