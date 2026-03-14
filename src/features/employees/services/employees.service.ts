import { supabase } from '@/services/supabase';
import { useTenantStore } from '@/store/useTenantStore';
import { Ok, Err, Result, AppError, ValidationError } from '@/types/result';
import { logger, logCategories } from '@/lib/logger';

export interface Employee {
  user_id: string;
  role: string;
  permissions: Record<string, unknown>;
  created_at?: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
  permissions: Record<string, unknown>;
  created_at: string;
  expires_at: string;
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

export async function getInvitations(): Promise<Result<Invitation[], AppError>> {
  try {
    const { currentTenant } = useTenantStore.getState();
    if (!currentTenant) return Err(new AppError('No hay tenant activo', 'NO_TENANT', 400));

    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('tenant_id', currentTenant.id)
      .eq('role', 'employee')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return Ok(data || []);
  } catch (error) {
    logger.error('Error al obtener invitaciones', error instanceof Error ? error : undefined, { category: logCategories.AUTH });
    return Err(new AppError('Error al obtener invitaciones', 'GET_INVITATIONS_ERROR', 500));
  }
}

export async function inviteEmployee(email: string, permissions: Record<string, unknown>): Promise<Result<void, AppError>> {
  try {
    const { currentTenant } = useTenantStore.getState();
    if (!currentTenant) return Err(new AppError('No hay tenant activo', 'NO_TENANT', 400));

    if (!email?.trim()) return Err(new ValidationError('El email es requerido'));

    // Verificar límite de empleados (lógica de negocio)
    // Para simplificar, asumimos que la gestión de límites se valida también en el cliente por ahora.
    
    const { error } = await supabase.from('invitations').insert([
      {
        tenant_id: currentTenant.id,
        email,
        role: 'employee',
        permissions,
      },
    ]);

    if (error) {
      if (error.code === '23505') return Err(new ValidationError('Ya existe una invitación pendiente para este correo'));
      throw error;
    }

    return Ok(undefined);
  } catch (error) {
    logger.error('Error al invitar empleado', error instanceof Error ? error : undefined, { category: logCategories.AUTH });
    return Err(new AppError('Error al enviar invitación', 'INVITE_ERROR', 500));
  }
}
