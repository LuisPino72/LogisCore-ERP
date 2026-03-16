import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadProductImage, getProductImageUrl } from '../features/inventory/services/images.service';
import { supabase } from '@/lib/supabase';
import { isOk, isErr } from '@/types/result';

vi.mock('@/store/useTenantStore', () => ({
  useTenantStore: {
    getState: vi.fn(() => ({
      currentTenant: { slug: 'test-tenant', id: 'uuid-123' },
    })),
  },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    },
  },
}));

describe('Images Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadProductImage', () => {
    it('debe fallar si no hay tenant activo', async () => {
      const { useTenantStore } = await import('@/store/useTenantStore');
      vi.mocked(useTenantStore.getState).mockReturnValueOnce({ currentTenant: null } as any);
      
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await uploadProductImage(mockFile, 'prod-123');
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('NO_TENANT');
      }
    });

    it('debe subir imagen exitosamente', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      const mockGetPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/image.jpg' } });
      
      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      } as any);
      
      const result = await uploadProductImage(mockFile, 'prod-123');
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe('https://example.com/image.jpg');
      }
    });

    it('debe manejar error al subir imagen', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      const mockUpload = vi.fn().mockResolvedValue({ error: { message: 'Upload failed' } });
      const mockGetPublicUrl = vi.fn();
      
      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      } as any);
      
      const result = await uploadProductImage(mockFile, 'prod-123');
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('Error al subir imagen');
      }
    });
  });

  describe('getProductImageUrl', () => {
    it('debe retornar URL pública', () => {
      const mockGetPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/image.jpg' } });
      
      vi.mocked(supabase.storage.from).mockReturnValue({
        getPublicUrl: mockGetPublicUrl,
      } as any);
      
      const result = getProductImageUrl('path/to/image.jpg');
      
      expect(result).toBe('https://example.com/image.jpg');
    });
  });
});
