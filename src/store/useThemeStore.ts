import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TenantThemeConfig } from './useTenantStore';

type Theme = 'light' | 'dark';
type AccentIntensity = 'subtle' | 'normal' | 'intense';

interface ThemeState {
  theme: Theme;
  themeColor: string;
  themeColorSecondary: string;
  accentIntensity: AccentIntensity;
  isTenantMode: boolean;
  
  applyTenantTheme: (config: TenantThemeConfig) => void;
  setTheme: (theme: Theme) => void;
  generateCssVariables: () => string;
}

const DEFAULT_THEME_COLOR = '#ea580c';
const DEFAULT_SECONDARY_COLOR = '#f97316';

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

function generateColorPalette(baseColor: string): Record<string, string> {
  const base = baseColor.startsWith('#') ? baseColor : `#${baseColor}`;
  
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
    'bg': adjustBrightness(base, 0.15),
    'bg-hover': adjustBrightness(base, 0.25),
    'bg-active': adjustBrightness(base, 0.35),
  };
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      themeColor: DEFAULT_THEME_COLOR,
      themeColorSecondary: DEFAULT_SECONDARY_COLOR,
      accentIntensity: 'normal',
      isTenantMode: false,

      setTheme: (theme: Theme) => {
        set({ theme });
        applyCssVariables();
      },



      applyTenantTheme: (config: TenantThemeConfig) => {
        set({
          themeColor: config.themeColor || DEFAULT_THEME_COLOR,
          themeColorSecondary: config.themeColorSecondary || DEFAULT_SECONDARY_COLOR,
          isTenantMode: true,
        });

        applyCssVariables();
      },



      generateCssVariables: () => {
        const state = get();
        const palette = generateColorPalette(state.themeColor);
        const secondaryPalette = generateColorPalette(state.themeColorSecondary);

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
          
          --bg-primary: #ffffff;
          --bg-secondary: #f8fafc;
          --bg-tertiary: #f1f5f9;
          --bg-elevated: #f1f5f9;
          --text-primary: #0f172a;
          --text-secondary: #475569;
          --text-muted: #94a3b8;
          --border-color: rgba(15,23,42,0.1);
          --border-subtle: rgba(15,23,42,0.05);
        `.trim();
      },
    }),
    {
      name: 'logiscore-theme',
      partialize: (state) => ({
        themeColor: state.themeColor,
        themeColorSecondary: state.themeColorSecondary,
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
  
  const isDark = state.theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
}

if (typeof window !== 'undefined') {
  setTimeout(() => applyCssVariables(), 0);
}
