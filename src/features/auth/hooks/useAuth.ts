import { useState, useEffect, useCallback } from 'react';
import { useTenantStore, TenantConfig } from '@/store/useTenantStore';
import { useToast } from '@/providers/ToastProvider';
import * as authService from '../services/auth.service';
import type { AuthUser, LoginCredentials } from '../types/auth.types';
import { isOk } from '@/lib/types/result';

export interface UseAuthReturn {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (credentials: LoginCredentials) => Promise<boolean>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  updatePassword: (password: string) => Promise<boolean>;
  verifyRecoveryToken: () => Promise<boolean>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const setRole = useTenantStore((state) => state.setRole);
  const setTenant = useTenantStore((state) => state.setTenant);
  const { showError, showSuccess } = useToast();

  const handleSetTenantAndRole = useCallback(
    (authUser: AuthUser) => {
      if (authUser.role === 'super_admin') {
        setRole(authUser.role);
        setTenant(null);
      } else if (authUser.tenant) {
        setRole(authUser.role, authUser.permissions);
        setTenant(authUser.tenant as unknown as TenantConfig);
      }
    },
    [setRole, setTenant],
  );

  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true);
      const result = await authService.verifySession();
      if (isOk(result) && result.value) {
        setUser(result.value);
        handleSetTenantAndRole(result.value);
      }
      setIsLoading(false);
    };

    checkSession();
  }, [handleSetTenantAndRole]);

  const signIn = useCallback(
    async (credentials: LoginCredentials): Promise<boolean> => {
      setIsLoading(true);
      const result = await authService.signIn(credentials);

      if (isOk(result)) {
        setUser(result.value);
        handleSetTenantAndRole(result.value);
        if (result.value.role === 'super_admin') {
          showSuccess('Panel de Administración de LogisCore');
        } else {
          showSuccess(`¡Bienvenido a ${result.value.tenant?.name}!`);
        }
        setIsLoading(false);
        return true;
      }

      showError(result.error.message);
      setIsLoading(false);
      return false;
    },
    [handleSetTenantAndRole, showSuccess, showError],
  );

  const signOut = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    await authService.signOut();
    setUser(null);
    setRole(null);
    setTenant(null);
    setIsLoading(false);
  }, [setRole, setTenant]);

  const resetPassword = useCallback(
    async (email: string): Promise<boolean> => {
      setIsLoading(true);
      const result = await authService.resetPassword(email);

      if (isOk(result)) {
        showSuccess('Correo de recuperación enviado. Revisa tu bandeja de entrada.');
        setIsLoading(false);
        return true;
      }

      showError(result.error.message);
      setIsLoading(false);
      return false;
    },
    [showSuccess, showError],
  );

  const updatePassword = useCallback(
    async (password: string): Promise<boolean> => {
      setIsLoading(true);
      const result = await authService.updatePassword(password);

      if (isOk(result)) {
        showSuccess('Contraseña actualizada correctamente');
        setIsLoading(false);
        return true;
      }

      showError(result.error.message);
      setIsLoading(false);
      return false;
    },
    [showSuccess, showError],
  );

  const verifyRecoveryToken = useCallback(async (): Promise<boolean> => {
    const result = await authService.verifyRecoveryToken();
    if (!isOk(result)) {
      showError(result.error.message);
      return false;
    }
    return true;
  }, [showError]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    verifyRecoveryToken,
  };
}