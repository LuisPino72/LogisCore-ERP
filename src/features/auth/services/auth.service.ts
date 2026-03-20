import { supabase } from '@/lib/supabase';
import { Result, Ok, Err, AppError, ValidationError, UnauthorizedError } from '@/lib/types/result';
import { logger, logCategories } from '@/lib/logger';
import { securityAudit } from '@/lib/audit/securityAudit';
import type { AuthUser, LoginCredentials, TenantInfo } from '../types/auth.types';

const LOGIN_RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const PASSWORD_MIN_LENGTH = 12;

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

interface UserRoleResponse {
  role: 'super_admin' | 'owner' | 'employee';
  permissions: Record<string, unknown> | null;
  tenants: TenantInfo | TenantInfo[] | null;
}

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const attempt = loginAttempts.get(email);
  
  if (!attempt || now - attempt.lastAttempt > LOGIN_RATE_LIMIT_WINDOW) {
    loginAttempts.set(email, { count: 1, lastAttempt: now });
    return true;
  }
  
  if (attempt.count >= LOGIN_MAX_ATTEMPTS) {
    return false;
  }
  
  attempt.count++;
  attempt.lastAttempt = now;
  loginAttempts.set(email, attempt);
  return true;
}

function recordSuccessfulLogin(email: string): void {
  loginAttempts.delete(email);
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

  if (!checkRateLimit(credentials.email)) {
    logger.warn('Rate limit exceeded for login attempt', { email: credentials.email, category: logCategories.AUTH });
    await securityAudit.logRateLimited(credentials.email);
    return Err(new AppError(
      'Demasiados intentos de inicio de sesión. Intenta nuevamente en 15 minutos.',
      'RATE_LIMITED',
      429
    ));
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    await securityAudit.logLoginFailed(credentials.email, error.message);
    return Err(new AppError(`Error al iniciar sesión: ${error.message}`, 'SIGN_IN_ERROR', 401));
  }

  if (!data.user) {
    return Err(new AppError('Usuario no encontrado', 'USER_NOT_FOUND', 404));
  }

  recordSuccessfulLogin(credentials.email);
  await securityAudit.logLoginSuccess(data.user.id, credentials.email);

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
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
    await securityAudit.log({
      eventType: 'LOGOUT',
      userId: session.user.id,
      userEmail: session.user.email ?? undefined,
      success: true,
    });
  }
  
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

  await securityAudit.log({
    eventType: 'PASSWORD_RESET_REQUEST',
    userEmail: email,
    success: true,
  });

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

  if (newPassword.length < PASSWORD_MIN_LENGTH) {
    return Err(new ValidationError(`La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`));
  }

  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[@$!%*?&._-]/.test(newPassword);

  if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecial) {
    return Err(new ValidationError(
      'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial (@$!%*?&._-)'
    ));
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    return Err(new AppError(`Error al verificar sesión: ${sessionError.message}`, 'UPDATE_PASSWORD_ERROR', 500));
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return Err(new AppError(`Error al actualizar contraseña: ${error.message}`, 'UPDATE_PASSWORD_ERROR', 500));
  }

  if (session?.user) {
    await securityAudit.logPasswordChange(session.user.id, session.user.email ?? '');
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
