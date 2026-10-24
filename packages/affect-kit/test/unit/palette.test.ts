import { describe, it, expect } from 'vitest';
import { contrastRatio, colorForVA, mixOver, SURFACE_MIX, type Rgb } from '../../src/core/color';
import { surfacePalette, surfacePaletteRgb, MIN_TEXT_CONTRAST } from '../../src/core/palette';

function fromHex(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// 21 × 21 grid over the whole pad, corners and center included.
const GRID: Array<[number, number]> = [];
for (let i = 0; i <= 20; i++) {
  for (let j = 0; j <= 20; j++) GRID.push([-1 + i / 10, -1 + j / 10]);
}

describe('surfacePalette', () => {
  for (const theme of ['light', 'dark'] as const) {
    describe(`${theme} theme`, () => {
      it('keeps every text color at or above the contrast floor across the pad', () => {
        for (const [v, a] of GRID) {
          const p = surfacePalette(v, a, theme);
          const surface = fromHex(p.surface);
          const chipSurface = mixOver(p.isLight ? [0, 0, 0] : [255, 255, 255], surface, p.isLight ? 0.08 : 0.16);
          const where = `v=${v.toFixed(1)} a=${a.toFixed(1)}`;
          expect(contrastRatio(fromHex(p.ink), surface), `ink ${where}`).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
          expect(contrastRatio(fromHex(p.inkDim), surface), `inkDim ${where}`).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
          expect(contrastRatio(fromHex(p.chipInk), chipSurface), `chipInk ${where}`).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
          expect(contrastRatio(fromHex(p.l3Ink), fromHex(p.l3)), `l3Ink ${where}`).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
        }
      });

      it('blends the V/A color over the paper at SURFACE_MIX', () => {
        const paper: Rgb = theme === 'light' ? [255, 255, 255] : [26, 26, 26];
        const p = surfacePalette(-0.6, 0.4, theme);
        expect(fromHex(p.surface)).toEqual(mixOver(colorForVA(-0.6, 0.4), paper, SURFACE_MIX));
      });

      it('isLight agrees with the ink', () => {
        for (const [v, a] of GRID) {
          const p = surfacePalette(v, a, theme);
          expect(p.ink).toBe(p.isLight ? '#000000' : '#ffffff');
        }
      });
    });
  }

  it('dims secondary text where the surface allows it', () => {
    // Pale gold on white: plenty of room, so inkDim is lighter than ink.
    const p = surfacePalette(0.8, 0.8, 'light');
    expect(p.inkDim).not.toBe(p.ink);
  });

  it('darkens the chip color on light paper and lifts it on dark paper', () => {
    const lum = (rgb: Rgb) => rgb[0] + rgb[1] + rgb[2];
    const raw = colorForVA(-0.8, -0.8);
    expect(lum(surfacePaletteRgb(-0.8, -0.8, 'light').l3)).toBeLessThan(lum(raw));
    expect(lum(surfacePaletteRgb(-0.8, -0.8, 'dark').l3)).toBeGreaterThan(lum(raw));
  });

  it('returns CSS color strings', () => {
    const p = surfacePalette(0, 0, 'light');
    for (const key of ['surface', 'ink', 'inkDim', 'chipInk', 'l3', 'l3Ink'] as const) {
      expect(p[key]).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(p.chipBg).toMatch(/^rgba\(\d+, \d+, \d+, [\d.]+\)$/);
  });
});
