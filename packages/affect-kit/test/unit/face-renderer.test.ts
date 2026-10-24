import { describe, it, expect } from 'vitest';
import { faceParams, faceGeometry, facePaths, toSvgPath, FACE_PARTS } from '../../src/core/face-renderer';
import { FACE_STEPS } from '../../src/core/a11y';

describe('faceParams', () => {
  it('neutral (0, 0) returns expected baseline values', () => {
    const p = faceParams(0, 0);
    expect(p.browInnerY).toBeCloseTo(-32);
    expect(p.browOuterY).toBeCloseTo(-32);
    expect(p.crowsFeetOp).toBeCloseTo(0);
    expect(p.mouthOpen).toBeCloseTo(0);
  });

  it('anger (-1, 1): inner brow lowered, narrow eyes, topAsymmetry > 0', () => {
    const p = faceParams(-1, 1);
    const neutral = faceParams(0, 0);
    expect(p.browInnerY).toBeGreaterThan(neutral.browInnerY); // lowered toward eyes
    expect(p.eyeWidth).toBeLessThan(neutral.eyeWidth + 4);    // narrowed
    expect(p.topAsymmetry).toBeGreaterThan(0);
  });

  it('joy (1, 1): crows feet visible, mouth corners up', () => {
    const p = faceParams(1, 1);
    const neutral = faceParams(0, 0);
    expect(p.crowsFeetOp).toBeGreaterThan(0);
    expect(p.mouthCornerY).toBeLessThan(neutral.mouthCornerY); // corners up
  });

  it('calm (1, -1): no crows feet, low arousal indicators', () => {
    const p = faceParams(1, -1);
    expect(p.crowsFeetOp).toBeCloseTo(0);
    expect(p.mouthOpen).toBeCloseTo(0);
  });

  it('sad (-1, -1): inner brow raised, mouth corners down', () => {
    const p = faceParams(-1, -1);
    const neutral = faceParams(0, 0);
    expect(p.browInnerY).toBeLessThan(neutral.browInnerY);  // raised
    expect(p.mouthCornerY).toBeGreaterThan(neutral.mouthCornerY); // corners down
  });

  it('mouthCornerY is higher (face up) at positive V', () => {
    const pos = faceParams(0.8, 0);
    const neg = faceParams(-0.8, 0);
    expect(pos.mouthCornerY).toBeLessThan(neg.mouthCornerY);
  });

  it('crowsFeetOp ∈ [0, 0.7]', () => {
    for (const [v, a] of [[-1,-1],[0,0],[1,1],[-1,1],[1,-1]]) {
      const p = faceParams(v as number, a as number);
      expect(p.crowsFeetOp).toBeGreaterThanOrEqual(0);
      expect(p.crowsFeetOp).toBeLessThanOrEqual(0.7 + 1e-9);
    }
  });
});

// The renderer as it was before the core took it over (0.4.1): the oracle that
// shows the web face draws the same shapes. Path data only, no DOM.
function legacyPaths(p: ReturnType<typeof faceParams>): Record<string, string> {
  const eye = (cx: number, width: number, topYOuter: number, topYInner: number, bottomY: number, isLeft: boolean) => {
    const cy = -12;
    const outerX = cx + (isLeft ? -width : width);
    const innerX = cx + (isLeft ? width : -width);
    const ctrlOuterX = outerX + (innerX - outerX) * 0.33;
    const ctrlInnerX = outerX + (innerX - outerX) * 0.67;
    return `M ${outerX.toFixed(2)} ${cy} C ${ctrlOuterX.toFixed(2)} ${topYOuter.toFixed(2)} ${ctrlInnerX.toFixed(2)} ${topYInner.toFixed(2)} ${innerX.toFixed(2)} ${cy} Q ${cx.toFixed(2)} ${bottomY.toFixed(2)} ${outerX.toFixed(2)} ${cy} Z`;
  };
  const cy = -12;
  const topYOuter = cy - p.thicknessTop;
  const topYInner = cy - p.thicknessTop * (1 - p.topAsymmetry);
  const bottomY = cy + p.thicknessBottom;
  const upperY = p.mouthMidY - p.mouthOpen * 0.35;
  const lowerY = p.mouthMidY + p.mouthOpen * 0.65;
  return {
    leftBrow: `M -42 ${p.browOuterY} Q -27 ${(p.browOuterY + p.browInnerY) / 2 - 2} -12 ${p.browInnerY}`,
    rightBrow: `M 12 ${p.browInnerY} Q 27 ${(p.browOuterY + p.browInnerY) / 2 - 2} 42 ${p.browOuterY}`,
    leftEye: eye(-28, p.eyeWidth, topYOuter, topYInner, bottomY, true),
    rightEye: eye(28, p.eyeWidth, topYOuter, topYInner, bottomY, false),
    crowsFeetLeft: 'M -41 -10 L -47 -14 M -41 -7 L -48 -8',
    crowsFeetRight: 'M 41 -10 L 47 -14 M 41 -7 L 48 -8',
    nose: 'M -3 5 Q 0 9 3 5',
    mouth: `M ${-p.mouthWidth} ${p.mouthCornerY} Q 0 ${upperY} ${p.mouthWidth} ${p.mouthCornerY} Q 0 ${lowerY} ${-p.mouthWidth} ${p.mouthCornerY} Z`,
  };
}

const tokens = (d: string) => d.trim().split(/\s+/);

describe('facePaths', () => {
  it('draws the same shapes as the 0.4.1 renderer, within a hundredth of a face unit (two roundings), across the pad', () => {
    for (const v of FACE_STEPS) {
      for (const a of FACE_STEPS) {
        const p = faceParams(v, a);
        const now = facePaths(p);
        const before = legacyPaths(p);
        for (const part of FACE_PARTS) {
          const [x, y] = [tokens(now[part]), tokens(before[part]!)];
          expect(x.length, `${part} at (${v}, ${a})`).toBe(y.length);
          x.forEach((t, i) => {
            if (/^[A-Z]$/.test(t)) expect(t).toBe(y[i]);
            else expect(Math.abs(Number(t) - Number(y[i])), `${part} at (${v}, ${a})`).toBeLessThanOrEqual(0.0101);
          });
        }
      }
    }
  });

  it('gives every part, starting with a move', () => {
    const paths = facePaths(faceParams(0, 0));
    expect(Object.keys(paths)).toEqual([...FACE_PARTS]);
    for (const part of FACE_PARTS) expect(paths[part]).toMatch(/^M /);
    expect(paths.mouth).toMatch(/Z$/);
  });

  it('clamps out-of-range positions', () => {
    expect(faceParams(3, -3)).toEqual(faceParams(1, -1));
  });
});

describe('faceGeometry and toSvgPath', () => {
  it('are the same path, as commands and as a string', () => {
    const p = faceParams(0.4, -0.6);
    const g = faceGeometry(p);
    const paths = facePaths(p);
    for (const part of FACE_PARTS) expect(toSvgPath(g[part])).toBe(paths[part]);
  });

  it('writes numbers to two decimals, without trailing zeros', () => {
    expect(toSvgPath([{ op: 'M', x: -42, y: -31.996 }, { op: 'L', x: 1.5, y: 0.004 }, { op: 'Z' }])).toBe('M -42 -32 L 1.5 0 Z');
  });

  it('mirrors the eyes', () => {
    const g = faceGeometry(faceParams(0.5, 0.5));
    const left = g.leftEye[0]!, right = g.rightEye[0]!;
    expect(left.op === 'M' && right.op === 'M' && left.x).toBe(right.op === 'M' && -right.x);
  });
});
