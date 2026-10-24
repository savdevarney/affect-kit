// Pure module: the square the face is dragged on. Where a touch lands in
// valence and arousal, and the colors of the halo and the dot under the
// finger. No DOM, no Lit. Worklet-ready, like face-renderer.ts: these run on
// every frame of a drag.

import { colorForVA, toHex, type Rgb } from './color';
import { surfacePalette } from './palette';
import type { PadGlow, ResolvedTheme } from './types';

/**
 * A point on the pad as a face position. `x` and `y` run from 0 to 1 from the
 * pad's top-left corner and are clamped. Valence runs left to right; arousal
 * runs bottom to top, so y is flipped.
 */
export function padToFace(x: number, y: number): { v: number; a: number } {
  'worklet';
  const cx = Math.max(0, Math.min(1, x));
  const cy = Math.max(0, Math.min(1, y));
  return { v: cx * 2 - 1, a: 1 - cy * 2 };
}

/** Where a face position sits on the pad, from its top-left corner: where the dot goes. */
export function faceToPad(v: number, a: number): { x: number; y: number } {
  'worklet';
  return { x: (v + 1) / 2, y: (1 - a) / 2 };
}

/**
 * The face's own color at a position, as `#rrggbb`: the halo behind the face,
 * and the glow of a screen that takes the face's color. A blend of four corner
 * colors in OKLab.
 */
export function vaColor(v: number, a: number): string {
  'worklet';
  return toHex(colorForVA(Math.max(-1, Math.min(1, v)), Math.max(-1, Math.min(1, a))));
}

// The pad's ink by theme, when the renderer doesn't pass its own.
const INK: Record<ResolvedTheme, Rgb> = { light: [26, 26, 26], dark: [255, 255, 255] };
/** @internal The halo's share of the ink without color. */
export const PAD_HALO_INK_ALPHA = 0.18;
/** @internal The dot's share of the ink without color. */
export const PAD_DOT_INK_ALPHA = 0.35;

function parseHex(hex: string): Rgb {
  'worklet';
  const h = hex.replace('#', '');
  // '#abc' is short for '#aabbcc'.
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

function rgba(rgb: Rgb, alpha: number): string {
  'worklet';
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

/**
 * The halo behind the face and the dot under the finger, for a pad's
 * {@link PadGlow} setting:
 * - `'color'`: the halo in the face's color, and the dot in the color a chosen
 *   word takes (`surfacePalette(v, a, theme).l3`), which stands out against a
 *   screen painted in the face's color.
 * - `'neutral'`: both in the ink, the halo at 18% and the dot at 35%.
 * - `'none'`: no halo (`null`), and the dot in the ink at 35%.
 *
 * `ink` is the renderer's own ink as `#rrggbb`; by default the face's
 * (`faceInk(theme)`). The halo is a radial gradient from its color at the
 * centre to transparent at the pad's edge.
 */
export function padColors(
  v: number, a: number, theme: ResolvedTheme, glow: PadGlow, ink?: string,
): { halo: string | null; dot: string } {
  'worklet';
  if (glow === 'color') return { halo: vaColor(v, a), dot: surfacePalette(v, a, theme).l3 };
  const inkRgb = ink === undefined ? INK[theme] : parseHex(ink);
  return {
    halo: glow === 'neutral' ? rgba(inkRgb, PAD_HALO_INK_ALPHA) : null,
    dot: rgba(inkRgb, PAD_DOT_INK_ALPHA),
  };
}
