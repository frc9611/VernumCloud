/*
 * Accent color per tenant.
 *
 * Every interactive surface of the dashboard reads --vc-purple and the three tones derived
 * from it. Those tokens have a default in assets/vernum.css and are overwritten here with the
 * color of the team currently open, so switching teams repaints the whole application: tabs,
 * buttons, chips, card headers, focus rings.
 *
 * The three tones are computed from the base color with the same proportions the mockups use
 * for #8864AE, so any team color produces a coherent set instead of hardcoded values.
 */

const DEFAULT_ACCENT = '#8864AE';

/** How much of the base color survives when mixing towards black or white. */
const STRONG_MIX = 0.82; // --vc-purple-strong: base over black
const BORDER_MIX = 0.41; // --vc-purple-border: base over white
const SOFT_MIX = 0.12;   // --vc-purple-soft: base over white

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

const BLACK = { r: 0, g: 0, b: 0 };
const WHITE = { r: 255, g: 255, b: 255 };

/**
 * Paints the application with an accent color. Passing nothing goes back to the default purple,
 * which is what the login and the screens outside a team use.
 */
export function applyAccent(color) {
  const base = parseHex(color) || parseHex(DEFAULT_ACCENT);
  const root = document.documentElement;

  root.style.setProperty('--vc-purple', toHex(base));
  root.style.setProperty('--vc-purple-strong', toHex(mix(base, BLACK, STRONG_MIX)));
  root.style.setProperty('--vc-purple-border', toHex(mix(base, WHITE, BORDER_MIX)));
  root.style.setProperty('--vc-purple-soft', toHex(mix(base, WHITE, SOFT_MIX)));
  root.style.setProperty('--vc-focus-ring', `${toHex(base)}2b`);

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.setAttribute('content', toHex(base));
  }
}

export function resetAccent() {
  applyAccent(DEFAULT_ACCENT);
}

export { DEFAULT_ACCENT };
