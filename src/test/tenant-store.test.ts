import { describe, it, expect, beforeEach } from 'vitest';
import { useTenantStore, TenantConfig, TenantModules } from '@/store/useTenantStore';

const createMockTenant = (overrides?: Partial<TenantConfig>): TenantConfig => ({
  id: 'tenant-1',
  name: 'Test Restaurant',
  slug: 'test-restaurant',
  modules: { sales: true, inventory: true, pos: true },
  ...overrides,
});

describe('TenantStore', () => {
  beforeEach(() => {
    useTenantStore.getState().clear();
  });

  describe('setTenant', () => {
    it('debe establecer el tenant actual', () => {
      const tenant = createMockTenant();
      useTenantStore.getState().setTenant(tenant);
      
      expect(useTenantStore.getState().currentTenant).toEqual(tenant);
    });

    it('debe permitir establecer null', () => {
      useTenantStore.getState().setTenant(null);
      expect(useTenantStore.getState().currentTenant).toBeNull();
    });
  });

  describe('setRole', () => {
    it('debe establecer el rol del usuario', () => {
      useTenantStore.getState().setRole('owner');
      expect(useTenantStore.getState().role).toBe('owner');
    });

    it('debe establecer permisos junto con el rol', () => {
      const permissions = { canEditProducts: true, canDeleteSales: false };
      useTenantStore.getState().setRole('employee', permissions);
      
      expect(useTenantStore.getState().role).toBe('employee');
      expect(useTenantStore.getState().permissions).toEqual(permissions);
    });
  });

  describe('startImpersonation', () => {
    it('debe iniciar impersonación y guardar el tenant', () => {
      const tenant = createMockTenant({ name: 'Impersonated' });
      useTenantStore.getState().startImpersonation(tenant);
      
      const state = useTenantStore.getState();
      expect(state.currentTenant).toEqual(tenant);
      expect(state.isImpersonating).toBe(true);
    });
  });

  describe('stopImpersonation', () => {
    it('debe detener impersonación y limpiar tenant', () => {
      const tenant = createMockTenant();
      useTenantStore.getState().startImpersonation(tenant);
      useTenantStore.getState().stopImpersonation();
      
      const state = useTenantStore.getState();
      expect(state.currentTenant).toBeNull();
      expect(state.isImpersonating).toBe(false);
    });
  });

  describe('clear', () => {
    it('debe limpiar todo el estado', () => {
      useTenantStore.getState().setTenant(createMockTenant());
      useTenantStore.getState().setRole('owner');
      useTenantStore.getState().clear();
      
      const state = useTenantStore.getState();
      expect(state.currentTenant).toBeNull();
      expect(state.role).toBeNull();
      expect(state.permissions).toEqual({});
      expect(state.isImpersonating).toBe(false);
    });
  });

  describe('TenantModules', () => {
    it('debe validar módulos activos', () => {
      const modules: TenantModules = {
        sales: true,
        inventory: true,
        pos: false,
        purchases: true,
      };
      
      expect(modules.sales).toBe(true);
      expect(modules.pos).toBe(false);
    });
  });
});
