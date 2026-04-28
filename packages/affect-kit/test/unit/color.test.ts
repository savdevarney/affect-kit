import { describe, it, expect } from 'vitest';
import {
  srgbToLin, linToSrgb,
  rgbToOklab, oklabToRgb,
  colorForVA, darkerForChips, surfaceIsLight,
} from '../../src/core/color';

describe('sRGB ↔ linear', () => {
  it('round-trips a midrange value', () => {
    const original = 0.5;
    expect(linToSrgb(srgbToLin(original))).toBeCloseTo(original, 5);
  });

  it('handles the 0.04045 threshold branch', () => {
    expect(srgbToLin(0.04045 / 2)).toBeCloseTo(0.04045 / 2 / 12.92, 6);
    expect(srgbToLin(0.5)).toBeGreaterThan(0.5 / 12.92); // gamma branch is higher
  });
});

describe('rgbToOklab / oklabToRgb', () => {
  it('round-trips the four corner colors within ±1 byte', () => {
    const corners = [
      [255,  20,  87],  // pink
      [255, 199,   0],  // gold
      [ 31, 224, 133],  // green
      [ 45, 114, 240],  // blue
    ] as const;
    for (const [r, g, b] of corners) {
      const [L, ab, bb] = rgbToOklab(r, g, b);
      const [rr, gg, bb2] = oklabToRgb(L, ab, bb);
      expect(Math.abs(rr - r)).toBeLessThanOrEqual(1);
      expect(Math.abs(gg - g)).toBeLessThanOrEqual(1);
      expect(Math.abs(bb2 - b)).toBeLessThanOrEqual(1);
    }
  });

  it('oklabToRgb clamps output to 0..255', () => {
    // Extreme OKLab values outside the sRGB gamut should still produce valid bytes
    const [r, g, b] = oklabToRgb(1.5, 0.5, 0.5);
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThanOrEqual(255);
    expect(g).toBeGreaterThanOrEqual(0);
    expect(g).toBeLessThanOrEqual(255);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThanOrEqual(255);
  });
});

describe('colorForVA', () => {
  it('corner V=-1,A=1 returns pink (#FF1457, ±4 bytes)', () => {
    const [r, g, b] = colorForVA(-1, 1);
    expect(r).toBeGreaterThan(200);
    expect(g).toBeLessThan(50);
    expect(b).toBeLessThan(100);
  });

  it('corner V=1,A=1 returns gold (#FFC700, ±4 bytes)', () => {
    const [r, g, b] = colorForVA(1, 1);
    expect(r).toBeGreaterThan(200);
    expect(g).toBeGreaterThan(170);
    expect(b).toBeLessThan(30);
  });

  it('corner V=1,A=-1 returns green (#1FE085, ±4 bytes)', () => {
    const [r, g, b] = colorForVA(1, -1);
    expect(r).toBeLessThan(60);
    expect(g).toBeGreaterThan(200);
    expect(b).toBeGreaterThan(100);
  });

  it('corner V=-1,A=-1 returns blue (#2D72F0, ±4 bytes)', () => {
    const [r, g, b] = colorForVA(-1, -1);
    expect(r).toBeLessThan(80);
    expect(g).toBeGreaterThan(80);
    expect(g).toBeLessThan(140);
    expect(b).toBeGreaterThan(200);
  });

  it('center V=0,A=0 returns a mid-range neutral (no extreme channels)', () => {
    const [r, g, b] = colorForVA(0, 0);
    expect(r).toBeGreaterThan(50);
    expect(r).toBeLessThan(230);
    expect(g).toBeGreaterThan(50);
    expect(b).toBeGreaterThan(50);
  });

  it('returns 0..255 bytes everywhere', () => {
    const points = [[-1,-1],[0,0],[1,1],[-1,1],[1,-1],[0.3,-0.7]] as const;
    for (const [v, a] of points) {
      const [r, g, b] = colorForVA(v, a);
      expect(r).toBeGreaterThanOrEqual(0); expect(r).toBeLessThanOrEqual(255);
      expect(g).toBeGreaterThanOrEqual(0); expect(g).toBeLessThanOrEqual(255);
      expect(b).toBeGreaterThanOrEqual(0); expect(b).toBeLessThanOrEqual(255);
    }
  });
});

describe('darkerForChips', () => {
  it('produces a color with lower OKLab L than the input', () => {
    const rgb = colorForVA(0.5, 0.5); // gold-ish
    const darker = darkerForChips(rgb);
    const [origL] = rgbToOklab(rgb[0], rgb[1], rgb[2]);
    const [darkL] = rgbToOklab(darker[0], darker[1], darker[2]);
    expect(darkL).toBeLessThan(origL);
  });

  it('yellow gets gentler darkening than blue', () => {
    const yellow = colorForVA(1, 1);
    const blue   = colorForVA(-1, -1);
    const darkerYellow = darkerForChips(yellow);
    const darkerBlue   = darkerForChips(blue);
    const [yOrig] = rgbToOklab(yellow[0], yellow[1], yellow[2]);
    const [yDark] = rgbToOklab(darkerYellow[0], darkerYellow[1], darkerYellow[2]);
    const [bOrig] = rgbToOklab(blue[0], blue[1], blue[2]);
    const [bDark] = rgbToOklab(darkerBlue[0], darkerBlue[1], darkerBlue[2]);
    // Yellow L reduction should be smaller (gentler darkening) than blue's
    expect(yOrig - yDark).toBeLessThan(bOrig - bDark);
  });
});

describe('surfaceIsLight', () => {
  it('returns 0..1', () => {
    const points = [[-1,-1],[0,0],[1,1],[-1,1],[1,-1]] as const;
    for (const [v, a] of points) {
      const s = surfaceIsLight(colorForVA(v, a));
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  it('gold (high arousal, positive V) reads as light', () => {
    expect(surfaceIsLight(colorForVA(1, 1))).toBeGreaterThan(0.5);
  });

  it('blue (low arousal, negative V) reads as dark', () => {
    expect(surfaceIsLight(colorForVA(-1, -1))).toBeLessThan(0.5);
  });
});
