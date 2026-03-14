import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore, applyCssVariables } from '@/store/useThemeStore';

describe('ThemeStore', () => {
  beforeEach(() => {
    useThemeStore.getState().applyTenantTheme({
      themeColor: '#ea580c',
      mode: 'light',
      accentIntensity: 'normal',
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

    it('debe establecer modo según configuración', () => {
      useThemeStore.getState().applyTenantTheme({
        themeColor: '#ff0000',
        mode: 'dark',
        accentIntensity: 'normal',
      });

      const state = useThemeStore.getState();
      expect(state.theme).toBe('dark');
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

    it('debe generar colores para tema claro', () => {
      useThemeStore.getState().applyTenantTheme({
        themeColor: '#ea580c',
        mode: 'light',
        accentIntensity: 'normal',
      });
      
      const cssVars = useThemeStore.getState().generateCssVariables();
      expect(cssVars).toContain('--bg-primary: #ffffff');
    });

    it('debe generar colores para tema oscuro', () => {
      useThemeStore.getState().applyTenantTheme({
        themeColor: '#ea580c',
        mode: 'dark',
        accentIntensity: 'normal',
      });
      
      const cssVars = useThemeStore.getState().generateCssVariables();
      expect(cssVars).toContain('--text-primary: #f8fafc');
    });
  });

  describe('applyCssVariables', () => {
    it('debe crear elemento de estilo en el DOM', () => {
      applyCssVariables();
      const styleEl = document.getElementById('dynamic-brand-styles');
      expect(styleEl).not.toBeNull();
      expect(styleEl?.textContent).toContain('--brand-');
    });

    it('debe agregar clase dark al documento en modo oscuro', () => {
      useThemeStore.getState().applyTenantTheme({
        themeColor: '#ea580c',
        mode: 'dark',
        accentIntensity: 'normal',
      });
      applyCssVariables();
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });
});
