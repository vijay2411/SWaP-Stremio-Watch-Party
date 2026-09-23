import { THEMES } from './themes/registry.js';
export { THEMES, themeStyles } from './themes/registry.js';
export const DEFAULT_THEME = 'minimalism';
export const DEFAULT_MODE = 'dark';
export const THEME_KEY = 'sidekick-theme';
export const MODE_KEY = 'sidekick-color-mode';
export const normalizeTheme = value => THEMES.some(t => t.id === value) ? value : DEFAULT_THEME;
export const normalizeMode = value => value === 'light' ? 'light' : DEFAULT_MODE;
// Storage access is deferred and guarded: privacy settings can disable it entirely.
export function readTheme(read = () => localStorage.getItem(THEME_KEY)) {
  try { return normalizeTheme(read()); } catch { return DEFAULT_THEME; }
}
export function writeTheme(value, write = id => localStorage.setItem(THEME_KEY, id)) {
  try { write(normalizeTheme(value)); return true; } catch { return false; }
}
export function readMode(read = () => localStorage.getItem(MODE_KEY)) {
  try { return normalizeMode(read()); } catch { return DEFAULT_MODE; }
}
export function writeMode(value, write = mode => localStorage.setItem(MODE_KEY, mode)) {
  try { write(normalizeMode(value)); return true; } catch { return false; }
}
