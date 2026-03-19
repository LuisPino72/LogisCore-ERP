import { supabase } from '@/lib/supabase';
import { Result, Ok, Err, AppError, ValidationError, UnauthorizedError } from '@/lib/types/result';
import { logger, logCategories } from '@/lib/logger';
import type { AuthUser, LoginCredentials, TenantInfo } from '../types/auth.types';

interface UserRoleResponse {
  role: 'super_admin' | 'owner' | 'employee';
  permissions: Record<string, unknown> | null;
  tenants: TenantInfo | TenantInfo[] | null;
}

async function fetchUserRoles(userId: string): Promise<Result<AuthUser, AppError>> {
  try {
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        role,
        permissions,
        tenants (
          id,
          name,
          slug,
          modules,
          config
        )
      `)
      .eq('user_id', userId);

    if (rolesError) {
      return Err(new AppError('Error al obtener roles', 'FETCH_ROLES_ERROR', 500, { detail: rolesError.message }));
    }

    if (!roles || roles.length === 0) {
      return Err(new UnauthorizedError('Tu usuario no tiene un rol o empresa asignada'));
    }

    const roleData = roles[0] as UserRoleResponse;
    const rawTenant = roleData.tenants;
    let tenantData: TenantInfo | undefined;

    if (roleData.role !== 'super_admin') {
      const tenantArr = Array.isArray(rawTenant) ? rawTenant[0] : rawTenant;
      if (tenantArr) {
        const { data: tenantRows } = await supabase
          .from('tenants')
          .select('id')
          .eq('slug', tenantArr.slug)
          .single();

        if (tenantRows) {
          tenantData = { ...tenantArr, id: tenantRows.id };
        }
      }
    }

    const authUser: AuthUser = {
      id: userId,
      email: '',
      role: roleData.role,
      tenant: tenantData,
      permissions: roleData.role === 'employee' ? (roleData.permissions || {}) : undefined,
    };

    return Ok(authUser);
  } catch (error) {
    logger.error('Error al obtener roles', error as Error, { category: logCategories.AUTH });
    return Err(new AppError('Error al obtener roles', 'FETCH_ROLES_ERROR', 500));
  }
}

export async function signIn(credentials: LoginCredentials): Promise<Result<AuthUser, AppError>> {
  if (!credentials.email.trim()) {
    return Err(new ValidationError('Por favor ingresa tu correo electrónico'));
  }
  if (!credentials.password.trim()) {
    return Err(new ValidationError('Por favor ingresa la contraseña'));
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    return Err(new AppError(`Error al iniciar sesión: ${error.message}`, 'SIGN_IN_ERROR', 401));
  }

  if (!data.user) {
    return Err(new AppError('Usuario no encontrado', 'USER_NOT_FOUND', 404));
  }

  const rolesResult = await fetchUserRoles(data.user.id);
  if (!rolesResult.ok) {
    await supabase.auth.signOut();
    return rolesResult;
  }

  const userWithRoles: AuthUser = {
    ...rolesResult.value,
    email: data.user.email ?? '',
  };

  return Ok(userWithRoles);
}

export async function signOut(): Promise<Result<void, AppError>> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    return Err(new AppError(`Error al cerrar sesión: ${error.message}`, 'SIGN_OUT_ERROR', 500));
  }
  return Ok(undefined);
}

export async function resetPassword(email: string): Promise<Result<void, AppError>> {
  if (!email.trim()) {
    return Err(new ValidationError('Por favor ingresa tu correo electrónico'));
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/update-password`,
  });

  if (error) {
    return Err(new AppError(`Error al enviar correo: ${error.message}`, 'RESET_PASSWORD_ERROR', 500));
  }

  return Ok(undefined);
}

export async function updatePassword(newPassword: string): Promise<Result<void, AppError>> {
  if (!newPassword.trim()) {
    return Err(new ValidationError('Por favor ingresa una contraseña'));
  }

  if (newPassword.length < 6) {
    return Err(new ValidationError('La contraseña debe tener al menos 6 caracteres'));
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return Err(new AppError(`Error al actualizar contraseña: ${error.message}`, 'UPDATE_PASSWORD_ERROR', 500));
  }

  return Ok(undefined);
}

export async function verifySession(): Promise<Result<AuthUser | null, AppError>> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    return Err(new AppError(`Error al verificar sesión: ${sessionError.message}`, 'VERIFY_SESSION_ERROR', 500));
  }

  if (!session?.user) {
    return Ok(null);
  }

  const rolesResult = await fetchUserRoles(session.user.id);
  if (!rolesResult.ok) {
    return Ok(null);
  }

  const userWithRoles: AuthUser = {
    ...rolesResult.value,
    email: session.user.email ?? '',
  };

  return Ok(userWithRoles);
}

export async function verifyRecoveryToken(): Promise<Result<void, AppError>> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');

    if (!accessToken || type !== 'recovery') {
      return Err(new AppError('Enlace de recuperación inválido o expirado', 'INVALID_RECOVERY_TOKEN', 400));
    }
  }

  return Ok(undefined);
}