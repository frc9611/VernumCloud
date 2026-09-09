/*
 * Theme and accent of the dashboard.
 *
 * Two layers, applied together because they depend on each other:
 *
 *   - the PALETTE is `data-theme` on <html>: light (the default tokens of vernum.css), dark, or
 *     admin — the black palette of the administrator team, so the person sees at a glance that
 *     they are in administrator access. The stylesheet does the rest.
 *   - the ACCENT is the color of the team currently open, written as inline tokens on <html>:
 *     --vc-purple and the three tones derived from it, so switching teams repaints tabs, buttons,
 *     chips, card headers and focus rings.
 *
 * The derived tones are computed here and not in CSS because they depend on both layers: the soft
 * and border tones are the accent mixed toward the SURFACE of the palette, and on a dark surface
 * the strong tone has to go lighter, not darker, because it is read as text and hover on that
 * surface. Inline styles also beat any stylesheet rule, which is why a [data-theme] block could not
 * override them anyway.
 */

const DEFAULT_ACCENT = '#8864AE';

/* The saturated red of the administrator palette: the color of "careful, this is the platform". */
const ADMIN_ACCENT = '#e03131';

const THEMES = ['light', 'dark', 'admin'];

/* How much of the base color survives when mixing toward black, white or the surface. */
const STRONG_MIX = 0.82; // --vc-purple-strong on light: base over black
const BORDER_MIX = 0.41; // --vc-purple-border on light: base over white
const SOFT_MIX = 0.12;   // --vc-purple-soft on light: base over white

/*
 * On a dark surface the same proportions vanish — twelve percent of a color over near black is
 * near black — so the tints keep more of the accent, and the strong tone lightens instead.
 */
const DARK_STRONG_MIX = 0.78; // base over white
const DARK_BORDER_MIX = 0.48; // base over the surface
const DARK_SOFT_MIX = 0.22;   // base over the surface

/* Below this relative luminance an accent disappears against a dark surface and gets lifted. */
const DARK_MIN_LUMINANCE = 0.14;

function parseHex(value) {
  if (typeof value !== 'string') return null;
  let hex = value.trim().replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((char) => char + char).join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function toHex({ r, g, b }) {
  const part = (value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** Mixes `color` over `other`, keeping `weight` of the color. */
function mix(color, other, weight) {
  return {
    r: color.r * weight + other.r * (1 - weight),
    g: color.g * weight + other.g * (1 - weight),
    b: color.b * weight + other.b * (1 - weight),
  };
}

/** WCAG relative luminance, 0 for black and 1 for white. */
function luminance({ r, g, b }) {
  const channel = (value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

const BLACK = { r: 0, g: 0, b: 0 };
const WHITE = { r: 255, g: 255, b: 255 };

/*
 * The surface each palette paints cards on — the same values vernum.css gives --vc-surface. They
 * live here as well because the tones are computed before the stylesheet can be asked, and an
 * inline token cannot reference one from a [data-theme] block anyway.
 */
const SURFACES = {
  light: WHITE,
  dark: parseHex('#1b1b20'),
  admin: parseHex('#141417'),
};

let currentMode = 'light';
let currentAccent = null;

/** The palette painted right now: light, dark or admin. */
export function currentTheme() {
  return currentMode;
}

/**
 * Paints the application with an accent color, in the tones of the current palette. Passing
 * nothing goes back to the default purple, which is what the login and the screens outside a
 * team use.
 */
export function applyAccent(color) {
  currentAccent = color;
  const dark = currentMode !== 'light';
  const surface = SURFACES[currentMode] || WHITE;
  let base = parseHex(color) || parseHex(DEFAULT_ACCENT);

  //A navy or a forest green team color is fine on white and gone on black: lift it until it reads
  if (dark && luminance(base) < DARK_MIN_LUMINANCE) {
    base = mix(base, WHITE, 0.7);
  }

  const root = document.documentElement;
  root.style.setProperty('--vc-purple', toHex(base));
  root.style.setProperty(
    '--vc-purple-strong',
    toHex(dark ? mix(base, WHITE, DARK_STRONG_MIX) : mix(base, BLACK, STRONG_MIX)),
  );
  root.style.setProperty('--vc-purple-border', toHex(mix(base, surface, dark ? DARK_BORDER_MIX : BORDER_MIX)));
  root.style.setProperty('--vc-purple-soft', toHex(mix(base, surface, dark ? DARK_SOFT_MIX : SOFT_MIX)));
  //The ring is translucent; it needs more of itself to show on a dark field
  root.style.setProperty('--vc-focus-ring', `${toHex(base)}${dark ? '40' : '2b'}`);

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.setAttribute('content', toHex(base));
  }
}

export function resetAccent() {
  applyAccent(DEFAULT_ACCENT);
}

/**
 * Switches the palette and repaints the accent in its tones. `accent` defaults to the last one
 * applied, so a palette change alone keeps the color of the team.
 */
export function applyTheme(mode, accent = currentAccent) {
  currentMode = THEMES.includes(mode) ? mode : 'light';
  document.documentElement.dataset.theme = currentMode;
  applyAccent(accent);
}

/* ------------------------------------------------------------ the OS preference */

const darkQuery = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null;

/** Whether the operating system asks for a dark screen right now. */
export function systemPrefersDark() {
  return !!(darkQuery && darkQuery.matches);
}

/**
 * Turns what the person chose — light, dark or system — into the palette to paint. `systemDark`
 * may be passed by a caller that tracks the OS itself; otherwise the OS is asked right now.
 */
export function resolveTheme(preference, systemDark = systemPrefersDark()) {
  if (preference === 'dark') return 'dark';
  if (preference === 'system') return systemDark ? 'dark' : 'light';
  return 'light';
}

/** What a caller gets back to "stop listening" when there was never anything to listen to. */
function nothingToStop() {
  //No matchMedia, no listener: nothing to remove
}

/**
 * Calls back with 'dark' or 'light' whenever the OS preference flips, so a person on 'system' sees
 * the change without reloading. Returns the function that stops listening.
 */
export function onSystemThemeChange(callback) {
  if (!darkQuery) return nothingToStop;
  const handler = (event) => callback(event.matches ? 'dark' : 'light');
  if (typeof darkQuery.addEventListener === 'function') {
    darkQuery.addEventListener('change', handler);
    return () => darkQuery.removeEventListener('change', handler);
  }
  //Older Safari
  darkQuery.addListener(handler);
  return () => darkQuery.removeListener(handler);
}

export { DEFAULT_ACCENT, ADMIN_ACCENT, THEMES };
