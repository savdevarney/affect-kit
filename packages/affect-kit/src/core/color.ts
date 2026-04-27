// Pure module: V/A → OKLab-blended RGB. No DOM, no Lit, no state.
// Implementation comes in a follow-up commit.

/** @internal */
export type Rgb = readonly [r: number, g: number, b: number];

/** @internal */
export type Oklab = readonly [L: number, a: number, b: number];

/** @internal V/A ∈ [-1, 1] → sRGB byte triple via OKLab bilinear interpolation. */
export function colorForVA(_v: number, _a: number): Rgb {
  throw new Error('colorForVA: not implemented');
}

/** @internal Hue-aware darkening for level-3 chip backgrounds. */
export function darkerForChips(_color: Oklab): Rgb {
  throw new Error('darkerForChips: not implemented');
}

/** @internal Effective surface luminance → 0..1 light-surface indicator. */
export function surfaceIsLight(_color: Rgb): number {
  throw new Error('surfaceIsLight: not implemented');
}

/** @internal */
export function srgbToLin(_c: number): number {
  throw new Error('srgbToLin: not implemented');
}

/** @internal */
export function linToSrgb(_c: number): number {
  throw new Error('linToSrgb: not implemented');
}

/** @internal */
export function rgbToOklab(_r: number, _g: number, _b: number): Oklab {
  throw new Error('rgbToOklab: not implemented');
}

/** @internal */
export function oklabToRgb(_L: number, _a: number, _b: number): Rgb {
  throw new Error('oklabToRgb: not implemented');
}
