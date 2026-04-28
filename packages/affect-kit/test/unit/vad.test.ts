import { describe, it, expect } from 'vitest';
import { computeVAD, buildRating } from '../../src/core/vad';

describe('computeVAD', () => {
  it('returns pad V/A with fromLabels=false when no labels are active', () => {
    const result = computeVAD(0.3, -0.5, []);
    expect(result.v).toBeCloseTo(0.3);
    expect(result.a).toBeCloseTo(-0.5);
    expect(result.d).toBe(0);
    expect(result.fromLabels).toBe(false);
  });

  it('returns emotion VAD with fromLabels=true for a single level-3 label', () => {
    // 'calm': { v: 0.46, a: -0.65, d: 0.25 }
    const result = computeVAD(0, 0, [{ name: 'calm', level: 3 }]);
    expect(result.v).toBeCloseTo(0.46, 5);
    expect(result.a).toBeCloseTo(-0.65, 5);
    expect(result.d).toBeCloseTo(0.25, 5);
    expect(result.fromLabels).toBe(true);
  });

  it('weights level-1 as 1/3 of level-3', () => {
    // single label at level 1: same direction, smaller pull
    const l3 = computeVAD(0, 0, [{ name: 'joy', level: 3 }]);
    const l1 = computeVAD(0, 0, [{ name: 'joy', level: 1 }]);
    // both should equal emotion VAD (only one label, so weighting cancels out)
    expect(l1.v).toBeCloseTo(l3.v, 5);
    expect(l1.a).toBeCloseTo(l3.a, 5);
  });

  it('averages two equal-level labels correctly', () => {
    // joy: v=0.76, calm: v=0.46 → average v≈0.61
    const result = computeVAD(0, 0, [
      { name: 'joy',  level: 3 },
      { name: 'calm', level: 3 },
    ]);
    expect(result.v).toBeCloseTo((0.76 + 0.46) / 2, 5);
    expect(result.fromLabels).toBe(true);
  });

  it('weights higher-level labels more heavily', () => {
    // joy at level 3, calm at level 1: joy should dominate
    const result = computeVAD(0, 0, [
      { name: 'joy',  level: 3 },
      { name: 'calm', level: 1 },
    ]);
    // joy weight=1, calm weight=1/3 → weighted avg: (0.76*1 + 0.46*(1/3)) / (1 + 1/3)
    const expected = (0.76 * 1 + 0.46 * (1 / 3)) / (1 + 1 / 3);
    expect(result.v).toBeCloseTo(expected, 5);
  });

  it('skips unknown emotion names silently', () => {
    const result = computeVAD(0.1, 0.2, [{ name: 'nonexistent-emotion', level: 2 }]);
    expect(result.fromLabels).toBe(false);
    expect(result.v).toBeCloseTo(0.1);
  });
});

describe('buildRating', () => {
  it('returns a correctly shaped Rating with no labels', () => {
    const ts = 1_700_000_000_000;
    const rating = buildRating({ padV: 0.3, padA: -0.4, labels: [], now: () => ts });
    expect(rating.v).toBeCloseTo(0.3);
    expect(rating.a).toBeCloseTo(-0.4);
    expect(rating.d).toBe(0);
    expect(rating.pad).toEqual({ v: 0.3, a: -0.4 });
    expect(rating.fromLabels).toBe(false);
    expect(rating.labels).toEqual([]);
    expect(rating.timestamp).toBe(ts);
  });

  it('preserves pad separately when labels override V/A', () => {
    const rating = buildRating({
      padV: 0.1,
      padA: 0.1,
      labels: [{ name: 'calm', level: 3 }],
      now: () => 0,
    });
    expect(rating.pad).toEqual({ v: 0.1, a: 0.1 });
    expect(rating.v).toBeCloseTo(0.46, 3); // calm's v
    expect(rating.fromLabels).toBe(true);
  });

  it('uses Date.now() by default (smoke test)', () => {
    const before = Date.now();
    const rating = buildRating({ padV: 0, padA: 0, labels: [] });
    const after = Date.now();
    expect(rating.timestamp).toBeGreaterThanOrEqual(before);
    expect(rating.timestamp).toBeLessThanOrEqual(after);
  });
});
