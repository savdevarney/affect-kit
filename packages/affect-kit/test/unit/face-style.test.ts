import { describe, expect, it } from 'vitest';
import { FACE_STYLE, FACE_TIERS, faceInk, faceStroke, faceTier } from '../../src/core/face-style';
import { FACE_BOX, FACE_PARTS } from '../../src/core/face-renderer';

describe('FACE_STYLE', () => {
  it("keeps 0.4.1's strokes and fills, which lived in <affect-kit-face>'s CSS", () => {
    expect(FACE_STYLE).toEqual({
      leftBrow:       { strokeWidth: 3,   fill: false, lineCap: 'round', lineJoin: 'miter' },
      rightBrow:      { strokeWidth: 3,   fill: false, lineCap: 'round', lineJoin: 'miter' },
      leftEye:        { strokeWidth: 4,   fill: false, lineCap: 'round', lineJoin: 'round' },
      rightEye:       { strokeWidth: 4,   fill: false, lineCap: 'round', lineJoin: 'round' },
      crowsFeetLeft:  { strokeWidth: 1.8, fill: false, lineCap: 'round', lineJoin: 'miter' },
      crowsFeetRight: { strokeWidth: 1.8, fill: false, lineCap: 'round', lineJoin: 'miter' },
      nose:           { strokeWidth: 2.8, fill: false, lineCap: 'round', lineJoin: 'miter' },
      mouth:          { strokeWidth: 4.5, fill: true,  lineCap: 'round', lineJoin: 'round' },
    });
  });

  it('inks the face near-black on light and white on dark', () => {
    expect(faceInk('light')).toBe('#1a1a1a');
    expect(faceInk('dark')).toBe('#ffffff');
  });
});

describe('faceTier', () => {
  it('drops the crow\'s feet under 48 px, the nose under 28 and the face under 20', () => {
    expect(faceTier(120).omit).toEqual([]);
    expect(faceTier(48).omit).toEqual([]);
    expect(faceTier(47).omit).toEqual(['crowsFeetLeft', 'crowsFeetRight']);
    expect(faceTier(28).omit).toEqual(['crowsFeetLeft', 'crowsFeetRight']);
    expect(faceTier(27).omit).toEqual(['crowsFeetLeft', 'crowsFeetRight', 'nose']);
    expect(faceTier(20).draw).toBe('face');
    expect(faceTier(19.9).draw).toBe('dot');
    expect(faceTier(0).draw).toBe('dot');
  });

  it('lists tiers largest first', () => {
    const sizes = FACE_TIERS.map(t => t.minPx);
    expect([...sizes].sort((x, y) => y - x)).toEqual(sizes);
  });
});

describe('faceStroke', () => {
  const rendered = (sizePx: number, width: number) => width * sizePx / FACE_BOX.width;

  it('keeps the drawn widths from 48 px up', () => {
    for (const size of [48, 120, 400]) {
      for (const part of FACE_PARTS) expect(faceStroke(size)[part]).toBe(FACE_STYLE[part].strokeWidth);
    }
  });

  it('scales every stroke together below 48 px, so the thinnest part still drawn renders at 1 px', () => {
    for (const size of [20, 24, 27, 28, 36, 47]) {
      const tier = faceTier(size);
      const widths = faceStroke(size);
      const drawn = FACE_PARTS.filter(part => !tier.omit.includes(part));
      const thinnest = Math.min(...drawn.map(part => rendered(size, widths[part])));
      expect(thinnest).toBeGreaterThanOrEqual(1 - 1e-9);
      // Together: every part keeps its share of the mouth's weight.
      for (const part of FACE_PARTS) {
        expect(widths[part] / widths.mouth).toBeCloseTo(FACE_STYLE[part].strokeWidth / FACE_STYLE.mouth.strokeWidth);
      }
    }
  });

  it('at 36 px, the nose renders at 1 px and the mouth at about 1.6', () => {
    expect(rendered(36, faceStroke(36).nose)).toBeCloseTo(1);
    expect(rendered(36, faceStroke(36).mouth)).toBeCloseTo(1.61, 2);
  });
});
