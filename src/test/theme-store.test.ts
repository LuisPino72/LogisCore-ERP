import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore, applyCssVariables } from '@/store/useThemeStore';

describe('ThemeStore', () => {
  beforeEach(() => {
    const state = useThemeStore.getState();
    state.setTheme('light');
    state.applyTenantTheme({
      themeColor: '#ea580c',
      mode: 'light',
      accentIntensity: 'normal',
    });
  });

  describe('setTheme', () => {
    it('debe establecer tema claro', () => {
      useThemeStore.getState().setTheme('light');
      expect(useThemeStore.getState().theme).toBe('light');
    });

    it('debe establecer tema oscuro', () => {
      useThemeStore.getState().setTheme('dark');
      expect(useThemeStore.getState().theme).toBe('dark');
    });
  });

  describe('applyTenantTheme', () => {
    it('debe aplicar colores personalizados del tenant', () => {
      useThemeStore.getState().applyTenantTheme({
        themeColor: '#8B4513',
        mode: 'light',
        accentIntensity: 'bold',
      });

      const state = useThemeStore.getState();
      expect(state.themeColor).toBe('#8B4513');
      expect(state.accentIntensity).toBe('bold');
      expect(state.isTenantMode).toBe(true);
    });

    it('debe usar valores por defecto si no se proporcionan', () => {
      useThemeStore.getState().applyTenantTheme({
        themeColor: '#ff0000',
        mode: 'dark',
        accentIntensity: 'normal',
      });

      const state = useThemeStore.getState();
      expect(state.themeColorSecondary).toBe('#f97316');
    });
  });

  describe('generateCssVariables', () => {
    it('debe generar variables CSS válidas', () => {
      const cssVars = useThemeStore.getState().generateCssVariables();
      
      expect(cssVars).toContain('--brand-50');
      expect(cssVars).toContain('--brand-500');
      expect(cssVars).toContain('--brand-600');
      expect(cssVars).toContain('--brand-700');
      expect(cssVars).toContain('--brand-bg');
    });

    it('debe generar colores diferentes para tema oscuro', () => {
      useThemeStore.getState().setTheme('dark');
      const cssVars = useThemeStore.getState().generateCssVariables();
      
      expect(cssVars).toContain('--bg-primary: rgb(');
      expect(cssVars).toContain('--text-primary: #f8fafc');
    });

    it('debe contener colores de texto para tema claro', () => {
      useThemeStore.getState().setTheme('light');
      const cssVars = useThemeStore.getState().generateCssVariables();
      
      expect(cssVars).toContain('--text-primary: #0f172a');
    });
  });

  describe('applyCssVariables', () => {
    it('debe crear elemento de estilo en el DOM', () => {
      applyCssVariables();
      const styleEl = document.getElementById('dynamic-brand-styles');
      expect(styleEl).not.toBeNull();
      expect(styleEl?.textContent).toContain('--brand-');
    });

    it('debe agregar clase dark al documento en tema oscuro', () => {
      useThemeStore.getState().setTheme('dark');
      applyCssVariables();
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });
});
