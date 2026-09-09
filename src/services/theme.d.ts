/*
 * Types for services/theme.js, so main.ts can import it. Loose on purpose: the module is plain
 * JavaScript and the .vue files that use it are not type-checked; this only has to tell TypeScript
 * what the names are.
 */

/** The palette painted on <html>: what data-theme holds. */
export type ThemeMode = 'light' | 'dark' | 'admin';

/** What the person may choose; 'system' follows the operating system. */
export type ThemePreference = 'light' | 'dark' | 'system';

export const DEFAULT_ACCENT: string;
export const ADMIN_ACCENT: string;
export const THEMES: ThemeMode[];

export function currentTheme(): ThemeMode;
export function applyAccent(color?: string | null): void;
export function resetAccent(): void;
export function applyTheme(mode: string | null | undefined, accent?: string | null): void;
export function systemPrefersDark(): boolean;
export function resolveTheme(preference: string | null | undefined, systemDark?: boolean): 'light' | 'dark';
export function onSystemThemeChange(callback: (mode: 'light' | 'dark') => void): () => void;
