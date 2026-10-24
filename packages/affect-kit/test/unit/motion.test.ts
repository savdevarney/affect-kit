import { describe, expect, it } from 'vitest';
import { faceParams, type FaceParams } from '../../src/core/face-renderer';
import {
  FACE_MOTION, decayShock, faceMotion, faceSettled, kickShock, smoothFaceParams,
} from '../../src/core/motion';

const FRAME_60 = 1000 / 60;
const FRAME_120 = 1000 / 120;

function run(from: FaceParams, to: FaceParams, frameMs: number, totalMs: number, reducedMotion = false): FaceParams {
  let p = from;
  for (let t = 0; t < totalMs - 1e-9; t += frameMs) p = smoothFaceParams(p, to, frameMs, { reducedMotion });
  return p;
}

const share = (from: FaceParams, now: FaceParams, to: FaceParams) =>
  (now.mouthMidY - from.mouthMidY) / (to.mouthMidY - from.mouthMidY);

describe('smoothFaceParams', () => {
  const from = faceParams(-0.8, -0.6);
  const to = faceParams(0.8, 0.6);

  it("matches 0.4.1's per-frame step at 60 Hz", () => {
    const next = smoothFaceParams(from, to, FRAME_60);
    const k = FACE_MOTION.smoothing;
    expect(next.mouthMidY).toBeCloseTo(from.mouthMidY + (to.mouthMidY - from.mouthMidY) * k, 10);
    expect(next.browInnerY).toBeCloseTo(from.browInnerY + (to.browInnerY - from.browInnerY) * k, 10);
  });

  it('moves the same at 120 Hz as at 60 Hz', () => {
    for (const ms of [50, 100, 250, 500]) {
      const at60 = run(from, to, FRAME_60, ms);
      const at120 = run(from, to, FRAME_120, ms);
      expect(at120.mouthMidY).toBeCloseTo(at60.mouthMidY, 6);
      expect(at120.eyeWidth).toBeCloseTo(at60.eyeWidth, 6);
    }
  });

  it('covers 95% in about 430 ms, and about 120 ms under Reduce Motion', () => {
    expect(share(from, run(from, to, FRAME_60, 400), to)).toBeLessThan(0.95);
    expect(share(from, run(from, to, FRAME_60, 450), to)).toBeGreaterThan(0.95);
    expect(share(from, run(from, to, FRAME_60, 100, true), to)).toBeLessThan(0.95);
    expect(share(from, run(from, to, FRAME_60, 134, true), to)).toBeGreaterThan(0.95);
  });

  it('eases under Reduce Motion rather than snapping', () => {
    const next = smoothFaceParams(from, to, FRAME_60, { reducedMotion: true });
    expect(next.mouthMidY).not.toBe(to.mouthMidY);
    expect(share(from, next, to)).toBeCloseTo(FACE_MOTION.reducedSmoothing, 10);
  });

  it('settles', () => {
    expect(faceSettled(from, to)).toBe(false);
    expect(faceSettled(run(from, to, FRAME_60, 2000), to)).toBe(true);
  });

  it('does nothing over no time', () => {
    expect(smoothFaceParams(from, to, 0)).toEqual(from);
  });
});

describe('the shock', () => {
  it('kicks by 0.6, to at most 1', () => {
    expect(kickShock(0)).toBeCloseTo(0.6);
    expect(kickShock(0.6)).toBe(1);
  });

  it("fades as 0.4.1's did at 60 Hz, and at the same speed at 120 Hz", () => {
    expect(decayShock(1, FRAME_60)).toBeCloseTo(0.93, 10);
    expect(decayShock(decayShock(1, FRAME_120), FRAME_120)).toBeCloseTo(0.93, 10);
  });
});

describe('faceMotion', () => {
  const still = { motionScale: 1, shock: 0, reducedMotion: false };

  it('breathes 12 times a minute, outside pacing rates (4 to 8 a minute)', () => {
    expect(FACE_MOTION.breathsPerMinute).toBe(12);
    // At low arousal the breath is all there is: y = 0.45 · sin(2π · 0.2 · t).
    for (const t of [0.4, 1.25, 2.1, 3.3]) {
      expect(faceMotion(t, 0, -1, still).y).toBeCloseTo(0.45 * Math.sin(2 * Math.PI * 0.2 * t), 10);
      expect(faceMotion(t + 5, 0, -1, still).y).toBeCloseTo(faceMotion(t, 0, -1, still).y, 10); // a 5 s cycle
    }
  });

  it("doesn't tie the breath to arousal", () => {
    const calm = faceMotion(1.25, 0.9, -1, still);
    const flat = faceMotion(1.25, -0.9, -1, still);
    expect(calm.y).toBeCloseTo(flat.y, 10);
  });

  it('holds still under Reduce Motion', () => {
    const m = faceMotion(2, -0.9, 0.9, { motionScale: 1, shock: 1, reducedMotion: true });
    expect([m.x, m.y]).toEqual([0, 0]);
    for (const part of Object.values(m.parts)) expect(part).toEqual({ x: 0, y: 0 });
  });

  it('jitters the parts only at strong unpleasant energy', () => {
    expect(faceMotion(1, 0.8, 0.8, still).parts.mouth).toEqual({ x: 0, y: 0 });
    expect(faceMotion(1, -0.9, 0.9, still).parts.mouth).not.toEqual({ x: 0, y: 0 });
  });
});
