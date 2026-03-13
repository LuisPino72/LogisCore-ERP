import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TenantThemeConfig } from './useTenantStore';

type Theme = 'light' | 'dark';
type AccentIntensity = 'subtle' | 'normal' | 'bold';

interface ThemeState {
  theme: Theme;
  themeColor: string;
  themeColorSecondary: string;
  mode: 'dark' | 'light' | 'system';
  accentIntensity: AccentIntensity;
  isTenantMode: boolean;
  systemTheme: Theme;
  
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  applyTenantTheme: (config: TenantThemeConfig) => void;
  resetToSystem: () => void;
  generateCssVariables: () => string;
  getEffectiveTheme: () => Theme;
}

const DEFAULT_THEME_COLOR = '#3b82f6';
const DEFAULT_SECONDARY_COLOR = '#8b5cf6';

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

function adjustBrightness(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const r = Math.min(255, Math.max(0, Math.round(rgb.r * factor)));
  const g = Math.min(255, Math.max(0, Math.round(rgb.g * factor)));
  const b = Math.min(255, Math.max(0, Math.round(rgb.b * factor)));
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function generateColorPalette(baseColor: string, intensity: AccentIntensity): Record<string, string> {
  const base = baseColor.startsWith('#') ? baseColor : `#${baseColor}`;
  const factorMap = {
    subtle: { bg: 0.15, hover: 0.25, active: 0.3 },
    normal: { bg: 0.2, hover: 0.35, active: 0.45 },
    bold: { bg: 0.25, hover: 0.45, active: 0.55 },
  };
  const factors = factorMap[intensity];
  
  return {
    '50': adjustBrightness(base, 0.95),
    '100': adjustBrightness(base, 0.9),
    '200': adjustBrightness(base, 0.8),
    '300': adjustBrightness(base, 0.7),
    '400': adjustBrightness(base, 0.6),
    '500': base,
    '600': adjustBrightness(base, 0.85),
    '700': adjustBrightness(base, 0.7),
    '800': adjustBrightness(base, 0.55),
    '900': adjustBrightness(base, 0.4),
    '950': adjustBrightness(base, 0.25),
    'bg': adjustBrightness(base, factors.bg),
    'bg-hover': adjustBrightness(base, factors.hover),
    'bg-active': adjustBrightness(base, factors.active),
  };
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      themeColor: DEFAULT_THEME_COLOR,
      themeColorSecondary: DEFAULT_SECONDARY_COLOR,
      mode: 'dark',
      accentIntensity: 'normal',
      isTenantMode: false,
      systemTheme: 'dark',

      toggleTheme: () => set((state) => ({ 
        theme: state.theme === 'dark' ? 'light' : 'dark' 
      })),

      setTheme: (theme) => set({ theme }),

      applyTenantTheme: (config: TenantThemeConfig) => {
        const state = get();
        const effectiveTheme = config.mode === 'system' 
          ? state.systemTheme 
          : config.mode;

        set({
          themeColor: config.themeColor || DEFAULT_THEME_COLOR,
          themeColorSecondary: config.themeColorSecondary || DEFAULT_SECONDARY_COLOR,
          mode: config.mode,
          accentIntensity: config.accentIntensity || 'normal',
          theme: effectiveTheme,
          isTenantMode: true,
        });

        applyCssVariables();
      },

      resetToSystem: () => {
        set({
          themeColor: DEFAULT_THEME_COLOR,
          themeColorSecondary: DEFAULT_SECONDARY_COLOR,
          mode: 'dark',
          accentIntensity: 'normal',
          theme: 'dark',
          isTenantMode: false,
        });

        applyCssVariables();
      },

      generateCssVariables: () => {
        const state = get();
        const palette = generateColorPalette(state.themeColor, state.accentIntensity);
        const secondaryPalette = generateColorPalette(state.themeColorSecondary, state.accentIntensity);
        const isDark = state.theme === 'dark';

        // Base background calculation - Optimized for professional dark mode
        // Instead of pure brand-derived black, we use a very deep slate tinted with the brand color
        const baseDark = { r: 15, g: 23, b: 42 }; // deep slate base
        const brandRgb = hexToRgb(state.themeColor) || { r: 59, g: 130, b: 246 };
        
        // Blend function: (base * 0.9 + brand * 0.1)
        const blend = (c1: number, c2: number, factor: number) => Math.round(c1 * (1 - factor) + c2 * factor);
        
        const tintedR = blend(baseDark.r, brandRgb.r, 0.08);
        const tintedG = blend(baseDark.g, brandRgb.g, 0.08);
        const tintedB = blend(baseDark.b, brandRgb.b, 0.12);
        
        const darkBgPrimary = `rgb(${tintedR}, ${tintedG}, ${tintedB})`;
        const darkBgSecondary = `rgb(${tintedR + 5}, ${tintedG + 7}, ${tintedB + 10})`;
        const darkBgTertiary = `rgb(${tintedR + 10}, ${tintedG + 15}, ${tintedB + 20})`;
        const darkBgElevated = `rgb(${tintedR + 15}, ${tintedG + 22}, ${tintedB + 30})`;

        return `
          --brand-50: ${palette['50']};
          --brand-100: ${palette['100']};
          --brand-200: ${palette['200']};
          --brand-300: ${palette['300']};
          --brand-400: ${palette['400']};
          --brand-500: ${palette['500']};
          --brand-600: ${palette['600']};
          --brand-700: ${palette['700']};
          --brand-800: ${palette['800']};
          --brand-900: ${palette['900']};
          --brand-950: ${palette['950']};
          --brand-bg: ${palette['bg']};
          --brand-bg-hover: ${palette['bg-hover']};
          --brand-bg-active: ${palette['bg-active']};
          
          --brand-secondary-50: ${secondaryPalette['50']};
          --brand-secondary-100: ${secondaryPalette['100']};
          --brand-secondary-200: ${secondaryPalette['200']};
          --brand-secondary-300: ${secondaryPalette['300']};
          --brand-secondary-400: ${secondaryPalette['400']};
          --brand-secondary-500: ${secondaryPalette['500']};
          --brand-secondary-600: ${secondaryPalette['600']};
          --brand-secondary-700: ${secondaryPalette['700']};
          --brand-secondary-800: ${secondaryPalette['800']};
          --brand-secondary-900: ${secondaryPalette['900']};
          
          --bg-primary: ${isDark ? darkBgPrimary : '#ffffff'};
          --bg-secondary: ${isDark ? darkBgSecondary : '#f8fafc'};
          --bg-tertiary: ${isDark ? darkBgTertiary : '#f1f5f9'};
          --bg-elevated: ${isDark ? darkBgElevated : '#f1f5f9'};
          --text-primary: ${isDark ? '#f8fafc' : '#0f172a'};
          --text-secondary: ${isDark ? '#cbd5e1' : '#475569'};
          --text-muted: ${isDark ? '#94a3b8' : '#94a3b8'};
          --border-color: ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.1)'};
          --border-subtle: ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.05)'};
        `.trim();
      },

      getEffectiveTheme: () => {
        const state = get();
        if (state.mode === 'system') {
          return state.systemTheme;
        }
        return state.theme;
      },
    }),
    {
      name: 'logiscore-theme',
      partialize: (state) => ({
        theme: state.theme,
        themeColor: state.themeColor,
        themeColorSecondary: state.themeColorSecondary,
        mode: state.mode,
        accentIntensity: state.accentIntensity,
        isTenantMode: state.isTenantMode,
      }),
    }
  )
);

export function applyCssVariables() {
  const state = useThemeStore.getState();
  const cssVars = state.generateCssVariables();
  
  let styleEl = document.getElementById('dynamic-brand-styles');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'dynamic-brand-styles';
    document.head.appendChild(styleEl);
  }
  
  styleEl.textContent = `:root { ${cssVars} }`;
  
  const isDark = state.getEffectiveTheme() === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
}

if (typeof window !== 'undefined') {
  setTimeout(() => applyCssVariables(), 0);
}
