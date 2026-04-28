// Pure module: V/A → OKLab-blended RGB. No DOM, no Lit, no state.
// OKLab spec: Björn Ottosson, 2020. https://bottosson.github.io/posts/oklab/
// NRC VAD quadrant colors: Mohammad 2018.

/** @internal 0..255 byte triple (sRGB) */
export type Rgb = readonly [r: number, g: number, b: number];

/** @internal [L, a, b] in OKLab space */
export type Oklab = readonly [L: number, ab: number, bb: number];

// ─── sRGB ↔ linear ────────────────────────────────────────────────────────

/** @internal */
export function srgbToLin(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** @internal */
export function linToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

// ─── RGB ↔ OKLab ──────────────────────────────────────────────────────────

/** @internal Accepts 0..255 byte inputs, returns OKLab triple. */
export function rgbToOklab(rByte: number, gByte: number, bByte: number): Oklab {
  const r = srgbToLin(rByte / 255);
  const g = srgbToLin(gByte / 255);
  const b = srgbToLin(bByte / 255);
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  ];
}

/** @internal Returns 0..255 byte triple. */
export function oklabToRgb(L: number, ab: number, bb: number): Rgb {
  const l_ = L + 0.3963377774 * ab + 0.2158037573 * bb;
  const m_ = L - 0.1055613458 * ab - 0.0638541728 * bb;
  const s_ = L - 0.0894841775 * ab - 1.2914855480 * bb;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  let r  = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g  = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  r  = Math.max(0, Math.min(1, linToSrgb(Math.max(0, Math.min(1, r)))));
  g  = Math.max(0, Math.min(1, linToSrgb(Math.max(0, Math.min(1, g)))));
  bl = Math.max(0, Math.min(1, linToSrgb(Math.max(0, Math.min(1, bl)))));
  return [Math.round(r * 255), Math.round(g * 255), Math.round(bl * 255)];
}

// ─── Quadrant corners ──────────────────────────────────────────────────────

// Precomputed once at module load. Customizable at runtime via CSS custom
// properties on the host (--affect-kit-color-pink etc.) — the CSS layer
// handles display; this layer handles math.
const Q: {
  readonly UL: Oklab; // upper-left:  negative V, positive A — pink/anger
  readonly UR: Oklab; // upper-right: positive V, positive A — gold/joy
  readonly LR: Oklab; // lower-right: positive V, negative A — green/calm
  readonly LL: Oklab; // lower-left:  negative V, negative A — blue/sad
} = {
  UL: rgbToOklab(255,  20,  87),
  UR: rgbToOklab(255, 199,   0),
  LR: rgbToOklab( 31, 224, 133),
  LL: rgbToOklab( 45, 114, 240),
};

function lerp3(c1: Oklab, c2: Oklab, t: number): Oklab {
  return [
    c1[0] + (c2[0] - c1[0]) * t,
    c1[1] + (c2[1] - c1[1]) * t,
    c1[2] + (c2[2] - c1[2]) * t,
  ];
}

// ─── Public color functions ────────────────────────────────────────────────

/** @internal V/A ∈ [-1, 1] → sRGB byte triple via OKLab bilinear interpolation. */
export function colorForVA(v: number, a: number): Rgb {
  const u = (v + 1) / 2; // 0..1, left→right
  const w = (a + 1) / 2; // 0..1, bottom→top
  const top = lerp3(Q.UL, Q.UR, u);
  const bot = lerp3(Q.LL, Q.LR, u);
  return oklabToRgb(...lerp3(bot, top, w));
}

/**
 * @internal
 * Darker variant of a color for level-3 chip backgrounds (figure/ground separation).
 * Hue-aware: yellow gets gentler darkening (lScale 0.92) to avoid olive shift;
 * all other hues use 0.80.
 */
export function darkerForChips(rgb: Rgb): Rgb {
  const oklab = rgbToOklab(rgb[0], rgb[1], rgb[2]);
  const yellowness = Math.max(0, oklab[2]) / 0.20;
  const yellowFactor = Math.min(1, yellowness * Math.max(0, 1 - Math.abs(oklab[1]) / 0.15));
  const lScale = 0.80 + yellowFactor * 0.12;
  return oklabToRgb(oklab[0] * lScale, oklab[1], oklab[2]);
}

/**
 * @internal
 * Relative luminance of a byte-triple, per WCAG definition.
 * Used for pick-appropriate-text-color decisions.
 */
export function relativeLuminance(r: number, g: number, b: number): number {
  const lin = (c: number) => {
    const n = c / 255;
    return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * @internal
 * 0..1 light-surface indicator from a byte-triple.
 * Used as `--affect-kit-surface-is-light` to drive unselected chip contrast strategy:
 * light surfaces (yellow, green) → white-tint chips; dark surfaces (pink, blue) → dark-tint.
 */
export function surfaceIsLight(rgb: Rgb): number {
  const lum = relativeLuminance(rgb[0], rgb[1], rgb[2]);
  // Surface at 85% opacity over white: effective luminance = lum * 0.85 + 0.15
  const surfaceLum = lum * 0.85 + 0.15;
  return Math.max(0, Math.min(1, (surfaceLum - 0.45) / 0.20));
}
