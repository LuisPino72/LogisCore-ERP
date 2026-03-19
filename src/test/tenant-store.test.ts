import { describe, it, expect, beforeEach } from 'vitest';
import { useTenantStore, TenantConfig, TenantModules, isModuleEnabled, checkModuleDependencies } from '@/store/useTenantStore';

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

  describe('isModuleEnabled', () => {
    const tenant = createMockTenant();

    it('debe retornar true para módulos siempre habilitados', () => {
      expect(isModuleEnabled('dashboard', tenant)).toBe(true);
      expect(isModuleEnabled('reports', tenant)).toBe(true);
      expect(isModuleEnabled('exchange-rate', tenant)).toBe(true);
    });

    it('debe retornar true para módulo activo', () => {
      expect(isModuleEnabled('inventory', tenant)).toBe(true);
      expect(isModuleEnabled('pos', tenant)).toBe(true);
    });

    it('debe retornar false para módulo inactivo', () => {
      const tenantWithPosDisabled = createMockTenant({
        modules: { inventory: true, pos: false },
      });
      expect(isModuleEnabled('pos', tenantWithPosDisabled)).toBe(false);
    });

    it('debe retornar false para módulo no definido', () => {
      const tenantWithNoModules = createMockTenant({ modules: {} });
      expect(isModuleEnabled('pos', tenantWithNoModules)).toBe(false);
    });

    it('debe retornar false cuando no hay tenant', () => {
      expect(isModuleEnabled('pos', null)).toBe(false);
    });
  });

  describe('checkModuleDependencies', () => {
    it('debe detectar dependencias faltantes para POS', () => {
      const tenantWithoutInventory = createMockTenant({
        modules: { pos: true, inventory: false },
      });
      
      const result = checkModuleDependencies('pos', tenantWithoutInventory);
      
      expect(result.enabled).toBe(true);
      expect(result.missingDependencies).toContain('inventory');
    });

    it('debe pasar sin dependencias faltantes', () => {
      const tenant = createMockTenant({
        modules: { pos: true, inventory: true },
      });
      
      const result = checkModuleDependencies('pos', tenant);
      
      expect(result.enabled).toBe(true);
      expect(result.missingDependencies).toHaveLength(0);
    });

    it('debe detectar dependencias faltantes para invoicing', () => {
      const tenantWithoutCustomers = createMockTenant({
        modules: { invoicing: true, customers: false },
      });
      
      const result = checkModuleDependencies('invoicing', tenantWithoutCustomers);
      
      expect(result.enabled).toBe(true);
      expect(result.missingDependencies).toContain('customers');
    });

    it('debe retornar enabled=false si el módulo está desactivado', () => {
      const tenantWithPosDisabled = createMockTenant({
        modules: { pos: false, inventory: true },
      });
      
      const result = checkModuleDependencies('pos', tenantWithPosDisabled);
      
      expect(result.enabled).toBe(false);
    });

    it('debe retornar sin dependencias faltantes para módulo sin dependencias', () => {
      const tenant = createMockTenant();
      
      const result = checkModuleDependencies('employees', tenant);
      
      expect(result.missingDependencies).toHaveLength(0);
    });
  });
});
