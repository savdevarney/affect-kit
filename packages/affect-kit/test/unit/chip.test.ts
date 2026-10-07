import { describe, it, expect } from 'vitest';
import { chipStyle } from '../../src/core/chip';
import { surfacePalette, neutralPalette, wordChipColors, MIN_TEXT_CONTRAST } from '../../src/core/palette';
import { contrastRatio, mixOver, colorForVA, type Rgb } from '../../src/core/color';
import { EMOTIONS } from '../../src/vocabulary/en';

function fromHex(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function fromRgba(css: string): { rgb: Rgb; alpha: number } {
  const [r, g, b, a] = css.match(/[\d.]+/g)!.map(Number);
  return { rgb: [r!, g!, b!], alpha: a! };
}

const colors = surfacePalette(-0.5, 0.5, 'light');

describe('chipStyle', () => {
  it('draws intensity as ring count and never changes size', () => {
    const levels = [0, 1, 2, 3].map(l => chipStyle(l, colors));
    expect(levels.map(s => s.rings.filter(r => r.kind === 'ring').length)).toEqual([0, 0, 1, 2]);
    expect(levels.map(s => s.bleed)).toEqual([0, 0, 3, 5.7]);
    for (const s of levels) {
      expect([s.fontSize, s.paddingX, s.paddingY, s.border.width]).toEqual([0.9, 1.3, 0.55, 2]);
    }
  });

  it('alternates gap and ring outward, gaps in the surface color', () => {
    const s = chipStyle(3, colors);
    expect(s.rings.map(r => r.kind)).toEqual(['gap', 'ring', 'gap', 'ring']);
    expect(s.rings.map(r => r.width)).toEqual([1.5, 1.5, 1.5, 1.2]);
    for (const r of s.rings) expect(r.color).toBe(r.kind === 'gap' ? colors.surface : colors.ring);
  });

  it('flips color on selection: tint at rest, fill when selected', () => {
    const rest = chipStyle(0, colors);
    expect([rest.background, rest.color, rest.fontWeight]).toEqual([colors.chipBg, colors.chipInk, 500]);
    expect(rest.border.color).toBe('transparent');
    for (const l of [1, 2, 3]) {
      const s = chipStyle(l, colors);
      expect([s.background, s.color, s.fontWeight]).toEqual([colors.l3, colors.l3Ink, 700]);
      expect(s.border.color).toBe(colors.ring);
    }
  });

  it('rounds and clamps the level', () => {
    expect(chipStyle(2.4, colors).level).toBe(2);
    expect(chipStyle(2.6, colors).level).toBe(3);
    expect(chipStyle(9, colors).level).toBe(3);
    expect(chipStyle(-1, colors).level).toBe(0);
  });
});

describe('chip colors', () => {
  const sets: Array<[string, () => ReturnType<typeof neutralPalette>]> = [
    ['neutral light', () => neutralPalette('light')],
    ['neutral dark', () => neutralPalette('dark')],
  ];

  for (const [name, make] of sets) {
    it(`${name}: text meets the contrast floor at rest and selected`, () => {
      const c = make();
      const bg = fromRgba(c.chipBg);
      const chipSurface = mixOver(bg.rgb, fromHex(c.surface), bg.alpha);
      expect(contrastRatio(fromHex(c.chipInk), chipSurface)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
      expect(contrastRatio(fromHex(c.l3Ink), fromHex(c.l3))).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    });
  }

  it('neutral chips have no hue', () => {
    for (const theme of ['light', 'dark'] as const) {
      const c = neutralPalette(theme);
      for (const hex of [c.surface, c.ink, c.l3, c.l3Ink, c.ring, c.chipInk]) {
        const [r, g, b] = fromHex(hex);
        expect(r === g && g === b, hex).toBe(true);
      }
    }
  });

  for (const theme of ['light', 'dark'] as const) {
    it(`word chips (${theme}): every word's text meets the contrast floor`, () => {
      for (const e of EMOTIONS) {
        const c = wordChipColors(e.v, e.a, theme);
        const bg = fromRgba(c.chipBg);
        const chipSurface = mixOver(bg.rgb, fromHex(c.surface), bg.alpha);
        expect(contrastRatio(fromHex(c.chipInk), chipSurface), `${e.name} at rest`).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
        expect(contrastRatio(fromHex(c.l3Ink), fromHex(c.l3)), `${e.name} selected`).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
      }
    });
  }

  it('word chips fill with the word\'s own color on light paper', () => {
    const { v, a } = EMOTIONS.find(e => e.name === 'joy')!;
    const [r, g, b] = colorForVA(v, a);
    expect(wordChipColors(v, a, 'light').l3).toBe('#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join(''));
  });

  it('selected chips on a face-colored surface keep the ring darker than the fill', () => {
    const lum = (hex: string) => fromHex(hex).reduce((s, c) => s + c, 0);
    for (const theme of ['light', 'dark'] as const) {
      const c = surfacePalette(0.4, -0.6, theme);
      expect(lum(c.ring)).toBeLessThan(lum(c.l3));
    }
  });
});
