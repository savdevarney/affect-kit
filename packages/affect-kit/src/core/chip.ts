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

/** A chip's look, as plain data. Sizes in `em` scale with the host's font size; `px` ones don't. */
export interface ChipStyle {
  level: ChipLevel;
  /** em, relative to the surrounding text size. */
  fontSize: number;
  fontWeight: 500 | 700;
  /** em, horizontal and vertical padding inside the border. */
  paddingX: number;
  paddingY: number;
  borderRadius: number;
  background: string;
  color: string;
  /** Innermost stroke. Inside the chip's box; transparent when unselected, so the size never changes. */
  border: { width: number; color: string };
  /**
   * Strokes outward from the border, nearest first. Drawn outside the layout box,
   * like a CSS box-shadow with spread: they don't move neighbors. Empty at levels 0 and 1.
   */
  rings: ChipRing[];
  /** px the outermost ring extends past the border. Leave this much room around the chip. */
  bleed: number;
}

const BORDER_PX = 2;
const GAP_PX = 1.5;
// Ring widths by level, innermost first. Intensity is the ring count: 1, 2, 3 strokes
// counting the border.
const RING_PX = [1.5, 1.2] as const;

function clampLevel(level: number): ChipLevel {
  return Math.max(0, Math.min(3, Math.round(level))) as ChipLevel;
}

/**
 * How a chip looks at a level, from a palette. Selection is color (unselected
 * tint, selected fill); intensity is ring count (1 to 3 strokes); size never
 * changes, so chips don't reflow when tapped.
 *
 * ```ts
 * import { chipStyle, surfacePalette } from 'affect-kit/data';
 * const s = chipStyle(2, surfacePalette(v, a, 'light'));
 * // s.background, s.color, s.border, s.rings: draw them with any renderer
 * ```
 */
export function chipStyle(level: number, colors: ChipColors): ChipStyle {
  const lv = clampLevel(level);
  const selected = lv > 0;
  // Level 1 is the border alone; each level after adds a gap and a ring.
  const rings: ChipRing[] = [];
  for (let i = 0; i < Math.max(0, lv - 1); i++) {
    rings.push({ kind: 'gap', width: GAP_PX, color: colors.surface });
    rings.push({ kind: 'ring', width: RING_PX[i]!, color: colors.ring });
  }
  return {
    level: lv,
    fontSize: 0.9,
    fontWeight: selected ? 700 : 500,
    paddingX: 1.3,
    paddingY: 0.55,
    borderRadius: 999,
    background: selected ? colors.l3 : colors.chipBg,
    color: selected ? colors.l3Ink : colors.chipInk,
    border: { width: BORDER_PX, color: selected ? colors.ring : 'transparent' },
    rings,
    bleed: rings.reduce((sum, r) => sum + r.width, 0),
  };
}
