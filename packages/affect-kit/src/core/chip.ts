// Pure module: how a word chip looks, as data. `<affect-kit-chip>` and the
// rater draw from this, and an app with native views can draw the same chip
// from the same numbers. No DOM, no Lit.

import type { SurfacePalette } from './palette';

/** The colors a chip needs: a {@link surfacePalette}, `neutralPalette` or `wordChipColors` result works as-is. */
export type ChipColors = Pick<SurfacePalette, 'surface' | 'chipBg' | 'chipInk' | 'l3' | 'l3Ink' | 'ring'>;

/** Chip intensity: 0 unselected, 1-3 selected, as the rater's taps cycle. */
export type ChipLevel = 0 | 1 | 2 | 3;

/** One concentric stroke around the chip. */
export interface ChipRing {
  /** `'ring'` is a visible stroke; `'gap'` is the surface showing through between strokes. */
  kind: 'ring' | 'gap';
  /** Thickness in px. */
  width: number;
  color: string;
}

/** A chip's look, as plain data. Every size is in px. */
export interface ChipStyle {
  level: ChipLevel;
  /** The text size: 0.9 × the base size. */
  fontSize: number;
  fontWeight: 500 | 700;
  /** Padding inside the border: 1.3 × and 0.55 × the text size. */
  paddingX: number;
  paddingY: number;
  borderRadius: number;
  background: string;
  color: string;
  /**
   * The chip's own edge, inside its box: the fill's color when selected,
   * transparent when not, so the size never changes and the edge is never
   * read as a ring.
   */
  border: { width: number; color: string };
  /**
   * Strokes outward from the chip, nearest first, each after a gap of the
   * surface: one ring per level. Drawn outside the layout box, like a CSS
   * box-shadow with spread, so they don't move neighbors. Empty at level 0.
   * React Native has no spread shadows: draw them as nested borders or Skia strokes.
   */
  rings: ChipRing[];
  /** px the outermost ring extends past the border. Leave this much room around the chip. */
  bleed: number;
}

/** The text size chips are designed at, and the default base. */
export const BASE_FONT_PX = 16;

const FONT_SCALE = 0.9;
const PADDING_X = 1.3;   // × the chip's text size
const PADDING_Y = 0.55;
const BORDER_PX = 2;
const GAP_PX = 1.25;
// Ring widths by level, innermost first. Intensity is the ring count: one ring per level,
// each separated from the chip and from the last by a gap, so every palette counts the
// same (in mono, a border alone on an ink fill was nearly invisible).
const RING_PX = [1.5, 1.25, 1] as const;

function clampLevel(level: number): ChipLevel {
  'worklet';
  return Math.max(0, Math.min(3, Math.round(level))) as ChipLevel;
}

/**
 * How a chip looks at a level, from a palette. Selection is color (unselected
 * tint, selected fill); intensity is ring count (one ring per level, each
 * outside the chip); size never changes, so chips don't reflow when tapped.
 *
 * Sizes are px from `basePx`, the surrounding text size (16 by default), so
 * the platform's text size setting scales the chip. Borders and rings stay in
 * px at every size.
 *
 * ```ts
 * import { chipStyle, surfacePalette } from 'affect-kit/core';
 * const s = chipStyle(2, surfacePalette(v, a, 'light'), 17);
 * // s.background, s.color, s.border, s.rings: draw them with any renderer
 * ```
 */
export function chipStyle(level: number, colors: ChipColors, basePx: number = BASE_FONT_PX): ChipStyle {
  'worklet';
  const lv = clampLevel(level);
  const selected = lv > 0;
  const fontSize = basePx * FONT_SCALE;
  // Each level adds a gap and a ring.
  const rings: ChipRing[] = [];
  for (let i = 0; i < lv; i++) {
    rings.push({ kind: 'gap', width: GAP_PX, color: colors.surface });
    rings.push({ kind: 'ring', width: RING_PX[i]!, color: colors.ring });
  }
  return {
    level: lv,
    fontSize,
    fontWeight: selected ? 700 : 500,
    paddingX: fontSize * PADDING_X,
    paddingY: fontSize * PADDING_Y,
    borderRadius: 999,
    background: selected ? colors.l3 : colors.chipBg,
    color: selected ? colors.l3Ink : colors.chipInk,
    border: { width: BORDER_PX, color: selected ? colors.l3 : 'transparent' },
    rings,
    bleed: rings.reduce((sum, r) => sum + r.width, 0),
  };
}

/**
 * The space between chips in a list, in px. It clears two level-3 chips side
 * by side: each one's rings reach 7.5 px past its edge, 15 px together. The
 * rings stay in px at every text size, so the gap doesn't depend on the level
 * or the size.
 */
export const WORD_LIST_GAP = { row: 16, column: 16 } as const;
