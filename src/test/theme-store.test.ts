import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore, applyCssVariables } from '@/store/useThemeStore';

describe('ThemeStore', () => {
  beforeEach(() => {
    useThemeStore.getState().applyTenantTheme({
      themeColor: '#ea580c',
    });
  });

  describe('applyTenantTheme', () => {
    it('debe aplicar colores personalizados del tenant', () => {
      useThemeStore.getState().applyTenantTheme({
        themeColor: '#8B4513',
      });

      const state = useThemeStore.getState();
      expect(state.themeColor).toBe('#8B4513');
      expect(state.isTenantMode).toBe(true);
    });

    it('debe usar valores por defecto si no se proporcionan', () => {
      useThemeStore.getState().applyTenantTheme({
        themeColor: '#ff0000',
      });

      const state = useThemeStore.getState();
      expect(state.themeColorSecondary).toBe('#f97316');
    });

    it('debe mantener siempre el modo claro', () => {
      useThemeStore.getState().applyTenantTheme({
        themeColor: '#ff0000',
      });

      const cssVars = useThemeStore.getState().generateCssVariables();
      expect(cssVars).toContain('--bg-primary: #ffffff');
      expect(cssVars).toContain('--text-primary: #0f172a');
    });
  });

  describe('generateCssVariables', () => {
    it('debe generar variables CSS de marca', () => {
      const cssVars = useThemeStore.getState().generateCssVariables();
      
      expect(cssVars).toContain('--brand-50');
      expect(cssVars).toContain('--brand-500');
      expect(cssVars).toContain('--brand-600');
      expect(cssVars).toContain('--brand-700');
      expect(cssVars).toContain('--brand-bg');
    });

    it('debe generar siempre colores para tema claro', () => {
      useThemeStore.getState().applyTenantTheme({
        themeColor: '#ea580c',
      });
      
      const cssVars = useThemeStore.getState().generateCssVariables();
      expect(cssVars).toContain('--bg-primary: #ffffff');
    });
  });

  describe('applyCssVariables', () => {
    it('debe crear elemento de estilo en el DOM', () => {
      applyCssVariables();
      const styleEl = document.getElementById('dynamic-brand-styles');
      expect(styleEl).not.toBeNull();
      expect(styleEl?.textContent).toContain('--brand-');
    });

    it('debe siempre tener clase light (no dark)', () => {
      useThemeStore.getState().applyTenantTheme({
        themeColor: '#ea580c',
      });
      applyCssVariables();
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });
});
