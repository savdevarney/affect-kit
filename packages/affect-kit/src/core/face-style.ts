// Pure module: how the face is drawn. Strokes, fills, ink, and the tiers that
// keep a small face readable. The web face draws from these, and a native one
// can too. No DOM, no Lit.

import { FACE_BOX, FACE_PARTS, type FacePart } from './face-renderer';
import type { ResolvedTheme } from './types';

/** How one part is drawn. Widths are in face units, so strokes scale with the face. */
export interface FacePartStyle {
  strokeWidth: number;
  /** The mouth is filled as well as stroked, so closed lips keep their weight. */
  fill: boolean;
  lineCap: 'round';
  lineJoin: 'round' | 'miter';
}

/** Every part's stroke and fill, in the face's ink. */
export const FACE_STYLE: Readonly<Record<FacePart, FacePartStyle>> = {
  leftBrow:       { strokeWidth: 3,   fill: false, lineCap: 'round', lineJoin: 'miter' },
  rightBrow:      { strokeWidth: 3,   fill: false, lineCap: 'round', lineJoin: 'miter' },
  // Outlined, so the whites show as the eyes open wider at higher arousal.
  leftEye:        { strokeWidth: 4,   fill: false, lineCap: 'round', lineJoin: 'round' },
  rightEye:       { strokeWidth: 4,   fill: false, lineCap: 'round', lineJoin: 'round' },
  // Drawn at FaceParams.crowsFeetOp.
  crowsFeetLeft:  { strokeWidth: 1.8, fill: false, lineCap: 'round', lineJoin: 'miter' },
  crowsFeetRight: { strokeWidth: 1.8, fill: false, lineCap: 'round', lineJoin: 'miter' },
  nose:           { strokeWidth: 2.8, fill: false, lineCap: 'round', lineJoin: 'miter' },
  mouth:          { strokeWidth: 4.5, fill: true,  lineCap: 'round', lineJoin: 'round' },
};

/** The face's ink: near-black on light, white on dark. */
export function faceInk(theme: ResolvedTheme): string {
  'worklet';
  return theme === 'dark' ? '#ffffff' : '#1a1a1a';
}

/** How much of the face to draw at a size. */
export interface FaceTier {
  /** The smallest size, in px, this tier is for. */
  minPx: number;
  /** `'dot'`: no face, a filled circle in the face's color (`vaColor`) the size of the face. */
  draw: 'face' | 'dot';
  /** Parts left out at this size. */
  omit: readonly FacePart[];
}

/**
 * The face at small sizes, for feeds and history views. Largest first: use the
 * first tier whose `minPx` the face's size reaches, or call {@link faceTier}.
 */
export const FACE_TIERS: readonly FaceTier[] = [
  { minPx: 48, draw: 'face', omit: [] },
  { minPx: 28, draw: 'face', omit: ['crowsFeetLeft', 'crowsFeetRight'] },
  { minPx: 20, draw: 'face', omit: ['crowsFeetLeft', 'crowsFeetRight', 'nose'] },
  { minPx: 0,  draw: 'dot',  omit: FACE_PARTS },
];

/** The tier for a face drawn `sizePx` wide. */
export function faceTier(sizePx: number): FaceTier {
  'worklet';
  for (const tier of FACE_TIERS) if (sizePx >= tier.minPx) return tier;
  return FACE_TIERS[FACE_TIERS.length - 1]!;
}

/** Thinner than this, a stroke breaks up on screen. */
const MIN_STROKE_PX = 1;
const FULL_SIZE_PX = 48;

/**
 * Stroke widths in face units for a face drawn `sizePx` wide. From 48 px up
 * they're {@link FACE_STYLE}'s. Below that, every stroke scales up together,
 * so the thinnest part still drawn renders at 1 px or more.
 *
 * ```ts
 * faceStroke(36).nose; // ≈ 4.72 face units, 1 px on screen
 * ```
 */
export function faceStroke(sizePx: number): Readonly<Record<FacePart, number>> {
  'worklet';
  const tier = faceTier(sizePx);
  let scale = 1;
  if (sizePx < FULL_SIZE_PX && tier.draw === 'face') {
    const drawn = FACE_PARTS.filter(part => !tier.omit.includes(part));
    const thinnest = Math.min(...drawn.map(part => FACE_STYLE[part].strokeWidth));
    const pxPerUnit = sizePx / FACE_BOX.width;
    scale = Math.max(1, MIN_STROKE_PX / (thinnest * pxPerUnit));
  }
  const widths = {} as Record<FacePart, number>;
  for (const part of FACE_PARTS) widths[part] = FACE_STYLE[part].strokeWidth * scale;
  return widths;
}
