export interface AuthUser {
  id: string;
  email: string;
  role: 'super_admin' | 'owner' | 'employee';
  tenant?: TenantInfo;
  permissions?: Record<string, unknown>;
}

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  modules?: string[];
  config?: Record<string, unknown>;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: string | null;
}

export interface AuthResponse {
  user: AuthUser;
  message?: string;
}