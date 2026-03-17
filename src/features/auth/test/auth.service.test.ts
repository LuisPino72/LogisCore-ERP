import { describe, it, expect, vi } from 'vitest';
import { signIn, signOut } from '../services/auth.service';
import { isOk, isErr } from '@/lib/types/result';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    })),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
  logCategories: {
    AUTH: 'auth',
  },
}));

describe('Auth Service', () => {
  describe('signIn', () => {
    it('debe fallar si el email está vacío', async () => {
      const result = await signIn({ email: '', password: 'password' });
      
      expect(isErr(result)).toBe(true);
    });

    it('debe fallar si la contraseña está vacía', async () => {
      const result = await signIn({ email: 'test@example.com', password: '' });
      
      expect(isErr(result)).toBe(true);
    });
  });

  describe('signOut', () => {
    it('debe cerrar sesión correctamente', async () => {
      const result = await signOut();
      
      expect(isOk(result)).toBe(true);
    });
  });
});
