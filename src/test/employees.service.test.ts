import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEmployees, inviteEmployee } from '../features/employees/services/employees.service';
import { supabase } from '@/services/supabase';
import { isOk } from '@/types/result';

// Mocking dependencies
vi.mock('@/store/useTenantStore', () => ({
  useTenantStore: {
    getState: vi.fn(() => ({
      currentTenant: { id: 'uuid-tenant-123', slug: 'test-tenant' },
    })),
  },
}));

vi.mock('@/services/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

describe('Employees Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getEmployees', () => {
    it('debe obtener la lista de empleados', async () => {
      const mockData = [{ user_id: 'user-1', role: 'employee' }];
      (supabase.from as any).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((cb) => cb({ data: mockData, error: null }))
      }));

      const result = await getEmployees();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual(mockData);
      }
    });

    it('debe manejar errores de Supabase', async () => {
      (supabase.from as any).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((cb) => cb({ data: null, error: { message: 'DB Error' } }))
      }));

      const result = await getEmployees();
      expect(isOk(result)).toBe(false);
    });
  });

  describe('inviteEmployee', () => {
    it('debe enviar una invitación correctamente', async () => {
      (supabase.from as any).mockImplementation(() => ({
        insert: vi.fn().mockResolvedValue({ error: null }),
      }));

      const email = 'new@example.com';
      const perms = { can_view_reports: true };
      
      const result = await inviteEmployee(email, perms);
      expect(isOk(result)).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('invitations');
    });

    it('debe validar que el email no esté vacío', async () => {
      const result = await inviteEmployee('', {});
      expect(isOk(result)).toBe(false);
      if (!isOk(result)) {
        expect(result.error.message).toContain('email');
      }
    });
  });
});
