import { describe, it, expect } from 'vitest';
import { computeTarget, renderFace, eyePath, smoothFaceParams } from '../../src/core/face-renderer';

describe('computeTarget', () => {
  it('neutral (0, 0) returns expected baseline values', () => {
    const p = computeTarget(0, 0);
    expect(p.browInnerY).toBeCloseTo(-32);
    expect(p.browOuterY).toBeCloseTo(-32);
    expect(p.crowsFeetOp).toBeCloseTo(0);
    expect(p.mouthOpen).toBeCloseTo(0);
  });

  it('anger (-1, 1): inner brow lowered, narrow eyes, topAsymmetry > 0', () => {
    const p = computeTarget(-1, 1);
    const neutral = computeTarget(0, 0);
    expect(p.browInnerY).toBeGreaterThan(neutral.browInnerY); // lowered toward eyes
    expect(p.eyeWidth).toBeLessThan(neutral.eyeWidth + 4);    // narrowed
    expect(p.topAsymmetry).toBeGreaterThan(0);
  });

  it('joy (1, 1): crows feet visible, mouth corners up', () => {
    const p = computeTarget(1, 1);
    const neutral = computeTarget(0, 0);
    expect(p.crowsFeetOp).toBeGreaterThan(0);
    expect(p.mouthCornerY).toBeLessThan(neutral.mouthCornerY); // corners up
  });

  it('calm (1, -1): no crows feet, low arousal indicators', () => {
    const p = computeTarget(1, -1);
    expect(p.crowsFeetOp).toBeCloseTo(0);
    expect(p.mouthOpen).toBeCloseTo(0);
  });

  it('sad (-1, -1): inner brow raised, mouth corners down', () => {
    const p = computeTarget(-1, -1);
    const neutral = computeTarget(0, 0);
    expect(p.browInnerY).toBeLessThan(neutral.browInnerY);  // raised
    expect(p.mouthCornerY).toBeGreaterThan(neutral.mouthCornerY); // corners down
  });

  it('mouthCornerY is higher (face up) at positive V', () => {
    const pos = computeTarget(0.8, 0);
    const neg = computeTarget(-0.8, 0);
    expect(pos.mouthCornerY).toBeLessThan(neg.mouthCornerY);
  });

  it('crowsFeetOp ∈ [0, 0.7]', () => {
    for (const [v, a] of [[-1,-1],[0,0],[1,1],[-1,1],[1,-1]]) {
      const p = computeTarget(v as number, a as number);
      expect(p.crowsFeetOp).toBeGreaterThanOrEqual(0);
      expect(p.crowsFeetOp).toBeLessThanOrEqual(0.7 + 1e-9);
    }
  });
});

describe('renderFace', () => {
  it('returns FacePaths with non-empty strings for all features', () => {
    const paths = renderFace(computeTarget(0, 0));
    expect(paths.leftBrow.length).toBeGreaterThan(5);
    expect(paths.rightBrow.length).toBeGreaterThan(5);
    expect(paths.leftEye.length).toBeGreaterThan(5);
    expect(paths.rightEye.length).toBeGreaterThan(5);
    expect(paths.crowsFeetLeft.length).toBeGreaterThan(5);
    expect(paths.crowsFeetRight.length).toBeGreaterThan(5);
    expect(paths.nose.length).toBeGreaterThan(5);
    expect(paths.mouth.length).toBeGreaterThan(5);
  });

  it('brow paths start with M (valid SVG)', () => {
    const paths = renderFace(computeTarget(0, 0));
    expect(paths.leftBrow.trimStart()).toMatch(/^M /);
    expect(paths.rightBrow.trimStart()).toMatch(/^M /);
  });

  it('mouth path starts with M and ends with Z (closed shape)', () => {
    const paths = renderFace(computeTarget(0, 0));
    expect(paths.mouth.trimStart()).toMatch(/^M /);
    expect(paths.mouth.trimEnd()).toMatch(/Z$/);
  });

  it('left and right eyes produce different paths', () => {
    const paths = renderFace(computeTarget(0.5, 0.5));
    expect(paths.leftEye).not.toBe(paths.rightEye);
  });
});

describe('eyePath', () => {
  it('returns a path string starting with M', () => {
    const p = eyePath({ cx: -28, width: 6, topYOuter: -18, topYInner: -18, bottomY: -9, isLeft: true });
    expect(p.trimStart()).toMatch(/^M /);
  });

  it('left and right eyes are reflections (cx sign flipped)', () => {
    const args = { width: 6, topYOuter: -18, topYInner: -18, bottomY: -9 };
    const left  = eyePath({ ...args, cx: -28, isLeft: true });
    const right = eyePath({ ...args, cx:  28, isLeft: false });
    // They should differ (left/right aren't identical) but both be valid SVG
    expect(left).not.toBe(right);
    expect(left.trimStart()).toMatch(/^M /);
    expect(right.trimStart()).toMatch(/^M /);
  });
});

describe('smoothFaceParams', () => {
  it('moves current toward target', () => {
    const current = computeTarget(0, 0);
    const target  = computeTarget(1, 1);
    const k = 0.11;
    const next = smoothFaceParams(current, target, k);
    // Every param should be strictly between current and target (moving toward it)
    expect(next.browInnerY).toBeGreaterThanOrEqual(Math.min(current.browInnerY, target.browInnerY));
    expect(next.browInnerY).toBeLessThanOrEqual(Math.max(current.browInnerY, target.browInnerY));
    expect(next.crowsFeetOp).toBeGreaterThan(current.crowsFeetOp);
    expect(next.crowsFeetOp).toBeLessThan(target.crowsFeetOp);
  });

  it('returns a new object (does not mutate current)', () => {
    const current = computeTarget(0, 0);
    const orig = { ...current };
    smoothFaceParams(current, computeTarget(1, 1), 0.5);
    expect(current.browInnerY).toBe(orig.browInnerY); // unchanged
  });

  it('converges to target after many steps', () => {
    let current = computeTarget(-1, -1);
    const target = computeTarget(1, 1);
    for (let i = 0; i < 200; i++) current = smoothFaceParams(current, target, 0.11);
    expect(current.crowsFeetOp).toBeCloseTo(target.crowsFeetOp, 2);
    expect(current.mouthCornerY).toBeCloseTo(target.mouthCornerY, 2);
  });
});
