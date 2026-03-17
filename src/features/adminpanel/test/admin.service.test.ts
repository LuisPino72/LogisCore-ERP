import { describe, it, expect, vi } from 'vitest';
import { createTenant, uploadLogo } from '../services/admin.service';
import { isOk, isErr } from '@/lib/types/result';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'user-123' } } }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'new-uuid' }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'uuid' }, error: null }),
          }),
        }),
      }),
    })),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/logo.png' } }),
      }),
    },
  },
}));

describe('Admin Service', () => {
  describe('createTenant', () => {
    it('debe fallar si el nombre está vacío', async () => {
      const result = await createTenant('', 'slug');
      
      expect(isErr(result)).toBe(true);
    });

    it('debe fallar si el slug está vacío', async () => {
      const result = await createTenant('Name', '');
      
      expect(isErr(result)).toBe(true);
    });
  });

  describe('uploadLogo', () => {
    it('debe fallar si el archivo no es una imagen', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      const result = await uploadLogo('tenant-123', file);
      
      expect(isErr(result)).toBe(true);
    });

    it('debe fallar con tipo de imagen no permitido', async () => {
      const file = new File(['test'], 'test.gif', { type: 'image/gif' });
      
      const result = await uploadLogo('tenant-123', file);
      
      expect(isErr(result)).toBe(true);
    });

    it('debe subir imagen válida jpeg', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      const result = await uploadLogo('tenant-123', file);
      
      expect(isOk(result)).toBe(true);
    });
  });
});
