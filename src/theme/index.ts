/**
 * Theme system entry.
 * One shared design-token source powers both:
 * - Ant Design Vue theme config
 * - CSS variable injection
 */

export {
  generateDesignTokens,
  createAntThemeConfig,
  applyCssVariables,
  setDarkMode,
  applyCompleteTheme,
  type DesignTokens,
} from './designTokens';

export interface ThemeConfig {
  primary: string;
  isDark: boolean;
}

export const THEME_KEY = 'bpm-theme-v3';

export const DEFAULT_THEME: ThemeConfig = {
  primary: '#1677ff',
  isDark: false,
};

export function getThemeConfig(): ThemeConfig {
  const saved = localStorage.getItem(THEME_KEY);
  if (!saved) {
    return DEFAULT_THEME;
  }

  try {
    return JSON.parse(saved) as ThemeConfig;
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveThemeConfig(config: ThemeConfig): void {
  localStorage.setItem(THEME_KEY, JSON.stringify(config));
}
