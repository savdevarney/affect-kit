import { describe, expect, it } from 'vitest';
import { faceToPad, padColors, padToFace, vaColor } from '../../src/core/pad';
import { surfacePalette } from '../../src/core/palette';
import { colorForVA, toHex } from '../../src/core/color';

describe('padToFace and faceToPad', () => {
  it('maps the corners: valence left to right, arousal bottom to top', () => {
    expect(padToFace(0, 0)).toEqual({ v: -1, a: 1 });
    expect(padToFace(1, 1)).toEqual({ v: 1, a: -1 });
    expect(padToFace(0.5, 0.5)).toEqual({ v: 0, a: 0 });
  });

  it('clamps touches outside the pad', () => {
    expect(padToFace(-0.2, 1.4)).toEqual({ v: -1, a: -1 });
  });

  it('round-trips', () => {
    for (const [x, y] of [[0.1, 0.9], [0.5, 0.25], [0.8, 0.3]] as const) {
      const { v, a } = padToFace(x, y);
      const back = faceToPad(v, a);
      expect(back.x).toBeCloseTo(x);
      expect(back.y).toBeCloseTo(y);
    }
  });
});

describe('vaColor', () => {
  it('is the four-corner blend as hex, clamped', () => {
    expect(vaColor(0.3, -0.4)).toBe(toHex(colorForVA(0.3, -0.4)));
    expect(vaColor(2, 2)).toBe(vaColor(1, 1));
    expect(vaColor(-1, 1)).toBe('#ff1457');
  });
});

describe('padColors', () => {
  it("with color: the face's color behind, and the chosen-word color under the finger", () => {
    for (const theme of ['light', 'dark'] as const) {
      expect(padColors(0.5, 0.5, theme, 'color')).toEqual({
        halo: vaColor(0.5, 0.5),
        dot: surfacePalette(0.5, 0.5, theme).l3,
      });
    }
  });

  it('without color: the ink, at 18% behind and 35% under the finger', () => {
    expect(padColors(0, 0, 'light', 'neutral')).toEqual({ halo: 'rgba(26, 26, 26, 0.18)', dot: 'rgba(26, 26, 26, 0.35)' });
    expect(padColors(0, 0, 'dark', 'neutral')).toEqual({ halo: 'rgba(255, 255, 255, 0.18)', dot: 'rgba(255, 255, 255, 0.35)' });
    expect(padColors(0, 0, 'light', 'none')).toEqual({ halo: null, dot: 'rgba(26, 26, 26, 0.35)' });
  });

  it("takes the renderer's own ink", () => {
    expect(padColors(0, 0, 'light', 'neutral', '#123456').dot).toBe('rgba(18, 52, 86, 0.35)');
    expect(padColors(0, 0, 'dark', 'none', '#fff').dot).toBe('rgba(255, 255, 255, 0.35)');
  });
});
