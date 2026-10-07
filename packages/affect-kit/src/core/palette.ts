// Pure module: the colors a surface takes from a V/A position. One source for
// <affect-kit-rater color-mode="background"> and for apps that paint their own
// screen in the face's color, so the two always agree. No DOM, no Lit.

import {
  colorForVA, contrastRatio, darkerForChips, lighterForChips, mixOver,
  SURFACE_MIX, type Rgb,
} from './color';

/**
 * Minimum WCAG contrast ratio for text in a {@link SurfacePalette}: the AA
 * level for body text. `ink`, `inkDim`, `chipInk` and `l3Ink` all meet it.
 */
export const MIN_TEXT_CONTRAST = 4.5;

/** Colors for a surface painted from a V/A position. Every value is a CSS color string. */
export interface SurfacePalette {
  /** The V/A color at {@link SURFACE_MIX} over the theme's paper. Opaque. */
  surface: string;
  /** Primary text on `surface`: black or white, whichever contrasts more. */
  ink: string;
  /**
   * Secondary text on `surface`: `ink` faded as far as {@link MIN_TEXT_CONTRAST}
   * allows, flattened to an opaque color.
   */
  inkDim: string;
  /** Fill for unselected chips and quiet controls on `surface`. Translucent. */
  chipBg: string;
  /** Text on `chipBg` over `surface`. Opaque, at least {@link MIN_TEXT_CONTRAST}. */
  chipInk: string;
  /**
   * Fill for selected chips and buttons: the V/A color darkened on light
   * paper, lifted on dark paper. Opaque.
   */
  l3: string;
  /** Text on `l3`: black or white, whichever contrasts more. */
  l3Ink: string;
  /** `true` when `surface` is light enough that `ink` is black. */
  isLight: boolean;
}

/** @internal Same palette as byte triples, for components that set channel vars. */
export interface SurfacePaletteRgb {
  surface: Rgb;
  ink: Rgb;
  inkDim: Rgb;
  chipBg: { rgb: Rgb; alpha: number };
  chipInk: Rgb;
  l3: Rgb;
  l3Ink: Rgb;
  isLight: boolean;
}

// Paper matches the components' --_paper for each theme.
const PAPER: Record<'light' | 'dark', Rgb> = {
  light: [255, 255, 255],
  dark:  [26, 26, 26],
};
const BLACK: Rgb = [0, 0, 0];
const WHITE: Rgb = [255, 255, 255];

// Pure black and white, not the components' #1a1a1a ink: at the luminance
// where black and white tie, pure black/white still clear 4.5:1 (about 4.58),
// and #1a1a1a doesn't (about 4.18).
function bestInk(bg: Rgb): Rgb {
  return contrastRatio(BLACK, bg) >= contrastRatio(WHITE, bg) ? BLACK : WHITE;
}

// Secondary text starts at 60% ink and darkens in 5% steps until it clears the
// floor. Full ink from bestInk always clears 4.5, so the loop always ends.
const DIM_START = 0.6;
const DIM_STEP = 0.05;

function dimInk(ink: Rgb, bg: Rgb): Rgb {
  for (let alpha = DIM_START; alpha < 1; alpha += DIM_STEP) {
    const flat = mixOver(ink, bg, alpha);
    if (contrastRatio(flat, bg) >= MIN_TEXT_CONTRAST) return flat;
  }
  return ink;
}

/** @internal */
export function surfacePaletteRgb(v: number, a: number, theme: 'light' | 'dark'): SurfacePaletteRgb {
  const color = colorForVA(v, a);
  const surface = mixOver(color, PAPER[theme], SURFACE_MIX);
  const ink = bestInk(surface);
  const isLight = ink === BLACK;
  // Chips tint toward the ink: a dark veil on light surfaces, a light one on dark.
  const chipBg = isLight
    ? { rgb: BLACK, alpha: 0.08 }
    : { rgb: WHITE, alpha: 0.16 };
  const chipSurface = mixOver(chipBg.rgb, surface, chipBg.alpha);
  const l3 = theme === 'dark' ? lighterForChips(color) : darkerForChips(color);
  return {
    surface,
    ink,
    inkDim: dimInk(ink, surface),
    chipBg,
    chipInk: dimInk(bestInk(chipSurface), chipSurface),
    l3,
    l3Ink: bestInk(l3),
    isLight,
  };
}

function hex(rgb: Rgb): string {
  return '#' + rgb.map(c => c.toString(16).padStart(2, '0')).join('');
}

/**
 * The colors a surface takes from a V/A position: the same math
 * `<affect-kit-rater color-mode="background">` uses, so an app that paints a
 * whole screen in the face's color matches the rater.
 *
 * `theme` is the paper under the color: `'light'` (white) or `'dark'`
 * (#1a1a1a). Resolve `'auto'` to one of these before calling.
 *
 * ```ts
 * import { surfacePalette } from 'affect-kit/data';
 * const p = surfacePalette(v, a, 'light');
 * screen.style.background = p.surface;
 * caption.style.color = p.inkDim;
 * ```
 */
export function surfacePalette(v: number, a: number, theme: 'light' | 'dark'): SurfacePalette {
  const p = surfacePaletteRgb(v, a, theme);
  const [r, g, b] = p.chipBg.rgb;
  return {
    surface: hex(p.surface),
    ink:     hex(p.ink),
    inkDim:  hex(p.inkDim),
    chipBg:  `rgba(${r}, ${g}, ${b}, ${p.chipBg.alpha})`,
    chipInk: hex(p.chipInk),
    l3:      hex(p.l3),
    l3Ink:   hex(p.l3Ink),
    isLight: p.isLight,
  };
}
